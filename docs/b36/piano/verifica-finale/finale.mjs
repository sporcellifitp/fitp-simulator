// B36, piano finale: verifica in sola lettura delle modifiche alla regola chieste dalle revisioni.
// node finale.mjs <percorso di natpf-tennis>
// Stessi limiti del prototipo della bozza (piano-prove/mappa-lib.mjs): una palla, niente motore, niente telefono simulato,
// niente centro che impara. «oggi» = strokeOutcome vero, rimbalzo vero stimato con 0,86 dello spostamento laterale.
const L = await import('./../prove/mappa-lib.mjs');
const { today, gauss, out, lvOf, lateOf } = L;
const root = process.argv[2];
const NO = await import(`${root}/src/natpf/natpf_stroke_outcome.js`);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a)*clamp(u);
const softEdge = (v, knee, edge) => (v <= knee ? v : knee + (edge - knee)*Math.tanh((v - knee)/(edge - knee)));

const F = { WT: .3, P: 17, DEAD: 3, OVER: 1.6, BACK: 45, TAIL: .7, A: 3.2, LN: 4.0, QSPAN: +(process.env.QSPAN || .2), K: 2.0, SLOPE: 45,
  D: { bambini: 1.6, casual: 1.6, evento: 1.6, pro: 1.8, '1v1': 1.8, leggenda: 2.7 } };
