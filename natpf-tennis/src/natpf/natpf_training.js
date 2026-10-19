// Riscaldamento in campo: calibrazione del telefono e allenamento sono la stessa cosa. Si gioca sul campo d'allenamento
// (la stessa arena a porte chiuse, natpf_arena.setPractice) con il pannello di lato, fuori dal campo. In campo c'è solo il giocatore,
// dall'altra parte un lanciapalle (l'avversario non si vede e non risponde). Con lo smartphone:
//   1 «pronto»: telefono fermo in verticale per un attimo (il telefono misura la deriva dei sensori);
//   2 quattro palle, alternate dritto e rovescio: ogni palla rallenta fino a fermarsi davanti alla racchetta e aspetta
//     il gesto che il telefono chiede (sono i gesti della calibrazione); al gesto riconosciuto il giocatore colpisce;
//   3 la calibrazione si conferma da sola; poi palle vere: dritto, rovescio, servizio e angoli con il tempo del colpo.
// Con webcam e mouse si parte dal punto 3. «Salta il riscaldamento» chiude in qualsiasi momento: con il telefono non
// ancora calibrato si gioca in modalità semplice (dritto e rovescio li sceglie il gioco). Non conta per il punteggio.
import * as THREE from 'three';

export const DRILLS = Object.freeze([
  { id: 'forehand', label: 'Dritto', need: 2, hint: { phone: 'Mentre la palla arriva porta indietro il telefono, poi colpisci quando arriva alla racchetta', webcam: 'Swing quando la palla arriva alla racchetta', mouse: 'Spazio quando la palla arriva' } },
  { id: 'backhand', label: 'Rovescio', need: 2, hint: { phone: 'Palla sull’altro lato: carica dall’altra parte e colpisci nel verso opposto', webcam: 'Swing verso l’altro lato', mouse: 'Spazio o trascina verso l’altro lato' } },
  // colpi speciali (solo smartphone): il gioco impara il TUO pallonetto e la TUA palla corta (soglie personali,
  // natpf_gestures.learnSpecials). Si passa avanti anche senza riuscirci, dopo 4 tentativi.
  { id: 'lob', label: 'Pallonetto', need: 1, shot: 'lob', phoneOnly: true, maxTries: 4, hint: { phone: 'Colpisci dal basso verso l’alto: chiudi il colpo con la racchetta che sale, come per mandare la palla in alto' } },
  { id: 'drop', label: 'Palla corta', need: 1, shot: 'drop', phoneOnly: true, maxTries: 4, hint: { phone: 'Colpo lento e morbido, dall’alto verso il basso, come per accarezzare la palla sotto' } },
  { id: 'serve', label: 'Servizio', need: 1, hint: { phone: 'Alza il telefono per lanciare la palla, poi un colpetto quando è in alto', webcam: 'Alza la mano per lanciare, poi swing in alto', mouse: '↑ o W per lanciare, poi Spazio' } },
  { id: 'free', label: 'Angoli', need: 3, hint: { phone: 'Al colpo gira il dorso del telefono verso dove vuoi la palla: destra o sinistra, di dritto e di rovescio', webcam: 'Prova a mirare: lo swing sposta la palla', mouse: 'Q/E o A/D per mirare' } },
]);
// Calibrazione dentro il riscaldamento (solo smartphone)
export const CAL_STAGE = Object.freeze({ id: 'cal', label: 'Calibrazione' });
export const CAL_HOLD = .14;           // s prima dello sweet spot in cui la palla si ferma ad aspettare il gesto
// Gesto della calibrazione → colpo: «L» è il gesto da destra a sinistra, il dritto di un destro (il rovescio di un mancino)
export const calSide = (want, hand = 'right') => ((want === 'L') !== (hand === 'left') ? 'forehand' : 'backhand');
export function calCoach(want, hand = 'right'){
  const side = calSide(want, hand);
  return { side, title: side === 'forehand' ? 'Dritto' : 'Rovescio', arrow: want === 'L' ? '←' : '→', move: want === 'L' ? 'verso sinistra' : 'verso destra' };
}
// avanzamento di un esercizio (funzione pura, per i test)
export const drillsFor = controller => DRILLS.filter(d => !d.phoneOnly || controller === 'phone');
export function drillAfterShot(drill, progress, { side, inCourt, shot = null }){
  // colpi speciali: conta il colpo riconosciuto, anche se finisce fuori (si impara il gesto, non la mira)
  if (drill.shot) return { ...progress, tries: progress.tries + 1, done: progress.done + (shot === drill.shot ? 1 : 0), ok: shot === drill.shot, wrongShot: shot !== drill.shot };
  if (!inCourt) return { ...progress, tries: progress.tries + 1, ok: false };
  const sideOk = drill.id === 'forehand' ? side === 'forehand' : drill.id === 'backhand' ? side === 'backhand' : true;
  return { ...progress, tries: progress.tries + 1, done: progress.done + (sideOk ? 1 : 0), ok: sideOk, wrongSide: !sideOk };
}
const ATTEMPT_MSG = { piccolo: 'Un po’ più deciso', direzione: 'Dall’altra parte' };

