// Prototipo B9 «motion design illustrato» — MOTO (puro: niente DOM, niente three.js; si importa anche da Node).
//
// Il telefono si muove SOLO con i parametri verificati di natpf_gesture_motion.js (asse, verso, picco, durata della
// parte veloce, polso, presa GRIP_POSE): cambiano soltanto la messa in scena dei tempi (preparazione con anticipo,
// niente fermi morti, ritorno morbido) e il raggio del braccio (K), come chiede docs/b9/specifica-gesti.md §2–§3:
//  - parte veloce: legge cicloidale peak·sin²(πu) (accelerazione = 1/2 della durata), picco = contatto con la palla;
//  - preparazione: profilo 12u²(1−u) (parte da fermo, arriva al caricamento con una decelerazione finita: niente
//    «fermo» prima del colpo), picco ≤ 200 °/s (pallonetto ≤ 100, palla corta ≤ 150, servizio ≤ 60 nel contesto serve);
//  - fermo in fine colpo 0,14–0,16 s, ritorno a minimo jerk entro 0,6 s dall'impatto con picco ≤ 250 °/s;
//  - posizione: dalla posizione di partenza comune (§2.2) al percorso del colpo durante la preparazione (solo
//    traslazione, nessuna rotazione in più) e ritorno nel ritorno.
// gesturePose(id, t, { hand }) è la funzione campionabile proposta in specifica-gesti.md §6: verifica.mjs la fa leggere al
// telefono simulato completo (rilevatore, forma del colpo, calibrazione, gioco), il disegno (main.js) disegna la stessa.
//
// Campo: x a destra, y in alto, −z verso lo schermo del computer; giocatore destro (il mancino è lo specchio esatto).
// Telefono: y = cima, +z = normale dello schermo, +x = bordo destro guardando lo schermo.
import { GESTURES, GRIP_POSE } from '../../src/natpf/natpf_gesture_motion.js';

export const D = Math.PI/180;
export const SHOULDER = Object.freeze([.19, 1.42, 0]);       // spalla destra (m, dal centro dei piedi), come il modello attuale
export const K = .8;                                          // raggio spalla → telefono = 0,8 × rc: gomito piegato ~120–135°
export const READY = Object.freeze([.05, -.42, -.30]);       // telefono rispetto alla spalla nella posizione di partenza (§2.2)
export const PHONE = Object.freeze({ w: .079, h: .162, d: .0086, r: .0105 });   // 162 × 79 × 8,6 mm

