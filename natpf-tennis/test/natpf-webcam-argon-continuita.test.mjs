// Webcam «argon» (predefinita): continuità della mano nei colpi veloci, mano uscita dal bordo, due mani, modello
// bloccato (src/natpf/webcam_argon_track.js). Diagnostica 20261029-101056 (Lenovo E14, 640×480 a 30 Hz): nei colpi
// veloci la mano spariva per 100–170 ms e ricompariva dall'altra parte; prima il flusso ottico partiva al primo
// fotogramma senza mano (confrontando con un'immagine vecchia) e 16 colpi su 18 venivano da lì, al limite di velocità.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARGON_TRACK, argonPickHand, argonBridging, argonBridgeStart, argonNearEdge, argonScale } from '../src/natpf/webcam_argon_track.js';

const { MotionController: MC } = await import('../src/motion_controls.js');

// controller sul prototipo vero con i soli campi della webcam. hands: lista di punti {S, y} (S nell'immagine specchiata)
// o null; il flusso ottico legge un'immagine uniforme (nessun movimento) e conta le letture
function rig(){
  const mc = Object.create(MC.prototype), events = [], diag = [];
  let reads = 0;
  Object.assign(mc, {
    webcamMode: 'argon', webcamActive: true, videoElem: { readyState: 4, currentTime: 0 }, _lastVideoTime: undefined,
    latestHandLandmarks: null, latestHandSeenAt: null, _hasNewHandResult: false, _mpBusy: false, lastWebcamTriggerMs: 0,
    smoothedCentroid: { x: .5, y: .5 }, motionVector: { vx: 0, vy: 0, mag: 0 }, _webcamTrail: null, _lastWebcamSource: null,
    role: 'p1', phoneState: { orientation: { pitch: 0, roll: 0 } },
    flowWidth: 64, flowHeight: 48, hasPrevFrame: false, prevLuma: new Float32Array(64*48), motionEnergyMap: new Float32Array(64*48),
    offscreenCtx: { save(){}, scale(){}, drawImage(){}, restore(){}, getImageData: (x, y, w, h) => (reads++, { data: new Uint8ClampedArray(w*h*4).fill(90) }) },
  });
  mc.onTrack = d => diag.push(d);
  mc._emitSwing = e => events.push({ kind: 'swing', ...e });
  mc._emitToss = e => events.push({ kind: 'toss', ...e });
  let hands = null;
  // mano di grandezza h.size (polso → nocca del medio, in larghezze dell'immagine), centro in (S, y)
  const lm = h => {
    const d = (h.size || 0)/.75, a = Array.from({ length: 21 }, () => ({ x: 1 - h.S, y: h.y, z: 0 }));
    a[0] = { x: 1 - h.S, y: h.y - .55*d, z: 0 }; a[9] = { x: 1 - h.S, y: h.y + .45*d, z: 0 };
    return a;
  };
  mc.mpHands = { send(){ mc._onArgonHandResults({ multiHandLandmarks: hands ? hands.map(lm) : [] }); return Promise.resolve(); } };
  const realNow = performance.now;
  let t = 1000;
  const frame = (...list) => {
    hands = list.length && list[0] ? list : null; mc.videoElem.currentTime += 1/30; t += 1000/30;
    performance.now = () => t;
    try { mc._argonFrame(t); mc._argonFrame(t); } finally { performance.now = realNow; }
  };
  return { mc, events, diag, frame, reads: () => reads, at: () => t };
}

test('webcam argon: regole pure (mano più vicina, bordo, attesa, ripartenza della scia)', () => {
  const L = (S, y) => Array.from({ length: 21 }, () => ({ x: 1 - S, y }));
  assert.equal(argonPickHand([L(.2, .5), L(.7, .5)], { x: .68, y: .5, t: 1000 }, 1100), 1, 'la più vicina all\'ultima');
  assert.equal(argonPickHand([L(.2, .5), L(.7, .5)], { x: .68, y: .5, t: 1000 }, 1000 + ARGON_TRACK.pickMs + 1), 0, 'vista da troppo: la prima, come lo zip');
  assert.equal(argonPickHand([], null, 0), -1);
  assert.ok(argonNearEdge({ x: .5, y: .03 }) && argonNearEdge({ x: .96, y: .5 }) && !argonNearEdge({ x: .5, y: .5 }));
  assert.ok(argonBridging({ x: .5, y: .5, t: 1000 }, 1100) && !argonBridging({ x: .5, y: .5, t: 1000 }, 1000 + ARGON_TRACK.bridgeMs + 1));
  assert.ok(!argonBridging({ x: .5, y: .02, t: 1000 }, 1100), 'uscita dal bordo alto (servizio): niente attesa');
  assert.deepEqual(argonBridgeStart({ x: .4, y: .5, t: 1000 }, 1150, 900), { x: .4, y: .5, t: 1000 });
  assert.equal(argonBridgeStart({ x: .4, y: .5, t: 1000 }, 1150, 1050), null, 'colpo già partito nel buco');
});

