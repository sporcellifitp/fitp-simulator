// Etichetta del gesto sul computer: rilevato (compare subito), letto (dritto/rovescio, colpo, verso), applicato
// (in attesa della palla, colpita con il voto, troppo presto/tardi, ignorato e perché).
import test from 'node:test';
import assert from 'node:assert/strict';
import { gestureLabel, gestureOutcome } from '../src/natpf/natpf_gesture_hud.js';

test('gesto letto: lato, colpo e verso come li ha capiti il gioco', () => {
  assert.deepEqual(gestureLabel({ side: 'forehand', natpf: { shot: 'topspin' } }, { dir: 1 }), { arrow: '←', title: 'Dritto', sub: 'Top spin', state: 'read' });
  assert.deepEqual(gestureLabel({ side: 'backhand', natpf: { shot: 'slice' } }, { dir: -1 }), { arrow: '→', title: 'Rovescio', sub: 'Tagliato', state: 'read' });
  assert.equal(gestureLabel({ side: 'forehand', natpf: { shot: 'lob' } }, { vert: 'up' }).arrow, '↑');
  assert.equal(gestureLabel({ side: 'forehand', natpf: { shot: 'smash' } }, { dir: 1 }).title, 'Schiacciata');
  assert.deepEqual(gestureLabel({ ignored: 'palla che si allontana', natpf: {} }, {}), { arrow: '·', title: 'Gesto ignorato', sub: 'palla che si allontana', state: 'ignored' });
});

test('esito: colpita con il voto, troppo presto o tardi, nessun esito per gli altri eventi', () => {
  assert.deepEqual(gestureOutcome({ kind: 'hit' }, { color: 'green', label: 'Perfetto' }), { state: 'ok', text: 'Perfetto' });
  assert.deepEqual(gestureOutcome({ kind: 'hit' }, { color: 'yellow', label: 'Anticipo' }), { state: 'mid', text: 'Anticipo' });
  assert.deepEqual(gestureOutcome({ kind: 'hit' }, { color: 'red', label: 'Fuori' }), { state: 'bad', text: 'Fuori' });
  assert.deepEqual(gestureOutcome({ kind: 'whiff', grade: 'VERY EARLY • WHIFF' }), { state: 'bad', text: 'Troppo presto' });
  assert.deepEqual(gestureOutcome({ kind: 'whiff', grade: 'TOO LATE! • WHIFF' }), { state: 'bad', text: 'Troppo tardi' });
  assert.equal(gestureOutcome({ kind: 'point_won' }), null);
});
