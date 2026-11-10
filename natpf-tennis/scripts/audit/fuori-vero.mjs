// Revisione B18: la scritta «Fuori» del grande schermo (e del telefono) contro il giudizio vero del motore al primo
// rimbalzo (game_engine: |x| > SINGLES_X + 0,22, |z| > BASELINE_Z + 0,28 o nella propria metà → «Out»). Per ogni colpo
// di chi gioca (non servizio, non in rete) con i profili simulati di rally-balance:
//   prima: esito dal bersaglio del motore (ball.targetLanding) con tolleranza 0,02 m, come fino a questo ramo;
//   dopo:  esito dal rimbalzo previsto con la fisica del motore (natpf_shot_feedback.landingOf) e la tolleranza del motore.
// Colonne: quante «Fuori» e di queste quante con la palla poi dentro; quanti colpi dati in campo e di questi quanti «Out».
//   node --import ./test/register.mjs scripts/audit/fuori-vero.mjs
import { simulate } from './rally-balance.mjs';
import { shotQuality, landsIn, landingOf } from '../../src/natpf/natpf_shot_feedback.js';
const old = b => b.targetLanding; // prima: il bersaglio con tolleranza 0,02
console.log('livello profilo  | prima: Fuori, di cui palla dentro / Buono, di cui Out | dopo: idem');
for (const difficulty of ['casual','pro']) for (const profile of ['umano','amatore','bambino','tennista']) {
  const r = { A: [0,0,0,0], B: [0,0,0,0] };
  for (const seed of [7, 11, 23]) {
    let hooked = false, pend = null;
    simulate({ profile, difficulty, points: 150, seed, onStep: e => {
      if (hooked) return; hooked = true;
      // giudizio vero del motore sul primo rimbalzo dopo il colpo di chi gioca: Out o dentro
      const aw = e._awardPoint.bind(e), bounce = e._spawnBounceRing.bind(e);
      e._spawnBounceRing = (x, z) => { if (pend && !pend.done && e.ball.lastHitter !== 'player') pend.done = true; if (pend && !pend.done){ pend.done = true; pend.realOut = Math.abs(x) > 4.115 + .22 || Math.abs(z) > 11.89 + .28 || z > 0; for (const k of ['A','B']){ const q = pend[k]; if (q === 'Fuori'){ r[k][0]++; if (!pend.realOut) r[k][1]++; } else if (q !== 'In rete'){ r[k][2]++; if (pend.realOut) r[k][3]++; } } } return bounce(x, z); };
      e.motionController = { triggerHapticFeedback: ev => {
        if ((ev.role||'p1') !== 'p1' || ev.kind !== 'hit' || /SERVE/.test(ev.grade)) return;
        const net = !!e.ball.natpfNetFault;
        if (net){ pend = null; return; }
        pend = { A: shotQuality(ev.grade, { inCourt: landsIn(old(e.ball)) }).label, B: shotQuality(ev.grade, { inCourt: landsIn(landingOf(e.ball)) }).label };
      } };
    } });
  }
  console.log(difficulty.padEnd(7), profile.padEnd(9), '|', `${r.A[0]} Fuori, ${r.A[1]} dentro / ${r.A[2]} in campo, ${r.A[3]} Out`, '|', `${r.B[0]} Fuori, ${r.B[1]} dentro / ${r.B[2]} in campo, ${r.B[3]} Out`);
}
