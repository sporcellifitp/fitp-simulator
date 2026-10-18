// Allenamento: in campo c'è solo il giocatore. Dall'altra parte un lanciapalle (l'avversario non si vede e non
// risponde) manda palle sul dritto o sul rovescio. Percorso breve: servizio, dritto, rovescio, colpi liberi.
// Serve a provare la racchetta appena calibrata; non conta per il punteggio e alla fine torna al menu.
import * as THREE from 'three';

export const DRILLS = Object.freeze([
  { id: 'serve', label: 'Servizio', need: 2, hint: { phone: 'Un gesto lancia la palla, il secondo la colpisce in alto', webcam: 'Alza la mano per lanciare, poi swing in alto', mouse: '↑ o W per lanciare, poi Spazio' } },
  { id: 'forehand', label: 'Dritto', need: 3, hint: { phone: 'Palla sul lato della racchetta: colpisci quando arriva', webcam: 'Swing quando la palla arriva alla racchetta', mouse: 'Spazio quando la palla arriva' } },
  { id: 'backhand', label: 'Rovescio', need: 3, hint: { phone: 'Palla sull’altro lato: gesto nel verso opposto', webcam: 'Swing verso l’altro lato', mouse: 'Spazio o trascina verso l’altro lato' } },
  { id: 'free', label: 'Colpi liberi', need: 3, hint: { phone: 'Prova ad angolare: gira il piatto a sinistra o a destra', webcam: 'Prova a mirare: lo swing sposta la palla', mouse: 'Q/E o A/D per mirare' } },
]);
// avanzamento di un esercizio (funzione pura, per i test)
export function drillAfterShot(drill, progress, { side, inCourt }){
  if (!inCourt) return { ...progress, tries: progress.tries + 1, ok: false };
  const sideOk = drill.id === 'forehand' ? side === 'forehand' : drill.id === 'backhand' ? side === 'backhand' : true;
  return { ...progress, tries: progress.tries + 1, done: progress.done + (sideOk ? 1 : 0), ok: sideOk, wrongSide: !sideOk };
}

