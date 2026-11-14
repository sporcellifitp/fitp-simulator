// Pagina della fiera (B41.5; progetto docs/b41/progetto-modalita-fiera.md §4.1–§4.5; documento
// docs/b41/modalita-fiera-2.md). Con la «Modalità fiera» accesa prende il posto del menu principale: è la pagina «Pronto
// per la partita» (passo `match` della lobby, #title-modal[data-fair="1"]) in versione fiera, così motore, «Sono pronto»
// dei telefoni (natpf_ready_go.js), scambi di prova e telecomando dello staff la conoscono già. Tutto con il mouse:
//   · «1 giocatore · contro la CPU» o «2 giocatori · stesso schermo» (scelta dello staff, salvata: natpf_fiera.setPlay);
//   · contro la CPU «Chi gioca: Bambino · Ragazzo · Adulto» (le tessere di sempre) e la mano («Destra · Sinistra»);
//     nello stesso schermo per ciascuno la fascia (Bambino · Ragazzo · Adulto, natpf_duo_rules.js) e la mano;
//   · lo stato dei telefoni dello stand e, se uno non è pronto, il perché e «Telefoni dello stand ›» (mai un QR);
//   · il visitatore di adesso («Visitatore 12», da capo ogni giorno; «Nome» per scriverlo con la tastiera a schermo);
//   · «Gioca ›» (o «Sono pronto» sui telefoni) → scambi di prova di chi gioca (calibrazione «Giocando») → conto alla
//     rovescia grande (B47) → partita. Niente QR, niente tutorial, niente calibrazione con i gesti per i telefoni dello stand.
// Non ci sono «‹ Indietro», «Riscaldati prima», la barra dei passi e i ritratti: allenamento, minigiochi, sfida tra due
// computer e webcam si usano spegnendo la modalità fiera (il menu di sempre torna identico).
// A fine partita «Prossimo giocatore ›» (natpf_new_player.resetFairVisitor) e «Rivincita» (scelta del livello del B47).
import { batteryText } from './natpf_fiera.js';
import { resetFairVisitor } from './natpf_new_player.js';
import { BANDS, BAND_LABEL, bandOf } from './natpf_duo_rules.js';

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const PLAYERS = ['p1', 'p2'];

// Si può partire dalla pagina della fiera? (funzione pura) mode 'cpu' | 'split'; phones: { p1, p2 } con { label, paired
// (posto dello stand abbinato), connected, ready (pronto, o lo sarà tra un attimo), hidden (pagina del telefono nascosta) }
// → { ok, slot (il primo che manca), why }
export function fairGate({ mode = 'cpu', phones = {} } = {}){
  const need = mode === 'split' ? PLAYERS : ['p1'];
  for (const id of need){
    const p = phones[id] || {}, label = p.label || (id === 'p2' ? 'Telefono 2' : 'Telefono 1');
    if (!p.paired) return { ok: false, slot: id, why: `${label} da abbinare: «Telefoni dello stand ›»` };
    if (!p.connected) return { ok: false, slot: id, why: `${label} scollegato: si ricollega da solo (se non torna, «Telefoni dello stand ›»)` };
    if (p.hidden) return { ok: false, slot: id, why: `${label}: schermo del telefono spento, riaccendilo` };
    if (!p.ready) return { ok: false, slot: id, why: `${label}: sul telefono «Attiva i sensori»` };
  }
  return { ok: true, slot: null, why: '' };
}
// riga sotto la pagina (funzione pura): il perché quando non si può partire, altrimenti come si parte
export function fairNote({ mode = 'cpu', gate = { ok: true }, trial = true } = {}){
  if (!gate.ok) return gate.why;
  const start = mode === 'split' ? '«Sono pronto» su tutti e due i telefoni, oppure «Gioca»' : '«Sono pronto» sul telefono, oppure «Gioca»';
  return `${start}: ${trial ? 'qualche scambio di prova, poi ' : ''}il conto alla rovescia e la partita.`;
}
// chi gioca adesso, come lo dice la pagina (funzione pura): il nome scritto, «Ospite», o il numero del visitatore
export function visitorLine({ nickname = '', guest = false, label = '' } = {}){
  const n = String(nickname || '').trim();
  if (guest) return 'Ospite · fuori classifica';
  return n || label;
}

