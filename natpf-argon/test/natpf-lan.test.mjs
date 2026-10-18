// Versione LAN di natpf-argon: server (relay 1v1, pacchetto offline, pagina del telefono, ?lan=1), asset locali,
// indirizzo di rete per QR e invito, posa della mano dalla webcam → racchetta.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createArgonRelay } from '../scripts/argon-relay.mjs';
import { argonAssetList, createAssetMiddleware, localAsset, offlineStatus, MEDIAPIPE_FILES, LICENSES, assetCategory } from '../scripts/offline-assets.mjs';
import { createGameHandler, lanRedirect } from '../lan/game-handler.mjs';
import { buildIsStale } from '../lan/prepare.mjs';
import { argonAssetUrl, ARGON_GSTATIC } from '../src/natpf/argon_assets.js';
import { handPoseFromLandmarks, handPoseFromFlow, WebcamHandTracker, HAND_POSE_LIMITS } from '../src/natpf/webcam_hand_pose.js';
import { lanOrigin, guestInviteUrl, isLoopbackHost } from '../src/natpf/natpf_lan.js';
import { phonePageUrl } from '../src/natpf/natpf_phone_racket.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

// server HTTP di prova con un handler (req, res) o un middleware (req, res, next)
async function serve(handler){
  const server = http.createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end('next'); }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) };
}

