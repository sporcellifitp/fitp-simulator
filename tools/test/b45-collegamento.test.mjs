// B45.1 «telefono che non si scollega» (14/11) · regole del collegamento telefono–computer (site/js/tennis/link-life.js) e
// il loro uso nel collegamento vero: controllo di vita a 10 s con ogni messaggio come segno di vita e il lato fermo che
// prima legge la coda (link.js, computer), tentativi senza fine in LAN e ripartenza subito sulla rete che torna o cambia
// (racchetta.js, telefono), racconto della caduta nel messaggio «dev» e parola breve «cl» prima di chiudere.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { LIFE, lifeCheck, RETRY, retryPlan, lostText, kickNow, netTypeChanged, storyWord, createDropStory, readStory, STORY_WORDS, CLOSE_WORDS } from '../../site/js/tennis/link-life.js';
import { LINK_TIMES, netWhy } from '../../site/js/tennis/link.js';

/* ---------- funzioni pure ---------- */

test('controllo di vita: caduta solo dopo 10 s di silenzio vero; il lato rimasto fermo prima legge la coda', () => {
  assert.deepEqual([LIFE.silentMs, LIFE.lateMs, LIFE.tickMs], [10000, 2500, 1000]);
  // buchi di 3, 5, 7 e 9,9 s: niente (prima, da 5 s, si cadeva sempre)
  for (const s of [3000, 5000, 7000, 9900]) assert.equal(lifeCheck({ now: 100000, lastSeen: 100000 - s, prevTick: 99000 }).drop, false, `${s} ms`);
  assert.equal(lifeCheck({ now: 100000, lastSeen: 89000, prevTick: 99000 }).drop, true, '11 s: caduta');
  // controllo in ritardo (pagina ferma 12 s): per quel giro non si giudica, anche con 12 s di silenzio apparente
  const late = lifeCheck({ now: 100000, lastSeen: 88000, prevTick: 87000 });
  assert.equal(late.drop, false); assert.equal(late.late, 12000);
  // al giro dopo (la coda è stata letta: lastSeen nuovo) niente caduta; se invece il silenzio è vero, cade
  assert.equal(lifeCheck({ now: 101000, lastSeen: 100500, prevTick: 100000 }).drop, false);
  assert.equal(lifeCheck({ now: 101000, lastSeen: 88000, prevTick: 100000 }).drop, true);
  // un ritardo piccolo (carico della macchina) non ferma il controllo
  assert.equal(lifeCheck({ now: 100000, lastSeen: 89000, prevTick: 97000 }).drop, true, 'ritardo di 2 s: si giudica');
  assert.equal(lifeCheck({ now: 100000, lastSeen: 89000 }).drop, true, 'primo controllo');
});

test('tentativi del telefono: senza fine in LAN e per il telefono dello stand, 10 via internet; attesa fino a 6 s; testo vero', () => {
  assert.deepEqual([0, 1, 2, 5, 9, 30].map(t => retryPlan({ tries: t, lan: true }).waitMs), [1000, 2000, 3000, 6000, 6000, 6000]);
  assert.equal(retryPlan({ tries: 500, lan: true }).again, true, 'LAN: sempre');
  assert.equal(retryPlan({ tries: 500, stand: true }).again, true, 'stand: sempre');
  assert.equal(retryPlan({ tries: 9 }).again, true); assert.equal(retryPlan({ tries: RETRY.tries }).again, false, 'internet: dopo 10 basta');
  assert.equal(retryPlan({ tries: 10 }).waitMs, null);
  assert.equal(lostText(null, true), 'Riprovo da solo tra poco.');
  assert.equal(lostText('Il computer non risponde.', false), 'Il computer non risponde. Tocca «Riprova».');
});

