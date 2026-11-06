// Posa dei gesti del tutorial (B9, ramo C): UNA funzione pura e campionabile, la stessa per il disegno e per la verifica.
//
//   gesturePose(id, t, { hand, grip }) → { pos, q, phase, label, u, speed, contact, cycle, trunk }
//   gesturePlan(id, { grip })          → { total, contact, tossPeak, T, keys, phases, peak, ball, ... }
//   gestureRig(pose, { hand })         → spalla, gomito, polso, dita e pollice nel campo (dati del disegno)
//   gestureBall(id, t, { hand })       → posizione della palla (arriva sulla cima del telefono nell'istante del contatto)
//
// È la posa del telefono che l'animazione nuova DISEGNA e che test/natpf-gesture-pose.test.mjs fa leggere al telefono
// simulato completo (test/pose-sensors.mjs → test/phone-sim.mjs: rilevatore vero, forma del colpo, calibrazione rapida,
// mappatura del gioco): ciò che si vede è ciò che il gioco riconosce (docs/b9/specifica-gesti.md §6,
// docs/b9/giudizio-animazione.md §5, nota docs/b9/posa-gesti.md). Niente DOM, niente three.js, niente canvas.
//
// Riferimenti (come natpf_gesture_motion.js e test/phone-sim.mjs): campo x a destra, y in alto (contro la gravità),
// −z verso lo schermo del computer, giocatore destro; il mancino è lo specchio esatto (posizioni x → −x, quaternioni
// (x, −y, −z, w)). Telefono: y = cima, +z = normale dello schermo, +x = bordo destro guardando lo schermo.
// Quaternioni [x, y, z, w] dal telefono al campo; posizioni in metri dal centro dei piedi; tempi in secondi a TEMPO
// REALE (la modale può rallentare la riproduzione, i dati no: velocità e «secchezza» sono parte del gesto).
//
// Da natpf_gesture_motion.js si prendono SOLO i parametri verificati di ogni colpo (GESTURES: asse, verso, picco, durata
// della parte veloce, vettore spalla → mano all'impatto, polso, mira; GRIP_POSE/GRIP_STYLE: la presa, quindi anche il
// rollback «martello»). Qui si scrive la messa in scena del tempo, dalla specifica (§2–§3) e dal brief (§5.4), partendo
// dai prototipi verificati (prototipi/b9-motion/motion.js, prototipi/b9-3d/motion.js):
//  - parte veloce con la legge cicloidale peak·sin²(πu) (accelerazione nel 50% della durata, nulla agli estremi):
//    PICCO DELLA VELOCITÀ = CONTATTO CON LA PALLA;
//  - preparazione con il profilo 12u²(1−u) (parte da ferma, arriva decelerando senza fermarsi) e picco limitato per
//    colpo (pallonetto ≤ 95 °/s, schiacciata ≤ 80: oltre, il telefono la legge come un colpo in più — difetto (b) della
//    specifica §5); la parte veloce comincia un poco PRIMA che la preparazione sia finita (sovrapposizione `overlap`):
//    la velocità attraversa lo zero con decisione, senza il «fermo» tra carica e colpo;
//  - volée con una preparazione di 12° soltanto (difetto (c): 24° in 0,08 s erano letti come un rovescio);
//  - fermo in fine colpo 0,10–0,20 s, ritorno a minimo jerk che parte entro 0,35 s dall'impatto con un piccolo superamento
//    e assestamento (≤ 3°), ciclo chiuso (posa a 0 e a `total` uguali);
//  - servizio CONTINUO: preparazione, lancio, raccordo in cui la mano sale sopra la testa con il telefono che ruota
//    appena (≤ 90 °/s), battuta con il picco 0,69 s dopo il picco del lancio, nel colmo della palla (difetto (a): niente
//    salto della mano tra lancio e battuta, niente battuta dopo il colmo);
//  - presa e posizione di partenza ferme (nessuna rotazione: nella presa gira la camera, non la mano), respiro di 3 mm;
//  - la mano parte dalla posizione di partenza comune (specifica §2.2) e raggiunge il percorso del colpo durante la
//    preparazione (solo traslazione: il giroscopio non la vede) e ci torna nel ritorno.
// Il raggio spalla → telefono è 0,64 × quello dei moti del gioco (gomito piegato in modo naturale, telefono a 0,3–0,5 m
// dalla spalla): il riconoscimento non dipende dal raggio tra 0,29 e 0,90 m (specifica §2.3, raggio.mjs).
import { GESTURES, GRIP_POSE, GRIP_STYLE } from './natpf_gesture_motion.js';

