// Posa dei gesti del tutorial (B13: catena fisica del braccio; prima B9 ramo C): UNA funzione pura e campionabile, la
// stessa per il disegno e per la verifica.
//
//   gesturePose(id, t, { hand, grip }) → { pos, q, phase, label, u, speed, contact, cycle, trunk, chain }
//   gesturePlan(id, { grip })          → { total, contact, tossPeak, T, keys, phases, peak, travel, ball, ... }
//   gestureRig(pose, { hand })         → busto, spalla, gomito, polso, dita e pollice nel campo (dati del disegno)
//   gestureBall(id, t, { hand })       → posizione della palla (arriva sulla cima del telefono nell'istante del contatto)
//
// È la posa del telefono che l'animazione DISEGNA e che test/natpf-gesture-pose.test.mjs fa leggere al telefono simulato
// completo (test/pose-sensors.mjs → test/phone-sim.mjs: rilevatore vero, forma del colpo, calibrazione rapida, mappatura
// del gioco): ciò che si vede è ciò che il gioco riconosce. Niente DOM, niente three.js, niente canvas.
//
// B13 (docs/b13/analisi-gesti.md, docs/b13/gesti-nuovi.md): prima la posa era una rotazione del vettore spalla → telefono
// attorno all'asse del colpo con raggio fisso e l'avambraccio rigido con il telefono: il gomito che ne veniva stava a
// 0,53–0,78 m dalla spalla (l'omero è lungo 0,30) e il dritto si leggeva come un telefono che gira su se stesso. Ora il
// moto è una CATENA CINEMATICA VERA guidata da angoli articolari (busto, spalla a 3 gradi, gomito, pronosupinazione,
// polso a 2 gradi, più l'abbassamento del bacino sulle ginocchia) e il telefono è rigido nel palmo con la presa della
// foto (docs/riferimenti/presa-palmo-utente-2026-11-04.webp). Il telefono gira perché gira la catena: la sua velocità
// angolare è la somma delle velocità articolari (busto e spalla prima, gomito e polso per ultimi: sequenza
// prossimo-distale), le lunghezze dei segmenti sono costanti, gli angoli restano nei limiti del corpo.
//
// Riferimenti: campo x a destra, y in alto (contro la gravità), −z verso lo schermo del computer, giocatore destro; il
// mancino è lo specchio esatto (posizioni x → −x, quaternioni (x, −y, −z, w)). Telefono: y = cima, +z = normale dello
// schermo, +x = bordo destro guardando lo schermo. Mano (catena): −y verso le dita, −z normale del palmo, +x lato del
// pollice. Quaternioni [x, y, z, w] dal locale al campo; posizioni in metri dal centro dei piedi; tempi in secondi a TEMPO
// REALE (la modale può rallentare la riproduzione, i dati no: velocità e «secchezza» sono parte del gesto).
//
// Da natpf_gesture_motion.js si prendono i dati del riconoscimento di ogni colpo (GESTURES: durata della parte veloce,
// palla, colpo atteso, mira) e la presa (GRIP_POSE/GRIP_STYLE, anche il rollback «martello»). Qui si scrive la
// coreografia articolare (CHOREO): pose chiave per angoli e tempi, verificate con il telefono simulato completo.
import { GESTURES, GRIP_POSE, GRIP_STYLE } from './natpf_gesture_motion.js';

export const D = Math.PI/180;
// schede del tutorial nell'ordine della modale (natpf_tutorial.TUTORIAL_CARDS) e gesti degli esercizi dell'Allenamento
export const CARD_IDS = Object.freeze(['grip', 'ready', 'forehand', 'backhand', 'serve', 'flat', 'lob', 'drop', 'slice', 'smash', 'volley']);
export const EXERCISE_IDS = Object.freeze(['cross', 'line']);
export const POSE_IDS = Object.freeze([...CARD_IDS, ...EXERCISE_IDS]);
export const PHONE = Object.freeze({ w: .079, h: .162, d: .0086, r: .0105 });   // 162 × 79 × 8,6 mm (Android grande)
export const BALL_R = .034;
export const BALL_OUT = .5;                                   // velocità della palla in uscita (frazione: solo disegno)
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
// gradi in avanti, come test/arm-sim.photoGrip) | { euler }. Predefinita: la presa insegnata (GRIP_STYLE). È
// l'orientamento del telefono nella posizione di partenza; nella mano il telefono resta poi rigido (gripInHand).
export function gripQuat(grip = GRIP_STYLE){
  if (typeof grip === 'string') return qEuler((GRIP_POSE[grip] || GRIP_POSE[GRIP_STYLE]).euler);
  if (grip?.euler) return qEuler(grip.euler);
  return qEuler([-(grip?.tilt ?? GRIP_POSE.palmo.tilt), 0, grip?.lean ?? GRIP_POSE.palmo.lean]);
}
const gripKey = grip => typeof grip === 'string' ? grip : JSON.stringify(grip ?? GRIP_STYLE);

/* ---------- mani (riferimento del telefono, mm) ---------- */
// Presa nel palmo (docs/riferimenti/presa-palmo-utente-2026-11-04.webp, grip-art palmFront): il dorso del telefono sul
// palmo, il bordo inferiore sull'eminenza, le quattro dita attorno al bordo lungo sinistro nella metà bassa con i
// polpastrelli sul bordo (sporgono sul vetro 6–8 mm, non oltre), il pollice disteso lungo il bordo destro, a metà altezza,
// lontano dallo schermo. forearmDir: direzione polso → gomito della posizione di partenza (con la catena il polso si
// piega: l'avambraccio vero è quello della catena, questa è la direzione approvata con cui è stata risolta REST).
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
  forearmDir: [.27, -.85, .46],
});
// Impugnatura a martello (GRIP_STYLE 'martello', rollback): il pugno stringe il terzo inferiore, il dorso del telefono nel
// palmo, le dita attorno al bordo sinistro fin sul vetro della parte bassa, il pollice chiuso sul bordo destro; l'avambraccio
// prosegue la mano (polso dritto). Stesso formato di HAND.
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
// avambraccio: profilo (frazione della lunghezza dal polso, raggio mm), polsino e inizio della manica (frazioni)
export const FOREARM_PROFILE = Object.freeze([[0, 25], [.18, 28], [.45, 36], [.75, 38], [1, 34]]);
// braccio (omero): raggio alla spalla e al gomito (mm); la manica copre il tratto dalla spalla fino a SLEEVE
export const UPPER_PROFILE = Object.freeze({ shoulder: 44, elbow: 36, sleeve: .45 });
export const BAND = Object.freeze({ from: .045, to: .13 });
export const CUFF = .56;
const mm = v => v.map(x => x/1000);
function fingerChain(f, palmN = HAND.palmN){
  const d0 = norm(f.dir), k = norm(cross(d0, palmN)), pts = [f.mcp.slice()];
  let ang = 0, p = f.mcp.slice();
  for (let i = 0; i < 3; i++){ ang += f.flex[i]*D; p = add(p, mul(rotateAbout(d0, k, ang), f.L[i])); pts.push(p); }
  return pts;
}
// punti della mano nel riferimento del telefono (m): dita [nocca, interfalangea prossimale, distale, polpastrello]
export function localHand(H){
  return Object.freeze({ def: H, wrist: mm(H.wrist), wristR: H.wristR.map(x => x/1000),
    heel: H.heel.map(h => ({ p: mm(h.slice(0, 3)), r: h[3]/1000 })),
    fingers: H.fingers.map(f => ({ name: f.name, pts: fingerChain(f, H.palmN).map(mm), r: f.r.map(x => x/1000) })),
    thumb: { pts: H.thumb.pts.map(mm), r: H.thumb.r.map(x => x/1000) }, forearmDir: norm(H.forearmDir) });
}
export const HAND_LOCAL = localHand(HAND);
export const HAND_LOCAL_MARTELLO = localHand(HAND_MARTELLO);
const handLocalFor = grip => grip === 'martello' ? HAND_LOCAL_MARTELLO : HAND_LOCAL;

