import { useEffect } from "react";
import { CanvasState, BrushState, TimelineState } from "../types/voxel";
import { saveAutosave } from "../utils/projectIO";
import type { ToastType } from "../components/Toast";

const AUTO_SAVE_DELAY = 5000;

export function useAutoSave(
  canvasStateRef: React.MutableRefObject<CanvasState>,
  timelineRef: React.MutableRefObject<TimelineState>,
  brushRef: React.MutableRefObject<BrushState>,
  canvasState: CanvasState,
  timeline: TimelineState,
  onToast: (msg: string, type?: ToastType) => void
) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      saveAutosave(canvasStateRef.current, timelineRef.current, brushRef.current, () => {
        onToast("Auto-save failed: browser storage may be full", "warning");
      });
    }, AUTO_SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [canvasState, timeline]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      saveAutosave(canvasStateRef.current, timelineRef.current, brushRef.current, () => {
        onToast("Auto-save failed: browser storage may be full", "warning");
      });
    }, AUTO_SAVE_DELAY);
    return () => clearTimeout(timer);
  }, []);
}
