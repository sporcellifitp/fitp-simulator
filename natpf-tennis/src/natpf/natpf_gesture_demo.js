// Dimostrazione dei gesti del tutorial (B9, ramo C): disegno illustrato 2,5D in Canvas 2D di avambraccio, mano e
// telefono (162 × 79 × 8,6 mm, Android grande) con gli strati didattici: freccia del verso, scia della cima, fantasmi a
// contorno delle pose chiave, palla, lampo all'impatto, fase scritta e curva della velocità di rotazione con il picco =
// impatto (docs/b9/giudizio-animazione.md §5, nota docs/b9/animazione-c.md).
//
// La posa si legge SOLO da natpf_gesture_pose.gesturePose (la stessa che test/natpf-gesture-pose e
// test/natpf-gesture-anim fanno leggere al telefono simulato completo): il disegno non aggiunge moto. demo.pose(t)
// restituisce proprio quella posa. Il mancino è lo specchio esatto (la posa del mancino ridisegnata nello specchio della
// camera: la scritta dello schermo del telefono resta leggibile). Presa GRIP_STYLE (nel palmo; rollback «martello»).
//
//   const demo = new NatpfGestureDemo({ width: 240, height: 240 });
//   demo.mount(el); demo.play('forehand', { hand: 'right', speed: 'auto' });  ...  demo.stop()
//
// speed: un numero (1 tempo reale, 0,5 rallentato) o 'auto' (primo ciclo a tempo reale, poi ×0,5 «Rallentato» e tempo
// reale alternati, brief §5.4). Niente WebGL: più istanze insieme (una per metà dello stesso schermo, getGestureDemo(key));
// sotto i 320 px di larghezza la modalità compatta (solo mano, telefono, scia, freccia e palla). Senza canvas 2D (Node,
// test) available è false e chi la usa mostra la figura statica della presa. Si disegna solo quando il canvas si vede.
import { GESTURES, GRIP_STYLE } from './natpf_gesture_motion.js';
import { gesturePose, gesturePlan, gestureBall, gestureContactPoint, CAMERAS, HAND, HAND_LOCAL, ARM, FOREARM_PROFILE, BAND,
  PHONE, BALL_R, add, sub, mul, dot, cross, len, norm, qrot, rotateAbout, mirrorPos, mirrorQ, D } from './natpf_gesture_pose.js';

export const COMPACT_W = 320;                 // px CSS: sotto, modalità compatta
export const MAX_DPR = 2;
export const MAX_PIXELS = 2.4e6;              // pixel del canvas al massimo (4K: densità ridotta)
export const SLOW = .5;                       // rallentato della modalità 'auto'
export const FOREARM_SHOWN = Object.freeze({ from: .42, to: .8 });   // l'avambraccio sfuma tra queste frazioni (mai il gomito)
const HUD_H = .2;                             // banda bassa della curva (frazione dell'altezza dello stadio)
// palla anche qualche ms prima del contatto nell'inquadratura (s; quanto basta perché resti fuori ≤ 100 ms e il telefono
// resti ≥ 60 px a 448×280)
const BALL_EARLY = Object.freeze({ forehand: .035, backhand: .035, line: .035, drop: .035, slice: .035, lob: .035, volley: .02 });
const STEP = 1/120;                           // passo delle tabelle del moto (s)
const HW = PHONE.w/2, HH = PHONE.h/2, HD = PHONE.d/2, SHOULDER_X = .19;

/* ---------- colori e luce dipinta (brief §5.2) ---------- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, u) => [a[0] + (b[0] - a[0])*u, a[1] + (b[1] - a[1])*u, a[2] + (b[2] - a[2])*u];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a)/(b - a))); return t*t*(3 - 2*t); };
const LINE = hex('#2a1812'), LINE_A = .8;
export const SKIN = Object.freeze({ shadow: '#b8714f', base: '#e9a77f', light: '#f6c9a6', high: '#ffe6d2' });
export const BG = Object.freeze({ center: '#2c4590', mid: '#16275e', edge: '#0a1334' });
const MAT = {
  skin: { shadow: hex(SKIN.shadow), base: hex(SKIN.base), light: hex(SKIN.light), high: hex(SKIN.high), rim: hex('#b9cdf5') },
  band: { shadow: hex('#a3abc4'), base: hex('#eceff6'), light: hex('#fafbff'), high: hex('#ffffff'), rim: hex('#c8d6ff') },
  nail: { shadow: hex('#dba595'), base: hex('#f5cfc2'), light: hex('#ffe6de'), high: hex('#fff6f2'), rim: hex('#ffffff') },
};
const BALL = hex('#e3ff36'), WHITE = [255, 255, 255], BLUE = '#2f6bff';
// luce nello spazio dello schermo (x a destra, y in basso, z verso chi guarda): dall'alto a sinistra, davanti
const LIGHT = norm([-.5, -.68, .54]);
function ramp(m, b){
  let c = mix(m.shadow, m.base, sstep(-.05, .2, b));
  c = mix(c, m.light, sstep(.5, .7, b));
  return mix(c, m.high, sstep(.88, .98, b)*.7);
}

/* ---------- mani: presa nel palmo (natpf_gesture_pose HAND) e a martello (rollback) ---------- */
const mm = v => v.map(x => x/1000);
function fingerChain(f, palmN){
  const d0 = norm(f.dir), k = norm(cross(d0, palmN)), pts = [f.mcp.slice()];
  let ang = 0, p = f.mcp.slice();
  for (let i = 0; i < 3; i++){ ang += f.flex[i]*D; p = add(p, mul(rotateAbout(d0, k, ang), f.L[i])); pts.push(p); }
  return pts;
}
// Impugnatura a martello (GRIP_STYLE 'martello'): il pugno stringe il terzo inferiore, il dorso del telefono nel palmo, le
// dita attorno al bordo sinistro fin sul vetro della parte bassa, il pollice chiuso sul bordo destro; l'avambraccio
// prosegue la mano (polso dritto). Stesso formato di HAND (mm, riferimento del telefono).
export const HAND_MARTELLO = Object.freeze({
  wrist: [30, -112, -30], wristR: [27, 19],
  heel: [[28, -92, -24, 21], [0, -96, -24, 19], [12, -66, -25, 23]],
  fingers: [
    { name: 'index', mcp: [-12, -30, -20], dir: [-1, .08, 0], L: [40, 23, 18], flex: [20, 88, 70], r: [9.2, 8.2, 7.4, 6.6] },
    { name: 'middle', mcp: [-8, -50, -21], dir: [-1, 0, 0], L: [44, 25, 19], flex: [20, 88, 70], r: [9.6, 8.6, 7.7, 6.9] },
    { name: 'ring', mcp: [-10, -69, -20], dir: [-1, -.06, 0], L: [41, 24, 18], flex: [20, 88, 70], r: [9.0, 8.0, 7.3, 6.6] },
    { name: 'pinky', mcp: [-15, -86, -18], dir: [-1, -.14, 0], L: [33, 19, 16], flex: [20, 90, 70], r: [8.1, 7.2, 6.6, 6.0] },
  ],
  palmN: [0, 0, 1],
  thumb: { pts: [[30, -90, -20], [46, -60, -8], [44, -36, 6], [28, -24, 9]], r: [15, 11.4, 10.2, 9.0] },
  forearmDir: [.36, -.88, -.3],
});
function localHand(H){
  return { def: H, wrist: mm(H.wrist), wristR: H.wristR.map(x => x/1000),
    heel: H.heel.map(h => ({ p: mm(h.slice(0, 3)), r: h[3]/1000 })),
    fingers: H.fingers.map(f => ({ name: f.name, pts: fingerChain(f, H.palmN).map(mm), r: f.r.map(x => x/1000) })),
    thumb: { pts: H.thumb.pts.map(mm), r: H.thumb.r.map(x => x/1000) }, forearmDir: norm(H.forearmDir) };
}
const HANDS = { palmo: { ...HAND_LOCAL, def: HAND }, martello: localHand(HAND_MARTELLO) };
export const handFor = (style = GRIP_STYLE) => HANDS[style] || HANDS.palmo;
// scheletro della mano nel campo per una posa (destra) del telefono: con la presa nel palmo è gestureRig
// (natpf_gesture_pose) punto per punto (test/natpf-gesture-anim)
export function handRig(pose, H = handFor()){
  const T = v => add(pose.pos, qrot(pose.q, v));
  const W = T(H.wrist), F = qrot(pose.q, H.forearmDir);
  return { W, F, E: add(W, mul(F, ARM.fore)), T,
    heel: H.heel.map(h => ({ p: T(h.p), r: h.r })),
    fingers: H.fingers.map(f => ({ name: f.name, pts: f.pts.map(T), r: f.r })),
    thumb: { pts: H.thumb.pts.map(T), r: H.thumb.r } };
}

/* ---------- camera prospettica ---------- */
function makeCam(eye, target, f, cx, cy, mirror, W){
  const fw = norm(sub(target, eye)), r = norm(cross(fw, [0, 1, 0])), u = cross(r, fw);
  const cam = { eye, target, fw, r, u, f, cx, cy, mirror, W };
  cam.depth = P => dot(sub(P, eye), fw);
  cam.p = P => {
    const d = sub(P, eye), z = Math.max(.02, dot(d, fw)), x = cx + f*dot(d, r)/z;
    return { x: mirror ? W - x : x, y: cy - f*dot(d, u)/z, z };
  };
  cam.rad = (P, rr) => cam.f*rr/Math.max(.02, cam.depth(P));
  return cam;
}
// inquadratura: la camera guarda il centro dei punti da `dir` alla distanza data; focale e centro perché tutto stia nel
// riquadro utile (composizione uguale per ogni gesto e ogni schermo)
function frame(points, dir, dist, box){
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let i = 0; i < 3; i++){ lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
  const target = mul(add(lo, hi), .5), eye = add(target, mul(norm(dir), dist));
  const c0 = makeCam(eye, target, 1, 0, 0, false, 0);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of points){ const q = c0.p(p); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
  const f = Math.min(box.w/Math.max(1e-6, x1 - x0), box.h/Math.max(1e-6, y1 - y0));
  return { eye, target, f, cx: box.x + box.w/2 - f*(x0 + x1)/2, cy: box.y + box.h/2 - f*(y0 + y1)/2, box };
}

