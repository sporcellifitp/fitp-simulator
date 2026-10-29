// Percorso veloce telefono → computer (link.js, lan-transport.js): le copie del colpo arrivano da due strade e il
// computer ne tiene una sola; il piatto arrivato fuori ordine si scarta; la seconda connessione via internet vale
// solo per il telefono già collegato; in LAN il canale dei sensori porta anche i messaggi JSON veloci.
import test from 'node:test';
import assert from 'node:assert/strict';

class Emitter {
  constructor(){ this.h = {}; }
  on(k, f){ (this.h[k] ||= []).push(f); return this; }
  emit(k, v){ for (const f of this.h[k] || []) f(v); }
}
// connessione finta del computer (stessa forma di quelle della libreria di segnalazione e di LanConnection)
class FakeConn extends Emitter {
  constructor(peer, label){ super(); this.peer = peer; this.label = label; this.open = true; this.sent = []; }
  send(m){ this.sent.push(m); }
  close(){ this.open = false; this.emit('close'); }
}
class FakePeer extends Emitter {
  constructor(){ super(); this.destroyed = false; FakePeer.last = this; setTimeout(() => this.emit('open'), 0); }
  destroy(){ this.destroyed = true; }
}

async function linkWithPhone(){
  globalThis.window = { Peer: FakePeer };
  globalThis.location = { search: '', href: 'http://127.0.0.1/' };
  const { createPhoneLink } = await import('../../site/js/tennis/link.js');
  const link = createPhoneLink(), swings = [], faces = [];
  link.on('swing', s => swings.push(s));
  await link.start();
  const main = new FakeConn('phone-1');
  FakePeer.last.emit('connection', main);
  main.emit('data', { t: 'hello', v: 2, k: link.token });
  assert.equal(main.sent[0]?.t, 'welcome');
  assert.equal(main.sent[0]?.f, 1, 'il benvenuto annuncia il percorso veloce');
  return { link, main, swings, faces };
}
const sw = n => ({ t: 'sw', n, pk: 1000 + n, lat: 30, p: .7, dir: 1, l: 0 });

test('colpo con copie dalle due strade: il computer lo usa una volta sola e conta da dove è arrivato', async () => {
  const { link, main, swings } = await linkWithPhone();
  try {
    // LAN: copie sul canale dei sensori (evento «fast» della connessione) e sul canale affidabile
    main.emit('fast', sw(1)); main.emit('data', sw(1)); main.emit('fast', sw(1)); main.emit('fast', sw(1));
    main.emit('data', sw(2)); main.emit('fast', sw(2));
    assert.equal(swings.length, 2);
    assert.deepEqual(swings.map(s => s.path), ['fast', 'reliable']);
    assert.deepEqual(link.stats().swings, { fast: 1, reliable: 1, dup: 4 });
    // colpi senza numero (tocco sullo schermo): non si scartano
    main.emit('data', { t: 'sw', pk: 2000, lat: 30, p: .5, dir: 0 }); main.emit('data', { t: 'sw', pk: 2001, lat: 30, p: .5, dir: 0 });
    assert.equal(swings.length, 4);
  } finally { link.stop(); }
});

test('una pagina del telefono ricaricata ricomincia i numeri: dopo un nuovo collegamento il colpo 1 vale di nuovo', async () => {
  const { link, main, swings } = await linkWithPhone();
  try {
    main.emit('data', sw(1));
    const again = new FakeConn('phone-2');
    FakePeer.last.emit('connection', again);
    again.emit('data', { t: 'hello', v: 2, r: main.sent[0].r });
    assert.equal(again.sent[0]?.t, 'welcome');
    again.emit('data', sw(1));
    assert.equal(swings.length, 2);
  } finally { link.stop(); }
});

