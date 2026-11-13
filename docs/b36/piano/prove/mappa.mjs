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

console.log(`bozza: WT ${B.WT} FULL ${B.FULL}° OVER ${B.OVER} PHI ${B.PHI} W ${B.W} L ${B.L}; palla ${VZ} m/s`);
console.log('\n== matrice voluto → ottenuto (3 fasce a 1,25 m), dritto del destro, palla a hitX 0,72 ==');
for (const k of ['bambini', 'evento', 'pro', 'leggenda']) for (const noise of ['buono', 'vero', 'bambino']){
  show(`oggi  ${k} ${noise}`, matrix(today, { k, noise })); show(`B36   ${k} ${noise}`, matrix(b36, { k, noise }));
}
console.log('\n== dagli angoli (Pro): palla a +3,5 (angolo del dritto) e −2,8 (dritto dall\'angolo del rovescio) ==');
for (const hitX of [3.5, -2.8]) for (const noise of ['buono', 'vero']){
  show(`oggi  hitX ${hitX} ${noise}`, matrix(today, { hitX, noise })); show(`B36   hitX ${hitX} ${noise}`, matrix(b36, { hitX, noise }));
}
console.log('\n== in corsa (q 0,75) ==');
for (const k of ['pro', 'leggenda']) for (const noise of ['buono', 'vero']){
  show(`oggi  ${k} ${noise} q.75`, matrix(today, { k, noise, q: .75 })); show(`B36   ${k} ${noise} q.75`, matrix(b36, { k, noise, q: .75 }));
}
// curva del piatto, tempo neutro (Pro): monotonia
console.log('\n== x (m) contro piatto (gradi), tempo neutro, Pro, palla 0,72 ==');
const degs = [0, 5, 10, 15, 17, 20, 25, 30, 40, 50, 55, 60, 70];
console.log('gradi', degs.join(' '));
console.log('oggi ', degs.map(d => today({ dev: -d, timing: 0 }).x.toFixed(2)).join(' '));
console.log('B36  ', degs.map(d => b36({ dev: -d, timing: 0 }).x.toFixed(2)).join(' '));
// solo tempo e opposti
const pro = lvOf('pro'), spanP = NO.directionSpan(pro), lateP = lateOf(pro, VZ);
console.log('\n== solo tempo (piatto 0), Pro: x da anticipo pieno a ritardo pieno ==');
for (const [nm, fn] of [['oggi', today], ['B36', b36]]) console.log(nm, [1, .5, 0, -.5, -1].map(u => fn({ dev: 0, timing: u >= 0 ? u*spanP : u*lateP }).x.toFixed(2)).join(' '));
console.log('piatto +17° (lungolinea) con anticipo pieno: oggi', today({ dev: 17, timing: spanP }).x, ' B36', b36({ dev: 17, timing: spanP }).x.toFixed(2));
// continuità: salto massimo per 10 ms (da −200 a +250 ms), piatto 0 / ±17 / ±25, palla 18 e 25 m/s, Pro e Leggenda
console.log('\n== salto massimo del bersaglio per 10 ms di tempo (m) ==');
for (const k of ['pro', 'leggenda']) for (const vz of [18, 25]){
  const row = [];
  for (const [nm, fn] of [['oggi', today], ['B36', b36]]){
    let worst = 0;
    for (const dev of [-25, -17, 0, 17, 25]) for (let ms = -200; ms < 250; ms += 1){
      const a = fn({ dev, timing: ms/1000, k, vz }).x, b = fn({ dev, timing: (ms + 10)/1000, k, vz }).x;
      worst = Math.max(worst, Math.abs(b - a));
    }
    row.push(`${nm} ${worst.toFixed(2)}`);
  }
  console.log(k, vz, 'm/s:', row.join('  '));
}
// scogliera di oggi: piatto +17° (lungolinea), ritardo crescente, Pro, 18 m/s
console.log('\n== piatto lungolinea pieno e ritardo (ms), Pro 18 m/s: x ==');
const lates = [60, 70, 78, 82, 86, 90, 95, 100, 110];
console.log('ms   ', lates.join(' '));
console.log('oggi ', lates.map(ms => today({ dev: 17, timing: -ms/1000 }).x.toFixed(2)).join(' '));
console.log('B36  ', lates.map(ms => b36({ dev: 17, timing: -ms/1000 }).x.toFixed(2)).join(' '));
console.log('B36 riga (25°)', lates.map(ms => b36({ dev: 25, timing: -ms/1000 }).x.toFixed(2)).join(' '));
// copertura: celle di 1 m (x −4…4, profondità 3…12), combinazioni piatto ±40°, forza 0…1, tempo nella finestra
console.log('\n== copertura (celle 1×1 m raggiunte su 72) e cella più piena, Pro, da 3 posizioni ==');
for (const hitX of [.72, 3.5, -2.8]){
  const row = [];
  for (const [nm, fn] of [['oggi', today], ['B36', b36], ['B36+corto', a => b36({ ...a, short: true })]]){
    const cells = new Map(); let tot = 0;
    for (let dev = -40; dev <= 40; dev += 2) for (let p = 0; p <= 1.0001; p += .05) for (let u = -1; u <= 1.0001; u += .2){
      const timing = u >= 0 ? u*spanP : u*lateP, r = fn({ dev, timing, hitX, power: p });
      if (Math.abs(r.x) > 4 || r.depth < 3 || r.depth > 12) continue;
      const key = `${Math.floor(r.x)}:${Math.floor(r.depth)}`; cells.set(key, (cells.get(key) || 0) + 1); tot++;
    }
    const max = Math.max(...cells.values());
    row.push(`${nm} ${cells.size}/72 (piena ${(100*max/tot).toFixed(1)}%)`);
  }
  console.log(`hitX ${hitX}:`, row.join('  '));
}