/* ---------- tabelle del moto (mano destra, presa GRIP_STYLE), calcolate una volta per gesto ---------- */
const tipOf = (pose, k = 1) => add(pose.pos, qrot(pose.q, [0, HH*k, 0]));
const TABLES = new Map();
export function motion(id, grip = GRIP_STYLE){
  const tk = id + '|' + grip;
  if (TABLES.has(tk)) return TABLES.get(tk);
  const H = handFor(grip), P = gesturePlan(id, { grip }), n = Math.max(1, Math.ceil(P.total/STEP)), tip = [], mid = [], speed = new Float32Array(n + 1), pts = [];
  for (let i = 0; i <= n; i++){
    const t = Math.min(P.total, i*STEP), p = gesturePose(id, t, { grip });
    tip.push(tipOf(p, 1)); mid.push(tipOf(p, .35)); speed[i] = p.speed;
    if (i % 4 === 0 || P.still){
      const r = handRig(p, H);
      for (const v of [[-HW, HH, 0], [HW, HH, 0], [-HW, -HH, 0], [HW, -HH, 0]]) pts.push(r.T(v));
      pts.push(r.W);
      for (const f of r.fingers) pts.push(f.pts[3]);
      if (P.still) break;
    }
  }
  // la palla vicino al contatto (−25…+20 ms) resta nel riquadro utile: entro ±50 ms resta nello stadio (brief §4)
  if (!P.still) for (const dt of (BALL_EARLY[id] ? [-BALL_EARLY[id], 0] : [0])){ const b = gestureBall(id, P.contact + dt, { grip }); if (b) pts.push(b); }
  let max = 0, at = 0; for (let i = 0; i <= n; i++) if (speed[i] > max){ max = speed[i]; at = i; }
  const T = { P, n, tip, mid, speed, pts, peak: max, peakI: at };
  // arco della freccia del verso: cima un poco oltre il telefono nella parte veloce (servizio: lancio e battuta)
  const segs = P.kind === 'serve' ? [[P.T.load, P.T.tossEnd], [P.T.hitStart, P.T.end]] : P.kind === 'stroke' ? [[P.T.inv, P.T.end]] : [];
  T.arrows = segs.map(([a, b]) => ({ t0: a, t1: b, pts: Array.from({ length: 33 }, (_, i) => tipOf(gesturePose(id, a + (b - a)*i/32, { grip }), 1.36)) }));
  T.keys = P.keys;
  TABLES.set(tk, T);
  return T;
}
const wrapT = (P, t) => ((t % P.total) + P.total) % P.total;
function sampleAt(arr, T, t){
  const x = wrapT(T.P, t)/STEP, i = Math.min(T.n - 1, Math.floor(x)), u = Math.min(1, x - i), a = arr[i], b = arr[i + 1];
  return typeof a === 'number' ? a + (b - a)*u : [a[0] + (b[0] - a[0])*u, a[1] + (b[1] - a[1])*u, a[2] + (b[2] - a[2])*u];
}

/* ---------- camere per scheda (brief §5.3; dati in natpf_gesture_pose.CAMERAS) ---------- */
// riquadro utile dello stadio per l'inquadratura: sopra la banda della curva; compatto: quasi tutto
export function stageBox(id, W, H){
  if (W < COMPACT_W) return { x: W*.1, y: H*.1, w: W*.8, h: H*.8 };
  if (id === 'grip') return { x: W*.24, y: H*.1, w: W*.52, h: H*.74 };
  return { x: W*.07, y: H*.05, w: W*.86, h: H*(1 - HUD_H - .08) };
}
// camera della scheda all'istante t per uno stadio W×H (px CSS); il mancino è lo specchio della camera del destro (si
// disegna la posa del destro specchiata: la scritta dello schermo del telefono resta dritta)
export function cameraAt(id, t, { W, H, hand = 'right', grip = GRIP_STYLE, cache = null } = {}){
  const mirror = hand === 'left', C = CAMERAS[id] || CAMERAS.ready, box = stageBox(id, W, H);
  const key = `${id}|${grip}|${W}x${H}`, M = motion(id, grip);
  if (C.views){
    // presa: due viste ferme e il giro della CAMERA tra le due (la mano resta ferma)
    const fr = cache?.get(key) || C.views.map(v => frame(M.pts, v, C.dist, box));
    cache?.set(key, fr);
    const [h1, turn, h2] = C.seq, P = h1 + turn + h2 + C.seq[3], u = ((t % P) + P) % P;
    const a = u < h1 ? 0 : u < h1 + turn ? sstep(h1, h1 + turn, u) : u < h1 + turn + h2 ? 1 : 1 - sstep(h1 + turn + h2, P, u);
    const A = fr[0], B = fr[1];
    const dA = norm(sub(A.eye, A.target)), dB = norm(sub(B.eye, B.target)), ang = Math.acos(Math.max(-1, Math.min(1, dot(dA, dB))));
    const d = ang < 1e-4 ? dA : norm(add(mul(dA, Math.sin((1 - a)*ang)), mul(dB, Math.sin(a*ang)))), target = add(mul(A.target, 1 - a), mul(B.target, a));
    const dist = len(sub(A.eye, A.target))*(1 - a) + len(sub(B.eye, B.target))*a;
    const cam = makeCam(add(target, mul(d, dist)), target, A.f*(1 - a) + B.f*a, A.cx*(1 - a) + B.cx*a, A.cy*(1 - a) + B.cy*a, mirror, W);
    cam.view = a; return cam;
  }
  let fr = cache?.get(key);
  if (!fr){ fr = frame(M.pts, C.dir, C.dist, box); cache?.set(key, fr); }
  if (!C.follow) return makeCam(fr.eye, fr.target, fr.f, fr.cx, fr.cy, mirror, W);
  // servizio e schiacciata: la camera segue la mano (media pesata su ±window), a metà tra il centro dell'arco e la mano
  const fo = C.follow, n = 16, Dd = len(sub(fr.eye, fr.target)), dir = norm(sub(fr.eye, fr.target));
  let m = [0, 0, 0], ws = 0;
  for (let i = 0; i <= n; i++){
    const w = Math.sin(Math.PI*(i + .5)/(n + 1)), tt = t + (i/n - .5)*2*fo.window;
    m = add(m, mul(add(sampleAt(M.tip, M, tt), sampleAt(M.mid, M, tt)), .5*w)); ws += w;
  }
  const target = add(mul(fr.target, 1 - fo.mix), mul(m, fo.mix/ws));
  const f = Math.max(fr.f, box.h*Dd/fo.size);
  return makeCam(add(target, mul(dir, Dd)), target, f, box.x + box.w/2, box.y + box.h*.5, mirror, W);
}

