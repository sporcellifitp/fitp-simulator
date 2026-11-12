// Personaggio NATPF: tennista «toy» in vinile costruito nel codice (niente modelli esterni). Proporzioni chibi: testa
// grande, busto compatto, braccia e gambe corte e arrotondate, materiali opachi con un leggero bordo di luce.
// Il motore cerca nel modello sei parti con nomi fissi (Head, Torso, Hand_L, Hand_R, Foot_L, Foot_R): le animazioni
// (player_body_animation.js), il viso (player_facial_fx.js) e la racchetta (racket_kinematics.js) le muovono come prima.
// In più il personaggio ha braccia e gambe vere: a ogni fotogramma due segmenti (IK a due ossa) collegano spalla e
// mano, anca e piede, qualunque cosa facciano le parti animate.
// Il modello guarda verso +z; la destra del personaggio è a x < 0 e la mano destra (Hand_R) impugna la racchetta.
// Geometrie e materiali sono condivisi tra tutti gli attori: le varianti cambiano solo il materiale di ogni pezzo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { setPortraitLooks } from './natpf_portrait.js';
import { castLooks, getCast } from './natpf_personaggi.js';
import { applyMascot, updateMascotLabels, MASCOT_COLORS } from './natpf_lob_drop.js';
import { keepRacketClear } from './natpf_racket_clear.js';
import { getMascotMode, loadMascotModel, mascotModelStatus, mascotModelInstance } from './natpf_mascot_models.js';
import { createMascotRig, poseMascotBody, poseMascotArms, mascotModelHeadShape } from './natpf_mascot_rig.js';

// Varianti: P1 come l'immagine di riferimento, CPU con la polo blu NATPF, P2 con dettagli rosa.
export const CHARACTER_LOOKS = Object.freeze({
  p1: Object.freeze({ skin: 0xf0c19a, hair: 0x7b4a2b, brow: 0x24150d, polo: 0xf5f6f2, collar: 0xf5f6f2, placket: 0xe9ebee,
    button: 0xc5cad4, shorts: 0xdde1e8, band: 0xffffff, wristR: 0xffffff, wristL: 0x1f4fc4, socks: 0x1f4fc4, shoe: 0xfbfbf9, sole: 0x1f4fc4 }),
  cpu: Object.freeze({ skin: 0xd59d77, hair: 0x2a1c14, brow: 0x160e09, polo: 0x16378f, collar: 0xffffff, placket: 0x1c45ad,
    button: 0xffffff, shorts: 0x0b1a45, band: 0xffffff, wristR: 0xffffff, wristL: 0xffffff, socks: 0xffffff, shoe: 0xfbfbf9, sole: 0x0b1a45 }),
  p2: Object.freeze({ skin: 0xe6b38c, hair: 0x7a3f22, brow: 0x2c160b, polo: 0xf5f6f2, collar: 0xff3d8b, placket: 0xff3d8b,
    button: 0xffffff, shorts: 0xdde1e8, band: 0xff3d8b, wristR: 0xff3d8b, wristL: 0xff3d8b, socks: 0xff3d8b, shoe: 0xfbfbf9, sole: 0xff3d8b }),
  // B24 · Lob & Drop (natpf_lob_drop.js): peluche di un colore solo; i pezzi del tennista sono nascosti, restano
  // braccia e gambe (stessi segmenti, più grossi) e, per Drop, i polsini bianchi
  drop: plushLook(MASCOT_COLORS.drop.body, { wristR: MASCOT_COLORS.drop.band, wristL: MASCOT_COLORS.drop.band }),
  lob: plushLook(MASCOT_COLORS.lob.body, { kind: 'plushBright' }),
});
function plushLook(body, extra = {}){
  const look = { kind: 'plush' };
  for (const slot of ['skin', 'hair', 'brow', 'polo', 'collar', 'placket', 'button', 'shorts', 'band', 'wristR', 'wristL', 'socks', 'shoe', 'sole']) look[slot] = body;
  return Object.freeze(Object.assign(look, extra));
}
export const resolveLookKey = key => (CHARACTER_LOOKS[key] ? key : 'p1');

// Posizioni di riposo delle parti, nel sistema del modello (prima della scala 1.16 del motore): sono quelle che il
// rig del corpo si aspetta per calcolare gli scostamenti dai suoi perni.
export const PART_BASE = Object.freeze({
  Torso: [0, 0.55, 0], Head: [0, 1.22, 0],
  Hand_L: [-0.33, 0.8, 0.1], Hand_R: [0.33, 0.82, 0.14],
  Foot_L: [-0.105, 0.13, 0.01], Foot_R: [0.105, 0.13, 0.01],
});
export const PART_NAMES = Object.freeze(Object.keys(PART_BASE));

