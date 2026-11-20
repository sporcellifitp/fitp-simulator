// Prova nel browser della versione LAN di natpf-tennis, senza internet:
//   1. server LAN vero (lan/server.mjs, HTTPS con certificato di prova) e nessuna richiesta fuori dal computer;
//   2. telefono simulato (pagina NATPF /natpf/, PHONE_SIM: campioni devicemotion continui con la gravità che gira con il
//      telefono, tenuto con la presa insegnata «racchetta») collegato con il trasporto LAN (?lan=1, segnalazione su
//      /lan-signal, WebRTC diretto), pronto con la calibrazione di base «Giocando»: flusso dei sensori e piatto →
//      racchetta (con il verso, sui tre assi), lancio e battuta con il gesto;
//   3. 1v1 tra due istanze (host P1 e P2) attraverso il relay del server LAN, con il link di invito con l'IP di rete, e le
//      richieste del relay che si chiudono (B73: risposte lette, src/natpf/natpf_fetch.js);
//   4. webcam con lo stream finto di Chrome: MediaPipe Hands caricato dal pacchetto locale e inferenza offline,
//      poi landmark sintetici della mano → posizione e inclinazione della racchetta in terza e prima persona, e swing;
//   5. «segui il corpo» (MediaPipe Pose) per P1 e P2: qui, senza scheda grafica, non verificabile (docs/b73/prove-rotte-2.md).
// Senza scheda grafica il disegno WebGL si toglie (stopDrawing) dopo averne misurato il costo; le schermate disegnano un
// fotogramma vero (drawOnce). Stato e numeri: docs/b73/prove-rotte-2.md.
// Requisiti: npm run build (dist/), npm ci in tools/lan e tools/e2e, openssl, Chrome o Chromium (CHROMIUM_PATH).
//   node test/e2e/lan-e2e.mjs        (dalla cartella natpf-tennis; OUT=cartella per le schermate; ONLY=telefono,1v1,…)
//   In un contenitore con un proxy: NO_PROXY="$NO_PROXY,<IP del PC>" (e no_proxy), altrimenti Chromium manda l'indirizzo
//   di rete del PC al proxy.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';
import { chromium } from '../../../tools/e2e/node_modules/playwright-core/index.mjs';
import { seeAllCards } from '../../../tools/e2e/th.mjs';
// (i moduli del gioco usano gli alias del pacchetto, come nelle prove in node: test/register.mjs)
register('../alias-hooks.mjs', import.meta.url);
const { gripQuat } = await import('../../src/natpf/natpf_gesture_pose.js');
const { GRIP_STYLE } = await import('../../src/natpf/natpf_gesture_motion.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.OUT || path.join(os.tmpdir(), 'natpf-tennis-lan-e2e');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
// ONLY=telefono,1v1,webcam,corpo per eseguire solo alcune parti
const run = part => !process.env.ONLY || process.env.ONLY.split(',').includes(part);
const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'OK  ' : 'KO  '}${name}${info ? ' — ' + info : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const D = Math.PI/180;
const qAngleDeg = (a, b) => 2*Math.acos(Math.min(1, Math.abs(a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3])))*180/Math.PI;
const CHROME = process.env.CHROMIUM_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(f => fs.existsSync(f));

// Telefono simulato come uno vero (pagina del telefono, prima del caricamento): campioni devicemotion continui a 100 Hz con
// un poco di rumore anche da fermo, e accelerazione con gravità che gira con il telefono (orientamento integrato dal
// giroscopio). Prima la prova usava tools/e2e/motion.js: campioni solo mentre la prova muoveva il telefono (la pagina
// diceva «Sensori fermi») e gravità sempre lungo y, anche con il telefono ruotato di 30°: il piatto del telefono
// (face-tracker.js, filtro con la gravità) tornava indietro da solo e la racchetta non seguiva le rotazioni attorno a x e z.
// __sim.run(fn, ms): fn(u) con u da 0 a 1 → { w: [x, y, z] °/s negli assi del telefono, a: [x, y, z] m/s² senza gravità }
// q0: orientamento di partenza (telefono → mondo), la presa insegnata (revisione del B73, docs/b73/unione.md §7). Prima il
// telefono partiva dritto (q identità: asse y del telefono verticale), una posa che non è la presa insegnata e in cui il
// «roll» del piatto (face-tracker.js, asin dell'asse y sull'alto) perde il verso: la prova aveva tolto il controllo del verso
// sull'asse Z per passare. Con la presa «racchetta» il verso c'è, e la prova lo controlla di nuovo
const PHONE_SIM = (q0) => {
  const G = 9.81, D = Math.PI/180;
  const mul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0], a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
  const conj = q => [-q[0], -q[1], -q[2], q[3]], turn = (q, v) => mul(mul(q, [v[0], v[1], v[2], 0]), conj(q)).slice(0, 3);
  let q = Array.isArray(q0) ? q0.slice() : [0, 0, 0, 1], last = performance.now(), drive = null;      // telefono → mondo
  window.__sim = {
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); drive = now => { const u = Math.min(1, (now - t0)/ms); if (u >= 1){ drive = null; r(); } return fn(u); }; }); },
    still(ms){ return this.run(() => ({ w: [0, 0, 0] }), ms); },
  };
  try { DeviceMotionEvent.requestPermission = async () => 'granted'; } catch {}
  setInterval(() => {
    const now = performance.now(), dt = Math.min(.05, (now - last)/1000); last = now;
    const v = drive ? drive(now) : { w: [0, 0, 0] }, a = v.a || [0, 0, 0];
    const w = v.w.map((x, i) => x + [.4*Math.sin(now/53), .3*Math.cos(now/71), .2*Math.sin(now/97)][i]), m = Math.hypot(...w);
    if (m > 0){ const h = m*D*dt/2, s = Math.sin(h)/m; q = mul(q, [w[0]*s, w[1]*s, w[2]*s, Math.cos(h)]); const l = Math.hypot(...q); q = q.map(x => x/l); }
    const up = turn(conj(q), [0, 1, 0]);                                // alto del mondo negli assi del telefono
    window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: w[2], beta: w[0], gamma: w[1] }, acceleration: { x: a[0], y: a[1], z: a[2] }, accelerationIncludingGravity: { x: a[0] + G*up[0], y: a[1] + G*up[1], z: a[2] + G*up[2] }, interval: 10 }));
  }, 10);
};

function lanIp(){
  for (const items of Object.values(os.networkInterfaces())) for (const a of items || []) if (a.family === 'IPv4' && !a.internal) return a.address;
  return null;
}

