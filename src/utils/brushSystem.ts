import { CanvasState, BrushState, BrushTool } from '../types/voxel';

export interface PixelChange {
  x: number;
  y: number;
  color: string;
}

export interface BrushContext {
  canvasState: CanvasState;
  brush: BrushState;
  x: number;
  y: number;
  lastX?: number;
  lastY?: number;
  to3D?: (cx: number, cy: number) => { x: number; y: number; z: number } | null;
}

export interface BrushHandler {
  tool: BrushTool;
  name: string;
  cursor: string;
  getChanges: (ctx: BrushContext) => PixelChange[];
  preview?: (ctx: BrushContext) => { x: number; y: number; size: number } | null;
}

const brushRegistry = new Map<string, BrushHandler>();

export function registerBrush(handler: BrushHandler): void {
  brushRegistry.set(handler.tool, handler);
}

export function getBrush(tool: BrushTool): BrushHandler | undefined {
  return brushRegistry.get(tool);
}

export function getAllBrushes(): BrushHandler[] {
  return Array.from(brushRegistry.values());
}

// Helper: collect pixel coordinates for a brush size block
function collectBlockCoords(
  ctx: BrushContext,
  px: number,
  py: number,
  size: number,
  z: number
): Array<{ x: number; y: number }> {
  const { canvasState, brush } = ctx;
  const coords: Array<{ x: number; y: number }> = [];
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const targetX = px + dx;
      const targetY = py + dy;
      const { x, y } = ctx.to3D
        ? ctx.to3D(targetX, targetY) ?? { x: targetX, y: targetY }
        : { x: targetX, y: targetY };
      if (x >= 0 && x < canvasState.width && y >= 0 && y < canvasState.height) {
        coords.push({ x, y });
      }
    }
  }
  return coords;
}

// Helper: collect pixel coordinates at a single point
function collectPointCoords(
  ctx: BrushContext,
  px: number,
  py: number,
  z: number
): Array<{ x: number; y: number }> {
  const { canvasState } = ctx;
  const { x, y } = ctx.to3D
    ? ctx.to3D(px, py) ?? { x: px, y: py }
    : { x: px, y: py };
  if (x >= 0 && x < canvasState.width && y >= 0 && y < canvasState.height) {
    return [{ x, y }];
  }
  return [];
}

// Point brush
const pointBrush: BrushHandler = {
  tool: 'point',
  name: 'Point',
  cursor: 'crosshair',
  getChanges: (ctx) => {
    const color = ctx.brush.tool === 'eraser' ? '#00000000' : ctx.brush.color;
    const { canvasState, brush } = ctx;
    const z = canvasState.activeLayer;
    const coords = collectBlockCoords(ctx, ctx.x, ctx.y, brush.size, z);
    return coords.map(({ x, y }) => ({ x, y, color }));
  },
  preview: (ctx) => ({ x: ctx.x, y: ctx.y, size: ctx.brush.size }),
};

