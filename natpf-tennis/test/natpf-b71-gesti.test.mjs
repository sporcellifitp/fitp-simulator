// B71 (19/11/2026, registri della fiera del 18 e 19/11: 325 partite, 7542 colpi, tutti Android 17 con l'app 1.0.4, LAN;
// docs/b71/gesti.md) · parte del computer:
//   1. calibrazione giocando che impara davvero: «mark» solo per il gesto tenuto; contano tutti i colpi non deboli con un
//      verso (anche tagliati e pallonetti, uno per palla); la salita abituale si impara anche dai tagliati; quello che si
//      impara (colpo tipico, salita, centro della mira, soglie del telefono, segno) vale in partita (giocatore simulato
//      «dall'alto in basso», destro e mancino);
//   2. segno di fiera: niente cambio con 2 colpi, servono 6 voti concordi negli scambi di prova (8 sul telefono: cfg sn);
//   3. verso incerto in fiera (confidenza bassa, gesto trattenuto, arrivo 150 ms o più dopo il picco): il lato dalla palla
//      (ls 'a' o 'p') e il colpo super non è bloccato per «lato sbagliato»;
//   4. palla corta: la regola KEEP solo entro la finestra della direzione (natpf-racchetta-motore.test.mjs); una palla corta
//      sotto il 30% del colpo tipico fatta molto in anticipo è una preparazione e il colpo vero dopo la sostituisce;
//   5. campi nuovi della riga «colpo» (vg, vc, dur, hold, ls) e dei voti del segno (voti).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTrialLearner, TRIAL, TRIAL_SIGN, TRIAL_SHOTS, trialSide, trialDone, wantOfSide } from '../src/natpf/natpf_trial_learn.js';
import { trialMark, verseUnsure, VERSE_FAIR, ballSide, teachesNormal } from '../src/natpf/natpf_phone_racket.js';
import { superShot, sideFromBall } from '../src/natpf/natpf_stroke_outcome.js';
import { simplePhone } from '../scripts/audit/scambi-di-prova.mjs';
import { mirrorStroke } from '../scripts/audit/colpi.mjs';
import { rng } from './phone-sim.mjs';
import { armSwing, STROKES } from './arm-sim.mjs';
import { playWorld, playTrial, stroke, SIMPLE } from './trial-world.mjs';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';
const F = await import('../src/natpf/registro/registro_formato.js');
const { versoColpo } = await import('../src/natpf/registro/registro_registratore.js');

/* ---------- 1. apprendimento degli scambi di prova ---------- */
const S = (dir, peak, rise = .1, heading = 0) => ({ dir, peak, rawPeak: peak*1.1, heading, head: .2*dir, shape: { rise } });
const info = (shot, o = {}) => ({ counts: true, normal: shot === 'topspin' || shot === 'flat', shot, rise: !['lob', 'smash'].includes(shot), ...o });
test('B71 mark: un gesto più debole per la stessa palla (ignorato dal voto) non cambia più il colpo tenuto', () => {
  const L = createTrialLearner();
  L.vote({ ball: 1, want: 1, s: S(1, 800) }); L.mark(1, info('topspin'));
  // il rientro (più debole) per la stessa palla: il voto lo ignora e prima mark lo segnava «non normale»
  L.vote({ ball: 1, want: 1, s: S(-1, 300) }); L.mark(1, { counts: false, normal: false, shot: 'slice' });
  assert.deepEqual(L.samples.map(x => [x.peak, x.normal, x.counts, x.shot]), [[800, true, true, 'topspin']]);
  // com'era con il booleano (prove di prima): vale ancora per il gesto tenuto
  L.vote({ ball: 2, want: -1, s: S(-1, 700) }); L.mark(2, false); assert.equal(L.samples[1].counts, false);
  L.vote({ ball: 2, want: -1, s: S(-1, 760) }); L.mark(2, true); assert.deepEqual([L.samples[1].peak, L.samples[1].counts, L.samples[1].normal], [760, true, true]);
});

