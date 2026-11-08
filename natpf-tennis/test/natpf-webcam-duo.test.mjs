// Webcam per due (stesso schermo con una webcam): src/natpf/webcam_duo.js. P1 a sinistra, P2 a destra nell'immagine
// specchiata; ogni colpo esce con il suo giocatore; la mano di uno non diventa quella dell'altro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DuoTracker, widestCamera, DUO, duoFlowCols } from '../src/natpf/webcam_duo.js';
import { argonFlowBlob, ARGON_TRACK } from '../src/natpf/webcam_argon_track.js';
import { SCENES } from './webcam-duo-scenes.mjs';

// Corsie larghe e tolleranti (richiesta del 30/10): scene con giocatori che si muovono (test/webcam-duo-scenes.mjs),
// dieci semi ciascuna. Con il codice di prima: attraversamento senza colpo (mano mai ripresa), attraversamento da solo
// e una mano sola al centro con il colpo all'altro giocatore, incrocio con le mani scambiate e nessun colpo.
const seeds = Array.from({ length: 10 }, (_, i) => i + 1);
const whoSide = r => r.events.map(e => `${e.who}·${e.side}`);
test('due giocatori si avvicinano fino a sovrapporsi e si riallontanano: nessuno scambio di mani, nessun colpo', () => {
  for (const seed of seeds){ const r = SCENES.avvicinamento(DuoTracker, { seed }); assert.equal(r.swaps, 0, `seme ${seed}`); assert.deepEqual(r.events, [], `seme ${seed}`); }
});
test('il P1 passa oltre il centro e perde la mano più a lungo di pickMs: la riprende lì e il suo colpo è suo', () => {
  for (const seed of seeds){
    const r = SCENES.attraversamento(DuoTracker, { seed });
    assert.equal(r.swaps, 0, `seme ${seed}`); assert.deepEqual(whoSide(r), ['p1·backhand'], `seme ${seed}`);
    assert.ok(r.tr.split() > .6, `confine spostato con le case: ${r.tr.split()}`);
  }
});
test('il P1 oltre il centro con il P2 assente: la mano del P1 non diventa del P2 (niente colpi finti del P2)', () => {
  for (const seed of seeds){ const r = SCENES.attraversamentoDaSolo(DuoTracker, { seed }); assert.equal(r.swaps, 0, `seme ${seed}`); assert.deepEqual(whoSide(r), ['p1·backhand'], `seme ${seed}`); }
});
test('una sola mano in vista va a chi l\'aveva, anche appena oltre il centro', () => {
  for (const seed of seeds){
    for (const [name, want] of [['unaManoSola', 'p2·forehand'], ['unaManoSolaAlCentro', 'p2·backhand']]){
      const r = SCENES[name](DuoTracker, { seed });
      assert.equal(r.swaps, 0, `${name} seme ${seed}`); assert.deepEqual(whoSide(r), [want], `${name} seme ${seed}`);
    }
  }
});
test('mani che si incrociano veloci: ognuno segue la sua (velocità prevista), un colpo per ciascuno col lato giusto', () => {
  for (const seed of seeds){
    const r = SCENES.incrocio(DuoTracker, { seed });
    assert.deepEqual(whoSide(r).sort(), ['p1·backhand', 'p2·forehand'], `seme ${seed}`);
    assert.ok(Math.abs(r.tr.lanes.p1.hand.x - .42) < .02 && Math.abs(r.tr.lanes.p2.hand.x - .58) < .02, `seme ${seed}: ${r.tr.lanes.p1.hand.x} ${r.tr.lanes.p2.hand.x}`);
    assert.ok(r.swaps <= 3, `seme ${seed}: ${r.swaps} fotogrammi scambiati nell'istante in cui le mani si toccano`);
  }
});
// Revisione del 31/10: con le mani libere in vista (il modello ne cerca quattro, DUO_HANDS) restavano scambi di mani.
// Una corsia agganciata accettava qualunque mano compatibile (dopo un buco di 130–200 ms anche la mano libera dell'altro
// giocatore, a mezza immagine) e l'assegnazione sommava i valori. Con il codice di prima: caso A 73 fotogrammi scambiati
// per seme, B 56, C 91 (P2 assente) e 113 (P2 in vista fino a 1,5 s) con colpi doppi o del giocatore sbagliato,
// attraversamento con la mano libera senza il rovescio del P1 (corsia sulla mano libera)
const run10 = (name, o = {}) => seeds.map(seed => ({ seed, r: SCENES[name](DuoTracker, { seed, ...o }) }));
test('mani libere di entrambi in vista: nessuno scambio, la corsia segue la racchetta, colpi giusti', () => {
  for (const [name, want] of [['avvicinamentoMani', []], ['attraversamentoMani', ['p1·backhand']], ['incrocioMani', ['p1·backhand', 'p2·forehand']]]){
    for (const { seed, r } of run10(name)){
      const ev = whoSide(r);
      assert.deepEqual(name === 'incrocioMani' ? ev.sort() : ev, want, `${name} seme ${seed}`);
      assert.ok(r.swaps <= (name === 'incrocioMani' ? 3 : 0), `${name} seme ${seed}: ${r.swaps} fotogrammi scambiati`);
      assert.equal(r.onFree, 0, `${name} seme ${seed}: corsia sulla mano libera`);
    }
  }
});
test('caso A: il P2 perde la mano per 0,2 s accanto alla mano libera del P1: la corsia del P2 non ci salta e il suo dritto è suo', () => {
  for (const { seed, r } of run10('manoLiberaBuco')){
    assert.equal(r.swaps, 0, `seme ${seed}`); assert.deepEqual(whoSide(r), ['p2·forehand'], `seme ${seed}`);
    assert.ok(Math.abs(r.tr.lanes.p2.hand.x - .56) < .02 && Math.abs(r.tr.lanes.p1.hand.x - .30) < .02, `seme ${seed}`);
  }
});
test('caso B: il modello perde il P2 per 170 ms a metà dritto: nessun salto sulla mano libera del P1', () => {
  for (const { seed, r } of run10('bucoNelDritto')){
    assert.equal(r.swaps, 0, `seme ${seed}`); assert.deepEqual(whoSide(r), ['p2·forehand'], `seme ${seed}`);
    assert.ok(Math.abs(r.tr.lanes.p2.hand.x - .55) < .02, `seme ${seed}: ${r.tr.lanes.p2.hand.x}`);
  }
});
test('caso C: rovescio a due mani del P1 oltre il centro: il P1 resta sulla racchetta, il P2 non la prende (un colpo per volta, del P1)', () => {
  for (const p2Until of [0, 1.5, 99]) for (const { seed, r } of run10('rovescioADueMani', { p2Until })){
    assert.equal(r.swaps, 0, `P2 fino a ${p2Until} s, seme ${seed}`); assert.equal(r.onFree, 0, `P2 fino a ${p2Until} s, seme ${seed}`);
    assert.deepEqual(whoSide(r), ['p1·backhand', 'p1·forehand'], `P2 fino a ${p2Until} s, seme ${seed}`);
  }
});
test('corsia agganciata: dopo un buco non salta sulla mano vista insieme alla sua e riprende la sua più in là', () => {
  const tr = new DuoTracker(); let t = 1000;
  // P1 a 0,30 con la mano libera a 0,40, P2 a 0,66; il P2 sparisce per 150 ms: la sua corsia resta vuota
  for (let i = 0; i < 15; i++){ t += DT; tr.hands([L(.3, .55, .045), L(.4, .62, .042), L(.66, .55, .045)], t); }
  for (let i = 0; i < 5; i++){ t += DT; tr.hands([L(.3, .55, .045), L(.4, .62, .042)], t); assert.equal(tr.lanes.p2.handNow, false, `fotogramma ${i}`); }
  assert.ok(Math.abs(tr.lanes.p1.hand.x - .3) < 1e-9);
  // la mano del P2 ritorna più in là (0,52): è sua
  t += DT; tr.hands([L(.3, .55, .045), L(.4, .62, .042), L(.52, .55, .045)], t);
  assert.ok(Math.abs(tr.lanes.p2.hand.x - .52) < 1e-9);
  // valori non finiti dal modello: ignorati
  t += DT; assert.deepEqual(tr.hands([L(NaN, .5), [{ x: Infinity, y: .5 }], null], t), []);
});

