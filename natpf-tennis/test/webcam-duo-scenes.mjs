// Scene della webcam per due (src/natpf/webcam_duo.js) con due giocatori che si muovono: si avvicinano fino a
// sovrapporsi, uno passa oltre il centro e perde la mano, una sola mano in vista, mani che si incrociano veloci, il
// modello che dà le mani in ordine qualsiasi. Ogni scena prende la classe DuoTracker (quella attuale o una di prima,
// per il confronto) e dà gli eventi e dove sono finite le corsie. Usate da test/natpf-webcam-duo.test.mjs.
import { mulberry32, gauss } from './webcam-sim.mjs';

export const DT = 1000/30;
// mano con centro in (S, y) nell'immagine specchiata e grandezza size (landmark nell'immagine non specchiata)
export const handLm = (S, y, size = .045) => { const d = size/.75, a = Array.from({ length: 21 }, () => ({ x: 1 - S, y, z: 0 })); a[0] = { x: 1 - S, y: y - .55*d, z: 0 }; a[9] = { x: 1 - S, y: y + .45*d, z: 0 }; return a; };
const mj = t => (t <= 0 ? 0 : t >= 1 ? 1 : 10*t**3 - 15*t**4 + 6*t**5);

// motore delle scene: frame(t, rng) → [{ who, S, y, size?, free? }] (who e free solo per sapere di chi è la mano e se è
// la mano libera, il tracker non lo vede); rumore dei punti, ordine delle mani a caso (come il modello). swaps:
// fotogrammi in cui una corsia segue una mano dell'altro giocatore; onFree: fotogrammi in cui segue la mano libera del
// suo giocatore mentre la racchetta è in vista. fps: risultati del modello al secondo; aspect: proporzioni della camera
// (altezza/larghezza, 0,5625 = 16:9); size: grandezza della mano misurata dal tracker (argonHandSize) se la scena non
// la dà (con aspect 0,75 e size 0,045 come prima)
export function play(Tracker, { total, frame, seed = 1, jitter = .002, fps = 30, aspect = .75, size = .045 }){
  const tr = new Tracker(), rng = mulberry32(seed), out = [], owner = [], dt = 1000/fps;
  let t = 1000;
  for (let k = 0; t - 1000 < total*1000; k++){
    t += dt;
    const hands = frame((t - 1000)/1000, rng).map(h => ({ ...h, S: h.S + gauss(rng)*jitter, y: h.y + gauss(rng)*jitter }));
    if (rng() < .5) hands.reverse();
    for (const e of tr.hands(hands.map(h => handLm(h.S, h.y, (h.size ?? size)*.75/aspect)), t, aspect)) out.push({ ...e, t: (t - 1000)/1000 });
    // di chi è la mano che ogni corsia segue (la più vicina tra quelle date)
    for (const id of ['p1', 'p2']){
      const L = tr.lanes[id];
      if (!L.handNow) continue;
      const h = hands.reduce((b, x) => (!b || Math.hypot(x.S - L.hand.x, x.y - L.hand.y) < Math.hypot(b.S - L.hand.x, b.y - L.hand.y) ? x : b), null);
      if (h) owner.push({ lane: id, who: h.who, free: !!h.free, racketSeen: hands.some(x => x.who === id && !x.free), t: (t - 1000)/1000 });
    }
  }
  return { events: out, owner, tr, swaps: owner.filter(o => o.lane !== o.who).length, onFree: owner.filter(o => o.lane === o.who && o.free && o.racketSeen).length, now: t };
}
// mano libera (più piccola, più in basso, ferma o che segue piano il corpo)
const free = (who, S, y = .62) => ({ who, S, y, size: .042, free: true });
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

  // Con le mani libere di entrambi (il modello ne cerca quattro, DUO_HANDS; revisione del 31/10: con una sola mano per
  // giocatore le scene non vedevano gli scambi di mani).
  // avvicinamento con le mani libere all'esterno
  avvicinamentoMani: (Tracker, o = {}) => play(Tracker, { ...o, total: 6, frame: t => {
    const k = mj(t/2) - mj((t - 4)/2), S1 = .3 + .17*k, S2 = .7 - .17*k;
    return [{ who: 'p1', S: S1, y: .55 }, { who: 'p2', S: S2, y: .56 }, free('p1', S1 - .09), free('p2', S2 + .09)];
  } }),
  // attraversamento con la mano libera del P1 sempre in vista (anche quando il modello perde la racchetta) e quella del
  // P2 verso il centro
  attraversamentoMani: (Tracker, o = {}) => play(Tracker, { ...o, total: 5.5, frame: t => {
    const S1 = .35 + .27*mj((t - .5)/1.5), out = [{ who: 'p2', S: .86, y: .55 }, free('p2', .78), free('p1', S1 - .08)];
    if (!(t >= 2.5 && t < 3.3)) out.push({ who: 'p1', S: t >= 4 ? swingAt(t, 4, S1, .1) : S1, y: .56 });
    return out;
  } }),
  // incrocio con le mani libere ferme all'esterno
  incrocioMani: (Tracker, o = {}) => play(Tracker, { ...o, total: 4, frame: t => [
    { who: 'p1', S: t < 2.5 ? swingAt(t, 1.5, .42, .16, .25) : swingAt(t, 2.5, .58, -.16, 1), y: .55 },
    { who: 'p2', S: t < 2.5 ? swingAt(t, 1.5, .58, -.16, .25) : swingAt(t, 2.5, .42, .16, 1), y: .57 },
    free('p1', .3), free('p2', .7),
  ] }),
  // caso A della revisione: il P1 ha la racchetta a 0,30 e la mano libera a 0,38; il P2 (0,68) perde la mano per 0,2 s,
  // poi fa un dritto (verso sinistra). Prima la corsia del P2 saltava sulla mano libera del P1 e ci restava
  manoLiberaBuco: (Tracker, o = {}) => play(Tracker, { ...o, total: 3.5, frame: t => {
    const out = [{ who: 'p1', S: .30, y: .55 }, free('p1', .38)];
    if (!(t >= 1 && t < 1.2)) out.push({ who: 'p2', S: t >= 2.2 ? swingAt(t, 2.2, .68, -.12) : .68, y: .55 });
    return out;
  } }),
  // caso B: il P2 fa un dritto da 0,70 a 0,55 e il modello lo perde per 170 ms a metà colpo; la mano libera del P1 è a
  // 0,40. Prima la corsia del P2 saltava sulla mano libera del P1
  bucoNelDritto: (Tracker, o = {}) => play(Tracker, { ...o, total: 3, frame: t => {
    const out = [{ who: 'p1', S: .30, y: .55 }, free('p1', .40)];
    if (!(t >= 1.08 && t < 1.25)) out.push({ who: 'p2', S: swingAt(t, 1, .70, -.15, .3), y: .55 });
    return out;
  } }),
  // caso C: rovescio a due mani del P1 (racchetta e mano libera a 0,06) che attraversa da 0,40 a 0,64, poi un dritto di
  // ritorno; il P2 in vista a 0,75 fino a p2Until (0: mai). Prima il P1 finiva sulla mano libera e il P2 sulla racchetta
  // del P1: al dritto due colpi, del P1 e del P2
  rovescioADueMani: (Tracker, o = {}) => play(Tracker, { ...o, total: 5.3, frame: t => {
    const x = .40 + .24*mj((t - 2)/.5) - .24*mj((t - 3.6)/.3);
    const out = t < 1 ? [{ who: 'p1', S: .40, y: .55 }] : [{ who: 'p1', S: x, y: .55 }, free('p1', x - .06, .58)];
    if (t < (o.p2Until ?? 0)) out.push({ who: 'p2', S: .75, y: .55 });
    return out;
  } }),

  // Revisione indipendente del 31/10 (dopo 5c50891), con mani piccole (2–3 m, camera 16:9: o.size 0,026, o.aspect
  // 0,5625) e il modello a 10–30 risultati al secondo (o.fps).
  // Dritto veloce del P2 (da 0,72 verso il centro di o.dS in o.T secondi, poi ritorno lento) con la mano del P1 a 0,30
  // sempre in vista (o.p1) o solo nel primo secondo. Prima il limite di salto della corsia agganciata, misurato
  // dall'ultima vista e non dalla posizione prevista, valeva anche tra due risultati consecutivi: a 10–15 Hz la corsia
  // del P2 perdeva la mano a metà colpo e il P1 la prendeva (colpi del P1 non suoi)
  dirittoVeloce: (Tracker, o = {}) => play(Tracker, { ...o, total: 4, frame: t => {
    const out = [{ who: 'p2', S: .72 - (o.dS ?? .25)*mj((t - 2)/(o.T ?? .3)) + (o.dS ?? .25)*mj((t - 2.6)/.6), y: .55 }];
    if (o.p1 || t < 1) out.push({ who: 'p1', S: .30, y: .55 });
    return out;
  } }),
  // caso B con la mano piccola e il dritto di o.dS (0,15–0,3) da 0,70; buco di 170 ms a metà colpo, mano libera del P1
  // a 0,40 (più in basso)
  bucoNelDrittoPiccola: (Tracker, o = {}) => play(Tracker, { ...o, total: 3, frame: t => {
    const z = o.size ?? .045, out = [{ who: 'p1', S: .30, y: .55 }, { who: 'p1', S: .40, y: .62, size: .93*z, free: true }];
    if (!(t >= 1.08 && t < 1.25)) out.push({ who: 'p2', S: swingAt(t, 1, .70, -(o.dS ?? .15), .3), y: .55 });
    return out;
  } }),
  // Due mani dello stesso giocatore vicine (posizione di attesa, poi rovescio a due mani e dritto di ritorno): mano
  // libera a o.gap grandezze della mano (0,6–1,0) dalla racchetta, persa dal modello in una frazione o.drop dei
  // risultati (0,1–0,4); il P2 a 0,78 in vista (o.p2) o no. Prima l'etichetta «non del P1» della mano libera passava
  // alla racchetta quando la mano libera mancava per un risultato e ci restava: il P1 non la riprendeva più e seguiva
  // la mano libera (o la prendeva il P2)
  dueManiVicine: (Tracker, o = {}) => play(Tracker, { ...o, total: 5, frame: (t, rng) => {
    const z = o.size ?? .045, x = .35 + .2*mj((t - 2)/.4) - .2*mj((t - 3.5)/.4), out = [{ who: 'p1', S: x, y: .55 }];
    if (t > 1 && rng() >= (o.drop ?? .2)) out.push({ who: 'p1', S: x - (o.gap ?? .8)*z, y: .57, size: .93*z, free: true });
    if (o.p2) out.push({ who: 'p2', S: .78, y: .55 });
    return out;
  } }),
};