// Misure (unità del modello). La testa è un ellissoide: il viso dinamico si appoggia sul suo centro.
const HEAD = { rx: 0.27, ry: 0.245, rz: 0.235, cy: 0.18 };
const ARM = { upper: 0.15, fore: 0.15, wristBack: 0.045, shoulderX: 0.215, shoulderY: 0.47, maxStretch: 1.7 };
const LEG = { thigh: 0.17, shin: 0.175, hipX: 0.1, hipY: -0.1, ankle: [0, -0.03, -0.02], maxStretch: 1.35 };
// Punti della racchetta usati da racket_kinematics.getRacketRimWorldPoints (sistema locale, prima della scala 1.22).
export const RACKET_POINTS = Object.freeze({ butt: 0, throat: 0.345, center: 0.545, tip: 0.755, headA: 0.172, headB: 0.215 });
export const BALL_RADIUS = 0.065;

// ---------------------------------------------------------------------------------------------------------------
// Materiali: opachi, con un bordo di luce morbido e un po' di luce dall'alto (effetto vinile). Uno per colore e tipo.
const MATERIALS = new Map();
const KIND = { skin: 'Skin', hair: 'Hair' };
// B24, peluche di Lob & Drop: luce propria del colore (il giallo sotto le luci fredde dell'arena ne vuole di più)
const PLUSH = { plush: 0.2, plushBright: 0.44 };
function toyMaterial(hex, kind = 'cloth'){
  const key = `${hex}|${kind}`;
  if (MATERIALS.has(key)) return MATERIALS.get(key);
  const rough = kind === 'skin' ? 0.5 : kind === 'hair' ? 0.66 : kind === 'graphite' ? 0.42 : kind === 'felt' ? 0.92 : PLUSH[kind] ? 0.9 : 0.6;
  // un po' di luce propria nel colore del pezzo: sotto le luci fredde dell'arena il vinile resta caldo e leggibile
  const glow = kind === 'skin' ? 0.24 : kind === 'graphite' || kind === 'grip' ? 0.04 : kind === 'felt' ? 0.22 : PLUSH[kind] || 0.14;
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: kind === 'graphite' ? 0.18 : 0, emissive: hex, emissiveIntensity: glow });
  // «Skin» e «Hair» nel nome servono al viso dinamico (colore della palpebra e delle sopracciglia)
  m.name = `natpf-${KIND[kind] || kind}`;
  m.userData.natpfMaterial = true;
  const rim = kind === 'felt' ? 0.1 : PLUSH[kind] ? 0.13 : 0.2, top = kind === 'skin' ? 0.08 : 0.06;
  m.customProgramCacheKey = () => `natpf-toy-${rim}-${top}`;
  m.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 natpfN = normalize( vNormal );
      float natpfRim = pow( 1.0 - max( dot( natpfN, normalize( vViewPosition ) ), 0.0 ), 3.0 ) * ${rim.toFixed(3)};
      float natpfTop = clamp( natpfN.y * 0.5 + 0.5, 0.0, 1.0 ) * ${top.toFixed(3)};
      outgoingLight += vec3( 1.0, 0.98, 0.95 ) * natpfRim + diffuseColor.rgb * natpfTop;
      #include <opaque_fragment>`);
  };
  MATERIALS.set(key, m);
  return m;
}
// Tipo di materiale per ogni «slot» colorato del personaggio
const SLOT_KIND = { skin: 'skin', hair: 'hair' };
const slotMaterial = (look, slot) => toyMaterial(look[slot], look.kind || SLOT_KIND[slot] || 'cloth');
const plushMaterial = (hex, bright = false) => toyMaterial(hex, bright ? 'plushBright' : 'plush');

// ---------------------------------------------------------------------------------------------------------------
// Geometrie condivise, costruite una volta sola.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function place(geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}){
  _q.setFromEuler(_e.set(r[0], r[1], r[2]));
  return geo.applyMatrix4(_m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2])));
}
const sphere = (opts, w = 20, h = 14) => place(new THREE.SphereGeometry(1, w, h), opts);
// I profili vanno dal basso verso l'alto (in senso antiorario nel piano r-y), così le normali guardano fuori.
const lathe = (pts, scaleZ = 1, segments = 32) =>
  place(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segments), { s: [1, 1, scaleZ] });
const merge = list => { const g = mergeGeometries(list); list.forEach(x => x.dispose()); return g; };
// Cilindro lungo 1 dalla base (y = 0) alla cima (y = 1): si allunga con scale.y per seguire un segmento.
const unitCylinder = (rBase, rTop) => new THREE.CylinderGeometry(rTop, rBase, 1, 14, 1, true).translate(0, 0.5, 0);

