// Sfida tra due computer senza server (sito statico): relay della partita nel browser dell'host, RPC del Player 2 sulla
// DataConnection, riconnessione, intercettazione di fetch; colpo del P2 con i dati del telefono (natpf, mano) fino
// a _attemptP2RallyStrike. Niente rete: canali e Peer finti in memoria.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalRelay, createRpcClient, serveRpc, createP2pHost, createP2pGuest, installNatpfP2p, peerIdForRoom, isRelayPath, remoteAllowed, serverHasMatchApi, p2pRequested } from '../src/natpf/natpf_p2p.js';
import { natpfSwingExtras } from '../scripts/match-relay.mjs';
import { guestInviteUrl } from '../src/natpf/natpf_lan.js';
import { p2pStatusText } from '../src/natpf/natpf_ui.js';
import { relayedNatpf } from '../src/natpf/natpf_skill.js';
import { MotionController } from '../src/motion_controls.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';

const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 2000){ const t0 = Date.now(); while (!fn()){ if (Date.now() - t0 > ms) throw new Error('tempo scaduto'); await tick(5); } }
const NATPF = { aim: 'swing', shot: 'drop', wrist: -.4, aimSource: 'twist', power: .3, latency: .05, hand: 'left', prepCapable: false, prep: null };

/* ---------- canali e Peer finti ---------- */
class FakeConn {
  constructor(peer){ this.peer = peer; this.open = false; this.closed = false; this.h = {}; this.other = null; }
  on(ev, fn){ (this.h[ev] ||= []).push(fn); return this; }
  emit(ev, v){ for (const fn of this.h[ev] || []) fn(v); }
  send(d){ if (!this.open) throw new Error('chiuso'); const o = this.other, copy = JSON.parse(JSON.stringify(d)); setTimeout(() => o.open && o.emit('data', copy), 0); }
  close(){ if (this.closed) return; this.closed = true; this.open = false; this.emit('close'); this.other?.close(); }
}
function channelPair(){
  const a = new FakeConn('b'), b = new FakeConn('a'); a.other = b; b.other = a; a.open = b.open = true;
  return [a, b];
}
function fakeNetwork(){
  const peers = new Map(), conns = [];
  let n = 0;
  class Peer {
    constructor(id){
      this.id = id || `ospite-${++n}`; this.h = {}; this.destroyed = false;
      setTimeout(() => {
        if (peers.has(this.id)){ this.destroyed = true; this.emit('error', { type: 'unavailable-id' }); return; }
        peers.set(this.id, this); this.emit('open', this.id);
      }, 0);
    }
    on(ev, fn){ (this.h[ev] ||= []).push(fn); return this; }
    emit(ev, v){ for (const fn of this.h[ev] || []) fn(v); }
    connect(id){
      const a = new FakeConn(id);
      setTimeout(() => {
        const host = peers.get(id);
        if (!host || host.destroyed){ this.emit('error', { type: 'peer-unavailable' }); return; }
        const b = new FakeConn(this.id); a.other = b; b.other = a; conns.push(b);
        host.emit('connection', b); a.open = b.open = true; b.emit('open'); a.emit('open');
      }, 0);
      return a;
    }
    reconnect(){}
    destroy(){ this.destroyed = true; if (peers.get(this.id) === this) peers.delete(this.id); }
  }
  return { Peer, peers, conns };
}
// finestra del browser finta: location e fetch del «server» (statico o con le API)
function fakeWindow(href, serverFetch){
  const calls = [];
  const win = { location: new URL(href), fetch: async (input, init = {}) => { calls.push([String(input), init.method || 'GET']); return serverFetch(String(input), init); } };
  return { win, calls };
}
const staticSite = async () => new Response('<!doctype html><title>404</title>', { status: 404, headers: { 'Content-Type': 'text/html' } });
const json = (r) => r.json();

