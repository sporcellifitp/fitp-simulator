// Forma del colpo: come si muove la racchetta virtuale di cui il telefono è il manico. Senza DOM (testabile con Node).
//
// Il telefono non sa dov'è lo schermo del gioco, ma sa dov'è l'alto (gravità): tutto si misura rispetto all'alto, così
// la forma non dipende da come si tiene il telefono in mano ed è speculare tra destri e mancini.
//   • plane: asse di rotazione rispetto alla verticale durante l'avanzamento. ±1: swing orizzontale (dritto, rovescio),
//     0: swing verticale (dal basso verso l'alto come un pallonetto, dall'alto verso il basso come una schiacciata).
//     Segno: + antiorario visto dall'alto (da destra a sinistra).
//   • rise: verso verticale della testa della racchetta all'impatto, da −1 (scende) a +1 (sale). La testa si muove con
//     la mano (accelerazione integrata da quando la mano inverte il moto) più la rotazione del manico (velocità di
//     rotazione × asse lungo del telefono × lunghezza della racchetta). Con il telefono in verticale che gira su se
//     stesso conta la mano; quando l'asse lungo spazza (pallonetto, schiacciata) conta la rotazione.
//   • roll: rotazione del polso attorno al manico negli ultimi 60 ms prima dell'impatto (tolta quella dello swing),
//     rispetto al piatto che avanza: − lo gira verso il basso (polso sopra la palla: top spin), + verso l'alto («a
//     cucchiaio»: taglio, palla corta). −1…+1.
//   • tilt: inclinazione del manico all'impatto: +1 testa in alto (racchetta verticale, sopra la testa), 0 orizzontale,
//     −1 testa in basso.
//   • head, hand: velocità della testa e della mano all'impatto (m/s, stime); from: ms dall'inversione della mano.
// Il piatto non si legge dallo schermo: quale faccia del telefono sia il piatto dipende da come lo si tiene. Il piatto
// che avanza è la direzione del moto della testa perpendicolare al manico.
// L'accelerazione integrata a 60 Hz non dà la direzione orizzontale del colpo (l'orientamento sbaglia di troppo
// durante i colpi veloci): la forma ne usa solo la componente verticale, su una finestra breve.
const len = v => Math.hypot(v[0], v[1], v[2]);
const unit = v => { const l = len(v); return l > 1e-9 ? v.map(x => x/l) : [0, 0, 0]; };
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0], a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
const rotate = (q, v) => qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)).slice(0, 3);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const D = Math.PI/180;

export const SHAPE = Object.freeze({
  racket: .45,        // m: dalla mano alla testa della racchetta virtuale
  planeMs: 110,       // ms prima del picco su cui si misura il piano dello swing
  startFrom: 420, startTo: 50,  // ms prima del picco in cui cercare l'inversione della mano (velocità di rotazione minima)
  impactMs: 34,       // ms prima del picco su cui si media la velocità della testa (circa due campioni)
  rollMs: 60,         // ms prima del picco per la rotazione attorno al manico
});

// hist: storia del filtro d'orientamento (face-tracker.js): { t, q, w (°/s), a (m/s²), rate } nel riferimento di
// riposo; up: alto nello stesso riferimento. peakT: istante del picco (impatto). null se la storia non basta.
export function strokeShape(hist, up, { peakT, racket = SHAPE.racket } = {}){
  if (!Array.isArray(hist) || hist.length < 4 || !up || !Number.isFinite(peakT)) return null;
  const U = unit(up);
  const H = hist.filter(h => h.t <= peakT + 1);
  if (H.length < 4 || peakT - H[0].t < SHAPE.planeMs || !H[H.length - 1].w) return null;
  // piano: asse di rotazione rispetto alla verticale, pesato con la velocità, sull'avanzamento
  let pw = 0, pn = 0;
  for (const h of H) if (h.t >= peakT - SHAPE.planeMs && h.w){ pw += dot(h.w, U); pn += len(h.w); }
  const plane = pn > 1e-6 ? clamp(pw/pn, -1, 1) : 0;
  // inversione della mano (inizio dell'avanzamento): l'istante con la rotazione più lenta prima del colpo
  let i0 = -1;
  for (let i = 0; i < H.length; i++){
    const h = H[i]; if (h.t < peakT - SHAPE.startFrom || h.t > peakT - SHAPE.startTo) continue;
    if (i0 < 0 || h.rate < H[i0].rate) i0 = i;
  }
  if (i0 < 0) i0 = 0;
  // velocità della mano (riferimento di riposo) dall'inversione in poi, e della testa della racchetta
  let v = [0, 0, 0];
  const heads = [];
  for (let i = i0 + 1; i < H.length; i++){
    const h = H[i], dt = Math.min(.06, (h.t - H[i - 1].t)/1000);
    if (h.a) v = v.map((x, j) => x + h.a[j]*dt);
    if (h.t >= peakT - SHAPE.impactMs && h.w) heads.push({ head: v.map((x, j) => x + cross(h.w.map(c => c*D), rotate(h.q, [0, racket, 0]))[j]), h });
  }
  if (!heads.length) return null;
  const head = [0, 1, 2].map(j => heads.reduce((s, x) => s + x.head[j], 0)/heads.length);
  const speed = len(head);
  const rise = speed > .05 ? clamp(dot(head, U)/speed, -1, 1) : 0;
  const last = heads[heads.length - 1].h, Y = rotate(last.q, [0, 1, 0]);
  const tilt = clamp(dot(Y, U), -1, 1);
  // rotazione attorno al manico che gira il piatto che avanza (moto della testa perpendicolare al manico) verso l'alto
  // o verso il basso, mediata sugli ultimi rollMs. Dello swing si toglie la rotazione attorno al suo asse (direzione
  // media della rotazione sull'avanzamento): con il manico inclinato una parte cade sul manico anche senza polso.
  const n = unit(head.map((x, j) => x - dot(head, Y)*Y[j]));
  const axis = unit(H.filter(h => h.t >= peakT - SHAPE.planeMs && h.w).reduce((acc, h) => acc.map((x, j) => x + h.w[j]), [0, 0, 0]));
  let rs = 0, rn = 0;
  for (const h of H){
    if (h.t < peakT - SHAPE.rollMs || !h.w) continue;
    const y = rotate(h.q, [0, 1, 0]), m = len(h.w);
    if (m < 1e-6) continue;
    const wr = h.w.map((x, j) => x - dot(h.w, axis)*axis[j]);
    rs += dot(wr, y)*dot(cross(y, n), U); rn += m;
  }
  const roll = rn > 1e-6 ? clamp(rs/rn, -1, 1) : 0;
  return {
    plane: +plane.toFixed(3), rise: +rise.toFixed(3), roll: +roll.toFixed(3), tilt: +tilt.toFixed(3),
    head: +speed.toFixed(2), hand: +len(v).toFixed(2), from: Math.round(peakT - H[i0].t),
  };
}
