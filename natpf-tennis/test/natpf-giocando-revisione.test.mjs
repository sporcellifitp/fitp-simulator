// B28, giro 2 (12/11/2026) · Revisione indipendente della calibrazione giocando: i difetti trovati, ognuno riprodotto
// qui prima della correzione, e i percorsi della modalità di base («Calibrazione: Giocando») che le altre prove non
// toccavano perché ora partono con «Con i gesti»: «Nuovo giocatore», telefono che cade o si ricollega, chiosco, stesso
// schermo (pausa del telefono, «Ricalibra», coppia mista), sfida tra due computer (ospite che esce, rivincita),
// minigioco, opzione dello stand cambiata a metà, telecomando dello staff.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { phoneLike, stroke, hot, ballWant, SIMPLE, playWorld, playTrial, secondPhone } from './trial-world.mjs';
import { writeCalMode, forgetCalMode, TRIAL } from '../src/natpf/natpf_trial_learn.js';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { remoteScreen, remoteCommands } from '../src/natpf/natpf_remote_map.js';

const hidden = id => $(id).classList.contains('hidden');
// profilo fatto con i gesti (calibrazione rapida): non semplice, senza «trial»
const GESTURE = Object.freeze({ ...SIMPLE, simple: false, refs: { 1: 600, '-1': 560 }, ref: 580, axis: [0, 1, 0] });

/* ---------- difetto 2: sfida tra due computer, il Player 2 esce dagli scambi di prova ---------- */
test('revisione 2: Player 2 dell\'invito che lascia gli scambi di prova (pausa → menu, chiosco): torna Player 2 non pronto, come con i gesti; rifarli funziona', async () => {
  const w = await makeWorld({ controller: 'phone', role: 'p2', cal: 'play' }), { E, ui } = w, P = ui.phone, V = ui.versus;
  phoneLike(P, w.link); w.advance(300); P.markTutorialSeen('short');
  let left = 0; V.leave = () => { left++; };
  assert.ok(V.p2 && E.playerRole === 'p2' && P.ready);
  V.primary(); w.advance(1500);
  assert.ok(ui.trial.active && E.playerRole === 'p1' && V.local && E.motionController.localPractice, 'scambi di prova in locale');
  ui.backToMenu(); w.advance(500);
  assert.ok(!ui.trial.active);
  assert.deepEqual([E.playerRole, !!V.local, E.motionController.localPractice, E.isMultiplayer, V.ready, left], ['p2', false, false, true, false, 0], 'di nuovo Player 2, non pronto, ancora nella stanza');
  assert.ok(!hidden('natpf-guest-modal'), 'pannello del Player 2 di nuovo in vista');
  // un secondo «Torna al menu» lascia la stanza, come sempre
  ui.backToMenu(); assert.equal(left, 1);
  // «Sono pronto» rifà gli scambi di prova (non resta «già fatti»)
  V.primary(); w.advance(500); assert.ok(ui.trial.active && E.playerRole === 'p1');
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: 640 })); w.advance(300);
  assert.deepEqual([E.playerRole, !!V.local, V.ready], ['p2', false, true], 'finiti: Player 2 pronto'); assert.equal(P.profile.ref, 640);
  // pronto: il pulsante non rifà gli scambi di prova
  V.primary(); assert.ok(!ui.trial.active);
});

/* ---------- stesso schermo ---------- */
// due telefoni pronti senza gesti, pagina «Racchette», conto alla rovescia e «Gioca» da solo: scambi di prova per due
async function splitWorld({ cal = 'play', start = true } = {}){
  const w = await makeWorld({ controller: 'phone', cal }), { E, ui, lobby, link } = w, P1 = ui.phone;
  const { P2, l2 } = secondPhone(E, NatpfPhoneRacket);
  phoneLike(P1, link);
  P1.markTutorialSeen('short'); P2.markTutorialSeen('short');
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint(); w.advance(300);
  if (start) w.advance(3600);
  return { ...w, P1, P2, l2, phones: { p1: P1, p2: P2 } };
}

