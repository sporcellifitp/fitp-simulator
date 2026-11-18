// B69 · Balletti di vittoria (e due sconfitte buffe) delle mascotte 3D nella card di fine partita. Richiesta dell'utente
// del 18/11/2026, dopo l'anteprima del B67: «Le mascotte ok, integra queste e butta dentro altre animazioni simili alle
// esultanze e balletti» dei videogiochi online. Movimenti ORIGINALI, nello spirito dei balletti di esultanza (niente
// coreografie con nome proprio): robot a scatti, «disco» con il dito (la racchetta) che punta in alto e in basso e un
// piccolo dab finale, corsa sul posto all'indietro, passi incrociati, braccia a pendolo intorno ai fianchi, saltelli con
// le mani che spingono il soffitto. Documento docs/b69/balletti-mascotte.md.
// Come i movimenti del B67 (natpf_card_moves.js): at(u) muove tutto il personaggio (metri, nel riferimento di chi
// guarda), mascot(u, rig) dà la posa del modello (natpf_mascot_rig.poseMascotCard: unità del modello, mani misurate
// dall'osso Spine, lato della racchetta a x < 0, z > 0 verso chi guarda; legs per i piedi). Il giro (CARD_LOOP, 2,05 s,
// 24 fotogrammi) è diviso in 8 battute da 0,256 s (117 al minuto): le pose chiave stanno sulle battute, con
// anticipazione (un piccolo moto all'indietro), arrivo con rimbalzo (oltre e ritorno) e pose tenute un attimo. Sempre
// a giro chiuso: l'ultima battuta torna alla prima.
// Racchetta: sempre nel pugno (la mano la segue: natpf_mascot_rig.holdRacket) oppure piantata a terra accanto (frame
// 'ground': resta ferma mentre il personaggio balla) o distesa a terra; mai dentro la testa o il busto (prove in
// test/natpf-b69-balletti.test.mjs).

const TAU = 2*Math.PI;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = v => { const t = clamp01(v); return t*t*(3 - 2*t); };
// arrivo con un piccolo rimbalzo oltre la posa (k: quanto)
const back = (t, k = 1.4) => { const x = clamp01(t) - 1; return 1 + (k + 1)*x*x*x + k*x*x; };

// Fusione di due pose (numeri e vettori; il resto dalla prima fino a metà, poi dalla seconda)
export function mixPose(a, b, t){
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a)*t;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => mixPose(x, b[i] ?? x, t));
  if (a && b && typeof a === 'object' && typeof b === 'object'){
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = k in a && k in b ? mixPose(a[k], b[k], t) : (k in a ? a[k] : b[k]);
    return out;
  }
  return t < 0.5 ? a : b;
}
// Pose sulle battute: keys[i] sulla battuta i (n battute per giro); fra una e l'altra si resta fermi per `hold` della
// battuta, poi si va alla prossima con la curva `ease` (rimbalzo di base). u in [0, 1)
export function beats(u, keys, { hold = 0, ease = back } = {}){
  const n = keys.length, x = (((u % 1) + 1) % 1)*n, i = Math.floor(x) % n, f = x - Math.floor(x);
  const t = hold >= 1 ? 0 : ease((f - hold)/(1 - hold));
  return t <= 0 ? keys[i] : mixPose(keys[i], keys[(i + 1) % n], t);
}
const pulse = (u, n) => Math.abs(Math.sin(Math.PI*n*u));          // n rimbalzi per giro, 0 sulle battute
const still = () => ({ right: 0, fwd: 0, up: 0, yaw: 0, footL: 0, footR: 0 });

// Pugno e mani ricorrenti
const HIP_FREE = { at: [0.2, -0.14, 0.03], palm: [-1, 0, 0.2], fingers: [0.1, -1, 0.25], pole: [1, 0.1, -0.4], fist: true };
const FEET = (a = [0, 0, 0], b = [0, 0, 0]) => ({ a, b });

