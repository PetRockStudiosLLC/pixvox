import { CanvasState, VoxelData, LayerInfo } from "../types/voxel";

const DEFAULT_COLOR = "#00000000"; // transparent

export function createCanvasState(width: number, height: number, layers: number = 1): CanvasState {
  if (width < 8 || width > 128 || height < 8 || height > 128) {
    throw new Error("Canvas dimensions must be between 8 and 128");
  }
  return {
    width,
    height,
    layers,
    activeLayer: 0,
    pixels: new Map(),
    voxelTypes: new Map(),
    layerInfo: Array.from({ length: layers }, (_, i) => ({
      name: `Layer ${i + 1}`,
      visible: true,
      locked: false,
      opacity: 100
    }))
  };
}

export function getPixelKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function getPixel(state: CanvasState, x: number, y: number, z: number): string {
  return state.pixels.get(getPixelKey(x, y, z)) ?? DEFAULT_COLOR;
}

export function setPixel(state: CanvasState, x: number, y: number, z: number, color: string): void {
  const key = getPixelKey(x, y, z);
  const isTransparent = color === DEFAULT_COLOR || (color.length === 9 && color.slice(7) === "00");
  if (isTransparent) {
    state.pixels.delete(key);
  } else {
    state.pixels.set(key, color);
  }
}

export function* iterateLayer(state: CanvasState, z: number): Generator<VoxelData> {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const color = getPixel(state, x, y, z);
      const isTransparent = color === DEFAULT_COLOR || (color.length === 9 && color.slice(7) === "00");
      if (color !== DEFAULT_COLOR && !isTransparent) {
        yield { x, y, z, color };
      }
    }
  }
}

export function exportProject(state: CanvasState): string {
  const data = {
    width: state.width,
    height: state.height,
    layers: state.layers,
    layerInfo: state.layerInfo,
    pixels: Object.fromEntries(state.pixels),
    voxelTypes: Object.fromEntries(state.voxelTypes)
  };
  return JSON.stringify(data);
}

export function importProject(json: string): CanvasState {
  const data = JSON.parse(json);
  const layerInfo =
    data.layerInfo ||
    Array.from({ length: data.layers }, (_, i) => ({
      name: `Layer ${i + 1}`,
      visible: true,
      locked: false,
      opacity: 100
    }));
  const voxelTypes = data.voxelTypes ? new Map(Object.entries(data.voxelTypes) as [string, string][]) : new Map();
  return {
    width: data.width,
    height: data.height,
    layers: data.layers,
    activeLayer: 0,
    pixels: new Map(Object.entries(data.pixels)),
    voxelTypes,
    layerInfo
  };
}

export function saveToLocalStorage(state: CanvasState, key: string = "p2v-project"): void {
  localStorage.setItem(key, exportProject(state));
}

export function loadFromLocalStorage(key: string = "p2v-project"): CanvasState | null {
  const data = localStorage.getItem(key);
  if (!data) return null;
  return importProject(data);
}

export function setPixelsBulk(state: CanvasState, voxels: { x: number; y: number; z: number; color: string }[]): void {
  const isTransparent = (color: string) => color === DEFAULT_COLOR || (color.length === 9 && color.slice(7) === "00");

  for (const v of voxels) {
    if (v.x < 0 || v.x >= state.width || v.y < 0 || v.y >= state.height || v.z < 0 || v.z >= state.layers) {
      continue;
    }
    if (isTransparent(v.color)) {
      state.pixels.delete(getPixelKey(v.x, v.y, v.z));
    } else {
      state.pixels.set(getPixelKey(v.x, v.y, v.z), v.color);
    }
  }
}

export function computeOptimalLayers(boundingBox: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number }, canvasSize: number): number {
  const depth = Math.max(1, Math.ceil(boundingBox.maxZ - boundingBox.minZ));
  return Math.min(128, Math.max(8, Math.min(depth, canvasSize)));
}
