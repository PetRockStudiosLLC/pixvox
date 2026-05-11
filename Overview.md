# PixVox — Project Overview

## What It Is

**PixVox** is a cross-platform pixel art editor that transforms 2D pixel art into 3D voxel models. It's designed for game developers, pixel artists, and hobbyists who want to quickly prototype voxel assets and export them into industry-standard formats for use in Blender, Unity, Godot, or any other 3D/game engine.

---

## Current State

### Architecture

```
src/
├── App.tsx                       # Main app (1,018 lines) — state orchestrator
├── components/
│   ├── Canvas2D.tsx              # Single 2D canvas view
│   ├── MultiCanvasView.tsx       # 6-view synchronized layout (Main/Front/Left/Right/Top/Bottom)
│   ├── VoxelScene.tsx            # 3D preview using Three.js + OrbitControls
│   ├── Toolbar.tsx               # Brush/tool selection (desktop)
│   ├── ToolPanel.tsx             # Tool configuration panel
│   ├── PaletteManager.tsx        # Color palette UI
│   ├── Timeline.tsx              # Animation timeline (desktop)
│   ├── LayerNavigator.tsx        # Layer list with thumbnails
│   ├── RightPanel.tsx            # Export/settings panel
│   ├── TopBar.tsx                # App header bar
│   ├── StatusBar.tsx             # Status indicator bar
│   ├── Viewcube.tsx              # 3D view indicator (used in VoxelScene)
│   ├── ColorPickerPopover.tsx    # Color picker popup
│   ├── Workspace.tsx             # Desktop layout composition
│   ├── Toast.tsx                 # Toast notification system
│   ├── ControlsHelp.tsx          # Controls reference overlay
│   ├── LayerThumbnail.tsx        # Per-layer frame thumbnails
│   ├── Mobile/
│   │   ├── MobileBottomNav.tsx   # Tab bar (Draw/Palette/Layers/Voxel/Menu)
│   │   ├── MobileCanvas.tsx      # Mobile-optimized 2D canvas
│   │   ├── MobileTimeline.tsx    # Mobile timeline
│   │   ├── MobileToolbar.tsx     # Floating brush controls
│   │   ├── MobileMenu.tsx        # Mobile settings menu
│   │   ├── MobileLayerPanel.tsx  # Mobile layer management
│   │   ├── MobileColorPicker.tsx # Mobile color picker
│   │   └── MobileBottomSheet.tsx # Draggable bottom sheet
│   └── Icons/
│       └── index.tsx             # SVG icon library
├── utils/
│   ├── canvasBuffer.ts           # Pixel data management, state creation
│   ├── brushSystem.ts            # Modular brush handler registry (4 tools)
│   ├── projectIO.ts              # Project save/load, localStorage, file download
│   ├── objExporter.ts            # GLTF/OBJ voxel export
│   ├── imageExporter.ts          # PNG, sprite sheet, GIF export (568 lines)
│   ├── animationExporter.ts      # JSON animation, Alembic ABC, frame sequence export
│   ├── paletteManager.ts         # Color palette generation utilities
│   ├── meshBuilder.ts            # Voxel box geometry creation
│   ├── greedyMesher.ts           # Greedy meshing for optimized voxel meshes
│   └── spatialHash.ts            # Spatial hashing for fast voxel lookup
├── types/
│   └── voxel.ts                  # TypeScript interfaces (CanvasState, BrushState, etc.)
└── main.tsx / index.css          # Entry point + Tailwind styles
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 + TypeScript (strict mode) |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3 + PostCSS |
| 3D Rendering | Three.js 0.170 + OrbitControls |
| Native Apps | Tauri v2 (Rust backend) |
| State | React useState/useRef/useCallback |

### Features — Implemented

| Category | Features |
|----------|----------|
| **Canvas** | 2D pixel canvas (8x8 to 128x128), 6 synchronized views, per-view pixelSize |
| **Brushes** | Point, Line (Bresenham), Bucket Fill (flood fill), Eraser — modular registry system |
| **Layers** | Add, duplicate, reorder, rename, visibility toggle, lock toggle, opacity |
| **Animation** | 24-frame timeline, keyframes, frame duration, playback (spacebar), loop toggle |
| **Palette** | 16-color default palette, save/load palettes, random generation, color pick |
| **3D Preview** | Real-time Three.js viewport, fast-draft vs final-bake modes, Viewcube navigation |
| **Export — 3D** | GLTF/GLB (with vertex colors), OBJ+MTL, frame sequence GLTF, Alembic .abc (delta/snapshot) |
| **Export — 2D** | PNG, sprite sheet (N×M grid), animated GIF |
| **Animation I/O** | JSON animation format, Alembic ABC import |
| **Image Import** | Import PNG/JPEG/WebP images onto canvas (scaled to canvas size) |
| **Undo/Redo** | 50-step history stack (Ctrl+Z / Ctrl+Y) |
| **Persistence** | Auto-save to localStorage (5s debounce), manual save/load project files (.p2v.json) |
| **Mobile** | Full responsive layout: bottom tab bar, swipe navigation, floating toolbar, bottom sheets |
| **Native** | Windows desktop app (Tauri), Android APK (Tauri), iOS (planned) |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-6` | Switch views (Main, Front, Left, Right, Top, Bottom) |
| `Q/E` | Navigate layers down/up |
| `Tab` | Toggle 2D/3D view |
| `Ctrl+Z` | Undo |
| `Ctrl+Y / Ctrl+Shift+Z` | Redo |
| `Space` | Play/pause animation |
| `K` | Add keyframe |
| `←/→` | Navigate frames |
| `Home/End` | Jump to first/last frame |
| `Ctrl+S` | Save project |
| `Ctrl+O` | Open project |