/* ---------- difetto 3: pausa del telefono del Player 2 durante uno scambio di prova ---------- */
test('revisione 3: stesso schermo, il telefono del Player 2 si ferma 1 s durante uno scambio di prova: niente punto «rigiocato», le palle continuano e tutti e due imparano', async () => {
  const w = await splitWorld(), { E, ui, P1, P2, l2 } = w;
  assert.ok(ui.trial.active && ui.trial.S.split);
  const t0 = performance.now(), seen = { p1: -1, p2: -1 }; let dropped = 0, back = 0, held = false, stance = 0;
  while (ui.trial.active && performance.now() - t0 < 40000){
    w.advance(16);
    const t = performance.now() - t0;
    if (!dropped && ui.trial.S?.receiver === 'p2' && E.phase === 'RALLY' && ui.trial.S.phase === 'ball'){ dropped = t; l2.L.vis = false; }
    if (dropped && !back && t - dropped > 1000){ back = t; l2.L.vis = true; }
    if (ui.split.hold) held = true;
    if (back && ui.trial.active && E.phase === 'SERVE_STANCE') stance++;
    for (const [id, P] of [['p1', P1], ['p2', P2]]){
      const ball = P.trial?.ball ?? -1;
      if (!hot(E, id) || seen[id] === ball) continue;
      seen[id] = ball; P._onSwing(stroke({ dir: ballWant(E, id) }));
    }
  }
  const seconds = (performance.now() - t0)/1000;
  assert.ok(dropped && back && held, 'il telefono del Player 2 si è fermato e la partita ha aspettato');
  assert.equal(stance, 0, 'nessun servizio preparato sotto il cartello degli scambi di prova');
  assert.ok(seconds < 19, `scambi di prova finiti in ${seconds.toFixed(1)} s (pausa e conto alla rovescia compresi; prima 21,3 s senza imparare)`);
  assert.deepEqual([P1.profile.trialLevel, P2.profile.trialLevel], ['full', 'full']);
  assert.ok(!ui.trial.active && E.natpfMatchSeq === 1 && E.phase === 'SERVE_STANCE');
  // in partita la pausa del telefono rigioca il punto, come prima
  w.advance(600); E.phase = 'RALLY'; l2.L.vis = false; w.advance(700); assert.ok(ui.split.hold); l2.L.vis = true; w.advance(4500);
  assert.ok(!ui.split.hold); assert.equal(E.phase, 'SERVE_STANCE', 'punto rigiocato');
});

/* ---------- difetto 4: opzione dello stand cambiata, niente passa da un visitatore al successivo ---------- */
// fine della calibrazione con i gesti, come la manda il telefono
const gestureDone = (w, P = w.P, link = w.link, profile = GESTURE) => { P._onCal({ kind: 'done', step: 'done', profile: { ...profile, hand: P.hand } }); link.ready = true; link.L.phone = 'ready'; w.advance(100); };
const endMatch = w => { for (let i = 0; i < 12 && w.E.phase !== 'MATCH_OVER'; i++) w.E._awardPoint('player', 'Nice Shot!'); assert.equal(w.E.phase, 'MATCH_OVER'); w.advance(300); w.ui.backToMenu('match'); w.advance(300); };
const setCal = (w, mode) => { for (let i = 0; i < 3 && localStorage.getItem('natpf-tennis.calibrazione') !== mode; i++) w.ui.kiosk.run('cal'); assert.equal(localStorage.getItem('natpf-tennis.calibrazione'), mode); w.advance(100); };

test('revisione 4: Giocando → Con i gesti: chi arriva dopo non gioca con il profilo imparato da chi c\'era prima; il telefono rifà i gesti senza QR', async () => {
  const w = await playWorld(), { E, ui, lobby, link, P } = w;
  w.pressStart(); playTrial(w, (id, n, want) => stroke({ dir: want, peak: 900 }));
  assert.equal(E.natpfMatchSeq, 1); assert.deepEqual([P.profile.ref, P.madeBy], [900, 'prova']);
  // l'addetto cambia l'opzione a partita in corso: la partita non si tocca
  let c0 = link.cmds.length; setCal(w, 'gesti');
  assert.deepEqual(link.cmds.slice(c0), [], 'in partita niente'); assert.ok(P.ready && P.calStale);
  endMatch(w); assert.equal(lobby.step, 'match');
  // «Gioca» del visitatore dopo: il profilo imparato non conta, il telefono torna a calibrare con i gesti
  c0 = link.cmds.length;
  assert.equal(w.pressStart(), false, 'non si parte'); assert.deepEqual(link.cmds.slice(c0), ['cal']); assert.ok(!P.ready && !P.autoSimple);
  assert.ok(!hidden('natpf-phone-modal'), 'pannello del telefono con i passi della calibrazione'); assert.equal(E.natpfMatchSeq, 1);
  w.advance(1500); assert.deepEqual(link.cmds.slice(c0), ['cal'], 'nessun «Salta» da solo');
  gestureDone(w); w.advance(600);
  assert.deepEqual([P.madeBy, P.profile.ref, P.calStale], ['gesti', 580, false]);
  // la partita parte con il profilo dei gesti (il clic lo rifà il pannello quando il telefono è pronto)
  if (E.natpfMatchSeq === 1){ ui.closePhone?.(); assert.equal(w.pressStart(), true); }
  assert.equal(E.natpfMatchSeq, 2); assert.ok(!ui.trial.active);
  // «Con i gesti»: il profilo resta com'era prima del B28, fino a «Nuovo giocatore» o «Ricalibra»
  endMatch(w); c0 = link.cmds.length;
  assert.equal(w.pressStart(), true); assert.deepEqual(link.cmds.slice(c0), []); assert.equal(P.profile.ref, 580); assert.equal(E.natpfMatchSeq, 3);
  // al menu il cambio vale subito: da «Giocando» (profilo dato dal gioco) a «Con i gesti» il telefono chiede i gesti
  const v = await playWorld(); assert.ok(v.P.ready && v.P.madeBy === 'auto' && v.lobby.visible);
  const c1 = v.link.cmds.length; setCal(v, 'gesti');
  assert.deepEqual(v.link.cmds.slice(c1), ['cal']); assert.ok(!v.P.ready);
  // «Salta» premuto apposta con «Con i gesti» (com'era): conta, non si richiede di nuovo
  v.link.cmd('skip'); v.advance(200); assert.ok(v.P.ready && v.P.profile.simple); assert.equal(v.P.madeBy, 'salta'); assert.ok(!v.P.calStale);
  assert.equal(v.pressStart(), true, 'si gioca con il profilo semplice scelto apposta');
});

