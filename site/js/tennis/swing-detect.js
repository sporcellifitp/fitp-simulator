// Riconoscimento del colpo dai sensori del telefono (giroscopio e accelerometro del browser). Senza DOM: testabile con Node.
//
// Pipeline: campione → togli la deriva del giroscopio → modulo della velocità di rotazione → media mobile esponenziale
// leggera (circa 1 campione di ritardo, solo contro i picchi spuri) → inizio del colpo sopra la soglia «on» → il colpo
// parte appena passato il picco (o dopo 40 ms di velocità costante) → pausa breve (170 ms) contro i doppi picchi.
// Cosa si manda al gioco: l'istante del picco (è l'impatto), la potenza (picco rispetto al colpo tipico di chi gioca),
// la direzione (destra→sinistra o sinistra→destra, dall'asse di rotazione imparato in calibrazione) e il verso verticale.
// La calibrazione raccoglie i candidati. In partita si filtra la preparazione con il profilo
// personale e si aspetta il recupero prima di accettare un nuovo colpo.
// Le soglie vengono dal profilo di calibrazione (calibration.js): si adattano a chi gioca, non solo «più sensibile».

import { gestureFloor, canonicalTwist } from './gesture-intent.js';
const len = v => Math.hypot(v[0], v[1], v[2]);
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const unit = v => { const l = len(v); return l > 1e-9 ? v.map(x => x/l) : [0, 0, 0]; };
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q*s.length))] : 0; };

export const DEFAULTS = {
  on: 140,          // °/s: sopra questa velocità di rotazione inizia un colpo
  minPeak: 230,     // °/s: picco minimo perché sia un colpo
  minAngle: 18,     // gradi percorsi almeno (scarta i tremolii)
  minDur: 30,       // ms
  maxDur: 700,      // ms: oltre è un movimento lento, non un colpo
  refractory: 170,  // ms dopo un colpo in cui non ne parte un altro (doppi picchi dello stesso gesto)
  plateau: 40,      // ms di velocità senza nuovo massimo: il picco è passato
  smooth: .55,      // peso del campione nuovo nella media mobile
  stillMax: 30,     // °/s: rotazione mediana accettata col telefono fermo in mano. Il tremolio naturale sta sotto (sessione
                    // del 22/10: il passo è passato con la mediana a 15 °/s, il telefono che si muoveva stava a 30–110);
                    // prima nessun campione doveva superare 35 °/s e con il tremolio il passo ripartiva di continuo
  stillPeak: 90,    // °/s: un campione oltre è un movimento vero e la finestra del passo «fermo» riparte
  stillTime: 600,   // ms di finestra del passo «fermo»
  recover: 300, quiet: 70, gap: 140,   // ms di calibrazione da fermo
  prepHold: 250,    // ms (modalità preparazione): un gesto nel verso opposto al colpo atteso aspetta così prima di valere
  prepMax: 700,     // ms: oltre, il gesto trattenuto vale comunque come colpo
  recoverWindow: 600, // ms dopo un colpo in cui il gesto nel verso opposto è il rientro della mano, non un colpo…
  recoverStrong: 1.2, // … se non è più forte di così rispetto al colpo: allora era la preparazione, e questo è il colpo
                      // (con una preparazione lenta presa per colpo, il colpo vero veniva scartato come rientro)
  rawDrop: .88,     // il colpo parte appena la velocità grezza scende sotto l'88% del suo picco (prima del calo della media)…
  rawFall: .97,     // … o dopo due campioni grezzi in calo sotto il 97% (picchi larghi: nei colpi veri 30–50 ms prima)
  prepWeak: .85,    // (modalità preparazione) si trattiene solo un gesto più debole dell'85% del proprio colpo tipico
  prepSlow: .45,    // gesto trattenuto e senza seguito: sotto il 45% del colpo tipico era una preparazione, non un colpo
  biasMax: 1.5,     // °/s: deriva del giroscopio accettata dal passo «fermo»; oltre era la mano che si muoveva (il
                    // giroscopio del browser è già compensato: nei tratti fermi della sessione del 22/10 dava meno di
                    // 1,5 °/s, il passo «fermo» con il telefono in mano 8,7 °/s), e la deriva resta zero
  signVotes: 4,     // senza asse di calibrazione: dopo almeno tanti colpi netti quasi tutti nel verso opposto a quello
  signAgree: .25,   // atteso (da che parte arriva la palla) il segno dei sensori è invertito (alcuni browser) e si gira
  prepFollow: .8,   // il gesto opposto dopo quello trattenuto è il colpo solo se veloce almeno l'80% di quello: più debole
                    // è il rientro della mano, e il colpo era quello trattenuto (il rovescio lungolinea su palla centrale
                    // diventava un dritto: rovescio morbido trattenuto, poi il rientro verso il dritto preso per il colpo)
};
// profilo di chi gioca (dalla calibrazione): deriva, asse del colpo (+ = da destra a sinistra), colpo tipico, soglie
export const defaultProfile = () => ({ bias: [0, 0, 0], axis: null, ref: 600, on: DEFAULTS.on, minPeak: DEFAULTS.minPeak, minAngle: DEFAULTS.minAngle, lobLift: null, sens: 1, refs: null, preparation: null, minAngles: null, intentGate: false });

