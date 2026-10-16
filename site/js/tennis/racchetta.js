// NATPF Simulator, controller smartphone: si collega al computer con i dati del QR (dopo il «#»), chiede i permessi dei sensori,
// fa la calibrazione guidata (calibration.js: i passi si vedono grandi sul computer, qui c'è il riassunto), riconosce i
// colpi (swing-detect.js) e li manda al gioco con l'istante del picco. Niente app da installare.
import { SHOT_NAMES, shotFlags } from './shot-options.js';
import { parsePairing } from './pairing.js';
import { createSwingDetector, sampleFromMotion } from './swing-detect.js';
import { createCalibration, PLAN, GESTURE_PLAN } from './calibration.js';
import { LanPeer, isLanMode } from './lan-transport.js';
import { encodeSensor, SENSOR_HZ } from './sensor-packet.js';
import { peerConfig, loadPeer } from './link.js';

const $ = s => document.querySelector(s);
const show = (s, on = true) => $(s).classList.toggle('hidden', !on);
const ss = { get(k){ try { return JSON.parse(sessionStorage.getItem('natpf-simulator.' + k)); } catch (e){ return null; } }, set(k, v){ try { sessionStorage.setItem('natpf-simulator.' + k, JSON.stringify(v)); } catch (e){} }, del(k){ try { sessionStorage.removeItem('natpf-simulator.' + k); } catch (e){} } };

// i dati del QR: si leggono e si tolgono subito dalla barra degli indirizzi (restano solo in questa scheda)
let pair = parsePairing(location.hash);
if (pair){ ss.set('pair', pair); ss.del('resume'); ss.del('profile'); history.replaceState(null, '', location.pathname + location.search); }
else pair = ss.get('pair');

const det = createSwingDetector(), cal = createCalibration(det);
let sensorSequence = 0, lastSensorSent = -Infinity;
let peer = null, conn = null, linkState = 'off', rtt = 80, sensor = 'off', phase = 'menu', retryT = null, tries = 0, wake = null, motionSeen = false, flashT = null;

