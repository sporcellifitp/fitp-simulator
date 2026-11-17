// B63 · Mascotte 3D con animazioni nuove nella card di fine partita (decisione dell'utente del 17/11/2026: «3D con
// animazioni nuove»: 3 di vittoria e 3 di sconfitta per i modelli 3D di Lob e Drop, con passi avanti, indietro, di lato,
// balletto, testa bassa; anteprima all'utente prima di pubblicare). Documento docs/b63/mascotte-3d.md.
// Come: i ritratti 3D della card (natpf_ritratti.js, B40.6) fotografano il personaggio con le luci dell'arena. Qui, sopra
// le reazioni di sempre del corpo (player_body_animation: «cheer» il salto con la racchetta alzata, «clap» l'applauso,
// «sad» la testa bassa che si ripete uguale), tutto il personaggio si muove: passi di lato, avanti (verso chi guarda) e
// indietro, giravolta, saltelli, con i piedi che si alzano a ogni passo. Il giro dura CARD_LOOP (3 periodi del salto,
// 2,05 s) ed è chiuso: l'ultimo fotogramma si attacca al primo.
// Solo disegno durante la fotografia: il personaggio torna al suo posto subito dopo (natpf_ritratti._release).
// Interruttore (finché l'utente non approva l'anteprima): ?mascotte3d=1 nell'indirizzo o localStorage
// natpf-tennis.mascotte3d = '1'; spento resta tutto come la 17.3 (GIF nella card, B58).
import { CHEER_PERIOD } from '../player_body_animation.js';

export const CARD_LOOP = 3*CHEER_PERIOD;
export const CARD_MOVES_KEY = 'natpf-tennis.mascotte3d';
export const CARD_MOVES_LAST = 'natpf-tennis.mosse3d';
// fotogrammi del giro (11,7 al secondo); 8 dove la memoria è poca (Android, meno di 4 GB)
export const CARD_K = 24, CARD_K_LOW = 12;

const TAU = 2*Math.PI;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (a, b, v) => { const t = clamp01((v - a)/(b - a)); return t*t*(3 - 2*t); };
// passo: un piede si alza mentre il corpo si sposta (lift ≥ 0), l'altro dopo
const steps = (s, h) => ({ footL: h*Math.max(0, Math.sin(s)), footR: h*Math.max(0, -Math.sin(s)) });

// Movimenti: base = reazione del corpo; at(u) con u in [0, 1) dà lo spostamento di tutto il personaggio nel riferimento
// di chi guarda (right: verso la destra di chi guarda la card, fwd: verso chi guarda, up: in alto, yaw: giro in radianti)
// e quanto si alza ciascun piede (m). Nomi e descrizioni per l'anteprima e i documenti.
export const CARD_MOVES = Object.freeze({
  win: Object.freeze([
    Object.freeze({ id: 'win-a', name: 'Salti di gioia e passi di lato', base: 'cheer',
      at: u => { const s = TAU*u; return { right: 0.34*Math.sin(s), fwd: 0, up: 0.05*Math.abs(Math.sin(3*s)), yaw: 0.18*Math.sin(s), ...steps(2*s, 0.07) }; } }),
    Object.freeze({ id: 'win-b', name: 'Giravolta', base: 'cheer',
      at: u => { const t = ss(0.15, 0.7, u); return { right: 0, fwd: 0.06*Math.sin(TAU*u), up: 0.12*Math.sin(Math.PI*t), yaw: TAU*t, footL: 0.05*Math.sin(Math.PI*t), footR: 0.05*Math.sin(Math.PI*t) }; } }),
    Object.freeze({ id: 'win-c', name: 'Avanti e indietro a saltelli', base: 'cheer',
      at: u => { const s = TAU*u; return { right: 0.08*Math.sin(2*s), fwd: 0.42*Math.sin(s), up: 0.06*Math.abs(Math.sin(3*s)), yaw: 0, ...steps(2*s, 0.07) }; } }),
  ]),
  lose: Object.freeze([
    // (sulla mascotte 3D la testa bassa del corpo si vede poco e la faccia è sempre quella: tutta la figura si piega in
    // avanti, pitch, e i passi sono larghi)
    Object.freeze({ id: 'lose-a', name: 'Testa bassa, passi indietro', base: 'sad',
      at: u => { const s = TAU*u; return { right: 0.05*Math.sin(2*s), fwd: -0.5*(1 - Math.cos(s))/2, up: 0, yaw: 0.15*Math.sin(s), pitch: 0.24 + 0.06*Math.sin(2*s), ...steps(2*s, 0.06) }; } }),
    Object.freeze({ id: 'lose-b', name: 'Si trascina di lato, a testa bassa', base: 'sad',
      at: u => { const s = TAU*u; return { right: 0.48*Math.sin(s), fwd: -0.08, up: 0, yaw: -0.35*Math.sin(s), pitch: 0.2, roll: 0.08*Math.sin(s), ...steps(2*s, 0.05) }; } }),
    Object.freeze({ id: 'lose-c', name: 'Applaude chi ha vinto', base: 'clap',
      at: u => { const s = TAU*u; return { right: 0.06*Math.sin(s), fwd: 0.1*Math.sin(2*s), up: 0, yaw: 0.38*Math.sin(s), footL: 0, footR: 0 }; } }),
  ]),
});
export const cardMove = id => [...CARD_MOVES.win, ...CARD_MOVES.lose].find(m => m.id === id) || null;

