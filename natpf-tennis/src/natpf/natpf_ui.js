// Interfaccia NATPF sopra l'HUD del motore base: scelta della racchetta (smartphone NATPF, webcam del motore base,
// mouse/tastiera del motore base) e della visuale, pannello di collegamento del telefono con le fasi della calibrazione
// NATPF (collega → impugna → prova → verifica → pronto), invito del Player 2 per il 1v1 tra due computer.
// I testi del collegamento seguono quelli di site/js/tennis/main.js.
import { controllerTiles, viewTiles, controllerStatus } from './natpf_tiles.js';
import { NatpfOnboarding } from './natpf_onboarding.js';
import { NatpfLobby } from './natpf_lobby.js';
import { guestInviteUrl } from './natpf_lan.js';
import { NatpfPause } from './natpf_pause.js';
import { NatpfShotFeedback } from './natpf_shot_feedback.js';
import { NatpfHand } from './natpf_hand.js';
import { NatpfTraining } from './natpf_training.js';
import { NatpfDiag } from './natpf_diag.js';
import { NatpfIntro } from './natpf_intro.js';
import { NatpfEvents } from './natpf_events.js';
import { NatpfKiosk } from './natpf_kiosk.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const store = {
  get(k, d){ try { return localStorage.getItem('natpf-tennis.' + k) ?? d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem('natpf-tennis.' + k, v); } catch {} },
};
const CONTROLLERS = ['phone', 'webcam', 'mouse'].map(id => ({ id }));
// testi dello stato della sfida senza server (natpf_p2p.js), per l'host e per il Player 2
export function p2pStatusText(mode, status, error = null){
  const host = mode === 'host';
  switch (status){
    case 'waiting': return 'In attesa del Player 2…';
    case 'connected': return host ? 'Player 2 collegato ✓' : 'Collegato all’host ✓';
    case 'lost': return host ? 'Player 2 scollegato: si ricollega da solo appena torna la rete' : 'Collegamento con l’host perso: mi ricollego…';
    case 'connecting': return 'Mi collego all’host…';
    case 'error': return error === 'stanza' ? 'Stanza non valida: chiedi all’host un nuovo link' : `Collegamento non disponibile (${error || 'rete'}): controlla la connessione a internet${host ? '' : ', riprovo da solo'}`;
    case 'off': return 'Collegamento chiuso';
    default: return 'Preparo il collegamento…';
  }
}
const STEPS = ['collega', 'impugna', 'prova', 'verifica', 'pronto'];
const PHONE_ERR = {
  denied: 'Sul telefono è stato negato l’accesso ai sensori di movimento. Su iPhone ricarica la pagina del telefono e tocca «Consenti»; su Android consenti «Sensori di movimento» dal lucchetto nella barra degli indirizzi.',
  nomotion: 'Il browser del telefono non manda i dati dei sensori di movimento. Usa Chrome su Android o Safari su iPhone e inquadra di nuovo il QR.',
  insecure: 'Il telefono ha aperto la pagina senza https e il browser non dà i sensori. Apri il gioco in https (npm run dev:https in LAN, oppure l’indirizzo pubblicato) e inquadra di nuovo il QR.',
};
const REVIEW_FAIL = {
  servizio: 'Non è stato registrato alcun gesto di servizio. Ripeti senza forzare il movimento oppure scegli i tocchi sul telefono.',
  piccolo: 'Non riesco a distinguere questi gesti dal rumore. Sul telefono scegli movimento compatto o il controllo con i tocchi.',
};

