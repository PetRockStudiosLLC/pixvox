import * as THREE from "three";

export interface VoxelizeOptions {
  resolution: number;
  scale?: number;
  colorMode?: "vertex" | "solid";
  solidColor?: string;
}

export interface VoxelResult {
  voxels: { x: number; y: number; z: number; color: string }[];
  boundingBox: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };
  voxelCount: number;
}

const DEFAULT_SOLID_COLOR = "#808080";

// Triangle structure for overlap testing
interface Triangle {
  v0: THREE.Vector3;
  v1: THREE.Vector3;
  v2: THREE.Vector3;
  color: string | [number, number, number];
}

function colorToString(color: string | [number, number, number]): string {
  if (typeof color === "string") return color;
  const r = Math.round(Math.min(1, Math.max(0, color[0])) * 255);
  const g = Math.round(Math.min(1, Math.max(0, color[1])) * 255);
  const b = Math.round(Math.min(1, Math.max(0, color[2])) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function voxelizeMesh(
  mesh: THREE.Mesh | THREE.Group,
  options: VoxelizeOptions,
  onProgress?: (progress: number, message?: string) => void
): VoxelResult | null {
  const {
    resolution,
    scale = 1,
    colorMode = "vertex",
    solidColor = DEFAULT_SOLID_COLOR,
  } = options;

  const group = mesh as THREE.Group;

  // Collect per-mesh data: geometry, color, texture
  const meshData: Array<{
    geo: THREE.BufferGeometry;
    color: string;
    texture: THREE.Texture | null;
  }> = [];

  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const mat = m.material;
      let color = solidColor;

      // Get color from material
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshLambertMaterial || mat instanceof THREE.MeshPhongMaterial) {
        const c = mat.color;
        color = colorToString([c.r, c.g, c.b]);
      }
      const tex = (mat && mat instanceof THREE.MeshStandardMaterial && mat.map)
        ? mat.map as THREE.Texture
        : null;

      meshData.push({ geo: m.geometry, color, texture: tex });
    }
  });

  if (meshData.length === 0) {
    return null;
  }

  // Merge all geometries (positions only)
  const positions: number[] = [];
  for (const { geo } of meshData) {
    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
  }

  const mergedGeometry = new THREE.BufferGeometry();
  mergedGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  // Compute bounding box
  mergedGeometry.computeBoundingBox();
  const bbox = mergedGeometry.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  // Center and scale
  const centerMatrix = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
  const scaleMatrix = new THREE.Matrix4().makeScale(scale, scale, scale);
  mergedGeometry.applyMatrix4(centerMatrix);
  mergedGeometry.applyMatrix4(scaleMatrix);
  mergedGeometry.computeBoundingBox();
  const tBbox = mergedGeometry.boundingBox!;

  const tSize = new THREE.Vector3();
  tBbox.getSize(tSize);
  // console.log("Voxelize: bbox after center+scale:", tBbox.min, tBbox.max, "size:", tSize);

  onProgress?.(0.1, "Extracting triangles...");

  // Extract triangles per mesh with its own color, applying center+scale transform
  const triangles: Triangle[] = [];
  const transformMatrix = new THREE.Matrix4()
    .multiply(centerMatrix)
    .multiply(scaleMatrix);

  for (const { geo, color } of meshData) {
    const pos = geo.getAttribute("position");
    const index = geo.getIndex();
    const triCount = index ? index.count / 3 : pos.count / 3;

    for (let i = 0; i < triCount; i++) {
      const i0 = index ? index.getX(i * 3) : i * 3;
      const i1 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
      const i2 = index ? index.getX(i * 3 + 2) : i * 3 + 2;

      const v0 = new THREE.Vector3(pos.getX(i0), pos.getY(i0), pos.getZ(i0)).applyMatrix4(transformMatrix);
      const v1 = new THREE.Vector3(pos.getX(i1), pos.getY(i1), pos.getZ(i1)).applyMatrix4(transformMatrix);
      const v2 = new THREE.Vector3(pos.getX(i2), pos.getY(i2), pos.getZ(i2)).applyMatrix4(transformMatrix);

      triangles.push({ v0, v1, v2, color });
    }
  }

  // triangles extracted

  onProgress?.(0.2, `Found ${triangles.length} triangles, building voxel grid...`);

 // Calculate grid dimensions based on resolution and bounding box proportions
  const maxDim = Math.max(tSize.x, tSize.y, tSize.z);
  const gridW = Math.max(4, Math.round((tSize.x / maxDim) * resolution));
  const gridH = Math.max(4, Math.round((tSize.y / maxDim) * resolution));
  const gridD = Math.max(4, Math.round((tSize.z / maxDim) * resolution));

  // Clamp to prevent memory explosion
  const maxTotalVoxels = 2000000;
  const totalVoxels = gridW * gridH * gridD;
  if (totalVoxels > maxTotalVoxels) {
    const scaleFactor = Math.cbrt(maxTotalVoxels / totalVoxels);
    const scaledW = Math.max(4, Math.round(gridW * scaleFactor));
    const scaledH = Math.max(4, Math.round(gridH * scaleFactor));
    const scaledD = Math.max(4, Math.round(gridD * scaleFactor));
    // Recalculate with scaled dimensions
  }

  const voxelSize = maxDim / resolution;
  const minX = tBbox.min.x;
  const minY = tBbox.min.y;
  const minZ = tBbox.min.z;
  // grid dimensions calculated

  onProgress?.(0.3, `Voxelizing ${gridW}x${gridH}x${gridD} grid...`);

  // Build spatial hash for triangle lookup (Blender-style)
  // Each cell in the spatial hash stores indices of triangles that overlap that cell
  const spatialHash = new Map<string, number[]>();

  const hashKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

  for (let ti = 0; ti < triangles.length; ti++) {
    const tri = triangles[ti];
    // Compute triangle bounding box
    const triMinX = Math.min(tri.v0.x, tri.v1.x, tri.v2.x);
    const triMinY = Math.min(tri.v0.y, tri.v1.y, tri.v2.y);
    const triMinZ = Math.min(tri.v0.z, tri.v1.z, tri.v2.z);
    const triMaxX = Math.max(tri.v0.x, tri.v1.x, tri.v2.x);
    const triMaxY = Math.max(tri.v0.y, tri.v1.y, tri.v2.y);
    const triMaxZ = Math.max(tri.v0.z, tri.v1.z, tri.v2.z);

    // Convert to grid coordinates
    const gMinX = Math.floor((triMinX - minX) / voxelSize);
    const gMinY = Math.floor((triMinY - minY) / voxelSize);
    const gMinZ = Math.floor((triMinZ - minZ) / voxelSize);
    const gMaxX = Math.floor((triMaxX - minX) / voxelSize);
    const gMaxY = Math.floor((triMaxY - minY) / voxelSize);
    const gMaxZ = Math.floor((triMaxZ - minZ) / voxelSize);

    // Insert triangle index into all overlapping grid cells
    for (let gx = gMinX; gx <= gMaxX; gx++) {
      for (let gy = gMinY; gy <= gMaxY; gy++) {
        for (let gz = gMinZ; gz <= gMaxZ; gz++) {
          const key = hashKey(gx, gy, gz);
          if (!spatialHash.has(key)) {
            spatialHash.set(key, []);
          }
          spatialHash.get(key)!.push(ti);
        }
      }
    }
  }

  onProgress?.(0.4, "Testing voxel-triangle overlap...");

  // For each voxel cell, check if any triangle overlaps it
  const voxelSet = new Map<string, string>();
  let processed = 0;
  const total = gridW * gridH * gridD;
  const batchSize = Math.max(1, Math.floor(total / 20));

  for (let iz = 0; iz < gridD; iz++) {
    for (let iy = 0; iy < gridH; iy++) {
      for (let ix = 0; ix < gridW; ix++) {
        // Voxel cell bounds in world space
        const cellMinX = minX + ix * voxelSize;
        const cellMinY = minY + iy * voxelSize;
        const cellMinZ = minZ + iz * voxelSize;
        const cellMaxX = cellMinX + voxelSize;
        const cellMaxY = cellMinY + voxelSize;
        const cellMaxZ = cellMinZ + voxelSize;

        // Look up triangles in spatial hash
        const key = hashKey(ix, iy, iz);
        const triIndices = spatialHash.get(key);

        if (triIndices) {
          // Check if any triangle actually overlaps this voxel cell
          for (const triIdx of triIndices) {
            const tri = triangles[triIdx];

            // Check if triangle overlaps voxel cell using distance test
            if (triangleOverlapsBox(tri, cellMinX, cellMinY, cellMinZ, cellMaxX, cellMaxY, cellMaxZ)) {
              voxelSet.set(`${ix},${iy},${iz}`, colorToString(tri.color));
              break;
            }
          }
        }

        processed++;
        if (processed % batchSize === 0) {
          const pct = 0.4 + 0.5 * (processed / total);
          onProgress?.(pct, `Processing ${Math.round(100 * processed / total)}%...`);
        }
      }
    }
  }

  // Convert to result array
  const voxels: { x: number; y: number; z: number; color: string }[] = [];
  for (const [key, color] of voxelSet) {
    const [x, y, z] = key.split(",").map(Number);
    voxels.push({ x, y, z, color });
  }

  // voxels generated
  onProgress?.(0.95, `Generated ${voxels.length} voxels`);

  return {
    voxels,
    boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: gridW, maxY: gridH, maxZ: gridD },
    voxelCount: voxels.length
  };
}

