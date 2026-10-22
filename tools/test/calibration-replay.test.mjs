// Ripresa del collegamento a calibrazione in corso: il telefono continua a calibrare anche scollegato e gli eventi fatti
// nel frattempo vanno persi. Al ricollegamento manda gli eventi che descrivono il passo attuale (calibration.replay) e il
// computer (natpf_cal_view.calReduce) torna allo stesso passo del telefono. Prima restava al gesto di prima mentre il
// telefono era già alla verifica, e i gesti successivi venivano ignorati.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector } from '../../site/js/tennis/swing-detect.js';
import { createCalibration, QUICK_PLAN } from '../../site/js/tennis/calibration.js';
import { calReduce, CAL_VIEW_EMPTY } from '../../natpf-tennis/src/natpf/natpf_cal_view.js';

const mul = (a, n) => a.map(v => v*n);
function quiet(det, cal, t, ms = 650){ for (const end = t + ms; t <= end; t += 10){ const k = { t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.81, 0] }; det.feed(k); cal.tick(t, k); } return t; }
function stroke(det, cal, t, { axis = [0, 1, 0], peak = 120, dur = 220 } = {}){
  for (let i = 0; i <= dur; i += 10){ const u = i/dur, m = peak*Math.sin(Math.PI*u)**2, k = { t: t + i, rot: mul(axis, m), acc: [8*Math.sin(Math.PI*u), 0, 0], accG: [8*Math.sin(Math.PI*u), 9.81, 0] }; det.feed(k); cal.tick(t + i, k); }
  return t + dur;
}
// telefono simulato: calibrazione rapida con tutti gli eventi registrati; stop = quanti gesti fare
function phone(stop = QUICK_PLAN.length){
  const det = createSwingDetector(), cal = createCalibration(det), events = [];
  cal.on(e => events.push(e)); cal.start({ quick: true });
  let t = quiet(det, cal, 0, 800);
  QUICK_PLAN.slice(0, stop).forEach(d => { t = quiet(det, cal, t, 650); t = stroke(det, cal, t, { axis: [0, d === 'L' ? 1 : -1, 0] }); });
  t = quiet(det, cal, t, 650);
  return { cal, events };
}
const view = events => events.reduce(calReduce, CAL_VIEW_EMPTY);
// quello che il computer mostra: nei gesti quale gesto e se la mano è pronta, alla verifica l'esito
const pick = v => (v.stage === 'gesture' ? { stage: v.stage, idx: v.idx, want: v.want, ready: v.ready } : { stage: v.stage, pass: v.pass });

test('replay: il passo attuale descritto con gli stessi eventi (fermo, gesto con la mano pronta, verifica)', () => {
  const det = createSwingDetector(), cal = createCalibration(det); cal.start({ quick: true });
  assert.deepEqual(cal.replay(), [{ kind: 'step', step: 'still' }]);
  const mid = phone(1).cal;
  assert.deepEqual(mid.replay(), [{ kind: 'step', step: 'swings', want: QUICK_PLAN[1], shot: 'drive', idx: 1, total: QUICK_PLAN.length }, { kind: 'ready', step: 'swings', want: QUICK_PLAN[1] }]);
  const end = phone().cal;
  const r = end.replay();
  assert.equal(r.length, 1); assert.equal(r[0].kind, 'review'); assert.equal(r[0].pass, true);
  // a calibrazione confermata non c'è niente da rimandare
  end.confirm(); assert.deepEqual(end.replay(), []);
});

test('dopo una caduta del collegamento il computer torna allo stesso passo del telefono', () => {
  for (const stop of QUICK_PLAN.map((_, i) => i + 1)){
    const { cal, events } = phone(stop);
    // il computer ha visto solo gli eventi fino al primo gesto (poi il collegamento è caduto)
    const firstAttempt = events.findIndex(e => e.kind === 'attempt');
    const stale = view(events.slice(0, firstAttempt + 1));
    const resynced = cal.replay().reduce(calReduce, stale);
    assert.deepEqual(pick(resynced), pick(view(events)), `dopo ${stop} gesti`);
  }
});
