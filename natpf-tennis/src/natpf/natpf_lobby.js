// Menu pensato per chi vede il gioco per la prima volta (in fiera, a un evento): una pagina alla volta, un pulsante
// grande per andare avanti, «Indietro» sempre visibile, niente tappe da sbloccare.
//   benvenuto → con cosa giochi (smartphone o webcam, mano) → collega (QR e tre passi sul telefono, oppure la webcam)
//   → riscaldamento in campo (calibrazione del telefono e lanciapalle insieme, natpf_training.js, sempre saltabile)
//   → partita (avversario, durata, visuale, «Gioca»).
// Appena il telefono ha i sensori attivi si entra in campo da soli; con la webcam appena si vede la mano.
// Dietro il menu gira una dimostrazione: nessun gesto la trasforma in partita (natpf_ui.js, _gateInput).
// Easter egg: digitando «natpf» nel menu compaiono mouse e tastiera (modalità prova per il computer).
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const LOBBY_STEPS = ['welcome', 'controller', 'connect', 'warmup', 'match'];
export const EGG_WORD = 'natpf';
// Il controller è pronto per entrare in campo? (funzione pura, per i test)
//   telefono: collegato e con i sensori attivi (la calibrazione si fa in campo, nel riscaldamento)
export function stepReady(step, { controller, phoneLinked, webcamActive }){
  if (step === 'connect') return controller === 'phone' ? !!phoneLinked : controller === 'webcam' ? !!webcamActive : true;
  return true;
}
// Si entra in campo da soli quando il controller è pronto (telefono con i sensori attivi, webcam che vede la mano)
export function autoAdvance(step, { controller, phoneLinked, handSeen }){
  return step === 'connect' && (controller === 'phone' ? !!phoneLinked : controller === 'webcam' ? !!handSeen : false);
}
// Ogni visitatore riparte dal benvenuto
export const initialStep = () => 'welcome';
// Riconosce la parola dell'easter egg tra i tasti digitati
export function eggTyped(buffer, key){ const next = (buffer + String(key || '').toLowerCase()).slice(-EGG_WORD.length); return { buffer: next, hit: next === EGG_WORD }; }

