// B41.1–B41.2 · Telefoni dello stand (modalità fiera): abbinamento una volta per posto con la conferma dello staff,
// indirizzo fisso mai nel QR, chiave salvata, ripresa con la prova reciproca HMAC (come il telecomando dello staff),
// ripresa dopo il riavvio del gioco, riabbinamento che esclude il telefono di prima, «Scollega». Prima il guardiano
// (stand-pairing.js, puro), poi il collegamento vero del gioco (link.js con stand) e un telefono che parla come la
// pagina della racchetta (stesse funzioni di stand-pairing.js), su una rete finta in memoria con la forma di PeerJS.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAND, createStandGate, parseStandPairing, standPairingUrl, isStandSession, isStandPairId, standProof, createStandStore,
  standHello, standWelcome, standAnswer, standDenyText, newStandNonce, gameStoreKey, slotLabel } from '../../site/js/tennis/stand-pairing.js';
import { parsePairing, pairingUrl, newSessionId } from '../../site/js/tennis/pairing.js';
import { parseRemotePairing, remotePairingUrl, remoteProof, isRemoteSession } from '../../site/js/tennis/remote-pairing.js';

const memory = (init = null) => { let v = init; return { load: () => (v ? JSON.parse(JSON.stringify(v)) : null), save: x => { v = JSON.parse(JSON.stringify(x)); }, clear: () => { v = null; }, get value(){ return v; } }; };
const hello = x => ({ t: 'hello', role: 'stand', v: 2, ...x });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end){ if (await fn()) return true; await sleep(10); } return false; };

/* ---------- guardiano del posto (puro) ---------- */