// Revisione indipendente dopo 5c50891 (31/10): mani piccole (2–3 m con la camera 16:9: grandezza 0,026, proporzioni
// 0,5625) e il modello a 10–30 risultati al secondo. Il confronto è con la base ada351d (le corsie di prima delle mani
// libere): stessi colpi, nessuno scambio. Con 5c50891 (10 semi): dritto veloce 30 prove sbagliate su 180, tutte con il
// P1 assente (colpi del P1 non suoi: il limite di salto valeva tra due risultati consecutivi); caso B con la mano piccola
// senza il dritto in 109 prove su 120 (la corsia non riprendeva la sua mano dopo il buco; la base ada351d dava il dritto
// ma in 113 saltava sulla mano libera del P1); due mani vicine con la corsia sulla mano libera in 159 prove su 180 (base
// 4) e in 8 colpi «p2·forehand» del P2 assente (l'etichetta della mano libera passava alla racchetta e ci restava).
const small = { size: .026, aspect: .5625 };
test('limite di salto della corsia agganciata: solo dopo un buco, dalla posizione prevista, con lo spostamento possibile nel buco', () => {
  // mano piccola (0,026, camera 16:9) del P2 ferma a 0,75, il P1 a 0,10; il P2 manca per cinque risultati (200 ms: oltre
  // questo buco il limite è più severo di quello di velocità, argonSameHand)
  const H = (S, y = .55) => L(S, y, .026*.75/.5625);
  const setup = () => {
    const tr = new DuoTracker(); let t = 1000;
    for (let i = 0; i < 10; i++){ t += DT; tr.hands([H(.10), H(.75)], t, .5625); }
    for (let i = 0; i < 5; i++){ t += DT; tr.hands([H(.10)], t, .5625); }
    return { tr, t: t + DT };
  };
  const reach = Math.max(DUO.jumpMin, DUO.jumpHands*.026) + DUO.jumpSpeed*.026*.2;
  // oltre il limite (dalla posizione prevista, ferma): non è del P2
  let { tr, t } = setup(); tr.hands([H(.10), H(.75 - reach - .015)], t, .5625);
  assert.equal(tr.lanes.p2.handNow, false);
  // entro il limite: è del P2
  ({ tr, t } = setup()); tr.hands([H(.10), H(.75 - reach + .015)], t, .5625);
  assert.equal(tr.lanes.p2.handNow, true); assert.ok(Math.abs(tr.lanes.p2.hand.x - (.75 - reach + .015)) < 1e-9);
  // senza buco il salto dello stesso tempo è limitato solo dalla velocità (argonSameHand): a 10 Hz, 0,2 in 100 ms è del P2
  const tr2 = new DuoTracker(); let t2 = 1000;
  for (let i = 0; i < 10; i++){ t2 += 100; tr2.hands([H(.10), H(.75)], t2, .5625); }
  t2 += 100; tr2.hands([H(.10), H(.55)], t2, .5625);
  assert.ok(tr2.lanes.p2.handNow && Math.abs(tr2.lanes.p2.hand.x - .55) < 1e-9, 'dritto veloce tra due risultati consecutivi');
});
test('dritto veloce del P2 a 10, 15 e 30 Hz con la mano piccola, la mano del P1 in vista o no: la corsia del P2 non perde la sua mano', () => {
  for (const fps of [10, 15, 30]) for (const p1 of [true, false]) for (const [dS, T] of [[.17, .25], [.25, .3], [.29, .3]]){
    for (const { seed, r } of run10('dirittoVeloce', { ...small, fps, p1, dS, T })){
      const at = `${fps} Hz, P1 ${p1 ? 'in vista' : 'assente'}, dS ${dS}, seme ${seed}`;
      assert.equal(r.swaps, 0, at);
      assert.match(whoSide(r).join(','), /^p2·forehand(,p2·backhand)+$/, at);
    }
  }
});
test('caso B con la mano piccola (dritto di 0,15–0,3) a 10, 15 e 30 Hz: dopo il buco la corsia del P2 riprende la sua mano, non la mano libera del P1', () => {
  for (const fps of [10, 15, 30]) for (const dS of [.15, .2, .25, .3]){
    for (const { seed, r } of run10('bucoNelDrittoPiccola', { ...small, fps, dS })){
      const at = `${fps} Hz, dS ${dS}, seme ${seed}`;
      assert.equal(r.swaps, 0, at); assert.deepEqual(whoSide(r), ['p2·forehand'], at);
      assert.ok(Math.abs(r.tr.lanes.p2.hand.x - (.70 - dS)) < .02, `${at}: ${r.tr.lanes.p2.hand.x}`);
    }
  }
});
test('due mani dello stesso giocatore vicine (0,6–1 grandezze) e la mano libera persa al 10–40%: il P1 resta sulla racchetta, il P2 non la prende', () => {
  for (const p2 of [true, false]) for (const gap of [.6, .8, 1]) for (const drop of [.1, .25, .4]){
    let onFree = 0;
    for (const { seed, r } of run10('dueManiVicine', { p2, gap, drop })){
      const at = `P2 ${p2 ? 'in vista' : 'assente'}, ${gap} grandezze, ${drop*100}% perse, seme ${seed}`;
      assert.equal(r.swaps, 0, at); assert.deepEqual(whoSide(r), ['p1·backhand', 'p1·forehand'], at);
      if (r.onFree) onFree++;
    }
    // residuo noto: con le mani a 0,6 grandezze e il 40% di risultati senza la mano libera, se questa manca per tre
    // risultati di fila alla fine del dritto e ricompare dove la racchetta si ferma, la corsia può finire sulla mano
    // libera dopo il colpo (3 prove su 540 con 30 semi; la base ada351d 10)
    assert.ok(onFree <= (gap === .6 && drop === .4 ? 1 : 0), `P2 ${p2}, ${gap} grandezze, ${drop*100}% perse: ${onFree} semi sulla mano libera`);
  }
});