export const D = Math.PI/180;
// schede del tutorial nell'ordine della modale (natpf_tutorial.TUTORIAL_CARDS) e gesti degli esercizi dell'Allenamento
export const CARD_IDS = Object.freeze(['grip', 'ready', 'forehand', 'backhand', 'serve', 'flat', 'lob', 'drop', 'slice', 'smash', 'volley']);
export const EXERCISE_IDS = Object.freeze(['cross', 'line']);
export const POSE_IDS = Object.freeze([...CARD_IDS, ...EXERCISE_IDS]);
export const SHOULDER = Object.freeze([.19, 1.42, 0]);       // spalla destra (m, dal centro dei piedi), come il modello di prima
export const REACH = .8;
export const K = .8*REACH;                                    // raggio spalla → telefono = K × rc dei moti del gioco
export const READY = Object.freeze([.05*REACH, -.42*REACH, -.30*REACH]);   // posizione di partenza (specifica §2.2), dalla spalla
export const PHONE = Object.freeze({ w: .079, h: .162, d: .0086, r: .0105 });   // 162 × 79 × 8,6 mm (Android grande)
export const BALL_R = .034;
export const IMPACT_WINDOW = .03;                             // s: «Impatto» scritto per ±30 ms attorno al contatto

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
// angolo (gradi) tra due orientamenti
export function qangle(a, b){ const c = Math.abs(a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]); return 2*Math.acos(Math.min(1, c))/D; }
// velocità angolare (°/s, campo) che porta qa in qb in dt secondi
export function omega(qa, qb, dt){
  let d = qmul(qb, qconj(qa)); if (d[3] < 0) d = d.map(v => -v);
  const s = Math.hypot(d[0], d[1], d[2]); if (s < 1e-12) return [0, 0, 0];
  const ang = 2*Math.atan2(s, d[3]);
  return [d[0]/s*ang/dt/D, d[1]/s*ang/dt/D, d[2]/s*ang/dt/D];
}
export const rotateAbout = (v, axis, ang) => qrot(qaxis(axis, ang), v);
// Euler XYZ in gradi come three.js (q = qX·qY·qZ)
export const qEuler = ([x, y, z]) => qmul(qmul(qaxis([1, 0, 0], x*D), qaxis([0, 1, 0], y*D)), qaxis([0, 0, 1], z*D));
// specchio destra–sinistra (mancino)
export const mirrorPos = p => [-p[0], p[1], p[2]];
export const mirrorQ = q => [q[0], -q[1], -q[2], q[3]];

/* ---------- presa ---------- */
// grip: 'palmo' | 'martello' (GRIP_POSE) | { lean, tilt } (presa nel palmo con la cima lean gradi verso l'interno e tilt
// gradi in avanti, come test/arm-sim.photoGrip) | { euler }. Predefinita: la presa insegnata (GRIP_STYLE).
export function gripQuat(grip = GRIP_STYLE){
  if (typeof grip === 'string') return qEuler((GRIP_POSE[grip] || GRIP_POSE[GRIP_STYLE]).euler);
  if (grip?.euler) return qEuler(grip.euler);
  return qEuler([-(grip?.tilt ?? GRIP_POSE.palmo.tilt), 0, grip?.lean ?? GRIP_POSE.palmo.lean]);
}
const gripKey = grip => typeof grip === 'string' ? grip : JSON.stringify(grip ?? GRIP_STYLE);

/* ---------- profili di velocità ---------- */
const clamp01 = u => u < 0 ? 0 : u > 1 ? 1 : u;
export const mj = u => { u = clamp01(u); return u*u*u*(10 - 15*u + 6*u*u); };            // minimo jerk (picco 1,875/T)
export const prepEase = u => { u = clamp01(u); return u*u*u*(4 - 3*u); };                 // velocità 12u²(1−u) (picco 16/9)
// ritorno con un piccolo superamento (~2,6% dell'ampiezza) e assestamento: f(0)=0, f(1)=1, f'(0)=f'(1)=0
export const settle = u => { u = clamp01(u); return mj(u) + .45*Math.sin(Math.PI*u)**2*u*u; };
// ∫ 2 sin²(πu) du: 0 → 1 (legge cicloidale della parte veloce)
export const bell = u => { u = clamp01(u); return u - Math.sin(2*Math.PI*u)/(2*Math.PI); };
// polso come natpf_gesture_motion.wristAngle: wrist·sin²(π(1,4u − 0,2)) nella seconda metà del colpo (gradi)
const wristAt = (s, u) => { const a = clamp01(u*1.4 - .2); return (s.wrist || 0)*(s.ms/1000)/1.4*(a/2 - Math.sin(2*Math.PI*a)/(4*Math.PI)); };

/* ---------- tempi per colpo (s, tempo reale): brief §5.4 ---------- */
// hold: fermo iniziale (respiro); prep: preparazione; prepAmp: gradi della preparazione (predefinito: metà della parte
// veloce, così l'impatto è nella posa di partenza); overlap: la parte veloce comincia così prima della fine della
// preparazione; follow: fermo in fine colpo; back: ritorno; rest: fermo finale; trunk: rotazione del busto per grado del
// braccio attorno alla verticale (solo disegno). Cicli: dritto 2,25 s (contatto a 1,03), piatto 2,4, tagliato 2,2,
// pallonetto 2,56, palla corta 2,2, schiacciata 2,7, volée 1,9 (brief §5.4).
export const TIMING = Object.freeze({
  forehand: Object.freeze({ hold: .35, prep: .55, overlap: 0, follow: .14, back: .52, rest: .45, trunk: .32 }),
  backhand: Object.freeze({ hold: .35, prep: .55, overlap: 0, follow: .14, back: .52, rest: .45, trunk: .3 }),
  flat:     Object.freeze({ hold: .35, prep: .55, overlap: 0, follow: .14, back: .65, rest: .5, trunk: .36 }),
  slice:    Object.freeze({ hold: .35, prep: .5, overlap: 0, follow: .16, back: .52, rest: .43, trunk: .28 }),
  lob:      Object.freeze({ hold: .3, prep: .85, overlap: .045, follow: .16, back: .55, rest: .4, trunk: 0 }),
  drop:     Object.freeze({ hold: .4, prep: .42, overlap: .03, follow: .2, back: .48, rest: .45, trunk: 0 }),
  smash:    Object.freeze({ hold: .3, prep: 1.0, overlap: .05, follow: .16, back: .6, rest: .4, trunk: 0 }),
  volley:   Object.freeze({ hold: .35, prep: .24, prepAmp: 12, overlap: 0, follow: .1, back: .45, rest: .56, trunk: .15 }),
  // mira degli esercizi (incrociato, lungolinea): il piatto gira attorno alla verticale durante la carica e torna più
  // piano del braccio (back) e tornano più piano del dritto: il piatto e il braccio rientrano insieme, sotto i 250 °/s
  cross:    Object.freeze({ hold: .35, prep: .55, overlap: 0, follow: .14, back: .62, aimBack: .8, rest: .4, trunk: .32 }),
  line:     Object.freeze({ hold: .35, prep: .55, overlap: 0, follow: .14, back: .62, aimBack: .8, rest: .4, trunk: .32 }),
});
// servizio: fermo, preparazione (la mano scende un poco e il telefono si inclina indietro, ≤ 60 °/s), lancio, raccordo
// (minimo jerk, la mano va sopra la testa, il telefono ruota appena), battuta che comincia `overlap` prima della fine del
// raccordo (nessun fermo «a trofeo»); GAP = picco del lancio → picco della battuta = colmo della palla del gioco
// (vy 6,32 m/s, g 9,15: 0,69 s, specifica §1.4)
export const SERVE_TIMING = Object.freeze({ hold: .3, prep: 1.0, gap: .69, tossHold: .02, overlap: .08, follow: .16, back: .9, rest: .4 });
export const STILL_TIMING = Object.freeze({ grip: 9, ready: 4 });

