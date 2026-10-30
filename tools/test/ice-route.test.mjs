// Strada scelta del collegamento diretto (site/js/tennis/ice-route.js): serve a confermare dal vivo se il telefono o
// l'altro computer passano dal TURN (e se è quello nostro di Cloudflare). Statistiche finte come quelle di getStats.
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeSummary, routeKey, watchRoute, validIceServers, mergeIceServers, turnEndpoint, ROUTE_EVERY_MS } from '../../site/js/tennis/ice-route.js';

// Chrome: il trasporto indica la coppia scelta; il candidato locale relay porta l'indirizzo del TURN e il protocollo
const chrome = ({ local = 'relay', remote = 'srflx', relay = 'tls', url = 'turns:turn.cloudflare.com:443?transport=tcp', rtt = 0.0423 } = {}) => new Map([
  ['T01', { id: 'T01', type: 'transport', selectedCandidatePairId: 'CP2' }],
  ['CP1', { id: 'CP1', type: 'candidate-pair', localCandidateId: 'L0', remoteCandidateId: 'R0', nominated: false, state: 'failed' }],
  ['CP2', { id: 'CP2', type: 'candidate-pair', localCandidateId: 'L1', remoteCandidateId: 'R1', nominated: true, state: 'succeeded', currentRoundTripTime: rtt }],
  ['L0', { id: 'L0', type: 'local-candidate', candidateType: 'host', protocol: 'udp' }],
  ['R0', { id: 'R0', type: 'remote-candidate', candidateType: 'host', protocol: 'udp' }],
  ['L1', { id: 'L1', type: 'local-candidate', candidateType: local, protocol: 'udp', ...(local === 'relay' ? { relayProtocol: relay, url } : {}) }],
  ['R1', { id: 'R1', type: 'remote-candidate', candidateType: remote, protocol: 'udp' }],
]);

test('strada: TURN nostro in TLS, con tipi, protocollo e tempo di andata e ritorno', () => {
  const r = routeSummary(chrome());
  assert.deepEqual(r, { locale: 'relay', remoto: 'srflx', protocollo: 'udp', relay: 'tls', rtt: 42, server: 'turns:turn.cloudflare.com:443', nostro: true, turn: true });
  // TURN di PeerJS: non è il nostro
  assert.equal(routeSummary(chrome({ relay: 'udp', url: 'turn:eu-0.turn.peerjs.com:3478' })).nostro, false);
  // strada diretta: niente TURN, «nostro» non ha senso
  const d = routeSummary(chrome({ local: 'srflx', remote: 'prflx' }));
  assert.equal(d.turn, false); assert.equal(d.relay, null); assert.equal(d.nostro, null);
  // solo l'altro lato passa dal TURN: c'è un server di inoltro, ma da qui non si sa quale
  const o = routeSummary(chrome({ local: 'srflx', remote: 'relay' }));
  assert.equal(o.turn, true); assert.equal(o.nostro, null);
});

test('strada: Firefox (selected sulla coppia), coppia nominata come ripiego, niente strada ancora', () => {
  const ff = [
    { id: 'p', type: 'candidate-pair', selected: true, localCandidateId: 'l', remoteCandidateId: 'r' },
    { id: 'l', type: 'local-candidate', candidateType: 'host', protocol: 'udp' },
    { id: 'r', type: 'remote-candidate', candidateType: 'host', protocol: 'udp' },
  ];
  assert.equal(routeSummary(ff).locale, 'host');
  const nominated = chrome(); nominated.delete('T01');
  assert.equal(routeSummary(nominated).locale, 'relay');
  assert.equal(routeSummary([]), null);
  assert.equal(routeSummary(null), null);
  assert.equal(routeSummary([{ id: 't', type: 'transport', selectedCandidatePairId: 'manca' }]), null);
  // il tempo di andata e ritorno non è un cambio di strada
  assert.equal(routeKey(routeSummary(chrome({ rtt: 0.01 }))), routeKey(routeSummary(chrome({ rtt: 0.2 }))));
  assert.notEqual(routeKey(routeSummary(chrome())), routeKey(routeSummary(chrome({ local: 'srflx' }))));
});

