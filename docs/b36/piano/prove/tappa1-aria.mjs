// Tappa 1 da sola (prototipo): peso del tempo 0,3, spinta naturale 0, punto neutro al centro, curva del piatto monotona
// fino a 1,6 × mira piena (oltre 60° non letto), aria corretta di lato; bordo morbido, assistenza e spinta oltre la
// finestra COME OGGI (natpf_stroke_outcome.js:338, :356-358). Confronto con oggi (rimbalzo vero ≈ 0,86 dello spostamento)
const R = process.argv[2];
const NO = await import(`${R}/src/natpf/natpf_stroke_outcome.js`);
const L = await import(process.cwd() + '/mappa-lib.mjs');
const { today, lvOf, lateOf, gauss, out } = L;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const softEdge = (v, knee, edge) => (v <= knee ? v : knee + (edge - knee)*Math.tanh((v - knee)/(edge - knee)));
const FULL = +(process.argv.find(a => a.startsWith('--full='))?.split('=')[1] || 17);
function core({ dev, timing, c = 1, hitX = .72, q = 1, k = 'pro', vz = 18 }){
  const lv = lvOf(k), AS = NO.assistOf(lv), O = NO.OUTCOME, span = NO.directionSpan(lv)*NO.slowFactor(vz), late = clamp(lateOf(lv, vz), .04, span);
  const t = clamp(timing >= 0 ? timing/span : timing/late, -4, 4), excess = Math.max(0, Math.abs(t) - 1);
  const ad = Math.abs(dev), uF = ad > 60 ? 0 : Math.sign(dev)*Math.min(1.6, Math.max(0, ad - 3)/(FULL - 3));
  const aim = uF - c*.3*clamp(t, -1, 1), qq = clamp(NO.timingQualityOf(t)*q, .2, 1);
  const assist = clamp(1 - excess/O.assistFade)*clamp((qq - AS.assistQ)/O.assistQSpan + .5);
  const raw = NO.landingFromAim(aim, 0, AS.xMax) - c*Math.sign(t)*excess*AS.pushOut;
  const xa = raw + (Math.sign(raw)*softEdge(Math.abs(raw), O.sideKnee, O.sideEdge) - raw)*assist;
  const x = Math.abs(xa) <= O.sideLine ? xa : Math.sign(xa)*(O.sideLine + softEdge(Math.abs(xa) - O.sideLine, O.outKnee, O.outMax));
  return { x, depth: 9 };
}
const band = (x, c) => (Math.abs(x) < 1.25 ? 0 : -c*x > 0 ? -1 : 1);
for (const k of ['evento', 'pro', 'leggenda']) for (const [nm, nf, tm, ts, q] of [['buono', 5, 0, .25, 1], ['vero', 12, .35, .45, 1], ['buono in corsa', 5, 0, .25, .75], ['vero in corsa', 12, .35, .45, .75]]){
  const lv = lvOf(k), span = NO.directionSpan(lv), late = Math.min(span, Math.max(.04, lateOf(lv, 18)));
  const res = [];
  for (const [fnm, fn, air, G] of [['oggi', a => today({ ...a, full: 17 }), true, 17], ['tappa1 senza aria', core, true, FULL], ['oggi 12°', a => today({ ...a, full: 17 }), true, 12], ['tappa1 senza aria 12°', core, true, 12]]){
    let ok = 0, fu = 0, n = 0;
    for (const w of [-1, 0, 1]) for (let i = 0; i < 3000; i++){
      const dev = w*G + gauss()*nf, u = tm + gauss()*ts, timing = u >= 0 ? u*span : u*late;
      const r = fn({ dev, timing, k, q }); const xb = air ? .72 + .86*(r.x - .72) : r.x; n++;
      if (out(xb, 9)) fu++; else if (band(xb, 1) === w) ok++;
    }
    res.push(`${fnm} ${Math.round(100*ok/n)}%/${(100*fu/n).toFixed(1)}%`);
  }
  console.log(`${k} ${nm}: giusti/fuori`, res.join(' · '));
}
