// B42 · Scambi lunghi che si chiudono (docs/b42/scambi-lunghi.md). Banco senza grafica sulle regole vere del motore, con
// due serie di semi, per misurare quanto durano gli scambi e come finiscono:
//   --cpu      contro la CPU: profili simulati del telefono (../rally-balance.mjs) a ogni livello (Bambini, Evento,
//              Casual, Pro, Leggenda); partite «Al meglio di 3 game» (la scelta di base contro la CPU)
//   --stesso   stesso schermo, due persone simulate (../b19/due-umani.mjs), formato in fiera a 1 game (la base dal B20)
//   --sfida    sfida tra due computer (la partita la calcola l'host: stesso banco, modo «versus»), formato classico a 1 game
// Per ogni riga: colpi a punto (media, metà entro, 9 su 10 entro, massimo), quota di punti oltre 20 e oltre 30 colpi,
// come finiscono (vincente, errore in rete, errore fuori; di chi), punti vinti, secondi a punto, durata della partita.
// --caldo=base (di base: la regola del gioco così com'è), si o no: scambio caldo forzato acceso o spento
// (engine.natpfHotRally, solo in memoria). --salva=f.json salva le righe; --confronta=f.json stampa prima → dopo.
// Uso, da natpf-tennis:
//   node --import ./test/register.mjs scripts/audit/b42/scambi-lunghi.mjs --cpu [--stesso] [--sfida] [--punti=120]
//        [--partite=1] [--serie=A,B] [--livelli=bambini,evento,casual,pro,leggenda] [--profili=bambino,amatore,umano,tennista]
//        [--coppie=bambino,amatore,medio,tennista,preciso] [--caldo=base|si|no] [--salva=f.json] [--confronta=f.json]
// È un banco di prova deterministico (robot che sbagliano il tempo sempre allo stesso modo), non una misura di persone.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { simulate } from '../rally-balance.mjs';
import { many } from '../b19/due-umani.mjs';
import { eventoReset } from '../../../src/natpf/natpf_evento.js';
// --hot='{"cpuErr":.03}': valori di prova dello scambio caldo, solo in memoria (natpf_hot_rally.hotTuning; il modulo
// c'è solo dal B42: nella base senza la regola l'opzione non fa niente)
const HT = await import('../../../src/natpf/natpf_hot_rally.js').then(m => m.hotTuning).catch(() => null);

const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const has = k => process.argv.includes(`--${k}`);
const list = (k, d) => arg(k, d).split(',').filter(Boolean);
const CALDO = arg('caldo', 'base');
if (arg('hot') && HT) Object.assign(HT, JSON.parse(arg('hot')));
const forceHot = e => { if (CALDO === 'si') e.natpfHotRally = true; else if (CALDO === 'no') e.natpfHotRally = false; };
const SEEDS_CPU = { A: [7, 11, 23], B: [31, 37, 41] };
const SEEDS_DUO = { A: [7001, 7103, 7207], B: [7307, 7411, 7517] };
// --semi=1,2,3…: una serie sola («X») con questi semi (per misure con più punti, es. per vedere il rumore del sorteggio)
if (arg('semi')){ SEEDS_CPU.X = SEEDS_DUO.X = list('semi', '').map(Number); }
const SERIE = arg('semi') ? ['X'] : list('serie', 'A,B');
const CAP = 150;

const qt = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f*s.length))] : 0; };
const pc = (a, n) => (n ? +(100*a/n).toFixed(1) : 0);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0)/a.length : 0);
const r1 = v => +(+v).toFixed(1);
const sha = x => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 12);
const it = v => String(v).replace('.', ',');
const r1d = v => +(+v).toFixed(1);

