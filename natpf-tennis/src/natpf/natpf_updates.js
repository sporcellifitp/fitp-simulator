// Aggiornamenti del programma Windows dentro il gioco (richiesta del 07/11/2026: «un unico installer che poi deve
// potersi aggiornare direttamente dal gioco»). Solo nel programma Windows: il preload di Electron
// (natpf-desktop/src/preload.cjs, ponte versione 2) espone
//   window.natpfDesktop.updates = { state(), check(), download(), install(), onChange(cb) }
// con lo stato S = { status, current, latest?, notes?, size?, progress?, error?, checkedAt? }:
//   status 'off' (non configurati o programma fuori dall'installazione) · 'idle' · 'checking' · 'none' · 'available' ·
//   'downloading' · 'ready' · 'installing' · 'error'. Il gioco nel browser (Cloudflare) non ha natpfDesktop: niente di
//   quello che segue compare.
// Due posti:
//   • avviso discreto sotto la pagina del menu (#natpf-update, tra la pagina e la barra in basso: non copre i pulsanti),
//     solo nel menu principale (NOTICE_STEPS), mai in campo (partita, Allenamento, minigiochi, calibrazione): uno stato
//     che arriva durante la partita aspetta il ritorno al menu. Uno solo anche nello stesso schermo (è nel menu, non nelle
//     due metà). «Più tardi» lo nasconde per quella versione fino alla chiusura. Non compare a chi è entrato come ospite
//     nella partita 1v1 di un altro computer (engine.playerRole 'p2'): lì il menu serve solo a tornare alla partita, e
//     resta così fino al ricaricamento del gioco (la sezione in Opzioni c'è comunque);
//   • Opzioni → «Aggiornamenti» (#natpf-updates-opt): versione installata, ultima verifica, stato in parole e pulsanti.
// Il download lo fa il programma (processo principale): continua anche in partita; «Riavvia e aggiorna» avvia
// l'installer scaricato (Windows chiede il consenso) e il programma si chiude; l'installer riapre il gioco aggiornato.
// Testi e scelte sono funzioni pure (noticeView, optionsView, noticeAllowed), provate in test/natpf-aggiornamenti.test.mjs.

export const UPDATE_STATUSES = ['off', 'idle', 'checking', 'none', 'available', 'downloading', 'ready', 'installing', 'error'];
// pagine del menu dove l'avviso può comparire: solo il menu principale. L'avviso sta nel flusso tra la pagina e la barra
// in basso e toglie altezza alla pagina: nel menu principale le voci ci stanno a tutte le misure (1280×720, 1920×1080,
// 1024×600, ledwall 720×720), mentre in «Scegli la modalità», «Minigiochi», «Classifica» e «Risultato» (liste lunghe)
// alcune voci finirebbero sotto il bordo (revisione del 07/11). Non in «Racchetta», «Collega» e «Partita» (si prepara
// una partita: QR e passi del telefono) né in «Opzioni» (c'è la sezione)
export const NOTICE_STEPS = ['menu'];

