import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { WorkerVision } from '../src/natpf/webcam_inference.js';
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
    Object.assign(globalThis,{Worker:FakeWorker,OffscreenCanvas:class{},createImageBitmap:async()=>({close(){}}),location:{href:'https://localhost/'}});
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
