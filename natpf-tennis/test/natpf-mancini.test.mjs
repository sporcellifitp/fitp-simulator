// B15 (08/11/2026), richiesta dell'utente: «Assicurati che per i giocatori mancini sia tutto uguale». Prova a specchio:
// lo stesso gesto fatto dal destro e dal mancino, riflesso (campo x → −x: i vettori cambiano x, gli assi di rotazione
// y e z; la presa è la stessa, con lo schermo verso chi gioca), con la calibrazione a specchio, attraversa TUTTA la
// catena (rilevatore e forma sul telefono → mappatura del gioco → intenzione → esito del motore → motore senza
// grafica) e deve dare lo stesso colpo, la stessa forza, la stessa profondità e la caduta dall'altra parte. Anche i
// modelli che imparano (mira, salita abituale, piatto abituale, colpo tipico) devono evolvere a specchio, gli esercizi
// dell'allenamento chiedere al mancino il lato giusto, e la calibrazione chiedergli prima il dritto, come al destro.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { simPhone } from './phone-sim.mjs';
import { armSwing, STROKES, photoGrip } from './arm-sim.mjs';
import { readCard } from './pose-sensors.mjs';
import { mirrorStroke } from '../src/natpf/natpf_gesture_motion.js';
import { gesturePose, gesturePlan, CARD_IDS } from '../src/natpf/natpf_gesture_pose.js';
import { strokeOutcome, superShot } from '../src/natpf/natpf_stroke_outcome.js';
import { swingLandingX, SKILL_LEVELS } from '../src/natpf/natpf_skill.js';
import { calibrationPlan, QUICK_PLAN, PLAN } from '@natpf/tennis/calibration.js';
import { calSide, calPrompt } from '../src/natpf/natpf_cal_view.js';
import { calCoach, sideWant, liveFeedback, trainingShot, trainingDirection, DRILLS } from '../src/natpf/natpf_training.js';
import { leftySide } from '../src/natpf/natpf_hand.js';
import { strokeSide, sideFromBall, expectedStrokeDir, natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { RacketKinematicsController } from '../src/racket_kinematics.js';
import { ENGINE_SHOT, aimFromSignals } from '../src/natpf/natpf_gestures.js';

const near = (a, b, tol) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
const opp = (a, b, tol) => near(a, -b, tol);
const sgn = hand => (hand === 'left' ? -1 : 1);
const forHand = (S, hand) => (hand === 'left' ? mirrorStroke(S) : S);

/* ---------- telefono calibrato a specchio ---------- */
// telefono simulato con la presa insegnata (a specchio per il mancino) e la calibrazione rapida fatta con il braccio:
// dritto e rovescio del braccio simulato, riflessi per il mancino
function mirroredPhone(hand, { seed = 7 } = {}){
  const p = simPhone({ seed, shape: true, hand });
  photoGrip(p, { hand });
  p.calibrate({ armGesture: w => armSwing(p, forHand((w === 'L') === (hand !== 'left') ? STROKES.dritto : STROKES.rovescio, hand)) });
  return p;
}
// un gesto del braccio con il piatto girato di yaw gradi (attorno alla verticale, prima del colpo) e la velocità scalata
function gesture(p, hand, S, { rate = 1, yaw = 0, ballHigh = false, own = null } = {}){
  const before = p.msgs.length;
  if (yaw) p.pose([0, 1, 0], yaw*sgn(hand), 45);
  armSwing(p, { ...forHand(S, hand), peak: S.peak*rate });
  p.rest(600, 0);
  if (yaw) p.pose([0, 1, 0], -yaw*sgn(hand), 45);
  p.rest(300, 0);
  const msgs = p.msgs.slice(before);
  return { msgs, read: msgs.map(d => p.game(d, { ballHigh, own })) };
}
// griglia dei gesti: colpi del braccio simulato (dritto, rovescio, pallonetti, palle corte, tagliato, schiacciata su
// palla alta), quattro velocità e tre piatti; per ogni colpo un telefono fresco per mano (i riferimenti che imparano
// giocando evolvono con la sequenza, nello stesso modo per le due mani)
const NAMES = [['dritto', STROKES.dritto], ['rovescio', STROKES.rovescio], ['pallonetto', STROKES.pallonetto], ['pallonettoR', STROKES.pallonettoR],
  ['corta', STROKES.corta], ['cortaR', STROKES.cortaR], ['tagliato', STROKES.tagliato], ['tagliato palla alta', STROKES.tagliato, true]];
const RATES = [.85, 1, 1.2, 1.5], YAWS = [-22, 0, 22];

// confronto di un colpo letto dal destro (r) e dal mancino (l): stesso colpo, forza e forma; verso, piano e mira opposti
function compareRead(r, l, tag){
  assert.ok(r.s.dir + l.s.dir === 0, `${tag}: verso ${r.s.dir} / ${l.s.dir}`);   // (anche 0 e 0: gesto verticale)
  assert.ok(near(r.s.peak, l.s.peak, 6), `${tag}: picco ${r.s.peak} / ${l.s.peak}`);
  assert.ok(near(r.s.lift, l.s.lift, .03), `${tag}: lift ${r.s.lift} / ${l.s.lift}`);
  if (r.s.shape || l.s.shape){
    for (const k of ['rise', 'tilt', 'roll']) assert.ok(near(r.s.shape[k], l.s.shape[k], .03), `${tag}: forma ${k} ${r.s.shape[k]} / ${l.s.shape[k]}`);
    assert.ok(near(r.s.shape.head, l.s.shape.head, .1), `${tag}: velocità della testa ${r.s.shape.head} / ${l.s.shape.head}`);
    assert.ok(opp(r.s.shape.plane, l.s.shape.plane, .03), `${tag}: piano ${r.s.shape.plane} / ${l.s.shape.plane}`);
  }
  if (r.s.face) assert.ok(opp(r.s.face.yaw, l.s.face.yaw, 1.5), `${tag}: piatto ${r.s.face.yaw} / ${l.s.face.yaw}`);
  if (Number.isFinite(r.s.heading)) assert.ok(opp(r.s.heading, l.s.heading, 1.5), `${tag}: direzione del piatto ${r.s.heading} / ${l.s.heading}`);
  const a = r.ev, b = l.ev;
  assert.equal(a.side, b.side, `${tag}: lato ${a.side} / ${b.side}`);
  assert.equal(a.natpf.shot, b.natpf.shot, `${tag}: colpo ${a.natpf.shot} / ${b.natpf.shot}`);
  assert.equal(a.shotType, b.shotType, tag);
  assert.ok(near(a.natpf.power, b.natpf.power, .01), `${tag}: forza ${a.natpf.power} / ${b.natpf.power}`);
  assert.ok(near(a.speed, b.speed, .01), `${tag}: velocità del motore ${a.speed} / ${b.speed}`);
  assert.ok(near(a.natpf.head, b.natpf.head, .03), `${tag}: verso del piatto ${a.natpf.head} / ${b.natpf.head}`);
  // (mira dal piatto: 1,5° di scarto del telefono simulato valgono fino a 0,08)
  assert.ok(opp(a.natpf.wrist, b.natpf.wrist, .08), `${tag}: mira ${a.natpf.wrist} / ${b.natpf.wrist}`);
  assert.equal(a.natpf.aimSource, b.natpf.aimSource, tag);
  // mira del gesto (polso e ampiezza, gestureAim): solo di riserva per i telefoni senza il piatto. Nei gesti senza verso
  // (verticali, dir 0) il polso del telefono non ha il segno della mano e non si specchia: innocuo, la mira vera è il piatto
  if (r.s.dir) assert.ok(opp(a.dirX, b.dirX, .06), `${tag}: dirX ${a.dirX} / ${b.dirX}`);
  assert.ok(near(a.dirY, b.dirY, .02), `${tag}: dirY ${a.dirY} / ${b.dirY}`);
  const I = a.natpf.intent, J = b.natpf.intent;
  assert.ok(I && J, `${tag}: intenzione mancante`);
  assert.equal(I.shot, J.shot, tag); assert.equal(I.byShape, J.byShape, tag);
  for (const k of ['power', 'depth', 'reach', 'rise', 'tilt', 'roll', 'shapePower']) assert.ok(near(I[k], J[k], .01), `${tag}: intenzione ${k} ${I[k]} / ${J[k]}`);
  assert.ok(opp(I.plane, J.plane, .03), `${tag}: piano dell'intenzione ${I.plane} / ${J.plane}`);
  assert.ok(opp(I.face, J.face, .08), `${tag}: mira del piatto ${I.face} / ${J.face}`);
}
const mirrorIntent = I => ({ ...I, plane: -I.plane, face: -I.face });
// esito del motore (natpf_stroke_outcome) a specchio: lato del contatto e palla riflessi → caduta riflessa, resto uguale
function compareOutcome(I, J, side, hand, tag){
  const level = SKILL_LEVELS.casual;
  for (const timing of [-.12, -.04, 0, .05, .12]) for (const hitX of [-1.8, 0, 1.6]) for (const rhythm of [0, .25]){
    const contact = (side === 'backhand' ? -1 : 1), c = contact*sgn('right'), cl = contact*sgn('left');
    const base = { timing, lateSpan: .1, ballVz: 16, hitZ: 11.2, quality: .9, pressure: 1, rhythm, contactY: 1.05, level };
    const r = strokeOutcome({ ...base, intent: I, contact: c, hitX }), l = strokeOutcome({ ...base, intent: J, contact: cl, hitX: -hitX });
    const t = `${tag} t=${timing} x=${hitX}`;
    assert.equal(r.shot, l.shot, t); assert.equal(r.grade, l.grade, t);
    assert.ok(opp(r.x, l.x, .02), `${t}: caduta ${r.x} / ${l.x}`);
    assert.ok(near(r.depth, l.depth, .02), `${t}: profondità ${r.depth} / ${l.depth}`);
    assert.ok(near(r.clear, l.clear, .01) && near(r.topspin, l.topspin, .05), `${t}: altezza/effetto`);
    assert.equal(r.failed, l.failed, t); assert.equal(r.netFault, l.netFault, t); assert.equal(r.attack, l.attack, t);
    assert.ok(opp(r.aim, l.aim, .01), `${t}: mira ${r.aim} / ${l.aim}`);
    const sr = superShot({ intent: I, out: r, contact: c, ballSide: hitX, contactY: 1.3, ballVz: 11 }), sl = superShot({ intent: J, out: l, contact: cl, ballSide: -hitX, contactY: 1.3, ballVz: 11 });
    assert.equal(sr.on, sl.on, `${t}: colpo super ${sr.why} / ${sl.why}`);
    // (dispersione nulla: la gaussiana di landingScatter con u = ½, v = ¼ vale 0)
    const flat = () => { let i = 0; return () => (i++ % 2 ? .25 : .5); };
    const xr = swingLandingX({ timing, contact: c, wrist: I.face, aimSource: 'face', quality: 1, power: .6, level, rng: flat() });
    const xl = swingLandingX({ timing, contact: cl, wrist: J.face, aimSource: 'face', quality: 1, power: .6, level, rng: flat() });
    assert.ok(opp(xr, xl, .02), `${t}: swingLandingX ${xr} / ${xl}`);
  }
}

test('catena intera a specchio: 96 gesti del braccio (8 colpi × 4 velocità × 3 piatti), destro e mancino riflessi → stesso colpo, forza, profondità; caduta opposta', () => {
  const seen = new Set();
  for (const [name, S, ballHigh] of NAMES){
    const R = mirroredPhone('right'), L = mirroredPhone('left');
    // le calibrazioni sono a specchio: colpo tipico uguale, piatto abituale opposto
    const pr = R.det.profile, pl = L.det.profile;
    assert.ok(near(pr.refs[1], pl.refs[-1], 5) && near(pr.refs[-1], pl.refs[1], 5), `colpo tipico ${JSON.stringify(pr.refs)} / ${JSON.stringify(pl.refs)}`);
    assert.ok(opp(pr.faceRef[1].heading, pl.faceRef[-1].heading, 2) && opp(pr.faceRef[-1].heading, pl.faceRef[1].heading, 2), `piatto abituale ${JSON.stringify(pr.faceRef)} / ${JSON.stringify(pl.faceRef)}`);
    assert.ok(near(pr.rises[1], pl.rises[-1], .03) && near(pr.rises[-1], pl.rises[1], .03), `salita abituale ${JSON.stringify(pr.rises)} / ${JSON.stringify(pl.rises)}`);
    for (const rate of RATES) for (const yaw of YAWS){
      const tag = `${name} ×${rate} piatto ${yaw}°`, o = { rate, yaw, ballHigh: !!ballHigh };
      const r = gesture(R, 'right', S, o), l = gesture(L, 'left', S, o);
      assert.equal(r.read.length, l.read.length, `${tag}: colpi letti ${r.read.length} / ${l.read.length}`);
      assert.equal(r.read.length, 1, `${tag}: ${r.read.length} colpi`);
      compareRead(r.read[0], l.read[0], tag);
      const ev = r.read[0].ev;
      seen.add(ev.natpf.shot);
      // esito del motore con l'intenzione riflessa esattamente (le letture del telefono simulato differiscono di un soffio)
      compareOutcome(ev.natpf.intent, mirrorIntent(ev.natpf.intent), ev.side, 'right', tag);
    }
  }
  for (const shot of ['topspin', 'flat', 'lob', 'drop', 'slice', 'smash']) assert.ok(seen.has(shot), `la griglia non ha prodotto «${shot}» (${[...seen].join(', ')})`);
});

test('modelli che imparano (mira, piatto, salita abituale, colpo tipico): dopo 18 colpi evolvono a specchio', () => {
  const R = mirroredPhone('right', { seed: 3 }), L = mirroredPhone('left', { seed: 3 });
  const seq = [['dritto', 0], ['dritto', 10], ['rovescio', 0], ['dritto', -8], ['rovescio', 12], ['pallonetto', 0], ['dritto', 0], ['corta', 0], ['rovescio', -10], ['dritto', 14],
    ['tagliato', 0], ['dritto', 0], ['rovescio', 0], ['dritto', 6], ['rovescio', -6], ['dritto', 0], ['dritto', -12], ['rovescio', 0]];
  for (const [name, yaw] of seq){
    const r = gesture(R, 'right', STROKES[name], { yaw }), l = gesture(L, 'left', STROKES[name], { yaw });
    assert.equal(r.read.length, l.read.length, `${name} ${yaw}`);
    if (r.read.length === 1) compareRead(r.read[0], l.read[0], `${name} piatto ${yaw}°`);
  }
  // i modelli di game() (phone-sim) sono gli stessi oggetti di NatpfPhoneRacket: si leggono dal colpo seguente
  const r = gesture(R, 'right', STROKES.dritto), l = gesture(L, 'left', STROKES.dritto);
  const a = r.read[0], b = l.read[0];
  compareRead(a, b, 'dopo 18 colpi');
  assert.ok(near(a.ev.natpf.intent.riseRef, b.ev.natpf.intent.riseRef, .02), `salita abituale imparata ${a.ev.natpf.intent.riseRef} / ${b.ev.natpf.intent.riseRef}`);
  assert.ok(opp(a.ev.natpf.aimDev, b.ev.natpf.aimDev, 1.5), `scarto della mira ${a.ev.natpf.aimDev} / ${b.ev.natpf.aimDev}`);
});

test('schede del tutorial a specchio: il mancino legge dalla sua animazione lo stesso colpo, lato e forza del destro, mira opposta', () => {
  const src = { pose: (id, t, hand) => gesturePose(id, t, { hand }), plan: id => gesturePlan(id) };
  const ids = [...CARD_IDS, 'cross', 'line'].filter(id => !['grip', 'ready'].includes(id));
  for (const cal of ['pose', 'arm']){
    for (const id of ids){
      // telefono fresco per scheda (come natpf-gesture-pose), con lo stesso seme per le due mani
      const tag = `${id} (calibrazione ${cal})`;
      const r = readCard(src, id, { hand: 'right', cal }), l = readCard(src, id, { hand: 'left', cal });
      assert.equal(r.msgs.length, l.msgs.length, `${tag}: messaggi ${r.msgs.length} / ${l.msgs.length}`);
      if (id === 'serve'){
        assert.equal(r.events.length, 2, tag);
        for (let i = 0; i < 2; i++) assert.ok(near(r.events[i].peak, l.events[i].peak, 6), `${tag}: picco ${i} ${r.events[i].peak} / ${l.events[i].peak}`);
        assert.ok(near(r.gap, l.gap, .02), `${tag}: lancio→battuta ${r.gap} / ${l.gap}`);
        continue;
      }
      assert.equal(r.read.length, 1, `${tag}: ${r.read.length} colpi`);
      compareRead(r.read[0], l.read[0], tag);
      if (['cross', 'line'].includes(id)) assert.ok(r.read[0].ev.natpf.wrist*(id === 'cross' ? -1 : 1) > .4, `${tag}: mira del destro ${r.read[0].ev.natpf.wrist}`);
    }
  }
});

/* ---------- motore senza grafica ---------- */
const DT = 1/120;
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(17);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
function cpuShot(e, { from = [-.5, 1, -11], to = [1.6, 8.5], flight = 1.05, topspin = 14, player = [.4, 11.7], rally = 3, mirror = 1 } = {}){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
  e.player.pos.set(player[0]*mirror, 0, player[1]); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  e.pendingUserSwing = null;
  e.ball.pos.set(from[0]*mirror, from[1], from[2]);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0]*mirror, 0, to[1]), flight, { topspin });
  e._natpfPlanPlayer();
  return e.natpfPlan;
}
const phoneSwing = (intent, { side = 'forehand', hand = 'right', peak = 900 } = {}) => ({ source: 'natpf-phone', side, shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, ...intent }, power: intent.power, peak, latency: 0, hand } });
function play(e, swings, maxT = 4){
  const queue = [...swings].sort((a, b) => b.lead - a.lead);
  for (let t = 0; t < maxT; t += DT){
    const ttc = NI.timeToContact(e, e.player);
    while (queue.length && ttc != null && ttc <= queue[0].lead) e._handleUserSwingInput(queue.shift().swing);
    e.step(DT);
    if (e.phase !== 'RALLY') break;
    if (e.ball.lastHitter === 'player' && e.ball.pos.z < -1) break;
  }
  return { hit: e.ball.lastHitter === 'player', landing: e.ball.targetLanding.clone(), racket: e.natpfLastRacket, player: e.player.pos.clone(), phase: e.phase };
}

