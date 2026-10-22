// Audit della calibrazione e del riconoscimento con il telefono simulato (test/phone-sim.mjs, stessa catena della pagina
// del telefono e del computer): per ogni presa (inclinazione in avanti, schermo girato), ampiezza e velocità del gesto,
// polso che prona e tremolio della mano, calibra come farebbe chi gioca (presa tenuta durante la calibrazione) e poi
// gioca 6 dritti e 6 rovesci con lo stesso gesto. Riporta: calibrazione riuscita o no (e perché), colpi persi, lato
// sbagliato, colpi speciali non voluti, ritardo del riconoscimento (dal picco alla decisione sul telefono).
//   node --import ./test/register.mjs scripts/audit/calibration-matrix.mjs [--quick] [--forma [--senza-abituale]]
// --forma: il telefono di oggi, che manda la forma del colpo (tipo dalla forma, natpf_stroke_intent.js), con la salita
// abituale dei gesti della calibrazione; --senza-abituale: la stessa forma letta con le soglie assolute (confronto).
import { simPhone } from '../../test/phone-sim.mjs';

const QUICK = process.argv.includes('--quick'), SHAPE = process.argv.includes('--forma'), HABITUAL = !process.argv.includes('--senza-abituale');
const TILTS = QUICK ? [0, 60] : [0, 35, 60, 80];          // gradi: telefono inclinato in avanti nel pugno
const YAWS = QUICK ? [0, 90] : [0, 45, 90];               // gradi: schermo girato di lato
const GESTURES = QUICK
  ? [{ name: 'piccolo lento', peak: 260, ms: 380 }, { name: 'normale', peak: 700, ms: 260 }, { name: 'ampio veloce', peak: 1300, ms: 200 }]
  : [{ name: 'minimo', peak: 180, ms: 420 }, { name: 'piccolo lento', peak: 260, ms: 380 }, { name: 'piccolo', peak: 380, ms: 280 }, { name: 'normale', peak: 700, ms: 260 }, { name: 'ampio', peak: 1000, ms: 240 }, { name: 'ampio veloce', peak: 1300, ms: 200 }];
const WRISTS = QUICK ? [0, 600] : [0, 400, 800];          // °/s di pronazione nella seconda metà del gesto
const TREMORS = [0, 8];                                    // °/s di tremolio della mano
const HANDS = process.argv.includes('--lefty') ? ['right', 'left'] : ['right'];

