// NATPF Simulator, controller smartphone: si collega al computer con i dati del QR (dopo il «#»), chiede i permessi dei sensori,
// fa la calibrazione guidata (calibration.js: i passi si vedono grandi sul computer, qui c'è il riassunto), riconosce i
// colpi (swing-detect.js) e li manda al gioco con l'istante del picco. Niente app da installare.
import { SHOT_NAMES, shotFlags } from './shot-options.js';
import { parsePairing } from './pairing.js';
import { createSwingDetector, sampleFromMotion } from './swing-detect.js';
import { createCalibration, PLAN, GESTURE_PLAN, calibrationPlan } from './calibration.js';
import { LanPeer, isLanMode } from './lan-transport.js';
import { encodeSensor, SENSOR_HZ } from './sensor-packet.js';
import { peerConfig, loadPeer } from './link.js';
import { createFaceTracker } from './face-tracker.js';
import { strokeShape } from './stroke-shape.js';
import { swingMessage } from './swing-message.js';
import { NATPF_BUILD } from './version.js';
import { createWakeKeeper, createSensorWatch } from './phone-keep.js';
import { gripSvg, GRIP_TEXT_PLAIN } from './grip-art.js';

const $ = s => document.querySelector(s);
const show = (s, on = true) => $(s).classList.toggle('hidden', !on);
// figura dell'impugnatura: la stessa del computer (grip-art.js), al posto del disegno di prima
{ const g = $('#grip'); if (g) g.outerHTML = gripSvg({ id: 'grip', cls: g.getAttribute('class') || 'hidden', compact: true }); }
const ss = { get(k){ try { return JSON.parse(sessionStorage.getItem('natpf-simulator.' + k)); } catch (e){ return null; } }, set(k, v){ try { sessionStorage.setItem('natpf-simulator.' + k, JSON.stringify(v)); } catch (e){} }, del(k){ try { sessionStorage.removeItem('natpf-simulator.' + k); } catch (e){} } };

// i dati del QR: si leggono e si tolgono subito dalla barra degli indirizzi (restano solo in questa scheda)
let pair = parsePairing(location.hash);
if (pair){ ss.set('pair', pair); ss.del('resume'); ss.del('profile'); history.replaceState(null, '', location.pathname + location.search); }
else pair = ss.get('pair');

// Presa: «upright» (predefinita, telefono in verticale come il manico) o «flat» (telefono in orizzontale nel palmo,
// display verso di sé: il dorso è il piatto). La sceglie il computer (messaggio grip) o chi gioca qui sotto.
// La presa orizzontale resta nel codice ma non si offre più: scomoda in gioco. Si gioca solo in verticale.
let grip = 'upright';
const ALLOW_FLAT = false;
// Orientamento del piatto (face-tracker.js) con entrambe le prese: è la stessa misura in LAN e via internet, dà la
// direzione del colpo all'impatto e fa seguire la racchetta in gioco. Con la presa verticale la posa «pronto» segue il
// telefono solo dopo 0,4 s fermo e lentamente: le pause della preparazione non spostano il riferimento della mira.
const det = createSwingDetector(), face = createFaceTracker(ALLOW_FLAT ? {} : { quietHold: 400, relax: 2.5 });
// ogni gesto porta con sé il piatto all'istante del picco (l'impatto)
// … e la forma del colpo (stroke-shape.js): piano, verso della testa della racchetta, rotazione sul manico
det.on('swing', s => { if (face.ready){ s.face = face.strokeFace(s.peakT, s.t - s.dur); s.head = face.headAt(s.peakT, s.axis); s.shape = strokeShape(face.history(), face.up, { peakT: s.peakT }); } });
det.on('status', s => { if (s.s === 'still-ok') face.setRest(s.gravity, det.profile.bias); });
const cal = createCalibration(det);
let lastFaceSent = -Infinity, lastFacePaint = -Infinity, lastAttemptOk = false;
let sensorSequence = 0, lastSensorSent = -Infinity;
// richieste facoltative del gioco (messaggio cfg): preparazione del colpo e flusso dei sensori anche senza canale binario
let streamJson = false, prepWanted = false, diagStream = false, sampleHz = 60, lastSampleT = null, swingSeq = 0;
let peer = null, conn = null, linkState = 'off', rtt = 80, sensor = 'off', phase = 'menu', retryT = null, tries = 0, motionSeen = false, flashT = null, lastRx = 0;
// schermo acceso e sensori vivi (phone-keep.js): ogni cambio del blocco va al computer e sullo schermo (avvisi più giù)
const awake = createWakeKeeper({ onChange: () => { sendState(); paintAlert(); } }), sensorWatch = createSensorWatch();
let revivedAt = null, alertKey = '';
// percorso veloce (link.js): via internet una seconda connessione non ordinata; in LAN il canale dei sensori
let fast = null, fastOk = false, rawSeq = 0;

