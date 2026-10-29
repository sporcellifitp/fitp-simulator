// Richiesta del 29/10 (dopo il pacchetto .9), punti 3 e 4:
//   3. colpi super potenti: un gesto fortissimo diventa un colpo quasi imprendibile, ma solo se il colpo è naturale e la
//      palla lo permette (molto alta, lenta in ricezione, corta), mai un rovescio innaturale;
//   4. dopo tanti spostamenti da destra a sinistra il personaggio si stanca, ma non troppo.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';
import { superShot, SUPER } from '../src/natpf/natpf_stroke_outcome.js';
import { fatigueStep, fatigueLevel, moveFactor, FATIGUE } from '../src/natpf/natpf_skill.js';

const DT = 1/120;
const good = { shot: 'TOPSPIN', t: .2, excess: 0, q: .95 };

test('colpo super: tutte le condizioni insieme (gesto fortissimo, colpo naturale, a tempo, da fermo, palla alta/lenta/corta)', () => {
  const base = { intent: { power: .95, conf: 1 }, out: good, contact: 1, ballSide: .7, contactY: 1.4, ballVz: 16 };
  assert.deepEqual(superShot(base), { on: true, why: ['gesto fortissimo', 'palla alta'], ball: 'alta' });
  assert.equal(superShot({ ...base, contactY: .6, ballVz: -10 }).ball, 'lenta', 'palla lenta in arrivo (verso negativo)');
  assert.equal(superShot({ ...base, contactY: .6, ballVz: 16, shortBall: true }).ball, 'corta');
  assert.equal(superShot({ ...base, out: { ...good, shot: 'SMASH' }, contactY: 2.6 }).ball, 'schiacciata');
  const no = (patch, why) => { const r = superShot({ ...base, ...patch }); assert.equal(r.on, false, why); assert.match(r.why[0], why); };
  no({ intent: { power: .8, conf: 1 } }, /non abbastanza forte/);
  no({ intent: { power: .95, conf: .3 } }, /poco chiaro/);
  // rovescio (contact −1) su una palla dalla parte del dritto (ballSide +0,7): innaturale
  no({ contact: -1 }, /innaturale/);
  no({ out: { ...good, shot: 'LOB' } }, /colpo lob/);
  no({ out: { ...good, shot: 'SLICE' } }, /colpo slice/);
  no({ out: { ...good, t: .9 } }, /fuori tempo/);
  no({ out: { ...good, excess: .2, t: 1.2 } }, /fuori tempo/);
  no({ out: { ...good, q: .7 } }, /in corsa/);
  no({ out: { ...good, failed: true } }, /non riuscito/);
  no({ contactY: .6, ballVz: 16 }, /né alta, né lenta, né corta/);
  // vicino al corpo il lato non conta (palla «diretta»)
  assert.equal(superShot({ ...base, contact: -1, ballSide: .2 }).on, true);
});

function withEngine(difficulty, seed, fn){
  const real = Math.random; Math.random = mulberry32(seed);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
const phoneSwing = (intent, { side = 'forehand' } = {}) => ({ source: 'natpf-phone', side, shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, conf: 1, ...intent }, power: intent.power, peak: 900, latency: 0, hand: 'right' } });
// palla lenta e profonda della CPU verso chi gioca, fermo a fondo campo; lo swing a 60 ms dall'impatto
function slowBallHit(e, swing){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
  e.player.pos.set(.6, 0, 12.3); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  e.ball.pos.set(-.5, 1, -11); e._launchBallToTarget(e.ball.pos, new THREE.Vector3(1.2, 0, 9.6), 1.25, { topspin: 2 });
  e._natpfPlanPlayer();
  let sent = false;
  for (let t = 0; t < 4; t += DT){
    const ttc = NI.timeToContact(e, e.player);
    if (!sent && ttc != null && ttc <= .06){ e._handleUserSwingInput(swing); sent = true; }
    const before = e.ball.lastHitter; e.step(DT);
    if (before !== 'player' && e.ball.lastHitter === 'player') return { kmh: e.ball.vel.length()*3.6, racket: e.natpfLastRacket, ball: e.ball, landing: e.ball.targetLanding.clone() };
    if (e.phase !== 'RALLY') break;
  }
  return null;
}

test('nel motore: sulla palla lenta il gesto fortissimo diventa il colpo super (più veloce, in fondo, sopra la rete); il gesto forte normale no', () => {
  const normal = withEngine('pro', 17, e => slowBallHit(e, phoneSwing({ shot: 'topspin', power: .75 })));
  const sup = withEngine('pro', 17, e => {
    const r = slowBallHit(e, phoneSwing({ shot: 'topspin', power: .95 }));
    // la palla passa la rete senza toccarla: segue il volo fino a z = 0
    let netY = null;
    for (let t = 0; t < 2 && netY == null; t += DT){ const z = e.ball.pos.z, y = e.ball.pos.y; e.step(DT); if (z > 0 && e.ball.pos.z <= 0) netY = y; }
    return { ...r, netY };
  });
  assert.ok(normal && sup, 'colpite');
  assert.equal(normal.racket.super, null); assert.equal(sup.racket.super, 'lenta');
  assert.ok(sup.kmh > normal.kmh*1.3 && sup.kmh > 145, `super ${sup.kmh.toFixed(0)} km/h, normale ${normal.kmh.toFixed(0)}`);
  assert.ok(sup.racket.flight < normal.racket.flight*.8, `volo ${sup.racket.flight} / ${normal.racket.flight}`);
  assert.ok(-sup.landing.z >= SUPER.minDepth && -sup.landing.z < 11.9 && Math.abs(sup.landing.x) < 4.1, `caduta ${sup.landing.toArray()}`);
  assert.ok(sup.netY > .914 + .1, `sopra la rete: ${sup.netY}`);
  // per chi riceve: letto in ritardo
  assert.ok(sup.ball.natpfSuper && sup.ball.natpfSuper.react > 0 && sup.ball.natpfSuper.reach < 1);
});