---

## Issues Fixed

| # | Issue | Fix |
|---|-------|-----|
| 1 | Dead import: `Modal` (file didn't exist, but used in JSX) | Replaced with inline modal dialog (no external dependency) |
| 2 | Dead import: `LoadingOverlay` (file didn't exist, never rendered) | Removed import |
| 3 | Dead import: `ControlsHelp` (imported but never used in JSX) | Removed import |
| 4 | `CanvasState` missing `voxelTypes` property (used in canvasBuffer.ts) | Added `voxelTypes: Map<string, string>` to interface |
| 5 | `VoxelScene` missing `onTypeChange` prop | Added prop to interface, ref pattern, and destructuring |

---

## Known Issues & Technical Debt

### Critical

| ID | Issue | Impact | Location |
|----|-------|--------|----------|
| C1 | App.tsx is **1,018 lines** — single source of state, handlers, and JSX | Hard to maintain, test, and extend | `src/App.tsx` |
| C2 | `imageExporter.ts` is **568 lines** — GIF encoder (~300 lines) should be separate | Hard to maintain, slows builds | `src/utils/imageExporter.ts` |

### High

| ID | Issue | Impact | Location |
|----|-------|--------|----------|
| H1 | Unused components: `ColorPickerPopover`, `ToolPanel` (imported by Workspace but likely redundant with Toolbar) | Dead code, confusion | `src/components/` |
| H2 | Only 4 of 10 declared brush tools implemented | `circle`, `filled-circle`, `spray`, `pattern`, `blur`, `dither` are declared but missing | `src/types/voxel.ts:24` |
| H3 | `downloadBlob` only defined in `animationExporter.ts` but needed by image export | Should be shared utility | `src/utils/animationExporter.ts:565` |
| H4 | `loadingState` state exists but `LoadingOverlay` component is missing — loading indicators never shown | UX gap | `src/App.tsx:754` |

### Medium

| ID | Issue | Impact | Location |
|----|-------|--------|----------|
| M1 | No timeline virtualization — renders all 24 frames (OK now, but breaks at 500+) | Performance at scale | `src/components/Timeline.tsx` |
| M2 | No ESLint rules configured | Inconsistent code quality, no `no-any` or hook exhaustiveness checks | N/A |
| M3 | `as any` casts were removed in previous sprint but type safety is incomplete | Some loose typing remains | Various |
| M4 | No automated tests | No regression safety net | N/A |
| M5 | `Math.random()` in `Math.floor(Math.random() * 256)` used in animation exporter | Non-deterministic output for same input | `src/utils/animationExporter.ts` |

### Low

| ID | Issue | Impact | Location |
|----|-------|--------|----------|
| L1 | `import * as THREE from 'three'` — full Three.js bundle instead of named imports | Larger bundle size | `src/App.tsx:2` |
| L2 | No TypeScript `noUnusedLocals`/`noUnusedParameters` enforcement | Silent dead variables | `tsconfig.json` |
| L3 | Project metadata is hardcoded as `'Untitled'` in serialize | No user customization | `src/utils/projectIO.ts:72` |

---

## Recommendations — Where to Take This Project

### Phase 1: Stabilize (Quick Wins)

1. **Split App.tsx** — Extract into:
   - `useProjectState.ts` — canvas state + brush state + timeline state management
   - `useProjectActions.ts` — all handler functions (export, save, load, undo/redo)
   - `DesktopLayout.tsx` — desktop JSX
   - `MobileLayout.tsx` — mobile JSX
   - Target: Each file under 300 lines

2. **Extract GIF encoder** from `imageExporter.ts` into its own `GifEncoder` class/file

3. **Fix unused component cleanup** — remove or wire up `ColorPickerPopover`, `ToolPanel`, `ControlsHelp`

4. **Implement missing brushes** — start with `circle` and `spray` (simplest to implement)

### Phase 2: UX Improvements

5. **Add LoadingOverlay component** — wire up the existing `loadingState` state to a real overlay

6. **Add timeline virtualization** — windowed rendering for large frame lists

7. **Replace `prompt()` calls with custom modal** — LayerNavigator and any other prompt usage

8. **Add undo for timeline changes** — currently only canvas state is undoable

### Phase 3: Feature Expansion

9. **Pattern brush** — stamp a pixel art sprite onto the canvas

10. **Color picker / eyedropper** — sample colors from canvas instead of only from palette

11. **Grid snap / pixel-perfect mode** — toggle grid overlay, snap to grid

12. **Multiple canvas sizes preset** — 16x16, 32x32, 64x64, 128x128 presets for game dev standards

13. **Export sprite sheets per layer** — separate PNG sequences for each layer

### Phase 4: Professional Tooling

14. **Add ESLint + Prettier** — `no-any`, `react-hooks/exhaustive-deps`, `no-magic-numbers`

15. **Add unit tests** — test brush algorithms (Bresenham, flood fill), export functions, state management

16. **Add E2E tests** — test the full workflow: paint → animate → export

17. **CI/CD pipeline** — automated build + test on PR

### Phase 5: Platform Expansion

18. **iOS support** — requires macOS for Tauri iOS build

19. **Web publishing** — deploy to GitHub Pages / Vercel as a hosted web app

20. **Cloud save sync** — integrate with a backend (Supabase, Firebase) for cross-device sync

---

## Project Health Summary

| Metric | Status |
|--------|--------|
| TypeScript compile | ✅ Passes |
| Production build | ✅ Passes (877 KB JS) |
| Dead imports | 3 fixed, 0 remaining |
| Type errors | 0 |
| TODOs/FIXMEs in code | 0 |
| Technical debt items | 14 tracked |
| Test coverage | 0% (none written yet) |
| ESLint | Not configured |
| Mobile responsive | ✅ Full mobile layout |
| Desktop layout | ✅ Full desktop layout |

---

## File Sizes (Source)

| File | Lines | Category |
|------|-------|----------|
| `src/App.tsx` | 1,018 | ⚠️ Needs splitting |
| `src/utils/imageExporter.ts` | 568 | ⚠️ Needs splitting |
| `src/utils/projectIO.ts` | 365 | ✅ Good |
| `src/components/VoxelScene.tsx` | 548 | ⚠️ Consider splitting |
| `src/components/MultiCanvasView.tsx` | ~450 | ✅ Acceptable |
| `src/utils/brushSystem.ts` | 194 | ✅ Good |
| `src/components/Workspace.tsx` | 190 | ✅ Good |
| `src/types/voxel.ts` | 52 | ✅ Good |
