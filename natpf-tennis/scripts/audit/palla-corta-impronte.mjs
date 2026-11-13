// B18.2, tappa 2 passo 3 (docs/b18/t2-3-leggenda-e-palla-corta.md): controllo che il passo non cambi i livelli che non
// tocca. Come b20/impronta-cpu.mjs: simulazioni di rally-balance.mjs (chi gioca contro la CPU, motore vero senza grafica,
// stessi semi) e impronta (sha1) di scambi, colpi di chi gioca con il punto di caduta e punti vinti, per ogni livello.
// Si lancia sul commit di prima e su quello di dopo: le impronte dei livelli non toccati devono essere identiche.
//   node --import ./test/register.mjs scripts/audit/palla-corta-impronte.mjs [--punti=120] [--semi=7,11] [--livelli=casual,pro,bambini,evento,leggenda]
//        [--senza-speciali]   i profili non giocano colpi speciali (pallonetto, palla corta, schiacciata cercata):
//                             toglie la parte B del passo (la palla corta), così resta da vedere solo la parte A
// Ogni riga dice anche quante palle corte ha giocato chi gioca (0 con --senza-speciali).
import { createHash } from 'node:crypto';
import { simulate, PHONE_PROFILES, PROFILES } from './rally-balance.mjs';
const { NatpfTennisEngine: E } = await import('../../src/game_engine.js');

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const points = +(arg('punti') || 120), seeds = (arg('semi') || '7,11').split(',').map(Number);
const levels = (arg('livelli') || 'casual,pro,bambini,evento,leggenda').split(','), plain = process.argv.includes('--senza-speciali');
if (plain) for (const P of [...Object.values(PHONE_PROFILES), ...Object.values(PROFILES)]) P.specials = 0;
let drops = 0;
const racket = E.prototype._natpfRacketShot;
E.prototype._natpfRacketShot = function(e, p, o){ const r = racket.call(this, e, p, o); if (p === this.player && r?.out?.shot === 'DROP') drops++; return r; };
const profiles = ['tennista', 'amatore', 'bambino', 'medio'];
console.log(`== impronte contro la CPU: ${points} punti per riga, semi ${seeds.join(', ')}${plain ? ', senza colpi speciali' : ''} ==`);
for (const difficulty of levels) for (const profile of profiles){
  drops = 0;
  const runs = seeds.map(seed => simulate({ profile, difficulty, points, seed }));
  const print = createHash('sha1').update(JSON.stringify(runs.map(r => [r.points, r.won, r.rallies, r.shots]))).digest('hex').slice(0, 12);
  console.log(`${difficulty.padEnd(9)} ${profile.padEnd(9)} | vinti ${runs.map(r => r.winPct + '%').join(', ')} · colpi a scambio ${runs.map(r => r.avgHits).join(', ')} · palle corte ${drops} · impronta ${print}`);
}
