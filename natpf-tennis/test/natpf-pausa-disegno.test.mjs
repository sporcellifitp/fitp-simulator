// Partita in pausa (guida, pausa, telefono o webcam da ricollegare, attesa del 1v1): la scena è ferma, quindi non si
// ridisegna a ogni fotogramma sotto i fogli sfocati (ottimizzazione del 31/10, game_engine._natpfFrame/_natpfPauseFrame).
// node --import ./test/register.mjs --test test/natpf-pausa-disegno.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import '../scripts/audit/headless-engine.mjs'; // finestra finta prima del motore
const { NatpfTennisEngine, PAUSE_DRAW } = await import('../src/game_engine.js');
const THREE = await import('three');

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

// Menu (sfondo fermo dell'arena): si ridisegna all'ingresso, al ridimensionamento e quando arriva una texture, non più
// una volta al secondo per 8 s a ogni ingresso. Senza GPU ogni disegno costa ~1 s: nella lobby dello stesso schermo
// fermava le animazioni dei gesti (un fotogramma da ~1 s, 44 fps nella prova natpf-modale-gesti)
function backdropEngine(){
  const e = Object.create(NatpfTennisEngine.prototype), log = { render: 0, at: [] };
  let want = true, now = 0;
  Object.assign(e, { natpfUi: { menuBackdrop: () => want, tick(){} }, natpfBackdrop: false, natpfBackdropDirty: false, elapsedTime: 0, versus: null });
  e._natpfBackdropPose = () => {}; e.update = () => {}; e.natpfPaused = false;
  e.render = () => { log.render++; log.at.push(now); };
  // fotogrammi a 60 Hz per ms millisecondi, con il ciclo vero (_natpfFrame → _natpfBackdropFrame)
  const frames = (t0, ms) => { let t = t0; for (let i = 0; i < Math.round(ms*60/1000); i++, t += 1000/60){ now = t; e._natpfFrame(1/60, t); } return t; };
  return { e, log, frames, leave: () => { want = false; }, enter: () => { want = true; } };
}

test('menu: un solo disegno all\'ingresso con le texture già arrivate, niente ridisegni alla cieca nei secondi dopo', () => {
  const { e, log, frames, leave, enter } = backdropEngine(), manager = new THREE.LoadingManager();
  e._natpfWatchTextures(manager);
  // texture arrivate prima che il menu compaia (al primo avvio le grafiche dell'arena arrivano prima del primo disegno)
  manager.itemStart('a.png'); manager.itemEnd('a.png');
  let t = frames(0, 10000);
  assert.equal(log.render, 1, `${log.render} disegni in 10 s di menu (prima del 07/11: 9, uno al secondo per 8 s)`);
  // ridimensionamento: subito
  e.natpfBackdropDirty = true; t = frames(t, 1000);
  assert.equal(log.render, 2);
  // fuori dal menu (si gioca: un disegno a fotogramma) e di nuovo dentro: un disegno all'ingresso, poi nulla
  leave(); t = frames(t, 500); const r = log.render;
  assert.equal(r, 2 + 30);
  enter(); t = frames(t, 9000);
  assert.equal(log.render, r + 1, 'nuovo ingresso nel menu: un disegno');
});

test('menu: una texture che arriva dopo il primo disegno si vede entro 1 s, al più un disegno al secondo', () => {
  const { e, log, frames } = backdropEngine(), manager = new THREE.LoadingManager();
  const seen = []; manager.onProgress = url => seen.push(url);
  e._natpfWatchTextures(manager);
  let t = frames(0, 2300);
  assert.equal(log.render, 1);
  // quattro immagini su rete lenta: a a 2,3 s (nessun disegno in questo secondo: subito), b e c subito dopo (nello
  // stesso secondo: un disegno solo, al secondo dopo), d (non caricata) più tardi
  for (const u of ['a', 'b', 'c', 'd']) manager.itemStart(u + '.png');
  manager.itemEnd('a.png'); t = frames(t, 100);
  assert.equal(log.render, 2, 'la prima arrivata: subito');
  assert.ok(log.at[1] >= 2300 && log.at[1] < 2320, `${log.at[1].toFixed(0)} ms`);
  manager.itemEnd('b.png'); t = frames(t, 100); manager.itemEnd('c.png'); t = frames(t, 1600);
  assert.equal(log.render, 3, 'le due arrivate nello stesso secondo del disegno precedente: un disegno, al secondo dopo');
  assert.ok(log.at[2] >= 3000 && log.at[2] < 3020, `disegno al cambio di secondo (${log.at[2].toFixed(0)} ms)`);
  manager.itemError('d.png'); manager.itemEnd('d.png'); t = frames(t, 3000);
  assert.equal(log.render, 4, 'anche un\'immagine non caricata chiede il suo disegno, una volta');
  assert.deepEqual(seen, ['a.png', 'b.png', 'c.png', 'd.png'], 'onProgress già messo conservato');
  frames(t, 5000);
  assert.equal(log.render, 4, 'poi l\'immagine resta quella');
});
