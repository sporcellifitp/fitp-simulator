// Tutorial prima della calibrazione (richiesta del 04/11/2026, rifatto in B9 il 05/11): una modale compatta al centro dello
// schermo (nello stesso schermo al centro della propria metà) con la presa e tutti i gesti. Si sfoglia con le frecce ‹ ›
// in basso (mouse, tastiera ←/→, o dal telefono di chi gioca), niente scorrimento automatico; una scheda conta come
// vista dopo TUTORIAL.seenMs che è a schermo. Si chiude dal telefono con «Tutto chiaro, ho capito», che sul telefono si
// accende solo quando tutte le schede sono state viste (l'avanzamento va al telefono con onProgress →
// natpf_phone_racket.tutorialProgress, messaggio «tp»); sul computer solo Esc per chi gestisce la postazione.
// Più istanze possibili (una per metà dello schermo nel 1v1 sullo stesso schermo): l'animazione 3D è una sola
// (getGestureDemo, un contesto WebGL) e la usa l'istanza che può (canDemo); le altre mostrano foto e indicazioni.
// L'animazione sta in un riquadro 16:10 (.tut-stage dentro .tut-frame): mount/setSize/play come prima, setSize di nuovo
// quando il riquadro cambia misura (ResizeObserver dove c'è).
// Gesti e indicazioni da natpf_gesture_motion.js, gli stessi verificati con il rilevatore vero (test natpf-gesture-demo).
import { GESTURES } from './natpf_gesture_motion.js';
import { PHOTOS } from './natpf_media.js';
import { GRIP } from '@natpf/tennis/grip-art.js';

// seenMs: tempo a schermo perché una scheda conti come vista (chi tocca ‹ › di fila non le «vede» tutte); tickMs: controllo
export const TUTORIAL = Object.freeze({ seenMs: 1000, tickMs: 250 });

// schede: presa (foto), posizione di partenza, colpi di base, servizio, colpi con effetto e speciali
export const TUTORIAL_CARDS = Object.freeze([
  { id: 'grip', photo: true, title: GRIP.name, text: GRIP.ui.lessonGrip },
  { id: 'ready', title: 'Posizione di partenza', text: 'In piedi a 1,5–2 m dallo schermo, al centro, il braccio rilassato davanti a te. Calibrazione e partita si fanno con questa stessa presa.' },
  { id: 'forehand' }, { id: 'backhand' }, { id: 'serve' }, { id: 'flat' },
  { id: 'lob' }, { id: 'drop' }, { id: 'slice' }, { id: 'smash' }, { id: 'volley' },
].map(c => Object.freeze({ ...c, title: c.title || GESTURES[c.id]?.label || c.id, cues: GESTURES[c.id]?.cues || [] })));

