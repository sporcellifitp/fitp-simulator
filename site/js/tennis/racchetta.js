// Il telefono come racchetta: pagina del telefono. Si collega al computer con i dati del QR (dopo il «#»), chiede i
// permessi dei sensori, calibra, riconosce i colpi (swing-detect.js) e li manda al gioco. Niente app da installare.
import { parsePairing } from './pairing.js';
import { createSwingDetector, sampleFromMotion } from './swing-detect.js';
import { peerConfig, loadPeer } from './link.js';

const $ = s => document.querySelector(s);
const show = (s, on = true) => $(s).classList.toggle('hidden', !on);
const ss = { get(k){ try { return JSON.parse(sessionStorage.getItem('racchetta.' + k)); } catch (e){ return null; } }, set(k, v){ try { sessionStorage.setItem('racchetta.' + k, JSON.stringify(v)); } catch (e){} }, del(k){ try { sessionStorage.removeItem('racchetta.' + k); } catch (e){} } };

// i dati del QR: si leggono e si tolgono subito dalla barra degli indirizzi (restano solo in questa scheda)
let pair = parsePairing(location.hash);
if (pair){ ss.set('pair', pair); ss.del('resume'); history.replaceState(null, '', location.pathname + location.search); }
else pair = ss.get('pair');

const det = createSwingDetector();
let peer = null, conn = null, linkState = 'off', rtt = 80, sensor = 'off', phase = 'menu', retryT = null, tries = 0, wake = null, motionSeen = false;
const sens = +(ss.get('sens') || 1); det.setSensitivity(sens);

/* ---------- interfaccia ---------- */
function ui(big, sub, ring = ''){ $('#big').textContent = big; $('#sub').textContent = sub; $('#ring').className = ring; }
function bar(){
  const b = $('#bar');
  const txt = { off: 'Non collegato', connecting: 'Collegamento…', on: 'Collegato al computer', lost: 'Connessione persa', denied: 'Collegamento rifiutato' }[linkState] || linkState;
  b.className = linkState === 'on' ? 'ok' : linkState === 'lost' || linkState === 'denied' ? 'bad' : '';
  $('#barTxt').textContent = txt; $('#lat').textContent = linkState === 'on' ? Math.round(rtt) + ' ms' : '';
}
function paint(){
  bar();
  show('#enable', linkState === 'on' && sensor === 'off');
  show('#skip', sensor === 'practice');
  show('#tap', linkState === 'on' && (sensor === 'tap'));
  show('#retry', linkState === 'lost' || linkState === 'denied' && !!pair);
  show('#tools', linkState === 'on' && sensor !== 'off');
  show('#sens', linkState === 'on' && (sensor === 'ready' || sensor === 'practice'));
  if (linkState !== 'on') return;
  if (sensor === 'off') ui('Collegato', 'Tocca «Attiva i sensori»: il telefono diventa la tua racchetta.');
  else if (sensor === 'still') ui('Fermo', 'Tieni il telefono fermo in mano, come il manico di una racchetta.');
  else if (sensor === 'practice') ui('Dritto di prova', 'Fai un dritto deciso, come se colpissi la palla. Tieni il telefono ben stretto.');
  else if (sensor === 'ready') ui(phase === 'serve' ? 'Al servizio' : 'Pronto', phaseText(), 'ready');
  else if (sensor === 'tap') ui('Pulsante', 'Questo telefono non dà i sensori di movimento: tocca «Colpisci» quando arriva la palla.');
}
function phaseText(){
  return { menu: 'Scegli «Inizia la partita» sul computer.', serve: 'Un movimento lancia la palla, il secondo colpisce. Puoi anche toccare lo schermo per lanciarla.', play: 'Colpisci quando la palla ti arriva. In anticipo va incrociata, in ritardo lungolinea.', pause: 'Partita in pausa sul computer.', over: 'Partita finita: guarda il computer.' }[phase] || '';
}
function flashRing(cls, big, sub, ms = 700){
  ui(big, sub, cls);
  clearTimeout(flashRing.t); flashRing.t = setTimeout(paint, ms);
}

