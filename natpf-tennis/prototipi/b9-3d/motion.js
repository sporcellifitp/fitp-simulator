// Prototipo B9 «3D realistico» — moto del telefono, funzione PURA (niente DOM, niente three.js): è la stessa che
// disegna main.js e che la verifica «posa → sensori» (docs/b9/specifica-gesti.md §6) fa leggere al telefono simulato.
//
//   gesturePose(id, t, { hand }) → { pos: [x, y, z] m nel campo, q: [x, y, z, w] telefono → campo, phase, speed, ... }
//
// Campo: x a destra, y in alto, −z verso lo schermo del computer (giocatore destro; il mancino è lo specchio esatto).
// Telefono: y cima, +z normale dello schermo, +x bordo destro guardando lo schermo (come natpf_gesture_demo.js).
//
// Da natpf_gesture_motion.js si prendono, senza cambiarli, gli ingredienti verificati di ogni colpo: asse di
// rotazione, picco, durata della parte veloce, vettore spalla → mano all'impatto (rc), polso. Cambia solo la messa in
// scena del tempo, secondo la specifica dei gesti (§2–3): preparazione con picco limitato e inversione senza fermo
// (la velocità passa per zero con pendenza finita, come un pendolo), accelerazione nel 45% della parte veloce con il
// picco all'impatto, accompagnamento più lungo, assestamento, ritorno entro 0,6 s con picco ≤ 200 °/s.
// Il raggio spalla → mano è scalato (REACH) perché il gomito resti piegato in modo naturale: la specifica misura che il
// riconoscimento non dipende dal raggio tra 0,29 e 0,90 m (raggio.mjs).
import { GESTURES, GRIP_POSE } from '../../src/natpf/natpf_gesture_motion.js';

const D = Math.PI/180;
export const SHOULDER = Object.freeze([.19, 1.42, 0]);
// Traslazione costante di tutti i gesti (stessa per ogni scheda): non cambia né le rotazioni né le accelerazioni del
// telefono (il giroscopio e l'accelerometro non la vedono), ma porta la mano davanti al corpo come nella foto della presa
// (avambraccio di traverso, gomito accanto al fianco). Il perno delle rotazioni diventa l'asse del tronco.
export const STAGE = { offset: [-.30, .08, .10] };
// posa di partenza (scheda «posizione di partenza»), rispetto alla spalla
const READY_RC = [.16, -.42, -.32];

/* ---------- vettori e quaternioni (array) ---------- */
const unit = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };
const qAxis = (a, ang) => { const u = unit(a), s = Math.sin(ang/2); return [u[0]*s, u[1]*s, u[2]*s, Math.cos(ang/2)]; };
export const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
  a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
export const qrot = (q, v) => { const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]); return [p[0], p[1], p[2]]; };
const qslerp = (a, b, t) => {
  let c = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3], bb = b;
  if (c < 0){ c = -c; bb = b.map(x => -x); }
  if (c > .9995){ const r = a.map((x, i) => x + (bb[i] - x)*t), l = Math.hypot(...r); return r.map(x => x/l); }
  const th = Math.acos(c), s = Math.sin(th), wa = Math.sin((1 - t)*th)/s, wb = Math.sin(t*th)/s;
  return a.map((x, i) => x*wa + bb[i]*wb);
};
const eulerXYZ = ([x, y, z]) => {
  const c1 = Math.cos(x*D/2), c2 = Math.cos(y*D/2), c3 = Math.cos(z*D/2), s1 = Math.sin(x*D/2), s2 = Math.sin(y*D/2), s3 = Math.sin(z*D/2);
  return [s1*c2*c3 + c1*s2*s3, c1*s2*c3 - s1*c2*s3, c1*c2*s3 + s1*s2*c3, c1*c2*c3 - s1*s2*s3];
};
// presa nel palmo (GRIP_POSE.palmo): cima 40° in avanti e 35° verso l'interno, schermo verso chi gioca
export const Q0 = Object.freeze(eulerXYZ(GRIP_POSE.palmo.euler));
const mj = u => { u = Math.max(0, Math.min(1, u)); return u*u*u*(10 - 15*u + 6*u*u); };   // minimo jerk
const mjv = u => (u <= 0 || u >= 1) ? 0 : 30*u*u*(1 - u)*(1 - u);                         // sua derivata

