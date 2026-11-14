// B39.5 · Puntatore del mouse sul ledwall (stand con il solo mouse, docs/b39/stand-solo-mouse.md; controllo del 13/11,
// n. 11). Il puntatore di Windows su un ledwall è piccolo (circa 12 × 19 px, l'1,8 % di un'area alta 1080) e sul campo
// restava un mirino sottile, fermo dove si era cliccato l'ultima volta, davanti al pubblico.
//   • Opzioni → «Puntatore: Normale · Grande» (natpf-tennis.puntatore). Di base Grande nel programma Windows (lo stand),
//     Normale nel browser. Grande: una freccia gialla con il bordo nero alta circa il 5,5 % dell'area (da 48 a 128 px),
//     disegnata da Windows come cursore (nessun ritardo), al posto del mirino sul campo.
//   • In campo il puntatore sparisce dopo 3 s fermo (e appena la partita parte); nei menu e nei fogli dopo 10 s. Con la
//     racchetta «Mouse e tastiera» della modalità prova resta sempre (lì il mouse è la racchetta).
//   • Al primo movimento dopo che era sparito, un anello breve dove ricompare, per trovarlo da lontano.
//   • Area calibrata più piccola della finestra (natpf_screen): con il puntatore fuori dall'area (fuori dalla parte che si
//     vede del ledwall) o uscito dalla finestra, una freccia sul bordo dell'area indica dove sta.
// Funzioni pure in testa (provate con node:test).
import { viewport } from './natpf_screen.js';
export const POINTER_KEY = 'natpf-tennis.puntatore';
export const POINTER = Object.freeze({ share: 0.055, min: 48, max: 128, fieldMs: 3000, menuMs: 10000, edgeMargin: 10 });
export const pointerPref = (v, { desktop = false } = {}) => (v === 'normale' || v === 'grande' ? v : desktop ? 'grande' : 'normale');
// lato del cursore grande (px CSS, pari): il 5,5 % dell'altezza dell'area, tra 48 e 128 (Chromium non accetta cursori più
// grandi di 128 px)
export const pointerSize = areaH => {
  const s = Math.round(Math.min(POINTER.max, Math.max(POINTER.min, (Number(areaH) || 0)*POINTER.share)));
  return s - (s % 2);
};
// freccia gialla con il bordo nero (SVG); punta in alto a sinistra, nel punto (2, 2) di una griglia 32 × 32
export function pointerSvg(size){
  const s = Math.max(16, Math.round(Number(size) || 0));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 32 32"><path d="M2 2 L2 26.5 L8.4 20.6 L12.7 30 L17.2 28 L13 18.9 L21.6 18.9 Z" fill="#e3ff36" stroke="#000" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
}
// valore CSS di «cursor» per il cursore grande: immagine, punto attivo sulla punta, riserva la freccia di sistema
export function pointerCss(size){
  const hot = Math.max(1, Math.round(size*2/32));
  return `url("data:image/svg+xml,${encodeURIComponent(pointerSvg(size))}") ${hot} ${hot}, auto`;
}
// dopo quanti ms fermo il puntatore sparisce: in campo 3 s, altrove 10 s; mai con il mouse come racchetta (null)
export function hideAfterMs({ inField = false, mouseRacket = false } = {}){
  if (inField && mouseRacket) return null;
  return inField ? POINTER.fieldMs : POINTER.menuMs;
}
// Freccia sul bordo dell'area per un puntatore in (x, y) fuori dall'area a = { x, y, w, h } (coordinate della finestra):
// null se il puntatore è dentro. Altrimenti il punto del bordo più vicino (in coordinate dell'area, rientrato di margin)
// e l'angolo in gradi verso il puntatore (0 = destra, 90 = giù)
export function edgeArrow(x, y, a, margin = POINTER.edgeMargin){
  if (!a || !(a.w > 0) || !(a.h > 0)) return null;
  const inside = x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h;
  if (inside) return null;
  const cx = Math.min(a.x + a.w - margin, Math.max(a.x + margin, x)), cy = Math.min(a.y + a.h - margin, Math.max(a.y + margin, y));
  const angle = Math.round(Math.atan2(y - cy, x - cx)*180/Math.PI);
  return { x: Math.round(cx - a.x), y: Math.round(cy - a.y), angle };
}
// puntatore uscito dalla finestra (o dal monitor) passando per (x, y): freccia sul bordo dell'area dalla parte del centro
// verso quel punto
export function exitArrow(x, y, a, margin = POINTER.edgeMargin){
  if (!a || !(a.w > 0) || !(a.h > 0)) return null;
  const mx = a.x + a.w/2, my = a.y + a.h/2, dx = x - mx, dy = y - my;
  if (!dx && !dy) return null;
  const k = Math.min((a.w/2 - margin)/Math.abs(dx || 1e-9), (a.h/2 - margin)/Math.abs(dy || 1e-9));
  return { x: Math.round(a.w/2 + dx*k), y: Math.round(a.h/2 + dy*k), angle: Math.round(Math.atan2(dy, dx)*180/Math.PI) };
}

const store = {
  get(){ try { return globalThis.localStorage?.getItem(POINTER_KEY) ?? null; } catch { return null; } },
  set(v){ try { globalThis.localStorage?.setItem(POINTER_KEY, v); } catch {} },
};

