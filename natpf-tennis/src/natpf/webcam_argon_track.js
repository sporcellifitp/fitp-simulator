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
//    applicano al movimento ingrandito in proporzione (argonScale), così il colpo conta anche a 2–3 m. Dal 30/10 (webcam
//    da 1 a 4 m, webcam_roi.js) fino a ×6 (prima ×2,5: oltre ~2,5 m uno swing di mezzo metro non bastava più) e con la
//    grandezza della mano in 3D (la z del modello): una mano girata verso la camera sembra corta nell'immagine e, con
//    l'ingrandimento più alto, renderebbe troppo sensibile chi gioca vicino.
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
  scaleMax: 6         // ingrandimento massimo dei movimenti di una mano lontana (6: mano di 0,012, a 4 m con una webcam da 90°)
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

// grandezza della mano nell'immagine (polso → nocca del medio, con le proporzioni della camera; con la profondità del
// modello, z nella scala di x, quando c'è: la mano girata verso la camera non sembra più piccola, cioè più lontana)
export function argonHandSize(lm, aspect = .75){
  const b = lm && lm[0], w = lm && lm[9];
  if (!b || !w || !finite(b.x) || !finite(w.x) || !finite(b.y) || !finite(w.y)) return null;
  const dz = finite(b.z) && finite(w.z) ? w.z - b.z : 0;
  const s = Math.hypot(w.x - b.x, (w.y - b.y)*aspect, dz);
  return s > 1e-4 ? s : null;
}

// Geometria dello zip: le soglie (argonTrailEvent) e handRef sono tarate su una camera 4:3 (640×480), in coordinate
// normalizzate alla larghezza e all'altezza dell'immagine. Con una camera più larga (16:9, 1280×720: lo stesso campo
// verticale e i lati in più) la stessa mano e lo stesso movimento orizzontale sono 0,75 volte più piccoli in larghezze
// dell'immagine, quello verticale no: senza riportarli a 4:3 l'ingrandimento della mano (argonScale) sale di 1,33 e la
// parte verticale del colpo pesa il 33% in più (più smash, lanci e pallonetti; revisione del 31/10). Fattore per le x e
// per le grandezze in larghezze dell'immagine: x4:3 = 0,5 + (x − 0,5)·argonAspectK(aspect), con aspect = altezza/larghezza.
// Il ritaglio (webcam_roi.js), il bordo (argonNearEdge) e la mano seguita restano sulle coordinate vere dell'immagine.
export const argonAspectK = aspect => (finite(aspect) && aspect > 0 ? .75/aspect : 1);

// ingrandimento dei movimenti di una mano lontana: 1 fino a handRef, poi in proporzione (al massimo scaleMax). Una mano
// più vicina non riduce niente: vicino resta tutto come nello zip. size in larghezze dell'immagine della camera con
// proporzioni aspect (altezza/larghezza): riportata a 4:3 prima del confronto con handRef
export function argonScale(size, aspect = .75){
  const s = finite(size) ? size*argonAspectK(aspect) : NaN;
  return s > 0 ? Math.min(ARGON_TRACK.scaleMax, Math.max(1, ARGON_TRACK.handRef/s)) : 1;
}

