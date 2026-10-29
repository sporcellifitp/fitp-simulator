// Diagnostica del 29/10, 10:47 (stesso schermo, due telefoni): a metà di uno scambio la partita si è fermata 16 s per il
// telefono del Player 2, che intanto era su «Pronto»; poi lo scambio è ripartito da dove era fermo e il punto è andato
// al P2. Il computer non riceveva più il movimento del P2 (canale veloce dei sensori), il canale affidabile sì.
// Qui: salute del telefono che distingue i sensori fermi dal canale veloce bloccato, ricollegamento automatico e
// pulsante «Ricollega il telefono», punto rigiocato anche per il P2 (e per il P1 nello stesso schermo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './ui-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { phoneHealth, createResync, RESYNC, WATCH } from '../src/natpf/natpf_phone_watch.js';

test('salute: movimento che non arriva con il telefono che dice di avere i sensori → la partita va avanti (canale)', () => {
  const stale = { fo: { ageMs: 900 }, bin: { ageMs: 950 } };
  // telefono di prima (senza segnale dei sensori): come sempre, sensori fermi
  assert.deepEqual(phoneHealth({ connected: true, phone: 'ready', rates: stale }).why, 'sensori fermi');
  // telefono aggiornato: ultimo campione 30 ms fa, segnale di 400 ms fa, collegamento rapido
  const h = phoneHealth({ connected: true, phone: 'ready', rates: stale, sensorAge: 30, beatAgeMs: 400, rtt: 9 });
  assert.equal(h.ok, true); assert.equal(h.degraded, 'canale');
  // sensori fermi sul telefono, segnale vecchio o collegamento lento: pausa
  assert.equal(phoneHealth({ connected: true, phone: 'ready', rates: stale, sensorAge: WATCH.phoneSensorMs + 500, beatAgeMs: 400 }).why, 'sensori fermi');
  assert.equal(phoneHealth({ connected: true, phone: 'ready', rates: stale, sensorAge: 30, beatAgeMs: WATCH.beatMs + 100 }).why, 'sensori fermi');
  assert.equal(phoneHealth({ connected: true, phone: 'ready', rates: stale, sensorAge: 30, beatAgeMs: 400, rtt: WATCH.rttMax + 50 }).why, 'sensori fermi');
  // flusso regolare: nessun degrado
  assert.deepEqual(phoneHealth({ connected: true, phone: 'ready', rates: { fo: { ageMs: 20 } }, sensorAge: 30, beatAgeMs: 400 }), { ok: true, why: null });
});

test('ricollegamento automatico: dopo afterMs di movimento assente, non più spesso di everyMs, a partita in corso solo tra i punti', () => {
  const R = createResync(), fermi = { ok: false, why: 'sensori fermi' }, canale = { ok: true, why: null, degraded: 'canale' };
  assert.equal(R.update(fermi, { paused: true, now: 0 }), false);
  assert.equal(R.update(fermi, { paused: true, now: RESYNC.afterMs - 1 }), false);
  assert.equal(R.update(fermi, { paused: true, now: RESYNC.afterMs }), true, 'in pausa: subito dopo afterMs');
  assert.equal(R.update(fermi, { paused: true, now: RESYNC.afterMs + 100 }), false);
  assert.equal(R.update(fermi, { paused: true, now: RESYNC.afterMs*2 + 200 }), false, 'non prima di everyMs');
  assert.equal(R.update(fermi, { paused: true, now: RESYNC.afterMs + RESYNC.everyMs + 1 }), true);
  // canale bloccato con la partita che va avanti: durante lo scambio no, al punto finito sì
  const C = createResync();
  C.update(canale, { busy: true, now: 0 });
  assert.equal(C.update(canale, { busy: true, now: 5000 }), false);
  assert.equal(C.update(canale, { busy: false, now: 5100 }), true);
  // tutto a posto: niente
  const ok = createResync();
  for (let t = 0; t < 20000; t += 500) assert.equal(ok.update({ ok: true, why: null }, { now: t }), false);
});

