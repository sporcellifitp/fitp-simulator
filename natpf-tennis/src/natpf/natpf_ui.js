// Interfaccia NATPF sopra l'HUD del motore base: scelta della racchetta (smartphone NATPF, webcam del motore base,
// mouse/tastiera del motore base) e della visuale, pannello di collegamento del telefono con le fasi della calibrazione
// NATPF (collega → impugna → prova → verifica → pronto), invito del Player 2 per il 1v1 tra due computer.
// I testi del collegamento seguono quelli di site/js/tennis/main.js.
import { controllerTiles, viewTiles, controllerStatus } from './natpf_tiles.js';
import { NatpfOnboarding } from './natpf_onboarding.js';
import { NatpfLobby } from './natpf_lobby.js';
import { guestInviteUrl } from './natpf_lan.js';
import { NatpfVersusUi } from './natpf_versus_ui.js';
import { NatpfPause } from './natpf_pause.js';
import { NatpfShotFeedback } from './natpf_shot_feedback.js';
import { NatpfServeMarker } from './natpf_serve_marker.js';
import { NatpfPowerHud } from './natpf_power_hud.js';
import { NatpfTimingCue } from './natpf_timing_cue.js';
import { NatpfSuperHint } from './natpf_super_hint.js';
import { eventoRestart } from './natpf_skill.js';
import { NatpfHand } from './natpf_hand.js';
import { NatpfTraining } from './natpf_training.js';
import { NatpfBallMachine } from './natpf_ball_machine.js';
import { bindAudioSliders } from './natpf_audio_settings.js';
import { NatpfGestureHud } from './natpf_gesture_hud.js';
import { NatpfServeCoach } from './natpf_serve_coach.js';
import { NatpfHotRallyHud } from './natpf_hot_rally.js';
import { NatpfDiag } from './natpf_diag.js';
import { NatpfRegistro } from './natpf_registro.js';
import { NatpfIntro } from './natpf_intro.js';
import { NatpfEvents } from './natpf_events.js';
import { installMatchStats } from './natpf_match_stats.js';
import { isCpuLevel } from './natpf_who.js';
import { NatpfKiosk } from './natpf_kiosk.js';
import { NatpfRemote } from './natpf_remote.js';
import { phoneHealthOf, createPhoneWatch, createResync, phoneHoldText, phoneOf, holdTitle, otherPhoneNote } from './natpf_phone_watch.js';
import { webcamHealth, createWebcamWatch, webcamHoldText, webcamOpenError } from './natpf_webcam_watch.js';
import { gripSvg, GRIP } from '@natpf/tennis/grip-art.js';
import { PHOTOS } from './natpf_media.js';
import { p2pStatusText, P2P_NET_HINT } from './natpf_versus.js';
import { NatpfSplitUi } from './natpf_split_ui.js';
import { NatpfScreen } from './natpf_screen.js';
import { NatpfCalibra } from './natpf_calibra.js';
import { scoreboardView, scoreboardHtml } from './natpf_scoreboard.js';
import { altServe } from './natpf_duo_rules.js';
import { castLooks, getCast } from './natpf_personaggi.js';
import { NatpfUpdates } from './natpf_updates.js';
import { resetVisitor } from './natpf_new_player.js';
import { NatpfTrial } from './natpf_trial.js';
import { readCalMode } from './natpf_trial_learn.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const store = {
  get(k, d){ try { return localStorage.getItem('natpf-tennis.' + k) ?? d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem('natpf-tennis.' + k, v); } catch {} },
};
const CONTROLLERS = ['phone', 'webcam', 'mouse'].map(id => ({ id }));
// testi dello stato della sfida senza server: in natpf_versus.js (funzioni pure), qui per chi li importava da qui
export { p2pStatusText, P2P_NET_HINT };
const STEPS = ['collega', 'impugna', 'prova', 'verifica', 'pronto'];
// pannelli della webcam con anteprima e stato: la pagina «Collega» del menu e quello del Player 2 dell'invito
// (natpf_versus_ui.js: il P2 non passa dal menu)
const WEBCAM_PANELS = [
  { video: 'setup-webcam-video', dot: 'setup-cam-dot', text: 'setup-cam-text', badge: 'setup-cam-badge', go: 'setup-cam-go' },
  { video: 'guest-cam-video', dot: 'guest-cam-dot', text: 'guest-cam-text', badge: 'guest-cam-badge', go: 'guest-cam-go' },
];
const PHONE_ERR = {
  denied: 'Sensori negati sul telefono. Su iPhone ricarica la pagina e tocca «Consenti»; su Android tocca il lucchetto accanto all\'indirizzo e consenti i sensori.',
  nomotion: 'Il browser del telefono non dà i sensori. Usa Chrome (Android) o Safari (iPhone) e inquadra di nuovo il QR.',
  insecure: 'Il telefono ha aperto la pagina senza https e il browser non dà i sensori. Apri il gioco in https (npm run dev:https in LAN, oppure l’indirizzo pubblicato) e inquadra di nuovo il QR.',
};
const REVIEW_FAIL = {
  servizio: 'Nessun gesto di servizio letto. Ripeti senza forzare, o scegli i tocchi sul telefono.',
  piccolo: 'Gesti troppo piccoli. Più ampi e decisi, oppure sul telefono scegli i tocchi.',
  squilibrio: 'Un gesto era molto più debole dell’altro. Rifai i due con la stessa forza, come colpi veri.',
};

