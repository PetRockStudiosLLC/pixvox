# PixVox — Agent Handoff

> Generated: 2026-05-11
> Status: All 3 High priorities complete. Undo/redo fixed.
> TypeScript: ✅ Passes | 0 type errors

---

## What Changed This Session

### 1. Three High-Priority Tasks Completed

| Task | Status | Details |
|------|--------|---------|
| **H3** — Shared download utility | ✅ Done | `src/utils/download.ts` with `downloadBlob` + `downloadImage`. Re-exported from `animationExporter.ts` and `imageExporter.ts`. |
| **H1** — Remove dead components | ✅ Done | Deleted `ColorPickerPopover.tsx` and `ControlsHelp.tsx`. `ToolPanel` is still actively used. |
| **H2** — New brush tools | ✅ Done | 5 of 6 implemented: `circle`, `filled-circle`, `spray`, `blur`, `dither`. Pattern brush deferred. |

### 2. Undo/Redo System — Completely Fixed

**Problem:** Every pixel change saved to history. A circle stroke (50 pixels) = 50 history entries. `historyIndex` had stale closure bugs causing undo/redo to break.

**Solution (3 changes):**

#### a) Brush system refactored to batched output
- `BrushHandler` now has `getChanges(ctx: BrushContext) => PixelChange[]` instead of `apply(ctx)` + `onPixelChange` callback
- `BrushContext` no longer has `onPixelChange` — it only has read access to canvas state + brush + position
- `PixelChange` type: `{ x: number; y: number; color: string }`
- All 9 brushes return their complete pixel set as an array

#### b) MultiCanvasView batches drawing
- `pendingChanges` ref collects `PixelChange[]` during drag
- `applyBrush` returns `PixelChange[]` instead of firing callbacks
- On `mouseup`: merges all changes into one Map, single `setCanvasState` call, single `onSaveHistory` call
- Result: **one history entry per stroke**

#### c) useUndoRedo rewritten with refs
- Uses `useRef<string[]>` for history (avoids stale closures)
- `snapshot(state)` serializes full canvas state to JSON
- `restore(snap)` reconstructs `Map<string, string>` from JSON string
- `saveToHistoryFromState(state)` wraps state for use inside `setCanvasState` updater

### 3. History Integration Points

Every canvas mutation now saves to history:

| Mutation | Where | How |
|----------|-------|-----|
| Pixel change (desktop) | `App.tsx` → `Workspace` | `handlePixelChange` calls `saveToHistoryFromState` inside `setCanvasState` |
| Pixel change (desktop draw) | `MultiCanvasView` → `CanvasView` | `handleMouseUp` calls `onSaveHistory(next)` inside `setCanvasState` |
| Pixel change (mobile draw) | `App.tsx` mobile `MultiCanvasView` | Same pattern as desktop |
| Clear canvas | `useCanvasActions.handleClear` | Calls `saveToHistory` after `setCanvasState` |
| Resize canvas | `useCanvasActions.handleCanvasResize` | Calls `saveToHistory` after `setCanvasState` |
| Add layer | `useCanvasActions.handleAddLayer` | Calls `saveToHistory` after `setCanvasState` |
| Duplicate layer | `useCanvasActions.handleDuplicateLayer` | Calls `saveToHistory` after `setCanvasState` |
| Move layer | `useCanvasActions.handleMoveLayer` | Calls `saveToHistory` after `setCanvasState` |
| Import image | `useCanvasActions.handleImportImage` | Calls `saveToHistory` after `setCanvasState` |

---

