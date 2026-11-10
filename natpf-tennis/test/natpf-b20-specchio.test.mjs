// B20 · tappa A, punto 1 (audit B19, docs/b19/audit-1v1-utenti.md §2 punto 1, appendice A1): nello stesso schermo la
// risposta al servizio e la schiacciata del Player 2 lette come quelle del Player 1. Decisione dell'utente del 31/10: in
// risposta al servizio la schiacciata solo se voluta; la tappa 1 (B18, D7) l'aveva applicata solo al Player 1. Prima il
// tagliato n. 143 (diagnostica 20261030-142438) in risposta dava al Player 2 una schiacciata da fondo campo, quasi sempre
// in rete, e la schiacciata vera del Player 2 partiva al massimo da 1,92 m (3,1 m per il Player 1).
// Prove «a specchio»: stesso servizio (dall'altro lato), stesso gesto → stesso colpo ai due lati.
// node --import ./test/register.mjs --test test/natpf-b20-specchio.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ballIsHigh, natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';
import { SMASH_FROM, smashAt } from '../src/natpf/natpf_stroke_outcome.js';

const DT = 1/120;
// forma del n. 143 (come in natpf-b18-risposta: piano e manico non registrati, due varianti)
const S143 = [{ plane: .62, tilt: .1 }, { plane: .4, tilt: .6 }];
const shape143 = ({ plane, tilt }) => ({ dir: 1, peak: 939, angle: 96, power: .57, at: 10, shape: { rise: -.588, plane, tilt, roll: 0 } });
// dritto normale un po' più piatto del solito (in leggera discesa): audit B19, «non serve un tagliato vero»
const flatDrive = { dir: 1, peak: 1000, angle: 80, power: .6, at: 10, shape: { rise: -.36, plane: .75, tilt: .1, roll: 0 } };
const smashShape = { dir: 1, peak: 1150, angle: 110, power: .8, at: 10, shape: { rise: -.7, plane: .5, tilt: .7, roll: 0 } };
const ROLE = { p1: 'player', p2: 'opponent' }, other = who => (who === 'p1' ? 'p2' : 'p1');
const actor = (e, who) => (who === 'p2' ? e.opponent : e.player);
const phone = (e, who, s) => natpfSwingToEngine(s, { now: 10.043, ballHigh: ballIsHigh(e, who), ref: 1263, riseRef: -.189 });
const send = (e, who, ev) => (who === 'p2' ? e._handleP2SwingInput(ev) : e._handleUserSwingInput(ev));
const serveEv = { source: 'natpf-phone', side: 'forehand', hand: 'right', shotType: 'flat', speed: 1.4, dirX: 0,
  natpf: { aim: 'swing', shot: 'flat', intent: { shot: 'flat', power: .6, plane: .55, rise: -.08, face: 0, depth: .6 }, power: .6, peak: 800, typical: 800, latency: 0, hand: 'right' } };

// stesso schermo: `receiver` risponde al servizio vero dell'altro; ci si ferma a `lead` secondi dal suo punto d'impatto
function splitReturn(receiver, seed, lead = .0116){
  const real = Math.random; Math.random = mulberry32(seed);
  const e = createHeadlessEngine({ difficulty: '1v1' });
  e.startSplit(); e.natpfFair = false; e.natpfP2Hand = 'right';
  const server = other(receiver);
  e.natpfServeFirst = ROLE[server]; e.startNewMatch({ showStartBanner: false });
  let t = 0, tossed = false;
  for (; t < 8 && e.phase !== 'RALLY'; t += DT){
    if (e.phase === 'SERVE_STANCE' && e.phaseTimer > .6 && !tossed){ tossed = true; server === 'p2' ? e._handleP2TossInput({}) : e._handleUserTossInput({}); }
    else if (e.phase === 'SERVE_TOSS' && e.phaseTimer > .17 && e.ball.vel.y/9.15 <= .05) send(e, server, serveEv);
    e.step(DT);
  }
  for (; t < 12 && e.phase === 'RALLY'; t += DT){ const ttc = NI.timeToContact(e, actor(e, receiver)); if (ttc != null && ttc <= lead) break; e.step(DT); }
  return { e, restore: () => { Math.random = real; } };
}
// il colpo nel motore: tipo giocato (null se a vuoto o se il punto è finito prima)
function hit(e, who, ev){
  send(e, who, ev);
  for (let t = 0; t < 2 && e.phase === 'RALLY' && e.ball.lastHitter !== ROLE[who]; t += DT) e.step(DT);
  return e.ball.lastHitter === ROLE[who] ? e.natpfLastRacket?.out?.shot ?? null : null;
}

