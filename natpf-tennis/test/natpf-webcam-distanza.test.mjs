// Webcam per uno («argon», predefinita) da 1 a 4 m (richiesta del 30/10): camera fino a 1280×720, ritaglio attorno alla
// mano lontana dato al modello (src/natpf/webcam_roi.js), ingrandimento dei movimenti fino a ×6 e grandezza della mano
// in 3D (webcam_argon_track.js). Il banco completo è scripts/audit/webcam-distanza.mjs (anche in webcam-sweep.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROI, ROI_FULL, RoiPlanner, roiFrac, roiAt, roiToFull, roiPixels, singleCameraAttempts, SINGLE_CAMERA } from '../src/natpf/webcam_roi.js';
import { ARGON_TRACK, argonHandSize, argonScale, argonAspectK, argonTrailEvent } from '../src/natpf/webcam_argon_track.js';
import { runArgonSwing, runArgonIdle, runArgonTrial, ARGON_CAMS } from './webcam-sim.mjs';

const { MotionController: MC } = await import('../src/motion_controls.js');
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

test('ritaglio: lato dalla grandezza della mano (intera fino a ~2,5 m, al massimo ×2,9), dentro l\'immagine', () => {
  assert.equal(roiFrac(null), 1); assert.equal(roiFrac(.07), 1); assert.equal(roiFrac(ROI.smallHand), 1);
  assert.equal(roiFrac(.031), 1, 'appena sotto la soglia: lato oltre fullFrac, immagine intera');
  assert.ok(near(roiFrac(.02), .02/ROI.target));
  assert.equal(roiFrac(.005), ROI.minFrac);
  assert.deepEqual(roiAt(.5, .5, 1), ROI_FULL);
  const r = roiAt(.95, .02, .4);
  assert.ok(near(r.x, .6) && near(r.y, 0) && r.w === .4 && r.h === .4 && !r.full, JSON.stringify(r));
});

test('ritaglio: i punti trovati tornano all\'immagine intera (anche la z), il ritaglio copiato mai oltre 640 di larghezza', () => {
  const roi = { x: .3, y: .2, w: .5, h: .5, full: false };
  const [p] = roiToFull([{ x: .5, y: .5, z: -.1 }], roi);
  assert.ok(near(p.x, .55) && near(p.y, .45) && near(p.z, -.05), JSON.stringify(p));
  assert.equal(roiToFull([{ x: .5, y: .5 }], ROI_FULL)[0].x, .5);
  assert.deepEqual(roiPixels(ROI_FULL, 1280, 720), { sx: 0, sy: 0, sw: 1280, sh: 720, cw: 640, ch: 360 });
  assert.deepEqual(roiPixels(roi, 1280, 720), { sx: 384, sy: 144, sw: 640, sh: 360, cw: 640, ch: 360 });
  const s = roiPixels({ x: .1, y: .1, w: .35, h: .35 }, 1280, 720);
  assert.equal(s.cw, s.sw, 'ritaglio piccolo: i pixel veri della camera, non ingranditi');
  assert.deepEqual(roiPixels(ROI_FULL, 640, 480), { sx: 0, sy: 0, sw: 640, sh: 480, cw: 640, ch: 480 });
});

