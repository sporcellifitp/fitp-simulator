// Lob & Drop come personaggi in campo (B24). Le due mascotte dell'evento, costruite nel codice come il tennista NATPF
// (natpf_character.js): geometrie semplici, niente modelli né immagini scaricate. Riferimento: la foto
// docs/riferimenti/lob-drop-2026-11-11.webp. Drop è blu, con la fascia bianca in testa (scritta DROP), il ciuffo e i
// polsini bianchi, occhi verdi. Lob è giallo, con la punta in cima alla testa, la visiera blu (scritta LOB), gli
// occhiali tondi neri, occhi azzurri. Tutti e due: testa grande, corpo piccolo a pera, braccia e gambe corte e grosse,
// mani a manopola, piedi grandi, bocca aperta che sorride.
// STESSO scheletro del tennista: le sei parti che il motore muove (Head, Torso, Hand_L, Hand_R, Foot_L, Foot_R) e le
// braccia e gambe a due segmenti sono quelle di prima; qui si aggiungono solo i pezzi da disegnare, figli delle stesse
// parti, e si nascondono quelli del tennista. Corsa, colpi, servizio, esultanza, racchetta nella mano (destri e mancini,
// che sono lo specchio) e impatto sulla palla non cambiano di una virgola: sono calcolati sulle parti, non sui pezzi.
// I pezzi nascono la prima volta che un attore diventa una mascotte: con «Classici» la scena è quella di prima.
// Niente allocazioni per fotogramma: tutto si fa al cambio di aspetto. Geometrie condivise tra gli attori.
// Cosa NON è riprodotto della foto: vedi docs/b24/lob-e-drop.md.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Colori (sRGB) presi dalla foto
export const MASCOT_COLORS = Object.freeze({
  drop: Object.freeze({ body: 0x2b7fe6, band: 0xffffff, iris: 0x1a9a62, label: '#1f6fd6' }),
  lob: Object.freeze({ body: 0xffdd1f, visor: 0x1f6fd6, iris: 0x2f95ea, glasses: 0x14161c, label: '#ffffff', bright: true }),
});
// Misure (unità del modello, prima della scala 1.16 del motore). Testa: ellissoide con il centro a cy sopra la parte Head.
export const MASCOT = Object.freeze({
  drop: Object.freeze({
    name: 'Drop', label: 'DROP', head: Object.freeze({ rx: 0.385, ry: 0.33, rz: 0.34, cy: 0.13 }),
    band: Object.freeze({ y0: 0.125, y1: 0.23, tilt: [0.04, 0, -0.09] }),
    eye: Object.freeze({ x: 0.142, y: -0.005, r: 0.1 }), mouthY: -0.155, wristBands: true,
  }),
  lob: Object.freeze({
    name: 'Lob', label: 'LOB', head: Object.freeze({ rx: 0.35, ry: 0.335, rz: 0.33, cy: 0.135 }),
    band: Object.freeze({ y0: 0.11, y1: 0.24, tilt: [0.06, -0.3, -0.1] }),
    eye: Object.freeze({ x: 0.13, y: -0.05, r: 0.09 }), mouthY: -0.205, wristBands: false, glasses: true,
  }),
});
// Spessore di braccia e gambe rispetto al tennista (stessi segmenti, più grossi), scala del viso (occhi, bocca,
// espressioni) rispetto a quello del tennista
export const MASCOT_LIMBS = Object.freeze({ arm: 1.5, leg: 1.45 });
export const MASCOT_FACE_SCALE = 1.45;
export const mascotOf = lookKey => (MASCOT[lookKey] ? lookKey : null);

