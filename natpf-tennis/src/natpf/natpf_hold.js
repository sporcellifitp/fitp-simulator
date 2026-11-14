// B39.3 · Pressione lunga con il solo mouse (stand: docs/b39/stand-solo-mouse.md). Tenere premuto il tasto sinistro per
// HOLD.ms apre il pannello dello stand: sul marchio di ogni pagina del menu (anche il titolo grande della pagina
// principale, dove il marchio piccolo è nascosto) e su ❚❚ in campo (il clic breve resta la pausa).
// Prima: nessun segno di avanzamento e la pressione si annullava in silenzio appena il puntatore usciva dal marchio.
// Ora un anello si riempie dove si è premuto, con la scritta di cosa si apre; piccoli spostamenti (fino a HOLD.slopPx)
// non annullano; rilasciare prima del tempo sì. Il clic che segue una pressione completata non arriva al pulsante (❚❚ non
// apre anche la pausa).
export const HOLD = Object.freeze({ ms: 3000, slopPx: 24, tickMs: 50 });
// avanzamento 0…1 dopo elapsed ms
export const holdProgress = (elapsed, ms = HOLD.ms) => (ms > 0 ? Math.max(0, Math.min(1, elapsed/ms)) : 1);
// spostato troppo dal punto in cui si è premuto?
export const holdMoved = (dx, dy, slop = HOLD.slopPx) => Math.hypot(dx || 0, dy || 0) > slop;

let ring = null;
// anello unico (figlio del body: dentro l'area del ledwall); x, y in coordinate della finestra
function showRing(x, y, p, label){
  const doc = globalThis.document; if (!doc?.createElement) return;
  if (!ring){
    ring = doc.createElement('div'); ring.className = 'natpf-hold hidden'; ring.setAttribute?.('aria-hidden', 'true');
    ring.innerHTML = '<i></i><b></b>';
    doc.body?.appendChild?.(ring);
  }
  const box = doc.body?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0 };
  const lx = x - (box.left || 0);
  ring.style.left = `${Math.round(lx)}px`; ring.style.top = `${Math.round(y - (box.top || 0))}px`;
  // vicino ai bordi dell'area la scritta si allinea al bordo (❚❚ sta in alto a destra: centrata usciva dall'area)
  const w = box.width || 0;
  ring.classList.toggle('at-right', w > 0 && lx > w*0.7); ring.classList.toggle('at-left', w > 0 && lx < w*0.3);
  ring.style.setProperty?.('--hold', String(p));
  const b = ring.querySelector?.('b'); if (b && b.textContent !== label) b.textContent = label;
  ring.classList.remove('hidden', 'done');
}
function hideRing(done = false){
  if (!ring) return;
  if (done){ ring.classList.add('done'); const r = ring; setTimeout(() => r.classList.add('hidden'), 260); }
  else ring.classList.add('hidden');
}

export class HoldPress {
  // el: il bersaglio; onDone: cosa aprire; label: la scritta sotto l'anello
  constructor(el, { onDone, label = 'Pannello dello stand', ms = HOLD.ms, slop = HOLD.slopPx, now = () => globalThis.performance?.now?.() ?? Date.now() } = {}){
    Object.assign(this, { el, onDone, label, ms, slop, now });
    this.down = null; this.timer = null; this.suppress = false;
    if (!el?.addEventListener) return;
    el.classList?.add?.('natpf-hold-target');
    el.addEventListener('pointerdown', e => this._down(e));
    el.addEventListener('pointermove', e => this._move(e));
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(t, () => this.cancel());
    // il clic dopo una pressione completata non arriva al bersaglio (in cattura sulla finestra: prima di tutti)
    globalThis.addEventListener?.('click', e => {
      if (!this.suppress) return;
      if (e.target === el || el.contains?.(e.target)){ e.stopImmediatePropagation(); e.preventDefault(); }
      this.suppress = false;
    }, true);
    // (niente menu del browser sulla pressione lunga col tocco)
    el.addEventListener('contextmenu', e => { if (this.down) e.preventDefault(); });
  }
  get active(){ return !!this.down; }
  _down(e){
    if (e.button !== 0 || e.isPrimary === false) return;
    this.cancel();
    this.suppress = false;
    this.down = { x: e.clientX, y: e.clientY, t: this.now(), id: e.pointerId };
    try { this.el.setPointerCapture?.(e.pointerId); } catch {}
    this.el.classList?.add?.('holding');
    showRing(e.clientX, e.clientY, 0, this.label);
    this.timer = setInterval(() => this._tick(), HOLD.tickMs);
  }
  _move(e){
    const d = this.down; if (!d) return;
    if (holdMoved(e.clientX - d.x, e.clientY - d.y, this.slop)) this.cancel();
  }
  _tick(){
    const d = this.down; if (!d) return;
    const p = holdProgress(this.now() - d.t, this.ms);
    showRing(d.x, d.y, p, this.label);
    if (p >= 1) this._fire();
  }
  _fire(){
    this._stop(); hideRing(true);
    this.suppress = true;
    try { this.onDone?.(); } catch (err){ console.error(err); }
  }
  _stop(){
    clearInterval(this.timer); this.timer = null;
    const d = this.down; this.down = null;
    try { if (d) this.el.releasePointerCapture?.(d.id); } catch {}
    this.el.classList?.remove?.('holding');
  }
  cancel(){ if (!this.down) return; this._stop(); hideRing(false); }
}
