const ROOT = process.env.ROOT || process.cwd();
const { natural } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
const seeds = (process.argv[2] || '1001,1038,1075,1112').split(',').map(Number);
for (const serveModel of ['tardi', 'insegnato']){
  const r = natural({ difficulty: 'casual', profile: 'bambino', points: 300, seeds, hot: false, serveModel });
  console.log(serveModel, JSON.stringify({ puntoDiretto: r.puntoDiretto, puntiAlServizio: r.puntiAlServizio, q: r.q, ace: r.ace, n: r.servizi ?? r.n }));
}
