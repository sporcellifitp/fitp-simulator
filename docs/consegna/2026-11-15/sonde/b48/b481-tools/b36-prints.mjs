const ROOT = process.env.ROOT;
const { createHash } = await import('node:crypto');
const { simulate } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
const sha = x => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 12);
const out = {};
for (const k of ['tennista/pro', 'amatore/casual', 'bambino/bambini', 'umano/leggenda', 'medio/evento']){
  const [profile, difficulty] = k.split('/'), r = simulate({ profile, difficulty, points: 40, seed: 7 });
  out[k] = sha([r.points, r.won, r.rallies, r.reasons, r.grades, r.racket, r.landings, r.whiffs, r.shots]);
}
console.log(JSON.stringify(out));
