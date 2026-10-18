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
// ONLY=telefono,1v1,webcam,corpo per eseguire solo alcune parti
const run = part => !process.env.ONLY || process.env.ONLY.split(',').includes(part);
const check = (name, ok, info = '') => { results.push(!!ok); console.log(`${ok ? 'OK  ' : 'KO  '}${name}${info ? ' — ' + info : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const qAngleDeg = (a, b) => 2*Math.acos(Math.min(1, Math.abs(a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3])))*180/Math.PI;
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
    const poll = setInterval(() => { if (/Gioco pronto/.test(serverLog)){ clearInterval(poll); clearTimeout(t); resolve(); } }, 100);
    server.once('exit', code => { clearInterval(poll); clearTimeout(t); reject(new Error(`server LAN uscito (${code}): ${serverLog}`)); });
  });
  check('server LAN avviato in HTTPS con gli indirizzi di rete', IP ? serverLog.includes(`https://${IP}:${PORT}/?lan=1`) : /HTTPS/.test(serverLog), serverLog.split('\n').find(l => l.includes('https://')) || '');
  browser = await chromium.launch({ executablePath: CHROME, args: ['--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns', ...(process.env.E2E_SWIFTSHADER ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] : []), '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--ignore-certificate-errors'] });

  /* ---------- 1. gioco offline dal server LAN ---------- */
  const hostCtx = await newContext({ viewport: { width: 1280, height: 760 }, permissions: ['camera'] });
  const host = await openGame(hostCtx, BASE + '/', 'host');
  check('il gioco si apre da / con ?lan=1 aggiunto dal server', new URL(host.url()).searchParams.get('lan') === '1', host.url());
  const status = await host.evaluate(() => fetch('/lan/status').then(r => r.json()));
  check('/lan/status: build presente e pacchetto offline completo', status.build && status.offline?.complete, JSON.stringify(status.offline));

  if (run('telefono')){
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
    await phone.addInitScript(fs.readFileSync(path.join(ROOT, '../tools/e2e/motion.js'), 'utf8') + ';DeviceMotionEvent.requestPermission=async()=>"granted";');
    await phone.goto(pairing.url);
    await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
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
    await host.evaluate(() => { __argonTennis.hud.callbacks.onStartMatch({ gamesToWin: 1, inputMode: 'phone' }); __argonTennis.hud.hideTitleModal(); });
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
      await rotate(axis, 45, 700); await rotate(axis, 0, 250);   // il telefono vero manda campioni anche da fermo
      const plus = await wrist();
      await rotate(axis, -45, 1400); await rotate(axis, 0, 250);
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
    // la rotazione del polso si somma alle animazioni di Argon (attesa, servizio della CPU): solo informativa
    console.log('rotazione del polso per asse del telefono (info)', JSON.stringify({ X: mapping.X.wrist, Y: mapping.Y.wrist, Z: mapping.Z.wrist }));
    await host.screenshot({ path: path.join(OUT, 'lan-telefono-terza-persona.png') });
    // servizio con il telefono: un gesto lancia la palla
    await host.evaluate(() => { window.__swings = []; __argonTennis.motionController.on('toss', s => __swings.push(s.source)); __argonTennis.motionController.on('swing', s => __swings.push(s.source)); });
    await phone.evaluate(async () => { await __motion.still(300); await __motion.swing({ axis: [0, 1, 0], peak: 320 }); await __motion.still(300); });
    await host.waitForFunction(() => __swings.length > 0, null, { timeout: 8000 }).catch(() => {});
    const swings = await host.evaluate(() => ({ swings: __swings, phase: __argonTennis.phase }));
    check('gesto del telefono → colpo di Argon (lancio al servizio)', swings.swings.includes('natpf-phone'), JSON.stringify(swings));
    await phoneCtx.close();
    await host.evaluate(() => __argonTennis.natpfUi.selectController('mouse', { open: false }));
    await hostCtx.close();
  } else await hostCtx.close();

  if (run('1v1')){
    /* ---------- 3. 1v1 tra due istanze attraverso il server LAN ---------- */
    const p1Ctx = await newContext({ viewport: { width: 1100, height: 680 } });
    const p1 = await openGame(p1Ctx, BASE + '/', 'P1');
    await p1.evaluate(() => __argonTennis.hud.callbacks.onSelectDifficulty('1v1'));
    await p1.waitForFunction(() => document.querySelector('#natpf-invite a')?.href, null, { timeout: 15000 });
    const invite = await p1.evaluate(() => document.querySelector('#natpf-invite a').href);
    const inviteUrl = new URL(invite);
    check('link del Player 2 nel menu: IP di rete al posto di localhost, stanza, role=p2 e ?lan=1', (!IP || inviteUrl.hostname === IP) && inviteUrl.searchParams.get('role') === 'p2' && /^AT-/.test(inviteUrl.searchParams.get('room')) && inviteUrl.searchParams.get('lan') === '1', invite);
    const p2Ctx = await newContext({ viewport: { width: 1100, height: 680 } });
    const p2 = await openGame(p2Ctx, invite, 'P2');
    await p2.evaluate(() => { __argonTennis.setViewMode('first'); document.querySelector('#natpf-guest-go')?.click(); });
    check('P2 entra nella stanza come guest', await p2.evaluate(() => __argonTennis.playerRole === 'p2' && __argonTennis.isMultiplayer));
    await p1.evaluate(() => {
      const e = __argonTennis, mc = e.motionController, f = mc.onP2Swing;
      window.__p2swings = 0; window.__maxRally = 0;
      mc.onP2Swing = s => { __p2swings++; return f(s); };
      e.hud.callbacks.onStartMatch({ gamesToWin: 2, inputMode: 'mouse' }), e.hud.hideTitleModal();
    });
    // giocatori automatici: lancio e colpo al servizio, swing quando la palla arriva vicino (gli stessi eventi del mouse)
    const bot = () => {
      let last = 0;
      window.__bot = setInterval(() => {
        const e = window.__argonTennis, mc = e.motionController, me = e.playerRole === 'p2' ? 'opponent' : 'player', a = e[me], b = e.ball, now = performance.now();
        window.__maxRally = Math.max(window.__maxRally || 0, b.rallyStrokeCount || 0);
        if (now - last < 380) return;
        if (e.phase === 'SERVE_STANCE' && e.score.server === me){ last = now + 400; mc.triggerSyntheticSwing({ type: 'toss' }); }
        else if (e.phase === 'SERVE_TOSS' && e.score.server === me && b.vel.y < 0){ last = now; mc.triggerSyntheticSwing({}); }
        else if (e.phase === 'RALLY' && b.inPlay && (a.pos.z - b.pos.z)*b.vel.z > 0 && Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 1.7){ last = now; mc.triggerSyntheticSwing({}); }
      }, 8);
    };
    await p1.evaluate(bot); await p2.evaluate(bot);
    await p1.waitForFunction(() => __argonTennis.phase === 'SERVE_STANCE' || __argonTennis.phase === 'RALLY', null, { timeout: 30000 });
    const t0 = Date.now();
    let sync = null;
    while (Date.now() - t0 < 40000){
      await sleep(1000);
      sync = await Promise.all([p1, p2].map(p => p.evaluate(() => ({ score: ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => __argonTennis.score[k]), phase: __argonTennis.phase, rally: window.__maxRally, p2swings: window.__p2swings }))));
      if (sync[0].p2swings >= 4 && sync[0].rally >= 3 && (sync[0].score.some(Boolean))) break;
    }
    await sleep(1500);
    sync = await Promise.all([p1, p2].map(p => p.evaluate(() => ({ score: ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => __argonTennis.score[k]), phase: __argonTennis.phase, rally: window.__maxRally, p2swings: window.__p2swings }))));
    console.log('1v1', JSON.stringify(sync));
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
    const cam = await openGame(camCtx, BASE + '/', 'webcam');
    const fps = () => cam.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r({ fps: Math.round(n/(performance.now() - t0)*1000), visible: document.visibilityState }); }; requestAnimationFrame(f); }));
    console.log('fps prima della webcam', JSON.stringify(await fps()));
    const mpRequests = [];
    cam.on('request', r => { if (/mediapipe/.test(r.url())) mpRequests.push(new URL(r.url()).hostname); });
    await cam.evaluate(() => { __argonTennis.natpfUi.selectController('webcam', { open: false }); __argonTennis.hud.callbacks.onStartMatch({ gamesToWin: 1, inputMode: 'webcam' }), __argonTennis.hud.hideTitleModal(); });
    await cam.waitForFunction(() => __argonTennis.motionController.webcamActive, null, { timeout: 20000 });
    await cam.waitForFunction(() => __argonTennis.motionController.mpHands, null, { timeout: 90000 }).catch(() => {});
    const mp = await cam.evaluate(async () => {
      const mc = __argonTennis.motionController;
      if (!mc.mpHands) return { loaded: false, base: mc.mediapipeBase };
      // un'inferenza vera sul fotogramma finto della webcam (nessuna mano: nessun landmark, ma nessun errore)
      const t0 = performance.now(); await mc.mpHands.send({ image: mc.videoElem });
      return { loaded: true, base: mc.mediapipeBase, ms: Math.round(performance.now() - t0), video: [mc.videoElem.videoWidth, mc.videoElem.videoHeight] };
    });
    console.log('fps con la webcam', JSON.stringify(await fps()));
    check('webcam (stream finto di Chrome) accesa e MediaPipe Hands caricato dal pacchetto locale, inferenza offline', mp.loaded && mp.base === '/assets/mediapipe/hands/' && mpRequests.length > 3 && mpRequests.every(h => h === '127.0.0.1'), JSON.stringify({ ...mp, richieste: mpRequests.length }));
    // da qui landmark sintetici (non c'è una mano vera davanti alla webcam finta): stessi campi che scrive MediaPipe
    await cam.evaluate(() => {
      const mc = __argonTennis.motionController;
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
    await cam.waitForFunction(() => __argonTennis.phase === 'SERVE_STANCE', null, { timeout: 30000 });
    const racket = () => cam.evaluate(() => {
      const e = __argonTennis, a = e.localActor || e.player, w = a.racketPivot.getWorldPosition(a.racketPivot.position.clone()), s = w.clone().project(e.camera);
      const h = a.parts?.handR ? a.parts.handR.getWorldPosition(w.clone()) : null, hs = h ? h.clone().project(e.camera) : null;
      return { screen: [s.x, s.y], hand: hs ? [hs.x, hs.y] : null, q: a.racketPivot.getWorldQuaternion(a.racketPivot.quaternion.clone()).toArray(), live: e.motionController.webcamLiveInput() };
    });
    // la mano si sposta piano (sotto la soglia degli swing di Argon), poi resta ferma
    const hold = async (pose, ms = 500) => {
      await cam.evaluate(async p => { const from = { ...__hand }; for (let i = 1; i <= 20; i++){ for (const k in p) __hand[k] = from[k] + (p[k] - from[k])*i/20; await new Promise(r => setTimeout(r, 30)); } }, pose);
      await sleep(ms); return racket();
    };
    const webcam = {};
    const f0 = await cam.evaluate(() => [__frames, performance.now()]);
    for (const view of ['third', 'first']){
      await cam.evaluate(v => __argonTennis.setViewMode(v), view);
      await cam.waitForFunction(() => __argonTennis.phase === 'SERVE_STANCE', null, { timeout: 30000 });
      await cam.evaluate(() => { __webcamShots.length = 0; });
      await hold({ x: .5, y: .6, angle: 0 }, 900);
      // nell'immagine della camera x .65 = sinistra del giocatore (immagine specchiata), x .35 = destra
      const left = await hold({ x: .65 }), right = await hold({ x: .35 });
      const low = await hold({ x: .5, y: .72 }), high = await hold({ y: .48 });
      const straight = await hold({ y: .6, angle: 0 }), tilted = await hold({ angle: -.5 });
      await cam.screenshot({ path: path.join(OUT, `lan-webcam-${view}.png`) });
      await hold({ angle: 0 }, 400);
    const shotsDuringPose = await cam.evaluate(() => __webcamShots.length);
    webcam[view] = { dx: +(right.screen[0] - left.screen[0]).toFixed(3), dy: +(high.screen[1] - low.screen[1]).toFixed(3), handDx: right.hand && left.hand ? +(right.hand[0] - left.hand[0]).toFixed(3) : null, rollDeg: +qAngleDeg(straight.q, tilted.q).toFixed(1), shots: shotsDuringPose, live: right.live };
    }
    const f1 = await cam.evaluate(() => [__frames, performance.now()]);
    webcam.fps = Math.round((f1[0] - f0[0])/(f1[1] - f0[1])*1000);
    console.log('webcam → racchetta', JSON.stringify(webcam));
    for (const view of ['third', 'first']){
      const w = webcam[view], label = view === 'first' ? 'prima persona' : 'terza persona';
      check(`webcam, ${label}: mano a destra/sinistra → racchetta a destra/sinistra sullo schermo`, w.dx > (view === 'first' ? .05 : .01), `Δx schermo ${w.dx}`);
      check(`webcam, ${label}: mano in alto/in basso → racchetta in alto/in basso`, w.dy > (view === 'first' ? .05 : .01), `Δy schermo ${w.dy}`);
      check(`webcam, ${label}: mano ruotata → racchetta ruotata`, w.rollDeg > 5, `${w.rollDeg}°`);
      check(`webcam, ${label}: i movimenti lenti muovono la racchetta senza far partire colpi`, w.shots === 0, `colpi: ${w.shots}`);
    }
    check('webcam: anche la mano del personaggio segue la mano reale', webcam.third.handDx > .02, `Δx mano ${webcam.third.handDx}`);
    // swing veloce davanti alla webcam: Argon fa partire il colpo (logica di gioco invariata)
    await cam.evaluate(async () => { for (let i = 0; i <= 5; i++){ __hand.x = .66 - i*.07; await new Promise(r => setTimeout(r, 34)); } });
    await cam.waitForFunction(() => __webcamShots.length > 0, null, { timeout: 3000 }).catch(() => {});
    const shots = await cam.evaluate(() => __webcamShots);
    check('webcam: uno swing della mano fa partire il colpo di Argon', shots.includes('webcam'), JSON.stringify(shots));
    await cam.evaluate(() => { window.__handOn = false; __argonTennis.motionController.disableWebcam(); });
    await camCtx.close();
  }

  /* ---------- 5. webcam «Movimento: segui il corpo» (MediaPipe Pose offline), P1 e P2 ---------- */
  if (run('corpo')){
    // corpo sintetico con gli stessi campi di MediaPipe Pose (spalle 11/12, anche 23/24), a ogni risultato
    const bodyInjector = () => {
      window.__body = { x: .5, w: .2, on: true };
      const lm = ({ x, w }) => { const l = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: .1 })); l[11] = { x: x + w/2, y: .35, z: 0, visibility: .95 }; l[12] = { x: x - w/2, y: .35, z: 0, visibility: .95 }; l[23] = { x: x + w*.4, y: .65, z: 0, visibility: .9 }; l[24] = { x: x - w*.4, y: .65, z: 0, visibility: .9 }; return l; };
      window.__bodyTimer = setInterval(() => { if (__body.on) __argonTennis.natpfBody.onPoseResults({ poseLandmarks: lm(__body) }); }, 40);
    };
    // giocatore automatico solo per servizio e colpi (la posizione la decide il corpo)
    const shooter = () => {
      let last = 0;
      window.__shooter = setInterval(() => {
        const e = window.__argonTennis, mc = e.motionController, me = e.playerRole === 'p2' ? 'opponent' : 'player', a = e[me], b = e.ball, now = performance.now();
        if (now - last < 380) return;
        if (e.phase === 'SERVE_STANCE' && e.score.server === me){ last = now + 400; mc.triggerSyntheticSwing({ type: 'toss' }); }
        else if (e.phase === 'SERVE_TOSS' && e.score.server === me && b.vel.y < 0){ last = now; mc.triggerSyntheticSwing({}); }
        else if (e.phase === 'RALLY' && b.inPlay && (a.pos.z - b.pos.z)*b.vel.z > 0 && Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 1.7){ last = now; mc.triggerSyntheticSwing({}); }
      }, 8);
    };
    // posizione x del giocatore che segue il corpo dopo 0,9 s di scambio, con il corpo a destra o a sinistra
    const measure = async (page, observer, actorKey, side, label) => {
      const out = [];
      for (const bodyX of side){
        await page.evaluate(x => { __body.x = x; }, bodyX);
        await observer.waitForFunction(() => __argonTennis.phase === 'RALLY', null, { timeout: 40000 });
        await sleep(900);
        const s = await observer.evaluate(k => ({ phase: __argonTennis.phase, x: __argonTennis[k].pos.x, z: __argonTennis[k].pos.z }), actorKey);
        const seen = page !== observer ? await page.evaluate(k => __argonTennis[k].pos.x, actorKey) : null;
        out.push({ bodyX, ...s, seen });
        await observer.waitForFunction(() => __argonTennis.phase !== 'RALLY', null, { timeout: 30000 }).catch(() => {});
      }
      console.log(label, JSON.stringify(out.map(o => ({ corpo: o.bodyX, fase: o.phase, x: +o.x.toFixed(2), z: +o.z.toFixed(2) }))));
      return out;
    };

    // P1 contro la CPU
    const bodyCtx = await newContext({ viewport: { width: 1100, height: 680 }, permissions: ['camera'] });
    const bp = await openGame(bodyCtx, BASE + '/', 'corpo P1');
    await bp.evaluate(() => { __argonTennis.natpfUi.selectController('webcam', { open: false }); __argonTennis.hud.callbacks.onStartMatch({ gamesToWin: 2, inputMode: 'webcam' }); __argonTennis.hud.hideTitleModal(); });
    await bp.waitForFunction(() => __argonTennis.motionController.webcamActive, null, { timeout: 20000 });
    check('pulsante «Movimento» visibile con la webcam, predefinito automatico', await bp.evaluate(() => { const b = document.getElementById('btn-natpf-movement'); return !!b && !b.classList.contains('hidden') && __argonTennis.natpfBody.mode === 'auto' && /automatico/.test(b.textContent); }));
    await bp.click('#btn-natpf-movement');
    await bp.waitForFunction(() => __argonTennis.natpfBody.pose, null, { timeout: 90000 }).catch(() => {});
    const poseInfo = await bp.evaluate(async () => {
      const f = __argonTennis.natpfBody, mc = __argonTennis.motionController;
      if (!f.pose) return { loaded: false, status: f.status };
      const t0 = performance.now(); await f.pose.send({ image: mc.videoElem });
      const t1 = performance.now(); if (mc.mpHands) await mc.mpHands.send({ image: mc.videoElem });
      return { loaded: true, base: f.base, ms: Math.round(t1 - t0), handsMs: Math.round(performance.now() - t1), mode: f.mode, hands: !!mc.mpHands };
    });
    check('«segui il corpo»: MediaPipe Pose caricato dal pacchetto locale insieme a Hands (entrambi attivi), inferenza offline', poseInfo.loaded && poseInfo.hands && poseInfo.base === '/assets/mediapipe/pose/' && poseInfo.mode === 'body', JSON.stringify(poseInfo));
    await bp.evaluate(bodyInjector);
    await bp.waitForFunction(() => __argonTennis.natpfBody.status === 'following', null, { timeout: 10000 });
    check('il corpo viene visto e la posizione di partenza calibrata', await bp.evaluate(() => /segue il corpo/.test(document.getElementById('btn-natpf-movement').textContent)));
    await bp.evaluate(shooter);
    const fps = await bp.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r(Math.round(n/(performance.now() - t0)*1000)); }; requestAnimationFrame(f); }));
    // destra del giocatore = sinistra nell'immagine della camera (a specchio): x .3 = destra, .7 = sinistra
    const p1Moves = await measure(bp, bp, 'player', [.3, .7, .3], 'corpo P1 → giocatore');
    await bp.evaluate(() => __argonTennis.setViewMode('first'));
    const p1First = await measure(bp, bp, 'player', [.7], 'corpo P1 → giocatore (prima persona)');
    const right = p1Moves.filter(o => o.bodyX < .5), left = [...p1Moves, ...p1First].filter(o => o.bodyX > .5);
    check('P1 segue il corpo: a destra davanti alla webcam → a destra in campo (terza persona)', right.every(o => o.x > 2), right.map(o => o.x.toFixed(2)).join(', '));
    check('P1 segue il corpo: a sinistra → a sinistra in campo (terza e prima persona)', left.every(o => o.x < -2), left.map(o => o.x.toFixed(2)).join(', '));
    // avanti verso la webcam (spalle più larghe) → verso la rete
    await bp.evaluate(() => { __body.x = .5; __body.w = .2*1.35; });
    await bp.waitForFunction(() => __argonTennis.phase === 'RALLY', null, { timeout: 40000 }); await sleep(900);
    const fwd = await bp.evaluate(() => __argonTennis.player.pos.z);
    check('P1 si avvicina alla webcam → va verso la rete', fwd < 9, `z = ${fwd.toFixed(2)} (fondo campo 11,89)`);
    await bp.screenshot({ path: path.join(OUT, 'lan-corpo-p1-prima-persona.png') });
    // corpo che esce dall'inquadratura: si torna al movimento automatico
    await bp.evaluate(() => { __body.on = false; });
    await sleep(700);
    const lost = await bp.evaluate(() => ({ status: __argonTennis.natpfBody.status, label: document.getElementById('btn-natpf-movement').textContent, target: __argonTennis.natpfBody.targetFor(__argonTennis.player) }));
    check('corpo non visto → movimento automatico di Argon', lost.status === 'lost' && lost.target === null && /automatico/.test(lost.label), JSON.stringify(lost));
    console.log('fps con webcam, Hands e Pose', fps);
    await bp.evaluate(() => { clearInterval(__shooter); clearInterval(__bodyTimer); __argonTennis.motionController.disableWebcam(); });
    await bodyCtx.close();

    // P2 in 1v1: il bersaglio del corpo passa dal relay all'host
    const hCtx = await newContext({ viewport: { width: 1000, height: 620 } });
    const host2 = await openGame(hCtx, BASE + '/', 'corpo host');
    await host2.evaluate(() => __argonTennis.hud.callbacks.onSelectDifficulty('1v1'));
    await host2.waitForFunction(() => document.querySelector('#natpf-invite a')?.href, null, { timeout: 15000 });
    const invite2 = await host2.evaluate(() => document.querySelector('#natpf-invite a').href);
    const gCtx = await newContext({ viewport: { width: 1000, height: 620 }, permissions: ['camera'] });
    const guest = await openGame(gCtx, invite2, 'corpo P2');
    await guest.evaluate(async () => { document.querySelector('#natpf-guest-go')?.click(); __argonTennis.natpfUi.selectController('webcam', { open: false }); await __argonTennis.motionController.enableWebcam(); __argonTennis.natpfBody.setMode('body'); });
    await guest.waitForFunction(() => __argonTennis.natpfBody.pose, null, { timeout: 90000 });
    check('P2: Hands e Pose entrambi attivi', await guest.evaluate(() => !!__argonTennis.motionController.mpHands && !!__argonTennis.natpfBody.pose));
    await guest.evaluate(bodyInjector);
    await guest.waitForFunction(() => __argonTennis.natpfBody.status === 'following', null, { timeout: 10000 });
    await host2.evaluate(() => { __argonTennis.hud.callbacks.onStartMatch({ gamesToWin: 2, inputMode: 'mouse' }); __argonTennis.hud.hideTitleModal(); });
    await host2.evaluate(shooter); await guest.evaluate(shooter);
    // destra del P2 (che guarda verso +z) = -x nel campo
    const p2Moves = await measure(guest, host2, 'opponent', [.3, .7], 'corpo P2 → giocatore sull\'host');
    const p2r = p2Moves.find(o => o.bodyX < .5), p2l = p2Moves.find(o => o.bodyX > .5);
    check('P2 segue il corpo attraverso il relay: destra del P2 → -x, sinistra → +x (sull\'host che simula)', p2r && p2l && p2r.x < -2 && p2l.x > 2, `destra ${p2r?.x.toFixed(2)}, sinistra ${p2l?.x.toFixed(2)}`);
    check('…e il P2 vede il proprio giocatore spostato (snapshot dell\'host)', p2r && p2l && p2r.seen < -1.5 && p2l.seen > 1.5, `x sul P2: ${p2r?.seen?.toFixed(2)}, ${p2l?.seen?.toFixed(2)}`);
    await guest.screenshot({ path: path.join(OUT, 'lan-corpo-p2.png') });
    await hCtx.close(); await gCtx.close();
  }

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
