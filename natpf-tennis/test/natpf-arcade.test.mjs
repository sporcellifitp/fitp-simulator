// Minigiochi arcade (28/10): regole e punteggi (natpf_arcade.js), bersagli 3D colpiti dalla traiettoria vera della palla
// (natpf_targets.js) e partite intere nel motore senza disegno (natpf_events.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MODES, medalFor, nextMedal, recordGame, levelOf, medalCount, zoneScore, comboMultiplier, rushTarget, rushLevel, PRECISION_ZONES,
  precisionPoints, comboChain, comboStepOk, COMBO_STEPS, survivalLevel, SURVIVAL } from '../src/natpf/natpf_arcade.js';
import { TargetField, crossing } from '../src/natpf/natpf_targets.js';
import { makeWorld } from './ui-world.mjs';

const seq = (seed = 1) => () => ((seed = (seed*9301 + 49297) % 233280) / 233280);

test('medaglie, record personali, esperienza e livello', () => {
  for (const m of MODES){ assert.equal(m.medals.length, 3, m.id); assert.ok(m.medals[0] < m.medals[1] && m.medals[1] < m.medals[2], m.id); }
  assert.equal(medalFor('rush', 100), null); assert.equal(medalFor('rush', 250), 'bronze'); assert.equal(medalFor('rush', 5000), 'gold');
  assert.deepEqual(nextMedal('survival', 10), { medal: 'silver', need: 20 }); assert.equal(nextMedal('survival', 99), null);
  let r = recordGame({}, 'rush', 300);
  assert.equal(r.isRecord, true); assert.equal(r.medal, 'bronze'); assert.equal(r.newMedal, true);
  r = recordGame(r.records, 'rush', 200);
  assert.equal(r.isRecord, false); assert.equal(r.records.rush.best, 300); assert.equal(r.records.rush.medal, 'bronze'); assert.equal(r.records.rush.plays, 2);
  r = recordGame(r.records, 'rush', 1200);
  assert.equal(r.isRecord, true); assert.equal(r.prevBest, 300); assert.equal(r.records.rush.medal, 'gold');
  assert.ok(r.records.xp > 400);
  assert.deepEqual(levelOf(1100), { level: 3, into: 100, next: 500 });
  assert.deepEqual(medalCount(r.records), { gold: 1, silver: 0, bronze: 0 });
});

test('Target Rush: zone del bersaglio, combo, bersagli più piccoli e mobili salendo di livello', () => {
  assert.deepEqual(zoneScore(.1, 1), { points: 50, zone: 'centro' });
  assert.equal(zoneScore(.5, 1).points, 30); assert.equal(zoneScore(.9, 1).points, 10); assert.equal(zoneScore(1.1, 1).points, 0);
  assert.deepEqual([0, 2, 3, 6, 9, 30].map(comboMultiplier), [1, 1, 2, 3, 4, 4]);
  assert.ok(rushLevel(0, 0) === 0 && rushLevel(60, 2000) === 1);
  const easy = Array.from({ length: 40 }, (_, i) => rushTarget(0, seq(i + 1))), hard = Array.from({ length: 40 }, (_, i) => rushTarget(1, seq(i + 1)));
  assert.ok(easy.every(t => !t.move) && hard.some(t => t.move), 'bersagli mobili solo a livello alto');
  assert.ok(hard[0].r < easy[0].r);
  for (const t of [...easy, ...hard]) assert.ok(t.z < -4 && t.z > -11 && Math.abs(t.x) < 4, JSON.stringify(t));
});

test('Precision: dieci zone sempre più piccole, punti dalla distanza, fuori zero', () => {
  assert.equal(PRECISION_ZONES.length, 10);
  assert.ok(PRECISION_ZONES[9].r < PRECISION_ZONES[0].r);
  const z = PRECISION_ZONES[0];
  assert.equal(precisionPoints({ x: z.x, z: z.z }, z), 100);
  assert.equal(precisionPoints({ x: z.x + z.r, z: z.z }, z), 50);
  assert.equal(precisionPoints({ x: z.x + 5, z: z.z }, z), 0);
  assert.equal(precisionPoints({ x: z.x, z: z.z }, z, false), 0);
});

test('Combo Challenge: catene senza ripetizioni, colpi speciali solo con lo smartphone, controllo del passo', () => {
  for (let i = 0; i < 30; i++){
    const c = comboChain(5, { phone: false, rand: seq(i + 3) });
    assert.equal(c.length, 5); for (let k = 1; k < c.length; k++) assert.notEqual(c[k], c[k - 1]);
    assert.ok(c.every(s => !COMBO_STEPS[s].phone));
  }
  assert.ok(comboStepOk('forehand', { side: 'forehand', shot: 'topspin' }));
  assert.ok(!comboStepOk('forehand', { side: 'backhand', shot: 'topspin' }));
  assert.ok(!comboStepOk('forehand', { side: 'forehand', shot: 'topspin', inCourt: false }));
  assert.ok(comboStepOk('lob', { side: 'forehand', shot: 'lob' }) && !comboStepOk('lob', { shot: 'topspin' }));
  assert.ok(comboStepOk('cross', { direction: 'cross' }) && !comboStepOk('cross', { direction: 'line' }));
  assert.deepEqual([0, 4, 5, 12, 99].map(survivalLevel), [0, 0, 1, 2, SURVIVAL.maxLevel]);
});