export class NatpfUi {
  constructor(engine){
    this.engine = engine;
    this.phone = engine.natpfPhone;
    // mouse e tastiera solo in modalità prova (easter egg «natpf» nel menu)
    this.testInput = store.get('testInput', '') === '1';
    this.controller = store.get('controller', 'phone');
    if (!CONTROLLERS.some(c => c.id === this.controller) || (this.controller === 'mouse' && !this.testInput)) this.controller = 'phone';
    this.hand = new NatpfHand(engine);
    this.shot = new NatpfShotFeedback(engine);
    this.training = new NatpfTraining(engine, this);
    this.events = new NatpfEvents(engine, this);      // sfide per gli eventi (dopo il riscaldamento: ne avvolge i punti)
    // diagnostica (Maiusc+D o ?diag=1): prima del menu, così il suo tasto arriva anche con il menu aperto
    this.diag = new NatpfDiag(engine, this);
    this._gateDesktopInput();
    this.modal = $('natpf-phone-modal');
    this.qrToken = null;
    this._buildSetup();
    this._bindPhoneModal();
    this._bindStart();
    this.onboarding = new NatpfOnboarding({ getController: () => this.controller, onPractice: () => this.lobby.startPractice(), onOpen: () => this._syncPause(), onClose: () => this._syncPause() });
    this.lobby = this.flow = new NatpfLobby(engine, this, this.onboarding);
    this.pause = new NatpfPause(engine, this);
    this.kiosk = new NatpfKiosk(engine, this);
    // intro all'avvio (marchi, titolo, «Premi un tasto»): poi il menu principale
    this.intro = new NatpfIntro({ onDone: () => { if (this.lobby.visible) this.lobby.go('menu'); } });
    $('btn-play-again')?.addEventListener('click', () => this.wipe('Rivincita'), true);
    this.hand.set(this.hand.hand);
    this.onViewChange(engine.viewMode);
    this.phone.onChange(() => { this.paintPhone(); this.paintTiles(); if (this.lobby?.visible && this.lobby.step === 'connect') this.lobby.paint(); });
    $('btn-natpf-view')?.addEventListener('click', e => { e.stopPropagation(); this.engine.setViewMode(this.engine.viewMode === 'first' ? 'third' : 'first'); });
    // Player 2 arrivato con il link di invito: sceglie racchetta e visuale prima di entrare
    if (engine.playerRole === 'p2' && engine.urlRoom && engine.urlRoom !== 'DEFAULT'){
      show($('natpf-guest-modal'));
      // sfida senza server: stato del collegamento con l'host sotto il titolo
      if (engine.natpfP2p?.mode === 'guest'){ $('natpf-guest-modal')?.querySelector('.sheet-desc')?.insertAdjacentHTML('afterend', '<p class="natpf-p2p-status" data-p2p-status></p>'); this._watchP2p(); }
      $('natpf-guest-go')?.addEventListener('click', () => { show($('natpf-guest-modal'), false); if (this.controller === 'phone' && !this.phone.ready) this.openPhone(); });
    }
    // la scelta salvata vale anche per motore base (webcam accesa all'avvio della partita)
    this.selectController(this.controller, { open: false });
  }

