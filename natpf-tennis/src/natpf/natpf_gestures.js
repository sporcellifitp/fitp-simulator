// Mappatura gesto del telefono → colpo, in un solo posto e senza DOM (verificabile con i test).
//
// Segnali che arrivano dal telefono (presa verticale, l'unica in gioco):
//   H  verso orizzontale del gesto rispetto all'asse imparato in calibrazione (giroscopio): +1 da destra a sinistra,
//      −1 da sinistra a destra, 0 nessuno (gesto verticale o senza calibrazione)
//   V  gesto verticale riconosciuto sul telefono: 'up' / 'down' (asse di rotazione orizzontale E mano che sale/scende)
//   L  verso verticale della mano durante la spinta (accelerazione lineare lungo la gravità), rispetto al proprio
//      dritto della calibrazione: > 0 sale, < 0 scende
//   F  piatto all'impatto (filtro d'orientamento del telefono): imbardata → mira (−1 sinistra … +1 destra) e
//      apertura (gradi, > 0 aperto verso l'alto), tutti e due rispetto al proprio colpo abituale
//   P  forza: metà rispetto alla propria calibrazione, metà dalla velocità vera del telefono
// Contesto del gioco: mano (destra/mancina) e palla alta sopra la testa.
//
// Tabella (la prima riga che vale decide; nessun colpo speciale nasce da un solo segnale):
//   gesto verticale verso l'alto (V up)                              → lob, lato dalla palla
//   gesto verticale verso il basso (V down) con palla alta          → schiacciata
//   gesto verticale verso il basso (V down) con palla bassa         → tagliato (chop)
//   orizzontale, mano che sale molto (L ≥ 0,45), o sale (L ≥ 0,3) con piatto aperto (F ≥ 10°) → lob
//   orizzontale con palla alta e mano che scende (L ≤ −0,2)          → schiacciata
//   orizzontale, mano che scende (L ≤ −0,22), piatto aperto (F ≥ 8°) e gesto morbido (P < 0,45) → palla corta
//   orizzontale, mano che scende (L ≤ −0,22)                        → tagliato
//   orizzontale, mano che sale un poco (0,15 ≤ L < 0,45)             → topspin
//   orizzontale veloce (P ≥ 0,78) con piatto dritto (|F| < 10°)      → piatto (colpo potente)
//   orizzontale, il resto                                           → topspin
// Lato: H con la mano (dritto del destro = H +1, del mancino = H −1); senza H, la preparazione o la palla.
// Direzione: soprattutto il piatto all'impatto (girato a destra → palla a destra, uguale per dritto e rovescio, così
// il rovescio va anche lungolinea), poi un poco il tempo del colpo (motore, natpf_skill.swingLandingX).
export const GESTURE = Object.freeze({
  lobLift: .45, lobLiftOpen: .3, lobOpen: 10,
  cutLift: -.22, dropOpen: 8, dropPower: .45,
  smashLift: -.2, topLift: .15,
  flatPower: .78, flatFace: 10,
});
const finite = (v, d = 0) => (Number.isFinite(v) ? v : d);

export function classifyPhoneShot({ dir = 0, vert = null, lift = 0, liftBaseline = 0, facePitch = null, power = .6, ballHigh = false } = {}){
  const L = finite(lift) - finite(liftBaseline), open = Number.isFinite(facePitch) ? facePitch : null, G = GESTURE;
  const why = [];
  if (vert === 'up'){ why.push('verticale verso l’alto'); return { shot: 'lob', why }; }
  if (vert === 'down'){ why.push('verticale verso il basso', ballHigh ? 'palla alta' : 'palla bassa'); return { shot: ballHigh ? 'smash' : 'slice', why }; }
  if (L >= G.lobLift || (L >= G.lobLiftOpen && open != null && open >= G.lobOpen)){ why.push(`mano che sale (${L.toFixed(2)})`, ...(open != null ? [`piatto ${open.toFixed(0)}°`] : [])); return { shot: 'lob', why }; }
  if (ballHigh && L <= G.smashLift){ why.push('palla alta', `mano che scende (${L.toFixed(2)})`); return { shot: 'smash', why }; }
  if (L <= G.cutLift){
    if (open != null && open >= G.dropOpen && power < G.dropPower){ why.push(`taglio (${L.toFixed(2)})`, `piatto aperto ${open.toFixed(0)}°`, `morbido (${power.toFixed(2)})`); return { shot: 'drop', why }; }
    why.push(`taglio (${L.toFixed(2)})`); return { shot: 'slice', why };
  }
  if (L >= G.topLift){ why.push(`dal basso verso l’alto (${L.toFixed(2)})`); return { shot: 'topspin', why }; }
  if (power >= G.flatPower && (open == null || Math.abs(open) < G.flatFace)){ why.push(`veloce (${power.toFixed(2)})`, 'piatto dritto'); return { shot: 'flat', why }; }
  why.push('colpo normale'); return { shot: 'topspin', why };
}
// Tipo di colpo del motore base per ogni colpo NATPF (la palla corta è un tagliato con natpf.shot = 'drop')
export const ENGINE_SHOT = Object.freeze({ lob: 'lob', smash: 'smash', slice: 'slice', drop: 'slice', topspin: 'topspin', flat: 'flat' });
// Mira (−1 … +1) dal piatto all'impatto; senza il piatto, dalla rotazione del polso del gesto
export function aimFromSignals({ faceAim = null, twist = null, aim = null, dir = 0 } = {}){
  if (Number.isFinite(faceAim)) return { aim: Math.max(-1, Math.min(1, faceAim)), source: 'face' };
  if (Number.isFinite(twist)) return { aim: Math.max(-1, Math.min(1, twist*1.6)), source: 'twist' };
  if (Number.isFinite(aim)) return { aim: Math.max(-1, Math.min(1, aim + dir*.4)), source: 'gesture' };
  return { aim: 0, source: 'none' };
}
