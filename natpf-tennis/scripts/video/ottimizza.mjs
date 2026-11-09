// Ottimizzatore delle coreografie dal video (B17.1 passo B2, decisione dell'utente del 09/11 sera: «ottimizza senza di me»,
// scelta B di docs/b17/posa-dal-video.md §4). Tiene la FORMA del gesto del video (traiettoria della mano, altezze di carica e
// di fine, braccio, busto, tempi dove si può) e cerca il polso (pronosupinazione, flessione, deviazione) alle pose chiave,
// piccoli scarti di busto, spalla e gomito (entro ±12°) e i tempi (parte veloce 0,18–0,32 s, frenata, carica, fermo finale)
// con il RILEVATORE VERO nel costo: il telefono simulato completo (test/pose-sensors.mjs → test/phone-sim.mjs) legge la
// coreografia con la calibrazione del braccio simulato e con quella fatta con il dritto e il rovescio dell'animazione, destro
// e mancino, a 0,8× / 1× / 1,25×. Costo = 50 × errori di lettura (judgeCard: un colpo solo, tipo e lato giusti, picco =
// contatto ± 1 campione; servizio: lancio + battuta) + scarto dalla forma del video + 30 × vincoli fisici del B13 (limiti
// articolari, velocità e accelerazioni articolari, collisioni con busto e testa, una sola frenata, sequenza prossimo-distale,
// telefono non di taglio nelle pose chiave per la camera della scheda).
// Ricerca: strategia evolutiva (1+λ) con passo per variabile e regola del successo (le letture sono a gradini: Nelder–Mead
// puro si ferma sui pianori), più partenze; il migliore è scritto in <out>/<id>.json a ogni miglioramento (si riprende con
// --from). Scarto dalla forma del video misurato in cm (mano e gomito alle pose chiave, traiettoria della mano a tempo
// normalizzato), gradi (cima e schermo del telefono contro quelli ricostruiti dal video, a bassa confidenza) e secondi.
//
// Uso (dalla cartella natpf-tennis; il JSON del video è docs/b17/gesti-video.json del repository):
//   node --import ./test/register.mjs scripts/video/ottimizza.mjs --card=forehand --out=DIR [--evals=1500] [--seed=1]
//     [--with=DIR] [--from=FILE] [--also=flat,volley] [--report]
// --with=DIR: soluzioni già trovate per le altre schede (DIR/<id>.json): il dritto e il rovescio servono alla calibrazione
//   «con l'animazione»; senza, valgono le coreografie del codice (CHOREO_VIDEO). --also: schede di CHOREO (oggi) da leggere
//   anche loro con la calibrazione dell'animazione (il dritto e il rovescio nuovi la cambiano). --report: valuta e stampa la
//   soluzione di --from (o la coreografia del codice) senza cercare.
import fs from 'node:fs';
import path from 'node:path';
import * as GP from '../../src/natpf/natpf_gesture_pose.js';
import { GESTURES } from '../../src/natpf/natpf_gesture_motion.js';
import { readCard, judgeCard } from '../../test/pose-sensors.mjs';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : (process.argv.includes(`--${k}`) ? true : d); };
const CARD = arg('card', 'forehand'), OUT = arg('out', '/tmp/ottimizza'), EVALS = +arg('evals', 1500), SEED = +arg('seed', 1);
const WITH = arg('with', null), FROM = arg('from', null), ALSO = (arg('also', '') || '').split(',').filter(Boolean), REPORT = !!arg('report', false);
const DATA = JSON.parse(fs.readFileSync(new URL('../../../docs/b17/gesti-video.json', import.meta.url), 'utf8'));
const { D, JOINTS, JOINT_LIMITS, len, sub, add, mul, dot, norm, qrot, qconj, qmul, omega } = GP;
const GRIP = 'racchetta';

