// Webcam per due (stesso schermo con una webcam): src/natpf/webcam_duo.js. P1 a sinistra, P2 a destra nell'immagine
// specchiata; ogni colpo esce con il suo giocatore; la mano di uno non diventa quella dell'altro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DuoTracker, widestCamera, DUO, duoFlowCols } from '../src/natpf/webcam_duo.js';
import { argonFlowBlob, ARGON_TRACK } from '../src/natpf/webcam_argon_track.js';
import { SCENES } from './webcam-duo-scenes.mjs';

// Corsie larghe e tolleranti (richiesta del 30/10): scene con giocatori che si muovono (test/webcam-duo-scenes.mjs),
// dieci semi ciascuna. Con il codice di prima: attraversamento senza colpo (mano mai ripresa), attraversamento da solo
// e una mano sola al centro con il colpo all'altro giocatore, incrocio con le mani scambiate e nessun colpo.
const seeds = Array.from({ length: 10 }, (_, i) => i + 1);
const whoSide = r => r.events.map(e => `${e.who}·${e.side}`);
test('due giocatori si avvicinano fino a sovrapporsi e si riallontanano: nessuno scambio di mani, nessun colpo', () => {
  for (const seed of seeds){ const r = SCENES.avvicinamento(DuoTracker, { seed }); assert.equal(r.swaps, 0, `seme ${seed}`); assert.deepEqual(r.events, [], `seme ${seed}`); }
});
test('il P1 passa oltre il centro e perde la mano più a lungo di pickMs: la riprende lì e il suo colpo è suo', () => {
  for (const seed of seeds){
    const r = SCENES.attraversamento(DuoTracker, { seed });
    assert.equal(r.swaps, 0, `seme ${seed}`); assert.deepEqual(whoSide(r), ['p1·backhand'], `seme ${seed}`);
    assert.ok(r.tr.split() > .6, `confine spostato con le case: ${r.tr.split()}`);
  }
});
test('il P1 oltre il centro con il P2 assente: la mano del P1 non diventa del P2 (niente colpi finti del P2)', () => {
  for (const seed of seeds){ const r = SCENES.attraversamentoDaSolo(DuoTracker, { seed }); assert.equal(r.swaps, 0, `seme ${seed}`); assert.deepEqual(whoSide(r), ['p1·backhand'], `seme ${seed}`); }
});
test('una sola mano in vista va a chi l\'aveva, anche appena oltre il centro', () => {
  for (const seed of seeds){
    for (const [name, want] of [['unaManoSola', 'p2·forehand'], ['unaManoSolaAlCentro', 'p2·backhand']]){
      const r = SCENES[name](DuoTracker, { seed });
      assert.equal(r.swaps, 0, `${name} seme ${seed}`); assert.deepEqual(whoSide(r), [want], `${name} seme ${seed}`);
    }
  }
});
test('mani che si incrociano veloci: ognuno segue la sua (velocità prevista), un colpo per ciascuno col lato giusto', () => {
  for (const seed of seeds){
    const r = SCENES.incrocio(DuoTracker, { seed });
    assert.deepEqual(whoSide(r).sort(), ['p1·backhand', 'p2·forehand'], `seme ${seed}`);
    assert.ok(Math.abs(r.tr.lanes.p1.hand.x - .42) < .02 && Math.abs(r.tr.lanes.p2.hand.x - .58) < .02, `seme ${seed}: ${r.tr.lanes.p1.hand.x} ${r.tr.lanes.p2.hand.x}`);
    assert.ok(r.swaps <= 3, `seme ${seed}: ${r.swaps} fotogrammi scambiati nell'istante in cui le mani si toccano`);
  }
});
test('confine tra le corsie e colonne del flusso: a metà tra le case, nella fascia 0,3–0,7; a metà immagine come prima', () => {
  assert.deepEqual(duoFlowCols(.5), DUO.cols);
  assert.deepEqual(duoFlowCols(.7), { p1: { from: 0, to: 5 }, p2: { from: 6, to: 7 } });
  assert.deepEqual(duoFlowCols(.1), { p1: { from: 0, to: 1 }, p2: { from: 2, to: 7 } });
  const tr = new DuoTracker();
  assert.equal(tr.split(), .5);
  tr.lanes.p1.home = { x: .55, y: .5 }; tr.lanes.p2.home = { x: .95, y: .5 };
  assert.equal(tr.split(), DUO.splitMax);
  tr.lanes.p1.home = { x: .8, y: .5 }; tr.lanes.p2.home = { x: .6, y: .5 };
  assert.equal(tr.split(), .5, 'case invertite: metà immagine');
});
test('mano libera dell\'altro giocatore: una corsia mai agganciata prende solo dalla sua parte del confine', () => {
  const tr = new DuoTracker(); let t = 1000;
  // solo il P1 con le due mani (racchetta a 0,3, mano libera a 0,45): il P2 non c'è e non prende la mano libera del P1
  for (let i = 0; i < 20; i++){ t += 1000/30; tr.hands([L(.3, .55, .045), L(.45, .6, .045)], t); }
  assert.equal(tr.lanes.p2.hand, null);
  assert.ok(Math.abs(tr.lanes.p1.hand.x - .3) < 1e-6 || Math.abs(tr.lanes.p1.hand.x - .45) < 1e-6);
  assert.ok(ARGON_TRACK.pickMs < DUO.memoryMs);
});