// Check if triangle overlaps an axis-aligned box.
// Uses triangle-AABB overlap test: first quick AABB check, then precise point/edge tests.
function triangleOverlapsBox(
  tri: Triangle,
  boxMinX: number, boxMinY: number, boxMinZ: number,
  boxMaxX: number, boxMaxY: number, boxMaxZ: number
): boolean {
  // Quick AABB overlap check
  const triMinX = Math.min(tri.v0.x, tri.v1.x, tri.v2.x);
  const triMinY = Math.min(tri.v0.y, tri.v1.y, tri.v2.y);
  const triMinZ = Math.min(tri.v0.z, tri.v1.z, tri.v2.z);
  const triMaxX = Math.max(tri.v0.x, tri.v1.x, tri.v2.x);
  const triMaxY = Math.max(tri.v0.y, tri.v1.y, tri.v2.y);
  const triMaxZ = Math.max(tri.v0.z, tri.v1.z, tri.v2.z);

  if (triMaxX < boxMinX || triMinX > boxMaxX) return false;
  if (triMaxY < boxMinY || triMinY > boxMaxY) return false;
  if (triMaxZ < boxMinZ || triMinZ > boxMaxZ) return false;

  // Check if any vertex is inside the box
  for (const v of [tri.v0, tri.v1, tri.v2]) {
    if (v.x >= boxMinX && v.x <= boxMaxX &&
        v.y >= boxMinY && v.y <= boxMaxY &&
        v.z >= boxMinZ && v.z <= boxMaxZ) return true;
  }

  // Check if any edge intersects the box
  const edges = [[tri.v0, tri.v1], [tri.v1, tri.v2], [tri.v2, tri.v0]];
  for (const [a, b] of edges) {
    if (lineSegmentIntersectsBox(a, b, boxMinX, boxMinY, boxMinZ, boxMaxX, boxMaxY, boxMaxZ)) return true;
  }

  // Box contains the triangle (all vertices outside but triangle wraps around)
  const centerX = (boxMinX + boxMaxX) * 0.5;
  const centerY = (boxMinY + boxMaxY) * 0.5;
  const centerZ = (boxMinZ + boxMaxZ) * 0.5;
  const centroidX = (tri.v0.x + tri.v1.x + tri.v2.x) / 3;
  const centroidY = (tri.v0.y + tri.v1.y + tri.v2.y) / 3;
  const centroidZ = (tri.v0.z + tri.v1.z + tri.v2.z) / 3;
  if (centroidX >= boxMinX && centroidX <= boxMaxX &&
      centroidY >= boxMinY && centroidY <= boxMaxY &&
      centroidZ >= boxMinZ && centroidZ <= boxMaxZ) return true;

  return false;
}

