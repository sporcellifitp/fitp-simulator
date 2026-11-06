// Prototipo B9 «3D realistico»: avambraccio, mano e telefono procedurali (three.js 0.160, nessun asset scaricato).
// Moto del telefono: motion.js (verificato con il telefono simulato). Braccio: rig.js (IK e torsione). Pelle: mesh.js
// (in un worker). Parametri dell'indirizzo: g=<gesto> mano=sinistra lento=0.5 vista=<dietro|treQuarti|lato|alto|presa>
// t=<secondi> (fotogramma fisso, per le prove) pulito (senza interfaccia) h=<passo della griglia in m>.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gesturePose, planFor, cycleOf, contactOf, PROTO_IDS, qrot } from './motion.js';
import { makeBind, boneState, bindBones } from './rig.js';
import { buildPhone } from './phone.js';
import { PHONE } from './hand.js';
import { FADE } from './mesh.js';

const qs = new URLSearchParams(location.search);
const state = {
  id: PROTO_IDS.includes(qs.get('g')) ? qs.get('g') : 'forehand',
  hand: qs.get('mano') === 'sinistra' ? 'left' : 'right',
  slow: qs.has('lento') ? (Number(qs.get('lento')) || .5) : 1,
  view: qs.get('vista') || null,
  tFixed: qs.has('t') ? Number(qs.get('t')) : null,
};
if (state.tFixed != null) document.body.classList.add('shot');
if (qs.has('pulito')) document.body.classList.add('clean');

const CARDS = {
  grip: ['Presa', 'Il dorso del telefono appoggia sul palmo, le quattro dita avvolgono il bordo, il pollice sta lungo l’altro bordo. Schermo verso di te.'],
  ready: ['Posizione di partenza', 'Gomito piegato, mano davanti alla pancia, telefono fermo: ogni colpo parte da qui e torna qui.'],
  forehand: ['Dritto', 'Porta la mano verso destra, poi chiudi il braccio come una porta: sempre più veloce fino alla palla, poi accompagna.'],
  backhand: ['Rovescio', 'Mano davanti all’anca sinistra, poi apri il braccio verso destra: la velocità massima arriva sulla palla.'],
  serve: ['Servizio', 'Lancia (la mano sale in avanti), porta la mano sopra la testa e colpisci quando la palla è in cima.'],
  lob: ['Pallonetto', 'Dal basso verso l’alto, senza fretta: la mano sale mentre colpisce.'],
  drop: ['Palla corta', 'Un colpo corto e morbido: la mano va avanti piano e si ferma presto.'],
  flat: ['Piatto', 'Il tuo dritto, più veloce e più secco.'],
  slice: ['Tagliato', 'Dall’alto verso il basso: il telefono scende mentre attraversa la palla.'],
  smash: ['Schiacciata', 'Mano sopra la testa, poi giù in avanti con decisione.'],
};
const PHASES = { pronto: 'Pronto', preparazione: 'Preparazione', accelerazione: 'Accelera', impatto: 'Impatto', accompagnamento: 'Accompagna',
  ritorno: 'Ritorno', lancio: 'Lancio', caricamento: 'Carica', battuta: 'Colpisci' };
const swapLR = s => s.replace(/destr|sinistr/g, m => m === 'destr' ? 'sinistr' : 'destr');

/* ---------- renderer, ambiente, luci ---------- */
const canvas = document.getElementById('view');
// qualità=bassa (per il disegno software, per esempio un PC senza accelerazione): niente MSAA, ombra 1024² non morbida,
// niente sheen e clearcoat sui materiali fisici, densità di pixel 1. La forma e il moto non cambiano.
const LOW = qs.get('qualita') === 'bassa';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance', preserveDrawingBuffer: state.tFixed != null });
renderer.setPixelRatio(LOW ? 1 : Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = LOW ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
const HORIZON = new THREE.Color(0x2b2026), ZENITH = new THREE.Color(0x070a12);
scene.fog = new THREE.Fog(HORIZON, 1.8, 7.5);
const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.ShaderMaterial({
  // niente tone mapping: la nebbia del campo arriva già nello spazio d'uscita (HORIZON esatto), il cielo deve combaciare
  // (prima: una riga netta tra campo e cielo, il cielo più scuro)
  side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  uniforms: { top: { value: ZENITH }, hor: { value: HORIZON } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }',
  fragmentShader: 'uniform vec3 top, hor; varying vec3 vP; void main(){ float h = clamp(vP.y*1.15, 0., 1.); gl_FragColor = vec4(mix(hor, top, smoothstep(0., 1., pow(h, .8))), 1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
}));
dome.renderOrder = -10; scene.add(dome);

