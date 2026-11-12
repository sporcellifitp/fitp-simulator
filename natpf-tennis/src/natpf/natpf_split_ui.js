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
import { createPhoneWatch, createResync, phoneHealthOf, phoneHoldText, phoneOf, holdTitle, WATCH } from './natpf_phone_watch.js';
import { splitVisible } from './natpf_split.js';
import { webcamOpenError } from './natpf_webcam_watch.js';

import { NatpfTutorial, tutorialCards } from './natpf_tutorial.js';
import { getGestureDemo } from './natpf_gesture_demo.js';
import { BAND_DEFAULT, bandOf, helpFor, helpSentence, helpLabel, readOpenCourt } from './natpf_duo_rules.js';
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
// si sta scrivendo un nome: campo del nome attivo e un tasto da meno di così (ms). Solo il campo attivo non basta: dopo
// aver scritto il nome il cursore resta lì e il conto non partirebbe mai
export const SPLIT_TYPING_MS = 2500;
// «‹ Indietro» da «Partita» con i due pronti (cd.back: niente conto da solo): un telefono «non pronto» per meno di così
// (ms) è una transizione momentanea (un pacchetto in ritardo, un ridisegno sotto carico) e non cambia lo stato; solo un
// «non pronto» che dura almeno tanto azzera cd.back e fa ripartire il conto quando torna pronto (prova nel browser
// natpf-split-ready instabile sotto carico, 06/11: il conto ripartiva da solo dopo «‹ Indietro»)
export const SPLIT_BACK_DROP_MS = 1000;
// sensori fermi da così (ms senza dati dal telefono pronto) → la scheda dice «Sensori fermi»: lo stesso tempo della pausa
// in partita (natpf_phone_watch: sensorGapMs più la tolleranza graceMs), così un pacchetto in ritardo non annulla il conto
export const SPLIT_STALL_MS = WATCH.sensorGapMs + WATCH.graceMs;

// Stato di un giocatore con la webcam per due (funzione pura): webcam spenta, mano cercata, mano vista
// (detail: la parte breve, per il distintivo della scheda, natpf_ready.splitSlot)
export function splitCamStatus({ active = false, seen = false, error = null } = {}){
  if (!active) return error ? { state: 'ko', title: error.badge, sub: error.text, detail: error.badge } : { state: 'wait', title: 'Webcam spenta', sub: 'Accendi la webcam qui sopra', detail: 'Webcam spenta' };
  return seen ? { state: 'ok', title: 'Mano vista ✓', sub: 'Pronto', detail: 'Mano vista' } : { state: 'on', title: 'Alza la mano che colpisce', sub: 'Dalla tua parte, polso visibile', detail: 'Alza la mano' };
}
// posizione della linea del confine nel riquadro della camera (specchiato come lo schermo): CSS left; metà se manca
export const splitCamLine = split => `${(100*(Number.isFinite(split) ? Math.max(0, Math.min(1, split)) : .5)).toFixed(1)}%`;
const PHONE_ERR = { denied: 'Sensori negati: ricarica la pagina sul telefono e consenti', nomotion: 'Il browser del telefono non dà i sensori: usa Chrome (Android) o Safari (iPhone)', insecure: 'Pagina senza https: i sensori non funzionano' };

