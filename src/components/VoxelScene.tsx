import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CanvasState } from '../types/voxel';
import { SpatialHash } from '../utils/spatialHash';
import { greedyMesh } from '../utils/greedyMesher';
import { buildMergedGeometry, createVoxelBox } from '../utils/meshBuilder';

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
  const voxelMeshesRef = useRef<THREE.Object3D[]>([]);

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

  const renderVoxels = useCallback(() => {
    if (!sceneRef.current) return;

    // Clear previous voxel meshes
    for (const mesh of voxelMeshesRef.current) {
      sceneRef.current.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
    }
    voxelMeshesRef.current = [];

    const spatialHash = buildVoxelData();
    if (spatialHash.size === 0) return;

    if (mode === 'fast-draft') {
      // Simple boxes for each voxel
      for (const voxel of spatialHash.values()) {
        const mesh = createVoxelBox(voxel.x, voxel.y, voxel.z, voxel.color);
        sceneRef.current.add(mesh);
        voxelMeshesRef.current.push(mesh);
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
  }, [canvasState, mode, buildVoxelData]);

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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Re-render when canvas state or mode changes
  useEffect(() => {
    renderVoxels();
  }, [renderVoxels]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default VoxelScene;
