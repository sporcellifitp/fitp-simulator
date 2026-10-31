// Diagnostica del 30/10 (20261030-142438, C9): nei fotogrammi del servizio la scintilla del colpo c'è con la racchetta sul
// fianco e il gesto sopra la testa si vede 100–170 ms dopo. Lo swing del servizio partiva all'istante dell'impatto dalla
// posizione di riposo (carica: dal fianco alla posizione «trofeo»), cioè ripeteva la carica già fatta durante il lancio.
// Ora parte dalla posizione trofeo tenuta nel lancio: al contatto la racchetta è sopra la testa.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RacketKinematicsController, SERVE_SWING } from '../src/racket_kinematics.js';

const DT = 1/60;
function serveFrames({ ms = 160, opts = {} } = {}){
  const K = new RacketKinematicsController();
  const actor = { role: 'player', sideSign: 1, pos: new THREE.Vector3(1, 0, 11.9), vel: new THREE.Vector3(), userData: {} };
  const ball = { pos: new THREE.Vector3(.7, 1.2, 11.7), vel: new THREE.Vector3(0, 6.3, 0), inPlay: false, lastHitter: 'player' };
  // lancio: la palla sale fino al colmo (≈ 3,3 m), chi serve tiene la posizione trofeo
  for (let t = 0; t < .7; t += DT){ ball.pos.y = Math.min(3.35, ball.pos.y + 6.3*DT); K.update(actor, DT, { ball, phase: 'SERVE_TOSS', isServer: true }); }
  const trophy = actor.racketKinematics.handGripTargetPos.clone();
  K.triggerSwing(actor, { shotType: 'serve', side: 'overhead', speed: 1.18, timing: 'sweet', isServe: true, ...opts });
  ball.inPlay = true;
  const out = [];
  for (let t = DT; t <= ms/1000 + 1e-9; t += DT){ K.update(actor, DT, { ball, phase: 'RALLY', isServer: true }); out.push({ ms: Math.round(t*1000), y: actor.racketKinematics.handGripTargetPos.y, z: actor.racketKinematics.handGripTargetPos.z, phase: actor.racketKinematics.swingPhase }); }
  return { trophy, out };
}

test('C9: al servizio la racchetta parte dalla posizione trofeo, sopra la testa, non dal fianco', () => {
  const { trophy, out } = serveFrames();
  assert.ok(trophy.y > 1.35, `posizione trofeo nel lancio: ${trophy.y.toFixed(2)}`);
  // primo fotogramma dopo l'impatto: sopra la testa (prima: tornava al fianco, ~0,9–1,1 m)
  assert.ok(out[0].y > 1.35, `primo fotogramma: ${out[0].y.toFixed(2)} m (${out[0].phase})`);
  assert.notEqual(out[0].phase, 'windup');
  // in avanti verso il punto d'impatto entro 50 ms (contactPos z 0,42; il trofeo è dietro la testa, z −0,16)
  const reach = out.find(f => f.z > .3);
  assert.ok(reach && reach.ms <= 50, `punto d'impatto raggiunto a ${reach?.ms} ms`);
  // e resta alta fino al contatto
  for (const f of out.filter(f => f.ms <= (reach?.ms ?? 0))) assert.ok(f.y > 1.3, `${f.ms} ms: ${f.y.toFixed(2)} m`);
});

test('C9: la carica intera resta per gli swing che la chiedono (startFrac 0) e per i colpi dello scambio', () => {
  assert.ok(SERVE_SWING.startFrac > .1 && SERVE_SWING.startFrac < .3);
  const { out } = serveFrames({ opts: { startFrac: 0 } });
  assert.equal(out[0].phase, 'windup');
  const K = new RacketKinematicsController();
  const actor = { role: 'player', sideSign: 1, pos: new THREE.Vector3(1, 0, 11.9), vel: new THREE.Vector3(), userData: {} };
  K.triggerSwing(actor, { shotType: 'topspin', side: 'forehand', speed: 1.2 });
  assert.equal(actor.racketKinematics.swingElapsed, 0);
});
