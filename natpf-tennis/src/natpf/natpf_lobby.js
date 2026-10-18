// Menu a tappe, come il tutorial di un videogioco: 1 come si gioca → 2 controller (smartphone o webcam) e mano →
// 3 preparazione (collegamento e calibrazione del telefono, oppure webcam e inquadratura) → 4 allenamento da solo →
// 5 impostazioni della partita e «Gioca». Si va avanti solo quando la tappa è pronta. Chi ha già completato il
// percorso riparte dalla partita, con le tappe precedenti sempre raggiungibili.
// Easter egg: digitando «natpf» nel menu compaiono mouse e tastiera (modalità prova per il computer).
import { DRILLS } from './natpf_training.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const LOBBY_STEPS = ['howto', 'controller', 'setup', 'training', 'match'];
export const EGG_WORD = 'natpf';
const store = {
  get(k, d){ try { return localStorage.getItem('natpf-tennis.' + k) ?? d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem('natpf-tennis.' + k, v); } catch {} },
};
// La tappa è pronta per andare avanti? (funzione pura, per i test)
export function stepReady(step, { controller, phoneReady, webcamActive, trainingDone }){
  if (step === 'setup') return controller === 'phone' ? phoneReady : controller === 'webcam' ? webcamActive : true;
  if (step === 'training') return !!trainingDone;
  return true;
}
// Da dove riparte il menu: prima volta dal tutorial, poi dalla partita (il telefono si ricollega con «Gioca»)
export const initialStep = ({ flowDone }) => (flowDone ? 'match' : 'howto');
// Riconosce la parola dell'easter egg tra i tasti digitati
export function eggTyped(buffer, key){ const next = (buffer + String(key || '').toLowerCase()).slice(-EGG_WORD.length); return { buffer: next, hit: next === EGG_WORD }; }

