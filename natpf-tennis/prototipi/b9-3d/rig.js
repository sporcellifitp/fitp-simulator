// Prototipo B9 «3D realistico» — scheletro del braccio guidato dal telefono (funzioni PURE, niente three.js).
//
// La posa del telefono (motion.js, verificata con il telefono simulato) è l'unico dato: la mano è solidale con il
// telefono (presa nel palmo, hand.js), il polso W ne segue la posa, e il gomito si trova con un'IK a due ossa
// (omero L1, avambraccio L2). Sul cerchio delle soluzioni il gomito è quello che tiene il polso più vicino alla sua
// posa neutra (avambraccio nella direzione preferita della mano), con una leggera preferenza per il gomito basso e
// fuori: così il polso non si spezza e il gomito non «sbandiera». Se la mano è oltre la portata, la spalla avanza
// (protrazione della scapola e rotazione del tronco, invisibili perché il braccio sfuma prima della spalla).
// Prono-supinazione: la differenza di rotolamento tra gomito (asse della cerniera) e mano si distribuisce lungo
// l'avambraccio su quattro ossa (0, 1/3, 2/3, 1), come radio e ulna: niente «caramella» al polso.
import { SHOULDER, qrot, qmul } from './motion.js';
import { handDesign, V3 } from './hand.js';

const { add, sub, mul, dot, cross, len, norm } = V3;
export const ARM = Object.freeze({ L1: .295, L2: .252 });
export const TWIST_F = Object.freeze([0, 1/3, 2/3, 1]);
// quota della prono-supinazione portata da ciascun osso dell'avambraccio: la parte visibile (metà distale) segue quasi
// tutta la mano, come il radio; il resto si scarica verso il gomito, che non si vede
export const TWIST_AMT = Object.freeze([.45, .65, .84, 1]);
export const HD = handDesign();

export const qconj = q => [-q[0], -q[1], -q[2], q[3]];
export const qAxis = (a, ang) => { const u = norm(a), s = Math.sin(ang/2); return [u[0]*s, u[1]*s, u[2]*s, Math.cos(ang/2)]; };
function qFromBasis(x, y, z){            // colonne della matrice di rotazione
  const m00 = x[0], m10 = x[1], m20 = x[2], m01 = y[0], m11 = y[1], m21 = y[2], m02 = z[0], m12 = z[1], m22 = z[2];
  const tr = m00 + m11 + m22;
  if (tr > 0){ const s = .5/Math.sqrt(tr + 1); return [(m21 - m12)*s, (m02 - m20)*s, (m10 - m01)*s, .25/s]; }
  if (m00 > m11 && m00 > m22){ const s = 2*Math.sqrt(1 + m00 - m11 - m22); return [.25*s, (m01 + m10)/s, (m02 + m20)/s, (m21 - m12)/s]; }
  if (m11 > m22){ const s = 2*Math.sqrt(1 + m11 - m00 - m22); return [(m01 + m10)/s, .25*s, (m12 + m21)/s, (m02 - m20)/s]; }
  const s = 2*Math.sqrt(1 + m22 - m00 - m11); return [(m02 + m20)/s, (m12 + m21)/s, .25*s, (m10 - m01)/s];
}
export function frameQ(x, yHint){
  const X = norm(x), Y = norm(sub(yHint, mul(X, dot(yHint, X))));
  return qFromBasis(X, Y, cross(X, Y));
}
const wrap = a => a - 2*Math.PI*Math.round(a/(2*Math.PI));
const rotV = (v, k, ang) => { const c = Math.cos(ang), s = Math.sin(ang), kv = cross(k, v), d = dot(k, v); return [0, 1, 2].map(j => v[j]*c + kv[j]*s + k[j]*d*(1 - c)); };
// rotolamento dell'avambraccio (cerniera → lato radiale della mano) nella posa di partenza, misurato: −31°
const TAU_REST = -31*Math.PI/180;

