import { useState, useRef, useEffect } from 'react';
import { CanvasState, BrushState, TimelineState } from '../types/voxel';
import { createCanvasState } from '../utils/canvasBuffer';
import { deserializeProject, loadFromLocalStorage, loadAutosave } from '../utils/projectIO';
import type { ToastType } from '../components/Toast';

const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 32;
const DEFAULT_LAYERS = 8;
const DEFAULT_PALETTE = ['#ff0000ff', '#00ff00ff', '#0000ffff', '#ffff00ff', '#ff00ffff', '#00ffffff',
  '#ff8800ff', '#8800ffff', '#008800ff', '#880000ff', '#000088ff', '#888888ff',
  '#ffffffff', '#000000ff', '#ff4488ff', '#44ff88ff'];

export function useProjectState(onToast: (msg: string, type?: ToastType) => void) {
  const loadInitialProject = () => {
    const saved = loadFromLocalStorage(undefined, () => onToast('Failed to load saved project from browser storage', 'error'));
    if (saved) {
      const { canvasState, timeline, brush } = deserializeProject(saved);
      return { canvasState, timeline, brush: { ...brush, palette: brush.palette || DEFAULT_PALETTE } };
    }
    const autosave = loadAutosave(() => onToast('Failed to load autosave from browser storage', 'error'));
    if (autosave) {
      const { canvasState, timeline, brush } = deserializeProject(autosave);
      return { canvasState, timeline, brush: { ...brush, palette: brush.palette || DEFAULT_PALETTE } };
    }
    return {
      canvasState: createCanvasState(DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_LAYERS),
      timeline: {
        fps: 12,
        totalFrames: 24,
        currentFrame: 0,
        frames: Array.from({ length: 24 }, () => ({ pixels: new Map(), hasKeyframe: false, duration: 1 })),
        playing: false,
        loop: true,
      },
      brush: { tool: 'point' as const, color: '#ff0000ff', size: 1, palette: DEFAULT_PALETTE },
    };
  };

  const initialProject = loadInitialProject();

  const [canvasState, setCanvasState] = useState<CanvasState>(initialProject.canvasState);
  const canvasStateRef = useRef(canvasState);
  useEffect(() => { canvasStateRef.current = canvasState; }, [canvasState]);

  const [brush, setBrush] = useState<BrushState>(initialProject.brush);
  const brushRef = useRef(brush);
  useEffect(() => { brushRef.current = brush; }, [brush]);

  const [renderMode, setRenderMode] = useState<'2d' | '3d'>('2d');
  const [voxelMode, setVoxelMode] = useState<'fast-draft' | 'final-bake'>('fast-draft');

  return {
    canvasState, setCanvasState, canvasStateRef,
    brush, setBrush, brushRef,
    renderMode, setRenderMode,
    voxelMode, setVoxelMode,
  };
}
