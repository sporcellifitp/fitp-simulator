// Shared geometry, independent of the rendered body's orientation.
export const CONTACT = Object.freeze({ forward: 1, side: .7, reach: 2, idealReach: 1.55,
  minHeight: .1, maxHeight: 3.1, early: .28, late: .22, perfect: .06, good: .12, ready: .24 });
export const contactAxes = p => ({ fz: p.team === 1 ? 1 : -1, rx: p.team === 1 ? -1 : 1 });
export function relativeContact(player, ball){
  const { fz, rx } = contactAxes(player);
  return { s: (ball.z - player.z)*fz, l: (ball.x - player.x)*rx, h: ball.y };
}
export function contactPoint(player, side = 'fh'){
  const { fz, rx } = contactAxes(player);
  return { x: player.x + rx*CONTACT.side*(side === 'bh' ? -1 : 1), z: player.z + fz*CONTACT.forward };
}
export function contactLabel(error){
  return Math.abs(error) <= CONTACT.perfect ? 'perfetto' : Math.abs(error) <= CONTACT.good ? 'buono' : error < 0 ? 'anticipo' : 'ritardo';
}
// Positions and velocities must refer to the same instant. Movement forecasts
// are not timing authorities. Without velocity, old snapshots use their ETA.
export function evaluateContact({ ball, player, velocity, timeToImpact, eligible = true } = {}){
  const off = { visible: false, inReach: false, heightOk: false, ready: false, perfect: false, distance: Infinity, timeToImpact: Infinity };
  if (!ball || !player || ![ball.x, ball.y, ball.z, player.x, player.z].every(Number.isFinite)) return off;
  const r = relativeContact(player, ball), { fz } = contactAxes(player);
  const distance = Math.hypot(r.s, r.l);
  const closing = velocity && Number.isFinite(velocity.z) ? -(velocity.z - (player.vz || 0))*fz : null;
  const eta = closing == null ? timeToImpact : closing > .5 ? (r.s - CONTACT.forward)/closing : Infinity;
  const inReach = distance <= CONTACT.idealReach && Math.abs(r.l) <= CONTACT.reach && r.s >= -.2;
  const heightOk = (ball.y >= .65 && ball.y <= 1.65) || (ball.y >= 2.05 && ball.y <= 2.8);
  const ready = eligible && inReach && heightOk && Math.abs(eta) <= CONTACT.ready;
  return { visible: eligible && Number.isFinite(eta), inReach, heightOk, ready,
    perfect: ready && Math.abs(eta) <= CONTACT.perfect,
    distance, timeToImpact: eta, error: -eta, forward: r.s, lateral: r.l,
    side: r.l >= 0 ? 'fh' : 'bh', point: contactPoint(player, r.l >= 0 ? 'fh' : 'bh') };
}
// Both endpoints contain the player position: running must not shift history.
export function crossingTime(previous, current, playerId){
  const p = current.players[playerId], prev = previous?.players[playerId];
  if (!p) return current.t;
  const s = relativeContact(p, current.p).s;
  const s0 = prev ? relativeContact(prev, previous.p).s : s;
  return prev && s0 > CONTACT.forward && s <= CONTACT.forward
    ? previous.t + (s0 - CONTACT.forward)/(s0 - s)*(current.t - previous.t)
    : current.t;
}
