// Webcam per due (stesso schermo con una sola webcam, richiesta del 29/10 notte): due giocatori davanti alla stessa
// camera, il Player 1 a sinistra e il Player 2 a destra (nell'immagine specchiata, come si vedono sullo schermo; sono
// anche le loro metà dello schermo diviso). Ogni giocatore ha una sua «corsia» con la stessa webcam per uno
// (webcam_argon_track.js: scia dello zip argon-tennis, buco breve attraversato con la mano, movimenti in proporzione alla
// grandezza della mano, flusso ottico solo a mano uscita o non tornata).
// Corsie larghe e tolleranti (richiesta del 30/10: «le persone si muovono e le finestre si sovrappongono»; prima una
// corsia senza mano cercava solo nella sua metà fissa, e chi passava oltre il centro poteva finire all'altro):
//  - ogni giocatore ha una «casa» (dove sta: segue la sua mano lentamente) e il confine tra le corsie è a metà tra le
//    due case (tra 0,3 e 0,7 dell'immagine), non fisso a metà immagine;
//  - mano agganciata (vista da meno di pickMs): resta di quel giocatore ovunque vada, finché è compatibile per velocità e
//    grandezza (argonSameHand); tra due mani vicine o che si incrociano vince la più vicina a dove la mano stava andando
//    (posizione prevista con la velocità), così le mani dei due non si scambiano;
//  - mano persa da poco (meno di memoryMs): il giocatore ha diritto alla mano che ricompare vicino a dove l'aveva persa,
//    anche oltre il confine (zona condivisa larga shared), finché non è più vicina all'altro giocatore: con una sola
//    mano in vista va a chi l'aveva;
//  - mano mai vista o persa da tanto: la più grande dalla propria parte del confine (come prima, con la metà mobile);
//  - le due corsie non prendono mai la stessa mano: si sceglie l'assegnazione migliore delle due insieme (prima le
//    corsie agganciate, poi quelle che l'avevano da poco, poi le libere; a parità, le distanze più piccole);
//  - flusso ottico per parte (colonne della griglia 8×6 dello zip ai due lati del confine), dall'immagine prima;
//  - ogni colpo esce con il giocatore (who: 'p1' | 'p2').
// Funzioni pure, senza DOM né modello: motion_controls._duoFrame passa i risultati del modello e il flusso.
import { ARGON_TRACK, argonHandPoint, argonHandSize, argonScale, argonSameHand, argonBridging, argonBridgeStart, argonTrailEvent } from './webcam_argon_track.js';

export const DUO_PLAYERS = Object.freeze(['p1', 'p2']);
export const DUO = Object.freeze({
  mid: .5, seenMs: 1500,
  home: Object.freeze({ p1: .25, p2: .75 }),   // case di partenza (prima di vedere le mani)
  splitMin: .3, splitMax: .7,                  // il confine tra le corsie resta in questa fascia
  homeTau: 1.2,       // s: la casa segue la mano del giocatore con questo ritardo
  shared: .15,        // zona condivisa: una mano persa da poco si riprende fino a tanto oltre il confine…
  hyst: .04,          // …se non è più vicina all'altro giocatore (con questo margine a favore di chi l'aveva)
  memoryMs: 4000,     // mano persa da meno di così: il giocatore ha diritto alla mano che ricompare dove l'aveva persa
  predictMs: 100,     // posizione prevista con la velocità al massimo fino a così dopo l'ultima vista
  // colonne del flusso ottico con il confine a metà (si spostano con il confine, duoFlowCols)
  cols: Object.freeze({ p1: Object.freeze({ from: 0, to: 3 }), p2: Object.freeze({ from: 4, to: 7 }) })
});

const finite = Number.isFinite;
const pushTrail = (trail, pt) => {
  trail.push(pt);
  while (trail.length > 5 || (trail.length > 2 && pt.t - trail[0].t > 160)) trail.shift();
};
const other = id => (id === 'p1' ? 'p2' : 'p1');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// la mano è dalla parte del giocatore rispetto al confine (spostato di margin verso l'altro)
const onSide = (id, p, split, margin = 0) => (id === 'p1' ? p.x < split + margin : p.x >= split - margin);

function newLane(id){
  return { id, hand: null, vel: { x: 0, y: 0 }, home: { x: DUO.home[id], y: .5 }, homeSet: false, size: null, trail: [], source: null, lastTrigger: -Infinity, smooth: { x: DUO.home[id], y: .5 }, handNow: false, seenAt: null };
}