/* ---------- forme ---------- */
function capsulePath(c, a, b, ra, rb){
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  if (L < 1e-3 || L <= Math.abs(ra - rb) + 1e-3){ const big = ra >= rb ? a : b, r = Math.max(ra, rb); c.moveTo(big.x + r, big.y); c.arc(big.x, big.y, r, 0, 2*Math.PI); return; }
  const ang = Math.atan2(dy, dx), s = Math.asin((ra - rb)/L), t1 = ang + Math.PI/2 + s, t2 = ang + 3*Math.PI/2 - s;
  c.moveTo(a.x + ra*Math.cos(t1), a.y + ra*Math.sin(t1));
  c.arc(a.x, a.y, ra, t1, t2);
  c.lineTo(b.x + rb*Math.cos(t2), b.y + rb*Math.sin(t2));
  c.arc(b.x, b.y, rb, t2 - 2*Math.PI, t1);
  c.closePath();
}
// sfumatura di un cilindro visto dalla camera: luce dipinta lungo la sezione + luce di contorno fredda dal lato in ombra
function tubeGrad(c, a, b, R, m){
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy/l, ny = dx/l, mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
  const g = c.createLinearGradient(mx + nx*R, my + ny*R, mx - nx*R, my - ny*R), lp = Math.hypot(LIGHT[0], LIGHT[1]);
  for (let i = 0; i <= 6; i++){
    const s = 1 - i/3, nz = Math.sqrt(Math.max(0, 1 - s*s)), side = (nx*s*LIGHT[0] + ny*s*LIGHT[1]);
    let col = ramp(m, side + nz*LIGHT[2]);
    col = mix(col, m.rim, sstep(.75, .98, Math.abs(s))*sstep(0, .5, -side/lp)*.45);
    g.addColorStop(i/6, css(col));
  }
  return g;
}
function cross2(o, a, b){ return (a.x - o.x)*(b.y - o.y) - (a.y - o.y)*(b.x - o.x); }
function hull(pts){
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y), lo = [], up = [];
  for (const q of p){ while (lo.length >= 2 && cross2(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--){ const q = p[i]; while (up.length >= 2 && cross2(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function smoothPath(c, P, grow = 0){
  let cx = 0, cy = 0; for (const p of P){ cx += p.x; cy += p.y; } cx /= P.length; cy /= P.length;
  const Q = P.map(p => { const dx = p.x - cx, dy = p.y - cy, l = Math.hypot(dx, dy) || 1; return { x: p.x + dx/l*grow, y: p.y + dy/l*grow }; });
  const midp = (a, b) => ({ x: (a.x + b.x)/2, y: (a.y + b.y)/2 }), n = Q.length;
  const m0 = midp(Q[n - 1], Q[0]); c.moveTo(m0.x, m0.y);
  for (let i = 0; i < n; i++){ const m = midp(Q[i], Q[(i + 1)%n]); c.quadraticCurveTo(Q[i].x, Q[i].y, m.x, m.y); }
  c.closePath();
}
const circlePts = (o, r, n = 14) => Array.from({ length: n }, (_, i) => ({ x: o.x + r*Math.cos(i/n*2*Math.PI), y: o.y + r*Math.sin(i/n*2*Math.PI) }));
const polyPath = (c, P) => { c.moveTo(P[0].x, P[0].y); for (let i = 1; i < P.length; i++) c.lineTo(P[i].x, P[i].y); c.closePath(); };
function bbox(P){ let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of P){ x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); } return { x0, y0, x1, y1 }; }
function rrectLocal(inset = 0){
  const w = HW - inset, h = HH - inset, r = Math.max(.0015, PHONE.r - inset), out = [];
  for (const [cx, cy, a0] of [[w - r, h - r, 0], [-w + r, h - r, 90], [-w + r, -h + r, 180], [w - r, -h + r, 270]])
    for (let i = 0; i <= 5; i++){ const a = (a0 + i*18)*D; out.push([cx + r*Math.cos(a), cy + r*Math.sin(a)]); }
  return out;
}
function rrectAt(cx, cy, w, h, r){
  const out = [];
  for (const [x, y, a0] of [[cx + w/2 - r, cy + h/2 - r, 0], [cx - w/2 + r, cy + h/2 - r, 90], [cx - w/2 + r, cy - h/2 + r, 180], [cx + w/2 - r, cy - h/2 + r, 270]])
    for (let i = 0; i <= 4; i++){ const a = (a0 + i*22.5)*D; out.push([x + r*Math.cos(a), y + r*Math.sin(a)]); }
  return out;
}
const RR = rrectLocal(), RR_SCREEN = rrectLocal(.0021), CAM_MOD = rrectAt(.021, .058, .019, .045, .007);
const rotLocal = (v, k, ang) => { const c = Math.cos(ang), s = Math.sin(ang), d = dot(k, v), x = cross(k, v); return [v[0]*c + x[0]*s + k[0]*d*(1 - c), v[1]*c + x[1]*s + k[1]*d*(1 - c), v[2]*c + x[2]*s + k[2]*d*(1 - c)]; };

/* ---------- telefono ---------- */
function drawPhone(c, cam, pose, st, outlineOnly = null){
  const T = v => add(pose.pos, qrot(pose.q, v));
  const front = RR.map(p => cam.p(T([p[0], p[1], HD]))), back = RR.map(p => cam.p(T([p[0], p[1], -HD])));
  const H = hull(front.concat(back)), ow = st.ow;
  c.beginPath(); polyPath(c, H); c.lineJoin = 'round';
  if (outlineOnly) return H;
  c.lineWidth = ow*2; c.strokeStyle = css(LINE, LINE_A); c.stroke();
  // cornice metallica (la lastra vista di taglio): gradiente lungo la luce
  const bb = bbox(H), g = c.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1);
  g.addColorStop(0, '#eef2fa'); g.addColorStop(.3, '#a9b1c4'); g.addColorStop(.62, '#5d667c'); g.addColorStop(1, '#353c50');
  c.fillStyle = g; c.fill();
  const n = qrot(pose.q, [0, 0, 1]), facing = dot(n, sub(cam.eye, pose.pos)) > 0;
  if (facing){
    c.beginPath(); polyPath(c, front); c.fillStyle = '#05070f'; c.fill();
    const scr = RR_SCREEN.map(p => cam.p(T([p[0], p[1], HD])));
    c.save(); c.beginPath(); polyPath(c, scr); c.clip();
    drawScreen(c, cam, T);
    // vetro: due riflessi
    const b2 = bbox(scr), rg = c.createLinearGradient(b2.x0, b2.y0, b2.x1, b2.y1);
    rg.addColorStop(0, 'rgba(255,255,255,.2)'); rg.addColorStop(.3, 'rgba(255,255,255,.04)'); rg.addColorStop(.31, 'rgba(255,255,255,0)');
    rg.addColorStop(.55, 'rgba(255,255,255,0)'); rg.addColorStop(.56, 'rgba(255,255,255,.09)'); rg.addColorStop(.66, 'rgba(255,255,255,.02)'); rg.addColorStop(.67, 'rgba(255,255,255,0)');
    c.fillStyle = rg; c.fillRect(b2.x0, b2.y0, b2.x1 - b2.x0, b2.y1 - b2.y0);
    c.restore();
  } else {
    c.beginPath(); polyPath(c, back);
    const b2 = bbox(back), bg = c.createLinearGradient(b2.x0, b2.y0, b2.x1, b2.y1);
    bg.addColorStop(0, '#4a5574'); bg.addColorStop(.5, '#2a3249'); bg.addColorStop(1, '#181d2e'); c.fillStyle = bg; c.fill();
    // modulo fotocamere (in alto a sinistra guardando il dorso)
    const cm = CAM_MOD.map(p => cam.p(T([p[0], p[1], -HD - .0012])));
    c.beginPath(); polyPath(c, cm); c.fillStyle = '#323b58'; c.fill(); c.lineWidth = Math.max(.8, ow*.5); c.strokeStyle = 'rgba(10,12,22,.9)'; c.stroke();
    for (const [x, y] of [[.021, .072], [.021, .058], [.021, .044]]){
      const o = cam.p(T([x, y, -HD - .0018])), r = cam.rad(T([x, y, 0]), .0045);
      c.beginPath(); c.arc(o.x, o.y, r, 0, 2*Math.PI); c.fillStyle = '#0a0d18'; c.fill(); c.lineWidth = Math.max(.6, r*.28); c.strokeStyle = '#8890a8'; c.stroke();
    }
  }
  // spigolo illuminato della cornice
  c.beginPath(); polyPath(c, H); c.lineWidth = Math.max(.6, ow*.45); c.strokeStyle = 'rgba(255,255,255,.22)'; c.stroke();
  return H;
}
// schermata «Pronto» della pagina del telefono (mm sul piano dello schermo; mai specchiata per il mancino)
function drawScreen(c, cam, T){
  const A = cam.p(T([-HW, -HH, HD])), B = cam.p(T([HW, -HH, HD])), C = cam.p(T([-HW, HH, HD])), O = cam.p(T([0, 0, HD]));
  let ax = (B.x - A.x)/(PHONE.w*1000), ay = (B.y - A.y)/(PHONE.w*1000);
  const bx = (C.x - A.x)/(PHONE.h*1000), by = (C.y - A.y)/(PHONE.h*1000);
  if (cam.mirror){ ax = -ax; ay = -ay; }
  c.save(); c.transform(ax, ay, bx, by, O.x, O.y);
  const g = c.createLinearGradient(0, 80, 0, -80); g.addColorStop(0, '#203aa8'); g.addColorStop(1, '#0b1558');
  c.fillStyle = g; c.fillRect(-45, -90, 90, 180);
  c.lineWidth = 2.4; c.strokeStyle = '#36e07a'; c.beginPath(); c.arc(0, 22, 20, 0, 2*Math.PI); c.stroke();
  c.fillStyle = 'rgba(54,224,122,.14)'; c.fill();
  c.save(); c.scale(1, -1);
  c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '700 8.5px Barlow, sans-serif'; c.fillText('Pronto', 0, -22);
  c.fillStyle = 'rgba(220,228,255,.78)'; c.font = '500 4px Barlow, sans-serif'; c.fillText('Guarda il computer', 0, 8);
  c.restore();
  c.lineWidth = .7; c.strokeStyle = 'rgba(160,180,255,.7)'; c.fillStyle = 'rgba(70,95,220,.55)';
  for (const x of [-24, 0, 24]){ c.beginPath(); c.roundRect(x - 10.5, -66, 21, 8, 4); c.fill(); c.stroke(); }
  c.restore();
}

/* ---------- la figura: avambraccio, mano e telefono ---------- */
const rAt = u => { const prof = FOREARM_PROFILE; for (let i = 1; i < prof.length; i++) if (u <= prof[i][0]){ const k = (u - prof[i - 1][0])/(prof[i][0] - prof[i - 1][0]); return (prof[i - 1][1] + (prof[i][1] - prof[i - 1][1])*k)/1000; } return prof[prof.length - 1][1]/1000; };
function figure(cam, pose, st, H){
  const rig = handRig(pose, H), P = cam.p, R = (X, r) => cam.rad(X, r);
  const qiPos = pose.pos, toLocal = X => qrot([-pose.q[0], -pose.q[1], -pose.q[2], pose.q[3]], sub(X, qiPos));
  const clampBox = l => [Math.max(-HW, Math.min(HW, l[0])), Math.max(-HH, Math.min(HH, l[1])), Math.max(-HD, Math.min(HD, l[2]))];
  const sideOf = X => { const B = add(pose.pos, qrot(pose.q, clampBox(toLocal(X)))); return cam.depth(X) < cam.depth(B) - .0015 ? 'front' : 'back'; };
  const cap = (A, B, ra, rb, m, extra) => {
    const a = P(A), b = P(B), Ra = R(A, ra), Rb = R(B, rb);
    return { a, b, Ra, Rb, path: (c, g) => capsulePath(c, a, b, Ra + g, Rb + g), fill: c => tubeGrad(c, a, b, (Ra + Rb)/2, m), depth: cam.depth(mul(add(A, B), .5)), ...extra };
  };
  const along = u => add(rig.W, mul(sub(rig.E, rig.W), u));
  // avambraccio: dal polso fin dove sfuma (mai il gomito né il braccio: spalla e gomito sono solo indicativi)
  const fore = [], FE = FOREARM_SHOWN.to + .04, NS = 4;
  for (let i = 0; i < NS; i++){ const u0 = FE*i/NS, u1 = FE*(i + 1)/NS; fore.push(cap(along(u0), along(u1), rAt(u0), rAt(u1), MAT.skin, { kind: 'fore' })); }
  // palmo: inviluppo arrotondato di polso, eminenze, nocche e base del pollice
  const palmPts = [];
  palmPts.push(...circlePts(P(rig.W), R(rig.W, .024)));
  for (const h of rig.heel) palmPts.push(...circlePts(P(h.p), R(h.p, h.r)));
  for (const f of rig.fingers) palmPts.push(...circlePts(P(f.pts[0]), R(f.pts[0], f.r[0] + .0015), 10));
  palmPts.push(...circlePts(P(rig.thumb.pts[0]), R(rig.thumb.pts[0], rig.thumb.r[0]), 12));
  const palmHull = hull(palmPts), palmC = P(rig.heel[2].p), palmR = R(rig.heel[2].p, .055);
  const hand = [{ path: (c, g) => smoothPath(c, palmHull, g), fill: c => {
    const g = c.createRadialGradient(palmC.x + LIGHT[0]*palmR*.5, palmC.y + LIGHT[1]*palmR*.5, palmR*.1, palmC.x, palmC.y, palmR*1.15);
    g.addColorStop(0, css(MAT.skin.light)); g.addColorStop(.5, css(MAT.skin.base)); g.addColorStop(.86, css(mix(MAT.skin.base, MAT.skin.shadow, .55))); g.addColorStop(1, css(MAT.skin.shadow));
    return g; }, kind: 'palm' }];
  for (const f of rig.fingers) hand.push(cap(f.pts[0], f.pts[1], f.r[0], f.r[1], MAT.skin, { kind: 'prox' }));
  hand.push(cap(rig.thumb.pts[0], rig.thumb.pts[1], rig.thumb.r[0], rig.thumb.r[1], MAT.skin, { kind: 'thumb0' }));
  const screenSide = dot(qrot(pose.q, [0, 0, 1]), sub(cam.eye, pose.pos)) > 0;
  const armSide = screenSide ? 'back' : 'front';
  // dita: falangi media e distale con il proprio contorno, unghia se visibile
  const parts = [];
  const nailOf = (A, B, rr, dorsal) => {
    const vis = dot(norm(dorsal), norm(sub(cam.eye, B)));
    if (vis < .15) return null;
    const Cn = add(add(B, mul(sub(A, B), .3)), mul(norm(dorsal), rr*.62)), c0 = P(Cn), dir = P(add(Cn, mul(norm(sub(B, A)), .006)));
    return { c: c0, rx: R(Cn, rr*.6), ry: R(Cn, rr*.48)*(.45 + .55*vis), ang: Math.atan2(dir.y - c0.y, dir.x - c0.x) };
  };
  H.def.fingers.forEach((fd, i) => {
    const f = rig.fingers[i], k = norm(cross(norm(fd.dir), H.def.palmN));
    let ang = (fd.flex[0] + fd.flex[1])*D;
    for (let s = 1; s < 3; s++){
      const A = f.pts[s], B = f.pts[s + 1], part = cap(A, B, f.r[s], f.r[s + 1], MAT.skin, { kind: 'finger', group: 'f' + i });
      if (s === 2){ ang += fd.flex[2]*D; part.nail = nailOf(A, B, f.r[3], qrot(pose.q, rotLocal([0, 0, -1], k, ang))); }
      part.side = sideOf(mul(add(A, B), .5)); parts.push(part);
    }
  });
  for (let s = 1; s < 3; s++){
    const t = rig.thumb, A = t.pts[s], B = t.pts[s + 1], part = cap(A, B, t.r[s], t.r[s + 1], MAT.skin, { kind: 'thumb', group: 'thumb' });
    if (s === 2) part.nail = nailOf(A, B, t.r[3], qrot(pose.q, [.25, 0, 1]));
    part.side = sideOf(mul(add(A, B), .5)); parts.push(part);
  }
  // polsino: cilindro corto (inviluppo dei due anelli proiettati) con la riga blu sulla metà visibile
  const ax = norm(sub(rig.E, rig.W)), e1 = norm(cross(ax, Math.abs(ax[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), e2 = cross(ax, e1);
  const ring = (u, rr, n = 20) => { const Cc = along(u); return Array.from({ length: n }, (_, j) => { const a = j/n*2*Math.PI, nn = add(mul(e1, Math.cos(a)), mul(e2, Math.sin(a))), X = add(Cc, mul(nn, rr)); return { ...P(X), vis: dot(nn, sub(cam.eye, X)) > 0 }; }); };
  const bA = ring(BAND.from, rAt(BAND.from) + .0024), bB = ring(BAND.to, rAt(BAND.to) + .0024), bM = ring((BAND.from + BAND.to)/2, rAt((BAND.from + BAND.to)/2) + .0024);
  const endU = dot(ax, sub(cam.eye, along(BAND.to))) > 0 ? BAND.to : dot(mul(ax, -1), sub(cam.eye, along(BAND.from))) > 0 ? BAND.from : null;
  const band = { a: P(along(BAND.from)), b: P(along(BAND.to)), Ra: R(along(BAND.from), rAt(BAND.from) + .0024), Rb: R(along(BAND.to), rAt(BAND.to) + .0024),
    hull: hull(bA.concat(bB)), mid: bM, end: endU === BAND.to ? bB : endU === BAND.from ? bA : null, hole: endU === null ? null : ring(endU, rAt(endU)) };
  // avambraccio verso la camera (il gomito più vicino del polso): si disegna sopra la mano
  const foreFront = cam.depth(along(.35)) < cam.depth(rig.heel[2].p) - .03;
  // sfumatura dell'avambraccio lungo il suo asse proiettato
  const fadeA = P(along(FOREARM_SHOWN.from)), fadeB = P(along(FOREARM_SHOWN.to));
  // quanto l'avambraccio si vede di lato (1) o di punta, verso la camera (0): lunghezza proiettata del tratto che sfuma
  // rispetto a quella che avrebbe di lato alla stessa distanza
  const sideOn = Math.min(1, Math.hypot(fadeB.x - fadeA.x, fadeB.y - fadeA.y)/Math.max(1, R(along((FOREARM_SHOWN.from + FOREARM_SHOWN.to)/2), ARM.fore*(FOREARM_SHOWN.to - FOREARM_SHOWN.from))));
  // rettangolo occupato (px del dispositivo): gli strati si puliscono e si compongono solo lì
  const m = 4 + st.ow*3, d = st.dpr, Wd = st.layer.width, Hd = st.layer.height;
  const rectOf = (shapes, pts) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (x, y, r) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
    for (const q of shapes) if (q.a){ grow(q.a.x, q.a.y, q.Ra); grow(q.b.x, q.b.y, q.Rb); }
    for (const q of pts) grow(q.x, q.y, 0);
    const rx = Math.max(0, Math.floor((x0 - m)*d)), ry = Math.max(0, Math.floor((y0 - m)*d));
    return { x: rx, y: ry, w: Math.max(1, Math.min(Wd, Math.ceil((x1 + m)*d)) - rx), h: Math.max(1, Math.min(Hd, Math.ceil((y1 + m)*d)) - ry) };
  };
  const corners = [[-HW, HH], [HW, HH], [-HW, -HH], [HW, -HH]].map(v => P(add(pose.pos, qrot(pose.q, [v[0], v[1], 0]))));
  // rettangoli occupati (px del dispositivo): gli strati si puliscono e si compongono solo lì; rect = tutta la figura
  const handRect = rectOf(hand.concat(parts), palmHull.concat(band.hull, corners)), foreRect = rectOf(fore, []);
  const rect = { x: Math.min(handRect.x, foreRect.x), y: Math.min(handRect.y, foreRect.y) };
  rect.w = Math.max(handRect.x + handRect.w, foreRect.x + foreRect.w) - rect.x; rect.h = Math.max(handRect.y + handRect.h, foreRect.y + foreRect.h) - rect.y;
  return { rig, fore, hand, armSide, parts, band, foreFront, fadeA, fadeB, sideOn, rect, handRect, foreRect, palmHull };
}
function drawShapes(c, shapes, st){
  c.fillStyle = css(LINE, 1);
  for (const s of shapes){ c.beginPath(); s.path(c, st.ow); c.fill(); }
  for (const s of shapes){ c.beginPath(); s.path(c, 0); c.fillStyle = s.fill(c); c.fill(); }
}
function unitsOf(parts){
  const m = new Map();
  for (const p of parts){ const k = p.group || p; if (!m.has(k)) m.set(k, []); m.get(k).push(p); }
  return [...m.values()].map(ps => ({ ps: ps.sort((a, b) => b.depth - a.depth), depth: Math.min(...ps.map(p => p.depth)) })).sort((a, b) => b.depth - a.depth);
}
function drawUnit(c, U, st){
  c.fillStyle = css(LINE, 1);
  for (const p of U.ps){ c.beginPath(); p.path(c, st.ow); c.fill(); }
  for (const p of U.ps){ c.beginPath(); p.path(c, 0); c.fillStyle = p.fill(c); c.fill(); }
  for (const p of U.ps) if (p.nail) drawNail(c, p.nail, st);
}
function drawNail(c, n, st){
  c.save(); c.translate(n.c.x, n.c.y); c.rotate(n.ang);
  c.beginPath(); c.ellipse(0, 0, n.rx, n.ry, 0, 0, 2*Math.PI);
  const g = c.createLinearGradient(-n.rx, -n.ry, n.rx, n.ry); g.addColorStop(0, css(MAT.nail.high)); g.addColorStop(.6, css(MAT.nail.base)); g.addColorStop(1, css(MAT.nail.shadow));
  c.fillStyle = g; c.fill(); c.lineWidth = Math.max(.5, st.ow*.4); c.strokeStyle = css(MAT.skin.shadow, .8); c.stroke(); c.restore();
}
function drawBand(l, F, st){
  const b = F.band; l.save();
  const shape = () => { l.beginPath(); polyPath(l, b.hull); if (b.hole) polyPath(l, b.hole); };
  shape(); l.lineJoin = 'round'; l.lineWidth = st.ow*2; l.strokeStyle = css(LINE, LINE_A); l.stroke();
  l.fillStyle = tubeGrad(l, b.a, b.b, (b.Ra + b.Rb)/2, MAT.band); l.fill('evenodd');
  if (b.end){ l.beginPath(); polyPath(l, b.end); l.lineWidth = Math.max(.8, st.ow*.5); l.strokeStyle = css(MAT.band.shadow, .6); l.stroke(); }
  shape(); l.clip('evenodd');
  const vis = b.mid.filter(q => q.vis);
  if (vis.length > 2){
    const n = b.mid.length, k0 = b.mid.findIndex((q, j) => q.vis && !b.mid[(j + n - 1)%n].vis), seq = [];
    for (let j = 0; j < n; j++){ const q = b.mid[(Math.max(0, k0) + j)%n]; if (!q.vis) break; seq.push(q); }
    l.beginPath(); seq.forEach((q, j) => j ? l.lineTo(q.x, q.y) : l.moveTo(q.x, q.y));
    l.lineCap = 'butt'; l.lineWidth = Math.max(1.2, (b.Ra + b.Rb)*.16); l.strokeStyle = BLUE; l.stroke();
  }
  l.restore();
}
// sfumatura dell'avambraccio (destination-out sullo strato): lungo l'asse quando si vede di lato; quando punta verso la
// camera (fine del servizio e della schiacciata) l'asse proiettato è corto e la sfumatura lineare lascerebbe il fondo
// dell'avambraccio come un disco: lì si sfuma in tondo attorno al polsino, e il braccio si dissolve verso chi guarda
function fadeForearm(l, F, st, R){
  const a = F.fadeA, b = F.fadeB, w = sstep(.3, .6, F.sideOn);
  l.save(); l.globalCompositeOperation = 'destination-out'; l.setTransform(1, 0, 0, 1, 0, 0);
  if (w > .01 && Math.hypot(b.x - a.x, b.y - a.y) > .5){
    const d = st.dpr, g = l.createLinearGradient(a.x*d, a.y*d, b.x*d, b.y*d);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.55, `rgba(0,0,0,${.7*w})`); g.addColorStop(1, `rgba(0,0,0,${w})`);
    l.fillStyle = g; l.fillRect(R.x, R.y, R.w, R.h);
  }
  if (w < .99){
    const B = F.band, d = st.dpr, cx = (B.a.x + B.b.x)/2*d, cy = (B.a.y + B.b.y)/2*d, rb = Math.max(B.Ra, B.Rb)*d;
    const g = l.createRadialGradient(cx, cy, rb*.95, cx, cy, rb*1.8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${1 - w})`);
    l.fillStyle = g; l.fillRect(R.x, R.y, R.w, R.h);
  }
  l.restore();
}
// avambraccio in uno strato proprio, sfumato lungo l'asse (destination-out solo dentro la sua sagoma)
function drawForearm(c, F, st){
  const L = st.layer, l = L.getContext('2d'), R = F.foreRect;
  l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(R.x, R.y, R.w, R.h); l.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  drawShapes(l, F.fore, st);
  fadeForearm(l, F, st, R);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(L, R.x, R.y, R.w, R.h, R.x, R.y, R.w, R.h); c.restore();
}
// la figura intera: avambraccio sfumato, mano dietro il telefono (con l'ombra morbida del telefono sulla pelle), polsino,
// telefono, poi le dita davanti (con la loro ombra sul vetro); mano davanti se lo schermo non guarda la camera
function drawFigure(c, cam, pose, st, H){
  const F = figure(cam, pose, st, H), L = st.layer, l = L.getContext('2d'), R = F.handRect;
  const clearL = () => { l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(R.x, R.y, R.w, R.h); l.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); };
  const blit = () => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(L, R.x, R.y, R.w, R.h, R.x, R.y, R.w, R.h); c.restore(); };
  if (!F.foreFront) drawForearm(c, F, st);
  const back = F.parts.filter(p => p.side === 'back'), front = F.parts.filter(p => p.side === 'front');
  const handPass = () => { drawShapes(l, F.hand, st); drawBand(l, F, st); };
  if (F.armSide === 'back' || back.length){
    clearL();
    if (F.armSide === 'back') handPass();
    for (const U of unitsOf(back)) drawUnit(l, U, st);
    // ombra morbida del telefono solo sulla pelle già disegnata (source-atop): due passate sfalsate
    const T = v => add(pose.pos, qrot(pose.q, v)), ph = hull(RR.map(p => cam.p(T([p[0], p[1], 0]))));
    l.globalCompositeOperation = 'source-atop';
    for (const [k, a] of [[1.1, .24], [2, .16]]){
      l.save(); l.translate(-LIGHT[0]*st.shadow*k, -LIGHT[1]*st.shadow*k);
      l.beginPath(); polyPath(l, ph); l.fillStyle = `rgba(60,16,10,${a})`; l.fill(); l.restore();
    }
    l.globalCompositeOperation = 'source-over';
    blit();
  }
  const Hh = F.phoneHull = drawPhone(c, cam, pose, st);
  if (front.length){
    c.save(); c.beginPath(); polyPath(c, Hh); c.clip(); c.fillStyle = 'rgba(2,4,16,.4)';
    c.translate(-LIGHT[0]*st.shadow, -LIGHT[1]*st.shadow);
    for (const p of front){ c.beginPath(); p.path(c, st.ow*.6); c.fill(); }
    c.restore();
  }
  if (F.armSide === 'front'){ clearL(); handPass(); blit(); }
  for (const U of unitsOf(front)) drawUnit(c, U, st);
  // avambraccio davanti alla mano (presa vista di lato): il polsino gli si ridisegna sopra, perché lo avvolge; prima
  // l'avambraccio lo copriva e il suo bordo tondo restava come una cucitura sul palmo (revisione artistica)
  if (F.foreFront){ drawForearm(c, F, st); drawBand(c, F, st); }
  return F;
}
// sagoma della figura (contorno esterno, niente riempimento) per i fantasmi: unione allargata meno unione delle forme
function drawGhostInto(x, cam, pose, st, H, color){
  const F = figure(cam, pose, st, H), ow = Math.max(1.5, st.ow*.9);
  const T = v => add(pose.pos, qrot(pose.q, v));
  const phone = hull(RR.map(p => cam.p(T([p[0], p[1], HD]))).concat(RR.map(p => cam.p(T([p[0], p[1], -HD])))));
  const shapes = [...F.fore.slice(0, 2), ...F.hand, ...F.parts];
  x.fillStyle = color;
  for (const s of shapes){ x.beginPath(); s.path(x, ow); x.fill(); }
  x.beginPath(); polyPath(x, phone); x.lineJoin = 'round'; x.lineWidth = ow*2; x.strokeStyle = color; x.stroke(); x.fill();
  x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
  for (const s of shapes){ x.beginPath(); s.path(x, 0); x.fill(); }
  x.beginPath(); polyPath(x, phone); x.fill();
  // l'avambraccio del fantasma sfuma come quello vivo
  const a = F.fadeA, b = F.fadeB;
  if (Math.hypot(b.x - a.x, b.y - a.y) > .5){
    const g = x.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = g; x.beginPath(); for (const s of F.fore) s.path(x, ow + 1); x.fill();
  }
  x.restore();
  return F;
}

/* ---------- palla, lampo, scia, freccia ---------- */
// la palla è dietro il telefono? Vicino al telefono decide il lato del piano del telefono rispetto alla camera (la palla
// appoggiata o al contatto sta a un raggio dalla faccia: la sola profondità sbaglia quando la faccia è obliqua); lontano
// decide la profondità
function ballBehind(cam, pose, ball){
  const d = sub(ball, pose.pos);
  if (len(d) > .15) return cam.depth(ball) > cam.depth(pose.pos) + .01;
  const n = qrot(pose.q, [0, 0, 1]);
  return dot(n, d)*dot(n, sub(cam.eye, pose.pos)) < 0;
}
function drawBallThrough(c, cam, X, spin, st, hullPts, alpha){
  const p = cam.p(X), r = cam.rad(X, BALL_R), b = bbox(hullPts);
  if (p.x + r < b.x0 || p.x - r > b.x1 || p.y + r < b.y0 || p.y - r > b.y1) return;
  c.save(); c.beginPath(); polyPath(c, hullPts); c.clip();
  drawBall(c, cam, X, spin, st, .5*alpha);
  c.beginPath(); c.arc(p.x, p.y, r, 0, 2*Math.PI); c.setLineDash([Math.max(2, st.ow*2.2), Math.max(2, st.ow*1.8)]);
  c.lineWidth = Math.max(1.2, st.ow*.9); c.strokeStyle = `rgba(227,255,54,${.95*alpha})`; c.stroke();
  c.restore();
}
function drawBall(c, cam, X, spin, st, alpha = 1){
  const p = cam.p(X), r = cam.rad(X, BALL_R);
  c.save(); c.globalAlpha = alpha;
  c.beginPath(); c.arc(p.x, p.y, r + st.ow, 0, 2*Math.PI); c.fillStyle = css(LINE, LINE_A); c.fill();
  const g = c.createRadialGradient(p.x + LIGHT[0]*r*.45, p.y + LIGHT[1]*r*.45, r*.1, p.x, p.y, r);
  g.addColorStop(0, '#f8ffa6'); g.addColorStop(.55, '#d9f22e'); g.addColorStop(1, '#8aa312');
  c.beginPath(); c.arc(p.x, p.y, r, 0, 2*Math.PI); c.fillStyle = g; c.fill();
  c.clip(); c.lineWidth = Math.max(1, r*.13); c.strokeStyle = 'rgba(255,255,240,.9)';
  c.translate(p.x, p.y); c.rotate(spin);
  c.beginPath(); c.arc(-r*1.05, 0, r*.78, -1.1, 1.1); c.stroke(); c.beginPath(); c.arc(r*1.05, 0, r*.78, Math.PI - 1.1, Math.PI + 1.1); c.stroke();
  c.restore();
  return { p, r };
}
// lampo nell'istante del contatto: anello che si allarga e 6 raggi corti (0,16 s)
function drawImpact(c, cam, X, dt, st){
  if (dt < 0 || dt > .16) return;
  const u = dt/.16, p = cam.p(X), r0 = cam.rad(X, BALL_R);
  c.save(); c.globalCompositeOperation = 'lighter';
  c.beginPath(); c.arc(p.x, p.y, r0*(1.25 + 1.8*u), 0, 2*Math.PI); c.lineWidth = st.ow*2.2*(1 - u); c.strokeStyle = css(BALL, 1 - u); c.stroke();
  for (let i = 0; i < 6; i++){
    const a = i/6*2*Math.PI + .5, r1 = r0*(1.7 + 1.3*u), r2 = r0*(2.4 + 1.9*u);
    c.beginPath(); c.moveTo(p.x + Math.cos(a)*r1, p.y + Math.sin(a)*r1); c.lineTo(p.x + Math.cos(a)*r2, p.y + Math.sin(a)*r2);
    c.lineCap = 'round'; c.lineWidth = st.ow*1.4*(1 - u); c.strokeStyle = css(WHITE, .9*(1 - u)); c.stroke();
  }
  c.restore();
}
// scia della cima: nastro tra la cima e un punto più in basso, ultimi 0,3 s, larghezza e luce proporzionali alla velocità,
// testa sfumata negli ultimi 20 ms (il telefono la copre: si disegna prima della figura)
function drawTrail(c, cam, M, t, st){
  const N = 30, dt = .3/N, A = [], B = [], w = [];
  for (let i = 0; i <= N; i++){
    const tt = t - i*dt, s = sampleAt(M.speed, M, tt), a = cam.p(sampleAt(M.tip, M, tt)), m = cam.p(sampleAt(M.mid, M, tt)), k = Math.min(1, s/900);
    // larghezza proporzionale alla velocità: dalla cima verso il punto più basso del telefono
    A.push(a); B.push({ x: a.x + (m.x - a.x)*(.25 + .75*k), y: a.y + (m.y - a.y)*(.25 + .75*k) }); w.push(sstep(90, 380, s)*(.35 + .65*k));
  }
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < N; i++){
    const age = i/N, head = sstep(0, .067, age), a = (1 - age)**1.6*Math.min(w[i], w[i + 1])*head;
    if (a < .01) continue;
    c.beginPath(); c.moveTo(A[i].x, A[i].y); c.lineTo(A[i + 1].x, A[i + 1].y); c.lineTo(B[i + 1].x, B[i + 1].y); c.lineTo(B[i].x, B[i].y); c.closePath();
    c.fillStyle = css(mix(WHITE, BALL, Math.min(1, age*2)), .5*a); c.fill();
  }
  c.lineCap = 'round';
  for (let i = 0; i < N; i++){
    const age = i/N, head = sstep(0, .067, age), a = (1 - age)**1.3*Math.min(w[i], w[i + 1])*head; if (a < .01) continue;
    c.beginPath(); c.moveTo(A[i].x, A[i].y); c.lineTo(A[i + 1].x, A[i + 1].y); c.lineWidth = st.ow*(2.4 - 1.7*age); c.strokeStyle = css(mix(WHITE, BALL, age), .9*a); c.stroke();
  }
  c.restore();
}
// freccia tratteggiata del verso lungo il percorso della cima nella parte veloce: cresce durante la carica, poi resta
function drawArrows(c, cam, M, t, st){
  // visibile dalla carica al ritorno, spenta fino alla carica dopo (prima si riaccendeva alla fine del ciclo e spariva di
  // colpo al giro: uno scatto a ogni ciclo). Servizio: la freccia della battuta cresce dopo il lancio, non insieme
  // (revisione artistica)
  const P = M.P, vis = 1 - sstep(P.T.back, P.T.home, t);
  for (const [j, seg] of M.arrows.entries()){
    const from = j ? Math.min(M.arrows[j - 1].t1, seg.t0 - .05) : P.T.hold;
    const grow = t < from ? 0 : t < seg.t0 ? sstep(from, seg.t0, t) : 1, n = Math.max(2, Math.round(32*Math.max(.03, grow)) + 1);
    if (vis*grow <= .02) continue;
    const pts = seg.pts.slice(0, n).map(cam.p);
    c.save(); c.globalAlpha = .8*Math.min(1, vis); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.lineWidth = st.ow*2.6; c.strokeStyle = 'rgba(5,10,28,.55)'; c.stroke();
    c.lineWidth = st.ow*1.2; c.setLineDash([st.ow*4, st.ow*3]); c.strokeStyle = 'rgba(240,245,255,.92)'; c.stroke(); c.setLineDash([]);
    const e = pts[pts.length - 1], d = pts[pts.length - 2], ang = Math.atan2(e.y - d.y, e.x - d.x), s = Math.max(7, st.ow*6)*sstep(0, .3, grow);   // la punta cresce con la freccia
    c.translate(e.x, e.y); c.rotate(ang); c.beginPath(); c.moveTo(s*.9, 0); c.lineTo(-s*.6, s*.62); c.lineTo(-s*.3, 0); c.lineTo(-s*.6, -s*.62); c.closePath();
    c.fillStyle = css(BALL); c.fill(); c.lineWidth = Math.max(1, st.ow*.7); c.strokeStyle = 'rgba(5,10,28,.85)'; c.stroke();
    c.restore();
  }
}

/* ---------- sagoma del soggetto vivo (per tenere le etichette fuori) ---------- */
function inPoly(P, x, y){
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++){
    const a = P[i], b = P[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x)*(y - a.y)/(b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function inCap(q, x, y, pad){
  const dx = q.b.x - q.a.x, dy = q.b.y - q.a.y, l2 = dx*dx + dy*dy, k = l2 ? Math.max(0, Math.min(1, ((x - q.a.x)*dx + (y - q.a.y)*dy)/l2)) : 0;
  const r = q.Ra + (q.Rb - q.Ra)*k + pad;
  return Math.hypot(x - q.a.x - dx*k, y - q.a.y - dy*k) <= r;
}
// quanti dei 7×3 punti di un rettangolo cadono sul soggetto vivo (solo le forme il cui rettangolo tocca quello dato)
function liveTest(F){
  const pad = 4, polys = [F.phoneHull, F.palmHull, F.band?.hull].filter(Boolean).map(P => ({ P, b: bbox(P) }));
  const caps = [...F.fore, ...F.parts, ...F.hand.filter(q => q.a)].map(q => ({ q, b: { x0: Math.min(q.a.x - q.Ra, q.b.x - q.Rb), x1: Math.max(q.a.x + q.Ra, q.b.x + q.Rb), y0: Math.min(q.a.y - q.Ra, q.b.y - q.Rb), y1: Math.max(q.a.y + q.Ra, q.b.y + q.Rb) } }));
  const hit = (b, r) => b.x0 - pad <= r.x1 && b.x1 + pad >= r.x0 && b.y0 - pad <= r.y1 && b.y1 + pad >= r.y0;
  return r => {
    const C = caps.filter(k => hit(k.b, r)), Pp = polys.filter(k => hit(k.b, r));
    if (!C.length && !Pp.length) return 0;
    let n = 0;
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 2; j++){
      const x = r.x0 + (r.x1 - r.x0)*i/6, y = r.y0 + (r.y1 - r.y0)*j/2;
      if (C.some(k => inCap(k.q, x, y, pad)) || Pp.some(k => inPoly(k.P, x, y))) n++;
    }
    return n;
  };
}

/* ---------- testi ---------- */
function pill(c, st, x, y, text, { bg = 'rgba(8,14,40,.84)', fg = '#f4f6fc', border = 'rgba(176,194,255,.42)', size = 12, align = 'center', num = null, box = null } = {}){
  c.save(); c.font = `700 ${size}px Barlow, sans-serif`;
  const tw = c.measureText(text).width, h = Math.round(size*1.75), nw = num ? h : 0, w = tw + size*1.2 + nw;
  const b = box || { x0: 6, x1: st.W - 6, y0: 6, y1: st.H - 6 };
  const x0 = Math.max(b.x0, Math.min(b.x1 - w, align === 'center' ? x - w/2 : align === 'right' ? x - w : x)), yy = Math.max(b.y0 + h/2, Math.min(b.y1 - h/2, y));
  c.beginPath(); c.roundRect(x0, yy - h/2, w, h, h/2); c.fillStyle = bg; c.fill(); c.lineWidth = 1; c.strokeStyle = border; c.stroke();
  if (num){ c.beginPath(); c.arc(x0 + h/2, yy, h/2 - 2.5, 0, 2*Math.PI); c.fillStyle = css(BALL); c.fill(); c.fillStyle = '#0a1330'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(num, x0 + h/2, yy + .5); }
  c.fillStyle = fg; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(text, x0 + nw + size*.6, yy + .5);
  c.restore(); return { x0, y0: yy - h/2, w, h };
}
const fmtRate = r => r === 1 ? 'Tempo reale' : `Rallentato ×${String(r).replace('.', ',')}`;
// confronto di velocità con il dritto (piatto e palla corta, brief §5.4)
function versusForehand(id){
  if (id !== 'flat' && id !== 'drop') return '';
  const k = motion(id).peak/motion('forehand').peak;
  return id === 'flat' ? ` · ${k.toFixed(1).replace('.', ',')}× il dritto` : ` · ${Math.round(k*10)/10 === .5 ? 'metà' : k.toFixed(1).replace('.', ',') + '×'} del dritto`;
}

/* ---------- l'istanza ---------- */
export class NatpfGestureDemo {
  constructor({ width = 240, height = 240 } = {}){
    this.w = width; this.h = height; this.hand = 'right'; this.speed = 'auto'; this.id = 'ready';
    this.t = 0; this.cycles = 0; this.running = false; this.raf = 0; this.last = 0; this.frames = 0; this.drawMs = 0;
    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.canvas) this.canvas.className = 'gesture-demo-canvas';
    let ctx = null;
    try { ctx = this.canvas?.getContext?.('2d', { alpha: false }) || null; } catch { ctx = null; }
    this.ctx = ctx; this.available = !!ctx;
    this.dprCap = MAX_DPR; this.slow = 0;
    if (this.available){
      this.st = { dpr: 1, W: width, H: height, ow: 1.5, shadow: 3, layer: document.createElement('canvas'), ghost: document.createElement('canvas') };
      this._resize();
    }
    this.grip = GRIP_STYLE;
  }
  mount(el){ if (!this.canvas || !el) return; if (this.canvas.parentNode !== el) el.appendChild(this.canvas); this._dirty = true; }
  // misure CSS del riquadro (px)
  setSize(w, h){
    if (!this.available || !(w > 0 && h > 0) || (w === this.w && h === this.h)) return;
    this.w = w; this.h = h; this._resize();
  }
  get compact(){ return this.w < COMPACT_W; }
  _resize(){
    const st = this.st, dev = Math.max(1, globalThis.devicePixelRatio || 1);
    const dpr = Math.max(1, Math.min(this.dprCap, dev, Math.sqrt(MAX_PIXELS/(this.w*this.h))));
    st.dpr = dpr; st.W = this.w; st.H = this.h;
    for (const k of [this.canvas, st.layer, st.ghost]){ k.width = Math.round(this.w*dpr); k.height = Math.round(this.h*dpr); }
    this.canvas.style.aspectRatio = `${this.w} / ${this.h}`;
    this._frames = new Map(); this._ghosts = new Map(); this._bg = null; this._floorKey = null; this._hudKey = null; this._dirty = true;
  }
  // id: chiave di GESTURES; hand: 'right' | 'left'; speed: numero o 'auto'
  play(id, { hand = this.hand, speed = 'auto' } = {}){
    const next = GESTURES[id] ? id : 'ready', h = hand === 'left' ? 'left' : 'right';
    if (next !== this.id || h !== this.hand){ this.t = 0; this.cycles = 0; this._ghosts?.clear(); }
    this.id = next; this.hand = h; this.speed = speed; this._dirty = true;
    this.start();
  }
  start(){
    if (!this.available || this.running) return;
    this.running = true; this.last = performance.now();
    const loop = now => { if (!this.running) return; this.raf = requestAnimationFrame(loop); this._frame(now); };
    this.raf = requestAnimationFrame(loop);
  }
  stop(){ this.running = false; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  // istante del contatto nel ciclo (s, tempo reale); 0 per presa e posizione
  hitTime(){ return gesturePlan(this.id, { grip: this.grip }).contact ?? 0; }
  // durata di un ciclo (s, tempo reale)
  cycle(){ return gesturePlan(this.id, { grip: this.grip }).total; }
  // velocità di riproduzione di questo ciclo
  rate(){ if (typeof this.speed === 'number') return this.speed; return GESTURES[this.id]?.still || this.cycles === 0 ? 1 : this.cycles % 2 ? SLOW : 1; }
  // posa disegnata al tempo t (s, tempo reale del gesto): È gesturePose (natpf_gesture_pose.js) della mano scelta
  pose(t){ return gesturePose(this.id, t, { hand: this.hand, grip: this.grip }); }
  visible(){ const c = this.canvas; return !!c && c.isConnected && c.offsetParent !== null && !(typeof document !== 'undefined' && document.hidden); }
  _frame(now){
    const dt = Math.min(.05, Math.max(0, (now - this.last)/1000)); this.last = now;
    // niente lavoro se il canvas non si vede (modale chiusa, metà nascosta, scheda del browser in background)
    if (!this.visible()) return;
    const P = gesturePlan(this.id, { grip: this.grip });
    this.t += dt*this.rate();
    if (this.t >= P.total){ this.t -= P.total; this.cycles++; }
    const t0 = performance.now();
    this.render(this.t);
    const ms = performance.now() - t0; this.drawMs = this.drawMs*.9 + ms*.1; this.frames++;
    // densità ridotta a passi di 0,25 se il disegno è lento (12 ms per 40 fotogrammi di fila)
    this.slow = ms > 12 ? this.slow + 1 : 0;
    if (this.slow > 40 && this.st.dpr > 1){ this.dprCap = Math.max(1, this.st.dpr - .25); this.slow = 0; this._resize(); }
  }
  // fotogramma fermo all'istante t (prove e fogli di controllo): rate solo per la scritta
  show(t, { rate = null } = {}){ this.stop(); this.t = t; this._rateLabel = rate; this.render(t); this._rateLabel = null; return this; }

  _cam(t){ return cameraAt(this.id, t, { W: this.st.W, H: this.st.H, hand: this.hand, grip: this.grip, cache: this._frames }); }

  /* ---------- fotogramma ---------- */
  render(t){
    if (!this.available) return;
    const c = this.ctx, st = this.st, W = st.W, H = st.H, id = this.id, compact = this.compact, H_ = handFor(this.grip);
    c.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.ow = Math.max(1, .003*W); st.shadow = Math.max(1.5, .0045*W);
    const M = motion(id, this.grip), P = M.P, tt = wrapT(P, t);
    const live = this.pose(tt), R = this.hand === 'left' ? { ...live, pos: mirrorPos(live.pos), q: mirrorQ(live.q) } : live;
    const cam = this._cam(tt), K = this.skip || {}; this._tNow = tt;   // skip: parti da saltare (solo misure del costo)
    if (!K.bg) this._background(c, cam, R);
    const u = Math.max(12, .026*H);               // testo base (px CSS): mai sotto i 12 px
    if (id === 'grip'){ this._grip(c, cam, R, tt, u); return; }   // info (con la figura disegnata) la scrive _grip
    // fantasmi a contorno delle pose chiave (non nella modalità compatta)
    const ghosts = compact || P.still ? [] : M.keys.map((k, i) => {
      let a = tt < k.t ? 0 : Math.min(1, (tt - k.t)/.12)*(1 - sstep(P.T.home - .25, P.T.home + .1, tt));
      a *= sstep(.04, .16, Math.abs(tt - k.t));                   // si spegne mentre il telefono passa per quella posa
      return { k, i, a };
    });
    if (!K.ghost) for (const g of ghosts) if (g.a > .01) this._ghost(c, cam, g, H_);
    if (!P.still){ if (!K.arrow) drawArrows(c, cam, M, tt, st); if (!K.trail) drawTrail(c, cam, M, tt, st); }
    const ballR = gestureBall(id, tt, { hand: this.hand, grip: this.grip }), ball = ballR && this.hand === 'left' ? mirrorPos(ballR) : ballR;
    let ballAlpha = 1;
    if (P.kind === 'serve' && tt < P.T.hold) ballAlpha = sstep(0, P.T.hold, tt);
    const spin = tt*12, ballFirst = ball && ballBehind(cam, R, ball);
    if (ball && ballFirst) drawBall(c, cam, ball, spin, st, ballAlpha);
    const F = K.figure ? figure(cam, R, st, H_) : drawFigure(c, cam, R, st, H_);
    if (ball && !ballFirst) drawBall(c, cam, ball, spin, st, ballAlpha);
    // palla dietro il telefono (contatto sulla faccia lontana dalla camera): si vede «in trasparenza» dentro la sagoma del
    // telefono, a metà opacità e con il contorno tratteggiato, così all'impatto non sparisce mai (brief §5.6.2)
    else if (ball && !K.figure && F.phoneHull) drawBallThrough(c, cam, ball, spin, st, F.phoneHull, ballAlpha);
    if (!compact && P.contact != null){ const X = gestureContactPoint(id, { grip: this.grip }); drawImpact(c, cam, X, tt - P.contact, st); }
    if (!compact && !K.hud){
      const taken = [];
      for (const g of ghosts) if (g.a > .01) this._ghostLabel(c, cam, g, F, u, taken);
      if (P.still) this._stillHud(c, u); else this._hud(c, M, tt, live, u);
    }
    this.info = { t: tt, cam, pose: live, ball, figure: F, ghosts };
  }
  // fondo: gradiente radiale più chiaro attorno al soggetto, piano di gioco accennato (linea di fondo) e ombra morbida
  // fondo: gradiente radiale più chiaro al centro dello stadio (fatto una volta per misura e copiato), piano di gioco
  // accennato sotto la mano (alone, tratto della linea di fondo che sfuma, ombra morbida della mano): dà alto e basso e
  // la direzione dello schermo (−z) senza linee che tagliano il quadro
  _background(c, cam, pose){
    const st = this.st, W = st.W, H = st.H;
    if (!this._bg){
      const bg = this._bg = document.createElement('canvas'); bg.width = this.canvas.width; bg.height = this.canvas.height;
      const x = bg.getContext('2d', { alpha: false }); x.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      const cx = W/2, cy = H*(this.compact ? .5 : .42), g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H)*.6);
      g.addColorStop(0, BG.center); g.addColorStop(.55, BG.mid); g.addColorStop(1, BG.edge);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    if (this.compact){ c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this._bg, 0, 0); c.restore(); return; }   // compatta: solo il soggetto
    const M = motion(this.id, this.grip), y0 = Math.min(M.floor ??= M.pts.reduce((m, p) => Math.min(m, p[1]), Infinity) - .3, .75);
    const sq = Math.max(.2, Math.min(1, Math.abs(dot(cam.fw, [0, -1, 0]))*1.15));
    // piano (alone e linea di fondo): con la camera ferma si disegna una volta sopra il gradiente e si copia (meno pixel da
    // riempire a ogni fotogramma); con la camera che segue o gira (servizio, schiacciata, presa) a ogni fotogramma
    const C = CAMERAS[this.id] || CAMERAS.ready, still = !C.follow && !C.views, key = `${this.id}|${this.grip}|${this.hand}`;
    if (still && this._floorKey !== key){
      const fl = this._floor ||= document.createElement('canvas'); fl.width = this.canvas.width; fl.height = this.canvas.height;
      const x = fl.getContext('2d', { alpha: false }); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(this._bg, 0, 0);
      x.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); this._floorDraw(x, cam, y0, sq); this._floorKey = key;
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(still ? this._floor : this._bg, 0, 0); c.restore();
    if (!still) this._floorDraw(c, cam, y0, sq);
    // ombra morbida della mano sul piano
    const X = [pose.pos[0], y0, pose.pos[2]];
    if (cam.depth(X) < .3) return;
    const o = cam.p(X), r = cam.rad(X, .16);
    c.save();
    const sg = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
    sg.addColorStop(0, 'rgba(2,6,20,.4)'); sg.addColorStop(1, 'rgba(2,6,20,0)');
    c.translate(o.x, o.y); c.scale(1, sq*.8); c.translate(-o.x, -o.y); c.fillStyle = sg; c.beginPath(); c.arc(o.x, o.y, r, 0, 2*Math.PI); c.fill();
    c.restore();
  }
  // alone del piano attorno al punto sotto la mano (ellisse schiacciata dalla prospettiva) e tratto della linea di fondo
  // campo davanti ai piedi, che sfuma ai lati
  _floorDraw(c, cam, y0, sq){
    const st = this.st, R0 = [SHOULDER_X, y0, -.25];
    if (cam.depth(R0) <= .3) return;
    const q0 = cam.p(R0), rr = cam.rad(R0, .75), ag = c.createRadialGradient(q0.x, q0.y, 0, q0.x, q0.y, rr);
    ag.addColorStop(0, 'rgba(90,130,235,.16)'); ag.addColorStop(1, 'rgba(90,130,235,0)');
    c.save(); c.translate(q0.x, q0.y); c.scale(1, sq); c.translate(-q0.x, -q0.y); c.fillStyle = ag; c.beginPath(); c.arc(q0.x, q0.y, rr, 0, 2*Math.PI); c.fill(); c.restore();
    const A = [SHOULDER_X - .6, y0, -.35], B = [SHOULDER_X + .6, y0, -.35];
    if (cam.depth(A) > .3 && cam.depth(B) > .3){
      const pa = cam.p(A), pb = cam.p(B), lg = c.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
      lg.addColorStop(0, 'rgba(225,235,255,0)'); lg.addColorStop(.5, 'rgba(225,235,255,.17)'); lg.addColorStop(1, 'rgba(225,235,255,0)');
      c.save(); c.beginPath(); c.moveTo(pa.x, pa.y); c.lineTo(pb.x, pb.y); c.lineCap = 'round'; c.lineWidth = Math.max(1.5, st.ow*1.5); c.strokeStyle = lg; c.stroke(); c.restore();
    }
  }
  // fantasma: sagoma a contorno disegnata una volta per scheda e misura e poi copiata; con la camera che segue (che si
  // sposta senza girare né cambiare focale) la copia si sposta di quanto si sposta la proiezione del telefono
  _ghost(c, cam, g, H_){
    const st = this.st, key = `${this.grip}|${g.i}`;
    const kp = this._keyPose(g.k), pose = this.hand === 'left' ? { pos: mirrorPos(kp.pos), q: mirrorQ(kp.q) } : kp;
    let cached = this._ghosts.get(key);
    if (!cached){
      const G = st.ghost, x = G.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, G.width, G.height); x.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      const F = drawGhostInto(x, cam, pose, st, H_, 'rgba(214,228,255,1)'), R = F.rect;
      const cv = document.createElement('canvas'); cv.width = R.w; cv.height = R.h;
      cv.getContext('2d').drawImage(G, R.x, R.y, R.w, R.h, 0, 0, R.w, R.h);
      cached = { cv, R, F, ref: cam.p(pose.pos) }; this._ghosts.set(key, cached);
    }
    const now = cam.p(pose.pos), dx = (now.x - cached.ref.x)*st.dpr, dy = (now.y - cached.ref.y)*st.dpr;
    const R = cached.R;
    g.F = { ...cached.F, rect: { ...R, x: R.x + dx, y: R.y + dy } };
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = .38*g.a;
    c.drawImage(cached.cv, Math.round(R.x + dx), Math.round(R.y + dy));
    c.restore();
  }
  _keyPose(k){ return gesturePose(this.id, k.t, { hand: this.hand, grip: this.grip }); }
  // etichetta numerata del fantasma: vicino al suo fantasma (cima o centro del telefono) e mai sopra il soggetto vivo
  // (sagoma vera: telefono, palmo, dita, avambraccio, non il suo rettangolo) né sopra le altre etichette. Il posto si
  // sceglie UNA volta, quando il fantasma compare, guardando il soggetto vivo per tutto il tempo in cui il fantasma resta
  // (12 istanti fino al ritorno e il contatto): poi l'etichetta resta attaccata al suo fantasma (con la camera che segue si sposta con
  // lui) invece di saltare da un lato all'altro a ogni fotogramma (revisione artistica: salti fino a 200 px). Se il
  // fantasma esce dallo stadio (camera che segue) l'etichetta si spegne con lui.
  _ghostLabel(c, cam, g, F, u, taken){
    const st = this.st, kp = this._keyPose(g.k), pose = this.hand === 'left' ? { pos: mirrorPos(kp.pos), q: mirrorQ(kp.q) } : kp;
    const anchors = K => [K.p(tipOf(pose, 1.1)), K.p(pose.pos)];
    const box = { x0: 6, x1: st.W - 6, y0: 6, y1: st.H*(1 - HUD_H) - 6 };
    c.save(); c.font = `700 ${u}px Barlow, sans-serif`;
    const h = Math.round(u*1.75), w = c.measureText(g.k.label).width + u*1.2 + h;
    c.restore();
    const place = (A, ox, oy) => { const x0 = Math.max(box.x0, Math.min(box.x1 - w, A.x + ox)), y0 = Math.max(box.y0, Math.min(box.y1 - h, A.y + oy)); return { x0, y0, x1: x0 + w, y1: y0 + h }; };
    const cached = this._ghosts.get(`${this.grip}|${g.i}`);
    let L = cached?.label;
    if (!L){
      const P = motion(this.id, this.grip).P, tn = this._tNow ?? 0, t0 = Math.max(tn, g.k.t + .05), t1 = Math.max(t0, P.T.home);
      const samples = [...Array.from({ length: 12 }, (_, j) => t0 + (t1 - t0)*j/11), ...(P.contact > t0 && P.contact < t1 ? [P.contact] : [])].map(ts => {
        const K = this._cam(ts), lp = this.pose(ts), R = this.hand === 'left' ? { ...lp, pos: mirrorPos(lp.pos), q: mirrorQ(lp.q) } : lp;
        return { A: anchors(K), occ: liveTest(figure(K, R, st, handFor(this.grip))) };
      });
      samples.push({ A: anchors(cam), occ: liveTest(F) });
      const over = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0))*Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
      const now = anchors(cam);
      for (let ai = 0; ai < 2; ai++) for (let k = 0; k < 8; k++){
        const ang = k/8*2*Math.PI, ex = Math.cos(ang), ey = Math.sin(ang);
        for (const dist of [1, 2.2, 3.6, 5]){
          const align = ex > .3 ? 'left' : ex < -.3 ? 'right' : 'center', x = ex*u*dist, y = ey*u*dist*.9 + (align === 'center' ? ey*h*.6 : 0);
          const ox = align === 'center' ? x - w/2 : align === 'right' ? x - w : x, oy = y - h/2;
          let sum = 0, worst = 0;
          for (const S of samples){ const v = S.occ(place(S.A[ai], ox, oy))/21; sum += v; worst = Math.max(worst, v); }
          const r = place(now[ai], ox, oy), A = now[ai], cx = Math.max(r.x0, Math.min(r.x1, A.x)), cy = Math.max(r.y0, Math.min(r.y1, A.y));
          const cc = sum/samples.length*2 + worst*8 + taken.reduce((m, b) => m + over(r, b)/(w*h)*3, 0) + Math.hypot(cx - A.x, cy - A.y)/Math.max(st.W, st.H)*2.5 + (ai ? .04 : 0);
          if (!L || cc < L.cc) L = { ai, ox, oy, cc };
        }
      }
      if (cached) cached.label = L;
    }
    const A = anchors(cam)[L.ai], r0 = place(A, L.ox, L.oy);
    const edge = Math.min(A.x, st.W - A.x, A.y, st.H*(1 - HUD_H) - A.y), vis = sstep(-2*u, u, edge);
    if (vis <= .01) return;
    c.save(); c.globalAlpha = Math.min(1, g.a*1.4)*vis;
    const r = pill(c, st, r0.x0, (r0.y0 + r0.y1)/2, g.k.label, { num: String(g.i + 1), size: u, box, align: 'left' });
    c.restore();
    g.labelBox = r; taken.push({ x0: r.x0, y0: r.y0, x1: r.x0 + r.w, y1: r.y0 + r.h });
  }
  // banda bassa: fase scritta e velocità di riproduzione, curva della velocità di rotazione del telefono con il picco =
  // impatto e la testina. La parte ferma (fondo, curva, picco, scritte fisse) si disegna una volta per scheda e misura
  _hudLayout(M, u){
    const st = this.st, W = st.W, H = st.H, y0 = H*(1 - HUD_H), h = H*HUD_H, x0 = Math.max(10, W*.03), big = Math.round(Math.min(h*.5, u*2.1));
    const c = this.ctx; c.save();
    c.font = `600 ${Math.round(u)}px Barlow, sans-serif`; const rw = c.measureText('Rallentato ×0,5').width;
    c.font = `italic 800 ${big}px "Barlow Condensed", sans-serif`; const pw = c.measureText('BRACCIO IN ALTO').width;
    c.restore();
    const cx0 = x0 + Math.max(rw, pw) + u*1.2, cx1 = W - Math.max(10, W*.03), cy1 = y0 + h*.84, cy0 = y0 + h*.2, vmax = Math.max(820, M.peak*1.05);
    return { W, H, y0, h, x0, big, cx0, cx1, cy0, cy1, X: i => cx0 + (cx1 - cx0)*i/M.n, Y: v => cy1 - (cy1 - cy0)*Math.min(1, v/vmax), curve: cx1 - cx0 > 60 };
  }
  _hudStatic(M, L, u){
    const st = this.st, key = `${this.id}|${this.grip}|${st.W}x${st.H}@${st.dpr}`;
    if (this._hudKey === key) return this._hudCv;
    const top = Math.max(0, Math.floor((L.y0 - L.h*.35)*st.dpr)), cv = this._hudCv ||= document.createElement('canvas');
    cv.width = Math.round(st.W*st.dpr); cv.height = Math.max(1, Math.round(st.H*st.dpr) - top); cv.top = top;
    const c = cv.getContext('2d'); c.setTransform(st.dpr, 0, 0, st.dpr, 0, -top);
    const g = c.createLinearGradient(0, L.y0 - L.h*.35, 0, L.H); g.addColorStop(0, 'rgba(5,10,28,0)'); g.addColorStop(.35, 'rgba(5,10,28,.8)'); g.addColorStop(1, 'rgba(5,10,28,.94)');
    c.fillStyle = g; c.fillRect(0, L.y0 - L.h*.35, L.W, L.h*1.35);
    if (L.curve){
      const { X, Y, cx0, cx1, cy0, cy1 } = L;
      c.beginPath(); c.moveTo(X(0), cy1); for (let i = 0; i <= M.n; i += 2) c.lineTo(X(i), Y(M.speed[i])); c.lineTo(X(M.n), cy1); c.closePath();
      const fg = c.createLinearGradient(0, cy1, 0, cy0); fg.addColorStop(0, 'rgba(47,107,255,.12)'); fg.addColorStop(1, 'rgba(227,255,54,.45)');
      c.fillStyle = fg; c.fill();
      c.beginPath(); for (let i = 0; i <= M.n; i += 2){ const x = X(i), y = Y(M.speed[i]); i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.lineWidth = Math.max(1.4, u*.13); c.strokeStyle = 'rgba(227,255,54,.9)'; c.stroke();
      c.beginPath(); c.moveTo(cx0, cy1 + .5); c.lineTo(cx1, cy1 + .5); c.lineWidth = 1; c.strokeStyle = 'rgba(176,194,255,.35)'; c.stroke();
      const px = X(M.peakI), py = Y(M.peak);
      c.beginPath(); c.moveTo(px, cy1); c.lineTo(px, py); c.setLineDash([3, 3]); c.strokeStyle = 'rgba(227,255,54,.65)'; c.stroke(); c.setLineDash([]);
      c.font = `700 ${Math.round(u)}px Barlow, sans-serif`; c.textBaseline = 'middle'; c.fillStyle = '#e3ff36';
      // la scritta del picco sta tutta a destra o tutta a sinistra del picco (mai sopra la testina): se non entra si accorcia
      const gap = u*.75, full = `Picco = impatto · ${Math.round(M.peak/10)*10} °/s`;
      for (const txt of [full + versusForehand(this.id), full, 'Picco = impatto']){
        const tw = c.measureText(txt).width, rightOk = px + gap + tw <= cx1, leftOk = px - gap - tw >= cx0;
        if (!rightOk && !leftOk && txt !== 'Picco = impatto') continue;
        const right = !rightOk && leftOk; c.textAlign = right ? 'right' : 'left';
        c.fillText(txt, right ? px - gap : Math.min(px + gap, cx1 - tw), Math.max(L.y0 + u*.7, py - u*.1));
        break;
      }
      // nome dell'asse, solo se c'è posto
      c.font = `600 ${Math.round(u)}px Barlow, sans-serif`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = '#9aa7cf';
      const axis = 'Velocità di rotazione del telefono';
      if (c.measureText(axis).width < (cx1 - cx0)*.6 && cy1 + 3 + u <= L.H - 2) c.fillText(axis, cx0, cy1 + 3);
    }
    this._hudKey = key;
    return cv;
  }
  _hud(c, M, t, pose, u){
    const st = this.st, P = M.P, L = this._hudLayout(M, u), cv = this._hudStatic(M, L, u);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(cv, 0, cv.top); c.restore();
    // fase scritta, grande, in basso a sinistra («Impatto» in giallo per ±30 ms attorno al contatto)
    const label = pose.label || '', hit = pose.phase === 'impatto', { x0, y0, h, big } = L;
    c.save(); c.textBaseline = 'alphabetic'; c.font = `italic 800 ${big}px "Barlow Condensed", sans-serif`;
    c.fillStyle = hit ? '#e3ff36' : '#f4f6fc'; c.fillText(label.toUpperCase(), x0, y0 + h*.12 + big*.82);
    c.fillStyle = '#c3cce8'; c.font = `600 ${Math.round(u)}px Barlow, sans-serif`;
    c.fillText(fmtRate(this._rateLabel ?? this.rate()), x0, Math.min(L.H - 6, y0 + h*.12 + big*.82 + u*1.35));
    if (L.curve){
      const hi = Math.min(M.n, Math.round(t/P.total*M.n)), hx = L.X(hi), hy = L.Y(M.speed[hi]), near = Math.abs(t - P.contact) <= .03;
      c.beginPath(); c.moveTo(hx, L.cy0 - 4); c.lineTo(hx, L.cy1); c.lineWidth = Math.max(1.2, u*.12); c.strokeStyle = 'rgba(244,246,252,.85)'; c.stroke();
      c.beginPath(); c.arc(hx, hy, (near ? .55 : .38)*u, 0, 2*Math.PI); c.fillStyle = near ? '#e3ff36' : '#f4f6fc'; c.fill();
    }
    c.restore();
  }
  _stillHud(c, u){
    const st = this.st;
    pill(c, st, st.W/2, st.H - u*1.6, 'Fermo e rilassato: è la posa di partenza di ogni colpo', { size: u, bg: 'rgba(8,14,40,.7)' });
  }
  // presa: le due viste con i richiami (pollice, dita, schermo; di lato palmo e cima in avanti)
  _grip(c, cam, pose, t, u){
    const st = this.st, H_ = handFor(this.grip), F = drawFigure(c, cam, pose, st, H_), rig = F.rig;
    this.info = { t, cam, pose: this.pose(t), figure: F };
    if (this.compact) return;
    const T = v => add(pose.pos, qrot(pose.q, v)), mirror = this.hand === 'left';
    const a = cam.view, palm = this.grip === 'palmo';
    const notesA = [
      { X: rig.thumb.pts[2], text: palm ? 'Pollice lungo il bordo' : 'Pollice chiuso sul bordo', dx: 1, dy: -.45 },
      { X: rig.fingers[1].pts[3], text: palm ? 'Dita sul bordo, non sullo schermo' : 'Dita attorno alla parte bassa', dx: -1, dy: .4 },
      { X: T([0, .035, HD]), text: palm ? 'Schermo verso di te' : 'Display di lato', dx: -1, dy: -.7 },
    ];
    const notesB = [
      { X: rig.heel[2].p, text: palm ? 'Dorso del telefono nel palmo' : 'Come il manico di un martello', dx: 1, dy: .5 },
      { X: T([0, HH, 0]), text: 'Cima in avanti e in alto', dx: -1, dy: -.45 },
    ];
    const C = CAMERAS.grip, P = C.seq.reduce((x, y) => x + y, 0), uu = ((t % P) + P) % P;
    const showA = sstep(.15, .45, uu)*(1 - sstep(C.seq[0] - .3, C.seq[0], uu));
    const b0 = C.seq[0] + C.seq[1], showB = sstep(b0 + .15, b0 + .45, uu)*(1 - sstep(b0 + C.seq[2] - .3, b0 + C.seq[2], uu));
    for (const [notes, show] of [[notesA, showA], [notesB, showB]]){
      if (show <= .01) continue;
      c.save(); c.globalAlpha = show;
      notes.forEach((n, i) => {
        const p = cam.p(n.X), dx = mirror ? -n.dx : n.dx, lx = p.x + dx*st.W*.16, ly = p.y + n.dy*st.H*.15;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(lx - dx*6, ly); c.lineWidth = 1.5; c.strokeStyle = 'rgba(244,246,252,.8)'; c.stroke();
        c.beginPath(); c.arc(p.x, p.y, Math.max(3.5, u*.32), 0, 2*Math.PI); c.fillStyle = '#e3ff36'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#0a1330'; c.stroke();
        pill(c, st, lx, ly, n.text, { size: u, num: String(i + 1), align: dx > 0 ? 'left' : 'right' });
      });
      c.restore();
    }
    pill(c, st, st.W/2, st.H - u*1.5, a < .5 ? 'Come la vedi tu' : 'Di lato: la cima in avanti', { size: u, bg: 'rgba(8,14,40,.7)' });
  }
  dispose(){
    this.stop(); this.canvas?.remove?.();
    for (const [k, v] of instances) if (v === this) instances.delete(k);
  }
}

// istanze per chiave: 'main' (modale e Allenamento), 'p1'/'p2' (metà dello stesso schermo): niente WebGL, ognuna la sua
const instances = new Map();
export function getGestureDemo(key = 'main'){
  if (!instances.has(key)) instances.set(key, new NatpfGestureDemo());
  return instances.get(key);
}