export function cardMovesOn({ search = globalThis.location?.search || '', storage = globalThis.localStorage } = {}){
  try { const v = new URLSearchParams(search).get('mascotte3d'); if (v === '1' || v === '0') return v === '1'; } catch {}
  try { return storage?.getItem(CARD_MOVES_KEY) === '1'; } catch { return false; }
}

// Scelta del movimento per una card: a caso tra i tre del suo esito, mai quello della partita prima per lo stesso esito
export function pickCardMove(outcome, { storage = globalThis.localStorage, rnd = Math.random } = {}){
  const list = CARD_MOVES[outcome === 'win' ? 'win' : 'lose'];
  let last = {}; try { last = JSON.parse(storage?.getItem(CARD_MOVES_LAST) || '{}') || {}; } catch {}
  const pool = list.filter(m => m.id !== last[outcome]), from = pool.length ? pool : list;
  const r = Number(rnd()), m = from[Math.min(from.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0)*from.length)))];
  try { storage?.setItem(CARD_MOVES_LAST, JSON.stringify({ ...last, [outcome]: m.id })); } catch {}
  return m;
}

// Mette il personaggio nella posa del movimento al tempo t (s dall'inizio del giro). base: { pos, rotY } salvati alla presa;
// dir: verso di chi guarda lungo z (+1 / −1, come la camera del ritratto); rig: i perni dei piedi (player_body_animation)
export function applyCardMove(actor, move, t, base, dir = 1){
  if (!actor?.root || !move || !base) return null;
  const u = ((t % CARD_LOOP) + CARD_LOOP) % CARD_LOOP/CARD_LOOP, o = move.at(u);
  // destra di chi guarda: con la camera verso +z (dir = −1) è −x, verso −z è +x
  actor.root.position.set(base.pos.x + dir*o.right, base.pos.y + o.up, base.pos.z + dir*o.fwd);
  actor.root.rotation.y = base.rotY + o.yaw;
  // inclinazione in avanti (verso chi guarda) e di lato, negli assi del campo (Euler XYZ: X e Z esterni a Y)
  actor.root.rotation.x = (base.rotX || 0) + dir*(o.pitch || 0);
  actor.root.rotation.z = (base.rotZ || 0) + (o.roll || 0);
  const rig = actor.rig;
  if (rig?.footLPivot && rig?.basePivots){
    rig.footLPivot.position.y = rig.basePivots.footL.y + (o.footL || 0);
    rig.footRPivot.position.y = rig.basePivots.footR.y + (o.footR || 0);
  }
  actor.root.updateMatrixWorld?.(true);
  return o;
}
