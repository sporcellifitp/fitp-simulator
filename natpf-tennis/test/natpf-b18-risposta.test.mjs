// B18 · tappa 1 del rapporto B16 (docs/b16/rapporto-gameplay.md, difetto 7 / D7): in risposta al servizio niente
// schiacciate non volute. Decisione dell'utente del 31/10: in risposta schiacciata solo se voluta. La risposta si prende
// fino a 1,72 m (natpf_impact.PLAN.returnTop), sopra SMASH_FROM.gesture (1,5 m): prima la palla contava sempre «alta»
// (ballIsHigh) e il telefono leggeva schiacciata ogni gesto che scende o verticale col manico alto. Il colpo n. 143 della
// diagnostica 20261030-142438 (tagliato, salita −0,588, abituale −0,189, 939 °/s, 96°), che il test C12 di
// natpf-diag-20261030 provava con il tipo già deciso ('slice'), dava ancora la schiacciata 60 volte su 60 dal telefono.
// Qui il colpo parte dalla forma, passa per la lettura del telefono (natpfSwingToEngine, ballIsHigh) e va nel motore,
// sul servizio vero della CPU.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ballIsHigh, natpfSwingToEngine, isServeReturn } from '../src/natpf/natpf_phone_racket.js';
import { readFileSync } from 'node:fs';
import { classifyStroke, INTENT } from '../src/natpf/natpf_stroke_intent.js';
import { SMASH_FROM } from '../src/natpf/natpf_stroke_outcome.js';

const DT = 1/120;
// forma del n. 143 (piano e manico non registrati nella diagnostica: due varianti, una col manico alto)
const S143 = [{ plane: .62, tilt: .1 }, { plane: .4, tilt: .6 }];
const shape143 = ({ plane, tilt }) => ({ dir: 1, peak: 939, angle: 96, power: .57, at: 10, shape: { rise: -.588, plane, tilt, roll: 0 } });
// schiacciata voluta: dall'alto in basso, decisa
const smashShape = { dir: 1, peak: 1150, angle: 110, power: .8, at: 10, shape: { rise: -.7, plane: .5, tilt: .7, roll: 0 } };
// pallonetto: la testa sale, swing verticale col manico alto
const lobShape = { dir: 1, peak: 800, angle: 100, power: .5, at: 10, shape: { rise: .72, plane: .4, tilt: .65, roll: 0 } };
const phone = (e, s) => natpfSwingToEngine(s, { now: 10.043, ballHigh: ballIsHigh(e, 'p1'), ref: 1263, riseRef: -.189 });

// servizio vero della CPU (cpuServeEvent, o legendServe a Leggenda) fino a lead secondi dal contatto previsto
function cpuServe(difficulty, seed, lead = .0546 - .043){
  const real = Math.random; Math.random = mulberry32(seed);
  const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
  e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
  let t = 0;
  for (; t < 6 && !(e.phase === 'RALLY' && e.ball.lastHitter === 'opponent' && e.ball.inPlay); t += DT) e.step(DT);
  for (; t < 9 && e.phase === 'RALLY'; t += DT){ const ttc = NI.timeToContact(e, e.player); if (ttc != null && ttc <= lead) break; e.step(DT); }
  return { e, restore: () => { Math.random = real; } };
}
// il colpo nel motore: tipo di colpo giocato (null se a vuoto o se il punto è finito prima)
function hit(e, ev){
  e._handleUserSwingInput(ev);
  for (let t = 0; t < 2 && e.phase === 'RALLY' && e.ball.lastHitter !== 'player'; t += DT) e.step(DT);
  return e.ball.lastHitter === 'player' ? e.natpfLastRacket?.out?.shot ?? null : null;
}

test('D7: in risposta al servizio vero della CPU la palla non conta «alta»; il n. 143 resta un tagliato (telefono e motore)', () => {
  let n = 0;
  for (const difficulty of ['casual', 'pro', 'leggenda']) for (const seed of [1, 2, 3, 4]) for (const v of S143){
    const { e, restore } = cpuServe(difficulty, 100*seed + 7);
    try {
      assert.equal(e.ball.rallyStrokeCount, 1, 'risposta al servizio');
      const y = e.natpfPlan?.contact?.y;
      assert.ok(y >= SMASH_FROM.gesture - .2 && y < SMASH_FROM.always, `${difficulty}: contatto previsto ${y} m (sopra la spalla, sotto «always»)`);
      assert.equal(ballIsHigh(e, 'p1'), false, `${difficulty} seme ${seed}: palla alta a ${y} m`);
      const ev = phone(e, shape143(v));
      assert.equal(ev.natpf.shot, 'slice', `${difficulty} seme ${seed}: il telefono legge ${ev.natpf.shot}`);
      const shot = hit(e, ev);
      assert.equal(shot, 'SLICE', `${difficulty} seme ${seed} ${JSON.stringify(v)}: nel motore ${shot}`);
      n++;
    } finally { restore(); }
  }
  assert.equal(n, 24);
});

