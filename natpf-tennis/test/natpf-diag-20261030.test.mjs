// Diagnostiche dell'utente 20261030-142317 e 20261030-142438 (1v1, build .17, host con il telefono Android): sequenze
// reali ricostruite dagli eventi (tel.colpo, racchetta, vuoto) nel motore vero senza grafica.
//   C1  gesto preliminare morbido giocato al posto del colpo vero (142317: n. 81/82, 91/92, 86/87)
//   C5  schiacciata trattenuta sul telefono come preparazione (142438 n. 124)
//   C6  oltre la finestra tempo e piatto sommati senza limite: palla fuori di 4 m (142317 n. 76)
//   C12 risposta al servizio: tagliato diventato schiacciata (142438 n. 143)
//   C15 servizio battuto da un gesto intermedio prima della battuta vera (142438 n. 101/102)
// Le diagnostiche sono dati dell'utente: qui ci sono solo i valori che servono (picco, ampiezza, latenza, tempo, forma).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';

const DT = 1/120;
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(17);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
function cpuShot(e, { from, to, flight, topspin = 14, player, rally = 3 }){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
  e.player.pos.set(player[0], 0, player[1]); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  e.pendingUserSwing = null;
  e.ball.pos.set(...from);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0], 0, to[1]), flight, { topspin });
  e._natpfPlanPlayer();
  return e.natpfPlan;
}
// colpo del telefono come lo manda natpf_phone_racket (intenzione della forma, picco, colpo tipico, latenza dal picco)
function phoneSwing({ seq, shot, side, peak, power, conf = .7, angle = 60, typical = 1263, latency = .04, rise = 0 }){
  return { source: 'natpf-phone', side, shotType: ENGINE_SHOT[shot], speed: .8 + power*.85, dirX: 0,
    natpf: { aim: 'swing', shot, seq, intent: { shot, conf, power, depth: power, rise, face: 0 }, power, peak, typical, angle, latency, hand: 'right' } };
}
// at: secondi al punto d'impatto (timeToContact) quando il colpo arriva al computer, anche negativi (dopo l'arrivo della
// palla); il tempo del colpo (lead) è at + latenza
function play(e, swings, maxT = 4){
  const queue = [...swings].sort((a, b) => b.at - a.at), whiffs = [], results = [];
  const whiff = e._natpfEarlyWhiff.bind(e);
  e._natpfEarlyWhiff = ps => { whiffs.push(ps.evt?.natpf?.seq ?? null); return whiff(ps); };
  for (let t = 0; t < maxT; t += DT){
    const ttc = NI.timeToContact(e, e.player);
    while (queue.length && ttc != null && ttc <= queue[0].at){ const s = queue.shift().swing; e._handleUserSwingInput(s); results.push(s.natpf.seq); }
    e.step(DT);
    if (e.phase !== 'RALLY' || e.ball.lastHitter === 'player') break;
  }
  return { hit: e.ball.lastHitter === 'player', racket: e.natpfLastRacket, whiffs, sent: results };
}

// 142317 n. 81/82: palla corta di dritto (369 °/s, confidenza 1, 46°, tempo 233 ms, latenza 36,5 ms) e, 240 ms dopo il
// suo picco, il colpo vero dall'altra parte (1335 °/s, 122°, latenza 32,3 ms) arrivato al computer 16 ms dopo il colpo
// giocato: scartato come «palla che si allontana». Colpo tipico 1263 °/s (mediana dei colpi dello scambio prima)
const S81 = { ball: { from: [-4.04, 1.55, -12.62], to: [1.54, 9.18], flight: .85, topspin: 14, player: [1.4, 11.7] },
  first: { at: .233 - .0365, swing: phoneSwing({ seq: 81, shot: 'drop', side: 'forehand', peak: 369, power: .145, conf: 1, angle: 46, latency: .0365, rise: -.54 }) },
  real: { at: -.016, swing: phoneSwing({ seq: 82, shot: 'slice', side: 'backhand', peak: 1335, power: .8, angle: 122, latency: .0323, rise: -.26 }) } };
