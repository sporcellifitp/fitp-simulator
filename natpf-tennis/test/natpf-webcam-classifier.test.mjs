// Colpi della webcam (src/natpf/webcam_strokes.js dentro motion_controls.js): sottoinsieme veloce del banco completo
// scripts/audit/webcam-sweep.mjs con le stesse soglie d'accettazione. Swing secchi in 2D per pendenza (destro e
// mancino, 4:3 e 16:9), colpi completi in 3D, folla, lancio del servizio, scelta della mano, mancino nei ripieghi,
// istante di cattura dei fotogrammi, flusso ottico di riserva e aggancio della diagnostica (onTrack).
import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionController } from '../src/motion_controls.js';
import { NatpfHand } from '../src/natpf/natpf_hand.js';
import { createStrokeTracker, pickHand, handPoint, handSize } from '../src/natpf/webcam_strokes.js';
import { runSweep, runTrial, runCrowd, runDropout, sweep, engineView, handLandmarks, makeFake } from './webcam-sim.mjs';

const MC = MotionController, tracker = () => createStrokeTracker();
const pct = (n, d) => `${(100*n/d).toFixed(0)}% (${n}/${d})`;

test('unità uguali sui due assi: la taglia della mano non cambia ruotandola, in 4:3 come in 16:9', () => {
  for (const aspect of [3/4, 9/16]) for (const angle of [0, Math.PI/4, Math.PI/2, 2.5]){
    const lm = handLandmarks({ S: .5, y: .5, size: .042, aspect, angle });
    assert.ok(Math.abs(handSize(lm, aspect) - .042) < 1e-9, `aspetto ${aspect}, angolo ${angle}: ${handSize(lm, aspect)}`);
  }
  // il punto seguito è specchiato: a destra nell'immagine del modello = a sinistra sullo schermo
  assert.ok(Math.abs(handPoint(handLandmarks({ S: .3, y: .4 })).x - .3) < 1e-9);
});

test('scelta della mano: senza mano seguita vince quella che impugna (lateralità vista non specchiata), poi la più grande', () => {
  const a = handLandmarks({ S: .35, y: .5, size: .05 }), b = handLandmarks({ S: .62, y: .5, size: .04 });
  // il modello vede l'immagine non specchiata: la destra del giocatore è «Left»
  const hands = [{ lm: a, label: 'Right', score: .95 }, { lm: b, label: 'Left', score: .95 }];
  assert.equal(pickHand(hands, { prefer: 'right' }).index, 1);
  assert.equal(pickHand(hands, { prefer: 'left' }).index, 0);
  // senza lateralità: la più grande (più vicina)
  assert.equal(pickHand([{ lm: b }, { lm: a }]).index, 1);
  assert.deepEqual(pickHand([]), { index: -1, reason: 'nessuna mano' });
});

test('scelta della mano: una mano che entra (più grande, in testa alla lista) non prende il posto di quella seguita', () => {
  const mine = handLandmarks({ S: .55, y: .55, size: .04 }), other = handLandmarks({ S: .2, y: .35, size: .06 });
  const p = handPoint(mine), track = { x: p.x, u: -p.y*.75, vx: 0, vu: 0, t: 1000, size: handSize(mine), k: 1, label: 'Right' };
  const r = pickHand([{ lm: other, label: 'Left', score: .99 }, { lm: mine, label: 'Right', score: .6 }], { track, t: 1033 });
  assert.deepEqual(r, { index: 1, reason: 'continuità' });
  // la mano seguita sparisce: si aspetta (persa) invece di saltare sull'altra; dopo mezzo secondo si sceglie di nuovo
  assert.deepEqual(pickHand([{ lm: other, label: 'Left', score: .99 }], { track, t: 1100 }), { index: -1, reason: 'persa' });
  assert.equal(pickHand([{ lm: other, label: 'Left', score: .99 }], { track, t: 1700 }).index, 0);
});