test('confine tra le corsie e colonne del flusso: a metà tra le case, nella fascia 0,3–0,7; a metà immagine come prima', () => {
  assert.deepEqual(duoFlowCols(.5), DUO.cols);
  assert.deepEqual(duoFlowCols(.7), { p1: { from: 0, to: 5 }, p2: { from: 6, to: 7 } });
  assert.deepEqual(duoFlowCols(.1), { p1: { from: 0, to: 1 }, p2: { from: 2, to: 7 } });
  const tr = new DuoTracker();
  assert.equal(tr.split(), .5);
  tr.lanes.p1.home = { x: .55, y: .5 }; tr.lanes.p2.home = { x: .95, y: .5 };
  assert.equal(tr.split(), DUO.splitMax);
  tr.lanes.p1.home = { x: .8, y: .5 }; tr.lanes.p2.home = { x: .6, y: .5 };
  assert.equal(tr.split(), .5, 'case invertite: metà immagine');
});
test('mano libera dell\'altro giocatore: una corsia mai agganciata prende solo dalla sua parte del confine', () => {
  const tr = new DuoTracker(); let t = 1000;
  // solo il P1 con le due mani (racchetta a 0,3, mano libera a 0,45): il P2 non c'è e non prende la mano libera del P1
  for (let i = 0; i < 20; i++){ t += 1000/30; tr.hands([L(.3, .55, .045), L(.45, .6, .045)], t); }
  assert.equal(tr.lanes.p2.hand, null);
  assert.ok(Math.abs(tr.lanes.p1.hand.x - .3) < 1e-6 || Math.abs(tr.lanes.p1.hand.x - .45) < 1e-6);
  assert.ok(ARGON_TRACK.pickMs < DUO.memoryMs);
});