/* ---------- corpo e catena cinematica ---------- */
// Misure (adulto ~1,72 m; antropometria media di Winter/Drillis-Contini; spalla come il modello di prima): centro di
// rotazione del busto (bacino) e, da lì, spalla destra, collo, testa; vita (metà larghezza) solo per il disegno.
export const BODY = Object.freeze({ pelvis: Object.freeze([0, 1.0, 0]), shoulder: Object.freeze([.19, .42, 0]), neck: Object.freeze([0, .47, 0]),
  head: Object.freeze([0, .64, -.02]), headR: .105, waist: .14, hip: -.08 });
export const SHOULDER = Object.freeze(add(BODY.pelvis, BODY.shoulder));       // spalla destra a riposo (1,42 m)
export const ARM = Object.freeze({ upper: .30, fore: .262 });
// Gradi di libertà (gradi; y in metri): tau busto attorno alla verticale (+ verso sinistra), lat inclinazione laterale
// (+ spalla destra in basso), y abbassamento del bacino sulle ginocchia (m, − in basso; solo traslazione: il giroscopio
// non lo vede), p piano di elevazione della spalla (0 laterale, 90 in avanti), e elevazione dell'omero dal fianco, r
// rotazione assiale dell'omero (+ interna), b flessione del gomito (0 disteso), pro pronazione dalla supinazione
// anatomica (0 palmo avanti col braccio giù, 90 neutra), fl flessione del polso (+; estensione −), dv deviazione (+
// radiale, verso il pollice; − ulnare)
export const JOINTS = Object.freeze(['tau', 'lat', 'y', 'p', 'e', 'r', 'b', 'pro', 'fl', 'dv']);
export const JOINT_LIMITS = Object.freeze({ tau: [-70, 70], lat: [-25, 25], y: [-.16, .03], p: [-90, 135], e: [0, 175], r: [-100, 75],
  b: [0, 145], pro: [0, 170], fl: [-70, 75], dv: [-30, 20] });
// Posizione di partenza (docs/b13/analisi-gesti.md §4.2): l'omero 20° in avanti, rotazione interna 45°, gomito piegato
// di 83°, avambraccio supinato 66°, polso flesso 27° e deviato verso il mignolo 12°: dà l'orientamento approvato del
// telefono (GRIP_POSE.palmo, errore 0,04°) e la direzione approvata dell'avambraccio, con il gomito al fianco e il
// telefono davanti allo sterno.
export const REST = Object.freeze({ tau: 0, lat: 0, y: 0, p: 90, e: 20, r: 45.4, b: 82.7, pro: 23.6, fl: 27.4, dv: -12.3 });
const Rx = a => qaxis([1, 0, 0], a*D), Ry = a => qaxis([0, 1, 0], a*D), Rz = a => qaxis([0, 0, 1], a*D);
// Cinematica diretta (mano destra): angoli → punti (m, campo) e orientamenti dei segmenti. breath: m di respiro (solo
// traslazione del bacino)
export function armChain(j, breath = 0){
  const T = qmul(Ry(j.tau), Rz(-j.lat));
  const pelvis = [BODY.pelvis[0], BODY.pelvis[1] + (j.y || 0) + breath, BODY.pelvis[2]];
  const S = add(pelvis, qrot(T, BODY.shoulder));
  const ep = j.p*D, upper = qmul(T, qmul(qaxis([Math.sin(ep), 0, Math.cos(ep)], j.e*D), Ry(j.r)));
  const E = add(S, qrot(upper, [0, -ARM.upper, 0]));
  const fore = qmul(upper, qmul(Rx(j.b), Ry(j.pro)));
  const W = add(E, qrot(fore, [0, -ARM.fore, 0]));
  const hand = qmul(fore, qmul(Rx(j.fl), Rz(j.dv)));
  return { trunk: T, pelvis, S, E, W, upper, fore, hand };
}
const REST_HAND = armChain(REST).hand;
// presa nella mano: il telefono rigido nel palmo, orientato in modo che nella posizione di partenza sia esattamente
// gripQuat(grip) (per la presa nel palmo: schermo = normale del palmo, cima girata ~30° verso il pollice, come la foto)
export const gripInHand = (grip = GRIP_STYLE) => qmul(qconj(REST_HAND), gripQuat(grip));

/* ---------- tracce articolari ---------- */
// Segmento quintico di Hermite: da x0 a x1 in T secondi con velocità v0 → v1 e accelerazione a0 → a1 (unità al secondo)
function quintic(x0, x1, v0, v1, a0, a1, T){
  return s => {
    const s2 = s*s, s3 = s2*s, s4 = s3*s, s5 = s4*s;
    return x0*(1 - 10*s3 + 15*s4 - 6*s5) + x1*(10*s3 - 15*s4 + 6*s5) + T*v0*(s - 6*s3 + 8*s4 - 3*s5) + T*v1*(-4*s3 + 7*s4 - 3*s5)
      + T*T*a0*(.5*s2 - 1.5*s3 + 1.5*s4 - .5*s5) + T*T*a1*(.5*s3 - s4 + .5*s5);
  };
}
const clamp01 = u => u < 0 ? 0 : u > 1 ? 1 : u;
export const mj = u => { u = clamp01(u); return u*u*u*(10 - 15*u + 6*u*u); };            // minimo jerk (picco 1,875/T)
// ritorno con un piccolo superamento (~2,6% dell'ampiezza) e assestamento: f(0)=0, f(1)=1, f'(0)=f'(1)=0
export const settle = u => { u = clamp01(u); return mj(u) + .45*Math.sin(Math.PI*u)**2*u*u; };
// Traccia di un'articolazione: nodi { t, x, v = 0, a = 0, ease } in ordine di tempo; tra due nodi un quintico (ease
// 'settle': ritorno con assestamento). Restituisce x(t), costante prima del primo nodo e dopo l'ultimo.
function makeTrack(knots){
  const segs = [];
  for (let i = 1; i < knots.length; i++){
    const a = knots[i - 1], b = knots[i], T = b.t - a.t;
    if (T < -1e-9) throw new Error(`nodi fuori ordine: ${a.t} > ${b.t}`);
    if (T <= 1e-9) continue;
    segs.push({ t0: a.t, t1: b.t, f: b.ease === 'settle' ? (u => a.x + (b.x - a.x)*settle(u)) : quintic(a.x, b.x, a.v || 0, b.v || 0, a.a || 0, b.a || 0, T) });
  }
  const first = knots[0].x, last = knots[knots.length - 1].x;
  return t => {
    if (!segs.length || t <= segs[0].t0) return first;
    for (const s of segs) if (t <= s.t1) return s.f((t - s.t0)/(s.t1 - s.t0));
    return last;
  };
}
// Parte veloce di un'articolazione B → C (accelera, velocità massima in C) → F (frena): velocità in C e durata della
// frenata. Velocità continua in C: con la stessa forma (V = 2: x = 2u³ − u⁴) la frenata dura acc·|ΔCF/ΔBC|, entro
// [dMin, dMax]; se l'articolazione si ferma in C (B → C e C → F in versi opposti) la velocità in C è nulla.
function fastPart(d1, d2, acc, dMin, dMax){
  if (Math.abs(d1) < 1e-6 || d1*d2 <= 0) return { vc: 0, d: Math.abs(d2) < 1e-6 ? 0 : dMax };
  let vc = 2*d1/acc, d = 2*d2/vc;
  if (d > dMax) d = dMax;
  else if (d < dMin){ vc = Math.sign(vc)*Math.min(Math.abs(vc), 2.5*Math.abs(d2)/dMin); d = dMin; }
  return { vc, d };
}

// Inversione della carica (B oltre R dalla parte opposta a C): l'articolazione arriva in B ancora in moto all'indietro
// (velocità crisp·0,3 della media della carica) e già accelerando verso il colpo, così la velocità attraversa lo zero
// con decisione (niente «fermo» tra carica e colpo, come il cappio del dritto vero). Limiti perché né la carica né la
// parte veloce tornino indietro.
function reversal(r, b, c, tp, acc, crisp){
  if (!crisp || (b - r)*(c - b) >= 0 || Math.abs(b - r) < 1e-6) return {};
  const v = crisp*.3*(b - r)/tp;
  const a = Math.sign(c - b)*Math.min(crisp*1.5*Math.abs(c - b)/(acc*acc), 6*Math.abs(b - r)/(tp*tp));
  return { v, a };
}