// ---------------------------------------------------------------------------------------------------------------
// 1 · Robot: a scatti, una posa per battuta tenuta (gli scatti cadono fra due fotogrammi), con un filo di rimbalzo
const R_FWD = { at: [-0.21, -0.05, 0.17], dir: [-1, 0.12, 0.35] };
const R_UP = { at: [-0.28, 0.1, 0.07], dir: [-0.68, 1, 0.08] };
const R_DOWN = { at: [-0.22, -0.13, 0.11], dir: [-0.9, -0.3, 0.45] };
const F_FWD = { at: [0.21, -0.05, 0.17], palm: [0, -1, 0], fingers: [0.15, 0, 1] };
const F_UP = { at: [0.26, 0.1, 0.07], palm: [0, 0, 1], fingers: [0.15, 1, 0] };
const F_DOWN = { at: [0.22, -0.13, 0.11], palm: [0, 0, 1], fingers: [0.2, -1, 0.1] };
const robo = (racket, free, o = {}) => ({ hips: { pitch: 0, yaw: o.yaw || 0, y: o.y || 0 }, spine: { pitch: o.bow || -0.03, yaw: o.twist || 0 },
  head: { pitch: o.look ?? -0.06, yaw: o.head || 0, roll: 0 }, racket, free, legs: FEET([0, o.la || 0, 0], [0, o.lb || 0, 0]), at: o.at || 0 });
const ROBOT = [
  robo(R_FWD, F_FWD),
  robo(R_FWD, F_FWD, { head: 0.45 }),
  robo(R_UP, F_DOWN, { head: 0.45, la: 0.04 }),
  robo(R_DOWN, F_UP, { head: -0.45, lb: 0.04 }),
  robo(R_UP, F_DOWN, { twist: 0.3, head: 0.2, at: 0.07, la: 0.05 }),
  robo(R_DOWN, F_UP, { twist: -0.3, head: -0.2, at: -0.07, lb: 0.05 }),
  robo(R_UP, F_UP, { look: -0.24, y: 0.012 }),
  robo(R_FWD, F_FWD, { bow: 0.14, look: 0.12, y: -0.01 }),
];
const robotPose = u => beats(u, ROBOT, { hold: 0.7, ease: t => back(t, 0.8) });

// ---------------------------------------------------------------------------------------------------------------
// 2 · Disco: la mano libera punta in alto in fuori e poi in basso dall'altra parte, la racchetta nel pugno sul fianco
// (fuori di lato, giù), i fianchi che ondeggiano; nelle ultime due battute un piccolo dab tenuto (la racchetta in alto
// in fuori, l'altro braccio piegato davanti alla faccia)
const D_HIP = { at: [-0.24, -0.12, 0.05], dir: [-1, -0.42, -0.1], pole: [-1, 0.1, -0.4] };
const D_UP = { at: [0.28, 0.12, 0.08], palm: [0, 0, 1], fingers: [0.55, 1, 0.1] };
const D_DOWN = { at: [-0.04, -0.12, 0.2], palm: [0.2, 0.3, 1], fingers: [-0.6, -0.8, 0.3] };
const disco = (racket, free, o = {}) => ({ hips: { x: o.hx || 0, roll: o.hr || 0, pitch: -0.03, y: o.y || 0 }, spine: { pitch: o.sp ?? -0.04, roll: o.sr || 0, yaw: o.sy || 0 },
  head: { pitch: o.hp ?? -0.1, yaw: o.hy || 0, roll: o.hrl || 0 }, racket, free, legs: FEET([o.ax || 0, o.la || 0, o.az || 0], [0, 0, 0]), at: o.at || 0 });
const D_A = disco(D_HIP, D_UP, { hx: -0.03, hr: 0.07, sr: -0.09, hp: -0.24, hy: 0.32, at: -0.04 });
const D_B = disco(D_HIP, D_DOWN, { hx: 0.03, hr: -0.07, sr: 0.07, hp: 0.14, hy: -0.22, y: -0.018, la: 0.04, ax: -0.02, at: 0.04 });
const D_DAB = disco({ at: [-0.3, 0.1, 0.06], dir: [-0.85, 0.55, 0.1] },
  { at: [0.03, 0.08, 0.21], palm: [0.15, -0.35, -1], fingers: [-1, 0.45, 0], pole: [0.4, 1, 0.3] },
  { sp: 0.1, sr: -0.08, hp: 0.34, hy: 0.32, hrl: -0.12, y: -0.01, at: 0 });
const DISCO = [D_A, D_B, D_A, D_B, D_A, D_B, D_DAB, D_DAB];
// (Lob ha la visiera: nel dab china meno la testa, se no copre tutta la faccia)
const D_DAB_LOB = { ...D_DAB, head: { ...D_DAB.head, pitch: 0.16 } };
const DISCO_LOB = [D_A, D_B, D_A, D_B, D_A, D_B, D_DAB_LOB, D_DAB_LOB];
const discoPose = (u, rig) => beats(u, rig?.key === 'lob' ? DISCO_LOB : DISCO, { hold: 0.25 });

