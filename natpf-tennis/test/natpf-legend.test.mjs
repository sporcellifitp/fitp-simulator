// Livello «Leggenda» (src/natpf/natpf_legend.js): stesse regole del giocatore, scelta varia, mira corretta per l'aria,
// split-step e corsa credibili, palle fuori lasciate passare, apprendimento; casual e pro non passano mai di qui.
// I criteri di gioco sul torneo completo sono in scripts/audit/legend.mjs (comando audit:legend).
// Gira con gli altri test del gioco (comando test del progetto).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as NS from '../src/natpf/natpf_skill.js';
import * as NL from '../src/natpf/natpf_legend.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { simulate } from '../scripts/audit/rally-balance.mjs';

// motore senza disegno con Math.random e il generatore di Leggenda fissati
function engine(difficulty = 'leggenda', seed = 3){
  const real = Math.random; Math.random = mulberry32(seed);
  try {
    const e = createHeadlessEngine({ difficulty });
    e.startNewMatch({ showStartBanner: false });
    e.natpfLegendRng = mulberry32(seed*31 + 7);
    return e;
  } finally { Math.random = real; }
}
const withRandom = (seed, fn) => { const real = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };
// palla in arrivo alla CPU (che la colpisce a z ≈ −11,4), dopo il rimbalzo
function rallyBall(e, { bx = 2.6, px = -1, vz = -16 } = {}){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 4;
  e.ball.pos.set(bx, 1.0, -11.2); e.ball.vel.set(0, -.5, vz); e.ball.spin.set(14, 0, 0);
  e.opponent.pos.set(bx - .4, 0, -11.6); e.opponent.vel.set(0, 0, 0);
  e.player.pos.set(px, 0, 11.6); e.player.vel.set(0, 0, 0);
}

test('Leggenda: per chi gioca le regole di Esperto, la CPU senza errore «a dado» e più lenta del giocatore', () => {
  const L = NS.skillLevel('leggenda'), P = NS.skillLevel('pro');
  for (const k of ['assistWindow', 'perfectLead', 'timingSpan', 'autoAim', 'scatter', 'lineRisk', 'depthRisk', 'playerErr', 'streakGain', 'streakMin', 'playerSpeed'])
    assert.deepEqual(L[k], P[k], k);
  assert.equal(L.cpuErr, null); assert.ok(L.cpuLegend);
  assert.ok(L.cpuSpeed < L.playerSpeed && NL.LEGEND.lungeSpeed < L.playerSpeed, 'la CPU non corre più del giocatore, nemmeno nell\'affondo');
  const e = engine();
  assert.equal(e.opponent.maxSpeed, L.cpuSpeed); assert.equal(e.player.maxSpeed, L.playerSpeed);
  assert.ok(NL.isLegend(e));
  for (const d of ['casual', 'pro']) assert.ok(!NL.isLegend(engine(d)), d);
  e.isMultiplayer = true; assert.ok(!NL.isLegend(e), 'mai in partita tra due persone');
});

test('Leggenda: sceglie tra molti colpi, nessuno domina, e la scelta cambia con la situazione', () => {
  const e = engine(), rng = mulberry32(11), kinds = {};
  for (let i = 0; i < 400; i++){
    rallyBall(e, { bx: (rng() < .5 ? -1 : 1)*(1 + rng()*2.2), px: (rng() - .5)*3 });
    if (i % 5 === 0) e.player.vel.set((rng() - .5)*6, 0, 0);
    const out = NL.legendReturn(e, e.opponent, rng);
    assert.ok(Number.isFinite(out.x) && Number.isFinite(out.z) && out.flight > 0, JSON.stringify(out));
    kinds[out.kind] = (kinds[out.kind] || 0) + 1;
  }
  const share = Object.values(kinds).map(v => v/4);
  assert.ok(share.filter(s => s > 3).length >= 6, JSON.stringify(kinds));
  assert.ok(Math.max(...share) <= 40, JSON.stringify(kinds));
});