// Scia della mano (o del flusso ottico) → movimento e, se è un colpo, l'evento. Le regole sono quelle dello zip
// argon-tennis (soglie, lato dal verso, lancio, tipo di colpo, 320 ms tra due colpi); scale: ingrandimento della mano
// lontana (argonScale), solo per la mano. Funzione pura: la usano la webcam per uno (motion_controls._argonEvaluateHandTrail)
// e quella per due (webcam_duo.js), una scia per giocatore. aspect: proporzioni della camera (altezza/larghezza): gli
// spostamenti orizzontali sono riportati alla geometria 4:3 dello zip (argonAspectK; la y non cambia), per la mano e per il
// flusso ottico; scale va calcolata con lo stesso aspect (argonScale(size, aspect)).
// → null (scia troppo corta) | { motion: { vx, vy, mag }, event: null | { type: 'toss'|'swing', side, shotType, speed, dirX, dirY, last } }
export function argonTrailEvent(trail, { hand = true, scale = 1, now = 0, lastTrigger = 0, aspect = .75 } = {}){
  if (!trail || trail.length < 2) return null;
  const k = hand ? (finite(scale) && scale > 0 ? scale : 1) : 1, kx = argonAspectK(aspect), i = trail[0], a = trail[trail.length - 1], n = Math.max(.025, (a.t - i.t)/1e3);
  const h = (a.x - i.x)*kx*k, p = (a.y - i.y)*k, f = Math.hypot(h, p);
  if (!finite(f) || !finite(n)) return null;
  let s = 0;
  for (let m = 1; m < trail.length; m++) s += k*Math.hypot((trail[m].x - trail[m - 1].x)*kx, trail[m].y - trail[m - 1].y);
  const l = s > 1e-3 ? f/s : 0, r = hand ? .065 : .1, o = hand ? .62 : .7, y = hand ? .62 : .85, P = h/n, d = p/n;
  const vx = P*.65, vy = d*.65, mag = l >= o ? Math.hypot(vx, vy) : 0, motion = { vx, vy, mag };
  if (!(f >= r && l >= o && mag >= y && now - lastTrigger > 320)) return { motion, event: null };
  const speed = Math.min(1.65, Math.max(.85, .75 + mag*.45)), dirX = Math.max(-1, Math.min(1, vx*.85)), dirY = Math.max(-1, Math.min(1, vy*.85));
  const side = P > .15 ? 'backhand' : P < -.15 ? 'forehand' : null;
  if ((a.y < .35 && p < -.045 && d < -.45) || (d < -.85 && Math.abs(d) > Math.abs(P)*1.15))
    return { motion, event: { type: 'toss', side, shotType: 'lob', speed, dirX, dirY: -.9, last: a } };
  const shotType = (d > .85 && speed > 1.18) || speed >= 1.46 ? 'smash' : d > .32 ? 'slice' : d < -.58 ? 'lob' : 'topspin';
  return { motion, event: { type: 'swing', side, shotType, speed, dirX, dirY, last: a } };
}

// Flusso ottico dello zip su una fascia di colonne della griglia 8×6 (from…to, colonne incluse): il blocco 3×3 con più
// movimento, se abbastanza forte e raccolto. luma e prev: luminosità 0…1 dell'immagine piccola (w×h, già specchiata).
// → null | { x, y } centro del movimento (0…1). Con tutte le colonne è il flusso della webcam per uno.
export function argonFlowBlob(luma, prev, w, h, { from = 0, to = 7 } = {}){
  const s = 8, l = 6, r = w/s, o = h/l, y = new Float32Array(s*l), P = new Float32Array(s*l), d = new Float32Array(s*l);
  let f = 0;
  for (let c = 0; c < h; c++){
    const b = Math.min(l - 1, Math.floor(c/o));
    for (let x = 0; x < w; x++){
      const I = Math.min(s - 1, Math.floor(x/r));
      if (I < from || I > to) continue;
      const S = c*w + x, X = Math.abs(luma[S] - prev[S]), M = X > .11 ? X : 0;
      if (M > .13){ const k = b*s + I; f += M; y[k] += M; P[k] += (x/w)*M; d[k] += (c/h)*M; }
    }
  }
  let m = 0, g = 0, T = 0;
  for (let c = 0; c < l; c++) for (let b = from; b <= to; b++){
    let W = 0, Sx = 0, Sy = 0;
    for (let C = -1; C <= 1; C++){ const X = c + C; if (X < 0 || X >= l) continue;
      for (let M = -1; M <= 1; M++){ const v = b + M; if (v < from || v > to) continue; const I = X*s + v; W += y[I]; Sx += P[I]; Sy += d[I]; } }
    if (W > m){ m = W; g = Sx; T = Sy; }
  }
  const u = f > 1e-3 ? m/f : 0;
  return m > 3.2 && u >= .45 ? { x: g/m, y: T/m } : null;
}