test('revisione 4: Con i gesti → Giocando: il telefono calibrato con i gesti da chi c\'era prima fa gli scambi di prova a ogni «Gioca», da capo', async () => {
  // A calibra con i gesti e non gioca; l'addetto passa a «Giocando»
  const w = await playWorld({ cal: 'gesti', mode: null }), { E, ui, lobby, link, P } = w;
  link.cmd('confirm'); gestureDone(w, P, link, { ...GESTURE, ref: 980, refs: { 1: 980, '-1': 900 }, faceRef: { 1: { heading: 25 }, '-1': { heading: -20 } } });
  assert.ok(P.gestureProfile && P.keepsGesture && P.gestureAt === 0);
  setCal(w, 'play'); assert.ok(P.gestureProfile && !P.keepsGesture, 'fatta prima del cambio: non vale per la prossima partita');
  lobby.go('mode'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); w.advance(300); lobby.next(); w.advance(300);
  assert.equal(lobby.step, 'match'); assert.match($('lobby-match-note').textContent, /scambio di prova/);
  for (const peak of [500, 760]){
    const c0 = link.cmds.length;
    assert.equal(w.pressStart(), false); assert.ok(ui.trial.active); assert.deepEqual(link.cmds.slice(c0), ['cal', 'skip'], 'profilo da capo');
    playTrial(w, (id, n, want) => stroke({ dir: want, peak }));
    assert.deepEqual([P.profile.ref, P.madeBy], [peak, 'prova']); assert.notEqual(P.aimModel.center(1), 25, 'niente mira di chi c\'era prima');
    endMatch(w);
  }
  // A calibra e gioca con «Con i gesti», poi il cambio: lo stesso
  const v = await playWorld({ cal: 'gesti', mode: null }); v.link.cmd('confirm'); gestureDone(v);
  v.lobby.go('mode'); v.lobby.setMode('cpu'); v.lobby.go('controller'); v.lobby.go('connect'); v.advance(300); v.lobby.next(); v.advance(300);
  assert.equal(v.pressStart(), true, '«Con i gesti»: partita subito'); endMatch(v);
  setCal(v, 'play'); assert.equal(v.pressStart(), false); assert.ok(v.ui.trial.active);
  // telefono fermo alla calibrazione con i gesti quando l'opzione passa a «Giocando»: riceve subito il profilo semplice
  const u = await makeWorld({ controller: 'phone', cal: 'gesti' }); phoneLike(u.ui.phone, u.link); u.advance(500);
  assert.deepEqual(u.link.cmds, []); setCal(u, 'play'); u.advance(200);
  assert.deepEqual(u.link.cmds, ['skip']); assert.ok(u.ui.phone.ready && u.ui.phone.madeBy === 'auto');
});

test('revisione 4: con «Giocando» «Calibra con i gesti» vale per una partita sola; con «Nessuna» profilo da capo a ogni partita', async () => {
  const w = await playWorld(), { E, ui, lobby, link, P } = w;
  // l'addetto fa calibrare apposta con i gesti dal pannello del telefono
  P.recalibrate({ gestures: true }); w.advance(300); assert.ok(!P.ready && !P.autoSimple);
  gestureDone(w); assert.ok(P.keepsGesture && P.madeBy === 'gesti' && P.gestureAt === 0);
  let c0 = link.cmds.length;
  assert.equal(w.pressStart(), true, 'la partita che segue parte con il profilo dei gesti, senza scambi di prova'); assert.deepEqual(link.cmds.slice(c0), []);
  assert.equal(E.natpfMatchSeq, 1); assert.ok(!P.keepsGesture, 'vale per questa partita sola');
  endMatch(w);
  // il visitatore dopo: scambi di prova da capo
  c0 = link.cmds.length;
  assert.equal(w.pressStart(), false); assert.ok(ui.trial.active); assert.deepEqual(link.cmds.slice(c0), ['cal', 'skip']);
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: 450 })); assert.deepEqual([P.profile.ref, P.madeBy], [450, 'prova']);
  // «Calibra con i gesti» a partita in corso: vale per questa partita; la prossima rifà gli scambi di prova
  w.advance(600); assert.ok(ui.matchLive());
  P.recalibrate({ gestures: true }); w.advance(200); gestureDone(w);
  assert.ok(P.gestureProfile && P.gestureAt == null && !P.keepsGesture);
  endMatch(w); assert.equal(w.pressStart(), false); assert.ok(ui.trial.active);
  ui.backToMenu('match'); w.advance(200);
  // con i gesti e poi «Riscaldati prima»: il riscaldamento non reimpara (profilo dei gesti tenuto), la partita parte subito
  P.recalibrate({ gestures: true }); w.advance(200); gestureDone(w);
  lobby.warmupFirst(); w.advance(300); assert.ok(ui.training.active && !ui.training.learn); ui.training.skip(); w.advance(300);
  assert.equal(w.pressStart(), true); assert.equal(P.profile.ref, 580);

  // «Nessuna»
  const n = await playWorld({ cal: 'none' }), Pn = n.P;
  for (let k = 0; k < 2; k++){
    const c1 = n.link.cmds.length;
    assert.equal(n.pressStart(), true); assert.deepEqual(n.link.cmds.slice(c1), ['cal', 'skip'], 'profilo semplice da capo'); assert.ok(!n.ui.trial.active);
    Pn.typicalModel.learn?.(900, { power: .6 }); endMatch(n);
  }
  // … anche se il telefono era rimasto con un profilo dei gesti di un'altra opzione
  setCal(n, 'gesti'); Pn.recalibrate(); n.advance(200); gestureDone(n, Pn, n.link); assert.ok(Pn.keepsGesture); setCal(n, 'none');
  assert.ok(Pn.gestureProfile && !Pn.keepsGesture);
  const c2 = n.link.cmds.length; assert.equal(n.pressStart(), true); assert.deepEqual(n.link.cmds.slice(c2), ['cal', 'skip']); assert.ok(Pn.profile.simple);
  // calibrazione con i gesti fatta apposta prima della partita: vale per quella
  endMatch(n); Pn.recalibrate({ gestures: true }); n.advance(200); gestureDone(n, Pn, n.link);
  const c3 = n.link.cmds.length; assert.equal(n.pressStart(), true); assert.deepEqual(n.link.cmds.slice(c3), []); assert.equal(Pn.profile.ref, 580);
  endMatch(n); const c4 = n.link.cmds.length; assert.equal(n.pressStart(), true); assert.deepEqual(n.link.cmds.slice(c4), ['cal', 'skip']);
});