test('B71 contano tutti i colpi non deboli con un verso: tagliati e pallonetti danno il livello; forza senza palle corte, salita dai tagliati, mira senza pallonetti', () => {
  const L = createTrialLearner();
  const list = [[1, S(1, 700, -.35, 10), 'slice'], [-1, S(-1, 600, -.4, 170), 'slice'], [1, S(1, 760, -.3, 14), 'slice'], [-1, S(-1, 640, .7, -150), 'lob'], [1, S(1, 380, -.3, 40), 'drop']];
  list.forEach(([want, s, shot], i) => { L.vote({ ball: i + 1, want, s }); L.mark(i + 1, info(shot, shot === 'drop' ? { rise: false } : {})); });
  assert.equal(L.level(), 'full', 'prima: nessun top spin né piatto, «none»');
  assert.deepEqual(L.counts('right'), { 1: 3, '-1': 2, forehand: 3, backhand: 2, total: 5 });
  const p = L.profile({ ...SIMPLE });
  assert.equal(p.refs[1], 730, 'forza del dritto senza la palla corta (380)'); assert.equal(p.refs[-1], 620);
  assert.equal(p.rises[1], -.325, 'salita abituale dei dritti dai tagliati (la palla corta della forma no)'); assert.equal(p.rises[-1], -.4, 'il pallonetto non insegna la salita');
  assert.equal(p.faceRef[-1].heading, 170, 'centro della mira del rovescio senza il pallonetto'); assert.equal(p.faceRef[1].heading, 12, 'e del dritto senza la palla corta');
  assert.equal(p.heads, undefined, 'il verso verticale del piatto resta dai soli colpi normali');
  assert.deepEqual([...TRIAL_SHOTS.noForce], ['drop']); assert.deepEqual([...TRIAL_SHOTS.noAim], ['drop', 'lob']);
  // con le sole palle corte la forza viene da quelle (niente di meglio)
  const D = createTrialLearner(); [[1, S(1, 400)], [-1, S(-1, 420)]].forEach(([w, s], i) => { D.vote({ ball: i + 1, want: w, s }); D.mark(i + 1, info('drop')); });
  assert.equal(D.level(), 'ok'); assert.equal(D.profile(SIMPLE).ref, 410);
});

test('B71 trialMark: conta ogni colpo dello scambio non debole per il gioco; non gli esercizi né i gesti deboli', () => {
  const ev = (shot, o = {}) => ({ natpf: { shot, peak: 700, typical: 700, intent: { shot, byShape: false }, ...o } });
  assert.deepEqual(trialMark(ev('slice')), { counts: true, normal: false, shot: 'slice', rise: true });
  assert.deepEqual(trialMark(ev('topspin')), { counts: true, normal: true, shot: 'topspin', rise: true });
  assert.deepEqual(trialMark(ev('lob')), { counts: true, normal: false, shot: 'lob', rise: false });
  assert.equal(trialMark(ev('drop', { intent: { shot: 'drop', byShape: true, conf: .5 }, angle: 30 })).rise, false, 'palla corta della forma: non insegna la salita');
  assert.equal(trialMark(ev('topspin', { peak: 150 })).counts, false, 'gesto debole (sotto il 30% del colpo tipico)');
  assert.equal(trialMark(ev('topspin'), { expect: 'lob' }).counts, false, 'gesto a richiesta di un esercizio');
  assert.equal(trialMark(ev('topspin'), { rally: false }).counts, false);
  assert.equal(teachesNormal(ev('slice')), false, 'i riferimenti del colpo normale in partita restano dai soli normali');
});

