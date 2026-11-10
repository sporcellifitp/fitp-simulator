// «Nuovo giocatore» (B18, difetto 5 del B16): a fine partita, nel risultato dei minigiochi e nel pannello dello stand.
// Prima il visitatore dopo ereditava nome, record, mano, calibrazione, colpo tipico e tutorial già visto, e l'unico modo di
// azzerarli (chiosco) scollegava anche il telefono. Interfaccia vera sul motore senza disegno (test/ui-world.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, visible, mkEvent } from './ui-world.mjs';
import { QUICK_PLAN } from '@natpf/tennis/calibration.js';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { newPlayerRoute, asksName, gatesTutorial } from '../src/natpf/natpf_new_player.js';
import { migrateRecords, recordsFor, putRecords, dropRecords, nickKey, dayKey } from '../src/natpf/natpf_events.js';
import { RECORDS_KEY, recordGame } from '../src/natpf/natpf_arcade.js';

const calibrate = w => {
  w.cal({ kind: 'step', step: 'still' });
  QUICK_PLAN.forEach((want, idx) => { w.cal({ kind: idx ? 'next' : 'step', step: 'swings', want, idx, total: QUICK_PLAN.length }); w.cal({ kind: 'ready', want }); w.cal({ kind: 'attempt', ok: true, idx, want }); w.advance(700); });
  w.cal({ kind: 'review', pass: true });
  w.cal({ kind: 'done', profile: { ref: 600, refs: { 1: 640, '-1': 560 }, hand: 'right' } });
};
const submitName = name => { $('nick-input').value = name; for (const l of $('nick-form').ls.submit) l.fn(mkEvent('submit', $('nick-form'))); };

test('dove porta «Nuovo giocatore»: partita, minigioco, stesso schermo, due computer, menu', () => {
  assert.equal(newPlayerRoute({ mode: 'cpu' }), 'match');
  assert.equal(newPlayerRoute({ mode: 'challenge' }), 'challenge');
  assert.equal(newPlayerRoute({ mode: 'split' }), 'split');
  assert.equal(newPlayerRoute({ mode: 'friend' }), 'versus');
  assert.equal(newPlayerRoute({ mode: 'cpu', versus: true }), 'versus');
  assert.equal(newPlayerRoute({ mode: 'cpu', atMenu: true }), 'menu');
  assert.equal(newPlayerRoute({ mode: 'training' }), 'menu');
  assert.deepEqual(['match', 'challenge', 'split', 'versus', 'menu'].map(asksName), [true, true, false, false, false]);
  assert.equal(gatesTutorial('match', 'phone'), true);
  assert.equal(gatesTutorial('match', 'webcam'), false);
  assert.equal(gatesTutorial('menu', 'phone'), false);
});

test('record, medaglie ed esperienza per nickname e per giorno; i dati di prima restano salvati a parte e non si mostrano', () => {
  const old = { rush: { best: 900, medal: 'silver', plays: 4 }, xp: 1200 };
  const s0 = migrateRecords(old);
  assert.deepEqual(s0.legacy, old, 'niente si perde');
  assert.deepEqual(recordsFor(s0, 'Marco'), {}, 'il record di prima (di chi?) non lo vede nessuno');
  assert.equal(migrateRecords(null).days && Object.keys(migrateRecords(null).days).length, 0);
  assert.equal(migrateRecords(s0), s0, 'archivio già nuovo: com’è');
  let s = putRecords(s0, 'Marco', recordGame({}, 'rush', 1200).records, '2026-11-10');
  assert.equal(recordsFor(s, ' marco ', '2026-11-10').rush.best, 1200, 'stesso nickname, maiuscole e spazi a parte');
  assert.deepEqual(recordsFor(s, 'Luca', '2026-11-10'), {});
  assert.deepEqual(recordsFor(s, 'Marco', '2026-11-11'), {}, 'il giorno dopo si riparte');
  assert.equal(nickKey(''), 'ospite');
  // si tengono gli ultimi 7 giorni
  for (let d = 1; d <= 9; d++) s = putRecords(s, 'Ada', { xp: d }, `2026-12-0${d}`);
  assert.equal(Object.keys(s.days).length, 7); assert.ok(!s.days['2026-11-10'] && !!s.days['2026-12-09']);
  assert.deepEqual(s.legacy, old);
});

