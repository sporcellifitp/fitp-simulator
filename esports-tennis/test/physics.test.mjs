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

test('palla corta in back: cade appena oltre la rete e rimbalza basso e corto', () => {
  const s = solveShot([0.5, 0.9, 11.5], 0, -2.4, 11, -1.7, 0.18);
  assert.ok(s, 'palla corta possibile');
  const pr = predict({ p: [0.5, 0.9, 11.5], v: s.v, spin: -1.7 }, 5, 1);
  assert.ok(pr.firstBounce.z > -3.2 && pr.firstBounce.z < -1.6, `primo rimbalzo a ${pr.firstBounce.z}`);
  const after = pr.pts.filter((p) => p.bounces === 1);
  const maxH = Math.max(...after.map((p) => p.p[1]));
  const second = pr.pts[pr.pts.length - 1]; // predict si ferma al secondo rimbalzo
  assert.ok(maxH < 0.9, `dopo il rimbalzo sale solo a ${maxH.toFixed(2)} m`);
  assert.ok(second.p[2] > -6, `il secondo rimbalzo resta vicino alla rete (${second.p[2].toFixed(2)})`);
});

test('il topspin rimbalza più alto del tagliato', () => {
  const top = solveShot([0, 1, 11.5], 0, -8, 24, 1.2, 0.3);
  const sl = solveShot([0, 1, 11.5], 0, -8, 18, -1.0, 0.22);
  const h = (sol, spin) => Math.max(...predict({ p: [0, 1, 11.5], v: sol.v, spin }, 5, 1).pts.filter((p) => p.bounces === 1).map((p) => p.p[1]));
  assert.ok(h(top, 1.2) > h(sl, -1.0), 'topspin più alto');
});
