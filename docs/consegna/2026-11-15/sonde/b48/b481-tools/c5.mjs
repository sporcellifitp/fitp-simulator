const ROOT = process.env.ROOT;
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
for (const ui of [null, { controller: 'phone' }]) for (const lv of ['casual', 'pro', 'leggenda', 'bambini']) for (const seed of [9, 1, 2, 3, 4, 5, 6, 7, 8]){
  Math.random = mulberry32(seed);
  const e = createHeadlessEngine({ difficulty: lv }); e.natpfUi = ui; e.startNewMatch({ showStartBanner: false });
  e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
  const z0 = e.player.pos.z; let minZ = z0, served = null;
  for (let t = 0; t < 6 && !(e.ball.lastHitter === 'opponent' && e.ball.pos.z > e.player.pos.z); t += 1/120){
    e.step(1/120);
    if (e.phase === 'RALLY' && e.ball.lastHitter === 'opponent' && !served) served = { plan: e.natpfPlan, kmh: e.ball.vel.length()*3.6 };
    if (served) minZ = Math.min(minZ, e.player.targetPos.z);
    if (served && e.ball.bounceCountOnCurrentSide >= 1 && e.ball.pos.z > 10) break;
  }
  if (seed === 9 || z0 - minZ > 1.5) console.log(ui ? 'telefono' : 'nessuna', lv, seed, 'kmh', served.kmh.toFixed(1), 'avanza', (z0 - minZ).toFixed(2), 'contatto', served.plan?.contact?.z);
}