// ---------------------------------------------------------------------------------------------------------------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function place(geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}){
  _q.setFromEuler(_e.set(r[0], r[1], r[2]));
  return geo.applyMatrix4(_m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2])));
}
const sphere = (opts, w = 16, h = 12) => place(new THREE.SphereGeometry(1, w, h), opts);
const merge = list => { const g = mergeGeometries(list); list.forEach(x => x.dispose()); return g; };
const lathe = (pts, segments = 28) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segments);
// Fascia che segue la testa: una zona dell'ellissoide tra le altezze y0 e y1 (dal centro), d più in fuori
function zone(H, y0, y1, d, phi0 = 0, phiLen = Math.PI*2, w = 36, h = 3){
  const t0 = Math.acos(Math.min(1, y1/H.ry)), t1 = Math.acos(Math.max(-1, y0/H.ry));
  return place(new THREE.SphereGeometry(1, w, h, phi0, phiLen, t0, t1 - t0), { s: [H.rx + d, H.ry + d, H.rz + d] });
}
// Punto della testa (z > 0, davanti) alle coordinate x, y dal centro, e la sua normale
function surface(H, x, y, out){
  const k = Math.max(0, 1 - (x/H.rx)**2 - (y/H.ry)**2), z = H.rz*Math.sqrt(k);
  const nx = x/(H.rx*H.rx), ny = y/(H.ry*H.ry), nz = z/(H.rz*H.rz), n = Math.hypot(nx, ny, nz) || 1;
  out.z = z; out.yaw = Math.atan2(nx, nz); out.pitch = -Math.asin(ny/n);
  return out;
}

let GEO = null;
function geometries(){
  if (GEO) return GEO;
  const D = MASCOT.drop, L = MASCOT.lob;
  const head = H => sphere({ p: [0, H.cy, 0], s: [H.rx, H.ry, H.rz] }, 32, 22);
  const tilted = (g, H, tilt) => place(g, { r: tilt }).translate(0, H.cy, 0);
  // Corpo a pera, un po' schiacciato davanti-dietro; il collo entra nella testa
  const body = place(lathe([[0.001, -0.25], [0.11, -0.243], [0.185, -0.205], [0.228, -0.12], [0.24, 0.0], [0.235, 0.11], [0.22, 0.23],
    [0.2, 0.34], [0.175, 0.43], [0.13, 0.5], [0.001, 0.54]]), { s: [1, 1, 0.9] });
  // Mano a manopola: palmo tondo, tre dita corte e il pollice (stessa forma per la mano della racchetta e l'altra)
  const hand = merge([
    sphere({ s: [0.09, 0.094, 0.088] }, 16, 12),
    ...[-1, 0, 1].map(i => sphere({ p: [i*0.05, 0.058 - Math.abs(i)*0.012, 0.03], s: [0.034, 0.05, 0.036] }, 10, 8)),
    sphere({ p: [0, 0.012, 0.072], s: [0.036, 0.04, 0.036] }, 10, 8),
  ]);
  // Piede grande e tondo, con il collo del piede
  const foot = merge([sphere({ p: [0, -0.062, 0.045], s: [0.108, 0.07, 0.165] }, 18, 12), sphere({ p: [0, -0.03, -0.03], s: [0.09, 0.07, 0.09] }, 12, 10)]);
  // Drop: fascia bianca inclinata e ciuffo (verso la destra del personaggio, x < 0, come nella foto vista di fronte)
  const dropBand = tilted(zone(D.head, D.band.y0, D.band.y1, 0.014), D.head, D.band.tilt);
  const top = D.head.cy + D.head.ry;
  const tuft = merge([
    sphere({ p: [-0.07, top - 0.022, 0.1], r: [0.25, 0, 0.3], s: [0.17, 0.06, 0.12] }, 14, 10),
    sphere({ p: [-0.215, top - 0.085, 0.13], r: [0, 0, 0.7], s: [0.08, 0.05, 0.07] }, 12, 8),
    sphere({ p: [0.05, top - 0.012, 0.03], s: [0.13, 0.05, 0.11] }, 12, 8),
  ]);
  // Lob: testa a goccia = ellissoide più la punta in cima, piegata verso la sinistra del personaggio (x > 0)
  const tip = place(lathe([[0.215, -0.07], [0.19, -0.01], [0.15, 0.045], [0.108, 0.1], [0.072, 0.155], [0.042, 0.21], [0.018, 0.255], [0.001, 0.285]], 20), { r: [0, Math.PI, 0] });
  { const pos = tip.attributes.position;
    for (let i = 0; i < pos.count; i++){ const t = Math.max(0, pos.getY(i))/0.285; pos.setX(i, pos.getX(i) + 0.15*t*t); pos.setZ(i, pos.getZ(i) - 0.03*t*t); } }
  const lobHead = merge([head(L.head), tip.translate(0.01, L.head.cy + L.head.ry - 0.075, -0.01)]);
  // Visiera: fascia blu intorno alla testa e tesa larga davanti, inclinata verso il basso
  const brim = place(new THREE.CylinderGeometry(1, 1, 1, 24, 1, false, -Math.PI/2, Math.PI), { p: [0, L.band.y0 - 0.004, 0.14], r: [-0.12, 0, 0], s: [0.33, 0.026, 0.33] });
  const visor = tilted(merge([zone(L.head, L.band.y0, L.band.y1, 0.014), brim]), L.head, L.band.tilt);
  // Scritta sulla fascia: toppa davanti, appena più in fuori
  const patch = (M, d, lift = 0) => zone(M.head, M.band.y0 + 0.012 + lift, M.band.y1 - 0.01, d, Math.PI/2 - 0.44, 0.88, 12, 2);
  GEO = {
    body, hand, foot, tuft, lobHead, visor, dropHead: head(D.head), dropBand,
    dropLabel: patch(D, 0.02), lobLabel: patch(L, 0.02, 0.03),   // quella di Lob sta sopra la tesa
    // viso: disco (sfera schiacciata) per contorno e iride, anello degli occhiali, ponte, bocca aperta e lingua
    disc: new THREE.SphereGeometry(1, 18, 12),
    ring: new THREE.TorusGeometry(1, 0.085, 8, 28),
    bridge: place(new THREE.CylinderGeometry(0.0055, 0.0055, 1, 8), { r: [0, 0, Math.PI/2] }),
    smile: place(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI*2, Math.PI/2, Math.PI/2), { s: [0.056, 0.05, 0.014] }),
    tongue: sphere({ p: [0, -0.03, 0.008], s: [0.028, 0.014, 0.008] }, 10, 8),
  };
  // come per il tennista: il ritocco dei vecchi modelli (player_materials) non deve deformare queste geometrie
  for (const g of Object.values(GEO)) g.userData.armNubsTucked = g.userData.normalsVerified = true;
  return GEO;
}

