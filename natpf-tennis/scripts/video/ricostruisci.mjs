// B17.1 · Dal tracciamento 2D del video (scripts/video/estrai-posa.mjs) alla ricostruzione 3D con il MODELLO DEL GIOCO
// (natpf_gesture_pose.js: busto tau/lat, spalla p/e/r, gomito b, pronosupinazione pro, polso fl/dv; omero 0,30 m,
// avambraccio 0,262 m): per ogni fotogramma si cercano gli angoli articolari e la posizione del bacino che, proiettati con
// una camera prospettica, cadono sui punti misurati (spalle, anche, gomito e polso destro di Pose), con la profondità
// decisa dalle lunghezze note dei segmenti e dal segno dei punti «mondo» di MediaPipe, l'orientamento della mano da
// Hands (direzione delle dita, linea delle nocche, normale del palmo) e l'asse lungo del telefono dalla macchia blu dello
// schermo. Minimi quadrati di Levenberg–Marquardt, un fotogramma alla volta con partenza dal precedente (più tentativi
// sul primo di ogni colpo), poi lisciatura a fase nulla di 3 fotogrammi.
//
//   node --import ./test/register.mjs scripts/video/ricostruisci.mjs --in=<mp.json[,mp2.json…]> --out=<gesti-video.json>
//        [--f=720] [--grip=auto|upright] [--segments=…]
//
// Convenzioni: campo del gioco x a destra di chi gioca, y in alto, −z verso lo schermo/rete; la camera del video sta
// davanti a chi gioca (sul lato −z) e guarda verso +z, quindi l'immagine ha la destra di chi gioca a sinistra
// (Xc = −x, Yc = −y, Zc = z + D). Il video NON è specchiato (le scritte del fondo si leggono dritte).
import fs from 'node:fs';
import path from 'node:path';
import * as GP from '../../src/natpf/natpf_gesture_pose.js';

const { armChain, JOINTS, JOINT_LIMITS, REST, BODY, ARM, PHONE, D, add, sub, mul, dot, cross, len, norm, qrot, qmul, qconj, qaxis, qEuler } = GP;
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const IN = arg('in', '').split(',').filter(Boolean).map(p => path.resolve(p)), OUT = path.resolve(arg('out', 'gesti-video.json'));
const F_PX = +arg('f', 720);            // lunghezza focale in pixel a 540×960 (ipotesi: ottica da 26 mm equivalenti; non misurata)
if (!IN.length) throw new Error('--in=…');

/* ---------- dati ---------- */
const frames = [];
let W = 540, H = 960;
for (const p of IN){ const d = JSON.parse(fs.readFileSync(p, 'utf8')); W = d.width || W; H = d.height || H; frames.push(...d.frames); }
frames.sort((a, b) => a.i - b.i);
const byI = new Map(frames.map(f => [f.i, f]));
const FPS = 30, CX = W/2, CY = H/2;
const r2 = v => Math.round(v*100)/100, r3 = v => Math.round(v*1000)/1000, r4 = v => Math.round(v*1e4)/1e4;

// Pose: 11 spalla sx, 12 spalla dx, 13 gomito sx, 14 gomito dx, 15 polso sx, 16 polso dx, 23 anca sx, 24 anca dx
const P = { shL: 11, shR: 12, elL: 13, elR: 14, wrL: 15, wrR: 16, hipL: 23, hipR: 24 };
const vis = (f, i) => f.pose?.[i]?.[3] ?? 0;
const uv = (f, i) => f.pose ? [f.pose[i][0], f.pose[i][1]] : null;

// mano destra tra quelle di Hands: la più vicina al polso destro di Pose (le etichette Left/Right di Hands valgono per
// un'immagine a specchio e qui sono invertite)
function rightHand(f){
  if (!f.hands?.length || !f.pose) return null;
  const w = uv(f, P.wrR);
  let best = null;
  for (const h of f.hands){ const d = Math.hypot(h.lm[0][0] - w[0], h.lm[0][1] - w[1]); if (!best || d < best.d) best = { h, d }; }
  return best && best.d < .07*H ? best.h : null;
}
// macchia dello schermo valida: vicina al polso destro, di taglia plausibile (il telefono è ~50 px di lato lungo a 540×960)
const phoneOf = f => f.phone && f.phone.nearWrist === P.wrR && f.phone.n >= 25 && f.phone.len1 < .2*H ? f.phone : null;

