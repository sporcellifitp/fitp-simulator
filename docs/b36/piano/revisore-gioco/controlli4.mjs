// Revisore: calamita laterale misurata bene: la quota più alta di palle (sul totale) in una finestra mobile di 0,2 m
// su |x| (rimbalzo vero), oggi e bozza. Giro voluto G ± 12° verso l'incrociato, tempo pulito ±0,25, Pro, 18 m/s, q 1.
const L = await import('./../prove/mappa-lib.mjs');
const { b36, today, gauss, out } = L;
function window02(fn, air, G, n = 8000){
  const xs = []; let outs = 0;
  for (let i = 0; i < n; i++){
    const u = gauss()*.25, timing = u >= 0 ? u*.15 : u*.078;
    const r = fn({ dev: -(G + gauss()*12), timing, k: 'pro', vz: 18, q: 1, c: 1 }), xb = air ? .72 + .86*(r.x - .72) : r.x;
    if (out(xb, r.depth)){ outs++; continue; }
    xs.push(Math.abs(xb));
  }
  xs.sort((a, b) => a - b);
  let best = 0, at = 0;
  for (let i = 0, j = 0; i < xs.length; i++){ while (xs[j] < xs[i] - .2) j++; if (i - j + 1 > best){ best = i - j + 1; at = xs[i]; } }
  return `${(100*best/n).toFixed(1)}% delle palle tra ${(at - .2).toFixed(2)} e ${at.toFixed(2)} m (fuori ${(100*outs/n).toFixed(1)}%)`;
}
for (const G of [12, 17, 20, 25, 30, 40]){
  console.log(`giro ${G}° ±12°: oggi ${window02(today, true, G)}  ·  bozza ${window02(b36, false, G)}`);
}
