// Prova di due minuti (traguardo A) con la regola finale: rimbalzo vero, Adulto (evento), dritto del destro dal centro.
// Usa finale() di finale.mjs ricopiata qui sotto per non stampare tutto; «Classica» = strokeOutcome vero con 0,86.
process.argv[2] = process.argv[2];
const L = await import('./../prove/mappa-lib.mjs');
const { today, lvOf, lateOf } = L;
const root = process.argv[2];
const NO = await import(`${root}/src/natpf/natpf_stroke_outcome.js`);
const src = (await import('node:fs')).readFileSync(new URL('./finale.mjs', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('const F = {'), src.indexOf("const fmt = v =>"));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, u) => a + (b - a)*clamp(u);
const softEdge = (v, knee, edge) => (v <= knee ? v : knee + (edge - knee)*Math.tanh((v - knee)/(edge - knee)));
const finale = new Function('NO', 'lvOf', 'lateOf', 'clamp', 'lerp', 'softEdge', `${body}; return finale;`)(NO, lvOf, lateOf, clamp, lerp, softEdge);
const k = 'evento', lv = lvOf(k), span = NO.directionSpan(lv), late = lateOf(lv, 18);
const T = u => (u >= 0 ? u*span : u*late);
const rows = [['cima −20° (verso il centro) e un attimo dopo', -20, -.5], ['cima −25° e un attimo dopo', -25, -.5], ['cima +20° (verso l\'esterno) e un attimo prima', 20, .5], ['cima +25° e un attimo prima', 25, .5],
  ['cima dritta e un attimo prima', 0, .5], ['cima dritta e un attimo dopo', 0, -.5], ['cima −15° a tempo', -15, 0], ['cima −10° a tempo', -10, 0], ['cima +15° a tempo', 15, 0], ['cima −22° a tempo', -22, 0], ['cima −25° a tempo', -25, 0], ['cima −35° a tempo', -35, 0]];
console.log('gesto (dritto del destro, Adulto, rimbalzo vero, m; − = incrociato)'.padEnd(52), 'Classica', ' Nuova (piano finale)');
for (const [nm, d, u] of rows){
  const c = .72 + .86*(today({ dev: d, timing: T(u), k }).x - .72), n = finale({ dev: d, timing: T(u), k }).x;
  console.log(nm.padEnd(52), c.toFixed(2).padStart(7), n.toFixed(2).padStart(10));
}