/* ---------- riferimento: il gesto misurato nel video ---------- */
export const REF_OF = Object.freeze({ forehand: 'forehand', backhand: 'backhand', slice: 'slice2', sliceBackhand: 'slice1', serve: 'serve2', cross: 'forehand', line: 'forehand' });
export function videoRef(id){
  const c = DATA.colpi.find(x => x.id === REF_OF[id]); if (!c) return null;
  const S = c.campioni;
  const rel = s => { const b = s.busto.bacino; const o = [b[0], 0, b[2]]; return { t: s.t, W: sub(s.W, o), E: sub(s.E, o), tip: s.telefono.cima, screen: s.telefono.schermo, j: s.j }; };
  const R = S.map(rel);
  const at = t => { let i = 0; while (i < R.length - 2 && R[i + 1].t < t) i++; const a = R[i], b = R[i + 1], u = Math.max(0, Math.min(1, (t - a.t)/(b.t - a.t)));
    return { t, W: GP.lerp(a.W, b.W, u), E: GP.lerp(a.E, b.E, u), tip: norm(GP.lerp(a.tip, b.tip, u)), screen: norm(GP.lerp(a.screen, b.screen, u)), j: u < .5 ? a.j : b.j }; };
  const T = c.tempi, keys = c.battuta ? { carica: T.carica, alto: c.battuta.t_arrivo_in_alto, impatto: T.impatto, fine: T.fine } : { carica: T.carica, impatto: T.impatto, fine: T.fine };
  return { id: c.id, keys, at, times: T };
}

/* ---------- variabili ---------- */
const ARMK = ['tau', 'p', 'e', 'r', 'b'], WRK = ['pro', 'fl', 'dv'], ARM_D = 12;
const keysOf = id => id === 'serve' ? ['P', 'U', 'C', 'F'] : ['B', 'C', 'F'];
const TIMES = { stroke: { acc: [.18, .32, .03], dMax: [.12, .35, .04], prep: [.6, 2.2, .25], fin: [.15, .4, .05] },
  serve: { prep: [.4, 1.6, .15], rise: [.2, .4, .04], up: [.1, .5, .06], acc: [.15, .3, .03], dMax: [.15, .4, .05], fin: [.15, .4, .05] } };
const LAG = Object.freeze({ tau: .045, lat: .045, y: .045, p: .022, e: .022, r: .01 });
// variabili di una scheda: [{ name, lo, hi, s (passo iniziale), get(base) }]
function varsFor(id, base){
  const V = [];
  if (base.aimOnly){
    for (const [k, lo, hi, s] of [['tau', -30, 30, 6], ['r', -25, 25, 6], ['pro', -30, 30, 8], ['fl', -25, 25, 6]]) V.push({ name: `aim.${k}`, lo, hi, s, x0: base.aim?.[k] ?? 0 });
    return V;
  }
  for (const K of keysOf(id)){
    for (const k of ARMK) V.push({ name: `${K}.d${k}`, lo: -ARM_D, hi: ARM_D, s: 4, x0: 0 });
    for (const k of WRK){ const [lo, hi] = JOINT_LIMITS[k]; V.push({ name: `${K}.${k}`, lo: lo + 1, hi: hi - 1, s: k === 'pro' ? 25 : 12, x0: base[K][k] }); }
  }
  for (const [k, [lo, hi, s]] of Object.entries(TIMES[id === 'serve' ? 'serve' : 'stroke'])) V.push({ name: `t.${k}`, lo, hi, s, x0: Math.min(hi, Math.max(lo, base.t?.[k] ?? (lo + hi)/2)) });
  return V;
}
const clampV = (v, x) => Math.min(v.hi, Math.max(v.lo, x));
const clampJ = (k, x) => { const [lo, hi] = JOINT_LIMITS[k]; return k === 'y' ? Math.min(hi, Math.max(lo, x)) : Math.min(hi - .5, Math.max(lo + .5, x)); };
// vettore → coreografia (stesso formato di CHOREO_VIDEO)
function decode(id, base, V, x){
  const val = Object.fromEntries(V.map((v, i) => [v.name, clampV(v, x[i])]));
  if (base.aimOnly){
    const aim = { tau: val['aim.tau'], r: val['aim.r'], pro: val['aim.pro'], fl: val['aim.fl'] };
    return { ...base.fore, aim, tC: null, src: `${base.fore.src} girato (mira ${id})` };
  }
  const keys = {};
  for (const K of keysOf(id)){
    const J = { ...base[K] };
    for (const k of ARMK) J[k] = clampJ(k, base[K][k] + val[`${K}.d${k}`]);
    for (const k of WRK) J[k] = clampJ(k, val[`${K}.${k}`]);
    keys[K] = Object.fromEntries(JOINTS.map(k => [k, +(+J[k]).toFixed(k === 'y' ? 4 : 2)]));
  }
  const t = Object.fromEntries(Object.keys(TIMES[id === 'serve' ? 'serve' : 'stroke']).map(k => [k, +val[`t.${k}`].toFixed(3)]));
  if (id === 'serve'){
    const hold = .4, contact = hold + t.prep + t.rise + t.up + t.acc;
    return { src: base.src, kind: 'serve', times: base.times, hold, prep: t.prep, rise: t.rise, up: t.up, acc: t.acc, contact: +contact.toFixed(4), dMin: t.dMax, dMax: t.dMax,
      fin: t.fin, back: 2, backFlat: .3, cycle: +(contact + t.dMax + .1 + t.fin + 2 + .3).toFixed(3), riseWrist: .15, lag: LAG, ...keys };
  }
  const contact = .35 + t.prep + t.acc;
  return { src: base.src, times: base.times, contact: +contact.toFixed(4), cycle: +(contact + t.dMax + .1 + t.fin + 2 + .3).toFixed(3), prep: t.prep, acc: t.acc, crisp: 1,
    dMin: t.dMax, dMax: t.dMax, fin: t.fin, back: 2, backFlat: .3, lag: LAG, ...keys };
}