let GEO = null;
function geometries(){
  if (GEO) return GEO;
  const { rx, ry, rz, cy } = HEAD;
  // Capelli: calotta voluminosa sopra la fascia, volume corto su lati e nuca, ciuffi morbidi in cima
  const tufts = [
    [0, 0.285, 0.0, 0.22, 0.12, 0.2], [-0.12, 0.265, 0.07, 0.14, 0.1, 0.13], [0.12, 0.265, 0.07, 0.14, 0.1, 0.13],
    [-0.055, 0.25, 0.135, 0.12, 0.085, 0.1], [0.06, 0.245, 0.13, 0.12, 0.085, 0.1],
    [0, 0.255, -0.11, 0.19, 0.11, 0.15], [-0.17, 0.2, -0.04, 0.11, 0.1, 0.13], [0.17, 0.2, -0.04, 0.11, 0.1, 0.13],
  ].map(([x, y, z, sx, sy, sz]) => sphere({ p: [x, cy + y, z], s: [sx, sy, sz] }, 14, 10));
  const hair = merge([
    place(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI*2, 0, Math.PI/3), { p: [0, cy + 0.01, -0.004], s: [rx + 0.02, ry + 0.035, rz + 0.027] }),
    // volume posteriore spostato indietro: copre nuca e lati fin sopra le orecchie, il viso resta libero
    sphere({ p: [0, cy + 0.055, -0.03], s: [rx + 0.008, 0.2, rz] }, 32, 20),
    ...tufts,
  ]);
  // Fascia: anello piatto con bordi arrotondati, appena fuori dalla fronte
  const bandProfile = [[0.247, -0.03], [0.259, -0.032], [0.267, -0.022], [0.269, 0], [0.267, 0.022], [0.259, 0.032], [0.247, 0.03]];
  const band = place(lathe(bandProfile, 0.871, 40), { p: [0, cy + 0.148, 0], r: [0.05, 0, 0] });
  // Busto (polo) e pantaloncini: profili di rotazione, schiacciati davanti-dietro
  const DEPTH = 0.78;
  const polo = lathe([[0.2, 0.078], [0.226, 0.086], [0.222, 0.15], [0.228, 0.24], [0.232, 0.33], [0.226, 0.42], [0.205, 0.49], [0.165, 0.545], [0.11, 0.575], [0.075, 0.585]], DEPTH);
  const collar = lathe([[0.176, 0.538], [0.15, 0.578], [0.11, 0.612], [0.092, 0.612], [0.082, 0.562]], DEPTH + 0.02);
  const placket = place(new THREE.BoxGeometry(0.05, 0.12, 0.014), { p: [0, 0.47, 0.163], r: [-0.26, 0, 0] });
  const buttons = merge([0.445, 0.497].map(y => sphere({ p: [0, y, 0.165 + (0.47 - y)*0.266 + 0.009], s: [0.011, 0.011, 0.006] }, 10, 8)));
  const shorts = lathe([[0.001, -0.15], [0.13, -0.15], [0.215, -0.143], [0.232, -0.118], [0.231, -0.06], [0.22, 0.02], [0.204, 0.1], [0.195, 0.15]], DEPTH);
  const neck = place(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 16), { p: [0, 0.6, 0] });
  // Testa: ellissoide con il centro in (0, cy, 0); orecchie e naso piccoli
  const headSkin = sphere({ p: [0, cy, 0], s: [rx, ry, rz] }, 36, 26);
  const ears = merge([-1, 1].map(s => sphere({ p: [s*(rx - 0.006), cy - 0.005, -0.005], s: [0.026, 0.05, 0.04] }, 12, 10)));
  const nose = sphere({ p: [0, cy - 0.018, rz - 0.004], s: [0.024, 0.02, 0.018] }, 12, 10);
  // Mani: pugno arrotondato con pollice
  const hand = merge([sphere({ s: [0.062, 0.068, 0.066] }, 16, 12), sphere({ p: [0, 0.02, 0.05], s: [0.026, 0.03, 0.026] }, 10, 8)]);
  // Scarpe: tomaia bianca e suola colorata, un po' più larga
  const shoe = merge([sphere({ p: [0, -0.07, 0.03], s: [0.083, 0.058, 0.14] }, 20, 12), sphere({ p: [0, -0.05, -0.05], s: [0.07, 0.06, 0.07] }, 14, 10)]);
  const sole = place(lathe([[0.001, -0.019], [0.9, -0.019], [1, -0.008], [1, 0.006], [0.9, 0.012], [0.001, 0.012]], 1, 24), { p: [0, -0.118, 0.03], s: [0.092, 1, 0.152] });
  // Arti: cilindri lunghi 1 (allungati a ogni fotogramma) e sfere per spalle, gomiti e ginocchia
  GEO = {
    hair, band, polo, collar, placket, buttons, shorts, neck, headSkin, ears, nose, hand, shoe, sole,
    upperArm: unitCylinder(0.054, 0.05), foreArm: unitCylinder(0.05, 0.046),
    sleeve: place(new THREE.CylinderGeometry(0.072, 0.08, 0.1, 16), { p: [0, 0.035, 0] }),
    shoulder: sphere({ s: [0.08, 0.08, 0.08] }, 16, 12),
    elbow: sphere({ s: [0.052, 0.052, 0.052] }, 12, 10),
    wristBand: new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16),
    thigh: unitCylinder(0.078, 0.07), shin: unitCylinder(0.066, 0.058),
    cuff: place(new THREE.CylinderGeometry(0.098, 0.104, 0.08, 18), { p: [0, 0.02, 0] }),
    knee: sphere({ s: [0.07, 0.07, 0.07] }, 14, 10),
    sock: new THREE.CylinderGeometry(0.064, 0.062, 0.09, 16),
  };
  // Il ritocco dei vecchi modelli (player_materials) non deve deformare queste geometrie
  for (const g of Object.values(GEO)) g.userData.armNubsTucked = g.userData.normalsVerified = true;
  return GEO;
}