// mano con centro in (S, y) nell'immagine specchiata e grandezza size (landmark nell'immagine non specchiata)
const L = (S, y, size = .07) => { const d = size/.75, a = Array.from({ length: 21 }, () => ({ x: 1 - S, y, z: 0 })); a[0] = { x: 1 - S, y: y - .55*d, z: 0 }; a[9] = { x: 1 - S, y: y + .45*d, z: 0 }; return a; };
const DT = 1000/30;
function run(tr, frames, t0 = 1000){
  const out = []; let t = t0;
  for (const hands of frames){ t += DT; out.push(...tr.hands(hands.map(h => L(...h)), t).map(e => ({ ...e, t }))); }
  return { out, t };
}
const still = (n, ...hands) => Array.from({ length: n }, () => hands);

test('due giocatori: ognuno aggancia la mano nella sua metà; il colpo di uno esce solo per lui, con il lato dal verso', () => {
  const tr = new DuoTracker();
  // P1 (a sinistra) fa un dritto (verso sinistra), poi il P2 (a destra) un rovescio (verso destra)
  const frames = [...still(8, [.3, .55], [.72, .55])];
  for (let i = 1; i <= 4; i++) frames.push([[.3 - .07*i, .55], [.72, .55]]);
  frames.push(...still(10, [.02, .55], [.72, .55]).map(f => [[.05, .55], f[1]]));
  for (let i = 1; i <= 4; i++) frames.push([[.05, .55], [.72 + .06*i, .55]]);
  const { out } = run(tr, frames);
  assert.deepEqual(out.map(e => [e.who, e.type, e.side]), [['p1', 'swing', 'forehand'], ['p2', 'swing', 'backhand']]);
  assert.ok(tr.seen('p1', 1000 + frames.length*DT) && tr.seen('p2', 1000 + frames.length*DT));
});

