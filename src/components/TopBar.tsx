import React, { useState, useRef, useEffect } from 'react';
import { IconSave, IconLoad, IconExport, IconUndo, IconRedo, IconTrash, IconGrid, IconCube, IconChevronDown } from './Icons';

interface TopBarProps {
  onNew: () => void;
  onSave: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onExportGLTF: () => void;
  onExportAnimatedGLTF: () => void;
  onExportPNG: () => void;
  onExportSpriteSheet: () => void;
  onExportGIF: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  renderMode: '2d' | '3d';
  onToggleRenderMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TopBar: React.FC<TopBarProps> = ({
  onNew, onSave, onSaveProject, onLoadProject, onExportGLTF, onExportAnimatedGLTF, onExportPNG,
  onExportSpriteSheet, onExportGIF, onClear,
  onUndo, onRedo, renderMode, onToggleRenderMode, canUndo, canRedo
}) => {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="h-8 bg-panel-header border-b border-border flex items-center px-2 gap-1 flex-shrink-0 select-none">
      <span className="text-accent font-bold text-xs tracking-wider mr-3">PIXVOX</span>

      <div ref={menuRef} className="relative">
        <button
          onClick={() => { setFileMenuOpen(!fileMenuOpen); setExportMenuOpen(false); }}
          className="blender-icon-btn text-xs gap-1 flex items-center px-2"
        >
          File <IconChevronDown size={10} />
        </button>
        {fileMenuOpen && (
          <div className="absolute top-full left-0 mt-0.5 bg-panel border border-border-light rounded-sm shadow-lg py-0.5 z-50 min-w-[140px]">
            <button onClick={() => { onNew(); setFileMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2">
              <span className="w-4">+</span> New
            </button>
            <button onClick={() => { onSave(); setFileMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2">
              <IconSave size={12} /> Save
            </button>
            <button onClick={() => { onSaveProject(); setFileMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2">
              <IconSave size={12} /> Save to File
            </button>
            <button onClick={() => { onLoadProject(); setFileMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2">
              <IconLoad size={12} /> Load
            </button>
            <div className="my-0.5 h-px bg-border" />
            <button onClick={() => { onClear(); setFileMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2 text-danger">
              <IconTrash size={12} /> Clear All
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setExportMenuOpen(!exportMenuOpen); setFileMenuOpen(false); }}
          className="blender-icon-btn text-xs gap-1 flex items-center px-2"
        >
          Export <IconChevronDown size={10} />
        </button>
        {exportMenuOpen && (
          <div className="absolute top-full left-0 mt-0.5 bg-panel border border-border-light rounded-sm shadow-lg py-0.5 z-50 min-w-[160px]">
            <div className="px-3 py-1 text-[10px] uppercase font-bold text-text-dim">Image</div>
            <button onClick={() => { onExportPNG(); setExportMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2">
              <IconExport size={12} /> PNG (Current Frame)
            </button>
            <button onClick={() => { onExportSpriteSheet(); setExportMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2">
              <IconExport size={12} /> Sprite Sheet
            </button>
            <button onClick={() => { onExportGIF(); setExportMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2">
              <IconExport size={12} /> Animated GIF
            </button>
            <div className="my-0.5 h-px bg-border" />
            <div className="px-3 py-1 text-[10px] uppercase font-bold text-text-dim">3D Model</div>
            <button onClick={() => { onExportGLTF(); setExportMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2">
              <IconExport size={12} /> GLTF (Static)
            </button>
            <button onClick={() => { onExportAnimatedGLTF(); setExportMenuOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-panel-hover flex items-center gap-2">
              <IconExport size={12} /> Animated GLTF
            </button>
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-border-light mx-1" />

      <button onClick={onUndo} disabled={!canUndo} className="blender-icon-btn" title="Undo (Ctrl+Z)">
        <IconUndo size={14} />
      </button>
      <button onClick={onRedo} disabled={!canRedo} className="blender-icon-btn" title="Redo (Ctrl+Y)">
        <IconRedo size={14} />
      </button>

      <div className="h-4 w-px bg-border-light mx-1" />

      <button
        onClick={onToggleRenderMode}
        className={`blender-icon-btn ${renderMode === '2d' ? 'blender-icon-btn-active' : ''}`}
        title="2D Canvas (Tab)"
      >
        <IconGrid size={14} />
      </button>
      <button
        onClick={onToggleRenderMode}
        className={`blender-icon-btn ${renderMode === '3d' ? 'blender-icon-btn-active' : ''}`}
        title="3D View (Tab)"
      >
        <IconCube size={14} />
      </button>
    </div>
  );
};

export default TopBar;