// mano con centro in (S, y) nell'immagine specchiata e grandezza size (landmark nell'immagine non specchiata)
const L = (S, y, size = .07) => { const d = size/.75, a = Array.from({ length: 21 }, () => ({ x: 1 - S, y, z: 0 })); a[0] = { x: 1 - S, y: y - .55*d, z: 0 }; a[9] = { x: 1 - S, y: y + .45*d, z: 0 }; return a; };
const DT = 1000/30;
function run(tr, frames, t0 = 1000){
  const out = []; let t = t0;
  for (const hands of frames){ t += DT; out.push(...tr.hands(hands.map(h => L(...h)), t).map(e => ({ ...e, t }))); }
  return { out, t };
}
const still = (n, ...hands) => Array.from({ length: n }, () => hands);

test('due giocatori: ognuno aggancia la mano nella sua metà; il colpo di uno esce solo per lui, con il lato dal verso', () => {
  const tr = new DuoTracker();
  // P1 (a sinistra) fa un dritto (verso sinistra), poi il P2 (a destra) un rovescio (verso destra)
  const frames = [...still(8, [.3, .55], [.72, .55])];
  for (let i = 1; i <= 4; i++) frames.push([[.3 - .07*i, .55], [.72, .55]]);
  frames.push(...still(10, [.02, .55], [.72, .55]).map(f => [[.05, .55], f[1]]));
  for (let i = 1; i <= 4; i++) frames.push([[.05, .55], [.72 + .06*i, .55]]);
  const { out } = run(tr, frames);
  assert.deepEqual(out.map(e => [e.who, e.type, e.side]), [['p1', 'swing', 'forehand'], ['p2', 'swing', 'backhand']]);
  assert.ok(tr.seen('p1', 1000 + frames.length*DT) && tr.seen('p2', 1000 + frames.length*DT));
});

test('il dritto del P1 attraversa il centro: resta del P1; le mani dei due giocatori non si scambiano mai', () => {
  const tr = new DuoTracker();
  const frames = [...still(8, [.42, .55], [.8, .55])];
  // la mano del P1 va da 0,42 a 0,62 (oltre la metà) mentre il P2 è fermo
  for (let i = 1; i <= 4; i++) frames.push([[.42 + .05*i, .55], [.8, .55]]);
  const { out } = run(tr, frames);
  assert.deepEqual(out.map(e => e.who), ['p1']);
  assert.ok(Math.abs(tr.lanes.p1.hand.x - .62) < 1e-9 && Math.abs(tr.lanes.p2.hand.x - .8) < 1e-9);
  // il modello dà le mani in ordine inverso: nessun colpo finto
  const swap = run(tr, still(6, [.8, .55], [.62, .55]), 1000 + frames.length*DT);
  assert.equal(swap.out.length, 0);
});

