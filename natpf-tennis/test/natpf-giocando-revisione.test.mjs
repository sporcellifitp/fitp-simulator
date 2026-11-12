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