const key = new THREE.DirectionalLight(0xffeedd, 2.6);
key.castShadow = true; key.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -1.1, right: 1.1, top: 1.1, bottom: -1.1, near: .3, far: 8 });
key.shadow.bias = -.0002; key.shadow.normalBias = .012; key.shadow.radius = 3;
const rim = new THREE.DirectionalLight(0x9ec3ff, 2.8);
const fill = new THREE.HemisphereLight(0xc6d6ff, 0x6a2f1c, .28);
scene.add(key, key.target, rim, rim.target, fill);
// le luci seguono l'orientamento orizzontale della camera (come uno studio fotografico): chiave da destra e dall'alto,
// controluce freddo da dietro il soggetto, riempimento dal cielo e dall'ambiente
const KEY_REL = new THREE.Vector3(1.0, 1.55, .25).normalize(), RIM_REL = new THREE.Vector3(-.75, .85, -1.7).normalize();

/* ---------- campo in terra rossa ---------- */
function clayTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#b4532f'; g.fillRect(0, 0, 512, 512);
  let seed = 7; const rnd = () => (seed = (seed*16807) % 2147483647)/2147483647;
  for (let i = 0; i < 9000; i++){ const v = rnd(); g.fillStyle = v < .5 ? `rgba(120,45,22,${.10 + rnd()*.18})` : `rgba(220,120,80,${.06 + rnd()*.14})`; g.fillRect(rnd()*512, rnd()*512, 1 + rnd()*2.5, 1 + rnd()*2.5); }
  for (let i = 0; i < 40; i++){ g.strokeStyle = `rgba(150,60,30,${.05 + rnd()*.06})`; g.lineWidth = 6 + rnd()*14; g.beginPath(); const y = rnd()*512; g.moveTo(0, y); g.bezierCurveTo(170, y + rnd()*30 - 15, 340, y + rnd()*30 - 15, 512, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(52, 52); t.anisotropy = 8;
  return t;
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ map: clayTexture(), roughness: .96, metalness: 0, envMapIntensity: .35 }));
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; floor.renderOrder = -10; scene.add(floor);
if (qs.has('nofloor')) floor.visible = false;
const lineM = new THREE.MeshStandardMaterial({ color: 0xe9e2d6, roughness: .9, envMapIntensity: .3 });
const baseline = new THREE.Mesh(new THREE.PlaneGeometry(10.97, .05), lineM); baseline.rotation.x = -Math.PI/2; baseline.position.set(0, .002, -.75); baseline.receiveShadow = true;
const centre = new THREE.Mesh(new THREE.PlaneGeometry(.05, .12), lineM); centre.rotation.x = -Math.PI/2; centre.position.set(0, .002, -.84); centre.receiveShadow = true;
const side = new THREE.Mesh(new THREE.PlaneGeometry(.05, 12), lineM); side.rotation.x = -Math.PI/2; side.position.set(4.115, .002, -6.75); side.receiveShadow = true;
for (const l of [baseline, centre, side]) l.renderOrder = -10;
scene.add(baseline, centre, side);

/* ---------- braccio: ossa e pelle ---------- */
const rig = new THREE.Group(); scene.add(rig);
const P0 = gesturePose('ready', 0);
const bind = makeBind(P0.pos, P0.q);
const bones = bindBones(bind).map(p => { const b = new THREE.Bone(); b.position.set(p[0], p[1], p[2]); rig.add(b); return b; });
rig.updateMatrixWorld(true);
const skeleton = new THREE.Skeleton(bones);
const skinMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .5, metalness: 0, sheen: .35, sheenRoughness: .5,
  sheenColor: new THREE.Color(0xff8a70), clearcoat: .06, clearcoatRoughness: .55, specularIntensity: .45, envMapIntensity: .42 });
// finto scattering sotto la pelle: diffusione «avvolgente» più ampia nel rosso (la luce passa oltre il terminatore)
const SSS = THREE.ShaderChunk.lights_physical_pars_fragment.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
  'float nlw = dot( geometryNormal, directLight.direction ); vec3 ww = vec3( .50, .24, .16 );\n' +
  'vec3 wrapD = clamp( ( vec3( nlw ) + ww ) / ( ( 1. + ww ) * ( 1. + ww ) ), 0., 1. );\n' +
  'reflectedLight.directDiffuse += wrapD * directLight.color * BRDF_Lambert( material.diffuseColor );');
