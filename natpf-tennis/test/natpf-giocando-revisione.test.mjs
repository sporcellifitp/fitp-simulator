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
