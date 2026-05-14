import { BrushContext, PixelChange, registerBrush } from "./brushSystem";

const blurBrush = {
  tool: "blur" as const,
  name: "Blur",
  cursor: "crosshair",
  getChanges: (ctx: BrushContext) => {
    const { canvasState, brush } = ctx;
    const radius = Math.max(1, Math.floor(brush.size / 2));
    const w = canvasState.width;
    const h = canvasState.height;
    const strength = brush.blurStrength ?? 0.5;

    const to3D = ctx.to3D ?? ((px: number, py: number) => ({ x: px, y: py, z: 0 } as const));

    const layerPixels = new Map<string, string>();
    for (const [key, color] of canvasState.pixels) {
      const parts = key.split(",");
      const kx = parseInt(parts[0]), ky = parseInt(parts[1]), kz = parseInt(parts[2]);
      if (isNaN(kx) || isNaN(ky) || isNaN(kz)) continue;
      const transformed = to3D(kx, ky) ?? { x: kx, y: ky, z: 0 };
      if (transformed.x === kx && transformed.y === ky) {
        layerPixels.set(key, color);
      }
    }

    if (layerPixels.size === 0) return [];

    const parseColor = (hex: string | undefined): [number, number, number, number] => {
      if (!hex || hex.length < 7) return [0, 0, 0, 0];
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 0;
      const b = parseInt(hex.slice(5, 7), 16) || 0;
      const a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
      return [r, g, b, a];
    };

    const toHex = (r: number, g: number, b: number, a: number): string =>
      `#${[r, g, b, a]
        .map((v) =>
          Math.max(0, Math.min(255, Math.round(v)))
            .toString(16)
            .padStart(2, "0")
        )
        .join("")}`;

    type RGBA = [number, number, number, number];
    const grid: RGBA[][] = Array.from({ length: h }, () => Array.from({ length: w }, () => [0, 0, 0, 0] as RGBA));
    for (const [key, color] of layerPixels) {
      const parts = key.split(",");
      const gx = parseInt(parts[0]),
        gy = parseInt(parts[1]);
      if (gx >= 0 && gx < w && gy >= 0 && gy < h) {
        grid[gy][gx] = parseColor(color) as RGBA;
      }
    }

    const changes: PixelChange[] = [];
    const extent = {
      x0: Math.max(0, ctx.x - radius),
      x1: Math.min(w - 1, ctx.x + radius),
      y0: Math.max(0, ctx.y - radius),
      y1: Math.min(h - 1, ctx.y + radius)
    };

    const passes = Math.max(1, Math.ceil(strength * 3));

    for (let pass = 0; pass < passes; pass++) {
      for (let py = extent.y0; py <= extent.y1; py++) {
        for (let px = extent.x0; px <= extent.x1; px++) {
          const transformed = to3D(px, py) ?? { x: px, y: py, z: 0 };
          const tx = transformed.x;
          const ty = transformed.y;

          const orig = grid[ty]?.[tx];
          if (!orig || orig[3] === 0) continue;
          const [oR, oG, oB, oA] = orig;

          let rSum = 0,
            gSum = 0,
            bSum = 0,
            aSum = 0,
            count = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = tx + dx,
                ny = ty + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
              const cell = grid[ny]?.[nx];
              if (!cell || cell[3] === 0) continue;

              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= radius) {
                rSum += cell[0];
                gSum += cell[1];
                bSum += cell[2];
                aSum += cell[3];
                count++;
              }
            }
          }

          if (count === 0) continue;

          const avgR = rSum / count,
            avgG = gSum / count,
            avgB = bSum / count,
            avgA = aSum / count;

          const passStrength = strength / passes;
          const fR = oR + (avgR - oR) * passStrength;
          const fG = oG + (avgG - oG) * passStrength;
          const fB = oB + (avgB - oB) * passStrength;
          const fA = oA + (avgA - oA) * passStrength;

          grid[ty][tx] = [fR, fG, fB, fA];
        }
      }
    }

    for (let py = extent.y0; py <= extent.y1; py++) {
      for (let px = extent.x0; px <= extent.x1; px++) {
        const transformed = to3D(px, py) ?? { x: px, y: py, z: 0 };
        const tx = transformed.x;
        const ty = transformed.y;

        const cell = grid[ty]?.[tx];
        if (!cell || cell[3] === 0) continue;

        const origKey = `${tx},${ty},${transformed.z}`;
        const origHex = layerPixels.get(origKey);
        const newHex = toHex(cell[0], cell[1], cell[2], cell[3]);

        if (origHex && newHex !== origHex) {
          changes.push({ x: tx, y: ty, z: transformed.z, color: newHex });
        }
      }
    }

    return changes;
  },
  preview: (ctx: BrushContext) => ({ x: ctx.x, y: ctx.y, size: ctx.brush.size })
};

registerBrush(blurBrush);
