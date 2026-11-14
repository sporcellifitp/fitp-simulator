// Tastiera a schermo (B38). Richieste dell'utente: 13/11 «Prevedi tra le varie anche una tastiera su schermo che compaia
// quando devo digitare, perché ho solo un mouse e non ho una tastiera wireless»; 14/11 «la scrittura dei nomi vorrei che
// si potesse modificare da tastiera su schermo». Allo stand c'è il PC con il programma Windows, il ledwall e SOLO un mouse:
// prima nessuno poteva scrivere un nome (docs/coda/B38-tastiera-a-schermo.md, docs/b38/tastiera-a-schermo.md).
//
// Una tastiera del gioco (non quella di Windows), nel sistema grafico del gioco (natpf-tastiera.css):
//   • compare da sola quando si clicca con il mouse (o si tocca) un campo di testo del gioco; scompare con «Fatto», Esc,
//     un clic fuori, oppure appena si usa una tastiera vera (un tasto fisico: chi ha la tastiera non deve vederla);
//   • campi: nome del giocatore (#nick-input), i due nomi dello stesso schermo (.split-name-input: la tastiera sta nella
//     metà di chi scrive quando la metà è abbastanza larga, altrimenti sotto, e non copre il campo dell'altro), codice
//     della sfida tra due computer (#join-code: solo maiuscole, cifre e trattino), nota e ritardo dello schermo della
//     diagnostica (il ritardo con il tastierino numerico). Ogni altro campo di testo del gioco è coperto con le regole
//     prese dal campo (maxlength, type=number); data-osk="no" lo esclude, data-osk="name|text|code|digits" sceglie le regole;
//   • tasti: righe italiane con le cifre, ⇧ (una maiuscola; da sola all'inizio dei nomi e dopo uno spazio), le lettere
//     accentate à è é ì ò ù sui loro tasti, punto, trattino, spazio, ⌫ e «Fatto» grande. Rispetta maxlength e le regole
//     del campo; ogni tasto fa partire gli eventi di una tastiera vera per il campo (beforeinput e input; change quando la
//     tastiera si chiude), così il resto del gioco non cambia. «Fatto» chiude e basta (non manda il modulo come Invio):
//     nel foglio di «Nuovo giocatore» sotto il nome c'è ancora la mano, e per andare avanti c'è «Avanti ›»;
//   • i tasti non prendono il fuoco (il campo lo tiene: il conto alla rovescia dello stesso schermo aspetta chi scrive) e
//     non mandano tasti finti (Maiusc+D aprirebbe la diagnostica);
//   • il campo resta in vista sopra la tastiera: se la tastiera lo coprirebbe, il suo foglio sale (translate) e torna giù
//     alla chiusura;
//   • dopo «Fatto» per mezzo secondo i clic proprio dove c'era «Fatto» si scartano: il secondo clic di un doppio clic non
//     arriva al pulsante sotto (B39, n. 10); un clic altrove («Avanti ›», «Entra ›») passa subito.
// Opzione dello stand «Tastiera a schermo: Automatica · Sempre · Mai» (natpf_kiosk.js, localStorage OSK.key):
//   Automatica (di base) = compare con il mouse o il tocco sul campo, sparisce con un tasto vero (e per 30 s dopo un tasto
//   vero non compare); Sempre = compare anche quando il campo prende il fuoco in altro modo e resta anche con i tasti veri;
//   Mai = mai.
// Misure: dall'area del gioco (viewport() di natpf_screen.js, che può essere un'area di ledwall) in px; nel foglio di stile
// i valori di riserva in cqh/cqw.
import { viewport } from './natpf_screen.js';