test('nel motore: rovescio fortissimo su una palla dalla parte del dritto → nessun colpo super', () => {
  const r = withEngine('pro', 17, e => slowBallHit(e, phoneSwing({ shot: 'topspin', power: .95 }, { side: 'backhand' })));
  assert.ok(r, 'colpita'); assert.equal(r.racket.super, null); assert.match(r.racket.superWhy[0], /innaturale/);
});

test('la CPU rimanda il colpo super meno spesso del colpo forte normale (non sempre ci arriva)', () => {
  const returns = (power, level) => {
    let n = 0;
    for (let s = 1; s <= 24; s++) withEngine(level, s*7, e => {
      e.opponent.pos.set(((s % 5) - 2)*.4, 0, -11.8); e.opponent.targetPos.copy(e.opponent.pos);
      const r = slowBallHit(e, phoneSwing({ shot: 'topspin', power, face: ((s % 5) - 2)*.4 }));
      if (!r) return;
      for (let k = 0; k < 800; k++){
        const pv = e.ball.vel.y, py = e.ball.pos.y; e.step(DT);
        if (e.phase !== 'RALLY') return;
        // rimbalzo della risposta della CPU nella metà di chi gioca (la CPU può colpire proprio sul suo rimbalzo)
        if (e.ball.lastHitter === 'opponent' && pv < 0 && e.ball.vel.y > 0 && py < .3 && e.ball.pos.z > 0){ if (e.ball.pos.z <= 11.95 && Math.abs(e.ball.pos.x) <= 4.2) n++; return; }
      }
    });
    return n;
  };
  const pro = [returns(.75, 'pro'), returns(.95, 'pro')];
  assert.ok(pro[1] < pro[0] - 5 && pro[1] > 0, `Pro: normale ${pro[0]}/24, super ${pro[1]}/24`);
});

test('stanchezza: la corsa da una parte all\'altra la fa salire, il riposo e la pausa tra i punti la fanno scendere; mai oltre il 10%', () => {
  const E = { ball: null }, a = { pos: { z: 11 } };
  // uno scambio: 10 corse di 3,6 m da una parte all'altra a 6 m/s (36 m di corsa laterale)
  for (let i = 0; i < 10; i++){ const dir = i % 2 ? -1 : 1; for (let t = 0; t < .6; t += DT) fatigueStep(E, a, { vx: 6*dir, speed: 6, dt: DT }); }
  const after = fatigueLevel(E, a), slow = 1 - moveFactor(E, a);
  assert.ok(after > .45 && after < .75, `dopo uno scambio lungo: ${after.toFixed(2)}`);
  assert.ok(slow > .04 && slow < .08, `velocità ${(100*slow).toFixed(1)}% più bassa`);
  // altri tre scambi così: al massimo il 10%
  for (let k = 0; k < 30; k++){ const dir = k % 2 ? -1 : 1; for (let t = 0; t < .6; t += DT) fatigueStep(E, a, { vx: 6*dir, speed: 6, dt: DT }); }
  assert.ok(1 - moveFactor(E, a) <= FATIGUE.maxSlow + 1e-9);
  assert.equal(fatigueLevel(E, a), 1);
  // pausa tra i punti (5 s): torna giù di molto, ma non del tutto
  for (let t = 0; t < 5; t += DT) fatigueStep(E, a, { dt: DT, inPoint: false });
  assert.ok(fatigueLevel(E, a) < .5 && fatigueLevel(E, a) > .3, `dopo la pausa: ${fatigueLevel(E, a).toFixed(2)}`);
  // correre avanti e indietro (lungo il campo) non stanca come la corsa laterale
  const B = { ball: null }, b = { pos: { z: 11 } };
  for (let t = 0; t < 6; t += DT) fatigueStep(B, b, { vx: 0, speed: 6, dt: DT });
  assert.equal(fatigueLevel(B, b), 0);
});

test('stanchezza nel motore: solo i personaggi di chi gioca e solo in partita; palla super in arrivo: corsa più lenta', () => {
  withEngine('pro', 3, e => {
    e.phase = 'RALLY'; e.ball.inPlay = true;
    // chi gioca corre da una riga all'altra (10 corse)
    for (let i = 0; i < 10; i++){ e.player.targetPos.set(i % 2 ? -3 : 3, 0, 11.5); for (let t = 0; t < .7; t += DT) e._stepActorFootwork(e.player, DT); }
    assert.ok(fatigueLevel(e, e.player) > .3, `stanchezza ${fatigueLevel(e, e.player)}`);
    // la CPU non si stanca
    for (let i = 0; i < 10; i++){ e.opponent.targetPos.set(i % 2 ? -3 : 3, 0, -11.5); for (let t = 0; t < .7; t += DT) e._stepActorFootwork(e.opponent, DT); }
    assert.equal(fatigueLevel(e, e.opponent), 0);
    // palla super in arrivo verso chi gioca: fattore della corsa più basso
    const before = moveFactor(e, e.player);
    e.ball.natpfSuper = { reach: SUPER.reach }; e.ball.vel.set(0, 0, 20); e.player.pos.z = 11;
    assert.ok(Math.abs(moveFactor(e, e.player) - before*SUPER.reach) < 1e-9);
    e.ball.vel.set(0, 0, -20);                     // palla che si allontana: niente
    assert.equal(moveFactor(e, e.player), before);
  });
});
