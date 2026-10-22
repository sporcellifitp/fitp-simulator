// Colpi della webcam dalla traccia della mano: un solo evento per colpo.
//
// Prima (motion_controls.js) ogni finestra di 160 ms abbastanza veloce era un colpo: la preparazione del rovescio
// partiva come «dritto·pallonetto», il blocco di 320 ms nascondeva poi il colpo vero, il moto verticale pesava 1,3–1,8
// volte quello orizzontale (y in altezze dell'immagine, x in larghezze) e i rovesci dal basso verso l'alto
// diventavano pallonetti. Qui:
// - unità uguali sui due assi (larghezze dell'immagine) divise per la scala della mano (distanza polso–nocca del medio
//   rispetto a quella tipica a ~2 m): le soglie valgono uguali da vicino e da lontano;
// - il «viaggio» della mano parte dall'ultimo punto in cui era ferma: la preparazione la porta lontano (di lato, o in
//   alto per la schiacciata), il colpo è il movimento che torna indietro da quel punto almeno veloce quanto la
//   preparazione o ben oltre il punto di partenza (il ritorno dopo uno swing secco è più lento e si ferma lì); finale
//   e ritorno dopo un colpo non contano finché la mano non si ferma. Così la preparazione, la caduta della mano
//   nell'anello e il ritorno non diventano colpi;
// - un movimento da fermo vale subito solo se è veloce e orizzontale (o se scende da sopra la spalla); altrimenti
//   aspetta: se torna indietro era la preparazione, se la mano si ferma era uno swing secco (se dura troppo, un
//   passante: niente);
// - pallonetto solo con un gesto ripido verso l'alto dal fondo dell'anello (da fermo: non in verticale, che è il gesto
//   del lancio) e che finisce sopra la mano a riposo; schiacciata solo se la mano scende partendo ben sopra la
//   posizione di riposo (sopra la spalla); tagliato se la mano scende, ma se adesso sale è top spin (con la camera alta
//   e inclinata la mano che si avvicina scende nell'immagine);
// - lancio di palla solo quando il gioco lo accetta (canToss: al proprio servizio); nello scambio lo stesso gesto
//   segue le regole dei colpi;
// - cambio di sorgente (mano ↔ flusso ottico) o una pausa lunga nei campioni: il viaggio riparte da lì;
// - colpo anticipato: il gioco tiene lo swing fino allo sweet spot solo se arriva prima della palla, quindi il colpo
//   parte durante l'avanzamento, prima dell'impatto, con lato e tipo provvisori: quando dopo la preparazione la mano
//   torna verso la camera (la taglia cresce: con la camera di fronte il moto di lato arriva dopo l'impatto) o appena
//   il moto di lato è chiaramente veloce. Il resto del gesto, quando la mano rallenta, si classifica di nuovo: solo una
//   conferma per la diagnostica (type 'confirm', dopo l'impatto), mai un secondo colpo. Il pallonetto, che sale
//   soprattutto dopo l'impatto, di solito lo riconosce solo la conferma.
// Le uscite (velocità, dirX, dirY) restano quelle del motore base, misurate sugli ultimi 160 ms in unità dell'immagine.
export const WEBCAM_STROKE = Object.freeze({
  scaleRef: .0395,              // polso–nocca del medio (larghezze) di una mano adulta a ~2 m, webcam da ~62°
  kMin: .5, kMax: 2,            // limiti della scala (da molto lontano / molto vicino)
  vStill: .1,                   // u/s: mano ferma (u = larghezze dell'immagine alla distanza tipica)
  vStart: .3, vEnd: .2,         // inizio e fine di un segmento di movimento
  vMin: .55,                    // picco minimo di un colpo
  vFast: 1.6,                   // da fermo: oltre questa velocità laterale uno swing orizzontale vale subito (le preparazioni sono più lente)
  dMin: .12,                    // spostamento minimo di un colpo (u)
  peakDrop: .8,                 // picco confermato quando la velocità scende sotto questa frazione
  commitX: .08,                 // colpo deciso appena ha fatto così di lato (u) a velocità da colpo, se il tipo è chiaro
  lobWait: .6,                  // salita/lato tra lobWait e lobSlope: potrebbe diventare un pallonetto, si aspetta
  commitDown: .12,              // schiacciata decisa appena la mano è scesa così (u)
  prepMin: .04,                 // preparazione: la mano si è allontanata almeno così (u) dal punto di riposo...
  rev: .04,                     // ... e il colpo torna indietro almeno così dal punto più lontano
  fwdSpeed: .9,                 // il colpo è veloce almeno così rispetto alla preparazione (il ritorno no)...
  pastRest: .08,                // ... oppure va oltre il punto di riposo almeno così (u): il ritorno si ferma lì
  pendStill: .12,               // s di mano ferma per decidere un movimento rimasto in attesa
  restStill: .35,               // s di mano ferma per un nuovo punto di riposo (una breve pausa a fine preparazione no)
  pendMax: .7,                  // s massimi di attesa
  segMax: .8,                   // s: un movimento da fermo più lungo non è uno swing (un passante che attraversa; col flusso ottico diviso per flow)
  lobSlope: 1.2, lobRise: .12,  // pallonetto: salita/spostamento laterale e salita minima (u)...
  lobEnd: .05,                  // ... con la mano che finisce sopra la posizione di riposo (u)...
  lobStart: .15,                // ... partendo da non più di così sopra il riposo (non la mano che sale a colpire una schiacciata)
  tossSlope: 3,                 // da fermo, salita più ripida di così rispetto al lato: il gesto del lancio, non un pallonetto
  sliceSlope: -.22,             // tagliato: discesa/spostamento laterale
  topRise: .12,                 // top spin: la mano adesso sale almeno così rispetto allo spostamento laterale
  smashHigh: .22,               // schiacciata: parte almeno così sopra la mano a riposo (u)
  smashPrep: .2,                // ... e la preparazione l'ha alzata almeno così (la preparazione del tagliato arriva alla spalla)
  dropSteep: 2.5,               // caduta della mano: discesa più di 2,5 volte lo spostamento laterale
  tossUp: .55, tossRise: .06,   // lancio: velocità verso l'alto e salita minima
  recStill: .15, recMin: .45, recNear: .12, recFar: 1, recMax: 1.6,   // dopo il colpo: finale e ritorno, fino alla mano ferma vicino al riposo
  homeStill: .3, homeTau: 1.5,  // posizione di riposo per le altezze: mano ferma da homeStill s, media su homeTau s
  flow: 1.3,                    // traccia del flusso ottico (rumorosa): soglie più alte
  gap: 350,                     // ms senza campioni (mano persa a lungo, flusso fermo): il viaggio riparte
  settleStill: .15,             // s: mano ritrovata dopo un po' (reset con settle): ferma almeno così prima dei colpi
  // colpo anticipato, prima dell'impatto: il gioco tiene lo swing fino allo sweet spot solo se arriva prima della palla
  aWin: 90, aSpan: 50,          // ms: finestra e durata minima per la velocità di avvicinamento alla camera
  gEarly: .08,                  // dopo la preparazione la mano è tornata verso la camera di tanto (ln della taglia dal minimo)...
  aEarly: .7,                   // ... e si avvicina ancora almeno così (1/s)
  aAway: .4,                    // 1/s: la mano che si allontana dalla camera è la preparazione, non il colpo
  gPrep: .08,                   // la preparazione ha portato la mano lontano dalla camera almeno così (ln della taglia)
  prepEarly: .08,               // preparazione minima (u) perché l'avvicinamento sia il colpo
  vEarly: 1.1, dEarly: .04,     // swing di lato deciso appena va così veloce (u/s, velocità sugli ultimi 28 ms) e ha fatto così (u)
  sliceEarly: -.6,              // colpo anticipato: la mano che adesso scende così (u/s) è un tagliato
  earlyLead: .35,               // s dal colpo anticipato al momento in cui il ritorno dopo il colpo si comincia a contare
                                // (come quando il colpo si decideva dopo l'impatto)
  window: 160,                  // ms per velocità e direzione in uscita (come il motore base)
});
const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fin = v => typeof v === 'number' && Number.isFinite(v);