test('motore senza grafica, Player 1: destro e mancino a specchio (palla, corpo e gesto riflessi) → stessa profondità, caduta opposta, stesso voto', () => {
  const cases = [
    { shot: 'topspin', power: .7, side: 'forehand', ball: { to: [1.8, 8.4] } },
    { shot: 'topspin', power: .7, side: 'backhand', ball: { to: [-1.6, 8.6] } },
    { shot: 'flat', power: .9, side: 'forehand', face: .5, ball: { to: [1.2, 9] } },
    { shot: 'slice', power: .45, side: 'backhand', rise: -.4, ball: { to: [-2, 8] } },
    { shot: 'drop', power: .3, side: 'forehand', rise: -.3, ball: { to: [1.4, 7.5] } },
    { shot: 'lob', power: .6, side: 'forehand', rise: .8, ball: { to: [1, 8.8] } },
    { shot: 'topspin', power: .75, side: 'forehand', face: -.6, ball: { to: [2.2, 8.2] } },
    { shot: 'flat', power: .92, side: 'forehand', ball: { player: [.3, 7.5], to: [1.5, 6.5], flight: 1.4, topspin: 6 } },
  ];
  for (const c of cases) for (const lead of [.14, .02, -.03]){
    const run = hand => withEngine('casual', e => {
      cpuShot(e, { ...c.ball, mirror: sgn(hand) });
      const intent = { shot: c.shot, power: c.power, rise: c.rise ?? 0, face: (c.face ?? 0)*sgn(hand) };
      return play(e, [{ lead, swing: phoneSwing(intent, { side: c.side, hand }) }]);
    });
    const r = run('right'), l = run('left'), tag = `${c.shot} ${c.side} anticipo ${lead}`;
    assert.equal(r.hit, l.hit, `${tag}: colpito ${r.hit} / ${l.hit}`);
    assert.ok(r.hit, `${tag}: non colpito (${r.phase})`);
    assert.equal(r.racket.out.shot, l.racket.out.shot, tag);
    assert.equal(r.racket.out.grade, l.racket.out.grade, `${tag}: voto ${r.racket.out.grade} / ${l.racket.out.grade}`);
    assert.equal(r.racket.contact, -l.racket.contact, `${tag}: lato del contatto ${r.racket.contact} / ${l.racket.contact}`);
    assert.ok(opp(r.racket.hitX, l.racket.hitX, .02), `${tag}: palla all'impatto ${r.racket.hitX} / ${l.racket.hitX}`);
    assert.ok(opp(r.landing.x, l.landing.x, .02), `${tag}: caduta ${r.landing.x} / ${l.landing.x}`);
    assert.ok(near(r.landing.z, l.landing.z, .02), `${tag}: profondità ${r.landing.z} / ${l.landing.z}`);
    assert.ok(near(r.racket.out.depth, l.racket.out.depth, .02), tag);
    assert.ok(near(r.racket.quality, l.racket.quality, .01), `${tag}: qualità ${r.racket.quality} / ${l.racket.quality}`);
  }
});

