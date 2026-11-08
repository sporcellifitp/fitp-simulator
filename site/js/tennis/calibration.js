// Calibrazione guidata del telefono-racchetta. Senza DOM: la usa la pagina del telefono, il computer ne mostra i passi.
// Percorso rapido: fermo nella propria presa → due gesti comodi (dritto e rovescio) → prova libera. I gesti sono
// facoltativi: verso, tipo di colpo e forza si leggono anche senza («Salta», profilo semplice); i gesti aggiungono il
// colpo tipico (forza relativa), l'asse del proprio gesto e il piatto abituale. Prima erano quattro: con le pause per
// fermarsi al centro la calibrazione durava più di 8 s anche con gesti perfetti.
// Il percorso esteso per allenare ogni colpo resta disponibile esplicitamente con quick:false.
// Dagli swing veri escono le soglie su misura (colpo tipico, soglia d'inizio, picco minimo) e l'asse del colpo, che dice
// la direzione. Se non va (movimenti troppo piccoli, direzioni non distinguibili, nessun movimento) si spiega cosa fare
// e la partita col telefono non parte.
import { unit, dot, len, verticalTurn, netTurn } from './swing-detect.js';
import { canonicalTwist } from './gesture-intent.js';
import { faceReference, flatGrip } from './face-tracker.js';

export const PLAN = ['L', 'L', 'L', 'R', 'R', 'R'];      // L: da destra a sinistra (←), R: da sinistra a destra (→)
export const QUICK_PLAN = ['L', 'R'];
// Percorso per la mano (B15, 08/11): prima il dritto, poi il rovescio, a tutti e due. Il dritto del destro è «L» (da
// destra a sinistra), quello del mancino è «R»: prima il mancino faceva i gesti nell'ordine del destro (rovescio, poi
// dritto), con il computer che gli chiedeva «Rovescio ←» per primo. Il verso dei gesti e il profilo non cambiano: cambia
// solo l'ordine in cui si chiedono
const flipPlan = plan => plan.map(w => (w === 'L' ? 'R' : 'L'));
export const QUICK_PLAN_LEFT = Object.freeze(flipPlan(QUICK_PLAN));
export const PLAN_LEFT = Object.freeze(flipPlan(PLAN));
export const calibrationPlan = options => (options?.hand === 'left' ? (options?.quick ? QUICK_PLAN_LEFT : PLAN_LEFT) : options?.quick ? QUICK_PLAN : PLAN);
// gesti riusciti per verso perché la calibrazione passi: tutti nel percorso rapido (uno per verso), due su tre nell'esteso
export const calibrationNeed = options => options?.quick ? 1 : 2;
export const GESTURE_PLAN = [
  ...['L','R'].map(want=>({shot:'slice',want,hint:'Inclina il piatto e accompagna di taglio verso il basso, senza forzare il polso.'})),
  ...['L','R'].map(want=>({shot:'lob',want,hint:'Accompagna dal basso verso l’alto con un movimento comodo.'})),
  ...['L','R'].map(want=>({shot:'drop',want,hint:'Piatto leggermente aperto e gesto corto e morbido: rallentare soltanto non basta.'})),
  { shot: 'serve', want: null, label: 'Lancio', hint: 'Alza il telefono con un gesto comodo per lanciare la palla.' },
  { shot: 'serve', want: null, label: 'Battuta', hint: 'Simula la battuta: conta il tuo movimento, anche compatto.' },
];
const SIGN = { L: 1, R: -1 };
const FEATURE_SCALE = { lift: .35, tilt: .25, twist: .3, speed: .5, duration: 180, travel: .6 };
const templateFeatures = (sw, ref, refAngle, frame, dir) => Object.fromEntries(Object.keys(FEATURE_SCALE).map(key => [key, key === 'twist' && sw.axis && sw.gravity && frame ? canonicalTwist(sw.axis,frame,sw.gravity,dir) : key === 'speed' ? sw.peak/Math.max(1, ref) : key === 'travel' ? (sw.angle || refAngle)/Math.max(1, refAngle) : Number.isFinite(sw.features?.[key]) ? sw.features[key] : key === 'lift' ? sw.lift || 0 : key === 'duration' ? sw.dur || 0 : 0]));
// Le differenze di ampiezza da sole non bastano per inventare un colpo: anche orientamento e andamento devono distinguerlo.
const featureDistance = (a, b) => Math.sqrt(Object.entries(FEATURE_SCALE).reduce((sum, [key, scale]) => sum + ((a[key] - b[key])/scale)**2, 0)/Object.keys(FEATURE_SCALE).length);
export const CAL = {
  low: { on: 25, minPeak: 40, minAngle: 2.5 },  // soglie basse durante la calibrazione: si vedono anche i movimenti piccoli
  small: 90,                      // °/s: sotto, lo swing è troppo piccolo
  burst: 380,                      // ms: movimenti vicini sono un solo tentativo (apertura + colpo): vale il più forte
  prepWait: 900,                   // ms: un gruppo nel verso opposto a quello chiesto può essere l'apertura lenta di un
                                   // colpo completo (il suo picco è a metà apertura, il colpo arriva 0,5–0,6 s dopo): si
                                   // aspetta il colpo prima di giudicarlo, finché la mano non si ferma davvero:
  prepPause: 400,                  // ms di quiete (la fine lenta dell'apertura e il passaggio al colpo ne fanno ~200)
  maxTries: 3,                     // tentativi per swing prima di andare avanti segnando l'errore
  idleHint: 7000,                  // ms senza movimenti: suggerimento
  gripHold: 400,                   // ms in verticale per confermare l'impugnatura
  flatStill: 2000,                 // ms fermi in posizione «pronto» con la presa orizzontale (telefono = piatto)
  recovery: .4,                    // un movimento sotto il 40% del picco dei gesti già riconosciuti è il rientro della mano
  // Ogni gesto parte da fermo. Dopo un gesto la mano torna al centro, e quel rientro va nel verso del gesto successivo
  // (dopo «verso destra» si torna verso sinistra): finché la mano non si ferma un attimo nessun movimento è un tentativo.
  settle: 220,                     // ms di quiete prima di accettare il gesto successivo
  // Il primo gesto e l'avvio. Sessione del 29/10 (stesso schermo, «Ricalibra» dopo lo schermo spento): la calibrazione
  // partiva subito, mentre il telefono si prendeva ancora in mano, e sistemare la presa diventava il primo gesto
  firstSettle: 600,                // ms di quiete prima del primo gesto (poi settle), con l'avvio da un comando (lead)
  lead: 1500,                      // ms dopo «Ricalibra» (o la richiesta del computer) prima di misurare il telefono fermo
  quiet: 50,                       // °/s: sotto (o sotto 3 volte il rumore misurato, o il 30% del proprio gesto) è «fermo»
  settleHint: 1500,                // ms senza fermarsi: si chiede di fermarsi al centro
  tremor: 4,                       // gradi (fino al picco): un movimento debole che percorre meno di così è un tremolio
  homeFar: .35,                    // rientro: parte lontano dal punto di partenza del gesto prima (oltre il 35% del suo
  homeWeak: .75,                   // percorso), torna verso di lui ed è più lento del 75% dei gesti riconosciuti
  homeKeep: 2500,                  // ms: oltre, il punto di partenza del gesto prima non conta più
  homeRest: 600,                   // ms fermi lontano dal centro: chi si ferma lì ha scelto da dove partire, non rientra
  prefer: .5,                      // nel gruppo vale il gesto nel verso richiesto se è almeno metà del più forte (la
                                   // preparazione nel verso opposto può essere più veloce del colpo)
  flipTrust: 2,                    // primo gesto chiaramente al contrario (rotazione attorno alla verticale): si chiede di
                                   // rifarlo; alla terza volta di fila si accetta (telefoni con il segno opposto)
  vertical: .35,                   // gesti dopo il primo: il verso viene dalla verticale se ci gira attorno almeno così
                                   // (coseno tra asse di rotazione e verticale), altrimenti dall'asse imparato
  netTurn: .2,                     // … o se la rotazione netta attorno alla verticale è almeno il 20% del percorso del gesto
  balance: 3.5,                    // i due versi riusciti non possono differire di più di così (picco tipico): il 23/10
                                   // un dritto da 143 °/s e un rovescio da 1105 davano soglie da rumore per tutta la partita
};
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1)/2] : (s[s.length/2 - 1] + s[s.length/2])/2) : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// telefono in verticale: la gravità sta lungo l'asse lungo del telefono (y)
export const upright = g => !!g && Math.abs(g[1])/Math.max(1e-6, Math.hypot(g[0], g[1], g[2])) >= .72;

