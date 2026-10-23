// Riscaldamento in campo: calibrazione del telefono e allenamento sono la stessa cosa. Si gioca sul campo d'allenamento
// (la stessa arena a porte chiuse, natpf_arena.setPractice). In campo c'è solo il giocatore, dall'altra parte un
// lanciapalle (l'avversario non si vede e non risponde). Si guarda il computer: le istruzioni stanno in basso al centro,
// sotto il giocatore, grandi; il telefono è il controller e ripete la stessa cosa in piccolo. Con lo smartphone:
//   1 «fermo»: telefono fermo in verticale per un attimo, anche con il tremolio della mano (il telefono misura come lo
//     si tiene);
//   2 due gesti, un dritto e un rovescio: il giocatore resta fermo al centro della riga di fondo e la palla
//     aspetta, ferma all'altezza della racchetta, dal lato del gesto chiesto; al gesto riconosciuto il giocatore la
//     colpisce. Il computer mostra sempre il passo in cui si trova il telefono (natpf_cal_view.js), mai un suo percorso;
//   3 la calibrazione si conferma da sola; poi palle vere: dritto, rovescio, pallonetto, palla corta, servizio e angoli
//     (qui il giocatore corre da solo verso la palla, come in partita: si pensa solo al colpo).
// Con webcam e mouse si parte dal punto 3. «Salta» chiude in qualsiasi momento: con il telefono non ancora calibrato si
// gioca in modalità semplice, con il gioco completo (verso, tipo di colpo e forza dal gesto: mancano solo il colpo
// tipico e il piatto abituale, che il gioco impara dai colpi). Non conta per il punteggio.
import * as THREE from 'three';
import { calSide, calPrompt, CAL_VIEW_EMPTY } from './natpf_cal_view.js';
export { calSide };