// fasi: id → testo breve da scrivere (brief §5.5)
export const PHASES = Object.freeze({
  fermo: '', pronto: 'Pronto', preparazione: 'Carica', accelerazione: 'Colpo', impatto: 'Impatto',
  accompagnamento: 'Accompagna', ritorno: 'Ritorno', lancio: 'Lancio', caricamento: 'Braccio in alto', battuta: 'Battuta',
});

// Camere per scheda (brief §5.3; per dritto, rovescio, servizio, pallonetto, palla corta e presa quelle del prototipo
// illustrato già giudicato, prototipi/b9-motion/main.js VIEWS). Solo dati per il disegno: dir = direzione soggetto →
// camera nel campo (x a destra, y in alto, +z dietro chi gioca; il mancino la specchia, cameraFor), dist = distanza (m,
// prospettiva moderata), follow = la camera segue la mano (media pesata su ±window s, mix tra il centro dell'arco e la
// mano, size = altezza inquadrata in m), views/seq = presa: due viste ferme e il giro della camera tra le due (s).
export const CAMERAS = Object.freeze({
  grip: Object.freeze({ views: Object.freeze([[-.36, .78, .5], [.95, .3, -.12]]), dist: 1.0, seq: Object.freeze([3, 1.5, 3, 1.5]), read: 'pollice sul bordo destro, dita attorno al sinistro, cima in avanti e verso l\u2019interno' }),
  ready: Object.freeze({ dir: [.6, .45, .8], dist: 2.2, read: 'telefono fermo nella posa di partenza' }),
  forehand: Object.freeze({ dir: [-.35, .62, 1], dist: 2.2, read: 'arco orizzontale da destra a sinistra, mano alla stessa altezza' }),
  flat: Object.freeze({ dir: [-.35, .62, 1], dist: 2.2, read: 'come il dritto, più veloce' }),
  backhand: Object.freeze({ dir: [.35, .62, 1], dist: 2.2, read: 'arco da sinistra a destra, partenza dall\u2019anca sinistra' }),
  slice: Object.freeze({ dir: [-.2, .22, 1], dist: 2.2, read: 'la mano scende durante il colpo' }),
  lob: Object.freeze({ dir: [1, .5, -.35], dist: 2.2, read: 'la mano sale, schermo verso il cielo alla fine' }),
  drop: Object.freeze({ dir: [.75, .55, .6], dist: 2.2, read: 'gesto corto e lento, mano che scende un poco' }),
  serve: Object.freeze({ dir: [1, .2, .25], dist: 2.2, follow: Object.freeze({ window: .24, mix: .5, size: .45 }), read: 'lancio, braccio in alto con il telefono di faccia, battuta al colmo della palla' }),
  smash: Object.freeze({ dir: [1, .2, .25], dist: 2.2, follow: Object.freeze({ window: .24, mix: .5, size: .45 }), read: 'braccio in alto, poi giù deciso' }),
  volley: Object.freeze({ dir: [.55, .45, -.7], dist: 2.2, read: 'preparazione quasi nulla, gesto corto e deciso' }),
  cross: Object.freeze({ dir: [-.35, .62, 1], dist: 2.2, read: 'piatto girato verso il centro' }),
  line: Object.freeze({ dir: [-.35, .62, 1], dist: 2.2, read: 'piatto girato verso l\u2019esterno' }),
});
// camera della scheda per la mano: il mancino vede lo specchio (x → −x della direzione)
export function cameraFor(id, { hand = 'right' } = {}){
  const c = CAMERAS[id]; if (!c) return null;
  if (hand !== 'left') return c;
  const m = v => [-v[0], v[1], v[2]];
  return { ...c, ...(c.dir ? { dir: m(c.dir) } : {}), ...(c.views ? { views: c.views.map(m) } : {}) };
}

const SH = SHOULDER;
const readyPos = () => add(SH, READY);

