// Webcam: colpi dal movimento dell'immagine (rifacimento del 28–29/10, src/natpf/webcam_motion.js). Immagini sintetiche
// 96 × 72 (sfondo con tessitura e rumore della camera, un braccio che attraversa l'immagine), la finestra del colpo data
// dal motore vero (natpf_impact.webcamGate), il controller (motion_controls.js) e il colpo nel motore. La precisione sui
// video veri è in docs/WORK_PROGRESS.md (diagnostica 213510: 9 colpi su 14 entro ±80 ms dal telefono).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMotionStrokes, frameMotion, swingSpeed, MOTION } from '../src/natpf/webcam_motion.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { eventLatency } from '../src/natpf/natpf_skill.js';

const W = MOTION.w, H = MOTION.h;
// fotogramma: sfondo fisso con tessitura, rumore della camera (sotto la soglia dei pixel) e, se c'è, il braccio: una
// fascia chiara larga bw px con il centro in x (px)
function frame(rng, { x = null, bw = 10, top = 14, bottom = 60 } = {}){
  const g = new Uint8Array(W*H);
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++){
    let v = 70 + ((i*7 + y*13) % 23)*2 + Math.round((rng() - .5)*10);
    if (x != null && Math.abs(i - x) <= bw/2 && y >= top && y <= bottom) v = 200 + ((i + y) % 5)*6;
    g[y*W + i] = v;
  }
  return g;
}
// a 30 fotogrammi al secondo: fermo per «rest» ms, poi il braccio che attraversa da x0 a x1 in «ms» (profilo a campana),
// poi fermo. Restituisce l'elenco { t, gray } e l'istante del picco di velocità
function sweep(rng, { t0 = 0, rest = 2000, ms = 300, x0 = 15, x1 = 80, after = 600, fps = 30 } = {}){
  const out = [], dt = 1000/fps, ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u*u*(3 - 2*u);
  let t = t0;
  for (; t < t0 + rest; t += dt) out.push({ t, gray: frame(rng, { x: x0 }) });
  const s = t;
  for (; t <= s + ms; t += dt) out.push({ t, gray: frame(rng, { x: x0 + (x1 - x0)*ease((t - s)/ms) }) });
  for (const e = t + after; t < e; t += dt) out.push({ t, gray: frame(rng, { x: x1 }) });
  return { frames: out, peakT: s + ms/2, end: t };
}
const run = (det, frames) => frames.map(f => det.push(f));

test('movimento: fermo nessuno swing; un braccio che attraversa parte una volta, appena sale, con il colpo stimato poco dopo', () => {
  const rng = mulberry32(3), det = createMotionStrokes();
  const still = Array.from({ length: 90 }, (_, i) => ({ t: i*33.3, gray: frame(rng, { x: 15 }) }));
  assert.ok(run(det, still).every(o => !o.start), 'il rumore della camera non è movimento');
  assert.equal(det.baseline, 0);
  const sw = sweep(rng, { t0: 3000, rest: 300 }), out = run(det, sw.frames), starts = out.filter(o => o.start).map(o => o.start);
  assert.equal(starts.length, 1, JSON.stringify(starts));
  const st = starts[0];
  // parte nella salita, prima del picco di velocità del braccio; il colpo stimato è lead ms dopo
  assert.ok(st.t < sw.peakT && st.t > sw.peakT - 200, `attraversamento ${st.t}, picco ${sw.peakT}`);
  assert.equal(st.swingT, +(st.t + MOTION.lead).toFixed(1));
  assert.ok(st.rel >= 1);
  assert.equal(out.filter(o => o.end).length, 1, 'lo swing finisce quando il braccio si ferma');
  // un fotogramma ripetuto (la camera ne dà meno di quelli chiesti) non è movimento né un fotogramma nuovo
  const det2 = createMotionStrokes(), a = frame(rng, { x: 15 });
  det2.push({ t: 0, gray: a });
  assert.equal(det2.push({ t: 33, gray: a }).frame, null);
});

test('movimento: imparati i propri colpi la soglia è metà del colpo tipico (un movimento piccolo non parte più); il braccio che torna subito non è un altro swing', () => {
  const rng = mulberry32(5), det = createMotionStrokes();
  let t = 0;
  for (let i = 0; i < 3; i++){ const sw = sweep(rng, { t0: t, rest: 1500, ms: 240, x0: 10, x1: 86 }); run(det, sw.frames); t = sw.end; }
  assert.ok(det.typical > MOTION.minOn, `tipico ${det.typical}`);
  assert.ok(Math.abs(det.threshold - Math.max(MOTION.minOn, det.typical*MOTION.ofTypical)) < 1e-9);
  // un braccio più lento e corto (sistemarsi, un passo): sotto la soglia
  const small = sweep(rng, { t0: t, rest: 1500, ms: 600, x0: 86, x1: 72 });
  assert.equal(run(det, small.frames).filter(o => o.start).length, 0);
  // senza i colpi imparati lo stesso movimento sarebbe partito (oltre minOn)
  assert.equal(run(createMotionStrokes(), small.frames).filter(o => o.start).length, 1);
  // swing e subito il ritorno del braccio (entro il periodo refrattario dalla fine): uno solo
  const det2 = createMotionStrokes(), fs = sweep(rng, { rest: 1500, ms: 240, x0: 10, x1: 86, after: 0 }).frames;
  const last = fs[fs.length - 1].t, back = Array.from({ length: 14 }, (_, i) => ({ t: last + 33.3*(i + 1), gray: frame(rng, { x: 86 - 76*Math.min(1, i/5) }) }));
  const starts = run(det2, [...fs, ...back]).filter(o => o.start);
  assert.equal(starts.length, 1, JSON.stringify(starts.map(o => o.start)));
});

