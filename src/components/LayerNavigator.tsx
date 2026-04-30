import React from 'react';

interface LayerNavigatorProps {
  layers: number;
  activeLayer: number;
  onLayerChange: (layer: number) => void;
  onAddLayer: () => void;
  onDuplicateLayer: () => void;
  onMoveLayerUp: () => void;
  onMoveLayerDown: () => void;
  onImportImage: () => void;
}

const LayerNavigator: React.FC<LayerNavigatorProps> = ({ layers, activeLayer, onLayerChange, onAddLayer, onDuplicateLayer, onMoveLayerUp, onMoveLayerDown, onImportImage }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onLayerChange(Math.max(0, activeLayer - 1))}
          disabled={activeLayer === 0}
          className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 text-sm"
        >
          ◀
        </button>
        <input
          type="range"
          min={0}
          max={layers - 1}
          value={activeLayer}
          onChange={(e) => onLayerChange(parseInt(e.target.value))}
          className="w-48 accent-cyan-500"
        />
        <button
          onClick={() => onLayerChange(Math.min(layers - 1, activeLayer + 1))}
          disabled={activeLayer === layers - 1}
          className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 text-sm"
        >
          ▶
        </button>
        <span className="text-sm text-gray-300 min-w-[60px]">
          {activeLayer + 1}/{layers}
        </span>
      </div>
      
      <div className="flex gap-1">
        <button
          onClick={onAddLayer}
          className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
        >
          Add Layer
        </button>
        <button
          onClick={onDuplicateLayer}
          className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
        >
          Duplicate
        </button>
      </div>
      
      <div className="flex gap-1">
        <button
          onClick={onMoveLayerUp}
          className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
        >
          Move Up
        </button>
        <button
          onClick={onMoveLayerDown}
          className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
        >
          Move Down
        </button>
      </div>
      
      <button
        onClick={onImportImage}
        className="w-full px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
      >
        Import Image
      </button>
    </div>
  );
};

export default LayerNavigator;
