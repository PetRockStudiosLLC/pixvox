import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { CanvasState, BrushState } from '../types/voxel';
import { getPixel } from '../utils/canvasBuffer';
import { getBrush, BrushContext } from '../utils/brushSystem';
import { SpatialHash } from '../utils/spatialHash';
import { greedyMesh } from '../utils/greedyMesher';
import { buildMergedGeometry } from '../utils/meshBuilder';

interface Canvas2DProps {
  canvasState: CanvasState;
  brush: BrushState;
  onPixelChange: (x: number, y: number, z: number, color: string) => void;
  previewRef?: React.RefObject<HTMLDivElement>;
  onColorPick?: (color: string) => void;
  isCtrlPressed?: React.RefObject<boolean>;
}

const Canvas2D: React.FC<Canvas2DProps> = ({ canvasState, brush, onPixelChange, previewRef, onColorPick, isCtrlPressed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPixel = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x:0, y:0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x:0, y:0 });

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 600 });

  // Layer cache using OffscreenCanvas for fast redraws
  const layerCacheRef = useRef<Map<number, { canvas: OffscreenCanvas; dirty: boolean }>>(new Map());
  const prevLayerDataRef = useRef<Map<number, string>>(new Map());
  // Dirty rectangle tracking per layer: tracks bounds of changed pixels
  const dirtyRectsRef = useRef<Map<number, { minX: number; minY: number; maxX: number; maxY: number }>>(new Map());

  // Mark a region as dirty (call this when pixels change)
  const markDirty = useCallback((layer: number, x: number, y: number) => {
    const rect = dirtyRectsRef.current.get(layer);
    if (!rect) {
      dirtyRectsRef.current.set(layer, { minX: x, minY: y, maxX: x, maxY: y });
    } else {
      rect.minX = Math.min(rect.minX, x);
      rect.minY = Math.min(rect.minY, y);
      rect.maxX = Math.max(rect.maxX, x);
      rect.maxY = Math.max(rect.maxY, y);
    }
  }, []);

  // Clear dirty rect after redraw
  const clearDirty = useCallback((layer: number) => {
    dirtyRectsRef.current.delete(layer);
  }, []);

  // Track actual container size
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const pixelSize = Math.min(
    containerSize.width / canvasState.width,
    containerSize.height / canvasState.height,
    20
  ) * scale;

  // Helper: build or update a single layer's OffscreenCanvas cache
  const updateLayerCache = useCallback((layerIdx: number, useDirtyRegion?: boolean) => {
    const { width, height } = canvasState;
    const key = layerIdx;
    let entry = layerCacheRef.current.get(key);
    
    // Check dirty rectangle for partial update
    const dirtyRect = useDirtyRegion ? dirtyRectsRef.current.get(layerIdx) : undefined;
    
    if (!entry || !dirtyRect) {
      // Full rebuild needed
      const parts: string[] = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          parts.push(getPixel(canvasState, x, y, layerIdx));
        }
      }
      const hash = parts.join(',');
      const prevHash = prevLayerDataRef.current.get(key);
      if (hash === prevHash && entry) {
        return entry.canvas;
      }
      prevLayerDataRef.current.set(key, hash);
      
      const offscreen = new OffscreenCanvas(width, height);
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return null;
      offCtx.clearRect(0, 0, width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const color = getPixel(canvasState, x, y, layerIdx);
          if (color === '#00000000' || (color.length === 9 && color.endsWith('00'))) continue;
          offCtx.fillStyle = color.length === 9 ? color.slice(0, 7) : color;
          offCtx.fillRect(x, y, 1, 1);
        }
      }
      layerCacheRef.current.set(key, { canvas: offscreen, dirty: false });
      clearDirty(layerIdx);
      return offscreen;
    } else {
      // Partial update using dirty rectangle
      const offscreen = entry.canvas;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return null;
      const { minX, minY, maxX, maxY } = dirtyRect;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const color = getPixel(canvasState, x, y, layerIdx);
          if (color === '#00000000' || (color.length === 9 && color.endsWith('00'))) {
            offCtx.clearRect(x, y, 1, 1);
          } else {
            offCtx.fillStyle = color.length === 9 ? color.slice(0, 7) : color;
            offCtx.fillRect(x, y, 1, 1);
          }
        }
      }
      clearDirty(layerIdx);
      return offscreen;
    }
  }, [canvasState, clearDirty]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, activeLayer } = canvasState;
    const pw = width * pixelSize;
    const ph = height * pixelSize;
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;

    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 0, pw, ph);

    const onionSkinOpacity = 0.3;

    // Draw previous layer (if exists) using cache with dirty region optimization
    if (activeLayer > 0) {
      const prevCanvas = updateLayerCache(activeLayer - 1, true);
      if (prevCanvas) {
        ctx.globalAlpha = onionSkinOpacity;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(prevCanvas, 0, 0, pw, ph);
        ctx.globalAlpha = 1.0;
      }
    }

    // Draw next layer (if exists) using cache with dirty region optimization
    if (activeLayer < canvasState.layers - 1) {
      const nextCanvas = updateLayerCache(activeLayer + 1, true);
      if (nextCanvas) {
        ctx.globalAlpha = onionSkinOpacity;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(nextCanvas, 0, 0, pw, ph);
        ctx.globalAlpha = 1.0;
      }
    }

    // Draw active layer (on top) using cache with dirty region optimization
    const activeCanvas = updateLayerCache(activeLayer, true);
    if (activeCanvas) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(activeCanvas, 0, 0, pw, ph);
    }

    // Draw brush outline
    if (lastPixel.current) {
      const bx = lastPixel.current.x;
      const by = lastPixel.current.y;
      const size = brush.size;

      ctx.strokeStyle = brush.tool === 'eraser' ? '#ff0000' : '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const rectX = bx * pixelSize + offset.x;
      const rectY = by * pixelSize + offset.y;
      const rectSize = size * pixelSize;
      ctx.strokeRect(rectX, rectY, rectSize, rectSize);
      ctx.setLineDash([]);

      ctx.fillStyle = brush.tool === 'eraser' ? '#ff0000' : '#ffffff';
      ctx.beginPath();
      ctx.arc(
        bx * pixelSize + pixelSize / 2 + offset.x,
        by * pixelSize + pixelSize / 2 + offset.y,
        2, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Draw grid lines efficiently using single-path approach
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      const px = x * pixelSize;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, ph);
    }
    for (let y = 0; y <= height; y++) {
      const py = y * pixelSize;
      ctx.moveTo(0, py);
      ctx.lineTo(pw, py);
    }
    ctx.stroke();
  }, [canvasState, pixelSize, offset, brush]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

    const getPixelCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
     const canvas = canvasRef.current;
     if (!canvas) return null;
     const rect = canvas.getBoundingClientRect();
     
     // Adjust for pan and zoom
     const adjustedX = (e.clientX - rect.left - offset.x) / pixelSize;
     const adjustedY = (e.clientY - rect.top - offset.y) / pixelSize;
     
     const x = Math.floor(adjustedX);
     const y = Math.floor(adjustedY);
     
     if (x < 0 || x >= canvasState.width || y < 0 || y >= canvasState.height) return null;
     return { x, y };
   };

    const applyBrush = (x: number, y: number) => {
      const brushHandler = getBrush(brush.tool);
      if (!brushHandler) return;

      const ctx: BrushContext = {
        canvasState,
        brush,
        x,
        y,
        lastX: lastPixel.current?.x,
        lastY: lastPixel.current?.y,
        to3D: (cx: number, cy: number) => ({
          x: cx,
          y: cy,
          z: canvasState.activeLayer
        })
      };

      const changes = brushHandler.getChanges(ctx);
      for (const { x: px, y: py, color } of changes) {
        const key = `${px},${py},${canvasState.activeLayer}`;
        if (color === '#00000000' || color.endsWith('00')) {
          canvasState.pixels.delete(key);
        } else {
          canvasState.pixels.set(key, color);
        }
      }
      onPixelChange(0, 0, 0, '');
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return; // Only left click
      const coords = getPixelCoords(e);
      if (!coords) return;
      
      // CTRL+click: pick color and add to palette
      if (isCtrlPressed?.current && onColorPick) {
        const { x, y } = coords;
        const color = getPixel(canvasState, x, y, canvasState.activeLayer);
        if (color && color !== '#00000000') {
          onColorPick(color.length === 9 ? color.slice(0, 7) : color);
        }
        return;
      }
      
      isDrawing.current = true;

      // Apply brush BEFORE updating lastPixel (so line brush has access to previous position)
      applyBrush(coords.x, coords.y);

      // THEN update lastPixel to current position
      lastPixel.current = coords;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const coords = getPixelCoords(e);
      if (!coords) return;
      if (lastPixel.current && coords.x === lastPixel.current.x && coords.y === lastPixel.current.y) return;

      // Apply brush with CURRENT lastPixel (old position) as lastX/lastY
      applyBrush(coords.x, coords.y);

      // THEN update lastPixel to new position
      lastPixel.current = coords;
    };

    const handleMouseUp = () => {
      isDrawing.current = false;
      lastPixel.current = null;
      setIsPanning(false);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const coords = getPixelCoords({
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as unknown as React.MouseEvent<HTMLCanvasElement>);
      if (!coords) return;
      
      // CTRL+touch: pick color and add to palette
      if (isCtrlPressed?.current && onColorPick) {
        const color = getPixel(canvasState, coords.x, coords.y, canvasState.activeLayer);
        if (color && color !== '#00000000') {
          onColorPick(color.length === 9 ? color.slice(0, 7) : color);
        }
        return;
      }
      
      isDrawing.current = true;
      applyBrush(coords.x, coords.y);
      lastPixel.current = coords;
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const coords = getPixelCoords({
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as unknown as React.MouseEvent<HTMLCanvasElement>);
      if (!coords) return;
      if (lastPixel.current && coords.x === lastPixel.current.x && coords.y === lastPixel.current.y) return;

      applyBrush(coords.x, coords.y);
      lastPixel.current = coords;
    };

    const handleTouchEnd = () => {
      handleMouseUp();
    };

  const handleWheel = useCallback((e: WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // World coordinates under mouse before zoom
    const worldX = (mouseX - offset.x) / pixelSize;
    const worldY = (mouseY - offset.y) / pixelSize;

    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setScale(prev => {
      const newScale = Math.min(Math.max(prev * delta, 0.1), 5);

      // Calculate new pixelSize based on container
      const newPixelSize = Math.min(
        containerSize.width / canvasState.width,
        containerSize.height / canvasState.height,
        20
      ) * newScale;

      // Adjust offset to keep the world point under cursor
      const newOffsetX = mouseX - worldX * newPixelSize;
      const newOffsetY = mouseY - worldY * newPixelSize;

      setOffset({ x: newOffsetX, y: newOffsetY });
      return newScale;
    });
  }, [offset, pixelSize, canvasState.width, canvasState.height, containerSize]);

  // Attach wheel event manually to avoid passive listener issues
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault(); // Now this works because we set passive: false
      handleWheel(e);
    };
    
    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheelEvent);
    };
  }, [handleWheel]);

  // 3D Preview in the corner (using previewRef from props)
  const localPreviewRef = useRef<HTMLDivElement>(null);
  const previewSceneRef = useRef<THREE.Scene | null>(null);
  const previewRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const previewCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  useEffect(() => {
    const container = previewRef?.current || localPreviewRef.current;
    if (!container) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    previewSceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    previewCameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    previewRendererRef.current = renderer;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    
    return () => {
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
    };
  }, [previewRef]);

  // Update 3D preview when canvas state changes (use greedy meshing)
  useEffect(() => {
    const scene = previewSceneRef.current;
    if (!scene) return;

    // Clear previous voxels
    const objectsToRemove: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.isVoxel) {
        objectsToRemove.push(object);
      }
    });
    objectsToRemove.forEach((obj) => {
      scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });

    // Build spatial hash for current layer only (respect visibility)
    const { width, height, activeLayer, layerInfo } = canvasState;
    const activeInfo = layerInfo?.[activeLayer];
    if (activeInfo && !activeInfo.visible) return; // Skip if layer is hidden

    const spatialHash = new SpatialHash();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = getPixel(canvasState, x, y, activeLayer);
        if (color === '#00000000' || (color.length === 9 && color.endsWith('00'))) {
          continue;
        }
        const flippedY = height - 1 - y;
        spatialHash.set(x, flippedY, activeLayer, color);
      }
    }

    if (spatialHash.size > 0) {
      // Use greedy meshing for better performance
      const faces = greedyMesh(spatialHash, width, height, activeLayer + 1);
      if (faces.length > 0) {
        const geometry = buildMergedGeometry(faces);
        const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isVoxel = true;
        scene.add(mesh);
      }
    }
  }, [canvasState]);

   const handleMouseDownPan = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1) {
        setIsPanning(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        lastPanPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
    };

    const handleMouseMovePan = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPanning) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const currentPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      const dx = currentPoint.x - lastPanPoint.current.x;
      const dy = currentPoint.y - lastPanPoint.current.y;

      setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));

      lastPanPoint.current = currentPoint;
    };

   const handleMouseUpPan = () => {
     setIsPanning(false);
   };

  return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-2xl relative">
        <div ref={canvasContainerRef} className="w-full h-64 md:h-96 flex items-center justify-center overflow-hidden relative">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
            className="cursor-crosshair border border-gray-600"
            style={{
              imageRendering: 'pixelated',
              transform: `translate(${offset.x}px, ${offset.y}px)`
            } as React.CSSProperties}
          />
        </div>
        <div className="mt-2 text-xs text-gray-400 text-center">
          {canvasState.width}×{canvasState.height} | Layer {canvasState.activeLayer + 1} | {brush.tool} brush
        </div>
        
        {/* 3D Preview in the corner */}
        <div 
          ref={localPreviewRef} 
          className="absolute bottom-2 right-2 w-20 h-20 border-2 border-gray-600 bg-gray-800"
        />
      </div>
   );
};

export default React.memo(Canvas2D);