test('swing secchi da fermo (2D): lato giusto, niente pallonetti fino a pendenza 0,8, un solo evento', () => {
  const rows = [];
  let seed = 1;
  for (const hand of ['right', 'left']) for (const side of ['FH', 'BH']) for (const ratio of [-.5, 0, .3, .5, .8]) for (const dS of [.3, .45])
    for (const T of [.2, .35]) for (const aspect of [3/4, 9/16]) for (const [fps, lat] of [[30, 22], [30, 45]]){
      const dir = (side === 'FH' ? -1 : 1)*(hand === 'left' ? -1 : 1);
      const ev = runSweep(MC, { pathFn: sweep({ dir, dS, ratio, aspect, T, curve: 1, yMid: .5 }), T, aspect, fps, lat, seed: seed++, hand, tracker: tracker() });
      rows.push({ hand, side, ratio, n: ev.length, v: engineView(ev.find(e => e.ts >= -.02 && e.ts <= T + .6), hand) });
    }
  for (const hand of ['right', 'left']){
    const L = rows.filter(r => r.hand === hand), ok = L.filter(r => r.v.label.startsWith(r.side + '·')).length;
    assert.ok(ok >= .95*L.length, `${hand}: lato giusto ${pct(ok, L.length)}`);
  }
  for (const ratio of [.3, .5, .8]){
    const L = rows.filter(r => r.ratio === ratio), lob = L.filter(r => /lob/.test(r.v.label)).length;
    assert.ok(lob <= .05*L.length, `pendenza ${ratio}: pallonetti e lanci ${pct(lob, L.length)}`);
  }
  const single = rows.filter(r => r.n <= 1).length;
  assert.ok(single >= .98*rows.length, `un solo evento ${pct(single, rows.length)}`);
});

test('colpi completi (3D, preparazione e ritorno): un evento nel colpo, nessuno nella preparazione; pallonetto e schiacciata', () => {
  const CAMS = [{ Hc: 1.1, tiltDeg: 0, aspect: 4/3 }, { Hc: 1.9, tiltDeg: 20, aspect: 16/9 }];
  const WANT = { FH_TOP: 'forehand', BH_TOP: 'backhand', FH_SLICE: 'forehand', BH_FLAT: 'backhand' };
  const rows = [];
  let seed = 100;
  for (const stroke of [...Object.keys(WANT), 'FH_LOB', 'SMASH']) for (const hand of ['right', 'left']) for (const cam of CAMS)
    for (const tempo of [.7, 1]) for (const D of [1.5, 2.5]) for (const [fps, lat] of [[30, 22], [30, 45]]) for (const dropK of [.3, 1]){
      const r = runTrial(MC, { stroke, hand, tempo, D, cam, fps, lat, dropK, seed: seed++, tracker: tracker() });
      const { tFwd, tContact } = r.path, ev = r.events.filter(e => e.ts >= -.05);
      const fwd = ev.find(e => e.ts >= tFwd - .05 && e.ts <= tContact + .35);
      rows.push({ stroke, n: ev.length, prep: ev.some(e => e.ts < tFwd - .05), v: engineView(fwd, hand) });
    }
  const ground = rows.filter(r => WANT[r.stroke]), side = ground.filter(r => r.v.side === WANT[r.stroke]).length;
  assert.ok(side >= .95*ground.length, `lato giusto ${pct(side, ground.length)}`);
  const lobs = ground.filter(r => /lob/.test(r.v.shot || '')).length;
  assert.ok(lobs <= .05*ground.length, `pallonetti nei colpi a rimbalzo ${pct(lobs, ground.length)}`);
  const single = rows.filter(r => r.n <= 1).length, clean = rows.filter(r => !r.prep).length;
  assert.ok(single >= .98*rows.length, `un solo evento ${pct(single, rows.length)}`);
  assert.ok(clean >= .95*rows.length, `nessun evento nella preparazione ${pct(clean, rows.length)}`);
  const L = rows.filter(r => r.stroke === 'FH_LOB'), lob = L.filter(r => /lob/.test(r.v.shot || '')).length;
  assert.ok(lob >= .9*L.length, `pallonetto voluto ${pct(lob, L.length)}`);
  const S = rows.filter(r => r.stroke === 'SMASH'), smash = S.filter(r => r.v.shot === 'smash').length;
  assert.ok(smash >= .8*S.length, `schiacciata ${pct(smash, S.length)}`);
});

