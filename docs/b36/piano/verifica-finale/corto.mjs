// Angolo corto continuo: rampa della forza relativa più dolce e pendenza della sola parte aggiunta. Sola lettura.
const root = process.argv[2];
const NO = await import(`${root}/src/natpf/natpf_stroke_outcome.js`);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a)*clamp(u);
let seed = 4242; const rnd = () => ((seed = (seed*1103515245 + 12345) >>> 0)/4294967296);
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rnd()); };
const P = 17, cimaU = d => { const r = Math.max(0, Math.abs(d) - 3)/(P - 3); return r <= 1.6 ? r : Math.abs(d) <= 45 ? 1.6 - .6*(Math.abs(d) - 25.4)/19.6 : 1; };
const powerOf = rel => { const abs = clamp((700*rel - 250)/1100); return clamp(.5*abs + .5*clamp(.6 + .9*(rel - 1))); };
function depthOf(dev, rel, { r0 = .7, rs = .25, c0 = 1.1, cs = .5, use = true } = {}){
  const u = Math.min(1.6, cimaU(dev)), x = -Math.min(4, u <= 1 ? 3.2*u : 3.2 + .8*(u - 1)/.6), power = powerOf(rel);
  let depth = lerp(6.2, 11.5, Math.pow(power*.96, .7));
  const HZ = 11.4, along = HZ + depth, side = x - .72; if (along > Math.abs(side)) depth = Math.sqrt(along*along - side*side) - HZ;
  const w = use ? clamp((u - c0)/cs)*clamp((r0 - rel)/rs) : 0;
  return { depth: depth - Math.max(0, depth - 5.8)*.8*w, x, power };
}
for (const [nm, o] of [['rampa 0,7→0,45', { r0: .7, rs: .25 }], ['rampa 0,75→0,35', { r0: .75, rs: .4 }], ['rampa 0,8→0,4', { r0: .8, rs: .4 }], ['rampa 0,8→0,4 e cima da 1,2 a 1,6 (proposta R7)', { r0: .8, rs: .4, c0: 1.2, cs: .4 }]]){
  // pendenza della sola parte aggiunta (con − senza) per 0,05 di forza, e totale
  let addF = 0, totF = 0, totToday = 0;
  for (let rel = .25; rel < 1.3; rel += .005) for (const d of [16, 18, 20, 22.6, 25]){
    const a = depthOf(d, rel, o), pa = a.power; let rel2 = rel; while (powerOf(rel2) < pa + .05 && rel2 < 2) rel2 += .001;
    const b = depthOf(d, rel2, o), a0 = depthOf(d, rel, { ...o, use: false }), b0 = depthOf(d, rel2, { ...o, use: false });
    addF = Math.max(addF, Math.abs((b.depth - b0.depth) - (a.depth - a0.depth))); totF = Math.max(totF, Math.abs(b.depth - a.depth)); totToday = Math.max(totToday, Math.abs(b0.depth - a0.depth));
  }
  let addD = 0; for (let d = 10; d < 45; d += .25) for (const rel of [.35, .45, .55, .65]){ const a = depthOf(d, rel, o).depth, b = depthOf(d + 1, rel, o).depth, a0 = depthOf(d, rel, { ...o, use: false }).depth, b0 = depthOf(d + 1, rel, { ...o, use: false }).depth; addD = Math.max(addD, Math.abs((b - b0) - (a - a0))); }
  // voluto e non voluto (zona 4,5–7 m, oltre 2,6 m di lato), persona vera: cima ±12°, gesto relativo ±0,3 (voluto 0,5 ± 0,15)
  let un = 0, ok = 0, unB = 0, okB = 0, N = 20000;
  for (let i = 0; i < N; i++){
    let r = depthOf(-(15 + gauss()*12), Math.max(.2, 1 + gauss()*.3), o); if (-r.x > 2.6 && r.depth >= 4.5 && r.depth <= 7) un++;
    r = depthOf(-(22.6 + gauss()*12), Math.max(.2, .5 + gauss()*.15), o); if (-r.x > 2.6 && r.depth >= 4.5 && r.depth <= 7) ok++;
    r = depthOf(-(15 + gauss()*5), Math.max(.2, 1 + gauss()*.15), o); if (-r.x > 2.6 && r.depth >= 4.5 && r.depth <= 7) unB++;
    r = depthOf(-(22.6 + gauss()*5), Math.max(.2, .5 + gauss()*.1), o); if (-r.x > 2.6 && r.depth >= 4.5 && r.depth <= 7) okB++;
  }
  console.log(`${nm}: parte aggiunta ≤ ${addF.toFixed(2)} m per 0,05 di forza e ≤ ${addD.toFixed(2)} m per grado · totale ${totF.toFixed(2)} m (oggi, senza angolo corto, fino a ${totToday.toFixed(2)} m) · gesto buono: voluto ${(100*okB/N).toFixed(0)}% non voluto ${(100*unB/N).toFixed(1)}% · persona vera: voluto ${(100*ok/N).toFixed(0)}% non voluto ${(100*un/N).toFixed(1)}%`);
}