test('piatto sul percorso veloce: quello arrivato dopo uno più recente si scarta', async () => {
  const { link, main } = await linkWithPhone();
  try {
    main.emit('fast', { t: 'fo', k: 500, y: 10, p: 0, r: 0 });
    main.emit('fast', { t: 'fo', k: 480, y: -40, p: 0, r: 0 });
    assert.equal(link.face().yaw, 10);
    main.emit('fast', { t: 'fo', k: 520, y: 12, p: 0, r: 0 });
    assert.equal(link.face().yaw, 12);
    // telefono vecchio, senza istante: si usa come prima
    main.emit('data', { t: 'fo', y: 5, p: 0, r: 0 });
    assert.equal(link.face().yaw, 5);
  } finally { link.stop(); }
});

test('seconda connessione via internet: accettata solo dallo stesso telefono, mai al posto di quella principale', async () => {
  const { link, main, swings } = await linkWithPhone();
  try {
    const stranger = new FakeConn('altro', 'fast-abc');
    FakePeer.last.emit('connection', stranger);
    stranger.emit('data', sw(7));
    assert.equal(swings.length, 0, 'un altro peer non può mandare colpi');
    const fast = new FakeConn('phone-1', 'fast-def');
    FakePeer.last.emit('connection', fast);
    fast.emit('data', sw(7)); fast.emit('data', sw(7)); main.emit('data', sw(7));
    assert.equal(swings.length, 1);
    assert.equal(swings[0].path, 'fast');
    assert.equal(fast.sent.length, 0, 'nessun benvenuto sulla connessione veloce');
    assert.ok(link.connected);
  } finally { link.stop(); }
});

test('LAN: il canale dei sensori porta i JSON veloci e i pacchetti binari; sendFast non accoda oltre il limite', async () => {
  class FakeChannel { constructor(label){ this.label = label; this.readyState = 'open'; this.bufferedAmount = 0; this.out = []; } send(d){ this.out.push(d); } close(){ this.readyState = 'closed'; } }
  globalThis.RTCPeerConnection = class { constructor(){ this.connectionState = 'new'; } createDataChannel(label){ return new FakeChannel(label); } close(){} };
  globalThis.crypto ??= (await import('node:crypto')).webcrypto;
  const { LanConnection } = await import('../../site/js/tennis/lan-transport.js');
  const owner = { connections: new Map(), signal(){} };
  const c = new LanConnection(owner, 'pc', true);
  const fast = [], motion = [], data = [];
  c.on('fast', d => fast.push(d)).on('motion', b => motion.push(b)).on('data', d => data.push(d));
  c.motion.onmessage({ data: JSON.stringify({ t: 'sw', n: 3 }) });
  c.motion.onmessage({ data: new ArrayBuffer(52) });
  c.motion.onmessage({ data: 'non json' });
  c.control.onmessage({ data: JSON.stringify({ t: 'st' }) });
  assert.deepEqual(fast, [{ t: 'sw', n: 3 }]); assert.equal(motion.length, 1); assert.deepEqual(data, [{ t: 'st' }]);
  assert.equal(c.sendFast({ t: 'fo', k: 1 }), true); assert.equal(c.motion.out.at(-1), '{"t":"fo","k":1}');
  c.motion.bufferedAmount = 20000; assert.equal(c.sendFast({ t: 'fo', k: 2 }), false);
  c.motion.readyState = 'closed'; assert.equal(c.sendFast({ t: 'fo', k: 3 }), false);
});