// riassunto di una serie di punti { n (colpi), end ('vincente'|'rete'|'fuori'|'servizio'|'interrotto'), by ('a'|'b':
// di chi è il colpo che chiude), winA (punto vinto dal lato a), dur (s dal servizio alla fine) } e di partite { sec }
// shots: colpi del telefono { n (numero del colpo nello scambio), sup (colpo super), why (perché no) }
function summary(pts, matches, totalSec, shots = []){
  const n = pts.map(p => p.n), N = pts.length;
  const sh = f => shots.filter(f), early = sh(s => s.n < 20), hot = sh(s => s.n >= 20);
  const why = {}; for (const s of hot) if (!s.sup) why[s.why] = (why[s.why] || 0) + 1;
  const cnt = f => pts.filter(f).length;
  return {
    punti: N, media: r1(mean(n)), p50: qt(n, .5), p90: qt(n, .9), max: Math.max(0, ...n),
    oltre20: pc(cnt(p => p.n > 20), N), oltre30: pc(cnt(p => p.n > 30), N), oltre40: pc(cnt(p => p.n > 40), N),
    // tra i punti oltre 20 colpi: quanti finiscono entro il 35° colpo
    lunghiEntro35: pc(cnt(p => p.n > 20 && p.n <= 35), cnt(p => p.n > 20)),
    vincA: pc(cnt(p => p.end === 'vincente' && p.by === 'a'), N), vincB: pc(cnt(p => p.end === 'vincente' && p.by === 'b'), N),
    reteA: pc(cnt(p => p.end === 'rete' && p.by === 'a'), N), reteB: pc(cnt(p => p.end === 'rete' && p.by === 'b'), N),
    fuoriA: pc(cnt(p => p.end === 'fuori' && p.by === 'a'), N), fuoriB: pc(cnt(p => p.end === 'fuori' && p.by === 'b'), N),
    servizio: pc(cnt(p => p.end === 'servizio'), N), interrotti: cnt(p => p.end === 'interrotto'),
    // negli scambi oltre 20 colpi: chi lo vince e come
    lunghiA: pc(cnt(p => p.n > 20 && p.winA), cnt(p => p.n > 20)),
    vintiA: pc(cnt(p => p.winA), N),
    durPunto: r1(mean(pts.map(p => p.dur))), durP90: r1(qt(pts.map(p => p.dur), .9)), durMax: r1(Math.max(0, ...pts.map(p => p.dur))),
    sAPunto: totalSec != null ? r1(totalSec/Math.max(1, N)) : null,
    partite: matches.length, partitaMedia: r1(mean(matches.map(m => m.sec))), partitaP90: r1(qt(matches.map(m => m.sec), .9)),
    // colpi super dei telefoni prima del 20° colpo e dal 20° in poi (quota dei colpi), e perché no dal 20° in poi
    superPrima: pc(early.filter(s => s.sup).length, early.length), superCaldo: pc(hot.filter(s => s.sup).length, hot.length), colpiCaldo: hot.length,
    perche: Object.fromEntries(Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => [k, pc(v, hot.length)])),
    impronta: sha(pts.map(p => [p.n, p.end, p.by, p.winA])),
  };
}

const end = (why, n) => (why === 'Net' || why === 'Out' ? (n <= 1 ? 'servizio' : why === 'Net' ? 'rete' : 'fuori') : why === 'Cap' || why === 'scambio infinito' ? 'interrotto' : 'vincente');

// contro la CPU: a = chi gioca, b = la CPU
function cpuRow(level, profile, seeds, points){
  const pts = [], matches = [], shots = [];
  let total = 0;
  for (const seed of seeds){
    eventoReset();
    let E = null, tServe = null, mStart = 0;
    const r = simulate({ profile, difficulty: level, points, seed, cap: CAP, maxSeconds: 30000,
      setup: e => {
        E = e; forceHot(e);
        e.matchConfig.gamesToWin = 2;   // «Al meglio di 3 game», la scelta di base contro la CPU
        const sh = e._executeServeHit.bind(e);
        e._executeServeHit = (...a) => { tServe = e.elapsedTime; return sh(...a); };
        const rs = e._natpfRacketShot.bind(e);
        e._natpfRacketShot = (ev, p, o) => { const n = e.ball.rallyStrokeCount + 1, r = rs(ev, p, o), L = e.natpfLastRacket; if (L?.who === 'player') shots.push({ n, sup: !!L.super, why: L.superWhy?.[0] || null }); return r; };
        const aw = e._awardPoint.bind(e);
        e._awardPoint = (who, why = '') => {
          const n = e.ball.rallyStrokeCount, k = end(why, n), by = k === 'vincente' ? (who === 'player' ? 'a' : 'b') : e.ball.lastHitter === 'player' ? 'a' : 'b';
          pts.push({ n, end: k, by, winA: who === 'player', dur: tServe != null ? e.elapsedTime - tServe : 0 });
          tServe = null;
          return aw(who, why);
        };
      },
      onStep: e => { if (e.phase === 'MATCH_OVER'){ matches.push({ sec: e.elapsedTime - mStart }); e.startNewMatch({ showStartBanner: false }); mStart = e.elapsedTime; } } });
    total += E.elapsedTime;
    void r;
  }
  return summary(pts, matches, total, shots);
}

