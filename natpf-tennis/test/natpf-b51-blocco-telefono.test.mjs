import assert from 'node:assert/strict';
import { test } from 'node:test';
import { phoneTouchRequested } from '../src/natpf/natpf_phone_racket.js';

test('B51: protegge il singolo e lo stesso schermo durante gioco, prova, pause e conto', () => {
  for (const phase of ['serve', 'toss', 'play', 'pause']){
    assert.equal(phoneTouchRequested({ phase, inUse: true }), true);
    assert.equal(phoneTouchRequested({ phase, inUse: false }), false);
  }
  assert.equal(phoneTouchRequested({ phase: 'menu', countdown: true }), true);
  for (const phase of ['menu', 'over']) assert.equal(phoneTouchRequested({ phase, inUse: true }), false);
  assert.equal(phoneTouchRequested({ phase: 'serve', inUse: true, enabled: false }), false);
  assert.equal(phoneTouchRequested({ phase: 'serve', inUse: true, autoPlay: true }), false);
});
