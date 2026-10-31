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
//    grandezza (argonSameHand), dalla sua parte del confine o nella zona condivisa. Dopo un buco (la corsia ha saltato
//    almeno un risultato) inoltre non oltre jumpHands grandezze della mano dalla posizione prevista più quanto fa nel
//    buco un colpo veloce (jumpSpeed) e, se la mano dell'altro giocatore non è in vista dove lui l'aspetta, non più
//    vicina all'altro giocatore; tra due risultati consecutivi la mano resta di chi la segue. Tra due mani vicine o che
//    si incrociano vince la più vicina a dove la mano stava andando (posizione prevista con la velocità), così le mani
//    dei due non si scambiano (revisioni del 31/10: prima, dopo un buco di 130–200 ms, la corsia
//    poteva saltare sulla mano libera dell'altro; poi il limite di salto, misurato dall'ultima vista, valeva anche tra due
//    risultati consecutivi e a 10–15 Hz con la mano piccola la corsia perdeva la sua mano a metà di un dritto veloce);
//  - mani libere (il modello ne cerca quattro, DUO_HANDS): una mano rimasta senza giocatore si ritrova nel risultato
//    dopo (vicino a dove era, con la sua velocità) e, se è stata vista insieme alla mano di un giocatore, non è la sua:
//    quel giocatore non la prende (né quando perde la racchetta né nel rovescio a due mani). Le mani agganciate si
//    ritrovano insieme a quelle libere (abbinamento con la distanza totale minima): con le due mani di un giocatore
//    vicine e la mano libera persa per un risultato, l'etichetta della mano libera non passa alla racchetta (prima ci
//    restava per sempre: il giocatore non la riprendeva più e la prendeva l'altro). Un'etichetta vale per memoryMs
//    dall'ultima volta che la mano è stata vista insieme a quella del giocatore;
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
  jumpHands: 4,       // mano agganciata, dopo un buco: salto massimo dalla posizione prevista, in grandezze della mano
  jumpMin: .08,       // (circa 40 cm) e almeno così (larghezze dell'immagine)…
  jumpSpeed: 60,      // …più quanto si sposta nel buco a questa velocità (grandezze della mano al secondo: circa 6 m/s,
                      // un colpo veloce) o alla sua, se più veloce
  decoyMs: 200,       // mani non assegnate ricordate dall'ultimo risultato se arrivato da meno di così…
  decoyHands: 1,      // …e ritrovate (come le mani agganciate) se si sono spostate al massimo di così (in grandezze della mano)…
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
// etichetta «non è del giocatore id» di una mano non assegnata: istante dell'ultima volta che è stata vista insieme alla
// sua mano, valida per memoryMs (come il diritto del giocatore alla mano persa)
const notOf = (m, id, now) => !!m && finite(m[id]) && now - m[id] <= DUO.memoryMs;
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
  reset(){ this.lanes = { p1: newLane('p1'), p2: newLane('p2') }; this.aspect = .75; this._decoys = []; this._lastT = null; }
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
    // sicuro non sono (viste insieme alla loro mano), e mani agganciate ritrovate vicino a dove erano previste
    const { decoys, own } = this._matchDecoys(cands, now, A);
    // mani possibili per ogni giocatore: livello e distanza dall'ancora (per la corsia libera il valore di prima)
    const opts = {};
    for (const id of DUO_PLAYERS){
      const L = this.lanes[id], a = A[id], o = A[other(id)];
      opts[id] = [];
      cands.forEach((c, i) => {
        // una mano vista insieme alla mano di questo giocatore non è la sua (la sua mano libera, l'altro giocatore)
        if (notOf(decoys.get(i), id, now)) return;
        const d = dist(c.p, a.p), dOther = dist(c.p, o.p);
        // agganciata: compatibile (velocità e grandezza), dalla sua parte del confine o nella zona condivisa. Dopo un
        // buco anche non troppo lontana dalla posizione prevista (_reach) e non più vicina all'altro giocatore, se la
        // mano dell'altro non è in vista dove lui l'aspetta (se c'è, questa non è la sua). Tra due risultati consecutivi
        // la mano resta di chi la segue anche quando un dritto veloce arriva vicino all'altro giocatore
        if (a.tier === 3){
          const ok = argonSameHand(c.p, c.size, { ...L.hand, size: L.size }, now) && onSide(id, c.p, split, DUO.shared);
          const otherHere = own[other(id)] != null && own[other(id)] !== i;
          // il confronto con l'altro giocatore vale solo se lo si sta seguendo (tier 3): con la sua mano persa da tempo la
          // sua ultima posizione è vecchia (verifica del 31/10: dritto veloce del P2 con il P1 fuori campo da 1 s, la mano
          // del P2 finiva al P1)
          const otherLive = o.tier === 3;
          if (ok && (this._next(L) || (this._reach(L, c, a, now) && (otherHere || !otherLive || d <= dOther + DUO.hyst)))) opts[id].push({ i, tier: 3, d });
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
      return [{ x: c.p.x, y: c.p.y, t: now, vx: v('vx'), vy: v('vy'), size: c.size, not: { p1: best.p1 ? now : m?.p1 ?? null, p2: best.p2 ? now : m?.p2 ?? null } }];
    });
    this._lastT = now;
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
  // mani non assegnate nell'ultimo risultato e mani agganciate ritrovate tra quelle nuove, tutte insieme: ogni «traccia»
  // (mano non assegnata, dalla posizione prevista con la sua velocità; corsia agganciata, dalla sua posizione prevista)
  // prende al massimo una mano entro il suo raggio (decoyHands grandezze della mano, almeno decoyMin), con la distanza
  // totale minima (una traccia senza mano conta quanto il suo raggio). Prima le mani non assegnate si ritrovavano da sole,
  // una per una la più vicina: con le due mani di un giocatore vicine e la mano libera persa per un risultato,
  // l'etichetta della mano libera passava alla racchetta. → { decoys: Map(indice → { p1, p2: da quando la mano di
  // sicuro non è del giocatore (istante, o null), vx, vy }), own: { p1, p2: indice della mano della corsia agganciata
  // ritrovata dove l'aspetta, o null } }
  _matchDecoys(cands, now, A){
    const decoys = new Map(), own = { p1: null, p2: null };
    const prev = (this._decoys || []).filter(q => now > q.t && now - q.t <= DUO.decoyMs);
    const radius = size => Math.max(DUO.decoyMin, DUO.decoyHands*(finite(size) ? size : 0));
    const tracks = prev.map((q, j) => { const dt = (now - q.t)/1000; return { j, at: { x: q.x + q.vx*dt, y: q.y + q.vy*dt }, r: radius(q.size) }; });
    for (const id of DUO_PLAYERS) if (A[id].tier === 3) tracks.push({ id, at: A[id].p, r: radius(this.lanes[id].size) });
    if (!tracks.length || !cands.length) return { decoys, own };
    const D = tracks.map(k => cands.map(c => { const d = dist(c.p, k.at); return d <= k.r ? d - k.r : null; }));
    // ricerca completa (al massimo quattro mani e sei tracce): costo = somma di (distanza − raggio) delle coppie
    let best = [], bestCost = 0;
    const pick = [], used = new Array(tracks.length).fill(false);
    const go = (i, cost) => {
      if (i === cands.length){ if (cost < bestCost - 1e-12){ bestCost = cost; best = pick.slice(); } return; }
      pick[i] = -1; go(i + 1, cost);
      for (let t = 0; t < tracks.length; t++) if (!used[t] && D[t][i] != null){ used[t] = true; pick[i] = t; go(i + 1, cost + D[t][i]); used[t] = false; }
      pick[i] = -1;
    };
    go(0, 0);
    best.forEach((t, i) => {
      if (t < 0) return;
      const k = tracks[t];
      if (k.id){ own[k.id] = i; return; }
      const q = prev[k.j], c = cands[i].p, dt = (now - q.t)/1000;
      decoys.set(i, { ...q.not, vx: (c.x - q.x)/dt, vy: (c.y - q.y)/dt });
    });
    return { decoys, own };
  }
  // corsia agganciata con la mano vista nell'ultimo risultato (nessun buco)
  _next(L){ return !!L.hand && finite(this._lastT) && L.hand.t >= this._lastT; }
  // corsia agganciata, dopo un buco: salto possibile fino alla mano c, al massimo jumpHands grandezze della mano dalla
  // posizione prevista più lo spostamento nel buco a jumpSpeed (o alla velocità della mano, se più veloce). Prima il
  // limite valeva anche tra due risultati consecutivi ed era misurato dall'ultima vista: a 10–15 Hz o con la mano
  // piccola (2–3 m con la camera 16:9) era più severo del limite di velocità e la corsia perdeva la sua mano a metà di un
  // dritto veloce
  _reach(L, c, a, now){
    const size = finite(L.size) ? L.size : finite(c.size) ? c.size : 0, age = (now - L.hand.t)/1000;
    return dist(c.p, a.p) <= Math.max(DUO.jumpMin, DUO.jumpHands*size) + Math.max(DUO.jumpSpeed*size, Math.hypot(L.vel.x, L.vel.y))*age;
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
