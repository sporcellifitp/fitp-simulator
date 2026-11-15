const ROOT = process.env.ROOT || process.cwd();
const { bench } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
const seeds = (process.argv[3] || '7,11').split(',').map(Number), difficulty = process.argv[2] || 'casual';
const out = {};
for (const type of ['perfettoStretto', 'tutorial', 'forteRitardo', 'ritardo']){ const r = bench({ type, difficulty, points: 250, seeds }); out[type] = `${r.puntoDiretto}% (ace ${r.ace}%)`; }
console.log(difficulty, seeds.join(','), JSON.stringify(out));
