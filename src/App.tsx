import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CanvasState, BrushState } from './types/voxel';
import { createCanvasState, saveToLocalStorage, loadFromLocalStorage, exportProject, importProject } from './utils/canvasBuffer';
import MultiCanvasView from './components/MultiCanvasView';
import Toolbar from './components/Toolbar';
import LayerNavigator from './components/LayerNavigator';
import VoxelScene from './components/VoxelScene';
import PaletteManager from './components/PaletteManager';
import ControlsHelp from './components/ControlsHelp';
import { exportGLTF, downloadFile } from './utils/objExporter';

const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 32;
const DEFAULT_LAYERS = 8;

function App() {
  const [canvasState, setCanvasState] = useState<CanvasState>(() => {
    const saved = loadFromLocalStorage();
    return saved ?? createCanvasState(DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_LAYERS);
  });

  const [brush, setBrush] = useState<BrushState>({
    tool: 'point',
    color: '#ff0000ff', // Red with full alpha
    size: 1,
    palette: ['#ff0000ff', '#00ff00ff', '#0000ffff', '#ffff00ff', '#ff00ffff', '#00ffffff',
      '#ff8800ff', '#8800ffff', '#008800ff', '#880000ff', '#000088ff', '#888888ff',
      '#ffffffff', '#000000ff', '#ff4488ff', '#44ff88ff']
  });

  const [renderMode, setRenderMode] = useState<'2d' | '3d'>('2d');
  const [voxelMode, setVoxelMode] = useState<'fast-draft' | 'final-bake'>('fast-draft');

  const handleBrushChange = useCallback((newBrush: BrushState) => {
    setBrush(newBrush);
    setMobileMenuOpen(false); // Close mobile menu on brush change
  }, []);

  const handleLoadPalette = useCallback((colors: string[]) => {
    setBrush(prev => ({ ...prev, palette: colors, color: colors[0] || prev.color }));
  }, []);
  
  // Undo/redo functionality
  const [history, setHistory] = useState<CanvasState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Save state to history for undo/redo
  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      // Remove any states after current index (if we've undone and then made a new change)
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add current state
      newHistory.push(canvasState);
      // Limit history size to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift(); // Remove oldest state
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49)); // Increment index, max 49 (for 50 limit)
  }, [canvasState, historyIndex]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return; // Nothing to undo
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setCanvasState(history[newIndex]);
  }, [history, historyIndex]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return; // Nothing to redo
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setCanvasState(history[newIndex]);
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for Undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Ctrl+Shift+Z for Redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
      // Tab to switch between 2D and 3D
      if (e.key === 'Tab') {
        e.preventDefault();
        setRenderMode(prev => prev === '2d' ? '3d' : '2d');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);
  
  // Ref for 3D preview container
  const previewRef = useRef<HTMLDivElement>(null);
  // Ref for layer previews container
  const layerPreviewsRef = useRef<HTMLDivElement>(null);
  // Ref for 3D preview scene
  const previewSceneRef = useRef<THREE.Scene | null>(null);
  const previewCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const previewRendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Initialize 3D preview
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    previewSceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    previewCameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(200, 200);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    previewRendererRef.current = renderer;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
    };
  }, []);

    const handlePixelChange = useCallback((x: number, y: number, z: number, color: string) => {
      saveToHistory(); // Save current state before making changes
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

  const handleSave = useCallback(() => {
    saveToLocalStorage(canvasState);
    alert('Project saved to localStorage!');
  }, [canvasState]);

  const handleExportGLTF = useCallback(() => {
    try {
      const { content, filename, mimeType } = exportGLTF(canvasState, voxelMode);
      
      if (!content) {
        alert('No voxels to export!');
        return;
      }
      
      // Download GLTF file
      downloadFile(content, filename, mimeType);
      
      alert('GLTF exported successfully! Check your downloads for ' + filename);
    } catch (error) {
      console.error('Failed to export GLTF:', error);
      alert('Failed to export GLTF: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, [canvasState, voxelMode]);

   const handleClear = useCallback(() => {
     if (confirm('Clear entire canvas?')) {
       setCanvasState(prev => ({
         ...prev,
         pixels: new Map(),
       }));
     }
   }, []);

    const handleCanvasResize = useCallback((width: number, height: number) => {
      setCanvasState(prev => {
        // Create new state with desired dimensions
        const newState = createCanvasState(width, height, prev.layers);
        // Copy existing pixels that fit within new bounds
        prev.pixels.forEach((color, key) => {
          const [xStr, yStr, zStr] = key.split(',').map(Number);
          const [x, y, z] = [xStr, yStr, zStr];
          // Only copy pixels that fit within new canvas dimensions
          if (x < width && y < height && z < prev.layers) {
            newState.pixels.set(key, color);
          }
        });
        return newState;
      });
    }, []);

    // Layer management functions
    const handleAddLayer = useCallback(() => {
      setCanvasState(prev => {
        const newLayers = prev.layers + 1;
        const newState = createCanvasState(prev.width, prev.height, newLayers);
        // Copy existing pixels
        prev.pixels.forEach((color, key) => {
          newState.pixels.set(key, color);
        });
        // Set active layer to the newly added layer
        newState.activeLayer = newLayers - 1;
        return newState;
      });
    }, []);

    const handleDuplicateLayer = useCallback(() => {
      setCanvasState(prev => {
        const newLayers = prev.layers + 1;
        const newState = createCanvasState(prev.width, prev.height, newLayers);
        // Copy existing pixels
        prev.pixels.forEach((color, key) => {
          newState.pixels.set(key, color);
        });
        // Duplicate the active layer to the new layer
        const activeZ = prev.activeLayer;
        const newZ = prev.layers; // New layer index
        prev.pixels.forEach((color, key) => {
          const [xStr, yStr, zStr] = key.split(',').map(Number);
          const [x, y, z] = [xStr, yStr, zStr];
          if (z === activeZ) {
            // Copy pixel to new layer
            newState.pixels.set(`${x},${y},${newZ}`, color);
          }
        });
        // Set active layer to the newly duplicated layer
        newState.activeLayer = newLayers - 1;
        return newState;
      });
    }, []);

    const handleMoveLayerUp = useCallback(() => {
      setCanvasState(prev => {
        if (prev.activeLayer === 0) return prev; // Already at top
        
        // Create new state
        const newState = { ...prev, pixels: new Map(prev.pixels) };
        
        // Move the active layer up by swapping its pixels with the layer above
        const sourceZ = prev.activeLayer;
        const destZ = prev.activeLayer - 1;
        
        // Collect source layer pixels
        const sourcePixels = Array.from(prev.pixels.entries())
          .filter(([key]) => {
            const [, , zStr] = key.split(',');
            return parseInt(zStr) === sourceZ;
          });
        
        // Collect destination layer pixels
        const destPixels = Array.from(prev.pixels.entries())
          .filter(([key]) => {
            const [, , zStr] = key.split(',');
            return parseInt(zStr) === destZ;
          });
        
        // Clear both layers
        sourcePixels.forEach(([key]) => newState.pixels.delete(key));
        destPixels.forEach(([key]) => newState.pixels.delete(key));
        
        // Swap the pixels
        sourcePixels.forEach(([key, color]) => {
          const [xStr, yStr] = key.split(',').slice(0, 2);
          newState.pixels.set(`${xStr},${yStr},${destZ}`, color);
        });
        
        destPixels.forEach(([key, color]) => {
          const [xStr, yStr] = key.split(',').slice(0, 2);
          newState.pixels.set(`${xStr},${yStr},${sourceZ}`, color);
        });
        
        // Update active layer
        newState.activeLayer = destZ;
        
        return newState;
      });
    }, []);

    const handleMoveLayerDown = useCallback(() => {
      setCanvasState(prev => {
        if (prev.activeLayer === prev.layers - 1) return prev; // Already at bottom
        
        // Create new state
        const newState = { ...prev, pixels: new Map(prev.pixels) };
        
        // Move the active layer down by swapping its pixels with the layer below
        const sourceZ = prev.activeLayer;
        const destZ = prev.activeLayer + 1;
        
        // Collect source layer pixels
        const sourcePixels = Array.from(prev.pixels.entries())
          .filter(([key]) => {
            const [, , zStr] = key.split(',');
            return parseInt(zStr) === sourceZ;
          });
        
        // Collect destination layer pixels
        const destPixels = Array.from(prev.pixels.entries())
          .filter(([key]) => {
            const [, , zStr] = key.split(',');
            return parseInt(zStr) === destZ;
          });
        
        // Clear both layers
        sourcePixels.forEach(([key]) => newState.pixels.delete(key));
        destPixels.forEach(([key]) => newState.pixels.delete(key));
        
        // Swap the pixels
        sourcePixels.forEach(([key, color]) => {
          const [xStr, yStr] = key.split(',').slice(0, 2);
          newState.pixels.set(`${xStr},${yStr},${destZ}`, color);
        });
        
        destPixels.forEach(([key, color]) => {
          const [xStr, yStr] = key.split(',').slice(0, 2);
          newState.pixels.set(`${xStr},${yStr},${sourceZ}`, color);
        });
        
        // Update active layer
        newState.activeLayer = destZ;
        
        return newState;
      });
    }, []);

    const handleImportImage = useCallback(async () => {
      try {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        // Promise to handle file selection
        const filePromise = new Promise<File | null>((resolve) => {
          input.onchange = () => {
            if (input.files && input.files[0]) {
              resolve(input.files[0]);
            } else {
              resolve(null);
            }
          };
          input.click();
        });
        
        const file = await filePromise;
        if (!file) return;
        
        // Create an image element to load the file
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
        
        // Create a temporary canvas to process the image
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        // Set canvas size to match current layer dimensions
        tempCanvas.width = canvasState.width;
        tempCanvas.height = canvasState.height;
        
        // Draw the image onto the canvas, scaling to fit
        ctx.drawImage(image, 0, 0, canvasState.width, canvasState.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvasState.width, canvasState.height);
        const data = imageData.data;
        
        // Update the active layer with the image data
        setCanvasState(prev => {
          const next = { ...prev, pixels: new Map(prev.pixels) };
          const z = prev.activeLayer;
          
          // Clear existing pixels in the active layer
          for (let y = 0; y < prev.height; y++) {
            for (let x = 0; x < prev.width; x++) {
              const key = `${x},${y},${z}`;
              next.pixels.delete(key);
            }
          }
          
          // Set new pixels from image data
          for (let y = 0; y < prev.height; y++) {
            for (let x = 0; x < prev.width; x++) {
              const i = (y * prev.width + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              
              // Skip fully transparent pixels
              if (a === 0) continue;
              
              // Convert to hex color
              const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
              const key = `${x},${y},${z}`;
              next.pixels.set(key, hex);
            }
          }
          
          return next;
        });
        
        // Clean up
        URL.revokeObjectURL(image.src);
      } catch (error) {
        console.error('Failed to import image:', error);
        alert('Failed to import image: ' + (error instanceof Error ? error.message : String(error)));
      }
    }, [canvasState]);

    // Save project to JSON file
    const handleSaveProject = useCallback(() => {
      const json = exportProject(canvasState);
      downloadFile(json, 'p2v-project.json', 'application/json');
    }, [canvasState]);

    // Load project from JSON file
    const handleLoadProject = useCallback(async () => {
      try {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        // Promise to handle file selection
        const filePromise = new Promise<File | null>((resolve) => {
          input.onchange = () => {
            if (input.files && input.files[0]) {
              resolve(input.files[0]);
            } else {
              resolve(null);
            }
          };
          input.click();
        });
        
        const file = await filePromise;
        if (!file) return;
        
        // Read the file
        const text = await file.text();
        const loadedState = importProject(text);
        
        // Update the canvas state
        setCanvasState(loadedState);
        
        alert('Project loaded successfully!');
      } catch (error) {
        console.error('Failed to load project:', error);
        alert('Failed to load project: ' + (error instanceof Error ? error.message : String(error)));
      }
    }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white">
      {/* Mobile header with menu toggle */}
      <div className="md:hidden flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <h1 className="text-lg font-bold text-cyan-400">PixVox</h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-white"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Left sidebar - Tools (hidden on mobile unless menu is open) */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-gray-800 p-4 flex flex-col gap-4 border-r border-gray-700 overflow-y-auto md:relative absolute top-12 left-0 z-50 md:z-auto h-[calc(100vh-3rem)] md:h-auto`}>
        <h1 className="hidden md:block text-xl font-bold text-cyan-400">PixVox</h1>
        <Toolbar brush={brush} onBrushChange={handleBrushChange} onCanvasResize={handleCanvasResize} />
        <PaletteManager
          currentColors={brush.palette || []}
          onLoadPalette={handleLoadPalette}
        />
        <ControlsHelp />


        <div className="space-y-2">
          <button
            onClick={() => setRenderMode(renderMode === '2d' ? '3d' : '2d')}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
          >
            Switch to {renderMode === '2d' ? '3D View' : '2D Canvas'}
          </button>

          <div className="flex gap-1">
            <button
              onClick={() => setVoxelMode('fast-draft')}
              className={`flex-1 px-2 py-1 rounded text-xs ${
                voxelMode === 'fast-draft' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Fast Draft
            </button>
            <button
              onClick={() => setVoxelMode('final-bake')}
              className={`flex-1 px-2 py-1 rounded text-xs ${
                voxelMode === 'final-bake' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Final Bake
            </button>
          </div>

          <button
            onClick={handleExportGLTF}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
          >
            Export GLTF
          </button>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded"
          >
            Save Project
          </button>

          <button
            onClick={handleClear}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Clear Canvas
          </button>
        </div>

        <div className="mt-auto text-xs text-gray-500">
          <div>Grid: {canvasState.width}×{canvasState.height}</div>
          <div>Layer: {canvasState.activeLayer + 1}/{canvasState.layers}</div>
          <div>Voxels: {canvasState.pixels.size}</div>
          <div>Mode: {voxelMode}</div>
        </div>

        <div className="mt-4 space-y-1">
          <button
            onClick={handleSaveProject}
            className="w-full px-3 py-2 md:py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm md:text-xs"
          >
            Save Project
          </button>
          <button
            onClick={handleLoadProject}
            className="w-full px-3 py-2 md:py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm md:text-xs"
          >
            Load Project
          </button>
        </div>
      </div>

      {/* Overlay to close mobile menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

       {/* Main canvas area with 3D preview */}
       <div className="flex-1 flex flex-col md:flex-row relative min-h-0 overflow-hidden">
           {renderMode === '2d' ? (
             <div className="flex-1 flex flex-col min-h-0">
                <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center gap-4 flex-shrink-0">
                   <span className="text-sm text-gray-300">Active Layer: {canvasState.activeLayer + 1}</span>
                   <LayerNavigator
                     layers={canvasState.layers}
                     activeLayer={canvasState.activeLayer}
                     onLayerChange={(layer) => setCanvasState(prev => ({ ...prev, activeLayer: layer }))}
                     onAddLayer={handleAddLayer}
                     onDuplicateLayer={handleDuplicateLayer}
                     onMoveLayerUp={handleMoveLayerUp}
                     onMoveLayerDown={handleMoveLayerDown}
                     onImportImage={handleImportImage}
                   />
                 </div>
                <div className="flex-1 min-h-0 p-1 md:p-2">
                  <MultiCanvasView
                    canvasState={canvasState}
                    brush={brush}
                    onPixelChange={handlePixelChange}
                  />
                </div>
             </div>
           ) : (
             <div className="flex-1 relative">
               <VoxelScene canvasState={canvasState} mode={voxelMode} />
             </div>
           )}

           {/* Persistent 3D Preview Panel (shows in both 2D and 3D modes) */}
           <div className="w-full md:w-80 bg-gray-800 border-t md:border-t-0 md:border-l border-gray-700 flex flex-col">
             <div className="p-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
               <span className="text-sm text-gray-300">3D Preview</span>
               <button
                 onClick={() => setVoxelMode(voxelMode === 'fast-draft' ? 'final-bake' : 'fast-draft')}
                 className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
               >
                 {voxelMode === 'fast-draft' ? 'Draft' : 'Final'}
               </button>
             </div>
             <div className="flex-1 min-h-48 md:min-h-0 relative">
               <VoxelScene canvasState={canvasState} mode={voxelMode} />
             </div>
             {/* Layer quick view */}
             <div className="p-2 border-t border-gray-700 flex-shrink-0">
               <div className="text-xs text-gray-400 mb-1">Layers (Active: {canvasState.activeLayer + 1})</div>
               <div className="flex gap-1 flex-wrap">
                 {Array.from({ length: Math.min(canvasState.layers, 8) }, (_, i) => (
                   <button
                     key={i}
                     onClick={() => setCanvasState(prev => ({ ...prev, activeLayer: i }))}
                     className={`w-6 h-6 text-xs rounded ${
                       i === canvasState.activeLayer
                         ? 'bg-cyan-600 text-white'
                         : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                     }`}
                   >
                     {i + 1}
                   </button>
                 ))}
                 {canvasState.layers > 8 && (
                   <span className="text-xs text-gray-500 self-center">+{canvasState.layers - 8} more</span>
                 )}
               </div>
              </div>
            </div>
          </div>
      </div>
    );
}

export default App;
