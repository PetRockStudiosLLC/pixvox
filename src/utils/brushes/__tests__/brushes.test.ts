import { describe, it, expect } from "vitest";
import { CanvasState, BrushState } from "../../../types/voxel";
import { brushRegistry } from "../brushSystem";
import "../basicBrushes";

function createMockContext(
  canvasWidth: number,
  canvasHeight: number,
  brush: BrushState,
  canvasPixels: Map<string, string>
) {
  const canvasState: CanvasState = {
    width: canvasWidth,
    height: canvasHeight,
    layers: 1,
    activeLayer: 0,
    pixels: canvasPixels,
    voxelTypes: new Map(),
    layerInfo: [{ name: "Layer 1", visible: true, locked: false, opacity: 100 }],
  };

  return {
    canvasState,
    brush,
    to3D: (cx: number, cy: number) => ({ x: cx, y: cy, z: 0 }),
    x: 0,
    y: 0,
  };
}

describe("Bresenham Line Brush", () => {
  it("should draw a horizontal line", () => {
    const brush: BrushState = { tool: "line", color: "#FF0000", size: 1 };
    const ctx = createMockContext(10, 10, brush, new Map());

    const lineBrush = brushRegistry.get("line");
    expect(lineBrush).toBeDefined();

    const changes = lineBrush!.getChanges({
      ...ctx,
      x: 5,
      y: 5,
      lastX: 2,
      lastY: 5,
    });

    expect(changes.length).toBeGreaterThan(0);
    expect(changes.every((c) => c.y === 5)).toBe(true);
  });

  it("should draw a vertical line", () => {
    const brush: BrushState = { tool: "line", color: "#00FF00", size: 1 };
    const ctx = createMockContext(10, 10, brush, new Map());

    const lineBrush = brushRegistry.get("line");
    const changes = lineBrush!.getChanges({
      ...ctx,
      x: 5,
      y: 8,
      lastX: 5,
      lastY: 2,
    });

    expect(changes.length).toBeGreaterThan(0);
    expect(changes.every((c) => c.x === 5)).toBe(true);
  });

  it("should draw a diagonal line", () => {
    const brush: BrushState = { tool: "line", color: "#0000FF", size: 1 };
    const ctx = createMockContext(10, 10, brush, new Map());

    const lineBrush = brushRegistry.get("line");
    const changes = lineBrush!.getChanges({
      ...ctx,
      x: 7,
      y: 7,
      lastX: 4,
      lastY: 4,
    });

    expect(changes.length).toBeGreaterThan(0);
  });
});

describe("Flood Fill Bucket Brush", () => {
  it("should fill a single pixel area", () => {
    const brush: BrushState = { tool: "bucket", color: "#FFFF00", size: 1 };
    const pixels = new Map<string, string>([
      ["5,5,0", "#FFFFFF"],
      ["6,5,0", "#FFFFFF"],
      ["5,6,0", "#FFFFFF"],
      ["6,6,0", "#000000"],
    ]);
    const ctx = createMockContext(10, 10, brush, pixels);

    const bucketBrush = brushRegistry.get("bucket");
    const changes = bucketBrush!.getChanges({
      ...ctx,
      x: 5,
      y: 5,
    });

    expect(changes.length).toBe(3);
    expect(changes.every((c) => c.color === "#FFFF00")).toBe(true);
  });

  it("should not fill across different colors", () => {
    const brush: BrushState = { tool: "bucket", color: "#FF00FF", size: 1 };
    const pixels = new Map<string, string>([
      ["0,0,0", "#FFFFFF"],
      ["1,0,0", "#FFFFFF"],
      ["2,0,0", "#000000"],
      ["0,1,0", "#FFFFFF"],
    ]);
    const ctx = createMockContext(10, 10, brush, pixels);

    const bucketBrush = brushRegistry.get("bucket");
    const changes = bucketBrush!.getChanges({
      ...ctx,
      x: 0,
      y: 0,
    });

    expect(changes.length).toBe(3);
  });

  it("should return empty array when filling with same color", () => {
    const brush: BrushState = { tool: "bucket", color: "#FFFFFF", size: 1 };
    const pixels = new Map<string, string>([
      ["0,0,0", "#FFFFFF"],
      ["1,0,0", "#FFFFFF"],
    ]);
    const ctx = createMockContext(10, 10, brush, pixels);

    const bucketBrush = brushRegistry.get("bucket");
    const changes = bucketBrush!.getChanges({
      ...ctx,
      x: 0,
      y: 0,
    });

    expect(changes.length).toBe(0);
  });
});

describe("Point Brush", () => {
  it("should place a single point", () => {
    const brush: BrushState = { tool: "point", color: "#FF0000", size: 1 };
    const ctx = createMockContext(10, 10, brush, new Map());

    const pointBrush = brushRegistry.get("point");
    const changes = pointBrush!.getChanges({
      ...ctx,
      x: 5,
      y: 5,
    });

    expect(changes.length).toBe(1);
    expect(changes[0].x).toBe(5);
    expect(changes[0].y).toBe(5);
    expect(changes[0].color).toBe("#FF0000");
  });

  it("should respect brush size", () => {
    const brush: BrushState = { tool: "point", color: "#00FF00", size: 3 };
    const ctx = createMockContext(10, 10, brush, new Map());

    const pointBrush = brushRegistry.get("point");
    const changes = pointBrush!.getChanges({
      ...ctx,
      x: 5,
      y: 5,
    });

    expect(changes.length).toBe(9);
  });
});

describe("Eraser Brush", () => {
  it("should erase pixels with transparent color", () => {
    const brush: BrushState = { tool: "eraser", color: "#FF0000", size: 1 };
    const ctx = createMockContext(10, 10, brush, new Map());

    const eraserBrush = brushRegistry.get("eraser");
    const changes = eraserBrush!.getChanges({
      ...ctx,
      x: 5,
      y: 5,
    });

    expect(changes.length).toBe(1);
    expect(changes[0].color).toBe("#00000000");
  });
});

describe("Circle Brush", () => {
  it("should draw a circle outline", () => {
    const brush: BrushState = { tool: "circle", color: "#FF00FF", size: 3 };
    const ctx = createMockContext(20, 20, brush, new Map());

    const circleBrush = brushRegistry.get("circle");
    const changes = circleBrush!.getChanges({
      ...ctx,
      x: 10,
      y: 10,
    });

    expect(changes.length).toBeGreaterThan(0);
  });
});

describe("Filled Circle Brush", () => {
  it("should fill a circle", () => {
    const brush: BrushState = { tool: "filled-circle", color: "#FFFF00", size: 3 };
    const ctx = createMockContext(20, 20, brush, new Map());

    const filledCircleBrush = brushRegistry.get("filled-circle");
    const changes = filledCircleBrush!.getChanges({
      ...ctx,
      x: 10,
      y: 10,
    });

    expect(changes.length).toBeGreaterThan(0);
    expect(changes.length).toBeGreaterThan(10);
  });
});
