// Sfida tra due computer senza server (sito statico): relay della partita nel browser dell'host, RPC del Player 2 sulla
// DataConnection, riconnessione, intercettazione di fetch; colpo del P2 con i dati del telefono (natpf, mano) fino
// a _attemptP2RallyStrike. Niente rete: canali e Peer finti in memoria.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalRelay, createRpcClient, serveRpc, createP2pHost, createP2pGuest, installNatpfP2p, peerIdForRoom, isRelayPath, remoteAllowed, serverHasMatchApi, p2pRequested, candidateType, iceSummary, iceBlocked, watchIce, compactMatchState, chunkText, resumeIdFor, COMPACT_SWINGS, OPEN_MAX_MS, isP2Input } from '../src/natpf/natpf_p2p.js';
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
  // come PeerJS con la serializzazione «json»: da 16300 byte in su il messaggio non parte («Message too big for JSON
  // channel», solo un evento di errore)
  send(d){
    if (!this.open) throw new Error('chiuso');
    const text = JSON.stringify(d);
    if (new TextEncoder().encode(text).byteLength >= 16300){ (this.tooBig ||= []).push(text.length); this.emit('error', { type: 'message-too-big' }); return; }
    const o = this.other, copy = JSON.parse(text); setTimeout(() => o.open && o.emit('data', copy), 0);
  }
  // come PeerJS: un canale mai aperto si chiude senza «close» (e l'altro computer non lo sa)
  close(){ if (this.closed) return; this.closed = true; const was = this.open; this.open = false; if (was){ this.emit('close'); this.other?.close(); } }
}
function channelPair(){
  const a = new FakeConn('b'), b = new FakeConn('a'); a.other = b; b.other = a; a.open = b.open = true;
  return [a, b];
}
// rete finta: net.blocked = true → l'host risponde (ICE «checking») ma il canale non si apre mai; 'failed' → poi ICE
// fallisce (PeerJS: errore negotiation-failed); net.silent → l'host è registrato ma non risponde. Candidati di chi
// chiama: uno «host» e uno «srflx» (come con STUN)
class FakePc {
  constructor(){ this.fns = []; }
  addEventListener(ev, fn){ if (ev === 'icecandidate') this.fns.push(fn); }
  fire(c){ for (const fn of this.fns) fn({ candidate: c }); }
}
function fakeNetwork(){
  const peers = new Map(), conns = [], net = { blocked: false, silent: false };
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
      a.peerConnection = new FakePc();
      setTimeout(() => {
        const host = peers.get(id);
        if (!host || host.destroyed){ this.emit('error', { type: 'peer-unavailable' }); return; }
        a.peerConnection.fire({ type: 'host' }); a.peerConnection.fire({ candidate: 'candidate:1 1 udp 1686052607 203.0.113.7 51000 typ srflx raddr 0.0.0.0 rport 0' });
        if (net.silent) return;
        const b = new FakeConn(this.id); a.other = b; b.other = a; conns.push(b);
        b.peerConnection = new FakePc();
        host.emit('connection', b);
        if (net.blocked){
          for (const x of [a, b]) x.emit('iceStateChanged', 'checking');
          // PeerJS: errore, chiusura (senza «close»: il canale non si era aperto), poi lo stato «failed»
          if (net.blocked === 'failed') setTimeout(() => { for (const x of [a, b]){ x.emit('error', { type: 'negotiation-failed' }); x.closed = true; x.emit('iceStateChanged', 'failed'); } }, 5);
          return;
        }
        a.open = b.open = true; b.emit('open'); a.emit('open');
      }, 0);
      return a;
    }
    reconnect(){}
    destroy(){ this.destroyed = true; if (peers.get(this.id) === this) peers.delete(this.id); }
  }
  return { Peer, peers, conns, net };
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

