// Integrazione NATPF ↔ motore base: formato 1v1, traduzione dei gesti del telefono, impugnatura, fasi, prima persona,
// pagina del telefono e file copiati nella build. node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { resolveMatchFormat, DOUBLES_ENABLED } from '../src/natpf/match_format.js';
import { natpfSwingToEngine, racketTiltFromRotation, phoneGamePhase, phonePageUrl, NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { firstPersonPose, setFirstPersonBody, normalizeViewMode, firstPersonFov, FIRST_PERSON } from '../src/natpf/natpf_camera.js';
import { phoneFiles, arenaFiles } from '../scripts/natpf-site-plugin.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../site');
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('formato: singolare di base, doppio 2v2 su richiesta dal menu', () => {
  assert.equal(DOUBLES_ENABLED, true);
  assert.equal(resolveMatchFormat().id, 'singles');
  assert.equal(resolveMatchFormat('doubles').teamSize, 2);
  assert.equal(resolveMatchFormat('doubles', { doublesEnabled: false }).id, 'singles');
  assert.equal(resolveMatchFormat('qualsiasi').id, 'singles');
});

test('gesto NATPF → colpo motore base: direzione del gesto sceglie dritto/rovescio, mira e forza passano', () => {
  // destro: da destra a sinistra (dir +1) è il dritto e, senza mira esplicita, va incrociato a sinistra
  const fh = natpfSwingToEngine({ dir: 1, power: .3 });
  assert.equal(fh.side, 'forehand'); near(fh.dirX, -.72); near(fh.speed, .8); assert.equal(fh.shotType, 'topspin'); assert.equal(fh.source, 'natpf-phone');
  const bh = natpfSwingToEngine({ dir: -1, power: 1, aim: .4 });
  assert.equal(bh.side, 'backhand'); near(bh.dirX, .4); near(bh.speed, 1.65);
  assert.equal(natpfSwingToEngine({ dir: 1 }, { hand: 'left' }).side, 'backhand');   // mancino: lo stesso verso è il rovescio
  assert.equal(natpfSwingToEngine({ dir: 0 }).side, null);                         // centrale: motore base decide dalla palla
  const lob = natpfSwingToEngine({ dir: 1, lob: true, power: .7 });
  assert.equal(lob.shotType, 'lob'); assert.ok(lob.dirY < -.5);
  assert.equal(natpfSwingToEngine({ dir: 1, slice: true }).shotType, 'slice');
  const drop = natpfSwingToEngine({ dir: 1, drop: true, power: 1 });
  assert.equal(drop.shotType, 'slice'); assert.ok(drop.speed <= .9, 'palla corta: colpo morbido');
});

test('impugnatura NATPF: rotazioni del telefono → beccheggio, apertura del piatto e oscillazione della racchetta', () => {
  assert.deepEqual(Object.values(racketTiltFromRotation([0, 0, 0, 1])).map(v => Math.round(v*1e6)/1e6 + 0), [0, 0, 0]);
  const shown = THREE.MathUtils.RAD2DEG*.5*.55;                       // come character.js: al massimo il 55% della rotazione
  const about = axis => racketTiltFromRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis), .5).toArray());
  const x = about([1, 0, 0]), y = about([0, 1, 0]), z = about([0, 0, 1]);
  near(x.pitch, shown, 1e-4); near(x.roll, 0, 1e-4); near(x.yaw, 0, 1e-4);    // asse X: larghezza dell'ovale
  near(y.roll, shown, 1e-4); near(y.pitch, 0, 1e-4);                         // asse Y: manico (telefono in verticale)
  near(z.yaw, shown, 1e-4); near(z.pitch, 0, 1e-4);                          // asse Z: normale dello schermo = del piatto
  assert.deepEqual(Object.values(racketTiltFromRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .5).toArray(), 0)).map(v => Math.round(v*1e6)/1e6 + 0), [0, 0, 0]);
  assert.equal(racketTiltFromRotation([NaN, 0, 0, 1]), null);
});

test('fase mandata al telefono: servizio e lancio solo per chi serve, P2 compreso', () => {
  const e = (phase, server, role = 'p1', autoPlayMode = false) => ({ phase, score: { server }, playerRole: role, autoPlayMode });
  assert.equal(phoneGamePhase(e('SERVE_STANCE', 'player')), 'serve');
  assert.equal(phoneGamePhase(e('SERVE_TOSS', 'player')), 'toss');
  assert.equal(phoneGamePhase(e('SERVE_STANCE', 'opponent')), 'play');
  assert.equal(phoneGamePhase(e('SERVE_STANCE', 'opponent', 'p2')), 'serve');
  assert.equal(phoneGamePhase(e('RALLY', 'player')), 'play');
  assert.equal(phoneGamePhase(e('RALLY', 'player', 'p1', true)), 'menu');
  assert.equal(phoneGamePhase(e('MATCH_OVER', 'player')), 'over');
  assert.equal(phoneGamePhase(e('TITLE', 'player')), 'menu');
});

