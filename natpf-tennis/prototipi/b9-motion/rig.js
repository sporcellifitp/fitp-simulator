// Prototipo B9 «motion» — SCHELETRO del braccio e della mano (puro, senza DOM).
// La mano è rigida con il telefono (presa nel palmo: il polso è «fermo», specifica §1.5): le sue articolazioni sono
// scritte nel riferimento del telefono (mm; y cima, +z schermo, +x bordo destro). Il gomito NON è fisso: per ogni posa
// si sceglie, sul cerchio dei gomiti possibili tra spalla e polso, quello che lascia il polso più naturale (avambraccio
// più vicino alla sua direzione di riposo nella mano) con una leggera preferenza per il gomito in basso: niente polsi
// «spezzati» né braccia staccate (difetti 1–2 dell'analisi A).
import { add, sub, mul, dot, cross, len, norm, lerp, qrot, rotateAbout, D, PHONE } from './motion.js';

export const ARM = Object.freeze({ upper: .29, fore: .262 });
const mm = v => v.map(x => x/1000);

// Mano destra nella presa nel palmo (foto docs/riferimenti/presa-palmo-utente-2026-11-04.webp, grip-art palmFront):
// il dorso del telefono appoggia sul palmo, il bordo inferiore sull'eminenza, le quattro dita avvolgono il bordo lungo
// sinistro nella metà bassa con i polpastrelli sul bordo (non sullo schermo), il pollice disteso lungo il bordo destro.
export const HAND = {
  wrist: [40, -100, -22],            // centro del polso
  wristR: 23,                        // raggio del polso (mm)
  heel: [[30, -86, -18, 19], [6, -92, -20, 18]],   // eminenza tenar e ipotenar (x, y, z, r)
  // dita: nocca (MCP), direzione di base nel piano del palmo, lunghezze delle falangi, flessioni (gradi) e raggi
  fingers: [
    { name: 'index',  mcp: [-16, -10, -18], dir: [-1, .30, 0], L: [40, 24, 19], flex: [10, 82, 52], r: [9.2, 8.4, 7.6, 7.0] },
    { name: 'middle', mcp: [-23, -28, -18], dir: [-1, .10, 0], L: [44, 27, 19], flex: [16, 82, 56], r: [9.6, 8.8, 7.9, 7.2] },
    { name: 'ring',   mcp: [-24, -46, -17], dir: [-1, -.08, 0], L: [41, 25, 18], flex: [14, 84, 54], r: [9.0, 8.2, 7.5, 6.9] },
    { name: 'pinky',  mcp: [-21, -62, -15], dir: [-1, -.26, 0], L: [33, 19, 16], flex: [12, 84, 52], r: [8.0, 7.3, 6.7, 6.2] },
  ],
  palmN: [0, 0, 1],                  // il palmo guarda il telefono (+z)
  // pollice: base (trapezio-metacarpo), MCP, IP, punta; disteso lungo il bordo destro, a metà altezza, senza toccare lo schermo
  thumb: { pts: [[26, -80, -19], [44, -52, -9], [48, -22, -1], [46.5, 3, 3]], r: [14, 11.2, 10.2, 9.0] },
  forearmDir: [.05, -.80, .60],      // direzione polso → gomito a riposo (riferimento del telefono): il polso esteso ~30°
};

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
    wrist: mm(HAND.wrist), wristR: HAND.wristR/1000,
    heel: HAND.heel.map(h => ({ p: mm(h.slice(0, 3)), r: h[3]/1000 })),
    fingers,
    thumb: { pts: HAND.thumb.pts.map(mm), r: HAND.thumb.r.map(x => x/1000) },
    forearmDir: norm(HAND.forearmDir),
  };
})();

// Scheletro nel campo per una posa del telefono { pos, q } e una spalla (disegnata). pole: dove preferisce stare il gomito.
export function solveArm(pose, shoulder, { pole = [.35, -1, .35], mirror = 1 } = {}){
  const T = v => add(pose.pos, qrot(pose.q, v));          // telefono → campo
  const R = v => qrot(pose.q, v);
  const W = T(HAND_LOCAL.wrist), dF = norm(R(HAND_LOCAL.forearmDir));
  const Lu = ARM.upper, Lf = ARM.fore;
  let S = shoulder.slice(), d = len(sub(W, S));
  // fuori portata: la spalla avanza verso la mano (scapola), come in un colpo vero
  if (d > Lu + Lf - .004){ S = add(W, mul(norm(sub(S, W)), Lu + Lf - .004)); d = Lu + Lf - .004; }
  if (d < Math.abs(Lu - Lf) + .01){ S = add(W, mul(norm(sub(S, W)), Math.abs(Lu - Lf) + .01)); d = Math.abs(Lu - Lf) + .01; }
  const e = norm(sub(W, S)), x = (d*d + Lu*Lu - Lf*Lf)/(2*d), rho = Math.sqrt(Math.max(0, Lu*Lu - x*x));
  const C = add(S, mul(e, x));
  let u = cross(e, [0, 1, 0]); if (len(u) < 1e-4) u = cross(e, [1, 0, 0]); u = norm(u); const v = cross(e, u);
  const P = norm([pole[0]*mirror, pole[1], pole[2]]);
  const cost = a => {
    const E = add(C, add(mul(u, rho*Math.cos(a)), mul(v, rho*Math.sin(a))));
    return -dot(norm(sub(E, W)), dF) - .35*dot(norm(sub(E, C)), P);
  };
  let best = 0, bc = Infinity;
  for (let i = 0; i < 72; i++){ const a = i/72*2*Math.PI, c = cost(a); if (c < bc){ bc = c; best = a; } }
  for (let h = 2*Math.PI/72; h > 1e-4; h /= 2){ for (const a of [best - h, best + h]){ const c = cost(a); if (c < bc){ bc = c; best = a; } } }
  const E = add(C, add(mul(u, rho*Math.cos(best)), mul(v, rho*Math.sin(best))));
  const fore = norm(sub(E, W));
  const wristBend = Math.acos(Math.max(-1, Math.min(1, dot(fore, dF))))/D;   // scarto dal polso a riposo (gradi)
  const hand = {
    wrist: W,
    heel: HAND_LOCAL.heel.map(h => ({ p: T(h.p), r: h.r })),
    fingers: HAND_LOCAL.fingers.map(f => ({ name: f.name, pts: f.pts.map(T), r: f.r, local: f.pts })),
    thumb: { pts: HAND_LOCAL.thumb.pts.map(T), r: HAND_LOCAL.thumb.r, local: HAND_LOCAL.thumb.pts },
  };
  return { S, E, W, hand, wristBend, elbowAngle: Math.acos(Math.max(-1, Math.min(1, dot(norm(sub(S, E)), norm(sub(W, E))))))/D };
}

// punti del telefono nel campo
export function phonePoints(pose){
  const T = v => add(pose.pos, qrot(pose.q, v)), h = PHONE.h/2;
  return { center: pose.pos, tip: T([0, h, 0]), base: T([0, -h, 0]), screen: qrot(pose.q, [0, 0, 1]), axis: qrot(pose.q, [0, 1, 0]), right: qrot(pose.q, [1, 0, 0]), T };
}
export { lerp };