test('ritaglio: mano piccola seguita → attorno alla mano e fermo finché resta al centro; mano grande → immagine intera; persa → ricerca', () => {
  const P = new RoiPlanner();
  // nessuna mano: un fotogramma all'immagine intera e uno al centro (60%)
  const a = P.next(0, null), b = P.next(33, null);
  assert.ok(a.full && !b.full && near(b.w, ROI.searchFrac) && near(b.x + b.w/2, .5), JSON.stringify([a, b]));
  // mano piccola (0,014, ~4 m) a destra nell'immagine specchiata (x 0,7 → 0,3 nell'immagine della camera)
  const hand = { x: .7, y: .5, size: .014, seenAt: 100 }, F = .014/ROI.target;
  const c = P.next(110, hand);
  assert.ok(!c.full && near(c.w, F) && near(c.x + c.w/2, .3), JSON.stringify(c));
  assert.deepEqual(P.next(140, { ...hand, x: .72, seenAt: 140 }), c, 'mano ancora al centro del ritaglio: il ritaglio non si sposta');
  const d = P.next(170, { ...hand, x: .5, seenAt: 170 });
  assert.ok(near(d.x + d.w/2, .5), 'mano oltre la parte centrale: il ritaglio la segue');
  // appena persa: un fotogramma su due un ritaglio più largo
  const e1 = P.next(200, { ...hand, x: .5, seenAt: 170 }, true), e2 = P.next(233, { ...hand, x: .5, seenAt: 170 }, true);
  const ws = [e1.w, e2.w].sort();
  assert.ok(near(ws[0], F) && near(ws[1], F*ROI.widen), JSON.stringify([e1, e2]));
  // persa da più di lostMs: ricerca dove era (immagine intera e ritaglio)
  const f1 = P.next(170 + ROI.lostMs + 50, { ...hand, x: .5, seenAt: 170 }), f2 = P.next(170 + ROI.lostMs + 83, { ...hand, x: .5, seenAt: 170 });
  assert.ok([f1, f2].some(r => r.full) && [f1, f2].some(r => !r.full && near(r.x + r.w/2, .5)), JSON.stringify([f1, f2]));
  // mano grande (vicina): sempre l'immagine intera
  for (let i = 0; i < 4; i++) assert.ok(P.next(1000 + i*33, { x: .4, y: .5, size: .06, seenAt: 1000 + i*33 }).full);
});

test('camera per uno: il formato della camera dentro 1280×720 con almeno 24 fps, poi 640×480 come prima', () => {
  const a = singleCameraAttempts({ width: { max: 1920 }, height: { max: 1080 } });
  assert.deepEqual(a.map(x => [x.width, x.height, x.frameRate.min ?? null]), [[1280, 720, SINGLE_CAMERA.minFps], [640, 480, null]]);
  assert.deepEqual(singleCameraAttempts({ width: { max: 2592 }, height: { max: 1944 } })[0].width, 960);
  assert.deepEqual(singleCameraAttempts({ width: { max: 640 }, height: { max: 480 } }).map(x => x.width), [640]);
  assert.deepEqual(singleCameraAttempts(null).map(x => x.width), [1280, 640]);
});

test('nel controller: camera per uno a 1280×720 se la dà a ≥24 fps, altrimenti 640×480; registro della camera', async () => {
  const mc = Object.create(MC.prototype), asked = [], diag = [];
  Object.assign(mc, { webcamMode: 'argon', webcamDuo: false, webcamActive: true, webcamInfo: { chiesto: { w: 640, h: 480, fps: 30 } }, onTrack: d => diag.push(d) });
  let reject = 0;
  const tr = { label: 'Integrated Camera', getCapabilities: () => ({ width: { max: 1280 }, height: { max: 720 } }), applyConstraints: async c => { asked.push(c); if (reject-- > 0) throw new Error('OverconstrainedError'); }, getSettings: () => ({ width: asked.at(-1).width?.ideal ?? asked.at(-1).width, height: asked.at(-1).height?.ideal ?? asked.at(-1).height, frameRate: 30 }) };
  const stream = { getVideoTracks: () => [tr] };
  let st = await mc._applyCameraSize(stream);
  assert.equal(asked.length, 1); assert.equal(st.width, 1280); assert.equal(asked[0].frameRate.min, 24);
  assert.deepEqual(mc.webcamInfo.ottenuto, { w: 1280, h: 720, fps: 30 });
  assert.ok(diag.some(d => d.kind === 'camera' && d.livello === 'per uno'));
  // la camera non dà 1280×720 a 24 fps: 640×480
  reject = 1; asked.length = 0;
  st = await mc._applyCameraSize(stream);
  assert.deepEqual(asked.map(c => c.width?.ideal ?? c.width), [1280, 640]); assert.equal(st.width, 640);
  // con i riconoscimenti di confronto (non argon) resta 640×480
  mc.webcamMode = 'hands'; asked.length = 0;
  await mc._applyCameraSize(stream);
  assert.deepEqual(asked.map(c => c.width.ideal), [640]);
});

