// B48: Pro contro «medio» (criterio di non regressione di audit:legend: game vinti da chi gioca 70–85%), con gli 8 semi
// dell'audit; in più i punti di chi gioca quando batte la CPU e quando batte lui
const ROOT = process.env.ROOT || process.cwd();
const { run, metrics, SEEDS } = await import(`${ROOT}/scripts/audit/legend.mjs`);
const difficulty = process.argv[2] || 'pro', profile = process.argv[3] || 'medio';
const r = run({ profile, difficulty, points: 300, seeds: SEEDS });
const m = metrics(r);
console.log(JSON.stringify({ tag: process.env.TAG || '', difficulty, profile, gameG: m.gameG, game: m.game, puntiG: m.puntiG, err: m.puntiGErr }));
