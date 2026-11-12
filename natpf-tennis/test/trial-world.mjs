// Aiuti per i test degli scambi di prova (B28) nel mondo di prova (ui-world.mjs): il telefono finto risponde come la pagina
// vera ai comandi «cal» e «skip» (profilo semplice, evento «done»), e i colpi si mandano quando la palla è alla racchetta.
export const SIMPLE = Object.freeze({ version: 4, automaticGesture: true, simple: true, hand: 'right', axis: null, ref: 420, refs: null, refAngle: 30, on: 70, minPeak: 120, minAngle: 6, noise: 3 });
// il telefono finto manda la fine della «calibrazione» con il profilo semplice quando riceve «skip» (come racchetta.js)
export function phoneLike(P, link){
  const cmd = link.cmd.bind(link);
  link.cmd = c => { cmd(c); if (c === 'skip' && link.ready) P._onCal({ kind: 'done', step: 'done', profile: { ...SIMPLE, hand: P.hand } }); };
  return link;
}
// un colpo come arriva dal telefono: verso, picco (°/s), direzione del piatto (gradi), salita
export const stroke = ({ dir = 1, peak = 650, heading = 0, rise = .12 } = {}) => ({ dir, power: .65, lift: .1, peak, rawPeak: Math.round(peak*1.12), heading,
  shape: { plane: .85, rise, roll: 0, tilt: 0, head: 9, hand: 4 }, angle: 80, at: performance.now()/1000 - .03 });
// la palla sta arrivando a chi gioca (id 'p1' | 'p2') ed è a meno di `lead` s dalla racchetta
export function hot(E, id = 'p1', lead = .1){
  const b = E.ball, me = id === 'p2' ? E.opponent : E.player;
  if (!b.inPlay || E.phase !== 'RALLY' || b.lastHitter === (id === 'p2' ? 'opponent' : 'player')) return false;
  const dz = (me.pos.z - b.pos.z)*(id === 'p2' ? -1 : 1), vz = b.vel.z*(id === 'p2' ? -1 : 1);
  return vz > .1 && dz/vz < lead;
}
// lato della palla in arrivo per chi gioca, come lo vede (e come lo usa il gioco): +1 alla sua destra, −1 alla sua sinistra
export { ballSideNow } from '../src/natpf/natpf_phone_racket.js';
import { ballSideNow } from '../src/natpf/natpf_phone_racket.js';
export const ballWant = (E, id = 'p1') => ballSideNow(E, id);