// n. 91/92: top spin di rovescio morbido (478 °/s, forza 0,22, tempo 80 ms, latenza 48,4 ms), poi il dritto vero (1394 °/s,
// 82 ms dopo, latenza 26,5 ms) arrivato 32 ms dopo il colpo giocato
const S91 = { ball: { from: [-3.06, 1.55, -13.55], to: [1.48, 9.55], flight: .57, topspin: 12, player: [1.7, 13.6] },
  first: { at: .080 - .0484, swing: phoneSwing({ seq: 91, shot: 'topspin', side: 'backhand', peak: 478, power: .22, angle: 41, latency: .0484, rise: .09 }) },
  real: { at: -.032, swing: phoneSwing({ seq: 92, shot: 'topspin', side: 'forehand', peak: 1394, power: .85, angle: 89, latency: .0265 }) } };
// n. 86/87: palla corta di dritto (290 °/s, confidenza 0,17, 57°) 875 ms prima, poi la schiacciata vera (1380 °/s,
// tempo +41 ms, latenza 42,6 ms) arrivata 13 ms dopo il «VERY EARLY • WHIFF»
const S86 = { ball: { from: [4.3, 1.5, -12.88], to: [1.3, 9.6], flight: 1.95, topspin: 5, player: [.8, 8] },
  first: { at: .875 - .0479, swing: phoneSwing({ seq: 86, shot: 'drop', side: 'forehand', peak: 290, power: .094, conf: .17, angle: 57, latency: .0479, rise: -.27 }) },
  real: { at: -.013, swing: phoneSwing({ seq: 87, shot: 'smash', side: 'backhand', peak: 1380, power: .86, conf: 1, angle: 181, latency: .0426, rise: .37 }) } };

for (const [name, S] of [['81/82', S81], ['91/92', S91], ['86/87', S86]]){
  test(`C1 142317 n. ${name}: il colpo vero arrivato dopo il gesto morbido è quello giocato`, () => {
    withEngine('1v1', e => {
      cpuShot(e, S.ball);
      const r = play(e, [S.first, S.real]);
      assert.deepEqual(r.sent, [S.first.swing.natpf.seq, S.real.swing.natpf.seq], 'tutti e due i gesti arrivano al motore');
      assert.ok(r.hit, 'la palla è colpita');
      assert.equal(r.racket.seq, S.real.swing.natpf.seq, `colpo giocato: n. ${r.racket.seq}`);
      assert.deepEqual(r.whiffs, [], 'nessun colpo a vuoto a schermo');
      // il voto è quello del colpo vero: il suo tempo, quasi perfetto
      assert.ok(Math.abs(r.racket.timing) < .06, `tempo ${r.racket.timing}`);
    });
  });
}

test('C1: senza il colpo vero il gesto morbido si gioca dopo il rinvio, con il suo tempo; il colpo a vuoto resta', () => {
  // palla corta voluta da sola (142317 n. 95: rovescio, 654 °/s, 218 ms prima): giocata come prima, voto dal suo tempo
  withEngine('1v1', e => {
    cpuShot(e, { from: [2.5, 1.2, -11], to: [-3.2, 7.5], flight: 1.1, topspin: 8, player: [-2.4, 10.5] });
    const drop = phoneSwing({ seq: 95, shot: 'drop', side: 'backhand', peak: 654, power: .35, conf: .6, angle: 93, latency: .052, rise: -.5 });
    const r = play(e, [{ at: .218 - .052, swing: drop }]);
    assert.ok(r.hit);
    assert.equal(r.racket.seq, 95);
    assert.equal(r.racket.out.shot, 'DROP');
    assert.ok(Math.abs(r.racket.timing - .218) < .02, `tempo ${r.racket.timing}`);
    assert.deepEqual(r.whiffs, []);
  });
  // gesto morbido seguito da un altro gesto morbido (non più forte): resta il primo
  for (const S of [S81, S91]) withEngine('1v1', e => {
    cpuShot(e, S.ball);
    const other = phoneSwing({ ...S.real.swing.natpf, seq: 99, shot: 'topspin', side: S.real.swing.side, peak: S.first.swing.natpf.peak, power: .2 });
    const r = play(e, [S.first, { at: S.real.at, swing: other }]);
    assert.ok(r.hit); assert.equal(r.racket.seq, S.first.swing.natpf.seq);
  });
  // colpo a vuoto in anticipo senza niente dopo: si vede, 65 ms più tardi
  withEngine('1v1', e => {
    cpuShot(e, S86.ball);
    const r = play(e, [S86.first], 3);
    assert.equal(r.hit, false);
    assert.deepEqual(r.whiffs, [86]);
  });
});