  /* ---------- racchetta e visuale ---------- */
  _buildSetup(){
    for (const box of document.querySelectorAll('[data-natpf-tiles="controller"]')) box.innerHTML = controllerTiles();
    for (const box of document.querySelectorAll('[data-natpf-tiles="view"]')) box.innerHTML = viewTiles();
    // pannello del Player 2: le stesse tessere, compatte
    for (const box of document.querySelectorAll('[data-natpf-setup]')) box.innerHTML = `<p class="lobby-label">Racchetta</p><div class="lobby-tiles compact">${controllerTiles(true)}</div><p class="lobby-label">Visuale</p><div class="lobby-tiles compact lobby-tiles-2">${viewTiles(true)}</div><div class="lobby-row"><span class="lobby-label">Mano</span><div class="lobby-seg" role="radiogroup" aria-label="Mano"><button type="button" class="seg-btn" data-natpf-hand="right">Destra</button><button type="button" class="seg-btn" data-natpf-hand="left">Mancino</button></div></div>`;
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
    const busy = this.onboarding?.isOpen || !this.modal?.classList.contains('hidden') || this.pause?.isOpen;
    this.engine.natpfPaused = !!busy && !this.engine.autoPlayMode && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(this.engine.phase);
  }
  tick(dt = 1/60){ this.training.tick(dt); this.events.tick(dt); this.shot.update(dt); }
  // esito dei colpi del giocatore locale: anello colorato, allenamento; il valore torna al telefono (vibrazione)
  feedback(e = {}){
    if ((e.role || 'p1') !== this.engine.playerRole) return null;
    const q = this.shot.onLocalFeedback(e);
    this.diag?.onFeedback(e, q);
    if (q && e.kind === 'hit'){ this.training.onShot(q); this.events.onShot(q, e); }
    else if (e.kind === 'fault' && /VERY (EARLY|LATE)/.test(e.grade || '')) this.training.onMistime(/EARLY/.test(e.grade));
    return q;
  }
  // game vinti dentro il tabellone (al posto delle caselle negli angoli)
  onScore(score, gamesToWin){
    const el = $('natpf-games-line'); if (!el || !score) return;
    const p2 = this.engine.playerRole === 'p2';
    const me = p2 ? score.opponentGames : score.playerGames, other = p2 ? score.playerGames : score.opponentGames;
    el.innerHTML = `<span>Game</span><b>${me}</b><i>–</i><b>${other}</b><small>${gamesToWin > 1 ? `al meglio di ${gamesToWin*2 - 1}` : 'game secco'}</small>`;
  }
  // dal menu di pausa: fine partita o allenamento, ritorno al menu
  backToMenu(){
    const E = this.engine;
    if (this.training.active){ this.training.stop({ completed: false }); return; }
    this.events.abort();
    E.natpfPaused = false; E.hud.hideVictoryModal?.(); E.hud.hideCenterBanner();
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true });
    E._syncScoreboardHUD(); E._setupMidRallyShowcase({}); E.autoPlayMode = true;
    E.userHasInteracted = false; E.hud.showTitleModal(); this.flow.go('menu');
  }
  /* ---------- webcam nella tappa di preparazione ---------- */
  async startWebcam(){
    const mc = this.engine.motionController; if (!mc) return false;
    const ok = mc.webcamActive || await mc.enableWebcam();
    this.engine.hud?.updateMotionStatus?.({ webcamActive: !!ok, phoneConnected: this.phone.ready });
    const v = $('setup-webcam-video');
    if (v && mc.webcamStream && v.srcObject !== mc.webcamStream){ v.srcObject = mc.webcamStream; v.play?.().catch(() => {}); }
    this.paintWebcamSetup();
    return ok;
  }
  paintWebcamSetup(){
    const mc = this.engine.motionController, on = !!mc?.webcamActive;
    const hand = on && performance.now() - (mc.latestHandSeenAt || -1e9) < 1200;
    const dot = $('setup-cam-dot'), txt = $('setup-cam-text'), badge = $('setup-cam-badge'), go = $('setup-cam-go');
    if (dot) dot.className = 'setup-dot ' + (hand ? 'ok' : on ? 'mid' : '');
    if (txt) txt.textContent = hand ? 'Mano vista ✓ sei pronto' : on ? 'Webcam accesa: mostra la mano che colpisce' : 'Mettiti a 1,5–2 m, mano ben visibile e luce davanti';
    if (badge){ badge.textContent = on ? (hand ? 'Mano vista' : 'Cerco la mano…') : 'Webcam spenta'; badge.classList.toggle('ok', hand); }
    show(go, !on);
    const body = !!this.engine.natpfBody?.enabled;
    for (const b of document.querySelectorAll('[data-natpf-move]')){ const sel = (b.dataset.natpfMove === 'body') === body; b.classList.toggle('selected', sel); b.setAttribute('aria-checked', String(sel)); }
  }
  /* ---------- pagina «Collega» del menu: QR e tre passi sul telefono ---------- */
  // QR del collegamento in un riquadro (pagina «Collega» e pannello del telefono): cambia a ogni nuovo codice monouso
  renderQr(box, link, key){
    const p = this.phone, L = p.state, url = p.pairingUrl;
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
    const sensors = p.connected && (L.phone === 'cal' || L.phone === 'ready');
    const state = { scan: p.connected ? 'ok' : 'on', sensors: sensors ? 'ok' : err ? 'ko' : p.connected ? 'on' : '', hold: p.ready ? 'ok' : sensors ? 'on' : '' };
    for (const li of document.querySelectorAll('[data-connect]')) li.className = state[li.dataset.connect] || '';
    const w = $('connect-warn');
    const text = err || (L.state === 'lost' ? 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo.' : L.state === 'error' ? `Connessione non disponibile (${L.error}). Controlla la rete e riprova.` : this._localWarning());
    if (w){ w.textContent = text; show(w, !!text); }
  }
  _localWarning(){
    const p = this.phone; if (p.connected) return '';
    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) && !new URLSearchParams(location.search).get('phone') && !p.lanOrigin;
    return local ? 'Il gioco è aperto da questo computer (localhost): un telefono vero non può raggiungerlo. Apri il gioco dall’indirizzo di rete in https (npm run dev:https) o da quello pubblicato.'
      : location.protocol !== 'https:' ? 'Questa pagina non è in https: sul telefono i sensori di movimento non funzioneranno. Usa npm run dev:https in LAN o l’indirizzo pubblicato.' : '';
  }
  /* ---------- easter egg: mouse e tastiera per le prove al computer ---------- */
  get desktopInputAllowed(){ return this.testInput || this.controller === 'mouse'; }
  // Due filtri sui colpi di tutte le racchette: mouse e tastiera solo in modalità prova, e nessun colpo mentre il menu è
  // aperto (dietro gira la dimostrazione: prima un gesto della webcam o del telefono la trasformava in una partita).
  get menuOpen(){ return !!this.lobby?.visible && !this.training?.active; }
  _gateDesktopInput(){
    const mc = this.engine.motionController; if (!mc) return;
    const gate = fn => (e = {}) => ((/^(keyboard|mouse)$/.test(e.source) && !this.desktopInputAllowed) || (this.menuOpen && e.role !== 'p2' && this.engine.playerRole !== 'p2') ? null : fn(e));
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
    this.paintTiles?.();
  }
  onViewChange(view){
    for (const b of document.querySelectorAll('[data-natpf-view]')){ b.classList.toggle('selected', b.dataset.natpfView === view); b.setAttribute('aria-checked', String(b.dataset.natpfView === view)); }
    const label = $('natpf-view-label'); if (label) label.textContent = view === 'first' ? '1ª persona' : '3ª persona';
  }
  // Con lo smartphone scelto si entra in campo quando la racchetta è pronta (mouse e tastiera restano attivi).
  _bindStart(){
    $('btn-start-match')?.addEventListener('click', e => {
      if (this.controller === 'phone' && !this.phone.ready){ e.stopImmediatePropagation(); this.openPhone({ after: () => $('btn-start-match')?.click() }); return; }
      this.wipe(this.lobby?.mode === 'friend' ? 'Sfida 1v1' : 'Si gioca');
    }, true);
  }
  // passaggio dal menu al campo: una fascia con il marchio attraversa lo schermo e copre il cambio di scena
  wipe(text = 'Si gioca'){
    const w = $('natpf-wipe'); if (!w) return;
    const t = $('natpf-wipe-text'); if (t) t.textContent = text;
    w.classList.remove('run'); void w.offsetWidth; w.classList.add('run');
    clearTimeout(this._wipeT); this._wipeT = setTimeout(() => w.classList.remove('run'), 1400);
  }

  /* ---------- invito del Player 2 (1v1 tra due computer, relay del motore base) ---------- */
  async onRoomCreated(room){
    const box = $('natpf-invite'); if (!box || !room?.roomId) return;
    // in LAN (lan/server.mjs) l'indirizzo di rete del computer al posto di localhost, con ?lan=1 (natpf_lan.js);
    // senza server (sito statico) la stanza vive in questo browser e il P2 si collega in WebRTC (natpf_p2p.js)
    const p2p = room.net === 'p2p';
    const { url, reachable } = await guestInviteUrl(room.roomId, { p2p, format: this.engine.matchFormat?.id });
    box.innerHTML = `<b>Player 2</b>: apri sull'altro computer <a href="${url}" target="_blank" rel="noopener">${url}</a> <button type="button" class="nt-pill-btn" data-copy>Copia</button>
      ${p2p ? '<small class="natpf-p2p-status" data-p2p-status></small>' : ''}
      ${!reachable ? '<small>Il gioco è aperto da localhost: per un altro computer usa l’indirizzo di rete (avvia-lan.cmd lo mostra, es. https://192.168.x.x:8443).</small>' : ''}`;
    box.querySelector('[data-copy]')?.addEventListener('click', ev => { ev.stopPropagation(); navigator.clipboard?.writeText(url).then(() => { ev.target.textContent = 'Copiato ✓'; }).catch(() => {}); });
    show(box);
    if (p2p) this._watchP2p();
  }
  // stato del collegamento senza server: nell'invito (host) e nel pannello del Player 2, con un avviso quando cambia
  _watchP2p(){
    const p2p = this.engine.natpfP2p; if (!p2p?.active) return;
    const paint = () => {
      const text = p2pStatusText(p2p.mode, p2p.status, p2p.error);
      for (const el of document.querySelectorAll('[data-p2p-status]')){ el.textContent = text; el.dataset.state = p2p.status; }
    };
    paint();
    if (this._p2pOff) return;
    let last = p2p.status;
    this._p2pOff = p2p.onStatus(s => {
      paint();
      // avviso solo sui cambi che contano (collegato / perso), non a ogni tentativo
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
  _bindPhoneModal(){
    const on = (id, fn) => $(id)?.addEventListener('click', e => { e.stopPropagation(); fn(); });
    on('natpf-phone-close', () => { const after = this.afterReady; this.afterReady = null; this.closePhone(); if (after && this.phone.ready) after(); });
    on('natpf-phone-confirm', () => this.phone.confirm());
    on('natpf-phone-retry', () => this.phone.retry());
    on('natpf-phone-invert', () => this.phone.invert());
    on('natpf-phone-skipgrip', () => this.phone.skipGrip());
    on('natpf-phone-recal', () => this.phone.recalibrate());
    on('natpf-phone-forget', () => { this.phone.forget(); this.qrToken = null; });
    // il pannello non deve far partire swing del mouse sotto
    this.modal?.addEventListener('pointerdown', e => e.stopPropagation());
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
    if (L.state === 'waiting') status = 'Inquadra il codice con la fotocamera del telefono';
    if (L.state === 'lost'){ status = 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo'; tag = 'Scollegato'; }
    if (L.state === 'error'){ status = `Connessione non disponibile (${L.error}). Riprova o verifica la connessione a internet.`; tag = 'Errore'; }
    if (step === 'collega' && p.connected){ status = 'Telefono collegato: sul telefono tocca «Attiva i sensori»'; tag = 'Collegato'; }
    if (step === 'impugna'){ status = cal.grip ? 'Telefono in verticale ✓ resta così un attimo…' : 'Tieni il telefono in verticale nel palmo, schermo verso il palmo, come il manico di una racchetta'; hint = 'Presa comoda, senza stringere: va bene anche da seduti.'; tag = 'Impugnatura'; }
    if (step === 'prova'){ status = 'Fai i gesti che chiede il telefono: un colpetto comodo verso sinistra o verso destra, poi fermati.'; hint = cal.idle ? 'Non sento movimenti: prova un gesto più deciso, oppure sul telefono scegli movimento compatto o i tocchi.' : 'Non serve conoscere il tennis: basta un gesto naturale.'; tag = 'Calibrazione'; }
    if (step === 'verifica'){
      const r = cal.review;
      if (r && !r.pass){ status = 'Calibrazione da rifare'; hint = REVIEW_FAIL[r.why] || 'Le due direzioni non si distinguono. Tieni il telefono sempre nello stesso modo e fai gli swing davvero da una parte all’altra.'; }
      else { status = cal.freeOk ? 'Gesto letto ✓ ora conferma la racchetta' : 'Gesti riconosciuti! Prova un colpetto libero con il telefono…'; hint = 'Muovi normalmente per rispondere; accompagna verso l’alto per alzare la palla, un tocco corto e morbido per una palla corta.'; }
      tag = 'Verifica';
    }
    if (step === 'pronto'){ status = 'Racchetta pronta ✓'; hint = 'Colpisci quando la palla arriva alla racchetta: un attimo prima va incrociata, un attimo dopo lungolinea. Dal basso verso l’alto: lob; dall’alto verso il basso: tagliato. Al servizio: un gesto lancia la palla, il secondo la colpisce in alto.'; tag = `Pronto${L.rtt != null ? ` · ${L.rtt} ms` : ''}`; }
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
    show($('natpf-phone-forget'), p.connected);
    $('natpf-phone-close').textContent = this.afterReady && step === 'pronto' ? 'Continua ›' : this.engine.autoPlayMode ? 'Torna alla lobby' : 'Torna al campo';

    this._warn(this._localWarning());
  }
}
