// che cosa cambia nel servizio «forte in ritardo» e nel perfetto: dove cade, velocità, minaccia
const ROOT = process.env.ROOT || process.cwd();
const { bench } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
const d = process.argv[2] || 'casual';
for (const type of ['perfettoStretto', 'forteRitardo']){
  const r = bench({ type, difficulty: d, points: 250, seeds: [7, 11] });
  const rows = r.rows || [];
  const q = (a, p) => { a = [...a].sort((x, y) => x - y); return a[Math.floor(p*(a.length - 1))]; };
  console.log(type, JSON.stringify({ n: rows.length, x: rows.length ? [q(rows.map(x => Math.abs(x.x)), .1), q(rows.map(x => Math.abs(x.x)), .5), q(rows.map(x => Math.abs(x.x)), .9)] : null, kmh: rows.length ? q(rows.map(x => x.kmh), .5) : null, threat: rows.length ? q(rows.map(x => x.threat), .5) : null, keys: rows[0] && Object.keys(rows[0]) }));
}