/* ---------- collegamento ---------- */
async function connect(){
  clearTimeout(retryT);
  if (!pair){ linkState = 'denied'; bar(); ui('Nessuna partita', 'Inquadra il codice QR che compare sul computer, nel menu «Gioca con il telefono».'); show('#retry', false); return; }
  linkState = 'connecting'; paint(); ui('Collegamento…', 'Mi collego al gioco sul computer.');
  try {
    const Peer = await loadPeer();
    if (peer && !peer.destroyed) peer.destroy();
    peer = new Peer(peerConfig());
    peer.on('open', () => {
      const c = peer.connect(pair.session, { reliable: true, serialization: 'json' });
      c.on('open', () => {
        const r = ss.get('resume');
        c.send(r ? { t: 'hello', v: 1, r } : { t: 'hello', v: 1, k: pair.token });
      });
      c.on('data', d => onData(c, d));
      c.on('close', () => { if (c === conn) lost(); });
      c.on('error', () => {});
    });
    peer.on('error', e => {
      if (e.type === 'peer-unavailable'){ linkState = 'denied'; paint(); ui('Partita non trovata', 'Il gioco sul computer è stato chiuso o ricaricato. Inquadra di nuovo il codice QR.'); ss.del('resume'); return; }
      lost(e.type);
    });
  } catch (e){ lost('libreria'); }
}
function onData(c, d){
  if (!d || typeof d !== 'object') return;
  switch (d.t){
    case 'welcome':
      conn = c; linkState = 'on'; tries = 0; if (d.r) ss.set('resume', d.r);
      sendState(); paint(); break;
    case 'deny':
      linkState = 'denied'; ss.del('resume');
      ui('Non collegato', d.why === 'busy' ? 'C\'è già un altro telefono collegato a questa partita.' : 'Il codice è scaduto o è già stato usato: inquadra di nuovo il QR sul computer.');
      paint(); try { c.close(); } catch (e){} break;
    case 'pong': rtt = rtt*.7 + (performance.now() - d.c)*.3; bar(); break;
    case 'dp': send({ t: 'dq', d: d.d, p: performance.now() }); break;     // l'ora del telefono, per allineare gli orologi
    case 'ph': phase = d.ph; if (sensor === 'ready') paint(); break;
    case 'ev':
      if (d.k === 'contact'){ buzz(d.label === 'perfetto' ? [35] : [20, 30, 20]); flashRing('hit', { perfetto: 'Perfetto!', anticipo: 'In anticipo', ritardo: 'In ritardo', steccata: 'Steccata' }[d.label] || 'Colpo!', ''); }
      if (d.k === 'miss'){ buzz([80]); flashRing('miss', 'Mancata', 'Prova a colpire un attimo prima.'); }
      if (d.k === 'point') flashRing(d.mine ? 'hit' : 'miss', d.mine ? 'Punto tuo' : 'Punto loro', `${d.txt} · ${d.sc[0]}–${d.sc[1]}`, 1400);
      break;
    case 'bye': ss.del('resume'); ss.del('pair'); pair = null; linkState = 'denied'; paint(); ui('Scollegato', 'Il computer ha scollegato il telefono. Per giocare di nuovo inquadra il nuovo QR.'); try { c.close(); } catch (e){} break;
  }
}
function lost(){
  if (linkState === 'denied') return;
  conn = null; linkState = 'lost'; paint(); ui('Connessione persa', 'Riprovo da solo tra poco. Il gioco sul computer resta giocabile con mouse e tastiera.');
  if (tries++ < 8) retryT = setTimeout(connect, Math.min(8000, 1500*tries));
}
const send = m => { if (conn && conn.open) try { conn.send(m); } catch (e){} };
const sendState = () => send({ t: 'st', s: sensor === 'off' ? 'sensors' : sensor, rtt });
setInterval(() => { if (conn && conn.open){ send({ t: 'ping', c: performance.now() }); sendState(); } }, 2000);
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e){} };

