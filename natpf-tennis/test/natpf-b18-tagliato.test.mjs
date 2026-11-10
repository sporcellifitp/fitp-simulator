// B18 · tappa 1 del rapporto B16 (docs/b16/rapporto-gameplay.md, difetto 13 / D13): un tagliato appena più lento non
// diventa una palla corta. Palla corta solo con un gesto nettamente morbido (forza fino a INTENT.dropSoft, 0,28), oppure
// morbido (fino a INTENT.dropPower, 0,36) e verticale (|piano| fino a 0,55), oppure corto (ampiezza fino a 48°). Prima
// bastava la forza fino a 0,36: il tagliato del tutorial (swing orizzontale, |piano| 0,9) imitato a 0,8–0,9× cadeva a 2 m
// invece che a 8. La palla corta del tutorial (verticale, corta) resta una palla corta a ogni velocità.
// Revisione (10/11): con la presa a racchetta, quella insegnata dal B17 (site/js/tennis/grip-art.js GRIP_STYLE), il
// tagliato del tutorial è uno swing verticale (|piano| 0,20–0,29) che scende deciso (−0,57/−0,80): restava palla corta
// fino a 0,9× come sulla base. Ora con la discesa decisa (fino a INTENT.dropDeepRise, −0,4) palla corta solo se
// nettamente morbido; la palla corta del tutorial scende poco (−0,23/−0,25) e resta palla corta.
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
  // morbido e verticale, con la testa che scende poco: palla corta (come prima)
  assert.equal(classifyStroke({ rise: -.24, plane: .5, tilt: 0 }, { power: .34, angle: 55, riseRef: .12 }).shot, 'drop');
  assert.equal(classifyStroke({ rise: -.24, plane: .25, tilt: 0 }, { power: .34, angle: 55, riseRef: .12 }).shot, 'drop');
  // revisione: verticale ma con la discesa decisa (tagliato della presa a racchetta): tagliato se non nettamente morbido
  for (const plane of [.2, .29, .5]) for (const rise of [-.42, -.57, -.8]){
    assert.equal(classifyStroke({ rise, plane, tilt: 0 }, { power: .34, angle: 55, riseRef: .12 }).shot, 'slice', `piano ${plane} salita ${rise}`);
    assert.equal(classifyStroke({ rise, plane, tilt: 0 }, { power: .26, angle: 55, riseRef: .12 }).shot, 'drop', `morbido, piano ${plane} salita ${rise}`);
  }
  // senza la salita abituale (riseRef null) vale lo stesso
  assert.equal(classifyStroke({ rise: -.6, plane: .25, tilt: 0 }, { power: .34, angle: 55 }).shot, 'slice');
  assert.equal(INTENT.dropDeepRise, -.4);
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

test('D13 (revisione): presa a racchetta, quella insegnata: tagliato da 0,85× (rovescio da 0,75×) a 1,4× (prima palla corta fino a 0,9×)', () => {
  for (const [id, rates] of [['slice', [.85, .9, .95, 1, 1.2, 1.4]], ['sliceBackhand', [.75, .8, .85, .9, 1, 1.4]]])
    for (const rate of rates) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left'])
      assert.equal(read(id, rate, 'racchetta', cal, hand), 'slice', `${id} ${rate}× racchetta ${cal} ${hand}`);
  // la palla corta del tutorial con la presa a racchetta resta palla corta da 0,7× a 1,2× (a 1,3× già metà top spin sulla base)
  for (const rate of [.7, .8, .9, 1, 1.1, 1.2]) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left'])
    assert.equal(read('drop', rate, 'racchetta', cal, hand), 'drop', `drop ${rate}× racchetta ${cal} ${hand}`);
  // il tagliato nettamente più lento (0,7×) resta palla corta
  assert.equal(read('slice', .7, 'racchetta', 'pose', 'right'), 'drop');
});

test('D13: la palla corta del tutorial resta palla corta da 0,7× a 1,4×; il tagliato molto più lento (0,7×) è palla corta', () => {
  for (const rate of [.7, .9, 1, 1.2, 1.4]) for (const grip of ['palmo', 'martello']) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left'])
    assert.equal(read('drop', rate, grip, cal, hand), 'drop', `drop ${rate}× ${grip} ${cal} ${hand}`);
  for (const grip of ['palmo', 'martello']) assert.equal(read('slice', .7, grip, 'pose', 'right'), 'drop', `slice 0,7× ${grip}`);
});
