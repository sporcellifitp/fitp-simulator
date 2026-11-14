// Foglio «Telefoni dello stand» (B41.4; progetto docs/b41/progetto-modalita-fiera.md §2.1 e §6; documento
// docs/b41/modalita-fiera-2.md). Si apre dal pannello dello stand (voce «Telefoni dello stand ›», o da sola accendendo la
// «Modalità fiera») e dalla pagina della fiera quando un telefono non è pronto. Tutto con il solo mouse dello staff:
//   · per il Telefono 1 (Player 1: contro la CPU e a sinistra) e il Telefono 2 (Player 2, a destra) lo stato in parole
//     (natpf_fiera.standSlotView), la batteria (Android: iPhone non la dà) e l'ultimo colpo letto (prova dello staff: un
//     dritto e un rovescio);
//   · «Abbina» (o «Abbina un altro telefono»): il QR dell'abbinamento compare solo qui, a foglio aperto e per un posto alla
//     volta (stand-pairing.js: 5 minuti, un uso); chiudendo il foglio non vale più;
//   · chi inquadra il QR non entra: compare il numero (lo stesso sul telefono) con «Rifiuta» e «Conferma»; «Conferma» vale
//     solo con un clic (o un tasto) veri sul computer (NatpfFiera.confirm vuole ev.isTrusted), mai dal telecomando dello
//     staff (data-no-remote: il telecomando non lo raggiunge né lo preme, natpf_remote.NO_REMOTE);
//   · «Scollega» in due clic (natpf_confirm.TwoStep): il posto perde indirizzo e chiave, quel telefono non trova più il gioco.
// Il foglio è dello staff come il pannello: la partita resta ferma finché è aperto (natpf_ui.staffOpen), Esc lo chiude
// (natpf_lobby._key), il chiosco aspetta (natpf_kiosk.check). «‹ Pannello» (o Esc, o Indietro del telecomando) torna al
// pannello dello stand.
import { batteryText, strokeOfDir } from './natpf_fiera.js';
import { TwoStep } from './natpf_confirm.js';

const NATPF_BASE = '/natpf/';
const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const SLOTS = ['p1', 'p2'];
// quanto resta scritto l'ultimo colpo letto nella scheda
export const LAST_SWING_MS = 6000;

// Che cosa mostra la scheda di un posto (funzione pura). v: standSlotView (con url del QR); pairing: questo posto è quello
// con il QR aperto qui; swing: { dir, at } dell'ultimo colpo (dir con il segno corretto), hand: mano del telefono
// → { view, word, batt, qr, num, actions: [...] , swing }
// closed: perché l'ultimo QR di questo posto non vale più ('expired' 5 minuti, 'attempts' troppi tentativi sbagliati)
export const CLOSED_TEXT = Object.freeze({ expired: 'Tempo scaduto (5 minuti): «Abbina» per un QR nuovo', attempts: 'Troppi tentativi sbagliati: «Abbina» per un QR nuovo' });
export function sheetSlotView(v, { pairing = false, swing = null, hand = 'right', now = 0, closed = null } = {}){
  const st = v?.state || 'off';
  const paired = st === 'lost' || st === 'prep' || st === 'ready';
  const ask = st === 'ask', open = st === 'pairing' && pairing;
  const actions = ask ? ['refuse', 'confirm'] : open ? ['cancel'] : st === 'off' ? [] : paired ? ['pair', 'forget'] : ['pair'];
  const sw = swing && now - swing.at < LAST_SWING_MS && st === 'ready' ? strokeOfDir(swing.dir, hand) : '';
  return {
    view: ask ? 'ask' : open ? 'qr' : st,
    word: v?.word || '',
    note: !ask && !open && CLOSED_TEXT[closed] ? CLOSED_TEXT[closed] : '',
    batt: batteryText(v),
    low: !!v?.low,
    qr: open && v?.url ? v.url : null,
    num: ask ? String(v.word.match(/(\d+)\s*$/)?.[1] || '') : '',
    actions,
    pairLabel: paired ? 'Abbina un altro telefono' : 'Abbina',
    swing: sw ? `Ultimo colpo letto: ${sw}` : st === 'ready' ? 'Prova: fai un dritto e un rovescio con il telefono' : '',
  };
}

