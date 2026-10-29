// Sonda della webcam su un video registrato (video-webcam.* di una diagnostica): MediaPipe Hands (o Pose) del gioco
// fotogramma per fotogramma, senza perdere fotogrammi, per misurare quando si vede la mano (o il polso) e quanto è grande.
// Il risultato (una riga JSON per fotogramma) si riproduce con webcam-argon-replay.mjs sulla logica vera della webcam.
// Hands e Pose in due passate separate: nella stessa pagina il caricatore di MediaPipe è globale e Hands non vede più
// niente. Il video si passa come immagini (il seek di un <video> in Chromium senza schermo non aggiorna il fotogramma).
//   ffmpeg -i video-webcam.mp4 -q:v 3 cartella/%04d.jpg                      (fotogrammi, 30 al secondo)
//   ffmpeg -i video-webcam.mp4 -vf hflip,scale=64:48 -f rawvideo -pix_fmt rgba clip.rgba   (per il flusso ottico)
//   npm run dev  (o un altro server del gioco: BASE=http://localhost:3000/)
//   node scripts/audit/webcam-probe.mjs cartella mani.jsonl [passo=1] [da_s=0] [a_s=999] [complessità=1] [hands|pose]
// Senza scheda grafica (Chromium con SwiftShader) servono 0,5–2 s a fotogramma: i tempi misurati qui non sono quelli
// del computer di chi gioca (per quelli: webcam.ritmo nella diagnostica).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const playwright = createRequire(execSync('npm root -g').toString().trim() + '/x.js')('playwright');
const [clip, out, step = '1', from = '0', to = '999', handsCx = '1', which = 'hands'] = process.argv.slice(2);
const b = await playwright.chromium.launch();
const p = await (await b.newContext()).newPage();
p.on('console', m => { if (m.type() === 'error') console.log('[err]', m.text().slice(0, 200)); });
await p.route('**/__probe.html', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
await p.route('**/__fr/*', r => { const n = r.request().url().split('/').pop(); r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(`${clip}/${n}`) }); });
const nFrames = fs.readdirSync(clip).length;
await p.goto(new URL('__probe.html', process.env.BASE || 'http://localhost:3000/').href);
const res = await p.evaluate(async ({ step, from, to, handsCx, which, nFrames }) => {
  const load = s => new Promise((ok, ko) => { const e = document.createElement('script'); e.src = s; e.onload = ok; e.onerror = ko; document.head.appendChild(e); });
  let hands = null, pose = null, hr = null, pr = null;
  if (which === 'hands'){
  await load('/assets/mediapipe/hands/hands.js');
  hands = new window.Hands({ locateFile: f => `/assets/mediapipe/hands/${f}` });
  hands.setOptions({ maxNumHands: 2, modelComplexity: handsCx, minDetectionConfidence: .4, minTrackingConfidence: .4 });
  hands.onResults(r => { hr = r; });
  await hands.initialize();
  } else {
  await load('/assets/mediapipe/pose/pose.js');
  pose = new window.Pose({ locateFile: f => `/assets/mediapipe/pose/${f}` });
  pose.setOptions({ modelComplexity: 0, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: .5, minTrackingConfidence: .5 });
  pose.onResults(r => { pr = r; });
  await pose.initialize();
  }
  const rows = [];
  for (let k = Math.round(from*30); k < Math.min(Math.round(to*30), nFrames); k += step){
    const t = k/30; const cv = new Image(); cv.src = `/__fr/${String(k + 1).padStart(4, '0')}.jpg`; await cv.decode();
    let t0 = performance.now(); if (hands) await hands.send({ image: cv }); const hMs = performance.now() - t0;
    t0 = performance.now(); if (pose) await pose.send({ image: cv }); const pMs = performance.now() - t0;
    const hs = (hr?.multiHandLandmarks || []).map((lm, i) => ({ x: +(lm[0].x*.45 + lm[9].x*.55).toFixed(3), y: +(lm[0].y*.45 + lm[9].y*.55).toFixed(3), s: +Math.hypot(lm[0].x - lm[9].x, (lm[0].y - lm[9].y)*.75).toFixed(3), lab: hr.multiHandedness?.[i]?.label }));
    const pl = pr?.poseLandmarks; const w = k => pl && pl[k] ? { x: +pl[k].x.toFixed(3), y: +pl[k].y.toFixed(3), v: +(pl[k].visibility ?? 0).toFixed(2) } : null;
    rows.push({ t: +t.toFixed(3), hands: hs, lw: w(15), rw: w(16), ls: w(11), rs: w(12), hMs: +hMs.toFixed(1), pMs: +pMs.toFixed(1) });
  }
  return rows;
}, { step: +step, from: +from, to: +to, handsCx: +handsCx, which, nFrames });
fs.writeFileSync(out, res.map(r => JSON.stringify(r)).join('\n'));
const n = res.length, h = res.filter(r => r.hands.length).length, pw = res.filter(r => (r.rw?.v ?? 0) >= .6 || (r.lw?.v ?? 0) >= .6).length;
const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length/2)]; };
console.log(JSON.stringify({ n, hands: h, poseWrist: pw, handsMs: med(res.map(r => r.hMs)), poseMs: med(res.map(r => r.pMs)) }));
await b.close();