test('esito del colpo al telefono solo per il giocatore locale', () => {
  const sent = [];
  const phone = new NatpfPhoneRacket({ playerRole: 'p2' });
  phone.link = { ready: true, send: m => sent.push(m) };
  phone.feedback({ role: 'p1', kind: 'hit', grade: 'PERFECT' });
  phone.feedback({ role: 'p2', kind: 'hit', grade: 'PERFECT • FOREHAND', shotType: 'LOB', quality: { color: 'green', label: 'Perfetto' } });
  phone.feedback({ role: 'p2', kind: 'whiff' });
  phone.feedback({ role: 'p2', kind: 'point_won', grade: 'POINT WON!' });
  assert.deepEqual(sent, [
    { t: 'ev', k: 'contact', label: 'perfetto', shot: 'lob', vib: [70], out: false },
    { t: 'ev', k: 'miss', why: 'tardi', vib: [25, 60, 25] },
    { t: 'ev', k: 'point', mine: true, txt: 'POINT WON!' },
  ]);
});

test('prima persona: occhi del giocatore locale e sguardo verso la metà campo avversaria, per P1 e P2', () => {
  const p1 = firstPersonPose({ sideSign: 1, pos: new THREE.Vector3(1, 0, 11.89) }, 11.89);
  near(p1.position.z, 11.89 + FIRST_PERSON.back); near(p1.position.y, FIRST_PERSON.eyeHeight); near(p1.position.x, 1);
  assert.ok(p1.target.z < -11.89);
  const p2 = firstPersonPose({ sideSign: -1, pos: new THREE.Vector3(-1, 0, -11.89) }, 11.89);
  near(p2.position.z, -11.89 - FIRST_PERSON.back); assert.ok(p2.target.z > 11.89);
  assert.equal(normalizeViewMode('first'), 'first'); assert.equal(normalizeViewMode('qualsiasi'), 'third');
  assert.ok(firstPersonFov(16/9) > 70);
});

test('prima persona: corpo nascosto, mani e racchetta visibili, ripristino in terza persona', () => {
  const g = name => Object.assign(new THREE.Group(), { name });
  const model = g('model'), hip = g('hip'), torso = g('torso'), head = g('head'), handPivot = g('handRPivot'), hand = g('hand'), finger = g('finger'), foot = g('foot');
  model.add(hip, handPivot, foot); hip.add(torso); torso.add(head); handPivot.add(hand); hand.add(finger);
  const actor = { model, parts: { handR: hand, head, torso }, racketPivot: g('racket') };
  setFirstPersonBody(actor, true);
  assert.equal(hip.visible, false); assert.equal(foot.visible, false);
  assert.equal(handPivot.visible, true); assert.equal(hand.visible, true); assert.equal(finger.visible, true);
  setFirstPersonBody(actor, false);
  assert.ok([hip, foot, handPivot, hand].every(o => o.visible));
});

test('pagina del telefono: quella di NATPF sotto /natpf/, oppure una pagina https indicata con ?phone=', () => {
  assert.equal(phonePageUrl({ origin: 'https://gioco.example', search: '' }), 'https://gioco.example/natpf/tennis/racchetta.html');
  assert.equal(phonePageUrl({ origin: 'http://192.168.1.4:3000', search: '?phone=https%3A%2F%2Fnatpf.example%2Ftennis%2Fracchetta.html' }), 'https://natpf.example/tennis/racchetta.html');
});

test('build: solo la pagina del telefono NATPF, le sue dipendenze e le grafiche dell\'arena', () => {
  const files = phoneFiles(SITE);
  for (const f of ['tennis/racchetta.html', 'js/tennis/racchetta.js', 'js/tennis/link.js', 'js/tennis/calibration.js', 'js/tennis/swing-detect.js', 'js/vendor/peerjs.min.js', 'js/vendor/qrcode.js']) assert.ok(files.includes(f), f);
  assert.ok(!files.some(f => /^(js\/(world|games|content|systems)\/|data\/|assets\/photos\/)/.test(f)), 'niente mondo esplorabile o minigiochi');
  const art = arenaFiles(SITE);
  for (const f of ['assets/arena/logo-impilato.png', 'assets/arena/maxischermo.png', 'assets/arena/rete-logo.png']) assert.ok(art.includes(f), f);
});
