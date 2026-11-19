// NATPF Simulator, controller smartphone: si collega al computer con i dati del QR (dopo il «#»), chiede i permessi dei sensori,
// fa la calibrazione guidata (calibration.js: i passi si vedono grandi sul computer, qui c'è il riassunto), riconosce i
// colpi (swing-detect.js) e li manda al gioco con l'istante del picco. Niente app da installare.
import { SHOT_NAMES, shotFlags } from './shot-options.js';
import { parsePairing } from './pairing.js';
import { createSwingDetector, sampleFromMotion } from './swing-detect.js';
import { createCalibration, PLAN, GESTURE_PLAN, calibrationPlan, CAL } from './calibration.js';
import { LanPeer, isLanMode } from './lan-transport.js';
import { encodeSensor, SENSOR_HZ } from './sensor-packet.js';
import { peerConfig, loadPeer, LINK_TIMES, netWhy, iceReady } from './link.js';
// B45.1: controllo di vita a 10 s, tentativi senza fine in LAN, ripartenza sulla rete che torna, racconto della caduta
import { LIFE, lifeCheck, retryPlan, lostText, kickNow, netTypeChanged, storyWord, createDropStory } from './link-life.js';
import { createFaceTracker } from './face-tracker.js';
import { strokeShape } from './stroke-shape.js';
import { swingMessage } from './swing-message.js';
import { NATPF_BUILD } from './version.js';
import { createWakeKeeper, createSensorWatch, createResumeVeil } from './phone-keep.js';
import { gripSvg, GRIP } from './grip-art.js';
import { platformAccSign, createAccSign, normalizeSample, SIGN } from './motion-sign.js';
import { phoneView, gateOnCfg, gateOnProgress, gateRestore, gateNav, sensorOnGateOpen, sensorOnGateClose, sensorForCal, reportedSensor, tutorialTexts, tutConfirmable, countFlash, rematchOnMsg, rematchView, pauseNote, eventFlash, verdictText, veilText, trialOnMsg, TRIAL_TEXT, trialThresholds, nextOnMsg, nextTap, NEXT_REARM_MS, readyView, nameOnMsg, nameSubmit, NAME_REARM_MS, NAME_TEXT, standView, STAFF_HOLD, batteryAlert, standSignStep, tapVotesSign, handTap, handLabel, HAND_CONFIRM } from './phone-screen.js';
import { touchLockActive, createTouchLockHistory, installStaffTouch } from './phone-touch-lock.js';
import { createSampleStats, createLockStats, createAppReader } from './phone-stats.js';
import { nativeBridge, createNativeMotion, NATIVI } from './sensori-nativi.js';
import { parseStandPairing, createStandStore, standHello, standWelcome, standAnswer, standDenyText, newStandNonce, slotLabel } from './stand-pairing.js';
// B72: lingua della pagina scelta qui (IT | EN), mandata al gioco e rimandata dal gioco (lingua.js)
import { readLang, writeLang, phoneText, translateDom, langTap, langOnCfg, langMsg, isLang, LANG_CONFIRM } from './lingua.js';

const $ = s => document.querySelector(s);
const show = (s, on = true) => $(s).classList.toggle('hidden', !on);
// figura dell'impugnatura: la stessa del computer (grip-art.js), al posto del disegno di prima
{ const g = $('#grip'); if (g) g.outerHTML = gripSvg({ id: 'grip', cls: g.getAttribute('class') || 'hidden', compact: true }); }
const ss = { get(k){ try { return JSON.parse(sessionStorage.getItem('natpf-simulator.' + k)); } catch (e){ return null; } }, set(k, v){ try { sessionStorage.setItem('natpf-simulator.' + k, JSON.stringify(v)); } catch (e){} }, del(k){ try { sessionStorage.removeItem('natpf-simulator.' + k); } catch (e){} } };

// B72 · lingua della pagina (IT | EN): salvata su questo telefono (lingua.js, localStorage in try/catch), mandata al gioco
// a ogni tocco e annunciata a ogni collegamento (k 1: il gioco la prende solo se non conosce ancora la lingua di questo
// telefono); il gioco la rimanda in cfg (lg) e la rimette a IT a ogni giocatore nuovo, come la mano. langPending: tocco
// appena fatto che il gioco non ha ancora confermato (un cfg partito prima non lo annulla); langDirty: toccata senza
// collegamento, al collegamento vale come un tocco; langArm: domanda aperta nel riquadro del telefono bloccato (due tocchi)
let lang = readLang(), langPending = null, langDirty = false, langArm = null, langArmT = null;
// testo nella lingua della pagina (i testi nascono in italiano: si traducono quando si scrivono)
const L = s => phoneText(s, lang);
// B41 · telefono dello stand (modalità fiera): il posto abbinato resta su questo telefono (localStorage: tra un giorno e
// l'altro e dopo una ricarica), con l'indirizzo fisso e la chiave che non viaggia mai (stand-pairing.js). Il QR
// dell'abbinamento (#sp=…) vale solo a foglio aperto sul computer
const standStore = createStandStore((() => { try { return localStorage; } catch (e){ return null; } })());
let stand = standStore.load();
const standQr = parseStandPairing(location.hash);
// i dati del QR: si leggono e si tolgono subito dalla barra degli indirizzi (restano solo in questa scheda)
let pair = parsePairing(location.hash);
if (standQr){ pair = { session: standQr.pair, token: standQr.token, standPair: true }; ss.del('pair'); ss.del('resume'); ss.del('gate'); history.replaceState(null, '', location.pathname + location.search); }
else if (pair){ ss.set('pair', pair); ss.del('resume'); ss.del('profile'); ss.del('gate'); history.replaceState(null, '', location.pathname + location.search); }
// (senza QR: la racchetta di questa scheda, se c'era; se no il posto dello stand salvato)
else pair = ss.get('pair') || (stand ? { session: stand.session, stand: true } : null);

// Presa: «upright» (predefinita, telefono in verticale come il manico) o «flat» (telefono in orizzontale nel palmo,
// display verso di sé: il dorso è il piatto). La sceglie il computer (messaggio grip) o chi gioca qui sotto.
// La presa orizzontale resta nel codice ma non si offre più: scomoda in gioco. Si gioca solo in verticale.
let grip = 'upright';
const ALLOW_FLAT = false;
// Orientamento del piatto (face-tracker.js) con entrambe le prese: è la stessa misura in LAN e via internet, dà la
// direzione del colpo all'impatto e fa seguire la racchetta in gioco. Con la presa verticale la posa «pronto» segue il
// telefono solo dopo 0,4 s fermo e lentamente: le pause della preparazione non spostano il riferimento della mira.
const det = createSwingDetector(), face = createFaceTracker(ALLOW_FLAT ? {} : { quietHold: 400, relax: 2.5 });
// accelerazione con il segno di Android su tutti i telefoni (motion-sign.js: Safari su iPhone la dà al contrario, e
// dritto e rovescio risultavano invertiti); il segno si conferma con i tocchi sullo schermo
// (telefono dello stand: il segno confermato e salvato su questo telefono, B41.3)
const accSign = createAccSign({ prior: stand?.as ?? platformAccSign(navigator.userAgent, navigator.maxTouchPoints || 0) });
let lastRawG = null;
// ogni gesto porta con sé il piatto all'istante del picco (l'impatto)
// … e la forma del colpo (stroke-shape.js): piano, verso della testa della racchetta, rotazione sul manico
det.on('swing', s => { if (face.ready){ s.face = face.strokeFace(s.peakT, s.t - s.dur); s.head = face.headAt(s.peakT, s.axis); s.shape = strokeShape(face.history(), face.up, { peakT: s.peakT }); } });
// (B46: il voto del rilevatore sul segno dei sensori, swing-detect.js vote, arriva subito al computer, che lo registra;
// i computer di prima ignorano il messaggio e lo vedono dal colpo, sg)
det.on('status', s => { if (s.s === 'still-ok') face.setRest(s.gravity, det.profile.bias); if (s.s === 'sign') send({ t: 'sgn', d: s.sign === -1 ? -1 : 1, ...(Array.isArray(s.votes) ? { v: s.votes } : {}) }); });
const cal = createCalibration(det);
let lastFaceSent = -Infinity, lastFacePaint = -Infinity, lastAttemptOk = false;
let sensorSequence = 0, lastSensorSent = -Infinity;
// richieste facoltative del gioco (messaggio cfg): preparazione del colpo e flusso dei sensori anche senza canale binario
let streamJson = false, prepWanted = false, diagStream = false, sampleHz = 60, lastSampleT = null, swingSeq = 0;
let connectEpoch = 0, pendingConn = null;
let peer = null, conn = null, linkState = 'off', rtt = 80, sensor = 'off', phase = 'menu', retryT = null, tries = 0, motionSeen = false, flashT = null, lastRx = 0;
// Tutorial sul computer (cfg tut, phone-screen.js): il «cancello» { v, i, n, s, m, all } che il computer apre e chiude e di
// cui manda l'avanzamento (tp). Resta nella scheda (pagina ricaricata, ricollegamento): niente lampo di «Pronto» e niente
// ritorno alla prima scheda. screen: la schermata mostrata (una sola alla volta, phoneView)
let gate = pair ? gateRestore(ss.get('gate')) : null, viewScreen = 'link', tutLitT = null, wantFs = false;
// schermo acceso e sensori vivi (phone-keep.js): ogni cambio del blocco va al computer e sullo schermo (avvisi più giù)
const awake = createWakeKeeper({ onChange: () => { sendState(); paintAlert(); } }), sensorWatch = createSensorWatch();
let revivedAt = null, alertKey = '';
let lateVerdict = null;   // B37: ultimo «Fuori» / «In rete» arrivato con la palla a terra (per il punto che segue)
// velo «Tocca lo schermo per riprendere» dopo lo schermo spento (phone-keep.js) e schermo intero da riprendere al primo
// tocco dopo il ritorno (Android può uscirne con lo schermo spento: non verificato su telefoni veri)
const veil = createResumeVeil();
let fsAfterVisible = false;
// percorso veloce (link.js): via internet una seconda connessione non ordinata; in LAN il canale dei sensori
let fast = null, fastOk = false, rawSeq = 0;