test('Leggenda: la mira compensa l\'aria e la palla cade dove la CPU vuole', () => {
  const miss = kLat => withRandom(5, () => {
    for (const k of Object.keys(NL.legendTuning)) delete NL.legendTuning[k];
    Object.assign(NL.legendTuning, { kLat, forceKind: 'incrociato' });
    const errs = [];
    try {
      for (let i = 0; i < 24; i++){
        const e = engine('leggenda', 40 + i);
        rallyBall(e, { bx: i % 2 ? 3 : -3 });
        e._executeOpponentReturn(e.opponent);
        const pick = e.natpfLegend.lastPick;
        if (pick.err !== 'ok') continue;
        for (let s = 0; s < 400; s++){ const vy = e.ball.vel.y; e.step(1/120); if (vy < 0 && e.ball.vel.y > 0) break; }
        errs.push(Math.abs(e.ball.pos.x - pick.x));
      }
    } finally { for (const k of Object.keys(NL.legendTuning)) delete NL.legendTuning[k]; }
    return errs.reduce((a, v) => a + v, 0)/errs.length;
  });
  const fixed = miss(NL.LEGEND.kLat), naive = miss(1);
  assert.ok(fixed < .3, `scarto medio con la correzione ${fixed.toFixed(2)} m`);
  assert.ok(fixed < naive*.5, `con la correzione ${fixed.toFixed(2)} m, senza ${naive.toFixed(2)} m`);
});

test('Leggenda: split-step all\'impatto del giocatore, poi verso la palla con un errore di lettura che si azzera', () => {
  const e = engine(), cpu = e.opponent;
  cpu.pos.set(0, 0, -11.35); cpu.vel.set(0, 0, 0);
  e.ball.targetLanding.set(3, 0, -9); e._predictBallIntercept(cpu);
  const truth = cpu.targetPos.clone(), plan = NS.planCpuRun(e, { rng: mulberry32(2) });
  assert.ok(plan.legend);
  assert.ok(plan.readAt - e.elapsedTime >= .1 && plan.readAt - e.elapsedTime <= .25, `reazione ${plan.readAt - e.elapsedTime}`);
  assert.equal(cpu.targetPos.distanceTo(cpu.pos), 0, 'ferma finché non ha letto il colpo');
  const t0 = e.elapsedTime;
  e.elapsedTime = plan.readAt - .01; NS.tickCpuRun(e); assert.equal(cpu.targetPos.distanceTo(cpu.pos), 0);
  e.elapsedTime = plan.readAt + plan.fixDur/2; NS.tickCpuRun(e);
  assert.ok(Math.abs(cpu.targetPos.x - truth.x - plan.err/2) < 1e-9, 'metà dell\'errore di lettura a metà correzione');
  e.elapsedTime = plan.readAt + plan.fixDur + .01; NS.tickCpuRun(e);
  assert.equal(cpu.targetPos.distanceTo(truth), 0); assert.equal(e.natpfSkill.cpuPlan, null);
  assert.ok(e.elapsedTime > t0);
});

test('Leggenda: corsa con accelerazione e frenata limitate, niente scatti; affondo verso la palla lontana', () => {
  const e = engine(), a = e.opponent, dt = 1/120, L = NL.LEGEND;
  e.ball.inPlay = false; a.pos.set(-2, 0, -11.35); a.vel.set(0, 0, 0); a.targetPos.set(2.5, 0, -11.35);
  let vmax = 0, prevV = 0, dvMax = 0;
  for (let i = 0; i < 240; i++){
    const x0 = a.pos.x;
    assert.ok(NL.legendStep(e, a, dt));
    const v = Math.abs(a.pos.x - x0)/dt; vmax = Math.max(vmax, v); dvMax = Math.max(dvMax, Math.abs(v - prevV)); prevV = v;
  }
  assert.ok(vmax <= a.maxSpeed + 1e-9, `velocità ${vmax}`);
  assert.ok(dvMax <= Math.max(L.accel, L.decel)*dt + 1e-6, `variazione di velocità per passo ${dvMax}`);
  assert.ok(Math.abs(a.pos.x - 2.5) < .1, 'arriva e si ferma');
  // affondo: palla che all'impatto passerebbe a 1,7 m dal corpo
  a.pos.set(0, 0, -11.4); a.vel.set(0, 0, 0); a.targetPos.copy(a.pos);
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.pos.set(1.7, 1, -6.1); e.ball.vel.set(0, 0, -20);
  let v2 = 0;
  for (let i = 0; i < 24; i++){ const x0 = a.pos.x; NL.legendStep(e, a, dt); v2 = Math.max(v2, (a.pos.x - x0)/dt); e.ball.pos.z += e.ball.vel.z*dt; }
  assert.ok(a.pos.x > .3, `il corpo va verso la palla (${a.pos.x.toFixed(2)} m)`);
  assert.ok(v2 <= L.lungeSpeed + 1e-9 && L.lungeSpeed < e.player.maxSpeed);
  assert.ok(e.natpfLegend.stats.lunges >= 1);
});