test('rete tornata o cambiata: subito un tentativo solo fuori da «collegato» e mai a canale aperto (prova della chiave dello stand)', () => {
  assert.equal(kickNow({ linkState: 'lost' }), true);
  assert.equal(kickNow({ linkState: 'lost', hidden: true }), false, 'pagina nascosta: al ritorno');
  assert.equal(kickNow({ linkState: 'connecting' }), false, 'tentativo in corso: ha il suo tempo (mai troncato)');
  assert.equal(kickNow({ linkState: 'connecting', channel: true }), false, 'benvenuto o prova HMAC in corso');
  assert.equal(kickNow({ linkState: 'on' }), false, 'collegato: decide il controllo di vita');
  assert.equal(kickNow({ linkState: 'denied' }), false);
  // solo il tipo di rete conta (Chrome su Android), non le stime
  assert.equal(netTypeChanged('wifi', 'cellular'), true);
  assert.equal(netTypeChanged('wifi', 'wifi'), false);
  assert.equal(netTypeChanged(undefined, 'wifi'), false, 'tipo non noto prima: niente');
  assert.equal(netTypeChanged(undefined, undefined), false, 'browser senza tipo (iPhone, computer)');
});

test('racconto della caduta: parola del telefono, una volta sola nel «dev», letto dal computer solo con i campi previsti', () => {
  const now = 50000;
  assert.equal(storyWord('silenzio', { now }), 'silenzio');
  assert.equal(storyWord('silenzio', { now, netAt: now - 4000 }), 'rete', 'rete cambiata 4 s prima');
  assert.equal(storyWord('silenzio', { now, netAt: now - 40000 }), 'silenzio', 'troppo prima: non è quello');
  assert.equal(storyWord('silenzio', { now, hidden: true }), 'nascosta');
  assert.equal(storyWord('chiuso', { now, hiddenAt: now - 20000, visibleAt: now - 2000, netAt: now - 1000 }), 'nascosta', 'schermo riacceso: prima lo schermo');
  assert.equal(storyWord('pagina', { now, hidden: true }), 'pagina');
  assert.equal(storyWord('ricollega', { now }), 'ricollega');
  assert.equal(storyWord('boh', { now }), 'chiuso');
  const mem = new Map(), store = { get: k => mem.get(k), set: (k, v) => mem.set(k, v) };
  let t = 1000; const S = createDropStory({ store, now: () => t });
  assert.equal(S.tell(), null, 'niente da raccontare');
  S.drop('silenzio', { tipo: 'wifi' }); t = 4000; S.attempt(false); S.attempt(true);
  const told = S.tell();
  assert.deepEqual(told, { w: 'silenzio', ms: 3000, prove: 2, fallite: 1, tipo: 'wifi' });
  assert.equal(S.tell(), null, 'una volta sola');
  // la pagina del telefono ricaricata: il racconto resta nella scheda
  S.drop('pagina'); const again = createDropStory({ store, now: () => 9000 });
  assert.equal(again.tell().w, 'pagina');
  // il computer legge solo parole e numeri previsti
  assert.deepEqual(readStory({ w: 'rete', ms: 1234.6, prove: 3, fallite: 2, tipo: 'cellular', rete: 1, ip: '10.0.0.2' }), { w: 'rete', ms: 1235, prove: 3, fallite: 2, tipo: 'cellular', rete: 1 });
  assert.equal(readStory({ w: 'boh' }), null); assert.equal(readStory(null), null);
  assert.equal(readStory({ w: 'chiuso', tipo: 'wifi 192.168.1.1' }).tipo, undefined, 'niente indirizzi');
  assert.ok(STORY_WORDS.length && CLOSE_WORDS.includes('ricollega'));
});

