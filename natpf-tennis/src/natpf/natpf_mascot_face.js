// B67 · Faccia triste delle mascotte 3D per la card della sconfitta (richiesta dell'utente del 18/11/2026: «per la
// sconfitta la mascotte deve sembrare visibilmente triste»; docs/b67/pose-mascotte.md).
// La faccia dei modelli 3D è disegnata nella texture e sorride sempre. Qui, senza toccare il modello né la sua texture,
// una MASCHERA: i soli triangoli davanti della faccia (circa 1.200 su 8.200), con la stessa pelle e le stesse ossa del
// modello (posizioni, normali e pesi condivisi: si piega con la testa come la faccia vera), e una texture piccola
// disegnata qui con il canvas (320 × 228 punti, 0,3 MB) proiettata di fronte nel sistema dell'osso della testa:
// trasparente tranne dove cambia qualcosa:
//   · la bocca sorridente coperta con il colore della pelle e una bocca triste all'ingiù (aperta, come lo stile del
//     disegno);
//   · le palpebre che cadono sugli occhi, più basse verso l'esterno (sguardo da cucciolo), con la riga scura;
//   · sopracciglia all'ingiù verso l'esterno (Drop: sopra gli occhi c'è la fascia, si stanno sotto; Lob: gli occhiali e
//     la visiera, niente sopracciglia);
//   · una lacrima sotto un occhio.
// Si accende solo nella fotografia della sconfitta (natpf_mascot_rig.poseMascotCard: face 'sad') e si spegne alla prima
// posa del gioco. Si costruisce una volta per attore, alla prima card triste.
// Misure della faccia: dalla vista di fronte della texture sui vertici nel sistema dell'osso Head (strumento di
// sviluppo, non nel gioco), in unità del modello.
import * as THREE from 'three';

export const FACE_LAYOUT = Object.freeze({
  drop: Object.freeze({
    skin: '#0178db', box: Object.freeze([-0.2, 0.22, 0.0, 0.3]),
    eyes: Object.freeze([Object.freeze({ cx: -0.0975, cy: 0.161, rx: 0.065, ry: 0.069, ring: 0.006 }), Object.freeze({ cx: 0.106, cy: 0.1675, rx: 0.064, ry: 0.068, ring: 0.006 })]),
    mouth: Object.freeze({ cx: 0.006, cy: 0.074, rx: 0.074, ry: 0.044 }), brows: true,
  }),
  lob: Object.freeze({
    skin: '#ffdb14', box: Object.freeze([-0.2, 0.22, 0.02, 0.32]),
    eyes: Object.freeze([Object.freeze({ cx: -0.096, cy: 0.189, rx: 0.069, ry: 0.062, ring: 0.016 }), Object.freeze({ cx: 0.1025, cy: 0.215, rx: 0.07, ry: 0.0725, ring: 0.016 })]),
    mouth: Object.freeze({ cx: 0.008, cy: 0.105, rx: 0.075, ry: 0.048 }), brows: false,
  }),
});
// Forma della testa (ellissoide nel sistema dell'osso Head, come natpf_mascot_rig.MASCOT_HEAD_SHAPE): i triangoli che
// ne sporgono più di FACE_OUT (la visiera di Lob) non prendono il disegno
const HEAD = Object.freeze({ drop: Object.freeze([0.272, 0.235, 0.275, -0.008, 0.165, 0]), lob: Object.freeze([0.28, 0.236, 0.275, -0.012, 0.172, 0]) });
export const FACE_OUT = 0.012, FACE_FRONT = 0.1, FACE_PX = 320;
const INK = '#0b1026';