test('folla: una seconda mano che entra ed esce non crea colpi e non ruba la mano seguita', () => {
  for (const label of ['Left', 'Right']) for (const size of [.03, .045]){
    const ev = runCrowd(MC, { seed: 10, label, size, tracker: tracker() });
    assert.equal(ev.map(e => `${e.kind}:${e.side}`).join(), 'swing:backhand,swing:backhand', `mano ${label} ${size}: ${JSON.stringify(ev)}`);
    assert.ok(Math.abs(ev[0].ts - 1.7) < .35 && Math.abs(ev[1].ts - 3.3) < .35, ev.map(e => e.ts.toFixed(2)).join());
  }
});

test('lancio di palla: al proprio servizio è un lancio, nello scambio lo stesso gesto non è né un lancio né un pallonetto', () => {
  for (const hand of ['right', 'left']) for (const T of [.25, .35]) for (const dS of [.25, .35]){
    const pathFn = sweep({ dir: hand === 'left' ? -1 : 1, dS: dS/4, ratio: 4, aspect: .75, T, curve: 1, yMid: .5 });
    const serve = runSweep(MC, { pathFn, T, seed: 7, hand, canToss: () => true, tracker: tracker() });
    assert.equal(serve[0]?.kind, 'toss', `${hand} ${T} ${dS}: ${JSON.stringify(serve)}`);
    const rally = runSweep(MC, { pathFn, T, seed: 7, hand, canToss: () => false, tracker: tracker() });
    assert.ok(rally.every(e => e.kind === 'swing' && e.shotType !== 'lob'), `${hand} ${T} ${dS}: ${JSON.stringify(rally)}`);
  }
});

test('lancio rifiutato: passa da _emitSwing (mancino col lato giusto, pausa); quello della webcam non diventa un pallonetto', () => {
  const mc = Object.create(MC.prototype);
  Object.assign(mc, { role: 'p1', phoneState: { orientation: { pitch: 0, roll: 0 } }, _listeners: { swing: [], toss: [], status: [], orientation: [] }, onToss: () => false });
  const swings = []; mc.onSwing = s => swings.push(s);
  const engine = { motionController: mc, phase: 'RALLY', score: { server: 'player' }, playerRole: 'p1', ball: { pos: { x: 0 } }, localActor: { pos: { x: 0 } } };
  const H = new NatpfHand(engine);
  H.set('left');
  assert.equal(mc.handPreference, 'left');
  mc._emitToss({ source: 'keyboard', side: 'forehand', dirX: -.5 });
  assert.equal(swings.length, 1);
  assert.equal(swings[0].side, 'backhand');                      // dritto del destro = rovescio del mancino
  mc._emitToss({ source: 'webcam', side: 'forehand' });
  assert.equal(swings.length, 1);
  // il gioco accetta il lancio solo nel titolo e al proprio servizio
  const at = (phase, server, role = 'p1') => { Object.assign(engine, { phase, score: { server }, playerRole: role }); return mc.canToss(); };
  assert.deepEqual([at('TITLE', 'player'), at('SERVE_STANCE', 'player'), at('SERVE_STANCE', 'opponent'), at('RALLY', 'player'), at('SERVE_STANCE', 'opponent', 'p2')], [true, true, false, false, true]);
  H.set('right');
});

test('istante di cattura dei fotogrammi: dal richiamo della camera quando c’è, altrimenti l’istante dell’invio', () => {
  const mc = Object.create(MC.prototype);
  let cb = null;
  Object.assign(mc, { webcamActive: true, videoElem: { requestVideoFrameCallback: f => { cb = f; } } });
  mc._watchFrames();
  cb(1000, { captureTime: 960 });
  assert.equal(mc._frameCaptureT(1010), 960);
  assert.equal(mc._frameCaptureT(1300), 1300);                    // metadati vecchi: niente
  const old = cb; mc._watchFrames(); let again = 0; mc.videoElem.requestVideoFrameCallback = () => again++;
  old(1100, { captureTime: 1080 });                               // la catena di prima si ferma
  assert.equal(again, 0);
  const plain = Object.create(MC.prototype); Object.assign(plain, { webcamActive: true, videoElem: {} });
  plain._watchFrames();
  assert.equal(plain._frameCaptureT(500), 500);
});