// controller sul prototipo vero (come natpf-webcam-argon-continuita) con una camera 1280×720 e un canvas finto: il
// modello finto vede le mani nell'immagine intera e risponde nelle coordinate del ritaglio che ha ricevuto
function rig({ w = 1280, h = 720 } = {}){
  const mc = Object.create(MC.prototype), events = [], sent = [];
  Object.assign(mc, {
    webcamMode: 'argon', webcamActive: true, videoElem: { readyState: 4, currentTime: 0, videoWidth: w, videoHeight: h }, _lastVideoTime: undefined,
    latestHandLandmarks: null, latestHandSeenAt: null, _hasNewHandResult: false, _mpBusy: false, lastWebcamTriggerMs: 0,
    smoothedCentroid: { x: .5, y: .5 }, motionVector: { vx: 0, vy: 0, mag: 0 }, _webcamTrail: null, _lastWebcamSource: null,
    role: 'p1', phoneState: { orientation: { pitch: 0, roll: 0 } },
    flowWidth: 64, flowHeight: 48, hasPrevFrame: false, prevLuma: new Float32Array(64*48), motionEnergyMap: new Float32Array(64*48),
    offscreenCtx: { save(){}, scale(){}, drawImage(){}, restore(){}, getImageData: (x, y, W, H) => ({ data: new Uint8ClampedArray(W*H*4).fill(90) }) },
  });
  const canvas = { width: 0, height: 0 };
  mc._roiCtx = { canvas, drawImage: (v, sx, sy, sw, sh, dx, dy, dw, dh) => sent.push({ sx, sy, sw, sh, dw, dh }) };
  mc._emitSwing = e => events.push({ kind: 'swing', ...e }); mc._emitToss = e => events.push({ kind: 'toss', ...e });
  let hands = [];
  const lmFull = hd => { const d = hd.size/(h/w), a = Array.from({ length: 21 }, () => ({ x: 1 - hd.S, y: hd.y, z: 0 })); a[0] = { x: 1 - hd.S, y: hd.y - .55*d, z: 0 }; a[9] = { x: 1 - hd.S, y: hd.y + .45*d, z: 0 }; return a; };
  mc.mpHands = { send({ image }){
    const roi = mc._mpRoi && !mc._mpRoi.full ? mc._mpRoi : null, out = [];
    for (const hd of hands){ const lm = lmFull(hd); if (roi && (lm[9].x < roi.x || lm[9].x > roi.x + roi.w)) continue; out.push(roi ? lm.map(p => ({ x: (p.x - roi.x)/roi.w, y: (p.y - roi.y)/roi.h, z: 0 })) : lm); }
    mc._onArgonHandResults({ multiHandLandmarks: out, image }); return Promise.resolve();
  } };
  const realNow = performance.now; let t = 1000;
  const frame = (...h) => { hands = h; mc.videoElem.currentTime += 1/30; t += 1000/30; performance.now = () => t; try { mc._argonFrame(t); mc._argonFrame(t); } finally { performance.now = realNow; } };
  return { mc, events, sent, frame, canvas };
}

test('nel controller: mano lontana → al modello il ritaglio attorno alla mano (≤640 px), punti riportati all\'immagine intera, colpo col lato giusto', () => {
  const { mc, events, sent, frame, canvas } = rig();
  const size = .014;   // mano a circa 4 m con una webcam da 78°
  for (let i = 0; i < 12; i++) frame({ S: .62, y: .55, size });
  assert.ok(sent.length > 0 && sent.every(s => s.dw <= ROI.maxModelW), JSON.stringify(sent.slice(-2)));
  assert.ok(!mc._mpRoi.full && mc._mpRoi.w < .5, 'ritaglio piccolo attorno alla mano');
  assert.equal(canvas.width, sent.at(-1).dw);
  assert.ok(Math.abs(mc._argonHand.x - .62) < .005 && Math.abs(mc._argonHand.y - .55) < .01, `mano nell'immagine intera: ${JSON.stringify(mc._argonHand)}`);
  assert.ok(Math.abs(mc._argonSize - size) < .002, `grandezza nell'immagine intera: ${mc._argonSize}`);
  // swing di 0,08 dell'immagine (circa mezzo metro a 4 m) in 133 ms verso sinistra: dritto del destro
  for (let i = 1; i <= 4; i++) frame({ S: .62 - .02*i, y: .55, size });
  assert.equal(events.length, 1, JSON.stringify(events));
  assert.equal(events[0].side, 'forehand');
});

test('nel controller: mano vicina → al modello il video intero come prima (nessuna copia, nessun ritaglio)', () => {
  for (const [w, h] of [[1280, 720], [640, 480]]){
    const r = rig({ w, h }), images = [], send = r.mc.mpHands.send.bind(r.mc.mpHands);
    r.mc.mpHands.send = a => (images.push(a.image), send(a));
    for (let i = 0; i < 8; i++) r.frame({ S: .5, y: .55, size: .06*w/1280 + .02 });
    assert.ok(r.mc._mpRoi.full);
    assert.equal(r.sent.length, 0, `${w}×${h}: nessuna copia nel canvas`);
    assert.ok(images.length >= 7 && images.every(im => im === r.mc.videoElem), `${w}×${h}: il video`);
  }
});

