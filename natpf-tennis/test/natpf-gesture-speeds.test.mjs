// Fedeltà dei gesti del tutorial alle velocità intermedie (B14, 08/11/2026). La specifica (docs/b9/specifica-gesti.md
// §6.5) chiede letture giuste per chi imita tra 0,8× e 1,25×, ma natpf-gesture-pose campiona solo 0,8×, 1× e 1,25×.
// Nel B14 tre ritocchi verdi in quei tre punti sbagliavano in mezzo (verifiche indipendenti con un passo di 0,025×):
// servizio con un terzo gesto a 1,05-1,225×, schiacciata con un pallonetto fantasma a 0,85-0,975× (calibrazione col
// braccio) e volée letta palla corta a 1,1-1,225×; un dritto letto tagliato con le prese di chi imita a 1,2×. Qui:
// sette velocità intermedie per tutte le schede che si muovono (presa nel palmo e a martello, destro e mancino, le due
// calibrazioni) e le nove prese di chi imita a 1,2×. Gli errori già presenti prima del B14 (04a702d) sono elencati sotto
// con il motivo: la prova fallisce se ne compare uno nuovo o se uno noto sparisce (allora va tolto dall'elenco).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readCard, judgeCard } from './pose-sensors.mjs';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import { GESTURES } from '../src/natpf/natpf_gesture_motion.js';

const { gesturePose, gesturePlan } = GP;
const source = grip => ({ pose: (id, t, hand) => gesturePose(id, t, { hand, grip }), plan: id => gesturePlan(id, { grip }) });
const STROKES = GP.POSE_IDS.filter(id => !GESTURES[id].still);
// come natpf-gesture-pose: dove la velocità è il discriminante si ammette solo il cambiamento nel verso giusto
const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], sliceBackhand: ['drop'], flat: ['topspin'] })[id] || null : null;
// già presenti in 04a702d (prima del B14): con la presa a martello il piatto un poco più veloce del proprio dritto torna
// top spin (la salita resta dentro la finestra del dritto). Fuori da questa prova, sempre già prima del B14: la volée a
// 0,9× con la presa 50/25 è letta pallonetto
const KNOWN = new Set([
  ...[[1.05, 'arm'], [1.15, 'pose'], [1.2, 'pose']].flatMap(([r, cal]) => ['right', 'left'].map(h => `martello flat ${h} cal=${cal} ×${r}`)),
]);

function sweep(rows){
  const bad = [], seen = new Set();
  for (const { grip, tag, id, hand, cal, rate } of rows){
    const src = source(grip), r = readCard(src, id, { hand, cal, rate });
    const why = judgeCard(src, id, r, { hand, rate, allow: allowFor(id, rate) });
    if (id === 'serve' && r.msgs.length !== 2) why.push(`${r.msgs.length} gesti`);
    const key = `${tag} ${id} ${hand} cal=${cal} ×${rate}`;
    if (!why.length) continue;
    if (KNOWN.has(key)) seen.add(key); else bad.push(`${key}: ${why.join('; ')}`);
  }
  return { bad, seen };
}

test('velocità intermedie: ogni scheda dà il colpo mostrato a 0,85-1,2× (palmo e martello, destro e mancino, due calibrazioni); servizio sempre due gesti', () => {
  const rows = [];
  for (const rate of [.85, .9, .95, 1.05, 1.1, 1.15, 1.2]) for (const grip of ['palmo', 'martello']) for (const cal of ['pose', 'arm'])
    for (const hand of ['right', 'left']) for (const id of STROKES) rows.push({ grip, tag: grip, id, hand, cal, rate });
  const { bad, seen } = sweep(rows);
  assert.deepEqual(bad, [], bad.join('\n'));
  const known = [...KNOWN].filter(k => [.85, .9, .95, 1.05, 1.1, 1.15, 1.2].some(r => k.endsWith(`×${r}`)));
  assert.deepEqual(known.filter(k => !seen.has(k)), [], 'errori noti spariti: toglierli da KNOWN');
});

test('prese di chi imita a 1,2× (cima 20/35/50° verso l\'interno, 25/40/55° in avanti): ogni scheda dà il colpo mostrato', () => {
  const rows = [];
  for (const lean of [20, 35, 50]) for (const tilt of [25, 40, 55]) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left'])
    for (const id of STROKES){ if (lean === 50 && id === 'flat') continue; rows.push({ grip: { lean, tilt }, tag: `${lean}/${tilt}`, id, hand, cal, rate: 1.2 }); }
  const { bad } = sweep(rows);
  assert.deepEqual(bad, [], bad.join('\n'));
});
