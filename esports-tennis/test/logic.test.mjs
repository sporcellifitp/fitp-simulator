import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../server/logic.js';

const shot = (kind = 'drive') => ({ type: 'shot', p: [0, 1, 11], v: [0, 3, -25], spin: 1, kind, spinKind: kind === 'serve' ? 'flat' : 'topspin', side: 1 });

test('stanza: solo chi deve colpire può colpire o decidere il punto', () => {
  let s = L.setup(['a', 'b']);
  assert.equal(L.validateAction(s, 'b', shot('serve')).ok, false, 'serve il giocatore 1');
  assert.equal(L.validateAction(s, 'a', shot('drive')).ok, false, 'il primo colpo è un servizio');
  assert.equal(L.validateAction(s, 'a', shot('serve')).ok, true);
  s = L.applyAction(s, 'a', shot('serve'));
  assert.equal(s.turn, 1);
  assert.equal(L.validateAction(s, 'a', { type: 'point', winner: 0, reason: 'ace' }).ok, false, 'decide chi difende');
  assert.equal(L.validateAction(s, 'b', { type: 'fault', reason: 'fault' }).ok, true);
  s = L.applyAction(s, 'b', { type: 'fault', reason: 'fault' });
  assert.equal(s.faults, 1);
  s = L.applyAction(s, 'a', shot('serve'));
  s = L.applyAction(s, 'b', { type: 'fault', reason: 'fault' });
  assert.deepEqual(s.score.points, [0, 1], 'doppio fallo');
  assert.equal(s.lastPoint.reason, 'double');
  s = L.applyAction(s, 'a', shot('serve'));
  s = L.applyAction(s, 'b', shot('drive'));
  assert.equal(L.validateAction(s, 'b', { type: 'point', winner: 1, reason: 'winner' }).ok, false);
  s = L.applyAction(s, 'a', { type: 'point', winner: 1, reason: 'winner' });
  assert.deepEqual(s.score.points, [0, 2]);
  assert.equal(L.validateAction(s, 'a', { type: 'shot', p: [0, 1, 99], v: [0, 0, 0], spin: 0, kind: 'serve', spinKind: 'flat', side: 1 }).ok, false, 'posizione fuori campo rifiutata');
});

test('stanza: formato scelto da chi crea, partita finita', () => {
  let s = L.setup(['a', 'b']);
  assert.equal(L.validateAction(s, 'b', { type: 'config', format: 'rapida' }).ok, false);
  s = L.applyAction(s, 'a', { type: 'config', format: 'rapida' });
  for (let g = 0; g < 2; g++) for (let i = 0; i < 4; i++) {
    const server = s.score.server;
    const ids = ['a', 'b'];
    s = L.applyAction(s, ids[server], shot('serve'));
    s = L.applyAction(s, ids[1 - server], { type: 'point', winner: 0, reason: 'winner' });
  }
  assert.equal(L.isGameOver(s).over, true);
  assert.equal(L.isGameOver(s).winner, 'a');
});