// telefono finto del P2: flusso dei sensori (fo) fresco o fermo, segnale del telefono con l'età dei suoi sensori
function fakeLink2(){
  const l = { connected: true, ready: true, session: 's2', token: 't2', sent: [], cmds: [], relinks: 0, streamStopAt: null, beat: false,
    L: { state: 'connected', phone: 'ready' },
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){},
    relink(){ this.relinks++; return true; },
    stats(){ return { rates: { fo: { ageMs: this.streamStopAt == null ? 12 : performance.now() - this.streamStopAt } }, rtt: 8 }; } };
  Object.defineProperty(l.L, 'beatAt', { get: () => (l.beat ? performance.now() - 300 : undefined), enumerable: true });
  Object.defineProperty(l.L, 'sensorAge', { get: () => (l.beat ? 25 : undefined), enumerable: true });
  return l;
}
async function splitMatch(){
  const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = fakeLink2();
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint();
  E.natpfPhone._onCal({ kind: 'review', pass: true });
  lobby.next(); assert.equal(w.pressStart(), true); assert.equal(E.natpfSplit.active, true);
  return { ...w, P2, l2 };
}
const holdEl = () => document.getElementById('natpf-phone-hold');

test('stesso schermo: movimento del P2 fermo nello scambio → pausa con «Ricollega il telefono», ricollegamento automatico, punto rigiocato', async () => {
  const w = await splitMatch(), { E, ui, l2 } = w;
  w.advance(500);
  const score = JSON.stringify(E.score);
  E.phase = 'RALLY'; l2.streamStopAt = performance.now();
  w.advance(900);
  assert.ok(ui.split.hold, 'pausa per il P2'); assert.equal(E.natpfPaused, true);
  const el = holdEl(), btn = el.querySelector('button');
  assert.match(el.querySelector('b').textContent, /Player 2/);
  assert.equal(btn.classList.contains('hidden'), false); assert.equal(btn.textContent, 'Ricollega il telefono');
  // il pulsante chiede al telefono di rifare il collegamento
  btn.click();
  assert.equal(l2.relinks, 1, 'ricollega a mano');
  // senza il pulsante: dopo afterMs in pausa il computer lo chiede da solo
  w.advance(RESYNC.afterMs + 500);
  assert.equal(l2.relinks, 2, 'ricollega da solo');
  // il movimento torna: conto alla rovescia, ripresa, punto rigiocato (stesso punteggio, di nuovo al servizio)
  l2.streamStopAt = null;
  w.advance(4000);
  assert.equal(ui.split.hold, null); assert.equal(E.natpfPaused, false);
  assert.equal(JSON.stringify(E.score), score, 'stesso punteggio');
  assert.ok(['SERVE_STANCE', 'SERVE_TOSS'].includes(E.phase), `punto rigiocato: ${E.phase}`);
});

test('stesso schermo: canale veloce del P2 bloccato ma telefono che dice di avere i sensori → nessuna pausa', async () => {
  const w = await splitMatch(), { E, ui, l2 } = w;
  w.advance(500);
  E.phase = 'RALLY'; l2.beat = true; l2.streamStopAt = performance.now();
  w.advance(2000);
  assert.equal(ui.split.hold, null, JSON.stringify({ p2: ui.split.hold, p1: ui.phoneHold }));
  assert.ok(!E.natpfPaused, JSON.stringify({ p1: ui.phoneHold, webcam: ui.webcamHold }));
});

test('«Ricollega» tiene i riferimenti della mira (stessa pagina); un collegamento nuovo (pagina ricaricata) li azzera', () => {
  const E = { playerRole: 'p1', motionController: null };
  const P = new NatpfPhoneRacket(E);
  const L = { state: 'connected', phone: 'ready', joins: 1 };
  P.link = { connected: true, L, send(){}, cmd(){} };
  P._sendGrip();
  for (let i = 0; i < 4; i++) P.aimModel.add(1, 10);
  assert.ok(P.aimModel.center(1) != null);
  Object.assign(L, { joins: 2, relinked: true }); P._sendGrip();
  assert.ok(P.aimModel.center(1) != null, 'ricollegato: il centro resta');
  Object.assign(L, { joins: 3, relinked: false }); P._sendGrip();
  assert.equal(P.aimModel.center(1), null, 'pagina ricaricata: si reimpara');
});