test('ICE: tipo dei candidati, riassunto, canale bloccato se l’altro aveva risposto', () => {
  assert.equal(candidateType({ type: 'relay' }), 'relay');
  assert.equal(candidateType({ candidate: 'candidate:9 1 udp 41885439 198.51.100.4 3478 typ relay raddr 203.0.113.7 rport 51000' }), 'relay');
  assert.equal(candidateType({ candidate: 'qualcosa' }), null); assert.equal(candidateType(null), null);
  const c = new FakeConn('x'); c.peerConnection = new FakePc();
  const info = watchIce(c);
  assert.equal(iceSummary(info), 'new · nessun candidato'); assert.equal(iceBlocked(info), false, 'nessuna risposta: non è la rete');
  c.peerConnection.fire({ type: 'srflx' }); c.peerConnection.fire({ type: 'host' });
  c.emit('iceStateChanged', 'checking');
  assert.equal(iceSummary(info), 'checking · host+srflx'); assert.equal(iceBlocked(info), true);
  const d = new FakeConn('y'), info2 = watchIce(d); d.emit('error', { type: 'negotiation-failed' });
  assert.equal(info2.failed, true); assert.equal(iceBlocked(info2), true);
});

test('rete che blocca il canale diretto: P2 e host lo dicono (non più «Mi collego…» e «In attesa…» per sempre), poi rete libera → collegati', async () => {
  const net = fakeNetwork(), L = createLocalRelay();
  const room = JSON.parse((await L.handle({ method: 'POST', url: '/api/match/create', body: {} })).text);
  const host = createP2pHost({ Peer: net.Peer, roomId: room.roomId, handle: L.handle, openMs: 60, openMaxMs: 120 });
  await host.ready;
  net.net.blocked = true;
  const guest = createP2pGuest({ Peer: net.Peer, roomId: room.roomId, retryMs: [20], openMs: 40, openMaxMs: 80 });
  const hostSeen = [], guestSeen = [];
  host.onStatus(s => hostSeen.push(s)); guest.onStatus(s => guestSeen.push(s));
  await until(() => guest.state.error === 'rete' && host.state.error === 'rete');
  assert.equal(guest.state.status, 'connecting'); assert.equal(host.state.status, 'waiting');
  assert.match(guest.state.detail, /^checking · host\+srflx$/); assert.match(host.state.detail, /^checking/);
  assert.match(p2pStatusText('guest', guest.state.status, guest.state.error), /rete blocca il collegamento diretto.*stessa rete Wi-Fi.*Riprovo da solo/);
  assert.match(p2pStatusText('host', host.state.status, host.state.error), /Il Player 2 ha aperto il link.*rete blocca/);
  // ogni tentativo bloccato si conta (diagnostica), e lo si dice una volta sola per tentativo
  await until(() => guest.state.blocked >= 2 && host.state.blocked >= 2);
  assert.ok(guestSeen.some(s => s.blocked >= 2), 'ogni tentativo arriva a chi ascolta');
  // la rete torna libera (altra rete, stessa Wi-Fi): al tentativo dopo si entra e gli avvisi spariscono
  net.net.blocked = false;
  await until(() => guest.connected && host.state.status === 'connected');
  assert.equal(guest.state.error, null); assert.equal(host.state.error, null);
  assert.equal(guest.state.blocked, 0); assert.equal(host.state.blocked, 0);
  assert.equal(p2pStatusText('guest', 'connected', null), 'Collegato all’host ✓');
  host.destroy(); guest.destroy();
});

test('ICE fallito (PeerJS: negotiation-failed) → «rete» subito, senza aspettare il tempo massimo; host muto → «chiusa»', async () => {
  const net = fakeNetwork(), L = createLocalRelay();
  const room = JSON.parse((await L.handle({ method: 'POST', url: '/api/match/create', body: {} })).text);
  const host = createP2pHost({ Peer: net.Peer, roomId: room.roomId, handle: L.handle, openMs: 60000 });
  await host.ready;
  net.net.blocked = 'failed';
  const guest = createP2pGuest({ Peer: net.Peer, roomId: room.roomId, retryMs: [5000], openMs: 60000 });
  await until(() => guest.state.error === 'rete' && host.state.error === 'rete', 500);
  guest.destroy();
  // host registrato ma che non risponde (scheda ferma): non è la rete; dopo CLOSED_MS «forse ha chiuso la partita»
  net.net.blocked = false; net.net.silent = true;
  let clock = 1000;
  const mute = createP2pGuest({ Peer: net.Peer, roomId: room.roomId, retryMs: [10], openMs: 20, now: () => clock });
  await until(() => mute.state.attempts >= 2);
  assert.equal(mute.state.error, null, 'un tentativo senza risposta non è la rete');
  clock += 30000;
  await until(() => mute.state.error === 'chiusa');
  assert.match(p2pStatusText('guest', mute.state.status, mute.state.error), /forse ha chiuso la partita/);
  mute.destroy(); host.destroy();
});