// ---------------------------------------------------------------------------------------------------------------
function addMesh(parent, geo, look, slot, name){
  const mesh = new THREE.Mesh(geo, slotMaterial(look, slot));
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  // il viso dinamico non deve «ritoccare» capelli e pezzi chiari della testa
  mesh.userData.natpfSlot = slot;
  mesh.userData.natpfMaterial = true;
  mesh.userData.staticBrowsTucked = mesh.userData.staticEyesTucked = true;
  parent.add(mesh);
  return mesh;
}
function addPart(model, name){
  const g = new THREE.Group();
  g.name = name;
  g.position.fromArray(PART_BASE[name]);
  model.add(g);
  return g;
}
function addAnchor(parent, name, pos){
  const a = new THREE.Object3D();
  a.name = name;
  a.position.fromArray(pos);
  parent.add(a);
  return a;
}

// Modello del personaggio con le sei parti. Il motore lo scala, lo mette nell'attore e ci costruisce il rig.
export function createNatpfCharacter(lookKey = 'p1'){
  const key = resolveLookKey(lookKey), look = CHARACTER_LOOKS[key], G = geometries();
  const model = new THREE.Group();
  model.name = 'NatpfCharacter';
  model.userData.natpfCharacter = { look: key };

  const torso = addPart(model, 'Torso');
  addMesh(torso, G.polo, look, 'polo', 'NatpfPolo');
  addMesh(torso, G.collar, look, 'collar', 'NatpfColletto');
  addMesh(torso, G.placket, look, 'placket', 'NatpfAbbottonatura');
  addMesh(torso, G.buttons, look, 'button', 'NatpfBottoni');
  addMesh(torso, G.shorts, look, 'shorts', 'NatpfPantaloncini');
  addMesh(torso, G.neck, look, 'skin', 'NatpfCollo');
  // attacchi di braccia e gambe: seguono busto e anche (torsione, inclinazione)
  addAnchor(torso, 'NatpfSpallaDx', [-ARM.shoulderX, ARM.shoulderY, -0.005]);
  addAnchor(torso, 'NatpfSpallaSx', [ARM.shoulderX, ARM.shoulderY, -0.005]);
  addAnchor(torso, 'NatpfAncaDx', [-LEG.hipX, LEG.hipY, 0]);
  addAnchor(torso, 'NatpfAncaSx', [LEG.hipX, LEG.hipY, 0]);

  const head = addPart(model, 'Head');
  // orecchie e naso prima della testa: il viso dinamico prende il centro dall'ultima mesh «Skin» della testa
  addMesh(head, G.ears, look, 'skin', 'NatpfOrecchie');
  addMesh(head, G.nose, look, 'skin', 'NatpfNaso');
  addMesh(head, G.headSkin, look, 'skin', 'NatpfTesta');
  addMesh(head, G.hair, look, 'hair', 'NatpfCapelli');
  addMesh(head, G.band, look, 'band', 'NatpfFascia');

  for (const name of ['Hand_L', 'Hand_R']) addMesh(addPart(model, name), G.hand, look, 'skin', `Natpf${name === 'Hand_R' ? 'ManoDx' : 'ManoSx'}`);
  for (const name of ['Foot_L', 'Foot_R']){
    const foot = addPart(model, name);
    addMesh(foot, G.shoe, look, 'shoe', 'NatpfScarpa');
    addMesh(foot, G.sole, look, 'sole', 'NatpfSuola');
    addAnchor(foot, 'NatpfCaviglia', LEG.ankle);
  }
  return model;
}

// ---------------------------------------------------------------------------------------------------------------
// Arti: ogni segmento è un gruppo posato all'inizio e orientato verso la fine; il cilindro si allunga con scale.y.
function makeSegment(parent, geo, look, slot, name){
  const group = new THREE.Group();
  group.name = name;
  const body = addMesh(group, geo, look, slot, `${name}Corpo`);
  parent.add(group);
  return { group, body, extras: [], thick: 1 };   // thick: spessore (1 = tennista; le mascotte hanno arti più grossi)
}
const UP = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
function poseSegment(seg, from, to){
  _dir.subVectors(to, from);
  const len = Math.max(1e-4, _dir.length());
  seg.group.position.copy(from);
  seg.group.quaternion.setFromUnitVectors(UP, _dir.multiplyScalar(1/len));
  seg.body.scale.set(seg.thick, len, seg.thick);
  for (const x of seg.extras) x.mesh.position.y = x.atEnd ? len - x.offset : x.offset;
  return len;
}