// Stato di un giocatore nella pagina «Collega» (funzione pura): state 'wait' | 'qr' | 'on' | 'go' | 'tut' | 'ok' | 'ko';
// detail: la parte breve, per il distintivo della scheda (natpf_ready.splitSlot); lost: telefono che c'era e si è perso.
// tut: tutorial aperto nella metà di questo giocatore ({ i, n }: scheda mostrata e schede). Prima, con il tutorial
// aperto, la metà diceva «Tocca «Attiva i sensori»» anche con i sensori già attivi (analisi B9 D, §2.2)
// unseen: telefono collegato che non ha ancora visto il tutorial, con la modale non aperta (si apre nella pagina «Collega»:
// per esempio dopo il reset del chiosco con il telefono rimasto collegato e la pagina «Partita» aperta). health: salute
// del telefono (natpf_phone_watch.phoneHealthOf), lo stesso criterio della pausa in partita: un telefono con la pagina
// nascosta (schermo spento, altra app) o con i sensori fermi non è pronto, anche se il telefono dice «Pronto». Prima la
// scheda restava «Pronto», il conto partiva e la partita cominciava con un telefono che non poteva giocare (revisione B9
// del 06/11)
export function splitPlayerStatus(p, hand = 'right', { tut = null, unseen = false, health = null } = {}){
  const L = p?.state || { state: 'off' };
  if (!p?.link || L.state === 'off' || L.state === 'starting') return { state: 'wait', title: 'Preparo il QR…', sub: '', detail: 'Preparo il QR' };
  if (L.state === 'error') return { state: 'ko', title: 'Collegamento non disponibile', sub: `Controlla la rete e riprova (${L.error || 'errore'})`, detail: 'Collegamento non disponibile' };
  if (!p.connected) return L.state === 'lost' ? { state: 'qr', lost: true, title: 'Inquadra il QR', sub: 'Telefono scollegato: riapri la pagina sul telefono', detail: 'Telefono scollegato' }
    : { state: 'qr', title: 'Inquadra il QR', sub: 'Con la fotocamera del telefono, poi tocca il link', detail: 'Inquadra il QR' };
  if (PHONE_ERR[L.phone]) return { state: 'ko', title: 'Sensori non disponibili', sub: PHONE_ERR[L.phone], detail: 'Sensori non disponibili' };
  // tutorial aperto nella sua metà (B9): scheda mostrata e schede viste (avanzamento mandato al telefono, tutProgress);
  // con tutte le schede viste il telefono accende «Tutto chiaro, ho capito»
  const tp = p.tutWait ? p.tutProgress : null;
  if (tut || p.tutWait){
    const n = Math.max(1, tp?.n || tut?.n || 1), i = Math.min(n, Math.max(1, tp ? (tp.i ?? 0) + 1 : tut?.i || 1));
    const seen = tp?.n ? `Schede viste ${tp.s} di ${tp.n}` : `Scheda ${i} di ${n}`;
    // (B28: si chiude quando si vuole, da qualunque scheda)
    return { state: 'tut', title: 'Guarda il tutorial', sub: `${seen} · quando vuoi, sul telefono «Tutto chiaro, ho capito»`, detail: `Tutorial ${i}/${n}` };
  }
  if (unseen) return { state: 'tut', title: 'Tutorial da vedere', sub: 'Si apre nella pagina dei telefoni («Racchette»)', detail: 'Tutorial da vedere' };
  if (L.vis === false || health?.why === 'pagina nascosta') return { state: 'ko', title: 'Schermo del telefono spento', sub: 'Riaccendi lo schermo e tocca la pagina del gioco', detail: 'Schermo spento' };
  if (p.ready && health?.why === 'sensori fermi' && !(health.gapMs < SPLIT_STALL_MS)) return { state: 'ko', title: 'Sensori del telefono fermi', sub: 'Sul telefono tocca «Riattiva i sensori»', detail: 'Sensori fermi' };
  // (B28: con la calibrazione «Giocando» il profilo semplice è voluto: si calibra con gli scambi di prova)
  if (p.ready) return { state: 'ok', title: 'Pronto ✓', sub: p.simple ? (p.calMode === 'play' ? 'Si calibra giocando' : 'Senza calibrazione: si gioca lo stesso') : 'Racchetta calibrata', detail: p.simple ? (p.calMode === 'play' ? 'Si calibra giocando' : 'Senza calibrazione') : 'Calibrato' };
  if (L.phone !== 'cal') return { state: 'on', title: 'Tocca «Attiva i sensori»', sub: 'Sul telefono; su iPhone poi «Consenti»', detail: 'Attiva i sensori' };
  const c = calPrompt(p.calView, hand);
  return { state: c.state === 'go' ? 'go' : 'on', title: c.title, sub: c.sub, detail: 'Calibrazione' };
}

// Rivincita dai telefoni (B20, decisione dell'utente del 10/11 sull'audit B19, miglioramento 5): a fine partita ogni
// telefono mostra «Rivincita»; parte quando l'hanno toccata tutti e due, oppure dal pulsante del computer («Gioca
// ancora», com'era). Sul grande schermo, nella scheda di fine partita, si vede chi è pronto. Funzione pura: la riga
export function rematchLine(votes = {}, names = {}){
  const a = !!votes.p1, b = !!votes.p2, n1 = names.p1 || 'Player 1', n2 = names.p2 || 'Player 2';
  if (a && b) return 'Rivincita!';
  if (a || b) return `${a ? n1 : n2} vuole la rivincita · manca ${a ? n2 : n1}`;
  return 'Rivincita dai telefoni: toccate «Rivincita» tutti e due';
}

