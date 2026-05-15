import * as THREE from "three";

export type ModelFormat = "gltf" | "glb" | "obj";

export interface ModelLoadResult {
  mesh: THREE.Mesh | THREE.Group;
  name: string;
  originalSize: THREE.Vector3;
}

const MAX_VERTEX_COUNT = 500000;

export async function loadModel(
  file: File,
  onProgress?: (progress: number, message?: string) => void,
  mtlFile?: File | null,
  textureFiles?: File[]
): Promise<ModelLoadResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  onProgress?.(0.1, "Reading file...");

  const arrayBuffer = await file.arrayBuffer();

  let mesh: THREE.Mesh | THREE.Group;
  let name = file.name;

  onProgress?.(0.2, "Loading model...");

  try {
    if (ext === "obj") {
      mesh = await loadOBJ(arrayBuffer, mtlFile, textureFiles);
    } else if (ext === "gltf" || ext === "glb") {
      mesh = await loadGLTF(arrayBuffer);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }
  } catch (error) {
    const err = error as Error;
    console.error("GLTF load error:", err);
    const msg = err.message?.toLowerCase() || "";
    if (msg.includes("typed array") || msg.includes("buffer") || msg.includes("corrupt") || msg.includes("unexpected") || msg.includes("invalid") || msg.includes("size")) {
      throw new Error("Model file is too large, corrupted, or uses unsupported features. Try exporting from Blender as GLTF with 'Embed Materials' and no animations.");
    }
    throw error;
  }

  // Verify vertex count
  let totalVertices = 0;
  mesh.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const geo = (child as THREE.Mesh).geometry;
      totalVertices += geo.attributes.position.count;
    }
  });

  if (totalVertices > MAX_VERTEX_COUNT) {
    throw new Error(
      `Model has ${totalVertices.toLocaleString()} vertices (max: ${MAX_VERTEX_COUNT.toLocaleString()}). ` +
      `Simplify the model in Blender first, or use a lower-poly version.`
    );
  }

  onProgress?.(0.7, "Computing bounding box...");

  // Compute original size
  const bbox = new THREE.Box3().setFromObject(mesh);
  const originalSize = new THREE.Vector3();
  bbox.getSize(originalSize);

  // Center and scale the mesh
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  mesh.position.set(-center.x, -center.y, -center.z);

  onProgress?.(0.9, "Model loaded");

  return { mesh, name, originalSize };
}

async function loadGLTF(data: ArrayBuffer): Promise<THREE.Mesh> {
  const GLTFLoader = (await import("three/addons/loaders/GLTFLoader.js")).GLTFLoader;
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    try {
      loader.parse(data, "", (gltf) => {
        const allMeshes: THREE.Mesh[] = [];
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            allMeshes.push(child as THREE.Mesh);
          }
        });

        if (allMeshes.length === 0) {
          reject(new Error("GLTF file contains no meshes"));
          return;
        }

        if (allMeshes.length === 1) {
          const mesh = allMeshes[0];
          ensureVertexColors(mesh);
          resolve(mesh);
        } else {
          const merged = mergeMeshes(allMeshes);
          ensureVertexColors(merged);
          resolve(merged);
        }
      }, (error) => {
        reject(error || new Error("Failed to parse GLTF"));
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function loadOBJ(
  data: ArrayBuffer,
  mtlFile?: File | null,
  textureFiles?: File[]
): Promise<THREE.Group> {
  const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");

  // Build texture map from provided texture files
  const textureMap = new Map<string, THREE.Texture>();
  if (textureFiles?.length) {
    for (const tf of textureFiles) {
      const img = await loadImageFile(tf);
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      textureMap.set(tf.name.toLowerCase(), tex);
    }
  }

  // Decode OBJ text
  const objText = new TextDecoder().decode(data);

  // Parse MTL manually to extract material colors
  const mtlMaterials: Map<string, THREE.Color> = new Map();
  if (mtlFile) {
    const mtlText = await mtlFile.text();
    const lines = mtlText.split("\n");
    let currentMatName = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("newmtl ")) {
        currentMatName = trimmed.substring(7).trim();
      } else if (trimmed.startsWith("Kd ") && currentMatName) {
        const parts = trimmed.substring(3).trim().split(/\s+/);
        if (parts.length >= 3) {
          const r = parseFloat(parts[0]);
          const g = parseFloat(parts[1]);
          const b = parseFloat(parts[2]);
          mtlMaterials.set(currentMatName, new THREE.Color(r, g, b));
        }
      }
    }
  }