const withSSS = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', SSS); };
skinMat.onBeforeCompile = withSSS; skinMat.customProgramCacheKey = () => 'p3d-skin';
if (LOW){ skinMat.sheen = 0; skinMat.clearcoat = 0; }
const fadeMat = skinMat.clone();
fadeMat.transparent = true; fadeMat.depthWrite = false;
fadeMat.onBeforeCompile = sh => {
  withSSS(sh);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float fade;\nvarying float vFade;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = fade;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFade;')
    .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade*vFade;');
};
fadeMat.customProgramCacheKey = () => 'p3d-fade';
// Avambraccio che sfuma verso il gomito senza mostrare l'interno: una passata di sola profondità della parte che sfuma
// PRIMA della parte opaca (che dietro una parete sfumata non si disegna), poi la parte sfumata a colori, solo la
// superficie più vicina. Guardando l'avambraccio di punta si vede lo sfondo attraverso l'estremità trasparente, non un
// tubo vuoto (prima: anello scuro con il buco) né le pareti interne (provato: «tappo» con facce interne disegnate
// convesse, restavano anelli). Ordine: campo e palla, profondità della sfumatura, pelle opaca, telefono, sfumatura.
const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
if (qs.has('debugFade')){ fadeMat.onBeforeCompile = withSSS; fadeMat.transparent = false; fadeMat.depthWrite = true; fadeMat.vertexColors = false; fadeMat.color.set(0xff2020); fadeMat.side = THREE.DoubleSide; }
let skinStats = null;
function makeSkin(r){
  const attrs = {
    position: new THREE.BufferAttribute(r.pos, 3), normal: new THREE.BufferAttribute(r.nrm, 3), color: new THREE.BufferAttribute(r.color, 3),
    skinIndex: new THREE.Uint16BufferAttribute(r.skinIndex, 4), skinWeight: new THREE.BufferAttribute(r.skinWeight, 4), fade: new THREE.BufferAttribute(r.fade, 1),
  };
  const opaque = [], faded = [];
  for (let i = 0; i < r.idx.length; i += 3){
    const a = r.idx[i], b = r.idx[i + 1], c = r.idx[i + 2];
    (Math.min(r.fade[a], r.fade[b], r.fade[c]) > .999 ? opaque : faded).push(a, b, c);
  }
  const mk = (list, mat) => {
    const g = new THREE.BufferGeometry();
    for (const [k, v] of Object.entries(attrs)) g.setAttribute(k, v);
    g.setIndex(r.pos.length/3 > 65535 ? new THREE.Uint32BufferAttribute(list, 1) : new THREE.Uint16BufferAttribute(list, 1));
    const m = new THREE.SkinnedMesh(g, mat); m.frustumCulled = false; m.bind(skeleton); rig.add(m); return m;
  };
  const d = mk(faded, depthMat); d.renderOrder = -5;
  const o = mk(opaque, skinMat); o.castShadow = true; o.receiveShadow = true; o.renderOrder = -4;
  const f = mk(faded, fadeMat); f.renderOrder = 2; f.receiveShadow = true;
  skinStats = r.stats;
}

/* ---------- telefono, fantasmi delle pose chiave, scia, palla ---------- */
const phone = buildPhone(renderer);
rig.add(phone.group);
phone.group.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
const ghostGeo = phone.group.children[0].geometry;
// pose chiave (caricamento, impatto, fine) come «ologrammi»: solo il contorno (fresnel), nessuna superficie piena
const ghostMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { col: { value: new THREE.Color(0xcfe2ff) }, op: { value: .26 } },
  vertexShader: 'varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix*vec4(position, 1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 col; uniform float op; varying vec3 vN, vV; void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(col, op*(.03 + .97*f)); }' });
// un materiale per fantasma: quando il telefono passa per quella posa il suo fantasma si spegne (prima, all'impatto, il
// fantasma coincideva con il telefono e lo «sbiancava»)
const ghosts = [0, 1, 2].map(() => { const m = new THREE.Mesh(ghostGeo, ghostMat.clone()); m.renderOrder = 3; rig.add(m); return m; });

const TRAIL_N = 96, TRAIL_WIN = .55, TIP = [0, PHONE.h/2 - .006, 0];
const trailPos = new Float32Array(TRAIL_N*2*3), trailCol = new Float32Array(TRAIL_N*2*4);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 4));
{ const ix = []; for (let i = 0; i < TRAIL_N - 1; i++){ const a = 2*i; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } trailGeo.setIndex(ix); }
// La scia sta dove è passata la cima, quindi spesso DAVANTI al telefono (che si allontana dalla camera): sullo schermo
// coprirebbe il telefono all'impatto. La sua profondità si sposta indietro di TRAIL_BIAS lungo il raggio della camera
// (stessa posizione sullo schermo): il telefono e la mano la coprono, come una scia di movimento dietro l'oggetto.
const TRAIL_BIAS = .20;   // 12 cm non bastavano all'impatto del dritto (la cima fa ~16 cm in 20 ms verso la rete)
const trailMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
trailMat.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' +
    '{ vec3 pb = mvPosition.xyz*( 1.0 + ' + TRAIL_BIAS.toFixed(3) + '/max( .05, - mvPosition.z ) ); vec4 cb = projectionMatrix*vec4( pb, 1.0 ); gl_Position.z = cb.z/cb.w*gl_Position.w; }');
};
const trail = new THREE.Mesh(trailGeo, trailMat);
trail.frustumCulled = false; trail.renderOrder = 4; rig.add(trail);