// IK a due ossa: dato l'inizio S, la fine T e la direzione verso cui piegare il giunto, calcola il gomito/ginocchio.
// Se T è troppo lontano i due segmenti si allungano insieme (fino a maxStretch), come un giocattolo morbido.
export function solveTwoBone(S, T, a, b, pole, outJoint, maxStretch = 1.5){
  const d0 = S.distanceTo(T);
  const axis = _ikAxis.subVectors(T, S);
  if (d0 < 1e-6) axis.set(0, -1, 0); else axis.multiplyScalar(1/d0);
  let k = 1;
  if (d0 > a + b) k = Math.min(maxStretch, d0/(a + b));
  const A = a*k, B = b*k, d = THREE.MathUtils.clamp(d0, Math.abs(A - B) + 1e-4, A + B);
  const x = (A*A - B*B + d*d)/(2*d), h = Math.sqrt(Math.max(0, A*A - x*x));
  const bend = _ikBend.copy(pole).addScaledVector(axis, -pole.dot(axis));
  if (bend.lengthSq() < 1e-8) bend.set(0, 0, 1).addScaledVector(axis, -axis.z);
  bend.normalize();
  return outJoint.copy(S).addScaledVector(axis, x).addScaledVector(bend, h);
}
const _ikAxis = new THREE.Vector3(), _ikBend = new THREE.Vector3();

// Da chiamare dopo che il motore ha montato il modello nell'attore e ne ha costruito rig e viso.
export function finishNatpfActor(actor){
  const model = actor?.model, info = model?.userData?.natpfCharacter;
  if (!info || !actor.root) return null;
  if (actor.natpfLimbs) return actor.natpfLimbs;
  const look = CHARACTER_LOOKS[info.look], G = geometries();
  const container = new THREE.Group();
  container.name = 'NatpfArti';
  container.scale.setScalar(actor.rig?.baseModelScale?.x || model.scale.x || 1.16);
  actor.root.add(container);
  const find = name => { let found = null; model.traverse(o => { if (!found && o.name === name) found = o; }); return found; };
  const footAnkle = foot => foot?.children.find(c => c.name === 'NatpfCaviglia') || foot;

  const arm = (side, hand, wristSlot) => {
    const upper = makeSegment(container, G.upperArm, look, 'skin', `NatpfBraccio${side}`);
    addMesh(upper.group, G.sleeve, look, 'polo', `NatpfManica${side}`);
    addMesh(upper.group, G.shoulder, look, 'polo', `NatpfSpallaPolo${side}`);
    const fore = makeSegment(container, G.foreArm, look, 'skin', `NatpfAvambraccio${side}`);
    const elbow = addMesh(fore.group, G.elbow, look, 'skin', `NatpfGomito${side}`);
    const band = addMesh(fore.group, G.wristBand, look, wristSlot, `NatpfPolsino${side}`);
    fore.extras.push({ mesh: band, atEnd: true, offset: 0.03 });
    return { upper, fore, elbow, shoulderAnchor: find(`NatpfSpalla${side}`), hand, sign: side === 'Dx' ? -1 : 1, joint: new THREE.Vector3() };
  };
  const leg = (side, foot) => {
    const thigh = makeSegment(container, G.thigh, look, 'skin', `NatpfCoscia${side}`);
    addMesh(thigh.group, G.cuff, look, 'shorts', `NatpfOrlo${side}`);
    const shin = makeSegment(container, G.shin, look, 'skin', `NatpfStinco${side}`);
    const knee = addMesh(shin.group, G.knee, look, 'skin', `NatpfGinocchio${side}`);
    const sock = addMesh(shin.group, G.sock, look, 'socks', `NatpfCalza${side}`);
    shin.extras.push({ mesh: sock, atEnd: true, offset: 0.045 });
    return { thigh, shin, knee, hipAnchor: find(`NatpfAnca${side}`), ankle: footAnkle(foot), sign: side === 'Dx' ? -1 : 1, joint: new THREE.Vector3() };
  };
  const parts = actor.parts || {};
  // destra del personaggio (x < 0): Hand_R con la racchetta e Foot_L, come nel rig del motore
  const limbs = {
    container,
    arms: [arm('Dx', parts.handR, 'wristR'), arm('Sx', parts.handL, 'wristL')],
    legs: [leg('Dx', parts.footL), leg('Sx', parts.footR)],
    inverse: new THREE.Matrix4(),
  };
  actor.natpfLimbs = limbs;
  actor.natpfLook = info.look;
  // Prima persona: restano avambracci, polsini e mani (con la racchetta); il resto del corpo si nasconde
  actor.natpfFirstPersonHidden = [...limbs.arms.map(a => a.upper.group), ...limbs.legs.flatMap(l => [l.thigh.group, l.shin.group])];
  restyleFace(actor, look);
  applyMascot(actor, info.look, plushMaterial);   // B24: solo se il modello è nato come Lob o Drop
  updateNatpfActorLimbs(actor);
  return limbs;
}

