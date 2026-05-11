import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CanvasState, BrushState } from '../types/voxel';
import { getPixel } from '../utils/canvasBuffer';
import { getBrush, BrushContext, PixelChange } from '../utils/brushSystem';

interface MultiCanvasViewProps {
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  brush: BrushState;
  onPixelChange: (x: number, y: number, z: number, color: string) => void;
  onSaveHistory: (state: CanvasState) => void;
  onColorPick?: (color: string) => void;
  isCtrlPressed?: React.RefObject<boolean>;
  onToggleVisibility?: (layer: number) => void;
  onToggleLock?: (layer: number) => void;
  onRenameLayer?: (layer: number, name: string) => void;
}

type ViewType = 'main' | 'front' | 'left' | 'right' | 'top' | 'bottom';

interface ViewConfig {
  type: ViewType;
  label: string;
  getRangeX: (cs: CanvasState) => [number, number];
  getRangeY: (cs: CanvasState) => [number, number];
  to3D: (cx: number, cy: number, cs: CanvasState, layerValue: number) => { x: number; y: number; z: number };
  layerLabel: string;
  layerRange: (cs: CanvasState) => [number, number];
}

const views: ViewConfig[] = [
  {
    type: 'main',
    label: 'Main (X-Y)',
    getRangeX: (cs) => [0, cs.width],
    getRangeY: (cs) => [0, cs.height],
    to3D: (cx, cy, cs, layerValue) => ({ x: cx, y: cy, z: layerValue }),
    layerLabel: 'Z',
    layerRange: (cs) => [0, cs.layers]
  },
  {
    type: 'front',
    label: 'Front (X-Y)',
    getRangeX: (cs) => [0, cs.width],
    getRangeY: (cs) => [0, cs.height],
    to3D: (cx, cy, cs, layerValue) => ({ x: cx, y: cy, z: layerValue }),
    layerLabel: 'Z',
    layerRange: (cs) => [0, cs.layers]
  },
  {
    type: 'left',
    label: 'Left (Z-Y)',
    getRangeX: (cs) => [0, cs.layers],
    getRangeY: (cs) => [0, cs.height],
    to3D: (cx, cy, cs, layerValue) => ({ x: layerValue, y: cy, z: cx }),
    layerLabel: 'X',
    layerRange: (cs) => [0, cs.width]
  },
  {
    type: 'right',
    label: 'Right (Z-Y)',
    getRangeX: (cs) => [0, cs.layers],
    getRangeY: (cs) => [0, cs.height],
    to3D: (cx, cy, cs, layerValue) => ({ x: layerValue, y: cy, z: cx }),
    layerLabel: 'X',
    layerRange: (cs) => [0, cs.width]
  },
  {
    type: 'top',
    label: 'Top (X-Z)',
    getRangeX: (cs) => [0, cs.width],
    getRangeY: (cs) => [0, cs.layers],
    to3D: (cx, cy, cs, layerValue) => ({ x: cx, y: layerValue, z: cy }),
    layerLabel: 'Y',
    layerRange: (cs) => [0, cs.height]
  },
  {
    type: 'bottom',
    label: 'Bottom (X-Z)',
    getRangeX: (cs) => [0, cs.width],
    getRangeY: (cs) => [0, cs.layers],
    to3D: (cx, cy, cs, layerValue) => ({ x: cx, y: layerValue, z: cy }),
    layerLabel: 'Y',
    layerRange: (cs) => [0, cs.height]
  }
];