/* ---------- camera: scala dal rapporto tra pixel e punti «mondo» di MediaPipe sulle spalle (fotogrammi fermi) ---------- */
// La scala (px/m) nel piano del corpo: distanza tra le spalle nell'immagine / distanza nel mondo (x, y). D = f/scala.
function scaleEstimate(){
  const s = [];
  for (const f of frames){
    if (!f.pose || !f.poseWorld || vis(f, P.shL) < .8 || vis(f, P.shR) < .8) continue;
    const a = uv(f, P.shL), b = uv(f, P.shR), wa = f.poseWorld[P.shL], wb = f.poseWorld[P.shR];
    const dw = Math.hypot(wa[0] - wb[0], wa[1] - wb[1]); if (dw < .2) continue;      // spalle di taglio: la misura non vale
    // solo con le spalle quasi frontali (z mondo vicine) e anche visibili (persona intera nel quadro)
    if (Math.abs(wa[2] - wb[2]) > .1 || vis(f, P.hipL) < .7) continue;
    s.push(Math.hypot(a[0] - b[0], a[1] - b[1])/dw);
  }
  s.sort((a, b) => a - b);
  return { scale: s[Math.floor(s.length/2)], n: s.length, p10: s[Math.floor(s.length*.1)], p90: s[Math.floor(s.length*.9)] };
}
const SC = scaleEstimate();
const DIST = F_PX/SC.scale;                                   // distanza camera–bacino (m)
// altezza della camera rispetto al bacino: dal punto medio delle anche nei fotogrammi in piedi (mediana), così il
// bacino del modello (0, 1, 0) cade dove Pose vede le anche; camera senza inclinazione (ipotesi: le linee verticali del
// fondo sono verticali nel quadro)
function cameraOffset(){
  const ys = [], xs = [];
  for (const f of frames){ if (!f.pose || vis(f, P.hipL) < .7 || vis(f, P.hipR) < .7 || vis(f, P.shL) < .7) continue;
    const hm = [(f.pose[P.hipL][0] + f.pose[P.hipR][0])/2, (f.pose[P.hipL][1] + f.pose[P.hipR][1])/2];
    ys.push((hm[1] - CY)*DIST/F_PX); xs.push((hm[0] - CX)*DIST/F_PX); }
  ys.sort((a, b) => a - b); xs.sort((a, b) => a - b);
  return { yc: ys[Math.floor(ys.length/2)] || 0, xc: xs[Math.floor(xs.length/2)] || 0, n: ys.length };
}
const CAM = cameraOffset();
const HIP_Y = -.06;                                           // anche di MediaPipe (articolazioni) poco sotto il centro del bacino del modello

/* ---------- proiezione ---------- */
// punto del campo (m) → immagine (px): camera davanti a chi gioca che guarda +z, a DIST dal bacino, spostata di CAM
// (il bacino del modello cade sulle anche misurate); tx, tz spostano il bacino nel campo fotogramma per fotogramma
const project = p => { const Zc = p[2] + DIST; return [CX + F_PX*(-p[0] + CAM.xc)/Zc, CY + F_PX*(-(p[1] - BODY.pelvis[1] - HIP_Y) + CAM.yc)/Zc]; };
// vettore in coordinate camera (MediaPipe: x a destra, y in basso, z lontano dalla camera) → campo
const camToField = v => [-v[0], -v[1], v[2]];

/* ---------- presa: il telefono rigido nella mano ---------- */
// Riferimento della mano della catena: −y verso le dita, −z normale del palmo (fuori dal palmo), +x lato del pollice.
// Telefono: +y cima, +z normale dello schermo, +x bordo destro guardando lo schermo.
// Presa «in piedi nel pugno, schermo in avanti» (upright, come nella diagnostica dell'utente): la cima lungo il pollice
// (+x mano), lo schermo dalla parte della normale del palmo (il dorso del telefono sta su dita e palmo): rotazione di 180°
// attorno a (1, 1, 0)/√2. Il parametro --grip=auto la raffina sui fotogrammi con la macchia dello schermo (sotto).
const GRIP_UPRIGHT = qaxis([1, 1, 0], Math.PI);
let gripQ = GRIP_UPRIGHT, gripEuler = [0, 0, 0];
const gripWith = eul => qmul(GRIP_UPRIGHT, qEuler(eul));

/* ---------- modello: angoli + posizione → punti del campo ---------- */
const NJ = JOINTS.length;                                     // 10: tau lat y p e r b pro fl dv
const IDX = Object.fromEntries(JOINTS.map((k, i) => [k, i]));
// parametri: i 10 di JOINTS (y in m, gli altri in gradi) + tx, tz (m): spostamento del bacino nel campo
const NP = NJ + 2;
function unpack(x){ const j = {}; for (let i = 0; i < NJ; i++) j[JOINTS[i]] = x[i]; return { j, tx: x[NJ], tz: x[NJ + 1] }; }
function chainOf(x){
  const { j, tx, tz } = unpack(x), ch = armChain(j), sh = [tx, 0, tz];
  const T = v => add(v, sh);
  const at = v => T(add(ch.pelvis, qrot(ch.trunk, v)));
  const hipHalf = .10;                                        // anche di MediaPipe: articolazioni, ±0,10 m
  return { S: T(ch.S), E: T(ch.E), W: T(ch.W), SL: at([-BODY.shoulder[0], BODY.shoulder[1], 0]), hipR: at([hipHalf, HIP_Y, 0]), hipL: at([-hipHalf, HIP_Y, 0]),
    pelvis: T(ch.pelvis), neck: at(BODY.neck), head: at(BODY.head), hand: ch.hand, fore: ch.fore, upper: ch.upper, trunk: ch.trunk, j };
}
// telefono nel campo da una catena: centro (polso + offset nel riferimento del telefono), cima e normale
function phoneOf3(ch, G = gripQ){
  const q = qmul(ch.hand, G), wristLocal = GP.HAND_LOCAL_MARTELLO.wrist;   // polso del pugno (presa a martello: il più vicino a un pugno)
  const center = sub(ch.W, qrot(q, wristLocal));
  return { q, center, tip: qrot(q, [0, 1, 0]), screen: qrot(q, [0, 0, 1]), right: qrot(q, [1, 0, 0]) };
}