test('resetPlayer: tutorial, calibrazione e colpi imparati da capo, il telefono resta collegato e aspetta il tutorial', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const P = w.E.natpfPhone, link = w.link;
  calibrate(w); link.cmd('confirm'); assert.ok(P.ready);
  P.markTutorialSeen('short'); P.typicalModel.learn(700, null); P.typicalModel.learn(720, null); P.typicalModel.learn(710, null); P.typicalModel.learn(705, null);
  P.specialSamples = { lob: [.4, .5] }; P.personal = { lob: .45 };
  assert.ok(P.profile && P.tutorialSeen);
  const sent = link.sent.length;
  P.resetPlayer();
  assert.equal(P.tutorialSeen, false); assert.equal(P.tutorialSeenFor('short'), false);
  assert.equal(P.profile, null); assert.equal(P.typicalModel.value, null); assert.deepEqual(P.personal, {}); assert.deepEqual(P.specialSamples, {});
  assert.equal(link.connected, true, 'niente link.forget: niente QR da rifare');
  assert.equal(link.cmds.at(-1), 'cal'); assert.equal(P.ready, false);
  // il telefono aspetta il tutorial prima di calibrare (cfg con tut, mandato prima di «cal»)
  assert.ok(link.sent.slice(sent).some(m => m.t === 'cfg' && m.tut === 1));
  // telefono non collegato in quel momento: la calibrazione si chiede quando torna
  link.connected = false; link.cmds.length = 0;
  P.resetPlayer();
  link.connected = true; link.L.joins = 7; P._sendGrip();
  assert.equal(link.cmds.filter(c => c === 'cal').length, 2, 'al ricollegamento di nuovo «cal»');
  assert.equal(P.recalPending, false);
});

test('fine partita contro la CPU → «Nuovo giocatore»: nome e mano, poi in campo il tutorial corto e la calibrazione, telefono sempre collegato', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, ui, lobby, link } = w, P = E.natpfPhone;
  ui.hand.set('left'); ui.events.nickname = 'Marco';
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next();
  assert.ok(ui.training.active && ui.training.tutorialOpen, 'il primo visitatore: tutorial in campo');
  ui.training._tutorialDone('phone'); calibrate(w); w.advance(1500);
  assert.ok(P.ready && P.tutorialSeen, 'calibrato e tutorial visto');
  assert.equal(lobby.step, 'match');
  w.pressStart(); E.matchConfig.gamesToWin = 1;
  for (let i = 0; i < 4; i++) E._awardPoint('player', 'Out');
  w.advance(2500);
  assert.ok(visible('victory-modal'));
  ui._paintVictory(); assert.ok(visible('btn-new-player'), 'contro la CPU il pulsante c’è');
  const pairsBefore = link.L.pairs, cmds = link.cmds.length;
  $('btn-new-player').click();
  // azzerato tutto, telefono collegato
  assert.ok(!visible('victory-modal'));
  assert.equal(ui.events.nickname, '');
  assert.equal(ui.hand.hand, 'right', 'la mano torna «Destra» e si sceglie nel passo del nome');
  assert.equal(P.tutorialSeen, false); assert.equal(P.ready, false); assert.equal(P.profile, null);
  assert.ok(link.cmds.slice(cmds).includes('cal')); assert.ok(!link.cmds.slice(cmds).includes('forget'));
  assert.equal(link.connected, true); assert.equal(link.L.pairs, pairsBefore);
  // il passo del nome, con la mano
  assert.ok(visible('natpf-nick') && visible('nick-hand'));
  assert.equal($('nick-title').textContent, 'Come ti chiami?'); assert.equal($('nick-cancel').textContent, 'Salta');
  submitName('Bea');
  assert.equal(ui.events.nickname, 'Bea');
  // in campo: tutorial corto, poi la calibrazione
  assert.ok(ui.training.active && ui.training.calOnly && ui.training.tutorialOpen, 'tutorial in campo');
  assert.equal(ui.training.tutSet, 'short');
  assert.ok(P.tutWait, 'il telefono aspetta il tutorial');
  ui.training._tutorialDone('phone');
  assert.ok(ui.training.cal, 'dopo il tutorial la calibrazione');
  calibrate(w); w.advance(1500);
  assert.equal(lobby.step, 'match', 'poi la pagina «Partita»');
  assert.ok(P.ready && P.tutorialSeen);
});

