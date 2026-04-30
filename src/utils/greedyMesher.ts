import { SpatialHash } from './spatialHash';

export interface Face {
  x: number;
  y: number;
  z: number;
  color: string;
  width: number;
  height: number;
  direction: [number, number, number]; // normal
}

/**
 * Greedy meshing - merges adjacent faces of identical colors into unified quads
 * Reduces draw calls by combining coplanar faces
 */
export function greedyMesh(voxels: SpatialHash, width: number, height: number, layers: number): Face[] {
  const faces: Face[] = [];
  const visited = new Set<string>();

  // Six directions: +x, -x, +y, -y, +z, -z
  const directions: [number, number, number][] = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1],
  ];

  for (const [dx, dy, dz] of directions) {
    const axis = Math.abs(dx) ? 'x' : Math.abs(dy) ? 'y' : 'z';
    // Axis labels for iteration (unused, kept for clarity)
    
    // Sweep along the normal axis
    const maxN = axis === 'x' ? width : axis === 'y' ? height : layers;
    
    for (let n = 0; n < maxN; n++) {
      for (let i = 0; i < (axis === 'x' ? height : width); i++) {
        for (let j = 0; j < (axis === 'z' ? layers : (axis === 'x' ? layers : height)); j++) {
          let x, y, z;
          if (axis === 'x') { x = n; y = i; z = j; }
          else if (axis === 'y') { x = i; y = n; z = j; }
          else { x = i; y = j; z = n; }

          const voxel = voxels.get(x, y, z);
          if (!voxel) continue;

          // Check if face is exposed (neighbor is empty or out of bounds)
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (voxels.has(nx, ny, nz)) continue;

          const key = `${x},${y},${z},${dx},${dy},${dz}`;
          if (visited.has(key)) continue;

          // Greedy expand in two axes
          let wSize = 1, hSize = 1;
          
          // Expand in "width" direction
          while (true) {
            let wx, wy, wz;
            if (axis === 'x') { wx = n; wy = i + wSize; wz = j; }
            else if (axis === 'y') { wx = i + wSize; wy = n; wz = j; }
            else { wx = i + wSize; wy = j; wz = n; }

            if (wx < 0 || wx >= width || wy < 0 || wy >= height || wz < 0 || wz >= layers) break;
            const neighbor = voxels.get(wx, wy, wz);
            if (!neighbor || neighbor.color !== voxel.color) break;
            const nKey = `${wx},${wy},${wz},${dx},${dy},${dz}`;
            if (visited.has(nKey)) break;
            wSize++;
          }

          // Expand in "height" direction
          outer: while (true) {
            for (let wi = 0; wi < wSize; wi++) {
              let hx, hy, hz;
              if (axis === 'x') { hx = n; hy = i + wi; hz = j + hSize; }
              else if (axis === 'y') { hx = i + wi; hy = n; hz = j + hSize; }
              else { hx = i + wi; hy = j + hSize; hz = n; }

              if (hx < 0 || hx >= width || hy < 0 || hy >= height || hz < 0 || hz >= layers) break outer;
              const neighbor = voxels.get(hx, hy, hz);
              if (!neighbor || neighbor.color !== voxel.color) break outer;
              const nKey = `${hx},${hy},${hz},${dx},${dy},${dz}`;
              if (visited.has(nKey)) break outer;
            }
            hSize++;
          }

          // Mark all merged voxels as visited for this face direction
          for (let wi = 0; wi < wSize; wi++) {
            for (let hi = 0; hi < hSize; hi++) {
              let fx, fy, fz;
              if (axis === 'x') { fx = n; fy = i + wi; fz = j + hi; }
              else if (axis === 'y') { fx = i + wi; fy = n; fz = j + hi; }
              else { fx = i + wi; fy = j + hi; fz = n; }
              visited.add(`${fx},${fy},${fz},${dx},${dy},${dz}`);
            }
          }

          faces.push({
            x: axis === 'x' ? n : (axis === 'y' ? i : i),
            y: axis === 'x' ? i : (axis === 'y' ? n : j),
            z: axis === 'x' ? j : (axis === 'y' ? j : n),
            color: voxel.color,
            width: axis === 'x' ? 1 : wSize,
            height: axis === 'z' ? 1 : hSize,
            direction: [dx, dy, dz],
          });
        }
      }
    }
  }

  return faces;
}