test('C1: la palla corta voluta e fatta in tempo non è sostituita dal braccio che torna, neanche durante il rinvio', () => {
  // come la regola del 28/10 sera (KEEP), con il rientro arrivato al computer dopo l'arrivo della palla
  withEngine('leggenda', e => {
    cpuShot(e, { from: [-.5, 1, -11], to: [-1.6, 8.6], flight: 1.05, topspin: 14, player: [.4, 11.7] });
    const drop = phoneSwing({ seq: 1, shot: 'drop', side: 'backhand', peak: 451, power: .21, conf: .76, angle: 68, latency: .04, rise: -.8 });
    const back = phoneSwing({ seq: 2, shot: 'slice', side: 'forehand', peak: 1292, power: .86, latency: .03, rise: -.45 });
    const r = play(e, [{ at: .02, swing: drop }, { at: -.03, swing: back }]);
    assert.ok(r.hit);
    assert.equal(r.racket.seq, 1);
    assert.equal(r.racket.out.shot, 'DROP');
  });
});

// C5 (142438 n. 124): schiacciata di rovescio (806 °/s, sotto l'85% del proprio rovescio) con la palla dal lato del dritto:
// il telefono la tratteneva 300 ms come preparazione (verso atteso +1). Con la palla alta nessun verso atteso
test('C5: con la palla alta (o il piano della schiacciata) nessun verso atteso: la schiacciata di rovescio parte subito', async () => {
  const { createSwingDetector } = await import('@natpf/tennis/swing-detect.js');
  const { expectedStrokeDir } = await import('../src/natpf/natpf_phone_racket.js');
  const rig = expect => {
    const det = createSwingDetector(), swings = [];
    det.setProfile({ axis: [0, 0, 1], ref: 1000, refs: { 1: 1000, '-1': 1000 }, on: 60, minPeak: 120, minAngle: 5, noise: 2, bias: [0, 0, 0] });
    det.run(); det.setPrepMode(true); det.setExpect(expect); det.on('swing', s => swings.push(s));
    let t = 0;
    for (; t < 200; t += 10) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] });
    let peakAt = t;
    for (let i = 0, n = 18; i <= n; i++, t += 10){ if (i === n/2) peakAt = t; det.feed({ t, rot: [0, 0, -806*Math.sin(Math.PI*i/n)**2], acc: [0, 0, 0], accG: [0, 9.8, 0] }); }
    const before = swings.length;
    for (const end = t + 500; t < end; t += 10) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] });
    return { before, swings, peakAt };
  };
  // palla dal lato del dritto (+1,4 m), alta e vicina: come nella partita
  const engine = y => ({ phase: 'RALLY', playerRole: 'p1', player: { pos: { x: 0, z: 9 } }, opponent: { pos: { x: 0, z: -11 } },
    ball: { inPlay: true, lastHitter: 'opponent', vel: { z: 11, y: -3 }, pos: { x: 1.4, y, z: 6 }, targetLanding: { x: 1.4 } } });
  assert.equal(expectedStrokeDir(engine(.9), 'right'), 1, 'palla bassa: dritto atteso come prima');
  assert.equal(expectedStrokeDir(engine(2.6), 'right'), 0, 'palla alta: nessun verso');
  const high = rig(expectedStrokeDir(engine(2.6), 'right'));
  assert.equal(high.before, 1, 'partita subito');
  assert.equal(high.swings[0].holdMs, 0);
  assert.ok(Math.abs(high.swings[0].peakT - high.peakAt) <= 20);
  // palla bassa: lo stesso gesto dall'altra parte resta trattenuto come la preparazione, come oggi
  const low = rig(expectedStrokeDir(engine(.9), 'right'));
  assert.equal(low.before, 0, 'trattenuto');
  assert.equal(low.swings.length, 1); assert.ok(low.swings[0].holdMs > 200);
  // nel motore: pallonetto con il piano della schiacciata (142317 n. 86/87) → nessun verso atteso
  withEngine('1v1', e => { cpuShot(e, S86.ball); assert.equal(e.natpfPlan.kind, 'smash'); assert.equal(expectedStrokeDir(e, 'right'), 0); });
});