/* ---------- profilo di velocità di un colpo ---------- */
// Lobo della preparazione h(τ) = sin(πτ)·sin(πτ/2): parte da fermo (pendenza nulla) e arriva a zero con pendenza
// finita, così la velocità attraversa lo zero senza un fermo all'inversione. ∫h = 4/(3π).
const H_INT = 4/(3*Math.PI);
const hLobe = x => Math.sin(Math.PI*x)*Math.sin(Math.PI*x/2);
const H_MAX = (() => { let m = 0; for (let i = 0; i <= 400; i++) m = Math.max(m, hLobe(i/400)); return m; })();
// ∫₀ˣ h: forma chiusa da sinA·sinB = [cos(A−B) − cos(A+B)]/2
const hCum = x => (Math.sin(Math.PI*x/2)*2/Math.PI - Math.sin(3*Math.PI*x/2)*2/(3*Math.PI))/2;
// accelerazione: (1−β)·sin²(πτ/2) + β·sin(πτ/2) (pendenza iniziale β·π/2), decelerazione cos²(πτ/2)
const gAcc = (b, x) => (1 - b)*Math.sin(Math.PI*x/2)**2 + b*Math.sin(Math.PI*x/2);
const gAccCum = (b, x) => (1 - b)*(x/2 - Math.sin(Math.PI*x)/(2*Math.PI)) + b*(2/Math.PI)*(1 - Math.cos(Math.PI*x/2));
const gDec = x => Math.cos(Math.PI*x/2)**2;
const gDecCum = x => x/2 + Math.sin(Math.PI*x)/(2*Math.PI);

// Linea del tempo di un colpo (secondi, tempo reale) e angolo φ (gradi, 0 = impatto) in funzione del tempo
export function strokePlan(s, o = {}){
  const P = s.peak, ms = s.ms/1000;
  const acc = o.acc ?? .45, prepCap = o.prepCap ?? 180, prepMin = o.prepMin ?? .3, backCap = o.backCap ?? 190;
  const Ta = acc*ms, Td = ms - Ta;
  // β e durata della preparazione: la decelerazione della preparazione = l'accelerazione iniziale del colpo
  let b = .25, A1 = 0, Tp = 0, V = 0;
  for (let i = 0; i < 6; i++){
    A1 = P*Ta*gAccCum(b, 1);
    Tp = Math.max(prepMin, A1*H_MAX/(H_INT*prepCap));
    V = A1/(Tp*H_INT);
    b = Math.max(0, Math.min(.5, 2*Ta*V/(P*Tp)));
  }
  const A2 = P*Td/2, settle = o.settle ?? 3, Th = o.hold ?? .14, Tr = Math.max(.42, 1.875*(A2 - settle)/backCap);
  const T = { start: o.start ?? .45 };
  T.prep = T.start + Tp; T.hit = T.prep + Ta; T.swing = T.hit + Td; T.settle = T.swing + Th; T.back = T.settle + Tr;
  T.total = T.back + (o.pause ?? .55);
  const phi = t => {
    if (t <= T.start) return 0;
    if (t <= T.prep) return -V*Tp*hCum((t - T.start)/Tp);
    if (t <= T.hit) return -A1 + P*Ta*gAccCum(b, (t - T.prep)/Ta);
    if (t <= T.swing) return P*Td*gDecCum((t - T.hit)/Td);
    if (t <= T.settle) return A2 - settle*mj((t - T.swing)/Th);
    if (t <= T.back) return (A2 - settle)*(1 - mj((t - T.settle)/Tr));
    return 0;
  };
  const speed = t => {   // °/s con segno (positivo = verso del colpo)
    if (t <= T.start) return 0;
    if (t <= T.prep) return -V*hLobe((t - T.start)/Tp);
    if (t <= T.hit) return P*gAcc(b, (t - T.prep)/Ta);
    if (t <= T.swing) return P*gDec((t - T.hit)/Td);
    if (t <= T.settle) return -settle*mjv((t - T.swing)/Th)/Th;
    if (t <= T.back) return -(A2 - settle)*mjv((t - T.settle)/Tr)/Tr;
    return 0;
  };
  // polso: come strokePose (∫ wrist·sin²(π(1,4u − 0,2)) nella parte veloce), poi torna con il ritorno
  const wristAt = u => { const a = Math.max(0, Math.min(1, u*1.4 - .2)); return (s.wrist || 0)*ms/1.4*(a/2 - Math.sin(2*Math.PI*a)/(4*Math.PI)); };
  const psi = t => {
    if (!s.wrist || t <= T.prep) return 0;
    if (t <= T.swing) return wristAt((t - T.prep)/ms);
    if (t <= T.settle) return wristAt(1);
    if (t <= T.back) return wristAt(1)*(1 - mj((t - T.settle)/Tr));
    return 0;
  };
  const phase = t => t <= T.start ? 'pronto' : t <= T.prep ? 'preparazione' : t <= T.hit - .03 ? 'accelerazione' : t <= T.hit + .03 ? 'impatto'
    : t <= T.settle ? 'accompagnamento' : t <= T.back ? 'ritorno' : 'pronto';
  return { T, phi, speed, psi, phase, A1, A2, Tp, Tr, beta: b, prepPeak: V*H_MAX };
}

