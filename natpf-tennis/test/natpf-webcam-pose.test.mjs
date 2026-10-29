import test from 'node:test';
import assert from 'node:assert/strict';
import { poseStrokePoint, PoseStrokeSource, POSE_INPUT } from '../src/natpf/webcam_pose_strokes.js';
import { createStrokeTracker } from '../src/natpf/webcam_strokes.js';
import { NatpfBodyFollow } from '../src/natpf/webcam_body_follow.js';
import { MotionController } from '../src/motion_controls.js';
import { makeFake, handLandmarks } from './webcam-sim.mjs';

function landmarks({ x = .5, width = .16, wx = .35, wy = .6, vis = .95 } = {}){
  const lm = Array.from({ length: 33 }, () => ({ x, y: .5, z: 0, visibility: 0 }));
  lm[11] = { x: x + width/2, y: .35, visibility: vis };
  lm[12] = { x: x - width/2, y: .35, visibility: vis };
  lm[14] = { x: x - width*.6, y: .45, visibility: vis };
  lm[16] = { x: wx, y: wy, visibility: vis };
  lm[13] = { x: x + width*.6, y: .45, visibility: vis };
  lm[15] = { x: .7, y: .55, visibility: vis };
  return lm;
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('Pose a distanza: un solo polso secondo la mano scelta, specchiato e scalato dal busto', () => {
  const right = poseStrokePoint(landmarks()), left = poseStrokePoint(landmarks(), { hand: 'left' });
  near(right.x, .65); near(left.x, .3); near(right.scale, .032);
  assert.equal(right.pose.source, 'pose');
  assert.equal(poseStrokePoint(landmarks({ vis: .2 })), null);
  assert.equal(poseStrokePoint(landmarks({ wx: 1.1 })), null);
  assert.equal(poseStrokePoint([]), null);
});

test('continuità: acquisizione stabile, salto su un altro busto rifiutato e campioni vecchi scartati', () => {
  const source = new PoseStrokeSource();
  for (const now of [0, 80, 160]) assert.equal(source.push(landmarks(), { now }), null);
  assert.ok(source.push(landmarks(), { now: 240 }));
  assert.equal(source.push(landmarks({ x: .82, wx: .8 }), { now: 320 }), null);
  assert.ok(source.push(landmarks(), { now: 400 }));
  assert.equal(source.push(landmarks(), { now: 500, captureT: 100 }), null);
  assert.equal(source.push(landmarks(), { now: 500, captureT: 399 }), null);
  assert.equal(source.push(landmarks(), { now: 600, anchor: { x: .1, y: .5, t: 590 } }), null);
});

test('muovere il busto da solo non diventa uno swing del polso', () => {
  const source = new PoseStrokeSource(), tracker = createStrokeTracker(), events = [];
  const points = [];
  for (let now = 0; now <= 2000; now += 80){
    const dx = now > 400 ? Math.min(.18, (now - 400)/4000) : 0;
    const s = source.push(landmarks({ x: .5 + dx, wx: .35 + dx }), { now });
    if (s){ points.push(s); events.push(...tracker.push({ ...s, aspect: .75, canToss: false })); }
  }
  assert.ok(points.length > 10);
  for (const p of points) near(p.x, points[0].x);
  assert.equal(events.filter(e => e.type !== 'confirm').length, 0);
});

test('traccia Pose: uno swing laterale a distanza produce un solo colpo, il ritorno non ne aggiunge', () => {
  const source = new PoseStrokeSource(), tracker = createStrokeTracker(), events = [];
  let now = 0;
  const feed = wx => {
    const s = source.push(landmarks({ wx }), { now });
    if (s) events.push(...tracker.push({ ...s, aspect: .75, canToss: false }));
    now += POSE_INPUT.intervalMs;
  };
  for (let i = 0; i < 22; i++) feed(.35);
  for (const x of [.35, .4, .56, .68]) feed(x); // swing di 240 ms, campionato a 12,5 Hz
  for (let i = 0; i < 8; i++) feed(.68);
  for (let i = 0; i <= 16; i++) feed(.68 - .33*i/16);
  for (let i = 0; i < 25; i++) feed(.35);
  const shots = events.filter(e => e.type === 'swing');
  assert.equal(shots.length, 1, JSON.stringify(events));
  assert.notEqual(shots[0].shotType, 'lob');
});

// con la traccia della mano NATPF (?webcamMano=1): con la webcam di argon-tennis (predefinita) il polso dal corpo non serve
test('Pose resta disponibile con movimento automatico e condivide lo slot di inferenza con Hands', async () => {
  const mc = { webcamActive: true, webcamMode: 'hands', handPreference: 'right', videoElem: { readyState: 4, currentTime: 1 } };
  const e = { motionController: mc, phase: 'RALLY', playerRole: 'p1' };
  const body = new NatpfBodyFollow(e, { autostart: false });
  body.mode = 'auto';
  let calls = 0;
  body.pose = { send: async () => { calls++; } };
  body.tick(1000); assert.equal(calls, 1); assert.equal(mc._poseInferenceBusy, true);
  await new Promise(r => setTimeout(r, 0));
  mc.videoElem.currentTime = 2; body.tick(1010); assert.equal(calls, 1, 'limite della frequenza');
  mc._mpBusy = true; body.tick(1100); assert.equal(calls, 1, 'Hands sta lavorando');
  assert.equal(mc._poseRequested, true, 'il primo slot libero è prenotato per Pose');
  mc._mpBusy = false; body.tick(1100); assert.equal(calls, 2); assert.equal(mc._poseRequested, false);
  assert.equal(body.enabled, false, 'il movimento automatico non viene cambiato');
});

test('salute webcam: il polso Pose valido mantiene il gioco attivo, un campione vecchio no', () => {
  const mc = Object.create(MotionController.prototype);
  Object.assign(mc, { webcamActive: true, webcamMode: 'hands', _wcStartedAt: 0, _poseModelReady: true, _poseSeenAt: 1000, _frameMeta: { at: 1000 } });
  const good = mc.webcamHealth(1100);
  assert.equal(good.model, true); assert.equal(good.handAgeMs, 100);
  assert.ok(mc.webcamHealth(2000).handAgeMs > POSE_INPUT.freshMs);
});

test('Pose → controller vero: un colpo, campione consumato una volta, ritorno a Hands senza colpi fantasma', () => {
  const mc = makeFake(MotionController, { tracker: createStrokeTracker() });
  mc._poseModelReady = true; mc._wcStartedAt = 0;
  let now = 0;
  const original = Object.getOwnPropertyDescriptor(performance, 'now');
  Object.defineProperty(performance, 'now', { value: () => now, configurable: true });
  try {
    const feed = wx => {
      mc.videoElem.currentTime = now/1000;
      mc._onPoseResults({ poseLandmarks: landmarks({ wx }) }, now, now);
      mc._processWebcamFrame(); mc._processWebcamFrame();
      now += POSE_INPUT.intervalMs;
    };
    for (let i = 0; i < 22; i++) feed(.35);
    for (const x of [.35, .4, .56, .68]) feed(x);
    for (let i = 0; i < 8; i++) feed(.68);
    for (let i = 0; i <= 16; i++) feed(.68 - .33*i/16);
    for (let i = 0; i < 25; i++) feed(.35);
    assert.equal(mc.events.length, 1, JSON.stringify(mc.events));
    assert.equal(mc.events[0].src, 'pose');
    assert.ok(mc.webcamHealth(now).handAgeMs < 100);
    mc._onHandResults({ multiHandLandmarks: [handLandmarks({ S: .4, y: .5 })], multiHandedness: [{ label: 'Left', score: .95 }] });
    mc._processWebcamFrame();
    assert.equal(mc._lastWebcamSource, 'hands');
    assert.equal(mc.events.length, 1, 'il cambio di sorgente non è un altro colpo');
  } finally {
    if (original) Object.defineProperty(performance, 'now', original); else delete performance.now;
  }
});

test('scheduler: Hands aspetta Pose e durante il fallback verifica le dita con frequenza limitata', () => {
  const mc = Object.create(MotionController.prototype); let sends = 0;
  Object.assign(mc, { webcamActive: true, videoElem: { readyState: 4 }, mpHands: { send: async () => { sends++; } }, _poseInferenceBusy: true });
  assert.equal(mc._sendFrame(1000), false);
  mc._poseInferenceBusy = false; mc._poseRequested = true;
  assert.equal(mc._sendFrame(1000), false, 'rispetta la prenotazione di Pose dopo Hands');
  mc._poseRequested = false;
  mc._poseInferenceBusy = false; mc._poseUseUntil = 1800; mc._mpSentAt = 900;
  assert.equal(mc._sendFrame(1100), false);
  assert.equal(mc._sendFrame(1500), true); assert.equal(sends, 1);
});