// Check if a line segment intersects an axis-aligned box using Liang-Barsky style clipping
function lineSegmentIntersectsBox(
  ax: THREE.Vector3, bx: THREE.Vector3,
  boxMinX: number, boxMinY: number, boxMinZ: number,
  boxMaxX: number, boxMaxY: number, boxMaxZ: number
): boolean {
  let tmin = 0, tmax = 1;
  const dx = bx.x - ax.x, dy = bx.y - ax.y, dz = bx.z - ax.z;

  // X axes
  if (Math.abs(dx) > 1e-12) {
    let t1 = (boxMinX - ax.x) / dx, t2 = (boxMaxX - ax.x) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  } else if (ax.x < boxMinX || ax.x > boxMaxX) return false;

  // Y axes
  if (Math.abs(dy) > 1e-12) {
    let t1 = (boxMinY - ax.y) / dy, t2 = (boxMaxY - ax.y) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  } else if (ax.y < boxMinY || ax.y > boxMaxY) return false;

  // Z axes
  if (Math.abs(dz) > 1e-12) {
    let t1 = (boxMinZ - ax.z) / dz, t2 = (boxMaxZ - ax.z) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  } else if (ax.z < boxMinZ || ax.z > boxMaxZ) return false;

  return tmin <= tmax;
}

// Sample a texture at given UV coordinates and return hex color
function sampleTextureAtUV(texture: THREE.Texture, u: number, v: number, cache: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null): string {
  const image = texture.image;
  if (!image) return DEFAULT_SOLID_COLOR;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  if (cache) {
    canvas = cache.canvas;
    ctx = cache.ctx;
  } else {
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d")!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
  }

  const px = Math.max(0, Math.min(image.width - 1, Math.floor(u * image.width)));
  const py = Math.max(0, Math.min(image.height - 1, Math.floor((1 - v) * image.height)));

  const pixel = ctx.getImageData(px, py, 1, 1).data;
  const r = pixel[0], g = pixel[1], b = pixel[2];
  return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
}

// Create cached canvas for texture sampling
function createTextureCanvas(texture: THREE.Texture): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const image = texture.image;
  if (!image) return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  return { canvas, ctx };
}
