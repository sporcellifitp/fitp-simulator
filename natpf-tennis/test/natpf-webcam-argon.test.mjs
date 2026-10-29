// Webcam come nello zip argon-tennis consegnato dall'utente il 29/10 (motore base): richiesta «ristabilire la
// funzionalità di gioco mediante webcam prendendola esclusivamente dallo zip». Riconoscimento (mano di MediaPipe, scia
// breve, soglie, lato, tipo di colpo, lancio, 320 ms tra due colpi) e gioco del colpo nel motore (servizio, colpo
// assistito che aspetta il punto giusto fino a 0,48 s) come nello zip; il telefono resta com'era.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

const { MotionController: MC, ARGON_HANDS_OPTIONS, webcamModeFrom } = await import('../src/motion_controls.js');

// controller sul prototipo vero con i soli campi della webcam; il modello delle mani finto risponde con la mano in (S, y)
// (S nell'immagine specchiata, come nel gioco; i landmark del modello sono nell'immagine non specchiata)
function makeArgon(){
  const mc = Object.create(MC.prototype), events = [];
  Object.assign(mc, {
    webcamMode: 'argon', webcamActive: true, videoElem: { readyState: 4, currentTime: 0 }, _lastVideoTime: undefined,
    latestHandLandmarks: null, latestHandSeenAt: null, _hasNewHandResult: false, _mpBusy: false, lastWebcamTriggerMs: 0,
    smoothedCentroid: { x: .5, y: .5 }, motionVector: { vx: 0, vy: 0, mag: 0 }, _webcamTrail: null, _lastWebcamSource: null,
    onTrack: null, role: 'p1', phoneState: { orientation: { pitch: 0, roll: 0 } },
  });
  mc._emitSwing = e => events.push({ kind: 'swing', ...e });
  mc._emitToss = e => events.push({ kind: 'toss', ...e });
  let hand = null;
  mc.mpHands = { send(){ const lm = hand && Array.from({ length: 21 }, () => ({ x: 1 - hand.S, y: hand.y, z: 0 })); mc._onArgonHandResults({ multiHandLandmarks: lm ? [lm] : [] }); return Promise.resolve(); } };
  // un fotogramma della camera a 30 Hz con la mano in p (o senza mano): il risultato arriva, poi il fotogramma dopo lo usa
  const realNow = performance.now;
  let t = 1000;
  const frame = p => {
    hand = p; mc.videoElem.currentTime += 1/30; t += 1000/30;
    performance.now = () => t;
    try { mc._argonFrame(t); mc._argonFrame(t); } finally { performance.now = realNow; }
  };
  return { mc, events, frame, at: () => t };
}

test('argon-tennis: opzioni del modello delle mani dello zip; webcam di argon-tennis predefinita', () => {
  assert.deepEqual({ ...ARGON_HANDS_OPTIONS }, { maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: .4, minTrackingConfidence: .4 });
  assert.equal(webcamModeFrom(''), 'argon');
});

test('argon-tennis: la mano che attraversa veloce e dritta è un colpo (lato dal verso, topspin); 320 ms prima di un altro; la mano lenta no', () => {
  const { mc, events, frame } = makeArgon();
  for (let i = 0; i < 6; i++) frame({ S: .3, y: .55 });
  // verso destra nell'immagine specchiata: 0,4 larghezze in 4 fotogrammi (133 ms)
  for (let i = 1; i <= 4; i++) frame({ S: .3 + .1*i, y: .55 });
  assert.equal(events.length, 1, JSON.stringify(events));
  const s = events[0];
  assert.equal(s.kind, 'swing'); assert.equal(s.source, 'webcam'); assert.equal(s.side, 'backhand'); assert.equal(s.shotType, 'topspin');
  assert.ok(s.speed >= .85 && s.speed <= 1.65 && s.dirX > 0, JSON.stringify(s));
  // subito indietro: dentro i 320 ms nessun altro colpo
  for (let i = 1; i <= 3; i++) frame({ S: .7 - .1*i, y: .55 });
  assert.equal(events.length, 1);
  // verso sinistra dopo una pausa: dritto
  for (let i = 0; i < 10; i++) frame({ S: .4, y: .55 });
  for (let i = 1; i <= 4; i++) frame({ S: .4 + -.08*i, y: .55 });
  assert.equal(events.length, 2); assert.equal(events[1].side, 'forehand');
  // mano lenta (si sistema): niente
  const slow = makeArgon();
  for (let i = 0; i < 40; i++) slow.frame({ S: .3 + .004*i, y: .55 });
  assert.equal(slow.events.length, 0);
});

test('argon-tennis: la mano che sale veloce in alto è il lancio; dall\'alto in basso è un tagliato; la mano persa usa il flusso ottico', () => {
  const up = makeArgon();
  for (let i = 0; i < 6; i++) up.frame({ S: .5, y: .62 });
  for (let i = 1; i <= 4; i++) up.frame({ S: .5, y: .62 - .08*i });
  assert.equal(up.events[0]?.kind, 'toss', JSON.stringify(up.events));
  const down = makeArgon();
  for (let i = 0; i < 6; i++) down.frame({ S: .35, y: .3 });
  for (let i = 1; i <= 4; i++) down.frame({ S: .35 + .06*i, y: .3 + .07*i });
  assert.equal(down.events[0]?.shotType, 'slice', JSON.stringify(down.events));
  // senza mano: il flusso ottico dello zip legge i pixel (qui un'immagine ferma: nessun colpo)
  const none = makeArgon();
  let reads = 0;
  Object.assign(none.mc, { flowWidth: 64, flowHeight: 48, hasPrevFrame: false, prevLuma: new Float32Array(64*48), motionEnergyMap: new Float32Array(64*48),
    offscreenCtx: { save(){}, scale(){}, drawImage(){}, restore(){}, getImageData: (x, y, w, h) => (reads++, { data: new Uint8ClampedArray(w*h*4).fill(90) }) } });
  for (let i = 0; i < 5; i++) none.frame(null);
  assert.ok(reads >= 4); assert.equal(none.events.length, 0);
});