// curva della cima: sale fino a OVER (1,6 × P), poi rientra verso la mira piena (1 a BACK gradi), poi scende piano verso
// TAIL a 90°; rising = la parte che sale senza rientro (serve solo quando la tenuta h < 1: la palla continua dritta)
function cima(dev, P = F.P){
  const ad = Math.abs(dev), s = Math.sign(dev) || 1, r = Math.max(0, ad - F.DEAD)/(P - F.DEAD);
  const a1 = F.DEAD + F.OVER*(P - F.DEAD);
  let u;
  if (r <= F.OVER) u = r;
  else if (ad <= F.BACK) u = F.OVER - (F.OVER - 1)*(ad - a1)/(F.BACK - a1);
  else u = 1 - (1 - F.TAIL)*clamp((ad - F.BACK)/(90 - F.BACK));
  return { u: s*u, rising: s*r };
}
// regola finale (laterale e profondità), riferimento di chi colpisce; x = rimbalzo vero (aria corretta)
function finale({ dev, timing, c = 1, hitX = .72, q = 1, k = 'pro', vz = 18, rel = 1, peakTyp = 700, P = F.P, slope = F.SLOPE, back = F.BACK }){
  const lv = lvOf(k), AS = NO.assistOf(lv), span = NO.directionSpan(lv)*NO.slowFactor(vz), late = clamp(lateOf(lv, vz), .04, span);
  const t = clamp(timing >= 0 ? timing/span : timing/late, -4, 4), excess = Math.max(0, Math.abs(t) - 1);
  const save = F.BACK; F.BACK = back; const C = cima(dev, P); F.BACK = save;
  const uT = clamp(t, -1, 1), aim = C.u - c*F.WT*uT, a = Math.abs(aim), s = Math.sign(aim) || 1;
  const h = clamp((q - AS.assistQ)/F.QSPAN + .5);
  // fascia sicura (|mira| ≤ 1, punto neutro al centro) e fascia della riga (lineare: niente accumulo sulla riga); la parte
  // tenuta (h) rientra verso l'angolo oltre 1,6 × P, la parte non tenuta (1 − h: corsa, allungo, palla veloce) continua
  // dritta senza rientro
  const e = Math.max(0, a - 1), g = clamp(e/(F.OVER - 1));
  const eRaw = Math.max(0, Math.abs(C.rising - c*F.WT*uT) - 1);
  // la parte non tenuta continua con la pendenza della fascia sicura (come nella bozza: h = 0 → x = A·(1 + e)), in tutte e due
  // le fasce, così la curva resta continua anche dove la mira tenuta rientra sotto 1 (oltre 45°)
  const xv = s*((a <= 1 ? a*F.A : F.A + h*(F.LN - F.A)*g) + (1 - h)*(+(process.env.CONT || F.K))*eRaw);
  // oltre la finestra: deriva in metri per SECONDO oltre il bordo, pendenza al massimo «slope» m/s
  const edgeS = t >= 0 ? span : late, overS = excess*edgeS, Dunit = F.D[k] ?? 1.8;
  const xr = xv - c*Math.sign(t)*Math.min(slope*overS, Dunit*excess);
  const x = Math.abs(xr) <= 4.115 ? xr : Math.sign(xr)*(4.115 + softEdge(Math.abs(xr) - 4.115, 1.4, 1.9));
  // profondità: forza (metà assoluta, metà relativa al proprio colpo tipico), niente accorciamento automatico dell'incrociato
  const peak = peakTyp*rel, abs = clamp((peak - 250)/1100), power = clamp(.5*abs + .5*clamp(.6 + .9*(rel - 1)));
  const qq = clamp(NO.timingQualityOf(t)*q, .2, 1);
  let depth = lerp(6.2, 11.5, Math.pow(power*.96, .7)) - (1 - qq)*1.8 - excess*.8;
  const HZ = 11.4, along = HZ + depth, side = x - hitX; if (along > Math.abs(side)) depth = Math.sqrt(along*along - side*side) - HZ;
  // angolo corto scelto, continuo: cima oltre 1,1 × P (rampa fino a 1,6), gesto più morbido del proprio solito (rel sotto 0,7,
  // pieno a 0,45), dalla parte della diagonale (fascia di passaggio tra 0,6 e 1,4 m di hitX)
  const wC = clamp((Math.abs(C.u) - 1.1)/.5), wF = clamp((.7 - rel)/.25);
  const dOpp = -Math.sign(hitX) || -c, wd = clamp((Math.abs(hitX) - .6)/.8), diagSide = Math.abs(hitX) < 1e-9 ? -c : (wd*dOpp + (1 - wd)*(-c));
  const wD = clamp(Math.sign(aim) === Math.sign(diagSide) ? Math.abs(diagSide) : 0);
  const w = wC*wF*wD;
  depth -= Math.max(0, depth - 5.8)*.8*w;
  depth += (softEdge(depth, 10.8, 11.6) - depth)*h;
  return { x, depth, t, excess, w, power };
}
const fmt = v => v.toFixed(2);
console.log('== 1. x (rimbalzo vero, m) contro il giro della cima, tempo neutro, Pro, q 1, verso l\'incrociato (P 17°) ==');
const degs = [0, 5, 10, 17, 20, 22, 25, 25.4, 28, 30, 35, 40, 45, 50, 60, 70, 80, 90];
console.log('gradi ', degs.join(' | '));
console.log('oggi  ', degs.map(d => fmt(.72 + .86*(today({ dev: -d, timing: 0 }).x - .72))).join(' | '));
console.log('finale', degs.map(d => fmt(finale({ dev: -d, timing: 0 }).x)).join(' | '));
for (const [nm, fn, air] of [['oggi', today, true], ['finale', finale, false]]) for (const k of ['pro', 'leggenda']) for (const q of [1, .75]){
  let worst = 0, at = 0;
  for (let d = 0; d < 89; d += .25){ const xa = fn({ dev: -d, timing: 0, k, q }).x, xb = fn({ dev: -(d + 1), timing: 0, k, q }).x; const ja = air ? .86*(xb - xa) : xb - xa; if (Math.abs(ja) > worst){ worst = Math.abs(ja); at = d; } }
  console.log(`${nm.padEnd(6)} ${k} q${q}: salto massimo per 1 grado (0–90°) ${worst.toFixed(2)} m a ${at}°`);
}

