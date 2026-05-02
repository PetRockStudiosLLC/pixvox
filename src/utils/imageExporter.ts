import { CanvasState, TimelineState, FrameData } from '../types/voxel';

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

export async function exportAnimatedGIF(
  timeline: TimelineState,
  width: number,
  height: number,
  options: GIFOptions = {}
): Promise<{ blob: Blob; filename: string }> {
  const { scale = 1, delay = Math.round(100 / timeline.fps), loop = true, backgroundColor = 'transparent' } = options;

  const gif = await createGIF(
    timeline.frames,
    width,
    height,
    scale,
    delay,
    loop,
    backgroundColor
  );

  return { blob: gif, filename: 'animation.gif' };
}

async function createGIF(
  frames: FrameData[],
  width: number,
  height: number,
  scale: number,
  delay: number,
  loop: boolean,
  backgroundColor: string
): Promise<Blob> {
  const frameCanvases: HTMLCanvasElement[] = [];

  for (const frame of frames) {
    frameCanvases.push(renderFrameToCanvas(frame, width, height, { scale, backgroundColor }));
  }

  return encodeGIF(frameCanvases, delay, loop);
}

async function encodeGIF(
  canvases: HTMLCanvasElement[],
  delayCentiseconds: number,
  loop: boolean
): Promise<Blob> {
  const encoder = new GIFEncoder();
  encoder.setRepeat(loop ? 0 : -1);
  encoder.setDelay(delayCentiseconds);
  encoder.setQuality(10);
  encoder.start();

  for (const canvas of canvases) {
    encoder.addFrame(canvas);
  }

  encoder.finish();
  return encoder.getBlob();
}

class GIFEncoder {
  private repeat: number;
  private delayCentiseconds: number;
  private quality: number;
  private palette: number[];
  private indexedPixels: number[];
  private width: number;
  private height: number;
  private transparentIndex: number;
  private hasTransparency: boolean;
  private firstFrame: boolean;
  private imageCount: number;
  private gifData: Uint8Array;
  private outputStream: DataOutputStream;

  constructor() {
    this.repeat = -1;
    this.delayCentiseconds = 0;
    this.quality = 10;
    this.palette = [];
    this.indexedPixels = [];
    this.width = 0;
    this.height = 0;
    this.transparentIndex = 0;
    this.hasTransparency = false;
    this.firstFrame = true;
    this.imageCount = 0;
    this.gifData = new Uint8Array(0);
    this.outputStream = new DataOutputStream();
  }

  setRepeat(repeat: number): void {
    this.repeat = repeat;
  }

  setDelay(delay: number): void {
    this.delayCentiseconds = delay;
  }

  setQuality(quality: number): void {
    this.quality = quality;
  }

  start(): void {
    this.outputStream = new DataOutputStream();
    this.writeHeader();
  }

  private writeHeader(): void {
    this.writeString('GIF89a');
  }

  private writeString(str: string): void {
    for (let i = 0; i < str.length; i++) {
      this.outputStream.writeByte(str.charCodeAt(i));
    }
  }

  addFrame(canvas: HTMLCanvasElement): void {
    this.width = canvas.width;
    this.height = canvas.height;

    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const pixels = imageData.data;

    const indexedPixels = new Uint8Array(this.width * this.height);
    const colorMap = this.createColorMap(pixels);

    if (this.firstFrame) {
      this.writeLogicalScreenDescriptor();
      this.writeGlobalColorTable(colorMap);
    }

    if (this.hasTransparency) {
      this.writeGraphicControlExtension();
    }

    this.writeImageDescriptor();
    this.writeLocalColorTable(colorMap);
    this.indexFramePixels(pixels, colorMap, indexedPixels);
    this.writePixels();

    this.firstFrame = false;
    this.imageCount++;
  }

  private writeLogicalScreenDescriptor(): void {
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.outputStream.writeByte(0xf0);
    this.outputStream.writeByte(0);
    this.outputStream.writeByte(0);
  }

  private writeGlobalColorTable(colorMap: number[]): void {
    for (let i = 0; i < colorMap.length; i++) {
      this.outputStream.writeByte(colorMap[i]);
    }
  }

  private writeLocalColorTable(colorMap: number[]): void {
    // Local color table is same as global for simplicity
  }

  private writeGraphicControlExtension(): void {
    this.outputStream.writeByte(0x21);
    this.outputStream.writeByte(0xf9);
    this.outputStream.writeByte(4);
    this.outputStream.writeByte(0);
    this.writeShort(this.delayCentiseconds);
    this.outputStream.writeByte(this.transparentIndex);
    this.outputStream.writeByte(0);
  }

