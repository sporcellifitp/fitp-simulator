// Diagnostica del 30/10 (20261030-142438, C16): con chi gioca oltre z ≈ 14 m i piedi e il punto d'impatto uscivano dal
// basso dell'immagine (la camera seguiva solo x). Decisione dell'utente del 31/10: oltre ~12,5 m la camera arretra e
// guarda più giù, in modo morbido; per il P1, per il P2 e per lo split screen. Qui: piedi e punto d'impatto in vista fino
// a 16 m, il campo dell'avversario sempre in vista, nessuno scatto alla soglia, prima della soglia la camera di sempre.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { deepCamShift, DEEP_CAM } from '../src/natpf/natpf_camera_depth.js';
import { splitCameraPose } from '../src/natpf/natpf_split.js';

// coordinate normalizzate (−1…1) di un punto visto dalla camera
function project({ pos, look, fov = 45, aspect = 16/9 }, p){
  const cam = new THREE.PerspectiveCamera(fov, aspect, .1, 500);
  cam.position.set(...pos); cam.lookAt(new THREE.Vector3(...look)); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  return new THREE.Vector3(...p).project(cam);
}
const inside = (q, m = .97) => Math.abs(q.x) <= 1 && q.y >= -m && q.y <= 1 && q.z < 1;
function enginePose(z, { role = 'p1', x = 1 } = {}){
  const e = createHeadlessEngine({ difficulty: 'pro' });
  e.playerRole = role; e.cameraMode = 'RALLY_CAM'; e.ball.pos.set(.5, 1, 0);
  const a = role === 'p2' ? e.opponent : e.player, side = role === 'p2' ? -1 : 1;
  a.pos.set(x*side, 0, z*side);
  const { targetPos, targetLook } = e._computeTargetCameraPose();
  return { pos: targetPos.toArray(), look: targetLook.toArray(), side };
}

test('C16: lo spostamento parte da zero alla soglia, cresce senza scatti e si ferma oltre il massimo', () => {
  assert.equal(DEEP_CAM.from, 12.5);
  for (const z of [0, 8, 11.89, 12.5]) assert.deepEqual(deepCamShift(z), { back: 0, look: 0 });
  let prev = deepCamShift(12.5), prevSlope = 0;
  for (let z = 12.5 + .01; z <= 18; z += .01){
    const s = deepCamShift(z), slope = (s.look - prev.look)/.01;
    assert.ok(s.back >= prev.back && s.look >= prev.look, `monotono a ${z.toFixed(2)}`);
    // derivata continua: nessuno scatto quando chi gioca passa la soglia o la fine del tratto dolce
    assert.ok(Math.abs(slope - prevSlope) < .03, `pendenza a ${z.toFixed(2)}: ${prevSlope.toFixed(3)} → ${slope.toFixed(3)}`);
    prev = s; prevSlope = slope;
  }
  // si ferma: oltre il massimo (più il tratto dolce) sempre lo stesso spostamento, max × back e max × look
  for (const z of [DEEP_CAM.from + DEEP_CAM.max + DEEP_CAM.knee, 20, 30]){
    const s = deepCamShift(z);
    assert.ok(Math.abs(s.back - DEEP_CAM.max*DEEP_CAM.back) < 1e-9 && Math.abs(s.look - DEEP_CAM.max*DEEP_CAM.look) < 1e-9, `${z}: ${JSON.stringify(s)}`);
  }
});

test('C16: fino a 12,5 m la camera di gioco è quella di sempre (P1 e P2)', () => {
  for (const z of [6, 11.9, 12.5]){
    const a = enginePose(z), b = enginePose(z, { role: 'p2' });
    assert.deepEqual([a.pos[1], a.pos[2], a.look[1], a.look[2]], [7.8, 22.8, .35, 1.8]);
    assert.deepEqual([b.pos[1], b.pos[2], b.look[1], b.look[2]], [7.8, -22.8, .35, -1.8]);
  }
});

// monitor 16:9, ledwall largo (3×1) e quasi quadrato (2×2) con il campo visivo verticale di 45° (camera del motore base;
// sotto 16:9 il gioco la allarga e la sposta, natpf_camera.js: provato in natpf-inquadratura.test.mjs)
for (const [name, aspect] of [['monitor 16:9', 16/9], ['ledwall 3×1', 3], ['ledwall 2×2', 1.1]]){
  test(`C16: piedi e punto d'impatto in vista fino a 16 m dalla rete, campo avversario in vista (${name}, P1 e P2)`, () => {
    for (const role of ['p1', 'p2']) for (let z = 11; z <= 16.001; z += .5){
      const P = enginePose(z, { role }), s = P.side, cam = { ...P, aspect };
      const feet = project(cam, [s, 0, s*(z + .35)]), contact = project(cam, [s*1.7, .9, s*(z - .2)]);
      assert.ok(inside(feet, .95), `${role} a ${z} m: piedi a y ${feet.y.toFixed(2)}`);
      assert.ok(inside(contact, .9), `${role} a ${z} m: punto d'impatto a y ${contact.y.toFixed(2)}`);
      // dall'altra parte: fondo campo e testa dell'avversario, e la rete
      for (const p of [[0, 0, -s*11.89], [0, 1.9, -s*12.2], [4.1, 1, 0], [-4.1, 1, 0]]) assert.ok(inside(project(cam, p), 1), `${role} a ${z} m: ${p} fuori`);
    }
  });
}

test('C16: split screen, le due metà seguono chi gioca in profondità come la camera intera', () => {
  for (const aspect of [8/9, .75, .5]) for (const side of [1, -1]){
    const near = splitCameraPose({ side, actorX: side, actorZ: side*12, ballX: 0, aspect });
    assert.deepEqual(near, splitCameraPose({ side, actorX: side, ballX: 0, aspect }), 'prima della soglia nessun cambiamento');
    for (let z = 12; z <= 16.001; z += .5){
      const p = splitCameraPose({ side, actorX: side, actorZ: side*z, ballX: 0, aspect }), cam = { ...p, aspect };
      const feet = project(cam, [side, 0, side*(z + .35)]);
      assert.ok(inside(feet, .95), `aspetto ${aspect.toFixed(2)} lato ${side} a ${z} m: piedi a y ${feet.y.toFixed(2)}`);
      assert.ok(inside(project(cam, [0, 0, -side*11.89]), 1), `aspetto ${aspect.toFixed(2)} lato ${side} a ${z} m: fondo campo avversario`);
    }
  }
});
