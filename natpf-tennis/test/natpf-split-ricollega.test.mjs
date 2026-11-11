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
  // tutorial già visto dai due (qui conta la partita): con il tutorial aperto «Gioca» non parte (bothReady come le schede)
  E.natpfPhone.markTutorialSeen(); P2.markTutorialSeen();
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

// Revisione B9 (06/11), minore d: stesso schermo con gli schermi spenti su tutti e due i telefoni. Il riquadro della
// pausa è uno: prima il P1 (natpf_ui._refreshPhoneHold) e il P2 (_watchP2) lo ridisegnavano ognuno con il suo testo e i
// testi si alternavano ogni secondo; la ripresa di uno lo toglieva anche con l'altro ancora in pausa
test('stesso schermo: due telefoni con lo schermo spento → un riquadro con tutti e due, stabile; la ripresa di uno lascia l\'altro', async () => {
  const w = await splitMatch(), { E, ui, link, l2 } = w;
  w.advance(500);
  link.L.vis = false; link.L.hiddenAt = performance.now(); E.natpfPhone._changed();
  w.advance(700);
  l2.L.vis = false; l2.L.hiddenAt = performance.now(); w.P2._changed();
  w.advance(1500);
  assert.ok(ui.phoneHold && ui.split.hold, 'tutti e due in pausa');
  const el = holdEl(), seen = new Set();
  for (let i = 0; i < 40; i++){
    w.advance(100);
    const t = el.querySelector('p').textContent;
    assert.equal(el.querySelector('b').textContent, 'Partita in pausa');
    assert.match(t, /^Telefono del Player 1 in pausa: .+\nTelefono del Player 2 in pausa: .+$/, t);
    seen.add(t);
  }
  assert.ok(seen.size >= 3, 'il «da quanto» va avanti (ogni secondo)');
  assert.equal(el.querySelector('button').textContent, 'Ricollega il telefono del Player 1');
  assert.equal(el.querySelector('[data-hold-second]').textContent, 'Ricollega il telefono del Player 2');
  assert.equal(el.querySelector('[data-hold-second]').classList.contains('hidden'), false);
  // il P2 riaccende: conto e ripresa del P2, il riquadro resta per il P1 (e la partita resta in pausa)
  l2.L.vis = true; w.P2._changed();
  w.advance(4000);
  assert.equal(ui.split.hold, null);
  assert.ok(!el.classList.contains('hidden'), 'il P1 è ancora in pausa: il riquadro resta');
  assert.equal(el.querySelector('b').textContent, 'Telefono del Player 1 in pausa');
  assert.equal(el.querySelector('button').textContent, 'Ricollega il telefono');
  assert.equal(el.querySelector('[data-hold-second]').classList.contains('hidden'), true);
  assert.equal(E.natpfPaused, true);
  // il P1 riaccende: niente più riquadro
  link.L.vis = true; E.natpfPhone._changed();
  w.advance(4000);
  assert.ok(el.classList.contains('hidden')); assert.equal(E.natpfPaused, false);
});