const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _W = new THREE.Vector3(), _pole = new THREE.Vector3();
const ELBOW_POLE = new THREE.Vector3(0.55, -0.45, -0.7).normalize(), KNEE_POLE = new THREE.Vector3(0.15, 0, 1).normalize();
// Ricalcola braccia e gambe dalle parti animate. Costa poco: 4 segmenti a braccio/gamba per attore visibile.
export function updateNatpfActorLimbs(actor){
  const L = actor?.natpfLimbs;
  if (!L || !actor.root || !actor.root.visible) return;
  actor.root.updateMatrixWorld(true);
  const inv = L.inverse.copy(L.container.matrixWorld).invert();
  const torso = actor.parts?.torso;
  for (const a of L.arms){
    if (!a.hand || !a.shoulderAnchor) continue;
    a.shoulderAnchor.getWorldPosition(_S).applyMatrix4(inv);
    a.hand.getWorldPosition(_T).applyMatrix4(inv);
    // il polso sta poco prima del centro del pugno, verso la spalla
    _W.subVectors(_S, _T);
    const reach = _W.length();
    _W.multiplyScalar(reach > 1e-5 ? Math.min(ARM.wristBack, reach*0.5)/reach : 0).add(_T);
    _pole.set(ELBOW_POLE.x*a.sign, ELBOW_POLE.y, ELBOW_POLE.z);
    if (torso) _pole.transformDirection(torso.matrixWorld).transformDirection(inv);
    solveTwoBone(_S, _W, ARM.upper, ARM.fore, _pole, a.joint, ARM.maxStretch);
    poseSegment(a.upper, _S, a.joint);
    poseSegment(a.fore, a.joint, _W);
  }
  for (const l of L.legs){
    if (!l.ankle || !l.hipAnchor) continue;
    l.hipAnchor.getWorldPosition(_S).applyMatrix4(inv);
    l.ankle.getWorldPosition(_T).applyMatrix4(inv);
    _pole.set(KNEE_POLE.x*l.sign, KNEE_POLE.y, KNEE_POLE.z);
    if (actor.model) _pole.transformDirection(actor.model.matrixWorld).transformDirection(inv);
    solveTwoBone(_S, _T, LEG.thigh, LEG.shin, _pole, l.joint, LEG.maxStretch);
    poseSegment(l.thigh, _S, l.joint);
    poseSegment(l.shin, l.joint, _T);
  }
}

// Cambia la variante di colore di un attore già montato (per esempio quando l'avversario passa da CPU a P2).
export function applyNatpfLook(actor, lookKey){
  const key = resolveLookKey(lookKey), look = CHARACTER_LOOKS[key];
  const swap = o => { if (o.isMesh && o.userData.natpfSlot) o.material = slotMaterial(look, o.userData.natpfSlot); };
  actor?.model?.traverse(swap);
  actor?.natpfLimbs?.container.traverse(swap);
  if (actor?.model?.userData?.natpfCharacter) actor.model.userData.natpfCharacter.look = key;
  if (actor) actor.natpfLook = key;
  // B24: pezzi di Lob o di Drop al posto di quelli del tennista (o il contrario); con il tennista rimette il viso
  // com'era, poi restyleFace lo rifà come sempre. Un attore mai stato mascotte non viene toccato.
  const mascot = applyMascot(actor, key, plushMaterial);
  if (!mascot) restyleFace(actor, look);
}

// Viso: il rig delle espressioni resta quello del motore, ma con occhi piccoli e scuri, sopracciglia decise e una
// bocca chiusa e concentrata a riposo, adattato alla testa ellissoidale.
function restyleFace(actor, look){
  const rig = actor?.facialRig;
  if (!rig) return;
  for (const eye of [rig.leftEye, rig.rightEye]){
    if (!eye) continue;
    eye.scleraMesh?.scale.set(0.54, 0.7, 0.3);
    eye.pupilMesh?.scale.set(0.92, 1.16, 0.46);
    eye.pupilGroup?.children.forEach((c, i) => { if (i > 0) c.scale.setScalar(0.5); });
    eye.lidMesh?.material?.color?.setHex(look.skin);
  }
  for (const brow of [rig.leftBrow, rig.rightBrow]){
    const m = brow?.children[0];
    // sopracciglia spesse e un po' aggrottate (estremità interne più basse): sguardo concentrato
    if (m){ m.scale.set(1.12, 1.6, 1.1); m.rotation.z = brow === rig.leftBrow ? -0.2 : 0.2; m.material?.color?.setHex(look.brow); }
  }
  const mouth = rig.neutralMouth;
  if (mouth?.children.length > 1){ mouth.children[0].scale.set(0.58, 0.42, 1); mouth.children[1].visible = false; }
  // toppa del viso (guance, segni delle espressioni) appena fuori dall'ellissoide della testa
  rig.conformalPatchMesh?.scale.set((HEAD.rx + 0.006)/0.238, (HEAD.ry + 0.008)/0.238, (HEAD.rz + 0.004)/0.238);
  for (const cheek of [rig.leftCheek, rig.rightCheek]) if (cheek) cheek.position.z = 0.21;
}