test('bersagli 3D: la palla che attraversa il tabellone lo colpisce (zona dalla distanza), poi rimbalza indietro', () => {
  assert.deepEqual(crossing({ x: 0, y: 1, z: -5 }, { x: 1, y: 1, z: -7 }, -6), { x: .5, y: 1, z: -6 });
  assert.equal(crossing({ x: 0, y: 1, z: -5 }, { x: 0, y: 1, z: -5.5 }, -6), null);
  const scene = new THREE.Scene();
  const ball = { pos: new THREE.Vector3(0, 1, -4), vel: new THREE.Vector3(0, 0, -20), inPlay: true, lastHitter: 'player' };
  const F = new TargetField({ scene, ball });
  const T = F.add({ x: .2, z: -6, y: 1, r: .8, gold: false, move: null });
  F.tick(.4);                                                     // compare (e il primo fotogramma segna la posizione)
  ball.pos.set(.1, 1.05, -5.8); F.tick(1/60);
  ball.pos.set(.1, 1.05, -6.2);
  const hits = F.tick(1/60);
  assert.equal(hits.length, 1); assert.equal(hits[0].target, T); assert.equal(hits[0].points, 50); assert.equal(hits[0].zone, 'centro');
  assert.ok(ball.vel.z > 0, 'la palla torna indietro');
  for (let i = 0; i < 80; i++) F.tick(1/60);
  assert.equal(F.alive.length, 0, 'il bersaglio colpito sparisce');
  // palla che passa a lato: niente
  const T2 = F.add({ x: 3, z: -6, y: 1, r: .6, gold: false, move: null });
  ball.vel.set(0, 0, -20); ball.pos.set(0, 1, -5.8); F.tick(.4); ball.pos.set(0, 1, -6.2);
  assert.equal(F.tick(1/60).length, 0); assert.equal(T2.hit, null);
});

test('Target Rush nel motore: bersagli in campo, colpo nel bersaglio = punti e combo; a tempo scaduto risultato e record', async () => {
  const w = await makeWorld({ controller: 'mouse' });
  const ev = w.ui.events; let result = null;
  w.ui.flow.showResult = r => { result = r; };
  ev.start('rush');
  assert.equal(ev.active.id, 'rush'); assert.equal(ev.field.alive.length, 4);
  assert.equal(w.ui.machine.visible, true, 'lanciapalle in campo');
  const T = ev.field.alive[0]; for (let i = 0; i < 30; i++) ev.tick(1/60);
  // palla del giocatore che attraversa il centro del primo bersaglio
  Object.assign(w.E.ball, { inPlay: true, lastHitter: 'player' }); w.E.ball.vel.set(0, 0, -20);
  w.E.ball.pos.set(T.x, T.y, T.z + .3); ev.tick(1/60);
  w.E.ball.pos.set(T.x, T.y, T.z - .3); ev.tick(1/60);
  assert.equal(ev.active.hits, 1); assert.ok(ev.active.score >= 50, `punti ${ev.active.score}`);
  ev.active.time = .01; ev.tick(.05);
  assert.ok(result, 'risultato mostrato'); assert.equal(result.id, 'rush'); assert.equal(result.isRecord, true);
  assert.equal(ev.record('rush').best, result.score); assert.ok(!ev.active);
  assert.equal(ev.field.alive.length, 0, 'bersagli tolti alla fine');
});

test('Survival e Precision nel motore: le vite finiscono con le palle perse; dieci palle e Precision finisce', async () => {
  const w = await makeWorld({ controller: 'mouse' });
  const ev = w.ui.events; let result = null;
  w.ui.flow.showResult = r => { result = r; };
  ev.start('survival');
  for (let i = 0; i < 3; i++){ ev.active.wait = .01; ev.tick(.02); assert.ok(w.E.ball.inPlay, 'il lanciapalle lancia'); w.E._awardPoint('opponent', 'Out'); }
  assert.equal(result?.id, 'survival'); assert.equal(result.score, 0);
  result = null;
  ev.start('precision');
  for (let i = 0; i < 10; i++){
    ev.active.wait = .01; ev.tick(.02);
    const z = PRECISION_ZONES[ev.active.zoneIdx];
    w.E.ball.targetLanding.set(z.x, 0, z.z); ev.onShot({ label: 'Perfetto', color: 'green' }, {});
    w.E._awardPoint('opponent', 'Out');
  }
  assert.equal(result?.id, 'precision'); assert.equal(result.score, 1000); assert.equal(result.medal, 'gold');
});
