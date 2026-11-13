// Protocollo A (prova di due minuti): rimbalzo vero di gesti «in conflitto», Classica contro B36.1 descritta (curva fino a
// 1,6) e B36.1 ridotta (curva di oggi: piena da 17° a 45°, poi in calo). Tempo 0,3, spinta 0, neutro al centro; bordi,
// aiuto e aria di oggi in tutte e due. Dritto del destro dal centro, 18 m/s, Adulto (evento), q = 1. Sola lettura.
const R = process.argv[2], LIB = process.argv[3];
process.argv = [process.argv[0], LIB, R];
const NO = await import(`${R}/src/natpf/natpf_stroke_outcome.js`);
const NI = await import(`${R}/src/natpf/natpf_stroke_intent.js`);
const { today, lvOf, lateOf } = await import(LIB);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const softEdge = (v, knee, edge) => (v <= knee ? v : knee + (edge - knee)*Math.tanh((v - knee)/(edge - knee)));
function core({ dev, timing, c = 1, q = 1, k = 'evento', vz = 18, reduced = false }){
  const lv = lvOf(k), AS = NO.assistOf(lv), O = NO.OUTCOME, span = NO.directionSpan(lv)*NO.slowFactor(vz), late = clamp(lateOf(lv, vz), .04, span);
  const t = clamp(timing >= 0 ? timing/span : timing/late, -4, 4), excess = Math.max(0, Math.abs(t) - 1);
  const ad = Math.abs(dev), uF = reduced ? NI.faceAimFromDev(dev, 17) : (ad > 60 ? 0 : Math.sign(dev)*Math.min(1.6, Math.max(0, ad - 3)/14));
  const aim = uF - c*.3*clamp(t, -1, 1), qq = clamp(NO.timingQualityOf(t)*q, .2, 1);
  const assist = clamp(1 - excess/O.assistFade)*clamp((qq - AS.assistQ)/O.assistQSpan + .5);
  const raw = NO.landingFromAim(aim, 0, AS.xMax) - c*Math.sign(t)*excess*AS.pushOut;
  const xa = raw + (Math.sign(raw)*softEdge(Math.abs(raw), O.sideKnee, O.sideEdge) - raw)*assist;
  return Math.abs(xa) <= O.sideLine ? xa : Math.sign(xa)*(O.sideLine + softEdge(Math.abs(xa) - O.sideLine, O.outKnee, O.outMax));
}
const air = x => .72 + .86*(x - .72);
const lv = lvOf('evento'), span = NO.directionSpan(lv)*NO.slowFactor(18), late = Math.min(span, Math.max(.04, lateOf(lv, 18)));
console.log('gesto (dritto del destro, Adulto)                 Classica   B36.1 descritta   B36.1 ridotta   (metà esterna = oltre 2,06 m)');
for (const [nome, dev, u] of [['cima −20° (verso il centro) e un attimo dopo', -20, -.5], ['cima −25° e un attimo dopo', -25, -.5], ['cima +20° (verso l\'esterno) e un attimo prima', 20, .5], ['cima +25° e un attimo prima', 25, .5], ['cima dritta e un attimo prima', 0, .5], ['cima dritta e un attimo dopo', 0, -.5]]){
  const timing = u >= 0 ? u*span : u*late;
  const a = air(today({ dev, timing, k: 'evento' }).x), b = air(core({ dev, timing })), r = air(core({ dev, timing, reduced: true }));
  console.log(`${nome.padEnd(48)} ${a.toFixed(2).padStart(7)}   ${b.toFixed(2).padStart(10)}       ${r.toFixed(2).padStart(9)}`);
}