// Materiali del viso (senza luci, come occhi e bocca del tennista) e della scritta: uno per colore, condivisi
const FLAT = new Map();
function flat(hex){
  if (!FLAT.has(hex)) FLAT.set(hex, new THREE.MeshBasicMaterial({ color: hex }));
  return FLAT.get(hex);
}
const LABELS = new Map();
// Da dove viene la tela della scritta: la pagina, oppure (prove senza pagina) una funzione messa qui
export const labelCanvas = { make: null };
// Scritta DROP / LOB: piccola immagine disegnata al volo (128×32), solo nel browser (senza pagina la scritta non c'è)
function labelMaterial(text, color){
  const key = `${text}|${color}`;
  if (LABELS.has(key)) return LABELS.get(key);
  let mat = null;
  const make = labelCanvas.make || (typeof document !== 'undefined' && document.createElement ? () => document.createElement('canvas') : null);
  if (make){
    try {
      const c = make(); c.width = 128; c.height = 32;
      const g = c.getContext('2d');
      g.clearRect(0, 0, 128, 32); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 30px Arial, Helvetica, sans-serif';
      g.fillText(text, 64, 17, 120);
      const tex = new THREE.CanvasTexture(c);
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      mat.name = `natpf-scritta-${text}`;
    } catch { mat = null; }
  }
  LABELS.set(key, mat);
  return mat;
}

// ---------------------------------------------------------------------------------------------------------------
function mesh(parent, geo, mat, name, mascot, shadow = true){
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = shadow; m.receiveShadow = shadow;
  m.userData.natpfMaterial = true;       // materiali propri: player_materials non li ritocca
  m.userData.natpfMascot = mascot;       // 'drop', 'lob' oppure 'tutte' (pezzi comuni alle due mascotte)
  m.userData.staticBrowsTucked = m.userData.staticEyesTucked = true;
  m.visible = false;
  parent.add(m);
  return m;
}

