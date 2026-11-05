// Schermo (28/10): dove si disegna il gioco. Di solito tutta la finestra del browser; per un ledwall un'area con le sue
// proporzioni, perché il PC esce a 16:9 ma il ledwall no:
//   • «Ledwall 2×2» (cabinet quadrati) → area 1:1 al centro dello schermo del PC;
//   • «Ledwall 3×2» → area 3:2 al centro;
//   • ?area=x,y,larghezza,altezza nell'indirizzo → area esatta in pixel, per il processore LED che prende una zona
//     precisa dell'uscita del PC (di solito in alto a sinistra): vince sulla scelta del menu;
//   • ?schermo=intero|16:9|16:10|4:3|3:2|1:1 (anche 2x2, 3x2) nell'indirizzo → come la scelta del menu, senza salvarla.
// Tutto il gioco (camera, interfaccia, menu) sta nell'area: il body diventa il riquadro dell'area (con transform, così
// anche gli elementi «position: fixed» restano dentro) e fuori resta nero. viewport() dà la misura da usare al posto di
// window.innerWidth/innerHeight (motore, HUD, minigiochi).
//
// Schermo intero senza cornici (B8, 04/11: «in tutte le versioni modalità full screen senza cornici»): NatpfFullscreen.
//   • senza cornici = finestra del programma Windows a schermo intero (window.natpfDesktop, Electron), oppure schermo
//     intero della pagina (document.fullscreenElement), oppure il browser in F11 / Edge --start-fullscreen
//     (display-mode: fullscreen);
//   • nel programma Windows si usa solo window.natpfDesktop: lo schermo intero HTML lì si mangerebbe il primo Esc;
//   • nel browser requestFullscreen() sul documento, chiamato subito dentro il gesto di chi gioca, poi
//     navigator.keyboard.lock(['Escape']): un Esc breve resta «indietro» del gioco, tenerlo premuto esce;
//   • in F11 la pagina non può uscire da sola: si dice «Premi F11»;
//   • al primo input (tasto, clic, tocco) sulla schermata «Premi un tasto per iniziare», o sul menu con ?intro=0, si
//     entra da soli (preferenza 'natpf-tennis.fullscreen' = auto | off, Opzioni → Schermo; ?fs=0 la spegne; con
//     navigator.webdriver, cioè nelle prove automatiche, solo con ?fs=1).
//
// Calibrazione dello schermo (B8, 05/11: «adatta il fullscreen in base alla finestra/monitor in utilizzo o prevedi la
// calibrazione a full screen, come avviene per i videogiochi»): natpf_calibra.js. L'area si descrive con
//   • un formato: Intero (riempie il monitor), 16:9, 16:10, 4:3, 3:2 (Ledwall 3×2), 1:1 (Ledwall 2×2);
//   • i bordi visibili: quanto togliere da ogni lato {t, r, b, l} in percentuale della finestra (0-45, passo 0,5), per
//     il monitor o il ledwall che taglia i bordi e per il processore LED che prende un angolo dell'uscita del PC.
// L'area è la finestra meno i bordi, poi il riquadro del formato al centro di quello che resta. Ordine: ?area= nell'indirizzo
// (vince su tutto) > ?schermo= nell'indirizzo (i bordi salvati valgono lo stesso) > calibrazione salvata
// ('natpf-tennis.screen.cal', JSON {v:1, preset, margins}) > scelta salvata del menu ('natpf-tennis.screen', di prima).
import { keepScreenAwake } from './natpf_wake_lock.js';
export const SCREEN_KEY = 'natpf-tennis.screen';
export const CAL_KEY = 'natpf-tennis.screen.cal';
// formati: id (anche quelli di prima full/2x2/3x2), nome breve (calibrazione) e nome lungo, proporzione (null = intero)
export const SCREENS = Object.freeze({
  full: { label: 'Schermo intero', short: 'Intero', ratio: null },
  '16x9': { label: '16:9', short: '16:9', ratio: 16/9 },
  '16x10': { label: '16:10', short: '16:10', ratio: 16/10 },
  '4x3': { label: '4:3', short: '4:3', ratio: 4/3 },
  '3x2': { label: 'Ledwall 3×2', short: '3:2', ratio: 3/2 },
  '2x2': { label: 'Ledwall 2×2', short: '1:1', ratio: 1 },
});
// ordine dei formati nella calibrazione (tasti 1-6)
export const FORMATS = Object.freeze(['full', '16x9', '16x10', '4x3', '3x2', '2x2']);
const SCREEN_ALIAS = { intero: 'full', '16:9': '16x9', '16:10': '16x10', '4:3': '4x3', '3:2': '3x2', '1:1': '2x2', '1x1': '2x2' };
export const normalizeScreen = id => {
  const k = SCREEN_ALIAS[String(id ?? '').trim().toLowerCase()] ?? id;
  return typeof k === 'string' && Object.hasOwn(SCREENS, k) ? k : 'full';
};
// bordi visibili: percentuali della finestra per lato, 0-45 a passi di 0,5 (resta sempre almeno il 10% per lato)
export const MARGIN_MAX = 45;
export const NO_MARGINS = Object.freeze({ t: 0, r: 0, b: 0, l: 0 });
export function normalizeMargins(m){
  const out = {};
  for (const k of ['t', 'r', 'b', 'l']){
    const n = Number(m?.[k]);
    out[k] = Number.isFinite(n) ? Math.round(Math.min(MARGIN_MAX, Math.max(0, n))*2)/2 : 0;
  }
  return out;
}
export const hasMargins = m => { const n = normalizeMargins(m); return n.t + n.r + n.b + n.l > 0; };