test('webcam argon: la mano sparisce nel colpo veloce e ricompare dall\'altra parte → un colpo dalla mano, lato dallo spostamento, senza flusso ottico', () => {
  for (const [dir, side] of [[-1, 'forehand'], [1, 'backhand']]){
    const { mc, events, frame, reads } = rig();
    const S0 = dir < 0 ? .75 : .35;
    for (let i = 0; i < 8; i++) frame({ S: S0, y: .58 });
    frame({ S: S0 + dir*.02, y: .58 });                       // parte il colpo
    const r0 = reads();
    for (let i = 0; i < 4; i++) frame(null);                  // 133 ms di mosso: mano non vista
    assert.equal(reads(), r0, 'nel buco breve il flusso ottico non si usa');
    assert.equal(events.length, 0);
    frame({ S: S0 + dir*.36, y: .6 });                        // ricompare dall'altra parte
    assert.equal(events.length, 1, JSON.stringify(events));
    assert.equal(events[0].kind, 'swing'); assert.equal(events[0].side, side);
    assert.ok(Math.sign(events[0].dirX) === dir, JSON.stringify(events[0]));
    assert.ok(Math.abs(events[0].dirY) < .5, 'colpo orizzontale, non lancio né schiacciata dall\'alto');
    assert.equal(mc._lastWebcamSource, 'mediapipe');
  }
});

test('webcam argon: mano ferma persa per un attimo → niente colpo; mano non tornata → flusso ottico da un\'immagine nuova', () => {
  const still = rig();
  for (let i = 0; i < 8; i++) still.frame({ S: .5, y: .5 });
  for (let i = 0; i < 3; i++) still.frame(null);
  still.frame({ S: .505, y: .5 });
  assert.equal(still.events.length, 0);
  // mano a metà immagine che non torna: dopo bridgeMs il flusso ottico (il primo fotogramma è solo la base)
  const gone = rig();
  for (let i = 0; i < 8; i++) gone.frame({ S: .5, y: .5 });
  const r0 = gone.reads();
  const wait = Math.floor(ARGON_TRACK.bridgeMs/(1000/30));
  for (let i = 0; i < wait; i++) gone.frame(null);
  assert.equal(gone.reads(), r0, 'in attesa');
  gone.frame(null); gone.frame(null);
  assert.ok(gone.reads() >= r0 + 2, 'poi flusso ottico');
  assert.ok(gone.diag.some(d => d.kind === 'frame' && d.reason === 'mano non tornata'));
  assert.equal(gone.events.length, 0);
});

test('webcam argon: mano uscita dal bordo (braccio alzato nel servizio) → flusso ottico subito, da un\'immagine nuova', () => {
  const { mc, frame, reads, diag } = rig();
  for (let i = 0; i < 6; i++) frame({ S: .5, y: .3 - .04*i });   // sale verso il bordo alto
  frame({ S: .5, y: .05 });
  const r0 = reads();
  frame(null);
  assert.equal(reads(), r0 + 1, 'subito il flusso ottico');
  assert.equal(mc.hasPrevFrame, true, 'primo fotogramma: solo la base (nessun confronto con un\'immagine vecchia)');
  assert.ok(diag.some(d => d.kind === 'frame' && d.reason === 'mano uscita dal bordo'));
});

test('webcam argon: due mani, la prima della lista cambia → si segue la stessa mano, nessun colpo finto', () => {
  const { events, frame } = rig();
  for (let i = 0; i < 6; i++) frame({ S: .7, y: .55 }, { S: .25, y: .6 });
  for (let i = 0; i < 6; i++) frame({ S: .25, y: .6 }, { S: .7, y: .55 });    // il modello le dà nell'ordine inverso
  for (let i = 0; i < 6; i++) frame(i % 2 ? { S: .25, y: .6 } : { S: .7, y: .55 }, i % 2 ? { S: .7, y: .55 } : { S: .25, y: .6 });
  assert.equal(events.length, 0, JSON.stringify(events));
});

test('webcam argon: modello delle mani senza risposta → sbloccato, poi ricaricato; si riprende quando torna', () => {
  const { mc, frame, diag } = rig();
  let calls = 0, reloads = 0, closed = 0;
  mc.mpHands = { send(){ calls++; return new Promise(() => {}); }, close(){ closed++; } };   // non risponde mai
  mc._ensureMediaPipeHands = () => { reloads++; };
  const frames = Math.ceil(ARGON_TRACK.stallMs/(1000/30)) + 2;
  for (let i = 0; i < frames; i++) frame(null);
  assert.equal(calls, 2, 'sbloccato: un secondo invio');
  assert.ok(diag.some(d => d.kind === 'modello' && d.stato === 'sbloccato'));
  for (let i = 0; i < frames*2; i++) frame(null);
  assert.equal(reloads, 1); assert.equal(closed, 1); assert.equal(mc.mpHands, null);
  assert.ok(diag.some(d => d.kind === 'modello' && d.stato === 'ricaricato'));
});