// B29 · Modello 3D della mascotte di un attore (Lob o Drop). Lo chiede la prima volta che serve (mai con «Classici»),
// lo monta nella radice dell'attore quando è arrivato e decide se in questo fotogramma si disegna lui oppure la
// mascotte costruita nel codice: quest'ultima resta finché il modello non è pronto, se il caricamento fallisce, con
// ?mascotte=codice e in prima persona (dove del corpo si vedono solo avambracci, mani e racchetta).
// Restituisce il rig da animare, oppure null. Niente allocazioni se non al montaggio.
function mascotModelFor(actor, engine){
  const key = actor.natpfMascot || null;
  let rig = actor.natpfMascot3d || null;
  const want = !!key && actor.root.visible && getMascotMode() === '3d' && engine?.fpBodyActor !== actor;
  if (want && (!rig || rig.key !== key)){
    const status = mascotModelStatus(key);
    if (status === 'idle') loadMascotModel(key);
    else if (status === 'ready'){
      if (rig?.group) actor.root.remove(rig.group);
      const copy = mascotModelInstance(key);
      rig = (copy && createMascotRig(copy, key)) || { key, group: null };
      if (rig.group) actor.root.add(rig.group);
      else console.warn(`[natpf-mascotte] modello 3D di ${key} senza le ossa attese: in campo resta la mascotte costruita nel codice`);
      actor.natpfMascot3d = rig;
    }
  }
  const on = want && !!rig?.group && rig.key === key;
  if (rig?.group && rig.group.visible !== on) rig.group.visible = on;
  if (actor.model && actor.model.visible === on){ actor.model.visible = !on; actor.natpfLimbs.container.visible = !on; }
  actor.natpfMascot3dOn = on;
  return on ? rig : null;
}

// Ogni fotogramma, prima del render: varianti (l'avversario è P2 in 1v1 tra persone, altrimenti la CPU) e arti.
// B24: con «Personaggi in campo: Lob & Drop» (natpf_personaggi.js) chi sta dalla parte del Player 1 è Drop, l'altro Lob.
const ACTOR_KEYS = ['player', 'playerPartner', 'opponent', 'opponentPartner'];
export function updateNatpfCharacters(engine){
  const looks = castLooks(getCast(), !!engine?.isMultiplayer);
  // tempo di gioco dall'ultimo disegno (per lo scostamento morbido della racchetta: natpf_racket_clear.js)
  const now = engine?.elapsedTime, dt = now - engine?.natpfDrawnAt;
  if (engine && typeof now === 'number') engine.natpfDrawnAt = now;
  for (const k of ACTOR_KEYS){
    const actor = engine?.[k];
    if (!actor?.natpfLimbs) continue;
    const want = actor.sideSign > 0 ? looks.player : looks.opponent;
    if (actor.natpfLook !== want) applyNatpfLook(actor, want);
    // testa grande (mascotte): la racchetta si scosta dalla testa quanto serve, la mano la segue; con il tennista
    // (natpfHeadShape assente) non si tocca niente. Unico punto in cui si chiama: vedi natpf_racket_clear.js
    // B29: se la mascotte ha il suo modello 3D pronto, le parti animate si riportano sulle sue ossa (natpf_mascot_rig.js)
    // e i pezzi costruiti nel codice si nascondono; altrimenti tutto come prima
    const rig3d = actor.natpfMascot || actor.natpfMascot3d ? mascotModelFor(actor, engine) : null;
    if (rig3d){
      poseMascotBody(rig3d, actor);
      actor.natpfRacketPush = keepRacketClear(actor, mascotModelHeadShape(rig3d.key), dt, engine.ball, rig3d.head.bone);
      poseMascotArms(rig3d, actor, dt);
      continue;
    }
    actor.natpfRacketPush = keepRacketClear(actor, actor.natpfHeadShape || null, dt, engine.ball);
    updateNatpfActorLimbs(actor);
    if (actor.natpfMascot) updateMascotLabels(actor);
  }
  setPortraitLooks(looks.player, looks.opponent);
}

