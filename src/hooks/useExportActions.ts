import { useCallback } from "react";
import { CanvasState, TimelineState } from "../types/voxel";
import type { ToastType } from "../components/Toast";
import { exportPNG, exportSpriteSheet, exportAnimatedGIF } from "../utils/imageExporter";
import { exportGLTF, downloadFile } from "../utils/objExporter";
import { exportAnimationJSON, exportAlembicABC, exportFrameSequenceGLTF } from "../utils/animationExporter";
import { downloadBlob, downloadImage } from "../utils/download";

export function useExportActions(
  canvasState: CanvasState,
  timeline: TimelineState,
  voxelMode: "fast-draft" | "final-bake",
  setLoadingState: (state: { isLoading: boolean; message?: string }) => void,
  onToast: (msg: string, type?: ToastType) => void
) {
  const handleExportGLTF = useCallback(async () => {
    try {
      const { content, filename, mimeType } = exportGLTF(canvasState, voxelMode);
      if (!content) {
        onToast("No voxels to export!", "warning");
        return;
      }
      await downloadFile(content, filename, mimeType);
      onToast(`Exported ${filename}`, "success");
    } catch (error) {
      console.error("Failed to export GLTF:", error);
      onToast("Export failed: " + (error instanceof Error ? error.message : String(error)), "error");
    }
  }, [canvasState, voxelMode, onToast]);

  const handleExportAnimationJSON = useCallback(async () => {
    try {
      const { content, filename, mimeType } = exportAnimationJSON(canvasState, timeline);
      if (!content) {
        onToast("No frames to export!", "warning");
        return;
      }
      await downloadFile(content, filename, mimeType);
      onToast(`Exported ${filename}`, "success");
    } catch (error) {
      console.error("Failed to export animation JSON:", error);
      onToast("Animation JSON export failed", "error");
    }
  }, [canvasState, timeline, onToast]);

  const handleExportAlembicABC = useCallback(
    async (compress: "delta" | "snapshot") => {
      try {
        setLoadingState({ isLoading: true, message: `Exporting Alembic (${compress})...` });
        const { blob, filename } = await exportAlembicABC(canvasState, timeline, { compress });
        if (!blob.size) {
          onToast("No frames to export!", "warning");
          setLoadingState({ isLoading: false });
          return;
        }
        downloadBlob(blob, filename);
        setLoadingState({ isLoading: false });
        onToast(`Exported ${filename} (${compress} mode)`, "success");
      } catch (error) {
        console.error("Failed to export Alembic ABC:", error);
        setLoadingState({ isLoading: false });
        onToast("Alembic ABC export failed", "error");
      }
    },
    [canvasState, timeline, setLoadingState, onToast]
  );

  const handleExportFrameSequence = useCallback(async () => {
    try {
      setLoadingState({ isLoading: true, message: "Exporting frame sequence..." });
      const { blob, filename } = await exportFrameSequenceGLTF(canvasState, timeline);
      if (!blob.size) {
        onToast("No frames to export!", "warning");
        setLoadingState({ isLoading: false });
        return;
      }
      downloadBlob(blob, filename);
      setLoadingState({ isLoading: false });
      onToast(`Exported ${filename}`, "success");
    } catch (error) {
      console.error("Failed to export frame sequence:", error);
      setLoadingState({ isLoading: false });
      onToast("Frame sequence export failed", "error");
    }
  }, [canvasState, timeline, setLoadingState, onToast]);

  const handleExportPNG = useCallback(async () => {
    try {
      setLoadingState({ isLoading: true, message: "Exporting PNG..." });
      const { blob, filename } = await exportPNG(canvasState);
      downloadImage(blob, filename);
      setLoadingState({ isLoading: false });
      onToast("PNG exported!", "success");
    } catch (error) {
      console.error("Failed to export PNG:", error);
      setLoadingState({ isLoading: false });
      onToast("PNG export failed", "error");
    }
  }, [canvasState, setLoadingState, onToast]);

  const handleExportSpriteSheet = useCallback(async () => {
    try {
      setLoadingState({ isLoading: true, message: "Exporting sprite sheet..." });
      const { blob, filename } = await exportSpriteSheet(timeline, canvasState.width, canvasState.height);
      downloadImage(blob, filename);
      setLoadingState({ isLoading: false });
      onToast("Sprite sheet exported!", "success");
    } catch (error) {
      console.error("Failed to export sprite sheet:", error);
      setLoadingState({ isLoading: false });
      onToast("Sprite sheet export failed", "error");
    }
  }, [timeline, canvasState, setLoadingState, onToast]);

  const handleExportGIF = useCallback(async () => {
    try {
      setLoadingState({ isLoading: true, message: "Encoding GIF..." });
      const { blob, filename } = await exportAnimatedGIF(timeline, canvasState.width, canvasState.height);
      downloadImage(blob, filename);
      setLoadingState({ isLoading: false });
      onToast("GIF exported!", "success");
    } catch (error) {
      console.error("Failed to export GIF:", error);
      setLoadingState({ isLoading: false });
      onToast("GIF export failed", "error");
    }
  }, [timeline, canvasState, setLoadingState, onToast]);

  return {
    handleExportGLTF,
    handleExportAnimationJSON,
    handleExportAlembicABC,
    handleExportFrameSequence,
    handleExportPNG,
    handleExportSpriteSheet,
    handleExportGIF
  };
}