// stesso schermo o sfida tra due computer: a = Player 1, b = Player 2 (stesso profilo; si alternano al servizio)
function duoRow(mode, pair, seeds, matches){
  const [a, b] = pair.includes('/') ? pair.split('/') : [pair, pair];
  const r = many({ a, b, mode, fair: mode === 'split', gamesToWin: 1, matches, cap: CAP, tweak: forceHot }, seeds);
  const pts = r.pts.map(p => ({ n: p.n, end: end(p.why, p.n), by: p.why === 'Net' || p.why === 'Out' ? (p.hitter === 'p1' ? 'a' : 'b') : p.why === 'Cap' ? 'a' : (p.win === 'p1' ? 'a' : 'b'), winA: p.win === 'p1', dur: p.dur }));
  const total = r.matches.reduce((s, m) => s + m.sec, 0);
  return summary(pts, r.matches, total, r.shots.map(s => ({ n: s.n, sup: s.sup, why: s.supWhy })));
}

// --tracce: da dove cambiano le partite. Per ogni prova la stessa partita a sorteggi fissi con lo scambio caldo spento e
// acceso (engine.natpfHotRally, solo in memoria): elenco di tutti i lanci della palla (numero del colpo nello scambio,
// bersaglio, volo, velocità di partenza) e dei punti. Stampa l'impronta della partita spenta (nella copia della base,
// dove la regola non c'era, deve venire uguale: spenta non cambia niente) e il primo lancio diverso tra spenta e accesa,
// che deve essere un colpo dal 20° in poi (prima del 20° colpo la regola non cambia niente).
function trace(kind, who, level, seed, hot){
  const L = [];
  const setup = e => {
    e.natpfHotRally = hot;
    const ln = e._launchBallToTarget.bind(e), aw = e._awardPoint.bind(e);
    e._launchBallToTarget = (from, to, fl, o) => { const r = ln(from, to, fl, o); L.push([e.ball.rallyStrokeCount + 1, ...[to.x, to.z, fl, e.ball.vel.x, e.ball.vel.y, e.ball.vel.z].map(v => +(+v).toFixed(4))]); return r; };
    e._awardPoint = (w, why = '') => { L.push(['punto', w, why, e.ball.rallyStrokeCount]); return aw(w, why); };
  };
  if (kind === 'cpu'){ eventoReset(); simulate({ profile: who, difficulty: level, points: 60, seed, cap: CAP, maxSeconds: 30000, setup }); }
  else many({ a: who, b: who, mode: kind === 'stesso' ? 'split' : 'versus', fair: kind === 'stesso', gamesToWin: 1, matches: 6, cap: CAP, tweak: setup }, [seed]);
  return L;
}
if (has('tracce')){
  // (le ultime cinque contro la CPU sono le partite delle impronte di ../fine-partita.mjs --impronte)
  const PROVE = [['cpu', 'tennista', 'leggenda', 7], ['cpu', 'umano', 'pro', 11], ['cpu', 'amatore', 'evento', 23], ['cpu', 'umano', 'casual', 31], ['cpu', 'bambino', 'bambini', 37],
    ['stesso', 'tennista', '1v1', 7001], ['stesso', 'amatore', '1v1', 7103], ['sfida', 'amatore', '1v1', 7207],
    ['cpu', 'umano', 'evento', 7], ['cpu', 'tennista', 'leggenda', 11], ['cpu', 'bambino', 'bambini', 23], ['cpu', 'medio', 'pro', 31], ['cpu', 'amatore', 'casual', 37]];
  console.log('prova | impronta con lo scambio caldo spento | primo lancio diverso tra spento e acceso');
  for (const [kind, who, level, seed] of PROVE){
    const off = trace(kind, who, level, seed, false), on = has('solo-spenta') ? null : trace(kind, who, level, seed, true);
    let i = 0; if (on) while (i < off.length && i < on.length && JSON.stringify(off[i]) === JSON.stringify(on[i])) i++;
    const pts = off.slice(0, i).filter(x => x[0] === 'punto').length, first = on ? (off[i] || on[i]) : null;
    const where = !on ? '—' : i >= Math.min(off.length, on.length) ? 'nessuno' : `il lancio n. ${i + 1} (punto ${pts + 1}), colpo ${first[0] === 'punto' ? '— (fine punto)' : first[0]}° dello scambio; uguali i ${i} lanci prima`;
    console.log(`${kind} ${who} ${level} seme ${seed} | ${sha(off)} (${off.length} righe) | ${where}`);
  }
}

