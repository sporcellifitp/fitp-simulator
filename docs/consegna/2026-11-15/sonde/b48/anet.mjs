const ROOT = process.env.ROOT || process.cwd();
const { simulate, courtStats } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
const pts = +(process.argv[2] || 30);
const out = [];
for (const seed of [4, 7, 11, 23, 31, 47]){
  const r = simulate({ profile: 'tennista', difficulty: 'casual', points: pts, seed });
  const c = courtStats([r]);
  out.push(`${seed}:${c.toNetPct}/${c.toNetFromBackPct}/${r.winPct}`);
}
console.log(out.join('  '));
