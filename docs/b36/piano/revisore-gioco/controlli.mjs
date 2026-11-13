// Revisore «gioco e obiettivi»: controlli in sola lettura sulla regola della bozza B36 (prototipo della bozza,
// mappa-lib.mjs) e sulla regola di oggi (strokeOutcome vero). Niente motore, niente telefono simulato.
// node controlli.mjs <percorso di natpf-tennis>
const root = process.argv[2];
const L = await import('./../prove/mappa-lib.mjs');
const NO = await import(`${root}/src/natpf/natpf_stroke_outcome.js`);
const { b36, today, gauss, out } = L;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

console.log('== 1. x (m) contro scarto della cima (gradi), tempo neutro, Pro, palla a 0,72, verso incrociato ==');
const degs = [20, 25, 30, 40, 50, 55, 59, 60, 60.5, 61, 65, 70, 80];
console.log('gradi ', degs.join(' | '));
console.log('oggi  ', degs.map(d => today({ dev: -d, timing: 0 }).x.toFixed(2)).join(' | '));
console.log('bozza ', degs.map(d => b36({ dev: -d, timing: 0 }).x.toFixed(2)).join(' | '));

console.log('\n== 2. calamita laterale: chi gira molto (rumore ±12°), Pro, tempo pulito (±0,25), q 1 ==');
for (const aimDeg of [20, 24.65, 30, 40]){
  for (const [nm, fn, air] of [['oggi', today, true], ['bozza', b36, false]]){
    let strip = 0, centre = 0, outs = 0, n = 4000, xs = [];
    for (let i = 0; i < n; i++){
      const dev = -(aimDeg + gauss()*12), u = gauss()*.25, timing = u >= 0 ? u*.15 : u*.078;
      const r = fn({ dev, timing }), xb = air ? .72 + .86*(r.x - .72) : r.x;
      if (out(xb, r.depth)) outs++;
      else if (Math.abs(xb) >= 3.9) strip++;
      if (Math.abs(xb) < 1.25) centre++;
      xs.push(xb);
    }
    const lo = Math.min(...xs.map(Math.abs).filter(v => v < 4.4));
    console.log(`giro voluto ${String(aimDeg).padEnd(5)} ${nm.padEnd(5)}: in una striscia di 0,2 m (|x| 3,9–4,115) ${(100*strip/n).toFixed(1)}%  al centro (|x| < 1,25) ${(100*centre/n).toFixed(1)}%  fuori ${(100*outs/n).toFixed(1)}%`);
  }
}

console.log('\n== 3. angolo corto: profondità contro forza, cima 21° verso la diagonale, Pro, tempo neutro ==');
const pw = [.3, .4, .44, .45, .46, .5, .6];
console.log('forza            ', pw.join(' | '));
console.log('bozza (con gesto)', pw.map(p => b36({ dev: -21, timing: 0, power: p, short: true }).depth.toFixed(2)).join(' | '));
console.log('bozza (senza)    ', pw.map(p => b36({ dev: -21, timing: 0, power: p }).depth.toFixed(2)).join(' | '));
const dg = [16, 16.9, 17, 17.1, 18];
console.log('cima (forza 0,4) ', dg.join(' | '));
console.log('bozza (con gesto)', dg.map(d => b36({ dev: -d, timing: 0, power: .4, short: true }).depth.toFixed(2)).join(' | '));

console.log('\n== 4. profilo «bambino» del banco (rally-balance: non mira, tempo ±0,14 s, piatto ±0,45) e «amatore» quando non mira (±0,075 s, ±0,3) ==');
// piatto in unità → gradi equivalenti con la mira piena a 17° (zona morta 3°)
const devOfFace = f => Math.sign(f)*(3 + 14*Math.min(1, Math.abs(f)));
for (const [prof, tsd, fsd, k] of [['bambino', .14, .45, 'bambini'], ['bambino', .14, .45, 'evento'], ['amatore', .075, .3, 'evento'], ['amatore', .075, .3, 'pro']]){
  for (const vz of [15, 18]) for (const q of [1, .8]){
    const row = [];
    for (const [nm, fn, air] of [['oggi', today, true], ['bozza', b36, false]]){
      let wide = 0, outs = 0, n = 6000; const xs = [];
      for (let i = 0; i < n; i++){
        const f = gauss()*fsd, dev = devOfFace(f), timing = -(gauss()*tsd + .0194), c = Math.random() < .5 ? 1 : -1;
        const r = fn({ dev, timing, c, k, vz, q, power: .55 }), xb = air ? .72 + .86*(r.x - .72) : r.x;
        if (out(xb, r.depth)) outs++; else if (Math.abs(xb) > 2.5) wide++;
        xs.push(xb);
      }
      const m = xs.reduce((a, v) => a + v, 0)/n, sd = Math.sqrt(xs.reduce((a, v) => a + (v - m)**2, 0)/n);
      row.push(`${nm}: oltre 2,5 m ${(100*wide/n).toFixed(1)}% fuori ${(100*outs/n).toFixed(1)}% sd ${sd.toFixed(2)} m`);
    }
    console.log(`${prof} a ${k}, palla ${vz} m/s, q ${q} → ${row.join('  ·  ')}`);
  }
}

console.log('\n== 5. ritmo (createRhythm vero): chi colpisce SEMPRE «un attimo prima» (+0,5 unità) ==');
const R = NO.createRhythm();
for (let i = 1; i <= 8; i++){
  const v = R.value, aimT = clamp(.5 - v, -1, 1);
  console.log(`colpo ${i}: ritmo ${v.toFixed(2)} → tempo per la direzione ${aimT.toFixed(2)} unità → spostamento con peso 0,3: ${(.3*aimT*3.2).toFixed(2)} m (con peso 1, oggi: ${(1*aimT*3.2).toFixed(2)} m)`);
  R.add(.5, .075);
}