// ---------------------------------------------------------------------------------------------------------------
// 3 · Corsa all'indietro: un ginocchio su, il piede batte davanti e scivola indietro mentre sale l'altro (quattro passi
// per giro); le braccia pompano a tempo, il busto un po' in avanti, giù a ogni battuta del piede
function runPose(u){
  const c = (2*u) % 1;
  const foot = c0 => {
    const c = ((c0 % 1) + 1) % 1;
    // in aria (0 → 0,5): si alza e va avanti; a terra (0,5 → 1): scivola indietro
    if (c < 0.5){ const t = c/0.5; return [0, 0.12*Math.sin(Math.PI*t), -0.07 + 0.14*ss(t)]; }
    const t = (c - 0.5)/0.5; return [0, 0, 0.07 - 0.14*t];
  };
  const stomp = Math.pow(Math.cos(2*TAU*u), 2), arm = Math.cos(2*TAU*u);
  return { hips: { pitch: -0.02, y: -0.022*stomp, roll: 0.04*Math.sin(2*TAU*u) }, spine: { pitch: 0.12, roll: -0.03*Math.sin(2*TAU*u) },
    head: { pitch: -0.08 + 0.06*stomp, yaw: 0.1*Math.sin(2*TAU*u) },
    racket: { at: [-0.23, -0.02 + 0.05*arm, 0.12 + 0.07*arm], dir: [-1.1, 1, 0.12] },
    free: { at: [0.2, -0.02 - 0.05*arm, 0.12 - 0.07*arm], palm: [-1, 0, 0], fingers: [0, 0.45, 1], fist: true },
    legs: FEET(foot(c), foot(c + 0.5)) };
}

// ---------------------------------------------------------------------------------------------------------------
// 4 · Passi incrociati: un piede incrocia davanti all'altro e torna largo a ogni battuta, il corpo scivola di lato e
// torna, la racchetta alzata che pompa e l'altra mano in fuori
function shufflePose(u){
  const x = 8*u, i = Math.floor(x) % 8, f = x - Math.floor(x), side = Math.cos(TAU*u);
  // a ogni battuta: incrocio (0 → 0,5) e apertura (0,5 → 1), un piede per battuta
  const cross = Math.sin(Math.PI*f), lead = i % 2 === 0;
  const a = lead ? [0.11*cross, 0.03*Math.sin(TAU*f) > 0 ? 0.03*Math.sin(TAU*f) : 0, 0.055*cross] : [-0.035*cross, 0, -0.02*cross];
  const b = lead ? [0.035*cross, 0, -0.02*cross] : [-0.11*cross, 0.03*Math.max(0, Math.sin(TAU*f)), 0.055*cross];
  const bounce = Math.abs(Math.sin(Math.PI*x)), pump = Math.sin(Math.PI*x);
  return { hips: { y: -0.02*(1 - bounce), roll: 0.05*side*cross, yaw: 0.08*side }, spine: { pitch: -0.05, roll: -0.04*side*cross },
    head: { pitch: -0.12, roll: 0.06*pump, yaw: -0.1*side },
    racket: { at: [-0.3, 0.06 + 0.09*bounce, 0.08], dir: [-0.62, 1, 0.08] },
    free: { at: [0.27 + 0.04*side, 0.03 + 0.08*(1 - bounce), 0.1], palm: [0, -0.2, 1], fingers: [1, 0.5*side, 0] },
    legs: FEET(a, b) };
}

