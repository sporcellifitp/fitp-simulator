// Audit B19 (V-EQ-1): «agitare il telefono» senza guardare la palla. Catena VERA del telefono (rilevatore dei colpi, forma,
// messaggio, lettura del gioco: test/phone-sim.mjs) con il telefono scosso avanti e indietro attorno alla verticale; filtro
// «palla che si allontana» come NatpfPhoneRacket._onSwing. Avversario: un profilo normale del banco dei due umani.
// Uso, da natpf-tennis: node --import ./test/register.mjs scripts/audit/b19/agitare.mjs [--partite=30] [--ritmi=800x3,650x2,800x4]
import { play, pc, qt } from './due-umani.mjs';
const { simPhone } = await import('../../../test/phone-sim.mjs');
const { ballIsHigh, ballMovingAway } = await import('../../../src/natpf/natpf_phone_racket.js');
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const say = s => console.log(s), N = +(arg('partite') || 30);
const RITMI = (arg('ritmi') || '800x3,650x2,800x4').split(',').map(x => x.split('x').map(Number));
function shaker({ amp = 650, hz = 2, calPeak = 420, seed = 5, vy = 0 }){
  const ph = simPhone({ seed, shape: true }); const c = ph.calibrate({ peak: calPeak, soft: true });
  if (!c.ok){ const c2 = ph.calibrate({ peak: Math.max(calPeak, 600), soft: true }); if (!c2.ok) throw new Error('calibrazione non riuscita'); }
  const st = { ph, acc: 0, t: 0, seen: ph.msgs.length, sent: 0, ignored: 0, shots: {}, peaks: [] };
  const driver = (e, s, dt) => {
    st.acc += dt;
    while (st.acc >= 1/60){ st.acc -= 1/60; st.t += 1/60; const w = amp*Math.sin(2*Math.PI*hz*st.t); ph.sampleWorld([0, w, 0], [0, vy*Math.sin(2*Math.PI*hz*st.t), -3*Math.cos(2*Math.PI*hz*st.t)]); }
    while (st.seen < ph.msgs.length){ const d = ph.msgs[st.seen++]; const role = s.k;
      if (ballMovingAway(e, role)){ st.ignored++; continue; }
      const { ev, s: sw } = ph.game(d, { ballHigh: ballIsHigh(e, role), rally: true });
      ev.natpf.typical = ph.models.typical.value ?? undefined; ev.natpf.peak ??= sw.peak; ev.natpf.angle = sw.angle; ev.natpf.latency = 0.02;
      st.sent++; st.shots[ev.natpf.shot] = (st.shots[ev.natpf.shot] || 0) + 1; st.peaks.push(sw.peak);
      role === 'p2' ? e._handleP2SwingInput({ ...ev, source: 'phone', hand: 'right' }) : e._handleUserSwingInput(ev); }
  };
  return { st, driver };
}
const SEEDS = [419, 523];
for (const [amp, hz] of RITMI) for (const opp of ['bambino', 'medio', 'amatore']){
  let w = 0, n = 0, pw = 0, pn = 0, stats = { sent: 0, ignored: 0, shots: {}, grades: {}, peaks: [] }, strokes = [];
  for (const side of ['p1', 'p2']) for (const seed of SEEDS){
    const { st, driver } = shaker({ amp, hz, seed });
    const me = { base: 'bambino', driver, name: 'agita' };
    const r = play({ a: side === 'p1' ? me : opp, b: side === 'p1' ? opp : me, matches: N, seed });
    n += r.matches.length; w += r.matches.filter(m => m.win === side).length; pn += r.pts.length; pw += r.pts.filter(p => p.win === side).length; strokes.push(...r.pts.map(p => p.n));
    stats.sent += st.sent; stats.ignored += st.ignored; for (const k in st.shots) stats.shots[k] = (stats.shots[k] || 0) + st.shots[k]; stats.peaks.push(...st.peaks);
    for (const x of r.shots.filter(x => x.k === side)) stats.grades[x.grade] = (stats.grades[x.grade] || 0) + 1;
  }
  say(`agita ±${amp} °/s a ${hz} Hz contro ${opp}: vince ${pc(w, n)}% di ${n} partite · punti ${pc(pw, pn)}% · colpi per punto m ${(strokes.reduce((a, b) => a + b, 0)/strokes.length).toFixed(1)} · gesti letti ${stats.sent} (scartati perché la palla si allontana ${stats.ignored}) tipi ${JSON.stringify(stats.shots)} · picco mediano ${Math.round(qt(stats.peaks, .5))} · voti ${JSON.stringify(stats.grades)}`);
}