/* ---------- vettori e quaternioni [x, y, z, w] ---------- */
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0]*k, a[1]*k, a[2]*k];
export const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
export const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const norm = a => { const l = len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
export const lerp = (a, b, u) => [a[0] + (b[0] - a[0])*u, a[1] + (b[1] - a[1])*u, a[2] + (b[2] - a[2])*u];
export const qmul = (a, b) => [
  a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
  a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
  a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
  a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
export const qconj = q => [-q[0], -q[1], -q[2], q[3]];
export const qaxis = (ax, ang) => { const l = len(ax) || 1, s = Math.sin(ang/2)/l; return [ax[0]*s, ax[1]*s, ax[2]*s, Math.cos(ang/2)]; };
export const qrot = (q, v) => {
  const [x, y, z, w] = q, tx = 2*(y*v[2] - z*v[1]), ty = 2*(z*v[0] - x*v[2]), tz = 2*(x*v[1] - y*v[0]);
  return [v[0] + w*tx + y*tz - z*ty, v[1] + w*ty + z*tx - x*tz, v[2] + w*tz + x*ty - y*tx];
};
export function qslerp(a, b, u){
  let c = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3], bb = b;
  if (c < 0){ c = -c; bb = b.map(v => -v); }
  if (c > .9995){ const r = a.map((v, i) => v + (bb[i] - v)*u), l = Math.hypot(...r); return r.map(v => v/l); }
  const th = Math.acos(c), s = Math.sin(th), ka = Math.sin((1 - u)*th)/s, kb = Math.sin(u*th)/s;
  return a.map((v, i) => v*ka + bb[i]*kb);
}
// velocità angolare (°/s, campo) che porta qa in qb in dt secondi
export function omega(qa, qb, dt){
  let d = qmul(qb, qconj(qa)); if (d[3] < 0) d = d.map(v => -v);
  const s = Math.hypot(d[0], d[1], d[2]); if (s < 1e-12) return [0, 0, 0];
  const ang = 2*Math.atan2(s, d[3]);
  return [d[0]/s*ang/dt/D, d[1]/s*ang/dt/D, d[2]/s*ang/dt/D];
}
export const rotateAbout = (v, axis, ang) => qrot(qaxis(axis, ang), v);

// presa nel palmo (GRIP_POSE.palmo, Euler XYZ come three.js: q = qX·qY·qZ): cima 39° sopra l'orizzontale, in avanti e
// verso l'interno; schermo verso il viso, 40° verso l'alto
const E0 = GRIP_POSE.palmo.euler;
export const Q0 = qmul(qmul(qaxis([1, 0, 0], E0[0]*D), qaxis([0, 1, 0], E0[1]*D)), qaxis([0, 0, 1], E0[2]*D));

/* ---------- profili di velocità ---------- */
const clamp01 = u => u < 0 ? 0 : u > 1 ? 1 : u;
export const mj = u => { u = clamp01(u); return u*u*u*(10 - 15*u + 6*u*u); };          // minimo jerk (5,77 D/T² di picco)
export const prepEase = u => { u = clamp01(u); return u*u*u*(4 - 3*u); };               // 12u²(1−u): parte da fermo, arriva decelerando
const bell = (u) => { u = clamp01(u); return u - Math.sin(2*Math.PI*u)/(2*Math.PI); };  // ∫ 2 sin²(πu) du: 0 → 1
// polso come natpf_gesture_motion.wristAngle: wrist·sin²(π(1,4u − 0,2)) nella seconda metà del colpo
const wristAt = (s, u) => { const a = clamp01(u*1.4 - .2); return s.wrist*(s.ms/1000)/1.4*(a/2 - Math.sin(2*Math.PI*a)/(4*Math.PI)); };

/* ---------- inviluppi dei tempi (s, tempo reale) ---------- */
// hold: fermo iniziale (respiro), prep: preparazione, follow: fermo dopo il colpo, back: ritorno, rest: fermo finale
// trunk: rotazione del busto (gradi per grado del braccio attorno alla verticale), solo nel disegno (spalla)
export const ENV = Object.freeze({
  forehand: { hold: .35, prep: .55, follow: .14, back: .5, rest: .45, trunk: .32, label: 'Dritto' },
  backhand: { hold: .35, prep: .55, follow: .14, back: .5, rest: .45, trunk: .3, label: 'Rovescio' },
  lob:      { hold: .3, prep: .85, follow: .16, back: .55, rest: .4, trunk: 0, label: 'Pallonetto' },
  drop:     { hold: .4, prep: .42, follow: .2, back: .48, rest: .45, trunk: 0, label: 'Palla corta' },
});

export const STROKE_IDS = Object.freeze(['forehand', 'backhand', 'lob', 'drop']);
export const IDS = Object.freeze(['grip', 'forehand', 'backhand', 'serve', 'lob', 'drop']);

const SH = SHOULDER;
const readyPos = () => add(SH, READY);

// piano di un colpo: tappe e funzioni del moto del telefono (destro)
function strokePlan(id){
  const g = GESTURES[id], s = g.stroke, e = ENV[id];
  const ms = s.ms/1000, travel = s.peak*ms/2, H = travel/2;
  const A = norm(s.axis), WA0 = s.wristAxis ? norm(s.wristAxis) : null;
  const T = {}; T.hold = e.hold; T.load = T.hold + e.prep; T.contact = T.load + ms/2; T.end = T.load + ms;
  T.back = T.end + e.follow; T.home = T.back + e.back; T.total = T.home + e.rest;
  const wFull = s.wrist ? wristAt(s, 1) : 0;
  // angolo del braccio φ (gradi; 0 = posa d'impatto = posa di partenza) e del polso ψ, peso della posizione sul percorso
  const at = t => {
    if (t <= T.hold) return { phi: 0, psi: 0, on: 0, phase: 'ready', u: t/T.hold };
    if (t <= T.load){ const u = (t - T.hold)/e.prep; return { phi: -H*prepEase(u), psi: 0, on: mj(u), phase: 'prep', u }; }
    if (t <= T.end){ const u = (t - T.load)/ms; return { phi: -H + travel*bell(u), psi: s.wrist ? wristAt(s, u) : 0, on: 1, phase: 'swing', u }; }
    if (t <= T.back) return { phi: H, psi: wFull, on: 1, phase: 'follow', u: (t - T.end)/e.follow };
    if (t <= T.home){ const u = (t - T.back)/e.back, k = 1 - mj(u); return { phi: H*k, psi: wFull*k, on: k, phase: 'back', u }; }
    return { phi: 0, psi: 0, on: 0, phase: 'rest', u: (t - T.home)/e.rest };
  };
  const rc = mul(s.rc, K), P0 = readyPos();
  const pose = t => {
    const a = at(t), f = a.phi*D;
    let q = qmul(qaxis(A, f), Q0);
    if (WA0 && a.psi) q = qmul(qaxis(rotateAbout(WA0, A, f), a.psi*D), q);
    const onPath = add(SH, rotateAbout(rc, A, f));
    const breath = (a.phase === 'ready' || a.phase === 'rest') ? Math.sin(t*2*Math.PI/1.6)*.004 : 0;
    const pos = lerp(P0, onPath, a.on); pos[1] += breath;
    // busto: ruota con la componente verticale del braccio (solo la spalla disegnata)
    const yaw = (e.trunk || 0)*a.phi*Math.sign(A[1] || 1)*D;
    return { pos, q, phase: a.phase, u: a.u, trunk: yaw };
  };
  const keys = [
    { t: T.load, label: 'Carica' },
    { t: T.contact, label: 'Impatto' },
    { t: T.end + .02, label: 'Fine' },
  ];
  return { id, T, pose, keys, contact: T.contact, total: T.total, peak: s.peak, H, travel, ball: g.ball || 'ground' };
}

// Servizio continuo (specifica §2.5, prototipo servizio-continuo.mjs): lancio → braccio sopra la testa con il telefono che
// ruota appena → battuta 0,69 s dopo il picco del lancio, al colmo della palla → ritorno lento.
function servePlan(){
  const g = GESTURES.serve, ts = g.toss, hs = g.stroke;
  const tMs = ts.ms/1000, hMs = hs.ms/1000, tTravel = ts.peak*tMs/2, hTravel = hs.peak*hMs/2;
  const tH = tTravel/2, hH = hTravel/2, At = norm(ts.axis), Ah = norm(hs.axis);
  const T = { hold: .3, prep: 1.0 }; T.load = T.hold + T.prep; T.tossPeak = T.load + tMs/2; T.tossEnd = T.load + tMs;
  T.contact = T.tossPeak + .69; T.hitStart = T.contact - hMs/2; T.end = T.hitStart + hMs;
  T.linkStart = T.tossEnd + .02; T.linkEnd = T.hitStart - .02;
  T.back = T.end + .16; T.home = T.back + .95; T.total = T.home + .4;
  const rcT = mul(ts.rc, K), rcH = mul(hs.rc, K), P0 = readyPos();
  const tossPose = deg => ({ pos: add(SH, rotateAbout(rcT, At, deg*D)), q: qmul(qaxis(At, deg*D), Q0) });
  const hitPose = deg => ({ pos: add(SH, rotateAbout(rcH, Ah, deg*D)), q: qmul(qaxis(Ah, deg*D), Q0) });
  const A = tossPose(tH), B = hitPose(-hH), E = hitPose(hH), L0 = tossPose(-tH);
  // raccordo: la mano sale sopra la testa passando un poco all'esterno (arco), il telefono ruota appena (slerp)
  const arc = (a, b, u) => { const p = lerp(a, b, u), lift = Math.sin(Math.PI*u)*.05; return [p[0] + lift*.6, p[1], p[2] + lift]; };
  const pose = t => {
    let s, phase, u = 0;
    if (t <= T.hold){ s = { pos: P0, q: Q0 }; phase = 'ready'; u = t/T.hold; }
    else if (t <= T.load){
      u = (t - T.hold)/T.prep; const k = mj(u), L = tossPose(-tH*prepEase(u));
      s = { pos: lerp(P0, L.pos, k), q: L.q }; phase = 'prep';
    } else if (t <= T.tossEnd){ u = (t - T.load)/tMs; s = tossPose(-tH + tTravel*bell(u)); phase = 'toss'; }
    else if (t <= T.linkStart){ s = A; phase = 'link'; }
    else if (t <= T.linkEnd){ u = (t - T.linkStart)/(T.linkEnd - T.linkStart); const k = mj(u); s = { pos: arc(A.pos, B.pos, k), q: qslerp(A.q, B.q, k) }; phase = 'link'; }
    else if (t <= T.hitStart){ s = B; phase = 'link'; }
    else if (t <= T.end){ u = (t - T.hitStart)/hMs; s = hitPose(-hH + hTravel*bell(u)); phase = 'swing'; }
    else if (t <= T.back){ s = E; phase = 'follow'; u = (t - T.end)/(T.back - T.end); }
    else if (t <= T.home){ u = (t - T.back)/(T.home - T.back); const k = mj(u); s = { pos: lerp(E.pos, P0, k), q: qslerp(E.q, Q0, k) }; phase = 'back'; }
    else { s = { pos: P0, q: Q0 }; phase = 'rest'; u = (t - T.home)/(T.total - T.home); }
    const breath = (phase === 'ready' || phase === 'rest') ? Math.sin(t*2*Math.PI/1.6)*.004 : 0;
    return { pos: [s.pos[0], s.pos[1] + breath, s.pos[2]], q: s.q, phase, u, trunk: 0 };
  };
  void L0;
  const keys = [
    { t: T.tossEnd, label: 'Lancio' },
    { t: T.hitStart, label: 'Carica' },
    { t: T.contact, label: 'Impatto' },
  ];
  return { id: 'serve', T, pose, keys, contact: T.contact, tossPeak: T.tossPeak, total: T.total, peak: hs.peak, ball: 'toss' };
}

// presa: ferma (la camera gira, non la mano)
function gripPlan(){
  const P0 = readyPos();
  const pose = t => ({ pos: [P0[0], P0[1] + Math.sin(t*2*Math.PI/2.4)*.003, P0[2]], q: Q0, phase: 'still', u: 0, trunk: 0 });
  return { id: 'grip', T: { total: 8 }, pose, keys: [], contact: null, total: 8, still: true };
}

const plans = new Map();
export function plan(id){
  if (!plans.has(id)) plans.set(id, id === 'grip' ? gripPlan() : id === 'serve' ? servePlan() : strokePlan(id));
  return plans.get(id);
}
const mirrorP = p => [-p[0], p[1], p[2]];
const mirrorQ = q => [q[0], -q[1], -q[2], q[3]];
// Posa del telefono al tempo t (s, tempo reale del gesto): { pos (centro del telefono, m, campo), q (telefono → campo),
// phase, u, trunk, contact }. Il mancino è lo specchio esatto (posizioni x → −x; rotazioni (x, −y, −z, w)).
export function gesturePose(id, t, { hand = 'right' } = {}){
  const P = plan(id), tt = ((t % P.total) + P.total) % P.total, p = P.pose(tt);
  if (hand !== 'left') return { ...p, contact: P.contact };
  return { ...p, pos: mirrorP(p.pos), q: mirrorQ(p.q), trunk: -p.trunk, contact: P.contact };
}
// velocità di rotazione del telefono (°/s) al tempo t, per l'indicatore e la scia
export function rotSpeed(id, t, hand = 'right'){
  const h = 1/240, a = gesturePose(id, t - h/2, { hand }).q, b = gesturePose(id, t + h/2, { hand }).q;
  return len(omega(a, b, h));
}

/* ---------- palla ---------- */
const G = 9.81, R_BALL = .034;
export const BALL_R = R_BALL;
// palla dei colpi: arriva da lontano con un rimbalzo e incontra la cima del telefono nell'istante del picco
// (= contatto); poi riparte nella direzione del colpo. Restituisce la posizione (m, campo) o null.
export function strokeBall(id, t, contactPoint, { hand = 'right' } = {}){
  const P = plan(id); if (!P.contact) return null;
  const m = hand === 'left' ? -1 : 1, C = contactPoint, tc = P.contact;
  const dt = t - tc;
  if (dt < 0){
    // in arrivo: rimbalzo a ~3 m davanti, 0,42 s prima del contatto; partenza 1,0 s prima, da ~9 m
    const tb = .42, ta = 1.0; if (-dt > ta) return null;
    const B = [C[0] - .35*m, R_BALL, C[2] - 3.0], A = [C[0] - .9*m, 1.1, C[2] - 9];
    if (-dt <= tb){
      const u = (tb + dt)/tb, x = B[0] + (C[0] - B[0])*u, z = B[2] + (C[2] - B[2])*u;
      const vy = (C[1] - R_BALL + .5*G*tb*tb)/tb, s = tb + dt;
      return [x, R_BALL + vy*s - .5*G*s*s, z];
    }
    const span = ta - tb, s = (ta + dt), u = s/span, x = A[0] + (B[0] - A[0])*u, z = A[2] + (B[2] - A[2])*u;
    const vy = (R_BALL - A[1] + .5*G*span*span)/span;
    return [x, A[1] + vy*s - .5*G*s*s, z];
  }
  if (dt > .75) return null;
  // in uscita: dritto/rovescio avanti e un poco incrociato, pallonetto alto, palla corta morbida e corta
  const v = id === 'lob' ? [.4*m, 7.2, -6.5] : id === 'drop' ? [.2*m, 2.6, -3.2] : id === 'backhand' ? [.9*m, 2.2, -13] : [-1.2*m, 2.4, -14];
  return [C[0] + v[0]*dt, C[1] + v[1]*dt - .5*G*dt*dt, C[2] + v[2]*dt];
}
// palla del servizio: lasciata alla fine del lancio dalla cima del telefono, colmo nell'istante della battuta, dove la
// incontra la cima del telefono (gravità scalata: la modale scala l'altezza, mai il tempo — specifica §2.5)
export function serveBall(t, releasePoint, apexPoint){
  const P = plan('serve'), T = P.T;
  if (t < T.tossEnd - .001) return null;
  if (t <= T.contact){
    const span = T.contact - T.tossEnd, g = 2*Math.max(.2, apexPoint[1] - releasePoint[1])/(span*span), s = T.contact - t;
    const u = (t - T.tossEnd)/span;
    return [releasePoint[0] + (apexPoint[0] - releasePoint[0])*u, apexPoint[1] - .5*g*s*s, releasePoint[2] + (apexPoint[2] - releasePoint[2])*u];
  }
  const dt = t - T.contact; if (dt > .6) return null;
  return [apexPoint[0] - .3*dt, apexPoint[1] + 1.2*dt - .5*G*dt*dt, apexPoint[2] - 16*dt];
}