/* ---------- difetto 7 e coppia mista nello stesso schermo ---------- */
test('revisione 7: stesso schermo con un giocatore calibrato apposta con i gesti: conta come fatto, gli scambi di prova finiscono quando ha imparato l\'altro (non al tetto)', async () => {
  const w = await splitWorld({ start: false }), { E, ui, P1, P2, link } = w;
  P1.recalibrate({ gestures: true }); w.advance(100); gestureDone(w, P1, link);
  assert.ok(P1.keepsGesture && !P2.keepsGesture);
  ui.split.paint(); w.advance(3900);
  assert.ok(ui.trial.active && ui.trial.S.split, 'uno dei due senza gesti: gli scambi di prova si fanno');
  assert.ok(P1.trial.keep && !P2.trial.keep); assert.equal(ui.trial.counts('p1').forehand, TRIAL.perSide);
  const r = playTrial(w, (id, n, want) => stroke({ dir: want, peak: id === 'p2' ? 400 : 800 }), { phones: w.phones });
  assert.ok(r.seconds < 14.5, `finiti in ${r.seconds.toFixed(1)} s (prima 16,7: sempre al tetto di tempo)`);
  assert.equal(P2.profile.trialLevel, 'full'); assert.equal(P2.profile.ref, 400);
  assert.deepEqual([P1.profile.ref, P1.madeBy, P1.profile.trial], [580, 'gesti', undefined], 'chi ha calibrato con i gesti tiene il suo profilo');
  assert.ok(E.natpfMatchSeq === 1 && E.natpfSplit.active);
  // partita dopo (non la rivincita dai telefoni): tutti e due da capo
  for (let i = 0; i < 12 && E.phase !== 'MATCH_OVER'; i++) E._awardPoint('player', 'Nice Shot!');
  w.advance(300); ui.backToMenu('match'); w.advance(300);
  assert.ok(!P1.keepsGesture);
});

