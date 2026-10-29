// Webcam per due (stesso schermo con una sola webcam, richiesta del 29/10 notte): due giocatori davanti alla stessa
// camera, il Player 1 a sinistra e il Player 2 a destra (nell'immagine specchiata, come si vedono sullo schermo; sono
// anche le loro metà dello schermo diviso). Ogni giocatore ha una sua «corsia» con la stessa webcam per uno
// (webcam_argon_track.js: scia dello zip argon-tennis, buco breve attraversato con la mano, movimenti in proporzione alla
// grandezza della mano, flusso ottico solo a mano uscita o non tornata):
//  - aggancio: una corsia senza mano prende la mano più grande nella sua metà dell'immagine; poi segue quella mano anche
//    oltre la metà (il dritto di chi sta a sinistra attraversa il centro), finché è compatibile per velocità e grandezza
//    (argonSameHand). Le due corsie non prendono mai la stessa mano: prima le corsie agganciate, la più vicina vince;
//  - flusso ottico per metà (colonne 0–3 per il P1, 4–7 per il P2 della griglia 8×6 dello zip), dall'immagine prima;
//  - ogni colpo esce con il giocatore (who: 'p1' | 'p2').
// Funzioni pure, senza DOM né modello: motion_controls._duoFrame passa i risultati del modello e il flusso.
import { ARGON_TRACK, argonHandPoint, argonHandSize, argonScale, argonSameHand, argonBridging, argonBridgeStart, argonTrailEvent } from './webcam_argon_track.js';

export const DUO_PLAYERS = Object.freeze(['p1', 'p2']);
export const DUO = Object.freeze({ mid: .5, seenMs: 1500, cols: Object.freeze({ p1: Object.freeze({ from: 0, to: 3 }), p2: Object.freeze({ from: 4, to: 7 }) }) });

const inHalf = (id, p) => (id === 'p1' ? p.x < DUO.mid : p.x >= DUO.mid);
const pushTrail = (trail, pt) => {
  trail.push(pt);
  while (trail.length > 5 || (trail.length > 2 && pt.t - trail[0].t > 160)) trail.shift();
};

function newLane(id){
  return { id, hand: null, size: null, trail: [], source: null, lastTrigger: -Infinity, smooth: { x: id === 'p1' ? .25 : .75, y: .5 }, handNow: false, seenAt: null };
}

export class DuoTracker {
  constructor(){ this.reset(); }
  reset(){ this.lanes = { p1: newLane('p1'), p2: newLane('p2') }; }
  // la mano di questo giocatore si è vista da poco (pagina «Collega»: pronti quando si vedono entrambe)
  seen(id, now, within = DUO.seenMs){ const s = this.lanes[id]?.seenAt; return Number.isFinite(s) && now - s <= within; }
  // risultati del modello delle mani (landmark nell'immagine non specchiata) → eventi [{ who, type, side, … }]
  hands(list, now, aspect = .75){
    const cands = (Array.isArray(list) ? list : []).map(lm => ({ lm, p: argonHandPoint(lm), size: argonHandSize(lm, aspect) })).filter(c => c.p);
    const taken = new Set(), got = {};
    // corsie agganciate (mano vista da poco): coppie corsia–mano compatibili, la più vicina per prima
    const pairs = [];
    for (const id of DUO_PLAYERS){
      const L = this.lanes[id];
      if (!L.hand || now - L.hand.t > ARGON_TRACK.pickMs) continue;
      cands.forEach((c, i) => { if (argonSameHand(c.p, c.size, { ...L.hand, size: L.size }, now)) pairs.push({ id, i, d: Math.hypot(c.p.x - L.hand.x, c.p.y - L.hand.y) }); });
    }
    pairs.sort((a, b) => a.d - b.d);
    for (const q of pairs) if (!got[q.id] && !taken.has(q.i)){ got[q.id] = cands[q.i]; taken.add(q.i); }
    // corsie libere: la mano più grande nella propria metà
    for (const id of DUO_PLAYERS){
      const L = this.lanes[id];
      if (got[id] || (L.hand && now - L.hand.t <= ARGON_TRACK.pickMs)) continue;
      let best = -1;
      cands.forEach((c, i) => { if (!taken.has(i) && inHalf(id, c.p) && (best < 0 || (c.size || 0) > (cands[best].size || 0))) best = i; });
      if (best >= 0){ got[id] = cands[best]; taken.add(best); }
    }
    const out = [];
    for (const id of DUO_PLAYERS){
      const L = this.lanes[id], c = got[id];
      L.handNow = !!c;
      if (!c) continue;
      // mano ritrovata dopo un buco breve senza colpi: la scia riparte dall'ultimo punto prima del buco
      if (L.source !== 'hand'){ const from = argonBridgeStart(L.hand, now, L.lastTrigger); L.trail = from ? [from] : []; }
      L.source = 'hand'; L.seenAt = now;
      if (c.size != null) L.size = L.size == null ? c.size : L.size + (c.size - L.size)*.2;
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
