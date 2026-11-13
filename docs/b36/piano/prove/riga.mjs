const R = process.argv[2];
const NO = await import(`${R}/src/natpf/natpf_stroke_outcome.js`);
const L = await import(process.cwd() + '/mappa-lib.mjs');
const { b36, B, lvOf, lateOf, gauss, out } = L;
for (const hmax of [1, .5]){
  B.HMAX = 1;
  for (const k of ['evento', 'pro', 'leggenda']){
    const lv = lvOf(k), span = NO.directionSpan(lv), late = Math.min(span, Math.max(.04, lateOf(lv, 18)));
    const row = [];
    for (const [nm, g] of [['insegnato', 1], ['riga', 1.45]]) for (const q of [1, .85, .6]){
      B.HMAX = k === 'leggenda' ? hmax : 1;
      let fu = 0; const N = 3000;
      for (let i = 0; i < N; i++){ const dev = -g*B.FULL + gauss()*5, u = gauss()*.25, timing = u >= 0 ? u*span : u*late; const r = b36({ dev, timing, k, q }); if (out(r.x, r.depth)) fu++; }
      row.push(`${nm} q${q}: ${(100*fu/N).toFixed(1)}%`);
    }
    console.log(`HMAX Leggenda ${hmax} · ${k}:`, row.join(' · '));
  }
}
