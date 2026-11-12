// B28 (12/11/2026) · Calibrazione giocando: «Se ho tanta gente, la calibrazione ogni volta me la rallenta… Per me la
// calibrazione deve avvenire direttamente giocando: si parte con qualche scambio, il software deve capire bene destra e
// sinistra, velocità ed i parametri necessari, e poi dopo circa 10-15 secondi di scambi, parte il match vero».
// Qui: l'opzione dello stand, l'apprendimento dagli scambi di prova (verso, forza, salita, centro della mira), tempi e
// condizioni di fine, i colpi di prova che non contano, il riapprendimento a ogni partita, i percorsi (contro la CPU,
// stesso schermo, minigiochi, Allenamento), con il mondo di prova (ui-world.mjs) e il telefono simulato (phone-sim.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { phoneLike, stroke, hot, ballWant, SIMPLE } from './trial-world.mjs';
import { CAL_MODE_KEY, CAL_MODES, CAL_MODE_DEFAULT, calModeOf, calModeFromUrl, readCalMode, readSavedCalMode, writeCalMode, nextCalMode, forgetCalMode, calModeButton, calModeToast,
  TRIAL, trialSide, trialDone, wantOfSide, wantOfBallSide, createTrialLearner, phoneThresholds } from '../src/natpf/natpf_trial_learn.js';
import { trialDue, trialDots, trialOutro, gestureProfile, TRIAL_TEXT } from '../src/natpf/natpf_trial.js';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { connectTarget } from '../src/natpf/natpf_lobby.js';

/* ---------- opzione dello stand ---------- */
test('opzione dello stand «Calibrazione»: di base Giocando, tre valori in giro, salvata; l\'indirizzo comanda senza cambiarla', () => {
  localStorage.clear(); forgetCalMode();
  assert.equal(CAL_MODE_DEFAULT, 'play'); assert.deepEqual([...CAL_MODES], ['play', 'gesti', 'none']);
  assert.equal(readSavedCalMode(), 'play', 'di base giocando'); assert.equal(readCalMode(''), 'play');
  assert.equal(nextCalMode('play'), 'gesti'); assert.equal(nextCalMode('gesti'), 'none'); assert.equal(nextCalMode('none'), 'play');
  assert.equal(writeCalMode('gesti'), 'gesti'); assert.equal(localStorage.getItem(CAL_MODE_KEY), 'gesti'); assert.equal(readCalMode(''), 'gesti');
  forgetCalMode(); assert.equal(readSavedCalMode(), 'gesti', 'riletta dall\'archivio');
  assert.equal(writeCalMode('boh'), 'play', 'valore sconosciuto: la base');
  // dall'indirizzo, in italiano o no; un valore sconosciuto non comanda
  assert.equal(calModeFromUrl('?cal=gesti'), 'gesti'); assert.equal(calModeFromUrl('?x=1&cal=Nessuna'), 'none'); assert.equal(calModeFromUrl('?cal=giocando'), 'play');
  assert.equal(calModeFromUrl('?cal=boh'), null); assert.equal(calModeFromUrl(''), null);
  writeCalMode('none'); assert.equal(readCalMode('?cal=gesti'), 'gesti', 'l\'indirizzo comanda'); assert.equal(readSavedCalMode(), 'none', '… senza cambiare la scelta salvata');
  assert.equal(calModeOf('GESTI'), 'gesti');
  // scritte del pulsante e avviso dopo il clic
  assert.equal(calModeButton('play'), 'Giocando'); assert.equal(calModeButton('gesti'), 'Con i gesti'); assert.equal(calModeButton('none'), 'Nessuna'); assert.match(calModeButton('play', true), /indirizzo/);
  assert.match(calModeToast('play'), /scambi di prova.*0-0.*resta salvata/); assert.match(calModeToast('gesti'), /un dritto e un rovescio/); assert.match(calModeToast('none'), /primi colpi veri/);
  assert.match(calModeToast('gesti', true), /comanda l’indirizzo/);
  localStorage.clear(); forgetCalMode();
});

/* ---------- palle, fine ---------- */
test('scambi di prova: palle alternate dritto e rovescio, poi dal lato che manca; finiti a 2 colpi per lato, a 6 palle o a 16 s', () => {
  assert.deepEqual([0, 1, 2, 3].map(i => trialSide(i)), ['forehand', 'backhand', 'forehand', 'backhand']);
  assert.equal(trialSide(4, { forehand: 2, backhand: 1 }), 'backhand', 'quinta palla dal lato che ha meno colpi'); assert.equal(trialSide(5, { forehand: 0, backhand: 2 }), 'forehand');
  assert.equal(trialSide(4, { forehand: 1, backhand: 1 }), 'forehand'); assert.equal(trialSide(5, { forehand: 1, backhand: 1 }), 'backhand');
  assert.equal(trialDone({ balls: 4, counts: { forehand: 2, backhand: 2 }, t: 9 }), 'imparato');
  assert.equal(trialDone({ balls: 3, counts: { forehand: 2, backhand: 1 }, t: 7 }), null); assert.equal(trialDone({ balls: 5, counts: { forehand: 2, backhand: 1 }, t: 12 }), null);
  assert.equal(trialDone({ balls: 6, counts: { forehand: 2, backhand: 1 }, t: 14 }), 'palle'); assert.equal(trialDone({ balls: 2, counts: { forehand: 0, backhand: 0 }, t: 16 }), 'tempo', 'chi non colpisce non resta fermo');
  assert.equal(trialDone({}), null);
  assert.ok(TRIAL.perSide === 2 && TRIAL.balls === 4 && TRIAL.maxBalls === 6 && TRIAL.maxS <= 16, 'tetto di circa 16 s dalla prima palla');
  // verso atteso: dal lato della palla, uguale per destri e mancini; il nome del lato dipende dalla mano
  assert.equal(wantOfBallSide(true), 1); assert.equal(wantOfBallSide(false), -1);
  assert.equal(wantOfSide('forehand', 'right'), 1); assert.equal(wantOfSide('backhand', 'right'), -1); assert.equal(wantOfSide('forehand', 'left'), -1); assert.equal(wantOfSide('backhand', 'left'), 1);
  // puntini e scritta finale
  assert.deepEqual(trialDots({ forehand: 1, backhand: 2 }), ['on', '', 'on', 'on']); assert.deepEqual(trialDots(null), ['', '', '', '']); assert.deepEqual(trialDots({ forehand: 5, backhand: 0 }), ['on', 'on', '', '']);
  assert.match(trialOutro(['full']), /imparato/); assert.match(trialOutro(['ok', 'full']), /imparato/); assert.match(trialOutro(['partial']), /primi colpi/); assert.match(trialOutro(['full', 'none']), /primi colpi/);
  assert.match(TRIAL_TEXT.kicker, /Scambi di prova/); assert.match(TRIAL_TEXT.title, /Colpisci la palla/); assert.match(TRIAL_TEXT.go, /Si comincia/);
});

