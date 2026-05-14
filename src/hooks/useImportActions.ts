import { useCallback } from "react";
import { CanvasState, TimelineState } from "../types/voxel";
import type { ToastType } from "../components/Toast";
import { importAnimationJSON, importAlembicABC } from "../utils/export";
import { isOldDemoFile, oldDemoToProject, deserializeProject } from "../utils/projectIO";
import type { ProjectFile as ProjectFileType } from "../utils/projectIO";

export function useImportActions(
  canvasState: CanvasState,
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>,
  setTimeline: React.Dispatch<React.SetStateAction<TimelineState>>,
  setLoadingState: (state: { isLoading: boolean; message?: string }) => void,
  onToast: (msg: string, type?: ToastType) => void
) {
  const handleImportAnimation = useCallback(
    async (format: "json" | "abc") => {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = format === "json" ? ".p2v-anim.json,.json" : ".abc";
        const filePromise = new Promise<File | null>((resolve) => {
          input.onchange = () => {
            if (input.files && input.files[0]) resolve(input.files[0]);
            else resolve(null);
          };
          input.click();
        });
        const file = await filePromise;
        if (!file) return;

        setLoadingState({ isLoading: true, message: `Importing ${format === "json" ? "animation" : "Alembic"}...` });

        if (format === "json") {
          const text = await file.text();
          const result = importAnimationJSON(text, canvasState);
          if (!result) {
            onToast("Invalid animation JSON file", "error");
            setLoadingState({ isLoading: false });
            return;
          }
          setCanvasState(result.canvasState);
          setTimeline(result.timeline);
          setLoadingState({ isLoading: false });
          onToast("Animation JSON imported!", "success");
        } else {
          const result = await importAlembicABC(file, canvasState);
          if (!result) {
            onToast("Invalid Alembic ABC file", "error");
            setLoadingState({ isLoading: false });
            return;
          }
          setCanvasState(result.canvasState);
          setTimeline(result.timeline);
          setLoadingState({ isLoading: false });
          onToast("Alembic ABC imported!", "success");
        }
      } catch (error) {
        console.error("Failed to import animation:", error);
        setLoadingState({ isLoading: false });
        onToast("Import failed: " + (error instanceof Error ? error.message : String(error)), "error");
      }
    },
    [canvasState, setCanvasState, setTimeline, setLoadingState, onToast]
  );

  const handleLoadDemo = useCallback(async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      const filePromise = new Promise<File | null>((resolve) => {
        input.onchange = () => {
          if (input.files && input.files[0]) resolve(input.files[0]);
          else resolve(null);
        };
        input.click();
      });
      const file = await filePromise;
      if (!file) return;

      setLoadingState({ isLoading: true, message: "Loading demo..." });
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (isOldDemoFile(parsed)) {
        const project = oldDemoToProject(parsed);
        const result = deserializeProject(project);
        setCanvasState(result.canvasState);
        setTimeline(result.timeline);
        setLoadingState({ isLoading: false });
        onToast(`Demo loaded: ${file.name}`, "success");
      } else {
        setLoadingState({ isLoading: false });
        onToast("Not a valid demo file", "error");
      }
    } catch (error) {
      console.error("Failed to load demo:", error);
      setLoadingState({ isLoading: false });
      onToast("Demo load failed: " + (error instanceof Error ? error.message : String(error)), "error");
    }
  }, [setCanvasState, setTimeline, setLoadingState, onToast]);

  return { handleImportAnimation, handleLoadDemo };
}