test('il dritto del P1 attraversa il centro: resta del P1; le mani dei due giocatori non si scambiano mai', () => {
  const tr = new DuoTracker();
  const frames = [...still(8, [.42, .55], [.8, .55])];
  // la mano del P1 va da 0,42 a 0,62 (oltre la metà) mentre il P2 è fermo
  for (let i = 1; i <= 4; i++) frames.push([[.42 + .05*i, .55], [.8, .55]]);
  const { out } = run(tr, frames);
  assert.deepEqual(out.map(e => e.who), ['p1']);
  assert.ok(Math.abs(tr.lanes.p1.hand.x - .62) < 1e-9 && Math.abs(tr.lanes.p2.hand.x - .8) < 1e-9);
  // il modello dà le mani in ordine inverso: nessun colpo finto
  const swap = run(tr, still(6, [.8, .55], [.62, .55]), 1000 + frames.length*DT);
  assert.equal(swap.out.length, 0);
});

test('il P2 sparisce per un attimo: il P1 non prende la sua mano e il colpo del P2 attraverso il buco resta del P2', () => {
  const tr = new DuoTracker();
  const frames = [...still(8, [.3, .55], [.7, .55])];
  frames.push([[.3, .55]], [[.3, .55]], [[.3, .55]]);            // mano del P2 mossa: non vista per 100 ms
  frames.push([[.3, .55], [.95, .56]]);                          // ricompare dall'altra parte
  const { out } = run(tr, frames);
  assert.deepEqual(out.map(e => [e.who, e.side]), [['p2', 'backhand']]);
  assert.ok(Math.abs(tr.lanes.p1.hand.x - .3) < 1e-9);
  assert.equal(tr.wantsFlow('p2', 1000 + 9*DT + 1), false, 'nel buco breve niente flusso ottico');
});

test('una sola persona in vista: si aggancia solo la sua metà; l\'altra resta libera e vuole il flusso ottico', () => {
  const tr = new DuoTracker();
  const { t } = run(tr, still(5, [.25, .5]));
  assert.ok(tr.seen('p1', t)); assert.equal(tr.seen('p2', t), false);
  assert.equal(tr.lanes.p2.hand, null);
  assert.equal(tr.wantsFlow('p2', t), true); assert.equal(tr.wantsFlow('p1', t), false);
});

test('flusso ottico per metà: il movimento nella metà del P2 non tocca il P1 e fa il colpo del P2', () => {
  const W = 64, H = 48, prev = new Float32Array(W*H).fill(.4);
  const frame = cx => { const a = prev.slice(); for (let y = 18; y < 30; y++) for (let x = cx - 4; x < cx + 4; x++) a[y*W + x] = .95; return a; };
  // movimento a destra (colonne del P2)
  assert.equal(argonFlowBlob(frame(50), prev, W, H, DUO.cols.p1), null);
  const b = argonFlowBlob(frame(50), prev, W, H, DUO.cols.p2);
  assert.ok(b && b.x > .7, JSON.stringify(b));
  // tre fotogrammi di flusso che scorrono verso destra nella metà del P2: un colpo del P2
  const tr = new DuoTracker(); let t = 1000, ev = null;
  for (const x of [.6, .7, .8, .9]){ t += DT; ev = tr.flow('p2', { x, y: .5 }, t) || ev; }
  assert.equal(ev?.who, 'p2'); assert.equal(ev?.source, 'flow'); assert.equal(ev?.side, 'backhand');
});

test('camera della webcam per due: la più larga che dà, fino a 1920×1080, zoom al minimo; senza capacità nessun vincolo', () => {
  assert.deepEqual(widestCamera({ width: { max: 1280 }, height: { max: 720 }, zoom: { min: 100, max: 400 }, resizeMode: ['none', 'crop-and-scale'] }), { width: 1280, height: 720, zoom: 100, resizeMode: 'none' });
  assert.deepEqual(widestCamera({ width: { max: 3840 }, height: { max: 2160 } }), { width: 1920, height: 1080 });
  assert.deepEqual(widestCamera({ width: { max: 2592 }, height: { max: 1944 } }), { width: 1440, height: 1080 });
  assert.equal(widestCamera({}), null); assert.equal(widestCamera(null), null);
});

