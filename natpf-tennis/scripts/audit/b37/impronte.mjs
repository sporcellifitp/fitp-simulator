// B37: le partite a sorteggi fissi devono restare identiche (il blocco cambia solo quando si mostrano fuori e punto, il
// segno di chi serve e la scritta del segnale del momento giusto: niente esito dei colpi, niente regole). Simulazioni di
// ../rally-balance.mjs (chi gioca contro la CPU, motore vero senza grafica) e impronta (sha1) di punti, vinti, scambi,
// motivi dei punti, voti dei colpi, colpi della racchetta e cadute. Si lancia prima e dopo: le righe devono coincidere.
//   node --import ./test/register.mjs scripts/audit/b37/impronte.mjs --semi=7,11,23 [--punti=80]
import { createHash } from 'node:crypto';
import { simulate, PHONE_PROFILES, PROFILES } from '../rally-balance.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const points = +(arg('punti') || 80), seeds = (arg('semi') || '7,11,23').split(',').map(Number);
const profiles = [...Object.keys(PHONE_PROFILES).slice(0, 3), ...Object.keys(PROFILES).slice(0, 2)];
console.log(`== B37 · impronte contro la CPU: ${points} punti per partita, semi ${seeds.join(', ')} ==`);
const all = createHash('sha1');
for (const difficulty of ['casual', 'pro', 'leggenda']) for (const profile of profiles){
  const runs = seeds.map(seed => simulate({ profile, difficulty, points, seed }));
  const data = runs.map(r => [r.points, r.won, r.rallies, r.reasons, r.grades, r.racket, r.landings, r.whiffs]);
  const print = createHash('sha1').update(JSON.stringify(data)).digest('hex').slice(0, 12);
  all.update(print);
  console.log(`${difficulty.padEnd(9)} ${profile.padEnd(12)} | punti ${runs.map(r => r.points).join('+')} · vinti ${runs.map(r => r.won).join(',')} · impronta ${print}`);
}
console.log(`impronta di tutto: ${all.digest('hex').slice(0, 16)}`);