/* ---------- interfaccia ---------- */
let selectedShot = 'auto', inputMode = 'motion', shotsPaintKey = '';
// stesso schermo (B20): rivincita offerta dal computer a fine partita (phone-screen.rematchOnMsg) e motivo della pausa
let rematch = null, phaseNote = '';
// calibrazione giocando (B28): il computer sta giocando gli scambi di prova (fase con tr 1)
let trial = false;
// niente blocchi (B28): «Avanti ›» offerto dal computer ({ label }) dove chiede un gesto
let nextOffer = null;
// B41.3: dopo il tocco il pulsante resta spento finché non arriva un'offerta nuova; se non arriva, si riaccende da solo
let nextRearmT = 0;
// B54: nome chiesto dal computer prima di «Sono pronto» ({ v, er, id, sent }), null se non lo chiede; avviso scritto qui
let nameOffer = null, nameRearmT = 0, nameWhy = '';
// B54.1: il computer ha un'altra versione (dopo il suo aggiornamento): la pagina si ricarica da sola, una volta per versione
// (niente giri se la pagina nuova non arriva), mai al servizio, nello scambio o in pausa (si aspetta il menu o la fine)
let pendingBuild = null;
function buildReload(){
  if (!pendingBuild || ['serve', 'toss', 'play', 'pause'].includes(phase) || ss.get('reloadFor') === pendingBuild) return;
  ss.set('reloadFor', pendingBuild);
  try { pageGoing(); } catch (e){}
  location.reload();
}
// B41.3: pulsanti dello staff sul telefono dello stand, in vista fino a staffUntil dopo la pressione lunga sul numero
let staffUntil = 0, staffT = null;
const preferences = () => ({ range: $('#motionRange').value, hand: $('#hand').value, intentGate: $('#intentGate').checked, gestural:true,quick:true, ...(grip === 'flat' ? { grip: 'flat' } : {}) });
const ARROW = { L: '←', R: '→', '?': '?' };
// mano scelta nel gioco (o qui, e confermata dal gioco): menu, calibrazione in corso e profilo salvato. Il verso del
// gesto non dipende dalla mano: cambia solo quale verso è il dritto, quindi il profilo resta valido
// pulsanti Destra / Sinistra sopra «Attiva i sensori» (la scelta vera è il <select id="hand"> nascosto)
// B46: cambiare mano vuole due tocchi (phone-screen.handTap): al primo il pulsante chiede «Mancino? Tocca di nuovo» (o
// «Destro? Tocca di nuovo») per HAND_CONFIRM.ms, il secondo la cambia; handArm = la domanda aperta
let handArm = null, handArmT = null;
function paintHand(){
  const hand = $('#hand').value, now = performance.now();
  if (handArm && now > handArm.until) handArm = null;
  for (const b of document.querySelectorAll('#profileOptions [data-hand]')){
    const on = b.dataset.hand === hand, ask = !!handArm && handArm.hand === b.dataset.hand, t = handLabel(b.dataset.hand, handArm, now);
    b.classList.toggle('on', on); b.classList.toggle('ask', ask); b.setAttribute('aria-checked', String(on));
    const tt = L(t); if (b.textContent !== tt) b.textContent = tt;
  }
}
function applyHand(h){
  const hand = h === 'left' ? 'left' : 'right';
  // (la mano decisa dal computer chiude la domanda aperta sul telefono)
  handArm = null; clearTimeout(handArmT);
  if ($('#hand').value !== hand) $('#hand').value = hand;
  paintHand();
  const art = $('#grip');
  if (art && art.dataset.hand !== hand) art.outerHTML = gripSvg({ id: 'grip', cls: art.getAttribute('class') || 'hidden', compact: true, hand });
  if (cal.state.options) cal.state.options.hand = hand;
  const saved = ss.get('profile');
  if (saved && saved.hand !== hand){ saved.hand = hand; ss.set('profile', saved); }
  if (sensor === 'cal') paint();
}
// (B72: le scritte in italiano, tradotte qui; lastUi per riscriverle nell'altra lingua al cambio)
let lastUi = null;
function ui(big, sub, ring = '', arrow = ''){ lastUi = [big, sub, ring, arrow]; $('#big').textContent = L(big); $('#sub').textContent = L(sub); $('#ring').className = ring; $('#arrow').textContent = arrow; }
function bar(){
  const b = $('#bar');
  let txt = { off: 'Non collegato', connecting: 'Collegamento…', on: 'Collegato al computer', lost: 'Connessione persa', denied: 'Non collegato' }[linkState] || linkState;
  // (telefono dello stand: il posto sempre davanti, e «mi ricollego» al posto di «Connessione persa»)
  if (pair?.stand && stand && linkState !== 'denied') txt = standView({ slot: stand.slot, linkState, sensor, phase }).bar;
  b.className = linkState === 'on' ? 'ok' : linkState === 'lost' || linkState === 'denied' ? 'bad' : '';
  $('#barTxt').textContent = L(txt); $('#lat').textContent = linkState === 'on' ? Math.round(rtt) + ' ms' : '';
}
let touchRequest = false, touchOverride = false, touchLocked = false, touchSlot = 'p1';
const touchOverlay = $('#phoneTouchLock'), touchHit = $('#touchHit'), touchHome = touchHit.parentElement;
const touchHistory = createTouchLockHistory(window, history, () => touchLocked);
// B66: misure per il registro dello stand (phone-stats.js): campioni dei sensori, blocco dei tocchi, stato dall'app
const sampleStats = createSampleStats(), lockStats = createLockStats(), appReader = createAppReader(window.NATPFApp);
// B71: sensori presi dall'app NATPF Racchetta 1.0.5 (sensori-nativi.js): prova all'avvio con il browser, poi i campioni
// dell'app a lotti con l'istante vero; se qualcosa non torna, di nuovo devicemotion. Senza l'app (Chrome) native.state
// resta 'off' e il percorso dei sensori è quello di sempre. motionWanted: devicemotion deve essere in ascolto
const NATIVE_EV = Object.freeze({ interval: NATIVI.intervallo });
let motionWanted = false;
const native = createNativeMotion({ bridge: nativeBridge(window), onSample: k => feedSample(k, NATIVE_EV), onState: nativeState });
function nativeState(s){
  if (s === 'nativi') removeEventListener('devicemotion', onMotion);
  else if (s === 'browser' && motionWanted){ removeEventListener('devicemotion', onMotion); addEventListener('devicemotion', onMotion); }
  sendState();
}
// (B71: istante dell'ultimo tocco per i buchi nei campioni, prima di ogni altro ascoltatore e senza fermare niente)
addEventListener('pointerdown', e => sampleStats.touch(e.timeStamp), { capture: true, passive: true });
const resetStaffTouch = installStaffTouch(touchOverlay, $('#phoneStaffUnlock'), () => { if (touchLocked) lockStats.staff(); unlockTouch(); });
const madeInert = new Set();

