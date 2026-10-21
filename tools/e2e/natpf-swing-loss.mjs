// NATPF motore base: consegna dei colpi telefono → computer con perdita di pacchetti (UDP sul loopback, iptables), in
// LAN (server lan/server.mjs con la build in dist/) o via internet (vite + segnalazione locale). Telefono simulato nel
// browser, profilo semplice, N colpi per condizione, flusso del piatto normale. Misura: arrivati, consegna (dal colpo
// deciso all'arrivo, orologi allineati) p50/p90/p99/max, oltre 50 e 100 ms, cadute, e da quale percorso arriva la prima
// copia di ogni colpo (link.stats().swings). Criteri (piano di test dell'audit, T-N1): nessun colpo perso, p99 ≤ 50 ms
// con il 3% di perdita e ≤ 80 ms con l'8%, nessuna caduta del collegamento.
// Serve iptables (root): misura, non sta nella matrice delle prove. Per la LAN prima `npm run build` in natpf-tennis.
//   MODE=lan|internet N=150 LOSS=0,0.03,0.08 WARM=30 OUT=risultati.json node natpf-swing-loss.mjs
//   ROOT=<altro checkout> per misurare un'altra versione (prima/dopo) con lo stesso banco di prova
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = process.env.ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), GAME = path.join(ROOT, 'natpf-tennis'), E2E = path.join(ROOT, 'tools/e2e');
const MODE = process.env.MODE || 'internet', N = +(process.env.N || 150), LOSS = (process.env.LOSS || '0,0.03,0.08').split(',').map(Number);
const OUT = process.env.OUT || null, BASEPORT = +(process.env.PORT || 3140);
try { execFileSync('iptables', ['-S', 'INPUT'], { stdio: 'ignore' }); } catch { console.error('serve iptables (root) per simulare le perdite'); process.exit(2); }
const { chromium } = await import(path.join(E2E, 'node_modules/playwright-core/index.mjs'));
const RULE = p => ['INPUT', '-i', 'lo', '-p', 'udp', '-m', 'statistic', '--mode', 'random', '--probability', String(p), '-j', 'DROP'];
let rule = null;
const setLoss = p => { if (rule != null){ try { execFileSync('iptables', ['-D', ...RULE(rule)]); } catch {} rule = null; } if (p > 0){ execFileSync('iptables', ['-A', ...RULE(p)]); rule = p; } };
const procs = [];
let peerServer = null;
const cleanup = () => { setLoss(0); for (const p of procs) try { p.kill(); } catch {} try { peerServer?.close(); } catch {} };
process.on('exit', cleanup); process.on('SIGINT', () => process.exit(1));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let gameUrl;
if (MODE === 'internet'){
  const { default: express } = await import(path.join(E2E, 'node_modules/express/index.js'));
  const { ExpressPeerServer } = await import(path.join(E2E, 'node_modules/peer/dist/module.mjs')).catch(async () => await import(path.join(E2E, 'node_modules/peer/dist/peer.js')));
  const app = express(); peerServer = http.createServer(app);
  app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
  await new Promise(r => peerServer.listen(BASEPORT + 1, '127.0.0.1', r));
  const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(BASEPORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
  procs.push(vite);
  for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(`http://127.0.0.1:${BASEPORT}/`, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) break; await sleep(500); }
  gameUrl = `http://127.0.0.1:${BASEPORT}/?intro=0&peer=127.0.0.1:${BASEPORT + 1}`;
} else {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-loss-')), cert = path.join(temp, 'cert.pem'), key = path.join(temp, 'key.pem');
  const ips = Object.values(os.networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=natpf-loss', '-addext', `subjectAltName=IP:127.0.0.1${ips.map(ip => `,IP:${ip}`).join('')},DNS:localhost`, '-keyout', key, '-out', cert], { stdio: 'ignore' });
  const server = spawn(process.execPath, [path.join(GAME, 'lan/server.mjs'), `--port=${BASEPORT}`, `--setup-port=${BASEPORT + 1000}`, '--no-open', '--offline', `--cert=${cert}`, `--key=${key}`], { cwd: GAME, stdio: ['ignore', 'pipe', 'pipe'] });
  procs.push(server);
  let log = ''; server.stdout.on('data', d => { log += d; }); server.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 200 && !/Gioco pronto/.test(log); i++) await sleep(100);
  if (!/Gioco pronto/.test(log)) throw new Error('server LAN non partito: ' + log);
  gameUrl = `https://127.0.0.1:${BASEPORT}/?lan=1&intro=0`;
}
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 16 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; this.emit(fn(Math.min(1, u))); if (u >= 1){ clearInterval(id); r(); } }, 16); }); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => [0, 0, sign*peak*Math.sin(Math.PI*u)**2], dur); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  DeviceMotionEvent.requestPermission = async () => 'granted';
};
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p*s.length))] : NaN; };
const B = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-certificate-errors'] });
const rows = [];
try {
  const gctx = await B.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true });
  const game = await gctx.newPage();
  await game.goto(gameUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // niente disegno: il motore e i messaggi non devono competere con il rendering software della prova
  await game.evaluate(() => { __natpfTennis.render = () => {}; __natpfTennis.natpfUi.intro?.skip?.(); });
  await game.evaluate(() => __natpfTennis.natpfUi.selectController('phone', { open: false }));
  await game.waitForFunction(() => __natpfTennis.natpfPhone.state.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const transport = await game.evaluate(() => __natpfTennis.natpfPhone.link.transport);
  const pctx = await B.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
  const phone = await pctx.newPage();
  await phone.addInitScript(PHONE_INIT);
  await phone.goto(url.replace(/^https?:\/\/[^/]+/, new URL(gameUrl).origin), { waitUntil: 'domcontentloaded' });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable'); await phone.waitForFunction(() => __racchetta.state.sensor === 'cal', null, { timeout: 8000 });
  await phone.waitForTimeout(1500);
  await game.evaluate(() => __natpfTennis.natpfPhone.skipCalibration());
  await phone.waitForFunction(() => __racchetta.state.sensor === 'ready', null, { timeout: 8000 });
  // il gioco resta nel menu: niente aggiornamento del telefono dal motore (rimanderebbe la fase «menu» a ogni
  // fotogramma e il telefono scarterebbe i colpi), la fase di gioco la manda la prova
  await game.evaluate(() => { const P = __natpfTennis.natpfPhone; P.update = () => {}; setInterval(() => { P.link.send({ t: 'ph', ph: 'play' }); P.lastPhase = 'play'; }, 400); window.__sw = []; P.link.on('swing', s => __sw.push({ seq: s.seq, total: (s.receivedAt - s.at)*1000, detect: s.detectMs ?? 0, hold: s.holdMs ?? 0 })); });
  await phone.waitForFunction(() => __racchetta.state.phase === 'play', null, { timeout: 5000 });
  await phone.evaluate(() => { window.__ls = []; let last = null; setInterval(() => { const s = __racchetta.state.linkState; if (s !== last){ __ls.push([Math.round(performance.now()), s]); last = s; } }, 50); });
  await game.evaluate(() => { window.__pcls = []; let last = null; setInterval(() => { const s = __natpfTennis.natpfPhone.link.L.state + '/' + (__natpfTennis.natpfPhone.link.L.phone || '-'); if (s !== last){ __pcls.push([Math.round(performance.now()), s]); last = s; } }, 50); });
  // riscaldamento escluso dalla misura (collegamenti appena aperti, codice non ancora ottimizzato dal browser)
  for (let i = 0; i < +(process.env.WARM || 0); i++){ await phone.evaluate(s => { window.__busy = true; return __up.swing(s).then(() => { window.__busy = false; }); }, i % 2 ? -1 : 1); await phone.waitForTimeout(450); }
  await phone.waitForTimeout(1500);
  for (const loss of LOSS){
    setLoss(loss);
    await game.evaluate(() => { __sw.length = 0; });
    const stats0 = await game.evaluate(() => __natpfTennis.natpfPhone.link.stats?.() || null);
    for (let i = 0; i < N; i++){ await phone.evaluate(s => { window.__busy = true; return __up.swing(s).then(() => { window.__busy = false; }); }, i % 2 ? -1 : 1); await phone.waitForTimeout(450); }
    await phone.waitForTimeout(2500);
    const sw = await game.evaluate(() => __sw.slice());
    const stats1 = await game.evaluate(() => __natpfTennis.natpfPhone.link.stats?.() || null);
    setLoss(0);
    const del = sw.map(s => Math.max(0, s.total - s.detect - s.hold));
    const seqs = new Set(sw.map(s => s.seq));
    rows.push({ mode: MODE, transport, loss: `${loss*100}%`, received: `${sw.length}/${N}`, distinct: seqs.size, detect_p50: Math.round(pct(sw.map(s => s.detect), .5)), p50: Math.round(pct(del, .5)), p90: Math.round(pct(del, .9)), p99: Math.round(pct(del, .99)), max: Math.round(Math.max(...del)), over100: del.filter(x => x > 100).length, over50: del.filter(x => x > 50).length,
      copies: stats1?.swings ? { ...stats1.swings } : null,
      phoneLink: await phone.evaluate(() => __ls.splice(0)), pcLink: await game.evaluate(() => __pcls.splice(0)) });
    console.log(JSON.stringify(rows.at(-1)));
    await phone.waitForTimeout(1500);
  }
} finally { setLoss(0); await B.close(); }
if (OUT) fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
// criteri d'accettazione
let ok = true;
for (const r of rows){
  const [got, n] = r.received.split('/').map(Number), loss = parseFloat(r.loss)/100, limit = loss >= .08 ? 80 : loss >= .03 ? 50 : 30;
  const pass = got === n && r.distinct === n && r.p99 <= limit && !r.phoneLink.some(([, s]) => s !== 'on') && !r.pcLink.some(([, s]) => !/^connected/.test(s));
  console.log(`${pass ? 'OK  ' : 'KO  '}${r.mode} perdita ${r.loss}: ${r.received} colpi, p99 ${r.p99} ms (limite ${limit}), max ${r.max} ms${r.copies ? `, prima copia veloce/affidabile ${r.copies.fast}/${r.copies.reliable}` : ''}`);
  ok &&= pass;
}
process.exit(ok ? 0 : 1);
