// B40.6 · ritratti della card dai modelli 3D (natpf_ritratti.js), parti senza browser: modo dall'indirizzo, fotogrammi
// per Android e poca memoria, grandezza (tetto 256×320, mai oltre il canvas), foglio (≤ 8 MB in due), orario della
// cattura, inquadratura (personaggio intero con il margine), macchina degli stati, fotogramma della riproduzione, riquadro
// delle sole parti visibili (attore vero montato come nel motore, in esultanza); niente cattura nel motore senza disegno.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { portraitMode, portraitK, frameSize, sheetLayout, captureSchedule, frameCamera, nextState, playFrame, visibleBox, NatpfRitratti,
  PORTRAIT_MAX, PORTRAIT_K, PORTRAIT_K_LOW, PORTRAIT_MARGIN, PORTRAIT_FOV } from '../src/natpf/natpf_ritratti.js';
import { CHEER_PERIOD, triggerPointReaction } from '../src/player_body_animation.js';
import { engineOf } from './mascotte-campo.mjs';

test('B40.6: modo dall\'indirizzo e fotogrammi per periodo (8 su Android o con meno di 4 GB)', () => {
  assert.equal(portraitMode(''), '3d'); assert.equal(portraitMode('?ritratti=svg'), 'svg'); assert.equal(portraitMode('?ritratti=3d&x=1'), '3d');
  assert.equal(PORTRAIT_K, 12); assert.equal(PORTRAIT_K_LOW, 8);
  assert.equal(portraitK({ ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', deviceMemory: 8 }), 12);
  assert.equal(portraitK({ ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', deviceMemory: 8 }), 8);
  assert.equal(portraitK({ ua: 'Mozilla/5.0 (Windows NT 10.0)', deviceMemory: 2 }), 8);
  assert.equal(portraitK({ ua: 'Mozilla/5.0 (Windows NT 10.0)' }), 12, 'senza deviceMemory (Firefox): 12');
});

test('B40.6: grandezza dei fotogrammi e del foglio', () => {
  assert.deepEqual(frameSize({ canvasW: 1920, canvasH: 1080 }), { w: 256, h: 320 }, 'tetto anche con DPR 2–3');
  assert.deepEqual(frameSize({ canvasW: 3840, canvasH: 2160 }), { w: 256, h: 320 });
  const small = frameSize({ canvasW: 200, canvasH: 160 });
  assert.ok(small.w <= 200 && small.h <= 160 && Math.abs(small.w/small.h - 0.8) < 0.02, JSON.stringify(small));
  const L = sheetLayout(12, 256, 320);
  assert.deepEqual([L.width, L.height, L.x(3)], [3072, 320, 768]);
  assert.ok(2*L.bytes <= 8*1024*1024, `due fogli: ${(2*L.bytes/1048576).toFixed(1)} MB`);
  assert.ok(2*sheetLayout(8, 256, 320).bytes < 2*L.bytes);
});

test('B40.6: orario della cattura (giro di prova, poi K ritratti per personaggio, passo P/K)', () => {
  const s = captureSchedule(['player', 'opponent'], 12);
  assert.equal(s.steps.length, 48);
  assert.ok(Math.abs(s.dt - CHEER_PERIOD/12) < 1e-12);
  assert.deepEqual(s.steps.slice(0, 13).map(x => x.shoot), [...Array(12).fill(false), true]);
  assert.equal(s.steps.filter(x => x.shoot && x.side === 'opponent').length, 12);
  assert.equal(s.steps.findIndex(x => x.side === 'opponent'), 24, 'un personaggio alla volta');
});

test('B40.6: inquadratura, il riquadro del personaggio sta nel fotogramma con il margine', () => {
  const min = new THREE.Vector3(-0.5, 0, -0.3), max = new THREE.Vector3(0.6, 1.9, 0.3);
  const f = frameCamera(min, max, { fov: PORTRAIT_FOV, aspect: 0.8 });
  const cam = new THREE.PerspectiveCamera(PORTRAIT_FOV, 0.8, 0.05, 60);
  cam.position.set(f.center.x, f.center.y, f.center.z + f.dist); cam.lookAt(f.center.x, f.center.y, f.center.z); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  let worst = 0;
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]){
    const p = new THREE.Vector3(x, y, z).project(cam); worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y));
  }
  assert.ok(worst <= 1 - 2*PORTRAIT_MARGIN + 0.05 && worst > 0.6, `angolo più lontano a ${worst.toFixed(3)} del fotogramma`);
});

test('B40.6: macchina degli stati e riproduzione in loop', () => {
  let s = 'idle';
  for (const [ev, want] of [['start', 'warm'], ['measured', 'shoot'], ['done', 'ready'], ['reset', 'idle'], ['start', 'warm'], ['lost', 'svg'], ['start', 'svg']]){ s = nextState(s, ev); assert.equal(s, want, ev); }
  assert.equal(nextState('shoot', 'fail'), 'svg');
  assert.equal(playFrame(0, 12), 0);
  assert.equal(playFrame(CHEER_PERIOD*1000/12 + 1, 12), 1);
  assert.equal(playFrame(CHEER_PERIOD*1000*2 + 1, 12), 0, 'il loop riparte dopo un periodo');
  assert.equal(playFrame(CHEER_PERIOD*1000*(11.5/12), 12), 11);
});

test('B40.6: riquadro delle parti visibili di un attore vero in esultanza (racchetta alzata compresa, niente parti nascoste)', () => {
  const E = engineOf(), a = E.player;
  triggerPointReaction(a, 'win');
  for (let i = 0; i < 60; i++) E.step(1/60, { phase: 'MATCH_OVER', score: { server: 'player' }, ball: null });
  const box = visibleBox(a.root, new THREE.Box3());
  const tip = a.racketMesh.localToWorld(new THREE.Vector3(0, 0.755, 0));
  assert.ok(box.containsPoint(tip), 'la punta della racchetta è nel riquadro');
  assert.ok(box.max.y > 1.6 && box.max.y < 2.6 && box.min.y > -0.1 && box.min.y < 0.3, `altezza ${box.min.y.toFixed(2)}–${box.max.y.toFixed(2)}`);
  // una parte nascosta lontana non allarga il riquadro
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1)); ghost.position.set(0, 9, 0); ghost.visible = false; a.root.add(ghost);
  assert.ok(visibleBox(a.root, new THREE.Box3()).max.y < 3);
});

test('B40.6: nel motore senza disegno (simulazioni, prove) nessuna cattura e l\'arena non si ferma', () => {
  const E = { phase: 'MATCH_OVER', autoPlayMode: false, natpfStats: { m: { over: true, winner: 'player' } }, renderer: null, scene: null, elapsedTime: 9 };
  const R = new NatpfRitratti(E, {});
  R.frame(1000); R.frame(2000);
  assert.equal(R.job, null); assert.equal(R.state, 'idle'); assert.equal(R.frozen(), false);
  assert.deepEqual(R.info().ready, false);
  // dopo il ripiego (contesto perso prima della cattura) la diagnostica si legge senza errori
  R.last = { m: {}, state: 'svg' };
  assert.deepEqual([R.info().ready, R.info().size, R.info().sheetBytes], [false, null, 0]);
});