export class NatpfUi {
  constructor(engine){
    this.engine = engine;
    // schermo: finestra intera o area di un ledwall, schermo intero senza cornici (natpf_screen.js). Prima di tutto il
    // resto: l'apertura automatica dello schermo intero ascolta il primo tasto in cattura prima del menu, che lo ferma
    this.screen = new NatpfScreen(engine);
    this.screen.onHint = t => this.toast(t);
    // calibrazione dello schermo (Opzioni → Schermo → «Calibra lo schermo…»): alla chiusura si torna al suo pulsante
    this.calibra = new NatpfCalibra(this.screen, {
      toast: t => this.toast(t),
      onClose: () => { if (this.lobby?.visible){ this.lobby.paint(); document.querySelector?.('[data-option="calibra"]')?.focus?.({ preventScroll: true }); } },
    });
    this.phone = engine.natpfPhone;
    // mouse e tastiera solo in modalità prova (easter egg «natpf» nel menu)
    this.testInput = store.get('testInput', '') === '1';
    this.controller = store.get('controller', 'phone');
    if (!CONTROLLERS.some(c => c.id === this.controller) || (this.controller === 'mouse' && !this.testInput)) this.controller = 'phone';
    this.hand = new NatpfHand(engine);
    this.shot = new NatpfShotFeedback(engine);
    this.power = new NatpfPowerHud(engine);          // potenza del colpo, colpo super ed energia (stanchezza)
    this.cue = new NatpfTimingCue(engine);           // B18.2 gruppo 3: segnale del momento giusto (anello sulla palla)
    this.serveMark = new NatpfServeMarker(engine);   // B37: chi batte (gemma sopra la testa) e riquadro di servizio a terra
    this.superHint = new NatpfSuperHint(engine);     // B18.2 gruppo 3: perché il colpo super non è scattato
    this.machine = new NatpfBallMachine(engine);      // lanciapalle 3D del riscaldamento e dei minigiochi
    this.training = new NatpfTraining(engine, this);
    this.gesture = new NatpfGestureHud(engine, this);   // etichetta del gesto: rilevato, letto, applicato
    this.serveCoach = new NatpfServeCoach(engine, this); // istruzioni del servizio sul grande schermo (B18)
    this.hotRally = new NatpfHotRallyHud(engine); // scritta «Scambio caldo» (B20, opzione dello staff)
    this.events = new NatpfEvents(engine, this);      // sfide per gli eventi (dopo il riscaldamento: ne avvolge i punti)
    // B33: numeri veri della partita per la schermata finale (natpf_match_stats.js; il motore li chiama solo in lettura):
    // fuori dai conti allenamento, minigiochi e scambi di prova. Partita singola contro la CPU finita: nella classifica
    // delle partite di oggi (natpf_events.recordMatch: nickname solo su questo computer, niente al registro dello stand)
    this.stats = installMatchStats(engine, { counts: () => !this.training?.active && !this.events?.active && !this.trial?.active, onEnd: m => this._matchEnded(m) });
    // scambi di prova (B28): la calibrazione giocando, prima della partita (dopo le sfide: ne avvolge i punti per ultimo)
    this.trial = new NatpfTrial(engine, this);
    // diagnostica (Maiusc+D o ?diag=1): prima del menu, così il suo tasto arriva anche con il menu aperto
    this.diag = new NatpfDiag(engine, this);
    this._gateDesktopInput();
    // impugnatura: foto reale nella pagina «Collega» (img.connect-grip, natpf_media.js); la figura disegnata (la stessa della
    // pagina del telefono e della guida) resta dove c'è ancora un <svg>
    for (const el of document.querySelectorAll('svg.connect-grip, svg.natpf-grip')) el.outerHTML = gripSvg({ cls: el.getAttribute('class'), compact: true });
    // testi e foto della presa insegnata (GRIP_STYLE in grip-art.js: un solo interruttore anche per il rollback)
    for (const el of document.querySelectorAll('[data-grip-text]')){ const t = GRIP.ui[el.dataset.gripText]; if (t) el.textContent = t; }
    for (const el of document.querySelectorAll('img.connect-grip-photo')){ el.src = PHOTOS.grip.src; el.alt = PHOTOS.grip.alt; }
    this.modal = $('natpf-phone-modal');
    this.qrToken = null;
    this._buildSetup();
    this._bindPhoneModal();
    this._bindStart();
    this.onboarding = new NatpfOnboarding({ getController: () => this.controller, onPractice: () => this.lobby.startPractice(), onOpen: () => this._syncPause(), onClose: () => this._syncPause() });
    this.lobby = this.flow = new NatpfLobby(engine, this, this.onboarding);
    this.pause = new NatpfPause(engine, this);
    // volumi separati di musica, effetti e voci (Opzioni e Pausa)
    this.syncVolumes = bindAudioSliders(engine.audioEngine);
    this.versus = new NatpfVersusUi(engine, this);
    // stesso schermo (split screen): due telefoni, pannelli della pagina «Collega» ed etichette in partita
    this.split = new NatpfSplitUi(engine, this);
    this.kiosk = new NatpfKiosk(engine, this);
    // registro dello stand (B30): righe di gioco continue e leggere, sempre acceso di base; dopo menu, allenamento,
    // minigiochi, stesso schermo e chiosco, perché ne avvolge le funzioni. Se non parte il gioco va avanti uguale
    try { this.registro = new NatpfRegistro(engine, this); } catch (e){ this.registro = null; console.warn('[natpf-registro] non avviato', e?.message || e); }
    // telecomando dello staff (B27): telefono dello staff abbinato una volta, frecce, OK, Pausa, Menu… (natpf_remote.js)
    this.remote = new NatpfRemote(engine, this);
    // intro all'avvio (marchi, titolo, «Premi un tasto»): poi il menu principale
    this.intro = new NatpfIntro({ onDone: () => { if (this.lobby.visible) this.lobby.go('menu'); } });
    // aggiornamenti del programma Windows (window.natpfDesktop.updates, 07/11): avviso nel menu e sezione in Opzioni;
    // nel browser niente. Lo ridisegna la lobby (paint, ogni 300 ms con il menu in vista) e ogni stato nuovo del programma
    this.updates = new NatpfUpdates(this);
    // «Gioca ancora» (fine partita): si torna alla pagina «Partita» per scegliere di nuovo livello, formato e lunghezza,
    // con la modalità di prima (richiesta del 28/10 sera: prima ripartiva subito la stessa partita). Nel 1v1 tra due
    // computer resta la rivincita immediata: l'altro computer aspetta la stessa partita
    // B35: contro la CPU con «Calibrazione: Giocando» prima gli scambi di prova (molte persone, un telefono: come dal B28 a
    // ogni partita), poi la pagina «Pronto per la partita»; la partita parte con «Gioca»
    $('btn-play-again')?.addEventListener('click', e => {
      if (this.lobby?.mode === 'friend' || this.engine.playerRole === 'p2' || this.versus?.hostActive){ this.wipe('Rivincita'); return; }
      e.stopImmediatePropagation();
      this.backToMenu('match');
      if (this.lobby?.mode === 'cpu' && this.lobby._pageTrial?.()) this.wipe('Scambi di prova');
    }, true);
    // «Nuovo giocatore» (B18, natpf_new_player.js): a fine partita; non nella sfida tra due computer (la rivincita è tra le
    // stesse due persone: lì il giocatore di questo computer si cambia dal pannello dello stand)
    $('btn-new-player')?.addEventListener('click', e => { e.stopPropagation(); this.newPlayer(); });
    window.addEventListener('natpf:victory', () => this._paintVictory());
    this.hand.set(this.hand.hand);
    // mano cambiata sulla pagina del telefono: vale per tutto il gioco (personaggio, webcam) e torna al telefono
    if (this.phone) this.phone.onHand = h => { this.hand.set(h); this.paintTiles(); };
    this.onViewChange(engine.viewMode);
    this.phone.onChange(() => { this.paintPhone(); this.paintTiles(); if (this.lobby?.visible && this.lobby.step === 'connect') this.lobby.paint(); });
    // telefono che ricalibra in partita o in una sfida senza il pannello aperto (Ricalibra e pannello chiuso, pagina del
    // telefono ricaricata): prima nessuno mostrava i passi né confermava la verifica, e i colpi venivano scartati. Si
    // riapre il pannello del telefono (in allenamento la calibrazione la guida il campo, natpf_training)
    this.phone.onCal?.(e => {
      if (!e || e.kind === 'done' || this.controller !== 'phone' || this.phone.ready) return;
      // (B28: non per il telefono che riceve da solo il profilo semplice, per un attimo «in calibrazione»)
      if (this.phone.autoSimple || this.trial?.active) return;
      // stesso schermo: la calibrazione la conferma natpf_split_ui (il pannello coprirebbe le due metà)
      if (this.lobby?.visible || this.engine.autoPlayMode || this.training?.active || this.split?.session) return;
      if (this.modal?.classList.contains('hidden')) this.openPhone();
    });
    this.phone.onChange(() => this._watchPhoneDrop());
    // telefono in campo: salute del collegamento e dei sensori ogni 100 ms, anche a partita ferma (il tick del motore in
    // pausa non gira): pausa subito, ripresa con il conto alla rovescia, punto rigiocato (natpf_phone_watch.js)
    this.phoneWatch = createPhoneWatch(); this.phoneHold = null; this.phoneResync = createResync();
    // webcam in campo: lo stesso per la mano persa a lungo e la camera ferma (natpf_webcam_watch.js)
    this.webcamWatch = createWebcamWatch(); this.webcamHold = null;
    setInterval(() => { try { this._phoneWatchTick(); this._webcamWatchTick(); this.split?.tick(); this._paintHoldQr(); } catch (e){ console.error(e); } }, 100);
    $('btn-natpf-view')?.addEventListener('click', e => { e.stopPropagation(); this.engine.setViewMode(this.engine.viewMode === 'first' ? 'third' : 'first'); });
    // Player 2 arrivato con il link di invito: sceglie racchetta e visuale prima di entrare
    if (engine.playerRole === 'p2' && engine.urlRoom && engine.urlRoom !== 'DEFAULT'){
      show($('natpf-guest-modal'));
      // sfida senza server: lo stato del collegamento con l'host sta nella riga di stato del pannello (natpf_versus_ui.js)
      if (engine.natpfP2p?.mode === 'guest') this._watchP2p();
      // pulsante principale: con il telefono QR e calibrazione in campo, poi pronto da solo; altrimenti «Sono pronto»
      // (natpf_versus_ui.js, primary). L'host vede il Player 2 pronto nella lobby
      $('natpf-guest-go')?.addEventListener('click', () => this.versus.primary());
      document.documentElement.classList.add('versus-guest');
    }
    // la scelta salvata vale anche per motore base (webcam accesa all'avvio della partita)
    this.selectController(this.controller, { open: false });
  }

