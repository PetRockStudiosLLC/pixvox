# Session Hand-off — Voxel Physics Engine

## Status: Phase A-E Complete, Build Passing

All 5 phases of the voxel physics engine have been implemented and integrated. TypeScript compiles clean, Vite builds successfully.

---

## What Was Built

### Architecture

Custom WebGPU compute-based voxel physics engine running in a Web Worker. Simulates gravity, collision, rigid body dynamics, and fluid/sand simulation for up to 4096 active voxels in a 64³ world.

**Data layout:** SoA (Structure of Arrays) on GPU — each attribute in its own storage buffer for coalesced access.

**Double-buffering:** Ping-pong pattern — read from `current` buffers, write to `next` buffers, swap after each compute dispatch. No race conditions, no atomics needed.

**Spatial indexing:** Hash-based lookup via WGSL compute shader (prime-multiplier hash + linear probing in 65536 buckets).

### Compute Shader Passes (all in `VoxelPhysicsEngine.ts` inline WGSL)

| Pass | Workgroup Size | Purpose |
|------|---------------|---------|
| Gravity | 256 | Sand falls, fluid falls |
| Sand Slide | 256 | Sand slides diagonally when blocked below |
| Fluid Spread | 256 | Fluid spreads horizontally when blocked |
| Rigid Body | 64 | Velocity integration with gravity + damping + bounds clamping |

### Voxel Types

| Type | Value | Behavior |
|------|-------|----------|
| AIR | 0 | Empty space |
| SAND | 1 | Falls + slides (cellular automata) |
| FLUID | 2 | Falls + spreads (cellular automata) |
| STONE | 3 | Static, no physics |
| RIGID_BODY | 4 | Velocity-based with forces |

---

## File Map

```
src/
├── utils/voxelPhysics/
│   ├── VoxelData.ts              # SoA types, VOXEL_TYPE constants, PhysicsConfig
│   ├── VoxelPhysicsEngine.ts     # WebGPU engine: buffer creation, pipeline, dispatch, sync
│   ├── SpatialGrid.ts            # 3D spatial hash, voxelsFromCanvasState(), pack/unpack
│   └── physicsWorker.ts          # Web Worker: message handler, init/load/start/stop/destroy
├── components/
│   └── VoxelPhysicsViewport.tsx  # React component: replaces VoxelScene when physics enabled
├── vite-env.d.ts                 # WebGPU type declarations (Navigator.gpu, GPUDevice, etc.)
└── App.tsx                       # physicsEnabled state, wired into desktop + mobile
└── components/Workspace.tsx      # ⚡ Physics ON/OFF button in 3D toolbar
```

---

## Key Implementation Details

### Buffer Layout (SoA)

Each voxel uses 64 bytes total across 5 buffers:

| Buffer | Type | Size | Stride |
|--------|------|------|--------|
| positions | `vec4<u32>` | 16B | [x, y, z, pad] |
| types | `u32` | 4B | 0=air, 1=sand, 2=fluid, 3=stone, 4=rigidBody |
| colors | `u32` | 4B | packed RGB (0xRRGGBB) |
| velocities | `vec4<f32>` | 16B | [vx, vy, vz, pad] |
| active | `u32` | 4B | 1=alive, 0=dead |

### Ping-Pong Swap

After each dispatch, `swapBuffers()` exchanges `current` ↔ `next` pointers for all buffer pairs. Bind group is recreated with new buffer references.

### CPU-GPU Sync

Results read back via `GPUBuffer.MAP_READ` staging buffers. Transferable objects (`ArrayBuffer`) passed through Worker postMessage to avoid copying. Three.js `InstancedMesh` matrices updated per frame.

### Worker Communication Protocol

| From Main | To Worker | Response |
|-----------|-----------|----------|
| `{action: 'init'}` | Compile shaders, create buffers | `{action: 'initComplete', success, webgpuSupported}` |
| `{action: 'loadVoxels', voxels: [...]}` | Upload SoA data | `{action: 'voxelsLoaded', count}` |
| `{action: 'start'}` | Begin tick loop | `{action: 'started'}` |
| `{action: 'stop'}` | Stop tick loop | `{action: 'stopped'}` |
| `{action: 'tick'}` | Single physics step | `{action: 'ticked'}` |
| `{action: 'destroy'}` | Cleanup | `{action: 'destroyed'}` |

Physics updates flow **Worker → Main** via `physicsUpdate` messages with Transferable buffers.

---

## Current State

### Working
- WebGPU device acquisition and shader compilation
- SoA buffer creation and ping-pong swap
- 4 compute shader passes (gravity, sand slide, fluid spread, rigid body)
- Worker bootstrap and message protocol
- React component with physics toggle UI (desktop + mobile)
- Voxel loading from CanvasState → GPU buffers
- Result sync → Three.js InstancedMesh update
- TypeScript compiles clean, Vite builds successfully

### Not Yet Done
- **Brush integration:** Adding/removing voxels from physics engine via brush tools (addVoxel/removeVoxel methods exist but not wired to brushSystem.ts)
- **Voxel type assignment:** No UI to select sand/fluid/stone/rigid-body before placing voxels
- **Performance tuning:** Workgroup-shared memory for neighbor lookups, GPU-driven rendering (vertex shader reads positions directly)
- **Rigid body collision:** Inter-voxel collision detection exists in shader but needs tuning
- **Tauri backend:** Physics can be offloaded to Rust via Tauri commands for non-WebGPU platforms

---

## How to Test

1. Run `npm run dev`
2. Switch to 3D mode (Tab key or render mode toggle)
3. Draw some voxels on the canvas
4. Click **⚡ Physics OFF** → **⚡ Physics ON** in the 3D toolbar
5. Sand and fluid voxels should fall with gravity
6. Toggle back to OFF to return to static rendering

---

## Next Steps (If Continuing)

1. **Wire brush tools to physics:** In `brushSystem.ts`, after `onPixelChange`, call `physicsEngine.addVoxel(x, y, z, type, color)` with a type selector
2. **Add type selector UI:** Button group in toolbar to pick sand/fluid/stone/rigid-body before placing
3. **Fix addVoxel/removeVoxel sync:** Currently uses synchronous queue writes; should use proper async read-back or a command queue pattern
4. **Optimize neighbor lookup:** Replace hash-based lookup with workgroup-shared 3D array tile for <32³ worlds
5. **GPU-driven rendering:** Move position reads from CPU to vertex shader — eliminates staging buffer sync entirely
6. **Tauri fallback:** When WebGPU unavailable, run physics simulation in Rust worker thread

---

## Known Issues

- `addVoxel`/`removeVoxel` have stale count logic — uses synchronous queue writes without proper read-back sync
- Rigid body bounce uses simplified floor check — needs proper AABB collision against voxel grid
- No undo/redo integration for physics state changes
- Worker bundle (~20KB) could be smaller with tree-shaking of unused compute passes
