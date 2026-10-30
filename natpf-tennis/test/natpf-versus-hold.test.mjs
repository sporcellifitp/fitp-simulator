// Sfida tra due computer: partita ferma per tutti e due quando uno non può giocare (diagnosi del 30/10). Prima l'host
// vedeva solo il computer del Player 2: con il telefono del P2 scollegato la partita andava avanti e il P2 non poteva
// colpire. Ora il P2 dice perché non può giocare, l'host ferma la partita, riprende con il conto alla rovescia e rigioca
// lo scambio interrotto (stesso punteggio, stesso battitore).
// node --import ./test/register.mjs --test test/natpf-versus-hold.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, fetches, visible } from './ui-world.mjs';
import { p2HoldWhy, createHoldReporter, opponentHealth, hostHoldText, guestHoldNotice, HOLD_GRACE_MS } from '../src/natpf/natpf_versus.js';
import { createMatchRelay } from '../scripts/match-relay.mjs';
import { createLocalRelay } from '../src/natpf/natpf_p2p.js';

test('P2: perché non può giocare (telefono, finestra nascosta), detto dopo la tolleranza o subito se lo sa da sé', () => {
  assert.equal(p2HoldWhy({ playing: false, hidden: true }), null, 'fuori dalla partita non si ferma niente');
  assert.equal(p2HoldWhy({ playing: true, hidden: true, health: { ok: true } }), 'computer nascosto');
  assert.equal(p2HoldWhy({ playing: true, health: { ok: false, why: 'sensori fermi' } }), 'sensori fermi');
  assert.equal(p2HoldWhy({ playing: true, health: null }), null, 'mouse o webcam: solo la finestra');
  const r = createHoldReporter();
  assert.equal(r.update('scollegato', 0), null);
  assert.equal(r.update('scollegato', HOLD_GRACE_MS - 1), null);
  assert.equal(r.update('scollegato', HOLD_GRACE_MS), 'scollegato');
  assert.equal(r.update('non pronto', HOLD_GRACE_MS + 50), 'non pronto', 'il motivo che cambia si dice subito');
  assert.equal(r.update(null, 400), null);
  assert.equal(createHoldReporter().update('pagina nascosta', 0), 'pagina nascosta');
  // host: computer del P2 assente, motivo del P2, finestra dell'host nascosta
  assert.deepEqual(opponentHealth({}), { ok: true, why: null });
  assert.equal(opponentHealth({ absentMs: 5001 }).why, 'avversario');
  assert.equal(opponentHealth({ absentMs: 1000, hold: 'scollegato' }).why, 'scollegato');
  assert.equal(opponentHealth({ hostHidden: true, hold: 'scollegato' }).why, 'host nascosto');
  for (const why of ['avversario', 'host nascosto', 'computer nascosto', 'scollegato', 'non pronto', 'pagina nascosta', 'sensori fermi', 'altro']){
    const t = hostHoldText(why, { p2Name: 'Bea' });
    assert.ok(t.title && /ferma per tutti e due/.test(t.text), why);
  }
  assert.match(hostHoldText('scollegato', { p2Name: 'Bea' }).title, /telefono di Bea/);
  // cosa vede il P2
  assert.equal(guestHoldNotice({ who: 'p2', why: 'scollegato' }, { phoneText: 'Telefono scollegato: …' }).phone, true);
  assert.match(guestHoldNotice({ who: 'host', why: 'host nascosto' }, { hostName: 'Ada' }).text, /Ada.*secondo piano/);
  assert.match(guestHoldNotice({ who: 'host', why: 'telefono' }, { hostName: 'Ada' }).text, /telefono di Ada/);
  assert.match(guestHoldNotice({ who: 'p2', why: 'scollegato', left: 2 }).text, /Tra 2/);
  assert.match(guestHoldNotice(null).title, /pausa/);
});