test('il P2 sparisce per un attimo: il P1 non prende la sua mano e il colpo del P2 attraverso il buco resta del P2', () => {
  const tr = new DuoTracker();
  const frames = [...still(8, [.3, .55], [.7, .55])];
  frames.push([[.3, .55]], [[.3, .55]], [[.3, .55]]);            // mano del P2 mossa: non vista per 100 ms
  frames.push([[.3, .55], [.95, .56]]);                          // ricompare dall'altra parte
  const { out } = run(tr, frames);
  assert.deepEqual(out.map(e => [e.who, e.side]), [['p2', 'backhand']]);
  assert.ok(Math.abs(tr.lanes.p1.hand.x - .3) < 1e-9);
  assert.equal(tr.wantsFlow('p2', 1000 + 9*DT + 1), false, 'nel buco breve niente flusso ottico');
});

test('una sola persona in vista: si aggancia solo la sua metà; l\'altra resta libera e vuole il flusso ottico', () => {
  const tr = new DuoTracker();
  const { t } = run(tr, still(5, [.25, .5]));
  assert.ok(tr.seen('p1', t)); assert.equal(tr.seen('p2', t), false);
  assert.equal(tr.lanes.p2.hand, null);
  assert.equal(tr.wantsFlow('p2', t), true); assert.equal(tr.wantsFlow('p1', t), false);
});

test('flusso ottico per metà: il movimento nella metà del P2 non tocca il P1 e fa il colpo del P2', () => {
  const W = 64, H = 48, prev = new Float32Array(W*H).fill(.4);
  const frame = cx => { const a = prev.slice(); for (let y = 18; y < 30; y++) for (let x = cx - 4; x < cx + 4; x++) a[y*W + x] = .95; return a; };
  // movimento a destra (colonne del P2)
  assert.equal(argonFlowBlob(frame(50), prev, W, H, DUO.cols.p1), null);
  const b = argonFlowBlob(frame(50), prev, W, H, DUO.cols.p2);
  assert.ok(b && b.x > .7, JSON.stringify(b));
  // tre fotogrammi di flusso che scorrono verso destra nella metà del P2: un colpo del P2
  const tr = new DuoTracker(); let t = 1000, ev = null;
  for (const x of [.6, .7, .8, .9]){ t += DT; ev = tr.flow('p2', { x, y: .5 }, t) || ev; }
  assert.equal(ev?.who, 'p2'); assert.equal(ev?.source, 'flow'); assert.equal(ev?.side, 'backhand');
});

test('camera della webcam per due: la più larga che dà, fino a 1920×1080, zoom al minimo; senza capacità nessun vincolo', () => {
  assert.deepEqual(widestCamera({ width: { max: 1280 }, height: { max: 720 }, zoom: { min: 100, max: 400 }, resizeMode: ['none', 'crop-and-scale'] }), { width: 1280, height: 720, zoom: 100, resizeMode: 'none' });
  assert.deepEqual(widestCamera({ width: { max: 3840 }, height: { max: 2160 } }), { width: 1920, height: 1080 });
  assert.deepEqual(widestCamera({ width: { max: 2592 }, height: { max: 1944 } }), { width: 1440, height: 1080 });
  assert.equal(widestCamera({}), null); assert.equal(widestCamera(null), null);
});