// giocatore simulato «dall'alto in basso»: il suo colpo normale scende con la testa della racchetta (asse del colpo inclinato
// a caso: dritto 0,25…0,6, rovescio 0,15…0,45). Con il profilo semplice circa metà dei colpi si legge tagliato
function topDown(p, side, R, k = 1){
  const hand = p.hand, fh = hand === 'left' ? -1 : 1;
  const t = side === 'forehand' ? .25 + R()*.35 : .15 + R()*.3;
  let St = side === 'forehand' ? { ...STROKES.dritto, axis: [-t, 1, .04] } : { ...STROKES.rovescio, axis: [-t, -1, .04] };
  if (hand === 'left') St = mirrorStroke(St);
  p.det.setPrepMode(true); p.det.setExpect((side === 'forehand' ? fh : -fh)*(p.learner?.sign ?? 1)); p.rest(450, 4);
  const before = p.msgs.length;
  armSwing(p, { ...St, peak: St.peak*k, wrist: St.wrist*k, tremor: 4, R }); p.rest(600, 4);
  return p.msgs.slice(before);
}
function topDownGame({ hand, seed, legacy = false }){
  const p = simplePhone({ seed, hand }); p.hand = hand; p.legacyMark = legacy;
  const R = rng(seed*11), trialShots = [];
  p.beginTrial();
  let balls = 0;
  while (!trialDone({ balls, counts: p.learner.counts(hand), t: 0 })){
    const side = trialSide(balls, p.learner.counts(hand));
    p.trialBall(wantOfSide(side, hand));
    for (const m of topDown(p, side, R, .8 + R()*.4)) trialShots.push(p.game(m).ev.natpf.shot);
    balls++;
  }
  const res = p.endTrial(), match = [];
  for (let i = 0; i < 8; i++){ const side = i % 2 ? 'backhand' : 'forehand'; for (const m of topDown(p, side, R, .8 + R()*.4)){ const r = p.game(m); match.push({ shot: r.ev.natpf.shot, side: r.ev.side === side }); } }
  return { p, res, trialShots, match };
}
test('B71 giocatore «dall\'alto in basso» (metà dei colpi di prova letti tagliati), destro e mancino: arriva almeno a «ok» e in partita usa quello che ha imparato', () => {
  const lv = { before: {}, after: {} }; let slicesTrial = 0, nTrial = 0, sliceFirst = { before: 0, after: 0 }, nFirst = 0;
  for (const hand of ['right', 'left']) for (const seed of [1, 2, 3, 4, 5]){
    const A = topDownGame({ hand, seed }), B = topDownGame({ hand, seed, legacy: true }), tag = `${hand} ${seed}`;
    lv.after[A.res.level] = (lv.after[A.res.level] || 0) + 1; lv.before[B.res.level] = (lv.before[B.res.level] || 0) + 1;
    slicesTrial += B.trialShots.filter(s => s === 'slice').length; nTrial += B.trialShots.length;
    assert.ok(['ok', 'full'].includes(A.res.level), `${tag}: ${A.res.level}`); assert.equal(A.res.sign, 1, tag);
    // quello che si è imparato vale in partita: salita abituale (negativa, dai tagliati), centro della mira, soglie del
    // telefono (messaggio pf), colpo tipico
    const prof = A.p.profile;
    assert.ok(prof.trial && !prof.simple, tag);
    for (const d of [1, -1]){ assert.ok(prof.rises[d] < -.05, `${tag}: salita ${d} ${prof.rises[d]}`); assert.ok(A.p.models.aims.center(d) != null, `${tag}: centro della mira ${d}`); }
    assert.ok(A.p.det.profile.refs && Math.abs(A.p.det.profile.minPeak - .28*Math.min(prof.refs[1], prof.refs[-1], prof.ref)) < 1, `${tag}: soglie del telefono`);
    assert.ok(Number.isFinite(A.p.models.typical.value), `${tag}: colpo tipico`);
    assert.equal(A.match.filter(m => !m.side).length, 0, `${tag}: nessun lato sbagliato`);
    // i primi colpi della partita (prima che la salita si impari in partita): meno tagliati di prima
    sliceFirst.after += A.match.slice(0, 4).filter(m => m.shot === 'slice').length; sliceFirst.before += B.match.slice(0, 4).filter(m => m.shot === 'slice').length; nFirst += 4;
  }
  assert.ok(slicesTrial/nTrial >= .35 && slicesTrial/nTrial <= .8, `tagliati negli scambi di prova: ${slicesTrial}/${nTrial} (nei registri 44%)`);
  assert.ok((lv.before.none || 0) + (lv.before.partial || 0) >= 3, `prima del B71 molti restavano «none» o «partial»: ${JSON.stringify(lv.before)}`);
  assert.ok(sliceFirst.after < sliceFirst.before, `tagliati nei primi 4 colpi della partita: ${sliceFirst.before} → ${sliceFirst.after} su ${nFirst}`);
});

