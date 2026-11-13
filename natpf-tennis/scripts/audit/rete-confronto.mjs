// B31: tabella prima / dopo dai risultati JSON del banco del gioco a rete (scripts/audit/rete.mjs --json), due serie di semi.
//   node scripts/audit/rete-confronto.mjs puntiG,reteG,vintiReteG [--tattica=normale] [--livelli=casual,pro] [--profili=…]
// Ogni casella: «prima serie 1 / serie 2 → dopo serie 1 / serie 2». File: scripts/audit/results/b31/{prima,dopo}-s{1,2}.json
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('./results/b31/', import.meta.url));
const load = f => JSON.parse(readFileSync(dir + f, 'utf8'));
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const cols = (process.argv[2] || 'puntiG').split(','), tattica = arg('tattica') || 'normale';
const lv = arg('livelli')?.split(','), pf = arg('profili')?.split(',');
const [p1, p2, d1, d2] = ['prima-s1', 'prima-s2', 'dopo-s1', 'dopo-s2'].map(f => load(`${f}.json`));
const key = r => `${r.difficulty}/${r.profile}/${r.tattica}`, find = (rows, r) => rows.find(x => key(x) === key(r)) || {};
const f = v => (v == null ? '–' : String(v).replace('.', ','));
console.log(`| livello | profilo | ${cols.join(' | ')} |\n|---|---|${cols.map(() => '---').join('|')}|`);
for (const r of p1){
  if (r.tattica !== tattica || (lv && !lv.includes(r.difficulty)) || (pf && !pf.includes(r.profile))) continue;
  const cells = cols.map(c => `${f(r[c])} / ${f(find(p2, r)[c])} → ${f(find(d1, r)[c])} / ${f(find(d2, r)[c])}`);
  console.log(`| ${r.difficulty} | ${r.profile} | ${cells.join(' | ')} |`);
}