// La durata è in millisecondi, come i timestamp del sensore.
export function classifySwingType({ power = .6, lift = 0, dur = 999 } = {}, lobLift = null){
  // A short/weak swing is not an intentional drop shot; select it on the phone.
  const drop = false;
  const slice = !drop && lift <= -.65;
  const lob = (lobLift != null && lift >= lobLift) || lift >= .7;
  return { drop, slice, lob };
}

// Gesto verticale: la rotazione avviene attorno a un asse orizzontale (perpendicolare alla gravità) e lontano
// dall'asse del dritto/rovescio, e la mano sale o scende davvero (accelerazione lineare lungo la gravità).
// Un solo segnale non basta: serve l'asse giusto E lo spostamento verticale. Restituisce 'up', 'down' o null.
export const VERTICAL = Object.freeze({ maxAlong: .45, maxAxisUp: .6, minLift: .25 });
export function verticalGesture(axis, gravity, lift, along = 0){
  if (!axis || !gravity || Math.abs(along) > VERTICAL.maxAlong) return null;
  // l'asse di rotazione è nell'ordine dei sensori [α(z), β(x), γ(y)], la gravità in [x, y, z]: stesso ordine prima del confronto
  const g = unit([gravity[2], gravity[0], gravity[1]]); if (!len(g)) return null;
  if (Math.abs(dot(unit(axis), g)) > VERTICAL.maxAxisUp) return null;
  return lift >= VERTICAL.minLift ? 'up' : lift <= -VERTICAL.minLift ? 'down' : null;
}

// Verso del colpo dalla rotazione attorno alla verticale: +1/−1 nello stesso senso del colpo di calibrazione (che si
// fa attorno alla verticale), null se il gesto non gira abbastanza attorno alla verticale (|cos| < 0,5) o se la
// calibrazione non era attorno alla verticale.
export function aroundVertical(axis, gravity, calibAxis, calibGravity){
  if (!axis || !gravity || !calibAxis || !calibGravity) return null;
  const up = g => unit([g[2], g[0], g[1]]);          // gravità [x, y, z] → ordine dei sensori [α(z), β(x), γ(y)]
  const ref = dot(unit(calibAxis), up(calibGravity)), now = dot(unit(axis), up(gravity));
  if (Math.abs(ref) < .5 || Math.abs(now) < .5) return null;
  return Math.sign(now) === Math.sign(ref) ? 1 : -1;
}

// Verso assoluto del gesto attorno alla verticale, senza calibrazione: visto dall'alto il dritto del destro (da destra a
// sinistra) gira in senso antiorario, cioè la rotazione punta verso l'alto (la gravità del browser, da fermi, punta in
// alto). +1 da destra a sinistra, -1 da sinistra a destra, 0 se il gesto non gira abbastanza attorno alla verticale
// (|cos| < min) o se manca la gravità. Serve a riconoscere un primo gesto della calibrazione fatto nel verso sbagliato.
export function verticalTurn(axis, gravity, min = .6){
  if (!axis || !gravity) return 0;
  const up = unit([gravity[2], gravity[0], gravity[1]]);
  if (!len(up) || !len(axis)) return 0;
  const c = dot(unit(axis), up);
  return c >= min ? 1 : c <= -min ? -1 : 0;
}

