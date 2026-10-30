// Split screen, interfaccia (28/10): pagina «Collega» con un pannello per giocatore e partita con le etichette sotto le
// due metà. Il motore (startSplit/endSplit, natpf_split.js) disegna e arbitra; qui:
//   • i due telefoni: il P1 è quello di sempre (ui.phone), il P2 è il secondo (engine.natpfPhone2, role 'p2'), ognuno
//     con il suo QR. Appena un telefono ha i sensori attivi parte la sua calibrazione, guidata sul telefono stesso
//     (stessi passi del riscaldamento: fermo, due gesti, verifica); verifica riuscita → confermata da sola; non riuscita
//     → si ripete, alla terza si gioca con il profilo semplice. «Gioca senza calibrare» lo fa subito;
//   • la mano di ciascuno (P1: quella del gioco, NatpfHand; P2: la sua, salvata a parte);
//   • in partita: sotto ogni metà nome ed esito dell'ultimo colpo; telefono del P2 che cade → pausa e ripresa con il
//     conto alla rovescia, come per il P1 (natpf_phone_watch.js).
import { NatpfPhoneRacket } from './natpf_phone_racket.js';
import { calPrompt } from './natpf_cal_view.js';
import { createPhoneWatch, createResync, phoneHealthOf, holdText } from './natpf_phone_watch.js';
import { splitVisible } from './natpf_split.js';
import { webcamOpenError } from './natpf_webcam_watch.js';

const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const SPLIT_PLAYERS = Object.freeze(['p1', 'p2']);
// calibrazioni non riuscite di fila prima del profilo semplice
export const SPLIT_CAL_TRIES = 3;
// con che cosa si gioca sullo stesso schermo: due telefoni o una webcam per due (webcam_duo.js; richiesta del 29/10 notte)
export const SPLIT_INPUT_KEY = 'natpf-tennis.splitInput';
export const splitInputOf = v => (v === 'webcam' ? 'webcam' : 'phones');

// Stato di un giocatore con la webcam per due (funzione pura): webcam spenta, mano cercata, mano vista
export function splitCamStatus({ active = false, seen = false, error = null } = {}){
  if (!active) return error ? { state: 'ko', title: error.badge, sub: error.text } : { state: 'wait', title: 'Webcam spenta', sub: 'Accendi la webcam qui sopra' };
  return seen ? { state: 'ok', title: 'Mano vista ✓', sub: 'Pronto: un colpo veloce e dritto è un colpo' } : { state: 'on', title: 'Alza la mano che colpisce', sub: 'Dalla tua parte dell’inquadratura, con il polso visibile' };
}
const PHONE_ERR = { denied: 'Sensori negati sul telefono: ricarica la pagina e consenti', nomotion: 'Il browser del telefono non manda i sensori: usa Chrome (Android) o Safari (iPhone)', insecure: 'Pagina senza https: i sensori non funzionano' };

// Stato di un giocatore nella pagina «Collega» (funzione pura): state 'wait' | 'qr' | 'on' | 'go' | 'ok' | 'ko'
export function splitPlayerStatus(p, hand = 'right'){
  const L = p?.state || { state: 'off' };
  if (!p?.link || L.state === 'off' || L.state === 'starting') return { state: 'wait', title: 'Preparo il QR…', sub: '' };
  if (L.state === 'error') return { state: 'ko', title: 'Collegamento non disponibile', sub: `Controlla la rete e riprova (${L.error || 'errore'})` };
  if (!p.connected) return { state: 'qr', title: 'Inquadra il QR', sub: L.state === 'lost' ? 'Telefono scollegato: riapri la pagina sul telefono' : 'Con la fotocamera del telefono, poi tocca il link' };
  if (PHONE_ERR[L.phone]) return { state: 'ko', title: 'Sensori non disponibili', sub: PHONE_ERR[L.phone] };
  if (p.ready) return { state: 'ok', title: 'Pronto ✓', sub: p.simple ? 'Senza calibrazione: si gioca lo stesso' : 'Racchetta calibrata' };
  if (L.phone !== 'cal') return { state: 'on', title: 'Tocca «Attiva i sensori»', sub: 'Sul telefono; su iPhone poi «Consenti»' };
  const c = calPrompt(p.calView, hand);
  return { state: c.state === 'go' ? 'go' : 'on', title: c.title, sub: c.sub };
}