test('diagnostica del collegamento: arrivi al secondo, buco più lungo e grappoli (prima una media mobile che esagerava)', async () => {
  const realNow = performance.now.bind(performance);
  let now = 50000;
  performance.now = () => now;
  const { link, main } = await linkWithPhone();
  try {
    // 60 al secondo regolari, poi un buco di 200 ms, poi 5 messaggi a grappolo (1 ms l'uno dall'altro)
    let k = 0;
    const fo = () => main.emit('data', { t: 'fo', k: ++k, y: 0, p: 0, r: 0 });
    for (let i = 0; i < 30; i++){ fo(); now += 16.7; }
    now += 200; fo();
    for (let i = 0; i < 5; i++){ now += 1; fo(); }
    now += 1000 - (now - 50000) % 1000; fo();                      // secondo chiuso: le misure valgono da qui
    const r = link.stats(now).rates.fo;
    assert.ok(r.hz >= 30 && r.hz <= 40, `arrivi al secondo ${r.hz}`);
    assert.ok(r.gap >= 200 && r.gap < 400, `buco più lungo ${r.gap}`);
    assert.equal(r.bunch, 5);
    // silenzio fino a ora: il buco cresce anche senza arrivi (sensori fermi con il collegamento vivo)
    assert.ok(link.stats(now + 900).rates.fo.gap >= 900);
  } finally { link.stop(); performance.now = realNow; }
});

test('diagnostica dal telefono: gesto scartato con il motivo, segno «qui è successo un problema», telefono e browser', async () => {
  const { link, main } = await linkWithPhone();
  const got = [];
  link.on('discard', d => got.push(['discard', d])).on('mark', d => got.push(['mark', d])).on('device', d => got.push(['device', d]));
  try {
    main.emit('data', { t: 'gx', r: 'in rientro', v: 640, a: null, d: 0, pk: performance.now() - 30 });
    main.emit('data', { t: 'mk', x: 'segno dal telefono' });
    main.emit('data', { t: 'dev', ua: 'Telefono di prova', wl: true, dm: true, or: 'portrait-primary', sc: [412, 915, 3.5], vr: '2026-10-23.2' });
    assert.deepEqual(got.map(g => g[0]), ['discard', 'mark', 'device']);
    assert.equal(got[0][1].why, 'in rientro'); assert.equal(got[0][1].peak, 640); assert.equal(got[0][1].dir, 0);
    assert.equal(got[1][1].text, 'segno dal telefono');
    assert.deepEqual(got[2][1], { ua: 'Telefono di prova', wakeLock: true, motion: true, orientation: 'portrait-primary', screen: [412, 915, 3.5], version: '2026-10-23.2', accSign: null });
  } finally { link.stop(); }
});

// Diagnostica del 29/10 (stesso schermo): il computer non riceveva più il movimento del Player 2 mentre il telefono era
// su «Pronto». Il segnale di ogni secondo del telefono dice da quanto ha l'ultimo campione dei sensori (sa); il computer
// può chiedere al telefono di rifare il collegamento («Ricollega»), e il telefono che si ricollega da sé lo dice (rl)
test('segnale del telefono con l\'età dei sensori; «Ricollega» chiesto al telefono e ricollegamento della stessa pagina', async () => {
  const { link, main } = await linkWithPhone();
  try {
    main.emit('data', { t: 'st', s: 'ready', sa: 34, vis: 1 });
    assert.equal(link.L.sensorAge, 34); assert.ok(Number.isFinite(link.L.beatAt));
    main.emit('data', { t: 'st', s: 'ready' });
    assert.equal(link.L.sensorAge, null, 'telefono di prima: età sconosciuta');
    assert.equal(link.relink(), true);
    assert.deepEqual(main.sent.at(-1), { t: 'cmd', c: 'relink' });
    // il telefono rifà il collegamento con la chiave di ripresa e rl: stessa pagina
    const again = new FakeConn('phone-1b');
    FakePeer.last.emit('connection', again);
    again.emit('data', { t: 'hello', v: 2, r: main.sent[0].r, rl: 1 });
    assert.equal(again.sent[0]?.t, 'welcome');
    assert.equal(link.L.relinked, true); assert.equal(link.L.joins, 2);
    // pagina ricaricata (senza rl)
    const fresh = new FakeConn('phone-1c');
    FakePeer.last.emit('connection', fresh);
    fresh.emit('data', { t: 'hello', v: 2, r: again.sent[0].r });
    assert.equal(link.L.relinked, false);
    fresh.close(); assert.equal(link.relink(), false, 'scollegato: niente da chiedere');
  } finally { link.stop(); }
});
