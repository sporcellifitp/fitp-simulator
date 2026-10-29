import test from 'node:test';
import assert from 'node:assert/strict';
import { DRILLS, trainingDirection, drillAfterShot } from '../src/natpf/natpf_training.js';
import { gripSvg } from '@natpf/tennis/grip-art.js';
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
  assert.match(art.innerHTML, /presa-palmo\.webp/);
  assert.doesNotMatch(art.innerHTML, /mirror/);
  w.ui.hand.set('left'); T.paint();
  assert.match(art.innerHTML, /coach-grip-photo mirror/);
  assert.match(gripSvg({ hand: 'left' }), /Mano sinistra/);
  assert.match(gripSvg({ hand: 'left' }), /DI LATO/);
  w.cal({ kind: 'step', step: 'swings', want: 'L', idx: 0, total: 2 }); T.paint();
  assert.equal(art.classList.contains('hidden'), true, 'durante il gesto resta libero il campo');
});