// Esito di un colpo o di un punto per l'etichetta di una metà (null: niente da dire)
export function splitShotLabel(e = {}){
  const g = String(e.grade || '');
  if (e.kind === 'hit') return /PERFECT|POWER/i.test(g) ? 'Perfetto!' : /EARLY/i.test(g) ? 'In anticipo' : /LATE/i.test(g) ? 'In ritardo' : 'Buono';
  if (e.kind === 'whiff') return /REACH/i.test(g) ? 'Troppo lontana' : 'A vuoto';
  if (e.kind === 'point_won') return 'Punto!';
  return null;
}

export class NatpfSplitUi {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.fails = { p1: 0, p2: 0 };          // verifiche non riuscite di fila
    this.calAsked = { p1: false, p2: false }; // calibrazione già chiesta per questo collegamento
    this.labels = { p1: null, p2: null };     // esito dell'ultimo colpo { text, until }
    this.watch = createPhoneWatch(); this.hold = null; this.resync = createResync();
    let saved = 'phones'; try { saved = localStorage.getItem(SPLIT_INPUT_KEY) || 'phones'; } catch {}
    this.input = splitInputOf(saved);
    const box = document.querySelector('[data-setup="split"]');
    box?.addEventListener('click', e => {
      const inp = e.target.closest('[data-split-input]'); if (inp){ e.stopPropagation(); this.setInput(inp.dataset.splitInput); return; }
      if (e.target.closest('#split-cam-go')){ e.stopPropagation(); this._camOn(); return; }
      const h = e.target.closest('[data-split-hand]'); if (h){ e.stopPropagation(); const [id, hand] = h.dataset.splitHand.split(':'); this.setHand(id, hand); return; }
      const s = e.target.closest('[data-split-skip]'); if (s){ e.stopPropagation(); this.phone(s.dataset.splitSkip)?.skipCalibration(); this.paint(); }
    });
  }
  get session(){ return !!this.engine.natpfSplit?.active; }
  phone(id){ return id === 'p2' ? this.engine.natpfPhone2 : this.ui.phone; }
  hand(id){ return id === 'p2' ? (this.engine.natpfPhone2?.hand || 'right') : this.ui.hand.hand; }
  // secondo telefono (creato la prima volta che si sceglie lo stesso schermo) e collegamenti dei due
  prepare(){
    const E = this.engine;
    if (!E.natpfPhone2) E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
    const p2 = E.natpfPhone2;
    if (this.bound !== p2){
      this.bound = p2;
      p2.onChange(() => { this._resetIfNew('p2'); if (this.ui.lobby?.visible && this.ui.lobby.step === 'connect') this.ui.lobby.paint(); });
      p2.onCal(e => this._onCal('p2', e));
    }
    if (!this.p1Bound){ this.p1Bound = true; this.ui.phone.onCal?.(e => this._onCal('p1', e)); this.ui.phone.onChange(() => this._resetIfNew('p1')); }
    for (const id of SPLIT_PLAYERS) this.phone(id).start().catch(err => this.ui.toast(`Collegamento del ${id.toUpperCase()} non disponibile (${err.message})`));
  }
  get webcam(){ return this.input === 'webcam'; }
  // webcam per due: pronti quando la camera è accesa e ha visto le mani di entrambi (anche non in questo momento: tra la
  // pagina «Collega» e «Gioca» si scelgono le impostazioni); altrimenti i due telefoni pronti
  bothReady(){
    if (this.webcam){ const mc = this.engine.motionController, d = mc?._duo, now = performance.now(); return !!mc?.webcamActive && !!mc.webcamDuo && !!d && SPLIT_PLAYERS.every(id => d.seen(id, now, Infinity)); }
    return SPLIT_PLAYERS.every(id => !!this.phone(id)?.ready);
  }
  // due telefoni o una webcam per due: la scelta si ricorda; con la webcam il P1 gioca con la webcam (controller del
  // gioco) in modalità per due, con i telefoni la webcam per due si spegne
  setInput(v){
    this.input = splitInputOf(v);
    try { localStorage.setItem(SPLIT_INPUT_KEY, this.input); } catch {}
    this.applyInput();
    this.ui.lobby?.paint?.();
  }
  applyInput(){
    const mc = this.engine.motionController;
    if (this.webcam){ mc?.setWebcamDuo?.(true); if (mc) mc.p2HandPreference = this.hand('p2'); this.ui.selectController?.('webcam', { open: false }); this._camOn(); }
    else { mc?.setWebcamDuo?.(false); this.ui.selectController?.('phone', { open: false }); }
    this.paint();
  }
  async _camOn(){
    const mc = this.engine.motionController; if (!mc) return false;
    mc.setWebcamDuo?.(true);
    const ok = mc.webcamActive || await mc.enableWebcam();
    this.paint();
    return ok;
  }
  setHand(id, hand){
    if (id === 'p2'){ this.engine.natpfPhone2?.setHand(hand); this.ui.hand.mirrorRemote?.(this.engine.opponent, hand); if (this.engine.motionController) this.engine.motionController.p2HandPreference = hand; }
    else { this.ui.hand.set(hand); this.ui.paintTiles?.(); }
    this.paint();
  }
  // nuovo collegamento (pagina del telefono ricaricata o altro telefono): la calibrazione si chiede di nuovo
  _resetIfNew(id){
    const p = this.phone(id), joins = p?.state?.joins || 0, key = `${id}Joins`;
    if (this[key] !== joins){ this[key] = joins; this.calAsked[id] = false; this.fails[id] = 0; }
  }
  // calibrazione guidata dal telefono: si conferma da sola se riesce, si ripete se no (poi profilo semplice). Anche a
  // partita in corso: sessione del 29/10, schermo del telefono spento, «Ricalibra» sul telefono, calibrazione rifatta e
  // il telefono restava su «Guarda il computer e conferma» (nessuno confermava: lo faceva solo la pagina «Collega»)
  _onCal(id, e){
    if (!this.session && !(this.ui.lobby?.visible && this.ui.lobby.mode === 'split')) return;
    const p = this.phone(id);
    if (e?.kind === 'review'){
      if (e.pass){ this.fails[id] = 0; p.confirm(); }
      else if (++this.fails[id] >= SPLIT_CAL_TRIES){ p.skipCalibration(); this.ui.toast(`${id === 'p1' ? 'Player 1' : 'Player 2'}: si gioca senza calibrazione`); }
      else setTimeout(() => p.cal?.step === 'review' && p.retry(), 1600);
    }
    this.paint();
  }
  // pagina «Collega»: si chiede la calibrazione appena il telefono ha i sensori attivi
  _drive(id){
    const p = this.phone(id); if (!p) return;
    const L = p.state;
    if (p.connected && L.phone === 'cal' && !p.ready && !this.calAsked[id] && p.calView?.stage === 'off'){ this.calAsked[id] = true; p.recalibrate(); }
  }
  paint(){
    const box = document.querySelector('[data-setup="split"]'), cam = this.webcam, mc = this.engine.motionController, now = performance.now();
    if (box) box.dataset.input = this.input;
    for (const b of document.querySelectorAll('[data-split-input]')){ const on = b.dataset.splitInput === this.input; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    if (cam){
      const v = $('split-webcam-video');
      if (v && mc?.webcamStream && v.srcObject !== mc.webcamStream){ v.srcObject = mc.webcamStream; v.play?.().catch(() => {}); }
      // riquadro nel formato vero della camera (16:9, 4:3…): la linea di mezzo è la metà dell'immagine
      const view = v?.parentElement;
      if (view && v.videoWidth > 0 && v.videoHeight > 0){ const ar = `${v.videoWidth} / ${v.videoHeight}`; if (view.style.aspectRatio !== ar) view.style.aspectRatio = ar; }
      show($('split-cam-go'), !mc?.webcamActive);
    }
    for (const id of SPLIT_PLAYERS){
      const p = this.phone(id); if (!p) continue;
      const st = cam ? splitCamStatus({ active: !!mc?.webcamActive, seen: !!mc?._duo?.seen(id, now), error: mc?.webcamActive ? null : webcamOpenError(mc?.webcamError) }) : (this._drive(id), this.ui.renderQr($(`split-qr-${id}`), $(`split-link-${id}`), null, p), splitPlayerStatus(p, this.hand(id)));
      const el = $(`split-status-${id}`);
      if (el){
        el.dataset.state = st.state;
        const b = el.querySelector('b'), s = el.querySelector('span');
        if (b.textContent !== st.title) b.textContent = st.title;
        if (s.textContent !== st.sub) s.textContent = st.sub;
      }
      for (const btn of document.querySelectorAll(`[data-split-hand^="${id}:"]`)){ const on = btn.dataset.splitHand.endsWith(':' + this.hand(id)); btn.classList.toggle('selected', on); btn.setAttribute('aria-pressed', String(on)); }
      show(document.querySelector(`[data-split-skip="${id}"]`), !cam && p.connected && !p.ready && p.state.phone === 'cal');
      document.querySelector(`[data-split-player="${id}"]`)?.classList.toggle('ready', cam ? st.state === 'ok' : !!p.ready);
    }
  }
  // «Gioca»: sessione split nel motore, mano del P2 sul suo personaggio
  start(){
    if (!this.engine.startSplit()) return false;
    this.ui.hand.mirrorRemote?.(this.engine.opponent, this.hand('p2'));
    this.labels = { p1: null, p2: null };
    return true;
  }
  end(){
    if (!this.session && !this.hold) return;
    this.engine.endSplit?.(); if (this.hold){ this.hold = null; this.ui._paintHold?.(null); } show($('natpf-split-hud'), false);
  }
  // esiti dei colpi (motore → aptica): etichetta della metà di chi ha colpito
  onFeedback(e = {}){
    if (!this.session) return;
    const text = splitShotLabel(e), id = e.role === 'p2' ? 'p2' : 'p1';
    if (text) this.labels[id] = { text, until: performance.now() + 1600 };
  }
  // ogni 100 ms (natpf_ui): telefono del P2 in campo e etichette delle due metà
  tick(){
    const E = this.engine, on = this.session && splitVisible(E);
    const hud = $('natpf-split-hud'); show(hud, on);
    if (on){
      const now = performance.now();
      for (const id of SPLIT_PLAYERS){
        const tag = hud.querySelector(`[data-split-tag="${id}"] span`), p = this.webcam ? null : this.phone(id);
        const lbl = this.labels[id] && now < this.labels[id].until ? this.labels[id].text : '';
        const text = p && !p.ready ? 'Telefono in pausa' : lbl;
        if (tag && tag.textContent !== text) tag.textContent = text;
        tag?.parentElement?.classList.toggle('warn', !!p && !p.ready);
      }
    }
    // con la webcam per due il telefono del P2 non c'è: niente pausa per lui (la webcam ha la sua, natpf_webcam_watch)
    this._watchP2(on && !this.webcam);
  }
  // Telefono del P2 in partita: stessa salute, stessa pausa e stessa ripresa del P1 (natpf_phone_watch.js): punto
  // rigiocato se la pausa è arrivata nello scambio o nel lancio, ricollegamento automatico e pulsante «Ricollega il
  // telefono». Diagnostica del 29/10 (stesso schermo): partita ferma 16 s per il P2 con il telefono su «Pronto», poi lo
  // scambio è ripartito da dove era fermo e il punto è andato al P2 (il P1 non era pronto)
  _watchP2(inField){
    const E = this.engine, p = E.natpfPhone2;
    if (!p || (!inField && this.watch.state === 'ok')) return;
    const now = performance.now(), h = phoneHealthOf(p, now), rally = E.phase === 'RALLY' || E.phase === 'SERVE_TOSS';
    const a = this.watch.update(h, { inField, rally, now });
    const R = this.ui.diag?.recorder;
    if (inField && this.resync.update(h, { paused: this.watch.state !== 'ok', busy: rally, now }) && p.relink()) R?.log?.('tel.ricollega', { chi: 'p2', motivo: h.why || h.degraded, auto: true });
    if (!a) return;
    if (a.kind === 'pause' || a.kind === 'wait'){
      this.hold = { why: a.why };
      this.ui._paintHold('Telefono del Player 2 in pausa', holdText(a.why), this.ui.relinkAction?.(p, 'Player 2'));
      R?.log?.('tel.pausa', { chi: 'p2', motivo: a.why, fase: E.phase, ...(h.gapMs ? { gapMs: h.gapMs } : {}), ...(Number.isFinite(p.state.sensorAge) ? { sensoriTelefonoMs: p.state.sensorAge } : {}) });
      if (p.connected){ p.link.send({ t: 'ph', ph: 'pause' }); p.lastPhase = 'pause'; }
    }
    if (a.kind === 'countdown') this.ui._paintHold('Telefono del Player 2 di nuovo pronto', `Si riprende tra ${a.left}…`);
    if (a.kind === 'resume'){
      this.hold = null; this.ui._paintHold(null); E.pendingP2Swing = null; E.pendingUserSwing = null; p.lastPhase = null;
      const replay = a.replay && ['RALLY', 'SERVE_TOSS'].includes(E.phase);
      if (replay){ E._setupPointServe({ showBanner: false }); this.ui.toast?.('Il telefono del Player 2 si era fermato: il punto si rigioca'); }
      R?.log?.('tel.ripresa', { chi: 'p2', rigiocato: replay });
    }
    this.ui._syncPause();
  }
}