// distanza polso–nocca del medio in larghezze dell'immagine (y riportata in larghezze con l'aspetto)
export function handSize(lm, aspect = .75){
  const w = lm?.[0], m = lm?.[9];
  if (!w || !m || !fin(w.x) || !fin(m.x)) return 0;
  return hyp(m.x - w.x, (m.y - w.y)*aspect);
}
// punto seguito della mano, specchiato come nel motore base (destra dello schermo = destra del giocatore)
export const handPoint = lm => ({ x: 1 - (lm[0].x*.45 + lm[9].x*.55), y: lm[0].y*.45 + lm[9].y*.55 });

// Altre persone nell'inquadratura (chi guarda, chi aspetta il turno, un passante): le mani viste nello stesso
// fotogramma di quella seguita. Una mano che era già altrove mentre si seguiva la propria non è la propria che si è
// spostata in fretta: non si prende per continuità (prima il salto sulla mano vicina, con la propria nascosta per un
// attimo, diventava uno swing) e, persa la propria, per qualche secondo nemmeno come mano nuova (i suoi swing non
// contano). Dopo, una mano nuova si prende di nuovo: chi gioca può essere cambiato.
export const HAND_OTHERS = Object.freeze({
  near: .1, rate: 1.5,   // larghezze (+ larghezze/s dall'ultima volta che si è vista): ancora la stessa mano
  keep: 1500,            // ms: un'altra mano non più vista da così si dimentica
  lock: 3000,            // ms dall'ultima volta che si è vista la propria: le mani delle altre persone non si prendono…
  reacquire: .3,         // … e una mano nuova solo vicino a dove era la propria (larghezze alla distanza tipica)
});
function otherAt(others, x, u, size, t){
  for (const o of others || []){
    if (t - o.t > HAND_OTHERS.keep || hyp(o.x - x, o.u - u) > HAND_OTHERS.near + HAND_OTHERS.rate*clamp((t - o.t)/1000, 0, .25)) continue;
    if (o.size > 1e-4 && size > 1e-4 && (size/o.size < .6 || size/o.size > 1.6)) continue;
    return o;
  }
  return null;
}
// Aggiorna le altre mani dopo la scelta: nuove solo se nello stesso fotogramma si vede anche la propria (chosen ≥ 0);
// quelle già note si seguono anche mentre la propria è persa.
export function updateOthers(others, hands, { chosen = -1, t = 0, aspect = .75 } = {}){
  const out = (others || []).filter(o => t - o.t <= HAND_OTHERS.keep).map(o => ({ ...o }));
  (hands || []).forEach((h, i) => {
    if (i === chosen || !h?.lm) return;
    const p = handPoint(h.lm), x = p.x, u = -p.y*aspect, size = handSize(h.lm, aspect), o = otherAt(out, x, u, size, t);
    if (o) Object.assign(o, { x, u, size, t });
    else if (chosen >= 0) out.push({ x, u, size, t });
  });
  return out;
}

