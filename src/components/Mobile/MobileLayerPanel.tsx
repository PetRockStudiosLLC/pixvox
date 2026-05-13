import React, { useState, useCallback } from "react";
import { CanvasState, LayerInfo } from "../../types/voxel";

interface MobileLayerPanelProps {
  canvasState: CanvasState;
  onLayerChange: (layer: number) => void;
  onAddLayer: () => void;
  onDuplicateLayer: () => void;
  onMoveLayerUp: () => void;
  onMoveLayerDown: () => void;
  onToggleVisibility?: (layer: number) => void;
  onToggleLock?: (layer: number) => void;
  onRenameLayer?: (layer: number, name: string) => void;
}

const MobileLayerPanel: React.FC<MobileLayerPanelProps> = ({
  canvasState,
  onLayerChange,
  onAddLayer,
  onDuplicateLayer,
  onMoveLayerUp,
  onMoveLayerDown,
  onToggleVisibility,
  onToggleLock,
  onRenameLayer
}) => {
  const [editingLayer, setEditingLayer] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const startRename = useCallback(
    (layer: number) => {
      const info = canvasState.layerInfo[layer];
      if (info) {
        setEditingLayer(layer);
        setEditName(info.name);
      }
    },
    [canvasState.layerInfo]
  );

  const commitRename = useCallback(() => {
    if (editingLayer !== null && editName.trim()) {
      onRenameLayer?.(editingLayer, editName.trim());
    }
    setEditingLayer(null);
    setEditName("");
  }, [editingLayer, editName, onRenameLayer]);

  return (
    <div className="space-y-3">
      {/* Layer quick selector */}
      <div className="flex items-center gap-3 bg-panel p-3 rounded-xl border border-border">
        <button
          onClick={() => onLayerChange(Math.max(0, canvasState.activeLayer - 1))}
          disabled={canvasState.activeLayer === 0}
          className="w-10 h-10 rounded-lg bg-panel-hover flex items-center justify-center active:bg-panel-active disabled:opacity-30 touch-target-min"
          aria-label="Previous layer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M10 4L6 8L10 12" />
          </svg>
        </button>

        <div className="flex-1 text-center">
          <div className="text-sm font-bold text-accent">Layer {canvasState.activeLayer + 1}</div>
          <div className="text-[10px] text-text-dim">of {canvasState.layers} layers</div>
        </div>

        <button
          onClick={() => onLayerChange(Math.min(canvasState.layers - 1, canvasState.activeLayer + 1))}
          disabled={canvasState.activeLayer === canvasState.layers - 1}
          className="w-10 h-10 rounded-lg bg-panel-hover flex items-center justify-center active:bg-panel-active disabled:opacity-30 touch-target-min"
          aria-label="Next layer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 4L10 8L6 12" />
          </svg>
        </button>
      </div>

      {/* Layer slider */}
      <div className="px-1">
        <input
          type="range"
          min={0}
          max={canvasState.layers - 1}
          value={canvasState.activeLayer}
          onChange={(e) => onLayerChange(parseInt(e.target.value))}
          className="w-full blender-slider"
          aria-label="Layer slider"
        />
      </div>

      {/* Layer list */}
      <div className="space-y-2">
        {Array.from({ length: canvasState.layers }, (_, i) => canvasState.layers - 1 - i).map((i) => {
          const info = canvasState.layerInfo[i] || {
            name: `Layer ${i + 1}`,
            visible: true,
            locked: false,
            opacity: 100
          };
          const isActive = i === canvasState.activeLayer;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isActive ? "bg-accent/10 border-accent/30" : "bg-panel border-border active:bg-panel-hover"
              }`}
              onClick={() => onLayerChange(i)}
            >
              {/* Layer number */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isActive ? "bg-accent text-white" : "bg-panel-hover text-text-dim"
                }`}
              >
                {i + 1}
              </div>

              {/* Layer name (editable) */}
              <div className="flex-1 min-w-0">
                {editingLayer === i ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => e.key === "Enter" && commitRename()}
                    className="w-full px-2 py-1 bg-surface text-text rounded border border-accent text-xs outline-none"
                    autoFocus
                  />
                ) : (
                  <div
                    className={`text-sm font-medium truncate ${
                      isActive ? "text-text-bright" : "text-text-dim"
                    } ${!info.visible ? "opacity-50 line-through" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(i);
                    }}
                  >
                    {info.name}
                  </div>
                )}
              </div>

              {/* Visibility toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility?.(i);
                }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center touch-target-min ${
                  info.visible ? "text-success" : "text-text-dim/50"
                }`}
                aria-label={info.visible ? "Hide layer" : "Show layer"}
              >
                {info.visible ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 9C1 9 4 3 9 3C14 3 17 9 17 9C17 9 14 15 9 15C4 15 1 9 1 9Z" />
                    <circle cx="9" cy="9" r="2.5" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M3 6L15 12M4 4C4 4 3 4.5 3 6.5M14 14C14 14 15 13.5 15 11.5M2 11C2 11 4 15 9 15C11 15 13 14 14 13M6 5C7 4.5 8 4.5 9 5" />
                  </svg>
                )}
              </button>

              {/* Lock toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock?.(i);
                }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center touch-target-min ${
                  info.locked ? "text-warning" : "text-text-dim/50"
                }`}
                aria-label={info.locked ? "Unlock layer" : "Lock layer"}
              >
                {info.locked ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="8" width="12" height="8" rx="2" />
                    <path d="M5 8V5C5 3 6 2 9 2C12 2 13 3 13 5V8" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <rect x="3" y="8" width="12" height="8" rx="2" />
                    <path d="M5 8V5C5 3 6 2 9 2C10.5 2 11.5 2.8 12 3.5" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Layer actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onAddLayer}
          className="flex items-center justify-center gap-2 py-3 bg-success/20 text-success rounded-xl font-bold text-sm border border-success/30 active:bg-success/30 touch-target-min"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          Add Layer
        </button>
        <button
          onClick={onDuplicateLayer}
          className="flex items-center justify-center gap-2 py-3 bg-accent/20 text-accent rounded-xl font-bold text-sm border border-accent/30 active:bg-accent/30 touch-target-min"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="9" height="9" rx="1" />
            <path d="M3 7V4C3 3 4 2 5 2H8" />
          </svg>
          Duplicate
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onMoveLayerUp}
          disabled={canvasState.activeLayer === 0}
          className="flex items-center justify-center gap-2 py-3 bg-panel-hover text-text rounded-xl font-bold text-sm border border-border active:bg-panel-active disabled:opacity-30 touch-target-min"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M7 11V3M7 3L3 7M7 3L11 7" />
          </svg>
          Move Up
        </button>
        <button
          onClick={onMoveLayerDown}
          disabled={canvasState.activeLayer === canvasState.layers - 1}
          className="flex items-center justify-center gap-2 py-3 bg-panel-hover text-text rounded-xl font-bold text-sm border border-border active:bg-panel-active disabled:opacity-30 touch-target-min"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M7 3V11M7 11L3 7M7 11L11 7" />
          </svg>
          Move Down
        </button>
      </div>
    </div>
  );
};

export default MobileLayerPanel;