// zone (riferimento di chi colpisce; diagonale per geometria): quota dei colpi voluti che cadono nella zona, gesto buono
console.log('\n== zone raggiunte con il gesto per quella zona (gesto buono: piatto ±5°, tempo ±0,25), Pro, rimbalzo ==');
const ZONES = {
  PI: { face: d => d*B.FULL, power: .75, ok: (x, z, d) => Math.sign(x) === d && Math.abs(x) >= 1.4 && z >= 9 },
  LP: { face: d => -d*B.FULL, power: .75, ok: (x, z, d) => Math.sign(x) === -d && Math.abs(x) >= 1.4 && z >= 8.5 },
  CP: { face: () => 0, power: .85, ok: (x, z) => Math.abs(x) <= 1.2 && z >= 9.5 },
  AC: { face: d => d*(B.FULL + 4), power: .3, short: true, ok: (x, z, d) => Math.sign(x) === d && Math.abs(x) >= 2.6 && z >= 4.5 && z <= 7 },
  RIGA: { face: d => d*1.45*B.FULL, power: .7, ok: (x, z) => Math.abs(x) >= 3.6 && Math.abs(x) <= 4.335 && z <= 12.17 },
};
const proLv = lvOf('pro'), spanZ = NO.directionSpan(proLv), lateZ = lateOf(proLv, VZ);
for (const hitX of [.72, 3.5, -2.8]){
  const d = Math.abs(hitX) >= 1 ? -Math.sign(hitX) : -1, row = [];
  for (const [nm, Z] of Object.entries(ZONES)){
    const r2 = [];
    for (const [fnm, fn, air] of [['oggi', today, true], ['B36', b36, false]]){
      let ok = 0, fu = 0; const N = 2000;
      for (let i = 0; i < N; i++){
        const dev = Z.face(d) + gauss()*5, u = gauss()*.25, timing = u >= 0 ? u*spanZ : u*lateZ;
        const r = fn({ dev, timing, hitX, power: Z.power, short: !!Z.short });
        // oggi: il rimbalzo vero copre ~0,86 dello spostamento laterale (fixAir corregge solo z); B36: aria corretta di lato
        const xb = air ? hitX + .86*(r.x - hitX) : r.x;
        if (out(xb, r.depth)) fu++; else if (Z.ok(xb, r.depth, d)) ok++;
      }
      r2.push(`${fnm} ${Math.round(100*ok/N)}%${fu ? ` (fuori ${Math.round(100*fu/N)}%)` : ''}`);
    }
    row.push(`${nm}: ${r2.join(' / ')}`);
  }
  console.log(`hitX ${hitX}:`, row.join(' | '));
}
