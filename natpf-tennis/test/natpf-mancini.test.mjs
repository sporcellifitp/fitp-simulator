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
import { MotionController } from '../src/motion_controls.js';
import { createNatpfCharacter, createNatpfRacket, finishNatpfActor, updateNatpfActorLimbs } from '../src/natpf/natpf_character.js';
import { setupArticulatedPlayerRig, updatePlayerBodyAnimation } from '../src/player_body_animation.js';
import { PlayerFacialFXController } from '../src/player_facial_fx.js';
import { upgradePlayerCharacterMaterials, upgradeRacketMaterials } from '../src/player_materials.js';

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
function compareRead(r, l, tag, { aimTol, riseTol } = {}){
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
  assert.ok(opp(a.natpf.wrist, b.natpf.wrist, aimTol ?? .08), `${tag}: mira ${a.natpf.wrist} / ${b.natpf.wrist}`);
  assert.equal(a.natpf.aimSource, b.natpf.aimSource, tag);
  // mira del gesto (polso e ampiezza, gestureAim): solo di riserva per i telefoni senza il piatto. Nei gesti senza verso
  // (verticali, dir 0) il polso del telefono non ha il segno della mano e non si specchia: innocuo, la mira vera è il piatto
  if (r.s.dir) assert.ok(opp(a.dirX, b.dirX, .06), `${tag}: dirX ${a.dirX} / ${b.dirX}`);
  assert.ok(near(a.dirY, b.dirY, .02), `${tag}: dirY ${a.dirY} / ${b.dirY}`);
  const I = a.natpf.intent, J = b.natpf.intent;
  assert.ok(I && J, `${tag}: intenzione mancante`);
  assert.equal(I.shot, J.shot, tag); assert.equal(I.byShape, J.byShape, tag);
  for (const k of ['power', 'depth', 'reach', 'rise', 'tilt', 'roll', 'shapePower']) assert.ok(near(I[k], J[k], k === 'rise' && riseTol ? riseTol : .01), `${tag}: intenzione ${k} ${I[k]} / ${J[k]}`);
  assert.ok(opp(I.plane, J.plane, .03), `${tag}: piano dell'intenzione ${I.plane} / ${J.plane}`);
  assert.ok(opp(I.face, J.face, aimTol ?? .08), `${tag}: mira del piatto ${I.face} / ${J.face}`);
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

test('schede del tutorial a specchio: il mancino legge dalla sua animazione lo stesso colpo, lato e forza del destro, mira opposta (presa nel palmo e a racchetta)', () => {
  const ids = [...CARD_IDS, 'cross', 'line'].filter(id => !['grip', 'ready'].includes(id));
  // presa a racchetta (predefinita dal 09/11, B17.1): la mira del lungolinea con la calibrazione dell'animazione è 0,81 a destra
  // e −0,91 a sinistra (specchio esatto della posa; lo scarto di 0,10 viene dal centro del piatto imparato dai tre dritti di
  // prova, che il telefono simulato legge con 1,5° di rumore): misurato, ammesso fino a 0,12 solo lì
  for (const grip of ['palmo', 'racchetta']) for (const cal of ['pose', 'arm']){
    const src = { pose: (id, t, hand) => gesturePose(id, t, { hand, grip }), plan: id => gesturePlan(id, { grip }) };
    for (const id of ids){
      // telefono fresco per scheda (come natpf-gesture-pose), con lo stesso seme per le due mani
      const tag = `${id} (${grip}, calibrazione ${cal})`;
      const r = readCard(src, id, { hand: 'right', cal }), l = readCard(src, id, { hand: 'left', cal });
      assert.equal(r.msgs.length, l.msgs.length, `${tag}: messaggi ${r.msgs.length} / ${l.msgs.length}`);
      if (id === 'serve'){
        assert.equal(r.events.length, 2, tag);
        for (let i = 0; i < 2; i++) assert.ok(near(r.events[i].peak, l.events[i].peak, 6), `${tag}: picco ${i} ${r.events[i].peak} / ${l.events[i].peak}`);
        assert.ok(near(r.gap, l.gap, .02), `${tag}: lancio→battuta ${r.gap} / ${l.gap}`);
        continue;
      }
      assert.equal(r.read.length, 1, `${tag}: ${r.read.length} colpi`);
      // (B17.1 passo B2: palla corta e schiacciata della racchetta con la calibrazione dell'animazione, salita dell'intenzione
      // −0,446 / −0,464 e −0,149 / −0,169: 0,018–0,020 di scarto dal rumore del telefono simulato, misurato; ammesso 0,025 solo lì;
      // incrociato dal dritto del video: mira del piatto −0,557 / +0,471, come il lungolinea già ammesso fino a 0,12; correzioni
      // della revisione: tagliato di dritto con la discesa lunga, salita −0,778 / −0,767, 0,011 di scarto, ammesso 0,025 anche lì)
      compareRead(r.read[0], l.read[0], tag, { aimTol: grip === 'racchetta' && ['line', 'cross'].includes(id) && cal === 'pose' ? .12 : undefined, riseTol: grip === 'racchetta' && ['drop', 'smash', 'slice'].includes(id) && cal === 'pose' ? .025 : undefined });
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

// Secondo giro della verifica (08/11): il percorso della calibrazione si ricalcolava a ogni gesto da S.options, e il
// telefono (racchetta.js applyHand: menu, «cfg» dal computer, pulsanti della mano dello stesso schermo) cambia
// options.hand a calibrazione in corso: dopo il primo gesto il percorso si girava e si chiedeva di nuovo lo stesso verso
// («direzione», calibrazione fallita). Ora il percorso è fissato all'avvio (e a «Rifai», con la mano di quel momento);
// la scritta Dritto/Rovescio segue la mano nuova, il verso dei gesti resta quello del percorso
test('calibrazione: cambio di mano a metà percorso (applyHand del telefono) → il percorso resta quello dell’avvio e la calibrazione passa', () => {
  for (const [from, to] of [['right', 'left'], ['left', 'right']]){
    const p = simPhone({ hand: from, seed: 7 }), ev = []; p.cal.on(e => ev.push(e));
    p.cal.start({ quick: true, hand: from }); p.rest(800, 0);
    const plan0 = calibrationPlan({ quick: true, hand: from });
    assert.deepEqual(p.cal.state.plan, plan0, `${from}: percorso fissato all'avvio`);
    p.swing({ axis: [0, plan0[0] === 'L' ? 1 : -1, 0] }); p.rest(500, 0);
    p.cal.state.options.hand = to;                                   // come applyHand() sul telefono
    const w = p.cal.state.plan[p.cal.state.idx];
    assert.equal(w, plan0[1], `${from}→${to}: il secondo gesto resta quello del percorso`);
    p.swing({ axis: [0, w === 'L' ? 1 : -1, 0] }); p.rest(500, 0);
    assert.equal(p.cal.state.step, 'review', `${from}→${to}`);
    assert.equal(p.cal.state.result?.pass, true, `${from}→${to}: ${JSON.stringify(p.cal.state.result)}`);
    assert.equal(p.cal.state.options.hand, to, 'la mano nuova resta nel profilo');
    assert.deepEqual(ev.filter(e => e.kind === 'next').map(e => e.want), [plan0[1]]);
    // «Rifai» riparte con il percorso della mano di adesso (prima il suo dritto)
    p.cal.retry();
    assert.deepEqual(p.cal.state.plan, calibrationPlan({ quick: true, hand: to }), `${to}: «Rifai» con la mano nuova`);
  }
});

// 1v1 tra due computer (secondo giro, punto 3): la mano del P2 viaggia con la lettura dello stato, appena è nota (prima
// solo con il primo colpo). Le altre prove del 1v1 sono in natpf-mancini-mondo.test.mjs
test('1v1, computer del P2: la lettura dello stato porta la sua mano (l’host no: la sua va nello snapshot)', async () => {
  const realFetch = globalThis.fetch;
  // prima lettura di un controller del ruolo e della mano dati (poi si ferma subito)
  const firstPoll = async (role, hand) => {
    const urls = [];
    globalThis.fetch = async url => { urls.push(String(url)); return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
    const mc = Object.create(MotionController.prototype);
    Object.assign(mc, { role, roomId: 'AT-AB12', phonePollIntervalMs: 5, phoneState: { connected: false, orientation: {} }, p2PhoneState: { connected: false }, _listeners: { swing: [] }, ...(role === 'p2' ? { versusReady: true } : {}), handPreference: hand });
    mc._notifyStatus = () => {}; mc._updatePhoneBadgeUI = () => {};
    try { mc.startPhonePolling(); await new Promise(r => setTimeout(r, 40)); }
    finally { mc.stopPhonePolling(); mc._disposed = true; }
    return urls[0] || '';
  };
  try {
    for (const hand of ['left', 'right']) assert.match(await firstPoll('p2', hand), new RegExp(`touch=p2&ready=1.*&hand=${hand}`), hand);
    assert.doesNotMatch(await firstPoll('p1', 'left'), /hand=/);
  } finally { globalThis.fetch = realFetch; }
});

/* ---------- personaggio intero a specchio (secondo giro, punto 4 e ricerca) ---------- */
// Personaggio montato come in natpf-character.test.mjs (game_engine._preparePlayerActor); il mancino specchiato come fa
// NatpfHand.apply (root.scale.x = −1, natpfHand 'left')
const PART_RE = { head: /^head(\.?0*\d+)?$/i, torso: /^torso(\.?0*\d+)?$/i, handL: /^hand_l(\.?0*\d+)?$/i, handR: /^hand_r(\.?0*\d+)?$/i, footL: /^foot_l(\.?0*\d+)?$/i, footR: /^foot_r(\.?0*\d+)?$/i };
function mountActor(hand, x0, sideSign = 1){
  const scene = new THREE.Scene();
  const actor = { role: sideSign > 0 ? 'player' : 'opponent', sideSign, root: new THREE.Group(), model: null, parts: {}, racketPivot: new THREE.Group(), pos: new THREE.Vector3(x0, 0, sideSign*11.89),
    vel: new THREE.Vector3(), targetPos: new THREE.Vector3(), stridePhase: 0, swingTimer: 0, swingDuration: .34, swingType: 'forehand', maxSpeed: 9 };
  const model = createNatpfCharacter(sideSign > 0 ? 'p1' : 'p2'); actor.model = model;
  model.traverse(s => { s.userData.basePos = s.position.clone(); s.userData.baseRot = s.rotation.clone(); const n = (s.name || '').trim();
    for (const [k, re] of Object.entries(PART_RE)) if (re.test(n) && (!actor.parts[k] || !s.isMesh)){ actor.parts[k] = s; break; } });
  model.scale.setScalar(1.16); actor.root.add(model);
  upgradePlayerCharacterMaterials(actor, sideSign > 0 ? 'p1' : 'p2');
  new PlayerFacialFXController(scene).attachFacialRig(actor);
  setupArticulatedPlayerRig(actor);
  const racket = createNatpfRacket(); upgradeRacketMaterials(racket); racket.scale.setScalar(1.22);
  actor.racketMesh = racket; actor.racketPivot.position.set(-.36, .9, .16); actor.racketPivot.add(racket); actor.root.add(actor.racketPivot);
  actor.root.rotation.y = sideSign > 0 ? Math.PI : 0; actor.root.position.copy(actor.pos); scene.add(actor.root);
  if (hand === 'left'){ actor.root.scale.x = -1; actor.natpfHand = 'left'; }
  const rk = new RacketKinematicsController(); rk.initActor(actor); finishNatpfActor(actor);
  return { actor, scene, rk };
}
// stessa scena per il destro e, riflessa (x → −x), per il mancino: palla, corsa, colpo e comandi (mouse, inclinazione del
// telefono, mano vista dalla webcam). Ritorna lo scarto più grande tra ogni parte del mancino e lo specchio della stessa
// parte del destro, e i lati della carica del corpo
function mirrorRun(scn, sideSign = 1){
  const A = mountActor('right', scn.x0 || 0, sideSign), B = mountActor('left', -(scn.x0 || 0), sideSign);
  const balls = [A, B].map(() => ({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), inPlay: true, lastHitter: sideSign > 0 ? 'opponent' : 'player', targetLanding: { x: 0, z: 10 } }));
  let worst = { d: 0 }; const coiled = [];
  for (let f = 0; f < scn.frames; f++){
    const t = f/60;
    [[A, balls[0], 1], [B, balls[1], -1]].forEach(([W, ball, s]) => {
      const b = scn.ball?.(t);
      if (b){ ball.pos.set(s*b.x, b.y, sideSign*b.z); ball.vel.set(0, 0, sideSign*b.vz); ball.targetLanding = { x: s*b.x, z: sideSign*10 }; }
      const v = scn.vel?.(t) || 0, vz = scn.velz?.(t) || 0; W.actor.vel.set(s*v, 0, vz); W.actor.pos.x += s*v/60; W.actor.pos.z += vz/60; W.actor.root.position.copy(W.actor.pos);
      if (scn.swingAt === f) W.rk.triggerSwing(W.actor, { shotType: 'topspin', side: scn.side, speed: 1.1, timing: 'sweet', dirX: 0 });
      const li = scn.input?.(t);
      const ctx = { phase: 'RALLY', score: { server: 'player' }, ball: b ? ball : null, elapsedTime: t, ...(li ? { liveInput: { tiltPitch: li.pitch, tiltRoll: s*li.roll, tiltYaw: s*li.yaw, mouseVelX: s*li.mx, mouseVelY: li.my, handOffsetX: s*li.hx, handOffsetY: li.hy } } : {}) };
      W.rk.update(W.actor, 1/60, ctx); updatePlayerBodyAnimation(W.actor, 1/60, ctx); updateNatpfActorLimbs(W.actor);
      W.scene.updateMatrixWorld(true);
    });
    coiled.push([A.actor.rig.coiledSide, B.actor.rig.coiledSide]);
    const na = {}, nb = {};
    A.scene.traverse(o => { if (o.name) na[o.name] = o.getWorldPosition(new THREE.Vector3()); });
    B.scene.traverse(o => { if (o.name) nb[o.name] = o.getWorldPosition(new THREE.Vector3()); });
    for (const k of Object.keys(na)) if (nb[k]){ const d = Math.hypot(na[k].x + nb[k].x, na[k].y - nb[k].y, na[k].z - nb[k].z); if (d > worst.d) worst = { d, k, f }; }
  }
  return { worst, coiled };
}

// Punto 4 della verifica: player_body_animation (de) sceglieva il lato della carica dalla palla con la regola del destro
// quando la racchetta animata non caricava ancora (palla oltre anticipationRangeMeters): il mancino cominciava a
// caricare dal lato sbagliato. Ricerca dello stesso giro: con il personaggio specchiato (root.scale.x < 0) le rotazioni
// calcolate da direzioni del campo si vedevano rovesciate: testa verso il punto riflesso della palla, inclinazione nella
// corsa laterale e polso dalla parte opposta (corsa: 0,8 m sulla mano), mouse, telefono e mano della webcam rovesciati.
// Ora ogni parte del mancino è lo specchio della stessa parte del destro (1 mm), Player 1 e Player 2
test('personaggio intero a specchio: carica dalla palla lontana, corsa, testa, colpi e comandi del mancino = specchio del destro', () => {
  const SC = {
    'palla lontana di lato (oltre la carica della racchetta)': { frames: 60, ball: t => ({ x: 4.4, y: 1, z: 11.89 - 7.6 + t*.2, vz: 2 }) },
    'palla che arriva sul dritto': { frames: 60, ball: t => ({ x: 1.2, y: 1, z: 11.89 - 6 + t*4, vz: 4 }) },
    'palla in mezzo': { frames: 60, ball: t => ({ x: .1, y: 1, z: 11.89 - 6 + t*4, vz: 4 }) },
    'corsa laterale': { x0: .4, frames: 90, vel: t => 3*Math.sin(t*3) },
    // verifica del secondo giro: lo specchio valeva anche per la velocità in avanti (polso a 87–149 mm dallo specchio)
    'verso rete e frenata': { frames: 70, velz: t => (t < .6 ? -5 : 0) },
    'avanti e indietro': { frames: 90, velz: t => -3*Math.sin(t*3) },
    'dritto': { frames: 40, swingAt: 2, side: 'forehand', ball: () => ({ x: 1, y: 1, z: 11, vz: 4 }) },
    'rovescio': { frames: 40, swingAt: 2, side: 'backhand', ball: () => ({ x: -1, y: 1, z: 11, vz: 4 }) },
    'mouse, telefono e webcam': { frames: 60, input: t => ({ pitch: .2*Math.sin(t*5), roll: .4*Math.sin(t*4), yaw: .5*Math.cos(t*3), mx: 3*Math.sin(t*6), my: 1, hx: .2*Math.sin(t*2), hy: .05 }) },
  };
  for (const sideSign of [1, -1]) for (const [name, scn] of Object.entries(SC)){
    const r = mirrorRun(scn, sideSign);
    assert.ok(r.worst.d < 1e-3, `${sideSign > 0 ? 'P1' : 'P2'}, ${name}: ${r.worst.k} a ${r.worst.d.toFixed(3)} m dallo specchio (fotogramma ${r.worst.f})`);
    assert.ok(r.coiled.every(([a, b]) => a === b), `${sideSign > 0 ? 'P1' : 'P2'}, ${name}: lato della carica ${JSON.stringify(r.coiled.find(([a, b]) => a !== b))}`);
  }
});

// Punto 6 (cosmetico): la scelta della mano si chiama allo stesso modo ovunque («Destra»/«Sinistra»). Il riquadro
// «Racchetta, Visuale, Mano» (data-natpf-setup, pannello del Player 2) diceva «Mancino», il resto del gioco «Sinistra»
test('scelta della mano: «Destra» e «Sinistra» in ogni pannello (lobby, P2, stesso schermo, lezione, telefono)', async () => {
  const fs = await import('node:fs');
  const read = rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
  const sources = { 'index.html': read('../index.html'), 'natpf_ui.js': read('../src/natpf/natpf_ui.js'), 'racchetta.html': read('../../site/tennis/racchetta.html') };
  const labels = [];
  for (const [name, src] of Object.entries(sources)){
    for (const m of src.matchAll(/data-(?:natpf-hand|split-hand|lesson)="(?:p[12]:)?(left|right)"[^>]*>([^<]*)</g)) labels.push([name, m[1], m[2].trim()]);
    for (const m of src.matchAll(/<option value="(left|right)">([^<]*)</g)) labels.push([name, m[1], m[2].trim()]);
  }
  assert.ok(labels.filter(l => l[1] === 'left').length >= 6, JSON.stringify(labels));
  for (const [name, hand, text] of labels) assert.equal(text, hand === 'left' ? 'Sinistra' : 'Destra', `${name}: ${hand} → «${text}»`);
});

// Ricerca del secondo giro: game_engine (_attemptPlayerRallyStrike e _attemptOpponentRallyStrike) sceglieva il lato di
// un colpo senza «side» (mouse, webcam di prima, prove) dalla palla con la regola del destro. Oggi il telefono, la
// webcam e il mouse del P1 lo mandano sempre (NatpfHand.leftySide), ma un evento senza lato con la mano sinistra ora
// è letto da mancino: palla alla sua sinistra = dritto. Per il destro (e per i compagni CPU del doppio) non cambia
test('motore: colpo senza lato (mouse, prove) → il lato dalla palla segue la mano di chi gioca (P1 e P2)', () => {
  const plain = hand => ({ source: 'mouse', speed: 1.2, shotType: 'topspin', dirX: 0, hand });
  for (const hand of ['right', 'left']){
    const m = sgn(hand);
    // P1: palla alla sua destra (destro) / sinistra (mancino) → dritto; dall'altra parte → rovescio
    for (const [want, bx] of [['forehand', 1.6], ['backhand', -1.6]]){
      const r = withEngine('casual', e => { cpuShot(e, { to: [bx*m, 8.5], player: [.2*m, 11.7] }); play(e, [{ lead: .08, swing: plain(hand) }]); return { hit: e.ball.lastHitter === 'player', side: e.player.swingType, contact: e.natpfLastRacket?.contact }; });
      assert.ok(r.hit, `P1 ${hand} ${want}: non colpito`);
      assert.equal(r.side, want, `P1 ${hand}: palla a x ${bx*m}`);
    }
    // P2 del 1v1 (la sua destra è −x)
    for (const [want, bx] of [['forehand', -1.6], ['backhand', 1.4]]){
      const r = withEngine('1v1', e => { p1Shot(e, { from: [.5*m, 1, 11], to: [bx*m, -8.5], flight: 1.05, p2: [(want === 'forehand' ? -.4 : .3)*m, -11.7], hand }); return { ...playP2(e, { ...plain(hand) }, { gap: 1.7 }), side: e.opponent.swingType }; });
      assert.ok(r.hit, `P2 ${hand} ${want}: non colpito`);
      assert.equal(r.side, want, `P2 ${hand}: palla a x ${bx*m}`);
    }
  }
});