// Line brush (Bresenham's algorithm)
const lineBrush: BrushHandler = {
  tool: 'line',
  name: 'Line',
  cursor: 'crosshair',
  getChanges: (ctx) => {
    if (ctx.lastX === undefined || ctx.lastY === undefined) return [];
    const color = ctx.brush.tool === 'eraser' ? '#00000000' : ctx.brush.color;
    const { canvasState, brush } = ctx;
    const z = canvasState.activeLayer;

    const x0 = ctx.lastX, y0 = ctx.lastY;
    const x1 = ctx.x, y1 = ctx.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    const changes: PixelChange[] = [];
    let cx = x0, cy = y0;
    while (true) {
      const coords = collectBlockCoords(ctx, cx, cy, brush.size, z);
      for (const { x, y } of coords) {
        changes.push({ x, y, color });
      }
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
    return changes;
  },
};

// Bucket fill brush (flood fill)
const bucketBrush: BrushHandler = {
  tool: 'bucket',
  name: 'Fill',
  cursor: 'crosshair',
  getChanges: (ctx) => {
    const { canvasState, brush } = ctx;
    const z = canvasState.activeLayer;
    const targetKey = `${ctx.x},${ctx.y},${z}`;
    const targetColor = canvasState.pixels.get(targetKey) ?? '#00000000';
    const fillColor = brush.tool === 'eraser' ? '#00000000' : brush.color;

    if (targetColor === fillColor) return [];

    const stack: [number, number][] = [[ctx.x, ctx.y]];
    const visited = new Set<string>();
    const changes: PixelChange[] = [];

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = `${cx},${cy},${z}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const currentColor = canvasState.pixels.get(key) ?? '#00000000';
      if (currentColor !== targetColor) continue;

      changes.push({ x: cx, y: cy, color: fillColor });

      const neighbors: [number, number][] = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
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
    return changes;
  },
};

// Eraser brush
const eraserBrush: BrushHandler = {
  tool: 'eraser',
  name: 'Eraser',
  cursor: 'crosshair',
  getChanges: (ctx) => {
    const { canvasState, brush } = ctx;
    const z = canvasState.activeLayer;
    const coords = collectBlockCoords(ctx, ctx.x, ctx.y, brush.size, z);
    return coords.map(({ x, y }) => ({ x, y, color: '#00000000' }));
  },
  preview: (ctx) => ({ x: ctx.x, y: ctx.y, size: ctx.brush.size }),
};

// Circle brush (Bresenham circle outline)
const circleBrush: BrushHandler = {
  tool: 'circle',
  name: 'Circle',
  cursor: 'crosshair',
  getChanges: (ctx) => {
    const color = ctx.brush.tool === 'eraser' ? '#00000000' : ctx.brush.color;
    const { canvasState } = ctx;
    const z = canvasState.activeLayer;
    const radius = Math.max(1, ctx.brush.size);

    const changes: PixelChange[] = [];
    let dx = radius;
    let dy = 0;
    let decision = 1 - radius;

    const plot = (px: number, py: number) => {
      if (px >= 0 && px < canvasState.width && py >= 0 && py < canvasState.height) {
        changes.push({ x: px, y: py, color });
      }
    };

    while (dy <= dx) {
      plot(ctx.x + dx, ctx.y + dy); plot(ctx.x - dx, ctx.y + dy);
      plot(ctx.x + dx, ctx.y - dy); plot(ctx.x - dx, ctx.y - dy);
      plot(ctx.x + dy, ctx.y + dx); plot(ctx.x - dy, ctx.y + dx);
      plot(ctx.x + dy, ctx.y - dx); plot(ctx.x - dy, ctx.y - dx);
      dy++;
      if (decision <= 0) {
        decision += 2 * dy + 1;
      } else {
        dx--;
        decision += 2 * (dy - dx) + 1;
      }
    }
    return changes;
  },
  preview: (ctx) => ({ x: ctx.x - ctx.brush.size, y: ctx.y - ctx.brush.size, size: ctx.brush.size * 2 + 1 }),
};

// Filled circle brush
const filledCircleBrush: BrushHandler = {
  tool: 'filled-circle',
  name: 'Filled Circle',
  cursor: 'crosshair',
  getChanges: (ctx) => {
    const color = ctx.brush.tool === 'eraser' ? '#00000000' : ctx.brush.color;
    const { canvasState } = ctx;
    const z = canvasState.activeLayer;
    const radius = Math.max(1, ctx.brush.size);
    const rSquared = radius * radius;

    const changes: PixelChange[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > rSquared) continue;
        const sx = ctx.x + dx;
        const sy = ctx.y + dy;
        if (sx >= 0 && sx < canvasState.width && sy >= 0 && sy < canvasState.height) {
          changes.push({ x: sx, y: sy, color });
        }
      }
    }
    return changes;
  },
  preview: (ctx) => ({ x: ctx.x - ctx.brush.size, y: ctx.y - ctx.brush.size, size: ctx.brush.size * 2 + 1 }),
};

// Spray brush
const sprayBrush: BrushHandler = {
  tool: 'spray',
  name: 'Spray',
  cursor: 'crosshair',
  getChanges: (ctx) => {
    const color = ctx.brush.tool === 'eraser' ? '#00000000' : ctx.brush.color;
    const { canvasState } = ctx;
    const z = canvasState.activeLayer;
    const radius = Math.max(1, Math.floor(ctx.brush.size / 2));
    const density = ctx.brush.density ?? 0.5;
    const sprayR = ctx.brush.sprayRadius ?? radius;
    const totalDots = Math.floor(20 * density);

    const changes: PixelChange[] = [];
    for (let i = 0; i < totalDots; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * sprayR;
      const px = Math.round(ctx.x + r * Math.cos(angle));
      const py = Math.round(ctx.y + r * Math.sin(angle));
      if (px >= 0 && px < canvasState.width && py >= 0 && py < canvasState.height) {
        changes.push({ x: px, y: py, color });
      }
    }
    return changes;
  },
  preview: (ctx) => ({ x: ctx.x, y: ctx.y, size: (ctx.brush.sprayRadius ?? Math.floor(ctx.brush.size / 2)) * 2 }),
};

// Blur brush
const blurBrush: BrushHandler = {
  tool: 'blur',
  name: 'Blur',
  cursor: 'crosshair',
  getChanges: (ctx) => {
    const { canvasState, brush } = ctx;
    const z = canvasState.activeLayer;
    const radius = Math.max(1, Math.floor(brush.size / 4));
    const snapshot = new Map(canvasState.pixels);

    const changes: PixelChange[] = [];

    for (let py = ctx.y - radius; py <= ctx.y + radius; py++) {
      for (let px = ctx.x - radius; px <= ctx.x + radius; px++) {
        if (px < 0 || px >= canvasState.width || py < 0 || py >= canvasState.height) continue;

        let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx < 0 || nx >= canvasState.width || ny < 0 || ny >= canvasState.height) continue;

            const key = `${nx},${ny},${z}`;
            const pixelColor = snapshot.get(key);
            if (pixelColor && pixelColor.length >= 7) {
              const r = parseInt(pixelColor.slice(1, 3), 16) || 0;
              const g = parseInt(pixelColor.slice(3, 5), 16) || 0;
              const b = parseInt(pixelColor.slice(5, 7), 16) || 0;
              const a = pixelColor.length > 7 ? parseInt(pixelColor.slice(7, 9), 16) : 255;
              rSum += r; gSum += g; bSum += b; aSum += a;
              count++;
            }
          }
        }

        if (count > 0) {
          const avgR = Math.round(rSum / count);
          const avgG = Math.round(gSum / count);
          const avgB = Math.round(bSum / count);
          const avgA = Math.round(aSum / count);
          const avgColor = `#${[avgR, avgG, avgB, avgA].map(v => v.toString(16).padStart(2, '0')).join('')}`;
          changes.push({ x: px, y: py, color: avgColor });
        }
      }
    }
    return changes;
  },
  preview: (ctx) => ({ x: ctx.x, y: ctx.y, size: ctx.brush.size }),
};