function unlockTouch(){
  if (!touchLocked) return;
  touchOverride = true;
  if (pair?.stand){
    staffUntil = performance.now() + STAFF_HOLD.showMs;
    setTimeout(paint, STAFF_HOLD.showMs + 50);
  }
  paint();
}
function paintTouchLock(){
  const on = touchLockActive({ requested: touchRequest, overridden: touchOverride, paired: !!pair && linkState !== 'denied',
    sensor, gate, readyTap: phase === 'menu' && !!nextOffer?.ready && !nextOffer.me && !nextOffer.sent, nameTap: phase === 'menu' && !!nameOffer,
    // (avviso con il pulsante e velo «tocca per riprendere» devono restare toccabili)
    alertTap: !$('#alert').classList.contains('hidden') && !$('#alertBtn').classList.contains('hidden') && !!$('#alertBtn').dataset.act,
    veil: !$('#wakeVeil').classList.contains('hidden') });
  if (on){
    touchOverlay.dataset.slot = touchSlot;
    $('#phoneTouchSlot').textContent = L(slotLabel(touchSlot));
    const label = L(linkState !== 'on' ? 'Ricollegamento…' : phase === 'pause' ? 'In pausa' : 'Gioca!');
    if ($('#phoneTouchPhase').textContent !== label) $('#phoneTouchPhase').textContent = label;
    const actionHome = linkState === 'on' && (inputMode === 'touch' || det.profile.intentGate) ? touchOverlay : touchHome;
    if (touchHit.parentElement !== actionHome) actionHome.append(touchHit);
  }
  if (on === touchLocked) return;
  touchLocked = on;
  document.body.classList.toggle('phone-locked', on);
  show('#phoneTouchLock', on);
  if (on){
    touchHistory.arm();
    for (const el of document.body.children){
      if (el !== touchOverlay && !el.inert){ el.inert = true; madeInert.add(el); }
    }
    awake.visible();
  } else {
    resetStaffTouch();
    for (const el of madeInert) el.inert = false;
    madeInert.clear();
    touchHome.append(touchHit);
  }
  sendState();
}
for (const type of ['pointerdown', 'pointerup', 'click', 'dblclick', 'auxclick', 'contextmenu', 'selectstart', 'dragstart']){
  document.addEventListener(type, event => {
    if (!touchLocked) return;
    // (B66: tocchi del visitatore a telefono bloccato, sul velo del blocco o fuori, non sui suoi pulsanti: per il registro)
    if (type === 'pointerdown' && !event.target?.closest?.('button')) lockStats.blocked();
    const blocked = !touchOverlay.contains(event.target) || ['contextmenu', 'selectstart', 'dragstart'].includes(type);
    if (!blocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

function setGate(g){ gate = g; if (g) ss.set('gate', g); else ss.del('gate'); }
// UNA schermata alla volta (phone-screen.js): collegamento, errore dei sensori, «Attiva i sensori», tutorial, calibrazione,
// «Pronto». Prima ogni elemento aveva la sua condizione e «Tutto chiaro» compariva sopra «Pronto»
function paint(){
  bar();
  const standOn = !!pair?.stand && !!stand;
  const v = phoneView({ linkState, sensor, gate, inputMode, calStep: cal.state.step, hasPair: !!pair, diag: diagStream, intentGate: det.profile.intentGate, phase, rematch, next: nextOffer, stand: standOn, staff: staffOn(), name: nameOffer });
  paintName(!!v.show['#nameBox']);
  if (nextOffer && $('#next').textContent !== L(nextOffer.label)) $('#next').textContent = L(nextOffer.label);
  // B41.6: «Sono pronto» grande e pieno (le altre offerte, «Avanti ›» e «Salta ›», restano piccole); spento dopo il tocco
  // (B41.3: spento anche appena toccato, finché il computer non manda l'offerta dopo: un doppio tocco non arriva a «Salta ›»)
  { const nb = $('#next'), big = !!nextOffer?.ready; nb.classList.toggle('alt', !big); nb.classList.toggle('big', big); nb.disabled = !!nextOffer && (!!nextOffer.sent || (big && !!nextOffer.me)); }
  paintStandTag(standOn);
  if (v.screen !== viewScreen){ viewScreen = v.screen; document.body.dataset.screen = viewScreen; }
  for (const [sel, on] of Object.entries(v.show)) show(sel, on);
  if (v.show['#profileOptions']) paintHand();
  // B72: la lingua sotto la mano, con la mano (prima di «Attiva i sensori»); nella barra in alto sempre
  show('#langOptions', !!v.show['#profileOptions']);
  paintLang();
  $('#touchHit').textContent = L(inputMode === 'touch' ? 'Colpisci' : 'Arma dopo l’apertura');
  // (con i sensori la frase sotto l'anello dice già cosa fare: il consiglio del pannello dei colpi solo con i tocchi)
  $('#shotHint').textContent = L('Scegli il colpo; schiacciata e servizio seguono la palla.'); show('#shotHint', inputMode === 'touch');
  paintShots();
  paintTut(v);
  const holding = viewScreen === 'cal' && sensor === 'cal' && (cal.state.step === 'grip' || cal.state.step === 'still');
  show('#grip', holding && grip !== 'flat'); show('#gripFlat', holding && grip === 'flat');
  const dial = grip === 'flat' && face.ready && (viewScreen === 'ready' || (viewScreen === 'cal' && ['free', 'swings'].includes(cal.state.step)));
  show('#faceDial', dial); show('#faceTxt', dial);
  paintTouchLock();
  if (linkState !== 'on' || flashT) return;
  if (viewScreen === 'enable') ui('Collegato', 'Tocca «Attiva i sensori»: il telefono diventa la racchetta.');
  else if (viewScreen === 'tutorial'){ const t = tutorialTexts(gate, { sensor }); ui(t.big, t.sub); }
  else if (viewScreen === 'cal'){ if (sensor === 'cal') calUi(); else ui('Preparati', 'Tra un attimo si calibra.'); }
  else if (viewScreen === 'ready'){
    // fine partita nello stesso schermo (B20): «Rivincita» e chi l'ha già chiesta
    const rv = phase === 'over' ? rematchView(rematch) : null, rb = $('#rematch');
    // B41.6: pagina «Pronto per la partita» sul computer: «Sono pronto» al posto di «Pronto»
    // (solo sulla pagina, fase «menu»: appena la partita parte, «Al servizio» anche se il ritiro dell'offerta arriva un attimo dopo)
    const rd = phase === 'menu' ? readyView(nextOffer) : null;
    // B41.3: telefono dello stand tra una persona e l'altra (menu, partita finita): «Dai il telefono al prossimo giocatore»
    const sv = standOn ? standView({ slot: stand.slot, linkState, sensor, phase }) : null;
    if (rv){ rb.textContent = L(rv.label); rb.disabled = rv.disabled; ui(rv.big, rv.sub, 'ready'); }
    else if (v.show['#nameBox']) ui(NAME_TEXT.big, NAME_TEXT.sub, 'ready');
    else if (rd) ui(rd.big, rd.sub, rd.ring);
    else if (trial && phase === 'play') ui(TRIAL_TEXT.big, TRIAL_TEXT.sub, 'ready');
    else if (sv?.big) ui(sv.big, sv.sub, 'ready');
    else ui(phase === 'serve' ? 'Al servizio' : phase === 'pause' && phaseNote ? 'Pausa' : 'Pronto', phaseText(), 'ready');
  }
}
// B54: «Come ti chiami?»: avviso (dal computer o scritto qui), pulsanti spenti dopo la risposta; uscendo, tastiera chiusa
function paintName(on){
  const was = document.body.classList.contains('naming');
  document.body.classList.toggle('naming', on);
  const input = $('#nameInput');
  if (!on){ if (was && document.activeElement === input) input.blur(); return; }
  const warn = L(nameWhy || nameOffer?.er || '');
  if ($('#nameWarn').textContent !== warn) $('#nameWarn').textContent = warn;
  const off = !!nameOffer?.sent;
  $('#nameOk').disabled = off; $('#nameSkip').disabled = off; input.disabled = off;
}
// schermata del tutorial: pulsante acceso da subito (B28), scheda attuale, puntini delle schede viste, frecce per
// sfogliarle anche da qui (solo con un computer che le capisce)
function paintTut(v){
  const b = $('#tutOk');
  if (v.screen !== 'tutorial'){ b.classList.remove('lit'); return; }
  const on = v.tutOk.on;
  b.disabled = !on; b.classList.toggle('off', !on); b.setAttribute('aria-disabled', String(!on));
  const t = tutorialTexts(gate, { sensor }) || { where: '', hint: '' };
  $('#tutWhere').textContent = L(t.where); $('#tutHint').textContent = L(t.hint);
  const nav = gateNav(gate);
  show('#tutNav', nav.show); $('#tutPrev').disabled = !nav.prev; $('#tutNext').disabled = !nav.next;
  const dots = $('#tutDots'), key = gate.n ? `${gate.n}:${gate.i}:${gate.m}` : '';
  if (dots.dataset.k !== key){ dots.dataset.k = key; dots.innerHTML = Array.from({ length: gate.n || 0 }, (_, i) => `<i class="${i === gate.i ? 'on' : ''}${(gate.m >>> i) & 1 ? ' seen' : ''}"></i>`).join(''); }
  show('#tutDots', !!gate.n);
}
function calUi(){
  const st = cal.state;
  if (cal.leading) ui('Preparati', 'Tieni il telefono come in partita, fermo.');
  else if (st.step === 'still' && grip === 'flat') ui('Pronto, fermo', 'Telefono in orizzontale nel palmo, display verso di te: il dorso guarda la rete come le corde. Resta fermo così per 2 secondi.');
  // stessi passi e stesse parole del computer (natpf_cal_view.js): si guarda il computer, qui c'è il riassunto
  else if (st.step === 'still') ui('Tieni fermo', `${GRIP.short}. Guarda il computer.`);
  else if (st.step === 'grip') ui('La tua presa', 'Tienilo comodo, senza stringere.');
  else if (st.step === 'swings'){
    const plan = st.plan || calibrationPlan(st.options), w = plan[st.idx], stroke = (w === 'L') !== (st.options.hand === 'left') ? 'Dritto' : 'Rovescio';
    if (!st.ready) ui(`${stroke} ${ARROW[w]}`, 'Fermo un attimo al centro…', '', '');
    else ui(`${stroke} ${ARROW[w]}`, `Ora: un colpo naturale ${w === 'L' ? 'verso sinistra' : 'verso destra'}, poi fermati. Gesto ${st.idx + 1} di ${plan.length}.`, 'ready', ARROW[w]);
  }
  else if(st.step==='shots'){const g=GESTURE_PLAN[st.idx];ui(SHOT_NAMES[g.shot],`Gesto ${PLAN.length+st.idx+1} di ${PLAN.length+GESTURE_PLAN.length}: ${g.hint}`, '',g.want?ARROW[g.want]:'↑');}
  else if (st.step === 'review') ui(st.result && st.result.pass ? 'Fatto!' : 'Da rifare', st.result && st.result.pass ? 'Guarda il computer: si parte da soli.' : 'Guarda il computer: ti dice cosa cambiare.', st.result && st.result.pass ? 'ready' : 'miss');
  else if (st.step === 'free') ui('Prova un colpetto', 'Guarda il computer: il personaggio ripete il tuo gesto.');
}
function phaseText(){
  if (grip === 'flat' && phase === 'play') return 'Colpisci quando la palla arriva alla racchetta: gira il piatto verso dove vuoi mandarla, aprilo per il lob, chiudilo per il coperto.';
  return { menu: 'Guarda il computer per iniziare.', toss: 'Colpisci quando la palla è in cima al lancio.', serve: 'Alza il telefono (o tocca lo schermo): lanci la palla. Poi colpisci quando è in alto.', play: 'Colpisci quando la palla arriva alla racchetta.', pause: phaseNote || 'Partita in pausa: guarda il computer. Se non riparte, tocca «Ricollega».', over: 'Partita finita: guarda il computer.' }[phase] || '';
}
function flash(cls, big, sub, ms = 650, arrow = ''){ ui(big, sub, cls, arrow); clearTimeout(flashT); flashT = setTimeout(() => { flashT = null; paint(); }, ms); }

/* ---------- collegamento ---------- */
async function connect(){
  clearTimeout(retryT); clearTimeout(connect.t);
  const epoch = ++connectEpoch, previous = peer;
  peer = null; conn = null; pendingConn = null; closeFast();
  if (previous && !previous.destroyed) previous.destroy();
  if (!pair){ linkState = 'denied'; bar(); ui('Nessuna partita', 'Inquadra il QR sul computer.'); show('#retry', false); return; }
  linkState = 'connecting'; paint();
  if (pair.stand && stand){ const v = standView({ slot: stand.slot, linkState: 'connecting' }); ui(v.big, v.sub); }
  else ui(pair.standPair ? 'Collegamento…' : 'Collegamento…', pair.standPair ? 'Mi collego al computer per diventare un telefono dello stand.' : 'Mi collego al gioco sul computer.');
  // a che punto è il collegamento di questo tentativo: server di segnalazione raggiunto, risposta del computer e stato
  // della strada diretta (ICE). A 12 s, se la strada si sta ancora cercando (il computer ha risposto), si aspetta fino a
  // 30 s invece di ricominciare da capo (LINK_TIMES); se non riesce, il motivo (netWhy)
  const net = netInfo = { signal: false, ice: 'new' };
  const giveUp = () => { if (epoch === connectEpoch && linkState === 'connecting') lost(); };
  connect.t = setTimeout(() => {
    if (epoch !== connectEpoch || linkState !== 'connecting') return;
    // l'attesa lunga è per il TURN via internet: in LAN le strade sono solo locali e restano i 12 s di sempre
    if (!isLanMode() && (net.ice === 'checking' || net.ice === 'connected')) connect.t = setTimeout(giveUp, LINK_TIMES.phoneSlowMs - LINK_TIMES.phoneMs);
    else giveUp();
  }, LINK_TIMES.phoneMs);
  try {
    // TURN di Cloudflare, se il pacchetto lo ha configurato (ice-route.js): la rete del telefono del P2 bloccava tutte
    // le strade di prima (30/10). Al massimo 2,5 s la prima volta, poi subito; se non riesce si va avanti come prima.
    // Insieme al caricamento della libreria: i due tempi non si sommano dentro i 12 s del tentativo (connect.t). In LAN
    // niente attesa, il Peer nasce subito come prima
    const Peer = isLanMode() ? LanPeer : (await Promise.all([loadPeer(), iceReady().catch(() => null)]))[0];
    if (epoch !== connectEpoch) return;
    const p = peer = new Peer(peerConfig());
    const current = () => epoch === connectEpoch && peer === p;
    p.on('open', () => {
      if (current()) net.signal = true;
      if (!current() || conn?.open || pendingConn) return;
      const c = pendingConn = p.connect(pair.session, { reliable: true, serialization: 'json' });
      c.on('iceStateChanged', st => { if (current()) net.ice = String(st); });
      c.on('open', () => {
        if (!current() || pendingConn !== c) return;
        // B41: telefono dello stand: all'abbinamento il codice del QR; all'indirizzo fisso un numero casuale, la chiave mai
        if (pair.stand || pair.standPair){ c.standLink = { nonce: pair.standPair ? null : newStandNonce(), proved: false }; c.send(standHello(pair.standPair ? { token: pair.token } : { nonce: c.standLink.nonce, relink: relinking })); relinking = false; return; }
        const r = ss.get('resume'); c.send(r ? { t: 'hello', v: 2, r, ...(relinking ? { rl: 1 } : {}) } : { t: 'hello', v: 2, k: pair.token }); relinking = false;
      });
      c.on('data', d => { if (current() && (c === conn || c === pendingConn)) onData(c, d); });
      // B45.1: anche il canale veloce del computer (in LAN il canale dei sensori, con il suo battito «hb») vale come segno di
      // vita: con la rete che perde pacchetti il canale affidabile tace più a lungo
      c.on('fast', () => { if (current() && c === conn) lastRx = performance.now(); });
      c.on('close', () => { if (current() && (c === conn || c === pendingConn)) lost(); });
      c.on('error', () => { if (current() && (c === conn || c === pendingConn)) lost(); });
    });
    p.on('error', e => {
      if (!current()) return;
      if (conn?.open && SIGNAL_ERRORS.has(e.type)) return;
      // (stand: l'indirizzo dell'abbinamento non c'è più, foglio chiuso o scaduto; quello fisso si riprova senza fine)
      if (e.type === 'peer-unavailable' && pair.standPair){ standPairDenied('closed'); return; }
      if (e.type === 'peer-unavailable' && !pair.stand && !ss.get('resume')){ linkState = 'denied'; clearTimeout(connect.t); paint(); ui('Partita non trovata', 'Il gioco sul computer è stato chiuso o ricaricato. Inquadra di nuovo il codice QR.'); return; }
      lost();
    });
    p.on('disconnected', () => {
      if (!current()) return;
      setTimeout(() => { if (!current() || p.destroyed) return; if (conn?.open) { try { p.reconnect(); } catch {} } else lost(); }, 1500);
    });
  } catch (e){ if (epoch === connectEpoch) lost(); }
}
// «Ricollega» (toccato qui o chiesto dal computer, che vede il telefono pronto ma non riceve più il movimento): canali
// nuovi con la chiave di ripresa, senza ricaricare la pagina; il computer tiene calibrazione e riferimenti (hello con rl).
// Diagnostica del 29/10 (stesso schermo): il computer non riceveva più il movimento del Player 2 per 16 s mentre il
// telefono era su «Pronto»
let relinking = false;
// (B45.1: prima di chiudere il telefono lo dice al computer, «cl», e lo tiene nel racconto della caduta)
function relink(){ if (!pair || (!pair.stand && !ss.get('resume'))) return; if (linkState === 'on'){ send({ t: 'cl', w: 'ricollega' }); story.drop('ricollega'); } relinking = true; tries = 0; connect(); }
// errori della sola segnalazione: con il canale aperto non lo chiudono. 'id-unavailable' è il nome della LAN
// (lan-transport.js) per l'id ancora registrato dal socket di prima: prima chiudeva un canale WebRTC buono
const SIGNAL_ERRORS = new Set(['network', 'disconnected', 'socket-error', 'socket-closed', 'server-error', 'unavailable-id', 'id-unavailable', 'lan-signaling']);
// eventi della calibrazione al computer (anche quelli che descrivono il passo attuale dopo una ripresa del collegamento)
const sendCal = e => send({ t: 'cal', e: { ...e, shot: e.shot || (inputMode === 'touch' ? selectedShot : 'drive') } });
function onData(c, d){
  if (!d || typeof d !== 'object') return;
  if (c === conn || d.t === 'welcome') lastRx = performance.now();
  switch (d.t){
    // B41 · abbinamento dello stand: il numero da confermare sul computer (lo stesso sul computer e qui)
    case 'wait': if (pair?.standPair && Number.isInteger(d.num)){ clearTimeout(connect.t); ui(String(d.num), 'Sul computer compare lo stesso numero: lo staff preme «Conferma».', 'ready'); } break;
    // B41 · ripresa del telefono dello stand: prima il gioco prova la chiave, poi questo telefono
    case 'proof': if (pair?.stand) standProofIn(c, d); break;
    case 'welcome':
      // B41: abbinamento confermato: posto, indirizzo fisso e chiave (una volta sola), poi ci si ricollega lì con la prova
      if (pair?.standPair){ const w = standWelcome(d, Date.now()); if (w) standPaired(w); return; }
      // (stand: il benvenuto vale solo dopo che il gioco ha provato la chiave)
      if (pair?.stand && !c.standLink?.proved) return;
      clearTimeout(connect.t); clearTimeout(retryT); pendingConn = null;
      // (B45.1: tentativo riuscito, nel racconto della caduta che sendDevice manda subito al computer)
      story.attempt(true);
      conn = c; linkState = 'on'; tries = 0; nextOffer = null; fastOk = d.f === 1; if (d.r) ss.set('resume', d.r); sendState(); openFast(); sendDevice();
      // ripresa a calibrazione in corso: gli eventi fatti mentre il collegamento era giù sono andati persi, il computer
      // riceve il passo attuale (prima restava al gesto di prima mentre il telefono era già alla verifica)
      if (sensor === 'cal') for (const e of cal.replay()) sendCal(e);
      paint(); break;
    case 'deny':
      // B41: telefono dello stand. Un rifiuto prima che il gioco abbia provato la chiave lo può mandare chiunque: la chiave
      // resta e si riprova; dopo la prova vuol dire che il posto ha un'altra chiave (riabbinato o scollegato dallo staff)
      if (pair?.stand){ if (c.standLink?.proved) standLost('unpaired'); else { try { c.close(); } catch (e){} lost(); } break; }
      if (pair?.standPair){ standPairDenied(typeof d.why === 'string' ? d.why : 'denied'); try { c.close(); } catch (e){} break; }
      linkState = 'denied'; ss.del('resume');
      ui('Non collegato', d.why === 'busy' ? 'C\'è già un altro telefono collegato.' : 'Codice scaduto o già usato: inquadra di nuovo il QR.');
      paint(); try { c.close(); } catch (e){} break;
    case 'pong': rtt = rtt*.7 + (performance.now() - d.c)*.3; bar(); break;
    case 'dp': send({ t: 'dq', d: d.d, p: performance.now() }); break;
    case 'grip': setGrip(d.g); break;
    // il gioco chiede la modalità preparazione (prep) e il flusso dei sensori in JSON quando non c'è il canale binario (mo)
    // (B71: sn = segno di fiera, il segno dei sensori si gira solo con almeno sn voti contrari concordi; senza, come prima)
    case 'cfg': prepWanted = !!d.prep; det.setPrepMode(prepWanted); det.setNet?.(!!d.net); det.setSignNeed?.(d.sn); streamJson = !!d.mo; diagStream = !!d.diag; if (d.hand === 'left' || d.hand === 'right') applyHand(d.hand);
      // B72: la lingua decisa dal gioco (rimandata dopo un tocco, o IT per un giocatore nuovo); i computer di prima non la mandano
      if (isLang(d.lg)){ const r = langOnCfg(d.lg, { current: lang, pending: langPending, now: performance.now() }); langPending = r.pending; if (r.lang !== lang) setLang(r.lang, { from: 'game' }); }
      { // tutorial: il computer lo apre (tut, con tv 2 manda l'avanzamento) o lo chiude. Si risponde che si sa aspettare
        // (w) con il pulsante spento fino all'ultima scheda (v 2). Calibrazione già partita (si entra in campo dalla pagina
        // «Collega»): si ferma e ripartirà dopo; un telefono già calibrato resta calibrato (dopo «ho capito» torna a «Pronto»)
        const was = gate; setGate(gateOnCfg(gate, d));
        if (gate){ send({ t: 'tut', w: 1, v: 2 }); if (!was){ sensor = sensorOnGateOpen(sensor); lightTut(); } }
        // il computer ha chiuso il tutorial da solo (o non lo chiede più): chi aspettava calibra
        else if (was && sensor === 'idle') startCal();
      }
      sendState(); paint(); break;
    // avanzamento del tutorial dal computer: scheda mostrata, schede viste (solo informazione: «ho capito» è acceso da subito, B28)
    case 'tp': if (gate){ setGate(gateOnProgress(gate, d)); paint(); } break;
    // verso del colpo atteso (da che parte arriva la palla): +1 da destra a sinistra, -1 da sinistra a destra, 0 non si sa
    case 'ex': det.setExpect(d.d); break;
    case 'practice': if (inputMode==='touch' && SHOT_NAMES[d.shot]){ selectedShot = d.shot; paintShots(); } break;
    // rivincita offerta dal computer a fine partita nello stesso schermo (B20), o tolta (on 0)
    case 'rm': rematch = rematchOnMsg(d); if (sensor === 'ready') paint(); break;
    // «Avanti ›» offerto (o tolto) dal computer: esercizi e scambi di prova si possono saltare anche da qui (B28)
    case 'nx': nextOffer = nextOnMsg(d); clearTimeout(nextRearmT); if (sensor === 'ready') paint(); break;
    // B54: il computer chiede il nome (o toglie la richiesta). Una richiesta nuova (numero diverso) mette nel campo il nome
    // proposto (vuoto per un giocatore nuovo, quello di prima nella rivincita); la stessa ripetuta lascia quello scritto
    case 'nm': {
      const o = nameOnMsg(d), fresh = !!o && o.id !== nameOffer?.id;
      nameOffer = o; nameWhy = ''; clearTimeout(nameRearmT);
      if (fresh) $('#nameInput').value = o.v;
      if (sensor === 'ready') paint();
      break;
    }
    // (txt, B20: la partita è in pausa per il telefono dell'altro giocatore, e lo dice)
    // soglie dal colpo imparato negli scambi di prova (B28): solo sopra il profilo semplice, che non ha un colpo tipico suo
    case 'pf': { const th = trialThresholds(d); if (th && sensor === 'ready' && inputMode === 'motion' && det.profile.simple) det.setThresholds(th); break; }
    // B54.1: versione del gioco sul computer; diversa da questa pagina → ricarica fuori dalla partita (buildReload)
    case 'bv': if (typeof d.v === 'string' && d.v && d.v !== NATPF_BUILD){ pendingBuild = d.v.slice(0, 40); buildReload(); } break;
    case 'ph': phase = d.ph; phaseNote = pauseNote(d); trial = trialOnMsg(d); det.setSignVote?.(d.tr !== 1); if (phase !== 'over') rematch = null; det.setContext(phase); if (phase === 'play' && ['serve','smash'].includes(selectedShot)) selectedShot = 'drive'; if (sensor === 'ready') paint(); buildReload(); break;
    case 'tl':
      if (c !== conn) break;
      touchRequest = d.on === 1;
      if (!touchRequest) touchOverride = false;
      touchSlot = d.slot === 'p2' ? 'p2' : 'p1';
      paint();
      break;
    case 'cmd': command(d.c); break;
    case 'ev': {
      const vib = Array.isArray(d.vib) && d.vib.length <= 6 && d.vib.every(v => Number.isFinite(v) && v >= 0 && v <= 400) ? d.vib : null;
      // esito del colpo e del punto, come sul computer (eventFlash, B18: anche «Fuori» e «In rete» con il perché)
      // B37: «Fuori» / «In rete» arrivano quando la palla tocca terra o la rete (late); il punto che segue subito lo tiene
      // nella riga piccola (verdict), invece del solo «Fuori»
      if (d.k === 'contact' && d.late) lateVerdict = { txt: verdictText(d), at: performance.now() };
      if (d.k === 'contact' || d.k === 'miss' || d.k === 'point'){ const f = eventFlash(d, { verdict: d.k === 'point' && lateVerdict && performance.now() - lateVerdict.at < 1500 ? lateVerdict.txt : '' }); if (f.buzz) buzz(vib || f.buzz); flash(f.ring, f.big, f.sub, f.ms); }
      // stesso schermo (B9, natpf_split_ui._announce): conto alla rovescia del computer prima della partita (n = 3, 2, 1;
      // 0 = si gioca) o conto fermato (stop, con il motivo). Solo un avviso sopra la schermata, che poi torna da sola
      if (d.k === 'count'){ const f = countFlash(d); if (f.buzz) buzz(f.buzz); flash(f.ring, f.big, f.sub, f.ms, f.arrow); }
      break;
    }
    case 'bye':
      // B41: posto dello stand (solo da un collegamento con la chiave provata): riabbinato a un altro telefono o scollegato
      // dallo staff; «other»: la stessa chiave è entrata da un'altra scheda, questa si ferma (niente tira e molla)
      if (pair?.stand){ if (!c.standLink?.proved) break; if (d.why === 'other') standParked(); else standLost(d.why === 'replaced' ? 'replaced' : 'unpaired'); break; }
      ss.del('resume'); ss.del('pair'); pair = null; closeFast(); linkState = 'denied'; paint(); ui('Scollegato', 'Il computer ha scollegato il telefono. Per giocare di nuovo inquadra il nuovo QR.'); try { c.close(); } catch (e){} break;
  }
}
// motivo di un collegamento non riuscito, da quello che il tentativo ha visto (connect: netInfo). Prima il telefono
// diceva sempre «Connessione persa», anche quando la rete bloccava la strada diretta e riprovare non serviva
let netInfo = null;
// cause (B45.1): perché il collegamento è caduto, per il racconto al computer (silenzio, chiuso, ricollega, pagina…)
function lost(cause = null){
  if (linkState === 'denied' || linkState === 'lost') return;
  const why = linkState === 'connecting' ? netWhy(netInfo) : null;
  // B45.1: la caduta di un collegamento che andava entra nel racconto per il computer; un tentativo non riuscito si conta
  if (linkState === 'on') story.drop(cause || 'chiuso'); else if (linkState === 'connecting') story.attempt(false);
  clearTimeout(retryT); clearTimeout(connect.t); ++connectEpoch;
  const previous = peer; peer = null; pendingConn = null;
  closeFast(); conn = null; linkState = 'lost';
  if (previous && !previous.destroyed) previous.destroy();
  paint();
  // (telefono dello stand: il motivo della rete sì, «inquadra di nuovo il QR» no: il posto si riprende da solo)
  if (pair?.stand && stand){ const v = standView({ slot: stand.slot, linkState: 'lost' }), w = why && !/QR/.test(why) ? why : null; ui(v.big, w ? `${w} ${v.sub}` : v.sub); }
  // B45.1 (link-life.retryPlan): attese di 1, 2, … fino a 6 s; senza fine in LAN e per il telefono dello stand (B41.3), via
  // internet 10 tentativi e poi «Riprova». Prima la racchetta col QR si fermava a 10 anche in LAN, dicendo ancora «Riprovo
  // da solo tra poco»: un buco lungo della Wi-Fi diventava una caduta per sempre
  const plan = retryPlan({ tries, stand: !!pair?.stand, lan: isLanMode() }); tries++;
  if (!(pair?.stand && stand)) ui('Connessione persa', lostText(why, plan.again));
  if (plan.again) retryT = setTimeout(connect, plan.waitMs);
}
// B45.2 (revisione del B45.1, punto 4) · La pagina del telefono si chiude o si ricarica (pagehide): lo si dice al computer
// («cl») e la caduta resta nel racconto della scheda come «pagina». Prima il gestore chiudeva il canale da sé: la chiusura
// è sincrona, passava da «close» a lost() senza motivo e il racconto appena scritto diventava «chiuso», o «nascosta» se la
// pagina era già nascosta (il computer «chiariva» la pagina chiusa in pagina nascosta). lost('pagina') fa lo stesso lavoro
// di prima (canali chiusi, stato «lost», nuovo tentativo se la pagina torna dalla memoria del browser) con il motivo giusto
function pageGoing(){
  if (!(conn && conn.open) || linkState !== 'on') return;
  const c = conn;
  try { c.send({ t: 'cl', w: 'pagina' }); } catch (e){}
  lost('pagina');
  try { c.close(); } catch (e){}
}
const send = m => { if (conn && conn.open) try { conn.send(m); } catch (e){} };
// messaggi che valgono solo se arrivano subito: su una strada senza ordine, così un pacchetto perso non ferma quelli
// dopo. In LAN senza ritrasmissioni (canale dei sensori); via internet PeerJS 1.5.4 con reliable false imposta solo
// ordered false: non ordinata ma con le ritrasmissioni, su una connessione separata dalla principale (prima questo
// commento diceva «senza ritrasmissioni» anche via internet). false se il percorso non c'è (allora chi chiama usa send)
const sendFast = m => {
  if (!(conn && conn.open) || !fastOk) return false;
  if (conn.sendFast) return conn.sendFast(m);
  if (fast?.open) try { fast.send(m); return true; } catch (e){}
  return false;
};
// via internet: seconda connessione dello stesso telefono, non ordinata ma affidabile (vedi sopra; il computer la accetta
// solo da questo peer)
function openFast(){
  if (!fastOk || isLanMode() || !peer || peer.destroyed || fast?.open) return;
  closeFast();
  try {
    const f = fast = peer.connect(pair.session, { reliable: false, serialization: 'json', label: 'fast-' + Math.random().toString(36).slice(2, 10) });
    f.on('close', () => { if (fast === f) fast = null; });
    f.on('error', () => {});
    // (B45.1: il battito del computer anche su questa strada vale come segno di vita)
    f.on('data', () => { if (fast === f && conn?.open) lastRx = performance.now(); });
  } catch (e){ fast = null; }
}
function closeFast(){ const f = fast; fast = null; if (f) try { f.close(); } catch (e){} }
/* ---------- B41 · telefono dello stand ---------- */
// prova del gioco sul numero di questo collegamento: giusta → la prova del telefono; sbagliata (non è il gioco, o il posto
// ha un'altra chiave) → si chiude e si riprova, la chiave resta
async function standProofIn(c, d){
  const sl = c.standLink; if (!sl || sl.proved || sl.checking || !stand) return;
  sl.checking = true;
  const r = await standAnswer(stand, sl.nonce, d);
  if (pendingConn !== c && conn !== c) return;
  if (!r.ok){ try { c.close(); } catch (e){} lost(); return; }
  sl.proved = true; c.send(r.reply);
}
// abbinamento confermato sul computer: il posto resta su questo telefono (il segno dei sensori confermato, se c'era, resta:
// è del telefono), ci si ricollega all'indirizzo fisso
function standPaired(w){
  stand = { ...w, ...(stand?.as === 1 || stand?.as === -1 ? { as: stand.as } : {}) }; standStore.save(stand);
  pair = { session: stand.session, stand: true }; tries = 0;
  ui(slotLabel(stand.slot), 'Abbinato ✓ Mi collego al gioco…', 'ready');
  clearTimeout(retryT); retryT = setTimeout(connect, 300);
}
// il posto non è più di questo telefono (riabbinato a un altro o scollegato dallo staff): niente più tentativi
function standLost(why){
  const slot = stand?.slot || 'p1';
  standStore.clear(); stand = null; pair = null;
  ++connectEpoch; clearTimeout(retryT); clearTimeout(connect.t); pendingConn = null; closeFast();
  try { conn && conn.close(); } catch (e){} conn = null; linkState = 'denied';
  if (peer && !peer.destroyed) peer.destroy(); peer = null;
  paint(); ui(why === 'replaced' ? `Non sei più il ${slotLabel(slot)}` : 'Scollegato', standDenyText(why, slot), 'miss');
}
// la stessa chiave è entrata da un'altra scheda: questa si ferma; «Riprova» la riprende qui
function standParked(){
  ++connectEpoch; clearTimeout(retryT); clearTimeout(connect.t); pendingConn = null; closeFast();
  try { conn && conn.close(); } catch (e){} conn = null; linkState = 'denied';
  if (peer && !peer.destroyed) peer.destroy(); peer = null;
  paint(); ui(slotLabel(stand?.slot), standDenyText('other', stand?.slot));
}
// abbinamento non riuscito (rifiutato, scaduto, foglio chiuso…): un telefono che era già dello stand torna al suo posto
function standPairDenied(why){
  ++connectEpoch; clearTimeout(retryT); clearTimeout(connect.t); pendingConn = null; closeFast(); conn = null;
  if (peer && !peer.destroyed) peer.destroy(); peer = null;
  if (stand){ pair = { session: stand.session, stand: true }; linkState = 'lost'; paint(); ui('Abbinamento non riuscito', standDenyText(why, stand.slot), 'miss'); tries = 0; retryT = setTimeout(connect, 3000); return; }
  pair = null; linkState = 'denied'; paint(); ui('Abbinamento non riuscito', standDenyText(why), 'miss');
}
// numero grande del posto in cima alla pagina; tenuto premuto 3 s dallo staff mostra Ricalibra, Ricollega e Scollega
function staffOn(){ return performance.now() < staffUntil; }
function paintStandTag(on){
  const el = $('#standTag'); if (!el) return;
  if (!on) return;
  const n = stand.slot === 'p2' ? '2' : '1';
  if (el.dataset.slot !== stand.slot || el.dataset.lang !== lang){ el.dataset.slot = stand.slot; el.dataset.lang = lang; el.querySelector('b').textContent = n; el.querySelector('em').textContent = L(slotLabel(stand.slot)); el.setAttribute('aria-label', L(`${slotLabel(stand.slot)} dello stand`)); }
  const staff = staffOn(), sm = el.querySelector('small'), t = L(staff ? 'staff: pulsanti in vista qui sotto' : 'dello stand · staff: tieni premuto 3 s');
  el.classList.toggle('staff', staff); if (sm.textContent !== t) sm.textContent = t;
}
$('#standTag')?.addEventListener('pointerdown', e => {
  if (!pair?.stand) return;
  e.currentTarget.classList.add('holding'); clearTimeout(staffT);
  staffT = setTimeout(() => { $('#standTag').classList.remove('holding'); staffUntil = performance.now() + STAFF_HOLD.showMs; buzz([40, 40, 40]); paint(); setTimeout(paint, STAFF_HOLD.showMs + 50); }, STAFF_HOLD.holdMs);
});
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('#standTag')?.addEventListener(ev, () => { clearTimeout(staffT); $('#standTag').classList.remove('holding'); });
// rete tornata, pagina ripresa dalla cache del browser: subito un tentativo (B41.3; il telecomando lo fa già). Anche la
// racchetta normale: se aspettava un nuovo tentativo, lo fa subito
// B45.1 (link-life.kickNow): anche quando cambia il TIPO di rete (navigator.connection, Chrome su Android: wifi ↔
// cellular…; le stime che cambiano di continuo no). Solo in attesa del prossimo tentativo: mai da collegato (decide il
// controllo di vita) né a tentativo in corso (benvenuto, prova della chiave dello stand). netChangedAt: per il racconto
// della caduta («rete cambiata»)
let netChangedAt = null, pageHiddenAt = null, pageVisibleAt = null;
const kick = () => { if (pair && kickNow({ linkState, hidden: document.hidden })){ tries = 0; connect(); } };
addEventListener('online', () => { netChangedAt = performance.now(); kick(); });
addEventListener('offline', () => { netChangedAt = performance.now(); });
addEventListener('pageshow', kick);
const netConn = navigator.connection;
let netKind = netConn?.type;
try { netConn?.addEventListener?.('change', () => { const t = netConn.type; if (netTypeChanged(netKind, t)){ netChangedAt = performance.now(); netKind = t; kick(); } else if (typeof t === 'string') netKind = t; }); } catch (e){}
// B45.1 · racconto della caduta per il computer (link-life.js): perché, da quanto, tentativi, rete. Nella memoria della
// scheda (resta se la pagina si ricarica) e detto una volta sola, nel primo «dev» dopo il benvenuto
const drops = createDropStory({ store: ss, now: () => Date.now() });
const story = {
  drop: cause => drops.drop(storyWord(cause, { now: performance.now(), hidden: document.hidden, hiddenAt: pageHiddenAt, visibleAt: pageVisibleAt, netAt: netChangedAt }), typeof netConn?.type === 'string' ? { tipo: netConn.type } : {}),
  attempt: ok => drops.attempt(ok),
  tell: () => drops.tell(),
};
// vis: pagina in primo piano (0 = nascosta: schermo spento, altra app); wk: blocco dello schermo attivo (1), non
// attivo (0, negato o perso: lo schermo può spegnersi dopo il tempo del telefono), non supportato dal browser (-1)
const wakeState = () => awake.state;
// sa: ms dall'ultimo campione dei sensori (con i sensori attivi): il computer sa che il telefono il movimento lo ha, anche
// quando il canale veloce non glielo porta
// s: sensori come li deve leggere il computer (phone-screen.reportedSensor: «tut» in attesa del tutorial senza calibrazione,
// «ready» resta «ready» anche durante il tutorial); tu: la schermata è quella del tutorial
// batteria del telefono (B27: la mostra il telecomando dello staff), dove il browser la dà (Chrome su Android; Safari no)
let battery = null;
try { navigator.getBattery?.().then(b => { battery = b; }, () => {}); } catch (e){}
const batteryState = () => battery && Number.isFinite(battery.level) ? { bt: Math.round(battery.level*100), bc: battery.charging ? 1 : 0 } : {};
const sendState = () => send({ t: 'st', s: reportedSensor(sensor), ...batteryState(), ...(gate ? { tu: 1 } : {}), b: sensor === 'ready' ? det.profile.bias : undefined, rtt, gp: grip, hz: Math.round(sampleHz), vis: document.hidden ? 0 : 1, wk: wakeState(), lk: touchLocked ? 1 : 0, ...(det.prepMode ? { pm: 1 } : {}), ...(inputMode === 'touch' ? { in: 't' } : {}), ...(inputMode === 'motion' && sensorWatch.last != null ? { sa: Math.round(performance.now() - sensorWatch.last) } : {}), ...b66State() });
// B66 · per il registro dello stand: sq campioni dei sensori dall'ultimo stato (phone-stats.createSampleStats.report), lc
// conti del blocco dei tocchi, ap stato del telefono dall'app NATPF Racchetta. I computer di prima ignorano i campi
// (mai un errore che fermi lo stato: un ponte dell'app che non risponde o una chiamata prima che le misure esistano)
// B71: sr sorgente dei sensori ('n' app, 'b' browser), fs fondo scala dichiarato dall'app [m/s², °/s], rp motivo del
// ritorno al browser (sensori-nativi.js), tk ms dall'ultimo tocco per ogni buco nei campioni
function b66State(){
  try {
    const sq = sampleStats.report(), tk = sampleStats.gapTouches(), lc = lockStats.counts, ap = appReader.read(performance.now()), fs = native.fullScale;
    // (lc sempre, anche a zero: il computer prende il primo valore della partita come partenza)
    return { ...(sq ? { sq } : {}), lc, ...(ap ? { ap } : {}), sr: native.source, ...(fs ? { fs } : {}), ...(native.why ? { rp: native.why } : {}), ...(tk.length ? { tk } : {}) };
  } catch (e){ return {}; }
}
// telefono e browser, una volta per collegamento (diagnostica): versione, blocco dello schermo e sensori disponibili
// (B45.1: cd = il racconto dell'ultima caduta, una volta sola; i computer di prima ignorano il campo)
// (B72: subito dopo, la lingua di questa pagina: annuncio a ogni collegamento, k 1; toccata senza collegamento vale come un tocco)
const sendDevice = () => { const cd = story.tell(); send({ t: 'dev', ua: navigator.userAgent, wl: 'wakeLock' in navigator, dm: typeof DeviceMotionEvent !== 'undefined', or: window.screen.orientation?.type || null, sc: [window.screen.width, window.screen.height, +(devicePixelRatio || 1).toFixed(2)], vr: NATPF_BUILD, as: accSign.sign, nm: 1, ...(cd ? { cd } : {}), ...appVersion() }); sendLang(); };
function sendLang(){ send(langMsg(lang, { link: !langDirty })); langDirty = false; }
// B66: versione dell'app NATPF Racchetta (dentro l'app), per il registro dello stand
function appVersion(){ try { const v = window.NATPFApp?.version?.(); return typeof v === 'string' && v ? { av: v.slice(0, 16) } : {}; } catch (e){ return {}; } }
// gesti che il telefono non manda come colpo, con il motivo: al computer solo se la diagnostica registra, al massimo 8 al
// secondo (un tremolio continuo non deve intasare il collegamento)
let discardWin = { at: 0, n: 0 };
function sendDiscard(why, d = {}){
  if (!diagStream || linkState !== 'on') return;
  const now = performance.now();
  if (now - discardWin.at > 1000) discardWin = { at: now, n: 0 };
  if (++discardWin.n > 8) return;
  send({ t: 'gx', r: why, v: Number.isFinite(d.peak) ? d.peak : null, a: Number.isFinite(d.angle) ? d.angle : null, d: d.dir ?? null, pk: Number.isFinite(d.peakT) ? d.peakT : now });
}
det.on('discard', d => { if (sensor === 'ready' && inputMode === 'motion') sendDiscard(d.why, d); });
let prevTick = null;
setInterval(() => {
  const now = performance.now(), life = lifeCheck({ now, lastSeen: lastRx, prevTick }); prevTick = now;
  if (!(conn && conn.open)) return;
  // il computer manda qualcosa ogni secondo (risposte ai ping, misure dell'orologio, il battito sul canale veloce): un
  // silenzio lungo vuol dire collegamento morto anche se il canale non si è chiuso (rete persa). Prima il telefono restava
  // «collegato» per sempre, non si ricollegava e i colpi si perdevano; ora si chiude e si riprende con la chiave di ripresa.
  // B45.1 (link-life.lifeCheck): dopo 10 s di silenzio vero (prima 5: un buco della Wi-Fi di 5 s faceva sempre cadere il
  // telefono); con questo controllo in ritardo (pagina ferma) prima si legge la coda. Prima di chiudere lo si dice («cl»)
  if (life.drop){ const c = conn; conn = null; try { c.send({ t: 'cl', w: 'silenzio' }); } catch (e){} try { c.close(); } catch (e){} lost('silenzio'); return; }
  send({ t: 'ping', c: now }); sendState();
}, LIFE.tickMs);
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e){} };

/* ---------- sensori ---------- */
async function enableSensors(){
  inputMode = 'motion'; selectedShot='auto'; wantFs = true; fullScreen(); lockOrientation();
  // iPhone: il permesso va chiesto subito, dentro il tocco
  const ask = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function' && window.isSecureContext
    ? DeviceMotionEvent.requestPermission().catch(() => 'denied') : null;
  await awake.tap();
  if (!window.isSecureContext) return noMotion('insecure');
  if (typeof DeviceMotionEvent === 'undefined') return noMotion('nomotion');
  if (ask && (await ask) !== 'granted') return noMotion('denied');
  // (B71: con i sensori dell'app già scelti devicemotion resta spento; altrimenti in ascolto e, con l'app, la prova)
  motionWanted = true;
  if (!native.feeds) addEventListener('devicemotion', onMotion);
  native.start();
  motionSeen = false;
  setTimeout(() => { if (!motionSeen && inputMode === 'motion') noMotion('nomotion'); }, 1500);
  const saved = ss.get('profile');
  // (profilo fatto con il segno dei sensori di prima, per esempio su iPhone prima della correzione: si ricalibra)
  if (saved?.version === 4 && saved.input !== 'touch' && (saved.grip || 'upright') === grip && (saved.accSign ?? 1) === accSign.sign){ det.setProfile(saved); det.run(); sensor = 'ready'; face.setRest(saved.gravity, saved.bias); }
  else needCal();                                   // con il tutorial aperto: prima il tutorial, poi la calibrazione
  sendState(); paint();
}
function noMotion(why){
  removeEventListener('devicemotion', onMotion);
  motionWanted = false; native.stop();
  sensor = why; sendState(); paint();
  ui({ denied: 'Sensori negati', insecure: 'Serve https', nomotion: 'Sensori non disponibili' }[why], {
    denied: 'Su iPhone ricarica la pagina e tocca «Consenti»; su Android tocca il lucchetto accanto all\'indirizzo e consenti i sensori. Oppure «Gioca con i tocchi».',
    insecure: 'I sensori vogliono una pagina https. In LAN serve il certificato NATPF sul telefono.',
    nomotion: 'Questo browser non dà i sensori. Usa Chrome (Android) o Safari (iPhone) e inquadra di nuovo il QR.',
  }[why], 'miss');
}
function onMotion(e){
  const raw = sampleFromMotion(e, e.timeStamp || performance.now());   // istante dell'evento, non della lettura
  // B71: in prova il campione del browser serve anche al confronto con l'app (e guida ancora i colpi); con i sensori
  // dell'app scelti il browser non guida più niente
  if (native.state !== 'off'){ if (native.feeds) return; native.browser(raw); }
  feedSample(raw, e);
}
// un campione dei sensori, del browser (e: l'evento devicemotion) o dell'app (B71, e: NATIVE_EV), per il rilevatore, la
// calibrazione, le misure e il computer: lo stesso lavoro per tutti e due
function feedSample(raw, e){
  lastRawG = raw.accG;
  const k = normalizeSample(raw, accSign.sign);
  if (!k.rot && !k.acc) return;
  motionSeen = true; sensorWatch.feed(performance.now());
  sampleStats.feed(raw.t, { rot: raw.rot, accG: raw.accG, interval: e.interval });
  // Presentation stream is disposable; reliable swing packets retain the real sensor peak.
  if (linkState === 'on' && conn?.sendMotion && k.t - lastSensorSent >= 1000/SENSOR_HZ){
    const packet = encodeSensor(k, sensorSequence++);
    if (packet && conn.sendMotion(packet)) lastSensorSent = k.t;
  }
  // frequenza vera dei sensori di questo telefono (Hz), per la diagnostica del computer
  if (lastSampleT != null && k.t > lastSampleT) sampleHz += (1000/Math.min(200, k.t - lastSampleT) - sampleHz)*.05;
  lastSampleT = k.t;
  // diagnostica (il computer la chiede con cfg.diag): ogni campione grezzo, uguale in LAN e via internet, per registrarlo
  if (linkState === 'on' && diagStream){
    const rs = { t: 'rs', q: rawSeq++, k: Math.round(k.t*10)/10, r: k.rot && k.rot.map(v => Math.round(v*10)/10), a: k.acc && k.acc.map(v => Math.round(v*100)/100), g: k.accG && k.accG.map(v => Math.round(v*100)/100) };
    if (!sendFast(rs)) send(rs);
  }
  // Orientamento del piatto al computer, 30 volte al secondo: la racchetta in gioco segue questo, identico in LAN e via
  // internet (corretto con la gravità, senza deriva). Il flusso binario della LAN resta per chi lo usa.
  let f = null;
  if (face.ready){
    f = face.feed(k);
    // in LAN a ogni campione (costa poco e toglie fino a 33 ms alla racchetta a schermo), via internet 30 volte al secondo
    // sul percorso veloce: conta solo l'ultimo (k, istante sul telefono, scarta quelli arrivati fuori ordine)
    if (f && linkState === 'on' && k.t - lastFaceSent >= (isLanMode() ? 0 : 33)){ lastFaceSent = k.t; const fo = { t: 'fo', k: Math.round(k.t*10)/10, y: f.yaw, p: f.pitch, r: f.roll }; if (!sendFast(fo)) send(fo); }
    if (f && grip === 'flat' && k.t - lastFacePaint >= 60){ lastFacePaint = k.t; paintFace(f); }
  }
  // via internet senza orientamento del piatto (prima della calibrazione): giroscopio a 30 Hz in JSON. Solo se manca il
  // canale binario della LAN (prima questo ramo partiva anche in LAN tra un pacchetto binario e l'altro)
  if (!f && !conn?.sendMotion && linkState === 'on' && streamJson && sensor === 'ready' && k.rot && k.t - lastSensorSent >= 1000/30){
    lastSensorSent = k.t; send({ t: 'sm', q: sensorSequence++, k: Math.round(k.t*10)/10, r: k.rot.map(v => Math.round(v*10)/10) });
  }
  det.feed(k);
  if (sensor === 'cal') cal.tick(k.t, k);
}
// indicatore sul telefono: la freccia gira con il piatto (sinistra/destra), il pallino sale se il piatto è aperto
function paintFace(f){
  const yaw = Math.max(-60, Math.min(60, f.yaw)), pitch = Math.max(-40, Math.min(40, f.pitch));
  $('#faceArrow').setAttribute('transform', `rotate(${yaw.toFixed(1)})`);
  $('#facePitch').setAttribute('cy', String(22 - pitch*.5));
  const side = yaw > 8 ? 'verso destra →' : yaw < -8 ? '← verso sinistra' : 'dritto verso la rete';
  $('#faceTxt').textContent = `Piatto ${side}${pitch > 15 ? ' · aperto ↑' : pitch < -15 ? ' · chiuso ↓' : ''}`;
}
function setGrip(value){
  const next = value === 'flat' && ALLOW_FLAT ? 'flat' : 'upright';
  $('#gripMode').value = next;
  if (next === grip) return;
  grip = next; ss.set('grip', grip); face.reset(); lockOrientation();
  // profilo fatto con l'altra presa: si rifà la calibrazione (breve)
  if (inputMode === 'motion' && (sensor === 'ready' || sensor === 'cal')){ ss.del('profile'); needCal(); }
  sendState(); paint();
}
// Tutorial sul computer prima della calibrazione (richiesta del 04/11, B9 il 05/11): il computer lo chiede con cfg
// { tut: 1, tv: 2 }; il telefono risponde che lo sa fare ({ t: 'tut', w: 1, v: 2 }), dopo «Attiva i sensori» non calibra
// subito ma mostra la schermata del tutorial con «Tutto chiaro, ho capito» acceso da subito (B28, 12/11: prima spento finché
// il computer non diceva, tp, che tutte le schede erano state viste); le frecce ‹ › mandano { t: 'tut', nav: ±1 }. Al tocco
// manda { t: 'tut', ok: 1 } e calibra (o torna a «Pronto» se era già calibrato; con la calibrazione «Giocando» il computer
// chiede subito il profilo semplice). Un computer ancora più vecchio non manda tut: tutto come prima
function tutDone(){
  if (!tutConfirmable(gate)) return;
  setGate(null); send({ t: 'tut', ok: 1 });
  sensor = sensorOnGateClose(sensor); if (sensor === 'cal') startCal();
  clearTimeout(tutLitT); $('#tutOk').classList.remove('lit');
  sendState(); paint();
}
// «Tutto chiaro» quando compare (B28: acceso da subito): un lampo breve. Senza vibrazione: il tutorial può aprirsi prima
// di un tocco sulla pagina, e lì il browser blocca la vibrazione e lo scrive come errore
function lightTut(){ const b = $('#tutOk'); b.classList.remove('lit'); void b.offsetWidth; b.classList.add('lit'); clearTimeout(tutLitT); tutLitT = setTimeout(() => b.classList.remove('lit'), 1400); }
// calibrazione da capo (con i tocchi: il profilo dei tocchi); chiesta con il tutorial aperto, aspetta la sua fine
function startCal(){ sensor = 'cal'; if (inputMode === 'touch') cal.useTouch(); else cal.start(preferences(), { lead: CAL.lead }); }
function needCal(){ if (sensorForCal(gate) === 'idle') sensor = 'idle'; else startCal(); }
function command(c){
  // avvio con un attimo di attesa (CAL.lead): chi ha appena toccato «Ricalibra» sta ancora prendendo il telefono
  if (c === 'cal'){ if (sensor === 'off') return; ss.del('profile'); needCal(); sendState(); paint(); }
  if (c === 'retry' && sensor === 'cal') cal.retry();
  if (c === 'relink') relink();
  if (c === 'unlockTouch') unlockTouch();
  if (c === 'invert') cal.invert();
  if (c === 'skipGrip') cal.skipGrip();
  if (c === 'free') cal.tryFree();
  // dal computer: «Salta» durante la calibrazione, anche nel passo «fermo» → profilo semplice: verso, tipo di colpo e
  // forza vengono comunque dal gesto (manca solo il colpo tipico)
  if (c === 'skip' && sensor === 'cal' && inputMode === 'motion'){ const p = cal.skip(); det.setContext(phase); if (p){ sensor = 'ready'; sendState(); paint(); } }
  if (c === 'confirm'){ const p = cal.confirm(); det.setContext(phase); if (p){ ss.set('profile', { ...p, accSign: accSign.sign }); sensor = 'ready'; sendState(); paint(); } }
}
cal.on(e => { sendCal(e);
  // gesto successivo pronto: il «Riconosciuto» del gesto prima lascia subito il posto alla nuova freccia (come sul
  // computer); «Altro verso» resta il suo tempo (mostra già la freccia giusta)
  if (e.kind === 'ready' && flashT && lastAttemptOk){ clearTimeout(flashT); flashT = null; }
  if (e.kind === 'attempt') lastAttemptOk = !!e.ok;
  paint();
  // esito del gesto: la freccia è sempre quella del gesto chiesto (come sul computer), anche quando il verso era sbagliato
  if (e.kind === 'attempt') flash(e.ok ? 'hit' : 'miss', e.ok ? 'Riconosciuto' : e.why === 'piccolo' ? 'Più deciso' : 'Altro verso', e.ok ? '' : e.why === 'piccolo' ? 'Un colpetto un po’ più ampio.' : `Hai mosso ${ARROW[e.dir] || '?'}: rifallo ${ARROW[e.want] || ''}`, 900, ARROW[e.want]);
  if (e.kind === 'free') flash(e.ok ? 'hit' : 'miss', e.ok && e.dirValue === 0 ? 'Centro' : ARROW[e.dir], `Forza ${Math.round(Math.min(1.5, e.strength)*100)}%`, 500);
});
det.on('swing', s => {
  // durante il tutorial nessun colpo (il telefono può essere già calibrato e il computer in campo)
  if (sensor !== 'ready' || gate || linkState !== 'on' || inputMode !== 'motion' || !['play','serve','toss'].includes(phase)){
    if (sensor === 'ready' && inputMode === 'motion') sendDiscard(gate ? 'tutorial' : 'fase ' + phase, s);
    return;
  }
  const flags = shotFlags(selectedShot, s);
  // (B66: gapMs, il buco più lungo nei campioni durante il gesto, se c'è stato: per il registro dello stand)
  const gapMs = sampleStats.gapIn(s.peakT - (Number.isFinite(s.dur) ? s.dur : 300) - 50, Number.isFinite(s.t) ? s.t : s.peakT);
  const msg = swingMessage(s, { flags, grip, faceRef: det.profile.faceRef, rtt, now: performance.now(), sampleHz, seq: ++swingSeq, gapMs });
  // il colpo parte su due strade: tre copie sul percorso veloce (se un pacchetto si perde arriva la copia dopo, nessuno
  // aspetta una ritrasmissione) e una sul canale affidabile (arriva sempre, anche se tardi). Il computer tiene la prima
  // e scarta le altre con il numero del colpo. Prima c'era solo il canale affidabile e ordinato: con il Wi-Fi che perde
  // pacchetti un colpo poteva arrivare 0,1–0,9 s dopo
  sendFast(msg); send(msg); setTimeout(() => sendFast(msg), 8); setTimeout(() => sendFast(msg), 24);
  const cue = ({drive:'Gesto letto',lob:'Verso l’alto',slice:'Taglio verso il basso',drop:'Tocco corto',serve:'Movimento letto',smash:'Colpo dall’alto'})[s.shot] || 'Gesto letto';
  flash('hit', cue, `Forza ${Math.round(s.power*100)}%`, 350);
});

// preparazione del colpo (racchetta portata indietro): al gioco per animarla e per premiare chi si prepara
det.on('prep', p => {
  if (sensor !== 'ready' || gate || linkState !== 'on' || inputMode !== 'motion' || phase !== 'play') return;
  send({ t: 'pr', dir: p.dir, pk: p.peakT, v: p.peak, a: p.angle, lat: rtt/2 + (performance.now() - p.peakT) });
});

function paintShots(){
  const key = `${inputMode}:${sensor === 'cal'}:${selectedShot}:${lang}`; if (shotsPaintKey === key) return; shotsPaintKey = key;
  $('#shotChoices').innerHTML = Object.entries(SHOT_NAMES).filter(([k]) => sensor === 'cal' || !['serve','smash'].includes(k)).map(([key,label]) => `<button data-shot="${key}" class="${selectedShot===key?'on':''}" aria-pressed="${selectedShot===key}">${L(label)}</button>`).join('');
}
// La presa fisica (telefono di taglio, inclinato, girato nella mano) e l'orientamento della pagina sono due cose diverse:
// i sensori sono nel riferimento del telefono e il rilevatore non si ferma mai per il portrait o il landscape (prima in
// landscape si fermava e i colpi sparivano: con il telefono di taglio e il lato lungo in avanti il sistema può girare la
// pagina). La pagina prova a restare in verticale (a schermo intero dal primo tocco); se si gira, lo dice senza bloccare.
function lockOrientation(){ try { window.screen.orientation?.lock?.(grip === 'flat' ? 'landscape' : 'portrait').catch(() => {}); } catch(e){} checkOrientation(); }
function fullScreen(){
  if (document.fullscreenElement){ lockOrientation(); return; }
  document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).then(lockOrientation, () => {});
}
let landHint = false, landHintT = null;
function checkOrientation(){
  const land = matchMedia('(orientation: landscape)').matches, turned = grip !== 'flat' && land;
  document.body.classList.toggle('flat', grip === 'flat'); document.body.classList.toggle('land', land);
  if (turned === landHint) return;
  landHint = turned; show('#rotate', turned); clearTimeout(landHintT);
  if (turned) landHintT = setTimeout(() => show('#rotate', false), 3000);
}
addEventListener('resize', checkOrientation); addEventListener('orientationchange', checkOrientation);
$('#shotChoices').addEventListener('click', e => { const value=e.target.dataset.shot; if (SHOT_NAMES[value]){ selectedShot=value; paintShots(); send({ t:'cal',e:{kind:'selection',shot:value} }); } });
$('#power').addEventListener('input', () => { $('#powerLabel').textContent = $('#power').value+'%'; });
$('#touchHit').addEventListener('pointerdown', e => { if (inputMode === 'motion'){ e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); det.setArmed(true); } });
for (const event of ['pointerup','pointercancel','lostpointercapture']) $('#touchHit').addEventListener(event, () => { if (inputMode === 'motion' && det.profile.intentGate) det.setArmed(false); });
$('#touchHit').addEventListener('click', () => {
  if (inputMode !== 'touch' || linkState !== 'on') return;
  if (touchLocked && phase === 'serve') { send({ t: 'toss', pk: performance.now() }); return; }
  const power=+$('#power').value/100, dir=+$('#aimDir').value;
  if (sensor === 'cal'){ cal.touch(dir,power,selectedShot); return; }
  if (sensor !== 'ready' || gate || !['play','serve','toss'].includes(phase)) return;
  send({ t:'sw',pk:performance.now(),p:power,dir,l:0,...shotFlags(selectedShot) });
});
$('#gripMode').addEventListener('change', e => setGrip(e.target.value));
// mano: una sola per tutto il gioco. Cambiata qui va al computer, che la applica e la rimanda (cfg)
$('#hand').addEventListener('change', e => { applyHand(e.target.value); send({ t: 'hand', h: $('#hand').value }); });
// B46: due tocchi per cambiare mano (handTap): il primo chiede conferma, il secondo entro HAND_CONFIRM.ms la cambia
$('#profileOptions').addEventListener('click', e => {
  const b = e.target.closest('[data-hand]'); if (!b) return;
  const r = handTap(handArm, { want: b.dataset.hand, current: $('#hand').value, now: performance.now() });
  handArm = r.armed; clearTimeout(handArmT);
  if (handArm){ buzz([25]); handArmT = setTimeout(() => { handArm = null; paintHand(); }, HAND_CONFIRM.ms + 60); }
  if (r.commit){ $('#hand').value = r.commit; $('#hand').dispatchEvent(new Event('change')); }
  paintHand();
});
$('#enableTouch').addEventListener('click', () => { lockOrientation(); inputMode='touch'; selectedShot='drive'; det.stop(); needCal(); sendState(); paint(); });
// (B72: l'ultima scritta in italiano, per riscriverla nell'altra lingua al cambio)
let phaseFb = '';
det.on('phase', value => {
  // (niente «Pronto» qui: lo dice già la schermata, prima compariva due volte)
  phaseFb = ({ preparation:'Preparazione',contact:'Colpo riconosciuto',follow:'Accompagnamento' })[value] || '';
  $('#phaseFeedback').textContent = L(phaseFb);
});
/* ---------- pulsanti ---------- */
$('#enable').addEventListener('click', enableSensors);
$('#retry').addEventListener('click', () => { tries = 0; connect(); });
$('#relink').addEventListener('click', e => { e.stopPropagation(); relink(); });
// «qui è successo un problema»: un segno nel registro della diagnostica, con l'ora del computer
$('#mark').addEventListener('click', e => { e.stopPropagation(); if (linkState !== 'on') return; send({ t: 'mk', x: 'segno dal telefono' }); buzz([30, 60, 30]); flash('hit', 'Segnato', 'Il momento è nella registrazione del computer.', 900); });
$('#recal').addEventListener('click', () => command('cal'));
// «Rivincita» (stesso schermo, fine partita): si chiede al computer, che parte quando l'hanno chiesta tutti e due
$('#rematch').addEventListener('click', e => { e.stopPropagation(); if (!rematch || rematch.me || linkState !== 'on') return; rematch = { ...rematch, me: true }; send({ t: 'rm', y: 1 }); buzz([30]); paint(); });
// «Avanti ›»: il computer va avanti senza il gesto (un tocco alla volta: l'offerta dopo arriva dal computer)
// B41.3: con il numero dell'offerta toccata; il pulsante si spegne fino all'offerta dopo (nextTap), o per NEXT_REARM_MS
$('#next').addEventListener('click', e => {
  e.stopPropagation();
  const r = linkState === 'on' ? nextTap(nextOffer) : null; if (!r) return;
  nextOffer = r.offer; send(r.msg);
  if (e.isTrusted && r.offer.ready){ wantFs = true; fullScreen(); awake.tap(); }
  buzz([30]); paint();
  const tapped = nextOffer; clearTimeout(nextRearmT);
  nextRearmT = setTimeout(() => { if (nextOffer === tapped){ nextOffer = { ...tapped, sent: false }; paint(); } }, NEXT_REARM_MS);
});
// B54: «Conferma» (o «Fatto» della tastiera) e «Salta»: un nome alla volta, controllato subito qui e poi dal computer
function nameAnswer(skip){
  const r = linkState === 'on' ? nameSubmit(nameOffer, $('#nameInput').value, { skip }) : null; if (!r) return;
  if (r.why){ nameWhy = r.why; buzz([20, 40, 20]); paint(); return; }
  nameOffer = r.offer; nameWhy = ''; send(r.msg);
  if (r.offer.v) $('#nameInput').value = r.offer.v;
  $('#nameInput').blur(); buzz([30]); paint();
  const sent = nameOffer; clearTimeout(nameRearmT);
  nameRearmT = setTimeout(() => { if (nameOffer === sent){ nameOffer = { ...sent, sent: false }; paint(); } }, NAME_REARM_MS);
}
$('#nameBox').addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); nameAnswer(false); });
$('#nameSkip').addEventListener('click', e => { e.stopPropagation(); nameAnswer(true); });
$('#nameInput').addEventListener('input', () => { if (nameWhy){ nameWhy = ''; paint(); } });
// «Salta la calibrazione»: profilo semplice, si gioca subito (lo stesso di «Salta» sul computer)
$('#calSkip').addEventListener('click', e => { e.stopPropagation(); command('skip'); });
$('#tutOk').addEventListener('click', tutDone);
// frecce del tutorial: il computer cambia scheda e rimanda l'avanzamento (tp)
$('#tutPrev').addEventListener('click', e => { e.stopPropagation(); if (gateNav(gate).prev) send({ t: 'tut', nav: -1 }); });
$('#tutNext').addEventListener('click', e => { e.stopPropagation(); if (gateNav(gate).next) send({ t: 'tut', nav: 1 }); });
$('#bye').addEventListener('click', () => {
  const wasStand = !!pair?.stand;
  // (B45.1: il computer sa che non è una caduta della rete)
  try { conn?.open && conn.send({ t: 'cl', w: 'scollega' }); } catch (e){}
  linkState = 'denied'; ++connectEpoch; clearTimeout(retryT); clearTimeout(connect.t); pendingConn = null;
  ss.del('resume'); ss.del('pair'); ss.del('profile'); pair = null; closeFast();
  try { conn && conn.close(); } catch (e){} conn = null; linkState = 'denied';
  if (peer && !peer.destroyed) peer.destroy(); peer = null;
  // (telefono dello stand, B41.3: «Scollega» è dello staff, dietro la pressione lunga; il posto si dimentica su questo telefono)
  if (wasStand){ standStore.clear(); stand = null; staffUntil = 0; }
  removeEventListener('devicemotion', onMotion); motionWanted = false; native.stop(); sensor = 'off'; paint();
  ui('Scollegato', wasStand ? 'Non è più un telefono dello stand: per rimetterlo al suo posto lo staff lo abbina di nuovo.' : 'Per giocare di nuovo inquadra il codice QR sul computer.');
});
// tocco sullo schermo al servizio: lancia la palla
$('#stage').addEventListener('pointerdown', () => { if (phase === 'serve' && sensor === 'ready' && !gate) send({ t: 'toss', pk: performance.now() }); });
// schermo sempre acceso durante il gioco (il telefono non si tocca): phone-keep.js riprende il blocco al ritorno in primo
// piano, dopo un rilascio o un rifiuto a pagina visibile e a ogni tocco. Pagina nascosta: il computer lo sa subito
// (prima che il telefono si sospenda) e mette in pausa
document.addEventListener('visibilitychange', () => {
  // (B45.1: per il racconto di una caduta con la pagina nascosta)
  if (document.hidden) pageHiddenAt = performance.now(); else pageVisibleAt = performance.now();
  if (document.hidden) lockStats.hidden(touchLocked);
  // (B71: a pagina nascosta i sensori dell'app sono spenti dall'app stessa: non è un guasto)
  if (document.hidden) native.hidden(); else native.visible();
  if (document.hidden || sensor === 'off') sendState(); else onVisible();
});
// pagina sospesa dal browser e ripresa (Android): come il ritorno in primo piano
document.addEventListener('resume', () => { if (!document.hidden && sensor !== 'off') onVisible(); });
document.addEventListener('pointerdown', () => {
  if (sensor !== 'off') awake.tap();
  if (fsAfterVisible){ fsAfterVisible = false; if (wantFs) fullScreen(); }
}, { passive: true });
// tocco con il telefono in mano: conferma del segno dei sensori (motion-sign.js). Se cambia, la calibrazione fatta con
// il segno di prima non vale: si rifà
document.addEventListener('pointerdown', () => {
  // (telefono dello stand, B41.3: confermato da SIGN.votes tocchi concordi, il segno si salva e non si vota più)
  // (B46: si vota solo dove il telefono si tiene davanti per leggere, phone-screen.tapVotesSign: mai al servizio, nello
  // scambio o negli scambi di prova, dove il tocco del lancio arriva con il telefono tenuto come una racchetta)
  if (touchLocked || !lastRawG || !tapVotesSign({ screen: viewScreen, phase, trial }) || (pair?.stand && stand && !standSignStep({ saved: stand.as ?? null }).vote)) return;
  const changed = accSign.vote(lastRawG);
  if (pair?.stand && stand){ const st = standSignStep({ votes: accSign.votes, sign: accSign.sign, need: SIGN.votes, agree: SIGN.agree }); if (st.save){ stand = { ...stand, as: st.save }; standStore.save(stand); } }
  if (!changed) return;
  sendDevice();
  if (inputMode === 'motion' && (sensor === 'ready' || sensor === 'cal')){ ss.del('profile'); face.reset(); needCal(); sendState(); paint(); }
}, { passive: true });
// (B45.1: prima di chiudere lo si dice al computer, «cl», e la caduta resta nel racconto della scheda; B45.2: pageGoing)
addEventListener('pagehide', pageGoing);
// di nuovo in primo piano: prima si riprende il blocco, poi si manda lo stato (il computer non deve vedere per un attimo
// un blocco che manca); i sensori hanno il tempo di ripartire. Il computer non ha potuto rispondere mentre la pagina era
// sospesa: un ping subito e 2 s per la risposta, poi il controllo di vita (B45.1: 10 s) (prima si chiudeva e riapriva anche un
// collegamento vivo). Collegamento perso mentre il telefono dormiva: si riprova subito, con la chiave di ripresa
function onVisible(){
  const now = performance.now();
  sensorWatch.restart(now);
  // (B45.1: 2 s per la risposta prima del controllo di vita, che ora aspetta LIFE.silentMs)
  if (conn?.open){ lastRx = Math.max(lastRx, now - (LIFE.silentMs - 2000)); send({ t: 'ping', c: now }); }
  else if (linkState === 'lost' && pair){ tries = 0; connect(); }
  awake.visible().then(sendState);
  veil.back(now); fsAfterVisible = true;
  paintAlert();
}

