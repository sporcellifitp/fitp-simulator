// per velocità massima del piano (km/h) e spostamento della profondità: quanto avanza chi risponde e dove colpisce
const ROOT = process.env.ROOT;
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const kmhs = (process.argv[2] || '52,55,58,61,64,67,70').split(',').map(Number), deltas = (process.argv[3] || '0,.3,.6,.9,1.2,1.5').split(',').map(Number);
const d = process.argv[4] || 'casual';
for (const k of kmhs){
  const row = [];
  for (const dl of deltas){
    let bad = 0, back = 0, n = 0, advMax = 0, czMin = 99, czMax = 0;
    for (let seed = 1; seed <= 24; seed++){
      Math.random = mulberry32(seed);
      const e = createHeadlessEngine({ difficulty: d }); e.startNewMatch({ showStartBanner: false });
      const hit = e._executeServeHit.bind(e);
      e._executeServeHit = (a, t) => { if (t?.natpfCpuServe?.depth) t = { ...t, natpfCpuServe: { ...t.natpfCpuServe, maxKmh: k, depth: t.natpfCpuServe.depth - dl } }; return hit(a, t); };
      e.score.server = 'opponent'; e.score.deuceSide = seed % 2 === 0; e._setupPointServe({ showBanner: false });
      const z0 = e.player.pos.z; let minZ = z0, maxZ = z0, served = null;
      for (let t = 0; t < 6 && !(e.ball.lastHitter === 'opponent' && e.ball.pos.z > e.player.pos.z); t += 1/120){
        e.step(1/120);
        if (e.phase === 'RALLY' && e.ball.lastHitter === 'opponent' && !served) served = { plan: e.natpfPlan };
        if (served){ minZ = Math.min(minZ, e.player.targetPos.z); maxZ = Math.max(maxZ, e.player.targetPos.z); }
        if (served && e.ball.bounceCountOnCurrentSide >= 1 && e.ball.pos.z > 10) break;
      }
      n++; const adv = z0 - minZ; advMax = Math.max(advMax, adv); if (adv >= 1.5) bad++; if (maxZ - z0 >= 2) back++;
      const cz = served?.plan?.contact?.z; czMin = Math.min(czMin, cz); czMax = Math.max(czMax, cz);
    }
    row.push(`d${dl}: av>1.5 ${bad} ind>2 ${back} cz ${czMin.toFixed(1)}–${czMax.toFixed(1)}`);
  }
  console.log(d, k, row.join(' | '));
}
