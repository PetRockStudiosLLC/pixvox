import { CanvasState, BrushState, BrushTool } from "../../types/voxel";

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

export const brushRegistry = new Map<string, BrushHandler>();

export function registerBrush(handler: BrushHandler): void {
  brushRegistry.set(handler.tool, handler);
}

export function getBrush(tool: BrushTool): BrushHandler | undefined {
  return brushRegistry.get(tool);
}

export function getAllBrushes(): BrushHandler[] {
  return Array.from(brushRegistry.values());
}
