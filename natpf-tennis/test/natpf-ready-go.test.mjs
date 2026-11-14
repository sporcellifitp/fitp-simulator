// B41.6 · «Sono pronto» dai telefoni sulla pagina «Pronto per la partita» (natpf_ready_go.js): chi può toccarlo, la spunta
// sul computer, il conto alla rovescia di 3 s e la partita che parte da sola; un telefono che cade ferma il conto;
// «Gioca» resta per lo staff; con la calibrazione «Giocando» gli scambi di prova restano prima della pagina (B35).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, key } from './ui-world.mjs';
import { phoneLike, playWorld, playTrial, stroke, secondPhone } from './trial-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { readyGoIds, readyGoWhy, readyGoState, readyGoNote, readyGoChip, readyGoCancel, READY_GO } from '../src/natpf/natpf_ready_go.js';

/* ---------- funzioni pure ---------- */
test('chi gioca con il telefono sulla pagina: contro la CPU il Telefono 1, nello stesso schermo tutti e due; non altrove', () => {
  const page = { visible: true, step: 'match', controller: 'phone' };
  assert.deepEqual(readyGoIds({ ...page, mode: 'cpu' }), ['p1']);
  assert.deepEqual(readyGoIds({ ...page, mode: 'split' }), ['p1', 'p2']);
  assert.deepEqual(readyGoIds({ ...page, mode: 'split', webcam: true }), [], 'webcam per due');
  assert.deepEqual(readyGoIds({ ...page, mode: 'cpu', controller: 'webcam' }), []);
  assert.deepEqual(readyGoIds({ ...page, mode: 'friend' }), [], 'sfida tra due computer: c\'è già il suo «Sono pronto»');
  assert.deepEqual(readyGoIds({ ...page, mode: 'cpu', trial: true }), [], 'durante gli scambi di prova');
  assert.deepEqual(readyGoIds({ ...page, mode: 'cpu', step: 'connect' }), []);
  assert.deepEqual(readyGoIds({ ...page, mode: 'cpu', visible: false }), [], 'in campo');
  assert.deepEqual(readyGoIds({ ...page, mode: 'cpu', guest: true }), [], 'Player 2 dell\'invito');
});

test('stato, spunte, riga del telefono e motivo del conto fermato', () => {
  assert.equal(readyGoWhy({ connected: true, ready: true, health: { why: null } }), '');
  assert.equal(readyGoWhy({ connected: false }), 'telefono scollegato');
  assert.equal(readyGoWhy({ connected: true, ready: true, health: { why: 'pagina nascosta' } }), 'schermo del telefono spento');
  assert.equal(readyGoWhy({ connected: true, ready: true, health: { why: 'sensori fermi', gapMs: 900 } }), 'sensori fermi');
  assert.equal(readyGoWhy({ connected: true, ready: true, health: { why: 'sensori fermi', gapMs: 500 } }), '', 'un pacchetto in ritardo (sotto 700 ms) non annulla il tocco');
  assert.equal(READY_GO.stallMs, 700);
  assert.equal(readyGoWhy({ connected: true, ready: false }), 'telefono non pronto');
  const st = readyGoState([{ id: 'p1', name: 'Giulia', tapped: true }, { id: 'p2', name: '', tapped: true, why: 'telefono scollegato' }]);
  assert.deepEqual(st.list.map(p => [p.name, p.ok, p.tapped]), [['Giulia', true, true], ['Player 2', false, false]], 'chi cade non è pronto anche se aveva toccato');
  assert.equal(st.all, false);
  assert.equal(readyGoNote(st, 'p1'), 'Aspetto Player 2');
  assert.deepEqual(readyGoChip(st.list[0]), { cls: 'is-ok', text: 'Giulia pronto ✓' });
  assert.deepEqual(readyGoChip(st.list[1]), { cls: 'is-ko', text: 'Player 2: telefono scollegato' });
  assert.deepEqual(readyGoChip({ id: 'p1', name: 'Player 1', ok: true, tapped: false }, { solo: true }), { cls: 'is-wait', text: 'Telefono: tocca «Sono pronto»' });
  assert.equal(readyGoCancel(st), 'Conto annullato · Player 2: telefono scollegato');
  const all = readyGoState([{ id: 'p1', tapped: true }]);
  assert.equal(all.all, true); assert.equal(readyGoNote(all, 'p1'), 'Si parte tra poco…');
  assert.equal(readyGoState([]).all, false, 'nessuno, niente partenza');
});

