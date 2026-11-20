// Revisione del B73 (docs/b73/unione.md, «Revisione e sistemazione», rilievo «R1»): con la presa insegnata («racchetta»,
// GRIP_STYLE) la racchetta segue il telefono con il verso anche ruotandolo attorno alla normale dello schermo (asse z):
// il «roll» del piatto (face-tracker.js) e il beccheggio della racchetta (racketTiltFromFace) cambiano segno con il verso
// della rotazione, e a riposo valgono zero. È la guardia veloce, in node, di quello che lan-e2e.mjs controlla nel browser
// (telefono simulato che parte dalla presa insegnata). Con il telefono dritto (asse y verticale a riposo, la posa di prima
// della prova nel browser) asin perde il verso: non è la presa insegnata, e qui non si prova.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFaceTracker } from '@natpf/tennis/face-tracker.js';
import { gripQuat, qrot, qconj, qmul, qaxis } from '../src/natpf/natpf_gesture_pose.js';
import { GRIP_STYLE } from '../src/natpf/natpf_gesture_motion.js';
import { racketTiltFromFace } from '../src/natpf/natpf_phone_racket.js';

const D = Math.PI/180, G = 9.81;
// alto del mondo negli assi del telefono (q: telefono → mondo)
const upPhone = q => qrot(qconj(q), [0, 1, 0]);
// telefono fermo nella presa q0, poi ruotato di deg gradi attorno al suo asse `axis` a 45 °/s, poi fermo: piatto letto
function giro(q0, axis, deg){
  const ft = createFaceTracker(); let q = q0.slice(), t = 0;
  ft.setRest(upPhone(q).map(v => v*G));
  // rot: [alpha (z), beta (x), gamma (y)] come devicemotion
  const passo = w => { t += 10; if (w) q = qmul(q, qaxis(axis, w*D*.01)); const u = upPhone(q); ft.feed({ t, rot: w ? [axis[2]*w, axis[0]*w, axis[1]*w] : [0, 0, 0], accG: u.map(v => v*G), acc: [0, 0, 0] }); };
  for (let i = 0; i < 50; i++) passo(0);
  const riposo = { ...ft.face };
  const rate = Math.sign(deg)*45, n = Math.round(Math.abs(deg)/45*100);
  for (let i = 0; i < n; i++) passo(rate);
  for (let i = 0; i < 25; i++) passo(0);
  return { riposo, face: { ...ft.face }, tilt: racketTiltFromFace(ft.face) };
}

test('B73 (revisione): presa insegnata «racchetta», telefono ruotato attorno alla normale dello schermo: roll e beccheggio della racchetta con il verso', () => {
  assert.equal(GRIP_STYLE, 'racchetta', 'la presa insegnata');
  const q0 = gripQuat(GRIP_STYLE);
  for (const deg of [15, 30]){
    const piu = giro(q0, [0, 0, 1], deg), meno = giro(q0, [0, 0, 1], -deg);
    assert.ok(Math.abs(piu.riposo.roll) < .5 && Math.abs(meno.riposo.roll) < .5, `a riposo roll ${piu.riposo.roll}`);
    assert.ok(Math.abs(piu.face.roll) > deg/2 && Math.abs(meno.face.roll) > deg/2, `±${deg}°: roll ${piu.face.roll} / ${meno.face.roll}`);
    assert.ok(Math.sign(piu.face.roll) === -Math.sign(meno.face.roll), `±${deg}°: roll con il verso (${piu.face.roll.toFixed(1)} / ${meno.face.roll.toFixed(1)})`);
    assert.ok(Math.sign(piu.tilt.pitch) === -Math.sign(meno.tilt.pitch) && Math.abs(piu.tilt.pitch) > deg/4 && Math.abs(meno.tilt.pitch) > deg/4,
      `±${deg}°: beccheggio della racchetta ${piu.tilt.pitch.toFixed(1)} / ${meno.tilt.pitch.toFixed(1)}`);
    // il beccheggio è la parte più grande dell'inclinazione della racchetta (come chiede lan-e2e: Z → beccheggio)
    for (const g of [piu, meno]) assert.ok(Math.abs(g.tilt.pitch) > Math.abs(g.tilt.yaw) && Math.abs(g.tilt.pitch) > Math.abs(g.tilt.roll), JSON.stringify(g.tilt));
  }
  // e gli altri due assi, nei due versi, come nel browser: X → imbardata, Y → apertura del piatto (roll)
  for (const [axis, k] of [[[1, 0, 0], 'yaw'], [[0, 1, 0], 'roll']]){
    const piu = giro(q0, axis, 30).tilt, meno = giro(q0, axis, -30).tilt;
    assert.ok(Math.sign(piu[k]) === -Math.sign(meno[k]) && Math.abs(piu[k] - meno[k]) > 30, `asse ${axis}: ${k} ${piu[k].toFixed(1)} / ${meno[k].toFixed(1)}`);
  }
});