console.log('\n== 2. calamita: quota più alta di palle in una finestra mobile di 0,2 m su |x|; giro G ± 12°, tempo ±0,25, Pro, q 1 ==');
function win(fn, air, G, n = 8000){
  const xs = []; let outs = 0;
  for (let i = 0; i < n; i++){
    const u = gauss()*.25, timing = u >= 0 ? u*.15 : u*.078;
    const r = fn({ dev: -(G + gauss()*12), timing, k: 'pro', vz: 18, q: 1, c: 1 }), xb = air ? .72 + .86*(r.x - .72) : r.x;
    if (out(xb, r.depth)){ outs++; continue; }
    xs.push(Math.abs(xb));
  }
  xs.sort((a, b) => a - b);
  let best = 0, at = 0;
  for (let i = 0, j = 0; i < xs.length; i++){ while (xs[j] < xs[i] - .2) j++; if (i - j + 1 > best){ best = i - j + 1; at = xs[i]; } }
  return `${(100*best/n).toFixed(1)}% tra ${(at - .2).toFixed(2)} e ${at.toFixed(2)} m (fuori ${(100*outs/n).toFixed(1)}%)`;
}
for (const G of [12, 17, 20, 25, 30, 40]) console.log(`giro ${G}° ±12°: oggi ${win(today, true, G)} · finale ${win(finale, false, G)}`);

console.log('\n== 3. riga voluta: giro 1,45 × P (24,7°) ± 5°, tempo ±0,25; quota tra 3,6 m e la riga, fuori ==');
for (const k of ['evento', 'pro', 'leggenda']) for (const q of [1, .75]){
  let on = 0, fu = 0, N = 6000;
  for (let i = 0; i < N; i++){ const u = gauss()*.25, lv = lvOf(k), span = NO.directionSpan(lv), late = lateOf(lv, 18); const r = finale({ dev: -(24.65 + gauss()*5), timing: u >= 0 ? u*span : u*late, k, q }); if (out(r.x, r.depth)) fu++; else if (Math.abs(r.x) >= 3.6) on++; }
  console.log(`${k} q${q}: tra 3,6 m e la riga ${(100*on/N).toFixed(0)}% · fuori ${(100*fu/N).toFixed(1)}%`);
}

console.log('\n== 4. salto per 10 ms oltre la finestra (deriva in m/s, pendenza massima 45 m/s), mira piena lungolinea ==');
for (const k of ['pro', 'leggenda']) for (const vz of [18, 25, 30, 35]){
  let worst = 0;
  for (let ms = 0; ms < 200; ms += 1){ const a = finale({ dev: 17, timing: -ms/1000, k, vz }).x, b = finale({ dev: 17, timing: -(ms + 10)/1000, k, vz }).x; worst = Math.max(worst, Math.abs(b - a)); }
  console.log(`${k} ${vz} m/s: salto massimo per 10 ms ${worst.toFixed(2)} m`);
}