test('movimento: energia, forza dello swing e latenza della webcam', () => {
  const rng = mulberry32(7), a = frame(rng, { x: 20 }), b = frame(rng, { x: 30 });
  const m = frameMotion(a, b, W, H);
  assert.ok(m.energy > 0 && m.cx > .2 && m.cx < .35, JSON.stringify(m));
  assert.equal(frameMotion(a, a, W, H).energy, 0);
  assert.equal(swingSpeed(1), 1.15); assert.equal(swingSpeed(10), 1.6); assert.ok(swingSpeed(2) > 1.15 && swingSpeed(2) < 1.6);
  // la webcam manda lo swing prima del colpo vero: latenza negativa, fino a −0,15 s; il telefono resta ≥ 0 come prima
  assert.equal(eventLatency({ natpf: { aim: 'swing', latency: -.06 } }), -.06);
  assert.equal(eventLatency({ natpf: { aim: 'swing', latency: -.5 } }), -.15);
});

// motore senza interfaccia, con il generatore casuale fisso
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(17);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
function cpuShot(e, { from = [-.5, 1, -11], to = [1.6, 8.5], flight = 1.05, player = [.4, 11.7] } = {}){
  e.phase = 'RALLY'; e.autoPlayMode = false; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
  e.player.pos.set(player[0], 0, player[1]); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  e.pendingUserSwing = null;
  e.ball.pos.set(...from);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0], 0, to[1]), flight, { topspin: 14 });
  e._natpfPlanPlayer();
}

test('finestra del colpo della webcam: lancio e servizio solo al proprio servizio; nello scambio con la palla in arrivo, lato dalla palla', () => {
  withEngine('casual', e => {
    e.autoPlayMode = false;
    Object.assign(e, { phase: 'SERVE_STANCE' }); e.score.server = 'player';
    assert.deepEqual(NI.webcamGate(e, 'right'), { kind: 'toss' });
    e.phase = 'SERVE_TOSS';
    assert.deepEqual(NI.webcamGate(e, 'right'), { kind: 'serve' });
    e.score.server = 'opponent';
    assert.equal(NI.webcamGate(e, 'right'), null, 'servizio della CPU: il movimento non è un colpo');
    // palla sul dritto del destro (alla sua destra): dritto; per un mancino rovescio
    cpuShot(e, { to: [2.6, 8.5], player: [.4, 11.7] });
    assert.equal(NI.webcamGate(e, 'right'), null, 'palla appena partita: troppo lontana');
    let g = null;
    for (let i = 0; i < 400 && !g; i++){ e.step(1/120); g = NI.webcamGate(e, 'right'); }
    assert.ok(g && g.kind === 'stroke' && g.ttc <= NI.GATE.ahead && g.ttc > NI.GATE.ahead - .1, JSON.stringify(g));
    assert.equal(g.side, 'forehand');
    assert.equal(NI.webcamGate(e, 'left').side, 'backhand');
    e.natpfPaused = true; assert.equal(NI.webcamGate(e, 'right'), null, 'in pausa'); e.natpfPaused = false;
    e.ball.lastHitter = 'player'; assert.equal(NI.webcamGate(e, 'right'), null, 'palla colpita: il resto del movimento è l\'accompagnamento');
    e.ball.lastHitter = 'opponent'; e.autoPlayMode = true; assert.equal(NI.webcamGate(e, 'right'), null, 'dimostrazione del menu');
  });
});

