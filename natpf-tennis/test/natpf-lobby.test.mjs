// Menu a tappe, esito del colpo, mano del giocatore e allenamento (funzioni senza DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { LOBBY_STEPS, EGG_WORD, stepReady, initialStep, eggTyped } from '../src/natpf/natpf_lobby.js';
import { controllerTiles, viewTiles, controllerStatus, CONTROLLER_TILES } from '../src/natpf/natpf_tiles.js';
import { shotQuality, landsIn, VIBRATION, QUALITY_COLORS } from '../src/natpf/natpf_shot_feedback.js';
import { leftySide, isLocalServing, normalizeHand } from '../src/natpf/natpf_hand.js';
import { DRILLS, drillAfterShot } from '../src/natpf/natpf_training.js';

test('menu in cinque tappe: come si gioca, controller, preparazione, allenamento, partita', () => {
  assert.deepEqual(LOBBY_STEPS, ['howto', 'controller', 'setup', 'training', 'match']);
  assert.equal(initialStep({ flowDone: false }), 'howto');
  assert.equal(initialStep({ flowDone: true }), 'match');
});

test('si va avanti solo con la racchetta pronta e dopo l’allenamento', () => {
  assert.equal(stepReady('setup', { controller: 'phone', phoneReady: false }), false);
  assert.equal(stepReady('setup', { controller: 'phone', phoneReady: true }), true);
  assert.equal(stepReady('setup', { controller: 'webcam', webcamActive: false }), false);
  assert.equal(stepReady('setup', { controller: 'webcam', webcamActive: true }), true);
  assert.equal(stepReady('setup', { controller: 'mouse' }), true);
  assert.equal(stepReady('training', { trainingDone: false }), false);
  assert.equal(stepReady('training', { trainingDone: true }), true);
  assert.equal(stepReady('howto', {}), true);
});

test('easter egg: la parola si riconosce anche in mezzo ad altri tasti', () => {
  let b = '', hit = false;
  for (const k of 'xxNaTpF'){ ({ buffer: b, hit } = eggTyped(b, k)); }
  assert.equal(hit, true); assert.equal(b, EGG_WORD);
  assert.equal(eggTyped('natp', 'x').hit, false);
});

test('tessere: tre controller (il mouse si mostra solo con l’easter egg), due visuali, stato', () => {
  assert.equal((controllerTiles().match(/data-natpf-controller=/g) || []).length, 3);
  assert.equal((viewTiles().match(/data-natpf-view=/g) || []).length, 2);
  assert.deepEqual(CONTROLLER_TILES.map(t => t.id), ['phone', 'webcam', 'mouse']);
  assert.match(controllerStatus('phone', { phone: { ready: false, connected: false } }), /Da collegare/);
  assert.match(controllerStatus('phone', { phone: { ready: false, connected: true } }), /calibrare/);
  assert.match(controllerStatus('phone', { phone: { ready: true, connected: true } }), /Pronto/);
  assert.match(controllerStatus('webcam', { phone: {}, webcamActive: true }), /Attiva/);
  assert.match(controllerStatus('webcam', { phone: {}, webcamActive: false }), /preparazione/);
});

test('esito del colpo: verde perfetto, giallo anticipo/ritardo, rosso fuori o mancata', () => {
  assert.deepEqual(shotQuality('PERFECT • FOREHAND TOPSPIN'), { color: 'green', label: 'Perfetto' });
  assert.deepEqual(shotQuality('POWER SERVE!'), { color: 'green', label: 'Perfetto' });
  assert.deepEqual(shotQuality('EARLY • BACKHAND LINE'), { color: 'yellow', label: 'Anticipo' });
  assert.deepEqual(shotQuality('LATE • FOREHAND CROSS'), { color: 'yellow', label: 'Ritardo' });
  assert.deepEqual(shotQuality('SLICE'), { color: 'yellow', label: 'Buono' });
  assert.deepEqual(shotQuality('PERFECT • FOREHAND', { inCourt: false }), { color: 'red', label: 'Fuori' });
  assert.deepEqual(shotQuality('TOO LATE! • WHIFF'), { color: 'red', label: 'Mancata' });
  assert.ok(QUALITY_COLORS.green && QUALITY_COLORS.yellow && QUALITY_COLORS.red);
});