function ballTexture(){
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#d4e63c'; g.fillRect(0, 0, 512, 256);
  let seed = 3; const rnd = () => (seed = (seed*16807) % 2147483647)/2147483647;
  for (let i = 0; i < 5000; i++){ g.fillStyle = `rgba(${rnd() < .5 ? '255,255,200' : '120,140,20'},${.08 + rnd()*.12})`; g.fillRect(rnd()*512, rnd()*256, 1.5, 1.5); }
  g.strokeStyle = '#f4f6ea'; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); for (let x = 0; x <= 512; x += 4){ const y = 128 + 70*Math.sin(x/512*4*Math.PI); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const BALL_R = .0335;
const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 40, 24), new THREE.MeshPhysicalMaterial({ map: ballTexture(), roughness: .85, sheen: 1, sheenRoughness: .55, sheenColor: new THREE.Color(0xf6ffb0), envMapIntensity: .6 }));
ball.castShadow = true; ball.renderOrder = -6; rig.add(ball);

const V = (a, b, s = 1) => [a[0] + b[0]*s, a[1] + b[1]*s, a[2] + b[2]*s];
const G = -9.81;
const OUT = { forehand: [-.8, 3.4, -17], backhand: [.9, 3.4, -16], flat: [-.5, 1.4, -24], lob: [0, 8.5, -9.5], drop: [0, 2.4, -5],
  slice: [0, 1.0, -14], smash: [0, -4.2, -22], serve: [-.6, -2.6, -24] };
const ballPlans = new Map();
function ballPlan(id){
  if (ballPlans.has(id)) return ballPlans.get(id);
  const p = planFor(id); let bp = null;
  if (!p.still){
    const tc = contactOf(id), P = gesturePose(id, tc), q = P.q;
    let contact;
    if (p.serve) contact = V(V(P.pos, qrot(q, TIP)), qrot(q, [0, 1, 0]), BALL_R);
    else {
      const back = qrot(q, [0, 0, -1]), face = back[2] < 0 ? -1 : 1;     // la faccia del telefono rivolta verso la rete
      contact = V(P.pos, qrot(q, [0, .028, face*(PHONE.d/2 + BALL_R)]));
    }
    const out = OUT[id] || [0, 3, -16];
    if (p.serve){
      const tr = p.T.release, R = gesturePose(id, tr), start = V(V(R.pos, qrot(R.q, TIP)), [0, 1, 0], BALL_R + .01);
      const g2 = 2*(contact[1] - start[1])/((tc - tr)**2);
      bp = { tc, contact, out, serve: { tr, start, g2 } };
    } else {
      const T = .78, start = V(contact, [.18, .55, -6.4]);
      const vin = [0, 1, 2].map(j => (contact[j] - start[j] - (j === 1 ? .5*G*T*T : 0))/T);
      bp = { tc, contact, out, T, start, vin };
    }
  }
  ballPlans.set(id, bp); return bp;
}
function ballAt(id, t){
  const b = ballPlan(id); if (!b) return null;
  const dt = t - b.tc;
  if (dt >= 0){ if (dt > .7) return null; return { p: [b.contact[0] + b.out[0]*dt, b.contact[1] + b.out[1]*dt + .5*G*dt*dt, b.contact[2] + b.out[2]*dt], s: 1, spin: dt*40 }; }
  if (b.serve){
    const { tr, start, g2 } = b.serve; if (t < tr) return null;
    const u = (t - tr)/(b.tc - tr), d = t - tr, T = b.tc - tr, vy = g2*T;
    return { p: [start[0] + (b.contact[0] - start[0])*u, start[1] + vy*d - .5*g2*d*d, start[2] + (b.contact[2] - start[2])*u], s: Math.min(1, d/.08), spin: d*6 };
  }
  if (dt < -b.T) return null;
  const s = dt + b.T;
  return { p: [b.start[0] + b.vin[0]*s, b.start[1] + b.vin[1]*s + .5*G*s*s, b.start[2] + b.vin[2]*s], s: 1, spin: s*12 };
}

