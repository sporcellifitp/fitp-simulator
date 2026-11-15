// Modalità fiera, prima parte (B41.1–B41.2; progetto in docs/b41/progetto-modalita-fiera.md). Richiesta dell'utente del
// 13/11: «durante l'evento fiera i telefoni sono sempre gli stessi, quindi è inutile ogni volta collegare il telefono,
// scansionare un QR code e fare la calibrazione: io seleziono solo il livello di difficoltà, i telefoni sono già pronti».
//
// Con la modalità fiera accesa i due telefoni dello stand hanno un posto fisso: Telefono 1 = il telefono di sempre
// (ui.phone: Player 1, contro la CPU e a sinistra), Telefono 2 = engine.natpfPhone2 (Player 2, a destra nello stesso
// schermo). Un posto abbinato una volta (stand-pairing.js: QR solo a foglio aperto, conferma dello staff, chiave salvata,
// ripresa con la prova HMAC) si ascolta subito all'avvio, all'indirizzo fisso: niente QR a ogni ricarica del gioco o
// riavvio del programma, e il chiosco non lo scollega più (natpf_kiosk.js). Un posto non abbinato resta la racchetta di
// sempre, con il QR.
// Qui solo le funzioni che useranno il foglio «Telefoni dello stand» e l'interruttore del pannello (B41.4) e la pagina
// della fiera (B41.5): opzione salvata, stato dei posti, abbinamento, conferma, «Scollega». Per le prove la modalità si
// accende anche dall'indirizzo: ?stand=fiera (?stand=normale la spegne per quella pagina; ?formato=fiera è un'altra
// cosa, il formato veloce: natpf_fair_format.js).
// B41.4–B41.5 (seconda parte, docs/b41/modalita-fiera-2.md): qui anche le funzioni pure dell'interruttore del pannello, del
// foglio «Telefoni dello stand» (natpf_fiera_sheet.js), dell'avviso della batteria e dei visitatori numerati; la pagina
// della fiera è in natpf_fiera_page.js, «Prossimo giocatore» in natpf_new_player.resetFairVisitor.
import { NatpfPhoneRacket } from './natpf_phone_racket.js';
import { STAND, gameStoreKey, isSlot, slotLabel, isStandSession, isStandKey } from '@natpf/tennis/stand-pairing.js';
import { dayKey } from './natpf_events.js';
import { readSavedCalMode, writeCalMode, calModeFromUrl, CAL_MODES } from './natpf_trial_learn.js';

export const FAIR_MODE_KEY = 'natpf-tennis.fiera';
// Modalità fiera da indirizzo e salvataggio (funzione pura): l'indirizzo vince (prove), poi la scelta salvata; di base spenta
export function fairModeFrom({ search = '', saved = null } = {}){
  const m = /[?&]stand=([a-z]+)/i.exec(String(search || ''));
  const v = m ? m[1].toLowerCase() : null;
  if (v === 'fiera') return { on: true, forced: true };
  if (v === 'normale' || v === 'no') return { on: false, forced: true };
  return { on: saved === '1' || saved === 1 || saved === true, forced: false };
}
export function readFairMode(){
  let saved = null; try { saved = localStorage.getItem(FAIR_MODE_KEY); } catch {}
  return fairModeFrom({ search: typeof location !== 'undefined' ? location.search : '', saved });
}
export function writeFairMode(on){ try { localStorage.setItem(FAIR_MODE_KEY, on ? '1' : '0'); } catch {} }

