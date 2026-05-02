import { CanvasState, TimelineState } from '../types/voxel';

interface GLTF {
  asset: { version: string };
  scenes: { nodes: number[] }[];
  nodes: { mesh: number; translation?: [number, number, number] }[];
  meshes: {
    primitives: {
      attributes: { POSITION: number; COLOR_0: number };
      indices: number;
      material: number;
      targets?: { POSITION: number; COLOR_0: number }[];
    }[];
  }[];
  accessors: {
    bufferView: number;
    componentType: number;
    count: number;
    type: string;
    max?: number[];
    min?: number[];
  }[];
  bufferViews: { buffer: number; byteOffset: number; byteLength: number; target?: number }[];
  buffers: { byteLength: number; uri: string }[];
  materials: { pbrMetallicRoughness: { baseColorFactor: number[]; metallicFactor: number; roughnessFactor: number } }[];
  animations?: {
    channels: { sampler: number; target: { node: number; path: string } }[];
    samplers: { input: number; output: number; interpolation?: string }[];
  }[];
}

export function exportGLTF(canvasState: CanvasState, mode: 'fast-draft' | 'final-bake'): { content: string; filename: string; mimeType: string } {
  const { width, height, layers, pixels } = canvasState;

  const voxels: { x: number; y: number; z: number; color: string }[] = [];
  pixels.forEach((color, key) => {
    const [x, y, z] = key.split(',').map(Number);
    if (x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < layers) {
      voxels.push({ x, y, z, color });
    }
  });

  if (voxels.length === 0) {
    return { content: '', filename: '', mimeType: '' };
  }

  const verts = [
    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]
  ];

  const faces = [
    [0, 2, 1, 0, 3, 2],
    [5, 7, 4, 5, 6, 7],
    [4, 3, 0, 4, 7, 3],
    [1, 6, 5, 1, 2, 6],
    [3, 6, 2, 3, 7, 6],
    [4, 1, 5, 4, 0, 1]
  ];

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  voxels.forEach(({ x, y, z, color }) => {
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    verts.forEach(([vx, vy, vz]) => {
      positions.push(vx + x, vy + (height - 1 - y), vz + z);
      colors.push(r, g, b, 1.0);
    });

    faces.forEach(face => {
      face.forEach(idx => indices.push(idx + vertexOffset));
    });

    vertexOffset += 8;
  });

  const gltf: GLTF = {
    asset: { version: '2.0' },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, COLOR_0: 1 },
        indices: 2,
        material: 0
      }]
    }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        type: 'VEC3',
        max: [width, height, layers],
        min: [0, 0, 0]
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: colors.length / 4,
        type: 'VEC4'
      },
      {
        bufferView: 2,
        componentType: 5125,
        count: indices.length,
        type: 'SCALAR'
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length * 4, target: 34962 },
      { buffer: 0, byteOffset: positions.length * 4, byteLength: colors.length * 4, target: 34962 },
      { buffer: 0, byteOffset: (positions.length + colors.length) * 4, byteLength: indices.length * 4, target: 34963 }
    ],
    buffers: [{ byteLength: 0, uri: '' }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: 0.0,
        roughnessFactor: 0.9
      }
    }]
  };

  const positionBuffer = new Float32Array(positions);
  const colorBuffer = new Float32Array(colors);
  const indexBuffer = new Uint32Array(indices);

  const totalLength = positionBuffer.byteLength + colorBuffer.byteLength + indexBuffer.byteLength;
  const combinedBuffer = new Uint8Array(totalLength);

  let offset = 0;
  combinedBuffer.set(new Uint8Array(positionBuffer.buffer), offset);
  offset += positionBuffer.byteLength;
  combinedBuffer.set(new Uint8Array(colorBuffer.buffer), offset);
  offset += colorBuffer.byteLength;
  combinedBuffer.set(new Uint8Array(indexBuffer.buffer), offset);

  let binary = '';
  for (let i = 0; i < combinedBuffer.length; i++) {
    binary += String.fromCharCode(combinedBuffer[i]);
  }
  const base64 = btoa(binary);

  gltf.buffers[0] = {
    byteLength: totalLength,
    uri: "data:application/octet-stream;base64," + base64
  };

  const json = JSON.stringify(gltf, null, 2);
  const filename = `p2v-export-${mode}.gltf`;

  return { content: json, filename, mimeType: 'model/gltf+json' };
}

