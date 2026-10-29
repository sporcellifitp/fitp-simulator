// Split screen (28/10): 1v1 sullo stesso computer con due telefoni. Il secondo telefono è il Player 2 locale: i suoi
// colpi arrivano all'avversario come quelli del P2 in rete, vede la partita dal lato del P2 e riceve i suoi esiti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './ui-world.mjs';
import { NatpfPhoneRacket, phoneGamePhase, ballMovingAway, expectedStrokeDir } from '../src/natpf/natpf_phone_racket.js';

// telefono finto già pronto (sensori attivi e calibrazione fatta), come quello del mondo di prova
function fakeLink(){
  return { connected: true, ready: true, L: { state: 'connected', phone: 'ready' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){} };
}
async function splitWorld(){
  const w = await makeWorld({ controller: 'phone' });
  w.link.cmd('skip');
  const P2 = new NatpfPhoneRacket(w.E, { role: 'p2' });
  P2.link = fakeLink(); w.E.natpfPhone2 = P2;
  // sessione 1v1 locale come la apre lo split screen (natpf_split.js): nessuna stanza in rete
  w.E.versus = { active: true, closing: false, local: true }; w.E._applyDifficultyTuning('1v1');
  w.E.autoPlayMode = false; w.E.startNewMatch({ showStartBanner: false });
  return { ...w, P2 };
}

test('secondo telefono: è il Player 2 locale, con mano e gesti imparati salvati a parte', async () => {
  const { E, P2 } = await splitWorld();
  assert.equal(P2.role, 'p2'); assert.equal(P2.localP2, true); assert.equal(P2.actor, E.opponent);
  assert.equal(E.natpfPhone.role, 'p1'); assert.equal(E.natpfPhone.localP2, false);
  P2.setHand('left');
  assert.equal(localStorage.getItem('natpf-tennis.hand.p2'), 'left');
  assert.notEqual(localStorage.getItem('natpf-tennis.hand'), 'left', 'la mano del P1 non cambia');
  // il P2 locale non tocca lo stato del telefono del motore (inclina la racchetta del P1)
  const before = JSON.stringify(E.motionController.phoneState);
  P2._syncPhoneState(); assert.equal(JSON.stringify(E.motionController.phoneState), before);
});

test('secondo telefono: vede la partita dal lato del P2 (fase, palla che si allontana, verso atteso)', async () => {
  const { E, P2 } = await splitWorld();
  E.phase = 'SERVE_STANCE'; E.score.server = 'opponent';
  assert.equal(phoneGamePhase(E, 'p2'), 'serve'); assert.equal(phoneGamePhase(E), 'play', 'per il P1 non è il suo servizio');
  E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent';
  assert.equal(ballMovingAway(E, 'p2'), true); assert.equal(ballMovingAway(E), false);
  // palla del P1 verso il P2 (z negativa), a destra del P2 guardando la rete (x negativa sul campo)
  E.ball.lastHitter = 'player'; E.ball.vel.set(0, 0, -12); E.opponent.pos.set(0, 0, -11);
  E.ball.targetLanding = { x: -2.5, z: -10 };
  assert.equal(expectedStrokeDir(E, 'right', 'p2'), 1, 'dritto del P2 destro');
  P2.update();
  assert.ok(P2.link.sent.some(m => m.t === 'ph' && m.ph === 'play'));
});

test('secondo telefono: lancio e servizio del P2 arrivano all’avversario (non al P1)', async () => {
  const { E, P2 } = await splitWorld();
  E.phase = 'SERVE_STANCE'; E.score.server = 'opponent';
  P2._onToss();
  assert.equal(E.phase, 'SERVE_TOSS', 'il P2 lancia la palla');
  // colpo verso il punto più alto del lancio (il motore ignora un gesto nei primi 0,16 s): servizio del P2
  let t = 0; while (E.phaseTimer < 0.3 && t++ < 400) E.update(1/120);
  P2._onSwing({ dir: 1, power: .9, peak: 700, at: performance.now()/1000 - .03 });
  for (let i = 0; i < 60 && E.phase === 'SERVE_TOSS'; i++) E.update(1/60);
  assert.equal(E.phase, 'RALLY'); assert.equal(E.ball.lastHitter, 'opponent', 'ha servito il P2');
});