// «x,y,w,h» in pixel interi (larghezza e altezza almeno 64): null se non è un'area valida
export function parseArea(text){
  const m = /^\s*(\d+)\s*[,x;]\s*(\d+)\s*[,x;]\s*(\d+)\s*[,x;]\s*(\d+)\s*$/.exec(String(text ?? ''));
  if (!m) return null;
  const [x, y, w, h] = m.slice(1).map(Number);
  return w >= 64 && h >= 64 ? { x, y, w, h } : null;
}
// Area in uso dentro una finestra winW × winH (pixel CSS, interi): ?area= esatta; altrimenti la finestra meno i bordi e
// dentro il riquadro del formato, al centro. full: l'area è tutta la finestra
export function screenArea({ preset = 'full', area = null, margins = null } = {}, winW = 1280, winH = 720){
  if (area){
    const x = Math.min(Math.max(0, area.x), winW - 64), y = Math.min(Math.max(0, area.y), winH - 64);
    return { x, y, w: Math.min(area.w, winW - x), h: Math.min(area.h, winH - y), full: false };
  }
  const m = normalizeMargins(margins);
  const x0 = Math.round(winW*m.l/100), y0 = Math.round(winH*m.t/100);
  const iw = Math.max(1, winW - x0 - Math.round(winW*m.r/100)), ih = Math.max(1, winH - y0 - Math.round(winH*m.b/100));
  const ratio = SCREENS[normalizeScreen(preset)].ratio;
  let x = x0, y = y0, w = iw, h = ih;
  if (ratio){
    w = Math.round(Math.min(iw, ih*ratio)); h = Math.min(ih, Math.round(w/ratio));
    x = x0 + Math.round((iw - w)/2); y = y0 + Math.round((ih - h)/2);
  }
  return { x, y, w, h, full: x === 0 && y === 0 && w === winW && h === winH };
}
// riassunto per Opzioni → Schermo: «Calibrato: formato 4:3 · bordi ↑ 0 · → 0 · ↓ 5 · ← 5 %»
export function screenSummary({ preset = 'full', margins = null } = {}){
  const f = SCREENS[normalizeScreen(preset)], m = normalizeMargins(margins), n = v => String(v).replace('.', ',');
  const parts = [`formato ${f.ratio ? f.short : 'intero'}`];
  if (hasMargins(m)) parts.push(`bordi ↑ ${n(m.t)} · → ${n(m.r)} · ↓ ${n(m.b)} · ← ${n(m.l)} %`);
  return `Calibrato: ${parts.join(' · ')}`;
}
// calibrazione salvata (testo JSON o oggetto): null se manca o non è valida
export function parseCal(v){
  let o = v;
  if (typeof v === 'string'){ try { o = JSON.parse(v); } catch { return null; } }
  if (!o || typeof o !== 'object' || o.v !== 1) return null;
  return { v: 1, preset: normalizeScreen(o.preset), margins: normalizeMargins(o.margins) };
}
export const calText = ({ preset, margins } = {}) => JSON.stringify({ v: 1, preset: normalizeScreen(preset), margins: normalizeMargins(margins) });
// scelta dall'indirizzo e dal browser. Ordine: ?area= > ?schermo= (con i bordi salvati) > calibrazione > scelta di prima.
// L'indirizzo non si salva. source: 'area' | 'url' | 'cal' | 'saved' | 'default'
export function readScreen(search = '', saved = null, cal = null){
  const q = new URLSearchParams(search);
  const area = parseArea(q.get('area'));
  const fromUrl = q.get('schermo');
  const c = parseCal(cal);
  const margins = c ? c.margins : { ...NO_MARGINS };
  const preset = fromUrl != null ? normalizeScreen(fromUrl) : c ? c.preset : normalizeScreen(saved);
  const source = area ? 'area' : fromUrl != null ? 'url' : c ? 'cal' : saved != null ? 'saved' : 'default';
  return { preset, area, margins, fromUrl: fromUrl != null || !!area, source };
}