export const DRILLS = Object.freeze([
  { id: 'forehand', label: 'Dritto', need: 2, cue: 'forehand', hint: { phone: 'Il giocatore va da solo verso la palla: tu colpisci quando arriva alla racchetta', webcam: 'Swing quando la palla arriva alla racchetta', mouse: 'Spazio quando la palla arriva' } },
  { id: 'backhand', label: 'Rovescio', need: 2, cue: 'backhand', hint: { phone: 'Palla sull’altro lato: colpisci nel verso opposto quando arriva alla racchetta', webcam: 'Swing verso l’altro lato', mouse: 'Spazio o trascina verso l’altro lato' } },
  // colpi speciali (solo smartphone): il gioco impara il TUO pallonetto e la TUA palla corta (soglie personali,
  // natpf_gestures.learnSpecials). Si passa avanti anche senza riuscirci, dopo 4 tentativi.
  { id: 'lob', label: 'Pallonetto', need: 1, shot: 'lob', phoneOnly: true, maxTries: 4, hint: { phone: 'Colpisci dal basso verso l’alto: la mano sale, come per mandare la palla in alto' } },
  { id: 'drop', label: 'Palla corta', need: 1, shot: 'drop', phoneOnly: true, maxTries: 4, hint: { phone: 'Colpo lento e morbido, dall’alto verso il basso, come per accarezzare la palla sotto' } },
  { id: 'serve', label: 'Servizio', need: 1, hint: { phone: 'Alza il telefono per lanciare la palla, poi un colpetto quando è in alto', webcam: 'Alza la mano per lanciare, poi swing in alto', mouse: '↑ o W per lanciare, poi Spazio' } },
  { id: 'free', label: 'Angoli', need: 3, hint: { phone: 'Colpisci un attimo prima: incrociato. Un attimo dopo: lungolinea. Il dorso del telefono la sposta ancora un poco', webcam: 'Colpisci prima per l’incrociato, dopo per il lungolinea', mouse: 'Q/E o A/D per mirare' } },
]);
// Calibrazione dentro il riscaldamento (solo smartphone)
export const CAL_STAGE = Object.freeze({ id: 'cal', label: 'Calibrazione' });
// posizione del giocatore (centro della riga di fondo) e della palla che aspetta il gesto: di lato quanto il braccio
// con la racchetta, poco davanti, all'altezza del fianco. flight: s di volo della palla colpita prima della successiva;
// seen: s di volo che si vedono comunque, anche con il telefono già pronto al gesto dopo.
// ahead: la palla ferma appena oltre il punto d'impatto (0,35 m davanti, natpf_impact.js): il colpo del gesto accettato
// parte nello stesso istante, come prima della finestra d'impatto (a 0,45 m partiva al fotogramma dopo, e la verifica
// della calibrazione arrivava prima: l'ultimo gesto restava senza colpo)
export const CAL_SPOT = Object.freeze({ z: 11.4, reach: 1.05, ahead: .34, height: .95, flight: .9, seen: .3 });
// Gesto della calibrazione → colpo: «L» è il gesto da destra a sinistra, il dritto di un destro (il rovescio di un mancino)
export function calCoach(want, hand = 'right'){
  const side = calSide(want, hand);
  return { side, title: side === 'forehand' ? 'Dritto' : 'Rovescio', arrow: want === 'L' ? '←' : '→', move: want === 'L' ? 'verso sinistra' : 'verso destra' };
}
// verso del gesto del colpo sul telefono (freccia) per un lato: il dritto del destro va da destra a sinistra
export const sideWant = (side, hand = 'right') => ((side === 'forehand') !== (hand === 'left') ? 'L' : 'R');
// avanzamento di un esercizio (funzione pura, per i test)
export const drillsFor = controller => DRILLS.filter(d => !d.phoneOnly || controller === 'phone');
export function drillAfterShot(drill, progress, { side, inCourt, shot = null }){
  // prova guidata della diagnostica: ogni palla giocata è un campione (il giudizio lo fanno le metriche, con il video)
  if (drill.diag) return { ...progress, tries: progress.tries + 1, done: progress.done + 1, ok: true };
  // colpi speciali: conta il colpo riconosciuto, anche se finisce fuori (si impara il gesto, non la mira)
  if (drill.shot) return { ...progress, tries: progress.tries + 1, done: progress.done + (shot === drill.shot ? 1 : 0), ok: shot === drill.shot, wrongShot: shot !== drill.shot };
  if (!inCourt) return { ...progress, tries: progress.tries + 1, ok: false };
  const sideOk = drill.id === 'forehand' ? side === 'forehand' : drill.id === 'backhand' ? side === 'backhand' : true;
  return { ...progress, tries: progress.tries + 1, done: progress.done + (sideOk ? 1 : 0), ok: sideOk, wrongSide: !sideOk };
}