/* ---------- nel gioco ---------- */
// il tocco su «Sono pronto» arriva come «next» dal collegamento del telefono (link.js nx y 1 → NatpfPhoneRacket)
const tap = P => { if (P.nextOffer) for (const fn of P.nextListeners) fn(P); };
const offers = link => link.sent.filter(m => m.t === 'nx');
const counts = link => link.sent.filter(m => m.t === 'ev' && m.k === 'count');

test('contro la CPU («Nessuna»): sulla pagina il telefono riceve «Sono pronto»; al tocco la spunta, il conto di 3 s e la partita da sola', async () => {
  const w = await playWorld({ cal: 'none' }), { E, ui, lobby, link, P } = w;
  assert.ok(lobby.visible && lobby.step === 'match' && P.ready, 'pagina «Pronto per la partita»');
  w.advance(300);
  assert.deepEqual(offers(link).at(-1), { t: 'nx', on: 1, lb: READY_GO.label, rd: 1, me: 0 }, 'offerta «Sono pronto»');
  assert.ok(!$('ready-go').classList.contains('hidden'));
  assert.match($('ready-go').innerHTML, /tocca «Sono pronto»/);
  assert.equal(E.natpfMatchSeq || 0, 0);
  tap(P); w.advance(200);
  assert.deepEqual(offers(link).at(-1), { t: 'nx', on: 1, lb: READY_GO.done, rd: 1, me: 1, tx: 'Si parte tra poco…' });
  assert.match($('ready-go').innerHTML, /Telefono pronto ✓/);
  assert.ok(ui.readyGo.cd.running && !$('ready-go-count').classList.contains('hidden'), 'conto alla rovescia in vista');
  assert.deepEqual(counts(link).map(m => m.n), [3], 'annunciato al telefono');
  w.advance(1500); assert.equal(E.natpfMatchSeq || 0, 0, 'non prima dei 3 s');
  w.advance(1800);
  assert.equal(E.natpfMatchSeq, 1, 'la partita è partita da sola');
  assert.ok(!lobby.visible);
  assert.deepEqual(counts(link).map(m => m.n), [3, 2, 1, 0]);
  assert.deepEqual(offers(link).at(-1), { t: 'nx', on: 0 }, 'offerta tolta');
  assert.ok($('ready-go').classList.contains('hidden') && $('ready-go-count').classList.contains('hidden'));
  // un tocco fuori dalla pagina non fa niente
  const seq = E.natpfMatchSeq; tap(P); w.advance(4000); assert.equal(E.natpfMatchSeq, seq);
});

test('il telefono che cade durante il conto lo ferma (e il suo tocco non vale più); «Gioca» resta per lo staff', async () => {
  const w = await playWorld({ cal: 'none' }), { E, ui, lobby, link, P } = w;
  w.advance(300); tap(P); w.advance(1200);
  assert.ok(ui.readyGo.cd.running);
  link.connected = false; link.ready = false; link.L = { state: 'lost', phone: null }; w.advance(300);
  assert.ok(!ui.readyGo.cd.running && $('ready-go-count').classList.contains('hidden'), 'conto fermato');
  assert.match($('ready-go').innerHTML, /Conto annullato · telefono: telefono scollegato/);
  w.advance(4000); assert.equal(E.natpfMatchSeq || 0, 0, 'nessuna partita');
  // torna: deve toccare di nuovo
  link.connected = true; link.ready = true; link.L = { state: 'connected', phone: 'ready' }; w.advance(300);
  assert.equal(ui.readyGo.taps.p1, false); assert.ok(!ui.readyGo.cd.running);
  assert.deepEqual(offers(link).at(-1), { t: 'nx', on: 1, lb: READY_GO.label, rd: 1, me: 0 });
  // lo staff può sempre premere «Gioca»
  assert.equal(w.pressStart(), true); w.advance(300);
  assert.equal(E.natpfMatchSeq, 1); assert.ok(!lobby.visible);
});

test('computer fermo per un attimo: i sensori «fermi» per meno di 300 ms non annullano il tocco; fermi davvero sì', async () => {
  const w = await playWorld({ cal: 'none' }), { ui, P } = w;
  w.advance(300); tap(P); w.advance(200);
  assert.ok(ui.readyGo.cd.running);
  const real = P.link.stats;
  // il flusso dei sensori sembra fermo da 1,2 s (il computer era occupato): un giro solo, poi i dati arrivano
  P.link.stats = () => ({ rates: { sm: { ageMs: 1200 } }, rtt: 20 });
  ui.readyGo.tick(); P.link.stats = real; w.advance(200);
  assert.ok(ui.readyGo.taps.p1 && ui.readyGo.cd.running, 'il tocco resta e il conto continua');
  // fermi davvero (più di 300 ms): il tocco non vale più
  P.link.stats = () => ({ rates: { sm: { ageMs: 1500 } }, rtt: 20 });
  w.advance(500);
  assert.ok(!ui.readyGo.taps.p1 && !ui.readyGo.cd.running, 'annullato');
  assert.match($('ready-go').innerHTML, /sensori fermi/);
  P.link.stats = real;
});