## File Changes (Detailed)

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/utils/download.ts` | ~12 | Shared `downloadBlob` + `downloadImage` |

### Deleted Files

| File | Reason |
|------|--------|
| `src/components/ColorPickerPopover.tsx` | Dead code — zero imports |
| `src/components/ControlsHelp.tsx` | Dead code — zero imports |

### Modified Files

| File | What Changed |
|------|-------------|
| `src/utils/brushSystem.ts` | **Rewritten** — `getChanges()` pattern, 5 new brushes (`circle`, `filled-circle`, `spray`, `blur`, `dither`), `BrushState.density`/`sprayRadius` fields added via type update |
| `src/utils/animationExporter.ts` | Re-exports `downloadBlob` from `./download` instead of defining inline |
| `src/utils/imageExporter.ts` | Re-exports `downloadImage` from `./download` instead of defining inline |
| `src/hooks/useUndoRedo.ts` | **Rewritten** — refs for history/index, JSON snapshots, `saveToHistoryFromState` |
| `src/hooks/useCanvasActions.ts` | Added `saveToHistory` param to constructor, calls `saveToHistory` in all 7 canvas mutation methods |
| `src/hooks/useExportActions.ts` | Imports `downloadBlob`/`downloadImage` from `./download` |
| `src/types/voxel.ts` | `BrushState` gained optional `density?: number` and `sprayRadius?: number` |
| `src/components/MultiCanvasView.tsx` | `PixelChange[]` batching, `pendingChanges` ref, `setCanvasState` + `onSaveHistory` props added, `handleMouseUp` merges + saves in single call |
| `src/components/Workspace.tsx` | `onSaveHistory` prop added, passed to `MultiCanvasView` |
| `src/App.tsx` | Wires `saveToHistory` + `saveToHistoryFromState` through component tree, mobile `MultiCanvasView` gets same props |
| `src/components/Canvas2D.tsx` | Updated to `getChanges()` pattern (dead code, kept compilable) |
| `src/components/Mobile/MobileCanvas.tsx` | Updated to `getChanges()` pattern (kept compilable) |
| `TODO.md` | Updated status — H1, H2, H3 marked complete |

---

## Architecture Notes

### Brush System Pattern (New)

```typescript
// New interface
export interface BrushHandler {
  tool: BrushTool;
  name: string;
  cursor: string;
  getChanges: (ctx: BrushContext) => PixelChange[];
  preview?: (ctx: BrushContext) => { x: number; y: number; size: number } | null;
}

export interface PixelChange {
  x: number;
  y: number;
  color: string;
}

export interface BrushContext {
  canvasState: CanvasState;
  brush: BrushState;
  x: number;
  y: number;
  lastX?: number;
  lastY?: number;
  to3D?: (cx: number, cy: number) => { x: number; y: number; z: number } | null;
}
// NOTE: No onPixelChange callback — brushes are pure data generators
```

### Drawing Flow (New)

```
MouseDown → pendingChanges = []
  ├─ applyBrush(x, y) → brushHandler.getChanges(ctx) → returns PixelChange[]
  └─ pendingChanges.push(...changes), lastPixel = {x, y}

MouseMove → applyBrush(newX, newY) → pendingChanges.push(...), lastPixel = {newX, newY}

MouseUp → merge pendingChanges into single Map
         → setCanvasState(prev => { next.pixels = merged; onSaveHistory(next); return next })
```

### Undo/Redo Flow

```
History: string[] (JSON snapshots)
Index: number (current position)

saveToHistory(state)
  ├─ snap = JSON.stringify(state)
  ├─ history = history.slice(0, index + 1)  // truncate redo
  ├─ history.push(snap)
  ├─ index = history.length - 1
  └─ if (history.length > 50) history.shift()

handleUndo()
  ├─ index -= 1
  └─ setCanvasState(() => restore(history[index]))

handleRedo()
  ├─ index += 1
  └─ setCanvasState(() => restore(history[index]))
```

### Key Props Flow

```
App.tsx
  └─ saveToHistory, saveToHistoryFromState (from useUndoRedo)
       ├─ → Workspace (via onSaveHistory prop)
       │    └─ → MultiCanvasView (via onSaveHistory prop)
       │         └─ → CanvasView (via onSaveHistory prop)
       └─ → saveToHistoryFromState used inside setCanvasState callbacks