test('Leggenda: lascia passare le palle che escono, gioca quelle dentro; una decisione per palla', () => {
  const e = engine();
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.bounceCountOnCurrentSide = 0;
  // palla lunga di circa un metro
  e.ball.pos.set(0, 1.6, -9.5); e.ball.vel.set(0, 1.2, -16); e.ball.spin.set(14, 0, 0);
  const land = NL.predictLanding(e.ball);
  assert.ok(Math.abs(land.z) > NS.COURT.OUT_Z + .6, `rimbalzo previsto ${land.z.toFixed(2)}`);
  assert.equal(NL.legendLetGo(e, mulberry32(1)), true);
  assert.equal(NL.legendLetGo(e, () => .999), true, 'stessa palla, stessa decisione');
  // palla che cade dentro (nuovo colpo: lo scambio è andato avanti)
  e.ball.rallyStrokeCount += 2; e.ball.pos.set(0, 1, -7); e.ball.vel.set(0, .8, -7);
  assert.ok(Math.abs(NL.predictLanding(e.ball).z) < NS.COURT.BASELINE_Z - .5);
  assert.equal(NL.legendLetGo(e, mulberry32(1)), false);
  // dopo il rimbalzo la palla è buona: si gioca sempre
  e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount += 2;
  assert.equal(NL.legendLetGo(e, mulberry32(1)), false);
  for (const d of ['casual', 'pro']){ const p = engine(d); p.ball.bounceCountOnCurrentSide = 0; assert.equal(NL.legendLetGo(p), false, d); }
});

