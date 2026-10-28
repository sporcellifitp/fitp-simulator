// Split screen (28/10): 1v1 sullo stesso computer con due telefoni. Il secondo telefono è il Player 2 locale: i suoi
// colpi arrivano all'avversario come quelli del P2 in rete, vede la partita dal lato del P2 e riceve i suoi esiti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './ui-world.mjs';
import { NatpfPhoneRacket, phoneGamePhase, ballMovingAway, expectedStrokeDir } from '../src/natpf/natpf_phone_racket.js';

// telefono finto già pronto (sensori attivi e calibrazione fatta), come quello del mondo di prova
function fakeLink(){
  return { connected: true, ready: true, L: { state: 'connected', phone: 'ready' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){} };
}
async function splitWorld(){
  const w = await makeWorld({ controller: 'phone' });
  w.link.cmd('skip');
  const P2 = new NatpfPhoneRacket(w.E, { role: 'p2' });
  P2.link = fakeLink(); w.E.natpfPhone2 = P2;
  // sessione 1v1 locale come la apre lo split screen (natpf_split.js): nessuna stanza in rete
  w.E.versus = { active: true, closing: false, local: true }; w.E._applyDifficultyTuning('1v1');
  w.E.autoPlayMode = false; w.E.startNewMatch({ showStartBanner: false });
  return { ...w, P2 };
}

test('secondo telefono: è il Player 2 locale, con mano e gesti imparati salvati a parte', async () => {
  const { E, P2 } = await splitWorld();
  assert.equal(P2.role, 'p2'); assert.equal(P2.localP2, true); assert.equal(P2.actor, E.opponent);
  assert.equal(E.natpfPhone.role, 'p1'); assert.equal(E.natpfPhone.localP2, false);
  P2.setHand('left');
  assert.equal(localStorage.getItem('natpf-tennis.hand.p2'), 'left');
  assert.notEqual(localStorage.getItem('natpf-tennis.hand'), 'left', 'la mano del P1 non cambia');
  // il P2 locale non tocca lo stato del telefono del motore (inclina la racchetta del P1)
  const before = JSON.stringify(E.motionController.phoneState);
  P2._syncPhoneState(); assert.equal(JSON.stringify(E.motionController.phoneState), before);
});

test('secondo telefono: vede la partita dal lato del P2 (fase, palla che si allontana, verso atteso)', async () => {
  const { E, P2 } = await splitWorld();
  E.phase = 'SERVE_STANCE'; E.score.server = 'opponent';
  assert.equal(phoneGamePhase(E, 'p2'), 'serve'); assert.equal(phoneGamePhase(E), 'play', 'per il P1 non è il suo servizio');
  E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent';
  assert.equal(ballMovingAway(E, 'p2'), true); assert.equal(ballMovingAway(E), false);
  // palla del P1 verso il P2 (z negativa), a destra del P2 guardando la rete (x negativa sul campo)
  E.ball.lastHitter = 'player'; E.ball.vel.set(0, 0, -12); E.opponent.pos.set(0, 0, -11);
  E.ball.targetLanding = { x: -2.5, z: -10 };
  assert.equal(expectedStrokeDir(E, 'right', 'p2'), 1, 'dritto del P2 destro');
  P2.update();
  assert.ok(P2.link.sent.some(m => m.t === 'ph' && m.ph === 'play'));
});

test('secondo telefono: lancio e servizio del P2 arrivano all’avversario (non al P1)', async () => {
  const { E, P2 } = await splitWorld();
  E.phase = 'SERVE_STANCE'; E.score.server = 'opponent';
  P2._onToss();
  assert.equal(E.phase, 'SERVE_TOSS', 'il P2 lancia la palla');
  // colpo verso il punto più alto del lancio (il motore ignora un gesto nei primi 0,16 s): servizio del P2
  let t = 0; while (E.phaseTimer < 0.3 && t++ < 400) E.update(1/120);
  P2._onSwing({ dir: 1, power: .9, peak: 700, at: performance.now()/1000 - .03 });
  for (let i = 0; i < 60 && E.phase === 'SERVE_TOSS'; i++) E.update(1/60);
  assert.equal(E.phase, 'RALLY'); assert.equal(E.ball.lastHitter, 'opponent', 'ha servito il P2');
});