// Dither brush — Bayer 4x4 ordered dithering
const ditherBrush: BrushHandler = {
  tool: 'dither',
  name: 'Dither',
  cursor: 'crosshair',
  getChanges: (ctx) => {
    const { canvasState, brush } = ctx;
    const z = canvasState.activeLayer;
    const radius = Math.max(1, brush.size);
    const targetColor = ctx.brush.tool === 'eraser' ? '#00000000' : ctx.brush.color;

    const bayer4x4 = [
      [ 0, 8, 2,10],
      [12, 4,14, 6],
      [ 3,11, 1, 9],
      [15, 7,13, 5],
    ];

    const hexToLuminance = (hex: string): number => {
      if (hex.length < 7) return 0;
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 0;
      const b = parseInt(hex.slice(5, 7), 16) || 0;
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    const changes: PixelChange[] = [];
    const targetLum = hexToLuminance(targetColor);

    for (let py = ctx.y - radius; py <= ctx.y + radius; py++) {
      for (let px = ctx.x - radius; px <= ctx.x + radius; px++) {
        if (px < 0 || px >= canvasState.width || py < 0 || py >= canvasState.height) continue;

        const dx = (px - ctx.x) / radius;
        const dy = (py - ctx.y) / radius;
        const dist2 = dx * dx + dy * dy;
        if (dist2 > 1) continue;

        const threshold = (bayer4x4[py & 3][px & 3] + 0.5) / 16;
        const factor = targetLum / 255;

        if (factor < threshold) {
          changes.push({ x: px, y: py, color: targetColor });
        }
      }
    }
    return changes;
  },
  preview: (ctx) => ({ x: ctx.x - ctx.brush.size, y: ctx.y - ctx.brush.size, size: ctx.brush.size * 2 + 1 }),
};

// Register all brushes
registerBrush(pointBrush);
registerBrush(lineBrush);
registerBrush(bucketBrush);
registerBrush(eraserBrush);
registerBrush(circleBrush);
registerBrush(filledCircleBrush);
registerBrush(sprayBrush);
registerBrush(blurBrush);
registerBrush(ditherBrush);