test('B20 A1: il tagliato n. 143 in risposta al servizio resta un tagliato per il Player 1 e per il Player 2 (telefono e motore)', () => {
  const n = { p1: 0, p2: 0 };
  for (const who of ['p1', 'p2']) for (const seed of [11, 12, 13, 14, 15, 16]) for (const v of S143){
    const { e, restore } = splitReturn(who, 100*seed + 3);
    try {
      assert.equal(e.phase, 'RALLY', `${who} seme ${seed}: il servizio è partito`);
      assert.equal(e.ball.rallyStrokeCount, 1, `${who}: risposta al servizio`);
      assert.equal(e.ball.lastHitter, ROLE[other(who)]);
      const y = NI.planOf(e, actor(e, who))?.contact?.y;
      assert.ok(y >= SMASH_FROM.gesture - .2 && y < SMASH_FROM.always, `${who} seme ${seed}: contatto previsto a ${y} m`);
      assert.equal(ballIsHigh(e, who), false, `${who} seme ${seed}: palla «alta» a ${y} m`);
      const ev = phone(e, who, shape143(v));
      assert.equal(ev.natpf.shot, 'slice', `${who} seme ${seed}: il telefono legge ${ev.natpf.shot}`);
      const shot = hit(e, who, ev);
      assert.equal(shot, 'SLICE', `${who} seme ${seed} ${JSON.stringify(v)}: nel motore ${shot}`);
      assert.notEqual(actor(e, who).swingType, 'smash', `${who}: movimento della schiacciata`);
      n[who]++;
    } finally { restore(); }
  }
  assert.deepEqual(n, { p1: 12, p2: 12 });
});

test('B20 A1: un dritto un po\' più piatto del solito in risposta non diventa schiacciata, per nessuno dei due', () => {
  const played = { p1: [], p2: [] };
  for (const who of ['p1', 'p2']) for (const seed of [21, 22, 23, 24, 25, 26]){
    const { e, restore } = splitReturn(who, 100*seed + 9);
    try {
      const ev = phone(e, who, flatDrive);
      assert.notEqual(ev.natpf.shot, 'smash', `${who}: il telefono legge ${ev.natpf.shot}`);
      // la regola del motore sul gesto vero: in risposta mai schiacciata sotto 2,3 m senza il gesto della schiacciata
      assert.equal(smashAt(ev, e.ball.pos.y, { serveReturn: true }), false);
      const shot = hit(e, who, ev);
      assert.ok(shot && shot !== 'SMASH', `${who} seme ${seed}: nel motore ${shot}`);
      played[who].push(shot);
    } finally { restore(); }
  }
  assert.deepEqual(played.p2, played.p1, 'stesso colpo ai due lati, seme per seme');
});

test('B20 A1: nello scambio la regola del 29/10 resta per tutti e due (tagliato che scende deciso su palla alla spalla = schiacciata)', () => {
  for (const who of ['p1', 'p2']){
    const { e, restore } = splitReturn(who, 1407);
    try {
      e.ball.rallyStrokeCount = 3;   // stessa palla, ma nello scambio
      assert.equal(ballIsHigh(e, who), true, who);
      assert.equal(phone(e, who, shape143(S143[0])).natpf.shot, 'smash', who);
    } finally { restore(); }
  }
});

// palla alta sopra la testa di chi riceve (specchiata per il P2), a `rally` colpi dello scambio; gesto della schiacciata
function overhead(who, rally){
  const real = Math.random; Math.random = mulberry32(5);
  try {
    const e = createHeadlessEngine({ difficulty: '1v1' });
    e.startSplit(); e.natpfFair = false; e.natpfP2Hand = 'right'; e.startNewMatch({ showStartBanner: false });
    const m = who === 'p2' ? -1 : 1, A = actor(e, who);
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = ROLE[other(who)]; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
    A.pos.set(m*.8, 0, m*8); A.targetPos.copy(A.pos); A.vel.set(0, 0, 0);
    e.pendingUserSwing = null; e.pendingP2Swing = null;
    e.ball.pos.set(0, 1.2, -m*11); e.ball.spin.set(0, 0, 0);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(m*.8, 0, m*9.5), 2.1, { topspin: 4 });
    who === 'p2' ? e._natpfPlanOpponent(e.opponent) : e._natpfPlanPlayer();
    const plan = NI.planOf(e, A);
    for (let t = 0; t < 4; t += DT){ const ttc = NI.timeToContact(e, A); if (ttc != null && ttc <= .02) break; e.step(DT); }
    const high = ballIsHigh(e, who), ev = phone(e, who, smashShape), yBefore = e.ball.pos.y;
    send(e, who, ev);
    let from = null;
    for (let t = 0; t < 2 && e.phase === 'RALLY'; t += DT){ if (e.ball.lastHitter === ROLE[who]){ from = e.ball.pos.y; break; } e.step(DT); }
    return { planY: plan?.contact?.y, high, read: ev.natpf.shot, shot: e.ball.lastHitter === ROLE[who] ? e.natpfLastRacket?.out?.shot : null, from, yBefore, swing: A.swingType };
  } finally { Math.random = real; }
}

test('B20 A1: la schiacciata voluta su palla davvero alta, in risposta e nello scambio: uguale ai due lati e dalla stessa altezza', () => {
  for (const rally of [1, 4]){
    const a = overhead('p1', rally), b = overhead('p2', rally);
    for (const [who, r] of [['p1', a], ['p2', b]]){
      assert.ok(r.planY >= SMASH_FROM.always, `${who} (colpo ${rally}): contatto previsto a ${r.planY} m`);
      assert.equal(r.high, true, who);
      assert.equal(r.read, 'smash', who);
      assert.equal(r.shot, 'SMASH', `${who} (colpo ${rally}): nel motore ${r.shot}`);
      assert.equal(r.swing, 'smash', who);
    }
    // prima la schiacciata del P2 partiva al massimo da 1,92 m (P1: fino a 3,1 m) e sui pallonetti finiva in rete
    assert.ok(a.from > 1.95, `P1: la schiacciata parte da ${a.from} m`);
    assert.ok(Math.abs(a.from - b.from) < .02, `altezza di partenza: P1 ${a.from} m, P2 ${b.from} m`);
  }
});
