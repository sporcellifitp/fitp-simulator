// Letture dei gesti del tutorial con il telefono simulato completo, più larghe dei test (B14, 08/11/2026): stesse
// funzioni dei test (test/pose-sensors.mjs readCard/judgeCard) su molte velocità, semi e prese. Serve a confrontare due
// versioni dell'animazione prima di integrarle (nel B14 ritocchi verdi nei test sbagliavano a 1,1× o a 0,9×).
// Uso, da natpf-tennis/:
//   node --import ./test/register.mjs scripts/audit/letture-gesti.mjs . <modo>
//   modi: std (come i test), sweep (0,80–1,25× ogni 0,025), imitrates (prese di chi imita a 0,9/1,1/1,2×), seeds (semi 1–6),
//         rates (velocità fuori campo 0,7–1,4× per i colpi lenti). V=1 stampa anche le letture giuste.
// Riferimento 2026-11-08.3: std 736/736, sweep 1658/1672, imitrates 1148/1152, seeds 528/528 (gli errori sono quelli già
// presenti prima del B14: piatto con la presa a martello un poco più veloce letto top spin; volée 50/25 a 0,9× pallonetto).
//   mode seeds : all stroke cards at rate 1, palmo+martello, seeds 1..6
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = pathToFileURL(path.resolve(process.argv[2] || '.')).href, mode = process.argv[3] || 'std';
const GP = await import(root + '/src/natpf/natpf_gesture_pose.js');
const { readCard, judgeCard } = await import(root + '/test/pose-sensors.mjs');
const { GESTURES } = await import(root + '/src/natpf/natpf_gesture_motion.js');
const { gesturePose, gesturePlan } = GP;
const source = grip => ({ pose: (id, t, hand) => gesturePose(id, t, { hand, grip }), plan: id => gesturePlan(id, { grip }) });
const allowFor = (id, rate) => rate > 1 ? (['forehand', 'backhand', 'volley', 'cross', 'line'].includes(id) ? ['flat'] : null)
  : rate < 1 ? ({ slice: ['drop'], flat: ['topspin'] })[id] || null : null;
const fmt = r => r.kind === 'serve' ? `${r.events.length}g gap=${r.gap?.toFixed(3)} dPk=${r.dPeak?.toFixed(1)}`
  : (r.read.map(x => `${x.ev.natpf.shot}${x.ev.side ? '/' + x.ev.side : ''} v${x.ev.natpf.peak} r${x.ev.natpf.intent?.rise} pl${x.ev.natpf.intent?.plane}`).join(' + ') || '-') + ` dPk=${r.dPeak?.toFixed(1)}`;
let n = 0, bad = 0; const out = [];
function one(grip, gs, id, hand, cal, rate, seed = 7){
  const src = source(grip); n++;
  const r = readCard(src, id, { hand, cal, rate, seed });
  const why = judgeCard(src, id, r, { hand, rate, allow: allowFor(id, rate) });
  if (id === 'serve' && r.msgs.length !== 2) why.push(`${r.msgs.length} msgs`);
  const line = `${gs} ${id} ${hand} cal=${cal} x${rate} s${seed}: ${fmt(r)}`;
  if (why.length){ bad++; out.push('KO ' + line + '  <- ' + why.join('; ')); } else if (process.env.V) out.push('ok ' + line);
}
const imit = [20, 35, 50].flatMap(lean => [25, 40, 55].map(tilt => ({ lean, tilt })));
if (mode === 'std'){
  for (const grip of ['palmo', 'martello']) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left']) for (const rate of [.8, 1, 1.25]) for (const id of GP.POSE_IDS){
    if (rate !== 1 && GESTURES[id].still) continue;
    one(grip, grip, id, hand, cal, rate);
  }
  for (const g of imit) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left']) for (const id of GP.POSE_IDS){
    if (g.lean === 50 && id === 'flat') continue;
    one(g, `${g.lean}/${g.tilt}`, id, hand, cal, 1);
  }
} else if (mode === 'rates'){
  for (const grip of ['palmo', 'martello']) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left']) for (const rate of [.7, .9, 1.1, 1.15, 1.2, 1.3, 1.4])
    for (const id of ['serve', 'smash', 'volley', 'backhand', 'lob', 'slice', 'drop']) one(grip, grip, id, hand, cal, rate);
} else if (mode === 'sweep'){
  const ids = (process.env.IDS || GP.POSE_IDS.filter(id => !GESTURES[id].still).join(',')).split(',');
  for (let i = 0; i <= 18; i++){ const rate = +(.8 + i*.025).toFixed(3);
    for (const grip of ['palmo', 'martello']) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left']) for (const id of ids) one(grip, grip, id, hand, cal, rate); }
} else if (mode === 'imitrates'){
  for (const g of imit) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left']) for (const rate of [.9, 1.1, 1.2])
    for (const id of GP.POSE_IDS.filter(id => !GESTURES[id].still && !(g.lean === 50 && id === 'flat'))) one(g, `${g.lean}/${g.tilt}`, id, hand, cal, rate);
} else if (mode === 'seeds'){
  for (const grip of ['palmo', 'martello']) for (const cal of ['pose', 'arm']) for (const hand of ['right', 'left']) for (const seed of [1, 2, 3, 4, 5, 6])
    for (const id of GP.POSE_IDS.filter(id => !GESTURES[id].still)) one(grip, grip, id, hand, cal, 1, seed);
}
console.log(out.join('\n'));
console.log(`${mode}: ${n - bad}/${n} ok`);