test('«Salta» nel passo del nome: si va avanti lo stesso, senza nome', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby } = w;
  ui.events.nickname = 'Marco';
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next();
  w.pressStart(); w.advance(300);
  assert.equal(ui.newPlayer(), 'match');
  assert.ok(visible('natpf-nick'));
  $('nick-cancel').click();
  assert.ok(!visible('natpf-nick'));
  assert.equal(ui.events.nickname, '');
  assert.ok(lobby.visible && lobby.step === 'match', 'mouse e tastiera: subito la pagina «Partita»');
  // il passo del nome delle sfide resta com'era (senza mano, «Indietro» non va avanti)
  lobby.go('menu'); lobby.menu('challenges'); lobby.pickChallenge('rush');
  assert.ok(visible('natpf-nick') && !visible('nick-hand'));
  assert.equal($('nick-cancel').textContent, 'Indietro');
  $('nick-cancel').click();
  assert.equal(lobby.step, 'challenges');
});

test('risultato del minigioco → «Nuovo giocatore»: lo stesso minigioco, record del nuovo nome (non quelli di prima)', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby } = w;
  lobby.menu('challenges'); ui.events.nickname = 'Mario'; lobby.pickChallenge('rush'); lobby.go('connect'); lobby.next(); w.advance(1000);
  assert.equal(ui.events.active?.id, 'rush');
  ui.events.active.score = 400; ui.events.finish();
  assert.equal(lobby.step, 'result');
  assert.equal(ui.events.record('rush').best, 400);
  lobby._resultAction('new');
  assert.equal(ui.events.nickname, '');
  assert.equal(ui.events.record('rush'), null, 'il visitatore nuovo non vede il record di Mario');
  assert.ok(visible('natpf-nick'));
  submitName('Bea'); w.advance(1000);
  assert.equal(ui.events.active?.id, 'rush', 'si gioca lo stesso minigioco');
  assert.equal(ui.events.record('rush'), null);
  ui.events.active.score = 100; ui.events.finish();
  assert.equal(ui.events.record('rush').best, 100, 'il record è di Bea');
  // la classifica del giorno ha tutti e due
  assert.deepEqual(ui.events.top('rush').map(e => e.nick), ['Mario', 'Bea']);
  // i record sono salvati per nome e per giorno
  const store = JSON.parse(localStorage.getItem(RECORDS_KEY));
  assert.deepEqual(Object.keys(store.days[dayKey()]).sort(), ['bea', 'mario']);
});

function fakeLink(){
  return { connected: true, ready: true, L: { state: 'connected', phone: 'ready' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } }, forget(){ this.cmds.push('forget'); }, motion(){ return null; }, face(){ return null; }, on(){} };
}

test('stesso schermo → «Nuovo giocatore»: nomi, mani, tutorial e calibrazioni dei due da capo, si torna alla pagina dei due telefoni', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, ui, lobby, link } = w;
  link.cmd('skip');
  const P2 = new NatpfPhoneRacket(E, { role: 'p2' }); P2.link = fakeLink(); E.natpfPhone2 = P2;
  lobby.menu('play'); lobby.setMode('split'); lobby.go('connect');
  for (const P of [E.natpfPhone, P2]) P.markTutorialSeen('short');
  E.natpfSplitNames = { p1: 'Marco', p2: 'Luca' };
  const tag = id => $('natpf-split-hud').querySelector(`[data-split-tag="${id}"] b`);
  ui.split._paintNames();
  assert.deepEqual([tag('p1').textContent, tag('p2').textContent], ['Marco', 'Luca']);
  ui.split.setHand('p2', 'left');
  assert.equal(ui.newPlayer(), 'split');
  assert.deepEqual(E.natpfSplitNames, { p1: 'Player 1', p2: 'Player 2' });
  // revisione B18: anche le targhette sotto le due metà del campo (prima restavano «Marco» e «Luca»)
  assert.deepEqual([tag('p1').textContent, tag('p2').textContent], ['Player 1', 'Player 2']);
  assert.equal(P2.hand, 'right'); assert.equal(ui.hand.hand, 'right');
  for (const P of [E.natpfPhone, P2]){ assert.equal(P.tutorialSeen, false); assert.equal(P.ready, false); assert.equal(P.link.connected, true); }
  assert.ok(P2.link.cmds.includes('cal') && !P2.link.cmds.includes('forget'));
  assert.ok(lobby.visible && lobby.mode === 'split' && lobby.step === 'connect');
  assert.ok(!visible('natpf-nick'), 'i nomi si scrivono nella pagina dei due telefoni');
  // la pagina apre il tutorial nelle due metà
  lobby.paint();
  assert.ok(ui.split.tutOpen.p1 && ui.split.tutOpen.p2);
});

