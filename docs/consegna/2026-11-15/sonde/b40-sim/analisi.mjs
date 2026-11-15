// B40 (analisi) · distribuzioni dei contatori delle partite simulate (sim/out/*.jsonl, da trofei-sim.mjs) e prova di
// soglie candidate dei trofei: quota di partite con bronzo/argento/oro per profilo e livello, trofei per partita.
//   node analisi.mjs [--dist] [--soglie] [--giorno]
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(here, 'out');
const has = k => process.argv.includes(`--${k}`);
const rows = [];
for (const f of readdirSync(OUT).filter(f => f.endsWith('.jsonl'))) for (const l of readFileSync(path.join(OUT, f), 'utf8').split('\n')) if (l.trim()) rows.push(JSON.parse(l));
const key = r => `g${r.games} ${r.profile}/${r.level}`;
const groups = new Map();
for (const r of rows){ const k = key(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
const ORDER = ['bambino/bambini', 'bambino/casual', 'bambino/evento', 'principiante/bambini', 'principiante/casual', 'principiante/evento', 'principiante/pro',
  'umano/casual', 'umano/evento', 'umano/pro', 'umano/leggenda', 'amatore/casual', 'amatore/evento', 'medioTel/evento', 'medioTel/pro', 'tennista/evento', 'tennista/pro', 'tennista/leggenda'];
const keys = [...groups.keys()].sort((a, b) => a.slice(0, 2).localeCompare(b.slice(0, 2)) || ORDER.indexOf(a.slice(3)) - ORDER.indexOf(b.slice(3)));
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f*s.length))] : null; };
const pct = (n, d) => (d ? (100*n/d).toFixed(0) : '–');

export const FIELDS = ['won', 'played', 'perfetti', 'rated', 'pctPerf', 'fastest', 'longest', 'aces', 'winners', 'superOk', 'streak', 'love', 'at15', 'comebackPts', 'comebackGames', 'muro', 'whiff'];
if (has('dist')){
  for (const f of FIELDS){
    console.log(`\n## ${f}  (p25 / p50 / p75 / p90 / p95 / max · media)`);
    for (const k of keys){
      const a = groups.get(k).map(r => +r[f]);
      const m = a.reduce((x, y) => x + y, 0)/a.length;
      console.log(`${k.padEnd(28)} n ${String(a.length).padStart(3)}  ${[.25, .5, .75, .9, .95].map(x => String(q(a, x))).join(' / ').padEnd(30)} max ${String(Math.max(...a)).padStart(4)} · ${m.toFixed(2)}`);
    }
  }
}

// Trofei candidati: valore dalla partita e soglie [bronzo, argento, oro]. Prima volta e Re di oggi a parte (non sono
// dati del motore): Prima volta = sempre bronzo alla prima partita (qui: ogni partita simulata è di un visitatore nuovo),
// argento se vince almeno 2 punti, oro se vince la partita; Re di oggi dal modello del giorno (--giorno)
export const TROPHIES = {
  cecchino:   { v: r => r.perfetti, t: [3, 8, 15] },
  razzo:      { v: r => r.fastest, t: [100, 130, 155] },
  maratoneta: { v: r => r.longest, t: [10, 25, 45] },
  asso:       { v: r => r.aces, t: [1, 2, 3] },
  vincente:   { v: r => r.winners, t: [2, 4, 6] },
  super:      { v: r => r.superOk, t: [1, 2, 3] },
  gameAZero:  { v: r => r.love, t: [1, 2, 3] },
  rimonta:    { v: r => r.comebackPts, t: [2, 3, 4] },
  inSerie:    { v: r => r.streak, t: [4, 6, 9] },
  muro:       { v: r => r.muro, t: [15, 30, 50] },
};
const tierOf = (T, r) => { const v = T.v(r); return v >= T.t[2] ? 3 : v >= T.t[1] ? 2 : v >= T.t[0] ? 1 : 0; };
if (has('soglie')){
  const names = Object.keys(TROPHIES);
  console.log('\n## quota di partite con il trofeo (bronzo o più) e con l\'oro, per gruppo   [b+% / oro%]');
  console.log(''.padEnd(28) + names.map(n => n.slice(0, 10).padStart(11)).join(''));
  for (const k of keys){
    const G = groups.get(k);
    console.log(k.padEnd(28) + names.map(n => { const T = TROPHIES[n]; const b = G.filter(r => tierOf(T, r) >= 1).length, g = G.filter(r => tierOf(T, r) === 3).length; return `${pct(b, G.length)}/${pct(g, G.length)}`.padStart(11); }).join(''));
  }
  console.log('\n## trofei per partita (senza Prima volta e Re di oggi): quota con 0 / 1 / 2 / 3+ trofei; quota con almeno un oro');
  for (const k of keys){
    const G = groups.get(k), c = [0, 0, 0, 0]; let gold = 0;
    for (const r of G){ const n = names.filter(x => tierOf(TROPHIES[x], r) >= 1).length; c[Math.min(3, n)]++; if (names.some(x => tierOf(TROPHIES[x], r) === 3)) gold++; }
    console.log(`${k.padEnd(28)} ${c.map(x => pct(x, G.length).padStart(4)).join(' ')}   oro ${pct(gold, G.length).padStart(3)}%   vinte ${pct(G.filter(r => r.won).length, G.length)}%`);
  }
}
