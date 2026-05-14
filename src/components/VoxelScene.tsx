import React, { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CanvasState, BrushState } from "../types/voxel";
import { SpatialHash } from "../utils/spatialHash";
import { greedyMesh } from "../utils/greedyMesher";
import { buildMergedGeometry, createVoxelBox } from "../utils/meshBuilder";
import Viewcube from "./Viewcube";

interface VoxelSceneProps {
  canvasState: CanvasState;
  mode: "fast-draft" | "final-bake";
  brush?: BrushState;
  onPixelChange?: (x: number, y: number, z: number, color: string) => void;
  onTypeChange?: (x: number, y: number, z: number, type: string | null) => void;
  onSceneReady?: (scene: THREE.Scene) => void;
}

const VoxelScene: React.FC<VoxelSceneProps> = ({
  canvasState,
  mode,
  brush,
  onPixelChange,
  onTypeChange,
  onSceneReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const voxelMeshesRef = useRef<THREE.Object3D[]>([]);
  const [currentView, setCurrentView] = useState<"main" | "front" | "left" | "right" | "top" | "bottom">("main");

  // Editing state
  const highlightMeshRef = useRef<THREE.Mesh | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const editingCleanupRef = useRef<(() => void) | null>(null);
  const voxelGroupRef = useRef<THREE.Group | null>(null);
  const brushRef = useRef(brush);
  const onPixelChangeRef = useRef(onPixelChange);
  const onTypeChangeRef = useRef(onTypeChange);
  const canvasStateRef = useRef(canvasState);
  const shiftHeldRef = useRef(false);

  useEffect(() => {
    brushRef.current = brush;
  }, [brush]);
  useEffect(() => {
    onPixelChangeRef.current = onPixelChange;
  }, [onPixelChange]);
  useEffect(() => {
    onTypeChangeRef.current = onTypeChange;
  });
  useEffect(() => {
    canvasStateRef.current = canvasState;
  }, [canvasState]);

  // Track Shift key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftHeldRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Shared geometry for fast-draft mode
  const sharedGeometryRef = useRef<THREE.BoxGeometry | null>(null);
  // Material cache: color string -> Material
  const materialCacheRef = useRef<Map<string, THREE.MeshLambertMaterial>>(new Map());

  const buildVoxelData = useCallback((): SpatialHash => {
    const spatialHash = new SpatialHash();
    const { width, height, layers, pixels } = canvasState;

    for (const [key, color] of pixels) {
      const [x, y, z] = key.split(",").map(Number);
      // Flip Y coordinate to match 3D space (canvas Y=0 is top, 3D Y=0 is bottom)
      const flippedY = height - 1 - y;
      if (x >= 0 && x < width && flippedY >= 0 && flippedY < height && z >= 0 && z < layers) {
        spatialHash.set(x, flippedY, z, color);
      }
    }

    return spatialHash;
  }, [canvasState]);

  // Handle view change from Viewcube
  const handleViewChange = useCallback((view: "main" | "front" | "left" | "right" | "top" | "bottom") => {
    setCurrentView(view);
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (view) {
      case "main":
        camera.position.set(20, 20, 20);
        break;
      case "front":
        camera.position.set(0, 10, 20);
        break;
      case "left":
        camera.position.set(-20, 10, 0);
        break;
      case "right":
        camera.position.set(20, 10, 0);
        break;
      case "top":
        camera.position.set(0, 20, 0);
        camera.lookAt(0, 0, 0);
        break;
      case "bottom":
        camera.position.set(0, -20, 0);
        camera.lookAt(0, 0, 0);
        break;
    }
    camera.lookAt(0, 0, 0);
    controls.update();
  }, []);

  // Get or create shared geometry
  const getSharedGeometry = useCallback(() => {
    if (!sharedGeometryRef.current) {
      sharedGeometryRef.current = new THREE.BoxGeometry(1, 1, 1);
    }
    return sharedGeometryRef.current;
  }, []);

  // Get or create cached material by color
  const getCachedMaterial = useCallback((color: string) => {
    const cached = materialCacheRef.current.get(color);
    if (cached) return cached;
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    const material = new THREE.MeshLambertMaterial({ color: new THREE.Color(r, g, b) });
    materialCacheRef.current.set(color, material);
    return material;
  }, []);

  // Convert 3D voxel coordinates back to canvas coordinates
  const voxel3DToCanvas = useCallback((x: number, y: number, z: number) => {
    const cs = canvasStateRef.current;
    const canvasY = cs.height - 1 - y;
    return { x, y: canvasY, z };
  }, []);

  // Raycast to find voxel at screen position using 3D DDA raymarching
  const raycastVoxel = useCallback((mouseX: number, mouseY: number, placementMode: boolean = false) => {
    if (!cameraRef.current || !rendererRef.current) return null;
    const camera = cameraRef.current;
    const cs = canvasStateRef.current;
    const renderer = rendererRef.current;
    const rect = renderer.domElement.getBoundingClientRect();

    const ndcX = ((mouseX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((mouseY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const ox = raycaster.ray.origin.x;
    const oy = raycaster.ray.origin.y;
    const oz = raycaster.ray.origin.z;
    const dx = raycaster.ray.direction.x;
    const dy = raycaster.ray.direction.y;
    const dz = raycaster.ray.direction.z;

    // 3D DDA raymarching through voxel grid
    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);

    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

    const eps = 1e-6;
    const tdx = Math.abs(stepX) > eps ? Math.abs(1 / dx) : 1e9;
    const tdy = Math.abs(stepY) > eps ? Math.abs(1 / dy) : 1e9;
    const tdz = Math.abs(stepZ) > eps ? Math.abs(1 / dz) : 1e9;

    let tmaxX = Math.abs(stepX) > eps ? tdx * (stepX > 0 ? x + 1 - ox : ox - x) : 1e9;
    let tmaxY = Math.abs(stepY) > eps ? tdy * (stepY > 0 ? y + 1 - oy : oy - y) : 1e9;
    let tmaxZ = Math.abs(stepZ) > eps ? tdz * (stepZ > 0 ? z + 1 - oz : oz - z) : 1e9;

    const inBounds = (cx: number, cy: number, cz: number) =>
      cx >= 0 && cx < cs.width && cy >= 0 && cy < cs.height && cz >= 0 && cz < cs.layers;

    let lastEmpty: { x: number; y: number; z: number } | null = null;
    const maxSteps = cs.width * cs.height * cs.layers;

    for (let step = 0; step < maxSteps; step++) {
      if (inBounds(x, y, z)) {
        const key = `${x},${cs.height - 1 - y},${z}`;
        if (cs.pixels.has(key)) {
          if (!placementMode) {
            return { x, y, z, hit: true };
          }
          // Placement mode: continue to find empty cell adjacent to face
        } else {
          if (placementMode) {
            return { x, y, z, hit: false };
          }
          lastEmpty = { x, y, z };
        }
      } else {
        // Left bounds, check if ray is moving away
        if (
          (x < 0 && stepX <= 0) ||
          (x >= cs.width && stepX >= 0) ||
          (y < 0 && stepY <= 0) ||
          (y >= cs.height && stepY >= 0) ||
          (z < 0 && stepZ <= 0) ||
          (z >= cs.layers && stepZ >= 0)
        ) {
          break;
        }
      }

      if (tmaxX < tmaxY) {
        if (tmaxX < tmaxZ) {
          x += stepX;
          tmaxX += tdx;
        } else {
          z += stepZ;
          tmaxZ += tdz;
        }
      } else {
        if (tmaxY < tmaxZ) {
          y += stepY;
          tmaxY += tdy;
        } else {
          z += stepZ;
          tmaxZ += tdz;
        }
      }
    }

    // No occupied cell found, return last empty cell in bounds (for placing)
    if (lastEmpty) {
      return { x: lastEmpty.x, y: lastEmpty.y, z: lastEmpty.z, hit: false };
    }
    return null;
  }, []);

  // Update highlight box position
  const updateHighlight = useCallback((x: number, y: number, z: number) => {
    if (!highlightMeshRef.current) return;
    highlightMeshRef.current.position.set(x + 0.5, y + 0.5, z + 0.5);
    highlightMeshRef.current.visible = true;
  }, []);

  const hideHighlight = useCallback(() => {
    if (highlightMeshRef.current) {
      highlightMeshRef.current.visible = false;
    }
  }, []);

  const renderVoxels = useCallback(() => {
    if (!sceneRef.current || !voxelGroupRef.current) return;

    // Clear previous voxel meshes
    for (const mesh of voxelMeshesRef.current) {
      voxelGroupRef.current.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        // Only dispose geometry if it's NOT the shared geometry
        if (mesh.geometry !== sharedGeometryRef.current) {
          mesh.geometry.dispose();
        }
        // Only dispose material if it's NOT in our cache (unexpected)
        if (mesh.material instanceof THREE.MeshLambertMaterial) {
          // Check if this material is in our cache by comparing color
          const matColor = mesh.material.color.getStyle();
          let foundInCache = false;
          for (const [color, cachedMat] of materialCacheRef.current) {
            if (cachedMat.color.getStyle() === matColor) {
              foundInCache = true;
              break;
            }
          }
          if (!foundInCache) {
            mesh.material.dispose();
          }
        } else if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
    }
    voxelMeshesRef.current = [];

    const spatialHash = buildVoxelData();
    if (spatialHash.size === 0) return;

    if (mode === "fast-draft") {
      // Use shared geometry
      const geometry = getSharedGeometry();
      // Group voxels by color for material reuse
      const voxelsByColor = new Map<string, { x: number; y: number; z: number }[]>();
      for (const voxel of spatialHash.values()) {
        if (!voxelsByColor.has(voxel.color)) {
          voxelsByColor.set(voxel.color, []);
        }
        voxelsByColor.get(voxel.color)!.push({ x: voxel.x, y: voxel.y, z: voxel.z });
      }
      // Create one mesh per color group (or use InstancedMesh for better perf)
      for (const [color, voxels] of voxelsByColor) {
        if (voxels.length === 1) {
          // Single voxel: just create a regular mesh
          const v = voxels[0];
          const material = getCachedMaterial(color);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(v.x + 0.5, v.y + 0.5, v.z + 0.5);
          voxelGroupRef.current!.add(mesh);
          voxelMeshesRef.current.push(mesh);
        } else {
          // Multiple voxels with same color: use InstancedMesh
          const material = getCachedMaterial(color);
          const instancedMesh = new THREE.InstancedMesh(geometry, material, voxels.length);
          const matrix = new THREE.Matrix4();
          voxels.forEach((v, idx) => {
            matrix.setPosition(v.x + 0.5, v.y + 0.5, v.z + 0.5);
            instancedMesh.setMatrixAt(idx, matrix);
          });
          instancedMesh.instanceMatrix.needsUpdate = true;
          voxelGroupRef.current!.add(instancedMesh);
          voxelMeshesRef.current.push(instancedMesh);
        }
      }
    } else {
      // Final-Bake: Greedy meshing
      const { width, height, layers } = canvasState;
      const faces = greedyMesh(spatialHash, width, height, layers);
      const geometry = buildMergedGeometry(faces);
      const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      voxelGroupRef.current!.add(mesh);
      voxelMeshesRef.current.push(mesh);
    }
  }, [canvasState, mode, buildVoxelData, getSharedGeometry, getCachedMaterial]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Voxel group for raycasting
    const voxelGroup = new THREE.Group();
    scene.add(voxelGroup);
    voxelGroupRef.current = voxelGroup;

    // Highlight box for hover
    const highlightGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    highlightMesh.visible = false;
    scene.add(highlightMesh);
    highlightMeshRef.current = highlightMesh;

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    // Optional: set limits
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going over the top
    controlsRef.current = controls;

    // Editing: mouse handlers for voxel placement/removal
    raycasterRef.current = new THREE.Raycaster();

    const handleMouseDown = (e: MouseEvent) => {
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const cs = canvasStateRef.current;
      if (!brushRef.current || !onPixelChangeRef.current || !cs.pixels.size) return;
      const result = raycastVoxel(e.clientX, e.clientY, shiftHeldRef.current);
      if (result) {
        updateHighlight(result.x, result.y, result.z);
      } else {
        hideHighlight();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const cs = canvasStateRef.current;
      const br = brushRef.current;
      const onChange = onPixelChangeRef.current;
      if (!br || !onChange || !mouseDownPosRef.current) return;

      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only treat as click if mouse didn't move much (otherwise it's orbit/pan)
      if (dist > 4) {
        mouseDownPosRef.current = null;
        return;
      }

      mouseDownPosRef.current = null;

      // Only handle left click (button 0)
      if (e.button !== 0) return;

      const placementMode = shiftHeldRef.current;
      const result = raycastVoxel(e.clientX, e.clientY, placementMode);
      if (!result) return;

      const canvas = voxel3DToCanvas(result.x, result.y, result.z);
      const key = `${canvas.x},${canvas.y},${canvas.z}`;

      if (br.tool === "eraser") {
        if (cs.pixels.has(key)) {
          onChange(canvas.x, canvas.y, canvas.z, "#00000000");
        }
      } else if (br.tool === "point" || br.tool === "bucket") {
        onChange(canvas.x, canvas.y, canvas.z, br.color);
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      const cs = canvasStateRef.current;
      const onChange = onPixelChangeRef.current;
      if (!onChange || !mouseDownPosRef.current) return;

      // Don't erase if mouse moved (panning)
      const me = e as MouseEvent;
      const dx = me.clientX - mouseDownPosRef.current.x;
      const dy = me.clientY - mouseDownPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 4) return;

      const result = raycastVoxel(me.clientX, me.clientY);
      if (!result) return;

      const canvas = voxel3DToCanvas(result.x, result.y, result.z);
      const key = `${canvas.x},${canvas.y},${canvas.z}`;

      // Right click: eraser behavior
      if (cs.pixels.has(key)) {
        onChange(canvas.x, canvas.y, canvas.z, "#00000000");
        onTypeChangeRef.current?.(canvas.x, canvas.y, canvas.z, null);
      }
    };

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("mouseup", handleMouseUp);
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);

    // Return cleanup for these handlers
    const cleanupEditing = () => {
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("mouseup", handleMouseUp);
      renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
    };

    // Store cleanup function in a ref for later use
    editingCleanupRef.current = cleanupEditing;
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    if (onSceneReady) onSceneReady(scene);

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      // Cleanup editing handlers
      if (editingCleanupRef.current) {
        editingCleanupRef.current();
      }
      // Dispose highlight mesh
      if (highlightMeshRef.current) {
        highlightMeshRef.current.geometry.dispose();
        if (highlightMeshRef.current.material instanceof THREE.Material) {
          highlightMeshRef.current.material.dispose();
        }
        scene.remove(highlightMeshRef.current);
        highlightMeshRef.current = null;
      }
      renderer.dispose();
      // Dispose shared geometry
      if (sharedGeometryRef.current) {
        sharedGeometryRef.current.dispose();
        sharedGeometryRef.current = null;
      }
      // Dispose cached materials
      materialCacheRef.current.forEach((mat) => mat.dispose());
      materialCacheRef.current.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Re-render when canvas state or mode changes
  useEffect(() => {
    renderVoxels();
  }, [renderVoxels]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <Viewcube onViewChange={handleViewChange} currentView={currentView} />
    </div>
  );
};

export default React.memo(VoxelScene);