/* ---------- piani e sorgente per il telefono simulato ---------- */
export const planOf = (id, choreo) => GP.planFrom(GP.motionFrom(id, choreo, { rest: GP.REST_VIDEO, set: 'video' }), GRIP);
const wrapT = (P, t) => ((t % P.total) + P.total) % P.total;
function sourceWith(plans){
  return { name: 'ottimizzatore', plan: id => plans[id] || GP.gesturePlan(id, { grip: GRIP }),
    pose: (id, t, hand = 'right') => { const P = plans[id] || GP.gesturePlan(id, { grip: GRIP }), p = P.raw(wrapT(P, t)); return hand === 'left' ? GP.mirrorPose(p) : p; } };
}
const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], sliceBackhand: ['drop'], flat: ['topspin'] })[id] || null : null;
const COMBOS = [];
for (const cal of ['arm', 'pose']) for (const rate of [1, .8, 1.25]) for (const hand of ['right', 'left']) COMBOS.push({ cal, rate, hand });
// lettura di una scheda con tutte le combinazioni; stop: si ferma dopo tanti errori (gli altri contano come sbagliati)
export function readAll(src, id, { stop = Infinity, combos = COMBOS } = {}){
  const out = []; let bad = 0;
  for (const c of combos){
    if (bad >= stop){ out.push({ ...c, why: ['(non letto)'], skipped: true }); continue; }
    let why, r = null;
    try { r = readCard(src, id, c); why = judgeCard(src, id, r, { hand: c.hand, rate: c.rate, allow: allowFor(id, c.rate) }); }
    catch (e){ why = ['ERRORE ' + e.message.slice(0, 120)]; }
    const desc = r ? (r.kind === 'serve' ? `${r.events.length} gesti` : r.read.map(x => x.ev.natpf.shot + (x.ev.side ? '/' + x.ev.side : '') + (x.ev.natpf.wrist != null && GESTURES[id]?.aim ? ` mira ${(+x.ev.natpf.wrist).toFixed(2)}` : '')).join(' + ')) : '';
    if (why.length) bad++;
    out.push({ ...c, why, desc, dPeak: r?.dPeak ?? null });
  }
  return out;
}

