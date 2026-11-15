// B40 · banco delle soglie dei 12 trofei della card (natpf_trofei.js) su partite simulate senza grafica.
// Motore vero senza disegno (headless-engine via rally-balance.simulate), giocatori simulati del telefono (PHONE_PROFILES
// di rally-balance, più «principiante»: adulto alla prima volta, definito qui), statistiche vere della partita
// (natpf_match_stats, contatori del B40.1) e trofei veri (natpf_trofei.trophiesOf). Configurazione come allo stand (valori
// di base del gioco): battuta «Sempre lo stesso» (contro la CPU batte sempre chi gioca), formato classico contro la CPU,
// scambio caldo acceso (B42), 1 game («in fiera si gioca un game»); ogni partita è un visitatore nuovo (eventoReset).
// Portato dall'analisi del B40 (docs/coda/B40-piano-analisi.md §2: trofei-sim.mjs + analisi2.mjs).
//
// Uso (da natpf-tennis):
//   node --import ./test/register.mjs scripts/audit/b40-trofei.mjs                 giro completo (8000 partite, ~7 min a 2 processi)
//   node --import ./test/register.mjs scripts/audit/b40-trofei.mjs --jobs=4        con 4 processi
//   node --import ./test/register.mjs scripts/audit/b40-trofei.mjs --veloce        2 gruppi × 40 partite (prova: stesse righe ogni volta)
//   node --import ./test/register.mjs scripts/audit/b40-trofei.mjs --righe=f.jsonl le partite (una riga JSON ciascuna) anche in un file
//   node --import ./test/register.mjs scripts/audit/b40-trofei.mjs --da=f.jsonl    solo le tabelle, dalle partite di un giro fatto
// ATTENZIONE: giocatori simulati, non persone (nel gioco simulato si vince molto e gli scambi sono lunghi): le soglie sono
// provvisorie, da rivedere con il registro dello stand e dopo il B48 (servizio con le scelte: ace e km/h).
import { fork } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simulate } from './rally-balance.mjs';
import { phoneServeOf } from './servizio.mjs';
import { eventoReset } from '../../src/natpf/natpf_evento.js';
import { installMatchStats, sideSummary, LEVEL_WEIGHT } from '../../src/natpf/natpf_match_stats.js';
import { TROPHY_IDS, trophiesOf, trophyTier } from '../../src/natpf/natpf_trofei.js';