/* ---------- interfaccia ---------- */
let selectedShot = 'auto', inputMode = 'motion', shotsPaintKey = '';
const preferences = () => ({ range: $('#motionRange').value, hand: $('#hand').value, intentGate: $('#intentGate').checked, gestural:true,quick:true, ...(grip === 'flat' ? { grip: 'flat' } : {}) });
const ARROW = { L: '←', R: '→', '?': '?' };
// mano scelta nel gioco (o qui, e confermata dal gioco): menu, calibrazione in corso e profilo salvato. Il verso del
// gesto non dipende dalla mano: cambia solo quale verso è il dritto, quindi il profilo resta valido
function applyHand(h){
  const hand = h === 'left' ? 'left' : 'right';
  if ($('#hand').value !== hand) $('#hand').value = hand;
  if (cal.state.options) cal.state.options.hand = hand;
  const saved = ss.get('profile');
  if (saved && saved.hand !== hand){ saved.hand = hand; ss.set('profile', saved); }
  if (sensor === 'cal') paint();
}
function ui(big, sub, ring = '', arrow = ''){ $('#big').textContent = big; $('#sub').textContent = sub; $('#ring').className = ring; $('#arrow').textContent = arrow; }
function bar(){
  const b = $('#bar');
  const txt = { off: 'Non collegato', connecting: 'Collegamento…', on: 'Collegato al computer', lost: 'Connessione persa', denied: 'Non collegato' }[linkState] || linkState;
  b.className = linkState === 'on' ? 'ok' : linkState === 'lost' || linkState === 'denied' ? 'bad' : '';
  $('#barTxt').textContent = txt; $('#lat').textContent = linkState === 'on' ? Math.round(rtt) + ' ms' : '';
}
function paint(){
  bar();
  show('#enable', linkState === 'on' && (sensor === 'off' || sensor === 'denied' || sensor === 'nomotion'));
  show('#enableTouch', linkState === 'on' && sensor !== 'ready' && inputMode !== 'touch');
  show('#profileOptions', linkState === 'on' && (sensor !== 'ready' && (sensor !== 'cal' || cal.state.step === 'review')));
  show('#shotPanel', linkState === 'on' && (sensor === 'ready' || cal.state.step === 'free'));
  show('#manualAim', inputMode === 'touch');
  show('#touchHit', inputMode === 'touch' || det.profile.intentGate);
  $('#touchHit').textContent = inputMode === 'touch' ? 'Colpisci' : 'Arma dopo l’apertura';
  show('#shotChoices',inputMode==='touch');
  $('#shotHint').textContent=inputMode==='touch'?'Scegli il colpo; smash e servizio seguono la palla.':'Dai un colpetto quando la palla arriva alla racchetta sul computer.';
  paintShots();
  show('#retry', (linkState === 'lost' || linkState === 'denied') && !!pair);
  show('#tools', linkState === 'on' && (sensor === 'ready' || sensor === 'cal'));
  show('#mark', linkState === 'on' && diagStream);
  const holding = linkState === 'on' && sensor === 'cal' && (cal.state.step === 'grip' || cal.state.step === 'still');
  show('#grip', holding && grip !== 'flat'); show('#gripFlat', holding && grip === 'flat');
  const dial = grip === 'flat' && linkState === 'on' && face.ready && (sensor === 'ready' || ['free', 'swings'].includes(cal.state.step));
  show('#faceDial', dial); show('#faceTxt', dial);
  if (linkState !== 'on' || flashT) return;
  if (sensor === 'off') ui('Collegato', 'Tocca «Attiva i sensori»: il telefono diventa la tua racchetta.');
  else if (sensor === 'cal') calUi();
  else if (sensor === 'ready') ui(phase === 'serve' ? 'Al servizio' : 'Pronto', phaseText(), 'ready');
}
function calUi(){
  const st = cal.state;
  if (st.step === 'still' && grip === 'flat') ui('Pronto, fermo', 'Telefono in orizzontale nel palmo, display verso di te: il dorso guarda la rete come le corde. Resta fermo così per 2 secondi.');
  // stessi passi e stesse parole del computer (natpf_cal_view.js): si guarda il computer, qui c'è il riassunto
  else if (st.step === 'still') ui('Tieni fermo', `${GRIP_TEXT_PLAIN} Guarda il computer.`);
  else if (st.step === 'grip') ui('La tua presa', 'Tieni il telefono come ti è comodo, senza stringere troppo.');
  else if (st.step === 'swings'){
    const plan = calibrationPlan(st.options), w = plan[st.idx], stroke = (w === 'L') !== (st.options.hand === 'left') ? 'Dritto' : 'Rovescio';
    if (!st.ready) ui(`${stroke} ${ARROW[w]}`, 'Fermo un attimo al centro…', '', '');
    else ui(`${stroke} ${ARROW[w]}`, `Ora: muovi il telefono ${w === 'L' ? 'verso sinistra' : 'verso destra'}, come un colpetto, poi fermati. Gesto ${st.idx + 1} di ${plan.length}.`, 'ready', ARROW[w]);
  }
  else if(st.step==='shots'){const g=GESTURE_PLAN[st.idx];ui(SHOT_NAMES[g.shot],`Gesto ${PLAN.length+st.idx+1} di ${PLAN.length+GESTURE_PLAN.length}: ${g.hint}`, '',g.want?ARROW[g.want]:'↑');}
  else if (st.step === 'review') ui(st.result && st.result.pass ? 'Fatto!' : 'Da rifare', st.result && st.result.pass ? 'Guarda il computer e conferma.' : 'Guarda il computer: ti dice cosa cambiare.', st.result && st.result.pass ? 'ready' : 'miss');
  else if (st.step === 'free') ui('Prova un colpetto', 'Guarda il computer: il personaggio ripete il tuo gesto. Non devi conoscere i colpi del tennis.');
}
function phaseText(){
  if (grip === 'flat' && phase === 'play') return 'Colpisci quando la palla arriva alla racchetta: gira il piatto verso dove vuoi mandarla, aprilo per il lob, chiudilo per il coperto.';
  return { menu: 'Guarda il computer per iniziare.', toss:'Colpisci quando la palla raggiunge la cima del lancio.', serve: 'Alza il telefono per far partire la palla. Poi dai un colpetto quando è in alto. Puoi anche toccare lo schermo per lanciarla.', play: 'Guarda il computer e colpisci quando la palla arriva alla racchetta. Muovi il telefono nella direzione desiderata.', pause: 'Partita in pausa: guarda il computer. Si riprende da solo quando il telefono è di nuovo pronto.', over: 'Partita finita: guarda il computer.' }[phase] || '';
}
function flash(cls, big, sub, ms = 650, arrow = ''){ ui(big, sub, cls, arrow); clearTimeout(flashT); flashT = setTimeout(() => { flashT = null; paint(); }, ms); }