export const OSK = Object.freeze({
  key: 'natpf-tennis.tastiera',
  quietMs: 30000,    // «Automatica»: dopo un tasto vero la tastiera non si apre da sola per 30 s
  shieldMs: 450,     // dopo «Fatto»: clic scartati dove c'era «Fatto» (doppio clic)
  shieldPx: 24,      // px attorno al tasto «Fatto» in cui il secondo clic si scarta
  gap: 12,           // px tra il fondo del campo e la tastiera
  halfMin: 560,      // px: larghezza minima della metà per la tastiera di un nome dello stesso schermo
  watchMs: 250,      // ms: controllo del campo (ancora in vista e con il fuoco) e della posizione
});
export const OSK_MODES = Object.freeze(['auto', 'sempre', 'mai']);
export const oskMode = m => (OSK_MODES.includes(m) ? m : 'auto');
export const nextOskMode = m => OSK_MODES[(OSK_MODES.indexOf(oskMode(m)) + 1) % OSK_MODES.length];
const MODE_LABEL = Object.freeze({ auto: 'Automatica', sempre: 'Sempre', mai: 'Mai' });
export const oskButton = m => MODE_LABEL[oskMode(m)];
export function oskToast(m){
  const v = oskMode(m);
  const t = v === 'sempre' ? 'Tastiera a schermo: Sempre. Compare in ogni campo di testo, anche con una tastiera vera'
    : v === 'mai' ? 'Tastiera a schermo: Mai. Per scrivere serve una tastiera vera'
    : 'Tastiera a schermo: Automatica. Compare cliccando un campo con il mouse, sparisce se si usa una tastiera vera';
  return `${t}; resta salvata`;
}
export function readOskMode(storage = globalThis.localStorage){ try { return oskMode(storage?.getItem?.(OSK.key)); } catch { return 'auto'; } }
export function writeOskMode(m, storage = globalThis.localStorage){ const v = oskMode(m); try { storage?.setItem?.(OSK.key, v); } catch {} return v; }

// Si apre? mode: opzione dello stand; via: 'pointer' (mouse, tocco, penna sul campo) | 'focus' (fuoco dato in altro modo:
// Tab, codice, telecomando); physicalAt/now: ms dell'ultimo tasto vero e di adesso (Automatica: chi ha appena usato una
// tastiera vera non la vede)
export function oskOpens({ mode = 'auto', via = 'pointer', physicalAt = null, now = 0 } = {}){
  const m = oskMode(mode);
  if (m === 'mai') return false;
  if (m === 'sempre') return true;
  return via === 'pointer' && !(Number.isFinite(physicalAt) && now - physicalAt < OSK.quietMs);
}
// Un tasto vero (trusted) la chiude? In «Sempre» no (resta: si può anche scrivere con tutte e due)
export const oskHidesOnKey = ({ mode = 'auto', trusted = true } = {}) => !!trusted && oskMode(mode) !== 'sempre';