test('secondo telefono: riceve solo i propri esiti', async () => {
  const { E, P2 } = await splitWorld();
  const p1 = E.natpfPhone.link.sent.length;
  E.motionController.triggerHapticFeedback({ role: 'p2', kind: 'point_won', grade: 'POINT WON!' });
  assert.ok(P2.link.sent.some(m => m.t === 'ev' && m.k === 'point' && m.mine));
  assert.equal(E.natpfPhone.link.sent.filter(m => m.t === 'ev').length, E.natpfPhone.link.sent.slice(0, p1).filter(m => m.t === 'ev').length, 'il P1 non riceve l’esito del P2');
});

import * as THREE from 'three';
import { splitViewports, splitCameraPose, splitVisible, SPLIT_CAM } from '../src/natpf/natpf_split.js';

test('split: due metà affiancate con una linea in mezzo, P1 a sinistra e P2 a destra', () => {
  const v = splitViewports(1920, 1080);
  assert.equal(v.p1.x, 0); assert.equal(v.p2.x + v.p2.w, 1920);
  assert.equal(v.p1.w, v.p2.w); assert.ok(v.p2.x > v.p1.x + v.p1.w, 'linea di separazione');
  assert.equal(v.p1.h, 1080);
});

// in ogni metà (monitor 16:9, ledwall 3×2 e 2×2 divisi in due) si vede tutto il singolare: le righe laterali al fondo
// campo di chi gioca e la rete; il P2 vede il campo dal suo lato (rovesciato)
for (const [name, aspect] of [['monitor 16:9', 8/9], ['ledwall 3×2', .75], ['ledwall 2×2', .5], ['schermo largo', 1.6]]){
  test(`split: camera della metà (${name}) — singolare tutto in vista, rete in vista`, () => {
    for (const side of [1, -1]){
      const p = splitCameraPose({ side, actorX: side*3, ballX: 2, aspect });
      const cam = new THREE.PerspectiveCamera(p.fov, aspect, .1, 500);
      cam.position.set(...p.pos); cam.lookAt(new THREE.Vector3(...p.look)); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const inView = (x, y, z) => { const q = new THREE.Vector3(x, y, z).project(cam); return Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 && q.z < 1; };
      const B = SPLIT_CAM.baseline*side;
      assert.ok(inView(4.115, 0, B) && inView(-4.115, 0, B), `${name} lato ${side}: righe laterali al fondo campo`);
      assert.ok(inView(0, 1, 0) && inView(4.1, 1, 0) && inView(-4.1, 1, 0), `${name} lato ${side}: rete`);
      assert.ok(inView(0, 0, -B), `${name} lato ${side}: fondo campo dell'avversario`);
      assert.ok(side*p.pos[2] > SPLIT_CAM.baseline, 'camera dietro il proprio fondo campo');
      assert.ok(p.fov >= 45 && p.fov <= 58);
    }
  });
}

test('split: sessione 1v1 locale (niente rete), terza persona, singolare; uscita pulita', async () => {
  const { E } = await makeWorld({ controller: 'phone' });
  E.viewMode = 'first'; E.setMatchFormat('doubles');
  assert.equal(E.startSplit(), true);
  assert.deepEqual({ ...E.versus }, { active: true, closing: false, local: true });
  assert.equal(E.isMultiplayer, true); assert.equal(E.roomId, 'default'); assert.equal(E.isDoubles, false, 'singolare');
  E.autoPlayMode = false; E.startNewMatch({ showStartBanner: false });
  assert.equal(E._versusInMatch(), true, 'i colpi del P2 contano');
  assert.equal(E._isFirstPersonActive(), false, 'terza persona nelle due viste');
  assert.equal(splitVisible(E), true);
  // la sessione locale non la chiude endVersus (la chiamano le altre modalità del menu e l'uscita dalla stanza)
  E.endVersus(); assert.equal(E.versus.active, true);
  assert.equal(E.natpfUi.versus.hostActive, false, 'nessuna attesa del P2 in rete');
  E.cameraMode = 'REPLAY_CAM'; assert.equal(splitVisible(E), false, 'moviola a schermo intero'); E.cameraMode = 'RALLY_CAM';
  E.endSplit();
  assert.equal(E.versus.active, false); assert.equal(E.isMultiplayer, false); assert.equal(splitVisible(E), false);
});