export class NatpfLobby {
  constructor(engine, ui, onboarding){
    this.engine = engine; this.ui = ui; this.onboarding = onboarding;
    this.el = $('title-modal');
    this.eggBuffer = '';
    this.trainingDone = false;
    this.autoFrom = null;            // tappa da cui si è già entrati in campo da soli (una volta sola)
    this.step = initialStep();
    $('welcome-play')?.addEventListener('click', e => { e.stopPropagation(); this.go('controller'); });
    $('lobby-next').addEventListener('click', e => { e.stopPropagation(); this.next(); });
    $('lobby-back').addEventListener('click', e => { e.stopPropagation(); this.back(); });
    $('lobby-warmup').addEventListener('click', e => { e.stopPropagation(); this.go('warmup'); });
    $('lobby-help').addEventListener('click', e => { e.stopPropagation(); this.onboarding.open(); });
    $('setup-cam-go').addEventListener('click', async e => { e.stopPropagation(); await this.ui.startWebcam(); this.paint(); });
    $('connect-other')?.addEventListener('click', e => { e.stopPropagation(); this.ui.selectController(this.ui.controller === 'phone' ? 'webcam' : 'phone', { open: false }); this.go('connect'); });
    // scegliere la racchetta è già andare avanti
    this.el.addEventListener('click', e => { const t = e.target.closest('[data-natpf-controller]'); if (t && this.step === 'controller') setTimeout(() => this.go('connect'), 160); });
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
    // tastiera del menu prima di quella del motore (che con Spazio/Invio/frecce colpirebbe)
    window.addEventListener('keydown', e => this._key(e), true);
    // partite brevi: in fiera si gioca un game
    document.querySelector('#match-length-group [data-games="1"]')?.click();
    this.go(this.step);
    setInterval(() => this.visible && this.paint(), 300);   // stato di telefono e webcam
  }
  get visible(){ return this.el.style.display !== 'none' && !this.el.classList.contains('hidden'); }
  state(){
    const p = this.ui.phone, L = p.state, mc = this.engine.motionController;
    return {
      controller: this.ui.controller,
      phoneConnected: p.connected, phoneReady: p.ready,
      phoneLinked: p.connected && (L.phone === 'cal' || L.phone === 'ready'),
      webcamActive: !!mc?.webcamActive,
      handSeen: !!mc?.webcamActive && performance.now() - (mc.latestHandSeenAt || -1e9) < 600,
    };
  }
  go(step){
    if (!LOBBY_STEPS.includes(step)) return;
    if (step === 'warmup'){ this.startWarmup(); return; }
    this.step = step; this.el.dataset.step = step;
    for (const p of this.el.querySelectorAll('[data-page]')) p.classList.toggle('on', p.dataset.page === step);
    if (step === 'connect'){
      // si entra in campo da soli solo quando il controller diventa pronto mentre si è qui (non tornando indietro)
      this.autoFrom = autoAdvance('connect', this.state()) ? 'connect' : null;
      if (this.ui.controller === 'phone') this.ui.phone.start().catch(err => this.ui._warn(`Collegamento non disponibile (${err.message}).`));
      if (this.ui.controller === 'webcam' && !this.engine.motionController?.webcamActive) this.ui.startWebcam().then(() => this.paint());
    }
    this.paint();
    requestAnimationFrame(() => (this._tiles().find(t => t.classList.contains('selected')) || this._tiles()[0] || this._primary())?.focus({ preventScroll: true }));
  }
  _primary(){ return this.step === 'welcome' ? $('welcome-play') : this.step === 'match' ? $('btn-start-match') : $('lobby-next'); }
  paint(){
    const st = this.state(), k = LOBBY_STEPS.indexOf(this.step);
    for (const li of this.el.querySelectorAll('[data-progress]')){ const i = LOBBY_STEPS.indexOf(li.dataset.progress); li.className = i === k ? 'on' : i < k ? 'done' : ''; }
    const welcome = this.step === 'welcome', match = this.step === 'match';
    show($('lobby-back'), !welcome);
    show($('lobby-next'), !welcome && !match);
    show($('btn-start-match'), match);
    show($('lobby-warmup'), match);
    this.el.querySelector('.lobby-bottom')?.classList.toggle('only-help', welcome);
    const next = $('lobby-next');
    next.disabled = !stepReady(this.step, st);
    next.textContent = this.step === 'connect' ? 'In campo ›' : 'Avanti ›';
    // collega: pannello del controller scelto
    for (const p of this.el.querySelectorAll('[data-setup]')) show(p, p.dataset.setup === st.controller);
    const other = $('connect-other');
    if (other){ show(other, st.controller !== 'mouse'); other.textContent = st.controller === 'phone' ? 'Non hai il telefono a portata? Usa la webcam' : 'Preferisci il telefono? Usa lo smartphone'; }
    $('lobby-t-connect').textContent = st.controller === 'phone' ? 'Collega il telefono' : st.controller === 'webcam' ? 'Accendi la webcam' : 'Mouse e tastiera';
    if (this.step === 'connect' && st.controller === 'phone') this.ui.paintConnect();
    this.ui.paintWebcamSetup?.();
    const note = $('lobby-match-note');
    if (note) note.textContent = st.controller === 'phone' && !st.phoneReady ? 'Il telefono va ricollegato: premendo «Gioca» compare il QR.' : '';
    // telefono con i sensori attivi o mano vista dalla webcam: si entra in campo da soli
    if (this.visible && autoAdvance(this.step, st) && this.autoFrom !== this.step){ this.autoFrom = this.step; setTimeout(() => this.visible && this.step === 'connect' && this.go('warmup'), 700); }
  }
  next(){
    const k = LOBBY_STEPS.indexOf(this.step);
    if (!stepReady(this.step, this.state())) return;
    if (this.step === 'welcome') return this.go('controller');
    if (k < LOBBY_STEPS.length - 1) this.go(LOBBY_STEPS[k + 1]); else $('btn-start-match').click();
  }
  // dalla partita si torna al collegamento (il riscaldamento si rifà con il suo pulsante)
  back(){ const k = LOBBY_STEPS.indexOf(this.step); if (k > 0) this.go(this.step === 'match' ? 'connect' : LOBBY_STEPS[k - 1]); }
  _tiles(){ return [...this.el.querySelectorAll(`[data-page="${this.step}"] .lobby-tile`)].filter(t => !t.classList.contains('hidden')); }
  _key(e){
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (this.onboarding.isOpen){ if (this.onboarding.key(e)) e.preventDefault(); e.stopImmediatePropagation(); return; }
    const sheetOpen = [...document.querySelectorAll('.natpf-sheet-backdrop')].some(m => !m.classList.contains('hidden'));
    // in campo: Esc apre e chiude la pausa
    if (!this.visible){
      if (e.code === 'Escape' && this.ui.pause){ e.preventDefault(); e.stopImmediatePropagation(); this.ui.pause.toggle(); }
      return;
    }
    if (sheetOpen) return;
    if (e.code === 'Tab') return;
    e.stopImmediatePropagation();
    if (e.key && e.key.length === 1){ const r = eggTyped(this.eggBuffer, e.key); this.eggBuffer = r.buffer; if (r.hit){ this.ui.toggleTestInput(); this.eggBuffer = ''; return; } }
    const tiles = this._tiles(), i = tiles.indexOf(document.activeElement);
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.code) && tiles.length){
      e.preventDefault();
      const d = e.code === 'ArrowRight' || e.code === 'ArrowDown' ? 1 : -1, t = tiles[(i < 0 ? 0 : i + d + tiles.length) % tiles.length];
      t.focus(); if (this.step !== 'controller') t.click();
    } else if (e.code === 'Enter'){ e.preventDefault(); if (this.step === 'controller' && i >= 0) tiles[i].click(); else this.next(); }
    else if (e.code === 'Escape' || e.code === 'Backspace'){ e.preventDefault(); this.back(); }
    else if (e.code === 'KeyH'){ this.onboarding.open(); }
  }
  /* ---------- riscaldamento in campo ---------- */
  startWarmup(){
    const ui = this.ui;
    // telefono non ancora collegato: prima il collegamento
    if (ui.controller === 'phone' && !this.state().phoneLinked){ this.go('connect'); return; }
    this.step = 'warmup'; this.el.dataset.step = 'warmup';
    ui.training.start();
  }
  // compatibilità: l'onboarding propone ancora «Prova» → riscaldamento
  startPractice(){ this.go(this.ui.controller === 'phone' && !this.state().phoneLinked ? 'connect' : 'warmup'); }
  onTrainingEnd({ completed, skipped, stats }){
    if (completed) this.trainingDone = true;
    this.go('match');
    const r = $('lobby-practice-result');
    r.innerHTML = skipped ? `<b>Riscaldamento saltato</b><span>${this.ui.phone.simple ? 'Modalità semplice: dritto e rovescio li sceglie il gioco.' : 'Lo puoi rifare quando vuoi.'}</span>`
      : `<b>${completed ? 'Riscaldamento completato ✓' : 'Riscaldamento interrotto'}</b><span>${stats.shots} colpi · ${stats.perfect} perfetti${stats.out ? ` · ${stats.out} fuori` : ''}</span>`;
    show(r);
    this.paint();
  }
  tick(){}
  feedback(){}
}