// 1v1: palla di chi gioca qui verso il Player 2 (metà campo z negative), che si prepara con il suo piano d'intercetto
function p1Shot(e, { from, to, flight, topspin = 14, p2, rally = 3, hand = 'right' }){
  e.isMultiplayer = true; e.versus = { active: true }; e.natpfP2Hand = hand;
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
  e.opponent.pos.set(p2[0], 0, p2[1]); e.opponent.targetPos.copy(e.opponent.pos); e.opponent.vel.set(0, 0, 0);
  e.pendingP2Swing = null;
  e.ball.pos.set(...from);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0], 0, to[1]), flight, { topspin });
  e._natpfPlanOpponent(e.opponent);
  return NI.planOf(e, e.opponent);
}
function playP2(e, swing, { gap = 1.7, maxT = 4 } = {}){
  let sent = false;
  for (let t = 0; t < maxT; t += DT){
    if (!sent && e.ball.lastHitter === 'player' && e.ball.pos.z - e.opponent.pos.z <= gap){ e._handleP2SwingInput(swing); sent = true; }
    const before = e.ball.lastHitter;
    e.step(DT);
    if (before === 'player' && e.ball.lastHitter === 'opponent') break;
    if (e.phase !== 'RALLY') break;
  }
  return { hit: e.ball.lastHitter === 'opponent', racket: e.natpfLastRacket, landing: e.ball.targetLanding.clone(), phase: e.phase };
}