// Pezzi delle due mascotte per un attore (una volta sola). material(hex) = materiale «peluche» del personaggio.
function build(actor, material){
  const G = geometries(), P = actor.parts || {}, out = { meshes: [], labels: [], face: null };
  const add = (...a) => { const m = mesh(...a); out.meshes.push(m); return m; };
  for (const key of ['drop', 'lob']){
    const C = MASCOT_COLORS[key], body = material(C.body, C.bright);
    // corpo, mani e piedi hanno la stessa forma per tutti e due: cambia solo il colore
    if (P.torso) add(P.torso, G.body, body, `Natpf${MASCOT[key].name}Corpo`, key);
    for (const h of [P.handL, P.handR]) if (h) add(h, G.hand, body, `Natpf${MASCOT[key].name}Mano`, key);
    for (const f of [P.footL, P.footR]) if (f) add(f, G.foot, body, `Natpf${MASCOT[key].name}Piede`, key);
  }
  if (P.head){
    const D = MASCOT_COLORS.drop, L = MASCOT_COLORS.lob;
    add(P.head, G.dropHead, material(D.body), 'NatpfDropTesta', 'drop');
    add(P.head, G.tuft, material(D.body), 'NatpfDropCiuffo', 'drop');
    add(P.head, G.dropBand, material(D.band), 'NatpfDropFascia', 'drop');
    add(P.head, G.lobHead, material(L.body, L.bright), 'NatpfLobTesta', 'lob');
    add(P.head, G.visor, material(L.visor), 'NatpfLobVisiera', 'lob');
    for (const [key, geo] of [['drop', G.dropLabel], ['lob', G.lobLabel]]){
      const mat = labelMaterial(MASCOT[key].label, MASCOT_COLORS[key].label);
      if (!mat) continue;
      // gruppo inclinato come la fascia: dentro, la scritta si specchia da sola per i mancini (resta leggibile)
      const holder = new THREE.Group();
      holder.name = `Natpf${MASCOT[key].name}ScrittaAsse`;
      holder.position.set(0, MASCOT[key].head.cy, 0); holder.rotation.fromArray(MASCOT[key].band.tilt);
      P.head.add(holder);
      const label = add(holder, geo, mat, `Natpf${MASCOT[key].name}Scritta`, key, false);
      label.renderOrder = 3;
      out.labels.push(label);
    }
  }
  out.face = buildFace(actor);
  return out;
}

// Pezzi in più del viso, dentro il rig delle espressioni del motore (player_facial_fx.js): contorno nero e iride
// colorata degli occhi, occhiali di Lob, bocca aperta con la lingua. Si accendono e spengono con le parti del rig.
function buildFace(actor){
  const rig = actor.facialRig, G = geometries();
  if (!rig?.faceGroup || !rig.leftEye || !rig.rightEye) return null;
  const dark = flat(0x12141a), eyes = [];
  for (const eye of [rig.leftEye, rig.rightEye]){
    const item = { eye, outline: null, iris: null, ring: null };
    if (eye.openEyeNode){ item.outline = mesh(eye.openEyeNode, G.disc, dark, 'NatpfOcchioContorno', 'tutte', false); item.outline.position.z = -0.002; }
    if (eye.pupilGroup){ item.iris = mesh(eye.pupilGroup, G.disc, flat(MASCOT_COLORS.drop.iris), 'NatpfOcchioIride', 'tutte', false); item.iris.position.z = -0.002; }
    if (eye.root){ item.ring = mesh(eye.root, G.ring, flat(MASCOT_COLORS.lob.glasses), 'NatpfLobOcchiali', 'lob', false); item.ring.position.z = 0.012; }
    eyes.push(item);
  }
  const bridge = mesh(rig.faceGroup, G.bridge, flat(MASCOT_COLORS.lob.glasses), 'NatpfLobOcchialiPonte', 'lob', false);
  let smile = null, tongue = null;
  if (rig.neutralMouth){
    smile = mesh(rig.neutralMouth, G.smile, flat(0x3a0d16), 'NatpfBoccaAperta', 'tutte', false);
    tongue = mesh(rig.neutralMouth, G.tongue, flat(0xf2877c), 'NatpfLingua', 'tutte', false);
  }
  // valori del viso del tennista, da rimettere tornando a «Classici»
  // (posizione, rotazione e scala di ciò che la mascotte sposta; «visibile» solo per i pezzi che la mascotte spegne:
  // il resto lo accendono e spengono le espressioni)
  const keep = (o, vis = false) => (o ? { o, p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone(), v: vis ? o.visible : null } : null);
  const saved = [
    ...[rig.faceGroup, rig.mouthGroup, rig.leftEye.root, rig.rightEye.root, rig.leftEye.happyArcGroup, rig.rightEye.happyArcGroup,
      rig.leftEye.shockXGroup, rig.rightEye.shockXGroup, rig.leftEye.blinkBarMesh, rig.rightEye.blinkBarMesh, rig.leftEye.lidMesh, rig.rightEye.lidMesh].map(o => keep(o)),
    ...[rig.leftBrow?.children[0], rig.rightBrow?.children[0], rig.leftCheek, rig.rightCheek, rig.conformalPatchMesh, rig.neutralMouth?.children[0]].map(o => keep(o, true)),
  ].filter(Boolean);
  return { eyes, bridge, smile, tongue, saved };
}

