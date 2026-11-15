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

// Gruppi 2 e 4–7 del piano (docs/coda/B50-piano-analisi.md §3, B50-6), aggiunti nella ripresa del 15/11 dopo la 14.8.
// Generatore con seme: i numeri sono gli stessi a ogni giro.
const seeded = seed => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296); };
const gauss = (rnd, sd) => sd * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

test('B50: la palla tocca terra al contatto, è più alta a metà intervallo, sparisce dopo la cima di un catch', () => {
  for (let seed = 0; seed < 50; seed++){
    const plan = lagPlan(seed);
    for (const c of plan.cycles){
      const start = c.touch - c.T, mid = start + c.T / 2;
      if (c.kind === 'catch'){
        assert.equal(ballY(plan, mid + .01), null, 'dopo la cima del catch la palla non si vede');
        const next = plan.cycles[c.i + 1];
        if (next) assert.equal(ballY(plan, c.touch + .1), null, 'riappare solo 0,15 s dopo il contatto del catch');
        continue;
      }
      if (c.i > 0 && plan.cycles[c.i - 1].kind === 'catch') continue;
      const top = ballY(plan, mid);
      assert.ok(top > ballY(plan, mid - c.T / 4) && top > ballY(plan, mid + c.T / 4), `cima a metà intervallo (seme ${seed}, ciclo ${c.i})`);
    }
  }
});

test('B50: persona simulata (σ 35 ms, 10% di colpi persi, 5% a caso): valide ≥ 95%, entro 30 ms ≥ 95% delle valide', () => {
  for (const lag of [0, .12, .2]){
    let valid = 0, close = 0;
    for (let seed = 1; seed <= 400; seed++){
      const rnd = seeded(seed * 104729), plan = lagPlan(seed), peaks = [];
      for (const c of plan.cycles){ if (c.kind === 'catch' || rnd() < .1) continue; peaks.push(c.touch + lag + gauss(rnd, .035)); }
      for (let i = 0; i < Math.round(.05 * plan.cycles.length); i++) peaks.push(rnd() * plan.end);
      const r = estimateLag(plan, peaks);
      if (r.ok){ valid++; if (Math.abs(r.lagMs - lag * 1000) <= 30) close++; }
    }
    assert.ok(valid / 400 >= .95, `ritardo ${lag * 1000} ms: valide ${valid}/400`);
    assert.ok(close / valid >= .95, `ritardo ${lag * 1000} ms: entro 30 ms ${close}/${valid}`);
  }
});

test('B50: rifiuti con il motivo (colpi anche sui catch, pochi colpi, colpi irregolari)', () => {
  let pochi = 0, irregolari = 0;
  for (let seed = 1; seed <= 200; seed++){
    const plan = lagPlan(seed), hits = plan.cycles.filter(c => c.kind === 'hit');
    const six = [...plan.cycles.filter(c => c.kind === 'warm'), ...hits.slice(0, 6)].map(c => c.touch + .1);
    if (estimateLag(plan, six).why === 'pochi') pochi++;
    const rnd = seeded(seed * 7919);
    const wild = estimateLag(plan, plan.cycles.filter(c => c.kind !== 'catch').map(c => c.touch + .1 + gauss(rnd, .12)));
    if (wild.why === 'irregolari') irregolari++;
  }
  assert.equal(pochi, 200, '6 colpi su 12: «pochi» sempre');
  // σ 120 ms: rifiutata nell'84% dei giri. Le prove accettate (16%) sbagliano fino a ~110 ms: limite noto, scritto in
  // docs/b50/ritardo-e-pulizie.md (la scheda chiede di ripetere se le prove differiscono di oltre 40 ms)
  assert.ok(irregolari >= 160, `σ 120 ms: «irregolari» ${irregolari}/200`);
});

test('B50: due colpi fuori misura (+400 ms, −200 ms) non spostano la stima di più di 5 ms', () => {
  for (let seed = 1; seed <= 200; seed++){
    const plan = lagPlan(seed), hits = plan.cycles.filter(c => c.kind === 'hit');
    const rnd = seeded(seed);
    const base = plan.cycles.filter(c => c.kind !== 'catch').map(c => c.touch + .1 + gauss(rnd, .005));
    const a = estimateLag(plan, base), b = estimateLag(plan, [...base, hits[4].touch + .5, hits[7].touch - .1]);
    assert.ok(a.ok && b.ok && Math.abs(a.lagMs - b.lagMs) <= 5, `seme ${seed}: ${a.lagMs} → ${b.lagMs}`);
  }
});

test('B50: valore proposto arrotondato a 5 ms, tra 0 e 200, mediana con le ultime due prove', () => {
  assert.equal(proposeLag({ lagMs: 135, refMs: 35 }), 100);
  assert.equal(proposeLag({ lagMs: 20, refMs: 60 }), 0, 'negativo → 0');
  assert.equal(proposeLag({ lagMs: 260 }), 200, 'oltre 200 → 200');
  assert.equal(proposeLag({ lagMs: 133 }), 135, 'arrotondato a 5');
  assert.equal(proposeLag({ lagMs: 135, recent: [130, 140] }), 135, 'mediana di 130/140/135');
  assert.equal(proposeLag({ lagMs: 135, recent: [10, 400, 130, 140] }), 135, 'contano solo le ultime due');
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
