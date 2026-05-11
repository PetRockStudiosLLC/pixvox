# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Fixed
- **Dither brush** — Was only painting a circle pattern because it read luminance from existing (blank) pixels instead of the target color. Fixed to use target brush color luminance, producing a proper Bayer 4x4 ordered dither across the stroke area.

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
