import { fileURLToPath } from 'node:url';
// B48.1 · il caso peggiore del primo game della CPU (battuta alternata, batte per prima la CPU): ogni servizio della CPU come
// se chi gioca non avesse ancora servito (natpfServeKmh azzerato prima di ogni servizio: natpf_skill.firstServeKmh). Punti di
// chi gioca sul servizio della CPU, quota delle risposte in cui avanza di 1,5 m o più, km/h. Da natpf-tennis:
//   node --import ./test/register.mjs scripts/audit/b48/primo-servizio.mjs [livelli] [profili] [--telefono]
//   (--telefono: interfaccia con il telefono, firstKmhPhone; di base nessuna interfaccia, firstKmh)
const ROOT = process.env.ROOT || fileURLToPath(new URL('../../../', import.meta.url));
const { simulate } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
const pos = process.argv.slice(2).filter(a => !a.startsWith('--')), phone = process.argv.includes('--telefono');
const levels = (pos[0] || 'casual,bambini').split(','), profiles = (pos[1] || 'umano,bambino,medio,amatore,impreciso').split(',');
for (const difficulty of levels) for (const profile of profiles){
  let n = 0, won = 0, adv = 0; const kmh = [];
  for (const seed of [7, 11, 23, 31]){
    let pend = null;
    const setup = e => {
      e.natpfFair = false; e.natpfServeFirst = 'opponent'; if (phone) e.natpfUi = { controller: 'phone' };
      const hit = e._executeServeHit.bind(e);
      e._executeServeHit = (a, evt) => {
        if (a === e.opponent) e.natpfServeKmh = null;
        const was = e.ball.inPlay, z0 = e.player.pos.z; hit(a, evt);
        if (!was && e.ball.inPlay && a === e.opponent){ n++; kmh.push(e.ball.vel.length()*3.6); pend = { z0, minZ: z0 }; }
      };
      const award = e._awardPoint.bind(e);
      e._awardPoint = (who, why) => { if (pend){ if (who === 'player') won++; if (pend.z0 - pend.minZ >= 1.5) adv++; pend = null; } return award(who, why); };
    };
    const onStep = e => { if (pend && e.ball.lastHitter === 'opponent') pend.minZ = Math.min(pend.minZ, e.player.targetPos.z); };
    simulate({ profile, difficulty, points: 200, seed, setup, onStep });
  }
  kmh.sort((a, b) => a - b);
  console.log(JSON.stringify({ difficulty, profile, telefono: phone, serviziCPU: n, puntiGiocatore: +(100*won/n).toFixed(1), avanzaOltre15: +(100*adv/n).toFixed(1), kmh: [kmh[0], kmh[n >> 1], kmh[n - 1]].map(v => +v.toFixed(1)) }));
}