/* ---------- scarto dalla forma del video ---------- */
function keyTimes(P){
  const T = P.T;
  if (P.kind === 'serve') return { carica: T.load, alto: T.tossEnd, impatto: T.contact, fine: T.back - (P.choreo?.fin || 0) };
  return { carica: T.inv, impatto: T.contact, fine: T.back - (P.choreo?.fin || 0) };
}
const angDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b)))))/D;
export function shapeOf(id, P, ref){
  const K = keyTimes(P), raw = t => P.raw(t), out = { keys: {}, path: null };
  for (const [k, tv] of Object.entries(ref.keys)){
    if (K[k] == null) continue;
    const p = raw(K[k]), r = ref.at(tv), tip = qrot(p.q, [0, 1, 0]), sc = qrot(p.q, [0, 0, 1]);
    out.keys[k] = { dW: len(sub(p.chain.W, r.W))*100, dE: len(sub(p.chain.E, r.E))*100, dy: (p.chain.W[1] - r.W[1])*100, tip: angDeg(tip, r.tip), screen: angDeg(sc, r.screen),
      W: p.chain.W, Wref: r.W, elbow: p.chain.j.b };
  }
  // traiettoria della mano a tempo normalizzato tra le pose chiave consecutive
  const names = Object.keys(ref.keys).filter(k => K[k] != null); let sum = 0, n = 0, mx = 0;
  for (let i = 1; i < names.length; i++){
    const a = names[i - 1], b = names[i];
    for (let s = 0; s <= 10; s++){ const u = s/10, p = raw(K[a] + (K[b] - K[a])*u), r = ref.at(ref.keys[a] + (ref.keys[b] - ref.keys[a])*u), d = len(sub(p.chain.W, r.W))*100; sum += d; n++; mx = Math.max(mx, d); }
  }
  out.path = { mean: sum/n, max: mx };
  out.cLag = P.T.nominal != null ? P.T.nominal - P.T.contact : null;
  out.times = Object.fromEntries(names.slice(1).map((k, i) => [`${names[i]}→${k}`, { anim: K[k] - K[names[i]], video: ref.keys[k] - ref.keys[names[i]] }]));
  return out;
}
function shapeCost(sh){
  let c = 0;
  // l'impatto pesa di più: è la posa che la scritta «Impatto» mostra nell'istante del picco letto dal telefono
  for (const [n, k] of Object.entries(sh.keys)) c += (k.dW/(n === 'impatto' ? 2.5 : 4))**2 + .5*(k.dE/8)**2 + .3*(k.tip/25)**2 + .3*(k.screen/25)**2;
  c += (sh.path.mean/5)**2;
  // la posa C (impatto del video) cade nel picco letto: scarto di tempo tra l'istante nominale di C e il contatto
  if (sh.cLag != null) c += (sh.cLag/.03)**2;
  return c;
}

