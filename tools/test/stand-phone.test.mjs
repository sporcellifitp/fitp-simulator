// B41.3 e B41.6 · Pagina del telefono (site/js/tennis/racchetta.js, phone-screen.js): telefono dello stand che si
// ricollega senza fine e non manda mai la chiave, numero del posto e pulsanti dello staff dietro la pressione lunga,
// «Dai il telefono al prossimo giocatore», batteria bassa, segno dei sensori che resta; «Sono pronto» grande sulla
// pagina «Pronto per la partita». Le funzioni pure direttamente; il collegamento nella stessa sandbox di
// phone-reconnect.test.mjs (il pezzo vero di racchetta.js, con una rete finta).
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { phoneView, nextOnMsg, readyView, standView, STAFF_HOLD, batteryAlert, standSignStep } from '../../site/js/tennis/phone-screen.js';
import { standHello, standWelcome, standAnswer, standProof, standDenyText, newStandNonce, slotLabel } from '../../site/js/tennis/stand-pairing.js';
import { LINK_TIMES, netWhy } from '../../site/js/tennis/link.js';
import { SIGN } from '../../site/js/tennis/motion-sign.js';

/* ---------- funzioni pure della pagina ---------- */

test('«Sono pronto» (B41.6): grande al posto di «Pronto»; spento con la spunta dopo il tocco; le altre offerte restano «Avanti ›»', () => {
  assert.deepEqual(nextOnMsg({ t: 'nx', on: 1, lb: 'Salta ›' }), { label: 'Salta ›' }, 'scambi di prova: come prima');
  assert.equal(nextOnMsg({ t: 'nx', on: 0 }), null);
  const offer = nextOnMsg({ t: 'nx', on: 1, lb: 'Sono pronto', rd: 1, me: 0 });
  assert.deepEqual(offer, { label: 'Sono pronto', ready: true, me: false, note: '' });
  assert.deepEqual(readyView(offer), { ring: '', big: 'Partita', sub: 'Quando sei pronto tocca «Sono pronto»: la partita parte da sola.', label: 'Sono pronto', disabled: false });
  const done = nextOnMsg({ t: 'nx', on: 1, lb: 'Pronto ✓', rd: 1, me: 1, tx: 'Aspetto Player 2' });
  assert.deepEqual(readyView(done), { ring: 'ready', big: 'Pronto ✓', sub: 'Aspetto Player 2', label: 'Pronto ✓', disabled: true });
  assert.equal(readyView({ label: 'Avanti ›' }), null);
  // il pulsante sta sotto «Pronto» (schermata ready), non a fine partita
  assert.equal(phoneView({ linkState: 'on', sensor: 'ready', next: offer, phase: 'menu' }).show['#next'], true);
  assert.equal(phoneView({ linkState: 'on', sensor: 'ready', next: offer, phase: 'over' }).show['#next'], false);
});

test('telefono dello stand (B41.3): numero del posto sempre in vista; Ricalibra, Ricollega e Scollega solo dopo la pressione lunga dello staff', () => {
  const base = { linkState: 'on', sensor: 'ready', phase: 'menu' };
  assert.equal(phoneView(base).show['#tools'], true, 'racchetta normale: come prima');
  assert.equal(phoneView(base).show['#standTag'], false);
  assert.equal(phoneView({ ...base, stand: true }).show['#tools'], false, 'il visitatore non li vede');
  assert.equal(phoneView({ ...base, stand: true, staff: true }).show['#tools'], true, 'lo staff sì, dopo la pressione lunga');
  assert.equal(phoneView({ ...base, stand: true, linkState: 'lost' }).show['#standTag'], true, 'anche mentre si ricollega');
  assert.deepEqual([STAFF_HOLD.holdMs, STAFF_HOLD.showMs], [3000, 20000]);
});

test('telefono dello stand: scritte tra una persona e l\'altra e mentre si ricollega (niente QR)', () => {
  assert.deepEqual(standView({ slot: 'p2', phase: 'menu' }), { tag: 'Telefono 2', big: 'Pronto ✓', sub: 'Dai il telefono al prossimo giocatore.', bar: 'Telefono 2 · collegato' });
  assert.equal(standView({ phase: 'over' }).big, 'Partita finita');
  assert.match(standView({ phase: 'over' }).sub, /prossimo giocatore/);
  assert.equal(standView({ phase: 'play' }).big, null, 'in partita le scritte di sempre');
  const lost = standView({ slot: 'p1', linkState: 'lost' });
  assert.equal(lost.big, 'Telefono 1'); assert.match(lost.sub, /ricollego da solo/); assert.doesNotMatch(lost.sub, /QR/);
  assert.match(standView({ sensor: 'off' }).sub, /Attiva i sensori/);
});

