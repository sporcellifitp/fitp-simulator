// B3 (04/11/2026): varianti del gesto «piatto» della dimostrazione su tutte le prese (martello, palmo, presa della foto
// dell'utente con varie inclinazioni, destro e mancino). Da natpf-tennis/: node --import ./test/register.mjs scripts/audit/sim-piatto-prese.mjs
const R = new URL('../../', import.meta.url).href;
const { armSwing, grip, palmGrip, STROKES } = await import(R + 'test/arm-sim.mjs');
const { simPhone } = await import(R + 'test/phone-sim.mjs');
const { GESTURES, strokeFor, mirrorStroke } = await import(R + 'src/natpf/natpf_gesture_motion.js');
const D = Math.PI/180;
function refGrip(p, { lean = 35, tilt = 40, hand = 'right' } = {}){ const m = hand === 'left' ? -1 : 1; p.pose([0, 0, 1], lean*m); p.pose([1, 0, 0], -tilt); p.rest(500, 4); }
function setup(kind, hand, o, seed = 7){
  const p = simPhone({ seed, shape: true, hand });
  if (kind === 'martello') grip(p, { tilt: o.tilt, side: (hand === 'left' ? -1 : 1)*(o.inward ? -1 : 1) });
  else if (kind === 'palmo') palmGrip(p, { tilt: o.tilt });
  else refGrip(p, { ...o, hand });
  const cal = w => hand === 'left' ? mirrorStroke(w === 'L' ? STROKES.rovescio : STROKES.dritto) : (w === 'L' ? STROKES.dritto : STROKES.rovescio);
  p.calibrate({ armGesture: w => armSwing(p, cal(w)) });
  return p;
}
const VAR = {
  attuale: GESTURES.flat.stroke,
  dritto1000polso: { axis: [-.18, 1, .08], peak: 1000, ms: 220, rc: [.45, -.5, -.25], wrist: 540, wristAxis: [0, 0, -1] },
  dritto1000: { axis: [-.18, 1, .08], peak: 1000, ms: 220, rc: [.45, -.5, -.25], wrist: 0, wristAxis: [0, 0, -1] },
  dritto950polso350: { axis: [-.18, 1, .08], peak: 950, ms: 220, rc: [.45, -.5, -.25], wrist: 350, wristAxis: [0, 0, -1] },
};
const GRIPS = [];
for (const tilt of [70, 80, 90, 105]) for (const inward of [false, true]) GRIPS.push(['martello', { tilt, inward }]);
for (const tilt of [50, 65, 80]) GRIPS.push(['palmo', { tilt }]);
for (const lean of [20, 35, 50]) for (const tilt of [25, 40, 55]) GRIPS.push(['foto', { lean, tilt }]);
for (const [name, st] of Object.entries(VAR)){
  let ok = 0, n = 0; const ko = [];
  for (const [kind, o] of GRIPS) for (const hand of ['right', 'left']) for (const seed of [7, 11]){
    const p = setup(kind, hand, o, seed), b = p.msgs.length;
    armSwing(p, { ...strokeFor(st, hand), back: true }); p.rest(900, 4);
    const out = p.msgs.slice(b).map(d => p.game(d, {})); n++;
    const shot = out.length === 1 ? out[0].ev.natpf.shot : `${out.length} colpi`, side = out[0] ? (out[0].ev.side ?? out[0].ev.natpf.side) : '';
    if (shot === 'flat' && side === 'forehand') ok++; else ko.push(`${kind} ${JSON.stringify(o)} ${hand} s${seed}: ${shot} ${side} rise ${out[0]?.ev.natpf.intent?.rise}`);
  }
  console.log(`${name}: ${ok}/${n}`); for (const k of ko.slice(0, 6)) console.log('   KO', k);
}