/* ---------- apprendimento ---------- */
const S = (dir, peak, heading = 0, rise = .1) => ({ dir, peak, rawPeak: peak*1.1, heading, head: .2*dir, shape: { rise } });
const learn = (L, list) => list.forEach(([want, s, normal = true], i) => { L.vote({ ball: i + 1, want, s }); L.mark(i + 1, normal); });
test('apprendimento: forza per verso, picco vero, salita, verso verticale e centro della mira dai colpi di prova; il profilo non è più «semplice»', () => {
  const L = createTrialLearner();
  learn(L, [[1, S(1, 700, 18, .2)], [-1, S(-1, 500, -170, -.1)], [1, S(1, 900, 22, .3)], [-1, S(-1, 600, 172, 0)]]);
  assert.equal(L.level(), 'full'); assert.deepEqual(L.counts('right'), { 1: 2, '-1': 2, forehand: 2, backhand: 2, total: 4 });
  assert.deepEqual({ ...L.counts('left'), 1: undefined, '-1': undefined, total: undefined }, { forehand: 2, backhand: 2, 1: undefined, '-1': undefined, total: undefined });
  const p = L.profile({ ...SIMPLE });
  assert.equal(p.simple, false); assert.equal(p.trial, true); assert.equal(p.trialLevel, 'full'); assert.equal(p.axis, null, 'resta il profilo del telefono sotto');
  assert.deepEqual(p.refs, { 1: 800, '-1': 550 }); assert.equal(p.ref, 650, 'mediana di tutti i colpi'); assert.equal(p.rawRef, 715);
  assert.deepEqual(p.rises, { 1: .25, '-1': -.05 }); assert.deepEqual(p.heads, { 1: .2, '-1': -.2 });
  assert.equal(p.faceRef[1].heading, 20); assert.equal(Math.abs(p.faceRef[-1].heading), 179, 'mediana circolare: −170° e +172° stanno vicini a ±179°');
  // meno colpi: 'ok' con uno per verso (quanto i due gesti di prima), 'partial' da una parte sola, 'none' con meno di due
  const ok = createTrialLearner(); learn(ok, [[1, S(1, 700)], [-1, S(-1, 500)]]);
  assert.equal(ok.level(), 'ok'); assert.deepEqual(ok.profile(SIMPLE).refs, { 1: 700, '-1': 500 });
  const part = createTrialLearner(); learn(part, [[1, S(1, 700, 10)], [-1, null], [1, S(1, 800, 14)]]);
  assert.equal(part.level(), 'partial'); const pp = part.profile(SIMPLE);
  assert.deepEqual(pp.refs, { 1: 750, '-1': 750 }, 'il verso senza colpi prende il colpo tipico di tutti'); assert.equal(pp.faceRef[1].heading, 12); assert.equal(pp.faceRef[-1], undefined); assert.equal(pp.rises[-1], undefined);
  const none = createTrialLearner(); learn(none, [[1, S(1, 700)]]);
  assert.equal(none.level(), 'none'); assert.equal(none.profile(SIMPLE), null, 'un colpo solo: resta il profilo semplice');
  assert.equal(createTrialLearner().profile(SIMPLE), null);
});

test('apprendimento: contano i colpi normali, con un verso e non deboli; per ogni palla il gesto più forte', () => {
  const L = createTrialLearner();
  // palla 1: preparazione debole (240) e poi il colpo (800): resta il colpo
  L.vote({ ball: 1, want: 1, s: S(1, 240) }); L.mark(1, true); L.vote({ ball: 1, want: 1, s: S(1, 800) }); L.mark(1, true);
  L.vote({ ball: 1, want: 1, s: S(1, 300) });                                  // più debole, dopo: non sostituisce
  assert.equal(L.samples.length, 1); assert.equal(L.samples[0].peak, 800);
  // palla 2: un pallonetto (non normale); palla 3: gesto verticale senza verso; palla 4: micro-movimento (sotto metà degli altri)
  L.vote({ ball: 2, want: -1, s: S(-1, 700) }); L.mark(2, false);
  L.vote({ ball: 3, want: 1, s: S(0, 700) }); L.mark(3, true);
  L.vote({ ball: 4, want: -1, s: S(-1, 150) }); L.mark(4, true);
  L.vote({ ball: 5, want: -1, s: S(-1, 760) }); L.mark(5, true);
  assert.deepEqual(L.counts('right'), { 1: 1, '-1': 1, forehand: 1, backhand: 1, total: 2 }, 'solo i due colpi veri');
  assert.equal(L.level(), 'ok'); assert.deepEqual(L.profile(SIMPLE).refs, { 1: 800, '-1': 760 });
  L.reset(); assert.equal(L.samples.length, 0); assert.equal(L.level(), 'none'); assert.equal(L.sign, 1);
});