/* ---------- interfaccia ---------- */
let selectedShot = 'auto', inputMode = 'motion', portrait = true, shotsPaintKey = '';
const preferences = () => ({ range: $('#motionRange').value, hand: $('#hand').value, intentGate: $('#intentGate').checked, gestural:true });
const ARROW = { L: '←', R: '→', '?': '?' };
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
  $('#shotHint').textContent=inputMode==='touch'?'Scegli il colpo; smash e servizio seguono la palla.':'Tipo, intensità e angolo seguono il gesto. Guarda il computer.';
  paintShots();
  show('#retry', (linkState === 'lost' || linkState === 'denied') && !!pair);
  show('#tools', linkState === 'on' && (sensor === 'ready' || sensor === 'cal'));
  show('#grip', linkState === 'on' && sensor === 'cal' && (cal.state.step === 'grip' || cal.state.step === 'still'));
  if (linkState !== 'on' || flashT) return;
  if (sensor === 'off') ui('Collegato', 'Tocca «Attiva i sensori»: il telefono diventa la tua racchetta.');
  else if (sensor === 'cal') calUi();
  else if (sensor === 'ready') ui(phase === 'serve' ? 'Al servizio' : 'Pronto', phaseText(), 'ready');
}
function calUi(){
  const st = cal.state;
  if (st.step === 'still') ui('Fermo', 'Tieni il telefono fermo nel palmo, come il manico di una racchetta.');
  else if (st.step === 'grip') ui('In verticale', 'Telefono in verticale, schermo verso di te di lato, dita ben chiuse.');
  else if (st.step === 'swings'){ const w = PLAN[st.idx]; ui(w === 'L' ? 'Da destra a sinistra' : 'Da sinistra a destra', `Swing ${st.idx + 1} di ${PLAN.length}: apri il braccio, colpisci e torna pronto, con un movimento comodo.`, '', ARROW[w]); }
  else if(st.step==='shots'){const g=GESTURE_PLAN[st.idx];ui(SHOT_NAMES[g.shot],`Gesto ${PLAN.length+st.idx+1} di ${PLAN.length+GESTURE_PLAN.length}: ${g.hint}`, '',g.want?ARROW[g.want]:'↑');}
  else if (st.step === 'review') ui(st.result && st.result.pass ? 'Fatto!' : 'Da rifare', st.result && st.result.pass ? 'Guarda il computer e conferma.' : 'Guarda il computer: ti dice cosa cambiare.', st.result && st.result.pass ? 'ready' : 'miss');
  else if (st.step === 'free') ui('Prova libera', 'Esegui un gesto: sul computer vedi il tipo riconosciuto e la traiettoria.');
}
function phaseText(){
  return { menu: 'Guarda il computer per iniziare.', toss:'Colpisci quando la palla raggiunge la cima del lancio.', serve: 'Primo movimento: lanci la palla. Secondo: colpisci in cima al lancio. Puoi anche toccare lo schermo per lanciare.', play: 'Il gesto sceglie tipo e angolo; velocità e timing controllano il colpo. Guarda la palla sul computer.', pause: 'Partita in pausa.', over: 'Partita finita: guarda il computer.' }[phase] || '';
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
      if (e.type === 'peer-unavailable'){ linkState = 'denied'; paint(); ui('Partita non trovata', 'Il gioco sul computer è stato chiuso o ricaricato. Inquadra di nuovo il codice QR.'); ss.del('resume'); return; }
      lost();
    });
  } catch (e){ lost(); }
}
function onData(c, d){
  if (!d || typeof d !== 'object') return;
  switch (d.t){
    case 'welcome': conn = c; linkState = 'on'; tries = 0; if (d.r) ss.set('resume', d.r); sendState(); paint(); break;
    case 'deny':
      linkState = 'denied'; ss.del('resume');
      ui('Non collegato', d.why === 'busy' ? 'C\'è già un altro telefono collegato a questo computer.' : 'Il codice è scaduto o è già stato usato: inquadra di nuovo il QR sul computer.');
      paint(); try { c.close(); } catch (e){} break;
    case 'pong': rtt = rtt*.7 + (performance.now() - d.c)*.3; bar(); break;
    case 'dp': send({ t: 'dq', d: d.d, p: performance.now() }); break;
    case 'practice': if (inputMode==='touch' && SHOT_NAMES[d.shot]){ selectedShot = d.shot; paintShots(); } break;
    case 'ph': phase = d.ph; det.setContext(phase); if (phase === 'play' && ['serve','smash'].includes(selectedShot)) selectedShot = 'drive'; if (sensor === 'ready') paint(); break;
    case 'cmd': command(d.c); break;
    case 'ev':
      if (d.k === 'contact'){ buzz(d.label === 'perfetto' ? [40] : [20]); flash('hit', ({ drop: 'Palla corta!', lob: 'Lob!', slice: 'Tagliato!', smash: 'Smash!' }[d.shot]) || ({ perfetto: 'Perfetto!', buono: 'Bel colpo', anticipo: 'In anticipo', ritardo: 'In ritardo' }[d.label] || 'Colpo!'), ''); }
      if (d.k === 'miss') { buzz([90]); flash('miss', { presto: 'Troppo presto', tardi: 'Troppo tardi', nessuno: 'Nessun colpo', portata: 'Troppo lontana' }[d.why] || 'Mancata', d.why === 'nessuno' ? 'Il movimento non è arrivato: fai uno swing più deciso.' : ''); }
      if (d.k === 'point') flash(d.mine ? 'hit' : 'miss', d.mine ? 'Punto tuo' : 'Punto avversario', d.txt || '', 1300);
      break;
    case 'bye': ss.del('resume'); ss.del('pair'); pair = null; linkState = 'denied'; paint(); ui('Scollegato', 'Il computer ha scollegato il telefono. Per giocare di nuovo inquadra il nuovo QR.'); try { c.close(); } catch (e){} break;
  }
}
function lost(){
  if (linkState === 'denied') return;
  conn = null; linkState = 'lost'; paint(); ui('Connessione persa', 'Riprovo da solo tra poco. Sul computer puoi riprovare il collegamento.');
  if (tries++ < 10) retryT = setTimeout(connect, Math.min(6000, 1000*tries));
}
const send = m => { if (conn && conn.open) try { conn.send(m); } catch (e){} };
const sendState = () => send({ t: 'st', s: sensor === 'off' ? 'sensors' : sensor, b: sensor === 'ready' ? det.profile.bias : undefined, rtt });
setInterval(() => { if (conn && conn.open){ send({ t: 'ping', c: performance.now() }); sendState(); } }, 1000);
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e){} };

