import { BrushContext, PixelChange, registerBrush } from "./brushSystem";

function collectBlockCoords(ctx: BrushContext, px: number, py: number, size: number): Array<{ x: number; y: number; z: number }> {
  const { canvasState } = ctx;
  const coords: Array<{ x: number; y: number; z: number }> = [];
  const half = Math.floor(size / 2);
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const targetX = px + dx - half;
      const targetY = py + dy - half;
      const result = ctx.to3D
        ? (ctx.to3D(targetX, targetY) ?? { x: targetX, y: targetY, z: 0 })
        : { x: targetX, y: targetY, z: 0 };
      if (result.x >= 0 && result.x < canvasState.width && result.y >= 0 && result.y < canvasState.height) {
        coords.push(result);
      }
    }
  }
  return coords;
}

const pointBrush = {
  tool: "point" as const,
  name: "Point",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    const color = ctx.brush.tool === "eraser" ? "#00000000" : ctx.brush.color;
    const { canvasState, brush } = ctx;
    const coords = collectBlockCoords(ctx, ctx.x, ctx.y, brush.size);
    return coords.map(({ x, y, z }) => ({ x, y, z, color }));
  },
  preview: (ctx: BrushContext) => ({ x: ctx.x, y: ctx.y, size: ctx.brush.size })
};

const lineBrush = {
  tool: "line" as const,
  name: "Line",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    if (ctx.lastX === undefined || ctx.lastY === undefined) return [];
    const color = ctx.brush.tool === "eraser" ? "#00000000" : ctx.brush.color;
    const { canvasState, brush } = ctx;

    const x0 = ctx.lastX,
      y0 = ctx.lastY;
    const x1 = ctx.x,
      y1 = ctx.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    const changes: PixelChange[] = [];
    let cx = x0,
      cy = y0;
    while (true) {
      const coords = collectBlockCoords(ctx, cx, cy, brush.size);
      for (const { x, y, z } of coords) {
        changes.push({ x, y, z, color });
      }
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
    return changes;
  }
};

const bucketBrush = {
  tool: "bucket" as const,
  name: "Fill",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    const { canvasState, brush } = ctx;
    const fillColor = brush.tool === "eraser" ? "#00000000" : brush.color;
    const to3D = ctx.to3D ?? ((cx: number, cy: number) => ({ x: cx, y: cy, z: 0 } as const));

    const worldPos = to3D(ctx.x, ctx.y) ?? { x: ctx.x, y: ctx.y, z: 0 };
    const targetKey = `${worldPos.x},${worldPos.y},${worldPos.z}`;
    const targetColor = canvasState.pixels.get(targetKey) ?? "#00000000";

    if (targetColor === fillColor) return [];

    const radius = Math.max(1, Math.floor(brush.size / 2));
    const stack: [number, number][] = [[ctx.x, ctx.y]];
    const visited = new Set<string>();
    const changes: PixelChange[] = [];

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const k = `${cx},${cy}`;

      if (visited.has(k)) continue;
      visited.add(k);

      const transformed = to3D(cx, cy) ?? { x: cx, y: cy, z: 0 };
      const key = `${transformed.x},${transformed.y},${transformed.z}`;
      const currentColor = canvasState.pixels.get(key) ?? "#00000000";
      if (currentColor !== targetColor) continue;

      changes.push({ x: transformed.x, y: transformed.y, z: transformed.z, color: fillColor });

      const neighbors: [number, number][] = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (
          nx < -radius || nx > canvasState.width + radius ||
          ny < -radius || ny > canvasState.height + radius
        ) continue;
        const nKey = `${nx},${ny}`;
        if (visited.has(nKey)) continue;
        const nTransformed = to3D(nx, ny) ?? { x: nx, y: ny, z: 0 };
        const nColor = canvasState.pixels.get(`${nTransformed.x},${nTransformed.y},${nTransformed.z}`) ?? "#00000000";
        if (nColor === targetColor) {
          stack.push([nx, ny]);
        }
      }
    }
    return changes;
  }
};

const eraserBrush = {
  tool: "eraser" as const,
  name: "Eraser",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    const { canvasState, brush } = ctx;
    const coords = collectBlockCoords(ctx, ctx.x, ctx.y, brush.size);
    return coords.map(({ x, y, z }) => ({ x, y, z, color: "#00000000" }));
  },
  preview: (ctx: BrushContext) => ({ x: ctx.x, y: ctx.y, size: ctx.brush.size })
};

const circleBrush = {
  tool: "circle" as const,
  name: "Circle",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    const color = ctx.brush.tool === "eraser" ? "#00000000" : ctx.brush.color;
    const { canvasState } = ctx;
    const radius = Math.max(1, ctx.brush.size);

    const changes: PixelChange[] = [];
    let ddx = radius;
    let ddy = 0;
    let decision = 1 - radius;

    const to3D = ctx.to3D ?? ((px: number, py: number) => ({ x: px, y: py, z: 0 } as const));

    const plot = (px: number, py: number) => {
      const transformed = to3D(px, py) ?? { x: px, y: py, z: 0 };
      if (transformed.x >= 0 && transformed.x < canvasState.width && transformed.y >= 0 && transformed.y < canvasState.height) {
        changes.push({ x: transformed.x, y: transformed.y, z: transformed.z, color });
      }
    };

    while (ddy <= ddx) {
      plot(ctx.x + ddx, ctx.y + ddy);
      plot(ctx.x - ddx, ctx.y + ddy);
      plot(ctx.x + ddx, ctx.y - ddy);
      plot(ctx.x - ddx, ctx.y - ddy);
      plot(ctx.x + ddy, ctx.y + ddx);
      plot(ctx.x - ddy, ctx.y + ddx);
      plot(ctx.x + ddy, ctx.y - ddx);
      plot(ctx.x - ddy, ctx.y - ddx);
      ddy++;
      if (decision <= 0) {
        decision += 2 * ddy + 1;
      } else {
        ddx--;
        decision += 2 * (ddy - ddx) + 1;
      }
    }
    return changes;
  },
  preview: (ctx: BrushContext) => ({
    x: ctx.x - ctx.brush.size,
    y: ctx.y - ctx.brush.size,
    size: ctx.brush.size * 2 + 1
  })
};