test('controller: lo swing dal movimento va al gioco solo nella finestra, con lato dalla palla, latenza e senza piatto; in partita il modello delle mani non gira', async () => {
  const { MotionController: MC, webcamModeFrom } = await import('../src/motion_controls.js');
  // predefinita la webcam di argon-tennis (29/10); il movimento solo a richiesta
  assert.equal(webcamModeFrom(''), 'argon'); assert.equal(webcamModeFrom('?webcamMano=1'), 'hands'); assert.equal(webcamModeFrom('?webcamMovimento=1'), 'motion');
  const mc = Object.create(MC.prototype), swings = [], tosses = [];
  Object.assign(mc, { webcamMode: 'motion', handPreference: 'right', onTrack: null, _emitSwing: e => swings.push(e), _emitToss: e => tosses.push(e) });
  let gate = null; mc.webcamGate = () => gate;
  const st = { t: 1000, swingT: 1094, rel: 1.8 };
  mc._motionSwing(st, 1040);
  assert.equal(swings.length + tosses.length, 0, 'fuori dalla finestra: niente colpo');
  assert.equal(mc.webcamMotionAt, 1040, 'ma il movimento si vede (pannello della webcam)');
  gate = { kind: 'stroke', ttc: .3, side: 'backhand' };
  mc._motionSwing(st, 1040);
  assert.equal(swings.length, 1);
  const s = swings[0];
  assert.equal(s.source, 'webcam'); assert.equal(s.side, 'backhand'); assert.equal(s.handedSide, true); assert.equal(s.dirX, 0);
  assert.equal(s.speed, swingSpeed(1.8));
  assert.deepEqual(s.natpf, { aim: 'swing', latency: -.054, wrist: 0, source: 'webcam', hand: 'right' });
  gate = { kind: 'toss' }; mc._motionSwing(st, 1040);
  assert.equal(tosses.length, 1); assert.equal(swings.length, 1);
  // in partita: nessuna inferenza del modello delle mani (ogni inferenza ferma il gioco per 15–40 ms)
  let sent = 0;
  Object.assign(mc, { mpHands: { send: () => { sent++; return Promise.resolve(); } }, webcamActive: true, videoElem: { readyState: 4 }, _mpBusy: false, _nextHandFrameAt: -Infinity, _frameMeta: null });
  mc.webcamInPlay = () => true;
  assert.equal(mc._sendFrame(5000), false); assert.equal(sent, 0);
  mc.webcamInPlay = () => false;
  assert.equal(mc._sendFrame(5000), true); assert.equal(sent, 1, 'nel menu sì (mano vista, posa della racchetta)');
  // salute: con i colpi dal movimento la mano non si giudica (nessuna pausa «mano persa»)
  Object.assign(mc, { _wcStartedAt: 0, _frameMeta: { at: 4990 } });
  assert.equal(mc.webcamHealth(5000).model, false);
});

test('nel motore: lo swing della webcam arrivato prima dell\'impatto è giocato all\'impatto con il tempo stimato (latenza negativa)', () => {
  const webcam = latency => ({ source: 'webcam', side: 'forehand', handedSide: true, shotType: 'topspin', speed: 1.3, dirX: 0, dirY: -.4,
    natpf: { aim: 'swing', latency, wrist: 0, source: 'webcam', hand: 'right' } });
  const go = (lead, latency) => withEngine('casual', e => {
    cpuShot(e, { to: [1.6, 8.5] });
    let sent = false, strikeAt = null;
    for (let i = 0; i < 600; i++){
      const ttc = NI.timeToContact(e, e.player);
      if (!sent && ttc != null && ttc <= lead){ e._handleUserSwingInput(webcam(latency)); sent = true; }
      const before = e.ball.lastHitter;
      e.step(1/120);
      if (before !== 'player' && e.ball.lastHitter === 'player'){ strikeAt = e.elapsedTime; break; }
      if (e.phase !== 'RALLY') break;
    }
    return { hit: e.ball.lastHitter === 'player', timing: e.natpfLastRacket?.timing, landing: e.ball.targetLanding.x };
  });
  const a = go(.1, -.06);
  assert.ok(a.hit);
  assert.ok(Math.abs(a.timing - .04) < .02, `tempo ${a.timing}: 0,1 s prima dell'impatto, colpo vero 60 ms dopo l'evento`);
  // stesso istante con latenza zero: il tempo è quello dell'evento
  const b = go(.1, 0);
  assert.ok(b.hit && Math.abs(b.timing - .1) < .02, `${b.timing}`);
});

test('modello del corpo: con i colpi dal movimento si carica e gira solo con «Segui il corpo» (prima sempre, per il polso)', async () => {
  const { NatpfBodyFollow } = await import('../src/natpf/webcam_body_follow.js');
  const make = webcamMode => {
    const e = { phase: 'RALLY', playerRole: 'p1', player: {}, opponent: {}, motionController: { webcamActive: true, webcamMode, videoElem: { readyState: 4, currentTime: 1 }, latestHandLandmarks: null, latestHandSeenAt: null } };
    const f = new NatpfBodyFollow(e, { autostart: false });
    let loads = 0; f._ensurePose = () => { loads++; };
    return { e, f, load: () => loads };
  };
  const m = make('motion'); m.f.mode = 'auto';
  m.f.tick(1000); m.f.tick(1100);
  assert.equal(m.load(), 0, 'movimento, «Segui il corpo» spento: nessun modello del corpo');
  assert.equal(!!m.e.motionController._poseRequested, false);
  m.f.mode = 'body'; m.f.tick(1200);
  assert.equal(m.load(), 1, 'con «Segui il corpo» sì');
  const h = make('hands'); h.f.mode = 'auto'; h.f.tick(1000);
  assert.equal(h.load(), 1, 'colpi dalla mano (?webcamMano=1): il polso dal corpo come prima');
});
