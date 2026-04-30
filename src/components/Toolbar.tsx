import React from 'react';
import { BrushState, BrushTool } from '../types/voxel';
import { getAllBrushes, BrushHandler } from '../utils/brushSystem';

interface ToolbarProps {
  brush: BrushState;
  onBrushChange: (brush: BrushState) => void;
  onCanvasResize: (width: number, height: number) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ brush, onBrushChange, onCanvasResize }) => {
  const tools: BrushHandler[] = getAllBrushes();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Brush Tool</label>
        <div className="flex gap-1 flex-wrap">
          {tools.map(tool => (
            <button
              key={tool.tool}
              onClick={() => onBrushChange({ ...brush, tool: tool.tool })}
              className={`px-3 py-2 md:py-1 rounded text-sm min-h-[44px] md:min-h-0 ${
                brush.tool === tool.tool
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={tool.name}
            >
              {tool.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Color</label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="color"
            value={brush.color.slice(0, 7)}
            onChange={(e) => onBrushChange({ ...brush, color: e.target.value })}
            className="w-12 h-12 md:w-10 md:h-10 rounded cursor-pointer border-0"
          />
          <span className="text-xs text-gray-400 font-mono">{brush.color}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(brush.palette || []).map(color => (
            <button
              key={color}
              onClick={() => onBrushChange({ ...brush, color })}
              className={`w-10 h-10 md:w-8 md:h-8 rounded border-2 min-h-[44px] md:min-h-0 ${
                brush.color === color ? 'border-cyan-400' : 'border-gray-600'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">Brush Size: {brush.size}</label>
        <input
          type="range"
          min={1}
          max={8}
          value={brush.size}
          onChange={(e) => onBrushChange({ ...brush, size: parseInt(e.target.value) })}
          className="w-full h-3 md:h-2"
        />
      </div>

      <div className="mt-4">
        <label className="text-sm text-gray-400 mb-1 block">Canvas Size</label>
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
  const sizes = [8, 16, 32, 64, 128];
  return (
    <div className="flex flex-wrap gap-1">
      {sizes.map(size => (
        <button
          key={size}
          onClick={() => onCanvasResize(size, size)}
          className={`px-3 py-2 md:py-1 rounded text-xs min-h-[44px] md:min-h-0 ${
            brush.size === size
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {size}×{size}
        </button>
      ))}
    </div>
  );
};

export default Toolbar;