/* ---------- 2. segno di fiera ---------- */
test('B71 segno di fiera negli scambi di prova: 2 colpi al contrario non lo girano (prima sì), servono 6 voti concordi dai due lati', () => {
  const run = (need, dirs) => { const L = createTrialLearner({ signNeed: need }); dirs.forEach(([want, dir], i) => { L.vote({ ball: i + 1, want, s: S(dir, 700) }); L.mark(i + 1, info('topspin')); }); return L; };
  const two = [[1, -1], [-1, 1]];
  assert.equal(run(0, two).sign, -1, 'regola di sempre (fuori dalla fiera): 2 bastano');
  assert.equal(run(TRIAL_SIGN.fiera, two).sign, 1, 'fiera: non bastano');
  const five = [[1, -1], [-1, 1], [1, -1], [-1, 1], [1, -1]];
  assert.equal(run(TRIAL_SIGN.fiera, five).sign, 1, 'fiera: 5 non bastano');
  const six = [...five, [-1, 1]];
  const L6 = run(TRIAL_SIGN.fiera, six); assert.equal(L6.sign, -1, 'fiera: 6 contrari concordi'); assert.equal(L6.flips, 1);
  assert.equal(run(TRIAL_SIGN.fiera, [...five, [-1, -1]]).sign, 1, '5 contrari e 1 d\'accordo: no');
  assert.equal(run(TRIAL_SIGN.fiera, [[1, -1], [1, -1], [1, -1], [1, -1], [1, -1], [1, -1]]).sign, 1, 'contrari da un lato solo: no');
  // la soglia resta dopo reset (è della postazione), si toglie con 0
  const L = createTrialLearner({ signNeed: 6 }); L.reset(); assert.equal(L.signNeed, 6); L.signNeed = 0; assert.equal(L.signNeed, 0);
  assert.equal(TRIAL_SIGN.fiera, 6); assert.equal(TRIAL_SIGN.detector, 8); assert.equal(TRIAL.signMin, 2, 'fuori dalla fiera com\'era');
});

test('B71 in fiera il gioco manda al telefono il segno di fiera (cfg sn 8) e gli scambi di prova chiedono 6 voti; senza fiera niente', async () => {
  const w = await playWorld(), { ui, link } = w;
  const cfgs = () => link.sent.filter(m => m.t === 'cfg');
  assert.ok(cfgs().length && cfgs().every(m => m.sn === undefined), 'senza fiera il cfg è quello di prima');
  ui.fiera.on = true;
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: 700 }));
  assert.equal(cfgs().at(-1).sn, TRIAL_SIGN.detector, 'fiera accesa: cfg di nuovo, con sn');
  ui.fiera.on = false; ui.phone.update();                     // (un fotogramma del gioco: a gioco in pausa il cfg parte alla ripresa)
  assert.equal(cfgs().at(-1).sn, undefined, 'fiera spenta: cfg senza sn');
  // gli scambi di prova che cominciano in fiera chiedono TRIAL_SIGN.fiera voti concordi; fuori dalla fiera la regola di prima
  const { NatpfPhoneRacket } = await import('../src/natpf/natpf_phone_racket.js');
  const fake = on => { const R = new NatpfPhoneRacket({ natpfUi: { fiera: { on } }, playerRole: 'p1' }); R.beginTrial({ keep: true }); return R; };
  assert.equal(fake(true).learner.signNeed, TRIAL_SIGN.fiera); assert.equal(fake(false).learner.signNeed, 0);
  const R = fake(true); assert.equal(R.signNeed, TRIAL_SIGN.detector); assert.equal(R._cfg().sn, TRIAL_SIGN.detector); assert.equal(fake(false)._cfg().sn, undefined);
});

/* ---------- 3. verso incerto in fiera: lato dalla palla ---------- */
test('B71 verso incerto: confidenza bassa, gesto trattenuto, arrivo tardi (≥ 150 ms dopo il picco)', () => {
  assert.equal(verseUnsure({ dirConf: .2 }), true); assert.equal(verseUnsure({ dirConf: .9 }), false); assert.equal(verseUnsure({}), false, 'telefoni di prima: niente');
  assert.equal(verseUnsure({ dirConf: .9, holdMs: 250 }), true); assert.equal(verseUnsure({ dirConf: .9, holdMs: 0 }), false);
  assert.equal(verseUnsure({ dirConf: .9 }, .16), true); assert.equal(verseUnsure({ dirConf: .9 }, .09), false);
  assert.deepEqual([VERSE_FAIR.conf, VERSE_FAIR.late], [.35, .15]);
});

