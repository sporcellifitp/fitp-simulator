// B56 · anticipo dei colpi del telefono (decisione dell'utente del 16/11/2026, «Prima l'anticipo»): nel registro di Torino
// l'84–91 % dei colpi è in anticipo di circa 120 ms (docs/b36/misure-torino.md §3). In modalità fiera il gesto vale come
// fatto ANTICIPATION_S più tardi; fuori dalla fiera come prima.
import test from 'node:test';
import assert from 'node:assert/strict';
import { natpfSwingToEngine, anticipationFor, ANTICIPATION_S } from '../src/natpf/natpf_phone_racket.js';
import { eventLatency } from '../src/natpf/natpf_skill.js';

const swing = { at: 10, dir: 1, peak: 500, power: .6 };
test('B56: correzione solo in modalità fiera, 100 ms', () => {
  assert.equal(ANTICIPATION_S, .1);
  assert.equal(anticipationFor({ natpfUi: { fiera: { on: true } } }), .1);
  assert.equal(anticipationFor({ natpfUi: { fiera: { on: false } } }), 0);
  assert.equal(anticipationFor(null), 0);
});

test('B56: il gesto vale come fatto 100 ms più tardi (latenza anche sotto zero, fino a −0,15 s); senza correzione come prima', () => {
  const now = 10.03;   // messaggio arrivato 30 ms dopo il picco (rete locale)
  const before = natpfSwingToEngine(swing, { now });
  const after = natpfSwingToEngine(swing, { now, anticipation: ANTICIPATION_S });
  assert.ok(Math.abs(before.natpf.latency - .03) < 1e-9, 'come prima');
  assert.ok(Math.abs(after.natpf.latency - (-.07)) < 1e-9, `−70 ms: ${after.natpf.latency}`);
  assert.ok(Math.abs(eventLatency(after) - (-.07)) < 1e-9, 'il motore la usa così (limite −0,15 s)');
  // con lo schermo in ritardo impostato dallo staff le due correzioni si sommano
  assert.ok(Math.abs(natpfSwingToEngine(swing, { now, displayLag: .08, anticipation: ANTICIPATION_S }).natpf.latency - .01) < 1e-9);
  // mai sotto −0,15 s
  assert.equal(natpfSwingToEngine(swing, { now: 10, anticipation: .15 }).natpf.latency, -.15);
});
