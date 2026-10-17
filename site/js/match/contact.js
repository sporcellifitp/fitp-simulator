// Shared geometry, independent of the rendered body's orientation.
export const CONTACT = Object.freeze({ forward: 1, side: .7, reach: 2, idealReach: 2.15,
  minHeight: .1, maxHeight: 3.1, early: .36, late: .26, perfect: .075, good: .16, ready: .36,
  front: 2.1, back: -.8, buffer: .12 });
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
  const off = { visible: false, inReach: false, heightOk: false, ready: false, accepted: false, perfect: false, distance: Infinity, timeToImpact: Infinity };
  if (!ball || !player || ![ball.x, ball.y, ball.z, player.x, player.z].every(Number.isFinite)) return off;
  const r = relativeContact(player, ball), { fz } = contactAxes(player);
  const distance = Math.hypot(r.s, r.l);
  const closing = velocity && Number.isFinite(velocity.z) ? -(velocity.z - (player.vz || 0))*fz : null;
  const eta = closing == null ? timeToImpact : closing > .5 ? (r.s - CONTACT.forward)/closing : Infinity;
  // The racket sweeps a reachable volume, not an infinitesimal floor marker.
  // A contact in this volume is valid immediately, even before the ideal plane.
  const inReach = distance <= CONTACT.idealReach && Math.abs(r.l) <= CONTACT.reach && r.s >= CONTACT.back && r.s <= CONTACT.front;
  const heightOk = ball.y >= CONTACT.minHeight && ball.y <= CONTACT.maxHeight;
  const ready = eligible && inReach && heightOk && eta >= -CONTACT.late && eta <= CONTACT.early;
  return { visible: eligible && Number.isFinite(eta), inReach, heightOk, ready,
    accepted: ready, perfect: ready && Math.abs(eta) <= CONTACT.perfect,
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

// Fascia condivisa da scelta del colpo e indicatore a terra.
export const isSmashContact = ball => Number.isFinite(ball?.y) && ball.y >= 2.05 && ball.y <= CONTACT.maxHeight;