test('motore senza grafica, Player 2 del 1v1: il mancino a specchio del destro (la sua destra è −x)', () => {
  for (const [side, px, bx] of [['forehand', -.4, -1.6], ['backhand', .3, 1.4]]) for (const gap of [2.2, 1.5]){
    const run = hand => withEngine('1v1', e => {
      const m = sgn(hand);
      p1Shot(e, { from: [.5*m, 1, 11], to: [bx*m, -8.5], flight: 1.05, p2: [px*m, -11.7], hand });
      const sw = { ...phoneSwing({ shot: 'topspin', power: .7, face: .3*m }, { side, hand }), hand };
      return playP2(e, sw, { gap });
    });
    const r = run('right'), l = run('left'), tag = `P2 ${side} palla a ${gap} m`;
    assert.ok(r.hit && l.hit, `${tag}: colpito ${r.hit} / ${l.hit}`);
    assert.equal(r.racket.who, 'p2');
    assert.equal(r.racket.contact, -l.racket.contact, `${tag}: contatto ${r.racket.contact} / ${l.racket.contact}`);
    assert.ok(opp(r.landing.x, l.landing.x, .02), `${tag}: caduta ${r.landing.x} / ${l.landing.x}`);
    assert.ok(near(r.landing.z, l.landing.z, .02), `${tag}: profondità ${r.landing.z} / ${l.landing.z}`);
    assert.equal(r.racket.out.grade, l.racket.out.grade, tag);
  }
});