/* ---------- avvisi: sensori fermi, schermo che può spegnersi ---------- */
// Sensori fermi a pagina visibile (dopo lo schermo spento il browser non sempre li riprende): si dice qui, con il
// pulsante per riattivarli; se non ripartono, si ricarica la pagina (collegamento e calibrazione restano in questa
// scheda). Schermo che può spegnersi mentre si gioca (blocco negato, perso o non offerto dal browser): lo si dice qui,
// con il pulsante per riprovare o con cosa cambiare nelle impostazioni del telefono
function paintAlert(){
  const now = performance.now(), motion = inputMode === 'motion' && (sensor === 'ready' || sensor === 'cal' || sensor === 'idle');
  let a = null;
  // il velo dice già tutto (un tocco riprende blocco e sensori)
  if (veil.shown){}
  else if (linkState === 'on' && motion && sensorWatch.stalled(now, { visible: !document.hidden })){
    a = revivedAt != null
      ? { t: 'I sensori non sono ripartiti', p: 'Ricarica la pagina: collegamento e calibrazione restano.', b: 'Ricarica la pagina', act: 'reload' }
      : { t: 'Sensori fermi', p: 'Il telefono non manda più il movimento al gioco.', b: 'Riattiva i sensori', act: 'revive' };
  } else {
    if (revivedAt != null && sensorWatch.last > revivedAt) revivedAt = null;
    // anche durante il tutorial e la calibrazione (chi guarda il computer non tocca il telefono per un minuto)
    if (linkState === 'on' && motion && !document.hidden && awake.state !== 1 && !awake.busy)
      a = awake.state === -1
        ? { t: 'Lo schermo può spegnersi', p: 'Questo browser non lo tiene acceso: allunga lo spegnimento automatico nelle impostazioni del telefono.' }
        : { t: 'Lo schermo può spegnersi', p: 'Tocca il pulsante; se ricapita, disattiva il risparmio energetico.', b: 'Tieni acceso lo schermo', act: 'wake' };
  }
  // B41.3: telefono dello stand con la batteria bassa (dove il browser la dà), se non c'è un avviso più urgente
  if (!a && !veil.shown && pair?.stand && linkState === 'on') a = batteryAlert({ level: battery?.level, charging: !!battery?.charging });
  const key = a ? lang + a.t + a.p : '';
  if (key === alertKey) return;
  alertKey = key; show('#alert', !!a);
  if (a){
    $('#alertTitle').textContent = L(a.t); $('#alertText').textContent = L(a.p);
    const b = $('#alertBtn'); b.textContent = L(a.b || ''); b.dataset.act = a.act || ''; show('#alertBtn', !!a.b);
  }
  paintTouchLock();   // (il blocco si toglie con un avviso da toccare e torna quando l'avviso sparisce)
}
function paintVeil(){
  const active = inputMode === 'motion' && (sensor === 'ready' || sensor === 'cal' || sensor === 'idle') && !document.hidden;
  const on = veil.update(performance.now(), { active, wake: awake.state, wakeBusy: awake.busy, lastSample: sensorWatch.last });
  if ($('#wakeVeil').classList.contains('hidden') === on){ show('#wakeVeil', on); if (on) alertKey = null; paintTouchLock(); }
  // cosa è rimasto: la calibrazione solo se il telefono era calibrato (phone-screen.veilText)
  if (on){ const t = L(veilText({ linkState, sensor, gate })), el = $('#wakeVeilText'); if (el.textContent !== t) el.textContent = t; }
}
setInterval(() => { paintVeil(); paintAlert(); tellAppInUse(); }, 500);
// B71: all'app NATPF Racchetta 1.0.5 se il telefono è in uso (partita, servizio, pausa, calibrazione, tocchi bloccati):
// lo schermo spento con il tasto di accensione impugnando il telefono lo riaccende da sola (natpf-android RisveglioSchermo)
let appInUse = null;
function tellAppInUse(){
  const app = window.NATPFApp;
  if (typeof app?.inUso !== 'function') return;
  const on = touchLocked || sensor === 'cal' || (sensor === 'ready' && ['serve', 'toss', 'play', 'pause'].includes(phase));
  if (on === appInUse) return;
  appInUse = on;
  try { app.inUso(on); } catch (e){}
}
// un tocco sul velo: blocco dello schermo, sensori (permesso su iPhone dentro il tocco) e schermo intero
function resumeTap(){
  veil.dismiss(); show('#wakeVeil', false); fsAfterVisible = false;
  awake.tap().then(() => { sendState(); paintAlert(); });
  reviveSensors();
  if (wantFs) fullScreen();
}
$('#wakeVeil').addEventListener('click', e => { e.stopPropagation(); resumeTap(); });
$('#alertBtn').addEventListener('click', e => {
  e.stopPropagation();
  const act = e.currentTarget.dataset.act;
  if (act === 'revive') reviveSensors();
  else if (act === 'reload') location.reload();
  else if (act === 'wake') awake.tap().then(paintAlert);
});
// di nuovo in ascolto dei sensori, dentro il tocco (su iPhone il permesso va chiesto lì)
function reviveSensors(){
  const ask = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function' ? DeviceMotionEvent.requestPermission().catch(() => 'denied') : null;
  removeEventListener('devicemotion', onMotion); if (!native.feeds) addEventListener('devicemotion', onMotion);
  native.revive();   // (B71: con l'app si riaccendono anche i suoi sensori)
  revivedAt = performance.now(); sensorWatch.restart(revivedAt); alertKey = null;   // si ridisegna comunque
  paintAlert();
  if (ask) ask.then(r => { if (r !== 'granted') noMotion('denied'); });
}