/* ---------- inquadrature ---------- */
// direzione della camera dal soggetto (giocatore destro) e inquadratura automatica del gesto (sfera che contiene il
// telefono e il gomito per tutto il ciclo)
const VIEWS = {
  dietro: { dir: [.45, .55, .95], fov: 22 },
  treQuarti: { dir: [1.0, .42, .62], fov: 22 },
  lato: { dir: [1.0, .14, -.10], fov: 22 },
  alto: { dir: [.80, .34, .95], fov: 24 },
  // servizio e schiacciata: la mano fa ~1 m in verticale; la camera la segue (media mobile della posizione: nessuno
  // scatto) a distanza fissa, come un operatore
  segui: { dir: [.95, .30, .55], fov: 24, follow: .25 },
  // dagli occhi di chi gioca (come la foto della presa): l'avambraccio si vede di lato e sfuma fuori quadro
  occhi: { dir: [.10, .95, .62], fov: 22 },
  // pallonetto: la mano sale di quasi un metro; con la camera fissa restava piccola in basso, qui la camera la segue
  // da dietro e in basso e la salita si legge dalla scia
  seguiBasso: { dir: [.55, .30, 1.0], fov: 24, follow: .28 },
  dietroBasso: { dir: [.40, .28, 1.0], fov: 22 },
  fronte: { dir: [.35, .25, -1.0], fov: 22 },
};
const DEFAULT_VIEW = { grip: 'presa', ready: 'occhi', forehand: 'dietro', backhand: 'dietro', flat: 'dietro', slice: 'dietroBasso', lob: 'seguiBasso', drop: 'dietroBasso', serve: 'segui', smash: 'segui' };
// punti del gesto (cima e base del telefono, polso, avambraccio visibile) campionati su tutto il ciclo
const samples = new Map();
function gesturePoints(id){
  if (samples.has(id)) return samples.get(id);
  const T = cycleOf(id), pts = [];
  for (let t = 0; t <= T; t += 1/30){
    const P = gesturePose(id, t), st = boneState(bind, P.pos, P.q);
    pts.push(V(P.pos, qrot(P.q, TIP)), V(P.pos, qrot(P.q, TIP), -1), st.arm.W, V(st.arm.W, st.arm.F, -.08));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) pts.push(V(P.pos, qrot(P.q, [sx*PHONE.w/2, sy*PHONE.h/2, 0])));   // angoli del telefono
  }
  // la palla nell'ultimo tratto prima del contatto e appena dopo (prima solo il contatto: nel tagliato la palla in arrivo
  // usciva dal bordo alto)
  const b = ballPlan(id); if (b){ pts.push(b.contact); for (const dt of [-.05, .04]){ const q = ballAt(id, b.tc + dt); if (q) pts.push(q.p); } }
  samples.set(id, pts); return pts;
}
// inquadratura stretta: distanza minima perché tutti i punti stiano nella finestra utile dello schermo, centro
// ricalcolato sulla proiezione. Finestra (coordinate normalizzate −1…1): in orizzontale ±0,86, in verticale da −0,62
// (sopra la curva della velocità, che occupa il 18% in basso) a +0,90.
const WIN = { x: .86, yb: -.62, yt: .90 };
function fitView(pts, dir, fov, aspect){
  const f = norm3(dir.map(x => -x)), r = norm3(cross3(f, [0, 1, 0])), u = cross3(r, f);
  let c = [0, 0, 0]; pts.forEach(p => { c = V(c, p, 1/pts.length); });
  const t1 = Math.tan(fov*Math.PI/360), my = (WIN.yt - WIN.yb)/2, oy = (WIN.yt + WIN.yb)/2;
  const tv = t1*my, th = t1*aspect*WIN.x;
  let D = 0;
  for (let it = 0; it < 4; it++){
    let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9; D = 0;
    for (const p of pts){ const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], x = dot3(d, r), y = dot3(d, u), z = dot3(d, f);
      D = Math.max(D, -z + Math.abs(x)/th, -z + Math.abs(y)/tv); xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    c = V(V(c, r, (xmin + xmax)/2), u, (ymin + ymax)/2);
  }
  // il centro del soggetto va a oy (sopra il centro dello schermo): la camera guarda un po' più in basso
  return { c: V(c, u, -oy*D*t1), D };
}
const dot3 = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross3 = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
const camera = new THREE.PerspectiveCamera(30, 1, .02, 60);
const fits = new Map();
const tmpV = new THREE.Vector3();
function placeCamera(t){
  const viewName = state.view || DEFAULT_VIEW[state.id] || 'dietro';
  const mir = state.hand === 'left' ? -1 : 1, aspect = camera.aspect;
  let c, dir, dist, fov;
  if (viewName === 'presa' || state.id === 'grip'){
    // la camera gira attorno alla mano ferma: dagli occhi di chi gioca (come la foto della presa) a di lato, e ritorno
    const P = gesturePose('ready', 0); c = V(P.pos, [.01, -.02, .03]);
    const u = (Math.sin(2*Math.PI*t/9 - Math.PI/2) + 1)/2, e = u*u*(3 - 2*u);
    // fino a tre quarti (prima arrivava di lato, con il telefono di taglio: la presa non si leggeva più)
    const a0 = Math.atan2(.10, .62), a1 = Math.atan2(1, .55), a = a0 + (a1 - a0)*e;
    dir = [Math.sin(a), .95 - .45*e, Math.cos(a)]; fov = 22; dist = .80;
    // soggetto un po' a destra e in basso: in alto a sinistra c'è il titolo
    const fw = norm3(dir.map(x => -x)), rw = norm3(cross3(fw, [0, 1, 0])), uw = cross3(rw, fw);
    c = V(V(c, rw, -.045), uw, .012);
  } else {
    const v0 = VIEWS[viewName] || VIEWS.dietro;
    const v = qs.has('dir') ? { ...v0, dir: qs.get('dir').split(',').map(Number), fov: Number(qs.get('fov')) || v0.fov, follow: qs.has('follow') ? Number(qs.get('follow')) : v0.follow } : v0;
    fov = v.fov;
    const drift = state.tFixed != null ? 0 : .05*Math.sin(2*Math.PI*t/11);
    const a = Math.atan2(v.dir[0], v.dir[2]) + drift, hz = Math.hypot(v.dir[0], v.dir[2]);
    dir = [Math.sin(a)*hz, v.dir[1], Math.cos(a)*hz];
    if (v.follow){
      // media mobile pesata (finestra ±0,24 s): la camera anticipa e insegue la mano senza scatti
      let m = [0, 0, 0], ws = 0; const K = 8, Tc = cycleOf(state.id), tt = state.tFixed != null ? state.tFixed : (t*state.slow) % Tc;
      for (let k = -K; k <= K; k++){ const w = Math.cos(k/(K + 1)*Math.PI/2)**2; const P = gesturePose(state.id, Math.min(Tc, Math.max(0, tt + k*.03))); m = V(m, V(P.pos, qrot(P.q, TIP), .5), w); ws += w; }
      c = m.map(x => x/ws);
      dist = v.follow/Math.tan(fov*Math.PI/360*.86)/Math.min(1, aspect);
      c = V(c, [0, -.06, 0]);
    } else {
    const key = state.id + '|' + viewName + '|' + aspect.toFixed(3) + '|' + (qs.get('dir') || '');
    if (!fits.has(key)) fits.set(key, fitView(gesturePoints(state.id), [v.dir[0], v.dir[1], v.dir[2]], fov, aspect));
    const fit = fits.get(key); c = fit.c; dist = Math.max(fit.D, planFor(state.id).still ? .95 : 0);
    }
  }
  const d = Math.hypot(...dir), pos = V(c, dir, dist/d);
  camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.set(pos[0]*mir, pos[1], pos[2]);
  camera.lookAt(c[0]*mir, c[1], c[2]);
  // luci legate alla direzione orizzontale della camera
  const yaw = Math.atan2(camera.position.x - c[0]*mir, camera.position.z - c[2]);
  const rot = (v) => tmpV.set(v.x*Math.cos(yaw) + v.z*Math.sin(yaw), v.y, -v.x*Math.sin(yaw) + v.z*Math.cos(yaw));
  key.target.position.set(c[0]*mir, c[1] - .1, c[2]); rim.target.position.copy(key.target.position);
  key.position.copy(key.target.position).addScaledVector(rot(KEY_REL), 4);
  rim.position.copy(key.target.position).addScaledVector(rot(RIM_REL), 4);
}