// ---------------------------------------------------------------------------------------------------------------
// 5 · Pendolo: le due braccia vanno insieme da una parte e dall'altra davanti ai fianchi (una in fuori, l'altra che
// incrocia davanti alla pancia), i fianchi al contrario, le ginocchia che molleggiano; la racchetta piantata a terra
// accanto
function pendPose(u, rig){
  // quattro oscillazioni per giro (due battute ciascuna), con un attimo di sosta in fondo
  const s = Math.sin(2*TAU*u), c = Math.cos(2*TAU*u), sw = Math.tanh(2.2*s)/Math.tanh(2.2);
  const k = rig?.racketReach ?? 0.5, lo = -0.13 + 0.03*(1 - Math.abs(sw));
  // sw = 1: braccia verso il lato libero (x > 0): la mano libera in fuori, quella della racchetta incrocia davanti
  const p = Math.max(0, sw), q = Math.max(0, -sw);
  const R = [-0.21 + 0.24*p - 0.06*q, lo, 0.1 + 0.1*p], F = [0.21 - 0.24*q + 0.06*p, lo, 0.1 + 0.1*q];
  return { hips: { x: -0.045*sw, roll: 0.11*sw, y: -0.02*Math.pow(c, 2) }, spine: { roll: -0.1*sw, yaw: 0.14*sw, pitch: 0.03 }, head: { pitch: -0.08, roll: -0.09*sw, yaw: -0.12*sw },
    racket: { at: R, palm: [0.2, 0, 1], fingers: [0.5*sw, -1, 0.1] },
    free: { at: F, palm: [-0.2, 0, 1], fingers: [0.5*sw, -1, 0.1] },
    rest: { frame: 'ground', at: [-0.46, k*0.985 + 0.012, 0.02], dir: [-0.17, -1, 0], face: [0, 0, 1] },
    legs: FEET([0.01*sw, 0.025*Math.max(0, -s), 0], [0.01*sw, 0.025*Math.max(0, s), 0]) };
}

// ---------------------------------------------------------------------------------------------------------------
// 6 · Su il soffitto: saltelli a due piedi con le mani che spingono in su accanto alla testa a ogni battuta (palmi in
// su, la racchetta in alto nel pugno), accovacciata prima di ogni salto
const T_UP = { racket: { at: [-0.32, 0.19, 0.06], dir: [-0.45, 1, 0.05] }, free: { at: [0.32, 0.19, 0.07], palm: [0.15, 0.65, 0.75], fingers: [0.8, 0.35, -0.3] }, head: { pitch: -0.22 } };
const T_DOWN = { racket: { at: [-0.27, -0.02, 0.09], dir: [-0.62, 1, 0.12] }, free: { at: [0.27, -0.02, 0.09], palm: [0.15, 0.65, 0.75], fingers: [0.8, 0.35, -0.3] }, head: { pitch: -0.04 } };
function roofPose(u){
  const p = beats(u, [T_UP, T_DOWN], { hold: 0.15 });
  // due battute per salto: giù (accovacciata) sulla battuta pari, in alto a metà
  const x = 4*u, f = x - Math.floor(x), crouch = Math.pow(Math.cos(Math.PI*f), 8);
  return { ...p, hips: { y: -0.035*crouch, pitch: 0.04*crouch }, spine: { pitch: -0.06 + 0.06*crouch }, legs: FEET() };
}
const roofAt = u => { const x = 4*u, f = x - Math.floor(x); return { ...still(), up: 0.085*Math.max(0, Math.sin(Math.PI*(f - 0.12)/0.76))*(f > 0.12 && f < 0.88 ? 1 : 0) }; };

