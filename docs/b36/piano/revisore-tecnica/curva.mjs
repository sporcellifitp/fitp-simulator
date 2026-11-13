// Revisore tecnico B36 (sola lettura): curva della bozza contro oggi, scogliera a 60°, altopiano sulla riga,
// salto per grado. Usa la libreria del prototipo della bozza (mappa-lib.mjs) e il codice vero della 13.9.
const root = process.argv[2];
process.argv[2] = root;
const L = await import('./../prove/mappa-lib.mjs');
const { b36, today } = L;
const degs = [0, 10, 17, 20, 25, 30, 40, 50, 55, 59, 60, 60.5, 61, 65, 70];
for (const k of ['pro', 'leggenda']) for (const q of [1, .75]){
  console.log(`\n${k} q${q}  gradi:`, degs.join(' '));
  console.log('  oggi ', degs.map(d => today({ dev: -d, timing: 0, k, q }).x.toFixed(2)).join(' '));
  console.log('  bozza', degs.map(d => b36({ dev: -d, timing: 0, k, q }).x.toFixed(2)).join(' '));
}
// salto massimo per 1 grado (0..80°) a tempo neutro, Pro q1
for (const [nm, fn] of [['oggi', today], ['bozza', b36]]){
  let worst = 0, at = null;
  for (let d = 0; d < 80; d += .25){ const a = fn({ dev: -d, timing: 0 }).x, b = fn({ dev: -(d + 1), timing: 0 }).x; if (Math.abs(b - a) > worst){ worst = Math.abs(b - a); at = d; } }
  console.log(`${nm}: salto massimo per 1 grado ${worst.toFixed(2)} m a ${at}°`);
}
// altopiano sulla riga: chi gira "tanto" (30 ± 12°), Pro q1, tempo ±0,25: quota con x entro 3,9–4,05 m
let seed = 777; const rnd = () => ((seed = (seed*1103515245 + 12345) >>> 0)/4294967296);
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rnd()); };
for (const mean of [25, 30, 40]) for (const k of ['pro', 'leggenda']){
  let on = 0, cliff = 0, N = 4000;
  for (let i = 0; i < N; i++){ const dev = -(mean + gauss()*12), u = gauss()*.25, r = b36({ dev, timing: u*.15, k, q: 1 }); if (Math.abs(r.x) >= 3.9 && Math.abs(r.x) <= 4.05) on++; if (Math.abs(dev) > 60) cliff++; }
  console.log(`gira ${mean}±12° ${k} q1: sulla riga (3,9–4,05 m) ${(100*on/N).toFixed(1)}% · oltre 60° (al centro) ${(100*cliff/N).toFixed(1)}%`);
}
