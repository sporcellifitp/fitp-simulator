// primo servizio della CPU (chi gioca non ha ancora servito): profondità del rimbalzo spostata di -delta; quanto avanza chi
// risponde (come natpf-campo-aperto-23-10) e altezza dopo il rimbalzo
const ROOT = process.env.ROOT;
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const NI = await import(`${ROOT}/src/natpf/natpf_impact.js`);
const delta = +(process.argv[2] || 0), kmh = process.argv[3] ? +process.argv[3] : null;
for (const d of ['casual', 'bambini']){
  const res = [];
  for (let seed = 1; seed <= 30; seed++){
    Math.random = mulberry32(seed);
    const e = createHeadlessEngine({ difficulty: d }); e.startNewMatch({ showStartBanner: false });
    if (kmh) e.natpfServeKmh = { n: 1, sum: kmh };
    const hit = e._executeServeHit.bind(e);
    e._executeServeHit = (a, t) => { if (t?.natpfCpuServe?.depth) t = { ...t, natpfCpuServe: { ...t.natpfCpuServe, depth: t.natpfCpuServe.depth - delta } }; return hit(a, t); };
    e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
    const z0 = e.player.pos.z; let minZ = z0, served = null, after = 0;
    for (let t = 0; t < 6 && !(e.ball.lastHitter === 'opponent' && e.ball.pos.z > e.player.pos.z); t += 1/120){
      e.step(1/120);
      if (e.phase === 'RALLY' && e.ball.lastHitter === 'opponent' && !served){ served = { plan: e.natpfPlan, kmh: e.ball.vel.length()*3.6 }; const P = NI.predictBall(e.ball); after = Math.max(...P.filter(s => s.bounces === 1).map(s => s.y)); }
      if (served) minZ = Math.min(minZ, e.player.targetPos.z);
      if (served && e.ball.bounceCountOnCurrentSide >= 1 && e.ball.pos.z > 10) break;
    }
    res.push({ adv: z0 - minZ, kmh: served.kmh, after, cz: served.plan?.contact?.z, kind: served.plan?.kind });
  }
  const mx = k => Math.max(...res.map(r => r[k])).toFixed(2), mn = k => Math.min(...res.map(r => r[k])).toFixed(2);
  console.log(d, 'delta', delta, 'kmh', mn('kmh'), mx('kmh'), 'avanza max', mx('adv'), 'oltre 1,5 m', res.filter(r => r.adv >= 1.5).length, '/', res.length, 'dopo il rimbalzo', mn('after'), mx('after'), 'contatto z min', mn('cz'), 'tipi', [...new Set(res.map(r => r.kind))]);
}