// colonne della griglia 8×6 del flusso ottico per ciascun giocatore, ai due lati del confine (da 0–1 a 0–5 per il P1)
export function duoFlowCols(split = DUO.mid){
  const k = Math.max(1, Math.min(6, Math.round(split*8) - 1));
  return { p1: { from: 0, to: k }, p2: { from: k + 1, to: 7 } };
}

export class DuoTracker {
  constructor(){ this.reset(); }
  reset(){ this.lanes = { p1: newLane('p1'), p2: newLane('p2') }; }
  // la mano di questo giocatore si è vista da poco (pagina «Collega»: pronti quando si vedono entrambe)
  seen(id, now, within = DUO.seenMs){ const s = this.lanes[id]?.seenAt; return Number.isFinite(s) && now - s <= within; }
  // confine tra le corsie: a metà tra le case dei due giocatori, nella fascia splitMin–splitMax
  split(){
    const a = this.lanes.p1.home.x, b = this.lanes.p2.home.x;
    return a < b ? Math.max(DUO.splitMin, Math.min(DUO.splitMax, (a + b)/2)) : DUO.mid;
  }
  // colonne del flusso ottico del giocatore (motion_controls._duoFrame)
  cols(id){ return duoFlowCols(this.split())[id]; }
  // dove il giocatore aspetta la sua mano: agganciata → posizione prevista; persa da poco → dove l'ha persa; se no la casa
  _anchor(L, now){
    const h = L.hand, age = h ? now - h.t : Infinity;
    if (h && age <= ARGON_TRACK.pickMs){ const k = Math.min(age, DUO.predictMs)/1000; return { tier: 3, p: { x: h.x + L.vel.x*k, y: h.y + L.vel.y*k } }; }
    if (h && age <= DUO.memoryMs) return { tier: 2, p: { x: h.x, y: h.y } };
    return { tier: 1, p: L.home };
  }
  // risultati del modello delle mani (landmark nell'immagine non specchiata) → eventi [{ who, type, side, … }]
  hands(list, now, aspect = .75){
    const cands = (Array.isArray(list) ? list : []).map(lm => ({ lm, p: argonHandPoint(lm), size: argonHandSize(lm, aspect) })).filter(c => c.p);
    const split = this.split(), A = { p1: this._anchor(this.lanes.p1, now), p2: this._anchor(this.lanes.p2, now) };
    // mani possibili per ogni giocatore, con il valore dell'assegnazione (prima il livello, poi la distanza)
    const opts = {};
    for (const id of DUO_PLAYERS){
      const L = this.lanes[id], a = A[id], o = A[other(id)];
      opts[id] = [];
      cands.forEach((c, i) => {
        const d = dist(c.p, a.p);
        if (a.tier === 3){ if (argonSameHand(c.p, c.size, { ...L.hand, size: L.size }, now)) opts[id].push({ i, v: 3 - d }); return; }
        // persa da poco: dalla sua parte del confine, o nella zona condivisa se non è più vicina all'altro giocatore
        if (a.tier === 2){ if (onSide(id, c.p, split) || (onSide(id, c.p, split, DUO.shared) && d < dist(c.p, o.p) + DUO.hyst)) opts[id].push({ i, v: 2 - d }); return; }
        // libera: dalla sua parte del confine, la più grande (a pari grandezza la più vicina alla casa)
        if (onSide(id, c.p, split)) opts[id].push({ i, v: 1 + 2*(c.size || 0) - .01*d });
      });
    }
    // assegnazione migliore dei due insieme (nessuna mano a due giocatori)
    let best = { v: 0, p1: null, p2: null };
    for (const x of [null, ...opts.p1]) for (const y of [null, ...opts.p2]){
      if (x && y && x.i === y.i) continue;
      const v = (x ? x.v : 0) + (y ? y.v : 0);
      if (v > best.v) best = { v, p1: x, p2: y };
    }
    const out = [];
    for (const id of DUO_PLAYERS){
      const L = this.lanes[id], c = best[id] ? cands[best[id].i] : null;
      L.handNow = !!c;
      if (!c) continue;
      // mano ritrovata dopo un buco breve senza colpi: la scia riparte dall'ultimo punto prima del buco
      if (L.source !== 'hand'){ const from = argonBridgeStart(L.hand, now, L.lastTrigger); L.trail = from ? [from] : []; }
      L.source = 'hand'; L.seenAt = now;
      if (c.size != null) L.size = L.size == null ? c.size : L.size + (c.size - L.size)*.2;
      // velocità (per prevedere dove va la mano) solo tra due viste vicine; casa che segue la mano lentamente
      const prev = L.hand, dt = prev ? (now - prev.t)/1000 : Infinity;
      if (dt > 0 && dt <= .2){ const k = .5; L.vel = { x: L.vel.x*(1 - k) + k*(c.p.x - prev.x)/dt, y: L.vel.y*(1 - k) + k*(c.p.y - prev.y)/dt }; }
      else L.vel = { x: 0, y: 0 };
      if (!L.homeSet){ L.home = { x: c.p.x, y: c.p.y }; L.homeSet = true; }
      else { const k = 1 - Math.exp(-Math.min(1, finite(dt) ? dt : 1)/DUO.homeTau); L.home = { x: L.home.x + (c.p.x - L.home.x)*k, y: L.home.y + (c.p.y - L.home.y)*k }; }
      L.hand = { x: c.p.x, y: c.p.y, t: now }; L.smooth = { x: c.p.x, y: c.p.y };
      pushTrail(L.trail, { x: c.p.x, y: c.p.y, t: now });
      const ev = this._eval(L, now, true);
      if (ev) out.push(ev);
    }
    return out;
  }
  // il giocatore vuole il flusso ottico: nessuna mano nell'ultimo risultato e non in attesa del buco breve
  wantsFlow(id, now){ const L = this.lanes[id]; return !!L && !L.handNow && !argonBridging(L.hand, now); }
  // centro del movimento nella sua metà (argonFlowBlob, null se fermo) → evento o null
  flow(id, blob, now){
    const L = this.lanes[id];
    if (!L) return null;
    if (!blob){ if (L.trail.length && now - L.trail[L.trail.length - 1].t > 150) L.trail = []; return null; }
    L.smooth = { x: L.smooth.x*.35 + blob.x*.65, y: L.smooth.y*.35 + blob.y*.65 };
    if (L.source !== 'flow') L.trail = [];
    L.source = 'flow';
    pushTrail(L.trail, { x: L.smooth.x, y: L.smooth.y, t: now });
    return this._eval(L, now, false);
  }
  _eval(L, now, hand){
    const o = argonTrailEvent(L.trail, { hand, scale: argonScale(L.size), now, lastTrigger: L.lastTrigger });
    if (!o?.event) return null;
    L.lastTrigger = now; L.trail = [o.event.last];
    const { last, ...ev } = o.event;
    return { who: L.id, source: hand ? 'hands' : 'flow', ...ev };
  }
}

