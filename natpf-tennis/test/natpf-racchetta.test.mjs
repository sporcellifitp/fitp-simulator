// Telefono come racchetta virtuale (docs/NATPF_RACCHETTA_VIRTUALE.md): mano unica, verso del gesto senza calibrazione,
// forma del colpo misurata dai sensori, preparazione distinta dal colpo, tremolio senza swing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { parseSwingMessage } from '@natpf/tennis/swing-message.js';
import { QUICK_PLAN } from '@natpf/tennis/calibration.js';
import { NatpfPhoneRacket, natpfSwingToEngine, riseRefOf, createRiseModel, habitualRise } from '../src/natpf/natpf_phone_racket.js';
import { classifyStroke } from '../src/natpf/natpf_stroke_intent.js';
import { racketSim, strokeDir } from './racket-sim.mjs';
import { strokeIntent } from '../src/natpf/natpf_stroke_intent.js';
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

test('diagnostica: il colpo del telefono arriva al motore con il suo numero (gesto ed esito si legano nel registro)', () => {
  const got = [], phone = new NatpfPhoneRacket({ playerRole: 'p1', phase: 'RALLY', motionController: { _emitSwing: e => got.push(e) },
    ball: { inPlay: true, lastHitter: 'opponent', pos: { x: .6, y: 1, z: 6 }, vel: { x: 0, y: 0, z: 12 } }, player: { pos: { x: 0, z: 11.4 } }, opponent: { pos: { x: 0, z: -11.4 } } });
  phone.link = { ready: true, connected: true, send(){}, cmd(){} };
  const sim = racketSim({ hand: 'right', seed: 2 }); sim.start(); sim.stroke({ side: 'forehand' });
  const s = { ...sim.last(), at: performance.now()/1000 };
  phone._onSwing(s);
  assert.equal(got.length, 1);
  assert.equal(got[0].natpf.seq, s.seq); assert.ok(Number.isInteger(s.seq));
  assert.ok(got[0].natpf.intent, 'intenzione dalla forma');
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

test('tremolio: il telefono tenuto fermo con la mano che trema non fa swing; dopo, il colpo vero si riconosce', () => {
  // tremolio reale: pochi °/s, al massimo qualche decina; qui fino a 160 °/s da 5 a 12 Hz (oltre: 240 °/s a 3–6 Hz è
  // già un gesto voluto, ampio una decina di gradi)
  for (const hand of ['right', 'left']) for (const f of [5, 9, 12]) for (const amp of [40, 90, 160]){
    const sim = racketSim({ hand, seed: f + amp });
    sim.start(); sim.shake(3000, { amp, f });
    assert.equal(sim.swings.length, 0, `${hand} ${amp} °/s a ${f} Hz: ${sim.swings.map(s => s.peak).join()}`);
  }
  for (const hand of ['right', 'left']) for (const side of ['forehand', 'backhand']){
    const sim = racketSim({ hand, seed: 5 });
    sim.start(); sim.shake(3000, { amp: 90, f: 9 });
    const truth = sim.stroke({ side, peak: 900 });
    // il telefono manda anche la preparazione (debole): il computer la sostituisce con il colpo (natpf_impact.js)
    const top = [...sim.swings].sort((a, b) => b.peak - a.peak)[0];
    assert.ok(top && top.peak > 700 && top.dir === truth.dir, `${hand} ${side}: ${sim.swings.map(s => `${s.dir}/${s.peak}`).join()}`);
  }
});

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

test('forma: swing corto e ampio (prova 3) — un colpo per gesto, verso giusto; lo swing corto è un poco più corto, non molto più debole', () => {
  for (const hand of ['right', 'left']){
    const sim = racketSim({ hand, seed: 7 }); sim.start();
    for (const side of ['forehand', 'backhand']){
      const reach = [];
      for (const amp of [40, 70, 110, 150]){
        const n0 = sim.swings.length, truth = sim.stroke({ side, amp, peak: 900 }), got = sim.swings.slice(n0).filter(s => s.peak > 540), tag = `${hand} ${side} ${amp}°`;
        assert.equal(got.length, 1, tag); assert.equal(got[0].dir, truth.dir, tag);
        const it = natpfSwingToEngine(sim.last(), { hand }).natpf.intent;
        assert.equal(it.shot, 'topspin', tag);
        reach.push([it.reach, it.depth]);
      }
      // portata e profondità voluta crescono con l'ampiezza (alla stessa velocità di picco), ma lo swing corto tiene
      // gran parte della profondità: la forza viene dal picco vero (prima 40° davano meno della metà di 150°)
      // (la profondità dipende soprattutto dalla forza: tra due ampiezze vicine conta la piccola differenza di velocità)
      for (let i = 1; i < reach.length; i++) assert.ok(reach[i][0] > reach[i - 1][0] && reach[i][1] > reach[i - 1][1] - .02, `${hand} ${side}: ${JSON.stringify(reach)}`);
      assert.ok(reach[3][1] > reach[0][1] && reach[0][1] >= .6*reach[3][1], `${hand} ${side}: ${JSON.stringify(reach)}`);
    }
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

test('colpi vari dal gesto: orizzontale, obliquo, verticale, in discesa, morbido e corto; stesso gesto, stesso colpo', () => {
  // dal telefono simulato al computer: messaggio letto (forma, picco, ampiezza) → intenzione (natpf_stroke_intent.js)
  const cases = [
    ['orizzontale forte', { side: 'forehand', peak: 1250 }, 'flat'],
    ['orizzontale', { side: 'forehand', peak: 800 }, 'topspin'],
    ['obliquo in salita (dritto arrotato)', { side: 'forehand', rise: 35, peak: 900 }, 'topspin'],
    ['verticale in salita', { side: 'forehand', rise: 70, peak: 650 }, 'lob'],
    ['obliquo in salita lento', { side: 'forehand', rise: 50, peak: 500 }, 'lob'],
    ['obliquo in discesa', { side: 'backhand', rise: -35, peak: 800 }, 'slice'],
    ['in discesa morbido', { side: 'backhand', rise: -35, peak: 380 }, 'drop'],
    ['in discesa corto', { side: 'forehand', rise: -35, peak: 700, amp: 40 }, 'drop'],
  ];
  for (const hand of ['right', 'left']){
    const sim = racketSim({ hand, seed: 6 }); sim.start();
    for (const [name, o, want] of cases){
      const [a, b] = [0, 1].map(() => { const { msg } = strokeOf(sim, o); return strokeIntent(msg); });
      assert.equal(a.shot, want, `${hand} ${name}: ${JSON.stringify(a)}`);
      // lo stesso gesto ripetuto (il telefono simulato non riparte da zero: differenze di millesimi) dà lo stesso colpo
      assert.equal(b.shot, a.shot, `${hand} ${name}: lo stesso gesto due volte`);
      for (const k of ['power', 'depth', 'rise', 'plane']) assert.ok(Math.abs(a[k] - b[k]) < .02, `${hand} ${name} ${k}: ${a[k]} ${b[k]}`);
    }
  }
});

test('swing corto e ampio: alla stessa velocità lo swing corto vuole un poco meno profondità (un colpo bloccato è più corto)', () => {
  const sim = racketSim({ hand: 'right', seed: 4 }); sim.start();
  const short = strokeIntent(strokeOf(sim, { side: 'forehand', peak: 900, amp: 40 }).msg);
  const wide = strokeIntent(strokeOf(sim, { side: 'forehand', peak: 900, amp: 140 }).msg);
  assert.ok(short.reach < .3 && wide.reach > .9, `${short.reach} ${wide.reach}`);
  assert.ok(short.depth < wide.depth - .1, `${short.depth} ${wide.depth}`);
  // a parità di forza misurata la differenza è solo l'ampiezza: profondità = forza × (0,8 + 0,2 × ampiezza); era 0,55 +
  // 0,45 × ampiezza, e un colpo compatto ma veloce perdeva quasi metà della profondità
  const same = p => strokeIntent({ shape: { rise: 0, plane: 1, tilt: .2 }, peak: 900, angle: p });
  assert.ok(Math.abs(same(30).depth/same(100).depth - .8) < .01);
});

test('swing corti (difetto 5): la forza viene dalla velocità vera al picco, non dalla media mobile', () => {
  // alla stessa velocità vera uno swing compatto e uno ampio hanno la stessa forza; con il massimo della media mobile
  // (com'era) lo swing compatto perdeva forza oltre alla portata
  for (const peak of [700, 1100]){
    const sim = racketSim({ hand: 'right', seed: 4 }); sim.start();
    const read = amp => { const { msg } = strokeOf(sim, { side: 'forehand', peak, amp }); return { msg, it: strokeIntent(msg), old: strokeIntent({ ...msg, rawPeak: undefined }) }; };
    // ampiezze che il telefono simulato riproduce alla velocità chiesta (sotto i 90° a 1100 °/s il gesto dura meno di sei
    // campioni e il simulatore lo rallenta)
    const short = read(90), wide = read(150);
    assert.ok(Number.isFinite(short.msg.rawPeak) && short.msg.rawPeak > short.msg.peak, JSON.stringify(short.msg));
    assert.ok(Math.abs(short.it.power - wide.it.power) <= .05, `${peak} °/s: corto ${short.it.power}, ampio ${wide.it.power}`);
    assert.ok(wide.it.power - short.it.power < wide.old.power - short.old.power, `${peak} °/s: prima ${short.old.power}/${wide.old.power}, ora ${short.it.power}/${wide.it.power}`);
  }
  // il colpo tipico della calibrazione si misura allo stesso modo (rawRef): forza relativa coerente
  assert.equal(strokeIntent({ shape: { rise: 0, plane: 1, tilt: .2 }, peak: 800, rawPeak: 1000, angle: 100 }, { ref: 800, rawRef: 1000 }).power,
    strokeIntent({ shape: { rise: 0, plane: 1, tilt: .2 }, peak: 1000, angle: 100 }, { ref: 1000 }).power);
});

test('forma: il messaggio vecchio (senza forma) si legge come prima', () => {
  const s = parseSwingMessage({ t: 'sw', p: .6, l: .1, dir: 1, pk: 100 }, { at: 1, now: 1000 });
  assert.equal(s.shape, undefined);
  assert.equal(s.dir, 1);
});

test('salita abituale (calibrazione): il colpo normale si legge rispetto a questa; i colpi speciali diventano solo più difficili', () => {
  const sh = rise => ({ plane: .9, rise, roll: 0, tilt: .6 });
  // telefono in verticale con il polso che prona: la testa della racchetta virtuale scende anche nel colpo normale
  assert.equal(classifyStroke(sh(-.4), { power: .6 }).shot, 'slice');
  assert.equal(classifyStroke(sh(-.4), { power: .6, riseRef: -.35 }).shot, 'topspin');
  // il tagliato vero resta: la testa scende rispetto al proprio colpo di quanto serve senza calibrazione
  const cut = classifyStroke(sh(-.62), { power: .6, riseRef: -.35 });
  assert.equal(cut.shot, 'slice'); assert.match(cut.why.join(), /abituale -0\.35/);
  // un riferimento positivo non rende più facile il tagliato; il pallonetto chiede di più
  assert.equal(classifyStroke(sh(-.2), { power: .6, riseRef: .3 }).shot, 'topspin');
  assert.equal(classifyStroke({ plane: .3, rise: .7, tilt: .5 }, { power: .5, riseRef: .3 }).shot, 'topspin');
  assert.equal(classifyStroke({ plane: .3, rise: .9, tilt: .5 }, { power: .5, riseRef: .3 }).shot, 'lob');
  // riferimento fuori misura: se ne tiene al massimo −0,6
  assert.equal(classifyStroke(sh(-.85), { power: .6, riseRef: -2 }).shot, 'slice');
  // il riferimento arriva solo dalla calibrazione vera e solo per i versi del dritto e del rovescio
  assert.equal(riseRefOf({ rises: { 1: -.3, '-1': -.2 } }, -1), -.2);
  assert.equal(riseRefOf({ simple: true, rises: { 1: -.3 } }, 1), null);
  assert.equal(riseRefOf({ rises: { 1: -.3 } }, 0), null);
});

test('presa del 19/10 (telefono in verticale nel pugno, polso che prona) con la forma: calibrata con il proprio gesto, dritti e rovesci restano normali; il pallonetto vero resta un pallonetto', () => {
  // la pagina del telefono di oggi manda la forma del colpo: prima, con la presa del video del 19/10, i dritti e i
  // rovesci con la pronazione diventavano tagliati (la testa della racchetta virtuale scende quando il manico in
  // verticale si inclina di lato). La calibrazione fatta con la stessa presa e lo stesso gesto dà la salita abituale
  const grip = (p, tilt) => { p.pose([0, 1, 0], 30); p.pose([1, 0, 0], -tilt); p.rest(500, 4); };
  const series = (tilt, gesture, { n = 3, yaw = true } = {}) => {
    const p = simPhone({ seed: 7, shape: true });
    if (yaw) grip(p, tilt); else { p.pose([1, 0, 0], -tilt); p.rest(500, 4); }
    p.calibrate({ wrist: 500 });
    for (let i = 0; i < n; i++){ gesture(p); p.rest(700, 6); }
    return { rises: p.det.profile.rises, r: p.msgs.map(d => p.game(d)) };
  };
  for (const tilt of [0, 35, 60]){
    for (const [axis, side, wrists] of [[[0, 1, 0], 'forehand', [0, 450, -450, 800]], [[0, -1, 0], 'backhand', [0, 450, -450]]]) for (const wrist of wrists){
      const { rises, r } = series(tilt, p => p.swing({ axis, peak: 750, wrist, wristAxis: [0, 0, -1], tremor: 8 }));
      const tag = `inclinazione ${tilt}°, ${side}, polso ${wrist}°/s, abituale ${JSON.stringify(rises)}`;
      assert.equal(r.length, 3, tag);
      assert.ok(r.every(x => x.ev.side === side && (x.ev.natpf.shot === 'topspin' || x.ev.natpf.shot === 'flat')), `${tag}: ${r.map(x => `${x.ev.side} ${x.ev.natpf.shot} ${x.ev.natpf.why}`).join(' | ')}`);
    }
  }
  // la calibrazione con la pronazione dà una salita abituale negativa in tutti e due i versi
  const { rises } = series(0, () => {}, { n: 0 });
  assert.ok(rises[1] < -.2 && rises[-1] < -.2, JSON.stringify(rises));
  // pallonetto: telefono inclinato in avanti, il braccio sale e la testa passa da avanti a sopra
  for (const axis of [[1, 0, 0], [1, .5, 0]]){
    const { r } = series(35, p => p.swing({ axis, peak: 650, vy: 9, push: 2, tremor: 6 }), { yaw: false });
    assert.deepEqual(r.map(x => x.ev.natpf.shot), ['lob', 'lob', 'lob'], `asse ${axis}`);
  }
  // la mano che sale con il telefono che si inclina in avanti (la testa scende): non diventa un tagliato
  const { r } = series(35, p => p.swing({ axis: [-1, 0, 0], peak: 650, vy: 9, push: 2, tremor: 6 }), { yaw: false });
  assert.ok(r.every(x => x.ev.natpf.shot !== 'slice' && x.ev.natpf.shot !== 'drop'), r.map(x => x.ev.natpf.shot).join(' '));
});

test('presa del 19/10 senza calibrazione («Salta»): la salita abituale si impara dai primi colpi, poi dritti e rovesci sono normali', () => {
  // prima, saltata la calibrazione, la pronazione faceva tagliati per tutta la partita (nessun riferimento personale;
  // la prova del telefono di 84ca878, calibrato senza pronazione, ne è il caso: 7/10). Ora i primi tre colpi in un verso
  // si leggono con le soglie assolute, dal quarto con la mediana di quelli (createRiseModel)
  const grip = (p, tilt) => { p.pose([0, 1, 0], 30); p.pose([1, 0, 0], -tilt); p.rest(500, 4); };
  for (const tilt of [0, 35, 60]) for (const wrist of [450, -450, 800]) for (const [axis, side] of [[[0, 1, 0], 'forehand'], [[0, -1, 0], 'backhand']]){
    const p = simPhone({ seed: 7, shape: true }); grip(p, tilt);
    assert.equal(p.skip({ tremor: 4 })?.simple, true);
    for (let i = 0; i < 7; i++){ p.swing({ axis, peak: 750, wrist, wristAxis: [0, 0, -1], tremor: 8 }); p.rest(700, 6); }
    const r = p.msgs.map(d => p.game(d)), tag = `inclinazione ${tilt}°, ${side}, polso ${wrist}°/s: ${r.map(x => `${x.ev.natpf.shot}(${x.s.shape?.rise})`).join(' ')}`;
    assert.equal(r.length, 7, tag);
    assert.ok(r.every(x => x.ev.side === side), tag);
    assert.ok(r.slice(3).every(x => ['topspin', 'flat'].includes(x.ev.natpf.shot) && Number.isFinite(x.ev.natpf.intent.riseRef)), tag);
  }
  // il modello: per verso, pallonetti e schiacciate esclusi, da tre colpi; la calibrazione vera ha la precedenza
  const m = createRiseModel();
  m.add(1, -.3, 'topspin'); m.add(1, -.32, 'slice'); assert.equal(m.ref(1), null);
  m.add(1, .8, 'lob'); m.add(1, -.28, 'topspin'); assert.equal(m.ref(1), -.3); assert.equal(m.ref(-1), null);
  assert.equal(habitualRise({ simple: true }, 1, m), -.3);
  assert.equal(habitualRise({ rises: { 1: -.1 } }, 1, m), -.1);
  m.reset(); assert.equal(habitualRise({ simple: true }, 1, m), null);
  // imparata la salita della presa, il tagliato vero (la testa scende di molto di più) resta un tagliato
  assert.equal(classifyStroke({ plane: .9, rise: -.62, roll: 0, tilt: .6 }, { power: .6, riseRef: -.3 }).shot, 'slice');
});
