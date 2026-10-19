// Grafica del campo simmetrica: la scritta TORINO dietro ciascuna linea di fondo si legge dritta da chi gioca nella
// metà opposta (P1 guarda verso −z, P2 verso +z), con la stessa rotazione che usa buildArena.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { courtWordTurn } from '@natpf/tennis/arena.js';

test('arena: TORINO dritta per tutti e due i giocatori', () => {
  for (const s of [-1, 1]){
    const m = new THREE.Object3D(); m.rotation.x = -Math.PI/2; m.rotation.z = courtWordTurn(s); m.updateMatrixWorld(true);
    const right = new THREE.Vector3(1, 0, 0).transformDirection(m.matrixWorld), up = new THREE.Vector3(0, 1, 0).transformDirection(m.matrixWorld);
    // chi la guarda sta nella metà −s e guarda verso s·z: la sua destra è (−s, 0, 0) … per P1 (s = −1) è +x
    const look = new THREE.Vector3(0, 0, s), viewerRight = new THREE.Vector3().crossVectors(look, new THREE.Vector3(0, 1, 0));
    assert.ok(right.distanceTo(viewerRight) < 1e-6, `metà ${s}: verso di lettura ${right.toArray()}`);
    assert.ok(up.distanceTo(look) < 1e-6, `metà ${s}: la parte alta delle lettere si allontana da chi guarda`);
  }
});