/* ---------- stato puro: scheda mostrata, schede viste ---------- */
// from: avanzamento di prima (stesso abbinamento del telefono, modale riaperta): { idx, visited: [indici], all }
export function tutorialStart({ now = 0, cards = TUTORIAL_CARDS.length, from = null } = {}){
  const visited = new Set((from?.visited || []).filter(i => Number.isInteger(i) && i >= 0 && i < cards));
  const idx = Number.isInteger(from?.idx) ? Math.max(0, Math.min(cards - 1, from.idx)) : 0;
  return { idx, shownAt: now, visited, all: !!from?.all || visited.size >= cards, cards };
}
// scheda i (fuori dai limiti: la prima o l'ultima, niente giro); stessa scheda: niente di nuovo
export function tutorialGo(st, i, { now = 0 } = {}){
  const idx = Math.max(0, Math.min(st.cards - 1, Math.trunc(+i || 0)));
  return idx === st.idx ? st : { ...st, idx, shownAt: now };
}
// la scheda a schermo da almeno seenMs conta come vista; «all» non torna mai falso nella stessa apertura
export function tutorialSeen(st, { now = 0, seenMs = TUTORIAL.seenMs } = {}){
  if (st.visited.has(st.idx) || now - st.shownAt < seenMs) return st;
  const visited = new Set(st.visited); visited.add(st.idx);
  return { ...st, visited, all: st.all || visited.size >= st.cards };
}
// avanzamento per il telefono: scheda i di n, s viste, m maschera delle viste, all tutte viste
export function tutorialProgress(st){
  let m = 0; for (const i of st.visited) m |= 1 << i;
  return { i: st.idx, n: st.cards, s: st.visited.size, m, all: !!st.all };
}
// riga in fondo alla modale: cosa fare adesso. after: cosa succede dopo «ho capito» ('cal' calibrazione, 'play' esercizi o
// partita, 'ready' pronto nello stesso schermo); half: stesso schermo («il tuo telefono»)
export function tutorialWait({ mode = 'phone', all = false, after = 'cal', half = false } = {}){
  if (mode !== 'phone') return '';
  const tel = half ? 'tuo telefono' : 'telefono';
  if (!all) return `Sfoglia le schede con ‹ ›, anche dal ${tel}. Viste tutte, sul ${tel} si accende «Tutto chiaro, ho capito».`;
  const then = after === 'ready' ? 'sei pronto' : after === 'play' ? 'si comincia' : 'si calibra';
  return `Sul ${tel} tocca «Tutto chiaro, ho capito»: poi ${then}.`;
}

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class NatpfTutorial {
  // root: elemento che contiene la modale (vuoto); demo: () => getGestureDemo() (iniettato: niente three.js nei test)
  // half: istanza in una metà dello schermo (1v1 sullo stesso schermo); canDemo: se questa istanza può usare
  // l'animazione 3D adesso (una sola per tutte); senza, foto e indicazioni
  constructor(root, { demo = null, clock = () => performance.now(), half = false, canDemo = () => true } = {}){
    this.root = root; this.demo = demo; this.clock = clock; this.canDemo = canDemo; this.half = half;
    this.open = false; this.state = null; this.timer = null; this.opts = {}; this.demoOn = false; this.paintKey = '';
    if (!root) return;
    root.classList.add('natpf-tutorial', 'hidden'); if (half) root.classList.add('half');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.innerHTML = `<div class="tut-card">
      <header class="tut-head"><span class="tut-kicker"></span><span class="tut-count" aria-live="polite"></span><h2 class="tut-name"></h2></header>
      <div class="tut-body">
        <div class="tut-frame"><div class="tut-stage"><div class="tut-media"></div><div class="tut-3d"></div></div></div>
        <div class="tut-info"><p class="tut-text"></p><ul class="tut-cues"></ul></div>
      </div>
      <footer class="tut-foot">
        <button type="button" class="tut-arrow tut-prev" data-tut-go="-1" aria-label="Scheda precedente">‹</button>
        <div class="tut-mid"><div class="tut-dots" aria-hidden="true">${TUTORIAL_CARDS.map((c, i) => `<i class="tut-dot" data-dot="${i}"></i>`).join('')}</div>
          <p class="tut-wait"></p><button type="button" class="btn btn-primary tut-close hidden">Chiudi</button></div>
        <button type="button" class="tut-arrow tut-next" data-tut-go="1" aria-label="Scheda successiva">›</button>
      </footer>
    </div>`;
    root.addEventListener('click', e => {
      const b = e.target?.closest?.('[data-tut-go]'); if (b){ e.stopPropagation(); this.step(+b.dataset.tutGo); return; }
      if (e.target?.closest?.('.tut-close')){ e.stopPropagation(); this.close('review'); }
    });
    root.addEventListener('pointerdown', e => e.stopPropagation());
    // il riquadro dell'animazione cambia misura (finestra, schermo intero, ledwall): l'animazione si ridimensiona
    const stage = root.querySelector?.('.tut-stage');
    if (stage && typeof ResizeObserver === 'function'){ this.ro = new ResizeObserver(() => this._fit()); this.ro.observe(stage); }
  }
  get card(){ return TUTORIAL_CARDS[this.state?.idx ?? 0]; }
  get progress(){ return this.state ? { ...tutorialProgress(this.state), nm: TUTORIAL_CARDS[this.state.idx]?.title || '' } : null; }
  // per riaprire più tardi dallo stesso punto (stesso abbinamento del telefono)
  get snapshot(){ return this.state ? { idx: this.state.idx, visited: [...this.state.visited], all: this.state.all } : null; }
  // mode: 'phone' (si chiude con il telefono), 'review' («Rivedi i gesti», si chiude con «Chiudi»)
  // player: 'Player 1'…, hand: 'right' | 'left', onClose(reason): 'phone' | 'skip' | 'review'; onProgress(progress) a ogni
  // cambio di scheda o di schede viste (solo 'phone'); after: vedi tutorialWait; from: snapshot di prima
  openFor({ mode = 'phone', player = '', hand = 'right', onClose = null, onProgress = null, after = 'cal', from = null } = {}){
    if (!this.root) return;
    this.opts = { mode, player, hand, onClose, onProgress: mode === 'phone' ? onProgress : null, after };
    this.open = true; this.paintKey = '';
    this.state = tutorialStart({ now: this.clock(), from });
    this.root.classList.remove('hidden'); this.root.dataset.mode = mode;
    this.root.querySelector('.tut-close')?.classList.toggle('hidden', mode !== 'review');
    const k = this.root.querySelector('.tut-kicker'); if (k) k.textContent = [player, mode === 'phone' ? 'Come si gioca' : 'Rivedi i gesti'].filter(Boolean).join(' · ');
    clearInterval(this.timer); this.timer = setInterval(() => this.tick(), TUTORIAL.tickMs);
    this.paint(); this._progress();
  }
  // cosa succede dopo «ho capito» (lo stato del telefono può cambiare mentre la modale è aperta)
  setAfter(after){ if (!this.open || after === this.opts.after) return; this.opts.after = after; this.paintNav(); }
  go(i){
    if (!this.open) return;
    const next = tutorialGo(this.state, i, { now: this.clock() });
    if (next === this.state) return;
    this.state = next; this.paint(); this._progress();
  }
  step(d){ if (this.open) this.go(this.state.idx + (d < 0 ? -1 : 1)); }
  // tastiera di chi gestisce la postazione: ← → (true se il tasto è della modale)
  key(e){
    if (!this.open) return false;
    if (e.code === 'ArrowLeft' || e.code === 'PageUp'){ this.step(-1); return true; }
    if (e.code === 'ArrowRight' || e.code === 'PageDown'){ this.step(1); return true; }
    return false;
  }
  tick(){
    if (!this.open) return;
    const next = tutorialSeen(this.state, { now: this.clock() });
    if (next === this.state) return;
    this.state = next; this.paintNav(); this._progress();
  }
  _progress(){ const p = this.progress; if (p) try { this.opts.onProgress?.(p); } catch (e){ console.error(e); } }
  close(reason = 'phone'){
    if (!this.open) return;
    this.open = false; clearInterval(this.timer); this.timer = null;
    this.root?.classList.add('hidden');
    const d = this.demo?.(); if (d && this.demoOn){ d.stop(); }
    this.demoOn = false; this.paintKey = '';
    const cb = this.opts.onClose; this.opts = {};
    cb?.(reason);
  }
  // frecce, puntini, «3 / 11» e riga in fondo (senza toccare l'animazione: cambia solo con la scheda)
  paintNav(){
    if (!this.open || !this.root) return;
    const st = this.state, n = st.cards, $ = s => this.root.querySelector(s);
    const count = $('.tut-count'); if (count) count.textContent = `${st.idx + 1} / ${n}`;
    const prev = $('.tut-prev'), next = $('.tut-next');
    if (prev){ prev.disabled = st.idx <= 0; prev.classList.toggle('off', st.idx <= 0); }
    if (next){ next.disabled = st.idx >= n - 1; next.classList.toggle('off', st.idx >= n - 1); }
    for (const dot of this.root.querySelectorAll('.tut-dot')){ const i = +dot.dataset.dot; dot.classList.toggle('on', i === st.idx); dot.classList.toggle('seen', st.visited.has(i)); }
    this.root.classList.toggle('all-seen', !!st.all);
    const w = $('.tut-wait'); if (w) w.textContent = tutorialWait({ mode: this.opts.mode, all: st.all, after: this.opts.after, half: this.half });
  }
  paint(){
    if (!this.open || !this.root) return;
    this.paintNav();
    const c = this.card, $ = s => this.root.querySelector(s), hand = this.opts.hand || 'right';
    const d = this.canDemo() ? this.demo?.() : null;
    // scheda già disegnata con la stessa animazione: niente da rifare (il gesto non riparte da capo)
    const key = `${this.state.idx}|${hand}|${d ? 1 : 0}`;
    if (key === this.paintKey) return;
    this.paintKey = key;
    const name = $('.tut-name'), text = $('.tut-text'), cues = $('.tut-cues');
    if (name) name.textContent = c.title;
    if (text){ text.textContent = c.text || ''; text.classList.toggle('hidden', !c.text); }
    if (cues) cues.innerHTML = c.cues.map(x => `<li>${esc(x)}</li>`).join('');
    const media = $('.tut-media'), stage = $('.tut-3d');
    const mkey = `${c.id}|${hand}`;
    if (c.photo){
      if (media && media.dataset.key !== mkey){ media.dataset.key = mkey; media.innerHTML = `<img class="tut-photo${hand === 'left' ? ' mirror' : ''}" src="${PHOTOS.grip.src}" alt="${esc(PHOTOS.grip.alt)}" />`; }
    } else if (media){ media.dataset.key = ''; media.innerHTML = ''; }
    media?.classList.toggle('hidden', !c.photo);
    // presa: foto e animazione 3D dell'impugnatura insieme; gli altri: animazione 3D nel riquadro 16:10
    this.root.classList.toggle('no-3d', !d);
    this.root.classList.toggle('no-media', !d && !c.photo);
    if (!d){ this.demoOn = false; return; }
    if (stage){
      d.mount(stage);
      // (l'animazione è una sola: un'altra istanza o il riquadro degli esercizi può averle dato un'altra misura)
      this.demoOn = true; this.fitW = this.fitH = null; this._fit();
      d.play(c.photo ? 'grip' : c.id, { hand, speed: GESTURES[c.photo ? 'grip' : c.id]?.still ? 1 : .6 });
      stage.classList.toggle('no-webgl', !d.available);
    }
  }
  // misure CSS del riquadro dell'animazione → setSize (alla scheda nuova e quando il riquadro cambia misura)
  _fit(){
    if (!this.open || !this.demoOn) return;
    const d = this.demo?.(), stage = this.root?.querySelector('.tut-3d');
    if (!d?.available || !stage) return;
    const w = Math.round(stage.clientWidth || 0), h = Math.round(stage.clientHeight || 0);
    if (w > 0 && h > 0 && (w !== this.fitW || h !== this.fitH)){ this.fitW = w; this.fitH = h; d.setSize(w, h); }
    else if (!(w > 0 && h > 0) && this.fitW == null){ d.setSize(360, 225); }
  }
}
