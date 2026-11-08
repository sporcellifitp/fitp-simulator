// B17.4 (08/11/2026): i colpi vicini alla rete delle due diagnostiche dell'08/11 (20261108-171902-wqdk e
// 20261108-172017-q79f, Leggenda, telefono Android) rigiocati dentro la funzione vera dell'esito (strokeOutcome), con i
// parametri ricostruiti dai registri: 'racchetta' (intenzione, tempo, qualità, pressione, lato, posizione laterale della
// palla, mira), 'palla' (posizione e velocità della palla all'impatto), 'rimbalzo' (palla corta), 'tel.colpo' (salita e
// confidenza della forma). Il registro 'racchetta' scrive x e z del punto di caduta (z = −profondità per chi gioca qui), non
// la posizione della palla: la posizione viene dall'ultimo 'palla' prima dell'esito.
//   node --import ./test/register.mjs scripts/audit/rete-diag.mjs [eventi.jsonl …] [--json] [--tutti]
// Senza file usa i colpi estratti (FIXTURE, stessi numeri). Colonne: registrato (quello che la partita ha prodotto) e
// rigiocato (quello che le regole di adesso producono con gli stessi ingressi). Sulla base 7936011 le due colonne
// coincidono (riproduzione); dopo la correzione la differenza è l'effetto della correzione.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { strokeOutcome, outcomeFlight, lateSpanOf, timingQualityOf, OUTCOME, RHYTHM, IMPACT } from '../../src/natpf/natpf_stroke_outcome.js';
import { skillLevel, streakFlight, mistimeFlight } from '../../src/natpf/natpf_skill.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const r = (v, d = 2) => (Number.isFinite(v) ? +v.toFixed(d) : null);

// Ritmo di chi gioca all'istante del colpo, dalla mira registrata: aim = −c·natural·(1−|aimT|) − c·aimT·timingAim + face,
// con aimT = clamp(t − rhythm, −1, 1). Si inverte numericamente (la funzione è monotona in aimT).
export function rhythmFromAim({ aim, t, contact, face }){
  const c = contact >= 0 ? 1 : -1, target = aim - clamp(face, -1, 1)*OUTCOME.faceAim;
  const f = a => -c*OUTCOME.natural*(1 - Math.abs(a)) - c*a*OUTCOME.timingAim;
  let lo = -1, hi = 1;
  if ((f(lo) - target)*(f(hi) - target) > 0) return 0;      // mira satura (|aimT| = 1): ritmo non ricostruibile → 0
  for (let i = 0; i < 40; i++){ const m = (lo + hi)/2; if ((f(lo) - target)*(f(m) - target) <= 0) hi = m; else lo = m; }
  const aimT = (lo + hi)/2;
  return clamp(t - aimT, -RHYTHM.max, RHYTHM.max);
}