/* ---------- colpi ---------- */
function strokePlan(id, Q0){
  const g = GESTURES[id], s = g.stroke, e = TIMING[id];
  const ms = s.ms/1000, travel = s.peak*ms/2, H = travel/2;
  const Hp = Math.min(H, e.prepAmp ?? H), phiC = H - Hp, phiE = travel - Hp;
  const A = norm(s.axis), WA0 = s.wristAxis ? norm(s.wristAxis) : null, yaw = (g.preYaw || 0)*D;
  const T = { hold: e.hold }; T.load = T.hold + e.prep; T.swing = T.load - e.overlap; T.contact = T.swing + ms/2;
  T.end = T.swing + ms; T.back = T.end + e.follow; T.home = T.back + e.back; T.total = T.home + e.rest;
  const wFull = wristAt(s, 1);
  // angolo del braccio φ (gradi; 0 = posa di partenza), polso ψ, peso della posizione sul percorso, rotazione di mira
  const at = t => {
    if (t <= T.hold) return { phi: 0, psi: 0, on: 0, aim: 0 };
    if (t < T.back){
      const up = (t - T.hold)/e.prep, us = (t - T.swing)/ms;
      const phi = -Hp*prepEase(up) + (t > T.swing ? travel*bell(us) : 0);
      return { phi, psi: t > T.swing ? wristAt(s, us) : 0, on: mj(up), aim: mj(up) };
    }
    const aim = 1 - settle((t - T.back)/(e.aimBack || e.back));
    if (t <= T.home){ const k = 1 - settle((t - T.back)/e.back); return { phi: phiE*k, psi: wFull*k, on: k, aim }; }
    return { phi: 0, psi: 0, on: 0, aim };
  };
  const rc = mul(s.rc, K), P0 = readyPos();
  const raw = t => {
    const a = at(t), f = a.phi*D;
    let q = qmul(qaxis(A, f), a.aim && yaw ? qmul(qaxis([0, 1, 0], yaw*a.aim), Q0) : Q0);
    if (WA0 && a.psi) q = qmul(qaxis(rotateAbout(WA0, A, f), a.psi*D), q);
    const onPath = add(SH, rotateAbout(rc, A, f - phiC*D));
    const pos = lerp(P0, onPath, a.on);
    // respiro: 3 mm su e giù nei fermi, nullo ai bordi (il ciclo si chiude senza scatti)
    if (t < T.hold) pos[1] += Math.sin(Math.PI*t/T.hold)**2*.003;
    else if (t > T.home) pos[1] += Math.sin(Math.PI*(t - T.home)/(T.total - T.home))**2*.003;
    return { pos, q, trunk: (e.trunk || 0)*a.phi*Math.sign(A[1] || 1)*D };
  };
  // istante dell'inversione (fine della carica: φ minimo), cercato al millisecondo
  let inv = T.swing, lo = Infinity;
  for (let t = T.swing - .001; t <= T.load + .001; t += .0005){ const f = at(t).phi; if (f < lo){ lo = f; inv = t; } }
  T.inv = inv;
  const W = IMPACT_WINDOW;
  const phases = [
    ['pronto', 0, T.hold], ['preparazione', T.hold, T.inv], ['accelerazione', T.inv, T.contact - W], ['impatto', T.contact - W, T.contact + W],
    ['accompagnamento', T.contact + W, T.back], ['ritorno', T.back, T.home], ['pronto', T.home, T.total],
  ];
  const keys = [
    { id: 'carica', t: T.inv, label: 'Carica' },
    { id: 'impatto', t: T.contact, label: 'Impatto' },
    { id: 'fine', t: T.end + .02, label: 'Fine' },
  ];
  const caps = { prep: Hp*16/9/e.prep };
  return { id, kind: 'stroke', T, raw, phases, keys, contact: T.contact, total: T.total, peak: s.peak, prepAmp: Hp, travel, caps,
    ball: g.ball || 'ground', ballHigh: !!g.ballHigh, expect: g.expect, aim: g.aim || 0 };
}

