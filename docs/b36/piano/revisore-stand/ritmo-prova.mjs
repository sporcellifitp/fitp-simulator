// Il ritmo personale assorbe un tempo tenuto uguale; con il tempo alternato no. Serve per scrivere la prova di 2 minuti.
const R = process.argv[2];
const { createRhythm } = await import(`${R}/src/natpf/natpf_stroke_outcome.js`);
for (const [nome, seq] of [['sempre +0,5 (sempre un attimo prima)', Array(10).fill(.5)], ['alternato +0,5 / −0,5', Array.from({ length: 10 }, (_, i) => (i % 2 ? -.5 : .5))]]){
  const r = createRhythm(), out = [];
  for (const t of seq){ out.push(`${t > 0 ? '+' : ''}${t}→${(t - r.value).toFixed(2)}`); r.add(t); }
  console.log(`${nome}: tempo usato per la direzione colpo per colpo (te − ritmo):\n  ${out.join('  ')}`);
}