/* ---------- parte pura ---------- */
test('p2p: id del Peer dalla stanza, percorsi del relay, cosa può chiedere il P2', () => {
  assert.equal(peerIdForRoom('AT-K3ZQ'), 'natpf-sfida-at-k3zq');
  assert.equal(p2pRequested('?room=AT-1&role=p2&net=p2p'), true); assert.equal(p2pRequested('?room=AT-1&role=p2'), false);
  for (const p of ['/api/match/state', '/api/match/create', '/api/racket/swing', '/api/body', '/api/tunnel/status']) assert.ok(isRelayPath(p), p);
  for (const p of ['/lan/status', '/natpf/tennis/racchetta.html', '/api/altro', '/']) assert.ok(!isRelayPath(p), p);
  assert.ok(remoteAllowed('GET', '/api/match/state') && remoteAllowed('POST', '/api/racket/swing') && remoteAllowed('post', '/api/body'));
  assert.ok(!remoteAllowed('POST', '/api/match/sync') && !remoteAllowed('POST', '/api/match/create'), 'lo snapshot e le stanze restano all’host');
  assert.match(p2pStatusText('host', 'waiting'), /attesa/); assert.match(p2pStatusText('host', 'connected'), /collegato/);
  assert.match(p2pStatusText('guest', 'lost'), /ricollego/); assert.match(p2pStatusText('host', 'error', 'network'), /network/);
});

test('relay nel browser: stesso JSON del server (stanza, snapshot, colpo del P2 con natpf e mano), il resto 404', async () => {
  const L = createLocalRelay();
  const room = JSON.parse((await L.handle({ method: 'POST', url: '/api/match/create', body: { hostName: 'A' } })).text);
  assert.match(room.roomId, /^AT-[A-Z0-9]{4}$/);
  assert.equal(room.guestDesktopUrl, `/?room=${room.roomId}&role=p2`);
  const sync = await L.handle({ method: 'POST', url: `/api/match/sync?room=${room.roomId}`, body: JSON.stringify({ room: room.roomId, snapshot: { phase: 'RALLY' } }) });
  assert.equal(sync.status, 200); assert.equal(JSON.parse(sync.text).seq, 1);
  const sw = JSON.parse((await L.handle({ method: 'POST', url: `/api/racket/swing?room=${room.roomId}&role=p2`, body: { role: 'p2', type: 'swing', dirX: .3, natpf: NATPF, hand: 'left' } })).text);
  assert.equal(sw.swing.role, 'p2'); assert.deepEqual(sw.swing.natpf, NATPF); assert.equal(sw.swing.hand, 'left');
  const st = JSON.parse((await L.handle({ url: `/api/match/state?room=${room.roomId}&role=p1` })).text);
  assert.equal(st.snapshot.phase, 'RALLY'); assert.equal(st.p2.lastSwing.natpf.shot, 'drop'); assert.equal(st.p2.lastSwing.hand, 'left');
  // senza i campi NATPF il colpo resta quello del motore base
  const plain = JSON.parse((await L.handle({ method: 'POST', url: `/api/racket/swing?room=${room.roomId}&role=p2`, body: { type: 'swing' } })).text);
  assert.ok(!('natpf' in plain.swing) && !('hand' in plain.swing));
  assert.equal((await L.handle({ url: '/altro' })).status, 404);
  // campi NATPF: solo oggetti piccoli e una mano valida
  assert.deepEqual(natpfSwingExtras({ natpf: [1], hand: 'sinistra' }), {});
  assert.deepEqual(natpfSwingExtras({ natpf: { why: 'x'.repeat(5000) } }), {});
});

test('RPC su una coppia di canali: il P2 riceve la risposta del relay dell’host, stanza imposta, percorsi vietati, chiusura', async () => {
  const L = createLocalRelay();
  const room = JSON.parse((await L.handle({ method: 'POST', url: '/api/match/create', body: {} })).text);
  const [guestSide, hostSide] = channelPair();
  serveRpc(hostSide, { roomId: room.roomId, handle: L.handle });
  const rpc = createRpcClient(guestSide);
  // il P2 sbaglia stanza: vale quella dell'host
  const r = await rpc.request({ method: 'POST', url: '/api/racket/swing?room=ALTRA&role=p2', body: JSON.stringify({ room: 'ALTRA', role: 'p2', type: 'swing', natpf: NATPF }) });
  assert.equal(r.status, 200); assert.equal(JSON.parse(r.text).roomId, room.roomId);
  const st = await rpc.request({ url: `/api/match/state?room=${room.roomId}&role=p2&touch=p2` });
  assert.equal(JSON.parse(st.text).p2.lastSwing.natpf.shot, 'drop');
  assert.equal((await rpc.request({ method: 'POST', url: '/api/match/sync', body: '{}' })).status, 403);
  const pending = rpc.request({ url: '/api/match/state' });
  guestSide.close();
  await assert.rejects(pending, TypeError);
  await assert.rejects(rpc.request({ url: '/api/match/state' }), /non collegato/);
  // l'host non risponde: errore dopo il tempo massimo
  const [a] = channelPair();
  await assert.rejects(createRpcClient(a, { timeoutMs: 30 }).request({ url: '/api/match/state' }), /senza risposta/);
});