/* ---------- osservazioni di un fotogramma ---------- */
function observe(f){
  const o = { f, pts: [], depth: [], hand: null, phone: null, q: { pose: 0, hand: 0, phone: 0 } };
  if (!f.pose) return o;
  const add2 = (key, idx, w) => { const v = vis(f, idx); if (v >= .5) o.pts.push({ key, uv: uv(f, idx), w: w*Math.min(1, (v - .4)/.5) }); };
  add2('S', P.shR, 1.2); add2('SL', P.shL, 1.2); add2('hipR', P.hipR, .8); add2('hipL', P.hipL, .8); add2('E', P.elR, 1); add2('W', P.wrR, 1.2);
  o.q.pose = Math.min(vis(f, P.shR), vis(f, P.elR), vis(f, P.wrR));
  if (f.poseWorld){
    const z = i => f.poseWorld[i][2], wz = (i, j) => Math.min(vis(f, i), vis(f, j));
    // profondità relative (m, campo: z = Zc) dai punti mondo di MediaPipe: segno e ordine di grandezza, peso basso
    if (wz(P.elR, P.shR) >= .5) o.depth.push({ a: 'E', b: 'S', dz: z(P.elR) - z(P.shR), w: .25 });
    if (wz(P.wrR, P.shR) >= .5) o.depth.push({ a: 'W', b: 'S', dz: z(P.wrR) - z(P.shR), w: .25 });
    if (wz(P.shL, P.shR) >= .5) o.depth.push({ a: 'SL', b: 'S', dz: z(P.shL) - z(P.shR), w: .35 });
  }
  const h = rightHand(f);
  if (h && h.world && h.score >= .5){
    const w = h.world, v = (a, b) => norm(sub(w[a], w[b]));
    const F = v(9, 0), T = v(5, 17), N = norm(cross(T, F));   // dita (polso → nocca del medio), nocche (mignolo → indice), normale del palmo (destra)
    o.hand = { F: camToField(F), T: camToField(T), N: camToField(N), score: h.score, lm: h.lm };
    o.q.hand = h.score;
  }
  const ph = phoneOf(f);
  if (ph){ o.phone = { ang: ph.ang*D, ratio: ph.len2/Math.max(1, ph.len1), cx: ph.cx, cy: ph.cy, n: ph.n }; o.q.phone = Math.min(1, ph.n/400); }
  return o;
}

