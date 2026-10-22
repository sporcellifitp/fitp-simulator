// Colpi della webcam (src/natpf/webcam_strokes.js dentro motion_controls.js): sottoinsieme veloce del banco completo
// scripts/audit/webcam-sweep.mjs con le stesse soglie d'accettazione. Swing secchi in 2D per pendenza (destro e
// mancino, 4:3 e 16:9), colpi completi in 3D, folla (anche con la mano di chi gioca
// persa), tremolio, lancio del servizio, scelta della mano, mancino nei ripieghi,
// istante di cattura dei fotogrammi, flusso ottico di riserva, aggancio della diagnostica (onTrack) e, nel motore
// vero, lo swing che arriva prima della palla.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionController } from '../src/motion_controls.js';
import { NatpfHand } from '../src/natpf/natpf_hand.js';
import { createStrokeTracker, pickHand, trackOthers, HAND_KEEP, handPoint, handSize } from '../src/natpf/webcam_strokes.js';
import { runSweep, runTrial, runCrowd, runDropout, runScene, runTwoPeople, engineSwings, sweep, engineView, handLandmarks, makeFake, gauss, MODEL_LABEL } from './webcam-sim.mjs';

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
  // la mano seguita sparisce: si aspetta (persa) invece di saltare sull'altra, anche dopo mezzo secondo (prima a
  // 0,5 s si sceglieva da capo e vinceva l'altra); per HAND_KEEP si riprende solo una mano della taglia di chi gioca,
  // anche altrove; dopo si sceglie di nuovo (al chiosco arriva un'altra persona)
  assert.deepEqual(pickHand([{ lm: other, label: 'Left', score: .99 }], { track, t: 1100 }), { index: -1, reason: 'persa' });
  assert.deepEqual(pickHand([{ lm: other, label: 'Left', score: .99 }], { track, t: 1700 }), { index: -1, reason: 'persa' });
  const back = handLandmarks({ S: .7, y: .5, size: .042 });
  assert.deepEqual(pickHand([{ lm: other, label: 'Left', score: .99 }, { lm: back, label: 'Right', score: .9 }], { track, t: 3000 }), { index: 1, reason: 'ritrovata' });
  assert.equal(pickHand([{ lm: other, label: 'Left', score: .99 }], { track, t: 1000 + HAND_KEEP + 1 }).index, 0);
  // un'altra mano già vista insieme a quella seguita (trackOthers) non la sostituisce nemmeno se ha la sua taglia
  // (abbastanza vicina da passare la continuità: senza l'elenco delle altre mani la si prendeva)
  const twin = handLandmarks({ S: .4, y: .5, size: .04 }), others = trackOthers([], [{ lm: twin }, { lm: mine }], { chosen: 1, t: 1000 });
  assert.equal(others.length, 1);
  assert.deepEqual(pickHand([{ lm: twin, label: 'Right', score: .9 }], { track, t: 1066 }), { index: 0, reason: 'continuità' });
  assert.deepEqual(pickHand([{ lm: twin, label: 'Right', score: .9 }], { track, others, t: 1066 }), { index: -1, reason: 'persa' });
  assert.deepEqual(pickHand([{ lm: twin, label: 'Right', score: .9 }], { track, others, t: 2500 }), { index: -1, reason: 'persa' });
});