test('correzione del verso: se il verso letto dal telefono non concorda con il lato delle palle il segno si gira (anche per i colpi già fatti)', () => {
  // telefono con il segno giusto: niente da girare
  const A = createTrialLearner(); learn(A, [[1, S(1, 700)], [-1, S(-1, 600)], [1, S(1, 720)], [-1, S(-1, 610)]]);
  assert.equal(A.sign, 1); assert.equal(A.flips, 0);
  // telefono al contrario: palla a destra letta −1, a sinistra +1. Dopo due colpi netti il segno si gira
  const B = createTrialLearner();
  assert.equal(B.vote({ ball: 1, want: 1, s: S(-1, 700, 20) }), 1, 'un colpo solo non basta'); B.mark(1, true);
  assert.equal(B.vote({ ball: 2, want: -1, s: S(1, 600, -15) }), -1, 'due su due al contrario: girato, già per questo colpo'); B.mark(2, true);
  learn2(B, [[1, S(-1, 720, 24)], [-1, S(1, 610, -11)]], 3);
  assert.equal(B.sign, -1); assert.equal(B.flips, 1);
  // i colpi di prima della correzione finiscono nel verso giusto: palla a destra = +1 con il suo picco e il suo centro
  const p = B.profile(SIMPLE);
  assert.deepEqual(p.refs, { 1: 710, '-1': 605 }); assert.equal(p.faceRef[1].heading, 22); assert.equal(p.faceRef[-1].heading, -13); assert.equal(p.trialSign, -1);
  assert.deepEqual(B.counts('right'), { 1: 2, '-1': 2, forehand: 2, backhand: 2, total: 4 });
  // chi tira sempre lo stesso gesto (dritto su tutte le palle) non fa girare niente: metà d'accordo, metà no
  const C = createTrialLearner(); learn(C, [[1, S(1, 700)], [-1, S(1, 700)], [1, S(1, 700)], [-1, S(1, 700)]]);
  assert.equal(C.sign, 1); assert.deepEqual(C.votes, { agree: 2, against: 2 });
  // tre contro uno: girato; poi se i colpi tornano d'accordo (quota oltre il 75 %) si rigira
  const D = createTrialLearner(); learn(D, [[1, S(-1, 700)], [-1, S(-1, 700)], [1, S(-1, 700)], [-1, S(1, 700)]]);
  assert.equal(D.sign, -1, '3 su 4 al contrario');
  const E2 = createTrialLearner(); learn(E2, [[1, S(-1, 700)], [-1, S(1, 700)]]); assert.equal(E2.sign, -1);
  learn2(E2, [[1, S(1, 700)], [-1, S(-1, 700)], [1, S(1, 700)], [-1, S(-1, 700)], [1, S(1, 700)], [-1, S(-1, 700)]], 3);
  assert.equal(E2.sign, 1, '6 su 8 d\'accordo: di nuovo com\'era'); assert.equal(E2.flips, 2);
});
function learn2(L, list, from){ list.forEach(([want, s], i) => { L.vote({ ball: from + i, want, s }); L.mark(from + i, true); }); }

test('soglie per il telefono dal profilo imparato: come la calibrazione rapida, mai sopra il colpo tipico di tutti i colpi', () => {
  assert.equal(phoneThresholds(null), null); assert.equal(phoneThresholds(SIMPLE), null, 'profilo semplice: niente');
  const th = phoneThresholds({ simple: false, ref: 660, refs: { 1: 700, '-1': 620 } }, 3);
  assert.deepEqual(th.refs, { 1: 660, '-1': 620 }, 'il verso più forte non supera il colpo tipico di tutti');
  assert.ok(Math.abs(th.minPeak - .28*620) < .1 && Math.abs(th.on - .18*620) < .1, JSON.stringify(th));
  // bambino debole: soglie basse (il profilo semplice ha 120 e 70 fisse); adulto forte: non oltre i tetti
  const kid = phoneThresholds({ simple: false, ref: 260, refs: { 1: 270, '-1': 250 } }, 3);
  assert.ok(kid.minPeak < 80 && kid.on < 50, JSON.stringify(kid));
  const big = phoneThresholds({ simple: false, ref: 1500, refs: { 1: 1500, '-1': 1400 } }, 3);
  assert.ok(big.minPeak <= 300 && big.on <= 180, JSON.stringify(big));
});

