import test from 'node:test';
import assert from 'node:assert/strict';
import { newScore, pointWon, pointsText, currentServer, serviceBox } from '../public/js/rules.js';

const win = (s, who, n) => { for (let i = 0; i < n; i++) s = pointWon(s, who); return s; };

test('game a zero e cambio di servizio', () => {
  let s = newScore('breve', 0);
  s = win(s, 0, 3);
  assert.deepEqual(pointsText(s, 0), ['40', '0']);
  assert.equal(serviceBox(s), 'ad');
  s = pointWon(s, 0);
  assert.deepEqual(s.games, [1, 0]);
  assert.equal(currentServer(s), 1);
});

test('vantaggi senza killer point', () => {
  let s = newScore('breve', 0);
  s = win(s, 0, 3); s = win(s, 1, 3);
  assert.deepEqual(pointsText(s, 0), ['40', '40']);
  s = pointWon(s, 1);
  assert.deepEqual(pointsText(s, 0), ['40', 'AD']);
  s = pointWon(s, 0);
  assert.deepEqual(s.games, [0, 0]);
  s = win(s, 0, 2);
  assert.deepEqual(s.games, [1, 0]);
});

test('rapida: killer point e vittoria a 2 game', () => {
  let s = newScore('rapida', 1);
  s = win(s, 0, 3); s = win(s, 1, 3);
  s = pointWon(s, 1);
  assert.deepEqual(s.games, [0, 1]);
  s = win(s, 0, 4); // 1-1
  s = win(s, 1, 4);
  assert.equal(s.over, true);
  assert.equal(s.winner, 1);
});

test('tie-break nel set breve', () => {
  let s = newScore('breve', 0);
  for (let g = 0; g < 4; g++) { s = win(s, 0, 4); s = win(s, 1, 4); }
  assert.deepEqual(s.games, [4, 4]);
  assert.equal(s.tiebreak, true);
  const first = currentServer(s);
  s = pointWon(s, 0);
  assert.notEqual(currentServer(s), first);
  s = win(s, 0, 6);
  assert.equal(s.over, true);
  assert.equal(s.winner, 0);
  assert.deepEqual(s.games, [5, 4]);
});
