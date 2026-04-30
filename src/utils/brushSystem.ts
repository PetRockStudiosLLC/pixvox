import { CanvasState, BrushState, BrushTool } from '../types/voxel';

export interface BrushContext {
  canvasState: CanvasState;
  brush: BrushState;
  x: number;
  y: number;
  lastX?: number;
  lastY?: number;
  onPixelChange: (x: number, y: number, z: number, color: string) => void;
  to3D?: (cx: number, cy: number) => { x: number; y: number; z: number } | null;
}

export interface BrushHandler {
  tool: BrushTool;
  name: string;
  cursor: string;
  apply: (ctx: BrushContext) => void;
  preview?: (ctx: BrushContext) => { x: number; y: number; size: number } | null;
}

const brushRegistry: Map<string, BrushHandler> = new Map();

export function registerBrush(handler: BrushHandler): void {
  brushRegistry.set(handler.tool, handler);
}

export function getBrush(tool: BrushTool): BrushHandler | undefined {
  return brushRegistry.get(tool);
}

export function getAllBrushes(): BrushHandler[] {
  return Array.from(brushRegistry.values());
}

// Helper to apply pixels
export function applyPixel(
  ctx: BrushContext,
  px: number,
  py: number,
  color: string
): void {
  const { canvasState, brush, onPixelChange } = ctx;
  const z = canvasState.activeLayer;

  for (let dy = 0; dy < brush.size; dy++) {
    for (let dx = 0; dx < brush.size; dx++) {
      const targetX = px + dx;
      const targetY = py + dy;

      let coords: { x: number; y: number; z: number } | null = null;
      if (ctx.to3D) {
        coords = ctx.to3D(targetX, targetY);
      } else {
        coords = { x: targetX, y: targetY, z };
      }

      if (coords && coords.x >= 0 && coords.x < canvasState.width &&
          coords.y >= 0 && coords.y < canvasState.height &&
          coords.z >= 0 && coords.z < canvasState.layers) {
        onPixelChange(coords.x, coords.y, coords.z, color);
      }
    }
  }
}

// Point brush
const pointBrush: BrushHandler = {
  tool: 'point',
  name: 'Point',
  cursor: 'crosshair',
  apply: (ctx) => {
    const color = ctx.brush.tool === 'eraser' ? '#00000000' : ctx.brush.color;
    applyPixel(ctx, ctx.x, ctx.y, color);
  },
  preview: (ctx) => ({ x: ctx.x, y: ctx.y, size: ctx.brush.size }),
};

// Line brush (Bresenham's algorithm)
const lineBrush: BrushHandler = {
  tool: 'line',
  name: 'Line',
  cursor: 'crosshair',
  apply: (ctx) => {
    if (ctx.lastX === undefined || ctx.lastY === undefined) return;
    const color = ctx.brush.tool === 'eraser' ? '#00000000' : ctx.brush.color;
    const { canvasState, brush, onPixelChange } = ctx;
    const z = canvasState.activeLayer;

    const x0 = ctx.lastX, y0 = ctx.lastY;
    const x1 = ctx.x, y1 = ctx.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0, cy = y0;
    while (true) {
      // Apply brush size at this point
      for (let ddy = 0; ddy < brush.size; ddy++) {
        for (let ddx = 0; ddx < brush.size; ddx++) {
          const px = cx + ddx;
          const py = cy + ddy;
          let coords: { x: number; y: number; z: number } | null = null;
          if (ctx.to3D) {
            coords = ctx.to3D(px, py);
          } else {
            coords = { x: px, y: py, z };
          }
          if (coords && coords.x >= 0 && coords.x < canvasState.width &&
              coords.y >= 0 && coords.y < canvasState.height &&
              coords.z >= 0 && coords.z < canvasState.layers) {
            onPixelChange(coords.x, coords.y, coords.z, color);
          }
        }
      }
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
  },
};

// Bucket fill brush (flood fill)
const bucketBrush: BrushHandler = {
  tool: 'bucket',
  name: 'Fill',
  cursor: 'crosshair',
  apply: (ctx) => {
    const { canvasState, brush, x, y, onPixelChange } = ctx;
    const z = canvasState.activeLayer;
    const targetKey = `${x},${y},${z}`;
    const targetColor = canvasState.pixels.get(targetKey) || '#00000000';
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

      // Apply fill color
      let coords: { x: number; y: number; z: number } | null = null;
      if (ctx.to3D) {
        coords = ctx.to3D(cx, cy);
      } else {
        coords = { x: cx, y: cy, z };
      }
      if (coords) {
        onPixelChange(coords.x, coords.y, coords.z, fillColor);
      }

      // Check 4-connected neighbors
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
  },
};

// Eraser brush
const eraserBrush: BrushHandler = {
  tool: 'eraser',
  name: 'Eraser',
  cursor: 'crosshair',
  apply: (ctx) => {
    applyPixel(ctx, ctx.x, ctx.y, '#00000000');
  },
  preview: (ctx) => ({ x: ctx.x, y: ctx.y, size: ctx.brush.size }),
};

// Register the 4 original brushes
registerBrush(pointBrush);
registerBrush(lineBrush);
registerBrush(bucketBrush);
registerBrush(eraserBrush);