/* ---------- vincoli fisici (B13) ---------- */
export function physicsOf(id, P){
  const T = P.T, bad = [], p = t => P.raw(t), W = t => p(t).chain.W;
  let lim = 0;
  for (let t = 0; t < P.total; t += 1/120){ const j = P.ang(t); for (const [k, [a, b]] of Object.entries(JOINT_LIMITS)){ const e = j[k] < a ? a - j[k] : j[k] > b ? j[k] - b : 0; if (e > 1e-9){ lim += k === 'y' ? e*100 : e; } } }
  if (lim > 0) bad.push(['limiti', lim]);
  // velocità e accelerazioni articolari (≤ 2000 °/s, ≤ 40 000 °/s²) nella parte veloce
  const h = 1/1200; let vx = 0;
  for (let t = Math.max(h, (T.inv ?? T.load) - .1); t < Math.min(P.total - h, T.back + .05); t += 1/600){
    const a = P.ang(t - h), b = P.ang(t), c = P.ang(t + h);
    for (const k of JOINTS){ if (k === 'y') continue; const acc = Math.abs(a[k] - 2*b[k] + c[k])/(h*h), v = Math.abs(c[k] - a[k])/(2*h); vx += Math.max(0, acc - 38000)/2000 + Math.max(0, v - 1900)/100; }
  }
  if (vx > 0) bad.push(['velocità articolari', vx]);
  // collisioni con busto e testa (come natpf-gesture-physics)
  let col = 0;
  for (let t = 0; t < P.total; t += 1/60){
    const q = p(t), c = q.chain, r = GP.gestureRig({ ...q, hand: 'right' }, { grip: GRIP }), hd = add(c.pelvis, qrot(c.trunk, GP.BODY.head));
    const loc = X => qrot(qconj(c.trunk), sub(X, c.pelvis));
    const pts = [...[0, .25, .5, .75, 1].map(u => ['avambraccio', add(c.W, mul(sub(c.E, c.W), u)), .03]), ['gomito', c.E, .035],
      ...r.fingers.map(f => ['dito', f.pts[3], .008]), ['cima', r.phone.tip, .01], ['base', r.phone.base, .01], ['telefono', q.pos, .01]];
    for (const [nm, X, rr] of pts){
      const l = loc(X), m = .01;
      if (nm !== 'gomito' && l[1] > -.1 && l[1] < .45){ const e = (l[0]/(.16 + rr + m))**2 + (l[2]/(.11 + rr + m))**2; if (e < 1) col += 1 - e + .2; }
      const dh = len(sub(X, hd)) - (GP.BODY.headR + rr + m); if (dh < 0) col += -dh*20 + .2;
    }
  }
  if (col > 0) bad.push(['collisioni', col]);
  // una sola frenata dopo l'impatto (mano ≤ 0,3 m/s, telefono ≤ 40 °/s: margini 0,22 e 30)
  const vel = t => len(mul(sub(W(t + .002), W(t - .002)), 1/.004)), wsp = t => len(omega(p(t - 1/960).q, p(t + 1/960).q, 1/480));
  let mn = Infinity, up = 0, wmn = Infinity, wup = 0;
  for (let t = P.contact; t <= T.back; t += 1/240){ const s = vel(t); mn = Math.min(mn, s); up = Math.max(up, s - mn); const w = wsp(t); wmn = Math.min(wmn, w); wup = Math.max(wup, w - wmn); }
  if (up > .22 || wup > 30) bad.push(['frenata', Math.max(0, up - .22)*10 + Math.max(0, wup - 30)/10]);
  // sequenza prossimo-distale (colpi): busto prima della mano, omero e avambraccio non dopo; picco della mano al contatto
  if (P.kind === 'stroke'){
    const seg = k => { let m = 0, at = 0; const hh = 1/600; for (let t = P.contact - .3; t <= P.contact + .1; t += hh){ const w = len(omega(p(t).chain[k], p(t + hh).chain[k], hh)); if (w > m){ m = w; at = t + hh/2; } } return at - P.contact; };
    const tr = seg('trunk'), ha = seg('hand'), upA = seg('upper'), fo = seg('fore');
    let s = 0; if (Math.abs(ha) > 1/300) s += Math.abs(ha)*100; if (!(tr < ha - .006)) s += (tr - ha + .006)*100 + .5; if (upA > ha + .002) s += (upA - ha)*100 + .5; if (fo > ha + .002) s += (fo - ha)*100 + .5;
    if (s > 0) bad.push(['sequenza', s]);
  }
  // carica lenta (B13: il telefono gira sotto ~150 °/s fino alla carica, sotto la soglia dei colpi speciali della calibrazione
  // rapida) e una sola valle della velocità del telefono prima del colpo (niente «colpo in due tempi»)
  const wq = t => len(omega(p(t - 1/480).q, p(t + 1/480).q, 1/240));
  const t1 = P.kind === 'serve' ? T.load : T.inv - .04;
  let cap = 0; for (let t = T.hold; t < t1; t += 1/120) cap = Math.max(cap, wq(t));
  if (cap > 140) bad.push(['carica veloce', (cap - 140)/20]);
  if (P.kind === 'stroke'){
    let mx = 0, drop = 0; for (let t = T.inv; t <= P.contact; t += 1/240){ const w = wq(t); mx = Math.max(mx, w); drop = Math.max(drop, mx - w); }
    const pk = wq(P.contact); if (drop > .25*pk) bad.push(['valle nel colpo', (drop - .25*pk)/50]);
  }
  // telefono non di taglio nelle pose chiave (≥ 25° dalla linea di vista: margine 30°) per la camera della scheda
  const cam = GP.CAMERAS_VIDEO?.[id] || GP.CAMERAS[id];
  if (cam?.dir){
    const KT = P.kind === 'serve' ? [T.tossEnd, T.hitStart, T.contact] : [T.inv, T.contact, T.back - .004];
    let e = 0; for (const t of KT){ const q = p(t), n = qrot(q.q, [0, 0, 1]), v = norm(cam.dir); const a = Math.asin(Math.min(1, Math.abs(dot(n, v))))/D; if (a < 30) e += (30 - a)/5; }
    if (e > 0) bad.push(['di taglio', e]);
  }
  return bad;
}
const physCost = bad => bad.reduce((s, [, v]) => s + Math.min(50, v), 0);

