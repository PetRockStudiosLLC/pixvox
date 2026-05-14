import { useCallback } from "react";
import { BrushState } from "../types/voxel";
import type { ToastType } from "../components/Toast";
import type { ProjectFile as ProjectFileType } from "../utils/projectIO";
import {
  serializeProject,
  deserializeProject,
  saveToLocalStorage,
  clearAutosave,
  downloadProject,
  estimateProjectSize
} from "../utils/projectIO";

const DEFAULT_PALETTE = [
  "#ff0000ff",
  "#00ff00ff",
  "#0000ffff",
  "#ffff00ff",
  "#ff00ffff",
  "#00ffffff",
  "#ff8800ff",
  "#8800ffff",
  "#008800ff",
  "#880000ff",
  "#000088ff",
  "#888888ff",
  "#ffffffff",
  "#000000ff",
  "#ff4488ff",
  "#44ff88ff"
];

export function useSaveActions(
  canvasStateRef: React.MutableRefObject<any>,
  timelineRef: React.MutableRefObject<any>,
  brushRef: React.MutableRefObject<BrushState>,
  setCanvasState: React.Dispatch<React.SetStateAction<any>>,
  setTimeline: React.Dispatch<React.SetStateAction<any>>,
  setBrush: React.Dispatch<React.SetStateAction<BrushState>>,
  setLoadingState: (state: { isLoading: boolean; message?: string }) => void,
  onToast: (msg: string, type?: ToastType) => void
) {
  const getCurrentProject = useCallback((): ProjectFileType => {
    return serializeProject(canvasStateRef.current, timelineRef.current, brushRef.current);
  }, [canvasStateRef, timelineRef, brushRef]);

  const handleSave = useCallback(() => {
    const project = getCurrentProject();
    saveToLocalStorage(project, undefined, () => {
      onToast("Failed to save project to browser storage", "error");
      return;
    });
    clearAutosave();
    onToast(`Project saved! (${estimateProjectSize(project)})`, "success");
  }, [getCurrentProject, onToast]);

  const handleSaveProject = useCallback(() => {
    const project = getCurrentProject();
    downloadProject(project);
    onToast(`Project exported! (${estimateProjectSize(project)})`, "success");
  }, [getCurrentProject, onToast]);

  const handleLoadProject = useCallback(async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".p2v.json,.json";
      const filePromise = new Promise<File | null>((resolve) => {
        input.onchange = () => {
          if (input.files && input.files[0]) resolve(input.files[0]);
          else resolve(null);
        };
        input.click();
      });
      const file = await filePromise;
      if (!file) return;
      setLoadingState({ isLoading: true, message: "Loading project..." });
      const text = await file.text();
      const project = JSON.parse(text) as ProjectFileType;
      const { canvasState: loadedCanvas, timeline: loadedTimeline, brush: loadedBrush } = deserializeProject(project);
      setCanvasState(loadedCanvas);
      setTimeline(loadedTimeline);
      setBrush({ ...loadedBrush, palette: loadedBrush.palette || DEFAULT_PALETTE });
      setLoadingState({ isLoading: false });
      onToast("Project loaded!", "success");
    } catch (error) {
      console.error("Failed to load project:", error);
      setLoadingState({ isLoading: false });
      onToast("Load failed: " + (error instanceof Error ? error.message : String(error)), "error");
    }
  }, [setCanvasState, setTimeline, setBrush, setLoadingState, onToast]);

  return { getCurrentProject, handleSave, handleSaveProject, handleLoadProject };
}
