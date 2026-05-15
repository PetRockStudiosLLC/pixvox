# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.1.0] — 2026-05-15

### Added
- **3D model import** — Import GLTF, GLB, and OBJ models directly into the voxel canvas
- **OBJ + MTL support** — Full OBJ loading with MTL material parsing, per-material color extraction, and texture file selection
- **Blender-style voxelization** — Multi-directional surface sampling that accurately captures model geometry from all angles (not just +Z raycasting)
- **Per-mesh color preservation** — Models retain their original material colors through voxelization (trunk=brown, leaves=green, etc.)
- **Wireframe model preview** — Imported models display as wireframe in the 3D viewer before voxelization
- **Multi-format pipeline** — Two-step workflow: import model first, then voxelize separately with configurable resolution

### Fixed
- **Voxel grid alignment** — Corrected `Math.floor` shift in grid coordinate calculation, fixed bounding box return values
- **Triangle-box intersection** — Replaced flawed Separating Axis Theorem with robust AABB + vertex/edge intersection tests
- **Y-axis orientation** — Imported models now render upright (corrected coordinate system transform)
- **OBJ quad triangulation** — Triangle counter accounts for quads becoming 2 triangles, matching Three.js OBJLoader triangulation exactly

### Technical
- `src/utils/import/voxelize.ts` — Core voxelization with spatial hash, per-mesh triangle extraction, color sampling
- `src/utils/import/modelLoader.ts` — OBJ/GLTF/GLB loaders with MTL parsing, per-material mesh splitting, texture loading
- `src/hooks/useImportActions.ts` — Import/voxelize handlers with progress tracking, Y-axis flip, canvas centering
- `src/components/ModelImportDialog.tsx` — UI for model selection, MTL/texture file inputs, format detection
- `src/components/VoxelScene.tsx` — 3D viewer with wireframe preview, multi-mesh group traversal, camera auto-centering
- TypeScript compiles clean — 0 type errors

---

## [Unreleased]

---

## [1.0.2] — 2026-05-12

### Fixed
- **Brush preview** — Was offset by double the pan amount due to CSS transform + canvas coordinate double-application. Preview now correctly follows cursor at all times.
- **Brush centering** — Brush strokes were painting from cursor top-left instead of centered on cursor. All brushes now paint centered on the cursor position.

---

## [1.0.0] — 2026-05-11

### Added
- **9 brush tools** — point, line, eraser, circle, filled-circle, spray, blur, dither, bucket
- **Undo/Redo system** — batched drawing (one history entry per stroke), ref-based history state
- **WebGPU voxel physics engine** — Web Worker with double-buffered compute shaders for sand, fluid, stone, and rigid body simulation
- **Persistent 3D preview panel** — visible while drawing in 2D
- **Layer management** — add, duplicate, reorder, hide/show layers
- **Import image** — load external images onto the canvas
- **Download utilities** — shared `downloadBlob` / `downloadImage` for PNG export, GIF animation, and project save/load
- **Mobile UI** — native bottom tab bar layout, responsive canvas view
- **Tauri v2 integration** — native desktop and mobile app targets
- **Auto-save** — periodic canvas state persistence
- **Keyboard shortcuts** — standard edit and tool shortcuts

### Changed
- **App.tsx** — Split from 1,054 lines to 373 lines across 10 focused hooks in `src/hooks/`
- **Image exporter** — Extracted GIF encoder from 568-line monolith into separate `gifEncoder.ts` (190 → 240 split)
- **Brush system** — Refactored to pure `getChanges()` data generation pattern, no side effects
- **MultiCanvasView** — Batched pixel changes into single `setCanvasState` call per stroke

### Removed
- `ColorPickerPopover.tsx` — Dead code, zero imports
- `ControlsHelp.tsx` — Dead code, zero imports
- `useProjectActions.ts` — Split into smaller focused hooks

### Technical
- TypeScript compiles clean — 0 type errors
- All hooks follow single-responsibility: `useCanvasActions`, `useExportActions`, `useTimeline`, `useUndoRedo`, `useSaveActions`, `useImportActions`, `useMobileUI`, `useProjectState`, `useAutoSave`, `usePlayback`, `useKeyboard`

---

## [0.1.0] — Initial Release

- Initial project scaffold
- Basic 2D canvas drawing
- 3D voxel preview
- Project save/load
