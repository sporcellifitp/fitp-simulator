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

// 28/10 sera: «monitor tagliati». La base della tribuna gira negli angoli con un raggio di 6 m ed entra nell'angolo del
// muro del campo: i pannelli LED che stavano lì erano nascosti a metà. Ogni punto della faccia di un pannello deve stare
// dentro il fronte della tribuna (con un margine), e i pannelli non devono coprire i loghi del muro.
test('arena: i pannelli LED degli angoli sono interi, fuori dalla curva della tribuna e lontani dai loghi', async () => {
  const { STAND_FRONT: F, CORNER_LED: P } = await import('@natpf/tennis/arena.js');
  const WX = 12.2, WZ = 21, margin = .15;
  // distanza (positiva = dentro) dal fronte della tribuna: rettangolo ±hx × ±hz con gli angoli di raggio R
  const inside = (x, z) => { const ax = Math.abs(x), az = Math.abs(z), cx = F.hx - F.R, cz = F.hz - F.R;
    if (ax > cx && az > cz) return F.R - Math.hypot(ax - cx, az - cz);
    return Math.min(F.hx - ax, F.hz - az); };
  const half = P.w/2;
  for (const t of [-half, 0, half]){
    const back = [P.backX + t, WZ - .1 - P.d/2], side = [WX - .1 - P.d/2, P.sideZ + t];
    assert.ok(inside(...back) >= margin, `fondo: ${back.map(v => v.toFixed(2))} a ${inside(...back).toFixed(2)} m dal fronte`);
    assert.ok(inside(...side) >= margin, `lato: ${side.map(v => v.toFixed(2))} a ${inside(...side).toFixed(2)} m dal fronte`);
  }
  // loghi del muro: ESPORTS sul fondo (±5,4 ± 0,8) e logo impilato sui lati (±16 ± 0,55)
  assert.ok(P.backX - half > 5.4 + .8 + .3, 'il pannello di fondo non tocca il logo ESPORTS');
  assert.ok(P.sideZ - half > 16 + .55 + .3, 'il pannello laterale non tocca il logo impilato');
});