test('mano lontana: movimenti ingranditi fino a ×6; grandezza in 3D (mano girata verso la camera non sembra più lontana)', () => {
  assert.equal(ARGON_TRACK.scaleMax, 6);
  assert.ok(near(argonScale(.014), 5)); assert.equal(argonScale(.005), 6); assert.equal(argonScale(.08), 1);
  const lm = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 }));
  lm[0] = { x: .5, y: .5, z: 0 }; lm[9] = { x: .5, y: .5 + .02/.75, z: -.05 };
  assert.ok(near(argonHandSize(lm, .75), Math.hypot(.02, .05)), 'con la z');
  delete lm[9].z;
  assert.ok(near(argonHandSize(lm, .75), .02), 'senza la z come prima');
});

test('banco: swing della guida a 1, 2, 3 e 4 m con una webcam da portatile e una esterna grandangolare → lato giusto; da fermi nessun colpo', () => {
  let seed = 7;
  for (const camName of ['portatile 720p 70°', 'esterna 1080p 90°']) for (const D of [1, 2, 3, 4]) for (const [hand, dir, want] of [['right', -1, 'forehand'], ['right', 1, 'backhand'], ['left', 1, 'forehand']]){
    const r = runArgonSwing(MC, { dir, width: .5, T: .25, hand, D, cam: ARGON_CAMS[camName], seed: seed++ });
    const ev = r.events.filter(e => e.ts >= -.05 && e.ts <= .5);
    assert.ok(ev.length >= 1, `${camName} ${D} m ${hand} ${dir}: nessun colpo (${JSON.stringify(r.stats)})`);
    const side = hand === 'left' ? (ev[0].side === 'forehand' ? 'backhand' : 'forehand') : ev[0].side;
    assert.equal(side, want, `${camName} ${D} m ${hand} ${dir}`);
  }
  for (const D of [1, 4]){
    const r = runArgonIdle(MC, { D, cam: ARGON_CAMS['esterna 1080p 90°'], seed: 3, total: 8 });
    assert.equal(r.events.length, 0, `${D} m: ${JSON.stringify(r.events)}`);
  }
});

// Revisione del 31/10: con la camera 16:9 (1280×720) la x e la grandezza della mano, in larghezze dell'immagine, sono 0,75
// volte quelle a 640×480 4:3, la y no: le soglie dello zip (tarate su 4:3) vedevano la parte verticale del colpo il 33%
// più grande (più smash, lanci e pallonetti). Ora x e grandezza sono riportate a 4:3 (argonAspectK) prima della scia.
test('camera 16:9: lo stesso movimento dà lo stesso colpo che a 640×480 4:3 (tipo, velocità, lato); i valori non finiti non fanno colpi', () => {
  const A = 720/1280, size = .035, asp = { '4:3': .75, '16:9': A };
  assert.ok(near(argonAspectK(.75), 1) && near(argonAspectK(A), 4/3) && argonAspectK(NaN) === 1 && argonAspectK(0) === 1);
  assert.ok(near(argonScale(size*.75, A), argonScale(size)), 'la mano 16:9 ha la grandezza 4:3 corrispondente');
  assert.equal(argonScale(NaN, A), 1); assert.equal(argonScale(.03, NaN), argonScale(.03));
  // dy (in altezze dell'immagine, uguali nei due formati) scelti al confine tra due tipi di colpo
  let wrong = 0;
  for (const [dy, want] of [[.02, 'topspin'], [.05, 'slice'], [-.03, 'topspin'], [.06, 'smash'], [-.04, 'lob']]){
    const t43 = [0, 1, 2, 3, 4].map(i => ({ x: .6 - .02*i, y: .5 + dy*i/4, t: 1000 + i*33 }));
    const t169 = t43.map(q => ({ ...q, x: .5 + (q.x - .5)*.75 }));
    const a = argonTrailEvent(t43, { scale: argonScale(size, asp['4:3']), aspect: asp['4:3'], now: 1200 }).event;
    const b = argonTrailEvent(t169, { scale: argonScale(size*.75, A), aspect: A, now: 1200 }).event;
    assert.equal(a.shotType, want, `dy ${dy}`);
    assert.deepEqual([b.type, b.side, b.shotType], [a.type, a.side, a.shotType], `dy ${dy}`);
    assert.ok(near(b.speed, a.speed, 1e-9) && near(b.dirX, a.dirX, 1e-9) && near(b.dirY, a.dirY, 1e-9), `dy ${dy}`);
    // le coordinate 16:9 date allo zip così come sono (prima della correzione): tipo diverso al confine
    const c = argonTrailEvent(t169, { scale: argonScale(size*.75), now: 1200 }).event;
    if (c.shotType !== a.shotType) wrong++;
  }
  assert.ok(wrong >= 3, `senza riportare a 4:3 cambiano ${wrong} colpi su 5`);
  const bad = [{ x: .5, y: .5, t: 1000 }, { x: NaN, y: .5, t: 1033 }];
  assert.equal(argonTrailEvent(bad, { now: 1200 }), null);
  assert.equal(argonTrailEvent([{ x: .5, y: .5, t: 1000 }, { x: .3, y: .5, t: NaN }], { now: 1200 }), null);
});

