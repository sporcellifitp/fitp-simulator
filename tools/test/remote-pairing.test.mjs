// Telecomando dello staff (B27): abbinamento da confermare sul computer, QR e codice che valgono solo a foglio aperto,
// ripresa con la prova reciproca della chiave (HMAC, la chiave non viaggia), indirizzo che cambia a ogni abbinamento,
// ruoli separati da quelli della racchetta, un solo telecomando. Gioco (remote-link.js) e telefono (remote-client.js)
// insieme, su una rete finta in memoria con la stessa forma di PeerJS e di LanPeer.
// I casi A–E vengono dagli script della revisione indipendente del 12/11 (dirottamento dell'abbinamento, comandi
// ignorati dopo la ricarica della pagina del telefono, tentativi senza limite).
import test from 'node:test';
import assert from 'node:assert/strict';
import { REMOTE, REMOTE_COMMANDS, createRemoteGate, parseRemotePairing, remotePairingUrl, normalizeCode, showCode, codePeerId, parseRemoteCommand,
  isRemoteSession, isPairId, denyText, remoteProof, newNonce, newPairNumber, NONCE } from '../../site/js/tennis/remote-pairing.js';
import { parsePairing, pairingUrl, newSessionId } from '../../site/js/tennis/pairing.js';
import { createRemoteClient } from '../../site/js/tennis/remote-client.js';

const memory = (init = null) => { let v = init; return { load: () => (v ? JSON.parse(JSON.stringify(v)) : null), save: x => { v = JSON.parse(JSON.stringify(x)); }, clear: () => { v = null; }, get value(){ return v; } }; };
const hello = x => ({ t: 'hello', role: 'remote', v: 2, ...x });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end){ if (await fn()) return true; await sleep(10); } return false; };

/* ---------- cancello (puro) ---------- */

