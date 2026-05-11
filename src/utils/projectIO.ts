import { CanvasState, BrushState, TimelineState, FrameData, LayerInfo } from '../types/voxel';

const PROJECT_FORMAT = 'pixvox-project';
const PROJECT_VERSION = '1.0.0';
const STORAGE_KEY = 'p2v-project';
const AUTOSAVE_KEY = 'p2v-autosave';
const AUTOSAVE_DEBOUNCE = 5000;

export interface ProjectFile {
  version: string;
  format: string;
  timestamp: number;
  metadata: ProjectMetadata;
  canvas: SerializedCanvas;
  timeline: SerializedTimeline;
  brush: BrushState;
}

export interface ProjectMetadata {
  name: string;
  width: number;
  height: number;
  layers: number;
  frameCount: number;
  fps: number;
}

export interface SerializedCanvas {
  width: number;
  height: number;
  layers: number;
  activeLayer: number;
  layerInfo: LayerInfo[];
  pixels: Record<string, string>;
  voxelTypes?: Record<string, string>;
}

export interface SerializedTimeline {
  fps: number;
  totalFrames: number;
  currentFrame: number;
  loop: boolean;
  frames: SerializedFrame[];
}

export interface SerializedFrame {
  pixels: Record<string, string>;
  label?: string;
  hasKeyframe: boolean;
  duration: number;
}

export interface SaveOptions {
  includeTimeline?: boolean;
  includeBrush?: boolean;
  compress?: boolean;
}

export function serializeProject(
  canvasState: CanvasState,
  timeline: TimelineState,
  brush: BrushState,
  options: SaveOptions = {}
): ProjectFile {
  const { includeTimeline = true, includeBrush = true } = options;

  return {
    version: PROJECT_VERSION,
    format: PROJECT_FORMAT,
    timestamp: Date.now(),
    metadata: {
      name: 'Untitled',
      width: canvasState.width,
      height: canvasState.height,
      layers: canvasState.layers,
      frameCount: includeTimeline ? timeline.frames.length : 1,
      fps: includeTimeline ? timeline.fps : 12,
    },
    canvas: serializeCanvas(canvasState),
    timeline: includeTimeline ? serializeTimeline(timeline) : createEmptyTimeline(),
    brush: includeBrush ? brush : defaultBrushState(),
  };
}

function serializeCanvas(state: CanvasState): SerializedCanvas {
  return {
    width: state.width,
    height: state.height,
    layers: state.layers,
    activeLayer: state.activeLayer,
    layerInfo: state.layerInfo,
    pixels: Object.fromEntries(state.pixels),
  };
}

function serializeTimeline(timeline: TimelineState): SerializedTimeline {
  return {
    fps: timeline.fps,
    totalFrames: timeline.totalFrames,
    currentFrame: timeline.currentFrame,
    loop: timeline.loop,
    frames: timeline.frames.map(frame => ({
      pixels: Object.fromEntries(frame.pixels),
      label: frame.label,
      hasKeyframe: frame.hasKeyframe,
      duration: frame.duration,
    })),
  };
}

function createEmptyTimeline(): SerializedTimeline {
  return {
    fps: 12,
    totalFrames: 1,
    currentFrame: 0,
    loop: true,
    frames: [{ pixels: {}, hasKeyframe: false, duration: 1 }],
  };
}

function defaultBrushState(): BrushState {
  return {
    tool: 'point',
    color: '#ff0000ff',
    size: 1,
    palette: [],
  };
}

export function deserializeProject(project: ProjectFile): {
  canvasState: CanvasState;
  timeline: TimelineState;
  brush: BrushState;
} {
  if (!project.canvas || !project.timeline) {
    throw new Error('Corrupt project data: missing canvas or timeline');
  }
  const canvasState: CanvasState = {
    width: project.canvas.width,
    height: project.canvas.height,
    layers: project.canvas.layers,
    activeLayer: project.canvas.activeLayer,
    pixels: new Map(Object.entries(project.canvas.pixels)),
    voxelTypes: project.canvas.voxelTypes ? new Map(Object.entries(project.canvas.voxelTypes) as [string, string][]) : new Map(),
    layerInfo: project.canvas.layerInfo,
  };

  const timeline: TimelineState = {
    fps: project.timeline.fps,
    totalFrames: project.timeline.totalFrames,
    currentFrame: project.timeline.currentFrame,
    frames: project.timeline.frames.map(f => ({
      pixels: new Map(Object.entries(f.pixels)),
      label: f.label,
      hasKeyframe: f.hasKeyframe,
      duration: f.duration,
    })),
    playing: false,
    loop: project.timeline.loop,
  };

  return { canvasState, timeline, brush: project.brush };
}

export function projectToJson(project: ProjectFile): string {
  return JSON.stringify(project, null, 2);
}