export class NatpfLobby {
  constructor(engine, ui, onboarding){
    this.engine = engine; this.ui = ui; this.onboarding = onboarding;
    this.el = $('title-modal');
    this.eggBuffer = '';
    this.trainingDone = store.get('trainingDone', '') === '1';
    this.step = initialStep({ flowDone: store.get('flowDone', '') === '1' });
    for (const b of this.el.querySelectorAll('[data-goto]')) b.addEventListener('click', e => { e.stopPropagation(); this.goIfAllowed(b.dataset.goto); });
    $('lobby-next').addEventListener('click', e => { e.stopPropagation(); this.next(); });
    $('lobby-back').addEventListener('click', e => { e.stopPropagation(); this.back(); });
    $('lobby-skip').addEventListener('click', e => { e.stopPropagation(); this.go('match'); });
    $('lobby-help').addEventListener('click', e => { e.stopPropagation(); this.onboarding.open(); });
    $('setup-phone-go').addEventListener('click', e => { e.stopPropagation(); this.ui.openPhone({ after: () => this.go('training') }); });
    $('setup-cam-go').addEventListener('click', async e => { e.stopPropagation(); await this.ui.startWebcam(); this.paint(); });
    $('training-go').addEventListener('click', e => { e.stopPropagation(); this.startTraining(); });
    $('training-recal').addEventListener('click', e => { e.stopPropagation(); this.ui.openPhone(); });
    $('btn-start-match')?.addEventListener('click', () => store.set('flowDone', '1'));
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
    // tastiera del menu prima di quella del motore (che con Spazio/Invio/frecce colpirebbe)
    window.addEventListener('keydown', e => this._key(e), true);
    $('training-list').innerHTML = DRILLS.map(d => `<li data-drill="${d.id}"><b>${d.label}</b><span>${d.need}×</span></li>`).join('');
    this.go(this.step);
    setInterval(() => this.visible && this.paint(), 400);   // stato di telefono e webcam
  }
  get visible(){ return this.el.style.display !== 'none' && !this.el.classList.contains('hidden'); }
  // le tappe successive si raggiungono solo se quelle prima sono pronte
  goIfAllowed(step){
    const k = LOBBY_STEPS.indexOf(step), cur = LOBBY_STEPS.indexOf(this.step);
    if (k <= cur || LOBBY_STEPS.slice(0, k).every(s => stepReady(s, this.state()))) this.go(step);
  }
  state(){ return { controller: this.ui.controller, phoneReady: this.ui.phone.ready, webcamActive: !!this.engine.motionController?.webcamActive, trainingDone: this.trainingDone }; }
  go(step){
    if (!LOBBY_STEPS.includes(step)) return;
    this.step = step; this.el.dataset.step = step;
    for (const p of this.el.querySelectorAll('[data-page]')) p.classList.toggle('on', p.dataset.page === step);
    if (step === 'setup' && this.ui.controller === 'webcam' && !this.engine.motionController?.webcamActive) this.ui.startWebcam().then(() => this.paint());
    this.paint();
    requestAnimationFrame(() => (this._tiles().find(t => t.classList.contains('selected')) || this._tiles()[0] || $('lobby-next'))?.focus({ preventScroll: true }));
  }
  paint(){
    const st = this.state(), k = LOBBY_STEPS.indexOf(this.step), last = k === LOBBY_STEPS.length - 1;
    for (const b of this.el.querySelectorAll('[data-goto]')){ const i = LOBBY_STEPS.indexOf(b.dataset.goto); b.className = i === k ? 'on' : i < k ? 'done' : ''; b.setAttribute('aria-current', i === k ? 'step' : 'false'); }
    show($('lobby-back'), k > 0);
    show($('lobby-next'), !last);
    show($('btn-start-match'), last);
    show($('lobby-skip'), this.step === 'training' && this.trainingDone);
    const ready = stepReady(this.step, st), next = $('lobby-next');
    next.disabled = !ready;
    next.textContent = this.step === 'howto' ? 'Inizia ›' : 'Avanti ›';
    // preparazione: pannello del controller scelto
    for (const p of this.el.querySelectorAll('[data-setup]')) show(p, p.dataset.setup === st.controller);
    $('lobby-t-setup').textContent = st.controller === 'phone' ? 'Prepara lo smartphone' : st.controller === 'webcam' ? 'Prepara la webcam' : 'Mouse e tastiera';
    const pd = $('setup-phone-dot'), pt = $('setup-phone-text');
    if (pd){ pd.className = 'setup-dot ' + (st.phoneReady ? 'ok' : this.ui.phone.connected ? 'mid' : ''); pt.textContent = st.phoneReady ? 'Telefono pronto e calibrato ✓' : this.ui.phone.connected ? 'Telefono collegato: completa la calibrazione' : 'Telefono da collegare: inquadra il QR'; }
    $('setup-phone-go').textContent = st.phoneReady ? 'Ricalibra' : 'Collega e calibra';
    this.ui.paintWebcamSetup?.();
    // allenamento: esercizi e stato
    show($('training-recal'), st.controller === 'phone');
    $('training-go').textContent = this.trainingDone ? 'Rifai l’allenamento' : 'Inizia l’allenamento';
    const note = $('lobby-match-note');
    if (note) note.textContent = st.controller === 'phone' && !st.phoneReady ? 'Il telefono va ricollegato: premendo «Gioca» compare il QR.' : '';
  }
  next(){
    const k = LOBBY_STEPS.indexOf(this.step);
    if (!stepReady(this.step, this.state())) return;
    if (k < LOBBY_STEPS.length - 1) this.go(LOBBY_STEPS[k + 1]); else $('btn-start-match').click();
  }
  back(){ const k = LOBBY_STEPS.indexOf(this.step); if (k > 0) this.go(LOBBY_STEPS[k - 1]); }
  _tiles(){ return [...this.el.querySelectorAll(`[data-page="${this.step}"] .lobby-tile`)]; }
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
      t.focus(); t.click();
    } else if (e.code === 'Enter'){ e.preventDefault(); this.next(); }
    else if (e.code === 'Escape' || e.code === 'Backspace'){ e.preventDefault(); this.back(); }
    else if (e.code === 'KeyH'){ this.onboarding.open(); }
  }
  /* ---------- allenamento ---------- */
  startTraining(){
    const ui = this.ui;
    if (ui.controller === 'phone' && !ui.phone.ready){ ui.openPhone({ after: () => this.startTraining() }); return; }
    ui.training.start();
  }
  // compatibilità: l'onboarding propone ancora «Prova» → allenamento
  startPractice(){ this.go('training'); this.startTraining(); }
  onTrainingEnd({ completed, stats }){
    if (completed){ this.trainingDone = true; store.set('trainingDone', '1'); }
    this.go(completed ? 'training' : 'training');
    const r = $('lobby-practice-result');
    r.innerHTML = `<b>${completed ? 'Allenamento completato ✓' : 'Allenamento interrotto'}</b>
      <span>${stats.shots} colpi · ${stats.perfect} perfetti${stats.out ? ` · ${stats.out} fuori` : ''}</span>`;
    show(r);
    this.paint();
  }
  tick(){}
  feedback(){}
}