test('B71 in fiera, con il verso incerto, il lato viene dalla palla (ls «a» o «p»); con il verso sicuro dal gesto (ls «g»); senza fiera com\'era', async () => {
  for (const fair of [true, false]) for (const hand of ['right', 'left']){
    const w = await playWorld(), { ui, P } = w; ui.fiera.on = fair; if (hand === 'left') P.setHand('left', 'gioco');
    const seen = []; P.onSwing((ev, s) => { if (ev.side) seen.push({ side: ev.side, ls: ev.natpf.ls }); });
    // palle dal lato +1 (a destra di chi gioca): colpite al contrario, con il verso sicuro (1a), incerto (3a, confidenza
    // 0,2), trattenuto 260 ms (5a) o arrivato 200 ms dopo il picco (6a); le palle dall'altra parte colpite giuste (così il
    // segno non si gira: i colpi al contrario sono da un lato solo)
    const kinds = { 1: { dirConf: .9 }, 3: { dirConf: .2 }, 5: { dirConf: .9, holdMs: 260 }, 6: { dirConf: .9, late: true } }, balls = [];
    playTrial(w, (id, n, want) => {
      const k = want === 1 ? kinds[n] || { dirConf: .9 } : null, s = { ...stroke({ dir: k ? -want : want, peak: 700 }), dur: 180, dirConf: k?.dirConf ?? .9, rawDir: k ? -want : want, ...(k?.holdMs ? { holdMs: k.holdMs } : {}) };
      if (k?.late) s.at = performance.now()/1000 - .2;
      balls.push({ want, k }); return s;
    });
    const tag = `${fair ? 'fiera' : 'senza fiera'} ${hand}`;
    assert.equal(seen.length, balls.length, tag); assert.ok(balls.filter(b => b.k).length >= 3, `${tag}: ${JSON.stringify(balls)}`);
    assert.equal(P.learner.sign, 1, tag);
    seen.forEach((x, i) => {
      const { want, k } = balls[i], ballSide = (want === 1) !== (hand === 'left') ? 'forehand' : 'backhand', unsure = !!k && (k.dirConf < .35 || !!k.holdMs || !!k.late);
      if (!k){ assert.equal(x.side, ballSide, `${tag} colpo ${i}: colpo giusto`); assert.equal(x.ls, 'g'); }
      else if (fair && unsure){ assert.equal(x.side, ballSide, `${tag} colpo ${i}: lato dalla palla`); assert.ok(['a', 'p'].includes(x.ls), `${tag}: ${x.ls}`); }
      else { assert.notEqual(x.side, ballSide, `${tag} colpo ${i}: lato dal gesto (letto al contrario)`); assert.equal(x.ls, 'g'); }
    });
    // le righe «colpo» degli scambi di prova nel registro dello stand portano le misure del verso
    const colpi = (ui.registro?.rec?.buf || []).map(l => JSON.parse(l)).filter(r => r.k === 'colpo' && r.amb === 'prova');
    assert.ok(colpi.length >= 2, `${tag}: ${colpi.length} righe`);
    for (const r of colpi){ assert.ok(['g', 'a', 'p'].includes(r.ls) && [-1, 1].includes(r.vg) && Number.isFinite(r.vc) && r.dur === 180, JSON.stringify(r)); }
    if (fair) assert.ok(colpi.some(r => r.ls !== 'g') && colpi.some(r => r.hold === 260), `${tag}: ${JSON.stringify(colpi.map(r => [r.ls, r.hold]))}`);
  }
});

