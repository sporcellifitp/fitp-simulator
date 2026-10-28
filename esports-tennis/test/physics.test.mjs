import test from 'node:test';
import assert from 'node:assert/strict';
import { solveShot, predict, inCourt, inServiceBox, COURT } from '../public/js/physics.js';

test('dritto in topspin: arriva dove mirato e passa la rete', () => {
  const s = solveShot([1, 1.0, 11.5], -2, -9, 25, 1.0);
  assert.ok(s, 'soluzione trovata');
  assert.ok(Math.abs(s.land[0] + 2) < 0.15 && Math.abs(s.land[1] + 9) < 0.15, `atterra a ${s.land}`);
  assert.ok(s.netClear > 0.25);
  const pr = predict({ p: [1, 1.0, 11.5], v: s.v, spin: 1.0 });
  assert.equal(pr.net, false);
  assert.ok(Math.abs(pr.firstBounce.x + 2) < 0.2 && Math.abs(pr.firstBounce.z + 9) < 0.2);
});

test('servizio piatto a 170 km/h nel riquadro', () => {
  const s = solveShot([0.4, 2.7, 12.0], -2.5, -5.5, 170 / 3.6, 0.2, 0.08);
  assert.ok(s, 'servizio possibile');
  assert.ok(inServiceBox(s.land[0], s.land[1], -1, 'deuce'));
  console.log('servizio vy', s.v[1].toFixed(2), 'tempo', s.t.toFixed(2), 'margine rete', s.netClear.toFixed(2));
});

test('pallonetto alto', () => {
  const s = solveShot([0, 0.9, 11], 0, -10, 11, -0.2, 2.5);
  assert.ok(s);
  console.log('lob vy', s.v[1].toFixed(2), 't', s.t.toFixed(2));
  assert.ok(s.t > 1.6);
});

test('campo e riquadri', () => {
  assert.ok(inCourt(0, -5, -1));
  assert.ok(!inCourt(4.3, -5, -1));
  assert.ok(!inCourt(0, -12.1, -1));
  assert.ok(inServiceBox(-2, -3, -1, 'deuce'));
  assert.ok(!inServiceBox(2, -3, -1, 'deuce'));
  assert.ok(inServiceBox(2, 3, 1, 'deuce'));
  assert.ok(!inServiceBox(-2, -7, -1, 'deuce'));
  void COURT;
});