test('webcam con più persone, mano persa e tremolio: nessuno swing fantasma, la propria mano ritrovata gioca', () => {
  const aspect = .75, fmt = ev => ev.map(e => `${e.kind}:${e.side}@${e.ts.toFixed(2)}`).join() || '-';
  // chi gioca: mano destra ferma (in pronto) al centro-destra; MODEL_LABEL.right è la lateralità vista dal modello
  const still = (c, rng, { S = .62, y = .55, trem = 0, f = 9 } = {}) => ({ lm: handLandmarks({ S: S + gauss(rng)*.003 + trem*Math.sin(2*Math.PI*f*c), y: y + gauss(rng)*.003 + .6*trem*Math.cos(2*Math.PI*f*1.13*c), size: .04, aspect }), label: MODEL_LABEL.right });
  // un'altra persona: la mano ferma a S0 e uno swing di dS larghezze in 0,25 s che parte a t0
  const other = (t0, { dir = -1, dS = .35, S0 = .3, y = .45, label = MODEL_LABEL.right } = {}) => {
    const sw = sweep({ dir, dS, ratio: .1, aspect, T: .25, curve: 1, yMid: y });
    return c => { const p = sw(Math.max(0, Math.min(.25, c - t0))); return { lm: handLandmarks({ S: p.S - (sw(0).S - S0), y: p.y, size: .04, aspect }), label }; };
  };
  const run = (handsAt, total = 5) => runScene(MC, { total, handsAt, seed: 3, tracker: tracker() });
  const lost = (c, a, b) => c >= a && c < b;
  const scenes = {
    'chi guarda fa due swing, chi gioca resta visibile': (c, rng) => [other(1.2)(c), other(2.4, { dir: 1 })(c), still(c, rng)],
    'mano di chi gioca persa 0,8 s, chi guarda fa uno swing': (c, rng) => [other(1.5, { dS: .4 })(c), ...(lost(c, 1, 1.8) ? [] : [still(c, rng)])],
    'persa 1,5 s, swing di chi guarda': (c, rng) => [other(2, { dS: .4 })(c), ...(lost(c, 1, 2.5) ? [] : [still(c, rng)])],
    'persa 3 s, swing di chi guarda': (c, rng) => [other(3, { dS: .4 })(c), ...(lost(c, 1, 4) ? [] : [still(c, rng)])],
    'persa 1,5 s, chi guarda con la mano opposta': (c, rng) => [other(2, { dS: .4, label: MODEL_LABEL.left })(c), ...(lost(c, 1, 2.5) ? [] : [still(c, rng)])],
    // limite noto (docs/NATPF_WEBCAM.md): persa la mano di chi gioca, per HAND_KEEP si riprende una mano della sua taglia
    // anche lontano, quindi una mano nuova della stessa taglia che entra in quel tempo (mai vista prima) viene presa e il
    // suo swing conta (scena «mano nuova che entra lontano dopo 0,6 s e si avvicina con uno swing»)
  };
  for (const [name, handsAt] of Object.entries(scenes)) assert.equal(fmt(run(handsAt)), '-', name);
  // chi passa davanti alla webcam: la mano di chi gioca sparisce, una mano grande attraversa l'immagine
  const passer = c => ({ lm: handLandmarks({ S: -.1 + .6*(c - 1.1), y: .6 + .02*Math.sin(9*c), size: .075, aspect }), label: MODEL_LABEL.right });
  assert.equal(fmt(run((c, rng) => [...(c >= 1.1 && c < 3.3 ? [passer(c)] : []), ...(lost(c, 1, 3.4) ? [] : [still(c, rng)])])), '-', 'passante');
  // tremolio della mano ferma: fino a 0,015 larghezze (3,6 cm a 2 m) da 4 a 12 Hz, 0,02 (4,8 cm) fino a 9 Hz: niente
  // colpi (il tremolio vero è di millimetri; 4,8 cm a 12 Hz fa colpi in 6 semi su 20, docs/NATPF_RACCHETTA_VIRTUALE.md)
  for (const trem of [.005, .01, .015, .02]) for (const f of [4, 6, 9, 12]){
    if (trem > .015 && f > 9) continue;
    assert.equal(fmt(run((c, rng) => [still(c, rng, { trem, f })], 6)), '-', `tremolio ${trem} a ${f} Hz`);
  }
  // chi gioca ritrovato dopo 0,9 s (vicino a dove era), con chi guarda accanto: il suo rovescio conta, una volta
  const bh = sweep({ dir: 1, dS: .4, ratio: .2, aspect, T: .25, curve: 1, yMid: .55 });
  const me = (c, rng) => { const p = bh(Math.max(0, Math.min(.25, c - 2.2))); return { lm: handLandmarks({ S: p.S + .12 + gauss(rng)*.003, y: p.y, size: .04, aspect }), label: MODEL_LABEL.right }; };
  const ev = run((c, rng) => [other(1.6, { S0: .2 })(c), ...(lost(c, 1, 1.9) ? [] : [me(c, rng)])], 4);
  assert.equal(ev.map(e => `${e.kind}:${e.side}`).join(), 'swing:backhand', fmt(ev));
  assert.ok(Math.abs(ev[0].ts - 2.3) < .2, fmt(ev));
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

test('colpi completi (3D, preparazione e ritorno): un evento, prima dell\'impatto, nessuno nella preparazione; schiacciata', () => {
  const CAMS = [{ Hc: 1.1, tiltDeg: 0, aspect: 4/3 }, { Hc: 1.9, tiltDeg: 20, aspect: 16/9 }];
  const WANT = { FH_TOP: 'forehand', BH_TOP: 'backhand', FH_SLICE: 'forehand', BH_FLAT: 'backhand' };
  const rows = [];
  let seed = 100;
  for (const stroke of [...Object.keys(WANT), 'FH_LOB', 'SMASH']) for (const hand of ['right', 'left']) for (const cam of CAMS)
    for (const tempo of [.7, 1]) for (const D of [1.5, 2.5]) for (const [fps, lat] of [[30, 22], [30, 45]]) for (const dropK of [.3, 1]){
      const r = runTrial(MC, { stroke, hand, tempo, D, cam, fps, lat, dropK, seed: seed++, tracker: tracker() });
      const { tFwd, tContact } = r.path, ev = r.events.filter(e => e.ts >= -.05);
      const fwd = ev.find(e => e.ts >= tFwd - .05 && e.ts <= tContact + .35), conf = r.confirms.find(c => c.ts >= tFwd - .05);
      rows.push({ stroke, n: ev.length, prep: ev.some(e => e.ts < tFwd - .05), v: engineView(fwd, hand), dt: fwd ? 1000*(fwd.ts - tContact) : null, conf: conf && engineView({ ...conf, kind: 'swing' }, hand) });
    }
  const ground = rows.filter(r => WANT[r.stroke]), side = ground.filter(r => r.v.side === WANT[r.stroke]).length;
  assert.ok(side >= .95*ground.length, `lato giusto ${pct(side, ground.length)}`);
  const lobs = ground.filter(r => /lob/.test(r.v.shot || '')).length;
  assert.ok(lobs <= .05*ground.length, `pallonetti nei colpi a rimbalzo ${pct(lobs, ground.length)}`);
  const single = rows.filter(r => r.n <= 1).length, clean = rows.filter(r => !r.prep).length;
  assert.ok(single >= .98*rows.length, `un solo evento ${pct(single, rows.length)}`);
  assert.ok(clean >= .95*rows.length, `nessun evento nella preparazione ${pct(clean, rows.length)}`);
  // il colpo arriva al gioco prima dell'impatto (il gioco lo tiene fino allo sweet spot): mediana ≤ 0, 90° ≤ +60 ms
  const dts = ground.map(r => r.dt).filter(v => v != null).sort((a, b) => a - b), at = p => dts[Math.floor(p*(dts.length - 1))];
  assert.ok(at(.5) <= 0 && at(.9) <= 60, `evento − impatto: mediana ${at(.5).toFixed(0)} ms, 90° ${at(.9).toFixed(0)} ms`);
  // pallonetto voluto: con la camera di fronte la salita ripida arriva dopo l'impatto, quando il colpo anticipato è già
  // partito (col lato giusto); il tipo lo dice solo la conferma per la diagnostica
  const L = rows.filter(r => r.stroke === 'FH_LOB'), lobSide = L.filter(r => r.v.side === 'forehand').length, lobConf = L.filter(r => /lob/.test(r.conf?.shot || '')).length;
  assert.ok(lobSide >= .95*L.length, `pallonetto voluto, lato giusto ${pct(lobSide, L.length)}`);
  assert.ok(lobConf >= .6*L.length, `pallonetto voluto, nella conferma ${pct(lobConf, L.length)}`);
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

// Prove obbligatorie della racchetta virtuale (docs/NATPF_RACCHETTA_VIRTUALE.md §3): 9 più persone, 10 perdita del
// tracciamento, 11 tremolio. Chi gioca fa un dritto a 2,8 s e un rovescio a 4,6 s (runTwoPeople)
const twoStrokes = r => r.events.map(e => `${e.ts.toFixed(2)} ${e.side}`).join(' | ');
const isTwoStrokes = r => r.events.length === 2 && r.events[0].side === 'forehand' && r.events[1].side === 'backhand' && Math.abs(r.events[0].ts - 2.9) < .3 && Math.abs(r.events[1].ts - 4.7) < .3;

test('più persone (prova 9): la mano di chi gioca resta la sua; chi sta dietro o accanto non fa colpi e non la sostituisce quando si perde', () => {
  // prima la continuità durava 0,5 s con un raggio che cresceva di 2,5 larghezze al secondo: senza la mano di chi gioca
  // per pochi fotogrammi si prendeva quella dell'altra persona (il salto era un colpo), dopo 0,5 s si sceglieva da capo
  // (nel banco: 28 scenari giusti su 72, ora 72)
  for (const other of [{ S: .3, y: .42, size: .028 }, { S: .12, y: .5, size: .038 }]) for (const label of ['Left', 'Right']) for (const lose of [null, [1.2, 1.5], [1.2, 2.3], [3.0, 3.6]]){
    const r = runTwoPeople(MC, { seed: 2, other, label, lose, tracker: tracker() }), tag = JSON.stringify({ other, label, lose });
    assert.ok(isTwoStrokes(r), `${tag}: ${twoStrokes(r)}`);
    // ritrovata per continuità o per taglia, mai scegliendo da capo tra le mani in vista
    assert.ok(r.picks.filter(p => p.kind === 'found').slice(1).every(p => ['continuità', 'ritrovata'].includes(p.reason)), `${tag}: ${JSON.stringify(r.picks)}`);
  }
});

test('perdita del tracciamento (prova 10, webcam): mano persa ferma, a lungo o mentre rientra dopo un colpo, nessun colpo fantasma', () => {
  // la mano ritrovata dopo più di 0,5 s riparte da capo (il viaggio dal punto in cui si ritrova): niente colpi dal salto,
  // e il colpo dopo arriva
  for (const lose of [[1.2, 1.5], [1.2, 2.3], [.8, 2.6], [3.0, 3.6], [3.1, 3.3]]) for (const seed of [1, 4]){
    const r = runTwoPeople(MC, { seed, other: null, lose, tracker: tracker() });
    assert.ok(isTwoStrokes(r), `${JSON.stringify({ lose, seed })}: ${twoStrokes(r)}`);
  }
});

test('tremolio (prova 11, webcam): i punti della mano che tremano non fanno colpi e i colpi restano', () => {
  // rumore dei punti fino a 0,008 larghezze (5 px su 640: mano piccola, luce scarsa), colpi a 2,2 s come in uno scambio.
  // Limiti misurati (docs/NATPF_WEBCAM.md): a 0,01 un colpo in più ogni 12 prove; con colpi a 1,8 s il ritorno dopo il
  // colpo non vede la mano ferma e dura fino a recMax, e il colpo dopo si perde (anche prima di queste modifiche)
  for (const jitter of [.006, .008]) for (const seed of [1, 2, 3]){
    const r = runTwoPeople(MC, { seed, other: null, jitter, strokes: [[2.8, -1], [5.0, 1]], total: 6.6, tracker: tracker() });
    const ok = r.events.length === 2 && r.events[0].side === 'forehand' && r.events[1].side === 'backhand' && Math.abs(r.events[1].ts - 5.1) < .3;
    assert.ok(ok, `${JSON.stringify({ jitter, seed })}: ${twoStrokes(r)}`);
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
  // il colpo era anticipato: la conferma alla fine del gesto arriva solo alla diagnostica
  const conf = log.filter(d => d.kind === 'confirm');
  assert.equal(conf.length, 1); assert.equal(conf[0].side, 'backhand'); assert.match(conf[0].reason, /come il colpo anticipato/);
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
  // come nella prova e2e conta che parta un colpo, uno solo: lo swing finto comincia con un salto della mano di lato
  assert.equal(after.length, 1, JSON.stringify(after)); assert.equal(after[0].kind, 'swing');
});

test('riconoscimento: un salto tra mano e flusso ottico non è un colpo; uno swing di lato è un solo colpo, anticipato', () => {
  const tr = createStrokeTracker(), ev = [];
  for (let t = 0; t <= 1000; t += 33) ev.push(...tr.push({ t, x: .3, y: .5, src: 'hands', scale: .04 }));
  for (let t = 1033; t <= 2000; t += 33) ev.push(...tr.push({ t, x: .7, y: .5, src: 'flow' }));
  assert.equal(ev.length, 0);
  // swing di lato da fermo verso destra (rovescio del destro): il colpo parte nella prima metà, poi solo la conferma
  const t2 = createStrokeTracker(), out = []; let x = .34;
  for (let t = 0; t <= 4000; t += 1000/60){
    for (let i = 0; i <= 10; i++) if (t >= 3000 + 17*i) x = .34 + .35*(1 - Math.cos(Math.PI*i/10))/2;
    for (const e of t2.push({ t, x, y: .53, src: 'hands', scale: .09 })) out.push({ ...e, at: t - 3000 });
  }
  assert.deepEqual(out.map(e => `${e.type}:${e.side}`), ['swing:backhand', 'confirm:backhand']);
  assert.ok(out[0].early && out[0].at < 90, `colpo a ${out[0].at.toFixed(0)} ms di uno swing di 170 ms`);
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
  // una sola impostazione (P1): la stessa mano va al telefono, e quella cambiata sulla pagina del telefono torna alla webcam
  assert.equal(w.E.natpfPhone.hand, 'left');
  w.E.natpfPhone._onPhoneHand('right');
  assert.equal(w.ui.hand.hand, 'right'); assert.equal(mc.handPreference, 'right'); assert.equal(w.E.natpfPhone.hand, 'right');
  w.ui.hand.set('right');
});

test('nel motore: lo swing della webcam arriva prima della palla, viene tenuto fino al punto d\'impatto e colpisce dentro la finestra', async () => {
  // colpi a rimbalzo simulati: il colpo che esce dal riconoscimento e quando arriva rispetto all'impatto del gesto
  const CAMS = [{ Hc: 1.1, tiltDeg: 0, aspect: 4/3 }, { Hc: 1.9, tiltDeg: 20, aspect: 16/9 }], swings = [];
  let seed = 500;
  for (const stroke of ['FH_TOP', 'BH_TOP', 'FH_FLAT', 'BH_SLICE']) for (const cam of CAMS) for (const [fps, lat] of [[30, 22], [30, 45]]) for (const tempo of [.7, 1, 1.4]){
    const r = runTrial(MC, { stroke, tempo, cam, fps, lat, D: 2, seed: seed++, tracker: tracker() });
    const ev = r.events.find(e => e.kind === 'swing' && e.ts >= r.path.tFwd - .05);
    if (ev) swings.push({ dt: ev.ts - r.path.tContact, side: ev.side, shotType: ev.shotType, speed: ev.speed, dirX: ev.dirX, dirY: ev.dirY });
  }
  assert.ok(swings.length >= 45, `colpi riconosciuti ${swings.length}/48`);
  // nel motore: la palla della CPU arriva, il gesto ha l'impatto quando la palla è allo sweet spot e il colpo arriva
  // al gioco con lo stesso scarto. Prima (evento ~0,15–0,25 s dopo l'impatto) la palla era già 2–4 m oltre: VERY LATE
  // finestra d'impatto (natpf_impact.js): EARLY, PERFECT e LATE sono colpi dentro la finestra (in anticipo incrociato, in
  // ritardo lungolinea); le palle che vanno fuori chi gioca le lascia andare e non contano
  const all = await engineSwings(swings, { difficulty: 'casual' }), out = all.filter(o => o.grade !== 'lasciata'), n = out.length, by = g => out.filter(o => o.grade === g).length;
  const held = out.filter(o => o.held).length, onTime = by('PERFECT') + by('EARLY') + by('LATE'), bad = by('VERY LATE') + by('WHIFF') + by('niente');
  assert.ok(n >= .9*all.length, `lasciate ${all.length - n}/${all.length}`);
  assert.ok(onTime >= .88*n && bad <= .08*n && held >= .25*n, `tenuti ${pct(held, n)}, dentro la finestra ${pct(onTime, n)}, VERY LATE o a vuoto ${pct(bad, n)}: ${JSON.stringify(all.map(o => o.grade))}`);
});