/* ---------- lato, esercizi e testi ---------- */
test('lato del colpo: funzioni pure a specchio (verso del gesto, palla, preparazione, webcam, esercizi)', () => {
  assert.equal(strokeSide(1, 'right'), 'forehand'); assert.equal(strokeSide(-1, 'left'), 'forehand');
  assert.equal(strokeSide(-1, 'right'), 'backhand'); assert.equal(strokeSide(1, 'left'), 'backhand');
  for (const want of ['L', 'R']){
    assert.equal(calSide(want, 'left'), calSide(want === 'L' ? 'R' : 'L', 'right'));
    assert.equal(calCoach(want, 'left').side, calCoach(want === 'L' ? 'R' : 'L', 'right').side);
  }
  for (const side of ['forehand', 'backhand']) assert.equal(sideWant(side, 'left'), sideWant(side, 'right') === 'L' ? 'R' : 'L');
  // il computer chiede il dritto per primo a tutti e due (la freccia cambia, la parola no)
  assert.match(calPrompt({ stage: 'gesture', idx: 0, want: 'L', ready: true }, 'right').title, /Dritto ←/);
  assert.match(calPrompt({ stage: 'gesture', idx: 0, want: 'R', ready: true }, 'left').title, /Dritto →/);
  // mira dal polso (telefoni senza il piatto): il polso del messaggio (canonicalTwist) è già nel verso del mondo (l'asse di
  // calibrazione è quello del gesto «L», con il segno della mano), quindi non si moltiplica per la mano
  assert.equal(aimFromSignals({ twist: .3, dir: 1 }).aim, .48); assert.equal(aimFromSignals({ twist: .3, dir: -1 }).aim, .48);
  assert.equal(aimFromSignals({ faceAim: .5, twist: .3, dir: -1 }).aim, .5);
  assert.ok(near(aimFromSignals({ aim: .2, dir: 1 }).aim, .6, 1e-9)); assert.ok(near(aimFromSignals({ aim: -.2, dir: -1 }).aim, -.6, 1e-9));
  // palla e verso atteso dal gioco
  const eng = (bx, role = 'p1') => ({ playerRole: role, phase: 'RALLY', ball: { inPlay: true, lastHitter: role === 'p2' ? 'player' : 'opponent', pos: { x: bx, y: 1, z: role === 'p2' ? -6 : 6 }, vel: { x: 0, y: 0, z: role === 'p2' ? -12 : 12 }, targetLanding: { x: bx } },
    player: { pos: { x: 0, z: 11.4 } }, opponent: { pos: { x: 0, z: -11.4 } } });
  assert.equal(sideFromBall(eng(1.2), 'right'), 'forehand'); assert.equal(sideFromBall(eng(-1.2), 'left'), 'forehand');
  assert.equal(sideFromBall(eng(-1.2), 'right'), 'backhand'); assert.equal(sideFromBall(eng(1.2), 'left'), 'backhand');
  assert.equal(expectedStrokeDir(eng(1.2), 'right'), 1); assert.equal(expectedStrokeDir(eng(-1.2), 'left'), -1);
  assert.equal(expectedStrokeDir(eng(-1.2), 'right'), -1); assert.equal(expectedStrokeDir(eng(1.2), 'left'), 1);
  // P2 (guarda verso +z): la sua destra è −x
  assert.equal(sideFromBall(eng(-1.2, 'p2'), 'right', 'p2'), 'forehand'); assert.equal(sideFromBall(eng(1.2, 'p2'), 'left', 'p2'), 'forehand');
  // webcam, mouse: il lato del destro scambiato per il mancino (NatpfHand), quello del telefono resta
  assert.equal(leftySide({ source: 'webcam', side: 'backhand' }), 'forehand');
  assert.equal(leftySide({ source: 'webcam', handedSide: true, side: 'backhand' }), 'backhand');
  assert.equal(leftySide({ source: 'natpf-phone', side: 'backhand' }), 'backhand');
  assert.equal(leftySide({ source: 'mouse', dirX: .5 }), 'forehand');
  assert.equal(leftySide({ source: 'webcam' }, { ballX: -1, actorX: 0 }), 'forehand');
  assert.equal(leftySide({ source: 'webcam' }, { ballX: 1, actorX: 0, facingNegativeZ: false }), 'forehand');
  assert.equal(NI.webcamGate({ localActor: { pos: { x: 0, z: 11 } }, ball: { inPlay: true, lastHitter: 'opponent', pos: { x: -1.5, y: 1, z: 9 }, vel: { x: 0, y: 0, z: 10 }, targetLanding: { x: -1.5, z: 10 } }, phase: 'RALLY', playerRole: 'p1', natpfPlan: null }, 'left')?.side, 'forehand');
  // esercizi: lato atteso, mira e giudizio
  const cross = DRILLS.find(d => d.id === 'cross'), line = DRILLS.find(d => d.id === 'line');
  for (const hand of ['right', 'left']){
    const m = sgn(hand);
    assert.equal(liveFeedback(cross, { shot: 'topspin', wrist: -.6*m }, { side: 'forehand', hand }).ok, true, `${hand} incrociato`);
    assert.equal(liveFeedback(cross, { shot: 'topspin', wrist: .6*m }, { side: 'forehand', hand }).ok, false, `${hand} incrociato sbagliato`);
    assert.equal(liveFeedback(line, { shot: 'topspin', wrist: .6*m }, { side: 'forehand', hand }).ok, true, `${hand} lungolinea`);
    const fb = liveFeedback(DRILLS.find(d => d.id === 'forehand'), { shot: 'topspin' }, { side: 'backhand', hand });
    assert.match(fb.tip, hand === 'left' ? /da sinistra verso destra/ : /da destra verso sinistra/);
    assert.equal(trainingShot({ swingType: 'smash', racket: { out: { shot: 'SMASH' }, smashCalled: false, contact: m }, hand }).side, 'forehand', `${hand}: schiacciata non chiamata dal lato del dritto`);
    assert.equal(trainingDirection({ x: -2.5*m, hitX: 1.5*m }), 'cross'); assert.equal(trainingDirection({ x: 2.5*m, hitX: 0, contact: m }), 'line');
  }
});

