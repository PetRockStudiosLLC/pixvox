import React, { useState } from "react";
import { BrushState } from "../types/voxel";
import { getAllBrushes } from "../utils/brushes";
import { IconPoint, IconRect, IconLine, IconEraser, IconCollapse, IconExpand } from "./Icons";

const TOOL_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  point: IconPoint,
  rect: IconRect,
  line: IconLine,
  eraser: IconEraser
};

interface ToolPanelProps {
  brush: BrushState;
  onBrushChange: (brush: BrushState) => void;
  onCanvasResize: (width: number, height: number) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const ToolPanel: React.FC<ToolPanelProps> = ({ brush, onBrushChange, onCanvasResize, collapsed, onToggle }) => {
  const tools = getAllBrushes();
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({
    tool: true,
    brush: true,
    palette: true,
    canvas: false
  });

  const toggleSection = (key: string) => {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (collapsed) {
    return (
      <div className="w-10 bg-panel border-r border-border flex flex-col items-center py-2 gap-1 flex-shrink-0">
        {tools.map((tool) => {
          const IconComp = TOOL_ICONS[tool.tool] || IconPoint;
          return (
            <button
              key={tool.tool}
              onClick={() => onBrushChange({ ...brush, tool: tool.tool })}
              className={`p-1.5 rounded-sm transition-colors ${
                brush.tool === tool.tool
                  ? "bg-accent-dim text-text-bright"
                  : "text-text-dim hover:text-text hover:bg-panel-hover"
              }`}
              title={tool.name}
            >
              <IconComp size={16} />
            </button>
          );
        })}
        <div className="w-5 h-px bg-border-light my-1" />
        <input
          type="color"
          value={brush.color.slice(0, 7)}
          onChange={(e) => onBrushChange({ ...brush, color: e.target.value })}
          className="w-7 h-7 rounded-sm cursor-pointer border border-border-light bg-transparent"
          title="Color"
        />
        <div className="flex-1" />
        <button onClick={onToggle} className="blender-icon-btn p-1" title="Expand panel">
          <IconExpand size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 bg-panel border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">Tools</span>
        <button onClick={onToggle} className="blender-icon-btn p-0.5" title="Collapse panel">
          <IconCollapse size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <ToolSection title="Brush" open={sectionOpen.tool} onToggle={() => toggleSection("tool")}>
          <div className="grid grid-cols-2 gap-1">
            {tools.map((tool) => {
              const IconComp = TOOL_ICONS[tool.tool] || IconPoint;
              return (
                <button
                  key={tool.tool}
                  onClick={() => onBrushChange({ ...brush, tool: tool.tool })}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                    brush.tool === tool.tool
                      ? "bg-accent-dim text-text-bright"
                      : "text-text-dim hover:text-text hover:bg-panel-hover"
                  }`}
                >
                  <IconComp size={14} />
                  {tool.name}
                </button>
              );
            })}
          </div>
        </ToolSection>

        <ToolSection title="Brush Settings" open={sectionOpen.brush} onToggle={() => toggleSection("brush")}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brush.color.slice(0, 7)}
                onChange={(e) => onBrushChange({ ...brush, color: e.target.value })}
                className="w-8 h-8 rounded-sm cursor-pointer border border-border-light bg-transparent"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-text-dim">{brush.color.toUpperCase()}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-text-dim">Size</span>
                  <input
                    type="range"
                    min={1}
                    max={32}
                    value={brush.size}
                    onChange={(e) => onBrushChange({ ...brush, size: parseInt(e.target.value) })}
                    className="flex-1 blender-slider"
                  />
                  <span className="text-[10px] text-accent w-6 text-center">{brush.size}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-0.5 flex-wrap">
              {[1, 2, 4, 8, 16, 32].map((s) => (
                <button
                  key={s}
                  onClick={() => onBrushChange({ ...brush, size: s })}
                  className={`w-6 h-4 rounded text-[8px] font-mono leading-none transition-colors ${
                    brush.size === s
                      ? "bg-accent text-white"
                      : "bg-panel-hover text-text-dim hover:text-text"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {brush.tool === "blur" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-dim w-14">Strength</span>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={Math.round((brush.blurStrength ?? 0.5) * 100)}
                    onChange={(e) => onBrushChange({ ...brush, blurStrength: parseInt(e.target.value) / 100 })}
                    className="flex-1 blender-slider"
                  />
                  <span className="text-[10px] text-accent w-6 text-center">
                    {Math.round((brush.blurStrength ?? 0.5) * 100)}%
                  </span>
                </div>
              </>
            )}
            {brush.tool === "dither" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-dim w-14">Density</span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={Math.round((brush.ditherDensity ?? 0.5) * 100)}
                    onChange={(e) => onBrushChange({ ...brush, ditherDensity: parseInt(e.target.value) / 100 })}
                    className="flex-1 blender-slider"
                  />
                  <span className="text-[10px] text-accent w-6 text-center">
                    {Math.round((brush.ditherDensity ?? 0.5) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-dim w-14">Angle</span>
                  <input
                    type="range"
                    min={0}
                    max={45}
                    value={brush.ditherAngle ?? 0}
                    onChange={(e) => onBrushChange({ ...brush, ditherAngle: parseInt(e.target.value) })}
                    className="flex-1 blender-slider"
                  />
                  <span className="text-[10px] text-accent w-6 text-center">{brush.ditherAngle ?? 0}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-dim w-14">Pattern</span>
                  <select
                    value={brush.ditherPattern ?? "bayer4x4"}
                    onChange={(e) =>
                      onBrushChange({ ...brush, ditherPattern: e.target.value as BrushState["ditherPattern"] })
                    }
                    className="flex-1 bg-panel-hover border border-border-light rounded-sm text-[10px] text-text px-1 py-0.5 outline-none focus:border-accent"
                  >
                    <option value="bayer2x2">2×2</option>
                    <option value="bayer3x3">3×3</option>
                    <option value="bayer4x4">4×4</option>
                    <option value="bayer8x8">8×8</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </ToolSection>

        <ToolSection title="Palette" open={sectionOpen.palette} onToggle={() => toggleSection("palette")}>
          <div className="grid grid-cols-8 gap-0.5">
            {(brush.palette || []).map((color) => (
              <button
                key={color}
                onClick={() => onBrushChange({ ...brush, color })}
                className={`aspect-square rounded-sm transition-all ${
                  brush.color === color
                    ? "ring-1 ring-white ring-offset-1 ring-offset-panel scale-110"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </ToolSection>

        <ToolSection title="Canvas Size" open={sectionOpen.canvas} onToggle={() => toggleSection("canvas")}>
          <div className="grid grid-cols-3 gap-1">
            {[16, 32, 64].map((size) => (
              <button
                key={size}
                onClick={() => onCanvasResize(size, size)}
                className="py-1.5 bg-panel-hover hover:bg-panel-active text-text rounded-sm text-xs font-medium transition-colors"
              >
                {size}
              </button>
            ))}
          </div>
        </ToolSection>
      </div>
    </div>
  );
};

const ToolSection: React.FC<{ title: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({
  title,
  open,
  onToggle,
  children
}) => (
  <div className="mb-1">
    <button onClick={onToggle} className="blender-section-title w-full px-2 py-1 flex items-center gap-1">
      <span className={`transform transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
      <span>{title}</span>
    </button>
    {open && <div className="px-2 pb-2">{children}</div>}
  </div>
);

export default ToolPanel;
