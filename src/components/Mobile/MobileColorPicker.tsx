import React, { useState, useCallback } from "react";
import { BrushState } from "../../types/voxel";

interface MobileColorPickerProps {
  brush: BrushState;
  onBrushChange: (brush: BrushState) => void;
}

// Extended default palette with more colors for mobile
const EXTENDED_PALETTE = [
  // Reds
  "#ff0000ff",
  "#ff3333ff",
  "#ff6666ff",
  "#cc0000ff",
  // Oranges
  "#ff8800ff",
  "#ffaa00ff",
  "#ffcc00ff",
  "#ff6600ff",
  // Yellows
  "#ffff00ff",
  "#ffff66ff",
  "#ffff99ff",
  "#cccc00ff",
  // Greens
  "#00ff00ff",
  "#33ff33ff",
  "#66ff66ff",
  "#00cc00ff",
  // Cyans
  "#00ffff",
  "#33ffff",
  "#66ffff",
  "#00cccc",
  // Blues
  "#0000ffff",
  "#3333ffff",
  "#6666ffff",
  "#0000ccff",
  // Purples
  "#8800ffff",
  "#aa33ffff",
  "#cc66ffff",
  "#6600ccff",
  // Pinks
  "#ff4488ff",
  "#ff66aaff",
  "#ff88ccff",
  "#cc3366ff",
  // Browns
  "#884400ff",
  "#aa6633ff",
  "#cc8866ff",
  "#663300ff",
  // Grays
  "#888888ff",
  "#aaaaaaff",
  "#ccccccff",
  "#666666ff",
  // White/Black
  "#ffffffff",
  "#000000ff"
];

const MobileColorPicker: React.FC<MobileColorPickerProps> = ({ brush, onBrushChange }) => {
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  const handleColorSelect = useCallback(
    (color: string) => {
      if (!color || color === "#00000000") return;
      const currentPalette = brush.palette || [];
      const newPalette = currentPalette.includes(color) ? currentPalette : [...currentPalette, color];

      onBrushChange({ ...brush, palette: newPalette, color });

      // Add to recent colors
      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== color);
        return [color, ...filtered].slice(0, 8);
      });
    },
    [brush, onBrushChange]
  );

  return (
    <div className="space-y-4">
      {/* Current color display */}
      <div className="flex items-center gap-3">
        <div
          className="w-16 h-16 rounded-xl border-2 border-border-light shadow-inner"
          style={{ backgroundColor: brush.color }}
        />
        <div className="flex-1">
          <div className="text-xs text-text-dim font-mono uppercase">{brush.color}</div>
          <div className="text-[10px] text-text-dim mt-1">Current brush color</div>
        </div>
        <input
          type="color"
          value={brush.color.slice(0, 7)}
          onChange={(e) => handleColorSelect(e.target.value + "ff")}
          className="w-12 h-12 rounded-xl cursor-pointer border-2 border-border-light bg-transparent"
          aria-label="Pick custom color"
        />
      </div>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-dim mb-2">Recent</h4>
          <div className="flex gap-2">
            {recentColors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`w-10 h-10 rounded-lg transition-all border-2 ${
                  brush.color === color ? "border-white scale-110 shadow-lg" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Palette swatches */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-dim">Palette</h4>
          <button
            onClick={() => setShowFullPicker(!showFullPicker)}
            className="text-[10px] text-accent font-bold active:opacity-70"
          >
            {showFullPicker ? "Show Less" : "Show All"}
          </button>
        </div>

        <div className={`grid gap-2 ${showFullPicker ? "grid-cols-8" : "grid-cols-8"}`}>
          {(showFullPicker ? EXTENDED_PALETTE : EXTENDED_PALETTE.slice(0, 16)).map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={`aspect-square rounded-lg transition-all border-2 ${
                brush.color === color ? "border-white scale-110 shadow-lg z-10" : "border-transparent active:scale-95"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Palette colors from brush */}
      {brush.palette && brush.palette.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-dim mb-2">Active Palette</h4>
          <div className="flex flex-wrap gap-2">
            {brush.palette.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`w-10 h-10 rounded-lg transition-all border-2 ${
                  brush.color === color ? "border-white scale-110 shadow-lg" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select palette color ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileColorPicker;