/* ---------- difetto 6: rete lenta, il telefono dice «calibrazione» per un attimo mentre riparte da capo ---------- */
// telefono che risponde a «skip» dopo lag ms (a «cal» diventa subito non pronto, come sul collegamento vero)
async function slowWorld(lag, { cal = 'play' } = {}){
  const w = await makeWorld({ controller: 'phone', cal }), { ui, link } = w, P = ui.phone;
  link.cmd('skip'); P._onCal({ kind: 'done', step: 'done', profile: { ...SIMPLE } }); P.markTutorialSeen('short'); w.advance(200);
  w.lobby.go('mode'); w.lobby.setMode('cpu'); w.lobby.go('controller'); w.lobby.go('connect'); w.advance(300); w.lobby.next(); w.advance(300);
  const pending = [];
  link.cmd = c => { link.cmds.push(c); if (c === 'cal'){ link.ready = false; link.L.phone = 'cal'; } if (c === 'skip') pending.push(performance.now() + lag); };
  // un passo del mondo con le risposte del telefono che arrivano in ritardo
  const step = (ms = 16) => { w.advance(ms); while (pending.length && pending[0] <= performance.now()){ pending.shift(); if (link.L.phone === 'cal'){ link.ready = true; link.L.phone = 'ready'; P._onCal({ kind: 'done', step: 'done', profile: { ...SIMPLE } }); } } };
  return { ...w, P, step };
}
test('revisione 6: con la rete lenta (risposta dopo 0,5 e 1,5 s) niente pausa «Telefono non pronto» all\'inizio degli scambi di prova; oltre 2,5 s la pausa c\'è, e in partita resta quella di sempre', async () => {
  for (const lag of [500, 1500]){
    const w = await slowWorld(lag), { E, ui, P } = w, t0 = performance.now(), holds = []; let first = null, paused = 0, seen = -1;
    assert.equal(w.pressStart(), false); assert.ok(ui.trial.active && !P.ready && P.resetting);
    while (ui.trial.active && performance.now() - t0 < 30000){
      w.step();
      if (E.natpfPaused) paused += 16;
      if (ui.phoneHold && !holds.includes(ui.phoneHold.why)) holds.push(ui.phoneHold.why);
      if (first == null && E.phase === 'RALLY') first = performance.now() - t0;
      const ball = P.trial?.ball ?? -1;
      if (hot(E) && seen !== ball){ seen = ball; P._onSwing(stroke({ dir: ballWant(E), peak: 640 })); }
    }
    assert.deepEqual(holds, [], `risposta dopo ${lag} ms: nessuna pausa`); assert.equal(paused, 0);
    assert.ok(first >= 1000 && first <= Math.max(1000, lag) + 100, `risposta dopo ${lag} ms: prima palla a ${Math.round(first)} ms (prima a 4300), non prima che il telefono sia pronto`);
    assert.equal(P.profile.trialLevel, 'full'); assert.ok(!P.resetting);
  }
  // telefono che non risponde più: dopo 2,5 s la pausa «non pronto» arriva, come sempre
  const d = await slowWorld(60000); d.pressStart();
  d.step(2300); assert.ok(!d.ui.phoneHold && d.P.resetting && d.E.phase !== 'RALLY', 'ancora in attesa, nessuna palla sprecata');
  d.step(900); assert.equal(d.ui.phoneHold?.why, 'non pronto'); assert.ok(!d.P.resetting);
  // in partita il telefono che torna a calibrare per conto suo («Ricalibra» sul telefono) ferma la partita dopo i soliti 300 ms
  const m = await playWorld(); m.pressStart(); playTrial(m); m.advance(500);
  assert.ok(m.ui.matchLive() && !m.ui.phoneHold);
  m.link.ready = false; m.link.L.phone = 'cal'; m.link.cmd = c => { m.link.cmds.push(c); };      // (non risponde a «skip»)
  m.advance(700); assert.equal(m.ui.phoneHold?.why, 'non pronto', 'la guardia in partita non è più debole');
  // «Nessuna»: lo stesso attimo all'inizio della partita, senza pausa
  const n = await slowWorld(600, { cal: 'none' }); assert.equal(n.pressStart(), true);
  let hold = false; for (let k = 0; k < 120; k++){ n.step(); hold ||= !!n.ui.phoneHold; }
  assert.ok(!hold && n.P.ready, '«Nessuna»: partita senza pausa');
});

/* ---------- modalità di base («Giocando»): percorsi che le altre prove fanno con «Con i gesti» ---------- */
test('di base · «Nuovo giocatore» durante gli scambi di prova e durante la partita sul profilo imparato: tutto da capo, poi di nuovo scambi di prova', async () => {
  const w = await playWorld(), { E, ui, lobby, link, P } = w;
  w.pressStart(); w.advance(2600); assert.ok(ui.trial.active && P.trialOn);
  P._onSwing(stroke({ dir: 1, peak: 900 }));
  // durante gli scambi di prova
  ui.newPlayer(); w.advance(300);
  assert.ok(!ui.trial.active && !P.trialOn && hidden('natpf-trial') && !document.body.classList.contains('natpf-trial-on'));
  assert.equal(E.natpfMatchSeq || 0, 0, 'nessuna partita'); assert.equal(P.learner.samples.length, 0); assert.ok(P.profile == null || P.profile.simple);
  assert.ok(!P.tutorialSeen && P.typicalModel.value == null);
  $('nick-cancel').click(); w.advance(300);
  assert.ok(ui.training.active && ui.training.tutorialOpen && !ui.training.cal, 'tutorial corto in campo, senza calibrazione con i gesti');
  w.key('Enter', 'Enter'); w.advance(600); link.L.phone = 'ready'; w.advance(300);
  assert.ok(lobby.visible && lobby.step === 'match' && P.ready);
  assert.equal(w.pressStart(), false); playTrial(w, (id, n, want) => stroke({ dir: want, peak: 500 }));
  assert.deepEqual([E.natpfMatchSeq, P.profile.ref, P.madeBy], [1, 500, 'prova']);
  // in partita, sul profilo imparato
  w.advance(800); assert.ok(ui.matchLive());
  ui.newPlayer(); w.advance(300);
  assert.ok(P.profile == null || P.profile.simple, 'niente del giocatore di prima'); assert.equal(P.madeBy === 'prova', false); assert.equal(P.aimModel.center(1), null);
  $('nick-cancel').click(); w.advance(300); w.key('Enter', 'Enter'); w.advance(600); link.L.phone = 'ready'; w.advance(300);
  assert.equal(w.pressStart(), false); assert.ok(ui.trial.active, 'scambi di prova per chi arriva');
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: 820 })); assert.deepEqual([E.natpfMatchSeq, P.profile.ref], [2, 820]);
});

