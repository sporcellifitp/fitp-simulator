// B48: quota delle mosse di chi gioca verso la rete (courtStats.toNetPct), «tennista» a Casual, 6 semi; media e semi
const ROOT = process.env.ROOT || process.cwd();
const { simulate, courtStats } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
const pts = +(process.argv[2] || 30), diff = process.argv[3] || 'casual';
const rs = [], out = [];
for (const seed of [4, 7, 11, 23, 31, 47]){ const r = simulate({ profile: 'tennista', difficulty: diff, points: pts, seed }); rs.push(r); out.push(`${seed}:${courtStats([r]).toNetPct}`); }
console.log(process.env.TAG || '', diff, pts, 'tutti', courtStats(rs).toNetPct, '4+7', courtStats(rs.slice(0, 2)).toNetPct, out.join(' '));