test('host e P2 con Peer finti: in attesa → collegato, rete persa → si ricollega, host riaperto → di nuovo collegato', async () => {
  const net = fakeNetwork();
  const L = createLocalRelay();
  const room = JSON.parse((await L.handle({ method: 'POST', url: '/api/match/create', body: {} })).text);
  // il P2 apre il link prima che l'host sia online: riprova finché lo trova
  const guest = createP2pGuest({ Peer: net.Peer, roomId: room.roomId, retryMs: [10] });
  const seen = []; guest.onStatus(s => seen.push(s.status));
  await tick(40);
  assert.equal(guest.state.status, 'connecting');
  let host = createP2pHost({ Peer: net.Peer, roomId: room.roomId, handle: L.handle });
  assert.deepEqual(await host.ready, { ok: true });
  await until(() => guest.connected);
  assert.equal(host.state.status, 'connected');
  const res = JSON.parse((await guest.request({ url: `/api/match/state?room=${room.roomId}&role=p2` })).text);
  assert.equal(res.roomId, room.roomId);
  // rete persa: il canale si chiude, il P2 si ricollega da solo
  net.conns.at(-1).close();
  await until(() => host.state.status === 'lost' && guest.state.status !== 'connected');
  await until(() => guest.connected && host.state.status === 'connected');
  assert.ok(seen.includes('lost'));
  // l'host chiude e riapre la stessa stanza (ricarica): il P2 torna da solo
  host.destroy();
  await until(() => !guest.connected);
  host = createP2pHost({ Peer: net.Peer, roomId: room.roomId, handle: L.handle });
  await until(() => guest.connected);
  // stanza sbagliata: l'host rifiuta
  const intruder = createP2pGuest({ Peer: net.Peer, roomId: 'AT-ZZZZ', retryMs: [10] });
  const other = createP2pHost({ Peer: net.Peer, roomId: 'AT-YYYY', handle: L.handle });
  void other; await tick(30);
  assert.notEqual(intruder.state.status, 'connected');
  for (const x of [guest, host, intruder, other]) x.destroy();
});