/* ---------- collegamento ---------- */
async function connect(){
  clearTimeout(retryT);
  if (!pair){ linkState = 'denied'; bar(); ui('Nessuna partita', 'Inquadra il codice QR che compare sul computer.'); show('#retry', false); return; }
  linkState = 'connecting'; paint(); ui('Collegamento…', 'Mi collego al gioco sul computer.');
  // se la connessione non si apre entro 12 s (rete lenta, telefono che si addormenta) si riprova da capo
  clearTimeout(connect.t); connect.t = setTimeout(() => { if (linkState === 'connecting') lost(); }, 12000);
  try {
    const Peer = isLanMode() ? LanPeer : await loadPeer();
    if (peer && !peer.destroyed) peer.destroy();
    peer = new Peer(peerConfig());
    peer.on('open', () => {
      const c = peer.connect(pair.session, { reliable: true, serialization: 'json' });
      c.on('open', () => { const r = ss.get('resume'); c.send(r ? { t: 'hello', v: 2, r } : { t: 'hello', v: 2, k: pair.token }); });
      c.on('data', d => onData(c, d));
      c.on('close', () => { if (c === conn) lost(); });
      c.on('error', () => {});
    });
    peer.on('error', e => {
      // canale con il computer ancora aperto: un errore del solo server di segnalazione (sua rete, websocket caduto) non
      // tocca il collegamento diretto. Prima ogni errore chiudeva tutto e un canale sano andava perso
      if (conn?.open && SIGNAL_ERRORS.has(e.type)) return;
      // computer non registrato sul server: con la chiave di ripresa si riprova (gioco che si ricarica, rete del computer
      // che torna); senza, il codice del QR non porta più a una partita. Prima anche con la chiave si cancellava tutto
      if (e.type === 'peer-unavailable' && !ss.get('resume')){ linkState = 'denied'; paint(); ui('Partita non trovata', 'Il gioco sul computer è stato chiuso o ricaricato. Inquadra di nuovo il codice QR.'); return; }
      lost();
    });
    // server di segnalazione perso con il canale aperto: ci si ricollega al server senza toccare il canale (come il computer)
    peer.on('disconnected', () => { const p = peer; setTimeout(() => { if (p === peer && !p.destroyed && conn?.open) try { p.reconnect(); } catch (e){} }, 1500); });
  } catch (e){ lost(); }
}
const SIGNAL_ERRORS = new Set(['network', 'disconnected', 'socket-error', 'socket-closed', 'server-error', 'unavailable-id', 'lan-signaling']);
// eventi della calibrazione al computer (anche quelli che descrivono il passo attuale dopo una ripresa del collegamento)
const sendCal = e => send({ t: 'cal', e: { ...e, shot: e.shot || (inputMode === 'touch' ? selectedShot : 'drive') } });
function onData(c, d){
  if (!d || typeof d !== 'object') return;
  if (c === conn || d.t === 'welcome') lastRx = performance.now();
  switch (d.t){
    case 'welcome':
      conn = c; linkState = 'on'; tries = 0; fastOk = d.f === 1; if (d.r) ss.set('resume', d.r); sendState(); openFast(); sendDevice();
      // ripresa a calibrazione in corso: gli eventi fatti mentre il collegamento era giù sono andati persi, il computer
      // riceve il passo attuale (prima restava al gesto di prima mentre il telefono era già alla verifica)
      if (sensor === 'cal') for (const e of cal.replay()) sendCal(e);
      paint(); break;
    case 'deny':
      linkState = 'denied'; ss.del('resume');
      ui('Non collegato', d.why === 'busy' ? 'C\'è già un altro telefono collegato a questo computer.' : 'Il codice è scaduto o è già stato usato: inquadra di nuovo il QR sul computer.');
      paint(); try { c.close(); } catch (e){} break;
    case 'pong': rtt = rtt*.7 + (performance.now() - d.c)*.3; bar(); break;
    case 'dp': send({ t: 'dq', d: d.d, p: performance.now() }); break;
    case 'grip': setGrip(d.g); break;
    // il gioco chiede la modalità preparazione (prep) e il flusso dei sensori in JSON quando non c'è il canale binario (mo)
    case 'cfg': prepWanted = !!d.prep; det.setPrepMode(prepWanted); streamJson = !!d.mo; diagStream = !!d.diag; if (d.hand === 'left' || d.hand === 'right') applyHand(d.hand); sendState(); paint(); break;
    // verso del colpo atteso (da che parte arriva la palla): +1 da destra a sinistra, -1 da sinistra a destra, 0 non si sa
    case 'ex': det.setExpect(d.d); break;
    case 'practice': if (inputMode==='touch' && SHOT_NAMES[d.shot]){ selectedShot = d.shot; paintShots(); } break;
    case 'ph': phase = d.ph; det.setContext(phase); if (phase === 'play' && ['serve','smash'].includes(selectedShot)) selectedShot = 'drive'; if (sensor === 'ready') paint(); break;
    case 'cmd': command(d.c); break;
    case 'ev': {
      const vib = Array.isArray(d.vib) && d.vib.length <= 6 && d.vib.every(v => Number.isFinite(v) && v >= 0 && v <= 400) ? d.vib : null;
      if (d.k === 'contact'){ buzz(vib || (d.label === 'perfetto' ? [40] : [20])); flash('hit', ({ drop: 'Palla corta!', lob: 'Lob!', slice: 'Tagliato!', smash: 'Smash!' }[d.shot]) || ({ perfetto: 'Perfetto!', buono: 'Bel colpo', anticipo: 'In anticipo', ritardo: 'In ritardo' }[d.label] || 'Colpo!'), ''); }
      if (d.k === 'miss') { buzz(vib || [90]); flash('miss', { presto: 'Troppo presto', tardi: 'Troppo tardi', nessuno: 'Nessun colpo', portata: 'Troppo lontana' }[d.why] || 'Mancata', d.why === 'nessuno' ? 'Il movimento non è arrivato: riprova con un colpetto comodo.' : ''); }
      if (d.k === 'point') flash(d.mine ? 'hit' : 'miss', d.mine ? 'Punto tuo' : 'Punto avversario', d.txt || '', 1300);
      break;
    }
    case 'bye': ss.del('resume'); ss.del('pair'); pair = null; closeFast(); linkState = 'denied'; paint(); ui('Scollegato', 'Il computer ha scollegato il telefono. Per giocare di nuovo inquadra il nuovo QR.'); try { c.close(); } catch (e){} break;
  }
}
function lost(){
  if (linkState === 'denied') return;
  closeFast();
  conn = null; linkState = 'lost'; paint(); ui('Connessione persa', 'Riprovo da solo tra poco. Sul computer puoi riprovare il collegamento.');
  if (tries++ < 10) retryT = setTimeout(connect, Math.min(6000, 1000*tries));
}
const send = m => { if (conn && conn.open) try { conn.send(m); } catch (e){} };
// messaggi che valgono solo se arrivano subito: senza ritrasmissioni e senza ordine, così un pacchetto perso non ferma
// quelli dopo. false se il percorso non c'è (allora chi chiama usa send)
const sendFast = m => {
  if (!(conn && conn.open) || !fastOk) return false;
  if (conn.sendFast) return conn.sendFast(m);
  if (fast?.open) try { fast.send(m); return true; } catch (e){}
  return false;
};
// via internet: seconda connessione dello stesso telefono, non ordinata (il computer la accetta solo da questo peer)
function openFast(){
  if (!fastOk || isLanMode() || !peer || peer.destroyed || fast?.open) return;
  closeFast();
  try {
    const f = fast = peer.connect(pair.session, { reliable: false, serialization: 'json', label: 'fast-' + Math.random().toString(36).slice(2, 10) });
    f.on('close', () => { if (fast === f) fast = null; });
    f.on('error', () => {});
  } catch (e){ fast = null; }
}
function closeFast(){ const f = fast; fast = null; if (f) try { f.close(); } catch (e){} }
// vis: pagina in primo piano (0 = nascosta: schermo spento, altra app); wk: blocco dello schermo attivo (1), non
// attivo (0, negato o perso: lo schermo può spegnersi dopo il tempo del telefono), non supportato dal browser (-1)
const wakeState = () => awake.state;
const sendState = () => send({ t: 'st', s: sensor === 'off' ? 'sensors' : sensor, b: sensor === 'ready' ? det.profile.bias : undefined, rtt, gp: grip, hz: Math.round(sampleHz), vis: document.hidden ? 0 : 1, wk: wakeState(), ...(det.prepMode ? { pm: 1 } : {}), ...(inputMode === 'touch' ? { in: 't' } : {}) });
// telefono e browser, una volta per collegamento (diagnostica): versione, blocco dello schermo e sensori disponibili
const sendDevice = () => send({ t: 'dev', ua: navigator.userAgent, wl: 'wakeLock' in navigator, dm: typeof DeviceMotionEvent !== 'undefined', or: screen.orientation?.type || null, sc: [screen.width, screen.height, +(devicePixelRatio || 1).toFixed(2)], vr: NATPF_BUILD });
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
setInterval(() => {
  if (!(conn && conn.open)) return;
  // il computer manda qualcosa ogni secondo (risposte ai ping, misure dell'orologio): 5 s di silenzio vogliono dire
  // collegamento morto anche se il canale non si è chiuso (rete persa). Prima il telefono restava «collegato» per sempre,
  // non si ricollegava e i colpi si perdevano; ora si chiude e si riprende con la chiave di ripresa
  if (performance.now() - lastRx > 5000){ const c = conn; conn = null; try { c.close(); } catch (e){} lost(); return; }
  send({ t: 'ping', c: performance.now() }); sendState();
}, 1000);
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e){} };

