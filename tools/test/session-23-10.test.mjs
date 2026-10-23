// Profilo della calibrazione rapida della partita del 23/10 (docs/NATPF_DIAGNOSI_2026-10-23.md, T1): dritto tipico
// 143 °/s, rovescio 1105 °/s. Con il rilevatore di prima le soglie in gioco erano 40 e 50 °/s e 28 gesti su 81 erano
// micro-movimenti (55–184 °/s) mandati come colpi. Qui gli stessi picchi e ampiezze del registro, su gesti a campana
// attorno all'asse del profilo: i micro-movimenti non partono, i colpi veri sì (anche quelli moderati).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector, unit } from '../../site/js/tennis/swing-detect.js';
import { createCalibration, QUICK_PLAN } from '../../site/js/tennis/calibration.js';

// tel.profilo della sessione 20261023-080003-5tag (solo numeri)
export const PROFILE_2310 = {"version":4,"automaticGesture":true,"range":"standard","hand":"right","intentGate":false,"gestural":true,"quick":true,"bias":[0,0,0],"noise":10.072239075796404,"gravity":[0.030234497138839807,0.8501718690875595,0.5256364410834993],"axis":[0.9048227539760443,0.22082177537259734,0.36405154498848263],"ref":624,"refs":{"1":143,"-1":1105},"refAngle":37,"rawRef":662,"preparation":{"1":0,"-1":0},"minAngles":{"1":4.75,"-1":13.75},"on":40.288956303185614,"minPeak":50.36119537898202,"minAngle":5,"lobLift":0.7,"faceRef":{"1":{"yaw":-17.1,"pitch":13.2,"angle":19},"-1":{"yaw":44.8,"pitch":92,"angle":55}},"heads":{"1":0.51,"-1":-0.038},"rises":{"1":-0.061,"-1":-0.436},"templates":[{"shot":"drive","dir":1,"peak":143,"angle":19,"features":{"lift":-0.557265862255311,"tilt":-0.42564878447674503,"twist":-0.4251531217331873,"speed":1,"duration":133.40000009536743,"travel":0.5135135135135135}},{"shot":"drive","dir":-1,"peak":1105,"angle":55,"features":{"lift":-0.07481218476179032,"tilt":-0.06803315922249004,"twist":0.09977515329478648,"speed":1,"duration":33.40000009536743,"travel":1.4864864864864864}}]};

// gesto a campana (sin²) con il picco e l'ampiezza dati, attorno all'asse del profilo (dir +1 dritto, −1 rovescio), a 60 Hz
const G = PROFILE_2310.gravity.map(v => v*9.81), AX = unit(PROFILE_2310.axis);
function gesture(det, t0, { peak, angle, dir = 1 }){
  const dur = 2*angle/peak*1000, n = Math.max(4, Math.round(dur/16.7));
  for (let i = 0; i <= n; i++){ const u = i/n, m = peak*Math.sin(Math.PI*u)**2; det.feed({ t: t0 + i*dur/n, rot: AX.map(a => a*m*dir), acc: [0, 0, 0], accG: G }); }
  return t0 + dur;
}
const rest = (det, t0, ms) => { let t = t0; for (; t < t0 + ms; t += 16.7) det.feed({ t, rot: [2*Math.sin(t), 2*Math.cos(t), 1], acc: [0, 0, 0], accG: G }); return t; };
function play(list){
  const det = createSwingDetector(), out = [];
  det.setProfile(PROFILE_2310); det.run(); det.setContext('play');
  det.on('swing', s => out.push({ peak: s.peak, dir: s.dir }));
  let t = rest(det, 0, 600);
  for (const g of list){ t = gesture(det, t + 17, g); t = rest(det, t + 17, 900); }
  return out;
}

test('23/10: i micro-movimenti del registro (55–184 °/s, 3–32°) non sono più colpi', () => {
  // n 28, 34, 38, 54, 63, 68, 93, 95, 103, 104, 106, 111, 114 (picco, ampiezza)
  const micro = [[67, 3], [60, 8], [80, 10], [71, 13], [55, 5], [184, 56], [172, 28], [134, 32], [112, 11], [68, 7], [91, 28], [138, 28], [59, 14]];
  const got = play(micro.map(([peak, angle]) => ({ peak, angle, dir: 1 })));
  assert.deepEqual(got, [], JSON.stringify(got));
});

test('23/10: i colpi veri del registro restano colpi, anche quelli moderati, con il verso giusto', () => {
  // dritti moderati e forti (n 36, 75, 77, 31, 92, 45) e rovesci (n 35, 39, 42)
  const real = [[232, 46, 1], [286, 52, 1], [267, 34, 1], [484, 38, 1], [781, 79, 1], [1109, 118, 1], [1240, 95, -1], [788, 77, -1], [1103, 222, -1]];
  const got = play(real.map(([peak, angle, dir]) => ({ peak, angle, dir })));
  assert.equal(got.length, real.length, JSON.stringify(got));
  assert.deepEqual(got.map(g => g.dir), real.map(r => r[2]));
});

// calibrazione rapida con i due gesti del 23/10: dritto 143 °/s (19°), rovescio 1105 °/s (55°)
function quickCalibration(peaks){
  const det = createSwingDetector(), cal = createCalibration(det), ev = [];
  cal.on(e => ev.push(e)); cal.start({ quick: true, gestural: true });
  const still = (t, ms) => { for (const end = t + ms; t <= end; t += 10){ const k = { t, rot: [1, -1, 1], acc: [0, 0, 0], accG: [0, 9.81, 0] }; det.feed(k); cal.tick(t, k); } return t; };
  let t = still(0, 800);
  QUICK_PLAN.forEach((w, i) => {
    const [peak, angle] = peaks[i], dur = 2*angle/peak*1000, s = w === 'L' ? 1 : -1;
    for (let j = 0; j <= dur; j += 10){ const u = j/dur, m = peak*Math.sin(Math.PI*u)**2, k = { t: t + j, rot: [0, 0, s*m], acc: [0, 0, 0], accG: [0, 9.81, 0] }; det.feed(k); cal.tick(k.t, k); }
    t = still(t + dur + 10, 700);
  });
  return { cal, review: ev.find(e => e.kind === 'review') };
}
test('calibrazione rapida: due versi molto diversi (dritto 143 °/s, rovescio 1105) si rifanno, con il motivo', () => {
  const { cal, review } = quickCalibration([[143, 19], [1105, 55]]);
  assert.equal(review.pass, false); assert.equal(review.why, 'squilibrio'); assert.equal(review.weak, 'L');
  assert.equal(cal.confirm(), null);
  // due gesti di forza simile (anche diversa del doppio) passano come prima
  assert.equal(quickCalibration([[600, 50], [380, 40]]).review.pass, true);
  assert.equal(quickCalibration([[140, 18], [120, 16]]).review.pass, true, 'i colpetti piccoli restano validi');
});
