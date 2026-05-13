import React, { useState } from "react";
import { CanvasState } from "../types/voxel";
import VoxelScene from "./VoxelScene";
import LayerThumbnail from "./LayerThumbnail";
import {
  IconCube,
  IconLayers,
  IconPlus,
  IconCopy,
  IconArrowUp,
  IconArrowDown,
  IconImage,
  IconEye,
  IconEyeOff,
  IconLock,
  IconUnlock,
  IconCollapse,
  IconExpand
} from "./Icons";

interface RightPanelProps {
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  voxelMode: "fast-draft" | "final-bake";
  setVoxelMode: (mode: "fast-draft" | "final-bake") => void;
  onAddLayer: () => void;
  onDuplicateLayer: () => void;
  onMoveLayerUp: () => void;
  onMoveLayerDown: () => void;
  onImportImage: () => void;
  renderMode: "2d" | "3d";
  collapsed: boolean;
  onToggle: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
  canvasState,
  setCanvasState,
  voxelMode,
  setVoxelMode,
  onAddLayer,
  onDuplicateLayer,
  onMoveLayerUp,
  onMoveLayerDown,
  onImportImage,
  renderMode,
  collapsed,
  onToggle
}) => {
  const [activeTab, setActiveTab] = useState<"preview" | "layers">("preview");

  if (collapsed) {
    return (
      <div className="w-10 bg-panel border-l border-border flex flex-col items-center py-2 gap-1 flex-shrink-0">
        <button
          onClick={() => setActiveTab("preview")}
          className={`p-1.5 rounded-sm transition-colors ${
            activeTab === "preview"
              ? "bg-accent-dim text-text-bright"
              : "text-text-dim hover:text-text hover:bg-panel-hover"
          }`}
          title="3D Preview"
        >
          <IconCube size={16} />
        </button>
        <button
          onClick={() => setActiveTab("layers")}
          className={`p-1.5 rounded-sm transition-colors ${
            activeTab === "layers"
              ? "bg-accent-dim text-text-bright"
              : "text-text-dim hover:text-text hover:bg-panel-hover"
          }`}
          title="Layers"
        >
          <IconLayers size={16} />
        </button>
        <div className="flex-1" />
        <button onClick={onToggle} className="blender-icon-btn p-1" title="Expand panel">
          <IconExpand size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-panel border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
      <div className="flex items-center border-b border-border">
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "preview"
              ? "text-text-bright bg-panel-hover"
              : "text-text-dim hover:text-text hover:bg-panel-hover"
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab("layers")}
          className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "layers"
              ? "text-text-bright bg-panel-hover"
              : "text-text-dim hover:text-text hover:bg-panel-hover"
          }`}
        >
          Layers
        </button>
        <button onClick={onToggle} className="blender-icon-btn p-1 border-l border-border" title="Collapse panel">
          <IconCollapse size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "preview" ? (
          <PreviewTab
            canvasState={canvasState}
            voxelMode={voxelMode}
            setVoxelMode={setVoxelMode}
            renderMode={renderMode}
          />
        ) : (
          <LayersTab
            canvasState={canvasState}
            setCanvasState={setCanvasState}
            onAddLayer={onAddLayer}
            onDuplicateLayer={onDuplicateLayer}
            onMoveLayerUp={onMoveLayerUp}
            onMoveLayerDown={onMoveLayerDown}
            onImportImage={onImportImage}
          />
        )}
      </div>
    </div>
  );
};

const PreviewTab: React.FC<{
  canvasState: CanvasState;
  voxelMode: "fast-draft" | "final-bake";
  setVoxelMode: (mode: "fast-draft" | "final-bake") => void;
  renderMode: "2d" | "3d";
}> = ({ canvasState, voxelMode, setVoxelMode, renderMode }) => {
  const hidePreview3D = renderMode === "3d";
  return (
    <div className="flex flex-col">
      {hidePreview3D ? (
        <div className="aspect-square bg-surface flex items-center justify-center">
          <div className="text-text-dim text-xs">Preview hidden in 3D mode</div>
        </div>
      ) : (
        <div className="aspect-square bg-surface relative">
          <VoxelScene canvasState={canvasState} mode={voxelMode} />
        </div>
      )}
      <div className="p-2 space-y-1.5 border-t border-border">
        <div className="flex gap-1">
          <button
            onClick={() => setVoxelMode("fast-draft")}
            className={`flex-1 py-1 rounded-sm text-xs font-medium transition-colors ${
              voxelMode === "fast-draft"
                ? "bg-accent-dim text-text-bright"
                : "bg-panel-hover text-text-dim hover:text-text"
            }`}
          >
            Fast Draft
          </button>
          <button
            onClick={() => setVoxelMode("final-bake")}
            className={`flex-1 py-1 rounded-sm text-xs font-medium transition-colors ${
              voxelMode === "final-bake"
                ? "bg-accent-dim text-text-bright"
                : "bg-panel-hover text-text-dim hover:text-text"
            }`}
          >
            Final Bake
          </button>
        </div>
        <div className="text-[10px] text-text-dim font-mono">
          Voxels: {canvasState.pixels.size} | Layers: {canvasState.layers}
        </div>
      </div>
    </div>
  );
};

const LayersTab: React.FC<{
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  onAddLayer: () => void;
  onDuplicateLayer: () => void;
  onMoveLayerUp: () => void;
  onMoveLayerDown: () => void;
  onImportImage: () => void;
}> = ({ canvasState, setCanvasState, onAddLayer, onDuplicateLayer, onMoveLayerUp, onMoveLayerDown, onImportImage }) => (
  <div className="flex flex-col">
    <div className="p-2 border-b border-border">
      <div className="flex gap-1">
        <button
          onClick={onAddLayer}
          className="blender-icon-btn flex-1 flex items-center justify-center gap-1 py-1.5 rounded-sm"
          title="Add Layer"
        >
          <IconPlus size={12} /> <span className="text-[10px]">Add</span>
        </button>
        <button
          onClick={onDuplicateLayer}
          className="blender-icon-btn flex-1 flex items-center justify-center gap-1 py-1.5 rounded-sm"
          title="Duplicate Layer"
        >
          <IconCopy size={12} /> <span className="text-[10px]">Dup</span>
        </button>
        <button
          onClick={onImportImage}
          className="blender-icon-btn flex-1 flex items-center justify-center gap-1 py-1.5 rounded-sm"
          title="Import Image"
        >
          <IconImage size={12} /> <span className="text-[10px]">Import</span>
        </button>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      {Array.from({ length: canvasState.layers }, (_, i) => {
        const layer = canvasState.layerInfo[i];
        const isActive = i === canvasState.activeLayer;
        return (
          <div
            key={i}
            onClick={() => setCanvasState((prev) => ({ ...prev, activeLayer: i }))}
            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-border/30 transition-colors ${
              isActive ? "bg-accent-dim/50" : "hover:bg-panel-hover"
            }`}
          >
            <LayerThumbnail layerIndex={i} canvasState={canvasState} width={32} height={32} />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${isActive ? "text-text-bright" : "text-text-dim"}`}>
                {layer?.name || `Layer ${i + 1}`}
              </div>
            </div>
            <div className="flex gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleVisibility(i, canvasState, setCanvasState);
                }}
                className="blender-icon-btn p-0.5"
                title={layer?.visible !== false ? "Hide" : "Show"}
              >
                {layer?.visible !== false ? <IconEye size={12} /> : <IconEyeOff size={12} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLock(i, canvasState, setCanvasState);
                }}
                className="blender-icon-btn p-0.5"
                title={layer?.locked ? "Unlock" : "Lock"}
              >
                {layer?.locked ? <IconLock size={12} /> : <IconUnlock size={12} />}
              </button>
            </div>
          </div>
        );
      })}
    </div>

    <div className="p-2 border-t border-border flex gap-1">
      <button
        onClick={onMoveLayerUp}
        disabled={canvasState.activeLayer === 0}
        className="blender-icon-btn flex-1 flex items-center justify-center"
        title="Move Up"
      >
        <IconArrowUp size={12} />
      </button>
      <button
        onClick={onMoveLayerDown}
        disabled={canvasState.activeLayer === canvasState.layers - 1}
        className="blender-icon-btn flex-1 flex items-center justify-center"
        title="Move Down"
      >
        <IconArrowDown size={12} />
      </button>
    </div>
  </div>
);

const handleToggleVisibility = (
  layer: number,
  state: CanvasState,
  setter: React.Dispatch<React.SetStateAction<CanvasState>>
) => {
  setter((prev) => {
    const newInfo = [...prev.layerInfo];
    newInfo[layer] = { ...newInfo[layer], visible: !newInfo[layer].visible };
    return { ...prev, layerInfo: newInfo };
  });
};

const handleToggleLock = (
  layer: number,
  state: CanvasState,
  setter: React.Dispatch<React.SetStateAction<CanvasState>>
) => {
  setter((prev) => {
    const newInfo = [...prev.layerInfo];
    newInfo[layer] = { ...newInfo[layer], locked: !newInfo[layer].locked };
    return { ...prev, layerInfo: newInfo };
  });
};

export default RightPanel;
