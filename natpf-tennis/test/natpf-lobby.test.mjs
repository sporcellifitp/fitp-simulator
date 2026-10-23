// Menu a tappe, esito del colpo, mano del giocatore e allenamento (funzioni senza DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { LOBBY_STEPS, EGG_WORD, stepReady, initialStep, eggTyped, autoAdvance, progressSteps, previousStep } from '../src/natpf/natpf_lobby.js';
import { introMode, INTRO_MS } from '../src/natpf/natpf_intro.js';
import { controllerTiles, viewTiles, controllerStatus, CONTROLLER_TILES } from '../src/natpf/natpf_tiles.js';
import { shotQuality, shotWhy, landsIn, VIBRATION, QUALITY_COLORS } from '../src/natpf/natpf_shot_feedback.js';
import { leftySide, isLocalServing, normalizeHand } from '../src/natpf/natpf_hand.js';
import { DRILLS, drillsFor, drillAfterShot, calSide, calCoach, CAL_SPOT, sideWant } from '../src/natpf/natpf_training.js';

test('percorso da console: menu → modalità → racchetta → collega → riscaldamento → partita; allenamento a parte', () => {
  assert.deepEqual(LOBBY_STEPS, ['menu', 'mode', 'options', 'challenges', 'ranking', 'result', 'controller', 'connect', 'warmup', 'match']);
  assert.deepEqual(progressSteps('challenge').map(([id]) => id), ['challenges', 'controller', 'connect', 'warmup']);
  assert.equal(previousStep('controller', 'challenge'), 'challenges');
  assert.equal(previousStep('result', 'challenge'), 'menu');
  assert.equal(initialStep(), 'menu');                  // dopo l'intro ogni visitatore parte dal menu principale
  assert.deepEqual(progressSteps('cpu').map(([id]) => id), ['mode', 'controller', 'connect', 'warmup', 'match']);
  assert.deepEqual(progressSteps('training').map(([id]) => id), ['controller', 'connect', 'warmup']);
  assert.equal(previousStep('controller', 'cpu'), 'mode');
  assert.equal(previousStep('controller', 'training'), 'menu', 'l’allenamento parte dal menu');
  assert.equal(previousStep('mode', 'cpu'), 'menu'); assert.equal(previousStep('options'), 'menu');
  assert.equal(previousStep('match', 'friend'), 'connect'); assert.equal(previousStep('menu'), null);
});

test('intro: completa la prima volta, breve nella stessa sessione, spenta con ?intro=0 o in diagnostica', () => {
  assert.equal(introMode({ search: '', seen: false }), 'full');
  assert.equal(introMode({ search: '', seen: true }), 'short');
  assert.equal(introMode({ search: '?intro=0' }), 'off');
  assert.equal(introMode({ search: '?diag=1' }), 'off');
  // Player 2 dall'invito di una sfida: dritto nella stanza
  assert.equal(introMode({ search: '?room=AT-AB12&role=p2&net=p2p' }), 'off');
  assert.equal(introMode({ search: '?room=AT-AB12' }), 'full');
  assert.ok(INTRO_MS.full > INTRO_MS.short);
});

