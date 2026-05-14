import { VoxelData } from "../types/voxel";

export class SpatialHash {
  private map: Map<string, VoxelData>;

  constructor() {
    this.map = new Map();
  }

  private key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  set(x: number, y: number, z: number, color: string): void {
    this.map.set(this.key(x, y, z), { x, y, z, color });
  }

  get(x: number, y: number, z: number): VoxelData | undefined {
    return this.map.get(this.key(x, y, z));
  }

  has(x: number, y: number, z: number): boolean {
    return this.map.has(this.key(x, y, z));
  }

  delete(x: number, y: number, z: number): boolean {
    return this.map.delete(this.key(x, y, z));
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  *values(): Generator<VoxelData> {
    yield* this.map.values();
  }

  /**
   * Check if neighbor exists (for face culling)
   * Returns true if voxel has a neighbor in the given direction
   */
  hasNeighbor(x: number, y: number, z: number, dx: number, dy: number, dz: number): boolean {
    return this.has(x + dx, y + dy, z + dz);
  }
}
