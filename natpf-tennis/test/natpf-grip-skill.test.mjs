// Presa orizzontale «il telefono è il piatto» (angolo del piatto → colpo) e skill gap del motore.
// node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFaceTracker, aimFromFace, faceReference, flatGrip, FACE } from '@natpf/tennis/face-tracker.js';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { createCalibration } from '@natpf/tennis/calibration.js';
import { natpfSwingToEngine, racketTiltFromFace, faceShot, NatpfPhoneRacket, normalizeGrip } from '../src/natpf/natpf_phone_racket.js';
import { GRIP_CHOICES, gripChoice } from '../src/natpf/natpf_tiles.js';
import * as NS from '../src/natpf/natpf_skill.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { simulate } from '../scripts/audit/rally-balance.mjs';

const G = 9.81, LAND = [G, 0, 0];          // telefono in orizzontale, display verso chi gioca: gravità lungo il lato corto
const feedFor = (tr, { ms, rot = [0, 0, 0], accG = LAND, t0 = 0 }) => { let t = t0; for (; t < t0 + ms; t += 10) tr.feed({ t, rot, acc: [0, 0, 0], accG }); return t; };

/* ---------- presa orizzontale: orientamento del piatto ---------- */
test('piatto: girare il telefono attorno alla verticale cambia l’imbardata, il segno dice sinistra/destra', () => {
  const tr = createFaceTracker({ relax: 1e9 });
  assert.ok(tr.setRest(LAND));
  let t = feedFor(tr, { ms: 200 });
  assert.ok(Math.abs(tr.face.yaw) < .5 && Math.abs(tr.face.pitch) < .5, JSON.stringify(tr.face));
  t = feedFor(tr, { ms: 500, rot: [0, -60, 0], t0: t });                 // beta < 0: piatto verso destra
  assert.ok(tr.face.yaw > 25 && tr.face.yaw < 35, `destra ${tr.face.yaw}`);
  t = feedFor(tr, { ms: 1000, rot: [0, 60, 0], t0: t });                 // e poi oltre il centro, verso sinistra
  assert.ok(tr.face.yaw < -25 && tr.face.yaw > -35, `sinistra ${tr.face.yaw}`);
  assert.ok(Math.abs(tr.face.pitch) < 3, 'girare a destra/sinistra non apre il piatto');
});

test('piatto: aprirlo verso l’alto alza il beccheggio; la gravità corregge l’inclinazione stimata', () => {
  const tr = createFaceTracker({ relax: 1e9 });
  tr.setRest(LAND);
  for (let t = 0; t < 500; t += 10) tr.feed({ t, rot: [0, 0, -40], acc: null, accG: null });   // gamma < 0: dorso verso l’alto
  assert.ok(tr.face.pitch > 16 && tr.face.pitch < 24, `aperto ${tr.face.pitch}`);
  // fermo, con la gravità di un piatto aperto di 30°: la stima va verso 30°
  const a = 30*Math.PI/180, tilted = [G*Math.cos(a), 0, -G*Math.sin(a)];
  feedFor(tr, { ms: 3000, accG: tilted, t0: 600 });
  assert.ok(Math.abs(tr.face.pitch - 30) < 3, `corretto ${tr.face.pitch}`);
});

test('piatto: da fermo la posa «pronto» assorbe la deriva dell’imbardata; si legge il piatto all’istante del picco', () => {
  const tr = createFaceTracker();
  tr.setRest(LAND);
  let t = feedFor(tr, { ms: 300, rot: [0, -60, 0] });                    // girato a destra di ~18°
  const atTurn = t - 10;
  t = feedFor(tr, { ms: 4000, t0: t });                                  // poi fermo: la posa «pronto» lo segue
  assert.ok(Math.abs(tr.face.yaw) < 3, `assorbita ${tr.face.yaw}`);
  assert.ok(tr.faceAt(t - 10).yaw < 3);
  assert.equal(flatGrip(LAND), true); assert.equal(flatGrip([0, G, 0]), false);
  void atTurn;
});

