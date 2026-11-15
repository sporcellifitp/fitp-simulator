const ROOT = process.env.ROOT || process.cwd();
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const level = process.argv[2] || 'casual';
for (let seed = 1; seed <= 4; seed++){
  const real = Math.random; Math.random = mulberry32(seed);
  try {
    const e = createHeadlessEngine({ difficulty: level }); e.startNewMatch({ showStartBanner: false });
    e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
    let served = false, bounced = null, at115 = null, kmh = null, top = null;
    for (let t = 0; t < 6; t += 1/120){
      const wasB = e.ball.bounceCountOnCurrentSide; e.step(1/120);
      if (!served && e.phase === 'RALLY'){ served = true; kmh = Math.round(e.ball.vel.length()*3.6); top = e.ball.spin.x; }
      if (served && wasB === 0 && e.ball.bounceCountOnCurrentSide === 1) bounced = { z: +e.ball.pos.z.toFixed(2), vy: +e.ball.vel.y.toFixed(2), vz: +e.ball.vel.z.toFixed(2) };
      if (bounced && at115 == null && e.ball.pos.z >= 11.5) at115 = +e.ball.pos.y.toFixed(2);
      if (served && (e.ball.lastHitter === 'player' || e.phase !== 'RALLY')) break;
    }
    console.log(JSON.stringify({ seed, kmh, top, bounced, yAt11_5: at115, plan: e.natpfPlan && { kind: e.natpfPlan.kind, c: e.natpfPlan.contact }, playerZ: +e.player.pos.z.toFixed(2) }));
  } finally { Math.random = real; }
}
