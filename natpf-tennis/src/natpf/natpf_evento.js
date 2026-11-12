// B18.2 · tappa 2, gruppo 3 · Livello «Evento»: la CPU si regola da sola su chi gioca (difetto 3 / D3 del rapporto B16,
// docs/b16/rapporto-gameplay.md; documento docs/b18/t2-4-evento-bambini.md).
//
// La regola, detta a parole (una sola, uguale per tutti):
//   • la bravura della CPU è un numero k tra 0 e 1: a 0 è la CPU facile (quella di «Ragazzo»), a 1 è la più brava del
//     livello (corre, legge e sbaglia poco: natpf_skill.EVENTO_CPU). In mezzo i valori sono una media tra i due;
//   • a ogni PUNTO VINTO da chi gioca k sale di un gradino piccolo (gain × (1 − target)); a ogni PUNTO PERSO scende di un
//     gradino più grande (gain × target). I due gradini stanno nel rapporto 35 a 65: così k non si muove più, in media,
//     quando chi gioca vince `target` punti su 100 (65), che è l'obiettivo del rapporto (adulto medio 60–70%);
//   • nei primi `fastPoints` punti di un giocatore i gradini sono doppi (`fast`): il gioco non sa ancora chi ha davanti;
//   • k cambia solo TRA UN PUNTO E L'ALTRO, mai durante lo scambio, e resta tra `min` e `max`: la CPU non scende mai
//     sotto quella facile e non regala punti. Non c'è nessun altro aiuto: nessun punto dato, nessun colpo sbagliato
//     apposta, le regole dei colpi di chi gioca sono sempre quelle di «Ragazzo»;
//   • una partita nuova dello stesso giocatore («Gioca ancora») riparte da dove k era arrivato; «Nuovo giocatore», il
//     chiosco che riparte, il ritorno al menu principale («Menu» a fine partita, «Torna al menu» dalla pausa), la scelta
//     di «Chi gioca» e l'avvio del gioco lo riportano a `start`.
// Non oscilla: i gradini sono piccoli (un punto sposta k di 0,035–0,065 su 1, il doppio nei primi sei punti) e più k si allontana dal punto giusto più i
// punti lo riportano indietro. Non «fa vincere apposta»: un punto perso abbassa la CPU, ma solo dal punto dopo, di poco
// e fino alla CPU facile, mai oltre.
// Senza DOM e senza motore: lo stato è uno solo perché la partita contro la CPU è una sola (nello stesso schermo e nella
// sfida tra due computer il livello è «1v1» e questo modulo non viene usato).

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const EVENTO = Object.freeze({
  start: .8,     // k alla partenza (taratura: scripts/audit/evento-bambini.mjs --curva)
  target: .65,   // quota di punti di chi gioca attorno a cui k si ferma
  gain: .1,      // punto vinto: k + gain × (1 − target) = +0,035; punto perso: k − gain × target = −0,065
  fast: 2,       // … nei primi `fastPoints` punti di un giocatore i gradini valgono `fast` volte (+0,07 e −0,13):
  fastPoints: 6, //   all'inizio il gioco non sa chi ha davanti, e la partita da 1 game dura 4–7 punti
  min: 0, max: 1,
});
// Solo per misure e prove (scripts/audit/evento-bambini.mjs): valori che sostituiscono quelli sopra; `fixed` blocca k a
// un valore (la regola non lo muove). Vuoto nel gioco
export const eventoTuning = {};
export const eventoConfig = () => ({ ...EVENTO, ...eventoTuning });

// pura: k dopo un punto. won: il punto è di chi gioca; played: punti già giocati da questo giocatore prima di questo
export function eventoStep(k, won, E = eventoConfig(), played = Infinity){
  const t = clamp(finite(E.target, EVENTO.target), .05, .95);
  const g = Math.max(0, finite(E.gain, EVENTO.gain))*(played < finite(E.fastPoints) ? Math.max(1, finite(E.fast, 1)) : 1);
  return clamp(finite(k, E.start) + (won ? g*(1 - t) : -g*t), finite(E.min, 0), finite(E.max, 1));
}

const fresh = () => ({ k: clamp(finite(eventoConfig().start, EVENTO.start), 0, 1), points: 0, won: 0, trail: [] });
let S = fresh();
// stato di adesso: { k, points, won, trail } (trail: k dopo ogni punto, gli ultimi 400: per le misure e la diagnostica)
export const eventoState = () => S;
// k in uso adesso (quello fissato dalle prove, se c'è)
export const eventoK = () => (eventoTuning.fixed != null ? clamp(finite(eventoTuning.fixed)) : S.k);
// si riparte dal valore di base: giocatore nuovo, chiosco, scelta di «Chi gioca», avvio del gioco
export function eventoReset(){ S = fresh(); return S; }
// un punto è finito (won: di chi gioca): k si muove di un gradino. Restituisce il k nuovo
export function eventoPoint(won){
  if (eventoTuning.fixed == null) S.k = eventoStep(S.k, !!won, eventoConfig(), S.points);
  S.points++; if (won) S.won++;
  S.trail.push(+eventoK().toFixed(3)); if (S.trail.length > 400) S.trail.shift();
  return eventoK();
}

// pura: media tra due gruppi di valori (numeri, o gruppi di numeri come cpuErr): a a t = 0, b a t = 1. Una voce che manca
// da una parte vale quella dell'altra (resta ferma); le voci non numeriche si prendono da a
export function blend(a = {}, b = {}, t = 0){
  const out = {}, u = clamp(finite(t));
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])){
    const x = a?.[key], y = b?.[key];
    if (x && typeof x === 'object' || y && typeof y === 'object') out[key] = Object.freeze(blend(x && typeof x === 'object' ? x : {}, y && typeof y === 'object' ? y : {}, u));
    else if (typeof x === 'number' && typeof y === 'number') out[key] = u <= 0 ? x : u >= 1 ? y : x + (y - x)*u;   // agli estremi i valori esatti
    else out[key] = x ?? y;
  }
  return out;
}