/* ---------- residui ---------- */
const LIM = JOINT_LIMITS;
function residuals(x, o, prev, opts){
  const ch = chainOf(x), r = [];
  for (const p of o.pts){ const u = project(ch[p.key]); r.push(p.w*(u[0] - p.uv[0]), p.w*(u[1] - p.uv[1])); }
  for (const d of o.depth) r.push(d.w*SC.scale*((ch[d.a][2] - ch[d.b][2]) - d.dz));
  if (o.hand){
    const wH = opts.wHand ?? 30, fingers = qrot(ch.hand, [0, -1, 0]), thumb = qrot(ch.hand, [1, 0, 0]), normal = qrot(ch.hand, [0, 0, -1]);
    for (let k = 0; k < 3; k++){ r.push(wH*(fingers[k] - o.hand.F[k])); r.push(wH*(thumb[k] - o.hand.T[k])); r.push(wH*(normal[k] - o.hand.N[k])); }
  }
  if (o.phone && opts.wPhone){
    const ph = phoneOf3(ch), a = project(add(ph.center, mul(ph.tip, PHONE.h/2))), b = project(sub(ph.center, mul(ph.tip, PHONE.h/2)));
    const am = Math.atan2(a[1] - b[1], a[0] - b[0]);
    r.push(opts.wPhone*Math.sin(am - o.phone.ang));          // asse lungo (senza verso)
    // centro della macchia ≈ centro dello schermo
    const c = project(ph.center); r.push(.3*(c[0] - o.phone.cx), .3*(c[1] - o.phone.cy));
  }
  // limiti articolari (penalità morbida fuori dai limiti) e continuità con il fotogramma precedente
  const { j } = unpack(x);
  for (const k of JOINTS){ const [lo, hi] = LIM[k], v = j[k], s = k === 'y' ? 300 : 3; r.push(v < lo ? s*(lo - v) : v > hi ? s*(v - hi) : 0); }
  // senza la mano vista, pronosupinazione e polso seguono il fotogramma precedente (interpolazione), non il rumore
  const HANDJ = new Set(['pro', 'fl', 'dv']);
  if (prev) for (let i = 0; i < NP; i++){ const w = i >= NJ || JOINTS[i] === 'y' ? 40 : !o.hand && HANDJ.has(JOINTS[i]) ? (opts.wHold ?? 1.2) : (opts.wSmooth ?? .12); r.push(w*(x[i] - prev[i])); }
  r.push(20*x[NJ + 1]);                                       // tz poco osservabile: resta vicino a 0
  return r;
}
const STEP = JOINTS.map(k => k === 'y' ? 1e-4 : 1e-2).concat([1e-4, 1e-4]);
function lm(x0, o, prev, opts, iters = 40){
  let x = x0.slice(), r = residuals(x, o, prev, opts), cost = dot(r, r), lambda = 1e-2;
  const m = r.length, J = Array.from({ length: m }, () => new Float64Array(NP));
  for (let it = 0; it < iters; it++){
    for (let p = 0; p < NP; p++){ const xp = x.slice(); xp[p] += STEP[p]; const rp = residuals(xp, o, prev, opts); for (let i = 0; i < m; i++) J[i][p] = (rp[i] - r[i])/STEP[p]; }
    const A = Array.from({ length: NP }, () => new Float64Array(NP + 1));
    for (let i = 0; i < m; i++) for (let a = 0; a < NP; a++){ const Jia = J[i][a]; if (!Jia) continue; for (let b = 0; b < NP; b++) A[a][b] += Jia*J[i][b]; A[a][NP] -= Jia*r[i]; }
    let improved = false;
    for (let tries = 0; tries < 6 && !improved; tries++){
      const M = A.map(row => Float64Array.from(row)); for (let a = 0; a < NP; a++) M[a][a] += lambda*(M[a][a] + 1e-6);
      // eliminazione di Gauss
      for (let c = 0; c < NP; c++){ let piv = c; for (let rI = c + 1; rI < NP; rI++) if (Math.abs(M[rI][c]) > Math.abs(M[piv][c])) piv = rI; [M[c], M[piv]] = [M[piv], M[c]];
        const pv = M[c][c] || 1e-12; for (let rI = c + 1; rI < NP; rI++){ const fct = M[rI][c]/pv; if (!fct) continue; for (let k = c; k <= NP; k++) M[rI][k] -= fct*M[c][k]; } }
      const dx = new Float64Array(NP); for (let c = NP - 1; c >= 0; c--){ let s = M[c][NP]; for (let k = c + 1; k < NP; k++) s -= M[c][k]*dx[k]; dx[c] = s/(M[c][c] || 1e-12); }
      const xn = x.map((v, i) => v + dx[i]), rn = residuals(xn, o, prev, opts), cn = dot(rn, rn);
      if (cn < cost){ x = xn; r = rn; const gain = cost - cn; cost = cn; lambda = Math.max(1e-6, lambda/3); improved = true; if (gain < 1e-6*cost) return { x, cost }; }
      else lambda *= 4;
    }
    if (!improved) break;
  }
  return { x, cost };
}
const restX = () => JOINTS.map(k => REST[k]).concat([0, 0]);
function fitFrame(o, prev, opts, starts){
  let best = null;
  for (const s of starts){ const r = lm(s, o, prev, opts); if (!best || r.cost < best.cost) best = r; }
  return best;
}
// tentativi per il primo fotogramma di un tratto: griglia su spalla e pronosupinazione
function gridStarts(){
  const out = [];
  for (const p of [-20, 40, 100]) for (const e of [15, 50, 90, 130]) for (const r of [-50, 0, 50]) for (const pro of [20, 90]){
    const x = restX(); x[IDX.p] = p; x[IDX.e] = e; x[IDX.r] = r; x[IDX.pro] = pro; x[IDX.b] = 60; out.push(x); }
  return out;
}
const perturb = prev => [prev, (() => { const x = prev.slice(); x[IDX.r] += 35; x[IDX.pro] -= 35; return x; })(), (() => { const x = prev.slice(); x[IDX.r] -= 35; x[IDX.pro] += 35; return x; })()];

/* ---------- tratti da ricostruire (s): istanti indicativi dell'utente, allargati ---------- */
const SEGMENTS = [
  { id: 'ready', label: 'Posizione di partenza (prima del dritto)', from: 7.5, to: 9.2, kind: 'still' },
  { id: 'forehand', label: 'Dritto', from: 8.8, to: 12.0, kind: 'stroke', expect: 'topspin di dritto' },
  { id: 'backhand', label: 'Rovescio a due mani', from: 14.4, to: 17.6, kind: 'stroke', expect: 'topspin di rovescio' },
  { id: 'serve1', label: 'Servizio (1ª ripetizione)', from: 17.4, to: 20.4, kind: 'serve' },
  { id: 'serve2', label: 'Servizio (2ª ripetizione)', from: 22.0, to: 25.2, kind: 'serve' },
  { id: 'serve3', label: 'Servizio (3ª ripetizione)', from: 26.9, to: 30.2, kind: 'serve' },
  { id: 'slices', label: 'Tagliati (dritto e rovescio)', from: 30.0, to: 38.6, kind: 'multi' },
];
const segArg = arg('segments', '');
const segs = segArg ? SEGMENTS.filter(s => segArg.split(',').includes(s.id)) : SEGMENTS;