test('testi degli errori della segnalazione: chiari, con il codice tra parentesi', () => {
  assert.match(p2pStatusText('host', 'error', 'server-error'), /server che mette in contatto i due computer non risponde \(server-error\)/);
  assert.match(p2pStatusText('guest', 'error', 'network'), /riprovo da solo/);
  assert.match(p2pStatusText('guest', 'error', 'browser-incompatible'), /browser aggiornato/);
  assert.match(p2pStatusText('guest', 'error', 'webrtc'), /collegamento diretto si è interrotto \(webrtc\)/);
  assert.match(p2pStatusText('host', 'error', 'unavailable-id'), /altra scheda/);
  assert.match(p2pStatusText('guest', 'error', 'libreria'), /ricarica la pagina/);
  assert.match(p2pStatusText('guest', 'error', 'stanza'), /nuovo link/);
  // «rete» non copre il collegamento riuscito né quello chiuso
  assert.equal(p2pStatusText('host', 'connected', 'rete'), 'Player 2 collegato ✓');
  assert.equal(p2pStatusText('host', 'off', 'rete'), 'Collegamento chiuso');
});

// strada del collegamento tra i due computer (ice-route.js, watchRoute): letta quando il P2 entra, sui due lati, dalla
// RTCPeerConnection della DataConnection; si smette di leggerla quando il collegamento finisce
test('strada del collegamento host ↔ P2: letta all\'ingresso sui due lati (onRoute, route), fermata alla chiusura', async () => {
  const net = fakeNetwork();
  const L = createLocalRelay();
  const room = JSON.parse((await L.handle({ method: 'POST', url: '/api/match/create', body: {} })).text);
  const relay = { locale: 'relay', remoto: 'srflx', protocollo: 'udp', relay: 'tls', rtt: 40, server: 'turns:turn.cloudflare.com:443', nostro: true, turn: true };
  const pcs = [], stops = [];
  const watch = (pc, cb, { timers } = {}) => { pcs.push(pc); assert.ok(timers); cb(relay); const stop = () => stops.push(pc); return stop; };
  const host = createP2pHost({ Peer: net.Peer, roomId: room.roomId, handle: L.handle, watch });
  const hostRoutes = []; host.onRoute(r => hostRoutes.push(r));
  const guest = createP2pGuest({ Peer: net.Peer, roomId: room.roomId, retryMs: [10], watch });
  const guestRoutes = []; guest.onRoute(r => guestRoutes.push(r));
  await until(() => guest.connected && host.state.status === 'connected');
  assert.equal(host.route.relay, 'tls'); assert.equal(guest.route.nostro, true);
  assert.equal(hostRoutes.length, 1); assert.equal(guestRoutes.length, 1);
  assert.equal(pcs.length, 2); assert.ok(pcs.every(pc => pc instanceof FakePc), 'la RTCPeerConnection della DataConnection');
  guest.destroy();
  await until(() => host.state.status !== 'connected');
  assert.equal(host.route, null); assert.equal(guest.route, null);
  assert.ok(stops.length >= 2, 'lettura fermata sui due lati');
  host.destroy();
});

