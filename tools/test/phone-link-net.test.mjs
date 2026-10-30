// Collegamento del telefono via internet (versione Cloudflare, segnalazione del 29/10 sera: il telefono dell'amico,
// un Pixel, ripeteva sempre «Connessione persa»). site/js/tennis/link.js:
//  - il computer chiudeva il collegamento in arrivo se il telefono non diceva «hello» entro 6 s dal primo contatto,
//    cioè anche prima che il canale fosse aperto: con il percorso attraverso un server di inoltro (TURN), più lento,
//    il collegamento non riusciva mai. Ora i 6 s contano dall'apertura del canale, prima c'è tempo fino a 30 s;
//  - strade di rete: oltre a quelle di serie, STUN di Cloudflare e i TURN anche in TCP (reti che bloccano l'UDP);
//  - il telefono dice perché non si collega (server non raggiunto, computer che non risponde, rete che blocca);
//  - TURN di Cloudflare (30/10: il telefono del P2 si collegava solo con la VPN accesa): con /natpf/turn.json nel
//    pacchetto la pagina chiede le credenziali al Worker (ice-route.js, iceReady) e quei server vanno per primi; senza
//    file, con risposte non valide o lente e in LAN restano le strade di prima.
import test from 'node:test';
import assert from 'node:assert/strict';

class Emitter {
  constructor(){ this.h = {}; }
  on(k, f){ (this.h[k] ||= []).push(f); return this; }
  emit(k, v){ for (const f of this.h[k] || []) f(v); }
}
class FakeConn extends Emitter {
  constructor(peer){ super(); this.peer = peer; this.open = false; this.sent = []; this.closed = false; }
  send(m){ this.sent.push(m); }
  close(){ this.open = false; this.closed = true; this.emit('close'); }
}
class FakePeer extends Emitter {
  constructor(id, options){ super(); this.options = options; this.destroyed = false; FakePeer.last = this; }
  destroy(){ this.destroyed = true; }
}

test('strade di rete: STUN di Google e di Cloudflare, TURN in UDP e in TCP, anche con il server di prova', async () => {
  globalThis.location = { search: '', href: 'https://x.workers.dev/', protocol: 'https:' };
  const { peerConfig, ICE_SERVERS } = await import('../../site/js/tennis/link.js');
  const urls = ICE_SERVERS.flatMap(s => s.urls);
  assert.ok(urls.includes('stun:stun.cloudflare.com:3478') && urls.includes('stun:stun.l.google.com:19302'));
  assert.ok(urls.some(u => /^turn:.*transport=tcp$/.test(u)) && urls.some(u => /^turn:[^?]*$/.test(u)));
  // senza TURN nostro (nessuna richiesta fatta) le strade sono esattamente quelle di sempre
  assert.deepEqual(peerConfig().config.iceServers.flatMap(s => s.urls), urls);
  assert.ok(ICE_SERVERS.some(s => s.username === 'peerjs'), 'TURN di PeerJS come riserva');
  globalThis.location = { search: '?peer=127.0.0.1:9000', href: 'http://127.0.0.1/', protocol: 'http:' };
  assert.equal(peerConfig().host, '127.0.0.1'); assert.ok(peerConfig().config.iceServers.length);
});

test('computer: il canale lento (server di inoltro) non si chiude prima di aprirsi; aperto, il telefono ha 6 s per presentarsi', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  globalThis.window = { Peer: FakePeer };
  globalThis.location = { search: '', href: 'https://x.workers.dev/', protocol: 'https:' };
  const { createPhoneLink, LINK_TIMES } = await import('../../site/js/tennis/link.js');
  const link = createPhoneLink();
  await link.start();
  try {
    FakePeer.last.emit('open');
    // primo contatto (offerta arrivata), il canale si apre solo dopo 12 s: prima il computer lo chiudeva a 6 s
    const slow = new FakeConn('phone-1');
    FakePeer.last.emit('connection', slow);
    t.mock.timers.tick(12000);
    assert.equal(slow.closed, false, 'aspetta che il canale si apra');
    slow.open = true; slow.emit('open');
    slow.emit('data', { t: 'hello', v: 2, k: link.token });
    assert.equal(slow.sent[0]?.t, 'welcome');
    // un canale aperto che non si presenta: chiuso dopo 6 s dall'apertura
    const mute = new FakeConn('phone-2');
    FakePeer.last.emit('connection', mute);
    mute.open = true; mute.emit('open');
    t.mock.timers.tick(LINK_TIMES.helloMs - 100);
    assert.equal(mute.closed, false);
    t.mock.timers.tick(200);
    assert.equal(mute.closed, true);
    // uno che non apre mai il canale: chiuso dopo il tempo della negoziazione
    const never = new FakeConn('phone-3');
    FakePeer.last.emit('connection', never);
    t.mock.timers.tick(LINK_TIMES.negotiateMs + 100);
    assert.equal(never.closed, true);
  } finally { link.stop(); }
});