/* ---------- ricostruzione di un tratto ---------- */
function reconstruct(seg, opts){
  const i0 = Math.round(seg.from*FPS), i1 = Math.round(seg.to*FPS), out = [];
  let prev = null;
  for (let i = i0; i <= i1; i++){
    const f = byI.get(i); if (!f) continue;
    const o = observe(f);
    const hasArm = o.pts.some(p => p.key === 'W') && o.pts.some(p => p.key === 'E');
    const starts = prev ? perturb(prev) : gridStarts();
    const res = fitFrame(o, prev, opts, starts);
    const x = res.x, ch = chainOf(x), ph = phoneOf3(ch);
    // errore di riproiezione (px, media sui punti usati)
    let err = 0, n = 0; for (const p of o.pts){ const u = project(ch[p.key]); err += Math.hypot(u[0] - p.uv[0], u[1] - p.uv[1]); n++; }
    out.push({ i, t: i/FPS, x, ch, ph, o, reproj: n ? err/n : null, interpolated: !hasArm });
    prev = x;
  }
  return out;
}
// lisciatura a fase nulla [1 2 1]/4 sugli angoli (gli spostamenti del bacino restano)
function smooth(samples){
  const xs = samples.map(s => s.x);
  return samples.map((s, k) => {
    const a = xs[Math.max(0, k - 1)], b = xs[k], c = xs[Math.min(xs.length - 1, k + 1)];
    const x = b.map((v, i) => i < NJ ? .25*a[i] + .5*v + .25*c[i] : v);
    const ch = chainOf(x); return { ...s, x, ch, ph: phoneOf3(ch) };
  });
}
// velocità della mano (polso, m/s) e del telefono (°/s) per differenze centrate
function kinematics(samples){
  for (let k = 0; k < samples.length; k++){
    const a = samples[Math.max(0, k - 1)], b = samples[Math.min(samples.length - 1, k + 1)], dt = (b.t - a.t) || 1/FPS;
    samples[k].vW = mul(sub(b.ch.W, a.ch.W), 1/dt); samples[k].speed = len(samples[k].vW);
    samples[k].omega = len(GP.omega(a.ph.q, b.ph.q, dt));
    // velocità 2D del polso misurata da Pose (px/s → m/s con la scala del corpo), indipendente dal modello
    const fa = byI.get(a.i), fb = byI.get(b.i);
    samples[k].speed2d = fa?.pose && fb?.pose && vis(fa, P.wrR) > .5 && vis(fb, P.wrR) > .5 ? Math.hypot(fb.pose[P.wrR][0] - fa.pose[P.wrR][0], fb.pose[P.wrR][1] - fa.pose[P.wrR][1])/dt/SC.scale : null;
    // per la segmentazione (istanti): la velocità 2D misurata, meno sensibile al tremolio della profondità; senza, la 3D
    samples[k].sSeg = samples[k].speed2d ?? samples[k].speed;
  }
  return samples;
}

/* ---------- segmentazione dei colpi ---------- */
// impatto = picco della velocità della mano; carica = minimo di velocità prima del picco (dopo il picco della
// preparazione); inizio = quando la mano comincia a muoversi; fine = quando torna lenta dopo l'impatto
function segmentStroke(samples, { from, to, peakMin = 1.5 } = {}){
  const inWin = samples.filter(s => s.t >= (from ?? -1) && s.t <= (to ?? 1e9));
  if (!inWin.length) return null;
  const pk = inWin.reduce((b, s) => s.sSeg > b.sSeg ? s : b, inWin[0]);
  if (pk.sSeg < peakMin) return null;
  const k = samples.indexOf(pk);
  const thrLow = Math.max(.35, .12*pk.sSeg);
  let kLoad = k; for (let q = k - 1; q >= 0 && samples[q].t >= (from ?? -1); q--){ if (samples[q].sSeg < samples[kLoad].sSeg) kLoad = q; else if (samples[kLoad].sSeg < .45*pk.sSeg && samples[q].sSeg > samples[kLoad].sSeg + .5) break; }
  let kStart = kLoad; for (let q = kLoad; q >= 0 && samples[q].t >= (from ?? -1) - .2; q--){ if (samples[q].sSeg < thrLow){ kStart = q; break; } kStart = q; }
  let kEnd = k; for (let q = k + 1; q < samples.length && samples[q].t <= (to ?? 1e9) + .2; q++){ kEnd = q; if (samples[q].sSeg < thrLow) break; }
  return { start: samples[kStart], load: samples[kLoad], impact: pk, end: samples[kEnd] };
}

