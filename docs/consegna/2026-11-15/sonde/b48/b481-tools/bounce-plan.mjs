// servizi della CPU: piano (dir, x) contro rimbalzo vero (x, z), per livello; km/h
const ROOT = process.env.ROOT;
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const NI = await import(`${ROOT}/src/natpf/natpf_impact.js`);
const third = x => { const a = Math.abs(x); return a < 4.115/3 ? 'T' : a < 2*4.115/3 ? 'corpo' : 'largo'; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(p*(s.length - 1))].toFixed(2); };
for (const d of (process.argv[2] || 'bambini,casual,evento,pro,leggenda').split(',')){
  Math.random = mulberry32(11);
  const e = createHeadlessEngine({ difficulty: d }); e.natpfFair = false; e.natpfServeFirst = 'opponent'; e.startNewMatch({ showStartBanner: false });
  e.natpfServeKmh = { n: 1, sum: 72 };
  const by = {}, all = [], runs = []; let run = 0, prev = null, maxRun = 0;
  for (let k = 0; k < 300; k++){
    e.score.server = 'opponent'; e.score.deuceSide = k % 2 === 0; e._setupPointServe({ showBanner: false });
    for (let i = 0; i < 900 && e.phase !== 'RALLY'; i++) e.step(1/120);
    const P = NI.predictBall(e.ball), B = P.find(s => s.bounces === 1), pl = e.natpfLastCpuServe;
    const t = third(B.x); run = t === prev ? run + 1 : 1; prev = t; maxRun = Math.max(maxRun, run);
    const r = by[pl.dir] || (by[pl.dir] = { n: 0, thirds: {}, x: [], z: [], px: [] }); r.n++; r.thirds[t] = (r.thirds[t] || 0) + 1; r.x.push(Math.abs(B.x)); r.z.push(Math.abs(B.z)); r.px.push(pl.x);
    all.push({ t, kmh: e.ball.vel.length()*3.6, z: Math.abs(B.z) });
    e._awardPoint('player', 'Out');
  }
  const tot = {}; for (const a of all) tot[a.t] = (tot[a.t] || 0) + 1;
  console.log(d, 'terzi veri', JSON.stringify(tot), 'max di fila', maxRun, 'km/h p10/50/90', q(all.map(a => a.kmh), .1), q(all.map(a => a.kmh), .5), q(all.map(a => a.kmh), .9), 'z p10/50/90', q(all.map(a => a.z), .1), q(all.map(a => a.z), .5), q(all.map(a => a.z), .9), 'z>5.5', all.filter(a => a.z > 5.5).length);
  for (const [k, r] of Object.entries(by)) console.log('   ', k, r.n, JSON.stringify(r.thirds), 'piano x', q(r.px, .1), q(r.px, .9), 'vero x', q(r.x, .1), q(r.x, .5), q(r.x, .9), 'z', q(r.z, .1), q(r.z, .5), q(r.z, .9));
}