test('D7: nello scambio la regola di prima resta (palla a 1,6–1,7 m alta, il tagliato che scende deciso è schiacciata)', () => {
  const { e, restore } = cpuServe('pro', 107);
  try {
    e.ball.rallyStrokeCount = 3;   // stessa palla, ma nello scambio
    assert.equal(ballIsHigh(e, 'p1'), true);
    assert.equal(phone(e, shape143(S143[0])).natpf.shot, 'smash');
  } finally { restore(); }
});

test('D7: la schiacciata voluta in risposta resta possibile (palla davvero alta, gesto dall\'alto in basso); un gesto che sale no', () => {
  const real = Math.random; Math.random = mulberry32(5);
  try {
    const play = shape => {
      const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
      // risposta (rallyStrokeCount 1) a una palla alta che scende sopra la testa di chi gioca: un servizio «a campanile»
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 1;
      e.player.pos.set(.8, 0, 8); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
      e.ball.pos.set(0, 1.2, -11);
      e._launchBallToTarget(e.ball.pos, new THREE.Vector3(.8, 0, 9.5), 2.1, { topspin: 4 });
      e._natpfPlanPlayer();
      const plan = e.natpfPlan;
      for (let t = 0; t < 4; t += DT){ const ttc = NI.timeToContact(e, e.player); if (ttc != null && ttc <= .02) break; e.step(DT); }
      const high = ballIsHigh(e, 'p1'), ev = phone(e, shape);
      return { plan, high, read: ev.natpf.shot, shot: hit(e, ev) };
    };
    const sm = play(smashShape);
    assert.ok(sm.plan.contact.y >= SMASH_FROM.always, `contatto previsto a ${sm.plan.contact.y} m (${sm.plan.kind})`);
    assert.equal(sm.high, true);
    assert.equal(sm.read, 'smash');
    assert.equal(sm.shot, 'SMASH');
    const lob = play(lobShape);
    assert.equal(lob.high, true);
    assert.notEqual(lob.read, 'smash', 'il pallonetto (gesto che sale) non è schiacciata');
  } finally { Math.random = real; }
});

test('D7: classifyStroke, swing verticale col manico alto: schiacciata solo se la testa non sale', () => {
  const opt = { power: .6, angle: 90, ballHigh: true, riseRef: null };
  // verticale, manico alto, testa che sale: prima schiacciata, ora pallonetto/top spin
  for (const rise of [.05, .3, .7]) assert.notEqual(classifyStroke({ rise, plane: .4, tilt: .6 }, opt).shot, 'smash', `salita ${rise}`);
  // verticale, manico alto, testa ferma o che scende: schiacciata come prima
  for (const rise of [0, -.05]) assert.equal(classifyStroke({ rise, plane: .4, tilt: .6 }, opt).shot, 'smash', `salita ${rise}`);
  assert.equal(INTENT.smashMaxRise, 0);
  // dall'alto in basso con la palla alta: schiacciata come prima
  assert.equal(classifyStroke({ rise: -.5, plane: .8, tilt: 0 }, opt).shot, 'smash');
});

test('D7 (revisione): le palle del lanciapalle non sono risposte al servizio; il servizio della partita sì', () => {
  assert.equal(isServeReturn({ rallyStrokeCount: 1 }), true);
  assert.equal(isServeReturn({ rallyStrokeCount: 1, natpfFeed: true }), false);
  assert.equal(isServeReturn({ rallyStrokeCount: 2 }), false);
  // le due palle degli esercizi (natpf_training _presentBall e _feed) portano il segno
  const tr = readFileSync(new URL('../src/natpf/natpf_training.js', import.meta.url), 'utf8');
  assert.equal((tr.match(/rallyStrokeCount: 1, natpfFeed: true/g) || []).length, 2);
  // dopo un esercizio, il servizio vero della CPU toglie il segno: la risposta torna «risposta»
  const real = Math.random; Math.random = mulberry32(3);
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
    e.ball.natpfFeed = true;
    e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
    for (let t = 0; t < 6 && !(e.phase === 'RALLY' && e.ball.lastHitter === 'opponent' && e.ball.inPlay); t += DT) e.step(DT);
    assert.equal(e.ball.rallyStrokeCount, 1);
    assert.ok(!e.ball.natpfFeed);
    assert.equal(isServeReturn(e.ball), true);
  } finally { Math.random = real; }
});