/* ---------- B41.3 · revisione della B41 seconda parte, difetti 5 e 6 ---------- */
// Accesa dal pannello, la modalità fiera porta la «Calibrazione» su «Giocando» (natpf_kiosk) e la pagina della fiera mette
// «Con cosa giochi: Smartphone» (natpf_fiera_page.enter); spenta, tornava il menu di sempre ma con quelle due scelte. Si
// ricordano i valori di prima (salvati: la modalità fiera dura giorni e il programma si riapre) e si rimettono allo
// spegnimento. Funzioni pure qui, l'uso in natpf_kiosk.run('fiera')
export const FAIR_BEFORE_KEY = 'natpf-tennis.fiera.prima';
const CONTROLLER_IDS = Object.freeze(['phone', 'webcam', 'mouse']);
// valori di prima ripuliti (funzione pura): { controller, cal } con quelli validi, null se non c'è niente
export function fairBeforeOf(v){
  if (!v || typeof v !== 'object') return null;
  const controller = CONTROLLER_IDS.includes(v.controller) ? v.controller : null, cal = CAL_MODES.includes(v.cal) ? v.cal : null;
  return controller || cal ? { controller, cal } : null;
}
export function readFairBefore(){ try { return fairBeforeOf(JSON.parse(localStorage.getItem(FAIR_BEFORE_KEY) || 'null')); } catch { return null; } }
export function writeFairBefore(v){ try { const b = fairBeforeOf(v); if (b) localStorage.setItem(FAIR_BEFORE_KEY, JSON.stringify(b)); else localStorage.removeItem(FAIR_BEFORE_KEY); } catch {} }
// Difetto 6: con la modalità fiera la calibrazione resta «Giocando» (ogni visitatore fa i suoi scambi di prova): la voce
// del pannello lo dice e un clic non la cambia. Prima un clic la portava a «Con i gesti», il telefono dello stand partiva con
// la calibrazione a gesti e la pagina della fiera diceva «sul telefono «Attiva i sensori»», che non era vero
export const FAIR_CAL_BUTTON = 'Giocando (fiera)';
export const FAIR_CAL_TEXT = 'Con la modalità fiera la calibrazione resta «Giocando»: ogni visitatore fa i suoi scambi di prova (circa 10 secondi). Per cambiarla spegni prima la modalità fiera.';

// B41 (decisione dell'utente del 13/11): in fiera contro la CPU batte SEMPRE il visitatore, in tutti i game. Funzione pura:
// normal è chi batterebbe con le regole di sempre; in due (stesso schermo, due computer) restano le regole. Dal B47 sta in
// natpf_battuta.js e la usa il punteggio (opzione dello stand «Battuta: Sempre lo stesso», di base, anche fuori dalla fiera)
export { fairServer } from './natpf_battuta.js';

// posto abbinato su questo computer (salvato dal guardiano del posto, stand-pairing.createStandGate)
export function standPaired(slot, storage = typeof localStorage !== 'undefined' ? localStorage : null){
  try { const v = JSON.parse(storage?.getItem?.(gameStoreKey(slot)) || 'null'); return isStandSession(v?.session) && isStandKey(v?.key); } catch { return false; }
}

// Stato di un posto per il foglio dello staff e per il ledwall (funzione pura): parola breve, frase, batteria bassa
// (B41.4: anche la batteria e se è in carica, per il foglio e per l'avviso sul ledwall)
export const LOW_BATTERY = 20;
export function standSlotView({ slot = 'p1', on = false, paired = false, pairing = false, request = null, connected = false, ready = false, battery = null, charging = false } = {}){
  const label = slotLabel(slot), batt = Number.isFinite(battery) ? battery : null, charge = !!charging && batt != null;
  const low = batt != null && batt < LOW_BATTERY && !charging;
  const base = { slot, label, battery: batt, charging: charge };
  if (!on) return { ...base, state: 'off', word: 'Modalità fiera spenta', low: false };
  if (request) return { ...base, state: 'ask', word: `Un telefono chiede il posto · numero ${request.num}`, low: false };
  if (pairing) return { ...base, state: 'pairing', word: 'Inquadra il QR con il telefono dello stand', low: false };
  if (!paired) return { ...base, state: 'unpaired', word: `${label} da abbinare`, low: false };
  if (!connected) return { ...base, state: 'lost', word: `${label} scollegato: si ricollega da solo, se no chiama lo staff`, low: false };
  if (!ready) return { ...base, state: 'prep', word: `${label} collegato · sensori da attivare`, low };
  return { ...base, state: 'ready', word: `${label} pronto ✓${batt != null ? ` · batteria ${batt}%` : ''}`, low };
}

