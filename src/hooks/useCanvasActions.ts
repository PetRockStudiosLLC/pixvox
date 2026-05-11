import { useCallback } from 'react';
import { CanvasState, TimelineState } from '../types/voxel';
import type { ToastType } from '../components/Toast';
import { createCanvasState } from '../utils/canvasBuffer';

export function useCanvasActions(
  canvasState: CanvasState,
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>,
  setLoadingState: (state: { isLoading: boolean; message?: string }) => void,
  onToast: (msg: string, type?: ToastType) => void,
  saveToHistory: (state: CanvasState) => void
) {
  const handleClear = useCallback(() => {
    onToast('Canvas cleared', 'warning');
    setCanvasState(prev => {
      const next = { ...prev, pixels: new Map() };
      saveToHistory(next);
      return next;
    });
  }, [setCanvasState, onToast, saveToHistory]);

  const handleCanvasResize = useCallback((width: number, height: number) => {
    setCanvasState(prev => {
      const newState = createCanvasState(width, height, prev.layers);
      prev.pixels.forEach((color, key) => {
        const [xStr, yStr, zStr] = key.split(',').map(Number);
        if (xStr < width && yStr < height && zStr < prev.layers) {
          newState.pixels.set(key, color);
        }
      });
      saveToHistory(newState);
      return newState;
    });
    onToast(`Canvas resized to ${width}x${height}`, 'info');
  }, [setCanvasState, onToast, saveToHistory]);

  const handleAddLayer = useCallback(() => {
    setCanvasState(prev => {
      const newLayers = prev.layers + 1;
      const newState = createCanvasState(prev.width, prev.height, newLayers);
      prev.pixels.forEach((color, key) => newState.pixels.set(key, color));
      newState.layerInfo = [...prev.layerInfo, { name: `Layer ${newLayers}`, visible: true, locked: false, opacity: 100 }];
      newState.activeLayer = newLayers - 1;
      saveToHistory(newState);
      return newState;
    });
    onToast('Layer added', 'success');
  }, [setCanvasState, onToast, saveToHistory]);

  const handleDuplicateLayer = useCallback(() => {
    setCanvasState(prev => {
      const newLayers = prev.layers + 1;
      const newState = createCanvasState(prev.width, prev.height, newLayers);
      prev.pixels.forEach((color, key) => newState.pixels.set(key, color));
      const sourceInfo = prev.layerInfo[prev.activeLayer];
      newState.layerInfo = [...prev.layerInfo, { ...sourceInfo, name: `${sourceInfo.name} (copy)` }];
      const activeZ = prev.activeLayer;
      const newZ = prev.layers;
      prev.pixels.forEach((color, key) => {
        const [xStr, yStr, zStr] = key.split(',');
        if (parseInt(zStr) === activeZ) {
          newState.pixels.set(`${xStr},${yStr},${newZ}`, color);
        }
      });
      newState.activeLayer = newLayers - 1;
      saveToHistory(newState);
      return newState;
    });
    onToast('Layer duplicated', 'success');
  }, [setCanvasState, onToast, saveToHistory]);

  const handleMoveLayer = useCallback((direction: -1 | 1) => {
    setCanvasState(prev => {
      if (direction === -1 && prev.activeLayer === 0) return prev;
      if (direction === 1 && prev.activeLayer === prev.layers - 1) return prev;
      const newLayerInfo = [...prev.layerInfo];
      const sourceInfo = newLayerInfo[prev.activeLayer];
      const destInfo = newLayerInfo[prev.activeLayer + direction];
      newLayerInfo[prev.activeLayer] = destInfo;
      newLayerInfo[prev.activeLayer + direction] = sourceInfo;
      const newState = { ...prev, pixels: new Map(prev.pixels), layerInfo: newLayerInfo };
      const sourceZ = prev.activeLayer;
      const destZ = prev.activeLayer + direction;
      const sourcePixels = Array.from(prev.pixels.entries()).filter(([key]) => {
        const [, , zStr] = key.split(',');
        return parseInt(zStr) === sourceZ;
      });
      const destPixels = Array.from(prev.pixels.entries()).filter(([key]) => {
        const [, , zStr] = key.split(',');
        return parseInt(zStr) === destZ;
      });
      sourcePixels.forEach(([key]) => newState.pixels.delete(key));
      destPixels.forEach(([key]) => newState.pixels.delete(key));
      sourcePixels.forEach(([key, color]) => {
        const [xStr, yStr] = key.split(',').slice(0, 2);
        newState.pixels.set(`${xStr},${yStr},${destZ}`, color);
      });
      destPixels.forEach(([key, color]) => {
        const [xStr, yStr] = key.split(',').slice(0, 2);
        newState.pixels.set(`${xStr},${yStr},${sourceZ}`, color);
      });
      newState.activeLayer = destZ;
      saveToHistory(newState);
      return newState;
    });
  }, [setCanvasState, saveToHistory]);

  const handleMoveLayerUp = useCallback(() => handleMoveLayer(-1), [handleMoveLayer]);
  const handleMoveLayerDown = useCallback(() => handleMoveLayer(1), [handleMoveLayer]);

  const handleImportImage = useCallback(async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      const filePromise = new Promise<File | null>((resolve) => {
        input.onchange = () => {
          if (input.files && input.files[0]) resolve(input.files[0]);
          else resolve(null);
        };
        input.click();
      });
      const file = await filePromise;
      if (!file) return;
      setLoadingState({ isLoading: true, message: 'Importing image...' });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      tempCanvas.width = canvasState.width;
      tempCanvas.height = canvasState.height;
      ctx.drawImage(image, 0, 0, canvasState.width, canvasState.height);
      const imageData = ctx.getImageData(0, 0, canvasState.width, canvasState.height);
      const data = imageData.data;
      let importedState: CanvasState | null = null;
      setCanvasState(prev => {
        const next = { ...prev, pixels: new Map(prev.pixels) };
        const z = prev.activeLayer;
        for (let y = 0; y < prev.height; y++) {
          for (let x = 0; x < prev.width; x++) {
            const key = `${x},${y},${z}`;
            next.pixels.delete(key);
          }
        }
        for (let y = 0; y < prev.height; y++) {
          for (let x = 0; x < prev.width; x++) {
            const i = (y * prev.width + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a === 0) continue;
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
            const key = `${x},${y},${z}`;
            next.pixels.set(key, hex);
          }
        }
        importedState = next;
        return next;
      });
      if (importedState) saveToHistory(importedState);
      URL.revokeObjectURL(image.src);
      setLoadingState({ isLoading: false });
      onToast('Image imported!', 'success');
    } catch (error) {
      console.error('Failed to import image:', error);
      setLoadingState({ isLoading: false });
      onToast('Import failed: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  }, [canvasState, setCanvasState, setLoadingState, onToast, saveToHistory]);

  return {
    handleClear, handleCanvasResize,
    handleAddLayer, handleDuplicateLayer,
    handleMoveLayerUp, handleMoveLayerDown,
    handleImportImage,
  };
}