// il telefono cade (collegamento perso) e torna: relink = stessa pagina, ancora pronto; reload = pagina ricaricata, da calibrare
const drop = (w, P = w.P, link = w.link) => { link.connected = false; link.ready = false; link.L = { state: 'waiting', phone: null }; P._changed?.(); };
const comeBack = (w, how, P = w.P, link = w.link) => {
  link.connected = true;
  if (how === 'relink'){ link.ready = true; link.L = { state: 'connected', phone: 'ready', joins: 2, relinked: true }; }
  else link.L = { state: 'connected', phone: 'cal', joins: 2 };
  P._sendGrip(); P._autoProfile(); P._changed?.();
};
test('di base · il telefono cade, si ricollega o spegne lo schermo durante gli scambi di prova: pausa, si riprende, si impara lo stesso; se non torna si esce dal menu', async () => {
  for (const how of ['relink', 'reload', 'schermo']){
    const w = await playWorld(), { E, ui, link, P } = w, t0 = performance.now(); let out = null, back = null, seen = -1, held = null, stance = 0;
    w.pressStart();
    while (ui.trial.active && performance.now() - t0 < 45000){
      w.advance(16); const t = performance.now() - t0;
      if (out == null && E.phase === 'RALLY' && P.trial?.ball === 2){ out = t; if (how === 'schermo') link.L.vis = false; else drop(w); }
      if (out != null && back == null && t - out > 2000){ back = t; if (how === 'schermo') link.L.vis = true; else comeBack(w, how); }
      if (ui.phoneHold) held = ui.phoneHold.why;
      if (ui.trial.active && E.phase === 'SERVE_STANCE') stance++;
      const ball = P.trial?.ball ?? -1;
      if (P.ready && link.L.vis !== false && hot(E) && seen !== ball){ seen = ball; P._onSwing(stroke({ dir: ballWant(E), peak: 600 })); }
    }
    const seconds = (performance.now() - t0)/1000;
    assert.equal(held, how === 'schermo' ? 'pagina nascosta' : 'scollegato', how); assert.equal(stance, 0, `${how}: nessun punto «rigiocato» negli scambi di prova`);
    assert.ok(!ui.trial.active && E.natpfMatchSeq === 1 && E.phase === 'SERVE_STANCE', `${how}: la partita parte`);
    assert.ok(seconds < 21, `${how}: ${seconds.toFixed(1)} s con 2 s di telefono fermo e il conto alla rovescia`);
    assert.ok(['full', 'ok'].includes(P.profile.trialLevel), `${how}: livello ${P.profile.trialLevel}`); assert.ok(P.ready && !ui.phoneHold);
  }
  // non torna: la partita resta ferma con il riquadro; dal menu si chiude tutto
  const w = await playWorld(), { E, ui, P } = w; w.pressStart();
  for (let k = 0; k < 400 && !(E.phase === 'RALLY' && P.trial?.ball === 2); k++) w.advance(16);
  drop(w); w.advance(6000);
  assert.ok(ui.trial.active && E.natpfPaused && ui.phoneHold?.why === 'scollegato', 'fermi ad aspettare il telefono');
  ui.backToMenu(); w.advance(300);
  assert.ok(!ui.trial.active && ui.lobby.visible && !E.natpfPaused && (E.natpfMatchSeq || 0) === 0);
});

test('di base · in partita sul profilo imparato: caduta e ricollegamento, schermo spento → pausa, punto rigiocato, profilo e verso restano; pagina ricaricata → profilo semplice e si gioca', async () => {
  const w = await playWorld(), { E, ui, link, P } = w;
  w.pressStart(); playTrial(w, (id, n, want) => stroke({ dir: -want, peak: 700 }));           // telefono al contrario: verso girato
  assert.deepEqual([P.profile.ref, P.learner.sign, P.madeBy], [700, -1, 'prova']);
  for (const how of ['relink', 'schermo']){
    w.advance(600); E.phase = 'RALLY'; const c0 = link.cmds.length;
    if (how === 'schermo') link.L.vis = false; else drop(w);
    w.advance(900); assert.equal(ui.phoneHold?.why, how === 'schermo' ? 'pagina nascosta' : 'scollegato'); assert.ok(E.natpfPaused);
    if (how === 'schermo') link.L.vis = true; else comeBack(w, 'relink');
    w.advance(4500);
    assert.ok(!ui.phoneHold && !E.natpfPaused, `${how}: si riprende`); assert.equal(E.phase, 'SERVE_STANCE', `${how}: punto rigiocato`);
    assert.deepEqual([P.profile.ref, P.learner.sign, P.madeBy, E.natpfMatchSeq], [700, -1, 'prova', 1], `${how}: profilo imparato e verso restano`);
    assert.deepEqual(link.cmds.slice(c0), [], `${how}: nessuna ricalibrazione`);
  }
  // pagina del telefono ricaricata a metà partita: torna da calibrare, riceve il profilo semplice e si gioca (il gioco
  // reimpara dai colpi veri; il verso lo corregge il voto del telefono). Niente gesti, niente blocco
  w.advance(600); E.phase = 'RALLY'; drop(w); w.advance(900); comeBack(w, 'reload'); w.advance(4500);
  assert.ok(P.ready && P.profile.simple && P.madeBy === 'auto' && !ui.phoneHold && !E.natpfPaused); assert.equal(E.natpfMatchSeq, 1);
  // la partita dopo rifà gli scambi di prova
  for (let i = 0; i < 12 && E.phase !== 'MATCH_OVER'; i++) E._awardPoint('player', 'Nice Shot!');
  w.advance(300); ui.backToMenu('match'); w.advance(300);
  assert.equal(w.pressStart(), false); assert.ok(ui.trial.active);
});