/* ---------- il collegamento vero del telefono (pezzo di racchetta.js, come phone-reconnect.test.mjs) ---------- */
const source = readFileSync(process.env.NATPF_PHONE_SOURCE || new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('async function connect(){'), source.indexOf('// messaggi che valgono solo se arrivano subito'));
function setup({ lan = true, normal = true } = {}){
  const timers = new Map(), peers = [], texts = []; let seq = 0;
  class Emitter { constructor(){ this.handlers = {}; } on(k, f){ (this.handlers[k] ||= []).push(f); } emit(k, v){ for (const f of this.handlers[k] || []) f(v); } }
  class Conn extends Emitter { constructor(){ super(); this.open = true; this.sent = []; } send(d){ this.sent.push(d); } close(){ this.open = false; this.emit('close'); } }
  class Peer extends Emitter {
    constructor(){ super(); this.destroyed = false; this.connections = []; peers.push(this); }
    connect(){ const c = new Conn(); this.connections.push(c); return c; }
    destroy(){ this.destroyed = true; for (const c of this.connections) c.close(); }
    reconnect(){ this.emit('open'); }
  }
  const store = new Map([['resume', 'key']]), drops = [], attempts = [];
  let clock = 100;
  const sandbox = { LanPeer: Peer, isLanMode: () => lan, loadPeer: async () => Peer, iceReady: async () => null, peerConfig: () => ({}), LINK_TIMES, netWhy, retryPlan, lostText,
    performance: { now: () => clock },
    story: { drop: w => drops.push(w), attempt: ok => attempts.push(ok), tell: () => null },
    ss: { get: k => store.get(k), set: (k, v) => store.set(k, v), del: k => store.delete(k) },
    setTimeout: (f, ms) => { timers.set(++seq, { f, ms }); return seq; }, clearTimeout: id => timers.delete(id),
    paint(){}, bar(){}, ui: (big, sub) => texts.push([big, sub]), show(){}, closeFast(){}, openFast(){}, sendState(){}, sendDevice(){} };
  vm.createContext(sandbox);
  vm.runInContext(`let peer=null,conn=null,pendingConn=null,connectEpoch=0,retryT=null,tries=0,linkState='off',pair=${normal ? "{session:'game',token:'token'}" : "{session:'s',stand:true}"},lastRx=0,fastOk=false,sensor='ready',rtt=80;\n` + section + "\nglobalThis.api={connect,lost,relink,get state(){return linkState},get conn(){return conn},get lastRx(){return lastRx},get tries(){return tries}};", sandbox);
  const connect = async () => { await sandbox.api.connect(); const p = peers.at(-1); p.emit('open'); const c = p.connections.at(-1); c.emit('open'); c.emit('data', { t: 'welcome', r: 'key', f: 1 }); return { p, c }; };
  return { api: sandbox.api, peers, timers, texts, connect, drops, attempts, tick: ms => { clock += ms; } };
}

test('racchetta col QR in LAN: riprova senza fine (prima si fermava a 10 dicendo ancora «Riprovo da solo»)', async () => {
  const h = setup({ lan: true });
  for (let i = 0; i < 25; i++){
    await h.api.connect(); h.peers.at(-1).emit('error', { type: 'network' });
    assert.equal(h.api.state, 'lost', `giro ${i}`);
    const waits = [...h.timers.values()].map(t => t.ms).filter(ms => ms !== LINK_TIMES.phoneMs);
    assert.ok(waits.some(ms => ms >= 1000 && ms <= 6000), `nuovo tentativo al giro ${i + 1} (${waits})`);
    for (const id of [...h.timers.keys()]) h.timers.delete(id);
  }
  assert.ok(h.texts.every(([, sub]) => !/Tocca «Riprova»/.test(sub || '')), 'mai «Tocca «Riprova»» in LAN');
  assert.match(h.texts.at(-1)[1], /Riprovo da solo/);
  // via internet: 10 tentativi, poi lo dice
  const k = setup({ lan: false }); let scheduled = 0;
  for (let i = 0; i < 12; i++){
    await k.api.connect(); k.peers.at(-1).emit('error', { type: 'network' });
    if ([...k.timers.values()].some(t => t.ms >= 1000 && t.ms <= 6000 && t.ms !== LINK_TIMES.phoneMs)) scheduled++;
    for (const id of [...k.timers.keys()]) k.timers.delete(id);
  }
  assert.equal(scheduled, 10);
  assert.match(k.texts.at(-1)[1], /Tocca «Riprova»/, 'il testo non promette un tentativo che non arriva');
});

