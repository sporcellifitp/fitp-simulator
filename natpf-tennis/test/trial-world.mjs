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
export const ballWant = (E, id = 'p1') => ballSideNow(E, id, (id === 'p2' ? E.natpfPhone2 : E.natpfPhone)?.trial?.at ?? null);

// mondo con la calibrazione «Giocando» (o un'altra), telefono collegato che risponde come la pagina vera; tutorial corto
// già visto; mode: fino alla pagina «Partita» di quella modalità (null: si resta al menu)
import { makeWorld } from './ui-world.mjs';
export async function playWorld({ cal = 'play', tutorial = true, mode = 'cpu', ...rest } = {}){
  const w = await makeWorld({ controller: 'phone', cal, ...rest }), P = w.ui.phone;
  phoneLike(P, w.link); w.advance(200);
  if (tutorial) P.markTutorialSeen('short');
  // (telefono già collegato arrivando alla pagina «Collega»: si va avanti con «Alla partita ›»)
  if (mode){ w.lobby.go('mode'); w.lobby.setMode(mode); w.lobby.go('controller'); w.lobby.go('connect'); w.advance(300); w.lobby.next(); w.advance(300); }
  return { ...w, P };
}
// gioca gli scambi di prova: hit(id, n, want, side) → il colpo (o null: non colpisce); want è il lato che si vede (palla a
// destra +1 o a sinistra −1 di chi gioca), side il lato deciso dal gioco al lancio. Restituisce i colpi fatti
export function playTrial(w, hit = (id, n, want) => stroke({ dir: want }), { phones = { p1: w.ui.phone }, max = 30000 } = {}){
  const { E, ui } = w, log = [], sides = [], n = { p1: 0, p2: 0 }, seen = { p1: -1, p2: -1 }, t0 = performance.now();
  while (ui.trial.active && performance.now() - t0 < max){
    w.advance(16);
    for (const id of Object.keys(phones)){
      const ball = phones[id].trial?.ball ?? -1;
      if (!hot(E, id) || seen[id] === ball) continue;
      seen[id] = ball; n[id]++;
      const want = ballWant(E, id), side = ui.trial.S?.side, s = hit(id, n[id], want, side);
      sides.push(side);
      if (s){ phones[id]._onSwing(s); log.push({ id, want, side, at: +((performance.now() - t0)/1000).toFixed(2) }); }
    }
  }
  return { log, sides, seconds: (performance.now() - t0)/1000 };
}
// secondo telefono (Player 2 dello stesso schermo) che risponde come la pagina vera
export function secondPhone(E, NatpfPhoneRacket){
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = { connected: true, ready: false, L: { state: 'connected', phone: 'cal' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); if (c === 'skip' || c === 'confirm'){ this.ready = true; this.L.phone = 'ready'; } if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){} };
  phoneLike(P2, l2);
  return { P2, l2 };
}
