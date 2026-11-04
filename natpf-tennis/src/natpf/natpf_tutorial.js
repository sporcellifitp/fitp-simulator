// Tutorial prima della calibrazione (richiesta del 04/11/2026): una modale grande con la presa e tutti i gesti, che sostituisce
// il riquadro piccolo «Guarda e ripeti» in calibrazione. Si chiude dal telefono di chi gioca con «Tutto chiaro, ho capito»
// (natpf_phone_racket.waitTutorial / onTutorial); sul computer solo Esc per chi gestisce la postazione. Le schede scorrono
// da sole (chi gioca ha il telefono in mano, non il mouse); un clic su una scheda la ferma lì per un po'.
// Più istanze possibili (una per metà dello schermo nel 1v1 sullo stesso schermo): l'animazione 3D è una sola
// (getGestureDemo, un contesto WebGL) e la usa l'istanza che la chiede per ultima; le altre mostrano foto e indicazioni.
// Gesti e indicazioni da natpf_gesture_motion.js, gli stessi verificati con il rilevatore vero (test natpf-gesture-demo).
import { GESTURES } from './natpf_gesture_motion.js';
import { PHOTOS } from './natpf_media.js';
import { GRIP } from '@natpf/tennis/grip-art.js';

export const TUTORIAL = Object.freeze({ autoMs: 6500, holdMs: 20000 });

// schede: presa (foto), posizione di partenza, colpi di base, servizio, colpi con effetto e speciali
export const TUTORIAL_CARDS = Object.freeze([
  { id: 'grip', photo: true, title: GRIP.name, text: GRIP.ui.lessonGrip },
  { id: 'ready', title: 'Posizione di partenza', text: 'In piedi a 1,5–2 m dallo schermo, al centro, il braccio rilassato davanti a te. Calibrazione e partita si fanno con questa stessa presa.' },
  { id: 'forehand' }, { id: 'backhand' }, { id: 'serve' }, { id: 'flat' },
  { id: 'lob' }, { id: 'drop' }, { id: 'slice' }, { id: 'smash' }, { id: 'volley' },
].map(c => Object.freeze({ ...c, title: c.title || GESTURES[c.id]?.label || c.id, cues: GESTURES[c.id]?.cues || [] })));

