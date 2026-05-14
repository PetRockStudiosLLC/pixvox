import React from "react";
import { LayerInfo, CanvasState } from "../types/voxel";
import LayerThumbnail from "./LayerThumbnail";

interface LayerNavigatorProps {
  layers: number;
  activeLayer: number;
  layerInfo: LayerInfo[];
  canvasWidth: number;
  canvasHeight: number;
  canvasState?: CanvasState;
  onLayerChange: (layer: number) => void;
  onAddLayer: () => void;
  onDuplicateLayer: () => void;
  onMoveLayerUp: () => void;
  onMoveLayerDown: () => void;
  onImportImage: () => void;
  onFillLayers: (target: number) => void;
  onToggleVisibility?: (layer: number) => void;
  onToggleLock?: (layer: number) => void;
  onRenameLayer?: (layer: number, name: string) => void;
  onOpenRenameModal?: (index: number, currentName: string) => void;
}

const LayerNavigator: React.FC<LayerNavigatorProps> = ({
  layers,
  activeLayer,
  layerInfo,
  canvasWidth,
  canvasHeight,
  canvasState,
  onLayerChange,
  onAddLayer,
  onDuplicateLayer,
  onMoveLayerUp,
  onMoveLayerDown,
  onImportImage,
  onFillLayers,
  onToggleVisibility,
  onToggleLock,
  onRenameLayer,
  onOpenRenameModal
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onLayerChange(Math.max(0, activeLayer - 1))}
          disabled={activeLayer === 0}
          className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 text-sm"
        >
          ◀
        </button>
        <input
          type="range"
          min={0}
          max={layers - 1}
          value={activeLayer}
          onChange={(e) => onLayerChange(parseInt(e.target.value))}
          className="w-48 accent-cyan-500"
        />
        <button
          onClick={() => onLayerChange(Math.min(layers - 1, activeLayer + 1))}
          disabled={activeLayer === layers - 1}
          className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 text-sm"
        >
          ▶
        </button>
        <span className="text-sm text-gray-300 min-w-[60px]">
          {activeLayer + 1}/{layers}
        </span>
      </div>

      {/* Layer list */}
      <div className="max-h-48 overflow-y-auto space-y-1">
        {Array.from({ length: layers }, (_, i) => i)
          .reverse()
          .map((i) => {
            const info = layerInfo[i] || { name: `Layer ${i + 1}`, visible: true, locked: false, opacity: 100 };
            const isActive = i === activeLayer;
            return (
              <div
                key={i}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  isActive ? "bg-cyan-900/50 border border-cyan-700" : "hover:bg-gray-700"
                }`}
                onClick={() => onLayerChange(i)}
              >
                {/* Visibility toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility?.(i);
                  }}
                  className={`w-5 h-5 flex items-center justify-center rounded ${
                    info.visible ? "text-green-400" : "text-gray-600"
                  }`}
                  title={info.visible ? "Hide layer" : "Show layer"}
                >
                  {info.visible ? "👁" : "👁🏻"}
                </button>

                {/* Lock toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock?.(i);
                  }}
                  className={`w-5 h-5 flex items-center justify-center rounded ${
                    info.locked ? "text-red-400" : "text-gray-600"
                  }`}
                  title={info.locked ? "Unlock layer" : "Lock layer"}
                >
                  {info.locked ? "🔒" : "🔓"}
                </button>

                <LayerThumbnail
                  layerIndex={i}
                  canvasState={
                    canvasState || {
                      width: 32,
                      height: 32,
                      layers: layers,
                      pixels: new Map(),
                      voxelTypes: new Map(),
                      layerInfo: layerInfo,
                      activeLayer: activeLayer
                    }
                  }
                  width={32}
                  height={32}
                />

                {/* Layer name (clickable to rename) */}
                <span
                  className={`flex-1 truncate cursor-pointer ${
                    isActive ? "text-white font-medium" : "text-gray-400"
                  } ${!info.visible ? "opacity-50 line-through" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRenameModal?.(i, info.name);
                  }}
                  title="Click to rename"
                >
                  {info.name}
                </span>

                {/* Active indicator */}
                {isActive && <span className="text-[8px] text-cyan-400">●</span>}
              </div>
            );
          })}
      </div>

      <div className="flex gap-1">
        <button onClick={onAddLayer} className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs">
          + Layer
        </button>
        <button onClick={onDuplicateLayer} className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">
          Copy
        </button>
      </div>

      <div className="flex gap-1">
        <button
          onClick={onMoveLayerUp}
          disabled={activeLayer === 0}
          className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs disabled:opacity-50"
        >
          ↑ Up
        </button>
        <button
          onClick={onMoveLayerDown}
          disabled={activeLayer === layers - 1}
          className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs disabled:opacity-50"
        >
          ↓ Down
        </button>
      </div>

     <button onClick={onImportImage} className="w-full px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs">
        Import Image
      </button>

      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={() => onFillLayers(canvasWidth)}
          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-[10px] font-mono"
        >
          ={canvasWidth}
        </button>
        <button
          onClick={() => onFillLayers(32)}
          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-[10px] font-mono"
        >
          =32
        </button>
      </div>
    </div>
  );
};

export default LayerNavigator;