/* ---------- quando si fanno ---------- */
test('si fanno? Solo con «Giocando» e il telefono pronto; chi ha calibrato apposta con i gesti tiene il suo profilo; niente con la webcam per due', () => {
  const ready = { ready: true, soonReady: true, profile: { simple: true } }, soon = { ready: false, soonReady: true, profile: null }, off = { ready: false, soonReady: false, profile: null };
  const gesti = { ready: true, soonReady: true, profile: { simple: false, refs: {} } }, learned = { ready: true, soonReady: true, profile: { simple: false, trial: true } };
  assert.equal(trialDue({ mode: 'play', controller: 'phone', phones: [ready] }), true);
  assert.equal(trialDue({ mode: 'play', controller: 'phone', phones: [soon] }), true, 'il profilo semplice è già stato chiesto');
  assert.equal(trialDue({ mode: 'play', controller: 'phone', phones: [off] }), false);
  assert.equal(trialDue({ mode: 'gesti', controller: 'phone', phones: [ready] }), false); assert.equal(trialDue({ mode: 'none', controller: 'phone', phones: [ready] }), false);
  assert.equal(trialDue({ mode: 'play', controller: 'webcam', phones: [ready] }), false); assert.equal(trialDue({ mode: 'play', controller: 'mouse', phones: [ready] }), false);
  assert.equal(trialDue({ mode: 'play', controller: 'phone', phones: [gesti] }), false, 'profilo dei gesti: resta'); assert.equal(trialDue({ mode: 'play', controller: 'phone', phones: [learned] }), true, 'profilo degli scambi di prova: si rifanno');
  assert.ok(gestureProfile(gesti) && !gestureProfile(learned) && !gestureProfile(ready) && !gestureProfile(off));
  // stesso schermo: i due telefoni pronti; con la webcam per due no
  assert.equal(trialDue({ mode: 'play', split: true, phones: [ready, learned] }), true); assert.equal(trialDue({ mode: 'play', split: true, phones: [ready, off] }), false);
  assert.equal(trialDue({ mode: 'play', split: true, webcamDuo: true, phones: [ready, ready] }), false); assert.equal(trialDue({ mode: 'play', split: true, phones: [gesti, gesti] }), false);
  assert.equal(trialDue({ mode: 'play', split: true, phones: [gesti, ready] }), true, 'uno dei due senza gesti: si fanno');
  // pagina «Collega»: senza i gesti non si va in campo per calibrare (solo per il tutorial); nella sfida tra due computer sì, per gli scambi di prova
  assert.equal(connectTarget({ mode: 'cpu', controller: 'phone', phoneReady: false, autoSimple: true }), 'match'); assert.equal(connectTarget({ mode: 'cpu', controller: 'phone', phoneReady: false }), 'court');
  assert.equal(connectTarget({ mode: 'cpu', controller: 'phone', phoneReady: false, autoSimple: true, tutorialDue: true }), 'court');
  assert.equal(connectTarget({ mode: 'friend', controller: 'phone', phoneReady: true, autoSimple: true, trial: true }), 'court'); assert.equal(connectTarget({ mode: 'friend', controller: 'phone', phoneReady: true, autoSimple: true }), 'match');
});

/* ---------- nel gioco ---------- */
// mondo con la calibrazione «Giocando», telefono collegato che risponde come la pagina vera; tutorial corto già visto
async function playWorld({ cal = 'play', tutorial = true, mode = 'cpu' } = {}){
  const w = await makeWorld({ controller: 'phone', cal }), P = w.ui.phone;
  phoneLike(P, w.link); w.advance(200);
  if (tutorial) P.markTutorialSeen('short');
  // (telefono già collegato arrivando alla pagina «Collega»: si va avanti con «Alla partita ›»)
  if (mode){ w.lobby.go('mode'); w.lobby.setMode(mode); w.lobby.go('controller'); w.lobby.go('connect'); w.advance(300); w.lobby.next(); w.advance(300); }
  return { ...w, P };
}
// gioca gli scambi di prova: hit(id, n, want, side) → il colpo (o null: non colpisce); want è il lato che si vede (palla a
// destra +1 o a sinistra −1 di chi gioca), side il lato deciso dal gioco al lancio. Restituisce i colpi fatti
function playTrial(w, hit = (id, n, want) => stroke({ dir: want }), { phones = { p1: w.ui.phone }, max = 30000 } = {}){
  const { E, ui } = w, log = [], sides = [], n = { p1: 0, p2: 0 }, seen = { p1: -1, p2: -1 }, t0 = performance.now();
  while (ui.trial.active && performance.now() - t0 < max){
    w.advance(16);
    for (const id of Object.keys(phones)){
      const ball = phones[id].trial?.ball ?? -1;
      if (!hot(E, id) || seen[id] === ball) continue;
      seen[id] = ball; n[id]++;
      const want = ballWant(E, id), side = ui.trial.S?.side, s = hit(id, n[id], want, side);
      sides.push(side);
      if (s){ phones[id]._onSwing(s); log.push({ id, want, at: +((performance.now() - t0)/1000).toFixed(2) }); }
    }
  }
  return { log, sides, seconds: (performance.now() - t0)/1000 };
}

test('telefono senza gesti: appena comincia a calibrare riceve il profilo semplice; con «Con i gesti» no; con il tutorial aperto dopo', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), P = w.ui.phone;
  phoneLike(P, w.link);
  assert.ok(P.autoSimple && !P.ready && P.soonReady, 'sensori attivi, in calibrazione: pronto tra un attimo');
  w.advance(100);
  assert.deepEqual(w.link.cmds, ['skip'], 'il comando di «Salta», che ogni pagina del telefono conosce'); assert.ok(P.ready && P.profile.simple && P.simple);
  w.advance(3000); assert.deepEqual(w.link.cmds, ['skip'], 'una volta sola');
  // con il tutorial aperto il telefono aspetta: niente comando finché non si chiude
  const w2 = await makeWorld({ controller: 'phone', cal: 'play' }), P2 = w2.ui.phone; phoneLike(P2, w2.link);
  P2.waitTutorial(true); w2.link.L.phone = 'tut'; w2.advance(1500);
  assert.deepEqual(w2.link.cmds, []); assert.ok(!P2.soonReady);
  P2.waitTutorial(false); w2.link.L.phone = 'cal'; w2.advance(100); assert.deepEqual(w2.link.cmds, ['skip']);
  // «Con i gesti»: com'era (nessun comando da solo); «Nessuna»: profilo semplice come «Giocando»
  const g = await makeWorld({ controller: 'phone', cal: 'gesti' }); phoneLike(g.ui.phone, g.link); g.advance(1500);
  assert.deepEqual(g.link.cmds, []); assert.ok(!g.ui.phone.autoSimple && !g.ui.phone.ready);
  const n = await makeWorld({ controller: 'phone', cal: 'none' }); phoneLike(n.ui.phone, n.link); n.advance(100);
  assert.deepEqual(n.link.cmds, ['skip']);
  // «Calibra con i gesti» chiesto apposta con «Giocando»: la calibrazione con i gesti parte e nessuno la salta
  P.recalibrate({ gestures: true }); w.advance(1500);
  assert.deepEqual(w.link.cmds, ['skip', 'cal']); assert.ok(!P.autoSimple && !P.ready, 'in calibrazione con i gesti');
  P._onCal({ kind: 'done', profile: { ...SIMPLE, simple: false, refs: { 1: 600, '-1': 600 }, ref: 600 } }); w.link.ready = true; w.link.L.phone = 'ready';
  assert.ok(P.gestureProfile && P.autoSimple, 'finita: il profilo dei gesti resta, l\'opzione torna a valere');
});