// Tempo con un tratto a velocità costante: la velocità sale (mezzo coseno) nella frazione r iniziale, resta costante e
// scende nella frazione r finale; picco = media/(1 − r) invece di 1,875 volte la media del minimo jerk
function plateau(r){
  const k = 1/(1 - r);
  return u => {
    u = clamp01(u);
    if (u < r) return k*(u/2 - r/(2*Math.PI)*Math.sin(Math.PI*u/r));
    if (u > 1 - r){ const w = 1 - u; return 1 - k*(w/2 - r/(2*Math.PI)*Math.sin(Math.PI*w/r)); }
    return k*(u - r/2);
  };
}
// Percorso della carica attraverso pose di passaggio (V: risolte offline lungo il percorso più breve dell'orientamento
// della mano, a frazioni uguali): spline di Catmull-Rom nel parametro u ∈ [0, 1], percorsa con il tempo a minimo jerk
// (velocità e accelerazione nulle agli estremi). Così il telefono gira lento anche quando il braccio sale di molto con il
// polso che compensa (schiacciata, servizio). Senza pose di passaggio è la retta R → B.
function pathOf(xs){
  const n = xs.length - 1;
  if (n === 1) return u => xs[0] + (xs[1] - xs[0])*u;
  const m = xs.map((_, i) => i === 0 ? xs[1] - xs[0] : i === n ? xs[n] - xs[n - 1] : (xs[i + 1] - xs[i - 1])/2);
  return u => {
    const x = Math.min(n - 1e-9, Math.max(0, u*n)), j = Math.floor(x), t = x - j, t2 = t*t, t3 = t2*t;
    return (2*t3 - 3*t2 + 1)*xs[j] + (t3 - 2*t2 + t)*m[j] + (-2*t3 + 3*t2)*xs[j + 1] + (t3 - t2)*m[j + 1];
  };
}