export class NatpfTraining {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.active = false;
    this.coach = document.getElementById('natpf-coach');
    document.getElementById('coach-exit')?.addEventListener('click', e => { e.stopPropagation(); this.stop({ completed: false }); });
    this.coach?.addEventListener('pointerdown', e => e.stopPropagation());
    // durante l'allenamento i punti non contano: il motore chiede un punto, qui si passa alla palla successiva
    const award = engine._awardPoint.bind(engine);
    engine._awardPoint = (winner, why = '') => this.active ? this._ballOver(winner, why) : award(winner, why);
  }
  get drill(){ return DRILLS[this.idx]; }
  start(){
    const E = this.engine;
    this.active = true; this.idx = 0; this.progress = { done: 0, tries: 0 }; this.stats = { shots: 0, perfect: 0, out: 0 }; this.wait = 0; this.message = null;
    this.prevDifficulty = E.hud.selectedDifficulty || E.matchConfig.difficulty;
    E._applyDifficultyTuning('casual'); E.isMultiplayer = false;
    E.hud.hideTitleModal(); E.hud.hideCenterBanner();
    E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false;
    if (this.ui.controller === 'webcam' && E.motionController && !E.motionController.webcamActive) E.motionController.enableWebcam();
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true }); E._syncScoreboardHUD();
    this._hideOpponent(true);
    E._setupPointServe({ showBanner: false });
    E.hud.showCenterBanner('Allenamento', { style: 'style-start', subText: 'Solo tu e il lanciapalle', durationMs: 1400 });
    this.coach?.classList.remove('hidden');
    this.paint();
  }
  _hideOpponent(on){
    const o = this.engine.opponent;
    if (o?.root) o.root.visible = !on;
    if (o?.shadowBlob) o.shadowBlob.visible = !on;
    document.body.classList.toggle('natpf-training', on);
  }
  // colpo del giocatore locale (dall'aptica, già con l'esito dell'anello)
  onShot(q){
    if (!this.active || !q) return;
    const E = this.engine, d = this.drill;
    this.stats.shots++; if (q.color === 'green') this.stats.perfect++; if (q.label === 'Fuori') this.stats.out++;
    const side = E.player.swingType === 'backhand' ? 'backhand' : E.player.swingType === 'smash' ? 'smash' : 'forehand';
    // il servizio si conta qui; gli altri esercizi quando la palla è giocabile (anche fuori conta come tentativo)
    const before = this.progress.done;
    this.progress = drillAfterShot(d, this.progress, { side: d.id === 'serve' ? 'serve' : side, inCourt: q.label !== 'Fuori' && q.label !== 'Mancata' });
    this.message = this.progress.done > before ? `${q.label} ✓` : this.progress.wrongSide ? (d.id === 'forehand' ? 'Era un rovescio: la palla va sul dritto' : 'Era un dritto: la palla va sul rovescio') : q.label === 'Fuori' ? 'Fuori: meno angolo o meno forza' : q.label;
    this.paint();
  }
  _ballOver(winner, why){
    const E = this.engine;
    if (winner !== 'player' && E.ball.lastHitter === 'opponent') { this.progress = { ...this.progress, tries: this.progress.tries + 1 }; this.message = 'Palla persa: colpisci quando arriva alla racchetta'; }
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false;
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    if (this.progress.done >= this.drill.need){ this.idx++; this.progress = { done: 0, tries: 0 }; if (this.idx < DRILLS.length) this.message = `Bravo! Ora: ${this.drill.label}`; }
    this.wait = 1.1;
    this.paint();
  }
  _next(){
    const E = this.engine;
    if (this.idx >= DRILLS.length) return this.stop({ completed: true });
    if (this.drill.id === 'serve'){ E.score.server = 'player'; E._setupPointServe({ showBanner: false }); return; }
    this._feed(this.drill.id === 'backhand' ? 'backhand' : this.drill.id === 'forehand' ? 'forehand' : Math.random() < .5 ? 'forehand' : 'backhand');
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
    E._predictBallIntercept(p);
    E.audioEngine?.playRacketHit?.('topspin', 'good');
  }
  tick(dt){
    if (!this.active) return;
    const E = this.engine, o = E.opponent;
    // il lanciapalle non corre e non risponde: l'avversario resta fuori dal campo
    if (o){ o.pos.set(0, 0, -40); o.targetPos.copy(o.pos); }
    if (this.wait > 0){ this.wait -= dt; if (this.wait <= 0) this._next(); }
    this.paint();
  }
  stop({ completed }){
    if (!this.active) return;
    const E = this.engine;
    this.active = false; this.coach?.classList.add('hidden'); this._hideOpponent(false);
    E.opponent.pos.set(-1.35, 0, -11.89); E.opponent.targetPos.copy(E.opponent.pos);
    E._applyDifficultyTuning(this.prevDifficulty || 'casual');
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true });
    E._syncScoreboardHUD(); E.hud.hideCenterBanner();
    E._setupMidRallyShowcase({}); E.autoPlayMode = true;
    E.hud.showTitleModal();
    this.ui.flow?.onTrainingEnd({ completed, stats: this.stats });
  }
  paint(){
    if (!this.active || !this.coach) return;
    const d = this.drill, c = this.ui.controller in (d?.hint || {}) ? this.ui.controller : 'phone';
    const t = this.coach.querySelector('#coach-text'), s = this.coach.querySelector('#coach-sub'), k = this.coach.querySelector('.coach-kicker');
    const steps = DRILLS.map((x, i) => i < this.idx ? '●' : i === this.idx ? '◉' : '○').join(' ');
    if (k) k.textContent = `Allenamento ${steps}`;
    if (!d){ t.textContent = 'Allenamento completato'; s.textContent = ''; return; }
    const msg = this.message ? ` · ${this.message}` : '';
    t.textContent = `${d.label} ${Math.min(this.progress.done, d.need)}/${d.need}`;
    s.textContent = d.hint[c] + msg;
    this.coach.classList.toggle('hot', E_isHot(this.engine));
  }
}
const E_isHot = E => E.phase === 'RALLY' && E.ball.lastHitter === 'opponent' && E.ball.vel.z > .1 && (E.player.pos.z - E.ball.pos.z)/E.ball.vel.z < .5;