test('QR del telecomando e QR della racchetta: ognuno vale solo per la sua pagina; il QR non porta l\'indirizzo fisso', () => {
  const gate = createRemoteGate({ store: memory() });
  assert.equal(gate.session, null, 'senza abbinamento nessun indirizzo fisso');
  assert.deepEqual([gate.pairId, gate.token, gate.code], [null, null, null], 'a foglio chiuso niente da mostrare');
  gate.openPairing();
  const url = remotePairingUrl('https://192.168.1.5:8443/natpf/tennis/telecomando.html', '?lan=1', gate.pairId, gate.token);
  assert.match(url, /telecomando\.html\?lan=1#tc=telecomando-abbina-[a-z0-9]{26}&k=[a-z0-9]{26}$/);
  const hash = url.slice(url.indexOf('#'));
  assert.deepEqual(parseRemotePairing(hash), { pair: gate.pairId, token: gate.token });
  assert.equal(parsePairing(hash), null, 'la pagina della racchetta non accetta il QR del telecomando');
  const racket = pairingUrl('https://x/racchetta.html', '', newSessionId(), 'abcdefghijkmnpqrstuv');
  assert.equal(parseRemotePairing(racket.slice(racket.indexOf('#'))), null, 'la pagina del telecomando non accetta il QR dei giocatori');
  assert.equal(parseRemotePairing(`#tc=${newSessionId()}&k=abcdefghijkmnpqrstuv`), null, 'id della racchetta nella chiave del telecomando');
  assert.equal(parseRemotePairing('#tc=telecomando-abcdefghijkmnpqrstuvwxyz23&k=abcdefghijkmnpqrstuv'), null, 'un indirizzo fisso non è un QR');
  assert.equal(parseRemotePairing(`#tc=${codePeerId('abcdefgh')}&k=abcdefghijkmnpqrstuv`), null);
  assert.ok(isPairId(gate.pairId) && !isRemoteSession(gate.pairId) && !isRemoteSession(codePeerId('abcdefgh')) && !isRemoteSession(newSessionId()));
});

test('cancello: QR e codice solo a foglio aperto, una volta sola, e non bastano (serve la conferma sul computer)', () => {
  let t = 1000; const store = memory();
  const gate = createRemoteGate({ store, now: () => t });
  // foglio chiuso: niente vale
  assert.deepEqual(gate.request(hello({ k: 'abcdefghijkmnpqrstuvwxyz23' }), 'pair'), { ok: false, why: 'closed' });
  gate.openPairing();
  const token = gate.token, code = gate.code;
  // ruoli: senza role «remote» niente (hello della racchetta con il codice giusto)
  assert.deepEqual(gate.request({ t: 'hello', v: 2, k: token }, 'pair'), { ok: false, why: 'role' });
  assert.deepEqual(gate.request({ t: 'join', role: 'remote', k: token }, 'pair'), { ok: false, why: 'bad' });
  // il codice del QR vale solo sull'indirizzo del QR, quello scritto solo sul suo
  assert.equal(gate.request(hello({ c: code }), 'pair').ok, false);
  assert.equal(gate.request(hello({ k: token }), 'code').ok, false);
  assert.equal(gate.request(hello({ k: token }), 'main').ok, false, 'mai sull\'indirizzo fisso');
  // giusto: resta da confermare; non è ancora abbinato e niente è salvato
  assert.deepEqual(gate.request(hello({ k: token }), 'pair'), { ok: true });
  assert.equal(gate.pending, true); assert.equal(gate.paired, false); assert.equal(store.value, null);
  assert.notEqual(gate.token, token, 'codice del QR consumato');
  // un secondo telefono mentre il primo aspetta la conferma: occupato
  assert.deepEqual(gate.request(hello({ k: gate.token }), 'pair'), { ok: false, why: 'busy' });
  // rifiutato: si torna al QR, quello di prima non vale più
  gate.rejectPairing();
  assert.deepEqual(gate.request(hello({ k: token }), 'pair'), { ok: false, why: 'denied' });
  // con il codice scritto, poi «Conferma»: indirizzo fisso e chiave nuovi, salvati; abbinamento chiuso
  assert.deepEqual(gate.request(hello({ c: gate.code }), 'code'), { ok: true });
  const first = gate.confirmPairing();
  assert.ok(isRemoteSession(first.session) && /^[a-z0-9]{26}$/.test(first.key));
  assert.deepEqual([gate.paired, gate.open, gate.token, gate.code, gate.pairId], [true, false, null, null, null]);
  assert.deepEqual([store.value.session, store.value.key], [first.session, first.key]);
  assert.equal(gate.confirmPairing(), null, 'nessuno sta chiedendo: niente da confermare');
  // foglio chiuso dopo l'abbinamento: un QR fotografato prima non vale (A1), nemmeno 4 minuti dopo
  t += 4*60*1000;
  assert.deepEqual(gate.request(hello({ k: token }), 'pair'), { ok: false, why: 'closed' });
  assert.deepEqual(gate.request(hello({ c: code }), 'code'), { ok: false, why: 'closed' });
  // «riavvio»: stesso indirizzo e stessa chiave dal salvataggio
  const again = createRemoteGate({ store, now: () => t });
  assert.deepEqual([again.session, again.paired], [first.session, true]);
  // un abbinamento nuovo confermato cambia indirizzo e chiave (quelli di prima non valgono più)
  again.openPairing(); again.request(hello({ k: again.token }), 'pair');
  const second = again.confirmPairing();
  assert.ok(second.session !== first.session && second.key !== first.key, 'indirizzo e chiave ruotati');
  // «Scollega»: indirizzo e chiave buttati
  again.forget();
  assert.deepEqual([again.session, again.paired, store.value.session, store.value.key], [null, false, null, null]);
  // un salvataggio della versione di prima (chiave «resume») non vale
  const old = memory({ session: 'telecomando-abcdefghijkmnpqrstuvwxyz23', resume: 'abcdefghijkmnpqrstuvwxyz23' });
  assert.equal(createRemoteGate({ store: old }).paired, false);
});

test('tentativi: 5 sbagliati → QR e codice nuovi, 15 → abbinamento chiuso; i 5 minuti non si riallungano', () => {
  let t = 0; const gate = createRemoteGate({ store: memory(), now: () => t });
  gate.openPairing();
  const token = gate.token, code = gate.code, pair = gate.pairId;
  for (let i = 0; i < REMOTE.maxFails - 1; i++) assert.equal(gate.request(hello({ c: 'zzzzzzzz' }), 'code').why, 'denied');
  assert.equal(gate.token, token);
  gate.request(hello({ c: 'zzzzzzzz' }), 'code');
  assert.ok(gate.token !== token && gate.code !== code, 'codici nuovi dopo 5 tentativi');
  assert.equal(gate.pairId, pair, 'l\'indirizzo del QR resta quello di questa apertura');
  // la finestra è quella dell'apertura: a 4 minuti e 59 vale ancora, a 5 e 1 no, anche dopo i cambi di codice
  t = REMOTE.ttl - 1000; assert.equal(gate.open, true);
  t = REMOTE.ttl + 1000;
  assert.equal(gate.expired, true); assert.equal(gate.open, false);
  assert.deepEqual(gate.request(hello({ k: gate.token }), 'pair'), { ok: false, why: 'expired' });
  assert.equal(gate.closedWhy, 'expired'); assert.equal(gate.token, null);
  // 15 tentativi sbagliati: chiuso
  t = 0; gate.openPairing();
  for (let i = 0; i < REMOTE.maxFails*REMOTE.maxRounds; i++) gate.request(hello({ c: 'zzzzzzzz' }), 'code');
  assert.deepEqual([gate.open, gate.closedWhy, gate.code], [false, 'attempts', null]);
});

test('prova della chiave: HMAC-SHA-256 legato a chi risponde, al numero e all\'indirizzo', async () => {
  const key = 'abcdefghijkmnpqrstuvwxyz23', s = 'telecomando-abcdefghijkmnpqrstuvwxyz23', n = newNonce();
  assert.match(n, NONCE);
  const m = await remoteProof(key, 'game', n, s);
  assert.match(m, /^[0-9a-f]{64}$/);
  assert.equal(await remoteProof(key, 'game', n, s), m);
  for (const other of [await remoteProof(key, 'phone', n, s), await remoteProof(key, 'game', newNonce(), s), await remoteProof(key, 'game', n, s + 'x'), await remoteProof(key + 'x', 'game', n, s)]) assert.notEqual(other, m);
  assert.equal(await remoteProof('', 'game', n, s), null);
  for (let i = 0; i < 50; i++){ const x = newPairNumber(); assert.ok(Number.isInteger(x) && x >= 100 && x <= 999); }
});

test('codice da scrivere a mano, comandi e testi', () => {
  assert.equal(normalizeCode(' k3zq-7m2p '), 'k3zq7m2p');
  assert.equal(normalizeCode('K3ZQ7M2P'), 'k3zq7m2p');
  assert.equal(normalizeCode('k3zq7m2'), null, 'corto');
  assert.equal(normalizeCode('k3zq7m2o'), null, 'lettere che i codici non hanno (o, l, 0, 1)');
  assert.equal(showCode('k3zq7m2p'), 'K3ZQ-7M2P');
  assert.match(codePeerId('k3zq7m2p'), /^[a-z0-9-]{10,90}$/, 'id valido per il server di segnalazione LAN');
  assert.deepEqual(parseRemoteCommand({ t: 'cmd', c: 'ok', n: 3 }), { c: 'ok', n: 3, y: false });
  assert.deepEqual(parseRemoteCommand({ t: 'cmd', c: 'menu', n: 4, y: 1 }), { c: 'menu', n: 4, y: true });
  for (const bad of [null, { t: 'cmd', c: 'sw' }, { t: 'sw', c: 'ok' }, { t: 'cmd', c: 'toString' }]) assert.equal(parseRemoteCommand(bad), null);
  assert.ok(!REMOTE_COMMANDS.some(c => ['sw', 'toss', 'swing', 'shot'].includes(c)), 'nessun comando di gioco');
  for (const w of ['unpaired', 'expired', 'closed', 'refused', 'busy', 'insecure', 'role', 'denied']) assert.ok(denyText(w).length > 10);
});

/* ---------- gioco e telefono su una rete finta ---------- */

class Emitter { constructor(){ this.h = {}; } on(k, f){ (this.h[k] ||= []).push(f); return this; } emit(k, v){ for (const f of this.h[k] || []) f(v); } }
// rete in memoria: indirizzi registrati, collegamenti a coppie, consegna al giro dopo (come un canale vero)
const NET = { peers: new Map(), n: 0 };
class Conn extends Emitter {
  constructor(peer){ super(); this.peer = peer; this.open = false; this.other = null; this.sent = []; this.got = []; }
  send(m){ if (!this.open) return; this.sent.push(m); const o = this.other, copy = JSON.parse(JSON.stringify(m)); setTimeout(() => { if (o.open){ o.got.push(copy); o.emit('data', copy); } }, 0); }
  close(){ if (!this.open) return; this.open = false; this.emit('close'); const o = this.other; setTimeout(() => o?.close(), 0); }
}
class Peer extends Emitter {
  constructor(id){
    super(); this.id = typeof id === 'string' ? id : `telefono-${++NET.n}`; this.destroyed = false; this.conns = [];
    setTimeout(() => { if (this.destroyed) return; if (NET.peers.has(this.id)){ this.emit('error', { type: 'unavailable-id' }); return; } NET.peers.set(this.id, this); this.emit('open', this.id); }, 0);
  }
  connect(to){
    const a = new Conn(to), b = new Conn(this.id); a.other = b; b.other = a; this.conns.push(a);
    setTimeout(() => { const t = NET.peers.get(to); if (this.destroyed) return; if (!t || t.destroyed){ this.emit('error', { type: 'peer-unavailable' }); return; } t.conns.push(b); a.open = b.open = true; t.emit('connection', b); a.emit('open'); b.emit('open'); }, 0);
    return a;
  }
  destroy(){ if (this.destroyed) return; this.destroyed = true; if (NET.peers.get(this.id) === this) NET.peers.delete(this.id); for (const c of this.conns) c.close(); }
  reconnect(){}
}
// (link.js tiene la libreria di segnalazione dalla prima volta, loadPeer: una sola classe per tutto il file)
globalThis.window = { Peer };
globalThis.location = { search: '', href: 'https://192.168.1.5:8443/' };
const { createRemoteLink } = await import('../../site/js/tennis/remote-link.js');

const T = { now: 1000 };
function game(store = memory()){
  const link = createRemoteLink({ store, pageUrl: () => 'https://192.168.1.5:8443/natpf/tennis/telecomando.html', now: () => T.now, lan: () => false });
  const cmds = []; link.on('cmd', c => { cmds.push(`${c.c}#${c.n}`); c.reply({ ok: true }); });
  return { link, cmds, store };
}
function phone(store = memory()){
  const seen = { acks: [], states: [] };
  const C = createRemoteClient({ store, makePeer: async () => new Peer(), onAck: a => seen.acks.push(a), onChange: c => seen.states.push(c.state), retryMs: () => 30, helloMs: 2000, pingMs: 200, lostMs: 60000, codeRetryMs: 30 });
  return { C, seen, store };
}
// telefono «a mano»: un collegamento grezzo verso un indirizzo, con quello che riceve
async function raw(to, first){
  const p = new Peer(); await sleep(5);
  let failed = null; p.on('error', e => { failed = e.type; });
  const c = p.connect(to); await sleep(10);
  if (first && c.open) c.send(first);
  await sleep(30);
  return { p, c, get failed(){ return failed; } };
}
// abbinamento completo: foglio aperto, telefono dal QR, «Conferma» sul computer
async function pairUp(g, ph){
  g.link.pairing(true); await sleep(20);
  ph.C.pair(parseRemotePairing(new URL(g.link.url()).hash));
  assert.ok(await until(() => ph.C.state === 'waiting' && g.link.S.request), 'in attesa della conferma');
  assert.equal(g.link.confirm(), true);
  assert.ok(await until(() => ph.C.state === 'on' && g.link.connected), `telefono collegato dopo la conferma (stato ${ph.C.state})`);
}
const fresh = () => { for (const p of [...NET.peers.values()]) p.destroy(); NET.peers.clear(); T.now = 1000; };

test('abbinamento: il telefono con il QR giusto non comanda finché il computer non conferma; poi indirizzo fisso e chiave nuovi', async () => {
  fresh();
  const g = game(), ph = phone();
  assert.equal(g.link.paired, false); assert.equal(g.link.url(), null);
  await g.link.start(); await sleep(10);
  assert.equal(NET.peers.size, 0, 'senza abbinamento il gioco non apre nessun collegamento');
  g.link.pairing(true); await sleep(20);
  const url = g.link.url();
  assert.match(url, /#tc=telecomando-abbina-[a-z0-9]{26}&k=/);
  assert.ok(NET.peers.has(g.link.gate.pairId) && NET.peers.has(codePeerId(g.link.code)), 'indirizzi del QR e del codice in ascolto');
  ph.C.pair(parseRemotePairing(new URL(url).hash));
  assert.ok(await until(() => ph.C.state === 'waiting'));
  // lo stesso numero sul telefono e sul computer; niente QR in vista mentre si aspetta la conferma
  assert.ok(ph.C.number >= 100 && ph.C.number === g.link.S.request.num);
  assert.equal(g.link.url(), null);
  // non confermato: non è il telecomando, non può mandare comandi, il gioco non è abbinato
  assert.equal(ph.C.send('menu'), false);
  assert.deepEqual([g.link.connected, g.link.paired, g.cmds.length, ph.C.paired], [false, false, 0, false]);
  // «Conferma» sul computer
  assert.equal(g.link.confirm(), true);
  assert.ok(await until(() => ph.C.state === 'on' && g.link.connected));
  const fixed = g.link.session;
  assert.ok(isRemoteSession(fixed) && fixed === ph.store.value.session && g.store.value.key === ph.store.value.key);
  assert.ok(!url.includes(fixed.slice(REMOTE.prefix.length)), 'l\'indirizzo fisso non era nel QR');
  // dopo l'abbinamento: niente QR né codice validi, indirizzi dell'abbinamento chiusi (B, E)
  assert.deepEqual([g.link.S.pairing, g.link.url(), g.link.code], [false, null, null]);
  assert.deepEqual([...NET.peers.keys()].filter(id => id.startsWith(REMOTE.pairPrefix) || id.startsWith(REMOTE.codePrefix)), []);
  assert.ok(ph.C.send('down')); assert.ok(await until(() => g.cmds.length === 1 && ph.seen.acks.length === 1));
  assert.deepEqual(g.cmds, ['down#1']);
  g.link.stop(); ph.C.stop();
});

test('A · QR e codice fotografati dal ledwall: a foglio chiuso non valgono più; mai sull\'indirizzo fisso', async () => {
  fresh();
  const g = game(), staff = phone();
  await pairUp(g, staff);
  // lo staff apre «Abbina un altro telefono» e richiude senza abbinare: un visitatore ha fotografato QR e codice
  g.link.pairing(true); await sleep(20);
  const shown = parseRemotePairing(new URL(g.link.url()).hash), code = g.link.code;
  g.link.pairing(false); await sleep(20);
  T.now += 4*60*1000;
  const v1 = await raw(shown.pair, hello({ k: shown.token }));
  assert.equal(v1.failed, 'peer-unavailable', 'l\'indirizzo del QR non esiste più');
  const v2 = await raw(codePeerId(code), hello({ c: code }));
  assert.equal(v2.failed, 'peer-unavailable', 'nemmeno quello del codice');
  // gli stessi codici sull'indirizzo fisso (se mai lo conoscesse): rifiutati
  const v3 = await raw(g.link.session, hello({ k: shown.token }));
  const v4 = await raw(g.link.session, hello({ c: code }));
  assert.deepEqual([v3.c.got[0], v4.c.got[0]], [{ t: 'deny', why: 'unpaired' }, { t: 'deny', why: 'unpaired' }]);
  assert.ok(staff.C.state === 'on' && g.link.connected, 'il telecomando dello staff resta in carica');
  g.link.stop(); staff.C.stop();
});

test('B · un secondo telefono a foglio aperto: chiede, ma il primo comanda finché il computer non conferma; rifiutato resta fuori', async () => {
  fresh();
  const g = game(), staff = phone(), visitor = phone();
  await pairUp(g, staff);
  const before = { session: g.link.session, key: g.store.value.key };
  g.link.pairing(true); await sleep(20);
  const shownCode = g.link.code;                              // il codice in vista sul ledwall insieme al QR
  visitor.C.pair(parseRemotePairing(new URL(g.link.url()).hash));
  assert.ok(await until(() => visitor.C.state === 'waiting'));
  // in attesa: lo staff comanda ancora, il visitatore no
  assert.ok(staff.C.send('pause')); assert.equal(visitor.C.send('menu'), false);
  assert.ok(await until(() => g.cmds.includes('pause#1')));
  assert.deepEqual([g.link.session, g.store.value.key], [before.session, before.key], 'niente cambia senza conferma');
  // un terzo telefono mentre il secondo aspetta: occupato
  const third = phone(); third.C.pairCode(shownCode);
  assert.ok(await until(() => third.C.state === 'unpaired' && third.C.why === 'busy'), `terzo telefono: ${third.C.state} ${third.C.why}`);
  // «Rifiuta»: il visitatore resta fuori, lo staff resta il telecomando, il foglio torna a un QR nuovo
  assert.equal(g.link.refuse(), true);
  assert.ok(await until(() => visitor.C.state === 'unpaired' && visitor.C.why === 'refused'));
  assert.equal(visitor.C.paired, false);
  assert.ok(g.link.url() && staff.C.state === 'on' && g.link.connected);
  // confermato (telefono di riserva dello staff): il primo è scollegato e dimentica la chiave, l'indirizzo cambia
  const spare = phone(); spare.C.pair(parseRemotePairing(new URL(g.link.url()).hash));
  assert.ok(await until(() => spare.C.state === 'waiting'));
  g.link.confirm();
  assert.ok(await until(() => spare.C.state === 'on' && staff.C.state === 'unpaired'));
  assert.deepEqual([staff.C.paired, staff.store.value, staff.C.why], [false, null, 'bye']);
  assert.ok(g.link.session !== before.session && g.store.value.key !== before.key, 'indirizzo e chiave ruotati');
  assert.equal(NET.peers.has(before.session), false, 'l\'indirizzo di prima non esiste più');
  g.link.stop(); for (const p of [staff, visitor, third, spare]) p.C.stop();
});

test('E · codice scritto a mano (icona dell\'iPhone): chiede, aspetta la conferma sul computer senza cadere, poi è il telecomando', async () => {
  fresh();
  const g = game(), ph = phone();
  g.link.pairing(true); await sleep(20);
  const code = g.link.code;
  assert.equal(ph.C.pairCode(showCode(code)), true);
  assert.ok(await until(() => ph.C.state === 'waiting' && g.link.S.request));
  // il codice usato è già cambiato, ma il telefono in attesa resta collegato finché il computer decide
  assert.notEqual(g.link.gate.code, code);
  await sleep(1300);                                          // un giro del collegamento (riallineamento degli indirizzi)
  assert.deepEqual([ph.C.state, ph.C.number, g.link.S.request?.num], ['waiting', ph.C.number, ph.C.number]);
  assert.equal(g.link.confirm(), true);
  assert.ok(await until(() => ph.C.state === 'on' && g.link.connected));
  assert.equal(ph.store.value.session, g.link.session);
  // rifiutato dal computer: il telefono lo sa (il messaggio arriva prima che l'indirizzo si chiuda)
  const other = phone();
  g.link.pairing(true); await sleep(20);
  other.C.pairCode(g.link.code);
  assert.ok(await until(() => other.C.state === 'waiting'));
  g.link.refuse();
  assert.ok(await until(() => other.C.state === 'unpaired'));
  assert.equal(other.C.why, 'refused');
  // foglio chiuso con un telefono in attesa: rifiutato anche lui
  const third = phone();
  await sleep(350);
  third.C.pairCode(g.link.code);
  assert.ok(await until(() => third.C.state === 'waiting'));
  g.link.pairing(false);
  assert.ok(await until(() => third.C.state === 'unpaired'));
  assert.equal(third.C.why, 'closed');
  assert.ok(ph.C.state === 'on' && g.link.connected);
  g.link.stop(); for (const p of [ph, other, third]) p.C.stop();
});

test('C · un tentativo per collegamento: mille hello sullo stesso collegamento valgono uno; la finestra non si riapre', async () => {
  fresh();
  const g = game();
  g.link.pairing(true); await sleep(20);
  const code = g.link.code;
  const p = new Peer(); await sleep(5);
  const c = p.connect(codePeerId(code)); await sleep(10);
  for (let i = 0; i < 1000; i++) c.send(hello({ c: 'zzzzzzzz' }));
  await sleep(60);
  assert.equal(c.got.filter(m => m.t === 'deny').length, 1, 'un solo tentativo valutato');
  assert.equal(g.link.S.denied, 1);
  assert.equal(g.link.code, code, 'un tentativo sbagliato non cambia il codice');
  // un hello giusto dopo uno sbagliato sullo stesso collegamento: ignorato
  const p2 = new Peer(); await sleep(5);
  const c2 = p2.connect(codePeerId(code)); await sleep(10);
  c2.send(hello({ c: 'zzzzzzzz' })); c2.send(hello({ c: code })); await sleep(40);
  assert.deepEqual(c2.got.map(m => m.t), ['deny']); assert.equal(g.link.S.request, null);
  // un'ora dopo, foglio lasciato aperto: scaduto da solo (C2), il codice non vale più da nessuna parte
  T.now += 60*60*1000;
  assert.ok(await until(() => !g.link.S.pairing, 2500), 'abbinamento chiuso alla scadenza');
  assert.deepEqual([g.link.S.closedWhy, g.link.url(), g.link.code], ['expired', null, null]);
  assert.equal(NET.peers.has(codePeerId(code)), false);
  g.link.stop();
});

test('D · pagina del telefono riaperta: i comandi ripartono da 1 e il primo dopo la ricarica è eseguito e confermato', async () => {
  fresh();
  const g = game(), ph = phone();
  await pairUp(g, ph);
  for (let i = 0; i < 6; i++) ph.C.send('down');
  assert.ok(await until(() => g.cmds.length === 6 && ph.seen.acks.length === 6));
  // ricarica: un telefono nuovo con lo stesso salvataggio (il contatore riparte da zero)
  ph.C.stop();
  const again = phone(ph.store);
  again.C.start();
  assert.ok(await until(() => again.C.state === 'on'), 'ripresa da sola con la chiave salvata');
  assert.equal(again.C.send('pause'), 1);
  assert.ok(await until(() => again.seen.acks.length === 1));
  assert.deepEqual(g.cmds.slice(6), ['pause#1']);
  assert.deepEqual(again.seen.acks[0], { t: 'ack', n: 1, ok: true });
  for (let n = 2; n <= 8; n++) again.C.send('pause');
  assert.ok(await until(() => again.seen.acks.length === 8));
  assert.equal(g.cmds.length, 14);
  g.link.stop(); again.C.stop();
});

test('ripresa: gioco riavviato (stesso indirizzo), il telefono riprova da solo e rientra senza mandare la chiave', async () => {
  fresh();
  const g = game(), ph = phone();
  await pairUp(g, ph);
  const fixed = g.link.session;
  g.link.stop();
  assert.ok(await until(() => ph.C.state !== 'on'), 'il telefono si accorge che il gioco è sparito');
  await sleep(100);
  assert.ok(['lost', 'connecting'].includes(ph.C.state) && ph.C.paired, 'riprova, la chiave resta');
  const g2 = game(g.store);
  assert.equal(g2.link.session, fixed);
  await g2.link.start();
  assert.ok(await until(() => ph.C.state === 'on' && g2.link.connected));
  assert.equal(g2.link.S.resumes, 1);
  // la chiave non è mai passata nella ripresa: solo numeri casuali e prove
  const mainConn = NET.peers.get(fixed).conns.at(-1);
  assert.deepEqual(mainConn.got.slice(0, 2).map(m => Object.keys(m).sort().join()), ['n,role,t,v', 'm,t']);
  assert.ok(!JSON.stringify([mainConn.got, mainConn.sent]).includes(g.store.value.key));
  g2.link.stop(); ph.C.stop();
});

test('chiave sbagliata, risposta riusata: il gioco non fa entrare; le prove valgono solo per quel collegamento', async () => {
  fresh();
  const g = game(), ph = phone();
  await pairUp(g, ph);
  const fixed = g.link.session, key = g.store.value.key;
  // telefono con una chiave sbagliata: il gioco prova la sua, il telefono non la riconosce e non manda la propria
  const wrong = phone(memory({ session: fixed, key: 'chiavesbagliata23456789abc', at: 1 }));
  wrong.C.start();
  assert.ok(await until(() => wrong.C.state === 'lost' && /non ha dimostrato/.test(wrong.C.why || '')));
  assert.ok(g.link.connected && ph.C.state === 'on', 'il telecomando vero non è toccato');
  // a mano: prova sbagliata → rifiutato
  const n1 = newNonce(), a = await raw(fixed, hello({ n: n1 }));
  assert.equal(a.c.got[0].t, 'proof');
  assert.equal(a.c.got[0].m, await remoteProof(key, 'game', n1, fixed), 'il gioco prova la chiave sul numero del telefono');
  a.c.send({ t: 'proof', m: 'f'.repeat(64) }); await sleep(40);
  assert.deepEqual(a.c.got[1], { t: 'deny', why: 'unpaired' });
  // la risposta giusta di un collegamento, riusata su un altro: il numero del gioco è diverso, non vale
  const n2 = newNonce(), b = await raw(fixed, hello({ n: n2 }));
  const good = await remoteProof(key, 'phone', b.c.got[0].n, fixed);
  const n3 = newNonce(), c = await raw(fixed, hello({ n: n3 }));
  assert.notEqual(c.c.got[0].n, b.c.got[0].n, 'un numero nuovo per ogni collegamento');
  c.c.send({ t: 'proof', m: good }); await sleep(40);
  assert.deepEqual(c.c.got[1], { t: 'deny', why: 'unpaired' });
  // la prova del gioco rimandata al gioco come prova del telefono (riflessione): non vale
  const d = await raw(fixed, hello({ n: n1 }));
  d.c.send({ t: 'proof', m: d.c.got[0].m }); await sleep(40);
  assert.deepEqual(d.c.got[1], { t: 'deny', why: 'unpaired' });
  // comandi prima della prova: ignorati
  const e = await raw(fixed, { t: 'cmd', c: 'menu', n: 1 });
  assert.equal(g.cmds.length, 0);
  assert.ok(g.link.connected && ph.C.state === 'on');
  void e;
  g.link.stop(); ph.C.stop(); wrong.C.stop();
});

test('finto gioco sull\'indirizzo fisso (gioco spento): il telefono non gli manda la chiave né altro, e non la dimentica', async () => {
  fresh();
  const g = game(), ph = phone();
  await pairUp(g, ph);
  const fixed = g.link.session, key = g.store.value.key;
  g.link.stop(); await sleep(50);
  // qualcuno registra l'indirizzo al posto del gioco e prova di tutto
  const fake = new Peer(fixed); const got = [];
  for (const answer of [{ t: 'welcome' }, { t: 'proof', m: 'a'.repeat(64), n: newNonce() }, { t: 'deny', why: 'unpaired' }, { t: 'bye' }, { t: 'welcome', s: fixed, key: 'abcdefghijkmnpqrstuvwxyz23' }]){
    fake.h.connection = [c => { c.on('data', d => { got.push(d); c.send(answer); }); }];
    ph.C.kick();
    assert.ok(await until(() => got.length >= 1 && ph.C.state !== 'on'));
    await sleep(80);
    assert.notEqual(ph.C.state, 'on', `con ${answer.t} non si collega`);
    assert.equal(ph.C.send('menu'), false);
    assert.equal(ph.store.value?.key, key, `con ${answer.t} la chiave resta salvata`);
    for (const m of got) assert.deepEqual(Object.keys(m).sort(), ['n', 'role', 't', 'v'], 'solo hello con il numero casuale');
    assert.ok(!JSON.stringify(got).includes(key));
    got.length = 0;
  }
  // il gioco vero torna: il telefono rientra con la stessa chiave
  fake.destroy();
  const g2 = game(g.store); await g2.link.start();
  assert.ok(await until(() => ph.C.state === 'on' && g2.link.connected));
  g2.link.stop(); ph.C.stop();
});

test('due pagine con la stessa chiave: quella di prima si ferma («aperto in un\'altra pagina») e riparte solo con un tocco', async () => {
  fresh();
  const g = game(), one = phone();
  await pairUp(g, one);
  const two = phone(one.store);
  two.C.start();
  assert.ok(await until(() => two.C.state === 'on' && one.C.state === 'parked'));
  await sleep(200);
  assert.deepEqual([one.C.state, two.C.state, one.C.paired], ['parked', 'on', true], 'niente tira e molla, la chiave resta');
  assert.equal(one.C.send('menu'), false);
  // tocco sulla prima: riprende lei, l'altra si ferma
  one.C.start();
  assert.ok(await until(() => one.C.state === 'on' && two.C.state === 'parked'));
  g.link.stop(); one.C.stop(); two.C.stop();
});

test('«Scollega il telecomando»: il telefono dimentica, indirizzo e chiave del gioco buttati, niente più ascolto', async () => {
  fresh();
  const g = game(), ph = phone();
  await pairUp(g, ph);
  const fixed = g.link.session;
  g.link.forget();
  assert.ok(await until(() => ph.C.state === 'unpaired' && ph.store.value === null));
  await sleep(350);
  assert.deepEqual([g.link.paired, g.link.session, g.store.value.key, NET.peers.has(fixed)], [false, null, null, false]);
  g.link.stop(); ph.C.stop();
});

test('senza crypto.subtle (pagina non in https) il telefono non riprende: nessuna strada in chiaro', async () => {
  fresh();
  const store = memory({ session: 'telecomando-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23', at: 1 });
  const real = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: a => real.get ? real.get.call(globalThis).getRandomValues(a) : real.value.getRandomValues(a) }, configurable: true });
  try {
    const got = []; const fake = new Peer('telecomando-abcdefghijkmnpqrstuvwxyz23'); fake.on('connection', c => c.on('data', d => got.push(d)));
    const ph = phone(store); ph.C.start(); await sleep(80);
    assert.equal(ph.C.state, 'insecure'); assert.equal(got.length, 0);
    assert.equal(store.value.key, 'abcdefghijkmnpqrstuvwxyz23');
    ph.C.stop(); fake.destroy();
  } finally { Object.defineProperty(globalThis, 'crypto', real); }
});

test('la racchetta rifiuta il telecomando anche con il codice giusto del QR dei giocatori (link.js)', async () => {
  fresh();
  const { createPhoneLink } = await import('../../site/js/tennis/link.js');
  const racket = createPhoneLink();
  try {
    await racket.start(); await sleep(10);
    const r = await raw(racket.session, { t: 'hello', role: 'remote', v: 2, k: racket.token });
    assert.deepEqual(r.c.got[0], { t: 'deny', why: 'role' });
    assert.equal(racket.connected, false);
  } finally { racket.stop(); }
});