test('telefono: il motivo del collegamento non riuscito', async () => {
  const { netWhy } = await import('../../site/js/tennis/link.js');
  assert.match(netWhy({ signal: false, ice: 'new' }), /non raggiunge il server/);
  assert.match(netWhy({ signal: true, ice: 'new' }), /computer non risponde/);
  for (const ice of ['checking', 'failed', 'disconnected']) assert.match(netWhy({ signal: true, ice }), /stessa rete Wi-Fi.*hotspot.*LAN/);
  assert.equal(netWhy({ signal: true, ice: 'connected' }), null);
  assert.equal(netWhy(null), null);
});

/* ---------- TURN di Cloudflare: /natpf/turn.json e credenziali dal Worker ---------- */
const WORKER = 'https://turn.esempio.workers.dev/';
const CF = { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] }, { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u1', credential: 'c1' }], ttl: 86400 };
const page = (href = 'https://gioco.esempio.workers.dev/') => { const u = new URL(href); return { href: u.href, search: u.search, protocol: u.protocol, hostname: u.hostname, origin: u.origin }; };
const jsonRes = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => (typeof body === 'string' ? JSON.parse(body) : body) });
// server finto: risposte per indirizzo, e l'elenco delle richieste
function fakeFetch(routes){
  const calls = [];
  const fetch = async (url, init) => { calls.push(String(url)); const r = routes[String(url)]; if (typeof r === 'function') return r(init); if (r === undefined) return jsonRes('<!doctype html>', 404); return r; };
  return { fetch, calls };
}
async function iceModule(){ const m = await import('../../site/js/tennis/ice-route.js'); m.forgetIceServers(); return m; }

test('TURN: senza /natpf/turn.json nessun server nostro, strade di oggi, e non si richiede più', async () => {
  const { iceReady, ourIceServers } = await iceModule();
  const net = fakeFetch({});
  assert.deepEqual(await iceReady({ fetch: net.fetch, loc: page(), secure: true }), []);
  assert.deepEqual(await iceReady({ fetch: net.fetch, loc: page(), secure: true }), []);
  assert.deepEqual(ourIceServers(), []);
  assert.deepEqual(net.calls, ['https://gioco.esempio.workers.dev/natpf/turn.json'], 'una sola richiesta per pagina');
  // il sito che risponde con la sua pagina HTML al posto del file (fallback delle single page app): come assente
  const { iceReady: again, ourIceServers: ours, forgetIceServers } = await iceModule();
  const html = fakeFetch({ 'https://gioco.esempio.workers.dev/natpf/turn.json': { ok: true, status: 200, json: async () => { throw new SyntaxError('html'); } } });
  await again({ fetch: html.fetch, loc: page(), secure: true });
  assert.deepEqual(ours(), []); assert.equal(html.calls.length, 1);
  forgetIceServers();
});

