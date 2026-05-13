import { BrushContext, PixelChange, registerBrush } from "./brushSystem";

const bayer2x2 = [
  [0, 2],
  [3, 1]
];

const bayer3x3 = [
  [0, 4, 2],
  [6, 1, 5],
  [3, 7, 0]
];

const bayer4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

const bayer8x8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];

const PATTERN_MAP: Record<string, { matrix: number[][]; scale: number }> = {
  bayer2x2: { matrix: bayer2x2, scale: 4 },
  bayer3x3: { matrix: bayer3x3, scale: 9 },
  bayer4x4: { matrix: bayer4x4, scale: 16 },
  bayer8x8: { matrix: bayer8x8, scale: 64 }
};

const ditherBrush = {
  tool: "dither" as const,
  name: "Dither",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    const { canvasState, brush } = ctx;
    const z = canvasState.activeLayer;
    const radius = Math.max(1, brush.size);
    const targetColor = ctx.brush.tool === "eraser" ? "#00000000" : ctx.brush.color;
    const density = brush.ditherDensity ?? 0.5;
    const angle = brush.ditherAngle ?? 0;
    const patternType = brush.ditherPattern ?? "bayer4x4";

    const { matrix, scale } = PATTERN_MAP[patternType] ?? PATTERN_MAP.bayer4x4;
    const matrixSize = matrix.length;

    const changes: PixelChange[] = [];

    const rad = (angle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    for (let py = ctx.y - radius; py <= ctx.y + radius; py++) {
      for (let px = ctx.x - radius; px <= ctx.x + radius; px++) {
        if (px < 0 || px >= canvasState.width || py < 0 || py >= canvasState.height) continue;

        const dx = (px - ctx.x) / radius;
        const dy = (py - ctx.y) / radius;
        const dist2 = dx * dx + dy * dy;
        if (dist2 > 1) continue;

        const rotatedX = Math.round(px * cosA - py * sinA);
        const rotatedY = Math.round(px * sinA + py * cosA);

        const mx = ((rotatedX % matrixSize) + matrixSize) % matrixSize;
        const my = ((rotatedY % matrixSize) + matrixSize) % matrixSize;

        const threshold = matrix[my][mx] / scale;

        if (density > threshold) {
          const key = `${px},${py},${z}`;
          const existing = canvasState.pixels.get(key);
          if (existing !== targetColor) {
            changes.push({ x: px, y: py, color: targetColor });
          }
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

registerBrush(ditherBrush);