// Dai registri di una diagnostica ai colpi di chi gioca con la palla entro `within` m dalla rete all'impatto, oppure con la
// caduta entro `within` (i «nove colpi» della tabella di docs/b17/analisi-e-piano.md §4.1 sono stati scelti così).
export function extractShots(events, { within = 7, all = false, session = '' } = {}){
  const ev = events.filter(e => e && typeof e === 'object');
  const palle = ev.filter(e => e.k === 'palla'), rimb = ev.filter(e => e.k === 'rimbalzo'), tel = ev.filter(e => e.k === 'tel.colpo');
  const shots = ev.filter(e => e.k === 'colpo.gioco' || e.k === 'servizio'), out = [];
  for (const R of ev.filter(e => e.k === 'racchetta' && e.chi === 'player')){
    const p = palle.filter(e => e.t <= R.t).at(-1); if (!p) continue;
    const ballZ = Math.abs(p.p[2]), land = Math.abs(R.z);
    if (!all && ballZ > within && land > within) continue;
    // palla corta: rimbalzo dell'avversario nella propria metà prima del colpo, caduta entro la riga del servizio, palla entro 7 m
    const lastOpp = rimb.filter(e => e.t <= R.t && (e.da === 'opponent' || e.da === 'p2')).at(-1);
    const ownAfter = lastOpp ? rimb.some(e => e.t > lastOpp.t && e.t <= R.t && e.da === 'player') : false;
    const bounced = !!lastOpp && !ownAfter && R.t - lastOpp.t < 3000 && Math.sign(lastOpp.z) === Math.sign(p.p[2]);
    // colpi dello scambio fin qui (approssimato: colpi di gioco dall'ultimo servizio)
    const lastServe = shots.filter(e => e.k === 'servizio' && e.t <= R.t).at(-1);
    const rally = 1 + shots.filter(e => e.k === 'colpo.gioco' && e.t <= R.t && (!lastServe || e.t > lastServe.t)).length;
    const tc = tel.find(e => e.n === R.n), forma = tc?.forma || {}, inten = tc?.intenzione || {};
    const t = R.tempo, pressure = R.pressione ?? 1, quality = clamp(R.qualita/Math.max(.2, pressure)/Math.max(.5, timingQualityOf(t)));
    out.push({
      session, n: R.n, at: r(R.t/1000, 1), grade: R.voto, cause: R.causa,
      intent: { shot: R.voluto, power: R.forza, typePower: R.forzaTipo ?? null, depth: R.profondita, rise: Number.isFinite(forma.salita) ? forma.salita : 0, face: R.piatto, conf: Number.isFinite(inten.conf) ? inten.conf : null, riseRef: inten.abituale ?? null, plane: forma.piano ?? null },
      timing: R.tempoMs/1000, ballVz: p.v[2], contact: R.lato, hitX: R.palla, hitZ: r(ballZ), contactY: p.p[1],
      quality: r(quality, 3), pressure, rhythm: r(rhythmFromAim({ aim: R.mira, t, contact: R.lato, face: R.piatto }), 3),
      volley: !!R.volee, net: ballZ + IMPACT.contactAhead < 5, shortBall: bounced && !R.volee && rally > 1 && Math.abs(lastOpp.z) <= 6.4 && ballZ <= 7,
      bounceZ: bounced ? r(Math.abs(lastOpp.z)) : null, rally, phonePeak: tc?.pk ?? null, phoneAngle: tc?.ampiezza ?? null,
      recorded: { x: R.x, depth: -R.z, clear: R.rete_m, flight: R.volo, weak: !!R.debole, failed: !!R.fallito, netFault: !!R.rete, shot: R.colpo, q: R.qualita, t: R.tempo, aim: R.mira, assist: R.aiuto },
    });
  }
  return out;
}

// Il colpo rigiocato in strokeOutcome (e il volo come lo calcola il motore, _natpfRacketShot, senza la striscia di perfetti)
export function replay(s, difficulty = 'leggenda'){
  const lv = skillLevel(difficulty);
  const out = strokeOutcome({ intent: s.intent, timing: s.timing, lateSpan: lateSpanOf(s.ballVz, lv), ballVz: s.ballVz, contact: s.contact, hitX: s.hitX, hitZ: s.hitZ,
    quality: s.quality, pressure: s.pressure, rhythm: s.rhythm, contactY: s.contactY, volley: s.volley, net: s.net, shortBall: s.shortBall, level: lv });
  let flight;
  if (out.shot === 'LOB' || (out.attack && out.shot !== 'SMASH')) flight = out.flight;
  else if (out.shot === 'DROP') flight = Math.max(1.32, (s.hitZ + out.depth)/10);
  else {
    const K = Math.max(.84, 1 - Math.min(8, s.rally)*.015), base = Math.max(.58, .84/Math.min(1.5, (.8 + s.intent.power*.85)*.94))*K;
    flight = outcomeFlight({ ...out, flight: null }, { fromY: Math.max(.78, Math.min(1.92, s.contactY)), fromZ: s.hitZ, toZ: -out.depth, flight: mistimeFlight(streakFlight(base, 1, lv), out.q) });
  }
  return { ...out, flight: r(flight, 3), kmh: r(3.6*Math.hypot(s.hitZ + out.depth, out.x - s.hitX)/flight, 0) };
}

export const same = (a, b, tol = .02) => Math.abs(a - b) <= tol;
// riproduzione: il rigiocato coincide con il registrato (x, profondità, altezza sulla rete, debole, fallito)
export const reproduces = (s, o) => same(o.x, s.recorded.x, .03) && same(o.depth, s.recorded.depth, .03) && same(o.clear, s.recorded.clear, .03) && o.weak === s.recorded.weak && o.failed === s.recorded.failed;

