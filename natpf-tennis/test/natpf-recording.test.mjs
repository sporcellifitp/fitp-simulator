// Correzioni dalle registrazioni vere (pannello di diagnostica, LAN): mira che arrivava quasi sempre in fondo, tagliati
// e pallonetti non voluti, tutto «piatto», colpi riconosciuti tardi, colpi veri trattenuti come preparazione.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { createFaceTracker } from '@natpf/tennis/face-tracker.js';
import { swingMessage, parseSwingMessage } from '@natpf/tennis/swing-message.js';
import { classifyPhoneShot, aimFromSignals, createLiftModel, liftBaselineFromProfile } from '../src/natpf/natpf_gestures.js';
import { natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';

test('verso verticale abituale per verso del colpo, poi dai colpi veri della partita', () => {
  const prof = { templates: [{ dir: 1, shot: 'drive', features: { lift: -.41 } }, { dir: 1, shot: 'drive', features: { lift: -.16 } }, { dir: -1, shot: 'drive', features: { lift: -.8 } }, { dir: -1, shot: 'drive', features: { lift: -.57 } }] };
  const base = liftBaselineFromProfile(prof);
  assert.ok(Math.abs(base[1] + .285) < .01 && Math.abs(base[-1] + .685) < .01, JSON.stringify(base));
  const m = createLiftModel(base);
  // con la sola calibrazione un rovescio normale (0,25) sembra un lob: è quello che succedeva
  assert.equal(classifyPhoneShot({ dir: -1, lift: .25, liftBaseline: m.value }).shot, 'lob');
  for (const l of [.21, .37, .25, .2, .4, .26]) m.add(-1, l);
  assert.notEqual(classifyPhoneShot({ dir: -1, lift: .25, liftBaseline: m.value }).shot, 'lob');
  assert.equal(classifyPhoneShot({ dir: -1, lift: 1, liftBaseline: m.value }).shot, 'lob', 'un lob vero resta un lob');
  assert.equal(m.value[1], base[1], 'il dritto resta quello della calibrazione finché non ci sono abbastanza colpi');
});

test('gesto verticale con un verso orizzontale: resta dritto o rovescio; gesto lento: niente colpi speciali dalla sola L', () => {
  assert.notEqual(classifyPhoneShot({ dir: -1, vert: 'up', lift: .2 }).shot, 'lob');
  assert.equal(classifyPhoneShot({ dir: 0, vert: 'up' }).shot, 'lob');
  assert.equal(classifyPhoneShot({ dir: -1, lift: -.9, speed: .3 }).shot, 'topspin');
  assert.equal(classifyPhoneShot({ dir: -1, lift: -.9, speed: .3, facePitch: 20, power: .3 }).shot, 'drop', 'la palla corta è lenta per definizione');
  assert.equal(classifyPhoneShot({ dir: 1, lift: -.5, speed: 1 }).shot, 'slice');
});

test('piatto non credibile: niente mira dal polso, la decide il tempo del colpo', () => {
  assert.deepEqual(aimFromSignals({ faceAim: null, faceUnreliable: true, twist: .8 }), { aim: 0, source: 'timing' });
  const s = { power: .6, lift: -.9, dur: 120, dir: 1, peakT: 1000, t: 1020, peak: 900, detectMs: 20, holdMs: 0, face: { yaw: 150, pitch: -40, roll: 0 }, features: { speed: 1.1, twist: .2 } };
  const d = swingMessage(s, { now: 1020 });
  assert.equal(d.l, -.9, 'il verso verticale non si taglia più a ±0,6');
  assert.equal(d.fu, 1); assert.equal(d.fa, undefined); assert.equal(d.sp, 1.1);
  const p = parseSwingMessage(d, { at: 1, now: 1030 });
  assert.equal(p.face.aim, null); assert.equal(p.speed, 1.1);
  assert.equal(natpfSwingToEngine(p, { now: 1.03 }).natpf.aimSource, 'timing');
});

test('piatto rispetto alla posa di partenza del colpo, non a una posa «pronto» che con la mano vera si sposta', () => {
  const f = createFaceTracker({ quietHold: 400, relax: 2.5 });
  f.setRest([0, 1, 0]);
  let t = 0;
  const feed = (w, ms) => { for (const end = t + ms; t < end; t += 16) f.feed({ t, rot: [0, 0, w], acc: [0, 0, 0], accG: [0, 9.81, 0] }); };
  feed(0, 300); feed(80, 500);          // la mano si sposta di 40° piano (sopra la soglia «fermo»)
  feed(0, 250);                         // ferma: posa di partenza
  const t0 = t; feed(400, 64);          // colpo: altri ~25°
  const peak = t - 16;
  const plain = f.faceAt(peak), stroke = f.strokeFace(peak, t0);
  assert.ok(Math.abs(plain.yaw) > 45, JSON.stringify(plain));
  assert.ok(Math.abs(Math.abs(stroke.yaw) - 25) < 8, JSON.stringify(stroke));
});

test('il colpo parte appena la velocità grezza scende dal picco (60 Hz)', () => {
  const det = createSwingDetector(), out = [];
  det.setProfile({ axis: [0, 0, 1], ref: 800, on: 60, minPeak: 150, minAngle: 5, noise: 2, bias: [0, 0, 0] }); det.run();
  det.on('swing', s => out.push(s));
  let t = 0;
  for (; t < 300; t += 16.7) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] });
  for (let i = 0; i <= 9; i++, t += 16.7) det.feed({ t, rot: [0, 0, 1100*Math.sin(Math.PI*i/9)**2], acc: [0, 0, 0], accG: [0, 9.8, 0] });
  for (let i = 0; i < 20; i++, t += 16.7) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] });
  assert.equal(out.length, 1);
  assert.ok(out[0].detectMs <= 26, `riconosciuto ${out[0].detectMs} ms dopo il picco`);
  assert.ok(out[0].power > .6 && out[0].power < .95, `forza ${out[0].power}: un colpo forte non è subito al massimo`);
});