// Revisione B9 (06/11), minore: con due pause, il P1 riaccende mentre il P2 è ancora spento. Prima la sua riga diceva
// «Telefono di nuovo pronto: Si riprende tra 3…» (di chi? e la partita non riprendeva: il P2 era ancora in pausa)
test('stesso schermo, due pause: chi è di nuovo pronto mentre l\'altro è in pausa dice di chi è e non «Si riprende tra…»', async () => {
  const w = await splitMatch(), { E, ui, link, l2 } = w;
  w.advance(500);
  link.L.vis = false; link.L.hiddenAt = performance.now(); E.natpfPhone._changed();
  l2.L.vis = false; l2.L.hiddenAt = performance.now(); w.P2._changed();
  w.advance(2000);
  assert.ok(ui.phoneHold && ui.split.hold, 'tutti e due in pausa');
  const el = holdEl();
  // il P1 riaccende: durante il suo conto la riga dice di chi è e che si aspetta il P2, mai «Si riprende tra»
  link.L.vis = true; E.natpfPhone._changed();
  let seenWait = false;
  for (let i = 0; i < 50; i++){
    w.advance(100);
    const t = el.querySelector('p').textContent;
    assert.doesNotMatch(t, /Si riprende tra/, t);
    if (/^Telefono del Player 1 di nuovo pronto: aspetto il telefono del Player 2\nTelefono del Player 2 in pausa: .+$/.test(t)) seenWait = true;
    assert.equal(E.natpfPaused, true, 'la partita resta ferma: il P2 è ancora in pausa');
  }
  assert.ok(seenWait, 'riga del P1 «di nuovo pronto», con chi si aspetta');
  // conto del P1 finito: resta solo la pausa del P2
  assert.equal(ui.phoneHold, null);
  assert.equal(el.querySelector('b').textContent, 'Telefono del Player 2 in pausa');
  assert.doesNotMatch(el.querySelector('p').textContent, /Si riprende tra/);
  // il P2 riaccende: ora sì, «Si riprende tra…» (è l'ultima pausa), poi si gioca
  l2.L.vis = true; w.P2._changed();
  let seenCount = false;
  for (let i = 0; i < 40 && !el.classList.contains('hidden'); i++){
    w.advance(100);
    if (!el.classList.contains('hidden') && /^Si riprende tra \d…$/.test(el.querySelector('p').textContent)){ seenCount = true; assert.equal(el.querySelector('b').textContent, 'Telefono del Player 2 di nuovo pronto'); }
  }
  assert.ok(seenCount, 'conto della ripresa del P2');
  w.advance(1000);
  assert.ok(el.classList.contains('hidden')); assert.equal(E.natpfPaused, false);
});

test('stesso schermo, due pause: conto del P2 con il P1 ancora in pausa → riga del P2 senza «Si riprende tra…»; tutti e due nel conto: ognuno il suo', async () => {
  const { ui } = await makeWorld({ controller: 'phone' });
  ui._paintHold('Telefono del Player 1 in pausa', 'Schermo spento da 3 s', null, 'p1');
  ui._paintHold('Telefono del Player 2 di nuovo pronto', 'Si riprende tra 2…', null, 'p2', { count: 2 });
  const el = holdEl();
  assert.equal(el.querySelector('b').textContent, 'Partita in pausa');
  assert.equal(el.querySelector('p').textContent, 'Telefono del Player 1 in pausa: Schermo spento da 3 s\nTelefono del Player 2 di nuovo pronto: aspetto il telefono del Player 1');
  ui._paintHold('Telefono del Player 1 di nuovo pronto', 'Si riprende tra 3…', null, 'p1', { count: 3 });
  assert.equal(el.querySelector('p').textContent, 'Telefono del Player 1 di nuovo pronto: Si riprende tra 3…\nTelefono del Player 2 di nuovo pronto: Si riprende tra 2…');
  ui._paintHold(null, '', null, 'p1'); ui._paintHold(null, '', null, 'p2');
  assert.ok(el.classList.contains('hidden'));
});

/* ---------- B20 (audit B19, punto 10): telefono caduto nello stesso schermo ---------- */
import { phoneOf, holdTitle, otherPhoneNote } from '../src/natpf/natpf_phone_watch.js';
import { rematchLine } from '../src/natpf/natpf_split_ui.js';

test('B20 A3: nomi nei testi della pausa (funzioni pure)', () => {
  assert.equal(phoneOf('Giulia'), 'di Giulia');
  assert.equal(phoneOf('Player 2'), 'del Player 2');
  assert.equal(phoneOf(''), '');
  assert.equal(holdTitle('Giulia'), 'Telefono di Giulia in pausa');
  assert.equal(holdTitle('Player 1'), 'Telefono del Player 1 in pausa');
  assert.equal(holdTitle(''), 'Telefono in pausa', 'fuori dallo stesso schermo come prima');
  assert.equal(holdTitle('Giulia', 'ready'), 'Telefono di Giulia di nuovo pronto');
  assert.equal(holdTitle('', 'ready'), 'Telefono di nuovo pronto');
  assert.equal(otherPhoneNote('Giulia'), 'Partita in pausa: telefono di Giulia da ricollegare. Aspetta, si riprende da soli.');
});

