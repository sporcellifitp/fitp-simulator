// riferimento sbagliato (centro della mira spostato di E gradi): colpi giusti (3 fasce) con la bozza, Pro, mira piena 20°
const R = process.argv[2];
const NO = await import(`${R}/src/natpf/natpf_stroke_outcome.js`);
const L = await import(process.cwd() + '/mappa-lib.mjs');
const { b36, today, B, lvOf, lateOf, gauss, out } = L;
B.FULL = 20;
const lv = lvOf('pro'), span = NO.directionSpan(lv), late = Math.min(span, Math.max(.04, lateOf(lv, 18)));
const band = (x, c) => (Math.abs(x) < 1.25 ? 0 : -c*x > 0 ? -1 : 1);
for (const [nm, nf, tm, ts] of [['buono', 5, 0, .25], ['vero', 12, .35, .45]]){
  const row = [];
  for (const E of [0, 4, 6, 8, 12]){
    for (const [fnm, fn] of [['B36', b36], ['oggi', a => today({ ...a, full: 17 })]]){
      let ok = 0, n = 0;
      for (const w of [-1, 0, 1]) for (let i = 0; i < 3000; i++){
        const G = fnm === 'B36' ? 20 : 17, dev = w*G + E + gauss()*nf, u = tm + gauss()*ts, timing = u >= 0 ? u*span : u*late;
        const r = fn({ dev, timing, k: 'pro' }); n++;
        if (!out(r.x, r.depth) && band(r.x, 1) === -w*-1*-1*w/ (w||1) * 0 + (w === 0 ? 0 : (w < 0 ? -1 : 1))) ok++;
      }
      row.push(`${fnm} ${Math.round(100*ok/n)}%`);
    }
    console.log(`${nm} errore del centro ${E}°:`, row.join(' · ')); row.length = 0;
  }
}