test('contro la CPU: «Gioca» → scambi di prova → «Si comincia!» → partita da 0-0, senza altri tocchi; il gioco impara forza, salita e mira per lato', async () => {
  const w = await playWorld(), { E, ui, lobby, link, P } = w;
  assert.equal(lobby.step, 'match', 'dalla pagina «Collega» alla pagina «Partita»: niente campo, niente calibrazione'); assert.ok(!ui.training.active);
  assert.match($('lobby-match-note').textContent, /scambio di prova/);
  const seq0 = E.natpfMatchSeq || 0, cmds0 = link.cmds.length;
  assert.equal(w.pressStart(), false, '«Gioca»: prima gli scambi di prova'); assert.ok(ui.trial.active && !lobby.visible);
  assert.deepEqual(link.cmds.slice(cmds0), ['cal', 'skip'], 'il telefono riparte dal profilo semplice');
  assert.equal(E.natpfMatchSeq || 0, seq0, 'la partita non è ancora partita'); assert.ok(!$('natpf-trial').classList.contains('hidden'));
  assert.ok(document.body.classList.contains('natpf-training') && document.body.classList.contains('natpf-trial-on'), 'tabellone nascosto, niente scritte dell\'esito');
  w.advance(500); assert.equal($('natpf-trial').dataset.state, 'intro');
  let judged = 0; const fb = ui.shot.onLocalFeedback.bind(ui.shot); ui.shot.onLocalFeedback = e => { judged++; return fb(e); };
  let shots = 0; const onShot = ui.training.onShot.bind(ui.training); ui.training.onShot = q => { shots++; return onShot(q); };
  const marks = []; P.onSwing(ev => marks.push(!!ev.natpf?.prova));
  // dritti a 700 °/s con il piatto a +20°, rovesci a 520 °/s con il piatto a −14°
  const r = playTrial(w, (id, n, want) => stroke({ dir: want, peak: want > 0 ? 700 : 520, heading: want > 0 ? 20 : -14, rise: want > 0 ? .2 : .05 }));
  assert.equal(r.log.length, 4, JSON.stringify(r.log)); assert.deepEqual(r.log.map(x => x.want), [1, -1, 1, -1], 'palle alternate: destra, sinistra, destra, sinistra');
  assert.ok(r.seconds > 8 && r.seconds < 14, `scambi di prova in ${r.seconds.toFixed(1)} s (circa 10–15)`);
  // la partita vera è partita da sola, da 0-0
  assert.ok(!ui.trial.active); assert.equal(E.natpfMatchSeq, seq0 + 1, 'una partita nuova'); assert.equal(E.phase, 'SERVE_STANCE');
  assert.deepEqual([E.score.playerPoints, E.score.opponentPoints, E.score.playerGames, E.score.opponentGames], [0, 0, 0, 0]);
  assert.ok($('natpf-trial').classList.contains('hidden') && !document.body.classList.contains('natpf-training') && !document.body.classList.contains('natpf-trial-on'));
  assert.ok(E.opponent.root?.visible !== false && Math.abs(E.opponent.pos.z) < 13, 'l\'avversario è tornato in campo');
  // imparato: profilo non più semplice, forza per verso, salita, centro della mira; colpo tipico dai colpi di prova
  assert.equal(P.profile.simple, false); assert.equal(P.profile.trialLevel, 'full'); assert.ok(!P.simple);
  assert.deepEqual(P.profile.refs, { 1: 700, '-1': 520 }); assert.deepEqual(P.profile.rises, { 1: .2, '-1': .05 });
  assert.equal(P.aimModel.center(1), 20); assert.equal(P.aimModel.center(-1), -14); assert.equal(P.typicalModel.value, 610, 'colpo tipico dai quattro colpi di prova');
  assert.ok(P.typicalModel.seen.length === 4);
  // i colpi di prova non contano: nessun esito giudicato, niente per l'allenamento, marcati «prova»
  assert.equal(judged, 0); assert.equal(shots, 0); assert.deepEqual(marks, [true, true, true, true]);
  // il telefono ha saputo degli scambi di prova (fase con tr) e delle soglie imparate (pf)
  const ph = link.sent.filter(m => m.t === 'ph');
  assert.ok(ph.some(m => m.ph === 'play' && m.tr === 1)); w.advance(100); assert.ok(!link.sent.filter(m => m.t === 'ph').at(-1).tr, 'in partita niente tr');
  assert.deepEqual(link.sent.filter(m => m.t === 'pf').at(-1).refs, { 1: 610, '-1': 520 });
  // un colpo in partita non è più «prova»
  marks.length = 0; P._onSwing(stroke({ dir: 1 })); assert.deepEqual(marks.filter(Boolean), []);
});

