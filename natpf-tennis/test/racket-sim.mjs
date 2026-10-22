// Racchetta simulata per le prove del «telefono come racchetta»: un braccio che ruota attorno alla spalla con il
// telefono in mano come manico, campionato a 60 Hz come il browser (giroscopio nel riferimento del telefono,
// accelerazione con e senza gravità), fatto passare nella stessa catena della pagina del telefono (racchetta.js):
// rilevatore, filtro d'orientamento, forma del colpo, messaggio. Di ogni colpo si conosce la forma vera (piano,
// salita della testa, rotazione sul manico, inclinazione del manico), da confrontare con quella misurata.
//
// Mondo: x a destra di chi gioca, y in alto, −z verso la rete. Il colpo:
//   • sweep: rotazione del braccio attorno a un asse per la spalla, con velocità a campana che ha il picco all'impatto;
//     l'asse è l'alto (swing orizzontale) inclinato di «rise» gradi: > 0 dal basso verso l'alto, < 0 dall'alto verso
//     il basso, ±90 swing verticale. Verso: da destra a sinistra (dritto del destro, rovescio del mancino) o al contrario;
//   • roll: rotazione del telefono attorno al proprio asse lungo durante lo swing (− chiude il piatto, + lo apre);
//   • presa: inclinazione del manico all'impatto (elev, gradi sopra l'orizzonte) e rotazione del telefono nella mano
//     attorno al manico (turn, gradi): cambiano i sensori, non il gesto.
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { createFaceTracker } from '@natpf/tennis/face-tracker.js';
import { strokeShape } from '@natpf/tennis/stroke-shape.js';
import { swingMessage, parseSwingMessage } from '@natpf/tennis/swing-message.js';
import { rng } from './phone-sim.mjs';

const G = 9.81, DT = 1000/60, D = Math.PI/180;
const len = v => Math.hypot(v[0], v[1], v[2]);
const unit = v => { const l = len(v); return l > 1e-12 ? v.map(x => x/l) : [0, 0, 0]; };
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0], a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
const qnorm = q => { const l = Math.hypot(...q) || 1; return q.map(v => v/l); };
const rotate = (q, v) => qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)).slice(0, 3);
const qaxis = (axis, deg) => { const a = unit(axis), h = deg*D/2; return [a[0]*Math.sin(h), a[1]*Math.sin(h), a[2]*Math.sin(h), Math.cos(h)]; };
// quaternione dalla base del telefono (colonne x, y, z nel mondo)
function qFromBasis(x, y, z){
  const m = [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]], tr = m[0][0] + m[1][1] + m[2][2];
  let q;
  if (tr > 0){ const s = Math.sqrt(tr + 1)*2; q = [(m[2][1] - m[1][2])/s, (m[0][2] - m[2][0])/s, (m[1][0] - m[0][1])/s, s/4]; }
  else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]){ const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2])*2; q = [s/4, (m[0][1] + m[1][0])/s, (m[0][2] + m[2][0])/s, (m[2][1] - m[1][2])/s]; }
  else if (m[1][1] > m[2][2]){ const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2])*2; q = [(m[0][1] + m[1][0])/s, s/4, (m[1][2] + m[2][1])/s, (m[0][2] - m[2][0])/s]; }
  else { const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1])*2; q = [(m[0][2] + m[2][0])/s, (m[1][2] + m[2][1])/s, s/4, (m[1][0] - m[0][1])/s]; }
  return qnorm(q);
}
// verso del colpo: +1 da destra a sinistra (antiorario visto dall'alto), −1 al contrario
export const strokeDir = (hand, side) => (side === 'forehand') === (hand !== 'left') ? 1 : -1;

