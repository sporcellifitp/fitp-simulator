import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyStroke } from '../src/natpf/natpf_stroke_intent.js';
import { weakSwing } from '../src/natpf/natpf_impact.js';
import { strokeOutcome, directionSpan, OUTCOME, ASSIST } from '../src/natpf/natpf_stroke_outcome.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { ASSIST_LEGGENDA_B16, legendaB16 } from './leggenda-b16.mjs';
import { cpuTuning } from '../src/natpf/natpf_skill.js';

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
  // B18.2 passo 3: la palla debole vale solo per un colpo fallito, cioè con la regola di Leggenda di prima (failQ .63,
  // test/leggenda-b16.mjs). Con quella di oggi (failQ .3, come Pro) la stessa palla (qualità .55 × pressione .7) passa normale
  for (const shot of ['flat', 'topspin', 'slice', 'lob']){
    const now = strokeOutcome({ intent: { shot, power: .6 }, quality: .55, pressure: .7, contactY: .5, timing: 0, shortBall: true, level: skillLevel('leggenda') });
    assert.ok(!now.failed && !now.weak && !now.netFault, JSON.stringify(now));
  }
  const level = legendaB16();
  for (const shot of ['flat', 'topspin', 'slice', 'lob']) for (const power of [.2, .6, .95]) for (const timing of [0, directionSpan(level)*.8]){
    const params = { intent: { shot, power }, quality: .55, pressure: .7, contactY: .5, timing, level };
    assert.equal(strokeOutcome(params).netFault, true);
    const out = strokeOutcome({ ...params, shortBall: true });
    assert.equal(out.netFault, false); assert.equal(out.weak, true); assert.ok(out.depth < 11.885);
  }
  assert.equal(strokeOutcome({ intent: { shot: 'flat' }, quality: .5, contactY: .4, timing: .7, shortBall: true, level }).netFault, true);
});
test('motore Leggenda: recupero della palla corta oltre 5 metri dalla rete: controllato in allungo, debole sotto pressione o all\'ultimo, da fondo campo come prima', () => {
  // chi gioca a playerZ, palla corta già rimbalzata (caduta a landZ) a ballZ, di corsa e in allungo laterale
  const rec = ({ playerZ = 5.8, ballZ = 5.45, landZ = 3, rally = 4, lateral = 2.4 } = {}) => {
    const e = createHeadlessEngine({ difficulty: 'leggenda' }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = rally;
    e.player.pos.set(.3, 0, playerZ); e.ball.pos.set(1, .5, ballZ); e.ball.vel.set(0, -1, 4); e.ball.targetLanding.set(1, 0, landZ);
    const swing = { source: 'natpf-phone', side: 'forehand', shotType: 'topspin', speed: 1, natpfTau: 0, natpfLateSpan: .1,
      natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power: .5, depth: .5, rise: .3, face: 0 }, power: .5, peak: 900, latency: 0, hand: 'right' } };
    return e._natpfRacketShot(swing, e.player, { lateral, smash: false, running: 1 }).out;
  };
  // B18.2 passo 3: colpo controllato e palla debole valgono solo con la regola di Leggenda di prima (failQ .63, pressione dal
  // 10° colpo: test/leggenda-b16.mjs), qui rimessa a mano; con quella di oggi la stessa palla si gioca normale
  const now = rec();
  assert.ok(!now.failed && !now.weak && !now.controlled && !now.netFault && now.depth < 11.885, JSON.stringify(now));
  cpuTuning.leggenda = { assist: ASSIST_LEGGENDA_B16 };
  try {
    // B17.4: palla corta (caduta entro 6,4 m) raggiunta in allungo, qualità di situazione sotto failQ .63 e sopra netQMin .45:
    // colpo controllato (profondità dalla forza, non più la palla debole a 6,8 m)
    const r = rec();
    assert.ok(r.q < ASSIST_LEGGENDA_B16.failQ && r.q >= OUTCOME.netQMin, `qualità ${r.q}`);
    assert.ok(r.controlled && !r.weak && !r.failed && !r.netFault && r.depth > OUTCOME.weakDepth && r.depth < 11.885, JSON.stringify(r));
    // sotto la pressione degli scambi lunghi (pressureFrom 10 a Leggenda: dal 20° colpo) resta la palla debole di prima
    const tired = rec({ rally: 20, lateral: 2 });
    assert.ok(tired.weak && tired.pressured && !tired.controlled && !tired.netFault && tired.depth <= OUTCOME.weakDepth, JSON.stringify(tired));
    // raggiunta all'ultimo (qualità sotto netQMin): debole
    const last = rec({ lateral: 3.2 });
    assert.ok(last.q < OUTCOME.netQMin && last.weak && !last.controlled, JSON.stringify(last));
    // da fondo campo (9,5 m, caduta a 8 m: non è una palla corta) la stessa situazione fallisce come prima: in rete (palla a 0,5 m)
    const back = rec({ playerZ: 9.5, ballZ: 9.15, landZ: 8 });
    assert.ok(back.failed && back.netFault && !back.controlled && !back.weak, JSON.stringify(back));
  } finally { delete cpuTuning.leggenda; }
});