// certificato di prova per 127.0.0.1 e l'IP di rete (al posto di quello mkcert di tools/lan/certs)
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-tennis-lan-')), cert = path.join(temp, 'cert.pem'), key = path.join(temp, 'key.pem');
const IP = lanIp();
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=natpf-tennis-e2e', '-addext', `subjectAltName=IP:127.0.0.1${IP ? `,IP:${IP}` : ''},DNS:localhost`, '-keyout', key, '-out', cert], { stdio: 'ignore', env: { ...process.env, MSYS2_ARG_CONV_EXCL: '*' } });
const PORT = 18000 + Math.floor(Math.random()*900), SETUP = PORT + 1000;
const server = spawn(process.execPath, [path.join(ROOT, 'lan/server.mjs'), `--port=${PORT}`, `--setup-port=${SETUP}`, '--no-open', '--offline', `--cert=${cert}`, `--key=${key}`], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', d => { serverLog += d; }); server.stderr.on('data', d => { serverLog += d; });
const BASE = `https://127.0.0.1:${PORT}`;

let browser;
const external = [], errors = [], insufficient = [];
async function newContext(options = {}){
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, ...options });
  // offline: tutto ciò che non è questo computer viene bloccato e contato
  await ctx.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    if (host === '127.0.0.1' || host === IP || host === 'localhost') return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  return ctx;
}
async function openGame(ctx, url, label){
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${label}: ${e.message}`));
  // B73: richieste al relay ancora aperte e richieste rifiutate dal browser per troppe richieste aperte (le risposte mai
  // lette restavano aperte e dopo circa 180 ogni richiesta della pagina falliva con net::ERR_INSUFFICIENT_RESOURCES; i
  // «Failed to load resource» della console sono esclusi dagli errori qui sotto, quindi si contano a parte)
  page.__api = new Set();
  page.on('request', r => { if (/\/api\//.test(r.url())) page.__api.add(r); });
  page.on('requestfinished', r => page.__api.delete(r));
  page.on('requestfailed', r => { page.__api.delete(r); if (/INSUFFICIENT_RESOURCES/.test(r.failure()?.errorText || '')) insufficient.push(`${label}: ${new URL(r.url()).pathname}`); });
  page.on('crash', () => { errors.push(`${label}: pagina andata in crash`); console.log(`[${label}] pagina andata in crash (${new Date().toISOString().slice(11, 19)})`); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errors.push(`${label}: ${m.text()}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__natpfTennis?.player?.model && window.__natpfTennis.racketKinematics, null, { timeout: 120000 });
  return page;
}

// Senza scheda grafica (WebGL in software, SwiftShader) un fotogramma disegnato costa secondi (misurato qui sotto: 2,6–3,0 s
// la partita, 1 fotogramma al secondo con la webcam): il ciclo del gioco (update, telefono, webcam, racchetta) gira una
// volta ogni pochi secondi e nelle finestre di mezzo secondo delle prove spesso non c'è nessun fotogramma. Come nella parte
// 1v1 e nelle prove natpf-*, si toglie solo il disegno WebGL (renderer.render): update, personaggi (render() resta),
// telefono, webcam e colpi sono quelli veri, e le matrici si aggiornano come nel disegno. stopDrawing misura prima il
// fotogramma con il disegno (2 intervalli) e poi senza (1,5 s); drawOnce disegna un fotogramma vero, per le schermate
async function stopDrawing(page, label){
  const ms = await page.evaluate(() => new Promise(r => { const t = []; const f = n => { t.push(n); if (t.length < 3) requestAnimationFrame(f); else {
    // (senza disegnare, le matrici del mondo e della camera si aggiornano come fa three.js all'inizio di render: le
    // posizioni a schermo, Vector3.project(camera), restano quelle del fotogramma)
    const R = __natpfTennis.renderer; R.__draw ||= R.render;
    R.render = (scene, camera) => { if (scene?.matrixWorldAutoUpdate !== false) scene?.updateMatrixWorld?.(); if (camera && camera.parent === null && camera.matrixWorldAutoUpdate !== false) camera.updateMatrixWorld(); };
    let k = 0; const t0 = performance.now(); const g = () => { k++; if (performance.now() - t0 < 1500) requestAnimationFrame(g); else r([Math.round((t[2] - t[0])/2), Math.round((performance.now() - t0)/k)]); };
    requestAnimationFrame(g); } }; requestAnimationFrame(f); }));
  console.log(`${label}: fotogramma ${ms[0]} ms con il disegno WebGL in software, ${ms[1]} ms senza`);
  return ms;
}
const drawOnce = page => page.evaluate(() => { const E = __natpfTennis, R = E.renderer, off = R.render; if (!R.__draw) return; R.render = R.__draw; try { E.render(); } finally { R.render = off; } });