// controller sul prototipo vero (come natpf-webcam-argon-continuita): il modello finto risponde con le mani date
const { MotionController: MC } = await import('../src/motion_controls.js');
function rig(){
  const mc = Object.create(MC.prototype), p1 = [], p2 = [];
  Object.assign(mc, {
    webcamMode: 'argon', webcamActive: true, videoElem: { readyState: 4, currentTime: 0 }, _lastVideoTime: undefined,
    latestHandLandmarks: null, latestHandSeenAt: null, _hasNewHandResult: false, _mpBusy: false, lastWebcamTriggerMs: 0,
    smoothedCentroid: { x: .5, y: .5 }, motionVector: { vx: 0, vy: 0, mag: 0 }, _webcamTrail: null, _lastWebcamSource: null,
    role: 'p1', phoneState: { orientation: { pitch: 0, roll: 0 } }, onTrack: null, webcamDuo: false, p2HandPreference: 'left',
    flowWidth: 64, flowHeight: 48, hasPrevFrame: false, prevLuma: new Float32Array(64*48), motionEnergyMap: new Float32Array(64*48),
    offscreenCtx: { save(){}, scale(){}, drawImage(){}, restore(){}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w*h*4).fill(90) }) },
  });
  mc._emitSwing = e => p1.push({ kind: 'swing', ...e }); mc._emitToss = e => p1.push({ kind: 'toss', ...e });
  mc._emitP2Swing = e => p2.push({ kind: 'swing', ...e }); mc._emitP2Toss = e => p2.push({ kind: 'toss', ...e });
  let hands = [], opts = null;
  mc.mpHands = { setOptions(o){ opts = o; }, send(){ mc._onArgonHandResults({ multiHandLandmarks: hands.map(h => L(...h)) }); return Promise.resolve(); } };
  const realNow = performance.now; let t = 1000;
  const frame = (...h) => { hands = h; mc.videoElem.currentTime += 1/30; t += DT; performance.now = () => t; try { mc._argonFrame(t); mc._argonFrame(t); } finally { performance.now = realNow; } };
  return { mc, p1, p2, frame, opts: () => opts };
}

// B15: il lato della scia è nella convenzione del destro (verso destra = rovescio); il P2 mancino lo riceve scambiato, come
// NatpfHand fa per il P1 (prima il suo dritto arrivava al motore come rovescio)
test('nel controller: webcam per due accesa → quattro mani, il colpo di sinistra al P1 e quello di destra al P2 (mancino: lato scambiato, con la sua mano)', () => {
  const { mc, p1, p2, frame, opts } = rig();
  mc.setWebcamDuo(true);
  assert.equal(opts().maxNumHands, 4);
  for (let i = 0; i < 8; i++) frame([.3, .55], [.75, .55]);
  for (let i = 1; i <= 4; i++) frame([.3 - .07*i, .55], [.75, .55]);
  for (let i = 0; i < 12; i++) frame([.02, .55], [.75, .55]);
  for (let i = 1; i <= 4; i++) frame([.02, .55], [.75 + .055*i, .55]);
  assert.deepEqual(p1.map(e => [e.kind, e.side, e.source]), [['swing', 'forehand', 'webcam']]);
  assert.deepEqual(p2.map(e => [e.kind, e.side, e.hand]), [['swing', 'forehand', 'left']]);
  // spenta: torna la webcam per uno (due mani, la prima della lista)
  mc.setWebcamDuo(false);
  assert.equal(opts().maxNumHands, 2); assert.equal(mc.webcamDuo, false);
});

test('camera per due: prima la più grande con almeno 24 fotogrammi al secondo, poi 1280 dello stesso formato, poi senza vincolo', async () => {
  const { cameraAttempts, DUO_CAMERA } = await import('../src/natpf/webcam_duo.js');
  const a = cameraAttempts({ width: 1920, height: 1080, zoom: 100 });
  assert.deepEqual(a.map(x => [x.width, x.height, x.frameRate.min ?? null]), [[1920, 1080, DUO_CAMERA.minFps], [1280, 720, DUO_CAMERA.minFps], [1920, 1080, null]]);
  assert.ok(a.every(x => !('zoom' in x)), 'lo zoom a parte');
  assert.deepEqual(cameraAttempts({ width: 1280, height: 720 }).map(x => x.width), [1280, 1280]);
  assert.deepEqual(cameraAttempts(null), []);
});