/* ---------- coreografie (angoli in gradi rispetto a REST; tempi in secondi a tempo reale) ---------- */
// Colpi: B fine della carica, C impatto (velocità massima delle articolazioni, in sequenza prossimo-distale: lag = quanto
// prima del contatto ogni articolazione arriva al suo picco), F fine dell'accompagnamento. contact e cycle: istante del
// picco (misurato sulla posa) e durata del ciclo; prep: durata della carica; acc: B → C per le articolazioni senza
// ritardo; dMin/dMax: durata della frenata; back: ritorno a REST con assestamento; crisp: accelerazione nell'inversione
// della carica (la velocità attraversa lo zero con decisione: niente «fermo» tra carica e colpo); aim: rotazione di tutto
// il corpo attorno alla verticale (mira degli esercizi: + verso sinistra).
// Servizio: P inizio del lancio, M metà del lancio (picco), Q fine del lancio, L braccio in alto (raccordo), poi la
// battuta come un colpo (C, F) con il picco 0,69 s dopo il picco del lancio, nel colmo della palla.
export const CHOREO = Object.freeze({
  forehand: Object.freeze({ tC: 1.053591, contact: 1.03, cycle: 2.25, prep: .78, acc: .133, crisp: 1, dMin: .1, dMax: .2, back: .72, lag: { tau: .045, lat: .045, y: .045, p: .022, e: .022, r: .01 },
    jt: { tau: { dMax: .3, acc: .133, lag: .033 }, lat: { dMax: .3, pre: .25 }, y: { dMax: .3, pre: .3 }, p: { dMax: .28, lag: .035, acc: .12 }, e: { dMax: .28, lag: 0 }, r: { lag: .046 }, b: { lag: .016 }, pro: { lag: -.018 } },
    B: { tau: -38.08, lat: 7, y: -.13, e: 50.68, p: -.12, r: 24.28, b: 82.41, pro: 7.77, fl: 42.07, dv: -16.27 },
    C: { tau: -1.38, lat: 5, y: -.1, e: 32.95, p: 30.46, r: 17.33, b: 59.07, pro: 26.3, fl: 42.32, dv: -16.93 },
    F: { tau: 27.08, lat: -3, y: 0, e: 72.13, p: 75.72, r: 46.48, b: 86.72, pro: 8.02, fl: .41, dv: -1.95 } }),
  backhand: Object.freeze({ tC: 1.076334, contact: 1.03, cycle: 2.25, prep: .74, acc: .12, crisp: 1, dMin: .1, dMax: .2, back: .72, lag: { tau: .045, lat: .045, y: .045, p: .022, e: .022, r: .01 },
    jt: { e: { lag: -.033, dMax: .2 }, b: { lag: -.052, dMax: .2 }, y: { lag: -.05, dMax: .22 }, lat: { lag: -.04, dMax: .22 }, fl: { lag: -.04, dMax: .22 }, tau: { acc: .104, lag: .055 }, p: { lag: .028 }, r: { lag: -.006 }, pro: { lag: .024 } },
    B: { tau: 30.11, lat: 4, y: -.08, e: 42.52, p: 127.51, r: 70.41, b: 20.26, pro: 20.8, fl: 52.2, dv: 14.78 },
    C: { tau: 5.17, lat: 2, y: -.05, e: 55.54, p: 109.31, r: 31.27, b: 13.58, pro: 25.79, fl: 52.15, dv: -13.56 },
    F: { tau: -16.01, lat: -2, y: 0, e: 70.2, p: 75.6, r: 16.9, b: 74.17, pro: 7.22, fl: 3.73, dv: -24.45 } }),
  flat: Object.freeze({ tC: 1.136297, contact: 1.1, cycle: 2.4, prep: .75, acc: .091, crisp: 1, dMin: .08, dMax: .18, back: .75, lag: { tau: .04, lat: .04, y: .04, p: .02, e: .02, r: .008 },
    jt: { tau: { dMax: .3, acc: .127, lag: .041 }, lat: { dMax: .3, pre: .25 }, y: { dMax: .3, pre: .3 }, p: { dMax: .28, lag: .038, acc: .101 }, e: { dMax: .28, lag: .021 }, r: { lag: .014 }, b: { lag: .041 }, pro: { lag: -.011 } },
    B: { tau: -47.28, lat: 7, y: -.13, e: 48.67, p: 2.41, r: 15.07, b: 78.29, pro: 9.08, fl: 39.22, dv: -14.06 },
    C: { tau: .48, lat: 5, y: -.1, e: 27.06, p: 23.19, r: 20.79, b: 63.6, pro: 29.57, fl: 43.78, dv: -15.62 },
    F: { tau: 29.81, lat: -3, y: 0, e: 72.23, p: 77.37, r: 47.98, b: 80.28, pro: 9.69, fl: 3.84, dv: 3 } }),
  slice: Object.freeze({ tC: 1.278388, contact: 1.24, cycle: 2.28, prep: .98, acc: .13, crisp: 1, lag: { tau: .045, lat: .045, y: .045, p: .022, e: .022, r: .01 }, dMin: .1, dMax: .2, back: .52,
    B: { tau: -28, lat: -4, e: 45, p: 55, r: 15, b: 95, pro: 24, fl: 5, dv: -10, y: -.02 },
    C: { tau: -6, lat: 0, e: 34, p: 68, r: 29, b: 82, pro: 20, fl: 10, dv: -10, y: -.05 },
    F: { tau: 9, lat: 2, e: 22, p: 81, r: 37, b: 70, pro: 14, fl: 12, dv: -10, y: -.04 } }),
  volley: Object.freeze({ tC: 0.731233, contact: .7, cycle: 1.9, prep: .3, acc: .098, crisp: 1, dMin: .08, dMax: .13, back: .45, lag: { tau: .03, lat: .03, y: .03, p: .015, e: .015, r: .008 },
    jt: { tau: { lag: .038 }, p: { lag: .042 }, e: { lag: 0 }, r: { lag: -.004 }, b: { lag: .033 }, pro: { lag: -.007 } },
    B: { tau: -13.79, lat: 2, e: 21.31, p: 32.98, r: 43.8, b: 86.88, y: -.04, pro: 17.25, fl: 37.19, dv: -10.15 },
    C: { tau: 2.78, lat: 1, e: 46.94, p: 79.43, r: 33.11, b: 54, y: -.04, pro: 3.89, fl: 54.07, dv: -29.72 },
    F: { tau: 13.92, lat: 0, e: 62.72, p: 109.12, r: 44.04, b: 24.7, y: -.03, pro: 5.8, fl: 57.98, dv: -8.69 } }),
  lob: Object.freeze({ tC: 1.335828, contact: 1.32, cycle: 2.62, prep: .95, acc: .155, crisp: 1, dMin: .12, dMax: .24, back: .85, lag: { tau: .03, lat: .03, y: .03, p: .015, e: .015, r: .01 },
    jt: { b: { pre: .2 }, fl: { pre: .2 }, pro: { pre: .2 }, e: { dur: .45 }, tau: { dur: .6 }, lat: { pre: .15 }, y: { pre: .15 } },
    B: { tau: -12.57, lat: 5, y: -.08, e: 4.52, p: 89.6, r: 28.1, b: 44.86, pro: 13.02, fl: 45.68, dv: -8.86 },
    C: { tau: -5.24, lat: 3, y: -.05, e: 49.35, p: 90.5, r: 31.47, b: 40.2, pro: 12.86, fl: 39.98, dv: -10.39 },
    F: { tau: -.94, lat: 0, y: 0, e: 96.44, p: 90.85, r: 33.28, b: 38.49, pro: 13.81, fl: 31.5, dv: -9.25 } }),
  drop: Object.freeze({ tC: 1.048775, contact: 1.05, cycle: 2.2, prep: .72, acc: .11, crisp: 1, lag: { tau: .03, lat: .03, y: .03, p: .015, e: .015, r: .01 }, dMin: .1, dMax: .14, back: .55,
    jt: { b: { dur: .5 }, pro: { dur: .45 }, fl: { dur: .45 } },
    B: { tau: -10, e: 30, p: 85, r: 40, b: 100, pro: 30, fl: 25, dv: -12, lat: 2, y: -.03 },
    C: { tau: -6, e: 30, p: 88, r: 40, b: 86, pro: 20, fl: 22, dv: -12, lat: 1, y: -.04 },
    F: { tau: -2, e: 28, p: 90, r: 40, b: 76, pro: 13, fl: 18, dv: -12, lat: 0, y: -.04 } }),
  smash: Object.freeze({ tC: 1.452972, contact: 1.46, cycle: 2.79, prep: 1.15, acc: .123, crisp: 1, dMin: .1, dMax: .219, back: .807, ov: .15, flat: .3, lag: { tau: .03, lat: .03, y: .03, p: .015, e: .015, r: .01, b: 0 },
    jt: { e: { lag: -.009, dMax: .313, acc: .059 }, b: { lag: -.004, dMax: .291 }, fl: { dMax: .296 }, pro: { lag: .049 }, tau: { dMax: .3 } },
    V: [
      { tau: -1.9, lat: 1, y: -.004, p: 86.4, e: 30.1, r: 38.3, b: 95.2, pro: 12.8, fl: 13.9, dv: -20 },
      { tau: -3.8, lat: 2, y: -.007, p: 88.3, e: 43.2, r: 31.6, b: 101.3, pro: 4.9, fl: .2, dv: -23 },
      { tau: -5.6, lat: 3, y: -.011, p: 91.6, e: 58.2, r: 26.2, b: 102.3, pro: 3, fl: -12.7, dv: -25 },
      { tau: -7.5, lat: 4, y: -.015, p: 96.2, e: 73.5, r: 22.8, b: 100.1, pro: 3, fl: -24.3, dv: -26 },
      { tau: -9.4, lat: 5, y: -.019, p: 99.3, e: 90.3, r: 21.9, b: 94.8, pro: 3, fl: -34.1, dv: -26 },
      { tau: -11.3, lat: 6, y: -.022, p: 102.6, e: 107.9, r: 23.3, b: 86.9, pro: 3, fl: -42.1, dv: -26 },
      { tau: -13.1, lat: 7, y: -.026, p: 106.7, e: 126.4, r: 27.8, b: 75.4, pro: 3.9, fl: -47.9, dv: -26 }],
    B: { tau: -15, lat: 8, e: 147, p: 112, r: 38, b: 68, pro: 3, fl: -50, dv: -26, y: -.03 },
    C: { tau: .95, lat: 4, e: 136.96, p: 112.85, r: 38.26, b: 32.83, pro: 11.68, fl: -40.12, dv: -20.77, y: -.01 },
    F: { tau: 28.04, lat: -6.95, e: 53.34, p: 108.31, r: 38.56, b: 11.82, pro: 21.44, fl: -22.94, dv: -6.57, y: -.053 } }),
  cross: Object.freeze({ tC: 1.070441, contact: 1.03, cycle: 2.25, prep: .78, acc: .12, crisp: 1, dMin: .1, dMax: .2, back: .72, lag: { tau: .045, lat: .045, y: .045, p: .022, e: .022, r: .01 },
    jt: { tau: { dMax: .3, acc: .141, lag: .051 }, lat: { dMax: .3, pre: .25 }, y: { dMax: .3, pre: .3 }, p: { dMax: .28, lag: -.028 }, e: { dMax: .28, lag: 0 }, r: { lag: .042 }, b: { lag: .039 }, pro: { lag: -.034 } },
    B: { tau: -12.68, lat: 7, y: -.13, e: 34.94, p: 15.42, r: 40.46, b: 79.27, pro: 6.29, fl: 37.63, dv: -15.44 },
    C: { tau: 23.87, lat: 5, y: -.1, e: 33.76, p: 35.84, r: 32.24, b: 71.82, pro: 28.01, fl: 36.82, dv: -15.87 },
    F: { tau: 44.67, lat: -3, y: 0, e: 78.53, p: 78.71, r: 55.53, b: 94.33, pro: 12.01, fl: 6.19, dv: -8.23 } }),
  serve: Object.freeze({ tC: 2.197474, kind: 'serve', hold: .25, prep: 1, flat: .3, tossMs: .42, tossHold: .02, gap: .69, linkFrom: .1, linkFlat: .17, acc: .12, ov: .25, dMin: .1, dMax: .22, back: .75, cycle: 3.6, lag: { tau: .03, lat: .03, y: .03, p: .015, e: .015, r: .01, b: 0 },
    jt: { e: { dMax: .4 }, b: { dMax: .4 }, fl: { dMax: .4 }, r: { dMax: .4 }, pro: { dMax: .4 }, dv: { dMax: .4 }, p: { dMax: .4 } },
    V: [
      { tau: -9, lat: 4.8, y: 0, p: 78.91, e: 62.81, r: 34.2, b: 115.91, pro: 12.1, fl: -4.38, dv: -18.3 },
      { tau: -10, lat: 5.5, y: 0, p: 86.05, e: 79.93, r: 22.5, b: 129.92, pro: 3.9, fl: -40.88, dv: -28 },
      { tau: -11, lat: 6.3, y: 0, p: 93.99, e: 116.48, r: 20.7, b: 90.52, pro: 3, fl: -41.85, dv: -28 }],
    P: { tau: -5, lat: 2, y: 0, p: 90, e: 15.32, r: 45.4, b: 70, pro: 20, fl: 27.4, dv: -12.3 },
    Q: { tau: -8, lat: 4, y: 0, p: 90, e: 76.42, r: 45.4, b: 70, pro: 20, fl: 27.4, dv: -12.3 },
    L: { tau: -14.26, lat: 22.22, y: 0, p: 105.13, e: 105.3, r: 39.48, b: 83.05, pro: 6.58, fl: -25.88, dv: -9.26 },
    C: { tau: 20.42, lat: 6.65, y: 0, p: 107.97, e: 141.18, r: 43.44, b: 7.43, pro: 12.39, fl: -25.76, dv: -16.35 },
    F: { tau: 18.16, lat: -22.12, y: 0, p: 91.32, e: 43.82, r: 19.75, b: 78.06, pro: 9.92, fl: 5.25, dv: -17.29 } }),
});






// Mira degli esercizi. Lungolinea: lo stesso dritto con il busto e la spalla girati attorno alla verticale per tutto il
// colpo (contatto più indietro; gradi di busto tau e rotazione interna r, riportati nel ritorno). Incrociato: coreografia
// propria in CHOREO (contatto più avanti, busto già aperto): con la calibrazione del braccio simulato il centro della
// mira è un dritto sintetico simmetrico attorno alla posa di riposo e l'incrociato deve girare il telefono di ~38° più del
// dritto della catena, troppo per girare solo il dritto (la carica era letta come una palla corta): docs/b13/gesti-nuovi.md.
export const AIM_TURN = Object.freeze({ line: Object.freeze({ tau: -10, r: -6 }) });
const choreoOf = id => CHOREO[id] || (GESTURES[id]?.aim ? CHOREO.forehand : null);
const aimOf = id => AIM_TURN[id] || null;