// Parse OBJ text to get triangle ranges per material
  // OBJLoader triangulates quads, so we count triangles not faces
  const objLines = objText.split("\n");
  const materialTriRanges: Array<{ name: string; startTri: number; endTri: number }> = [];
  let currentMat = "";
  let triCount = 0;
  let triStart = 0;
  for (const line of objLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("usemtl ")) {
      if (currentMat && triStart < triCount) {
        materialTriRanges.push({ name: currentMat, startTri: triStart, endTri: triCount });
      }
      currentMat = trimmed.substring(7).trim();
      triStart = triCount;
    } else if (trimmed.startsWith("f ")) {
      const parts = trimmed.split(/\s+/);
      const vertsInFace = parts.slice(1).length;
      // Tri = 1 triangle, quad = 2 triangles, n-gon = n-2 triangles
      triCount += Math.max(1, vertsInFace - 2);
    }
  }
  if (currentMat && triStart < triCount) {
    materialTriRanges.push({ name: currentMat, startTri: triStart, endTri: triCount });
  }

  // Load OBJ
  const loader = new OBJLoader();
  const object = loader.parse(objText);

  const allMeshes: THREE.Mesh[] = [];
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      allMeshes.push(child as THREE.Mesh);
    }
  });

  if (allMeshes.length === 0) {
    throw new Error("OBJ file contains no meshes");
  }

  // If no MTL materials, just merge and return
  if (mtlMaterials.size === 0 || materialTriRanges.length === 0) {
    const merged = allMeshes.length === 1 ? allMeshes[0] : mergeMeshes(allMeshes);
    ensureVertexColors(merged);
    return merged as unknown as THREE.Group;
  }

  // Split single mesh into per-material meshes
  const sourceMesh = allMeshes[0];
  const sourceGeo = sourceMesh.geometry;
  const sourcePos = sourceGeo.getAttribute("position");
  const sourceIndex = sourceGeo.getIndex();
  const sourceTriCount = sourceIndex ? sourceIndex.count / 3 : sourcePos.count / 3;

  const group = new THREE.Group();

  for (const range of materialTriRanges) {
    const mtlColor = mtlMaterials.get(range.name);
    if (!mtlColor) continue;

    const positions: number[] = [];
    const indices: number[] = [];
    let vertOffset = 0;

    for (let fi = range.startTri; fi < range.endTri; fi++) {
      const i0 = sourceIndex ? sourceIndex.getX(fi * 3) : fi * 3;
      const i1 = sourceIndex ? sourceIndex.getX(fi * 3 + 1) : fi * 3 + 1;
      const i2 = sourceIndex ? sourceIndex.getX(fi * 3 + 2) : fi * 3 + 2;

      for (const vi of [i0, i1, i2]) {
        positions.push(
          sourcePos.getX(vi),
          sourcePos.getY(vi),
          sourcePos.getZ(vi)
        );
      }

      indices.push(vertOffset, vertOffset + 1, vertOffset + 2);
      vertOffset += 3;
    }

    if (positions.length === 0) continue;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: mtlColor,
    }));
    mesh.name = range.name;
    group.add(mesh);
  }

  if (group.children.length === 0) {
    const merged = mergeMeshes(allMeshes);
    ensureVertexColors(merged);
    return merged as unknown as THREE.Group;
  }

  return group;
}

function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ensureVertexColors(mesh: THREE.Mesh): void {
  const geo = mesh.geometry;
  if (geo.attributes.color) return;

  // If the mesh has a material with a color, apply it to vertices
  if (mesh.material) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const mat = materials[0];

    if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshLambertMaterial || mat instanceof THREE.MeshPhongMaterial) {
      const color = mat.color;
      const count = geo.attributes.position.count;
      const vertexColors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        vertexColors[i * 3] = color.r;
        vertexColors[i * 3 + 1] = color.g;
        vertexColors[i * 3 + 2] = color.b;
      }

      geo.setAttribute("color", new THREE.Float32BufferAttribute(vertexColors, 3));
    }
  }
}

function mergeMeshes(meshes: THREE.Mesh[]): THREE.Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];

  for (const mesh of meshes) {
    const geo = mesh.geometry;
    const pos = geo.getAttribute("position");
    const norm = geo.getAttribute("normal");
    const col = geo.getAttribute("color");
    const uv = geo.getAttribute("uv");
    const mat = mesh.material;

    // Apply mesh transform to vertices
    const matrix = new THREE.Matrix4();
    mesh.updateMatrix();
    const m = matrix.elements;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Apply transform using matrix elements
      const vx = m[0] * x + m[4] * y + m[8] * z + m[12];
      const vy = m[1] * x + m[5] * y + m[9] * z + m[13];
      const vz = m[2] * x + m[6] * y + m[10] * z + m[14];

      positions.push(vx, vy, vz);

      if (norm) {
        const nx = norm.getX(i);
        const ny = norm.getY(i);
        const nz = norm.getZ(i);
        normals.push(nx, ny, nz);
      }

      if (uv) {
        uvs.push(uv.getX(i), uv.getY(i));
      }

      if (col) {
        colors.push(col.getX(i), col.getY(i), col.getZ(i));
      } else if (mat) {
        const materials = Array.isArray(mat) ? mat : [mat];
        const m2 = materials[0];
        if (m2 instanceof THREE.MeshStandardMaterial || m2 instanceof THREE.MeshLambertMaterial) {
          colors.push(m2.color.r, m2.color.g, m2.color.b);
        } else {
          colors.push(0.5, 0.5, 0.5);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length > 0) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  }
  if (uvs.length > 0) {
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  }
  if (colors.length > 0) {
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  }

  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
}
