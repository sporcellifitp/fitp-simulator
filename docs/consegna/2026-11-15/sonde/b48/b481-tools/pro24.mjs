const ROOT = process.env.ROOT;
const { run, metrics, SEEDS, MORE_SEEDS } = await import(`${ROOT}/scripts/audit/legend.mjs`);
const m8 = metrics(run({ profile: 'medio', difficulty: 'pro', points: 300, seeds: SEEDS }));
const m24 = metrics(run({ profile: 'medio', difficulty: 'pro', points: 300, seeds: [...SEEDS, ...MORE_SEEDS].slice(0, 24) }));
console.log(JSON.stringify({ tag: process.env.TAG, game8: m8.gameG, punti8: m8.puntiG, game24: m24.gameG, punti24: m24.puntiG, err24: m24.puntiGErr }));
