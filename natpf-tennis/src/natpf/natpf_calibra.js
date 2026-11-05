// Calibrazione dello schermo, come nei videogiochi (B8, 05/11: «adatta il fullscreen in base alla finestra/monitor in
// utilizzo o prevedi la calibrazione a full screen»). Si apre da Opzioni → Schermo → «Calibra lo schermo…».
//   • frecce agli angoli e segni a metà di ogni bordo dell'area: si regola finché toccano i bordi visibili dello schermo
//     (monitor o ledwall che tagliano i bordi, processore LED che prende un angolo dell'uscita del PC);
//   • cerchio e griglia al centro: il cerchio deve essere rotondo (se è ovale il processore LED stira l'immagine);
//   • i numeri veri: finestra, densità dei pixel, monitor, area, formato, bordi;
//   • formato (tasti 1-6), bordo da spostare (Tab: Tutti / Sopra / Destra / Sotto / Sinistra), frecce (Maiusc: passi da
//     5%), − / + per il mouse, R azzera, F schermo intero, Invio salva, Esc annulla e rimette com'era.
// L'anteprima è dal vivo (NatpfScreen.preview): l'area cambia mentre si regola e il riquadro, che è un figlio diretto del
// body, la segue. Non è una pagina del menu: le frecce cambiano i bordi invece di spostare il fuoco (i tasti arrivano qui
// dalla lobby, natpf_lobby._key, subito dopo la guida).
import { FORMATS, SCREENS, normalizeMargins, normalizeScreen, NO_MARGINS } from './natpf_screen.js';
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
    // i clic restano qui (sotto c'è il menu, e il motore ascolta i clic sulla finestra)
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
    this.el.addEventListener('click', e => {
      e.stopPropagation();
      const t = e.target;
      const f = t?.closest?.('[data-cal-format]'); if (f) return this.setFormat(f.dataset.calFormat);
      const g = t?.closest?.('[data-cal-edge]'); if (g) return this.selectEdge(g.dataset.calEdge);
      const s = t?.closest?.('[data-cal-step]'); if (s) return this.step(Number(s.dataset.calStep));
      const a = t?.closest?.('[data-cal]'); if (!a) return;
      if (a.dataset.cal === 'save') this.save();
      else if (a.dataset.cal === 'cancel') this.cancel();
      else if (a.dataset.cal === 'reset') this.reset();
    });
  }
  open(){
    if (this.isOpen || !this.el) return;
    this.snap = this.screen.snapshot();
    this.preset = this.snap.preset; this.margins = normalizeMargins(this.snap.margins); this.edge = 'all';
    this.isOpen = true;
    this.el.classList.remove('hidden');
    this._off = this.screen.onApply(() => this.paint());
    // anteprima subito: con un'area dall'indirizzo (?area=) si vede quella della calibrazione
    this.screen.preview({ preset: this.preset, margins: this.margins });
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
  step(dir, big = false){ this.margins = stepMargins(this.margins, this.edge, dir, big); this._preview(); }
  _preview(){ this.screen.preview({ preset: this.preset, margins: this.margins }); this.paint(); }
  // tasti (dalla lobby, prima di ogni altro gestore del menu): true se il tasto è della calibrazione
  key(e){
    if (!this.isOpen) return false;
    const c = e.code || '';
    // Esc e Invio tenuti premuti ripetono il tasto: conta solo il primo
    if (c === 'Escape'){ if (!e.repeat) this.cancel(); return true; }
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