test('secondo telefono: riceve solo i propri esiti', async () => {
  const { E, P2 } = await splitWorld();
  const p1 = E.natpfPhone.link.sent.length;
  E.motionController.triggerHapticFeedback({ role: 'p2', kind: 'point_won', grade: 'POINT WON!' });
  assert.ok(P2.link.sent.some(m => m.t === 'ev' && m.k === 'point' && m.mine));
  assert.equal(E.natpfPhone.link.sent.filter(m => m.t === 'ev').length, E.natpfPhone.link.sent.slice(0, p1).filter(m => m.t === 'ev').length, 'il P1 non riceve l’esito del P2');
});

import * as THREE from 'three';
import { splitViewports, splitCameraPose, splitVisible, SPLIT_CAM } from '../src/natpf/natpf_split.js';

test('split: due metà affiancate con una linea in mezzo, P1 a sinistra e P2 a destra', () => {
  const v = splitViewports(1920, 1080);
  assert.equal(v.p1.x, 0); assert.equal(v.p2.x + v.p2.w, 1920);
  assert.equal(v.p1.w, v.p2.w); assert.ok(v.p2.x > v.p1.x + v.p1.w, 'linea di separazione');
  assert.equal(v.p1.h, 1080);
});

// in ogni metà (monitor 16:9, ledwall 3×2 e 2×2 divisi in due) si vede tutto il singolare: le righe laterali al fondo
// campo di chi gioca e la rete; il P2 vede il campo dal suo lato (rovesciato)
for (const [name, aspect] of [['monitor 16:9', 8/9], ['ledwall 3×2', .75], ['ledwall 2×2', .5], ['schermo largo', 1.6]]){
  test(`split: camera della metà (${name}) — singolare tutto in vista, rete in vista`, () => {
    for (const side of [1, -1]){
      const p = splitCameraPose({ side, actorX: side*3, ballX: 2, aspect });
      const cam = new THREE.PerspectiveCamera(p.fov, aspect, .1, 500);
      cam.position.set(...p.pos); cam.lookAt(new THREE.Vector3(...p.look)); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const inView = (x, y, z) => { const q = new THREE.Vector3(x, y, z).project(cam); return Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 && q.z < 1; };
      const B = SPLIT_CAM.baseline*side;
      assert.ok(inView(4.115, 0, B) && inView(-4.115, 0, B), `${name} lato ${side}: righe laterali al fondo campo`);
      assert.ok(inView(0, 1, 0) && inView(4.1, 1, 0) && inView(-4.1, 1, 0), `${name} lato ${side}: rete`);
      assert.ok(inView(0, 0, -B), `${name} lato ${side}: fondo campo dell'avversario`);
      assert.ok(side*p.pos[2] > SPLIT_CAM.baseline, 'camera dietro il proprio fondo campo');
      assert.ok(p.fov >= 45 && p.fov <= 58);
    }
  });
}

test('split: sessione 1v1 locale (niente rete), terza persona, singolare; uscita pulita', async () => {
  const { E } = await makeWorld({ controller: 'phone' });
  E.viewMode = 'first'; E.setMatchFormat('doubles');
  assert.equal(E.startSplit(), true);
  assert.deepEqual({ ...E.versus }, { active: true, closing: false, local: true });
  assert.equal(E.isMultiplayer, true); assert.equal(E.roomId, 'default'); assert.equal(E.isDoubles, false, 'singolare');
  E.autoPlayMode = false; E.startNewMatch({ showStartBanner: false });
  assert.equal(E._versusInMatch(), true, 'i colpi del P2 contano');
  assert.equal(E._isFirstPersonActive(), false, 'terza persona nelle due viste');
  assert.equal(splitVisible(E), true);
  // la sessione locale non la chiude endVersus (la chiamano le altre modalità del menu e l'uscita dalla stanza)
  E.endVersus(); assert.equal(E.versus.active, true);
  assert.equal(E.natpfUi.versus.hostActive, false, 'nessuna attesa del P2 in rete');
  E.cameraMode = 'REPLAY_CAM'; assert.equal(splitVisible(E), false, 'moviola a schermo intero'); E.cameraMode = 'RALLY_CAM';
  E.endSplit();
  assert.equal(E.versus.active, false); assert.equal(E.isMultiplayer, false); assert.equal(splitVisible(E), false);
});
