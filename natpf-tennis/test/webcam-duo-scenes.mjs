// Scene della webcam per due (src/natpf/webcam_duo.js) con due giocatori che si muovono: si avvicinano fino a
// sovrapporsi, uno passa oltre il centro e perde la mano, una sola mano in vista, mani che si incrociano veloci, il
// modello che dà le mani in ordine qualsiasi. Ogni scena prende la classe DuoTracker (quella attuale o una di prima,
// per il confronto) e dà gli eventi e dove sono finite le corsie. Usate da test/natpf-webcam-duo.test.mjs.
import { mulberry32, gauss } from './webcam-sim.mjs';

export const DT = 1000/30;
// mano con centro in (S, y) nell'immagine specchiata e grandezza size (landmark nell'immagine non specchiata)
export const handLm = (S, y, size = .045) => { const d = size/.75, a = Array.from({ length: 21 }, () => ({ x: 1 - S, y, z: 0 })); a[0] = { x: 1 - S, y: y - .55*d, z: 0 }; a[9] = { x: 1 - S, y: y + .45*d, z: 0 }; return a; };
const mj = t => (t <= 0 ? 0 : t >= 1 ? 1 : 10*t**3 - 15*t**4 + 6*t**5);

// motore delle scene: frame(t) → [{ who, S, y }] (who solo per sapere di chi è la mano, il tracker non lo vede);
// rumore dei punti, ordine delle mani a caso (come il modello)
export function play(Tracker, { total, frame, seed = 1, jitter = .002 }){
  const tr = new Tracker(), rng = mulberry32(seed), out = [], owner = [];
  let t = 1000;
  for (let k = 0; t - 1000 < total*1000; k++){
    t += DT;
    const hands = frame((t - 1000)/1000).map(h => ({ ...h, S: h.S + gauss(rng)*jitter, y: h.y + gauss(rng)*jitter }));
    if (rng() < .5) hands.reverse();
    for (const e of tr.hands(hands.map(h => handLm(h.S, h.y, h.size)), t)) out.push({ ...e, t: (t - 1000)/1000 });
    // di chi è la mano che ogni corsia segue (la più vicina tra quelle date)
    for (const id of ['p1', 'p2']){
      const L = tr.lanes[id];
      if (!L.handNow) continue;
      const h = hands.reduce((b, x) => (!b || Math.abs(x.S - L.hand.x) < Math.abs(b.S - L.hand.x) ? x : b), null);
      if (h) owner.push({ lane: id, who: h.who, t: (t - 1000)/1000 });
    }
  }
  return { events: out, owner, tr, swaps: owner.filter(o => o.lane !== o.who).length, now: t };
}
// swing di una mano: da S0 di dS (con il segno) in T secondi a partire da t0, poi fermo
const swingAt = (t, t0, S0, dS, T = .2) => S0 + dS*mj((t - t0)/T);

export const SCENES = {
  // si avvicinano piano fino a 0,47 e 0,53 (le «finestre» si sovrappongono), restano lì, poi si riallontanano
  avvicinamento: (Tracker, o = {}) => play(Tracker, { ...o, total: 6, frame: t => {
    const k = mj(t/2) - mj((t - 4)/2);
    return [{ who: 'p1', S: .3 + .17*k, y: .55 }, { who: 'p2', S: .7 - .17*k, y: .56 }];
  } }),
  // il P1 passa oltre il centro (fino a 0,62), perde la mano per 0,8 s (oltre pickMs), la ritrova lì e fa un rovescio
  // (verso destra); il P2 resta a 0,86
  attraversamento: (Tracker, o = {}) => play(Tracker, { ...o, total: 5.5, frame: t => {
    const S1 = .35 + .27*mj((t - .5)/1.5), out = [{ who: 'p2', S: .86, y: .55 }];
    if (!(t >= 2.5 && t < 3.3)) out.push({ who: 'p1', S: t >= 4 ? swingAt(t, 4, S1, .1) : S1, y: .56 });
    return out;
  } }),
  // come sopra, ma il P2 non c'è (uscito dall'inquadratura): la mano del P1 oltre il centro non diventa del P2
  attraversamentoDaSolo: (Tracker, o = {}) => play(Tracker, { ...o, total: 5.5, frame: t => {
    const S1 = .35 + .27*mj((t - .5)/1.5);
    const out = t < 1 ? [{ who: 'p2', S: .86, y: .55 }] : [];
    if (!(t >= 2.5 && t < 3.3)) out.push({ who: 'p1', S: t >= 4 ? swingAt(t, 4, S1, .1) : S1, y: .56 });
    return out;
  } }),
  // tutti e due visti, poi spariscono (2 s); ricompare una sola mano vicino a dove il P2 l'aveva persa e fa un dritto
  // (verso sinistra): è del P2
  unaManoSola: (Tracker, o = {}) => play(Tracker, { ...o, total: 5, frame: t => {
    if (t < 1.5) return [{ who: 'p1', S: .42, y: .55 }, { who: 'p2', S: .6, y: .55 }];
    if (t < 2.4) return [];
    return [{ who: 'p2', S: t >= 3.5 ? swingAt(t, 3.5, .57, -.1) : .57, y: .55 }];
  } }),
  // il P2 sta vicino al centro (0,52); spariscono tutti e due e ricompare solo la mano del P2, appena a sinistra del
  // centro (0,47): è del P2 (prima andava al P1, perché era nella sua metà), e il suo rovescio è del P2
  unaManoSolaAlCentro: (Tracker, o = {}) => play(Tracker, { ...o, total: 5, frame: t => {
    if (t < 1.5) return [{ who: 'p1', S: .3, y: .55 }, { who: 'p2', S: .52, y: .55 }];
    if (t < 2.4) return [];
    return [{ who: 'p2', S: t >= 3.5 ? swingAt(t, 3.5, .47, .1) : .47, y: .55 }];
  } }),
  // mani vicine che si incrociano veloci (il P1 da 0,42 a 0,58 e il P2 da 0,58 a 0,42 nello stesso istante), poi tornano
  incrocio: (Tracker, o = {}) => play(Tracker, { ...o, total: 4, frame: t => [
    { who: 'p1', S: t < 2.5 ? swingAt(t, 1.5, .42, .16, .25) : swingAt(t, 2.5, .58, -.16, 1), y: .55 },
    { who: 'p2', S: t < 2.5 ? swingAt(t, 1.5, .58, -.16, .25) : swingAt(t, 2.5, .42, .16, 1), y: .57 },
  ] }),
};
