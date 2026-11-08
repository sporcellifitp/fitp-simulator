// Riscaldamento facoltativo (B16, decisione dell'utente dell'08/11 sera): i primi colpi della partita letti senza
// riscaldamento sono peggiori? Prima, dopo la calibrazione, il riscaldamento faceva giocare 2 dritti, 2 rovesci e un
// servizio (natpf_training.WARMUP_IDS): il gioco impara dai colpi dello scambio il colpo tipico (riferimento della forza,
// da 3 colpi), il centro della mira (seminato dalla calibrazione), la salita abituale e il piatto abituale. Senza
// riscaldamento questi riferimenti si assestano sui primi colpi della partita.
// Banco: lo stesso telefono simulato con il braccio (test/phone-sim.mjs, test/arm-sim.mjs, presa della foto), stessa
// calibrazione rapida (dritto e rovescio del braccio a forza kc: 0,6 colpetto, 1 normale, 1,3 deciso), poi
// A: subito i colpi della partita; B: prima 4 colpi del riscaldamento (dritto, dritto, rovescio, rovescio) e poi gli
// stessi colpi. I colpi sono quelli di una persona (forza 1 ± 0,2 del proprio colpo; nella partita anche piatto ±10° e
// 60 % dritti). Riferimento: lo stesso gesto letto da un telefono «assestato» (24 colpi della stessa persona, senza
// imparare dal gesto letto). Per i primi 10 colpi: tipo di colpo diverso dal riferimento, lato diverso, |forza − forza di riferimento|,
// |mira − mira di riferimento| (aimDev, gradi). È un banco sulle regole vere, non una misura di persone.
// Risultati (B16, 08/11, 12 semi × 10 colpi, destro; prima → dopo il pavimento del riferimento BOOT di natpf_phone_racket):
// calibrazione 0,3: tipo diverso 24 → 9 (8 con il riscaldamento), |Δforza| primi 3 0,24 → 0,13 (0,03); 0,6: 18 → 9 (8),
// 0,20 → 0,11 (0,03); 1: 8 → 8 (8), 0,02 (0,03); 1,3: 11 → 11 (8), 0,09 (0,03). Mancino uguale (scarti di un colpo).
//   node --import ./test/register.mjs scripts/audit/riscaldamento.mjs [--seeds=12] [--n=10] [--hand=right|left] [--kc=.3,.6,1,1.3]
//   V=1: anche i colpi letti con un tipo diverso dal riferimento
import { pathToFileURL } from 'node:url';
import { simPhone, rng } from '../../test/phone-sim.mjs';
import { armSwing, photoGrip, STROKES } from '../../test/arm-sim.mjs';
import { gesture, mirrorStroke } from './colpi.mjs';
import { gauss } from './headless-engine.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const SEEDS0 = +(arg('seeds') || 12), N0 = +(arg('n') || 10), HAND0 = arg('hand') || 'right';
let SEEDS = SEEDS0, N = N0, HAND = HAND0;
const strokesOf = hand => (hand === 'left' ? { forehand: mirrorStroke(STROKES.dritto), backhand: mirrorStroke(STROKES.rovescio) } : { forehand: STROKES.dritto, backhand: STROKES.rovescio });
// telefono con la presa insegnata e la calibrazione rapida con il braccio a forza kc
function phone({ seed, hand = HAND, kc = 1 }){
  const p = simPhone({ seed, shape: true, hand }); p.hand = hand;
  photoGrip(p, { hand });
  const R = rng(seed*31 + 5), S = strokesOf(hand);
  p.calibrate({ armGesture: w => { const s = (w === 'L') === (hand !== 'left') ? S.forehand : S.backhand; armSwing(p, { ...s, peak: s.peak*kc, wrist: s.wrist*kc, tremor: 4, R }); } });
  return p;
}
const play = (p, g, R, opts = {}) => { const m = gesture(p, { ...g, R }); return m.length === 1 ? p.game(m[0], opts) : null; };
// i colpi di una persona per la partita (stesse estrazioni per A, B e il riferimento)
function shots(seed){
  const R = rng(seed*7 + 1), out = [];
  for (let i = 0; i < N; i++) out.push({ side: R() < .6 ? 'forehand' : 'backhand', k: Math.max(.6, Math.min(1.5, 1 + gauss(R)*.2)), yaw: Math.max(-25, Math.min(25, gauss(R)*10)), seed: seed*100 + i });
  return out;
}
// riscaldamento e riferimento con la stessa persona (forza 1 ± 0,2 del proprio colpo)
const WARM = [{ side: 'forehand' }, { side: 'forehand' }, { side: 'backhand' }, { side: 'backhand' }];
const kOf = R => Math.max(.6, Math.min(1.5, 1 + gauss(R)*.2));
const read = r => r ? { shot: r.ev.natpf.shot, side: r.ev.side, power: r.ev.natpf.intent?.power ?? r.ev.natpf.power, aim: r.ev.natpf.aimDev, typical: null } : null;
// kc: forza dei gesti della calibrazione rispetto al proprio colpo; righe per colpo con A (senza) e B (con riscaldamento)
export function run(kc, { seeds = SEEDS0, n = N0, hand = HAND0 } = {}){
  SEEDS = seeds; N = n; HAND = hand;
  const rows = Array.from({ length: N }, () => ({ A: { type: 0, side: 0, dp: [], da: [], lost: 0 }, B: { type: 0, side: 0, dp: [], da: [], lost: 0 } }));
  for (let s = 1; s <= SEEDS; s++){
    const list = shots(s);
    // riferimento: telefono assestato con 24 colpi normali; legge ogni gesto senza impararlo
    const C = phone({ seed: s, kc }); { const R = rng(900 + s); for (let i = 0; i < 24; i++) play(C, { side: i % 2 ? 'backhand' : 'forehand', k: kOf(R) }, R); }
    const ref = list.map(g => read(play(C, g, rng(g.seed), { learn: false })));
    const A = phone({ seed: s, kc }), B = phone({ seed: s, kc });
    { const R = rng(500 + s); for (const g of WARM) play(B, { ...g, k: kOf(R) }, R); }
    list.forEach((g, i) => {
      for (const [key, p] of [['A', A], ['B', B]]){
        const r = read(play(p, g, rng(g.seed))), x = ref[i], row = rows[i][key];
        if (!r || !x){ row.lost++; continue; }
        if (r.shot !== x.shot){ row.type++; if (process.env.V) console.log(`  forza ${kc} seme ${s} colpo ${i + 1} ${key}: ${r.shot} (forza ${f(r.power)}) invece di ${x.shot} (forza ${f(x.power)}) · ${g.side} k ${f(g.k)}`); }
        if (r.side !== x.side) row.side++;
        if (Number.isFinite(r.power) && Number.isFinite(x.power)) row.dp.push(Math.abs(r.power - x.power));
        if (Number.isFinite(r.aim) && Number.isFinite(x.aim)) row.da.push(Math.abs(r.aim - x.aim));
      }
    });
  }
  return rows;
}
const mean = a => a.length ? a.reduce((x, y) => x + y, 0)/a.length : NaN;
const f = (v, d = 2) => Number.isFinite(v) ? v.toFixed(d) : '–';
// totali di A o B: tipo e lato diversi, |Δforza| (tutti e primi 3), |Δmira|, persi
export const totals = (rows, k) => ({ type: rows.reduce((s, r) => s + r[k].type, 0), side: rows.reduce((s, r) => s + r[k].side, 0), dp: mean(rows.flatMap(r => r[k].dp)), da: mean(rows.flatMap(r => r[k].da)), dp3: mean(rows.slice(0, 3).flatMap(r => r[k].dp)), lost: rows.reduce((s, r) => s + r[k].lost, 0) });
if (import.meta.url === pathToFileURL(process.argv[1]).href) for (const kc of (arg('kc') || '.3,.6,1,1.3').split(',').map(Number)){
  const rows = run(kc);
  console.log(`\n== calibrazione a forza ${kc} (${SEEDS} semi, mano ${HAND}) · A senza riscaldamento / B con 4 colpi di riscaldamento`);
  console.log('colpo  tipo≠rif A/B   lato≠rif A/B   |Δforza| A/B     |Δmira|° A/B    persi A/B');
  rows.forEach((r, i) => console.log(`${String(i + 1).padStart(4)}   ${String(r.A.type).padStart(4)}/${r.B.type}        ${String(r.A.side).padStart(3)}/${r.B.side}        ${f(mean(r.A.dp))}/${f(mean(r.B.dp))}      ${f(mean(r.A.da), 1)}/${f(mean(r.B.da), 1)}       ${r.A.lost}/${r.B.lost}`));
  const a = totals(rows, 'A'), b = totals(rows, 'B');
  console.log(`tutti  tipo≠ ${a.type}/${b.type} su ${SEEDS*N} · lato≠ ${a.side}/${b.side} · |Δforza| ${f(a.dp)}/${f(b.dp)} (primi 3: ${f(a.dp3)}/${f(b.dp3)}) · |Δmira| ${f(a.da, 1)}°/${f(b.da, 1)}° · persi ${a.lost}/${b.lost}`);
}
