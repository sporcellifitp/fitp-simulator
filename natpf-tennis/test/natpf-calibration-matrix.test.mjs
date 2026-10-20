// Calibrazione e riconoscimento con prese e gesti diversi (telefono simulato, stessa catena del gioco): l'audit completo
// è scripts/audit/calibration-matrix.mjs (432 combinazioni), qui un sottoinsieme veloce che fallisce con il codice di
// prima. Difetti trovati: con il polso che prona la calibrazione falliva (il verso dei gesti veniva dall'asse del primo
// gesto, che contiene anche il polso: il rovescio non risultava «opposto», 168 combinazioni su 432); una volta
// calibrati, i dritti morbidi con pronazione diventavano palle corte (riferimento del piatto che partiva da 0).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simPhone } from './phone-sim.mjs';
import { headBaselineFromProfile } from '../src/natpf/natpf_gestures.js';

function play({ tilt, yaw, peak, ms, wrist, hand = 'right', seed = 3 }){
  const p = simPhone({ seed, hand });
  p.pose([0, 1, 0], yaw); p.pose([1, 0, 0], -tilt); p.rest(400, 6);
  const gesture = { peak, ms, wrist, wristAxis: [0, 0, -1], tremor: 6 };
  const cal = p.calibrate({ soft: true, ...gesture });
  if (!cal.ok) return { cal };
  const before = p.msgs.length, plan = [1, -1, 1, -1, 1, -1];
  for (const s of plan){ p.rest(700, 6); p.swing({ axis: [0, s, 0], ...gesture }); }
  p.rest(800, 6);
  const evs = p.msgs.slice(before).map(d => p.game(d).ev);
  return { cal, n: evs.length, sides: evs.map(e => e.side), shots: evs.map(e => e.natpf.shot), want: plan.map(s => (s === 1) !== (hand === 'left') ? 'forehand' : 'backhand') };
}

test('calibrazione e colpi con inclinazioni, schermo girato, gesti piccoli e polso che prona', () => {
  for (const tilt of [0, 60]) for (const yaw of [0, 90]) for (const [peak, ms] of [[260, 380], [700, 260]]) for (const wrist of [0, 600]){
    const tag = `inclinazione ${tilt}°, schermo ${yaw}°, gesto ${peak}°/s, polso ${wrist}°/s`;
    const r = play({ tilt, yaw, peak, ms, wrist });
    assert.ok(r.cal.ok, `${tag}: calibrazione non riuscita ${r.cal.attempts?.map(a => a.want + a.dir + (a.ok ? '' : '!')).join(' ')}`);
    assert.equal(r.n, 6, `${tag}: un gesto, un colpo`);
    assert.deepEqual(r.sides, r.want, tag);
    assert.ok(r.shots.every(s => s === 'topspin' || s === 'flat'), `${tag}: ${r.shots}`);
  }
});

test('mancino: stessi gesti, lati invertiti', () => {
  const r = play({ tilt: 35, yaw: 45, peak: 700, ms: 260, wrist: 400, hand: 'left' });
  assert.ok(r.cal.ok); assert.deepEqual(r.sides, r.want);
});

test('riferimento del piatto dalla calibrazione, nel segno del computer (nel dritto colpisce il palmo)', () => {
  assert.deepEqual(headBaselineFromProfile({ heads: { 1: .5, '-1': .2 } }, 'right'), { 1: -.5, '-1': .2, all: -.15, spread: 0 });
  assert.deepEqual(headBaselineFromProfile({ heads: { 1: .5, '-1': .2 } }, 'left'), { 1: .5, '-1': -.2, all: .15, spread: 0 });
  assert.equal(headBaselineFromProfile({}), null);
});
