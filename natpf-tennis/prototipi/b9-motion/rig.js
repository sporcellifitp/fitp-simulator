// Prototipo B9 «motion» — SCHELETRO del braccio e della mano (puro, senza DOM).
//
// La mano è rigida con il telefono (presa nel palmo) e **anche l'avambraccio**: la specifica (specifica-gesti.md §1.5,
// §2.3) chiede il polso fermo, «il telefono gira con il braccio». Con la presa verificata q0 (schermo 40° verso l'alto e
// verso il viso) un gomito risolto da una spalla fissa darebbe un polso piegato di 80–120° (il «polso spezzato»
// dell'analisi A): qui l'angolo polso–avambraccio è quello naturale della presa e resta fisso; il braccio superiore è
// solo accennato (manica) e sfuma fuori quadro verso la spalla.
//
// Riferimento del telefono (mm): y cima, +z normale dello schermo, +x bordo destro guardando lo schermo.
import { add, sub, mul, cross, norm, qrot, rotateAbout, D, PHONE } from './motion.js';

export const ARM = Object.freeze({ upper: .29, fore: .262 });
const mm = v => v.map(x => x/1000);

// Mano destra nella presa nel palmo (foto docs/riferimenti/presa-palmo-utente-2026-11-04.webp, grip-art palmFront):
// il dorso del telefono appoggia sul palmo, il bordo inferiore sull'eminenza, le quattro dita avvolgono il bordo lungo
// sinistro nella metà bassa con i polpastrelli sul bordo (non sullo schermo), il pollice disteso lungo il bordo destro.
export const HAND = {
  wrist: [36, -104, -24],            // centro del polso
  wristR: [27, 19],                  // semiassi del polso (mm): largo e piatto
  heel: [[30, -84, -21, 20], [2, -88, -22, 18], [14, -60, -24, 22]],   // eminenza tenar, ipotenar, centro del palmo
  // dita: nocca (MCP), direzione di base nel piano del palmo, lunghezze delle falangi, flessioni (gradi) e raggi
  // nocche sotto il telefono, falange prossimale fino al bordo (l'interfalangea prossimale appena fuori dal bordo), falange
  // media che sale lungo lo spessore, distale appoggiata sul bordo dello schermo: le dita avvolgono il bordo da vicino
  fingers: [
    { name: 'index',  mcp: [-9, -8, -18], dir: [-1, .30, 0], L: [40, 23, 18], flex: [10, 82, 84], r: [9.6, 8.6, 7.8, 7.0] },
    { name: 'middle', mcp: [-4, -27, -19], dir: [-1, .10, 0], L: [44, 25, 19], flex: [10, 84, 84], r: [10, 9.0, 8.1, 7.2] },
    { name: 'ring',   mcp: [-6, -46, -18], dir: [-1, -.08, 0], L: [41, 24, 18], flex: [10, 84, 82], r: [9.4, 8.4, 7.6, 6.9] },
    { name: 'pinky',  mcp: [-13, -63, -16], dir: [-1, -.26, 0], L: [33, 19, 16], flex: [10, 84, 78], r: [8.4, 7.4, 6.8, 6.2] },
  ],
  palmN: [0, 0, 1],                  // il palmo guarda il telefono (+z)
  // pollice: base (trapezio-metacarpo), MCP, IP, punta; disteso lungo il bordo destro, a metà altezza, senza toccare lo schermo
  thumb: { pts: [[30, -84, -18], [46, -52, -8], [49, -22, -1], [47, 4, 3]], r: [15, 11.4, 10.2, 9.0] },
  // direzione polso → gomito nel riferimento del telefono. Con q0 nel campo è (0,70; −0,12; 0,70): l'avambraccio torna
  // verso il corpo in diagonale, quasi orizzontale; polso piegato di ~32° rispetto all'asse della mano (flesso e deviato
  // verso il mignolo, come nella foto). Più «verso destra» sarebbe il braccio «a cameriere», più «verso il corpo» un
  // polso spezzato.
  forearmDir: [.27, -.85, .46],
};
// avambraccio: profilo (frazione della lunghezza dal polso, raggio mm): polso stretto, ventre muscolare, gomito
export const FOREARM_PROFILE = Object.freeze([[0, 25], [.18, 28], [.45, 36], [.75, 38], [1, 34]]);
export const BAND = Object.freeze({ from: .03, to: .17 });    // polsino di spugna (frazione dell'avambraccio)
export const CUFF = .56;                                      // dove comincia la manica lunga (frazione dell'avambraccio)

// forward kinematics di un dito: catena piana (flessione verso il palmo)
function fingerChain(f){
  const d0 = norm(f.dir), n = HAND.palmN, k = norm(cross(d0, n));
  const pts = [f.mcp.slice()]; let ang = 0, p = f.mcp.slice();
  for (let i = 0; i < 3; i++){
    ang += f.flex[i]*D;
    const d = rotateAbout(d0, k, ang);
    p = add(p, mul(d, f.L[i])); pts.push(p);
  }
  return pts;
}
// punti della mano nel riferimento del telefono (m), calcolati una volta
export const HAND_LOCAL = (() => {
  const fingers = HAND.fingers.map(f => ({ name: f.name, pts: fingerChain(f).map(mm), r: f.r.map(x => x/1000) }));
  return {
    wrist: mm(HAND.wrist), wristR: HAND.wristR.map(x => x/1000),
    heel: HAND.heel.map(h => ({ p: mm(h.slice(0, 3)), r: h[3]/1000 })),
    fingers,
    thumb: { pts: HAND.thumb.pts.map(mm), r: HAND.thumb.r.map(x => x/1000) },
    forearmDir: norm(HAND.forearmDir),
  };
})();

// Scheletro nel campo per una posa del telefono { pos, q } e una spalla: polso e gomito solidali con la mano, braccio
// superiore dal gomito verso la spalla (solo direzione: è disegnato sfumato).
export function rigPose(pose, shoulder){
  const T = v => add(pose.pos, qrot(pose.q, v));
  const W = T(HAND_LOCAL.wrist), F = qrot(pose.q, HAND_LOCAL.forearmDir);
  const E = add(W, mul(F, ARM.fore)), U = norm(sub(shoulder, E)), S = add(E, mul(U, ARM.upper));
  return {
    W, E, S, F, U, T,
    heel: HAND_LOCAL.heel.map(h => ({ p: T(h.p), r: h.r, local: h.p })),
    fingers: HAND_LOCAL.fingers.map(f => ({ name: f.name, pts: f.pts.map(T), r: f.r, local: f.pts })),
    thumb: { pts: HAND_LOCAL.thumb.pts.map(T), r: HAND_LOCAL.thumb.r, local: HAND_LOCAL.thumb.pts },
  };
}

// punti del telefono nel campo
export function phonePoints(pose){
  const T = v => add(pose.pos, qrot(pose.q, v)), h = PHONE.h/2;
  return { center: pose.pos, tip: T([0, h, 0]), base: T([0, -h, 0]), screen: qrot(pose.q, [0, 0, 1]), T };
}
