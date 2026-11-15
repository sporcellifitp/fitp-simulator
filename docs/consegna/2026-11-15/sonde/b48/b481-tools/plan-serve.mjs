// piani di chi risponde ai servizi della CPU (Bambini): tipo del piano e apice
const ROOT = process.env.ROOT;
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const NI = await import(`${ROOT}/src/natpf/natpf_impact.js`);
const diff = process.argv[2] || 'bambini';
Math.random = mulberry32(5);
const e = createHeadlessEngine({ difficulty: diff }); e.natpfFair = false; e.natpfServeFirst = 'opponent'; e.startNewMatch({ showStartBanner: false });
const kinds = {};
for (let k = 0; k < 60; k++){
  e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
  for (let i = 0; i < 900 && e.phase !== 'RALLY'; i++) e.step(1/120);
  const b = e.ball, path = NI.predictBall(b), apex = Math.max(...path.filter(s => s.bounces === 0).map(s => s.y));
  const P = NI.planPlayerIntercept(e, e.player);
  kinds[P?.kind] = (kinds[P?.kind] || 0) + 1;
  if (P?.kind === 'smash' || k < 2) console.log(JSON.stringify({ k, kind: P?.kind, apex: +apex.toFixed(2), pos: b.pos.toArray().map(v => +v.toFixed(3)), vel: b.vel.toArray().map(v => +v.toFixed(3)), spin: [b.spin.x, b.spin.y], player: e.player.pos.toArray().map(v => +v.toFixed(2)), contact: P?.contact }));
  e._awardPoint('player', 'Out');
}
console.log(kinds);
