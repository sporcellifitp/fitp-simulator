// Telefono come racchetta virtuale (docs/NATPF_RACCHETTA_VIRTUALE.md): mano unica, verso del gesto senza calibrazione,
// forma del colpo misurata dai sensori, preparazione distinta dal colpo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { parseSwingMessage } from '@natpf/tennis/swing-message.js';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { racketSim, strokeDir } from './racket-sim.mjs';

/* ---------- mano unica ---------- */
test('mano: una sola, quella del gioco; va al telefono, torna dal telefono e la calibrazione non la cambia', () => {
  const sent = [];
  const phone = new NatpfPhoneRacket({ playerRole: 'p1' });
  phone.link = { connected: true, send: m => sent.push(m), cmd(){} };
  phone._sendGrip();
  assert.equal(sent.find(m => m.t === 'cfg').hand, 'right');
  // il gioco passa a mancino: il telefono lo riceve subito
  phone.setHand('left');
  assert.equal(phone.hand, 'left');
  assert.equal(sent.filter(m => m.t === 'cfg').at(-1).hand, 'left');
  // la calibrazione finisce con un profilo «destro» (vecchia pagina del telefono): il gioco resta mancino e lo rimanda
  phone._onCal({ kind: 'done', profile: { hand: 'right', version: 4 } });
  assert.equal(phone.hand, 'left');
  assert.equal(sent.filter(m => m.t === 'cfg').at(-1).hand, 'left');
  // cambiata sulla pagina del telefono: la applica il gioco (onHand), che la rimanda
  const applied = []; phone.onHand = h => { applied.push(h); phone.setHand(h); };
  phone._onPhoneHand('right');
  assert.deepEqual(applied, ['right']);
  assert.equal(phone.hand, 'right');
  assert.equal(sent.filter(m => m.t === 'cfg').at(-1).hand, 'right');
});

/* ---------- deriva del giroscopio ---------- */
test('deriva: dal passo «fermo» solo se plausibile; il movimento della mano non diventa deriva', () => {
  const still = mean => { const det = createSwingDetector(); det.still(); for (let t = 0; t <= 700; t += 16) det.feed({ t, rot: mean.map(v => v + Math.sin(t)*.3), acc: [0, 0, 0], accG: [0, 9.8, 0] }); return det.profile.bias; };
  const small = still([.4, -.3, .2]);
  assert.ok(Math.abs(small[0] - .4) < .2 && Math.abs(small[1] + .3) < .2, String(small));
  // come nella sessione del 22/10: [3,4; 6,8; 4,4] °/s col telefono in mano
  assert.deepEqual(still([3.4, 6.8, 4.4]), [0, 0, 0]);
  // anche dai profili salvati prima
  const det = createSwingDetector(); det.setProfile({ bias: [3.4, 6.8, 4.4], axis: null });
  assert.deepEqual(det.profile.bias, [0, 0, 0]);
});

/* ---------- verso senza calibrazione ---------- */
test('verso senza calibrazione: dalla gravità, per destri e mancini; sensori con il segno opposto si correggono', () => {
  for (const hand of ['right', 'left']){
    const sim = racketSim({ hand, seed: 11 }); sim.start();
    for (const side of ['forehand', 'backhand']){
      const n0 = sim.swings.length; const truth = sim.stroke({ side });
      const strokes = sim.swings.slice(n0).filter(s => s.peak > 500);
      assert.equal(strokes.length, 1, `${hand} ${side}`);
      assert.equal(strokes[0].dir, truth.dir, `${hand} ${side}`);
      assert.equal(truth.dir, strokeDir(hand, side));
    }
  }
  // segno invertito (alcuni browser): il rilevatore lo scopre dai colpi con il verso atteso noto
  const det = createSwingDetector(), got = [];
  det.on('swing', s => got.push(s));
  let t = 0;
  for (; t < 700; t += 10) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, -9.8, 0] });   // gravità al contrario
  det.setProfile({ ...det.profile, axis: null, ref: 420, on: 70, minPeak: 120, minAngle: 6 }); det.run(); det.setPrepMode(true);
  for (let i = 0; i < 6; i++){
    det.setExpect(1);                                       // la palla arriva dal lato del colpo da destra a sinistra
    for (let j = 0; j <= 22; j++, t += 10) det.feed({ t, rot: [0, 0, 650*Math.sin(Math.PI*j/22)**2], acc: [0, 0, 0], accG: [0, -9.8, 0] });
    for (let j = 0; j < 90; j++, t += 10) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, -9.8, 0] });
  }
  assert.equal(det.absSign, -1);
  assert.equal(got.at(-1).dir, 1);
});

