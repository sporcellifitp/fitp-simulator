import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyStroke } from '../src/natpf/natpf_stroke_intent.js';
import { weakSwing } from '../src/natpf/natpf_impact.js';
import { strokeOutcome, directionSpan } from '../src/natpf/natpf_stroke_outcome.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';

test('palla corta verticale morbida anche con pronazione abituale; dritti e microgesti esclusi', () => {
  const classify = (shape = {}, options = {}) => classifyStroke({ rise: -.55, plane: .3, ...shape }, { power: .2, angle: 25, riseRef: -.55, ...options });
  assert.equal(classify().shot, 'drop'); assert.ok(classify().conf >= .15);
  assert.notEqual(classify({ plane: .9 }).shot, 'drop');
  assert.notEqual(classify({ rise: .3 }).shot, 'drop');
  assert.notEqual(classify({}, { angle: 13 }).shot, 'drop');
  assert.notEqual(classify({}, { power: .8 }).shot, 'drop');
});
test('palla corta intenzionale non scartata come preparazione; microgesti ancora filtrati', () => {
  const natpf = { peak: 180, typical: 1000, angle: 25, intent: { shot: 'drop', conf: .8 } };
  assert.equal(weakSwing({ natpf }), false);
  assert.equal(weakSwing({ natpf: { ...natpf, angle: 5 } }), true);
  assert.equal(weakSwing({ natpf: { ...natpf, intent: { shot: 'topspin', conf: .8 } } }), true);
  assert.equal(weakSwing({ natpf: { ...natpf, intent: { shot: 'drop', conf: .01 } } }), true);
});
test('Leggenda: palla corta raggiunta in tempo giocabile sotto pressione, errore fuori tempo conservato', () => {
  const level = skillLevel('leggenda');
  for (const shot of ['flat', 'topspin', 'slice', 'lob']) for (const power of [.2, .6, .95]) for (const timing of [0, directionSpan(level)*.8]){
    const params = { intent: { shot, power }, quality: .55, pressure: .7, contactY: .5, timing, level };
    assert.equal(strokeOutcome(params).netFault, true);
    const out = strokeOutcome({ ...params, shortBall: true });
    assert.equal(out.netFault, false); assert.equal(out.weak, true); assert.ok(out.depth < 11.885);
  }
  assert.equal(strokeOutcome({ intent: { shot: 'flat' }, quality: .5, contactY: .4, timing: .7, shortBall: true, level }).netFault, true);
});
test('motore Leggenda: recupero della palla corta oltre 5 metri dalla rete', () => {
  const e = createHeadlessEngine({ difficulty: 'leggenda' }); e.startNewMatch({ showStartBanner: false });
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 20;
  e.player.pos.set(.3, 0, 5.8); e.ball.pos.set(1, .5, 5.45); e.ball.vel.set(0, -1, 4); e.ball.targetLanding.set(1, 0, 3);
  const swing = { source: 'natpf-phone', side: 'forehand', shotType: 'topspin', speed: 1, natpfTau: 0, natpfLateSpan: .1,
    natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power: .5, depth: .5, rise: .3, face: 0 }, power: .5, peak: 900, latency: 0, hand: 'right' } };
  const r = e._natpfRacketShot(swing, e.player, { lateral: 2, smash: false, running: 1 });
  // B17.4: con la qualità di situazione poco sotto failQ il colpo a rete è controllato (non più debole uguale per tutti)
  assert.equal(r.out.netFault, false); assert.ok(r.out.depth < 11.885); assert.ok(r.out.weak || r.out.controlled, JSON.stringify(r.out));
});