test('in campo appena il controller è pronto; il riscaldamento non blocca mai', () => {
  // telefono: basta che sia collegato con i sensori attivi (la calibrazione si fa in campo)
  assert.equal(stepReady('connect', { controller: 'phone', phoneLinked: false }), false);
  assert.equal(stepReady('connect', { controller: 'phone', phoneLinked: true }), true);
  assert.equal(stepReady('connect', { controller: 'webcam', webcamActive: false }), false);
  assert.equal(stepReady('connect', { controller: 'webcam', webcamActive: true }), true);
  assert.equal(stepReady('connect', { controller: 'mouse' }), true);
  for (const s of ['menu', 'mode', 'controller', 'warmup', 'match']) assert.equal(stepReady(s, {}), true, s);
  assert.equal(autoAdvance('connect', { controller: 'phone', phoneLinked: true }), true);
  assert.equal(autoAdvance('connect', { controller: 'webcam', handSeen: true }), true);
  assert.equal(autoAdvance('connect', { controller: 'webcam', handSeen: false }), false);
  assert.equal(autoAdvance('controller', { controller: 'phone', phoneLinked: true }), false);
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
  assert.match(controllerStatus('phone', { phone: { ready: false, connected: false } }), /QR/);
  assert.match(controllerStatus('phone', { phone: { ready: false, connected: true } }), /Collegato/);
  assert.match(controllerStatus('phone', { phone: { ready: true, connected: true } }), /Pronto/);
  assert.match(controllerStatus('webcam', { phone: {}, webcamActive: true }), /Attiva/);
  assert.match(controllerStatus('webcam', { phone: {}, webcamActive: false }), /impugnare/);
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

test('palla in rete: il messaggio dice «In rete», non «Perfetto» (il bersaglio del motore resta in campo); colpo debole con il motivo (23/10, sera)', () => {
  assert.deepEqual(shotQuality('PERFECT • FOREHAND TOPSPIN', { inCourt: true, net: true }), { color: 'red', label: 'In rete' });
  assert.deepEqual(shotQuality('TOO LATE! • WHIFF', { net: true }), { color: 'red', label: 'Mancata' });
  const shot = (out, o = {}) => ({ who: 'player', at: 12.5, cause: 'in allungo', out: { failed: true, weak: false, ...out }, ...o });
  assert.equal(shotWhy(shot({ weak: true }), { now: 12.5 }), 'palla debole: in allungo');
  assert.equal(shotWhy(shot({}, { cause: 'scambio lungo' }), { now: 12.5 }), 'scambio lungo');
  assert.equal(shotWhy(shot({ failed: false }), { now: 12.5 }), null);                  // colpo riuscito: niente motivo
  assert.equal(shotWhy(shot({ weak: true }), { now: 13 }), null);                        // non è il colpo appena fatto
  assert.equal(shotWhy(shot({ weak: true }, { who: 'p2' }), { now: 12.5 }), null);       // colpo dell'altro giocatore
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

test('riscaldamento: calibrazione in campo, poi dritto, rovescio, servizio, angoli; conta solo il lato giusto', () => {
  assert.deepEqual(DRILLS.map(d => d.id), ['forehand', 'backhand', 'lob', 'drop', 'serve', 'free']);
  for (const d of DRILLS) for (const c of ['phone', 'webcam', 'mouse']) if (!d.phoneOnly || c === 'phone') assert.ok(d.hint[c], `${d.id}/${c}`);
  assert.deepEqual(drillsFor('mouse').map(d => d.id), ['forehand', 'backhand', 'serve', 'free']);
  const lob = DRILLS.find(d => d.id === 'lob');
  assert.equal(drillAfterShot(lob, { done: 0, tries: 0 }, { shot: 'lob', inCourt: false }).done, 1, 'pallonetto riconosciuto: vale anche fuori');
  assert.equal(drillAfterShot(lob, { done: 0, tries: 0 }, { shot: 'topspin', inCourt: true }).done, 0);
  const fh = DRILLS[0], p0 = { done: 0, tries: 0 };
  assert.deepEqual(drillAfterShot(fh, p0, { side: 'forehand', inCourt: true }), { done: 1, tries: 1, ok: true, wrongSide: false });
  assert.equal(drillAfterShot(fh, p0, { side: 'backhand', inCourt: true }).done, 0);
  assert.equal(drillAfterShot(fh, p0, { side: 'forehand', inCourt: false }).done, 0);
  assert.equal(drillAfterShot(DRILLS.find(d => d.id === 'free'), p0, { side: 'backhand', inCourt: true }).done, 1);
  // i gesti della calibrazione diventano colpi: «L» (da destra a sinistra) è il dritto del destro e il rovescio del mancino
  assert.equal(calSide('L', 'right'), 'forehand'); assert.equal(calSide('R', 'right'), 'backhand');
  assert.equal(calSide('L', 'left'), 'backhand'); assert.equal(calSide('R', 'left'), 'forehand');
  assert.deepEqual(calCoach('L'), { side: 'forehand', title: 'Dritto', arrow: '←', move: 'verso sinistra' });
  // la palla della calibrazione aspetta di lato, all'altezza della racchetta, poco davanti al giocatore fermo al centro
  assert.ok(CAL_SPOT.reach > .7 && CAL_SPOT.reach < 1.4 && CAL_SPOT.height > .6 && CAL_SPOT.height < 1.3 && CAL_SPOT.ahead < .95);
  // freccia del gesto per il lato del colpo (pannello degli esercizi): l'inverso di calSide
  for (const hand of ['right', 'left']) for (const side of ['forehand', 'backhand']) assert.equal(calSide(sideWant(side, hand), hand), side);
});

test('menu principale: frecce verso la voce più vicina in quella direzione (le tre voci di servizio stanno in fila)', async () => {
  const { nearestTile } = await import('../src/natpf/natpf_lobby.js');
  // GIOCA, ALLENAMENTO, SFIDE in colonna; CLASSIFICA, COME SI GIOCA, OPZIONI in fila sotto
  const R = { play: [0, 0, 300, 70], training: [0, 80, 300, 50], challenges: [0, 140, 300, 50], ranking: [0, 200, 95, 40], guide: [102, 200, 95, 40], options: [205, 200, 95, 40] };
  const tiles = Object.keys(R), rect = k => ({ left: R[k][0], top: R[k][1], width: R[k][2], height: R[k][3] });
  const go = (from, code) => nearestTile(tiles, from, code, rect);
  assert.equal(go('play', 'ArrowDown'), 'training');
  assert.equal(go('challenges', 'ArrowDown'), 'guide', 'sotto il centro della voce');
  assert.equal(go('guide', 'ArrowRight'), 'options');
  assert.equal(go('options', 'ArrowRight'), null, 'in fondo alla riga');
  assert.equal(go('ranking', 'ArrowUp'), 'challenges');
  assert.equal(go('play', 'ArrowUp'), null);
});
