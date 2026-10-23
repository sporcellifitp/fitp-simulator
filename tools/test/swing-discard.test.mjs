// Gesti che il telefono valuta e non manda come colpo (diagnostica del 23/10): ogni scarto esce con il motivo, così una
// sessione dice perché uno swing visto nel video non è arrivato al gioco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector } from '../../site/js/tennis/swing-detect.js';
import { createCalibration, PLAN } from '../../site/js/tennis/calibration.js';

function trace(det, t0, { axis = [0, 1, 0], peak = 600, dur = 240 }){
  const n = Math.round(dur/10);
  for (let i = 0; i <= n; i++){
    const u = i/n, m = peak*Math.sin(Math.PI*u)**2, acc = [8*Math.sin(Math.PI*u), 0, 0];
    det.feed({ t: t0 + i*10, rot: axis.map(a => a*m), acc, accG: [acc[0], acc[1] + 9.81, acc[2]] });
  }
  return t0 + n*10;
}
const still = (det, t0, ms, noise = 3, cb) => { let t = t0; for (; t < t0 + ms; t += 10){ const k = { t, rot: [noise*Math.sin(t), -noise*Math.cos(t), 1], acc: [0, 0, 0], accG: [0, 9.81, 0] }; det.feed(k); cb && cb(t, k); } return t; };
const L = [0, 1, 0], R = [0, -1, 0];
function calibrated(){
  const det = createSwingDetector(), cal = createCalibration(det);
  cal.start();
  let t = still(det, 0, 700, 3, (t, k) => cal.tick(t, k));
  t = still(det, t + 10, 600, 3, (t, k) => cal.tick(t, k));
  for (const w of PLAN){ t = trace(det, t + 10, { axis: w === 'L' ? L : R, peak: w === 'L' ? 700 : 520 }); t = still(det, t + 10, 500, 3, (t, k) => cal.tick(t, k)); }
  cal.confirm();
  return { det, t };
}

test('gesto troppo debole per un colpo: scartato con il motivo, non mandato', () => {
  const { det, t: t0 } = calibrated(), sw = [], gx = [];
  det.on('swing', s => sw.push(s)); det.on('discard', d => gx.push(d));
  let t = trace(det, t0 + 10, { axis: L, peak: 150 });
  t = still(det, t + 10, 500);
  assert.equal(sw.length, 0);
  assert.equal(gx.length, 1, JSON.stringify(gx));
  assert.ok(['debole', 'corto'].includes(gx[0].why), gx[0].why);
  assert.equal(gx[0].dir, 1); assert.ok(gx[0].peak > 100 && gx[0].peak < 180);
});

test('rientro della mano dopo il colpo, nel verso opposto e più debole: mai un colpo; dopo la pausa scartato come «rientro»', () => {
  const { det, t: t0 } = calibrated(), sw = [], gx = [];
  det.on('swing', s => sw.push(s)); det.on('discard', d => gx.push(d));
  // subito dopo il colpo (il rilevatore aspetta ancora la quiete): non si valuta nemmeno
  let t = trace(det, t0 + 10, { axis: L, peak: 700 });
  t = trace(det, t + 30, { axis: R, peak: 420 });
  t = still(det, t + 10, 600);
  assert.equal(sw.length, 1); assert.equal(sw[0].dir, 1);
  // dopo una pausa breve ma entro 0,6 s dal colpo: valutato e scartato come rientro
  t = trace(det, t + 10, { axis: L, peak: 700 });
  t = still(det, t + 10, 250);
  t = trace(det, t + 10, { axis: R, peak: 420, dur: 160 });
  t = still(det, t + 10, 500);
  assert.equal(sw.length, 2);
  assert.ok(gx.some(d => d.why === 'rientro' && d.dir === -1), JSON.stringify(gx));
});

test('movimento deciso con il rilevatore ancora in attesa della quiete, ben dopo il colpo: detto una volta («in rientro»)', () => {
  const { det, t: t0 } = calibrated(), gx = [];
  det.on('discard', d => gx.push(d));
  let t = trace(det, t0 + 10, { axis: L, peak: 700 });
  // la mano non si ferma mai: si muove continuamente a 120–160 °/s per un secondo, poi uno swing da 600 °/s
  for (let i = 0; i < 100; i++){ t += 10; det.feed({ t, rot: [0, 140 + 20*Math.sin(i/3), 0], acc: [0, 0, 0], accG: [0, 9.81, 0] }); }
  t = trace(det, t + 10, { axis: L, peak: 600 });
  assert.equal(gx.filter(d => d.why === 'in rientro').length, 1, JSON.stringify(gx));
});
