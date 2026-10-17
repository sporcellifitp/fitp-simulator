// Lobby console, tessere e allenatore del punto di prova (funzioni senza DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { coachMessage, gradeHint, LOBBY_STEPS } from '../src/natpf/natpf_lobby.js';
import { controllerTiles, viewTiles, controllerStatus, CONTROLLER_TILES } from '../src/natpf/natpf_tiles.js';

const engine = (phase, extra = {}) => ({
  phase, score: { server: 'player', playerPoints: 0 },
  ball: { lastHitter: 'opponent', pos: { z: 0 }, vel: { z: 10 } }, player: { pos: { z: 11.9 } }, ...extra,
});

test('lobby in tre passi: partita, racchetta, visuale', () => assert.deepEqual(LOBBY_STEPS, ['mode', 'racket', 'view']));

test('allenatore: il servizio spiegato con la racchetta scelta', () => {
  assert.match(coachMessage(engine('SERVE_STANCE'), 'phone').sub, /gesto con il telefono/);
  assert.match(coachMessage(engine('SERVE_STANCE'), 'webcam').sub, /Alza la mano/);
  assert.match(coachMessage(engine('SERVE_STANCE'), 'mouse').sub, /↑ o W/);
  const toss = coachMessage(engine('SERVE_TOSS'), 'mouse');
  assert.equal(toss.hot, true); assert.match(toss.sub, /Spazio/);
  assert.match(coachMessage(engine('SERVE_STANCE', { score: { server: 'opponent' } }), 'phone').text, /avversario/);
});

test('allenatore: «Colpisci ora!» solo quando la palla sta per arrivare alla racchetta', () => {
  const far = coachMessage(engine('RALLY'), 'phone');                                         // 1,19 s all'arrivo
  assert.equal(far.hot, undefined); assert.match(far.text, /Arriva/);
  const near = coachMessage(engine('RALLY', { ball: { lastHitter: 'opponent', pos: { z: 8 }, vel: { z: 10 } } }), 'phone');
  assert.equal(near.hot, true); assert.equal(near.text, 'Colpisci ora!');
  const after = coachMessage(engine('RALLY', { ball: { lastHitter: 'player', pos: { z: 0 }, vel: { z: -10 } } }), 'phone', { lastGrade: 'EARLY • FOREHAND CROSS' });
  assert.match(after.sub, /anticipo/);
});

test('esito del colpo in parole semplici', () => {
  assert.match(gradeHint('PERFECT • FOREHAND TOPSPIN'), /momento giusto/);
  assert.match(gradeHint('POWER SERVE!'), /momento giusto/);
  assert.match(gradeHint('VERY LATE • DEFENSIVE'), /prima/);
  assert.match(gradeHint('LATE • BACKHAND LINE'), /lungolinea/);
});

test('tessere: tre racchette, due visuali, stato del telefono', () => {
  assert.equal((controllerTiles().match(/data-natpf-controller=/g) || []).length, 3);
  assert.equal((viewTiles().match(/data-natpf-view=/g) || []).length, 2);
  assert.doesNotMatch(controllerTiles(true), /tile-desc/);
  assert.deepEqual(CONTROLLER_TILES.map(t => t.id), ['phone', 'webcam', 'mouse']);
  assert.match(controllerStatus('phone', { phone: { ready: false, connected: false } }), /Da collegare/);
  assert.match(controllerStatus('phone', { phone: { ready: false, connected: true } }), /calibrare/);
  assert.match(controllerStatus('phone', { phone: { ready: true, connected: true } }), /Pronto/);
  assert.match(controllerStatus('webcam', { phone: {}, webcamActive: true }), /Attiva/);
});
