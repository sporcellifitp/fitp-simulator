// Revisore tecnico B36 (sola lettura): quante volte la regola dell'angolo corto della bozza (B36.5: diagonale, piatto >= 1,
// forza <= 0,45) scatta SENZA volerlo, con il rumore vero della forza (colpi.mjs: persona vera p10/p90 0,23/0,85;
// persona «normale» del telefono simulato p10/p90 0,31/0,68) e del piatto (buono ±5°, vero ±12°), gesto insegnato
// 0,85 × mira piena (B36.6) verso la diagonale, forza voluta «solita» (0,5).
let seed = 4242; const rnd = () => ((seed = (seed*1103515245 + 12345) >>> 0)/4294967296);
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rnd()); };
const P = 17, G = .85*P, N = 200000;
for (const [nm, pm, ps] of [['forza persona vera (0,54 ± 0,24)', .54, .24], ['forza persona normale sim (0,49 ± 0,145)', .49, .145]])
  for (const [fn, fs] of [['piatto buono ±5°', 5], ['piatto vero ±12°', 12]]){
    let short = 0, full = 0;
    for (let i = 0; i < N; i++){
      const face = G + gauss()*fs, power = Math.min(1, Math.max(0, pm + gauss()*ps));
      const piatto = Math.min(1.6, Math.max(0, Math.abs(face) - 3)/(P - 3));
      if (piatto >= 1){ full++; if (power <= .45) short++; }
    }
    console.log(`${nm} · ${fn}: piatto >= 1 nel ${(100*full/N).toFixed(1)}% degli incrociati voluti; angolo corto non voluto nel ${(100*short/N).toFixed(1)}%`);
  }
// salto di profondità alla soglia (formula del prototipo mappa-lib.mjs, palla a 0,72 m, x 4,0 m, contatto a 11,4 m)
const lerp = (a, b, u) => a + (b - a)*Math.max(0, Math.min(1, u));
const deep = p => { let d = lerp(6.2, 11.5, Math.pow(p*.96, .7)); const along = 11.4 + d, side = 4.0 - .72; return Math.sqrt(along*along - side*side) - 11.4; };
console.log('profondità a forza 0,45 (angolo corto): ', (4.6 + 2*.45/.45).toFixed(2), 'm · a forza 0,46 (normale):', deep(.46).toFixed(2), 'm');
