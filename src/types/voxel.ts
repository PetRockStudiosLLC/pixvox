export interface LayerInfo {
  name: string;
  visible: boolean;
  locked: boolean; // Prevent editing
  opacity: number; // 0-100
}

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: string; // hex color #RRGGBB
}

export interface CanvasState {
  width: number; // 8 to 128
  height: number;
  layers: number; // depth (Z-axis)
  activeLayer: number;
  pixels: Map<string, string>; // key: "x,y,z" -> hex color
  voxelTypes: Map<string, string>; // key: "x,y,z" -> voxel type ID
  layerInfo: LayerInfo[]; // Per-layer metadata
}

export type BrushTool =
  | "point"
  | "line"
  | "bucket"
  | "eraser"
  | "circle"
  | "filled-circle"
  | "spray"
  | "pattern"
  | "blur"
  | "dither";

export interface BrushState {
  tool: BrushTool;
  color: string; // current brush color #RRGGBB
  size: number;
  palette?: string[]; // current color palette
  density?: number; // spray density 0-1
  sprayRadius?: number; // spray area radius
  blurStrength?: number; // blur blend amount 0-1
  blurFalloff?: number; // blur edge falloff 0-1
  ditherDensity?: number; // dither threshold density 0-1
  ditherAngle?: number; // dither pattern rotation in degrees
  ditherPattern?: "bayer2x2" | "bayer3x3" | "bayer4x4" | "bayer8x8";
  pattern?: string[][]; // 2D array of hex colors for pattern brush
}

export interface PaletteColor {
  name: string;
  hex: string;
}

export interface FrameData {
  pixels: Map<string, string>;
  label?: string;
  hasKeyframe: boolean;
  duration: number; // ticks this frame holds (default 1)
}

export interface TimelineState {
  fps: number;
  totalFrames: number;
  currentFrame: number;
  frames: FrameData[];
  playing: boolean;
  loop: boolean;
}
