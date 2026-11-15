const ROOT = process.env.ROOT;
const { simulate } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
for (const difficulty of ['casual', 'pro', 'leggenda']) for (const seed of [4, 7]){
  const r = simulate({ profile: 'tennista', difficulty, points: +(process.argv[2] || 30), seed });
  console.log(difficulty, seed, JSON.stringify(r.racket.plans));
}
