// Ritmo dello scambio (richiesta del 23/10, docs/NATPF_DIAGNOSI_2026-10-23.md C1–C2): per ogni palla della CPU che chi
// gioca riprende, quanto tempo passa dal colpo della CPU al proprio impatto e dal rimbalzo all'impatto, a che altezza e
// dove si colpisce, che velocità ha la palla, e dove sarebbe il colmo dopo il rimbalzo. Regole vere del motore, profili
// simulati (scripts/audit/rally-balance.mjs). Non dice se il ritmo è giusto per una persona: lo confronta prima e dopo.
//   npm run audit:rhythm [-- --points=120 --difficulty=pro --profiles=tennista,medio]
import { pathToFileURL } from 'node:url';
import { simulate } from './rally-balance.mjs';

const G = 9.15;
const q = (a, f) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(f*s.length))].toFixed(2) : null; };
const dist = a => ({ p10: q(a, .1), p50: q(a, .5), p90: q(a, .9) });

export function rhythm({ profile = 'tennista', difficulty = 'pro', points = 120, seeds = [7, 11, 23] } = {}){
  const rows = [];
  for (const seed of seeds){
    let cpuAt = null, cpuSpeed = null, bounce = null, last = null, t = 0;
    simulate({ profile, difficulty, points, seed, onStep: e => {
      const b = e.ball; t = e.elapsedTime;
      if (b.lastHitter !== last){
        if (b.lastHitter === 'opponent'){ cpuAt = t; cpuSpeed = Math.hypot(b.vel.x, b.vel.z); bounce = null; }
        else if (b.lastHitter === 'player' && cpuAt != null && bounce){
          rows.push({ hitToContact: t - cpuAt, bounceToContact: t - bounce.t, contactY: b.pos.y, contactZ: e.player.pos.z, cpuSpeed, bounceSpeed: bounce.v, bounceZ: bounce.z, apexY: bounce.apexY, apexZ: bounce.apexZ, flight: bounce.t - cpuAt });
          cpuAt = null;
        } else cpuAt = null;
        last = b.lastHitter;
      }
      // primo rimbalzo nel proprio campo dopo il colpo della CPU: velocità e colmo previsto (senz'aria, gravità del top spin)
      if (cpuAt != null && !bounce && b.bounceCountOnCurrentSide === 1 && b.pos.z > 0){
        const g = G + (Number.isFinite(b.spin?.x) ? b.spin.x*.14 : 0), vy = Math.max(0, b.vel.y), tUp = vy/g;
        bounce = { t, z: b.pos.z, v: Math.hypot(b.vel.x, b.vel.z), apexY: vy*vy/(2*g), apexZ: b.pos.z + b.vel.z*tUp };
      }
    } });
  }
  return {
    n: rows.length,
    'colpo CPU → impatto (s)': dist(rows.map(r => r.hitToContact)),
    'volo CPU → rimbalzo (s)': dist(rows.map(r => r.flight)),
    'rimbalzo → impatto (s)': dist(rows.map(r => r.bounceToContact)),
    'altezza all\'impatto (m)': dist(rows.map(r => r.contactY)),
    'impatto, dalla rete (m)': dist(rows.map(r => r.contactZ)),
    'velocità colpo CPU (m/s)': dist(rows.map(r => r.cpuSpeed)),
    'velocità al rimbalzo (m/s)': dist(rows.map(r => r.bounceSpeed)),
    'rimbalzo, dalla rete (m)': dist(rows.map(r => r.bounceZ)),
    'colmo dopo il rimbalzo (m)': dist(rows.map(r => r.apexY)),
    'colmo, dalla rete (m)': dist(rows.map(r => r.apexZ)),
    'impatto dopo il colmo (%)': +(100*rows.filter(r => r.bounceToContact*1 > 0 && r.contactZ >= r.apexZ - .2).length/Math.max(1, rows.length)).toFixed(1),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  for (const difficulty of (arg('difficulty') ? arg('difficulty').split(',') : ['casual', 'pro', 'leggenda'])) for (const profile of (arg('profiles') ? arg('profiles').split(',') : ['tennista', 'medio'])){
    const r = rhythm({ profile, difficulty, points: +(arg('points') || 120) });
    console.log(`\n${difficulty}/${profile} (${r.n} palle riprese)`);
    for (const [k, v] of Object.entries(r)) if (k !== 'n') console.log(`  ${k.padEnd(30)} ${typeof v === 'object' ? `p10 ${v.p10}  p50 ${v.p50}  p90 ${v.p90}` : v}`);
  }
}
