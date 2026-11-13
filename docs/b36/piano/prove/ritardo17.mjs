// ritardo fisso dello schermo non misurato (tutti i colpi in ritardo di D ms), Pro 18 m/s, ritmo 0 (prima che il ritardo
// abituale di B35a si attivi): dove va il colpo voluto al centro, incrociato e lungolinea
const R = process.argv[2];
const L = await import(process.cwd() + '/mappa-lib.mjs');
const { b36, today, B } = L; B.FULL = 17;
for (const D of [0, 30, 60, 90]){
  const r = [];
  for (const [nm, dv] of [['incr', -1], ['centro', 0], ['lungo', 1]]){
    const o = today({ dev: dv*15, timing: -D/1000, full: 17 }).x, n = b36({ dev: dv*15, timing: -D/1000 }).x;
    r.push(`${nm} oggi ${o.toFixed(2)} B36 ${n.toFixed(2)}`);
  }
  console.log(`ritardo ${D} ms:`, r.join(' | '));
}