test('chi non colpisce mai non resta fermo: allo scadere la partita parte con il profilo semplice; chi colpisce una volta per lato impara lo stesso', async () => {
  const w = await playWorld(), { E, ui, P } = w;
  w.pressStart();
  const r = playTrial(w, () => null);
  assert.equal(r.log.length, 0); assert.ok(r.seconds > 12 && r.seconds <= 19, `partita dopo ${r.seconds.toFixed(1)} s (tetto circa 20)`);
  assert.ok(!ui.trial.active && E.phase === 'SERVE_STANCE' && E.natpfMatchSeq === 1); assert.ok(P.profile.simple, 'ripiego: profilo semplice, il gioco impara dai colpi veri');
  assert.deepEqual([E.score.playerPoints, E.score.opponentPoints], [0, 0]);
  // una volta per lato (poi palle perse): livello «ok», come i due gesti di prima
  const v = await playWorld(); v.pressStart();
  const r2 = playTrial(v, (id, n, want) => (n <= 2 ? stroke({ dir: want, peak: 640 }) : null));
  assert.equal(r2.log.length, 2); assert.ok(r2.seconds <= 19, `${r2.seconds.toFixed(1)} s`);
  assert.equal(v.P.profile.simple, false); assert.equal(v.P.profile.trialLevel, 'ok'); assert.deepEqual(v.P.profile.refs, { 1: 640, '-1': 640 });
  // solo dal dritto: «partial» (le palle in più vanno dal lato che manca, il rovescio)
  const u = await playWorld(); u.pressStart();
  const r3 = playTrial(u, (id, n, want, side) => (side === 'forehand' ? stroke({ dir: 1, peak: 700 }) : null));
  assert.deepEqual(r3.sides, ['forehand', 'backhand', 'forehand', 'backhand', 'backhand', 'backhand'], 'quinta e sesta palla dal lato che manca'); assert.equal(r3.log.length, 2);
  assert.equal(u.P.profile.trialLevel, 'partial'); assert.equal(u.P.aimModel.center(-1), null, 'il rovescio si impara dai primi colpi veri');
  // «Salta ›»: la partita parte subito con quello che c'è
  const s = await playWorld(); s.pressStart(); s.advance(2500); assert.ok(s.ui.trial.active);
  $('trial-skip').click(); s.advance(600);
  assert.ok(!s.ui.trial.active && s.E.natpfMatchSeq === 1 && s.E.phase === 'SERVE_STANCE', '«Salta»: partita subito');
});

test('verso al contrario e mancini: il segno si gira dai colpi di prova, i colpi dopo si leggono dal lato giusto, il verso atteso va al telefono girato', async () => {
  const w = await playWorld(), { E, ui, link, P } = w;
  w.pressStart();
  const sides = []; P.onSwing(ev => { if (!ev.ignored) sides.push(ev.side); });
  // il telefono legge tutto al contrario: palla a destra → −1
  playTrial(w, (id, n, want) => stroke({ dir: -want, peak: want > 0 ? 700 : 520, heading: want > 0 ? 20 : -14 }));
  assert.equal(P.dirSign, -1, 'segno girato'); assert.equal(P.profile.trialSign, -1);
  assert.deepEqual(sides.slice(1), ['backhand', 'forehand', 'backhand'], 'dal secondo colpo il lato è quello della palla (il primo, da solo, non basta a decidere)');
  assert.deepEqual(P.profile.refs, { 1: 700, '-1': 520 }, 'i colpi di prima della correzione stanno nel verso giusto'); assert.equal(P.aimModel.center(1), 20); assert.equal(P.aimModel.center(-1), -14);
  // in partita: un gesto che il telefono chiama −1 è un dritto del destro
  sides.length = 0; E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent';
  P._onSwing(stroke({ dir: -1 })); assert.equal(sides.at(-1), 'forehand');
  // … e il verso atteso mandato al telefono è girato (per lui dritto e rovescio sono scambiati)
  E._idle?.(); E.phase = 'RALLY'; Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent' });
  E.ball.pos.set(2, 1, 0); E.ball.vel.set(0, 0, 12); E.ball.targetLanding?.set?.(2, 0, 9); E.player.pos.set(0, 0, 11.4); E.natpfPlan = null; P.lastExpect = null; P.update();
  assert.equal(link.sent.filter(m => m.t === 'ex').at(-1).d, -1, 'palla a destra: al telefono −1');
  // partita dopo: si riparte dal segno com'è (profilo nuovo, niente di imparato)
  P._onCal({ kind: 'done', profile: { ...SIMPLE } }); assert.equal(P.dirSign, 1);
  // mancino: la palla sul dritto è alla sua sinistra, il verso atteso è −1 e il lato letto è «dritto»
  const m = await playWorld(); m.ui.hand.set('left'); assert.equal(m.P.hand, 'left');
  m.pressStart();
  const ms = [], wants = []; m.P.onSwing(ev => { if (!ev.ignored) ms.push(ev.side); });
  playTrial(m, (id, n, want) => { wants.push(want); return stroke({ dir: want, peak: want < 0 ? 700 : 520 }); });
  assert.deepEqual(wants, [-1, 1, -1, 1], 'mancino: prima la palla sul dritto, alla sua sinistra'); assert.deepEqual(ms, ['forehand', 'backhand', 'forehand', 'backhand']);
  assert.equal(m.P.dirSign, 1); assert.deepEqual(m.P.profile.refs, { 1: 520, '-1': 700 }); assert.deepEqual(m.P.trialCounts?.() ?? null, { 1: 2, '-1': 2, forehand: 2, backhand: 2, total: 4 });
});

