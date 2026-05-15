import React, { useState, useCallback } from "react";

export interface ImportOptions {
  scale: number;
  resolution: number;
  colorMode: "vertex" | "solid";
  solidColor: string;
  fillHoles?: boolean;
}

export interface ModelImportResult {
  mesh: import("three").Group;
  options: ImportOptions;
  fileName: string;
}

export interface ModelImportDialogProps {
  onImport: (options: ImportOptions, file: File) => Promise<void>;
  onClose: () => void;
  initialOptions?: ImportOptions;
}

export interface VoxelizeDialogProps {
  onVoxelize: (options: ImportOptions) => Promise<void>;
  onClose: () => void;
  initialOptions?: ImportOptions;
}

const DEFAULT_OPTIONS: ImportOptions = {
  scale: 1,
  resolution: 64,
  colorMode: "vertex",
  solidColor: "#808080",
};

const ModelImportDialog: React.FC<ModelImportDialogProps> = ({ onImport, onClose, initialOptions }) => {
  const [options, setOptions] = useState<ImportOptions>(initialOptions || { ...DEFAULT_OPTIONS });
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{ value: number; message: string }>({ value: 0, message: "" });
  const [error, setError] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback(() => {
    setError("");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gltf,.glb,.obj";
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        setSelectedFile(file);
      }
    };
    input.click();
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      setError("Please select a 3D model file first");
      return;
    }

    setIsImporting(true);
    setProgress({ value: 0, message: "Loading model..." });
    setError("");

    try {
      await onImport(options, selectedFile);
      setProgress({ value: 1, message: "Complete!" });
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setIsImporting(false);
    }
  }, [options, selectedFile, onImport, onClose]);

  const fileName = selectedFile?.name || "";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-bold text-text-bright">Import 3D Model</h3>
          <button
            onClick={onClose}
            className="blender-icon-btn p-1"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* File selection */}
          <div>
            <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-2">
              3D Model File
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleFileSelect}
                disabled={isImporting}
                className="flex-1 px-3 py-2 text-xs bg-accent-dim text-text rounded transition-colors disabled:opacity-50 hover:bg-accent-hover"
              >
                {fileName ? `Selected: ${fileName}` : "Choose File (.gltf, .glb, .obj)"}
              </button>
            </div>
            {fileName && (
              <p className="text-[10px] text-text-dim mt-1">
                Supports GLTF, GLB, and OBJ formats
              </p>
            )}
          </div>

          {/* Resolution */}
          <div>
            <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-2">
              Resolution: {options.resolution}
            </label>
            <input
              type="range"
              min={8}
              max={128}
              step={8}
              value={options.resolution}
              onChange={(e) => setOptions((prev) => ({ ...prev, resolution: parseInt(e.target.value) }))}
              className="w-full blender-slider"
              disabled={isImporting}
            />
            <div className="flex justify-between text-[9px] text-text-dim mt-1">
              <span>Low (8)</span>
              <span>High (128)</span>
            </div>
          </div>

          {/* Scale */}
          <div>
            <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-2">
              Scale: {options.scale.toFixed(1)}x
            </label>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={options.scale}
              onChange={(e) => setOptions((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
              className="w-full blender-slider"
              disabled={isImporting}
            />
            <div className="flex justify-between text-[9px] text-text-dim mt-1">
              <span>0.1x</span>
              <span>5x</span>
            </div>
          </div>

          {/* Color Mode */}
          <div>
            <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-2">
              Color Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setOptions((prev) => ({ ...prev, colorMode: "vertex" }))}
                className={`flex-1 px-3 py-2 text-xs rounded transition-colors border ${
                  options.colorMode === "vertex"
                    ? "bg-accent-dim text-text-bright border-accent"
                    : "bg-panel-hover text-text-dim border-border hover:text-text"
                }`}
                disabled={isImporting}
              >
                Vertex Colors
              </button>
              <button
                onClick={() => setOptions((prev) => ({ ...prev, colorMode: "solid" }))}
                className={`flex-1 px-3 py-2 text-xs rounded transition-colors border ${
                  options.colorMode === "solid"
                    ? "bg-accent-dim text-text-bright border-accent"
                    : "bg-panel-hover text-text-dim border-border hover:text-text"
                }`}
                disabled={isImporting}
              >
                Solid Color
              </button>
            </div>
          </div>

          {/* Solid Color Picker */}
          {options.colorMode === "solid" && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-text-dim">Color:</label>
              <input
                type="color"
                value={options.solidColor}
                onChange={(e) => setOptions((prev) => ({ ...prev, solidColor: e.target.value }))}
                className="w-10 h-8 rounded cursor-pointer border border-border bg-transparent"
                disabled={isImporting}
              />
              <span className="text-xs text-text-dim font-mono">{options.solidColor}</span>
            </div>
          )}

          {/* Progress */}
          {(isImporting || progress.value > 0) && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-text-dim">
                <span>{progress.message || "Processing..."}</span>
                <span>{Math.round(progress.value * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-surface rounded-sm overflow-hidden border border-border">
                <div
                  className="h-full bg-accent transition-all duration-200"
                  style={{ width: `${progress.value * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded text-xs text-danger">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-3 py-1.5 text-xs bg-panel-hover border border-border rounded text-text-dim hover:text-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="px-4 py-1.5 text-xs bg-accent-dim text-text rounded transition-colors disabled:opacity-50 hover:bg-accent-hover"
          >
            {isImporting ? "Loading..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
};

const VoxelizeDialog: React.FC<VoxelizeDialogProps> = ({ onVoxelize, onClose, initialOptions }) => {
  const [options, setOptions] = useState<ImportOptions>(initialOptions || { ...DEFAULT_OPTIONS });
  const [isVoxelizing, setIsVoxelizing] = useState(false);
  const [progress, setProgress] = useState<{ value: number; message: string }>({ value: 0, message: "" });
  const [error, setError] = useState<string>("");

  const handleVoxelize = useCallback(async () => {
    setIsVoxelizing(true);
    setProgress({ value: 0, message: "Voxelizing..." });
    setError("");

    try {
      await onVoxelize(options);
      setProgress({ value: 1, message: "Complete!" });
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voxelize failed");
      setIsVoxelizing(false);
    }
  }, [options, onVoxelize, onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-border rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-bold text-text-bright">Voxelize Model</h3>
          <button
            onClick={onClose}
            className="blender-icon-btn p-1"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Resolution */}
          <div>
            <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-2">
              Resolution: {options.resolution}
            </label>
            <input
              type="range"
              min={8}
              max={128}
              step={8}
              value={options.resolution}
              onChange={(e) => setOptions((prev) => ({ ...prev, resolution: parseInt(e.target.value) }))}
              className="w-full blender-slider"
              disabled={isVoxelizing}
            />
            <div className="flex justify-between text-[9px] text-text-dim mt-1">
              <span>Low (8)</span>
              <span>High (128)</span>
            </div>
          </div>

          {/* Scale */}
          <div>
            <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-2">
              Scale: {options.scale.toFixed(1)}x
            </label>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={options.scale}
              onChange={(e) => setOptions((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
              className="w-full blender-slider"
              disabled={isVoxelizing}
            />
            <div className="flex justify-between text-[9px] text-text-dim mt-1">
              <span>0.1x</span>
              <span>5x</span>
            </div>
          </div>

          {/* Color Mode */}
          <div>
            <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-2">
              Color Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setOptions((prev) => ({ ...prev, colorMode: "vertex" }))}
                className={`flex-1 px-3 py-2 text-xs rounded transition-colors border ${
                  options.colorMode === "vertex"
                    ? "bg-accent-dim text-text-bright border-accent"
                    : "bg-panel-hover text-text-dim border-border hover:text-text"
                }`}
                disabled={isVoxelizing}
              >
                Vertex Colors
              </button>
              <button
                onClick={() => setOptions((prev) => ({ ...prev, colorMode: "solid" }))}
                className={`flex-1 px-3 py-2 text-xs rounded transition-colors border ${
                  options.colorMode === "solid"
                    ? "bg-accent-dim text-text-bright border-accent"
                    : "bg-panel-hover text-text-dim border-border hover:text-text"
                }`}
                disabled={isVoxelizing}
              >
                Solid Color
              </button>
            </div>
          </div>

          {/* Solid Color Picker */}
          {options.colorMode === "solid" && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-text-dim">Color:</label>
              <input
                type="color"
                value={options.solidColor}
                onChange={(e) => setOptions((prev) => ({ ...prev, solidColor: e.target.value }))}
                className="w-10 h-8 rounded cursor-pointer border border-border bg-transparent"
                disabled={isVoxelizing}
              />
              <span className="text-xs text-text-dim font-mono">{options.solidColor}</span>
            </div>
          )}

          {/* Progress */}
          {(isVoxelizing || progress.value > 0) && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-text-dim">
                <span>{progress.message || "Processing..."}</span>
                <span>{Math.round(progress.value * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-surface rounded-sm overflow-hidden border border-border">
                <div
                  className="h-full bg-accent transition-all duration-200"
                  style={{ width: `${progress.value * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded text-xs text-danger">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isVoxelizing}
            className="px-3 py-1.5 text-xs bg-panel-hover border border-border rounded text-text-dim hover:text-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleVoxelize}
            disabled={isVoxelizing}
            className="px-4 py-1.5 text-xs bg-accent-dim text-text rounded transition-colors disabled:opacity-50 hover:bg-accent-hover"
          >
            {isVoxelizing ? "Voxelizing..." : "Voxelize"}
          </button>
        </div>
      </div>
    </div>
  );
};

export { VoxelizeDialog };
export default ModelImportDialog;
