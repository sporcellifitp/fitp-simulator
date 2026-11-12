// B25 · controllo «con le opzioni spente non cambia niente». Impronta (sha1) di tutto quello che succede in una serie di
// partite con semi fissi: nello stesso schermo (banco dei due umani, ../b19/due-umani.mjs: chi vince ogni punto, colpi,
// come finisce, e per ogni colpo tipo, voto, punto di caduta, super) e contro la CPU (../rally-balance.mjs, come
// ../b20/impronta-cpu.mjs). Si lancia prima e dopo una modifica: le impronte devono essere identiche.
// Uso, da natpf-tennis:  node --import ./test/register.mjs scripts/audit/b25/impronte.mjs [--partite=20] [--punti=120]
import { createHash } from 'node:crypto';
import { many } from '../b19/due-umani.mjs';
import { simulate, PHONE_PROFILES, PROFILES } from '../rally-balance.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const N = +(arg('partite') || 20), points = +(arg('punti') || 120), SEEDS = [7001, 7103, 7207];
const sha = x => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 12);
// regole=prima: le due regole del B25 che valgono sempre tra due persone (colpo super sulla forza relativa, preparazione che
// non conta) spente a mano, solo per questo confronto: le impronte devono essere quelle di f08243a (lì i due valori a mano
// non esistono e non fanno niente). regole=oggi: il gioco com'è, con le opzioni spente e le fasce uguali: cambia solo per
// quelle due regole
const RULES = (arg('regole') || 'prima,oggi').split(',');
for (const rules of RULES){
  console.log(`== Stesso schermo, ${rules === 'prima' ? 'super e preparazione come prima' : 'regole di oggi (opzioni spente, fasce uguali)'}: impronta di ${N} partite per seme (semi ${SEEDS.join(', ')}), 1 game ==`);
  for (const [a, b] of [['bambino', 'bambino'], ['medio', 'medio'], ['amatore', 'amatore'], ['bambino', 'medio'], ['medio', 'amatore'], ['preciso', 'medio']]) for (const fair of [true, false]){
    const r = many({ a, b, fair, matches: N, tweak: rules === 'prima' ? e => { e.natpfSuperRel = false; e.natpfNoPrep = false; } : null }, SEEDS);
    const print = sha([r.pts.map(p => [p.win, p.n, p.kind, p.srv, p.why]), r.shots.map(s => [s.k, s.shot, s.grade, s.q, s.x, s.depth, s.sup, s.flight])]);
    console.log(`${(a + ' contro ' + b).padEnd(22)} ${fair ? 'fiera   ' : 'classico'} | punti ${r.pts.length} · colpi ${r.shots.length} · del P1 ${r.pts.filter(p => p.win === 'p1').length} · super ${r.shots.filter(s => s.sup).length} · impronta ${print}`);
  }
}
console.log(`== Contro la CPU: impronta di ${points} punti per riga (semi 7 e 11) ==`);
const profiles = [...Object.keys(PHONE_PROFILES).slice(0, 3), ...Object.keys(PROFILES).slice(0, 1)];
for (const difficulty of ['casual', 'pro', 'leggenda']) for (const profile of profiles){
  const runs = [7, 11].map(seed => simulate({ profile, difficulty, points, seed }));
  console.log(`${difficulty.padEnd(9)} ${profile.padEnd(12)} | punti ${runs.map(r => r.points).join(' + ')} · vinti ${runs.map(r => r.winPct + '%').join(', ')} · colpi a scambio ${runs.map(r => r.avgHits).join(', ')} · impronta ${sha(runs.map(r => [r.points, r.won, r.rallies, r.shots]))}`);
}