test('mira dal piatto: si toglie il piatto abituale del proprio gesto dritto (calibrazione), scalato con l’ampiezza', () => {
  const ref = faceReference([{ dir: 1, yaw: -10, pitch: 2, angle: 40 }, { dir: 1, yaw: -14, pitch: 4, angle: 44 }, { dir: -1, yaw: 12, pitch: 0, angle: 40 }]);
  assert.deepEqual(Object.keys(ref).sort(), ['-1', '1']);
  const straight = aimFromFace({ yaw: -14, pitch: 4 }, ref, { dir: 1, angle: 44 });
  assert.ok(Math.abs(straight.yaw) < 1.5 && Math.abs(straight.aim) < .06, JSON.stringify(straight));
  const right = aimFromFace({ yaw: 15, pitch: 4 }, ref, { dir: 1, angle: 44 });
  assert.ok(right.aim > .8, 'piatto girato a destra rispetto al solito → mira a destra');
  assert.equal(aimFromFace({ yaw: 90, pitch: 0 }, null).aim, 1);
  assert.equal(aimFromFace(null, ref), null);
  assert.ok(FACE.aimYaw > 0);
});

test('calibrazione con la presa orizzontale: 2 s fermi, quattro gesti, piatto abituale nel profilo; la verticale resta com’era', () => {
  const det = createSwingDetector();
  const tr = createFaceTracker();
  det.on('swing', s => { if (tr.ready) s.face = tr.faceAt(s.peakT); });
  det.on('status', s => { if (s.s === 'still-ok') tr.setRest(s.gravity, det.profile.bias); });
  const cal = createCalibration(det);
  const events = [];
  cal.on(e => events.push(e));
  let t = 0;
  const sample = (rot, accG = LAND) => { const k = { t, rot, acc: [0, 0, 0], accG }; tr.feed(k); det.feed(k); cal.tick(t, k); t += 10; };
  cal.start({ grip: 'flat', quick: true, gestural: true });
  assert.equal(det.config.stillTime, 2000);
  for (let i = 0; i < 150; i++) sample([0, 0, 0]);
  assert.equal(cal.state.step, 'still', 'dopo 1,5 s si è ancora fermi');
  for (let i = 0; i < 60; i++) sample([0, 0, 0]);
  assert.equal(cal.state.step, 'swings');
  assert.equal(events.find(e => e.kind === 'step' && e.grip === 'flat')?.flat, true);
  for (const want of ['L', 'R', 'L', 'R']){
    const sign = want === 'L' ? 1 : -1;
    for (let i = 0; i <= 22; i++) sample([0, sign*700*Math.sin(Math.PI*i/22)**2, 0]);
    for (let i = 0; i < 60; i++) sample([0, 0, 0]);
  }
  assert.equal(cal.state.step, 'review', JSON.stringify(cal.state.result));
  assert.equal(cal.state.result.pass, true);
  assert.equal(cal.state.profile.grip, 'flat');
  assert.ok(cal.state.profile.faceRef?.[1] && cal.state.profile.faceRef?.[-1], JSON.stringify(cal.state.profile.faceRef));
  // presa verticale (predefinita di NATPF Simulator): tempo da fermo di sempre, niente presa nel profilo
  cal.start({ quick: true });
  assert.equal(det.config.stillTime, 600);
  assert.equal(cal.state.options.grip, undefined);
});

/* ---------- ponte: angolo del piatto → colpo del motore base ---------- */
test('presa orizzontale: il piatto girato a sinistra/destra dà la direzione, aperto lob o palla corta, il gesto lo spin', () => {
  const sw = (face, extra = {}) => natpfSwingToEngine({ dir: 1, power: .75, lift: 0, grip: 'flat', face: { roll: 0, ...face }, ...extra }, { grip: 'flat' });
  const right = sw({ yaw: 24, pitch: 0, aim: .8 }), left = sw({ yaw: -24, pitch: 0, aim: -.8 });
  assert.ok(right.dirX > .6 && left.dirX < -.6, `${right.dirX} ${left.dirX}`);
  assert.equal(right.natpf.aim, 'face'); assert.equal(right.shotType, 'topspin');
  // la direzione viene dal piatto anche con un gesto da destra a sinistra (dritto di un destro)
  assert.ok(sw({ yaw: 20, pitch: 0, aim: .67 }, { dir: 1, aim: -.7 }).dirX > .4);
  const lob = sw({ yaw: 0, pitch: 25, aim: 0 }), drop = sw({ yaw: 0, pitch: 25, aim: 0 }, { power: .4 });
  assert.equal(lob.shotType, 'lob'); assert.ok(lob.dirY < -.5);
  assert.equal(drop.natpf.shot, 'drop'); assert.equal(drop.shotType, 'slice'); assert.ok(drop.speed <= .9);
  assert.equal(sw({ yaw: 0, pitch: 0, aim: 0 }, { lift: -.5 }).shotType, 'slice');                 // tagliato dall’alto
  const cover = sw({ yaw: 0, pitch: -15, aim: 0 }, { lift: .5 });                                   // chiuso e dal basso verso l’alto
  assert.equal(cover.shotType, 'topspin'); assert.ok(cover.dirY < -.4);
  assert.ok(sw({ yaw: 0, pitch: 0, aim: 0 }, { power: 1 }).speed > sw({ yaw: 0, pitch: 0, aim: 0 }, { power: .35 }).speed);
  assert.equal(faceShot({ face: { pitch: 30 }, power: .9 }), 'lob');
  // senza dati del piatto (o presa verticale) il colpo resta quello di NATPF
  const upright = natpfSwingToEngine({ dir: 1, power: .3 });
  assert.equal(upright.natpf, undefined); assert.equal(upright.side, 'forehand');
  assert.deepEqual(natpfSwingToEngine({ dir: 1, drop: true }).natpf, { shot: 'drop' });
});