test('fetch intercettato: sito statico (404) → stanza nel browser dell’host, link p2p, il P2 gioca via RPC con natpf e mano', async () => {
  const net = fakeNetwork();
  const H = fakeWindow('https://natpf.example/gioco/', staticSite);
  const host = installNatpfP2p({ win: H.win, Peer: net.Peer });
  // fuori dai percorsi del relay non cambia nulla
  assert.equal((await H.win.fetch('/natpf/js/vendor/peerjs.min.js')).status, 404);
  const room = await H.win.fetch('/api/match/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p1Name: 'A' }) }).then(json);
  assert.equal(room.net, 'p2p'); assert.equal(host.mode, 'host'); assert.equal(room.peerId, peerIdForRoom(room.roomId));
  assert.equal(H.calls.filter(([u]) => u === '/api/match/create').length, 1, 'il server è stato provato una volta');
  await until(() => host.status === 'waiting');
  // invito del P2: stessa pagina, ?net=p2p
  globalThis.location = H.win.location;
  try {
    const { url } = await guestInviteUrl(room.roomId, { location: H.win.location, p2p: true });
    assert.equal(url, `https://natpf.example/gioco/?room=${room.roomId}&role=p2&net=p2p`);
    const G = fakeWindow(url, staticSite);
    const guest = installNatpfP2p({ win: G.win, Peer: net.Peer });
    assert.equal(guest.mode, 'guest');
    await until(() => guest.status === 'connected' && host.status === 'connected');
    // il P2 manda il colpo con i dati del telefono: arriva all'host
    const sw = await G.win.fetch(`/api/racket/swing?room=${room.roomId}&role=p2`, { method: 'POST', body: JSON.stringify({ room: room.roomId, role: 'p2', type: 'swing', natpf: NATPF, hand: 'left' }) }).then(json);
    assert.equal(sw.swing.hand, 'left');
    const st = await H.win.fetch(`/api/match/state?room=${room.roomId}&role=p1&touch=1`).then(json);
    assert.equal(st.p2.lastSwing.natpf.wrist, -.4); assert.equal(st.p2.lastSwing.hand, 'left');
    // l'host manda lo snapshot, il P2 lo legge
    await H.win.fetch(`/api/match/sync`, { method: 'POST', body: JSON.stringify({ room: room.roomId, snapshot: { phase: 'SERVE_STANCE' } }) });
    const gs = await G.win.fetch(`/api/match/state?room=${room.roomId}&role=p2&touch=1`).then(json);
    assert.equal(gs.snapshot.phase, 'SERVE_STANCE');
    assert.equal(G.calls.length, 0, 'il P2 non chiede nulla al server statico');
    guest.guest.destroy();
  } finally { delete globalThis.location; host.host.destroy(); }
});

test('fetch intercettato: con il server (LAN, npm run dev) resta tutto come prima; ?net=p2p forza la stanza nel browser', async () => {
  const server = async () => new Response(JSON.stringify({ ok: true, roomId: 'AT-SRV1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const S = fakeWindow('https://192.168.1.20:8443/?lan=1', server);
  const p2p = installNatpfP2p({ win: S.win, Peer: fakeNetwork().Peer });
  const room = await S.win.fetch('/api/match/create', { method: 'POST', body: '{}' }).then(json);
  assert.equal(room.roomId, 'AT-SRV1'); assert.equal(p2p.mode, null);
  await S.win.fetch('/api/match/state?room=AT-SRV1');
  assert.deepEqual(S.calls.map(c => c[0]), ['/api/match/create', '/api/match/state?room=AT-SRV1']);
  // pagina HTML al posto del JSON (fallback del sito statico): niente API
  assert.equal(await serverHasMatchApi(new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } })), false);
  assert.equal(await serverHasMatchApi(await server()), true);
  const F = fakeWindow('https://x.example/?net=p2p', server);
  const forced = installNatpfP2p({ win: F.win, Peer: fakeNetwork().Peer });
  const r2 = await F.win.fetch('/api/match/create', { method: 'POST', body: '{}' }).then(json);
  assert.equal(r2.net, 'p2p'); assert.equal(F.calls.length, 0);
  forced.host.destroy();
});

/* ---------- compito 2: il colpo del P2 con i dati del P1 ---------- */
test('P2: _emitSwing manda all’host natpf e mano; l’host li passa a onP2Swing con il tempo passato nel relay', async () => {
  const mc = Object.create(MotionController.prototype);
  Object.assign(mc, { role: 'p2', roomId: 'at-abcd', phoneState: { orientation: { pitch: 0, roll: 0 } }, lastProcessedP2PhoneSeq: 0, _listeners: { swing: [], toss: [] } });
  const sent = [], got = [];
  mc.onP2Swing = s => got.push(s);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, init) => { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); };
  try {
    mc._emitSwing({ source: 'natpf-phone', side: 'forehand', shotType: 'slice', speed: .85, dirX: .1, natpf: NATPF, hand: 'left', role: 'p2' });
    mc._emitSwing({ source: 'mouse', side: 'backhand', speed: 1.2, role: 'p2' });
  } finally { globalThis.fetch = realFetch; }
  assert.deepEqual(sent[0].natpf, NATPF); assert.equal(sent[0].hand, 'left');
  assert.ok(!('natpf' in sent[1]) && !('hand' in sent[1]), 'senza dati NATPF il corpo è quello di prima');
  assert.equal(got[0].natpf.shot, 'drop'); assert.equal(got[0].hand, 'left');
  assert.ok(!('natpf' in got[1]));
  // host: colpo letto dal relay 100 ms dopo l'arrivo → latenza + 0,1 s; orologi incoerenti → latenza del P2
  const swing = { natpf: { aim: 'swing', latency: .05 }, serverTimeMs: 1000 };
  assert.equal(relayedNatpf(swing, 1100).latency, .15);
  assert.equal(relayedNatpf(swing, 5000).latency, .05);
  assert.equal(relayedNatpf({ serverTimeMs: 1 }, 2), null);
  assert.equal(relayedNatpf({ natpf: { aim: 'face' }, serverTimeMs: 1000 }, 1100).latency, undefined);
});