// B71, revisione: con il lato dalla palla cambia il verso di tutto il colpo. Prima cambiava solo ev.side: gli scambi di prova
// contavano il colpo nel verso scartato (a schermo 4 dritti e 2 rovesci, imparati 0 e 6, «partial», 6 palle invece di 4) e i
// riferimenti del dritto finivano nel rovescio
test('B71 revisione: in fiera, con le palle del dritto lette al contrario e il verso incerto (vc 0,2), gli scambi di prova contano i dritti come a schermo', async () => {
  for (const hand of ['right', 'left']) for (const fair of [true, false]){
    const w = await playWorld(), { ui, P } = w; ui.fiera.on = fair; if (hand === 'left') P.setHand('left', 'gioco');
    const shown = [], gs = []; P.onSwing((ev, s) => { if (ev.natpf?.prova && ev.side){ shown.push(ev.side); if (s.dirConf < .35) gs.push([ev.side, ev.natpf.gs ?? null, ev.natpf.ls]); } });
    let res = null, balls = null; const end = P.endTrial.bind(P);
    P.endTrial = () => { balls = ui.trial.S?.players?.p1?.balls ?? null; return (res = end()); };
    const fhWant = wantOfSide('forehand', hand);
    playTrial(w, (id, n, want) => {
      const wrong = want === fhWant;
      return { ...stroke({ dir: wrong ? -want : want, peak: 700, heading: wrong ? 20 : -150 }), dur: 180, dirConf: wrong ? .2 : .9, rawDir: wrong ? -want : want };
    }, { gioca: false });
    const tag = `${hand} ${fair ? 'fiera' : 'senza fiera'}`;
    assert.ok(res, tag); assert.equal(res.sign, 1, `${tag}: contrari da un lato solo, il segno non gira`);
    if (fair){
      const fh = shown.filter(s => s === 'forehand').length, bh = shown.filter(s => s === 'backhand').length;
      assert.ok(fh >= 2 && bh >= 2, `${tag}: a schermo ${fh} dritti e ${bh} rovesci`);
      assert.ok(res.n.forehand >= 2, `${tag}: dritti imparati ${JSON.stringify(res.n)} (prima 0)`);
      assert.deepEqual([res.n.forehand, res.n.backhand], [fh, bh], `${tag}: i puntini contano quello che si è visto`);
      assert.equal(res.level, 'full', tag); assert.equal(balls, 4, `${tag}: quattro palle bastano (prima sei)`);
      // i riferimenti del dritto dai dritti: centro della mira del dritto dalla direzione del piatto dei dritti (20°)
      const fd = wantOfSide('forehand', hand);
      assert.equal(P.profile.trialN[fd], fh, tag); assert.equal(P.profile.faceRef[fd].heading, 20, tag); assert.equal(P.profile.faceRef[-fd].heading, -150, tag);
      // il lato del gesto resta nel colpo (natpf.gs) per la regola KEEP del motore
      assert.ok(gs.length >= 2 && gs.every(([side, g, ls]) => side === 'forehand' && g === 'backhand' && ['a', 'p'].includes(ls)), `${tag}: ${JSON.stringify(gs)}`);
    } else {
      // senza fiera com'era: il verso del gesto decide, i dritti letti al contrario sono rovesci
      assert.equal(shown.filter(s => s === 'forehand').length, 0, tag); assert.equal(res.n.forehand, 0, tag); assert.ok(gs.every(([, g]) => g == null), tag);
    }
  }
});

test('B71 revisione: il colpo contato nel verso della palla resta lì anche se il segno gira dopo, negli stessi scambi di prova', () => {
  const L = createTrialLearner({ signNeed: TRIAL_SIGN.fiera });
  // telefono davvero al contrario. Palla 1: verso incerto, lato dalla palla (+1, mostrato dritto) uguale al verso letto
  // allora (+1, d'accordo); poi sei colpi contrari dai due lati e il segno gira alla settima palla
  const balls = [[1, 1, 1], [-1, 1, null], [1, -1, null], [-1, 1, null], [1, -1, null], [-1, 1, null], [1, -1, null]];
  balls.forEach(([want, raw, dir], i) => { L.vote({ ball: i + 1, want, s: S(raw, 700) }); L.mark(i + 1, info('topspin', dir ? { dir } : {})); });
  assert.equal(L.sign, -1, 'sei contrari dai due lati (e uno d\'accordo): il segno gira');
  assert.deepEqual(L.counts('right'), { 1: 4, '-1': 3, forehand: 4, backhand: 3, total: 7 }, 'la palla 1 resta nel dritto mostrato (con segno·verso letto finirebbe nel rovescio)');
  assert.deepEqual(L.votes, { agree: 1, against: 6, both: true }, 'i voti restano sul verso grezzo');
  assert.equal(L.samples[0].dir, 1); assert.equal(L.samples[1].dir, null);
});

