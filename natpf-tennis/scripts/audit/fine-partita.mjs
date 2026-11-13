// B33 · fine partita con dati veri e classifica delle partite (docs/b33/fine-partita.md). Banco senza grafica sulle
// regole vere del motore (simulate di rally-balance.mjs), due misure:
//   --livelli   quota di punti vinti da ogni profilo simulato a ogni livello della CPU, con due serie di semi: serve a
//               scegliere i valori dei livelli del punteggio della classifica (natpf_match_stats.LEVEL_WEIGHT), così che
//               lo stesso giocatore medio prenda circa lo stesso punteggio a ogni livello
//   --impronte  impronta delle partite a sorteggi fissi (punti, scambi, voti, motivi): il blocco non deve cambiare niente
//               nel gioco. Stampa l'impronta (da confrontare con quella della base) e, se il modulo delle statistiche c'è,
//               anche quella con le statistiche accese (deve essere identica)
// Uso (dalla cartella natpf-tennis): node --import ./test/register.mjs scripts/audit/fine-partita.mjs --livelli [--points=200]
//                                    node --import ./test/register.mjs scripts/audit/fine-partita.mjs --impronte
// È un banco di prova deterministico, non una misura di persone reali.
import { createHash } from 'node:crypto';
import { simulate as simulate0 } from './rally-balance.mjs';
import { eventoReset } from '../../src/natpf/natpf_evento.js';
// il livello Evento si regola da solo e il suo stato è del modulo: da capo a ogni partita simulata (come a ogni visitatore
// nel gioco), altrimenti una partita dipende da quelle simulate prima nello stesso processo
const simulate = o => { eventoReset(); return simulate0(o); };

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const has = k => process.argv.includes(`--${k}`);
const LEVELS = ['bambini', 'casual', 'evento', 'pro', 'leggenda'];
const SEEDS = { A: [7, 11, 23], B: [31, 37, 41] };

let stats = null;
try { stats = await import('../../src/natpf/natpf_match_stats.js'); } catch { stats = null; }

export function fingerprint(r){
  const h = createHash('sha256');
  h.update(JSON.stringify({ won: r.won, points: r.points, rallies: r.rallies, grades: r.grades, reasons: r.reasons, whiffs: r.whiffs, racket: r.racket }));
  return h.digest('hex').slice(0, 16);
}

if (has('livelli')){
  const points = +arg('points', 200), profiles = arg('profiles', 'bambino,amatore,umano,tennista').split(',');
  const out = {};
  for (const [set, seeds] of Object.entries(SEEDS)){
    out[set] = {};
    for (const p of profiles){
      out[set][p] = {};
      for (const lv of LEVELS){
        let won = 0, tot = 0;
        for (const seed of seeds){ const r = simulate({ profile: p, difficulty: lv, points, seed }); won += r.won; tot += r.points; }
        out[set][p][lv] = +(100*won/tot).toFixed(1);
      }
      console.log(`semi ${set} ${p.padEnd(9)} ${LEVELS.map(l => `${l} ${String(out[set][p][l]).padStart(5)}%`).join('  ')}`);
    }
  }
  if (stats?.LEVEL_WEIGHT){
    console.log('\npunteggio della classifica (quota × valore del livello), media delle due serie di semi:');
    for (const p of profiles) console.log(`${p.padEnd(9)} ${LEVELS.map(l => `${l} ${String(stats.matchScore({ level: l, won: (out.A[p][l] + out.B[p][l])/2, lost: 100 - (out.A[p][l] + out.B[p][l])/2 })).padStart(4)}`).join('  ')}`);
  }
  if (has('json')) console.log(JSON.stringify(out));
}

if (has('impronte')){
  const configs = [['umano', 'evento', 7], ['tennista', 'leggenda', 11], ['bambino', 'bambini', 23], ['medio', 'pro', 31], ['amatore', 'casual', 37]];
  for (const [p, lv, seed] of configs){
    const base = simulate({ profile: p, difficulty: lv, points: 120, seed });
    let withStats = null;
    if (stats?.installMatchStats){
      let S = null;
      withStats = simulate({ profile: p, difficulty: lv, points: 120, seed, setup: e => { S = stats.installMatchStats(e); } });
      void S;
    }
    console.log(`${p.padEnd(9)} ${lv.padEnd(9)} seme ${String(seed).padStart(2)}  impronta ${fingerprint(base)}${withStats ? `  con le statistiche ${fingerprint(withStats)} ${fingerprint(withStats) === fingerprint(base) ? 'uguale' : 'DIVERSA'}` : ''}  punti ${base.won}/${base.points}`);
  }
}