/* ---------- relay 1v1 di Argon ---------- */
test('relay 1v1 estratto da vite.config: stanza, snapshot dell\'host, colpo del P2 e link con l\'indirizzo di rete', async () => {
  const relay = createArgonRelay({ publicUrl: req => `https://${req.headers.host}` });
  const s = await serve(relay);
  try {
    const post = (p, body) => fetch(s.base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
    const room = await post('/api/match/create', { hostName: 'A' });
    assert.match(room.roomId, /^AT-[A-Z0-9]{4}$/);
    assert.equal(room.guestDesktopUrl, `https://${new URL(s.base).host}/?room=${room.roomId}&role=p2`);
    await post(`/api/match/sync?room=${room.roomId}`, { room: room.roomId, snapshot: { phase: 'RALLY', score: { playerPoints: 1 } } });
    const swing = await post(`/api/racket/swing?room=${room.roomId}&role=p2`, { room: room.roomId, role: 'p2', type: 'swing', dirX: .4 });
    assert.equal(swing.swing.role, 'p2'); near(swing.swing.dirX, .4);
    const state = await fetch(`${s.base}/api/match/state?room=${room.roomId}&role=p2&touch=p2`).then(r => r.json());
    assert.equal(state.snapshot.phase, 'RALLY'); assert.equal(state.p2.lastSwing.seq, 1); assert.equal(state.p2DesktopOnline, true);
    assert.equal((await fetch(s.base + '/altro')).status, 404);                       // non-API: passa avanti
    assert.equal(await fetch(s.base + '//api/match/state').then(r => r.status), 200);  // «//» non fa cadere il server
    assert.equal(createArgonRelay().length, 3);                                        // middleware connect (vite)
  } finally { await s.close(); }
});

/* ---------- pacchetto offline ---------- */
test('pacchetto offline: nessun asset esterno nei sorgenti, resta solo MediaPipe (Apache-2.0)', () => {
  const list = argonAssetList();
  assert.deepEqual(list, [], 'arena, personaggi, musica, voce e QR sono generati nel codice');
  assert.match(LICENSES.mediapipe, /Apache-2.0/);
  assert.ok(MEDIAPIPE_FILES.includes('hands.js') && MEDIAPIPE_FILES.some(f => f.endsWith('.wasm')));
  const status = offlineStatus();
  assert.equal(status.total, MEDIAPIPE_FILES.length);
});

test('asset: prima il disco, gstatic solo se manca e c\'è rete, MediaPipe mai da gstatic, niente uscite dalla cartella', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'argon-assets-'));
  fs.mkdirSync(path.join(dir, 'models')); fs.writeFileSync(path.join(dir, 'models/ball.glb'), 'GLB');
  fs.writeFileSync(path.join(os.tmpdir(), 'argon-secret.txt'), 'x');
  const asked = [];
  let online = true;
  const fetchImpl = async url => { asked.push(url); if (!online) throw Object.assign(new Error('offline'), { cause: { code: 'ENOTFOUND' } }); return new Response('REMOTE', { status: 200 }); };
  const s = await serve(createAssetMiddleware({ dirs: [{ dir }], fetchImpl }));
  try {
    assert.equal(localAsset('../argon-secret.txt', [{ dir }]), null);
    const local = await fetch(s.base + '/assets/models/ball.glb');
    assert.equal(local.status, 200); assert.equal(local.headers.get('content-type'), 'model/gltf-binary'); assert.equal(await local.text(), 'GLB');
    const range = await fetch(s.base + '/assets/models/ball.glb', { headers: { Range: 'bytes=1-' } });
    assert.equal(range.status, 206); assert.equal(await range.text(), 'LB');
    assert.equal(asked.length, 0, 'un file locale non chiede la rete');
    const remote = await fetch(s.base + '/assets/audio/x.mp3');
    assert.equal(remote.status, 200); assert.equal(await remote.text(), 'REMOTE'); assert.equal(asked[0], ARGON_GSTATIC + 'audio/x.mp3');
    assert.equal((await fetch(s.base + '/assets/mediapipe/hands/hands.js')).status, 404, 'MediaPipe solo dal pacchetto npm');
    online = false;
    assert.equal((await fetch(s.base + '/assets/textures/y.png')).status, 404, 'offline: 404 pulito');
    const n = asked.length; await fetch(s.base + '/assets/textures/y.png'); assert.equal(asked.length, n, 'offline: non riprova subito');
    assert.equal((await fetch(s.base + '/assets/%2e%2e/%2e%2e/argon-secret.txt')).status, 404);
    assert.equal((await fetch(s.base + '/assets/index-abc.js')).status, 404);          // non è un asset di Argon: next()
  } finally { await s.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('client: gli indirizzi gstatic di Argon diventano ./assets/ (pacchetto offline)', () => {
  assert.equal(argonAssetUrl(ARGON_GSTATIC + 'audio/menu_theme.mp3'), './assets/audio/menu_theme.mp3');
  assert.equal(argonAssetUrl('./assets/models/x.glb'), './assets/models/x.glb');
  assert.equal(argonAssetUrl(undefined), undefined);
  // nessun indirizzo internet rimasto nei sorgenti che il browser carica senza passare dalla riscrittura
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(!/src="https?:\/\//.test(html), 'index.html non carica nulla da internet');
  const motion = fs.readFileSync(path.join(ROOT, 'src/motion_controls.js'), 'utf8');
  assert.match(motion, /MEDIAPIPE_LOCAL_BASE = "\/assets\/mediapipe\/hands\/"/);
  assert.match(motion, /@mediapipe\/hands@0\.4\.1675469240\//, 'CDN di riserva con la stessa versione del pacchetto');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@mediapipe/hands'], '0.4.1675469240');
});

/* ---------- server LAN: richieste del gioco ---------- */
test('server LAN: ?lan=1 sempre, build, pagina del telefono NATPF, relay, file non serviti', async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'argon-dist-'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<title>gioco</title>');
  fs.mkdirSync(path.join(dist, 'assets')); fs.writeFileSync(path.join(dist, 'assets/index-AbCd1234.js'), 'js');
  const s = await serve(createGameHandler({ distDir: dist, upstream: false }));
  try {
    const go = (p, o) => fetch(s.base + p, { redirect: 'manual', ...o });
    const r = await go('/?room=AT-ABCD&role=p2');
    assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/?room=AT-ABCD&role=p2&lan=1');
    assert.equal(lanRedirect(new URL('http://x/?lan=1')), null);
    const page = await go('/?lan=1');
    assert.equal(page.status, 200); assert.equal(await page.text(), '<title>gioco</title>'); assert.equal(page.headers.get('cache-control'), 'no-cache');
    assert.match((await go('/assets/index-AbCd1234.js')).headers.get('cache-control'), /immutable/);
    const phone = await go('/natpf/tennis/racchetta.html');
    assert.equal(phone.status, 200); assert.match(await phone.text(), /racchetta/i);
    assert.equal((await go('/natpf/js/tennis/lan-transport.js')).status, 200);
    for (const p of ['/natpf/js/main.js', '/natpf/data/foro.json', '/natpf/../natpf-argon/vite.config.ts', '/%2e%2e/package.json', '/natpf/js/tennis/%2e%2e/%2e%2e/%2e%2e/tools/lan/certs/key.pem'])
      assert.equal((await go(p)).status, 404, p);
    assert.equal((await go('/api/match/state?room=default')).status, 200);
    assert.equal((await go('/api/racket/swing', { method: 'POST', body: '{}' })).status, 200);
    assert.equal((await go('/index.html', { method: 'POST' })).status, 405);
    fs.rmSync(path.join(dist, 'index.html'));
    const missing = await go('/?lan=1');
    assert.equal(missing.status, 503); assert.match(await missing.text(), /npm run build/);
  } finally { await s.close(); fs.rmSync(dist, { recursive: true, force: true }); }
});

test('build da rifare solo se i sorgenti sono più recenti di dist/', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'argon-stale-'));
  try {
    fs.mkdirSync(path.join(root, 'src')); fs.writeFileSync(path.join(root, 'src/a.js'), '');
    assert.equal(buildIsStale(root), true);
    fs.mkdirSync(path.join(root, 'dist')); fs.writeFileSync(path.join(root, 'dist/index.html'), '');
    const future = new Date(Date.now() + 60000); fs.utimesSync(path.join(root, 'dist/index.html'), future, future);
    assert.equal(buildIsStale(root), false);
    const later = new Date(Date.now() + 120000); fs.utimesSync(path.join(root, 'src/a.js'), later, later);
    assert.equal(buildIsStale(root), true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

/* ---------- avvio guidato di tools/lan con il gioco natpf-argon ---------- */
const hasWs = fs.existsSync(path.join(ROOT, '../tools/lan/node_modules/ws'));
let hasOpenssl = true; try { execFileSync('openssl', ['version'], { stdio: 'ignore' }); } catch { hasOpenssl = false; }
test('avvio LAN: riusa tools/lan (certificato per IP, /lan/status, /lan-signal) e serve il gioco in HTTPS', { skip: !hasWs ? 'npm ci in tools/lan' : !hasOpenssl ? 'openssl mancante' : false }, async () => {
  const { startArgonLan, GAME_PATH } = await import('../lan/server.mjs');
  const { WebSocket } = await import('../../tools/lan/node_modules/ws/wrapper.mjs');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'argon-tls-')), cert = path.join(temp, 'cert.pem'), key = path.join(temp, 'key.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=argon-test', '-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', key, '-out', cert], { stdio: 'ignore', env: { ...process.env, MSYS2_ARG_CONV_EXCL: '*' } });
  const launcher = await startArgonLan({ port: 0, setupPort: 0, open: false, cert, key, upstream: false });
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED; process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  let ws;
  try {
    assert.equal(GAME_PATH, '/?lan=1');
    const setup = `http://127.0.0.1:${launcher.setup.server.address().port}`;
    const status = await fetch(setup + '/lan/status').then(r => r.json());
    assert.equal(status.game, 'natpf-argon'); assert.equal(typeof status.build, 'boolean'); assert.ok(status.offline.total > 50);
    assert.ok(status.urls.every(u => u.endsWith(':' + launcher.game.server.address().port + '/?lan=1')));
    assert.ok(!JSON.stringify(status).includes('PRIVATE KEY'));
    const base = `https://127.0.0.1:${launcher.game.server.address().port}`;
    const r = await fetch(base + '/?room=X', { redirect: 'manual' });
    assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/?room=X&lan=1');
    assert.equal((await fetch(base + '/api/match/state')).status, 200);
    assert.equal((await fetch(base + '/natpf/tennis/racchetta.html')).status, 200);
    assert.equal((await fetch(base + '/lan/status').then(r => r.json())).game, 'natpf-argon');
    // segnalazione WebRTC del telefono sullo stesso server
    ws = new WebSocket(base.replace('https:', 'wss:') + '/lan-signal', { origin: base, rejectUnauthorized: false });
    await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
    const reply = new Promise(res => ws.once('message', d => res(JSON.parse(d))));
    ws.send(JSON.stringify({ t: 'register', id: 'phone-argon-lan-test' }));
    assert.equal((await reply).t, 'registered');
  } finally {
    ws?.terminate();
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    await launcher.close(); fs.rmSync(temp, { recursive: true, force: true });
  }
});

