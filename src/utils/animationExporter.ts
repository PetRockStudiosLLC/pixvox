import { CanvasState, TimelineState, FrameData } from "../types/voxel";
import { exportGLTF } from "./objExporter";
import JSZip from "jszip";

const ANIM_JSON_FORMAT = "pixvox-anim";
const ANIM_JSON_VERSION = "1.0.0";

export interface AnimationJSON {
  format: string;
  version: string;
  width: number;
  height: number;
  layers: number;
  fps: number;
  loop: boolean;
  totalFrames: number;
  frames: Array<{
    pixels: Record<string, string>;
    label?: string;
    duration: number;
    hasKeyframe: boolean;
  }>;
}

export interface AlembicABCOpts {
  compress: "delta" | "snapshot";
}

// Alembic Ogawa binary format constants
const OGAWA_MAGIC = "Ogawa";
const OGAWA_VERSION = 11;
const OGAWA_HEADER_SIZE = 16;
const OGAWA_DATA_REF_BIT = BigInt("0x8000000000000000");

function pixelsToRecord(pixels: Map<string, string>): Record<string, string> {
  return Object.fromEntries(pixels);
}

function recordToPixels(record: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(record));
}

export function exportAnimationJSON(
  canvasState: CanvasState,
  timeline: TimelineState
): { content: string; filename: string; mimeType: string } {
  const { width, height, layers } = canvasState;
  const frames = timeline.frames;

  if (frames.length === 0) {
    return { content: "", filename: "", mimeType: "" };
  }

  const anim: AnimationJSON = {
    format: ANIM_JSON_FORMAT,
    version: ANIM_JSON_VERSION,
    width,
    height,
    layers,
    fps: timeline.fps,
    loop: timeline.loop,
    totalFrames: timeline.totalFrames,
    frames: frames.map((f) => ({
      pixels: pixelsToRecord(f.pixels),
      label: f.label,
      duration: f.duration,
      hasKeyframe: f.hasKeyframe
    }))
  };

  const content = JSON.stringify(anim, null, 2);
  return { content, filename: "animation.p2v-anim.json", mimeType: "application/json" };
}

export function importAnimationJSON(
  json: string,
  canvasState: CanvasState
): { canvasState: CanvasState; timeline: TimelineState } | null {
  let anim: AnimationJSON;
  try {
    anim = JSON.parse(json);
  } catch {
    return null;
  }

  if (anim.format !== ANIM_JSON_FORMAT) {
    return null;
  }

  const newCanvas = { ...canvasState };
  newCanvas.pixels = new Map();

  const timeline: TimelineState = {
    fps: anim.fps,
    totalFrames: anim.totalFrames,
    currentFrame: 0,
    loop: anim.loop,
    playing: false,
    frames: anim.frames.map((f) => ({
      pixels: recordToPixels(f.pixels),
      label: f.label,
      hasKeyframe: f.hasKeyframe,
      duration: f.duration
    }))
  };

  if (timeline.frames.length > 0) {
    newCanvas.pixels = new Map(timeline.frames[0].pixels);
  }

  return { canvasState: newCanvas, timeline };
}

// Ogawa binary writer helpers
function writeU64LE(buffer: Uint8Array, offset: number, value: bigint): void {
  buffer[offset] = Number(value & BigInt(0xff));
  buffer[offset + 1] = Number((value >> BigInt(8)) & BigInt(0xff));
  buffer[offset + 2] = Number((value >> BigInt(16)) & BigInt(0xff));
  buffer[offset + 3] = Number((value >> BigInt(24)) & BigInt(0xff));
  buffer[offset + 4] = Number((value >> BigInt(32)) & BigInt(0xff));
  buffer[offset + 5] = Number((value >> BigInt(40)) & BigInt(0xff));
  buffer[offset + 6] = Number((value >> BigInt(48)) & BigInt(0xff));
  buffer[offset + 7] = Number((value >> BigInt(56)) & BigInt(0xff));
}

function readU64LE(buffer: Uint8Array, offset: number): bigint {
  let value = BigInt(0);
  for (let i = 7; i >= 0; i--) {
    value = (value << BigInt(8)) | BigInt(buffer[offset + i]);
  }
  return value;
}

function writeU32(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
  buffer[offset + 2] = (value >> 16) & 0xff;
  buffer[offset + 3] = (value >> 24) & 0xff;
}

function writeF32(buffer: Uint8Array, offset: number, value: number): void {
  const arr = new Uint8Array(4);
  new DataView(arr.buffer).setFloat32(0, value, true);
  buffer.set(arr, offset);
}

function writeStringNullTerminated(buffer: Uint8Array, offset: number, str: string): number {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  buffer.set(encoded, offset);
  buffer[offset + encoded.length] = 0;
  return encoded.length + 1;
}