const filledCircleBrush = {
  tool: "filled-circle" as const,
  name: "Filled Circle",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    const color = ctx.brush.tool === "eraser" ? "#00000000" : ctx.brush.color;
    const { canvasState } = ctx;
    const radius = Math.max(1, ctx.brush.size);
    const rSquared = radius * radius;

    const changes: PixelChange[] = [];
    const to3D = ctx.to3D ?? ((px: number, py: number) => ({ x: px, y: py, z: 0 } as const));

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > rSquared) continue;
        const sx = ctx.x + dx;
        const sy = ctx.y + dy;
        const transformed = to3D(sx, sy) ?? { x: sx, y: sy, z: 0 };
        if (transformed.x >= 0 && transformed.x < canvasState.width && transformed.y >= 0 && transformed.y < canvasState.height) {
          changes.push({ x: transformed.x, y: transformed.y, z: transformed.z, color });
        }
      }
    }
    return changes;
  },
  preview: (ctx: BrushContext) => ({
    x: ctx.x - ctx.brush.size,
    y: ctx.y - ctx.brush.size,
    size: ctx.brush.size * 2 + 1
  })
};

const sprayBrush = {
  tool: "spray" as const,
  name: "Spray",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    const color = ctx.brush.tool === "eraser" ? "#00000000" : ctx.brush.color;
    const { canvasState } = ctx;
    const radius = Math.max(1, Math.floor(ctx.brush.size / 2));
    const density = ctx.brush.density ?? 0.5;
    const sprayR = ctx.brush.sprayRadius ?? radius;
    const totalDots = Math.max(1, Math.floor(20 * density));

    const changes: PixelChange[] = [];
    for (let i = 0; i < totalDots; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * sprayR;
      const px = Math.round(ctx.x + r * Math.cos(angle));
      const py = Math.round(ctx.y + r * Math.sin(angle));
      const transformed = ctx.to3D ? (ctx.to3D(px, py) ?? { x: px, y: py, z: 0 }) : { x: px, y: py, z: 0 };
      const tx = transformed.x;
      const ty = transformed.y;
      if (tx >= 0 && tx < canvasState.width && ty >= 0 && ty < canvasState.height) {
        changes.push({ x: tx, y: ty, z: transformed.z, color });
      }
    }
    return changes;
  },
  preview: (ctx: BrushContext) => ({
    x: ctx.x,
    y: ctx.y,
    size: (ctx.brush.sprayRadius ?? Math.floor(ctx.brush.size / 2)) * 2
  })
};

const patternBrush = {
  tool: "pattern" as const,
  name: "Pattern",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    const { canvasState, brush } = ctx;
    const pattern = brush.pattern;
    if (!pattern || pattern.length === 0) {
      const coords = collectBlockCoords(ctx, ctx.x, ctx.y, brush.size);
      return coords.map(({ x, y, z }) => ({ x, y, z, color: brush.color }));
    }

    const changes: PixelChange[] = [];
    const rows = pattern.length;
    const cols = pattern[0]?.length ?? 0;

    for (let py = 0; py < rows; py++) {
      for (let px = 0; px < cols; px++) {
        const color = pattern[py][px];
        if (!color || color === "#00000000" || color === "#000000") continue;
        const sx = ctx.x + px - Math.floor(cols / 2);
        const sy = ctx.y + py - Math.floor(rows / 2);
        if (sx >= 0 && sx < canvasState.width && sy >= 0 && sy < canvasState.height) {
          const transformed = ctx.to3D ? (ctx.to3D(sx, sy) ?? { x: sx, y: sy, z: 0 }) : { x: sx, y: sy, z: 0 };
          changes.push({ x: transformed.x, y: transformed.y, z: transformed.z, color });
        }
      }
    }
    return changes;
  },
  preview: (ctx: BrushContext) => {
    const pattern = ctx.brush.pattern;
    if (!pattern || pattern.length === 0) return { x: ctx.x, y: ctx.y, size: ctx.brush.size };
    return {
      x: ctx.x - Math.floor(pattern[0].length / 2),
      y: ctx.y - Math.floor(pattern.length / 2),
      size: Math.max(pattern.length, pattern[0].length)
    };
  }
};

registerBrush(pointBrush);
registerBrush(lineBrush);
registerBrush(bucketBrush);
registerBrush(eraserBrush);
registerBrush(circleBrush);
registerBrush(filledCircleBrush);
registerBrush(sprayBrush);
registerBrush(patternBrush);