/* ---------- posa di un istante ---------- */
let lastPose = null;
function applyPose(t){
  const id = state.id, P = gesturePose(id, t);
  let pos = P.pos;
  if (id === 'ready' || id === 'grip') pos = V(pos, [0, .003*Math.sin(2*Math.PI*t/4.2), 0]);     // respiro (±3 mm)
  const st = boneState(bind, pos, P.q);
  st.bones.forEach((b, i) => { bones[i].position.set(b.p[0], b.p[1], b.p[2]); bones[i].quaternion.set(b.q[0], b.q[1], b.q[2], b.q[3]); });
  phone.group.position.set(pos[0], pos[1], pos[2]); phone.group.quaternion.set(P.q[0], P.q[1], P.q[2], P.q[3]);
  // scia della cima del telefono
  const p = planFor(id);
  const camRig = rig.worldToLocal(camera.position.clone());
  const pts = [], spd = [];
  for (let j = 0; j < TRAIL_N; j++){
    const tj = t - TRAIL_WIN*(1 - j/(TRAIL_N - 1)), Q = gesturePose(id, Math.max(0, tj));
    pts.push(V(Q.pos, qrot(Q.q, TIP))); spd.push(Math.abs(Q.speed || 0));
  }
  for (let j = 0; j < TRAIL_N; j++){
    const a = pts[Math.max(0, j - 1)], b = pts[Math.min(TRAIL_N - 1, j + 1)], tg = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const vw = [camRig.x - pts[j][0], camRig.y - pts[j][1], camRig.z - pts[j][2]];
    let s = [tg[1]*vw[2] - tg[2]*vw[1], tg[2]*vw[0] - tg[0]*vw[2], tg[0]*vw[1] - tg[1]*vw[0]]; const sl = Math.hypot(...s) || 1; s = s.map(x => x/sl);
    const k = j/(TRAIL_N - 1), sp = Math.min(1, Math.max(0, (spd[j] - 90)/420));
    const w = .016*(.15 + .85*k)*(.35 + .65*sp);
    const A = V(pts[j], s, w), B = V(pts[j], s, -w);
    trailPos.set(A, j*6); trailPos.set(B, j*6 + 3);
    // la testa della scia (ultimi 20 ms) sfuma: vicino al telefono il nastro si vede quasi di punta (moto verso la
    // camera o via da essa) e diventava un riquadro chiaro sopra le dita
    const head = Math.min(1, (1 - k)*TRAIL_WIN/.02), al = Math.pow(k, 1.3)*sp*head*head*(3 - 2*head), col = [1, .66 + .26*k*k, .18 + .45*k*k];
    trailCol.set([...col, al], j*8); trailCol.set([...col, al], j*8 + 4);
  }
  trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
  // fantasmi: caricamento, impatto, fine dell'accompagnamento
  const keys = p.still ? [] : p.serve ? [p.T.tEnd, p.T.hStart + .02, p.T.hit] : [p.T.prep, p.T.hit, p.T.swing + .06];
  // con la camera che segue la mano (servizio, schiacciata) i fantasmi si spostano nel quadro e confondono: niente
  const follow = !!(VIEWS[state.view || DEFAULT_VIEW[id]] || {}).follow;
  ghosts.forEach((g, i) => {
    g.visible = i < keys.length && !p.still && !follow;
    if (!g.visible) return;
    const Q = gesturePose(id, keys[i]); g.position.set(Q.pos[0], Q.pos[1], Q.pos[2]); g.quaternion.set(Q.q[0], Q.q[1], Q.q[2], Q.q[3]);
    const near = Math.min(1, Math.abs(t - keys[i])/.16);
    g.material.uniforms.op.value = .26*near*near*(3 - 2*near);
    g.visible = near > .02;
  });
  // palla
  const b = ballAt(id, t);
  ball.visible = !!b;
  if (b){ ball.position.set(b.p[0], b.p[1], b.p[2]); ball.scale.setScalar(Math.max(.001, b.s)); ball.rotation.set(-b.spin, .4, 0); }
  lastPose = { ...P, arm: st.arm, twist: st.twist };
  return P;
}