/* ---------- misure ---------- */
const deg = v => Math.round(v*10)/10;
const hAngle = v => Math.atan2(-v[2], v[0])/D;               // angolo nel piano orizzontale (0 = +x, 90 = verso la rete −z)
const elev = v => Math.asin(Math.max(-1, Math.min(1, v[1]/(len(v) || 1))))/D;
function measures(seg, k){
  if (!k) return null;
  const { start, load, impact, end } = k, jl = load.ch.j, ji = impact.ch.j, je = end.ch.j;
  const arm = s => sub(s.ch.W, s.ch.S);
  const sweep = hAngle(arm(end)) - hAngle(arm(load));
  return {
    tempi: { inizio: r3(start.t), carica: r3(load.t), impatto: r3(impact.t), fine: r3(end.t), carica_s: r3(load.t - start.t), colpo_s: r3(impact.t - load.t), accompagnamento_s: r3(end.t - impact.t) },
    velocita_mano_impatto_ms: r2(impact.speed), velocita_mano_impatto_2d_ms: impact.speed2d != null ? r2(impact.speed2d) : null,
    rotazione_telefono_picco_gs: Math.round(Math.max(...[load, impact, end].map(s => s.omega))),
    arco_orizzontale_spalla_mano_deg: deg(sweep),
    busto_tau_deg: { carica: deg(jl.tau), impatto: deg(ji.tau), fine: deg(je.tau) },
    gomito_flessione_deg: { carica: deg(jl.b), impatto: deg(ji.b), fine: deg(je.b) },
    elevazione_omero_deg: { carica: deg(jl.e), impatto: deg(ji.e), fine: deg(je.e) },
    altezza_mano_m: { carica: r3(load.ch.W[1]), impatto: r3(impact.ch.W[1]), fine: r3(end.ch.W[1]) },
    mano_campo_m: { carica: load.ch.W.map(r3), impatto: impact.ch.W.map(r3), fine: end.ch.W.map(r3) },
    direzione_mano_impatto: { angolo_dalla_rete_deg: deg(Math.acos(Math.max(-1, Math.min(1, dot(norm(impact.vW), [0, 0, -1]))))/D), salita: r2(norm(impact.vW)[1]) },
    telefono: ['carica', 'impatto', 'fine'].reduce((acc, name, idx) => { const s = [load, impact, end][idx]; acc[name] = { cima_elevazione_deg: deg(elev(s.ph.tip)), cima_azimut_deg: deg(hAngle(s.ph.tip)), schermo_verso_rete: r2(-s.ph.screen[2]), schermo_verso_alto: r2(s.ph.screen[1]) }; return acc; }, {}),
    qualita: { riproiezione_px: r2([start, load, impact, end].reduce((a, s) => a + (s.reproj || 0), 0)/4), telefono_visto: [load, impact, end].filter(s => s.o.phone).length + '/3', mano_vista: [load, impact, end].filter(s => s.o.hand).length + '/3' },
  };
}
function sampleOut(s){
  return { i: s.i, t: r4(s.t), j: Object.fromEntries(JOINTS.map((k, idx) => [k, k === 'y' ? r4(s.x[idx]) : deg(s.x[idx])])), bacino_dx_dz: [r3(s.x[NJ]), r3(s.x[NJ + 1])],
    S: s.ch.S.map(r3), E: s.ch.E.map(r3), W: s.ch.W.map(r3), telefono: { centro: s.ph.center.map(r3), cima: s.ph.tip.map(r3), schermo: s.ph.screen.map(r3) },
    busto: { bacino: s.ch.pelvis.map(r3), spalla_sx: s.ch.SL.map(r3), collo: s.ch.neck.map(r3), testa: s.ch.head.map(r3) },
    velocita_mano_ms: r2(s.speed), velocita_mano_2d_ms: s.speed2d != null ? r2(s.speed2d) : null, omega_gs: Math.round(s.omega),
    qualita: { posa: r2(s.o.q.pose), mano: r2(s.o.q.hand), telefono: r2(s.o.q.phone), riproiezione_px: s.reproj != null ? r2(s.reproj) : null, interpolato: s.interpolated || undefined } };
}

