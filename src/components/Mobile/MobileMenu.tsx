import React, { useState, useCallback } from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // Project actions
  onSave: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onClear: () => void;
  onImportImage: () => void;
  // Export actions
  onExportPNG: () => void;
  onExportSpriteSheet: () => void;
  onExportGIF: () => void;
  onExportGLTF: () => void;
  onExportAnimationJSON: () => void;
  onExportAlembicABC: (compress: 'delta' | 'snapshot') => void;
  onExportFrameSequence: () => void;
  onImportAnimation: (format: 'json' | 'abc') => void;
  // Canvas actions
  onCanvasResize: (width: number, height: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  canvasLayers: number;
  voxelCount: number;
  // Voxel mode
  voxelMode: 'fast-draft' | 'final-bake';
  onVoxelModeChange: (mode: 'fast-draft' | 'final-bake') => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveProject,
  onLoadProject,
  onClear,
  onImportImage,
  onExportPNG,
  onExportSpriteSheet,
  onExportGIF,
  onExportGLTF,
  onExportAnimationJSON,
  onExportAlembicABC,
  onExportFrameSequence,
  onImportAnimation,
  onCanvasResize,
  canvasWidth,
  canvasHeight,
  canvasLayers,
  voxelCount,
  voxelMode,
  onVoxelModeChange,
}) => {
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [showImportSubmenu, setShowImportSubmenu] = useState(false);
  const [newWidth, setNewWidth] = useState(canvasWidth);
  const [newHeight, setNewHeight] = useState(canvasHeight);

  const handleResize = useCallback(() => {
    onCanvasResize(Math.max(8, Math.min(128, newWidth)), Math.max(8, Math.min(128, newHeight)));
    setShowResizeDialog(false);
    onClose();
  }, [newWidth, newHeight, onCanvasResize, onClose]);

  const handleClear = useCallback(() => {
    onClear();
    onClose();
  }, [onClear, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Full-screen menu panel */}
      <div className="absolute inset-0 bg-surface overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-panel-header border-b border-border px-4 py-3 flex items-center justify-between z-10 safe-pt">
          <h2 className="text-base font-bold text-accent uppercase tracking-wider">Menu</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-panel-hover active:bg-panel-active text-text-dim touch-target-min"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Menu Content */}
        <div className="p-4 space-y-4 pb-32">
          {/* Project Section */}
          <MenuSection title="Project">
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              }
              label="Save to Device"
              subtitle="Download .p2v.json file"
              onPress={onSaveProject}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
              label="Load Project"
              subtitle="Import .p2v.json file"
              onPress={onLoadProject}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              }
              label="Import Image"
              subtitle="Place image on active layer"
              onPress={onImportImage}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              }
              label="Clear Canvas"
              subtitle="Remove all voxels"
              onPress={handleClear}
              danger
            />
          </MenuSection>

          {/* Export Section */}
          <MenuSection title="Export">
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              }
              label="PNG Image"
              subtitle="Export current frame as PNG"
              onPress={onExportPNG}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              }
              label="Sprite Sheet"
              subtitle="All frames as grid PNG"
              onPress={onExportSpriteSheet}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              }
              label="Animated GIF"
              subtitle="Export animation as GIF"
              onPress={onExportGIF}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              }
              label="3D Model"
              subtitle="Export as GLTF"
              onPress={onExportGLTF}
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              label="Animation"
              subtitle="JSON, Alembic, or Frame Sequence"
              onPress={() => setShowExportSubmenu(true)}
              hasArrow
            />
          </MenuSection>

          {/* Import Animation Section */}
          <MenuSection title="Import Animation">
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
              label="Import Animation"
              subtitle="JSON or Alembic ABC"
              onPress={() => setShowImportSubmenu(true)}
              hasArrow
            />
          </MenuSection>

          {/* Canvas Settings Section */}
          <MenuSection title="Canvas Settings">
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              }
              label="Resize Canvas"
              subtitle={`${canvasWidth}×${canvasHeight} × ${canvasLayers} layers`}
              onPress={() => setShowResizeDialog(true)}
              hasArrow
            />
            <MenuItem
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              }
              label="Voxel Mode"
              subtitle={voxelMode === 'fast-draft' ? 'Fast Draft' : 'Final Bake'}
              onPress={() => onVoxelModeChange(voxelMode === 'fast-draft' ? 'final-bake' : 'fast-draft')}
            />
          </MenuSection>

          {/* Info Section */}
          <MenuSection title="Info">
            <div className="bg-panel rounded-lg p-3 space-y-2 border border-border">
              <InfoRow label="Canvas Size" value={`${canvasWidth} × ${canvasHeight}`} />
              <InfoRow label="Layers" value={String(canvasLayers)} />
              <InfoRow label="Voxel Count" value={voxelCount.toLocaleString()} />
              <InfoRow label="Voxel Mode" value={voxelMode === 'fast-draft' ? 'Fast Draft' : 'Final Bake'} />
            </div>
          </MenuSection>
        </div>
      </div>

      {/* Resize Dialog */}
      {showResizeDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowResizeDialog(false)} />
          <div className="relative bg-panel rounded-xl border border-border p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-text">Resize Canvas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-dim uppercase mb-1 block">Width</label>
                <input
                  type="number"
                  min={8}
                  max={128}
                  value={newWidth}
                  onChange={(e) => setNewWidth(parseInt(e.target.value) || 32)}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono text-text focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-dim uppercase mb-1 block">Height</label>
                <input
                  type="number"
                  min={8}
                  max={128}
                  value={newHeight}
                  onChange={(e) => setNewHeight(parseInt(e.target.value) || 32)}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono text-text focus:border-accent outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResizeDialog(false)}
                className="flex-1 py-3 rounded-lg bg-panel-hover active:bg-panel-active text-text-dim font-bold text-sm touch-target-min"
              >
                Cancel
              </button>
              <button
                onClick={handleResize}
                className="flex-1 py-3 rounded-lg bg-accent active:bg-accent-hover text-white font-bold text-sm touch-target-min"
              >
                Resize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Submenu */}
      {showExportSubmenu && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowExportSubmenu(false)} />
          <div className="relative bg-panel rounded-t-2xl border-t border-border w-full max-w-md p-4 space-y-2 animate-slide-up safe-pb">
            <div className="w-10 h-1 bg-panel-hover rounded-full mx-auto mb-4" />
            <h3 className="text-base font-bold text-text mb-3">Export Animation</h3>
            <button
              onClick={() => { onExportAnimationJSON(); setShowExportSubmenu(false); onClose(); }}
              className="w-full py-4 px-4 bg-panel-hover active:bg-panel-active rounded-lg text-left text-sm font-bold text-text touch-target-min"
            >
              Animation JSON
            </button>
            <button
              onClick={() => { onExportAlembicABC('delta'); setShowExportSubmenu(false); onClose(); }}
              className="w-full py-4 px-4 bg-panel-hover active:bg-panel-active rounded-lg text-left text-sm font-bold text-text touch-target-min"
            >
              Alembic ABC (Delta)
            </button>
            <button
              onClick={() => { onExportAlembicABC('snapshot'); setShowExportSubmenu(false); onClose(); }}
              className="w-full py-4 px-4 bg-panel-hover active:bg-panel-active rounded-lg text-left text-sm font-bold text-text touch-target-min"
            >
              Alembic ABC (Snapshot)
            </button>
            <button
              onClick={() => { onExportFrameSequence(); setShowExportSubmenu(false); onClose(); }}
              className="w-full py-4 px-4 bg-panel-hover active:bg-panel-active rounded-lg text-left text-sm font-bold text-text touch-target-min"
            >
              Frame Sequence GLTF
            </button>
            <button
              onClick={() => setShowExportSubmenu(false)}
              className="w-full py-4 bg-transparent text-text-dim font-bold text-sm touch-target-min"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import Submenu */}
      {showImportSubmenu && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowImportSubmenu(false)} />
          <div className="relative bg-panel rounded-t-2xl border-t border-border w-full max-w-md p-4 space-y-2 animate-slide-up safe-pb">
            <div className="w-10 h-1 bg-panel-hover rounded-full mx-auto mb-4" />
            <h3 className="text-base font-bold text-text mb-3">Import Animation</h3>
            <button
              onClick={() => { onImportAnimation('json'); setShowImportSubmenu(false); onClose(); }}
              className="w-full py-4 px-4 bg-panel-hover active:bg-panel-active rounded-lg text-left text-sm font-bold text-text touch-target-min"
            >
              Animation JSON
            </button>
            <button
              onClick={() => { onImportAnimation('abc'); setShowImportSubmenu(false); onClose(); }}
              className="w-full py-4 px-4 bg-panel-hover active:bg-panel-active rounded-lg text-left text-sm font-bold text-text touch-target-min"
            >
              Alembic ABC
            </button>
            <button
              onClick={() => setShowImportSubmenu(false)}
              className="w-full py-4 bg-transparent text-text-dim font-bold text-sm touch-target-min"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* Sub-components */

interface MenuSectionProps {
  title: string;
  children: React.ReactNode;
}

const MenuSection: React.FC<MenuSectionProps> = ({ title, children }) => (
  <section>
    <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2 px-1">{title}</h3>
    <div className="bg-panel rounded-lg border border-border overflow-hidden">
      {children}
    </div>
  </section>
);

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  hasArrow?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, subtitle, onPress, danger, hasArrow }) => (
  <button
    onClick={onPress}
    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-panel-active touch-target-min border-b border-border last:border-b-0 ${
      danger ? 'text-danger' : 'text-text'
    }`}
  >
    <span className={`flex-shrink-0 ${danger ? 'text-danger' : 'text-text-dim'}`}>{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="text-sm font-semibold block">{label}</span>
      {subtitle && <span className="text-[10px] text-text-dim block truncate">{subtitle}</span>}
    </span>
    {hasArrow && (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim flex-shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    )}
  </button>
);

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-text-dim">{label}</span>
    <span className="font-mono text-text">{value}</span>
  </div>
);

export default MobileMenu;