test('racchetta in gioco: segue il piatto del telefono', () => {
  const t = racketTiltFromFace({ yaw: 30, pitch: 20, roll: 10 });
  assert.deepEqual(t, { pitch: 5, roll: 20, yaw: 30 });
  assert.equal(racketTiltFromFace(null), null);
  assert.equal(racketTiltFromFace({ yaw: 200, pitch: 0 }).yaw, 50);
});

test('presa scelta nel gioco: predefinita «piatto», va al telefono appena è collegato', () => {
  const sent = [];
  const phone = new NatpfPhoneRacket({ playerRole: 'p1' });
  assert.equal(phone.grip, 'flat');
  phone.link = { connected: true, send: m => sent.push(m) };
  phone._sendGrip(); phone._sendGrip();
  phone.setGrip('upright');
  assert.deepEqual(sent, [{ t: 'grip', g: 'flat' }, { t: 'grip', g: 'upright' }]);
  assert.equal(normalizeGrip('x'), 'flat');
  assert.deepEqual(GRIP_CHOICES.map(g => g.id), ['flat', 'upright']);
  assert.match(gripChoice(), /Orizzontale · piatto/); assert.match(gripChoice(), /Verticale · manico/);
});

/* ---------- skill gap ---------- */
test('skill gap: l’attesa dello sweet spot è breve e graduata, e «perfetto» solo con poco anticipo', () => {
  const casual = NS.skillLevel('casual'), pro = NS.skillLevel('pro');
  assert.ok(casual.assistWindow < .48 && pro.assistWindow < casual.assistWindow);
  assert.equal(NS.assistGrade(.05, casual).grade, 'PERFECT');
  assert.equal(NS.assistGrade(.12, pro).grade, 'EARLY');
  assert.ok(NS.assistGrade(.25, casual).quality < NS.assistGrade(.05, casual).quality);
  assert.ok(Math.abs(NS.leadToSweetSpot(-2.1, 10) - .2) < 1e-9);
  assert.equal(NS.skillLevel('sconosciuto'), casual);
});

test('skill gap: la mira decide la direzione; col piatto il tempo pesa meno; rischio con potenza vicino alle righe', () => {
  const lv = NS.skillLevel('casual'), rng = () => .5;
  const aim = v => NS.playerLandingX({ grade: 'PERFECT', aim: v, quality: 1, power: .5, level: lv, rng });
  assert.ok(aim(.9) > 2.5 && aim(-.9) < -2.5);
  const early = mode => NS.playerLandingX({ grade: 'EARLY', aim: .9, aimMode: mode, side: 1, quality: .45, power: .5, level: lv, rng });
  assert.ok(early('face') > 1.5, 'col piatto a destra la palla va a destra anche in anticipo');
  assert.ok(early(null) < early('face'));
  const risk = (p, x, q = 1) => NS.playerErrorChance({ power: p, aimX: x, quality: q, level: lv });
  assert.ok(risk(1, 3.6) > risk(.3, 3.6) && risk(1, 3.6) > risk(1, .5) && risk(.5, 1, .3) > risk(.5, 1, 1));
  assert.ok(risk(1, 3.6) < .2, 'il colpo forte e angolato resta conveniente');
  const plan = NS.playerErrorPlan({ power: 1, aimX: 3.6, quality: .2, level: lv, rng: () => 0 });
  assert.notEqual(plan.kind, 'ok');
  assert.ok(Math.abs(plan.x) > NS.COURT.OUT_X || Math.abs(plan.z) > NS.COURT.OUT_Z);
  assert.ok(NS.streakFlight(.8, 4, lv) < NS.streakFlight(.8, 1, lv));
  const h = NS.minClearFlight({ fromY: .8, fromZ: 12, toZ: -10, flight: .35, topspin: 21 });
  assert.ok(h > .35, 'un colpo troppo teso viene rallentato quanto basta per passare la rete');
});