const _surf = { z: 0, yaw: 0, pitch: 0 };
// Viso della mascotte: il gruppo del viso si sposta al centro della testa nuova e si ingrandisce; occhi grandi sulla
// superficie, senza sopracciglia né guance; a riposo la bocca aperta che sorride. Le espressioni del motore restano.
function styleFace(actor, key, face, skinHex){
  const rig = actor.facialRig, M = MASCOT[key], H = M.head, S = MASCOT_FACE_SCALE;
  if (!rig || !face) return;
  rig.faceGroup.position.set(0, H.cy, 0);
  rig.faceGroup.scale.setScalar(S);
  const r = M.eye.r/S;                                    // raggio dell'occhio nelle unità del viso
  for (const { eye, outline, iris, ring } of face.eyes){
    const side = Math.sign(eye.root.position.x) || 1;
    surface(H, side*M.eye.x, M.eye.y, _surf);
    eye.root.position.set(side*M.eye.x/S, M.eye.y/S, (_surf.z - 0.008)/S);
    eye.root.rotation.set(_surf.pitch, _surf.yaw, 0);
    eye.scleraMesh?.scale.set(r/0.038, r*1.04/0.038, 0.34);
    eye.pupilMesh?.scale.set(r*0.52/0.026, r*0.55/0.026, 0.46);
    eye.pupilGroup?.children.forEach((c, i) => { if (i > 0 && c !== iris) c.scale.setScalar(1.5); });
    eye.lidMesh?.scale.set(r*1.06/0.04, r*1.1/0.04, 0.5);
    eye.lidMesh?.material?.color?.setHex(skinHex);
    eye.blinkBarMesh?.scale.set(r*2/0.072, 1.5, 1);
    eye.happyArcGroup?.scale.setScalar(r*0.9/0.03);
    eye.shockXGroup?.scale.setScalar(r*1.7/0.068);
    if (outline){ outline.scale.set(r*1.13, r*1.17, 0.012); outline.visible = true; }
    if (iris){ iris.scale.set(r*0.8, r*0.84, 0.006); iris.material = flat(MASCOT_COLORS[key].iris); iris.visible = true; }
    if (ring){ ring.scale.set(r*1.3, r*1.34, r*1.3); ring.visible = !!M.glasses; }
  }
  if (face.bridge){
    surface(H, 0, M.eye.y, _surf);
    const gap = Math.max(0.01, 2*(M.eye.x/S - r*1.3));
    face.bridge.position.set(0, (M.eye.y + 0.006)/S, (_surf.z + 0.008)/S);
    face.bridge.scale.set(gap + 0.012, 1, 1);
    face.bridge.visible = !!M.glasses;
  }
  for (const brow of [rig.leftBrow, rig.rightBrow]) if (brow?.children[0]) brow.children[0].visible = false;
  for (const cheek of [rig.leftCheek, rig.rightCheek]) if (cheek) cheek.visible = false;
  if (rig.conformalPatchMesh) rig.conformalPatchMesh.visible = false;
  if (rig.mouthGroup){
    surface(H, 0, M.mouthY, _surf);
    rig.mouthGroup.position.set(0, M.mouthY/S, (_surf.z + 0.004)/S);
    rig.mouthGroup.rotation.set(_surf.pitch, 0, 0);
  }
  const mouth = rig.neutralMouth;
  if (mouth?.children.length > 1){ mouth.children[0].visible = false; mouth.children[1].visible = false; }
  if (face.smile) face.smile.visible = true;
  if (face.tongue) face.tongue.visible = true;
}
// Rimette il viso com'era prima della mascotte (posizioni, scale, pezzi visibili): poi natpf_character.restyleFace
// rifà il viso del tennista come sempre.
function restoreFace(face){
  if (!face) return;
  for (const k of face.saved){ k.o.position.copy(k.p); k.o.rotation.copy(k.r); k.o.scale.copy(k.s); if (k.v !== null) k.o.visible = k.v; }
  for (const e of face.eyes) for (const o of [e.outline, e.iris, e.ring]) if (o) o.visible = false;
  for (const o of [face.bridge, face.smile, face.tongue]) if (o) o.visible = false;
}

