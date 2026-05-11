# Technical Debt Execution Plan

## Sprint 1 — Quick Wins ✅ COMPLETE

### 1. Remove duplicate useEffect in MultiCanvasView.tsx ✅
- **File**: `src/components/MultiCanvasView.tsx:422-428`
- **Issue**: Exact duplicate useEffect hooks causing wasteful re-renders
- **Fix**: Removed duplicate lines 427-428

### 2. Consolidate brush implementations ✅
- **Files**: `src/utils/brushSystem.ts` and `src/utils/brush.ts`
- **Issue**: Both files define identical brush handlers (point, line, bucket, eraser)
- **Fix**: Deleted `brush.ts` entirely (dead code, not imported anywhere)

### 3. Fix `as any` casts (6 instances) ✅
- `src/App.tsx:894` — Removed 'rect' from tool array (not a valid BrushTool)
- `src/components/MultiCanvasView.tsx:310,321` — Refactored touch handlers to extract core logic
- `src/components/VoxelScene.tsx:481,506,507` — Used module-level ref instead of attaching to renderer
- `src/components/Canvas2D.tsx:322,333` — Refactored touch handlers to extract core logic
- `src/components/PaletteManager.tsx:75` — Added explicit type annotation

### 4. Add toast notifications for localStorage failures ✅
- **File**: `src/utils/projectIO.ts`
- **Issue**: Catches errors but only warns, no user notification
- **Fix**: Added optional `onError` callback parameter to `saveToLocalStorage`, `loadFromLocalStorage`, `saveAutosave`, `loadAutosave`. Updated `App.tsx` to pass toast callbacks.

---

## Sprint 2-3 ✅ COMPLETE

### 5. Split App.tsx (985 lines)
- Extract hooks, handlers, and mobile layout into separate files
- **Status**: Pending — large refactor requiring careful dependency analysis

### 6. Add React.memo to canvas components ✅
- `Canvas2D` — Wrapped with React.memo
- `MultiCanvasView` — Wrapped with React.memo
- `VoxelScene` — Wrapped with React.memo

### 7. Extract handleMoveLayer into single function ✅
- **File**: `src/App.tsx`
- **Issue**: `handleMoveLayerUp` and `handleMoveLayerDown` shared ~60 lines of identical logic
- **Fix**: Extracted `handleMoveLayer(direction: -1 | 1)` function, `handleMoveLayerUp` and `handleMoveLayerDown` now call it

### 8. Fix Math.random() flicker in thumbnails ✅
- **File**: `src/components/Mobile/MobileTimeline.tsx:295`
- **Issue**: `Math.random()` in render caused flickering thumbnails
- **Fix**: Replaced with deterministic hash based on frame index and grid position

---

## Sprint 4-6

### 9. Extract GIF encoder from imageExporter.ts
- **File**: `src/utils/imageExporter.ts` (568 lines)
- Move GIF encoder class (~300 lines) to its own file

### 10. Add timeline virtualization
- **File**: `src/components/Timeline.tsx`
- Windowed rendering for 999-frame lists

### 11. Replace prompt() with modal dialog
- **File**: `src/components/LayerNavigator.tsx:29`

### 12. Add loading states for async operations
- **File**: `src/App.tsx:384-409`

---

## Backlog

### 13. Named Three.js imports for tree-shaking
- **File**: `src/App.tsx:2`

### 14. Enable TypeScript strict mode
- **File**: `tsconfig.json`

### 15. Add ESLint rules
- `no-any`, `no-magic-numbers`, `react-hooks/exhaustive-deps`
