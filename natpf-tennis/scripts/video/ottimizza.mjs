// Ottimizzatore delle coreografie dal video (B17.1 passo B2, decisione dell'utente del 09/11 sera: «ottimizza senza di me»,
// scelta B di docs/b17/posa-dal-video.md §4). Tiene la FORMA del gesto del video (traiettoria della mano, altezze di carica e
// di fine, braccio, busto, tempi dove si può) e cerca il polso (pronosupinazione, flessione, deviazione) alle pose chiave,
// piccoli scarti di busto, spalla e gomito (entro ±12°) e i tempi (parte veloce 0,18–0,32 s, frenata, carica, fermo finale)
// con il RILEVATORE VERO nel costo: il telefono simulato completo (test/pose-sensors.mjs → test/phone-sim.mjs) legge la
// coreografia con la calibrazione del braccio simulato e con quella fatta con il dritto e il rovescio dell'animazione, destro
// e mancino, a 0,8× / 1× / 1,25×, con PIÙ SEMI del rumore del telefono simulato (--seeds, predefiniti 7, 1, 5, 10: con il
// solo seme 7 le soluzioni del primo giro si erano adattate a quella realizzazione del rumore e sbagliavano con altri semi,
// revisione del passo B2). Costo = 50 × errori di lettura (judgeCard: un colpo solo, tipo e lato giusti, picco =
// contatto ± 1 campione; servizio: lancio + battuta) + margini (mira |w| ≥ 0,5 per incrociato e lungolinea) + scarto
// dalla forma del video + 30 × vincoli fisici del B13 (limiti
// articolari, velocità e accelerazioni articolari, collisioni con busto e testa, una sola frenata, sequenza prossimo-distale,
// telefono non di taglio nelle pose chiave per la camera della scheda).
// Ricerca: strategia evolutiva (1+λ) con passo per variabile e regola del successo (le letture sono a gradini: Nelder–Mead
// puro si ferma sui pianori), più partenze; il migliore è scritto in <out>/<id>.json a ogni miglioramento (si riprende con
// --from). Scarto dalla forma del video misurato in cm (mano e gomito alle pose chiave, traiettoria della mano a tempo
// normalizzato), gradi (cima e schermo del telefono contro quelli ricostruiti dal video, a bassa confidenza) e secondi.
//
// Uso (dalla cartella natpf-tennis; il JSON del video è docs/b17/gesti-video.json del repository):
//   node --import ./test/register.mjs scripts/video/ottimizza.mjs --card=forehand --out=DIR [--evals=1500] [--seed=1]
//     [--seeds=7,1,5,10] [--with=DIR] [--from=FILE] [--also=flat,volley] [--report] [--mono] [--rest=colpi] [--via]
//     [--slow] [--f2d=15] [--descent=0.2,0.08] [--capPrep=140]
// --with=DIR: soluzioni già trovate per le altre schede (DIR/<id>.json): il dritto e il rovescio servono alla calibrazione
//   «con l'animazione»; senza, valgono le coreografie del codice (CHOREO_VIDEO). --also: schede di CHOREO (oggi) da leggere
//   anche loro con la calibrazione dell'animazione (il dritto e il rovescio nuovi la cambiano). --report: valuta e stampa la
//   soluzione di --from, o senza --from la coreografia del codice (CHOREO_VIDEO[card]), senza cercare.
// --seed: seme della ricerca; --seeds: semi del rumore del telefono simulato letti nel costo (ogni lettura × ogni seme).
// --slow: proseguimento lento dopo la frenata verso F2 (natpf_gesture_pose «SLOW_V»: tagliato in discesa lunga, fine alta del
//   rovescio a due mani), F2 = la fine del video ± 15° per angolo, polso libero, durata 0,2–0,8 s; il fermo e il ritorno
//   vengono dopo. --descent=a,b: vincolo sulla discesa della mano (m): fine ≤ carica − a e fine ≤ impatto − b (tagliato).
// --capPrep: velocità massima del telefono nella carica (°/s; 140 nel primo giro; sotto la soglia del gesto verticale lento
//   del rilevatore, 100 °/s, per il tagliato: la sua carica a 110 °/s era letta come palla corta con 2 semi su 10).
// Ogni soluzione salvata porta le opzioni con cui è stata trovata (`opts`): baseFor(card, opts) + decode(x) la rifanno
// identica (test natpf-gesture-pose «le soluzioni salvate rifanno CHOREO_VIDEO», soluzioni in scripts/video/soluzioni/).
// --emit=DIR: stampa CHOREO_VIDEO e AIM_TURN_VIDEO dalle soluzioni di DIR. --presa [--up=20]: risolve la posa della scheda
// «Presa» (REST_RACCHETTA) con la presa misurata (solvePresa).
// Passo B3 (richiesta dell'utente del 09/11 notte: dritto con lo SCHERMO verso la palla all'impatto, rovescio a una mano con il
// DORSO): --impact=20 vincola nel costo l'angolo tra la faccia che colpisce (GP.IMPACT_FACE: schermo per dritto, piatto,
// incrociato, lungolinea, tagliato di dritto, volée; dorso per rovescio e tagliato di rovescio) e la direzione della rete (−z)
// nell'istante del contatto (penalità oltre impact − 3°); senza --from la partenza risolve prima le pose chiave B, C, F
// (impactInit: polso e braccio entro --armd gradi dal video) perché la faccia sia girata già nella posa C, e la scrive nelle
// opzioni della soluzione (`opts.init`) così che baseFor + decode la rifacciano. --armd=N: scarti del braccio alle pose chiave
// (12 predefiniti). --mirror: per il rovescio, scarto della mano (al netto del bacino) dallo SPECCHIO del dritto (stessa forma,
// dalla sinistra verso destra) a tempo normalizzato, pesato come la traiettoria del video.
// Correzioni del passo B3 (revisione: il rovescio a una mano era ancora la traiettoria del rovescio A DUE MANI del video, a
// 48 cm dallo specchio del dritto; il tagliato di rovescio a 35 cm dallo specchio del tagliato, mai cercato):
// --mirrorRef: la forma di riferimento del rovescio (o del tagliato di rovescio) è lo SPECCHIO del dritto (o del tagliato di
//   dritto) della soluzione di --with (MIRROR_OF), non il video: mano alle pose chiave, traiettoria a tempo normalizzato e tempi;
// --mirrorInit: partenza con le pose chiave B, C, F risolte perché il polso sia allo specchio del dritto (mirrorInit: con il
//   dorso verso la rete nella posa C, il braccio disteso, l'avambraccio fuori dal busto) e i tempi del dritto (opts.likeT);
// --mirrorMax=a,b: vincolo (come un vincolo fisico) sullo scarto dallo specchio: impatto ≤ a cm e media ≤ b cm;
// --reach=d: distanza spalla–polso all'impatto ≥ d m (braccio quasi disteso: 0,48 = 0,85 della lunghezza del braccio);
// --accMax=s (volée corta): parte veloce al più s secondi; --pathMax=m: percorso della mano dalla carica all'impatto ≤ m;
// --initBlend=a,b (con --initFrom): carica = C + a·(B − C) e fine = C + b·(F − C) negli angoli della scheda di partenza
//   (volée dal dritto nuovo: preparazione corta).
import fs from 'node:fs';
import path from 'node:path';
import * as GP from '../../src/natpf/natpf_gesture_pose.js';
import { GESTURES } from '../../src/natpf/natpf_gesture_motion.js';
import { readCard, judgeCard } from '../../test/pose-sensors.mjs';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : (process.argv.includes(`--${k}`) ? true : d); };
const CARD = arg('card', 'forehand'), OUT = arg('out', '/tmp/ottimizza'), EVALS = +arg('evals', 1500), SEED = +arg('seed', 1);
const WITH = arg('with', null), FROM = arg('from', null), ALSO = (arg('also', '') || '').split(',').filter(Boolean), REPORT = !!arg('report', false);
export const SEEDS_DEFAULT = Object.freeze([7, 1, 5, 10]);
const SEEDS = arg('seeds', null) ? String(arg('seeds')).split(',').map(Number) : SEEDS_DEFAULT;
// --camdir=x,y,z: direzione della camera della scheda per i vincoli del disegno (prova di una camera nuova, passo C)
const CAMDIR = arg('camdir', null) ? String(arg('camdir')).split(',').map(Number) : null;
// --edgeMin, --foreMin: margini (°) del telefono non di taglio e dell'avambraccio sulla DIREZIONE della camera (30 e 31): la
// prospettiva della camera vera (cameraAt) li riduce di qualche grado (passo C: piatto 30° → 22° all'occhio vero)
const EDGE_MIN = +arg('edgeMin', 30), FORE_MIN = +arg('foreMin', 31);
const CAP_PREP = +arg('capPrep', 140), DESCENT = arg('descent', null) ? String(arg('descent')).split(',').map(Number) : null;
// margine della mira: |w| letto ≥ AIM_MARGIN (la soglia di judgeCard è 0,4)
export const AIM_MARGIN = .5;
// vincolo d'impatto (passo B3): gradi massimi tra la faccia che colpisce e la rete (null = spento); margine 3°
const IMPACT = arg('impact', null) != null && arg('impact') !== true ? +arg('impact') : null, IMPACT_MARGIN = 3, MIRROR = !!arg('mirror', false);
// specchio (correzioni del passo B3): scheda di cui il rovescio è lo specchio
export const MIRROR_OF = Object.freeze({ backhand: 'forehand', sliceBackhand: 'slice' });
const MIRROR_REF = !!arg('mirrorRef', false), MIRROR_MAX = arg('mirrorMax', null) ? String(arg('mirrorMax')).split(',').map(Number) : null;
const REACH = arg('reach', null) != null ? +arg('reach') : null, PATH_MAX = arg('pathMax', null) != null ? +arg('pathMax') : null;
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

