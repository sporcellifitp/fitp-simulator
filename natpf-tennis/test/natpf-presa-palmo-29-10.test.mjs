// Segnalazione del 29/10 pomeriggio (diagnostica 131307, stesso schermo, con la foto della presa di riferimento):
//   1. «la pallina finisce quasi sempre al centro, indipendentemente dal movimento»;
//   2. presa di riferimento: base del telefono nel palmo, cima in avanti, schermo verso l'alto (non più in piedi nel pugno);
//   3. schiacciata e pallonetto che non riescono;
//   4. vicino alla rete il colpo finisce in rete, niente colpi potenti o angolati.
// Cause trovate e corrette (WORK_PROGRESS, «Diagnostica 131307»): direzione del piatto letta dal dorso del telefono (con il
// dorso verso il basso girava con il polso), piatto al 60%; riferimento del colpo normale solo dalla calibrazione (in partita
// il rovescio scendeva: tagliati); soglie del pallonetto assolute; schiacciata da 1,75 m; palla corta presa in salita a
// 0,5 m e ogni colpo 34 cm sopra il nastro; tempo in secondi anche sulle palle lente.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { armSwing, STROKES } from './arm-sim.mjs';
import { simPhone } from './phone-sim.mjs';
import { createFaceTracker } from '@natpf/tennis/face-tracker.js';
import { GESTURES, strokeFor, mirrorStroke } from '../src/natpf/natpf_gesture_motion.js';
import { classifyStroke } from '../src/natpf/natpf_stroke_intent.js';
import { strokeOutcome, smashAt, slowFactor, OUTCOME, SMASH_FROM } from '../src/natpf/natpf_stroke_outcome.js';
import { createRiseModel, habitualRise, RISE_LEARN } from '../src/natpf/natpf_phone_racket.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';

const D = Math.PI/180, DT = 1/120, SIDE = 4.115;

// presa di riferimento: dallo schermo verso chi gioca, la cima in avanti di tilt gradi (schermo in alto e indietro),
// poi un rollio attorno all'asse lungo (la foto: schermo un poco girato)
function palm(p, { tilt = 65, roll = 0 } = {}){
  p.pose([1, 0, 0], -tilt);
  if (roll){ const t = tilt*D; p.pose([0, Math.cos(t), -Math.sin(t)], roll); }
  p.rest(500, 4);
}
function player(hand, o = {}){
  const p = simPhone({ seed: 7, shape: true, hand });
  palm(p, o);
  const cal = w => hand === 'left' ? mirrorStroke(w === 'L' ? STROKES.rovescio : STROKES.dritto) : (w === 'L' ? STROKES.dritto : STROKES.rovescio);
  p.calibrate({ armGesture: w => armSwing(p, cal(w)) });
  return p;
}
function play(p, g, hand){
  if (g.preYaw) p.pose([0, 1, 0], hand === 'left' ? -g.preYaw : g.preYaw, 60), p.rest(200, 2);
  const b = p.msgs.length;
  armSwing(p, { ...strokeFor(g.stroke, hand), back: !g.short });
  p.rest(900, 4);
  const out = p.msgs.slice(b).map(d => p.game(d, { ballHigh: !!g.ballHigh }));
  if (g.preYaw) p.pose([0, 1, 0], hand === 'left' ? g.preYaw : -g.preYaw, 60), p.rest(300, 2);
  return out;
}
const SHOTS = ['forehand', 'backhand', 'flat', 'volley', 'lob', 'drop', 'slice', 'smash', 'cross', 'line'];

test('presa nel palmo (cima in avanti 50–80°, schermo in alto, rollio ±25°): ogni gesto del tutorial è il colpo mostrato, destro e mancino', () => {
  for (const hand of ['right', 'left']) for (const tilt of [50, 65, 80]) for (const roll of [-25, 25]) for (const id of SHOTS){
    const g = GESTURES[id], p = player(hand, { tilt, roll });
    if (g.expect.aim) for (let i = 0; i < 3; i++) play(p, GESTURES.forehand, hand);
    const out = play(p, g, hand), tag = `${hand}, presa ${tilt}° rollio ${roll}°, ${g.label}`;
    assert.equal(out.length, 1, `${tag}: ${out.length} colpi`);
    const ev = out[0].ev;
    assert.ok(g.expect.shot.includes(ev.natpf.shot), `${tag}: riconosciuto «${ev.natpf.shot}»`);
    if (g.expect.side) assert.equal(ev.side ?? ev.natpf.side, g.expect.side, `${tag}: lato`);
    if (g.expect.aim){ const want = g.expect.aim*(hand === 'left' ? -1 : 1); assert.ok(ev.natpf.wrist*want > .4, `${tag}: mira ${ev.natpf.wrist}`); }
  }
});