import { progressSteps, previousStep, stepReady, autoAdvance } from '../src/natpf/natpf_lobby.js';
import { splitPlayerStatus, splitShotLabel, SPLIT_CAL_TRIES } from '../src/natpf/natpf_split_ui.js';

test('menu: «Stesso schermo» va da modalità a telefoni a partita, e si prosegue con i due telefoni pronti', () => {
  assert.deepEqual(progressSteps('split').map(([id]) => id), ['mode', 'connect', 'match']);
  assert.equal(previousStep('connect', 'split'), 'mode'); assert.equal(previousStep('connect', 'cpu'), 'controller');
  assert.equal(stepReady('connect', { mode: 'split', controller: 'phone', phoneLinked: true, splitReady: false }), false, 'un solo telefono non basta');
  assert.equal(stepReady('connect', { mode: 'split', splitReady: true }), true);
  assert.equal(autoAdvance('connect', { mode: 'split', controller: 'phone', phoneLinked: true, splitReady: false }), false);
  assert.equal(autoAdvance('connect', { mode: 'split', splitReady: true }), true);
});

test('pannello di un giocatore: QR, sensori, passi della calibrazione, pronto; esiti dei colpi', () => {
  const p = { link: {}, state: { state: 'waiting' }, connected: false, ready: false, calView: { stage: 'off' } };
  assert.equal(splitPlayerStatus(p).state, 'qr');
  Object.assign(p, { connected: true, state: { state: 'connected', phone: null } });
  assert.match(splitPlayerStatus(p).title, /Attiva i sensori/);
  p.state.phone = 'cal'; p.calView = { stage: 'gesture', want: 'L', ready: true, idx: 0, total: 2 };
  assert.equal(splitPlayerStatus(p, 'right').state, 'go'); assert.match(splitPlayerStatus(p, 'right').title, /Dritto/);
  assert.match(splitPlayerStatus(p, 'left').title, /Rovescio/, 'mancino: stesso gesto, colpo opposto');
  Object.assign(p, { ready: true, simple: true });
  assert.equal(splitPlayerStatus(p).state, 'ok'); assert.match(splitPlayerStatus(p).sub, /Senza calibrazione/);
  assert.equal(splitShotLabel({ kind: 'hit', grade: 'PERFECT • FOREHAND' }), 'Perfetto!');
  assert.equal(splitShotLabel({ kind: 'hit', grade: 'LATE' }), 'In ritardo');
  assert.equal(splitShotLabel({ kind: 'fault' }), null);
});

test('stesso schermo dal menu alla partita: due telefoni, calibrazione automatica, partita divisa, P2 che cade, menu', async () => {
  const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = { ...fakeLink(), ready: false, L: { state: 'connected', phone: 'cal' },
    cmd(c){ this.cmds.push(c); if (c === 'skip' || c === 'confirm'){ this.ready = true; this.L.phone = 'ready'; } if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } } };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect');
  assert.equal(ui.controller, 'phone');
  assert.equal(lobby.state().splitReady, false);
  // P1 e P2 con i sensori attivi: la calibrazione parte da sola sui due telefoni
  ui.split.paint();
  assert.ok(w.link.cmds.includes('cal'), 'calibrazione chiesta al P1'); assert.ok(l2.cmds.includes('cal'), 'calibrazione chiesta al P2');
  // verifica riuscita del P1: confermata da sola; quella del P2 non riesce tre volte → profilo semplice
  E.natpfPhone._onCal({ kind: 'review', pass: true });
  assert.ok(w.link.cmds.includes('confirm'));
  for (let i = 0; i < SPLIT_CAL_TRIES; i++) P2._onCal({ kind: 'review', pass: false, why: 'piccolo' });
  assert.ok(l2.cmds.includes('skip'), 'dopo tre verifiche non riuscite si gioca senza calibrazione');
  assert.equal(lobby.state().splitReady, true);
  lobby.next(); assert.equal(lobby.step, 'match');
  // mano del P2 (a parte) e «Gioca»
  ui.split.setHand('p2', 'left'); assert.equal(P2.hand, 'left');
  assert.equal(w.pressStart(), true);
  assert.equal(E.natpfSplit.active, true); assert.equal(E.isDoubles, false); assert.equal(E.isMultiplayer, true);
  // esito di un colpo del P2 sotto la sua metà
  E.motionController.triggerHapticFeedback({ role: 'p2', kind: 'hit', grade: 'PERFECT' });
  assert.equal(ui.split.labels.p2.text, 'Perfetto!');
  // telefono del P2 che cade a partita in corso: pausa, poi ripresa quando torna
  E.phase = 'RALLY'; l2.connected = false; l2.ready = false; l2.L = { state: 'lost', phone: null };
  w.advance(900);
  assert.ok(ui.split.hold, 'pausa per il telefono del P2'); assert.equal(E.natpfPaused, true);
  l2.connected = true; l2.ready = true; l2.L = { state: 'connected', phone: 'ready' };
  w.advance(4000);
  assert.equal(ui.split.hold, null); assert.equal(E.natpfPaused, false);
  // torna al menu: la sessione split finisce
  ui.backToMenu();
  assert.equal(E.natpfSplit.active, false); assert.equal(E.versus.active, false);
});