test('molte persone, un telefono: a ogni partita gli scambi di prova ripartono e riapprendono da capo (forza, mira, verso)', async () => {
  const w = await playWorld(), { E, ui, lobby, link, P } = w;
  // primo giocatore: adulto forte, verso al contrario
  w.pressStart(); playTrial(w, (id, n, want) => stroke({ dir: -want, peak: 1200, heading: want > 0 ? 30 : -30 }));
  assert.equal(P.profile.ref, 1200); assert.equal(P.dirSign, -1);
  for (let i = 0; i < 6; i++){ E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; P._onSwing(stroke({ dir: i % 2 ? 1 : -1, peak: 1250 })); }
  assert.ok(P.typicalModel.value > 1100);
  // «Gioca ancora» senza «Nuovo giocatore»: pagina «Partita», poi «Gioca»
  ui.backToMenu('match'); assert.equal(lobby.step, 'match');
  const cmds0 = link.cmds.length;
  assert.equal(w.pressStart(), false, 'di nuovo gli scambi di prova'); assert.deepEqual(link.cmds.slice(cmds0), ['cal', 'skip']);
  assert.ok(P.profile.simple && P.typicalModel.value == null && P.typicalModel.seen.length === 0 && P.dirSign === 1 && P.aimModel.center(1) == null, 'niente del giocatore di prima');
  // secondo giocatore: bambino debole, verso giusto
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: 300, heading: want > 0 ? -10 : 10 }));
  assert.equal(P.profile.ref, 300); assert.equal(P.typicalModel.value, 300); assert.equal(P.dirSign, 1); assert.equal(P.aimModel.center(1), -10);
  assert.equal(E.natpfMatchSeq, 2);
  // il primo colpo del bambino in partita: forza letta sul suo colpo, non su quello dell'adulto
  let power = null; const off = P.onSwing(ev => { power = ev.natpf?.intent?.power ?? ev.natpf?.power; });
  E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; P._onSwing(stroke({ dir: 1, peak: 300 })); off();
  let strong = null; const P2 = (await playWorld()).P; P2.onSwing(ev => { strong = ev.natpf?.intent?.power ?? ev.natpf?.power; });
  assert.ok(power > .3, `forza del proprio colpo tipico: ${power}`);
});

test('«Con i gesti» e «Nessuna»: niente scambi di prova; con «Nessuna» chi gioca riparte comunque dal profilo semplice', async () => {
  // con i gesti: telefono calibrato come prima, «Gioca» fa partire subito la partita e non tocca il profilo
  const g = await makeWorld({ controller: 'phone', cal: 'gesti' }); phoneLike(g.ui.phone, g.link);
  g.ui.phone.markTutorialSeen('short'); g.link.ready = true; g.link.L.phone = 'ready';
  g.ui.phone._onCal({ kind: 'done', profile: { ...SIMPLE, simple: false, ref: 600, refs: { 1: 600, '-1': 600 } } });
  g.lobby.go('mode'); g.lobby.setMode('cpu'); g.lobby.go('match');
  const c0 = g.link.cmds.length;
  assert.equal(g.pressStart(), true); assert.ok(!g.ui.trial.active && g.E.natpfMatchSeq === 1); assert.deepEqual(g.link.cmds.slice(c0), []);
  assert.equal(g.ui.phone.profile.ref, 600);
  // nessuna: partita subito, ma il telefono riparte dal profilo semplice (cal + skip)
  const n = await playWorld({ cal: 'none' });
  const c1 = n.link.cmds.length;
  assert.equal(n.pressStart(), true); assert.ok(!n.ui.trial.active && n.E.natpfMatchSeq === 1);
  assert.deepEqual(n.link.cmds.slice(c1), ['cal', 'skip']); assert.ok(n.P.profile.simple);
  // «Giocando» con la webcam o con mouse e tastiera: niente scambi di prova
  const m = await makeWorld({ controller: 'mouse', cal: 'play' }); m.lobby.go('mode'); m.lobby.setMode('cpu'); m.lobby.go('match');
  assert.equal(m.pressStart(), true); assert.ok(!m.ui.trial.active);
  // «Giocando» con un profilo fatto apposta con i gesti: resta, niente scambi di prova
  const k = await playWorld(); k.P._onCal({ kind: 'done', profile: { ...SIMPLE, simple: false, ref: 640, refs: { 1: 640, '-1': 640 } } });
  assert.equal(k.pressStart(), true); assert.equal(k.P.profile.ref, 640);
});

test('durante gli scambi di prova i punti non contano e la pausa del telefono non rigioca niente; tornare al menu li chiude', async () => {
  const w = await playWorld(), { E, ui, lobby } = w;
  w.pressStart(); w.advance(1500);
  assert.equal(E.phase, 'RALLY', 'prima palla in arrivo');
  // il motore chiede un punto (palla non presa): nessun punto, la palla è solo finita
  E._awardPoint('opponent', 'Point');
  assert.deepEqual([E.score.playerPoints, E.score.opponentPoints], [0, 0]); assert.equal(E.phase, 'POINT_OVER');
  w.advance(1200); assert.equal(E.phase, 'RALLY', 'palla dopo'); assert.ok(ui.trial.active);
  // dopo qualche secondo fermi il motore non prepara il servizio da solo
  // menu: chiusi, campo e telefono come prima, nessuna partita
  ui.backToMenu();
  assert.ok(!ui.trial.active && lobby.visible && !ui.phone.trialOn && (E.natpfMatchSeq || 0) === 0);
  assert.ok($('natpf-trial').classList.contains('hidden') && !document.body.classList.contains('natpf-trial-on'));
  // di nuovo «Gioca»: ripartono
  lobby.go('match'); assert.equal(w.pressStart(), false); assert.ok(ui.trial.active);
});