test('batteria bassa sotto il 20 % (solo dove il browser la dà), niente in carica', () => {
  assert.equal(batteryAlert({ level: null }), null);
  assert.equal(batteryAlert({ level: 0.5 }), null);
  assert.equal(batteryAlert({ level: 0.12, charging: true }), null);
  assert.deepEqual(batteryAlert({ level: 0.12 }), { t: 'Batteria bassa · 12%', p: 'Metti in carica il telefono dello stand (o dallo allo staff).' });
});

test('segno dei sensori del telefono dello stand: confermato dai tocchi si salva e non si vota più', () => {
  const opt = { need: SIGN.votes, agree: SIGN.agree };
  assert.deepEqual(standSignStep({ saved: -1 }), { vote: false, save: null }, 'già salvato: niente voto (un tocco storto non fa ricalibrare)');
  assert.deepEqual(standSignStep({ votes: { up: 2, down: 0 }, sign: 1, ...opt }), { vote: true, save: null }, 'pochi tocchi: si vota ancora');
  assert.deepEqual(standSignStep({ votes: { up: 3, down: 1 }, sign: 1, ...opt }), { vote: true, save: null }, 'non concordi');
  assert.deepEqual(standSignStep({ votes: { up: 4, down: 0 }, sign: 1, ...opt }), { vote: false, save: 1 });
  assert.deepEqual(standSignStep({ votes: { up: 0, down: 5 }, sign: -1, ...opt }), { vote: false, save: -1 });
});

/* ---------- collegamento del telefono dello stand (pezzo vero di racchetta.js) ---------- */
const source = readFileSync(process.env.NATPF_PHONE_SOURCE || new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('async function connect(){'), source.indexOf('// messaggi che valgono solo se arrivano subito'));
const helpers = source.slice(source.indexOf('async function standProofIn('), source.indexOf('// numero grande del posto in cima alla pagina'));
const SESSION = 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', KEY = 'abcdefghijkmnpqrstuvwxyz23';
function setup({ mode = 'stand' } = {}){
  const timers = new Map(), peers = [], texts = [], saved = { v: { slot: 'p1', session: SESSION, key: KEY, at: 1 } }; let seq = 0;
  class Emitter { constructor(){ this.handlers = {}; } on(k, f){ (this.handlers[k] ||= []).push(f); } emit(k, v){ for (const f of this.handlers[k] || []) f(v); } }
  class Conn extends Emitter { constructor(){ super(); this.open = true; this.sent = []; } send(d){ this.sent.push(d); } close(){ this.open = false; this.emit('close'); } }
  class Peer extends Emitter {
    constructor(){ super(); this.destroyed = false; this.connections = []; peers.push(this); }
    connect(){ const c = new Conn(); this.connections.push(c); return c; }
    destroy(){ this.destroyed = true; for (const c of this.connections) c.close(); }
    reconnect(){ this.emit('open'); }
  }
  const store = new Map();
  const sandbox = { LanPeer: Peer, isLanMode: () => true, loadPeer: async () => Peer, iceReady: async () => null, peerConfig: () => ({}), LINK_TIMES, netWhy, performance: { now: () => 100 }, Date,
    ss: { get: k => store.get(k), set: (k, v) => store.set(k, v), del: k => store.delete(k) },
    setTimeout: (f, ms) => { timers.set(++seq, { f, ms }); return seq; }, clearTimeout: id => timers.delete(id),
    paint(){}, bar(){}, ui: (big, sub) => texts.push([big, sub]), show(){}, closeFast(){}, openFast(){}, sendState(){}, sendDevice(){},
    standHello, standWelcome, standAnswer, standDenyText, newStandNonce, slotLabel, standView,
    standStore: { save: v => { saved.v = v; return true; }, clear: () => { saved.v = null; }, load: () => saved.v } };
  vm.createContext(sandbox);
  const pair = mode === 'pair' ? `{session:'racchetta-stand-abbina-abcdefghijkmnpqrstuvwxyz',token:'qrqrqrqrqrqrqrqrqrqrqrqrqr',standPair:true}` : mode === 'normal' ? `{session:'game',token:'token'}` : `{session:'${SESSION}',stand:true}`;
  const stand = mode === 'stand' ? `{slot:'p1',session:'${SESSION}',key:'${KEY}',at:1}` : 'null';
  vm.runInContext(`let peer=null,conn=null,pendingConn=null,connectEpoch=0,retryT=null,tries=0,linkState='off',pair=${pair},stand=${stand},lastRx=0,fastOk=false,sensor='ready',rtt=80,nextOffer=null,phase='menu';\n` + section + '\n' + helpers +
    "\nglobalThis.api={connect,lost,relink,get state(){return linkState},get conn(){return conn},get pair(){return pair},get stand(){return stand},get tries(){return tries}};", sandbox);
  const run = async ms => { for (const [id, t] of [...timers]) if (ms == null || t.ms === ms){ timers.delete(id); await t.f(); } };
  const open = async () => { await sandbox.api.connect(); const p = peers.at(-1); p.emit('open'); const c = p.connections.at(-1); c.emit('open'); return { p, c }; };
  return { api: sandbox.api, peers, timers, run, open, texts, saved };
}
// (la prova HMAC è asincrona, crypto.subtle: sotto carico ci mette più di qualche giro, si aspetta fino a 3 s)
const waitFor = async (fn, ms = 3000) => { const end = Date.now() + ms; while (Date.now() < end){ if (fn()) return true; await new Promise(r => setTimeout(r, 5)); } return false; };