/* ---------- presa: raffinamento dell'orientamento del telefono nella mano sulle macchie dello schermo ---------- */
function refineGrip(samplesAll){
  const used = samplesAll.filter(s => s.o.phone && s.o.hand && !s.interpolated);
  if (used.length < 8) return { eul: [0, 0, 0], n: used.length, resid: null };
  const cost = eul => { const G = gripWith(eul); let c = 0;
    for (const s of used){ const ph = phoneOf3(s.ch, G), a = project(add(ph.center, mul(ph.tip, PHONE.h/2))), b = project(sub(ph.center, mul(ph.tip, PHONE.h/2)));
      const am = Math.atan2(a[1] - b[1], a[0] - b[0]); c += Math.sin(am - s.o.phone.ang)**2; } return c/used.length; };
  let best = { eul: [0, 0, 0], c: cost([0, 0, 0]) };
  for (const a of [-40, -20, 0, 20, 40]) for (const b of [-40, -20, 0, 20, 40]) for (const c of [-60, -40, -20, 0, 20, 40, 60]){ const v = cost([a, b, c]); if (v < best.c) best = { eul: [a, b, c], c: v }; }
  // raffinamento locale a passi di 5°
  for (let step = 10; step >= 2.5; step /= 2) for (let it = 0; it < 20; it++){ let moved = false;
    for (let k = 0; k < 3; k++) for (const sgn of [-1, 1]){ const e = best.eul.slice(); e[k] += sgn*step; const v = cost(e); if (v < best.c){ best = { eul: e, c: v }; moved = true; } }
    if (!moved) break; }
  return { eul: best.eul, n: used.length, resid: Math.asin(Math.sqrt(best.c))/D, resid0: Math.asin(Math.sqrt(cost([0, 0, 0])))/D };
}

/* ---------- esecuzione ---------- */
console.error(`fotogrammi ${frames.length}, scala ${SC.scale?.toFixed(1)} px/m (n=${SC.n}, p10 ${SC.p10?.toFixed(1)}, p90 ${SC.p90?.toFixed(1)}), f ${F_PX} px → distanza camera–bacino ${DIST.toFixed(2)} m, camera ${CAM.yc.toFixed(2)} m sopra le anche, ${CAM.xc.toFixed(2)} m di lato (n=${CAM.n})`);
const optsA = { wHand: 30, wPhone: 0, wSmooth: .12 };
let recon = {};
for (const seg of segs){ const t0 = Date.now(); recon[seg.id] = reconstruct(seg, optsA); console.error(`${seg.id}: ${recon[seg.id].length} fotogrammi in ${((Date.now() - t0)/1000).toFixed(1)} s`); }
// presa misurata sulle macchie, poi seconda passata con il vincolo del telefono
const gripMode = arg('grip', 'auto');
let gripInfo = { eul: [0, 0, 0], n: 0 };
if (gripMode === 'auto'){
  gripInfo = refineGrip(Object.values(recon).flat());
  gripEuler = gripInfo.eul; gripQ = gripWith(gripEuler);
  console.error(`presa: Euler ${gripEuler.map(deg).join(', ')}° su ${gripInfo.n} fotogrammi, errore d'asse ${gripInfo.resid?.toFixed(1)}° (prima ${gripInfo.resid0?.toFixed(1)}°)`);
  const optsB = { wHand: 30, wPhone: 25, wSmooth: .12 };
  for (const seg of segs){ const t0 = Date.now(); recon[seg.id] = reconstruct(seg, optsB); console.error(`${seg.id} (2ª passata): ${((Date.now() - t0)/1000).toFixed(1)} s`); }
}
for (const id in recon) recon[id] = kinematics(smooth(recon[id]));

// colpi
const strokes = [];
const pushStroke = (id, label, expect, samples, k, extra = {}) => { if (!k){ strokes.push({ id, label, expect, errore: 'nessun picco di velocità trovato' }); return; }
  const m = measures(null, k);
  strokes.push({ id, label, expect, finestra_s: [r3(samples[0].t), r3(samples[samples.length - 1].t)], tempi: m.tempi, misure: m, ...extra,
    pose_chiave: { carica: sampleOut(k.load), impatto: sampleOut(k.impact), fine: sampleOut(k.end) },
    campioni: samples.filter(s => s.t >= Math.min(k.start.t - .2, extra.lancio ? extra.lancio.t_picco_mano_sinistra - .4 : 1e9) && s.t <= k.end.t + .3).map(sampleOut) }); };