// revisione del 30/10: la strada della sfida (api.route, letta dalla diagnostica all'avvio come sfida.strada) restava
// all'ultima anche dopo l'uscita del P2; ora è quella del lato attivo, che la azzera quando il collegamento finisce
test('sfida: api.route segue il collegamento e si azzera quando il P2 cade', async () => {
  const net = fakeNetwork();
  // RTCPeerConnection finta con una strada (formato di Firefox: coppia selected)
  FakePc.prototype.getStats = async () => [
    { id: 'p', type: 'candidate-pair', selected: true, localCandidateId: 'l', remoteCandidateId: 'r' },
    { id: 'l', type: 'local-candidate', candidateType: 'relay', protocol: 'udp', relayProtocol: 'tls', url: 'turns:turn.cloudflare.com:443' },
    { id: 'r', type: 'remote-candidate', candidateType: 'srflx', protocol: 'udp' },
  ];
  const H = fakeWindow('https://natpf.example/gioco/', staticSite);
  const host = installNatpfP2p({ win: H.win, Peer: net.Peer });
  const routes = []; host.onRoute(r => routes.push(r));
  let guest = null;
  try {
    const room = await H.win.fetch('/api/match/create', { method: 'POST', body: JSON.stringify({ p1Name: 'A' }) }).then(json);
    await until(() => host.status === 'waiting');
    const G = fakeWindow(`https://natpf.example/gioco/?room=${room.roomId}&role=p2&net=p2p`, staticSite);
    guest = installNatpfP2p({ win: G.win, Peer: net.Peer });
    await until(() => guest.status === 'connected' && host.status === 'connected' && host.route && guest.route);
    assert.equal(host.route.relay, 'tls'); assert.equal(guest.route.nostro, true);
    assert.equal(routes.at(-1).modo, 'host');
    guest.guest.destroy();
    await until(() => host.status !== 'connected');
    assert.equal(host.route, null, 'P2 uscito: nessuna strada');
    assert.equal(guest.route, null);
  } finally { delete FakePc.prototype.getStats; guest?.guest?.destroy(); host.host?.destroy(); }
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

// C10 (diagnostiche 142317/142438): l'host legge subito lo stato quando il P2 manda un colpo o un lancio, invece di
// aspettare il giro della lettura (50 ms)
test('host: colpo o lancio del P2 arrivato via RPC → onP2Input (lettura subito); altre richieste e le proprie no', async () => {
  assert.equal(isP2Input({ method: 'POST', url: '/api/racket/swing?room=AT-AB12&role=p2' }, { status: 200 }), true);
  assert.equal(isP2Input({ method: 'post', url: '/api/racket/swing' }, { status: 200 }), true);
  assert.equal(isP2Input({ method: 'POST', url: '/api/racket/swing' }, { status: 404 }), false, 'rifiutato dal relay');
  assert.equal(isP2Input({ method: 'GET', url: '/api/match/state?room=x' }, { status: 200 }), false);
  assert.equal(isP2Input({ method: 'POST', url: '/api/racket/telemetry' }, { status: 200 }), false);
  assert.equal(isP2Input({ method: 'POST', url: '/api/racket/swingx' }, { status: 200 }), false);
  const net = fakeNetwork();
  const H = fakeWindow('https://natpf.example/gioco/', staticSite);
  const host = installNatpfP2p({ win: H.win, Peer: net.Peer });
  const inputs = []; host.onP2Input(i => inputs.push(i));
  const room = await H.win.fetch('/api/match/create', { method: 'POST', body: JSON.stringify({ p1Name: 'A' }) }).then(json);
  await until(() => host.status === 'waiting');
  let guest = null;
  try {
    const G = fakeWindow(`https://natpf.example/gioco/?room=${room.roomId}&role=p2&net=p2p`, staticSite);
    guest = installNatpfP2p({ win: G.win, Peer: net.Peer });
    await until(() => guest.status === 'connected' && host.status === 'connected');
    await G.win.fetch(`/api/match/state?room=${room.roomId}&role=p2&touch=p2`).then(json);
    assert.equal(inputs.length, 0, 'la lettura dello stato del P2 non conta');
    await G.win.fetch(`/api/racket/swing?room=${room.roomId}&role=p2`, { method: 'POST', body: JSON.stringify({ room: room.roomId, role: 'p2', type: 'swing', natpf: NATPF }) }).then(json);
    await G.win.fetch(`/api/racket/swing?room=${room.roomId}&role=p2`, { method: 'POST', body: JSON.stringify({ room: room.roomId, role: 'p2', type: 'toss' }) }).then(json);
    assert.equal(inputs.length, 2, 'colpo e lancio');
    // le richieste dell'host al proprio relay (i colpi del suo telefono passano dal collegamento diretto) non contano
    await H.win.fetch(`/api/racket/swing?room=${room.roomId}&role=p1`, { method: 'POST', body: JSON.stringify({ room: room.roomId, role: 'p1', type: 'swing' }) });
    assert.equal(inputs.length, 2);
  } finally { guest?.guest?.destroy(); host.host.destroy(); }
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
  // webcam (colpi dal movimento): latenza negativa, il colpo vero poco dopo l'evento; l'attesa nel relay si somma
  assert.equal(relayedNatpf({ natpf: { aim: 'swing', latency: -.06 }, serverTimeMs: 1000 }, 1020).latency, -.04);
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

/* ---------- blocco nel secondo game con la versione Cloudflare (diagnosi del 30/10) ---------- */
// Colpo del P2 come lo manda il suo computer (dati NATPF veri: ~1,4 KB a colpo nella risposta di /api/match/state)
const BIG_NATPF = { aim: 'swing', shot: 'topspin', head: .12, v: .5, move: 'h', conf: .8, speed: 3.2, wrist: .12, aimSource: 'face', power: .81, latency: .06, hand: 'right', aimDev: 12.3,
  why: ['dritto', 'salita 0,12 sopra il solito', 'piatto 8° a destra'], prep: { lead: .23, amount: .7 }, prepCapable: true, intent: { shot: 'topspin', conf: .8, power: .7, why: ['a', 'b'] }, peak: 612 };
const SNAP = { phase: 'RALLY', phaseTimer: 1.2, score: { playerPoints: 0, opponentPoints: 0, playerGames: 1, opponentGames: 0, server: 'opponent', deuceSide: true }, ball: { px: 1, py: 1, pz: 1, vx: 0, vy: 0, vz: 0, inPlay: true } };

test('secondo game: dopo tanti colpi del P2 lo stato della partita arriva ancora (prima >16300 byte, scartato da PeerJS)', async () => {
  const L = createLocalRelay();
  const room = JSON.parse((await L.handle({ method: 'POST', url: '/api/match/create', body: {} })).text);
  await L.handle({ method: 'POST', url: `/api/match/sync?room=${room.roomId}`, body: { room: room.roomId, snapshot: SNAP } });
  // un game e mezzo: 30 colpi del P2 e qualche lancio del servizio
  for (let i = 0; i < 30; i++) await L.handle({ method: 'POST', url: `/api/racket/swing?room=${room.roomId}&role=p2`, body: { role: 'p2', type: i % 6 ? 'swing' : 'toss', natpf: BIG_NATPF, hand: 'right' } });
  const full = (await L.handle({ url: `/api/match/state?room=${room.roomId}&role=p2&touch=p2` })).text;
  // dal 31/10 il relay stesso risponde in forma compatta a chi legge come P2 (prima >16300 byte da qui)
  assert.ok(new TextEncoder().encode(full).byteLength < 6000, `lettura del P2 dal relay piccola (${full.length})`);
  assert.ok(!('rackets' in JSON.parse(full)));
  // un relay vecchio (stato intero) passa comunque compattato dall'RPC
  const fat = JSON.parse(full); fat.rackets = { p1: fat.p1, p2: fat.p2 }; fat.p2.swingHistory = Array.from({ length: 15 }, (_, i) => ({ ...fat.p2.lastSwing, seq: 16 + i }));
  const slim = JSON.parse(compactMatchState(JSON.stringify(fat)));
  assert.equal(slim.p2.swingHistory.length, COMPACT_SWINGS); assert.ok(!('rackets' in slim));
  const [guestSide, hostSide] = channelPair();
  serveRpc(hostSide, { roomId: room.roomId, handle: L.handle });
  const rpc = createRpcClient(guestSide, { timeoutMs: 500 });
  const st = JSON.parse((await rpc.request({ url: `/api/match/state?room=${room.roomId}&role=p2&touch=p2` })).text);
  assert.equal(st.snapshot.score.playerGames, 1); assert.equal(st.snapshot.phase, 'RALLY');
  // al P2 gli ultimi colpi (con i dati NATPF), non la copia «rackets»
  assert.equal(st.p2.swingHistory.length, COMPACT_SWINGS); assert.equal(st.p2.lastSwing.seq, 30); assert.equal(st.p2.swingHistory.at(-1).natpf.shot, 'topspin');
  assert.ok(!('rackets' in st));
  assert.equal(hostSide.tooBig, undefined, 'nessun messaggio scartato');
  // risposta comunque grande (altro percorso): a pezzi, ricomposta uguale
  const big = 'x'.repeat(40000) + 'è'.repeat(9000);
  assert.deepEqual(chunkText(big).join(''), big);
  const [g2, h2] = channelPair();
  serveRpc(h2, { roomId: room.roomId, handle: async () => ({ status: 200, text: big }) });
  const r = await createRpcClient(g2, { timeoutMs: 500 }).request({ url: '/api/racket/state' });
  assert.equal(r.text, big); assert.equal(h2.tooBig, undefined);
  // compatto: JSON non valido resta com'è
  assert.equal(compactMatchState('non json'), 'non json');
});

test('P2: «Riconnetti» rifà subito il collegamento; lo stesso P2 (id di ripresa) riprende il posto senza aspettare', async () => {
  const net = fakeNetwork();
  const L = createLocalRelay();
  const room = JSON.parse((await L.handle({ method: 'POST', url: '/api/match/create', body: {} })).text);
  const host = createP2pHost({ Peer: net.Peer, roomId: room.roomId, handle: L.handle });
  await host.ready;
  const store = new Map(), storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const id = resumeIdFor(room.roomId, storage);
  assert.equal(resumeIdFor(room.roomId, storage), id, 'stessa scheda, stesso id');
  assert.notEqual(resumeIdFor('AT-ALTR', storage), id);
  const guest = createP2pGuest({ Peer: net.Peer, roomId: room.roomId, retryMs: [5000], resumeId: id });
  await until(() => guest.connected);
  // collegamento vivo ma da rifare: «Riconnetti» → nuovo canale subito (senza i 5 s dei tentativi)
  const before = net.conns.length;
  assert.equal(guest.reconnect(), true);
  await until(() => guest.connected && net.conns.length > before, 1000);
  assert.equal(host.state.status, 'connected'); assert.equal(host.state.guestId, id);
  // pagina ricaricata (nuovo P2 con lo stesso id) mentre il vecchio collegamento è ancora vivo: entra subito
  const again = createP2pGuest({ Peer: net.Peer, roomId: room.roomId, retryMs: [5000], resumeId: id });
  await until(() => again.connected, 1000);
  // un altro P2 (id diverso) resta fuori
  const other = createP2pGuest({ Peer: net.Peer, roomId: room.roomId, retryMs: [5000], resumeId: 'altro123' });
  await until(() => other.state.error === 'occupata', 1000);
  for (const x of [guest, again, other, host]) x.destroy();
});

test('canale lento (ICE «checking», server di inoltro): il P2 aspetta fino a OPEN_MAX_MS invece di chiudere a openMs', async () => {
  assert.equal(OPEN_MAX_MS, 30000);
  const net = fakeNetwork();
  const L = createLocalRelay();
  const room = JSON.parse((await L.handle({ method: 'POST', url: '/api/match/create', body: {} })).text);
  const host = createP2pHost({ Peer: net.Peer, roomId: room.roomId, handle: L.handle, openMs: 30, openMaxMs: 400 });
  await host.ready;
  net.net.blocked = true;
  const guest = createP2pGuest({ Peer: net.Peer, roomId: room.roomId, retryMs: [5000], openMs: 30, openMaxMs: 400 });
  await tick(150);
  // oltre openMs: il tentativo è ancora aperto (prima era chiuso e dichiarato «rete»)
  assert.equal(guest.state.error, null); assert.equal(net.conns.length, 1);
  assert.equal(host.state.error, null);
  // alla fine del tempo massimo: rete che blocca
  await until(() => guest.state.error === 'rete' && host.state.error === 'rete', 1500);
  for (const x of [guest, host]) x.destroy();
});

test('P2: la lettura dello stato porta hold; una sola lettura alla volta (prima una ogni 50 ms senza aspettare: fino a 80 in coda)', async () => {
  const urls = []; let release;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async url => { urls.push(String(url)); await new Promise(r => { release = r; }); return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  try {
    const mc = Object.create(MotionController.prototype);
    Object.assign(mc, { role: 'p2', roomId: 'AT-AB12', phonePollIntervalMs: 5, phoneState: { connected: false, orientation: {} }, p2PhoneState: { connected: false }, _listeners: { swing: [] }, versusHold: 'scollegato', versusReady: true });
    mc._notifyStatus = () => {}; mc._updatePhoneBadgeUI = () => {};
    mc.startPhonePolling();
    await new Promise(r => setTimeout(r, 120));
    assert.equal(urls.length, 1, `${urls.length} letture in corso`);
    assert.match(urls[0], /touch=p2&ready=1&hold=scollegato/);
    release(); await new Promise(r => setTimeout(r, 40));
    assert.ok(urls.length >= 2, 'finita una, parte la successiva');
    mc.stopPhonePolling(); mc._disposed = true; release();
  } finally { globalThis.fetch = realFetch; }
});