const fmt = v => (v == null ? '–' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? 'sì' : 'no') : String(v));
export function table(shots){
  const rows = [['sessione·n', 's', 'palla z', 'y', 'vz', 'gesto', 'forza', 'conf', 'tempo', 'q', 'rete', 'corta', '| reg x', 'prof', 'rete m', 'volo', 'deb', 'fall', '| nuovo x', 'prof', 'rete m', 'volo', 'km/h', 'deb', 'fall', 'colpo', 'uguale']];
  for (const s of shots){
    const o = replay(s), R = s.recorded;
    rows.push([`${s.session}·${s.n}`, s.at, s.hitZ, r(s.contactY), r(s.ballVz, 1), s.intent.shot, s.intent.power, s.intent.conf ?? '–', s.recorded.t, s.quality, s.net, s.shortBall,
      R.x, R.depth, R.clear, R.flight, R.weak, R.failed, o.x, o.depth, o.clear, o.flight, o.kmh, o.weak, o.failed, o.shot + (o.netVolley ? '·volée' : o.controlled ? '·controllato' : o.attack ? '·attacco' : ''), reproduces(s, o)].map(fmt));
  }
  const w = rows[0].map((_, i) => Math.max(...rows.map(x => x[i].length)));
  return rows.map(x => x.map((c, i) => c.padEnd(w[i])).join('  ')).join('\n');
}

