// primi servizi della CPU (chi gioca non ha ancora servito) con CPU_SERVE.firstKmh = argv[2]: km/h, apice, rimbalzo
const ROOT = process.env.ROOT;
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const NS = await import(`${ROOT}/src/natpf/natpf_skill.js`);
const NI = await import(`${ROOT}/src/natpf/natpf_impact.js`);
const first = +(process.argv[2] || 70);
const orig = NS.cpuServeLimit;
for (const d of ['casual', 'bambini']){
  Math.random = mulberry32(3);
  const e = createHeadlessEngine({ difficulty: d }); e.natpfFair = false; e.natpfServeFirst = 'opponent'; e.startNewMatch({ showStartBanner: false });
  const out = [];
  for (let k = 0; k < 40; k++){
    e.natpfServeKmh = { n: 1, sum: first };   // come se chi gioca avesse servito a «first»
    e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
    for (let i = 0; i < 900 && e.phase !== 'RALLY'; i++) e.step(1/120);
    const P = NI.predictBall(e.ball), B = P.find(s => s.bounces === 1), apex = Math.max(...P.filter(s => s.bounces === 0).map(s => s.y)), after = Math.max(...P.filter(s => s.bounces === 1).map(s => s.y));
    out.push({ kmh: e.ball.vel.length()*3.6, max: e.natpfLastCpuServe.maxKmh, apex, bz: B?.z, after, kind: e.natpfLastCpuServe.kind });
    e._awardPoint('player', 'Out');
  }
  const over = out.filter(o => o.kmh > o.max + 1e-9);
  const r = k => [Math.min(...out.map(o => o[k])).toFixed(2), Math.max(...out.map(o => o[k])).toFixed(2)];
  console.log(d, 'first', first, 'kmh', r('kmh'), 'sopra il limite', over.length, over.slice(0, 2).map(o => `${o.kmh.toFixed(1)}>${o.max}`), 'apice', r('apex'), 'rimbalzo', r('bz'), 'dopo il rimbalzo max', r('after'));
}
