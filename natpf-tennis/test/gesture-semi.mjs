// B17.1 passo B3: fedeltà della presa a racchetta su TUTTI i semi del rumore del telefono simulato da 1 a 23 (ogni scheda e
// ogni esercizio della mira, destro e mancino, calibrazione con l'animazione e con il braccio simulato, 0,8× / 1× / 1,25×).
// I test natpf-gesture-semi-{a,b,c} ne leggono un terzo ciascuno (girano in parallelo). Limiti dichiarati in
// docs/b17/ottimizzazione.md §9 (schermo verso la rete nei colpi di dritto): con la calibrazione del braccio simulato (che
// tiene il telefono come nella posa di partenza, schermo di lato) la mira di incrociato e lungolinea e il piatto non si
// leggono: lì si verifica solo che il colpo sia del lato giusto o un colpo normale, e il conto è riportato a parte
import { readCard, judgeCard } from './pose-sensors.mjs';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import { GESTURES } from '../src/natpf/natpf_gesture_motion.js';

export const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], sliceBackhand: ['drop'], flat: ['topspin'] })[id] || null : null;
// schede e calibrazioni con un limite dichiarato (ottimizzazione.md §9): letture contate a parte
export const DECLARED = Object.freeze({ cross: ['arm'], line: ['arm'], flat: ['arm'] });
export const declared = (id, cal) => !!DECLARED[id]?.includes(cal);
const src = { name: 'racchetta', pose: (id, t, hand) => GP.gesturePose(id, t, { hand, grip: 'racchetta' }), plan: id => GP.gesturePlan(id, { grip: 'racchetta' }) };
export function readSeeds(seeds){
  const ids = GP.POSE_IDS.filter(id => !GESTURES[id].still), bad = [], lim = { n: 0, ok: 0 };
  let n = 0;
  for (const seed of seeds) for (const id of ids) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left']) for (const rate of [1, .8, 1.25]){
    const r = readCard(src, id, { hand, cal, rate, seed }), why = judgeCard(src, id, r, { hand, rate, allow: allowFor(id, rate) });
    if (declared(id, cal)){ lim.n++; if (!why.length) lim.ok++; continue; }
    n++;
    if (why.length) bad.push(`seme ${seed} ${id} ${hand} cal=${cal} ×${rate}: ${why.join('; ')}`);
  }
  return { n, bad, lim, ids };
}