// controller sul prototipo vero (come natpf-webcam-argon-continuita): il modello finto risponde con le mani date
const { MotionController: MC } = await import('../src/motion_controls.js');
function rig(){
  const mc = Object.create(MC.prototype), p1 = [], p2 = [];
  Object.assign(mc, {
    webcamMode: 'argon', webcamActive: true, videoElem: { readyState: 4, currentTime: 0 }, _lastVideoTime: undefined,
    latestHandLandmarks: null, latestHandSeenAt: null, _hasNewHandResult: false, _mpBusy: false, lastWebcamTriggerMs: 0,
    smoothedCentroid: { x: .5, y: .5 }, motionVector: { vx: 0, vy: 0, mag: 0 }, _webcamTrail: null, _lastWebcamSource: null,
    role: 'p1', phoneState: { orientation: { pitch: 0, roll: 0 } }, onTrack: null, webcamDuo: false, p2HandPreference: 'left',
    flowWidth: 64, flowHeight: 48, hasPrevFrame: false, prevLuma: new Float32Array(64*48), motionEnergyMap: new Float32Array(64*48),
    offscreenCtx: { save(){}, scale(){}, drawImage(){}, restore(){}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w*h*4).fill(90) }) },
  });
  mc._emitSwing = e => p1.push({ kind: 'swing', ...e }); mc._emitToss = e => p1.push({ kind: 'toss', ...e });
  mc._emitP2Swing = e => p2.push({ kind: 'swing', ...e }); mc._emitP2Toss = e => p2.push({ kind: 'toss', ...e });
  let hands = [], opts = null;
  mc.mpHands = { setOptions(o){ opts = o; }, send(){ mc._onArgonHandResults({ multiHandLandmarks: hands.map(h => L(...h)) }); return Promise.resolve(); } };
  const realNow = performance.now; let t = 1000;
  const frame = (...h) => { hands = h; mc.videoElem.currentTime += 1/30; t += DT; performance.now = () => t; try { mc._argonFrame(t); mc._argonFrame(t); } finally { performance.now = realNow; } };
  return { mc, p1, p2, frame, opts: () => opts };
}

test('nel controller: webcam per due accesa → quattro mani, il colpo di sinistra al P1 e quello di destra al P2 (con la sua mano)', () => {
  const { mc, p1, p2, frame, opts } = rig();
  mc.setWebcamDuo(true);
  assert.equal(opts().maxNumHands, 4);
  for (let i = 0; i < 8; i++) frame([.3, .55], [.75, .55]);
  for (let i = 1; i <= 4; i++) frame([.3 - .07*i, .55], [.75, .55]);
  for (let i = 0; i < 12; i++) frame([.02, .55], [.75, .55]);
  for (let i = 1; i <= 4; i++) frame([.02, .55], [.75 + .055*i, .55]);
  assert.deepEqual(p1.map(e => [e.kind, e.side, e.source]), [['swing', 'forehand', 'webcam']]);
  assert.deepEqual(p2.map(e => [e.kind, e.side, e.hand]), [['swing', 'backhand', 'left']]);
  // spenta: torna la webcam per uno (due mani, la prima della lista)
  mc.setWebcamDuo(false);
  assert.equal(opts().maxNumHands, 2); assert.equal(mc.webcamDuo, false);
});

test('camera per due: prima la più grande con almeno 24 fotogrammi al secondo, poi 1280 dello stesso formato, poi senza vincolo', async () => {
  const { cameraAttempts, DUO_CAMERA } = await import('../src/natpf/webcam_duo.js');
  const a = cameraAttempts({ width: 1920, height: 1080, zoom: 100 });
  assert.deepEqual(a.map(x => [x.width, x.height, x.frameRate.min ?? null]), [[1920, 1080, DUO_CAMERA.minFps], [1280, 720, DUO_CAMERA.minFps], [1920, 1080, null]]);
  assert.ok(a.every(x => !('zoom' in x)), 'lo zoom a parte');
  assert.deepEqual(cameraAttempts({ width: 1280, height: 720 }).map(x => x.width), [1280, 1280]);
  assert.deepEqual(cameraAttempts(null), []);
});
