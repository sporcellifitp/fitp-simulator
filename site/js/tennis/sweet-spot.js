// Valutazione puramente visiva dello sweet spot. Non cambia la fisica né decide se il colpo è valido.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const SWEET_SPOT = Object.freeze({
  idealDistanceMax: 1.55,     // metri giocatore-palla: colpo non completamente in allungo
  idealDistanceMin: .3,
  normalHeightMin: .65,
  normalHeightMax: 1.65,
  overheadHeightMin: 2.05,
  overheadHeightMax: 2.8,
  heightTolerance: .42,        // tolleranza per la previsione e la latenza visiva
  readyWindow: .24,            // secondi prima/dopo dell'istante previsto
  perfectWindow: .06,           // coerente con ARC.PERFECT nel motore arcade
});

export function evaluateSweetSpot({ ball, player, impact, timeToImpact } = {}){
  if (!ball || !player || !impact ||
      ![ball.x, ball.y, ball.z, player.x, player.z, impact.y, timeToImpact].every(Number.isFinite)){
    return { visible: false, inReach: false, heightOk: false, ready: false, perfect: false, distance: Infinity, heightDelta: Infinity };
  }

  const distance = Math.hypot(ball.x - player.x, ball.z - player.z);
  const heightMin = impact.y >= SWEET_SPOT.overheadHeightMin ? SWEET_SPOT.overheadHeightMin : SWEET_SPOT.normalHeightMin;
  const heightMax = impact.y >= SWEET_SPOT.overheadHeightMin ? SWEET_SPOT.overheadHeightMax : SWEET_SPOT.normalHeightMax;
  const idealHeight = clamp(impact.y, heightMin, heightMax);
  const heightDelta = Math.abs(ball.y - idealHeight);
  const inReach = distance >= SWEET_SPOT.idealDistanceMin && distance <= SWEET_SPOT.idealDistanceMax;
  const heightOk = heightDelta <= SWEET_SPOT.heightTolerance;
  const timing = Math.abs(timeToImpact);
  const ready = inReach && heightOk && timing <= SWEET_SPOT.readyWindow;
  const perfect = inReach && heightOk && timing <= SWEET_SPOT.perfectWindow;

  return { visible: true, inReach, heightOk, ready, perfect, distance, idealHeight, heightDelta, timeToImpact };
}