try {
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server LAN non partito: ' + serverLog)), 20000);
    const poll = setInterval(() => { if (/Gioco pronto/.test(serverLog)){ clearInterval(poll); clearTimeout(t); resolve(); } }, 100);
    server.once('exit', code => { clearInterval(poll); clearTimeout(t); reject(new Error(`server LAN uscito (${code}): ${serverLog}`)); });
  });
  check('server LAN avviato in HTTPS con gli indirizzi di rete', IP ? serverLog.includes(`https://${IP}:${PORT}/?lan=1`) : /HTTPS/.test(serverLog), serverLog.split('\n').find(l => l.includes('https://')) || '');
  browser = await chromium.launch({ executablePath: CHROME, args: ['--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns', ...(process.env.E2E_SWIFTSHADER ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] : []), '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--ignore-certificate-errors'] });

  /* ---------- 1. gioco offline dal server LAN ---------- */
  const hostCtx = await newContext({ viewport: { width: 1280, height: 760 }, permissions: ['camera'] });
  // senza l'intro, come le altre prove nel browser: dal B21 l'intro prova prima il trailer di questo server
  // (./media/trailer-….mp4, che c'è solo nel programma Windows: natpf-desktop/scripts/prepara.mjs lo copia in dist/media) e
  // poi il bucket pubblico; con la build di sviluppo il file manca e la richiesta al bucket (bloccata qui) è voluta
  // (natpf_intro.js introPlan, test/natpf-intro-trailer.test.mjs). Il server aggiunge comunque ?lan=1
  const host = await openGame(hostCtx, BASE + '/?intro=0', 'host');
  check('il gioco si apre da / con ?lan=1 aggiunto dal server', new URL(host.url()).searchParams.get('lan') === '1', host.url());
  const status = await host.evaluate(() => fetch('/lan/status').then(r => r.json()));
  check('/lan/status: build presente e pacchetto offline completo', status.build && status.offline?.complete, JSON.stringify(status.offline));

  if (run('telefono')){
    /* ---------- 2. telefono simulato con il trasporto LAN ---------- */
    await host.evaluate(() => __natpfTennis.natpfUi.selectController('phone', { open: false }));
    await host.waitForFunction(() => __natpfTennis.natpfPhone.state.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 20000 });
    const pairing = await host.evaluate(() => ({ url: __natpfTennis.natpfPhone.pairingUrl, transport: __natpfTennis.natpfPhone.link.transport }));
    const pairUrl = new URL(pairing.url);
    check('QR del telefono: indirizzo di rete (non localhost), pagina NATPF /natpf/ e ?lan=1', (!IP || pairUrl.hostname === IP) && pairUrl.pathname === '/natpf/tennis/racchetta.html' && pairUrl.searchParams.get('lan') === '1', pairing.url.replace(/#.*/, '#…'));
    check('collegamento del telefono con il trasporto LAN (WebRTC diretto, non PeerJS cloud)', pairing.transport === 'lan-webrtc', pairing.transport);
    const phoneCtx = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
    const phone = await phoneCtx.newPage();
    phone.on('pageerror', e => errors.push(`telefono: ${e.message}`));
    // presa di partenza: quella insegnata (GRIP_STYLE «racchetta», natpf_gesture_pose.gripQuat), come il telefono vero
    await phone.addInitScript(PHONE_SIM, gripQuat(GRIP_STYLE));
    await phone.goto(pairing.url);
    await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
    await phone.click('#enable');
    // l'eventuale tutorial (dal 04/11, B4; «Tutto chiaro» acceso dopo aver visto tutte le schede, B9) si chiude sul telefono
    const tut = await phone.waitForFunction(() => { const b = document.getElementById('tutOk'); return b && !b.classList.contains('hidden'); }, null, { timeout: 3000 }).then(() => true, () => false);
    if (tut){ await seeAllCards(phone); await phone.click('#tutOk'); }
    // B28: di base «Calibrazione: Giocando» (l'opzione dello stand): niente gesti di calibrazione, il telefono è pronto
    // subito con il profilo semplice e impara giocando. La calibrazione con i gesti resta un'opzione, provata dalle prove
    // natpf-* con CAL=gesti (stesso telefono, stesso computer: cambia solo il trasporto, che qui è la LAN)
    const ready = await host.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 15000 }).then(() => true, () => false);
    const st = await phone.evaluate(() => ({ sensor: __racchetta.state.sensor, step: __racchetta.cal?.state?.step, big: document.getElementById('big')?.textContent })).catch(x => x.message);
    check('telefono collegato e pronto sul computer (profilo semplice, calibrazione «Giocando»)', ready && st.sensor === 'ready', JSON.stringify({ tutorial: tut, ...st }));
    // partita contro la CPU: il telefono riceve la fase di gioco
    await host.evaluate(() => { __natpfTennis.hud.callbacks.onStartMatch({ gamesToWin: 1, inputMode: 'phone' }); __natpfTennis.hud.hideTitleModal(); });
    await host.waitForFunction(() => __natpfTennis.phase === 'SERVE_STANCE' && !__natpfTennis.natpfPaused, null, { timeout: 30000 });
    // (prima era una delle cause di «la racchetta non segue il polso»: vedi stopDrawing)
    await stopDrawing(host, 'partita con il telefono');
    await sleep(600);
    // flusso continuo: rotazione lenta attorno a un asse del telefono (45 °/s per 0,7 s), poi nel verso opposto; la
    // racchetta deve seguirla. Il telefono simulato ruota davvero: la gravità gira con lui (PHONE_SIM)
    const wrist = () => host.evaluate(() => {
      const e = __natpfTennis, k = e.player.racketKinematics, m = e.natpfPhone.link.motion(), o = e.motionController.phoneState.orientation;
      return { euler: [k.wristSpringEuler.x, k.wristSpringEuler.y, k.wristSpringEuler.z], q: e.player.racketPivot.quaternion.toArray(), received: m?.received || 0, tilt: [o.pitch, o.roll, o.yaw], ext: e.motionController.externalRacket, face: e.natpfPhone.link.face?.() || null };
    });
    const rotate = (axis, rate, ms) => phone.evaluate(({ axis, rate, ms }) => __sim.run(() => ({ w: axis.map(v => v*rate) }), ms), { axis, rate, ms });
    const qAngle = (a, b) => 2*Math.acos(Math.min(1, Math.abs(a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3])))*180/Math.PI;
    const axes = { X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] };          // assi del telefono (rotationRate: beta, gamma, alpha)
    const mapping = {};
    for (const [name, axis] of Object.entries(axes)){
      await rotate(axis, 0, 500);
      const rest = await wrist();
      await rotate(axis, 45, 700); await rotate(axis, 0, 250);
      const plus = await wrist();
      await rotate(axis, -45, 1400); await rotate(axis, 0, 250);
      const minus = await wrist();
      await rotate(axis, 45, 700); await rotate(axis, 0, 300);              // di nuovo alla presa di riposo
      const diff = (a, b) => a.map((v, i) => +(v - b[i]).toFixed(1));
      mapping[name] = { tilt: diff(plus.tilt, minus.tilt), tiltPlus: diff(plus.tilt, rest.tilt), tiltMinus: diff(minus.tilt, rest.tilt), wrist: plus.euler.map((v, i) => +(v - minus.euler[i]).toFixed(3)),
        racketDeg: +qAngle(plus.q, minus.q).toFixed(1), wristPlus: diff(plus.euler.map(v => v/D), rest.euler.map(v => v/D)), wristMinus: diff(minus.euler.map(v => v/D), rest.euler.map(v => v/D)), samples: plus.received - rest.received, ext: plus.ext, face: !!plus.face };
    }
    console.log('telefono → racchetta', JSON.stringify(mapping));
    check('flusso dei sensori LAN: campioni continui arrivano al computer (più di 20 in 0,95 s; il telefono ne manda 40 al secondo)', Object.values(mapping).every(m => m.samples > 20), `campioni: ${mapping.X.samples}, ${mapping.Y.samples}, ${mapping.Z.samples}`);
    check('orientamento del piatto dal telefono (messaggi «fo») sul computer: la racchetta segue il telefono', Object.values(mapping).every(m => m.ext === 'natpf-phone' && m.face), JSON.stringify(Object.fromEntries(Object.entries(mapping).map(([k, m]) => [k, [m.ext, m.face]]))));
    // presa insegnata «racchetta» (GRIP_STYLE): la racchetta segue il piatto (natpf_phone_racket.racketTiltFromFace) nei
    // due versi su tutti e tre gli assi. Per Z (normale allo schermo) si guarda il polso della racchetta (racket_kinematics:
    // wristSpringEuler.x = 0,65 × beccheggio) dalla presa di riposo in ciascun verso, con il segno: il pivot della racchetta
    // comprende anche il dondolio d'attesa del personaggio (3–9° da un giro all'altro, non è una misura del telefono).
    // (Revisione del B73: con il telefono dritto, la posa di prima, il roll del piatto perde il verso e la racchetta si
    // inclinava allo stesso modo nei due versi, −10,4° e −10,2° di polso; la prova era stata cambiata per non guardare il
    // segno. Con la presa insegnata il verso c'è: misurato in node −14,1° / +13,5° di beccheggio per ±30°)
    check('la racchetta virtuale segue il piatto del telefono: X e Y nei due versi, Z (inclinazione di lato) da una parte e dall’altra', mapping.X.racketDeg > 4 && mapping.Y.racketDeg > 4 && Math.abs(mapping.Z.wristPlus[0]) > 4 && Math.abs(mapping.Z.wristMinus[0]) > 4 && Math.sign(mapping.Z.wristPlus[0]) !== Math.sign(mapping.Z.wristMinus[0]),
      `racchetta tra i due versi: X ${mapping.X.racketDeg}°, Y ${mapping.Y.racketDeg}° (Z ${mapping.Z.racketDeg}°); polso con Z dalla presa di riposo: ${mapping.Z.wristPlus[0]}° e ${mapping.Z.wristMinus[0]}°`);
    const dominant = (v, i) => Math.abs(v[i]) > Math.abs(v[(i + 1) % 3]) && Math.abs(v[i]) > Math.abs(v[(i + 2) % 3]);
    // (differenza fra il verso + e il verso −; con questa presa, in node: X imbardata ∓23,7°, Y apertura ∓27,4/28,4°, Z
    // beccheggio ∓14,1/13,5° con 10,3° di imbardata)
    check('presa «racchetta»: asse X del telefono → imbardata, asse Y → apertura del piatto (roll), asse Z (normale allo schermo) → beccheggio', dominant(mapping.X.tilt, 2) && dominant(mapping.Y.tilt, 1) && dominant(mapping.Z.tilt, 0),
      JSON.stringify({ X: mapping.X.tilt, Y: mapping.Y.tilt, Z: mapping.Z.tilt, Zversi: [mapping.Z.tiltPlus, mapping.Z.tiltMinus] }));
    // la rotazione del polso si somma alle animazioni del motore base (attesa, servizio della CPU): solo informativa
    console.log('rotazione del polso per asse del telefono (info)', JSON.stringify({ X: mapping.X.wrist, Y: mapping.Y.wrist, Z: mapping.Z.wrist }));
    // (schermata: un fotogramma disegnato davvero, poi di nuovo senza disegno)
    await drawOnce(host);
    await host.screenshot({ path: path.join(OUT, 'lan-telefono-terza-persona.png') });
    // servizio con il telefono: un gesto lancia la palla, un altro vicino al punto più alto la colpisce. In partita il
    // telefono è bloccato (B51) e i tocchi sullo schermo non lanciano più: si lancia con il gesto, come
    // tools/e2e/natpf-servizio-lancio.mjs (gesto: rotazione attorno al manico, 900 °/s, come le prove natpf-*)
    await host.evaluate(() => { window.__swings = []; __natpfTennis.motionController.on('toss', s => __swings.push(['toss', s.source])); __natpfTennis.motionController.on('swing', s => __swings.push(['swing', s.source])); });
    const serve = await host.evaluate(() => ({ phase: __natpfTennis.phase, server: __natpfTennis.score.server, telefono: __natpfTennis.natpfPhone.lastPhase }));
    const gesture = (peak, dur) => phone.evaluate(({ peak, dur }) => __sim.run(u => ({ w: [0, peak*Math.sin(Math.PI*u)**2, 0], a: [0, 0, -4*Math.sin(Math.PI*u)] }), dur).then(() => __sim.still(300)), { peak, dur });
    await gesture(900, 160);
    const tossed = await host.waitForFunction(() => __natpfTennis.phase === 'SERVE_TOSS', null, { timeout: 4000, polling: 20 }).then(() => true, () => false);
    // (il gesto arriva al motore come «swing» del telefono, che al servizio diventa il lancio)
    const atToss = await host.evaluate(() => __swings.slice());
    // la battuta vicino al punto più alto del lancio (la palla sale per circa 0,5 s)
    if (tossed){ await host.waitForFunction(() => __natpfTennis.phase !== 'SERVE_TOSS' || __natpfTennis.ball.vel.y < 1.2, null, { timeout: 3000, polling: 16 }).catch(() => {}); await gesture(900, 240); }
    const served = await host.waitForFunction(() => __natpfTennis.phase === 'RALLY' || __natpfTennis.phase === 'POINT_OVER', null, { timeout: 4000 }).then(() => true, () => false);
    const swings = await host.evaluate(() => ({ swings: __swings, phase: __natpfTennis.phase }));
    check('gesto del telefono → lancio della palla al servizio (motore base, dal telefono via LAN)', serve.phase === 'SERVE_STANCE' && serve.server === 'player' && tossed && atToss.some(s => s[1] === 'natpf-phone'), JSON.stringify({ serve, lancio: atToss }));
    check('gesto del telefono vicino al punto più alto → battuta: il servizio parte', served && swings.swings.slice(atToss.length).some(s => s[0] === 'swing' && s[1] === 'natpf-phone'), JSON.stringify(swings));
    await phoneCtx.close();
    await host.evaluate(() => __natpfTennis.natpfUi.selectController('mouse', { open: false }));
    await hostCtx.close();
  } else await hostCtx.close();

  if (run('1v1')){
    /* ---------- 3. 1v1 tra due istanze attraverso il server LAN ---------- */
    const p1Ctx = await newContext({ viewport: { width: 1100, height: 680 } });
    // senza l'intro (come le altre prove nel browser): con l'intro attiva il gioco resta nel menu e il servizio dell'host
    // non parte (dal 20/10 la prova restava ferma su «Premi un tasto per iniziare»: 7/10)
    const p1 = await openGame(p1Ctx, BASE + '/?lan=1&intro=0', 'P1');
    // racchetta di prova (mouse) anche per l'host, come il P2 qui sotto e natpf-1v1-p2p.mjs: con il telefono (predefinito)
    // e nessun telefono collegato la partita si mette in pausa e l'host non serve mai
    await p1.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.testInput = true; ui.selectController('mouse', { open: false }); });
    await p1.evaluate(() => __natpfTennis.hud.callbacks.onSelectDifficulty('1v1'));
    await p1.waitForFunction(() => document.querySelector('#natpf-invite a')?.href, null, { timeout: 15000 });
    const invite = await p1.evaluate(() => document.querySelector('#natpf-invite a').href);
    const inviteUrl = new URL(invite);
    check('link del Player 2 nel menu: IP di rete al posto di localhost, stanza, role=p2 e ?lan=1', (!IP || inviteUrl.hostname === IP) && inviteUrl.searchParams.get('role') === 'p2' && /^AT-/.test(inviteUrl.searchParams.get('room')) && inviteUrl.searchParams.get('lan') === '1', invite);
    const p2Ctx = await newContext({ viewport: { width: 1100, height: 680 } });
    // in alcuni contenitori di prova l'IP di rete non è raggiungibile dal browser: stesso invito su 127.0.0.1
    let p2;
    try { p2 = await openGame(p2Ctx, invite, 'P2'); }
    catch (err){
      const local = new URL(invite); local.hostname = '127.0.0.1';
      console.log(`P2: ${inviteUrl.hostname} non raggiungibile da questo browser (${String(err.message).split('\n')[0]}), uso ${local.host}`);
      p2 = await openGame(p2Ctx, local.href, 'P2');
    }
    // racchetta di prova (mouse) prima di «Sono pronto», come in natpf-1v1-p2p.mjs: con il telefono (predefinito) e nessun
    // telefono collegato si aprirebbe il suo pannello e il P2, in pausa, non manderebbe colpi
    await p2.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.testInput = true; ui.selectController('mouse', { open: false }); __natpfTennis.setViewMode('first'); document.querySelector('#natpf-guest-go')?.click(); });
    check('P2 entra nella stanza come guest', await p2.evaluate(() => __natpfTennis.playerRole === 'p2' && __natpfTennis.isMultiplayer));
    await p1.evaluate(() => {
      const e = __natpfTennis, mc = e.motionController, f = mc.onP2Swing;
      window.__p2swings = 0; window.__maxRally = 0;
      mc.onP2Swing = s => { __p2swings++; return f(s); };
      e.hud.callbacks.onStartMatch({ gamesToWin: 2, inputMode: 'mouse' }), e.hud.hideTitleModal();
    });
    // giocatori automatici: lancio e colpo al servizio, swing quando la palla arriva vicino (gli stessi eventi del mouse)
    const bot = () => {
      let last = 0;
      window.__bot = setInterval(() => {
        const e = window.__natpfTennis, mc = e.motionController, me = e.playerRole === 'p2' ? 'opponent' : 'player', a = e[me], b = e.ball, now = performance.now();
        window.__maxRally = Math.max(window.__maxRally || 0, b.rallyStrokeCount || 0);
        if (now - last < 380) return;
        if (e.phase === 'SERVE_STANCE' && e.score.server === me){ last = now + 400; mc.triggerSyntheticSwing({ type: 'toss' }); }
        else if (e.phase === 'SERVE_TOSS' && e.score.server === me && b.vel.y < 0){ last = now; mc.triggerSyntheticSwing({}); }
        else if (e.phase === 'RALLY' && b.inPlay && (a.pos.z - b.pos.z)*b.vel.z > 0 && Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 1.7){ last = now; mc.triggerSyntheticSwing({}); }
      }, 8);
    };
    // con la grafica software ogni fotogramma dura 1–2 s e la palla resta ferma tra due fotogrammi: si toglie solo il
    // disegno, partita, relay e colpi restano quelli veri
    for (const p of [p1, p2]) await p.evaluate(() => { __natpfTennis.render = () => {}; });
    await p1.evaluate(bot); await p2.evaluate(bot);
    await p1.waitForFunction(() => __natpfTennis.phase === 'SERVE_STANCE' || __natpfTennis.phase === 'RALLY', null, { timeout: 30000 });
    const t0 = Date.now();
    let sync = null;
    while (Date.now() - t0 < 40000){
      await sleep(1000);
      sync = await Promise.all([p1, p2].map(p => p.evaluate(() => ({ score: ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => __natpfTennis.score[k]), phase: __natpfTennis.phase, rally: window.__maxRally, p2swings: window.__p2swings }))));
      if (sync[0].p2swings >= 4 && sync[0].rally >= 3 && (sync[0].score.some(Boolean))) break;
    }
    await sleep(1500);
    sync = await Promise.all([p1, p2].map(p => p.evaluate(() => ({ score: ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => __natpfTennis.score[k]), phase: __natpfTennis.phase, rally: window.__maxRally, p2swings: window.__p2swings }))));
    console.log('1v1', JSON.stringify(sync));
    // (prima del B73 gli snapshot dell'host, 22 al secondo, restavano tutti aperti: dopo circa 8 s di partita ogni
    // richiesta falliva e la pagina dell'host o del P2 andava in crash; ora restano aperte solo quelle in viaggio)
    const open = [p1, p2].map(p => [...p.__api].map(r => new URL(r.url()).pathname));
    check('relay della sfida: le richieste si chiudono (al più 6 aperte per pagina, quelle in viaggio)', open.every(o => o.length <= 6), JSON.stringify(open.map(o => o.length)));
    check('i colpi del P2 arrivano all\'host attraverso il relay del server LAN', sync[0].p2swings >= 2, `colpi P2 ricevuti: ${sync[0].p2swings}`);
    check('scambio 1v1 tra le due istanze', sync[0].rally >= 2, `scambio più lungo: ${sync[0].rally} colpi`);
    check('punteggio e fase sincronizzati sul P2 (snapshot dell\'host)', JSON.stringify(sync[0].score) === JSON.stringify(sync[1].score) && sync[1].rally >= 1, `P1 ${sync[0].score} · P2 ${sync[1].score}`);
    await p2.screenshot({ path: path.join(OUT, 'lan-1v1-p2-prima-persona.png') });
    await p1.screenshot({ path: path.join(OUT, 'lan-1v1-p1.png') });
    await p1Ctx.close(); await p2Ctx.close();
  }

  if (run('webcam')){
    /* ---------- 4. webcam: stream finto di Chrome, MediaPipe offline, mano → racchetta ---------- */
    const camCtx = await newContext({ viewport: { width: 1100, height: 680 }, permissions: ['camera'] });
    // con i colpi dalla mano (?webcamMano=1): qui si prova la mano → racchetta, che con i colpi dal movimento (predefiniti
    // dal 29/10, webcam_motion.js) in partita non gira; i colpi dal movimento li prova test/natpf-webcam-motion.test.mjs
    const cam = await openGame(camCtx, BASE + '/?webcamMano=1&intro=0', 'webcam');
    const fps = () => cam.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r({ fps: Math.round(n/(performance.now() - t0)*1000), visible: document.visibilityState }); }; requestAnimationFrame(f); }));
    console.log('fps prima della webcam', JSON.stringify(await fps()));
    const mpRequests = [];
    cam.on('request', r => { if (/mediapipe/.test(r.url())) mpRequests.push(new URL(r.url()).hostname); });
    await cam.evaluate(() => { __natpfTennis.natpfUi.selectController('webcam', { open: false }); __natpfTennis.hud.callbacks.onStartMatch({ gamesToWin: 1, inputMode: 'webcam' }), __natpfTennis.hud.hideTitleModal(); });
    // (la camera finta di Chromium, con la macchina carica, si è aperta in 8–12 s: 60 s d'attesa invece di 20, la prova
    // verifica che si apra, non quanto in fretta)
    await cam.waitForFunction(() => __natpfTennis.motionController.webcamActive, null, { timeout: 60000 });
    await cam.waitForFunction(() => __natpfTennis.motionController.mpHands, null, { timeout: 90000 }).catch(() => {});
    const mp = await cam.evaluate(async () => {
      const mc = __natpfTennis.motionController;
      if (!mc.mpHands) return { loaded: false, base: mc.mediapipeBase };
      // un'inferenza vera sul fotogramma finto della webcam (nessuna mano: nessun landmark, ma nessun errore)
      const t0 = performance.now(); await mc.mpHands.send({ image: mc.videoElem });
      return { loaded: true, base: mc.mediapipeBase, ms: Math.round(performance.now() - t0), video: [mc.videoElem.videoWidth, mc.videoElem.videoHeight] };
    });
    console.log('fps con la webcam', JSON.stringify(await fps()));
    check('webcam (stream finto di Chrome) accesa e MediaPipe Hands caricato dal pacchetto locale, inferenza offline', mp.loaded && mp.base === '/assets/mediapipe/hands/' && mpRequests.length > 3 && mpRequests.every(h => h === '127.0.0.1'), JSON.stringify({ ...mp, richieste: mpRequests.length }));
    // da qui landmark sintetici (non c'è una mano vera davanti alla webcam finta): stessi campi che scrive MediaPipe
    await cam.evaluate(() => {
      const mc = __natpfTennis.motionController;
      mc.mpHands = { send: async () => {} };
      window.__hand = { x: .5, y: .6, angle: 0 };
      window.__webcamShots = [];
      mc.on('swing', s => __webcamShots.push(s.source)); mc.on('toss', s => __webcamShots.push(s.source));
      const lm = ({ x, y, angle }) => {
        const len = .12, ux = Math.sin(angle), uy = -Math.cos(angle), vx = Math.cos(angle), vy = Math.sin(angle), p = (dx, dy) => ({ x: x + dx, y: y + dy, z: 0 });
        const l = Array.from({ length: 21 }, () => p(0, 0));
        l[9] = p(ux*len, uy*len); l[5] = p(ux*len*.95 - vx*len*.3, uy*len*.95 - vy*len*.3); l[17] = p(ux*len*.8 + vx*len*.35, uy*len*.8 + vy*len*.35);
        return l;
      };
      // un risultato nuovo a ogni fotogramma elaborato, come fa MediaPipe con onResults
    const process = mc._processWebcamFrame.bind(mc);
    window.__frames = 0;
    mc._processWebcamFrame = () => { if (window.__handOn){ mc.latestHandLandmarks = lm(__hand); mc.latestHandSeenAt = performance.now(); mc._hasNewHandResult = true; __frames++; } process(); };
    window.__handOn = true;
    });
    // Con la webcam la pagina andava a 1 fotogramma al secondo (inferenza vera di MediaPipe sul fotogramma finto: 4–5 s la
    // prima, poi il disegno WebGL in software) e la racchetta non seguiva la mano tra una posa e l'altra. Con i landmark
    // sintetici al posto dell'inferenza resta il disegno, che si toglie (stopDrawing)
    // (prima che l'ultima inferenza vera in corso, 3–5 s in software, finisca: altrimenti la misura del fotogramma la comprende)
    await cam.waitForFunction(() => !__natpfTennis.motionController._mpBusy, null, { timeout: 15000 }).catch(() => {});
    await stopDrawing(cam, 'partita con la webcam (landmark sintetici)');
    await cam.waitForFunction(() => __natpfTennis.phase === 'SERVE_STANCE', null, { timeout: 30000 });
    const racket = () => cam.evaluate(() => {
      const e = __natpfTennis, a = e.localActor || e.player, w = a.racketPivot.getWorldPosition(a.racketPivot.position.clone()), s = w.clone().project(e.camera);
      const h = a.parts?.handR ? a.parts.handR.getWorldPosition(w.clone()) : null, hs = h ? h.clone().project(e.camera) : null;
      return { screen: [s.x, s.y], hand: hs ? [hs.x, hs.y] : null, q: a.racketPivot.getWorldQuaternion(a.racketPivot.quaternion.clone()).toArray(), live: e.motionController.webcamLiveInput(), world: [w.x, w.y, w.z], handWorld: h ? [h.x, h.y, h.z] : null, cam: e.camera.position.distanceTo(w), fov: e.camera.fov };
    });
    // la mano si sposta piano (sotto la soglia degli swing del motore base), poi resta ferma
    const hold = async (pose, ms = 500) => {
      await cam.evaluate(async p => { const from = { ...__hand }; for (let i = 1; i <= 20; i++){ for (const k in p) __hand[k] = from[k] + (p[k] - from[k])*i/20; await new Promise(r => setTimeout(r, 30)); } }, pose);
      await sleep(ms); return racket();
    };
    const webcam = {};
    const f0 = await cam.evaluate(() => [__frames, performance.now()]);
    for (const view of ['third', 'first']){
      await cam.evaluate(v => __natpfTennis.setViewMode(v), view);
      await cam.waitForFunction(() => __natpfTennis.phase === 'SERVE_STANCE', null, { timeout: 30000 });
      await cam.evaluate(() => { __webcamShots.length = 0; });
      await hold({ x: .5, y: .6, angle: 0 }, 900);
      // nell'immagine della camera x .65 = sinistra del giocatore (immagine specchiata), x .35 = destra
      const left = await hold({ x: .65 }), right = await hold({ x: .35 });
      const low = await hold({ x: .5, y: .72 }), high = await hold({ y: .48 });
      const straight = await hold({ y: .6, angle: 0 }), tilted = await hold({ angle: -.5 });
      await drawOnce(cam); await cam.screenshot({ path: path.join(OUT, `lan-webcam-${view}.png`) });
      await hold({ angle: 0 }, 400);
    const shotsDuringPose = await cam.evaluate(() => __webcamShots.length);
    webcam[view] = { worldDx: +(right.world[0] - left.world[0]).toFixed(3), worldDy: +(high.world[1] - low.world[1]).toFixed(3), handWorldDx: right.handWorld && left.handWorld ? +(right.handWorld[0] - left.handWorld[0]).toFixed(3) : null, cam: +right.cam.toFixed(1), fov: Math.round(right.fov), dx: +(right.screen[0] - left.screen[0]).toFixed(3), dy: +(high.screen[1] - low.screen[1]).toFixed(3), handDx: right.hand && left.hand ? +(right.hand[0] - left.hand[0]).toFixed(3) : null, rollDeg: +qAngleDeg(straight.q, tilted.q).toFixed(1), shots: shotsDuringPose, live: right.live };
    }
    const f1 = await cam.evaluate(() => [__frames, performance.now()]);
    webcam.fps = Math.round((f1[0] - f0[0])/(f1[1] - f0[1])*1000);
    console.log('webcam → racchetta', JSON.stringify(webcam));
    for (const view of ['third', 'first']){
      const w = webcam[view], label = view === 'first' ? 'prima persona' : 'terza persona';
      // terza persona: la camera del servizio è a ~13 m e di sbieco (fov 49°): 0,14 m della racchetta nel mondo sono
      // 0,006 di schermo (~3 px su 1100), sotto la soglia di 0,01 della prova del 20/10. Si guarda lo spostamento nel mondo
      // (≥ 8 cm) e il verso sullo schermo; in prima persona (camera a ~1 m) resta la soglia sullo schermo
      if (view === 'first') check(`webcam, ${label}: mano a destra/sinistra → racchetta a destra/sinistra sullo schermo`, w.dx > .05, `Δx schermo ${w.dx}`);
      else check(`webcam, ${label}: mano a destra/sinistra → racchetta a destra/sinistra (nel campo e sullo schermo)`, w.worldDx > .08 && w.dx > 0, `Δx nel campo ${w.worldDx} m, sullo schermo ${w.dx} (camera a ${w.cam} m)`);
      check(`webcam, ${label}: mano in alto/in basso → racchetta in alto/in basso`, w.dy > (view === 'first' ? .05 : .01), `Δy schermo ${w.dy}`);
      check(`webcam, ${label}: mano ruotata → racchetta ruotata`, w.rollDeg > 5, `${w.rollDeg}°`);
      check(`webcam, ${label}: i movimenti lenti muovono la racchetta senza far partire colpi`, w.shots === 0, `colpi: ${w.shots}`);
    }
    check('webcam: anche la mano del personaggio segue la mano reale (terza persona, nel campo e sullo schermo)', webcam.third.handWorldDx > .08 && webcam.third.handDx > 0, `Δx mano nel campo ${webcam.third.handWorldDx} m, sullo schermo ${webcam.third.handDx}`);
    // swing veloce davanti alla webcam: motore base fa partire il colpo (logica di gioco invariata). Prima si aspetta che la
    // partita riparta: il fotogramma vero della schermata (drawOnce, ~2,5 s in software) ferma la webcam e il gioco va in
    // pausa «webcam ferma», e in pausa i colpi non valgono (natpf_ui._gateDesktopInput). Succede solo per la schermata
    await cam.waitForFunction(() => !__natpfTennis.natpfPaused && __natpfTennis.phase === 'SERVE_STANCE', null, { timeout: 15000 }).catch(() => {});
    await hold({ x: .5, y: .6, angle: 0 }, 600);
    await cam.evaluate(async () => { for (let i = 0; i <= 5; i++){ __hand.x = .66 - i*.07; await new Promise(r => setTimeout(r, 34)); } });
    await cam.waitForFunction(() => __webcamShots.length > 0, null, { timeout: 3000 }).catch(() => {});
    const shots = await cam.evaluate(() => __webcamShots);
    check('webcam: uno swing della mano fa partire il colpo del motore base', shots.includes('webcam'), JSON.stringify(shots));
    await cam.evaluate(() => { window.__handOn = false; __natpfTennis.motionController.disableWebcam(); });
    await camCtx.close();
  }

  /* ---------- 5. webcam «Movimento: segui il corpo» (MediaPipe Pose offline), P1 e P2 ---------- */
  if (run('corpo')){
    // corpo sintetico con gli stessi campi di MediaPipe Pose (spalle 11/12, anche 23/24), a ogni risultato. Da qui, come
    // la mano nella parte 4, l'inferenza vera (già provata sul fotogramma finto) si sostituisce con una che non fa niente:
    // in software costa secondi a fotogramma e non vede nessuno davanti alla camera finta
    const bodyInjector = () => {
      const f = __natpfTennis.natpfBody, mc = __natpfTennis.motionController;
      if (f.pose) f.pose = { send: async () => {}, close(){} };
      if (mc.mpHands) mc.mpHands = { send: async () => {} };
      window.__body = { x: .5, w: .2, on: true };
      const lm = ({ x, w }) => { const l = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: .1 })); l[11] = { x: x + w/2, y: .35, z: 0, visibility: .95 }; l[12] = { x: x - w/2, y: .35, z: 0, visibility: .95 }; l[23] = { x: x + w*.4, y: .65, z: 0, visibility: .9 }; l[24] = { x: x - w*.4, y: .65, z: 0, visibility: .9 }; return l; };
      window.__bodyTimer = setInterval(() => { if (__body.on) __natpfTennis.natpfBody.onPoseResults({ poseLandmarks: lm(__body) }); }, 40);
    };
    // giocatore automatico solo per servizio e colpi (la posizione la decide il corpo)
    const shooter = () => {
      let last = 0;
      window.__shooter = setInterval(() => {
        const e = window.__natpfTennis, mc = e.motionController, me = e.playerRole === 'p2' ? 'opponent' : 'player', a = e[me], b = e.ball, now = performance.now();
        if (now - last < 380) return;
        if (e.phase === 'SERVE_STANCE' && e.score.server === me){ last = now + 400; mc.triggerSyntheticSwing({ type: 'toss' }); }
        else if (e.phase === 'SERVE_TOSS' && e.score.server === me && b.vel.y < 0){ last = now; mc.triggerSyntheticSwing({}); }
        else if (e.phase === 'RALLY' && b.inPlay && (a.pos.z - b.pos.z)*b.vel.z > 0 && Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 1.7){ last = now; mc.triggerSyntheticSwing({}); }
      }, 8);
    };
    // posizione x del giocatore che segue il corpo dopo 0,9 s di scambio, con il corpo a destra o a sinistra
    // (0,9 s di gioco, non d'orologio: con la webcam in software un fotogramma costa 0,4–0,7 s anche senza il disegno e il
    // passo del motore è al più 0,08 s, quindi 0,9 s d'orologio erano 0,1–0,2 s di partita e il giocatore non arrivava)
    const gameTime = (observer, s) => observer.evaluate(() => __natpfTennis.elapsedTime).then(t0 => observer.waitForFunction(({ t0, s }) => __natpfTennis.elapsedTime - t0 >= s, { t0, s }, { timeout: 90000 }));
    const measure = async (page, observer, actorKey, side, label) => {
      const out = [];
      for (const bodyX of side){
        await page.evaluate(x => { __body.x = x; }, bodyX);
        await observer.waitForFunction(() => __natpfTennis.phase === 'RALLY', null, { timeout: 90000 });
        await gameTime(observer, .9);
        const s = await observer.evaluate(k => ({ phase: __natpfTennis.phase, x: __natpfTennis[k].pos.x, z: __natpfTennis[k].pos.z }), actorKey);
        const seen = page !== observer ? await page.evaluate(k => __natpfTennis[k].pos.x, actorKey) : null;
        out.push({ bodyX, ...s, seen });
        await observer.waitForFunction(() => __natpfTennis.phase !== 'RALLY', null, { timeout: 30000 }).catch(() => {});
      }
      console.log(label, JSON.stringify(out.map(o => ({ corpo: o.bodyX, fase: o.phase, x: +o.x.toFixed(2), z: +o.z.toFixed(2) }))));
      return out;
    };

    // P1 contro la CPU
    const bodyCtx = await newContext({ viewport: { width: 1100, height: 680 }, permissions: ['camera'] });
    const bp = await openGame(bodyCtx, BASE + '/?intro=0', 'corpo P1');
    await bp.evaluate(() => { __natpfTennis.natpfUi.selectController('webcam', { open: false }); __natpfTennis.hud.callbacks.onStartMatch({ gamesToWin: 2, inputMode: 'webcam' }); __natpfTennis.hud.hideTitleModal(); });
    await bp.waitForFunction(() => __natpfTennis.motionController.webcamActive, null, { timeout: 60000 });   // (vedi la parte 4)
    // (dal B17.3 il pulsante «Movimento» non si vede in partita, «HUD in partita: solo l'essenziale», natpf-round.css: resta
    // il tasto B, come per chi gestisce la postazione)
    check('comando «Movimento» con la webcam (tasto B), predefinito automatico', await bp.evaluate(() => { const b = document.getElementById('btn-natpf-movement'); return !!b && __natpfTennis.natpfBody.mode === 'auto' && /automatico/.test(b.textContent); }));
    await bp.keyboard.press('KeyB');
    await bp.waitForFunction(() => __natpfTennis.natpfBody.pose, null, { timeout: 90000 }).catch(() => {});
    const poseInfo = await bp.evaluate(async () => {
      const f = __natpfTennis.natpfBody, mc = __natpfTennis.motionController;
      if (!f.pose) return { loaded: false, status: f.status };
      const t0 = performance.now(); await f.pose.send({ image: mc.videoElem });
      const t1 = performance.now(); if (mc.mpHands) await mc.mpHands.send({ image: mc.videoElem });
      return { loaded: true, base: f.base, ms: Math.round(t1 - t0), handsMs: Math.round(performance.now() - t1), mode: f.mode, hands: !!mc.mpHands };
    });
    check('«segui il corpo»: MediaPipe Pose caricato dal pacchetto locale insieme a Hands (entrambi attivi), inferenza offline', poseInfo.loaded && poseInfo.hands && poseInfo.base === '/assets/mediapipe/pose/' && poseInfo.mode === 'body', JSON.stringify(poseInfo));
    await bp.evaluate(bodyInjector);
    await stopDrawing(bp, 'partita con la webcam (corpo sintetico)');
    await bp.waitForFunction(() => __natpfTennis.natpfBody.status === 'following', null, { timeout: 10000 });
    check('il corpo viene visto e la posizione di partenza calibrata', await bp.evaluate(() => /segue il corpo/.test(document.getElementById('btn-natpf-movement').textContent)));
    await bp.evaluate(shooter);
    const fps = await bp.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r(Math.round(n/(performance.now() - t0)*1000)); }; requestAnimationFrame(f); }));
    // destra del giocatore = sinistra nell'immagine della camera (a specchio): x .3 = destra, .7 = sinistra
    const p1Moves = await measure(bp, bp, 'player', [.3, .7, .3], 'corpo P1 → giocatore');
    await bp.evaluate(() => __natpfTennis.setViewMode('first'));
    const p1First = await measure(bp, bp, 'player', [.7], 'corpo P1 → giocatore (prima persona)');
    const right = p1Moves.filter(o => o.bodyX < .5), left = [...p1Moves, ...p1First].filter(o => o.bodyX > .5);
    check('P1 segue il corpo: a destra davanti alla webcam → a destra in campo (terza persona)', right.every(o => o.x > 2), right.map(o => o.x.toFixed(2)).join(', '));
    check('P1 segue il corpo: a sinistra → a sinistra in campo (terza e prima persona)', left.every(o => o.x < -2), left.map(o => o.x.toFixed(2)).join(', '));
    // avanti verso la webcam (spalle più larghe) → verso la rete
    await bp.evaluate(() => { __body.x = .5; __body.w = .2*1.35; });
    await bp.waitForFunction(() => __natpfTennis.phase === 'RALLY', null, { timeout: 90000 }); await gameTime(bp, .9);
    const fwd = await bp.evaluate(() => __natpfTennis.player.pos.z);
    check('P1 si avvicina alla webcam → va verso la rete', fwd < 9, `z = ${fwd.toFixed(2)} (fondo campo 11,89)`);
    await drawOnce(bp); await bp.screenshot({ path: path.join(OUT, 'lan-corpo-p1-prima-persona.png') });
    // corpo che esce dall'inquadratura: si torna al movimento automatico
    await bp.evaluate(() => { __body.on = false; });
    await sleep(700);
    const lost = await bp.evaluate(() => ({ status: __natpfTennis.natpfBody.status, label: document.getElementById('btn-natpf-movement').textContent, target: __natpfTennis.natpfBody.targetFor(__natpfTennis.player) }));
    check('corpo non visto → movimento automatico del motore base', lost.status === 'lost' && lost.target === null && /automatico/.test(lost.label), JSON.stringify(lost));
    console.log('fps con webcam, Hands e Pose', fps);
    await bp.evaluate(() => { clearInterval(__shooter); clearInterval(__bodyTimer); __natpfTennis.motionController.disableWebcam(); });
    await bodyCtx.close();

    // P2 in 1v1: il bersaglio del corpo passa dal relay all'host
    const hCtx = await newContext({ viewport: { width: 1000, height: 620 } });
    const host2 = await openGame(hCtx, BASE + '/?intro=0', 'corpo host');
    // racchetta di prova (mouse) per l'host, come nella parte 1v1: con il telefono (predefinito) e nessun telefono collegato
    // la partita dell'host resta in pausa e non arriva mai allo scambio
    await host2.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.testInput = true; ui.selectController('mouse', { open: false }); __natpfTennis.hud.callbacks.onSelectDifficulty('1v1'); });
    await host2.waitForFunction(() => document.querySelector('#natpf-invite a')?.href, null, { timeout: 15000 });
    const invite2 = await host2.evaluate(() => document.querySelector('#natpf-invite a').href);
    const gCtx = await newContext({ viewport: { width: 1000, height: 620 }, permissions: ['camera'] });
    const guest = await openGame(gCtx, invite2, 'corpo P2');
    await guest.evaluate(async () => { document.querySelector('#natpf-guest-go')?.click(); __natpfTennis.natpfUi.selectController('webcam', { open: false }); await __natpfTennis.motionController.enableWebcam(); __natpfTennis.natpfBody.setMode('body'); });
    await guest.waitForFunction(() => __natpfTennis.natpfBody.pose, null, { timeout: 90000 });
    check('P2: Hands e Pose entrambi attivi', await guest.evaluate(() => !!__natpfTennis.motionController.mpHands && !!__natpfTennis.natpfBody.pose));
    await guest.evaluate(bodyInjector);
    for (const [p, l] of [[host2, 'host'], [guest, 'P2 con la webcam (corpo sintetico)']]) await stopDrawing(p, `corpo, ${l}`);
    await guest.waitForFunction(() => __natpfTennis.natpfBody.status === 'following', null, { timeout: 10000 });
    await host2.evaluate(() => { __natpfTennis.hud.callbacks.onStartMatch({ gamesToWin: 2, inputMode: 'mouse' }); __natpfTennis.hud.hideTitleModal(); });
    await host2.evaluate(shooter); await guest.evaluate(shooter);
    // destra del P2 (che guarda verso +z) = -x nel campo
    const p2Moves = await measure(guest, host2, 'opponent', [.3, .7], 'corpo P2 → giocatore sull\'host');
    const p2r = p2Moves.find(o => o.bodyX < .5), p2l = p2Moves.find(o => o.bodyX > .5);
    check('P2 segue il corpo attraverso il relay: destra del P2 → -x, sinistra → +x (sull\'host che simula)', p2r && p2l && p2r.x < -2 && p2l.x > 2, `destra ${p2r?.x.toFixed(2)}, sinistra ${p2l?.x.toFixed(2)}`);
    check('…e il P2 vede il proprio giocatore spostato (snapshot dell\'host)', p2r && p2l && p2r.seen < -1.5 && p2l.seen > 1.5, `x sul P2: ${p2r?.seen?.toFixed(2)}, ${p2l?.seen?.toFixed(2)}`);
    await drawOnce(guest); await guest.screenshot({ path: path.join(OUT, 'lan-corpo-p2.png') });
    await hCtx.close(); await gCtx.close();
  }

} catch (error){
  check('prova LAN nel browser', false, error.stack);
} finally {
  check('nessuna richiesta fuori dal computer (offline)', external.length === 0, external.slice(0, 5).join(' '));
  check('nessun errore nelle pagine', errors.length === 0, errors.slice(0, 6).join(' | '));
  check('nessuna richiesta rifiutata dal browser per troppe richieste aperte (net::ERR_INSUFFICIENT_RESOURCES)', insufficient.length === 0, `${insufficient.length}: ${insufficient.slice(0, 3).join(' ')}`);
  await browser?.close().catch(() => {});
  server.kill();
  fs.rmSync(temp, { recursive: true, force: true });
  console.log(`\n${results.filter(Boolean).length}/${results.length} verifiche superate · schermate in ${OUT}`);
  if (results.some(r => !r)) process.exitCode = 1;
}
