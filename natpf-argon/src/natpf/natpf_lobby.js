// Lobby in stile console: una scelta per schermata (1 Partita → 2 Racchetta → 3 Visuale), tessere grandi
// sopra l'arena, navigazione con frecce/Invio/Esc. Comprende il punto di prova guidato: un punto contro la CPU
// facile, con un allenatore che dice cosa fare (servizio, quando colpire, com'è andato il colpo), che non conta
// per il punteggio e riporta alla lobby.
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const LOBBY_STEPS = ['mode', 'racket', 'view'];

const SERVE_HINT = { phone: 'Fai un gesto con il telefono per lanciare la palla', webcam: 'Alza la mano di scatto per lanciare la palla', mouse: 'Premi ↑ o W per lanciare la palla (o Spazio)' };
const HIT_HINT = { phone: 'un gesto deciso con il telefono', webcam: 'uno swing della mano', mouse: 'Spazio' };
const GRADE = [[/VERY EARLY/, 'Molto in anticipo: aspetta che la palla arrivi alla racchetta'], [/VERY LATE/, 'Molto in ritardo: inizia il gesto un po’ prima'],
  [/PERFECT|POWER/, 'Perfetto: colpo al momento giusto'], [/EARLY/, 'Un po’ in anticipo: la palla va incrociata'], [/LATE/, 'Un po’ in ritardo: la palla va lungolinea'], [/GOOD/, 'Buon colpo']];
export const gradeHint = grade => (GRADE.find(([re]) => re.test(String(grade || ''))) || [null, 'Colpo riuscito'])[1];
const GRADE_RANK = g => /PERFECT|POWER/.test(g) ? 3 : /VERY/.test(g) ? 1 : /EARLY|LATE|GOOD/.test(g) ? 2 : 0;
const GRADE_LABEL = g => /PERFECT|POWER/.test(g) ? 'perfetto' : /VERY/.test(g) ? 'di recupero' : /EARLY/.test(g) ? 'in anticipo' : /LATE/.test(g) ? 'in ritardo' : 'buono';

// Testo dell'allenatore per lo stato della partita (funzione pura, per i test).
export function coachMessage(engine, controller, practice = {}){
  const c = SERVE_HINT[controller] ? controller : 'mouse', b = engine.ball, p = engine.player;
  switch (engine.phase){
    case 'SERVE_STANCE': return engine.score.server === 'player' ? { text: 'Servi tu', sub: SERVE_HINT[c] } : { text: 'Serve l’avversario', sub: 'Guarda la palla: il tuo giocatore si sposta da solo' };
    case 'SERVE_TOSS': return engine.score.server === 'player' ? { text: 'Colpisci adesso, mentre è in alto', sub: `Usa ${HIT_HINT[c]}`, hot: true } : { text: 'Preparati alla risposta', sub: 'Colpisci quando la palla arriva alla racchetta' };
    case 'RALLY': {
      if (b.lastHitter === 'player') return { text: practice.lastGrade ? 'Bel colpo!' : 'Palla dall’altra parte', sub: practice.lastGrade ? gradeHint(practice.lastGrade) : 'Torna pronto' };
      const tta = b.vel.z > .1 ? (p.pos.z - b.pos.z)/b.vel.z : Infinity;
      return tta < .5 ? { text: 'Colpisci ora!', sub: `Usa ${HIT_HINT[c]}`, hot: true } : { text: 'Arriva verso di te', sub: 'Il giocatore corre da solo: tu pensa solo al colpo' };
    }
    case 'POINT_OVER': return practice.won ? { text: 'Punto tuo!', sub: 'Ottimo, sei pronto per la partita' } : { text: 'Punto all’avversario', sub: 'Nessun problema: puoi riprovare' };
    default: return { text: '', sub: '' };
  }
}

export class NatpfLobby {
  constructor(engine, ui, onboarding){
    this.engine = engine; this.ui = ui; this.onboarding = onboarding;
    this.el = $('title-modal');
    this.step = 'mode';
    this.practice = null;
    for (const b of this.el.querySelectorAll('[data-goto]')) b.addEventListener('click', e => { e.stopPropagation(); this.go(b.dataset.goto); });
    $('lobby-next').addEventListener('click', e => { e.stopPropagation(); this.next(); });
    $('lobby-back').addEventListener('click', e => { e.stopPropagation(); this.back(); });
    $('lobby-practice').addEventListener('click', e => { e.stopPropagation(); this.startPractice(); });
    $('lobby-help').addEventListener('click', e => { e.stopPropagation(); this.onboarding.open(); });
    $('coach-exit').addEventListener('click', e => { e.stopPropagation(); this.endPractice({ early: true }); });
    // un trascinamento sulla lobby non deve diventare uno swing del mouse di Argon
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
    $('natpf-coach').addEventListener('pointerdown', e => e.stopPropagation());
    // tastiera della lobby prima di quella di Argon (che con Spazio/Invio/frecce colpirebbe)
    window.addEventListener('keydown', e => this._key(e), true);
    this.go('mode');
  }
  get visible(){ return this.el.style.display !== 'none' && !this.el.classList.contains('hidden'); }