const rows = [];
let seed = 1;
for (const hand of HANDS) for (const tilt of TILTS) for (const yaw of YAWS) for (const g of GESTURES) for (const wrist of WRISTS) for (const tremor of TREMORS){
  const p = simPhone({ seed: seed++, hand, shape: SHAPE, habitual: HABITUAL });
  // presa: schermo girato attorno alla verticale, poi inclinato in avanti; la si tiene per tutta la prova
  p.pose([0, 1, 0], yaw); p.pose([1, 0, 0], -tilt); p.rest(400, tremor);
  const gesture = { peak: g.peak, ms: g.ms, wrist, wristAxis: [0, 0, -1] };
  const cal = p.calibrate({ soft: true, tremor, ...gesture });
  const row = { hand, tilt, yaw, gesture: g.name, wrist, tremor, cal: cal.ok, calWhy: cal.ok ? '' : cal.result?.why || cal.step, attempts: cal.attempts.map(a => a.want + a.dir + (a.ok ? '' : '!')).join(' ') };
  if (cal.ok){
    const before = p.msgs.length;
    const plan = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
    for (const s of plan){ p.rest(700, tremor); p.swing({ axis: [0, s, 0], tremor, ...gesture }); }
    p.rest(800, tremor);
    const msgs = p.msgs.slice(before), evs = msgs.map(d => p.game(d));
    const sides = evs.map(r => r.ev.side), shots = evs.map(r => r.ev.natpf.shot);
    // un gesto, un colpo: si confrontano in ordine (un colpo in più o in meno sposta tutto ed è già un errore)
    const want = plan.map(s => (s === 1) !== (hand === 'left') ? 'forehand' : 'backhand');
    row.shots = msgs.length; row.extra = Math.max(0, msgs.length - plan.length); row.missed = Math.max(0, plan.length - msgs.length);
    row.wrongSide = want.filter((w, i) => sides[i] && sides[i] !== w).length;
    row.special = shots.filter(x => x !== 'topspin' && x !== 'flat').length;
    if (row.special) row.specials = evs.filter(r => r.ev.natpf.shot !== 'topspin' && r.ev.natpf.shot !== 'flat').slice(0, 3).map(r => `${r.ev.side}:${r.ev.natpf.shot} (${r.ev.natpf.why.join(', ')}) v=${r.ev.natpf.v} move=${r.ev.natpf.move} head=${r.ev.natpf.head}`);
    row.detectMs = msgs.length ? Math.round(msgs.map(d => d.sd ?? 0).reduce((a, b) => a + b, 0)/msgs.length) : null;
    // colpi speciali voluti (gesti del simulatore come nei test): due pallonetti e due palle corte
    const b2 = p.msgs.length;
    for (const kind of ['lob', 'lob', 'drop', 'drop']){
      p.rest(700, tremor);
      // stessi gesti dei test, in proporzione al proprio colpo (chi calibra con gesti piccoli fa anche lob piccoli)
      const k = Math.max(.45, Math.min(1.6, g.peak/700));
      if (kind === 'lob') p.swing({ axis: [1, .35, 0], peak: 650*k, vy: 9, push: 2, tremor });
      else p.swing({ axis: [.6, 1, 0], peak: 430*k, vy: -8, push: 2, tremor });
    }
    p.rest(800, tremor);
    const sp = p.msgs.slice(b2).map(d => p.game(d).ev.natpf.shot);
    row.lobOk = sp.slice(0, 2).filter(x => x === 'lob').length; row.dropOk = sp.slice(2).filter(x => x === 'drop').length; row.specialsGot = sp.join(',');
  }
  rows.push(row);
}
// riassunto
const fails = rows.filter(r => !r.cal), played = rows.filter(r => r.cal);
const sum = k => played.reduce((a, r) => a + (r[k] || 0), 0);
console.log(`prove: ${rows.length} · calibrazioni non riuscite: ${fails.length}`);
console.log(`colpi giocati: ${played.length*12} · persi: ${sum('missed')} · in più: ${sum('extra')} · lato sbagliato: ${sum('wrongSide')} · colpi speciali non voluti: ${sum('special')}`);
console.log(`pallonetti riconosciuti: ${sum('lobOk')}/${played.length*2} · palle corte riconosciute: ${sum('dropOk')}/${played.length*2}`);
const by = key => { const m = new Map(); for (const r of rows){ const k = r[key]; const o = m.get(k) || { n: 0, fail: 0, missed: 0, wrong: 0, special: 0 }; o.n++; if (!r.cal) o.fail++; o.missed += r.missed || 0; o.wrong += r.wrongSide || 0; o.special += r.special || 0; m.set(k, o); } return [...m].map(([k, o]) => `${k}: calibr. KO ${o.fail}/${o.n}, persi ${o.missed}, lato ${o.wrong}, speciali ${o.special}`).join('\n  '); };
for (const k of ['hand', 'tilt', 'yaw', 'gesture', 'wrist', 'tremor']) console.log(`per ${k}:\n  ${by(k)}`);
const sp = key => { const m = new Map(); for (const r of played){ const o = m.get(r[key]) || { n: 0, lob: 0, drop: 0 }; o.n += 2; o.lob += r.lobOk; o.drop += r.dropOk; m.set(r[key], o); } return [...m].map(([k, o]) => `${k}: pallonetti ${o.lob}/${o.n}, palle corte ${o.drop}/${o.n}`).join('\n  '); };
for (const k of ['tilt', 'yaw', 'gesture', 'wrist']) console.log(`colpi speciali per ${k}:\n  ${sp(k)}`);
const dm = played.map(r => r.detectMs).filter(Number.isFinite);
if (dm.length) console.log(`riconoscimento dopo il picco: media ${Math.round(dm.reduce((a, b) => a + b, 0)/dm.length)} ms, max ${Math.max(...dm)} ms`);
if (process.argv.includes('--list')) for (const r of rows.filter(r => !r.cal || r.missed || r.extra || r.wrongSide || r.special || (r.cal && (r.lobOk < 2 || r.dropOk < 2)))) console.log(JSON.stringify(r));