// Animated GLTF export using morph targets.
// glTF morph targets are ADDITIVE deltas: final = base + weight * delta
// Frame 0 becomes the base mesh, frames 1..N-1 become morph targets.
// A single animation drives a "weights" vector on the mesh node, one entry per morph target.
export function exportAnimatedGLTF(
  canvasState: CanvasState,
  timeline: TimelineState
): { content: string; filename: string; mimeType: string } {
  const { width, height, layers } = canvasState;
  const frames = timeline.frames;

  if (frames.length === 0) {
    return { content: '', filename: '', mimeType: '' };
  }

  // Collect all unique voxel keys across every frame so topology is fixed
  const allVoxelKeys = new Set<string>();
  frames.forEach(frame => {
    frame.pixels.forEach((_, key) => {
      const [x, y, z] = key.split(',').map(Number);
      if (x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < layers) {
        allVoxelKeys.add(key);
      }
    });
  });

  const voxelKeys = Array.from(allVoxelKeys);
  if (voxelKeys.length === 0) {
    return { content: '', filename: '', mimeType: '' };
  }

  const numVoxels = voxelKeys.length;
  const vertsPerVoxel = 8;
  const numVerts = numVoxels * vertsPerVoxel;

  const unitVerts: [number, number, number][] = [
    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]
  ];

  const unitFaces = [
    [0, 2, 1, 0, 3, 2],
    [5, 7, 4, 5, 6, 7],
    [4, 3, 0, 4, 7, 3],
    [1, 6, 5, 1, 2, 6],
    [3, 6, 2, 3, 7, 6],
    [4, 1, 5, 4, 0, 1]
  ];

  const parseRGBA = (hex: string): [number, number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) / 255 : 1.0;
    return [r, g, b, a];
  };

  const voxelWorldPos = (key: string): [number, number, number] => {
    const [x, y, z] = key.split(',').map(Number);
    return [x, height - 1 - y, z];
  };

  // Shared index buffer (topology never changes)
  const indices: number[] = [];
  let vertexOffset = 0;
  for (let vi = 0; vi < numVoxels; vi++) {
    unitFaces.forEach(face => {
      face.forEach(idx => indices.push(idx + vertexOffset));
    });
    vertexOffset += 8;
  }

  // Build base mesh from frame 0
  const basePos: number[] = Array.from(new Float32Array(numVerts * 3));
  const baseCol: number[] = Array.from(new Float32Array(numVerts * 4));
  const frame0 = frames[0];

  for (let vi = 0; vi < numVoxels; vi++) {
    const [px, py, pz] = voxelWorldPos(voxelKeys[vi]);
    const [r, g, b, a] = parseRGBA(frame0.pixels.get(voxelKeys[vi]) || '#808080ff');
    for (let cv = 0; cv < 8; cv++) {
      const [vx, vy, vz] = unitVerts[cv];
      const vi3 = (vi * 8 + cv) * 3;
      const vi4 = (vi * 8 + cv) * 4;
      basePos[vi3] = vx + px;
      basePos[vi3 + 1] = vy + py;
      basePos[vi3 + 2] = vz + pz;
      baseCol[vi4] = r;
      baseCol[vi4 + 1] = g;
      baseCol[vi4 + 2] = b;
      baseCol[vi4 + 3] = a;
    }
  }

  // Build morph targets as DELTAS from base (frames 1..N-1)
  const numMorphs = frames.length - 1;
  const morphPosData: number[][] = [];
  const morphColData: number[][] = [];

  for (let fi = 1; fi < frames.length; fi++) {
    const mPos: number[] = Array.from(new Float32Array(numVerts * 3));
    const mCol: number[] = Array.from(new Float32Array(numVerts * 4));
    const frame = frames[fi];

    for (let vi = 0; vi < numVoxels; vi++) {
      const [px, py, pz] = voxelWorldPos(voxelKeys[vi]);
      const [r, g, b, a] = parseRGBA(frame.pixels.get(voxelKeys[vi]) || '#808080ff');
      for (let cv = 0; cv < 8; cv++) {
        const [vx, vy, vz] = unitVerts[cv];
        const absPos = [vx + px, vy + py, vz + pz];
        const vi3 = (vi * 8 + cv) * 3;
        const vi4 = (vi * 8 + cv) * 4;
        // Delta = absolute - base
        mPos[vi3] = absPos[0] - basePos[vi3];
        mPos[vi3 + 1] = absPos[1] - basePos[vi3 + 1];
        mPos[vi3 + 2] = absPos[2] - basePos[vi3 + 2];
        mCol[vi4] = r - baseCol[vi4];
        mCol[vi4 + 1] = g - baseCol[vi4 + 1];
        mCol[vi4 + 2] = b - baseCol[vi4 + 2];
        mCol[vi4 + 3] = a - baseCol[vi4 + 3];
      }
    }

    morphPosData.push(mPos);
    morphColData.push(mCol);
  }

  // --- Build animation timing ---
  // Single sampler: time -> weights vector (one weight per morph target)
  // Frame 0: all weights = 0 (base mesh). Frame i (i>=1): weight[i-1] = 1, rest = 0.
  const fps = timeline.fps;
  const keyframeCount = frames.length + 1; // +1 to loop back to frame 0
  const animTimes = new Float32Array(keyframeCount);
  const animOutputs = new Float32Array(keyframeCount * numMorphs);

  let t = 0;
  for (let fi = 0; fi < frames.length; fi++) {
    animTimes[fi] = t;
    for (let mi = 0; mi < numMorphs; mi++) {
      animOutputs[fi * numMorphs + mi] = (fi === mi + 1) ? 1.0 : 0.0;
    }
    t += (frames[fi].duration || 1) / fps;
  }
  // Loop back
  animTimes[keyframeCount - 1] = t;
  for (let mi = 0; mi < numMorphs; mi++) {
    animOutputs[(keyframeCount - 1) * numMorphs + mi] = 0.0;
  }

  // --- Pack all data into a single buffer ---
  // Layout: basePos | baseCol | indices | morphPos[0..N] | morphCol[0..N] | animTimes | animOutputs
  const segments: { data: Uint8Array; target: number | undefined }[] = [];

  const pushF32 = (arr: number[]) => {
    const f = new Float32Array(arr);
    segments.push({ data: new Uint8Array(f.buffer), target: 34962 });
  };

  pushF32(basePos);            // accessor 0
  pushF32(baseCol);            // accessor 1
  segments.push({ data: new Uint8Array(new Uint32Array(indices).buffer), target: 34963 }); // accessor 2

  for (let mi = 0; mi < numMorphs; mi++) {
    pushF32(morphPosData[mi]); // accessor 3 + mi
    pushF32(morphColData[mi]); // accessor 3 + numMorphs + mi
  }

  pushF32(Array.from(animTimes)); // accessor 3 + numMorphs*2
  pushF32(Array.from(animOutputs)); // accessor 3 + numMorphs*2 + 1

  const totalBytes = segments.reduce((s, seg) => s + seg.data.length, 0);
  const combined = new Uint8Array(totalBytes);
  let off = 0;
  const viewOffsets: number[] = [];
  const viewLengths: number[] = [];
  for (const seg of segments) {
    viewOffsets.push(off);
    viewLengths.push(seg.data.length);
    combined.set(seg.data, off);
    off += seg.data.length;
  }

  // --- Build glTF JSON ---
  const numAccessors = segments.length;
  const morphPosAccStart = 3;
  const morphColAccStart = 3 + numMorphs;
  const animTimeAcc = 3 + numMorphs * 2;
  const animOutputAcc = 3 + numMorphs * 2 + 1;

  const gltf: GLTF = {
    asset: { version: '2.0' },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, COLOR_0: 1 },
        indices: 2,
        material: 0,
        targets: numMorphs > 0 ? morphPosData.map((_, mi) => ({
          POSITION: morphPosAccStart + mi,
          COLOR_0: morphColAccStart + mi,
        })) : undefined,
      }]
    }],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0, uri: '' }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: 0.0,
        roughnessFactor: 0.9
      }
    }]
  };

  // Build buffer views and accessors
  for (let i = 0; i < numAccessors; i++) {
    gltf.bufferViews.push({
      buffer: 0,
      byteOffset: viewOffsets[i],
      byteLength: viewLengths[i],
      target: segments[i].target,
    });

    if (i === 0) {
      gltf.accessors.push({ bufferView: i, componentType: 5126, count: numVerts, type: 'VEC3' });
    } else if (i === 1) {
      gltf.accessors.push({ bufferView: i, componentType: 5126, count: numVerts, type: 'VEC4' });
    } else if (i === 2) {
      gltf.accessors.push({ bufferView: i, componentType: 5125, count: indices.length, type: 'SCALAR' });
    } else if (i < morphColAccStart) {
      gltf.accessors.push({ bufferView: i, componentType: 5126, count: numVerts, type: 'VEC3' });
    } else if (i < animTimeAcc) {
      gltf.accessors.push({ bufferView: i, componentType: 5126, count: numVerts, type: 'VEC4' });
    } else if (i === animTimeAcc) {
      gltf.accessors.push({ bufferView: i, componentType: 5126, count: keyframeCount, type: 'SCALAR' });
    } else {
      gltf.accessors.push({ bufferView: i, componentType: 5126, count: keyframeCount * numMorphs, type: 'SCALAR' });
    }
  }

  // Build animation (single sampler, single channel with weights vector)
  if (numMorphs > 0) {
    gltf.animations = [{
      channels: [{
        sampler: 0,
        target: { node: 0, path: 'weights' }
      }],
      samplers: [{
        input: animTimeAcc,
        output: animOutputAcc,
        interpolation: 'STEPNEAREST',
      }]
    }];
  }

  // Encode buffer as base64 data URI
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  const base64 = btoa(binary);

  gltf.buffers[0] = {
    byteLength: totalBytes,
    uri: 'data:application/octet-stream;base64,' + base64
  };

  const json = JSON.stringify(gltf, null, 2);
  const filename = `p2v-animated-${frames.length}f.gltf`;

  return { content: json, filename, mimeType: 'model/gltf+json' };
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
