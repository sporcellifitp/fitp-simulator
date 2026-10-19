// Grafica del campo come nei riferimenti: le due scritte TORINO dietro le linee di fondo si leggono dritte dalla camera
// di chi gioca su questo computer (P1 dietro z positiva, P2 dietro z negativa), quella vicina e quella in fondo.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { courtWordTurn, COURT_WORD } from '@natpf/tennis/arena.js';

test('arena: TORINO dritta per chi gioca, su tutte e due le metà, per P1 e per P2', () => {
  for (const viewer of [1, -1]){
    const m = new THREE.Object3D(); m.rotation.x = -Math.PI/2; m.rotation.z = courtWordTurn(viewer); m.updateMatrixWorld(true);
    const right = new THREE.Vector3(1, 0, 0).transformDirection(m.matrixWorld), up = new THREE.Vector3(0, 1, 0).transformDirection(m.matrixWorld);
    // la camera di chi gioca sta dietro la propria metà (z = viewer·22,8) e guarda verso −viewer·z
    const look = new THREE.Vector3(0, 0, -viewer), viewerRight = new THREE.Vector3().crossVectors(look, new THREE.Vector3(0, 1, 0));
    assert.ok(right.distanceTo(viewerRight) < 1e-6, `viewer ${viewer}: verso di lettura ${right.toArray()}`);
    assert.ok(up.distanceTo(look) < 1e-6, `viewer ${viewer}: la parte alta delle lettere va verso la rete`);
  }
  assert.ok(COURT_WORD.back < 3 && COURT_WORD.width < 4.5, 'poco dietro la riga di fondo e non più larga del corridoio dei doppi');
});

test('arena: sedia dell\'arbitro come nelle schermate di riferimento (a destra dal fondo del P1, lontana dalla rete)', async () => {
  const { UMPIRE } = await import('@natpf/tennis/arena.js');
  const post = 5.485 + .915;                                 // paletto della rete: corridoio dei doppi + 0,915 m
  assert.ok(UMPIRE.x > 0, 'a destra di chi guarda dal fondo del P1');
  assert.ok(UMPIRE.x - post > 3.2 && UMPIRE.x - post < 3.9, `oltre il paletto: ${(UMPIRE.x - post).toFixed(2)} m`);
  assert.ok(12.2 - UMPIRE.x > 1.8, 'davanti al muro laterale');
  assert.equal(UMPIRE.tvSide, -Math.sign(UMPIRE.x), 'telecamere sul lato opposto');
  assert.deepEqual([...UMPIRE.benchZ].map(Math.abs), [4, 4]);
});
