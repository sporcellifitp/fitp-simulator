// Schermo (28/10): dove si disegna il gioco. Di solito tutta la finestra del browser; per un ledwall un'area con le sue
// proporzioni, perché il PC esce a 16:9 ma il ledwall no:
//   • «Ledwall 2×2» (cabinet quadrati) → area 1:1 al centro dello schermo del PC;
//   • «Ledwall 3×2» → area 3:2 al centro;
//   • ?area=x,y,larghezza,altezza nell'indirizzo → area esatta in pixel, per il processore LED che prende una zona
//     precisa dell'uscita del PC (di solito in alto a sinistra): vince sulla scelta del menu;
//   • ?schermo=intero|2x2|3x2 nell'indirizzo → come la scelta del menu, senza salvarla.
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
import { keepScreenAwake } from './natpf_wake_lock.js';
export const SCREEN_KEY = 'natpf-tennis.screen';
export const SCREENS = Object.freeze({
  full: { label: 'Schermo intero', ratio: null },
  '2x2': { label: 'Ledwall 2×2', ratio: 1 },
  '3x2': { label: 'Ledwall 3×2', ratio: 3/2 },
});
export const normalizeScreen = id => (Object.hasOwn(SCREENS, id) ? id : 'full');

// «x,y,w,h» in pixel interi (larghezza e altezza almeno 64): null se non è un'area valida
export function parseArea(text){
  const m = /^\s*(\d+)\s*[,x;]\s*(\d+)\s*[,x;]\s*(\d+)\s*[,x;]\s*(\d+)\s*$/.exec(String(text ?? ''));
  if (!m) return null;
  const [x, y, w, h] = m.slice(1).map(Number);
  return w >= 64 && h >= 64 ? { x, y, w, h } : null;
}
// Area in uso dentro una finestra winW × winH (pixel CSS, interi)
export function screenArea({ preset = 'full', area = null } = {}, winW = 1280, winH = 720){
  if (area){
    const x = Math.min(Math.max(0, area.x), winW - 64), y = Math.min(Math.max(0, area.y), winH - 64);
    return { x, y, w: Math.min(area.w, winW - x), h: Math.min(area.h, winH - y), full: false };
  }
  const ratio = SCREENS[normalizeScreen(preset)].ratio;
  if (!ratio) return { x: 0, y: 0, w: winW, h: winH, full: true };
  const w = Math.round(Math.min(winW, winH*ratio)), h = Math.round(w/ratio);
  return { x: Math.round((winW - w)/2), y: Math.round((winH - h)/2), w, h, full: false };
}
// scelta dall'indirizzo e dal browser: l'indirizzo vince (non si salva)
export function readScreen(search = '', saved = null){
  const q = new URLSearchParams(search);
  const area = parseArea(q.get('area'));
  const fromUrl = q.get('schermo');
  const preset = fromUrl != null ? normalizeScreen(fromUrl === 'intero' ? 'full' : fromUrl) : normalizeScreen(saved);
  return { preset, area, fromUrl: fromUrl != null || !!area };
}

let current = { preset: 'full', area: null };
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
    let saved = null; try { saved = localStorage.getItem(SCREEN_KEY); } catch {}
    const s = readScreen(globalThis.location?.search || '', saved);
    this.fromUrl = s.fromUrl;
    current = { preset: s.preset, area: s.area };
    this.onHint = null;            // messaggi per chi gioca (natpf_ui: toast)
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
  // scelta del menu (Opzioni → Schermo): si salva; un'area dall'indirizzo resta finché non si sceglie altro
  set(preset){
    current = { preset: normalizeScreen(preset), area: null };
    try { localStorage.setItem(SCREEN_KEY, current.preset); } catch {}
    this.apply();
  }
  apply(){
    const doc = globalThis.document?.documentElement, a = viewport();
    if (doc){
      doc.classList.toggle('natpf-area', !a.full);
      for (const [k, v] of Object.entries({ x: a.x, y: a.y, w: a.w, h: a.h })) doc.style?.setProperty?.(`--area-${k}`, `${v}px`);
      doc.dataset.screen = current.area ? 'area' : current.preset;
      doc.classList.toggle('natpf-frameless', this.fullscreen?.frameless ?? false);
    }
    this.engine?._onResize?.();
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
