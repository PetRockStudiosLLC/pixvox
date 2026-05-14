import React from "react";
import { BrushState, BrushTool } from "../../types/voxel";
import { getAllBrushes } from "../../utils/brushes";

interface MobileToolbarProps {
  brush: BrushState;
  onBrushChange: (brush: BrushState) => void;
  onCanvasResize: (width: number, height: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const toolIcons: Record<BrushTool, React.ReactNode> = {
  point: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 3L17 6L6 17H3V14L14 3Z" />
    </svg>
  ),
  line: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <line x1="3" y1="17" x2="17" y2="3" />
    </svg>
  ),
  bucket: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3L16 14H4L10 3Z" />
      <path d="M7 14L6 17" />
      <path d="M13 14L14 17" />
    </svg>
  ),
  eraser: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M6 16H3L5 6L11 4L17 10L12 16H6Z" />
    </svg>
  ),
  circle: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7" />
    </svg>
  ),
  "filled-circle": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <circle cx="10" cy="10" r="7" />
    </svg>
  ),
  spray: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="0.8" fill="currentColor" />
      <circle cx="10" cy="5" r="0.8" fill="currentColor" />
      <circle cx="13" cy="7" r="0.8" fill="currentColor" />
      <circle cx="6" cy="10" r="0.8" fill="currentColor" />
      <circle cx="14" cy="10" r="0.8" fill="currentColor" />
      <circle cx="8" cy="13" r="0.8" fill="currentColor" />
      <circle cx="12" cy="13" r="0.8" fill="currentColor" />
    </svg>
  ),
  pattern: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="4" height="4" />
      <rect x="13" y="3" width="4" height="4" />
      <rect x="3" y="13" width="4" height="4" />
      <rect x="13" y="13" width="4" height="4" />
    </svg>
  ),
  blur: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="3" opacity="0.4" />
      <circle cx="10" cy="10" r="5" opacity="0.6" />
      <circle cx="10" cy="10" r="7" />
    </svg>
  ),
  dither: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="2" height="2" fill="currentColor" />
      <rect x="7" y="3" width="2" height="2" fill="currentColor" />
      <rect x="3" y="7" width="2" height="2" fill="currentColor" />
      <rect x="11" y="3" width="2" height="2" fill="currentColor" />
      <rect x="7" y="7" width="2" height="2" fill="currentColor" />
      <rect x="3" y="11" width="2" height="2" fill="currentColor" />
      <rect x="11" y="7" width="2" height="2" fill="currentColor" />
      <rect x="7" y="11" width="2" height="2" fill="currentColor" />
      <rect x="11" y="11" width="2" height="2" fill="currentColor" />
    </svg>
  )
};

const MobileToolbar: React.FC<MobileToolbarProps> = ({
  brush,
  onBrushChange,
  onCanvasResize,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomChange
}) => {
  const tools = getAllBrushes();

  return (
    <div className="bg-panel/95 backdrop-blur-sm rounded-xl p-3 border border-border shadow-xl">
      {/* Undo/Redo + Zoom row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all touch-target-min ${
              canUndo ? "bg-panel-hover text-text active:bg-panel-active" : "bg-panel text-text-dim/30"
            }`}
            aria-label="Undo"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 6H9C11 6 13 8 13 10C13 12 11 14 9 14H5" />
              <path d="M7 3L4 6L7 9" />
            </svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all touch-target-min ${
              canRedo ? "bg-panel-hover text-text active:bg-panel-active" : "bg-panel text-text-dim/30"
            }`}
            aria-label="Redo"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M15 6H9C7 6 5 8 5 10C5 12 7 14 9 14H13" />
              <path d="M11 3L14 6L11 9" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
            className="w-10 h-10 rounded-lg bg-panel-hover text-text flex items-center justify-center active:bg-panel-active touch-target-min"
            aria-label="Zoom out"
          >
            <span className="text-lg font-bold">−</span>
          </button>
          <span className="text-xs font-mono text-text-dim min-w-[36px] text-center">{zoom.toFixed(1)}x</span>
          <button
            onClick={() => onZoomChange(Math.min(8, zoom + 0.25))}
            className="w-10 h-10 rounded-lg bg-panel-hover text-text flex items-center justify-center active:bg-panel-active touch-target-min"
            aria-label="Zoom in"
          >
            <span className="text-lg font-bold">+</span>
          </button>
        </div>
      </div>

      {/* Tool selector */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {tools.map((tool) => (
          <button
            key={tool.tool}
            onClick={() => onBrushChange({ ...brush, tool: tool.tool })}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 flex-shrink-0 transition-all touch-target-min ${
              brush.tool === tool.tool
                ? "bg-accent text-white shadow-lg shadow-accent/30 scale-105"
                : "bg-panel-hover text-text-dim active:bg-panel-active"
            }`}
            aria-label={tool.name}
            title={tool.name}
          >
            <span className="flex items-center justify-center">{toolIcons[tool.tool] || toolIcons.point}</span>
            <span className="text-[8px] font-bold truncate max-w-full">{tool.name}</span>
          </button>
        ))}
      </div>

      {/* Brush size */}
      <div className="flex items-center gap-3 mt-3">
        <span className="text-[10px] text-text-dim font-bold uppercase">Size</span>
        <input
          type="range"
          min={1}
          max={32}
          value={brush.size}
          onChange={(e) => onBrushChange({ ...brush, size: parseInt(e.target.value) })}
          className="flex-1 blender-slider"
        />
        <span className="text-sm font-bold text-accent w-6 text-center">{brush.size}</span>
      </div>
      <div className="flex gap-1 mt-2 overflow-x-auto no-scrollbar">
        {[1, 2, 4, 8, 16, 32].map((s) => (
          <button
            key={s}
            onClick={() => onBrushChange({ ...brush, size: s })}
            className={`flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
              brush.size === s
                ? "bg-accent text-white"
                : "bg-panel-hover text-text-dim hover:text-text"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Quick palette preview */}
      {brush.palette && brush.palette.length > 0 && (
        <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">
          {brush.palette.slice(0, 12).map((color) => (
            <button
              key={color}
              onClick={() => onBrushChange({ ...brush, color })}
              className={`w-8 h-8 rounded-lg flex-shrink-0 transition-all border-2 ${
                brush.color === color ? "border-white scale-110 shadow-lg" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileToolbar;
