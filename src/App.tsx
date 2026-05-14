import { useCallback, useState } from "react";
import { IconClose } from "./components/Icons";
import { BrushState } from "./types/voxel";
import type { ToastType } from "./components/Toast";
import { useProjectState } from "./hooks/useProjectState";
import { useTimeline } from "./hooks/useTimeline";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { useAutoSave } from "./hooks/useAutoSave";
import { usePlayback } from "./hooks/usePlayback";
import { useKeyboard } from "./hooks/useKeyboard";
import { useExportActions } from "./hooks/useExportActions";
import { useImportActions } from "./hooks/useImportActions";
import { useSaveActions } from "./hooks/useSaveActions";
import { useCanvasActions } from "./hooks/useCanvasActions";
import { useMobileUI } from "./hooks/useMobileUI";
import MultiCanvasView from "./components/MultiCanvasView";
import Workspace from "./components/Workspace";
import VoxelScene from "./components/VoxelScene";
import PaletteManager from "./components/PaletteManager";
import LayerNavigator from "./components/LayerNavigator";
import { ToastProvider, useToast } from "./components/Toast";
import MobileBottomNav from "./components/Mobile/MobileBottomNav";
import MobileTimeline from "./components/Mobile/MobileTimeline";
import MobileMenu from "./components/Mobile/MobileMenu";
import LoadingOverlay from "./components/LoadingOverlay";

