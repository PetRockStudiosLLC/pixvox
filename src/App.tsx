import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CanvasState, BrushState, TimelineState, FrameData } from './types/voxel';
import { createCanvasState } from './utils/canvasBuffer';
import {
  serializeProject,
  deserializeProject,
  saveToLocalStorage,
  loadFromLocalStorage,
  loadAutosave,
  saveAutosave,
  clearAutosave,
  downloadProject,
  estimateProjectSize,
  type ProjectFile,
} from './utils/projectIO';
import {
  exportPNG,
  exportSpriteSheet,
  exportAnimatedGIF,
  downloadImage,
} from './utils/imageExporter';
import MultiCanvasView from './components/MultiCanvasView';
import Toolbar from './components/Toolbar';
import LayerNavigator from './components/LayerNavigator';
import VoxelScene from './components/VoxelScene';
import PaletteManager from './components/PaletteManager';
import ControlsHelp from './components/ControlsHelp';
import Workspace from './components/Workspace';
import { ToastProvider, useToast } from './components/Toast';
import { exportGLTF, exportAnimatedGLTF, downloadFile } from './utils/objExporter';

const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 32;
const DEFAULT_LAYERS = 8;
const DEFAULT_PALETTE = ['#ff0000ff', '#00ff00ff', '#0000ffff', '#ffff00ff', '#ff00ffff', '#00ffffff',
  '#ff8800ff', '#8800ffff', '#008800ff', '#880000ff', '#000088ff', '#888888ff',
  '#ffffffff', '#000000ff', '#ff4488ff', '#44ff88ff'];