// --b25: bambino contro adulto nello stesso schermo (B25: fasce «Bambino» e «Adulto», aiuto al più giovane della variante
// in gioco), scambio caldo spento e acceso, i due lati (il bambino da Player 1 e da Player 2), due serie di semi: partite e
// punti vinti dal bambino, colpi a punto, quota oltre 30 colpi, durata della partita
if (has('b25')){
  const ND = await import('../../../src/natpf/natpf_duo_rules.js');
  console.log('| bambino contro | serie | scambio caldo | partite | vince il bambino | punti del bambino | colpi: media · 9 su 10 · max | oltre 30 | partita: media (s) |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const adult of ['medio', 'amatore']) for (const s of SERIE) for (const hot of [false, true]){
    const tw = side => e => { e.natpfHotRally = hot; e.natpfSplitBands = side === 'p1' ? { p1: 'bambino', p2: 'adulto' } : { p1: 'adulto', p2: 'bambino' }; e.natpfHelpVariant = ND.HELP_DEFAULT; };
    const m = +arg('partite', 1)*50;
    const r1 = many({ a: 'bambino', b: adult, fair: true, gamesToWin: 1, matches: m, cap: CAP, tweak: tw('p1') }, SEEDS_DUO[s]);
    const r2 = many({ a: adult, b: 'bambino', fair: true, gamesToWin: 1, matches: m, cap: CAP, tweak: tw('p2') }, SEEDS_DUO[s]);
    const M = [...r1.matches.map(x => x.win === 'p1'), ...r2.matches.map(x => x.win === 'p2')], Pt = [...r1.pts.map(x => x.win === 'p1'), ...r2.pts.map(x => x.win === 'p2')];
    const n = [...r1.pts, ...r2.pts].map(p => p.n), sec = [...r1.matches, ...r2.matches].map(x => x.sec);
    console.log(`| ${adult} | ${s} | ${hot ? 'acceso' : 'spento'} | ${M.length} | ${it(pc(M.filter(Boolean).length, M.length))}% | ${it(pc(Pt.filter(Boolean).length, Pt.length))}% | ${it(r1d(mean(n)))} · ${qt(n, .9)} · ${Math.max(...n)} | ${it(pc(n.filter(x => x > 30).length, n.length))}% | ${it(r1d(mean(sec)))} |`);
  }
}

const rows = {};
const t0 = Date.now();
if (has('cpu')){
  const points = +arg('punti', 120);
  for (const level of list('livelli', 'bambini,evento,casual,pro,leggenda')) for (const profile of list('profili', 'bambino,amatore,umano,tennista')) for (const s of SERIE){
    rows[`cpu|${level}|${profile}|${s}`] = cpuRow(level, profile, SEEDS_CPU[s], points);
  }
}
const N = { bambino: 40, amatore: 40, medio: 40, umano: 40, preciso: 25, tennista: 15 };
for (const [flag, mode] of [['stesso', 'split'], ['sfida', 'versus']]) if (has(flag)){
  const K = +arg('partite', 1);
  for (const pair of list('coppie', flag === 'stesso' ? 'bambino,amatore,medio,tennista,preciso,bambino/medio' : 'amatore,tennista')) for (const s of SERIE){
    const base = pair.split('/').reduce((m, p) => Math.min(m, N[p] || 30), 99);
    rows[`${flag}|${pair}|${s}`] = duoRow(mode, pair, SEEDS_DUO[s], Math.max(4, Math.round(base*K)));
  }
}

