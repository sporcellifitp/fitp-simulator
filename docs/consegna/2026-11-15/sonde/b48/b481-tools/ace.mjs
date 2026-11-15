const ROOT = process.env.ROOT;
const { bench } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
for (const d of ['casual', 'pro']) { const r = bench({ type: 'perfettoEsterno', difficulty: d, points: 200, seeds: [7, 11] }); console.log(d, 'ace', r.ace, 'punti diretti', r.puntoDiretto, 'n', r.n); }