/* ---------- campi e regole ---------- */
export const OSK_KINDS = Object.freeze(['name', 'text', 'code', 'digits']);
// campi del gioco con le loro regole. name: nomi (maiuscola all'inizio e dopo uno spazio); text: note (maiuscola solo
// all'inizio); code: codice della sfida (solo maiuscole, cifre e trattino); digits: solo cifre
export const OSK_FIELDS = Object.freeze([
  { sel: '#nick-input', kind: 'name' },
  { sel: '.split-name-input', kind: 'name' },
  { sel: '#join-code', kind: 'code' },
  { sel: '[data-lag]', kind: 'digits' },
  { sel: '[data-label]', kind: 'text' },
]);
const TEXT_TYPES = new Set(['', 'text', 'search', 'number', 'tel', 'email', 'url']);
const tagOf = el => String(el?.tagName || '').toUpperCase();
const typeOf = el => String(el?.getAttribute?.('type') ?? el?.type ?? 'text').toLowerCase();
// Elemento in cui si scrive (input di testo, textarea, contenteditable): anche per i tasti del gioco che non devono
// scattare mentre si scrive (Maiusc+D della diagnostica)
export function isTextField(el){
  if (!el) return false;
  const tag = tagOf(el);
  if (tag === 'TEXTAREA') return !el.readOnly && !el.disabled;
  if (tag === 'INPUT') return TEXT_TYPES.has(typeOf(el)) && !el.readOnly && !el.disabled;
  return el.isContentEditable === true;
}
// Campo coperto dalla tastiera a schermo (input o textarea del gioco, non escluso con data-osk="no")
export function oskField(el){
  if (!el || !['INPUT', 'TEXTAREA'].includes(tagOf(el)) || !isTextField(el)) return false;
  const d = el.dataset?.osk ?? el.getAttribute?.('data-osk');
  return d !== 'no';
}
// Regole del campo: { kind, max, numeric }. max: maxlength (per type=number le cifre di max); numeric: type=number (niente
// selezione: si scrive in fondo)
export function fieldRules(el){
  const numeric = typeOf(el) === 'number';
  const d = el?.dataset?.osk ?? el?.getAttribute?.('data-osk');
  let kind = OSK_KINDS.includes(d) ? d : null;
  if (!kind) for (const f of OSK_FIELDS){ try { if (el?.matches?.(f.sel)){ kind = f.kind; break; } } catch {} }
  if (!kind) kind = numeric ? 'digits' : 'text';
  let max = Number(el?.maxLength);
  if (!(max > 0)) max = Number(el?.getAttribute?.('maxlength'));
  if (!(max > 0) && numeric){ const top = String(el?.max ?? el?.getAttribute?.('max') ?? ''); if (/^\d+$/.test(top)) max = top.length; }
  return { kind, max: max > 0 ? max : Infinity, numeric };
}
// carattere che il tasto scrive nel campo (o null se il campo non lo accetta)
export function keyChar(key, { shift = false, kind = 'text' } = {}){
  let ch = String(key ?? '');
  if ([...ch].length !== 1) return null;
  if (kind === 'code' || shift) ch = ch.toLocaleUpperCase('it');
  if (kind === 'code') return /^[A-Z0-9-]$/.test(ch) ? ch : null;
  if (kind === 'digits') return /^[0-9]$/.test(ch) ? ch : null;
  return ch;
}
// maiuscola da sola: all'inizio del campo (nomi e note) e dopo uno spazio (solo i nomi: «Anna Maria»)
export function autoShift(value, caret, kind = 'text'){
  if (kind !== 'name' && kind !== 'text') return false;
  const c = Math.max(0, Math.min(String(value ?? '').length, caret | 0));
  if (c === 0) return true;
  return kind === 'name' && String(value)[c - 1] === ' ';
}
const clampSel = (v, n, len) => (Number.isFinite(n) ? Math.max(0, Math.min(len, n | 0)) : len);
// Un tasto su un campo (funzione pura). s: { value, start, end, shift } (start/end: la selezione o il cursore; shift: la
// prossima lettera maiuscola); key: un carattere, 'back' (⌫) o 'shift' (⇧); rules: fieldRules. Restituisce lo stato nuovo,
// changed (il testo è cambiato) e, per gli eventi del campo, inputType e data come una tastiera vera
export function applyKey(s = {}, key, rules = {}){
  const value = String(s.value ?? ''), len = value.length, kind = rules.kind || 'text', max = rules.max > 0 ? rules.max : Infinity;
  let start = clampSel(value, s.start, len), end = clampSel(value, s.end ?? s.start, len);
  if (end < start) [start, end] = [end, start];
  const same = { value, start, end, shift: !!s.shift, changed: false, inputType: null, data: null };
  if (key === 'shift') return { ...same, shift: !s.shift };
  if (key === 'back'){
    if (start === end && start === 0) return same;
    const from = start === end ? start - 1 : start, v = value.slice(0, from) + value.slice(end);
    return { value: v, start: from, end: from, shift: autoShift(v, from, kind), changed: true, inputType: 'deleteContentBackward', data: null };
  }
  const ch = keyChar(key, { shift: !!s.shift, kind });
  if (ch == null) return same;
  // maxlength: come una tastiera vera, il carattere in più non entra (una selezione si sostituisce)
  if (len - (end - start) + ch.length > max) return same;
  const v = value.slice(0, start) + ch + value.slice(end), c = start + ch.length;
  return { value: v, start: c, end: c, shift: autoShift(v, c, kind), changed: true, inputType: 'insertText', data: ch };
}

