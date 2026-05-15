import { useCallback, useRef } from "react";
import * as THREE from "three";
import { CanvasState, TimelineState } from "../types/voxel";
import type { ToastType } from "../components/Toast";
import type { ImportOptions } from "../components/ModelImportDialog";
import { importAnimationJSON, importAlembicABC } from "../utils/export";
import { isOldDemoFile, oldDemoToProject, deserializeProject } from "../utils/projectIO";
import type { ProjectFile as ProjectFileType } from "../utils/projectIO";
import { loadModel } from "../utils/import/modelLoader";
import { voxelizeMesh } from "../utils/import/voxelize";
import { createCanvasState } from "../utils/canvasBuffer";

export function useImportActions(
  canvasState: CanvasState,
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>,
  setTimeline: React.Dispatch<React.SetStateAction<TimelineState>>,
  setLoadingState: (state: { isLoading: boolean; message?: string }) => void,
  onToast: (msg: string, type?: ToastType) => void,
  setImportedModel: React.Dispatch<React.SetStateAction<THREE.Group | null>>
) {
  // Ref to access current model in callbacks without stale closure
  const modelRef = useRef<THREE.Group | null>(null);
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

  // Import 3D model - just loads it into the ref, doesn't voxelize
  const handleImportModel = useCallback(
    async (options: ImportOptions, file: File) => {
      console.log("Importing model:", file.name, file.size, "bytes");
      try {
        setLoadingState({ isLoading: true, message: "Loading 3D model..." });

        const result = await loadModel(file, (progress, message) => {
          console.log("Progress:", progress, message);
          setLoadingState({ isLoading: true, message: message || "Loading..." });
        });

        console.log("Model loaded:", result.name, "size:", result.originalSize);

        // Store in both state (triggers re-render) and ref (for callbacks)
        setImportedModel(result.mesh as THREE.Group);
        modelRef.current = result.mesh as THREE.Group;
        console.log("Model stored");

        setLoadingState({ isLoading: false });
        onToast(`Model loaded: ${file.name} (${result.originalSize.x.toFixed(1)} x ${result.originalSize.y.toFixed(1)} x ${result.originalSize.z.toFixed(1)})`, "success");
      } catch (error) {
        console.error("Failed to import 3D model:", error);
        setLoadingState({ isLoading: false });
        const msg = error instanceof Error ? error.message : String(error);
        onToast("Import failed: " + msg, "error");
        throw error;
      }
    },
    [setLoadingState, onToast, setImportedModel]
  );

  // Voxelize the currently loaded model
  const handleVoxelize = useCallback(
    async (options: ImportOptions) => {
      const mesh = modelRef.current;
      console.log("Voxelize: modelRef.current =", mesh ? "YES" : "NO");
      if (!mesh) {
        onToast("No model loaded. Import a 3D model first.", "error");
        return;
      }

      try {
        setLoadingState({ isLoading: true, message: "Voxelizing..." });

        const voxelizeOptions = {
          resolution: options.resolution,
          scale: options.scale,
          colorMode: options.colorMode,
          solidColor: options.solidColor,
        };

        const voxelResult = voxelizeMesh(mesh, voxelizeOptions, (progress, message) => {
          setLoadingState({ isLoading: true, message: message || "Processing..." });
        });
        console.log("Voxelize: result =", voxelResult ? `voxels: ${voxelResult.voxels.length}` : "NULL");

        if (!voxelResult || voxelResult.voxels.length === 0) {
          onToast("No voxels generated. Try a lower resolution.", "error");
          setLoadingState({ isLoading: false });
          return;
        }

        // Determine canvas dimensions from bounding box + padding for centering
        const { boundingBox, voxels } = voxelResult;
        const modelW = Math.ceil(boundingBox.maxX - boundingBox.minX);
        const modelH = Math.ceil(boundingBox.maxY - boundingBox.minY);
        const modelD = Math.ceil(boundingBox.maxZ - boundingBox.minZ);

        // Add padding so model is centered in the canvas
        const padding = 4;
        const width = Math.min(128, Math.max(8, modelW + padding * 2));
        const height = Math.min(128, Math.max(8, modelH + padding * 2));
        const layers = Math.min(128, Math.max(8, modelD + padding * 2));

        // Create new canvas state
        const newCanvasState = {
          ...createCanvasState(width, height, layers),
          pixels: new Map(),
          voxelTypes: new Map(),
        };

        // Map voxels to canvas coordinates, flipping Y so model sits upright
        for (const v of voxels) {
          const adjustedX = Math.max(0, Math.min(width - 1, Math.round(v.x - boundingBox.minX) + padding));
          const adjustedY = Math.max(0, Math.min(height - 1, Math.round(boundingBox.maxY - v.y) + padding));
          const adjustedZ = Math.max(0, Math.min(layers - 1, Math.round(v.z - boundingBox.minZ) + padding));

          const key = `${adjustedX},${adjustedY},${adjustedZ}`;
          newCanvasState.pixels.set(key, v.color);
        }

        // Create timeline
        const newTimeline: TimelineState = {
          fps: 12,
          totalFrames: 1,
          currentFrame: 0,
          frames: [{
            pixels: new Map(newCanvasState.pixels),
            hasKeyframe: true,
            duration: 1
          }],
          playing: false,
          loop: true
        };

        setCanvasState(newCanvasState);
        setTimeline(newTimeline);
        setLoadingState({ isLoading: false });
        onToast(`Voxelize complete: ${voxels.length.toLocaleString()} voxels`, "success");
      } catch (error) {
        console.error("Failed to voxelize:", error);
        setLoadingState({ isLoading: false });
        onToast("Voxelize failed: " + (error instanceof Error ? error.message : String(error)), "error");
      }
    },
    [setCanvasState, setTimeline, setLoadingState, onToast]
  );

  return { handleImportAnimation, handleLoadDemo, handleImportModel, handleVoxelize };
}
