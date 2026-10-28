// Figure low-poly per pubblico, arbitro e raccattapalle: geometrie divise per colore (maglia, pelle, pantaloni,
// capelli), da usare con InstancedMesh e un colore per istanza.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js';

function box(w, h, d, x, y, z, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  return g.toNonIndexed(); // le sfere non sono indicizzate: per unirle servono geometrie dello stesso tipo
}
function ball(r, x, y, z, sy = 1) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  return g;
}

// Persona seduta che guarda verso +z; origine sul piano della seduta.
export function seatedParts() {
  return {
    shirt: mergeGeometries([
      box(0.36, 0.5, 0.22, 0, 0.3, -0.04),
      box(0.1, 0.24, 0.11, 0.23, 0.42, -0.02),
      box(0.1, 0.24, 0.11, -0.23, 0.42, -0.02),
    ]),
    skin: mergeGeometries([
      ball(0.11, 0, 0.7, -0.02, 1.12),
      box(0.085, 0.24, 0.09, 0.22, 0.2, 0.1, -0.9),
      box(0.085, 0.24, 0.09, -0.22, 0.2, 0.1, -0.9),
      box(0.1, 0.42, 0.11, 0.09, -0.2, 0.38),
      box(0.1, 0.42, 0.11, -0.09, -0.2, 0.38),
    ]),
    pants: mergeGeometries([
      box(0.15, 0.13, 0.44, 0.09, 0.05, 0.16),
      box(0.15, 0.13, 0.44, -0.09, 0.05, 0.16),
      box(0.36, 0.12, 0.22, 0, 0.05, -0.04),
    ]),
    hair: mergeGeometries([ball(0.115, 0, 0.75, -0.04, 0.8)]),
  };
}

// Persona in piedi che guarda verso +z; origine a terra.
export function standingParts() {
  return {
    shirt: mergeGeometries([
      box(0.36, 0.55, 0.22, 0, 1.18, 0),
      box(0.1, 0.28, 0.11, 0.23, 1.28, 0),
      box(0.1, 0.28, 0.11, -0.23, 1.28, 0),
    ]),
    skin: mergeGeometries([
      ball(0.11, 0, 1.6, 0, 1.12),
      box(0.085, 0.3, 0.09, 0.23, 0.98, 0.02),
      box(0.085, 0.3, 0.09, -0.23, 0.98, 0.02),
      box(0.1, 0.42, 0.11, 0.09, 0.22, 0),
      box(0.1, 0.42, 0.11, -0.09, 0.22, 0),
    ]),
    pants: mergeGeometries([
      box(0.15, 0.42, 0.16, 0.09, 0.66, 0),
      box(0.15, 0.42, 0.16, -0.09, 0.66, 0),
    ]),
    hair: mergeGeometries([ball(0.115, 0, 1.65, -0.02, 0.8)]),
  };
}

const SHIRTS = ['#e8e4dc', '#f2efe8', '#9fb37a', '#7f9a5a', '#c76a5a', '#5f7fb8', '#e0b25e', '#d98a8a', '#8a6fb5', '#4f9a8a', '#f0f0f0', '#3e4d6b', '#b9c9a0', '#e57d4a'];
const SKINS = ['#f1c7a5', '#e2a982', '#c98b62', '#9c6644', '#6e4630', '#f5d2b8'];
const PANTS = ['#3d4766', '#5a5a62', '#2f3a52', '#7a6a58', '#e6e1d6', '#4a5f3c', '#8b8fa6'];
const HAIR = ['#2b1d14', '#4a3020', '#6b4a2a', '#c49a5a', '#1a1a1a', '#8a5a3a', '#d8c08a'];

function pick(list, r) { return list[Math.floor(r() * list.length) % list.length]; }

// Crea le InstancedMesh per un elenco di trasformazioni (Matrix4). opts.palette sovrascrive i colori.
export function makeCrowd(parts, matrices, rand, palette = {}) {
  const n = matrices.length;
  const group = new THREE.Group();
  const mats = {};
  for (const key of Object.keys(parts)) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const im = new THREE.InstancedMesh(parts[key], mat, n);
    im.frustumCulled = false;
    mats[key] = im;
    group.add(im);
  }
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    for (const key of Object.keys(parts)) mats[key].setMatrixAt(i, matrices[i]);
    mats.shirt.setColorAt(i, c.set(palette.shirt || pick(SHIRTS, rand)));
    mats.skin.setColorAt(i, c.set(palette.skin || pick(SKINS, rand)));
    mats.pants.setColorAt(i, c.set(palette.pants || pick(PANTS, rand)));
    mats.hair.setColorAt(i, c.set(palette.hair || pick(HAIR, rand)));
  }
  for (const im of Object.values(mats)) {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }
  return group;
}
