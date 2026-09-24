// Geometrie di base del mondo a blocchi, texture disegnate su canvas e fusione degli oggetti fermi.
import * as THREE from 'three';
import { addRect, colliders } from './collision.js';

let scene = null, maxAniso = 1;
export function initGeom(sc, renderer){ scene = sc; maxAniso = renderer.capabilities.getMaxAnisotropy(); }
export const segRot = (ax, az, bx, bz) => Math.atan2(-(bz - az), bx - ax); // rot che porta l'asse x locale lungo il segmento

/* ---------- helper geometrici ---------- */
export const BOX = new THREE.BoxGeometry(1,1,1);
const matCache = new Map();
export function mat(c){ if (!matCache.has(c)) matCache.set(c, new THREE.MeshLambertMaterial({ color: c })); return matCache.get(c); }

// box(w,h,d,...): x,z sono locali se si passa un frame `f`; y è la base
export function box(w,h,d,c,x,y,z,o={}){
  const m = new THREE.Mesh(BOX, o.material || mat(c));
  m.scale.set(w,h,d); m.castShadow = o.cast !== false; m.receiveShadow = true;
  if (o.parent){ m.position.set(x, y + h/2, z); o.parent.add(m); return m; }
  let wx = x, wz = z, rot = o.rot || 0;
  if (o.f){ [wx, wz] = o.f.w(x, z); rot += o.f.rot; }
  m.position.set(wx, y + h/2, wz); m.rotation.y = rot; scene.add(m);
  if (o.collide) addRect(colliders, wx, wz, w/2, d/2, rot);
  return m;
}
export function flat(w,d,x,y,z,material,rot=0,parent=scene){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w,d), material);
  m.rotation.set(-Math.PI/2, 0, rot); m.position.set(x,y,z); m.receiveShadow = true; parent.add(m); return m;
}
export function shapeOf(pts, holes = []){
  const s = new THREE.Shape(pts.map(([x,z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x,z]) => new THREE.Vector2(x, -z))));
  return s;
}
export function polyFlat(pts, y, material){
  const g = new THREE.ShapeGeometry(shapeOf(pts)); g.rotateX(-Math.PI/2);
  const m = new THREE.Mesh(g, material); m.position.y = y; m.receiveShadow = true; scene.add(m); return m;
}
// spezzata spostata di d a lato (giunzioni a mitra)
export function offsetLine(pts, d){
  const n = pts.length, out = [];
  const nrm = i => { const [ax,az] = pts[i], [bx,bz] = pts[i+1], L = Math.hypot(bx-ax, bz-az) || 1; return [-(bz-az)/L, (bx-ax)/L]; };
  for (let i = 0; i < n; i++){
    const a = i > 0 ? nrm(i-1) : nrm(0), b = i < n-1 ? nrm(i) : nrm(n-2);
    let mx = a[0] + b[0], mz = a[1] + b[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const k = d / Math.max(.35, mx*a[0] + mz*a[1]);
    out.push([pts[i][0] + mx*k, pts[i][1] + mz*k]);
  }
  return out;
}
export function ribbon(pts, w, y, material){
  const L = offsetLine(pts, w/2), Rr = offsetLine(pts, -w/2), pos = [], idx = [];
  for (let i = 0; i < pts.length; i++){ pos.push(L[i][0], y, L[i][1], Rr[i][0], y, Rr[i][1]); }
  for (let i = 0; i < pts.length - 1; i++){ const a = 2*i; idx.push(a, a+1, a+2, a+1, a+3, a+2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.receiveShadow = true; m.material.side = THREE.DoubleSide; scene.add(m); return m;
}
export function clipPoly(pts, x0, x1, z0, z1){ // Sutherland-Hodgman su un rettangolo
  const edges = [[p => p[0] >= x0, (a,b) => cut(a,b,0,x0)], [p => p[0] <= x1, (a,b) => cut(a,b,0,x1)],
                 [p => p[1] >= z0, (a,b) => cut(a,b,1,z0)], [p => p[1] <= z1, (a,b) => cut(a,b,1,z1)]];
  function cut(a,b,k,v){ const u = (v - a[k])/(b[k] - a[k]); return [a[0] + (b[0]-a[0])*u, a[1] + (b[1]-a[1])*u]; }
  let out = pts;
  for (const [ins, isect] of edges){
    const src = out; out = [];
    for (let i = 0; i < src.length; i++){
      const cur = src[i], prev = src[(i + src.length - 1) % src.length];
      if (ins(cur)){ if (!ins(prev)) out.push(isect(prev, cur)); out.push(cur); }
      else if (ins(prev)) out.push(isect(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}

// istanze: un InstancedMesh per ogni parte, colore per istanza
export function instParts(items, parts, cast = true){
  const dummy = new THREE.Object3D(), m = new THREE.Matrix4(), pm = new THREE.Matrix4();
  const q = new THREE.Quaternion(), col = new THREE.Color();
  for (const p of parts){
    const list = p.filter ? items.filter(p.filter) : items;
    if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(BOX, new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length);
    pm.compose(new THREE.Vector3(...p.off), q, new THREE.Vector3(...p.size));
    list.forEach((it,i) => {
      dummy.position.set(it.x, it.y || 0, it.z); dummy.rotation.set(0, it.ry || 0, 0); dummy.scale.setScalar(it.s || 1);
      dummy.updateMatrix(); m.multiplyMatrices(dummy.matrix, pm); mesh.setMatrixAt(i, m);
      col.set(typeof p.color === 'function' ? p.color(it) : p.color); mesh.setColorAt(i, col);
    });
    mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh);
  }
}


/* ---------- texture ---------- */
export function canvasTex(w,h,draw,repeat){
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  if (repeat){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const courtTexCache = new Map();
export function courtTexture(w,l){
  const key = w + 'x' + l; if (courtTexCache.has(key)) return courtTexCache.get(key);
  const W = 512, H = Math.round(512*l/w), s = W/w;
  const t = canvasTex(W, H, (x) => {
    x.fillStyle = '#c4623a'; x.fillRect(0,0,W,H);
    for (let i=0;i<5000;i++){ x.fillStyle = Math.random()<.5 ? 'rgba(120,45,20,.10)' : 'rgba(255,210,170,.10)'; x.fillRect(Math.random()*W, Math.random()*H, 3, 3); }
    const X = m => W/2 + m*s, Y = m => H/2 + m*s;
    x.strokeStyle = '#f7f2e8'; x.lineWidth = Math.max(3, 0.07*s); x.lineCap = 'square';
    const ln = (a,b,c,d) => { x.beginPath(); x.moveTo(X(a),Y(b)); x.lineTo(X(c),Y(d)); x.stroke(); };
    x.strokeRect(X(-5.485), Y(-11.885), 10.97*s, 23.77*s);
    ln(-4.115,-11.885,-4.115,11.885); ln(4.115,-11.885,4.115,11.885);
    ln(-4.115,-6.4,4.115,-6.4); ln(-4.115,6.4,4.115,6.4); ln(0,-6.4,0,6.4);
    ln(0,-11.885,0,-11.585); ln(0,11.885,0,11.585);
  });
  courtTexCache.set(key, t); return t;
}
export function mosaicTex(repeat){
  return canvasTex(256, 256, (x,W,H) => {
    x.fillStyle = '#f1ece1'; x.fillRect(0,0,W,H);
    x.fillStyle = '#1d1d1f';
    x.fillRect(0,10,W,6); x.fillRect(0,H-16,W,6);
    for (let i=0;i<W;i+=32){ // greca
      x.fillRect(i,22,24,4); x.fillRect(i+20,22,4,16); x.fillRect(i+8,34,16,4); x.fillRect(i+8,30,4,8);
      x.fillRect(i,H-26,24,4); x.fillRect(i+20,H-38,4,16); x.fillRect(i+8,H-38,16,4); x.fillRect(i+8,H-38,4,8);
    }
    x.lineWidth = 7; x.strokeStyle = '#1d1d1f';
    x.beginPath(); x.arc(W/2,H/2,48,0,Math.PI*2); x.stroke();
    x.save(); x.translate(W/2,H/2);
    for (let k=0;k<8;k++){ x.rotate(Math.PI/4); x.fillRect(-4,-34,8,26); }
    x.restore();
    x.fillRect(W/2-10,H/2-10,20,20);
    for (let i=0;i<220;i++){ x.fillStyle = `rgba(0,0,0,${Math.random()*.06})`; x.fillRect(Math.random()*W, Math.random()*H, 5, 5); }
  }, repeat);
}


/* ---------- un'unica geometria per materiale ----------
   Con la mappa reale ci sono migliaia di oggetti fermi (edifici, percorsi, gradoni, recinzioni): disegnarli uno a uno
   rallenta i computer meno potenti e i telefoni. Qui si fondono per materiale, dopo aver applicato la loro posizione. */
export function batchStatic(){
  const groups = new Map(), drop = [];
  scene.updateMatrixWorld(true);
  for (const m of scene.children){
    if (!m.isMesh || m.isInstancedMesh || m.material.map || m.userData.dynamic || m.userData.merged || !m.geometry.attributes.position) continue;
    const key = m.material.uuid + (m.castShadow ? '|s' : '|n');
    if (!groups.has(key)) groups.set(key, { material: m.material, cast: m.castShadow, list: [] });
    groups.get(key).list.push(m); drop.push(m);
  }
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const { material, cast, list } of groups.values()){
    if (list.length < 2){ drop.splice(drop.indexOf(list[0]), 1); continue; }
    let n = 0;
    for (const m of list){ const g = m.geometry; n += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(n*3), nor = new Float32Array(n*3); let o = 0;
    for (const m of list){
      const g = m.geometry; if (!g.attributes.normal) g.computeVertexNormals();
      const P = g.attributes.position, N = g.attributes.normal, I = g.index, cnt = I ? I.count : P.count;
      nm.getNormalMatrix(m.matrixWorld);
      for (let k = 0; k < cnt; k++, o++){
        const i = I ? I.getX(k) : k;
        v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); pos[o*3] = v.x; pos[o*3+1] = v.y; pos[o*3+2] = v.z;
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[o*3] = v.x; nor[o*3+1] = v.y; nor[o*3+2] = v.z;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, material); mesh.castShadow = cast; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.userData.merged = true; scene.add(mesh);
  }
  for (const m of drop){ scene.remove(m); if (m.geometry !== BOX) m.geometry.dispose(); }
}
