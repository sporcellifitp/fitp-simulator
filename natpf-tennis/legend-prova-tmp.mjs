// prova temporanea (non va nel repository): punti di chi gioca contro la Leggenda con valori di prova dello scambio caldo
import { hotTuning } from './src/natpf/natpf_hot_rally.js';
import { run, metrics, SEEDS } from './scripts/audit/legend.mjs';
const tune = JSON.parse(process.argv[2] || '{}'), profiles = (process.argv[3] || 'tennista,preciso').split(',');
Object.assign(hotTuning, tune);
for (const profile of profiles){
  const r = run({ profile, difficulty: 'leggenda', points: 300, seeds: SEEDS }), m = metrics(r);
  const nPts = r.sims.reduce((s, x) => s + x.points, 0), won = r.sims.reduce((s, x) => s + x.won, 0), rallies = r.sims.flatMap(s => s.rallies);
  console.log(`${JSON.stringify(tune)} ${profile}: punti di chi gioca ${(100*won/nPts).toFixed(1)}%, colpi a punto ${(rallies.reduce((a, b) => a + b, 0)/rallies.length).toFixed(2)}, oltre 30 ${(100*rallies.filter(n => n > 30).length/rallies.length).toFixed(1)}%, game CPU ${m.cpuGames ?? m.gamesCpu ?? ''}`);
}