export function racketSim({ hand = 'right', seed = 3, profile = null, prep = true } = {}){
  const R = rng(seed);
  const det = createSwingDetector(), face = createFaceTracker({ quietHold: 400, relax: 2.5 });
  const swings = [], msgs = [];
  let seq = 0;
  det.on('swing', s => {
    if (face.ready){ s.face = face.strokeFace(s.peakT, s.t - s.dur); s.head = face.headAt(s.peakT, s.axis); s.shape = strokeShape(face.history(), face.up, { peakT: s.peakT }); }
    swings.push(s);
    msgs.push(JSON.parse(JSON.stringify(swingMessage(s, { grip: 'upright', rtt: 20, now: s.t + 5, seq: ++seq }))));
  });
  let t = 0, q = [0, 0, 0, 1], pos = [0, 1.1, -.3], vel = [0, 0, 0];
  // un campione dall'orientamento e dalla posizione nuovi (il giroscopio è la rotazione tra i due campioni)
  const sample = (qNext, posNext, noise = 0) => {
    const dq = qmul(qNext, qconj(q)), w = Math.max(-1, Math.min(1, dq[3]*(dq[3] < 0 ? -1 : 1))), ang = 2*Math.acos(w);
    const ax = ang > 1e-9 ? unit(dq[3] < 0 ? [-dq[0], -dq[1], -dq[2]] : [dq[0], dq[1], dq[2]]) : [0, 0, 0];
    const wWorld = ax.map(a => a*ang/(DT/1000));                        // rad/s nel mondo
    const velNext = posNext.map((p, i) => (p - pos[i])/(DT/1000)), acc = velNext.map((v, i) => (v - vel[i])/(DT/1000));
    q = qNext; pos = posNext; vel = velNext;
    const wd = rotate(qconj(q), wWorld).map(v => v/D + (R() - .5)*2*noise);
    const a = rotate(qconj(q), acc), g = rotate(qconj(q), [0, G, 0]);
    const k = { t, rot: [wd[2], wd[0], wd[1]], acc: a, accG: [g[0] + a[0], g[1] + a[1], g[2] + a[2]] };
    if (face.ready) face.feed(k);
    det.feed(k);
    t += DT;
  };
  // posa «pronto»: manico in alto (inclinato di elev sopra l'orizzonte, verso avanti), dorso verso la rete
  const readyPose = (elev = 70, turn = 0) => {
    const y = unit([0, Math.sin(elev*D), -Math.cos(elev*D)]);
    let z = unit(cross([1, 0, 0], y)); if (dot(z, [0, 0, 1]) < 0) z = z.map(v => -v);
    let x = cross(y, z);
    const qt = qaxis(y, turn);
    return qmul(qt, qFromBasis(x, y, z));
  };
  const rest = (ms, tremor = 0) => { for (const end = t + ms; t < end;){ const j = [0, 1, 2].map(() => (R() - .5)*2*tremor*D*DT/1000); sample(qnorm(qmul(qaxis(j, len(j)/D), q)), pos.slice(), 0); } };
  // calibrazione «Salta»: profilo semplice dalla posa ferma (come cal.skip())
  const start = ({ elev = 70, turn = 0, tremor = 0 } = {}) => {
    q = readyPose(elev, turn); pos = [hand === 'left' ? -.25 : .25, 1.1, -.35]; vel = [0, 0, 0];
    det.still(); rest(700, tremor);
    const p = profile || { version: 4, automaticGesture: true, simple: true, hand, bias: det.profile.bias, noise: det.profile.noise, gravity: det.profile.gravity, axis: null, ref: 420, refs: null, refAngle: 30, on: 70, minPeak: 120, minAngle: 6 };
    det.setProfile(p); det.run(); det.setContext('play'); det.setPrepMode(prep);
    face.setRest(det.profile.gravity, det.profile.bias);
    rest(400, tremor);
  };
  // un colpo. side: forehand/backhand; rise: gradi (piano inclinato: >0 la testa sale, <0 scende, ±90 swing
  // verticale di lato); peak: °/s al picco (= impatto); amp: gradi dello sweep (metà prima, metà dopo l'impatto);
  // roll: gradi di rotazione sul manico durante lo sweep; elev/turn: presa all'impatto; tremor: °/s di tremolio;
  // noise: rumore del giroscopio (°/s); overhead: impatto sopra la testa con sweep in avanti e in basso (schiacciata).
  const stroke = ({ side = 'forehand', rise = 0, peak = 900, amp = 120, roll: roll0 = 0, elev = 15, turn = 0, tremor = 0, noise = 0, arm = .6, settle = 700, overhead = false, expect = true } = {}) => {
    const dir = strokeDir(hand, side);
    let roll = roll0;
    const lateral = side === 'forehand' ? (hand === 'left' ? -1 : 1) : (hand === 'left' ? 1 : -1);
    const shoulder = [hand === 'left' ? -.2 : .2, 1.4, 0];
    let A, rC;
    if (overhead){ A = [-1, 0, 0]; rC = [.1*lateral, arm*.95, -.2]; }
    else { A = unit([0, Math.cos(rise*D), Math.sin(rise*D)].map(v => v*dir)); rC = [lateral*arm*.85, -.3, -.2]; }
    // manico all'impatto: verso fuori nel piano del colpo (in alto nella schiacciata), alzato di elev verso l'alto
    const lat = overhead ? [0, 1, 0] : [lateral, 0, 0];
    const out = unit(lat.map((v, i) => v - dot(lat, A)*A[i]));
    const yC = unit(out.map((v, i) => v*Math.cos(elev*D) + [0, 1, 0][i]*Math.sin(elev*D)));
    let zC = unit(cross(yC, A)); if (len(zC) < .1) zC = unit(cross(yC, [1, 0, 0]));
    const qC = qmul(qaxis(yC, turn), qFromBasis(cross(yC, zC), yC, zC));
    // roll > 0 apre il piatto che avanza (lo gira verso l'alto), < 0 lo chiude, per qualunque mano e lato
    const vC = unit(cross(A, rC)), rollSign = Math.sign(dot(cross(yC, vC), [0, 1, 0])) || 1;
    roll *= rollSign;
    const poseAt = (th, rl) => {
      const qs = qaxis(A, th/D), qq = qmul(qs, qmul(qaxis(yC, rl), qC));
      return { q: qq, p: rotate(qs, rC).map((v, i) => v + shoulder[i]) };
    };
    // sweep da −amp/2 a +amp/2 con velocità a campana (sin²): picco 2·amp/T all'impatto
    const T = 2*amp/Math.max(60, peak), N = Math.max(6, Math.round(T*1000/DT));
    const theta = u => (u - Math.sin(2*Math.PI*u)/(2*Math.PI))*amp*D - amp*D/2;
    if (expect && prep) det.setExpect(dir);
    // preparazione lenta verso l'inizio dello sweep (sotto la soglia dei colpi, come il caricamento della racchetta)
    const P0 = poseAt(-amp*D/2, -roll/2), qa = q, pa = pos, steps = Math.max(10, Math.round(700/DT));
    for (let i = 1; i <= steps; i++){ const u = i/steps, s = u*u*(3 - 2*u); sample(slerp(qa, P0.q, s), pa.map((v, j) => v + (P0.p[j] - v)*s), noise); }
    rest(80, tremor);
    let impactT = null;
    for (let i = 1; i <= N; i++){
      const u = i/N, th = theta(u), P = poseAt(th, -roll/2 + roll*u);
      const j = tremor ? [0, 1, 2].map(() => (R() - .5)*2*tremor*D*DT/1000) : null;
      sample(j ? qnorm(qmul(qaxis(j, len(j)/D), P.q)) : P.q, P.p, noise);
      if (impactT == null && th >= 0) impactT = t - DT;
    }
    // finale e ritorno lento alla posa «pronto» (sotto la soglia dei colpi)
    rest(150, tremor);
    const qr = readyPose(), pr = [hand === 'left' ? -.25 : .25, 1.1, -.35], qb = q, pb = pos;
    const back = Math.max(10, Math.round(1000/DT));
    for (let i = 1; i <= back; i++){ const u = i/back, s = u*u*(3 - 2*u); sample(slerp(qb, qr, s), pb.map((v, j) => v + (pr[j] - v)*s), noise); }
    rest(settle, tremor);
    if (expect && prep) det.setExpect(0);
    // forma vera all'impatto: testa = mano + manico × racchetta
    const head = th => { const P = poseAt(th, 0); return P.p.map((v, i) => v + rotate(P.q, [0, .45, 0])[i]); };
    const hv = head(.01).map((v, i) => (v - head(-.01)[i])/.02);
    return { dir, plane: dot(A, [0, 1, 0]), rise: dot(unit(hv), [0, 1, 0]), tilt: dot(yC, [0, 1, 0]), impactT };
  };
  return { det, face, swings, msgs, start, rest, stroke, get t(){ return t; },
    last(){ const m = msgs[msgs.length - 1]; return m ? parseSwingMessage(m, { at: 10, now: 10020 }) : null; } };
}
function slerp(a, b, u){
  let d = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]; const bb = d < 0 ? b.map(v => -v) : b; d = Math.abs(d);
  if (d > .9995) return qnorm(a.map((v, i) => v + (bb[i] - v)*u));
  const th = Math.acos(d), s = Math.sin(th);
  return qnorm(a.map((v, i) => v*Math.sin((1 - u)*th)/s + bb[i]*Math.sin(u*th)/s));
}
