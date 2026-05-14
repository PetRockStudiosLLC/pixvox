import React, { useState, useCallback, useRef, useEffect } from "react";
import { CanvasState, BrushState } from "../../types/voxel";
import { getPixel } from "../../utils/canvasBuffer";
import { getBrush, BrushContext } from "../../utils/brushes";

interface MobileCanvasProps {
  canvasState: CanvasState;
  brush: BrushState;
  onPixelChange: (x: number, y: number, z: number, color: string) => void;
  onColorPick?: (color: string) => void;
  isCtrlPressed?: React.RefObject<boolean>;
  activeLayer: number;
  onLayerChange?: (layer: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  offset: { x: number; y: number };
  onOffsetChange: (offset: { x: number; y: number }) => void;
}

type ViewType = "main" | "front" | "left" | "right" | "top" | "bottom";

const viewLabels: Record<ViewType, string> = {
  main: "Main",
  front: "Front",
  left: "Left",
  right: "Right",
  top: "Top",
  bottom: "Bottom"
};

const viewOrder: ViewType[] = ["main", "front", "left", "right", "top", "bottom"];

const MobileCanvas: React.FC<MobileCanvasProps> = ({
  canvasState,
  brush,
  onPixelChange,
  onColorPick,
  isCtrlPressed,
  activeLayer,
  onLayerChange,
  zoom,
  onZoomChange,
  offset,
  onOffsetChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPixel = useRef<{ x: number; y: number } | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("main");
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });
  const [showLayerSlider, setShowLayerSlider] = useState(false);