/* ---------- sensori ---------- */
async function enableSensors(){
  // iPhone: il permesso va chiesto subito, dentro il tocco (dopo un'altra attesa il tocco non vale più)
  const ask = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function' && window.isSecureContext
    ? DeviceMotionEvent.requestPermission().catch(() => 'denied') : null;
  try { if ('wakeLock' in navigator && !wake){ wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e){}   // lo schermo resta acceso
  if (!window.isSecureContext){ sensor = 'tap'; send({ t: 'st', s: 'insecure', rtt }); paint(); ui('Serve https', 'Il browser dà i sensori solo alle pagine sicure (https). Intanto puoi usare il pulsante.'); show('#tap', true); return; }
  if (typeof DeviceMotionEvent === 'undefined'){ return noMotion('nomotion'); }
  if (ask && (await ask) !== 'granted') return noMotion('denied');
  addEventListener('devicemotion', onMotion);
  motionSeen = false;
  setTimeout(() => { if (!motionSeen) noMotion('nomotion'); }, 1500);   // alcuni browser non mandano nulla
  sensor = 'still'; det.calibrate(); sendState(); paint();
}
function noMotion(why){
  removeEventListener('devicemotion', onMotion);
  sensor = 'tap'; send({ t: 'st', s: why, rtt }); sendState(); paint();
  ui(why === 'denied' ? 'Sensori negati' : 'Niente sensori', why === 'denied'
    ? 'Hai negato l\'accesso ai sensori. Su iPhone: ricarica la pagina e tocca «Consenti». Intanto puoi usare il pulsante «Colpisci».'
    : 'Questo telefono o browser non dà i sensori di movimento: usa il pulsante «Colpisci».');
}
function onMotion(e){
  const k = sampleFromMotion(e, performance.now());
  if (!k.rot && !k.acc) return;
  motionSeen = true;
  det.feed(k);
}
det.on('status', s => {
  if (s.s === 'move'){ ui('Fermo', 'Ti sei mosso: tieni il telefono fermo ancora un attimo.'); return; }
  sensor = s.s; sendState(); paint();
  if (s.s === 'ready') buzz([30, 40, 30]);
});
det.on('swing', s => {
  if (linkState !== 'on') return;
  const lat = rtt/2 + (performance.now() - s.peakT);
  send({ t: 'sw', p: s.power, l: s.lift, side: s.side, lat, pk: s.peakT });
  ui(s.side === 'bh' ? 'Rovescio' : 'Dritto', `Potenza ${Math.round(s.power*100)}%`, 'hit');
  clearTimeout(flashRing.t); flashRing.t = setTimeout(paint, 600);
});

/* ---------- pulsanti ---------- */
$('#enable').addEventListener('click', enableSensors);
$('#skip').addEventListener('click', () => det.skipPractice());
$('#tap').addEventListener('pointerdown', e => { e.preventDefault(); send({ t: phase === 'serve' ? 'toss' : 'sw', p: .6, l: 0, side: null, lat: rtt/2, pk: performance.now(), tap: true }); buzz([15]); });
$('#retry').addEventListener('click', () => { tries = 0; connect(); });
$('#recal').addEventListener('click', () => { if (sensor === 'tap') return enableSensors(); sensor = 'still'; det.calibrate(); sendState(); paint(); });
$('#bye').addEventListener('click', () => {
  ss.del('resume'); ss.del('pair'); pair = null;
  try { conn && conn.close(); } catch (e){} conn = null; linkState = 'denied';
  removeEventListener('devicemotion', onMotion); sensor = 'off'; paint();
  ui('Scollegato', 'Per giocare di nuovo inquadra il codice QR sul computer.');
});
// tocco sullo schermo al servizio: lancia la palla
$('#stage').addEventListener('pointerdown', () => { if (phase === 'serve' && sensor === 'ready') send({ t: 'toss' }); });
for (const b of document.querySelectorAll('#sens button')){
  b.classList.toggle('on', +b.dataset.k === sens);
  b.addEventListener('click', () => { det.setSensitivity(+b.dataset.k); ss.set('sens', +b.dataset.k); for (const x of document.querySelectorAll('#sens button')) x.classList.toggle('on', x === b); });
}
document.addEventListener('visibilitychange', async () => { if (!document.hidden && sensor !== 'off' && !wake) try { wake = await navigator.wakeLock.request('screen'); } catch (e){} });

// pagina chiusa o telefono bloccato: si avvisa subito il computer (la chiave di ripresa resta per ricollegarsi)
addEventListener('pagehide', () => { try { conn && conn.close(); } catch (e){} });

connect();
window.__racchetta = { det, get state(){ return { linkState, sensor, phase, rtt }; } };