test('webcam: camera ferma o chiusa dal sistema → si riapre da sola (una volta ogni reopenEveryMs), modello e partita intatti', async () => {
  const { mc, diag } = rig();
  const tracks = [];
  const stream = () => {
    const tr = { stopped: false, on: {}, stop(){ this.stopped = true; }, addEventListener(k, f){ this.on[k] = f; } };
    tracks.push(tr);
    return { getTracks: () => [tr], getVideoTracks: () => [tr] };
  };
  let opens = 0;
  const had = Object.getOwnPropertyDescriptor(globalThis.navigator, 'mediaDevices');
  Object.defineProperty(globalThis.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => (opens++, stream()) } });
  try {
    const model = mc.mpHands;
    mc.webcamStream = stream(); mc._watchTrackEnd(mc.webcamStream);
    mc.videoElem.play = async () => {};
    const realNow = performance.now;
    let t = 5000;
    const tick = () => { performance.now = () => t; try { mc._processWebcamFrame(); } finally { performance.now = realNow; } };
    // fotogrammi che arrivano: nessuna riapertura
    for (let i = 0; i < 30; i++){ mc.videoElem.currentTime += 1/30; t += 33; tick(); }
    assert.equal(opens, 0);
    // camera ferma: stessa immagine per più di frameStallMs
    for (let i = 0; i < Math.ceil(ARGON_TRACK.frameStallMs/33) + 2; i++){ t += 33; tick(); }
    await new Promise(r => setTimeout(r, 0));
    assert.equal(opens, 1); assert.equal(tracks[0].stopped, true, 'la camera vecchia si chiude');
    assert.equal(mc.mpHands, model, 'il modello delle mani resta');
    assert.ok(diag.some(d => d.kind === 'riapertura' && d.motivo === 'camera ferma' && d.stato === 'riuscita'));
    // camera chiusa dal sistema: evento «ended» della traccia nuova, dopo reopenEveryMs
    mc._reopenedAt = performance.now() - ARGON_TRACK.reopenEveryMs - 1;
    tracks[1].on.ended();
    await new Promise(r => setTimeout(r, 0));
    assert.equal(opens, 2);
    assert.ok(diag.some(d => d.kind === 'riapertura' && d.motivo === 'camera chiusa' && d.stato === 'riuscita'));
    // subito un'altra chiusura: non oltre una riapertura ogni reopenEveryMs
    tracks[2].on.ended();
    await new Promise(r => setTimeout(r, 0));
    assert.equal(opens, 2);
    // webcam spenta da chi gioca: niente riaperture
    mc.webcamActive = false; mc._reopenedAt = -Infinity; tracks[2].on.ended();
    await new Promise(r => setTimeout(r, 0));
    assert.equal(opens, 2);
  } finally {
    if (had) Object.defineProperty(globalThis.navigator, 'mediaDevices', had); else delete globalThis.navigator.mediaDevices;
  }
});

test('webcam argon: a distanza (mano piccola) lo stesso colpo conta; vicino le soglie restano quelle dello zip', () => {
  assert.equal(argonScale(.09), 1); assert.equal(argonScale(.07), 1); assert.equal(argonScale(.035), 2); assert.equal(argonScale(.01), ARGON_TRACK.scaleMax);
  const swing = size => {
    const { events, frame } = rig();
    for (let i = 0; i < 8; i++) frame({ S: .5, y: .55, size });
    for (let i = 1; i <= 4; i++) frame({ S: .5 - .0225*i, y: .55, size });   // 0,09 di immagine in 133 ms
    return events;
  };
  assert.equal(swing(.08).length, 0, 'mano vicina: movimento piccolo, niente (come lo zip)');
  const far = swing(.035);
  assert.equal(far.length, 1, 'mano a distanza doppia: lo stesso colpo ridotto a metà nell\'immagine conta');
  assert.equal(far[0].side, 'forehand');
});

test('webcam argon: più persone in vista → si aggancia la mano più grande e non si salta su un\'altra persona (niente colpi finti)', () => {
  const { mc, events, frame } = rig();
  // chi gioca davanti (mano grande) e una persona dietro (mano piccola), il modello le dà in ordine qualsiasi
  for (let i = 0; i < 6; i++) frame(...(i % 2 ? [{ S: .85, y: .5, size: .03 }, { S: .4, y: .55, size: .07 }] : [{ S: .4, y: .55, size: .07 }, { S: .85, y: .5, size: .03 }]));
  assert.ok(Math.abs(mc._argonHand.x - .4) < 1e-6, 'agganciata la mano di chi gioca');
  // chi gioca sparisce per 3 fotogrammi (mosso): resta solo l'altra persona, che non prende il posto
  for (let i = 0; i < 3; i++) frame({ S: .85, y: .5, size: .03 });
  assert.ok(Math.abs(mc._argonHand.x - .4) < 1e-6, JSON.stringify(mc._argonHand));
  assert.equal(events.length, 0, JSON.stringify(events));
  // persa a lungo (oltre pickMs): si riaggancia quella che c'è
  for (let i = 0; i < Math.ceil(ARGON_TRACK.pickMs/(1000/30)) + 2; i++) frame(null);
  frame({ S: .85, y: .5, size: .03 });
  assert.ok(Math.abs(mc._argonHand.x - .85) < 1e-6);
  assert.equal(events.length, 0);
});