test('B71 colpo super: con il lato dalla palla non è mai «innaturale»; con il lato dal gesto la regola resta', () => {
  const base = { intent: { shot: 'topspin', power: 1, typePower: 1, conf: .9 }, out: { shot: 'TOPSPIN', t: 0, q: 1 }, contactY: 1.8, ballVz: 15 };
  assert.match(superShot({ ...base, contact: 1, ballSide: -1 }).why[0], /innaturale/);
  assert.equal(superShot({ ...base, contact: 1, ballSide: -1, sideFromBall: true }).on, true);
  assert.equal(sideFromBall({ natpf: { ls: 'p' } }), true); assert.equal(sideFromBall({ natpf: { ls: 'a' } }), true);
  assert.equal(sideFromBall({ natpf: { ls: 'g' } }), false); assert.equal(sideFromBall({}), false);
});

/* ---------- 4. palla corta in anticipo ---------- */
const DT = 1/120;
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(17);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
function cpuShot(e, { from = [-.5, 1, -11], to = [1.6, 8.5], flight = 1.05, topspin = 14, player = [.4, 11.7], rally = 3 } = {}){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
  e.player.pos.set(player[0], 0, player[1]); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  e.pendingUserSwing = null;
  e.ball.pos.set(...from);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0], 0, to[1]), flight, { topspin });
  e._natpfPlanPlayer();
}
const phoneSwing = (intent, { side = 'forehand', peak = 900, typical = 800, angle = 40, seq = 1 } = {}) => ({ source: 'natpf-phone', side, shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, ...intent }, power: intent.power, peak, typical, angle, seq, latency: 0, hand: 'right' } });
function play(e, swings, maxT = 4){
  const queue = [...swings].sort((a, b) => b.lead - a.lead);
  for (let t = 0; t < maxT; t += DT){
    const ttc = NI.timeToContact(e, e.player);
    while (queue.length && ttc != null && ttc <= queue[0].lead) e._handleUserSwingInput(queue.shift().swing);
    e.step(DT);
    if (e.phase !== 'RALLY' || (e.ball.lastHitter === 'player' && e.ball.pos.z < 0)) break;
  }
  return { hit: e.ball.lastHitter === 'player', racket: e.natpfLastRacket, phase: e.phase };
}
test('B71 palla corta lenta (sotto il 30% del colpo tipico) fatta molto in anticipo: è la preparazione, il colpo vero che arriva subito dopo la sostituisce', () => {
  const drop = () => phoneSwing({ shot: 'drop', power: .12, conf: .7 }, { peak: 180, typical: 800, angle: 40, seq: 1 });
  const hit = phoneSwing({ shot: 'topspin', power: .7 }, { peak: 900, typical: 800, seq: 2 });
  assert.equal(NI.earlySoftSpecial(drop()), true); assert.equal(NI.weakSwing(drop()), false, 'da sola resta una palla corta voluta (deliberateSpecial)');
  assert.equal(NI.earlySoftSpecial(phoneSwing({ shot: 'drop', power: .2, conf: .7 }, { peak: 300, typical: 800 })), false, 'sopra il 30%: no');
  // il colpo vero arriva 0,1 s dopo il punto d'impatto: prima la palla corta in anticipo era già giocata (65 ms di attesa)
  const r = withEngine('pro', e => { cpuShot(e); return play(e, [{ lead: .35, swing: drop() }, { lead: -.1, swing: hit }]); });
  assert.ok(r.hit, r.phase); assert.equal(r.racket.seq, 2, 'si gioca il secondo gesto');
  assert.equal(r.racket.intent.shot, 'topspin', 'si gioca il colpo vero');
  // fatta in tempo (entro la finestra) la palla corta resta una palla corta
  const ok = withEngine('pro', e => { cpuShot(e); return play(e, [{ lead: .06, swing: drop() }]); });
  assert.ok(ok.hit); assert.equal(ok.racket.intent.shot, 'drop');
});