const ARGS = process.argv.slice(2);
const arg = (k, d) => { const a = ARGS.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const has = k => ARGS.includes(`--${k}`);

// profilo in più (non in rally-balance): adulto alla prima volta, tra «bambino» e «umano» (gesto dopo il rimbalzo come
// «umano», tempo e polso meno precisi, gesto più debole, quasi mai la mira voluta)
export const CUSTOM = { principiante: { swing: true, prep: .3, intent: .2, timingSd: .11, wristSd: .4, peak: 520, peakSd: 150, rel: .7, specials: .02, afterBounce: .25, afterBounceSd: .08 } };
// servizio del telefono «con la forma» (servizio.mjs, PHONE_SERVES: ipotesi del B18.2, non dati di persone)
export const SERVE_AUTO = { bambino: 'piano', principiante: 'tardi', umano: 'insegnato', amatore: 'insegnato', medioTel: 'insegnato', tennista: 'forte' };
// gruppi del giro completo (come l'analisi): 18 gruppi a 1 game con i semi 7 e 31 (200 partite ciascuno), 4 al meglio di 3
export const GROUPS_1 = ['bambino bambini', 'bambino casual', 'bambino evento', 'principiante bambini', 'principiante casual', 'principiante evento',
  'umano casual', 'umano evento', 'umano pro', 'amatore casual', 'amatore evento', 'medioTel evento', 'medioTel pro',
  'tennista evento', 'tennista pro', 'tennista leggenda', 'umano leggenda', 'principiante pro'];
export const GROUPS_2 = ['bambino bambini', 'principiante evento', 'umano evento', 'tennista pro'];
export function plan({ veloce = false } = {}){
  if (veloce) return [{ profile: 'umano', level: 'evento', games: 1, seed: 7, matches: 40 }, { profile: 'bambino', level: 'bambini', games: 1, seed: 7, matches: 40 }];
  const out = [];
  for (const seed of [7, 31]) for (const g of GROUPS_1){ const [profile, level] = g.split(' '); out.push({ profile, level, games: 1, seed, matches: 200 }); }
  for (const g of GROUPS_2){ const [profile, level] = g.split(' '); out.push({ profile, level, games: 2, seed: 11, matches: 200 }); }
  return out;
}

// Un gruppo: `matches` partite di fila, ognuna un visitatore nuovo. Restituisce una riga per partita (vista di chi gioca)
export function runGroup({ profile = 'umano', level = 'evento', games = 1, seed = 7, matches = 40, serve = 'auto' } = {}){
  const model = serve === 'auto' ? (SERVE_AUTO[profile] || 'insegnato') : serve;
  const rows = [];
  try {
    simulate({ profile: CUSTOM[profile] || profile, difficulty: level, points: 1e9, seed, maxSeconds: 1e7,
      serve: (e, rng) => phoneServeOf(model, e, rng),
      setup: e => {
        e.natpfServeRule = 'fissa'; e.natpfFair = false; e.matchConfig.gamesToWin = games;
        installMatchStats(e, { onEnd: m => { const s = sideSummary(m, 'player'); rows.push({ ...s, errors: undefined, timing: undefined, perfetti: s.timing.perfetto, gamesWon: s.games, profile, level, games, seed, serve: model }); } });
      },
      onStep: e => {
        if (rows.length >= matches) throw new Error('__fine__');
        if (e.phase === 'MATCH_OVER'){ eventoReset(); e.startNewMatch({ showStartBanner: false }); }
      } });
  } catch (err){ if (String(err?.message) !== '__fine__') throw err; }
  return rows;
}
// riga del banco → vista per natpf_trofei (sideSummary con timing.perfetto)
export const sumOfRow = r => ({ ...r, timing: { perfetto: r.perfetti | 0 }, gamesPlayed: r.gamesPlayed || Math.max(1, (r.games | 0)) });
export const ctxOfRow = r => ({ mode: 'cpu', level: r.level });

/* ---------- tabelle ---------- */
const pct = (n, d) => (d ? +(100*n/d).toFixed(1) : 0);
const NAMES = TROPHY_IDS.filter(id => id !== 'prima' && id !== 're');
const tiersOf = r => { const t = Object.fromEntries(NAMES.map(n => [n, 0])); for (const x of trophiesOf(sumOfRow(r), ctxOfRow(r))) if (x.id in t) t[x.id] = x.tier; return t; };
// miscela «chi gioca la prima volta» allo stand (IPOTESI: Chi gioca Adulto → Evento, Bambino → Bambini, Ragazzo → Facile)
export const MIX = { 'g1 principiante/evento': .35, 'g1 umano/evento': .25, 'g1 bambino/bambini': .25, 'g1 principiante/casual': .10, 'g1 bambino/casual': .05 };
const DAYMIX = { ...MIX, 'g1 amatore/evento': .05, 'g1 medioTel/evento': .05, 'g1 umano/pro': .02, 'g1 tennista/pro': .01 };
const ORDER = ['bambino/bambini', 'bambino/casual', 'bambino/evento', 'principiante/bambini', 'principiante/casual', 'principiante/evento', 'principiante/pro',
  'umano/casual', 'umano/evento', 'umano/pro', 'umano/leggenda', 'amatore/casual', 'amatore/evento', 'medioTel/evento', 'medioTel/pro', 'tennista/evento', 'tennista/pro', 'tennista/leggenda'];
function rngOf(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; }; }
export function tables(rows){
  const L = [];
  const groups = new Map(), key = r => `g${r.games} ${r.profile}/${r.level}`;
  for (const r of rows){ const k = key(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const keys = [...groups.keys()].sort((a, b) => a.slice(0, 2).localeCompare(b.slice(0, 2)) || ORDER.indexOf(a.slice(3)) - ORDER.indexOf(b.slice(3)) || a.localeCompare(b));
  L.push(`partite simulate: ${rows.length} (semi ${[...new Set(rows.map(r => r.seed))].join(', ')})`);
  L.push('\n## quota di partite con il trofeo: bronzo o più / oro (%)');
  L.push(''.padEnd(26) + NAMES.map(n => n.slice(0, 9).padStart(10)).join('') + '   vinte');
  for (const k of keys){
    const G = groups.get(k), T = G.map(tiersOf);
    L.push(k.padEnd(26) + NAMES.map(n => `${Math.round(pct(T.filter(t => t[n] >= 1).length, G.length))}/${Math.round(pct(T.filter(t => t[n] === 3).length, G.length))}`.padStart(10)).join('') + `   ${Math.round(pct(G.filter(r => r.won).length, G.length))}%`);
  }
  L.push('\n## trofei per partita (senza Prima volta e Re di oggi): 0 / 1 / 2 / 3+ (%) · almeno un oro (%) · media');
  const countRow = G => { const c = [0, 0, 0, 0]; let gold = 0, sum = 0; for (const r of G){ const t = tiersOf(r), n = NAMES.filter(x => t[x] >= 1).length; c[Math.min(3, n)]++; sum += n; if (NAMES.some(x => t[x] === 3)) gold++; } return { c: c.map(x => pct(x, G.length)), gold: pct(gold, G.length), mean: +(sum/G.length).toFixed(2) }; };
  for (const k of keys){ const R = countRow(groups.get(k)); L.push(`${k.padEnd(26)} ${R.c.map(x => String(Math.round(x)).padStart(4)).join(' ')}   oro ${String(Math.round(R.gold)).padStart(3)}   media ${R.mean}`); }
  const mixStat = fn => { let s = 0, w = 0; for (const [k, p] of Object.entries(MIX)){ const G = groups.get(k); if (!G) continue; s += p*fn(G); w += p; } return w ? s/w : 0; };
  L.push('\n## miscela «prima volta» (35% principiante/Evento, 25% umano/Evento, 25% bambino/Bambini, 10% principiante/Facile, 5% bambino/Facile)');
  for (const n of NAMES) L.push(`${n.padEnd(11)} bronzo+ ${mixStat(G => pct(G.filter(r => tiersOf(r)[n] >= 1).length, G.length)).toFixed(1).padStart(5)}%   argento+ ${mixStat(G => pct(G.filter(r => tiersOf(r)[n] >= 2).length, G.length)).toFixed(1).padStart(5)}%   oro ${mixStat(G => pct(G.filter(r => tiersOf(r)[n] === 3).length, G.length)).toFixed(1).padStart(5)}%`);
  const dist = [0, 1, 2, 3].map(i => mixStat(G => pct(G.filter(r => Math.min(3, NAMES.filter(x => tiersOf(r)[x] >= 1).length) === i).length, G.length)));
  const anyGold = mixStat(G => pct(G.filter(r => NAMES.some(x => tiersOf(r)[x] === 3)).length, G.length));
  // «Prima volta» prende il posto del terzo: quante volte il terzo non è un bronzo (argento o oro tolto dalla card)
  const thirdHigh = mixStat(G => pct(G.filter(r => { const l = trophiesOf(sumOfRow(r), ctxOfRow(r)); return l.length >= 3 && l[2].tier >= 2; }).length, G.length));
  L.push(`trofei del gioco per partita: 0 ${dist[0].toFixed(1)}% · 1 ${dist[1].toFixed(1)}% · 2 ${dist[2].toFixed(1)}% · 3+ ${dist[3].toFixed(1)}%  → con «Prima volta»: 1 trofeo ${dist[0].toFixed(1)}%, 2 trofei ${dist[1].toFixed(1)}%, 3+ ${(dist[2] + dist[3]).toFixed(1)}% · almeno un oro ${anyGold.toFixed(1)}%`);
  L.push(`«Prima volta» al posto di un terzo trofeo d'argento o d'oro: ${thirdHigh.toFixed(1)}% delle prime partite`);
  L.push('\n## raggiungibile? miglior gruppo per ogni trofeo e livello (% di partite)');
  for (const n of NAMES){
    const best = tier => keys.map(k => ({ k, p: pct(groups.get(k).filter(r => tiersOf(r)[n] >= tier).length, groups.get(k).length) })).sort((a, b) => b.p - a.p)[0];
    L.push(`${n.padEnd(11)} ${[1, 2, 3].map(t => { const b = best(t); return `${['', 'bronzo', 'argento', 'oro'][t]} ${b.p}% (${b.k})`; }).join(' · ')}`);
  }
  // distribuzioni dei valori dei trofei a soglie (p50 / p90 / p95 / massimo) nei gruppi della miscela
  L.push('\n## distribuzioni (p50 / p90 / p95 / max) nei gruppi della miscela');
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p*s.length))] : 0; };
  const VAL = { cecchino: r => r.perfetti, razzo: r => r.fastest, maratoneta: r => r.longest, asso: r => r.unreturned, ace: r => r.aces, vincente: r => r.winners, super: r => r.superOk, serie: r => r.streak, muro: r => r.wall };
  for (const k of Object.keys(MIX)){ const G = groups.get(k); if (!G) continue;
    L.push(`${k.padEnd(26)} ` + Object.entries(VAL).map(([n, f]) => { const a = G.map(f); return `${n} ${q(a, .5)}/${q(a, .9)}/${q(a, .95)}/${Math.max(...a)}`; }).join(' · ')); }
  // Re di oggi: giornate di N partite dalla miscela (più qualche persona già brava), posto al momento della partita
  // (prima le vinte, poi per punteggio; a pari prima chi l'ha fatto prima); solo vinte e da RE_MIN partite in classifica
  L.push('\n## Re di oggi: quota di partite con oro (1°), argento (2°), bronzo (3°)');
  const pick = (R, mix) => { let u = R()*Object.values(mix).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(mix)){ if ((u -= w) <= 0) return k; } return Object.keys(mix)[0]; };
  for (const N of [20, 40, 80, 150]){
    const R = rngOf(N*97 + 1); let tot = 0; const t = [0, 0, 0, 0];
    for (let day = 0; day < 400; day++){
      const board = [];
      for (let i = 0; i < N; i++){
        const G = groups.get(pick(R, DAYMIX)); if (!G) continue;
        const r = G[Math.floor(R()*G.length)];
        const e = { win: !!r.won, score: Math.round(100*r.points/Math.max(1, r.points + r.lost)*LEVEL_WEIGHT[r.level]), at: i };
        board.push(e); board.sort((x, y) => (y.win ? 1 : 0) - (x.win ? 1 : 0) || y.score - x.score || x.at - y.at);
        tot++; t[trophyTier('re', { won: e.win }, { mode: 'cpu', rank: { rank: board.indexOf(e) + 1, total: board.length } })]++;
      }
    }
    L.push(`giornata di ${String(N).padStart(3)} partite: oro ${pct(t[3], tot)}% · argento ${pct(t[2], tot)}% · bronzo ${pct(t[1], tot)}%`);
  }
  return L.join('\n');
}