test('skill gap: gli errori della CPU crescono con angolo, velocità, pressione e allungo; in Pro meno che in Casual', () => {
  const c = NS.skillLevel('casual'), p = NS.skillLevel('pro');
  const e = (o, lv = c) => NS.cpuErrorChance({ angle: .2, speed: 18, pressure: 0, stretch: .2, rally: 3, quality: 1, level: lv, ...o });
  assert.ok(e({ angle: .9 }) > e({}) && e({ speed: 30 }) > e({}) && e({ pressure: 2 }) > e({}) && e({ stretch: 1 }) > e({}));
  assert.ok(e({ rally: 20 }) > e({}), 'gli scambi lunghi finiscono');
  assert.ok(e({ angle: .9, quality: .3 }) < e({ angle: .9 }), 'un angolo fuori tempo mette meno in difficoltà');
  assert.ok(e({ shot: 'DROP', cpuDeep: true }) > e({}) && e({ shot: 'SMASH' }) > e({}));
  assert.ok(e({ angle: .8, speed: 28 }, p) < e({ angle: .8, speed: 28 }, c));
});

test('motore: lo swing troppo anticipato non viene più aspettato a lungo (Pro), in Casual sì', () => {
  const run = difficulty => {
    const realRandom = Math.random; Math.random = mulberry32(5);
    try {
      const e = createHeadlessEngine({ difficulty });
      e.startNewMatch({ showStartBanner: false });
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent';
      e.player.pos.set(1, 0, 11.4); e.player.targetPos.copy(e.player.pos);
      e.ball.pos.set(1.2, 1.0, 8.4); e.ball.vel.set(0, 0, 10);         // 0,29 s allo sweet spot
      e._handleUserSwingInput({ source: 'test', speed: 1.2, dirX: .5 });
      for (let i = 0; i < 40 && e.ball.lastHitter === 'opponent'; i++){ e.ball.vel.y = 0; e.step(1/120); }
      return e.ball.lastHitter;
    } finally { Math.random = realRandom; }
  };
  assert.equal(run('casual'), 'player');
  assert.equal(run('pro'), 'opponent');
});

test('motore: col piatto girato a destra/sinistra la palla va a destra/sinistra', () => {
  for (const [dirX, sign] of [[.85, 1], [-.85, -1]]){
    const realRandom = Math.random; Math.random = mulberry32(9);
    try {
      const e = createHeadlessEngine({ difficulty: 'casual' });
      e.startNewMatch({ showStartBanner: false });
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent';
      e.player.pos.set(0, 0, 11.4); e.ball.pos.set(.3, 1.0, 11.0); e.ball.vel.set(0, 0, 14);
      assert.ok(e._attemptPlayerRallyStrike({ speed: 1.2, dirX, natpf: { aim: 'face' } }));
      assert.equal(Math.sign(e.ball.targetLanding.x), sign, `${dirX} → ${e.ball.targetLanding.x}`);
    } finally { Math.random = realRandom; }
  }
});

test('audit: nessuno scambio infinito, il giocatore preciso batte la CPU Casual e vince più dell’impreciso', () => {
  const precise = simulate({ profile: 'preciso', difficulty: 'casual', points: 60, seed: 3 });
  const sloppy = simulate({ profile: 'impreciso', difficulty: 'casual', points: 60, seed: 3 });
  assert.equal(precise.capped, 0); assert.equal(sloppy.capped, 0);
  assert.ok(precise.winPct > 70, `preciso ${precise.winPct}%`);
  assert.ok(precise.winPct > sloppy.winPct);
  assert.ok(precise.avgHits >= 3 && precise.avgHits <= 10, `colpi per punto ${precise.avgHits}`);
});
