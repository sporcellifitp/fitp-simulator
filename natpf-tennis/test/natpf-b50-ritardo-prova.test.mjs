import assert from 'node:assert/strict';
import test from 'node:test';
import { ballY, estimateLag, lagPlan, proposeLag } from '../src/natpf/natpf_lag_measure.js';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';

test('B50: piano deterministico con 12 rimbalzi misurati, 3 di riscaldamento e 3 senza contatto visibile', () => {
  for (let seed = 0; seed < 200; seed++){
    const plan = lagPlan(seed);
    assert.deepEqual(plan, lagPlan(seed));
    assert.ok(plan.end >= 18 && plan.end <= 23);
    assert.equal(plan.cycles.filter(c => c.kind === 'hit').length, 12);
    for (const cycle of plan.cycles){
      assert.ok(cycle.T >= .8 && cycle.T <= 1.4);
      if (cycle.kind === 'catch') assert.equal(ballY(plan, cycle.touch - .01), null);
      else assert.ok(Math.abs(ballY(plan, cycle.touch)) < 1e-8);
    }
  }
});

test('B50: stima robusta con campioni mancanti, colpi anomali e riferimento del monitor', () => {
  for (const delay of [0, .08, .16, .20]){
    for (let seed = 0; seed < 200; seed++){
      const plan = lagPlan(seed);
      const samples = plan.cycles.filter(c => c.kind === 'hit' && c.i !== 10)
        .map((c, i) => c.touch + delay + .005 * Math.sin(i + seed));
      samples.push(plan.cycles[0].touch + .32);
      const result = estimateLag(plan, samples);
      assert.ok(result.ok && Math.abs(result.lagMs - delay * 1000) <= 10, JSON.stringify(result));
    }
  }
  const plan = lagPlan(11);
  assert.equal(estimateLag(plan, plan.cycles.map(c => c.touch + .11)).why, 'ritmo');
  assert.equal(estimateLag(plan, []).why, 'pochi');
  assert.equal(proposeLag({ lagMs: 135, refMs: 35, recent: [130, 140] }), 100);
});

test('B50: la diagnostica riceve il colpo senza farlo arrivare al motore', () => {
  const racket = Object.create(NatpfPhoneRacket.prototype);
  const samples = [];
  Object.defineProperty(racket, 'ready', { value: true });
  racket.engine = { motionController: { _emitSwing(){ assert.fail('colpo al motore'); } } };
  const release = racket.probeSwings(s => samples.push(s));
  const swing = { at: performance.now()/1000 };
  racket._onSwing(swing);
  assert.deepEqual(samples, [swing]);
  release();
  assert.equal(racket.lagProbe, null);
});