test('di base · chiosco: stand fermo durante gli scambi di prova → menu, telefono dimenticato, niente partita; il visitatore dopo riparte da capo', async () => {
  const w = await playWorld(), { E, ui, lobby, P } = w;
  ui.kiosk.close(); ui.remote?.close?.({ toStaff: false });
  ui.kiosk.enabled = true; ui.kiosk.limit = 30;
  w.pressStart(); w.advance(2600); assert.ok(ui.trial.active);
  P._onSwing(stroke({ dir: 1, peak: 900 }));
  ui.kiosk.last = performance.now() - 61000; ui.kiosk.check(); w.advance(300);
  assert.ok(!ui.trial.active && !P.trialOn && lobby.visible && lobby.step === 'menu', 'tornati al menu');
  assert.equal(E.natpfMatchSeq || 0, 0); assert.ok(hidden('natpf-trial') && !E.natpfPaused);
  assert.ok(!P.connected, 'telefono scollegato: il prossimo visitatore inquadra il QR');
});

test('di base · stesso schermo: «Ricalibra» a partita in corso rifà gli scambi di prova per tutti e due e si rigioca il punto con il punteggio com\'era', async () => {
  const w = await splitWorld(), { E, ui, P1, P2, l2 } = w;
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: id === 'p2' ? 400 : 800 }), { phones: w.phones });
  assert.ok(E.natpfSplit.active && E.natpfMatchSeq === 1);
  E._awardPoint('player', 'Nice Shot!'); w.advance(2500);
  const score = JSON.stringify(E.score), c1 = w.link.cmds.length, c2 = l2.cmds.length;
  assert.ok(ui.recalTrialDue(), 'in partita «Ricalibra» farebbe gli scambi di prova');
  assert.equal(ui.recalibrate(), true); assert.ok(ui.trial.active && ui.trial.S.split && ui.trial.S.resume);
  assert.deepEqual([w.link.cmds.slice(c1), l2.cmds.slice(c2)], [['cal', 'skip'], ['cal', 'skip']], 'tutti e due da capo');
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: 500 }), { phones: w.phones }); w.advance(300);
  assert.equal(JSON.stringify(E.score), score, 'punteggio com\'era'); assert.equal(E.natpfMatchSeq, 1, 'la stessa partita'); assert.equal(E.phase, 'SERVE_STANCE');
  assert.deepEqual([P1.profile.ref, P2.profile.ref], [500, 500]); assert.ok(E.natpfSplit.active);
});

test('di base · sfida tra due computer (chi invita): gli scambi di prova dopo «Collega», il Player 2 che entra intanto non li disturba; «Gioca» e la rivincita partono senza rifarli', async () => {
  const w = await playWorld({ mode: null }), { E, ui, lobby, hud, link, P } = w;
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('controller'); lobby.go('connect'); w.advance(300);
  assert.ok(ui.versus.hostActive && E.isMultiplayer);
  lobby.next(); w.advance(300);
  assert.ok(ui.trial.active && !lobby.visible && lobby.trialPlayed, 'scambi di prova in campo, prima della pagina «Partita»'); assert.ok(!E._versusInMatch());
  // il Player 2 entra ed è pronto durante gli scambi di prova; un suo colpo arriva: niente
  w.advance(1500); E.roomStatus = { ...E.roomStatus, p2Online: true, p2Ready: true, guestName: 'Bea' };
  const phase = E.phase; E._handleP2SwingInput({ role: 'p2', shotType: 'topspin', speed: 1, natpf: {} });
  assert.equal(E.phase, phase); assert.ok(ui.trial.active && !E._versusInMatch());
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: 640 })); w.advance(400);
  assert.ok(!ui.trial.active && lobby.visible && lobby.step === 'match' && E.isMultiplayer && E.autoPlayMode, 'pagina «Partita», stanza ancora aperta');
  assert.deepEqual([P.profile.ref, E.natpfMatchSeq || 0], [640, 0]);
  const c0 = link.cmds.length;
  assert.equal(w.pressStart(), true, '«Gioca»: la sfida parte subito'); w.advance(500);
  assert.ok(!ui.trial.active && E.natpfMatchSeq === 1 && E._versusInMatch()); assert.deepEqual(link.cmds.slice(c0), [], 'il profilo imparato resta');
  // rivincita (le stesse due persone): niente scambi di prova, niente profilo da capo
  for (let i = 0; i < 12 && E.phase !== 'MATCH_OVER'; i++) E._awardPoint('player', 'Nice Shot!');
  w.advance(300);
  const ev = $('btn-play-again').click();
  assert.ok(!ev._stopImm, 'rivincita immediata (il motore la fa partire)'); assert.ok(!ui.trial.active); assert.deepEqual(link.cmds.slice(c0), []); assert.equal(P.profile.ref, 640);
});

