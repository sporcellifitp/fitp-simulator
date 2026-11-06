// Split screen, interfaccia (28/10): pagina «Collega» con un pannello per giocatore e partita con le etichette sotto le
// due metà. Il motore (startSplit/endSplit, natpf_split.js) disegna e arbitra; qui:
//   • i due telefoni: il P1 è quello di sempre (ui.phone), il P2 è il secondo (engine.natpfPhone2, role 'p2'), ognuno
//     con il suo QR. Appena un telefono ha i sensori attivi parte la sua calibrazione, guidata sul telefono stesso
//     (stessi passi del riscaldamento: fermo, due gesti, verifica); verifica riuscita → confermata da sola; non riuscita
//     → si ripete, alla terza si gioca con il profilo semplice. «Gioca senza calibrare» lo fa subito;
//   • la mano di ciascuno (P1: quella del gioco, NatpfHand; P2: la sua, salvata a parte);
//   • in partita: sotto ogni metà nome ed esito dell'ultimo colpo; telefono del P2 che cade → pausa e ripresa con il
//     conto alla rovescia, come per il P1 (natpf_phone_watch.js);
//   • «pronto» di ciascuno (B9, 05/11; natpf_ready.js): ogni metà è la scheda del giocatore, con il suo nome e uno di
//     quattro stati (in attesa · si prepara · pronto · problema) con colore, icona e parola; sotto, la barra dell'avvio
//     dice chi manca. Quando tutti e due sono pronti e hanno chiuso il tutorial parte un conto alla rovescia di 3 s
//     (grande sul computer e annunciato sui telefoni, messaggio «ev count»), poi si gioca da soli, senza toccare il
//     computer. Un telefono che cade (o il tutorial riaperto) annulla il conto e la barra dice perché; «Aspetta» o Esc
//     lo fermano. Prima la lobby saltava muta a «Partita» dopo 0,7 s, dove serviva comunque «Gioca».
import { NatpfPhoneRacket } from './natpf_phone_racket.js';
import { calPrompt } from './natpf_cal_view.js';
import { createPhoneWatch, createResync, phoneHealthOf, holdText } from './natpf_phone_watch.js';
import { splitVisible } from './natpf_split.js';
import { webcamOpenError } from './natpf_webcam_watch.js';

import { NatpfTutorial, TUTORIAL_CARDS } from './natpf_tutorial.js';
import { getGestureDemo } from './natpf_gesture_demo.js';
import { slotView, splitSlot, startGate, waitingText, bothNames, cancelText, createCountdown, paintSlot, paintBoard, defaultName, READY_COUNTDOWN_MS } from './natpf_ready.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
export const SPLIT_PLAYERS = Object.freeze(['p1', 'p2']);
// calibrazioni non riuscite di fila prima del profilo semplice
export const SPLIT_CAL_TRIES = 3;
// con che cosa si gioca sullo stesso schermo: due telefoni o una webcam per due (webcam_duo.js; richiesta del 29/10 notte)
export const SPLIT_INPUT_KEY = 'natpf-tennis.splitInput';
export const splitInputOf = v => (v === 'webcam' ? 'webcam' : 'phones');
// conto alla rovescia prima della partita (natpf_ready.READY_COUNTDOWN_MS) e quanto resta in vista il motivo di un conto
// annullato
export const SPLIT_COUNTDOWN_MS = READY_COUNTDOWN_MS;
export const SPLIT_CANCEL_SHOW_MS = 8000;

// Stato di un giocatore con la webcam per due (funzione pura): webcam spenta, mano cercata, mano vista
// (detail: la parte breve, per il distintivo della scheda, natpf_ready.splitSlot)
export function splitCamStatus({ active = false, seen = false, error = null } = {}){
  if (!active) return error ? { state: 'ko', title: error.badge, sub: error.text, detail: error.badge } : { state: 'wait', title: 'Webcam spenta', sub: 'Accendi la webcam qui sopra', detail: 'Webcam spenta' };
  return seen ? { state: 'ok', title: 'Mano vista ✓', sub: 'Pronto: un colpo veloce e dritto è un colpo', detail: 'Mano vista' } : { state: 'on', title: 'Alza la mano che colpisce', sub: 'Dalla tua parte dell’inquadratura, con il polso visibile', detail: 'Alza la mano' };
}
// posizione della linea del confine nel riquadro della camera (specchiato come lo schermo): CSS left; metà se manca
export const splitCamLine = split => `${(100*(Number.isFinite(split) ? Math.max(0, Math.min(1, split)) : .5)).toFixed(1)}%`;
const PHONE_ERR = { denied: 'Sensori negati sul telefono: ricarica la pagina e consenti', nomotion: 'Il browser del telefono non manda i sensori: usa Chrome (Android) o Safari (iPhone)', insecure: 'Pagina senza https: i sensori non funzionano' };

