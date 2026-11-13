// B36 piano unico, prototipo in sola lettura: regola di oggi (strokeOutcome vero) contro la bozza unica (scritta solo
// qui). Niente motore, niente telefono simulato, niente centro della mira che impara: una palla per caso, ritmo 0.
// node mappa.mjs <percorso di natpf-tennis> [--wt=.3] [--full=17] [--phi=0]
const root = process.argv[2];
const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? +a.split('=')[1] : d; };
const NO = await import(`${root}/src/natpf/natpf_stroke_outcome.js`);
const NI = await import(`${root}/src/natpf/natpf_stroke_intent.js`);
const NS = await import(`${root}/src/natpf/natpf_skill.js`);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a)*clamp(u);
const softEdge = (v, knee, edge) => (v <= knee ? v : knee + (edge - knee)*Math.tanh((v - knee)/(edge - knee)));
let seed = 12345; const rnd = () => ((seed = (seed*1103515245 + 12345) >>> 0)/4294967296);
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rnd()); };

const B = { WT: arg('wt', .3), FULL: arg('full', 17), OVER: 1.6, PHI: arg('phi', 0), W: arg('w', 3.2), L: 4.0, QSPAN: .2, DEAD: 3, MAXDEV: 60, HMAX: arg('hmax', 1),
  P: { bambini: 1.6, casual: 1.6, evento: 1.6, pro: 1.8, '1v1': 1.8, leggenda: 2.7 } };
const VZ = arg('vz', 18), HITZ = 11.4, Y = 1;
const lvOf = k => NS.skillLevel(k);
const lateOf = (lv, vz) => 1.4/Math.abs(vz) + (lv.lateMargin || 0);

