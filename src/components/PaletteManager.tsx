import React, { useState, useEffect, useCallback } from 'react';
import { ColorPalette, loadPalettes, savePalettes, generateRandomPalette } from '../utils/paletteManager';
import { IconPlus, IconClose, IconSave } from './Icons';

interface PaletteManagerProps {
  currentColors: string[];
  onLoadPalette: (colors: string[]) => void;
}

const PaletteManager: React.FC<PaletteManagerProps> = ({ currentColors, onLoadPalette }) => {
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
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

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-panel border border-border rounded-sm p-3 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-dim">Save Current</h4>
        <div className="flex gap-1">
          <input
            type="text"
            value={newPaletteName}
            onChange={(e) => setNewPaletteName(e.target.value)}
            placeholder="Name..."
            className="flex-1 px-2 py-1.5 bg-surface text-text rounded-sm border border-border-light focus:border-accent outline-none transition-colors text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleSavePalette()}
          />
          <button
            onClick={handleSavePalette}
            className="px-3 py-1.5 bg-success/20 text-success border border-success/30 rounded-sm font-medium text-xs hover:bg-success/30 transition-colors"
          >
            <IconSave size={12} />
          </button>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-sm p-3 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-dim">Auto-Generate</h4>
        <div className="space-y-2">
          <select
            value={generateType}
            onChange={(e) => setGenerateType(e.target.value as 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochromatic' | 'random')}
            className="w-full px-2 py-1.5 bg-surface text-text rounded-sm border border-border-light outline-none appearance-none text-xs"
          >
            <option value="triadic">Triadic</option>
            <option value="complementary">Complementary</option>
            <option value="analogous">Analogous</option>
            <option value="split-complementary">Split Complementary</option>
            <option value="monochromatic">Monochromatic</option>
            <option value="random">Random</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-dim">Colors</span>
            <input
              type="range"
              min={4}
              max={16}
              value={generateCount}
              onChange={(e) => setGenerateCount(parseInt(e.target.value))}
              className="flex-1 blender-slider"
            />
            <span className="text-[10px] text-accent w-4 text-center font-mono">{generateCount}</span>
          </div>
          <button
            onClick={handleGeneratePalette}
            className="w-full py-1.5 bg-accent-dim text-text-bright rounded-sm font-medium text-xs hover:bg-accent transition-colors"
          >
            Generate & Apply
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-dim px-1">
          Saved Palettes ({palettes.length})
        </h4>
        <div className="space-y-1">
          {palettes.length === 0 && (
            <div className="bg-panel border border-dashed border-border-light p-4 rounded-sm text-center">
              <p className="text-text-dim text-xs">No saved palettes yet</p>
            </div>
          )}
          {palettes.map((palette, index) => (
            <div key={palette.createdAt} className="bg-panel border border-border rounded-sm p-2 flex items-center gap-2 group">
              <div className="flex-1 min-w-0" onClick={() => handleLoadPalette(palette)}>
                <span className="block text-xs font-medium text-text truncate">{palette.name}</span>
                <div className="flex gap-0.5 mt-1">
                  {palette.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleLoadPalette(palette)}
                  className="w-7 h-7 flex items-center justify-center bg-accent-dim/30 text-accent rounded-sm"
                  title="Load"
                >
                  <IconPlus size={10} />
                </button>
                <button
                  onClick={() => handleDeletePalette(index)}
                  className="w-7 h-7 flex items-center justify-center bg-danger/20 text-danger rounded-sm"
                  title="Delete"
                >
                  <IconClose size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaletteManager;
