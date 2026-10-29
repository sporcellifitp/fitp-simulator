// Collegamento del telefono via internet (versione Cloudflare, segnalazione del 29/10 sera: il telefono dell'amico,
// un Pixel, ripeteva sempre «Connessione persa»). site/js/tennis/link.js:
//  - il computer chiudeva il collegamento in arrivo se il telefono non diceva «hello» entro 6 s dal primo contatto,
//    cioè anche prima che il canale fosse aperto: con il percorso attraverso un server di inoltro (TURN), più lento,
//    il collegamento non riusciva mai. Ora i 6 s contano dall'apertura del canale, prima c'è tempo fino a 30 s;
//  - strade di rete: oltre a quelle di serie, STUN di Cloudflare e i TURN anche in TCP (reti che bloccano l'UDP);
//  - il telefono dice perché non si collega (server non raggiunto, computer che non risponde, rete che blocca).
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
  assert.deepEqual(peerConfig().config.iceServers.flatMap(s => s.urls), urls);
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
