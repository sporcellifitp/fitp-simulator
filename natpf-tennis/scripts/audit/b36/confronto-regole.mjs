// B36.1 «La cima comanda (interna)» (docs/b73/direzione-b36-1.md): la stessa misura con la direzione «Classica» e con
// «Nuova». SIMULAZIONE (telefono simulato con il braccio, giocatori simulati, motore vero senza grafica): non persone.
//   node --import ./test/register.mjs scripts/audit/b36/confronto-regole.mjs matrice   criterio 1 del piano (≈ 1,5 min)
//   node --import ./test/register.mjs scripts/audit/b36/confronto-regole.mjs fuori     fuori a Esperta e Leggenda (≈ 40 s)
//   node --import ./test/register.mjs scripts/audit/b36/confronto-regole.mjs partite [profili] [livelli] [punti]   (≈ 3 min)
// Uscite del 20/11 in scripts/audit/b36/risultati/b36-1-*.txt
import { pathToFileURL } from 'node:url';
import * as D from '../direzione-telefono.mjs';
import { simulate, courtStats } from '../rally-balance.mjs';
import { REGOLA } from './simulati.mjs';

const RULES = ['classica', 'nuova'];
const pct = (a, b) => (b ? (100*a/b).toFixed(1) : '–');

// matrice della direzione (B35a esteso del B36.0: semi 1–4, tre posizioni, destri e mancini, tre calibrazioni, rimbalzo
// vero) e serie come quote (20 semi). Criterio 1: «piatto» buono ≥ 78% e persona vera ≥ 55%; «insegnato» ≥ 88% e ≥ 62%;
// incrociato e lungolinea scambiati 0% con il gesto buono, ≤ 2% con la persona vera
export function matrice({ models = ['piatto', 'naturale', 'tempo', 'insegnato'] } = {}){
  for (const dir of RULES){
    console.log(`\n== direzione «${dir}» ==\ngesto                         posizione  giusti  fuori/rete  incr→lung  lung→incr  colpi`);
    for (const noise of ['buono', 'vero']){
      const M = D.matriceB36({ models, noise, dir });
      for (const model of models){
        const all = [], riga = (pos, rs) => { const S = D.sintesi(rs); console.log(`${(`${model} (${noise === 'buono' ? 'gesto buono' : 'persona vera'})`).padEnd(30)}${pos.padEnd(11)}${String(S.giusti).padStart(5)}%${String(S.fuori).padStart(10)}%${String(S.incrLung).padStart(10)}%${String(S.lungIncr).padStart(10)}%${String(S.colpi).padStart(7)}`); };
        for (const [pos, rows] of Object.entries(M)){ const rs = rows.filter(r => r.model === model); all.push(...rs); riga(pos, rs); }
        riga('TUTTE', all);
      }
    }
    console.log('-- serie: lo stesso voluto 14 volte, 20 serie (dritto del destro, scambi di prova, gesto buono, rimbalzo vero) --');
    for (const r of D.serieB36({ semi: 20, models: ['piatto', 'insegnato'], dir })) console.log(`${r.model.padEnd(10)} ${r.want.padEnd(7)} giusti ${String(r.giusti).padStart(3)}% ± ${r.errore}  fuori/rete ${r.fuori}%  (${r.colpi} colpi)`);
  }
  console.log(`\ncolpi con la regola nuova: ${REGOLA.nuova} su ${REGOLA.colpi}`);
}

// colpi fuori o in rete sul rimbalzo vero: Esperta e Leggenda, da fermi e in corsa (corsa 0,7, palla a 1,6 m), gesto buono e
// persona vera; destri e mancini, tre calibrazioni, semi 1–2
export function fuori(){
  console.log('livello   situazione  gesto            rumore  regola     fuori/rete  giusti  colpi');
  for (const difficulty of ['pro', 'leggenda']) for (const [sit, o] of [['da fermo', {}], ['in corsa', { run: .7, lateral: 1.6 }]]) for (const model of ['naturale', 'insegnato', 'riga']) for (const noise of ['buono', 'vero']) for (const dir of RULES){
    const S = D.sintesi(D.audit({ seeds: [1, 2], n: 4, cals: D.CALS_B36, models: [model], noise, difficulty, giudice: 'rimbalzo', dir, ...o }));
    console.log(`${difficulty.padEnd(9)} ${sit.padEnd(11)} ${model.padEnd(16)} ${noise.padEnd(7)} ${dir.padEnd(10)} ${String(S.fuori).padStart(9)}% ${String(S.giusti).padStart(6)}% ${String(S.colpi).padStart(6)}`);
  }
}

// partite dei giocatori simulati contro la CPU (rally-balance): punti vinti, colpi per punto, palle oltre 2,5 m dal centro,
// quota delle tre celle di 1 m più colpite, punti persi con la propria palla fuori o in rete, colpi con la regola nuova
export function partite({ profili = ['tennista', 'amatore', 'bambino', 'umano', 'medioTel', 'giraTanto', 'giraTanto40'], livelli = ['bambini', 'casual', 'evento', 'pro', 'leggenda'], points = 150, seeds = [7, 11, 23] } = {}){
  console.log('livello    profilo      regola    punti  vinti%  colpi/p  oltre2,5m%  3celle%  persi fuori/rete%  colpi nuovi');
  for (const difficulty of livelli) for (const profile of profili) for (const dir of RULES){
    const runs = seeds.map(seed => simulate({ profile, difficulty, points, seed, dir }));
    const pts = runs.reduce((a, r) => a + r.points, 0), won = runs.reduce((a, r) => a + r.won, 0), hits = runs.flatMap(r => r.rallies);
    const L = runs.flatMap(r => r.landings), wide = L.filter(l => Math.abs(l.x) > 2.5).length, cs = courtStats(runs);
    let out = 0; for (const r of runs) for (const [k, v] of Object.entries(r.reasons)) if (/^perso: (Out|Net)/.test(k)) out += v;
    const nuovi = runs.reduce((a, r) => a + r.direzione.nuova, 0), colpi = runs.reduce((a, r) => a + r.direzione.colpi, 0);
    console.log(`${difficulty.padEnd(10)} ${profile.padEnd(12)} ${dir.padEnd(9)} ${String(pts).padStart(5)} ${pct(won, pts).padStart(7)} ${(hits.reduce((a, b) => a + b, 0)/Math.max(1, hits.length)).toFixed(2).padStart(8)} ${pct(wide, L.length).padStart(11)} ${String(cs.top3Pct).padStart(8)} ${pct(out, pts).padStart(18)}  ${nuovi}/${colpi}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'matrice') matrice();
  else if (cmd === 'fuori') fuori();
  else if (cmd === 'partite') partite({ ...(a ? { profili: a.split(',') } : {}), ...(b ? { livelli: b.split(',') } : {}), ...(c ? { points: +c } : {}) });
  else console.log('uso: confronto-regole.mjs matrice | fuori | partite [profili] [livelli] [punti]');
}