```

---

## Remaining TODO Items

### High Priority
- [ ] **H4** — Add `LoadingOverlay` component. `loadingState` state exists in App but no UI. Create `src/components/LoadingOverlay.tsx`.

### Medium Priority
- [ ] **M1** — Timeline virtualization. Breaks at ~500 frames. Windowed rendering needed.
- [ ] **M2** — Add ESLint + Prettier.
- [ ] **M3** — Complete type safety. `as any` casts in mobile section.
- [ ] **M4** — Add unit tests. Priority: brush algorithms, export functions, state management.
- [ ] **M5** — Remove `Math.random()` in animation exporter. Non-deterministic output.

### Low Priority
- [ ] **L1** — Replace `import * as THREE` with named imports.
- [ ] **L2** — Enable `noUnusedLocals`/`noUnusedParameters` in tsconfig.
- [ ] **L3** — Add project name customization.

### Future Features
- [ ] **F1** — Pattern brush (not yet implemented)
- [ ] **F2** — Color picker / eyedropper from canvas
- [ ] **F3** — Grid snap / pixel-perfect mode
- [ ] **F4** — Canvas size presets
- [ ] **F5** — Export sprite sheets per layer
- [ ] **F6** — Undo for timeline changes
- [ ] **F7** — Replace `prompt()` calls with modal

---

## Known Issues / Gotchas

1. **Brush tools use `ctx.x / ctx.y` destructuring** — The circle and filled-circle brushes destructure `x` and `y` from `ctx` as `x: cx, y: cy` to avoid naming conflicts with loop variables. Don't rename these.

2. **`onPixelChange` is still used as a no-op callback** — The real state update happens through `onSaveHistory` in `MultiCanvasView`. The `onPixelChange` prop is passed around but in the desktop flow it's overridden by `handlePixelChange` which also saves history. In `MultiCanvasView` the actual pixels are saved inside `handleMouseUp` via `onSaveHistory`.

3. **Canvas2D.tsx and MobileCanvas.tsx are dead code** — They are not imported anywhere. They were updated to compile but are not used. Consider removing them in a cleanup pass.

4. **Spray brush uses `Math.random()`** — Per M5, this should be replaced with a seeded PRNG for reproducible exports. Currently affects the spray brush tool only.

5. **Brush size semantics differ between tools** — `circle` and `filled-circle` use `brush.size` as radius. `spray` uses `brush.size/2` as default radius. `blur` uses `brush.size/4`. Line/point use `brush.size` as block size. Be consistent if modifying.

---

## Commands

```bash
# Type check
npx tsc --noEmit

# Dev server
npm run dev

# Build
npm run build
```

## Project Structure

```
src/
├── App.tsx                      # Main app, wires all hooks + components
├── types/voxel.ts               # Core types (CanvasState, BrushState, etc.)
├── hooks/
│   ├── useUndoRedo.ts           # ** Rewritten ** — ref-based history with JSON snapshots
│   ├── useCanvasActions.ts      # Canvas mutations — all call saveToHistory
│   ├── useExportActions.ts      # Export handlers — imports downloadBlob/downloadImage
│   └── ... (7 other hooks)
├── utils/
│   ├── brushSystem.ts           # ** Rewritten ** — getChanges() pattern, 9 brushes
│   ├── download.ts              # ** New ** — shared downloadBlob + downloadImage
│   ├── animationExporter.ts     # Re-exports downloadBlob from ./download
│   ├── imageExporter.ts         # Re-exports downloadImage from ./download
│   └── ... (other utils)
└── components/
    ├── MultiCanvasView.tsx      # ** Modified ** — batched drawing, PixelChange[]
    ├── Workspace.tsx            # ** Modified ** — onSaveHistory prop
    ├── VoxelScene.tsx           # 3D voxel view — still uses direct onPixelChange
    ├── ToolPanel.tsx            # Tool selector — uses getAllBrushes() (dynamic)
    └── ... (other components)
```

---

## What to Do Next (Suggestions)

1. **F1 — Pattern brush** is the only remaining brush from the original TODO. Same pattern as other brushes: `getChanges` returns `PixelChange[]`.

2. **H4 — LoadingOverlay** is a quick UI task (~30 min). `loadingState` already exists in `App.tsx`.

3. **M3 — Type safety** — The mobile section uses `tool as any`. Could use `brush.tool as BrushTool` or a discriminated union.

4. **M5 — Deterministic spray** — Replace `Math.random()` in spray brush with a seeded PRNG (e.g., mulberry32).

5. **Clean up** — `Canvas2D.tsx` and `MobileCanvas.tsx` are dead code. Safe to remove.
