// Webcam «argon» (predefinita, motion_controls.js _argonFrame): continuità della mano e recupero automatico.
// Diagnostica 20261029-101056 (Lenovo E14, «Integrated Camera», 640×480 a 30 Hz, seduto a circa 1 m): nei colpi veloci
// il modello delle mani perde la mano per 100–170 ms (mosso) e la ritrova dall'altra parte: il colpo avviene tutto dentro
// il buco. Prima al primo fotogramma senza mano partiva il flusso ottico, la scia della mano si azzerava e 16 eventi su 18
// venivano dal flusso, con velocità e direzione al limite (quasi tutti «smash», lato a volte sbagliato, un dritto preso
// per lancio). Ora:
//  - buco breve a metà immagine: la scia della mano resta in attesa (bridgeMs) e, quando la mano torna, lo spostamento
//    attraverso il buco conta come la scia vera (direzione e velocità della mano);
//  - mano uscita dal bordo dell'immagine (braccio alzato nel servizio, colpo largo): flusso ottico subito, come prima;
//  - il flusso ottico riparte sempre da un'immagine nuova (prima confrontava con l'ultima vista anche secondi prima);
//  - con due mani nell'immagine si segue quella più vicina all'ultima vista (prima la prima della lista: un salto da una
//    mano all'altra era una «scia» velocissima);
//  - modello delle mani fermo (nessuna risposta da stallMs): si sblocca, e dopo stallReload blocchi si ricarica;
//  - camera che si ferma o si chiude (driver, risparmio energetico, un altro programma): si riapre da sola.
export const ARGON_TRACK = Object.freeze({
  bridgeMs: 260,      // attesa massima della mano persa a metà immagine prima del flusso ottico
  edge: .07,          // mano persa entro questa distanza dal bordo: uscita dall'immagine, flusso ottico subito
  pickMs: 500,        // mano vista da meno di così: si segue quella più vicina
  stallMs: 1200,      // inferenza senza risposta da così: modello sbloccato
  stallReload: 3,     // blocchi di fila prima di ricaricare il modello
  frameStallMs: 2500, // camera senza fotogrammi nuovi da così: si riapre
  reopenEveryMs: 5000 // al massimo una riapertura ogni così
});

const finite = Number.isFinite;

// centro della mano nell'immagine specchiata, come nello zip (polso e nocca del medio)
export function argonHandPoint(lm){
  const b = lm && lm[0], w = lm && lm[9];
  if (!b || !w || !finite(b.x) || !finite(b.y) || !finite(w.x) || !finite(w.y)) return null;
  return { x: 1 - (b.x*.45 + w.x*.55), y: b.y*.45 + w.y*.55 };
}

// indice della mano da seguire: con una mano vista da poco la più vicina a quella, altrimenti la prima (come lo zip)
export function argonPickHand(list, last, now){
  if (!Array.isArray(list) || !list.length) return -1;
  if (list.length === 1 || !last || !finite(last.t) || now - last.t > ARGON_TRACK.pickMs) return 0;
  let best = 0, bestD = Infinity;
  list.forEach((lm, i) => {
    const p = argonHandPoint(lm);
    const d = p ? Math.hypot(p.x - last.x, p.y - last.y) : Infinity;
    if (d < bestD){ bestD = d; best = i; }
  });
  return best;
}

// mano persa vicino al bordo: è uscita dall'immagine (non torna a breve)
export const argonNearEdge = p => !!p && (p.x < ARGON_TRACK.edge || p.x > 1 - ARGON_TRACK.edge || p.y < ARGON_TRACK.edge || p.y > 1 - ARGON_TRACK.edge);

// mano persa da poco a metà immagine: si aspetta che torni (niente flusso ottico)
export function argonBridging(last, now){
  return !!last && finite(last.t) && now - last.t > 0 && now - last.t <= ARGON_TRACK.bridgeMs && !argonNearEdge(last);
}

// mano ritrovata: punto da cui riparte la scia (l'ultimo prima del buco) se il buco è stato breve e nel frattempo non è
// partito un colpo; altrimenti null (scia nuova, come prima)
export function argonBridgeStart(last, now, lastTriggerMs){
  if (!last || !finite(last.t) || now - last.t > ARGON_TRACK.bridgeMs + 40) return null;
  if (finite(lastTriggerMs) && lastTriggerMs >= last.t) return null;
  return { x: last.x, y: last.y, t: last.t };
}