/* ---------- servizio continuo (specifica §2.5, servizio-continuo.mjs: due messaggi, battuta 0,69 s dopo il lancio) ---------- */
const bellCum = (s, u) => s.peak*s.ms/1000*(u/2 - Math.sin(2*Math.PI*u)/(4*Math.PI));
const bellSpeed = (s, u) => s.peak*Math.sin(Math.PI*u)**2;
function servePlan(g, reach, { gap = .69, link = .3, tossPrep = 25 } = {}){
  const toss = g.toss, hit = g.stroke;
  const tFull = toss.peak*toss.ms/2000, hFull = hit.peak*hit.ms/2000;
  const T = { start: .4 }; T.tp = T.start + tossPrep*1.875/90; T.tPeak = T.tp + toss.ms/2000; T.tEnd = T.tp + toss.ms/1000;
  T.hit = T.tPeak + gap; T.hStart = T.hit - hit.ms/2000; T.hEnd = T.hStart + hit.ms/1000;
  T.lStart = T.tEnd + .03; T.lEnd = Math.min(T.hStart - .02, T.lStart + link); T.back = T.hEnd + .15 + .9; T.total = T.back + .35;
  T.release = T.tEnd - .04;      // la palla lascia la mano alla fine del lancio
  const tossPose = f => ({ pos: qrot(qAxis(toss.axis, f*D), toss.rc).map(x => x*reach), q: qmul(qAxis(toss.axis, f*D), Q0) });
  const hitPose = f => ({ pos: qrot(qAxis(hit.axis, f*D), hit.rc).map(x => x*reach), q: qmul(qAxis(hit.axis, f*D), Q0) });
  const A = tossPose(tFull/2), B = hitPose(-hFull/2), E = hitPose(hFull/2), R0 = tossPose(-tFull/2);
  const lerp = (a, b, u) => a.map((x, i) => x + (b[i] - x)*u);
  const pose = t => {
    if (t <= T.start) return { ...R0, speed: 0, phase: 'pronto' };
    if (t <= T.tp){ const u = (t - T.start)/(T.tp - T.start); return { ...tossPose(-tFull/2 - tossPrep*Math.sin(Math.PI*mj(u))), speed: 0, phase: 'preparazione' }; }
    if (t <= T.tEnd){ const u = (t - T.tp)/(toss.ms/1000); return { ...tossPose(-tFull/2 + bellCum(toss, u)), speed: bellSpeed(toss, u), phase: 'lancio' }; }
    if (t <= T.lStart) return { ...A, speed: 0, phase: 'lancio' };
    if (t <= T.lEnd){ const u = mj((t - T.lStart)/(T.lEnd - T.lStart)); return { pos: lerp(A.pos, B.pos, u), q: qslerp(A.q, B.q, u), speed: 0, phase: 'caricamento' }; }
    if (t <= T.hStart) return { ...B, speed: 0, phase: 'caricamento' };
    if (t <= T.hEnd){ const u = (t - T.hStart)/(hit.ms/1000); return { ...hitPose(-hFull/2 + bellCum(hit, u)), speed: bellSpeed(hit, u), phase: Math.abs(t - T.hit) < .03 ? 'impatto' : t < T.hit ? 'battuta' : 'accompagnamento' }; }
    if (t <= T.hEnd + .15) return { ...E, speed: 0, phase: 'accompagnamento' };
    if (t <= T.back){ const u = mj((t - T.hEnd - .15)/.9); return { pos: lerp(E.pos, R0.pos, u), q: qslerp(E.q, R0.q, u), speed: 0, phase: 'ritorno' }; }
    return { ...R0, speed: 0, phase: 'pronto' };
  };
  return { T, pose, contact: T.hit };
}