export class NatpfSplitUi {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.rematch = { p1: false, p2: false }; this._rmSent = { p1: '', p2: '' }; this._rmOffer = false;
    this.fails = { p1: 0, p2: 0 };          // verifiche non riuscite di fila
    this.calAsked = { p1: false, p2: false }; // calibrazione già chiesta per questo collegamento
    this.watch = createPhoneWatch(); this.hold = null; this.resync = createResync();
    // tutorial di ciascun giocatore nella sua metà della pagina «Collega» (richiesta del 04/11): indipendenti, si chiudono
    // dal proprio telefono; ciascuna con la sua animazione dei gesti (Canvas 2D, niente WebGL: getGestureDemo(p1/p2), B9).
    // Visto una volta per abbinamento del telefono (NatpfPhoneRacket.tutorialSeen, B9): non a ogni ricollegamento, e il P1
    // che l'ha già visto nell'Allenamento non lo rivede qui. Prima della partita il tutorial corto (5 schede, B16)
    this.tutOpen = { p1: false, p2: false }; this.tutHeld = { p1: false, p2: false };
    this.tut = {};
    for (const id of SPLIT_PLAYERS) this.tut[id] = typeof document !== 'undefined' ? new NatpfTutorial($(`split-tut-${id}`), { half: true, demo: () => getGestureDemo(id) }) : null;
    let saved = 'phones'; try { saved = localStorage.getItem(SPLIT_INPUT_KEY) || 'phones'; } catch {}
    this.input = splitInputOf(saved);
    // conto alla rovescia prima della partita: left (secondi), running, held («Aspetta»), why (motivo dell'annullamento),
    // back (tornati con «‹ Indietro» da «Partita» con tutti e due già pronti: si aspetta un cambio o «Gioca», vedi _tickStart)
    this.countdown = createCountdown({ ms: SPLIT_COUNTDOWN_MS });
    this.cd = { left: 0, running: false, held: false, back: false, why: null, whyUntil: 0 }; this._here = null; this._leftBoth = false; this._dropAt = null;
    const box = document.querySelector('[data-setup="split"]');
    engine.natpfSplitNames = { p1: 'Player 1', p2: 'Player 2' };
    // B25: fascia di ciascun giocatore (Bambino · Ragazzo · Adulto, natpf_duo_rules.js), scelta sulla sua scheda; di base
    // Adulto per tutti e due (nessun aiuto). Il motore la legge a inizio partita (startNewMatch → natpfDuo)
    engine.natpfSplitBands = { p1: BAND_DEFAULT, p2: BAND_DEFAULT };
    box?.addEventListener('input', e => {
      const id = e.target.dataset.splitName; if (!['p1', 'p2'].includes(id)) return;
      this._typedAt = performance.now();
      engine.natpfSplitNames[id] = e.target.value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) || (id === 'p1' ? 'Player 1' : 'Player 2');
      this._paintNames();
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
      const bd = e.target.closest('[data-split-band]'); if (bd){ e.stopPropagation(); const [id, band] = bd.dataset.splitBand.split(':'); this.setBand(id, band); return; }
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
      p2.onTutorialNav?.(d => { if (this.tutOpen.p2) this.tut.p2?.step(d); });
      p2.onRematch?.(() => this._onRematch('p2'));
    }
    if (!this.p1Bound){
      this.p1Bound = true; this.ui.phone.onCal?.(e => this._onCal('p1', e)); this.ui.phone.onChange(() => { this._resetIfNew('p1'); this._repaint(); }); this.ui.phone.onTutorial?.(() => this._tutDone('p1'));
      this.ui.phone.onTutorialNav?.(d => { if (this.tutOpen.p1) this.tut.p1?.step(d); });
      this.ui.phone.onRematch?.(() => this._onRematch('p1'));
    }
    for (const id of SPLIT_PLAYERS) this.phone(id).start().catch(err => this.ui.toast(`Collegamento del ${id.toUpperCase()} non disponibile (${err.message})`));
  }
  // un telefono cambia (collegato, pronto, perso): la scheda si aggiorna subito, non al prossimo giro della lobby (300 ms)
  // Ridisegni raggruppati: il telefono cambia stato molte volte al secondo (ogni messaggio), e una pagina ridisegnata a
  // ognuno intasava il computer (prova del 06/11: il controllo delle schede viste del tutorial arrivava in ritardo)
  // Un cambio vero (collegato, pronto, stato del telefono, tutorial) si ridisegna subito; gli altri messaggi si raggruppano
  _repaint(){
    const key = SPLIT_PLAYERS.map(id => { const p = this.phone(id); return [!!p?.connected, !!p?.ready, p?.state?.phone, p?.state?.state, p?.state?.vis, this.tutOpen[id]].join(':'); }).join('|');
    const now = key !== this._repaintKey;
    this._repaintKey = key;
    if (now){ clearTimeout(this._repaintT); this._repaintT = null; this._paintLobby(); return; }
    if (this._repaintT) return;
    this._repaintT = setTimeout(() => { this._repaintT = null; this._paintLobby(); }, 120);
  }
  _paintLobby(){ const L = this.ui.lobby; if (L?.visible && L.mode === 'split' && (L.step === 'connect' || L.step === 'match')) L.paint(); }
  get webcam(){ return this.input === 'webcam'; }
  // tutorial visto da ciascuno (stesso abbinamento del telefono)
  get tutSeen(){ return { p1: !!this.phone('p1')?.tutorialSeen, p2: !!this.phone('p2')?.tutorialSeen }; }
  // tastiera di chi gestisce la postazione nella pagina «Collega» (natpf_lobby): A/D sfogliano il tutorial del P1 (metà
  // sinistra), ← → quello del P2 (metà destra); con una sola metà aperta tutti e due i tasti vanno a quella
  // Invio e Spazio sulla X o su una freccia a fuoco (Tab) attivano quella della metà che ha il fuoco, come il clic
  // (natpf_tutorial.keyActivate; senza, la lobby con Invio andrebbe alla pagina dopo)
  // B28 (12/11): Invio (senza un pulsante a fuoco) chiude i tutorial aperti, da qualunque scheda, come «Tutto chiaro» dai
  // telefoni o la X di ogni metà. Esc resta «indietro» (lascia la pagina, come sempre)
  key(e){
    if (!this.tutOpen.p1 && !this.tutOpen.p2) return false;
    if (e.code === 'Enter' || e.code === 'Space'){
      if (['p1', 'p2'].some(id => this.tutOpen[id] && !!this.tut[id]?.keyActivate(e))) return true;
      if (e.code !== 'Enter') return false;
    }
    if (e.code === 'Enter'){ if (!e.repeat){ for (const id of SPLIT_PLAYERS) this._tutDone(id); this.paint(); } return true; }
    const left = e.code === 'KeyA' || e.code === 'KeyD';
    const id = left ? (this.tutOpen.p1 ? 'p1' : 'p2') : (this.tutOpen.p2 ? 'p2' : 'p1');
    const code = e.code === 'KeyA' ? 'ArrowLeft' : e.code === 'KeyD' ? 'ArrowRight' : e.code;
    return !!this.tut[id]?.key({ code });
  }
  // Si può giocare? Le stesse schede della pagina «Collega» (slot, startGate): decide splitReady della lobby, l'aspetto di
  // «Gioca» nella pagina «Partita» e natpf_ui._bindStart. Webcam per due: camera accesa in modalità per due che ha visto
  // le mani di entrambi (anche non in questo momento: tra la pagina «Collega» e «Gioca» si scelgono le impostazioni);
  // telefoni: pronti, tutorial chiuso, pagina del telefono in primo piano e sensori che arrivano. Prima guardava solo
  // p.ready: schede «Si prepara» (tutorial aperto) o «Schermo spento» con «Gioca» giallo (revisione B9 del 06/11)
  bothReady(now = performance.now()){ return startGate(this.slots(now)).both; }
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
  // B25: fascia del giocatore (per l'aiuto al più giovane); vale dalla partita dopo
  band(id){ return bandOf(this.engine.natpfSplitBands?.[id]); }
  setBand(id, band){
    if (!SPLIT_PLAYERS.includes(id)) return;
    this.engine.natpfSplitBands = { p1: this.band('p1'), p2: this.band('p2'), [id]: bandOf(band) };
    this.ui.diag?.recorder?.log?.('split.fascia', { giocatore: id, fascia: this.band(id) });
    this.paint();
  }
  // «Nuovo giocatore» e chiosco: le fasce tornano Adulto per tutti e due
  resetBands(){ this.engine.natpfSplitBands = { p1: BAND_DEFAULT, p2: BAND_DEFAULT }; if (typeof document !== 'undefined') this._paintBands(); }
  // pulsanti delle fasce sulle due schede
  _paintBands(){
    for (const id of SPLIT_PLAYERS) for (const btn of document.querySelectorAll(`[data-split-band^="${id}:"]`)){ const on = btn.dataset.splitBand.endsWith(':' + this.band(id)); btn.classList.toggle('selected', on); btn.setAttribute('aria-pressed', String(on)); }
    // revisione B25: «Aiuto» sulla scheda di chi è aiutato (la barra dell'avvio lo dice per esteso, ma nelle aree basse è
    // sotto il bordo); con il passaggio del mouse, la frase intera
    const helped = this.helpedId(), note = helped ? this.helpNote() : '';
    for (const id of SPLIT_PLAYERS){ const tag = document.querySelector(`[data-band-help="${id}"]`); if (!tag) continue; tag.parentElement.classList.toggle('helped', id === helped); tag.title = id === helped ? note : ''; }
  }
  // chi è aiutato con le fasce di adesso ('p1' | 'p2' | null; null con le fasce uguali o con la webcam per due)
  helpedId(){
    if (this.webcam) return null;
    const help = helpFor(this.engine.natpfSplitBands || {}, undefined, readOpenCourt());
    return help.p1 ? 'p1' : help.p2 ? 'p2' : null;
  }
  // aiuto al più giovane con le fasce di adesso, come lo dice la barra dell'avvio: «Aiuto a Giulia (Bambino): ha più
  // margine sul tempo, riceve palle più lente e tira più in fondo.» ('' con le fasce uguali o con la webcam
  // per due, dove l'aiuto non vale). Solo di gioco: nessun punto regalato (decisione dell'utente del 12/11)
  helpNote(){
    // (con il campo aperto acceso l'aiuto può essere diverso: lo stesso che il motore userà nella partita)
    const id = this.helpedId();
    return id ? helpSentence(helpFor(this.engine.natpfSplitBands || {}, undefined, readOpenCourt())[id], this.name(id)) : '';
  }
  setHand(id, hand){
    // (natpfP2Hand: il piano d'intercetto del P2 sa da che lato è il suo dritto prima del primo colpo, natpf_impact.handOf).
    // Nel motore (natpfP2Hand, personaggio specchiato) solo a sessione in corso: prima di «Gioca» è la preferenza del P2,
    // che start() applica; prima restava anche tornando al menu (CPU o P2 del 1v1 in rete mancini, B15)
    if (id === 'p2'){
      this.engine.natpfPhone2?.setHand(hand);
      if (this.session) this.engine._natpfSetP2Hand?.(hand);
      if (this.engine.motionController) this.engine.motionController.p2HandPreference = hand;
    }
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
    // telefono con la pagina di prima (non ha mai risposto tut in questo abbinamento: NatpfPhoneRacket.tutSupported) che
    // ha cominciato a calibrare da solo: la sua metà si chiude
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
    // telefono collegato: prima il tutorial nella sua metà (una volta per abbinamento); il telefono aspetta «ho capito».
    // Telefono che cade a tutorial aperto: la metà torna al QR e la modale ricorda la scheda raggiunta (stesso telefono
    // che si ricollega: riparte da lì). Il telefono continua ad aspettare il tutorial (hold: niente waitTutorial(false)),
    // così al ricollegamento riceve cfg con tut e l'avanzamento, come nell'Allenamento (revisione B9 del 06/11: prima
    // riceveva un cfg senza tut, calibrava da solo e il tutorial si chiudeva come visto)
    if (p.connected && !p.tutorialSeen && !this.tutOpen[id] && !this.webcam) this._tutOpen(id);
    if (!p.connected && this.tutOpen[id]) this._tutClose(id, { keep: true, hold: true });
    if (this.tutOpen[id]){ this.tut[id]?.setAfter(p.ready ? 'ready' : 'cal'); return; }
    // (B28: senza i gesti il telefono riceve da solo il profilo semplice, NatpfPhoneRacket._autoProfile)
    if (p.connected && L.phone === 'cal' && !p.ready && !p.autoSimple && !this.calAsked[id] && p.calView?.stage === 'off'){ this.calAsked[id] = true; p.recalibrate(); }
  }
  _tutOpen(id){
    this.tutOpen[id] = true; this.tutHeld[id] = false;
    this[`${id}Joins`] = this.phone(id)?.state?.joins || 0;
    const p = this.phone(id);
    p.waitTutorial?.(true);
    const name = this.engine.natpfSplitNames?.[id] || (id === 'p1' ? 'Player 1' : 'Player 2');
    // avanzamento al telefono di questo giocatore (pulsante acceso dopo l'ultima scheda); «poi sei pronto» se è già calibrato
    // la X in alto a destra della sua scheda (B17.2), accesa dopo tutte le schede: come «Tutto chiaro» dal suo telefono
    this.tut[id]?.openFor({ mode: 'phone', set: 'short', player: name, hand: this.hand(id), after: p.ready ? 'ready' : 'cal', from: p.savedTutorial?.() || null, onProgress: pr => p.tutorialProgress?.(pr), onDone: () => this._tutDone(id) });  }
  // chiusa dal telefono di quel giocatore (o dal telefono di prima che calibra da solo): solo la sua metà
  _tutDone(id){
    if (!this.tutOpen[id]) return;
    this.phone(id)?.markTutorialSeen?.('short'); this._tutClose(id);
    this.paint();
  }
  // keep: chiusa prima della fine (telefono caduto, si lascia la pagina): si ricorda dove era arrivata. hold: telefono
  // caduto, la modale si chiude ma il tutorial non è finito: il telefono continua ad aspettarlo (tutHeld; lo libera
  // closeTutorials se si lascia la pagina prima che torni)
  _tutClose(id, { keep = false, hold = false } = {}){
    this.tutOpen[id] = false; this.tutHeld[id] = hold;
    if (keep) this.phone(id)?.saveTutorial?.(this.tut[id]?.snapshot);
    if (!hold) this.phone(id)?.waitTutorial?.(false);
    this.tut[id]?.close('phone');
  }
  // si esce dalla pagina «Collega» (partita, menu): le modali delle metà si chiudono, i telefoni non aspettano più
  closeTutorials(){
    for (const id of SPLIT_PLAYERS){
      if (this.tutOpen[id]) this._tutClose(id, { keep: true });
      else if (this.tutHeld[id]){ this.tutHeld[id] = false; this.phone(id)?.waitTutorial?.(false); }
    }
  }
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
    this._paintBands();
    this._paintStart(now);
  }
  /* ---------- stato «pronto» delle schede e conto alla rovescia (B9, natpf_ready.js) ---------- */
  name(id){ return this.engine.natpfSplitNames?.[id] || defaultName(id); }
  // targhette dei nomi sotto le due metà del campo, dai nomi correnti (scritte anche da tick: un nome cambiato senza
  // l'evento 'input', come con «Nuovo giocatore», non lascia in campo il nome di chi ha giocato prima, revisione B18)
  _paintNames(){
    const hud = typeof document !== 'undefined' ? $('natpf-split-hud') : null; if (!hud) return;
    for (const id of SPLIT_PLAYERS){ const b = hud.querySelector(`[data-split-tag="${id}"] b`), t = this.name(id); if (b && b.textContent !== t) b.textContent = t; }
  }
  // «Nuovo giocatore» (natpf_new_player.resetVisitor): nomi da capo, caselle vuote, targhette in campo riscritte
  resetNames(){
    this.engine.natpfSplitNames = { p1: defaultName('p1'), p2: defaultName('p2') };
    if (typeof document !== 'undefined') for (const el of document.querySelectorAll('[data-split-name]')) el.value = '';
    this._paintNames();
    this.resetBands();   // B25: con «Nuovo giocatore» anche le fasce tornano Adulto
  }
  // scheda mostrata del tutorial di questo giocatore (1…n), per «Tutorial 3/5»
  tutInfo(id){ const t = this.tut[id]; return { i: (t?.state?.idx ?? 0) + 1, n: t?.state?.cards || tutorialCards('short').length }; }
  // stato del telefono (o della webcam per due) di un giocatore, come lo dice la sua metà
  status(id, now = performance.now()){
    const mc = this.engine.motionController;
    // (mano vista solo dalla webcam in modalità per due, come slot e bothReady)
    if (this.webcam) return splitCamStatus({ active: !!mc?.webcamActive, seen: !!mc?.webcamDuo && !!mc?._duo?.seen(id, now), error: mc?.webcamActive ? null : webcamOpenError(mc?.webcamError) });
    const p = this.phone(id);
    return splitPlayerStatus(p, this.hand(id), { tut: this.tutOpen[id] ? this.tutInfo(id) : null, unseen: !!p?.connected && !p.tutorialSeen, health: p?.connected ? phoneHealthOf(p, now) : null });
  }
  // scheda: con la webcam per due si è pronti da quando la webcam (accesa in modalità per due) ha visto la mano, anche se
  // adesso è fuori dall'inquadratura; con il telefono, pronto, tutorial chiuso, pagina in primo piano e sensori vivi
  slot(id, now = performance.now(), st = this.status(id, now)){
    const mc = this.engine.motionController;
    if (this.webcam && mc?.webcamActive && mc.webcamDuo && mc._duo?.seen?.(id, now, Infinity)) return slotView({ id, name: this.name(id), state: 'ready', detail: 'Mano vista' });
    return slotView({ id, name: this.name(id), ...splitSlot(st) });
  }
  slots(now = performance.now()){ return SPLIT_PLAYERS.map(id => this.slot(id, now)); }
  get countdownRunning(){ return this.cd.running; }
  // ai telefoni (pagina del telefono: racchetta.js, «ev» con k 'count'): n = 3, 2, 1 e 0 (si gioca), stop con il motivo
  // (soft: fermato sul computer, anello neutro sul telefono; senza soft un telefono non più pronto, anello rosso).
  // Le pagine del telefono di prima ignorano il messaggio (k sconosciuto): nessun problema di versioni
  _announce(m){
    if (this.webcam) return;
    for (const id of SPLIT_PLAYERS){ const p = this.phone(id); if (p?.connected) p.link?.send?.({ t: 'ev', k: 'count', ...m }); }
  }
  // Ogni 100 ms (tick): nella pagina «Collega» dello stesso schermo, con tutti e due pronti (e il tutorial chiuso) e
  // nessun pannello aperto sopra, conto alla rovescia; a zero si gioca. Un giocatore che non è più pronto lo annulla,
  // con il motivo nella barra dell'avvio e sui telefoni.
  // Quando parte da solo (revisione B9 del 06/11, minore a): quando i due diventano pronti mentre si è qui, ed entrando
  // in avanti (menu → «Stesso schermo», dopo una partita) con tutti e due già pronti: scegliere la pagina è l'azione.
  // Tornando con «‹ Indietro» dalla pagina «Partita» (per cambiare nomi o mano) con tutti e due già pronti NO: «Tutto
  // pronto · premi «Gioca»» (come «Aspetta»), e riparte da solo solo se lo stato dei telefoni cambia (uno non è più
  // pronto e poi torna). È la regola della lobby per gli altri modi (natpf_lobby.go, autoFrom: in campo da soli solo se
  // il controller diventa pronto mentre si è lì). Prima ripartiva subito e il riquadro del conto copriva nomi e mano.
  // Mentre si scrive un nome il conto non corre: prima la partita poteva partire con il nome a metà
  _tickStart(now = performance.now()){
    const L = this.ui.lobby;
    const here = !!L?.visible && L.mode === 'split' && L.step === 'connect' && !this.session && !this.ui.intro?.active;
    // fuori dalla pagina (anche in partita, dopo che il conto è scattato) il conto torna da capo: tornando qui con tutti
    // e due pronti riparte (prima di questa riga restava «già scattato» e non ripartiva più)
    if (!here){ this._here = null; if (this.cd.running || this.cd.held || this.cd.back || this.cd.why) this._stopCount(this.cd.running ? 'Si scelgono le impostazioni sul computer.' : null); else this.countdown.reset(); return; }
    const sheet = [...document.querySelectorAll('.natpf-sheet-backdrop')].some(m => !m.classList.contains('hidden'));
    const blocked = !!L.onboarding?.isOpen || !!this.ui.calibra?.isOpen || sheet || this.typing;
    const slots = this.slots(now), gate = startGate(slots);
    // (steady: «tutti e due pronti» senza le transizioni momentanee, vedi SPLIT_BACK_DROP_MS; anche all'arrivo: un telefono
    // che proprio in quel momento passa per «non pronto» non fa perdere «‹ Indietro»)
    const steady = this._steadyBoth(gate.both, now);
    if (this._here !== L.pageN){ this._here = L.pageN; this.countdown.reset(); this.cd.back = steady && L.from === 'match' && this._leftBoth; }
    else if (!steady) this.cd.back = false;
    this._leftBoth = steady;
    const r = this.countdown.update(gate.both && !this.cd.held && !this.cd.back && !blocked, now);
    const R = this.ui.diag?.recorder;
    if (r.cancelled){
      this.cd.why = gate.both ? null : cancelText(slots); this.cd.whyUntil = now + SPLIT_CANCEL_SHOW_MS;
      this._announce({ stop: 1, txt: this.cd.why || 'Guarda il computer.', ...(this.cd.why ? {} : { soft: 1 }) });
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
    this.cd = { left: 0, running: false, held: false, back: false, why: null, whyUntil: 0 };
    if (was && txt) this._announce({ stop: 1, soft: 1, txt });
    this._paintStart();
  }
  // «Aspetta» (o Esc): il conto si ferma e non riparte da solo; poi «Gioca» nella barra (this.hold è un'altra cosa: la
  // pausa del telefono del P2 in partita)
  holdCountdown(){
    const was = this.cd.running;
    this.countdown.reset();
    Object.assign(this.cd, { running: false, left: 0, held: true, why: null });
    if (was){ this._announce({ stop: 1, soft: 1, txt: 'Partenza fermata sul computer.' }); this.ui.diag?.recorder?.log?.('split.conto', { stato: 'fermato' }); }
    this._paintStart();
  }
  playNow(){ this.cd.held = false; this.cd.back = false; this._fire(); }
  // si sta scrivendo un nome (campo attivo nella pagina «Collega» e un tasto da poco)
  get typing(){ return typeof document !== 'undefined' && !!document.activeElement?.matches?.('.split-name-input') && performance.now() - (this._typedAt ?? -1e9) < SPLIT_TYPING_MS; }
  // a zero (o «Gioca» dopo «Aspetta»): lo stesso «Gioca» della pagina «Partita» (natpf_ui._bindStart ricontrolla che
  // tutti e due siano pronti, poi la sessione split e il passaggio al campo)
  _fire(){
    Object.assign(this.cd, { running: false, left: 0, held: false, back: false, why: null });
    this._announce({ n: 0 });
    this.ui.diag?.recorder?.log?.('split.conto', { stato: 'si gioca' });
    const b = $('btn-start-match'); if (b){ b.disabled = false; b.click(); }
  }
  // barra dell'avvio sotto le schede e riquadro grande del conto
  _paintStart(now = performance.now(), slots = this.slots(now)){
    const bar = $('split-ready-bar'), ov = $('split-countdown'), cd = this.cd;
    const gate = startGate(slots), names = bothNames(slots);
    let mode = 'wait', title = 'Si parte da soli quando siete pronti tutti e due', sub = `${waitingText(gate.waiting)}.`;
    if (cd.running){ mode = 'count'; title = `Tutto pronto: si gioca tra ${cd.left}`; sub = this.webcam ? `${names}, in posizione davanti alla webcam.` : `${names}, tenete il telefono come in partita.`; }
    else if (gate.both && cd.held){ mode = 'held'; title = 'Tutto pronto'; sub = 'Premi «Gioca» quando volete.'; }
    else if (gate.both && cd.back){ mode = 'held'; title = 'Tutto pronto'; sub = 'Premi «Gioca» quando volete.'; }
    else if (gate.both && this.typing){ mode = 'ready'; title = 'Tutto pronto'; sub = 'Si parte quando finisci di scrivere il nome.'; }
    else if (gate.both){ mode = 'ready'; title = 'Tutto pronto'; sub = 'Si parte appena si chiude il pannello aperto.'; }
    else if (cd.why && now < cd.whyUntil){ mode = 'cancel'; title = cd.why; sub = 'Il conto riparte da solo quando tutto è di nuovo pronto.'; }
    // B25: l'aiuto al più giovane è dichiarato prima di giocare, nella barra e nel conto alla rovescia
    const help = this.helpNote();
    if (help) sub = `${sub} ${help}`;
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
    const slots = this.slots(now), gate = startGate(slots);
    paintBoard($('split-ready-board'), slots);
    // (uno che non è più pronto mentre si è qui: tornando nella pagina «Collega» lo stato è cambiato, il conto può partire)
    if (!this._steadyBoth(gate.both, now)) this._leftBoth = false;
    return { ...gate, slots };
  }
  // tutti e due pronti, oppure non più pronti da meno di SPLIT_BACK_DROP_MS (solo per cd.back e _leftBoth: il conto vero
  // si ferma subito con un telefono non pronto)
  _steadyBoth(both, now = performance.now()){
    if (both){ this._dropAt = null; return true; }
    if (this._dropAt == null) this._dropAt = now;
    return now - this._dropAt < SPLIT_BACK_DROP_MS;
  }
  // «Gioca»: sessione split nel motore, mano del P2 sul suo personaggio
  start(){
    this.closeTutorials();
    if (!this.engine.startSplit()) return false;
    this.engine._natpfSetP2Hand?.(this.hand('p2'));   // natpfP2Hand e personaggio specchiato (game_engine.js)
    return true;
  }
  end(){
    this.closeTutorials();
    if (!this.session && !this.hold) return;
    this.engine.endSplit?.(); if (this.hold){ this.hold = null; this.ui._paintHold?.(null, '', null, 'p2'); } show($('natpf-split-hud'), false);
  }
  /* ---------- rivincita dai telefoni (B20) ---------- */
  // si può chiedere: partita finita nello stesso schermo, con i due telefoni (non con la webcam per due)
  get rematchOffer(){ const E = this.engine; return this.session && !this.webcam && E.phase === 'MATCH_OVER' && !E.autoPlayMode; }
  _onRematch(id){
    if (!this.rematchOffer || this.rematch[id]) return;
    this.rematch[id] = true;
    this.ui.diag?.recorder?.log?.('split.rivincita', { chi: id });
    if (!(this.rematch.p1 && this.rematch.p2)) this.ui.toast?.(`${this.name(id)} vuole la rivincita`);
    this._tickRematch();
  }
  // ogni 100 ms: l'offerta ai telefoni (anche a quello che si ricollega), la riga nella scheda finale, la partenza
  _tickRematch(){
    if (!this.rematchOffer){
      if (this._rmOffer) this._rematchClear();
      return;
    }
    this._rmOffer = true;
    if (this.rematch.p1 && this.rematch.p2){ this._rematchGo(); return; }
    for (const id of SPLIT_PLAYERS){
      const p = this.phone(id), o = id === 'p1' ? 'p2' : 'p1';
      if (!p?.connected){ this._rmSent[id] = ''; continue; }
      const key = `${p.state.joins || 0}:${+this.rematch[id]}:${+this.rematch[o]}:${this.name(o)}`;
      if (key !== this._rmSent[id] && p.offerRematch?.({ me: this.rematch[id], other: this.rematch[o], name: this.name(o) })) this._rmSent[id] = key;
    }
    this._paintRematch();
  }
  // la partita non è più finita lì (menu, «Gioca ancora», «Nuovo giocatore», rivincita partita): i telefoni tolgono il pulsante
  _rematchClear(){
    this._rmOffer = false; this.rematch = { p1: false, p2: false };
    for (const id of SPLIT_PLAYERS){ if (this._rmSent[id]) this.phone(id)?.offerRematch?.(null); this._rmSent[id] = ''; }
    this._paintRematch();
  }
  // tutti e due l'hanno chiesta: stessa partita da capo (stesse impostazioni; chi batte si sorteggia di nuovo)
  _rematchGo(){
    const E = this.engine;
    this._rematchClear();
    this.ui.diag?.recorder?.log?.('split.rivincita', { stato: 'si gioca' });
    this.ui.wipe?.('Rivincita');
    E.hud?.hideVictoryModal?.();
    E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false;
    E.startNewMatch({ showStartBanner: true });
    this.ui._syncPause?.();
  }
  // riga nella scheda di fine partita: chi vuole la rivincita, chi manca
  _paintRematch(){
    const el = typeof document !== 'undefined' ? $('victory-rematch') : null; if (!el) return;
    const on = this._rmOffer;
    show(el, on);
    if (!on) return;
    const t = rematchLine(this.rematch, { p1: this.name('p1'), p2: this.name('p2') });
    if (el.textContent !== t) el.textContent = t;
    el.dataset.votes = `${+this.rematch.p1}${+this.rematch.p2}`;
  }
  // ogni 100 ms (natpf_ui): conto alla rovescia nella pagina «Collega», telefono del P2 in campo e etichette delle metà.
  // L'etichetta dice chi gioca e il telefono in pausa; l'esito del colpo non più (B10): sta nella scritta dell'esito
  // nell'angolo della metà di chi ha colpito (natpf_shot_feedback.popupPlace), prima c'erano due scritte per colpo
  tick(){
    this._tickStart();
    this._tickRematch();
    const E = this.engine, on = this.session && splitVisible(E);
    const hud = $('natpf-split-hud'); show(hud, on);
    if (on){
      this._paintNames();
      for (const id of SPLIT_PLAYERS){
        const tag = hud.querySelector(`[data-split-tag="${id}"] span`), p = this.webcam ? null : this.phone(id);
        // B25: sotto il nome di chi è aiutato in questa partita, «Aiuto: Bambino» (natpf_duo_rules.helpLabel)
        const text = p && !p.ready ? 'Telefono in pausa' : helpLabel(E.natpfDuo?.help?.[id]);
        if (tag && tag.textContent !== text) tag.textContent = text;
        tag?.parentElement?.classList.toggle('warn', !!p && !p.ready);
        tag?.parentElement?.classList.toggle('helped', !(p && !p.ready) && !!text);
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
    // schermo del telefono del P2 spento: il riquadro dice da quanto (ogni secondo)
    if (!a && this.hold && this.watch.state === 'paused' && p.state.vis === false){ const text = phoneHoldText(p, this.hold.why); if (text !== this.holdShown){ this.holdShown = text; this.ui._paintHold(holdTitle(this.name('p2')), text, this.ui.relinkAction?.(p, this.name('p2')), 'p2', { phone: p }); } }
    if (!a) return;
    if (a.kind === 'pause' || a.kind === 'wait'){
      this.hold = { why: a.why };
      // B20 (audit B19, punto 10): nome nei testi, QR del telefono scollegato dentro il riquadro, avviso all'altro telefono
      this.ui._paintHold(holdTitle(this.name('p2')), phoneHoldText(p, a.why), this.ui.relinkAction?.(p, this.name('p2')), 'p2', { phone: p });
      this.ui._tellOtherPhone?.('p2', true);
      R?.log?.('tel.pausa', { chi: 'p2', motivo: a.why, fase: E.phase, ...(h.gapMs ? { gapMs: h.gapMs } : {}), ...(Number.isFinite(p.state.sensorAge) ? { sensoriTelefonoMs: p.state.sensorAge } : {}) });
      if (p.connected){ p.link.send({ t: 'ph', ph: 'pause' }); p.lastPhase = 'pause'; }
    }
    if (a.kind === 'countdown') this.ui._paintHold(holdTitle(this.name('p2'), 'ready'), `Si riprende tra ${a.left}…`, null, 'p2', { count: a.left });
    if (a.kind === 'resume'){
      this.hold = null; this.ui._paintHold(null, '', null, 'p2'); E.pendingP2Swing = null; E.pendingUserSwing = null; p.lastPhase = null;
      this.ui._tellOtherPhone?.('p2', false);
      const replay = a.replay && ['RALLY', 'SERVE_TOSS'].includes(E.phase);
      if (replay){ E._setupPointServe({ showBanner: false }); this.ui.toast?.(`Il telefono ${phoneOf(this.name('p2'))} si era fermato: il punto si rigioca`); }
      R?.log?.('tel.ripresa', { chi: 'p2', rigiocato: replay });
    }
    this.ui._syncPause();
  }
}