test('direzione del piatto con la presa nel palmo: il polso che ruota sul manico la cambia poco, il colpo girato sì', () => {
  // filtro d'orientamento da solo: telefono fermo nella presa, poi (a) 40° di rotazione attorno all'asse lungo (polso che
  // prona), (b) 20° attorno alla verticale. Imbardata letta dalla rotazione attorno alla verticale (scomposizione
  // swing-twist), non dalla normale del dorso, che con il dorso verso il basso girava con il polso
  const tilt = 65*D, up = [0, Math.cos(tilt), Math.sin(tilt)];   // alto nel riferimento del telefono (cima in avanti)
  const run = turns => {
    const f = createFaceTracker({ quietHold: 1e9 }); f.setRest(up.map(v => v*9.81));
    let t = 0; const feed = (w, ms) => { for (const end = t + ms; t < end; t += 1000/60) f.feed({ t, rot: [w[2], w[0], w[1]] }); };
    feed([0, 0, 0], 200);
    for (const [axis, deg] of turns){ const n = Math.hypot(...axis), ms = 200; feed(axis.map(a => a/n*deg/(ms/1000)), ms); }
    feed([0, 0, 0], 100);
    return f.face.yaw;
  };
  // asse lungo del telefono nel suo riferimento: y; verticale: up
  // con il telefono inclinato di 65° una parte del rollio cade per forza attorno alla verticale (cos 65° ≈ 0,42): la
  // normale del dorso dava 63°, la rotazione attorno alla verticale 17,5°
  const roll = run([[[0, 1, 0], 40]]), turn = run([[up, 20]]);
  assert.ok(Math.abs(roll) < 20, `rollio di 40° sul manico: imbardata ${roll}`);
  assert.ok(Math.abs(Math.abs(turn) - 20) < 2, `20° attorno alla verticale: imbardata ${turn}`);
});

test('colpo normale imparato giocando: i colpi che scendono di chi gioca diventano il suo top spin; tagliato, pallonetto e palla corta voluti restano', () => {
  const p = player('right');
  const hit = st => { const b = p.msgs.length; armSwing(p, st); p.rest(900, 4); return p.msgs.slice(b).map(d => p.game(d))[0].ev.natpf; };
  const chop = { ...STROKES.dritto, axis: [-.18, 1, -.6] };   // dritto che scende (salita ≈ −0,47)
  const first = hit(chop);
  assert.equal(first.shot, 'slice', 'all\'inizio, rispetto alla calibrazione, è un tagliato');
  let last;
  for (let i = 0; i < RISE_LEARN.verified + 1; i++) last = hit(chop);
  assert.equal(last.shot, 'topspin', `dopo ${RISE_LEARN.verified} colpi è il colpo normale: ${JSON.stringify(last.intent)}`);
  assert.equal(hit({ ...STROKES.dritto, axis: [-.18, 1, -1.6] }).shot, 'slice', 'tagliato voluto (scende molto di più)');
  assert.equal(hit(STROKES.pallonetto).shot, 'lob');
  assert.equal(hit({ ...STROKES.pallonetto, axis: [1, .9, 0] }).shot, 'lob', 'pallonetto con lo swing inclinato');
  assert.equal(hit(STROKES.cortaR).shot, 'drop');
  // modello: con la calibrazione vale da «verified» colpi, senza da «min»
  const m = createRiseModel(), prof = { rises: { 1: .3, '-1': .3 } };
  for (let i = 0; i < RISE_LEARN.min; i++) m.add(1, -.4, 'slice');
  assert.equal(habitualRise(prof, 1, m), .3); assert.equal(habitualRise(null, 1, m), -.4);
  for (let i = RISE_LEARN.min; i < RISE_LEARN.verified; i++) m.add(1, -.4, 'slice');
  assert.equal(habitualRise(prof, 1, m), -.4);
});