/* ---------- gesti del prototipo ---------- */
// reach: scala del vettore spalla → mano (gomito naturale); prepCap: picco della preparazione (specifica §3)
const OPTS = {
  forehand: { reach: .8, prepCap: 180 },
  backhand: { reach: .8, prepCap: 180 },
  flat: { reach: .8, prepCap: 180 },
  lob: { reach: .85, prepCap: 95, prepMin: .6 },
  drop: { reach: .8, prepCap: 140, prepMin: .32 },
  slice: { reach: .8, prepCap: 180 },
  smash: { reach: .95, prepCap: 80, prepMin: .7 },
  volley: { reach: .8, prepCap: 120, prepMin: .2 },
  serve: { reach: .95 },
};
export const PROTO_IDS = Object.freeze(['grip', 'ready', 'forehand', 'backhand', 'serve', 'lob', 'drop', 'flat', 'slice', 'smash']);
const plans = new Map();
export function planFor(id){
  if (plans.has(id)) return plans.get(id);
  const g = GESTURES[id]; let p = null;
  if (!g || g.still) p = { still: true, T: { total: 6, hit: 0 }, contact: null };
  else if (g.toss) p = { serve: true, ...servePlan(g, OPTS.serve.reach) };
  else { const o = OPTS[id] || { reach: .8 }; const sp = strokePlan(g.stroke, o); p = { ...sp, reach: o.reach, stroke: g.stroke, contact: sp.T.hit }; }
  plans.set(id, p); return p;
}
export const cycleOf = id => planFor(id).T.total;
export const contactOf = id => planFor(id).contact;

// Posa del telefono al tempo t (s, tempo reale del gesto) per la mano scelta
export function gesturePose(id, t, { hand = 'right' } = {}){
  const g = GESTURES[id] || GESTURES.ready, p = planFor(g.id);
  let rel, q, speed = 0, phase = 'pronto';
  if (p.still){ rel = READY_RC.map(x => x*.8); q = Q0.slice(); }
  else if (p.serve){ const s = p.pose(t); rel = s.pos; q = s.q; speed = s.speed; phase = s.phase; }
  else {
    const s = p.stroke, f = p.phi(t)*D, A = unit(s.axis);
    rel = qrot(qAxis(A, f), s.rc).map(x => x*p.reach);
    q = qmul(qAxis(A, f), Q0);
    const psi = p.psi(t);
    if (psi && s.wristAxis) q = qmul(qAxis(qrot(qAxis(A, f), s.wristAxis), psi*D), q);
    speed = p.speed(t); phase = p.phase(t);
  }
  let pos = rel.map((x, i) => x + SHOULDER[i] + STAGE.offset[i]);
  if (hand === 'left'){ pos = [-pos[0], pos[1], pos[2]]; q = [q[0], -q[1], -q[2], q[3]]; }
  return { pos, q, speed, phase, contact: p.contact, cycle: p.T.total };
}
