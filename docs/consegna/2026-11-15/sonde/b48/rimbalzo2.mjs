// avanzamento di chi risponde al servizio lento (Casual) per profondità ed effetto forzati
const ROOT = process.env.ROOT || process.cwd();
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const NS = await import(`${ROOT}/src/natpf/natpf_skill.js`);
for (const kind of ['flat', 'slice', 'kick']) for (const D of [5.45, 6.0, 6.2]){
  const adv = [], cz = [];
  for (let seed = 1; seed <= 16; seed++){
    const real = Math.random; Math.random = mulberry32(seed);
    try {
      const e = createHeadlessEngine({ difficulty: 'casual' }); e.startNewMatch({ showStartBanner: false });
      e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
      const hit = e._executeServeHit.bind(e), K = NS.CPU_SERVE.spin[kind];
      e._executeServeHit = (a, ev) => { if (ev?.natpfCpuServe) ev = { ...ev, natpfCpuServe: { ...ev.natpfCpuServe, depth: D, kind, top: K.top, side: K.side, flightK: K.flight } }; hit(a, ev); };
      const z0 = e.player.pos.z; let minZ = z0, served = false;
      for (let t = 0; t < 6; t += 1/120){
        e.step(1/120);
        if (e.phase === 'RALLY' && e.ball.lastHitter === 'opponent') served = true;
        if (served) minZ = Math.min(minZ, e.player.targetPos.z);
        if (served && (e.ball.lastHitter === 'player' || e.phase !== 'RALLY' || (e.ball.bounceCountOnCurrentSide >= 1 && e.ball.pos.z > 10))) break;
      }
      adv.push(z0 - minZ); cz.push(e.natpfPlan?.contact?.z ?? NaN);
    } finally { Math.random = real; }
  }
  adv.sort((a, b) => a - b); cz.sort((a, b) => a - b);
  console.log(kind, D, 'avanza med/max', adv[8].toFixed(2), adv.at(-1).toFixed(2), 'contatto min/med', cz[0].toFixed(2), cz[8].toFixed(2));
}
