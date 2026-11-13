// Revisore: tenuta della fascia della riga della bozza h = clamp((q − assistQ)/0,2 + 0,5) nello scambio caldo (B42),
// colpo pulito da fermo: q = pressione degli scambi lunghi (dal 16°, −0,015 a colpo) × pressione dello scambio caldo
// (1 − 0,35 × calore, minimo 0,4; calore 0,2 al 20° … 1 al 28° … 2 dal 38°). Solo aritmetica.
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const rp = n => 1 - Math.min(.45, Math.max(0, n - 16)*.015);
const heat = n => n < 20 ? 0 : Math.min(2, (n - 20 + 1 + 1)/10);
const hp = n => Math.max(.4, 1 - .35*heat(n));
for (const n of [20, 22, 24, 26, 28, 30, 34, 38]){
  const q = clamp(rp(n)*hp(n), .2, 1);
  const h = aq => clamp((q - aq)/.2 + .5).toFixed(2);
  console.log(`colpo ${n}: q ${q.toFixed(2)} → tenuta Evento ${h(.5)} · Esperta ${h(.62)} · Leggenda ${h(.8)}`);
}
