import test from 'node:test';
import assert from 'node:assert/strict';
import { DRILLS, trainingDirection, drillAfterShot } from '../src/natpf/natpf_training.js';
import { gripSvg } from '@natpf/tennis/grip-art.js';
import { PHOTOS } from '../src/natpf/natpf_media.js';
import { makeWorld } from './ui-world.mjs';

test('incrociato e lungolinea: geometria del colpo, centro escluso, riferimento corretto da entrambi i lati', () => {
  for (const sign of [1, -1]){
    assert.equal(trainingDirection({ x: -2.5*sign, hitX: 1.5*sign }), 'cross');
    assert.equal(trainingDirection({ x: 2.5*sign, hitX: 1.5*sign }), 'line');
    assert.equal(trainingDirection({ x: .3*sign, hitX: 1.5*sign }), null);
    assert.equal(trainingDirection({ x: 2.5*sign, hitX: 0, contact: sign }), 'line');
    assert.equal(trainingDirection({ x: -2.5*sign, hitX: 0, contact: sign }), 'cross');
  }
  assert.equal(trainingDirection({ x: NaN }), null);
  const d = DRILLS.find(d => d.id === 'line');
  assert.equal(drillAfterShot(d, { done: 0, tries: 0 }, { direction: 'line', inCourt: false }).done, 0);
});

test('tutorial nel motore: la palla al centro o in rete non completa Incrociato, il bersaglio corretto sì', async () => {
  const w = await makeWorld(); w.link.ready = true; w.link.L.phone = 'ready';
  const T = w.ui.training, cross = DRILLS.find(d => d.id === 'cross');
  T.start({ drills: [cross] });
  w.E.natpfLastRacket = { at: w.E.elapsedTime, hitX: 1.4, contact: 1, out: { shot: 'TOPSPIN' } };
  w.E.ball.targetLanding.x = 0;
  T.onShot({ color: 'green', label: 'Perfetto' });
  assert.equal(T.progress.done, 0); assert.equal(T.progress.wrongDirection, true);
  w.E.ball.targetLanding.x = -2.5;
  T.onShot({ color: 'red', label: 'In rete' });
  assert.equal(T.progress.done, 0);
  T.onShot({ color: 'green', label: 'Perfetto' });
  assert.equal(T.progress.done, 1);
});

test('speciali: si giudica il colpo applicato dal motore, non soltanto quello richiesto dal telefono', async () => {
  const w = await makeWorld(); w.link.ready = true; w.link.L.phone = 'ready';
  const T = w.ui.training; T.start({ drills: [DRILLS.find(d => d.id === 'smash')] });
  T.lastShot = 'smash';
  w.E.natpfLastRacket = { at: w.E.elapsedTime, hitX: 1, contact: 1, out: { shot: 'FLAT' } };
  T.onShot({ color: 'green', label: 'Perfetto' }); assert.equal(T.progress.done, 0);
  w.E.natpfLastRacket.out.shot = 'SMASH';
  T.onShot({ color: 'green', label: 'Perfetto' }); assert.equal(T.progress.done, 1);
});

// revisione B10 (voce «smash»): il motore gioca da sopra la testa ogni palla sopra 2,3 m, ma la scritta e la voce dicono
// «Schiacciata» solo con il gesto della schiacciata. L'esercizio conta il colpo chiamato: un dritto su una palla alta
// diceva «Schiacciata ✓» sulla scheda con la scritta «Perfetto» e senza voce
test('esercizio Schiacciata nel motore: un dritto su una palla alta non conta, il gesto della schiacciata sì', async () => {
  const w = await makeWorld(); w.link.ready = true; w.link.L.phone = 'ready';
  const T = w.ui.training, E = w.E; T.start({ drills: [DRILLS.find(d => d.id === 'smash')] });
  const popups = [], show = E.hud.showTimingPopup.bind(E.hud);
  E.hud.showTimingPopup = (o) => { popups.push(String(o.grade)); return show(o); };
  const strike = (shot, y) => {
    const power = .6;
    E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; E.ball.bounceCountOnCurrentSide = 0; E.ball.rallyStrokeCount = 4;
    E.player.pos.set(.3, 0, 7.5); E.player.targetPos.copy(E.player.pos); E.player.swingCooldown = 0;
    E.ball.pos.set(.8, y, 7.2); E.ball.vel.set(0, -1, 14); E.ball.targetLanding.set(.3, 0, 8.5);
    return E._attemptPlayerRallyStrike({ source: 'natpf-phone', side: 'forehand', shotType: shot === 'smash' ? 'smash' : 'topspin', speed: .8 + power*.85, dirX: 0,
      natpfTau: 0, natpfLateSpan: .1, natpf: { aim: 'swing', shot, intent: { shot, power, depth: power, rise: 0, face: 0 }, power, peak: 900, latency: 0, hand: 'right' } }, false);
  };
  for (const y of [2.45, 2.8]){
    assert.ok(strike('topspin', y), `dritto a ${y} m colpito`);
    assert.equal(E.natpfLastRacket.out.shot, 'SMASH', 'il motore la gioca da sopra la testa');
    assert.ok(!/SMASH/.test(popups.at(-1)), popups.at(-1));
    assert.equal(T.progress.done, 0, `dritto a ${y} m contato come schiacciata (${T.message})`);
    assert.doesNotMatch(T.message, /✓/);
  }
  assert.ok(strike('smash', 2.0), 'schiacciata colpita');
  assert.match(popups.at(-1), /SMASH/);
  assert.equal(T.progress.done, 1, T.message);
  assert.match(T.message, /Schiacciata ✓/);
});

test('lanciapalle della schiacciata: traiettoria alta prima del rimbalzo, non il lancio normale', async () => {
  const w = await makeWorld(); w.link.ready = true; w.link.L.phone = 'ready';
  const T = w.ui.training; T.start({ drills: [DRILLS.find(d => d.id === 'smash')] });
  T._feed('forehand');
  assert.equal(w.E.ball.shotType, 'MOON'); assert.equal(w.E.ball.bounceCountOnCurrentSide, 0);
  assert.ok(w.E.ball.vel.y > 7, `velocità verticale ${w.E.ball.vel.y}`);
});

test('impugnatura nel riscaldamento: foto reale solo da fermo, specchiata per la mano sinistra (figura disegnata di riserva)', async () => {
  const w = await makeWorld(); w.cal({ kind: 'step', step: 'still' });
  const T = w.ui.training; T.start(); T.paint();
  const art = T.coach.querySelector('#coach-grip');
  assert.equal(art.classList.contains('hidden'), false);
  assert.ok(art.innerHTML.includes(PHOTOS.grip.src), art.innerHTML);
  assert.doesNotMatch(art.innerHTML, /mirror/);
  w.ui.hand.set('left'); T.paint();
  assert.match(art.innerHTML, /coach-grip-photo mirror/);
  assert.match(gripSvg({ hand: 'left' }), /Mano sinistra/);
  assert.match(gripSvg({ hand: 'left' }), /DI LATO/);
  w.cal({ kind: 'step', step: 'swings', want: 'L', idx: 0, total: 2 }); T.paint();
  assert.equal(art.classList.contains('hidden'), true, 'durante il gesto resta libero il campo');
});