test('ripresa del telefono dello stand: un numero casuale, mai la chiave; risponde solo alla prova giusta del gioco; benvenuto solo dopo', async () => {
  const h = setup(), { c } = await h.open();
  const hello = c.sent[0];
  assert.equal(hello.t, 'hello'); assert.equal(hello.role, 'stand'); assert.match(hello.n, /^[a-z0-9]{26}$/);
  assert.equal(JSON.stringify(c.sent).includes(KEY), false, 'la chiave non viaggia');
  // un benvenuto prima della prova (chi si è messo sull'indirizzo del gioco) non vale
  c.emit('data', { t: 'welcome', f: 1, st: 1, slot: 'p1' });
  assert.notEqual(h.api.state, 'on');
  // la prova del gioco sul numero del telefono → la prova del telefono
  const n = 'gamenoncegamenoncegamenonc';
  c.emit('data', { t: 'proof', m: await standProof(KEY, 'game', hello.n, SESSION), n });
  assert.ok(await waitFor(() => c.sent.length >= 2));
  assert.deepEqual(c.sent[1], { t: 'proof', m: await standProof(KEY, 'phone', n, SESSION) });
  c.emit('data', { t: 'welcome', f: 1, st: 1, slot: 'p1' });
  assert.equal(h.api.state, 'on'); assert.equal(h.api.conn, c);
});

test('prova sbagliata o rifiuto prima della prova: la chiave resta e si riprova; il posto salvato non si tocca', async () => {
  const h = setup(), { c } = await h.open();
  c.emit('data', { t: 'proof', m: await standProof('sbagliatasbagliatasbagliat', 'game', c.sent[0].n, SESSION), n: 'gamenoncegamenoncegamenonc' });
  await waitFor(() => h.api.state === 'lost');
  assert.equal(h.api.state, 'lost'); assert.equal(c.sent.length, 1, 'niente risposta a chi non prova la chiave');
  assert.ok(h.saved.v && h.api.pair?.stand, 'posto ancora salvato');
  await h.run();
  const d = await h.open();
  d.c.emit('data', { t: 'deny', why: 'unpaired' });   // rifiuto senza prova: lo può mandare chiunque
  assert.equal(h.api.state, 'lost'); assert.ok(h.saved.v, 'la chiave resta');
});