  /* ---------- racchetta e visuale ---------- */
  _buildSetup(){
    for (const box of document.querySelectorAll('[data-natpf-tiles="controller"]')) box.innerHTML = controllerTiles();
    for (const box of document.querySelectorAll('[data-natpf-tiles="view"]')) box.innerHTML = viewTiles();
    // pannello del Player 2: le stesse tessere, compatte
    for (const box of document.querySelectorAll('[data-natpf-setup]')) box.innerHTML = `<p class="lobby-label">Racchetta</p><div class="lobby-tiles compact">${controllerTiles(true)}</div><p class="lobby-label">Visuale</p><div class="lobby-tiles compact lobby-tiles-2">${viewTiles(true)}</div><div class="lobby-row"><span class="lobby-label">Mano</span><div class="lobby-seg" role="radiogroup" aria-label="Mano"><button type="button" class="seg-btn" data-natpf-hand="right">Destra</button><button type="button" class="seg-btn" data-natpf-hand="left">Sinistra</button></div></div>`;
    this._paintTestInput();
    document.addEventListener('click', e => {
      const h = e.target.closest('[data-natpf-hand]');
      if (h){ e.stopPropagation(); this.hand.set(h.dataset.natpfHand); this.paintTiles(); return; }
      const mv = e.target.closest('[data-natpf-move]');
      if (mv){ e.stopPropagation(); this.engine.natpfBody?.setMode(mv.dataset.natpfMove); this.paintWebcamSetup(); return; }
      const b = e.target.closest('[data-natpf-controller],[data-natpf-view]'); if (!b) return;
      e.stopPropagation();
      if (b.dataset.natpfController) this.selectController(b.dataset.natpfController, { open: false });
      if (b.dataset.natpfView) this.engine.setViewMode(b.dataset.natpfView);
    });
  }
  paintTiles(){
    for (const b of document.querySelectorAll('[data-natpf-hand]')){ const on = b.dataset.natpfHand === this.hand.hand; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    this.flow?.paint?.();
    const mc = this.engine.motionController, state = { phone: this.phone, webcamActive: !!mc?.webcamActive };
    for (const el of document.querySelectorAll('[data-tile-status]')){ const id = el.dataset.tileStatus; if (CONTROLLERS.some(c => c.id === id)) el.textContent = controllerStatus(id, state); }
    for (const el of document.querySelectorAll('[data-natpf-controller="phone"]')) el.classList.toggle('ok', this.phone.ready);
  }
  // il gioco resta fermo mentre si leggono le istruzioni o si collega il telefono a partita in corso
  _syncPause(){
    const busy = this.onboarding?.isOpen || !this.modal?.classList.contains('hidden') || this.pause?.isOpen || this.engine.natpfVersusWait || !!this.phoneHold || !!this.webcamHold || !!this.split?.hold;
    this.engine.natpfPaused = !!busy && !this.engine.autoPlayMode && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(this.engine.phase);
    // B20 (revisione): a partita ferma il gioco non ridisegna le scritte del campo; le istruzioni del servizio e «Scambio
    // caldo» si tolgono subito (restavano sotto il riquadro della pausa) e tornano da sole alla ripresa
    if (this.engine.natpfPaused){ this.serveCoach?.paint(null); this.hotRally?.hide(); }
  }
  tick(dt = 1/60){ this.trial.tick(dt); this.training.tick(dt); this.events.tick(dt); this.shot.update(dt); this.power.update(dt); this.cue.update(dt); this.serveMark.update(dt); this.superHint.update(dt); this.gesture.update(dt); this.serveCoach.tick(dt); this.hotRally.tick(); }
  // sfondo fermo dell'arena dietro il menu (motore: _natpfBackdropFrame). Il Player 2 dell'invito vede l'arena viva
  // (riceve lo stato dell'host), e in campo (riscaldamento, sfide) il gioco gira
  menuBackdrop(){ return !!this.lobby?.visible && !this.training?.active && !this.events?.active && !this.trial?.active && this.engine.playerRole !== 'p2'; }
  // esito dei colpi del giocatore locale: anello colorato, allenamento; il valore torna al telefono (vibrazione)
  feedback(e = {}){
    if ((e.role || 'p1') !== this.engine.playerRole) return null;
    // scambi di prova (B28): i colpi non si giudicano (nessun anello, nessun esito per l'allenamento e i minigiochi)
    if (this.trial?.active){ this.diag?.onFeedback(e, null); return null; }
    const q = this.shot.onLocalFeedback(e);
    this.diag?.onFeedback(e, q);
    this.registro?.rec.onFeedback(e);
    // B37: in partita l'etichetta del gesto non dice «Fuori» / «In rete» prima che la palla tocchi terra (shot.shown)
    this.gesture?.onFeedback(e, this.shot.shown ? this.shot.shown(q) : q);
    // colpo difensivo (molto fuori tempo, la palla resta in gioco: dal B18 arriva come «hit»): per l'allenamento e i
    // minigiochi resta un tentativo fuori tempo, come prima quando arrivava come «fault»
    const defensive = e.kind === 'hit' && (!!e.defensive || /DEFENSIVE/.test(e.grade || ''));
    if (q && e.kind === 'hit' && !defensive){ this.training.onShot(q); this.events.onShot(q, e); }
    else if ((defensive || e.kind === 'fault' || e.kind === 'whiff') && /VERY (EARLY|LATE)|WHIFF/.test(e.grade || '')) this.training.onMistime(/EARLY/.test(e.grade));
    return q;
  }
  // tabellone della partita (natpf_scoreboard.js): una riga per giocatore o squadra con chi serve, nome, game e punti,
  // più il formato in parole. Prima «30 - 15» tra due ritratti e sotto «Game 1 – 0 · game secco» (B10, 06/11)
  onScore(score, gamesToWin){
    const el = $('natpf-scoreboard'); if (!el || !score) return;
    const E = this.engine, rs = E.roomStatus || {};
    const v = scoreboardView(score, { gamesToWin, viewer: E.playerRole === 'p2' ? 'opponent' : 'player', multiplayer: !!E.isMultiplayer,
      split: !!E.natpfSplit?.active, splitNames: E.natpfSplitNames, doubles: !!E.isDoubles, hostName: rs.hostName, guestName: rs.guestName,
      looks: castLooks(getCast(), !!E.isMultiplayer),      // B24: linguette del colore di Drop e di Lob
      altServe: altServe(E, !!score.fair) });              // B35: «Formato veloce: il servizio cambia ogni 2 punti»
    const html = scoreboardHtml(v);
    if (this._sbHtml !== html || !el.firstChild){ this._sbHtml = html; el.innerHTML = html; }
    // stesso schermo (B17.3): la stessa tabella anche in alto a sinistra della metà del Player 2; vuota altrimenti
    const el2 = $('natpf-scoreboard-p2'), html2 = E.natpfSplit?.active ? html : '';
    if (el2 && (this._sbHtml2 !== html2 || !!el2.firstChild !== !!html2)){ this._sbHtml2 = html2; el2.innerHTML = html2; }
  }
  // «Nuovo giocatore»: azzera nome, mano, tutorial, calibrazione e colpi imparati senza scollegare il telefono, e porta chi
  // arriva al passo giusto (natpf_new_player.js). Restituisce la strada presa ('match', 'challenge', 'split', 'versus', 'menu')
  newPlayer(){ this.trialSkipOnce = false; return resetVisitor(this); }
  // B33: partita singola contro la CPU finita: nella classifica delle partite di oggi; la posizione va nella schermata finale
  _matchEnded(m){
    if (m.mode !== 'cpu' || m.doubles || m.guest || !isCpuLevel(m.level)) return null;
    const p = m.s.player, o = m.s.opponent, g = m.games, mine = g.filter(x => x.winner === 'player').length;
    const r = this.events.recordMatch({ level: m.level, won: p.points, lost: o.points, games: [mine, g.length - mine], win: m.winner === 'player' });
    // (B35: la schermata finale scrive la pillola da questi numeri, natpf_match_stats.cpuPill: «3° posto nella classifica
    // di oggi»; fuori dalle prime solo i punti, mai «fuori»)
    this.stats.rank = { rank: r.rank | 0, total: r.total | 0, score: r.score | 0 };
    return r;
  }
  // schermata finale: «Nuovo giocatore» nascosto nella sfida tra due computer
  _paintVictory(){
    const versus = this.lobby?.mode === 'friend' || this.engine.playerRole === 'p2' || !!this.versus?.hostActive;
    $('btn-new-player')?.classList.toggle('hidden', versus);
  }
  // dal menu di pausa (e dal chiosco): fine partita, allenamento o sfida, ritorno al menu principale. Prima, in
  // allenamento, lo stop passava dalla fine dell'allenamento: dal riscaldamento si finiva sulla pagina «Partita» e dalla
  // calibrazione di una sfida partiva la sfida; e il gioco poteva restare in pausa per chi arrivava dopo
  // step: la pagina del menu da aprire («match» per «Gioca ancora»: le impostazioni della partita)
  backToMenu(step = 'menu'){
    const E = this.engine;
    // Player 2 dell'invito: tornare al menu vuol dire lasciare la stanza (prima restava dentro e i suoi colpi passavano)
    if (E.playerRole === 'p2' && this.versus?.p2){ this.versus.leave(); return; }
    this.versus?.clearCheckpoint?.();     // tornare al menu chiude la partita: il punteggio salvato serve solo a un ricaricamento
    this.trial?.abort();
    if (this.training.active) this.training.stop({ completed: false, silent: true });
    this.events.abort();
    this.split?.end();
    E.natpfPaused = false; E.hud.hideVictoryModal?.(); E.hud.hideCenterBanner();
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true });
    E._syncScoreboardHUD(); E._setupMidRallyShowcase({}); E.autoPlayMode = true;
    E.userHasInteracted = false; E.hud.showTitleModal(); this.flow.go(step); this._syncPause();
    // B18.2 gruppo 3: tornare al menu principale chiude la serie di partite di un giocatore: il livello Evento riparte
    // dal valore di base (senza, il visitatore dopo trovava la CPU regolata su quello di prima). «Gioca ancora» porta
    // alla pagina «Partita» (step 'match') e il livello continua da dove era arrivato
    if (step === 'menu') eventoRestart(E);
  }
  /* ---------- webcam nella tappa di preparazione ---------- */
  async startWebcam(){
    const mc = this.engine.motionController; if (!mc) return false;
    const ok = mc.webcamActive || await mc.enableWebcam();
    this.engine.hud?.updateMotionStatus?.({ webcamActive: !!ok, phoneConnected: this.phone.ready });
    this.paintWebcamSetup();
    return ok;
  }
  // anteprima e stato della webcam in tutti i pannelli (pagina «Collega» e pannello del Player 2); { on, hand, err }
  paintWebcamSetup(){
    const mc = this.engine.motionController;
    let out = null;
    for (const P of WEBCAM_PANELS){
      const r = this._paintWebcamPanel(P);
      out ||= r;
    }
    for (const b of document.querySelectorAll('[data-natpf-move]')){ const sel = (b.dataset.natpfMove === 'body') === !!this.engine.natpfBody?.enabled; b.classList.toggle('selected', sel); b.setAttribute('aria-checked', String(sel)); }
    return out || { on: !!mc?.webcamActive, hand: false, err: null };
  }
  _paintWebcamPanel(P){
    const mc = this.engine.motionController, on = !!mc?.webcamActive;
    const now = performance.now(), wrist = on && now - (mc._poseSeenAt ?? -Infinity) < 400;
    // la mano vista dal modello (webcam di argon-tennis) o un colpo già riconosciuto
    const swing = on && now - (mc.webcamMotionAt ?? -Infinity) < 2500;
    const hand = on && (swing || now - (mc.latestHandSeenAt || -1e9) < 1200 || wrist);
    const dot = $(P.dot), txt = $(P.text), badge = $(P.badge), go = $(P.go), v = $(P.video);
    // anteprima: lo stream della camera (anche quello riaperto da sola dopo un blocco, motion_controls._reopenCamera)
    const stream = on ? mc.webcamStream || null : null;
    if (v && stream && v.srcObject !== stream){ v.srcObject = stream; v.play?.()?.catch?.(() => {}); }
    // per colpire basta la mano (con polso e avambraccio); «Segui il corpo» vuole anche le spalle. Webcam che non si
    // apre: il motivo (occupata da un altro programma, negata, assente), non le istruzioni per l'inquadratura
    const body = !!this.engine.natpfBody?.enabled, err = on ? null : webcamOpenError(mc?.webcamError);
    const seen = swing ? 'Colpo visto' : wrist ? 'Braccio visto' : 'Mano vista';
    if (dot) dot.className = 'setup-dot ' + (hand ? 'ok' : on ? 'mid' : err ? 'ko' : '');
    if (txt) txt.textContent = hand ? `${seen} ✓ sei pronto` : err ? err.text
      : on ? (body ? 'Mostra spalle e braccio che colpisce, con la luce davanti' : 'Mostra la mano che colpisce, con polso e avambraccio, con la luce davanti')
      : body ? 'Mettiti a circa 2 m: spalle e braccio nell’inquadratura' : 'Mettiti tra 1 e 4 m: mano, polso e avambraccio ben visibili';
    if (badge){ badge.textContent = on ? (hand ? seen : 'Cerco la mano…') : err ? err.badge : 'Webcam spenta'; badge.classList.toggle('ok', hand); }
    show(go, !on);
    return { on, hand, err };
  }
  /* ---------- pagina «Collega» del menu: QR e tre passi sul telefono ---------- */
  // QR del collegamento in un riquadro (pagina «Collega» e pannello del telefono): cambia a ogni nuovo codice monouso
  renderQr(box, link, key, p = this.phone){
    const L = p.state, url = p.pairingUrl;
    if (!box) return;
    if (p.connected){ if (box.dataset.token !== 'ok'){ box.innerHTML = '<div class="natpf-qr-ok">✓</div>'; box.dataset.token = 'ok'; } }
    else if (url && (L.state === 'waiting' || L.state === 'lost') && box.dataset.token !== p.link.token && window.qrcode){
      const q = window.qrcode(0, 'M'); q.addData(url); q.make();
      box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); box.dataset.url = url; box.dataset.token = p.link.token;
    } else if (!url || L.state === 'starting' || L.state === 'error'){ if (box.dataset.token !== 'wait'){ box.innerHTML = '<div class="natpf-qr-wait">…</div>'; box.dataset.token = 'wait'; } }
    if (link){ link.href = url || '#'; show(link, !!url && !p.connected); }
    void key;
  }
  paintConnect(){
    const p = this.phone, L = p.state, err = PHONE_ERR[L.phone];
    this.renderQr($('connect-qr'), $('connect-link'));
    const certificateButton = $('connect-certificate');
    const certificateOrigin = p.lanOrigin || (new URLSearchParams(location.search).get('lan') === '1' && !/^(localhost|127\.)/.test(location.hostname) ? location.origin : null);
    if (certificateButton){
      certificateButton.hidden = !certificateOrigin || new URLSearchParams(location.search).get('lan') !== '1';
      certificateButton.onclick = () => {
        if (!certificateOrigin || !window.qrcode) return;
        const target = new URL(certificateOrigin); target.protocol = 'http:'; target.port = '8081'; target.pathname = '/'; target.search = ''; target.hash = '';
        const q = window.qrcode(0, 'M'); q.addData(target.href); q.make();
        $('connect-certificate-qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
        $('connect-certificate-url').textContent = target.href;
        $('connect-certificate-dialog').showModal();
      };
    }
    const sensors = p.connected && (L.phone === 'cal' || L.phone === 'ready' || L.phone === 'tut');
    const state = { scan: p.connected ? 'ok' : 'on', sensors: sensors ? 'ok' : err ? 'ko' : p.connected ? 'on' : '', hold: p.ready ? 'ok' : sensors ? 'on' : '' };
    for (const li of document.querySelectorAll('[data-connect]')) li.className = state[li.dataset.connect] || '';
    const w = $('connect-warn');
    const text = err || (L.state === 'lost' ? 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo.' : L.state === 'error' ? `Collegamento non disponibile (${L.error}): controlla la rete e riprova.` : this._localWarning());
    if (w){ w.textContent = text; show(w, !!text); }
    // con un avviso in vista la foto della presa del passo 3 si toglie: a 1280×720 l'avviso finiva sotto la barra in basso
    // (verifica dell'integrazione B15); la presa resta scritta nel passo
    document.querySelector('[data-setup="phone"]')?.classList.toggle('has-warn', !!text);
  }
  _localWarning(){
    const p = this.phone; if (p.connected) return '';
    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) && !new URLSearchParams(location.search).get('phone') && !p.lanOrigin;
    return local ? 'Il gioco è aperto da questo computer (localhost): un telefono vero non può raggiungerlo. Apri il gioco dall’indirizzo di rete in https (npm run dev:https) o da quello pubblicato.'
      : location.protocol !== 'https:' ? 'Questa pagina non è in https: sul telefono i sensori di movimento non funzioneranno. Usa npm run dev:https in LAN o l’indirizzo pubblicato.' : '';
  }
  /* ---------- easter egg: mouse e tastiera per le prove al computer ---------- */
  get desktopInputAllowed(){ return this.testInput || this.controller === 'mouse'; }
  // Filtri sui colpi di tutte le racchette: mouse e tastiera solo in modalità prova; nessun colpo mentre il menu è
  // aperto (dietro gira la dimostrazione: prima un gesto della webcam o del telefono la trasformava in una partita); nessun
  // colpo né lancio con il gioco in pausa (prima restavano in attesa e partivano alla ripresa)
  get menuOpen(){ return !!this.lobby?.visible && !this.training?.active; }
  _gateDesktopInput(){
    const mc = this.engine.motionController; if (!mc) return;
    const gate = fn => (e = {}) => ((/^(keyboard|mouse)$/.test(e.source) && !this.desktopInputAllowed) || (this.menuOpen && e.role !== 'p2' && this.engine.playerRole !== 'p2') || this.engine.natpfPaused ? null : fn(e));
    if (mc._emitSwing) mc._emitSwing = gate(mc._emitSwing.bind(mc));
    if (mc._emitToss) mc._emitToss = gate(mc._emitToss.bind(mc));
  }
  toggleTestInput(){
    this.testInput = !this.testInput; store.set('testInput', this.testInput ? '1' : '');
    if (!this.testInput && this.controller === 'mouse') this.selectController('phone', { open: false });
    this._paintTestInput();
    this.toast(this.testInput ? 'Modalità prova: mouse e tastiera attivi' : 'Modalità prova disattivata');
  }
  _paintTestInput(){
    for (const b of document.querySelectorAll('[data-natpf-controller="mouse"]')) show(b, this.testInput);
    const n = $('lobby-egg-note'); if (n) n.hidden = !this.testInput;
  }
  toast(text){
    const t = $('natpf-toast'); if (!t) return;
    t.textContent = text; show(t); clearTimeout(this._toastT); this._toastT = setTimeout(() => show(t, false), 2600);
  }

  selectController(id, { open = true } = {}){
    this.controller = id; store.set('controller', id);
    const hud = this.engine.hud, mc = this.engine.motionController;
    for (const b of document.querySelectorAll('[data-natpf-controller]')){ b.classList.toggle('selected', b.dataset.natpfController === id); b.setAttribute('aria-checked', String(b.dataset.natpfController === id)); }
    // motore base: inputMode «webcam» accende la webcam all'avvio della partita; telefono e mouse non la usano
    const inputMode = id === 'webcam' ? 'webcam' : id === 'phone' ? 'phone' : 'mouse';
    if (hud) hud.selectedInputMode = inputMode;
    this.engine.matchConfig.inputMode = inputMode;
    if (id === 'webcam' && open) hud?.callbacks?.onSelectInputMode?.('webcam');
    if (id !== 'webcam' && mc?.webcamActive){ mc.disableWebcam(); hud?.updateMotionStatus?.({ webcamActive: false, phoneConnected: this.phone.ready }); }
    if (id === 'phone'){ this.phone.start().catch(err => this._warn(`Collegamento non disponibile (${err.message}).`)); if (open) this.openPhone(); }
    // Player 2 dell'invito: un'altra racchetta si prepara di nuovo (natpf_versus_ui.onController)
    this.versus?.onController?.(id);
    this.paintTiles?.();
  }
  onViewChange(view){
    for (const b of document.querySelectorAll('[data-natpf-view]')){ b.classList.toggle('selected', b.dataset.natpfView === view); b.setAttribute('aria-checked', String(b.dataset.natpfView === view)); }
    const label = $('natpf-view-label'); if (label) label.textContent = view === 'first' ? '1ª persona' : '3ª persona';
  }
  // Con lo smartphone scelto si entra in campo quando la racchetta è pronta (mouse e tastiera restano attivi).
  // B28, calibrazione giocando: con l'opzione dello stand «Giocando» e il telefono, «Gioca» fa partire prima gli scambi di
  // prova (natpf_trial.js) e alla fine la partita, con lo stesso clic rifatto dal gioco (_startMatchNow: il clic passa).
  // Con «Nessuna» niente scambi di prova, ma chi gioca riparte comunque dal profilo semplice (non eredita niente).
  // Non nella sfida tra due computer: lì gli scambi di prova si fanno prima, in campo dopo «Collega» (natpf_lobby,
  // natpf_versus_ui), perché alla partenza l'altro computer aspetta
  _bindStart(){
    $('btn-start-match')?.addEventListener('click', e => {
      if (this._trialPass){ this.wipe(this.lobby?.mode === 'split' ? 'Stesso schermo' : 'Si gioca'); return; }
      // (B35: scambi di prova in corso, la pagina non è in vista: niente partita sopra gli scambi)
      if (this.trial?.active){ e.stopImmediatePropagation(); return; }
      const mode = this.lobby?.mode, cal = readCalMode();
      // (revisione del B28, difetto 4) opzione dello stand cambiata a «Con i gesti» con un telefono rimasto con il
      // profilo dato dal gioco o imparato dagli scambi di prova: non conta come calibrato, rifà i gesti (senza QR)
      if (cal === 'gesti' && this.controller === 'phone') for (const p of mode === 'split' ? (this.split.webcam ? [] : [this.split.phone('p1'), this.split.phone('p2')]) : [this.phone]) p?.demoteIfStale?.();
      // stesso schermo: si parte con i due telefoni pronti; la sessione split nasce qui (natpf_split_ui.js)
      if (mode === 'split'){
        if (!this.split.bothReady()){ e.stopImmediatePropagation(); this.toast(this.split.webcam ? 'La webcam deve vedere le mani di tutti e due: torna a «Racchette»' : 'Servono i due telefoni pronti: torna a «Racchette»'); this.lobby.go('connect'); return; }
        this.split.start();
        if (this.trial.due({ split: true })){ e.stopImmediatePropagation(); this.wipe('Scambi di prova'); this.trial.start({ split: true, then: () => this._startMatchNow() }); return; }
        if (cal === 'none' && !this.split.webcam) for (const id of ['p1', 'p2']){ const p = this.split.phone(id); if (!p?.keepsGesture) p?.freshPlayer?.(); }
        this.wipe('Stesso schermo'); return;
      }
      // sfida tra due computer: si parte solo con il Player 2 entrato e pronto
      if (mode === 'friend' && this.versus?.hostActive && !this.versus.canStart()){ e.stopImmediatePropagation(); this.toast(this.versus.state === 'waiting' ? 'Manda il link al Player 2: la partita parte quando è pronto' : 'Il Player 2 sta scegliendo la racchetta: aspetta «pronto»'); return; }
      if (this.controller === 'phone' && !this.phone.soonReady){ e.stopImmediatePropagation(); this.openPhone({ after: () => $('btn-start-match')?.click() }); return; }
      // (appena finito «Riscaldati prima», che ha già insegnato il colpo di chi gioca: niente scambi di prova, una volta)
      const warmed = !!this.trialSkipOnce && !!this.phone.profile?.trial;
      // B35: contro la CPU gli scambi di prova si fanno prima di questa pagina (natpf_lobby._pageTrial): appena fatti,
      // «Gioca» fa partire subito la partita. Se mancano (pagina raggiunta per un'altra strada), «Gioca» li fa adesso e
      // riporta alla pagina «Pronto per la partita»: la partita parte sempre e solo con «Gioca» (collaudo del 13/11)
      const fresh = !!this.lobby?.pageTrialFresh;
      if (mode !== 'friend' && !warmed && !fresh && this.trial.due({ split: false })){
        e.stopImmediatePropagation(); this.wipe('Scambi di prova');
        if (mode === 'cpu' && this.lobby?._pageTrial?.({ force: true })) return;
        this.trialSkipOnce = false;
        this.trial.start({ split: false, then: () => this._startMatchNow() }); return;
      }
      this.trialSkipOnce = false;
      // la partita parte: gli scambi di prova di prima valgono per questa (la partita dopo li rifà, come dal B28)
      if (mode === 'cpu' && this.lobby) this.lobby.trialPlayed = false;
      // «Nessuna»: profilo semplice da capo a ogni partita (non chi ha appena calibrato apposta con i gesti: per questa partita)
      if (mode !== 'friend' && !warmed && cal === 'none' && this.controller === 'phone' && !this.phone.keepsGesture) this.phone.freshPlayer?.();
      this.wipe(mode === 'friend' ? 'Sfida 1v1' : 'Si gioca');
    }, true);
  }
  // la partita vera dopo gli scambi di prova: lo stesso «Gioca», senza rifare i controlli (il motore base la fa partire)
  _startMatchNow(){
    const b = $('btn-start-match'); if (!b) return;
    this._trialPass = true;
    try { b.disabled = false; b.click(); } finally { this._trialPass = false; }
    this._syncPause();
  }
  // passaggio dal menu al campo: una fascia con il marchio attraversa lo schermo e copre il cambio di scena
  wipe(text = 'Si gioca'){
    const w = $('natpf-wipe'); if (!w) return;
    const t = $('natpf-wipe-text'); if (t) t.textContent = text;
    w.classList.remove('run'); void w.offsetWidth; w.classList.add('run');
    clearTimeout(this._wipeT); this._wipeT = setTimeout(() => w.classList.remove('run'), 1400);
  }

  /* ---------- invito del Player 2 (1v1 tra due computer, relay del motore base) ---------- */
  // La barra dell'invito sta in cima alla lobby e resta in vista dalla racchetta alla partita (natpf_lobby.js decide
  // quando): prima codice e link comparivano solo nell'ultima pagina, dopo racchetta, telefono e riscaldamento, e
  // l'amico non poteva entrare mentre l'host si preparava
  async onRoomCreated(room){
    const box = $('natpf-invite'); if (!box || !room?.roomId) return;
    // in LAN (lan/server.mjs) l'indirizzo di rete del computer al posto di localhost, con ?lan=1 (natpf_lan.js);
    // senza server (sito statico) la stanza vive in questo browser e il P2 si collega in WebRTC (natpf_p2p.js)
    const p2p = room.net === 'p2p';
    const { url, reachable } = await guestInviteUrl(room.roomId, { p2p, format: this.engine.matchFormat?.id });
    // nel frattempo l'host ha scelto un'altra modalità (la stanza è chiusa): niente invito
    if (this.engine.roomId !== room.roomId) return;
    this.inviteUrl = url; box.dataset.pending = '';
    const share = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    // codice da dettare, link da mandare (copia o condividi), una riga con lo stato del Player 2 (natpf_versus_ui.js)
    box.innerHTML = `<div class="versus-code"><span>Sfida un amico · codice</span><b data-room-code>${room.roomId}</b></div>
      <div class="versus-link"><a href="${url}" target="_blank" rel="noopener" data-invite-url>${url}</a><button type="button" class="nt-pill-btn" data-copy>Copia link</button>${share ? '<button type="button" class="nt-pill-btn" data-share>Condividi</button>' : ''}</div>
      <p class="versus-state" data-versus-state data-state="on" aria-live="polite">In attesa del Player 2…</p>
      ${!reachable ? '<small>Il gioco è aperto da localhost: per un altro computer usa l’indirizzo di rete (avvia-lan.cmd lo mostra, es. https://192.168.x.x:8443).</small>' : ''}`;
    box.querySelector('[data-copy]')?.addEventListener('click', ev => { ev.stopPropagation(); navigator.clipboard?.writeText(url).then(() => { ev.target.textContent = 'Copiato ✓'; }).catch(() => {}); });
    // condividi (telefono, alcuni computer): il testo dice di aprirlo sul computer, il telefono servirà come racchetta
    box.querySelector('[data-share]')?.addEventListener('click', ev => {
      ev.stopPropagation();
      navigator.share({ title: 'NATPF Simulator · Sfida un amico', text: `Sfida a tennis: apri il link sul computer (codice ${room.roomId}). Il telefono ti servirà come racchetta.`, url }).catch(() => {});
    });
    this.versus?.paintLobby();
    this.lobby?.paint();
    if (p2p) this._watchP2p();
  }
  // collegamento senza server: lo stato si legge nella barra dell'invito (host) e nel pannello del Player 2
  // (natpf_versus_ui.js); qui l'avviso quando cambia
  _watchP2p(){
    const p2p = this.engine.natpfP2p; if (!p2p?.active || this._p2pOff) return;
    let last = p2p.status;
    this._p2pOff = p2p.onStatus(s => {
      this.versus?.paintLobby(); this.versus?._paintGuest?.();
      // avviso solo sui cambi che contano (collegato / perso), non a ogni tentativo; la rete bloccata la spiegano la
      // barra dell'invito e il pannello del Player 2 (testo lungo, un avviso di 2,6 s non si legge)
      if (s.status !== last && (s.status === 'connected' || s.status === 'lost')) this.toast(p2pStatusText(s.mode, s.status, s.error));
      last = s.status;
    });
  }

  /* ---------- pannello del telefono ---------- */
  // after: cosa fare quando, con il telefono pronto, si chiude il pannello (iniziare la partita o il punto di prova)
  openPhone({ after = null } = {}){
    this.afterReady = after;
    this.phone.start().catch(err => this._warn(`Collegamento non disponibile (${err.message}).`));
    show(this.modal); this.paintPhone(); this._syncPause();
  }
  closePhone(){ show(this.modal, false); this._syncPause(); }
  // Telefono che cade in campo (rete persa, schermo spento) a partita, esercizi o sfida in corso: prima il gioco andava
  // avanti e i colpi si perdevano senza avviso. Se non torna entro mezzo secondo (un ricollegamento normale dura meno)
  // si apre il pannello del telefono, che mette in pausa e dice come ricollegarlo; quando il telefono è di nuovo pronto il
  // pannello aperto così si chiude da solo e si riprende. In calibrazione il campo è già fermo e lo dice il pannello in campo
  _watchPhoneDrop(){
    const ready = this.phone.ready;
    // telefono pronto senza blocco dello schermo (browser che non lo offre, risparmio energetico, permesso negato): dopo
    // il tempo del telefono lo schermo si spegne, la pagina si sospende e i colpi si fermano. Lo si dice una volta per
    // collegamento, prima che succeda (con la pagina nascosta il blocco si rilascia da solo: non è questo il problema)
    const L = this.phone.state, joins = L.joins || 0;
    if (ready && L.vis !== false && (L.wake === 0 || L.wake === -1) && this.wakeWarned !== joins){
      this.wakeWarned = joins;
      this.toast(L.wake === -1 ? 'Questo browser del telefono non tiene acceso lo schermo: disattiva il blocco automatico del telefono' : 'Lo schermo del telefono potrebbe spegnersi: disattiva il risparmio energetico o il blocco automatico');
    }
  }
  // Telefono in campo: pausa appena non è utilizzabile (scollegato, non pronto, pagina nascosta, sensori fermi), ripresa
  // dopo un tratto regolare con il conto alla rovescia, punto rigiocato se si era nello scambio o nel lancio del servizio.
  // Solo chi gioca qui con il telefono, in partita, esercizi o sfida (non nel menu, nella dimostrazione, nella
  // calibrazione del riscaldamento né sul computer del Player 2, che segue l'host)
  _phoneWatchTick(){
    const E = this.engine, p = this.phone;
    if (!p) return;
    const inField = this.controller === 'phone' && !!p.link && !this.lobby?.visible && !E.autoPlayMode && E.playerRole !== 'p2'
      && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(E.phase) && !(this.training?.active && this.training.cal);
    if (!inField && this.phoneWatch.state === 'ok') return;
    const now = performance.now(), h = phoneHealthOf(p, now), rally = E.phase === 'RALLY' || E.phase === 'SERVE_TOSS';
    const a = this.phoneWatch.update(h, { inField, rally, now });
    if (a) this._phoneHoldAction(a);
    else this._refreshPhoneHold();
    // il movimento non arriva da un po' (collegato, telefono pronto): il telefono rifà il collegamento da solo
    if (inField && this.phoneResync.update(h, { paused: this.phoneWatch.state !== 'ok', busy: rally, now }) && p.relink()){
      this.diag?.recorder?.log?.('tel.ricollega', { chi: 'p1', motivo: h.why || h.degraded, auto: true });
    }
  }
  // Webcam in campo: pausa quando la mano non si vede da 1,5 s o la camera si ferma, ripresa con la mano di nuovo vista
  // con continuità e il conto alla rovescia, punto rigiocato (natpf_webcam_watch.js). Solo chi gioca qui con la webcam
  _webcamWatchTick(){
    const E = this.engine, mc = E.motionController;
    if (!mc?.webcamHealth) return;
    const inField = this.controller === 'webcam' && !this.lobby?.visible && !E.autoPlayMode && E.playerRole !== 'p2'
      && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(E.phase) && !(this.training?.active && this.training.cal);
    if (!inField && this.webcamWatch.state === 'ok') return;
    const now = performance.now(), rally = E.phase === 'RALLY' || E.phase === 'SERVE_TOSS';
    const h = webcamHealth(mc.webcamHealth(now), { paused: this.webcamWatch.state !== 'ok', rally });
    const a = this.webcamWatch.update(h, { inField, rally, now });
    if (a) this._holdAction(a, 'webcam');
  }
  _phoneHoldAction(a){ return this._holdAction(a, 'telefono'); }
  _phoneHoldTitle(phone = true){ return phone ? holdTitle(this._splitName('p1')) : 'Webcam in pausa'; }
  // nome del giocatore nello stesso schermo ('' fuori dallo stesso schermo: i testi restano quelli di sempre)
  _splitName(id){ return this.engine.natpfSplit?.active ? this.split?.name?.(id) || (id === 'p2' ? 'Player 2' : 'Player 1') : ''; }
  // B20 (audit B19, punto 10): nello stesso schermo il telefono dell'altro giocatore sa che la partita è ferma e per
  // chi (prima restava su «Pronto · Colpisci quando la palla arriva»). on: pausa cominciata; false: finita (la fase vera
  // gli torna al primo fotogramma). Non a chi è in pausa a sua volta: il suo telefono ha già il suo messaggio
  _tellOtherPhone(owner, on){
    if (!this.engine.natpfSplit?.active || this.split?.webcam) return;
    const other = owner === 'p2' ? this.phone : this.engine.natpfPhone2, otherKey = owner === 'p2' ? 'p1' : 'p2';
    if (!other?.connected || this._holds?.[otherKey]) return;
    if (on){ other.link.send({ t: 'ph', ph: 'pause', txt: otherPhoneNote(this._splitName(owner)) }); other.lastPhase = 'pause'; }
    else other.lastPhase = null;
  }
  // pausa per lo schermo del telefono spento: il riquadro dice da quanto (ogni secondo)
  _refreshPhoneHold(){
    const why = this.phoneHold?.why;
    if (this.phoneWatch.state !== 'paused' || !(why === 'pagina nascosta' || why === 'scollegato') || this.phone.state.vis !== false) return;
    const text = phoneHoldText(this.phone, why);
    if (text !== this.phoneHoldShown){ this.phoneHoldShown = text; this._paintHold(this._phoneHoldTitle(), text, this.relinkAction(this.phone, this._splitName('p1')), 'p1', { phone: this.phone }); }
  }
  // pausa e ripresa per il telefono o la webcam: riquadro sopra il campo, registro, colpi in sospeso cancellati, punto
  // rigiocato se la pausa è arrivata nello scambio o nel lancio
  _holdAction(a, src = 'telefono'){
    const E = this.engine, R = this.diag?.recorder, phone = src === 'telefono';
    if (a.kind === 'pause' || a.kind === 'wait'){
      if (phone) this.phoneHold = { why: a.why }; else this.webcamHold = { why: a.why };
      this._paintHold(this._phoneHoldTitle(phone), phone ? phoneHoldText(this.phone, a.why) : webcamHoldText(a.why), phone ? this.relinkAction(this.phone, this._splitName('p1')) : null, 'p1', { phone: phone ? this.phone : null });
      if (phone) this._tellOtherPhone('p1', true);
      R?.log?.(phone ? 'tel.pausa' : 'webcam.pausa', { ...(phone ? { chi: 'p1' } : {}), motivo: a.why, fase: E.phase });
      // il telefono lo sa (se è collegato): niente colpi durante la pausa, e lo dice sullo schermo
      if (phone && this.phone.connected){ this.phone.link.send({ t: 'ph', ph: 'pause' }); this.phone.lastPhase = 'pause'; }
      // collegamento perso: il pannello del telefono dice come ricollegarlo (QR). Non se è caduto con lo schermo spento: il
      // telefono si ricollega da solo appena torna (B9), lo dice il riquadro della pausa, e il suo pulsante apre il QR
      // Nello stesso schermo niente pannello (B20): il QR sta dentro il riquadro della pausa, uguale per i due giocatori;
      // prima il riquadro copriva un quarto del QR del pannello, e per il Player 2 il QR non c'era
      if (phone && a.why === 'scollegato' && this.phone.state.vis !== false && this.modal?.classList.contains('hidden') && !this.engine.natpfSplit?.active){ this.phoneDropOpened = true; this.openPhone(); }
    }
    if (a.kind === 'countdown') this._paintHold(phone ? holdTitle(this._splitName('p1'), 'ready') : 'Webcam di nuovo pronta', `Si riprende tra ${a.left}…`, null, 'p1', { count: a.left });
    if (a.kind === 'resume'){
      if (phone) this.phoneHold = null; else this.webcamHold = null;
      this._paintHold(null);
      if (phone) this._tellOtherPhone('p1', false);
      if (phone && this.phoneDropOpened){ this.phoneDropOpened = false; if (!this.modal?.classList.contains('hidden')) this.closePhone(); }
      E.pendingUserSwing = null; E.natpfWeakServe = null;
      // il punto lo rigioca chi decide i punti: questo computer, anche l'host del 1v1 in rete (il P2 segue l'host; prima
      // nel 1v1 in rete la pausa del telefono dell'host non rigiocava lo scambio interrotto)
      // (negli scambi di prova niente da rigiocare: la palla dopo arriva da sola)
      const replay = a.replay && !this.trial?.active && E.playerRole !== 'p2' && ['RALLY', 'SERVE_TOSS'].includes(E.phase);
      if (replay){ E._setupPointServe({ showBanner: false }); this.toast(phone ? `Il telefono${this._splitName('p1') ? ' ' + phoneOf(this._splitName('p1')) : ''} si era fermato: il punto si rigioca` : 'La webcam aveva perso la mano: il punto si rigioca'); }
      R?.log?.(phone ? 'tel.ripresa' : 'webcam.ripresa', { rigiocato: replay });
      if (phone) this.phone.lastPhase = null;      // la fase vera torna al telefono al prossimo fotogramma
    }
    this._syncPause();
  }
  // riquadro della pausa del telefono sopra il campo (titolo, testo e un pulsante facoltativo { label, run }), null per
  // toglierlo. Il pulsante: «Ricollega il telefono» nei casi estremi (richiesta del 29/10). owner: di chi è la pausa
  // ('p1' questo computer, 'p2' il telefono del Player 2 nello stesso schermo, natpf_split_ui._watchP2). Con due pause
  // insieme (stesso schermo, due telefoni con lo schermo spento) il riquadro le dice tutte e due, ognuna con il suo
  // pulsante; prima ognuno ridisegnava il riquadro unico con il suo testo e i testi si alternavano ogni secondo, e la
  // ripresa di uno toglieva il riquadro anche se l'altro era ancora in pausa (revisione B9 del 06/11).
  // count: il conto della ripresa di questo telefono (3, 2, 1). Con due pause, chi è di nuovo pronto mentre l'altro è
  // ancora in pausa non dice «Si riprende tra…» (la partita resta ferma finché non è pronto anche l'altro): la sua riga
  // dice di chi è e chi si aspetta (prima «Telefono di nuovo pronto: Si riprende tra 3…» con il P2 ancora spento)
  // phone (B20, audit B19 punto 10): nello stesso schermo il telefono di questa pausa; finché è scollegato il riquadro
  // mostra il suo QR, con il nome, per il Player 1 e per il Player 2 (_paintHoldQr)
  _paintHold(title, text = '', action = null, owner = 'p1', { count = 0, phone = null } = {}){
    this._holds ||= { p1: null, p2: null };
    const key = owner === 'p2' ? 'p2' : 'p1';
    this._holds[key] = title ? { key, title, text, action, count, phone: this.engine.natpfSplit?.active ? phone : null } : null;
    const list = ['p1', 'p2'].map(k => this._holds[k]).filter(Boolean);
    let el = $('natpf-phone-hold');
    if (!list.length){ show(el, false); return; }
    if (!el){
      el = document.createElement('div'); el.id = 'natpf-phone-hold'; el.className = 'natpf-phone-hold hidden'; el.setAttribute('role', 'status');
      el.innerHTML = '<b></b><p></p><div class="hold-qrs hidden" data-hold-qrs>'
        + ['p1', 'p2'].map(k => `<figure class="hidden" data-hold-qr="${k}"><div class="natpf-qr hold-qr"></div><figcaption></figcaption></figure>`).join('')
        + '</div><button type="button" class="hidden"></button><button type="button" class="hidden" data-hold-second></button>';
      document.body.appendChild(el);
    }
    const b1 = el.querySelector('button'), b2 = el.querySelector('[data-hold-second]');
    if (!el._bound){
      el._bound = true;
      for (const [b, k] of [[b1, '_run'], [b2, '_run2']]){
        b?.addEventListener('pointerdown', e => e.stopPropagation());
        b?.addEventListener('click', e => { e.stopPropagation(); try { el[k]?.(); } catch (err){ console.error(err); } });
      }
    }
    const two = list.length > 1, acts = list.map(h => h.action).filter(Boolean);
    el.querySelector('b').textContent = two ? 'Partita in pausa' : list[0].title;
    const line = h => {
      const other = list.find(o => o !== h);
      if (h.count && other && !other.count) return `${h.title}: aspetto il telefono ${phoneOf(this._splitName(other.key) || (other.key === 'p2' ? 'Player 2' : 'Player 1'))}`;
      return `${h.title}: ${h.text}`;
    };
    el.querySelector('p').textContent = two ? list.map(line).join('\n') : list[0].text;
    el.classList.toggle('two', two);
    // con due pause i pulsanti dicono di chi sono (Player 1, Player 2)
    const label = a => two && a.who ? `${a.label} ${phoneOf(a.who)}` : a.label;
    el._run = acts[0]?.run || null; el._run2 = acts[1]?.run || null;
    if (acts[0] && b1) b1.textContent = label(acts[0]); show(b1, !!acts[0]);
    if (acts[1] && b2) b2.textContent = label(acts[1]); show(b2, !!acts[1]);
    show(el);
    this._paintHoldQr();
  }
  // QR dei telefoni scollegati dentro il riquadro della pausa (stesso schermo): uno per giocatore, con il nome. Ridisegnato
  // anche ogni 100 ms (un telefono in pausa per lo schermo spento può scollegarsi dopo; quando torna il QR sparisce)
  _paintHoldQr(){
    const el = $('natpf-phone-hold'); if (!el || el.classList.contains('hidden') || !this._holds) return;
    let any = false;
    for (const k of ['p1', 'p2']){
      const h = this._holds[k], fig = el.querySelector(`[data-hold-qr="${k}"]`); if (!fig) continue;
      const p = h?.phone, on = !!p && !p.connected && !h.count && !!p.pairingUrl;
      show(fig, on);
      if (!on) continue;
      any = true;
      this.renderQr(fig.querySelector('.hold-qr'), null, null, p);
      const cap = `Telefono ${phoneOf(this._splitName(k) || (k === 'p2' ? 'Player 2' : 'Player 1'))}: inquadra questo QR`;
      const fc = fig.querySelector('figcaption'); if (fc.textContent !== cap) fc.textContent = cap;
    }
    show(el.querySelector('[data-hold-qrs]'), any);
    el.classList.toggle('with-qr', any);
  }
  // pulsante «Ricollega il telefono» del riquadro della pausa: il telefono rifà il collegamento (canali nuovi); se non è
  // collegato si ricollega da solo con la sua chiave, oppure con il QR
  relinkAction(phone, who = ''){
    return { label: 'Ricollega il telefono', who, run: () => {
      if (phone?.relink?.()) this.toast(`${who ? who + ': ' : ''}ricollego il telefono…`);
      else if (phone === this.phone && !this.engine.natpfSplit?.active) this.openPhone();
      else this.toast(`${who ? who + ': ' : ''}telefono scollegato, riapri la pagina del gioco sul telefono (si ricollega da solo)`);
    } };
  }
  _bindPhoneModal(){
    const on = (id, fn) => $(id)?.addEventListener('click', e => { e.stopPropagation(); fn(); });
    on('natpf-phone-close', () => { const after = this.afterReady; this.afterReady = null; this.closePhone(); if (after && this.phone.ready) after(); });
    on('natpf-phone-confirm', () => this.phone.confirm());
    on('natpf-phone-retry', () => this.phone.retry());
    on('natpf-phone-invert', () => this.phone.invert());
    on('natpf-phone-skipgrip', () => this.phone.skipGrip());
    on('natpf-phone-recal', () => this.recalibrate());
    // B28: la calibrazione con i gesti resta raggiungibile anche con «Giocando» o «Nessuna»; e si può saltare (profilo semplice)
    on('natpf-phone-gesti', () => this.phone.recalibrate({ gestures: true }));
    on('natpf-phone-skip', () => this.phone.skipCalibration());
    on('natpf-phone-forget', () => { this.phone.forget(); this.qrToken = null; });
    // il pannello non deve far partire swing del mouse sotto
    this.modal?.addEventListener('pointerdown', e => e.stopPropagation());
  }
  // «Ricalibra» (pausa → Telefono, pannello del telefono). B28: con la calibrazione «Giocando», a partita in corso contro
  // la CPU o nello stesso schermo, si rifanno gli scambi di prova (per tutti e due nello stesso schermo) e poi si rigioca
  // il punto, con il punteggio com'era; altrove (menu, minigiochi, sfida tra due computer) il telefono riparte dal profilo
  // semplice e il gioco reimpara dai colpi. Con «Con i gesti» la calibrazione di sempre. true se sono partiti gli scambi di prova
  // una partita è in corso adesso (non il menu, l'allenamento, un minigioco, gli scambi di prova, la schermata finale)
  matchLive(){
    const E = this.engine;
    return !this.lobby?.visible && !E.autoPlayMode && !this.training?.active && !this.events?.active && !this.trial?.active
      && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(E.phase);
  }
  // «Ricalibra» adesso farebbe gli scambi di prova? (in partita, con «Calibrazione: Giocando»: lo usa anche il telecomando)
  recalTrialDue(){
    const E = this.engine, split = !!E.natpfSplit?.active;
    const inMatch = this.matchLive() && E.playerRole !== 'p2' && (split || !E.isMultiplayer);
    return readCalMode() === 'play' && this.controller === 'phone' && inMatch && !!this.phone.soonReady && !(split && this.split?.webcam);
  }
  // B35 (collaudo dell'utente del 13/11): sulla pagina «Pronto per la partita» contro la CPU, con «Giocando», «Ricalibra»
  // rifà gli scambi di prova e riporta alla pagina (la partita parte con «Gioca», come dopo «Collega»)
  recalPageDue(){
    const L = this.lobby;
    return readCalMode() === 'play' && this.controller === 'phone' && !!L?.visible && L.mode === 'cpu' && L.step === 'match' && !this.trial?.active && !!this.phone.soonReady;
  }
  recalibrate(){
    const E = this.engine, split = !!E.natpfSplit?.active;
    if (this.recalTrialDue()){
      this.closePhone(); this.pause?.close?.();
      this.trial.start({ split, resume: true, force: true, then: () => { E._setupPointServe({ showBanner: true }); this._syncPause(); } });
      this.toast('Scambi di prova: poi si rigioca il punto');
      return true;
    }
    // (B35) gli scambi di prova fatti prima valgono per chi c'era: dopo «Ricalibra» il «Gioca» li rifà e torna alla pagina
    if (this.lobby?.mode === 'cpu') this.lobby.trialPlayed = false;
    if (this.recalPageDue()){
      this.closePhone();
      if (this.lobby._pageTrial({ force: true })){ this.wipe('Scambi di prova'); this.toast('Scambi di prova: poi la pagina «Pronto per la partita»'); return true; }
    }
    this.phone.recalibrate();
    return false;
  }
  _warn(text){ const w = $('natpf-phone-warn'); if (w){ w.textContent = text; show(w, !!text); } }
  step(){
    const p = this.phone, L = p.state;
    if (!p.connected) return 'collega';
    if (PHONE_ERR[L.phone]) return 'errore';
    if (L.phone === 'ready') return 'pronto';
    if (L.phone === 'cal'){ const s = p.cal.step; if (s === 'swings' || s === 'shots') return 'prova'; if (s === 'review' || s === 'free') return 'verifica'; return 'impugna'; }
    return 'collega';
  }
  paintPhone(){
    if (!this.modal || this.modal.classList.contains('hidden')) return;
    const p = this.phone, L = p.state, step = this.step(), cal = p.cal;
    const k = STEPS.indexOf(step);
    for (const li of document.querySelectorAll('#natpf-phone-steps li')){ const i = STEPS.indexOf(li.dataset.s); li.className = i === k ? 'on' : (i < k || step === 'pronto') ? 'done' : ''; }
    // QR (cambia a ogni nuovo codice monouso) o spunta quando il telefono è collegato
    this.renderQr($('natpf-qr'), $('natpf-phone-link'));

    let status = 'Preparo la connessione…', hint = '', tag = 'Scansiona il QR';
    if (L.state === 'waiting') status = 'Inquadra il QR con la fotocamera del telefono';
    if (L.state === 'lost'){ status = L.vis === false ? 'Telefono scollegato con lo schermo spento: riaccendilo e torna alla pagina, si ricollega da solo' : 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo'; tag = 'Scollegato'; }
    if (L.state === 'error'){ status = `Connessione non disponibile (${L.error}). Riprova o verifica la connessione a internet.`; tag = 'Errore'; }
    if (step === 'collega' && p.connected){ status = 'Collegato: sul telefono tocca «Attiva i sensori»'; tag = 'Collegato'; }
    if (step === 'impugna'){ status = cal.grip ? 'Presa letta ✓ resta così un attimo…' : `Tieni fermo il telefono. ${GRIP.short}.`; hint = 'Senza stringere: va bene anche da seduti.'; tag = 'Impugnatura'; }
    if (step === 'prova'){ status = 'Fai i gesti che chiede il telefono: un colpetto a sinistra o a destra, poi fermati.'; hint = cal.idle ? 'Non sento movimenti: un gesto più deciso, oppure sul telefono scegli i tocchi.' : 'Basta un gesto naturale.'; tag = 'Calibrazione'; }
    if (step === 'verifica'){
      const r = cal.review;
      if (r && !r.pass){ status = 'Calibrazione da rifare'; hint = REVIEW_FAIL[r.why] || 'Non distinguo i due versi: tieni il telefono allo stesso modo e vai davvero da una parte all’altra.'; }
      else { status = cal.freeOk ? 'Gesto letto ✓ ora conferma la racchetta' : 'Gesti riconosciuti! Prova un colpetto libero…'; hint = 'Verso l’alto alza la palla, un tocco corto e morbido la accorcia.'; }
      tag = 'Verifica';
    }
    if (step === 'pronto'){ status = 'Racchetta pronta ✓'; hint = 'Colpisci quando la palla arriva alla racchetta. Un attimo prima: incrociata; un attimo dopo: lungolinea.'; tag = `Pronto${L.rtt != null ? ` · ${L.rtt} ms` : ''}`; }
    if (step === 'errore'){ status = 'Sensori non disponibili'; hint = PHONE_ERR[L.phone]; tag = 'Errore'; }
    $('natpf-phone-status').textContent = status; $('natpf-phone-hint').textContent = hint;
    const t = $('natpf-phone-tag'); t.textContent = tag; t.classList.toggle('online', step === 'pronto');
    $('natpf-phone-dots').innerHTML = step === 'prova' ? cal.attempts.map(a => `<i class="${a || ''}"></i>`).join('') : '';

    show($('natpf-phone-confirm'), step === 'verifica' && !!cal.review?.pass);
    const confirm = $('natpf-phone-confirm'); if (confirm) confirm.disabled = !cal.freeOk;
    show($('natpf-phone-retry'), step === 'verifica' || step === 'prova');
    show($('natpf-phone-invert'), step === 'verifica');
    show($('natpf-phone-skipgrip'), step === 'impugna');
    show($('natpf-phone-recal'), step === 'pronto' || step === 'errore');
    // B28: «Calibra con i gesti» da pronto (anche con «Giocando»); «Salta la calibrazione» mentre la si fa (mai bloccati)
    show($('natpf-phone-gesti'), step === 'pronto');
    show($('natpf-phone-skip'), step === 'impugna' || step === 'prova' || step === 'verifica');
    show($('natpf-phone-forget'), p.connected);
    $('natpf-phone-close').textContent = this.afterReady && step === 'pronto' ? 'Continua ›' : this.engine.autoPlayMode ? 'Torna alla lobby' : 'Torna al campo';

    this._warn(this._localWarning());
  }
}