test('«Aspetta» (o Esc) ferma il conto: tutti ritoccano; Esc senza conto resta «indietro»', async () => {
  const w = await playWorld({ cal: 'none' }), { E, ui, link, P } = w;
  w.advance(300); tap(P); w.advance(500);
  assert.ok(ui.readyGo.cd.running);
  key('Escape', 'Escape'); w.advance(200);
  assert.ok(!ui.readyGo.cd.running && !ui.readyGo.taps.p1);
  assert.deepEqual(counts(link).at(-1), { t: 'ev', k: 'count', stop: 1, soft: 1, txt: 'Partenza fermata sul computer.' });
  assert.equal(w.lobby.step, 'match', 'Esc ha fermato il conto, non è tornato indietro');
  w.advance(4000); assert.equal(E.natpfMatchSeq || 0, 0);
  tap(P); w.advance(3400); assert.equal(E.natpfMatchSeq, 1, 'ritoccato: parte');
});

test('«Giocando»: gli scambi di prova restano PRIMA della pagina; durante non c\'è «Sono pronto», dopo sì e la partita parte senza rifarli', async () => {
  const w = await playWorld(), { E, ui, lobby, link, P } = w;
  assert.ok(ui.trial.active, 'scambi di prova prima della pagina (B35)');
  w.advance(300);
  assert.equal(offers(link).some(m => m.rd === 1), false, 'durante gli scambi di prova niente «Sono pronto»');
  const r = playTrial(w, (id, n, want) => stroke({ dir: want }), { gioca: false });
  assert.ok(r.page && lobby.step === 'match');
  w.advance(300);
  assert.deepEqual(offers(link).at(-1), { t: 'nx', on: 1, lb: READY_GO.label, rd: 1, me: 0 });
  const c0 = link.cmds.length;
  tap(P); w.advance(3400);
  assert.equal(E.natpfMatchSeq, 1); assert.ok(!ui.trial.active, 'niente scambi di prova da capo');
  assert.deepEqual(link.cmds.slice(c0), [], 'profilo imparato tenuto');
});

test('stesso schermo: tutti e due devono toccare; la spunta di chi è pronto; poi il conto e la partita in due', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'none' }), { E, ui, lobby, link } = w, P1 = ui.phone;
  const { P2, l2 } = secondPhone(E, NatpfPhoneRacket);
  phoneLike(P1, link); P1.markTutorialSeen('short'); P2.markTutorialSeen('short');
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint(); w.advance(300);
  link.cmd('skip'); l2.cmd('skip'); w.advance(300);
  lobby.go('match'); w.advance(300);
  assert.equal(lobby.step, 'match');
  assert.ok(offers(link).at(-1)?.rd === 1 && offers(l2).at(-1)?.rd === 1, 'offerta a tutti e due');
  tap(P1); w.advance(200);
  assert.deepEqual(offers(link).at(-1), { t: 'nx', on: 1, lb: READY_GO.done, rd: 1, me: 1, tx: 'Aspetto Player 2' });
  assert.match($('ready-go').innerHTML, /Player 1 pronto ✓/); assert.match($('ready-go').innerHTML, /Player 2: tocca «Sono pronto»/);
  assert.ok(!ui.readyGo.cd.running, 'manca il Player 2');
  w.advance(4000); assert.equal(E.natpfMatchSeq || 0, 0);
  tap(P2); w.advance(200);
  assert.ok(ui.readyGo.cd.running);
  w.advance(3300);
  assert.equal(E.natpfMatchSeq, 1); assert.ok(E.natpfSplit?.active, 'partita nello stesso schermo');
});

test('un telefono di prima (che non conosce «Sono pronto») non rompe niente: resta «Gioca»; i tocchi senza offerta non contano', async () => {
  const w = await playWorld({ cal: 'none' }), { E, ui, P } = w;
  w.advance(300);
  // nessun tocco: niente conto, niente partita
  w.advance(5000); assert.equal(E.natpfMatchSeq || 0, 0); assert.ok(!ui.readyGo.cd.running);
  // un «next» senza offerta (pagina di prima che tocca altro) non conta
  P.offerNext(null); for (const fn of P.nextListeners) fn(P);
  assert.equal(ui.readyGo.taps.p1, false);
  assert.equal(w.pressStart(), true); w.advance(300); assert.equal(E.natpfMatchSeq, 1);
});
