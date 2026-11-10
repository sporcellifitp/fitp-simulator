// B17.1 passo B3, correzioni dopo la revisione del 10/11: fedeltà della presa a racchetta su TUTTI i semi del rumore del
// telefono simulato da 1 a 60 (ogni scheda e ogni esercizio della mira, destro e mancino, calibrazione con l'animazione e con
// il braccio simulato, 0,8× / 1× / 1,25×). I test natpf-gesture-semi-{a,b,c} ne leggono un terzo ciascuno (girano in
// parallelo), natpf-gesture-pose e natpf-gesture-anim la loro lista (seme del telefono simulato predefinito).
//
// LIMITE DICHIARATO (docs/b17/ottimizzazione.md §9.4), UN SOLO PUNTO DEL CODICE: con la calibrazione del braccio simulato
// (che tiene il telefono come nella posa di partenza, schermo di lato) la mira di incrociato e lungolinea e il piatto non si
// leggono come il colpo mostrato, perché lo schermo guarda la rete all'impatto del dritto (richiesta dell'utente del 09/11).
// Quelle letture NON sono verificate come giuste e nessun test le salta: `judgeOne` le legge comunque, le giudica e le
// registra in un conteggio (`DECLARED_EXPECT`) che ogni test confronta con il NUMERO ESATTO di letture giuste e con che cosa
// viene letto, per scheda: un peggioramento o un miglioramento fa fallire il test e va riscritto qui e nel documento.
import { readCard, judgeCard } from './pose-sensors.mjs';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import { GESTURES } from '../src/natpf/natpf_gesture_motion.js';

export const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
// semi letti da ciascun file di test (tre terzi dei semi 1–60) e dai due test che usano il seme predefinito del telefono simulato
export const SEEDS = Object.freeze({ a: range(1, 20), b: range(21, 40), c: range(41, 60) });

export const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], sliceBackhand: ['drop'], flat: ['topspin'] })[id] || null : null;
// schede e calibrazioni con un limite dichiarato (ottimizzazione.md §9): letture contate a parte, mai saltate
export const DECLARED = Object.freeze({ cross: ['arm'], line: ['arm'], flat: ['arm'] });
export const declared = (id, cal) => !!DECLARED[id]?.includes(cal);
const src = { name: 'racchetta', pose: (id, t, hand) => GP.gesturePose(id, t, { hand, grip: 'racchetta' }), plan: id => GP.gesturePlan(id, { grip: 'racchetta' }) };
export { src as racchettaSource };

