// B48: ace e punti diretti del servizio forte ed esterno a Casual e Leggenda (banco di audit/servizio.mjs), prima e dopo
const ROOT = process.env.ROOT || process.cwd();
const { bench } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
for (const difficulty of ['casual', 'pro', 'leggenda']) for (const type of ['perfettoEsterno', 'perfettoStretto', 'perfettoT']){
  try { const r = bench({ type, difficulty, points: 200, seeds: [7, 11] }); console.log(JSON.stringify({ difficulty, type, ace: r.ace, puntoDiretto: r.puntoDiretto, n: r.n ?? r.servizi })); }
  catch (e) { console.log(difficulty, type, 'errore', e.message); }
}
