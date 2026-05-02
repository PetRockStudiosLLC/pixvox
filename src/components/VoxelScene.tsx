import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CanvasState } from '../types/voxel';
import { SpatialHash } from '../utils/spatialHash';
import { greedyMesh } from '../utils/greedyMesher';
import { buildMergedGeometry, createVoxelBox } from '../utils/meshBuilder';
import Viewcube from './Viewcube';

interface VoxelSceneProps {
  canvasState: CanvasState;
  mode: 'fast-draft' | 'final-bake';
  onSceneReady?: (scene: THREE.Scene) => void;
}

const VoxelScene: React.FC<VoxelSceneProps> = ({ canvasState, mode, onSceneReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const voxelMeshesRef = useRef<THREE.Object3D[]>([]);
  const [currentView, setCurrentView] = useState<'main' | 'front' | 'left' | 'right' | 'top' | 'bottom'>('main');

  // Shared geometry for fast-draft mode
  const sharedGeometryRef = useRef<THREE.BoxGeometry | null>(null);
  // Material cache: color string -> Material
  const materialCacheRef = useRef<Map<string, THREE.MeshLambertMaterial>>(new Map());

  const buildVoxelData = useCallback((): SpatialHash => {
    const spatialHash = new SpatialHash();
    const { width, height, layers, pixels } = canvasState;

    for (const [key, color] of pixels) {
      const [x, y, z] = key.split(',').map(Number);
      // Flip Y coordinate to match 3D space (canvas Y=0 is top, 3D Y=0 is bottom)
      const flippedY = height - 1 - y;
      if (x >= 0 && x < width && flippedY >= 0 && flippedY < height && z >= 0 && z < layers) {
        spatialHash.set(x, flippedY, z, color);
      }
    }

    return spatialHash;
  }, [canvasState]);

  // Handle view change from Viewcube
  const handleViewChange = useCallback((view: 'main' | 'front' | 'left' | 'right' | 'top' | 'bottom') => {
    setCurrentView(view);
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (view) {
      case 'main':
        camera.position.set(20, 20, 20);
        break;
      case 'front':
        camera.position.set(0, 10, 20);
        break;
      case 'left':
        camera.position.set(-20, 10, 0);
        break;
      case 'right':
        camera.position.set(20, 10, 0);
        break;
      case 'top':
        camera.position.set(0, 20, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'bottom':
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

  const renderVoxels = useCallback(() => {
    if (!sceneRef.current) return;

    // Clear previous voxel meshes
    for (const mesh of voxelMeshesRef.current) {
      sceneRef.current.remove(mesh);
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

    if (mode === 'fast-draft') {
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
          sceneRef.current.add(mesh);
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
          sceneRef.current.add(instancedMesh);
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
      sceneRef.current.add(mesh);
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

    // Animation loop
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
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      // Dispose shared geometry
      if (sharedGeometryRef.current) {
        sharedGeometryRef.current.dispose();
        sharedGeometryRef.current = null;
      }
      // Dispose cached materials
      materialCacheRef.current.forEach(mat => mat.dispose());
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

export default VoxelScene;