// tempi di presa e posizione di partenza (ferme)
export const STILL_TIMING = Object.freeze({ grip: 9, ready: 4 });

// fasi: id → testo breve da scrivere (brief §5.5)
export const PHASES = Object.freeze({
  fermo: '', pronto: 'Pronto', preparazione: 'Carica', accelerazione: 'Colpo', impatto: 'Impatto',
  accompagnamento: 'Accompagna', ritorno: 'Ritorno', lancio: 'Lancio', caricamento: 'Braccio in alto', battuta: 'Battuta',
});

// Camere per scheda (brief §5.3, riviste nel B13 per la catena e nel B14 per la lettura). Solo dati per il disegno: dir =
// direzione soggetto → camera nel campo (x a destra, y in alto, +z dietro chi gioca; il mancino la specchia, cameraFor),
// dist = distanza (m, prospettiva moderata), follow = la camera segue la mano (media pesata su ±window s, mix tra il centro
// dell'arco e la mano, size = altezza inquadrata in m a 448×280, di più negli stadi grandi; mixSmall = mix a 448×280, che
// sale a mix negli stadi da 640×400 in su), frame 'swing' = inquadratura solo sul colpo, views/seq = presa: due viste
// ferme e il giro della camera tra le due (s).
// B14 (lettura del dritto): la camera della televisione (dietro e dall'alto, 55°) schiacciava sullo schermo «avanti» e
// «in alto» (20° tra le due direzioni) e, seguendo la mano per 0,8, cancellava la salita: dall'impatto alla fine la mano,
// che sale di 0,5 m, scendeva di circa 7 px sullo schermo (640×400). Dritto e lungolinea ora da dietro a sinistra e più in basso (15–25°,
// stessa mano di chi imita): avanti è a sinistra, in alto è in alto (78°), la mano all'impatto va verso la rete sullo
// schermo (9°) e sale verso la fine (28% dell'altezza), il corpo si legge in piedi; la camera segue la mano per 0,5. Il
// piatto resta nella direzione di prima (le direzioni basse non tengono il telefono non di taglio nella carica) e segue
// per 0,5; incrociato dietro e basso; rovescio dietro a sinistra a 40° (segue per 0,7). Tutte nei vincoli del disegno del
// B9 (telefono non di taglio nelle pose chiave, ≥ 60 px a 448×280, avambraccio ≥ 28° dal raggio visivo: ricerca su
// griglia, docs/b14/camera-dritto.md; test/natpf-gesture-camera.test.mjs misura la lettura).
export const CAMERAS = Object.freeze({
  grip: Object.freeze({ views: Object.freeze([[-.36, .78, .5], [.85, .4, .35]]), dist: 1.0, seq: Object.freeze([3, 1.5, 3, 1.5]), read: 'pollice sul bordo destro, dita attorno al sinistro, cima in avanti e verso l\u2019interno' }),
  ready: Object.freeze({ dir: [-.5, .55, .67], dist: 2.4, frameBody: 'neck', read: 'telefono fermo davanti allo sterno, gomito al fianco' }),
  forehand: Object.freeze({ dir: [-.791, .259, .554], dist: 3.6, follow: Object.freeze({ window: .25, mix: .5, mixSmall: .65, size: .4 }), frame: 'swing', read: 'spalle che girano, mano che scende sotto la palla, colpo dal basso verso l\u2019alto attorno al corpo, fine davanti alla spalla sinistra' }),
  flat: Object.freeze({ dir: [-.148, .819, .554], dist: 3.6, follow: Object.freeze({ window: .25, mix: .5, mixSmall: .8, size: .4 }), frame: 'swing', read: 'come il dritto, più veloce e più piatto' }),
  backhand: Object.freeze({ dir: [-.383, .643, .663], dist: 3.6, follow: Object.freeze({ window: .25, mix: .7, mixSmall: .9, size: .4 }), frame: 'swing', read: 'spalle che girano a sinistra, braccio davanti al corpo, chiusura in alto a destra' }),
  slice: Object.freeze({ dir: [-.18, .62, .76], dist: 3.6, frameBody: 'neck', read: 'la mano parte alta e scende in avanti, piatto aperto' }),
  lob: Object.freeze({ dir: [-.24, .65, .72], dist: 3.6, follow: Object.freeze({ window: .25, mix: .85, size: .5 }), read: 'lancio da sotto: il braccio oscilla indietro e sale davanti' }),
  drop: Object.freeze({ dir: [-.62, .26, .74], dist: 3.4, frameBody: 'head', read: 'gesto corto e lento: il gomito si distende, la mano scende un poco in avanti e il piatto si apre' }),
  serve: Object.freeze({ dir: [.37, .65, .67], dist: 3.6, follow: Object.freeze({ window: .3, mix: .8, size: .5 }), read: 'lancio, braccio in alto sopra la testa, battuta al colmo della palla' }),
  smash: Object.freeze({ dir: [-.59, .65, .48], dist: 3.6, follow: Object.freeze({ window: .3, mix: .55, size: .5 }), read: 'braccio in alto sopra la testa, poi in avanti e giù deciso' }),
  volley: Object.freeze({ dir: [-.24, .34, .91], dist: 3.4, frameBody: 'neck', read: 'preparazione quasi nulla, gesto corto e deciso davanti al corpo' }),
  cross: Object.freeze({ dir: [-.258, .087, .962], dist: 3.6, follow: Object.freeze({ window: .25, mix: .5, mixSmall: .65, size: .4 }), frame: 'swing', read: 'contatto più avanti, busto già aperto: piatto girato verso il centro' }),
  line: Object.freeze({ dir: [-.821, .423, .383], dist: 3.6, follow: Object.freeze({ window: .25, mix: .5, mixSmall: .65, size: .4 }), frame: 'swing', read: 'contatto più indietro: piatto girato verso l\u2019esterno' }),
});
// camera della scheda per la mano: il mancino vede lo specchio (x → −x della direzione)
export function cameraFor(id, { hand = 'right' } = {}){
  const c = CAMERAS[id]; if (!c) return null;
  if (hand !== 'left') return c;
  const m = v => [-v[0], v[1], v[2]];
  return { ...c, ...(c.dir ? { dir: m(c.dir) } : {}), ...(c.views ? { views: c.views.map(m) } : {}) };
}

/* ---------- misure sul moto (velocità di rotazione del telefono = della mano) ---------- */
const H_SPEED = 1/2400;
const handSpeed = (ang, t) => len(omega(armChain(ang(t - H_SPEED/2)).hand, armChain(ang(t + H_SPEED/2)).hand, H_SPEED));
// massimo di f in [a, b]: griglia di passo step, poi sezione aurea attorno al migliore
function argmax(f, a, b, step = 1/600){
  let bt = a, bv = -Infinity;
  for (let t = a; t <= b + 1e-12; t += step){ const v = f(t); if (v > bv){ bv = v; bt = t; } }
  let lo = Math.max(a, bt - step), hi = Math.min(b, bt + step);
  const g = (Math.sqrt(5) - 1)/2;
  for (let i = 0; i < 40; i++){ const m1 = hi - g*(hi - lo), m2 = lo + g*(hi - lo); if (f(m1) >= f(m2)) hi = m2; else lo = m1; }
  const t = (lo + hi)/2; return { t, v: f(t) };
}
const argmin = (f, a, b, step) => { const r = argmax(t => -f(t), a, b, step); return { t: r.t, v: -r.v }; };
const integral = (f, a, b, step = 1/1200) => { let s = 0; for (let t = a; t < b - 1e-12; t += step){ const h = Math.min(step, b - t); s += f(t + h/2)*h; } return s; };