test('pannello dello stand: «Nuovo giocatore» con il menu in vista azzera e resta al menu; nella sfida tra due computer il pulsante finale non c’è', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { ui, lobby, link } = w;
  ui.events.nickname = 'Marco';
  ui.kiosk.open(); ui.kiosk.run('newplayer');
  assert.ok(!visible('natpf-staff'));
  assert.equal(ui.events.nickname, '');
  assert.ok(lobby.visible && lobby.step === 'menu');
  assert.ok(!visible('natpf-nick'), 'al menu sceglie il visitatore');
  assert.ok(link.cmds.includes('cal') && link.connected);
  const p2 = await makeWorld({ controller: 'mouse', role: 'p2' });
  p2.ui._paintVictory();
  assert.ok(!visible('btn-new-player'));
});

test('stesso schermo: le targhette in campo seguono i nomi anche se cambiano senza l’evento «input» (tick)', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, ui } = w;
  const tag = id => $('natpf-split-hud').querySelector(`[data-split-tag="${id}"] b`);
  tag('p1').textContent = 'Giulia'; tag('p2').textContent = 'Marco';   // targhette rimaste dalla partita di prima
  E.natpfSplitNames = { p1: 'Player 1', p2: 'Bea' };
  // in campo nello stesso schermo (splitVisible): la targhetta si riscrive dal nome corrente
  E.natpfSplit.active = true; E.phase = 'SERVE_STANCE'; E.autoPlayMode = false; E.cameraMode = 'PLAY'; E.manualCameraOverride = false;
  ui.split.tick();
  assert.ok(visible('natpf-split-hud'));
  assert.deepEqual([tag('p1').textContent, tag('p2').textContent], ['Player 1', 'Bea']);
  E.natpfSplit.active = false;
});

test('«Ospite»: chi non scrive il nome dopo «Nuovo giocatore» non eredita i record degli ospiti di prima (revisione B18)', async () => {
  // puro: si toglie solo il nickname chiesto, solo nel giorno chiesto
  let st = putRecords(putRecords(null, '', { rush: { best: 300 } }), 'Mario', { rush: { best: 200 } });
  st = putRecords(st, '', { rush: { best: 50 } }, '2026-11-09');
  const d = dropRecords(st, '');
  assert.deepEqual(recordsFor(d, ''), {}); assert.equal(recordsFor(d, 'Mario').rush.best, 200);
  assert.equal(recordsFor(d, '', '2026-11-09').rush.best, 50);
  assert.equal(dropRecords(st, 'nessuno'), st);
  // nel gioco: un ospite fa un record, «Nuovo giocatore», «Salta» → il record di prima non c'è
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby } = w;
  // (con il nome già dato il passo del nome si salta; poi si gioca senza nome, cioè come «Ospite»)
  lobby.menu('challenges'); ui.events.nickname = 'x'; lobby.pickChallenge('rush'); ui.events.nickname = ''; lobby.go('connect'); lobby.next(); w.advance(1000);
  assert.equal(ui.events.active?.id, 'rush');
  ui.events.active.score = 300; ui.events.finish();
  assert.equal(ui.events.record('rush').best, 300, 'record dell’ospite');
  lobby._resultAction('new');
  $('nick-cancel').click(); w.advance(1000);
  assert.equal(ui.events.nickname, '');
  assert.equal(ui.events.record('rush'), null, 'l’ospite dopo parte da zero');
  assert.equal(ui.events.top('rush').length, 1, 'la classifica del giorno resta');
});