  go(step){
    if (!LOBBY_STEPS.includes(step)) return;
    this.step = step; this.el.dataset.step = step;
    const k = LOBBY_STEPS.indexOf(step);
    for (const p of this.el.querySelectorAll('[data-page]')) p.classList.toggle('on', p.dataset.page === step);
    for (const b of this.el.querySelectorAll('[data-goto]')){ const i = LOBBY_STEPS.indexOf(b.dataset.goto); b.className = i === k ? 'on' : i < k ? 'done' : ''; b.setAttribute('aria-current', i === k ? 'step' : 'false'); }
    show($('lobby-back'), k > 0);
    show($('lobby-next'), k < LOBBY_STEPS.length - 1);
    show($('btn-start-match'), k === LOBBY_STEPS.length - 1);
    show($('lobby-practice'), k === LOBBY_STEPS.length - 1 && this.engine.playerRole !== 'p2');
    if (step !== 'view') show($('lobby-practice-result'), false);
    this.ui.paintTiles();
    requestAnimationFrame(() => (this._tiles()[0] && this._tiles().find(t => t.classList.contains('selected')) || this._tiles()[0])?.focus({ preventScroll: true }));
  }
  next(){ const k = LOBBY_STEPS.indexOf(this.step); if (k < LOBBY_STEPS.length - 1) this.go(LOBBY_STEPS[k + 1]); else $('btn-start-match').click(); }
  back(){ const k = LOBBY_STEPS.indexOf(this.step); if (k > 0) this.go(LOBBY_STEPS[k - 1]); }
  _tiles(){ return [...this.el.querySelectorAll(`[data-page="${this.step}"] .lobby-tile`)]; }
  _key(e){
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (this.onboarding.isOpen){ if (this.onboarding.key(e)){ e.preventDefault(); } e.stopImmediatePropagation(); return; }
    const sheetOpen = [...document.querySelectorAll('.natpf-sheet-backdrop')].some(m => !m.classList.contains('hidden'));
    if (e.code === 'KeyH' && !sheetOpen){ e.stopImmediatePropagation(); this.onboarding.open(); return; }
    if (!this.visible || sheetOpen || this.practice) return;
    if (e.code === 'Tab') return;
    e.stopImmediatePropagation();
    const tiles = this._tiles(), i = tiles.indexOf(document.activeElement);
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.code) && tiles.length){
      e.preventDefault();
      const d = e.code === 'ArrowRight' || e.code === 'ArrowDown' ? 1 : -1, t = tiles[(i < 0 ? 0 : i + d + tiles.length) % tiles.length];
      t.focus(); t.click();
    } else if (e.code === 'Enter'){ e.preventDefault(); this.next(); }
    else if (e.code === 'Escape' || e.code === 'Backspace'){ e.preventDefault(); this.back(); }
  }

  /* ---------- punto di prova ---------- */
  startPractice(){
    const ui = this.ui, E = this.engine;
    if (ui.controller === 'phone' && !ui.phone.ready){ ui.openPhone({ after: () => this.startPractice() }); return; }
    this.practice = { hits: 0, best: '', lastGrade: '', whiffs: 0, won: false, ending: false, prevDifficulty: E.hud.selectedDifficulty || E.matchConfig.difficulty };
    E._applyDifficultyTuning('casual');
    E.hud.hideTitleModal();
    E.autoPlayMode = !1; E.userHasInteracted = !0; E.persistentStateLock = !1;
    if (ui.controller === 'webcam' && E.motionController) E.motionController.enableWebcam();
    E.startNewMatch({ showStartBanner: !1 });
    E.hud.showCenterBanner('Punto di prova', { style: 'style-start', subText: 'Non conta per il punteggio', durationMs: 1500 });
    show($('natpf-coach')); this.tick();
  }
  feedback({ role = 'p1', kind, grade = '' } = {}){
    const p = this.practice; if (!p || role !== 'p1') return;
    if (kind === 'hit'){ p.hits++; p.lastGrade = grade; if (GRADE_RANK(grade) > GRADE_RANK(p.best)) p.best = grade; }
    if (kind === 'whiff') p.whiffs++;
  }
  tick(){
    const p = this.practice, E = this.engine; if (!p) return;
    if (E.phase === 'POINT_OVER' && !p.ending){ p.ending = true; p.won = E.score.playerPoints > 0; setTimeout(() => this.endPractice(), 1600); }
    const m = coachMessage(E, this.ui.controller, p), box = $('natpf-coach');
    $('coach-text').textContent = m.text; $('coach-sub').textContent = m.sub; box.classList.toggle('hot', !!m.hot);
  }
  endPractice({ early = false } = {}){
    const p = this.practice, E = this.engine; if (!p) return;
    this.practice = null; show($('natpf-coach'), false);
    E._applyDifficultyTuning(p.prevDifficulty || 'casual');
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: !0 });
    E._syncScoreboardHUD(); E.hud.hideCenterBanner();
    E._setupMidRallyShowcase({}); E.autoPlayMode = !0;
    E.hud.showTitleModal(); this.go('view');
    const r = $('lobby-practice-result');
    r.innerHTML = `<b>${early ? 'Punto di prova interrotto' : p.won ? 'Punto di prova vinto' : 'Punto di prova finito'}</b>
      <span>${p.hits ? `${p.hits} ${p.hits === 1 ? 'colpo riuscito' : 'colpi riusciti'} · miglior colpo ${GRADE_LABEL(p.best)}` : 'Nessun colpo questa volta: guarda la palla e colpisci quando arriva alla racchetta'}</span>
      <button type="button" class="lobby-ghost" data-retry>Riprova</button>`;
    r.querySelector('[data-retry]').addEventListener('click', e => { e.stopPropagation(); this.startPractice(); });
    show(r);
  }
}