function AppInner() {
  const { toast } = useToast();

  // Load project or create defaults
  const loadInitialProject = () => {
    const saved = loadFromLocalStorage();
    if (saved) {
      const { canvasState, timeline, brush } = deserializeProject(saved);
      return { canvasState, timeline, brush: { ...brush, palette: brush.palette || DEFAULT_PALETTE } };
    }
    const autosave = loadAutosave();
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

  const [timeline, setTimeline] = useState<TimelineState>(initialProject.timeline);
  const timelineRef = useRef(timeline);
  useEffect(() => { timelineRef.current = timeline; }, [timeline]);

  // Auto-save with debounce
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        saveAutosave(canvasStateRef.current, timelineRef.current, brushRef.current);
      }, 5000);
    };
    handler();
    return () => clearTimeout(timer);
  }, []);

  // Re-trigger auto-save on state changes
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    timer = setTimeout(() => {
      saveAutosave(canvasStateRef.current, timelineRef.current, brushRef.current);
    }, 5000);
    return () => clearTimeout(timer);
  }, [canvasState, timeline]);

  const handleBrushChange = useCallback((newBrush: BrushState) => {
    setBrush(newBrush);
    setMobileMenuOpen(false);
  }, []);

  const handleLoadPalette = useCallback((colors: string[]) => {
    setBrush(prev => ({ ...prev, palette: colors, color: colors[0] || prev.color }));
  }, []);

  const handleColorPick = useCallback((color: string) => {
    if (!color || color === '#00000000') return;
    setBrush(prev => {
      const currentPalette = prev.palette || [];
      const newPalette = currentPalette.includes(color)
        ? currentPalette
        : [...currentPalette, color];
      return { ...prev, palette: newPalette, color };
    });
  }, []);

  // Animation playback
  const currentFrameRef = useRef(timeline.currentFrame);
  useEffect(() => { currentFrameRef.current = timeline.currentFrame; }, [timeline.currentFrame]);

  // Sync current canvas pixels → current frame, then load target frame pixels → canvas
  const handleFrameChange = useCallback((frame: number) => {
    setTimeline(prev => {
      const newFrames = prev.frames.map(f => f);
      // Save current frame's canvas state
      if (newFrames[prev.currentFrame]) {
        newFrames[prev.currentFrame] = {
          ...newFrames[prev.currentFrame],
          pixels: new Map(canvasStateRef.current.pixels),
        };
      }
      // Load target frame into canvas
      const target = newFrames[frame];
      if (target) {
        setCanvasState(cs => ({ ...cs, pixels: new Map(target.pixels) }));
      }
      return { ...prev, frames: newFrames, currentFrame: frame };
    });
  }, []);

  const handleKeyframeAdd = useCallback(() => {
    setTimeline(prev => {
      const newFrames = [...prev.frames];
      if (newFrames[prev.currentFrame]) {
        // Save current canvas to this frame first
        newFrames[prev.currentFrame] = {
          ...newFrames[prev.currentFrame],
          pixels: new Map(canvasStateRef.current.pixels),
          hasKeyframe: true,
        };
      }
      return { ...prev, frames: newFrames };
    });
    toast(`Keyframe set at frame ${timeline.currentFrame + 1}`, 'success');
  }, [timeline.currentFrame, toast]);

  const handleKeyframeDelete = useCallback((frame: number) => {
    setTimeline(prev => {
      const newFrames = [...prev.frames];
      if (newFrames[frame]) {
        newFrames[frame] = { ...newFrames[frame], hasKeyframe: false };
      }
      return { ...prev, frames: newFrames };
    });
    toast(`Keyframe removed from frame ${frame + 1}`, 'warning');
  }, [toast]);

  const handleTimelineChange = useCallback((newTimeline: TimelineState) => {
    setTimeline(prev => {
      let frames = [...prev.frames];
      // Adjust frames array to match new totalFrames
      while (frames.length < newTimeline.totalFrames) {
        frames.push({ pixels: new Map(), hasKeyframe: false, duration: 1 });
      }
      if (frames.length > newTimeline.totalFrames) {
        frames = frames.slice(0, newTimeline.totalFrames);
      }
      return {
        ...newTimeline,
        frames,
        currentFrame: Math.min(newTimeline.currentFrame, newTimeline.totalFrames - 1),
      };
    });
  }, []);

  const handleFrameReorder = useCallback((fromIndex: number, toIndex: number) => {
    setTimeline(prev => {
      const newFrames = [...prev.frames];
      const [moved] = newFrames.splice(fromIndex, 1);
      newFrames.splice(toIndex, 0, moved);
      return { ...prev, frames: newFrames, currentFrame: toIndex };
    });
  }, []);

  const handleFrameDurationChange = useCallback((frameIndex: number, duration: number) => {
    setTimeline(prev => {
      const newFrames = [...prev.frames];
      if (newFrames[frameIndex]) {
        newFrames[frameIndex] = { ...newFrames[frameIndex], duration: Math.max(1, duration) };
      }
      return { ...prev, frames: newFrames };
    });
  }, []);

  // Playback loop (respects frame duration)
  const tickCountRef = useRef(0);
  useEffect(() => {
    tickCountRef.current = 0;
  }, [timeline.currentFrame]);

  useEffect(() => {
    if (!timeline.playing) return;
    const interval = setInterval(() => {
      setTimeline(prev => {
        tickCountRef.current++;
        const frame = prev.frames[prev.currentFrame];
        const duration = frame ? frame.duration : 1;
        if (tickCountRef.current < duration) return prev;
        tickCountRef.current = 0;
        const next = prev.currentFrame + 1;
        if (next >= prev.frames.length) {
          if (prev.loop) {
            handleFrameChange(0);
          } else {
            return { ...prev, playing: false };
          }
        } else {
          handleFrameChange(next);
        }
        return prev;
      });
    }, 1000 / timeline.fps);
    return () => clearInterval(interval);
  }, [timeline.playing, timeline.fps, handleFrameChange]);

  // Undo/redo
  const [history, setHistory] = useState<CanvasState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(canvasState);
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [canvasState, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setCanvasState(history[newIndex]);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setCanvasState(history[newIndex]);
  }, [history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        isCtrlPressed.current = true;
        document.body.classList.add('ctrl-pressed');
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setRenderMode(prev => prev === '2d' ? '3d' : '2d');
      }
      if (e.key === ' ') {
        e.preventDefault();
        setTimeline(prev => ({ ...prev, playing: !prev.playing }));
      }
      if (e.key === 'k' && !e.ctrlKey) {
        handleKeyframeAdd();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleFrameChange(Math.max(0, currentFrameRef.current - 1));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleFrameChange(Math.min(timeline.totalFrames - 1, currentFrameRef.current + 1));
      }
      if (e.key === 'Home') {
        e.preventDefault();
        handleFrameChange(0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        handleFrameChange(timeline.totalFrames - 1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        isCtrlPressed.current = false;
        document.body.classList.remove('ctrl-pressed');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.body.classList.remove('ctrl-pressed');
    };
  }, [handleUndo, handleRedo, handleFrameChange, timeline.totalFrames]);

  const isCtrlPressed = useRef(false);

  const handlePixelChange = useCallback((x: number, y: number, z: number, color: string) => {
    saveToHistory();
    setCanvasState(prev => {
      const next = { ...prev, pixels: new Map(prev.pixels) };
      const key = `${x},${y},${z}`;
      if (color.endsWith('00') || color === '#00000000') {
        next.pixels.delete(key);
      } else {
        next.pixels.set(key, color);
      }
      return next;
    });
  }, [saveToHistory]);

  const getCurrentProject = useCallback((): ProjectFile => {
    return serializeProject(canvasStateRef.current, timelineRef.current, brushRef.current);
  }, []);

  const handleSave = useCallback(() => {
    const project = getCurrentProject();
    saveToLocalStorage(project);
    clearAutosave();
    toast(`Project saved! (${estimateProjectSize(project)})`, 'success');
  }, [getCurrentProject, toast]);

  const handleSaveProject = useCallback(() => {
    const project = getCurrentProject();
    downloadProject(project);
    toast(`Project exported! (${estimateProjectSize(project)})`, 'success');
  }, [getCurrentProject, toast]);

  const handleLoadProject = useCallback(async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.p2v.json,.json';
      const filePromise = new Promise<File | null>((resolve) => {
        input.onchange = () => {
          if (input.files && input.files[0]) resolve(input.files[0]);
          else resolve(null);
        };
        input.click();
      });
      const file = await filePromise;
      if (!file) return;
      const text = await file.text();
      const project = JSON.parse(text) as ProjectFile;
      const { canvasState: loadedCanvas, timeline: loadedTimeline, brush: loadedBrush } = deserializeProject(project);
      setCanvasState(loadedCanvas);
      setTimeline(loadedTimeline);
      setBrush({ ...loadedBrush, palette: loadedBrush.palette || DEFAULT_PALETTE });
      toast('Project loaded!', 'success');
    } catch (error) {
      console.error('Failed to load project:', error);
      toast('Load failed: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  }, [toast]);

  const handleExportGLTF = useCallback(() => {
    try {
      const { content, filename, mimeType } = exportGLTF(canvasState, voxelMode);
      if (!content) { toast('No voxels to export!', 'warning'); return; }
      downloadFile(content, filename, mimeType);
      toast(`Exported ${filename}`, 'success');
    } catch (error) {
      console.error('Failed to export GLTF:', error);
      toast('Export failed: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  }, [canvasState, voxelMode, toast]);

  const handleExportAnimatedGLTF = useCallback(() => {
    try {
      const { content, filename, mimeType } = exportAnimatedGLTF(canvasState, timeline);
      if (!content) { toast('No frames to export!', 'warning'); return; }
      downloadFile(content, filename, mimeType);
      toast(`Exported animated GLTF: ${filename}`, 'success');
    } catch (error) {
      console.error('Failed to export animated GLTF:', error);
      toast('Animated export failed: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  }, [canvasState, timeline, toast]);

  const handleExportPNG = useCallback(async () => {
    try {
      const { blob, filename } = await exportPNG(canvasState);
      downloadImage(blob, filename);
      toast('PNG exported!', 'success');
    } catch (error) {
      console.error('Failed to export PNG:', error);
      toast('PNG export failed', 'error');
    }
  }, [canvasState, toast]);

  const handleExportSpriteSheet = useCallback(async () => {
    try {
      const { blob, filename } = await exportSpriteSheet(timeline, canvasState.width, canvasState.height);
      downloadImage(blob, filename);
      toast('Sprite sheet exported!', 'success');
    } catch (error) {
      console.error('Failed to export sprite sheet:', error);
      toast('Sprite sheet export failed', 'error');
    }
  }, [timeline, canvasState, toast]);

  const handleExportGIF = useCallback(async () => {
    try {
      const { blob, filename } = await exportAnimatedGIF(timeline, canvasState.width, canvasState.height);
      downloadImage(blob, filename);
      toast('GIF exported!', 'success');
    } catch (error) {
      console.error('Failed to export GIF:', error);
      toast('GIF export failed', 'error');
    }
  }, [timeline, canvasState, toast]);

  const handleClear = useCallback(() => {
    toast('Canvas cleared', 'warning');
    setCanvasState(prev => ({ ...prev, pixels: new Map() }));
  }, [toast]);

  const handleCanvasResize = useCallback((width: number, height: number) => {
    setCanvasState(prev => {
      const newState = createCanvasState(width, height, prev.layers);
      prev.pixels.forEach((color, key) => {
        const [xStr, yStr, zStr] = key.split(',').map(Number);
        const [x, y, z] = [xStr, yStr, zStr];
        if (x < width && y < height && z < prev.layers) {
          newState.pixels.set(key, color);
        }
      });
      return newState;
    });
    toast(`Canvas resized to ${width}x${height}`, 'info');
  }, [toast]);

  const handleAddLayer = useCallback(() => {
    setCanvasState(prev => {
      const newLayers = prev.layers + 1;
      const newState = createCanvasState(prev.width, prev.height, newLayers);
      prev.pixels.forEach((color, key) => newState.pixels.set(key, color));
      newState.layerInfo = [...prev.layerInfo, { name: `Layer ${newLayers}`, visible: true, locked: false, opacity: 100 }];
      newState.activeLayer = newLayers - 1;
      return newState;
    });
    toast('Layer added', 'success');
  }, [toast]);

  const handleDuplicateLayer = useCallback(() => {
    setCanvasState(prev => {
      const newLayers = prev.layers + 1;
      const newState = createCanvasState(prev.width, prev.height, newLayers);
      prev.pixels.forEach((color, key) => newState.pixels.set(key, color));
      const sourceInfo = prev.layerInfo[prev.activeLayer];
      newState.layerInfo = [...prev.layerInfo, { ...sourceInfo, name: `${sourceInfo.name} (copy)` }];
      const activeZ = prev.activeLayer;
      const newZ = prev.layers;
      prev.pixels.forEach((color, key) => {
        const [xStr, yStr, zStr] = key.split(',');
        const [x, y, z] = [parseInt(xStr), parseInt(yStr), parseInt(zStr)];
        if (z === activeZ) {
          newState.pixels.set(`${x},${y},${newZ}`, color);
        }
      });
      newState.activeLayer = newLayers - 1;
      return newState;
    });
    toast('Layer duplicated', 'success');
  }, [toast]);

  const handleMoveLayerUp = useCallback(() => {
    setCanvasState(prev => {
      if (prev.activeLayer === 0) return prev;
      const newLayerInfo = [...prev.layerInfo];
      const sourceInfo = newLayerInfo[prev.activeLayer];
      const destInfo = newLayerInfo[prev.activeLayer - 1];
      newLayerInfo[prev.activeLayer] = destInfo;
      newLayerInfo[prev.activeLayer - 1] = sourceInfo;
      const newState = { ...prev, pixels: new Map(prev.pixels), layerInfo: newLayerInfo };
      const sourceZ = prev.activeLayer;
      const destZ = prev.activeLayer - 1;
      const sourcePixels = Array.from(prev.pixels.entries()).filter(([key]) => {
        const [, , zStr] = key.split(',');
        return parseInt(zStr) === sourceZ;
      });
      const destPixels = Array.from(prev.pixels.entries()).filter(([key]) => {
        const [, , zStr] = key.split(',');
        return parseInt(zStr) === destZ;
      });
      sourcePixels.forEach(([key]) => newState.pixels.delete(key));
      destPixels.forEach(([key]) => newState.pixels.delete(key));
      sourcePixels.forEach(([key, color]) => {
        const [xStr, yStr] = key.split(',').slice(0, 2);
        newState.pixels.set(`${xStr},${yStr},${destZ}`, color);
      });
      destPixels.forEach(([key, color]) => {
        const [xStr, yStr] = key.split(',').slice(0, 2);
        newState.pixels.set(`${xStr},${yStr},${sourceZ}`, color);
      });
      newState.activeLayer = destZ;
      return newState;
    });
  }, []);

  const handleMoveLayerDown = useCallback(() => {
    setCanvasState(prev => {
      if (prev.activeLayer === prev.layers - 1) return prev;
      const newLayerInfo = [...prev.layerInfo];
      const sourceInfo = newLayerInfo[prev.activeLayer];
      const destInfo = newLayerInfo[prev.activeLayer + 1];
      newLayerInfo[prev.activeLayer] = destInfo;
      newLayerInfo[prev.activeLayer + 1] = sourceInfo;
      const newState = { ...prev, pixels: new Map(prev.pixels), layerInfo: newLayerInfo };
      const sourceZ = prev.activeLayer;
      const destZ = prev.activeLayer + 1;
      const sourcePixels = Array.from(prev.pixels.entries()).filter(([key]) => {
        const [, , zStr] = key.split(',');
        return parseInt(zStr) === sourceZ;
      });
      const destPixels = Array.from(prev.pixels.entries()).filter(([key]) => {
        const [, , zStr] = key.split(',');
        return parseInt(zStr) === destZ;
      });
      sourcePixels.forEach(([key]) => newState.pixels.delete(key));
      destPixels.forEach(([key]) => newState.pixels.delete(key));
      sourcePixels.forEach(([key, color]) => {
        const [xStr, yStr] = key.split(',').slice(0, 2);
        newState.pixels.set(`${xStr},${yStr},${destZ}`, color);
      });
      destPixels.forEach(([key, color]) => {
        const [xStr, yStr] = key.split(',').slice(0, 2);
        newState.pixels.set(`${xStr},${yStr},${sourceZ}`, color);
      });
      newState.activeLayer = destZ;
      return newState;
    });
  }, []);

  const handleImportImage = useCallback(async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      const filePromise = new Promise<File | null>((resolve) => {
        input.onchange = () => {
          if (input.files && input.files[0]) resolve(input.files[0]);
          else resolve(null);
        };
        input.click();
      });
      const file = await filePromise;
      if (!file) return;
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      tempCanvas.width = canvasState.width;
      tempCanvas.height = canvasState.height;
      ctx.drawImage(image, 0, 0, canvasState.width, canvasState.height);
      const imageData = ctx.getImageData(0, 0, canvasState.width, canvasState.height);
      const data = imageData.data;
      setCanvasState(prev => {
        const next = { ...prev, pixels: new Map(prev.pixels) };
        const z = prev.activeLayer;
        for (let y = 0; y < prev.height; y++) {
          for (let x = 0; x < prev.width; x++) {
            const key = `${x},${y},${z}`;
            next.pixels.delete(key);
          }
        }
        for (let y = 0; y < prev.height; y++) {
          for (let x = 0; x < prev.width; x++) {
            const i = (y * prev.width + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a === 0) continue;
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
            const key = `${x},${y},${z}`;
            next.pixels.set(key, hex);
          }
        }
        return next;
      });
      URL.revokeObjectURL(image.src);
      toast('Image imported!', 'success');
    } catch (error) {
      console.error('Failed to import image:', error);
      toast('Import failed: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  }, [canvasState, toast]);

  // Mobile state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'draw' | 'palette' | 'layers' | '3d'>('draw');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [sheetMinimized, setSheetMinimized] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [activeView, setActiveView] = useState<'main' | 'front' | 'left' | 'right' | 'top' | 'bottom'>('main');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sheetTouchStart, setSheetTouchStart] = useState({ x: 0, y: 0 });

  const handleTouchStartMobile = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEndMobile = (e: React.TouchEvent) => {
    if (!touchStart.x || !touchStart.y) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const views: ('main' | 'front' | 'left' | 'right' | 'top' | 'bottom')[] = ['main', 'front', 'left', 'right', 'top', 'bottom'];
      const currentIndex = views.indexOf(activeView);
      if (deltaX > 0 && currentIndex > 0) setActiveView(views[currentIndex - 1]);
      else if (deltaX < 0 && currentIndex < views.length - 1) setActiveView(views[currentIndex + 1]);
    }
    setTouchStart({ x: 0, y: 0 });
  };

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    setSheetTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (!sheetTouchStart.x || !sheetTouchStart.y) return;
    const deltaY = e.changedTouches[0].clientY - sheetTouchStart.y;
    if (Math.abs(deltaY) > 50) {
      if (deltaY < -50) setSheetMinimized(false);
      else if (deltaY > 50) {
        if (sheetMinimized) setShowBottomSheet(false);
        else setSheetMinimized(true);
      }
    }
    setSheetTouchStart({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-screen bg-surface text-text overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col flex-1 min-h-0">
        <Workspace
          canvasState={canvasState}
          setCanvasState={setCanvasState}
          brush={brush}
          onBrushChange={handleBrushChange}
          onCanvasResize={handleCanvasResize}
          renderMode={renderMode}
          setRenderMode={setRenderMode}
          voxelMode={voxelMode}
          setVoxelMode={setVoxelMode}
          handleExportGLTF={handleExportGLTF}
          handleExportAnimatedGLTF={handleExportAnimatedGLTF}
          handleExportPNG={handleExportPNG}
          handleExportSpriteSheet={handleExportSpriteSheet}
          handleExportGIF={handleExportGIF}
          handleSave={handleSave}
          handleClear={handleClear}
          handleSaveProject={handleSaveProject}
          handleLoadProject={handleLoadProject}
          handleAddLayer={handleAddLayer}
          handleDuplicateLayer={handleDuplicateLayer}
          handleMoveLayerUp={handleMoveLayerUp}
          handleMoveLayerDown={handleMoveLayerDown}
          handleImportImage={handleImportImage}
          handlePixelChange={handlePixelChange}
          handleColorPick={handleColorPick}
          isCtrlPressed={isCtrlPressed}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          timeline={timeline}
          onTimelineChange={handleTimelineChange}
          onFrameChange={handleFrameChange}
          onKeyframeAdd={handleKeyframeAdd}
          onKeyframeDelete={handleKeyframeDelete}
          onFrameReorder={handleFrameReorder}
          onFrameDurationChange={handleFrameDurationChange}
        />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col flex-1 min-h-0">
        <div className="bg-panel-header border-b border-border px-3 py-2 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-bold text-accent tracking-wider">PIXVOX</h1>
          <div className="flex items-center gap-2 bg-panel px-2 py-0.5 rounded-sm border border-border-light">
            <span className="text-[9px] uppercase font-bold text-text-dim">L</span>
            <span className="text-xs font-mono text-accent">{canvasState.activeLayer + 1}</span>
          </div>
        </div>

        <div className="flex-1 relative min-h-0" onTouchStart={handleTouchStartMobile} onTouchEnd={handleTouchEndMobile}>
          {mobileTab === 'draw' && (
            <div className="h-full flex flex-col relative">
              <div className="flex-1 min-h-0 bg-surface">
                <MultiCanvasView canvasState={canvasState} brush={brush} onPixelChange={handlePixelChange} onColorPick={handleColorPick} isCtrlPressed={isCtrlPressed} />
              </div>
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[90%] z-10">
                <div className="bg-panel/95 backdrop-blur-sm rounded-md p-3 border border-border shadow-lg">
                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                    <div className="flex-shrink-0">
                      <input type="color" value={brush.color.slice(0, 7)} onChange={(e) => setBrush({ ...brush, color: e.target.value })} className="w-10 h-10 rounded-sm cursor-pointer border border-border-light bg-transparent" />
                    </div>
                    <div className="flex gap-1">
                      {['point', 'rect', 'line', 'eraser'].map((tool) => (
                        <button key={tool} onClick={() => setBrush({ ...brush, tool: tool as any })} className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all ${brush.tool === tool ? 'bg-accent-dim text-text-bright' : 'bg-panel-hover text-text-dim'}`}>
                          <span className="text-xs font-bold uppercase">{tool[0]}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <input type="range" min={1} max={8} value={brush.size} onChange={(e) => setBrush({ ...brush, size: parseInt(e.target.value) })} className="w-full blender-slider" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'palette' && (
            <div className="h-full overflow-y-auto p-4 bg-surface pb-32">
              <h2 className="text-sm font-bold mb-4 text-text-dim uppercase tracking-wider">Palette Manager</h2>
              <PaletteManager currentColors={brush.palette || []} onLoadPalette={handleLoadPalette} />
            </div>
          )}

          {mobileTab === 'layers' && (
            <div className="h-full overflow-y-auto p-4 bg-surface pb-32">
              <h2 className="text-sm font-bold mb-4 text-text-dim uppercase tracking-wider">Layer Management</h2>
              <LayerNavigator layers={canvasState.layers} activeLayer={canvasState.activeLayer} layerInfo={canvasState.layerInfo} canvasState={canvasState} onLayerChange={(layer) => setCanvasState(prev => ({ ...prev, activeLayer: layer }))} onAddLayer={handleAddLayer} onDuplicateLayer={handleDuplicateLayer} onMoveLayerUp={handleMoveLayerUp} onMoveLayerDown={handleMoveLayerDown} onImportImage={handleImportImage} onToggleVisibility={(layer) => { setCanvasState(prev => { const newInfo = [...prev.layerInfo]; newInfo[layer] = { ...newInfo[layer], visible: !newInfo[layer].visible }; return { ...prev, layerInfo: newInfo }; }); }} onToggleLock={(layer) => { setCanvasState(prev => { const newInfo = [...prev.layerInfo]; newInfo[layer] = { ...newInfo[layer], locked: !newInfo[layer].locked }; return { ...prev, layerInfo: newInfo }; }); }} onRenameLayer={(layer, name) => { setCanvasState(prev => { const newInfo = [...prev.layerInfo]; newInfo[layer] = { ...newInfo[layer], name }; return { ...prev, layerInfo: newInfo }; }); }} />
            </div>
          )}

          {mobileTab === '3d' && (
            <div className="h-full relative bg-surface">
              <VoxelScene canvasState={canvasState} mode={voxelMode} />
              <div className="absolute top-4 right-4 z-10">
                <button onClick={() => setVoxelMode(voxelMode === 'fast-draft' ? 'final-bake' : 'fast-draft')} className="px-3 py-1.5 bg-panel/90 backdrop-blur-sm rounded-sm text-xs font-bold border border-border-light">
                  {voxelMode === 'fast-draft' ? 'Draft' : 'Final'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-panel border-t border-border flex-shrink-0">
          <div className="flex items-stretch justify-around h-14">
            <button onClick={() => { setMobileTab('draw'); setRenderMode('2d'); setShowBottomSheet(false); }} className={`flex-1 flex items-center justify-center transition-colors ${mobileTab === 'draw' ? 'text-accent bg-panel-hover' : 'text-text-dim hover:text-text'}`}>
              <span className="text-xs font-bold">Draw</span>
            </button>
            <button onClick={() => { setMobileTab('palette'); setShowBottomSheet(false); }} className={`flex-1 flex items-center justify-center transition-colors ${mobileTab === 'palette' ? 'text-accent bg-panel-hover' : 'text-text-dim hover:text-text'}`}>
              <span className="text-xs font-bold">Palette</span>
            </button>
            <button onClick={() => { setMobileTab('layers'); setShowBottomSheet(false); }} className={`flex-1 flex items-center justify-center transition-colors ${mobileTab === 'layers' ? 'text-accent bg-panel-hover' : 'text-text-dim hover:text-text'}`}>
              <span className="text-xs font-bold">Layers</span>
            </button>
            <button onClick={() => { setMobileTab('3d'); setRenderMode('3d'); setShowBottomSheet(false); }} className={`flex-1 flex items-center justify-center transition-colors ${mobileTab === '3d' ? 'text-accent bg-panel-hover' : 'text-text-dim hover:text-text'}`}>
              <span className="text-xs font-bold">3D</span>
            </button>
            <button onClick={() => setShowBottomSheet(true)} className="flex-1 flex items-center justify-center text-text-dim hover:text-text">
              <span className="text-xs font-bold">More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Sheet for Mobile */}
      {showBottomSheet && (
        <div className="md:hidden fixed inset-0 z-50" onTouchStart={handleSheetTouchStart} onTouchEnd={handleSheetTouchEnd}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBottomSheet(false)} />
          <div className={`absolute bottom-0 left-0 right-0 bg-panel rounded-t-lg border-t border-border p-4 safe-pb transition-transform duration-300 ${sheetMinimized ? 'translate-y-[calc(100%-48px)]' : 'translate-y-0'}`}>
            <div className="w-12 h-1.5 bg-panel-hover rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setSheetMinimized(!sheetMinimized)} />
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-accent uppercase tracking-wider">
                {mobileTab === 'draw' && 'BRUSH'}
                {mobileTab === 'palette' && 'PALETTE'}
                {mobileTab === 'layers' && 'LAYERS'}
                {mobileTab === '3d' && '3D VIEW'}
              </h2>
              <button onClick={() => setShowBottomSheet(false)} className="w-8 h-8 flex items-center justify-center bg-panel-hover rounded-sm text-sm">X</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {mobileTab === 'draw' && (
                <div className="space-y-4">
                  <Toolbar compact brush={brush} onBrushChange={handleBrushChange} onCanvasResize={handleCanvasResize} />
                </div>
              )}
              {mobileTab === 'palette' && <PaletteManager currentColors={brush.palette || []} onLoadPalette={handleLoadPalette} />}
              {mobileTab === 'layers' && (
                <LayerNavigator layers={canvasState.layers} activeLayer={canvasState.activeLayer} layerInfo={canvasState.layerInfo} canvasState={canvasState} onLayerChange={(layer) => setCanvasState(prev => ({ ...prev, activeLayer: layer }))} onAddLayer={handleAddLayer} onDuplicateLayer={handleDuplicateLayer} onMoveLayerUp={handleMoveLayerUp} onMoveLayerDown={handleMoveLayerDown} onImportImage={handleImportImage} onToggleVisibility={(layer) => { setCanvasState(prev => { const newInfo = [...prev.layerInfo]; newInfo[layer] = { ...newInfo[layer], visible: !newInfo[layer].visible }; return { ...prev, layerInfo: newInfo }; }); }} onToggleLock={(layer) => { setCanvasState(prev => { const newInfo = [...prev.layerInfo]; newInfo[layer] = { ...newInfo[layer], locked: !newInfo[layer].locked }; return { ...prev, layerInfo: newInfo }; }); }} onRenameLayer={(layer, name) => { setCanvasState(prev => { const newInfo = [...prev.layerInfo]; newInfo[layer] = { ...newInfo[layer], name }; return { ...prev, layerInfo: newInfo }; }); }} />
              )}
              {mobileTab === '3d' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button onClick={() => setVoxelMode('fast-draft')} className={`flex-1 py-2 rounded-sm text-sm transition-colors ${voxelMode === 'fast-draft' ? 'bg-accent-dim text-text-bright' : 'bg-panel-hover text-text-dim'}`}>Fast Draft</button>
                    <button onClick={() => setVoxelMode('final-bake')} className={`flex-1 py-2 rounded-sm text-sm transition-colors ${voxelMode === 'final-bake' ? 'bg-accent-dim text-text-bright' : 'bg-panel-hover text-text-dim'}`}>Final Bake</button>
                  </div>
                  <div className="text-xs text-text-dim">Voxel count: {canvasState.pixels.size}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

export default App;
