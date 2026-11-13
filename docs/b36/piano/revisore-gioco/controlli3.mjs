// Revisore: adulto che NON mira con la cima, rumore della «persona vera» (±12°, tempo +0,35 ± 0,45 unità), Evento e Pro.
const root = process.argv[2];
const L = await import('./../prove/mappa-lib.mjs');
const NO = await import(`${root}/src/natpf/natpf_stroke_outcome.js`);
const NS = await import(`${root}/src/natpf/natpf_skill.js`);
const { b36, today, gauss, out } = L;
for (const k of ['evento', 'pro']) for (const vz of [15, 18]){
  const lv = NS.skillLevel(k), span = NO.directionSpan(lv)*NO.slowFactor(vz), late = Math.min(span, 1.4/vz + (lv.lateMargin || 0));
  const row = [];
  for (const [nm, fn, air] of [['oggi', today, true], ['bozza', b36, false]]){
    let wide = 0, outs = 0, n = 6000;
    for (let i = 0; i < n; i++){
      const u = .35 + gauss()*.45, timing = u >= 0 ? u*span : u*late, c = Math.random() < .5 ? 1 : -1;
      const r = fn({ dev: gauss()*12, timing, c, k, vz, q: 1, power: .55 }), xb = air ? .72 + .86*(r.x - .72) : r.x;
      if (out(xb, r.depth)) outs++; else if (Math.abs(xb) > 2.5) wide++;
    }
    row.push(`${nm}: oltre 2,5 m ${(100*wide/n).toFixed(1)}% fuori ${(100*outs/n).toFixed(1)}%`);
  }
  console.log(`${k}, palla ${vz} m/s → ${row.join('  ·  ')}`);
}
