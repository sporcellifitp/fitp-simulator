// Prova di due minuti allo stand: che cosa vedrebbe l'utente con «Classica» (regola vera di oggi, rimbalzo ≈ 0,86 dello
// spostamento laterale) e con la bozza (prototipo della bozza, piano-prove/mappa-lib.mjs), dritto del destro dal centro,
// palla a 18 m/s, da fermo (q = 1). x in metri: − = incrociato (sinistra), + = lungolinea (destra). Sola lettura.
const LIB = process.argv[2], ROOT = process.argv[3];
process.argv = [process.argv[0], LIB, ROOT];
const L = await import(LIB);
const { today, b36, lvOf, lateOf } = L;
const NO = await import(`${ROOT}/src/natpf/natpf_stroke_outcome.js`);
for (const k of ['evento', 'pro']){
  const lv = lvOf(k), span = NO.directionSpan(lv)*NO.slowFactor(18), late = Math.min(span, Math.max(.04, lateOf(lv, 18)));
  console.log(`\n== livello ${k}: finestra anticipo ${(span*1000).toFixed(0)} ms, ritardo ${(late*1000).toFixed(0)} ms`);
  console.log('cima (gradi)  tempo                     Classica x   bozza x');
  for (const dev of [0, -15, 15, -30]){
    for (const [nome, u] of [['a tempo', 0], ['un attimo prima (+0,5)', .5], ['un attimo dopo (−0,5)', -.5]]){
      const timing = u >= 0 ? u*span : u*late;
      const o = today({ dev, timing, k }), xb = .72 + .86*(o.x - .72);
      const n = b36({ dev, timing, k });
      console.log(`${String(dev).padStart(5)}        ${nome.padEnd(24)}  ${xb.toFixed(2).padStart(7)}     ${n.x.toFixed(2).padStart(7)}   (${(timing*1000).toFixed(0)} ms)`);
    }
  }
}
