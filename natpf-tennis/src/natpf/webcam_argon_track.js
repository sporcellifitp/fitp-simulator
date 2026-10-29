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
//  - una sola mano seguita (prima la prima della lista: un salto da una mano all'altra, o a un'altra persona, era una
//    «scia» velocissima, cioè un colpo; nello spezzone a 2–3 m della 145416, con tre persone in vista, un colpo finto
//    ogni 0,4 s): al primo aggancio la più grande (chi gioca sta davanti alla camera), poi solo una mano compatibile per
//    velocità possibile e grandezza (argonSameHand); le altre sono come non viste. Persa da pickMs si riaggancia;
//  - modello delle mani fermo (nessuna risposta da stallMs): si sblocca, e dopo stallReload blocchi si ricarica;
//  - camera che si ferma o si chiude (driver, risparmio energetico, un altro programma): si riapre da sola;
//  - a distanza la mano è più piccola e il colpo percorre meno immagine: le soglie dello zip (tarate a circa 1 m) si
//    applicano al movimento ingrandito in proporzione (argonScale), così il colpo conta anche a 2–3 m.
export const ARGON_TRACK = Object.freeze({
  bridgeMs: 260,      // attesa massima della mano persa a metà immagine prima del flusso ottico
  edge: .07,          // mano persa entro questa distanza dal bordo: uscita dall'immagine, flusso ottico subito
  pickMs: 500,        // mano vista da meno di così: si segue solo una mano compatibile con quella
  maxSpeed: 6,        // velocità massima della mano (larghezze dell'immagine al secondo, a distanza come a 1 m)
  sizeRatio: 1.7,     // rapporto massimo di grandezza tra la mano seguita e quella nuova
  stallMs: 2000,      // inferenza senza risposta da così: modello sbloccato (la prima dopo il caricamento può durare 1–4 s)
  stallReload: 2,     // blocchi di fila prima di ricaricare il modello
  frameStallMs: 2500, // camera senza fotogrammi nuovi da così: si riapre
  reopenEveryMs: 5000, // al massimo una riapertura ogni così
  handRef: .07,       // mano (polso → nocca del medio, in larghezze dell'immagine) a circa 1 m, dove lo zip è tarato
  scaleMax: 2.5       // ingrandimento massimo dei movimenti di una mano lontana
});

const finite = Number.isFinite;

// centro della mano nell'immagine specchiata, come nello zip (polso e nocca del medio)
export function argonHandPoint(lm){
  const b = lm && lm[0], w = lm && lm[9];
  if (!b || !w || !finite(b.x) || !finite(b.y) || !finite(w.x) || !finite(w.y)) return null;
  return { x: 1 - (b.x*.45 + w.x*.55), y: b.y*.45 + w.y*.55 };
}

// indice della mano da seguire: con una mano vista da poco la più vicina a quella, altrimenti la più grande (chi gioca
// sta davanti alla camera; lo zip prendeva la prima della lista)
export function argonPickHand(list, last, now, aspect = .75){
  if (!Array.isArray(list) || !list.length) return -1;
  if (list.length === 1) return 0;
  const recent = last && finite(last.t) && now - last.t <= ARGON_TRACK.pickMs;
  let best = 0, bestV = Infinity;
  list.forEach((lm, i) => {
    const p = argonHandPoint(lm), z = argonHandSize(lm, aspect);
    const v = recent ? (p ? Math.hypot(p.x - last.x, p.y - last.y) : Infinity) : -(z || 0);
    if (v < bestV){ bestV = v; best = i; }
  });
  return best;
}

// la mano trovata è quella seguita? Con una vista da poco: spostamento possibile nel tempo passato (in proporzione alla
// grandezza, come argonScale) e grandezza simile; altrimenti sì (si riaggancia)
export function argonSameHand(p, size, last, now){
  if (!p || !last || !finite(last.t) || now - last.t > ARGON_TRACK.pickMs) return true;
  const dt = Math.max(1/30, (now - last.t)/1000), k = argonScale(finite(last.size) ? last.size : size);
  if (k*Math.hypot(p.x - last.x, p.y - last.y)/dt > ARGON_TRACK.maxSpeed) return false;
  if (finite(size) && finite(last.size) && size > 0 && last.size > 0 && Math.max(size/last.size, last.size/size) > ARGON_TRACK.sizeRatio) return false;
  return true;
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

// grandezza della mano nell'immagine (polso → nocca del medio, con le proporzioni della camera)
export function argonHandSize(lm, aspect = .75){
  const b = lm && lm[0], w = lm && lm[9];
  if (!b || !w || !finite(b.x) || !finite(w.x)) return null;
  const s = Math.hypot(w.x - b.x, (w.y - b.y)*aspect);
  return s > 1e-4 ? s : null;
}

// ingrandimento dei movimenti di una mano lontana: 1 fino a handRef, poi in proporzione (al massimo scaleMax). Una mano
// più vicina non riduce niente: vicino resta tutto come nello zip
export function argonScale(size){
  return finite(size) && size > 0 ? Math.min(ARGON_TRACK.scaleMax, Math.max(1, ARGON_TRACK.handRef/size)) : 1;
}