const clamp01 = v => Math.max(0, Math.min(1, Number(v) || 0));
// stato valido (quello che manda il programma, o niente): uno stato sconosciuto vale «non configurati»
export function normalizeState(s){
  const S = s && typeof s === 'object' ? s : {};
  const status = UPDATE_STATUSES.includes(S.status) ? S.status : 'off';
  return { ...S, status, current: String(S.current || ''), latest: S.latest ? String(S.latest) : '' };
}
// byte → «124,9 MB» (MB da 1 000 000 di byte, virgola italiana)
export function mb(bytes){
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${(n / 1e6).toFixed(1).replace('.', ',')} MB`;
}
export const percent = p => Math.round(clamp01(p) * 100);
// «52,4 di 124,9 MB» durante il download (vuoto senza la dimensione)
export function downloadedText(S){
  const size = Number(S?.size);
  if (!Number.isFinite(size) || size <= 0) return '';
  return `${(clamp01(S.progress) * size / 1e6).toFixed(1).replace('.', ',')} di ${mb(size)}`;
}
const two = n => String(n).padStart(2, '0');
// ultima verifica in parole: «mai», «oggi alle 10:42», «ieri alle 18:05», «05/11 alle 09:30»
export function checkedText(ts, now = Date.now()){
  const t = Number(ts);
  if (!Number.isFinite(t) || t <= 0) return 'mai';
  const d = new Date(t), n = new Date(now), hm = `${two(d.getHours())}:${two(d.getMinutes())}`;
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(n) - day(d)) / 86400000);
  if (diff === 0) return `oggi alle ${hm}`;
  if (diff === 1) return `ieri alle ${hm}`;
  return `${two(d.getDate())}/${two(d.getMonth() + 1)} alle ${hm}`;
}
export const READY_NOTE = 'Windows chiederà il consenso per installarlo, poi il gioco si riapre da solo.';
export const OFF_NOTE = 'Aggiornamenti non configurati: il programma non è installato con l’installer oppure manca l’indirizzo degli aggiornamenti.';
// stato in parole (Opzioni e avviso)
export function statusText(s){
  const S = normalizeState(s), size = mb(S.size);
  switch (S.status){
    case 'off': return 'Aggiornamenti non configurati';
    case 'idle': return 'Non ancora cercati';
    case 'checking': return 'Ricerca in corso…';
    case 'none': return 'Sei aggiornato';
    case 'available': return `Disponibile: ${S.latest || 'nuova versione'}${size ? ` · ${size}` : ''}`;
    case 'downloading': { const d = downloadedText(S); return `Download ${percent(S.progress)}%${d ? ` · ${d}` : ''}`; }
    case 'ready': return `Pronto: ${S.latest || 'nuova versione'}`;
    case 'installing': return 'Avvio dell’installazione…';
    case 'error': return `Errore: ${S.error || 'aggiornamento non riuscito'}`;
  }
  return '';
}
// Avviso nel menu: null se non c'è niente da dire. engaged: chi gioca ha già toccato l'avviso in questa sessione (solo
// allora un errore compare anche qui: un errore della verifica all'avvio, senza rete allo stand, non disturba il menu)
//   { kind, key, title, sub, progress (0..1 o null), buttons: [{ act, label, primary }] }
export function noticeView(s, { engaged = false } = {}){
  const S = normalizeState(s), v = S.latest || 'nuova versione', size = mb(S.size);
  if (S.status === 'available') return { kind: 'available', key: `available:${S.latest}`, title: `Aggiornamento disponibile · ${v}`,
    sub: size ? `${size} da scaricare: intanto puoi continuare a giocare.` : 'Si scarica mentre continui a giocare.', progress: null,
    buttons: [{ act: 'download', label: 'Aggiorna', primary: true }, { act: 'later', label: 'Più tardi' }] };
  if (S.status === 'downloading'){ const d = downloadedText(S); return { kind: 'downloading', key: `downloading:${S.latest}`, title: `Download dell’aggiornamento · ${v}`,
    sub: `${percent(S.progress)}%${d ? ` · ${d}` : ''}`, progress: clamp01(S.progress), buttons: [{ act: 'later', label: 'Nascondi' }] }; }
  if (S.status === 'ready') return { kind: 'ready', key: `ready:${S.latest}`, title: `Aggiornamento pronto · ${v}`, sub: READY_NOTE, progress: null,
    buttons: [{ act: 'install', label: 'Riavvia e aggiorna', primary: true }, { act: 'later', label: 'Più tardi' }] };
  if (S.status === 'installing') return { kind: 'installing', key: `installing:${S.latest}`, title: 'Avvio dell’installazione…', sub: 'Il gioco si chiude e si riapre aggiornato.', progress: null, buttons: [] };
  if (S.status === 'error' && engaged) return { kind: 'error', key: `error:${S.error || ''}`, title: 'Aggiornamento non riuscito', sub: S.error || 'Riprova tra poco.', progress: null,
    buttons: [{ act: 'check', label: 'Riprova', primary: true }, { act: 'later', label: 'Chiudi' }] };
  return null;
}
// Opzioni → «Aggiornamenti»: stato, riga con versione installata e ultima verifica, avanzamento, note e pulsanti
// Prima della prima risposta del programma (S.pending): «Lettura dello stato…», niente pulsanti né note (non «non configurati»)
export function optionsView(s, now = Date.now()){
  if (s?.pending) return { status: 'pending', state: 'Lettura dello stato…', meta: s.current ? `Versione installata ${s.current}` : '', note: '', progress: null, buttons: [] };
  const S = normalizeState(s);
  const meta = S.status === 'off' ? (S.current ? `Versione ${S.current}` : '') : `Versione installata ${S.current || '?'} · ultima verifica ${checkedText(S.checkedAt, now)}`;
  let buttons = [], note = '';
  const check = (disabled = false) => ({ act: 'check', label: 'Cerca aggiornamenti', disabled });
  switch (S.status){
    case 'off': note = OFF_NOTE; break;
    case 'idle': case 'none': case 'error': buttons = [check()]; break;
    case 'checking': buttons = [check(true)]; break;
    case 'available': buttons = [{ act: 'download', label: 'Aggiorna', primary: true }, check()]; note = S.notes || ''; break;
    case 'downloading': note = S.notes || ''; break;
    case 'ready': buttons = [{ act: 'install', label: 'Riavvia e aggiorna', primary: true }]; note = [S.notes, READY_NOTE].filter(Boolean).join(' · '); break;
    case 'installing': note = 'Il gioco si chiude e si riapre aggiornato.'; break;
  }
  return { status: S.status, state: statusText(S), meta, note, progress: S.status === 'downloading' ? clamp01(S.progress) : null, buttons };
}
// L'avviso può comparire adesso? Solo con il menu in vista, in una delle NOTICE_STEPS, e niente in campo o sopra il menu
export function noticeAllowed({ lobbyVisible = false, step = '', training = false, events = false, calibra = false, intro = false, guide = false, guest = false } = {}){
  return !!lobbyVisible && NOTICE_STEPS.includes(step) && !training && !events && !calibra && !intro && !guide && !guest;
}
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ICON = '<svg class="upd-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 19h16"/></svg>';
function buttonsHtml(list, cls){
  return list.map(b => `<button type="button" class="${cls(b)}" data-update-act="${b.act}"${b.disabled ? ' disabled' : ''}>${esc(b.label)}</button>`).join('');
}

export class NatpfUpdates {
  // ui: NatpfUi (lobby, training, events, calibra, intro, onboarding, toast). api: window.natpfDesktop.updates
  constructor(ui, { api = (typeof window !== 'undefined' ? window.natpfDesktop?.updates : null), doc = (typeof document !== 'undefined' ? document : null), now = () => Date.now() } = {}){
    this.ui = ui; this.doc = doc; this.now = now;
    this.api = api && typeof api.state === 'function' ? api : null;
    this.S = { ...normalizeState(null), pending: true };   // finché il programma non risponde: né «non configurati» né avviso
    this._heard = false;             // è già arrivato uno stato con onChange (più recente della risposta di state())
    this._unsub = null;              // funzione di onChange per togliersi (il ponte vive quanto la pagina: tenuta per close())
    this.dismissed = new Set();      // avvisi chiusi con «Più tardi» (per stato e versione) fino alla chiusura del programma
    this.engaged = false;            // chi gioca ha toccato l'avviso: un errore dopo si mostra anche lì (fino al prossimo
                                     // stato «buono», none/available/ready: un errore di una ricerca più tarda non disturba)
    this._noticeKey = null; this._optKey = null;
    if (!this.api) return;           // gioco nel browser: niente avviso né sezione
    const $ = id => doc?.getElementById?.(id);
    this.noticeEl = $('natpf-update');
    this.optEl = $('natpf-updates-opt');
    this.optEl?.classList?.remove('hidden');
    doc?.documentElement?.classList?.add('natpf-updates');
    // descrizione della voce «Opzioni» nel menu: nel programma ci sono anche gli aggiornamenti
    const opt = doc?.querySelector?.('[data-menu="options"]');
    if (opt?.dataset?.desc && !/aggiornamenti/i.test(opt.dataset.desc)) opt.dataset.desc = opt.dataset.desc.replace(/\.$/, ', aggiornamenti del programma.');
    const onClick = e => { const b = e.target?.closest?.('[data-update-act]'); if (!b || b.disabled) return; e.stopPropagation(); this.act(b.dataset.updateAct, { from: e.currentTarget === this.noticeEl ? 'notice' : 'options' }); };
    this.noticeEl?.addEventListener?.('click', onClick);
    this.optEl?.addEventListener?.('click', onClick);
    try { const off = this.api.onChange?.(s => { this._heard = true; this.apply(s); }); if (typeof off === 'function') this._unsub = off; } catch (e){ console.error(e); }
    this._start();
  }
  // stato all'avvio: la risposta di state() vale solo se nel frattempo non è arrivato niente con onChange (quello è più
  // recente); se lo stato è «idle» (mai cercati) il gioco chiede una ricerca, una volta sola
  async _start(){
    let s = null;
    try { s = await this.api.state(); } catch { s = null; }
    if (this._heard) return;
    if (s && typeof s === 'object' && 'status' in s) this.apply(s);
    else this.apply({ ...this.S, status: 'error', error: 'il programma non risponde' });
    if (this.S.status === 'idle') this._call('check');
  }
  // smette di ascoltare il programma (non serve nel gioco: il ponte vive quanto la pagina)
  close(){ try { this._unsub?.(); } catch {} this._unsub = null; }
  get enabled(){ return !!this.api; }
  // stato nuovo dal programma (onChange o risposta di una chiamata)
  apply(s){
    if (!s || typeof s !== 'object') return;
    const { pending: _pending, ...S } = normalizeState(s);   // una risposta vera chiude l'attesa iniziale
    this.S = S;
    if (['none', 'available', 'ready'].includes(this.S.status)) this.engaged = false;
    this.paint();
  }
  async _call(name){
    try {
      const s = await this.api[name]();
      if (s && typeof s === 'object' && 'status' in s) this.apply(s);
      return s;
    } catch (e){
      this.apply({ ...this.S, status: 'error', error: name === 'download' ? 'download non riuscito' : 'il programma non risponde' });
      return null;
    }
  }
  // pulsanti dell'avviso e delle Opzioni: download, install, check, later
  async act(name, { from = 'notice' } = {}){
    if (!this.api) return null;
    if (from === 'notice') this.engaged = true;
    if (name === 'later'){ const v = noticeView(this.S, { engaged: this.engaged }); if (v) this.dismissed.add(v.key); this.paint({ refocus: true }); return null; }
    if (name === 'check'){ if (this.S.status === 'error') this.dismissed.clear(); return this._call('check'); }
    if (name === 'download'){ if (this.S.status !== 'available') return null; return this._call('download'); }
    if (name === 'install'){
      if (this.S.status !== 'ready') return null;
      const before = this.S;
      this.apply({ ...before, status: 'installing' });
      let r = null;
      try { r = await this.api.install(); } catch { r = { ok: false, error: 'non riesco ad avviare l’installazione' }; }
      if (!r?.ok){
        const err = r?.error || 'non riesco ad avviare l’installazione';
        this.apply({ ...before, status: 'error', error: err });
        this.ui?.toast?.(`Aggiornamento: ${err}`);
      }
      return r;
    }
    return null;
  }
  // l'avviso può comparire adesso (menu in vista, pagina di scelta, niente in campo)?
  allowed(){
    const ui = this.ui || {}, L = ui.lobby;
    return noticeAllowed({ lobbyVisible: !!L?.visible, step: L?.step, training: !!ui.training?.active, events: !!ui.events?.active,
      calibra: !!ui.calibra?.isOpen, intro: !!ui.intro?.active, guide: !!ui.onboarding?.isOpen, guest: ui.engine?.playerRole === 'p2' });
  }
  // avviso da mostrare adesso (null: nascosto)
  notice(){
    if (!this.api || !this.allowed()) return null;
    const v = noticeView(this.S, { engaged: this.engaged });
    return v && !this.dismissed.has(v.key) ? v : null;
  }
  // pulsanti dell'avviso in vista (la lobby li aggiunge alle voci scelte con le frecce)
  noticeButtons(){
    if (!this.noticeEl || this.noticeEl.classList?.contains('hidden')) return [];
    return [...(this.noticeEl.querySelectorAll?.('[data-update-act]') || [])];
  }
  paint({ refocus = false } = {}){
    if (!this.api) return;
    this._paintNotice(refocus);
    if (this.ui?.lobby?.step === 'options' || this._optKey === null) this._paintOptions();
  }
  _paintNotice(refocus){
    const el = this.noticeEl; if (!el) return;
    const v = this.notice(), doc = this.doc;
    const had = !!doc?.activeElement && typeof el.contains === 'function' && el.contains(doc.activeElement);
    el.classList.toggle('hidden', !v);
    if (!v){ this._noticeKey = null; if (had || refocus) this._focusMenu(); return; }
    el.dataset.kind = v.kind;
    const key = v.kind + '|' + v.title + '|' + v.buttons.map(b => b.act + b.label).join(',');
    if (this._noticeKey !== key){
      this._noticeKey = key;
      // l'avviso è una regione «polite»: si annunciano titolo e pulsanti quando cambia lo stato, non ogni percentuale del
      // download (il sottotitolo che avanza è aria-live off; la percentuale si legge dalla barra, role progressbar)
      const bar = v.progress != null ? '<span class="upd-bar" data-upd-bar role="progressbar" aria-label="Download dell’aggiornamento" aria-valuemin="0" aria-valuemax="100"><i></i></span>' : '';
      el.innerHTML = `${ICON}<div class="upd-text"><b data-upd-title>${esc(v.title)}</b><span data-upd-sub${v.progress != null ? ' aria-live="off"' : ''}>${esc(v.sub)}</span>${bar}</div>`
        + (v.buttons.length ? `<div class="upd-actions">${buttonsHtml(v.buttons, b => (b.primary ? 'lobby-primary' : 'lobby-ghost') + ' upd-btn')}</div>` : '');
      if (had) el.querySelector?.('[data-update-act]')?.focus?.({ preventScroll: true });
    }
    const sub = el.querySelector?.('[data-upd-sub]'); if (sub && sub.textContent !== v.sub) sub.textContent = v.sub;
    if (v.progress != null){ const b = el.querySelector?.('[data-upd-bar]'); b?.style?.setProperty?.('--p', `${(v.progress * 100).toFixed(1)}%`); b?.setAttribute?.('aria-valuenow', String(percent(v.progress))); }
    el.setAttribute?.('aria-label', v.title);
  }
  _focusMenu(){
    const L = this.ui?.lobby; if (!L?.visible) return;
    const t = L._tiles?.() || [];
    (t.find(x => x.classList?.contains('selected')) || t[0])?.focus?.({ preventScroll: true });
  }
  _paintOptions(){
    const el = this.optEl; if (!el) return;
    const v = optionsView(this.S, this.now());
    const q = s => el.querySelector?.(s);
    const set = (s, t) => { const e = q(s); if (e && e.textContent !== t) e.textContent = t; };
    el.dataset.status = v.status;
    // durante il download lo stato in parole cambia a ogni percentuale: niente annuncio continuo (si legge dalla barra)
    q('[data-upd-state]')?.setAttribute?.('aria-live', v.status === 'downloading' ? 'off' : 'polite');
    set('[data-upd-state]', v.state); set('[data-upd-meta]', v.meta); set('[data-upd-note]', v.note);
    const bar = q('[data-upd-bar]');
    if (bar){ bar.classList.toggle('hidden', v.progress == null); if (v.progress != null){ bar.style?.setProperty?.('--p', `${(v.progress * 100).toFixed(1)}%`); bar.setAttribute?.('aria-valuenow', String(percent(v.progress))); } }
    const key = v.buttons.map(b => b.act + b.label + (b.disabled ? '0' : '1')).join(',');
    const box = q('[data-upd-btns]');
    if (box && this._optKey !== key){
      const doc = this.doc, had = !!doc?.activeElement && typeof box.contains === 'function' && box.contains(doc.activeElement), was = doc?.activeElement?.dataset?.updateAct;
      this._optKey = key;
      box.innerHTML = buttonsHtml(v.buttons, b => 'seg-btn' + (b.primary ? ' seg-fs' : ''));
      box.classList?.toggle?.('hidden', !v.buttons.length);
      // il fuoco resta sul pulsante di prima se c'è ancora, altrimenti sul primo (frecce e Invio come con un joypad)
      if (had){ const b = box.querySelector?.(`[data-update-act="${was}"]:not([disabled])`) || box.querySelector?.('[data-update-act]:not([disabled])'); if (b) b.focus?.({ preventScroll: true }); else this._focusMenu(); }
    }
  }
}
