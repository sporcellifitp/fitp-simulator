// Interfaccia della sfida tra due computer (1v1), sopra natpf_versus.js:
//   • host, dalla racchetta alla partita: barra dell'invito (codice, link, copia o condividi) con una riga di stato
//     (in attesa · Player 2 entrato · Player 2 pronto · problema di rete) e «Gioca» attivo solo con il Player 2 pronto;
//   • host in partita: se il Player 2 sparisce la partita si ferma con la spiegazione e riprende da sola quando torna;
//     «Torna al menu» per chiudere;
//   • Player 2: un pannello unico con lo stato (mi collego · collegato · pronto · partita · collegamento perso · stanza
//     chiusa o inesistente · rete che blocca il collegamento diretto), racchetta e visuale, «Sono pronto» ed «Esci»;
//     sul telefono un avviso: l'invito si apre sul computer.
// Lo stato arriva ogni 50 ms dal relay (/api/match/state) attraverso il motore (roomStatus, versusGuest).
import { VERSUS, lobbyState, canStart, hostLobbyStatus, startLabel, guestState, guestLine, p2HoldWhy, createHoldReporter, opponentHealth, hostHoldText, guestHoldNotice, CHECKPOINT_KEY, makeCheckpoint, checkpointFor } from './natpf_versus.js';
import { createPhoneWatch, phoneHealthOf, holdText } from './natpf_phone_watch.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
// browser di un telefono (sistema mobile e tocco): l'invito va aperto sul computer
export const onPhone = (nav = globalThis.navigator, mm = globalThis.matchMedia) => {
  const ua = String(nav?.userAgent || '');
  return /Android|iPhone|iPod|Mobile/i.test(ua) && (!mm || !!mm('(pointer: coarse)')?.matches);
};