for (const seg of segs){
  const S = recon[seg.id];
  if (seg.kind === 'still'){
    const mid = S[Math.floor(S.length/2)];
    strokes.push({ id: seg.id, label: seg.label, finestra_s: [seg.from, seg.to], posa: sampleOut(mid), media_angoli: Object.fromEntries(JOINTS.map((k, idx) => [k, k === 'y' ? r4(S.reduce((a, s) => a + s.x[idx], 0)/S.length) : deg(S.reduce((a, s) => a + s.x[idx], 0)/S.length)])),
      velocita_mano_max_ms: r2(Math.max(...S.map(s => s.speed))), campioni: S.filter((_, q) => q % 5 === 0).map(sampleOut) });
  } else if (seg.kind === 'stroke'){
    pushStroke(seg.id, seg.label, seg.expect, S, segmentStroke(S, { from: seg.from + .2, to: seg.to - .1 }));
  } else if (seg.kind === 'serve'){
    // lancio: picco della velocità 2D del polso SINISTRO (palla immaginaria); battuta: picco della mano destra dopo il lancio
    const left = S.map(s => { const f = byI.get(s.i), a = byI.get(s.i - 1), b = byI.get(s.i + 1);
      const ok = a?.pose && b?.pose && vis(a, P.wrL) > .5 && vis(b, P.wrL) > .5;
      return { t: s.t, i: s.i, v: ok ? Math.hypot(b.pose[P.wrL][0] - a.pose[P.wrL][0], b.pose[P.wrL][1] - a.pose[P.wrL][1])*FPS/2/SC.scale : 0, y: f?.pose ? f.pose[P.wrL][1] : null }; });
    // il lancio: il polso sinistro sale (y immagine cala) con velocità; prendiamo il picco di velocità nella metà iniziale della finestra
    const half = S[Math.floor(S.length*.55)].t;
    const toss = left.filter(l => l.t < half).reduce((b, l) => l.v > b.v ? l : b, left[0]);
    const k = segmentStroke(S, { from: toss.t + .15, to: seg.to - .1 });
    const tossTop = left.filter(l => l.y != null && l.t >= toss.t && l.t <= (k?.impact.t ?? seg.to)).reduce((b, l) => l.y < b.y ? l : b, { y: 1e9 });
    pushStroke(seg.id, seg.label, 'lancio + battuta', S, k, { lancio: { t_picco_mano_sinistra: r3(toss.t), velocita_ms: r2(toss.v), t_mano_sinistra_piu_alta: tossTop.t != null ? r3(tossTop.t) : null, battuta_dopo_lancio_s: k ? r3(k.impact.t - toss.t) : null } });
  } else if (seg.kind === 'multi'){
    // tagliati: tutti i picchi di velocità separati di almeno 1,2 s
    let rest = S.slice(), n = 0;
    const found = [];
    while (n < 6){ const k = segmentStroke(rest, { peakMin: 2.0 }); if (!k) break; found.push(k); rest = rest.filter(s => Math.abs(s.t - k.impact.t) > 1.2); n++; }
    found.sort((a, b) => a.impact.t - b.impact.t);
    found.forEach((k, idx) => {
      // dritto o rovescio dal verso dell'arco: la mano va verso −x (sinistra di chi gioca) nel tagliato di dritto
      const side = k.impact.vW[0] < 0 ? 'dritto' : 'rovescio';
      pushStroke(`slice${idx + 1}`, `Tagliato ${idx + 1} (${side})`, 'slice', S, k, { lato: side });
    });
  }
}

const out = {
  fonte: { video: 'gesti-video.mp4 dell’utente (08/11/2026), 1080×1920, 30 fps, 42,7 s; fotogrammi a 540×960', mano: 'destra (il video non è specchiato: le scritte del fondo si leggono dritte; la destra di chi gioca è a sinistra nel quadro)' },
  metodo: {
    tracciamento: 'MediaPipe Pose (modello heavy) e Hands (full) dal repository, in Chromium headless un fotogramma alla volta (scripts/video/estrai-posa.mjs); schermo del telefono come macchia blu vicino al polso destro',
    ricostruzione: 'catena del gioco (natpf_gesture_pose.armChain: busto tau/lat, spalla p/e/r, gomito b, pronosupinazione pro, polso fl/dv; omero 0,30 m, avambraccio 0,262 m) + spostamento del bacino (tx, tz), adattata per minimi quadrati (Levenberg–Marquardt) ai punti 2D (spalle, anche, gomito e polso destro), alle profondità relative dei punti mondo di MediaPipe (peso basso: segno e ordine di grandezza), agli assi della mano di Hands e all’asse lungo dello schermo; lisciatura [1 2 1]/4',
    camera: { f_px: F_PX, f_nota: 'ipotesi (26 mm equivalenti a 540×960), non misurata', scala_px_m: r2(SC.scale), scala_n: SC.n, distanza_m: r2(DIST), offset_m: { x: r3(CAM.xc), y: r3(CAM.yc), n: CAM.n }, anche_y_m: HIP_Y, immagine: [W, H], bacino_modello_y: BODY.pelvis[1], nota: 'scala = distanza tra le spalle in pixel / nel mondo MediaPipe, mediana sui fotogrammi frontali' },
    presa: { modello: 'telefono in piedi nel pugno, schermo in avanti (upright); raffinata sui fotogrammi con schermo e mano visti', euler_xyz_deg: gripEuler.map(deg), fotogrammi: gripInfo.n, errore_asse_deg: gripInfo.resid != null ? deg(gripInfo.resid) : null, errore_asse_prima_deg: gripInfo.resid0 != null ? deg(gripInfo.resid0) : null },
    convenzioni: 'campo del gioco: x a destra di chi gioca, y in alto, −z verso lo schermo; angoli in gradi (JOINTS di natpf_gesture_pose.js, assoluti come REST e CHOREO); tempi in secondi dall’inizio del video; velocità della mano = polso della catena (m/s), 2D = polso di Pose convertito con la scala del corpo',
  },
  colpi: strokes,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.error('scritto', OUT, strokes.map(s => `${s.id}${s.errore ? '!' : ''}`).join(' '));
