// Webcam «Movimento: segui il corpo»: posa del corpo (MediaPipe Pose) → bersaglio in campo, aggancio isolato al
// movimento del motore base, ritorno all'automatico, P2 attraverso il relay.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as THREE from 'three';
import { bodyPoseFromLandmarks, BodyFollowTracker, courtTargetFromBody, NatpfBodyFollow, BODY_FOLLOW, DEFAULT_MOVEMENT } from '../src/natpf/webcam_body_follow.js';
import { createMatchRelay } from '../scripts/match-relay.mjs';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);
// posa sintetica: centro del busto in x (immagine della camera, non specchiata), larghezza delle spalle w
function pose({ x = .5, w = .2, vis = .9, hips = true }){
  const lm = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: .1 }));
  lm[11] = { x: x + w/2, y: .35, z: 0, visibility: vis }; lm[12] = { x: x - w/2, y: .35, z: 0, visibility: vis };
  if (hips){ lm[23] = { x: x + w*.4, y: .65, z: 0, visibility: vis }; lm[24] = { x: x - w*.4, y: .65, z: 0, visibility: vis }; }
  return lm;
}

test('posa del corpo: centro a specchio come nel motore base, larghezza delle spalle, fuori inquadratura = nessun corpo', () => {
  const p = bodyPoseFromLandmarks(pose({ x: .4 }));
  near(p.x, .6); near(p.width, .2);                                  // a sinistra nella camera = a destra sullo schermo
  assert.ok(bodyPoseFromLandmarks(pose({ x: .5, hips: false })));    // bastano le spalle
  assert.equal(bodyPoseFromLandmarks(pose({ vis: .2 })), null, 'spalle poco visibili');
  assert.equal(bodyPoseFromLandmarks(pose({ x: .1, w: .2 })), null, 'una spalla sul bordo');
  assert.equal(bodyPoseFromLandmarks([]), null); assert.equal(bodyPoseFromLandmarks(undefined), null);
});

test('posizione rispetto alla partenza: calibrazione, laterale, profondità, corpo perso', () => {
  const t = new BodyFollowTracker({ smoothing: 1 });
  for (let ms = 0; ms <= 800; ms += 100) t.push(bodyPoseFromLandmarks(pose({})), ms);
  assert.ok(t.calibrated);
  const rest = t.sample(800); near(rest.lateral, 0); near(rest.depth, 0);
  t.push(bodyPoseFromLandmarks(pose({ x: .5 - BODY_FOLLOW.rangeX/2 })), 900);
  near(t.sample(900).lateral, .5);                                   // metà della corsa verso destra
  t.push(bodyPoseFromLandmarks(pose({ w: .2*BODY_FOLLOW.depthRatio })), 1000);
  near(t.sample(1000).depth, 1);                                     // più vicino alla webcam = verso la rete
  t.push(bodyPoseFromLandmarks(pose({ x: -1 })), 1100);              // nessun corpo valido
  assert.ok(t.sample(1000 + BODY_FOLLOW.holdMs - 1));
  assert.equal(t.sample(1000 + BODY_FOLLOW.holdMs + 1), null, 'corpo perso: si torna all\'automatico');
});

test('bersaglio in campo: destra del giocatore per P1 e P2, rete e fondo, dentro la propria metà', () => {
  const p1 = { sideSign: 1 }, p2 = { sideSign: -1 };
  const right = courtTargetFromBody({ lateral: 1, depth: 0 }, p1);
  assert.ok(right.x > 4.1); near(right.z, 11.89 - .15);
  assert.ok(courtTargetFromBody({ lateral: 1, depth: 0 }, p2).x < -4.1, 'P2 guarda verso +z: la sua destra è -x');
  near(courtTargetFromBody({ lateral: 0, depth: 0 }, p2).z, -(11.89 - .15));
  const net = courtTargetFromBody({ lateral: 0, depth: 1 }, p1), deep = courtTargetFromBody({ lateral: 0, depth: -1 }, p1);
  assert.ok(net.z < 8 && net.z >= 3.2 && deep.z > 11.89 && deep.z <= 13.4);
  assert.equal(courtTargetFromBody(null, p1), null);
});