test('pallonetto rispetto al proprio colpo normale (valori della partita 131307); il top spin pieno di chi sale già resta top spin', () => {
  // rovescio n. 26267: salita 0,64, piano 0,61, colpo normale di chi gioca −0,45 → era top spin
  assert.equal(classifyStroke({ rise: .638, plane: .608 }, { power: .44, angle: 70, riseRef: -.45 }).shot, 'lob');
  // dritto n. 37897: salita 0,58, piano −0,61, colpo normale 0,04
  assert.equal(classifyStroke({ rise: .579, plane: -.612 }, { power: .56, angle: 80, riseRef: .04 }).shot, 'lob');
  // un dritto normale della stessa partita (salita 0,25–0,31) resta top spin
  assert.equal(classifyStroke({ rise: .314, plane: .084 }, { power: .53, angle: 70, riseRef: .04 }).shot, 'topspin');
  // 23/10: top spin pieno di chi ha la salita abituale 0,3, e senza salita abituale (soglie assolute di prima)
  assert.equal(classifyStroke({ rise: .63, plane: .65 }, { power: .8, angle: 107, riseRef: .3 }).shot, 'topspin');
  assert.equal(classifyStroke({ rise: .63, plane: .65 }, { power: .8, angle: 107 }).shot, 'topspin');
  // swing orizzontale con la testa che sale: top spin anche molto sopra il colpo normale
  assert.equal(classifyStroke({ rise: .7, plane: .9 }, { power: .7, angle: 90, riseRef: -.3 }).shot, 'topspin');
});

test('pallonetto: da fondo campo sale a 5–7 m e passa sopra chi è a rete; il più forte più basso', () => {
  const lob = (power, from) => {
    const real = Math.random; Math.random = mulberry32(3);
    try {
      const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 3;
      e.player.pos.set(.6, 0, from + .35); e.player.targetPos.copy(e.player.pos);
      e.opponent.pos.set(0, 0, -20); e.opponent.targetPos.copy(e.opponent.pos);   // lontano: si segue tutto il volo
      e.ball.pos.set(1.2, .9, from - .3); e.ball.vel.set(0, -.5, 8);
      e._attemptPlayerRallyStrike({ ...phoneSwing({ shot: 'lob', power, rise: .8 }), natpfTau: 0, natpfLateSpan: .1 }, false);
      let apex = 0, atNet = null;
      for (let t = 0; t < 4; t += DT){ const z0 = e.ball.pos.z; e.step(DT); apex = Math.max(apex, e.ball.pos.y); if (z0 > -4.5 && e.ball.pos.z <= -4.5) atNet = e.ball.pos.y; if (e.ball.pos.y < .1 && e.ball.vel.y > 0) return { apex, atNet, z: e.ball.pos.z }; }
      return { apex, atNet, z: null };
    } finally { Math.random = real; }
  };
  const soft = lob(.3, 12.4), hard = lob(.9, 12.4), mid = lob(.6, 6);
  assert.ok(soft.apex > 6 && soft.apex < 7.5, `difensivo: colmo ${soft.apex}`);
  assert.ok(hard.apex > 4.5 && hard.apex < soft.apex - .5, `forte: colmo ${hard.apex}`);
  for (const r of [soft, hard, mid]){ assert.ok(r.atNet > 3.4, `a 4,5 m dalla rete: ${r.atNet}`); assert.ok(r.z < -8 && r.z > -11.9, `caduta ${r.z}`); }
});

const phoneSwing = (intent, { side = 'forehand' } = {}) => ({ source: 'natpf-phone', side, hand: 'right', shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, conf: 1, ...intent }, power: intent.power, peak: 900, latency: 0, hand: 'right' } });

