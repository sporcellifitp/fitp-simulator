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
import { NatpfPhoneRacket } from './natpf_phone_racket.js';
import { STAND, gameStoreKey, isSlot, slotLabel, isStandSession, isStandKey } from '@natpf/tennis/stand-pairing.js';

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

// B41 (decisione dell'utente del 13/11): in fiera contro la CPU batte SEMPRE il visitatore, in tutti i game. Funzione pura
// per chi decide chi batte il game che comincia (la userà la pagina della fiera, B41.5): normal è chi batterebbe con le
// regole di sempre; in due (stesso schermo, due computer) e fuori dalla fiera restano le regole
export function fairServer({ fair = false, mode = 'cpu', normal = 'player' } = {}){
  return fair && mode === 'cpu' ? 'player' : normal;
}

// posto abbinato su questo computer (salvato dal guardiano del posto, stand-pairing.createStandGate)
export function standPaired(slot, storage = typeof localStorage !== 'undefined' ? localStorage : null){
  try { const v = JSON.parse(storage?.getItem?.(gameStoreKey(slot)) || 'null'); return isStandSession(v?.session) && isStandKey(v?.key); } catch { return false; }
}

// Stato di un posto per il foglio dello staff e per il ledwall (funzione pura): parola breve, frase, batteria bassa
export const LOW_BATTERY = 20;
export function standSlotView({ slot = 'p1', on = false, paired = false, pairing = false, request = null, connected = false, ready = false, battery = null, charging = false } = {}){
  const label = slotLabel(slot);
  const low = Number.isFinite(battery) && battery < LOW_BATTERY && !charging;
  if (!on) return { slot, label, state: 'off', word: 'Modalità fiera spenta', low: false };
  if (request) return { slot, label, state: 'ask', word: `Un telefono chiede il posto · numero ${request.num}`, low: false };
  if (pairing) return { slot, label, state: 'pairing', word: 'Inquadra il QR con il telefono dello stand', low: false };
  if (!paired) return { slot, label, state: 'unpaired', word: `${label} da abbinare`, low: false };
  if (!connected) return { slot, label, state: 'lost', word: `${label} scollegato: si ricollega da solo, se no chiama lo staff`, low: false };
  if (!ready) return { slot, label, state: 'prep', word: `${label} collegato · sensori da attivare`, low };
  return { slot, label, state: 'ready', word: `${label} pronto ✓${Number.isFinite(battery) ? ` · batteria ${battery}%` : ''}`, low };
}

export class NatpfFiera {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    const m = readFairMode();
    this.on = m.on; this.forced = m.forced;
    if (this.on) this._apply();
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
  // «Conferma» del numero: SOLO con un clic o un tasto veri dello staff (ev.isTrusted: mai un clic fatto dal codice, dal
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