test('di base · minigioco: scambi di prova prima; chiusi dal menu non parte niente; «Gioca ancora» senza rifarli e con il profilo imparato', async () => {
  const w = await playWorld({ mode: null }), { E, ui, lobby, link, P } = w;
  const toChallenge = () => { ui.events.nickname = 'Marta'; lobby.challenge = 'rush'; lobby.setMode('challenge'); lobby.go('connect'); w.advance(300); lobby.next(); w.advance(300); };
  toChallenge();
  assert.ok(ui.trial.active && !ui.events.active, 'prima gli scambi di prova');
  ui.backToMenu(); w.advance(300);
  assert.ok(!ui.trial.active && !ui.events.active && lobby.visible, 'chiusi dal menu: nessun minigioco'); assert.ok(!P.trialOn);
  toChallenge(); assert.ok(ui.trial.active);
  playTrial(w, (id, n, want) => stroke({ dir: want, peak: 560 })); w.advance(300);
  assert.ok(!ui.trial.active && ui.events.active, 'poi il minigioco'); assert.equal(P.profile.ref, 560);
  const c0 = link.cmds.length;
  ui.events.abort?.(); lobby._resultAction('again'); w.advance(300);
  assert.ok(!ui.trial.active && ui.events.active, '«Gioca ancora»: subito'); assert.deepEqual(link.cmds.slice(c0), []); assert.equal(P.profile.ref, 560);
  // dal menu un altro minigioco (un'altra persona, per quel che ne sa il gioco): scambi di prova da capo
  ui.backToMenu(); w.advance(300); toChallenge();
  assert.ok(ui.trial.active); assert.deepEqual(link.cmds.slice(c0), ['cal', 'skip']);
});

test('di base · telecomando dello staff negli scambi di prova: pagina «Scambi di prova», frecce spente, Indietro = pausa, «Salta» fa partire la partita, «Ricalibra il telefono» in partita li rifà', async () => {
  const w = await playWorld(), { E, ui } = w;
  ui.kiosk.close(); ui.remote.close({ toStaff: false }); $('natpf-phone-hold').classList.add('hidden');     // (nel mondo di prova i riquadri nascono in vista)
  const cmd = async c => { let out; await ui.remote._onCmd({ c, y: 1, reply: r => { out = r; } }); return out; };
  const now = () => { const s = ui.remote.snapshot(); return { s, screen: remoteScreen(s), ...remoteCommands(s) }; };
  w.pressStart(); w.advance(1500);
  let n = now();
  assert.deepEqual([n.screen.id, n.screen.label, n.screen.nav], ['trial', 'Scambi di prova', 'field']);
  assert.deepEqual([n.cmds.skip, n.labels.skip], [1, 'Salta gli scambi di prova']); assert.match(n.cmds.recal, /già calibrando/); assert.match(n.cmds.up, /Scambi di prova/);
  assert.equal((await cmd('up')).ok, false); assert.equal((await cmd('ok')).ok, false); assert.ok(ui.trial.active);
  assert.deepEqual(await cmd('back'), { ok: true, msg: 'Pausa' }); assert.ok(ui.pause.isOpen && ui.trial.active);
  n = now(); assert.deepEqual([n.screen.id, n.screen.under], ['pause', 'trial']); assert.match(n.cmds.skip, /niente da saltare/);
  assert.equal((await cmd('pause')).ok, true); assert.ok(!ui.pause.isOpen);
  assert.deepEqual(await cmd('skip'), { ok: true, msg: 'Scambi di prova saltati: si gioca' }); w.advance(800);
  assert.ok(!ui.trial.active && E.natpfMatchSeq === 1 && E.phase === 'SERVE_STANCE', 'partita partita');
  // in partita: «Ricalibra il telefono» rifà gli scambi di prova e poi si rigioca il punto
  n = now(); assert.equal(n.screen.id, 'match'); assert.deepEqual([n.cmds.recal, n.hints.recal], [1, 'scambi di prova, poi si rigioca il punto']);
  assert.deepEqual(await cmd('recal'), { ok: true, msg: 'Scambi di prova: poi si rigioca il punto' }); assert.ok(ui.trial.active && ui.trial.S.resume);
  playTrial(w, (id, k, want) => stroke({ dir: want, peak: 610 })); w.advance(300);
  assert.equal(E.natpfMatchSeq, 1); assert.equal(ui.phone.profile.ref, 610);
  // al menu: «Ricalibra il telefono» fa ripartire il profilo, senza gesti
  ui.backToMenu('match'); w.advance(300); const c0 = w.link.cmds.length;
  n = now(); assert.match(n.hints.recal, /impara dai prossimi scambi/);
  assert.equal((await cmd('recal')).ok, true); w.advance(300);
  assert.deepEqual(w.link.cmds.slice(c0), ['cal', 'skip']); assert.ok(ui.phone.ready && ui.phone.profile.simple);
});