test('calibrazione: anche al mancino si chiede prima il dritto (percorso rapido ed esteso), e il primo gesto nel verso giusto fissa l’asse', () => {
  assert.deepEqual(calibrationPlan({ quick: true, hand: 'right' }), ['L', 'R']);
  assert.deepEqual(calibrationPlan({ quick: true, hand: 'left' }), ['R', 'L']);
  assert.deepEqual(calibrationPlan({ quick: true }), QUICK_PLAN);
  assert.deepEqual(calibrationPlan({ hand: 'left' }), ['R', 'R', 'R', 'L', 'L', 'L']);
  assert.deepEqual(calibrationPlan({ hand: 'right' }), PLAN);
  for (const hand of ['right', 'left']){
    const plan = calibrationPlan({ quick: true, hand });
    assert.equal(calSide(plan[0], hand), 'forehand', `${hand}: primo gesto`); assert.equal(calSide(plan[1], hand), 'backhand', `${hand}: secondo gesto`);
    // il telefono simulato segue il percorso della sua mano: dritto, poi rovescio; stesso esito a specchio
    const p = simPhone({ seed: 5, shape: true, hand }), ev = [];
    photoGrip(p, { hand }); p.cal.on(e => ev.push(e));
    const r = p.calibrate({ armGesture: w => armSwing(p, forHand((w === 'L') === (hand !== 'left') ? STROKES.dritto : STROKES.rovescio, hand)), soft: true });
    assert.equal(r.ok, true, `${hand}: ${JSON.stringify(r)}`);
    assert.deepEqual(r.attempts.map(a => [a.want, a.dir, a.ok]), plan.map(w => [w, w, true]), hand);
    assert.deepEqual(ev.filter(e => e.kind === 'step' && e.want).map(e => e.want)[0], plan[0], `${hand}: primo passo chiesto`);
    const fh = sgn(hand);
    assert.ok(p.det.profile.refs[fh] > p.det.profile.refs[-fh]*.8, `${hand}: dritto ${p.det.profile.refs[fh]} rovescio ${p.det.profile.refs[-fh]}`);
  }
  // primo gesto nel verso sbagliato (il rovescio al posto del dritto): si chiede di rifarlo, per tutti e due
  for (const hand of ['right', 'left']){
    const ev = [];
    const p = simPhone({ seed: 9, shape: true, hand }); photoGrip(p, { hand });
    const plan = calibrationPlan({ quick: true, hand });
    p.cal.on(e => ev.push(e));
    p.cal.start({ quick: true, hand }); p.rest(800, 0);
    armSwing(p, forHand(STROKES.rovescio, hand)); p.rest(500, 0);     // rovescio al posto del dritto
    const first = ev.filter(e => e.kind === 'attempt')[0];
    assert.ok(first && !first.ok && first.why === 'direzione' && first.want === plan[0] && first.dir === plan[1], `${hand}: ${JSON.stringify(first)}`);
    assert.equal(p.cal.state.idx, 0, `${hand}: si rifà il primo gesto`);
  }
});

