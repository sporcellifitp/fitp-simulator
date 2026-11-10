// B18 · tappa 1 del rapporto B16 (docs/b16/rapporto-gameplay.md, difetto 13 / D13): un tagliato appena più lento non
// diventa una palla corta. Palla corta solo con un gesto nettamente morbido (forza fino a INTENT.dropSoft, 0,28), oppure
// morbido (fino a INTENT.dropPower, 0,36) e verticale (|piano| fino a 0,55), oppure corto (ampiezza fino a 48°). Prima
// bastava la forza fino a 0,36: il tagliato del tutorial (swing orizzontale, |piano| 0,9) imitato a 0,8–0,9× cadeva a 2 m
// invece che a 8. La palla corta del tutorial (verticale, corta) resta una palla corta a ogni velocità.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyStroke, INTENT } from '../src/natpf/natpf_stroke_intent.js';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import { readCard } from './pose-sensors.mjs';

test('D13: classifyStroke, tagliato appena morbido: resta tagliato se lo swing è orizzontale e ampio', () => {
  const slice = { rise: -.42, plane: .9, tilt: 0 };
  // forza 0,30–0,36 (tagliato del tutorial a 0,8–0,9×), ampiezza 55°: prima palla corta, ora tagliato
  for (const power of [.3, .33, .36]) assert.equal(classifyStroke(slice, { power, angle: 55, riseRef: .12 }).shot, 'slice', `forza ${power}`);
  // nettamente morbido: palla corta anche con lo swing orizzontale
  for (const power of [.15, .25, INTENT.dropSoft]) assert.equal(classifyStroke(slice, { power, angle: 55, riseRef: .12 }).shot, 'drop', `forza ${power}`);
  // morbido e verticale: palla corta (come prima)
  assert.equal(classifyStroke({ ...slice, plane: .5 }, { power: .34, angle: 55, riseRef: .12 }).shot, 'drop');
  // corto (ampiezza ≤ 48°): palla corta a qualunque forza (come prima)
  assert.equal(classifyStroke(slice, { power: .5, angle: 40, riseRef: .12 }).shot, 'drop');
  // micro-movimento (sotto 15°): mai palla corta
  assert.equal(classifyStroke(slice, { power: .2, angle: 10, riseRef: .12 }).shot, 'slice');
  assert.equal(INTENT.dropSoft, .28);
});

const src = grip => ({ pose: (id, t, hand) => GP.gesturePose(id, t, { hand, grip }), plan: id => GP.gesturePlan(id, { grip }) });
const read = (id, rate, grip, cal, hand) => { const r = readCard(src(grip), id, { hand, cal, rate, seed: 7 }); return r.read.length === 1 ? r.read[0].ev.natpf.shot : `${r.read.length} colpi`; };

test('D13: tagliati del tutorial dal telefono simulato da 0,8× a 1,3×: tagliato (prima palla corta fino a 0,9×)', () => {
  for (const id of ['slice', 'sliceBackhand']) for (const rate of [.8, .85, .9, .95, 1, 1.3]) for (const grip of ['palmo', 'martello']) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left'])
    assert.equal(read(id, rate, grip, cal, hand), 'slice', `${id} ${rate}× ${grip} ${cal} ${hand}`);
});

test('D13: la palla corta del tutorial resta palla corta da 0,7× a 1,4×; il tagliato molto più lento (0,7×) è palla corta', () => {
  for (const rate of [.7, .9, 1, 1.2, 1.4]) for (const grip of ['palmo', 'martello']) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left'])
    assert.equal(read('drop', rate, grip, cal, hand), 'drop', `drop ${rate}× ${grip} ${cal} ${hand}`);
  for (const grip of ['palmo', 'martello']) assert.equal(read('slice', .7, grip, 'pose', 'right'), 'drop', `slice 0,7× ${grip}`);
});