test('riprova senza fine (gioco spento o in riavvio), ogni 1–6 s; la racchetta normale si ferma dopo 10', async () => {
  const h = setup();
  for (let i = 0; i < 25; i++){
    await h.api.connect(); const p = h.peers.at(-1);
    if (i % 2) p.emit('open');                              // (segnalazione raggiunta: «il computer non risponde»)
    p.emit('error', { type: 'peer-unavailable' });         // indirizzo del posto che non risponde
    assert.equal(h.api.state, 'lost', `giro ${i}`);
    const waits = [...h.timers.values()].map(t => t.ms);
    assert.ok(waits.some(ms => ms >= 1000 && ms <= 6000), `nuovo tentativo programmato al giro ${i + 1} (${waits})`);
    for (const id of [...h.timers.keys()]) h.timers.delete(id);
  }
  assert.ok(h.api.tries >= 25 && h.saved.v, 'dopo 25 giri ancora il suo posto');
  assert.match(h.texts.at(-1)[1], /ricollego da solo/);
  assert.ok(h.texts.every(([, sub]) => !/QR/.test(sub || '')), 'mai «inquadra il QR» sul telefono dello stand');
  // la racchetta normale (con la chiave di ripresa): come prima, 10 tentativi e poi «Riprova»
  const n = setup({ mode: 'normal' }); let scheduled = 0;
  for (let i = 0; i < 12; i++){
    await n.api.connect(); n.peers.at(-1).emit('error', { type: 'network' });
    if ([...n.timers.values()].some(t => t.ms >= 1000 && t.ms <= 6000 && t.ms !== LINK_TIMES.phoneMs)) scheduled++;
    for (const id of [...n.timers.keys()]) n.timers.delete(id);
  }
  assert.equal(scheduled, 10);
});

test('posto dato a un altro telefono o scollegato dallo staff (dopo la prova): niente più tentativi, lo dice; «other»: la scheda si ferma', async () => {
  const proven = async h => { const { c } = await h.open(); const n = 'gamenoncegamenoncegamenonc'; c.emit('data', { t: 'proof', m: await standProof(KEY, 'game', c.sent[0].n, SESSION), n }); assert.ok(await waitFor(() => c.sent.length >= 2)); c.emit('data', { t: 'welcome', f: 1, st: 1, slot: 'p1' }); return c; };
  const h = setup(), c = await proven(h);
  c.emit('data', { t: 'bye', why: 'replaced' });
  assert.equal(h.api.state, 'denied'); assert.equal(h.saved.v, null); assert.equal(h.api.pair, null);
  assert.match(h.texts.at(-1)[0], /Non sei più il Telefono 1/);
  assert.equal(h.timers.size, 0, 'nessun nuovo tentativo');
  // un «bye» prima della prova (chi si è messo sull'indirizzo) non fa dimenticare niente
  const k = setup(), { c: early } = await k.open();
  early.emit('data', { t: 'bye', why: 'unpaired' });
  assert.ok(k.saved.v && k.api.pair?.stand);
  // la stessa chiave entrata da un'altra scheda
  const o = setup(), oc = await proven(o);
  oc.emit('data', { t: 'bye', why: 'other' });
  assert.equal(o.api.state, 'denied'); assert.ok(o.saved.v, 'il posto resta: «Riprova» lo riprende qui');
});

test('abbinamento dal QR dello stand: codice del QR, numero da confermare, poi posto salvato e ripresa all\'indirizzo fisso', async () => {
  const h = setup({ mode: 'pair' }), { c } = await h.open();
  assert.deepEqual(c.sent[0], { t: 'hello', v: 2, role: 'stand', k: 'qrqrqrqrqrqrqrqrqrqrqrqrqr' });
  c.emit('data', { t: 'wait', num: 482 });
  assert.deepEqual(h.texts.at(-1)[0], '482');
  c.emit('data', { t: 'welcome', st: 1, s: SESSION, key: KEY, slot: 'p2' });
  assert.equal(h.saved.v.slot, 'p2'); assert.equal(h.saved.v.session, SESSION);
  assert.deepEqual({ ...h.api.pair }, { session: SESSION, stand: true });
  assert.ok([...h.timers.values()].some(t => t.ms === 300), 'si ricollega all\'indirizzo fisso');
  // QR scaduto (indirizzo dell'abbinamento che non c'è più)
  const k = setup({ mode: 'pair' });
  await k.api.connect(); k.peers.at(-1).emit('error', { type: 'peer-unavailable' });
  assert.equal(k.api.state, 'denied'); assert.match(k.texts.at(-1)[1], /chiuso/);
});