// I colpi estratti dalle due diagnostiche (extractShots su eventi.jsonl, --json), così la prova non ha bisogno dei file
export const FIXTURE = [
  {"session":"wqdk","n":112,"at":22.5,"grade":"EARLY","cause":null,"intent":{"shot":"drop","power":0.263,"typePower":0.332,"depth":0.233,"rise":-0.753,"face":0,"conf":0.14,"riseRef":-0.32,"plane":-0.09},"timing":0.1248,"ballVz":11.7,"contact":1,"hitX":-5.4,"hitZ":9.15,"contactY":0.93,"quality":0.731,"pressure":0.91,"rhythm":0.6,"volley":false,"net":false,"shortBall":false,"bounceZ":5.96,"rally":16,"phonePeak":626,"phoneAngle":60,"recorded":{"x":-1.77,"depth":1.88,"clear":1.56,"flight":1.32,"weak":false,"failed":false,"netFault":false,"shot":"DROP","q":0.665,"t":0.648,"aim":-0.143,"assist":0}},
  {"session":"wqdk","n":121,"at":36.6,"grade":"EARLY","cause":"in allungo","intent":{"shot":"flat","power":0.748,"typePower":0.744,"depth":0.748,"rise":-0.306,"face":-1,"conf":0.62,"riseRef":-0.32,"plane":0.972},"timing":0.21,"ballVz":5.5,"contact":1,"hitX":2.16,"hitZ":3.49,"contactY":0.53,"quality":0.619,"pressure":1,"rhythm":0.548,"volley":false,"net":true,"shortBall":true,"bounceZ":2.75,"rally":2,"phonePeak":1210,"phoneAngle":103,"recorded":{"x":-5.04,"depth":6.79,"clear":2.32,"flight":1.216,"weak":true,"failed":true,"netFault":false,"shot":"FLAT","q":0.619,"t":0.778,"aim":-1.307,"assist":0}},
  {"session":"wqdk","n":131,"at":54.4,"grade":"EARLY","cause":null,"intent":{"shot":"slice","power":0.778,"typePower":0.769,"depth":0.778,"rise":-0.931,"face":0.514,"conf":1,"riseRef":-0.32,"plane":0.437},"timing":0.07840000000000001,"ballVz":10.5,"contact":1,"hitX":4.23,"hitZ":6.88,"contactY":0.51,"quality":1,"pressure":1,"rhythm":0.555,"volley":false,"net":false,"shortBall":true,"bounceZ":5.81,"rally":2,"phonePeak":1239,"phoneAngle":115,"recorded":{"x":2.82,"depth":9.87,"clear":1.3,"flight":0.903,"weak":false,"failed":false,"netFault":false,"shot":"SLICE","q":1,"t":0.367,"aim":0.621,"assist":1}},
  {"session":"q79f","n":139,"at":3.1,"grade":"PERFECT","cause":null,"intent":{"shot":"drop","power":0.098,"typePower":0.194,"depth":0.078,"rise":-0.5,"face":-1,"conf":0.83,"riseRef":-0.291,"plane":0.332},"timing":-0.0011,"ballVz":21.5,"contact":1,"hitX":-2.39,"hitZ":12.21,"contactY":1.79,"quality":0.942,"pressure":1,"rhythm":0.239,"volley":false,"net":false,"shortBall":false,"bounceZ":4.19,"rally":2,"phonePeak":440,"phoneAngle":31,"recorded":{"x":-3.16,"depth":1.93,"clear":1.43,"flight":1.414,"weak":false,"failed":false,"netFault":false,"shot":"DROP","q":0.942,"t":-0.018,"aim":-0.817,"assist":1}},
  {"session":"q79f","n":142,"at":6.2,"grade":"PERFECT","cause":"in allungo","intent":{"shot":"topspin","power":0.845,"typePower":0.829,"depth":0.845,"rise":0.319,"face":-0.993,"conf":1,"riseRef":-0.274,"plane":-0.34},"timing":0.09440000000000001,"ballVz":3.8,"contact":-1,"hitX":-1.66,"hitZ":4.03,"contactY":0.51,"quality":0.619,"pressure":1,"rhythm":0.172,"volley":false,"net":true,"shortBall":true,"bounceZ":3.53,"rally":4,"phonePeak":1344,"phoneAngle":108,"recorded":{"x":-2.85,"depth":6.8,"clear":2.51,"flight":1.172,"weak":true,"failed":true,"netFault":false,"shot":"TOPSPIN","q":0.619,"t":0.35,"aim":-0.733,"assist":0}},
  {"session":"q79f","n":145,"at":13.4,"grade":"VERY EARLY","cause":null,"intent":{"shot":"topspin","power":0.768,"typePower":0.764,"depth":0.768,"rise":0.196,"face":1,"conf":1,"riseRef":-0.274,"plane":-0.579},"timing":0.1901,"ballVz":16.5,"contact":-1,"hitX":-3.14,"hitZ":11.69,"contactY":0.45,"quality":0.987,"pressure":1,"rhythm":0.267,"volley":false,"net":false,"shortBall":false,"bounceZ":10.12,"rally":10,"phonePeak":1251,"phoneAngle":139,"recorded":{"x":6.01,"depth":6.86,"clear":1.51,"flight":0.912,"weak":false,"failed":false,"netFault":false,"shot":"TOPSPIN","q":0.855,"t":1.267,"aim":2,"assist":0}},
  {"session":"q79f","n":148,"at":19.4,"grade":"EARLY","cause":null,"intent":{"shot":"flat","power":0.773,"typePower":0.768,"depth":0.773,"rise":-0.283,"face":-1,"conf":0.45,"riseRef":-0.349,"plane":0.783},"timing":0.1171,"ballVz":19.5,"contact":1,"hitX":4.68,"hitZ":11.33,"contactY":1.69,"quality":0.825,"pressure":1,"rhythm":0.21,"volley":false,"net":false,"shortBall":false,"bounceZ":4.44,"rally":13,"phonePeak":1257,"phoneAngle":164,"recorded":{"x":-4.69,"depth":6.96,"clear":1.27,"flight":0.679,"weak":false,"failed":false,"netFault":false,"shot":"FLAT","q":0.825,"t":0.781,"aim":-1.614,"assist":0.75}},
  {"session":"q79f","n":159,"at":43,"grade":"PERFECT","cause":"in allungo","intent":{"shot":"lob","power":0.36,"typePower":0.417,"depth":0.341,"rise":0.572,"face":1,"conf":0.24,"riseRef":-0.234,"plane":0.371},"timing":0.030699999999999998,"ballVz":7.4,"contact":-1,"hitX":0.37,"hitZ":6.29,"contactY":0.96,"quality":0.619,"pressure":0.925,"rhythm":0.53,"volley":false,"net":false,"shortBall":true,"bounceZ":3.35,"rally":33,"phonePeak":759,"phoneAngle":81,"recorded":{"x":2.4,"depth":6.8,"clear":3.93,"flight":2.011,"weak":true,"failed":true,"netFault":false,"shot":"LOB","q":0.573,"t":0.114,"aim":0.642,"assist":0}},
];

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const files = process.argv.slice(2).filter(a => !a.startsWith('--')), json = process.argv.includes('--json'), all = process.argv.includes('--tutti');
  let shots = [];
  if (files.length) for (const f of files){
    const events = readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } });
    const session = (events.find(e => e?.k === 'sessione')?.id || f).replace(/^\d+-\d+-/, '');
    shots.push(...extractShots(events, { all, session }));
  }
  else shots = FIXTURE;
  if (json) console.log(JSON.stringify(shots, null, 1));
  else {
    console.log(table(shots));
    const ok = shots.filter(s => reproduces(s, replay(s))).length;
    console.log(`\n${shots.length} colpi; rigiocato uguale al registrato: ${ok}/${shots.length}`);
  }
}