export class NatpfTraining {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.active = false;
    this.coach = document.getElementById('natpf-coach');
    document.getElementById('coach-exit')?.addEventListener('click', e => { e.stopPropagation(); this.skip(); });
    document.getElementById('coach-simple')?.addEventListener('click', e => { e.stopPropagation(); this.simpleMode(); });
    this.coach?.addEventListener('pointerdown', e => e.stopPropagation());
    // durante il riscaldamento i punti non contano: il motore chiede un punto, qui si passa alla palla successiva
    const award = engine._awardPoint.bind(engine);
    engine._awardPoint = (winner, why = '') => this.active ? this._ballOver(winner, why) : award(winner, why);
    ui.phone?.onCal?.(e => this._onCal(e));
    // colpi del telefono: negli esercizi dei colpi speciali ogni tentativo è un esempio del gesto di chi gioca
    ui.phone?.onSwing?.(ev => this._onPhoneSwing(ev));
  }
  get drill(){ return (this.drills || DRILLS)[this.idx]; }
  get view(){ return this.ui.phone?.calView || CAL_VIEW_EMPTY; }
  _onPhoneSwing(ev){
    if (!this.active || this.cal || !ev?.natpf || ev.ignored) return;
    this.lastShot = ev.natpf.shot;
    const d = this.drill;
    if (d?.shot && d.learn !== false){ this.ui.phone.learnSpecial?.(d.shot, ev.natpf); this.lastLearn = d.shot; }
  }
  get phoneCal(){ return this.ui.controller === 'phone' && !this.ui.phone.ready; }
  // calOnly: solo la calibrazione del telefono in campo (prima di una sfida), poi si torna a chi l'ha chiesta
  // drills/diag: esercizi su misura e richiami della prova guidata della diagnostica (onFeed a ogni palla, onEnd)
  start({ calOnly = false, drills = null, diag = null } = {}){
    this.calOnly = calOnly;
    const E = this.engine;
    this.drills = calOnly ? [] : drills || drillsFor(this.ui.controller);
    this.diagRun = diag;
    this.active = true; this.idx = 0; this.progress = { done: 0, tries: 0 }; this.stats = { shots: 0, perfect: 0, out: 0 }; this.wait = 0; this.message = null; this.flash = null;
    this.cal = this.phoneCal ? { ballFor: -1, hitFor: -1, flightT: 0, fails: 0 } : null;
    this.withCal = !!this.cal;
    this.prevDifficulty = E.hud.selectedDifficulty || E.matchConfig.difficulty;
    this.prevFormat = E.matchFormat?.id || null;
    E._applyDifficultyTuning('casual'); E.isMultiplayer = false;
    E.setMatchFormat?.('singles');                 // il riscaldamento è sempre in singolare (niente compagni in campo)
    E.hud.hideTitleModal(); E.hud.hideCenterBanner();
    E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false;
    if (this.ui.controller === 'webcam' && E.motionController && !E.motionController.webcamActive) E.motionController.enableWebcam();
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true }); E._syncScoreboardHUD();
    this._hideOpponent(true);
    if (this.cal){
      // calibrazione: niente servizio e niente corse, il giocatore aspetta fermo al centro
      this._idle(); this._centerPlayer();
      // telefono senza una calibrazione in corso (mai partita, finita o già alla verifica): si ricomincia. Se è già ai
      // gesti (succede: il telefono parte appena si attivano i sensori, prima di entrare in campo) si continua da lì
      const step = this.ui.phone.cal?.step;
      if (!step || ['done', 'review', 'free'].includes(step) || this.view.stage === 'off') this.ui.phone.recalibrate();
    } else E._setupPointServe({ showBanner: false });
    E.hud.showCenterBanner(this.cal ? 'Calibrazione' : 'Riscaldamento', { style: 'style-start', subText: this.cal ? 'Il gioco impara i tuoi due gesti' : 'Solo tu e il lanciapalle', durationMs: 1300 });
    this.coach?.classList.remove('hidden');
    this.paint();
  }
  _hideOpponent(on){
    const o = this.engine.opponent;
    if (o?.root) o.root.visible = !on;
    if (o?.shadowBlob) o.shadowBlob.visible = !on;
    document.body.classList.toggle('natpf-training', on);
    // campo d'allenamento: tribune vuote e luci di lavoro (natpf_arena.js)
    this.engine.natpfArena?.setPractice?.(on);
  }
  // giocatore fermo in attesa (nessun servizio, nessuna palla): il motore non deve far partire il punto successivo
  _idle(){
    const E = this.engine;
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false; E.cameraMode = 'RALLY_CAM'; E.natpfTimeScale = 1;
    E.ball.pos.set(0, -5, 0); E.ball.vel.set(0, 0, 0); E.ballTrail?.clear?.();
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
  }
  _centerPlayer(){
    const p = this.engine.player;
    p.pos.set(0, 0, CAL_SPOT.z); p.targetPos.copy(p.pos); p.vel?.set?.(0, 0, 0);
  }
  /* ---------- calibrazione in campo ---------- */
  _onCal(e){
    if (!this.active) return;
    if (!this.cal){ if (e.kind !== 'done' && this._phoneRecalibrating()) this._recal(); else return; }
    const c = this.cal, v = this.view, hand = this.ui.hand?.hand;
    this._calTick(0);                                      // palla del passo attuale subito, senza aspettare il fotogramma
    if (!this.cal) return;                                 // (telefono già pronto: si è passati agli esercizi)
    if (e.kind === 'attempt' && e.ok){
      this.flash = { text: `${calCoach(e.want || v.want, hand).title} riconosciuto ✓`, ok: true, until: performance.now() + 900 };
      this._hitCal(e.idx ?? v.idx, e.want || v.want);
    }
    // gesto non valido: il perché resta scritto finché non si rifà (calPrompt), qui solo il lampo «Riprova»
    if (e.kind === 'attempt' && !e.ok) this.flash = { text: calPrompt(v, hand).sub, ok: false, until: performance.now() + 1100 };
    if (e.kind === 'ready' && this.flash?.ok) this.flash = null;   // gesto dopo pronto: «Ora» subito, come sul telefono
    if (e.kind === 'review'){
      if (e.pass) this.ui.phone.confirm();
      else {
        c.fails++;
        // (annullato se nel frattempo si ricalibra o si esce: prima scattava lo stesso e il telefono saltava il passo
        // «fermo», con i sensori non tarati)
        clearTimeout(this.retryT);
        if (c.fails < 2) this.retryT = setTimeout(() => this.active && this.cal && this.view.stage === 'review' && this.ui.phone.retry(), 1600);
      }
    }
    // agli esercizi dopo il colpo dell'ultimo gesto, se aspetta ancora la palla (ci pensa _calTick)
    if (e.kind === 'done'){ if (!this._calStriking()) this._startDrills(); else this.paint(); return; }
    this.paint();
  }
  ballLive(){ const E = this.engine; return E.phase === 'RALLY' && E.ball.inPlay; }
  // palla del gesto chiesto: ferma all'altezza della racchetta, dal lato del colpo; il giocatore resta al centro
  _presentBall(v){
    const E = this.engine, c = this.cal, p = E.player, hand = this.ui.hand?.hand;
    const toRight = (calSide(v.want, hand) === 'forehand') !== (hand === 'left');      // P1 guarda verso −z: la sua destra è +x
    this._centerPlayer();
    const x = p.pos.x + (toRight ? 1 : -1)*CAL_SPOT.reach, z = p.pos.z - CAL_SPOT.ahead;
    E.ballTrail?.clear?.(); E.swingVfx?.clearAllTrails?.();
    E.ball.pos.set(x, CAL_SPOT.height, z); E.ball.vel.set(0, 0, 2); E.ball.spin?.set?.(0, 0, 0);
    E.ball.targetLanding?.set?.(x, 0, p.pos.z);
    Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 1, rallyStrokeCount: 1, shotType: 'TOPSPIN', isPowerShot: false });
    E.pendingUserSwing = null;
    E.phase = 'RALLY'; E.phaseTimer = 0; E.cameraMode = 'RALLY_CAM';
    E.natpfTimeScale = 0;                           // tutto fermo finché non arriva il gesto
    c.ballFor = v.idx; c.flightT = 0;
  }
  // gesto riconosciuto dal telefono: il giocatore colpisce la palla di quel gesto, dal lato di quel gesto
  _hitCal(idx, want){
    const c = this.cal, E = this.engine;
    if (!c || c.ballFor !== idx || c.hitFor === idx || !this.ballLive() || E.ball.lastHitter !== 'opponent') return;
    c.hitFor = idx; c.flightT = 0; E.natpfTimeScale = 1; E.player.swingCooldown = 0;
    E.motionController?._emitSwing({ source: 'natpf-warmup', side: calSide(want, this.ui.hand?.hand), shotType: 'topspin', speed: 1.15, dirX: 0, role: E.playerRole });
  }
  // colpo del gesto riconosciuto che aspetta la palla al punto d'impatto (finestra d'impatto del motore): la palla è
  // già presa. Il telefono manda il gesto dopo (o la verifica, poi la fine) subito dopo il tentativo: prima la palla
  // veniva sostituita o tolta prima del colpo, e nel riscaldamento il giocatore non colpiva più nessuna palla
  _calStriking(){
    const E = this.engine, c = this.cal;
    return !!c && c.hitFor === c.ballFor && !!E.pendingUserSwing && this.ballLive() && E.ball.lastHitter !== 'player';
  }
  _calTick(dt){
    const E = this.engine, c = this.cal, v = this.view, p = E.player;
    const striking = this._calStriking();
    // telefono già pronto (fine della calibrazione, o pagina ricaricata con il profilo salvato): si va agli esercizi
    // invece di restare sull'ultimo gesto, dopo il colpo dell'ultimo gesto (finché la calibrazione è aperta non conta
    // come colpo dell'esercizio)
    if (this.ui.phone?.ready){ if (!striking) this._startDrills(); return; }
    p.targetPos.copy(p.pos);                                                      // il giocatore non corre mai da solo
    const flying = this.ballLive() && E.ball.lastHitter === 'player';
    if (flying) c.flightT += dt;
    if (v.stage === 'gesture'){
      // nuova palla per il gesto nuovo appena la palla colpita è passata, subito se non ce n'è una in volo, e comunque
      // prima che il telefono accetti il gesto (il tentativo arriva sempre dopo «ready», sullo stesso canale ordinato).
      // Non mentre il colpo del gesto prima aspetta la palla, e la palla colpita vola almeno CAL_SPOT.seen: «ready»
      // arriva insieme al tentativo se la mano era già ferma, e la palla colpita spariva nello stesso fotogramma. Il
      // colpo si chiude in 0,2 s (al massimo alla scadenza dello swing), il tentativo dopo arriva almeno 0,6 s dopo
      if (c.ballFor !== v.idx && !striking && (!flying || c.flightT >= (v.ready ? CAL_SPOT.seen : CAL_SPOT.flight))) this._presentBall(v);
    } else if (!flying && !striking && E.ball.inPlay) this._idle();                // fermo, verifica, fine: niente palla
    if (!this.ballLive() && E.phase === 'POINT_OVER') E.phaseTimer = 0;            // niente servizio automatico
  }
  // telefono che ricomincia a calibrare a esercizi già iniziati, senza il pannello del telefono aperto (Ricalibra e
  // pannello chiuso, pagina del telefono ricaricata): si torna alla calibrazione in campo e poi all'esercizio di prima.
  // Prima gli eventi erano ignorati, nessuno confermava la verifica e i colpi venivano scartati («Palla persa» senza fine)
  _phoneRecalibrating(){
    const P = this.ui.phone;
    return this.ui.controller === 'phone' && !!P?.connected && !P.ready && P.state?.phone === 'cal' && !!this.ui.modal?.classList.contains('hidden');
  }
  _recal(){
    this.cal = { ballFor: -1, hitFor: -1, flightT: 0, fails: 0, resume: this.idx };
    this.withCal = true; this.wait = 0; this.flash = null; this.message = null;
    this._idle(); this._centerPlayer();
    // verifica già superata mentre il pannello era aperto: si conferma subito
    const P = this.ui.phone;
    if (P.cal?.review?.pass && (P.cal.step === 'review' || P.cal.step === 'free')) P.confirm();
  }
  _startDrills(){
    if (this.calOnly){ this.stop({ completed: true, calibrated: true }); return; }
    const E = this.engine, resume = this.cal?.resume ?? 0;
    this.cal = null; this.idx = resume; this.progress = { done: 0, tries: 0 };
    this.message = null; this.flash = { text: 'Racchetta pronta ✓', until: performance.now() + 1400 };
    E.hud.showCenterBanner('Racchetta pronta', { style: 'style-start', subText: 'Ora le palle vere', durationMs: 1300 });
    this._idle(); this.wait = 1.4;
    this.paint();
  }
  // il telefono non riesce a distinguere i gesti (o chi gioca non vuole calibrare): profilo semplice
  simpleMode(){
    if (!this.active) return;
    this.ui.phone.skipCalibration();
    this.message = 'Senza calibrazione: il gesto vale lo stesso, la forza non è tarata sul tuo colpo';
    if (this.cal) this.cal.fails = 0;
  }
  /* ---------- palle ---------- */
  // colpo del giocatore locale (dall'aptica, già con l'esito dell'anello)
  onShot(q){
    if (!this.active || !q || this.cal) return;
    const E = this.engine, d = this.drill;
    if (!d) return;
    this.stats.shots++; if (q.color === 'green') this.stats.perfect++; if (q.label === 'Fuori') this.stats.out++;
    const side = E.player.swingType === 'backhand' ? 'backhand' : E.player.swingType === 'smash' ? 'smash' : 'forehand';
    // il servizio si conta qui; gli altri esercizi quando la palla è giocabile (anche fuori conta come tentativo)
    const before = this.progress.done;
    this.progress = drillAfterShot(d, this.progress, { side: d.id === 'serve' ? 'serve' : side, inCourt: q.label !== 'Fuori' && q.label !== 'Mancata', shot: this.lastShot });
    this.lastShot = null;
    const ok = this.progress.done > before;
    this.message = d.shot ? (ok ? `${d.label} ✓` : this.progress.tries >= 2 ? 'Ho imparato il tuo gesto: riprova uguale' : (d.shot === 'lob' ? 'Più dal basso verso l’alto' : 'Più lento, dall’alto verso il basso')) : ok ? `${q.label} ✓` : this.progress.wrongSide ? (d.id === 'forehand' ? 'Era un rovescio: la palla va sul dritto' : 'Era un dritto: la palla va sul rovescio') : q.label === 'Fuori' ? 'Fuori: meno angolo o meno forza' : q.label;
    this.flash = { text: this.message, ok, until: performance.now() + 1200 };
    this.paint();
  }
  // colpo molto fuori tempo (il motore lo gioca in difesa): conta come tentativo
  onMistime(early){
    if (!this.active || this.cal) return;
    this.progress = { ...this.progress, tries: this.progress.tries + 1 };
    this.message = early ? 'Troppo presto: aspetta che la palla arrivi vicino' : 'Troppo tardi: colpisci un attimo prima';
    this.flash = { text: this.message, ok: false, until: performance.now() + 1200 };
    this.paint();
  }
  _ballOver(winner, why){
    const E = this.engine;
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false; E.natpfTimeScale = 1;
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    if (this.cal){ this.paint(); return; }                       // calibrazione: la palla del gesto dopo la mette _calTick
    if (winner !== 'player' && E.ball.lastHitter === 'opponent'){ this.progress = { ...this.progress, tries: this.progress.tries + 1 }; this.message = 'Palla persa: colpisci quando arriva alla racchetta'; this.flash = { text: this.message, ok: false, until: performance.now() + 1200 }; }
    if (this.drill && (this.progress.done >= this.drill.need || (this.drill.maxTries && this.progress.tries >= this.drill.maxTries))){ this.idx++; this.progress = { done: 0, tries: 0 }; if (this.idx < this.drills.length){ this.message = null; this.flash = { text: `Bravo! Ora: ${this.drill.label}`, ok: true, until: performance.now() + 1400 }; } }
    this.wait = 1.1;
    this.paint();
  }
  _next(){
    const E = this.engine;
    if (this.cal) return;
    if (this.ballLive() && E.ball.lastHitter === 'opponent') return;     // c'è già una palla in arrivo
    if (this.idx >= this.drills.length) return this.stop({ completed: true });
    if (this.drill.id === 'serve'){ E.score.server = 'player'; E._setupPointServe({ showBanner: false }); return; }
    if (this.drill.feed) return this._feed(this.drill.feed === 'random' ? (Math.random() < .5 ? 'forehand' : 'backhand') : this.drill.feed);
    // pallonetto e palla corta: sul dritto, il colpo più comodo
    this._feed(this.drill.id === 'backhand' ? 'backhand' : this.drill.id === 'forehand' || this.drill.shot ? 'forehand' : Math.random() < .5 ? 'forehand' : 'backhand');
  }
  // lanciapalle: palla dal fondo avversario verso il dritto o il rovescio del giocatore locale (destro o mancino)
  _feed(side){
    const E = this.engine, p = E.player, lefty = this.ui.hand?.hand === 'left';
    const toRight = (side === 'forehand') !== lefty;            // P1 guarda verso -z: la sua destra è +x
    const x = THREE.MathUtils.clamp(p.pos.x + (toRight ? 1.3 : -1.3) + (Math.random() - .5)*.6, -3.4, 3.4);
    const start = new THREE.Vector3((Math.random() - .5)*2, 1.05, -11.6), target = new THREE.Vector3(x, 0, 8.4 + Math.random()*1.4);
    E.ballTrail?.clear(); E.swingVfx?.clearAllTrails?.();
    E.ball.pos.copy(start);
    E._launchBallToTarget(start, target, 1.15, { topspin: 10, sidespin: 0, allowNetFault: false });
    Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1, shotType: 'TOPSPIN', isPowerShot: false });
    E.phase = 'RALLY'; E.phaseTimer = 0; E.cameraMode = 'RALLY_CAM';
    // come in partita: piano d'intercetto sulla traiettoria vera (finestra d'impatto e movimento, natpf_impact.js)
    E._natpfPlanPlayer ? E._natpfPlanPlayer() : E._predictBallIntercept(p);
    E.audioEngine?.playRacketHit?.('topspin', 'good');
    this.fedSide = side;
    this.diagRun?.onFeed?.(this.drill, side);
  }
  tick(dt){
    if (!this.active) return;
    const E = this.engine, o = E.opponent;
    // il lanciapalle non corre e non risponde: l'avversario resta fuori dal campo
    if (o){ o.pos.set(0, 0, -40); o.targetPos.copy(o.pos); }
    if (!this.cal && this._phoneRecalibrating()) this._recal();
    if (this.cal) this._calTick(dt);
    if (this.wait > 0){ this.wait -= dt; if (this.wait <= 0) this._next(); }
    this.paint();
  }
  // «Salta»: con il telefono non calibrato si passa alla modalità semplice
  skip(){
    if (!this.active) return;
    if (this.ui.controller === 'phone' && !this.ui.phone.ready) this.ui.phone.skipCalibration();
    this.stop({ completed: false, skipped: true });
  }
  // silent: chiusa da una sfida che parte subito dopo (niente menu né risultato)
  stop({ completed, skipped = false, calibrated = false, silent = false }){
    if (!this.active) return;
    const E = this.engine;
    this.active = false; this.cal = null; E.natpfTimeScale = 1; clearTimeout(this.retryT);
    this.coach?.classList.add('hidden'); this._hideOpponent(false);
    E.opponent.pos.set(-1.35, 0, -11.89); E.opponent.targetPos.copy(E.opponent.pos);
    E._applyDifficultyTuning(this.prevDifficulty || 'casual');
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true });
    E._syncScoreboardHUD(); E.hud.hideCenterBanner();
    E._setupMidRallyShowcase({}); E.autoPlayMode = true; E.userHasInteracted = false;
    // formato della partita scelto prima del riscaldamento (sempre in singolare) e pausa ricalcolata: prima il gioco
    // poteva restare in pausa dopo il reset del chiosco
    if (this.prevFormat) E.setMatchFormat?.(this.prevFormat);
    this.ui._syncPause?.();
    const run = this.diagRun; this.diagRun = null; run?.onEnd?.({ completed, skipped });
    if (silent) return;
    E.hud.showTitleModal();
    this.ui.flow?.onTrainingEnd({ completed, skipped, calibrated, stats: this.stats });
  }
  // Pannello in campo: tappe in alto, in basso al centro il gesto da fare (titolo grande, freccia, stato) e l'esito
  paint(){
    if (!this.active || !this.coach) return;
    const $ = sel => this.coach.querySelector(sel);
    const c = this.ui.controller, hand = this.ui.hand?.hand, now = performance.now();
    const stages = this.withCal ? [CAL_STAGE, ...this.drills] : this.drills;
    const cur = this.cal ? 0 : stages.indexOf(this.drill);
    const list = $('#coach-stages'), key = stages.map(x => x.id).join() + cur;
    if (list && list.dataset.key !== key){ list.dataset.key = key; list.innerHTML = stages.map((x, i) => `<li class="${i < cur ? 'done' : i === cur ? 'on' : ''}">${x.label}</li>`).join(''); }
    show($('#coach-simple'), !!this.cal && this.cal.fails >= 1);
    const flash = this.flash && now < this.flash.until ? this.flash : null;
    const mode = this.ui.flow?.mode === 'training' ? 'Allenamento' : 'Riscaldamento';
    const P = this.ui.phone, lost = c === 'phone' && P && (!P.connected || (P.state?.phone && !['cal', 'ready'].includes(P.state.phone)));
    let view;
    // telefono scollegato o senza sensori (pagina ricaricata, schermo spento): prima il pannello restava su «Ora»
    if (lost) view = { kicker: mode, title: 'Telefono scollegato', sub: !P.connected ? 'Riapri la pagina sul telefono: si ricollega da solo e si riparte da qui' : 'Sul telefono tocca «Attiva i sensori»', state: 'retry', dir: null, count: '' };
    else if (this.cal){
      const v = this.view, pr = calPrompt(v, hand);
      const count = v.stage === 'gesture' ? `Gesto ${Math.min(v.idx + 1, v.total)} di ${v.total}` : v.stage === 'still' ? 'Prima di iniziare' : '';
      view = { kicker: mode, title: pr.title, sub: flash ? flash.text : (this.message && v.stage !== 'gesture' ? this.message : pr.sub), state: flash ? (flash.ok ? 'ok' : 'retry') : pr.state, dir: pr.dir, count, dots: v.stage === 'gesture' ? Array.from({ length: v.total }, (_, i) => i < v.idx ? 'done' : i === v.idx ? 'on' : '') : null };
    } else {
      const d = this.drill, ctrl = c in (d?.hint || {}) ? c : 'phone';
      if (!d) view = { kicker: mode, title: 'Completato ✓', sub: '', state: 'ok', dir: null, count: '' };
      else {
        const hot = isHot(this.engine);
        view = { kicker: `${mode} · ${this.idx + 1} di ${this.drills.length}`, title: d.label, sub: flash ? flash.text : d.hint[ctrl], state: flash ? (flash.ok ? 'ok' : 'retry') : hot ? 'go' : 'wait',
          dir: c === 'phone' && d.cue ? sideWant(d.cue, hand) : null, count: `${Math.min(this.progress.done, d.need)} di ${d.need}`, dots: Array.from({ length: d.need }, (_, i) => i < this.progress.done ? 'done' : '') };
      }
    }
    const k = $('#coach-kicker'); if (k && k.textContent !== view.kicker) k.textContent = view.kicker;
    const t = $('#coach-text'); if (t && t.textContent !== view.title) t.textContent = view.title;
    const s = $('#coach-sub'); if (s && s.textContent !== view.sub) s.textContent = view.sub;
    const n = $('#coach-count'); if (n && n.textContent !== view.count) n.textContent = view.count;
    const main = $('#coach-main'); if (main && main.dataset.state !== view.state) main.dataset.state = view.state;
    const cue = $('#coach-cue'); if (cue){ const dir = view.dir || ''; if (cue.dataset.dir !== dir) cue.dataset.dir = dir; }
    const dots = $('#coach-dots'), dk = (view.dots || []).join();
    if (dots && dots.dataset.key !== dk){ dots.dataset.key = dk; dots.innerHTML = (view.dots || []).map(x => `<i class="${x}"></i>`).join(''); }
    const badge = $('#coach-badge'), bt = { go: 'Ora', wait: '…', retry: 'Riprova', ok: '✓' }[view.state] || '';
    if (badge && badge.textContent !== bt) badge.textContent = bt;
  }
}
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
// palla in arrivo vicina alla racchetta: è il momento del colpo
const isHot = E => E.phase === 'RALLY' && E.ball.inPlay && E.ball.lastHitter === 'opponent' && E.ball.vel.z > .1 && (E.player.pos.z - E.ball.pos.z)/E.ball.vel.z < .4;
