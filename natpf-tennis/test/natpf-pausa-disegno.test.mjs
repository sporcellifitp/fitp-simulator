// Partita in pausa (guida, pausa, telefono o webcam da ricollegare, attesa del 1v1): la scena è ferma, quindi non si
// ridisegna a ogni fotogramma sotto i fogli sfocati (ottimizzazione del 31/10, game_engine._natpfFrame/_natpfPauseFrame).
// node --import ./test/register.mjs --test test/natpf-pausa-disegno.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import '../scripts/audit/headless-engine.mjs'; // finestra finta prima del motore
const { NatpfTennisEngine, PAUSE_DRAW } = await import('../src/game_engine.js');

function engine(){
  const e = Object.create(NatpfTennisEngine.prototype), log = { render: 0, update: 0 };
  Object.assign(e, { natpfPaused: false, natpfBackdropDirty: false, natpfPauseSince: null, natpfPauseDrawnAt: null });
  e._natpfBackdropFrame = () => false;
  e.render = () => { log.render++; };
  e.update = () => { log.update++; };
  return { e, log };
}
// fotogrammi a 60 Hz per ms millisecondi a partire da t0
function run(e, t0, ms){ let t = t0; for (let i = 0; i < Math.round(ms*60/1000); i++, t += 1000/60) e._natpfFrame(1/60, t); return t; }

test('in pausa: disegno a ogni fotogramma solo mentre la scena si assesta, poi una volta ogni everyMs', () => {
  const { e, log } = engine();
  let t = run(e, 0, 1000);
  assert.equal(log.update, 60); assert.equal(log.render, 60, 'in gioco: ogni fotogramma');
  e.natpfPaused = true;
  const r0 = log.render;
  t = run(e, t, 3000);
  const paused = log.render - r0;
  // prima del 31/10: 180 disegni in 3 s di pausa
  const expected = Math.ceil(PAUSE_DRAW.settleMs/(1000/60)) + Math.floor((3000 - PAUSE_DRAW.settleMs)/PAUSE_DRAW.everyMs);
  assert.ok(Math.abs(paused - expected) <= 2, `${paused} disegni in 3 s di pausa (attesi ~${expected})`);
  assert.ok(paused <= 40, 'molti meno dei 180 di prima');
  assert.equal(log.update, 60, 'in pausa la partita non avanza');
  // ridimensionamento in pausa: si ridisegna subito
  const r1 = log.render;
  e.natpfBackdropDirty = true; e._natpfFrame(1/60, t); t += 1000/60;
  assert.equal(log.render, r1 + 1); assert.equal(e.natpfBackdropDirty, false);
  // fuori dalla pausa: ogni fotogramma, e una pausa nuova riparte dall'assestamento
  e.natpfPaused = false;
  const r2 = log.render;
  t = run(e, t, 500);
  assert.equal(log.render - r2, 30); assert.equal(log.update, 90);
  e.natpfPaused = true;
  const r3 = log.render;
  run(e, t, PAUSE_DRAW.settleMs - 20);
  assert.ok(log.render - r3 >= Math.floor((PAUSE_DRAW.settleMs - 20)/(1000/60)), 'pausa nuova: assestamento a ogni fotogramma');
});

test('menu (sfondo fermo) prima della pausa: decide _natpfBackdropFrame, come prima', () => {
  const { e, log } = engine();
  e._natpfBackdropFrame = () => true; e.natpfPaused = true;
  assert.equal(e._natpfFrame(1/60, 0), 'backdrop');
  assert.equal(log.render + log.update, 0);
});