console.log('\n== 5. angolo corto continuo (cima oltre 1,1 × P, gesto più morbido del solito), dal centro, dritto del destro, Pro ==');
const zoneAC = r => !out(r.x, r.depth) && -r.x > 2.6 && r.depth >= 4.5 && r.depth <= 7;
for (const [nm, devSd, relSd] of [['gesto buono', 5, .15], ['persona vera', 12, .3]]){
  let un = 0, ok = 0, N = 8000;
  for (let i = 0; i < N; i++){
    // incrociato «normale» (giro insegnato 15°, forza solita): angolo corto NON voluto
    const u = gauss()*.25; let r = finale({ dev: -(15 + gauss()*devSd), timing: u*.15, rel: Math.max(.2, 1 + gauss()*relSd) }); if (zoneAC(r)) un++;
    // angolo corto voluto: giro 1,4 × P (22,6°), gesto morbido (metà del solito)
    r = finale({ dev: -(22.6 + gauss()*devSd), timing: gauss()*.25*.15, rel: Math.max(.2, .5 + gauss()*relSd/2) }); if (zoneAC(r)) ok++;
  }
  console.log(`${nm}: angolo corto con il gesto ${(100*ok/N).toFixed(0)}% · senza il gesto (incrociato normale) ${(100*un/N).toFixed(1)}%`);
}
let worstF = 0, worstD = 0;
for (let rel = .3; rel < 1.2; rel += .01){ for (const d of [18, 20, 22.6, 24]){ const a = finale({ dev: -d, timing: 0, rel }).depth, b = finale({ dev: -d, timing: 0, rel: rel + .0714 }).depth; worstF = Math.max(worstF, Math.abs(b - a)); } }
for (let d = 10; d < 45; d += .25){ for (const rel of [.4, .5, .6]){ const a = finale({ dev: -d, timing: 0, rel }).depth, b = finale({ dev: -(d + 1), timing: 0, rel }).depth; worstD = Math.max(worstD, Math.abs(b - a)); } }
console.log(`profondità: salto massimo per 0,05 di forza (≈ 0,07 di gesto relativo) ${worstF.toFixed(2)} m · per 1 grado di cima ${worstD.toFixed(2)} m`);

console.log('\n== 6. tempo: solo tempo e tempo contro cima (Pro, dal centro, dritto del destro: − = incrociato) ==');
const spanP = NO.directionSpan(lvOf('pro')), lateP = lateOf(lvOf('pro'), 18);
for (const [d, nm] of [[0, 'cima dritta'], [-17, 'cima incrociata piena'], [17, 'cima lungolinea piena'], [-8, 'cima incrociata 8°']]){
  const row = [['anticipo pieno', spanP], ['a tempo', 0], ['ritardo pieno', -lateP]].map(([w, tm]) => `${w} ${fmt(finale({ dev: d, timing: tm }).x)}`);
  const rowT = [['anticipo pieno', spanP], ['a tempo', 0], ['ritardo pieno', -lateP]].map(([w, tm]) => `${w} ${fmt(.72 + .86*(today({ dev: d, timing: tm }).x - .72))}`);
  console.log(`${nm.padEnd(22)} finale: ${row.join(' · ')}\n${''.padEnd(22)} oggi:   ${rowT.join(' · ')}`);
}

console.log('\n== 7. Leggenda in corsa (q 0,75) e Pro: matrice incrociato / centro / lungolinea, giro insegnato 15° ==');
const NOISE = { buono: { face: 5, tm: 0, ts: .25 }, vero: { face: 12, tm: .35, ts: .45 } };
function matrix(fn, air, { k, q, noise }){
  const lv = lvOf(k), span = NO.directionSpan(lv), late = clamp(lateOf(lv, 18), .04, span), M = NOISE[noise];
  let ok = 0, fu = 0, n = 0;
  for (const [w, s] of [['in', -1], ['ce', 0], ['lu', 1]]) for (let i = 0; i < 3000; i++){
    const dev = s*15 + gauss()*M.face, u = M.tm + gauss()*M.ts, timing = u >= 0 ? u*span : u*late;
    const r = fn({ dev, timing, c: 1, hitX: .72, q, k }), xb = air ? .72 + .86*(r.x - .72) : r.x; n++;
    if (out(xb, r.depth)) { fu++; continue; }
    const b = Math.abs(xb) < 1.25 ? 'ce' : xb < 0 ? 'in' : 'lu'; if (b === w) ok++;
  }
  return `giusti ${Math.round(100*ok/n)}% fuori ${(100*fu/n).toFixed(1)}%`;
}
for (const k of ['evento', 'pro', 'leggenda']) for (const q of [1, .75]) for (const noise of ['buono', 'vero'])
  console.log(`${k} q${q} ${noise.padEnd(6)}: oggi ${matrix(today, true, { k, q, noise })} · finale ${matrix(finale, false, { k, q, noise })}`);
