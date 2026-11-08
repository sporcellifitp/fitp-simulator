// B17.4 (08/11/2026): a rete il gioco manda «cfg net:1» e il telefono abbassa la soglia del picco in gioco a
// DEFAULTS.netMinPeak × la scala di chi gioca (min playMinPeak): i tocchi morbidi contano. Nelle due diagnostiche dell'08/11
// 30 gesti da 160–470 °/s sono stati scartati «deboli» con una soglia di ~250 °/s (colpo tipico ~1300 °/s). Al rientro
// (net:0) le soglie tornano quelle di prima.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector, DEFAULTS } from '../../site/js/tennis/swing-detect.js';
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
// calibrazione con un colpo tipico forte (1300 °/s come nelle diagnostiche dell'08/11)
function calibrated(peakL = 1300, peakR = 1100){
  const det = createSwingDetector(), cal = createCalibration(det);
  cal.start();
  let t = still(det, 0, 700, 3, (t, k) => cal.tick(t, k));
  t = still(det, t + 10, 600, 3, (t, k) => cal.tick(t, k));
  for (const w of PLAN){ t = trace(det, t + 10, { axis: w === 'L' ? L : R, peak: w === 'L' ? peakL : peakR }); t = still(det, t + 10, 500, 3, (t, k) => cal.tick(t, k)); }
  cal.confirm();
  det.setPrepMode(true);
  return { det, t };
}
// un tocco morbido nel verso atteso (dritto, da destra a sinistra), ampio come un gesto vero
function touch(det, t, peak){
  det.setExpect(1);
  let t1 = trace(det, t + 10, { axis: L, peak, dur: 300 });
  return still(det, t1 + 10, 700);
}

test('a rete (setNet) un tocco morbido da 200 °/s è un colpo; fuori dalla rete è scartato «debole»; al rientro torna scartato', () => {
  const { det, t: t0 } = calibrated(), sw = [], gx = [];
  det.on('swing', s => sw.push(s)); det.on('discard', d => gx.push(d));
  let t = touch(det, t0, 200);
  assert.equal(sw.length, 0, JSON.stringify(sw));
  assert.ok(gx.length >= 1 && gx.at(-1).why === 'debole', JSON.stringify(gx));
  det.setNet(true);
  assert.equal(det.atNet, true);
  t = touch(det, t + 300, 200);
  assert.equal(sw.length, 1, JSON.stringify({ sw, gx }));
  assert.ok(sw[0].peak >= 150 && sw[0].peak <= 220 && sw[0].dir === 1, JSON.stringify(sw[0]));
  det.setNet(false);
  assert.equal(det.atNet, false);
  const n = gx.length;
  t = touch(det, t + 300, 200);
  assert.equal(sw.length, 1);
  assert.ok(gx.length > n && gx.at(-1).why === 'debole', JSON.stringify(gx.slice(n)));
});

// la preparazione del dritto (gesto nel verso opposto, 300 °/s) seguita dal dritto pieno
function prepThenSwing(det, t, { prepPeak = 300, gap = 150 } = {}){
  let t1 = trace(det, t + 300, { axis: R, peak: prepPeak, dur: 300 });
  t1 = trace(det, t1 + gap, { axis: L, peak: 1200, dur: 240 });
  return still(det, t1 + 10, 900);
}

test('a rete con il verso atteso sconosciuto (ex 0) valgono le soglie normali: la preparazione da 300 °/s e un tocco da 200 °/s sono scartati «deboli»; con il verso noto il tocco è un colpo', () => {
  // revisione del B17.4: con le soglie basse e il verso sconosciuto (palla non ancora colpita dall'avversario) la preparazione
  // da 180–300 °/s diventava un colpo in più prima del dritto vero
  const { det, t: t0 } = calibrated(), sw = [], gx = [];
  det.on('swing', s => sw.push(s)); det.on('discard', d => gx.push(d));
  det.setNet(true); det.setExpect(0);
  let t = prepThenSwing(det, t0);
  assert.equal(sw.length, 1, JSON.stringify(sw.map(s => [s.peak, s.dir])));   // solo il dritto pieno
  assert.ok(sw[0].peak > 900 && sw[0].dir === 1, JSON.stringify(sw[0]));
  assert.ok(gx.some(d => d.why === 'debole' && d.dir === -1 && d.peak >= 250 && d.peak <= 310), JSON.stringify(gx));
  t = prepThenSwing(det, t, { prepPeak: 180, gap: 400 });
  assert.equal(sw.length, 2); assert.ok(sw[1].peak > 900 && sw[1].dir === 1);
  const n = gx.length;
  t = still(det, trace(det, t + 300, { axis: L, peak: 200, dur: 300 }) + 10, 700);   // tocco da 200 °/s nel verso del dritto, ex 0
  assert.equal(sw.length, 2); assert.ok(gx.length > n && gx.at(-1).why === 'debole', JSON.stringify(gx.slice(n)));
  // con il verso atteso noto: la preparazione resta una preparazione (nessun colpo in più) e il tocco è un colpo
  det.setExpect(1);
  t = prepThenSwing(det, t);
  assert.equal(sw.length, 3, JSON.stringify(sw.map(s => [s.peak, s.dir]))); assert.ok(sw[2].peak > 900 && sw[2].dir === 1);
  t = touch(det, t + 300, 200);
  assert.equal(sw.length, 4, JSON.stringify(sw.map(s => [s.peak, s.dir]))); assert.ok(sw[3].peak >= 150 && sw[3].peak <= 220 && sw[3].dir === 1, JSON.stringify(sw[3]));
});

test('a rete i minimi assoluti restano: un micro-movimento da 40 °/s non è un colpo; un colpo pieno è un colpo come prima', () => {
  const { det, t: t0 } = calibrated(), sw = [];
  det.on('swing', s => sw.push(s));
  det.setNet(true);
  let t = touch(det, t0, 40);
  assert.equal(sw.length, 0);
  t = touch(det, t + 300, 1200);
  assert.equal(sw.length, 1);
  assert.ok(sw[0].peak > 900, JSON.stringify(sw[0]));
  assert.ok(DEFAULTS.netMinPeak === .1 && DEFAULTS.playMinPeak === 45);
});