/* ---------- disposizione ---------- */
// righe della tastiera: 24 colonne (un tasto normale ne prende 2). Le lettere accentate hanno il loro tasto; nel codice
// della sfida non servono (data-nocode: restano al loro posto ma non si vedono)
export const OSK_ROWS = Object.freeze([
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', { k: 'back', label: '⌫', span: 4, aria: 'Cancella' }],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', { k: 'è', nocode: true }, { k: 'é', nocode: true }],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', { k: 'ò', nocode: true }, { k: 'à', nocode: true }, { k: 'ù', nocode: true }],
  [{ k: 'shift', label: '⇧', span: 4, aria: 'Maiuscola', nocode: true }, 'z', 'x', 'c', 'v', 'b', 'n', 'm', { k: 'ì', nocode: true }, { k: '.', nocode: true }, '-'],
  [{ k: ' ', label: 'spazio', span: 16, aria: 'Spazio', nocode: true }, { k: 'done', label: 'Fatto', span: 8 }],
]);
export const OSK_DIGITS = Object.freeze(['1', '2', '3', '4', '5', '6', '7', '8', '9', { k: 'back', label: '⌫', aria: 'Cancella' }, '0', { k: 'done', label: 'Fatto' }]);
const keyOf = k => (typeof k === 'string' ? { k, label: k, span: 2 } : { span: 2, label: k.k, ...k });

// Dove sta la tastiera nell'area (funzione pura, px dell'area). area: { w, h }; field: il rettangolo del campo nell'area
// ({ top, bottom }) o null; kind: regole del campo; half: 'p1' | 'p2' per i nomi dello stesso schermo (metà sinistra o
// destra, se è larga almeno OSK.halfMin). Tasti alti il 7,5% dell'area (tra 30 e 92 px), larghi al più 1,5 volte; la
// tastiera sta in basso; se coprirebbe il campo, il foglio del campo sale di `lift` px (mai sopra il bordo dell'area); se
// non basta, la tastiera va in alto. Restituisce { x, y, w, h, key, gap, pad, lift, top, half }
export function oskLayout({ area = { w: 1280, h: 720 }, field = null, kind = 'text', half = null } = {}){
  const W = Math.max(1, area.w | 0), H = Math.max(1, area.h | 0);
  const margin = Math.round(Math.max(8, Math.min(24, Math.min(W, H)*0.02)));
  const digits = kind === 'digits', cols = digits ? 3 : 12, rows = digits ? 4 : OSK_ROWS.length;
  let key = Math.round(Math.max(30, Math.min(92, H*0.075)));
  const gap = Math.max(4, Math.round(key*0.12)), pad = Math.max(6, Math.round(key*0.16));
  const useHalf = !digits && (half === 'p1' || half === 'p2') && W/2 >= OSK.halfMin;
  const room = (useHalf ? W/2 : W) - 2*margin;
  let w = Math.min(room, cols*key*1.5 + (cols - 1)*gap + 2*pad);
  // tasti troppo stretti per la larghezza che c'è: più bassi anche loro (mai sotto 26 px)
  const keyW = (w - 2*pad - (cols - 1)*gap)/cols;
  if (keyW < key*0.8) key = Math.max(26, Math.floor(keyW/0.8));
  w = Math.round(w);
  const h = Math.round(rows*key + (rows - 1)*gap + 2*pad);
  const x0 = useHalf && half === 'p2' ? W/2 : 0;
  const x = Math.round(x0 + ((useHalf ? W/2 : W) - w)/2);
  let y = H - margin - h, lift = 0, top = false;
  if (field && Number.isFinite(field.bottom)){
    const need = field.bottom + OSK.gap - y;
    if (need > 0){
      lift = Math.max(0, Math.min(need, (field.top ?? field.bottom) - margin));
      // non basta salire: tastiera in alto, se sopra il campo c'è posto
      if (field.bottom - lift + OSK.gap > y && (field.top ?? 0) >= margin + h + OSK.gap){ top = true; y = margin; lift = 0; }
    }
  }
  return { x, y, w, h, key, gap, pad, lift: Math.round(lift), top, half: useHalf ? half : null };
}

