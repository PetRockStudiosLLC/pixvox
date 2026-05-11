# PixVox — TODO

## Sprint Summary

| Metric | Before | After |
|--------|--------|-------|
| `src/App.tsx` | 1,054 lines | **373 lines** (−65%) |
| `src/utils/imageExporter.ts` | 568 lines | **190 lines** (−67%) |
| New `src/utils/gifEncoder.ts` | — | 240 lines |
| New `src/hooks/` | — | 10 hooks |

---

## Critical

- [x] **C1** Split `App.tsx` (1,054→373 lines) into 10 hooks in `src/hooks/`
- [x] **C2** Extract GIF encoder from `imageExporter.ts` (568→190 lines) into `src/utils/gifEncoder.ts`

## High

- [x] **H1** Remove dead components: `ColorPickerPopover`, `ControlsHelp`
  - Removed: `src/components/ColorPickerPopover.tsx`, `src/components/ControlsHelp.tsx`
  - Note: `ToolPanel` still actively used in `Workspace.tsx`
  - Estimated: 30 min

- [x] **H2** Implement missing brush tools (6 of 6 implemented)
  - [x] `circle` — Bresenham circle outline
  - [x] `spray` — spray brush with density/sprayRadius params
  - [x] `filled-circle` — solid circle fill
  - [x] `blur` — average neighbor pixel colors
  - [x] `dither` — Floyd-Steinberg dither overlay
  - [ ] `pattern` — stamp sprite pattern onto canvas (deferred)
  - Location: `src/utils/brushSystem.ts` + `src/types/voxel.ts`
  - Estimated: 2-4 hours (circle + spray first)

- [x] **H3** Share `downloadBlob` utility
  - Created `src/utils/download.ts`, re-exported from `animationExporter.ts` and `imageExporter.ts`
  - Estimated: 15 min

- [ ] **H4** Add `LoadingOverlay` component
  - `loadingState` state already exists in App — just needs UI
  - Create `src/components/LoadingOverlay.tsx`
  - Overlay with message text on semi-transparent backdrop
  - Estimated: 30 min

## Medium

- [ ] **M1** Timeline virtualization
  - Timeline renders all frames — breaks at ~500 frames
  - Implement windowed rendering with scrollable viewport
  - Location: `src/components/Timeline.tsx`
  - Estimated: 2 hours

- [ ] **M2** Add ESLint + Prettier
  - Recommended rules: `no-any`, `react-hooks/exhaustive-deps`, `no-magic-numbers`, `no-unused-vars`
  - Consider `@typescript-eslint/explicit-function-return-type` for hooks
  - Estimated: 1 hour

- [ ] **M3** Complete type safety
  - `as any` casts still present in App.tsx mobile section
  - `BrushState.tool` uses `as any` casting for tool strings
  - Consider discriminated unions or const-typed tool registry
  - Estimated: 1 hour

- [ ] **M4** Add unit tests
  - Priority targets:
    - Brush algorithms: Bresenham line, flood fill bucket
    - Export functions: `renderFrameToCanvas`, `exportPNG`
    - State management: `useUndoRedo`, `useTimeline`
  - Suggested framework: Vitest (compatible with Vite)
  - Estimated: 3-5 hours

- [ ] **M5** Remove `Math.random()` in animation exporter
  - Non-deterministic output for same input breaks reproducible exports
  - Replace with seeded PRNG or remove randomness
  - Location: `src/utils/animationExporter.ts`
  - Estimated: 30 min

## Low

- [ ] **L1** Replace `import * as THREE from 'three'` with named imports
  - Full Three.js bundle increases tree-shaking difficulty
  - Use: `import { OrbitControls } from 'three/examples...'` etc.
  - Estimated: 30 min

- [ ] **L2** Enable `noUnusedLocals`/`noUnusedParameters` in tsconfig
  - Catches silent dead variables and unused function params
  - Estimated: 15 min + cleanup

- [ ] **L3** Add project name customization
  - Currently hardcoded as `'Untitled'` in `serializeProject`
  - Could be a field in CanvasState or a separate project metadata state
  - Estimated: 30 min

## Feature Expansion (Future)

- [ ] **F1** Pattern brush — stamp a pixel art sprite onto the canvas
- [ ] **F2** Color picker / eyedropper — sample colors from canvas
- [ ] **F3** Grid snap / pixel-perfect mode — toggle grid overlay
- [ ] **F4** Canvas size presets — 16x16, 32x32, 64x64, 128x128
- [ ] **F5** Export sprite sheets per layer
- [ ] **F6** Undo for timeline changes (currently only canvas is undoable)
- [ ] **F7** Replace `prompt()` calls with custom modal dialog
- [ ] **F8** Timeline virtualization for large frame lists (>500)
- [ ] **F9** Add E2E tests (Playwright or Cypress)
- [ ] **F10** CI/CD pipeline — automated build + test on PR
- [ ] **F11** Web publishing — deploy to GitHub Pages / Vercel
- [ ] **F12** Cloud save sync — Supabase or Firebase backend
- [ ] **F13** iOS support — requires macOS for Tauri iOS build

---

## File Sizes (Updated)

| File | Lines | Status |
|------|-------|--------|
| `src/App.tsx` | **373** | ✅ Split (was 1,054) |
| `src/utils/gifEncoder.ts` | **240** | ✅ New (extracted) |
| `src/utils/imageExporter.ts` | **190** | ✅ Split (was 568) |
| `src/utils/brushSystem.ts` | **~380** | ✅ Added 6 brush tools |
| `src/utils/download.ts` | **10** | ✅ New (shared) |
| `src/utils/projectIO.ts` | 365 | ✅ Good |
| `src/components/VoxelScene.tsx` | 548 | ⚠️ Consider splitting |
| `src/components/MultiCanvasView.tsx` | ~450 | ✅ Acceptable |
| `src/hooks/useExportActions.ts` | **120** | ✅ New |
| `src/hooks/useProjectActions.ts` | — | ❌ Deleted (split into smaller hooks) |
| `src/hooks/useTimeline.ts` | **108** | ✅ New |
| `src/hooks/useCanvasActions.ts` | **163** | ✅ New |
| `src/hooks/useSaveActions.ts` | **73** | ✅ New |
| `src/hooks/useImportActions.ts` | **96** | ✅ New |
| `src/hooks/useMobileUI.ts` | **86** | ✅ New |
| `src/hooks/useProjectState.ts` | **55** | ✅ New |
| `src/hooks/useUndoRedo.ts` | **38** | ✅ New |
| `src/hooks/useAutoSave.ts` | **28** | ✅ New |
| `src/hooks/usePlayback.ts` | **26** | ✅ New |
| `src/hooks/useKeyboard.ts` | **66** | ✅ New |

## Project Health

| Metric | Status |
|--------|--------|
| TypeScript compile | ✅ Passes |
| Production build | ✅ Passes (~880 KB JS) |
| Dead imports | 5 fixed, 0 remaining |
| Type errors | 0 |
| Technical debt items | 11 remaining (2 high, 5 medium, 3 low) |
| Test coverage | 0% |
| ESLint | Not configured |
| Brush tools | 9/10 implemented (pattern pending) |