function AppInner() {
  const { toast } = useToast();

  // Core project state
  const projectState = useProjectState(toast);
  const {
    canvasState,
    setCanvasState,
    canvasStateRef,
    brush,
    setBrush,
    brushRef,
    renderMode,
    setRenderMode,
    voxelMode,
    setVoxelMode
  } = projectState;

  // Timeline state + frame/keyframe handlers
  const timelineState = useTimeline(canvasStateRef, setCanvasState, toast);
  const {
    timeline,
    setTimeline,
    timelineRef,
    currentFrameRef,
    handleFrameChange,
    handleKeyframeAdd,
    handleKeyframeDelete,
    handleTimelineChange,
    handleFrameReorder,
    handleFrameDurationChange
  } = timelineState;

  // Undo/redo
  const undoRedo = useUndoRedo(setCanvasState);
  const { saveToHistory, saveToHistoryFromState, handleUndo, handleRedo, canUndo, canRedo } = undoRedo;

  // Auto-save
  useAutoSave(canvasStateRef, timelineRef, brushRef, canvasState, timeline, toast);

  // Playback loop
  usePlayback(timeline, handleFrameChange);

  // Keyboard shortcuts
  const isCtrlPressed = useKeyboard(
    handleUndo,
    handleRedo,
    handleFrameChange,
    handleKeyframeAdd,
    setRenderMode,
    setTimeline,
    timeline.totalFrames,
    currentFrameRef
  );

  // UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingState, setLoadingState] = useState<{ isLoading: boolean; message?: string }>({ isLoading: false });
  const [paletteManagerOpen, setPaletteManagerOpen] = useState(false);

  // Export actions
  const exportActions = useExportActions(canvasState, timeline, voxelMode, setLoadingState, toast);

  // Import actions
  const importActions = useImportActions(canvasState, setCanvasState, setTimeline, setLoadingState, toast);

  // Save actions
  const saveActions = useSaveActions(
    canvasStateRef,
    timelineRef,
    brushRef,
    setCanvasState,
    setTimeline,
    setBrush,
    setLoadingState,
    toast
  );

  // Canvas actions
  const canvasActions = useCanvasActions(canvasState, setCanvasState, setLoadingState, toast, saveToHistory);

  // Mobile UI
  const mobileUI = useMobileUI(setCanvasState, setBrush);

  // Brush/palette handlers
  const handleBrushChange = useCallback(
    (newBrush: BrushState) => {
      setBrush(newBrush);
      setMobileMenuOpen(false);
    },
    [setBrush]
  );

  const handleLoadPalette = useCallback(
    (colors: string[]) => {
      setBrush((prev) => ({ ...prev, palette: colors, color: colors[0] || prev.color }));
    },
    [setBrush]
  );

  const handleColorPick = useCallback(
    (color: string) => {
      if (!color || color === "#00000000") return;
      setBrush((prev) => {
        const currentPalette = prev.palette || [];
        const newPalette = currentPalette.includes(color) ? currentPalette : [...currentPalette, color];
        return { ...prev, palette: newPalette, color };
      });
    },
    [setBrush]
  );

  return (
    <div className="flex flex-col h-full bg-surface text-text overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col flex-1 min-h-0">
        <Workspace
          canvasState={canvasState}
          setCanvasState={setCanvasState}
          brush={brush}
          onBrushChange={handleBrushChange}
          onCanvasResize={canvasActions.handleCanvasResize}
          renderMode={renderMode}
          setRenderMode={setRenderMode}
          voxelMode={voxelMode}
          setVoxelMode={setVoxelMode}
          handleExportGLTF={exportActions.handleExportGLTF}
          handleExportAnimationJSON={exportActions.handleExportAnimationJSON}
          handleExportAlembicABC={exportActions.handleExportAlembicABC}
          handleExportFrameSequence={exportActions.handleExportFrameSequence}
          handleImportAnimation={importActions.handleImportAnimation}
          handleExportPNG={exportActions.handleExportPNG}
          handleExportSpriteSheet={exportActions.handleExportSpriteSheet}
          handleExportGIF={exportActions.handleExportGIF}
          handleSave={saveActions.handleSave}
          handleClear={canvasActions.handleClear}
          handleSaveProject={saveActions.handleSaveProject}
          handleLoadProject={saveActions.handleLoadProject}
          handleLoadDemo={importActions.handleLoadDemo}
          handleAddLayer={canvasActions.handleAddLayer}
          handleDuplicateLayer={canvasActions.handleDuplicateLayer}
          handleMoveLayerUp={canvasActions.handleMoveLayerUp}
          handleMoveLayerDown={canvasActions.handleMoveLayerDown}
          handleImportImage={canvasActions.handleImportImage}
          handleFillLayers={canvasActions.handleFillLayers}
          onSaveHistory={saveToHistory}
          handlePixelChange={(x: number, y: number, z: number, color: string) => {
            setCanvasState((prev) => {
              const next = { ...prev, pixels: new Map(prev.pixels) };
              const key = `${x},${y},${z}`;
              if (color === "#00000000" || (color.length === 9 && color.slice(7) === "00")) {
                next.pixels.delete(key);
              } else {
                next.pixels.set(key, color);
              }
              return saveToHistoryFromState(next);
            });
          }}
          handleColorPick={handleColorPick}
          onColorSelect={(color: string) => handleBrushChange({ ...brush, color })}
          isCtrlPressed={isCtrlPressed}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          timeline={timeline}
          onTimelineChange={handleTimelineChange}
          onFrameChange={handleFrameChange}
          onKeyframeAdd={handleKeyframeAdd}
          onKeyframeDelete={handleKeyframeDelete}
          onFrameReorder={handleFrameReorder}
          onFrameDurationChange={handleFrameDurationChange}
          onOpenPaletteManager={() => setPaletteManagerOpen(true)}
        />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full overflow-hidden">
        <header className="flex-none h-10 bg-panel-header border-b border-border px-3 flex items-center justify-between safe-inset-top">
          <h1 className="text-sm font-bold text-accent tracking-wider">PIXVOX</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => mobileUI.setShowTimeline((prev) => !prev)}
              className={`flex items-center gap-1.5 bg-panel px-2 py-0.5 rounded-sm border transition-colors touch-target-sm ${
                mobileUI.showTimeline ? "border-accent text-accent" : "border-border-light text-text-dim"
              }`}
              aria-label="Toggle timeline"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="text-[9px] uppercase font-bold">Anim</span>
            </button>
            <div className="flex items-center gap-2 bg-panel px-2 py-0.5 rounded-sm border border-border-light">
              <span className="text-[9px] uppercase font-bold text-text-dim">L</span>
              <span className="text-xs font-mono text-accent">{canvasState.activeLayer + 1}</span>
            </div>
          </div>
        </header>

        {mobileUI.showTimeline && (
          <div className="flex-none bg-panel border-b border-border z-20">
            <MobileTimeline
              timeline={timeline}
              onTimelineChange={handleTimelineChange}
              onFrameChange={handleFrameChange}
              onKeyframeAdd={handleKeyframeAdd}
              onKeyframeDelete={handleKeyframeDelete}
              onFrameReorder={handleFrameReorder}
              onFrameDurationChange={handleFrameDurationChange}
            />
          </div>
        )}

        <main
          className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
          onTouchStart={mobileUI.handleTouchStartMobile}
          onTouchEnd={mobileUI.handleTouchEndMobile}
        >
          {mobileUI.mobileTab === "draw" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-1">
              <div className="flex-1 min-h-0 bg-surface overflow-hidden">
                <MultiCanvasView
                  canvasState={canvasState}
                  setCanvasState={setCanvasState}
                  brush={brush}
                  onPixelChange={(x, y, z, color) => {
                    setCanvasState((prev) => {
                      const next = { ...prev, pixels: new Map(prev.pixels) };
                      const key = `${x},${y},${z}`;
if (color === "#00000000" || (color.length === 9 && color.slice(7) === "00")) {
                        next.pixels.delete(key);
                      } else {
                        next.pixels.set(key, color);
                      }
                      return saveToHistoryFromState(next);
                    });
                  }}
                  onSaveHistory={saveToHistory}
                  onColorPick={handleColorPick}
                  isCtrlPressed={isCtrlPressed}
                />
              </div>
              <div className="mt-auto mb-14 mx-auto w-[95%] max-w-md z-10">
                <div className="bg-panel/95 backdrop-blur-sm rounded-lg p-2 border border-border shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      <input
                        type="color"
                        value={brush.color.slice(0, 7)}
                        onChange={(e) => setBrush({ ...brush, color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-border-light bg-transparent"
                      />
                    </div>
                    <div className="flex gap-1">
                      {(["point", "line", "eraser"] as const).map((tool) => (
                        <button
                          key={tool}
                          onClick={() => setBrush({ ...brush, tool: tool as any })}
                          className={`w-9 h-9 rounded flex items-center justify-center text-xs font-bold transition-all ${brush.tool === tool ? "bg-accent-dim text-text-bright" : "bg-panel-hover text-text-dim"}`}
                        >
                          {tool[0].toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 min-w-[60px]">
                      <input
                        type="range"
                        min={1}
                        max={32}
                        value={brush.size}
                        onChange={(e) => setBrush({ ...brush, size: parseInt(e.target.value) })}
                        className="w-full blender-slider"
                      />
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {[1, 2, 4, 8, 16, 32].map((s) => (
                          <button
                            key={s}
                            onClick={() => setBrush({ ...brush, size: s })}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              brush.size === s
                                ? "bg-accent text-white"
                                : "bg-panel-hover text-text-dim hover:text-text"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mobileUI.mobileTab === "palette" && (
            <div className="h-full overflow-y-auto p-4 bg-surface pb-20">
              <h2 className="text-sm font-bold mb-4 text-text-dim uppercase tracking-wider">Palette Manager</h2>
              <PaletteManager currentColors={brush.palette || []} onLoadPalette={handleLoadPalette} />
            </div>
          )}

          {mobileUI.mobileTab === "layers" && (
            <div className="h-full overflow-y-auto p-4 bg-surface pb-20">
              <h2 className="text-sm font-bold mb-4 text-text-dim uppercase tracking-wider">Layer Management</h2>
              <LayerNavigator
                layers={canvasState.layers}
                activeLayer={canvasState.activeLayer}
                layerInfo={canvasState.layerInfo}
                canvasWidth={canvasState.width}
                canvasHeight={canvasState.height}
                canvasState={canvasState}
                onLayerChange={(layer) => setCanvasState((prev) => ({ ...prev, activeLayer: layer }))}
                onAddLayer={canvasActions.handleAddLayer}
                onDuplicateLayer={canvasActions.handleDuplicateLayer}
                onMoveLayerUp={canvasActions.handleMoveLayerUp}
                onMoveLayerDown={canvasActions.handleMoveLayerDown}
                onImportImage={canvasActions.handleImportImage}
                onFillLayers={canvasActions.handleFillLayers}
                onToggleVisibility={(layer) => {
                  setCanvasState((prev) => {
                    const newInfo = [...prev.layerInfo];
                    newInfo[layer] = { ...newInfo[layer], visible: !newInfo[layer].visible };
                    return { ...prev, layerInfo: newInfo };
                  });
                }}
                onToggleLock={(layer) => {
                  setCanvasState((prev) => {
                    const newInfo = [...prev.layerInfo];
                    newInfo[layer] = { ...newInfo[layer], locked: !newInfo[layer].locked };
                    return { ...prev, layerInfo: newInfo };
                  });
                }}
                onOpenRenameModal={(layer, name) => mobileUI.setRenameModal({ layer, name })}
              />
            </div>
          )}

          {mobileUI.renameModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
              <div className="bg-panel border border-border p-4 rounded-lg w-[90%] max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-text mb-3">Rename Layer</h3>
                <input
                  type="text"
                  defaultValue={mobileUI.renameModal.name}
                  className="w-full bg-surface border border-border rounded px-2 py-1 text-sm text-text mb-4"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && mobileUI.renameModal) {
                      const name = (e.target as HTMLInputElement).value;
                      mobileUI.handleRenameModalSubmit(name);
                    } else if (e.key === "Escape") {
                      mobileUI.setRenameModal(null);
                    }
                  }}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => mobileUI.setRenameModal(null)}
                    className="px-3 py-1 text-xs bg-panel-hover border border-border rounded text-text-dim hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                      const name = input?.value || "";
                      mobileUI.handleRenameModalSubmit(name);
                    }}
                    className="px-3 py-1 text-xs bg-accent-dim text-text rounded transition-colors"
                  >
                    Rename
                  </button>
                </div>
              </div>
            </div>
          )}

          {mobileUI.mobileTab === "voxel" && (
            <div className="h-full relative bg-surface">
              <VoxelScene
                canvasState={canvasState}
                mode={voxelMode}
                brush={brush}
                onPixelChange={(x, y, z, color) => {
                  setCanvasState((prev) => {
                    const next = { ...prev, pixels: new Map(prev.pixels) };
                    const key = `${x},${y},${z}`;
                    if (color === "#00000000" || (color.length === 9 && color.slice(7) === "00")) {
                      next.pixels.delete(key);
                    } else {
                      next.pixels.set(key, color);
                    }
                    return saveToHistoryFromState(next);
                  });
                }}
              />
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button
                  onClick={() => setVoxelMode(voxelMode === "fast-draft" ? "final-bake" : "fast-draft")}
                  className="px-3 py-1.5 bg-panel/90 backdrop-blur-sm rounded text-xs font-bold border border-border-light"
                >
                  {voxelMode === "fast-draft" ? "Draft" : "Final"}
                </button>
              </div>
            </div>
          )}
        </main>

        <MobileBottomNav
          activeTab={mobileUI.mobileTab}
          onTabChange={(tab) => {
            mobileUI.setMobileTab(tab);
            if (tab === "voxel") setRenderMode("3d");
            else if (tab === "draw") setRenderMode("2d");
            mobileUI.setShowBottomSheet(false);
          }}
          onMenuPress={() => setMobileMenuOpen(true)}
        />
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay isLoading={loadingState.isLoading} message={loadingState.message} />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onSave={saveActions.handleSave}
        onSaveProject={saveActions.handleSaveProject}
        onLoadProject={saveActions.handleLoadProject}
        onClear={canvasActions.handleClear}
        onImportImage={canvasActions.handleImportImage}
        onExportPNG={exportActions.handleExportPNG}
        onExportSpriteSheet={exportActions.handleExportSpriteSheet}
        onExportGIF={exportActions.handleExportGIF}
        onExportGLTF={exportActions.handleExportGLTF}
        onExportAnimationJSON={exportActions.handleExportAnimationJSON}
        onExportAlembicABC={exportActions.handleExportAlembicABC}
        onExportFrameSequence={exportActions.handleExportFrameSequence}
        onImportAnimation={importActions.handleImportAnimation}
        onCanvasResize={canvasActions.handleCanvasResize}
        canvasWidth={canvasState.width}
        canvasHeight={canvasState.height}
        canvasLayers={canvasState.layers}
        voxelCount={canvasState.pixels.size}
        voxelMode={voxelMode}
        onVoxelModeChange={setVoxelMode}
      />

      {/* Palette Manager Modal */}
      {paletteManagerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h3 className="text-sm font-bold text-text-bright">Palette Manager</h3>
              <button
                onClick={() => setPaletteManagerOpen(false)}
                className="blender-icon-btn p-1"
                title="Close"
              >
                <IconClose size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PaletteManager
                currentColors={brush.palette || []}
                onLoadPalette={handleLoadPalette}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

export default App;