// palla in arrivo al P2 (lato −z), allo sweet spot; Math.random fisso per confrontare i colpi
function p2Strike(evt, { ballX = -.5, oppX = -1 } = {}){
  const realRandom = Math.random; Math.random = () => .5;
  try {
    const e = createHeadlessEngine({ difficulty: 'casual' });
    e.startNewMatch({ showStartBanner: false });
    e.isMultiplayer = true; e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player';
    e.opponent.pos.set(oppX, 0, -11.4); e.opponent.vel.set(0, 0, 0);
    e.ball.pos.set(ballX, 1.0, -10.8); e.ball.vel.set(0, 0, -18);
    const ok = e._attemptP2RallyStrike(evt);
    // altezza massima del volo (fino a quando la palla smette di salire)
    let peak = e.ball.pos.y;
    for (let i = 0; i < 600 && e.ball.vel.y > 0; i++){ e.step(1/120); peak = Math.max(peak, e.ball.pos.y); }
    return { ok, x: e.ball.targetLanding.x, z: e.ball.targetLanding.z, shot: e.ball.shotType, peak };
  } finally { Math.random = realRandom; }
}
const natpfShot = (shot, extra = {}) => ({ source: 'phone', side: 'forehand', shotType: shot === 'drop' ? 'slice' : shot, speed: shot === 'drop' ? .85 : 1.2, dirX: 0,
  natpf: { aim: 'swing', shot, wrist: 0, aimSource: 'twist', power: .5, latency: 0, hand: 'right', ...extra } });

test('P2 con i dati del telefono: palla corta e pallonetto veri, direzione da tempo e polso, mano mancina', () => {
  const drop = p2Strike(natpfShot('drop')), slice = p2Strike({ source: 'phone', side: 'forehand', shotType: 'slice', speed: .85, dirX: 0 });
  assert.ok(drop.ok && slice.ok);
  assert.ok(drop.z > 1.5 && drop.z < 5, `palla corta a ${drop.z} m dalla rete`);
  assert.ok(slice.z > 5.5, `senza natpf resta il tagliato del motore base (${slice.z})`);
  const lob = p2Strike(natpfShot('lob')), baseLob = p2Strike({ source: 'phone', side: 'forehand', shotType: 'lob', speed: 1.2, dirX: 0 });
  assert.equal(lob.shot, 'LOB');
  assert.ok(lob.peak > baseLob.peak + 1, `pallonetto vero ${lob.peak.toFixed(2)} m, prima ${baseLob.peak.toFixed(2)} m`);
  // mano: il dritto del destro (palla alla sua destra, −x per chi guarda verso +z) e il dritto del mancino (palla alla sua
  // sinistra) in posizioni speculari attorno al centro sono speculari → direzione specchiata. Le posizioni contano: il
  // punto neutro del colpo segue la palla (campo aperto, natpf_stroke_outcome.js)
  const right = p2Strike(natpfShot('topspin'), { ballX: -1.5 }), left = p2Strike(natpfShot('topspin', { hand: 'left' }), { ballX: 1.5, oppX: 1 });
  assert.ok(Math.abs(right.x) > .3 && Math.abs(right.x + left.x) < .05, `destro ${right.x}, mancino ${left.x}`);
  // anche con la mano solo nel campo «hand» del colpo
  const leftTop = p2Strike({ ...natpfShot('topspin', { hand: undefined }), hand: 'left' }, { ballX: 1.5, oppX: 1 });
  assert.ok(Math.abs(leftTop.x - left.x) < 1e-6);
  // polso: verso la propria destra (−x per chi guarda verso +z)
  const wristRight = p2Strike(natpfShot('topspin', { wrist: 1 }), { ballX: -1.5 });
  assert.ok(wristRight.x < right.x - 1.5, `polso a destra ${wristRight.x} vs ${right.x}`);
  // senza natpf la mano non cambia nulla
  const plain = { source: 'phone', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: .4 };
  assert.deepEqual(p2Strike(plain), p2Strike({ ...plain, hand: 'left' }));
});