/* ---------- indirizzo di rete per telefono e Player 2 ---------- */
test('gioco aperto da localhost sul server LAN: QR e invito con l\'IP di rete, ?lan=1', async () => {
  assert.ok(isLoopbackHost('localhost') && isLoopbackHost('127.0.0.1') && isLoopbackHost('[::1]') && !isLoopbackHost('192.168.1.20'));
  const status = { urls: ['https://192.168.1.20:8443/?lan=1'] };
  const fetchImpl = async () => ({ ok: true, json: async () => status });
  const local = new URL('https://127.0.0.1:8443/?lan=1');
  assert.equal(await lanOrigin({ location: local, fetchImpl }), 'https://192.168.1.20:8443');
  assert.equal(await lanOrigin({ location: new URL('https://192.168.1.20:8443/'), fetchImpl }), null, 'già sull\'IP di rete');
  globalThis.location = local;
  try {
    const invite = await guestInviteUrl('AT-ABCD', { location: local, fetchImpl });
    assert.equal(invite.url, 'https://192.168.1.20:8443/?room=AT-ABCD&role=p2&lan=1'); assert.equal(invite.reachable, true);
  } finally { delete globalThis.location; }
  assert.equal(phonePageUrl(local, 'https://192.168.1.20:8443'), 'https://192.168.1.20:8443/natpf/tennis/racchetta.html');
  assert.equal(phonePageUrl(local), 'https://127.0.0.1:8443/natpf/tennis/racchetta.html');
});