/* ---------- B41.4 · pannello dello stand, foglio «Telefoni dello stand», avviso della batteria (funzioni pure) ---------- */
// voce del pannello «Modalità fiera: No · Sì» (forced: ?stand=… nell'indirizzo, vale per la pagina e non si salva)
export const fairPanelButton = (on, forced = false) => `${on ? 'Sì' : 'No'}${forced ? ' (indirizzo)' : ''}`;
// (restored, B41.3: «Con cosa giochi» e «Calibrazione» rimesse come prima della fiera, per esempio «Webcam · Nessuna»)
export function fairPanelToast(on, { forced = false, calSet = false, restored = '' } = {}){
  if (forced) return `Modalità fiera ${on ? 'accesa' : 'spenta'} solo per questa pagina: comanda l’indirizzo (?stand=…), la scelta salvata non cambia`;
  return on ? `Modalità fiera accesa: la pagina della fiera prende il posto del menu e i telefoni dello stand restano collegati${calSet ? '. «Calibrazione» messa su «Giocando»: ogni visitatore fa i suoi scambi di prova' : ''}. Resta salvata`
    : `Modalità fiera spenta: torna il menu di sempre, i telefoni con il QR${restored ? `; «Con cosa giochi» e «Calibrazione» come prima della fiera (${restored})` : ''}. Resta salvata`;
}
// batteria nella scheda del posto: '' se il telefono non la dà (iPhone) o non è collegato
export function batteryText(v){
  if (!v || v.battery == null || !['prep', 'ready'].includes(v.state)) return '';
  return `Batteria ${v.battery}%${v.charging ? ' · in carica' : v.low ? ' · bassa: mettilo in carica' : ''}`;
}
// Avviso sul ledwall (funzione pura): i telefoni dello stand collegati con la batteria sotto LOW_BATTERY e non in carica
// (standSlotView.low). '' se non c'è niente da dire
export function batteryAlert(views = []){
  const low = views.filter(v => v && v.low && v.battery != null);
  if (!low.length) return '';
  return `${low.map(v => `${v.label}: batteria ${v.battery}%`).join(' · ')} · ${low.length > 1 ? 'mettili' : 'mettilo'} in carica`;
}

/* ---------- B41.5 · visitatori numerati («Visitatore 12», da capo ogni giorno) ---------- */
export const VISITOR_KEY = 'natpf-tennis.fiera.visitatori';
export const visitorName = n => `Visitatore ${n}`;
// contatore del giorno (funzione pura): saved { day, n } → { n: il numero del prossimo visitatore, saved: il contatore
// nuovo }. Un giorno diverso riparte da 1
export function nextVisitor(saved, day){
  const n = saved && saved.day === day && Number.isInteger(saved.n) && saved.n > 0 ? saved.n : 0;
  return { n: n + 1, saved: { day, n: n + 1 } };
}
// il numero che avrebbe il prossimo visitatore, senza contarlo
export const peekVisitor = (saved, day) => nextVisitor(saved, day).n;

// B41.5: pagina della fiera con 1 giocatore (contro la CPU, Telefono 1) o 2 (stesso schermo, Telefono 1 e 2): la scelta
// dello staff resta salvata (vale anche per i visitatori dopo)
export const FAIR_PLAY_KEY = 'natpf-tennis.fiera.gioco';
export const fairPlayOf = v => (v === 'split' ? 'split' : 'cpu');

