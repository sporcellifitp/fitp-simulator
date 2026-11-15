const ROOT = process.env.ROOT;
const { simulate, courtStats } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
for (const difficulty of ['casual', 'pro', 'leggenda']) for (const seed of [4, 7]){
  const r = simulate({ profile: 'tennista', difficulty, points: +(process.argv[2] || 30), seed });
  const c = courtStats([r]);
  console.log(difficulty, seed, 'toNet', c.toNetPct, 'letgo', r.racket.plans.letgo || 0, 'volley', r.racket.volleys, 'smash', r.racket.shots.SMASH || 0);
}