/* ---------- servizio continuo ---------- */
function servePlan(Q0){
  const g = GESTURES.serve, ts = g.toss, hs = g.stroke, e = SERVE_TIMING;
  const tMs = ts.ms/1000, hMs = hs.ms/1000, tTravel = ts.peak*tMs/2, hTravel = hs.peak*hMs/2;
  const tH = tTravel/2, hH = hTravel/2, At = norm(ts.axis), Ah = norm(hs.axis);
  const T = { hold: e.hold }; T.load = T.hold + e.prep; T.tossPeak = T.load + tMs/2; T.tossEnd = T.load + tMs;
  T.contact = T.tossPeak + e.gap; T.hitStart = T.contact - hMs/2; T.end = T.hitStart + hMs;
  T.linkStart = T.tossEnd + e.tossHold; T.linkEnd = T.hitStart + e.overlap;
  T.back = T.end + e.follow; T.home = T.back + e.back; T.total = T.home + e.rest;
  T.inv = T.hitStart; T.swing = T.hitStart;
  const rcT = mul(ts.rc, K), rcH = mul(hs.rc, K), P0 = readyPos();
  const tossPose = deg => ({ pos: add(SH, rotateAbout(rcT, At, deg*D)), q: qmul(qaxis(At, deg*D), Q0) });
  const hitPose = deg => ({ pos: add(SH, rotateAbout(rcH, Ah, deg*D)), q: qmul(qaxis(Ah, deg*D), Q0) });
  const A = tossPose(tH), B = hitPose(-hH), E = hitPose(hH);
  // raccordo: la mano sale sopra la testa passando un poco all'esterno (arco), il telefono ruota appena (slerp)
  const arc = (a, b, u) => { const p = lerp(a, b, u), lift = Math.sin(Math.PI*u)*.05; return [p[0] + lift*.6, p[1], p[2] + lift]; };
  const link = t => { const k = mj((t - T.linkStart)/(T.linkEnd - T.linkStart)); return { pos: arc(A.pos, B.pos, k), q: qslerp(A.q, B.q, k) }; };
  // battuta composta sul raccordo: rotazione attorno all'asse della battuta e spostamento dalla posa di caricamento B
  // (uguale a hitPose quando il raccordo è finito)
  const hit = (t, L) => {
    const deg = hTravel*bell((t - T.hitStart)/hMs), H1 = hitPose(-hH + deg);
    return { pos: add(L.pos, sub(H1.pos, B.pos)), q: qmul(qaxis(Ah, deg*D), L.q) };
  };
  const raw = t => {
    let s;
    if (t <= T.hold) s = { pos: P0, q: Q0 };
    else if (t <= T.load){ const u = (t - T.hold)/e.prep, L = tossPose(-tH*prepEase(u)); s = { pos: lerp(P0, L.pos, mj(u)), q: L.q }; }
    else if (t <= T.tossEnd) s = tossPose(-tH + tTravel*bell((t - T.load)/tMs));
    else if (t <= T.linkStart) s = A;
    else if (t <= T.hitStart) s = link(t);
    else if (t <= T.end) s = hit(t, t < T.linkEnd ? link(t) : B);
    else if (t <= T.back) s = E;
    else if (t <= T.home){ const k = settle((t - T.back)/e.back); s = { pos: lerp(E.pos, P0, k), q: qslerp(E.q, Q0, k) }; }
    else s = { pos: P0, q: Q0 };
    const pos = s.pos.slice();
    if (t < T.hold) pos[1] += Math.sin(Math.PI*t/T.hold)**2*.003;
    else if (t > T.home) pos[1] += Math.sin(Math.PI*(t - T.home)/(T.total - T.home))**2*.003;
    return { pos, q: s.q, trunk: 0 };
  };
  const W = IMPACT_WINDOW;
  const phases = [
    ['pronto', 0, T.hold], ['preparazione', T.hold, T.load], ['lancio', T.load, T.linkStart], ['caricamento', T.linkStart, T.hitStart],
    ['battuta', T.hitStart, T.contact - W], ['impatto', T.contact - W, T.contact + W], ['accompagnamento', T.contact + W, T.back],
    ['ritorno', T.back, T.home], ['pronto', T.home, T.total],
  ];
  const keys = [
    { id: 'lancio', t: T.tossEnd, label: 'Lancio' },
    { id: 'caricamento', t: T.hitStart, label: 'Braccio in alto' },
    { id: 'impatto', t: T.contact, label: 'Impatto' },
  ];
  return { id: 'serve', kind: 'serve', T, raw, phases, keys, contact: T.contact, tossPeak: T.tossPeak, total: T.total, peak: hs.peak,
    tossPeakSpeed: ts.peak, caps: { prep: tH*16/9/e.prep }, ball: 'toss', ballHigh: true, expect: g.expect };
}

/* ---------- presa e posizione di partenza: ferme ---------- */
function stillPlan(id, Q0){
  const total = STILL_TIMING[id], P0 = readyPos();
  // respiro di 3 mm (periodo 2 s): nessuna rotazione, come il passo «fermo» della calibrazione
  const raw = t => ({ pos: [P0[0], P0[1] + Math.sin(Math.PI*t)**2*.003, P0[2]], q: Q0, trunk: 0 });
  // presa: la camera gira (dagli occhi di chi gioca → di lato → ritorno), non la mano (specifica §2.1)
  const keys = id === 'grip' ? [{ id: 'davanti', t: 1.5, label: 'Come la vedi tu' }, { id: 'lato', t: 6, label: 'Di lato' }] : [];
  return { id, kind: 'still', T: { total }, raw, phases: [['fermo', 0, total]], keys, contact: null, total, peak: 0, still: true,
    ball: null, ballHigh: false, expect: { messages: 0 } };
}

