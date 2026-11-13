// B32 · Distribuzione dei piani d'intercetto di chi gioca (scripts/audit/movimento.mjs è il banco completo): metri da
// correre verso il punto d'impatto, di lato, tempo fino all'impatto e misura dell'allungo (stretch) per ogni palla della
// CPU, in percentili. Serve a vedere quanto lontano e quanto presto arrivano le palle a ogni livello.
//   node --import ./test/register.mjs scripts/audit/movimento-piani.mjs [livello] [profilo] [--senza-b32] [--punti=300] [--seme=2001]
import { simulate, PHONE_PROFILES } from './rally-balance.mjs';
import * as NM from '../../src/natpf/natpf_movement.js';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
if (process.argv.includes('--senza-b32')) NM.movementRules.off = true;
const pos = process.argv.slice(2).filter(a => !a.startsWith('--'));
const diff = pos[0] || 'pro', prof = pos[1] || 'amatore';
const rows = [];
let last = null;
simulate({ profile: PHONE_PROFILES[prof], difficulty: diff, points: +(arg('punti') || 300), seed: +(arg('seme') || 2001), onStep: e => {
  const p = e.natpfPlan;
  if (p && p !== last){ last = p; rows.push({ kind: p.kind, d: Math.hypot(e.player.targetPos.x - e.player.pos.x, e.player.targetPos.z - e.player.pos.z), dx: Math.abs(e.player.targetPos.x - e.player.pos.x), t: p.t, st: p.stretch }); }
} });
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.floor(f*(s.length - 1))].toFixed(2) : null; };
const g = rows.filter(r => r.kind !== 'letgo');
console.log(`${diff}/${prof}${NM.moveOff() ? ' (senza B32)' : ''} · piani ${g.length} · ${JSON.stringify(g.reduce((m, r) => (m[r.kind] = (m[r.kind] || 0) + 1, m), {}))}`);
console.log('percentili       10%   50%   75%   90%   95%   99%');
for (const [k, n] of [['d', 'metri'], ['dx', 'di lato'], ['t', 'tempo (s)'], ['st', 'allungo']]) console.log(n.padEnd(14), [.1, .5, .75, .9, .95, .99].map(f => String(q(g.map(r => r[k]), f)).padStart(5)).join(' '));