// Vincoli della camera per la webcam per due: il campo visivo più largo che la camera dà (formato più largo, zoom al
// minimo), fino a 1920×1080: oltre il riconoscimento non vede di più (il modello lavora su un'immagine ridotta) e il
// computer lavora di più. caps: track.getCapabilities() (può mancare) → vincoli da applyConstraints, o null
export const DUO_CAMERA = Object.freeze({ maxW: 1920, maxH: 1080, minFps: 24, smallW: 1280 });
export function widestCamera(caps = {}){
  if (!caps || typeof caps != 'object') return null;
  const W = caps.width?.max, H = caps.height?.max;
  if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) return null;
  // formato della camera alla larghezza più grande, ridotto in proporzione se oltre 1920×1080
  const k = Math.min(1, DUO_CAMERA.maxW/W, DUO_CAMERA.maxH/H);
  const out = { width: Math.round(W*k), height: Math.round(H*k) };
  if (Number.isFinite(caps.zoom?.min)) out.zoom = caps.zoom.min;
  // alla risoluzione piena dell'immagine senza ritagli del browser (ridotta, il browser deve poterla scalare)
  if (k === 1 && Array.isArray(caps.resizeMode) && caps.resizeMode.includes('none')) out.resizeMode = 'none';
  return out;
}

// Tentativi in ordine: il campo visivo è lo stesso a ogni risoluzione dello stesso formato, e per i colpi conta la
// fluidità (molte webcam a 1080p scendono a 15–20 fotogrammi al secondo): prima la più grande con almeno minFps, poi la
// stessa forma a 1280 di larghezza con almeno minFps, infine la più grande senza vincolo di fotogrammi
export function cameraAttempts(c){
  if (!c) return [];
  const { zoom, ...size } = c, out = [{ ...size, frameRate: { min: DUO_CAMERA.minFps, ideal: 30 } }];
  if (size.width > DUO_CAMERA.smallW){ const k = DUO_CAMERA.smallW/size.width; out.push({ width: DUO_CAMERA.smallW, height: Math.round(size.height*k), frameRate: { min: DUO_CAMERA.minFps, ideal: 30 } }); }
  out.push({ ...size, frameRate: { ideal: 30 } });
  return out;
}