// Scelta della mano tra quelle trovate (fino a due): non più la prima della lista, che una mano nuova (un passante,
// la mano libera) prende e tiene. Con una mano seguita da poco vale la continuità (vicina alla posizione prevista, di
// taglia simile e, se il modello ne è sicuro, della stessa lateralità: track.label); se non c'è, si aspetta (persa)
// invece di saltare su un'altra mano. Senza mano seguita: la mano che impugna (lateralità dal modello, che vede
// l'immagine non specchiata: la destra del giocatore è «Left»), poi la più grande (più vicina), poi la più centrale.
// others: le mani delle altre persone (updateOthers), che non si prendono.
export function pickHand(hands, { track = null, t = 0, prefer = 'right', aspect = .75, hold = 500, others = null } = {}){
  if (!hands?.length) return { index: -1, reason: 'nessuna mano' };
  const want = prefer === 'left' ? 'Right' : 'Left';
  const c = hands.map((h, i) => {
    const p = handPoint(h.lm), x = p.x, u = -p.y*aspect, size = handSize(h.lm, aspect);
    return { i, x, u, size, match: h.label ? (h.label === want ? 1 : -1)*(fin(h.score) ? h.score : .5) : 0, other: !!otherAt(others, x, u, size, t) };
  });
  if (track && t - track.t <= hold){
    const dt = clamp((t - track.t)/1000, 0, .25), px = track.x + track.vx*dt, pu = track.u + track.vu*dt;
    // distanza ammessa: la mano può partire da ferma per uno swing veloce (fino a ~2,5 larghezze/s alla distanza tipica)
    const gate = .16*(track.k || 1) + .5*hyp(track.vx, track.vu)*dt + 2.5*(track.k || 1)*dt;
    let best = null;
    for (const h of c){
      const d = hyp(h.x - px, h.u - pu), r = track.size > 1e-4 && h.size > 1e-4 ? h.size/track.size : 1;
      if (d > gate || r < .55 || r > 1.8) continue;
      // l'altra mano (lateralità opposta, sicura) o quella di un'altra persona valgono solo se sono proprio dove era
      // quella seguita. Una mano nuova che compare lontano entro hold non si distingue dalla propria che torna dopo il
      // mosso di uno swing (con l'esposizione lunga anche 0,3–0,4 s senza mano): si prende, come prima
      const g = hands[h.i], close = d <= .16*(track.k || 1);
      if (!close && (h.other || (track.label && g.label && g.label !== track.label && (fin(g.score) ? g.score : .5) >= .7))) continue;
      const cost = d/gate - .15*h.match;
      if (!best || cost < best.cost) best = { ...h, cost };
    }
    return best ? { index: best.i, reason: 'continuità' } : { index: -1, reason: 'persa' };
  }
  // persa da poco la propria mano: le altre persone restano escluse e si riprende solo vicino a dove era (un solo
  // soggetto: chi passa davanti alla webcam non diventa chi gioca)
  const lock = track && t - track.t <= HAND_OTHERS.lock;
  const pool = lock ? c.filter(h => !h.other && hyp(h.x - track.x, h.u - track.u) <= HAND_OTHERS.reacquire*(track.k || 1)) : c;
  if (!pool.length) return { index: -1, reason: c.some(h => h.other) ? 'altra persona' : 'lontana' };
  const big = Math.max(...pool.map(h => h.size), 1e-6);
  const score = h => 1.2*h.match + h.size/big - .6*Math.abs(h.x - .5);
  const best = pool.reduce((a, b) => (score(b) > score(a) ? b : a));
  return { index: best.i, reason: c.length === 1 ? 'unica' : best.match > 0 ? 'lateralità' : 'taglia' };
}