// C6: oltre la finestra tempo e piatto nello stesso verso si sommavano senza limite
test('C6: troppo presto con il piatto nello stesso verso, la palla esce di 1–2 m e non di 4 (142317 n. 76)', async () => {
  const NO = await import('../src/natpf/natpf_stroke_outcome.js');
  const { skillLevel } = await import('../src/natpf/natpf_skill.js');
  const level = skillLevel('1v1'), span = NO.directionSpan(level);
  // n. 76: piatto, VERY EARLY (1,338 unità, ritmo 0,465), piatto −1, palla a x 4,54 (punto neutro 1,46): prima x −8,48
  const n76 = NO.strokeOutcome({ intent: { shot: 'flat', power: .834, depth: .834, face: -1 }, timing: 1.338*span, contact: 1, hitX: 4.54, quality: .607, rhythm: .465, level });
  assert.ok(Math.abs(n76.x0 - 1.46) < .01, `neutro ${n76.x0}`);
  assert.ok(Math.abs(n76.aim + 1.886) < .01, `mira ${n76.aim} (la stessa della partita)`);
  const out76 = Math.abs(n76.x) - NO.OUTCOME.sideLine;
  assert.ok(out76 >= 1 && out76 <= 2, `fuori di ${out76.toFixed(2)} m (x ${n76.x})`);
  // più presto ancora la palla va sempre un poco più fuori, mai oltre outMax
  let prev = n76.x;
  for (const u of [1.4, 1.6, 2, 2.6]){
    const o = NO.strokeOutcome({ intent: { shot: 'flat', power: .834, depth: .834, face: -1 }, timing: u*span, contact: 1, hitX: 4.54, quality: .607, rhythm: .465, level });
    assert.ok(o.x <= prev && o.x >= -(NO.OUTCOME.sideLine + NO.OUTCOME.outMax), `${u}: ${o.x} dopo ${prev}`); prev = o.x;
  }
  // dentro o fuori non cambia mai: fino a outKnee oltre la riga (oltre la riga del doppio, 1,37 m) la caduta è quella di
  // prima, e oltre resta fuori. n. 105 (142438: −1,005 unità, piatto −1, x −4,74, fuori di 0,6 m) resta com'era
  const n105 = NO.strokeOutcome({ intent: { shot: 'topspin', power: .508, depth: .478, face: -1 }, timing: -1.005*span, lateSpan: span, contact: -1, hitX: -2.51, quality: .619, rhythm: 0, level });
  assert.ok(n105.x < -NO.OUTCOME.sideLine, `${n105.x}`);
  for (let face = -1; face <= 1.001; face += .1) for (const u of [0, .9, 1.1, 1.3, 2]){
    const o = NO.strokeOutcome({ intent: { shot: 'topspin', power: .6, face }, timing: u*span, contact: 1, hitX: 1, level });
    const out = Math.abs(o.x) - NO.OUTCOME.sideLine;
    assert.ok(out <= NO.OUTCOME.outMax, `${face} ${u}: ${o.x}`);
    if (out < NO.OUTCOME.outKnee) assert.ok(Math.abs(o.x) <= NO.OUTCOME.sideLine + NO.OUTCOME.outKnee);
  }
});

