// B29 · Aiuto per le prove senza browser: legge un modello delle mascotte (public/media/mascotte-*.glb, fatto da
// scripts/mascotte-modelli.py) e ne costruisce la scena three.js: ossa, mesh con la pelle, scheletro. Non usa
// GLTFLoader (che senza browser non sa leggere la texture): la texture qui non serve.
import fs from 'node:fs';
import * as THREE from 'three';

export function readGlb(file){
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: non è un GLB`);
  const jsonLen = b.readUInt32LE(12), json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8, bin = b.subarray(binStart, binStart + b.readUInt32LE(20 + jsonLen));
  return { json, bin, bytes: b.length };
}
const TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
// Un accessore come vettore tipizzato compatto (anche se nel file è intrecciato con altri)
export function accessor({ json, bin }, index){
  const a = json.accessors[index], v = json.bufferViews[a.bufferView], T = TYPES[a.componentType], n = SIZE[a.type];
  const start = (v.byteOffset || 0) + (a.byteOffset || 0), stride = v.byteStride || T.BYTES_PER_ELEMENT*n;
  const out = new T(a.count*n), view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5126: 'getFloat32' }[a.componentType];
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) out[i*n + k] = view[get](start + i*stride + k*T.BYTES_PER_ELEMENT, true);
  return { array: out, size: n, normalized: !!a.normalized, count: a.count };
}

// Scena del modello: { scene, mesh, bones (per nome), json, triangles, bytes }
export function buildMascotScene(file){
  const glb = readGlb(file), { json } = glb, skin = json.skins[0];
  const nodes = json.nodes.map((n, i) => {
    const o = skin.joints.includes(i) ? new THREE.Bone() : new THREE.Object3D();
    o.name = n.name || '';
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    return o;
  });
  const prim = json.meshes[0].primitives[0], geo = new THREE.BufferGeometry();
  const attr = (name, to) => { const a = accessor(glb, prim.attributes[name]); geo.setAttribute(to, new THREE.BufferAttribute(a.array, a.size, a.normalized)); };
  attr('POSITION', 'position'); attr('NORMAL', 'normal'); attr('TEXCOORD_0', 'uv'); attr('JOINTS_0', 'skinIndex'); attr('WEIGHTS_0', 'skinWeight');
  const idx = accessor(glb, prim.indices);
  geo.setIndex(new THREE.BufferAttribute(idx.array, 1));
  const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial());
  const meshNode = json.nodes.findIndex(n => n.mesh === 0);
  mesh.name = json.nodes[meshNode].name || 'mesh';
  nodes[meshNode] = mesh;
  json.nodes.forEach((n, i) => { for (const c of n.children || []) nodes[i].add(nodes[c]); });
  const scene = new THREE.Group();
  scene.name = 'Mascotte';
  for (const i of json.scenes[json.scene || 0].nodes) scene.add(nodes[i]);
  scene.updateMatrixWorld(true);
  const ibm = accessor(glb, skin.inverseBindMatrices).array, inverses = skin.joints.map((_, k) => new THREE.Matrix4().fromArray(ibm, k*16));
  mesh.bind(new THREE.Skeleton(skin.joints.map(i => nodes[i]), inverses), new THREE.Matrix4());
  const bones = {};
  for (const i of skin.joints) bones[json.nodes[i].name] = nodes[i];
  return { scene, mesh, bones, json, triangles: idx.count/3, bytes: glb.bytes, vertices: geo.attributes.position.count };
}

// Vertici della pelle dove sono adesso, nel mondo. only(i, pesi) sceglie i vertici (facoltativo).
const _v = new THREE.Vector3();
export function skinnedVertices(mesh, only = null){
  mesh.updateMatrixWorld(true);
  mesh.skeleton.bones.forEach(b => b.updateMatrixWorld(true));
  mesh.skeleton.update();
  const pos = mesh.geometry.attributes.position, out = [];
  for (let i = 0; i < pos.count; i++){
    if (only && !only(i)) continue;
    mesh.applyBoneTransform(i, _v.fromBufferAttribute(pos, i));
    out.push(_v.clone().applyMatrix4(mesh.matrixWorld));
  }
  return out;
}
