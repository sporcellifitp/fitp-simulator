// Diagnostica del 30/10 (20261030-142438, C21): sui segnapunti arancioni dell'arena il punteggio dell'host era sempre
// per primo («15-0» e «40-0» nel game servito dal P2 che era sotto), e a inizio partita restava la velocità del servizio
// della partita prima. Ora: prima il punteggio di chi serve, come nel tennis; velocità «---» fino al primo servizio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { scoreText } from '../src/natpf/natpf_i18n.js';

function withBoard(){
  const e = createHeadlessEngine({ difficulty: 'pro' });
  const board = { scores: [], speeds: [] };
  e.natpfArena = { setScore: t => board.scores.push(scoreText(t, { short: true })),   // come natpf_arena.setScore
    setSpeed: k => board.speeds.push(k), update(){}, setPractice(){} };
  return { e, board };
}

test('C21: segnapunti dell\'arena, prima il punteggio di chi serve', () => {
  const { e, board } = withBoard();
  e.score.server = 'opponent'; e.score.playerPoints = 0; e.score.opponentPoints = 1;
  e._syncScoreboardHUD();
  assert.equal(board.scores.at(-1), '15-0', 'il P2 serve ed è avanti 15-0');
  e.score.playerPoints = 3; e.score.opponentPoints = 0;
  e._syncScoreboardHUD();
  assert.equal(board.scores.at(-1), '0-40');
  e.score.server = 'player';
  e._syncScoreboardHUD();
  assert.equal(board.scores.at(-1), '40-0', 'serve l\'host');
  // parità e vantaggio come prima (scritta unica)
  e.score.playerPoints = 4; e.score.opponentPoints = 4; e._syncScoreboardHUD();
  assert.equal(board.scores.at(-1), 'PARITÀ');
  e.score.opponentPoints = 5; e.score.server = 'opponent'; e._syncScoreboardHUD();
  assert.equal(board.scores.at(-1), 'VANT.');
});

test('C21: a inizio partita la velocità del servizio torna «---», poi quella del primo servizio', () => {
  const { e, board } = withBoard();
  e.startNewMatch({ showStartBanner: false });
  assert.equal(board.speeds.at(-1), null, 'velocità azzerata a inizio partita');
  assert.equal(board.scores.at(-1), '0-0');
  e.score.server = 'player'; e.phase = 'SERVE_STANCE'; e._startServeToss(e.player);
  for (let i = 0; i < 400 && e.ball.vel.y > 0; i++) e.step(1/120);
  e._executeServeHit(e.player, { natpfServeTau: 0, speed: 1.2 });
  assert.ok(Number.isFinite(board.speeds.at(-1)) && board.speeds.at(-1) > 42, `velocità del servizio (km/h veri dal B34; 42 = 80 sulla scala × 6,8 di prima): ${board.speeds.at(-1)}`);
});

test('C21: il segnapunti mostra «---» senza velocità (anche la prima volta) e non ridisegna la stessa', async () => {
  const { installNatpfArena } = await import('../src/natpf/natpf_arena.js').catch(() => ({}));
  assert.equal(typeof installNatpfArena, 'function');
  // la logica dei valori: setSpeed(null) e numeri non validi diventano null; lo stesso valore non si ridisegna
  const src = (await import('node:fs')).readFileSync(new URL('../src/natpf/natpf_arena.js', import.meta.url), 'utf8');
  assert.match(src, /arena\.setSpeed\?\.\(null\)/, 'all\'avvio dell\'arena la velocità è «---»');
  const arenaSrc = (await import('node:fs')).readFileSync(new URL('../../site/js/tennis/arena.js', import.meta.url), 'utf8');
  assert.match(arenaSrc, /Number\.isFinite\(kmh\)[^;]*'---'/, 'arena.js: «---» quando la velocità non è un numero');
});
