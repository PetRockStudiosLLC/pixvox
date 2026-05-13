import React, { useState, useCallback } from "react";
import { CanvasState, BrushState, TimelineState } from "../types/voxel";
import MultiCanvasView from "./MultiCanvasView";
import VoxelScene from "./VoxelScene";

import TopBar from "./TopBar";
import ToolPanel from "./ToolPanel";
import RightPanel from "./RightPanel";
import StatusBar from "./StatusBar";
import Timeline from "./Timeline";

interface WorkspaceProps {
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  brush: BrushState;
  onBrushChange: (brush: BrushState) => void;
  onCanvasResize: (width: number, height: number) => void;
  renderMode: "2d" | "3d";
  setRenderMode: (mode: "2d" | "3d") => void;
  voxelMode: "fast-draft" | "final-bake";
  setVoxelMode: (mode: "fast-draft" | "final-bake") => void;
  handleExportGLTF: () => void;
  handleExportAnimationJSON: () => void;
  handleExportAlembicABC: (compress: "delta" | "snapshot") => void;
  handleExportFrameSequence: () => void;
  handleImportAnimation: (format: "json" | "abc") => void;
  handleExportPNG: () => void;
  handleExportSpriteSheet: () => void;
  handleExportGIF: () => void;
  handleSave: () => void;
  handleClear: () => void;
  handleSaveProject: () => void;
  handleLoadProject: () => void;
  handleLoadDemo: () => void;
  handleAddLayer: () => void;
  handleDuplicateLayer: () => void;
  handleMoveLayerUp: () => void;
  handleMoveLayerDown: () => void;
  handleImportImage: () => void;
  onSaveHistory: (state: CanvasState) => void;
  handlePixelChange: (x: number, y: number, z: number, color: string) => void;
  handleColorPick: (color: string) => void;
  isCtrlPressed: React.RefObject<boolean>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  timeline: TimelineState;
  onTimelineChange: (timeline: TimelineState) => void;
  onFrameChange: (frame: number) => void;
  onKeyframeAdd: () => void;
  onKeyframeDelete: (frame: number) => void;
  onFrameReorder: (fromIndex: number, toIndex: number) => void;
  onFrameDurationChange: (frameIndex: number, duration: number) => void;
}

const Workspace: React.FC<WorkspaceProps> = ({
  canvasState,
  setCanvasState,
  brush,
  onBrushChange,
  onCanvasResize,
  renderMode,
  setRenderMode,
  voxelMode,
  setVoxelMode,
  handleExportGLTF,
  handleExportAnimationJSON,
  handleExportAlembicABC,
  handleExportFrameSequence,
  handleImportAnimation,
  handleExportPNG,
  handleExportSpriteSheet,
  handleExportGIF,
  handleSave,
  handleClear,
  handleSaveProject,
  handleLoadProject,
  handleLoadDemo,
  handleAddLayer,
  handleDuplicateLayer,
  handleMoveLayerUp,
  handleMoveLayerDown,
  handleImportImage,
  onSaveHistory,
  handlePixelChange,
  handleColorPick,
  isCtrlPressed,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  timeline,
  onTimelineChange,
  onFrameChange,
  onKeyframeAdd,
  onKeyframeDelete,
  onFrameReorder,
  onFrameDurationChange
}) => {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);

  const handleNew = () => {
    handleClear();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface">
      <TopBar
        onNew={handleNew}
        onSave={handleSave}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onLoadDemo={handleLoadDemo}
        onImportAnimation={handleImportAnimation}
        onExportGLTF={handleExportGLTF}
        onExportAnimationJSON={handleExportAnimationJSON}
        onExportAlembicABC={handleExportAlembicABC}
        onExportFrameSequence={handleExportFrameSequence}
        onExportPNG={handleExportPNG}
        onExportSpriteSheet={handleExportSpriteSheet}
        onExportGIF={handleExportGIF}
        onClear={handleClear}
        onUndo={onUndo}
        onRedo={onRedo}
        renderMode={renderMode}
        onToggleRenderMode={() => setRenderMode(renderMode === "2d" ? "3d" : "2d")}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <ToolPanel
          brush={brush}
          onBrushChange={onBrushChange}
          onCanvasResize={onCanvasResize}
          collapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed(!leftCollapsed)}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex items-center justify-between px-2 py-1 bg-panel border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-dim">
                Layer: {canvasState.activeLayer + 1}/{canvasState.layers}
              </span>
              <span className="text-xs text-text-dim">
                Grid: {canvasState.width}x{canvasState.height}
              </span>
            </div>
            {isCtrlPressed.current && <span className="text-xs text-accent font-bold animate-pulse">Ctrl: Pick</span>}
          </div>

          <div className="flex-1 min-h-0 bg-surface p-1 overflow-hidden flex flex-col">
            {/* 3D mode toolbar */}
            {renderMode === "3d" && (
              <div className="flex items-center justify-end gap-2 px-2 py-1 flex-shrink-0">
                <button
                  onClick={() => setVoxelMode(voxelMode === "fast-draft" ? "final-bake" : "fast-draft")}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold text-gray-300 transition-colors"
                >
                  {voxelMode === "fast-draft" ? "Draft" : "Final"}
                </button>
              </div>
            )}
            {renderMode === "2d" ? (
              <MultiCanvasView
                canvasState={canvasState}
                setCanvasState={setCanvasState}
                brush={brush}
                onPixelChange={handlePixelChange}
                onSaveHistory={onSaveHistory}
                onColorPick={handleColorPick}
                isCtrlPressed={isCtrlPressed}
              />
            ) : (
              <VoxelScene canvasState={canvasState} mode={voxelMode} brush={brush} onPixelChange={handlePixelChange} />
            )}
          </div>

          <Timeline
            timeline={timeline}
            onTimelineChange={onTimelineChange}
            onFrameChange={onFrameChange}
            onKeyframeAdd={onKeyframeAdd}
            onKeyframeDelete={onKeyframeDelete}
            onFrameReorder={onFrameReorder}
            onFrameDurationChange={onFrameDurationChange}
            collapsed={timelineCollapsed}
            onToggle={() => setTimelineCollapsed(!timelineCollapsed)}
          />

          <StatusBar canvasState={canvasState} brush={brush} isCtrlPressed={isCtrlPressed} />
        </div>

        <RightPanel
          canvasState={canvasState}
          setCanvasState={setCanvasState}
          voxelMode={voxelMode}
          setVoxelMode={setVoxelMode}
          onAddLayer={handleAddLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onMoveLayerUp={handleMoveLayerUp}
          onMoveLayerDown={handleMoveLayerDown}
          onImportImage={handleImportImage}
          renderMode={renderMode}
          collapsed={rightCollapsed}
          onToggle={() => setRightCollapsed(!rightCollapsed)}
        />
      </div>
    </div>
  );
};

export default Workspace;