  // Long press for eyedropper
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEyedropper, setIsEyedropper] = useState(false);
  const longPressPos = useRef<{ x: number; y: number } | null>(null);

  // Pinch-to-zoom state
  const initialPinchDistance = useRef<number>(0);
  const initialZoom = useRef<number>(1);
  const isPinching = useRef(false);

  // Two-finger pan state
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const offsetStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef(false);

  // Track container size
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

  // Calculate pixel size
  const viewWidth = canvasState.width;
  const viewHeight = canvasState.height;
  const pixelSize = Math.min(containerSize.width / viewWidth, containerSize.height / viewHeight, 20) * zoom;

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = viewWidth * pixelSize;
    canvas.height = viewHeight * pixelSize;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw checkerboard for transparency
    const checkerSize = pixelSize;
    for (let py = 0; py < viewHeight; py++) {
      for (let px = 0; px < viewWidth; px++) {
        const isEven = (Math.floor(px / 2) + Math.floor(py / 2)) % 2 === 0;
        ctx.fillStyle = isEven ? "#2a2a3e" : "#252538";
        ctx.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw pixels
    for (let py = 0; py < viewHeight; py++) {
      for (let px = 0; px < viewWidth; px++) {
        const key = `${px},${py},${activeLayer}`;
        const color = canvasState.pixels.get(key);
        if (!color || color === "#00000000" || (color.length === 9 && color.slice(7) === "00")) {
          continue;
        }
        ctx.fillStyle = color.length === 9 ? color.slice(0, 7) : color;
        ctx.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw grid lines
    ctx.strokeStyle = "rgba(68, 68, 68, 0.5)";
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

    // Draw brush cursor
    if (lastPixel.current && brush.size > 1) {
      const bx = lastPixel.current.x;
      const by = lastPixel.current.y;
      ctx.strokeStyle = brush.tool === "eraser" ? "#ff4444" : "#ffffff";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(bx * pixelSize, by * pixelSize, brush.size * pixelSize, brush.size * pixelSize);
      ctx.setLineDash([]);
    }
  }, [canvasState, pixelSize, brush, activeLayer, viewWidth, viewHeight]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Get pixel coords from touch/mouse event
  const getPixelCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const adjustedX = (clientX - rect.left - offset.x) / pixelSize;
    const adjustedY = (clientY - rect.top - offset.y) / pixelSize;
    const x = Math.floor(adjustedX);
    const y = Math.floor(adjustedY);
    if (x < 0 || x >= viewWidth || y < 0 || y >= viewHeight) return null;
    return { x, y };
  };

  // Apply brush stroke
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
      to3D: (cx: number, cy: number) => ({ x: cx, y: cy, z: activeLayer })
    };

    const changes = brushHandler.getChanges(ctx);
    for (const { x: px, y: py, color } of changes) {
      const key = `${px},${py},${activeLayer}`;
      if (color === "#00000000" || (color.length === 9 && color.slice(7) === "00")) {
        canvasState.pixels.delete(key);
      } else {
        canvasState.pixels.set(key, color);
      }
    }
    onPixelChange(0, 0, 0, "");
  };

  // Eyedropper: pick color from canvas
  const pickColor = (clientX: number, clientY: number) => {
    const coords = getPixelCoords(clientX, clientY);
    if (!coords || !onColorPick) return;
    const key = `${coords.x},${coords.y},${activeLayer}`;
    const color = canvasState.pixels.get(key);
    if (color && color !== "#00000000") {
      onColorPick(color.length === 9 ? color.slice(0, 7) : color);
    }
  };

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      const touches = e.touches;

      // Two-finger: pinch-to-zoom or pan
      if (touches.length === 2) {
        isPanning.current = true;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
        initialZoom.current = zoom;
        panStart.current = {
          x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2
        };
        offsetStart.current = { ...offset };
        return;
      }

      // Single finger: drawing or eyedropper
      const touch = touches[0];
      if (!touch) return;

      // Long press for eyedropper
      longPressPos.current = { x: touch.clientX, y: touch.clientY };
      longPressTimer.current = setTimeout(() => {
        setIsEyedropper(true);
        if (longPressPos.current) {
          pickColor(longPressPos.current.x, longPressPos.current.y);
        }
        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);

      const coords = getPixelCoords(touch.clientX, touch.clientY);
      if (!coords) return;

      isDrawing.current = true;
      applyBrush(coords.x, coords.y);
      lastPixel.current = coords;
    },
    [canvasState, brush, activeLayer, onPixelChange, onColorPick, zoom, offset, pixelSize, viewWidth, viewHeight]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      const touches = e.touches;

      // Two-finger: pinch-to-zoom or pan
      if (touches.length === 2 && isPanning.current) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scale = distance / initialPinchDistance.current;
        const newZoom = Math.max(0.25, Math.min(8, initialZoom.current * scale));
        onZoomChange(newZoom);

        // Pan with two fingers
        const midX = (touches[0].clientX + touches[1].clientX) / 2;
        const midY = (touches[0].clientY + touches[1].clientY) / 2;
        if (panStart.current) {
          const panDx = midX - panStart.current.x;
          const panDy = midY - panStart.current.y;
          onOffsetChange({
            x: offsetStart.current.x + panDx,
            y: offsetStart.current.y + panDy
          });
        }
        return;
      }

      // Cancel eyedropper on significant movement
      if (isEyedropper) {
        setIsEyedropper(false);
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }

      if (!isDrawing.current) return;
      const touch = touches[0];
      if (!touch) return;

      const coords = getPixelCoords(touch.clientX, touch.clientY);
      if (!coords) return;
      if (lastPixel.current && coords.x === lastPixel.current.x && coords.y === lastPixel.current.y) return;

      applyBrush(coords.x, coords.y);
      lastPixel.current = coords;
    },
    [
      isPanning.current,
      isEyedropper,
      isDrawing.current,
      canvasState,
      brush,
      activeLayer,
      onPixelChange,
      zoom,
      offset,
      pixelSize,
      viewWidth,
      viewHeight,
      onZoomChange,
      onOffsetChange
    ]
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (e.touches.length === 0) {
      isDrawing.current = false;
      lastPixel.current = null;
      isPanning.current = false;
      setIsEyedropper(false);
    }
  }, []);

  // Swipe to change views
  const swipeStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleContainerTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    swipeStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleContainerTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeStart.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - swipeStart.current.x;
      const deltaY = touch.clientY - swipeStart.current.y;
      const deltaTime = Date.now() - swipeStart.current.time;

      // Only horizontal swipe on the view indicator area
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 2 && deltaTime < 500) {
        const currentIndex = viewOrder.indexOf(activeView);
        if (deltaX > 0 && currentIndex > 0) {
          setActiveView(viewOrder[currentIndex - 1]);
        } else if (deltaX < 0 && currentIndex < viewOrder.length - 1) {
          setActiveView(viewOrder[currentIndex + 1]);
        }
      }

      swipeStart.current = null;
    },
    [activeView]
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col bg-surface min-h-0 overflow-hidden"
      onTouchStart={handleContainerTouchStart}
      onTouchEnd={handleContainerTouchEnd}
    >
      {/* View indicator bar - swipeable */}
      <div className="flex items-center gap-1 px-3 py-2 bg-panel-header border-b border-border flex-shrink-0 overflow-x-auto no-scrollbar">
        {viewOrder.map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all duration-200 touch-target-min flex-shrink-0 ${
              activeView === view
                ? "bg-accent text-white shadow-lg shadow-accent/20"
                : "bg-panel-hover text-text-dim active:bg-panel-active"
            }`}
          >
            {viewLabels[view]}
          </button>
        ))}
      </div>

      {/* Layer slider toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-panel border-b border-border flex-shrink-0">
        <button
          onClick={() => setShowLayerSlider(!showLayerSlider)}
          className="text-xs font-bold text-accent active:opacity-70 touch-target-min flex items-center gap-1"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 4L8 1.5L14 4L8 6.5L2 4Z" />
            <path d="M2 7.5L8 10L14 7.5" />
            <path d="M2 11L8 13.5L14 11" />
          </svg>
          Layer {activeLayer + 1}/{canvasState.layers}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-dim font-mono">{zoom.toFixed(1)}x</span>
          <button
            onClick={() => {
              onZoomChange(1);
              onOffsetChange({ x: 0, y: 0 });
            }}
            className="text-[10px] text-accent active:opacity-70 touch-target-min"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Layer slider (collapsible) */}
      {showLayerSlider && (
        <div className="px-3 py-2 bg-panel border-b border-border flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] text-text-dim">{0}</span>
          <input
            type="range"
            min={0}
            max={canvasState.layers - 1}
            value={activeLayer}
            onChange={(e) => onLayerChange?.(parseInt(e.target.value))}
            className="flex-1 blender-slider"
          />
          <span className="text-[10px] text-text-dim">{canvasState.layers - 1}</span>
        </div>
      )}

      {/* Canvas area */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center bg-surface min-h-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Eyedropper indicator */}
        {isEyedropper && (
          <div className="absolute top-2 left-2 z-20 bg-panel/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-accent/50 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-bold text-accent">Eyedropper</span>
          </div>
        )}

        {/* Zoom indicator */}
        <div className="absolute top-2 right-2 z-10 text-[10px] bg-black/50 text-white px-2 py-1 rounded pointer-events-none font-mono">
          {zoom.toFixed(1)}x
        </div>

        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none"
          style={{
            imageRendering: "pixelated",
            transform: `translate(${offset.x}px, ${offset.y}px)`
          }}
        />
      </div>
    </div>
  );
};

export default MobileCanvas;