export class NatpfTraining {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.active = false;
    this.coach = document.getElementById('natpf-coach');
    this.gesture = document.getElementById('coach-gesture');
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
  _onPhoneSwing(ev){
    if (!this.active || this.cal || !ev?.natpf || ev.ignored) return;
    this.lastShot = ev.natpf.shot;
    const d = this.drill;
    if (d?.shot){ this.ui.phone.learnSpecial?.(d.shot, ev.natpf); this.lastLearn = d.shot; }
  }
  get phoneCal(){ return this.ui.controller === 'phone' && !this.ui.phone.ready; }
  // calOnly: solo la calibrazione del telefono in campo (prima di una sfida), poi si torna a chi l'ha chiesta
  start({ calOnly = false } = {}){
    this.calOnly = calOnly;
    const E = this.engine;
    this.drills = calOnly ? [] : drillsFor(this.ui.controller);
    this.active = true; this.idx = 0; this.progress = { done: 0, tries: 0 }; this.stats = { shots: 0, perfect: 0, out: 0 }; this.wait = 0; this.message = null;
    this.cal = this.phoneCal ? { want: null, held: false, armed: false, hits: 0, fails: 0, done: false } : null;
    this.withCal = !!this.cal;
    this.prevDifficulty = E.hud.selectedDifficulty || E.matchConfig.difficulty;
    E._applyDifficultyTuning('casual'); E.isMultiplayer = false;
    E.setMatchFormat?.('singles');                 // il riscaldamento è sempre in singolare (niente compagni in campo)
    E.hud.hideTitleModal(); E.hud.hideCenterBanner();
    E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false;
    if (this.ui.controller === 'webcam' && E.motionController && !E.motionController.webcamActive) E.motionController.enableWebcam();
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true }); E._syncScoreboardHUD();
    this._hideOpponent(true);
    if (this.cal){
      // calibrazione: niente servizio, il giocatore aspetta la prima palla (il telefono chiede di stare fermo)
      this._idle();
      const c = this.ui.phone.cal;
      if (!c.step || c.step === 'done' || c.step === 'review') this.ui.phone.recalibrate();
      else if (c.step === 'swings' && c.last?.want) this.cal.want = c.last.want;
    } else E._setupPointServe({ showBanner: false });
    E.hud.showCenterBanner('Riscaldamento', { style: 'style-start', subText: this.cal ? 'Prima ti insegno i due colpi' : 'Solo tu e il lanciapalle', durationMs: 1400 });
    this.coach?.classList.remove('hidden');
    this.paint();
  }
  _hideOpponent(on){
    const o = this.engine.opponent;
    if (o?.root) o.root.visible = !on;
    if (o?.shadowBlob) o.shadowBlob.visible = !on;
    document.body.classList.toggle('natpf-training', on);
    // campo d'allenamento: tribune vuote e luci di lavoro; il pannello si sposta di lato (natpf-flow.css)
    this.engine.natpfArena?.setPractice?.(on);
  }
  // giocatore fermo in attesa (nessun servizio, nessuna palla): il motore non deve far partire il punto successivo
  _idle(){
    const E = this.engine;
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false; E.cameraMode = 'RALLY_CAM';
    E.ball.pos.set(0, -5, 0); E.ball.vel.set(0, 0, 0); E.ballTrail?.clear?.();
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
  }
  /* ---------- calibrazione in campo ---------- */
  _onCal(e){
    if (!this.active || !this.cal) return;
    const c = this.cal, hand = this.ui.hand?.hand;
    if (e.want && (e.kind === 'step' || e.kind === 'next')){ c.want = e.want; if (!this.ballLive()) this.wait = Math.min(this.wait || .5, .5); }
    if (e.kind === 'step' && e.step === 'still') this.message = null;
    if (e.kind === 'idle') this.message = 'Non sento movimenti: un colpetto un po’ più deciso';
    if (e.kind === 'attempt'){
      const advance = e.ok || (e.tries || 0) >= 3;     // dopo 3 tentativi la calibrazione va avanti comunque
      if (e.ok){ c.hits++; this.message = 'Riconosciuto ✓'; }
      else this.message = `${ATTEMPT_MSG[e.why] || 'Riprova'}: ${calCoach(e.want, hand).arrow}`;
      if (advance) this._hitHeld(e.want || c.want);
    }
    if (e.kind === 'review'){
      if (e.pass){ this.message = 'Racchetta pronta ✓'; this.ui.phone.confirm(); }
      else {
        c.fails++;
        this.message = c.fails >= 2 ? 'Non riesco a distinguere i due gesti: prova la modalità semplice' : 'Non ho distinto i due gesti: rifacciamo, più ampi';
        if (c.fails < 2) setTimeout(() => this.active && this.ui.phone.retry(), 1600);
      }
    }
    if (e.kind === 'done'){ c.done = true; this._startDrills(); }
    this.paint();
  }
  ballLive(){ const E = this.engine; return E.phase === 'RALLY' && E.ball.inPlay; }
  // gesto riconosciuto: la palla riparte e il giocatore colpisce (o colpirà appena la palla arriva)
  // gesto arrivato prima che la palla si fermi: si colpisce appena la palla arriva al punto d'attesa
  _hitHeld(want){
    const c = this.cal;
    if (!c) return;
    if (!c.held){ c.armed = want || c.want; return; }
    this._release(want);
  }
  _release(want){
    const c = this.cal, E = this.engine;
    c.armed = false; c.held = false; E.natpfTimeScale = 1;
    this.gesture?.classList.add('hidden');
    const side = calSide(want || c.want, this.ui.hand?.hand);
    this.engine.motionController?._emitSwing({ source: 'natpf-warmup', side, shotType: 'topspin', speed: 1.2, dirX: 0, role: E.playerRole });
  }
  _startDrills(){
    if (this.calOnly){ this.stop({ completed: true, calibrated: true }); return; }
    const E = this.engine;
    E.natpfTimeScale = 1; this.gesture?.classList.add('hidden');
    this.cal = null; this.idx = 0; this.progress = { done: 0, tries: 0 };
    this.message = 'Ora con le palle vere';
    E.hud.showCenterBanner('Racchetta pronta', { style: 'style-start', subText: 'Ora le palle vere', durationMs: 1300 });
    this._idle(); this.wait = 1.2;
    this.paint();
  }
  // il telefono non riesce a distinguere i gesti (o chi gioca non vuole calibrare): profilo semplice
  simpleMode(){
    if (!this.active) return;
    this.ui.phone.skipCalibration();
    this.message = 'Modalità semplice: dritto e rovescio li sceglie il gioco';
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
    this.message = d.shot ? (this.progress.done > before ? `${d.label} ✓` : this.progress.tries >= 2 ? 'Ho imparato il tuo gesto: riprova uguale' : (d.shot === 'lob' ? 'Più dal basso verso l’alto' : 'Più lento, dall’alto verso il basso')) : this.progress.done > before ? `${q.label} ✓` : this.progress.wrongSide ? (d.id === 'forehand' ? 'Era un rovescio: la palla va sul dritto' : 'Era un dritto: la palla va sul rovescio') : q.label === 'Fuori' ? 'Fuori: meno angolo o meno forza' : q.label;
    this.paint();
  }
  // colpo molto fuori tempo (il motore lo gioca in difesa): conta come tentativo
  onMistime(early){
    if (!this.active || this.cal) return;
    this.progress = { ...this.progress, tries: this.progress.tries + 1 };
    this.message = early ? 'Troppo presto: aspetta che la palla arrivi vicino' : 'Troppo tardi: colpisci un attimo prima';
    this.paint();
  }
  _ballOver(winner, why){
    const E = this.engine;
    if (!this.cal && winner !== 'player' && E.ball.lastHitter === 'opponent'){ this.progress = { ...this.progress, tries: this.progress.tries + 1 }; this.message = 'Palla persa: colpisci quando arriva alla racchetta'; }
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false; E.natpfTimeScale = 1;
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    if (!this.cal && this.drill && (this.progress.done >= this.drill.need || (this.drill.maxTries && this.progress.tries >= this.drill.maxTries))){ this.idx++; this.progress = { done: 0, tries: 0 }; if (this.idx < this.drills.length) this.message = `Bravo! Ora: ${this.drill.label}`; }
    this.wait = this.cal ? .7 : 1.1;
    this.paint();
  }
  _next(){
    const E = this.engine;
    if (this.ballLive() && E.ball.lastHitter === 'opponent') return;     // c'è già una palla in arrivo
    if (this.cal){
      // una palla per ogni gesto della calibrazione, solo quando il telefono lo chiede
      const step = this.ui.phone.cal.step;
      if (step === 'swings' && this.cal.want){ this._feed(calSide(this.cal.want, this.ui.hand?.hand), { hold: true }); return; }
      this._idle(); this.wait = .4; return;
    }
    if (this.idx >= this.drills.length) return this.stop({ completed: true });
    if (this.drill.id === 'serve'){ E.score.server = 'player'; E._setupPointServe({ showBanner: false }); return; }
    // pallonetto e palla corta: sul dritto, il colpo più comodo
    this._feed(this.drill.id === 'backhand' ? 'backhand' : this.drill.id === 'forehand' || this.drill.shot ? 'forehand' : Math.random() < .5 ? 'forehand' : 'backhand');
  }
  // lanciapalle: palla dal fondo avversario verso il dritto o il rovescio del giocatore locale (destro o mancino)
  _feed(side, { hold = false } = {}){
    const E = this.engine, p = E.player, lefty = this.ui.hand?.hand === 'left';
    const toRight = (side === 'forehand') !== lefty;            // P1 guarda verso -z: la sua destra è +x
    const x = THREE.MathUtils.clamp(p.pos.x + (toRight ? 1.3 : -1.3) + (Math.random() - .5)*(hold ? .2 : .6), -3.4, 3.4);
    const start = new THREE.Vector3((Math.random() - .5)*2, 1.05, -11.6), target = new THREE.Vector3(x, 0, 8.4 + Math.random()*(hold ? .6 : 1.4));
    E.ballTrail?.clear(); E.swingVfx?.clearAllTrails?.();
    E.ball.pos.copy(start);
    E._launchBallToTarget(start, target, hold ? 1.3 : 1.15, { topspin: 10, sidespin: 0, allowNetFault: false });
    Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1, shotType: 'TOPSPIN', isPowerShot: false });
    E.phase = 'RALLY'; E.phaseTimer = 0; E.cameraMode = 'RALLY_CAM';
    E._predictBallIntercept(p);
    E.audioEngine?.playRacketHit?.('topspin', 'good');
    if (this.cal) this.cal.held = false;
  }
  tick(dt){
    if (!this.active) return;
    const E = this.engine, o = E.opponent;
    // il lanciapalle non corre e non risponde: l'avversario resta fuori dal campo
    if (o){ o.pos.set(0, 0, -40); o.targetPos.copy(o.pos); }
    if (this.cal) this._calTick();
    if (this.cal && !this.ballLive() && E.phase === 'POINT_OVER') E.phaseTimer = 0;     // niente servizio automatico
    if (this.wait > 0){ this.wait -= dt; if (this.wait <= 0) this._next(); }
    this.paint();
  }
  // la palla della calibrazione rallenta e si ferma davanti alla racchetta finché il telefono non riconosce il gesto
  _calTick(){
    const E = this.engine, c = this.cal, b = E.ball;
    if (!this.ballLive() || b.lastHitter !== 'opponent' || b.vel.z <= .5) return;
    const lead = (E.player.pos.z - .1 - b.pos.z)/b.vel.z;
    if (c.armed && lead <= CAL_HOLD + .02){ this._release(c.armed); return; }
    if (lead <= CAL_HOLD + .35 && !c.held) E.natpfTimeScale = Math.max(.08, (lead - CAL_HOLD)/.35);    // rallentatore
    if (lead <= CAL_HOLD && !c.held){ c.held = true; E.natpfTimeScale = 0; this.gesture?.classList.remove('hidden'); }
  }
  // «Salta il riscaldamento»: con il telefono non calibrato si passa alla modalità semplice
  skip(){
    if (!this.active) return;
    if (this.ui.controller === 'phone' && !this.ui.phone.ready) this.ui.phone.skipCalibration();
    this.stop({ completed: false, skipped: true });
  }
  // silent: chiusa da una sfida che parte subito dopo (niente menu né risultato)
  stop({ completed, skipped = false, calibrated = false, silent = false }){
    if (!this.active) return;
    const E = this.engine;
    this.active = false; this.cal = null; E.natpfTimeScale = 1;
    this.coach?.classList.add('hidden'); this.gesture?.classList.add('hidden'); this._hideOpponent(false);
    E.opponent.pos.set(-1.35, 0, -11.89); E.opponent.targetPos.copy(E.opponent.pos);
    E._applyDifficultyTuning(this.prevDifficulty || 'casual');
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true });
    E._syncScoreboardHUD(); E.hud.hideCenterBanner();
    E._setupMidRallyShowcase({}); E.autoPlayMode = true; E.userHasInteracted = false;
    if (silent) return;
    E.hud.showTitleModal();
    this.ui.flow?.onTrainingEnd({ completed, skipped, calibrated, stats: this.stats });
  }
  paint(){
    if (!this.active || !this.coach) return;
    const $ = sel => this.coach.querySelector(sel);
    const t = $('#coach-text'), s = $('#coach-sub'), k = $('#coach-kicker');
    const c = this.ui.controller, hand = this.ui.hand?.hand;
    const stages = this.withCal ? [CAL_STAGE, ...this.drills] : this.drills;
    const cur = this.cal ? 0 : stages.indexOf(this.drill);
    const list = $('#coach-stages');
    const key = stages.map(x => x.id).join() + cur;
    if (list && list.dataset.key !== key){ list.dataset.key = key; list.innerHTML = stages.map((x, i) => `<li class="${i < cur ? 'done' : i === cur ? 'on' : ''}">${x.label}</li>`).join(''); }
    show($('#coach-simple'), !!this.cal && this.cal.fails >= 1);
    const msg = this.message ? ` · ${this.message}` : '';
    if (this.cal){
      const step = this.ui.phone.cal.step, want = this.cal.want || this.ui.phone.cal.last?.want;
      k.textContent = 'Riscaldamento · calibrazione';
      if (!step || step === 'still' || step === 'grip'){ t.textContent = 'Telefono in verticale, fermo'; s.textContent = 'Nel palmo, schermo verso il palmo, come il manico di una racchetta. Un attimo e partiamo.' + msg; }
      else if (step === 'swings' && want){
        const g = calCoach(want, hand);
        t.textContent = `${g.title}: muovi il telefono ${g.move} ${g.arrow}`;
        s.textContent = (this.cal.held ? 'La palla ti aspetta: fai il gesto.' : 'Un colpetto comodo quando la palla arriva, poi fermati.') + msg;
        const gt = document.getElementById('coach-gesture-text'); if (gt) gt.textContent = `${g.title} ${g.arrow}`;
        const card = this.gesture?.querySelector('.gesture-card'); if (card) card.dataset.dir = want;
      }
      else { t.textContent = 'Controllo i tuoi gesti…'; s.textContent = this.message || ''; }
      this.coach.classList.toggle('hot', !!this.cal.held);
      return;
    }
    const d = this.drill, ctrl = c in (d?.hint || {}) ? c : 'phone';
    k.textContent = `Riscaldamento · ${(this.idx || 0) + 1} di ${this.drills.length}`;
    if (!d){ t.textContent = 'Riscaldamento completato'; s.textContent = ''; return; }
    t.textContent = `${d.label} ${Math.min(this.progress.done, d.need)}/${d.need}`;
    s.textContent = d.hint[ctrl] + msg;
    this.coach.classList.toggle('hot', E_isHot(this.engine));
  }
}
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const E_isHot = E => E.phase === 'RALLY' && E.ball.lastHitter === 'opponent' && E.ball.vel.z > .1 && (E.player.pos.z - E.ball.pos.z)/E.ball.vel.z < .5;