// Verso dalla rotazione netta attorno alla verticale durante tutto il gesto (turn, gradi) rispetto al percorso totale
// (angle, gradi): +1 da destra a sinistra, -1 il contrario, 0 se la parte attorno alla verticale è meno di `min`
// (o il gesto quasi non gira: meno di 4°). Più robusto dell'asse al picco quando il polso prona.
export function netTurn(turn, angle, min = .2){
  if (!Number.isFinite(turn) || !Number.isFinite(angle) || angle <= 0 || Math.abs(turn) < 4) return 0;
  const r = turn/angle;
  return r >= min ? 1 : r <= -min ? -1 : 0;
}

export function createSwingDetector(opts = {}){
  const C = { ...DEFAULTS, ...opts };
  let prof = defaultProfile();
  let training = false, armed = true, recovering = false, quietSince = null, phase = 'ready';
  let context = 'play';
  // Modalità preparazione (facoltativa, la chiede il gioco): prima del colpo si porta indietro la racchetta, cioè ci si
  // muove nel verso opposto al colpo. Se il gioco dice da che parte arriva la palla (expect: +1/-1, verso del colpo
  // atteso), un gesto nel verso opposto non parte subito: se entro poco arriva il gesto nel verso giusto era una
  // preparazione (evento 'prep'), altrimenti vale come colpo con il suo istante del picco (il tempo resta giusto).
  let prepMode = false, expectDir = 0, held = null, lastDir = 0, lastAxis = null;
  // verso assoluto (senza asse di calibrazione): segno dei sensori e voti dei colpi rispetto al verso atteso
  let absSign = 1, votes = { agree: 0, against: 0 };
  // ultimi tre campioni grezzi (tempo, modulo): l'istante vero del picco si ricava da una parabola sui tre attorno al
  // massimo, senza il ritardo della media mobile (che serve solo a decidere quando il colpo è partito)
  const raw = [];
  // still: campioni della finestra del passo «fermo»; finishAt: «Salta» arrivato senza campioni, si finisce al primo
  let mode = 'run', still = null, finishAt = false, cur = null, lastFire = -1e9, lastT = null, sm = 0, last = null, lastPeak = 0;
  const listeners = { swing: [], status: [], sample: [], phase: [], prep: [] };
  const emit = (k, v) => { for (const f of listeners[k]) f(v); };
  const serving = () => context === 'serve' || context === 'toss';
  const thr = () => {
    const examples = (prof.templates || []).filter(t => !serving() || t.shot === 'serve');
    const ref = examples.length ? Math.min(...examples.map(t => t.peak)) : serving() ? prof.ref*.5 : Infinity;
    return { on: Math.max((prof.noise || 1)*4, Math.min(prof.on,ref*.2))*prof.sens,
      minPeak: Math.max((prof.noise || 1)*5,Math.min(prof.minPeak,ref*.28))*prof.sens };
  };

  const setPhase = value => { if (phase !== value){ phase = value; emit('phase', value); } };
  const reset = () => { cur = null; sm = 0; lastT = null; recovering = false; quietSince = null; held = null; setPhase('ready'); };

  // campione: { t (ms), rot: [α,β,γ] °/s | null, acc: [x,y,z] m/s² senza gravità | null, accG: con gravità | null }
  function feed(k){
    if (!k || !Number.isFinite(k.t) || (lastT != null && k.t <= lastT)) return;
    if (lastT != null && k.t - lastT > C.gap){ reset(); if (mode === 'still') still = null; }
    const dt = lastT == null ? 10 : Math.max(1, Math.min(60, k.t - lastT)); lastT = k.t;
    // gesto trattenuto: vale come colpo se non è arrivato il gesto opposto (si aspetta ancora se è in corso)
    if (held && k.t >= held.until){
      const pending = cur && !cur.fired && dot(unit(cur.peakW), held.sw.axis) < -.3 && k.t - held.sw.peakT < C.prepMax;
      if (!pending){ const h = held; held = null; release(h.sw, k.t); }
    }
    last = k;
    const w = k.rot ? [k.rot[0] - prof.bias[0], k.rot[1] - prof.bias[1], k.rot[2] - prof.bias[2]] : null;
    const mag = w ? len(w) : (k.acc ? len(k.acc)*30 : 0);       // senza giroscopio: accelerazione in scala simile
    sm = sm + (mag - sm)*C.smooth;
    raw.push([k.t, mag]); if (raw.length > 3) raw.shift();
    if (mode === 'still') return feedStill(k);
    if (mode !== 'run') return;
    const T = thr();
    // dopo un gesto debole, una rotazione nel verso opposto chiaramente più forte è il colpo vero: il gesto di prima era
    // la preparazione (riconoscerlo dopo, sul computer: lo swing più forte sostituisce quello in attesa). Non si aspetta
    // la quiete del rientro, che tra preparazione e colpo non c'è
    if (recovering && !serving() && w && lastAxis && dot(unit(w), lastAxis) < -.3 && mag > Math.max(T.minPeak, lastPeak*C.recoverStrong)){ recovering = false; quietSince = null; setPhase('ready'); }
    if (recovering && !serving()){
      if (k.t-lastFire>100) setPhase('follow');
      if (sm < T.on*.65){ if (quietSince == null) quietSince = k.t; } else quietSince = null;
      if (quietSince == null || k.t - quietSince < C.quiet || k.t - lastFire < C.recover) return;
      recovering = false; setPhase('ready');
    }
    if (!training && prof.intentGate && !armed && !serving()) { cur = null; setPhase('preparation'); return; }
    if (cur && w && dot(unit(w), unit(cur.peakW)) < -.3 && mag > T.on){ cur = null; sm = mag*C.smooth; }
    // gesto già valutato (scartato come piccolo) e ora la velocità sale molto oltre il suo picco senza essere mai scesa:
    // è un gesto nuovo (la preparazione lenta seguita dal colpo vero), non la coda del primo
    else if (cur && cur.fired && mag > Math.max(cur.rawPeak, cur.peak)*1.3 && mag > T.minPeak){ cur = null; sm = mag*C.smooth; }
    if (!cur){
      // pausa contro i doppi picchi dello stesso gesto: solo nello stesso verso. Prima bloccava anche il colpo che segue
      // subito la preparazione (verso opposto): il colpo partiva al suo picco, tardi e con l'istante sbagliato.
      const sameWay = !w || !lastAxis || dot(unit(w), lastAxis) > -.3;
      if ((k.t - lastFire < C.refractory && sameWay) || sm < T.on) return;
      setPhase('preparation');
      cur = { t0: k.t, peak: 0, peakT: k.t, peakW: w || [0, 0, 0], gravity: null, angle: 0, turn: 0, up: 0, tot: 0, fired: false, rawPeak: 0, truePeakT: k.t };
    }
    cur.angle += mag*dt/1000;
    // rotazione netta attorno alla verticale durante il gesto (gradi, + = antioraria vista dall'alto = da destra a
    // sinistra): il polso che prona gira attorno a un asse orizzontale e non la cambia, il dritto e il rovescio sì
    if (w && k.accG){ const g = unit(k.accG.map((v, i) => v - (k.acc?.[i] || 0))); if (len(g)) cur.turn += dot(w, [g[2], g[0], g[1]])*dt/1000; }
    cur.fallN = raw.length > 1 && mag < raw[raw.length - 2][1] ? (cur.fallN || 0) + 1 : 0;
    // picco grezzo: il campione di mezzo è un massimo locale → vertice della parabola (precisione sotto il campione)
    if (raw.length === 3 && !cur.fired){
      const [[ta, a], [tb, b], [tc, c3]] = raw;
      if (b >= a && b >= c3 && b > cur.rawPeak && tb >= cur.t0){
        const den = a - 2*b + c3, off = den < 0 ? Math.max(-.5, Math.min(.5, .5*(a - c3)/den)) : 0;
        cur.rawPeak = b; cur.truePeakT = tb + off*(off < 0 ? tb - ta : tc - tb);
        // valore al vertice della parabola (al massimo il 15% sopra il campione: con il rumore la parabola esagera)
        cur.rawTop = den < 0 ? Math.min(b*1.15, b - (a - c3)**2/(8*den)) : b;
      }
    }
    if (sm > cur.peak){ cur.peak = sm; cur.peakT = k.t; if (w) cur.peakW = w; if(k.accG) cur.gravity=unit(k.accG.map((v,i)=>v-(k.acc?.[i]||0))); }
    if (!cur.fired && k.acc && k.accG){
      const g = [k.accG[0] - k.acc[0], k.accG[1] - k.acc[1], k.accG[2] - k.acc[2]], gl = len(g);
      if (gl > 5){ cur.up += dot(k.acc, g)/gl*dt; cur.tot += len(k.acc)*dt; }
    }
    const minAngle = serving() ? Math.min(2.5,prof.minAngle) : Math.min(prof.minAngle,...(prof.templates||[]).map(t=>Math.max(2,t.angle*.35)));
    const ready = cur.peak >= T.minPeak && cur.angle >= minAngle && k.t - cur.t0 >= C.minDur;
    // picco passato: la velocità grezza è già scesa (sotto l'88% del picco, o in calo da due campioni), prima della
    // media mobile; oppure è scesa la media, oppure niente di nuovo da «plateau» ms
    const rawPast = cur.rawPeak > 0 && k.t > cur.truePeakT && cur.rawPeak >= T.minPeak && (mag < cur.rawPeak*C.rawDrop || (cur.fallN >= 2 && mag < cur.rawPeak*C.rawFall));
    if (!cur.fired && ready && (rawPast || sm < cur.peak*.9 || k.t - cur.peakT >= C.plateau)){ cur.fired = true; fire(k.t); }
    if (sm < T.on*.6 || k.t - cur.t0 > C.maxDur){ cur = null; }
  }
  // Passo «fermo»: finestra scorrevole di stillTime ms. Fermo vuol dire rotazione mediana entro stillMax e nessun
  // campione oltre stillPeak: il tremolio della mano resta, un movimento vero no. Prima bastava un campione oltre 35 °/s
  // per ripartire da capo, e con un tremolio di 25 °/s il passo durava fino a 3,7 s (banco del telefono simulato)
  function feedStill(k){
    const m = k.rot ? len(k.rot) : null;
    if (finishAt){ settle([{ t: k.t, rot: k.rot, g: k.accG, m }], true); return; }
    if (m != null && m > C.stillPeak){ still = null; emit('status', { s: 'move' }); return; }
    (still ||= []).push({ t: k.t, rot: k.rot, g: k.accG, m });
    while (still.length > 1 && k.t - still[1].t >= C.stillTime) still.shift();
    if (k.t - still[0].t < C.stillTime) return;
    const mags = still.filter(s => s.m != null).map(s => s.m);
    if (mags.length && quantile(mags, .5) > C.stillMax){ emit('status', { s: 'move' }); return; }
    settle(still);
  }
  // dalla finestra: gravità (come si tiene il telefono), deriva solo se plausibile (altrimenti era il movimento della
  // mano, e si tiene zero), rumore come 90° percentile (con il massimo un picco isolato alzava tutte le soglie).
  // forced («Salta» prima della fine del passo): nessuna deriva (il giroscopio del browser è già compensato) e rumore
  // al massimo stillMax, perché la finestra può contenere un movimento
  function settle(win, forced = false){
    const rots = win.filter(s => s.rot), gs = win.filter(s => s.g), steady = gs.filter(s => Math.abs(len(s.g) - 9.81) < 1.5);
    const mean = rots.length ? [0, 1, 2].map(i => rots.reduce((a, s) => a + s.rot[i], 0)/rots.length) : [0, 0, 0];
    prof.bias = !forced && len(mean) <= C.biasMax ? mean : [0, 0, 0];
    const p90 = rots.length ? quantile(rots.map(s => len(s.rot.map((v, i) => v - prof.bias[i]))), .9) : null;
    prof.noise = p90 == null ? 5 : Math.max(1, forced ? Math.min(C.stillMax, p90) : p90);
    const g = unit((steady.length ? steady : gs).reduce((a, s) => a.map((v, i) => v + s.g[i]), [0, 0, 0]));
    if (len(g) || !prof.gravity) prof.gravity = g;
    still = null; finishAt = false; mode = 'run'; emit('status', { s: 'still-ok', gravity: prof.gravity, ...(forced ? { forced: true } : {}) });
  }
  function fire(t){
    const c = cur, axis = unit(c.peakW);
    const lift = c.tot > 0 ? Math.max(-1, Math.min(1, c.up/c.tot*1.6)) : 0;
    const along = prof.axis ? dot(axis, prof.axis) : 0;
    let dir = !prof.axis ? 0 : along > .25 ? 1 : along < -.25 ? -1 : 0;   // +1 da destra a sinistra, -1 da sinistra a destra
    // impugnatura cambiata dopo la calibrazione (telefono girato nella mano, polso che prona a fine colpo): l'asse
    // imparato nel riferimento del telefono non riconosce più il colpo, che prima spariva senza messaggio. Il verso
    // allora viene dalla rotazione attorno alla verticale, che non dipende da come si tiene il telefono
    const turn = dir || !prof.axis ? null : aroundVertical(axis, c.gravity || prof.gravity, prof.axis, prof.gravity);
    if (turn) dir = turn;
    // ancora nessun verso: il gesto è dominato dalla rotazione del polso (asse al picco quasi orizzontale), ma la mano
    // gira comunque attorno alla verticale; il segno si confronta con quello del colpo di calibrazione
    if (!dir && prof.axis){ const t = netTurn(c.turn, c.angle), ref = prof.gravity ? dot(unit(prof.axis), unit([prof.gravity[2], prof.gravity[0], prof.gravity[1]])) : 0; if (t && Math.abs(ref) >= .3) dir = t*Math.sign(ref); }
    // senza calibrazione (profilo semplice, «Salta»): verso assoluto dalla rotazione attorno alla verticale, che non
    // dipende da come si tiene il telefono. Prima restava 0 per ogni colpo e il lato lo decideva la palla
    if (!dir && !prof.axis) dir = absSign*(netTurn(c.turn, c.angle, .2) || verticalTurn(axis, c.gravity || prof.gravity, .35));
    const vert = verticalGesture(axis, c.gravity || prof.gravity, lift, along);
    // istante del colpo: il picco grezzo interpolato, se c'è ed è vicino a quello della media mobile
    const peakT = c.rawPeak > 0 && Math.abs(c.truePeakT - c.peakT) < 60 ? +c.truePeakT.toFixed(1) : c.peakT;
    const serveExamples=(prof.templates||[]).filter(t=>t.shot==='serve');
    const reference = prof.refs?.[dir] || prof.ref;
    const powerReference=serving() && serveExamples.length ? serveExamples.reduce((s,t)=>s+t.peak,0)/serveExamples.length:reference;
    const gravity=c.gravity||prof.gravity||[0,1,0];
    const dur = t - c.t0;
    const features={lift,tilt:Math.max(-1,Math.min(1,gravity[2]-(prof.gravity?.[2]||0))),twist:canonicalTwist(axis,prof.axis,gravity,dir),speed:c.peak/reference,duration:dur,travel:c.angle/(prof.refAngle||c.angle||1)};
    const intent=gestureFloor(prof,dir,features,context);
    const floor=prof.intentGate&&!serving()?thr().minPeak:Math.max(thr().minPeak,intent.floor*prof.sens);
    const minAngle=serving()?2:Math.min(prof.minAngles?.[dir]||prof.minAngle,...(prof.templates||[]).filter(t=>t.shot===intent.shot).map(t=>Math.max(2,t.angle*.35)));
    // rientro in posizione subito dopo un colpo, nel verso opposto: non è un colpo (né una preparazione)
    if (!training && !serving() && lastDir && dir === -lastDir && c.peakT - lastFire < C.recoverWindow && c.peak < lastPeak*C.recoverStrong){ setPhase('follow'); return; }
    // gesto verticale (dal basso verso l'alto o dall'alto verso il basso): non è né dritto né rovescio, ma è un colpo
    const vertical = dir === 0 && !!vert && !serving() && c.peak >= Math.max(thr().minPeak, (prof.ref || 600)*.4);
    if (!training && ((prof.axis && dir === 0 && !vertical && !serving() && !(context==='practice' && intent.shot==='serve')) || (!vertical && c.peak < floor) || c.angle < minAngle)){
      setPhase('preparation');
      // movimento troppo piccolo per un colpo: in modalità preparazione è la racchetta che si carica
      // (non dopo un gesto trattenuto nel verso opposto: lì è il rientro della mano)
      if (prepMode && dir !== 0 && !serving() && !(held && dir === -held.sw.dir)) emit('prep', { peakT: c.peakT, dir, peak: Math.round(c.peak), angle: Math.round(c.angle), small: true });
      return;
    }
    // forza: il proprio colpo tipico vale circa 0,65, il doppio arriva al massimo (prima già 1,55 volte bastava e quasi
    // ogni colpo deciso usciva al massimo, quindi «piatto»)
    const power = Math.max(.3, Math.min(1, .3 + .35*c.peak/powerReference));
    // Soglie iniziali di palla corta e slice; la durata del sensore è in millisecondi.
    const special = classifySwingType({ power, lift, dur }, prof.lobLift);
    // rawPeak: velocità vera al picco (vertice della parabola sui campioni grezzi). peak resta il massimo della media
    // mobile, che decide le soglie: negli swing corti è molto più basso del vero (50° a 1100 °/s: 72%)
    const sw = { phase: 'contact', peakT, t, peak: Math.round(c.peak), rawPeak: Math.round(Math.max(c.rawTop || 0, c.rawPeak || 0) || c.peak), power: +power.toFixed(3), dir, along: +along.toFixed(2), axis, gravity, lift: +lift.toFixed(3), ...special, ...intent, features, angle: Math.round(c.angle), dur,
      ...(vert ? { vert } : {}), turn: +c.turn.toFixed(1), detectMs: +Math.max(0, t - peakT).toFixed(1) };
    if (prepMode && !training && !serving()){
      // un gesto trattenuto e ora quello opposto: il primo era la preparazione
      if (held && dir !== 0 && dir === -held.sw.dir && c.peak < held.sw.peak*C.prepFollow){ const h = held; held = null; commit(h.sw, t); setPhase('follow'); return; }
      if (held && dir !== 0 && dir === -held.sw.dir){ emit('prep', { peakT: held.sw.peakT, dir: held.sw.dir, peak: held.sw.peak, angle: held.sw.angle }); held = null; }
      else if (held){ const h = held; held = null; release(h.sw, t); }
      // solo un gesto debole può essere la preparazione: un colpo pieno nel verso «sbagliato» parte subito (prima
      // aspettava 250 ms anche i colpi veri, e arrivavano in ritardo)
      if (expectDir && dir === -expectDir && c.peak < reference*C.prepWeak){ held = { sw, until: c.peakT + C.prepHold }; setPhase('preparation'); return; }
    }
    commit(sw, t);
  }
  // segno dei sensori senza calibrazione: i colpi netti (forza almeno da colpo normale) con il verso atteso noto votano;
  // quasi tutti al contrario vuol dire sensori con il segno opposto (la calibrazione lo scopre con vsign)
  function vote(sw){
    if (!expectDir || !sw.dir || (sw.features?.speed ?? 0) < .6) return;
    if (sw.dir === expectDir) votes.agree++; else votes.against++;
    const n = votes.agree + votes.against;
    if (n >= C.signVotes && votes.agree/n <= C.signAgree){ absSign = -absSign; sw.dir = -sw.dir; votes = { agree: votes.against, against: votes.agree }; emit('status', { s: 'sign', sign: absSign }); }
  }
  // gesto trattenuto senza il colpo opposto: se è lento era una preparazione rimasta a metà (nelle registrazioni questi
  // gesti partivano 250 ms dopo come colpi lenti e quasi mai prendevano la palla), altrimenti vale come colpo
  function release(sw, now){
    if ((sw.features?.speed ?? 1) < C.prepSlow){ emit('prep', { peakT: sw.peakT, dir: sw.dir, peak: sw.peak, angle: sw.angle, small: true }); setPhase('ready'); return; }
    commit(sw, now);
  }
  // now: istante in cui il colpo parte davvero (dopo l'eventuale attesa della preparazione), per misurare i ritardi
  function commit(sw, now = sw.t){
    sw.holdMs = +Math.max(0, now - sw.t).toFixed(1);
    if (!prof.axis && !training && !serving()) vote(sw);
    lastFire = sw.peakT; lastDir = sw.dir || 0; lastAxis = sw.axis || null; lastPeak = sw.peak || 0;
    if (!training){ recovering = !serving(); quietSince = null; setPhase('contact'); }
    emit('swing', sw);
  }

  return {
    config: C,
    get profile(){ return prof; },
    get mode(){ return mode; },
    get phase(){ return phase; },
    get context(){return context;},
    setContext(value){ const next=['serve','toss','practice'].includes(value)?value:'play';if(context!==next){context=next;reset();} },
    setTraining(v){ training = !!v; reset(); },
    setArmed(v){ armed = !!v; if (!armed) cur = null; },
    // modalità preparazione e verso del colpo atteso (+1 da destra a sinistra, -1 da sinistra a destra, 0 non si sa)
    setPrepMode(v){ prepMode = !!v; if (!prepMode){ expectDir = 0; held = null; } },
    setExpect(d){ expectDir = d === 1 ? 1 : d === -1 ? -1 : 0; },
    get prepMode(){ return prepMode; },
    get last(){ return last; },
    on(k, f){ listeners[k].push(f); return this; },
    feed,
    // telefono fermo: deriva e rumore del giroscopio, verso della gravità (come si tiene il telefono)
    still(){ mode = 'still'; still = null; finishAt = false; cur = null; },
    // «Salta» prima della fine del passo «fermo»: si gioca subito, con la gravità dei campioni già arrivati (o del primo
    // che arriva). Prima il rilevatore restava ad aspettare il telefono fermo e nessun colpo partiva
    finishStill(){ if (mode !== 'still') return false; if (still?.length) settle(still, true); else finishAt = true; return true; },
    // deriva solo se plausibile anche dai profili salvati prima (alcuni avevano il movimento della mano come deriva)
    setProfile(p){ const b = p.bias || prof.bias; prof = { ...defaultProfile(), ...p, bias: b && len(b) <= C.biasMax ? b : [0, 0, 0] }; armed = !prof.intentGate; absSign = 1; votes = { agree: 0, against: 0 }; reset(); },
    get absSign(){ return absSign; },
    setThresholds(t){ prof = { ...prof, ...t }; },
    setSensitivity(k){ prof = { ...prof, sens: k }; },      // k < 1 più sensibile
    stop(){ mode = 'off'; reset(); },
    run(){ mode = 'run'; reset(); },
  };
}

// dai dati di un evento devicemotion del browser a un campione per il rilevatore
export function sampleFromMotion(e, t){
  const r = e.rotationRate, a = e.acceleration, g = e.accelerationIncludingGravity;
  const ok3 = v => v && [v.x ?? v.alpha, v.y ?? v.beta, v.z ?? v.gamma].every(n => typeof n === 'number' && isFinite(n));
  return {
    t,
    rot: r && ok3(r) ? [r.alpha, r.beta, r.gamma] : null,
    acc: a && ok3(a) ? [a.x, a.y, a.z] : null,
    accG: g && ok3(g) ? [g.x, g.y, g.z] : null,
  };
}
export { len, dot, unit };