// Racchetta animata (racket_kinematics.triggerSwing): nello scambio sceglieva il lato dalla palla con la regola del destro
// e lo scriveva in actor.swingType, letto dall'allenamento e dalle scritte: il dritto del mancino (palla alla sua sinistra)
// diventava un rovescio (prova nel browser HAND=left, 08/11). Ora il lato è nel riferimento della mano del personaggio
test('racchetta animata: il lato del colpo dalla palla segue la mano del personaggio (actor.natpfHand)', () => {
  const rk = new RacketKinematicsController();
  const strike = (hand, ballX) => {
    const engine = { phase: 'RALLY', showcaseMode: false, ball: { inPlay: true, pos: { x: ballX, y: 1, z: 9 }, targetLanding: { x: ballX, z: 10 } } };
    const actor = { pos: { x: 0, y: 0, z: 11 }, sideSign: 1, swingType: null, natpfHand: hand, _engineRef: engine };
    rk.triggerSwing(actor, { shotType: 'topspin', side: hand === 'left' ? (ballX < 0 ? 'forehand' : 'backhand') : (ballX > 0 ? 'forehand' : 'backhand'), speed: 1.1, timing: 'sweet', dirX: 0 });
    return actor.swingType;
  };
  assert.equal(strike('right', 1.2), 'forehand'); assert.equal(strike('right', -1.2), 'backhand');
  assert.equal(strike('left', -1.2), 'forehand'); assert.equal(strike('left', 1.2), 'backhand');
});
