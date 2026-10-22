// Telefono come racchetta virtuale (docs/NATPF_RACCHETTA_VIRTUALE.md): mano unica, verso del gesto senza calibrazione,
// forma del colpo misurata dai sensori, preparazione distinta dal colpo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { parseSwingMessage } from '@natpf/tennis/swing-message.js';
import { QUICK_PLAN } from '@natpf/tennis/calibration.js';
import { NatpfPhoneRacket, natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';
import { racketSim, strokeDir } from './racket-sim.mjs';
import { simPhone } from './phone-sim.mjs';

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

/* ---------- calibrazione tollerante ---------- */
// chi gioca segue i passi: resta fermo (con il tremolio della mano) finché il passo cambia, fa il gesto chiesto quando
// il telefono è pronto. Restituisce la durata del passo «fermo» e di tutta la calibrazione (ms)
function followCalibration({ hand, seed, tremor, limit = 15000 }){
  const sim = simPhone({ hand, seed }), ev = [];
  sim.cal.on(e => ev.push(e));
  const t0 = sim.t;
  sim.cal.start({ quick: true, hand });
  while (sim.cal.state.step === 'still' && sim.t - t0 < limit) sim.rest(50, tremor);
  const still = sim.t - t0;
  while (sim.cal.state.step === 'swings' && sim.t - t0 < limit){
    while (!sim.cal.state.ready && sim.t - t0 < limit) sim.rest(50, tremor);
    sim.swing({ axis: [0, QUICK_PLAN[sim.cal.state.idx] === 'L' ? 1 : -1, 0], tremor });
    sim.rest(450, tremor);
  }
  return { still, total: sim.t - t0, result: sim.cal.state.result, attempts: ev.filter(e => e.kind === 'attempt'), moves: ev.filter(e => e.kind === 'warn' && e.why === 'move').length };
}

test('tremolio: con il tremolio naturale della mano (15–25 °/s) la calibrazione finisce entro 10 s, senza tentativi persi', () => {
  // prima un solo campione oltre 35 °/s faceva ripartire il passo «fermo» (fino a 3,7 s con 25 °/s) e i gesti erano
  // quattro: più di 8 s anche con gesti perfetti, oltre 10 s in 2 prove su 12 con 25 °/s
  for (const hand of ['right', 'left']) for (const tremor of [15, 20, 25]) for (const seed of [1, 4, 11]){
    const tag = `${hand}, tremolio ${tremor} °/s, seme ${seed}`, r = followCalibration({ hand, seed, tremor });
    assert.equal(r.result?.pass, true, tag);
    assert.ok(r.still < 1000, `${tag}: passo «fermo» in ${Math.round(r.still)} ms`);
    assert.ok(r.total <= 10000, `${tag}: calibrazione in ${Math.round(r.total)} ms`);
    assert.equal(r.moves, 0, `${tag}: avvisi «movimento»`);
    assert.deepEqual(r.attempts.map(a => a.ok), QUICK_PLAN.map(() => true), tag);
  }
});

test('passo «fermo»: il telefono che si muove davvero non passa; gli avvisi sono al massimo uno ogni mezzo secondo', () => {
  const sim = simPhone({ seed: 2 }), ev = [];
  sim.cal.on(e => ev.push(e));
  sim.cal.start({ quick: true });
  // la mano che porta il telefono in posizione: rotazione lenta e continua (45 °/s), poi avanti e indietro (120 °/s)
  sim.pose([0, 1, 0], 135, 45); sim.pose([1, 0, 0], 60, 120); sim.pose([1, 0, 0], -60, 120);
  assert.equal(sim.cal.state.step, 'still');
  const warns = ev.filter(e => e.kind === 'warn' && e.why === 'move').length, secs = sim.t/1000;
  assert.ok(warns >= 1 && warns <= Math.ceil(secs*2) + 1, `${warns} avvisi in ${secs.toFixed(1)} s`);
  // fermo: passa
  sim.rest(800, 10);
  assert.notEqual(sim.cal.state.step, 'still');
});

/* ---------- «Salta» con il gioco completo ---------- */
test('«Salta» anche durante il passo «fermo»: si gioca subito con verso, tipo di colpo e forza dal gesto', () => {
  // prima il rilevatore restava ad aspettare il telefono fermo (nessun colpo partiva) e il filtro d'orientamento non
  // aveva la posa di riposo (niente forma del colpo, quindi niente intenzione)
  const CASES = [
    { o: { side: 'forehand' }, shot: 'topspin' }, { o: { side: 'backhand' }, shot: 'topspin' },
    { o: { side: 'forehand', peak: 1300 }, shot: 'flat' }, { o: { side: 'forehand', peak: 500 }, shot: 'topspin' },
    { o: { side: 'forehand', rise: 70, peak: 650 }, shot: 'lob' }, { o: { side: 'backhand', rise: -35, peak: 700 }, shot: 'slice' },
    { o: { side: 'backhand', rise: -35, peak: 480 }, shot: 'drop' }, { o: { overhead: true, peak: 1100 }, shot: 'smash', high: true },
  ];
  for (const hand of ['right', 'left']) for (const skip of [0, 250]){
    const tag = `${hand}, «Salta» dopo ${skip} ms`;
    const sim = racketSim({ hand, seed: 5 }), profile = sim.start({ skip, tremor: 25 });
    assert.equal(profile?.simple, true, tag);
    assert.equal(sim.det.mode, 'run', tag); assert.ok(sim.face.ready, `${tag}: filtro d'orientamento senza posa di riposo`);
    const power = {};
    for (const { o, shot, high } of CASES){
      const n0 = sim.swings.length, truth = sim.stroke({ ...o, tremor: 25 });
      const s = sim.swings.slice(n0).filter(x => x.peak > (o.peak || 900)*.6).pop(), what = `${tag}, ${JSON.stringify(o)}`;
      assert.ok(s, `${what}: nessun colpo`);
      const ev = natpfSwingToEngine(sim.last(), { hand, ref: null, ballHigh: !!high });
      assert.ok(ev.natpf.intent, `${what}: nessuna intenzione`);
      assert.equal(ev.natpf.intent.shot, shot, what);
      if (!o.overhead){ assert.equal(s.dir, truth.dir, what); assert.equal(ev.side, o.side, what); }
      if (o.side === 'forehand' && !o.rise) power[o.peak || 900] = ev.natpf.intent.power;
    }
    assert.ok(power[500] < power[900] && power[900] < power[1300], `${tag}: forza ${JSON.stringify(power)}`);
  }
});

/* ---------- prove obbligatorie 10 e 11, parte del telefono (la webcam è in natpf-webcam-classifier.test.mjs) ---------- */
test('tremolio in partita (prova 11, telefono): 10 s di attesa con la mano che trema non fanno colpi; il colpo dopo sì, col verso giusto', () => {
  for (const tremor of [15, 25]) for (const skip of [null, 200]){
    const tag = `tremolio ${tremor} °/s, «Salta» ${skip == null ? 'dopo il passo «fermo»' : 'durante il passo «fermo»'}`;
    const sim = racketSim({ hand: 'right', seed: 3 }); sim.start({ tremor, ...(skip == null ? {} : { skip }) });
    const n0 = sim.swings.length; sim.rest(10000, tremor);
    assert.equal(sim.swings.length, n0, `${tag}: ${sim.swings.slice(n0).map(s => s.peak)}`);
    const truth = sim.stroke({ side: 'backhand', tremor }), got = sim.swings.slice(n0).filter(s => s.peak > 500);
    assert.equal(got.length, 1, tag); assert.equal(got[0].dir, truth.dir, tag);
  }
});

test('perdita del tracciamento (prova 10, telefono): pause nei campioni dei sensori non fanno colpi fantasma; il colpo dopo arriva intero', () => {
  // pagina in secondo piano o telefono che rallenta: oltre 140 ms senza campioni il rilevatore riparte (DEFAULTS.gap).
  // Il collegamento che cade e torna è nelle prove nel browser (natpf-phone-blackout.mjs)
  for (const hand of ['right', 'left']){
    const sim = racketSim({ hand, seed: 9 }); sim.start();
    for (const [ms, side] of [[200, 'backhand'], [600, 'forehand'], [2000, 'backhand']]){
      const n0 = sim.swings.length; sim.gap(ms); sim.rest(300);
      assert.equal(sim.swings.length, n0, `${hand}, pausa di ${ms} ms`);
      const truth = sim.stroke({ side }), got = sim.swings.slice(n0).filter(s => s.peak > 500);
      assert.equal(got.length, 1, `${hand}, pausa di ${ms} ms`); assert.equal(got[0].dir, truth.dir);
      assert.ok(got[0].shape && natpfSwingToEngine(sim.last(), { hand }).natpf.intent, `${hand}, pausa di ${ms} ms: forma e intenzione`);
    }
  }
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