const CanvasView: React.FC<{
  config: ViewConfig;
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  brush: BrushState;
  onPixelChange: (x: number, y: number, z: number, color: string) => void;
  onSaveHistory: (state: CanvasState) => void;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  layerValue: number;
  setLayerValue: (value: number) => void;
  isActive: boolean;
  viewType: ViewType;
  onActivate: (type: ViewType) => void;
  onColorPick?: (color: string) => void;
  isCtrlPressed?: React.RefObject<boolean>;
  onToggleVisibility?: (layer: number) => void;
  onToggleLock?: (layer: number) => void;
  onRenameLayer?: (layer: number, name: string) => void;
}> = ({ config, canvasState, brush, onPixelChange, onSaveHistory, setCanvasState, scale, setScale, layerValue, setLayerValue, isActive, viewType, onActivate, onColorPick, isCtrlPressed, onToggleVisibility, onToggleLock, onRenameLayer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPixel = useRef<{ x: number; y: number } | null>(null);
  const pendingChanges = useRef<PixelChange[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });

  // Track actual container size
  useEffect(() => {
    const container = containerRef.current;
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

  const [rangeXStart, rangeXEnd] = config.getRangeX(canvasState);
  const [rangeYStart, rangeYEnd] = config.getRangeY(canvasState);
  const viewWidth = rangeXEnd - rangeXStart;
  const viewHeight = rangeYEnd - rangeYStart;

  // Calculate pixelSize based on ACTUAL view dimensions (not canvasState)
  const pixelSize = Math.min(
    containerSize.width / viewWidth,
    containerSize.height / viewHeight,
    20
  ) * scale;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = viewWidth * pixelSize;
    canvas.height = viewHeight * pixelSize;

    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let py = 0; py < viewHeight; py++) {
      for (let px = 0; px < viewWidth; px++) {
        const coords = config.to3D(px + rangeXStart, py + rangeYStart, canvasState, layerValue);
        const color = getPixel(canvasState, coords.x, coords.y, coords.z);
        if (color === '#00000000' || (color.length === 9 && color.endsWith('00'))) {
          continue;
        }
        ctx.fillStyle = color.length === 9 ? color.slice(0, 7) : color;
        ctx.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
      }
    }

    if (lastPixel.current && brush.size > 1) {
      const bx = lastPixel.current.x;
      const by = lastPixel.current.y;
      ctx.strokeStyle = brush.tool === 'eraser' ? '#ff0000' : '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(bx * pixelSize, by * pixelSize, brush.size * pixelSize, brush.size * pixelSize);
      ctx.setLineDash([]);

      ctx.fillStyle = brush.tool === 'eraser' ? '#ff0000' : '#ffffff';
      ctx.beginPath();
      ctx.arc(bx * pixelSize + pixelSize / 2, by * pixelSize + pixelSize / 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= viewWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * pixelSize, 0);
      ctx.lineTo(x * pixelSize, viewHeight * pixelSize);
      ctx.stroke();
    }
    for (let y = 0; y <= viewHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * pixelSize);
      ctx.lineTo(viewWidth * pixelSize, y * pixelSize);
      ctx.stroke();
    }
  }, [canvasState, pixelSize, brush, config, lastPixel.current, viewWidth, viewHeight, rangeXStart, rangeYStart, layerValue]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getPixelCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const adjustedX = (e.clientX - rect.left - offset.x) / pixelSize;
    const adjustedY = (e.clientY - rect.top - offset.y) / pixelSize;
    const x = Math.floor(adjustedX);
    const y = Math.floor(adjustedY);
    if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) return null;
    return { x, y };
  };

    const applyBrush = useCallback((canvasX: number, canvasY: number): PixelChange[] => {
      const brushHandler = getBrush(brush.tool);
      if (!brushHandler) return [];

      const ctx: BrushContext = {
        canvasState,
        brush,
        x: canvasX,
        y: canvasY,
        lastX: lastPixel.current?.x,
        lastY: lastPixel.current?.y,
        to3D: (cx: number, cy: number) => {
          const coords = config.to3D(cx + rangeXStart, cy + rangeYStart, canvasState, layerValue);
          return { x: coords.x, y: coords.y, z: coords.z };
        }
      };

      return brushHandler.getChanges(ctx);
    }, [canvasState, brush, config, rangeXStart, rangeYStart, layerValue]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    onActivate(viewType);

    if (e.button === 1) { // Middle click for panning
      setIsPanning(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      lastPanPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      return;
    }
    
    const coords = getPixelCoords(e);
    if (!coords) return;
    
    // CTRL+click: pick color and add to palette
    if (isCtrlPressed?.current && onColorPick) {
      const canvasX = coords.x + rangeXStart;
      const canvasY = coords.y + rangeYStart;
      const coords3D = config.to3D(canvasX, canvasY, canvasState, layerValue);
      const color = getPixel(canvasState, coords3D.x, coords3D.y, coords3D.z);
      if (color && color !== '#00000000') {
        onColorPick(color.length === 9 ? color.slice(0, 7) : color);
      }
      return;
    }
    
    isDrawing.current = true;
    pendingChanges.current = [];

    // Collect brush changes BEFORE updating lastPixel
    const changes = applyBrush(coords.x, coords.y);
    pendingChanges.current.push(...changes);

    // Update lastPixel to current position
    lastPixel.current = coords;
  };

const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const currentPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const dx = currentPoint.x - lastPanPoint.current.x;
        const dy = currentPoint.y - lastPanPoint.current.y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPanPoint.current = currentPoint;
        return;
      }
      if (!isDrawing.current) return;
      const coords = getPixelCoords(e);
      if (!coords) return;
      if (lastPixel.current && coords.x === lastPixel.current.x && coords.y === lastPixel.current.y) return;

      // Collect brush changes
      const changes = applyBrush(coords.x, coords.y);
      pendingChanges.current.push(...changes);

      // Update lastPixel to new position
      lastPixel.current = coords;
    };

    const handleMouseUp = () => {
      if (isDrawing.current && pendingChanges.current.length > 0) {
        const changes = pendingChanges.current;
        pendingChanges.current = [];
        isDrawing.current = false;
        lastPixel.current = null;
        setIsPanning(false);

        // Merge all changes into a single pixels map
        const merged = new Map(canvasState.pixels);
        for (const { x, y, color } of changes) {
          const key = `${x},${y},${layerValue}`;
          if (color === '#00000000' || color.endsWith('00')) {
            merged.delete(key);
          } else {
            merged.set(key, color);
          }
        }

        setCanvasState((prev: CanvasState) => {
          const next = { ...prev, pixels: merged };
          onSaveHistory(next);
          return next;
        });
      } else {
        isDrawing.current = false;
        lastPixel.current = null;
        setIsPanning(false);
      }
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
        
        onActivate(viewType);
        
        // CTRL+touch: pick color and add to palette
        if (isCtrlPressed?.current && onColorPick) {
          const canvasX = coords.x + rangeXStart;
          const canvasY = coords.y + rangeYStart;
          const coords3D = config.to3D(canvasX, canvasY, canvasState, layerValue);
          const color = getPixel(canvasState, coords3D.x, coords3D.y, coords3D.z);
          if (color && color !== '#00000000') {
            onColorPick(color.length === 9 ? color.slice(0, 7) : color);
          }
          return;
        }
        
        isDrawing.current = true;
        pendingChanges.current = [];
        const changes = applyBrush(coords.x, coords.y);
        pendingChanges.current.push(...changes);
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

        const changes = applyBrush(coords.x, coords.y);
        pendingChanges.current.push(...changes);
        lastPixel.current = coords;
      };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      handleMouseUp();
    };

    const [layerMin, layerMax] = config.layerRange(canvasState);