// Braccio per una posa del telefono (riferimento del giocatore destro).
// L'avambraccio prolunga la mano (polso quasi neutro, come chiede la specifica: «polso fermo»); il gomito sta a L2 dal
// polso. Se così il gomito resta lontano dalla spalla nominale (la posa dei colpi del gioco mette la mano a 0,4–0,6 m
// dalla spalla con la presa nel palmo, che porta l'avambraccio di traverso davanti al corpo), il polso devia al massimo
// di BETA_MAX verso la spalla; il resto lo assorbe la spalla (protrazione e rotazione del tronco), che non si vede:
// l'omero va dal gomito verso la spalla nominale e sfuma prima di arrivarci.
const BETA_MAX = 24*Math.PI/180, GAIN = 1.4;
export function solveArm(phonePos, phoneQ){
  const { L1, L2 } = ARM;
  const S0 = SHOULDER;
  const W = add(qrot(phoneQ, HD.W), phonePos);
  const Fpref = norm(qrot(phoneQ, HD.forearmDir));
  const r = mul(Fpref, -1);                        // polso → gomito, posa neutra
  const Estar = add(W, mul(r, L2));
  const m = sub(S0, Estar), mt0 = sub(m, mul(r, dot(m, r))), mtl = len(mt0);
  const err = len(m) - L1;                         // > 0: gomito troppo lontano dalla spalla
  let beta = 0;
  if (mtl > 1e-6){
    const maxToward = Math.atan2(mtl, Math.max(1e-6, -dot(sub(W, S0), r)) );   // non oltre l'allineamento con la spalla
    beta = Math.max(-BETA_MAX, Math.min(BETA_MAX, Math.min(maxToward, GAIN*err/L2)));
  }
  const mt = mtl > 1e-6 ? mul(mt0, 1/mtl) : [0, -1, 0];
  const re = add(mul(r, Math.cos(beta)), mul(mt, Math.sin(beta)));
  const E = add(W, mul(re, L2)), F = mul(re, -1);
  const U = norm(sub(E, S0)), S = sub(E, mul(U, L1));
  // asse della cerniera del gomito; con il gomito quasi teso (flessione < 25°) è mal definito: il rotolamento
  // dell'avambraccio rispetto alla mano torna con continuità a quello della posa di legame (TAU_REST)
  const flexion = Math.acos(Math.max(-1, Math.min(1, dot(U, F))))*180/Math.PI;
  const vW = norm(qrot(phoneQ, HD.v));
  const vp = norm(sub(vW, mul(F, dot(vW, F))));
  let h = cross(U, F), tau = TAU_REST;
  if (len(h) > 1e-6){ h = norm(h); tau = Math.atan2(dot(cross(h, vp), F), dot(h, vp)); }
  const wk = Math.min(1, Math.max(0, (flexion - 6)/19)), k = wk*wk*(3 - 2*wk);
  tau = TAU_REST + k*wrap(tau - TAU_REST);
  h = rotV(vp, F, -tau);
  const wristDev = beta*180/Math.PI;
  return { S, E, W, U, F, h, tau, shift: len(sub(S, S0)), flexion, wristDev };
}

export function makeBind(phonePos, phoneQ){
  const arm = solveArm(phonePos, phoneQ);
  return { pos: phonePos.slice(), q: phoneQ.slice(), arm, fU: frameQ(arm.U, arm.h), fF: frameQ(arm.F, arm.h) };
}

// Ossa nel mondo: [omero, avambraccio ×4, mano] → { p: posizione, q: rotazione rispetto alla posa di legame }
export function boneState(bind, phonePos, phoneQ){
  const A = solveArm(phonePos, phoneQ), B = bind.arm;
  const qU = qmul(frameQ(A.U, A.h), qconj(bind.fU));
  const qF = qmul(frameQ(A.F, A.h), qconj(bind.fF));
  const dt = wrap(A.tau - B.tau);
  const bones = [{ p: A.S, q: qU }];
  TWIST_F.forEach((f, i) => bones.push({ p: add(A.E, mul(A.F, f*ARM.L2)), q: qmul(qAxis(A.F, TWIST_AMT[i]*dt), qF) }));
  bones.push({ p: A.W, q: qmul(phoneQ, qconj(bind.q)) });
  return { bones, arm: A, twist: dt*180/Math.PI };
}
// posizioni di legame delle ossa (stesso ordine)
export function bindBones(bind){
  const A = bind.arm;
  return [A.S, ...TWIST_F.map(f => add(A.E, mul(A.F, f*ARM.L2))), A.W];
}