const plans = new Map();
// piano di un gesto (cache per gesto e presa). Le fasi sono [{ id, label, from, to }] in ordine.
export function gesturePlan(id, { grip = GRIP_STYLE } = {}){
  const key = id + '|' + gripKey(grip);
  if (plans.has(key)) return plans.get(key);
  const g = GESTURES[id];
  if (!g) throw new Error(`gesto sconosciuto: ${id}`);
  const Q0 = gripQuat(grip);
  const p = g.still ? stillPlan(id, Q0) : g.toss ? servePlan(Q0) : strokePlan(id, Q0);
  p.phases = p.phases.map(([pid, from, to]) => Object.freeze({ id: pid, label: PHASES[pid], from, to }));
  p.grip = grip; p.Q0 = Q0;
  plans.set(key, p);
  return p;
}
export const cycleOf = (id, o) => gesturePlan(id, o).total;
export const contactOf = (id, o) => gesturePlan(id, o).contact;
const wrapT = (P, t) => ((t % P.total) + P.total) % P.total;
export function phaseAt(id, t, o){
  const P = gesturePlan(id, o), tt = wrapT(P, t);
  for (const ph of P.phases) if (tt < ph.to) return { ...ph, u: (tt - ph.from)/Math.max(1e-9, ph.to - ph.from) };
  const last = P.phases[P.phases.length - 1]; return { ...last, u: 1 };
}
function rawPose(P, t, hand){
  const p = P.raw(wrapT(P, t));
  return hand === 'left' ? { pos: mirrorPos(p.pos), q: mirrorQ(p.q), trunk: -p.trunk } : p;
}
// Posa del telefono al tempo t (s, tempo reale; il ciclo si ripete): pos (centro del telefono, m, campo), q (telefono →
// campo), phase/label (fase e testo), u (avanzamento nella fase), speed (|ω| °/s), contact e cycle (s), trunk (rad,
// rotazione del busto: solo disegno). rig: true aggiunge lo scheletro (gestureRig).
export function gesturePose(id, t, { hand = 'right', grip = GRIP_STYLE, rig = false } = {}){
  const P = gesturePlan(id, { grip }), h = 1/480;
  const p = rawPose(P, t, hand), ph = phaseAt(id, t, { grip });
  const speed = P.still ? 0 : len(omega(rawPose(P, t - h/2, hand).q, rawPose(P, t + h/2, hand).q, h));
  const out = { id, t: wrapT(P, t), pos: p.pos, q: p.q, trunk: p.trunk, phase: ph.id, label: ph.label, u: ph.u, speed, contact: P.contact, cycle: P.total, hand };
  if (rig) out.rig = gestureRig(out, { hand });
  return out;
}
// velocità di rotazione del telefono (°/s) al tempo t e curva di un ciclo (per la banda «Picco = impatto» e la scia)
export const gestureSpeed = (id, t, o = {}) => gesturePose(id, t, o).speed;
export function speedCurve(id, { hand = 'right', grip = GRIP_STYLE, step = 1/120 } = {}){
  const P = gesturePlan(id, { grip }), n = Math.round(P.total/step), t = new Float32Array(n + 1), w = new Float32Array(n + 1);
  let max = 0, at = 0;
  for (let i = 0; i <= n; i++){ t[i] = i*step; w[i] = gestureSpeed(id, t[i], { hand, grip }); if (w[i] > max){ max = w[i]; at = t[i]; } }
  return { t, w, max, at, contact: P.contact, total: P.total };
}