// oggi: la regola vera
function today({ dev, timing, c = 1, hitX = .72, q = 1, k = 'pro', vz = VZ, power = .6, full = B.FULL }){
  const lv = lvOf(k), face = NI.faceAimFromDev(dev, full);
  const o = NO.strokeOutcome({ intent: { shot: 'TOPSPIN', power, depth: power*.96, rise: .3, face }, timing, lateSpan: lateOf(lv, vz), ballVz: vz, contact: c, hitX, hitZ: HITZ, quality: q, pressure: 1, rhythm: 0, rhythmLag: 0, contactY: Y, level: lv });
  return { x: o.x, depth: o.depth, t: o.t, excess: o.excess, failed: o.failed };
}
// bozza B36: piatto comanda (curva monotona fino a OVER), tempo ritocco (WT), punto neutro PHI, tenuta dalla sola
// qualità sulla parte voluta (KNEE→L), deriva continua oltre la finestra (P per livello), niente spinta naturale,
// niente accorciamento automatico dell'incrociato largo (angolo corto solo se scelto), rimbalzo vero = bersaglio
function b36({ dev, timing, c = 1, hitX = .72, q = 1, k = 'pro', vz = VZ, power = .6, full = B.FULL, short = false }){
  const lv = lvOf(k), AS = NO.assistOf(lv), span = NO.directionSpan(lv)*NO.slowFactor(vz), late = clamp(lateOf(lv, vz), .04, span);
  const t = clamp(timing >= 0 ? timing/span : timing/late, -4, 4), excess = Math.max(0, Math.abs(t) - 1);
  const ad = Math.abs(dev), uF = !Number.isFinite(dev) || ad > B.MAXDEV ? 0 : Math.sign(dev)*Math.min(B.OVER, Math.max(0, ad - B.DEAD)/(full - B.DEAD));
  const uT = clamp(t, -1, 1), aim = uF - c*B.WT*uT, a = Math.abs(aim), s = Math.sign(aim) || 1;
  const x0 = B.PHI*clamp(hitX, -B.W, B.W);
  // tenuta della fascia della riga: dalla sola situazione (corsa, allungo, preparazione, palla veloce, pressione), non dal tempo
  const h = Math.min(B.HMAX, clamp((q - AS.assistQ)/B.QSPAN + .5));
  let xv;
  if (a <= 1) xv = NO.landingFromAim(aim, x0, B.W);
  else { const e = a - 1, r = B.OVER - 1, u = clamp(e/r), S = u*u*(3 - 2*u), edge = s*B.W;   // dall'angolo W verso la riga L
    xv = edge + s*(h*(B.L - B.W)*S + (1 - h)*e*(B.W + s*0*x0)); }
  const xr = xv - c*Math.sign(t)*excess*(B.P[k] ?? 1.8);
  const x = Math.abs(xr) <= 4.115 ? xr : Math.sign(xr)*(4.115 + softEdge(Math.abs(xr) - 4.115, 1.4, 1.9));
  const qq = clamp(NO.timingQualityOf(t)*q, .2, 1);
  const D = [6.2, 11.5]; let depth = lerp(D[0], D[1], Math.pow(power*.96, .7)) - (1 - qq)*1.8 - excess*.8;
  const along = HITZ + depth, side = x - hitX; if (along > Math.abs(side)) depth = Math.sqrt(along*along - side*side) - HITZ;
  const diag = Math.abs(hitX) >= 1 ? -Math.sign(hitX) : -c, chosen = short && Math.sign(x) === diag && Math.abs(uF) >= 1 && power <= .45;
  if (chosen) depth = 4.6 + 2*power/.45;
  depth += (softEdge(depth, 10.8, 11.6) - depth)*h;
  return { x, depth, t, excess, chosen };
}
// fasce del banco B35a: incrociato / centro / lungolinea a 1,25 m dal centro (nel riferimento di chi colpisce)
const band = (x, c) => (Math.abs(x) < 1.25 ? 'ce' : -c*x > 0 ? 'in' : 'lu');
const out = (x, depth) => Math.abs(x) > 4.115 + .22 || depth > 11.89 + .28;
const NOISE = { buono: { face: 5, tm: 0, ts: .25 }, vero: { face: 12, tm: .35, ts: .45 }, bambino: { face: 16, tm: .35, ts: .6 } };
const WANT = { in: -1, ce: 0, lu: 1 };
// gesto voluto: giro insegnato G gradi (incrociato −c·G, lungolinea +c·G), tempo solito; il tempo in unità → secondi
function matrix(fn, { k = 'pro', noise = 'buono', G = arg('g', B.FULL), hitX = .72, c = 1, q = 1, N = 3000, vz = VZ } = {}){
  const lv = lvOf(k), span = NO.directionSpan(lv)*NO.slowFactor(vz), late = clamp(lateOf(lv, vz), .04, span), M = NOISE[noise];
  const res = {}; let ok = 0, n = 0, fu = 0; const xs = { in: [], ce: [], lu: [] };
  for (const [w, s] of Object.entries(WANT)){
    const cnt = { in: 0, ce: 0, lu: 0, fu: 0 };
    for (let i = 0; i < N; i++){
      const dev = s*c*G + gauss()*M.face, u = M.tm + gauss()*M.ts, timing = u >= 0 ? u*span : u*late;
      const r = fn({ dev, timing, c, hitX, q, k, vz }), xb = fn === today ? hitX + .86*(r.x - hitX) : r.x;   // oggi: rimbalzo vero ≈ 0,86 dello spostamento laterale
      if (out(xb, r.depth)){ cnt.fu++; fu++; } else { const b = band(xb, c); cnt[b]++; if (b === w) ok++; }
      xs[w].push(xb); n++;
    }
    res[w] = Object.fromEntries(Object.entries(cnt).map(([a, v]) => [a, Math.round(100*v/N)]));
  }
  const sd = a => { const m = a.reduce((p, v) => p + v, 0)/a.length; return Math.sqrt(a.reduce((p, v) => p + (v - m)**2, 0)/a.length); };
  return { res, giusti: Math.round(100*ok/n), fuori: +(100*fu/n).toFixed(1), sd: Object.fromEntries(Object.entries(xs).map(([w, a]) => [w, +sd(a).toFixed(2)])) };
}
const show = (name, m) => console.log(name.padEnd(46), 'in', JSON.stringify(m.res.in), 'ce', JSON.stringify(m.res.ce), 'lu', JSON.stringify(m.res.lu), `giusti ${m.giusti}% fuori ${m.fuori}% sd`, JSON.stringify(m.sd));

export { b36, today, B, lvOf, lateOf, gauss, out };
