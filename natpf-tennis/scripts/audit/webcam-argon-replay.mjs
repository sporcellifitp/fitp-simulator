// Riproduce la webcam «argon» del gioco (MotionController._argonFrame vero) sui risultati della sonda
// (webcam-probe.mjs, mani; con la passata del corpo unita le chiavi lw/rw/ls/rs restano solo informative) e sui fotogrammi
// 64×48 specchiati per il flusso ottico. Stampa quanti fotogrammi da mano e da flusso e gli eventi (colpi e lanci).
//   node --import ./test/register.mjs scripts/audit/webcam-argon-replay.mjs mani.jsonl clip.rgba [motion_controls.js]
// Con un motion_controls.js di prima (git show <commit>:natpf-tennis/src/motion_controls.js > src/__prima.js) il
// confronto prima/dopo sugli stessi fotogrammi.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const [jsonl, rgba, mcFile = new URL('../../src/motion_controls.js', import.meta.url).pathname] = process.argv.slice(2);
const { MotionController: MC } = await import(pathToFileURL(mcFile).href);
const rows = fs.readFileSync(jsonl, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const px = fs.readFileSync(rgba), FR = 64*48*4;
const mc = Object.create(MC.prototype), events = [], frames = [];
Object.assign(mc, {
  webcamMode: 'argon', webcamActive: true, videoElem: { readyState: 4, currentTime: 0, videoWidth: 640, videoHeight: 480 }, _lastVideoTime: undefined,
  latestHandLandmarks: null, latestHandSeenAt: null, _hasNewHandResult: false, _mpBusy: false, lastWebcamTriggerMs: 0,
  smoothedCentroid: { x: .5, y: .5 }, motionVector: { vx: 0, vy: 0, mag: 0 }, _webcamTrail: null, _lastWebcamSource: null,
  role: 'p1', phoneState: { orientation: { pitch: 0, roll: 0 } }, handPreference: 'right',
  flowWidth: 64, flowHeight: 48, hasPrevFrame: false, prevLuma: new Float32Array(64*48), motionEnergyMap: new Float32Array(64*48),
});
let cur = 0;
mc.offscreenCtx = { save(){}, scale(){}, drawImage(){}, restore(){}, getImageData: () => { const k = Math.round(rows[cur].t*30); return { data: px.subarray(k*FR, k*FR + FR) }; } };
mc.onTrack = d => { if (d.kind === 'frame') frames.push({ t: d.t, s: d.source, x: d.x, y: d.y }); if (d.kind === 'event') events.push(d); };
mc._emitSwing = () => {}; mc._emitToss = () => {};
const lmOf = h => { const d = (h.s || 0)/.75, a = Array.from({ length: 21 }, () => ({ x: h.x, y: h.y, z: 0 })); a[0] = { x: h.x, y: h.y - .55*d, z: 0 }; a[9] = { x: h.x, y: h.y + .45*d, z: 0 }; return a; };
mc.mpHands = { send(){ const r = rows[cur]; Promise.resolve().then(() => mc._onArgonHandResults({ multiHandLandmarks: r.hands.map(lmOf) })); return Promise.resolve(); } };
const realNow = performance.now;
const step = rows.length > 1 ? Math.round((rows[1].t - rows[0].t)*30) : 1;
for (let i = 0; i < rows.length; i++){
  cur = i; const t = 1000 + rows[i].t*1000;
  mc.videoElem.currentTime = rows[i].t;
  performance.now = () => t;
  mc._argonFrame(t);
  await Promise.resolve(); await Promise.resolve();
  performance.now = () => t + 25;
  mc._argonFrame(t + 25);
}
performance.now = realNow;
const by = s => frames.filter(f => f.s === s).length;
console.log(JSON.stringify({ fotogrammi: rows.length, passo: step, mano: by('hands'), flusso: by('flow'), eventi: events.length, dalFlusso: events.filter(e => e.source === 'flow').length, alLimite: events.filter(e => e.speed >= 1.649).length }));
for (const e of events) console.log(Math.round(e.t - 1000), e.source, e.type, e.shotType, 'side', e.side, 'dirX', e.dirX?.toFixed(2), 'dirY', e.dirY?.toFixed(2), 'speed', e.speed?.toFixed(2));
