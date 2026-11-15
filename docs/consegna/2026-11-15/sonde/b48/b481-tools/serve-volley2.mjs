// servizi della CPU colpiti da chi risponde PRIMA del rimbalzo (al volo): nel tennis vero il servizio deve rimbalzare
const ROOT = process.env.ROOT;
const { simulate } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
const { phoneServeOf } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
const levels = (process.argv[2] || 'bambini,casual,evento,pro,leggenda').split(','), profiles = (process.argv[3] || 'medio,bambino,tennista').split(',');
const seeds = (process.env.SEEDS || '101,202,303,404').split(',').map(Number);
for (const difficulty of levels) for (const profile of profiles){
  let n = 0, volley = 0, ex = null, zs = [];
  for (const [si, seed] of seeds.entries()){
    let pend = null;
    const setup = e => {
      if (si % 2 === 0){ e.natpfFair = false; e.natpfServeFirst = 'opponent'; }
      const hit = e._executeServeHit.bind(e);
      e._executeServeHit = (a, evt) => { const was = e.ball.inPlay; hit(a, evt); if (was || !e.ball.inPlay || a !== e.opponent) return; n++; pend = { done: false }; };
    };
    const onStep = e => {
      if (!pend || pend.done) return;
      if (e.ball.bounceCountOnCurrentSide >= 1 && e.ball.lastHitter === 'opponent'){ pend.done = true; return; }
      if (e.ball.lastHitter === 'player'){ pend.done = true; volley++; zs.push(+e.ball.pos.z.toFixed(1)); ex ||= { seed, z: +e.ball.pos.z.toFixed(2), y: +e.ball.pos.y.toFixed(2) }; }
      if (!e.ball.inPlay) pend.done = true;
    };
    simulate({ profile, difficulty, points: +(process.env.POINTS || 200), seed, setup, onStep, ...(process.env.MODEL ? { serve: (e, rng) => phoneServeOf(process.env.MODEL, e, rng) } : {}) });
  }
  zs.sort((a, b) => a - b);
  console.log(JSON.stringify({ difficulty, profile, serviziCPU: n, colpitiAlVolo: volley, pct: +(100*volley/Math.max(1, n)).toFixed(1), z: zs.length ? [zs[0], zs[Math.floor(zs.length/2)], zs.at(-1)] : null, esempio: ex }));
}