test('argon-tennis: lancio rifiutato nello scambio = pallonetto (come nello zip)', () => {
  const mc = Object.create(MC.prototype), swings = [];
  Object.assign(mc, { webcamMode: 'argon', role: 'p1', _listeners: { toss: [], swing: [] }, phoneState: { orientation: { pitch: 0, roll: 0 } }, onToss: () => false, onSwing: null });
  mc._emitSwing = e => swings.push(e);
  mc._emitToss({ source: 'webcam', side: null, shotType: 'lob', speed: 1.3, dirX: 0, dirY: -.9 });
  assert.equal(swings.length, 1); assert.equal(swings[0].shotType, 'lob');
  // con la traccia della mano NATPF no (la mano che sale segue le sue regole)
  mc.webcamMode = 'hands'; mc._emitToss({ source: 'webcam', shotType: 'lob' });
  assert.equal(swings.length, 1);
});

function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(31);
  try {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    e.motionController = { webcamMode: 'argon' };
    return fn(e);
  } finally { Math.random = real; }
}
const webcamSwing = (o = {}) => ({ source: 'webcam', side: 'forehand', shotType: 'topspin', speed: 1.3, dirX: -.3, dirY: -.4, ...o });

test('argon-tennis nel motore: lo swing in anticipo aspetta il punto giusto (colpo assistito, 0,48 s) e colpisce; senza la finestra del telefono', () => {
  withEngine('pro', e => {
    e.phase = 'RALLY'; e.autoPlayMode = false; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
    e.player.pos.set(.4, 0, 11.7); e.player.targetPos.copy(e.player.pos);
    e.ball.pos.set(-.5, 1, -11);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(1.4, 0, 8.6), 1.05, { topspin: 14 });
    e._natpfPlanPlayer();
    let sent = false, hit = false, pend = null, at = null;
    for (let i = 0; i < 600 && !hit; i++){
      // lo swing quando la palla è a 3 m davanti a chi gioca
      if (!sent && e.ball.pos.z - e.player.pos.z > -3.2 && e.ball.pos.z - e.player.pos.z < -1){ at = e.elapsedTime; e._handleUserSwingInput(webcamSwing()); sent = true; pend = e.pendingUserSwing; }
      const before = e.ball.lastHitter; e.step(1/120); hit = before !== 'player' && e.ball.lastHitter === 'player';
      if (e.phase !== 'RALLY') break;
    }
    assert.ok(sent && pend, 'swing in attesa');
    assert.equal(pend.waitForSweetSpot, true); assert.equal(pend.evt.sweetSpotAssisted, true); assert.ok(!pend.natpfWindow, 'non la finestra del telefono');
    assert.ok(Math.abs(pend.expiresAt - at - .48) < 1e-9, 'attesa massima 0,48 s, come nello zip');
    assert.ok(hit, 'colpita al punto giusto');
  });
});

test('argon-tennis nel motore: servizio come nello zip (lancio dal colpo, battuta subito o al colmo)', () => {
  withEngine('pro', e => {
    e.phase = 'SERVE_STANCE'; e.score.server = 'player'; e.autoPlayMode = false;
    e._handleUserSwingInput(webcamSwing());
    assert.equal(e.phase, 'SERVE_TOSS');
    // palla che sale tra 1,45 e 2,25 m: la battuta aspetta il colmo
    e.phaseTimer = .3; e.ball.pos.y = 1.7; e.ball.vel.y = 3;
    e._handleUserSwingInput(webcamSwing({ speed: 1.1 }));
    assert.ok(e.pendingServeSwing && e.pendingServeSwing.evt.speed >= 1.22, JSON.stringify(e.pendingServeSwing));
  });
});

test('argon-tennis: il modello delle mani parte nella pagina con le opzioni dello zip e i risultati vanno alla scia dello zip', async () => {
  const names = ['location', 'window'];
  const saved = names.map(k => Object.getOwnPropertyDescriptor(globalThis, k));
  const made = [];
  class FakeHands { constructor(o){ this.o = o; made.push(this); } setOptions(o){ this.opts = o; } onResults(f){ this.cb = f; } async initialize(){} send(){ return Promise.resolve(); } }
  try {
    globalThis.location = { href: 'https://localhost/?webcamWorker=1', search: '?webcamWorker=1' };
    globalThis.window = globalThis; globalThis.window.Hands = FakeHands;
    const mc = Object.create(MC.prototype);
    Object.assign(mc, { webcamMode: 'argon', webcamActive: true, phoneState: {}, _notifyStatus(){}, _updateWebcamBadgeUI(){} });
    await mc._ensureMediaPipeHands();
    assert.equal(made.length, 1, 'nella pagina, anche con ?webcamWorker=1 (lo zip non ha il worker)');
    assert.deepEqual(made[0].opts, { ...ARGON_HANDS_OPTIONS });
    made[0].cb({ multiHandLandmarks: [Array.from({ length: 21 }, () => ({ x: .4, y: .5, z: 0 }))] });
    assert.ok(mc.latestHandLandmarks && mc._hasNewHandResult && mc.latestHandSeenAt > 0, 'risultato come nello zip (prima mano)');
    made[0].cb({ multiHandLandmarks: [] });
    assert.equal(mc.latestHandLandmarks, null);
  } finally {
    delete globalThis.Hands;
    names.forEach((k, i) => { if (saved[i]) Object.defineProperty(globalThis, k, saved[i]); else delete globalThis[k]; });
  }
});
