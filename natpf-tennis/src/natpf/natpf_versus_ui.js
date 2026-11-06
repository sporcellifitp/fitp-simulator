// Interfaccia della sfida tra due computer (1v1), sopra natpf_versus.js:
//   • host, dalla racchetta alla partita: barra dell'invito (codice, link, copia o condividi) con una riga di stato
//     (in attesa · Player 2 entrato · Player 2 pronto · problema di rete) e «Gioca» attivo solo con il Player 2 pronto;
//   • host in partita: se il Player 2 sparisce la partita si ferma con la spiegazione e riprende da sola quando torna;
//     «Torna al menu» per chiudere;
//   • Player 2: un pannello unico con lo stato (mi collego · collegato · pronto · partita · collegamento perso · stanza
//     chiusa o inesistente · rete che blocca il collegamento diretto), racchetta e visuale, «Sono pronto» ed «Esci»;
//     una scheda per giocatore (Player 1 e «tu», natpf_ready.js): dopo «Sono pronto» il pulsante diventa verde pieno
//     «Pronto ✓» (non si toglie più ricliccando: c'è «Annulla») e la scheda dice se l'host l'ha ricevuto (B9, punto 4);
//     sul telefono un avviso: l'invito si apre sul computer. Racchetta da preparare come il Player 1 nel menu: telefono
//     (QR → calibrazione in campo) o webcam (pannello della webcam → prova in campo), poi pronto da solo.
// Lo stato arriva ogni 50 ms dal relay (/api/match/state) attraverso il motore (roomStatus, versusGuest).
import { VERSUS, lobbyState, canStart, hostLobbyStatus, startLabel, guestState, guestLine, hostInfo, readyEcho, guestBoard, hostBoard, p2HoldWhy, createHoldReporter, opponentHealth, hostHoldText, guestHoldNotice, CHECKPOINT_KEY, makeCheckpoint, checkpointFor } from './natpf_versus.js';
import { createPhoneWatch, phoneHealthOf, holdText } from './natpf_phone_watch.js';
import { webcamHealth, webcamHoldText } from './natpf_webcam_watch.js';
import { warmupDrills } from './natpf_training.js';
import { autoAdvance } from './natpf_lobby.js';
import { paintBoard } from './natpf_ready.js';
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
    this._hookTiming();
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
  // racchetta dell'host per le schede (sua e del P2: va nello snapshot della lobby, game_engine._broadcastMultiplayerSnapshot)
  hostInfo(){ return hostInfo({ controller: this.ui.controller, phoneReady: !!this.ui.phone?.ready, webcamActive: !!this.engine.motionController?.webcamActive }); }
  // modalità amico: riga di stato della barra dell'invito e pulsante «Gioca»
  paintLobby(){
    const box = $('natpf-invite'), btn = $('btn-start-match');
    if (!this.hostActive || this.ui.lobby?.mode !== 'friend'){ if (btn){ btn.disabled = false; btn.classList.remove('is-wait'); } return; }
    const st = this.state, r = this.engine.roomStatus || {}, p2p = this.engine.natpfP2p;
    const line = hostLobbyStatus(st, { roomId: this.engine.roomId, p2Name: r.guestName || 'Player 2', net: p2p?.mode === 'host' ? { mode: 'host', status: p2p.status, error: p2p.error } : null });
    // solo se cambia: prima le righe si riscrivevano ogni 250 ms e l'animazione del pallino in attesa ripartiva da capo
    // (lampeggiava invece di pulsare)
    const el = box?.querySelector('[data-versus-state]');
    if (el && (el.textContent !== line.text || el.dataset.state !== line.state)){ el.textContent = line.text; el.dataset.state = line.state; }
    if (el) el.title = p2p?.mode === 'host' && p2p.detail ? `collegamento diretto: ${p2p.detail}` : '';
    // due schede sotto la riga: «tu» e il Player 2 (in attesa · si prepara · pronto), aggiornate solo se cambiano
    if (el){
      let board = box.querySelector('[data-versus-board]');
      if (!board){ el.insertAdjacentHTML('afterend', '<div class="ready-board versus-board" data-versus-board></div>'); board = box.querySelector('[data-versus-board]'); }
      paintBoard(board, hostBoard(st, { host: this.hostInfo(), hostName: r.hostName || 'Player 1', p2Name: r.guestName || 'Player 2' }));
    }
    if (btn){
      const ok = canStart(st);
      // non ancora: grigio neutro con il motivo (prima giallo spento, uguale a quello attivo); si può: giallo «Gioca ›»
      btn.disabled = !ok; btn.classList.toggle('is-wait', !ok);
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
  /* ---------- tempi dei colpi del P2 nella diagnostica (analisi del 30/10: prima misurare) ---------- */
  // Il controller (motion_controls.js) può nascere dopo questa interfaccia: l'aggancio si rifà a ogni tick finché serve
  _hookTiming(){
    const mc = this.engine.motionController;
    if (!mc || mc._versusTiming === this) return;
    mc._versusTiming = this;
    mc.onP2Stale = info => this._p2Stale(info);
    mc.onP2Played = info => this._p2Played(info);
  }
  // host: colpo o lancio del P2 troppo vecchio, non giocato (natpf_versus.P2_STALE_MS)
  _p2Stale(info = {}){
    this.ui.diag?.recorder?.log?.('sfida.colpo_vecchio', { eta: info.eta ?? null, tipo: info.tipo || null, fase: this.engine.phase || null, n: info.n ?? null, max: info.max ?? null });
  }
  // host: colpo del P2 giocato, con l'età (ms dal picco sul telefono; null se il P2 non manda l'ora) e, se il motore lo
  // ha già colpito in questo istante, il tempo del colpo come lo valuta (tempoMs: + anticipo, − ritardo; lo stesso
  // dell'evento «racchetta», legato da n). Con il colpo in attesa del punto d'impatto il tempo arriva solo con «racchetta»
  _p2Played(info = {}){
    const R = this.ui.diag?.recorder; if (!R?.active) return;
    const E = this.engine, L = E.natpfLastRacket;
    const now = L && L.who === 'p2' && L.at === E.elapsedTime && (info.n == null || L.seq == null || L.seq === info.n) ? L : null;
    // esito: che cosa ne ha fatto il motore (game_engine._natpfP2Outcome: colpito, in attesa del punto d'impatto, servizio,
    // lancio, vuoto, fuori fase…); lo swing in attesa che poi scade si legge in «vuoto» con chi p2
    const I = E.natpfP2Input, esito = I && I.at === E.elapsedTime && (info.n == null || I.n == null || I.n === info.n) ? I.esito
      : info.tipo === 'toss' ? (E.phase === 'SERVE_TOSS' ? 'lancio' : 'ignorato') : null;
    R.log?.('sfida.colpo', { eta: info.eta ?? null, tipo: info.tipo || null, fase: E.phase || null, n: info.n ?? null, esito, tempoMs: now && Number.isFinite(now.timing) ? +(1000*now.timing).toFixed(1) : null });
  }
  // P2: orologio dell'host (rtt e offset in ms, motion_controls.hostClockEstimate) nella diagnostica ogni ~5 s, da quando
  // c'è la prima stima
  _logClock(now){
    const R = this.ui.diag?.recorder; if (!R?.active) return;
    if (this._clockAt != null && now - this._clockAt < 5000) return;
    const c = this.engine.motionController?.hostClockEstimate; if (!c) return;
    this._clockAt = now;
    R.log?.('sfida.orologio', { rtt: c.rtt, offset: c.offset });
  }
  tick(){
    const E = this.engine;
    this._hookTiming();
    if (this.p2){ this._tickGuest(); this._logClock(performance.now()); return; }
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
    desc?.insertAdjacentHTML('beforebegin', '<p class="natpf-versus-status" data-versus-guest aria-live="polite"></p><div class="ready-board versus-board" data-versus-board></div>');
    // invito aperto sul telefono (arriva in una chat): la partita si gioca dal computer, il telefono è la racchetta
    if (onPhone()){
      desc?.insertAdjacentHTML('beforebegin', '<p class="natpf-versus-phone" data-versus-phone>Stai aprendo l’invito sul telefono: la partita si gioca dal computer. Apri questo link sul computer; il telefono ti servirà dopo, come racchetta. <button type="button" class="nt-pill-btn" data-versus-copy>Copia link</button></p>');
      modal.querySelector('[data-versus-copy]')?.addEventListener('click', ev => { ev.stopPropagation(); navigator.clipboard?.writeText(location.href).then(() => { ev.target.textContent = 'Copiato ✓'; }).catch(() => {}); });
    }
    const go = $('natpf-guest-go');
    // «Sono pronto» senza il segno ✓ (prima l'avevano tutte e due le scritte: «azione da fare» e «fatto» uguali)
    if (go){ go.textContent = 'Sono pronto'; go.setAttribute('aria-pressed', 'false'); }
    modal.querySelector('.sheet-actions')?.insertAdjacentHTML('afterbegin', '<button type="button" class="lobby-ghost" data-versus-leave>Esci</button><button type="button" class="lobby-ghost hidden" data-versus-reconnect>Riconnetti</button>');
    // «Annulla» accanto a «Pronto ✓»: l'unico modo di tornare non pronti (prima un secondo clic sul pulsante lo toglieva
    // senza dirlo, e l'host vedeva «Gioca» spegnersi)
    go?.insertAdjacentHTML('beforebegin', '<button type="button" class="lobby-ghost hidden" data-versus-unready>Annulla</button>');
    modal.querySelector('[data-versus-leave]')?.addEventListener('click', e => { e.stopPropagation(); this.leave(); });
    modal.querySelector('[data-versus-unready]')?.addEventListener('click', e => { e.stopPropagation(); this.unready(); });
    // sfida senza server: «Riconnetti» rifà subito il collegamento con l'host (stessa partita)
    modal.querySelector('[data-versus-reconnect]')?.addEventListener('click', e => { e.stopPropagation(); this.reconnectAction().run(); });
    // pannello della webcam del P2: accendi (o riprova dopo un errore), indietro, in campo
    const cam = $('natpf-guest-cam');
    cam?.addEventListener('pointerdown', e => e.stopPropagation());
    $('guest-cam-go')?.addEventListener('click', e => { e.stopPropagation(); this.ui.startWebcam().then(() => this._paintCam()); });
    $('guest-cam-back')?.addEventListener('click', e => { e.stopPropagation(); this.closeCam(); this._tickGuest(); });
    $('guest-cam-field')?.addEventListener('click', e => { e.stopPropagation(); if (this.engine.motionController?.webcamActive) this.startCal(); });
  }
  // «Sono pronto»: l'host lo vede nella lobby
  setReady(on = true){
    if (on && !this.ready) this.readyAt = performance.now();   // da qui si aspetta la conferma del relay (readyEcho)
    this.ready = !!on;
    const mc = this.engine.motionController; if (mc) mc.versusReady = this.ready;
    this._paintGuest();
  }
  // «Annulla»: di nuovo non pronti, detto (l'host lo vede: «Gioca» torna grigio)
  unready(){
    if (!this.ready) return;
    this.setReady(false);
    this.ui.toast('Non sei più pronto: premi «Sono pronto» quando vuoi giocare');
  }
  // Pulsante principale del pannello. Con il telefono: QR, e appena il telefono ha i sensori attivi la calibrazione nel
  // campo d'allenamento, come il Player 1 nel riscaldamento; finita, si è pronti da soli. Prima il P2 calibrava nel
  // pannello del telefono, senza campo e senza palle: dopo i due gesti chiedeva un «colpetto libero» e due pulsanti
  // («Conferma la racchetta», «Continua»), e chi non li trovava restava lì con l'host bloccato su «Gioca»
  // Con la webcam (segnalazione del 30/10: prima «Sono pronto» e basta, senza camera né prova): il pannello della webcam
  // come la pagina «Collega» del Player 1 (permesso, anteprima, motivi d'errore, mano vista), appena vede la mano la
  // prova in campo con il lanciapalle, poi pronto da solo
  primary(){
    const ui = this.ui, phone = ui.phone;
    // già pronti: il pulsante non è un interruttore (per tornare indietro c'è «Annulla»)
    if (this.ready){ ui.toast('Sei pronto ✓ Per tornare indietro premi «Annulla»'); return; }
    if (ui.controller === 'webcam' && this._webcamSetup()){ this.openCam(); return; }
    if (ui.controller !== 'phone' || phone.ready){ this.setReady(true); return; }
    this.awaitPhone = true;
    show($('natpf-guest-modal'), false);
    ui.openPhone();
  }
  // la webcam va (ri)preparata: spenta, o non ancora provata in campo
  _webcamSetup(){ return this.ui.controller === 'webcam' && (!this.engine.motionController?.webcamActive || !this.camTried); }
  // racchetta cambiata nel pannello: se quella nuova va preparata, non si è più pronti (prima si restava pronti con la
  // webcam spenta o il telefono da collegare, e la partita partiva con il P2 che non poteva colpire)
  onController(id){
    if (!this.p2) return;
    if (id !== 'webcam' && this.awaitCam) this.closeCam();
    if (this.ready && this.guest !== 'playing' && ((id === 'phone' && !this.ui.phone.ready) || (id === 'webcam' && this._webcamSetup()))) this.setReady(false);
    else this._paintGuest();      // pulsante e riga di stato subito con la racchetta nuova (non al prossimo giro)
  }
  get camOpen(){ const el = $('natpf-guest-cam'); return !!el && !el.classList.contains('hidden'); }
  // pannello della webcam: si accende subito (il browser chiede il permesso), poi stato e anteprima ogni 250 ms
  openCam(){
    const ui = this.ui;
    this.awaitCam = true;
    // si entra in campo da soli quando la mano si vede mentre si è qui (come la pagina «Collega» del Player 1)
    this.camAutoFrom = this._handSeen() ? 'cam' : null;
    show($('natpf-guest-modal'), false); show($('natpf-guest-cam'));
    this._paintCam();
    if (!this.engine.motionController?.webcamActive) ui.startWebcam().then(() => this._paintCam());
  }
  closeCam(){ this.awaitCam = false; clearTimeout(this._camT); this._camT = null; show($('natpf-guest-cam'), false); }
  _handSeen(){ return !!this.ui.lobby?.state?.().handSeen; }
  _paintCam(){
    if (!this.camOpen) return;
    const ui = this.ui, mc = this.engine.motionController, on = !!mc?.webcamActive;
    ui.paintWebcamSetup?.();
    const field = $('guest-cam-field'); if (field) field.disabled = !on;
    // mano vista: in campo da soli dopo un attimo, ma non con la guida aperta
    if (this.awaitCam && autoAdvance('connect', { controller: 'webcam', handSeen: this._handSeen() }) && this.camAutoFrom !== 'cam' && !ui.onboarding?.isOpen){
      this.camAutoFrom = 'cam';
      this._camT = setTimeout(() => { this._camT = null; if (this.awaitCam && this.camOpen && !ui.onboarding?.isOpen && mc?.webcamActive) this.startCal(); else this.camAutoFrom = null; }, 700);
    }
  }
  // telefono collegato con i sensori attivi, dal pannello del telefono: si chiude il pannello e si va in campo
  _phoneLinked(){
    const p = this.ui.phone, L = p.state;
    return p.connected && (L.phone === 'cal' || L.phone === 'ready');
  }
  // Calibrazione del P2 nel campo d'allenamento. Il motore del P2 gioca in locale (ruolo del P1, colpi che restano qui,
  // niente multigiocatore) finché dura; l'host intanto è in lobby e non manda la partita (snapshot «lobby»), e con il P2
  // non pronto non può farla partire. Alla fine (calDone) tutto torna come prima.
  // Con la webcam, che non ha una calibrazione: il riscaldamento del Player 1 con la webcam (dritto, rovescio, servizio,
  // natpf_training.warmupDrills), saltabile con «Salta»
  startCal(){
    const E = this.engine, ui = this.ui, mc = E.motionController;
    if (!ui.training || ui.training.active) return;
    const webcam = ui.controller === 'webcam';
    this.awaitPhone = false; this.closeCam();
    this.local = { role: E.playerRole, multi: E.isMultiplayer, auto: E.autoPlayMode, touched: E.userHasInteracted, webcam };
    E.playerRole = 'p1'; if (mc) mc.localPractice = true;
    show($('natpf-guest-modal'), false);
    ui.training.start(webcam ? { drills: warmupDrills('webcam'), guest: true } : { calOnly: true, guest: true });
    ui.diag?.recorder?.log?.('sfida.prova', { racchetta: ui.controller, stato: 'inizio' });
  }
  calDone({ completed = false, skipped = false } = {}){
    const E = this.engine, mc = E.motionController, was = this.local; this.local = null;
    if (mc) mc.localPractice = false;
    if (was){ E.playerRole = was.role; E.isMultiplayer = was.multi; E.autoPlayMode = was.auto; E.userHasInteracted = was.touched; }
    const webcam = was ? !!was.webcam : this.ui.controller === 'webcam';
    // calibrazione finita, o «Salta» (modalità semplice: si gioca lo stesso): pronto. Il telefono vero dice «pronto» un
    // attimo dopo la fine della calibrazione in campo: non lo si aspetta qui (prima il P2 restava non pronto). Con la
    // webcam: riscaldamento finito o saltato
    if (webcam && (completed || skipped)) this.camTried = true;
    if (completed || skipped || (!webcam && this.ui.phone.ready)) this.setReady(true);
    this.ui.toast(this.ready ? `${webcam ? 'Webcam pronta' : 'Racchetta pronta'} ✓ ora aspetta che l’host avvii la partita` : webcam ? 'Prova interrotta: rifalla dal pannello' : 'Calibrazione interrotta: rifalla dal pannello');
    this.ui.diag?.recorder?.log?.('sfida.prova', { racchetta: webcam ? 'webcam' : 'phone', stato: completed ? 'finita' : skipped ? 'saltata' : 'interrotta', pronto: this.ready });
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
    const webcam = !phone && this._webcamSetup();
    // sfida senza server, non ancora collegati: la riga dice perché (natpf_versus.guestLine)
    const p2p = this.engine.natpfP2p;
    if (el){
      const line = guestLine(st, { ready: this.ready, phone, webcam, hostName: this.engine.roomStatus?.hostName || 'Player 1', net: p2p?.mode === 'guest' ? { mode: 'guest', status: p2p.status, error: p2p.error } : null });
      if (el.textContent !== line.text) el.textContent = line.text;
      el.dataset.state = line.state;
      el.title = p2p?.mode === 'guest' && p2p.detail ? `collegamento diretto: ${p2p.detail}` : '';
    }
    show(document.querySelector('[data-versus-reconnect]'), p2p?.mode === 'guest' && (st === 'lost' || st === 'connecting'));
    const go = $('natpf-guest-go');
    if (go){
      go.disabled = st !== 'lobby' && st !== 'connecting';
      const label = this.ready ? 'Pronto ✓' : phone ? 'Collega il telefono ›' : webcam ? 'Accendi la webcam ›' : 'Sono pronto';
      if (go.textContent !== label) go.textContent = label;
      // pronto: verde pieno (prima la classe «selected», senza stile: giallo prima e dopo il clic)
      go.classList.toggle('is-ready', this.ready);
      const pressed = String(this.ready); if (go.getAttribute('aria-pressed') !== pressed) go.setAttribute('aria-pressed', pressed);
    }
    const modal = $('natpf-guest-modal');
    show(modal?.querySelector('[data-versus-unready]'), this.ready && st === 'lobby');
    // schede: Player 1 (l'host, con la sua racchetta se la manda) e «tu», con la conferma che l'host ti vede pronto
    // la conferma vale solo collegati in lobby (con il collegamento perso l'ultimo p2Ready ricevuto resta vero, ma l'host
    // non lo sta vedendo)
    const echo = readyEcho({ ready: this.ready, echoed: st === 'lobby' && !!this.engine.roomStatus?.p2Ready, sinceMs: performance.now() - (this.readyAt || 0) });
    if (echo !== this._echo){ if (this._echo === 'sending' && echo === 'late') this.ui.diag?.recorder?.log?.('sfida.pronto', { conferma: 'non arriva' }); this._echo = echo; }
    paintBoard(modal?.querySelector('[data-versus-board]'), guestBoard({ guest: st, ready: this.ready, echo, phone, webcam, host: this.engine.versusGuest?.host || null,
      hostName: this.engine.roomStatus?.hostName || 'Player 1', guestName: this.engine.roomStatus?.guestName || 'Player 2' }));
    return st;
  }
  // P2 in partita: perché non può giocare (detto all'host con la lettura dello stato, motion_controls «hold») e cosa
  // vede quando la partita è ferma (riquadro sopra il campo, con «Ricollega il telefono» o «Riconnetti»)
  _guestHold(st){
    const E = this.engine, ui = this.ui, mc = E.motionController, now = performance.now();
    const playing = st === 'playing' && !this.local && !ui.training?.active;
    const G = E.versusGuest || {}, p2p = E.natpfP2p, hold = st === 'playing' ? G.hold : null;
    // salute della racchetta: telefono, o webcam (spenta, ferma, mano persa a lungo: natpf_webcam_watch.webcamHealth, con
    // le soglie del Player 1; già in pausa per un motivo del P2, per riprendere la mano deve vedersi adesso)
    let health = null;
    if (playing && ui.controller === 'phone' && ui.phone) health = phoneHealthOf(ui.phone, now);
    else if (playing && ui.controller === 'webcam' && mc?.webcamHealth){
      const paused = !!this.reporter.why || hold?.who === 'p2';
      health = webcamHealth(mc.webcamHealth(now), { paused, rally: E.phase === 'RALLY' || E.phase === 'SERVE_TOSS' });
    }
    const why = this.reporter.update(p2HoldWhy({ playing, hidden: !!globalThis.document?.hidden, health }), now);
    if (mc) mc.versusHold = why || '';
    if (why !== this._lastHold){ ui.diag?.recorder?.log?.('tel2.pausa', { motivo: why || 'ok', racchetta: ui.controller }); this._lastHold = why; }
    // collegamento con l'host perso: lo dice il pannello del P2 (con «Riconnetti»), non questo riquadro
    if (!hold){ if (this._holdShown){ this._holdShown = false; ui._paintHold(null); } return; }
    const webcamText = hold.why === 'webcam spenta' ? 'La webcam è spenta: premi «Accendi la webcam». La partita riprende quando ti rivede.' : webcamHoldText(hold.why);
    const n = guestHoldNotice(hold, { hostName: E.roomStatus?.hostName || 'Player 1', phoneText: holdText(hold.why), webcamText });
    const action = n.phone ? ui.relinkAction(ui.phone) : n.webcam && hold.why === 'webcam spenta' ? { label: 'Accendi la webcam', run: () => ui.startWebcam() }
      : hold.why === 'avversario' && p2p?.mode === 'guest' ? this.reconnectAction() : null;
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
    // pannello della webcam: stato, anteprima e ingresso in campo con la mano vista; si chiude se la stanza non c'è più o
    // la partita parte. Collegamento con l'host perso per un attimo: lascia il posto al pannello del P2 (che lo dice, con
    // «Riconnetti») e torna da solo quando il collegamento torna (prima si chiudeva e si ripartiva dal pannello del P2)
    if (this.awaitCam){
      if (st === 'playing' || st === 'closed' || st === 'invalid') this.closeCam();
      else if (st === 'lost') show($('natpf-guest-cam'), false);
      else { if (!this.camOpen && !this.ui.training?.active) show($('natpf-guest-cam')); this._paintCam(); }
    }
    // telefono collegato dal pannello del telefono: in campo per la calibrazione (o pronto, se è già calibrato)
    if (this.awaitPhone && this._phoneLinked()){
      this.awaitPhone = false; this.ui.closePhone();
      if (this.ui.phone.ready) this.setReady(true); else this.startCal();
    }
    // il pannello resta aperto finché non si gioca; torna se l'host chiude, si perde il collegamento o si torna in lobby.
    // Non sopra il pannello del telefono, la guida o la calibrazione in campo: prima, dopo «Sono pronto» con il telefono
    // da collegare, tornava ogni 250 ms sopra il QR e lo copriva
    const pm = this.ui.modal, other = (!!pm && !pm.classList.contains('hidden')) || this.camOpen || !!this.ui.onboarding?.isOpen || !!this.ui.training?.active;
    if (modal) show(modal, st !== 'playing' && !other);
    if (this._last !== st){
      if (st === 'playing' && this._last) this.ui.toast('Si gioca!');
      this._last = st;
    }
  }
}
