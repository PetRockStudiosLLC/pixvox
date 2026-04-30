import { CanvasState, BrushState, BrushTool } from '../types/voxel';
import { getPixel, getPixelKey, setPixel } from './canvasBuffer';
import { BrushHandler, BrushContext, registerBrush, applyPixel } from './brushSystem';

export function getPointPixels(
  state: CanvasState,
  x: number,
  y: number,
  brush: BrushState
): [number, number, number, string][] {
  const z = state.activeLayer;
  // If eraser, return transparent color
  const color = brush.tool === 'eraser' ? '#00000000' : brush.color;
  const pixels: [number, number, number, string][] = [];
  
  // Apply brush size - paint exactly size x size pixels
  // For odd sizes (1,3), center on (x,y)
  // For even sizes (2,4), (x,y) is the top-left of the brush
  const size = brush.size;
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px >= 0 && px < state.width && py >= 0 && py < state.height) {
        pixels.push([px, py, z, color]);
      }
    }
  }
  
  return pixels;
}

export function getLinePixels(
  state: CanvasState,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  brush: BrushState
): [number, number, number, string][] {
  const z = state.activeLayer;
  const color = brush.tool === 'eraser' ? '#00000000' : brush.color;
  const pixels: [number, number, number, string][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0;
  let cy = y0;
  while (true) {
    // Apply brush size - paint exactly size x size pixels
    const size = brush.size;
    for (let dyOffset = 0; dyOffset < size; dyOffset++) {
      for (let dxOffset = 0; dxOffset < size; dxOffset++) {
        const px = cx + dxOffset;
        const py = cy + dyOffset;
        if (px >= 0 && px < state.width && py >= 0 && py < state.height) {
          pixels.push([px, py, z, color]);
        }
      }
    }
    
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return pixels;
}

export function getBucketFillPixels(
  state: CanvasState,
  startX: number,
  startY: number,
  brush: BrushState
): [number, number, number, string][] {
  const z = state.activeLayer;
  const targetColor = getPixel(state, startX, startY, z);
  const fillColor = brush.tool === 'eraser' ? '#00000000' : brush.color;

  if (targetColor === fillColor) return [];

  const pixels: [number, number, number, string][] = [];
  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = getPixelKey(x, y, z);

    if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue;
    if (visited.has(key)) continue;
    if (getPixel(state, x, y, z) !== targetColor) continue;

    visited.add(key);
    
    // Apply brush size to each pixel in bucket fill
    const radius = Math.floor(brush.size / 2);
    for (let dyOffset = -radius; dyOffset <= radius; dyOffset++) {
      for (let dxOffset = -radius; dxOffset <= radius; dxOffset++) {
        const px = x + dxOffset;
        const py = y + dyOffset;
        if (px >= 0 && px < state.width && py >= 0 && py < state.height) {
          const pixelKey = getPixelKey(px, py, z);
          if (!visited.has(pixelKey) && getPixel(state, px, py, z) === targetColor) {
            pixels.push([px, py, z, fillColor]);
            stack.push([px, py]);
          }
        }
      }
    }
  }
  return pixels;
}

export function applyLineBrush(
  state: CanvasState,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  brush: BrushState
): void {
  const z = state.activeLayer;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0;
  let cy = y0;
  while (true) {
    setPixel(state, cx, cy, z, brush.color);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
}

// Register built-in brushes with the modular system
const pointBrushHandler: BrushHandler = {
  tool: 'point',
  name: 'Point',
  cursor: 'crosshair',
  apply: (ctx: BrushContext) => {
    const color = ctx.brush.tool === 'eraser' ? '#00000000' : ctx.brush.color;
    applyPixel(ctx, ctx.x, ctx.y, color);
  }
};

const lineBrushHandler: BrushHandler = {
  tool: 'line',
  name: 'Line',
  cursor: 'crosshair',
  apply: (ctx: BrushContext) => {
    // Line drawing is handled in canvas component with lastPixel
  }
};

const bucketBrushHandler: BrushHandler = {
  tool: 'bucket',
  name: 'Fill',
  cursor: 'crosshair',
  apply: (ctx: BrushContext) => {
    const { canvasState, x, y, brush, onPixelChange } = ctx;
    const z = canvasState.activeLayer;
    const targetColor = canvasState.pixels.get(`${x},${y},${z}`) || '#00000000';
    const fillColor = brush.tool === 'eraser' ? '#00000000' : brush.color;

    if (targetColor === fillColor) return;

    const stack: [number, number][] = [[x, y]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = `${cx},${cy},${z}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const currentColor = canvasState.pixels.get(key) || '#00000000';
      if (currentColor !== targetColor) continue;

      onPixelChange(cx, cy, z, fillColor);

      const neighbors = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
      for (const [nx, ny] of neighbors) {
        if (
          nx >= 0 && nx < canvasState.width &&
          ny >= 0 && ny < canvasState.height &&
          !visited.has(`${nx},${ny},${z}`)
        ) {
          stack.push([nx, ny]);
        }
      }
    }
  }
};

const eraserBrushHandler: BrushHandler = {
  tool: 'eraser',
  name: 'Eraser',
  cursor: 'crosshair',
  apply: (ctx: BrushContext) => {
    applyPixel(ctx, ctx.x, ctx.y, '#00000000');
  }
};

// Register all brushes
registerBrush(pointBrushHandler);
registerBrush(lineBrushHandler);
registerBrush(bucketBrushHandler);
registerBrush(eraserBrushHandler);

export function applyBucketFill(
  state: CanvasState,
  startX: number,
  startY: number,
  brush: BrushState
): void {
  const z = state.activeLayer;
  const targetColor = getPixel(state, startX, startY, z);
  const fillColor = brush.color;

  if (targetColor === fillColor) return;

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = getPixelKey(x, y, z);

    if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue;
    if (visited.has(key)) continue;
    if (getPixel(state, x, y, z) !== targetColor) continue;

    visited.add(key);
    setPixel(state, x, y, z, fillColor);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

export function getCanvasImageData(state: CanvasState, z: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = state.width;
  canvas.height = state.height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(state.width, state.height);

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const color = getPixel(state, x, y, z);
      const idx = (y * state.width + x) * 4;
      if (color === '#00000000' || color.endsWith('00')) {
        imageData.data[idx] = 0;
        imageData.data[idx + 1] = 0;
        imageData.data[idx + 2] = 0;
        imageData.data[idx + 3] = 0;
      } else {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const a = color.length > 7 ? parseInt(color.slice(7, 9), 16) : 255;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = a;
      }
    }
  }

  return imageData;
}