// Sessione del 29/10: a partita in corso lo schermo di un telefono si spegne, sul telefono «Ricalibra», calibrazione
// rifatta… e il telefono restava su «Guarda il computer e conferma»: la conferma automatica valeva solo nella pagina
// «Collega». Ora vale anche in partita, per tutti e due i telefoni, e il pannello del P1 non copre lo schermo diviso
test('stesso schermo: calibrazione rifatta a partita in corso (Ricalibra sul telefono) confermata da sola, si riprende', async () => {
  const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = { ...fakeLink(), ready: false, L: { state: 'connected', phone: 'cal' },
    cmd(c){ this.cmds.push(c); if (c === 'skip' || c === 'confirm'){ this.ready = true; this.L.phone = 'ready'; } if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } } };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint();
  E.natpfPhone._onCal({ kind: 'review', pass: true }); P2._onCal({ kind: 'review', pass: true });
  lobby.next(); assert.equal(w.pressStart(), true); assert.equal(E.natpfSplit.active, true);
  assert.equal(lobby.visible, false);
  for (const [who, phone, link] of [['P2', P2, l2], ['P1', E.natpfPhone, w.link]]){
    // schermo spento, poi «Ricalibra» sul telefono: il telefono è in calibrazione (non pronto), la partita in pausa
    E.phase = 'RALLY'; link.ready = false; link.L = { ...link.L, phone: 'cal' };
    w.advance(900);
    assert.equal(E.natpfPaused, true, `${who}: pausa durante la calibrazione`);
    const confirms = link.cmds.filter(c => c === 'confirm').length;
    phone._onCal({ kind: 'step', step: 'still' });
    assert.ok(ui.modal?.classList.contains('hidden') ?? true, `${who}: nessun pannello sopra lo schermo diviso`);
    phone._onCal({ kind: 'review', pass: true });
    assert.equal(link.cmds.filter(c => c === 'confirm').length, confirms + 1, `${who}: verifica confermata dal computer`);
    w.advance(4000);
    assert.equal(E.natpfPaused, false, `${who}: si riprende`);
  }
});

import { parseArea, screenArea, readScreen, SCREENS } from '../src/natpf/natpf_screen.js';

test('schermo: intero, ledwall 2×2 (1:1) e 3×2 (3:2) al centro, area esatta per il processore LED', () => {
  assert.deepEqual(screenArea({ preset: 'full' }, 1920, 1080), { x: 0, y: 0, w: 1920, h: 1080, full: true });
  assert.deepEqual(screenArea({ preset: '2x2' }, 1920, 1080), { x: 420, y: 0, w: 1080, h: 1080, full: false });
  assert.deepEqual(screenArea({ preset: '3x2' }, 1920, 1080), { x: 150, y: 0, w: 1620, h: 1080, full: false });
  assert.deepEqual(screenArea({ preset: '3x2' }, 1000, 1000), { x: 0, y: 167, w: 1000, h: 667, full: false }, 'finestra stretta: si adatta in larghezza');
  assert.deepEqual(parseArea('0,0,768,512'), { x: 0, y: 0, w: 768, h: 512 });
  assert.equal(parseArea('0,0,20,20'), null); assert.equal(parseArea('abc'), null);
  // area dal processore LED: vince sulla scelta, e non esce dalla finestra
  assert.deepEqual(screenArea({ preset: '2x2', area: { x: 0, y: 0, w: 768, h: 512 } }, 1920, 1080), { x: 0, y: 0, w: 768, h: 512, full: false });
  assert.deepEqual(screenArea({ area: { x: 1800, y: 0, w: 768, h: 512 } }, 1920, 1080).w, 1920 - 1800);
  assert.equal(readScreen('?schermo=2x2', 'full').preset, '2x2'); assert.equal(readScreen('?schermo=intero', '3x2').preset, 'full');
  assert.equal(readScreen('', '3x2').preset, '3x2'); assert.equal(readScreen('', 'boh').preset, 'full');
  assert.deepEqual(readScreen('?area=10,20,800,600', null).area, { x: 10, y: 20, w: 800, h: 600 });
  assert.equal(SCREENS['2x2'].ratio, 1); assert.equal(SCREENS['3x2'].ratio, 1.5);
});

