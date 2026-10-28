// Arena ESPORTS FITP / SuperTennis: ricostruzione dagli screenshot di riferimento.
// Coordinate in metri; campo centrato nell'origine, rete lungo l'asse x (z = 0), fondi a z = ±11.885.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import { seatedParts, standingParts, makeCrowd } from './figures.js';

export const COURT = { halfWidth: 5.485, halfLength: 11.885, singlesHalfWidth: 4.115, serviceLine: 6.4, netHeight: 0.914, netPostHeight: 1.07, netPostX: 6.4 };
export const ARENA = { hw: 10.4, hl: 18.6, backWallH: 3.6, sideWallH: 1.15, terraceH: 2.9 };

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

function boxAt(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export async function buildArena(scene, { quality = 'high' } = {}) {
  TX.seed(20261028);
  const rand = TX.rand;
  await Promise.all([
    document.fonts.load('italic 300 40px Kanit'),
    document.fonts.load('italic 900 40px Kanit'),
    document.fonts.load('italic 200 40px Kanit'),
    document.fonts.load('700 40px Kanit'),
  ]);
  const esports = await loadImage('assets/brand/esports-fitp.png');
  const { hw, hl } = ARENA;
  const root = new THREE.Group();
  root.name = 'arena';
  scene.add(root);
  const handles = {};

  // ── cielo, skyline, prato ────────────────────────────────────────────────
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.MeshBasicMaterial({ map: TX.toTexture(TX.skyCanvas()), side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  sky.rotation.y = 0.6;
  root.add(sky);

  const skylineTex = TX.toTexture(TX.skylineCanvas(), { repeat: [3, 1] });
  skylineTex.wrapT = THREE.ClampToEdgeWrapping;
  const skyline = new THREE.Mesh(
    new THREE.CylinderGeometry(330, 330, 150, 64, 1, true),
    new THREE.MeshBasicMaterial({ map: skylineTex, transparent: true, side: THREE.BackSide, fog: true, depthWrite: false }),
  );
  skyline.position.y = 66;
  root.add(skyline);

  const grass = new THREE.Mesh(new THREE.CircleGeometry(420, 48), lambert('#5f9e3e'));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.06;
  root.add(grass);

  // pavimentazione esagonale attorno all'arena
  const hex = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    lambert('#ffffff', { map: TX.toTexture(TX.hexCanvas(), { repeat: [36, 36] }) }),
  );
  hex.rotation.x = -Math.PI / 2;
  hex.position.y = -0.02;
  hex.receiveShadow = true;
  root.add(hex);

  // ── pavimento del campo ──────────────────────────────────────────────────
  const groundTex = TX.toTexture(TX.groundCanvas(hw, hl, quality === 'high' ? 72 : 52), { aniso: 16 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hl * 2), lambert('#ffffff', { map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);
  handles.ground = ground;

  // ── pareti con i loghi ───────────────────────────────────────────────────
  const wallMat = (c) => lambert('#ffffff', { map: TX.toTexture(c) });
  const wallTopMat = lambert('#7a5cf4');
  const wallSideMat = lambert(TX.COLORS.wallDark);
  const addWall = (len, h, thick, layout, pos, rotY) => {
    const front = wallMat(TX.wallCanvas(len, h, layout, { esports }));
    const g = new THREE.BoxGeometry(len, h, thick);
    // facce: +x, -x, +y, -y, +z (fronte), -z (retro)
    const m = new THREE.Mesh(g, [wallSideMat, wallSideMat, wallTopMat, wallSideMat, front, wallMat(TX.wallCanvas(len, h, [], {}))]);
    m.position.set(pos[0], h / 2, pos[2]);
    m.rotation.y = rotY;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const backLen = 2 * hw + 0.8;
  const backLayout = [
    { kind: 'esp', at: 0.13, size: 0.5 },
    { kind: 'st', at: 0.5, size: 0.5 },
    { kind: 'esp', at: 0.87, size: 0.5 },
  ];
  addWall(backLen, ARENA.backWallH, 0.4, backLayout, [0, 0, -hl - 0.2], 0);
  addWall(backLen, ARENA.backWallH, 0.4, backLayout, [0, 0, hl + 0.2], Math.PI);
  const sideLen = 2 * hl;
  const sideLayout = [];
  const nSide = 6;
  for (let i = 0; i < nSide; i++) sideLayout.push({ kind: i % 2 ? 'esp' : 'st', at: (i + 0.5) / nSide, size: i % 2 ? 0.8 : 0.62 });
  addWall(sideLen, ARENA.sideWallH, 0.35, sideLayout, [-hw - 0.175, 0, 0], Math.PI / 2);
  addWall(sideLen, ARENA.sideWallH, 0.35, sideLayout, [hw + 0.175, 0, 0], -Math.PI / 2);

  // ── tribune laterali ─────────────────────────────────────────────────────
  const stepGeos = [], seatGeos = [], seatTopGeos = [], dividerGeos = [], aisleGeos = [];
  const crowdMatrices = [];
  const tiers = 7, rowDepth = 1.0, rise = 0.56, base = 1.25;
  const blockLen = 8.6, aisle = 1.5;
  const zStart = -hl + 0.2, zEnd = hl - 0.2;
  const blocks = [];
  for (let z = zStart; z + blockLen <= zEnd + 0.01; z += blockLen + aisle) blocks.push([z, z + blockLen]);
  const standOuter = hw + 1.1 + tiers * rowDepth;
  const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
  for (const side of [-1, 1]) {
    for (let i = 0; i < tiers; i++) {
      const x0 = hw + 1.1 + i * rowDepth;
      const y = base + i * rise;
      const depth = standOuter - x0;
      // gradone (tutto il lato, sotto le sedute e le scale)
      stepGeos.push(boxAt(depth, y, zEnd - zStart, side * (x0 + depth / 2), y / 2, (zStart + zEnd) / 2));
      for (const [za, zb] of blocks) {
        const len = zb - za;
        const sx = side * (x0 + 0.28);
        seatGeos.push(boxAt(0.42, 0.36, len, sx, y + 0.18, (za + zb) / 2));
        seatTopGeos.push(boxAt(0.46, 0.06, len, sx, y + 0.39, (za + zb) / 2));
        // pubblico seduto
        for (let zz = za + 0.35; zz < zb - 0.2; zz += 0.58) {
          if (rand() > 0.68) continue;
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), side > 0 ? -Math.PI / 2 : Math.PI / 2);
          const lean = (rand() - 0.5) * 0.25;
          q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), lean));
          tmpM.compose(new THREE.Vector3(sx + side * 0.02, y + 0.42, zz + (rand() - 0.5) * 0.1), q, sc);
          crowdMatrices.push(tmpM.clone());
        }
      }
      // scalini nei corridoi
      for (let b = 0; b < blocks.length - 1; b++) {
        const za = blocks[b][1], zb = blocks[b + 1][0];
        aisleGeos.push(boxAt(rowDepth / 2, y + rise / 2, zb - za, side * (x0 + rowDepth * 0.25), (y + rise / 2) / 2, (za + zb) / 2));
      }
    }
    // parapetti viola inclinati ai lati dei corridoi
    const slopeLen = Math.hypot(tiers * rowDepth, tiers * rise);
    const ang = Math.atan2(tiers * rise, tiers * rowDepth);
    const edges = [zStart - 0.1, zEnd + 0.1];
    for (let b = 0; b < blocks.length - 1; b++) edges.push(blocks[b][1], blocks[b + 1][0]);
    for (const ze of edges) {
      const g = new THREE.BoxGeometry(slopeLen + 0.9, 1.3, 0.38);
      g.rotateZ(side > 0 ? ang : -ang);
      g.translate(side * (hw + 1.1 + (tiers * rowDepth) / 2), base + (tiers * rise) / 2 + 0.35, ze);
      dividerGeos.push(g);
    }
    // pedana del corridoio tra il muro laterale e la tribuna
    stepGeos.push(boxAt(0.8, 0.3, zEnd - zStart, side * (hw + 0.75), 0.15, (zStart + zEnd) / 2));
    // muro di fondo della tribuna
    dividerGeos.push(boxAt(0.4, base + tiers * rise + 1.4, zEnd - zStart, side * (standOuter + 0.2), (base + tiers * rise + 1.4) / 2, (zStart + zEnd) / 2));
  }
  const stepMat = lambert('#9195bd');
  const seatMat = lambert('#d48a43');
  const seatTopMat = lambert('#e9a75a');
  const purpleMat = lambert('#5a36e8');
  const addMerged = (geos, mat, shadow = false) => {
    if (!geos.length) return null;
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.receiveShadow = shadow;
    root.add(m);
    return m;
  };
  addMerged(stepGeos, stepMat, true);
  addMerged(seatGeos, seatMat);
  addMerged(seatTopGeos, seatTopMat);
  addMerged(aisleGeos, lambert('#c6c3dc'));
  addMerged(dividerGeos, purpleMat);

  root.add(makeCrowd(seatedParts(), crowdMatrices, rand));

  // ── terrazze dietro i fondi: piano rialzato, parapetto, ombrelloni ───────
  const terraceGeos = [], parapetGeos = [], poleGeos = [], tableGeos = [];
  const umbrellaGeos = [];
  for (const end of [-1, 1]) {
    const zIn = end * (hl + 0.4), depth = 9, tH = ARENA.terraceH;
    terraceGeos.push(boxAt(2 * standOuter + 1, tH, depth, 0, tH / 2, zIn + end * depth / 2));
    parapetGeos.push(boxAt(2 * standOuter + 1, 1.0, 0.3, 0, tH + 0.5, zIn + end * (depth - 0.15)));
    for (let k = -4; k <= 4; k++) {
      const x = k * 3.1 + (rand() - 0.5) * 0.6;
      const z = zIn + end * (4.2 + rand() * 2.5);
      const y = ARENA.terraceH;
      poleGeos.push(boxAt(0.06, 2.2, 0.06, x, y + 1.1, z));
      const cone = new THREE.ConeGeometry(1.25, 0.5, 10);
      cone.translate(x, y + 2.35, z);
      umbrellaGeos.push(cone);
      tableGeos.push(boxAt(0.9, 0.06, 0.9, x, y + 0.74, z));
      tableGeos.push(boxAt(0.08, 0.72, 0.08, x, y + 0.37, z));
    }
  }
  addMerged(terraceGeos, purpleMat, true);
  addMerged(parapetGeos, lambert('#6a48f0'));
  addMerged(poleGeos, lambert('#dddddd'));
  addMerged(umbrellaGeos, lambert('#f08a2a'));
  addMerged(tableGeos, lambert('#f4f1ff'));

  // ── rete ────────────────────────────────────────────────────────────────
  const net = new THREE.Group();
  const px = COURT.netPostX;
  const netGeo = new THREE.PlaneGeometry(2 * px, 1, 48, 1);
  const pos = netGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), top = pos.getY(i) > 0;
    const h = COURT.netHeight + (COURT.netPostHeight - COURT.netHeight) * (x / px) ** 2;
    pos.setY(i, top ? h - 0.02 : 0.02);
  }
  netGeo.computeVertexNormals();
  const netTex = TX.toTexture(TX.netCanvas(), { repeat: [24, 1] });
  const netMesh = new THREE.Mesh(netGeo, new THREE.MeshLambertMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.2 }));
  netMesh.castShadow = true;
  net.add(netMesh);
  const tapePts = [];
  for (let i = 0; i <= 32; i++) {
    const x = -px + (2 * px * i) / 32;
    tapePts.push(new THREE.Vector3(x, COURT.netHeight + (COURT.netPostHeight - COURT.netHeight) * (x / px) ** 2, 0));
  }
  const tape = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tapePts), 64, 0.03, 6), lambert('#f6f6ff'));
  tape.castShadow = true;
  net.add(tape);
  const strap = new THREE.Mesh(boxAt(0.05, COURT.netHeight, 0.02, 0, COURT.netHeight / 2, 0), lambert('#f6f6ff'));
  net.add(strap);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, COURT.netPostHeight + 0.05, 12), lambert('#8f8f9a'));
    post.position.set(s * px, (COURT.netPostHeight + 0.05) / 2, 0);
    post.castShadow = true;
    net.add(post);
  }
  root.add(net);

  // ── sedia dell'arbitro ──────────────────────────────────────────────────
  const chair = new THREE.Group();
  const chairMat = lambert('#e8e3ff');
  const cg = [];
  for (const [dx, dz] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.35], [0.4, 0.35]]) cg.push(boxAt(0.1, 1.9, 0.1, dx, 0.95, dz));
  cg.push(boxAt(1.0, 0.12, 0.9, 0, 1.9, 0));
  cg.push(boxAt(0.7, 0.1, 0.6, 0, 2.15, 0));
  cg.push(boxAt(0.7, 0.8, 0.08, 0.32, 2.5, 0));
  cg.push(boxAt(0.12, 0.5, 0.6, 0, 2.15, -0.32));
  cg.push(boxAt(0.12, 0.5, 0.6, 0, 2.15, 0.32));
  cg.push(boxAt(0.95, 0.9, 0.85, 0.02, 1.4, 0));
  for (let i = 0; i < 6; i++) cg.push(boxAt(0.4, 0.05, 0.6, 0.75 + i * 0.12, 0.25 + i * 0.3, 0)); // scaletta
  cg.push(boxAt(0.06, 2.0, 0.06, 1.15, 1.0, 0.3));
  cg.push(boxAt(0.06, 2.0, 0.06, 1.15, 1.0, -0.3));
  const chairMesh = new THREE.Mesh(mergeGeometries(cg), chairMat);
  chairMesh.castShadow = true;
  chair.add(chairMesh);
  const canopy = new THREE.Mesh(boxAt(0.9, 0.05, 0.9, 0.2, 3.15, 0), lambert('#b9b0ff'));
  chair.add(canopy);
  chair.add(new THREE.Mesh(boxAt(0.04, 0.4, 0.04, 0.32, 2.95, 0), chairMat));
  // arbitro seduto, rivolto verso il campo (-x)
  const umpM = new THREE.Matrix4().compose(new THREE.Vector3(0.05, 2.2, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2), sc);
  chair.add(makeCrowd(seatedParts(), [umpM], rand, { shirt: '#2a3354', pants: '#2a2f40' }));
  chair.position.set(px + 1.35, 0, 0);
  root.add(chair);

  // ── panchine dei giocatori ───────────────────────────────────────────────
  const benchGeos = [];
  for (const dz of [-2.4, 2.4]) {
    for (const k of [0, 1]) {
      const z = dz + (k - 0.5) * 0.75;
      benchGeos.push(boxAt(0.62, 0.45, 0.62, 0, 0.225, z));
      benchGeos.push(boxAt(0.14, 0.62, 0.62, -0.28, 0.76, z));
    }
    benchGeos.push(boxAt(0.6, 0.55, 0.6, 0.05, 0.275, dz + (dz > 0 ? 1.0 : -1.0)));
  }
  const benches = new THREE.Mesh(mergeGeometries(benchGeos), lambert('#f6f2ff'));
  benches.position.x = -(px + 1.6);
  benches.castShadow = true;
  root.add(benches);

  // ── raccattapalle e tabelloni sul fondo ──────────────────────────────────
  const kidMats = [];
  for (const end of [-1, 1]) {
    for (const s of [-1, 1]) {
      kidMats.push(new THREE.Matrix4().compose(
        new THREE.Vector3(s * 4.4, 0, end * (hl - 0.45)),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), end > 0 ? Math.PI : 0),
        new THREE.Vector3(0.95, 0.95, 0.95),
      ));
    }
  }
  root.add(makeCrowd(standingParts(), kidMats, rand, { shirt: '#f2f2f6', pants: '#f2f2f6' }));

  const boards = [];
  const boardGeo = new THREE.BoxGeometry(0.95, 0.7, 0.22);
  for (const end of [-1, 1]) {
    for (const s of [-1, 1]) {
      const kind = s < 0 ? 'speed' : 'score';
      const c = TX.boardCanvas(kind === 'speed' ? [{ text: '- - -', size: 56 }, { text: 'km/h', size: 34, color: '#7fe3ff', weight: 400 }] : [{ text: '0-0', size: 74 }]);
      const tex = TX.toTexture(c);
      const mats = [lambert('#111'), lambert('#111'), lambert('#111'), lambert('#111'), new THREE.MeshBasicMaterial({ map: tex }), lambert('#111')];
      const b = new THREE.Mesh(boardGeo, mats);
      b.position.set(s * (kind === 'speed' ? 1.9 : 2.6), 0.42, end * (hl - 0.2));
      b.rotation.y = end > 0 ? Math.PI : 0;
      root.add(b);
      boards.push({ kind, canvas: c, tex });
    }
  }
  handles.setBoards = (speedKmh, scoreText) => {
    for (const b of boards) {
      const lines = b.kind === 'speed'
        ? [{ text: speedKmh ? String(Math.round(speedKmh)) : '- - -', size: 56 }, { text: 'km/h', size: 34, color: '#7fe3ff', weight: 400 }]
        : [{ text: scoreText, size: scoreText.length > 5 ? 52 : 74 }];
      const nc = TX.boardCanvas(lines);
      b.canvas.getContext('2d').drawImage(nc, 0, 0);
      b.tex.needsUpdate = true;
    }
  };

  // ── torri faro ──────────────────────────────────────────────────────────
  const towerGeos = [], lampGeos = [];
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,236,255,0.75)');
    g.addColorStop(1, 'rgba(255,200,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return TX.toTexture(c);
  })();
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, depthWrite: false, blending: THREE.AdditiveBlending, color: '#fff0ff', fog: false });
  const towers = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) towers.push([sx * (standOuter + 2), sz * (hl - 5)]);
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) towers.push([sx * 9, sz * (hl + 7)]);
  for (const [x, z] of towers) {
    const H = 17 + rand() * 3;
    const p = new THREE.CylinderGeometry(0.16, 0.28, H, 8);
    p.translate(x, H / 2, z);
    towerGeos.push(p);
    const crown = new THREE.CylinderGeometry(0.9, 0.5, 0.5, 8, 1, true);
    crown.translate(x, H + 0.2, z);
    towerGeos.push(crown);
    for (let k = 0; k < 5; k++) {
      const a = Math.atan2(-z, -x) + (k - 2) * 0.45;
      const lx = x + Math.cos(a) * 0.9, lz = z + Math.sin(a) * 0.9;
      const lamp = new THREE.BoxGeometry(0.5, 0.36, 0.2);
      lamp.rotateY(-a);
      lamp.translate(lx, H + 0.75, lz);
      lampGeos.push(lamp);
      const s = new THREE.Sprite(glowMat);
      s.position.set(lx, H + 0.75, lz);
      s.scale.setScalar(k === 2 ? 3.4 : 2.2);
      root.add(s);
    }
  }
  addMerged(towerGeos, lambert('#c4c2e2'));
  addMerged(lampGeos, new THREE.MeshBasicMaterial({ color: '#fff6ff' }));

  // ── alberi stilizzati: chiome tondeggianti verde lime e giallo ──────────
  const treeGeo = (() => {
    const parts = [];
    const brown = new THREE.Color('#7a3a1e');
    const colorize = (g, c, vary) => {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) {
        const shade = vary ? 0.8 + 0.35 * Math.max(0, g.attributes.position.getY(k) - 5) / 4 : 1;
        col[k * 3] = Math.min(1, c.r * shade); col[k * 3 + 1] = Math.min(1, c.g * shade); col[k * 3 + 2] = Math.min(1, c.b * shade);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.deleteAttribute('uv');
      return g;
    };
    const trunk = new THREE.CylinderGeometry(0.14, 0.3, 5.0, 6);
    trunk.translate(0, 2.5, 0);
    parts.push(colorize(trunk.toNonIndexed(), brown));
    for (const [rz, ry, len] of [[0.75, 0, 2.6], [-0.8, 2.0, 2.4], [0.6, 4.1, 2.2]]) {
      const br = new THREE.CylinderGeometry(0.06, 0.13, len, 5);
      br.translate(0, len / 2, 0);
      br.rotateZ(rz);
      br.rotateY(ry);
      br.translate(0, 3.6, 0);
      parts.push(colorize(br.toNonIndexed(), brown));
    }
    const greens = ['#a6d83a', '#d4e84a', '#6cc23e', '#4aa83f', '#8fd13c', '#c2e246'];
    const blobs = [[0, 6.6, 0, 1.7], [-1.8, 5.8, 0.5, 1.35], [1.7, 6.0, -0.4, 1.4], [0.4, 7.6, 0.8, 1.2], [-0.8, 7.3, -1.0, 1.2], [1.2, 5.4, 1.3, 1.0], [-1.2, 5.2, -1.4, 1.0], [2.6, 5.4, 0.6, 0.9], [-2.7, 5.1, -0.3, 0.9]];
    blobs.forEach(([x, y, z, r], i) => {
      const g = new THREE.IcosahedronGeometry(r, 1);
      g.scale(1.3, 0.75, 1.3);
      g.translate(x, y, z);
      parts.push(colorize(g, new THREE.Color(greens[i % greens.length]), true));
    });
    return mergeGeometries(parts);
  })();
  const treeSpots = [];
  for (const end of [-1, 1]) {
    for (let k = -5; k <= 5; k++) treeSpots.push([k * 4.6 + (rand() - 0.5) * 2, end * (hl + 11 + rand() * 4), 0]);
    for (let k = -4; k <= 4; k++) treeSpots.push([k * 6 + (rand() - 0.5) * 3, end * (hl + 20 + rand() * 8), 0]);
  }
  for (const side of [-1, 1]) for (let k = -4; k <= 4; k++) treeSpots.push([side * (standOuter + 5 + rand() * 6), k * 6 + (rand() - 0.5) * 3, 0]);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), treeSpots.length);
  treeSpots.forEach(([x, z], i) => {
    const s = 0.85 + rand() * 0.55;
    tmpM.compose(new THREE.Vector3(x, Math.abs(z) < hl + 9.5 && Math.abs(x) < standOuter ? ARENA.terraceH : 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28), new THREE.Vector3(s, s * (0.9 + rand() * 0.25), s));
    trees.setMatrixAt(i, tmpM);
  });
  trees.instanceMatrix.needsUpdate = true;
  root.add(trees);

  // ── luci ────────────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight('#c9b8ff', '#3b3a8c', 1.35);
  root.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe0c8', 2.1);
  sun.position.set(-18, 34, 14);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
  const sc2 = sun.shadow.camera;
  sc2.left = -14; sc2.right = 14; sc2.top = 22; sc2.bottom = -22; sc2.near = 1; sc2.far = 90;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  root.add(sun, sun.target);
  handles.sun = sun;

  scene.fog = new THREE.Fog('#c9a6c4', 260, 900);
  return handles;
}