/* ---------- da riga di comando ---------- */
const MAIN = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (MAIN && process.env.B40_WORKER){
  const g = JSON.parse(process.env.B40_WORKER);
  process.send(runGroup(g));
} else if (MAIN){
  const t0 = Date.now();
  let rows = [];
  if (arg('da')) rows = readFileSync(arg('da'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  else {
    const P = plan({ veloce: has('veloce') }), jobs = Math.max(1, +arg('jobs', 2) | 0);
    if (jobs === 1 || has('veloce')) for (const g of P) rows.push(...runGroup(g));
    else {
      const queue = [...P], out = new Array(P.length);
      const worker = () => new Promise(done => {
        const next = () => {
          const g = queue.shift(); if (!g) return done();
          const i = P.indexOf(g);
          const c = fork(fileURLToPath(import.meta.url), [], { env: { ...process.env, B40_WORKER: JSON.stringify(g) }, execArgv: process.execArgv });
          c.on('message', r => { out[i] = r; });
          c.on('exit', code => { if (code) process.stderr.write(`gruppo ${JSON.stringify(g)}: uscita ${code}\n`); next(); });
        };
        next();
      });
      await Promise.all(Array.from({ length: jobs }, worker));
      rows = out.flat().filter(Boolean);
    }
    if (arg('righe')) writeFileSync(arg('righe'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  }
  console.log(tables(rows));
  process.stderr.write(`\n${rows.length} partite in ${((Date.now() - t0)/1000).toFixed(1)} s\n`);
}