function hexToRGBA(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  const a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
  return [r, g, b, a];
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  return "#" + [r, g, b, a].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function getDeltaEntries(current: Map<string, string>, previous: Map<string, string>): Array<[string, string]> {
  const deltas: Array<[string, string]> = [];
  const prevSet = new Set(previous.keys());

  for (const [key, color] of current) {
    const prevColor = previous.get(key);
    if (prevColor !== color) {
      deltas.push([key, color]);
    }
  }

  for (const key of prevSet) {
    if (!current.has(key)) {
      deltas.push([key, "#00000000"]);
    }
  }

  return deltas;
}

// Build frame payload as raw bytes for Ogawa data block
function buildFramePayload(frame: FrameData, prevFrame: FrameData | null, compress: "delta" | "snapshot"): Uint8Array {
  const entries =
    compress === "delta" && prevFrame
      ? getDeltaEntries(frame.pixels, prevFrame.pixels)
      : Array.from(frame.pixels.entries());

  const encoder = new TextEncoder();
  let totalBytes = 4; // entry count u32

  for (const [key] of entries) {
    const keyBytes = encoder.encode(key);
    totalBytes += 2 + keyBytes.length;
  }

  for (const [, color] of entries) {
    totalBytes += 4; // rgba
  }

  const buffer = new Uint8Array(totalBytes);
  let off = 0;

  writeU32(buffer, off, entries.length);
  off += 4;

  for (const [key, color] of entries) {
    const keyBytes = encoder.encode(key);
    buffer[off] = keyBytes.length & 0xff;
    off++;
    buffer[off] = (keyBytes.length >> 8) & 0xff;
    off++;
    buffer.set(keyBytes, off);
    off += keyBytes.length;

    const rgba = hexToRGBA(color);
    buffer[off] = rgba[0];
    off++;
    buffer[off] = rgba[1];
    off++;
    buffer[off] = rgba[2];
    off++;
    buffer[off] = rgba[3];
    off++;
  }

  return buffer;
}

// Build metadata payload: width, height, layers, fps, loop, totalFrames, compress mode
function buildMetadataPayload(
  width: number,
  height: number,
  layers: number,
  fps: number,
  loop: boolean,
  totalFrames: number,
  compress: "delta" | "snapshot"
): Uint8Array {
  const buffer = new Uint8Array(4 + 4 + 4 + 4 + 1 + 4 + 1);
  let off = 0;

  writeU32(buffer, off, width);
  off += 4;
  writeU32(buffer, off, height);
  off += 4;
  writeU32(buffer, off, layers);
  off += 4;
  writeF32(buffer, off, fps);
  off += 4;
  buffer[off] = loop ? 1 : 0;
  off++;
  writeU32(buffer, off, totalFrames);
  off += 4;
  buffer[off] = compress === "delta" ? 1 : 0;
  off++;

  return buffer;
}

// Ogawa Writer: builds a valid .abc file using Alembic Ogawa binary format
// Layout: [16B Header][Root Group][Frame Groups x N][Data Blocks x (N+1)]
class OgawaWriter {
  buffer: Uint8Array;
  offset = OGAWA_HEADER_SIZE;
  dataBlockPositions: number[] = [];
  groupPositions: number[] = [];

  constructor(reservedBytes: number) {
    this.buffer = new Uint8Array(reservedBytes);
    this.writeHeader();
  }

  writeHeader(): void {
    const enc = new TextEncoder();
    const magic = enc.encode(OGAWA_MAGIC);
    this.buffer[0] = magic[0];
    this.buffer[1] = magic[1];
    this.buffer[2] = magic[2];
    this.buffer[3] = magic[3];
    this.buffer[4] = magic[4];
    this.buffer[5] = 0; // frozen = false
    this.buffer[6] = OGAWA_VERSION & 0xff;
    this.buffer[7] = (OGAWA_VERSION >> 8) & 0xff;
    writeU32(this.buffer, 8, OGAWA_HEADER_SIZE);
  }

  writeGroup(childCount: number): number {
    const pos = this.offset;
    writeU64LE(this.buffer, this.offset, BigInt(childCount));
    this.offset += 8;
    this.groupPositions.push(pos);
    return pos;
  }

  writeDataBlock(data: Uint8Array): bigint {
    const pos = this.offset;
    this.dataBlockPositions.push(pos);
    writeU64LE(this.buffer, this.offset, BigInt(data.length));
    this.offset += 8;
    this.buffer.set(data, this.offset);
    this.offset += data.length;
    const dataRef = BigInt(pos) | OGAWA_DATA_REF_BIT;
    return dataRef;
  }

  writeGroupRefs(refs: bigint[]): void {
    for (const ref of refs) {
      writeU64LE(this.buffer, this.offset, ref);
      this.offset += 8;
    }
  }

  getFinalBuffer(): Uint8Array {
    if (this.offset < this.buffer.length) {
      return this.buffer.slice(0, this.offset);
    }
    return this.buffer;
  }
}

export function exportAlembicABC(
  canvasState: CanvasState,
  timeline: TimelineState,
  opts: AlembicABCOpts = { compress: "delta" }
): Promise<{ blob: Blob; filename: string }> {
  const { width, height, layers } = canvasState;
  const frames = timeline.frames;

  if (frames.length === 0) {
    return Promise.resolve({ blob: new Blob([]), filename: "" });
  }

  return buildAlembicABC(canvasState, timeline, opts);
}

async function buildAlembicABC(
  canvasState: CanvasState,
  timeline: TimelineState,
  opts: AlembicABCOpts
): Promise<{ blob: Blob; filename: string }> {
  const { width, height, layers } = canvasState;
  const frames = timeline.frames;
  const numFrames = frames.length;

  // Calculate total size needed
  // Header: 16
  // Root group: 8 (child count) + 8 * (numFrames + 1) (refs: metadata + N frame groups)
  // Frame groups: N * (8 (child count) + 8 (data ref))
  // Data blocks: (N + 1) * (8 (size) + payload)
  let estimatedSize = OGAWA_HEADER_SIZE + 200;
  for (let i = 0; i < numFrames; i++) {
    const prevFrame = i > 0 ? frames[i - 1] : null;
    estimatedSize += buildFramePayload(frames[i], prevFrame, opts.compress).byteLength;
  }
  estimatedSize += buildMetadataPayload(
    width,
    height,
    layers,
    timeline.fps,
    timeline.loop,
    numFrames,
    opts.compress
  ).byteLength;
  estimatedSize += numFrames * 100;

  const writer = new OgawaWriter(estimatedSize);

  // Build data blocks first (metadata + N frame payloads)
  const metadataPayload = buildMetadataPayload(
    width,
    height,
    layers,
    timeline.fps,
    timeline.loop,
    numFrames,
    opts.compress
  );
  const metadataRef = writer.writeDataBlock(metadataPayload);

  const frameDataRefs: bigint[] = [];
  for (let i = 0; i < numFrames; i++) {
    const prevFrame = i > 0 ? frames[i - 1] : null;
    const framePayload = buildFramePayload(frames[i], prevFrame, opts.compress);
    const ref = writer.writeDataBlock(framePayload);
    frameDataRefs.push(ref);
  }

  // Build frame groups (each has 1 child: the data block)
  const frameGroupRefs: bigint[] = [];
  for (let i = 0; i < numFrames; i++) {
    writer.writeGroup(1);
    writer.writeGroupRefs([frameDataRefs[i]]);
    frameGroupRefs.push(BigInt(writer.groupPositions[writer.groupPositions.length - 1]));
  }

  // Build root group: children are metadata data ref + N frame group refs
  const rootChildRefs = [metadataRef, ...frameGroupRefs];
  writer.writeGroup(rootChildRefs.length);
  writer.writeGroupRefs(rootChildRefs);

  const finalBuffer = writer.getFinalBuffer();
  return {
    blob: new Blob([finalBuffer], { type: "application/abc" }),
    filename: `animation-${numFrames}f.abc`
  };
}

export async function importAlembicABC(
  file: File,
  canvasState: CanvasState
): Promise<{ canvasState: CanvasState; timeline: TimelineState } | null> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Validate Ogawa magic
  const enc = new TextEncoder();
  const magic = enc.encode("Ogawa");
  for (let i = 0; i < 5; i++) {
    if (bytes[i] !== magic[i]) return null;
  }

  const frozen = bytes[5] !== 0;
  const version = bytes[6] | (bytes[7] << 8);
  const firstGroupPos = bytes[8] | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24);

  if (firstGroupPos !== OGAWA_HEADER_SIZE) return null;

  // Parse root group
  let off = firstGroupPos;
  const rootChildCount = Number(readU64LE(bytes, off));
  off += 8;

  const rootRefs: bigint[] = [];
  for (let i = 0; i < rootChildCount; i++) {
    rootRefs.push(readU64LE(bytes, off));
    off += 8;
  }

  // First ref is metadata data block
  const metadataRef = rootRefs[0];
  const isDataRef = (metadataRef & OGAWA_DATA_REF_BIT) !== BigInt(0);
  if (!isDataRef) return null;

  const dataPos = Number(metadataRef & ~OGAWA_DATA_REF_BIT);
  const dataSize = Number(readU64LE(bytes, dataPos));
  const metadataStart = dataPos + 8;

  // Parse metadata
  const metaWidth =
    bytes[metadataStart] |
    (bytes[metadataStart + 1] << 8) |
    (bytes[metadataStart + 2] << 16) |
    (bytes[metadataStart + 3] << 24);
  const metaHeight =
    bytes[metadataStart + 4] |
    (bytes[metadataStart + 5] << 8) |
    (bytes[metadataStart + 6] << 16) |
    (bytes[metadataStart + 7] << 24);
  const metaLayers =
    bytes[metadataStart + 8] |
    (bytes[metadataStart + 9] << 8) |
    (bytes[metadataStart + 10] << 16) |
    (bytes[metadataStart + 11] << 24);

  const fpsArr = new Uint8Array(4);
  fpsArr.set(bytes.slice(metadataStart + 12, metadataStart + 16));
  const metaFps = new DataView(fpsArr.buffer).getFloat32(0, true);

  const metaLoop = bytes[metadataStart + 16] === 1;
  const metaTotalFrames =
    bytes[metadataStart + 17] |
    (bytes[metadataStart + 18] << 8) |
    (bytes[metadataStart + 19] << 16) |
    (bytes[metadataStart + 20] << 24);
  const metaCompress = bytes[metadataStart + 21] === 1 ? "delta" : "snapshot";

  // Remaining refs are frame groups
  const decoder = new TextDecoder();
  const frames: FrameData[] = [];
  let prevPixels: Map<string, string> | null = null;

  for (let i = 1; i < rootRefs.length; i++) {
    const groupRef = rootRefs[i];
    const isGroupData = (groupRef & OGAWA_DATA_REF_BIT) !== BigInt(0);
    if (isGroupData) continue;

    const groupPos = Number(groupRef);
    const childCount = Number(readU64LE(bytes, groupPos));
    const childOff = groupPos + 8;

    if (childCount < 1) continue;

    const dataRef = readU64LE(bytes, childOff);
    const isData = (dataRef & OGAWA_DATA_REF_BIT) !== BigInt(0);
    if (!isData) continue;

    const dPos = Number(dataRef & ~OGAWA_DATA_REF_BIT);
    const dSize = Number(readU64LE(bytes, dPos));
    const dStart = dPos + 8;

    const entryCount = bytes[dStart] | (bytes[dStart + 1] << 8) | (bytes[dStart + 2] << 16) | (bytes[dStart + 3] << 24);

    const pixels: Map<string, string> = prevPixels ? new Map(prevPixels) : new Map();
    let fOff = dStart + 4;

    for (let e = 0; e < entryCount; e++) {
      const keyLen = bytes[fOff] | (bytes[fOff + 1] << 8);
      fOff += 2;
      const key = decoder.decode(bytes.slice(fOff, fOff + keyLen));
      fOff += keyLen;

      const r = bytes[fOff];
      fOff++;
      const g = bytes[fOff];
      fOff++;
      const b = bytes[fOff];
      fOff++;
      const a = bytes[fOff];
      fOff++;

      const color = rgbaToHex(r, g, b, a);
      if (color === "#00000000") {
        pixels.delete(key);
      } else {
        pixels.set(key, color);
      }
    }

    frames.push({
      pixels,
      label: undefined,
      hasKeyframe: true,
      duration: 1
    });

    if (metaCompress === "delta") {
      prevPixels = new Map(pixels);
    }
  }

  const newCanvas = { ...canvasState };
  if (frames.length > 0) {
    newCanvas.pixels = new Map(frames[0].pixels);
  }

  return {
    canvasState: newCanvas,
    timeline: {
      fps: metaFps,
      totalFrames: metaTotalFrames,
      currentFrame: 0,
      loop: metaLoop,
      playing: false,
      frames
    }
  };
}

export async function exportFrameSequenceGLTF(
  canvasState: CanvasState,
  timeline: TimelineState
): Promise<{ blob: Blob; filename: string }> {
  const frames = timeline.frames;

  if (frames.length === 0) {
    return Promise.resolve({ blob: new Blob([]), filename: "" });
  }

  const zip = new JSZip();

  for (let i = 0; i < frames.length; i++) {
    const frameCanvas = {
      ...canvasState,
      pixels: frames[i].pixels
    };

    const { content } = exportGLTF(frameCanvas, "fast-draft");
    if (content) {
      const padded = String(i).padStart(4, "0");
      zip.file(`frame_${padded}.gltf`, content);
    }
  }

  const meta = JSON.stringify(
    {
      fps: timeline.fps,
      loop: timeline.loop,
      totalFrames: frames.length,
      width: canvasState.width,
      height: canvasState.height,
      layers: canvasState.layers
    },
    null,
    2
  );

  zip.file("meta.json", meta);

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filename: "frame-sequence.gltf.zip" };
}

export { downloadBlob } from "./download";