/* ---------- webcam: posa della mano → racchetta ---------- */
// mano sintetica: polso in (x, y) sull'immagine della camera, asse polso → medio lungo `angle` (0 = dita in alto)
function hand({ x = .5, y = .6, angle = 0, len = .12, dz = 0 }){
  const p = (dx, dy, z = 0) => ({ x: x + dx, y: y + dy, z });
  const ux = Math.sin(angle), uy = -Math.cos(angle), vx = Math.cos(angle), vy = Math.sin(angle);   // asse e larghezza della mano
  const lm = Array.from({ length: 21 }, () => p(0, 0));
  lm[0] = p(0, 0); lm[9] = p(ux*len, uy*len, dz); lm[5] = p(ux*len*.95 - vx*len*.3, uy*len*.95 - vy*len*.3, dz); lm[17] = p(ux*len*.8 + vx*len*.35, uy*len*.8 + vy*len*.35, dz);
  return lm;
}
test('webcam: posizione e rotazione della mano dai landmark MediaPipe (immagine specchiata come in Argon)', () => {
  const center = handPoseFromLandmarks(hand({}));
  near(center.roll, 0, 1e-9); near(center.pitch, 0, 1e-9); assert.equal(center.source, 'mediapipe');
  near(center.x, 1 - (.5*.45 + .5*.55));                                       // stesso centro della traccia di Argon
  // mano che sullo schermo (specchiato) va a destra: x cresce
  assert.ok(handPoseFromLandmarks(hand({ x: .3 })).x > center.x);
  // dita che piegano verso la destra del giocatore = verso sinistra nell'immagine della camera
  assert.ok(handPoseFromLandmarks(hand({ angle: -.4 })).roll > .3);
  assert.ok(handPoseFromLandmarks(hand({ dz: -.05 })).pitch > 0, 'dita verso la camera');
  assert.equal(handPoseFromLandmarks([]), null); assert.equal(handPoseFromLandmarks(null), null);
  const flow = handPoseFromFlow({ x: .7, y: .4 });
  assert.equal(flow.source, 'flow'); assert.ok(flow.confidence < 1);
});

test('webcam: la posa filtrata diventa inclinazione e spostamento della racchetta, e sfuma se la mano sparisce', () => {
  const t = new WebcamHandTracker({ smoothing: 1 });
  assert.equal(t.sample(0), null);
  t.push(handPoseFromLandmarks(hand({})), 0);
  const rest = t.sample(10);
  for (const k of ['tiltPitch', 'tiltRoll', 'tiltYaw', 'handOffsetX', 'handOffsetY']) near(rest[k], 0, 1e-9);
  // mano a destra e in alto, dita piegate: neutro quasi fermo (si adatta in secondi)
  t.push(handPoseFromLandmarks(hand({ x: .35, y: .45, angle: -.35 })), 33);
  const moved = t.sample(40);
  assert.ok(moved.handOffsetX > .1, 'spostamento verso destra');
  assert.ok(moved.handOffsetY > .08, 'mano più in alto');
  assert.ok(moved.tiltRoll > .2, 'piatto ruotato');
  assert.ok(moved.tiltPitch > 0 && moved.tiltYaw > 0);
  // limiti
  t.push(handPoseFromLandmarks(hand({ x: -.6, y: -.5, angle: -1.5 })), 66);
  const far = t.sample(70);
  assert.ok(Math.abs(far.handOffsetX) <= HAND_POSE_LIMITS.offsetX + 1e-9 && Math.abs(far.handOffsetY) <= HAND_POSE_LIMITS.offsetY + 1e-9 && Math.abs(far.tiltRoll) <= HAND_POSE_LIMITS.tilt + 1e-9);
  // la mano non si vede più: resta un attimo, poi sfuma e torna la racchetta di Argon
  const hold = t.sample(66 + 200), mid = t.sample(66 + 240 + 175), gone = t.sample(66 + 240 + 400);
  near(hold.confidence, 1); assert.ok(mid.confidence > 0 && mid.confidence < 1); assert.equal(gone, null);
  // il neutro segue lentamente la posizione abituale della mano
  const slow = new WebcamHandTracker({ smoothing: 1, neutralTauMs: 1000 });
  slow.push(handPoseFromLandmarks(hand({})), 0);
  for (let ms = 33; ms < 6000; ms += 33) slow.push(handPoseFromLandmarks(hand({ x: .3 })), ms);
  assert.ok(Math.abs(slow.sample(6000).handOffsetX) < .01);
});