test('B20 A3: telefono del Player 2 scollegato → riquadro con il nome e il suo QR, avviso al telefono del Player 1, niente pannello', async () => {
  const w = await splitMatch(), { E, ui, link, l2 } = w;
  E.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' };
  w.advance(500);
  link.sent.length = 0;
  l2.connected = false; l2.ready = false; l2.L.state = 'lost'; w.P2._changed();
  w.advance(1500);
  assert.ok(ui.split.hold, 'pausa per il P2'); assert.equal(E.natpfPaused, true);
  const el = holdEl();
  assert.equal(el.querySelector('b').textContent, 'Telefono di Giulia in pausa');
  // QR del telefono caduto dentro il riquadro, con il nome; quello del P1 (collegato) resta nascosto
  assert.equal(el.querySelector('[data-hold-qrs]').classList.contains('hidden'), false);
  assert.equal(el.querySelector('[data-hold-qr="p2"]').classList.contains('hidden'), false);
  assert.equal(el.querySelector('[data-hold-qr="p1"]').classList.contains('hidden'), true);
  assert.equal(el.querySelector('[data-hold-qr="p2"]').querySelector('figcaption').textContent, 'Telefono di Giulia: inquadra questo QR');
  assert.equal(el.classList.contains('with-qr'), true);
  // il telefono del Player 1 sa che la partita è ferma e per chi
  const ph = link.sent.filter(m => m.t === 'ph' && m.ph === 'pause');
  assert.equal(ph.length, 1);
  assert.equal(ph[0].txt, 'Partita in pausa: telefono di Giulia da ricollegare. Aspetta, si riprende da soli.');
  assert.equal(E.natpfPhone.lastPhase, 'pause');
  // il telefono torna: QR via, ripresa, e al Player 1 torna la fase vera
  link.sent.length = 0;
  l2.connected = true; l2.ready = true; l2.L.state = 'connected'; w.P2._changed();
  w.advance(4500);
  assert.equal(ui.split.hold, null); assert.equal(E.natpfPaused, false);
  assert.ok(el.classList.contains('hidden'));
  assert.ok(link.sent.some(m => m.t === 'ph' && m.ph !== 'pause'), 'fase vera di nuovo al telefono del P1');
});

test('B20 A3: telefono del Player 1 scollegato nello stesso schermo → QR nel riquadro (non il pannello che veniva coperto), avviso al Player 2', async () => {
  const w = await splitMatch(), { E, ui, link, l2 } = w;
  E.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' };
  w.advance(500);
  l2.sent.length = 0;
  link.connected = false; link.ready = false; link.L.state = 'lost'; E.natpfPhone._changed();
  w.advance(1500);
  assert.ok(ui.phoneHold, 'pausa per il P1');
  const el = holdEl();
  assert.equal(el.querySelector('b').textContent, 'Telefono di Marco in pausa');
  assert.equal(el.querySelector('[data-hold-qr="p1"]').classList.contains('hidden'), false);
  assert.equal(el.querySelector('[data-hold-qr="p2"]').classList.contains('hidden'), true);
  assert.ok(!ui.phoneDropOpened, 'il pannello del telefono non si apre sopra le due metà');
  assert.equal(l2.sent.filter(m => m.t === 'ph' && m.ph === 'pause' && /telefono di Marco/.test(m.txt)).length, 1);
});

/* ---------- B20: rivincita dai telefoni ---------- */
test('B20 E: riga della rivincita sul grande schermo (funzione pura)', () => {
  const n = { p1: 'Marco', p2: 'Giulia' };
  assert.equal(rematchLine({}, n), 'Rivincita dai telefoni: toccate «Rivincita» tutti e due');
  assert.equal(rematchLine({ p1: true }, n), 'Marco vuole la rivincita · manca Giulia');
  assert.equal(rematchLine({ p2: true }, n), 'Giulia vuole la rivincita · manca Marco');
  assert.equal(rematchLine({ p1: true, p2: true }, n), 'Rivincita!');
});

