import React, { useState, useEffect, useCallback } from 'react';
import { ColorPalette, loadPalettes, savePalettes, generateRandomPalette } from '../utils/paletteManager';

interface PaletteManagerProps {
  currentColors: string[];
  onLoadPalette: (colors: string[]) => void;
}

const PaletteManager: React.FC<PaletteManagerProps> = ({ currentColors, onLoadPalette }) => {
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState('');
  const [generateType, setGenerateType] = useState<'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochromatic' | 'random'>('triadic');
  const [generateCount, setGenerateCount] = useState(8);

  useEffect(() => {
    setPalettes(loadPalettes());
  }, []);

  const handleSavePalette = useCallback(() => {
    if (!newPaletteName.trim()) return;
    const newPalette: ColorPalette = {
      name: newPaletteName.trim(),
      colors: [...currentColors],
      createdAt: Date.now()
    };
    const updated = [...palettes, newPalette];
    setPalettes(updated);
    savePalettes(updated);
    setNewPaletteName('');
  }, [newPaletteName, currentColors, palettes]);

  const handleDeletePalette = useCallback((index: number) => {
    const updated = palettes.filter((_, i) => i !== index);
    setPalettes(updated);
    savePalettes(updated);
  }, [palettes]);

  const handleGeneratePalette = useCallback(() => {
    const colors = generateRandomPalette(generateType, generateCount);
    onLoadPalette(colors);
  }, [generateType, generateCount, onLoadPalette]);

  const handleLoadPalette = useCallback((palette: ColorPalette) => {
    onLoadPalette(palette.colors);
  }, [onLoadPalette]);

  if (!showManager) {
    return (
      <button
        onClick={() => setShowManager(true)}
        className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded"
        title="Manage Color Palettes"
      >
        Palettes
      </button>
    );
  }

  return (
    <div className="absolute top-0 right-0 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-3 z-50 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Color Palettes</h3>
        <button
          onClick={() => setShowManager(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <div className="bg-gray-700 p-2 rounded">
          <h4 className="text-xs font-semibold text-gray-300 mb-2">Save Current Palette</h4>
          <div className="flex gap-1">
            <input
              type="text"
              value={newPaletteName}
              onChange={(e) => setNewPaletteName(e.target.value)}
              placeholder="Palette name..."
              className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded border border-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSavePalette()}
            />
            <button
              onClick={handleSavePalette}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
            >
              Save
            </button>
          </div>
        </div>

        <div className="bg-gray-700 p-2 rounded">
          <h4 className="text-xs font-semibold text-gray-300 mb-2">Generate Random Palette</h4>
          <div className="space-y-2">
            <select
              value={generateType}
              onChange={(e) => setGenerateType(e.target.value as any)}
              className="w-full px-2 py-1 text-xs bg-gray-600 text-white rounded border border-gray-500"
            >
              <option value="triadic">Triadic</option>
              <option value="complementary">Complementary</option>
              <option value="analogous">Analogous</option>
              <option value="split-complementary">Split Complementary</option>
              <option value="monochromatic">Monochromatic</option>
              <option value="random">Random</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Colors:</label>
              <input
                type="range"
                min={4}
                max={16}
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                className="flex-1 h-1"
              />
              <span className="text-xs text-gray-300 w-4">{generateCount}</span>
            </div>
            <button
              onClick={handleGeneratePalette}
              className="w-full px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Generate & Apply
            </button>
          </div>
        </div>

        <div className="bg-gray-700 p-2 rounded">
          <h4 className="text-xs font-semibold text-gray-300 mb-2">Saved Palettes ({palettes.length})</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {palettes.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">No saved palettes</p>
            )}
            {palettes.map((palette, index) => (
              <div key={palette.createdAt} className="bg-gray-600 p-2 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white font-medium">{palette.name}</span>
                  <button
                    onClick={() => handleDeletePalette(index)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
                <div className="flex gap-0.5 mb-1">
                  {palette.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-sm border border-gray-500"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => handleLoadPalette(palette)}
                  className="w-full px-2 py-0.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaletteManager;
