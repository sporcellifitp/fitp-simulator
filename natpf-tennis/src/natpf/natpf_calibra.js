// Calibrazione dello schermo, come nei videogiochi (B8, 05/11: «adatta il fullscreen in base alla finestra/monitor in
// utilizzo o prevedi la calibrazione a full screen»). Si apre da Opzioni → Schermo → «Calibra lo schermo…».
//   • frecce agli angoli e segni a metà di ogni bordo dell'area: si regola finché toccano i bordi visibili dello schermo
//     (monitor o ledwall che tagliano i bordi, processore LED che prende un angolo dell'uscita del PC);
//   • cerchio e griglia al centro: il cerchio deve essere rotondo (se è ovale il processore LED stira l'immagine);
//   • i numeri veri: finestra, densità dei pixel, monitor, area, formato, bordi;
//   • formato (tasti 1-6), bordo da spostare (Tab: Tutti / Sopra / Destra / Sotto / Sinistra), frecce (Maiusc: passi da
//     5%), − / + per il mouse, R azzera, F schermo intero, Invio salva, Esc annulla e rimette com'era;
//   • un bordo si ferma quando l'area arriverebbe sotto 480 × 360 px (AREA_MIN di natpf_screen.js): non si può salvare
//     un'area in cui menu e calibrazione non si usano più.
// B39.6 (stand con il solo mouse): prima con il mouse servivano circa 110 clic (0,5 % a clic, «−» e «+» che si spostavano)
// e all'inizio «Salva» poteva stare fuori dalla parte visibile del ledwall. Ora:
//   • i due angoli: appena si apre, si clicca l'angolo in alto a sinistra e quello in basso a destra che si vedono sul
//     ledwall (una scritta segue il puntatore e dice cosa fare): l'area diventa quel rettangolo, il riquadro con «Salva»
//     ci sta dentro; «Clicca i due angoli» li fa rifare;
//   • le frecce dei bordi si trascinano; «−» e «+» tenuti premuti ripetono, sempre più in fretta (dopo un secondo e mezzo
//     a passi da 5 %); «Schermo intero» anche qui; la riga in basso spiega anche il mouse.
// L'anteprima è dal vivo (NatpfScreen.preview): l'area cambia mentre si regola e il riquadro, che è un figlio diretto del
// body, la segue. Non è una pagina del menu: le frecce cambiano i bordi invece di spostare il fuoco (i tasti arrivano qui
// dalla lobby, natpf_lobby._key, subito dopo la guida).
import { FORMATS, SCREENS, normalizeMargins, normalizeScreen, fitMargins, NO_MARGINS } from './natpf_screen.js';
const $ = id => document.getElementById(id);
export const EDGES = Object.freeze(['all', 't', 'r', 'b', 'l']);
export const EDGE_NAMES = Object.freeze({ all: 'Tutti', t: 'Sopra', r: 'Destra', b: 'Sotto', l: 'Sinistra' });
export const CAL_STEP = 0.5, CAL_BIG = 5;
// verso di ogni freccia: -1 il bordo va verso il bordo dello schermo (margine più piccolo), +1 verso il centro.
// Un bordo solo si sposta nella direzione della freccia; «Tutti»: ↑ → area più grande, ↓ ← più piccola
const OUT = { t: 'ArrowUp', r: 'ArrowRight', b: 'ArrowDown', l: 'ArrowLeft' };
const IN = { t: 'ArrowDown', r: 'ArrowLeft', b: 'ArrowUp', l: 'ArrowRight' };
export function arrowDir(edge, code){
  if (edge === 'all') return code === 'ArrowUp' || code === 'ArrowRight' ? -1 : code === 'ArrowDown' || code === 'ArrowLeft' ? 1 : 0;
  return code === OUT[edge] ? -1 : code === IN[edge] ? 1 : 0;
}
// bordi dopo un passo (dir -1/+1) sul bordo scelto o su tutti
export function stepMargins(margins, edge, dir, big = false){
  const m = normalizeMargins(margins), d = (big ? CAL_BIG : CAL_STEP)*Math.sign(dir || 0);
  for (const k of edge === 'all' ? ['t', 'r', 'b', 'l'] : [edge]) if (k in m) m[k] += d;
  return normalizeMargins(m);
}
export const nextEdge = (edge, back = false) => EDGES[(EDGES.indexOf(edge) + (back ? -1 : 1) + EDGES.length) % EDGES.length];
// B39.6 · due angoli cliccati (coordinate della finestra, in qualunque ordine) → bordi in % della finestra: l'area è il
// rettangolo tra i due punti (pixel compresi). La misura minima la fa poi fitMargins
export function cornersMargins(p1, p2, winW, winH){
  if (!p1 || !p2 || !(winW > 0) || !(winH > 0)) return null;
  const x1 = Math.max(0, Math.min(p1.x, p2.x)), y1 = Math.max(0, Math.min(p1.y, p2.y));
  const x2 = Math.min(winW, Math.max(p1.x, p2.x) + 1), y2 = Math.min(winH, Math.max(p1.y, p2.y) + 1);
  return normalizeMargins({ t: y1/winH*100, l: x1/winW*100, r: (winW - x2)/winW*100, b: (winH - y2)/winH*100 });
}
// B39.6 · freccia di un bordo trascinata fino a (x, y) (coordinate della finestra) → il margine di quel bordo in %
export function edgeMargin(edge, x, y, winW, winH){
  const v = edge === 't' ? y/winH : edge === 'b' ? (winH - y)/winH : edge === 'l' ? x/winW : edge === 'r' ? (winW - x)/winW : null;
  return v == null || !Number.isFinite(v) ? null : Math.round(Math.max(0, v)*200)/2;
}
// B39.6 · «−» / «+» tenuti premuti: la prima ripetizione dopo REPEAT.firstMs, poi ogni REPEAT.everyMs; dalla
// REPEAT.bigAfter-esima ripetizione a passi grandi (5 %)
export const REPEAT = Object.freeze({ firstMs: 450, everyMs: 90, bigAfter: 12 });
export const repeatPlan = i => ({ wait: i <= 0 ? REPEAT.firstMs : REPEAT.everyMs, big: i >= REPEAT.bigAfter });
export const CORNER_TEXT = Object.freeze(['1/2 · Clicca l’angolo in alto a sinistra che vedi sul ledwall', '2/2 · Ora l’angolo in basso a destra che vedi']);
// numeri all'italiana (virgola)
const num = n => String(Math.round(n*100)/100).replace('.', ',');
const ARROWS_HELP = {
  all: '↑ → area più grande · ↓ ← più piccola',
  t: '↑ verso il bordo · ↓ verso il centro', b: '↓ verso il bordo · ↑ verso il centro',
  l: '← verso il bordo · → verso il centro', r: '→ verso il bordo · ← verso il centro',
};
// testo dei numeri (anche per le prove): finestra, densità, monitor, area, formato, bordi
export function calInfo(i){
  const real = (w, h) => (i.dpr !== 1 ? ` (${Math.round(w*i.dpr)} × ${Math.round(h*i.dpr)} reali)` : '');
  const m = i.margins, f = SCREENS[normalizeScreen(i.preset)];
  return {
    win: `${i.win.w} × ${i.win.h} px`,
    dpr: `× ${num(i.dpr)}`,
    screen: `${i.screen.w} × ${i.screen.h} px${real(i.screen.w, i.screen.h)}`,
    area: `${i.area.w} × ${i.area.h} px da ${i.area.x}, ${i.area.y}${real(i.area.w, i.area.h)}`,
    format: f.ratio && f.short !== f.label ? `${f.short} · ${f.label}` : f.ratio ? f.short : 'Intero (tutto il monitor)',
    margins: `↑ ${num(m.t)} · → ${num(m.r)} · ↓ ${num(m.b)} · ← ${num(m.l)} %`,
  };
}