/* ---------- interfaccia ---------- */
const bar = document.getElementById('bar');
const NAMES = { grip: 'Presa', ready: 'Pronto', forehand: 'Dritto', backhand: 'Rovescio', serve: 'Servizio', lob: 'Pallonetto', drop: 'Palla corta', flat: 'Piatto', slice: 'Tagliato', smash: 'Schiacciata' };
function button(label, pressed, on){ const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-pressed', String(pressed)); b.onclick = on; bar.appendChild(b); return b; }
function buildBar(){
  bar.textContent = '';
  for (const id of PROTO_IDS) button(NAMES[id], id === state.id, () => { state.id = id; t0 = performance.now(); refresh(); });
  bar.appendChild(Object.assign(document.createElement('span'), { className: 'sep' }));
  button('Mancino', state.hand === 'left', () => { state.hand = state.hand === 'left' ? 'right' : 'left'; refresh(); });
  button(state.slow < 1 ? 'Rallentato' : 'Tempo reale', state.slow < 1, () => { state.slow = state.slow < 1 ? 1 : .5; t0 = performance.now(); refresh(); });
  for (const v of ['dietro', 'treQuarti', 'lato']) button({ dietro: 'Da dietro', treQuarti: 'Tre quarti', lato: 'Di lato' }[v], state.view === v, () => { state.view = state.view === v ? null : v; refresh(); });
}
const tl = document.getElementById('tl'), tg = tl.getContext('2d');
let curve = null;
function buildCurve(){
  const T = cycleOf(state.id), N = 360, v = [];
  for (let i = 0; i <= N; i++) v.push(Math.abs(gesturePose(state.id, i/N*T).speed || 0));
  curve = { T, v, max: Math.max(300, ...v) };
}
function drawTimeline(t){
  const W = tl.width, H = tl.height; tg.clearRect(0, 0, W, H);
  if (planFor(state.id).still){ return; }
  const { T, v, max } = curve, x = i => 10 + i/(v.length - 1)*(W - 20), y = s => H - 26 - s/max*(H - 44);
  tg.fillStyle = 'rgba(255,255,255,.07)'; tg.fillRect(10, H - 26, W - 20, 2);
  const gr = tg.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, 'rgba(255,207,90,0)'); gr.addColorStop(1, 'rgba(255,207,90,.55)');
  tg.beginPath(); tg.moveTo(x(0), y(0)); v.forEach((s, i) => tg.lineTo(x(i), y(s))); tg.lineTo(x(v.length - 1), H - 26); tg.lineTo(x(0), H - 26); tg.closePath(); tg.fillStyle = gr; tg.fill();
  tg.beginPath(); v.forEach((s, i) => i ? tg.lineTo(x(i), y(s)) : tg.moveTo(x(i), y(s))); tg.strokeStyle = 'rgba(255,220,140,.95)'; tg.lineWidth = 3; tg.stroke();
  const tc = contactOf(state.id), xc = 10 + tc/T*(W - 20);
  tg.strokeStyle = 'rgba(255,255,255,.55)'; tg.setLineDash([6, 6]); tg.beginPath(); tg.moveTo(xc, 8); tg.lineTo(xc, H - 22); tg.stroke(); tg.setLineDash([]);
  tg.fillStyle = 'rgba(255,255,255,.75)'; tg.font = '600 20px system-ui, sans-serif'; tg.textAlign = 'center'; tg.fillText('palla', xc, H - 3);
  tg.textAlign = 'left'; tg.fillStyle = 'rgba(255,255,255,.45)'; tg.fillText('velocità del telefono', 12, 22);
  const xp = 10 + (t % T)/T*(W - 20);
  tg.fillStyle = '#fff'; tg.beginPath(); tg.arc(xp, y(Math.abs(lastPose?.speed || 0)), 7, 0, 2*Math.PI); tg.fill();
}
function refresh(){
  const mir = state.hand === 'left';
  rig.scale.x = mir ? -1 : 1;
  phone.setMirror(mir);
  const [n, h] = CARDS[state.id];
  document.getElementById('name').textContent = n;
  document.getElementById('hint').textContent = mir ? swapLR(h) : h;
  buildCurve(); buildBar();
}

