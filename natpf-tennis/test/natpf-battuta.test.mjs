// Chi batte per primo (richiesta del 29/10 sera, dopo la partita 191023 sullo stesso schermo): scelta nella pagina
// «Partita» del menu (Tu / avversario / sorteggio), usata da startNewMatch. Contro la CPU batte la CPU; nel 1v1 (stesso
// schermo) il Player 2 batte con il suo gesto e la CPU non batte al posto suo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { firstServer, serveChoice, SERVE_CHOICES } from '../src/natpf/match_format.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

test('chi batte per primo: scelte, valore sconosciuto → chi gioca qui, sorteggio con le due possibilità', () => {
  assert.deepEqual([...SERVE_CHOICES], ['player', 'opponent', 'random']);
  assert.equal(serveChoice('x'), 'player'); assert.equal(firstServer(undefined), 'player');
  assert.equal(firstServer('opponent'), 'opponent');
  assert.equal(firstServer('random', () => .2), 'player'); assert.equal(firstServer('random', () => .8), 'opponent');
  const r = mulberry32(5), seen = new Set();
  for (let i = 0; i < 20; i++) seen.add(firstServer('random', r));
  assert.deepEqual([...seen].sort(), ['opponent', 'player']);
});

function engine(choice, setup){
  const real = Math.random; Math.random = mulberry32(17);
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' });
    setup?.(e);
    e.natpfServeFirst = choice;
    e.startNewMatch({ showStartBanner: false });
    e.autoPlayMode = false; e.persistentStateLock = false;
    return e;
  } finally { Math.random = real; }
}

test('contro la CPU: con «CPU» batte la CPU (lancio dopo l\'attesa), con «Tu» chi gioca qui', () => {
  const cpu = engine('opponent');
  assert.equal(cpu.score.server, 'opponent'); assert.equal(cpu.phase, 'SERVE_STANCE');
  for (let i = 0; i < 240 && cpu.phase === 'SERVE_STANCE'; i++) cpu.step(1/120);
  assert.equal(cpu.phase, 'SERVE_TOSS', 'la CPU lancia da sola');
  const me = engine('player');
  assert.equal(me.score.server, 'player');
  for (let i = 0; i < 240; i++) me.step(1/120);
  assert.equal(me.phase, 'SERVE_STANCE', 'aspetta il gesto di chi gioca');
});

test('stesso schermo: con «Player 2» batte il P2 con il suo gesto, la CPU non batte al posto suo', () => {
  const e = engine('opponent', x => x.startSplit?.());
  assert.ok(e.natpfSplit?.active, 'sessione stesso schermo');
  assert.equal(e.score.server, 'opponent');
  for (let i = 0; i < 480; i++) e.step(1/120);
  assert.equal(e.phase, 'SERVE_STANCE', 'nessun lancio automatico per il P2');
  e._handleP2SwingInput({ source: 'phone', side: 'forehand', shotType: 'topspin', speed: 1.3 });
  assert.equal(e.phase, 'SERVE_TOSS', 'lancia il P2');
});
