// Revisore tecnico B36 (sola lettura): salto massimo del bersaglio per 10 ms con la formula della bozza (prototipo
// mappa-lib.mjs) a palle più veloci di quelle provate dalla bozza (18 e 25 m/s): 30 e 35 m/s (scambio caldo B42, colpi
// piatti della CPU). Criterio 4 della bozza: <= 0,5 m per 10 ms.
const L = await import('./../prove/mappa-lib.mjs');
const { b36, today } = L;
for (const k of ['pro', 'leggenda']) for (const vz of [18, 25, 30, 35]){
  const row = [];
  for (const [nm, fn] of [['oggi', today], ['bozza', b36]]){
    let worst = 0;
    for (const dev of [-25, -17, 0, 17, 25]) for (let ms = -200; ms < 250; ms += 1){
      const a = fn({ dev, timing: ms/1000, k, vz }).x, b = fn({ dev, timing: (ms + 10)/1000, k, vz }).x;
      worst = Math.max(worst, Math.abs(b - a));
    }
    row.push(`${nm} ${worst.toFixed(2)} m`);
  }
  console.log(`${k} ${vz} m/s:`, row.join(' · '));
}