/* ---------- 5. registro ---------- */
test('B71 registro: riga «colpo» con vg, vc, dur, hold, ls (solo numeri e codici brevi); voti del segno; campi previsti dal Worker', async () => {
  assert.deepEqual(versoColpo({ vg: -1, vc: .456, dur: 183.4, hold: 262.2, ls: 'p' }), { vg: -1, vc: .46, dur: 183, hold: 262, ls: 'p' });
  assert.deepEqual(versoColpo({ vg: 0, vc: 0, dur: 90, hold: 0, ls: 'g' }), { vg: 0, vc: 0, dur: 90, ls: 'g' }, 'hold solo se il gesto è stato trattenuto');
  assert.deepEqual(versoColpo({ vg: 2, vc: 'alto', dur: null, ls: 'nome' }), {});
  assert.deepEqual(versoColpo(null), {});
  for (const k of ['vg', 'vc', 'dur', 'hold', 'ls', 'voti']){ assert.ok(F.CAMPI.includes(k), k); assert.ok(!F.CAMPI_VIETATI.includes(k), k); }
  assert.deepEqual([...F.CAMPI_B71], ['vg', 'vc', 'dur', 'hold', 'ls', 'voti']);
  const { RegistroStand } = await import('../src/natpf/registro/registro_registratore.js');
  const { codaMemoria } = await import('../src/natpf/registro/registro_coda.js');
  let dg = null; const ph = { connected: true, hand: 'right', state: { state: 'on' }, onChange(){}, onCal(){}, onSwing(){}, onDropped(){}, onDiag(fn){ dg = fn; } };
  const E = { phase: 'MENU', autoPlayMode: true, natpfPhone: ph, playerRole: 'p1', score: {}, matchConfig: {}, ball: {} };
  const R = new RegistroStand({ engine: E, ui: { hand: { hand: 'right' } }, coda: codaMemoria(), now: () => 0, wallNow: () => Date.UTC(2026, 10, 19, 12), timers: false, storage: { getItem: () => null, setItem(){} } });
  dg('verso', { causa: 'prova', stato: -1, ruolo: 'p1', voti: [0, 6] });
  dg('verso', { causa: 'rilevatore', stato: -1, ruolo: 'p1', voti: [1, 'x'] });
  const rows = R.buf.map(l => JSON.parse(l)).filter(r => r.k === 'tel').map(({ t, ...r }) => r);
  assert.deepEqual(rows, [{ k: 'tel', chi: 'g', motivo: 'segno', stato: -1, causa: 'prova', ruolo: 'p1', voti: [0, 6] }, { k: 'tel', chi: 'g', motivo: 'segno', stato: -1, causa: 'rilevatore', ruolo: 'p1' }]);
  for (const r of rows) assert.deepEqual(F.controllaRiga({ ...r, t: 1 }), [], JSON.stringify(r));
});

test('B71 lato dalla palla: dal verso atteso (palla in arrivo, oltre la zona del corpo), altrimenti dalla posizione', () => {
  const E = { phase: 'RALLY', playerRole: 'p1', player: { pos: { x: 0, z: 11 } }, opponent: { pos: { x: 0, z: -11 } }, ball: { inPlay: true, lastHitter: 'opponent', vel: { x: 0, y: 0, z: 10 }, pos: { x: 2, y: 1, z: 5 }, targetLanding: { x: 2, z: 9 } } };
  assert.deepEqual(ballSide(E, 'right'), { side: 'forehand', src: 'a' }); assert.deepEqual(ballSide(E, 'left'), { side: 'backhand', src: 'a' });
  E.ball.targetLanding.x = -2; E.ball.pos.x = -2;
  assert.deepEqual(ballSide(E, 'right'), { side: 'backhand', src: 'a' }); assert.deepEqual(ballSide(E, 'left'), { side: 'forehand', src: 'a' });
  E.ball.targetLanding.x = .1; E.ball.pos.x = .1;
  assert.equal(ballSide(E, 'right'), null, 'palla al centro: niente');
});