test('diagnostica (onTrack): un richiamo per fotogramma elaborato e uno per colpo, mano trovata e persa', () => {
  const log = [], f = makeFake(MC, { tracker: tracker() });
  f.onTrack = d => log.push(d);
  // swing con la mano che sparisce a metà percorso per 0,6 s
  const pathFn = sweep({ dir: 1, dS: .4, ratio: 0, aspect: .75, T: .25, curve: 1, yMid: .5 });
  const realNow = performance.now; let NOW = 0; performance.now = () => NOW;
  try {
    let inflight = null, frameT = 0;
    f.mpHands = { send: () => { inflight = { capT: frameT, doneT: NOW + 25 }; return Promise.resolve(); } };
    for (let T = 0; T <= 2.4; T += 1/60){
      NOW = T*1000; frameT = Math.floor(T*30)/30; f.videoElem.currentTime = frameT;
      if (inflight && inflight.doneT <= NOW){
        const c = inflight.capT; inflight = null;
        const p = pathFn(Math.max(0, c - .5)), gone = c > 1.2 && c < 1.8;
        f._onHandResults({ multiHandLandmarks: gone ? [] : [handLandmarks({ S: p.S, y: p.y })], multiHandedness: gone ? [] : [{ label: 'Left', score: .9 }] });
      }
      f._processWebcamFrame();
    }
  } finally { performance.now = realNow; }
  const frames = log.filter(d => d.kind === 'frame'), events = log.filter(d => d.kind === 'event');
  assert.ok(frames.length > 40, `fotogrammi ${frames.length}`);
  const h = frames.find(d => d.source === 'hands');
  for (const k of ['t', 'captureT', 'source', 'hands', 'chosen', 'reason', 'x', 'y', 'inferMs']) assert.ok(k in h, k);
  assert.equal(h.hands, 1); assert.equal(h.chosen, 0); assert.ok(h.captureT <= h.t);
  assert.equal(events.length, 1);
  assert.equal(events[0].side, 'backhand'); assert.equal(events[0].source, 'hands'); assert.ok(events[0].reason);
  assert.deepEqual(log.filter(d => d.kind === 'lost' || d.kind === 'found').map(d => d.kind), ['found', 'lost', 'found']);
  // senza aggancio non succede niente di diverso
  const f2 = makeFake(MC, { tracker: tracker() });
  assert.doesNotThrow(() => f2._processWebcamFrame());
});

test('flusso ottico di riserva: con la mano persa per il mosso il colpo resta; solo flusso: riconosciuto; passanti: niente', () => {
  let seed = 40;
  for (const side of ['FH', 'BH']) for (const T of [.18, .3]){
    const pathFn = sweep({ dir: side === 'FH' ? -1 : 1, dS: .45, ratio: 0, aspect: .75, T, curve: 1, yMid: .5 });
    for (const [blurLo, blurHi] of [[8, 20], [-2, -1]]){
      const r = runDropout(MC, { pathFn, T, seed: seed++, exposure: 1/30, blurLo, blurHi, tracker: tracker() });
      const labels = r.events.map(e => engineView(e, 'right').label);
      assert.ok(labels.length === 1 && labels[0].startsWith(side + '·'), `${side} T ${T} mosso ${blurLo}: ${labels}`);
    }
  }
  // nessuna mano vista: il flusso conta solo nella zona centrale; un passante sul bordo dell'immagine non fa colpi
  const r = runDropout(MC, { pathFn: () => ({ S: .5, y: .55 }), T: 2.5, seed: 3, blurLo: -2, blurHi: -1, passante: t => ({ S: .04 + .03*Math.sin(4*t), y: .45 }), tracker: tracker() });
  assert.equal(r.events.length, 0, JSON.stringify(r.events));
  // ... e uno che attraversa la zona centrale camminando (moto lungo e uniforme, non uno swing)
  for (const speed of [.35, .6, 1]){
    const c = runDropout(MC, { pathFn: () => ({ S: .55, y: .55 }), T: 2.5, seed: 9, blurLo: -2, blurHi: -1, passante: t => ({ S: .05 + speed*t, y: .45 }), tracker: tracker() });
    assert.equal(c.events.length, 0, `passante a ${speed}: ${JSON.stringify(c.events)}`);
  }
});