export class NatpfFieraSheet {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.el = $('natpf-fiera');
    this.el?.classList?.add?.('hidden');       // (chiuso all'avvio, anche dove la pagina non lo dice)
    this.pairing = null;                       // posto con il QR aperto in questo foglio
    this.swing = { p1: null, p2: null };       // ultimo colpo letto per posto
    this._bound = new WeakSet(); this._timer = null; this._keys = {};
    // «Scollega»: primo clic arma («Sicuro? Clicca ancora»), il secondo scollega (niente finestre di Windows)
    this.confirm2 = new TwoStep({ onChange: on => { if (!on) this.paint(); } });
    this.el?.addEventListener?.('pointerdown', e => e.stopPropagation());
    this.el?.addEventListener?.('click', e => {
      const b = e.target?.closest?.('[data-fiera-act]'); if (!b) return;
      e.stopPropagation();
      this.act(b.dataset.fieraAct, b.dataset.slot, e, b);
    });
  }
  get isOpen(){ return !!this.el && !this.el.classList.contains('hidden'); }
  get F(){ return this.ui.fiera; }
  // dal pannello dello stand (o dalla pagina della fiera); la partita si ferma come con il pannello
  open(){
    if (!this.el) return false;
    this.ui.kiosk?.close?.();
    show(this.el, true);
    this._libs();
    this.paint();
    this.ui._syncPause?.();
    clearInterval(this._timer); this._timer = setInterval(() => { try { this.paint(); } catch (e){ console.error(e); } }, 300);
    this.el.querySelector?.('[data-fiera-act="close"]')?.focus?.({ preventScroll: true });
    this.ui.diag?.recorder?.log?.('stand.telefoni', { aperto: true });
    return true;
  }
  // chiuso (anche dal chiosco, dal menu del telecomando…): il QR non vale più da subito, chi chiedeva è rifiutato.
  // toStaff: si torna al pannello dello stand
  close({ toStaff = true } = {}){
    if (!this.isOpen) return;
    clearInterval(this._timer); this._timer = null;
    this.confirm2.disarm();
    this._stopPairing();
    show(this.el, false);
    if (toStaff) this.ui.kiosk?.open?.();
    this.ui._syncPause?.();
  }
  _stopPairing(){ const s = this.pairing; this.pairing = null; if (s) this.F?.closePairing?.(s); }
  // il generatore di QR (lo carica anche la racchetta; qui per sicurezza, come il telecomando dello staff)
  _libs(){
    if (typeof window === 'undefined' || window.qrcode || this._libsP || typeof document?.createElement !== 'function') return;
    this._libsP = new Promise(r => { const s = document.createElement('script'); s.src = `${NATPF_BASE}js/vendor/qrcode.js`; s.onload = () => { r(); this.paint(); }; s.onerror = () => { this._libsP = null; r(); }; document.head?.appendChild?.(s); });
  }
  // colpi dei telefoni dello stand (prova dello staff): l'ultimo per posto, con il verso già corretto
  _watch(){
    for (const slot of SLOTS){
      const p = this.F?.phone?.(slot, { make: false });
      if (!p || this._bound.has(p)) continue;
      this._bound.add(p);
      p.onSwing?.((ev, s) => { if (!ev?.ignored && p.standSlot === slot && (s?.dir === 1 || s?.dir === -1)) this.swing[slot] = { dir: s.dir, at: performance.now() }; });
    }
  }
  async act(cmd, slot, e, btn){
    const F = this.F; if (!F) return false;
    if (cmd !== 'forget') this.confirm2.disarm();
    if (cmd === 'close'){ this.close(); return true; }
    if (!SLOTS.includes(slot)) return false;
    if (cmd === 'pair'){
      // un posto alla volta: il QR dell'altro si chiude
      if (this.pairing && this.pairing !== slot) F.closePairing(this.pairing);
      this.pairing = slot; this._opening = slot;
      this.swing[slot] = null;
      let ok = false;
      try { ok = await F.openPairing(slot); } finally { if (this._opening === slot) this._opening = null; }
      if (!ok && this.pairing === slot) this.pairing = null;
      this.paint();
      return ok;
    }
    if (cmd === 'cancel'){ if (this.pairing === slot) this._stopPairing(); this.paint(); return true; }
    // «Conferma»: solo un clic o un tasto veri (NatpfFiera.confirm controlla isTrusted). Il posto è abbinato: il QR si chiude
    if (cmd === 'confirm'){
      const ok = F.confirm(slot, e);
      if (ok){ if (this.pairing === slot) this.pairing = null; this.ui.toast?.(`${slot === 'p2' ? 'Telefono 2' : 'Telefono 1'} abbinato: ora sul telefono «Attiva i sensori»`); }
      this.paint();
      return ok;
    }
    if (cmd === 'refuse'){ F.refuse(slot); this.paint(); return true; }
    if (cmd === 'forget'){
      // (i clic veri vogliono il secondo clic, come le voci del pannello; dal codice e dal telecomando subito)
      if (e?.isTrusted && !this.confirm2.click(btn, `forget:${slot}`)) return false;
      if (this.pairing === slot) this.pairing = null;
      const ok = F.forget(slot);
      if (ok) this.ui.toast?.(`${slot === 'p2' ? 'Telefono 2' : 'Telefono 1'} scollegato: per riaverlo serve un abbinamento nuovo`);
      this.paint();
      return ok;
    }
    return false;
  }
  paint(now = performance.now()){
    const el = this.el; if (!el || !this.isOpen) return;
    this._watch();
    const F = this.F;
    // il QR chiuso da sé (5 minuti, troppi tentativi, telefono confermato): niente più posto in abbinamento
    // (non mentre si apre: il collegamento del posto parte e solo dopo dice «in abbinamento»)
    if (this.pairing && this._opening !== this.pairing && !['pairing', 'ask'].includes(F?.status?.(this.pairing)?.state)) this.pairing = null;
    for (const slot of SLOTS){
      const card = el.querySelector?.(`[data-fiera-slot="${slot}"]`); if (!card) continue;
      const p = F?.phone?.(slot, { make: false });
      const v = sheetSlotView(F?.status?.(slot), { pairing: this.pairing === slot, swing: this.swing[slot], hand: p?.hand || 'right', now, closed: p?.link?.L?.stand?.closedWhy || null });
      if (card.dataset) card.dataset.view = v.view;
      card.classList?.toggle?.('low', v.low);
      const set = (sel, t) => { const n = card.querySelector?.(sel); if (n && n.textContent !== t) n.textContent = t; return n; };
      set('[data-fiera="word"]', v.word);
      show(set('[data-fiera="note"]', v.note), !!v.note);
      show(set('[data-fiera="batt"]', v.batt), !!v.batt);
      show(set('[data-fiera="swing"]', v.swing), !!v.swing);
      show(set('[data-fiera="num"]', v.num), !!v.num);
      show(card.querySelector?.('[data-fiera="ask"]'), v.view === 'ask');
      // QR solo a foglio aperto e solo per il posto in abbinamento; fuori da lì si toglie dalla pagina
      const box = card.querySelector?.('[data-fiera="qr"]');
      if (box){
        show(box, !!v.qr);
        if (!v.qr){ if (box.dataset.url){ box.innerHTML = ''; box.dataset.url = ''; } }
        else if (window.qrcode && box.dataset.url !== v.qr){ const q = window.qrcode(0, 'M'); q.addData(v.qr); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); box.dataset.url = v.qr; }
      }
      for (const b of card.querySelectorAll?.('[data-fiera-act]') || []){
        const on = v.actions.includes(b.dataset.fieraAct);
        show(b, on);
        if (b.dataset.fieraAct === 'pair' && on && !this.confirm2.isArmed()){ const t = v.pairLabel; if (b.textContent !== t) b.textContent = t; }
      }
    }
  }
}
