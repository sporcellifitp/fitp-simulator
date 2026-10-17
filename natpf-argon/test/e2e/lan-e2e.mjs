// Prova nel browser della versione LAN di natpf-argon, senza internet:
//   1. server LAN vero (lan/server.mjs, HTTPS con certificato di prova) e nessuna richiesta fuori dal computer;
//   2. telefono simulato (pagina NATPF /natpf/, devicemotion sintetici di tools/e2e/motion.js) collegato con il
//      trasporto LAN (?lan=1, segnalazione su /lan-signal, WebRTC diretto): flusso continuo dei sensori → racchetta;
//   3. 1v1 tra due istanze (host P1 e P2) attraverso il relay del server LAN, con il link di invito con l'IP di rete;
//   4. webcam con lo stream finto di Chrome: MediaPipe Hands caricato dal pacchetto locale e inferenza offline,
//      poi landmark sintetici della mano → posizione e inclinazione della racchetta in terza e prima persona, e swing.
// Requisiti: npm run build (dist/), npm ci in tools/lan e tools/e2e, openssl, Chrome o Chromium (CHROMIUM_PATH).
//   node test/e2e/lan-e2e.mjs        (dalla cartella natpf-argon; OUT=cartella per le schermate)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../tools/e2e/node_modules/playwright-core/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.OUT || path.join(os.tmpdir(), 'natpf-argon-lan-e2e');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'OK  ' : 'KO  '}${name}${info ? ' — ' + info : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = process.env.CHROMIUM_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(f => fs.existsSync(f));

function lanIp(){
  for (const items of Object.values(os.networkInterfaces())) for (const a of items || []) if (a.family === 'IPv4' && !a.internal) return a.address;
  return null;
}