test('B20 E: a fine partita i due telefoni ricevono «Rivincita»; parte quando l\'hanno chiesta tutti e due', async () => {
  const w = await splitMatch(), { E, ui, link, l2 } = w;
  E.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' };
  w.advance(500);
  const tap = p => { for (const fn of p.rematchListeners) fn(p); };
  // in partita il tocco non vale e nessuno ha ricevuto l'offerta
  tap(w.P2);
  assert.deepEqual(ui.split.rematch, { p1: false, p2: false });
  assert.equal(link.sent.filter(m => m.t === 'rm').length, 0);
  // fine partita
  const seq = E.natpfMatchSeq;
  E.score.playerGames = 0; E.score.opponentGames = 1; E.phase = 'MATCH_OVER';
  link.sent.length = 0; l2.sent.length = 0;
  w.advance(300);
  assert.deepEqual(link.sent.filter(m => m.t === 'rm'), [{ t: 'rm', on: 1, me: 0, ot: 0, nm: 'Giulia' }]);
  assert.deepEqual(l2.sent.filter(m => m.t === 'rm'), [{ t: 'rm', on: 1, me: 0, ot: 0, nm: 'Marco' }]);
  const line = document.getElementById('victory-rematch');
  assert.equal(line.classList.contains('hidden'), false);
  assert.equal(line.textContent, 'Rivincita dai telefoni: toccate «Rivincita» tutti e due');
  // la chiede Giulia: si vede sul grande schermo e lo sa il telefono di Marco
  tap(w.P2); w.advance(200);
  assert.deepEqual(ui.split.rematch, { p1: false, p2: true });
  assert.equal(line.textContent, 'Giulia vuole la rivincita · manca Marco');
  assert.deepEqual(link.sent.filter(m => m.t === 'rm').at(-1), { t: 'rm', on: 1, me: 0, ot: 1, nm: 'Giulia' });
  assert.deepEqual(l2.sent.filter(m => m.t === 'rm').at(-1), { t: 'rm', on: 1, me: 1, ot: 0, nm: 'Marco' });
  assert.equal(E.phase, 'MATCH_OVER', 'con uno solo non parte');
  tap(w.P2); w.advance(200);   // un secondo tocco non cambia niente
  assert.equal(E.phase, 'MATCH_OVER');
  // la chiede anche Marco: partita nuova, stesso schermo, punteggio da capo, pulsante tolto dai telefoni
  tap(E.natpfPhone); w.advance(200);
  assert.equal(E.natpfMatchSeq, seq + 1, 'partita nuova');
  assert.ok(['SERVE_STANCE', 'SERVE_TOSS'].includes(E.phase), E.phase);
  assert.equal(E.natpfSplit.active, true);
  assert.deepEqual([E.score.playerGames, E.score.opponentGames, E.score.playerPoints, E.score.opponentPoints], [0, 0, 0, 0]);
  assert.deepEqual(ui.split.rematch, { p1: false, p2: false });
  assert.deepEqual(link.sent.filter(m => m.t === 'rm').at(-1), { t: 'rm', on: 0 });
  assert.deepEqual(l2.sent.filter(m => m.t === 'rm').at(-1), { t: 'rm', on: 0 });
  assert.equal(line.classList.contains('hidden'), true);
});

test('B20 E: «Gioca ancora» sul computer resta com\'era (pagina «Partita») e toglie la rivincita dai telefoni', async () => {
  const w = await splitMatch(), { E, ui, link, l2 } = w;
  w.advance(500);
  E.score.playerGames = 1; E.phase = 'MATCH_OVER';
  w.advance(300);
  for (const fn of w.P2.rematchListeners) fn(w.P2);
  w.advance(200);
  assert.equal(ui.split.rematch.p2, true);
  link.sent.length = 0; l2.sent.length = 0;
  document.getElementById('btn-play-again').click();
  w.advance(300);
  assert.equal(E.natpfSplit.active, false, 'si torna al menu, pagina «Partita»');
  assert.equal(ui.lobby.step, 'match');
  assert.deepEqual(ui.split.rematch, { p1: false, p2: false });
  assert.deepEqual(l2.sent.filter(m => m.t === 'rm').at(-1), { t: 'rm', on: 0 });
});
