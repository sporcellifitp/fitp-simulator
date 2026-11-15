import { fileURLToPath } from 'node:url';
// B48.1 · difficoltà per livello e profilo simulato: punti e game di chi gioca (gli 8 semi di audit:legend × 300 punti,
// battuta alternata come nelle simulazioni), per il vincolo «la difficoltà non cambia di più di 2 punti». Da natpf-tennis:
//   node --import ./test/register.mjs scripts/audit/b48/difficolta.mjs [livelli] [profili] [--seeds=24]
//   (di base bambini,casual,evento,pro,leggenda × medio,amatore,umano,tennista,preciso,bambino,impreciso; ROOT=… per un altro albero)
const ROOT = process.env.ROOT || fileURLToPath(new URL('../../../', import.meta.url));
const { run, metrics, SEEDS, MORE_SEEDS } = await import(`${ROOT}/scripts/audit/legend.mjs`);
const pos = process.argv.slice(2).filter(a => !a.startsWith('--')), nSeeds = +(process.argv.find(a => a.startsWith('--seeds='))?.split('=')[1] || 8);
const seeds = [...SEEDS, ...MORE_SEEDS].slice(0, nSeeds);
const levels = (pos[0] || 'bambini,casual,evento,pro,leggenda').split(','), profiles = (pos[1] || 'medio,amatore,umano,tennista,preciso,bambino,impreciso').split(',');
for (const difficulty of levels) for (const profile of profiles){
  const m = metrics(run({ profile, difficulty, points: 300, seeds }));
  console.log(JSON.stringify({ difficulty, profile, semi: seeds.length, puntiG: m.puntiG, err: m.puntiGErr, gameG: m.gameG }));
}