/* ---------- la tastiera nella pagina ---------- */
const now = () => (globalThis.performance?.now ? performance.now() : Date.now());
const inRect = (r, x, y) => !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
// evento d'ingresso come quello di una tastiera vera (InputEvent nel browser; Event con gli stessi campi dove manca)
function inputEvent(type, init){
  const E = globalThis.InputEvent || globalThis.Event;
  let ev;
  try { ev = new E(type, init); } catch { ev = new globalThis.Event(type, init); }
  if (!('inputType' in ev)) try { Object.defineProperty(ev, 'inputType', { value: init.inputType }); Object.defineProperty(ev, 'data', { value: init.data }); } catch {}
  return ev;
}
// contenitore che sale quando la tastiera coprirebbe il campo (il foglio, la pagina del menu, la diagnostica)
const LIFT = '.natpf-sheet, .lobby-page, .natpf-diag, .natpf-guest-dialog, .split-setup';

export class NatpfTastiera {
  // doc, win, storage e area sostituibili nelle prove
  constructor({ doc = globalThis.document, win = globalThis.window, storage = globalThis.localStorage, area = viewport, onChange = null } = {}){
    Object.assign(this, { doc, win, storage, area, onChange });
    this.mode = readOskMode(storage);
    this.field = null; this.shift = false; this.dirty = false; this.physicalAt = null; this.shield = null; this.lifted = null; this.timer = null;
    this.el = null;
    if (!doc?.createElement || !doc.body || typeof win?.addEventListener !== 'function') return;
    const el = this.el = doc.createElement('div');
    el.id = 'natpf-tastiera'; el.className = 'natpf-tastiera hidden';
    el.setAttribute?.('role', 'group'); el.setAttribute?.('aria-label', 'Tastiera a schermo');
    const btn = (raw, cls = '') => {
      const k = keyOf(raw), label = k.label === ' ' ? 'spazio' : k.label;
      const kind = k.k === 'done' ? ' osk-done' : k.k === 'back' ? ' osk-back' : k.k === 'shift' ? ' osk-shift' : k.k === ' ' ? ' osk-space' : /^[a-zàèéìòù]$/.test(k.k) ? ' osk-letter' : '';
      return `<button type="button" tabindex="-1" class="osk-k${kind}${cls}" data-k="${k.k === '"' ? '&quot;' : k.k}"${k.nocode ? ' data-nocode' : ''}${k.aria ? ` aria-label="${k.aria}"` : ''} style="grid-column: span ${k.span}">${label}</button>`;
    };
    el.innerHTML = `<div class="osk-main">${OSK_ROWS.map(r => r.map(k => btn(k)).join('')).join('')}</div><div class="osk-num">${OSK_DIGITS.map(k => btn({ ...keyOf(k), span: 1 })).join('')}</div>`;
    doc.body.appendChild(el);
    // tasti: al «pointerdown» (subito, anche due volte di fila per le doppie), senza prendere il fuoco (il campo lo tiene)
    // e senza arrivare al gioco sotto
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      if (e.button > 0) return;
      const b = e.target?.closest?.('[data-k]'); if (!b) return;
      b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 140);
      this.press(b.dataset.k, b);
    });
    // (il tasto destro resta libero: nel programma Windows apre il menu dello staff, B39)
    for (const t of ['mousedown', 'click', 'dblclick']) el.addEventListener(t, e => { e.preventDefault(); e.stopPropagation(); });
    el.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    // clic sul campo (apre), fuori (chiude), dopo «Fatto» (scarto), tasti veri, fuoco
    win.addEventListener('pointerdown', e => this._onPointer(e), true);
    for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick']) win.addEventListener(t, e => this._onShield(e), true);
    win.addEventListener('keydown', e => this._onKey(e), true);
    doc.addEventListener?.('focusin', e => this._onFocus(e), true);
    win.addEventListener('resize', () => { if (this.visible) this.place(); });
  }
  get visible(){ return !!this.el && !!this.field && !this.el.classList.contains('hidden'); }
  // la tastiera è aperta su un campo che corrisponde al selettore (natpf_split_ui: il conto alla rovescia aspetta)
  isOpenOn(sel){ try { return this.visible && !!this.field?.matches?.(sel); } catch { return false; } }
  setMode(m){ this.mode = writeOskMode(m, this.storage); if (this.mode === 'mai') this.hide(); return this.mode; }
  // campo coperto dall'evento (anche cliccando la sua etichetta)
  _fieldOf(t){
    if (!t) return null;
    if (oskField(t)) return t;
    const lab = t.closest?.('label'), c = lab?.control || lab?.querySelector?.('input, textarea');
    return c && oskField(c) ? c : null;
  }
  _onPointer(e){
    if (!this.el || e.isTrusted === false) return;
    if (this.el.contains(e.target)) return;
    const f = this._fieldOf(e.target);
    if (f){
      if (!oskOpens({ mode: this.mode, via: 'pointer', physicalAt: this.physicalAt, now: now() })) return;
      // niente tastiera del sistema sopra la nostra (tocco)
      if (e.pointerType === 'touch' || e.pointerType === 'pen'){ this._im = { el: f, prev: f.getAttribute('inputmode') }; f.setAttribute('inputmode', 'none'); }
      // dopo il clic il campo ha il fuoco (e il cursore dove si è cliccato)
      setTimeout(() => this.open(f), 0);
      return;
    }
    if (this.visible) this.hide();
  }
  _onShield(e){
    const s = this.shield; if (!s || e.isTrusted === false) return;
    if (now() > s.until){ this.shield = null; return; }
    if (inRect(s.rect, e.clientX, e.clientY)){ e.preventDefault(); e.stopImmediatePropagation(); }
  }
  _onKey(e){
    if (e.isTrusted === false) return;
    this.physicalAt = now();
    if (!this.visible) return;
    // Esc: chiude la tastiera, non il foglio sotto
    if (e.key === 'Escape' || e.code === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); this.hide(); return; }
    if (oskHidesOnKey({ mode: this.mode, trusted: true })) this.hide();
  }
  _onFocus(e){
    const f = this._fieldOf(e.target);
    if (this.visible && f && f !== this.field){ this.open(f); return; }
    if (f && !this.visible && oskOpens({ mode: this.mode, via: 'focus', physicalAt: this.physicalAt, now: now() })) this.open(f);
  }
  open(f){
    if (!this.el || !f || !oskField(f) || this.mode === 'mai') return false;
    // (un clic di prima, dopo «Fatto», non scarta i tasti della tastiera riaperta)
    this.shield = null;
    const again = this.visible && this.field === f;
    if (this.field && this.field !== f) this._finish();
    if (this.doc.activeElement !== f) try { f.focus({ preventScroll: true }); } catch {}
    // (stesso campo cliccato di nuovo, per spostare il cursore: la scrittura continua, change alla chiusura)
    if (!again){ this.field = f; this.dirty = false; }
    const r = fieldRules(f), caret = r.numeric ? String(f.value).length : (f.selectionStart ?? String(f.value).length);
    this.rules = r; this.shift = autoShift(f.value, caret, r.kind);
    this.el.dataset.kind = r.kind;
    this.el.classList.toggle('code', r.kind === 'code'); this.el.classList.toggle('digits', r.kind === 'digits');
    this.el.classList.remove('hidden');
    this._paintShift(); this.place();
    // (unref: nelle prove con Node il controllo non tiene vivo il processo; nel browser non c'è)
    if (!this.timer){ this.timer = setInterval(() => this._watch(), OSK.watchMs); this.timer?.unref?.(); }
    this.onChange?.(true);
    return true;
  }
  // chiude. shield: chiusa da «Fatto» (il tasto premuto, o true dal codice: tutta la tastiera): per un attimo i clic in quel
  // punto si scartano (il secondo clic di un doppio clic)
  hide({ shield = false } = {}){
    if (!this.el) return;
    if (shield && this.visible){
      const r = (shield !== true && shield.getBoundingClientRect?.()) || this.el.getBoundingClientRect?.(), m = shield !== true ? OSK.shieldPx : 0;
      if (r) this.shield = { until: now() + OSK.shieldMs, rect: { left: r.left - m, right: r.right + m, top: r.top - m, bottom: r.bottom + m } };
    }
    const was = this.visible;
    this._finish();
    this.el.classList.add('hidden');
    if (this.timer){ clearInterval(this.timer); this.timer = null; }
    if (was) this.onChange?.(false);
  }
  // fine della scrittura su un campo: change (come quando un campo scritto perde il fuoco), foglio giù, inputmode di prima
  _finish(){
    const f = this.field;
    if (f && this.dirty) try { f.dispatchEvent(new globalThis.Event('change', { bubbles: true })); } catch {}
    this.dirty = false; this.field = null;
    this._lift(null, 0);
    const im = this._im; this._im = null;
    if (im?.el){ if (im.prev == null) im.el.removeAttribute('inputmode'); else im.el.setAttribute('inputmode', im.prev); }
  }
  // un tasto (key: il pulsante premuto, per lo scarto del doppio clic su «Fatto»)
  press(k, key = null){
    const f = this.field; if (!f) return false;
    if (k === 'done'){ this.hide({ shield: key || true }); return true; }
    if (k === 'shift'){ this.shift = !this.shift; this._paintShift(); return true; }
    const r = this.rules || fieldRules(f), v = String(f.value ?? '');
    const s = r.numeric ? { value: v, start: v.length, end: v.length } : { value: v, start: f.selectionStart ?? v.length, end: f.selectionEnd ?? v.length };
    const n = applyKey({ ...s, shift: this.shift }, k, r);
    this.shift = n.shift; this._paintShift();
    if (!n.changed){ this.el.classList.remove('nope'); void this.el.offsetWidth; this.el.classList.add('nope'); return false; }
    // gli stessi eventi di una tastiera vera: beforeinput (un campo può rifiutare), il testo, input
    if (!f.dispatchEvent(inputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: n.inputType, data: n.data }))) return false;
    f.value = n.value;
    if (!r.numeric) try { f.setSelectionRange(n.start, n.end); } catch {}
    this.dirty = true;
    f.dispatchEvent(inputEvent('input', { bubbles: true, inputType: n.inputType, data: n.data }));
    return true;
  }
  _paintShift(){ this.el?.classList.toggle('shift', !!this.shift); }
  // il campo è ancora lì (foglio aperto, fuoco nel campo)? Se no la tastiera si chiude; se sì si rimette a posto
  _watch(){
    const f = this.field;
    if (!f) return this.hide();
    const shown = f.isConnected !== false && (typeof f.getClientRects !== 'function' || f.getClientRects().length > 0) && !f.closest?.('.hidden');
    if (!shown || this.doc.activeElement !== f) return this.hide();
    this.place();
  }
  place(){
    const f = this.field, el = this.el; if (!f || !el) return null;
    const a = this.area(), r = f.getBoundingClientRect();
    // (il foglio è già salito: la misura del campo si riporta a dove sarebbe senza)
    const up = this.lifted?.px || 0;
    const half = f.matches?.('.split-name-input') ? f.dataset?.splitName || null : null;
    const L = oskLayout({ area: { w: a.w, h: a.h }, field: { top: r.top - a.y + up, bottom: r.bottom - a.y + up }, kind: this.rules?.kind || 'text', half });
    const key = `${L.x}|${L.y}|${L.w}|${L.h}|${L.key}`;
    if (key !== this._placed){
      this._placed = key;
      const st = el.style;
      st.setProperty('--osk-x', `${L.x}px`); st.setProperty('--osk-y', `${L.y}px`); st.setProperty('--osk-w', `${L.w}px`);
      st.setProperty('--osk-k', `${L.key}px`); st.setProperty('--osk-gap', `${L.gap}px`); st.setProperty('--osk-pad', `${L.pad}px`);
      el.dataset.half = L.half || ''; el.dataset.at = L.top ? 'top' : 'bottom';
    }
    this._lift(f.closest?.(LIFT) || null, L.lift);
    this.layout = L;
    return L;
  }
  // foglio del campo un po' più su (translate: si somma alle animazioni dei fogli, che usano transform)
  _lift(box, px){
    const prev = this.lifted;
    if (prev && (prev.box !== box || !px)){ prev.box.style.translate = prev.old || ''; prev.box.classList.remove('osk-lifted'); this.lifted = null; }
    if (box && px > 0){
      if (!this.lifted) this.lifted = { box, old: box.style.translate || '', px: 0 };
      if (this.lifted.px !== px){ this.lifted.px = px; box.classList.add('osk-lifted'); box.style.translate = `0 ${-px}px`; }
    }
  }
}