// ---- secondo giro di registrazioni: palle alte, pallonetto, palla corta, mira, preparazioni lente ----
import { createFaceModel, centeredFace } from '../src/natpf/natpf_gestures.js';
import { ballIsHigh } from '../src/natpf/natpf_phone_racket.js';
import { shotName } from '../src/natpf/natpf_shot_feedback.js';

test('mira e apertura rispetto al proprio colpo abituale in partita', () => {
  const m = createFaceModel();
  assert.equal(m.center(1), null, 'prima dei colpi: come dal telefono');
  for (const yaw of [-35, -28, -31, -40, -25]) m.add(1, { yaw, pitch: 60 });
  const c = m.center(1);
  assert.deepEqual(c, { yaw: -31, pitch: 60 });
  const normal = centeredFace({ yaw: -30, pitch: 62 }, c), right = centeredFace({ yaw: 5, pitch: 60 }, c);
  assert.ok(Math.abs(normal.aim) < .1 && Math.abs(normal.pitch) < 5, 'il colpo normale va al centro e non è «aperto»');
  assert.ok(right.aim > .6);
  assert.equal(centeredFace({ yaw: 70, pitch: 0 }, c).aim, null, 'scarto non credibile: mira dal tempo');
  const ev = natpfSwingToEngine({ dir: 1, power: .6, peak: 900, lift: 0, at: 1, face: { yaw: -30, pitch: 62, aim: .9 } }, { now: 1.03, faceCenter: c });
  assert.ok(Math.abs(ev.natpf.wrist) < .1); assert.notEqual(ev.natpf.shot, 'drop');
});

test('pallonetto raggiungibile: soglia non oltre 0,6 anche con gesti molto variabili; verticale con un po’ di lato', () => {
  assert.equal(classifyPhoneShot({ dir: 1, lift: .62, liftSpread: .3, speed: 1 }).shot, 'lob');
  assert.equal(classifyPhoneShot({ dir: -1, vert: 'up', lift: .4, speed: 1 }).shot, 'lob');
  assert.notEqual(classifyPhoneShot({ dir: -1, vert: 'up', lift: .1, speed: 1 }).shot, 'lob');
});

test('palla alta solo se è vicina: a metà volo non trasforma il colpo in schiacciata', () => {
  const engine = { playerRole: 'p1', player: { pos: { x: 0, z: 11.2 } }, ball: { inPlay: true, pos: { x: 0, y: 2.2, z: -1.3 }, vel: { y: 0 } } };
  assert.equal(ballIsHigh(engine), false);
  engine.ball.pos.z = 8.5; assert.equal(ballIsHigh(engine), true);
});

test('nome del colpo speciale nel messaggio dell’esito', () => {
  assert.equal(shotName('PERFECT • FOREHAND LOB!'), 'Pallonetto');
  assert.equal(shotName('EARLY • BACKHAND DROP SHOT!'), 'Palla corta');
  assert.equal(shotName('PERFECT • SMASH!'), 'Schiacciata');
  assert.equal(shotName('PERFECT • FOREHAND TOPSPIN!'), null);
  assert.equal(shotName('POWER SERVE!'), null);
});

test('preparazione trattenuta e lenta senza il colpo che segue: non diventa un colpo', () => {
  const det = createSwingDetector(), out = { swings: [], preps: [] };
  det.setProfile({ axis: [0, 0, 1], ref: 800, refs: { 1: 800, '-1': 800 }, on: 60, minPeak: 120, minAngle: 5, noise: 2, bias: [0, 0, 0] }); det.run();
  det.setPrepMode(true); det.setExpect(1);
  det.on('swing', s => out.swings.push(s)); det.on('prep', p => out.preps.push(p));
  let t = 0;
  const rest = ms => { for (const end = t + ms; t < end; t += 16.7) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] }); };
  const move = (dir, peak, ms) => { const n = Math.round(ms/16.7); for (let i = 0; i <= n; i++, t += 16.7) det.feed({ t, rot: [0, 0, dir*peak*Math.sin(Math.PI*i/n)**2], acc: [0, 0, 0], accG: [0, 9.8, 0] }); };
  rest(300); move(-1, 300, 220); rest(600);
  assert.equal(out.swings.length, 0); assert.ok(out.preps.length >= 1);
});