// Pezzi del tennista sulle braccia e sulle gambe che la mascotte non ha (maniche, orli, calze)
const HUMAN_ONLY = /^Natpf(Manica|Orlo|Calza)/;
const WRIST = /^NatpfPolsino/;
// Applica (o toglie) la mascotte a un attore già montato. lookKey: 'drop', 'lob' oppure un aspetto del tennista.
// material(hex, chiaro): materiale «peluche» condiviso (natpf_character.toyMaterial). Restituisce 'drop', 'lob' o null.
export function applyMascot(actor, lookKey, material){
  const key = mascotOf(lookKey), model = actor?.model;
  if (!model) return null;
  if (!key && !actor.natpfMascotParts) return null;           // mai stato una mascotte: niente da fare, niente da toccare
  const parts = actor.natpfMascotParts || (actor.natpfMascotParts = build(actor, material));
  // pezzi del tennista (hanno lo «slot» del colore) nascosti, quelli della mascotte scelta accesi
  model.traverse(o => { if (o.isMesh && o.userData.natpfSlot) o.visible = !key; });
  for (const m of parts.meshes) m.visible = m.userData.natpfMascot === key;
  const L = actor.natpfLimbs;
  if (L){
    L.container.traverse(o => {
      if (!o.isMesh) return;
      if (HUMAN_ONLY.test(o.name)) o.visible = !key;
      else if (WRIST.test(o.name)) o.visible = !key || MASCOT[key].wristBands;
    });
    const thick = (seg, k) => { seg.thick = k; for (const c of seg.group.children) if (c !== seg.body && c.isMesh) c.scale.setScalar(k); };
    for (const a of L.arms){ const k = key ? MASCOT_LIMBS.arm : 1; thick(a.upper, k); thick(a.fore, k); }
    for (const l of L.legs){ const k = key ? MASCOT_LIMBS.leg : 1; thick(l.thigh, k); thick(l.shin, k); }
  }
  restoreFace(parts.face);
  if (key) styleFace(actor, key, parts.face, MASCOT_COLORS[key].body);
  actor.natpfMascot = key;
  return key;
}
// La scritta resta leggibile anche sul personaggio specchiato (mancino: root.scale.x < 0). Da chiamare a ogni fotogramma:
// un confronto e, solo se serve, un numero scritto.
export function updateMascotLabels(actor){
  const labels = actor?.natpfMascotParts?.labels;
  if (!labels || !actor.natpfMascot) return;
  const sx = actor.root && actor.root.scale.x < 0 ? -1 : 1;
  for (const l of labels) if (l.scale.x !== sx) l.scale.x = sx;
}
