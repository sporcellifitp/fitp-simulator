// Telecomando dello staff (B27): abbinamento una volta per tutte, ripresa dopo il riavvio, ruoli separati da quelli della
// racchetta, un solo telefono abbinato, codice da scrivere a mano (remote-pairing.js e remote-link.js, lato gioco).
import test from 'node:test';
import assert from 'node:assert/strict';
import { REMOTE, REMOTE_COMMANDS, createRemoteGate, parseRemotePairing, remotePairingUrl, normalizeCode, showCode, codePeerId, parseRemoteCommand, isRemoteSession, denyText } from '../../site/js/tennis/remote-pairing.js';
import { parsePairing, pairingUrl, newSessionId } from '../../site/js/tennis/pairing.js';

const memory = (init = null) => { let v = init; return { load: () => (v ? JSON.parse(JSON.stringify(v)) : null), save: x => { v = JSON.parse(JSON.stringify(x)); }, get value(){ return v; } }; };
const hello = x => ({ t: 'hello', role: 'remote', v: 1, ...x });

test('QR del telecomando e QR della racchetta: ognuno vale solo per la sua pagina', () => {
  const gate = createRemoteGate({ store: memory() });
  const url = remotePairingUrl('https://192.168.1.5:8443/natpf/tennis/telecomando.html', '?lan=1', gate.session, gate.token);
  assert.match(url, /telecomando\.html\?lan=1#tc=telecomando-[a-z0-9]{26}&k=[a-z0-9]{26}$/);
  const hash = url.slice(url.indexOf('#'));
  assert.deepEqual(parseRemotePairing(hash), { session: gate.session, token: gate.token });
  assert.equal(parsePairing(hash), null, 'la pagina della racchetta non accetta il QR del telecomando');
  const racket = pairingUrl('https://x/racchetta.html', '', newSessionId(), 'abcdefghijkmnpqrstuv');
  assert.equal(parseRemotePairing(racket.slice(racket.indexOf('#'))), null, 'la pagina del telecomando non accetta il QR dei giocatori');
  // id della racchetta dentro la chiave del telecomando: rifiutato lo stesso (prefisso)
  assert.equal(parseRemotePairing(`#tc=${newSessionId()}&k=abcdefghijkmnpqrstuv`), null);
  assert.equal(parseRemotePairing(`#tc=${codePeerId('abcdefgh')}&k=abcdefghijkmnpqrstuv`), null, 'l\'indirizzo del codice non è una sessione');
  assert.ok(isRemoteSession(gate.session) && !isRemoteSession(newSessionId()));
});

test('abbinamento: il codice del QR vale una volta, la chiave di ripresa resta salvata (riavvio del gioco o del PC)', () => {
  let t = 1000; const store = memory();
  const gate = createRemoteGate({ store, now: () => t });
  const session = gate.session;
  assert.equal(store.value.session, session, 'id della sessione salvato subito');
  assert.equal(gate.paired, false);
  const token = gate.token;
  const a = gate.admit(hello({ k: token }));
  assert.equal(a.ok, true); assert.ok(a.resume);
  assert.notEqual(gate.token, token, 'codice del QR cambiato');
  assert.deepEqual(gate.admit(hello({ k: token })), { ok: false, why: 'denied' }, 'il codice non vale due volte');
  assert.equal(store.value.resume, a.resume);
  // «riavvio»: un cancello nuovo con lo stesso salvataggio ha lo stesso id e riconosce la stessa chiave
  const again = createRemoteGate({ store, now: () => t });
  assert.equal(again.session, session);
  assert.equal(again.paired, true);
  assert.deepEqual(again.admit(hello({ r: a.resume })), { ok: true, resume: a.resume, resumed: true });
  // scaduto dopo 5 minuti
  const tok2 = again.token; t += REMOTE.ttl + 1;
  assert.deepEqual(again.admit(hello({ k: tok2 })), { ok: false, why: 'expired' });
  assert.equal(again.expired, true);
});

test('ruoli: senza role «remote» niente telecomando (la racchetta non comanda il gioco)', () => {
  const gate = createRemoteGate({ store: memory() });
  assert.deepEqual(gate.admit({ t: 'hello', v: 2, k: gate.token }), { ok: false, why: 'role' }, 'hello della racchetta con il codice giusto');
  assert.deepEqual(gate.admit({ t: 'join', role: 'remote', k: gate.token }), { ok: false, why: 'bad' });
  assert.equal(gate.paired, false);
});

test('un solo telecomando: un abbinamento nuovo sostituisce il vecchio, «Scollega» lo toglie; troppi tentativi → codici nuovi', () => {
  const store = memory(), gate = createRemoteGate({ store });
  const first = gate.admit(hello({ k: gate.token }));
  const second = gate.admit(hello({ c: gate.code }));
  assert.ok(second.ok && second.resume !== first.resume, 'abbinato con il codice scritto');
  assert.deepEqual(gate.admit(hello({ r: first.resume })), { ok: false, why: 'unpaired' }, 'il primo telefono non è più il telecomando');
  assert.equal(gate.admit(hello({ r: second.resume })).ok, true);
  // un telefono qualsiasi senza QR non ruba il telecomando
  for (const bad of [{}, { k: 'abcdefghijkmnpqrstuvwxyz2' }, { r: 'chiaveinventata23456789abc' }, { c: 'abcdefgh' }]) assert.equal(gate.admit(hello(bad)).ok, false, JSON.stringify(bad));
  const tok = gate.token, code = gate.code;
  for (let i = 0; i < REMOTE.maxFails; i++) gate.admit(hello({ k: 'sbagliatosbagliatosbaglia' }));
  assert.ok(gate.token !== tok && gate.code !== code, 'dopo 5 tentativi sbagliati QR e codice nuovi');
  gate.forget();
  assert.equal(gate.paired, false); assert.equal(store.value.resume, null);
  assert.deepEqual(gate.admit(hello({ r: second.resume })), { ok: false, why: 'unpaired' });
  assert.equal(createRemoteGate({ store }).session, gate.session, 'dopo «Scollega» l\'id resta (il telefono vecchio si sente dire «non abbinato»)');
});

test('codice da scrivere a mano, comandi e testi', () => {
  assert.equal(normalizeCode(' k3zq-7m2p '), 'k3zq7m2p');
  assert.equal(normalizeCode('K3ZQ7M2P'), 'k3zq7m2p');
  assert.equal(normalizeCode('k3zq7m2'), null, 'corto');
  assert.equal(normalizeCode('k3zq7m2o'), null, 'lettere che i codici non hanno (o, l, 0, 1)');
  assert.equal(showCode('k3zq7m2p'), 'K3ZQ-7M2P');
  assert.equal(codePeerId('k3zq7m2p'), 'telecomando-codice-k3zq7m2p');
  assert.match(codePeerId('k3zq7m2p'), /^[a-z0-9-]{10,90}$/, 'id valido per il server di segnalazione LAN');
  assert.deepEqual(parseRemoteCommand({ t: 'cmd', c: 'ok', n: 3 }), { c: 'ok', n: 3, y: false });
  assert.deepEqual(parseRemoteCommand({ t: 'cmd', c: 'menu', n: 4, y: 1 }), { c: 'menu', n: 4, y: true });
  for (const bad of [null, { t: 'cmd', c: 'sw' }, { t: 'sw', c: 'ok' }, { t: 'cmd', c: 'toString' }]) assert.equal(parseRemoteCommand(bad), null);
  assert.ok(!REMOTE_COMMANDS.some(c => ['sw', 'toss', 'swing', 'shot'].includes(c)), 'nessun comando di gioco');
  for (const w of ['unpaired', 'expired', 'role', 'busy', 'denied']) assert.ok(denyText(w).length > 10);
});

// collegamento lato gioco con un Peer finto (la stessa forma di PeerJS e di LanPeer)
class Emitter { constructor(){ this.h = {}; } on(k, f){ (this.h[k] ||= []).push(f); return this; } emit(k, v){ for (const f of this.h[k] || []) f(v); } }
class FakeConn extends Emitter { constructor(peer){ super(); this.peer = peer; this.open = true; this.sent = []; } send(m){ this.sent.push(m); } close(){ if (!this.open) return; this.open = false; this.emit('close'); } }
class FakePeer extends Emitter {
  constructor(id){ super(); this.id = id; this.destroyed = false; FakePeer.all.push(this); setTimeout(() => this.emit('open'), 0); }
  destroy(){ this.destroyed = true; }
  reconnect(){}
}
FakePeer.all = [];
const tick = () => new Promise(r => setTimeout(r, 5));

async function makeLink(store, t){
  globalThis.window = { Peer: FakePeer };
  globalThis.location = { search: '', href: 'https://192.168.1.5:8443/' };
  const { createRemoteLink } = await import('../../site/js/tennis/remote-link.js');
  const link = createRemoteLink({ store, pageUrl: () => 'https://192.168.1.5:8443/natpf/tennis/telecomando.html', now: () => t.now, lan: () => false });
  const cmds = []; link.on('cmd', c => { cmds.push(c); c.reply({ ok: true }); });
  return { link, cmds };
}

test('collegamento del gioco: abbinamento, comandi senza copie, ripresa dopo il riavvio, secondo telefono e racchetta rifiutati', async () => {
  FakePeer.all.length = 0;
  const store = memory(), t = { now: 1000 };
  const { link, cmds } = await makeLink(store, t);
  assert.equal(link.paired, false);
  await link.start(); await tick();
  const main = FakePeer.all.at(-1);
  assert.equal(main.id, link.session); assert.match(main.id, /^telecomando-/);
  assert.equal(link.S.state, 'waiting');
  assert.match(link.url(), /#tc=telecomando-[a-z0-9]{26}&k=/);
  // il telefono dello staff con il QR
  const phone = new FakeConn('tel-staff'); main.emit('connection', phone);
  phone.emit('data', hello({ k: link.token }));
  const welcome = phone.sent[0];
  assert.equal(welcome.t, 'welcome'); assert.equal(welcome.s, link.session); assert.ok(welcome.r);
  assert.equal(link.connected, true);
  // stato e comandi
  assert.equal(link.status({ pg: 'lobby:menu', label: 'Menu principale' }), true);
  assert.equal(link.status({ pg: 'lobby:menu', label: 'Menu principale' }), false, 'stato uguale: niente messaggio');
  assert.equal(phone.sent.at(-1).t, 'st');
  phone.emit('data', { t: 'cmd', c: 'down', n: 1 }); phone.emit('data', { t: 'cmd', c: 'down', n: 1 }); phone.emit('data', { t: 'cmd', c: 'ok', n: 2 });
  phone.emit('data', { t: 'sw', pk: 1, n: 3 });
  assert.deepEqual(cmds.map(c => c.c), ['down', 'ok'], 'copia scartata, niente colpi');
  assert.equal(phone.sent.at(-1).t, 'ack');
  phone.emit('data', { t: 'ping', c: 5 }); assert.deepEqual(phone.sent.at(-1), { t: 'pong', c: 5 });
  // un altro telefono con il QR dei giocatori o senza niente
  const intruder = new FakeConn('visitatore'); main.emit('connection', intruder);
  intruder.emit('data', { t: 'hello', v: 2, k: 'abcdefghijkmnpqrstuvwxyz23' });
  assert.deepEqual(intruder.sent[0], { t: 'deny', why: 'role' });
  const intruder2 = new FakeConn('visitatore-2'); main.emit('connection', intruder2);
  intruder2.emit('data', hello({ r: 'chiaveinventata23456789abc' }));
  assert.deepEqual(intruder2.sent[0], { t: 'deny', why: 'unpaired' });
  assert.equal(link.connected, true, 'il telecomando vero resta collegato');
  // silenzio del telefono (schermo spento, Wi-Fi caduta): dopo lostMs il gioco lo considera scollegato e aspetta
  t.now += REMOTE.lostMs + 10; await new Promise(r => setTimeout(r, 1100));
  assert.equal(link.connected, false); assert.equal(link.S.state, 'waiting');
  // riavvio del gioco: collegamento nuovo con lo stesso salvataggio, stesso indirizzo, il telefono rientra con la chiave
  link.stop();
  const { link: link2 } = await makeLink(store, t);
  assert.equal(link2.paired, true); assert.equal(link2.session, link.session);
  await link2.start(); await tick();
  const main2 = FakePeer.all.at(-1);
  assert.equal(main2.id, link.session, 'stesso id di sessione dopo il riavvio');
  const back = new FakeConn('tel-staff'); main2.emit('connection', back);
  back.emit('data', hello({ r: welcome.r }));
  assert.equal(back.sent[0].t, 'welcome'); assert.equal(link2.S.resumes, 1);
  // «Scollega il telecomando»: bye al telefono e la chiave non vale più
  link2.forget();
  assert.equal(back.sent.at(-1).t, 'bye');
  const again = new FakeConn('tel-staff'); main2.emit('connection', again);
  again.emit('data', hello({ r: welcome.r }));
  assert.deepEqual(again.sent[0], { t: 'deny', why: 'unpaired' });
  link2.stop();
});

test('codice scritto a mano: il gioco ascolta anche su telecomando-codice-… solo con il pannello aperto', async () => {
  FakePeer.all.length = 0;
  const store = memory(), t = { now: 1000 };
  const { link } = await makeLink(store, t);
  link.pairing(true);
  await tick(); await tick();
  const codePeer = FakePeer.all.find(p => p.id === codePeerId(link.code));
  assert.ok(codePeer, 'indirizzo del codice in ascolto');
  const phone = new FakeConn('iphone-home'); codePeer.emit('connection', phone);
  phone.emit('data', hello({ c: link.code }));
  assert.equal(phone.sent[0].t, 'welcome'); assert.equal(phone.sent[0].s, link.session, 'il telefono riceve l\'indirizzo fisso');
  await tick();
  assert.equal(codePeer.destroyed, true, 'abbinato: l\'indirizzo del codice si chiude');
  assert.equal(link.S.pairing, false);
  // pannello chiuso: nessun indirizzo del codice
  link.pairing(true); await tick(); await tick();
  const p2 = FakePeer.all.find(p => p.id === codePeerId(link.code) && !p.destroyed);
  assert.ok(p2); link.pairing(false); await tick();
  assert.equal(p2.destroyed, true);
  link.stop();
});

test('la racchetta rifiuta il telecomando anche con il codice giusto del QR dei giocatori (link.js)', async () => {
  // (la libreria di segnalazione è già quella finta: link.js la tiene dalla prima volta, loadPeer)
  globalThis.window = { Peer: FakePeer };
  globalThis.location = { search: '', href: 'http://127.0.0.1/' };
  const { createPhoneLink } = await import('../../site/js/tennis/link.js');
  const racket = createPhoneLink();
  try {
    await racket.start(); await tick();
    const c = new FakeConn('telecomando'); FakePeer.all.at(-1).emit('connection', c);
    c.emit('data', { t: 'hello', role: 'remote', v: 1, k: racket.token });
    assert.deepEqual(c.sent[0], { t: 'deny', why: 'role' });
    assert.equal(racket.connected, false);
  } finally { racket.stop(); }
});