/* ---------- costo ---------- */
function loadSol(file){ try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function basePlans(){
  const plans = {};
  if (WITH) for (const k of ['forehand', 'backhand', 'slice', 'sliceBackhand', 'serve']){ const s = loadSol(path.join(WITH, `${k}.json`)); if (s?.choreo) plans[k] = planOf(k, s.choreo); }
  for (const k of ['forehand', 'backhand']) if (!plans[k]) plans[k] = GP.gesturePlan(k, { grip: GRIP, set: 'video' });
  return plans;
}
export function evaluate(id, choreo, { plans = basePlans(), stop = 3, also = ALSO, ref = videoRef(id) } = {}){
  let P;
  try { P = planOf(id, choreo); } catch (e){ return { cost: 1e6, err: e.message }; }
  P.choreo = choreo;
  const src = sourceWith({ ...plans, [id]: P });
  const phys = physicsOf(id, P), sh = ref ? shapeOf(id, P, ref) : null;
  const reads = readAll(src, id, { stop });
  let alsoReads = [];
  for (const a of also) alsoReads.push(...readAll(src, a, { stop: 2, combos: COMBOS.filter(c => c.cal === 'pose') }).map(r => ({ ...r, card: a })));
  const rc = r => r.why.length ? 20 + 4*r.why.length + (r.dPeak != null ? Math.min(20, Math.abs(r.dPeak)/30) : 20) : 0;
  const read = reads.reduce((s, r) => s + rc(r), 0) + alsoReads.reduce((s, r) => s + rc(r), 0);
  const cost = 50*read + (sh ? shapeCost(sh) : 0) + 30*physCost(phys);
  return { cost, read, nBad: reads.filter(r => r.why.length).length + alsoReads.filter(r => r.why.length).length, reads, alsoReads, phys, shape: sh, P };
}

/* ---------- partenza: la coreografia del video con la presa misurata ---------- */
// polso alle pose chiave risolto perché cima e schermo del telefono siano quelli ricostruiti dal video (con la presa del video)
function wristFor(J, tip, screen){
  let best = null;
  const f = w => { const j = { ...J, pro: w[0], fl: w[1], dv: w[2] }; let c = 0; for (const k of WRK){ const [a, b] = JOINT_LIMITS[k]; if (j[k] < a) c += (a - j[k])**2; if (j[k] > b) c += (j[k] - b)**2; }
    const q = qmul(GP.armChain(j).hand, GP.gripInHand(GRIP)); return c*.1 + angDeg(qrot(q, [0, 1, 0]), tip)**2 + angDeg(qrot(q, [0, 0, 1]), screen)**2; };
  for (const pro of [10, 50, 90, 130, 165]) for (const fl of [-50, 0, 40]) for (const dv of [-20, 5]){ const w = [pro, fl, dv], v = f(w); if (!best || v < best.v) best = { w, v }; }
  for (let st = 16; st >= .25; st /= 2) for (let it = 0; it < 30; it++){ let moved = false; for (let k = 0; k < 3; k++) for (const s of [-1, 1]){ const w = best.w.slice(); w[k] += s*st; const v = f(w); if (v < best.v){ best = { w, v }; moved = true; } } if (!moved) break; }
  return { pro: +best.w[0].toFixed(1), fl: +best.w[1].toFixed(1), dv: +best.w[2].toFixed(1), err: Math.sqrt(best.v/2) };
}
export function rawVideoChoreo(id){
  const c = GP.CHOREO_VIDEO_GREZZA?.[id] || GP.CHOREO_VIDEO[id], ref = videoRef(id), out = { ...c }, map = id === 'serve' ? { P: 'carica', U: 'alto', C: 'impatto', F: 'fine' } : { B: 'carica', C: 'impatto', F: 'fine' };
  for (const [K, k] of Object.entries(map)){ const r = ref.at(ref.keys[k]); const w = wristFor({ ...GP.REST_VIDEO, ...c[K] }, r.tip, r.screen); out[K] = { ...c[K], pro: w.pro, fl: w.fl, dv: w.dv }; }
  return out;
}

/* ---------- ricerca ---------- */
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; }; }
const gauss = R => { const u = Math.max(1e-12, R()), v = R(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
function summary(e){
  const sh = e.shape;
  return { cost: +e.cost.toFixed(2), nBad: e.nBad, read: e.reads?.filter(r => r.why.length).map(r => `${r.cal} ${r.hand} ×${r.rate}: ${r.why.join('; ')} [${r.desc}]`),
    also: e.alsoReads?.filter(r => r.why.length).map(r => `${r.card} ${r.hand} ×${r.rate}: ${r.why.join('; ')}`),
    phys: e.phys, shape: sh && { keys: Object.fromEntries(Object.entries(sh.keys).map(([k, v]) => [k, { dW_cm: +v.dW.toFixed(1), dE_cm: +v.dE.toFixed(1), dy_cm: +v.dy.toFixed(1), tip_deg: +v.tip.toFixed(0), screen_deg: +v.screen.toFixed(0), gomito: +v.elbow.toFixed(0) }])),
      path_cm: { mean: +sh.path.mean.toFixed(1), max: +sh.path.max.toFixed(1) }, times: Object.fromEntries(Object.entries(sh.times).map(([k, v]) => [k, { anim: +v.anim.toFixed(3), video: +v.video.toFixed(3) }])) } };
}
async function main(){
  fs.mkdirSync(OUT, { recursive: true });
  const plans = basePlans(), R = rng(SEED), logf = path.join(OUT, `${CARD}.log`);
  const log = s => { fs.appendFileSync(logf, s + '\n'); console.log(s); };
  let base;
  if (CARD === 'cross' || CARD === 'line'){
    const fore = WITH && loadSol(path.join(WITH, 'forehand.json'))?.choreo || GP.CHOREO_VIDEO.forehand;
    base = { aimOnly: true, fore, aim: GP.AIM_TURN_VIDEO?.[CARD] };
  } else {
    const raw = rawVideoChoreo(CARD);
    base = { ...raw, t: id => null };
    base.t = CARD === 'serve' ? { prep: raw.prep, rise: raw.rise, up: raw.up, acc: .25, dMax: raw.dMax, fin: raw.fin } : { acc: .25, dMax: Math.max(.12, raw.dMax), prep: raw.prep, fin: raw.fin };
  }
  const V = varsFor(CARD, base);
  let x = V.map(v => v.x0);
  const from = FROM && loadSol(FROM);
  if (from?.x && from.x.length === V.length) x = from.x;
  const ev = xx => evaluate(CARD, decode(CARD, base, V, xx), { plans });
  let cur = ev(x), best = { x, e: cur };
  log(`[${new Date().toISOString()}] ${CARD}: partenza costo ${cur.cost.toFixed(2)} errori ${cur.nBad} ${JSON.stringify(summary(cur))}`);
  const save = () => fs.writeFileSync(path.join(OUT, `${CARD}.json`), JSON.stringify({ id: CARD, x: best.x, vars: V.map(v => v.name), choreo: decode(CARD, base, V, best.x), ...summary(best.e) }, null, 1));
  save();
  if (REPORT) return;
  // (1+λ)-ES con passo per variabile
  let sigma = .6, evals = 1, fails = 0;
  const lambda = 8;
  while (evals < EVALS){
    let gen = null;
    for (let i = 0; i < lambda && evals < EVALS; i++){
      const xx = best.x.map((v, k) => clampV(V[k], v + sigma*V[k].s*gauss(R)*(R() < Math.max(.25, 6/V.length) ? 1 : 0)));
      const e = ev(xx); evals++;
      if (!gen || e.cost < gen.e.cost) gen = { x: xx, e };
    }
    if (gen && gen.e.cost < best.e.cost){
      best = gen; sigma = Math.min(1.5, sigma*1.25); fails = 0; save();
      log(`[${evals}] costo ${best.e.cost.toFixed(2)} errori ${best.e.nBad} σ ${sigma.toFixed(2)} lettura ${best.e.read.toFixed(1)} fisica ${physCost(best.e.phys).toFixed(2)} forma ${best.e.shape ? shapeCost(best.e.shape).toFixed(2) : '-'}`);
    } else {
      sigma *= .88; fails++;
      if (sigma < .04){ sigma = .8; log(`[${evals}] ripartenza del passo`); }
    }
  }
  log(`FINE ${CARD}: ${JSON.stringify(summary(best.e))}`);
}
// --emit=DIR: stampa CHOREO_VIDEO e AIM_TURN_VIDEO da incollare in natpf_gesture_pose.js (tC risolto e scritto, come CHOREO)
function emit(dir){
  const lit = o => '{ ' + Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'number' ? +v.toFixed(k === 'y' ? 4 : 3) : JSON.stringify(v)}`).join(', ') + ' }';
  const lines = [];
  for (const id of ['forehand', 'backhand', 'slice', 'sliceBackhand', 'serve']){
    const s = loadSol(path.join(dir, `${id}.json`)); if (!s) continue;
    const c = { ...s.choreo }; delete c.tC;
    const tC = GP.motionFrom(id, c, { rest: GP.REST_VIDEO, set: 'video' }).T.nominal;
    const head = Object.entries(c).filter(([k]) => !['B', 'C', 'F', 'P', 'U', 'lag', 'times', 'src'].includes(k)).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
    lines.push(`  ${id}: Object.freeze({ src: ${JSON.stringify(c.src)}, times: ${JSON.stringify(c.times)}, tC: ${+tC.toFixed(6)}, ${head}, lag: LAG,`);
    const K = id === 'serve' ? ['P', 'U', 'C', 'F'] : ['B', 'C', 'F'];
    lines.push(K.map(k => `    ${k}: ${lit(c[k])}`).join(',\n') + ' }),');
  }
  console.log('export const CHOREO_VIDEO = Object.freeze({\n' + lines.join('\n') + '\n});');
  const aims = ['cross', 'line'].map(id => [id, loadSol(path.join(dir, `${id}.json`))]).filter(([, s]) => s);
  if (aims.length) console.log('export const AIM_TURN_VIDEO = Object.freeze({ ' + aims.map(([id, s]) => `${id}: Object.freeze(${lit(Object.fromEntries(Object.entries(s.choreo.aim).map(([k, v]) => [k, +v.toFixed(2)])))})`).join(', ') + ' });');
}
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('ottimizza.mjs')){ if (arg('emit', null)) emit(arg('emit')); else main(); }
