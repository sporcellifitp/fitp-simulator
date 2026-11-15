const ROOT = process.env.ROOT;
const { createHash } = await import('node:crypto');
const { many } = await import(`${ROOT}/scripts/audit/b19/due-umani.mjs`);
const { serveChoiceRules } = await import(`${ROOT}/src/natpf/natpf_stroke_outcome.js`);
const sha = x => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 12);
const print = (a, fair, tweak) => { const r = many({ a, b: a, fair, matches: 20, tweak }, [7001, 7103, 7207]); return { sha: sha([r.pts.map(p => [p.win, p.n, p.kind, p.srv, p.why]), r.shots.map(s => [s.k, s.shot, s.grade, s.q, s.x, s.depth, s.sup, s.flight])]), r }; };
const before = e => { e.natpfSuperRel = false; e.natpfNoPrep = false; e.natpfHotRally = false; };
for (const off of [true, false]){
  serveChoiceRules.off = off;
  for (const fair of [true, false]){ const { sha: h, r } = print('bambino', fair, before); console.log('scelta', off ? 'spenta' : 'accesa', 'fair', fair, h, 'punti', r.pts.length); }
  const { sha: h3 } = print('bambino', true, null); console.log('scelta', off ? 'spenta' : 'accesa', 'regole di oggi', h3);
}
serveChoiceRules.off = false;