/* ---------- scheletro: avambraccio, mano e telefono (dati del disegno) ---------- */
// Da prototipi/b9-motion/rig.js. La mano è rigida con il telefono (presa nel palmo) e anche l'avambraccio: la specifica
// (§1.5, §2.3) chiede il polso fermo, «il telefono gira con il braccio»; il polso resta piegato di ~32° (flesso e deviato
// verso il mignolo, come nella foto della presa), il braccio superiore va dal gomito verso la spalla (solo direzione: il
// disegno lo sfuma fuori quadro). Riferimento del telefono in mm; mano destra.
// Presa nel palmo (docs/riferimenti/presa-palmo-utente-2026-11-04.webp, grip-art palmFront): il dorso del telefono sul
// palmo, il bordo inferiore sull'eminenza, le quattro dita attorno al bordo lungo sinistro nella metà bassa con i
// polpastrelli sul bordo (sporgono sul vetro 6–8 mm, non oltre), il pollice disteso lungo il bordo destro, a metà altezza,
// lontano dallo schermo. Per la presa «martello» (rollback) la mano non è questa: il disegno dovrà avere la sua.
export const ARM = Object.freeze({ upper: .29, fore: .262 });
export const HAND = Object.freeze({
  wrist: [36, -104, -24], wristR: [27, 19],
  heel: [[30, -84, -21, 20], [2, -88, -22, 18], [14, -60, -24, 22]],     // eminenza tenar, ipotenar, centro del palmo (x, y, z, r)
  fingers: [
    { name: 'index',  mcp: [-13, -8, -18], dir: [-1, .30, 0], L: [40, 23, 18], flex: [12, 68, 116], r: [9.0, 8.0, 7.2, 6.5] },
    { name: 'middle', mcp: [-8, -27, -19], dir: [-1, .10, 0], L: [44, 25, 19], flex: [12, 68, 116], r: [9.4, 8.4, 7.5, 6.7] },
    { name: 'ring',   mcp: [-10, -46, -18], dir: [-1, -.08, 0], L: [41, 24, 18], flex: [12, 68, 116], r: [8.8, 7.8, 7.1, 6.4] },
    { name: 'pinky',  mcp: [-16, -63, -16], dir: [-1, -.26, 0], L: [33, 19, 16], flex: [12, 70, 110], r: [7.9, 7.0, 6.4, 5.8] },
  ],
  palmN: [0, 0, 1],
  thumb: { pts: [[30, -84, -18], [46, -52, -8], [49, -22, -1], [47, 4, 3]], r: [15, 11.4, 10.2, 9.0] },
  // polso → gomito nel riferimento del telefono: con la presa nel palmo l'avambraccio torna verso il corpo in diagonale,
  // quasi orizzontale
  forearmDir: [.27, -.85, .46],
});
// avambraccio: profilo (frazione della lunghezza dal polso, raggio mm), polsino e inizio della manica (frazioni)
export const FOREARM_PROFILE = Object.freeze([[0, 25], [.18, 28], [.45, 36], [.75, 38], [1, 34]]);
export const BAND = Object.freeze({ from: .045, to: .13 });
export const CUFF = .56;
const mm = v => v.map(x => x/1000);
function fingerChain(f){
  const d0 = norm(f.dir), k = norm(cross(d0, HAND.palmN)), pts = [f.mcp.slice()];
  let ang = 0, p = f.mcp.slice();
  for (let i = 0; i < 3; i++){ ang += f.flex[i]*D; p = add(p, mul(rotateAbout(d0, k, ang), f.L[i])); pts.push(p); }
  return pts;
}
// punti della mano nel riferimento del telefono (m): dita [nocca, interfalangea prossimale, distale, polpastrello]
export const HAND_LOCAL = Object.freeze({
  wrist: mm(HAND.wrist), wristR: HAND.wristR.map(x => x/1000),
  heel: HAND.heel.map(h => ({ p: mm(h.slice(0, 3)), r: h[3]/1000 })),
  fingers: HAND.fingers.map(f => ({ name: f.name, pts: fingerChain(f).map(mm), r: f.r.map(x => x/1000) })),
  thumb: { pts: HAND.thumb.pts.map(mm), r: HAND.thumb.r.map(x => x/1000) },
  forearmDir: norm(HAND.forearmDir),
});
// Scheletro nel campo per una posa del telefono { pos, q } (della mano `hand`): spalla S, gomito E, polso W (m), versori
// dell'avambraccio F (polso → gomito) e del braccio U (gomito → spalla), flessione del gomito (gradi), dita e pollice,
// punti del telefono. Il mancino è lo specchio esatto dello scheletro del destro.
// Affidabili per il disegno: telefono, mano, dita, polso e avambraccio (rigidi con il telefono: «polso fermo», la
// direzione dell'avambraccio è quella del prototipo illustrato giudicato, brief §5.2: si disegna fino al gomito, che
// sfuma fuori quadro). Indicativi: spalla, braccio ed elbowDeg. Il braccio superiore non è risolto con la cinematica
// inversa: S è a ARM.upper dal gomito verso la spalla del modello e shoulderShift dice quanto se ne scosta (fino a
// ~0,43 m nel dritto all'impatto: con il telefono a 0,46 m dalla spalla e l'avambraccio rigido il gomito non sta a
// distanza di braccio dalla spalla fissa). Chi vuole disegnare anche il braccio deve risolverlo (docs/b9/posa-gesti.md).
export function gestureRig(pose, { hand = pose.hand || 'right' } = {}){
  const left = hand === 'left', pr = left ? { pos: mirrorPos(pose.pos), q: mirrorQ(pose.q) } : pose;
  const T = v => add(pr.pos, qrot(pr.q, v));
  const W = T(HAND_LOCAL.wrist), F = qrot(pr.q, HAND_LOCAL.forearmDir);
  const E = add(W, mul(F, ARM.fore)), U = norm(sub(SH, E)), S = add(E, mul(U, ARM.upper));
  const elbow = Math.acos(Math.max(-1, Math.min(1, dot(U, F))))/D;          // angolo al gomito tra braccio e avambraccio
  const hh = PHONE.h/2;
  const rig = {
    shoulder: S, elbow: E, wrist: W, forearm: F, upperArm: U, elbowDeg: elbow, shoulderShift: len(sub(S, SH)),
    heel: HAND_LOCAL.heel.map(h => ({ p: T(h.p), r: h.r })),
    fingers: HAND_LOCAL.fingers.map(f => ({ name: f.name, pts: f.pts.map(T), r: f.r })),
    thumb: { pts: HAND_LOCAL.thumb.pts.map(T), r: HAND_LOCAL.thumb.r },
    phone: { center: pr.pos, tip: T([0, hh, 0]), base: T([0, -hh, 0]), screen: qrot(pr.q, [0, 0, 1]), right: qrot(pr.q, [1, 0, 0]) },
  };
  if (!left) return rig;
  const M = mirrorPos, mv = v => [-v[0], v[1], v[2]];
  return { ...rig, shoulder: M(rig.shoulder), elbow: M(rig.elbow), wrist: M(rig.wrist), forearm: mv(rig.forearm), upperArm: mv(rig.upperArm),
    heel: rig.heel.map(h => ({ p: M(h.p), r: h.r })), fingers: rig.fingers.map(f => ({ ...f, pts: f.pts.map(M) })),
    thumb: { ...rig.thumb, pts: rig.thumb.pts.map(M) },
    phone: { center: M(rig.phone.center), tip: M(rig.phone.tip), base: M(rig.phone.base), screen: mv(rig.phone.screen), right: mv(rig.phone.right) } };
}
// quanto le dita sporgono sullo schermo (m, massimo sul ciclo misurabile da chi verifica): distanza dei polpastrelli
// oltre il bordo, dentro il rettangolo del vetro
export function fingersOverGlass(){
  const hw = PHONE.w/2;
  let worst = 0;
  for (const f of HAND_LOCAL.fingers) for (const p of f.pts.slice(1)) if (p[2] > 0 && Math.abs(p[1]) < PHONE.h/2) worst = Math.max(worst, p[0] + hw);
  return worst;
}