/* ---------- sensori ---------- */
async function enableSensors(){
  inputMode = 'motion'; selectedShot='auto'; fullScreen(); lockOrientation();
  // iPhone: il permesso va chiesto subito, dentro il tocco
  const ask = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function' && window.isSecureContext
    ? DeviceMotionEvent.requestPermission().catch(() => 'denied') : null;
  await awake.tap();
  if (!window.isSecureContext) return noMotion('insecure');
  if (typeof DeviceMotionEvent === 'undefined') return noMotion('nomotion');
  if (ask && (await ask) !== 'granted') return noMotion('denied');
  addEventListener('devicemotion', onMotion);
  motionSeen = false;
  setTimeout(() => { if (!motionSeen && inputMode === 'motion') noMotion('nomotion'); }, 1500);
  const saved = ss.get('profile');
  if (saved?.version === 4 && saved.input !== 'touch' && (saved.grip || 'upright') === grip){ det.setProfile(saved); det.run(); sensor = 'ready'; face.setRest(saved.gravity, saved.bias); }
  else { sensor = 'cal'; cal.start(preferences()); }
  sendState(); paint();
}
function noMotion(why){
  removeEventListener('devicemotion', onMotion);
  sensor = why; sendState(); paint();
  ui({ denied: 'Sensori negati', insecure: 'Serve https', nomotion: 'Sensori non disponibili' }[why], {
    denied: 'Hai negato l\'accesso ai sensori di movimento. Su iPhone ricarica la pagina e tocca «Consenti»; su Android controlla i permessi del sito nel browser. Puoi usare Gioca con i tocchi, oppure consentire i sensori e riprovare.',
    insecure: 'I sensori richiedono HTTPS attendibile. In LAN usa il server HTTPS sul computer e un certificato riconosciuto dal telefono.',
    nomotion: 'Questo browser non dà i sensori di movimento. Prova con Chrome (Android) o Safari (iPhone), e riapri il QR dal gioco.',
  }[why], 'miss');
}
function onMotion(e){
  const k = sampleFromMotion(e, e.timeStamp || performance.now());   // istante dell'evento, non della lettura
  if (!k.rot && !k.acc) return;
  motionSeen = true; sensorWatch.feed(performance.now());
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
  if (inputMode === 'motion' && (sensor === 'ready' || sensor === 'cal')){ ss.del('profile'); sensor = 'cal'; cal.start(preferences()); }
  sendState(); paint();
}
function command(c){
  if (c === 'cal'){ if (sensor === 'off') return; ss.del('profile'); sensor = 'cal'; if (inputMode === 'touch') cal.useTouch(); else cal.start(preferences()); sendState(); paint(); }
  if (c === 'retry' && sensor === 'cal') cal.retry();
  if (c === 'invert') cal.invert();
  if (c === 'skipGrip') cal.skipGrip();
  if (c === 'free') cal.tryFree();
  // dal computer: «Salta» durante la calibrazione, anche nel passo «fermo» → profilo semplice: verso, tipo di colpo e
  // forza vengono comunque dal gesto (manca solo il colpo tipico)
  if (c === 'skip' && sensor === 'cal' && inputMode === 'motion'){ const p = cal.skip(); det.setContext(phase); if (p){ sensor = 'ready'; sendState(); paint(); } }
  if (c === 'confirm'){ const p = cal.confirm(); det.setContext(phase); if (p){ ss.set('profile', p); sensor = 'ready'; sendState(); paint(); } }
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
  if (sensor !== 'ready' || linkState !== 'on' || inputMode !== 'motion' || !['play','serve','toss'].includes(phase)){
    if (sensor === 'ready' && inputMode === 'motion') sendDiscard('fase ' + phase, s);
    return;
  }
  const flags = shotFlags(selectedShot, s);
  const msg = swingMessage(s, { flags, grip, faceRef: det.profile.faceRef, rtt, now: performance.now(), sampleHz, seq: ++swingSeq });
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
  if (sensor !== 'ready' || linkState !== 'on' || inputMode !== 'motion' || phase !== 'play') return;
  send({ t: 'pr', dir: p.dir, pk: p.peakT, v: p.peak, a: p.angle, lat: rtt/2 + (performance.now() - p.peakT) });
});