/* ---------- schede che il video non mostra (piatto, pallonetto, palla corta, schiacciata, volée) ---------- */
// Con la presa del video e la partenza del video le coreografie di oggi (CHOREO, B13/B14) non si leggono più tutte: si
// ottimizzano allo stesso modo (polso, piccoli scarti del braccio, durata della carica e del ritorno) tenendo la FORMA
// approvata nel B13/B14 (la mano alle pose chiave e lungo il colpo come nella coreografia di oggi dalla sua partenza)
export const LEGACY_IDS = Object.freeze(['flat', 'lob', 'drop', 'smash', 'volley']);
export function legacyRef(id){
  const m = GP.motionFrom(id, GP.CHOREO[id], { rest: GP.REST_COLPI_RACCHETTA, set: 'legacy' }), T = m.T, W = t => GP.armChain(m.ang(t)).W;
  const keys = { carica: T.inv, impatto: T.contact, fine: T.back };
  return { id, legacy: true, keys, at: t => ({ t, W: W(t), E: GP.armChain(m.ang(t)).E, tip: null, screen: null }) };
}

/* ---------- variabili ---------- */
const ARMK = ['tau', 'p', 'e', 'r', 'b'], WRK = ['pro', 'fl', 'dv'], ARM_D = 12;
const keysOf = (id, slow = false) => id === 'serve' ? ['P', 'U', 'C', 'F'] : slow ? ['B', 'C', 'F', 'F2'] : ['B', 'C', 'F'];
// parte veloce 0,18–0,32 s (0,32: il dritto trovato è 0,319 s)
const TIMES = { stroke: { acc: [.18, .32, .03], dMax: [.12, .35, .04], prep: [.6, 2.2, .25], fin: [.15, .4, .05] },
  slow: { slow: [.2, .8, .06] },
  serve: { prep: [.4, 1.6, .15], rise: [.2, .4, .04], up: [.1, .5, .06], acc: [.15, .3, .03], dMax: [.15, .4, .05], fin: [.15, .4, .05] } };
const LAG = Object.freeze({ tau: .045, lat: .045, y: .045, p: .022, e: .022, r: .01 });
// variabili di una scheda: [{ name, lo, hi, s (passo iniziale), x0 }]
export function varsFor(id, base){
  const V = [];
  if (base.aimOnly){
    // aimwide (passo B3): con lo schermo verso la rete la mira si legge girando il piatto: più articolazioni e più ampie
    const AW = base.aimwide ? [['tau', -30, 30, 6], ['r', -35, 35, 8], ['pro', -45, 45, 10], ['fl', -40, 40, 8], ['dv', -25, 25, 6], ['p', -20, 20, 5]]
      : [['tau', -30, 30, 6], ['r', -25, 25, 6], ['pro', -30, 30, 8], ['fl', -25, 25, 6]];
    for (const [k, lo, hi, s] of AW) V.push({ name: `aim.${k}`, lo, hi, s, x0: base.aim?.[k] ?? 0 });
    return V;
  }
  for (const K of keysOf(id, !!base.slow)){
    const AD = K === 'F2' ? (base.f2d || 15) : (+base.armd || ARM_D);
    for (const k of ARMK) V.push({ name: `${K}.d${k}`, lo: -AD, hi: AD, s: 4, x0: 0 });
    for (const k of WRK){ const [lo, hi] = JOINT_LIMITS[k]; V.push({ name: `${K}.${k}`, lo: lo + 1, hi: hi - 1, s: k === 'pro' ? 25 : 12, x0: base[K][k] }); }
  }
  if (base.legacy){ for (const [k, lo, hi, s0] of [['prep', .6, 3, .25], ['back', .5, 2.4, .25]]) V.push({ name: `t.${k}`, lo, hi, s: s0, x0: Math.min(hi, Math.max(lo, base[k])) }); return V; }
  for (const [k, [lo, hi, s]] of Object.entries(timesOf(id, base))) V.push({ name: `t.${k}`, lo, hi, s, x0: Math.min(hi, Math.max(lo, base.t?.[k] ?? (lo + hi)/2)) });
  return V;
}
// like (piatto e volée dal dritto): la parte veloce scende fino a 0,08 s (piatto e volée di oggi: 0,09 e 0,10 s)
const timesOf = (id, base) => id === 'serve' ? TIMES.serve : base.slow ? { ...TIMES.stroke, ...TIMES.slow } : base.like ? { ...TIMES.stroke, acc: base.accMax ? [.06, +base.accMax, .02] : [.08, .32, .03] } : TIMES.stroke;
const clampV = (v, x) => Math.min(v.hi, Math.max(v.lo, x));
const clampJ = (k, x) => { const [lo, hi] = JOINT_LIMITS[k]; return k === 'y' ? Math.min(hi, Math.max(lo, x)) : Math.min(hi - .5, Math.max(lo + .5, x)); };
// vettore → coreografia (stesso formato di CHOREO_VIDEO)
export function decode(id, base, V, x){
  const val = Object.fromEntries(V.map((v, i) => [v.name, clampV(v, x[i])]));
  if (base.aimOnly){
    const aim = Object.fromEntries(V.map(v => v.name).filter(n => n.startsWith('aim.')).map(n => [n.slice(4), val[n]]));
    return { ...base.fore, aim, tC: null, src: `${base.fore.src} girato (mira ${id})` };
  }
  const keys = {};
  for (const K of keysOf(id, !!base.slow)){
    const J = { ...base[K] };
    for (const k of ARMK) J[k] = clampJ(k, base[K][k] + val[`${K}.d${k}`]);
    for (const k of WRK) J[k] = clampJ(k, val[`${K}.${k}`]);
    keys[K] = Object.fromEntries(JOINTS.map(k => [k, +(+J[k]).toFixed(k === 'y' ? 4 : 2)]));
  }
  if (base.legacy){
    const prep = +val['t.prep'].toFixed(3), back = +val['t.back'].toFixed(3), c = { ...base.c, ...keys, prep, back, backFlat: .3, contact: +(base.c0.contact + prep - base.c0.prep).toFixed(4), cycle: 99 };
    delete c.tC;
    try { c.cycle = +(GP.motionFrom(id, c, { rest: c.rest || GP.REST_VIDEO, set: 'video' }).T.home + .3).toFixed(3); } catch (e){ if (arg('debug', false)) console.error(e.message); }
    return c;
  }
  const t = Object.fromEntries(Object.keys(timesOf(id, base)).map(k => [k, +val[`t.${k}`].toFixed(3)]));
  if (id === 'serve'){
    const hold = .4, contact = hold + t.prep + t.rise + t.up + t.acc;
    return { src: base.src, kind: 'serve', times: base.times, hold, prep: t.prep, rise: t.rise, up: t.up, acc: t.acc, contact: +contact.toFixed(4), dMin: t.dMax, dMax: t.dMax,
      fin: t.fin, back: 2, backFlat: .3, cycle: +(contact + t.dMax + .1 + t.fin + 2 + .3).toFixed(3), riseWrist: .15, lag: LAG, ...keys };
  }
  const contact = .35 + t.prep + t.acc, slow = t.slow || 0;
  return { src: base.src, times: base.times, contact: +contact.toFixed(4), cycle: +(contact + t.dMax + .1 + slow + t.fin + 2 + .3).toFixed(3), prep: t.prep, acc: t.acc, crisp: 1,
    dMin: t.dMax, dMax: t.dMax, fin: t.fin, ...(base.slow ? { slow } : {}), back: 2, backFlat: .3, lag: LAG, ...keys };
}

