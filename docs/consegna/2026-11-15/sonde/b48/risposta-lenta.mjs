// B48: risposta al servizio lento della CPU (Casual con il limite): quanto avanza chi risponde, dove colpisce, per profondità
const ROOT = process.env.ROOT || process.cwd();
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const NS = await import(`${ROOT}/src/natpf/natpf_skill.js`);
const depths = (process.argv.find(a => a.startsWith('--depths='))?.split('=')[1] || '5,5.45,5.9,6.2').split(',').map(Number);
const level = process.argv.find(a => a.startsWith('--level='))?.split('=')[1] || 'casual';
for (const D of depths){
  const rows = [];
  for (let seed = 1; seed <= 12; seed++){
    const real = Math.random; Math.random = mulberry32(seed);
    try {
      const e = createHeadlessEngine({ difficulty: level }); e.startNewMatch({ showStartBanner: false });
      const plan0 = NS.cpuServePlan;
      e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
      const z0 = e.player.pos.z; let minZ = z0, served = null, kmh = null, depth = null;
      const hit = e._executeServeHit.bind(e);
      e._executeServeHit = (a, ev) => { if (ev?.natpfCpuServe && ev.natpfCpuServe.depth != null) ev = { ...ev, natpfCpuServe: { ...ev.natpfCpuServe, depth: D } }; hit(a, ev); kmh = e.ball.vel.length()*3.6; };
      for (let t = 0; t < 6 && !(e.ball.lastHitter === 'opponent' && e.ball.pos.z > e.player.pos.z); t += 1/120){
        e.step(1/120);
        if (e.phase === 'RALLY' && e.ball.lastHitter === 'opponent' && !served) served = { plan: e.natpfPlan };
        if (served) minZ = Math.min(minZ, e.player.targetPos.z);
        if (served && e.ball.bounceCountOnCurrentSide >= 1 && depth == null) depth = e.ball.pos.z;
        if (served && e.ball.bounceCountOnCurrentSide >= 1 && e.ball.pos.z > 10) break;
      }
      rows.push({ adv: +(z0 - minZ).toFixed(2), cz: served?.plan?.contact?.z, cy: served?.plan?.contact?.y, kmh: Math.round(kmh), depth: depth && +depth.toFixed(2) });
    } finally { Math.random = real; }
  }
  const adv = rows.map(r => r.adv).sort((a, b) => a - b), cz = rows.map(r => r.cz).sort((a, b) => a - b);
  console.log(JSON.stringify({ D, avanzaMax: adv.at(-1), avanzaMed: adv[6], contattoMin: cz[0], contattoMed: cz[6], kmh: rows.map(r => r.kmh).join(','), cy: rows.map(r => r.cy?.toFixed(2)).join(',') }));
}
