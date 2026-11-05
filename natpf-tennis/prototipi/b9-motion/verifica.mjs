// Verifica di fedeltà del prototipo «motion»: la posa DISEGNATA (gesturePose di motion.js, la stessa che main.js disegna)
// diventa campioni dei sensori del telefono simulato completo (test/phone-sim.mjs: rilevatore, forma del colpo, calibrazione
// rapida vera, mappatura del gioco), come proposto in docs/b9/specifica-gesti.md §6.
// Da natpf-tennis/:  node --import ./test/register.mjs prototipi/b9-motion/verifica.mjs
import { simPhone } from '../../test/phone-sim.mjs';
import { armSwing, STROKES, returnTo } from '../../test/arm-sim.mjs';
import { mirrorStroke } from '../../src/natpf/natpf_gesture_motion.js';
import { gesturePose, plan, omega, rotSpeed } from './motion.js';

const DT = 1000/60;
// fa eseguire al telefono simulato la posa animata da t0 a t1 (tempo del gesto, s); rate: velocità dell'imitazione (1 =
// tempo reale). Restituisce l'istante (ms del telefono) che corrisponde a t = 0 del gesto.
function playPose(p, id, hand, { rate = 1, t0 = 0, t1 = plan(id).total, after = null } = {}){
  const P = t => gesturePose(id, t, { hand });
  returnTo(p, P(t0).q, 60); p.rest(400, 2);
  const dt = DT/1000, dtg = dt*rate, N = Math.round((t1 - t0)/dtg), at = k => P(t0 + k*dtg);
  const start = p.t - t0/rate*1000;
  let prev = at(-1), cur = at(0);
  for (let k = 0; k < N; k++){
    const next = at(k + 1);
    p.sampleWorld(omega(cur.q, next.q, dt), [0, 1, 2].map(j => (next.pos[j] - 2*cur.pos[j] + prev.pos[j])/(dt*dt)));
    after?.(k); prev = cur; cur = next;
  }
  return start;
}
// telefono calibrato: 'arm' = dritto e rovescio del braccio simulato; 'pose' = il dritto e il rovescio DI QUESTA
// animazione (chi imita il tutorial anche in calibrazione)
function phoneFor(hand, cal){
  const p = simPhone({ seed: 7, shape: true, hand });
  returnTo(p, gesturePose('forehand', 0, { hand }).q, 60); p.rest(500, 4);
  const armCal = w => armSwing(p, hand === 'left' ? mirrorStroke(w === 'L' ? STROKES.rovescio : STROKES.dritto) : (w === 'L' ? STROKES.dritto : STROKES.rovescio));
  const poseCal = w => playPose(p, (w === 'L') === (hand !== 'left') ? 'forehand' : 'backhand', hand);
  p.calibrate({ armGesture: cal === 'pose' ? poseCal : armCal });
  return p;
}
const EXPECT = {
  forehand: { shot: ['topspin'], side: 'forehand' },
  backhand: { shot: ['topspin'], side: 'backhand' },
  lob: { shot: ['lob'] },
  drop: { shot: ['drop'] },
};
const rows = []; let fail = 0;
for (const cal of ['arm', 'pose']) for (const hand of ['right', 'left']) for (const rate of [1, .8, 1.25]){
  const out = [];
  for (const id of Object.keys(EXPECT)){
    const p = phoneFor(hand, cal), b = p.msgs.length;
    const start = playPose(p, id, hand, { rate }); p.rest(900, 4);
    const msgs = p.msgs.slice(b), read = msgs.map(d => p.game(d, { ballHigh: false }));
    // imitazione più veloce: dove la velocità è il discriminante vale il verso del cambiamento (specifica §6.5):
    // il proprio dritto (o rovescio) più veloce del 25% diventa piatto
    const e = rate > 1 && (id === 'forehand' || id === 'backhand') ? { ...EXPECT[id], shot: ['topspin', 'flat'] } : EXPECT[id], r = read[0]?.ev;
    const dtPeak = msgs[0] ? Math.round(msgs[0].pk - (start + plan(id).contact/rate*1000)) : null;
    const ok = read.length === 1 && e.shot.includes(r.natpf.shot) && (!e.side || r.side === e.side) && Math.abs(dtPeak) <= 40;
    if (!ok) fail++;
    out.push(`${id}:${read.map(x => x.ev.natpf.shot + (x.ev.side ? '/' + x.ev.side[0] : '')).join('+') || '—'} Δ${dtPeak}ms${ok ? '' : ' ✗'}`);
  }
  // servizio: due messaggi nel contesto serve → toss, battuta 0,69 ± 0,10 s dopo il lancio
  {
    const p = phoneFor(hand, cal), ev = []; let sw = false;
    const off = p.det.on('swing', s => { ev.push(s); if (ev.length === 1) sw = true; });
    p.det.setContext('serve');
    const start = playPose(p, 'serve', hand, { rate, after: () => { if (sw){ sw = false; p.det.setContext('toss'); } } });
    p.rest(600, 3); void off;
    const P = plan('serve'), gap = ev[1] ? (ev[1].peakT - ev[0].peakT)/1000 : null;
    const dHit = ev[1] ? Math.round(ev[1].peakT - (start + P.contact/rate*1000)) : null;
    const ok = ev.length === 2 && Math.abs(gap - .69/rate) <= .1 && Math.abs(dHit) <= 40;
    if (!ok && rate === 1) fail++;
    out.push(`serve:${ev.length} msg, gap ${gap?.toFixed(3)} s, Δ${dHit}ms${ok ? '' : (rate === 1 ? ' ✗' : ' (≠ 0,69: imitazione)')}`);
  }
  rows.push(`cal=${cal} ${hand.padEnd(5)} ×${String(rate).padEnd(4)} ${out.join('  ')}`);
}
// presa: ferma, nessun messaggio e rotazione ≤ 30 °/s
{
  let mx = 0; for (let t = 0; t < 8; t += 1/120) mx = Math.max(mx, rotSpeed('grip', t));
  rows.push(`grip: rotazione massima ${mx.toFixed(1)} °/s ${mx <= 30 ? '' : '✗'}`);
  if (mx > 30) fail++;
}
console.log(rows.join('\n'));
console.log(fail ? `ERRORI: ${fail}` : 'tutto riconosciuto come mostrato');
process.exitCode = fail ? 1 : 0;
