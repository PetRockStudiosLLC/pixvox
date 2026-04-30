export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: string; // hex color #RRGGBB
}

export interface CanvasState {
  width: number;  // 8 to 128
  height: number;
  layers: number; // depth (Z-axis)
  activeLayer: number;
  pixels: Map<string, string>; // key: "x,y,z" -> hex color
}

export type BrushTool = 'point' | 'line' | 'bucket' | 'eraser' | 'circle' | 'filled-circle' | 'spray' | 'pattern' | 'blur' | 'dither';

export interface BrushState {
  tool: BrushTool;
  color: string; // current brush color #RRGGBB
  size: number;
  palette?: string[]; // current color palette
}

export interface PaletteColor {
  name: string;
  hex: string;
}