test('relay: il motivo del P2 arriva all’host (e si cancella), solo finché il P2 è online', async () => {
  const { handle } = createLocalRelay({ relay: createMatchRelay({ publicUrl: '' }) });
  const json = r => JSON.parse(r.text);
  const c = json(await handle({ method: 'POST', url: '/api/match/create', body: {} }));
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2&hold=${encodeURIComponent('pagina nascosta')}` });
  assert.equal(json(await handle({ url: `/api/match/state?room=${c.roomId}&role=p1&touch=p1` })).p2Hold, 'pagina nascosta');
  // lettura senza hold (P2 di prima): il motivo resta quello detto; hold vuoto: tutto a posto
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2` });
  assert.equal(json(await handle({ url: `/api/match/state?room=${c.roomId}&role=p1` })).p2Hold, 'pagina nascosta');
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2&hold=` });
  assert.equal(json(await handle({ url: `/api/match/state?room=${c.roomId}&role=p1` })).p2Hold, null);
});

// host in partita 1v1 con un P2 collegato e pronto
async function hostMatch(){
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, lobby, hud, ui } = w;
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('match'); w.advance(300);
  E.roomStatus = { ...E.roomStatus, p2Online: true, p2Ready: true }; w.advance(400);
  w.pressStart(); w.advance(300);
  if (ui.training?.active) ui.training.skip();
  w.advance(300);
  return w;
}
const waitText = sel => $('natpf-versus-wait').querySelector(sel).textContent;
const lastPaused = since => fetches.slice(since).filter(f => String(f.url).includes('/api/match/sync')).map(f => JSON.parse(f.body).snapshot).filter(s => s.paused).at(-1);

test('host: telefono del P2 scollegato a metà scambio → pausa per tutti e due, conto alla rovescia, punto rigiocato', async () => {
  const w = await hostMatch();
  const { E, ui } = w;
  assert.ok(E._versusInMatch(), `fase ${E.phase}`);
  E.phase = 'RALLY'; E.ball.inPlay = true;
  const score = JSON.stringify({ ...E.score });
  const before = fetches.length;
  E.roomStatus = { ...E.roomStatus, p2Online: true, p2Hold: 'scollegato' }; w.advance(300);
  assert.ok(ui.versus.waiting && E.natpfPaused && visible('natpf-versus-wait'));
  assert.match(waitText('#natpf-versus-wait-title'), /telefono di Player 2 è scollegato/);
  // il P2 sa perché è ferma: è il suo telefono
  assert.deepEqual(lastPaused(before).hold, { who: 'p2', why: 'scollegato' });
  w.advance(3000);
  assert.ok(ui.versus.waiting, 'resta ferma finché il telefono non torna');
  // il telefono torna: tratto regolare, conto alla rovescia, poi si rigioca lo scambio
  E.roomStatus = { ...E.roomStatus, p2Hold: null }; w.advance(1000);
  assert.ok(ui.versus.waiting); assert.match(waitText('[data-versus-wait-count]'), /Si riprende tra/);
  assert.ok(Number.isFinite(lastPaused(before).hold.left));
  w.advance(2500);
  assert.ok(!ui.versus.waiting && !E.natpfPaused && !visible('natpf-versus-wait'));
  assert.notEqual(E.phase, 'RALLY', 'lo scambio interrotto si rigioca dal servizio');
  assert.equal(JSON.stringify({ ...E.score }), score, 'nessun punto regalato');
});

test('host: computer del P2 sparito → «si è scollegato»; torna → riprende (senza rigiocare se non c’era uno scambio)', async () => {
  const w = await hostMatch();
  const { E, ui } = w;
  E.phase = 'SERVE_STANCE';
  E.roomStatus = { ...E.roomStatus, p2Online: false }; w.advance(4000);
  assert.ok(!ui.versus.waiting, 'prima di VERSUS.lostMs si aspetta');
  w.advance(1600);
  assert.ok(ui.versus.waiting && E.natpfPaused);
  assert.match(waitText('#natpf-versus-wait-title'), /si è scollegato/);
  assert.match(waitText('[data-versus-wait-text]'), /Riconnetti/);
  E.roomStatus = { ...E.roomStatus, p2Online: true }; w.advance(3500);
  assert.ok(!ui.versus.waiting && !E.natpfPaused);
});
