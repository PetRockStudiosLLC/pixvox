import * as THREE from "three";
import { Face } from "./greedyMesher";

/**
 * Build a Three.js mesh from greedy-meshed faces
 * Uses a single geometry with merged vertices for performance
 */
export function buildMergedGeometry(faces: Face[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  let vertexOffset = 0;

  for (const face of faces) {
    const { x, y, z, width, height, direction, color } = face;

    // Parse color
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    // Generate quad vertices based on face direction
    // face.width = extent along first tangent axis (u)
    // face.height = extent along second tangent axis (v)
    let v0, v1, v2, v3;

    if (direction[0] !== 0) {
      // X-axis faces: normal along x, u=z, v=y
      const px = x + (direction[0] > 0 ? 1 : 0);
      v0 = new THREE.Vector3(px, y, z);
      v1 = new THREE.Vector3(px, y, z + width); // +u (z)
      v2 = new THREE.Vector3(px, y + height, z + width); // +v (y) +u
      v3 = new THREE.Vector3(px, y + height, z); // +v (y)
    } else if (direction[1] !== 0) {
      // Y-axis faces: normal along y, u=x, v=z
      const py = y + (direction[1] > 0 ? 1 : 0);
      v0 = new THREE.Vector3(x, py, z);
      v1 = new THREE.Vector3(x + width, py, z); // +u (x)
      v2 = new THREE.Vector3(x + width, py, z + height); // +u +v (z)
      v3 = new THREE.Vector3(x, py, z + height); // +v (z)
    } else {
      // Z-axis faces: normal along z, u=x, v=y
      const pz = z + (direction[2] > 0 ? 1 : 0);
      v0 = new THREE.Vector3(x, y, pz);
      v1 = new THREE.Vector3(x + width, y, pz); // +u (x)
      v2 = new THREE.Vector3(x + width, y + height, pz); // +u +v (y)
      v3 = new THREE.Vector3(x, y + height, pz); // +v (y)
    }

    // Add vertices
    for (const v of [v0, v1, v2, v3]) {
      positions.push(v.x, v.y, v.z);
      colors.push(r, g, b);
    }

    // Add two triangles
    indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
    indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 3);
    vertexOffset += 4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Create a simple box geometry for Fast-Draft mode
 */
export function createVoxelBox(x: number, y: number, z: number, color: string): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;
  const material = new THREE.MeshLambertMaterial({ color: new THREE.Color(r, g, b) });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  return mesh;
}
