// B32 · Confronto «prima → dopo» delle tabelle del banco del movimento (scripts/audit/movimento.mjs) salvate in
// scripts/audit/results/b32/. Uso: node scripts/audit/movimento-confronto.mjs [colonne] [--serie=1|2]
//   colonne: nomi delle intestazioni separati da virgola (es. «punti G%,game G%,corsa%»); di base quelle del documento
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('./results/b32/', import.meta.url));
const serie = process.argv.find(a => a.startsWith('--serie='))?.slice(8) || '1';
const want = (process.argv.slice(2).find(a => !a.startsWith('--')) || 'punti G%,game G%,colpi/p,m/p,non prese%,allungo%,corsa%,stanco%').split(',');
// una tabella: intestazioni separate da almeno uno spazio, ma «punti G%» ha uno spazio dentro: si leggono per posizione
function table(file){
  const lines = readFileSync(dir + file, 'utf8').trim().split('\n').slice(1), head = lines[0], rows = {};
  const names = head.slice(20).trim().split(/\s{1,}(?=\S)/), cols = [];
  // ricostruisce le intestazioni con lo spazio interno («punti G%», «game G%», «non prese%», «fermi fall.%»)
  for (let i = 0; i < names.length; i++){ const n = names[i]; if (['punti', 'game', 'fermi', 'non'].includes(n)) { cols.push(n + ' ' + names[++i]); } else cols.push(n === 'fall.%' || n === 'vinti%' ? cols.at(-1 - (n === 'vinti%')).split(' ')[0] + ' ' + n : n); }
  for (const l of lines.slice(1)){ const p = l.trim().split(/\s+/); rows[p[0]] = Object.fromEntries(cols.map((c, i) => [c, +p[i + 1]])); }
  return { cols, rows };
}
const A = table(`prima-s${serie}.txt`), B = table(`dopo-s${serie}.txt`);
const cols = want.filter(c => A.cols.includes(c));
console.log(`serie ${serie} · prima → dopo\n${'livello/profilo'.padEnd(20)} ` + cols.map(c => c.padStart(15)).join(' '));
for (const k of Object.keys(A.rows)) if (B.rows[k]) console.log(k.padEnd(20) + ' ' + cols.map(c => `${A.rows[k][c]} → ${B.rows[k][c]}`.padStart(15)).join(' '));