export class NatpfCursor {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    const doc = globalThis.document, win = globalThis.window;
    this.desktop = !!win?.natpfDesktop;
    this.pref = pointerPref(store.get(), { desktop: this.desktop });
    this.lastMove = globalThis.performance?.now?.() ?? 0; this.hidden = false; this.size = 0; this.pos = null; this.outside = false; this.wasInField = false;
    this.html = doc?.documentElement;
    if (doc?.createElement && doc.body){
      this.ring = doc.createElement('div'); this.ring.className = 'natpf-pointer-ring'; this.ring.setAttribute?.('aria-hidden', 'true'); doc.body.appendChild(this.ring);
      this.arrow = doc.createElement('div'); this.arrow.className = 'natpf-edge-arrow hidden'; this.arrow.setAttribute?.('aria-hidden', 'true'); this.arrow.innerHTML = '<i></i>'; doc.body.appendChild(this.arrow);
    }
    win?.addEventListener?.('pointermove', e => this.moved(e), { passive: true, capture: true });
    win?.addEventListener?.('pointerdown', e => this.moved(e), { passive: true, capture: true });
    // puntatore uscito dalla finestra (verso un altro monitor, o fuori dalla parte che si vede)
    doc?.addEventListener?.('pointerout', e => { if (!e.relatedTarget && (e.pointerType || 'mouse') === 'mouse'){ this.outside = true; this.pos = { x: e.clientX, y: e.clientY }; this.paintArrow(); } });
    // scelta in Opzioni
    doc?.addEventListener?.('click', e => { const b = e.target?.closest?.('[data-natpf-pointer]'); if (b){ e.stopPropagation(); this.set(b.dataset.natpfPointer); } });
    ui.screen?.onApply?.(() => this.apply());
    this.apply();
    this._t = setInterval(() => this.tick(), 250);
  }
  set(v){
    this.pref = pointerPref(v, { desktop: this.desktop }); store.set(this.pref); this.apply();
    this.ui.toast?.(this.pref === 'grande' ? 'Puntatore grande: freccia gialla; in campo sparisce dopo 3 secondi fermo' : 'Puntatore normale');
  }
  // in campo adesso (partita, scambi di prova, allenamento, minigioco), senza fogli aperti sopra
  get inField(){
    const E = this.engine, ui = this.ui;
    if (!ui.pause?.inGame || E?.phase === 'MATCH_OVER') return false;
    return !globalThis.document?.querySelector?.('.natpf-sheet-backdrop:not(.hidden), #natpf-calibra:not(.hidden), .natpf-diag:not(.hidden)');
  }
  get mouseRacket(){ return this.ui.controller === 'mouse'; }
  // misura e immagine del cursore grande secondo l'area; scelte in Opzioni
  apply(){
    const h = this.html; if (!h) return;
    const big = this.pref === 'grande';
    h.classList?.toggle('cursor-big', big);
    if (big){
      const size = pointerSize(viewport().h);
      if (size !== this.size){ this.size = size; h.style?.setProperty?.('--natpf-cursor', pointerCss(size)); }
    }
    for (const b of globalThis.document?.querySelectorAll?.('[data-natpf-pointer]') || []){ const on = b.dataset.natpfPointer === this.pref; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
  }
  moved(e){
    if ((e.pointerType || 'mouse') !== 'mouse') return;
    const now = globalThis.performance?.now?.() ?? 0, was = this.hidden;
    this.lastMove = now; this.pos = { x: e.clientX, y: e.clientY }; this.outside = false;
    if (was){ this.hidden = false; this.html?.classList?.remove('cursor-hidden'); this._ring(e.clientX, e.clientY); }
    this.paintArrow();
  }
  _ring(x, y){
    const r = this.ring; if (!r) return;
    const box = globalThis.document?.body?.getBoundingClientRect?.() || { left: 0, top: 0 };
    r.style.left = `${Math.round(x - (box.left || 0))}px`; r.style.top = `${Math.round(y - (box.top || 0))}px`;
    r.classList.remove('run'); void r.offsetWidth; r.classList.add('run');
  }
  tick(){
    const inField = this.inField;
    // appena si entra in campo il puntatore sparisce (non resta sopra il campo dove si è cliccato «Gioca ›»)
    if (inField && !this.wasInField && !this.mouseRacket) this.lastMove = -Infinity;
    this.wasInField = inField;
    const ms = hideAfterMs({ inField, mouseRacket: this.mouseRacket }), now = globalThis.performance?.now?.() ?? 0;
    const hide = ms != null && now - this.lastMove >= ms;
    if (hide !== this.hidden){ this.hidden = hide; this.html?.classList?.toggle('cursor-hidden', hide); }
    this.paintArrow();
  }
  // freccia sul bordo dell'area quando il puntatore è fuori dalla parte che si vede (solo con un'area più piccola della
  // finestra, o con il puntatore uscito dalla finestra)
  paintArrow(){
    const el = this.arrow; if (!el) return;
    const a = viewport(), p = this.pos;
    // (la freccia tutta dentro l'area: il suo centro a metà della sua misura dal bordo, più un poco)
    const m = Math.round((el.offsetWidth || 48)/2 + 6);
    let at = null;
    // (uscito dalla finestra la freccia resta finché non torna, anche se intanto il puntatore si nasconde)
    if (p && (this.outside || !this.hidden)){
      if (this.outside) at = exitArrow(p.x, p.y, a, m);
      else if (!a.full) at = edgeArrow(p.x, p.y, a, m);
    }
    el.classList.toggle('hidden', !at);
    if (at){ el.style.left = `${at.x}px`; el.style.top = `${at.y}px`; el.style.setProperty?.('--angle', `${at.angle}deg`); }
  }
}