test('banco: colpi 3D a 2 m con la camera 640×480 e 1280×720 → stesso tipo di colpo all\'impatto, lanci quasi uguali', () => {
  const GROUND = ['FH_TOP', 'FH_FLAT', 'FH_SLICE', 'BH_TOP', 'BH_FLAT', 'BH_SLICE'];
  const impact = r => { const tc = r.path.tContact, h = r.events.filter(e => e.ts >= tc - .25 && e.ts <= tc + .3).sort((x, y) => Math.abs(x.ts - tc) - Math.abs(y.ts - tc))[0]; return h ? (h.kind === 'toss' ? 'toss' : h.shotType) : 'none'; };
  let n = 0, same = 0, toss = [0, 0];
  const diff = [];
  for (const camName of ['portatile 720p 70°', 'esterna 1080p 90°']){
    let seed = 1;
    for (const stroke of GROUND) for (const hand of ['right', 'left']){
      const [a, b] = [false, true].map(after => runArgonTrial(MC, { stroke, hand, D: 2, cam: ARGON_CAMS[camName], after, seed }));
      seed++; n++;
      if (impact(a) === impact(b)) same++; else diff.push(`${camName} ${stroke} ${hand}: ${impact(a)} → ${impact(b)}`);
      toss[0] += a.events.filter(e => e.kind === 'toss').length; toss[1] += b.events.filter(e => e.kind === 'toss').length;
    }
  }
  // con le coordinate 16:9 date allo zip così come sono: 15/24 e lanci da 33 a 51
  assert.ok(same >= n - 2, `${same}/${n}: ${diff.join('; ')}`);
  assert.ok(Math.abs(toss[1] - toss[0]) <= Math.max(3, .2*toss[0]), `lanci ${toss[0]} → ${toss[1]}`);
});

test('riquadro della webcam (160×120): il video 16:9 si taglia ai lati invece di schiacciarsi, i punti della mano restano sopra la mano', () => {
  const mc = Object.create(MC.prototype);
  mc.videoElem = { videoWidth: 1280, videoHeight: 720 };
  const c = mc._hudCrop(160, 120);
  assert.deepEqual([c.sx, c.sy, c.sw, c.sh], [160, 0, 960, 720]);
  assert.ok(near(c.sw/c.sh, 160/120), 'proporzioni del riquadro');
  // punto dell'immagine a 1/8 dal bordo (pixel 160, l'inizio del taglio) → bordo del riquadro; centro → centro
  assert.ok(near(c.X(.125), 0) && near(c.X(.5), 80) && near(c.X(.875), 160) && near(c.Y(.5), 60) && near(c.Y(1), 120));
  mc.videoElem = { videoWidth: 640, videoHeight: 480 };
  const d = mc._hudCrop(160, 120);
  assert.deepEqual([d.sx, d.sy, d.sw, d.sh], [0, 0, 640, 480]);
  assert.ok(near(d.X(.3), 48) && near(d.Y(.3), 36), '4:3 come prima');
  mc.videoElem = { videoWidth: 0, videoHeight: 0 };
  assert.ok(near(mc._hudCrop(160, 120).X(.5), 80), 'video non ancora pronto');
});