function paintShots(){
  const key = `${inputMode}:${sensor === 'cal'}:${selectedShot}`; if (shotsPaintKey === key) return; shotsPaintKey = key;
  $('#shotChoices').innerHTML = Object.entries(SHOT_NAMES).filter(([k]) => sensor === 'cal' || !['serve','smash'].includes(k)).map(([key,label]) => `<button data-shot="${key}" class="${selectedShot===key?'on':''}" aria-pressed="${selectedShot===key}">${label}</button>`).join('');
}
// La presa fisica (telefono di taglio, inclinato, girato nella mano) e l'orientamento della pagina sono due cose diverse:
// i sensori sono nel riferimento del telefono e il rilevatore non si ferma mai per il portrait o il landscape (prima in
// landscape si fermava e i colpi sparivano: con il telefono di taglio e il lato lungo in avanti il sistema può girare la
// pagina). La pagina prova a restare in verticale (a schermo intero dal primo tocco); se si gira, lo dice senza bloccare.
function lockOrientation(){ try { screen.orientation?.lock?.(grip === 'flat' ? 'landscape' : 'portrait').catch(() => {}); } catch(e){} checkOrientation(); }
function fullScreen(){ try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(lockOrientation, () => {}); } catch(e){} }
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
  const power=+$('#power').value/100, dir=+$('#aimDir').value;
  if (sensor === 'cal'){ cal.touch(dir,power,selectedShot); return; }
  if (sensor !== 'ready' || !['play','serve','toss'].includes(phase)) return;
  send({ t:'sw',pk:performance.now(),p:power,dir,l:0,...shotFlags(selectedShot) });
});
$('#gripMode').addEventListener('change', e => setGrip(e.target.value));
// mano: una sola per tutto il gioco. Cambiata qui va al computer, che la applica e la rimanda (cfg)
$('#hand').addEventListener('change', e => { applyHand(e.target.value); send({ t: 'hand', h: $('#hand').value }); });
$('#enableTouch').addEventListener('click', () => { lockOrientation(); inputMode='touch'; selectedShot='drive'; det.stop(); sensor='cal'; cal.useTouch(); sendState(); paint(); });
det.on('phase', value => {
  $('#phaseFeedback').textContent = ({ ready:'Pronto',preparation:'Preparazione',contact:'Colpo riconosciuto',follow:'Accompagnamento' })[value] || '';
});
/* ---------- pulsanti ---------- */
$('#enable').addEventListener('click', enableSensors);
$('#retry').addEventListener('click', () => { tries = 0; connect(); });
// «qui è successo un problema»: un segno nel registro della diagnostica, con l'ora del computer
$('#mark').addEventListener('click', e => { e.stopPropagation(); if (linkState !== 'on') return; send({ t: 'mk', x: 'segno dal telefono' }); buzz([30, 60, 30]); flash('hit', 'Segnato', 'Il momento è nella registrazione del computer.', 900); });
$('#recal').addEventListener('click', () => command('cal'));
$('#bye').addEventListener('click', () => {
  ss.del('resume'); ss.del('pair'); ss.del('profile'); pair = null; closeFast();
  try { conn && conn.close(); } catch (e){} conn = null; linkState = 'denied';
  removeEventListener('devicemotion', onMotion); sensor = 'off'; paint();
  ui('Scollegato', 'Per giocare di nuovo inquadra il codice QR sul computer.');
});
// tocco sullo schermo al servizio: lancia la palla
$('#stage').addEventListener('pointerdown', () => { if (phase === 'serve' && sensor === 'ready') send({ t: 'toss', pk: performance.now() }); });
// schermo sempre acceso durante il gioco (il telefono non si tocca): phone-keep.js riprende il blocco al ritorno in primo
// piano, dopo un rilascio o un rifiuto a pagina visibile e a ogni tocco. Pagina nascosta: il computer lo sa subito
// (prima che il telefono si sospenda) e mette in pausa
document.addEventListener('visibilitychange', () => { if (document.hidden || sensor === 'off') sendState(); else onVisible(); });
// pagina sospesa dal browser e ripresa (Android): come il ritorno in primo piano
document.addEventListener('resume', () => { if (!document.hidden && sensor !== 'off') onVisible(); });
document.addEventListener('pointerdown', () => { if (sensor !== 'off') awake.tap(); }, { passive: true });
addEventListener('pagehide', () => { try { conn && conn.close(); } catch (e){} });
// di nuovo in primo piano: prima si riprende il blocco, poi si manda lo stato (il computer non deve vedere per un attimo
// un blocco che manca); i sensori hanno il tempo di ripartire. Il computer non ha potuto rispondere mentre la pagina era
// sospesa: un ping subito e 2 s per la risposta, poi il controllo dei 5 s (prima si chiudeva e riapriva anche un
// collegamento vivo). Collegamento perso mentre il telefono dormiva: si riprova subito, con la chiave di ripresa
function onVisible(){
  const now = performance.now();
  sensorWatch.restart(now);
  if (conn?.open){ lastRx = Math.max(lastRx, now - 3000); send({ t: 'ping', c: now }); }
  else if (linkState === 'lost' && pair){ tries = 0; connect(); }
  awake.visible().then(sendState);
  paintAlert();
}

