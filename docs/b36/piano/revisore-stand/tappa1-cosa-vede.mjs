// Che cosa vede l'utente alla B36.1 così come è descritta (peso del tempo 0,3, spinta naturale 0, punto neutro al centro,
// curva fino a 1,6 × mira piena, oltre 60° non letta; bordi, aiuto, spinta oltre la finestra e ARIA COME OGGI): stessa
// funzione «core» di piano-prove/tappa1-aria.mjs. Rimbalzo vero ≈ hitX + 0,86·(x − hitX) per tutte e due (aria di oggi).
// Dritto del destro (c = +1), palla a 18 m/s, q = 1. x: − incrociato, + lungolinea. Sola lettura.
const R = process.argv[2], LIB = process.argv[3];
process.argv = [process.argv[0], LIB, R];
const NO = await import(`${R}/src/natpf/natpf_stroke_outcome.js`);
const { today, lvOf, lateOf } = await import(LIB);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const softEdge = (v, knee, edge) => (v <= knee ? v : knee + (edge - knee)*Math.tanh((v - knee)/(edge - knee)));
function core({ dev, timing, c = 1, hitX = .72, q = 1, k = 'pro', vz = 18, FULL = 17 }){
  const lv = lvOf(k), AS = NO.assistOf(lv), O = NO.OUTCOME, span = NO.directionSpan(lv)*NO.slowFactor(vz), late = clamp(lateOf(lv, vz), .04, span);
  const t = clamp(timing >= 0 ? timing/span : timing/late, -4, 4), excess = Math.max(0, Math.abs(t) - 1);
  const ad = Math.abs(dev), uF = ad > 60 ? 0 : Math.sign(dev)*Math.min(1.6, Math.max(0, ad - 3)/(FULL - 3));
  const aim = uF - c*.3*clamp(t, -1, 1), qq = clamp(NO.timingQualityOf(t)*q, .2, 1);
  const assist = clamp(1 - excess/O.assistFade)*clamp((qq - AS.assistQ)/O.assistQSpan + .5);
  const raw = NO.landingFromAim(aim, 0, AS.xMax) - c*Math.sign(t)*excess*AS.pushOut;
  const xa = raw + (Math.sign(raw)*softEdge(Math.abs(raw), O.sideKnee, O.sideEdge) - raw)*assist;
  return Math.abs(xa) <= O.sideLine ? xa : Math.sign(xa)*(O.sideLine + softEdge(Math.abs(xa) - O.sideLine, O.outKnee, O.outMax));
}
const air = (x, h = .72) => h + .86*(x - h);
for (const k of ['evento', 'pro']){
  const lv = lvOf(k), span = NO.directionSpan(lv)*NO.slowFactor(18), late = Math.min(span, Math.max(.04, lateOf(lv, 18)));
  console.log(`\n== ${k}: rimbalzo vero (m), Classica → B36.1 descritta`);
  for (const dev of [-25, -20, -15, -10, 0, 10, 15, 20, 25]){
    const row = [];
    for (const u of [.5, 0, -.5]){ const timing = u >= 0 ? u*span : u*late; row.push(`${air(today({ dev, timing, k }).x).toFixed(2)} → ${air(core({ dev, timing, k })).toFixed(2)}`); }
    console.log(`cima ${String(dev).padStart(4)}°   prima: ${row[0].padEnd(15)} a tempo: ${row[1].padEnd(15)} dopo: ${row[2]}`);
  }
}
