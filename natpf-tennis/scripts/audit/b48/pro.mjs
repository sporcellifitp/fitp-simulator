import { fileURLToPath } from 'node:url';
// B48: Pro contro «medio» (criterio di non regressione di audit:legend: game vinti da chi gioca 70–85%), con gli 8 semi
// dell'audit; in più i punti vinti da chi gioca. Da natpf-tennis:
//   node --import ./test/register.mjs scripts/audit/b48/pro.mjs [livello] [profilo]   (di base pro medio)
const ROOT = process.env.ROOT || fileURLToPath(new URL('../../../', import.meta.url));   // natpf-tennis (ROOT=… per misurare un altro albero)
const { run, metrics, SEEDS } = await import(`${ROOT}/scripts/audit/legend.mjs`);
const difficulty = process.argv[2] || 'pro', profile = process.argv[3] || 'medio';
const r = run({ profile, difficulty, points: 300, seeds: SEEDS });
const m = metrics(r);
console.log(JSON.stringify({ tag: process.env.TAG || '', difficulty, profile, gameG: m.gameG, game: m.game, puntiG: m.puntiG, err: m.puntiGErr }));
