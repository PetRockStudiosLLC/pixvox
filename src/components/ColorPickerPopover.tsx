import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BrushState } from '../types/voxel';

interface ColorPickerPopoverProps {
  brush: BrushState;
  onBrushChange: (brush: BrushState) => void;
  onClose: () => void;
}

const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({ brush, onBrushChange, onClose }) => {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [value, setValue] = useState(100);
  const [alpha, setAlpha] = useState(100);
  const spectrumRef = useRef<HTMLDivElement>(null);

  // Convert HSV to Hex
  const hsvToHex = useCallback((h: number, s: number, v: number, a: number) => {
    s /= 100;
    v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    const aHex = Math.round(a * 2.55).toString(16).padStart(2, '0');

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${aHex}`;
  }, []);

  const handleApply = () => {
    const hex = hsvToHex(hue, saturation, value, alpha);
    onBrushChange({ ...brush, color: hex });
    onClose();
  };

  // Handle spectrum click
  const handleSpectrumClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setSaturation(Math.round(x * 100));
    setValue(Math.round((1 - y) * 100));
  };

  return (
    <div className="absolute z-50 bg-gray-800 rounded-2xl p-4 border border-gray-600 shadow-2xl w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-white">Color Picker</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>

      {/* Spectrum */}
      <div
        ref={spectrumRef}
        className="w-full h-32 rounded-lg mb-3 cursor-crosshair"
        style={{
          background: `linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`,
          position: 'relative',
        }}
        onClick={handleSpectrumClick}
      >
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, transparent, #000)',
        }} />
        <div
          className="absolute w-3 h-3 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${saturation}%`,
            top: `${100 - value}%`,
          }}
        />
      </div>

      {/* Hue slider */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 mb-1 block">Hue</label>
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={(e) => setHue(parseInt(e.target.value))}
          className="w-full accent-red-500"
          style={{
            background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          }}
        />
      </div>

      {/* Alpha slider */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 mb-1 block">Alpha</label>
        <input
          type="range"
          min="0"
          max="100"
          value={alpha}
          onChange={(e) => setAlpha(parseInt(e.target.value))}
          className="w-full accent-gray-500"
        />
      </div>

      {/* Current color preview */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-lg border-2 border-gray-600"
          style={{ backgroundColor: brush.color.slice(0, 7) }}
        />
        <div className="flex-1">
          <div className="text-xs text-gray-400">Current</div>
          <div className="text-sm font-mono text-white">{brush.color.toUpperCase()}</div>
        </div>
      </div>

      {/* Apply button */}
      <button
        onClick={handleApply}
        className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-bold text-sm transition-colors"
      >
        Apply Color
      </button>
    </div>
  );
};

export default ColorPickerPopover;
