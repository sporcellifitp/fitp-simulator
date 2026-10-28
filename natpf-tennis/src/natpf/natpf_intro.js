// Intro all'avvio, come l'accensione di un gioco su console: il video dell'arena che si accende (public/media/intro.mp4,
// generato con Higgsfield, senza scritte né marchi), poi il titolo NATPF Simulator con la palla che lo attraversa e
// «Premi un tasto per iniziare»; i partner sono una riga piccola in basso. Un tasto, un clic o un tocco durante il video
// mostra subito il titolo; alla fine fa partire il menu (e sblocca l'audio del browser, che vuole un gesto). La seconda
// volta nella stessa sessione si vede solo il titolo sull'ultima inquadratura. Senza video (file mancante, autoplay
// negato) resta l'ultima inquadratura come immagine. ?intro=0 la salta (prove), e non c'è per il Player 2 che apre
// l'invito di una sfida.
const $ = id => document.getElementById(id);
export const INTRO_KEY = 'natpf-tennis.intro';
// durata dell'animazione completa (ms) e di quella breve (sessione già vista): allineate alle animazioni dell'intro in natpf-ui.css
export const INTRO_MS = { full: 7800, short: 1500 };
export function introMode({ search = '', seen = false } = {}){
  const q = new URLSearchParams(search);
  if (q.get('intro') === '0' || q.get('diag') === '1') return 'off';
  // Player 2 arrivato con il link di invito di una sfida: dritto nella stanza (prima l'intro con «Premi un tasto» copriva
  // il pannello della stanza)
  if ((q.get('role') || '').toLowerCase() === 'p2' && q.get('room')) return 'off';
  return seen ? 'short' : 'full';
}

export class NatpfIntro {
  constructor({ onDone } = {}){
    this.el = $('natpf-intro'); this.onDone = onDone;
    let seen = false; try { seen = sessionStorage.getItem(INTRO_KEY) === '1'; } catch {}
    this.mode = introMode({ search: location.search, seen });
    this.ready = false; this.active = false;
    if (!this.el) return;
    this._key = e => this._input(e);
    this.el.addEventListener('pointerdown', e => { e.stopPropagation(); this._input(e); });
    $('intro-skip')?.addEventListener('click', e => { e.stopPropagation(); this.finishAnimation(); });
    if (this.mode === 'off'){ this.el.classList.add('hidden'); queueMicrotask(() => this.onDone?.({ skipped: true })); return; }
    this.play(this.mode);
  }
  get visible(){ return !!this.el && !this.el.classList.contains('hidden'); }
  play(mode = 'full'){
    if (!this.el) return;
    this.active = true; this.ready = false;
    this.el.classList.remove('hidden', 'leaving', 'is-ready', 'mode-full', 'mode-short');
    void this.el.offsetWidth;                                        // riparte l'animazione CSS
    this.el.classList.add(`mode-${mode}`);
    this._video(mode);
    window.addEventListener('keydown', this._key, true);
    clearTimeout(this._t); this._t = setTimeout(() => this.finishAnimation(), INTRO_MS[mode] || INTRO_MS.full);
  }
  // video di sfondo solo nell'intro completa; se non parte resta l'immagine finale
  _video(mode){
    const v = $('intro-video'); if (!v) return;
    this.el.classList.remove('no-video');
    const fail = () => this.el.classList.add('no-video');
    if (mode !== 'full'){ v.pause?.(); return fail(); }
    v.onerror = fail;
    try { v.currentTime = 0; } catch {}
    const p = v.play?.(); if (p?.catch) p.catch(fail); else if (!p) fail();
  }
  // fine dell'animazione: resta «Premi un tasto per iniziare»
  finishAnimation(){
    if (!this.active || this.ready) return;
    clearTimeout(this._t); this.ready = true; this.el.classList.add('is-ready');
    $('intro-start')?.focus({ preventScroll: true });
  }
  _input(e){
    if (!this.active) return;
    if (e.type === 'keydown'){ if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return; e.preventDefault(); e.stopImmediatePropagation(); }
    if (!this.ready) return this.finishAnimation();
    this.start();
  }
  start(){
    this.active = false; window.removeEventListener('keydown', this._key, true);
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch {}
    this.el.classList.add('leaving');
    setTimeout(() => this.el.classList.add('hidden'), 650);
    this.onDone?.({ skipped: false });
  }
}
