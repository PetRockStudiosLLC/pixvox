import React from 'react';
import { BrushState, BrushTool } from '../types/voxel';
import { getAllBrushes, BrushHandler } from '../utils/brushSystem';

interface ToolbarProps {
  brush: BrushState;
  onBrushChange: (brush: BrushState) => void;
  onCanvasResize: (width: number, height: number) => void;
  compact?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ brush, onBrushChange, onCanvasResize, compact = false }) => {
  const tools: BrushHandler[] = getAllBrushes();

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
          {tools.map(tool => (
            <button
              key={tool.tool}
              onClick={() => onBrushChange({ ...brush, tool: tool.tool })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                brush.tool === tool.tool
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105'
                  : 'bg-gray-700/50 text-gray-400'
              }`}
            >
              {tool.name}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-gray-700 mx-1" />
        <input
          type="color"
          value={brush.color.slice(0, 7)}
          onChange={(e) => onBrushChange({ ...brush, color: e.target.value })}
          className="w-10 h-10 rounded-xl cursor-pointer border-2 border-gray-600 bg-transparent shrink-0"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Brush Tool</label>
        <div className="grid grid-cols-2 gap-2">
          {tools.map(tool => (
            <button
              key={tool.tool}
              onClick={() => onBrushChange({ ...brush, tool: tool.tool })}
              className={`px-3 py-3 rounded-xl text-sm font-bold transition-all ${
                brush.tool === tool.tool
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/40'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              }`}
              title={tool.name}
            >
              {tool.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Color & Size</label>
        <div className="bg-gray-900/50 p-3 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brush.color.slice(0, 7)}
              onChange={(e) => onBrushChange({ ...brush, color: e.target.value })}
              className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-600 bg-transparent"
            />
            <div className="flex-1 min-w-0">
               <span className="block text-[10px] font-mono text-gray-500 mb-1">{brush.color.toUpperCase()}</span>
               <input
                type="range"
                min={1}
                max={8}
                value={brush.size}
                onChange={(e) => onBrushChange({ ...brush, size: parseInt(e.target.value) })}
                className="w-full accent-cyan-500 h-1.5"
              />
            </div>
            <span className="w-6 text-center font-bold text-cyan-400">{brush.size}</span>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {(brush.palette || []).map(color => (
              <button
                key={color}
                onClick={() => onBrushChange({ ...brush, color })}
                className={`aspect-square rounded-lg border-2 transition-all ${
                  brush.color === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Canvas Size</label>
        <CanvasSizeSelector brush={brush} onCanvasResize={onCanvasResize} />
      </div>
    </div>
  );
};

interface CanvasSizeSelectorProps {
  brush: BrushState;
  onCanvasResize: (width: number, height: number) => void;
}

const CanvasSizeSelector: React.FC<CanvasSizeSelectorProps> = ({ brush, onCanvasResize }) => {
  const sizes = [16, 32, 64];
  return (
    <div className="grid grid-cols-3 gap-2">
      {sizes.map(size => (
        <button
          key={size}
          onClick={() => onCanvasResize(size, size)}
          className="py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-black transition-all active:scale-95"
        >
          {size}²
        </button>
      ))}
    </div>
  );
};

export default Toolbar;
