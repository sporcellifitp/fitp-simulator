// Avversario controllato dal computer: sceglie direzione, profondità e tipo di colpo e sbaglia
// secondo il livello di difficoltà.
export const LEVELS = {
  facile: { label: 'Facile', speed: 4.8, sigma: 0.75, power: 0.25, miss: 0.1, react: 0.32, serveSpeed: 0.2, aggress: 0.2 },
  normale: { label: 'Normale', speed: 5.6, sigma: 0.48, power: 0.45, miss: 0.045, react: 0.22, serveSpeed: 0.45, aggress: 0.45 },
  difficile: { label: 'Difficile', speed: 6.4, sigma: 0.3, power: 0.7, miss: 0.018, react: 0.14, serveSpeed: 0.75, aggress: 0.7 },
};

// opp: posizione dell'avversario vista da chi colpisce (lateral: -1..1 dalla sua destra)
export function cpuShot(level, rng, { oppLateral = 0, oppDepth = 12, contactHeight = 1, isVolley = false, isSmash = false, serve = false, second = false }) {
  const L = LEVELS[level] || LEVELS.normale;
  if (serve) {
    const lateral = rng() < 0.5 ? -0.8 + rng() * 0.5 : 0.3 + rng() * 0.5;
    const power = second ? 0.1 : Math.min(1, L.serveSpeed + (rng() - 0.5) * 0.3);
    return { kind: 'serve', spinKind: 'flat', lateral, depth: 5.4 + rng() * 0.6, power, sigma: second ? 0.15 : L.sigma * 0.55 };
  }
  if (isSmash) return { kind: 'smash', spinKind: 'flat', lateral: -Math.sign(oppLateral || 1) * (0.6 + rng() * 0.4), depth: 7 + rng() * 3, power: 0.8 + rng() * 0.2, sigma: L.sigma * 0.8 };
  // lontano dall'avversario, con un po' di varietà
  const away = -Math.sign(oppLateral || (rng() - 0.5));
  let lateral = away * (0.35 + rng() * 0.6);
  if (rng() < 0.25) lateral = (rng() - 0.5) * 0.6;
  let spinKind = 'topspin', depth = 7.5 + rng() * 3, power = Math.min(1, L.power + (rng() - 0.4) * 0.35);
  const r = rng();
  if (isVolley) { depth = 6 + rng() * 4; power = 0.5 + rng() * 0.3; if (oppDepth > 12 && r < 0.3) { spinKind = 'drop'; depth = 1.8 + rng(); } }
  else if (oppDepth < 7 && r < 0.45) { spinKind = 'lob'; depth = 9.5 + rng() * 1.2; power = 0.2; } // avversario a rete: pallonetto
  else if (oppDepth > 13 && r < 0.14 * (0.5 + L.aggress)) { spinKind = 'drop'; depth = 2 + rng() * 1.2; power = 0; } // avversario lontano: palla corta
  else if (contactHeight < 0.6 && r < 0.55) { spinKind = 'slice'; depth = 7 + rng() * 2.5; power = 0.35; } // palla bassa: tagliato
  else if (r > 1 - 0.18 * L.aggress && contactHeight > 0.8) { spinKind = 'flat'; depth = 8 + rng() * 2.2; power = 0.75 + rng() * 0.25; } // palla comoda: piatto
  else if (r < 0.12) { spinKind = 'slice'; depth = 7.5 + rng() * 2.5; power = 0.4; }
  return { kind: isVolley ? 'volley' : 'drive', spinKind, lateral, depth, power, sigma: L.sigma };
}
