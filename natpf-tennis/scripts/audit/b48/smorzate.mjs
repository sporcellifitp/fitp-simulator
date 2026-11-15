import { fileURLToPath } from 'node:url';
// B48 · misura delle smorzate della Leggenda (miglioramento 8 del rapporto B16): quota sui colpi della CPU, finestre di 8
// colpi consecutivi della CPU (nella stessa partita) con 2 o più smorzate, distanza minima tra due smorzate, punti di chi
// gioca. Si lancia dalla cartella natpf-tennis (ROOT=<natpf-tennis di un altro albero> per misurare quello):
//   node --import ./test/register.mjs scripts/audit/b48/smorzate.mjs [--seeds=8] [--points=300] [--profiles=medio,amatore]
const ROOT = process.env.ROOT || fileURLToPath(new URL('../../../', import.meta.url));   // natpf-tennis (ROOT=… per misurare un altro albero)
const { run, metrics, SEEDS, MORE_SEEDS } = await import(`${ROOT}/scripts/audit/legend.mjs`);
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const nSeeds = +(arg('seeds') || 8), points = +(arg('points') || 300);
const seeds = [...SEEDS, ...MORE_SEEDS].slice(0, nSeeds);
const profiles = (arg('profiles') || 'medio,amatore,umano,tennista,preciso,bambino').split(',');
const out = [];
for (const profile of profiles){
  const r = run({ profile, difficulty: 'leggenda', points, seeds });
  const m = metrics(r);
  // partite: il tempo del motore riparte da 0 a ogni seme
  const games = []; let cur = [], lastT = -1;
  for (const c of r.cpu){ if (c.t < lastT){ games.push(cur); cur = []; } cur.push(c); lastT = c.t; }
  if (cur.length) games.push(cur);
  let shots = 0, drops = 0, win = 0, winBad = 0, minGap = Infinity;
  for (const g of games){
    const k = g.map(c => c.kind === 'smorzata');
    shots += k.length; drops += k.filter(Boolean).length;
    let last = -1;
    for (let i = 0; i < k.length; i++){ if (k[i]){ if (last >= 0) minGap = Math.min(minGap, i - last); last = i; } }
    for (let i = 0; i + 8 <= k.length; i++){ win++; if (k.slice(i, i + 8).filter(Boolean).length >= 2) winBad++; }
  }
  const row = { profile, semi: seeds.length, punti: points, puntiG: m.puntiG, err: m.puntiGErr, gameCPU: m.gameCPU, colpiCPU: shots, smorzate: drops,
    quota: +(100*drops/Math.max(1, shots)).toFixed(1), unaOgni: +(shots/Math.max(1, drops)).toFixed(1), finestre8Con2: +(100*winBad/Math.max(1, win)).toFixed(1),
    distanzaMin: Number.isFinite(minGap) ? minGap : null, tagliato: m.schemi?.tagliato ?? 0, erroriCPU: m.erroriCPU, colpiPerPunto: m.colpiPerPunto };
  out.push(row);
  console.log(JSON.stringify(row));
}
