import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { WorkerVision, workerVisionAvailable } from '../src/natpf/webcam_inference.js';
function harness(options = {}){
  const messages = []; let terminated = false, closes = 0;
  const worker = { postMessage(d, transfer){ messages.push({ d, transfer }); }, terminate(){ terminated = true; } };
  const model = new WorkerVision({ kind: 'Hands', base: '/local/', workerFactory: () => worker, bitmap: async (image, opts) => { assert.deepEqual(opts, { resizeWidth: 640, resizeHeight: 360, resizeQuality: 'low' }); return { close(){ closes++; } }; }, ...options });
  const reply = (result = {}) => worker.onmessage({ data: { id: messages.at(-1).d.id, ...result } });
  return { model, messages, reply, get terminated(){ return terminated; }, get closes(){ return closes; } };
}
test('worker: opzioni, immagine trasferita ridotta, un frame in volo', async () => {
  const h = harness(), seen = []; h.model.onResults(r => seen.push(r)); h.model.setOptions({ modelComplexity: 0 });
  const init = h.model.initialize(); assert.equal(h.messages[0].d.options.modelComplexity, 0); h.reply(); await init;
  const send = h.model.send({ image: { videoWidth: 1280, videoHeight: 720 } }); await Promise.resolve();
  await assert.rejects(h.model.send({ image: {} }), /occupato/);
  assert.equal(h.messages.at(-1).transfer[0], h.messages.at(-1).d.image);
  h.reply({ result: { multiHandLandmarks: [[1]] }, inferMs: 12 }); await send;
  assert.deepEqual(seen, [{ multiHandLandmarks: [[1]] }]); assert.equal(h.model.lastInferMs, 12); assert.equal(h.closes, 1); h.model.close();
});
test('worker fermo: timeout termina il modello e libera il frame', async () => {
  const h = harness({ timeoutMs: 10 });
  await assert.rejects(h.model.send({ image: { width: 1280, height: 720 } }), /Tempo limite/);
  assert.equal(h.terminated, true); assert.equal(h.model.pending.size, 0); assert.equal(h.model.busy, false); assert.equal(h.closes, 1);
});
test('spegnimento durante cattura: chiude immagine senza risultati vecchi', async () => {
  let resolve, closed = 0; const h = harness({ bitmap: () => new Promise(r => { resolve = r; }) });
  const send = h.model.send({ image: {} }); h.model.close(); resolve({ close(){ closed++; } }); await send;
  assert.equal(closed, 1); assert.equal(h.messages.length, 0);
});
test('script worker reale: asset locali, solo coordinate, immagini liberate', async () => {
  const source = await readFile(new URL('../src/natpf/webcam_inference_worker.js', import.meta.url), 'utf8');
  for (const kind of ['Hands', 'Pose']){
    const sent = [], paths = []; let callback, closed = 0, now = 0;
    class Model { constructor({ locateFile }){ paths.push(locateFile('model.wasm')); } setOptions(){} onResults(fn){ callback = fn; } async initialize(){} async send(){ callback({ image: { close(){ closed++; } }, multiHandLandmarks: [[1]], multiHandedness: [{ label: 'Right' }], poseLandmarks: [2] }); } }
    const self = { [kind]: Model, postMessage: d => sent.push(d) };
    vm.runInNewContext(source, { self, importScripts: p => paths.push(p), performance: { now: () => now += 12 } });
    await self.onmessage({ data: { type: 'init', id: 1, kind, base: '/offline/', options: {} } });
    await self.onmessage({ data: { type: 'frame', id: 2, image: { close(){ closed++; } } } });
    assert.deepEqual(paths, ['/offline/' + kind.toLowerCase() + '.js', '/offline/model.wasm']);
    assert.equal(sent[1].result.image, undefined); assert.equal(sent[1].inferMs, 12); assert.equal(closed, 2);
    assert.ok(kind === 'Hands' ? sent[1].result.multiHandLandmarks : sent[1].result.poseLandmarks);
  }
});
test('webcam leggera, al massimo un frame ogni 33 ms', async () => {
  const { MotionController } = await import('../src/motion_controls.js');
  const mc = Object.create(MotionController.prototype); let count = 0;
  Object.assign(mc, { webcamActive: true, videoElem: { readyState: 4 }, mpHands: { send(){ count++; return Promise.resolve(); } } });
  mc._wcStart(null); assert.equal(mc._wcLevel().id, 'leggera');
  assert.equal(mc._sendFrame(1000), true); mc._mpBusy = false;
  assert.equal(mc._sendFrame(1016), false); assert.equal(mc._sendFrame(1033), true); assert.equal(count, 2);
});
test('webcam spenta e riaccesa durante initialize: il modello nuovo parte e quello vecchio non lo sostituisce', async () => {
  const { MotionController } = await import('../src/motion_controls.js');
  const names = ['Worker','OffscreenCanvas','createImageBitmap','location'];
  const saved = names.map(k => Object.getOwnPropertyDescriptor(globalThis,k));
  const workers = [];
  class FakeWorker {
    constructor(){ workers.push(this); }
    postMessage(d){ if (workers.length > 1) queueMicrotask(() => this.onmessage({ data: { id:d.id } })); }
    terminate(){ this.terminated = true; }
  }
  const mc = Object.create(MotionController.prototype);
  try {
    Object.assign(globalThis,{Worker:FakeWorker,OffscreenCanvas:class{},createImageBitmap:async()=>({close(){}}),location:{href:'https://localhost/?webcamWorker=1',search:'?webcamWorker=1'}});
    Object.assign(mc,{webcamActive:true,phoneState:{},_notifyStatus(){},_updateWebcamBadgeUI(){}});
    const init = mc._ensureMediaPipeHands(); assert.equal(workers.length,1);
    mc.disableWebcam(); mc.webcamActive = true;
    await mc._ensureMediaPipeHands(); await init;
    await new Promise(r=>setImmediate(r));
    assert.equal(workers[0].terminated,true);assert.equal(workers.length,2);assert.equal(mc.mpHands.worker,workers[1]);assert.equal(mc._mpLoading,false);
  } finally {
    mc.disableWebcam();
    names.forEach((k,i)=>{ if(saved[i])Object.defineProperty(globalThis,k,saved[i]);else delete globalThis[k]; });
  }
});