// stato puro: scheda mostrata, scorrimento automatico, pausa dopo una scelta a mano
export function tutorialStep(st, { now, pick = null, cards = TUTORIAL_CARDS.length } = {}){
  const s = { idx: 0, shownAt: now, holdUntil: 0, ...st };
  if (pick != null) return { ...s, idx: ((pick % cards) + cards) % cards, shownAt: now, holdUntil: now + TUTORIAL.holdMs };
  if (now < s.holdUntil || now - s.shownAt < TUTORIAL.autoMs) return s;
  return { ...s, idx: (s.idx + 1) % cards, shownAt: now };
}

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class NatpfTutorial {
  // root: elemento che contiene la modale (vuoto); demo: () => getGestureDemo() (iniettato: niente three.js nei test)
  // half: istanza in una metà dello schermo (1v1 sullo stesso schermo); canDemo: se questa istanza può usare
  // l'animazione 3D adesso (una sola per tutte); senza, foto e indicazioni a tutta larghezza
  constructor(root, { demo = null, clock = () => performance.now(), half = false, canDemo = () => true } = {}){
    this.root = root; this.demo = demo; this.clock = clock; this.canDemo = canDemo;
    this.open = false; this.state = null; this.timer = null; this.opts = {};
    if (!root) return;
    root.classList.add('natpf-tutorial', 'hidden'); if (half) root.classList.add('half');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.innerHTML = `<div class="tut-card">
      <header class="tut-head"><span class="tut-kicker"></span><h2 class="tut-title">Come si gioca con il telefono</h2></header>
      <div class="tut-body">
        <div class="tut-stage"><div class="tut-media"></div><div class="tut-3d"></div></div>
        <div class="tut-info"><span class="tut-count"></span><h3 class="tut-name"></h3><p class="tut-text"></p><ul class="tut-cues"></ul></div>
      </div>
      <nav class="tut-tabs" aria-label="Gesti">${TUTORIAL_CARDS.map((c, i) => `<button type="button" class="tut-tab" data-tut="${i}">${esc(c.title)}</button>`).join('')}</nav>
      <footer class="tut-foot"><span class="tut-phone" aria-hidden="true"></span><p class="tut-wait"></p><button type="button" class="btn btn-primary tut-close hidden">Chiudi</button></footer>
    </div>`;
    root.addEventListener('click', e => {
      const b = e.target?.closest?.('[data-tut]'); if (b){ e.stopPropagation(); this.show(+b.dataset.tut, true); return; }
      if (e.target?.closest?.('.tut-close')){ e.stopPropagation(); this.close('review'); }
    });
    root.addEventListener('pointerdown', e => e.stopPropagation());
  }
  // mode: 'phone' (si chiude con il telefono), 'review' («Rivedi i gesti», si chiude con «Chiudi»)
  // player: 'Player 1'…, hand: 'right' | 'left', onClose(reason): 'phone' | 'skip' | 'review'
  show(i, manual = false){
    if (!this.open) return;
    this.state = tutorialStep(this.state, { now: this.clock(), pick: i, cards: TUTORIAL_CARDS.length });
    if (!manual) this.state.holdUntil = 0;
    this.paint();
  }
  openFor({ mode = 'phone', player = '', hand = 'right', onClose = null, wait = '' } = {}){
    if (!this.root) return;
    this.opts = { mode, player, hand, onClose };
    this.open = true; this.state = tutorialStep(null, { now: this.clock() });
    this.root.classList.remove('hidden'); this.root.dataset.mode = mode;
    this.setWait(wait || (mode === 'phone' ? 'Sul telefono tocca «Tutto chiaro, ho capito»: poi si calibra.' : ''));
    this.root.querySelector('.tut-close')?.classList.toggle('hidden', mode !== 'review');
    const k = this.root.querySelector('.tut-kicker'); if (k) k.textContent = [player, mode === 'phone' ? 'Prima di calibrare' : 'Rivedi i gesti'].filter(Boolean).join(' · ');
    clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 500);
    this.paint();
  }
  setWait(text){ const w = this.root?.querySelector('.tut-wait'); if (w) w.textContent = text; }
  tick(){
    if (!this.open) return;
    const before = this.state.idx;
    this.state = tutorialStep(this.state, { now: this.clock(), cards: TUTORIAL_CARDS.length });
    if (this.state.idx !== before) this.paint();
  }
  close(reason = 'phone'){
    if (!this.open) return;
    this.open = false; clearInterval(this.timer); this.timer = null;
    this.root?.classList.add('hidden');
    const d = this.demo?.(); if (d && this.demoOn){ d.stop(); }
    this.demoOn = false;
    const cb = this.opts.onClose; this.opts = {};
    cb?.(reason);
  }
  get card(){ return TUTORIAL_CARDS[this.state?.idx ?? 0]; }
  paint(){
    if (!this.open || !this.root) return;
    const c = this.card, $ = s => this.root.querySelector(s), hand = this.opts.hand || 'right';
    const count = $('.tut-count'), name = $('.tut-name'), text = $('.tut-text'), cues = $('.tut-cues');
    if (count) count.textContent = `${this.state.idx + 1} di ${TUTORIAL_CARDS.length}`;
    if (name) name.textContent = c.title;
    if (text){ text.textContent = c.text || ''; text.classList.toggle('hidden', !c.text); }
    if (cues) cues.innerHTML = c.cues.map(x => `<li>${esc(x)}</li>`).join('');
    for (const b of this.root.querySelectorAll('.tut-tab')) b.classList.toggle('on', +b.dataset.tut === this.state.idx);
    const media = $('.tut-media'), stage = $('.tut-3d');
    const key = `${c.id}|${hand}`;
    if (c.photo){
      if (media && media.dataset.key !== key){ media.dataset.key = key; media.innerHTML = `<img class="tut-photo${hand === 'left' ? ' mirror' : ''}" src="${PHOTOS.grip.src}" alt="${esc(PHOTOS.grip.alt)}" />`; }
    } else if (media){ media.dataset.key = ''; media.innerHTML = ''; }
    media?.classList.toggle('hidden', !c.photo);
    // presa: foto e animazione 3D dell'impugnatura insieme; gli altri: animazione 3D grande
    const d = this.canDemo() ? this.demo?.() : null;
    this.root.classList.toggle('no-3d', !d);
    if (!d) this.demoOn = false;
    if (d && stage){
      d.mount(stage);
      if (d.available) d.setSize(stage.clientWidth || 360, stage.clientHeight || 360);
      d.play(c.photo ? 'grip' : c.id, { hand, speed: GESTURES[c.photo ? 'grip' : c.id]?.still ? 1 : .6 });
      this.demoOn = true;
      stage.classList.toggle('no-webgl', !d.available);
    }
  }
}