// Riconoscimento dei colpi. push({ t (ms), x (larghezze, specchiata), y (altezze, verso il basso), aspect (altezza/
// larghezza dell'immagine), src ('hands' | 'flow'), scale (taglia della mano o null), canToss (true/false/null) })
// restituisce gli eventi decisi con quel campione: { type: 'swing' | 'toss', side, shotType, speed, dirX, dirY, why }.
// opt.trace(tipo, dati), facoltativa: le decisioni, per la diagnostica.
export function createStrokeTracker(opt = {}){
  const C = { ...WEBCAM_STROKE, ...opt }, TR = typeof opt.trace === 'function' ? opt.trace : null;
  let k = 1, kSamples = [], home = null, hist = [], seg = null, pend = null, rec = null, stillSince = null, last = null, tossAt = -1e9;
  let rest = null, trip = null;          // ultimo punto in cui la mano era ferma e viaggio da lì (estremi, velocità)
  let zh = [], early = null;             // ln della taglia della mano nel tempo; colpo anticipato del viaggio
  let settle = false;                    // mano ritrovata: si aspetta che stia ferma prima di riconoscere colpi
  const state = { get k(){ return k; }, get home(){ return home; }, get phase(){ return rec ? 'ritorno' : seg ? (seg.kind === 'after' ? 'colpo' : 'movimento') : pend ? 'attesa' : 'ferma'; } };

  // velocità (u/s, già divisa per la scala) dal campione di almeno 45 ms prima, stessa sorgente
  // mano ferma: spostamento sugli ultimi 150 ms (la velocità su 45 ms, col rumore dei landmark, la dà ferma di rado)
  function calm(s){
    for (let i = hist.length - 2; i >= 0; i--){ const q = hist[i]; if (q.src !== s.src) return null; if (s.t - q.t >= 150) return hyp(s.x - q.x, s.u - q.u)/((s.t - q.t)/1000)/k; }
    return null;
  }
  function velocity(s, base = 45){
    for (let i = hist.length - 2; i >= 0; i--){
      const q = hist[i];
      if (q.src !== s.src) return null;
      if (s.t - q.t >= base) return { x: (s.x - q.x)/((s.t - q.t)/1000)/k, u: (s.u - q.u)/((s.t - q.t)/1000)/k };
    }
    return null;
  }
  // velocità e direzione in uscita come le misurava il motore base: fino a 160 ms prima di «at», unità dell'immagine
  function output(at){
    let j = hist.length - 1;
    while (j > 0 && hist[j].t > at.t) j--;
    const b = hist[j]; let a = b;
    for (let i = j; i >= 0 && b.t - hist[i].t <= C.window && hist[i].src === b.src; i--) a = hist[i];
    const dt = Math.max(.025, (b.t - a.t)/1000), P = (b.x - a.x)/dt, d = (b.yi - a.yi)/dt;
    const mag = .65*hyp(P, d);
    return { speed: clamp(.75 + mag*.45, .85, 1.65), dirX: clamp(P*.65*.85, -1, 1), dirY: clamp(d*.65*.85, -1, 1), vx: P*.65, vy: d*.65, mag };
  }
  const pt = s => ({ x: s.x, u: s.u, t: s.t });
  const disp = (g, end = g.end) => ({ x: (end.x - g.p0.x)/k, u: (end.u - g.p0.u)/k });
  const above = p => (home ? (p.u - home.u)/k : 0);
  const upright = D => D.u > 0 && D.u > 1.15*Math.abs(D.x);
  const newSeg = (from, kind) => ({ p0: pt(from), end: pt(from), t0: from.t, peak: 0, peakX: 0, kind, done: false, slow: 0 });
  // low[dir]: punto più basso dopo l'estremo in quel verso (il fondo dell'anello dopo la preparazione)
  function startTrip(p){ rest = pt(p); trip = { xMax: pt(p), xMin: pt(p), uMax: pt(p), uMin: pt(p), peak: 0, low: { 1: pt(p), '-1': pt(p), 0: pt(p) }, zMin: null }; early = null; }
  // ln della taglia della mano adesso (media degli ultimi due campioni, meno rumore)
  const zNow = () => (zh.length >= 2 ? (zh[zh.length - 1].z + zh[zh.length - 2].z)/2 : null);
  // velocità d'avvicinamento alla camera (1/s): pendenza di ln(taglia della mano) sugli ultimi aWin ms
  function approach(){
    const n = zh.length; if (n < 2) return null;
    let i = n - 1; while (i > 0 && zh[n - 1].t - zh[i - 1].t <= C.aWin) i--;
    const w = zh.slice(i); if (w.length < 2 || w[w.length - 1].t - w[0].t < C.aSpan) return null;
    const mt = w.reduce((a, q) => a + q.t, 0)/w.length, mz = w.reduce((a, q) => a + q.z, 0)/w.length;
    let num = 0, den = 0; for (const q of w){ num += (q.t - mt)*(q.z - mz); den += (q.t - mt)**2; }
    return den > 0 ? num/den*1000 : null;
  }
  // il viaggio torna indietro: dal punto più lontano di lato (dritto, rovescio, pallonetto) o dalla cima di una
  // salita quasi verticale (schiacciata). dir: verso della preparazione (+1 destra, -1 sinistra, 0 in alto)
  function tripReversal(s){
    if (!trip) return null;
    const right = (trip.xMax.x - rest.x)/k, left = (rest.x - trip.xMin.x)/k, up = (trip.uMax.u - rest.u)/k;
    if (up >= C.smashPrep && up > 2.5*Math.max(right, left) && (trip.uMax.u - s.u)/k >= C.rev) return { at: trip.uMax, dir: 0 };
    if (Math.max(right, left) >= C.prepMin){
      const r = right >= left, ext = r ? trip.xMax : trip.xMin;
      if ((r ? ext.x - s.x : s.x - ext.x)/k >= C.rev) return { at: ext, dir: r ? 1 : -1 };
    }
    return null;
  }
  // pallonetto: la salita si misura dal fondo dell'anello dopo la preparazione (da fermo: dal punto più basso dopo il
  // riposo), non dal punto più lontano della preparazione, che è più in alto e fa sembrare la salita meno ripida e
  // più tardiva. Dopo la preparazione in alto della schiacciata il fondo resta sopra la spalla: niente pallonetto
  function lobLike(g){
    const q = !trip ? null : g.kind === 'after' ? trip.low[g.prepDir] : trip.uMin;
    const L = q && q.t <= g.end.t && q.u < g.p0.u ? q : g.p0;
    const rise = (g.end.u - L.u)/k, lat = Math.abs(g.end.x - L.x)/k;
    // da fermo (senza preparazione) la mano che sale quasi in verticale è il gesto del lancio, non un pallonetto
    if (g.kind !== 'after' && rise > C.tossSlope*lat) return false;
    return rise >= C.lobRise && rise >= C.lobSlope*lat && above(g.end) >= C.lobEnd && above(L) <= C.lobStart;
  }
  // tipo e lato di un movimento (convenzione del destro: verso destra = rovescio, il mancino lo scambia NatpfHand).
  // vl: velocità adesso; prepDir: verso della preparazione per il lato quando il colpo va quasi in verticale
  function classify(g, f = 1, vl = null, prepDir = 0){
    const D = disp(g), dist = hyp(D.x, D.u), slope = D.u/Math.max(Math.abs(D.x), 1e-3);
    if (g.peak < C.vMin*f || dist < C.dMin*.8*f) return { stroke: false, why: 'piccolo' };
    const side = Math.abs(D.x) >= .03 ? (D.x > 0 ? 'backhand' : 'forehand') : prepDir ? (prepDir > 0 ? 'forehand' : 'backhand') : null;
    // schiacciata: scende da sopra la spalla dopo una preparazione verso l'alto (o da ferma in alto, dopo il lancio);
    // dopo una preparazione di lato la mano che scende dalla spalla è un tagliato
    if (D.u < 0 && !prepDir && above(g.p0) >= C.smashHigh && -D.u >= .5*Math.abs(D.x)) return { stroke: true, side: null, shotType: 'smash', why: 'scende da sopra la spalla' };
    if (D.u < 0 && -D.u > C.dropSteep*Math.abs(D.x)) return { stroke: false, why: 'caduta della mano' };
    if (lobLike(g)) return { stroke: true, side, shotType: 'lob', why: 'sale ripida dal basso e finisce alta' };
    if (D.u > 0 && slope >= C.lobSlope) return { stroke: false, why: 'salita' };
    // tagliato o top spin: il tagliato scende soprattutto prima dell'impatto, il top spin sale soprattutto dopo. Se la
    // mano adesso sale è top spin anche se dall'inizio è scesa; altrimenti decide la discesa dall'inizio o di adesso
    const ls = vl ? vl.u/Math.max(Math.abs(vl.x), 1e-3) : null;
    if (ls != null && ls >= C.topRise) return { stroke: true, side, shotType: 'topspin', why: 'sale' };
    if (slope <= C.sliceSlope || (ls != null && ls <= C.sliceSlope)) return { stroke: true, side, shotType: 'slice', why: 'scende' };
    return { stroke: true, side, shotType: 'topspin', why: 'colpo' };
  }
  // colpo già chiaro prima del picco (meno ritardo): abbastanza di lato a velocità da colpo senza scendere adesso (la
  // discesa può essere ancora l'avvicinamento alla camera: si aspetta il picco), oppure pallonetto o schiacciata evidenti
  function committed(g, sp, f, v){
    if (sp < C.vMin*f) return false;
    const D = disp(g), slope = D.u/Math.max(Math.abs(D.x), 1e-3);
    if (Math.abs(D.x) >= C.commitX*f && slope < C.lobWait && v.u > C.sliceSlope*Math.abs(v.x)) return true;
    if (lobLike(g)) return true;
    return -D.u >= C.commitDown*f && above(g.p0) >= C.smashHigh;
  }
  // dopo la preparazione: colpo se almeno veloce quanto lei o se va ben oltre il punto di riposo (verso opposto)
  function forward(g){
    if (g.peak >= C.fwdSpeed*g.prepPeak) return true;
    if (!rest) return false;
    return (g.prepDir ? (rest.x - g.end.x)*g.prepDir : rest.u - g.end.u)/k >= C.pastRest;
  }
  // ritorno verso la posizione di riposo, lento: mai un colpo
  function isReturn(g){
    if (!home || g.peak >= C.vFast) return false;
    const e = hyp(g.end.x - home.x, g.end.u - home.u)/k, s = hyp(g.p0.x - home.x, g.p0.u - home.u)/k;
    return e <= .08 && s >= .15;
  }
  function swing(at, c, why){
    const o = output(at);
    return { type: 'swing', side: c.side, shotType: c.shotType, speed: o.speed, dirX: o.dirX, dirY: o.dirY, vx: o.vx, vy: o.vy, mag: o.mag, why };
  }

  function push(raw){
    const out = [];
    if (!raw || !fin(raw.t) || !fin(raw.x) || !fin(raw.y)) return out;
    const aspect = fin(raw.aspect) && raw.aspect > 0 ? raw.aspect : .75;
    const s = { t: raw.t, x: raw.x, u: -raw.y*aspect, yi: raw.y, src: raw.src || 'hands' };
    // scala della mano: 80° percentile degli ultimi campioni (di taglio o di scorcio la mano sembra più piccola)
    if (fin(raw.scale) && raw.scale > 1e-4){
      kSamples.push(raw.scale/C.scaleRef); if (kSamples.length > 30) kSamples.shift();
      const q = clamp([...kSamples].sort((a, b) => a - b)[Math.floor(.8*(kSamples.length - 1))], C.kMin, C.kMax);
      k = kSamples.length < 3 ? q : k + (q - k)*.15;
    }
    const prev = hist[hist.length - 1];
    if (prev && s.t <= prev.t) return out;
    // cambio di sorgente (mano ↔ flusso ottico) o troppo tempo senza campioni: posizioni non confrontabili, il viaggio
    // riparte da qui (un colpo a metà si perde, non ne nasce uno falso); il ritorno dopo un colpo continua
    if (prev && (prev.src !== s.src || s.t - prev.t > C.gap)){ hist = []; seg = null; pend = null; stillSince = null; trip = null; zh = []; }
    hist.push(s); while (hist.length > 2 && s.t - hist[0].t > 600) hist.shift();
    if (s.src === 'hands' && fin(raw.scale) && raw.scale > 1e-4){ zh.push({ t: s.t, z: Math.log(raw.scale) }); while (zh.length > 2 && s.t - zh[0].t > 300) zh.shift(); }
    if (!trip) startTrip(s);
    const v = velocity(s);
    if (!v){ last = s; return out; }
    const f = s.src === 'flow' ? C.flow : 1, sp = hyp(v.x, v.u);
    const cs = calm(s);
    if (cs != null && cs < C.vStill){ if (stillSince == null) stillSince = s.t; } else stillSince = null;
    const stillFor = stillSince == null ? 0 : (s.t - stillSince)/1000;
    // mano ritrovata dopo un po' (o di un'altra persona che entra): i colpi contano da quando sta ferma un momento.
    // Chi torna a giocare rimette la mano in posizione; una mano che entra già in movimento non fa uno swing
    if (settle){
      if (stillFor < C.settleStill){ last = s; return out; }
      settle = false; seg = null; pend = null; home = { x: s.x, u: s.u }; startTrip(s);
    }
    // posizione di riposo per le altezze: mano ferma da un po', fuori da colpi, attese e lanci
    if (!home) home = { x: s.x, u: s.u };
    else if (!seg && !pend && !rec && stillFor >= C.homeStill && s.t - tossAt > 1500){
      const a = Math.min(1, (s.t - (last?.t ?? s.t))/1000/C.homeTau);
      home = { x: home.x + (s.x - home.x)*a, u: home.u + (s.u - home.u)*a };
    }
    // dopo un colpo: finale e ritorno non contano finché la mano non si ferma
    if (rec){
      // dopo un colpo anticipato il resto del gesto, fino a quando la mano rallenta, si classifica di nuovo: solo una
      // conferma per la diagnostica (arriva dopo l'impatto, quando il gioco ha già giocato lo swing), mai un secondo colpo
      const g = rec.shadow;
      if (g && !g.done){
        g.end = pt(s); if (sp > g.peak) g.peak = sp;
        g.slow = g.peak >= C.vMin*f && sp < C.vEnd*f ? (g.slow || 0) + 1 : 0;
        if (g.slow >= 2){
          const c = classify(g, f, v, g.prepDir), e0 = rec.early; g.done = true;
          out.push({ type: 'confirm', side: c.stroke ? c.side : null, shotType: c.stroke ? c.shotType : null, early: e0, agree: !!c.stroke && c.side === e0.side && c.shotType === e0.shotType, why: c.why });
          TR && TR('conferma', { t: s.t, ...c, early: e0 });
        }
      }
      const age = (s.t - rec.at)/1000;
      // ferma vicino al riposo, o ferma e dopo recFar s (chi resta nel finale), o comunque dopo recMax s
      const near = home && hyp(s.x - home.x, s.u - home.u)/k <= C.recNear;
      if ((stillFor >= C.recStill && ((age >= C.recMin && near) || age >= C.recFar)) || age >= C.recMax){ rec = null; seg = null; startTrip(s); trip.afterRec = stillFor < C.recStill; }
      last = s; return out;
    }
    // viaggio della mano: estremi e velocità della preparazione, contata solo mentre la mano si allontana dal riposo di
    // lato o verso l'alto (non la caduta della mano nell'anello, non il colpo, non il lancio)
    let away = false;
    if (s.x > trip.xMax.x){ trip.xMax = trip.low[1] = pt(s); away = true; }
    if (s.x < trip.xMin.x){ trip.xMin = trip.low[-1] = pt(s); away = true; }
    if (s.u > trip.uMax.u){ trip.uMax = trip.low[0] = pt(s); away = away || trip.uMin.u >= rest.u - .02*k; }   // in alto conta solo senza caduta prima
    if (s.u < trip.uMin.u) trip.uMin = pt(s);
    for (const d of [1, -1, 0]) if (s.u < trip.low[d].u) trip.low[d] = pt(s);
    if (away && (!seg || (seg.kind !== 'after' && !seg.toss))) trip.peak = Math.max(trip.peak, sp);
    // colpo anticipato con la camera di fronte: dopo la preparazione la mano viene verso la camera prima di muoversi di
    // lato (il moto di lato nell'immagine arriva soprattutto dopo l'impatto)
    if (!early && approachEarly()){ last = s; return out; }
    // segmenti di movimento: iniziano quando la mano accelera, finiscono con due campioni lenti di fila
    if (!seg && sp >= C.vStart*f){ seg = newSeg(last || s, 'move'); TR && TR('inizio', { t: s.t, sp }); }
    if (seg){
      if (sp < C.vEnd*f && seg.peak > 0 && ++seg.slow >= 2) endSeg(seg, s);
      else {
        if (sp >= C.vEnd*f) seg.slow = 0; seg.end = pt(s); if (sp > seg.peak) seg.peak = sp;
        const dx = s.x - seg.p0.x; if (Math.abs(v.x) >= 1.25*Math.abs(v.u) && Math.sign(v.x) === Math.sign(dx)) seg.peakX = Math.max(seg.peakX, Math.abs(v.x));
      }
    }
    if (seg && !seg.done) decide();
    // movimento rimasto in attesa, mano ferma (o troppo tempo): era uno swing secco, o niente
    if (pend && !seg && (stillFor >= C.pendStill || (s.t - pend.tEnd)/1000 >= C.pendMax)) resolvePending();
    // mano ferma: nuovo punto di riposo, il viaggio riparte da qui
    if (!seg && !pend && stillFor >= C.restStill) startTrip(s);
    last = s;
    return out;

    function decide(){
      if (seg.kind !== 'after'){
        const r = tripReversal(s);
        if (r){
          seg.kind = 'after'; seg.p0 = r.at; seg.prepDir = r.dir; seg.prepPeak = trip.peak; seg.peak = sp;
          TR && TR('colpo in corso', { t: s.t, dir: r.dir, prepPeak: trip.peak, D: disp(seg) });
        }
      }
      const peakSeen = seg.peak >= C.vMin*f && sp < C.peakDrop*seg.peak;
      if (seg.kind === 'after'){
        // colpo anticipato dopo la preparazione di lato: torna indietro di lato più veloce della preparazione
        if (!early && seg.prepDir && quickSide(disp(seg), Math.max(C.vEarly, C.fwdSpeed*seg.prepPeak))){
          const D = disp(seg), ls = v.u/Math.max(Math.abs(v.x), 1e-3), slope = D.u/Math.max(Math.abs(D.x), 1e-3);
          emitEarly({ side: seg.prepDir > 0 ? 'forehand' : 'backhand', shotType: lobLike(seg) ? 'lob' : ls >= C.topRise ? 'topspin' : slope <= C.sliceSlope || ls <= C.sliceSlope ? 'slice' : 'topspin' }, 'anticipato: colpo di lato dopo la preparazione', seg);
          return;
        }
        // più lento della preparazione e fermo prima del riposo: è il ritorno di uno swing secco, non un colpo
        if (!forward(seg)) return;
        if (!peakSeen && !committed(seg, sp, f, v)) return;
        const c = classify(seg, f, v, seg.prepDir);
        if (c.stroke){ out.push(swing(s, c, `colpo: ${c.why}`)); seg.done = true; rec = { at: s.t }; pend = null; TR && TR('colpo', { t: s.t, ...c }); }
        return;
      }
      const D = disp(seg);
      // lancio di palla al proprio servizio (o senza informazioni sul gioco, come prima)
      if (raw.canToss !== false && D.u >= C.tossRise && upright(D) && v.u >= C.tossUp*f){
        const o = output(s);
        out.push({ type: 'toss', side: D.x > .03 ? 'backhand' : D.x < -.03 ? 'forehand' : null, shotType: 'lob', speed: o.speed, dirX: o.dirX, dirY: -.9, why: 'mano che sale di scatto' });
        seg.done = true; seg.toss = true; tossAt = s.t; TR && TR('lancio', { t: s.t }); return;
      }
      // colpo anticipato da fermo: swing di lato appena è chiaramente veloce (le preparazioni di lato sono più lente e,
      // con la camera di fronte, vanno lontano dalla camera); non il ritorno verso la posizione di riposo
      if (!early && Math.abs(D.x) >= C.dEarly*f && Math.abs(D.x) >= 1.25*Math.abs(D.u) && quickSide(D) && !receding() && !homeward(seg)){
        const ls = v.u/Math.max(Math.abs(v.x), 1e-3), slope = D.u/Math.abs(D.x);
        emitEarly({ side: D.x > 0 ? 'backhand' : 'forehand', shotType: ls >= C.topRise ? 'topspin' : slope <= C.sliceSlope || ls <= C.sliceSlope ? 'slice' : 'topspin' }, 'anticipato: swing veloce di lato', { ...seg, prepDir: 0 });
        return;
      }
      // da fermo valgono subito solo lo swing veloce e orizzontale e la discesa da sopra la spalla
      const fast = seg.peakX >= C.vFast*f && Math.abs(D.x) >= 1.25*Math.abs(D.u) && (peakSeen ? hyp(D.x, D.u) >= C.dMin*f : Math.abs(D.x) >= 1.5*C.commitX*f);
      // la discesa da ferma in alto è il colpo del servizio dopo il lancio (nello scambio la schiacciata ha la sua preparazione)
      const smash = D.u < 0 && s.t - tossAt < 3000 && above(seg.p0) >= C.smashHigh && (peakSeen || -D.u >= C.commitDown*f);
      if (fast || smash){
        const c = classify(seg, f, v);
        if (c.stroke){ out.push(swing(s, c, `${smash ? 'da sopra la spalla' : 'swing veloce'}: ${c.why}`)); seg.done = true; rec = { at: s.t }; pend = null; TR && TR('colpo', { t: s.t, ...c }); }
      }
    }
    // velocità di lato adesso (sugli ultimi 28 ms) nel verso dello spostamento, se il moto è soprattutto di lato
    function quickSide(D, min = C.vEarly){
      const q = velocity(s, 28) || v;
      return Math.sign(q.x) === Math.sign(D.x) && Math.abs(q.x) >= 1.25*Math.abs(q.u) && Math.abs(q.x) >= min*f;
    }
    // la mano va lontano dalla camera (la taglia cala): con la camera di fronte è la preparazione
    function receding(){ const a = s.src === 'hands' ? approach() : null; return a != null && a < -C.aAway; }
    // movimento partito lontano dalla posizione di riposo che ci torna: il ritorno, non un colpo
    // (anche dopo un colpo finito col tempo massimo a mano ancora in moto: si muove verso la posizione di riposo)
    function homeward(g){
      if (!home) return false;
      const b = hyp(g.p0.x - home.x, g.p0.u - home.u)/k, e = hyp(s.x - home.x, s.u - home.u)/k;
      if (b >= .15 && e < b - .03) return true;
      return !!trip.afterRec && e < b && (home.x - s.x)*v.x + (home.u - s.u)*v.u > 0;
    }
    // colpo anticipato: va subito al gioco; il resto del gesto (g, dal punto più lontano della preparazione) resta da
    // seguire solo per la conferma. Il ritorno si conta dall'impatto previsto
    function emitEarly(c, why, g){
      const o = output(s);
      out.push({ type: 'swing', side: c.side, shotType: c.shotType, speed: o.speed, dirX: o.dirX, dirY: o.dirY, vx: o.vx, vy: o.vy, mag: o.mag, why, early: true });
      early = { t: s.t, side: c.side, shotType: c.shotType };
      rec = { at: s.t + C.earlyLead*1000, early, shadow: { ...g, end: pt(s), peak: 0, slow: 0, done: false } };
      if (seg) seg.done = true;
      seg = null; pend = null;
      TR && TR('colpo anticipato', { t: s.t, ...c, why });
    }
    function approachEarly(){
      const z = s.src === 'hands' ? zNow() : null;
      if (z == null) return false;
      // la mano più lontana dalla camera in questo viaggio (fine della preparazione): la preparazione l'ha portata
      // lontano (il ritorno verso la posizione d'attesa dopo il colpo invece si avvicina e basta)
      if (trip.zRest == null) trip.zRest = z;
      if (trip.zMin == null || z < trip.zMin) trip.zMin = z;
      const a = approach();
      if (a == null || a < C.aEarly || z - trip.zMin < C.gEarly || trip.zRest - trip.zMin < C.gPrep) return false;
      const right = (trip.xMax.x - rest.x)/k, left = (rest.x - trip.xMin.x)/k, up = (trip.uMax.u - rest.u)/k;
      let dir;
      if (up >= C.smashPrep && up > 2.5*Math.max(right, left)) dir = 0;            // preparazione in alto: schiacciata
      else if (Math.max(right, left) >= C.prepEarly) dir = right >= left ? 1 : -1;   // preparazione di lato
      else return false;
      // ancora dalla parte della preparazione (non il ritorno); al proprio servizio, prima del lancio, la mano che sale è il lancio
      if (dir && (s.x - rest.x)*dir/k < .5*C.prepEarly) return false;
      if (!dir && (above(s) < C.smashHigh || (raw.canToss === true && s.t - tossAt > 3000))) return false;
      const g = { kind: 'after', p0: dir > 0 ? trip.xMax : dir < 0 ? trip.xMin : trip.uMax, end: pt(s), t0: s.t, peak: 0, peakX: 0, prepDir: dir };
      const c = !dir ? { side: null, shotType: 'smash' } : { side: dir > 0 ? 'forehand' : 'backhand', shotType: lobLike(g) ? 'lob' : v.u <= C.sliceEarly ? 'slice' : 'topspin' };
      emitEarly(c, `anticipato: la mano viene verso la camera (${a.toFixed(1)}/s)`, g);
      return true;
    }
    function endSeg(g, at){
      if (g === seg) seg = null;
      TR && TR('fine', { t: at.t, kind: g.kind, done: g.done, peak: g.peak, D: disp(g) });
      if (g.done) return;
      if (g.kind === 'after'){
        if (forward(g)){
          const c = classify(g, f, v, g.prepDir);
          if (c.stroke){ out.push(swing(s, c, `colpo: ${c.why}`)); rec = { at: s.t }; pend = null; TR && TR('colpo', { t: s.t, ...c }); return; }
        }
        if (pend) pend.after = Math.max(pend.after || 0, g.peak);
        return;
      }
      // movimento da fermo non deciso: in attesa (preparazione o swing secco), dal punto di riposo
      const h = { ...g, p0: rest ? { x: rest.x, u: rest.u, t: rest.t } : g.p0, tEnd: at.t, dur: (at.t - g.t0)/1000 };
      if (!pend || g.peak > pend.peak) pend = h; else pend.tEnd = at.t;
    }
    function resolvePending(){
      const g = pend; pend = null;
      const D = disp(g);
      TR && TR('attesa decisa', { t: s.t, peak: g.peak, after: g.after || 0, D, ret: isReturn(g) });
      // ritorno verso il riposo, mano alzata piano (preparazione della schiacciata, non un pallonetto), dopo è venuto un
      // movimento più ampio che non era un colpo (era una preparazione), oppure troppo lungo per uno swing (un passante)
      if (isReturn(g) || (upright(D) && g.peak < C.vFast*f) || (g.after || 0) >= .8*g.peak || g.dur > C.segMax/f) return;
      const c = classify(g, f);
      if (c.stroke){ out.push(swing(s, c, `swing secco: ${c.why}`)); rec = { at: s.t }; TR && TR('colpo', { t: s.t, ...c }); }
    }
  }
  function reset({ settle: wait = false } = {}){ hist = []; seg = null; pend = null; rec = null; stillSince = null; last = null; rest = null; trip = null; zh = []; early = null; settle = !!wait; }
  // movimento attuale della mano per la racchetta a schermo (come il motore base: ultimi 160 ms)
  const motion = () => (last ? output(last) : null);
  return { push, reset, motion, state };
}
