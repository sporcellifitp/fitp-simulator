// Sessione del 28/10 sera (docs/WORK_PROGRESS.md, «Analisi della sessione del 28/10»): campioni veri del telefono
// rigiocati nel rilevatore con il profilo della partita (calibrazione rapida, telefono dritto nel pugno, asse del colpo
// quasi orizzontale: coseno 0,29 con l'alto).
//   • il rovescio del match point (957 °/s) era scartato per «verso»: ora è un rovescio;
//   • un gesto nel verso in cui arriva la palla non deve superare la soglia della preparazione (630 °/s per il dritto
//     di chi gioca): il dritto da 619 °/s parte se la palla è sul dritto; con la palla sul rovescio resta una preparazione;
//   • i colpi normali della partita restano com'erano;
//   • dopo un mezzo swing mandato come colpo, il colpo vero che segue senza pausa non si perde nel rientro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector, unit } from '../../site/js/tennis/swing-detect.js';
import { PROFILE_2810, WINDOWS_2810 } from './session-28-10.data.mjs';

function replay(rows, { expect = 0 } = {}){
  const det = createSwingDetector(), out = [];
  det.setProfile(PROFILE_2810); det.run(); det.setContext('play'); det.setPrepMode(true); det.setExpect(expect);
  for (const k of ['swing', 'discard', 'prep']) det.on(k, v => out.push({ k, ...v }));
  for (const r of rows) det.feed({ t: 1000 + r[0], rot: r.slice(1, 4), acc: r.slice(4, 7), accG: r.slice(7, 10) });
  return out;
}
const swings = out => out.filter(o => o.k === 'swing');
const show = out => JSON.stringify(out.map(o => ({ k: o.k, why: o.why, peak: o.peak, dir: o.dir })));

test('28/10: il rovescio del match point (957 °/s, asse di calibrazione quasi orizzontale) è un rovescio, non «verso»', () => {
  // con la palla sul rovescio (come in partita) il gesto morbido di prima, nel verso opposto, è la preparazione
  const out = replay(WINDOWS_2810.rovescioMatchPoint, { expect: -1 });
  assert.deepEqual(swings(out).map(s => s.dir), [-1], show(out));
  assert.ok(swings(out)[0].peak > 900, show(out));
  assert.ok(out.some(o => o.k === 'prep'), show(out));
  // senza verso atteso il rovescio resta un rovescio (il verso viene dalla rotazione attorno alla verticale)
  const free = replay(WINDOWS_2810.rovescioMatchPoint, { expect: 0 }), last = swings(free).at(-1);
  assert.equal(last.dir, -1, show(free)); assert.ok(last.peak > 900, show(free));
  for (const o of [out, free]) assert.ok(!o.some(d => d.why === 'verso'), show(o));
});

test('28/10: nel verso in cui arriva la palla il dritto da 619 °/s parte; con la palla sul rovescio resta una preparazione', () => {
  const toward = replay(WINDOWS_2810.pallonettoDritto, { expect: 1 }), sw = swings(toward);
  assert.equal(sw.length, 1, show(toward));
  assert.equal(sw[0].dir, 1);
  const away = replay(WINDOWS_2810.pallonettoDritto, { expect: -1 });
  assert.equal(swings(away).length, 0, show(away));
  const unknown = replay(WINDOWS_2810.pallonettoDritto, { expect: 0 });
  assert.equal(swings(unknown).length, 0, show(unknown));
});

test('28/10: dopo la preparazione alta sopra la spalla lo swing da 1800 °/s parte', () => {
  const out = replay(WINDOWS_2810.preparazioneAlta, { expect: 1 }), sw = swings(out);
  assert.ok(sw.length >= 1, show(out));
  assert.ok(sw.at(-1).peak > 1500, show(out));
});

test('28/10: dritti e rovesci normali della partita restano colpi, con il verso giusto', () => {
  const fh = swings(replay(WINDOWS_2810.dritto, { expect: 1 }));
  assert.deepEqual(fh.map(s => s.dir), [1]);
  const bh = swings(replay(WINDOWS_2810.rovescio, { expect: -1 }));
  assert.deepEqual(bh.map(s => s.dir), [-1]);
});

// gesto a campana attorno all'asse del profilo (dir +1 dritto, −1 rovescio), a 60 Hz
const G = PROFILE_2810.gravity.map(v => v*9.81), AX = unit(PROFILE_2810.axis);
function gesture(det, t0, { peak, angle, dir = 1 }){
  const dur = 2*angle/peak*1000, n = Math.max(4, Math.round(dur/16.7));
  for (let i = 0; i <= n; i++){ const u = i/n, m = peak*Math.sin(Math.PI*u)**2; det.feed({ t: t0 + i*dur/n, rot: AX.map(a => a*m*dir), acc: [0, 0, 0], accG: G }); }
  return t0 + dur;
}
const rest = (det, t0, ms) => { let t = t0; for (; t < t0 + ms; t += 16.7) det.feed({ t, rot: [2*Math.sin(t), 2*Math.cos(t), 1], acc: [0, 0, 0], accG: G }); return t; };

test('dopo un colpo debole, un gesto molto più forte senza pausa è il colpo vero: non resta bloccato nel rientro', () => {
  const run = opts => {
    const det = createSwingDetector(opts), out = [];
    det.setProfile(PROFILE_2810); det.run(); det.setContext('play'); det.setPrepMode(true); det.setExpect(1);
    det.on('swing', s => out.push(s));
    let t = rest(det, 0, 600);
    t = gesture(det, t + 17, { peak: 480, angle: 60 });        // mezzo swing (parte: palla corta per il telefono)…
    t = gesture(det, t + 17, { peak: 1150, angle: 110 });      // … e subito, senza fermarsi, il colpo vero
    rest(det, t + 17, 800);
    return out;
  };
  const now = run({});
  assert.deepEqual(now.map(s => s.dir), [1, 1], JSON.stringify(now.map(s => s.peak)));
  assert.ok(now[1].peak > 2*now[0].peak);
  // la regola spenta: il colpo vero si perdeva nel rientro del mezzo swing
  assert.equal(run({ afterWeak: Infinity }).length, 1);
});