export class NatpfFieraPage {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    const page = typeof document !== 'undefined' ? document.querySelector?.('[data-page="match"]') : null;
    // (sulla pagina, prima della lobby: i pulsanti della fiera non sono «Chi gioca» né «Gioca»)
    page?.addEventListener?.('click', e => {
      const t = e.target;
      const m = t?.closest?.('[data-fiera-mode]'); if (m){ e.stopPropagation(); this.setPlay(m.dataset.fieraMode); return; }
      const b = t?.closest?.('[data-fiera-band]'); if (b){ e.stopPropagation(); const [id, band] = b.dataset.fieraBand.split(':'); this.ui.split?.setBand?.(id, band); this.ui.lobby?.paint?.(); return; }
      const h = t?.closest?.('[data-fiera-hand]'); if (h){ e.stopPropagation(); const [id, hand] = h.dataset.fieraHand.split(':'); this.ui.split?.setHand?.(id, hand); this.ui.lobby?.paint?.(); return; }
      if (t?.closest?.('[data-fiera-sheet]')){ e.stopPropagation(); this.ui.fieraSheet?.open?.(); return; }
      if (t?.closest?.('[data-fiera-name]')){ e.stopPropagation(); this.askName(); }
    });
  }
  get on(){ return !!this.ui.fiera?.on; }
  // la pagina della fiera è in vista
  get here(){ const L = this.ui.lobby; return this.on && !!L?.visible && L.step === 'match'; }
  get mode(){ return this.ui.fiera?.play === 'split' ? 'split' : 'cpu'; }
  // natpf_lobby.go('menu') con la modalità accesa: la modalità della pagina, sempre con i telefoni
  enter(){
    const ui = this.ui, mode = this.mode;
    if (ui.controller !== 'phone') ui.selectController?.('phone', { open: false });
    if (mode === 'split' && ui.split?.webcam) ui.split.setInput?.('phones');
    return mode;
  }
  // «1 giocatore» · «2 giocatori»: la pagina si rifà con l'altra modalità (resta salvata)
  setPlay(v){
    const F = this.ui.fiera, L = this.ui.lobby; if (!F) return;
    const mode = F.setPlay(v);
    this.ui.diag?.recorder?.log?.('stand.fieraGioco', { modo: mode });
    if (L?.visible) L.go('menu');
  }
  // «Nome»: lo scrive lo staff con la tastiera a schermo (B38), facoltativo; senza, «Visitatore N»
  askName(){
    const L = this.ui.lobby; if (!L?.askNickname) return;
    L.askNickname(() => L.paint?.(), { force: true });
  }
  // «Prossimo giocatore» (fine partita, pannello, telecomando) e chiosco in fiera
  next({ causa = 'fiera' } = {}){ return resetFairVisitor(this.ui, causa); }
  // stato di un telefono dello stand per la pagina
  _phone(id){
    const F = this.ui.fiera, p = F?.phone?.(id, { make: false }), v = F?.status?.(id) || {};
    return { label: v.label || (id === 'p2' ? 'Telefono 2' : 'Telefono 1'), paired: !!F?.paired?.(id) && !!p?.standSlot, connected: !!p?.connected,
      ready: !!p?.soonReady, hidden: p?.state?.vis === false, word: v.word || '', batt: batteryText(v), state: v.state || 'off' };
  }
  // ridisegno (natpf_lobby.paint, con la pagina in vista): → { gate, note, title }
  paint(){
    const ui = this.ui, F = ui.fiera, mode = this.mode, split = mode === 'split', E = this.engine;
    for (const b of document.querySelectorAll?.('[data-fiera-mode]') || []){ const on = b.dataset.fieraMode === mode; b.classList.toggle('selected', on); b.setAttribute?.('aria-checked', String(on)); }
    show($('fiera-bar'), true); show($('fiera-hand'), !split); show($('fiera-split'), split);
    const phones = { p1: this._phone('p1'), p2: this._phone('p2') };
    let gate = fairGate({ mode, phones });
    // (stesso schermo: anche le schede dello stesso schermo pronte, come «Gioca» le controlla: natpf_ui._bindStart)
    if (gate.ok && split && !ui.split?.bothReady?.()) gate = { ok: false, slot: null, why: 'Telefoni quasi pronti: un attimo…' };
    // riga dei telefoni: lo stato di quelli che servono, con la batteria; «Telefoni dello stand ›» se uno non è pronto
    // (pronti: lo stato di ciascuno con la batteria, e come si parte; uno non pronto: solo il perché, con il pulsante)
    const need = split ? PLAYERS : ['p1'], trial = !!ui.trial?.due?.({ split });
    // (nello stesso schermo lo stato di ciascun telefono è nella sua scheda: qui solo il perché generale e come si parte)
    const line = gate.ok ? (split ? '' : phones.p1.word) : split && gate.slot ? `${phones[gate.slot].label} non pronto` : gate.why;
    const pt = $('fiera-phones-text'); if (pt && pt.textContent !== line) pt.textContent = line;
    const how = gate.ok ? fairNote({ mode, gate, trial }) : '';
    const ph = $('fiera-phones-how'); if (ph && ph.textContent !== how) ph.textContent = how;
    const box = $('fiera-phones'); show(box, true); box?.classList?.toggle?.('ko', !gate.ok);
    show(box?.querySelector?.('[data-fiera-sheet]'), !gate.ok);
    // chi gioca (contro la CPU): il nome scritto o il numero del visitatore; «Nome» per scriverlo
    const ev = ui.events || {}, vis = $('fiera-visitor');
    const vt = split ? '' : visitorLine({ nickname: ev.nickname, guest: ev.guest, label: F?.visitorLabel?.() || '' });
    if (vis){ const b = vis.querySelector?.('b'); if (b && b.textContent !== vt) b.textContent = vt; show(vis, !split); }
    // stesso schermo: per ciascuno nome, fascia, mano e telefono
    if (split) for (const id of PLAYERS){
      const card = document.querySelector?.(`[data-fiera-player="${id}"]`); if (!card) continue;
      const name = card.querySelector?.('[data-fiera-pname]'), nm = ui.split?.name?.(id) || (id === 'p2' ? 'Player 2' : 'Player 1');
      if (name && name.textContent !== nm) name.textContent = nm;
      const band = bandOf(E.natpfSplitBands?.[id]), hand = ui.split?.hand?.(id) || 'right';
      for (const b of card.querySelectorAll?.('[data-fiera-band]') || []){ const on = b.dataset.fieraBand === `${id}:${band}`; b.classList.toggle('selected', on); b.setAttribute?.('aria-checked', String(on)); }
      for (const b of card.querySelectorAll?.('[data-fiera-hand]') || []){ const on = b.dataset.fieraHand === `${id}:${hand}`; b.classList.toggle('selected', on); b.setAttribute?.('aria-checked', String(on)); }
      const st = card.querySelector?.('[data-fiera-state]'), t = phones[id].word;
      if (st && st.textContent !== t) st.textContent = t;
      card.classList?.toggle?.('ko', phones[id].state !== 'ready');
    }
    const help = split ? ui.split?.helpNote?.() || '' : '';
    return { gate, note: [fairNote({ mode, gate, trial }), gate.ok ? help : ''].filter(Boolean).join(' '), title: split ? 'Chi gioca? Una fascia per ciascuno' : 'Chi gioca?' };
  }
}
// (per le prove: le fasce che la pagina mostra, come le scrive)
export const FAIR_BANDS = BANDS.map(b => ({ band: b, label: BAND_LABEL[b] }));