/* ---------- B72 · lingua IT | EN ---------- */
// i tre selettori (barra in alto, riga sotto la mano, riquadro del telefono bloccato): quella scelta accesa; nel riquadro
// bloccato la domanda aperta («EN?») dopo il primo tocco
function paintLang(){
  const now = performance.now();
  if (langArm && now > langArm.until) langArm = null;
  for (const b of document.querySelectorAll('.lang-seg [data-lang], #langOptions [data-lang]')){
    const on = b.dataset.lang === lang, ask = !on && !!langArm && langArm.lang === b.dataset.lang && !!b.closest('#langLock');
    b.classList.toggle('on', on); b.classList.toggle('ask', ask); b.setAttribute('aria-checked', String(on));
    if (b.closest('.lang-seg')){ const t = b.dataset.lang.toUpperCase() + (ask ? '?' : ''); if (b.textContent !== t) b.textContent = t; }
  }
}
// cambio della lingua, toccata qui (va al gioco) o decisa dal gioco (cfg lg). La pagina cambia subito:
// testi fissi (translateDom), anello e scritte (lastUi), avvisi, velo, barra
function setLang(l, { from = 'tap' } = {}){
  const next = l === 'en' ? 'en' : 'it';
  if (from === 'tap'){
    langPending = { lang: next, at: performance.now() };
    if (linkState === 'on' && conn?.open) send(langMsg(next)); else langDirty = true;
  }
  if (next === lang){ paintLang(); return; }
  lang = next; writeLang(lang);
  applyLang();
}
function applyLang(){
  document.documentElement.lang = lang;
  translateDom(document.body, lang, { skip: '.lang-seg, #langOptions [data-lang]' });
  if (lastUi) ui(...lastUi);
  $('#phaseFeedback').textContent = L(phaseFb);
  alertKey = null; shotsPaintKey = '';
  paintLang(); paint(); paintAlert(); paintVeil();
}
// un tocco nella barra o sotto la mano; nel riquadro del telefono bloccato due tocchi (langTap, come la mano)
for (const box of ['#langBar', '#langOptions']) $(box)?.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b) return; e.stopPropagation(); buzz([20]); setLang(b.dataset.lang); });
$('#langLock')?.addEventListener('click', e => {
  const b = e.target.closest('[data-lang]'); if (!b) return;
  e.stopPropagation();
  const r = langTap(langArm, { want: b.dataset.lang, current: lang, now: performance.now() });
  langArm = r.armed; clearTimeout(langArmT);
  if (langArm){ buzz([25]); langArmT = setTimeout(() => { langArm = null; paintLang(); }, LANG_CONFIRM.ms + 60); }
  if (r.commit) setLang(r.commit);
  paintLang();
});
if (lang !== 'it') applyLang();

checkOrientation();
connect();
$('#gripMode').value = grip;
window.__racchetta = { det, cal, face, setGrip, setLang, get state(){ return { linkState, sensor, phase, rtt, step: cal.state.step, grip, wake: awake.state, screen: viewScreen, touchLocked, gate: gate ? { ...gate } : null, veil: !$('#wakeVeil').classList.contains('hidden'), sorgente: native.state, ripiego: native.why, lang }; } };