let current = { preset: 'full', area: null, margins: { ...NO_MARGINS } };
const win = () => ({ w: globalThis.innerWidth || 1280, h: globalThis.innerHeight || 720 });
// misura dell'area in cui si disegna (finestra intera o area del ledwall)
export function viewport(){ const { w, h } = win(); return screenArea(current, w, h); }

/* ---------- schermo intero senza cornici ---------- */
export const FS_KEY = 'natpf-tennis.fullscreen';
export const FS_TEXT = Object.freeze({
  enter: 'Schermo intero',
  exit: 'Esci da schermo intero',
  f11: 'Premi F11 per uscire dallo schermo intero',
  fail: 'Usa F11 o il comando Schermo intero del browser.',
});
// preferenza all'avvio: 'auto' (predefinita, schermo intero al primo input) o 'off' (resta in finestra)
export const fsPref = v => (v === 'off' ? 'off' : 'auto');
// tasti che per il browser non sono un gesto di chi gioca (Esc e i modificatori da soli: il browser rifiuterebbe lo
// schermo intero) o che non devono aprirlo (Tab, F11 e F12 sono del browser)
const NO_GESTURE_KEYS = new Set(['Escape', 'Esc', 'Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'Super', 'Hyper', 'CapsLock', 'Fn', 'FnLock', 'NumLock', 'ScrollLock', 'Tab', 'F11', 'F12']);
// eventi che ascolta l'apertura automatica (finestra, in cattura): il primo tasto, il clic del mouse (pointerdown) e il
// tocco o la penna (pointerup, perché il browser concede lo schermo intero solo alla fine del tocco); il click resta
// come riserva
export const AUTO_EVENTS = Object.freeze(['keydown', 'pointerdown', 'pointerup', 'click']);
// comandi dello schermo intero (pulsanti, voce della pausa, scelta all'avvio): l'apertura automatica non li anticipa
const FS_CONTROLS = '#lobby-fullscreen, #natpf-fullscreen, [data-pause="fullscreen"], [data-natpf-fs]';
// L'input è un gesto con cui il browser concede lo schermo intero?
export function fullscreenGesture(e){
  // eventi creati dal codice (el.click() del menu all'avvio): non sono un gesto, il browser rifiuterebbe
  if (!e || e.isTrusted === false) return false;
  if (e.type === 'keydown'){
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return false;
    return !NO_GESTURE_KEYS.has(e.key) && e.code !== 'Escape';
  }
  if (e.type === 'pointerdown') return e.pointerType === 'mouse';
  if (e.type === 'pointerup') return e.pointerType === 'touch' || e.pointerType === 'pen';
  return e.type === 'click';
}
// Si apre da soli lo schermo intero al primo input? Mai se è già senza cornici, nel programma Windows (parte già a
// schermo intero), con la preferenza «Finestra» o ?fs=0; nelle prove automatiche (navigator.webdriver) solo con ?fs=1
export function autoFullscreen({ search = '', pref = 'auto', webdriver = false, desktop = false, frameless = false } = {}){
  const fs = new URLSearchParams(search).get('fs');
  if (fs === '0' || desktop || frameless || fsPref(pref) === 'off') return false;
  return !webdriver || fs === '1';
}
const safeStorage = {
  getItem(k){ try { return globalThis.localStorage?.getItem(k) ?? null; } catch { return null; } },
  setItem(k, v){ try { globalThis.localStorage?.setItem(k, v); } catch {} },
};

export class NatpfFullscreen {
  // win, doc, nav e storage sostituibili nelle prove; onChange quando cambia lo stato, onHint per i messaggi
  constructor({ win = globalThis, doc = globalThis.document, nav = globalThis.navigator, storage = safeStorage, onChange = null, onHint = null } = {}){
    Object.assign(this, { win, doc, nav, storage, onChange, onHint });
    this.pending = null; this.armed = false; this.failures = 0;
    const d = this.desktop;
    // programma Windows: la finestra parte a schermo intero; isFullScreen() e onFullScreenChange() tengono lo stato
    this.desktopOn = !!d;
    if (d){
      try { d.onFullScreenChange?.(on => { this.desktopOn = !!on; this._changed(); }); } catch {}
      try { Promise.resolve(d.isFullScreen?.()).then(on => { if (typeof on === 'boolean'){ this.desktopOn = on; this._changed(); } }, () => {}); } catch {}
    }
    doc?.addEventListener?.('fullscreenchange', () => { if (!this.element) this._unlock(); this._changed(); });
    try { this._mq()?.addEventListener?.('change', () => this._changed()); } catch {}
  }
  get desktop(){ return this.win?.natpfDesktop || null; }
  _mq(){ try { return this.win?.matchMedia?.('(display-mode: fullscreen)') || null; } catch { return null; } }
  // schermo intero della pagina (requestFullscreen)
  get element(){ return !!this.doc?.fullscreenElement; }
  // browser a schermo intero da sé: F11, Edge/Chrome con --start-fullscreen
  get browserMode(){ return !!this._mq()?.matches; }
  // senza cornici: finestra del programma a schermo intero, pagina a schermo intero o browser in F11. Nel programma
  // Windows vale lo stato della finestra (isFullScreen/onFullScreenChange), non display-mode, che può arrivare in ritardo
  get frameless(){ return this.desktop ? (this.desktopOn || this.element) : (this.element || this.browserMode); }
  get label(){ return this.frameless ? FS_TEXT.exit : FS_TEXT.enter; }
  get pref(){ let v = null; try { v = this.storage?.getItem(FS_KEY); } catch {} return fsPref(v); }
  set pref(v){ try { this.storage?.setItem(FS_KEY, fsPref(v)); } catch {} this._changed(); }
  get autoAllowed(){
    return autoFullscreen({ search: this.win?.location?.search || '', pref: this.pref, webdriver: !!this.nav?.webdriver, desktop: !!this.desktop, frameless: this.frameless });
  }
  // Entra a schermo intero. Va chiamata dentro il gesto di chi gioca (tasto, clic, tocco): requestFullscreen parte
  // subito, prima di qualunque attesa. Promise<boolean>: true se ora è senza cornici
  enter({ auto = false } = {}){
    if (this.pending) return this.pending;
    const d = this.desktop;
    if (d) return this._track(Promise.resolve(d.setFullScreen?.(true)).then(on => { this.desktopOn = on !== false; this._changed(); return this.desktopOn; }, () => false));
    const el = this.doc?.documentElement;
    if (!el?.requestFullscreen){
      if (auto) this.disarm(); else this._hint(FS_TEXT.fail);
      return Promise.resolve(false);
    }
    let p;
    try { p = el.requestFullscreen(); } catch (err){ p = Promise.reject(err); }
    return this._track(Promise.resolve(p).then(() => { this._lock(); this.disarm(); this._changed(); return true; },
      () => { if (!auto) this._hint(FS_TEXT.fail); this._changed(); return false; }));
  }
  // Esce dallo schermo intero; in F11 la pagina non può: lo dice («Premi F11»). Promise<boolean>: true se è uscita
  exit(){
    if (this.pending) return this.pending;
    const d = this.desktop;
    if (d) return this._track(Promise.resolve(d.setFullScreen?.(false)).then(on => { this.desktopOn = on === true; this._changed(); return !this.desktopOn; }, () => false));
    if (this.element){
      this._unlock();
      let p;
      try { p = this.doc.exitFullscreen?.(); } catch (err){ p = Promise.reject(err); }
      return this._track(Promise.resolve(p).then(() => { this._changed(); return true; }, () => { this._changed(); return false; }));
    }
    if (this.browserMode){ this._hint(FS_TEXT.f11); return Promise.resolve(false); }
    return Promise.resolve(true);
  }
  // tasto F, pulsanti e pausa. Una richiesta già in corso (lo stesso tasto che l'ha aperta in automatico) non si ripete
  toggle(){ return this.pending || (this.frameless ? this.exit() : this.enter()); }
  // apertura automatica al primo input: in cattura sulla finestra, prima del menu (che ferma i tasti) e dell'intro;
  // non ferma e non annulla niente. Si spegne al primo successo
  armAuto(){
    if (this.armed || !this.win?.addEventListener) return false;
    const s = autoFullscreen({ search: this.win.location?.search || '', pref: this.pref, webdriver: !!this.nav?.webdriver, desktop: !!this.desktop, frameless: this.frameless });
    if (!s) return false;
    this.armed = true; this._auto = e => this._autoInput(e);
    for (const t of AUTO_EVENTS) this.win.addEventListener(t, this._auto, true);
    return true;
  }
  disarm(){
    if (!this.armed) return;
    this.armed = false;
    for (const t of AUTO_EVENTS) this.win.removeEventListener?.(t, this._auto, true);
  }
  _autoInput(e){
    if (!this.armed || this.pending || !fullscreenGesture(e)) return;
    // i comandi dello schermo intero fanno da sé: il pulsante non va aperto e richiuso, «Finestra» non va contraddetta
    if (e.target?.closest?.(FS_CONTROLS)) return;
    if (this.frameless){ this.disarm(); return; }
    if (!this.autoAllowed) return;
    // rifiutato (permessi, browser): si riprova al prossimo input, al massimo tre volte
    this.enter({ auto: true }).then(ok => { if (!ok && ++this.failures >= 3) this.disarm(); });
  }
  _track(p){ const t = this.pending = p.finally(() => { if (this.pending === t) this.pending = null; }); return t; }
  // Esc al gioco: un Esc breve arriva alla pagina, tenuto premuto esce dallo schermo intero (Chrome/Edge, https)
  _lock(){ try { this.nav?.keyboard?.lock?.(['Escape'])?.catch?.(() => {}); } catch {} }
  _unlock(){ try { this.nav?.keyboard?.unlock?.(); } catch {} }
  _hint(t){ try { this.onHint?.(t); } catch {} }
  _changed(){ if (this.armed && this.frameless && !this.pending) this.disarm(); try { this.onChange?.(this); } catch (e){ console.error(e); } }
}

export class NatpfScreen {
  constructor(engine){
    this.engine = engine;
    this.releaseWakeLock = keepScreenAwake();
    let saved = null, cal = null; try { saved = localStorage.getItem(SCREEN_KEY); cal = localStorage.getItem(CAL_KEY); } catch {}
    const search = globalThis.location?.search || '', s = readScreen(search, saved, cal);
    // indirizzo: ?area= e ?schermo= valgono a ogni avvio (la calibrazione lo dice)
    this.fromUrl = s.fromUrl; this.source = s.source;
    this.urlArea = s.area; this.urlScreen = new URLSearchParams(search).get('schermo') != null ? s.preset : null;
    current = { preset: s.preset, area: s.area, margins: s.margins };
    this.onHint = null;            // messaggi per chi gioca (natpf_ui: toast)
    this.listeners = new Set();    // chi ridisegna quando l'area cambia (calibrazione)
    // schermo intero: creato prima del menu (natpf_ui), così l'apertura automatica vede il primo tasto prima che il menu
    // lo fermi
    this.fullscreen = new NatpfFullscreen({ onChange: () => { this.paintFullscreen(); this.apply(); }, onHint: t => this._hint(t) });
    this.fullscreen.armAuto();
    globalThis.addEventListener?.('resize', () => this.apply());
    // pulsanti: in alto nel menu (accanto a «Come si gioca») e in Opzioni → Schermo; la pausa ha la sua voce
    for (const id of ['lobby-fullscreen', 'natpf-fullscreen']){
      globalThis.document?.getElementById?.(id)?.addEventListener('click', e => { e.stopPropagation(); this.fullscreen.toggle(); });
    }
    this.apply();
    this.paintFullscreen();
  }
  get preset(){ return current.preset; }
  get area(){ return current.area; }
  get margins(){ return { ...current.margins }; }
  // calibrato: bordi tolti o un formato che il menu non ha (16:9, 16:10, 4:3)
  get calibrated(){ return !current.area && (hasMargins(current.margins) || !['full', '2x2', '3x2'].includes(current.preset)); }
  // scelta del menu (Opzioni → Schermo): si salva (i bordi calibrati restano); un'area dall'indirizzo resta finché non
  // si sceglie altro
  set(preset){
    current = { preset: normalizeScreen(preset), area: null, margins: { ...current.margins } };
    this._save();
    this.apply();
  }
  // calibrazione (natpf_calibra.js): anteprima dal vivo senza salvare, salvataggio, ritorno allo stato di prima
  snapshot(){ return { preset: current.preset, area: current.area ? { ...current.area } : null, margins: { ...current.margins } }; }
  preview({ preset = current.preset, margins = current.margins } = {}){
    current = { preset: normalizeScreen(preset), area: null, margins: normalizeMargins(margins) };
    this.apply();
  }
  save(cal = {}){ this.preview(cal); this._save(); }
  restore(snap){
    if (!snap) return;
    current = { preset: normalizeScreen(snap.preset), area: snap.area ? { ...snap.area } : null, margins: normalizeMargins(snap.margins) };
    this.apply();
  }
  _save(){
    try {
      localStorage.setItem(SCREEN_KEY, current.preset);          // per chi legge ancora la scelta di prima
      localStorage.setItem(CAL_KEY, calText(current));
    } catch {}
  }
  // numeri per la calibrazione: finestra, densità dei pixel, monitor, area (pixel CSS; i pixel veri sono × dpr)
  info(){
    const g = globalThis, { w, h } = win(), dpr = Number(g.devicePixelRatio) || 1;
    return { win: { w, h }, dpr, screen: { w: g.screen?.width || w, h: g.screen?.height || h }, area: viewport(), preset: current.preset, margins: { ...current.margins }, urlArea: !!current.area };
  }
  onApply(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); }
  apply(){
    const doc = globalThis.document?.documentElement, a = viewport();
    if (doc){
      doc.classList.toggle('natpf-area', !a.full);
      for (const [k, v] of Object.entries({ x: a.x, y: a.y, w: a.w, h: a.h })) doc.style?.setProperty?.(`--area-${k}`, `${v}px`);
      doc.dataset.screen = current.area ? 'area' : current.preset;
      doc.classList.toggle('natpf-frameless', this.fullscreen?.frameless ?? false);
    }
    this.engine?._onResize?.();
    for (const fn of this.listeners || []){ try { fn(a); } catch (e){ console.error(e); } }
  }
  // stato dello schermo intero su tutti i comandi: testo («Schermo intero» / «Esci da schermo intero»), aria-pressed,
  // preferenza all'avvio
  paintFullscreen(){
    const d = globalThis.document, fs = this.fullscreen; if (!d || !fs) return;
    const on = fs.frameless, label = fs.label;
    for (const id of ['lobby-fullscreen', 'natpf-fullscreen']){
      const b = d.getElementById?.(id); if (!b) continue;
      const t = b.querySelector?.('.fs-label') || b;
      if (t.textContent !== label) t.textContent = label;
      b.setAttribute?.('aria-pressed', String(on)); b.classList?.toggle('on', on);
      b.title = `${label} (F)`; b.setAttribute?.('aria-label', label);
    }
    const pb = d.querySelector?.('[data-pause="fullscreen"]');
    if (pb){ const b = pb.querySelector('b'); if (b && b.textContent !== label) b.textContent = label; pb.classList.toggle('on', on); }
    const pref = fs.pref;
    for (const b of d.querySelectorAll?.('[data-natpf-fs]') || []){ const sel = b.dataset.natpfFs === pref; b.classList.toggle('selected', sel); b.setAttribute('aria-checked', String(sel)); }
    if (on){ const st = d.getElementById?.('natpf-fullscreen-status'); if (st && st.textContent) st.textContent = ''; }
  }
  _hint(t){
    const st = globalThis.document?.getElementById?.('natpf-fullscreen-status');
    if (st) st.textContent = t;
    try { this.onHint?.(t); } catch {}
  }
}