/* ---------- piani e sorgente per il telefono simulato ---------- */
export const planOf = (id, choreo) => GP.planFrom(GP.motionFrom(id, choreo, { rest: choreo.rest || GP.REST_VIDEO, set: 'video' }), GRIP);
const wrapT = (P, t) => ((t % P.total) + P.total) % P.total;
function sourceWith(plans){
  return { name: 'ottimizzatore', plan: id => plans[id] || GP.gesturePlan(id, { grip: GRIP }),
    pose: (id, t, hand = 'right') => { const P = plans[id] || GP.gesturePlan(id, { grip: GRIP }), p = P.raw(wrapT(P, t)); return hand === 'left' ? GP.mirrorPose(p) : p; } };
}
const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], sliceBackhand: ['drop'], flat: ['topspin'] })[id] || null : null;
// --cals=pose: solo la calibrazione con l'animazione (passo B3: misura della mira con lo schermo verso la rete, vedi ottimizzazione.md)
const CALS = arg('cals', null) ? String(arg('cals')).split(',') : ['arm', 'pose'];
export const combosFor = (seeds = SEEDS, cals = CALS) => { const o = []; for (const seed of seeds) for (const cal of cals) for (const rate of [1, .8, 1.25]) for (const hand of ['right', 'left']) o.push({ cal, rate, hand, seed }); return o; };
const COMBOS = combosFor();
// lettura di una scheda con tutte le combinazioni; stop: si ferma dopo tanti errori (gli altri contano come sbagliati)
export function readAll(src, id, { stop = Infinity, combos = COMBOS } = {}){
  const out = []; let bad = 0;
  for (const c of combos){
    if (bad >= stop){ out.push({ ...c, why: ['(non letto)'], skipped: true }); continue; }
    let why, r = null;
    try { r = readCard(src, id, c); why = judgeCard(src, id, r, { hand: c.hand, rate: c.rate, allow: allowFor(id, c.rate) });
      // a tempo reale il picco letto coincide con il contatto entro ¼ di campione (test natpf-gesture-pose)
      if (!why.length && c.rate === 1){ const d = r.kind === 'serve' ? Math.max(Math.abs(r.dPeak ?? 99), Math.abs(r.dToss ?? 0)) : Math.abs(r.dPeak ?? 99); if (d > 1000/60/4) why = [`picco a ${d.toFixed(1)} ms dal contatto (> ¼ di campione)`]; } }
    catch (e){ why = ['ERRORE ' + e.message.slice(0, 120)]; }
    const desc = r ? (r.kind === 'serve' ? `${r.events.length} gesti` : r.read.map(x => x.ev.natpf.shot + (x.ev.side ? '/' + x.ev.side : '') + (x.ev.natpf.wrist != null && GESTURES[id]?.aim ? ` mira ${(+x.ev.natpf.wrist).toFixed(2)}` : '')).join(' + ')) : '';
    if (why.length) bad++;
    // margine della mira (incrociato, lungolinea): letta giusta ma vicina alla soglia di 0,4
    let margin = 0;
    if (!why.length && GESTURES[id]?.aim && r?.read?.[0]){ const w = Math.abs(+r.read[0].ev.natpf.wrist); if (w < AIM_MARGIN) margin += (AIM_MARGIN - w)*100; }
    out.push({ ...c, why, desc, margin, dPeak: r?.dPeak ?? null, rise: r?.read?.[0]?.ev?.natpf?.intent?.rise ?? null });
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
    out.keys[k] = { dW: len(sub(p.chain.W, r.W))*100, dE: r.E ? len(sub(p.chain.E, r.E))*100 : 0, dy: (p.chain.W[1] - r.W[1])*100, tip: r.tip ? angDeg(tip, r.tip) : 0, screen: r.screen ? angDeg(sc, r.screen) : 0,
      W: p.chain.W, Wref: r.W, elbow: p.chain.j.b };
  }
  // traiettoria della mano a tempo normalizzato tra le pose chiave consecutive
  const names = Object.keys(ref.keys).filter(k => K[k] != null); let sum = 0, n = 0, mx = 0;
  for (let i = 1; i < names.length; i++){
    const a = names[i - 1], b = names[i];
    for (let s = 0; s <= 10; s++){ const u = s/10, p = raw(K[a] + (K[b] - K[a])*u), r = ref.at(ref.keys[a] + (ref.keys[b] - ref.keys[a])*u), d = len(sub(p.chain.W, r.W))*100; sum += d; n++; mx = Math.max(mx, d); }
  }
  out.path = { mean: sum/n, max: mx };
  out.cLag = P.T.nominal != null && !ref.legacy ? P.T.nominal - P.T.contact : null;
  out.times = Object.fromEntries(names.slice(1).map((k, i) => [`${names[i]}→${k}`, { anim: K[k] - K[names[i]], video: ref.keys[k] - ref.keys[names[i]] }]));
  return out;
}
function shapeCost(sh){
  let c = 0;
  // l'impatto pesa di più: è la posa che la scritta «Impatto» mostra nell'istante del picco letto dal telefono
  for (const [n, k] of Object.entries(sh.keys)) c += (k.dW/(n === 'impatto' ? 2.5 : +arg('wkey', 4)))**2 + .5*(k.dE/8)**2 + .3*(k.tip/25)**2 + .3*(k.screen/25)**2;
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
  // la mano non salta più di 0,14 m tra due campioni a 60 Hz (test di continuità: 0,15)
  // (passo B3: anche il centro del telefono, che il test di continuità misura: il piatto veloce lo spostava di 0,169 m)
  let jump = 0; for (let t = 0; t < P.total; t += 1/60) jump = Math.max(jump, len(sub(W(t + 1/60), W(t))), len(sub(p(t + 1/60).pos, p(t).pos)));
  if (jump > .14) bad.push(['salto della mano', (jump - .14)*100]);
  // il picco del telefono è al contatto anche rispetto alla salita del servizio (curva della velocità per il disegno)
  if (P.kind === 'serve'){ const wq2 = t => len(omega(p(t - 1/480).q, p(t + 1/480).q, 1/240)); let up = 0; for (let t = T.load; t < T.tossEnd + .05; t += 1/240) up = Math.max(up, wq2(t)); const hit = wq2(P.contact); if (up > hit - 40) bad.push(['salita più veloce della battuta', (up - hit + 40)/20]); }
  if (P.kind === 'stroke'){
    const seg = k => { let m = 0, at = 0; const hh = 1/600; for (let t = P.contact - .3; t <= P.contact + .1; t += hh){ const w = len(omega(p(t).chain[k], p(t + hh).chain[k], hh)); if (w > m){ m = w; at = t + hh/2; } } return at - P.contact; };
    const tr = seg('trunk'), ha = seg('hand'), upA = seg('upper'), fo = seg('fore');
    let s = 0; if (Math.abs(ha) > 1/300) s += Math.abs(ha)*100; if (!(tr < ha - .006)) s += (tr - ha + .006)*100 + .5; if (upA > ha + .002) s += (upA - ha)*100 + .5; if (fo > ha + .002) s += (fo - ha)*100 + .5;
    if (s > 0) bad.push(['sequenza', 5*s]);
  }
  // carica lenta (B13: il telefono gira sotto ~150 °/s fino alla carica, sotto la soglia dei colpi speciali della calibrazione
  // rapida) e una sola valle della velocità del telefono prima del colpo (niente «colpo in due tempi»)
  const wq = t => len(omega(p(t - 1/480).q, p(t + 1/480).q, 1/240));
  const t1 = P.kind === 'serve' ? T.load : T.inv - .04;
  let cap = 0; for (let t = T.hold; t < t1; t += 1/120) cap = Math.max(cap, wq(t));
  if (cap > CAP_PREP) bad.push(['carica veloce', (cap - CAP_PREP)/20]);
  // proseguimento lento (--slow): il telefono sotto 150 °/s dopo la fine della parte veloce (nessun secondo colpo)
  if (P.choreo?.slow && T.fastEnd != null){ let s = 0; for (let t = T.fastEnd; t < T.back; t += 1/240) s = Math.max(s, wq(t)); if (s > 150) bad.push(['proseguimento veloce', (s - 150)/20]); }
  // il telefono non supera 1 800 °/s (test di continuità: ≤ 2 000 °/s a 60 Hz)
  let wmax = 0; for (let t = T.hold; t < T.back; t += 1/240) wmax = Math.max(wmax, wq(t));
  if (wmax > 1800) bad.push(['telefono troppo veloce', (wmax - 1800)/50]);
  if (P.kind === 'stroke'){
    let mx = 0, drop = 0; for (let t = T.inv; t <= P.contact; t += 1/240){ const w = wq(t); mx = Math.max(mx, w); drop = Math.max(drop, mx - w); }
    const pk = wq(P.contact); if (drop > .25*pk) bad.push(['valle nel colpo', (drop - .25*pk)/50]);
  }
  // telefono non di taglio nelle pose chiave (≥ 25° dalla linea di vista: margine 30°) per la camera della scheda
  const cam = CAMDIR ? { dir: CAMDIR } : GP.CAMERAS_VIDEO?.[id] || GP.CAMERAS[id];
  if (cam?.dir){
    const KT = P.kind === 'serve' ? [T.tossEnd, T.hitStart, T.contact] : [T.inv, T.contact, T.back - .004];
    const v0 = norm(cam.dir);
    let e = 0; for (const t of KT){ const q = p(t), n = qrot(q.q, [0, 0, 1]), v = v0; const a = Math.asin(Math.min(1, Math.abs(dot(n, v))))/D; if (a < EDGE_MIN) e += (EDGE_MIN - a)/5; }
    if (e > 0) bad.push(['di taglio', e]);
    // l'avambraccio non punta verso la camera della scheda in tutto il ciclo (test natpf-gesture-anim: ≥ 28° dal raggio
    // visivo; margine 31°; raggio visivo approssimato con la direzione della camera)
    let fa = 0; for (let t = 0; t < P.total; t += 1/30){ const c = p(t).chain, F = norm(sub(c.E, c.W)), a = 90 - Math.asin(Math.min(1, Math.abs(dot(F, v0))))/D; if (a < FORE_MIN) fa += (FORE_MIN - a)/3; }
    if (fa > 0) bad.push(['avambraccio verso la camera', fa]);
  }
  return bad;
}
// la faccia all'impatto (passo B3) non ha tetto: con il tetto di 50 un angolo lontano (rovescio a 103°) non aveva più pendenza
// i limiti articolari nemmeno (passo B3: la mira del lungolinea portava il polso oltre i limiti di molto, 2 414, senza pendenza)
const physCost = bad => bad.reduce((s, [k, v]) => s + (k === 'faccia all\'impatto' ? v : k === 'limiti' ? Math.min(50, v) + Math.max(0, v - 50)/20 : Math.min(50, v)), 0);

