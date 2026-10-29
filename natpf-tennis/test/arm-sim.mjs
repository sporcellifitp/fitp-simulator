// Braccio simulato per i test dei gesti (segnalazione del 23/10, sera: pallonetti e palle corte quasi mai riusciti). Il
// telefono nella mano ruota con il braccio attorno a un perno (spalla, gomito o polso: rc è il vettore dal perno alla
// mano all'impatto) e la mano ha l'accelerazione vera di quel moto (tangenziale e centripeta); in più il polso. Lo swing
// di phone-sim.mjs fa ruotare il telefono su se stesso con una spinta della mano a parte: con il telefono dritto il
// pallonetto non poteva salire. Campo: x a destra, y in alto, −z verso la rete. Destro.
// Presa (grip): display a destra o a sinistra (di taglio), asse lungo inclinato in avanti di tilt gradi dalla verticale.
import { simPhone } from './phone-sim.mjs';
const D = Math.PI/180, DT = 1000/60;
const len = v => Math.hypot(...v), unit = v => { const l = len(v) || 1; return v.map(x => x/l); };
const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
// rotazione di v attorno all'asse unitario a di ang (rad), Rodrigues
const rot = (v, a, ang) => { const c = Math.cos(ang), s = Math.sin(ang), k = cross(a, v), d = dot(a, v); return v.map((x, j) => x*c + k[j]*s + a[j]*d*(1 - c)); };
// presa: display a destra (side 1) o a sinistra (−1), asse lungo inclinato in avanti di tilt gradi dalla verticale
export function grip(p, { tilt = 30, side = 1 } = {}){ p.pose([0, 1, 0], 90*side); p.pose([1, 0, 0], -tilt); p.rest(500, 4); }
// presa di riferimento dal 29/10 (foto dell'utente): base nel palmo, schermo verso chi gioca, poi la cima in avanti di
// tilt gradi dalla verticale (lo schermo guarda in alto e indietro) e un rollio attorno all'asse lungo
export function palmGrip(p, { tilt = 65, roll = 0 } = {}){
  p.pose([1, 0, 0], -tilt);
  if (roll){ const t = tilt*D; p.pose([0, Math.cos(t), -Math.sin(t)], roll); }
  p.rest(500, 4);
}
// colpo del braccio: rotazione attorno all'asse axis (campo, per la spalla) con picco peak °/s in ms, il braccio (spalla →
// mano) al momento dell'impatto è rc (m). wrist: rotazione del polso (°/s di picco) attorno a wristAxis (campo, all'impatto),
// nella seconda metà. back: apertura lenta prima, rientro dopo.
export function armSwing(p, { axis = [0, 1, 0], peak = 600, ms = 280, rc = [.35, -.55, -.3], wrist = 0, wristAxis = [0, 0, -1], wristFull = false, tremor = 0, back = true, R = Math.random } = {}){
  const A = unit(axis), n = Math.round(ms/DT), total = peak*ms/1000*.5;           // gradi percorsi in tutto
  // angolo dal momento dell'impatto (metà del gesto): φ(u) = ∫ peak sin²(πu') du' · ms − total/2
  const phi = u => (peak*ms/1000*(u/2 - Math.sin(2*Math.PI*u)/(4*Math.PI)) - total/2)*D;
  const start = p.q.slice();
  if (back) p.pose(A, -total/2*(wristFull ? 1 + wrist/peak : 1), 90);
  const jit = a => [0, 1, 2].map(() => (R() - .5)*2*a);
  for (let i = 0; i <= n; i++){
    const u = i/n, w = peak*Math.sin(Math.PI*u)**2, al = peak*Math.PI*Math.sin(2*Math.PI*u)/(ms/1000);   // °/s, °/s²
    const r = rot(rc, A, phi(u)), wr = w*D, ar = al*D;
    // accelerazione della mano: tangenziale + centripeta
    const at = cross(A, r).map(x => x*ar), ac = cross(A, cross(A, r)).map(x => x*wr*wr);
    const pw = wristFull ? wrist*Math.sin(Math.PI*u)**2 : wrist*Math.sin(Math.PI*Math.max(0, u*1.4 - .2))**2*(u*1.4 - .2 > 0 && u*1.4 - .2 < 1 ? 1 : 0);
    const WA = unit(rot(wristAxis, A, phi(u)));
    const ww = A.map((x, j) => x*w + WA[j]*pw + jit(tremor)[j]);
    p.sampleWorld(ww, at.map((x, j) => x + ac[j]));
  }
  if (back){ p.rest(120, tremor); returnTo(p, start); }
}
// torna lentamente a un orientamento (come phone-sim)
const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0], a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
export function returnTo(p, target, rate = 90){
  const d = qmul(target, qconj(p.q)), w = Math.max(-1, Math.min(1, d[3]*(d[3] < 0 ? -1 : 1))), ang = 2*Math.acos(w)/D;
  if (ang < .05) return;
  const ax = d[3] < 0 ? [-d[0], -d[1], -d[2]] : [d[0], d[1], d[2]];
  p.pose(ax, ang, rate);
}
// colpi tipici (destro): dritto e rovescio con un po' di salita, pallonetto (spalla che flette: la mano sale), palla corta
// (dall'alto in basso, lenta e corta, il piatto si apre), tagliato (dritto dall'alto in basso)
export const STROKES = {
  dritto:    { axis: [-.18, 1, .08], peak: 650, ms: 260, rc: [.45, -.5, -.25], wrist: 350, wristAxis: [0, 0, -1] },
  rovescio:  { axis: [.18, -1, .08], peak: 600, ms: 260, rc: [-.45, -.5, -.25], wrist: -300, wristAxis: [0, 0, -1] },
  pallonetto:{ axis: [1, .35, 0], peak: 520, ms: 300, rc: [.3, -.55, -.3] },
  pallonettoR:{ axis: [1, -.35, 0], peak: 480, ms: 300, rc: [-.3, -.55, -.3] },
  corta:     { axis: [-1, .45, 0], peak: 330, ms: 240, rc: [.3, -.35, -.45], wrist: -250, wristAxis: [0, 0, -1] },
  cortaR:    { axis: [-1, -.45, 0], peak: 300, ms: 240, rc: [-.3, -.35, -.45], wrist: 250, wristAxis: [0, 0, -1] },
  tagliato:  { axis: [-.6, 1, 0], peak: 600, ms: 260, rc: [.45, -.4, -.3] },
};
// telefono simulato con la forma, presa data, calibrazione rapida con il braccio (dritto e rovescio veri)
export function phoneWith({ tilt = 30, side = 1, seed = 7, cal = true } = {}){
  const p = simPhone({ seed, shape: true }); grip(p, { tilt, side });
  if (cal) p.calibrate({ armGesture: w => armSwing(p, w === 'L' ? STROKES.dritto : STROKES.rovescio) });
  return p;
}