test('il telefono tiene il racconto solo per le cadute di un collegamento che andava, con il motivo; «Ricollega» lo dice prima di chiudere', async () => {
  const h = setup();
  const { c } = await h.connect();
  // tentativi non riusciti: non sono cadute
  h.api.lost('silenzio');
  assert.deepEqual(h.drops, ['silenzio']);
  await h.api.connect(); h.peers.at(-1).emit('error', { type: 'network' });
  assert.deepEqual(h.drops, ['silenzio'], 'un tentativo non riuscito non è una caduta');
  assert.deepEqual(h.attempts, [true, false], 'ma si conta tra i tentativi (il primo è il benvenuto riuscito)');
  // «Ricollega»: la parola breve sul canale di prima, poi canali nuovi
  const again = await h.connect();
  h.api.relink();
  assert.equal(JSON.stringify(again.c.sent.at(-1)), JSON.stringify({ t: 'cl', w: 'ricollega' }));   // (oggetto della sandbox)
  assert.ok(h.drops.includes('ricollega'));
  void c;
});

test('ogni messaggio del computer vale come segno di vita per il telefono, anche sul canale veloce (battito «hb»)', async () => {
  const h = setup();
  const { c } = await h.connect();
  const t0 = h.api.lastRx; h.tick(4000);
  c.emit('fast', { t: 'hb' });
  assert.ok(h.api.lastRx > t0, 'canale veloce: segno di vita');
});

/* ---------- il computer (link.js) con un telefono finto ---------- */
class Emitter2 { constructor(){ this.h = {}; } on(k, f){ (this.h[k] ||= []).push(f); return this; } emit(k, v){ for (const f of this.h[k] || []) f(v); } }
class FakeConn extends Emitter2 { constructor(peer, label){ super(); this.peer = peer; this.label = label; this.open = true; this.sent = []; this.fast = []; } send(m){ this.sent.push(m); } sendFast(m){ this.fast.push(m); return true; } close(){ this.open = false; this.emit('close'); } }
class FakePeer extends Emitter2 { constructor(){ super(); this.destroyed = false; FakePeer.last = this; setTimeout(() => this.emit('open'), 0); } destroy(){ this.destroyed = true; } }
// computer con il controllo di ogni secondo in mano alla prova (tick) e l'orologio finto (Date.now)
async function computer(){
  globalThis.window = { Peer: FakePeer };
  globalThis.location = { search: '', href: 'http://127.0.0.1/' };
  const realInterval = globalThis.setInterval, realDate = Date.now;
  let tick = null, now = 1e6;
  globalThis.setInterval = (f, ms) => { if (ms === LIFE.tickMs) tick = f; return { unref(){} }; };
  Date.now = () => now;
  const { createPhoneLink } = await import('../../site/js/tennis/link.js');
  const link = createPhoneLink(), drops = [], devices = [];
  link.on('drop', d => drops.push(d)); link.on('device', d => devices.push(d));
  try { await link.start(); } finally { globalThis.setInterval = realInterval; }
  const main = new FakeConn('phone-1');
  FakePeer.last.emit('connection', main);
  main.emit('data', { t: 'hello', v: 2, k: link.token });
  assert.equal(main.sent[0]?.t, 'welcome');
  const step = (ms, every = null) => { for (let t = 0; t < ms; t += 1000){ now += 1000; every?.(); tick(); } };
  return { link, main, drops, devices, step, jump(ms){ now += ms; }, tick: () => tick(), done(){ Date.now = realDate; link.stop(); } };
}

test('computer: 7 s senza messaggi non è una caduta, 11 s sì (motivo silenzio, se n\'è accorto il computer)', async () => {
  const h = await computer();
  try {
    h.step(7000); assert.equal(h.link.connected, true); assert.equal(h.drops.length, 0);
    h.main.emit('data', { t: 'ping', c: 1 }); h.step(4000);
    assert.equal(h.link.connected, true, 'il ping ha rimesso il conto a zero');
    h.step(7000);
    assert.equal(h.link.connected, false); assert.equal(h.link.L.state, 'lost');
    assert.deepEqual(h.drops.map(d => [d.motivo, d.causa]), [['silenzio', 'computer']]);
    assert.ok(h.drops[0].ms > 10000);
  } finally { h.done(); }
});