test('stesso schermo: scambi di prova per tutti e due con un palleggio assistito, poi la partita; ognuno impara il suo colpo', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { E, ui, lobby, link } = w, P1 = ui.phone;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = { connected: true, ready: false, L: { state: 'connected', phone: 'cal' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); if (c === 'skip' || c === 'confirm'){ this.ready = true; this.L.phone = 'ready'; } if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){} };
  phoneLike(P1, link); phoneLike(P2, l2);
  P1.markTutorialSeen('short'); P2.markTutorialSeen('short');
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint(); w.advance(300);
  assert.ok(P1.ready && P2.ready && ui.split.bothReady(), 'pronti senza gesti'); assert.deepEqual(l2.cmds, ['skip']);
  assert.match(ui.split.status('p2').sub, /Si calibra giocando/);
  w.advance(3600);                                   // conto alla rovescia, poi «Gioca» da solo
  assert.ok(E.natpfSplit.active && ui.trial.active && ui.trial.S.split, 'sessione dello stesso schermo e scambi di prova'); assert.equal(E.natpfMatchSeq || 0, 0);
  const r = playTrial(w, (id, n, want) => stroke({ dir: want, peak: id === 'p2' ? 380 : 820 }), { phones: { p1: P1, p2: P2 } });
  assert.ok(r.log.filter(x => x.id === 'p1').length >= 4 && r.log.filter(x => x.id === 'p2').length >= 4, JSON.stringify(r.log));
  assert.ok(r.seconds < 17, `scambi di prova in ${r.seconds.toFixed(1)} s`);
  // il palleggio alterna: dopo il colpo di uno la palla va all'altro
  for (let i = 1; i < r.log.length; i++) assert.notEqual(r.log[i].id, r.log[i - 1].id, JSON.stringify(r.log));
  assert.ok(!ui.trial.active && E.natpfMatchSeq === 1 && E.natpfSplit.active && E.phase === 'SERVE_STANCE', 'partita vera nello stesso schermo');
  assert.equal(P1.profile.trialLevel, 'full'); assert.equal(P2.profile.trialLevel, 'full');
  assert.equal(P1.profile.ref, 820); assert.equal(P2.profile.ref, 380, 'ognuno il suo colpo');
  assert.deepEqual([E.score.playerPoints, E.score.opponentPoints], [0, 0]);
  // rivincita dai telefoni (le stesse due persone): partita subito, senza scambi di prova e senza perdere il profilo
  for (let i = 0; i < 8 && E.phase !== 'MATCH_OVER'; i++) E._awardPoint('player', 'Nice Shot!');
  assert.equal(E.phase, 'MATCH_OVER'); w.advance(300);
  ui.split._onRematch('p1'); ui.split._onRematch('p2'); w.advance(300);
  assert.equal(E.natpfMatchSeq, 2); assert.ok(!ui.trial.active); assert.equal(P1.profile.ref, 820); assert.equal(P2.profile.ref, 380);
});

test('minigiochi e Allenamento: prima del minigioco gli scambi di prova (non con «Gioca ancora»); nell\'Allenamento il gioco impara dai primi esercizi', async () => {
  const w = await playWorld({ mode: null }), { E, ui, lobby, P } = w;
  ui.events.nickname = 'Marta'; lobby.challenge = 'rush'; lobby.setMode('challenge'); lobby.go('connect'); w.advance(300); lobby.next(); w.advance(300);
  assert.ok(ui.trial.active && !ui.events.active, 'prima gli scambi di prova');
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: 600 }));
  assert.ok(!ui.trial.active && ui.events.active, 'poi il minigioco'); assert.equal(P.profile.trialLevel, 'full');
  // «Gioca ancora» del risultato (la stessa persona): niente scambi di prova
  ui.events.abort?.(); lobby._resultAction('again');
  assert.ok(!ui.trial.active && ui.events.active);
  ui.backToMenu();
  // Allenamento con «Giocando»: nessuna calibrazione in campo; dritto e rovescio (palle dal lato noto) insegnano il profilo
  const a = await playWorld({ mode: null }), T = a.ui.training, PA = a.P;
  a.lobby.menu('training'); a.lobby.go('connect'); a.advance(300); a.lobby.next(); a.advance(300);
  // (nell'Allenamento il tutorial completo, dalla sesta scheda: si chiude subito con Invio, B28)
  assert.ok(T.active && T.tutorialOpen && !PA.trialOn); a.key('Enter', 'Enter'); a.advance(300);
  assert.ok(T.active && !T.tutorialOpen && !T.cal && T.learn && PA.trialOn, 'in campo: esercizi, niente tappa della calibrazione, apprendimento acceso');
  assert.deepEqual(a.link.cmds.slice(-2), ['cal', 'skip'], 'da capo: chi si allena non eredita niente');
  let seen = -1;
  for (let k = 0; k < 1500 && T.learn; k++){
    a.advance(16);
    if (hot(a.E, 'p1') && seen !== PA.trial.ball){ seen = PA.trial.ball; const want = ballWant(a.E); PA._onSwing(stroke({ dir: want, peak: want > 0 ? 680 : 560 })); a.advance(150); }
  }
  assert.ok(!T.learn && !PA.trialOn, 'due colpi per lato: imparato'); assert.equal(PA.profile.simple, false); assert.deepEqual(PA.profile.refs, { 1: 680, '-1': 560 });
  a.advance(3000); assert.ok(T.active && T.idx >= 2, 'l\'allenamento continua con gli altri esercizi');
  T.stop({ completed: false, silent: true });
});
