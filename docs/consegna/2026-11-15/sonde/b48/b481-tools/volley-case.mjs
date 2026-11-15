const ROOT = process.env.ROOT;
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const NI = await import(`${ROOT}/src/natpf/natpf_impact.js`);
for (const d of ['casual', 'pro', 'bambini']){
  Math.random = mulberry32(5);
  const e = createHeadlessEngine({ difficulty: d }); e.natpfFair = false; e.natpfServeFirst = 'opponent'; e.startNewMatch({ showStartBanner: false });
  e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
  for (let i = 0; i < 900 && e.phase !== 'RALLY'; i++) e.step(1/120);
  const b = e.ball, st = { pos: b.pos.toArray().map(v => +v.toFixed(3)), vel: b.vel.toArray().map(v => +v.toFixed(3)), spin: [b.spin.x, b.spin.y] };
  for (const z of [3, 4, 5, 6, 8]) {
    b.pos.set(...st.pos); b.vel.set(...st.vel); b.spin.set(st.spin[0], st.spin[1], 0);
    e.player.pos.set(st.pos[0] > 0 ? -1.5 : 1.5, 0, z); e.player.vel.set(0,0,0);
    const P = NI.planPlayerIntercept(e, e.player);
    console.log(d, z, JSON.stringify(st), P?.kind, P?.contact?.z);
  }
}