// ---------------------------------------------------------------------------------------------------------------
// Sconfitte buffe ma tristi
const HEAD_DOWN = rig => (rig?.key === 'lob' ? 0.12 : 0.3);
const LEAN = rig => (rig?.key === 'lob' ? 0.6 : 1);
// 7 · Calcia un sassolino: testa bassa, la racchetta che pende a terra, il piede libero che dondola indietro e calcia
// piano, due volte per giro
function kickPose(u, rig){
  const x = 2*u, f = x - Math.floor(x), hp = HEAD_DOWN(rig), l = LEAN(rig);
  // indietro (0 → 0,45), calcio (0,45 → 0,6), giù (0,6 → 0,8), fermo
  const z = f < 0.45 ? -0.07*ss(f/0.45) : f < 0.6 ? -0.07 + 0.17*back((f - 0.45)/0.15, 0.6) : f < 0.85 ? 0.1*(1 - ss((f - 0.6)/0.25)) : 0;
  const lift = f < 0.45 ? 0.04*ss(f/0.45) : f < 0.6 ? 0.04 + 0.02*Math.sin(Math.PI*(f - 0.45)/0.15) : f < 0.85 ? 0.04*(1 - ss((f - 0.6)/0.25)) : 0;
  const kick = f > 0.45 && f < 0.85 ? Math.sin(Math.PI*(f - 0.45)/0.4) : 0;
  return { hips: { pitch: 0.08*l, y: -0.015, roll: -0.04*kick }, spine: { pitch: (0.22 + 0.04*kick)*l, roll: 0.04*kick }, head: { pitch: hp, roll: 0.1 - 0.05*kick, yaw: 0.1*kick },
    racket: { frame: 'level', at: [-0.2, -0.28, 0.0], dir: [-0.6, 0, 0.6], ground: true, drop: 0.3 },
    free: { frame: 'level', at: [0.2, -0.27, 0.0 + 0.03*kick], palm: [-1, 0, 0], fingers: [0.15, -1, 0.1], drop: 0.25 },
    legs: FEET([0, 0, 0], [0.01, lift, z]), face: 'sad' };
}
// 8 · Capriccio: la racchetta buttata a terra davanti, i piedi che pestano alternati, i pugni giù e la testa che dice no
function tantrumPose(u, rig){
  const x = 8*u, f = x - Math.floor(x), i = Math.floor(x) % 8, a = i % 2 === 0, hp = 0.7*HEAD_DOWN(rig), l = LEAN(rig);
  const lift = 0.1*Math.sin(Math.PI*Math.min(1, f/0.6))*(f < 0.6 ? 1 : 0), shake = Math.sin(2*TAU*u), punch = Math.pow(Math.cos(Math.PI*f), 2);
  return { hips: { pitch: 0.05*l, y: -0.02*punch, roll: (a ? 1 : -1)*0.05*lift/0.1 }, spine: { pitch: 0.14*l, roll: -0.03*Math.cos(Math.PI*x) }, head: { pitch: hp, yaw: 0.35*shake, roll: 0.06*shake },
    racket: { frame: 'level', at: [-0.21, -0.2 - 0.04*punch, 0.06], palm: [1, 0, 0.1], fingers: [0, -1, 0.15], fist: true, drop: 0.15 },
    free: { frame: 'level', at: [0.21, -0.2 - 0.04*punch, 0.06], palm: [-1, 0, 0.1], fingers: [0, -1, 0.15], fist: true, drop: 0.15 },
    rest: { frame: 'ground', at: [-0.42, 0.125, 0.12], dir: [0.35, -0.12, 0.93], face: [-0.45, 0.75, 0.45] },
    legs: FEET([0, a ? lift : 0, 0], [0, a ? 0 : lift, 0]), face: 'sad' };
}

// ---------------------------------------------------------------------------------------------------------------
// I movimenti (stessa forma di natpf_card_moves.CARD_MOVES). at: tutto il personaggio (metri); i piedi li mette la posa
const CAM_LOW = -0.04;
const fromPose = (fn, k) => u => ({ ...still(), right: k*(fn(u).at || 0) });
export const DANCE_MOVES = Object.freeze({
  win: Object.freeze([
    Object.freeze({ id: 'win-robot', name: 'Robot a scatti', base: 'cheer', dance: true, at: fromPose(robotPose, 1), mascot: u => robotPose(u) }),
    Object.freeze({ id: 'win-disco', name: 'Disco, con il dab', base: 'cheer', dance: true, at: fromPose(discoPose, 1), mascot: (u, rig) => discoPose(u, rig) }),
    Object.freeze({ id: 'win-corsa', name: 'Corsa all\'indietro', base: 'cheer', dance: true,
      at: u => ({ ...still(), up: 0.025*pulse(u, 4), yaw: 0.5 + 0.1*Math.sin(TAU*u) }), mascot: u => runPose(u) }),
    Object.freeze({ id: 'win-incrocio', name: 'Passi incrociati', base: 'cheer', dance: true,
      at: u => ({ ...still(), right: 0.11*Math.sin(TAU*u), up: 0.012*pulse(u, 8) }), mascot: u => shufflePose(u) }),
    Object.freeze({ id: 'win-pendolo', name: 'Braccia a pendolo', base: 'cheer', dance: true,
      at: u => ({ ...still(), right: 0.02*Math.sin(2*TAU*u) }), mascot: (u, rig) => pendPose(u, rig) }),
    Object.freeze({ id: 'win-tetto', name: 'Su il soffitto', base: 'cheer', dance: true, at: roofAt, mascot: u => roofPose(u) }),
  ]),
  lose: Object.freeze([
    Object.freeze({ id: 'lose-sasso', camUp: CAM_LOW, name: 'Calcia un sassolino', base: 'sad', dance: true,
      at: u => ({ ...still(), yaw: 0.1*Math.sin(TAU*u), fwd: -0.02 }), mascot: (u, rig) => kickPose(u, rig) }),
    Object.freeze({ id: 'lose-capriccio', camUp: CAM_LOW, name: 'Capriccio', base: 'sad', dance: true,
      at: u => ({ ...still(), up: 0.008*pulse(u, 8) }), mascot: (u, rig) => tantrumPose(u, rig) }),
  ]),
});