/* ---------- ciclo ---------- */
function resize(){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
let t0 = performance.now(), ready = false;
const MEASURE = Number(qs.get('misura')) || 0;
const phaseEl = document.getElementById('phase');
const perf = { frames: 0, cpu: 0, gpu: 0 };
const PX = new Uint8Array(4);
function frame(now){
  const T = cycleOf(state.id);
  const t = state.tFixed != null ? state.tFixed : ((now - t0)/1000*state.slow) % T;
  placeCamera(state.tFixed != null ? state.tFixed : (now - t0)/1000);
  const a = performance.now();
  const P = applyPose(t);
  const b = performance.now();
  renderer.render(scene, camera);
  // misura: gl.finish() in Chromium non aspetta il processo della GPU (1,6 ms a qualunque risoluzione, non credibile);
  // la lettura di un pixel sì (aspetta che il fotogramma sia davvero disegnato)
  if (state.tFixed != null || MEASURE){ const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PX); }
  const c = performance.now();
  perf.frames++; perf.cpu += b - a; perf.gpu += c - b;
  const ph = PHASES[P.phase] || '';
  phaseEl.textContent = planFor(state.id).still ? '' : ph; phaseEl.classList.toggle('hit', P.phase === 'impatto');
  drawTimeline(t);
  if (MEASURE && !perf.warm && perf.frames === 6){ perf.warm = true; perf.frames = 0; perf.cpu = 0; perf.gpu = 0; }   // esclude la compilazione degli shader
  if (MEASURE && perf.frames >= MEASURE){ window.__p3d = { ready: true, perf: { posaMs: perf.cpu/perf.frames, renderMs: perf.gpu/perf.frames, frames: perf.frames }, skin: skinStats, info: renderer.info.render, size: [canvas.width, canvas.height] }; return; }
  if (MEASURE){ state.tFixed = ((state.tFixed ?? 0) + 1/60) % T; requestAnimationFrame(frame); return; }
  if (state.tFixed == null || perf.frames < 3) requestAnimationFrame(frame);
  else window.__p3d = { ready: true, perf: { posaMs: perf.cpu/perf.frames, renderMs: perf.gpu/perf.frames, frames: perf.frames }, skin: skinStats, arm: lastPose && { flexion: lastPose.arm.flexion, wristDev: lastPose.arm.wristDev, twist: lastPose.twist, shift: lastPose.arm.shift }, info: renderer.info.render };
}

if (LOW) scene.traverse(o => { if (o.material?.isMeshPhysicalMaterial){ o.material.sheen = 0; o.material.clearcoat = 0; } });
resize(); refresh();
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
worker.onmessage = e => {
  makeSkin(e.data);
  document.getElementById('loading').classList.add('off');
  ready = true; t0 = performance.now(); requestAnimationFrame(frame);
};
worker.onerror = e => { document.getElementById('loading').textContent = 'Errore nella costruzione della mano: ' + (e.message || e); };
worker.postMessage({ h: Number(qs.get('h')) || .0026 });