/* ---------- preparazione e colpo ---------- */
test('preparazione lenta e poi colpo: il colpo vero è riconosciuto (prima era scartato come «rientro»)', () => {
  for (const hand of ['right', 'left']){
    const sim = racketSim({ hand, seed: 4 }); sim.start();
    for (const side of ['forehand', 'backhand']){
      const n0 = sim.swings.length; const truth = sim.stroke({ side, peak: 850 });
      const got = sim.swings.slice(n0);
      const strong = got.filter(s => s.dir === truth.dir && s.peak > 600);
      assert.equal(strong.length, 1, `${hand} ${side}: ${got.map(s => `${s.dir}/${s.peak}`)}`);
      // l'eventuale preparazione riconosciuta è più debole e nel verso opposto
      for (const s of got) if (s !== strong[0]) assert.ok(s.peak < strong[0].peak*.5 && s.dir !== truth.dir, `${s.dir}/${s.peak}`);
    }
  }
});

/* ---------- forma del colpo ---------- */
// i colpi veri (non le preparazioni) di una prova
const strokeOf = (sim, opts) => { const n0 = sim.swings.length; const truth = sim.stroke(opts); const s = sim.swings.slice(n0).filter(x => x.peak > (opts.peak || 900)*.6).pop(); return { truth, s, msg: sim.last() }; };

test('forma: specchio destro/mancino — stesso gesto, stessa forma, piano e verso opposti', () => {
  const R = racketSim({ hand: 'right', seed: 2 }), L = racketSim({ hand: 'left', seed: 2 });
  R.start(); L.start();
  for (const o of [{ side: 'forehand' }, { side: 'backhand', rise: 25 }, { side: 'forehand', rise: -30, peak: 650 }]){
    const r = strokeOf(R, o), l = strokeOf(L, o);
    assert.equal(r.s.dir, -l.s.dir);
    assert.ok(Math.abs(r.s.shape.plane + l.s.shape.plane) < .05, `${r.s.shape.plane} ${l.s.shape.plane}`);
    for (const k of ['rise', 'tilt']) assert.ok(Math.abs(r.s.shape[k] - l.s.shape[k]) < .05, `${k} ${r.s.shape[k]} ${l.s.shape[k]}`);
  }
});

test('forma: inclinazioni e rotazioni del telefono in mano non cambiano il gesto', () => {
  const sim = racketSim({ hand: 'right', seed: 8 }); sim.start();
  const base = strokeOf(sim, { side: 'forehand', rise: 20 }).s.shape;
  for (const grip of [{ turn: 90 }, { turn: 180 }, { turn: -60 }, { elev: 45 }, { elev: 70, turn: 30 }]){
    const { s, truth } = strokeOf(sim, { side: 'forehand', rise: 20, ...grip });
    assert.equal(s.dir, 1, JSON.stringify(grip));
    assert.ok(Math.abs(s.shape.plane - truth.plane) < .06 && Math.abs(s.shape.rise - truth.rise) < .08, `${JSON.stringify(grip)} ${JSON.stringify(s.shape)} ${JSON.stringify(truth)}`);
    if (!grip.elev) assert.ok(Math.abs(s.shape.rise - base.rise) < .08 && Math.abs(s.shape.plane - base.plane) < .06, JSON.stringify(grip));
  }
});

test('forma: swing orizzontale, obliquo e verticale; testa che sale o scende', () => {
  for (const hand of ['right', 'left']){
    const sim = racketSim({ hand, seed: 6 }); sim.start();
    const flat = strokeOf(sim, { side: 'forehand' }).s.shape;
    const up = strokeOf(sim, { side: 'forehand', rise: 35 }).s.shape;
    const down = strokeOf(sim, { side: 'backhand', rise: -35, peak: 700 }).s.shape;
    const vertical = strokeOf(sim, { side: 'forehand', rise: 70, peak: 650 }).s.shape;
    const overhead = strokeOf(sim, { overhead: true, peak: 1100 });
    assert.ok(Math.abs(flat.plane) > .9 && Math.abs(flat.rise) < .1, JSON.stringify(flat));
    assert.ok(up.rise > .4 && Math.abs(up.plane) > .7, JSON.stringify(up));
    assert.ok(down.rise < -.4 && Math.abs(down.plane) > .7, JSON.stringify(down));
    assert.ok(Math.abs(vertical.plane) < .45 && vertical.rise > .8, JSON.stringify(vertical));
    assert.ok(Math.abs(overhead.s.shape.plane) < .1 && overhead.s.shape.tilt > .8 && overhead.s.dir === 0, JSON.stringify(overhead.s.shape));
    // il messaggio porta la forma al computer
    assert.ok(overhead.msg.shape && Math.abs(overhead.msg.shape.tilt - overhead.s.shape.tilt) < 1e-6);
  }
});

test('forma: il messaggio vecchio (senza forma) si legge come prima', () => {
  const s = parseSwingMessage({ t: 'sw', p: .6, l: .1, dir: 1, pk: 100 }, { at: 1, now: 1000 });
  assert.equal(s.shape, undefined);
  assert.equal(s.dir, 1);
});