test('TURN: configurazione e risposta valide → server di Cloudflare per primi (senza porta 53), poi quelli di sempre', async () => {
  const { iceReady, forgetIceServers } = await iceModule();
  const net = fakeFetch({ 'https://gioco.esempio.workers.dev/natpf/turn.json': jsonRes({ url: WORKER }), [WORKER]: jsonRes(CF) });
  globalThis.location = page();
  const { peerConfig, ICE_SERVERS } = await import('../../site/js/tennis/link.js');
  const got = await iceReady({ fetch: net.fetch, loc: page(), secure: true });
  assert.deepEqual(net.calls, ['https://gioco.esempio.workers.dev/natpf/turn.json', WORKER]);
  assert.equal(got.length, 2);
  const ice = peerConfig().config.iceServers, urls = ice.flatMap(s => s.urls);
  assert.equal(urls[0], 'stun:stun.cloudflare.com:3478');
  assert.deepEqual(ice[1], { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u1', credential: 'c1' });
  assert.ok(!urls.some(u => /:53\b/.test(u)), 'niente porta 53');
  // riserva: tutti quelli di prima ancora presenti, una volta sola (lo STUN di Cloudflare non si ripete)
  for (const u of ICE_SERVERS.flatMap(s => s.urls)) assert.equal(urls.filter(x => x === u).length, 1, u);
  assert.ok(urls.indexOf('turns:turn.cloudflare.com:443?transport=tcp') < urls.indexOf('turn:eu-0.turn.peerjs.com:3478'));
  // seconda richiesta della pagina: niente rete
  await iceReady({ fetch: net.fetch, loc: page(), secure: true });
  assert.equal(net.calls.length, 2);
  forgetIceServers();
  assert.deepEqual(peerConfig().config.iceServers.flatMap(s => s.urls), ICE_SERVERS.flatMap(s => s.urls));
});

test('TURN: risposta HTML, non valida, errore o lenta → strade di oggi, senza aspettare oltre il tempo massimo', async () => {
  const { iceReady, ourIceServers, forgetIceServers, fetchIceServers } = await iceModule();
  const conf = { 'https://gioco.esempio.workers.dev/natpf/turn.json': jsonRes({ url: WORKER }) };
  const bad = [
    { ok: true, status: 200, json: async () => { throw new SyntaxError('<html>'); } },
    jsonRes({ iceServers: 'turn:x' }),
    jsonRes({ iceServers: [{ urls: ['http://evil/'] }, { urls: 'turn:t.example:3478' }] }),       // TURN senza credenziali
    jsonRes({ ok: false, error: 'variabili' }, 500),
    () => { throw new TypeError('rete'); },
  ];
  for (const r of bad){
    forgetIceServers();
    const net = fakeFetch({ ...conf, [WORKER]: r });
    await iceReady({ fetch: net.fetch, loc: page(), secure: true });
    assert.deepEqual(ourIceServers(), []);
  }
  // configurazione che non è https: nessuna richiesta al Worker
  forgetIceServers();
  const plain = fakeFetch({ 'https://gioco.esempio.workers.dev/natpf/turn.json': jsonRes({ url: 'http://turn.esempio.it/' }) });
  await iceReady({ fetch: plain.fetch, loc: page(), secure: true });
  assert.equal(plain.calls.length, 1);
  // Worker che non risponde: a ICE_WAIT_MS si va avanti (orologio finto)
  forgetIceServers();
  let fire = null;
  const timers = { setTimeout: (f, ms) => { fire = { f, ms }; return 1; }, clearTimeout(){} };
  const slow = fakeFetch({ ...conf, [WORKER]: () => new Promise(() => {}) });
  const p = fetchIceServers({ fetch: slow.fetch, loc: page(), timers });
  await new Promise(r => setImmediate(r));
  assert.equal(fire.ms, 2500);
  fire.f();
  const r = await p;
  assert.equal(r.servers, null); assert.equal(r.why, 'tempo scaduto');
  forgetIceServers();
});

test('TURN: credenziali arrivate dopo il tempo massimo → il Peer già creato le usa per i collegamenti successivi', async () => {
  const { iceReady, ourIceServers, forgetIceServers } = await iceModule();
  globalThis.location = page();
  const { peerConfig } = await import('../../site/js/tennis/link.js');
  let answer = null, fire = null;
  const timers = { setTimeout: (f, ms) => { if (ms === 2500) fire = f; return 1; }, clearTimeout(){} };
  const net = fakeFetch({ 'https://gioco.esempio.workers.dev/natpf/turn.json': jsonRes({ url: WORKER }), [WORKER]: () => new Promise(r => { answer = r; }) });
  const p = iceReady({ fetch: net.fetch, loc: page(), secure: true, timers });
  await new Promise(r => setImmediate(r));
  fire();                                                   // 2,5 s senza risposta: si va avanti senza
  assert.deepEqual(await p, []);
  const opts = peerConfig();                                // Peer creato con le strade di sempre
  assert.ok(!opts.config.iceServers.some(s => s.username === 'u1'));
  answer(jsonRes(CF));                                      // la risposta arriva dopo
  await new Promise(r => setTimeout(r, 0));
  assert.equal(ourIceServers().length, 2);
  // PeerJS legge options.config a ogni nuova connessione: la stessa configurazione ora ha i server di Cloudflare per primi
  assert.equal(opts.config.iceServers[1].username, 'u1');
  assert.equal(opts.config.iceServers.at(-1).username, 'peerjs', 'riserva di PeerJS ancora in fondo');
  assert.deepEqual(await iceReady({ fetch: net.fetch, loc: page(), secure: true }), ourIceServers(), 'senza altre richieste');
  assert.equal(net.calls.length, 2);
  forgetIceServers();
});

test('TURN: in LAN, con il server di prova, da http in rete locale o da file nessuna richiesta', async () => {
  const { iceReady, iceAllowed, forgetIceServers } = await iceModule();
  for (const href of ['https://192.168.1.5:5443/?lan=1', 'https://gioco.esempio.workers.dev/?peer=127.0.0.1:9000', 'http://192.168.1.5:3000/', 'file:///C:/gioco/index.html']){
    forgetIceServers();
    const net = fakeFetch({});
    assert.equal(await iceReady({ fetch: net.fetch, loc: page(href), secure: true }), null, href);
    assert.equal(net.calls.length, 0, href);
  }
  // fuori da un contesto sicuro (e in node, dove isSecureContext non c'è) niente richieste
  assert.equal(iceAllowed(page(), false), false);
  assert.equal(iceAllowed(page(), undefined), false);
  assert.equal(iceAllowed(page('http://localhost:3000/'), true), true);
  forgetIceServers();
});

test('TURN: il computer crea il Peer con i server ottenuti; se la richiesta fallisce lo crea lo stesso', async () => {
  globalThis.window = { Peer: FakePeer };
  globalThis.location = page();
  globalThis.isSecureContext = true;
  const saved = globalThis.fetch;
  try {
    const { forgetIceServers } = await iceModule();
    globalThis.fetch = fakeFetch({ 'https://gioco.esempio.workers.dev/natpf/turn.json': jsonRes({ url: WORKER }), [WORKER]: jsonRes(CF) }).fetch;
    const { createPhoneLink } = await import('../../site/js/tennis/link.js');
    let link = createPhoneLink();
    await link.start();
    assert.equal(FakePeer.last.options.config.iceServers[1].username, 'u1');
    link.stop();
    forgetIceServers();
    globalThis.fetch = async () => { throw new TypeError('rete'); };
    link = createPhoneLink();
    await link.start();
    assert.ok(FakePeer.last && !FakePeer.last.options.config.iceServers.some(s => s.username === 'u1'));
    assert.equal(link.L.state, 'starting', 'Peer creato, in attesa della registrazione');
    link.stop();
    forgetIceServers();
  } finally { globalThis.fetch = saved; delete globalThis.isSecureContext; }
});

// Revisione del 30/10: il computer crea il Peer per il telefono una volta sola e la pagina (chiosco, ledwall) può
// restare aperta per giorni. Prima run() usciva prima di iceReady se il Peer c'era già e nessuno richiedeva più le
// credenziali: dopo 24 h la configurazione del Peer teneva username e credential scaduti e i telefoni nuovi, su reti
// che bloccano la 3478, non si collegavano più. Ora si rinnovano a ogni start() e nel controllo di ogni secondo; scadute
// e non rinnovabili, nella configurazione restano solo le strade di base
test('TURN: computer acceso per giorni → credenziali rinnovate sul Peer già creato, scadute tolte', async () => {
  const realNow = Date.now, realSetInterval = globalThis.setInterval, realClearInterval = globalThis.clearInterval, saved = globalThis.fetch;
  let clock = realNow(), worker = 'u1', failing = false;
  const ticks = [];
  Date.now = () => clock;
  globalThis.window = { Peer: FakePeer };
  globalThis.location = page();
  globalThis.isSecureContext = true;
  globalThis.setInterval = (f, ms) => { ticks.push(f); return realSetInterval(() => {}, 1e9); };
  globalThis.clearInterval = id => realClearInterval(id);
  const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };
  const net = fakeFetch({
    'https://gioco.esempio.workers.dev/natpf/turn.json': jsonRes({ url: WORKER }),
    [WORKER]: () => { if (failing) throw new TypeError('rete'); return jsonRes({ ...CF, iceServers: CF.iceServers.map(s => s.username ? { ...s, username: worker, credential: 'c-' + worker } : s) }); },
  });
  globalThis.fetch = net.fetch;
  const { forgetIceServers } = await iceModule();
  const { createPhoneLink, ICE_SERVERS } = await import('../../site/js/tennis/link.js');
  const link = createPhoneLink();
  try {
    await link.start();
    const peer = FakePeer.last, config = peer.options.config;
    assert.equal(config.iceServers[1].username, 'u1');
    // 13 h dopo (oltre metà della durata di 24 h): start() di nuovo (natpf_phone_racket lo richiama), stesso Peer
    clock += 13*3600e3; worker = 'u2';
    await link.start();
    await flush();
    assert.equal(FakePeer.last, peer, 'nessun Peer nuovo');
    assert.equal(config.iceServers[1].username, 'u2', 'credenziali nuove nella configurazione del Peer già creato');
    // altre 13 h: basta il controllo di ogni secondo, senza start()
    clock += 13*3600e3; worker = 'u3';
    ticks.at(-1)();
    await flush();
    assert.equal(config.iceServers[1].username, 'u3');
    // il Worker non risponde più: dopo la scadenza (24 h dall'ultima risposta) via le credenziali, restano le strade di base
    failing = true;
    clock += 25*3600e3;
    ticks.at(-1)();
    await flush();
    assert.ok(!config.iceServers.some(s => /^u\d$/.test(s.username || '')), 'niente credenziali scadute');
    assert.deepEqual(config.iceServers.flatMap(s => s.urls), ICE_SERVERS.flatMap(s => s.urls));
    // il controllo di ogni secondo non chiede a ogni giro: in cache fino al riprova di un minuto
    const calls = net.calls.length;
    for (let i = 0; i < 5; i++){ clock += 1000; ticks.at(-1)(); }
    await flush();
    assert.equal(net.calls.length, calls);
  } finally {
    link.stop(); forgetIceServers();
    Date.now = realNow; globalThis.setInterval = realSetInterval; globalThis.clearInterval = realClearInterval; globalThis.fetch = saved;
    delete globalThis.isSecureContext;
  }
});

test('TURN: risposta lenta che dice «nessuna configurazione» → non si richiede più (prima ogni minuto)', async () => {
  const realNow = Date.now;
  let clock = realNow(), answer = null, fire = null;
  Date.now = () => clock;
  try {
    const { iceReady, forgetIceServers } = await iceModule();
    const timers = { setTimeout: (f, ms) => { if (ms === 2500) fire = f; return 1; }, clearTimeout(){} };
    const net = fakeFetch({ 'https://gioco.esempio.workers.dev/natpf/turn.json': () => new Promise(r => { answer = r; }) });
    const p = iceReady({ fetch: net.fetch, loc: page(), secure: true, timers });
    await new Promise(r => setImmediate(r));
    fire();
    assert.deepEqual(await p, []);
    answer(jsonRes('<!doctype html>', 404));                  // il pacchetto non ha turn.json
    await new Promise(r => setTimeout(r, 0));
    clock += 5*60e3;
    iceReady({ fetch: net.fetch, loc: page(), secure: true, timers });   // senza aspettare: conta solo se richiede
    await new Promise(r => setImmediate(r));
    assert.equal(net.calls.length, 1, 'una sola richiesta per pagina');
    forgetIceServers();
  } finally { Date.now = realNow; }
});

// telefono (racchetta.js, connect): libreria PeerJS e credenziali TURN insieme, non una dopo l'altra: i 2,5 s
// dell'attesa delle credenziali non si sommano al caricamento della libreria dentro i 12 s del tentativo
test('telefono: loadPeer e iceReady partono insieme', async () => {
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const { LINK_TIMES: T, netWhy: why } = await import('../../site/js/tennis/link.js');
  const source = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
  const section = source.slice(source.indexOf('async function connect(){'), source.indexOf('// messaggi che valgono solo se arrivano subito'));
  let lib = null, iceCalls = 0;
  const peers = [];
  class P extends Emitter { constructor(o){ super(); this.o = o; this.destroyed = false; peers.push(this); } destroy(){ this.destroyed = true; } }
  const sandbox = { LanPeer: P, isLanMode: () => false, loadPeer: () => new Promise(r => { lib = r; }), iceReady: () => { iceCalls++; return new Promise(() => {}); },
    peerConfig: () => ({}), LINK_TIMES: T, netWhy: why, performance: { now: () => 0 }, ss: { get(){}, set(){}, del(){} },
    setTimeout: () => 0, clearTimeout(){}, paint(){}, bar(){}, ui(){}, show(){}, closeFast(){}, openFast(){}, sendState(){}, sendDevice(){} };
  vm.createContext(sandbox);
  vm.runInContext("let peer=null,conn=null,pendingConn=null,connectEpoch=0,retryT=null,tries=0,linkState='off',pair={session:'game',token:'token'},lastRx=0,fastOk=false,sensor='ready',rtt=80;\n" + section + "\nglobalThis.api={connect};", sandbox);
  sandbox.api.connect();
  await new Promise(r => setImmediate(r));
  assert.ok(lib, 'libreria richiesta');
  assert.equal(iceCalls, 1, 'credenziali richieste senza aspettare la libreria');
  assert.equal(peers.length, 0);
});