test('Leggenda: impara quali colpi mettono in difficoltà l\'avversario', () => {
  const e = engine(), m = NL.legendState(e);
  rallyBall(e, { bx: 2.6 });
  const eH = () => Object.fromEntries(NL.legendDecide(e, e.opponent, mulberry32(4)).cands.map(c => [c.kind, c.eH]));
  const before = eH();
  // l'avversario sbaglia sempre sui lungolinea e mai sugli incrociati
  for (let i = 0; i < 12; i++){
    m.pending = { kind: 'lungolinea', prior: .07 }; NL.legendPointEnd(e, 'opponent');
    m.pending = { kind: 'incrociato', prior: .07 }; NL.legendPointEnd(e, 'player');
  }
  const after = eH();
  assert.ok(after.lungolinea/after.incrociato > 2*before.lungolinea/before.incrociato, `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  assert.equal(m.kinds.lungolinea.err, 12); assert.equal(m.kinds.incrociato.err, 0);
  e.startNewMatch({ showStartBanner: false });
  assert.equal(e.natpfLegend, null, 'nuova partita, nuovo avversario da studiare');
});

test('Leggenda: servizio vario (da un angolo all\'altro e al corpo, velocità diverse)', () => {
  const e = engine(), rng = mulberry32(8), dir = { neg: 0, pos: 0, mid: 0 }, speeds = [];
  for (let i = 0; i < 200; i++){ const s = NL.legendServe(e, rng); speeds.push(s.speed); dir[s.dirX <= -.9 ? 'neg' : s.dirX >= .9 ? 'pos' : 'mid']++; }
  assert.ok(dir.neg > 40 && dir.pos > 40 && dir.mid > 20, JSON.stringify(dir));
  assert.ok(Math.min(...speeds) >= 1.05 && Math.max(...speeds) <= 1.45 && Math.max(...speeds) - Math.min(...speeds) > .3);
});

test('Leggenda nel disegno: racchetta e corpo verso la palla lontana, lato del colpo rispetto al corpo, swing all\'impatto', () => {
  // attore con racchetta e modello finti: racket_kinematics riscrive la posizione della racchetta a ogni fotogramma
  const pose = e => {
    const a = e.opponent;
    a.racketPivot = { position: { x: -.36 } }; a.model = { rotation: { z: 0 } }; a.racketKinematics = { swingDuration: .36, swingElapsed: 0 };
    return () => { a.racketPivot.position.x = -.36; NL.legendReachPose(e, a, 1/60); return { dx: a.racketPivot.position.x + .36, lean: a.model.rotation.z, prep: a.userData?.natpfPrep?.side }; };
  };
  const e = engine(), frame = pose(e);
  rallyBall(e, { bx: 1.8 });
  e.opponent.pos.set(0, 0, -11.4); e.ball.pos.set(1.8, 1, -10.0 + 16*.12);    // impatto fra 0,12 s, palla a 1,8 m dal corpo
  let f; for (let i = 0; i < 6; i++) f = frame();
  assert.ok(f.dx > .25 && f.dx <= NL.LEGEND.reachMax + 1e-9, `racchetta allungata di ${f.dx}`);
  assert.ok(f.lean < -.1, `corpo inclinato verso la palla (${f.lean})`);      // radice della CPU non girata: x locale = x del campo
  assert.equal(f.prep, 'backhand', 'palla a x maggiore del corpo: rovescio, come all\'impatto del motore');
  // all'impatto: con l'allungo lo swing parte da poco prima del colpo; con la palla vicina resta intero
  e.opponent.natpfReach.hold = { t: e.elapsedTime, x: .4 }; NL.legendSwingAtContact(e, e.opponent);
  assert.ok(e.opponent.racketKinematics.swingElapsed > 0);
  e.opponent.racketKinematics.swingElapsed = 0; e.opponent.natpfReach.hold = { t: e.elapsedTime, x: 0 }; NL.legendSwingAtContact(e, e.opponent);
  assert.equal(e.opponent.racketKinematics.swingElapsed, 0);
  // palla vicina: dopo l'impatto la racchetta rientra subito e il corpo torna dritto
  e.ball.lastHitter = 'opponent'; for (let i = 0; i < 30; i++) f = frame();
  assert.ok(Math.abs(f.dx) < .01 && Math.abs(f.lean) < .01, JSON.stringify(f));
  // casual e pro: niente allungo, niente lato imposto
  for (const d of ['casual', 'pro']){
    const p = engine(d), pf = pose(p); rallyBall(p, { bx: 1.8 }); p.ball.pos.set(1.8, 1, -8.1);
    const r = pf();
    assert.deepEqual([r.dx, r.lean, r.prep], [0, 0, undefined], d);
  }
});

test('casual e pro non passano mai dal modello di Leggenda', () => {
  for (const d of ['casual', 'pro']){
    const e = engine(d);
    rallyBall(e);
    withRandom(4, () => e._executeOpponentReturn(e.opponent));
    assert.equal(e.natpfLegend ?? null, null, d);
    assert.equal(NL.legendStep(e, e.opponent, 1/120), false, d);
  }
});

test('Leggenda: partita senza grafica deterministica, la CPU vince la maggior parte dei punti', () => {
  const a = simulate({ profile: 'medio', difficulty: 'leggenda', points: 50, seed: 5 });
  const b = simulate({ profile: 'medio', difficulty: 'leggenda', points: 50, seed: 5 });
  assert.deepEqual(a, b);
  assert.equal(a.points, 50);
  assert.ok(a.winPct < 45, `il giocatore medio vince il ${a.winPct}% dei punti`);
});