test('schiacciata dall\'altezza della spalla: il gesto di schiacciata su una palla a 1,55–1,70 m è una schiacciata (erano piatti)', () => {
  const smash = { natpf: { intent: { shot: 'smash', power: .8, rise: -.5, riseRef: -.3 } } };
  for (const y of [1.55, 1.7]) assert.equal(smashAt(smash, y), true, `${y} m`);
  assert.equal(smashAt(smash, SMASH_FROM.gesture - .05), false);
  // il colpo normale di chi gioca (scende come sempre) su una palla alta non diventa una schiacciata; uno che scende
  // deciso rispetto al proprio colpo normale sì
  assert.equal(smashAt({ natpf: { intent: { shot: 'topspin', power: .8, rise: -.35, riseRef: -.3 } } }, 1.6), false);
  assert.equal(smashAt({ natpf: { intent: { shot: 'topspin', power: .8, rise: -.6, riseRef: -.3 } } }, 1.6), true);
  // nel motore, da fondo campo (palla a 1,55 m a 12,6 m dalla rete): passa il nastro, veloce, dentro
  const real = Math.random; Math.random = mulberry32(3);
  try {
    const e = createHeadlessEngine({ difficulty: '1v1' }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 3;
    e.player.pos.set(.6, 0, 12.95); e.player.targetPos.copy(e.player.pos);
    e.ball.pos.set(1.2, 1.55, 12.3); e.ball.vel.set(0, -.5, 6); e.natpfPlan = null;
    e._attemptPlayerRallyStrike({ ...phoneSwing({ shot: 'smash', power: .85, rise: -.5, riseRef: -.3 }), natpfTau: 0, natpfLateSpan: .1 }, false);
    assert.equal(e.natpfLastRacket.out.shot, 'SMASH'); assert.equal(e.player.swingType, 'smash');
    assert.ok(e.ball.vel.length() > 40, `${(e.ball.vel.length()*3.6).toFixed(0)} km/h`);
    let netY = null;
    for (let t = 0; t < 2; t += DT){ const z0 = e.ball.pos.z, y0 = e.ball.pos.y; e.step(DT); if (z0 > 0 && e.ball.pos.z <= 0) netY = y0; if (e.ball.pos.y < .1 && e.ball.vel.y > 0) break; }
    assert.ok(netY > .914 + .05, `sopra il nastro: ${netY}`);
    assert.ok(e.ball.pos.z < -6 && e.ball.pos.z > -11.9 && Math.abs(e.ball.pos.x) < SIDE, `caduta ${e.ball.pos.toArray()}`);
  } finally { Math.random = real; }
});

test('direzione: il piatto da solo arriva alle righe, in diagonale la palla cade più corta', () => {
  const lv = skillLevel('1v1'), shot = o => strokeOutcome({ contact: 1, hitX: 0, hitZ: 12.5, quality: 1, contactY: 1, level: lv, timing: 0, ...o, intent: { shot: 'topspin', power: .7, depth: .7, rise: .25, face: 0, ...(o.intent || {}) } });
  const base = shot({}), right = shot({ intent: { face: 1 } }), left = shot({ intent: { face: -1 } }), half = shot({ intent: { face: .4 } });
  assert.ok(right.x > 3.2 && left.x < -3.2, `${left.x} ${base.x} ${right.x}`);
  assert.ok(half.x - base.x > .3*(right.x - base.x) && half.x < right.x, `con 0,4: ${half.x}`);
  // stessa forza: la palla che va di lato cade più vicino alla rete (stessa strada), l'incrociato stretto ancora di più
  assert.ok(right.depth < base.depth - .15 && left.depth < right.depth - 1, `${left.depth} ${base.depth} ${right.depth}`);
  // valori della partita 131307 (piatto, tempo, palla, lato, forza): con il peso di prima metà delle palle cadevano entro
  // 1,7 m dal centro
  const rows = [[.095, .075, 1.16, 1, .725], [1, .221, -.49, -1, .48], [-.835, .02, 1.51, 1, .888], [.77, .109, 3.46, 1, .547], [-.685, .236, -.58, 1, .775],
    [-.47, .129, .76, -1, .515], [.195, .398, -2.48, -1, .728], [-.98, -.13, -1.26, 1, .737], [.78, .757, -4.51, 1, .831], [.725, .775, .81, 1, .74],
    [.22, .194, 1.51, -1, .662], [-.095, .239, -1.85, 1, .742], [-.365, .005, .36, 1, .675], [.225, .493, 3.2, -1, .371]];
  const xs = rows.map(([face, t, hitX, contact, power]) => Math.abs(strokeOutcome({ intent: { shot: 'topspin', power, depth: power, face }, timing: t*.17, contact, hitX, hitZ: 12.8, quality: .8, level: lv }).x)).sort((a, b) => a - b);
  assert.ok(xs[xs.length >> 1] > 2, `mediana ${xs[xs.length >> 1]}`);
  assert.ok(xs.every(x => x < SIDE), 'tutte dentro');
});

test('tempo sulla strada della palla: lo stesso anticipo su una palla lenta è meno anticipo', () => {
  const lv = skillLevel('1v1');
  assert.equal(slowFactor(null), 1); assert.equal(slowFactor(20), 1); assert.ok(slowFactor(8) > 1.7 && slowFactor(2) <= 1.8 + 1e-9);
  const at = vz => strokeOutcome({ intent: { shot: 'topspin', power: .7 }, timing: .25, ballVz: vz, hitZ: 6, level: lv });
  const fast = at(20), slow = at(8);
  assert.ok(fast.excess > 0 && slow.excess === 0, `veloce ${fast.excess}, lenta ${slow.excess}`);
  assert.ok(slow.q > fast.q && Math.abs(slow.x) < SIDE, JSON.stringify(slow));
});

// palla corta della CPU (rimbalzo a 3 m dalla rete), chi gioca parte da fondo campo; swing quando mancano lead secondi
function shortBall(lead, intent, { land = [.8, 3], flight = 1.35 } = {}){
  const real = Math.random; Math.random = mulberry32(7);
  try {
    const e = createHeadlessEngine({ difficulty: '1v1' }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 4;
    e.player.pos.set(.4, 0, 11.7); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
    e.ball.pos.set(-.5, 1, -10); e._launchBallToTarget(e.ball.pos, new THREE.Vector3(land[0], 0, land[1]), flight, { topspin: -3 });
    e._natpfPlanPlayer();
    const plan = NI.planOf(e, e.player);
    let sent = false;
    for (let t = 0; t < 5; t += DT){
      const ttc = NI.timeToContact(e, e.player);
      if (!sent && ttc != null && ttc <= lead){ e._handleUserSwingInput(phoneSwing(intent, { side: e.ball.pos.x >= e.player.pos.x ? 'forehand' : 'backhand' })); sent = true; }
      const b = e.ball.lastHitter; e.step(DT);
      if (b !== 'player' && e.ball.lastHitter === 'player'){
        const r = e.natpfLastRacket, v0 = e.ball.vel.length();
        let netY = null;
        for (let k = 0; k < 400; k++){ const z0 = e.ball.pos.z, y0 = e.ball.pos.y; e.step(DT); if (z0 > 0 && e.ball.pos.z <= 0) netY = y0; if (e.ball.pos.y < .1 && e.ball.vel.y > 0) break; }
        return { plan, out: r.out, v0, netY, land: [e.ball.pos.x, e.ball.pos.z] };
      }
      if (e.phase !== 'RALLY') return { plan, out: null };
    }
    return { plan, out: null };
  } finally { Math.random = real; }
}

test('palla corta: presa nel punto alto del rimbalzo, chiusura veloce e radente sopra il nastro, anche angolata; mai in rete con un buon tempo', () => {
  for (const lead of [.05, .15, .3]){
    const r = shortBall(lead, { shot: 'flat', power: .85 });
    assert.ok(r.out, `anticipo ${lead}: colpita`);
    assert.ok(r.plan.contact.y >= .9, `presa a ${r.plan.contact.y} m (prima 0,5 in salita)`);
    assert.equal(r.out.attack, true, JSON.stringify(r.out)); assert.equal(r.out.netFault, false);
    assert.ok(r.netY > .914 && r.netY < .914 + .45, `sul nastro a ${r.netY}`);
    assert.ok(r.v0*3.6 > 100, `${(r.v0*3.6).toFixed(0)} km/h`);
    assert.ok(Math.abs(r.land[0]) < SIDE && r.land[1] < 0 && r.land[1] > -11.9, `caduta ${r.land}`);
  }
  // angolata: con il piatto girato la chiusura cade vicino alla riga, corta
  const wide = shortBall(.1, { shot: 'flat', power: .85, face: -1 });
  assert.ok(Math.abs(wide.land[0]) > 3.2 && Math.abs(wide.land[0]) < SIDE && wide.land[1] > -8, `angolo: ${wide.land}`);
  // gesto morbido: niente chiusura (un colpo normale che sale sopra il nastro)
  const soft = shortBall(.1, { shot: 'topspin', power: .3 });
  assert.equal(soft.out.attack, false); assert.equal(soft.out.netFault, false);
});

test('volée sotto il nastro: deve salire, nessuna chiusura; sopra il nastro sì', () => {
  const lv = skillLevel('1v1'), at = y => strokeOutcome({ intent: { shot: 'topspin', power: .8 }, timing: 0, hitZ: 3, contactY: y, volley: true, net: true, level: lv });
  const low = at(.6), high = at(1.3);
  assert.equal(low.attack, false); assert.ok(low.clear >= OUTCOME.attackY + .3, `${low.clear}`);
  assert.equal(high.attack, true); assert.ok(high.clear < .914 + .35 && Number.isFinite(high.flight), JSON.stringify(high));
});