// Disegno della faccia triste in un canvas (unità della testa: x a destra di chi guarda, y in su)
export function paintSadFace(ctx, key, W, H){
  const L = FACE_LAYOUT[key] || FACE_LAYOUT.drop, [x0, x1, y0, y1] = L.box;
  ctx.setTransform(W/(x1 - x0), 0, 0, -H/(y1 - y0), -x0*W/(x1 - x0), y1*H/(y1 - y0));
  ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // bocca: coperta con la pelle (bordo sfumato), poi la bocca triste
  const M = L.mouth;
  ctx.fillStyle = L.skin;
  ctx.beginPath(); ctx.ellipse(M.cx, M.cy, M.rx, M.ry, 0, 0, 2*Math.PI); ctx.fill();
  const w = 0.042, top = M.cy + 0.03, base = M.cy - 0.022;
  ctx.beginPath();
  ctx.moveTo(M.cx - w, base);
  ctx.bezierCurveTo(M.cx - w*0.7, top + 0.012, M.cx + w*0.7, top + 0.012, M.cx + w, base);
  ctx.quadraticCurveTo(M.cx, base + 0.016, M.cx - w, base);
  ctx.closePath();
  ctx.fillStyle = '#6b0f1e'; ctx.fill();
  ctx.lineWidth = 0.009; ctx.strokeStyle = INK; ctx.stroke();
  // occhi: palpebra che cade, più bassa dalla parte di fuori (lato lontano dal naso)
  for (const e of L.eyes){
    const out = Math.sign(e.cx - M.cx) || 1, rx = e.rx - e.ring, ry = e.ry - e.ring;
    // retta della palpebra: vicino al naso alta, fuori bassa
    const yIn = e.cy + 0.62*ry, yOut = e.cy + 0.02*ry, xIn = e.cx - out*rx, xOut = e.cx + out*rx;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(e.cx, e.cy, rx, ry, 0, 0, 2*Math.PI); ctx.clip();
    ctx.beginPath(); ctx.moveTo(xIn - out*0.02, yIn + (yIn - yOut)*0.02/(2*rx)); ctx.lineTo(xOut + out*0.02, yOut - (yIn - yOut)*0.02/(2*rx));
    ctx.lineTo(xOut + out*0.02, e.cy + e.ry + 0.02); ctx.lineTo(xIn - out*0.02, e.cy + e.ry + 0.02); ctx.closePath();
    ctx.fillStyle = L.skin; ctx.fill();
    ctx.beginPath(); ctx.moveTo(xIn, yIn); ctx.lineTo(xOut, yOut);
    ctx.lineWidth = 0.011; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    // sopracciglio all'ingiù verso l'esterno
    if (L.brows){
      ctx.beginPath(); ctx.moveTo(e.cx - out*0.55*e.rx, e.cy + e.ry + 0.034); ctx.quadraticCurveTo(e.cx + out*0.1*e.rx, e.cy + e.ry + 0.03, e.cx + out*0.75*e.rx, e.cy + e.ry + 0.006);
      ctx.lineWidth = 0.013; ctx.strokeStyle = INK; ctx.stroke();
    }
  }
  // lacrima sotto l'occhio a destra di chi guarda, dalla parte di fuori
  const e = L.eyes[1], tx = e.cx + 0.45*e.rx, ty = e.cy - e.ry - 0.03, r = 0.016;
  ctx.beginPath();
  ctx.moveTo(tx, ty + 2.3*r);
  ctx.bezierCurveTo(tx + 0.25*r, ty + 1.4*r, tx + r, ty + 0.7*r, tx + r, ty);
  ctx.arc(tx, ty, r, 0, Math.PI, true);
  ctx.bezierCurveTo(tx - r, ty + 0.7*r, tx - 0.25*r, ty + 1.4*r, tx, ty + 2.3*r);
  ctx.closePath();
  ctx.fillStyle = '#a8ecff'; ctx.fill();
  ctx.lineWidth = 0.005; ctx.strokeStyle = '#0a3a7a'; ctx.stroke();
  ctx.beginPath(); ctx.arc(tx - 0.35*r, ty + 0.15*r, 0.3*r, 0, 2*Math.PI); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// Triangoli della maschera e loro coordinate nella texture, dai vertici nel sistema dell'osso della testa (pure: le prove
// la usano senza browser). pos(i) → [x, y, z] nel sistema della testa.
export function faceMaskTriangles(key, count, index, pos){
  const L = FACE_LAYOUT[key] || FACE_LAYOUT.drop, [x0, x1, y0, y1] = L.box, [rx, ry, rz, cx, cy, cz] = HEAD[key] || HEAD.drop;
  const P = new Float32Array(count*3), uv = new Float32Array(count*2), ok = new Uint8Array(count);
  for (let i = 0; i < count; i++){
    const [x, y, z] = pos(i);
    P[3*i] = x; P[3*i + 1] = y; P[3*i + 2] = z;
    uv[2*i] = (x - x0)/(x1 - x0); uv[2*i + 1] = (y - y0)/(y1 - y0);
    const zs = cz + rz*Math.sqrt(Math.max(0, 1 - ((x - cx)/rx)**2 - ((y - cy)/ry)**2));
    ok[i] = x > x0 && x < x1 && y > y0 && y < y1 && z > FACE_FRONT && z - zs < FACE_OUT ? 1 : 0;
  }
  const tri = [];
  for (let t = 0; t < index.length; t += 3){
    const a = index[t], b = index[t + 1], c = index[t + 2];
    if (!ok[a] || !ok[b] || !ok[c]) continue;
    // davanti: la normale del triangolo verso chi guarda
    const ux = P[3*b] - P[3*a], uy = P[3*b + 1] - P[3*a + 1], vx = P[3*c] - P[3*a], vy = P[3*c + 1] - P[3*a + 1];
    if (ux*vy - uy*vx <= 0) continue;
    tri.push(a, b, c);
  }
  return { index: tri, uv };
}

const TEX = {};
function faceTexture(key){
  if (TEX[key]) return TEX[key];
  const L = FACE_LAYOUT[key] || FACE_LAYOUT.drop, [x0, x1, y0, y1] = L.box;
  const c = document.createElement('canvas'); c.width = FACE_PX; c.height = Math.round(FACE_PX*(y1 - y0)/(x1 - x0));
  paintSadFace(c.getContext('2d'), key, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (TEX[key] = t);
}

// La maschera della faccia triste di un rig (natpf_mascot_rig.createMascotRig): una volta per attore, spenta.
const _v = new THREE.Vector3(), _m = new THREE.Matrix4();
export function ensureSadFace(rig){
  if (rig.face !== undefined || typeof document === 'undefined') return rig.face || null;
  rig.face = null;
  let skin = null;
  rig.model.traverse(o => { if (o.isSkinnedMesh && !skin) skin = o; });
  const head = skin?.skeleton?.bones.indexOf(rig.head.bone) ?? -1;
  if (!skin || head < 0) return null;
  const g = skin.geometry, pos = g.attributes.position;
  // sistema della testa al riposo: inversa del legame dell'osso per la matrice di legame della mesh
  _m.multiplyMatrices(skin.skeleton.boneInverses[head], skin.bindMatrix);
  const { index, uv } = faceMaskTriangles(rig.key, pos.count, g.index.array, i => _v.fromBufferAttribute(pos, i).applyMatrix4(_m).toArray());
  if (!index.length) return null;
  const geo = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) geo.setAttribute(k, g.attributes[k]);
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  // stesso materiale della mascotte (stesso programma), con la texture della faccia e la trasparenza
  const mat = skin.material.clone();
  mat.map = faceTexture(rig.key); mat.emissiveMap = mat.map;
  mat.transparent = true; mat.depthWrite = false;
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -4;
  mat.userData.natpfRim = skin.material.userData.natpfRim;
  mat.name = `${skin.material.name}-triste`;
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.name = 'NatpfFacciaTriste';
  mesh.bind(skin.skeleton, skin.bindMatrix);
  mesh.bindMode = skin.bindMode;
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 1;
  mesh.visible = false;
  mesh.userData.natpfMaterial = true;
  skin.parent.add(mesh);
  mesh.position.copy(skin.position); mesh.quaternion.copy(skin.quaternion); mesh.scale.copy(skin.scale);
  mesh.layers.mask = skin.layers.mask;
  rig.face = mesh;
  return mesh;
}
