// B20 (revisione): controllo che contro la CPU non cambi niente. Simulazioni di ../rally-balance.mjs (chi gioca contro la
// CPU, motore vero senza grafica, stessi semi) e «impronta» (sha1) di tutto quello che è successo: scambi, colpi di chi
// gioca con il punto di caduta, punti vinti. Si lancia prima e dopo una modifica: le impronte devono essere identiche.
// Uso, da natpf-tennis:  node --import ./test/register.mjs scripts/audit/b20/impronta-cpu.mjs [--punti=120]
import { createHash } from 'node:crypto';
import { simulate, PHONE_PROFILES, PROFILES } from '../rally-balance.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const points = +(arg('punti') || 120);
const profiles = [...Object.keys(PHONE_PROFILES).slice(0, 3), ...Object.keys(PROFILES).slice(0, 1)];
console.log(`== Contro la CPU: impronta di ${points} punti per riga (semi 7 e 11) ==`);
for (const difficulty of ['casual', 'pro', 'leggenda']) for (const profile of profiles){
  const runs = [7, 11].map(seed => simulate({ profile, difficulty, points, seed }));
  const print = createHash('sha1').update(JSON.stringify(runs.map(r => [r.points, r.won, r.rallies, r.shots]))).digest('hex').slice(0, 12);
  console.log(`${difficulty.padEnd(9)} ${profile.padEnd(12)} | punti ${runs.map(r => r.points).join(' + ')} · vinti ${runs.map(r => r.winPct + '%').join(', ')} · colpi a scambio ${runs.map(r => r.avgHits).join(', ')} · impronta ${print}`);
}