// Sessione del 28/10: con la webcam accesa e la mano in vista il gioco restava su «Cerco la mano…». Nel worker le soluzioni
// MediaPipe caricano con importScripts anche i file del modello (.tflite) e non partono mai (prova nel browser con una
// webcam finta): il worker è solo a richiesta, e se non parte il modello gira nella pagina.
test('worker della webcam solo a richiesta (?webcamWorker=1)', () => {
  const names = ['Worker', 'OffscreenCanvas', 'createImageBitmap'], saved = names.map(k => Object.getOwnPropertyDescriptor(globalThis, k));
  try {
    Object.assign(globalThis, { Worker: class {}, OffscreenCanvas: class {}, createImageBitmap: async () => ({}) });
    assert.equal(workerVisionAvailable(''), false);
    assert.equal(workerVisionAvailable('?lan=1'), false);
    assert.equal(workerVisionAvailable('?webcamWorker=1'), true);
  } finally { names.forEach((k, i) => { if (saved[i]) Object.defineProperty(globalThis, k, saved[i]); else delete globalThis[k]; }); }
});

test('modello delle mani: se il worker non parte gira nella pagina (prima restava il solo movimento)', async () => {
  const { MotionController } = await import('../src/motion_controls.js');
  const names = ['Worker', 'OffscreenCanvas', 'createImageBitmap', 'location', 'window'];
  const saved = names.map(k => Object.getOwnPropertyDescriptor(globalThis, k));
  const workers = [], pages = [];
  // il worker risponde come quello vero: importScripts del file del modello fallito
  class FakeWorker { constructor(){ workers.push(this); } postMessage(d){ queueMicrotask(() => this.onmessage({ data: { id: d.id, error: "Failed to execute 'importScripts': hand_landmark_lite.tflite failed to load" } })); } terminate(){ this.terminated = true; } }
  class FakeHands { constructor(o){ this.o = o; pages.push(this); } setOptions(){} onResults(f){ this.cb = f; } async initialize(){} send(){ return Promise.resolve(); } }
  const mc = Object.create(MotionController.prototype);
  const warn = console.warn; console.warn = () => {};
  try {
    Object.assign(globalThis, { Worker: FakeWorker, OffscreenCanvas: class {}, createImageBitmap: async () => ({ close(){} }), location: { href: 'https://localhost/?webcamWorker=1', search: '?webcamWorker=1' } });
    globalThis.window = globalThis; globalThis.window.Hands = FakeHands;
    Object.assign(mc, { webcamActive: true, phoneState: {}, _notifyStatus(){}, _updateWebcamBadgeUI(){} });
    await mc._ensureMediaPipeHands();
    assert.equal(workers.length, 1); assert.equal(workers[0].terminated, true);
    assert.equal(pages.length, 1, 'modello nella pagina');
    assert.equal(mc.mpHands, pages[0]); assert.equal(mc._mpWorkerFailed, true); assert.equal(mc._mpLoading, false);
    // senza la richiesta del worker: subito nella pagina
    const mc2 = Object.create(MotionController.prototype);
    Object.assign(mc2, { webcamActive: true, phoneState: {}, _notifyStatus(){}, _updateWebcamBadgeUI(){} });
    globalThis.location = { href: 'https://localhost/', search: '' };
    await mc2._ensureMediaPipeHands();
    assert.equal(workers.length, 1, 'nessun worker'); assert.equal(mc2.mpHands, pages[1]);
  } finally {
    console.warn = warn; mc.disableWebcam?.();
    delete globalThis.Hands;
    names.forEach((k, i) => { if (saved[i]) Object.defineProperty(globalThis, k, saved[i]); else delete globalThis[k]; });
  }
});
