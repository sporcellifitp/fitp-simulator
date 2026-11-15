// B40 (analisi) · prova delle soglie dei 12 trofei sulle partite simulate (sim/out/*.jsonl di trofei-sim.mjs).
//   node analisi2.mjs                 tabelle per gruppo, miscela «prima volta», raggiungibilità, Re di oggi
// Regole e soglie in RULES (le stesse proposte nel piano, sezione 2). Solo numeri del gioco simulato.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(here, process.env.SIMOUT || 'out');
const rows = [];
for (const f of readdirSync(OUT).filter(f => f.endsWith('.jsonl'))) for (const l of readFileSync(path.join(OUT, f), 'utf8').split('\n')) if (l.trim()) rows.push(JSON.parse(l));
const pct = (n, d) => (d ? +(100*n/d).toFixed(1) : 0);
const LEVEL_WEIGHT = { bambini: 1, casual: 1.1, evento: 1.4, pro: 1.6, leggenda: 5 };
const gamesOf = r => Math.max(1, (r.gamesWon | 0) + (r.gamesLost | 0));

// ---- regole proposte: tier 0 (niente), 1 bronzo, 2 argento, 3 oro --------------------------------------------------
const byT = (v, t) => (v >= t[2] ? 3 : v >= t[1] ? 2 : v >= t[0] ? 1 : 0);
// soglie «per game giocato» (contatori che crescono con la partita): soglia × game giocati
const perGame = (v, t, g) => byT(v, t.map(x => x*g));
// Game a zero: bronzo a Bambini, Facile ed Evento; argento a Esperta; oro a Leggenda; un game a zero in più = un livello in più
const LEVEL_TIER = { bambini: 1, casual: 1, evento: 1, pro: 2, leggenda: 3 };
// soglie dei contatori «massimo della partita» che crescono con la durata (Muro): × radice dei game giocati
const sqrtGame = (v, t, g) => byT(v, t.map(x => Math.round(x*Math.sqrt(g))));
export const RULES = {
  cecchino:   r => perGame(r.perfetti, [16, 21, 27], gamesOf(r)),
  razzo:      r => byT(r.fastest, [140, 155, 170]),
  maratoneta: r => byT(r.longest, [30, 34, 38]),
  asso:       r => byT(r.aces, [1, 2, 3]),
  vincente:   r => perGame(r.winners, [4, 5, 6], gamesOf(r)),
  super:      r => byT(r.superOk, [1, 2, 3]),
  gameAZero:  r => (r.love >= 1 ? Math.min(3, LEVEL_TIER[r.level] + (r.love - 1)) : 0),
  // (solo partite vinte) bronzo: una palla match annullata, o un game vinto da due punti sotto (0-30, 15-40), o la partita
  // vinta da un game sotto; argento: 2 palle match annullate; oro: 3 o più (per esempio da 0-40)
  rimonta:    r => (!r.won ? 0 : (r.mpSaved | 0) >= 3 ? 3 : (r.mpSaved | 0) >= 2 ? 2 : ((r.mpSaved | 0) >= 1 || r.comebackPts >= 2 || r.comebackGames >= 1) ? 1 : 0),
  // punti di fila: [4, 5, 7] in una partita di un game, due punti in più per ogni game in più
  inSerie:    r => byT(r.streak, [4, 5, 7].map(x => x + 2*(gamesOf(r) - 1))),
  muro:       r => sqrtGame(r.muro, [36, 44, 52], gamesOf(r)),
};
const NAMES = Object.keys(RULES);
// «Game a zero» contiene «In serie» fino a 4 punti di fila: se ci sono tutti e due conta il più alto (a pari, Game a zero)
function trophiesOf(r){
  const t = Object.fromEntries(NAMES.map(n => [n, RULES[n](r)]));
  if (t.gameAZero && t.inSerie && t.inSerie <= t.gameAZero) t.inSerie = 0;
  // (da 0-40 si vince solo con 5 punti di fila: la Rimonta contiene «In serie» allo stesso modo)
  if (t.rimonta && t.inSerie && t.inSerie <= t.rimonta) t.inSerie = 0;
  return t;
}
// gruppi
const key = r => `g${r.games} ${r.profile}/${r.level}`;
const groups = new Map();
for (const r of rows){ const k = key(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
const ORDER = ['bambino/bambini', 'bambino/casual', 'bambino/evento', 'principiante/bambini', 'principiante/casual', 'principiante/evento', 'principiante/pro',
  'umano/casual', 'umano/evento', 'umano/pro', 'umano/leggenda', 'amatore/casual', 'amatore/evento', 'medioTel/evento', 'medioTel/pro', 'tennista/evento', 'tennista/pro', 'tennista/leggenda'];
const keys = [...groups.keys()].sort((a, b) => a.slice(0, 2).localeCompare(b.slice(0, 2)) || ORDER.indexOf(a.slice(3)) - ORDER.indexOf(b.slice(3)));

console.log(`partite simulate: ${rows.length} (${[...new Set(rows.map(r => r.seed))].join(', ')} semi)`);
console.log('\n## quota di partite con il trofeo: bronzo o più / oro   (%)');
console.log(''.padEnd(26) + NAMES.map(n => n.slice(0, 9).padStart(10)).join('') + '   vinte');
for (const k of keys){
  const G = groups.get(k), T = G.map(trophiesOf);
  console.log(k.padEnd(26) + NAMES.map(n => `${Math.round(pct(T.filter(t => t[n] >= 1).length, G.length))}/${Math.round(pct(T.filter(t => t[n] === 3).length, G.length))}`.padStart(10)).join('') + `   ${Math.round(pct(G.filter(r => r.won).length, G.length))}%`);
}
console.log('\n## trofei per partita (senza Prima volta e Re di oggi): 0 / 1 / 2 / 3+ (%) · almeno un oro (%) · media');
const countRow = G => { const c = [0, 0, 0, 0]; let gold = 0, sum = 0; for (const r of G){ const t = trophiesOf(r), n = NAMES.filter(x => t[x] >= 1).length; c[Math.min(3, n)]++; sum += n; if (NAMES.some(x => t[x] === 3)) gold++; } return { c: c.map(x => pct(x, G.length)), gold: pct(gold, G.length), mean: +(sum/G.length).toFixed(2) }; };
for (const k of keys){ const R = countRow(groups.get(k)); console.log(`${k.padEnd(26)} ${R.c.map(x => String(Math.round(x)).padStart(4)).join(' ')}   oro ${String(Math.round(R.gold)).padStart(3)}   media ${R.mean}`); }

// miscela «chi gioca la prima volta» allo stand (IPOTESI dell'analisi: Chi gioca Adulto → Evento, Bambino → Bambini, Ragazzo → Facile)
const MIX = { 'g1 principiante/evento': .35, 'g1 umano/evento': .25, 'g1 bambino/bambini': .25, 'g1 principiante/casual': .10, 'g1 bambino/casual': .05 };
function mixStat(fn){ let s = 0; for (const [k, w] of Object.entries(MIX)){ const G = groups.get(k); if (!G) continue; s += w*fn(G); } return s; }
console.log('\n## miscela «prima volta» (35% principiante/Evento, 25% umano/Evento, 25% bambino/Bambini, 10% principiante/Facile, 5% bambino/Facile)');
for (const n of NAMES) console.log(`${n.padEnd(11)} bronzo+ ${mixStat(G => pct(G.filter(r => trophiesOf(r)[n] >= 1).length, G.length)).toFixed(1).padStart(5)}%   argento+ ${mixStat(G => pct(G.filter(r => trophiesOf(r)[n] >= 2).length, G.length)).toFixed(1).padStart(5)}%   oro ${mixStat(G => pct(G.filter(r => trophiesOf(r)[n] === 3).length, G.length)).toFixed(1).padStart(5)}%`);
const dist = [0, 1, 2, 3].map(i => mixStat(G => pct(G.filter(r => Math.min(3, NAMES.filter(x => trophiesOf(r)[x] >= 1).length) === i).length, G.length)));
const anyGold = mixStat(G => pct(G.filter(r => NAMES.some(x => trophiesOf(r)[x] === 3)).length, G.length));
console.log(`trofei del gioco per partita: 0 ${dist[0].toFixed(1)}% · 1 ${dist[1].toFixed(1)}% · 2 ${dist[2].toFixed(1)}% · 3+ ${dist[3].toFixed(1)}%  → con «Prima volta»: 1 trofeo ${dist[0].toFixed(1)}%, 2 trofei ${dist[1].toFixed(1)}%, 3+ ${(dist[2] + dist[3]).toFixed(1)}%  · almeno un oro ${anyGold.toFixed(1)}%`);

console.log('\n## raggiungibile? miglior gruppo per ogni trofeo e livello (% di partite)');
for (const n of NAMES){
  const best = tier => keys.map(k => ({ k, p: pct(groups.get(k).filter(r => trophiesOf(r)[n] >= tier).length, groups.get(k).length) })).sort((a, b) => b.p - a.p)[0];
  console.log(`${n.padEnd(11)} ${[1, 2, 3].map(t => { const b = best(t); return `${['', 'bronzo', 'argento', 'oro'][t]} ${b.p}% (${b.k})`; }).join(' · ')}`);
}

// Re di oggi: giornate di N partite dalla miscela (più qualche partita di persone già brave), posto al momento della partita
// (prima le vinte, poi per punteggio; a pari prima chi l'ha fatto prima). Solo partite vinte, solo da 5 partite in classifica
const DAYMIX = { ...MIX, 'g1 amatore/evento': .05, 'g1 medioTel/evento': .05, 'g1 umano/pro': .02, 'g1 tennista/pro': .01 };
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; }; }
const pick = (R, mix) => { let u = R()*Object.values(mix).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(mix)){ if ((u -= w) <= 0) return k; } return Object.keys(mix)[0]; };
console.log('\n## Re di oggi: quota di partite con oro (1°), argento (2°), bronzo (3°), solo vinte e da 5 partite in classifica');
for (const N of [20, 40, 80, 150]){
  const R = rng(N*97 + 1); let tot = 0, t = [0, 0, 0, 0];
  for (let day = 0; day < 400; day++){
    const board = [];
    for (let i = 0; i < N; i++){
      const G = groups.get(pick(R, DAYMIX)), r = G[Math.floor(R()*G.length)];
      const e = { win: !!r.won, score: Math.round(100*r.points/Math.max(1, r.points + r.lost)*LEVEL_WEIGHT[r.level]), at: i };
      board.push(e); board.sort((x, y) => (y.win ? 1 : 0) - (x.win ? 1 : 0) || y.score - x.score || x.at - y.at);
      const rank = board.indexOf(e) + 1; tot++;
      t[e.win && board.length >= 5 && rank <= 3 ? 4 - rank : 0]++;
    }
  }
  console.log(`giornata di ${String(N).padStart(3)} partite: oro ${pct(t[3], tot)}% · argento ${pct(t[2], tot)}% · bronzo ${pct(t[1], tot)}%`);
}