/* ---------- colpi ---------- */
function withAim(J, aim){ return aim ? { ...J, tau: J.tau + aim.tau, r: J.r + aim.r } : J; }
function strokeTracks(c, tC, aim){
  const R = REST, B = withAim({ ...R, ...c.B }, aim), C = withAim({ ...R, ...c.C }, aim), F = withAim({ ...R, ...c.F }, aim);
  const info = {};
  let tf = tC;
  for (const k of JOINTS){
    const o = c.jt?.[k] || {}, acc = o.acc ?? c.acc, lag = o.lag ?? c.lag?.[k] ?? 0, tc = tC - lag, t0 = tc - acc;
    const f = fastPart(C[k] - B[k], F[k] - C[k], acc, o.dMin ?? c.dMin, o.dMax ?? c.dMax);
    info[k] = { t0, tc, tf: tc + f.d, vc: f.vc, acc };
    tf = Math.max(tf, tc + f.d);
  }
  return { R, B, C, F, info, tf };
}
function buildStroke(id, c){
  const g = GESTURES[id], ms = g.stroke.ms/1000, aim = aimOf(id);
  // tC: istante nominale (articolazioni senza ritardo); si sposta finché il picco misurato cade in c.contact
  let tC = c.contact + .01, ang, T, X;
  const build = () => {
    X = strokeTracks(c, tC, aim);
    const hold = Math.min(...JOINTS.map(k => X.info[k].t0)) - c.prep;
    if (hold < .06) throw new Error(`${id}: fermo iniziale ${hold.toFixed(3)} s`);
    T = { hold, nominal: tC };
    const back0 = X.tf, tracks = {};
    for (const k of JOINTS){
      const i = X.info[k], r = X.R[k], b = X.B[k], cc = X.C[k], f = X.F[k], tp = i.t0 - hold;
      if (tp < .05) throw new Error(`${id}: carica di ${k} di ${tp.toFixed(3)} s`);
      // pre: l'articolazione arriva in B così prima della sua parte veloce e lì resta (ginocchia e busto che si
      // abbassano all'inizio della carica, non mentre il telefono gira)
      // dur: la carica di questa articolazione dura così (parte più tardi, come il braccio del pallonetto che oscilla
      // indietro e subito in avanti, a pendolo)
      const o = c.jt?.[k] || {}, pre = Math.min(o.pre || 0, tp - .1), dur = o.dur ? Math.min(o.dur, tp - pre) : tp - pre, from = i.t0 - pre - dur;
      if (c.V || c.ov != null){
        // a strati: carica R → (pose di passaggio) → B a minimo jerk lungo il percorso, che finisce ov dopo l'inizio
        // della parte veloce (le due si sommano: la velocità attraversa lo zero senza fermarsi), più la parte veloce
        // con le pose di passaggio la carica è una sola per tutte le articolazioni (stesso inizio e stessa fine: il
        // percorso resta quello risolto)
        const P = pathOf([r, ...(c.V || []).map(J => withAim({ ...REST, ...J }, aim)[k]), b]);
        const f0 = c.V ? hold : from, e1 = (c.V ? Math.max(...JOINTS.map(q => X.info[q].t0)) : i.t0 - pre) + (c.ov || 0);
        const fast = makeTrack([{ t: i.t0, x: 0 }, { t: i.tc, x: cc - b, v: i.vc }, { t: i.tf, x: f - b }]);
        const ease = c.flat ? plateau(c.flat) : mj;
        tracks[k] = { i, f: t => P(ease((t - f0)/(e1 - f0))) + fast(t) };
        continue;
      }
      const v = pre ? {} : reversal(r, b, cc, dur, i.acc, c.crisp || 0);
      tracks[k] = { i, knots: [{ t: 0, x: r }, { t: hold, x: r }, ...(from > hold + 1e-9 ? [{ t: from, x: r }] : []),
        ...(pre ? [{ t: i.t0 - pre, x: b }] : []), { t: i.t0, x: b, ...v }, { t: i.tc, x: cc, v: i.vc }, { t: i.tf, x: f }, { t: back0, x: f }] };
      tracks[k].f = makeTrack(tracks[k].knots);
    }
    T.tf = back0;
    return tracks;
  };
  // tC risolto una volta e scritto nella coreografia (test/natpf-gesture-physics «tempi risolti» lo ricalcola e lo
  // confronta): niente ricerca alla prima riproduzione della scheda (revisione B13: fino a 0,4 s sulla CPU rallentata).
  // Senza tC (strumenti di taratura) o con la coreografia girata per la mira si cerca come prima.
  const fixed = c.tC != null && !aim;
  if (fixed) tC = c.tC;
  let tracks;
  for (let it = 0; it < (fixed ? 1 : 4); it++){
    tracks = build();
    ang = t => { const o = {}; for (const k of JOINTS) o[k] = tracks[k].f(t); return o; };
    if (fixed) break;
    const pk = argmax(t => handSpeed(ang, t), T.hold + .1, T.tf);
    if (Math.abs(pk.t - c.contact) < 2e-5) break;
    tC += c.contact - pk.t;
  }
  const speed = t => handSpeed(ang, t), pk = fixed ? argmax(speed, c.contact - .004, c.contact + .004, 1/4800) : argmax(speed, T.hold + .1, T.tf);
  T.contact = pk.t; T.swing = T.contact - ms/2; T.end = T.contact + ms/2;
  // fine dell'accompagnamento: quando tutte le articolazioni sono ferme, almeno 0,10 s dopo la fine della parte veloce
  T.back = Math.max(T.end + .1, T.tf);
  T.home = T.back + c.back; T.total = c.cycle;
  if (T.total - T.home < .08) throw new Error(`${id}: riposo finale ${(T.total - T.home).toFixed(3)} s`);
  // ritorno a REST con assestamento
  const tr = {};
  for (const k of JOINTS){
    const f = tracks[k].f, Fk = f(T.back), back = T.home - T.back;
    tr[k] = t => t <= T.back ? f(t) : t >= T.home ? REST[k] : Fk + (REST[k] - Fk)*settle((t - T.back)/back);
  }
  const ang2 = t => { const o = {}; for (const k of JOINTS) o[k] = tr[k](t); return o; };
  const sp = t => handSpeed(ang2, t);
  // fine della carica: il punto più lento tra il picco della carica e il colpo
  const prepPk = argmax(sp, T.hold, Math.max(T.hold + .05, T.contact - .2), 1/300);
  T.inv = argmin(sp, prepPk.t, T.contact - .02, 1/600).t; T.load = T.inv;
  const W = IMPACT_WINDOW;
  const phases = [
    ['pronto', 0, T.hold], ['preparazione', T.hold, T.inv], ['accelerazione', T.inv, T.contact - W], ['impatto', T.contact - W, T.contact + W],
    ['accompagnamento', T.contact + W, T.back], ['ritorno', T.back, T.home], ['pronto', T.home, T.total],
  ];
  // «Fine» un attimo prima del ritorno (nella fase dell'accompagnamento: prima il fotogramma «Fine» diceva RITORNO)
  const keys = [{ id: 'carica', t: T.inv, label: 'Carica' }, { id: 'impatto', t: T.contact, label: 'Impatto' }, { id: 'fine', t: T.back - .004, label: 'Fine' }];
  return lazy({ id, kind: 'stroke', T, ang: ang2, phases, keys, contact: T.contact, total: T.total, peak: sp(T.contact),
    ball: g.ball || 'ground', ballHigh: !!g.ballHigh, expect: g.expect, aim: g.aim || 0 }, {
    travel: () => integral(sp, T.swing, T.end), prepAmp: () => integral(sp, T.hold, T.inv),
    caps: () => ({ prep: argmax(sp, T.hold, T.inv - .005, 1/600).v, ret: argmax(sp, T.back, T.total, 1/600).v }) });
}
// misure che servono solo alle verifiche (ampiezza, massimi di carica e ritorno): calcolate alla prima lettura
function lazy(o, getters){
  for (const [k, f] of Object.entries(getters)){ let v; Object.defineProperty(o, k, { enumerable: true, configurable: true, get(){ return v ??= f(); } }); }
  return o;
}