/* ---------- sensori ---------- */
async function enableSensors(){
  inputMode = 'motion'; selectedShot='auto'; lockPortrait();
  // iPhone: il permesso va chiesto subito, dentro il tocco
  const ask = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function' && window.isSecureContext
    ? DeviceMotionEvent.requestPermission().catch(() => 'denied') : null;
  try { if ('wakeLock' in navigator && !wake){ wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e){}
  if (!window.isSecureContext) return noMotion('insecure');
  if (typeof DeviceMotionEvent === 'undefined') return noMotion('nomotion');
  if (ask && (await ask) !== 'granted') return noMotion('denied');
  addEventListener('devicemotion', onMotion);
  motionSeen = false;
  setTimeout(() => { if (!motionSeen && inputMode === 'motion') noMotion('nomotion'); }, 1500);
  const saved = ss.get('profile');
  if (saved?.version === 3 && saved.input !== 'touch'){ det.setProfile(saved); det.run(); sensor = 'ready'; }
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
  if (!portrait || (!k.rot && !k.acc)) return;
  motionSeen = true;
  // Presentation stream is disposable; reliable swing packets retain the real sensor peak.
  if (linkState === 'on' && conn?.sendMotion && k.t - lastSensorSent >= 1000/SENSOR_HZ){
    const packet = encodeSensor(k, sensorSequence++);
    if (packet && conn.sendMotion(packet)) lastSensorSent = k.t;
  }
  det.feed(k);
  if (sensor === 'cal') cal.tick(k.t, k);
}
function command(c){
  if (c === 'cal'){ if (sensor === 'off') return; ss.del('profile'); sensor = 'cal'; if (inputMode === 'touch') cal.useTouch(); else cal.start(preferences()); sendState(); paint(); }
  if (c === 'retry' && sensor === 'cal') cal.retry();
  if (c === 'invert') cal.invert();
  if (c === 'skipGrip') cal.skipGrip();
  if (c === 'free') cal.tryFree();
  if (c === 'confirm'){ const p = cal.confirm(); det.setContext(phase); if (p){ ss.set('profile', p); sensor = 'ready'; sendState(); paint(); } }
}
cal.on(e => { send({ t: 'cal', e: { ...e, shot:e.shot || (inputMode==='touch'?selectedShot:'drive') } }); paint();
  if (e.kind === 'attempt') flash(e.ok ? 'hit' : 'miss', e.ok ? 'Riconosciuto' : e.why === 'piccolo' ? 'Troppo piccolo' : 'Direzione?', '', 700, ARROW[e.dir]);
  if (e.kind === 'free') flash(e.ok ? 'hit' : 'miss', e.ok && e.dirValue === 0 ? 'Centro' : ARROW[e.dir], `Forza ${Math.round(Math.min(1.5, e.strength)*100)}%`, 500);
});
det.on('swing', s => {
  if (sensor !== 'ready' || linkState !== 'on' || !portrait || inputMode !== 'motion' || !['play','serve','toss'].includes(phase)) return;
  const flags = shotFlags(selectedShot, s);
  send({ t: 'sw', p: s.power, l: Math.max(-.6,Math.min(.6,s.lift)), ...flags, dur: s.dur, dir: s.dir, a:s.aim,c:s.confidence,pk: s.peakT, lat: rtt/2 + (performance.now() - s.peakT) });
  const cue = SHOT_NAMES[s.shot] || 'Colpo';
  flash('hit', cue, `Forza ${Math.round(s.power*100)}%`, 350);
});

function paintShots(){
  const key = `${inputMode}:${sensor === 'cal'}:${selectedShot}`; if (shotsPaintKey === key) return; shotsPaintKey = key;
  $('#shotChoices').innerHTML = Object.entries(SHOT_NAMES).filter(([k]) => sensor === 'cal' || !['serve','smash'].includes(k)).map(([key,label]) => `<button data-shot="${key}" class="${selectedShot===key?'on':''}" aria-pressed="${selectedShot===key}">${label}</button>`).join('');
}
function lockPortrait(){ try { screen.orientation?.lock?.('portrait').catch(() => {}); } catch(e){} checkOrientation(); }
function checkOrientation(){ const was = portrait; portrait = !matchMedia('(orientation: landscape)').matches; show('#rotate', !portrait); if (!portrait){ det.stop(); } else if (!was && inputMode === 'motion'){ if (sensor === 'cal') cal.start(preferences()); else det.run(); } }
addEventListener('resize', checkOrientation); addEventListener('orientationchange', checkOrientation);
$('#shotChoices').addEventListener('click', e => { const value=e.target.dataset.shot; if (SHOT_NAMES[value]){ selectedShot=value; paintShots(); send({ t:'cal',e:{kind:'selection',shot:value} }); } });
$('#power').addEventListener('input', () => { $('#powerLabel').textContent = $('#power').value+'%'; });
$('#touchHit').addEventListener('pointerdown', e => { if (!portrait) return; if (inputMode === 'motion'){ e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); det.setArmed(true); } });
for (const event of ['pointerup','pointercancel','lostpointercapture']) $('#touchHit').addEventListener(event, () => { if (inputMode === 'motion' && det.profile.intentGate) det.setArmed(false); });
$('#touchHit').addEventListener('click', () => {
  if (!portrait || inputMode !== 'touch' || linkState !== 'on') return;
  const power=+$('#power').value/100, dir=+$('#aimDir').value;
  if (sensor === 'cal'){ cal.touch(dir,power,selectedShot); return; }
  if (sensor !== 'ready' || !['play','serve','toss'].includes(phase)) return;
  send({ t:'sw',pk:performance.now(),p:power,dir,l:0,...shotFlags(selectedShot) });
});
$('#enableTouch').addEventListener('click', () => { lockPortrait(); inputMode='touch'; selectedShot='drive'; det.stop(); sensor='cal'; cal.useTouch(); sendState(); paint(); });
det.on('phase', value => {
  $('#phaseFeedback').textContent = ({ ready:'Pronto',preparation:'Preparazione',contact:'Colpo riconosciuto',follow:'Accompagnamento' })[value] || '';
});
/* ---------- pulsanti ---------- */
$('#enable').addEventListener('click', enableSensors);
$('#retry').addEventListener('click', () => { tries = 0; connect(); });
$('#recal').addEventListener('click', () => command('cal'));
$('#bye').addEventListener('click', () => {
  ss.del('resume'); ss.del('pair'); ss.del('profile'); pair = null;
  try { conn && conn.close(); } catch (e){} conn = null; linkState = 'denied';
  removeEventListener('devicemotion', onMotion); sensor = 'off'; paint();
  ui('Scollegato', 'Per giocare di nuovo inquadra il codice QR sul computer.');
});
// tocco sullo schermo al servizio: lancia la palla
$('#stage').addEventListener('pointerdown', () => { if (phase === 'serve' && sensor === 'ready') send({ t: 'toss', pk: performance.now() }); });
document.addEventListener('visibilitychange', async () => { if (!document.hidden && sensor !== 'off' && !wake) try { wake = await navigator.wakeLock.request('screen'); } catch (e){} });
addEventListener('pagehide', () => { try { conn && conn.close(); } catch (e){} });

checkOrientation();
connect();
window.__racchetta = { det, cal, get state(){ return { linkState, sensor, phase, rtt, step: cal.state.step }; } };