// motore finto con l'interfaccia usata dal modulo
function fakeEngine({ role = 'p1', multiplayer = false } = {}){
  const actor = side => ({ sideSign: side, pos: new THREE.Vector3(0, 0, 11.7*side), targetPos: new THREE.Vector3(2, 0, 11.7*side), vel: new THREE.Vector3(), maxSpeed: 6 });
  const e = { phase: 'RALLY', playerRole: role, isMultiplayer: multiplayer, player: actor(1), opponent: actor(-1), motionController: { webcamActive: true, roomId: 'AT-TEST' }, steps: [] };
  e._stepActorFootwork = function(a){ this.steps.push({ a, x: a.targetPos.x, z: a.targetPos.z }); };
  return e;
}

test('aggancio isolato: con «segui il corpo» il passo usa il bersaglio del corpo e poi rimette quello del motore base', () => {
  assert.equal(DEFAULT_MOVEMENT, 'auto');
  const e = fakeEngine(), f = new NatpfBodyFollow(e, { autostart: false });
  f.mode = 'body';
  const now = performance.now();
  for (let ms = 0; ms <= 800; ms += 100) f.tracker.push(bodyPoseFromLandmarks(pose({})), now - 800 + ms);
  for (let i = 0; i < 8; i++) f.tracker.push(bodyPoseFromLandmarks(pose({ x: .5 - BODY_FOLLOW.rangeX })), now);   // filtro della posa
  e._stepActorFootwork(e.player, 1/120);
  assert.ok(e.steps[0].x > 4, 'il passo va verso destra, dove sta il corpo');
  near(e.player.targetPos.x, 2); near(e.player.targetPos.z, 11.7);   // bersaglio del motore base intatto
  e._stepActorFootwork(e.opponent, 1/120);
  near(e.steps[1].x, 2);                                              // l'avversario (CPU) resta del motore base
  e.phase = 'SERVE_STANCE'; e._stepActorFootwork(e.player, 1/120);
  near(e.steps[2].x, 2);                                              // fuori dallo scambio: automatico
  e.phase = 'RALLY'; f.mode = 'auto'; e._stepActorFootwork(e.player, 1/120);
  near(e.steps[3].x, 2);                                              // opzione spenta: automatico
  f.mode = 'body'; e.motionController.webcamActive = false; e._stepActorFootwork(e.player, 1/120);
  near(e.steps[4].x, 2);                                              // webcam spenta: automatico
  e.motionController.webcamActive = true; f.tracker.lastAt -= 1000; e._stepActorFootwork(e.player, 1/120);
  near(e.steps[5].x, 2);                                              // corpo non visto: automatico
});

test('1v1: l\'host muove il P2 con il bersaglio del suo corpo, ricevuto dal relay, finché è recente', async () => {
  const relay = createMatchRelay();
  const server = http.createServer((q, r) => relay(q, r, () => { r.statusCode = 404; r.end(); }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = body => fetch(base + '/api/body?room=AT-TEST&role=p2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: 'AT-TEST', role: 'p2', ...body }) });
  try {
    await post({ active: true, x: -3.1, z: -9.5 });
    const state = await fetch(base + '/api/match/state?room=AT-TEST&role=p1').then(r => r.json());
    assert.equal(state.body.p2.active, true); near(state.body.p2.x, -3.1); assert.equal(state.body.p1, null);
    const e = fakeEngine({ multiplayer: true }), f = new NatpfBodyFollow(e, { autostart: false });
    let seen = null; e.motionController.onRoomState = s => { seen = s; };
    f._hookRoomState(); e.motionController.onRoomState(state);
    assert.equal(seen, state, 'lo stato arriva comunque al motore base');
    e._stepActorFootwork(e.opponent, 1/120);
    near(e.steps[0].x, -3.1); near(e.steps[0].z, -9.5); near(e.opponent.targetPos.x, 2);
    e._stepActorFootwork(e.player, 1/120); near(e.steps[1].x, 2);   // P1 con l'opzione spenta: automatico
    f.remote.at -= 600; e._stepActorFootwork(e.opponent, 1/120); near(e.steps[2].x, 2);   // notizia vecchia
    await post({ active: false });
    e.motionController.onRoomState(await fetch(base + '/api/match/state?room=AT-TEST').then(r => r.json()));
    assert.equal(f.remote, null, 'corpo del P2 perso: automatico');
  } finally { await new Promise(r => server.close(r)); }
});
