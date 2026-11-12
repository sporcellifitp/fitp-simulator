// B28 (12/11/2026) · Niente più blocchi nelle schermate guidate. Richiesta dell'utente allo stand: «togli il check che uno
// deve aver fatto quel gesto per ogni schermata. Oggi se arrivo all'ultima schermata e non ho fatto il servizio non posso
// andare avanti o chiudere quella modale, è molto fastidioso». Oltre al tutorial (natpf-tutorial.test.mjs): gli esercizi
// dell'Allenamento e del riscaldamento, la calibrazione con i gesti in campo e nel pannello del telefono, gli scambi di
// prova. In ognuno «Avanti ›» o «Salta» sul computer e, dove il telefono è su «Pronto», anche dal telefono (messaggio nx).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { phoneLike } from './trial-world.mjs';
import { DRILLS, drillsFor, warmupDrills } from '../src/natpf/natpf_training.js';

const nxOf = link => link.sent.filter(m => m.t === 'nx').at(-1);
// «Avanti ›» toccato sul telefono (link.js: messaggio nx con y 1 → evento «next»)
const phoneNext = P => { if (P.nextOffer) for (const fn of P.nextListeners) fn(P); };

test('esercizi senza limite di tentativi: prima chi non riusciva restava lì; ora «Avanti ›» passa oltre, dal computer e dal telefono', async () => {
  // dritto, rovescio, servizio, incrociato e lungolinea non hanno maxTries: senza «Avanti ›» non si andava avanti
  assert.deepEqual(DRILLS.filter(d => !d.maxTries).map(d => d.id), ['forehand', 'backhand', 'serve', 'cross', 'line']);
  const w = await makeWorld({ controller: 'phone' }), { ui, link } = w, T = ui.training, P = ui.phone;
  link.ready = true; link.L.phone = 'ready'; P.markTutorialSeen('full');
  T.start({ drills: drillsFor('phone') }); w.advance(300);
  assert.equal(T.drill.id, 'forehand'); assert.equal(T.nextLabel, 'Avanti ›');
  const nb = T.coach.querySelector('#coach-next');
  assert.ok(!nb.classList.contains('hidden') && nb.textContent === 'Avanti ›', '«Avanti ›» in vista sul computer');
  assert.deepEqual(nxOf(link), { t: 'nx', on: 1, lb: 'Avanti ›' }, 'offerto al telefono');
  // nessun colpo: le palle passano, l'esercizio resta (com'era)
  w.advance(9000); assert.equal(T.drill.id, 'forehand'); assert.equal(T.progress.done, 0);
  // «Avanti ›» sul computer
  $('coach-next').click(); assert.equal(T.drill.id, 'backhand'); assert.deepEqual(T.progress, { done: 0, tries: 0 });
  w.advance(1500); assert.equal(w.E.phase, 'RALLY', 'la palla dell\'esercizio dopo arriva subito');
  // «Avanti ›» dal telefono, fino in fondo: l'allenamento finisce come completato, mai bloccati
  const ids = [];
  for (let i = 0; i < 20 && T.active; i++){ ids.push(T.drill?.id); phoneNext(P); w.advance(800); }
  assert.deepEqual(ids, drillsFor('phone').slice(1).map(d => d.id), 'un esercizio per tocco');
  assert.ok(!T.active, 'dopo l\'ultimo esercizio l\'allenamento è finito'); assert.deepEqual(nxOf(link), { t: 'nx', on: 0 }, 'il telefono toglie il pulsante');
  phoneNext(P); assert.ok(!T.active, 'un tocco in ritardo non fa niente');
});

test('riscaldamento («Riscaldati prima»): anche il servizio si può saltare; finito, si va alla partita', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, lobby, link } = w, T = ui.training, P = ui.phone;
  link.ready = true; link.L.phone = 'ready'; P.markTutorialSeen('short');
  lobby.go('mode'); lobby.setMode('cpu'); lobby.go('match'); lobby.warmupFirst(); w.advance(300);
  assert.ok(T.active && T.drills.length === warmupDrills('phone').length);
  T.nextDrill(); T.nextDrill(); assert.equal(T.drill.id, 'serve', 'all\'ultimo esercizio, il servizio');
  w.advance(1200); assert.equal(T.nextLabel, 'Avanti ›');
  T.nextDrill(); w.advance(1200);
  assert.ok(!T.active && lobby.visible && lobby.step === 'match', 'saltato il servizio: riscaldamento finito, pagina «Partita»');
});

test('calibrazione con i gesti in campo: «Salta la calibrazione ›» (computer e telefono) dà il profilo semplice e si passa agli esercizi', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'gesti' }), { ui, link } = w, T = ui.training, P = ui.phone;
  phoneLike(P, link); P.markTutorialSeen('full');
  T.start({ drills: drillsFor('phone') }); w.advance(300);
  assert.ok(T.cal, 'calibrazione con i gesti in campo'); assert.equal(T.nextLabel, 'Salta la calibrazione ›');
  assert.equal(T.coach.querySelector('#coach-next').textContent, 'Salta la calibrazione ›');
  // fermi: non succede niente (il telefono aspetta i gesti)
  w.advance(5000); assert.ok(T.cal && !P.ready);
  T.nextDrill(); w.advance(1800);
  assert.ok(link.cmds.includes('skip') && P.ready && P.profile.simple, 'profilo semplice'); assert.ok(!T.cal && T.active && T.drill.id === 'forehand', 'agli esercizi');
  T.stop({ completed: false, silent: true });
  // pannello del telefono (partita con «Con i gesti»): «Salta la calibrazione» mentre la si fa, «Calibra con i gesti» da pronto
  const v = await makeWorld({ controller: 'phone', cal: 'gesti' }); phoneLike(v.ui.phone, v.link);
  v.ui.openPhone(); v.ui.paintPhone();
  assert.ok(!$('natpf-phone-skip').classList.contains('hidden'), '«Salta la calibrazione» nel pannello'); assert.ok($('natpf-phone-gesti').classList.contains('hidden'));
  $('natpf-phone-skip').click(); v.ui.paintPhone();
  assert.ok(v.ui.phone.ready && v.ui.phone.profile.simple); assert.ok($('natpf-phone-skip').classList.contains('hidden') && !$('natpf-phone-gesti').classList.contains('hidden'));
});

test('lezione con la webcam e tutorial: «Avanti ›» non serve (si chiudono da soli con i loro pulsanti), nextDrill li chiude comunque', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'gesti' }), T = w.ui.training;
  T.start({ intro: true }); assert.ok(T.tutorialOpen); assert.equal(T.nextLabel, null, 'a tutorial aperto niente «Avanti ›» (c\'è la X)');
  assert.equal(T.nextDrill(), true); assert.ok(!T.tutorialOpen && T.active, 'nextDrill chiude il tutorial');
  T.stop({ completed: false, silent: true });
  assert.equal(T.nextDrill(), false, 'allenamento chiuso: niente');
});