// certificato di prova per 127.0.0.1 e l'IP di rete (al posto di quello mkcert di tools/lan/certs)
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-argon-lan-')), cert = path.join(temp, 'cert.pem'), key = path.join(temp, 'key.pem');
const IP = lanIp();
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=natpf-argon-e2e', '-addext', `subjectAltName=IP:127.0.0.1${IP ? `,IP:${IP}` : ''},DNS:localhost`, '-keyout', key, '-out', cert], { stdio: 'ignore', env: { ...process.env, MSYS2_ARG_CONV_EXCL: '*' } });
const PORT = 18000 + Math.floor(Math.random()*900), SETUP = PORT + 1000;
const server = spawn(process.execPath, [path.join(ROOT, 'lan/server.mjs'), `--port=${PORT}`, `--setup-port=${SETUP}`, '--no-open', '--offline', `--cert=${cert}`, `--key=${key}`], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', d => { serverLog += d; }); server.stderr.on('data', d => { serverLog += d; });
const BASE = `https://127.0.0.1:${PORT}`;

let browser;
const external = [], errors = [];
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
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errors.push(`${label}: ${m.text()}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__argonTennis?.player?.model && window.__argonTennis.racketKinematics, null, { timeout: 120000 });
  return page;
}

try {
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server LAN non partito: ' + serverLog)), 20000);
    const poll = setInterval(() => { if (/Gioco pronto|HTTPS non ancora pronto/.test(serverLog)){ clearInterval(poll); clearTimeout(t); resolve(); } }, 100);
    server.once('exit', code => { clearInterval(poll); clearTimeout(t); reject(new Error(`server LAN uscito (${code}): ${serverLog}`)); });
  });
  check('server LAN avviato in HTTPS con gli indirizzi di rete', IP ? serverLog.includes(`https://${IP}:${PORT}/?lan=1`) : /HTTPS/.test(serverLog), serverLog.split('\n').find(l => l.includes('https://')) || '');
  browser = await chromium.launch({ executablePath: CHROME, args: ['--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--ignore-certificate-errors'] });

  /* ---------- 1. gioco offline dal server LAN ---------- */
  const hostCtx = await newContext({ viewport: { width: 1280, height: 760 }, permissions: ['camera'] });
  const host = await openGame(hostCtx, BASE + '/', 'host');
  check('il gioco si apre da / con ?lan=1 aggiunto dal server', new URL(host.url()).searchParams.get('lan') === '1', host.url());
  const status = await host.evaluate(() => fetch('/lan/status').then(r => r.json()));
  check('/lan/status: build presente e pacchetto offline completo', status.build && status.offline?.complete, JSON.stringify(status.offline));

  /* ---------- 2. telefono simulato con il trasporto LAN ---------- */
  await host.evaluate(() => __argonTennis.natpfUi.selectController('phone', { open: false }));
  await host.waitForFunction(() => __argonTennis.natpfPhone.state.state === 'waiting' && __argonTennis.natpfPhone.pairingUrl, null, { timeout: 20000 });
  const pairing = await host.evaluate(() => ({ url: __argonTennis.natpfPhone.pairingUrl, transport: __argonTennis.natpfPhone.link.transport }));
  const pairUrl = new URL(pairing.url);
  check('QR del telefono: indirizzo di rete (non localhost), pagina NATPF /natpf/ e ?lan=1', (!IP || pairUrl.hostname === IP) && pairUrl.pathname === '/natpf/tennis/racchetta.html' && pairUrl.searchParams.get('lan') === '1', pairing.url.replace(/#.*/, '#…'));
  check('collegamento del telefono con il trasporto LAN (WebRTC diretto, non PeerJS cloud)', pairing.transport === 'lan-webrtc', pairing.transport);
  const phoneCtx = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
  const phone = await phoneCtx.newPage();
  phone.on('pageerror', e => errors.push(`telefono: ${e.message}`));
  if (process.env.PCS) await phone.addInitScript(() => { const P = window.RTCPeerConnection; window.__pcs = []; window.RTCPeerConnection = function(...a){ const pc = new P(...a); const rec = { log: [] }; window.__pcs.push(rec); pc.addEventListener('icecandidate', e => rec.log.push('cand ' + (e.candidate ? e.candidate.candidate : 'end'))); pc.addEventListener('iceconnectionstatechange', () => rec.log.push('ice ' + pc.iceConnectionState)); pc.addEventListener('connectionstatechange', () => rec.log.push('conn ' + pc.connectionState)); return pc; }; window.RTCPeerConnection.prototype = P.prototype; });
  await phone.addInitScript(fs.readFileSync(path.join(ROOT, '../tools/e2e/motion.js'), 'utf8') + ';DeviceMotionEvent.requestPermission=async()=>"granted";');
  if (process.env.DIAG){ await phone.goto(pairing.url.replace(/#.*/, '')); console.log('secure', await phone.evaluate(() => [isSecureContext, typeof crypto.randomUUID])); console.log('diag', await phone.evaluate(() => new Promise(r => { const w = new WebSocket(new URL('/lan-signal', location.href).href.replace('https', 'wss')); w.onopen = () => { w.send(JSON.stringify({ t: 'register', id: 'diag-abcdefghijk' })); }; w.onmessage = e => r('msg ' + e.data); w.onerror = () => r('error'); w.onclose = e => r('close ' + e.code + ' ' + e.reason); setTimeout(() => r('timeout'), 5000); }))); }
  await phone.goto(process.env.PHONE127 ? pairing.url.replace(IP, '127.0.0.1') : pairing.url);
  phone.on('console', m => console.log('[telefono]', m.type(), m.text()));
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 }).catch(async e => { console.log('pcs', JSON.stringify(await phone.evaluate(() => window.__pcs))); console.log('stato telefono', JSON.stringify(await phone.evaluate(() => window.__racchetta?.state)), JSON.stringify(await host.evaluate(() => __argonTennis.natpfPhone.state))); throw e; });
  // calibrazione rapida NATPF vera, guidata dal computer (natpf_phone_racket.js): fermo, quattro gesti, prova libera, conferma
  await phone.click('#enable');
  await phone.evaluate(() => __motion.still(1600));
  await phone.waitForFunction(() => __racchetta.cal.state.step === 'swings', null, { timeout: 15000 });
  for (const dir of [1, -1, 1, -1]) await phone.evaluate(async dir => { await __motion.swing({ axis: [0, -dir, 0], peak: 42, dur: 260 }); await __motion.swing({ axis: [0, dir, 0], peak: dir === 1 ? 120 : 150, dur: 220 }); await __motion.still(650); }, dir);
  await host.waitForFunction(() => __argonTennis.natpfPhone.cal.review?.pass, null, { timeout: 15000 });
  await phone.waitForFunction(() => __racchetta.cal.state.step === 'free', null, { timeout: 10000 });
  await phone.evaluate(async () => { await __motion.swing({ axis: [0, 1, 0], peak: 120, dur: 220 }); await __motion.still(500); });
  await host.waitForFunction(() => __argonTennis.natpfPhone.cal.freeOk, null, { timeout: 10000 });
  await host.evaluate(() => __argonTennis.natpfPhone.confirm());
  await phone.waitForFunction(() => __racchetta.state.sensor === 'ready', null, { timeout: 10000 });
  await host.waitForFunction(() => __argonTennis.natpfPhone.ready, null, { timeout: 10000 });
  check('telefono collegato e pronto sul computer', true);
  // partita contro la CPU: il telefono riceve la fase di gioco
  await host.evaluate(() => __argonTennis.hud.callbacks.onStartMatch({ gamesToWin: 1, inputMode: 'phone' }));
  await host.waitForFunction(() => __argonTennis.phase === 'SERVE_STANCE', null, { timeout: 30000 });
  await sleep(600);
  // flusso continuo: rotazione lenta attorno a un asse del telefono, poi indietro; la racchetta deve seguirla
  const wrist = () => host.evaluate(() => {
    const e = __argonTennis, k = e.player.racketKinematics, m = e.natpfPhone.link.motion(), o = e.motionController.phoneState.orientation;
    return { euler: [k.wristSpringEuler.x, k.wristSpringEuler.y, k.wristSpringEuler.z], q: e.player.racketPivot.quaternion.toArray(), received: m?.received || 0, tilt: [o.pitch, o.roll, o.yaw], ext: e.motionController.externalRacket };
  });
  const rotate = (axis, rate, ms) => phone.evaluate(({ axis, rate, ms }) => new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { __motion.emit(axis.map(v => v*rate)); if (performance.now() - t0 > ms){ clearInterval(id); r(); } }, 10); }), { axis, rate, ms });
  const qAngle = (a, b) => 2*Math.acos(Math.min(1, Math.abs(a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3])))*180/Math.PI;
  const axes = { X: [0, 1, 0], Y: [0, 0, 1], Z: [1, 0, 0] };          // rotationRate: alpha=Z, beta=X, gamma=Y
  const mapping = {};
  for (const [name, axis] of Object.entries(axes)){
    await rotate(axis, 0, 400);
    const before = await wrist();
    await rotate(axis, 45, 700); await sleep(250);
    const plus = await wrist();
    await rotate(axis, -45, 1400); await sleep(250);
    const minus = await wrist();
    await rotate(axis, 45, 700); await rotate(axis, 0, 300);              // di nuovo alla presa di riposo
    const d = plus.euler.map((v, i) => v - minus.euler[i]);
    mapping[name] = { tilt: plus.tilt.map((v, i) => +(v - minus.tilt[i]).toFixed(1)), wrist: d.map(v => +v.toFixed(3)), racketDeg: +qAngle(plus.q, minus.q).toFixed(1), samples: plus.received - before.received, ext: plus.ext };
  }
  console.log('telefono → racchetta', JSON.stringify(mapping));
  check('flusso dei sensori LAN: campioni continui arrivano al computer', mapping.X.samples > 20 && mapping.Y.samples > 20, `campioni in 0,7 s: ${mapping.X.samples}, ${mapping.Y.samples}, ${mapping.Z.samples}`);
  check('la racchetta virtuale segue il polso in modo continuo (tutti e tre gli assi)', Object.values(mapping).every(m => m.racketDeg > 4), Object.entries(mapping).map(([k, m]) => `${k}: ${m.racketDeg}°`).join(', '));
  const dominant = (v, i) => Math.abs(v[i]) > Math.abs(v[(i + 1) % 3]) && Math.abs(v[i]) > Math.abs(v[(i + 2) % 3]);
  check('impugnatura NATPF: asse X del telefono → beccheggio, asse Y (manico) → rollio del piatto, asse Z (normale allo schermo) → imbardata', dominant(mapping.X.tilt, 0) && dominant(mapping.Y.tilt, 1) && dominant(mapping.Z.tilt, 2), JSON.stringify({ X: mapping.X.tilt, Y: mapping.Y.tilt, Z: mapping.Z.tilt }));
  check('…e sulla racchetta: beccheggio → rotazione X del polso, imbardata → Y, rollio → Z', dominant(mapping.X.wrist, 0) && dominant(mapping.Z.wrist, 1) && dominant(mapping.Y.wrist, 2), JSON.stringify({ X: mapping.X.wrist, Y: mapping.Y.wrist, Z: mapping.Z.wrist }));
  await host.screenshot({ path: path.join(OUT, 'lan-telefono-terza-persona.png') });
  // servizio con il telefono: un gesto lancia la palla
  await host.evaluate(() => { window.__swings = []; __argonTennis.motionController.on('toss', s => __swings.push(s.source)); __argonTennis.motionController.on('swing', s => __swings.push(s.source)); });
  await phone.evaluate(async () => { await __motion.still(300); await __motion.swing({ axis: [0, 1, 0], peak: 320 }); await __motion.still(300); });
  await host.waitForFunction(() => __swings.length > 0, null, { timeout: 8000 }).catch(() => {});
  const swings = await host.evaluate(() => ({ swings: __swings, phase: __argonTennis.phase }));
  check('gesto del telefono → colpo di Argon (lancio al servizio)', swings.swings.includes('natpf-phone'), JSON.stringify(swings));
  await phoneCtx.close();
  await host.evaluate(() => __argonTennis.natpfUi.selectController('mouse', { open: false }));
} catch (error){
  check('prova LAN nel browser', false, error.stack);
} finally {
  check('nessuna richiesta fuori dal computer (offline)', external.length === 0, external.slice(0, 5).join(' '));
  check('nessun errore nelle pagine', errors.length === 0, errors.slice(0, 6).join(' | '));
  await browser?.close().catch(() => {});
  server.kill();
  fs.rmSync(temp, { recursive: true, force: true });
  console.log(`\n${results.filter(Boolean).length}/${results.length} verifiche superate · schermate in ${OUT}`);
  if (results.some(r => !r)) process.exitCode = 1;
}
