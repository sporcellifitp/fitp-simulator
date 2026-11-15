const ROOT = process.env.ROOT || process.cwd();
const { bench } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
const r = bench({ type: process.argv[2] || 'ritardo', difficulty: process.argv[3] || 'casual', points: 250, seeds: [7, 11, 13, 17, 19, 23] });
const rows = r.rows, B = {};
for (const x of rows){ const k = `${x.x < 0 ? 'pari' : 'disp'} ${Math.abs(x.x) < 1.8 ? '<1.8' : Math.abs(x.x) < 2.3 ? '1.8-2.3' : '>2.3'}`; const b = B[k] || (B[k] = { n: 0, diretto: 0, res: {} }); b.n++; b.res[x.res] = (b.res[x.res] || 0) + 1; }
console.log(r.puntoDiretto, JSON.stringify(B));