// Stato di un giocatore nella pagina «Collega» (funzione pura): state 'wait' | 'qr' | 'on' | 'go' | 'tut' | 'ok' | 'ko';
// detail: la parte breve, per il distintivo della scheda (natpf_ready.splitSlot); lost: telefono che c'era e si è perso.
// tut: tutorial aperto nella metà di questo giocatore ({ i, n }: scheda mostrata e schede). Prima, con il tutorial
// aperto, la metà diceva «Tocca «Attiva i sensori»» anche con i sensori già attivi (analisi B9 D, §2.2)
export function splitPlayerStatus(p, hand = 'right', { tut = null } = {}){
  const L = p?.state || { state: 'off' };
  if (!p?.link || L.state === 'off' || L.state === 'starting') return { state: 'wait', title: 'Preparo il QR…', sub: '', detail: 'Preparo il QR' };
  if (L.state === 'error') return { state: 'ko', title: 'Collegamento non disponibile', sub: `Controlla la rete e riprova (${L.error || 'errore'})`, detail: 'Collegamento non disponibile' };
  if (!p.connected) return L.state === 'lost' ? { state: 'qr', lost: true, title: 'Inquadra il QR', sub: 'Telefono scollegato: riapri la pagina sul telefono', detail: 'Telefono scollegato' }
    : { state: 'qr', title: 'Inquadra il QR', sub: 'Con la fotocamera del telefono, poi tocca il link', detail: 'Inquadra il QR' };
  if (PHONE_ERR[L.phone]) return { state: 'ko', title: 'Sensori non disponibili', sub: PHONE_ERR[L.phone], detail: 'Sensori non disponibili' };
  if (tut){
    const n = Math.max(1, tut.n || 1), i = Math.min(n, Math.max(1, tut.i || 1));
    return { state: 'tut', title: 'Guarda il tutorial', sub: `Scheda ${i} di ${n}. Poi sul telefono «Tutto chiaro, ho capito».`, detail: `Tutorial ${i}/${n}` };
  }
  if (p.ready) return { state: 'ok', title: 'Pronto ✓', sub: p.simple ? 'Senza calibrazione: si gioca lo stesso' : 'Racchetta calibrata', detail: p.simple ? 'Senza calibrazione' : 'Calibrato' };
  if (L.phone !== 'cal') return { state: 'on', title: 'Tocca «Attiva i sensori»', sub: 'Sul telefono; su iPhone poi «Consenti»', detail: 'Attiva i sensori' };
  const c = calPrompt(p.calView, hand);
  return { state: c.state === 'go' ? 'go' : 'on', title: c.title, sub: c.sub, detail: 'Calibrazione' };
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
    // tutorial di ciascun giocatore nella sua metà della pagina «Collega» (richiesta del 04/11): indipendenti, si chiudono
    // dal proprio telefono; l'animazione 3D (una sola) la ha la prima metà che l'ha chiesta, l'altra foto e indicazioni
    this.tutOpen = { p1: false, p2: false }; this.tutSeen = { p1: false, p2: false }; this.demoOwner = null;
    this.tut = {};
    for (const id of SPLIT_PLAYERS) this.tut[id] = typeof document !== 'undefined' ? new NatpfTutorial($(`split-tut-${id}`), { half: true, demo: () => getGestureDemo(), canDemo: () => this.demoOwner === id }) : null;
    let saved = 'phones'; try { saved = localStorage.getItem(SPLIT_INPUT_KEY) || 'phones'; } catch {}
    this.input = splitInputOf(saved);
    // conto alla rovescia prima della partita: left (secondi), running, held («Aspetta»), why (motivo dell'annullamento)
    this.countdown = createCountdown({ ms: SPLIT_COUNTDOWN_MS });
    this.cd = { left: 0, running: false, held: false, why: null, whyUntil: 0 };
    const box = document.querySelector('[data-setup="split"]');
    engine.natpfSplitNames = { p1: 'Player 1', p2: 'Player 2' };
    box?.addEventListener('input', e => {
      const id = e.target.dataset.splitName; if (!['p1', 'p2'].includes(id)) return;
      engine.natpfSplitNames[id] = e.target.value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) || (id === 'p1' ? 'Player 1' : 'Player 2');
      for (const el of document.querySelectorAll(`[data-split-tag="${id}"] b`)) el.textContent = engine.natpfSplitNames[id];
      this.paint();
    });
    // conto alla rovescia: «Aspetta» (nella barra e nel riquadro grande) e «Gioca» (dopo «Aspetta»)
    const startActions = e => {
      if (e.target.closest('[data-split-hold]')){ e.stopPropagation(); this.holdCountdown(); return true; }
      if (e.target.closest('[data-split-play]')){ e.stopPropagation(); this.playNow(); return true; }
      return false;
    };
    $('split-countdown')?.addEventListener('click', startActions);
    $('split-countdown')?.addEventListener('pointerdown', e => e.stopPropagation());
    box?.addEventListener('click', e => {
      if (startActions(e)) return;
      const inp = e.target.closest('[data-split-input]'); if (inp){ e.stopPropagation(); this.setInput(inp.dataset.splitInput); return; }
      if (e.target.closest('#split-cam-go')){ e.stopPropagation(); this._camOn(); return; }
      const h = e.target.closest('[data-split-hand]'); if (h){ e.stopPropagation(); const [id, hand] = h.dataset.splitHand.split(':'); this.setHand(id, hand); return; }
      const s = e.target.closest('[data-split-skip]'); if (s){ e.stopPropagation(); this._tutDone(s.dataset.splitSkip); this.phone(s.dataset.splitSkip)?.skipCalibration(); this.paint(); }
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
      p2.onChange(() => { this._resetIfNew('p2'); this._repaint(); });
      p2.onCal(e => this._onCal('p2', e));
      p2.onTutorial?.(() => this._tutDone('p2'));
    }
    if (!this.p1Bound){ this.p1Bound = true; this.ui.phone.onCal?.(e => this._onCal('p1', e)); this.ui.phone.onChange(() => { this._resetIfNew('p1'); this._repaint(); }); this.ui.phone.onTutorial?.(() => this._tutDone('p1')); }
    for (const id of SPLIT_PLAYERS) this.phone(id).start().catch(err => this.ui.toast(`Collegamento del ${id.toUpperCase()} non disponibile (${err.message})`));
  }
  // un telefono cambia (collegato, pronto, perso): la scheda si aggiorna subito, non al prossimo giro della lobby (300 ms)
  _repaint(){ const L = this.ui.lobby; if (L?.visible && L.mode === 'split' && (L.step === 'connect' || L.step === 'match')) L.paint(); }
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
    if (this[key] !== joins){ this[key] = joins; this.calAsked[id] = false; this.fails[id] = 0; this.tutSeen[id] = false; }
  }
  // calibrazione guidata dal telefono: si conferma da sola se riesce, si ripete se no (poi profilo semplice). Anche a
  // partita in corso: sessione del 29/10, schermo del telefono spento, «Ricalibra» sul telefono, calibrazione rifatta e
  // il telefono restava su «Guarda il computer e conferma» (nessuno confermava: lo faceva solo la pagina «Collega»)
  _onCal(id, e){
    if (!this.session && !(this.ui.lobby?.visible && this.ui.lobby.mode === 'split')) return;
    const p = this.phone(id);
    if (this.tutOpen[id] && !p.tutSupported && e?.kind === 'step') this._tutDone(id);
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
    // telefono collegato: prima il tutorial nella sua metà (una volta per giocatore); il telefono aspetta «ho capito»
    if (p.connected && !this.tutSeen[id] && !this.tutOpen[id] && !this.webcam) this._tutOpen(id);
    if (!p.connected && this.tutOpen[id]) this._tutClose(id);
    if (this.tutOpen[id]) return;
    if (p.connected && L.phone === 'cal' && !p.ready && !this.calAsked[id] && p.calView?.stage === 'off'){ this.calAsked[id] = true; p.recalibrate(); }
  }
  _tutOpen(id){
    this.tutOpen[id] = true;
    // collegamento di questo giocatore: solo uno nuovo (altro telefono, pagina ricaricata) fa rivedere il tutorial
    this[`${id}Joins`] = this.phone(id)?.state?.joins || 0;
    if (!this.demoOwner) this.demoOwner = id;
    this.phone(id).waitTutorial?.(true);
    const name = this.engine.natpfSplitNames?.[id] || (id === 'p1' ? 'Player 1' : 'Player 2');
    this.tut[id]?.openFor({ mode: 'phone', player: name, hand: this.hand(id), wait: 'Sul tuo telefono tocca «Tutto chiaro, ho capito»: poi si calibra.' });
  }
  // chiusa dal telefono di quel giocatore (o dal telefono di prima che calibra da solo): solo la sua metà
  _tutDone(id){
    if (!this.tutOpen[id]) return;
    this.tutSeen[id] = true; this._tutClose(id);
    this.paint();
  }
  _tutClose(id){
    this.tutOpen[id] = false;
    this.phone(id)?.waitTutorial?.(false);
    this.tut[id]?.close('phone');
    // l'animazione 3D passa all'altra metà, se ha il tutorial aperto
    if (this.demoOwner === id){ const other = id === 'p1' ? 'p2' : 'p1'; this.demoOwner = this.tutOpen[other] ? other : null; if (this.demoOwner) this.tut[other]?.paint(); }
  }
  // si esce dalla pagina «Collega» (partita, menu): le modali delle metà si chiudono, i telefoni non aspettano più
  closeTutorials(){ for (const id of SPLIT_PLAYERS) if (this.tutOpen[id]) this._tutClose(id); }
  paint(){
    const box = document.querySelector('[data-setup="split"]'), cam = this.webcam, mc = this.engine.motionController, now = performance.now();
    if (box) box.dataset.input = this.input;
    for (const b of document.querySelectorAll('[data-split-input]')){ const on = b.dataset.splitInput === this.input; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    if (cam){
      const v = $('split-webcam-video');
      if (v && mc?.webcamStream && v.srcObject !== mc.webcamStream){ v.srcObject = mc.webcamStream; v.play?.().catch(() => {}); }
      // riquadro nel formato vero della camera (16:9, 4:3…); la linea è il confine tra le corsie dei due giocatori, che si
      // sposta con loro tra 0,3 e 0,7 dell'immagine (webcam_duo.split; prima restava fissa a metà)
      const view = v?.parentElement;
      if (view && v.videoWidth > 0 && v.videoHeight > 0){ const ar = `${v.videoWidth} / ${v.videoHeight}`; if (view.style.aspectRatio !== ar) view.style.aspectRatio = ar; }
      const mid = view?.querySelector('.split-cam-mid');
      if (mid){ const left = splitCamLine(mc?._duo?.split?.()); if (mid.style.left !== left) mid.style.left = left; }
      show($('split-cam-go'), !mc?.webcamActive);
    }
    for (const id of SPLIT_PLAYERS){
      const p = this.phone(id); if (!p) continue;
      if (!cam){ this._drive(id); this.ui.renderQr($(`split-qr-${id}`), $(`split-link-${id}`), null, p); }
      const st = this.status(id, now);
      const el = $(`split-status-${id}`);
      if (el){
        el.dataset.state = st.state;
        const b = el.querySelector('b'), s = el.querySelector('span');
        if (b.textContent !== st.title) b.textContent = st.title;
        if (s.textContent !== st.sub) s.textContent = st.sub;
      }
      for (const btn of document.querySelectorAll(`[data-split-hand^="${id}:"]`)){ const on = btn.dataset.splitHand.endsWith(':' + this.hand(id)); btn.classList.toggle('selected', on); btn.setAttribute('aria-pressed', String(on)); }
      show(document.querySelector(`[data-split-skip="${id}"]`), !cam && p.connected && !p.ready && p.state.phone === 'cal' && !this.tutOpen[id]);
      // scheda del giocatore: nome, distintivo (in attesa · si prepara · pronto · problema), bordo; .ready per il QR
      const card = document.querySelector(`[data-split-player="${id}"]`), v = this.slot(id, now, st);
      card?.classList.toggle('ready', v.state === 'ready');
      paintSlot(card, v);
    }
    this._paintStart(now);
  }
  /* ---------- stato «pronto» delle schede e conto alla rovescia (B9, natpf_ready.js) ---------- */
  name(id){ return this.engine.natpfSplitNames?.[id] || defaultName(id); }
  // scheda mostrata del tutorial di questo giocatore (1…n), per «Tutorial 3/11»
  tutInfo(id){ const t = this.tut[id]; return { i: (t?.state?.idx ?? 0) + 1, n: TUTORIAL_CARDS.length }; }
  // stato del telefono (o della webcam per due) di un giocatore, come lo dice la sua metà
  status(id, now = performance.now()){
    const mc = this.engine.motionController;
    if (this.webcam) return splitCamStatus({ active: !!mc?.webcamActive, seen: !!mc?._duo?.seen(id, now), error: mc?.webcamActive ? null : webcamOpenError(mc?.webcamError) });
    return splitPlayerStatus(this.phone(id), this.hand(id), { tut: this.tutOpen[id] ? this.tutInfo(id) : null });
  }
  // scheda: con la webcam per due si è pronti da quando la webcam ha visto la mano (come bothReady), anche se adesso è
  // fuori dall'inquadratura; con il telefono, pronto e tutorial chiuso
  slot(id, now = performance.now(), st = this.status(id, now)){
    const mc = this.engine.motionController;
    if (this.webcam && mc?.webcamActive && mc._duo?.seen?.(id, now, Infinity)) return slotView({ id, name: this.name(id), state: 'ready', detail: 'Mano vista' });
    return slotView({ id, name: this.name(id), ...splitSlot(st) });
  }
  slots(now = performance.now()){ return SPLIT_PLAYERS.map(id => this.slot(id, now)); }
  get countdownRunning(){ return this.cd.running; }
  // ai telefoni (pagina del telefono: racchetta.js, «ev» con k 'count'): n = 3, 2, 1 e 0 (si gioca), stop con il motivo.
  // Le pagine del telefono di prima ignorano il messaggio (k sconosciuto): nessun problema di versioni
  _announce(m){
    if (this.webcam) return;
    for (const id of SPLIT_PLAYERS){ const p = this.phone(id); if (p?.connected) p.link?.send?.({ t: 'ev', k: 'count', ...m }); }
  }
  // Ogni 100 ms (tick): nella pagina «Collega» dello stesso schermo, con tutti e due pronti (e il tutorial chiuso) e
  // nessun pannello aperto sopra, conto alla rovescia; a zero si gioca. Un giocatore che non è più pronto lo annulla,
  // con il motivo nella barra dell'avvio e sui telefoni
  _tickStart(now = performance.now()){
    const L = this.ui.lobby;
    const here = !!L?.visible && L.mode === 'split' && L.step === 'connect' && !this.session && !this.ui.intro?.active;
    // fuori dalla pagina (anche in partita, dopo che il conto è scattato) il conto torna da capo: tornando qui con tutti
    // e due pronti riparte (prima di questa riga restava «già scattato» e non ripartiva più)
    if (!here){ if (this.cd.running || this.cd.held || this.cd.why) this._stopCount(this.cd.running ? 'Si scelgono le impostazioni sul computer.' : null); else this.countdown.reset(); return; }
    const sheet = [...document.querySelectorAll('.natpf-sheet-backdrop')].some(m => !m.classList.contains('hidden'));
    const blocked = !!L.onboarding?.isOpen || !!this.ui.calibra?.isOpen || sheet;
    const slots = this.slots(now), gate = startGate(slots);
    const r = this.countdown.update(gate.both && !this.cd.held && !blocked, now);
    const R = this.ui.diag?.recorder;
    if (r.cancelled){
      this.cd.why = gate.both ? null : cancelText(slots); this.cd.whyUntil = now + SPLIT_CANCEL_SHOW_MS;
      this._announce({ stop: 1, txt: this.cd.why || 'Guarda il computer.' });
      R?.log?.('split.conto', { stato: 'annullato', motivo: this.cd.why || 'pannello aperto' });
    }
    if (r.running && r.left !== this.cd.left){
      if (!this.cd.running){ this.cd.why = null; R?.log?.('split.conto', { stato: 'partito' }); }
      this._announce({ n: r.left });
    }
    this.cd.running = r.running; this.cd.left = r.left;
    if (r.fire) this._fire();
    this._paintStart(now, slots);
  }
  // si esce dalla pagina (impostazioni, menu, partita): niente conto, niente motivi
  _stopCount(txt = null){
    const was = this.cd.running;
    this.countdown.reset();
    this.cd = { left: 0, running: false, held: false, why: null, whyUntil: 0 };
    if (was && txt) this._announce({ stop: 1, txt });
    this._paintStart();
  }
  // «Aspetta» (o Esc): il conto si ferma e non riparte da solo; poi «Gioca» nella barra (this.hold è un'altra cosa: la
  // pausa del telefono del P2 in partita)
  holdCountdown(){
    const was = this.cd.running;
    this.countdown.reset();
    Object.assign(this.cd, { running: false, left: 0, held: true, why: null });
    if (was){ this._announce({ stop: 1, txt: 'Partenza fermata sul computer.' }); this.ui.diag?.recorder?.log?.('split.conto', { stato: 'fermato' }); }
    this._paintStart();
  }
  playNow(){ this.cd.held = false; this._fire(); }
  // a zero (o «Gioca» dopo «Aspetta»): lo stesso «Gioca» della pagina «Partita» (natpf_ui._bindStart ricontrolla che
  // tutti e due siano pronti, poi la sessione split e il passaggio al campo)
  _fire(){
    Object.assign(this.cd, { running: false, left: 0, held: false, why: null });
    this._announce({ n: 0 });
    this.ui.diag?.recorder?.log?.('split.conto', { stato: 'si gioca' });
    const b = $('btn-start-match'); if (b){ b.disabled = false; b.click(); }
  }
  // barra dell'avvio sotto le schede e riquadro grande del conto
  _paintStart(now = performance.now(), slots = this.slots(now)){
    const bar = $('split-ready-bar'), ov = $('split-countdown'), cd = this.cd;
    const gate = startGate(slots), names = bothNames(slots);
    let mode = 'wait', title = 'Si parte da soli quando tutti e due i giocatori sono pronti', sub = `${waitingText(gate.waiting)}.`;
    if (cd.running){ mode = 'count'; title = `Tutto pronto: si gioca tra ${cd.left}`; sub = this.webcam ? `${names}, in posizione davanti alla webcam.` : `${names}, tenete il telefono come in partita.`; }
    else if (gate.both && cd.held){ mode = 'held'; title = 'Tutto pronto'; sub = 'Partenza fermata: premi «Gioca» quando volete.'; }
    else if (gate.both){ mode = 'ready'; title = 'Tutto pronto'; sub = 'Si parte appena si chiude il pannello aperto.'; }
    else if (cd.why && now < cd.whyUntil){ mode = 'cancel'; title = cd.why; sub = 'Il conto riparte da solo quando tutto è di nuovo pronto.'; }
    const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
    if (bar){
      if (bar.dataset.readyBar !== mode) bar.dataset.readyBar = mode;
      set(bar.querySelector('[data-ready-bar-title]'), title);
      set(bar.querySelector('[data-ready-bar-sub]'), sub);
      set(bar.querySelector('[data-ready-count]'), cd.running ? String(cd.left) : '');
      show(bar.querySelector('[data-split-hold]'), mode === 'count');
      show(bar.querySelector('[data-split-play]'), mode === 'held');
    }
    if (ov){
      show(ov, cd.running);
      const num = ov.querySelector('[data-split-count]'), n = String(cd.left);
      // ogni secondo il numero «batte» (classe tick rimessa da capo)
      if (cd.running && num && num.textContent !== n){ num.textContent = n; num.classList.remove('tick'); void num.offsetWidth; num.classList.add('tick'); }
      set(ov.querySelector('[data-split-count-names]'), sub);
    }
    return mode;
  }
  // pagina «Partita» dello stesso schermo: le due schede compatte, dal vivo (prima solo «VS» e una nota sotto il piede)
  paintMatch(now = performance.now()){
    const slots = this.slots(now);
    paintBoard($('split-ready-board'), slots);
    return { ...startGate(slots), slots };
  }
  // «Gioca»: sessione split nel motore, mano del P2 sul suo personaggio
  start(){
    this.closeTutorials();
    if (!this.engine.startSplit()) return false;
    this.ui.hand.mirrorRemote?.(this.engine.opponent, this.hand('p2'));
    this.labels = { p1: null, p2: null };
    return true;
  }
  end(){
    this.closeTutorials();
    if (!this.session && !this.hold) return;
    this.engine.endSplit?.(); if (this.hold){ this.hold = null; this.ui._paintHold?.(null); } show($('natpf-split-hud'), false);
  }
  // esiti dei colpi (motore → aptica): etichetta della metà di chi ha colpito
  onFeedback(e = {}){
    if (!this.session) return;
    const text = splitShotLabel(e), id = e.role === 'p2' ? 'p2' : 'p1';
    if (text) this.labels[id] = { text, until: performance.now() + 1600 };
  }
  // ogni 100 ms (natpf_ui): conto alla rovescia nella pagina «Collega», telefono del P2 in campo e etichette delle metà
  tick(){
    this._tickStart();
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
