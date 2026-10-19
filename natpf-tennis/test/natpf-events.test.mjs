// Sfide per gli eventi, nickname, classifica del giorno e chiosco (funzioni senza DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGES, validNickname, addScore, topScores, freshBoard, dayKey, boardCsv, targetPoints, TARGETS, rallyFlight, championScore, CHAMPION_TARGET } from '../src/natpf/natpf_events.js';
import { kioskAction, IDLE_STEPS } from '../src/natpf/natpf_kiosk.js';

test('quattro sfide con unità e descrizione', () => {
  assert.deepEqual(CHALLENGES.map(c => c.id), ['radar', 'targets', 'rally', 'champion']);
  for (const c of CHALLENGES) assert.ok(c.label && c.unit && c.short && c.facts.length === 3, c.id);
});

test('nickname: solo il nickname, ripulito e filtrato', () => {
  assert.deepEqual(validNickname('  Ace   99 '), { ok: true, nick: 'Ace 99' });
  assert.equal(validNickname('a').ok, false);
  assert.equal(validNickname('x'.repeat(15)).ok, false);
  assert.equal(validNickname('<script>').ok, false, 'niente simboli');
  assert.equal(validNickname('M3rda').ok, false, 'parole bloccate anche con numeri al posto delle lettere');
  assert.equal(validNickname('Niccolò').ok, true, 'lettere accentate');
});

test('classifica del giorno: ordine, posizione, parità al primo arrivato, nuovo giorno da zero', () => {
  let b = freshBoard(null, '2026-10-19');
  ({ board: b } = addScore(b, 'radar', 'Ada', 150, { day: '2026-10-19', at: 1 }));
  ({ board: b } = addScore(b, 'radar', 'Bea', 170, { day: '2026-10-19', at: 2 }));
  const r = addScore(b, 'radar', 'Cia', 150, { day: '2026-10-19', at: 3 }); b = r.board;
  assert.equal(r.rank, 3); assert.equal(r.total, 3);
  assert.deepEqual(topScores(b, 'radar', 10, '2026-10-19').map(e => e.nick), ['Bea', 'Ada', 'Cia']);
  assert.deepEqual(topScores(b, 'radar', 10, '2026-10-20'), [], 'il giorno dopo si riparte');
  assert.match(boardCsv(b), /"Radar del servizio";"1";"Bea";"170"/);
  assert.match(dayKey(new Date(2026, 9, 5)), /^2026-10-05$/);
});

test('bersagli: angoli 3, palla corta 5, dentro 1, fuori 0', () => {
  assert.equal(targetPoints({ x: TARGETS[0].x, z: TARGETS[0].z }, true).points, 3);
  assert.equal(targetPoints({ x: 0, z: -3.2 }, true).points, 5);
  assert.equal(targetPoints({ x: 0, z: -7 }, true).points, 1);
  assert.equal(targetPoints({ x: TARGETS[1].x, z: TARGETS[1].z }, false).points, 0);
});

test('scambio infinito più veloce a ogni colpo, con un limite; campione a 3 punti', () => {
  assert.ok(rallyFlight(0) > rallyFlight(5) && rallyFlight(100) >= .72);
  assert.equal(CHAMPION_TARGET, 3);
  assert.equal(championScore(3, 1), 19); assert.equal(championScore(2, 3), 6);
});

test('chiosco: menu dopo il tempo di inattività, partita chiusa dopo il doppio, spento non fa nulla', () => {
  const base = { enabled: true, limit: 45 };
  assert.equal(kioskAction({ ...base, idle: 50, inGame: false, atRest: false }), 'reset');
  assert.equal(kioskAction({ ...base, idle: 50, inGame: false, atRest: true }), null, 'già pronto per il prossimo');
  assert.equal(kioskAction({ ...base, idle: 50, inGame: true }), null);
  assert.equal(kioskAction({ ...base, idle: 95, inGame: true }), 'end-game');
  assert.equal(kioskAction({ enabled: false, limit: 45, idle: 999, inGame: false }), null);
  assert.ok(IDLE_STEPS.includes(45));
});
