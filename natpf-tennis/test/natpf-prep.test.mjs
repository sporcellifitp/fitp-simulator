// Preparazione del colpo: la racchetta portata indietro (gesto nel verso opposto) non deve diventare un colpo dell'altro
// lato; il gioco la anima e la premia. Rilevatore del telefono con segnali sintetici del giroscopio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { natpfSwingToEngine, expectedStrokeDir, strokeSide } from '../src/natpf/natpf_phone_racket.js';
import * as NS from '../src/natpf/natpf_skill.js';

// profilo come dopo la calibrazione: asse del colpo lungo z (+ = da destra a sinistra, il dritto del destro)
const profile = { axis: [0, 0, 1], ref: 600, refs: { 1: 600, '-1': 600 }, on: 60, minPeak: 120, minAngle: 5, noise: 2, bias: [0, 0, 0] };
function rig({ prep = true, expect = 0 } = {}){
  const det = createSwingDetector(), out = { swings: [], preps: [] };
  det.setProfile(profile); det.run(); det.setPrepMode(prep); det.setExpect(expect);
  det.on('swing', s => out.swings.push(s)); det.on('prep', p => out.preps.push(p));
  let t = 0;
  const rest = ms => { for (const end = t + ms; t < end; t += 10) det.feed({ t, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] }); };
  // gesto a campana: velocità di rotazione fino a «peak» °/s nel verso «dir», durata ms
  const move = (dir, peak, ms) => { const n = ms/10; let peakAt = t; for (let i = 0; i <= n; i++, t += 10){ const w = peak*Math.sin(Math.PI*i/n)**2; if (i === Math.round(n/2)) peakAt = t; det.feed({ t, rot: [0, 0, dir*w], acc: [0, 0, 0], accG: [0, 9.8, 0] }); } return peakAt; };
  rest(200);
  return { det, out, rest, move };
}

test('senza modalità preparazione la racchetta portata indietro diventa un colpo dell’altro lato (il problema)', () => {
  const { out, rest, move } = rig({ prep: false });
  move(-1, 420, 220); move(1, 750, 180); rest(400);
  assert.equal(out.swings[0].dir, -1);
});

test('preparazione e poi colpo: un solo colpo nel verso giusto, la preparazione arriva come evento a parte', () => {
  const { out, rest, move } = rig({ expect: 1 });
  move(-1, 420, 220);
  const strokePeak = move(1, 750, 180); rest(400);
  assert.equal(out.swings.length, 1, JSON.stringify(out.swings.map(s => s.dir)));
  assert.equal(out.swings[0].dir, 1);
  assert.ok(Math.abs(out.swings[0].peakT - strokePeak) <= 20, 'l’istante del colpo resta quello vero');
  assert.equal(out.preps.length, 1); assert.equal(out.preps[0].dir, -1);
});

test('colpo nel verso atteso: parte subito, senza ritardo', () => {
  const { out, move } = rig({ expect: 1 });
  const peak = move(1, 750, 180);
  assert.equal(out.swings.length, 1);
  assert.ok(out.swings[0].t - peak < 80);
});

test('colpo voluto dall’altro lato: vale lo stesso, dopo una breve attesa, con il suo istante del picco', () => {
  const { out, rest, move } = rig({ expect: 1 });
  const peak = move(-1, 750, 180);
  assert.equal(out.swings.length, 0, 'trattenuto');
  rest(400);
  assert.equal(out.swings.length, 1); assert.equal(out.swings[0].dir, -1);
  assert.ok(Math.abs(out.swings[0].peakT - peak) <= 20);
  assert.equal(out.preps.length, 0);
});

test('micro-movimenti in attesa della palla: sono preparazione, mai colpi', () => {
  const { out, rest, move } = rig({ expect: 1 });
  for (let i = 0; i < 4; i++){ move(i % 2 ? 1 : -1, 150, 160); rest(120); }
  assert.equal(out.swings.length, 0);
  assert.ok(out.preps.length >= 1);
});

test('verso del colpo atteso dalla palla che arriva; preparazione → lato e colpo preparato', () => {
  const engine = { phase: 'RALLY', playerRole: 'p1', player: { pos: { x: 0 } }, opponent: { pos: { x: 0 } },
    ball: { inPlay: true, lastHitter: 'opponent', vel: { z: 12 }, pos: { x: 0 }, targetLanding: { x: 1.4 } } };
  assert.equal(expectedStrokeDir(engine, 'right'), 1);                     // palla alla destra del destro: dritto
  assert.equal(expectedStrokeDir(engine, 'left'), 1);                      // per il mancino è il rovescio, sempre da destra a sinistra
  engine.ball.targetLanding.x = -1.4;
  assert.equal(expectedStrokeDir(engine, 'right'), -1);
  engine.ball.lastHitter = 'player';
  assert.equal(expectedStrokeDir(engine, 'right'), 0);
  assert.equal(strokeSide(1), 'forehand'); assert.equal(strokeSide(1, 'left'), 'backhand');
  // colpo preceduto dalla preparazione 0,35 s prima: preparato, con un poco più di forza
  const s = { dir: 1, power: .7, lift: 0, at: 10, peak: 800 };
  const prepared = natpfSwingToEngine(s, { prep: { dir: -1, at: 9.65, angle: 45 }, prepCapable: true });
  const flick = natpfSwingToEngine(s, { prepCapable: true });
  assert.ok(prepared.natpf.prep && prepared.natpf.prep.lead > .3);
  assert.equal(flick.natpf.prep, null);
  assert.ok(prepared.speed > flick.speed);
  assert.equal(NS.prepQuality(prepared.natpf), 1);
  assert.ok(NS.prepQuality(flick.natpf) < .9);
  assert.equal(NS.prepQuality({ aim: 'swing', prepCapable: false }), 1);  // telefono che non la riconosce: nessuna penalità
  // senza calibrazione (verso 0) la preparazione dice il lato
  assert.equal(natpfSwingToEngine({ dir: 0, power: .6, at: 10 }, { prep: { dir: 1, at: 9.7 } }).side, 'backhand');
});

test('flusso dei sensori in JSON (collegamento via internet): la racchetta in gioco segue i micro-movimenti', async () => {
  const { createRacketMotion } = await import('@natpf/tennis/racket-motion.js');
  const m = createRacketMotion();
  for (let i = 0; i < 12; i++) assert.ok(m.push({ sequence: i, t: i*33.3, rot: [0, 0, 90], acc: null, accG: null }, i*33.3));
  const s = m.sample(12*33.3);
  assert.ok(s && !s.stale && Math.abs(s.rotation[3]) < .999, 'la rotazione integrata si muove');
});