/* ---------- avvisi: sensori fermi, schermo che può spegnersi ---------- */
// Sensori fermi a pagina visibile (dopo lo schermo spento il browser non sempre li riprende): si dice qui, con il
// pulsante per riattivarli; se non ripartono, si ricarica la pagina (collegamento e calibrazione restano in questa
// scheda). Schermo che può spegnersi mentre si gioca (blocco negato, perso o non offerto dal browser): lo si dice qui,
// con il pulsante per riprovare o con cosa cambiare nelle impostazioni del telefono
function paintAlert(){
  const now = performance.now(), motion = inputMode === 'motion' && (sensor === 'ready' || sensor === 'cal');
  let a = null;
  if (linkState === 'on' && motion && sensorWatch.stalled(now, { visible: !document.hidden })){
    a = revivedAt != null
      ? { t: 'I sensori non sono ripartiti', p: 'Ricarica la pagina: il collegamento e la calibrazione restano.', b: 'Ricarica la pagina', act: 'reload' }
      : { t: 'Sensori fermi', p: 'Il telefono non manda più il movimento al gioco.', b: 'Riattiva i sensori', act: 'revive' };
  } else {
    if (revivedAt != null && sensorWatch.last > revivedAt) revivedAt = null;
    if (linkState === 'on' && sensor === 'ready' && inputMode === 'motion' && !document.hidden && awake.state !== 1 && !awake.busy)
      a = awake.state === -1
        ? { t: 'Lo schermo può spegnersi', p: 'Questo browser non tiene acceso lo schermo: nelle impostazioni del telefono allunga lo spegnimento automatico dello schermo.' }
        : { t: 'Lo schermo può spegnersi', p: 'Il telefono non lascia tenere acceso lo schermo (spesso per il risparmio energetico). Tocca il pulsante; se ricapita, disattiva il risparmio energetico.', b: 'Tieni acceso lo schermo', act: 'wake' };
  }
  const key = a ? a.t + a.p : '';
  if (key === alertKey) return;
  alertKey = key; show('#alert', !!a);
  if (!a) return;
  $('#alertTitle').textContent = a.t; $('#alertText').textContent = a.p;
  const b = $('#alertBtn'); b.textContent = a.b || ''; b.dataset.act = a.act || ''; show('#alertBtn', !!a.b);
}
setInterval(paintAlert, 500);
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
  removeEventListener('devicemotion', onMotion); addEventListener('devicemotion', onMotion);
  revivedAt = performance.now(); sensorWatch.restart(revivedAt); alertKey = null;   // si ridisegna comunque
  paintAlert();
  if (ask) ask.then(r => { if (r !== 'granted') noMotion('denied'); });
}

checkOrientation();
connect();
$('#gripMode').value = grip;
window.__racchetta = { det, cal, face, setGrip, get state(){ return { linkState, sensor, phase, rtt, step: cal.state.step, grip, wake: awake.state }; } };