  private writeImageDescriptor(): void {
    this.outputStream.writeByte(0x2c);
    this.writeShort(0);
    this.writeShort(0);
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.outputStream.writeByte(0);
  }

  private writePixels(): void {
    const minCodeSize = this.getMinCodeSize();
    this.outputStream.writeByte(minCodeSize);
    this.writeLZWC(this.indexedPixels, minCodeSize);
  }

  private getMinCodeSize(): number {
    let bits = 0;
    for (let i = this.palette.length - 1; i > 0; i >>= 1) {
      bits++;
    }
    return Math.max(bits, 2);
  }

  private createColorMap(pixels: Uint8ClampedArray): number[] {
    const colorMap: number[] = [];
    const used = new Set<string>();

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      if (a === 0) {
        this.hasTransparency = true;
        this.transparentIndex = 0;
        continue;
      }

      const key = `${r},${g},${b}`;
      if (used.has(key)) continue;
      used.add(key);

      colorMap.push(r, g, b);
    }

    while (colorMap.length < 256 * 3) {
      colorMap.push(0, 0, 0);
    }

    this.palette = colorMap;
    return colorMap;
  }

  private indexFramePixels(
    pixels: Uint8ClampedArray,
    colorMap: number[],
    indexedPixels: Uint8Array
  ): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      if (a === 0) {
        indexedPixels[i / 4] = this.transparentIndex;
        continue;
      }

      let bestIndex = 0;
      let bestDistance = Infinity;

      for (let j = 0; j < colorMap.length; j += 3) {
        const dr = r - colorMap[j];
        const dg = g - colorMap[j + 1];
        const db = b - colorMap[j + 2];
        const distance = dr * dr + dg * dg + db * db;

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = j / 3;
        }
      }

      indexedPixels[i / 4] = bestIndex;
    }

    this.indexedPixels = Array.from(indexedPixels);
  }

  private writeLZWC(pixels: number[], minCodeSize: number): void {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let code = clearCode + 2;
    const dictionary: [number[], number][] = [];

    const writeCode = (c: number) => {
      let bits = c;
      while (bits > 0) {
        this.outputStream.writeBit(bits & 1);
        bits >>= 1;
        codeSize--;
      }
    };

    writeCode(clearCode);

    let prefix = pixels[0];
    for (let i = 1; i < pixels.length; i++) {
      const current = pixels[i];
      const key = [prefix, current];

      let found = false;
      for (let j = 0; j < dictionary.length; j++) {
        if (dictionary[j][0][0] === prefix && dictionary[j][0][1] === current) {
          prefix = dictionary[j][1];
          found = true;
          break;
        }
      }

      if (!found) {
        writeCode(prefix);
        if (code < 4096) {
          dictionary.push([key, code]);
          code++;
        } else {
          writeCode(clearCode);
          dictionary.length = 0;
          code = clearCode + 2;
        }
        prefix = current;
      }
    }

    writeCode(prefix);
    writeCode(eoiCode);
  }

  private writeShort(value: number): void {
    this.outputStream.writeByte(value & 0xff);
    this.outputStream.writeByte((value >> 8) & 0xff);
  }

  finish(): void {
    this.outputStream.writeByte(0x3b);
  }

  getBlob(): Blob {
    return new Blob([this.outputStream.getBytes()], { type: 'image/gif' });
  }
}

class DataOutputStream {
  private buffer: Uint8Array;
  private position: number;
  private currentByte: number;
  private currentBit: number;

  constructor() {
    this.buffer = new Uint8Array(4096);
    this.position = 0;
    this.currentByte = 0;
    this.currentBit = 0;
  }

  writeByte(value: number): void {
    if (this.position >= this.buffer.length) {
      this.grow();
    }
    this.buffer[this.position++] = value;
  }

  writeBit(bit: number): void {
    this.currentByte |= bit << this.currentBit;
    this.currentBit++;
    if (this.currentBit === 8) {
      this.writeByte(this.currentByte);
      this.currentByte = 0;
      this.currentBit = 0;
    }
  }

  private grow(): void {
    const newBuffer = new Uint8Array(this.buffer.length * 2);
    newBuffer.set(this.buffer);
    this.buffer = newBuffer;
  }

  getBytes(): Uint8Array {
    if (this.currentBit > 0) {
      this.writeByte(this.currentByte);
    }
    return this.buffer.slice(0, this.position);
  }
}

export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