// che cosa è stato letto (per le letture dei limiti dichiarati): colpi e lati, «+» fra due colpi; per incrociato e
// lungolinea anche la mira del primo colpo (riportata al destro: «incrociato» se < −0,4, «lungolinea» se > 0,4, «centro»)
export function describe(r, id, hand){
  if (!r?.read?.length) return 'niente';
  const s = r.read.map(x => x.ev.natpf.shot + '/' + (x.ev.side || '?')).join(' + '), w = r.read[0].ev.natpf.wrist;
  if (!GESTURES[id]?.aim || w == null) return s;
  const m = +w*(hand === 'left' ? -1 : 1);
  return `${s} mira ${m < -.4 ? 'incrociato' : m > .4 ? 'lungolinea' : 'centro'}`;
}
// conteggio delle letture dei limiti dichiarati: { n, ok, byCard: { id: { n, ok, read: { «che cosa»: volte } } } }
export const newTally = () => ({ n: 0, ok: 0, byCard: {} });
function tally(t, id, hand, r, ok){
  const c = t.byCard[id] ??= { n: 0, ok: 0, read: {} }, d = describe(r, id, hand);
  t.n++; c.n++; if (ok){ t.ok++; c.ok++; } c.read[d] = (c.read[d] || 0) + 1;
}
// una lettura: la fa SEMPRE e la giudica; se il colpo e la calibrazione hanno un limite dichiarato la registra nel conteggio
// `t` (e `why` resta vuoto: non è un errore, è la lettura del limite) invece di darla per giusta o saltarla
export function judgeOne(source, id, { hand, cal, rate = 1, seed, allow = allowFor(id, rate), peakTol, extra = null, racket = true }, t){
  const r = readCard(source, id, { hand, cal, rate, ...(seed != null ? { seed } : {}) });
  const why = judgeCard(source, id, r, { hand, rate, allow, ...(peakTol != null ? { peakTol } : {}) });
  if (extra) why.push(...extra(r));
  const lim = racket && declared(id, cal);
  if (lim) tally(t, id, hand, r, !why.length);
  return { r, why: lim ? [] : why, declared: lim };
}
export function readSeeds(seeds){
  const ids = GP.POSE_IDS.filter(id => !GESTURES[id].still), bad = [], lim = newTally();
  let n = 0;
  for (const seed of seeds) for (const id of ids) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left']) for (const rate of [1, .8, 1.25]){
    const j = judgeOne(src, id, { hand, cal, rate, seed }, lim);
    if (!j.declared) n++;
    if (j.why.length) bad.push(`seme ${seed} ${id} ${hand} cal=${cal} ×${rate}: ${j.why.join('; ')}`);
  }
  return { n, bad, lim, ids };
}
// verifica comune dei tre file dei semi: ogni lettura fuori dai limiti dichiarati giusta, le altre contate come da `expect`
export function checkSeeds(assert, key, expect){
  const seeds = SEEDS[key], { n, bad, lim, ids } = readSeeds(seeds);
  const declaredN = Object.values(DECLARED).reduce((s, c) => s + c.length, 0);
  assert.equal(n + lim.n, seeds.length*ids.length*12);
  assert.equal(lim.n, seeds.length*declaredN*6);
  assert.deepEqual(bad, [], bad.join('\n'));
  assert.deepEqual(lim.byCard, expect, JSON.stringify(lim.byCard));
  return { n, lim, seeds };
}
// conto misurato dei limiti dichiarati (da riscrivere, qui e in ottimizzazione.md §9.4, se cambia una coreografia)
export const DECLARED_EXPECT = Object.freeze({
  a: {"flat": {"n": 120, "ok": 40, "read": {"topspin/forehand": 120}}, "cross": {"n": 120, "ok": 0, "read": {"topspin/backhand + drop/forehand mira lungolinea": 40, "topspin/backhand mira lungolinea": 80}}, "line": {"n": 120, "ok": 0, "read": {"topspin/forehand + drop/forehand mira centro": 40, "topspin/forehand mira centro": 67, "topspin/backhand mira centro": 12, "lob/forehand mira centro": 1}}},
  b: {"flat": {"n": 120, "ok": 40, "read": {"topspin/forehand": 120}}, "cross": {"n": 120, "ok": 0, "read": {"topspin/backhand + drop/forehand mira lungolinea": 40, "topspin/backhand mira lungolinea": 80}}, "line": {"n": 120, "ok": 0, "read": {"topspin/forehand + drop/forehand mira centro": 40, "topspin/forehand mira centro": 62, "topspin/backhand mira centro": 18}}},
  c: {"flat": {"n": 120, "ok": 40, "read": {"topspin/forehand": 120}}, "cross": {"n": 120, "ok": 0, "read": {"topspin/backhand + drop/forehand mira lungolinea": 40, "topspin/backhand mira lungolinea": 80}}, "line": {"n": 120, "ok": 0, "read": {"topspin/forehand + drop/forehand mira centro": 40, "topspin/forehand mira centro": 64, "topspin/backhand mira centro": 15, "lob/forehand mira centro": 1}}},
  // natpf-gesture-pose (seme predefinito del telefono simulato, due mani × tre velocità = 6 letture per scheda: n = 2 al 1×)
  pose: {"flat":{"n":2,"ok":0,"read":{"topspin/forehand":2}},"cross":{"n":2,"ok":0,"read":{"topspin/backhand + drop/forehand mira lungolinea":2}},"line":{"n":2,"ok":0,"read":{"topspin/forehand + drop/forehand mira centro":2}}},
  // natpf-gesture-anim (seme predefinito, tre velocità)
  anim: {"flat":{"n":6,"ok":2,"read":{"topspin/forehand":6}},"cross":{"n":6,"ok":0,"read":{"topspin/backhand mira lungolinea":4,"topspin/backhand + drop/forehand mira lungolinea":2}},"line":{"n":6,"ok":0,"read":{"topspin/forehand mira centro":4,"topspin/forehand + drop/forehand mira centro":2}}},
  // natpf-gesture-pose, semi 2, 3, 11 non visti dall'ottimizzatore
  held: {"flat":{"n":18,"ok":6,"read":{"topspin/forehand":18}},"cross":{"n":18,"ok":0,"read":{"topspin/backhand + drop/forehand mira lungolinea":6,"topspin/backhand mira lungolinea":12}},"line":{"n":18,"ok":0,"read":{"topspin/forehand + drop/forehand mira centro":6,"topspin/forehand mira centro":10,"topspin/backhand mira centro":2}}} });
