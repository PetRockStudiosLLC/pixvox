import React, { useMemo } from 'react';
import { CanvasState } from '../types/voxel';

interface LayerThumbnailProps {
  layerIndex: number;
  canvasState: CanvasState;
  width: number;
  height: number;
}

const LayerThumbnail: React.FC<LayerThumbnailProps> = ({ layerIndex, canvasState, width, height }) => {
  const thumbnailDataUrl = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const cellSize = 4;
    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        ctx.fillStyle = (x / cellSize + y / cellSize) % 2 === 0 ? '#2d2d2d' : '#252525';
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    const scaleX = canvasState.width / width;
    const scaleY = canvasState.height / height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const key = `${srcX},${srcY},${layerIndex}`;
        const color = canvasState.pixels.get(key);
        if (color && color !== '#00000000') {
          ctx.fillStyle = color.slice(0, 7);
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    return canvas.toDataURL();
  }, [layerIndex, canvasState, width, height]);

  return (
    <div className="w-8 h-8 rounded-sm border border-border-light overflow-hidden bg-panel flex-shrink-0">
      {thumbnailDataUrl && (
        <img src={thumbnailDataUrl} alt={`Layer ${layerIndex + 1}`} className="w-full h-full object-cover" />
      )}
    </div>
  );
};

export default LayerThumbnail;