// ---- pallonetto e palla corta: segnale del verso verticale, soglie personali, traiettorie ----
import { learnSpecials, GESTURE } from '../src/natpf/natpf_gestures.js';
import { LOB_FLIGHT } from '../src/natpf/natpf_skill.js';

test('verso verticale del piatto (giroscopio): pallonetto, palla corta e tagliato; il segno dipende dal piatto che colpisce', () => {
  // dritto del destro (dir 1): colpisce il palmo, il telefono misura il dorso → segno invertito
  // piatto che sale con la mano che sale: pallonetto; il piatto che sale da solo (rotazione del polso, mano ferma)
  // resta un dritto (prima era un pallonetto: con la presa vera succedeva nei dritti normali, 19/10)
  const up = natpfSwingToEngine({ dir: 1, power: .7, peak: 1100, speed: 1, lift: .3, head: -.7, at: 1 }, { now: 1.03 });
  assert.equal(up.natpf.head, .7); assert.equal(up.natpf.shot, 'lob');
  const wrist = natpfSwingToEngine({ dir: 1, power: .7, peak: 1100, speed: 1, lift: 0, head: -.7, at: 1 }, { now: 1.03 });
  assert.equal(wrist.natpf.shot, 'topspin', JSON.stringify(wrist.natpf));
  // palla corta: invariata (tagliato morbido, basta il gesto)
  const soft = natpfSwingToEngine({ dir: 1, power: .35, peak: 420, speed: .5, lift: -.2, head: .6, at: 1 }, { now: 1.03 });
  assert.equal(soft.natpf.shot, 'drop', JSON.stringify(soft.natpf));
  // tagliato veloce: il piatto che scende con la mano che scende; il piatto da solo non basta
  const cut = natpfSwingToEngine({ dir: -1, power: .8, peak: 1200, speed: 1.1, lift: -.3, head: -.7, at: 1 }, { now: 1.03 });
  assert.equal(cut.natpf.shot, 'slice');
  assert.equal(natpfSwingToEngine({ dir: -1, power: .8, peak: 1200, speed: 1.1, lift: 0, head: -.7, at: 1 }, { now: 1.03 }).natpf.shot, 'topspin');
  const normal = natpfSwingToEngine({ dir: 1, power: .7, peak: 1100, speed: 1, lift: .05, head: -.05, at: 1 }, { now: 1.03 });
  assert.ok(['topspin', 'flat'].includes(normal.natpf.shot));
});

test('soglie personali dagli esercizi: il proprio pallonetto «piccolo» diventa riconoscibile', () => {
  const p = learnSpecials({ lob: [.32, .28, .36], drop: [{ v: -.3, speed: .55 }, { v: -.26, speed: .6 }] });
  assert.ok(p.lob >= .18 && p.lob < .25, JSON.stringify(p)); assert.ok(p.cut <= -.15 && p.cut > -.2); assert.ok(p.dropSpeed > .6);
  assert.equal(classifyPhoneShot({ dir: 1, lift: .3, speed: 1 }).shot, 'topspin', 'soglia generale');
  assert.equal(classifyPhoneShot({ dir: 1, lift: .3, speed: 1, personal: p }).shot, 'lob', 'soglia personale');
  assert.deepEqual(learnSpecials({ lob: [.05, .1] }), {}, 'gesto non distinguibile: resta la soglia generale');
  assert.ok(GESTURE.headWeight > .5);
});

test('traiettoria del pallonetto nella fisica del motore: alto e in fondo al campo', () => {
  const G = 9.15, DRAG = .012, e = 1/120;
  const sim = (I, zT, spin) => { const g = G + spin*.14; let vz = (zT - 11)/I, vy = (.08 - 1 + .5*g*I*I)/I; const k = 1 + DRAG*Math.hypot(vz, vy)*I*.35; vz *= k; vy *= k;
    let y = 1, z = 11, apex = 1; while (y > 0){ const a = Math.max(0, 1 - DRAG*Math.hypot(vz, vy)*e); vz *= a; vy *= a; vy -= g*e; y += vy*e; z += vz*e; apex = Math.max(apex, y); } return { z, apex }; };
  const lob = sim(LOB_FLIGHT, -10, 4);
  assert.ok(lob.apex > 5 && lob.z < -9 && lob.z > -11.9, JSON.stringify(lob));
});
