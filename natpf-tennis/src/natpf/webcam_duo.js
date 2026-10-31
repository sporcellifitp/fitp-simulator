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
//    grandezza (argonSameHand), dalla sua parte del confine o nella zona condivisa e non più vicina all'altro giocatore;
//    dopo un buco salta al massimo di jumpHands grandezze della mano. Tra due mani vicine o che si incrociano vince la
//    più vicina a dove la mano stava andando (posizione prevista con la velocità), così le mani dei due non si scambiano
//    (revisione del 31/10: prima, dopo un buco di 130–200 ms, la corsia poteva saltare sulla mano libera dell'altro);
//  - mani libere (il modello ne cerca quattro, DUO_HANDS): una mano rimasta senza giocatore si ritrova nel risultato
//    dopo (vicino a dove era, con la sua velocità) e, se è stata vista insieme alla mano di un giocatore, non è la sua:
//    quel giocatore non la prende (né quando perde la racchetta né nel rovescio a due mani);
//  - mano persa da poco (meno di memoryMs): il giocatore ha diritto alla mano che ricompare vicino a dove l'aveva persa,
//    anche oltre il confine (zona condivisa larga shared), finché non è più vicina all'altro giocatore: con una sola
//    mano in vista va a chi l'aveva;
//  - mano mai vista o persa da tanto: la più grande dalla propria parte del confine (come prima, con la metà mobile);
//  - le due corsie non prendono mai la stessa mano: si sceglie l'assegnazione delle due insieme in ordine (prima le
//    corsie agganciate, ciascuna alla mano più vicina; poi quelle che l'avevano da poco; poi le libere);
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
  jumpHands: 4,       // mano agganciata: salto massimo dall'ultima vista, in grandezze della mano (circa 40 cm)…
  jumpMin: .08,       // …e almeno così (larghezze dell'immagine)
  decoyMs: 200,       // mani non assegnate ricordate dall'ultimo risultato se arrivato da meno di così…
  decoyHands: 1,      // …e ritrovate se si sono spostate al massimo di così (in grandezze della mano)…
  decoyMin: .025,     // …o di così (larghezze dell'immagine), dalla posizione prevista con la sua velocità
  decoyMaxV: 3,       // velocità massima di una mano non assegnata nella previsione (larghezze dell'immagine al secondo)
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
  reset(){ this.lanes = { p1: newLane('p1'), p2: newLane('p2') }; this.aspect = .75; this._decoys = []; this._decoyT = null; }
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
    this.aspect = aspect;
    const cands = (Array.isArray(list) ? list : []).map(lm => ({ lm, p: argonHandPoint(lm), size: argonHandSize(lm, aspect) })).filter(c => c.p);
    const split = this.split(), A = { p1: this._anchor(this.lanes.p1, now), p2: this._anchor(this.lanes.p2, now) };
    // mani non assegnate nell'ultimo risultato (mani libere, altre persone) ritrovate qui, con i giocatori di cui di
    // sicuro non sono (viste insieme alla loro mano)
    const decoys = this._matchDecoys(cands, now);
    // mani possibili per ogni giocatore: livello e distanza dall'ancora (per la corsia libera il valore di prima)
    const opts = {};
    for (const id of DUO_PLAYERS){
      const L = this.lanes[id], a = A[id], o = A[other(id)];
      opts[id] = [];
      cands.forEach((c, i) => {
        // una mano vista insieme alla mano di questo giocatore non è la sua (la sua mano libera, l'altro giocatore)
        if (decoys.get(i)?.[id]) return;
        const d = dist(c.p, a.p), dOther = dist(c.p, o.p);
        // agganciata: compatibile (velocità e grandezza), dalla sua parte del confine o nella zona condivisa e non più
        // vicina all'altro giocatore; dopo un buco il salto è limitato dalla grandezza della mano (prima, con il limite
        // di velocità, dopo 130–200 ms si poteva saltare di mezza immagine, sulla mano libera dell'altro)
        if (a.tier === 3){
          const reach = Math.max(DUO.jumpMin, DUO.jumpHands*(finite(L.size) ? L.size : finite(c.size) ? c.size : 0));
          if (dist(c.p, L.hand) <= reach && argonSameHand(c.p, c.size, { ...L.hand, size: L.size }, now) && onSide(id, c.p, split, DUO.shared) && d <= dOther + DUO.hyst) opts[id].push({ i, tier: 3, d });
          return;
        }
        // persa da poco: dalla sua parte del confine, o nella zona condivisa se non è più vicina all'altro giocatore
        if (a.tier === 2){ if (onSide(id, c.p, split) || (onSide(id, c.p, split, DUO.shared) && d < dOther + DUO.hyst)) opts[id].push({ i, tier: 2, d }); return; }
        // libera: dalla sua parte del confine, la più grande (a pari grandezza la più vicina alla casa)
        if (onSide(id, c.p, split)) opts[id].push({ i, tier: 1, d, v: 2*(finite(c.size) ? c.size : 0) - .01*d });
      });
    }
    // assegnazione dei due insieme (nessuna mano a due giocatori) in ordine: prima le corsie agganciate, ciascuna alla
    // mano più vicina (minima somma delle distanze); poi quelle che l'avevano da poco; poi le libere. Prima si sommavano
    // i valori: «agganciata su un'altra mano + libera» batteva «agganciata sulla sua mano da sola», e un giocatore
    // passava alla sua mano libera mentre l'altro prendeva la sua racchetta
    const score = (x, y) => {
      const k = [0, 0, 0, 0, 0];
      for (const z of [x, y]){
        if (!z) continue;
        if (z.tier === 3){ k[0]++; k[1] -= z.d; } else if (z.tier === 2){ k[2]++; k[3] -= z.d; } else k[4] += 1 + z.v;
      }
      return k;
    };
    const better = (a, b) => { for (let j = 0; j < a.length; j++) if (Math.abs(a[j] - b[j]) > 1e-9) return a[j] > b[j]; return false; };
    let best = { k: score(null, null), p1: null, p2: null };
    for (const x of [null, ...opts.p1]) for (const y of [null, ...opts.p2]){
      if (x && y && x.i === y.i) continue;
      const k = score(x, y);
      if (better(k, best.k)) best = { k, p1: x, p2: y };
    }
    // mani rimaste senza giocatore: si ricordano (con i giocatori la cui mano era in vista) per il prossimo risultato
    const taken = new Set([best.p1?.i, best.p2?.i]);
    this._decoys = cands.flatMap((c, i) => {
      if (taken.has(i)) return [];
      const m = decoys.get(i), v = k => (m && finite(m[k]) ? Math.max(-DUO.decoyMaxV, Math.min(DUO.decoyMaxV, m[k])) : 0);
      return [{ x: c.p.x, y: c.p.y, vx: v('vx'), vy: v('vy'), size: c.size, not: { p1: !!m?.p1 || !!best.p1, p2: !!m?.p2 || !!best.p2 } }];
    });
    this._decoyT = now;
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
  // mani non assegnate nell'ultimo risultato ritrovate tra quelle nuove (una per una, la più vicina entro poco: una mano
  // libera si muove poco tra due risultati, o come prima) → Map(indice → { p1, p2: di quali giocatori di sicuro non è,
  // vx, vy })
  _matchDecoys(cands, now){
    const out = new Map(), dt = (now - this._decoyT)/1000, prev = finite(dt) && dt > 0 && dt*1000 <= DUO.decoyMs ? this._decoys || [] : [];
    const pairs = [];
    prev.forEach((q, j) => {
      // dove la mano dovrebbe essere ora con la sua velocità (la mano libera nel rovescio a due mani si muove veloce)
      const at = { x: q.x + q.vx*dt, y: q.y + q.vy*dt }, r = Math.max(DUO.decoyMin, DUO.decoyHands*(finite(q.size) ? q.size : 0));
      cands.forEach((c, i) => { const d = dist(c.p, at); if (d <= r) pairs.push({ i, j, d }); });
    });
    pairs.sort((a, b) => a.d - b.d);
    const usedJ = new Set();
    for (const { i, j } of pairs) if (!out.has(i) && !usedJ.has(j)){
      usedJ.add(j);
      const q = prev[j], c = cands[i].p;
      out.set(i, { ...q.not, vx: (c.x - q.x)/dt, vy: (c.y - q.y)/dt });
    }
    return out;
  }
  // il giocatore vuole il flusso ottico: nessuna mano nell'ultimo risultato e non in attesa del buco breve
  wantsFlow(id, now){ const L = this.lanes[id]; return !!L && !L.handNow && !argonBridging(L.hand, now); }
  // centro del movimento nella sua metà (argonFlowBlob, null se fermo) → evento o null
  flow(id, blob, now, aspect = this.aspect){
    const L = this.lanes[id];
    this.aspect = aspect;
    if (!L) return null;
    if (!blob){ if (L.trail.length && now - L.trail[L.trail.length - 1].t > 150) L.trail = []; return null; }
    L.smooth = { x: L.smooth.x*.35 + blob.x*.65, y: L.smooth.y*.35 + blob.y*.65 };
    if (L.source !== 'flow') L.trail = [];
    L.source = 'flow';
    pushTrail(L.trail, { x: L.smooth.x, y: L.smooth.y, t: now });
    return this._eval(L, now, false);
  }
  _eval(L, now, hand){
    // camera larga (16:9): x e grandezza della mano riportate alla geometria 4:3 dello zip (argonAspectK)
    const aspect = this.aspect;
    const o = argonTrailEvent(L.trail, { hand, scale: argonScale(L.size, aspect), aspect, now, lastTrigger: L.lastTrigger });
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
