import { useCallback, useRef } from "react";
import type { CanvasState } from "../types/voxel";

export function useUndoRedo(setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>) {
  const maxHistory = 50;

  // Use refs so callbacks always read the latest value
  const historyRef = useRef<string[]>([]);
  const indexRef = useRef(-1);

  // Deep-stringify the state to store in history
  const snapshot = useCallback((state: CanvasState): string => {
    return JSON.stringify({
      width: state.width,
      height: state.height,
      layers: state.layers,
      activeLayer: state.activeLayer,
      pixels: Array.from(state.pixels.entries()),
      voxelTypes: Array.from(state.voxelTypes.entries()),
      layerInfo: state.layerInfo
    });
  }, []);

  // Rebuild state from a snapshot string
  const restore = useCallback((snap: string): CanvasState => {
    const parsed = JSON.parse(snap);
    return {
      width: parsed.width,
      height: parsed.height,
      layers: parsed.layers,
      activeLayer: parsed.activeLayer,
      pixels: new Map(parsed.pixels),
      voxelTypes: new Map(parsed.voxelTypes),
      layerInfo: parsed.layerInfo
    };
  }, []);

  const saveToHistory = useCallback(
    (state: CanvasState) => {
      const snap = snapshot(state);
      // Truncate any redo states
      historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
      historyRef.current.push(snap);
      if (historyRef.current.length > maxHistory) {
        historyRef.current.shift();
      }
      indexRef.current = historyRef.current.length - 1;
    },
    [snapshot]
  );

  // Save history as part of a state transition — called inside setCanvasState updater
  const saveToHistoryFromState = useCallback(
    (state: CanvasState): CanvasState => {
      saveToHistory(state);
      return state;
    },
    [saveToHistory]
  );

  const handleUndo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    const state = restore(historyRef.current[indexRef.current]);
    setCanvasState(() => state);
  }, [restore, setCanvasState]);

  const handleRedo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    const state = restore(historyRef.current[indexRef.current]);
    setCanvasState(() => state);
  }, [restore, setCanvasState]);

  return {
    history: historyRef.current,
    historyIndex: indexRef.current,
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < historyRef.current.length - 1,
    saveToHistory,
    saveToHistoryFromState,
    handleUndo,
    handleRedo
  };
}