return (
    <div 
      className={`w-full h-full flex flex-col rounded-lg overflow-hidden ${isActive ? 'ring-2 ring-accent' : 'ring-1 ring-border'}`}
      onMouseEnter={() => onActivate(viewType)}
    >
      {/* Compact view header for mobile */}
      <div className="bg-panel-header px-2 py-1.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-bold text-accent">{config.label.split(' ')[0]}</span>
        <span className="text-xs font-mono text-text-dim">{config.layerLabel}={layerValue}</span>
      </div>
      {/* Layer slider - compact for mobile */}
      <div className="px-2 py-1.5 bg-panel border-b border-border flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-text-dim">{layerMin}</span>
        <input
          type="range"
          min={layerMin}
          max={layerMax - 1}
          value={layerValue}
          onChange={(e) => setLayerValue(parseInt(e.target.value))}
          className="flex-1 h-1.5 accent-accent"
        />
        <span className="text-[10px] text-text-dim">{layerMax - 1}</span>
      </div>
      {/* Canvas - properly constrained */}
      <div className="flex-1 relative p-2 overflow-hidden flex items-center justify-center bg-surface min-h-0">
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
           className="cursor-crosshair touch-none"
           style={{
             imageRendering: 'pixelated',
             transform: `translate(${offset.x}px, ${offset.y}px)`
           } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

  const MultiCanvasView: React.FC<MultiCanvasViewProps> = ({ canvasState, setCanvasState, brush, onPixelChange, onSaveHistory, onColorPick, isCtrlPressed,
    onToggleVisibility, onToggleLock, onRenameLayer }) => {
  const [scale, setScale] = useState(1);
  const [activeView, setActiveView] = useState<ViewType>('main');
  const containerRef = useRef<HTMLDivElement>(null);

  const activeViewRef = useRef<ViewType>(activeView);
  const canvasStateRef = useRef(canvasState);

  const [mainLayer, setMainLayer] = useState(0);
  const [leftLayer, setLeftLayer] = useState(0);
  const [rightLayer, setRightLayer] = useState(0);
  const [topLayer, setTopLayer] = useState(0);
  const [bottomLayer, setBottomLayer] = useState(0);

  // Mobile: track container size to properly size canvas
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });

  // Track actual container size for mobile
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();

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

  useEffect(() => { activeViewRef.current = activeView; }, [activeView]);
  useEffect(() => { canvasStateRef.current = canvasState; }, [canvasState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentView = activeViewRef.current;
      const cs = canvasStateRef.current;

       const viewKeys: Record<string, ViewType> = {
        '1': 'main', '2': 'front', '3': 'left',
        '4': 'right', '5': 'top', '6': 'bottom'
      };

      if (viewKeys[e.key] && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setActiveView(viewKeys[e.key]);
        return;
      }

      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey) {
        e.preventDefault();
        switch (currentView) {
          case 'main': case 'front':
            setMainLayer(prev => Math.max(0, prev - 1)); break;
          case 'left':
            setLeftLayer(prev => Math.max(0, prev - 1)); break;
          case 'right':
            setRightLayer(prev => Math.max(0, prev - 1)); break;
          case 'top':
            setTopLayer(prev => Math.max(0, prev - 1)); break;
          case 'bottom':
            setBottomLayer(prev => Math.max(0, prev - 1)); break;
        }
      }

      if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey) {
        e.preventDefault();
        switch (currentView) {
          case 'main': case 'front':
            setMainLayer(prev => Math.min(cs.layers - 1, prev + 1)); break;
          case 'left':
            setLeftLayer(prev => Math.min(cs.width - 1, prev + 1)); break;
          case 'right':
            setRightLayer(prev => Math.min(cs.width - 1, prev + 1)); break;
          case 'top':
            setTopLayer(prev => Math.min(cs.height - 1, prev + 1)); break;
          case 'bottom':
            setBottomLayer(prev => Math.min(cs.height - 1, prev + 1)); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getLayerProps = (viewType: ViewType) => {
    switch (viewType) {
      case 'main': case 'front':
        return { layerValue: mainLayer, setLayerValue: setMainLayer };
      case 'left':
        return { layerValue: leftLayer, setLayerValue: setLeftLayer };
      case 'right':
        return { layerValue: rightLayer, setLayerValue: setRightLayer };
      case 'top':
        return { layerValue: topLayer, setLayerValue: setTopLayer };
      case 'bottom':
        return { layerValue: bottomLayer, setLayerValue: setBottomLayer };
    }
  };

  const activeViewConfig = views.find(v => v.type === activeView);
  const layerProps = getLayerProps(activeView);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-surface min-h-0">
      {/* View selector tabs - scrollable on mobile with edge padding */}
      <div className="flex items-center gap-1 p-2 pl-3 pr-3 bg-panel-header border-b border-border flex-shrink-0 overflow-x-auto no-scrollbar">
        {views.map((v) => (
          <button
            key={v.type}
            onClick={() => setActiveView(v.type)}
            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all duration-200 touch-target-min flex-shrink-0 ${
              activeView === v.type
                ? 'bg-accent text-white shadow-lg'
                : 'bg-panel-hover text-text-dim hover:bg-panel-active'
            }`}
          >
            {v.label.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Canvas area - properly sized to container with edge padding */}
      <div className="flex-1 p-2 md:p-4 flex items-center justify-center overflow-hidden min-h-0 relative">
        {/* Scale indicator */}
        <div className="absolute top-1 right-1 z-10 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded pointer-events-none">
          {scale}x
        </div>
        {activeViewConfig && (
          <CanvasView
              config={activeViewConfig}
              canvasState={canvasState}
              brush={brush}
              onPixelChange={onPixelChange}
              onSaveHistory={onSaveHistory}
              setCanvasState={setCanvasState}
              scale={scale}
              setScale={setScale}
              layerValue={layerProps.layerValue}
              setLayerValue={layerProps.setLayerValue}
              isActive={true}
              viewType={activeView}
              onActivate={setActiveView}
              onColorPick={onColorPick}
              isCtrlPressed={isCtrlPressed}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onRenameLayer={onRenameLayer}
            />
        )}
      </div>
    </div>
  );
};

export default React.memo(MultiCanvasView);