// C12 (142438 n. 143): risposta al servizio presa a 1,71 m con un tagliato (salita −0,59, abituale −0,19, forza 0,57):
// diventava una schiacciata vincente a 338 km/h. Decisione dell'utente del 31/10: in risposta schiacciata solo se voluta
test('C12: in risposta al servizio un tagliato a 1,7 m resta un tagliato; la schiacciata voluta resta schiacciata', async () => {
  const { smashAt, SMASH_FROM } = await import('../src/natpf/natpf_stroke_outcome.js');
  const slice = { side: 'forehand', natpf: { aim: 'swing', intent: { shot: 'slice', power: .57, rise: -.588, riseRef: -.189 } } };
  const smash = { side: 'forehand', natpf: { aim: 'swing', intent: { shot: 'smash', power: .8, rise: -.5, riseRef: -.19 } } };
  assert.equal(smashAt(slice, 1.71), true, 'nello scambio la regola del 29/10 resta');
  assert.equal(smashAt(slice, 1.71, { serveReturn: true }), false);
  assert.equal(smashAt(smash, 1.6, { serveReturn: true }), true);
  assert.equal(smashAt({ side: 'overhead' }, 1.6, { serveReturn: true }), true);
  assert.equal(smashAt(slice, SMASH_FROM.always, { serveReturn: true }), true, 'sopra «always» sempre');
  // nel motore: il servizio della partita (da 3,37 m, rimbalzo a x 1,02, 4,32 m dalla rete) e la risposta tagliata
  const ret = (rally, intent) => withEngine('1v1', e => {
    const plan = cpuShot(e, { from: [-1.03, 3.37, -11.79], to: [1.02, 4.32], flight: .55, topspin: 20, player: [1.2, 11.9], rally });
    const sw = phoneSwing({ seq: 143, shot: intent.shot, side: 'forehand', peak: 939, power: intent.power, conf: .6, angle: 96, latency: .043, rise: intent.rise });
    sw.natpf.intent.riseRef = intent.riseRef;
    const r = play(e, [{ at: .0546 - .043, swing: sw }]);
    return { plan, r };
  });
  const a = ret(1, slice.natpf.intent);
  assert.ok(a.plan.contact.y >= SMASH_FROM.gesture, `contatto previsto a ${a.plan.contact.y} m`);
  assert.ok(a.r.hit);
  assert.equal(a.r.racket.out.shot, 'SLICE');
  assert.equal(ret(1, smash.natpf.intent).r.racket.out.shot, 'SMASH');
});

// C15 (142438 n. 101/102): gesto da 732 °/s (colpo tipico 1082) 368 ms prima del colmo, battuta vera da 1022 °/s 25 ms
// prima del colmo, arrivata 33 ms dopo il picco: prima batteva il primo («GOOD SERVE», 117 km/h) e il secondo era scartato
function serve(e, gestures){
  e.score.server = 'player'; e.phase = 'SERVE_STANCE'; e.autoPlayMode = false; e.userHasInteracted = true;
  e._startServeToss(e.player);
  e.natpfLastServe = null;
  const queue = [...gestures].sort((a, b) => b.at - a.at);
  for (let t = 0; t < 3 && e.phase === 'SERVE_TOSS'; t += DT){
    const up = e.ball.vel.y/9.15;   // s al colmo (negativo: dopo)
    while (queue.length && e.phaseTimer > .2 && up <= queue[0].at) e._handleUserSwingInput(queue.shift().swing);
    e.step(DT);
  }
  return e.natpfLastServe;
}
const serveSwing = (seq, peak, latency, typical = 1082) => phoneSwing({ seq, shot: 'topspin', side: 'forehand', peak, power: Math.min(1, (peak - 250)/1100), latency, typical, angle: 90 });
test('C15: al servizio un gesto intermedio prima del colmo aspetta la battuta vera, che prende il suo posto', () => {
  const s = withEngine('1v1', e => serve(e, [{ at: .368 - .044, swing: serveSwing(101, 732, .044) }, { at: .0245 - .033, swing: serveSwing(102, 1022, .033) }]));
  assert.ok(s, 'servizio battuto');
  assert.ok(Math.abs(s.tau - .0245) < .02, `tempo della battuta ${s.tau} (il primo gesto era a 0,368)`);
  // da solo il gesto intermedio batte lo stesso, con il suo tempo, entro serveWait dopo il colmo
  const alone = withEngine('1v1', e => serve(e, [{ at: .368 - .044, swing: serveSwing(101, 732, .044) }]));
  assert.ok(alone, 'servizio battuto'); assert.ok(Math.abs(alone.tau - .368) < .02, `${alone.tau}`);
  // una battuta vera (oltre 0,9 del colpo tipico, come tutte quelle delle due sessioni) batte subito come prima
  const full = withEngine('1v1', e => { const r = serve(e, [{ at: .3, swing: serveSwing(116, 1149, .03, 1276) }]); return r; });
  assert.ok(full && Math.abs(full.tau - .33) < .02, `${full?.tau}`);
  // il gesto più debole dopo quello intermedio non lo sostituisce
  const weaker = withEngine('1v1', e => serve(e, [{ at: .324, swing: serveSwing(101, 732, .044) }, { at: .1, swing: serveSwing(103, 600, .03) }]));
  assert.ok(Math.abs(weaker.tau - .368) < .02, `${weaker.tau}`);
});
