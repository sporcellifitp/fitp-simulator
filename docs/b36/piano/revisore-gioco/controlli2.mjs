// Revisore «gioco e obiettivi», secondo giro: confronto onesto della calamita laterale (striscia più piena di 0,2 m,
// oggi e bozza), bambino con il rumore della bozza (±16°), forza dei profili del banco. Sola lettura.
// node controlli2.mjs <percorso di natpf-tennis>
const root = process.argv[2];
const L = await import('./../prove/mappa-lib.mjs');
const NI = await import(`${root}/src/natpf/natpf_stroke_intent.js`);
const { b36, today, gauss, out } = L;

// striscia laterale di 0,2 m più piena (su |x|), sul rimbalzo vero (oggi: 0,86 dello spostamento)
function strip(fn, air, gen, n = 6000){
  const bins = new Map(); let outs = 0;
  for (let i = 0; i < n; i++){
    const { dev, timing, k, vz, q, c } = gen();
    const r = fn({ dev, timing, k, vz, q, c }), xb = air ? .72 + .86*(r.x - .72) : r.x;
    if (out(xb, r.depth)){ outs++; continue; }
    const b = Math.floor(Math.abs(xb)/.2); bins.set(b, (bins.get(b) || 0) + 1);
  }
  let best = 0, at = 0; for (const [b, v] of bins) if (v > best){ best = v; at = b; }
  return `striscia più piena |x| ${(at*.2).toFixed(1)}–${(at*.2 + .2).toFixed(1)} m: ${(100*best/n).toFixed(1)}% (fuori ${(100*outs/n).toFixed(1)}%)`;
}
console.log('== A. calamita laterale, confronto onesto: giro voluto G ± 12°, tempo pulito ±0,25, Pro, 18 m/s, q 1 ==');
for (const G of [12, 20, 30]){
  const gen = () => { const u = gauss()*.25; return { dev: -(G + gauss()*12), timing: u >= 0 ? u*.15 : u*.078, k: 'pro', vz: 18, q: 1, c: 1 }; };
  console.log(`G ${G}°  oggi:  ${strip(today, true, gen)}`);
  console.log(`G ${G}°  bozza: ${strip(b36, false, gen)}`);
}
console.log('\n== B. bambino con il rumore della bozza (cima ±16°, tempo +0,35 ± 0,6 unità), non mira, Bambini ==');
for (const vz of [15, 18]){
  for (const [nm, fn, air] of [['oggi', today, true], ['bozza', b36, false]]){
    let wide = 0, outs = 0, n = 6000; const span = .28*Math.max(1, Math.min(1.8, 15/vz)), late = 1.4/vz + .06;
    for (let i = 0; i < n; i++){
      const u = .35 + gauss()*.6, timing = u >= 0 ? u*span : u*late, c = Math.random() < .5 ? 1 : -1;
      const r = fn({ dev: gauss()*16, timing, c, k: 'bambini', vz, q: 1, power: .55 }), xb = air ? .72 + .86*(r.x - .72) : r.x;
      if (out(xb, r.depth)) outs++; else if (Math.abs(xb) > 2.5) wide++;
    }
    console.log(`palla ${vz} m/s ${nm.padEnd(5)}: oltre 2,5 m ${(100*wide/n).toFixed(1)}%  fuori ${(100*outs/n).toFixed(1)}%`);
  }
}
console.log('\n== C. forza (strokePower) dei profili del banco, picco del gesto in °/s ==');
for (const [nm, peak, sd] of [['bambino', 380, 90], ['amatore', 700, 160], ['tennista', 1150, 150]]){
  const v = [-1, 0, 1].map(z => NI.strokePower(Math.max(150, peak + z*sd)).toFixed(2));
  console.log(`${nm}: picco ${peak}±${sd} → forza ${v.join(' / ')}`);
}