export function jsonToProject(json: string): ProjectFile {
  const parsed = JSON.parse(json);
  if (parsed.format && parsed.format !== PROJECT_FORMAT) {
    throw new Error(`Invalid project format: expected ${PROJECT_FORMAT}, got ${parsed.format}`);
  }
  return parsed as ProjectFile;
}

export async function compressProject(project: ProjectFile): Promise<Uint8Array> {
  const json = projectToJson(project);
  const blob = new Blob([json], { type: 'application/json' });
  const compressed = await blob.arrayBuffer();
  return new Uint8Array(compressed);
}

export function projectToBlob(project: ProjectFile): Blob {
  return new Blob([projectToJson(project)], { type: 'application/json' });
}

export function downloadProject(project: ProjectFile, filename?: string): void {
  const blob = projectToBlob(project);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${project.metadata.name || 'untitled'}.p2v.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveToLocalStorage(
  project: ProjectFile,
  key = STORAGE_KEY,
  onError?: (error: unknown) => void
): void {
  try {
    localStorage.setItem(key, projectToJson(project));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    onError?.(e);
  }
}

export function loadFromLocalStorage(
  key = STORAGE_KEY,
  onError?: (error: unknown) => void
): ProjectFile | null {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    const project = jsonToProject(data);
    if (!project.canvas || !project.timeline) {
      console.warn('Corrupt project in localStorage, clearing...');
      localStorage.removeItem(key);
      return null;
    }
    return project;
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    onError?.(e);
    return null;
  }
}

export function saveAutosave(
  canvasState: CanvasState,
  timeline: TimelineState,
  brush: BrushState,
  onError?: (error: unknown) => void
): void {
  try {
    const project = serializeProject(canvasState, timeline, brush);
    localStorage.setItem(AUTOSAVE_KEY, projectToJson(project));
  } catch (e) {
    console.error('Failed to save autosave:', e);
    onError?.(e);
  }
}

export function loadAutosave(onError?: (error: unknown) => void): ProjectFile | null {
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY);
    if (!data) return null;
    const project = jsonToProject(data);
    if (!project.canvas || !project.timeline) {
      console.warn('Corrupt autosave, clearing...');
      localStorage.removeItem(AUTOSAVE_KEY);
      return null;
    }
    return project;
  } catch (e) {
    console.error('Failed to load autosave:', e);
    onError?.(e);
    return null;
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

export function createAutoSave(
  onSave: (project: ProjectFile) => void,
  getProject: () => ProjectFile
): () => void {
  let timer: ReturnType<typeof setTimeout>;

  const debouncedSave = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      onSave(getProject());
    }, AUTOSAVE_DEBOUNCE);
  };

  debouncedSave();

  return () => clearTimeout(timer);
}

export interface OldDemoFile {
  width: number;
  height: number;
  layers: number;
  pixels: Record<string, string>;
}

export function isOldDemoFile(json: unknown): json is OldDemoFile {
  if (typeof json !== 'object' || json === null) return false;
  const obj = json as Record<string, unknown>;
  return typeof obj.width === 'number'
    && typeof obj.height === 'number'
    && typeof obj.layers === 'number'
    && typeof obj.pixels === 'object'
    && obj.pixels !== null
    && !Array.isArray(obj.pixels);
}

export function oldDemoToProject(demo: OldDemoFile): ProjectFile {
  const pixels = Object.fromEntries(
    Object.entries(demo.pixels).map(([key, color]) => {
      const parts = key.split(',');
      if (parts.length === 3) {
        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        const z = parseInt(parts[2], 10);
        return [`${x},${y},${z}`, color];
      }
      return [key, color];
    })
  );

  const layerInfo: LayerInfo[] = [];
  for (let z = 0; z < demo.layers; z++) {
    layerInfo.push({ name: `Layer ${z}`, visible: true, locked: false, opacity: 100 });
  }

  const project: ProjectFile = {
    version: PROJECT_VERSION,
    format: PROJECT_FORMAT,
    timestamp: Date.now(),
    metadata: {
      name: 'Demo Import',
      width: demo.width,
      height: demo.height,
      layers: demo.layers,
      frameCount: 1,
      fps: 12,
    },
    canvas: {
      width: demo.width,
      height: demo.height,
      layers: demo.layers,
      activeLayer: 0,
      layerInfo,
      pixels,
    },
    timeline: {
      fps: 12,
      totalFrames: 1,
      currentFrame: 0,
      loop: true,
      frames: [
        { pixels, hasKeyframe: true, duration: 1 },
      ],
    },
    brush: defaultBrushState(),
  };

  return project;
}

export function estimateProjectSize(project: ProjectFile): string {
  const json = projectToJson(project);
  const bytes = new TextEncoder().encode(json).byteLength;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