test('strada seguita: all\'apertura, poi al massimo ogni 10 s, avvisa solo quando cambia; si ferma a collegamento chiuso', async () => {
  const intervals = [], timeouts = [];
  const timers = { setInterval: (f, ms) => { intervals.push({ f, ms }); return intervals.length; }, clearInterval: id => { if (intervals[id - 1]) intervals[id - 1].off = true; }, setTimeout: (f, ms) => { timeouts.push({ f, ms }); return 100 + timeouts.length; }, clearTimeout(){} };
  let stats = [], calls = 0;
  const pc = { connectionState: 'connected', getStats: async () => { calls++; return stats; } };
  const seen = [];
  const stop = watchRoute(pc, r => seen.push(r), { timers });
  await new Promise(r => setImmediate(r));
  assert.equal(calls, 1, 'subito all\'apertura');
  assert.equal(intervals[0].ms, ROUTE_EVERY_MS);
  assert.equal(seen.length, 0);
  assert.equal(timeouts[0].ms, 1000, 'strada non ancora pronta: riprova dopo 1 s');
  stats = chrome({ local: 'srflx' });
  await timeouts[0].f();
  assert.equal(seen.length, 1); assert.equal(seen[0].locale, 'srflx');
  await intervals[0].f();
  assert.equal(seen.length, 1, 'stessa strada: niente');
  stats = chrome();
  await intervals[0].f();
  assert.equal(seen.length, 2); assert.equal(seen[1].relay, 'tls');
  pc.connectionState = 'closed';
  await intervals[0].f();
  assert.equal(intervals[0].off, true, 'collegamento chiuso: smette');
  stop();
  // senza peerConnection (canali finti, browser vecchi): niente
  assert.equal(typeof watchRoute(null, () => {}), 'function');
});

test('server ICE dal Worker: solo stun/turn/turns, TURN con credenziali, via la porta 53; ordine e doppioni', () => {
  assert.equal(validIceServers(null), null);
  assert.equal(validIceServers({ iceServers: [] }), null);
  assert.deepEqual(validIceServers({ iceServers: [{ urls: 'stun:a:3478' }, { urls: ['turns:b:443?transport=tcp', 'turn:b:53?transport=udp', 'javascript:x'], username: 'u', credential: 'c' }] }),
    [{ urls: ['stun:a:3478'] }, { urls: ['turns:b:443?transport=tcp'], username: 'u', credential: 'c' }]);
  assert.deepEqual(mergeIceServers([{ urls: ['stun:a'] }], [{ urls: ['stun:a', 'stun:b'] }, { urls: ['stun:a'] }]), [{ urls: ['stun:a'] }, { urls: ['stun:b'] }]);
  const loc = { href: 'https://gioco.example/' };
  assert.equal(turnEndpoint({ url: 'https://t.workers.dev/' }, loc), 'https://t.workers.dev/');
  assert.equal(turnEndpoint({ url: 'http://t.workers.dev/' }, loc), null);
  assert.equal(turnEndpoint({ url: 'http://127.0.0.1:8787/' }, loc), 'http://127.0.0.1:8787/');
  assert.equal(turnEndpoint({}, loc), null);
});

test('computer: la strada del collegamento con il telefono arriva come evento «route» e in link.route', async () => {
  class Emitter { constructor(){ this.h = {}; } on(k, f){ (this.h[k] ||= []).push(f); return this; } emit(k, v){ for (const f of this.h[k] || []) f(v); } }
  class FakePeer extends Emitter { constructor(){ super(); this.destroyed = false; FakePeer.last = this; } destroy(){ this.destroyed = true; } }
  globalThis.window = { Peer: FakePeer };
  globalThis.location = { search: '', href: 'https://x.workers.dev/', protocol: 'https:' };
  const { createPhoneLink } = await import('../../site/js/tennis/link.js');
  const link = createPhoneLink(), routes = [];
  link.on('route', r => routes.push(r));
  await link.start();
  try {
    const c = new Emitter();
    Object.assign(c, { peer: 'phone-1', open: true, sent: [], send(m){ this.sent.push(m); }, close(){ this.open = false; this.emit('close'); },
      peerConnection: { connectionState: 'connected', getStats: async () => chrome() } });
    FakePeer.last.emit('connection', c);
    c.emit('data', { t: 'hello', v: 2, k: link.token });
    await new Promise(r => setImmediate(r));
    assert.equal(routes.length, 1);
    assert.equal(link.route.relay, 'tls'); assert.equal(link.route.nostro, true);
    assert.equal(link.stats().route.locale, 'relay');
    c.close();
    assert.equal(link.route, null, 'telefono scollegato: nessuna strada');
  } finally { link.stop(); }
});
