import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CanvasState, BrushState } from '../types/voxel';
import { getPixel } from '../utils/canvasBuffer';
import { getBrush, BrushContext } from '../utils/brushSystem';

interface MultiCanvasViewProps {
  canvasState: CanvasState;
  brush: BrushState;
  onPixelChange: (x: number, y: number, z: number, color: string) => void;
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
  brush: BrushState;
  onPixelChange: (x: number, y: number, z: number, color: string) => void;
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
}> = ({ config, canvasState, brush, onPixelChange, scale, setScale, layerValue, setLayerValue, isActive, viewType, onActivate, onColorPick, isCtrlPressed, onToggleVisibility, onToggleLock, onRenameLayer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPixel = useRef<{ x: number; y: number } | null>(null);
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

    const applyBrush = (canvasX: number, canvasY: number) => {
      const brushHandler = getBrush(brush.tool);
      if (!brushHandler) return;

      const ctx: BrushContext = {
        canvasState,
        brush,
        x: canvasX,
        y: canvasY,
        lastX: lastPixel.current?.x,
        lastY: lastPixel.current?.y,
        onPixelChange,
        to3D: (cx: number, cy: number) => {
          const coords = config.to3D(cx + rangeXStart, cy + rangeYStart, canvasState, layerValue);
          return { x: coords.x, y: coords.y, z: coords.z };
        }
      };

      brushHandler.apply(ctx);
    };

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

    // Apply brush BEFORE updating lastPixel (so line brush has access to previous position)
    applyBrush(coords.x, coords.y);

    // THEN update lastPixel to current position
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
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0
      });
      handleMouseDown(mouseEvent as any);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      handleMouseMove(mouseEvent as any);
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      handleMouseUp();
    };

    const [layerMin, layerMax] = config.layerRange(canvasState);

  return (
    <div 
      className={`rounded border flex flex-col ${isActive ? 'border-cyan-400' : 'border-gray-700'}`}
      onMouseEnter={() => onActivate(viewType)}
    >
      <div className="text-xs text-gray-400 p-1 border-b border-gray-700 flex items-center justify-between">
        <span>{config.label}</span>
        <span className="text-gray-500">{config.layerLabel}={layerValue}</span>
      </div>
      <div className="px-1 pt-1 flex items-center gap-1">
        <span className="text-xs text-gray-500">{layerMin}</span>
        <input
          type="range"
          min={layerMin}
          max={layerMax - 1}
          value={layerValue}
          onChange={(e) => setLayerValue(parseInt(e.target.value))}
          className="flex-1 h-1"
        />
        <span className="text-xs text-gray-500">{layerMax - 1}</span>
      </div>
      <div className="flex-1 relative p-1 overflow-hidden">
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
           className="cursor-crosshair"
           style={{
             imageRendering: 'pixelated',
             transform: `translate(${offset.x}px, ${offset.y}px)`
           } as React.CSSProperties}
         />
      </div>
    </div>
  );
};

  const MultiCanvasView: React.FC<MultiCanvasViewProps> = ({ canvasState, brush, onPixelChange, onColorPick, isCtrlPressed,
    onToggleVisibility, onToggleLock, onRenameLayer }) => {
  const [scale, setScale] = useState(1);
  const [activeView, setActiveView] = useState<ViewType>('main');
  const [containerSize, setContainerSize] = useState({ width: 600, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  const activeViewRef = useRef<ViewType>(activeView);
  const canvasStateRef = useRef(canvasState);

  const [mainLayer, setMainLayer] = useState(0);
  const [leftLayer, setLeftLayer] = useState(0);
  const [rightLayer, setRightLayer] = useState(0);
  const [topLayer, setTopLayer] = useState(0);
  const [bottomLayer, setBottomLayer] = useState(0);

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

  // pixelSize is now calculated inside CanvasView based on actual view dimensions

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
    <div ref={containerRef} className="w-full flex-1 flex flex-col bg-gray-950 min-h-0">
      <div className="flex items-center gap-1 p-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 overflow-x-auto no-scrollbar">
        {views.map((v, index) => (
          <button
            key={v.type}
            onClick={() => setActiveView(v.type)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 ${
              activeView === v.type
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/40 scale-105'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700 active:scale-95'
            }`}
          >
            {v.label.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="flex-1 p-2 md:p-4 flex items-center justify-center overflow-hidden min-h-0 relative">
        {activeViewConfig && (
          <CanvasView
              config={activeViewConfig}
              canvasState={canvasState}
              brush={brush}
              onPixelChange={onPixelChange}
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

export default MultiCanvasView;
