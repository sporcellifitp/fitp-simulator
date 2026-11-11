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

/* ---------- B20 (revisione, F1): il tagliato del Player 2 curva come quello del Player 1 ---------- */
// L'effetto laterale del tagliato è una spinta lungo x del campo. Prima per il Player 2 aveva il segno sbagliato: il suo
// tagliato curvava verso l'esterno, quello del Player 1 verso il centro (soli tagliati: il P1 vinceva il 51,5–52,1% dei
// punti e il 53,6–54,4% delle partite). Stessa palla ai due lati, specchiata (x → −x, z → −z): la traiettoria del
// tagliato deve essere la stessa, specchiata, fino al rimbalzo.
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';
function sliceFlight(who, { at = [.4, 11.7], to = [1.6, 8.5] } = {}){
  const real = Math.random; Math.random = mulberry32(17);
  try {
    const e = createHeadlessEngine({ difficulty: '1v1' });
    e.startSplit(); e.natpfFair = false; e.natpfP2Hand = 'right'; e.startNewMatch({ showStartBanner: false });
    const m = who === 'p2' ? -1 : 1, A = actor(e, who);
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = ROLE[other(who)]; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
    A.pos.set(m*at[0], 0, m*at[1]); A.targetPos.copy(A.pos); A.vel.set(0, 0, 0);
    e.pendingUserSwing = null; e.pendingP2Swing = null;
    e.ball.pos.set(-m*.5, 1, -m*11); e.ball.spin.set(0, 0, 0);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(m*to[0], 0, m*to[1]), 1.05, { topspin: 14 });
    who === 'p2' ? e._natpfPlanOpponent(e.opponent) : e._natpfPlanPlayer();
    const intent = { shot: 'slice', power: .55, depth: .55, rise: -.4, face: 0 };
    const swing = { source: 'natpf-phone', side: 'forehand', hand: 'right', shotType: ENGINE_SHOT.slice, speed: .8 + .55*.85, dirX: 0, natpf: { aim: 'swing', shot: 'slice', intent, power: .55, peak: 900, typical: 900, angle: 60, latency: 0, hand: 'right' } };
    let sent = false;
    for (let t = 0; t < 3; t += DT){
      const ttc = NI.timeToContact(e, A);
      if (!sent && ttc != null && ttc <= .02){ sent = true; send(e, who, swing); }
      if (e.ball.lastHitter === ROLE[who] || e.phase !== 'RALLY') break;
      e.step(DT);
    }
    assert.equal(e.ball.lastHitter, ROLE[who], `${who}: colpita`);
    assert.equal(e.natpfLastRacket.out.shot, 'SLICE', `${who}: tagliato`);
    // dal colpo al primo rimbalzo nell'altra metà: posizioni nel riferimento di chi colpisce (specchiate per il P2)
    const start = { x: m*e.ball.pos.x, z: m*e.ball.pos.z }, side = m*e.ball.spin.y, vx0 = m*e.ball.vel.x, path = [], playerX = m*A.pos.x;   // (lato del campo di chi colpisce, al colpo)
    let land = null;
    for (let t = 0; t < 3 && e.phase === 'RALLY'; t += DT){
      e.step(DT);
      path.push({ x: m*e.ball.pos.x, y: e.ball.pos.y, z: m*e.ball.pos.z });
      if (e.ball.bounceCountOnCurrentSide >= 1){ land = { x: m*e.ball.pos.x, z: m*e.ball.pos.z }; break; }
    }
    return { start, side, vx0, path, land, target: { x: m*e.ball.targetLanding.x, z: m*e.ball.targetLanding.z }, playerX };
  } finally { Math.random = real; }
}

test('B20 F1: il tagliato del Player 2 ha la stessa traiettoria di quello del Player 1, specchiata (effetto laterale compreso)', () => {
  for (const scene of [{ at: [.4, 11.7], to: [1.6, 8.5] }, { at: [-1.2, 11.5], to: [-2.2, 9] }, { at: [2.4, 11.9], to: [3, 8.2] }]){
    const a = sliceFlight('p1', scene), b = sliceFlight('p2', scene), tag = JSON.stringify(scene);
    assert.ok(a.land && b.land, `${tag}: la palla rimbalza nell'altra metà`);
    // effetto laterale: stesso segno nel riferimento di chi colpisce (verso il centro dal suo lato del campo), non zero
    assert.ok(Math.abs(a.side) > 1, `${tag}: effetto laterale del P1 ${a.side}`);
    assert.ok(Math.abs(a.side - b.side) < 1e-6, `${tag}: effetto laterale P1 ${a.side}, P2 ${b.side} (nel suo riferimento)`);
    assert.equal(Math.sign(a.side), -Math.sign(a.playerX), `${tag}: il tagliato del P1 curva verso il centro, come prima`);
    assert.ok(Math.abs(a.vx0 - b.vx0) < .02, `${tag}: velocità laterale alla partenza P1 ${a.vx0}, P2 ${b.vx0}`);
    // stessa traiettoria, punto per punto (specchiata), e stesso punto di rimbalzo
    const n = Math.min(a.path.length, b.path.length);
    assert.ok(Math.abs(a.path.length - b.path.length) <= 2, `${tag}: durata del volo ${a.path.length} e ${b.path.length} passi`);
    let worst = 0;
    for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs(a.path[i].x - b.path[i].x), Math.abs(a.path[i].z - b.path[i].z), Math.abs(a.path[i].y - b.path[i].y));
    assert.ok(worst < .06, `${tag}: scarto massimo tra le due traiettorie ${worst.toFixed(3)} m`);
    assert.ok(Math.abs(a.land.x - b.land.x) < .06 && Math.abs(a.land.z - b.land.z) < .06, `${tag}: rimbalzo P1 ${JSON.stringify(a.land)}, P2 ${JSON.stringify(b.land)}`);
  }
});