/* ---------- palla ---------- */
const G = 9.81;
// punto di contatto (destro): davanti alla faccia del telefono che guarda la palla in arrivo (−z), verso la cima
function contactPoint(P){
  const p = P.raw(P.contact), n = qrot(p.q, [0, 0, 1]), s = dot(n, [0, 0, -1]) >= 0 ? 1 : -1;
  return add(add(p.pos, qrot(p.q, [0, PHONE.h/2*.72, 0])), mul(n, s*(PHONE.d/2 + BALL_R)));
}
// palla del colpo (destro): arriva (dopo il rimbalzo, al volo o alta) e incontra la cima del telefono nell'istante del
// picco (= contatto), poi riparte nella direzione del colpo
function strokeBall(P, t){
  const C = contactPoint(P), dt = t - P.contact;
  if (dt < 0){
    if (P.ball === 'volley'){
      const ta = .8; if (-dt > ta) return null;
      const A = [C[0] - .5, 1.25, C[2] - 9], s = ta + dt, vy = (C[1] - A[1] + .5*G*ta*ta)/ta, u = s/ta;
      return [A[0] + (C[0] - A[0])*u, A[1] + vy*s - .5*G*s*s, A[2] + (C[2] - A[2])*u];
    }
    if (P.ball === 'high'){
      const ta = 1.1; if (-dt > ta) return null;
      const A = [C[0] - .4, C[1] + 1.2, C[2] - 7], s = ta + dt, vy = (C[1] - A[1] + .5*G*ta*ta)/ta, u = s/ta;
      return [A[0] + (C[0] - A[0])*u, A[1] + vy*s - .5*G*s*s, A[2] + (C[2] - A[2])*u];
    }
    // dopo il rimbalzo: rimbalzo ~3 m davanti 0,42 s prima del contatto; partenza 1,0 s prima, da ~9 m
    const tb = .42, ta = 1.0; if (-dt > ta) return null;
    const B = [C[0] - .35, BALL_R, C[2] - 3.0], A = [C[0] - .9, 1.1, C[2] - 9];
    if (-dt <= tb){
      const u = (tb + dt)/tb, vy = (C[1] - BALL_R + .5*G*tb*tb)/tb, s = tb + dt;
      return [B[0] + (C[0] - B[0])*u, BALL_R + vy*s - .5*G*s*s, B[2] + (C[2] - B[2])*u];
    }
    const span = ta - tb, s = ta + dt, u = s/span, vy = (BALL_R - A[1] + .5*G*span*span)/span;
    return [A[0] + (B[0] - A[0])*u, A[1] + vy*s - .5*G*s*s, A[2] + (B[2] - A[2])*u];
  }
  if (dt > .75) return null;
  const V = { lob: [.4, 7.2, -6.5], drop: [.2, 2.6, -3.2], backhand: [.9, 2.2, -13], slice: [-.6, 1.4, -11], smash: [-.3, -3.5, -15],
    flat: [-.8, 1.6, -18], volley: [-.6, 1.2, -10], cross: [-3.2, 2.4, -13], line: [.6, 2.4, -14] };
  const v = V[P.id] || [-1.2, 2.4, -14];
  return [C[0] + v[0]*dt, C[1] + v[1]*dt - .5*G*dt*dt, C[2] + v[2]*dt];
}
// palla del servizio (destro): appoggiata sul vetro del telefono (verso la cima, a un raggio dal vetro lungo la normale
// dello schermo: tocca il telefono senza entrarci) dall'inizio del ciclo fino al picco del lancio, quando il telefono è
// più veloce e comincia a frenare: lì la palla si stacca con la velocità che ha (≈ quella del punto d'appoggio) e sale
// fino al colmo nell'istante della battuta, dove la incontra la cima del telefono. Revisione B9 del 06/11: prima era
// lasciata alla fine del lancio 9,5 mm dentro il telefono e saliva di soli 0,30 m (gravità 2,6 m/s², «galleggiava»); ora
// sale di ~0,45 m in 0,69 s con la velocità di stacco del telefono. La modale scala l'altezza (gravità ridotta), mai il
// tempo (specifica §2.5).
export const SERVE_BALL_REST = Object.freeze([0, PHONE.h*.22, PHONE.d/2 + BALL_R]);   // punto d'appoggio (riferimento del telefono)
const restOn = p => add(p.pos, qrot(p.q, SERVE_BALL_REST));
function serveBall(P, t){
  const T = P.T, apex = contactPoint(P);
  if (t <= T.tossPeak) return restOn(P.raw(t));
  const release = restOn(P.raw(T.tossPeak));
  if (t <= T.contact){
    const span = T.contact - T.tossPeak, g = 2*Math.max(.2, apex[1] - release[1])/(span*span), s = T.contact - t, u = (t - T.tossPeak)/span;
    return [release[0] + (apex[0] - release[0])*u, apex[1] - .5*g*s*s, release[2] + (apex[2] - release[2])*u];
  }
  const dt = t - T.contact; if (dt > .6) return null;
  // battuta dall'alto: la palla parte in avanti e un poco verso il basso (il colmo resta l'istante del contatto)
  return [apex[0] - .3*dt, apex[1] - 1.0*dt - .5*G*dt*dt, apex[2] - 16*dt];
}
// posizione della palla (m, campo) al tempo t, o null quando non è in scena (presa e posizione: mai)
export function gestureBall(id, t, { hand = 'right', grip = GRIP_STYLE } = {}){
  const P = gesturePlan(id, { grip });
  if (P.still) return null;
  const tt = wrapT(P, t), b = P.kind === 'serve' ? serveBall(P, tt) : strokeBall(P, tt);
  return b && hand === 'left' ? mirrorPos(b) : b;
}
// punto in cui la palla tocca il telefono nell'istante del contatto (m, campo)
export function gestureContactPoint(id, { hand = 'right', grip = GRIP_STYLE } = {}){
  const P = gesturePlan(id, { grip });
  if (P.still) return null;
  const c = contactPoint(P); return hand === 'left' ? mirrorPos(c) : c;
}