export class NatpfVersusUi {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.p2 = engine.playerRole === 'p2' && engine.urlRoom && engine.urlRoom !== 'DEFAULT';
    this.ready = false;
    this.p2Gone = 0;            // host: da quando il P2 non si vede (ms, 0 = presente)
    this.waiting = false;       // host: partita ferma in attesa del P2
    // host: il P2 può giocare? (computer collegato, telefono utilizzabile, finestre in primo piano) → pausa per tutti e
    // due, conto alla rovescia, punto rigiocato. Senza tolleranza qui: la mette il P2 prima di dirlo (createHoldReporter)
    this.watch = createPhoneWatch({ graceMs: 0 }); this.holdWhy = null; this.holdLeft = null;
    this.reporter = createHoldReporter();   // P2: perché non può giocare, detto all'host
    this._buildWait();
    if (this.p2) this._bindGuest();
    // P2: ogni ~5 s il motore riassume come arrivano gli snapshot dell'host (età, correzioni della palla, blocchi della
    // previsione locale, natpf_guest_view.takeReport) e lo scrive nella diagnostica
    if (this.p2) engine.natpfGuestReport = r => this.ui.diag?.recorder?.log?.('sfida.vista', r);
    // il motore si ferma con la pausa: il controllo gira a parte, e durante la pausa l'host dice al P2 che è in pausa
    this._timer = setInterval(() => this.tick(), 250);
  }
  /* ---------- host ---------- */
  // sessione 1v1 con un Player 2 in rete (non lo split screen, dove il P2 è sullo stesso computer: natpf_split.js)
  get hostActive(){ return !this.p2 && !!this.engine.versus?.active && !this.engine.versus.local; }
  get state(){ const r = this.engine.roomStatus || {}; return lobbyState({ p2Online: r.p2Online, p2Ready: r.p2Ready }); }
  canStart(){ return canStart(this.state); }
  // modalità amico: riga di stato della barra dell'invito e pulsante «Gioca»
  paintLobby(){
    const box = $('natpf-invite'), btn = $('btn-start-match');
    if (!this.hostActive || this.ui.lobby?.mode !== 'friend'){ if (btn){ btn.disabled = false; btn.classList.remove('waiting'); } return; }
    const st = this.state, r = this.engine.roomStatus || {}, p2p = this.engine.natpfP2p;
    const line = hostLobbyStatus(st, { roomId: this.engine.roomId, p2Name: r.guestName || 'Player 2', net: p2p?.mode === 'host' ? { mode: 'host', status: p2p.status, error: p2p.error } : null });
    // solo se cambia: prima le righe si riscrivevano ogni 250 ms e l'animazione del pallino in attesa ripartiva da capo
    // (lampeggiava invece di pulsare)
    const el = box?.querySelector('[data-versus-state]');
    if (el && (el.textContent !== line.text || el.dataset.state !== line.state)){ el.textContent = line.text; el.dataset.state = line.state; }
    if (el) el.title = p2p?.mode === 'host' && p2p.detail ? `collegamento diretto: ${p2p.detail}` : '';
    if (btn){
      const ok = canStart(st);
      btn.disabled = !ok; btn.classList.toggle('waiting', !ok);
      const label = btn.querySelector('.choice-main') || btn;
      if (!btn.dataset.label) btn.dataset.label = label.textContent;
      label.textContent = ok ? btn.dataset.label : startLabel(st);
    }
  }
  // sheet di attesa sull'host (Player 2 uscito a partita in corso)
  _buildWait(){
    if ($('natpf-versus-wait')) return;
    document.body.insertAdjacentHTML('beforeend', `<div id="natpf-versus-wait" class="nt-modal-backdrop natpf-sheet-backdrop hidden" role="dialog" aria-labelledby="natpf-versus-wait-title">
      <div class="natpf-sheet"><p class="sheet-kicker">Sfida un amico · 1v1</p><h2 class="sheet-title" id="natpf-versus-wait-title">Il Player 2 si è scollegato</h2>
      <p class="sheet-desc" data-versus-wait-text>La partita è ferma. Riprende da sola appena il Player 2 riapre il link.</p>
      <p class="sheet-desc" data-versus-wait-count></p>
      <div class="sheet-actions"><button type="button" class="lobby-ghost" data-versus-menu>Torna al menu</button></div></div></div>`);
    const el = $('natpf-versus-wait');
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.querySelector('[data-versus-menu]').addEventListener('click', e => { e.stopPropagation(); this._setWaiting(false); this.ui.backToMenu(); });
  }
  // back: il Player 2 è tornato davvero (prima l'avviso compariva a ogni uscita dall'attesa, anche tornando al menu)
  _setWaiting(on, back = false){
    if (on === this.waiting) return;
    this.waiting = on; show($('natpf-versus-wait'), on);
    this.engine.natpfVersusWait = on; this.ui._syncPause();
    if (!on && back) this.ui.toast('Player 2 di nuovo collegato: si riprende');
  }
  // titolo e testo del riquadro di attesa (motivo e conto alla rovescia)
  _paintWait(){
    const el = $('natpf-versus-wait'); if (!el) return;
    const t = hostHoldText(this.holdWhy, { p2Name: this.engine.roomStatus?.guestName || 'Player 2' });
    const set = (sel, txt) => { const x = el.querySelector(sel); if (x && x.textContent !== txt) x.textContent = txt; };
    set('#natpf-versus-wait-title', t.title); set('[data-versus-wait-text]', t.text);
    set('[data-versus-wait-count]', this.holdLeft ? `Si riprende tra ${this.holdLeft}…` : '');
  }
  // azioni della macchina a stati (natpf_phone_watch.createPhoneWatch): pausa, motivo cambiato, conto alla rovescia, ripresa
  _watchAction(a){
    const E = this.engine, R = this.ui.diag?.recorder;
    if (a.kind === 'pause' || a.kind === 'wait'){
      this.holdWhy = a.why; this.holdLeft = null; this._setWaiting(true); this._paintWait();
      R?.log?.('sfida.pausa', { motivo: a.why, fase: E.phase });
    }
    if (a.kind === 'countdown'){ this.holdLeft = a.left; this._paintWait(); }
    if (a.kind === 'resume'){
      const replay = a.replay && ['RALLY', 'SERVE_TOSS'].includes(E.phase);
      this.holdLeft = null; this._setWaiting(false, this.holdWhy === 'avversario' && !replay);
      // lo scambio interrotto non dà punti a nessuno: si rigioca dal servizio (stesso punteggio, stesso battitore)
      if (replay){ E._setupPointServe?.({ showBanner: false }); this.ui.toast('Si riprende: il punto interrotto si rigioca'); }
      R?.log?.('sfida.ripresa', { motivo: this.holdWhy, rigiocato: replay });
      this.holdWhy = null;
    }
  }
  // perché la partita è ferma, per il P2 (natpf_versus.guestHoldNotice)
  _holdForGuest(){
    if (this.waiting && this.holdWhy){
      const who = this.holdWhy === 'host nascosto' ? 'host' : 'p2';
      return this.holdLeft ? { who, why: this.holdWhy, left: this.holdLeft } : { who, why: this.holdWhy };
    }
    if (this.ui.phoneHold) return { who: 'host', why: 'telefono' };
    return { who: 'host', why: 'pausa' };
  }
  // punteggio salvato nella scheda dell'host (natpf_versus.makeCheckpoint): ripresa dopo un ricaricamento della pagina
  clearCheckpoint(){ this._cpText = null; try { sessionStorage.removeItem(CHECKPOINT_KEY); } catch {} }
  _checkpoint(inMatch){
    const E = this.engine, info = { roomId: E.roomId, fmt: E.matchFormat?.id ?? null, gamesToWin: E.matchConfig?.gamesToWin ?? 1, score: E.score };
    // partita appena iniziata nella stessa stanza, da 0-0: si riprende il punteggio salvato prima del ricaricamento
    if (inMatch && !this._wasInMatch){
      let cp = null; try { cp = JSON.parse(sessionStorage.getItem(CHECKPOINT_KEY) || 'null'); } catch {}
      const s = checkpointFor(cp, info);
      if (s){
        Object.assign(E.score, s); E._syncScoreboardHUD?.(); E._setupPointServe?.({ showBanner: false });
        this.ui.toast('Partita ripresa dal punteggio di prima del ricaricamento');
        this.ui.diag?.recorder?.log?.('sfida.ripresa', { motivo: 'punteggio salvato', punteggio: s });
      }
    }
    this._wasInMatch = inMatch;
    if (E.phase === 'MATCH_OVER'){ if (this._cpText !== null) this.clearCheckpoint(); return; }
    if (!inMatch) return;
    const text = JSON.stringify(makeCheckpoint(info).score);
    if (text === this._cpText) return;
    this._cpText = text;
    try { sessionStorage.setItem(CHECKPOINT_KEY, JSON.stringify(makeCheckpoint(info))); } catch {}
  }
  tick(){
    const E = this.engine;
    if (this.p2){ this._tickGuest(); return; }
    if (!this.hostActive){ this.p2Gone = 0; this._wasInMatch = false; if (this.watch.state !== 'ok') this.watch.reset(); this.holdWhy = null; this.holdLeft = null; this._setWaiting(false); return; }
    if (this.ui.lobby?.visible) this.paintLobby();
    const now = performance.now(), online = !!E.roomStatus?.p2Online;
    this.p2Gone = online ? 0 : (this.p2Gone || now);
    const inMatch = E._versusInMatch?.() && E.phase !== 'MATCH_OVER';
    this._checkpoint(inMatch);
    const h = opponentHealth({ absentMs: this.p2Gone ? now - this.p2Gone : 0, hold: online ? E.roomStatus?.p2Hold : null, hostHidden: !!globalThis.document?.hidden });
    const a = this.watch.update(h, { inField: inMatch, rally: E.phase === 'RALLY' || E.phase === 'SERVE_TOSS', now });
    if (a) this._watchAction(a);
    // con il motore fermo (pausa o attesa, o finestra nascosta) non partono snapshot: si dice al P2 che la partita è in
    // pausa e perché
    if ((E.natpfPaused || this.waiting) && inMatch && E.roomId && E.roomId !== 'default')
      // con il punteggio e chi batte: un P2 che rientra durante la pausa li vede subito (prima 0-0 fino alla ripresa)
      fetch('/api/match/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: E.roomId, snapshot: { paused: true, waitingP2: this.waiting, hold: this._holdForGuest(), score: { ...E.score }, fmt: E.matchFormat?.id, gamesToWin: E.matchConfig?.gamesToWin } }) }).catch(() => {});
  }
  /* ---------- Player 2 ---------- */
  _bindGuest(){
    const modal = $('natpf-guest-modal'); if (!modal) return;
    const desc = modal.querySelector('.sheet-desc');
    desc?.insertAdjacentHTML('beforebegin', '<p class="natpf-versus-status" data-versus-guest aria-live="polite"></p>');
    // invito aperto sul telefono (arriva in una chat): la partita si gioca dal computer, il telefono è la racchetta
    if (onPhone()){
      desc?.insertAdjacentHTML('beforebegin', '<p class="natpf-versus-phone" data-versus-phone>Stai aprendo l’invito sul telefono: la partita si gioca dal computer. Apri questo link sul computer; il telefono ti servirà dopo, come racchetta. <button type="button" class="nt-pill-btn" data-versus-copy>Copia link</button></p>');
      modal.querySelector('[data-versus-copy]')?.addEventListener('click', ev => { ev.stopPropagation(); navigator.clipboard?.writeText(location.href).then(() => { ev.target.textContent = 'Copiato ✓'; }).catch(() => {}); });
    }
    const go = $('natpf-guest-go');
    if (go){ go.textContent = 'Sono pronto ✓'; }
    modal.querySelector('.sheet-actions')?.insertAdjacentHTML('afterbegin', '<button type="button" class="lobby-ghost" data-versus-leave>Esci</button><button type="button" class="lobby-ghost hidden" data-versus-reconnect>Riconnetti</button>');
    modal.querySelector('[data-versus-leave]')?.addEventListener('click', e => { e.stopPropagation(); this.leave(); });
    // sfida senza server: «Riconnetti» rifà subito il collegamento con l'host (stessa partita)
    modal.querySelector('[data-versus-reconnect]')?.addEventListener('click', e => { e.stopPropagation(); this.reconnectAction().run(); });
  }
  // «Sono pronto»: l'host lo vede nella lobby
  setReady(on = true){
    this.ready = !!on;
    const mc = this.engine.motionController; if (mc) mc.versusReady = this.ready;
    this._paintGuest();
  }
  // Pulsante principale del pannello. Con il telefono: QR, e appena il telefono ha i sensori attivi la calibrazione nel
  // campo d'allenamento, come il Player 1 nel riscaldamento; finita, si è pronti da soli. Prima il P2 calibrava nel
  // pannello del telefono, senza campo e senza palle: dopo i due gesti chiedeva un «colpetto libero» e due pulsanti
  // («Conferma la racchetta», «Continua»), e chi non li trovava restava lì con l'host bloccato su «Gioca»
  primary(){
    const ui = this.ui, phone = ui.phone;
    if (this.ready){ this.setReady(false); return; }
    if (ui.controller !== 'phone' || phone.ready){ this.setReady(true); return; }
    this.awaitPhone = true;
    show($('natpf-guest-modal'), false);
    ui.openPhone();
  }
  // telefono collegato con i sensori attivi, dal pannello del telefono: si chiude il pannello e si va in campo
  _phoneLinked(){
    const p = this.ui.phone, L = p.state;
    return p.connected && (L.phone === 'cal' || L.phone === 'ready');
  }
  // Calibrazione del P2 nel campo d'allenamento. Il motore del P2 gioca in locale (ruolo del P1, colpi che restano qui,
  // niente multigiocatore) finché dura; l'host intanto è in lobby e non manda la partita (snapshot «lobby»), e con il P2
  // non pronto non può farla partire. Alla fine (calDone) tutto torna come prima.
  startCal(){
    const E = this.engine, ui = this.ui, mc = E.motionController;
    if (!ui.training || ui.training.active) return;
    this.awaitPhone = false;
    this.local = { role: E.playerRole, multi: E.isMultiplayer, auto: E.autoPlayMode, touched: E.userHasInteracted };
    E.playerRole = 'p1'; if (mc) mc.localPractice = true;
    show($('natpf-guest-modal'), false);
    ui.training.start({ calOnly: true, guest: true });
  }
  calDone({ completed = false, skipped = false } = {}){
    const E = this.engine, mc = E.motionController, was = this.local; this.local = null;
    if (mc) mc.localPractice = false;
    if (was){ E.playerRole = was.role; E.isMultiplayer = was.multi; E.autoPlayMode = was.auto; E.userHasInteracted = was.touched; }
    // calibrazione finita, o «Salta» (modalità semplice: si gioca lo stesso): pronto. Il telefono vero dice «pronto» un
    // attimo dopo la fine della calibrazione in campo: non lo si aspetta qui (prima il P2 restava non pronto)
    if (completed || skipped || this.ui.phone.ready) this.setReady(true);
    this.ui.toast(this.ready ? 'Racchetta pronta ✓ ora aspetta che l’host avvii la partita' : 'Calibrazione interrotta: rifalla dal pannello');
    this._tickGuest();
  }
  leave(){
    this.setReady(false);
    const u = new URL(location.href);
    for (const k of ['room', 'role', 'net', 'format']) u.searchParams.delete(k);
    location.href = u.pathname + (u.search || '');
  }
  get guest(){
    const G = this.engine.versusGuest || {}, p2p = this.engine.natpfP2p;
    const linked = p2p?.mode === 'guest' ? p2p.status === 'connected' : !!this.engine.roomStatus?.p1Online;
    const age = G.lastSnapshotAt ? performance.now() - G.lastSnapshotAt : null;
    const invalid = !!G.invalidSince && performance.now() - G.invalidSince > VERSUS.invalidMs;
    return guestState({ linked, invalid, closed: G.closed, hostLobby: G.lobby !== false, lastSnapshotAgeMs: G.lobby === false ? age : null, everLinked: G.everLinked });
  }
  _paintGuest(){
    if (!this.p2) return null;
    const st = this.guest, el = document.querySelector('[data-versus-guest]');
    const phone = this.ui.controller === 'phone' && !this.ui.phone.ready;
    // sfida senza server, non ancora collegati: la riga dice perché (natpf_versus.guestLine)
    const p2p = this.engine.natpfP2p;
    if (el){
      const line = guestLine(st, { ready: this.ready, phone, hostName: this.engine.roomStatus?.hostName || 'Player 1', net: p2p?.mode === 'guest' ? { mode: 'guest', status: p2p.status, error: p2p.error } : null });
      if (el.textContent !== line.text) el.textContent = line.text;
      el.dataset.state = line.state;
      el.title = p2p?.mode === 'guest' && p2p.detail ? `collegamento diretto: ${p2p.detail}` : '';
    }
    show(document.querySelector('[data-versus-reconnect]'), p2p?.mode === 'guest' && (st === 'lost' || st === 'connecting'));
    const go = $('natpf-guest-go');
    if (go){
      go.disabled = st !== 'lobby' && st !== 'connecting';
      const label = this.ready ? 'Pronto ✓' : phone ? 'Collega il telefono ›' : 'Sono pronto ✓';
      if (go.textContent !== label) go.textContent = label;
      go.classList.toggle('selected', this.ready);
    }
    return st;
  }
  // P2 in partita: perché non può giocare (detto all'host con la lettura dello stato, motion_controls «hold») e cosa
  // vede quando la partita è ferma (riquadro sopra il campo, con «Ricollega il telefono» o «Riconnetti»)
  _guestHold(st){
    const E = this.engine, ui = this.ui, mc = E.motionController, now = performance.now();
    const playing = st === 'playing' && !this.local && !ui.training?.active;
    const health = playing && ui.controller === 'phone' && ui.phone ? phoneHealthOf(ui.phone, now) : null;
    const why = this.reporter.update(p2HoldWhy({ playing, hidden: !!globalThis.document?.hidden, health }), now);
    if (mc) mc.versusHold = why || '';
    if (why !== this._lastHold){ ui.diag?.recorder?.log?.('tel2.pausa', { motivo: why || 'ok' }); this._lastHold = why; }
    // collegamento con l'host perso: lo dice il pannello del P2 (con «Riconnetti»), non questo riquadro
    const G = E.versusGuest || {}, p2p = E.natpfP2p, hold = st === 'playing' ? G.hold : null;
    if (!hold){ if (this._holdShown){ this._holdShown = false; ui._paintHold(null); } return; }
    const n = guestHoldNotice(hold, { hostName: E.roomStatus?.hostName || 'Player 1', phoneText: holdText(hold.why) });
    const action = n.phone ? ui.relinkAction(ui.phone) : hold.why === 'avversario' && p2p?.mode === 'guest' ? this.reconnectAction() : null;
    ui._paintHold(n.title, n.text, action); this._holdShown = true;
  }
  // «Riconnetti» (sfida senza server): un nuovo collegamento con l'host subito, senza una nuova partita
  reconnectAction(){
    return { label: 'Riconnetti', run: () => {
      const g = this.engine.natpfP2p?.guest;
      if (g?.reconnect?.()){ this.ui.toast('Mi ricollego all’host…'); this.ui.diag?.recorder?.log?.('sfida.riconnetti', { stato: this.engine.natpfP2p?.status }); }
    } };
  }
  _tickGuest(){
    const st = this._paintGuest(), modal = $('natpf-guest-modal');
    this._guestHold(st);
    // telefono collegato dal pannello del telefono: in campo per la calibrazione (o pronto, se è già calibrato)
    if (this.awaitPhone && this._phoneLinked()){
      this.awaitPhone = false; this.ui.closePhone();
      if (this.ui.phone.ready) this.setReady(true); else this.startCal();
    }
    // il pannello resta aperto finché non si gioca; torna se l'host chiude, si perde il collegamento o si torna in lobby.
    // Non sopra il pannello del telefono, la guida o la calibrazione in campo: prima, dopo «Sono pronto» con il telefono
    // da collegare, tornava ogni 250 ms sopra il QR e lo copriva
    const pm = this.ui.modal, other = (!!pm && !pm.classList.contains('hidden')) || !!this.ui.onboarding?.isOpen || !!this.ui.training?.active;
    if (modal) show(modal, st !== 'playing' && !other);
    if (this._last !== st){
      if (st === 'playing' && this._last) this.ui.toast('Si gioca!');
      this._last = st;
    }
  }
}
