import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NatpfBallMachine, MACHINE, FEED_PROFILES, feedForLevel, machineXFor } from '../src/natpf/natpf_ball_machine.js';
import { makeWorld } from './ui-world.mjs';

test('lanciapalle: profili giocabili e più difficili salendo di livello', () => {
  for (const p of Object.values(FEED_PROFILES)) assert.ok(p.flight >= .9 && p.flight <= 2, p.label);
  let r = 0; const seq = () => ((r = (r*9301 + 49297) % 233280) / 233280);
  const avg = l => { let s = 0; for (let i = 0; i < 200; i++) s += feedForLevel(l, seq).flight; return s/200; };
  assert.ok(avg(1) < avg(0) - .2, 'al livello massimo le palle volano meno (sono più veloci)');
  for (let i = 0; i < 50; i++) assert.ok(feedForLevel(1, seq).flight >= .72);
  for (const x of [-4, 0, 4]) { const m = machineXFor(x, () => .5); assert.ok(m >= MACHINE.minX && m <= MACHINE.maxX); }
});

test('lanciapalle: la palla parte dalla bocca della canna, oltre la rete, e la macchina è nella scena', () => {
  const scene = new THREE.Scene(), engine = { scene, player: { pos: new THREE.Vector3(0, 0, 11) }, audioEngine: { calls: [], playMachineLaunch(p){ this.calls.push(p); } } };
  const m = new NatpfBallMachine(engine);
  const start = m.fire(new THREE.Vector3(2, 0, 9), { profile: { id: 'fast' } });
  assert.ok(scene.getObjectByName('natpf-ball-machine'), 'modello aggiunto alla scena');
  assert.ok(m.visible);
  assert.ok(start.z < -11 && start.z > -12.8, `z della bocca ${start.z}`);
  assert.ok(start.y > .8 && start.y < 1.8, `altezza della bocca ${start.y}`);
  assert.ok(start.x > m.x - .05, 'la canna è girata verso il bersaglio a destra');
  assert.deepEqual(engine.audioEngine.calls, ['fast']);
  for (let i = 0; i < 60; i++) m.tick(1/60);
  assert.equal(m.recoil, 0); m.show(false); assert.equal(m.visible, false);
});

test('riscaldamento: il lanciapalle compare in campo e la palla esce dalla sua bocca', async () => {
  const w = await makeWorld();
  const T = w.ui.training;
  T.start({ drills: [{ id: 'forehand', label: 'Dritto', need: 2 }] });
  assert.equal(w.ui.machine.visible, true);
  T._feed('forehand');
  const mz = w.ui.machine.muzzle();
  assert.ok(w.E.ball.pos.distanceTo(mz) < .3, 'palla alla bocca della canna');
  T.stop({ completed: false, silent: true });
  assert.equal(w.ui.machine.visible, false);
});