export class NatpfFiera {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    const m = readFairMode();
    this.on = m.on; this.forced = m.forced;
    // B41.5: numero del visitatore di adesso (null finché non gioca la prima partita contro la CPU) e avviso della batteria
    this.visitor = null; this.alertText = ''; this._alertAt = 0; this._lowLogged = { p1: false, p2: false };
    let play = null; try { play = localStorage.getItem(FAIR_PLAY_KEY); } catch {}
    this.play = fairPlayOf(play);
    // B41.3 (difetto 6): già accesa all'avvio (per esempio dalla console, nella prima parte) con un'altra calibrazione
    // salvata: «Giocando», e quella di prima si ricorda per lo spegnimento
    if (this.on && !this.forced) this.ensurePlay();
    if (this.on) this._apply();
  }
  // B41.3: la calibrazione «Giocando» della modalità fiera (non con ?cal=… nell'indirizzo, che comanda le prove). true se
  // è cambiata
  ensurePlay(){
    if (calModeFromUrl() || readSavedCalMode() === 'play') return false;
    if (!readFairBefore()) writeFairBefore({ controller: this.ui?.controller ?? null, cal: readSavedCalMode() });
    writeCalMode('play');
    return true;
  }
  // 1 o 2 giocatori nella pagina della fiera ('cpu' | 'split'), salvato
  setPlay(v){ this.play = fairPlayOf(v); try { localStorage.setItem(FAIR_PLAY_KEY, this.play); } catch {} return this.play; }
  /* ---------- visitatori numerati (B41.5) ---------- */
  _visitors(){ try { return JSON.parse(localStorage.getItem(VISITOR_KEY) || 'null'); } catch { return null; } }
  // nome del visitatore di adesso, o di quello che arriva (senza contarlo)
  visitorLabel(){ return visitorName(this.visitor ?? peekVisitor(this._visitors(), dayKey())); }
  // il visitatore comincia la sua prima partita contro la CPU: prende il numero del giorno (una volta sola)
  claimVisitor(){
    if (this.visitor != null) return this.visitor;
    const r = nextVisitor(this._visitors(), dayKey());
    try { localStorage.setItem(VISITOR_KEY, JSON.stringify(r.saved)); } catch {}
    this.visitor = r.n;
    this.ui.diag?.recorder?.log?.('stand.visitatore', { numero: r.n });
    return r.n;
  }
  // «Prossimo giocatore» e chiosco: chi arriva prende il numero dopo, quando gioca
  releaseVisitor(){ this.visitor = null; }
  /* ---------- avviso della batteria sul ledwall (B41.4) ---------- */
  // ogni 100 ms (natpf_ui), ridipinto al più una volta al secondo: telefoni dello stand collegati con la batteria sotto il 20%
  // e non in carica. Una riga per telefono nel registro della diagnostica quando la batteria diventa bassa.
  // Si vede solo sulla pagina della fiera, tra un visitatore e l'altro: è lì che lo staff può mettere in carica il telefono
  // (in partita il telefono è in mano a chi gioca). Sulla fine partita copriva il consiglio «Prossima volta prova il livello
  // …» (1280×720, 1024×600, 1920×540) e stava anche sopra l'intro, gli scambi di prova e il campo; lasciando la pagina
  // sparisce subito (controllo a ogni giro, non una volta al secondo). Lo stato della batteria resta nel foglio «Telefoni
  // dello stand» e nel registro
  tick(now = performance.now()){
    const el = typeof document !== 'undefined' ? document.getElementById('natpf-fiera-alert') : null;
    const here = !!this.ui.fieraPage?.here;
    if (el && !here && !el.classList.contains('hidden')) el.classList.add('hidden');
    if (now - this._alertAt < 1000) return;
    this._alertAt = now;
    const views = this.on ? STAND.slots.map(s => this.status(s)) : [];
    for (const v of views){ if (v.low && !this._lowLogged[v.slot]) this.ui.diag?.recorder?.log?.('stand.batteria', { posto: v.slot, batteria: v.battery }); this._lowLogged[v.slot] = !!v.low; }
    const t = batteryAlert(views);
    this.alertText = t;
    if (!el) return;
    if (el.textContent !== t) el.textContent = t;
    el.classList.toggle('hidden', !t || !here);
    // (sulla pagina della fiera in un'area stretta, 720×720: in basso a sinistra coprirebbe «Telefono: tocca «Sono
    // pronto»» sopra «Gioca»; lì va a destra, accanto a «Gioca»: natpf-ui.css)
    el.classList.toggle('on-page', here);
  }
  // telefono di un posto (il Telefono 2 nasce qui con la modalità accesa: prima solo con lo stesso schermo)
  phone(slot, { make = true } = {}){
    if (slot === 'p2'){
      const E = this.engine;
      if (!E.natpfPhone2 && make) E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
      return E.natpfPhone2 || null;
    }
    return this.ui.phone;
  }
  paired(slot){ return standPaired(slot); }
  // accesa o spenta (salvata; con ?stand=… nell'indirizzo vale l'indirizzo per questa pagina)
  setOn(v){
    const on = !!v;
    if (!this.forced) writeFairMode(on);
    if (on === this.on) return on;
    this.on = on; this._apply();
    this.ui.diag?.recorder?.log?.('stand.fiera', { acceso: on });
    return on;
  }
  // ogni posto abbinato diventa il telefono dello stand (in ascolto subito); spenta, tornano racchette normali
  _apply(){
    for (const slot of STAND.slots){
      const paired = this.paired(slot), p = this.phone(slot, { make: this.on && paired });
      if (!p) continue;
      const want = this.on && (paired || p.link?.L?.stand?.pairing) ? slot : null;
      if ((p.standSlot || null) !== want || want) p.useStand?.(want)?.catch?.(err => console.error(err));
    }
  }
  // stato di un posto (per il foglio dello staff e per il ledwall)
  status(slot){
    const p = this.phone(slot, { make: false }), L = p?.link?.L || {}, st = L.stand || {};
    const v = standSlotView({ slot, on: this.on, paired: this.paired(slot), pairing: !!st.pairing, request: st.request || null, connected: !!p?.connected && !!p?.standSlot, ready: !!p?.ready && !!p?.standSlot, battery: Number.isFinite(L.battery) ? L.battery : null, charging: !!L.charging });
    return { ...v, url: p?.standPairingUrl || null };
  }
  // foglio «Telefoni dello stand» aperto per un posto: QR nuovo, valido 5 minuti e solo finché resta aperto
  async openPairing(slot){
    if (!this.on || !isSlot(slot)) return false;
    const p = this.phone(slot);
    await p.useStand(slot);
    return !!p.link?.standPairing?.(true);
  }
  closePairing(slot){ const p = this.phone(slot, { make: false }); if (!p?.standSlot) return false; p.link?.standPairing?.(false); if (!this.paired(slot)) p.useStand(null); return true; }
  // «Conferma» del numero: SOLO con un clic vero dello staff (ev.isTrusted: mai un clic fatto dal codice, dal
  // telecomando o da uno script). Il telefono che chiede diventa quello del posto, il telefono di prima no
  confirm(slot, ev){
    if (!ev || ev.isTrusted !== true) return false;
    const p = this.phone(slot, { make: false });
    const ok = !!p?.standSlot && !!p.link?.standConfirm?.();
    if (ok) this.ui.diag?.recorder?.log?.('stand.abbinato', { posto: slot });
    return ok;
  }
  refuse(slot){ const p = this.phone(slot, { make: false }); return !!p?.standSlot && !!p.link?.standRefuse?.(); }
  // «Scollega» il posto: il telefono di quel posto non trova più il gioco; per riaverlo serve un abbinamento nuovo
  forget(slot){
    const p = this.phone(slot, { make: false });
    if (!p?.standSlot) return false;
    p.link?.forget?.();
    p.useStand(null);
    this.ui.diag?.recorder?.log?.('stand.scollegato', { posto: slot });
    return true;
  }
}