test('computer: i sensori e il percorso veloce valgono come segno di vita; il battito parte anche sul percorso veloce', async () => {
  const h = await computer();
  try {
    // il canale affidabile tace (rete che perde pacchetti), i sensori arrivano: nessuna caduta
    h.step(15000, () => h.main.emit('motion', new ArrayBuffer(4)));
    assert.equal(h.link.connected, true, 'sensori');
    h.step(15000, () => h.main.emit('fast', { t: 'fo', k: Math.random()*1e6, y: 1, p: 0, r: 0 }));
    assert.equal(h.link.connected, true, 'percorso veloce');
    assert.ok(h.main.fast.filter(m => m.t === 'hb').length >= 20, 'battito «hb» a ogni secondo sul percorso veloce');
  } finally { h.done(); }
});

test('computer: il controllo in ritardo (pagina del gioco ferma 12 s) prima legge la coda, poi giudica', async () => {
  let h = await computer();
  try {
    h.step(1000);
    // la pagina del gioco resta ferma 12 s: il controllo arriva in ritardo e per quel giro non giudica
    h.jump(12000); h.tick();
    assert.equal(h.link.connected, true); assert.equal(h.drops.length, 0);
    // poi la coda: i messaggi del telefono arrivati intanto rimettono il conto a zero, e al giro dopo niente caduta
    h.main.emit('data', { t: 'ping', c: 1 }); h.step(1000);
    assert.equal(h.link.connected, true); assert.equal(h.drops.length, 0);
  } finally { h.done(); }
  // se invece nella coda non c'è niente (silenzio vero), cade al giro dopo
  h = await computer();
  try {
    h.step(1000); h.jump(12000); h.tick(); assert.equal(h.drops.length, 0);
    h.step(1000); assert.deepEqual(h.drops.map(d => d.motivo), ['silenzio']);
  } finally { h.done(); }
});

test('computer: motivo della caduta dalla parola del telefono, dal «Ricollega» chiesto qui, dalla pagina nascosta; racconto nel «dev»', async () => {
  let h = await computer();
  try {
    h.main.emit('data', { t: 'cl', w: 'pagina' }); h.main.close();
    assert.deepEqual(h.drops.map(d => [d.motivo, d.causa]), [['telefono: pagina chiusa', 'telefono']]);
  } finally { h.done(); }
  h = await computer();
  try {
    assert.equal(h.link.relink(), true); h.main.close();
    assert.deepEqual(h.drops.map(d => [d.motivo, d.causa]), [['ricollega', 'computer']]);
  } finally { h.done(); }
  h = await computer();
  try {
    h.main.emit('data', { t: 'st', s: 'ready', vis: 0 }); h.main.close();
    assert.deepEqual(h.drops.map(d => [d.motivo, d.causa]), [['telefono: pagina nascosta', 'telefono']]);
  } finally { h.done(); }
  // il telefono taceva da 9 s e il canale si chiude (il suo controllo di vita, la parola «cl» persa con la rete): silenzio
  h = await computer();
  try {
    h.step(9000); h.main.close();
    assert.deepEqual(h.drops.map(d => [d.motivo, d.causa]), [['silenzio', 'telefono']]);
  } finally { h.done(); }
  h = await computer();
  try {
    h.main.close();
    assert.deepEqual(h.drops.map(d => [d.motivo, d.causa]), [['chiuso', 'telefono']], 'senza altro: chiuso dal telefono');
    // il telefono rientra e racconta: il «dev» porta il racconto letto (solo i campi previsti)
    const again = new FakeConn('phone-2'); FakePeer.last.emit('connection', again);
    again.emit('data', { t: 'hello', v: 2, r: h.main.sent[0].r });
    again.emit('data', { t: 'dev', ua: 'x', as: 1, cd: { w: 'rete', ms: 4200, prove: 3, fallite: 2, tipo: 'cellular', segreto: 'no' } });
    assert.deepEqual(h.devices.at(-1).story, { w: 'rete', ms: 4200, prove: 3, fallite: 2, tipo: 'cellular' });
    again.emit('data', { t: 'dev', ua: 'x', as: 1 });
    assert.equal('story' in h.devices.at(-1), false, 'senza racconto: niente campo (pagine di prima)');
  } finally { h.done(); }
});