// ---------------------------------------------------------------------------------------------------------------
// Racchetta: telaio in grafite, gola a Y, manico nero, corde chiare. Stesse misure del modello precedente:
// fondello in y = 0, cuore delle corde in y = 0.545, punta in y ≈ 0.76, piatto perpendicolare a z.
let RACKET_PARTS = null;
function racketParts(){
  if (RACKET_PARTS) return RACKET_PARTS;
  const { center, headA: a, headB: b } = RACKET_POINTS, tube = 0.0145;
  const ellipse = Array.from({ length: 64 }, (_, i) => { const t = i/64*Math.PI*2; return new THREE.Vector3(a*Math.cos(t), center + b*Math.sin(t), 0); });
  const frame = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ellipse, true), 96, tube, 8, true);
  const yAt = y => a*Math.sqrt(Math.max(0, 1 - ((y - center)/b)**2));
  const throat = merge([-1, 1].map(s => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(s*0.014, 0.2, 0), new THREE.Vector3(s*0.045, 0.27, 0), new THREE.Vector3(s*yAt(0.372), 0.372, 0)]), 16, 0.011, 8, false)));
  const handle = merge([
    place(new THREE.CylinderGeometry(0.0215, 0.0215, 0.19, 8), { p: [0, 0.115, 0], r: [0, Math.PI/8, 0] }),
    place(new THREE.CylinderGeometry(0.019, 0.022, 0.02, 8), { p: [0, 0.21, 0], r: [0, Math.PI/8, 0] }),
  ]);
  const butt = place(new THREE.CylinderGeometry(0.025, 0.027, 0.022, 8), { p: [0, 0.011, 0], r: [0, Math.PI/8, 0] });
  // corde: griglia di segmenti ritagliata dentro l'ovale, più un velo appena visibile che dà corpo al piatto
  const ia = a - tube*0.8, ib = b - tube*0.8, verts = [];
  for (let i = 1; i < 16; i++){ const x = -ia + i*(2*ia/16), h = ib*Math.sqrt(1 - (x/ia)**2); verts.push(x, center - h, 0, x, center + h, 0); }
  for (let i = 1; i < 19; i++){ const y = -ib + i*(2*ib/19), w = ia*Math.sqrt(1 - (y/ib)**2); verts.push(-w, center + y, 0, w, center + y, 0); }
  const strings = new THREE.BufferGeometry();
  strings.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const bed = place(new THREE.CircleGeometry(1, 40), { p: [0, center, 0], s: [ia, ib, 1] });
  RACKET_PARTS = {
    frame, throat, handle, butt, strings, bed,
    frameMat: toyMaterial(0x1b1d22, 'graphite'), gripMat: toyMaterial(0x0e0f12, 'grip'), buttMat: toyMaterial(0x2b2f38, 'graphite'),
    stringMat: new THREE.LineBasicMaterial({ color: 0xf3f2e6, transparent: true, opacity: 0.9 }),
    bedMat: new THREE.MeshBasicMaterial({ color: 0xf6f5ea, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
  };
  return RACKET_PARTS;
}
export function createNatpfRacket(){
  const R = racketParts(), racket = new THREE.Group();
  racket.name = 'NatpfRacchetta';
  const mesh = (geo, mat, name, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name; m.castShadow = shadow; m.receiveShadow = true; m.userData.natpfMaterial = true;
    racket.add(m);
    return m;
  };
  mesh(R.frame, R.frameMat, 'NatpfTelaio');
  mesh(R.throat, R.frameMat, 'NatpfGola');
  mesh(R.handle, R.gripMat, 'NatpfManico');
  mesh(R.butt, R.buttMat, 'NatpfFondello');
  mesh(R.bed, R.bedMat, 'NatpfPiatto', false).renderOrder = 2;
  const strings = new THREE.LineSegments(R.strings, R.stringMat);
  strings.name = 'NatpfCorde';
  racket.add(strings);
  return racket;
}

// Pallina giallo-verde con la cucitura bianca (curva classica della pallina da tennis), raggio come il modello precedente.
let BALL_PARTS = null;
export function createNatpfBall(){
  if (!BALL_PARTS){
    const r = BALL_RADIUS, A = 0.75, B = 0.25, C = 2*Math.sqrt(A*B);
    const pts = Array.from({ length: 96 }, (_, i) => {
      const t = i/96*Math.PI*2;
      return new THREE.Vector3(A*Math.cos(t) + B*Math.cos(3*t), A*Math.sin(t) - B*Math.sin(3*t), C*Math.sin(2*t)).setLength(r*1.004);
    });
    BALL_PARTS = {
      felt: new THREE.SphereGeometry(r, 28, 20),
      seam: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, 0.0042, 6, true),
      feltMat: toyMaterial(0xd8f23a, 'felt'), seamMat: toyMaterial(0xf6f6ee, 'seam'),
    };
  }
  const ball = new THREE.Group();
  ball.name = 'NatpfPallina';
  for (const [geo, mat, name] of [[BALL_PARTS.felt, BALL_PARTS.feltMat, 'NatpfFeltro'], [BALL_PARTS.seam, BALL_PARTS.seamMat, 'NatpfCucitura']]){
    const m = new THREE.Mesh(geo, mat);
    m.name = name; m.castShadow = true; m.userData.natpfMaterial = true;
    ball.add(m);
  }
  return ball;
}

// Tutto il «cast» di una partita: i due giocatori (più i compagni del doppio, nascosti in 1v1), racchetta e pallina.
export function createNatpfCast(){
  return {
    player: createNatpfCharacter('p1'), playerPartner: createNatpfCharacter('p1'),
    opponent: createNatpfCharacter('cpu'), opponentPartner: createNatpfCharacter('cpu'),
    racket: createNatpfRacket(), ball: createNatpfBall(),
  };
}
