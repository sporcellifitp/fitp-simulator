// Gesti del telefono da rigiocare nel browser (tools/e2e/natpf-phone-upright.mjs): campioni come devicemotion
// (giroscopio in °/s nel riferimento del telefono, accelerazione con e senza gravità) dalla racchetta simulata di
// racket-sim.mjs, la stessa delle prove in Node. Ogni gesto parte e finisce nella posa «pronto».
//   node --import ./test/register.mjs test/racket-gestures.mjs [destro|mancino]  → JSON su stdout
// Campione: [ms dal precedente, alpha, beta, gamma, ax, ay, az, gx, gy, gz] (alpha attorno a z, beta a x, gamma a y).
import { pathToFileURL } from 'node:url';
import { racketSim } from './racket-sim.mjs';

const r = v => Math.round(v*1000)/1000;
export function gestureSequences({ hand = 'right', seed = 3 } = {}){
  const sim = racketSim({ hand, seed, record: true });
  sim.start();
  const take = fn => { const n0 = sim.samples.length; fn(); const out = sim.samples.slice(n0); let prev = sim.samples[n0 - 1]?.t ?? out[0]?.t ?? 0; return out.map(k => { const d = k.t - prev; prev = k.t; return [r(d), ...k.rot.map(r), ...k.acc.map(r), ...k.accG.map(r)]; }); };
  return {
    hand,
    still: take(() => sim.rest(1000)),
    forehand: take(() => sim.stroke({ side: 'forehand', peak: 900, settle: 500 })),
    backhand: take(() => sim.stroke({ side: 'backhand', peak: 900, settle: 500 })),
    // dritto arrotato (dal basso verso l'alto, 35°) e dritto con il polso che ruota sul manico: colpi normali
    topspin: take(() => sim.stroke({ side: 'forehand', rise: 35, peak: 900, settle: 500 })),
    wristOpen: take(() => sim.stroke({ side: 'forehand', peak: 900, roll: 40, settle: 500 })),
    wristClose: take(() => sim.stroke({ side: 'forehand', peak: 900, roll: -40, settle: 500 })),
    // pallonetto: swing verticale dal basso verso l'alto
    lob: take(() => sim.stroke({ side: 'forehand', rise: 70, peak: 650, settle: 500 })),
    aimRight: take(() => sim.stroke({ side: 'forehand', peak: 900, aim: 25, settle: 500 })),
    aimLeft: take(() => sim.stroke({ side: 'forehand', peak: 900, aim: -25, settle: 500 })),
  };
}
if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const hand = /mancin|left/.test(process.argv[2] || '') ? 'left' : 'right';
  process.stdout.write(JSON.stringify(gestureSequences({ hand })));
}
