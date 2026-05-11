import { CanvasState, TimelineState, FrameData } from '../types/voxel';
import { GIFEncoder } from './gifEncoder';

export interface ImageExportOptions {
  scale?: number;
  backgroundColor?: string;
  includeGrid?: boolean;
  gridColor?: string;
}

export interface SpriteSheetOptions {
  columns?: number;
  scale?: number;
  padding?: number;
  backgroundColor?: string;
}

export interface GIFOptions {
  scale?: number;
  delay?: number;
  loop?: boolean;
  backgroundColor?: string;
}

export interface SpriteSheetMetadata {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  totalFrames: number;
  padding: number;
  scale: number;
  fps: number;
}

export function renderFrameToCanvas(
  frame: FrameData | Map<string, string>,
  width: number,
  height: number,
  options: ImageExportOptions = {}
): HTMLCanvasElement {
  const { scale = 1, backgroundColor = 'transparent', includeGrid = false, gridColor = '#333333' } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;

  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const pixels = frame instanceof Map ? frame : frame.pixels;

  pixels.forEach((color, key) => {
    const [x, y] = key.split(',').map(Number);
    if (x >= 0 && x < width && y >= 0 && y < height) {
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });

  if (includeGrid) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, height * scale);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(width * scale, y * scale);
      ctx.stroke();
    }
  }

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
      type,
      1
    );
  });
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, type = 'image/png'): string {
  return canvas.toDataURL(type);
}

export async function exportPNG(
  canvasState: CanvasState,
  options: ImageExportOptions = {}
): Promise<{ blob: Blob; filename: string }> {
  const canvas = renderFrameToCanvas(canvasState.pixels, canvasState.width, canvasState.height, options);
  const blob = await canvasToBlob(canvas);
  return { blob, filename: 'frame.png' };
}

export async function exportSpriteSheet(
  timeline: TimelineState,
  width: number,
  height: number,
  options: SpriteSheetOptions = {}
): Promise<{ blob: Blob; filename: string; metadata: SpriteSheetMetadata }> {
  const { columns, scale = 1, padding = 0, backgroundColor = 'transparent' } = options;
  const cols = columns || Math.ceil(Math.sqrt(timeline.frames.length));
  const rows = Math.ceil(timeline.frames.length / cols);

  const cellWidth = width * scale + padding * 2;
  const cellHeight = height * scale + padding * 2;

  const sheet = document.createElement('canvas');
  sheet.width = cols * cellWidth;
  sheet.height = rows * cellHeight;
  const ctx = sheet.getContext('2d')!;

  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, sheet.width, sheet.height);
  }

  for (let i = 0; i < timeline.frames.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellWidth + padding;
    const y = row * cellHeight + padding;

    const frameCanvas = renderFrameToCanvas(
      timeline.frames[i],
      width,
      height,
      { scale }
    );

    ctx.drawImage(frameCanvas, x, y);
  }

  const blob = await canvasToBlob(sheet);

  const metadata: SpriteSheetMetadata = {
    frameWidth: width * scale,
    frameHeight: height * scale,
    columns: cols,
    rows,
    totalFrames: timeline.frames.length,
    padding,
    scale,
    fps: timeline.fps,
  };

  return { blob, filename: 'spritesheet.png', metadata };
}

export async function exportAnimatedGIF(
  timeline: TimelineState,
  width: number,
  height: number,
  options: GIFOptions = {}
): Promise<{ blob: Blob; filename: string }> {
  const { scale = 1, delay = Math.round(100 / timeline.fps), loop = true, backgroundColor = 'transparent' } = options;

  const frameCanvases: HTMLCanvasElement[] = [];
  for (const frame of timeline.frames) {
    frameCanvases.push(renderFrameToCanvas(frame, width, height, { scale, backgroundColor }));
  }

  return encodeGIF(frameCanvases, delay, loop);
}

async function encodeGIF(
  canvases: HTMLCanvasElement[],
  delayCentiseconds: number,
  loop: boolean
): Promise<{ blob: Blob; filename: string }> {
  const encoder = new GIFEncoder();
  encoder.setRepeat(loop ? 0 : -1);
  encoder.setDelay(delayCentiseconds);
  encoder.setQuality(10);
  encoder.start();

  for (const canvas of canvases) {
    encoder.addFrame(canvas);
  }

  encoder.finish();
  return { blob: encoder.getBlob(), filename: 'animation.gif' };
}

export { downloadImage } from './download';

export async function exportPNGBlob(
  canvasState: CanvasState,
  options: ImageExportOptions = {}
): Promise<Blob> {
  const { blob } = await exportPNG(canvasState, options);
  return blob;
}

export async function exportSpriteSheetBlob(
  timeline: TimelineState,
  width: number,
  height: number,
  options: SpriteSheetOptions = {}
): Promise<Blob> {
  const { blob } = await exportSpriteSheet(timeline, width, height, options);
  return blob;
}

export async function exportGIFBlob(
  timeline: TimelineState,
  width: number,
  height: number,
  options: GIFOptions = {}
): Promise<Blob> {
  const { blob } = await exportAnimatedGIF(timeline, width, height, options);
  return blob;
}