// tabelle in markdown (per il documento)
// (con --confronta: «prima → dopo» dove il valore cambia; numeri con la virgola, come nel documento)
const before = arg('confronta') ? JSON.parse(readFileSync(arg('confronta'), 'utf8')).rows : null;
const cell = (k, f) => { const v = rows[k][f]; if (!before?.[k]) return it(v); const b = before[k][f]; return b === v ? it(v) : `${it(b)} → ${it(v)}`; };
const head = (mode) => {
  const A = mode === 'cpu' ? 'chi gioca' : 'P1', B = mode === 'cpu' ? 'CPU' : 'P2';
  console.log(`| riga | serie | punti (interrotti a ${CAP} colpi) | colpi: media · metà · 9 su 10 · max | oltre 20 | oltre 30 | scambi oltre 20 chiusi entro il 35° | vincenti ${A} · ${B} | in rete ${A} · ${B} | fuori ${A} · ${B} | punti vinti ${A} | s a punto | partita: media · 9 su 10 (s) |`);
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
};
// --breve: una riga per riga del banco (per le prove di taratura)
if (has('breve')) for (const k of Object.keys(rows)) console.log(`${k.padEnd(26)} oltre 30 ${cell(k, 'oltre30')}% · 9 su 10 ${cell(k, 'p90')} · max ${cell(k, 'max')} · vinti ${cell(k, 'vintiA')}% · super ${cell(k, 'superCaldo')}% · s a punto ${cell(k, 'sAPunto')}`);
for (const mode of has('breve') ? [] : ['cpu', 'stesso', 'sfida']){
  const keys = Object.keys(rows).filter(k => k.startsWith(mode + '|'));
  if (!keys.length) continue;
  console.log(`\n### ${mode === 'cpu' ? 'Contro la CPU (al meglio di 3 game)' : mode === 'stesso' ? 'Stesso schermo (formato in fiera, 1 game)' : 'Sfida tra due computer (1 game)'} · scambio caldo: ${CALDO}\n`);
  head(mode);
  for (const k of keys){
    const [, a, b, s] = k.split('|'), name = mode === 'cpu' ? `${a} · ${b}` : a, serie = mode === 'cpu' ? s : b;
    console.log(`| ${name} | ${serie} | ${cell(k, 'punti')} (${cell(k, 'interrotti')}) | ${cell(k, 'media')} · ${cell(k, 'p50')} · ${cell(k, 'p90')} · ${cell(k, 'max')} | ${cell(k, 'oltre20')}% | ${cell(k, 'oltre30')}% | ${cell(k, 'lunghiEntro35')}% | ${cell(k, 'vincA')} · ${cell(k, 'vincB')}% | ${cell(k, 'reteA')} · ${cell(k, 'reteB')}% | ${cell(k, 'fuoriA')} · ${cell(k, 'fuoriB')}% | ${cell(k, 'vintiA')}% | ${cell(k, 'sAPunto')} | ${cell(k, 'partitaMedia')} · ${cell(k, 'partitaP90')} |`);
  }
}
if (!has('breve')) console.log('\ncolpi super dei telefoni (quota dei colpi): prima del 20° colpo → dal 20° in poi; perché no, dal 20° in poi');
if (!has('breve')) for (const k of Object.keys(rows)) console.log(`${k}: ${cell(k, 'superPrima')}% → ${cell(k, 'superCaldo')}% (${rows[k].colpiCaldo} colpi) · ${Object.entries(rows[k].perche).map(([w, v]) => `${w} ${it(v)}%`).join(', ')}`);
console.log(`\nimpronte: ${Object.entries(rows).map(([k, v]) => `${k} ${v.impronta}`).join(' · ')}`);
console.log(`(${Math.round((Date.now() - t0)/1000)} s)`);
if (arg('salva')) writeFileSync(arg('salva'), JSON.stringify({ caldo: CALDO, rows }, null, 1));