/* ---------- costo ---------- */
// piano del codice con la sua coreografia (keyTimes usa choreo.fin per la posa della fine)
export const choreoPlan = k => { const P = GP.gesturePlan(k, { grip: GRIP, set: 'video' }); return Object.isFrozen(P) ? Object.assign(Object.create(P), { choreo: GP.CHOREO_VIDEO[k] }) : Object.assign(P, { choreo: GP.CHOREO_VIDEO[k] }); };
function loadSol(file){ try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function basePlans(){
  const plans = {};
  if (WITH) for (const k of ['forehand', 'backhand', 'slice', 'sliceBackhand', 'serve']){ const s = loadSol(path.join(WITH, `${k}.json`)); if (s?.choreo){ plans[k] = planOf(k, s.choreo); plans[k].choreo = s.choreo; } }
  for (const k of ['forehand', 'backhand', 'slice']) if (!plans[k]) plans[k] = choreoPlan(k);
  return plans;
}
// faccia all'impatto (passo B3): angolo tra la faccia che colpisce e la rete nell'istante del contatto (posa del destro; il
// mancino è lo specchio e ha lo stesso angolo)
export const impactOf = (id, P) => GP.IMPACT_FACE[id] ? GP.faceAngleOf(id, P.raw(P.contact).q) : null;
// specchio del dritto (passo B3, rovescio a una mano «stesso movimento con l'altro lato»): mano al netto del bacino contro lo
// specchio (x → −x) di quella del dritto alle pose chiave e a tempo normalizzato tra le pose chiave
// forma di riferimento = specchio di F (--mirrorRef): stesse pose chiave e stessi tempi di F, mano con x → −x, gomito libero
export function mirrorRef(F){
  const KF = keyTimes(F), m = v => [-v[0], v[1], v[2]];
  // telefono: cima allo specchio e schermo opposto allo specchio («stesso movimento con l'altro lato»: il dorso del rovescio fa
  // quello che fa lo schermo del dritto)
  const ph = t => { const q = F.raw(t).q; return { tip: m(qrot(q, [0, 1, 0])), screen: mul(m(qrot(q, [0, 0, 1])), -1) }; };
  return { id: 'specchio', mirror: true, keys: { carica: KF.carica, impatto: KF.impatto, fine: KF.fine }, at: t => ({ t, W: m(F.raw(t).chain.W), E: null, ...ph(t) }) };
}
export function mirrorOf(P, F){
  const KP = keyTimes(P), KF = keyTimes(F), rel = (Q, t) => { const c = Q.raw(t).chain; return sub(c.W, [c.pelvis[0], 0, c.pelvis[2]]); };
  const m = v => [-v[0], v[1], v[2]], names = ['carica', 'impatto', 'fine'], keys = {};
  for (const k of names) keys[k] = len(sub(rel(P, KP[k]), m(rel(F, KF[k]))))*100;
  let sum = 0, n = 0, mx = 0;
  for (let i = 1; i < names.length; i++) for (let s = 0; s <= 10; s++){ const u = s/10, a = names[i - 1], b = names[i];
    const d = len(sub(rel(P, KP[a] + (KP[b] - KP[a])*u), m(rel(F, KF[a] + (KF[b] - KF[a])*u))))*100; sum += d; n++; mx = Math.max(mx, d); }
  return { keys, mean: sum/n, max: mx };
}
const phoneAxis = P => { const q = P.raw(P.contact).q; return qrot(qconj(q), omega(P.raw(P.contact - 1/480).q, P.raw(P.contact + 1/480).q, 1/240)); };
const RISE_MAX = arg('riseMax', null) != null ? +arg('riseMax') : null, AXIS_LIKE = arg('axisLike', null), PEAK_OVER = arg('peakOver', null) ? String(arg('peakOver')).split(',') : null;
const peakOf = P => { let m = 0; for (let t = P.contact - .15; t <= P.contact + .1; t += 1/480) m = Math.max(m, len(omega(P.raw(t - 1/960).q, P.raw(t + 1/960).q, 1/480))); return m; };
export function evaluate(id, choreo, { plans = basePlans(), stop = 3, also = ALSO, combos = COMBOS, descent = DESCENT, impact = IMPACT, mirror = MIRROR, axisLike = AXIS_LIKE, mirrorRefOn = MIRROR_REF,
  ref = mirrorRefOn && MIRROR_OF[id] && plans[MIRROR_OF[id]] ? mirrorRef(plans[MIRROR_OF[id]]) : LEGACY_IDS.includes(id) ? legacyRef(id) : videoRef(id) } = {}){
  let P;
  try { P = planOf(id, choreo); } catch (e){ return { cost: 1e6, err: e.message }; }
  P.choreo = choreo;
  const src = sourceWith({ ...plans, [id]: P });
  const phys = physicsOf(id, P), sh = ref ? shapeOf(id, P, ref) : null;
  const reads = readAll(src, id, { stop, combos });
  let alsoReads = [];
  for (const a of also) alsoReads.push(...readAll(src, a, { stop: 2, combos: combos.filter(c => c.cal === 'pose') }).map(r => ({ ...r, card: a })));
  const rc = r => r.why.length ? 20 + 4*r.why.length + (r.dPeak != null ? Math.min(20, Math.abs(r.dPeak)/30) : 20) : 0;
  const read = reads.reduce((s, r) => s + rc(r), 0) + alsoReads.reduce((s, r) => s + rc(r), 0);
  const margin = reads.reduce((s, r) => s + (r.margin || 0), 0);
  // discesa della mano (--descent=a,b): fine ≤ carica − a e fine ≤ impatto − b (tagliato «in discesa lunga»)
  if (descent && sh?.keys?.fine){ const y = k => sh.keys[k].W[1], e = Math.max(0, y('fine') - (y('carica') - descent[0])) + Math.max(0, y('fine') - (y('impatto') - descent[1])); if (e > 0) phys.push(['discesa', e*100]); }
  // faccia all'impatto (--impact): oltre impact − 3° penalità come un vincolo fisico
  const face = impactOf(id, P);
  if (impact != null && face != null && face > impact - IMPACT_MARGIN) phys.push(['faccia all\'impatto', (face - impact + IMPACT_MARGIN)/1.5]);
  const mir = (mirror || mirrorRefOn) && MIRROR_OF[id] && plans[MIRROR_OF[id]] ? mirrorOf(P, plans[MIRROR_OF[id]]) : null;
  // --mirrorMax=a,b: impatto ≤ a cm e media ≤ b cm dallo specchio (vincolo, non peso lieve)
  if (mir && MIRROR_MAX){ const e = Math.max(0, mir.keys.impatto - MIRROR_MAX[0]) + Math.max(0, mir.mean - MIRROR_MAX[1]); if (e > 0) phys.push(['specchio', e/2]); }
  // --reach=d: spalla–polso all'impatto ≥ d m (braccio quasi disteso)
  const reach = (() => { const c = P.raw(P.contact).chain; return len(sub(c.W, c.S)); })();
  if (REACH != null && reach < REACH) phys.push(['braccio piegato all\'impatto', (REACH - reach)*100/2]);
  // --pathMax=m: percorso della mano dalla carica all'impatto (gesto corto)
  const pathCI = (() => { let s = 0, a = P.raw(P.T.inv).chain.W; for (let t = P.T.inv + 1/240; t <= P.contact; t += 1/240){ const b = P.raw(t).chain.W; s += len(sub(b, a)); a = b; } return s; })();
  if (PATH_MAX != null && pathCI > PATH_MAX) phys.push(['gesto lungo', (pathCI - PATH_MAX)*100/2]);
  // --axisLike=<scheda> (passo B3, piatto): asse di rotazione del telefono (nel riferimento del telefono) all'impatto vicino a
  // quello della scheda data: il lato del colpo si legge da quell'asse (calibrato con il dritto) e la lettura è a gradini
  const ax = axisLike && plans[axisLike] ? angDeg(phoneAxis(P), phoneAxis(plans[axisLike])) : null;
  // --peakOver=<scheda>,k (passo B3, piatto «come il dritto, ma più veloce»): picco del telefono ≥ k volte quello della scheda
  const po = PEAK_OVER && plans[PEAK_OVER[0]] ? peakOf(P)/peakOf(plans[PEAK_OVER[0]]) : null, poc = po != null && po < +PEAK_OVER[1] ? 200*(+PEAK_OVER[1] - po)**2 : 0;
  // --riseMax=x (passo B3, dritto): salita della testa letta dal telefono (forma del colpo, calibrazione con l'animazione, 1×)
  // al più x: la salita abituale della calibrazione con il dritto nuovo (0,48 → abituale 0,30) e quella del braccio simulato
  // (−0,02) lasciavano al piatto due finestre (± 0,12) che non si toccano
  const rises = RISE_MAX != null ? reads.filter(r => r.cal === 'pose' && r.rate === 1 && Number.isFinite(r.rise)).map(r => r.rise) : [];
  const riseMean = rises.length ? rises.reduce((a, b) => a + b, 0)/rises.length : null, rc2 = riseMean != null && riseMean > RISE_MAX ? 2000*(riseMean - RISE_MAX)**2 : 0;
  const cost = 50*read + 5*margin + (sh ? shapeCost(sh) : 0) + 30*physCost(phys) + (mir && !mirrorRefOn ? (mir.mean/8)**2 : 0) + (ax != null ? 5*(ax/10)**2 : 0) + poc + rc2;
  return { id, cost, read, margin, face, mirror: mir, reach, pathCI, axis: ax, peakRatio: po, riseMean, nBad: reads.filter(r => r.why.length).length + alsoReads.filter(r => r.why.length).length, reads, alsoReads, phys, shape: sh, P };
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

/* ---------- partenza con la faccia girata verso la rete (passo B3) ---------- */
// Pose chiave risolte prima della ricerca: nella posa C la faccia che colpisce (GP.IMPACT_FACE) entro lim − 8° dalla rete,
// con la mano dove la mette la partenza (scarto pesato 1 cm ≈ 1/4), il gomito vicino (peso basso), il braccio entro ±armd
// gradi dalla partenza e le articolazioni ≥ 3° dai limiti; in F (e F2) il polso si sposta dello stesso scarto di C (il
// proseguimento resta quello del video, girato come l'impatto). Restituisce { C, F, (F2) } con gli angoli cambiati.
export function impactInit(card, base, lim = 20, armd = 12, tipT = null){
  const C0 = base.C, K = ['tau', 'p', 'e', 'r', 'b', 'pro', 'fl', 'dv'], G = GP.gripInHand(GRIP), ch0 = GP.armChain({ ...GP.REST_VIDEO, ...C0 });
  const J = x => { const j = { ...GP.REST_VIDEO, ...C0 }; K.forEach((k, i) => j[k] = x[i]); return j; };
  const f = x => { const j = J(x); let c = 0;
    for (const k of K){ const [a, b] = JOINT_LIMITS[k]; if (j[k] < a + 3) c += 10*(a + 3 - j[k])**2; if (j[k] > b - 3) c += 10*(j[k] - b + 3)**2;
      if (!WRK.includes(k)){ const d = Math.abs(j[k] - C0[k]) - armd; if (d > 0) c += 10*d*d; } }
    const ch = GP.armChain(j), q = qmul(ch.hand, G), a = GP.faceAngleOf(card, q);
    // tipT (--tipLike): la cima come quella del dritto (o del rovescio) all'impatto, così il colpo gira il telefono attorno allo
    // stesso asse del telefono (con la cima verso l'altra parte il piatto girato era letto dal lato del rovescio, misurato)
    const tc = tipT ? .05*angDeg(qrot(q, [0, 1, 0]), tipT)**2 : 0;
    return c + tc + 4*Math.max(0, a - (lim - 8))**2 + (len(sub(ch.W, ch0.W))*100/2)**2 + .5*(len(sub(ch.E, ch0.E))*100/8)**2; };
  let best = null;
  for (const pro of [C0.pro, 10, 60, 110, 160]) for (const fl of [C0.fl, -40, 30]){
    const r = nelderMead(f, K.map(k => k === 'pro' ? pro : k === 'fl' ? fl : C0[k]), K.map(k => WRK.includes(k) ? 20 : 6), 3000); if (!best || r.f < best.f) best = r; }
  const j = J(best.x), C = Object.fromEntries(K.map(k => [k, +j[k].toFixed(2)])), out = { C };
  const shift = (X) => Object.fromEntries(WRK.map(k => { const [a, b] = JOINT_LIMITS[k]; return [k, +Math.min(b - 1, Math.max(a + 1, X[k] + C[k] - C0[k])).toFixed(2)]; }));
  out.F = { ...shift(base.F) };
  if (base.F2) out.F2 = shift(base.F2);
  const ch = GP.armChain(j);
  out.info = { tip: tipT ? +angDeg(qrot(qmul(ch.hand, G), [0, 1, 0]), tipT).toFixed(1) : null, face: +GP.faceAngleOf(card, qmul(ch.hand, G)).toFixed(1), dW_cm: +(len(sub(ch.W, ch0.W))*100).toFixed(1), dE_cm: +(len(sub(ch.E, ch0.E))*100).toFixed(1) };
  return out;
}

/* ---------- partenza allo specchio (correzioni del passo B3) ---------- */
// Pose chiave B, C, F del rovescio (o del tagliato di rovescio) risolte con il braccio destro perché il polso sia allo specchio
// (x → −x) di quello della scheda F (il dritto, o il tagliato di dritto) nelle sue pose chiave, con la cima del telefono allo
// specchio e il dorso dove il dritto ha lo schermo; nella posa C la faccia che colpisce entro lim − 8° dalla rete e la distanza
// spalla–polso ≥ reach; articolazioni ≥ 3° dai limiti, avambraccio fuori dal busto, la carica e la fine vicine alla posa C negli
// angoli del busto (niente giri di 130° del busto tra carica e impatto). Restituisce { B, C, F, info }.
export function mirrorInit(card, F, { lim = 20, reach = null } = {}){
  // con il proseguimento lento (tagliato di dritto: F → F2) la fine della parte veloce è F e la fine del gesto F2
  const slow = !!(F.choreo?.slow && F.T.fastEnd != null), KT = { ...keyTimes(F), fast: F.T.fastEnd }, names = slow ? { B: 'carica', C: 'impatto', F: 'fast', F2: 'fine' } : { B: 'carica', C: 'impatto', F: 'fine' }, M9 = ['tau', 'lat', 'p', 'e', 'r', 'b', 'pro', 'fl', 'dv'], G = GP.gripInHand(GRIP), m = v => [-v[0], v[1], v[2]];
  const out = {}, info = {};
  for (const K of ['C', 'B', 'F', ...(slow ? ['F2'] : [])]){
    const t = KT[names[K]], pf = F.raw(t), Wt = m(pf.chain.W), tipT = m(qrot(pf.q, [0, 1, 0])), scT = mul(m(qrot(pf.q, [0, 0, 1])), -1), y = pf.chain.pelvis[1] - GP.BODY.pelvis[1];
    const J = x => { const j = { y: +y.toFixed(4) }; M9.forEach((k, i) => j[k] = x[i]); return j; };
    const f = x => { const j = J(x); let c = 0;
      for (const k of M9){ const [a, b] = JOINT_LIMITS[k]; if (j[k] < a + 3) c += 10*(a + 3 - j[k])**2; if (j[k] > b - 3) c += 10*(j[k] - b + 3)**2; }
      const ch = GP.armChain(j), q = qmul(ch.hand, G);
      c += (len(sub(ch.W, Wt))*100)**2 + .02*angDeg(qrot(q, [0, 1, 0]), tipT)**2 + .02*angDeg(qrot(q, [0, 0, 1]), scT)**2;
      if (K === 'C'){ c += 4*Math.max(0, GP.faceAngleOf(card, q) - (lim - 8))**2; if (reach != null){ const r = len(sub(ch.W, ch.S)); if (r < reach) c += (100*(reach - r))**2; } }
      // carica più chiusa della posa C (busto girato a sinistra, tau ≥ C), fine più aperta (tau ≤ C), e vicine negli angoli
      else { const d = K === 'B' ? out.C.tau - j.tau : K === 'F2' ? j.tau - out.F.tau : j.tau - out.C.tau; if (d > 0) c += 2*d*d; for (const k of ['p', 'e', 'r', 'b', 'pro']) c += .002*(j[k] - out.C[k])**2; }
      for (let u = 0; u <= 1; u += .25){ const X = add(ch.W, mul(sub(ch.E, ch.W), u)), l = qrot(qconj(ch.trunk), sub(X, ch.pelvis)), e = (l[0]/.2)**2 + (l[2]/.15)**2; if (l[1] > -.1 && l[1] < .45 && e < 1) c += 3000*(1 - e)**2; }
      return c; };
    let best = null;
    const starts = K === 'C' ? [] : [M9.map(k => out.C[k])];
    for (const tau of [-50, 0, 50]) for (const p0 of [-40, 60, 120]) for (const pro of [20, 90, 160]) starts.push([tau, 0, p0, 60, 20, 30, pro, 0, 0]);
    for (const s0 of starts){ const r = nelderMead(f, s0, [20, 8, 30, 30, 30, 30, 40, 20, 10], 3000); if (!best || r.f < best.f) best = r; }
    const j = J(best.x), ch = GP.armChain(j), q = qmul(ch.hand, G);
    out[K] = Object.fromEntries(Object.entries(j).map(([k, v]) => [k, +(+v).toFixed(k === 'y' ? 4 : 2)]));
    info[K] = { dW_cm: +(len(sub(ch.W, Wt))*100).toFixed(1), tip: +angDeg(qrot(q, [0, 1, 0]), tipT).toFixed(1), screen: +angDeg(qrot(q, [0, 0, 1]), scT).toFixed(1), face: +GP.faceAngleOf(card, q).toFixed(1), reach: +len(sub(ch.W, ch.S)).toFixed(3) };
  }
  return { B: out.B, C: out.C, F: out.F, ...(slow ? { F2: out.F2 } : {}), info };
}

/* ---------- ricerca ---------- */
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; }; }
const gauss = R => { const u = Math.max(1e-12, R()), v = R(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
function summary(e){
  const sh = e.shape;
  return { cost: +e.cost.toFixed(2), nBad: e.nBad, nReads: e.reads?.length, margin: +(e.margin || 0).toFixed(2), ...(e.face != null ? { impact_deg: +e.face.toFixed(1) } : {}),
    ...(e.riseMean != null ? { rise: +e.riseMean.toFixed(3) } : {}), ...(e.reach != null ? { reach_m: +e.reach.toFixed(3), path_ci_m: +e.pathCI.toFixed(3) } : {}), ...(e.axis != null ? { axis_deg: +e.axis.toFixed(1) } : {}), ...(e.peakRatio != null ? { peak_ratio: +e.peakRatio.toFixed(2) } : {}), ...(e.mirror ? { mirror_cm: { mean: +e.mirror.mean.toFixed(1), max: +e.mirror.max.toFixed(1), keys: Object.fromEntries(Object.entries(e.mirror.keys).map(([k, v]) => [k, +v.toFixed(1)])) } } : {}), read: e.reads?.filter(r => r.why.length).map(r => `seme ${r.seed} ${r.cal} ${r.hand} ×${r.rate}: ${r.why.join('; ')} [${r.desc}]`),
    aimMin: GESTURES[e.id]?.aim ? Math.min(...e.reads.filter(r => !r.why.length).map(r => Math.abs(+(r.desc.match(/mira (-?[\d.]+)/)?.[1] ?? 9)))) : undefined,
    also: e.alsoReads?.filter(r => r.why.length).map(r => `${r.card} ${r.hand} ×${r.rate}: ${r.why.join('; ')}`),
    phys: e.phys, shape: sh && { keys: Object.fromEntries(Object.entries(sh.keys).map(([k, v]) => [k, { dW_cm: +v.dW.toFixed(1), dE_cm: +v.dE.toFixed(1), dy_cm: +v.dy.toFixed(1), tip_deg: +v.tip.toFixed(0), screen_deg: +v.screen.toFixed(0), gomito: +v.elbow.toFixed(0) }])),
      path_cm: { mean: +sh.path.mean.toFixed(1), max: +sh.path.max.toFixed(1) }, times: Object.fromEntries(Object.entries(sh.times).map(([k, v]) => [k, { anim: +v.anim.toFixed(3), video: +v.video.toFixed(3) }])) } };
}
// Partenza di una scheda per le opzioni date (le stesse che una soluzione salvata porta in `opts`): coreografia grezza del
// video con il polso risolto (rawVideoChoreo), --mono, --wrist, --slow; per le schede che il video non mostra la coreografia
// di oggi (CHOREO) con --rest=colpi o --via; per incrociato e lungolinea il dritto (`fore`: da --with o da CHOREO_VIDEO).
export function baseFor(card, opts = {}, { fore = null } = {}){
  // like (passo B3, piatto e volée): la scheda parte dalle pose chiave e dai tempi di un'altra (il dritto nuovo, in opts.init e
  // opts.likeT) e si ottimizza come una scheda del video (pose B, C, F, parte veloce, frenata, carica, fermo), con la forma
  // di riferimento di oggi (legacyRef): con la composizione delle schede di oggi (passaggi, tempi) il piatto girato era letto
  // dal lato del rovescio, il dritto nuovo letto come «piatto» è invece del lato giusto (misurato)
  if (opts.like && opts.init){
    const b = { src: card };
    for (const K of ['B', 'C', 'F']) b[K] = { ...GP.REST_VIDEO, ...opts.init[K] };
    b.t = { ...opts.likeT };
    return { ...b, like: true, ...(opts.armd ? { armd: +opts.armd } : {}), ...(opts.accMax ? { accMax: +opts.accMax } : {}) };
  }
  if (LEGACY_IDS.includes(card)){
    // partenza del video (braccio che pende, polso girato: il telefono deve girare di 83–155° fino alla carica): carica
    // diretta in linea retta negli angoli e lunga (fino a 3 s), senza le pose di passaggio della schiacciata, pensate per la
    // partenza di oggi (con quelle il polso si rigirava in un ottavo della carica: 576 °/s letti come un colpo, misurato);
    // con la posa di oggi della racchetta come passaggio (110° dalla partenza del video) andava peggio
    const c0 = GP.CHOREO[card], c = { ...c0, prep: c0.prep + 1 }; delete c.V;
    // via (piatto, schiacciata): la carica abbassa prima l'omero lungo il fianco (e 4°), lì cambia il piano di elevazione
    // (con il braccio quasi verticale non gira il telefono), poi sale verso la carica di oggi in tre tratti: con la retta negli
    // angoli il piano passava da −75° a +110° con il braccio già alzato (491 °/s a metà carica, letto come una schiacciata)
    // rest=colpi: la scheda parte dalla posa di oggi della racchetta (REST_COLPI_RACCHETTA, telefono davanti al petto) e
    // non da quella del video (limite dichiarato: dalla partenza del video la carica del piatto e della schiacciata era letta
    // come un colpo in tutte le varianti provate)
    if (opts.rest === 'colpi'){ c.rest = GP.REST_COLPI_RACCHETTA; c.prep = c0.prep; if (c0.V) c.V = c0.V; }
    if (opts.init) for (const [K, J] of Object.entries(opts.init)) c[K] = { ...c[K], ...J };
    else if (opts.via){ const R = GP.REST_VIDEO, A1 = { ...R, e: 4 }, A2 = { ...A1, p: c0.B.p }, L = u => Object.fromEntries(GP.JOINTS.map(k => [k, +(A2[k] + (c0.B[k] - A2[k])*u).toFixed(3)]));
      c.V = [A1, A2, L(1/3), L(2/3)]; c.ov = c0.ov ?? .1; c.prep = c0.prep + 1.4; }
    return { legacy: true, c, c0, src: card, prep: c.prep, back: Math.max(1, c.back), B: c.B, C: c.C, F: c.F, ...(opts.armd ? { armd: +opts.armd } : {}) };
  }
  if (card === 'cross' || card === 'line') return { aimOnly: true, fore: fore || GP.CHOREO_VIDEO.forehand, aim: GP.AIM_TURN_VIDEO?.[card], ...(opts.aimwide ? { aimwide: true } : {}) };
  let raw = rawVideoChoreo(card);
  const F2 = { ...raw.F };
  // mono: ogni articolazione del braccio va nello stesso verso da B a C e da C a F (la fine prosegue il colpo: niente
  // articolazioni che si fermano o tornano indietro nell'impatto, che spezzano la velocità del telefono in due gobbe);
  // wrist=pro,fl,dv: polso di partenza uguale nelle tre pose (telefono rigido con l'avambraccio)
  if (opts.mono){ const B = raw.B, C = raw.C, F = { ...raw.F };
    for (const k of ['tau', 'p', 'e', 'r', 'b']){ const d1 = C[k] - B[k], d2 = F[k] - C[k]; if (d1*d2 < 0 || Math.abs(d2) < 2) F[k] = C[k] + Math.sign(d1)*Math.max(3, Math.abs(d1)*.25); }
    raw = { ...raw, F }; }
  if (opts.wrist){ const [pro, fl, dv] = String(opts.wrist).split(',').map(Number); for (const K of keysOf(card)) raw = { ...raw, [K]: { ...raw[K], pro, fl, dv } }; }
  // slow: F2 = la fine del video (prima di --mono), raggiunta lentamente dopo la frenata
  // f2d: ampiezza degli scarti del braccio in F2 (gradi, 15 predefiniti)
  // init (passo B3): pose chiave risolte da impactInit (faccia girata verso la rete nella posa C), scritte nella soluzione
  if (opts.init) for (const [K, J] of Object.entries(opts.init)){ if (K === 'F2') Object.assign(F2, J); else raw = { ...raw, [K]: { ...raw[K], ...J } }; }
  const base = { ...raw, ...(opts.slow && card !== 'serve' ? { slow: true, F2, f2d: +(opts.f2d || 15) } : {}), ...(opts.armd ? { armd: +opts.armd } : {}) };
  // forma dallo specchio (correzioni del passo B3): la coreografia non viene più dai tempi del video
  if (opts.mirrorRef && MIRROR_OF[card]){ base.src = `specchio di ${MIRROR_OF[card]}`; delete base.times; }
  const A0 = +(opts.acc ?? .25), P0 = +(opts.prep ?? raw.prep);
  base.t = card === 'serve' ? { prep: P0, rise: raw.rise, up: raw.up, acc: A0, dMax: raw.dMax, fin: raw.fin } : { acc: A0, dMax: Math.max(.12, raw.dMax), prep: P0, fin: raw.fin, slow: .45 };
  // likeT (correzioni del passo B3, rovescio allo specchio): tempi di partenza della scheda specchiata
  if (opts.likeT && card !== 'serve') base.t = { ...base.t, ...opts.likeT };
  return base;
}
const OPT_KEYS = ['mono', 'wrist', 'rest', 'via', 'slow', 'f2d', 'armd', 'init', 'impact', 'mirror', 'aimwide', 'like', 'likeT', 'accMax', 'mirrorRef', 'mirrorMax', 'reach', 'pathMax'];
// x di una soluzione salvata per le variabili V (per nome: una soluzione senza --slow riparte con le variabili nuove al valore iniziale)
function xFrom(sol, V){
  if (!sol?.x) return null;
  if (!sol.vars) return sol.x.length === V.length ? sol.x : null;
  return V.map(v => { const i = sol.vars.indexOf(v.name); return i >= 0 ? sol.x[i] : v.x0; });
}
export const solutionChoreo = (card, sol, { fore = null } = {}) => { const base = baseFor(card, sol.opts || {}, { fore }), V = varsFor(card, base); return decode(card, base, V, xFrom(sol, V)); };
async function main(){
  fs.mkdirSync(OUT, { recursive: true });
  const plans = basePlans(), R = rng(SEED), logf = path.join(OUT, `${CARD}.log`);
  const log = s => { fs.appendFileSync(logf, s + '\n'); console.log(s); };
  const from = FROM && loadSol(FROM);
  // opzioni: quelle della riga di comando, altrimenti quelle della soluzione di partenza
  const opts = {};
  for (const k of OPT_KEYS){ const v = arg(k, undefined); if (v !== undefined) opts[k] = v; else if (from?.opts?.[k] !== undefined) opts[k] = from.opts[k]; }
  for (const k of ['acc', 'prep']){ const v = arg(k, undefined); if (v !== undefined) opts[k] = v; }
  const fore = (CARD === 'cross' || CARD === 'line') && WITH ? loadSol(path.join(WITH, 'forehand.json')) : null;
  let base = baseFor(CARD, opts, { fore: fore ? solutionChoreo('forehand', fore) : null }), inited = false;
  // --initFrom=<scheda>: pose chiave B, C, F di partenza prese dalla soluzione di un'altra scheda (--with), scritte in opts.init
  // (passo B3: piatto e volée dal dritto nuovo, con lo schermo già verso la rete e la cima come il dritto)
  if (arg('initFrom', null) && !opts.init){
    const k = arg('initFrom'), s = WITH && loadSol(path.join(WITH, `${k}.json`)), c = s ? solutionChoreo(k, s) : GP.CHOREO_VIDEO[k];
    opts.init = Object.fromEntries(['B', 'C', 'F'].map(K => [K, Object.fromEntries(JOINTS.map(j => [j, c[K][j]]))]));
    // --initBlend=a,b: carica e fine accorciate verso la posa C (volée corta dal dritto nuovo)
    if (arg('initBlend', null)){ const [a, b] = String(arg('initBlend')).split(',').map(Number), bl = (K, u) => Object.fromEntries(JOINTS.map(j => [j, +(c.C[j] + u*(c[K][j] - c.C[j])).toFixed(j === 'y' ? 4 : 2)]));
      opts.init.B = bl('B', a); opts.init.F = bl('F', b); }
    if (arg('like', false)){ opts.like = k; opts.likeT = { acc: arg('acc', null) ? +arg('acc') : c.acc, dMax: c.dMax, prep: c.prep, fin: c.fin }; }
    base = baseFor(CARD, opts, { fore: null }); inited = true;
  }
  // --mirrorInit: pose chiave allo specchio della scheda MIRROR_OF (dritto o tagliato di dritto) e i suoi tempi
  if (arg('mirrorInit', false) && !opts.init && MIRROR_OF[CARD]){
    const F = plans[MIRROR_OF[CARD]], r = mirrorInit(CARD, F, { lim: IMPACT ?? 20, reach: REACH }), { info, ...init } = r, c = F.choreo;
    opts.init = init; opts.likeT = { acc: c.acc, dMax: c.dMax, prep: c.prep, fin: c.fin, ...(c.slow ? { slow: c.slow } : {}) };
    if (init.F2){ opts.slow = true; opts.f2d = 15; }
    base = baseFor(CARD, opts, { fore: null }); inited = true;
    console.log(`partenza allo specchio di ${MIRROR_OF[CARD]} (mirrorInit): ${JSON.stringify(info)} ${JSON.stringify(init)}`);
  }
  // --impact senza una partenza già girata: pose chiave risolte con la faccia verso la rete (impactInit), scritte in opts.init
  if (IMPACT != null && !opts.init && !base.aimOnly && GP.IMPACT_FACE[CARD] && !arg('noinit', false)){
    const like = arg('tipLike', null), LP = like ? plans[like] || GP.gesturePlan(like, { grip: GRIP, set: 'video' }) : null;
    const r = impactInit(CARD, base, IMPACT, +(opts.armd || ARM_D), LP ? qrot(LP.raw(LP.contact).q, [0, 1, 0]) : null); const { info, ...init } = r;
    opts.init = init; base = baseFor(CARD, opts, { fore: null }); inited = true;
    console.log(`partenza girata (impactInit): ${JSON.stringify(info)} ${JSON.stringify(init)}`);
  }
  if (IMPACT != null) opts.impact = IMPACT;
  if (MIRROR) opts.mirror = true;
  if (MIRROR_REF) opts.mirrorRef = true;
  for (const k of ['mirrorMax', 'reach', 'pathMax', 'accMax']){ const v = arg(k, null); if (v != null) opts[k] = v; }
  const V = varsFor(CARD, base);
  // con la partenza girata appena risolta della soluzione di --from si tengono solo i tempi (il polso è assoluto)
  const fx = xFrom(from, V);
  let x = inited ? V.map((v, i) => fx && v.name.startsWith('t.') ? fx[i] : v.x0) : fx || V.map(v => v.x0);
  const ev = xx => evaluate(CARD, decode(CARD, base, V, xx), { plans, impact: opts.impact ?? IMPACT, mirror: !!(opts.mirror ?? MIRROR), mirrorRefOn: !!opts.mirrorRef });
  const saveOpts = Object.fromEntries(Object.entries(opts).filter(([k]) => OPT_KEYS.includes(k)));
  // --report senza --from: la coreografia del codice (CHOREO_VIDEO[card], o il dritto girato per la mira)
  if (REPORT && !from){
    const choreo = GP.choreoFor(CARD, 'video'), e = evaluate(CARD, choreo, { plans });
    fs.writeFileSync(path.join(OUT, `${CARD}.json`), JSON.stringify({ id: CARD, report: 'CHOREO_VIDEO', seeds: SEEDS, ...summary(e) }, null, 1));
    log(`[report CHOREO_VIDEO] ${CARD}: ${JSON.stringify(summary(e))}`);
    return;
  }
  let cur = ev(x), best = { x, e: cur };
  log(`[${new Date().toISOString()}] ${CARD} semi ${SEEDS}: partenza costo ${cur.cost.toFixed(2)} errori ${cur.nBad} ${JSON.stringify(summary(cur))}`);
  const save = () => fs.writeFileSync(path.join(OUT, `${CARD}.json`), JSON.stringify({ id: CARD, opts: saveOpts, seeds: SEEDS, x: best.x, vars: V.map(v => v.name), choreo: decode(CARD, base, V, best.x), ...summary(best.e) }, null, 1));
  save();
  if (REPORT){ log(`[report] ${CARD}: ${JSON.stringify(summary(best.e))}`); return; }
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
      log(`[${evals}] costo ${best.e.cost.toFixed(2)} errori ${best.e.nBad}/${best.e.reads.length} margine ${best.e.margin.toFixed(1)} σ ${sigma.toFixed(2)} lettura ${best.e.read.toFixed(1)} fisica ${physCost(best.e.phys).toFixed(2)} ${JSON.stringify(best.e.phys.map(([k, v]) => [k, +v.toFixed(2)]))} forma ${best.e.shape ? shapeCost(best.e.shape).toFixed(2) : '-'}`);
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
  for (const id of ['forehand', 'backhand', 'slice', 'sliceBackhand', 'serve', ...LEGACY_IDS]){
    const s = loadSol(path.join(dir, `${id}.json`)); if (!s) continue;
    // la coreografia si rifà dal vettore e dalle opzioni (decode), come il test delle soluzioni salvate
    const c = { ...solutionChoreo(id, s) }; delete c.tC;
    const tC = GP.motionFrom(id, c, { rest: c.rest || GP.REST_VIDEO, set: 'video' }).T.nominal;
    const head = Object.entries(c).filter(([k]) => !['B', 'C', 'F', 'F2', 'P', 'U', 'V', 'lag', 'jt', 'times', 'src'].includes(k))
      .map(([k, v]) => k === 'rest' && JSON.stringify(v) === JSON.stringify(GP.REST_COLPI_RACCHETTA) ? 'rest: REST_COLPI_RACCHETTA' : `${k}: ${JSON.stringify(v)}`).join(', ');
    const extra = (c.jt ? `, jt: ${JSON.stringify(c.jt).replace(/"(\w+)":/g, '$1: ')}` : '') + (c.V ? `,\n    V: [${c.V.map(lit).join(', ')}]` : '');
    lines.push(`  ${id}: Object.freeze({ src: ${JSON.stringify(c.src ?? id)}, ${c.times ? `times: ${JSON.stringify(c.times)}, ` : ''}tC: ${+tC.toFixed(6)}, ${head}, lag: ${c.lag === undefined || JSON.stringify(c.lag) === JSON.stringify({ tau: .045, lat: .045, y: .045, p: .022, e: .022, r: .01 }) ? 'LAG' : JSON.stringify(c.lag).replace(/"(\w+)":/g, '$1: ')}${extra},`);
    const K = id === 'serve' ? ['P', 'U', 'C', 'F'] : ['B', 'C', 'F', ...(c.F2 ? ['F2'] : [])];
    lines.push(K.map(k => `    ${k}: ${lit(c[k])}`).join(',\n') + ' }),');
  }
  console.log('export const CHOREO_VIDEO = Object.freeze({\n' + lines.join('\n') + '\n});');
  const aims = ['cross', 'line'].map(id => [id, loadSol(path.join(dir, `${id}.json`))]).filter(([, s]) => s);
  const foreSol = loadSol(path.join(dir, 'forehand.json')), fore = foreSol ? solutionChoreo('forehand', foreSol) : null;
  if (aims.length) console.log('export const AIM_TURN_VIDEO = Object.freeze({ ' + aims.map(([id, s]) => `${id}: Object.freeze(${lit(Object.fromEntries(Object.entries(solutionChoreo(id, s, { fore }).aim).map(([k, v]) => [k, +v.toFixed(2)])))})`).join(', ') + ' });');
}
// --presa: posa della scheda «Presa» con la presa misurata (REST_RACCHETTA): la cima in avanti e alzata di --up gradi (20), il
// bordo del pollice in alto (≥ 0,85), schermo un poco in alto (≥ 0,2), polso dritto (fl, dv → 0), gomito al fianco (sotto 1,12 m), telefono davanti all'anca
// destra (centro a (0,2 ± 0,1; 1,1 ± 0,08; −0,35…−0,6) m), avambraccio fuori dal busto, articolazioni ≥ 8° dai limiti. Nelder–Mead da più partenze.
function nelderMead(f, x0, step, iters = 6000){
  const n = x0.length; let S = [x0.slice()]; for (let i = 0; i < n; i++){ const x = x0.slice(); x[i] += step[i]; S.push(x); }
  let F = S.map(f);
  for (let it = 0; it < iters; it++){
    const idx = F.map((v, i) => i).sort((a, b) => F[a] - F[b]); S = idx.map(i => S[i]); F = idx.map(i => F[i]);
    if (Math.abs(F[n] - F[0]) < 1e-10) break;
    const c = Array(n).fill(0); for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) c[k] += S[i][k]/n;
    const at = a => c.map((v, k) => v + a*(S[n][k] - v)), xr = at(-1), fr = f(xr);
    if (fr < F[0]){ const xe = at(-2), fe = f(xe); if (fe < fr){ S[n] = xe; F[n] = fe; } else { S[n] = xr; F[n] = fr; } }
    else if (fr < F[n - 1]){ S[n] = xr; F[n] = fr; }
    else { const xc = fr < F[n] ? at(-.5) : at(.5), fc = f(xc);
      if (fc < Math.min(fr, F[n])){ S[n] = xc; F[n] = fc; } else for (let i = 1; i <= n; i++){ S[i] = S[i].map((v, k) => S[0][k] + .5*(v - S[0][k])); F[i] = f(S[i]); } }
  }
  const i = F.indexOf(Math.min(...F)); return { x: S[i], f: F[i] };
}
export function solvePresa(up = 20){
  const K = ['p', 'e', 'r', 'b', 'pro', 'fl', 'dv'], tipT = norm([0, Math.sin(up*D), -Math.cos(up*D)]), G = GP.PHONE_IN_HAND_VIDEO;
  const meas = j => { const ch = GP.armChain(j), q = qmul(ch.hand, G); return { ch, tip: qrot(q, [0, 1, 0]), ex: qrot(q, [1, 0, 0]), sc: qrot(q, [0, 0, 1]), center: sub(ch.W, qrot(q, GP.HAND_LOCAL_RACCHETTA.wrist)) }; };
  const f = x => { const j = { tau: 0, lat: 0, y: 0 }; K.forEach((k, i) => j[k] = x[i]);
    let c = 0; for (const k of K){ const [a, b] = JOINT_LIMITS[k]; if (j[k] < a + 8) c += 10*(a + 8 - j[k])**2; if (j[k] > b - 8) c += 10*(j[k] - b + 8)**2; }
    const M = meas(j);
    // avambraccio fuori dal busto (ellisse del test natpf-gesture-physics con 1 cm di margine)
    for (let u = 0; u <= 1; u += .25){ const X = add(M.ch.W, mul(sub(M.ch.E, M.ch.W), u)), l = sub(X, M.ch.pelvis), e = (l[0]/(.16 + .03 + .01))**2 + (l[2]/(.11 + .03 + .01))**2; if (l[1] > -.1 && l[1] < .45 && e < 1) c += 2000*(1 - e)**2; }
    // schermo un poco in alto (≥ 0,2: nella foto «davanti» si vede da davanti a sinistra), non verso il pavimento
    return c + .5*angDeg(M.tip, tipT)**2 + 2000*Math.max(0, .85 - M.ex[1])**2 + 500*Math.max(0, .2 - M.sc[1])**2 + .05*(j.fl**2 + j.dv**2) + 3000*Math.max(0, M.ch.E[1] - 1.12)**2
      + 2000*Math.max(0, Math.abs(M.center[1] - 1.1) - .08)**2 + 2000*Math.max(0, Math.abs(M.center[0] - .2) - .1)**2 + 2000*Math.max(0, M.center[2] + .35)**2 + 2000*Math.max(0, -.6 - M.center[2])**2; };
  let best = null;
  for (const s0 of [[-40, 15, -40, 90, 80, 0, 0], [0, 30, 0, 90, 30, 0, 0], [60, 40, 30, 100, 120, 0, 0], [90, 20, 45, 90, 20, 0, 0], [30, 20, -30, 90, 10, 0, 0], [90, 50, 0, 40, 90, 0, 0]]){
    const r = nelderMead(f, s0, [20, 20, 20, 20, 30, 15, 10]); if (!best || r.f < best.f) best = r; }
  const j = { tau: 0, lat: 0, y: 0 }; K.forEach((k, i) => j[k] = +best.x[i].toFixed(1));
  return { j, cost: best.f, ...meas(j) };
}
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('ottimizza.mjs')){
  if (arg('emit', null)) emit(arg('emit'));
  else if (arg('presa', false)){ const r = solvePresa(+arg('up', 20)); console.log(JSON.stringify({ REST_RACCHETTA: r.j, costo: +r.cost.toFixed(4), cima: r.tip.map(v => +v.toFixed(3)), schermo: r.sc.map(v => +v.toFixed(3)), pollice: r.ex.map(v => +v.toFixed(3)), polso: r.ch.W.map(v => +v.toFixed(3)), gomito: r.ch.E.map(v => +v.toFixed(3)) })); }
  else main();
}
