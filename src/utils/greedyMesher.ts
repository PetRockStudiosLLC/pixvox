import { SpatialHash } from "./spatialHash";

export interface Face {
  x: number;
  y: number;
  z: number;
  color: string;
  width: number;
  height: number;
  direction: [number, number, number];
}

/**
 * Greedy meshing - merges adjacent faces of identical colors into unified quads
 * Uses a 2D greedy meshing approach per direction
 */
export function greedyMesh(voxels: SpatialHash, width: number, height: number, layers: number): Face[] {
  const faces: Face[] = [];
  const totalCells = width * height * layers;
  const visited = new Uint8Array(totalCells * 6);

  // Process each of the 6 directions
  for (let dirIdx = 0; dirIdx < 6; dirIdx++) {
    const dx = dirIdx === 0 ? 1 : dirIdx === 1 ? -1 : 0;
    const dy = dirIdx === 2 ? 1 : dirIdx === 3 ? -1 : 0;
    const dz = dirIdx === 4 ? 1 : dirIdx === 5 ? -1 : 0;

    // For each direction, determine the axes
    // normal axis: the axis we're looking along (x, y, or z)
    // t1, t2: the two tangent axes (for the 2D grid)

    for (let n = 0; n < (dx !== 0 ? width : dy !== 0 ? height : layers); n++) {
      for (let t1 = 0; t1 < (dx !== 0 ? height : width); t1++) {
        for (let t2 = 0; t2 < (dz !== 0 ? layers : dx !== 0 ? layers : height); t2++) {
          // Map (n, t1, t2) to (x, y, z) based on direction
          let x: number, y: number, z: number;
          if (dx !== 0) {
            x = n;
            y = t2;
            z = t1; // normal=x, t1=z, t2=y
          } else if (dy !== 0) {
            x = t1;
            y = n;
            z = t2; // normal=y, t1=x, t2=z
          } else {
            x = t1;
            y = t2;
            z = n; // normal=z, t1=x, t2=y
          }

          const voxel = voxels.get(x, y, z);
          if (!voxel) continue;

          // Check if face is exposed in direction (dx,dy,dz)
          const nx = x + dx,
            ny = y + dy,
            nz = z + dz;
          if (voxels.has(nx, ny, nz)) continue;

          // Check visited
          const cellIdx = x * height * layers + y * layers + z;
          if (visited[cellIdx * 6 + dirIdx]) continue;

          // Greedy expand in t1 direction (width)
          let wSize = 1;
          while (true) {
            const wt1 = t1 + wSize;
            if (wt1 >= (dx !== 0 ? height : width)) break;
            let wx: number, wy: number, wz: number;
            if (dx !== 0) {
              wx = n;
              wy = t2;
              wz = wt1;
            } else if (dy !== 0) {
              wx = wt1;
              wy = n;
              wz = t2;
            } else {
              wx = wt1;
              wy = t2;
              wz = n;
            }
            const neighbor = voxels.get(wx, wy, wz);
            if (!neighbor || neighbor.color !== voxel.color) break;
            const wIdx = wx * height * layers + wy * layers + wz;
            if (visited[wIdx * 6 + dirIdx]) break;
            wSize++;
          }

          // Greedy expand in t2 direction (height)
          let hSize = 1;
          outer: while (true) {
            const ht2 = t2 + hSize;
            if (ht2 >= (dz !== 0 ? layers : dx !== 0 ? layers : height)) break;
            for (let wi = 0; wi < wSize; wi++) {
              let hx: number, hy: number, hz: number;
              if (dx !== 0) {
                hx = n;
                hy = ht2;
                hz = t1 + wi;
              } else if (dy !== 0) {
                hx = t1 + wi;
                hy = n;
                hz = ht2;
              } else {
                hx = t1 + wi;
                hy = ht2;
                hz = n;
              }
              const neighbor = voxels.get(hx, hy, hz);
              if (!neighbor || neighbor.color !== voxel.color) break outer;
              const hIdx = hx * height * layers + hy * layers + hz;
              if (visited[hIdx * 6 + dirIdx]) break outer;
            }
            hSize++;
          }

          // Mark all cells as visited for this direction
          for (let wi = 0; wi < wSize; wi++) {
            for (let hi = 0; hi < hSize; hi++) {
              let fx: number, fy: number, fz: number;
              if (dx !== 0) {
                fx = n;
                fy = t2 + hi;
                fz = t1 + wi;
              } else if (dy !== 0) {
                fx = t1 + wi;
                fy = n;
                fz = t2 + hi;
              } else {
                fx = t1 + wi;
                fy = t2 + hi;
                fz = n;
              }
              const fIdx = fx * height * layers + fy * layers + fz;
              visited[fIdx * 6 + dirIdx] = 1;
            }
          }

          // Push face - position is (x,y,z), width along t1, height along t2
          faces.push({
            x,
            y,
            z,
            color: voxel.color,
            width: wSize,
            height: hSize,
            direction: [dx, dy, dz]
          });
        }
      }
    }
  }

  return faces;
}