test('dentro o fuori: campo avversario e riquadro del servizio, per P1 e P2', () => {
  assert.equal(landsIn({ x: 1, z: -8 }), true);
  assert.equal(landsIn({ x: 5, z: -8 }), false);             // largo
  assert.equal(landsIn({ x: 0, z: -13 }), false);            // lungo
  assert.equal(landsIn({ x: 0, z: 3 }), false);              // nel proprio campo
  assert.equal(landsIn({ x: 0, z: -5 }, { serve: true }), true);
  assert.equal(landsIn({ x: 0, z: -9 }, { serve: true }), false);
  assert.equal(landsIn({ x: 0, z: 8 }, { towardNegativeZ: false }), true);
  assert.equal(landsIn(null), false);
});

test('vibrazione: lunga per il perfetto, doppia corta per l’errore', () => {
  assert.equal(VIBRATION.green.length, 1); assert.ok(VIBRATION.green[0] > VIBRATION.yellow[0]);
  assert.equal(VIBRATION.red.length, 3);
});

test('mancino: dritto e rovescio si scambiano, il telefono manda già il lato giusto', () => {
  assert.equal(normalizeHand('left'), 'left'); assert.equal(normalizeHand('x'), 'right');
  assert.equal(leftySide({ side: 'forehand' }), 'backhand');
  assert.equal(leftySide({ side: 'backhand' }), 'forehand');
  assert.equal(leftySide({ side: 'overhead' }), 'overhead');
  assert.equal(leftySide({ source: 'natpf-phone', side: 'forehand' }), 'forehand');
  assert.equal(leftySide({ dirX: .5 }), 'forehand');
  assert.equal(leftySide({}, { ballX: -1, actorX: 0 }), 'forehand');     // palla alla sua sinistra
  assert.equal(leftySide({}, { ballX: 1, actorX: 0 }), 'backhand');
  assert.equal(leftySide({}, { ballX: 1, actorX: 0, facingNegativeZ: false }), 'forehand');
});

test('mano libera in vista solo al proprio servizio', () => {
  assert.equal(isLocalServing({ phase: 'SERVE_TOSS', playerRole: 'p1', score: { server: 'player' } }), true);
  assert.equal(isLocalServing({ phase: 'RALLY', playerRole: 'p1', score: { server: 'player' } }), false);
  assert.equal(isLocalServing({ phase: 'SERVE_STANCE', playerRole: 'p1', score: { server: 'opponent' } }), false);
  assert.equal(isLocalServing({ phase: 'SERVE_STANCE', playerRole: 'p2', score: { server: 'opponent' } }), true);
});

test('allenamento: servizio, dritto, rovescio, colpi liberi; conta solo il lato giusto', () => {
  assert.deepEqual(DRILLS.map(d => d.id), ['serve', 'forehand', 'backhand', 'free']);
  for (const d of DRILLS) for (const c of ['phone', 'webcam', 'mouse']) assert.ok(d.hint[c], `${d.id}/${c}`);
  const fh = DRILLS[1], p0 = { done: 0, tries: 0 };
  assert.deepEqual(drillAfterShot(fh, p0, { side: 'forehand', inCourt: true }), { done: 1, tries: 1, ok: true, wrongSide: false });
  assert.equal(drillAfterShot(fh, p0, { side: 'backhand', inCourt: true }).done, 0);
  assert.equal(drillAfterShot(fh, p0, { side: 'forehand', inCourt: false }).done, 0);
  assert.equal(drillAfterShot(DRILLS[3], p0, { side: 'backhand', inCourt: true }).done, 1);
});
