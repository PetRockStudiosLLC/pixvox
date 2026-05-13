import { CanvasState } from "../types/voxel";

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

export function exportGLTF(
  canvasState: CanvasState,
  mode: "fast-draft" | "final-bake"
): { content: string; filename: string; mimeType: string } {
  const { width, height, layers, pixels } = canvasState;

  const voxels: { x: number; y: number; z: number; color: string }[] = [];
  pixels.forEach((color, key) => {
    const [x, y, z] = key.split(",").map(Number);
    if (x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < layers) {
      voxels.push({ x, y, z, color });
    }
  });

  if (voxels.length === 0) {
    return { content: "", filename: "", mimeType: "" };
  }

  const verts = [
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [0.5, 0.5, -0.5],
    [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, 0.5],
    [-0.5, 0.5, 0.5]
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

    faces.forEach((face) => {
      face.forEach((idx) => indices.push(idx + vertexOffset));
    });

    vertexOffset += 8;
  });

  const gltf: GLTF = {
    asset: { version: "2.0" },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, COLOR_0: 1 },
            indices: 2,
            material: 0
          }
        ]
      }
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        type: "VEC3",
        max: [width, height, layers],
        min: [0, 0, 0]
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: colors.length / 4,
        type: "VEC4"
      },
      {
        bufferView: 2,
        componentType: 5125,
        count: indices.length,
        type: "SCALAR"
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length * 4, target: 34962 },
      { buffer: 0, byteOffset: positions.length * 4, byteLength: colors.length * 4, target: 34962 },
      { buffer: 0, byteOffset: (positions.length + colors.length) * 4, byteLength: indices.length * 4, target: 34963 }
    ],
    buffers: [{ byteLength: 0, uri: "" }],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0.0,
          roughnessFactor: 0.9
        }
      }
    ]
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

  let binary = "";
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

  return { content: json, filename, mimeType: "model/gltf+json" };
}

export async function downloadFile(content: string, filename: string, mimeType: string = "text/plain"): Promise<void> {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "All Files",
            accept: { "application/octet-stream": ["*"] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Save failed, falling back to download:", error);
    }
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