export class NatpfCalibra {
  // screen: NatpfScreen; onClose(saved) quando si chiude (la lobby ridisegna le Opzioni)
  constructor(screen, { onClose = null, toast = null } = {}){
    this.screen = screen; this.onClose = onClose; this.toast = toast;
    this.el = $('natpf-calibra');
    this.isOpen = false; this.edge = 'all'; this.preset = 'full'; this.margins = { ...NO_MARGINS }; this.snap = null;
    if (!this.el) return;
    this.corners = null;              // B39.6: null (spenti) o [] / [p1] mentre si cliccano i due angoli
    // i clic restano qui (sotto c'è il menu, e il motore ascolta i clic sulla finestra)
    this.el.addEventListener('pointerdown', e => { e.stopPropagation(); this._press(e); });
    this.el.addEventListener('click', e => {
      e.stopPropagation();
      const t = e.target;
      const f = t?.closest?.('[data-cal-format]'); if (f) return this.setFormat(f.dataset.calFormat);
      // (una freccia appena trascinata non cambia anche il bordo scelto con il clic che segue)
      const g = t?.closest?.('[data-cal-edge]'); if (g){ if (this._dragged){ this._dragged = false; return; } return this.selectEdge(g.dataset.calEdge); }
      // («−» e «+» premuti con il mouse fanno il passo alla pressione e ripetono tenendo premuto; il clic che segue no.
      // Con Invio o Spazio, detail 0, il passo lo fa il clic)
      const s = t?.closest?.('[data-cal-step]'); if (s){ if (e.detail > 0 && this._held){ this._held = false; return; } return this.step(Number(s.dataset.calStep)); }
      const a = t?.closest?.('[data-cal]'); if (!a) return;
      if (a.dataset.cal === 'save') this.save();
      else if (a.dataset.cal === 'cancel') this.cancel();
      else if (a.dataset.cal === 'reset') this.reset();
      else if (a.dataset.cal === 'corners') this.startCorners();
      else if (a.dataset.cal === 'fullscreen') this.screen.fullscreen?.toggle?.();
    });
    // B39.6 · i due angoli: anche fuori dall'area (l'area di adesso può essere più grande o più piccola della parte che si
    // vede): in cattura sulla finestra, prima di tutto; la scritta segue il puntatore
    globalThis.addEventListener?.('pointerdown', e => this._corner(e), true);
    globalThis.addEventListener?.('pointermove', e => this._hint(e), { capture: true, passive: true });
    // fine della ripetizione di «−» / «+» e del trascinamento di una freccia
    for (const t of ['pointerup', 'pointercancel']) globalThis.addEventListener?.(t, () => this._release(), true);
  }
  open(){
    if (this.isOpen || !this.el) return;
    this.snap = this.screen.snapshot();
    // i bordi che valgono in questa finestra (se è più piccola di quando si è calibrato, ridotti)
    const { w, h } = this.screen.info().win;
    this.preset = this.snap.preset; this.margins = fitMargins(this.snap.margins, w, h); this.edge = 'all';
    this.isOpen = true;
    this.el.classList.remove('hidden');
    this._off = this.screen.onApply(() => this.paint());
    // anteprima subito: con un'area dall'indirizzo (?area=) si vede quella della calibrazione
    this.screen.preview({ preset: this.preset, margins: this.margins });
    // B39.6: si comincia dai due angoli (con il mouse); i tasti e le frecce funzionano come prima
    this.startCorners();
    this.paint();
    this.el.querySelector?.('[data-cal="save"]')?.focus?.({ preventScroll: true });
  }
  // Invio: si salva e vale da subito (e ai prossimi avvii)
  save(){
    if (!this.isOpen) return;
    this.screen.save({ preset: this.preset, margins: this.margins });
    this._close(true);
    this.toast?.('Schermo calibrato: vale anche ai prossimi avvii');
  }
  // Esc: tutto com'era prima di aprire
  cancel(){
    if (!this.isOpen) return;
    this.screen.restore(this.snap);
    this._close(false);
  }
  _close(saved){
    this.stopCorners(); this._release();
    this.isOpen = false;
    this.el.classList.add('hidden');
    this._off?.(); this._off = null;
    try { this.onClose?.(saved); } catch (e){ console.error(e); }
  }
  // R: formato intero e nessun bordo (Esc rimette comunque la calibrazione di prima)
  reset(){ this.preset = 'full'; this.margins = { ...NO_MARGINS }; this._preview(); }
  setFormat(id){ this.preset = normalizeScreen(id); this._preview(); }
  selectEdge(edge){ if (EDGES.includes(edge)){ this.edge = edge; this.paint(); } }
  // − / + e frecce: -1 verso il bordo dello schermo, +1 verso il centro
  step(dir, big = false){
    const { w, h } = this.screen.info().win;
    this.margins = fitMargins(stepMargins(this.margins, this.edge, dir, big), w, h, this.margins);
    this._preview();
  }
  _preview(){ this.screen.preview({ preset: this.preset, margins: this.margins }); this.paint(); }
  /* ---------- B39.6 · calibrazione con il mouse ---------- */
  // i due angoli: la scritta sotto il puntatore (figlia di <html>, fuori dall'area: si vede ovunque nella finestra)
  startCorners(){
    if (!this.isOpen) return;
    this.corners = [];
    const doc = globalThis.document;
    if (!this.hintEl && doc?.createElement){
      this.hintEl = doc.createElement('div'); this.hintEl.className = 'natpf-cal-hint hidden'; this.hintEl.setAttribute?.('role', 'status');
      this.dotEl = doc.createElement('div'); this.dotEl.className = 'natpf-cal-dot hidden'; this.dotEl.setAttribute?.('aria-hidden', 'true');
      (doc.documentElement || doc.body)?.appendChild?.(this.hintEl); (doc.documentElement || doc.body)?.appendChild?.(this.dotEl);
    }
    this._paintHint();
  }
  stopCorners(){ this.corners = null; this.hintEl?.classList.add('hidden'); this.dotEl?.classList.add('hidden'); this.el?.classList.remove('corners'); }
  _paintHint(at = this._hintAt){
    const h = this.hintEl, on = !!this.corners && this.isOpen;
    this.el?.classList.toggle('corners', on);
    if (!h) return;
    h.classList.toggle('hidden', !on);
    if (!on) return;
    const t = CORNER_TEXT[Math.min(1, this.corners.length)];
    if (h.textContent !== t) h.textContent = t;
    const w = globalThis.innerWidth || 1280, hh = globalThis.innerHeight || 720, p = at || { x: w/2, y: hh/2 };
    // vicino ai bordi della finestra la scritta passa dall'altra parte del puntatore
    h.classList.toggle('left', p.x > w*0.6); h.classList.toggle('up', p.y > hh*0.75);
    h.style.left = `${Math.round(p.x)}px`; h.style.top = `${Math.round(p.y)}px`;
  }
  _hint(e){
    if (!this.corners || !this.isOpen) return;
    this._hintAt = { x: e.clientX, y: e.clientY }; this._paintHint();
  }
  // clic per un angolo: ovunque tranne il riquadro dei comandi
  _corner(e){
    if (!this.corners || !this.isOpen || e.button !== 0 || e.isTrusted === false) return;
    // un comando del riquadro o una freccia di un bordo: si regola in un altro modo, niente angoli
    if (e.target?.closest?.('.cal-panel, .cal-mark')){ if (!e.target.closest('[data-cal="corners"]')) this.stopCorners(); return; }
    e.preventDefault(); e.stopPropagation();
    const p = { x: e.clientX, y: e.clientY };
    this.corners.push(p);
    if (this.corners.length === 1){
      if (this.dotEl){ this.dotEl.style.left = `${Math.round(p.x)}px`; this.dotEl.style.top = `${Math.round(p.y)}px`; this.dotEl.classList.remove('hidden'); }
      this._hintAt = p; this._paintHint();
      return;
    }
    const { w, h } = this.screen.info().win, m = cornersMargins(this.corners[0], p, w, h);
    this.stopCorners();
    if (!m) return;
    this.preset = 'full'; this.margins = fitMargins(m, w, h); this.edge = 'all';
    this._preview();
    this.toast?.('Area presa dai due angoli: regola le frecce se serve, poi «Salva»');
  }
  // pressione su una freccia di un bordo (si trascina) o su «−» / «+» (ripete tenendo premuto)
  _press(e){
    if (e.button !== 0 || this.corners) return;
    const mark = e.target?.closest?.('.cal-mark[data-cal-edge]');
    if (mark){
      // (trascinamento relativo: il bordo si sposta quanto il puntatore, senza saltare sotto il puntatore alla prima mossa)
      const edge = mark.dataset.calEdge, { w, h } = this.screen.info().win, m = normalizeMargins(this.margins);
      const pos = edge === 'l' ? w*m.l/100 : edge === 'r' ? w*(1 - m.r/100) : edge === 't' ? h*m.t/100 : h*(1 - m.b/100);
      const offset = pos - (edge === 'l' || edge === 'r' ? e.clientX : e.clientY);
      this._drag = { edge, moved: false, offset: Number.isFinite(offset) ? offset : 0 }; this._dragged = false;
      this.selectEdge(this._drag.edge);
      try { mark.setPointerCapture?.(e.pointerId); } catch {}
      this._dragMove = ev => this._dragTo(ev);
      globalThis.addEventListener?.('pointermove', this._dragMove, true);
      return;
    }
    const s = e.target?.closest?.('[data-cal-step]');
    if (s){
      const dir = Number(s.dataset.calStep); let i = 0;
      this._held = true; this.step(dir);
      const next = () => { const r = repeatPlan(i); this._rep = setTimeout(() => { if (!this._held) return; this.step(dir, repeatPlan(i).big); i++; next(); }, r.wait); };
      clearTimeout(this._rep); next();
    }
  }
  _dragTo(e){
    const d = this._drag; if (!d) return;
    const horiz = d.edge === 'l' || d.edge === 'r';
    const { w, h } = this.screen.info().win, v = edgeMargin(d.edge, e.clientX + (horiz ? d.offset : 0), e.clientY + (horiz ? 0 : d.offset), w, h);
    if (v == null) return;
    d.moved = true; this._dragged = true;
    this.margins = fitMargins({ ...this.margins, [d.edge]: v }, w, h, this.margins);
    this._preview();
  }
  _release(){
    clearTimeout(this._rep); this._rep = null;
    if (this._dragMove){ globalThis.removeEventListener?.('pointermove', this._dragMove, true); this._dragMove = null; }
    this._drag = null;
    // (_held resta fino al clic che segue la pressione, che così non fa un passo in più)
    setTimeout(() => { this._held = false; }, 0);
  }
  // tasti (dalla lobby, prima di ogni altro gestore del menu): true se il tasto è della calibrazione
  key(e){
    if (!this.isOpen) return false;
    const c = e.code || '';
    // Esc e Invio tenuti premuti ripetono il tasto: conta solo il primo
    if (c === 'Escape'){ if (!e.repeat) this.cancel(); return true; }
    // (con la tastiera niente angoli da cliccare)
    if (this.corners && c !== 'Enter' && c !== 'NumpadEnter') this.stopCorners();
    if (c === 'Enter' || c === 'NumpadEnter'){ if (!e.repeat) this.save(); return true; }
    if (c === 'Tab'){ this.selectEdge(nextEdge(this.edge, e.shiftKey)); return true; }
    const n = /^(?:Digit|Numpad)([1-6])$/.exec(c); if (n){ this.setFormat(FORMATS[Number(n[1]) - 1]); return true; }
    if (c.startsWith('Arrow')){ const d = arrowDir(this.edge, c); if (d) this.step(d, e.shiftKey); return true; }
    if (c === 'KeyR'){ if (!e.repeat) this.reset(); return true; }
    if (c === 'KeyF'){ if (!e.repeat) this.screen.fullscreen?.toggle(); return true; }
    return false;                        // F11, F5 e gli altri tasti del browser restano al browser
  }
  paint(){
    if (!this.isOpen || !this.el) return;
    const el = this.el, edge = this.edge;
    el.dataset.edge = edge;
    for (const b of el.querySelectorAll('[data-cal-format]')){ const on = b.dataset.calFormat === this.preset; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    for (const b of el.querySelectorAll('.cal-seg [data-cal-edge]')){ const on = b.dataset.calEdge === edge; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    const m = this.margins, set = (id, t) => { const x = $(id); if (x && x.textContent !== t) x.textContent = t; };
    for (const k of ['t', 'r', 'b', 'l']) set(`cal-val-${k}`, `${num(m[k])} %`);
    set('cal-edge-name', EDGE_NAMES[edge]);
    const lo = Math.min(m.t, m.r, m.b, m.l), hi = Math.max(m.t, m.r, m.b, m.l);
    set('cal-edge-val', edge !== 'all' ? `${num(m[edge])} %` : lo === hi ? `${num(lo)} %` : `${num(lo)}–${num(hi)} %`);
    set('cal-arrows', ARROWS_HELP[edge]);
    const info = calInfo(this.screen.info());
    for (const k of Object.keys(info)) set(`cal-i-${k}`, info[k]);
    // l'indirizzo vale a ogni avvio: lo si dice
    const s = this.screen, notes = [];
    if (s.urlArea) notes.push(`Nell’indirizzo c’è ?area=${s.urlArea.x},${s.urlArea.y},${s.urlArea.w},${s.urlArea.h}: ai prossimi avvii vale quella, toglila per usare questa calibrazione.`);
    else if (s.urlScreen) notes.push(`Nell’indirizzo c’è ?schermo=: ai prossimi avvii il formato è quello dell’indirizzo (i bordi valgono).`);
    set('cal-note', notes.join(' '));
  }
}