/* ---------- servizio continuo ---------- */
// A strati, per articolazione: carica R → P (lenta), lancio P → Q (flessione della spalla: velocità a campana con il
// picco a metà, dove la palla si stacca), raccordo Q → L (la mano sale sopra la testa con il polso e il gomito che
// compensano, pose di passaggio V, comincia già nel lancio), battuta L → C → F come un colpo, con il picco 0,69 s dopo
// il picco del lancio (colmo della palla), poi il ritorno.
const cyclo = u => { u = clamp01(u); return u - Math.sin(2*Math.PI*u)/(2*Math.PI); };   // velocità 1 − cos 2πu (picco 2× la media a metà)
function buildServe(c){
  const g = GESTURES.serve, hMs = g.stroke.ms/1000, R = REST;
  const P = { ...R, ...c.P }, Q = { ...R, ...c.Q }, L = { ...R, ...c.L }, C = { ...R, ...c.C }, F = { ...R, ...c.F };
  const T = { hold: c.hold }; T.load = T.hold + c.prep; T.tossEnd = T.load + c.tossMs; T.linkStart = T.tossEnd + c.tossHold;
  const ePrep = c.flat ? plateau(c.flat) : mj, eLink = c.linkFlat ? plateau(c.linkFlat) : mj;
  const prepTossLink = (k, t, linkFrom, linkTo) => {
    const link = pathOf([Q[k], ...(c.V || []).map(J => ({ ...REST, ...J })[k]), L[k]]);
    return R[k] + (P[k] - R[k])*ePrep((t - T.hold)/c.prep) + (Q[k] - P[k])*cyclo((t - T.load)/c.tossMs) + link(eLink((t - linkFrom)/(linkTo - linkFrom))) - Q[k];
  };
  // picco del lancio e battuta 0,69 s dopo: il raccordo (che comincia nel lancio) dipende dall'inizio della battuta, quindi
  // si ripete finché picco del lancio e picco della battuta stanno fermi
  const tm0 = T.load + c.tossMs/2;
  let linkTo = T.tossEnd + .4, ang, info, tf, contact, tC = null;
  const build = () => {
    info = {}; tf = tC;
    for (const k of JOINTS){
      const o = c.jt?.[k] || {}, acc = o.acc ?? c.acc, tc = tC - (o.lag ?? c.lag?.[k] ?? 0), f = fastPart(C[k] - L[k], F[k] - C[k], acc, o.dMin ?? c.dMin, o.dMax ?? c.dMax);
      info[k] = { t0: tc - acc, tc, tf: tc + f.d, vc: f.vc, fast: makeTrack([{ t: tc - acc, x: 0 }, { t: tc, x: C[k] - L[k], v: f.vc }, { t: tc + f.d, x: F[k] - L[k] }]) };
      tf = Math.max(tf, tc + f.d);
    }
    linkTo = Math.max(...JOINTS.map(k => info[k].t0)) + (c.ov || 0);
    ang = t => { const o = {}; for (const k of JOINTS) o[k] = prepTossLink(k, t, tm0 + (c.linkFrom ?? 0), linkTo) + info[k].fast(t); return o; };
  };
  if (c.tC != null){
    // tC risolto una volta e scritto nella coreografia (come i colpi): una sola costruzione
    tC = c.tC; build();
    T.tossPeak = argmax(t => handSpeed(ang, t), T.load + .05, T.tossEnd - .05).t; contact = T.tossPeak + c.gap;
  } else for (let outer = 0; outer < 6; outer++){
    const angT = tC == null ? (t => { const o = {}; for (const k of JOINTS) o[k] = prepTossLink(k, t, tm0 + (c.linkFrom ?? 0), linkTo); return o; }) : ang;
    T.tossPeak = argmax(t => handSpeed(angT, t), T.load + .05, T.tossEnd - .05).t;
    contact = T.tossPeak + c.gap; if (tC == null) tC = contact;
    for (let it = 0; it < 6; it++){
      build();
      const pk = argmax(t => handSpeed(ang, t), contact - .1, contact + .1);
      if (Math.abs(pk.t - contact) < 1e-5) break;
      tC += contact - pk.t;
    }
    if (Math.abs(argmax(t => handSpeed(ang, t), T.load + .05, T.tossEnd - .05).t - T.tossPeak) < 2e-5) break;
  }
  T.nominal = tC;
  T.linkEnd = linkTo;
  T.contact = contact; T.hitStart = contact - hMs/2; T.end = contact + hMs/2; T.inv = T.hitStart; T.swing = T.hitStart;
  T.back = Math.max(T.end + .1, tf); T.home = T.back + c.back; T.total = c.cycle;
  if (T.total - T.home < .08) throw new Error(`servizio: riposo finale ${(T.total - T.home).toFixed(3)} s`);
  const pre = ang, Fv = pre(T.back);
  const ang2 = t => { if (t <= T.back) return pre(t); const o = {}; for (const k of JOINTS) o[k] = t >= T.home ? R[k] : Fv[k] + (R[k] - Fv[k])*settle((t - T.back)/c.back); return o; };
  const sp = t => handSpeed(ang2, t), W = IMPACT_WINDOW;
  const phases = [
    ['pronto', 0, T.hold], ['preparazione', T.hold, T.load], ['lancio', T.load, T.linkStart], ['caricamento', T.linkStart, T.hitStart],
    ['battuta', T.hitStart, T.contact - W], ['impatto', T.contact - W, T.contact + W], ['accompagnamento', T.contact + W, T.back],
    ['ritorno', T.back, T.home], ['pronto', T.home, T.total],
  ];
  const keys = [{ id: 'lancio', t: T.tossEnd, label: 'Lancio' }, { id: 'caricamento', t: T.hitStart, label: 'Braccio in alto' }, { id: 'impatto', t: T.contact, label: 'Impatto' }];
  return lazy({ id: 'serve', kind: 'serve', T, ang: ang2, phases, keys, contact: T.contact, tossPeak: T.tossPeak, total: T.total, peak: sp(T.contact),
    tossPeakSpeed: sp(T.tossPeak), ball: 'toss', ballHigh: true, expect: g.expect }, {
    travel: () => integral(sp, T.hitStart, T.end), caps: () => ({ prep: argmax(sp, T.hold, T.load, 1/600).v, link: argmax(sp, T.tossEnd, T.hitStart, 1/600).v }) });
}

/* ---------- presa e posizione di partenza: ferme ---------- */
function buildStill(id){
  const total = STILL_TIMING[id];
  // presa: la camera gira (dagli occhi di chi gioca → di lato → ritorno), non la mano (specifica §2.1)
  const keys = id === 'grip' ? [{ id: 'davanti', t: 1.5, label: 'Come la vedi tu' }, { id: 'lato', t: 6, label: 'Di lato' }] : [];
  return { id, kind: 'still', T: { total }, ang: () => REST, phases: [['fermo', 0, total]], keys, contact: null, total, peak: 0, still: true,
    ball: null, ballHigh: false, expect: { messages: 0 } };
}

// respiro: 3 mm su e giù del bacino nei fermi (periodo 2 s nelle pose ferme), nullo ai bordi (il ciclo si chiude)
function breathOf(m, t){
  if (m.still) return Math.sin(Math.PI*t)**2*.003;
  const T = m.T;
  if (t < T.hold) return Math.sin(Math.PI*t/T.hold)**2*.003;
  if (t > T.home) return Math.sin(Math.PI*(t - T.home)/(T.total - T.home))**2*.003;
  return 0;
}

