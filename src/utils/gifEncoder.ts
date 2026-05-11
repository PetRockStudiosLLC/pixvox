/**
 * GIF Encoder — standalone GIF89a encoder with LZW compression.
 * Extracted from imageExporter.ts to reduce file size and build times.
 */

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

export class GIFEncoder {
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
