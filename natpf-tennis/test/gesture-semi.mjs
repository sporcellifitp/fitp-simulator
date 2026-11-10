// B17.1 passo B3: fedeltà della presa a racchetta su TUTTI i semi del rumore del telefono simulato da 1 a 23 (ogni scheda e
// ogni esercizio della mira, destro e mancino, calibrazione con l'animazione e con il braccio simulato, 0,8× / 1× / 1,25×).
// I test natpf-gesture-semi-{a,b,c} ne leggono un terzo ciascuno (girano in parallelo). Limiti dichiarati in
// docs/b17/ottimizzazione.md §9 (schermo verso la rete nei colpi di dritto): con la calibrazione del braccio simulato (che
// tiene il telefono come nella posa di partenza, schermo di lato) la mira di incrociato e lungolinea e il piatto non si
// leggono come il colpo mostrato. Quelle letture NON sono verificate come giuste: si contano a parte per scheda (lim.byCard:
// giuste e che cosa viene letto) e ogni file di test confronta il conto con quello misurato (DECLARED_SEEN), così un
// peggioramento (o un miglioramento) di quelle letture fa fallire il test e va riscritto nel documento
import { readCard, judgeCard } from './pose-sensors.mjs';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import { GESTURES } from '../src/natpf/natpf_gesture_motion.js';

export const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], sliceBackhand: ['drop'], flat: ['topspin'] })[id] || null : null;
// schede e calibrazioni con un limite dichiarato (ottimizzazione.md §9): letture contate a parte
export const DECLARED = Object.freeze({ cross: ['arm'], line: ['arm'], flat: ['arm'] });
export const declared = (id, cal) => !!DECLARED[id]?.includes(cal);
const src = { name: 'racchetta', pose: (id, t, hand) => GP.gesturePose(id, t, { hand, grip: 'racchetta' }), plan: id => GP.gesturePlan(id, { grip: 'racchetta' }) };
// che cosa è stato letto (per le letture dei limiti dichiarati): colpi e lati, «+» fra due colpi; per incrociato e
// lungolinea anche la mira del primo colpo (riportata al destro: «incrociato» se < −0,4, «lungolinea» se > 0,4, «centro»)
export function describe(r, id, hand){
  if (!r?.read?.length) return 'niente';
  const s = r.read.map(x => x.ev.natpf.shot + '/' + (x.ev.side || '?')).join(' + '), w = r.read[0].ev.natpf.wrist;
  if (!GESTURES[id]?.aim || w == null) return s;
  const m = +w*(hand === 'left' ? -1 : 1);
  return `${s} mira ${m < -.4 ? 'incrociato' : m > .4 ? 'lungolinea' : 'centro'}`;
}
export function readSeeds(seeds){
  const ids = GP.POSE_IDS.filter(id => !GESTURES[id].still), bad = [], lim = { n: 0, ok: 0, byCard: {} };
  let n = 0;
  for (const seed of seeds) for (const id of ids) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left']) for (const rate of [1, .8, 1.25]){
    const r = readCard(src, id, { hand, cal, rate, seed }), why = judgeCard(src, id, r, { hand, rate, allow: allowFor(id, rate) });
    if (declared(id, cal)){
      lim.n++; if (!why.length) lim.ok++;
      const c = lim.byCard[id] ??= { n: 0, ok: 0, read: {} }, d = describe(r, id, hand);
      c.n++; if (!why.length) c.ok++; c.read[d] = (c.read[d] || 0) + 1;
      continue;
    }
    n++;
    if (why.length) bad.push(`seme ${seed} ${id} ${hand} cal=${cal} ×${rate}: ${why.join('; ')}`);
  }
  return { n, bad, lim, ids };
}