// Moto di un gesto da una coreografia (non dipende dalla presa: la presa cambia solo come il telefono sta nella mano).
// Esportato per gli strumenti di taratura; il gioco usa gesturePlan con CHOREO.
export function motionFrom(id, choreo = id === 'serve' ? CHOREO.serve : choreoOf(id)){
  const g = GESTURES[id];
  if (!g) throw new Error(`gesto sconosciuto: ${id}`);
  const m = g.still ? buildStill(id) : g.toss ? buildServe(choreo) : buildStroke(id, choreo);
  m.phases = m.phases.map(([pid, from, to]) => Object.freeze({ id: pid, label: PHASES[pid], from, to }));
  return m;
}
// piano di un moto per una presa: raw(t) → posa del destro { pos, q, trunk, chain }
export function planFrom(m, grip = GRIP_STYLE){
  const G = gripInHand(grip), HL = handLocalFor(grip);
  const raw = t => {
    const j = m.ang(t), ch = armChain(j, breathOf(m, t)), q = qmul(ch.hand, G);
    return { pos: sub(ch.W, qrot(q, HL.wrist)), q, trunk: j.tau*D, chain: { ...ch, j } };
  };
  // il moto resta il prototipo (le misure pigre non si calcolano copiandolo)
  return Object.assign(Object.create(m), { raw, grip, Q0: gripQuat(grip), G, handLocal: HL });
}
const motions = new Map(), plans = new Map();
function gestureMotion(id){
  if (!motions.has(id)) motions.set(id, motionFrom(id));
  return motions.get(id);
}
// piano di un gesto (cache per gesto e presa). Le fasi sono [{ id, label, from, to }] in ordine.
export function gesturePlan(id, { grip = GRIP_STYLE } = {}){
  const key = id + '|' + gripKey(grip);
  if (plans.has(key)) return plans.get(key);
  const p = planFrom(gestureMotion(id), grip);
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
// specchio della catena (punti x → −x, orientamenti come i quaternioni del telefono; gli angoli restano quelli)
const MIRROR_PTS = ['pelvis', 'S', 'E', 'W'], MIRROR_QS = ['trunk', 'upper', 'fore', 'hand'];
export function mirrorChain(ch){
  const o = { ...ch };
  for (const k of MIRROR_PTS) if (ch[k]) o[k] = mirrorPos(ch[k]);
  for (const k of MIRROR_QS) if (ch[k]) o[k] = mirrorQ(ch[k]);
  return o;
}
// posa del destro → posa della mano scelta (il mancino è lo specchio, anche della catena)
export const mirrorPose = p => ({ ...p, pos: mirrorPos(p.pos), q: mirrorQ(p.q), trunk: -p.trunk, ...(p.chain ? { chain: mirrorChain(p.chain) } : {}) });
function rawPose(P, t, hand){
  const p = P.raw(wrapT(P, t));
  return hand === 'left' ? mirrorPose(p) : p;
}
// Posa del telefono al tempo t (s, tempo reale; il ciclo si ripete): pos (centro del telefono, m, campo), q (telefono →
// campo), phase/label (fase e testo), u (avanzamento nella fase), speed (|ω| °/s), contact e cycle (s), trunk (rad,
// rotazione del busto), chain (catena: bacino, spalla, gomito, polso, orientamenti dei segmenti e angoli j, nella mano
// scelta). rig: true aggiunge lo scheletro per il disegno (gestureRig).
export function gesturePose(id, t, { hand = 'right', grip = GRIP_STYLE, rig = false } = {}){
  const P = gesturePlan(id, { grip }), h = 1/480;
  const p = rawPose(P, t, hand), ph = phaseAt(id, t, { grip });
  const speed = P.still ? 0 : len(omega(rawPose(P, t - h/2, hand).q, rawPose(P, t + h/2, hand).q, h));
  const out = { id, t: wrapT(P, t), pos: p.pos, q: p.q, trunk: p.trunk, chain: p.chain, phase: ph.id, label: ph.label, u: ph.u, speed, contact: P.contact, cycle: P.total, hand };
  if (rig) out.rig = gestureRig(out, { hand, grip });
  return out;
}
// angoli articolari al tempo t (gradi; y in m): quelli della catena disegnata (uguali per destro e mancino)
export const gestureJoints = (id, t, o = {}) => gesturePlan(id, o).ang(wrapT(gesturePlan(id, o), t));
// velocità di rotazione del telefono (°/s) al tempo t e curva di un ciclo (per la banda «Picco = impatto» e la scia)
export const gestureSpeed = (id, t, o = {}) => gesturePose(id, t, o).speed;
export function speedCurve(id, { hand = 'right', grip = GRIP_STYLE, step = 1/120 } = {}){
  const P = gesturePlan(id, { grip }), n = Math.round(P.total/step), t = new Float32Array(n + 1), w = new Float32Array(n + 1);
  let max = 0, at = 0;
  for (let i = 0; i <= n; i++){ t[i] = i*step; w[i] = gestureSpeed(id, t[i], { hand, grip }); if (w[i] > max){ max = w[i]; at = t[i]; } }
  return { t, w, max, at, contact: P.contact, total: P.total };
}

/* ---------- scheletro per il disegno ---------- */
// Scheletro nel campo per una posa del telefono { pos, q, chain } (della mano `hand`): busto (bacino, spalle, collo,
// testa, vita), spalla S, gomito E, polso W (m), versori dell'avambraccio F (polso → gomito) e del braccio U (gomito →
// spalla), flessione del gomito (gradi), dita e pollice (rigidi con il telefono), punti del telefono. Con la catena
// (ogni posa di gesturePose) gomito e spalla sono quelli VERI: |S − E| = ARM.upper e |E − W| = ARM.fore sempre, e il
// polso è il punto della mano nel riferimento del telefono. Una posa senza catena (solo { pos, q }) usa la direzione
// dell'avambraccio della posizione di partenza (HAND.forearmDir) e la spalla a riposo: è solo un ripiego.
export function gestureRig(pose, { hand = pose.hand || 'right', grip = GRIP_STYLE } = {}){
  const left = hand === 'left', pr = left ? mirrorPose({ trunk: 0, ...pose }) : pose, HL = handLocalFor(grip);
  const T = v => add(pr.pos, qrot(pr.q, v));
  const W = T(HL.wrist), ch = pr.chain;
  let E, S, body = null;
  if (ch){
    E = ch.E; S = ch.S;
    const Tq = ch.trunk, at = v => add(ch.pelvis, qrot(Tq, v));
    body = { pelvis: ch.pelvis, shoulderR: S, shoulderL: at([-BODY.shoulder[0], BODY.shoulder[1], 0]), neck: at(BODY.neck), head: at(BODY.head), headR: BODY.headR,
      waistR: at([BODY.waist, BODY.hip, 0]), waistL: at([-BODY.waist, BODY.hip, 0]), trunk: Tq, joints: ch.j };
  } else {
    E = add(W, mul(qrot(pr.q, HL.forearmDir), ARM.fore)); S = add(E, mul(norm(sub(SHOULDER, E)), ARM.upper));
  }
  const F = norm(sub(E, W)), U = norm(sub(S, E));
  const elbow = Math.acos(Math.max(-1, Math.min(1, dot(U, F))))/D;          // flessione del gomito (0 = braccio disteso)
  const hh = PHONE.h/2;
  const rig = {
    shoulder: S, elbow: E, wrist: W, forearm: F, upperArm: U, elbowDeg: elbow, shoulderShift: len(sub(S, SHOULDER)), body,
    heel: HL.heel.map(h => ({ p: T(h.p), r: h.r })),
    fingers: HL.fingers.map(f => ({ name: f.name, pts: f.pts.map(T), r: f.r })),
    thumb: { pts: HL.thumb.pts.map(T), r: HL.thumb.r },
    phone: { center: pr.pos, tip: T([0, hh, 0]), base: T([0, -hh, 0]), screen: qrot(pr.q, [0, 0, 1]), right: qrot(pr.q, [1, 0, 0]) },
  };
  if (!left) return rig;
  const M = mirrorPos, mv = v => [-v[0], v[1], v[2]];
  return { ...rig, shoulder: M(rig.shoulder), elbow: M(rig.elbow), wrist: M(rig.wrist), forearm: mv(rig.forearm), upperArm: mv(rig.upperArm),
    body: body && { ...body, pelvis: M(body.pelvis), shoulderR: M(body.shoulderR), shoulderL: M(body.shoulderL), neck: M(body.neck), head: M(body.head), waistR: M(body.waistR), waistL: M(body.waistL), trunk: mirrorQ(body.trunk) },
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
  // dopo il contatto la palla riparte a metà della velocità vera: resta nel quadro per qualche fotogramma (solo disegno)
  const v = (V[P.id] || [-1.2, 2.4, -14]).map(x => x*BALL_OUT);
  return [C[0] + v[0]*dt, C[1] + v[1]*dt - .5*G*dt*dt, C[2] + v[2]*dt];
}
// palla del servizio (destro): appoggiata sul vetro del telefono (verso la cima, a un raggio dal vetro lungo la normale
// dello schermo: tocca il telefono senza entrarci) dall'inizio del ciclo fino al picco del lancio, quando il telefono è
// più veloce e comincia a frenare: lì la palla si stacca con la velocità che ha (≈ quella del punto d'appoggio) e sale
// fino al colmo nell'istante della battuta, dove la incontra la cima del telefono. La modale scala l'altezza (gravità
// ridotta), mai il tempo (specifica §2.5).
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
  return [apex[0] - .3*BALL_OUT*dt, apex[1] - 1.0*BALL_OUT*dt - .5*G*dt*dt, apex[2] - 16*BALL_OUT*dt];
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