test('stesso schermo: scegliere il 1v1 non crea una stanza in rete (la crea solo «Sfida un amico»)', async () => {
  const { E, lobby } = await makeWorld({ controller: 'phone' });
  let rooms = 0; E.createMultiplayerRoom = async () => { rooms++; return null; };
  lobby.setMode('split');
  E._onSelectDifficulty('1v1');
  assert.equal(rooms, 0);
  lobby.setMode('friend'); rooms = 0;
  E._onSelectDifficulty('1v1');
  assert.ok(rooms >= 1, 'sfida un amico: la stanza sì');
});

// Stesso schermo con una webcam per due (richiesta del 29/10 notte): niente telefoni; pronti quando la webcam vede le mani
// di tutti e due; in partita i colpi di sinistra vanno al P1 e quelli di destra al P2, e non c'è la pausa del telefono
// del P2 (non c'è). Corsie della webcam: src/natpf/webcam_duo.js (natpf-webcam-duo.test.mjs)
test('stesso schermo con una webcam per due: scelta ricordata, pronti con le due mani viste, partita senza telefoni', async () => {
  const { DuoTracker } = await import('../src/natpf/webcam_duo.js');
  const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w, mc = E.motionController;
  mc.setWebcamDuo = on => { on = !!on; if (mc.webcamDuo === on) return; mc.webcamDuo = on; mc._duo = new DuoTracker(); };   // come quello vero
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  P2.link = { ...fakeLink(), connected: false, ready: false, L: { state: 'waiting', phone: null } };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect');
  ui.split.setInput('webcam');
  for (let i = 0; i < 3; i++) await Promise.resolve();
  assert.equal(ui.controller, 'webcam'); assert.equal(mc.webcamDuo, true); assert.equal(mc.webcamActive, true);
  assert.equal(lobby.state().splitReady, false, 'la webcam non ha ancora visto le mani');
  // le due mani viste dalla webcam (centro della mano: P1 a sinistra, P2 a destra)
  const hand = (S, y = .55) => { const a = Array.from({ length: 21 }, () => ({ x: 1 - S, y, z: 0 })); a[0] = { x: 1 - S, y: y - .05, z: 0 }; a[9] = { x: 1 - S, y: y + .04, z: 0 }; return a; };
  mc._duo.hands([hand(.3)], performance.now());
  assert.equal(lobby.state().splitReady, false, 'solo il P1');
  mc._duo.hands([hand(.3), hand(.75)], performance.now());
  assert.equal(lobby.state().splitReady, true);
  lobby.next(); assert.equal(lobby.step, 'match');
  assert.equal(w.pressStart(), true);
  assert.equal(E.natpfSplit.active, true);
  // a partita in corso il telefono del P2 non c'è: nessuna pausa per lui
  E.phase = 'RALLY'; w.advance(2000);
  assert.ok(!ui.split.hold && !E.natpfPaused, 'nessuna pausa');
  // il colpo della webcam per il P2 arriva al P2 (servizio del P2: il suo gesto lancia la palla)
  E._setupPointServe({ showBanner: false }); E.score.server = 'opponent'; E._setupPointServe({ showBanner: false });
  mc._emitP2Swing({ source: 'webcam', side: 'forehand', shotType: 'topspin', speed: 1.3, dirX: -.4, dirY: -.2 });
  assert.equal(E.phase, 'SERVE_TOSS');
  // la scelta resta: tornando ai telefoni la webcam per due si spegne
  ui.backToMenu(); lobby.go('mode'); lobby.setMode('split');
  assert.equal(ui.split.input, 'webcam');
  ui.split.setInput('phones'); assert.equal(mc.webcamDuo, false); assert.equal(ui.controller, 'phone');
});