test('QR dello stand, della racchetta e del telecomando: ognuno vale solo per la sua pagina; il QR non porta mai l\'indirizzo fisso', () => {
  const gate = createStandGate({ slot: 'p1', store: memory() });
  assert.equal(gate.session, null, 'senza abbinamento nessun indirizzo fisso');
  assert.deepEqual([gate.pairId, gate.token], [null, null], 'a foglio chiuso niente da mostrare');
  gate.openPairing();
  const url = standPairingUrl('https://192.168.1.5:8443/natpf/tennis/racchetta.html', '?lan=1', gate.pairId, gate.token);
  assert.match(url, /racchetta\.html\?lan=1#sp=racchetta-stand-abbina-[a-z0-9]{26}&k=[a-z0-9]{26}$/);
  const hash = url.slice(url.indexOf('#'));
  assert.deepEqual(parseStandPairing(hash), { pair: gate.pairId, token: gate.token });
  assert.equal(parsePairing(hash), null, 'la racchetta normale (anche una pagina vecchia in cache) non legge il QR dello stand');
  assert.equal(parseRemotePairing(hash), null, 'il telecomando non legge il QR dello stand');
  const racket = pairingUrl('https://x/racchetta.html', '', newSessionId(), 'abcdefghijkmnpqrstuv');
  assert.equal(parseStandPairing(racket.slice(racket.indexOf('#'))), null, 'il QR della racchetta non vale per lo stand');
  const remote = remotePairingUrl('https://x/telecomando.html', '', 'telecomando-abbina-abcdefghijkmnpqrstuvwxyz23', 'abcdefghijkmnpqrstuv');
  assert.equal(parseStandPairing(remote.slice(remote.indexOf('#'))), null, 'il QR del telecomando non vale per lo stand');
  assert.equal(parseStandPairing('#sp=racchetta-stand-abcdefghijkmnpqrstuvwxyz23&k=abcdefghijkmnpqrstuv'), null, 'un indirizzo fisso non è un QR');
  assert.equal(parseStandPairing(`#sp=${newSessionId()}&k=abcdefghijkmnpqrstuv`), null);
  assert.ok(isStandPairId(gate.pairId) && !isStandSession(gate.pairId) && !isStandSession(newSessionId()) && !isRemoteSession('racchetta-stand-abcdefghijkmnpqrstuvwxyz23'));
});

test('guardiano: QR solo a foglio aperto e una volta sola; non basta (serve la conferma dello staff); niente racchetta né telecomando', () => {
  let t = 1000; const store = memory();
  const gate = createStandGate({ slot: 'p2', store, now: () => t });
  assert.deepEqual(gate.request(hello({ k: 'abcdefghijkmnpqrstuvwxyz23' })), { ok: false, why: 'closed' });
  gate.openPairing();
  const token = gate.token;
  assert.deepEqual(gate.request({ t: 'hello', v: 2, k: token }), { ok: false, why: 'role' }, 'la racchetta normale con il codice giusto');
  assert.deepEqual(gate.request({ t: 'hello', role: 'remote', v: 2, k: token }), { ok: false, why: 'role' }, 'il telecomando');
  assert.deepEqual(gate.request({ t: 'join', role: 'stand', k: token }), { ok: false, why: 'bad' });
  assert.deepEqual(gate.request(hello({ k: token })), { ok: true });
  assert.equal(gate.pending, true); assert.equal(gate.paired, false); assert.equal(store.value, null, 'niente salvato prima della conferma');
  assert.notEqual(gate.token, token, 'codice consumato');
  assert.deepEqual(gate.request(hello({ k: gate.token })), { ok: false, why: 'busy' }, 'un secondo telefono mentre il primo aspetta');
  gate.rejectPairing();
  assert.deepEqual(gate.request(hello({ k: token })), { ok: false, why: 'denied' }, 'il codice di prima non vale più');
  // 5 minuti: poi niente, anche con il codice nuovo (la finestra non si riallunga)
  const fresh = gate.token; t += STAND.ttl + 1;
  assert.deepEqual(gate.request(hello({ k: fresh })), { ok: false, why: 'expired' });
  assert.equal(gate.open, false); assert.equal(gate.token, null);
  // troppi tentativi sbagliati: codice nuovo, poi abbinamento chiuso
  gate.openPairing();
  for (let i = 0; i < STAND.maxFails*STAND.maxRounds; i++) gate.request(hello({ k: 'sbagliatosbagliatosbaglia' }));
  assert.equal(gate.open, false); assert.equal(gate.closedWhy, 'attempts');
  // conferma solo con un telefono in attesa
  assert.equal(gate.confirmPairing(), null);
});

test('guardiano: alla conferma indirizzo fisso e chiave nuovi e salvati; dopo un «riavvio» (guardiano nuovo, stesso salvataggio) il posto c\'è ancora; riabbinare li cambia; «Scollega» li butta', async () => {
  const store = memory();
  const g1 = createStandGate({ slot: 'p1', store });
  g1.openPairing(); g1.request(hello({ k: g1.token }));
  const a = g1.confirmPairing();
  assert.ok(isStandSession(a.session) && a.key.length === 26 && a.slot === 'p1');
  assert.deepEqual([g1.paired, g1.open, g1.pending, g1.pairId], [true, false, false, null], 'abbinato, foglio chiuso');
  assert.deepEqual([store.value.session, store.value.key], [a.session, a.key]);
  // riavvio del gioco o del programma: il posto si riprende dal salvataggio
  const g2 = createStandGate({ slot: 'p1', store });
  assert.deepEqual([g2.paired, g2.session], [true, a.session]);
  const nonce = newStandNonce();
  assert.equal(await g2.prove('game', nonce), await standProof(a.key, 'game', nonce, a.session));
  // riabbinamento: indirizzo e chiave nuovi, quelli di prima non provano più niente
  g2.openPairing(); g2.request(hello({ k: g2.token }));
  const b = g2.confirmPairing();
  assert.notEqual(b.session, a.session); assert.notEqual(b.key, a.key);
  assert.notEqual(await g2.prove('game', nonce), await standProof(a.key, 'game', nonce, a.session));
  // salvataggio rovinato o di un'altra cosa: niente posto (e niente errori)
  assert.equal(createStandGate({ store: memory({ session: newSessionId(), key: 'abcdefghijkmnpqrstuvwxyz23' }) }).paired, false);
  assert.equal(createStandGate({ store: { load(){ throw new Error('x'); }, save(){} } }).paired, false);
  // «Scollega»
  g2.forget();
  assert.deepEqual([g2.paired, g2.session, store.value.session, store.value.key], [false, null, null, null]);
  assert.equal(await g2.prove('game', nonce), null);
});

test('prove HMAC: gioco e telefono non si scambiano, e nemmeno con quelle del telecomando dello staff', async () => {
  const key = 'abcdefghijkmnpqrstuvwxyz23', s = 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', n = newStandNonce();
  const game = await standProof(key, 'game', n, s), phone = await standProof(key, 'phone', n, s);
  assert.match(game, /^[0-9a-f]{64}$/);
  assert.notEqual(game, phone);
  assert.notEqual(game, await remoteProof(key, 'game', n, s), 'non è la prova del telecomando');
  assert.notEqual(game, await standProof(key, 'game', newStandNonce(), s), 'un numero nuovo, una prova nuova');
  assert.notEqual(game, await standProof(key, 'game', n, 'racchetta-stand-zzzzzzzzzzzzzzzzzzzzzzzzzz'), 'legata all\'indirizzo');
  // il telefono risponde solo a una prova giusta del gioco, e con la sua
  const saved = { slot: 'p1', session: s, key };
  const ok = await standAnswer(saved, n, { t: 'proof', m: game, n: 'abcdefghijkmnpqrstuvwxyz23' });
  assert.deepEqual(ok, { ok: true, reply: { t: 'proof', m: await standProof(key, 'phone', 'abcdefghijkmnpqrstuvwxyz23', s) } });
  assert.deepEqual(await standAnswer(saved, n, { t: 'proof', m: phone, n: 'abcdefghijkmnpqrstuvwxyz23' }), { ok: false, why: 'proof' }, 'la prova del telefono rimandata indietro non vale');
  assert.deepEqual(await standAnswer(saved, n, { t: 'proof', m: game, n: 'x' }), { ok: false, why: 'bad' });
});

test('telefono: dati del posto salvati (validi o niente), hello senza chiave, benvenuto dell\'abbinamento, testi', () => {
  const m = new Map(), storage = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) };
  const st = createStandStore(storage);
  assert.equal(st.load(), null);
  assert.equal(st.save({ slot: 'p3', session: 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23' }), false, 'posto che non c\'è');
  assert.equal(st.save({ slot: 'p2', session: 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23', at: 5, as: -1 }), true);
  assert.deepEqual(st.load(), { slot: 'p2', session: 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23', at: 5, as: -1 });
  m.set(STAND.phoneKey, '{rotto'); assert.equal(st.load(), null);
  st.clear(); assert.equal(m.has(STAND.phoneKey), false);
  // la chiave non è mai nel saluto
  assert.deepEqual(standHello({ token: 'abc' }), { t: 'hello', v: 2, role: 'stand', k: 'abc' });
  assert.deepEqual(standHello({ nonce: 'n1', relink: true }), { t: 'hello', v: 2, role: 'stand', n: 'n1', rl: 1 });
  assert.equal(JSON.stringify(standHello({ nonce: 'n1' })).includes('key'), false);
  assert.deepEqual(standWelcome({ t: 'welcome', st: 1, s: 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23', slot: 'p1' }, 7), { slot: 'p1', session: 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23', at: 7 });
  assert.equal(standWelcome({ t: 'welcome', s: newSessionId(), key: 'abcdefghijkmnpqrstuvwxyz23', slot: 'p1' }), null, 'indirizzo della racchetta normale');
  assert.equal(standWelcome({ t: 'welcome', f: 1, st: 1, slot: 'p1' }), null, 'il benvenuto della ripresa non è un abbinamento');
  for (const w of ['expired', 'closed', 'refused', 'busy', 'insecure', 'replaced', 'unpaired', 'other', 'role', 'denied']) assert.ok(standDenyText(w, 'p2').length > 10);
  assert.match(standDenyText('replaced', 'p2'), /Telefono 2/);
  assert.deepEqual([slotLabel('p1'), slotLabel('p2'), gameStoreKey('p2')], ['Telefono 1', 'Telefono 2', 'natpf-tennis.stand.p2']);
});

/* ---------- gioco (link.js con stand) e telefono su una rete finta ---------- */

class Emitter { constructor(){ this.h = {}; } on(k, f){ (this.h[k] ||= []).push(f); return this; } emit(k, v){ for (const f of this.h[k] || []) f(v); } }
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
globalThis.window = { Peer };
globalThis.location = { search: '', href: 'https://192.168.1.5:8443/' };
const { createPhoneLink } = await import('../../site/js/tennis/link.js');
const fresh = () => { for (const p of [...NET.peers.values()]) p.destroy(); NET.peers.clear(); };
const game = (store = memory(), slot = 'p1') => ({ link: createPhoneLink({ stand: { slot, store } }), store });

// telefono dello stand come la pagina della racchetta (racchetta.js): abbinamento dal QR, poi ripresa con la prova
// (raw: nessun saluto, lo manda il test)
async function phoneTo(target, { token = null, saved = null, relink = false, raw = false } = {}){
  const p = new Peer(); await sleep(5);
  let failed = null; p.on('error', e => { failed = e.type; });
  const c = p.connect(target), out = { p, c, got: c.got, proved: false, get failed(){ return failed; } };
  let nonce = null;
  c.on('data', async d => { if (d.t === 'proof' && saved){ const r = await standAnswer(saved, nonce, d); if (r.ok){ out.proved = true; c.send(r.reply); } } });
  await until(() => c.open || failed, 1000);
  if (c.open && !raw){ nonce = newStandNonce(); c.send(standHello(token ? { token } : { nonce, relink })); }
  return out;
}
async function pairSlot(g){
  g.link.standPairing(true); await sleep(30);
  const info = g.link.standInfo();
  const ph = await phoneTo(info.pairId, { token: info.token });
  assert.ok(await until(() => ph.got.some(m => m.t === 'wait') && g.link.L.stand.request), 'numero da confermare');
  assert.equal(g.link.standConfirm(), true);
  assert.ok(await until(() => ph.got.some(m => m.t === 'welcome')));
  const saved = standWelcome(ph.got.find(m => m.t === 'welcome'));
  ph.p.destroy();
  return saved;
}

test('collegamento del gioco: abbinamento con la conferma, poi il telefono entra solo all\'indirizzo fisso con la prova della chiave', async () => {
  fresh();
  const g = game();
  await g.link.start(); await sleep(10);
  assert.equal(NET.peers.size, 0, 'posto non abbinato: nessun indirizzo in ascolto');
  assert.deepEqual([g.link.url(), g.link.token, g.link.session], [null, null, null], 'niente QR pubblico, niente codice');
  g.link.standPairing(true); await sleep(30);
  const info = g.link.standInfo();
  assert.ok(isStandPairId(info.pairId) && NET.peers.has(info.pairId), 'indirizzo dell\'abbinamento in ascolto a foglio aperto');
  // la racchetta normale (QR del gioco, una pagina vecchia) sull'indirizzo dello stand: rifiutata
  const old = await phoneTo(info.pairId, { raw: true }); old.c.send({ t: 'hello', v: 2, k: info.token });
  await until(() => old.got.length > 0);
  assert.deepEqual(old.got[0], { t: 'deny', why: 'role' });
  // il telefono dello stand con il QR: numero, ma niente posto finché lo staff non conferma
  const ph = await phoneTo(info.pairId, { token: info.token });
  assert.ok(await until(() => ph.got.some(m => m.t === 'wait')));
  const num = ph.got.find(m => m.t === 'wait').num;
  assert.ok(num >= 100 && num <= 999 && g.link.L.stand.request.num === num, 'lo stesso numero sul telefono e sul computer');
  assert.deepEqual([g.link.connected, g.link.L.stand.paired, g.store.value], [false, false, null]);
  assert.equal(g.link.standInfo(), null, 'niente QR in vista mentre si aspetta la conferma');
  assert.equal(g.link.standConfirm(), true);
  assert.ok(await until(() => ph.got.some(m => m.t === 'welcome')));
  const saved = standWelcome(ph.got.find(m => m.t === 'welcome'));
  assert.ok(saved && saved.slot === 'p1' && saved.session === g.store.value.session && saved.key === g.store.value.key);
  assert.ok(!JSON.stringify(info).includes(saved.session.slice(STAND.prefix.length)), 'l\'indirizzo fisso non era nel QR');
  assert.ok(await until(() => NET.peers.has(saved.session) && !NET.peers.has(info.pairId)), 'indirizzo fisso in ascolto, quello dell\'abbinamento chiuso');
  ph.p.destroy();
  // ripresa: prima la prova del gioco, poi quella del telefono, poi il benvenuto
  const back = await phoneTo(saved.session, { saved });
  assert.ok(await until(() => g.link.connected && back.got.some(m => m.t === 'welcome')), 'entrato con la prova');
  assert.equal(back.got[0].t, 'proof', 'il gioco prova la chiave per primo');
  assert.deepEqual(back.got.find(m => m.t === 'welcome'), { t: 'welcome', f: 1, st: 1, slot: 'p1' });
  assert.deepEqual([g.link.L.state, g.link.L.phone, g.link.L.resumed, g.link.L.pairs || 0], ['connected', 'sensors', true, 0], 'una ripresa: il tutorial non riparte');
  // dopo l'ingresso è una racchetta come le altre (stessi messaggi)
  const states = []; g.link.on('state', s => states.push(s.s));
  back.c.send({ t: 'st', s: 'ready', vis: 1 }); assert.ok(await until(() => g.link.ready && states.includes('ready')));
  g.link.stop(); back.p.destroy();
});

test('sicurezza: senza la chiave nessuno prende il posto (chi conosce l\'indirizzo fisso, chi rimanda una prova, chi presenta il QR vecchio)', async () => {
  fresh();
  const g = game(); await g.link.start();
  const saved = await pairSlot(g);
  await sleep(450);
  // indirizzo fisso noto, chiave sbagliata: il gioco prova la sua, il telefono non sa rispondere → rifiutato
  const thief = await phoneTo(saved.session, { saved: { ...saved, key: 'sbagliatasbagliatasbagliat' } });
  await until(() => thief.got.length > 0);
  assert.equal(thief.got[0].t, 'proof'); assert.equal(thief.proved, false, 'la prova del gioco non torna con un\'altra chiave');
  thief.c.send({ t: 'proof', m: thief.got[0].m });   // rimanda indietro la prova del gioco
  assert.ok(await until(() => thief.got.some(m => m.t === 'deny')));
  assert.deepEqual(thief.got.find(m => m.t === 'deny'), { t: 'deny', why: 'unpaired' });
  assert.equal(g.link.connected, false);
  // hello senza numero, o della racchetta normale, sull'indirizzo fisso: rifiutati
  const a = await phoneTo(saved.session, { raw: true }); a.c.send({ t: 'hello', v: 2, role: 'stand' });
  const b = await phoneTo(saved.session, { raw: true }); b.c.send({ t: 'hello', v: 2, k: 'abcdefghijkmnpqrstuvwxyz23' });
  assert.ok(await until(() => a.got.some(m => m.t === 'deny') && b.got.some(m => m.t === 'deny')));
  assert.deepEqual([a.got.find(m => m.t === 'deny').why, b.got.find(m => m.t === 'deny').why], ['unpaired', 'role']);
  // il QR fotografato dal ledwall prima della conferma: l'indirizzo dell'abbinamento non c'è più
  g.link.standPairing(true); await sleep(30);
  const shot = g.link.standInfo(); g.link.standPairing(false); await sleep(30);
  const late = await phoneTo(shot.pairId, { token: shot.token });
  assert.ok(await until(() => late.failed === 'peer-unavailable'), 'foglio chiuso: nessuno ascolta');
  assert.equal(g.link.connected, false);
  g.link.stop(); for (const x of [thief, a, b, late]) x.p.destroy();
});

test('gioco ricaricato o programma riavviato: stesso indirizzo, il telefono rientra senza QR; con l\'indirizzo ancora occupato si riprova', async () => {
  fresh();
  const store = memory();
  const g1 = game(store); await g1.link.start();
  const saved = await pairSlot(g1);
  await sleep(450);
  g1.link.stop();
  // riavvio: collegamento nuovo dallo stesso salvataggio, in ascolto subito allo stesso indirizzo
  const squat = new Peer(saved.session); await sleep(5);   // l'indirizzo è ancora del collegamento di prima (server lento a liberarlo)
  const g2 = game(store);
  assert.equal(g2.link.session, saved.session);
  g2.link.start(); await sleep(20);
  assert.equal(g2.link.L.state, 'retry', 'indirizzo occupato: si riprova');
  squat.destroy();
  assert.ok(await until(() => g2.link.L.state === 'waiting', STAND.idRetryMs + 2000), 'poi in ascolto');
  const back = await phoneTo(saved.session, { saved });
  assert.ok(await until(() => g2.link.connected));
  assert.equal(g2.link.L.pairs || 0, 0);
  g2.link.stop(); back.p.destroy();
});

test('riabbinare il posto esclude il telefono di prima (che lo sa); «Scollega» lo stesso; la stessa chiave in due schede: la prima si ferma', async () => {
  fresh();
  const g = game(); await g.link.start();
  const savedA = await pairSlot(g);
  await sleep(450);
  const A = await phoneTo(savedA.session, { saved: savedA });
  assert.ok(await until(() => g.link.connected));
  // la stessa chiave in un'altra scheda: entra, e la prima riceve «other» (niente tira e molla)
  const A2 = await phoneTo(savedA.session, { saved: savedA });
  assert.ok(await until(() => A.got.some(m => m.t === 'bye')));
  assert.deepEqual(A.got.find(m => m.t === 'bye'), { t: 'bye', why: 'other' });
  // lo staff abbina un altro telefono a questo posto
  g.link.standPairing(true); await sleep(30);
  const info = g.link.standInfo();
  const B = await phoneTo(info.pairId, { token: info.token });
  assert.ok(await until(() => B.got.some(m => m.t === 'wait')));
  assert.equal(g.link.connected, true, 'fino alla conferma il telefono di prima resta');
  g.link.standConfirm();
  assert.ok(await until(() => A2.got.some(m => m.t === 'bye')), 'il telefono di prima lo sa');
  assert.deepEqual(A2.got.find(m => m.t === 'bye'), { t: 'bye', why: 'replaced' });
  const savedB = standWelcome(B.got.find(m => m.t === 'welcome')) || await until(() => B.got.some(m => m.t === 'welcome')) && standWelcome(B.got.find(m => m.t === 'welcome'));
  assert.notEqual(savedB.session, savedA.session);
  await sleep(450);
  // il telefono di prima con la sua chiave: l'indirizzo vecchio non c'è più
  const again = await phoneTo(savedA.session, { saved: savedA });
  assert.ok(await until(() => again.failed === 'peer-unavailable'));
  // il nuovo entra
  const Bin = await phoneTo(savedB.session, { saved: savedB });
  assert.ok(await until(() => g.link.connected && Bin.got.some(m => m.t === 'welcome')));
  // «Scollega»: il telefono lo sa, il posto non c'è più
  g.link.forget();
  assert.ok(await until(() => Bin.got.some(m => m.t === 'bye')));
  assert.deepEqual(Bin.got.find(m => m.t === 'bye'), { t: 'bye', why: 'unpaired' });
  assert.deepEqual([g.link.L.stand.paired, g.link.session, g.store.value.key], [false, null, null]);
  assert.ok(await until(() => !NET.peers.has(savedB.session)), 'nessun indirizzo in ascolto');
  g.link.stop(); for (const x of [A, A2, B, again, Bin]) x.p.destroy();
});

test('«Rifiuta» e telefono che se ne va prima della conferma: si torna al QR nuovo (la scadenza dei 5 minuti: test del guardiano)', async () => {
  fresh();
  const g = game(); await g.link.start();
  g.link.standPairing(true); await sleep(30);
  const i1 = g.link.standInfo();
  const ph = await phoneTo(i1.pairId, { token: i1.token });
  assert.ok(await until(() => g.link.L.stand.request));
  assert.equal(g.link.standRefuse(), true);
  assert.ok(await until(() => ph.got.some(m => m.t === 'deny')));
  assert.deepEqual(ph.got.find(m => m.t === 'deny'), { t: 'deny', why: 'refused' });
  assert.ok(await until(() => g.link.standInfo() && g.link.standInfo().token !== i1.token), 'QR nuovo');
  const i2 = g.link.standInfo();
  const gone = await phoneTo(i2.pairId, { token: i2.token });
  assert.ok(await until(() => g.link.L.stand.request));
  gone.p.destroy();
  assert.ok(await until(() => !g.link.L.stand.request && g.link.standInfo()), 'se ne è andato: di nuovo il QR');
  g.link.stop(); ph.p.destroy();
});

test('la racchetta normale rifiuta un telefono dello stand (role stand), anche con il codice del QR giusto', async () => {
  fresh();
  const link = createPhoneLink(); await link.start(); await sleep(10);
  assert.equal(link.stand, null); assert.ok(link.url());
  const ph = await phoneTo(link.session, { raw: true }); ph.c.send({ t: 'hello', v: 2, role: 'stand', k: link.token });
  assert.ok(await until(() => ph.got.length > 0));
  assert.deepEqual(ph.got[0], { t: 'deny', why: 'role' });
  assert.equal(link.connected, false);
  link.stop(); ph.p.destroy();
});