test('come la prova nel browser (test/e2e/lan-e2e.mjs, webcam): pose lente senza colpi, poi lo swing fa partire un colpo', () => {
  // stessi landmark sintetici e stessi tempi della prova e2e: un risultato nuovo a ogni fotogramma elaborato (60 Hz),
  // mano spostata a passi ogni 30 ms (pose) e 34 ms (swing)
  const lm = ({ x, y, angle }) => {
    const len = .12, ux = Math.sin(angle), uy = -Math.cos(angle), vx = Math.cos(angle), vy = Math.sin(angle), p = (dx, dy) => ({ x: x + dx, y: y + dy, z: 0 });
    const l = Array.from({ length: 21 }, () => p(0, 0));
    l[9] = p(ux*len, uy*len); l[5] = p(ux*len*.95 - vx*len*.3, uy*len*.95 - vy*len*.3); l[17] = p(ux*len*.8 + vx*len*.35, uy*len*.8 + vy*len*.35);
    return l;
  };
  const f = makeFake(MC, { tracker: tracker() }), hand = { x: .5, y: .6, angle: 0 }, plan = [];
  let t = 0;
  const hold = (pose, ms = 500) => { const from = { ...hand, ...plan.reduce((a, p) => ({ ...a, ...p.set }), {}) }; for (let i = 1; i <= 20; i++){ const set = {}; for (const k in pose) set[k] = from[k] + (pose[k] - from[k])*i/20; plan.push({ at: t += 30, set }); } t += ms; };
  for (let view = 0; view < 2; view++){
    hold({ x: .5, y: .6, angle: 0 }, 900); hold({ x: .65 }); hold({ x: .35 }); hold({ x: .5, y: .72 }); hold({ y: .48 }); hold({ y: .6, angle: 0 }); hold({ angle: -.5 }); hold({ angle: 0 }, 400);
  }
  const swingAt = t + 300;
  for (let i = 0; i <= 5; i++) plan.push({ at: swingAt + 34*i, set: { x: .66 - i*.07 } });
  const realNow = performance.now; let NOW = 0; performance.now = () => NOW;
  try {
    for (let ms = 0, k = 0; ms <= swingAt + 1500; ms += 1000/60){
      NOW = ms; while (k < plan.length && plan[k].at <= ms) Object.assign(hand, plan[k++].set);
      f.videoElem.currentTime = Math.floor(ms/33)/30;
      f.latestHandLandmarks = lm(hand); f.latestHandSeenAt = NOW; f._hasNewHandResult = true;
      f._processWebcamFrame();
    }
  } finally { performance.now = realNow; }
  const before = f.events.filter(e => e.t < swingAt), after = f.events.filter(e => e.t >= swingAt);
  assert.equal(before.length, 0, `colpi durante le pose: ${JSON.stringify(before)}`);
  assert.deepEqual(after.map(e => `${e.kind}:${e.side}`), ['swing:backhand']);
});

test('riconoscimento: un salto tra mano e flusso ottico non è un colpo; lo swing dopo un salto lontano dal riposo sì', () => {
  const tr = createStrokeTracker(), ev = [];
  for (let t = 0; t <= 1000; t += 33) ev.push(...tr.push({ t, x: .3, y: .5, src: 'hands', scale: .04 }));
  for (let t = 1033; t <= 2000; t += 33) ev.push(...tr.push({ t, x: .7, y: .5, src: 'flow' }));
  assert.equal(ev.length, 0);
  // il salto all'indietro e lo swing che va ben oltre il punto di partenza (come lo swing finto della prova nel browser)
  const t2 = createStrokeTracker(), out = []; let x = .5;
  for (let t = 0; t <= 4000; t += 1000/60){
    for (let i = 0; i <= 5; i++) if (t >= 3000 + 34*i) x = .34 + .07*i;
    out.push(...t2.push({ t, x, y: .53, src: 'hands', scale: .09 }));
  }
  assert.deepEqual(out.map(e => `${e.type}:${e.side}`), ['swing:backhand']);
});

test('nel gioco (motore e interfaccia veri): la mano scelta e il lancio accettato arrivano al controller della webcam', async () => {
  const { makeWorld } = await import('./ui-world.mjs');
  const w = await makeWorld({ controller: 'webcam' }), mc = w.E.motionController;
  assert.equal(typeof mc.canToss, 'function');
  assert.equal(mc.handPreference, 'right');
  const accepted = () => w.E.phase === 'TITLE' || (w.E.phase === 'SERVE_STANCE' && w.E.score.server === 'player');
  assert.equal(mc.canToss(), accepted(), w.E.phase);
  w.ui.hand.set('left');
  assert.equal(mc.handPreference, 'left');
  w.ui.hand.set('right');
});