export function createCalibration(det){
  const L = [];
  const S = { step: 'idle', idx: 0, tries: 0, attempts: [], axis: null, result: null, profile: null, burst: [], burstT: 0, idleT: 0, gripT: null, lastT: 0, options: { range: 'standard', hand: 'right', intentGate: false }, practice: 0, templates: [], shotAttempts: [], ready: false, readyAt: 0, quietT: null, settleT: 0, settleHinted: false, rot: [0, 0, 0], track: [], home: null, quietSpan: 0, flipTries: 0, vsign: 1, first: false, slow: false, leadUntil: 0, plan: null };
  // percorso fissato all'avvio (start, retry): la mano può cambiare a calibrazione in corso (racchetta.js applyHand:
  // menu, «cfg» dal computer, pulsanti della mano dello stesso schermo) e ricalcolarlo a ogni gesto girava i passi
  // ancora da fare (dopo il primo gesto si chiedeva di nuovo lo stesso verso: calibrazione fallita, «direzione»).
  // Il verso dei gesti misura il telefono, non la mano: la mano nuova cambia solo la scritta Dritto/Rovescio
  const plan = () => S.plan || calibrationPlan(S.options);
  const total = () => plan().length + (S.options.gestural && !S.options.quick ? GESTURE_PLAN.length : 0);
  const emit = e => { for (const f of L) f({ ...e, step: S.step }); };
  const guided = () => S.step === 'swings' || S.step === 'shots';
  // si torna ad aspettare la mano ferma: all'inizio dei gesti e dopo ogni tentativo
  // (la quiete già in corso vale: chi si è fermato mentre si aspettava la fine del gruppo è subito pronto)
  const unready = () => { S.ready = false; S.settleT = S.lastT; S.settleHinted = false; };
  const quietLimit = () => { const ok = S.attempts.filter(a => a.ok).map(a => a.peak); return Math.max(CAL.quiet, (det.profile.noise || 3)*3, ok.length ? .3*median(ok) : 0); };
  // posizione della mano lungo l'asse del colpo (gradi integrati dal giroscopio): dice dove inizia ogni gesto e se un
  // movimento riporta la mano al punto di partenza del gesto prima (il rientro) invece di essere un gesto nuovo
  // (si integra il vettore e lo si proietta sull'asse quando serve: vale anche per il primo gesto, che l'asse lo fissa)
  const rotAt = t => { let r = S.track.length ? S.track[0][1] : S.rot; for (const [tt, v] of S.track){ if (tt > t) break; r = v; } return r; };
  const posAt = t => S.axis ? dot(rotAt(t), S.axis) : 0;
  const okPeaks = () => S.attempts.filter(a => a.ok).map(a => a.peak);
  // solo il primo movimento dopo un gesto può essere il rientro: poi il punto di partenza non conta più (la
  // preparazione e il colpo seguenti partono anche loro lontano dal centro)
  function isReturn(sw){
    const h = S.home; S.home = null;
    if (!h || !S.axis || sw.t - h.t > CAL.homeKeep || S.quietSpan >= CAL.homeRest) return false;
    const off = posAt(sw.t - (sw.dur || 0)) - dot(h.rot, S.axis), travel = Math.max(1, ...h.path.map(r => Math.abs(dot(r, S.axis) - dot(h.rot, S.axis))));
    const way = Math.sign(dot(sw.axis, S.axis)), ok = okPeaks();
    return off*way < 0 && Math.abs(off) > CAL.homeFar*travel && (!ok.length || sw.peak < CAL.homeWeak*median(ok));
  }
  const motion = k => { const b = det.profile.bias || [0, 0, 0]; return k?.rot ? len(k.rot.map((v, i) => v - (b[i] || 0))) : k?.acc ? len(k.acc)*30 : 0; };

  det.on('status', s => {
    if (S.step !== 'still' || S.leadUntil !== 0) return;
    // «stai fermo» al massimo ogni mezzo secondo (prima uno per campione: 100 avvisi in 2,5 s nella sessione del 22/10)
    if (s.s === 'move' && !(S.lastT - (S.moveWarnT ?? -1e9) < 500)){ S.moveWarnT = S.lastT; emit({ kind: 'warn', why: 'move' }); }
    if (s.s === 'still-ok'){
      // Any comfortable grip is a valid personal frame; no compulsory upright pose.
      S.step = S.options.quick ? 'swings' : 'grip'; S.gripT = null; S.idleT = S.lastT; unready();
      // avvio da un comando: la quiete per il primo gesto si conta da quando compare la richiesta (quella del passo
      // «fermo» non vale: subito dopo si sistema la presa, e quel movimento era preso per il primo gesto)
      if (S.first) S.quietT = null;
      emit({ kind: 'step', gravity: s.gravity, upright: upright(s.gravity), ...(S.options.grip === 'flat' ? { grip: 'flat', flat: flatGrip(s.gravity) } : {}), ...(S.options.quick ? { want: plan()[0], shot:'drive', idx:0, total:total(), quick:true } : {}) });
    }
  });
  det.on('swing', sw => {
    if (!['swings', 'shots', 'free'].includes(S.step)) return;
    S.idleT = sw.peakT;
    // iniziato prima che la mano si fermasse: è il rientro al centro (o la coda del gesto prima), non un tentativo
    // Il primo movimento di un gruppo che parte prima che la mano si fermi, o che la riporta al punto di partenza del
    // gesto prima, è il rientro al centro: resta nel gruppo (il colpo che lo segue subito conta) ma non è un tentativo
    const first = guided() && !S.burst.length, back = first && isReturn(sw);
    if (first && (back || !S.ready || sw.t - (sw.dur || 0) < S.readyAt)) sw = { ...sw, back: true };
    S.burst.push(sw); S.burstT = sw.peakT;
  });

  // Rientro in posizione dopo un gesto (o un tremolio): molto più debole dei gesti già riconosciuti. Non è un tentativo:
  // prima veniva preso per il gesto successivo (il rientro dopo «verso sinistra» diventava «verso destra»), il gesto
  // vero risultava «direzione sbagliata» e il profilo usciva con soglie bassissime.
  const isRecovery = sw => { const ok = S.attempts.filter(a => a.ok).map(a => a.peak); return ok.length > 0 && sw.peak < CAL.recovery*median(ok); };
  // un tentativo = il movimento più forte di un gruppo ravvicinato (così l'apertura non conta come colpo)
  function attempt(sw, group = []){
    if (S.step === 'swings' && isRecovery(sw)){ emit({ kind: 'warn', why: 'rientro', peak: sw.peak }); return; }
    const along = S.axis ? dot(sw.axis, S.axis) : null;
    if (S.step === 'free'){
      const dir = Number.isFinite(sw.dir) ? sw.dir : along == null ? 0 : along > .25 ? 1 : along < -.25 ? -1 : 0;
      const valid = dir !== 0 || sw.shot === 'serve';
      emit({ kind: 'free', dir: dir > 0 ? 'L' : dir < 0 ? 'R' : '?', peak: sw.peak, strength: sw.peak/(S.profile?.refs?.[dir] || S.profile?.ref || 600), power: sw.power, lift: sw.lift, dirValue: dir, peakT: sw.peakT, angle: sw.angle, dur: sw.dur, shot: sw.shot || 'drive', aim: sw.aim, confidence: sw.confidence, features: sw.features, ok: valid });
      if (valid) S.practice++;
      return;
    }
    if (S.step === 'shots'){ setHome(group.length ? group : [sw]); shotAttempt(sw); return; }
    const want = plan()[S.idx];
    const minimum = Math.max(S.options.quick ? 40 : S.options.range === 'compact' ? 40 : CAL.small, (det.profile.noise || 3)*5);
    // tremolio della mano ferma: debole e quasi senza percorso. Non consuma un tentativo (prima ne bastavano tre per
    // saltare un gesto senza essersi mossi)
    if (sw.peak < minimum && (sw.angle || 0) < CAL.tremor){ emit({ kind: 'warn', why: 'tremolio', peak: sw.peak }); return; }
    const small = sw.peak < minimum;
    let dir = '?';
    if (!S.axis && S.idx === 0){
      // il primo swing (il dritto: da destra a sinistra per il destro, da sinistra a destra per il mancino) fissa il
      // verso. Prima si accettava qualunque verso: un primo gesto al contrario invertiva tutta la calibrazione (il gesto
      // «verso destra» dopo risultava «verso sinistra»). Ora, se la rotazione attorno alla verticale dice chiaramente il
      // contrario, è un tentativo nel verso sbagliato; dopo CAL.flipTrust volte di fila si accetta comunque (telefoni che
      // riportano la rotazione con il segno opposto). L'asse imparato (S.axis) è sempre quello del gesto «L»
      const turn = small ? 0 : verticalTurn(sw.axis, sw.gravity), wantSign = SIGN[want], other = want === 'L' ? 'R' : 'L';
      if (turn === -wantSign && S.flipTries < CAL.flipTrust){ S.flipTries++; dir = other; }
      else { if (turn === -wantSign) S.vsign = -1; S.axis = sw.axis.map(v => v*wantSign); dir = want; S.flipTries = 0; }
    }
    else {
      // verso dei gesti dopo il primo: prima di tutto la rotazione attorno alla verticale (dritto e rovescio girano
      // attorno alla verticale in versi opposti, con qualunque presa). Prima contava solo l'asse del primo gesto, che
      // contiene anche la rotazione del polso: con il polso che prona il rovescio non risultava più «opposto» e la
      // calibrazione falliva (gesti piccoli o normali con pronazione: 168 prese/gesti su 432 nell'audit)
      // (rotazione netta del gesto attorno alla verticale, se c'è; altrimenti l'asse al picco rispetto alla verticale)
      const v = small ? 0 : S.vsign*(netTurn(sw.turn, sw.angle, CAL.netTurn) || verticalTurn(sw.axis, sw.gravity, CAL.vertical));
      dir = v > 0 ? 'L' : v < 0 ? 'R' : along == null ? '?' : along > .3 ? 'L' : along < -.3 ? 'R' : '?';
    }
    const ok = !small && dir === want;
    const a = { want, dir, peak: sw.peak, lift: sw.lift, axis: sw.axis, gravity: sw.gravity, angle: sw.angle || 6, features: sw.features, dur: sw.dur, ok, small, face: sw.face || null, head: Number.isFinite(sw.head) ? sw.head : null, rise: Number.isFinite(sw.shape?.rise) ? sw.shape.rise : null, rawPeak: Number.isFinite(sw.rawPeak) ? sw.rawPeak : null, preparations: group.filter(x => !x.back && x.peakT < sw.peakT && dot(x.axis, sw.axis) < -.3).map(x => ({ peak: x.peak, axis: x.axis })) };
    S.attempts.push(a);
    if (ok){
      // asse aggiornato con tutti gli swing riusciti (con il loro segno)
      const sum = [0, 0, 0];
      for (const x of S.attempts) if (x.ok) for (let i = 0; i < 3; i++) sum[i] += x.axis[i]*SIGN[x.want];
      S.axis = unit(sum);
    } else if (S.idx === 0 && small) S.axis = null;
    S.tries = ok ? 0 : S.tries + 1;
    const advance = ok || S.tries >= CAL.maxTries;
    setHome(group.length ? group : [sw]);
    unready();
    emit({ kind: 'attempt', ...a, shot: 'drive', axis: undefined, idx: S.idx, globalIdx: S.idx, total: total(), tries: S.tries, why: ok ? null : small ? 'piccolo' : 'direzione' });
    if (advance){ S.idx++; S.tries = 0; if (S.idx >= plan().length) review(); else emit({ kind: 'next', idx: S.idx, globalIdx: S.idx, want: plan()[S.idx], shot: 'drive' }); }
  }
  // il tentativo di un gruppo ravvicinato: il più forte, ma se c'è un gesto nel verso richiesto abbastanza deciso vale
  // quello (la preparazione nel verso opposto non deve far leggere la direzione sbagliata)
  // punto di partenza del gruppo appena valutato e quanto la mano se n'è allontanata
  function setHome(group){
    const start = Math.min(...group.filter(s => !s.back).map(s => s.t - (s.dur || 0))) - 40;
    S.home = { t: S.lastT, rot: rotAt(start), path: S.track.filter(([t]) => t >= start).map(([, r]) => r) };
  }
  const wantSignNow = () => (S.step === 'swings' ? SIGN[plan()[S.idx]] : S.step === 'shots' ? SIGN[GESTURE_PLAN[S.idx]?.want] : null);
  // verso di ogni gesto: rispetto all'asse imparato, o (primo gesto, asse ancora da fissare) attorno alla verticale,
  // così la preparazione nel verso opposto non diventa il primo gesto e non inverte la calibrazione
  const way = s => (S.axis ? Math.sign(Math.trunc(dot(s.axis, S.axis)/.3)) : verticalTurn(s.axis, s.gravity));
  function pick(group){
    const best = group.reduce((a, s) => s.peak > a.peak ? s : a);
    const wantSign = wantSignNow();
    if (!wantSign) return best;
    const match = group.filter(s => way(s) === wantSign && s.peak >= CAL.prefer*best.peak);
    return match.length ? match.reduce((a, s) => s.peak > a.peak ? s : a) : best;
  }
  function review(){
    const ok = S.attempts.filter(a => a.ok), okL = ok.filter(a => a.want === 'L'), okR = ok.filter(a => a.want === 'R');
    const medL = median(okL.map(a => a.peak)), medR = median(okR.map(a => a.peak)), base = Math.min(medL || 1e9, medR || 1e9);
    const need = calibrationNeed(S.options), enough = okL.length >= need && okR.length >= need;
    // un verso molto più debole dell'altro: quel gesto non era un colpo vero (si rifanno i due gesti)
    const unbalanced = enough && medL > 0 && medR > 0 && Math.max(medL, medR) > CAL.balance*Math.min(medL, medR), pass = enough && !unbalanced;
    const fails = S.attempts.filter(a => !a.ok);
    const why = pass ? null : unbalanced ? 'squilibrio' : fails.some(a => a.small) && fails.filter(a => a.small).length >= fails.length/2 ? 'piccolo' : 'direzione';
    S.profile = pass ? {
      version: S.options.quick ? 4 : S.options.gestural ? 3 : 2, automaticGesture: S.options.quick, ...S.options, bias: det.profile.bias, noise: det.profile.noise, gravity: det.profile.gravity, axis: S.axis, ref: Math.max(60, median(ok.map(a => a.peak))),
      refs: { 1: medL, '-1': medR }, refAngle: Math.max(2, median(ok.map(a => a.angle))),
      // colpo tipico con la velocità vera al picco (rawPeak): la forza sul computer si misura così, anche negli swing corti
      ...(ok.length && ok.every(a => Number.isFinite(a.rawPeak)) ? { rawRef: Math.max(60, median(ok.map(a => a.rawPeak))) } : {}),
      preparation: Object.fromEntries([1, -1].map(dir => [dir, Math.max(0, ...ok.flatMap(a => a.preparations).filter(a => dot(a.axis, S.axis)*dir > .5).map(a => a.peak))])),
      minAngles: { 1: Math.max(2, median(okL.map(a => a.angle))*.25), '-1': Math.max(2, median(okR.map(a => a.angle))*.25) },
      on: clamp(.22*base, 22, 180), minPeak: clamp(.36*base, 35, 300), minAngle: S.options.range === 'compact' ? 2.5 : 5,
      lobLift: ok.some(a => a.lift) ? Math.max(.7, median(ok.map(a => a.lift)) + .45) : null,
    } : null;
    const ambiguous = S.profile && [1,-1].some(d => (S.profile.preparation[d] || 0)*1.2 >= S.profile.refs[d]*.9);
    if (ambiguous && !S.options.quick) S.profile.intentGate = true;
    // need e per (gesti chiesti per verso): chi mostra il riepilogo non deve sapere quale percorso si è fatto
    S.result = { pass, why, ...(unbalanced ? { weak: medL < medR ? 'L' : 'R' } : {}), assisted: S.profile?.intentGate || false, okL: okL.length, okR: okR.length, need, per: plan().filter(w => w === 'L').length, medL: Math.round(medL), medR: Math.round(medR), attempts: S.attempts.map(a => ({ want: a.want, dir: a.dir, peak: a.peak, ok: a.ok })) };
    if (pass && S.options.gestural && !S.options.quick){
      S.templates = ok.map(a => ({ shot: 'drive', dir: SIGN[a.want], peak: a.peak, angle: a.angle, features: templateFeatures(a, S.profile.refs[SIGN[a.want]], S.profile.refAngle, S.axis, SIGN[a.want]) }));
      S.step = 'shots'; S.idx = 0; S.tries = 0; S.burst = []; unready();
      det.setProfile({ ...S.profile, ...CAL.low }); det.setTraining(true);
      emit({ kind: 'step', idx: 0, globalIdx: PLAN.length, total: PLAN.length + GESTURE_PLAN.length, ...GESTURE_PLAN[0] });
    } else {
      // presa orizzontale: il piatto abituale all'impatto del proprio gesto dritto, per leggere poi la mira dal piatto
      // il piatto abituale all'impatto del proprio dritto e rovescio: in partita la mira è lo scarto da questo (entrambe le prese)
      if (pass && S.options.grip === 'flat') S.profile.grip = 'flat';
      if (pass && ok.some(a => a.face)) S.profile.faceRef = faceReference(ok.filter(a => a.face).map(a => ({ dir: SIGN[a.want], yaw: a.face.yaw, pitch: a.face.pitch, abs: a.face.abs, angle: a.angle })));
      // verso verticale del piatto (headAt) dei propri gesti normali, per verso: è il riferimento di pallonetto, tagliato
      // e palla corta sul computer. Prima partiva da 0 e imparava solo dai colpi «normali»: chi ha un dritto morbido con
      // il polso che prona aveva tutti i colpi letti come palle corte, e il riferimento non si correggeva più
      if (pass){ const heads = {}; for (const w of ['L', 'R']){ const h = ok.filter(a => a.want === w && Number.isFinite(a.head)).map(a => a.head); if (h.length) heads[SIGN[w]] = +median(h).toFixed(3); } if (Object.keys(heads).length) S.profile.heads = heads; }
      // salita abituale della testa della racchetta (forma del colpo, stroke-shape.js) dei propri gesti normali, per
      // verso: con il telefono in verticale nel pugno il polso che prona abbassa la testa anche nel colpo normale, e il
      // computer leggeva tagliati (natpf_stroke_intent.js: le soglie dei colpi speciali si spostano da qui)
      if (pass){ const rises = {}; for (const w of ['L', 'R']){ const r = ok.filter(a => a.want === w && Number.isFinite(a.rise)).map(a => a.rise); if (r.length) rises[SIGN[w]] = +median(r).toFixed(3); } if (Object.keys(rises).length) S.profile.rises = rises; }
      if (pass && S.options.quick){
        S.profile.templates = ok.map(a => ({ shot:'drive',dir:SIGN[a.want],peak:a.peak,angle:a.angle,features:templateFeatures(a,S.profile.refs[SIGN[a.want]],S.profile.refAngle,S.axis,SIGN[a.want]) }));
        S.profile.minPeak = Math.max((S.profile.noise || 3)*5, Math.min(S.profile.minPeak, base*.28));
        S.profile.on = Math.max((S.profile.noise || 3)*4, Math.min(S.profile.on, base*.18));
        S.result.quick = true;
      }
      finishReview();
    }
  }

  function finishReview(){
    S.step = 'review';
    emit({ kind: 'review', ...S.result });
  }
  function shotAttempt(sw){
    const guide = GESTURE_PLAN[S.idx], along = dot(sw.axis, S.axis);
    const dir = along > .25 ? 1 : along < -.25 ? -1 : 0;
    // I colpi di fino sono più lenti del piatto. Li confrontiamo con il rumore, non con la forza del drive.
    const small = sw.peak < Math.max(35, (S.profile.noise || 3)*4);
    const ok = !small && (!guide.want || dir === SIGN[guide.want]);
    unready();
    const template = { shot: guide.shot, dir: guide.want ? dir : 0, peak: sw.peak, angle: sw.angle || 3, features: templateFeatures(sw, S.profile.refs[dir] || S.profile.ref, S.profile.refAngle, S.axis, dir) };
    if (ok) S.templates.push(template);
    S.shotAttempts.push({ ...template, ok });
    S.tries = ok ? 0 : S.tries + 1;
    emit({ kind: 'attempt', ...guide, dir: dir > 0 ? 'L' : dir < 0 ? 'R' : '?', dirValue: dir, peak: sw.peak, power: sw.power, lift: sw.lift, features: sw.features, angle: sw.angle, dur: sw.dur, ok, small, idx: S.idx, globalIdx: PLAN.length + S.idx, total: PLAN.length + GESTURE_PLAN.length, tries: S.tries, why: ok ? null : small ? 'piccolo' : 'direzione' });
    if (!ok && S.tries < CAL.maxTries) return;
    S.idx++; S.tries = 0;
    if (S.idx < GESTURE_PLAN.length){ emit({ kind: 'next', idx: S.idx, globalIdx: PLAN.length + S.idx, total: PLAN.length + GESTURE_PLAN.length, ...GESTURE_PLAN[S.idx] }); return; }
    const gestureWarnings = [];
    for (const guide of GESTURE_PLAN.filter(g => g.shot !== 'serve')){
      const candidates = S.templates.filter(t => t.shot === guide.shot && t.dir === SIGN[guide.want]);
      const drives = S.templates.filter(t => t.shot === 'drive' && t.dir === SIGN[guide.want]);
      if (!candidates.length) gestureWarnings.push({ shot: guide.shot, dir: SIGN[guide.want], reason: 'missing' });
      else if (drives.some(d => featureDistance(d.features, candidates[0].features) < .55 || (guide.shot === 'drop' && ['lift','tilt','twist','duration'].every(key => Math.abs(d.features[key] - candidates[0].features[key])/FEATURE_SCALE[key] < .55)))) gestureWarnings.push({ shot: guide.shot, dir: SIGN[guide.want], reason: 'similar' });
    }
    const serveCount = S.templates.filter(t => t.shot === 'serve').length;
    if (!serveCount) gestureWarnings.push({ shot: 'serve', dir: 0, reason: 'missing' });
    S.profile.templates = S.templates;
    // Include la soglia dei gesti delicati, senza riusare il minimo del drive per la palla corta.
    const minPeak = Math.min(...S.templates.map(t => t.peak));
    S.profile.minPeak = Math.max((S.profile.noise || 3)*4, Math.min(S.profile.minPeak, minPeak*.42));
    S.profile.on = Math.max(18, Math.min(S.profile.on, S.profile.minPeak*.7));
    S.profile.minAngle = Math.max(1.5, Math.min(S.profile.minAngle, ...S.templates.map(t => t.angle*.25)));
    S.result = { ...S.result, gestureWarnings, gestureCounts: Object.fromEntries(['drive','slice','lob','drop','serve'].map(shot => [shot, S.templates.filter(t => t.shot === shot).length])), pass: !!serveCount, why: serveCount ? null : 'servizio' };
    if (!serveCount) S.profile = null;
    finishReview();
  }

  return {
    get state(){ return S; },
    // nell'attesa dopo l'avvio (il telefono si sta prendendo in mano)
    get leading(){ return S.step === 'still' && S.leadUntil !== 0; },
    on(f){ L.push(f); return this; },
    // lead: ms di attesa prima del passo «fermo» (avvio da un comando: il telefono si sta ancora prendendo in mano)
    start(options = S.options, { lead = 0 } = {}){
      const flat = options.grip === 'flat';
      // presa orizzontale («il telefono è il piatto»): sempre il percorso rapido, con 2 s fermi in posizione «pronto»
      S.options = { range: options.range === 'compact' ? 'compact' : 'standard', hand: options.hand === 'left' ? 'left' : 'right', intentGate: options.intentGate === true, gestural: flat ? false : options.gestural === true, quick: flat || options.quick === true, ...(flat ? { grip: 'flat' } : {}) };
      if (det.config){ if (S.baseStill == null) S.baseStill = det.config.stillTime; det.config.stillTime = flat ? CAL.flatStill : S.baseStill; }
      S.practice = 0; det.setTraining(true);
      Object.assign(S, { plan: calibrationPlan(S.options), step: 'still', idx: 0, tries: 0, attempts: [], axis: null, result: null, profile: null, templates: [], shotAttempts: [], burst: [], idleT: S.lastT, home: null, track: [], rot: [0, 0, 0], flipTries: 0, vsign: 1, slow: lead > 0, first: lead > 0, leadUntil: lead > 0 ? -lead : 0 }); unready();
      det.setProfile({ bias: [0, 0, 0], ...CAL.low, axis: null }); det.still();
      emit({ kind: 'step' });
    },
    skipGrip(){ if (S.step === 'grip'){ S.step = 'swings'; S.idleT = S.lastT; unready(); emit({ kind: 'step', want: plan()[0], shot: 'drive', idx: 0, total: total() }); } },
    retry(){ S.practice = 0; det.setTraining(true); Object.assign(S, { plan: calibrationPlan(S.options), step: 'swings', idx: 0, tries: 0, attempts: [], axis: null, result: null, profile: null, templates: [], shotAttempts: [], burst: [], idleT: S.lastT, home: null, track: [], rot: [0, 0, 0], flipTries: 0, vsign: 1, first: !!S.slow }); unready(); det.setThresholds({ ...CAL.low, axis: null }); emit({ kind: 'step', want: plan()[0], shot: 'drive', idx: 0, total: total() }); },
    // prova libera con il profilo proposto: direzione e forza di ogni swing, prima di confermare
    tryFree(){ if (!S.profile) return; S.step = 'free'; det.setProfile(S.profile); det.setTraining(false); det.setContext?.('practice'); emit({ kind: 'step' }); },
    // salta i gesti: profilo semplice dalla posa ferma (deriva e rumore), senza asse del colpo. Il gioco è completo lo
    // stesso: verso dalla rotazione attorno alla verticale, tipo di colpo dalla forma, forza dalla velocità vera.
    // Anche durante il passo «fermo»: il rilevatore passa subito al gioco con la gravità dei campioni già arrivati
    // (prima restava ad aspettare il telefono fermo, e fino ad allora nessun colpo partiva)
    skip(){
      if (S.step === 'idle' || S.step === 'done') return null;
      if (det.mode === 'still'){ S.step = 'skip'; det.finishStill?.(); }
      S.profile = { version: 4, automaticGesture: true, simple: true, ...S.options, bias: det.profile.bias, noise: det.profile.noise, gravity: det.profile.gravity, axis: null, ref: 420, refs: null, refAngle: 30, on: 70, minPeak: 120, minAngle: 6 };
      return this.confirm();
    },
    confirm(){ if (!S.profile) return null; det.setProfile(S.profile); det.setTraining(false); S.step = 'done'; emit({ kind: 'done', profile: S.profile }); return S.profile; },
    // eventi che descrivono il passo attuale (senza mandarli), per chi si ricollega a calibrazione in corso: dopo una
    // caduta del collegamento gli eventi fatti nel frattempo sono andati persi e il computer riparte da questi
    replay(){
      const step = S.step;
      if (step === 'still' || step === 'grip') return [{ kind: 'step', step }];
      if (guided()){
        const want = step === 'swings' ? plan()[S.idx] : GESTURE_PLAN[S.idx]?.want ?? null;
        return [{ kind: 'step', step, want, shot: 'drive', idx: S.idx, total: total() }, ...(S.ready ? [{ kind: 'ready', step, want }] : [])];
      }
      if ((step === 'review' || step === 'free') && S.result) return [{ kind: 'review', step: 'review', ...S.result }];
      return [];
    },
    touch(dir = 0, power = .65, shot = 'drive'){ if (S.step !== 'free' || S.profile?.input !== 'touch') return; S.practice++; emit({ kind: 'free', dir: dir > 0 ? 'L' : dir < 0 ? 'R' : '?', dirValue: dir, power, strength: power/.75, peak: power*600, ok: true, shot }); },
    invert(){ if (!S.profile || !S.axis) return; S.axis = S.axis.map(v => -v); S.profile.axis = S.axis; const swap = o => o && ({ 1: o[-1], '-1': o[1] }); S.profile.refs = swap(S.profile.refs); S.profile.preparation = swap(S.profile.preparation); S.profile.minAngles = swap(S.profile.minAngles); S.profile.rises = swap(S.profile.rises); S.profile.heads = swap(S.profile.heads); S.profile.faceRef = swap(S.profile.faceRef); if (S.profile.templates) S.profile.templates = S.profile.templates.map(t => ({ ...t, dir: -t.dir })); this.tryFree(); },
    useTouch(){ S.practice = 0; S.burst = []; S.axis = null; S.profile = { version: 2, input: 'touch', ...S.options, ref: 1 }; S.result = { pass: true, touch: true, okL: 0, okR: 0 }; S.step = 'review'; emit({ kind: 'review', ...S.result }); },
    // da chiamare a ogni campione: impugnatura, gruppi di movimenti, suggerimenti se non arriva nulla
    tick(t, sample){
      const dt = Math.max(0, Math.min(60, t - S.lastT));
      S.lastT = t;
      // attesa dopo l'avvio (leadUntil: −lead finché non arriva il primo campione, poi l'istante di fine): finita, il passo
      // «fermo» riparte da capo, senza i campioni di quando si prendeva il telefono
      if (S.step === 'still' && S.leadUntil < 0) S.leadUntil = t - S.leadUntil;
      if (S.step === 'still' && S.leadUntil > 0 && t >= S.leadUntil){ S.leadUntil = 0; det.still(); emit({ kind: 'step' }); }
      if (sample?.rot){ const b = det.profile.bias || [0, 0, 0]; S.rot = S.rot.map((v, i) => v + (sample.rot[i] - (b[i] || 0))*dt/1000); }
      S.track.push([t, S.rot]); while (S.track.length && t - S.track[0][0] > CAL.homeKeep) S.track.shift();
      if (S.step === 'grip'){
        const up = upright(sample && sample.accG);
        if (up){ if (S.gripT == null) S.gripT = t; if (t - S.gripT >= CAL.gripHold){ S.step = 'swings'; S.idleT = t; unready(); emit({ kind: 'step', want: plan()[0], shot: 'drive', idx: 0, total: total() }); } }
        else if (S.gripT != null){ S.gripT = null; emit({ kind: 'grip', upright: false }); }
        if (!up && (t - (S.gripWarnT || 0) > 1000)){ S.gripWarnT = t; emit({ kind: 'grip', upright: false }); }
      }
      // gruppo nel verso opposto a quello chiesto: forse l'apertura di un colpo completo, si aspetta ancora il colpo (tra
      // apertura e colpo la mano non si ferma: se si ferma, era un gesto nel verso sbagliato)
      const waitStroke = () => { const moves = S.burst.filter(s => !s.back), w = wantSignNow(); return moves.length > 0 && !!w && way(pick(moves)) === -w && t - S.burstT < CAL.prepWait && !(S.quietT != null && t - S.quietT >= CAL.prepPause); };
      if (S.burst.length && t - S.burstT >= CAL.burst && !waitStroke()){
        const group = S.burst, moves = group.filter(s => !s.back); S.burst = [];
        if (moves.length) attempt(pick(moves), group);
        else { unready(); emit({ kind: 'warn', why: 'centro', peak: Math.max(...group.map(s => s.peak)) }); }
      }
      // la mano si è fermata: si accetta il gesto richiesto (prima si avvisa chi resta in movimento)
      // (la quiete si misura sempre: chi è già fermo quando compare il primo gesto è subito pronto)
      if (sample){ if (motion(sample) < quietLimit()){ if (S.quietT == null) S.quietT = t; } else { if (S.quietT != null) S.quietSpan = t - S.quietT; S.quietT = null; } }
      else if (S.quietT == null) S.quietT = t;
      if (guided() && !S.ready && !S.burst.length){
        if (S.quietT != null){ if (t - S.quietT >= (S.first ? CAL.firstSettle : CAL.settle)){ S.ready = true; S.readyAt = t; S.first = false; emit({ kind: 'ready', want: S.step === 'swings' ? plan()[S.idx] : GESTURE_PLAN[S.idx]?.want ?? null }); } }
        if (!S.ready && !S.settleHinted && t - S.settleT > CAL.settleHint){ S.settleHinted = true; emit({ kind: 'settle' }); }
      }
      if (['swings','shots'].includes(S.step) && t - S.idleT > CAL.idleHint){ S.idleT = t; emit({ kind: 'idle' }); }
    },
  };
}
