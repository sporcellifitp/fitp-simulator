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
  // colpo verso il punto più alto del lancio: servizio del P2 dal gesto, con le regole del P1 (un gesto nella salita, oltre
  // NO.SERVE.ignoreBefore prima del colmo, fa ancora parte del lancio). Prima a 0,3 s: il P2 batteva con qualunque gesto
  let t = 0; while (E.phaseTimer < 0.55 && t++ < 400) E.update(1/120);
  P2._onSwing({ dir: 1, power: .9, peak: 700, at: performance.now()/1000 - .03 });
  for (let i = 0; i < 60 && E.phase === 'SERVE_TOSS'; i++) E.update(1/60);
  assert.equal(E.phase, 'RALLY'); assert.equal(E.ball.lastHitter, 'opponent', 'ha servito il P2');
  assert.ok(E.natpfLastServe && Number.isFinite(E.natpfLastServe.tau), 'servizio dal gesto (natpfLastServe)');
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
import { splitPlayerStatus, SPLIT_CAL_TRIES, splitCamLine } from '../src/natpf/natpf_split_ui.js';

test('webcam per due: la linea nel riquadro della camera segue il confine tra le corsie (prima fissa a metà)', () => {
  assert.equal(splitCamLine(.5), '50.0%'); assert.equal(splitCamLine(.62), '62.0%'); assert.equal(splitCamLine(.3), '30.0%');
  assert.equal(splitCamLine(undefined), '50.0%'); assert.equal(splitCamLine(NaN), '50.0%'); assert.equal(splitCamLine(Infinity), '50.0%');
});

test('menu: «Stesso schermo» va da modalità a telefoni a partita, e si prosegue con i due telefoni pronti', () => {
  assert.deepEqual(progressSteps('split').map(([id]) => id), ['mode', 'connect', 'match']);
  assert.equal(previousStep('connect', 'split'), 'mode'); assert.equal(previousStep('connect', 'cpu'), 'controller');
  assert.equal(stepReady('connect', { mode: 'split', controller: 'phone', phoneLinked: true, splitReady: false }), false, 'un solo telefono non basta');
  assert.equal(stepReady('connect', { mode: 'split', splitReady: true }), true);
  assert.equal(autoAdvance('connect', { mode: 'split', controller: 'phone', phoneLinked: true, splitReady: false }), false);
  // B9 (05/11): niente salto muto a «Partita» dopo 0,7 s; con i due pronti c'è il conto alla rovescia (natpf_split_ui)
  assert.equal(autoAdvance('connect', { mode: 'split', splitReady: true }), false, 'niente salto automatico a «Partita»');
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
});

test('stesso schermo dal menu alla partita: due telefoni, calibrazione automatica, partita divisa, P2 che cade, menu', async () => {
  const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = { ...fakeLink(), ready: false, L: { state: 'connected', phone: 'cal' },
    cmd(c){ this.cmds.push(c); if (c === 'skip' || c === 'confirm'){ this.ready = true; this.L.phone = 'ready'; } if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } } };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect');
  assert.equal(ui.controller, 'phone');
  assert.equal(lobby.state().splitReady, false);
  // P1 e P2 collegati: prima il tutorial di ciascuno nella sua metà (04/11), i telefoni aspettano «ho capito»
  ui.split.paint();
  assert.ok(ui.split.tutOpen.p1 && ui.split.tutOpen.p2, 'tutorial aperto nelle due metà');
  assert.ok(ui.split.tut.p1.open && ui.split.tut.p2.open);
  assert.ok(E.natpfPhone.tutWait && P2.tutWait, 'i due telefoni aspettano');
  assert.ok(!w.link.cmds.includes('cal') && !l2.cmds.includes('cal'), 'nessuna calibrazione prima di «ho capito»');
  // ciascuna metà ha la sua animazione (Canvas 2D, B9 ramo C): niente più «animazione a una sola metà»
  assert.notEqual(ui.split.tut.p1.demo(), ui.split.tut.p2.demo(), 'un\'animazione per metà');
  assert.equal(ui.split.demoOwner, undefined);
  // «Tutto chiaro, ho capito» sul telefono del P1: si chiude solo la sua metà e parte solo la sua calibrazione
  for (const fn of E.natpfPhone.tutListeners) fn({ ok: true });
  ui.split.paint();
  assert.ok(!ui.split.tutOpen.p1 && ui.split.tutOpen.p2, 'il P2 continua il suo tutorial');
  assert.ok(w.link.cmds.includes('cal'), 'calibrazione chiesta al P1'); assert.ok(!l2.cmds.includes('cal'), 'il P2 non è disturbato');
  assert.ok(ui.split.tut.p2.open && ui.split.tut.p2.demo() === ui.split.tut.p2.demo(), 'il P2 tiene la sua animazione');
  for (const fn of P2.tutListeners) fn({ ok: true });
  ui.split.paint();
  assert.ok(!ui.split.tutOpen.p2 && !P2.tutWait); assert.ok(l2.cmds.includes('cal'), 'calibrazione chiesta al P2');
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
  // esito di un colpo del P2 nell'angolo in basso della sua metà (a destra), una scritta sola: l'etichetta della metà
  // dice solo chi gioca (B10, prima l'esito c'era due volte, sopra la testa e sotto la metà)
  E.hud.showTimingPopup({ grade: 'P2 PERFECT \u2022 FOREHAND TOPSPIN!', detail: '120 KM/H', screenPos: { x: 640, y: 300, visible: true } });
  const pop = document.getElementById('timing-popup');
  assert.ok(pop.classList.contains('anchored') && pop.classList.contains('side-right') && !pop.classList.contains('other'), 'P2 a destra, come un colpo suo');
  assert.equal(pop.style.top, '', 'non più sopra la testa di chi colpisce');
  E.hud.showTimingPopup({ grade: 'PERFECT \u2022 FOREHAND TOPSPIN!', detail: '120 KM/H', screenPos: { x: 640, y: 300, visible: true } });
  assert.ok(!pop.classList.contains('side-right'), 'P1 a sinistra');
  ui.split.tick();
  assert.equal(document.getElementById('natpf-split-hud').querySelector('[data-split-tag="p2"] span').textContent, '');
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
  // tutorial già visto dai due (qui conta la partita): con il tutorial aperto «Gioca» non parte (bothReady come le schede)
  E.natpfPhone.markTutorialSeen(); P2.markTutorialSeen();
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

// B9 (05/11): nello stesso schermo ogni metà ha la sua modale con le frecce; l'avanzamento va al telefono di quel
// giocatore (pulsante acceso dopo l'ultima scheda); le frecce di un telefono sfogliano solo la sua metà; un telefono che
// cade a tutorial aperto ritrova la scheda raggiunta; un telefono già pronto non viene ricalibrato; il P1 che ha visto il
// tutorial nell'Allenamento non lo rivede; tastiera A/D (metà sinistra) e ← → (metà destra). B16 (decisione dell'utente
// dell'08/11 sera): prima della partita il tutorial corto, 5 schede (presa, posizione, dritto, rovescio, servizio), per
// ciascuno dei due telefoni
test('stesso schermo: tutorial indipendenti con le frecce, avanzamento a ciascun telefono, ricollegamento, già visto', async () => {
  const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w;
  const P1 = E.natpfPhone, P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = { ...fakeLink(), ready: true, L: { state: 'connected', phone: 'ready' } };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect');
  ui.split.paint();
  assert.ok(ui.split.tutOpen.p1 && ui.split.tutOpen.p2);
  const tp = link => link.sent.filter(m => m.t === 'tp').at(-1);
  const nav = (P, d) => P._onTut({ nav: d, v: 2 }), ok = P => P._onTut({ ok: true, v: 2 });
  P1._onTut({ wait: true, v: 2 }); P2._onTut({ wait: true, v: 2 });
  assert.equal(tp(w.link).i, 0); assert.equal(tp(l2).i, 0);
  // tutorial corto in tutte e due le metà: 5 schede, le prime 5 del tutorial completo; il telefono lo sa da n
  const N = ui.split.tut.p2.state.cards;
  assert.equal(N, 5); assert.equal(ui.split.tut.p1.state.cards, 5); assert.equal(tp(w.link).n, 5); assert.equal(tp(l2).n, 5);
  assert.deepEqual(ui.split.tut.p2.cards.map(c => c.id), ['grip', 'ready', 'forehand', 'backhand', 'serve']);
  // il P2 sfoglia dal suo telefono: si muove solo la metà destra
  w.advance(1200); nav(P2, 1); nav(P2, 1);
  assert.equal(ui.split.tut.p2.state.idx, 2); assert.equal(ui.split.tut.p1.state.idx, 0, 'la metà del P1 non si muove');
  assert.equal(tp(l2).i, 2); assert.equal(tp(w.link).i, 0);
  // tastiera: A/D per la metà sinistra, frecce per la destra
  w.key('KeyD'); assert.equal(ui.split.tut.p1.state.idx, 1); w.key('ArrowRight'); assert.equal(ui.split.tut.p2.state.idx, 3);
  w.key('KeyA'); assert.equal(ui.split.tut.p1.state.idx, 0);
  // un «ok» prima dell'ultima scheda non chiude
  ok(P2); assert.ok(ui.split.tutOpen.p2, 'prima dell\'ultima scheda non si chiude');
  // il telefono del P2 cade a tutorial aperto: la metà torna al QR; ricollegato (stesso abbinamento) riparte dalla scheda 4
  w.advance(1200);
  l2.connected = false; l2.ready = false; l2.L = { state: 'lost', phone: null }; ui.split.paint();
  assert.ok(!ui.split.tutOpen.p2 && !ui.split.tut.p2.open, 'telefono caduto: la metà mostra di nuovo il QR');
  l2.connected = true; l2.ready = true; l2.L = { state: 'connected', phone: 'ready', joins: 2 }; ui.split.paint();
  assert.ok(ui.split.tutOpen.p2); assert.equal(ui.split.tut.p2.state.idx, 3, 'riparte dalla scheda raggiunta'); assert.ok(ui.split.tut.p2.state.visited.has(3) && !ui.split.tut.p2.state.visited.has(2), 'schede viste ricordate (la 3 sì, la 2 passata di fila no)');
  for (let i = 3; i < N; i++){ w.advance(1200); if (i < N - 1) nav(P2, 1); }
  assert.equal(tp(l2).all, 0, 'le schede 1 e 2 passate di fila non contano');
  // indietro fino alla 2 e alla 1, guardate: tutte viste
  for (let i = 0; i < N - 3; i++) nav(P2, -1);
  w.advance(1200); nav(P2, -1); w.advance(1200);
  assert.equal(ui.split.tut.p2.state.idx, 1); assert.equal(tp(l2).all, 1);
  // P2 già pronto: «poi sei pronto», e dopo «ho capito» nessuna calibrazione
  assert.match(ui.split.tut.p2.root.querySelector('.tut-wait').textContent, /tuo telefono.*sei pronto/);
  const cmdsBefore = l2.cmds.length;
  ok(P2); ui.split.paint();
  assert.ok(!ui.split.tutOpen.p2 && P2.tutorialSeen); assert.equal(l2.cmds.length, cmdsBefore, 'telefono già pronto: nessuna calibrazione');
  assert.ok(ui.split.tutOpen.p1, 'il P1 continua il suo tutorial');
  // il P2 si ricollega (schermo spento, pagina ricaricata): niente tutorial
  l2.L = { ...l2.L, joins: 3 }; ui.split.paint(); assert.ok(!ui.split.tutOpen.p2);
  // abbinamento nuovo del P2 (QR): di nuovo
  l2.L = { ...l2.L, pairs: 1, joins: 4 }; ui.split.paint(); assert.ok(ui.split.tutOpen.p2);
  ui.split.closeTutorials();
  // P1 che ha già visto il tutorial (Allenamento, stesso abbinamento): non lo rivede nello stesso schermo
  P1.markTutorialSeen(); ui.split.paint(); assert.ok(!ui.split.tutOpen.p1);
  // chiosco: il visitatore dopo lo rivede
  ui.kiosk?.reset?.(); assert.ok(!P1.tutorialSeen && !P2.tutorialSeen);
});

test('stesso schermo: lo stato della metà dice che si sta guardando il tutorial', async () => {
  const { splitPlayerStatus } = await import('../src/natpf/natpf_split_ui.js');
  const p = { link: {}, state: { state: 'connected', phone: 'tut' }, connected: true, ready: false, tutWait: true, tutProgress: { i: 3, n: 5, s: 4, all: false } };
  assert.match(splitPlayerStatus(p).title, /Guarda il tutorial/); assert.match(splitPlayerStatus(p).sub, /4 di 5/);
  p.tutProgress = { i: 4, n: 5, s: 5, all: true }; assert.match(splitPlayerStatus(p).sub, /Tutto chiaro/);
});

// ---------------------------------------------------------------------------------------------------------------------
// «Pronto» per giocatore e conto alla rovescia (B9, punto 4; natpf_ready.js, natpf_split_ui._tickStart). Prima: nessuno
// stato per giocatore e un salto muto a «Partita» dopo 0,7 s, dove «Gioca» restava giallo e attivo anche con un telefono
// caduto. Ora: schede con nome e stato, conto di 3 s sul computer e sui telefoni, partita senza toccare il computer,
// conto annullato (con il motivo) se un telefono cade, «Aspetta» / Esc, «Gioca» spento nella pagina «Partita».
import { $, visible } from './ui-world.mjs';
import { SPLIT_COUNTDOWN_MS, SPLIT_TYPING_MS, SPLIT_BACK_DROP_MS } from '../src/natpf/natpf_split_ui.js';

async function splitLobby({ names = ['Giulia', 'Marco'] } = {}){
  const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = { ...fakeLink(), ready: false, L: { state: 'connected', phone: 'cal' },
    cmd(c){ this.cmds.push(c); if (c === 'skip' || c === 'confirm'){ this.ready = true; this.L.phone = 'ready'; } if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } } };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect');
  [E.natpfSplitNames.p1, E.natpfSplitNames.p2] = names;
  ui.split.paint();
  const okTut = phone => { for (const fn of phone.tutListeners) fn({ ok: true }); ui.split.paint(); };
  // tutti e due: «Tutto chiaro, ho capito» e calibrazione riuscita
  const readyBoth = () => { okTut(E.natpfPhone); okTut(P2); E.natpfPhone._onCal({ kind: 'review', pass: true }); P2._onCal({ kind: 'review', pass: true }); };
  const counts = link => link.sent.filter(m => m.t === 'ev' && m.k === 'count');
  return { ...w, P2, l2, okTut, readyBoth, counts };
}

test('stesso schermo: schede con il nome e lo stato (tutorial, calibrazione, pronto); niente salto a «Partita»', async () => {
  const { E, ui, lobby, P2, okTut, advance } = await splitLobby();
  // collegati, tutorial aperto: «si prepara · Tutorial 1/n» (prima: «Tocca «Attiva i sensori»» con i sensori attivi)
  assert.equal(ui.split.status('p1').state, 'tut');
  let s1 = ui.split.slot('p1');
  assert.equal(s1.name, 'Giulia'); assert.equal(s1.state, 'prep'); assert.match(s1.detail, /^Tutorial 1\/\d+$/);
  assert.equal(ui.split.slot('p2').name, 'Marco');
  assert.equal($('split-status-p1').dataset.state, 'tut');
  // P1: «ho capito» e calibrazione riuscita → pronto subito; il P2 è ancora nel tutorial: nessun conto
  okTut(E.natpfPhone); E.natpfPhone._onCal({ kind: 'review', pass: true });
  s1 = ui.split.slot('p1');
  assert.equal(s1.state, 'ready'); assert.equal(s1.badge, 'Pronto'); assert.equal(s1.detail, 'Calibrato');
  advance(1500);
  assert.equal(ui.split.cd.running, false, 'nessun conto con il P2 nel tutorial');
  assert.equal($('split-ready-bar').dataset.readyBar, 'wait');
  assert.match($('split-ready-bar').querySelector('[data-ready-bar-sub]').textContent, /^Aspetto Marco \(tutorial \d+\/\d+\)\.$/);
  // P2 in calibrazione: «si prepara · Calibrazione»
  okTut(P2);
  assert.deepEqual([ui.split.slot('p2').state, ui.split.slot('p2').detail], ['prep', 'Calibrazione']);
  assert.ok(!visible('split-countdown'));
  // con il P2 pronto si resta nella pagina «Collega» (prima: «Partita» da soli dopo 0,7 s)
  P2._onCal({ kind: 'review', pass: true });
  advance(900);
  assert.equal(lobby.step, 'connect', 'niente salto a «Partita»');
  assert.equal(lobby.state().splitReady, true);
});

test('stesso schermo: tutti e due pronti → conto di 3 s sul computer e sui telefoni, poi si gioca senza toccare il computer', async () => {
  const { E, ui, lobby, link, l2, readyBoth, counts, advance } = await splitLobby();
  assert.equal(SPLIT_COUNTDOWN_MS, 3000);
  readyBoth(); advance(150);
  assert.equal(ui.split.cd.running, true); assert.equal(ui.split.cd.left, 3);
  assert.ok(visible('split-countdown'), 'conto grande al centro');
  assert.equal($('split-countdown').querySelector('[data-split-count]').textContent, '3');
  assert.equal($('split-countdown').querySelector('[data-split-count-names]').textContent, 'Giulia e Marco, tenete il telefono come in partita.');
  assert.equal($('split-ready-bar').dataset.readyBar, 'count');
  assert.equal($('split-ready-bar').querySelector('[data-ready-bar-title]').textContent, 'Tutto pronto: si gioca tra 3');
  assert.ok(!$('split-ready-bar').querySelector('[data-split-hold]').classList.contains('hidden'), '«Aspetta» in vista');
  // il conto parte al primo controllo (ogni 100 ms) dopo che sono pronti: 1100 ms bastano per qualunque fase del controllo
  advance(1100); assert.equal(ui.split.cd.left, 2);
  assert.equal($('split-countdown').querySelector('[data-split-count]').textContent, '2');
  advance(1000); assert.equal(ui.split.cd.left, 1);
  assert.ok(!E.natpfSplit?.active, 'non ancora');
  advance(1000);
  assert.equal(E.natpfSplit?.active, true, 'si gioca da soli: sessione split avviata dal «Gioca» della lobby');
  assert.ok(!visible('split-countdown'));
  // i due telefoni hanno avuto 3, 2, 1 e «si gioca» (0), una volta ciascuno
  for (const l of [link, l2]) assert.deepEqual(counts(l).map(m => m.n), [3, 2, 1, 0]);
  advance(4000);
  assert.deepEqual(counts(link).map(m => m.n), [3, 2, 1, 0], 'una volta sola');
  assert.equal(lobby.mode, 'split');
  // dopo la partita, di nuovo nella pagina dei telefoni con tutti e due pronti: il conto riparte da 3 (prova nel browser:
  // restava «già scattato» e non ripartiva)
  ui.backToMenu(); lobby.go('mode'); lobby.setMode('split'); lobby.go('connect');
  assert.ok(!E.natpfSplit?.active);
  advance(150);
  assert.equal(ui.split.cd.running, true); assert.equal(ui.split.cd.left, 3);
});

test('stesso schermo: un telefono che cade durante il conto lo annulla e la barra dice perché; quando torna si riparte da 3', async () => {
  const { E, ui, lobby, link, l2, P2, readyBoth, counts, advance } = await splitLobby();
  readyBoth(); advance(1300);
  assert.equal(ui.split.cd.left, 2);
  // il telefono di Marco si scollega
  Object.assign(l2, { connected: false, ready: false, L: { state: 'lost', phone: null } }); P2._changed();
  advance(150);
  assert.equal(ui.split.cd.running, false); assert.ok(!visible('split-countdown'));
  assert.equal(ui.split.cd.why, 'Conto annullato · Marco: telefono scollegato');
  const s2 = ui.split.slot('p2');
  assert.equal(s2.state, 'ko'); assert.equal(s2.badge, 'Scollegato', 'la scheda dice perché');
  assert.equal($('split-ready-bar').dataset.readyBar, 'cancel');
  assert.equal($('split-ready-bar').querySelector('[data-ready-bar-title]').textContent, 'Conto annullato · Marco: telefono scollegato');
  const stop = counts(link).at(-1);
  assert.equal(stop.stop, 1); assert.match(stop.txt, /Marco: telefono scollegato/, 'il telefono di Giulia lo sa');
  assert.equal(stop.soft, undefined, 'un problema: anello rosso sul telefono');
  advance(5000);
  assert.ok(!E.natpfSplit?.active, 'nessuna partita'); assert.equal(lobby.step, 'connect');
  // il telefono torna pronto: il conto riparte da capo (3), e poi si gioca
  Object.assign(l2, { connected: true, ready: true, L: { state: 'connected', phone: 'ready' } }); P2._changed();
  advance(150);
  assert.equal(ui.split.cd.running, true); assert.equal(ui.split.cd.left, 3); assert.equal(ui.split.cd.why, null);
  advance(3000);
  assert.equal(E.natpfSplit?.active, true);
});

test('stesso schermo: «Aspetta» (Esc) ferma il conto e non riparte da solo; «Gioca» nella barra fa partire', async () => {
  const { E, ui, lobby, link, readyBoth, counts, advance, key } = await splitLobby();
  readyBoth(); advance(600);
  assert.equal(ui.split.countdownRunning, true);
  key('Escape', 'Escape');
  assert.equal(lobby.step, 'connect', 'Esc durante il conto non torna indietro');
  assert.equal(ui.split.cd.running, false); assert.equal(ui.split.cd.held, true);
  assert.match(counts(link).at(-1).txt, /fermata/); assert.equal(counts(link).at(-1).soft, 1, 'fermato sul computer: anello neutro sul telefono');
  advance(6000);
  assert.ok(!E.natpfSplit?.active, 'fermo finché non si preme «Gioca»');
  assert.equal($('split-ready-bar').dataset.readyBar, 'held');
  assert.ok(!$('split-ready-bar').querySelector('[data-split-play]').classList.contains('hidden'), '«Gioca» nella barra');
  ui.split.playNow();
  assert.equal(E.natpfSplit?.active, true);
  // Esc senza conto: indietro come sempre
  const w2 = await splitLobby();
  w2.key('Escape', 'Escape'); assert.equal(w2.lobby.step, 'mode');
});

test('stesso schermo, pagina «Partita»: schede dal vivo, «Gioca» grigio e spento con un telefono non pronto; il conto si ferma', async () => {
  const { E, ui, lobby, link, l2, P2, readyBoth, counts, advance } = await splitLobby();
  readyBoth(); advance(600);
  assert.equal(ui.split.countdownRunning, true);
  // «Impostazioni partita ›»: il conto si ferma, i telefoni lo sanno
  lobby.next(); assert.equal(lobby.step, 'match');
  advance(400);
  assert.equal(ui.split.cd.running, false); assert.match(counts(link).at(-1).txt, /impostazioni/); assert.equal(counts(link).at(-1).soft, 1);
  advance(4000); assert.ok(!E.natpfSplit?.active, 'nella pagina «Partita» si parte con «Gioca»');
  const board = $('split-ready-board');
  assert.match(board.innerHTML, /data-ready-slot="p1"/);
  assert.equal(board.querySelector('[data-ready-slot="p2"]').dataset.ready, 'ready');
  assert.equal(board.querySelector('[data-ready-slot="p2"]').querySelector('[data-ready-name]').textContent, 'Marco');
  assert.equal($('btn-start-match').disabled, false); assert.ok(!$('btn-start-match').classList.contains('is-wait'));
  assert.match($('lobby-match-note').textContent, /^Giulia a sinistra, Marco a destra/);
  // il telefono di Marco cade: «Gioca» spento e grigio, la scheda e la nota dicono perché
  Object.assign(l2, { connected: false, ready: false, L: { state: 'lost', phone: null } }); P2._changed();
  advance(400);
  assert.equal($('btn-start-match').disabled, true); assert.ok($('btn-start-match').classList.contains('is-wait'));
  assert.equal(board.querySelector('[data-ready-slot="p2"]').dataset.ready, 'ko');
  assert.match($('lobby-match-note').textContent, /^Aspetto Marco \(telefono scollegato\): servono i due telefoni pronti/);
  // Invio: si torna alle schede dei telefoni (prima: «Gioca» giallo e attivo)
  lobby.next(); assert.equal(lobby.step, 'connect');
  // altre modalità: «Gioca» di nuovo normale
  lobby.go('mode'); lobby.setMode('cpu'); lobby.go('match');
  assert.equal($('btn-start-match').disabled, false); assert.ok(!$('btn-start-match').classList.contains('is-wait'));
});

// Revisione B9 (06/11), minore a: tornando con «‹ Indietro» dalla pagina «Partita» con tutti e due già pronti il conto non
// riparte da solo (prima ripartiva subito e il riquadro copriva nomi e mano): «Tutto pronto · premi «Gioca»»; riparte da
// solo se lo stato dei telefoni cambia; entrando in avanti (dopo una partita) sì. Mentre si scrive un nome non corre
test('stesso schermo: «‹ Indietro» da «Partita» con i due pronti → nessun conto da solo; riparte se un telefono cambia o con «Gioca»', async () => {
  const { E, ui, lobby, l2, P2, readyBoth, advance } = await splitLobby();
  readyBoth(); advance(600);
  assert.equal(ui.split.countdownRunning, true);
  lobby.next(); assert.equal(lobby.step, 'match'); advance(300);
  lobby.back(); assert.equal(lobby.step, 'connect');
  advance(4000);
  assert.equal(ui.split.cd.running, false, 'nessun conto tornando indietro'); assert.ok(!E.natpfSplit?.active);
  assert.equal($('split-ready-bar').dataset.readyBar, 'held');
  assert.equal($('split-ready-bar').querySelector('[data-ready-bar-sub]').textContent, 'Premi «Gioca» quando volete.');
  assert.ok(!$('split-ready-bar').querySelector('[data-split-play]').classList.contains('hidden'), '«Gioca» nella barra');
  // anche subito, senza un controllo in mezzo (Invio e Esc di fila)
  lobby.next(); lobby.back(); advance(1500); assert.equal(ui.split.cd.running, false);
  // una transizione momentanea di un telefono (meno di SPLIT_BACK_DROP_MS) non cambia lo stato: niente conto da solo
  // (prova nel browser instabile sotto carico, 06/11)
  Object.assign(l2, { ready: false, L: { state: 'connected', phone: 'cal' } }); P2._changed(); advance(300);
  Object.assign(l2, { ready: true, L: { state: 'connected', phone: 'ready' } }); P2._changed(); advance(1500);
  assert.equal(ui.split.cd.running, false, 'transizione momentanea: nessun conto'); assert.equal(ui.split.cd.back, true);
  assert.equal($('split-ready-bar').dataset.readyBar, 'held');
  // il telefono di Marco cade (per più di SPLIT_BACK_DROP_MS) e torna pronto: lo stato è cambiato, il conto riparte da solo
  Object.assign(l2, { connected: false, ready: false, L: { state: 'lost', phone: null } }); P2._changed(); advance(SPLIT_BACK_DROP_MS + 200);
  assert.equal(ui.split.cd.back, false);
  Object.assign(l2, { connected: true, ready: true, L: { state: 'connected', phone: 'ready' } }); P2._changed(); advance(150);
  assert.equal(ui.split.cd.running, true); assert.equal(ui.split.cd.left, 3);
  advance(3000); assert.equal(E.natpfSplit?.active, true);
  // di nuovo indietro: «Gioca» nella barra fa partire
  ui.backToMenu(); lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); advance(150);
  assert.equal(ui.split.cd.running, true, 'in avanti (dopo una partita) il conto riparte');
  lobby.next(); advance(200); lobby.back(); advance(1000);
  assert.equal(ui.split.cd.running, false);
  ui.split.playNow(); assert.equal(E.natpfSplit?.active, true);
});

// Sotto carico (prova nel browser natpf-split-ready, 06/11) un telefono può passare per «non pronto» per un attimo proprio
// mentre si è nella pagina «Partita» o al momento di tornare: «‹ Indietro» resta (nessun conto da solo)
test('stesso schermo: «‹ Indietro» resta con un telefono «non pronto» per un attimo nella pagina «Partita» o all\'arrivo', async () => {
  const { E, ui, lobby, l2, P2, readyBoth, advance } = await splitLobby();
  const blip = (ms) => { Object.assign(l2, { ready: false, L: { state: 'connected', phone: 'cal' } }); P2._changed(); lobby.paint?.(); advance(ms); Object.assign(l2, { ready: true, L: { state: 'connected', phone: 'ready' } }); P2._changed(); };
  readyBoth(); advance(600);
  lobby.next(); assert.equal(lobby.step, 'match'); advance(300);
  blip(200); lobby.paint?.(); advance(200);
  lobby.back(); advance(3500);
  assert.equal(ui.split.cd.running, false, 'transizione nella pagina «Partita»: nessun conto'); assert.ok(!E.natpfSplit?.active);
  assert.equal($('split-ready-bar').dataset.readyBar, 'held');
  // transizione proprio al momento di tornare
  lobby.next(); advance(300);
  Object.assign(l2, { ready: false, L: { state: 'connected', phone: 'cal' } }); P2._changed();
  lobby.back(); advance(250);
  Object.assign(l2, { ready: true, L: { state: 'connected', phone: 'ready' } }); P2._changed(); advance(3500);
  assert.equal(ui.split.cd.running, false, 'transizione all\'arrivo: nessun conto'); assert.ok(!E.natpfSplit?.active);
  assert.equal($('split-ready-bar').dataset.readyBar, 'held');
  // un «non pronto» lungo nella pagina «Partita»: tornando, il conto parte da solo
  lobby.next(); advance(300);
  Object.assign(l2, { ready: false, L: { state: 'connected', phone: 'cal' } }); P2._changed(); lobby.paint?.(); advance(SPLIT_BACK_DROP_MS + 300); lobby.paint?.();
  Object.assign(l2, { ready: true, L: { state: 'connected', phone: 'ready' } }); P2._changed();
  lobby.back(); advance(150);
  assert.equal(ui.split.cd.running, true, 'stato cambiato davvero: il conto riparte');
});

test('stesso schermo: mentre si scrive un nome il conto non corre; finito il nome parte (anche con il cursore ancora lì)', async () => {
  const { ui, readyBoth, advance } = await splitLobby();
  let focus = true;
  const had = Object.getOwnPropertyDescriptor(document, 'activeElement');
  Object.defineProperty(document, 'activeElement', { configurable: true, get: () => focus ? { matches: q => q === '.split-name-input' } : null });
  try {
    readyBoth();
    // un tasto ogni 400 ms per 4 s: il conto non corre
    for (let i = 0; i < 10; i++){ ui.split._typedAt = performance.now(); advance(400); }
    assert.equal(ui.split.cd.running, false, 'nessun conto mentre si scrive');
    assert.equal($('split-ready-bar').dataset.readyBar, 'ready');
    assert.equal($('split-ready-bar').querySelector('[data-ready-bar-sub]').textContent, 'Si parte quando finisci di scrivere il nome.');
    // smesso di scrivere, il cursore resta nel campo: dopo SPLIT_TYPING_MS il conto parte
    advance(SPLIT_TYPING_MS + 200);
    assert.equal(ui.split.cd.running, true); assert.equal(ui.split.cd.left, 3);
    // campo lasciato: come sempre
    focus = false; ui.split.holdCountdown(); ui.split.cd.held = false; advance(150);
    assert.equal(ui.split.cd.running, true);
  } finally { if (had) Object.defineProperty(document, 'activeElement', had); else delete document.activeElement; }
});

// ---------------------------------------------------------------------------------------------------------------------
// Revisione B9 (06/11), bloccante del ramo A: nello stesso schermo un telefono che cade e si ricollega con il suo
// tutorial aperto lo perdeva (segnato come visto senza «Tutto chiaro» e calibrazione partita da sola). Il telefono finto
// qui sotto risponde come la pagina vera (racchetta.js, phone-screen.js), con i messaggi consegnati dopo (rete): un cfg
// senza tut a tutorial aperto chiude il cancello e, con i sensori in attesa, fa partire la calibrazione (cal step); un
// cfg con tut riapre il cancello e risponde «so aspettare» (tut w, v 2). Prima il telefono finto si ricollegava «ready»
// e non rispondeva: il test passava per il motivo sbagliato
function phonePage(P, link){
  const ph = { gate: null, sensor: 'idle', q: [], steps: 0 };
  const send0 = link.send.bind(link);
  link.send = m => {
    send0(m);
    if (m.t !== 'cfg') return;
    ph.q.push(() => {
      const was = ph.gate; ph.gate = m.tut ? (was || { v: m.tv >= 2 ? 2 : 1 }) : null;
      if (ph.gate){ if (!was && ph.sensor === 'cal') ph.sensor = 'idle'; ph.q.push(() => P._onTut({ wait: 1, v: 2 })); }
      else if (was && ph.sensor === 'idle'){ ph.sensor = 'cal'; link.L = { ...link.L, phone: 'cal' }; ph.steps++; ph.q.push(() => P._onCal({ kind: 'step', step: 'still' })); }
    });
  };
  // consegna dei messaggi in coda (anche quelli nati dalle risposte), nell'ordine
  ph.flush = () => { for (let k = 0; k < 20 && ph.q.length; k++) for (const f of ph.q.splice(0)) f(); };
  return ph;
}
// collegamento del telefono che cambia (link.js 'change'): come natpf_phone_racket._start
const linkChange = P => { P._sendGrip(); P._changed(); };

for (const how of ['ricollegamento («Ricollega», stessa pagina)', 'collegamento perso davvero (ripresa con la chiave)']){
  test(`stesso schermo: telefono che cade a tutorial aperto (${how}) → la metà riprende dalla scheda, niente calibrazione da sola`, async () => {
    const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w;
    const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
    const l2 = P2.link = { ...fakeLink(), ready: false, L: { state: 'connected', phone: 'tut', joins: 1, pairs: 1 } };
    const ph = phonePage(P2, l2);
    lobby.go('mode'); lobby.setMode('split'); lobby.go('connect');
    linkChange(P2); ph.flush(); ui.split.paint(); ph.flush();
    assert.ok(ui.split.tutOpen.p2 && P2.tutWait && P2.tutSupported && P2.tutV2, 'tutorial aperto, telefono che sa aspettare');
    // il P2 arriva alla scheda 4 dal suo telefono
    for (let k = 0; k < 3; k++){ w.advance(1200); P2._onTut({ nav: 1, v: 2 }); }
    assert.equal(ui.split.tut.p2.state.idx, 3);
    // il telefono cade
    Object.assign(l2, { connected: false, ready: false, L: { ...l2.L, state: 'lost', phone: null } }); linkChange(P2); ph.flush();
    assert.ok(!ui.split.tutOpen.p2, 'la metà torna al QR');
    assert.ok(P2.tutWait, 'il telefono caduto aspetta ancora il tutorial (come nell’Allenamento)');
    w.advance(2000);
    // si ricollega (stesso abbinamento): sensori in attesa del tutorial
    const relink = how.startsWith('ricollegamento');
    Object.assign(l2, { connected: true, L: { ...l2.L, state: 'connected', phone: 'tut', joins: 2, relinked: relink, resumed: !relink } });
    linkChange(P2); ph.flush(); ui.split.paint(); ph.flush(); w.advance(300); ph.flush();
    assert.equal(ph.steps, 0, 'il telefono non è passato alla calibrazione');
    assert.ok(ui.split.tutOpen.p2, 'tutorial di nuovo aperto nella metà');
    assert.ok(!P2.tutorialSeen, 'non segnato come visto');
    assert.equal(ui.split.tut.p2.state.idx, 3, 'riprende dalla scheda 4');
    assert.ok(!l2.cmds.includes('cal'), 'nessuna calibrazione chiesta');
    const cfg = l2.sent.filter(m => m.t === 'cfg').at(-1), tp = l2.sent.filter(m => m.t === 'tp').at(-1);
    assert.equal(cfg.tut, 1, 'al telefono ricollegato il cfg con il tutorial'); assert.equal(tp.i, 3);
    assert.equal(tp.all, 0, '«Tutto chiaro» ancora spento');
    ui.split.closeTutorials();
    assert.ok(!P2.tutWait, 'uscendo dalla pagina il telefono non aspetta più');
  });
}

test('stesso schermo: telefono caduto a tutorial aperto e pagina «Collega» lasciata → il telefono non resta ad aspettare', async () => {
  const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = { ...fakeLink(), ready: false, L: { state: 'connected', phone: 'tut', joins: 1, pairs: 1 } };
  const ph = phonePage(P2, l2);
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect');
  linkChange(P2); ph.flush(); ui.split.paint(); ph.flush();
  Object.assign(l2, { connected: false, ready: false, L: { ...l2.L, state: 'lost', phone: null } }); linkChange(P2);
  assert.ok(P2.tutWait);
  lobby.setMode('cpu');
  assert.ok(!P2.tutWait, 'si lascia lo stesso schermo: niente attesa del tutorial');
  // tutSupported descrive la pagina del telefono: resta fino a un abbinamento nuovo
  assert.ok(P2.tutSupported);
  Object.assign(l2, { connected: true, L: { ...l2.L, state: 'connected', phone: 'sensors', joins: 2, pairs: 2 } }); linkChange(P2);
  assert.ok(!P2.tutSupported && !P2.tutV2, 'abbinamento nuovo: si riparte da capo');
});

test('stesso schermo: la pagina di prima (mai risposto tut) chiude la modale quando calibra da sola; una pagina B9 no', async () => {
  const w = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = w;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  P2.link = { ...fakeLink(), ready: false, L: { state: 'connected', phone: 'cal', joins: 1, pairs: 1 } };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint();
  assert.ok(ui.split.tutOpen.p2);
  P2._onCal({ kind: 'step', step: 'still' });
  assert.ok(!ui.split.tutOpen.p2 && P2.tutorialSeen, 'pagina di prima: chiusa e vista');
  // P1 con una pagina B9: ha risposto tut in questo abbinamento, poi waitTutorial(false) e di nuovo aperto
  const P1 = E.natpfPhone;
  assert.ok(ui.split.tutOpen.p1);
  P1._onTut({ wait: 1, v: 2 });
  P1.waitTutorial(false); P1.waitTutorial(true);
  assert.ok(P1.tutSupported, 'risposta tut ricordata per questo abbinamento');
  P1._onCal({ kind: 'step', step: 'still' });
  assert.ok(ui.split.tutOpen.p1 && !P1.tutorialSeen, 'pagina B9: un passo della calibrazione non chiude il tutorial');
});

// Revisione B9 (06/11), bloccante del ramo B: un telefono con la pagina nascosta (schermo spento, altra app: il telefono
// manda vis 0) restava «Pronto», il conto partiva e la partita cominciava. Ora la scheda usa la salute del telefono (lo
// stesso criterio della pausa in partita, natpf_phone_watch): «Schermo spento» o «Sensori fermi» sono un problema, il
// conto non parte (o si annulla con il motivo) e bothReady (pagina «Partita», «Gioca») dice lo stesso delle schede
test('stesso schermo: telefono con lo schermo spento → scheda «Problema · Schermo spento», niente conto, niente partita', async () => {
  const { E, ui, lobby, link, l2, P2, counts, advance } = await splitLobby();
  // Giulia pronta, poi il suo schermo si spegne mentre Marco finisce
  for (const fn of E.natpfPhone.tutListeners) fn({ ok: true }); E.natpfPhone._onCal({ kind: 'review', pass: true });
  link.L.vis = false; E.natpfPhone._changed();
  for (const fn of P2.tutListeners) fn({ ok: true }); P2._onCal({ kind: 'review', pass: true });
  advance(1500);
  const s1 = ui.split.slot('p1');
  assert.equal(s1.state, 'ko'); assert.equal(s1.detail, 'Schermo spento');
  assert.equal(ui.split.status('p1').title, 'Schermo del telefono spento');
  assert.equal(ui.split.cd.running, false, 'nessun conto'); assert.equal(counts(l2).length, 0, 'nessun annuncio ai telefoni');
  assert.equal(ui.split.bothReady(), false); assert.equal(lobby.state().splitReady, false);
  assert.match($('split-ready-bar').querySelector('[data-ready-bar-sub]').textContent, /^Aspetto Giulia \(schermo spento\)\.$/);
  advance(4000); assert.ok(!E.natpfSplit?.active, 'nessuna partita');
  // «Impostazioni partita ›» non porta avanti (come con un telefono non pronto); la pagina «Partita» (dal percorso in
  // alto) ha «Gioca» grigio come le schede
  lobby.next(); assert.equal(lobby.step, 'connect');
  lobby.go('match');
  advance(400);
  assert.equal($('btn-start-match').disabled, true);
  assert.match($('lobby-match-note').textContent, /^Aspetto Giulia \(schermo spento\)/);
  lobby.go('connect');
  // lo schermo si riaccende: pronta, il conto parte da 3 e si gioca
  link.L.vis = true; E.natpfPhone._changed();
  advance(150);
  assert.equal(ui.split.cd.running, true); assert.equal(ui.split.cd.left, 3);
  advance(3100);
  assert.equal(E.natpfSplit?.active, true);
});

test('stesso schermo: schermo spento durante il conto → conto annullato con il motivo; sensori fermi oltre la tolleranza → problema', async () => {
  const { E, ui, link, l2, P2, readyBoth, counts, advance } = await splitLobby();
  readyBoth(); advance(1300);
  assert.equal(ui.split.cd.running, true);
  l2.L.vis = false; P2._changed();
  advance(150);
  assert.equal(ui.split.cd.running, false);
  assert.equal(ui.split.cd.why, 'Conto annullato · Marco: schermo spento');
  assert.equal($('split-ready-bar').dataset.readyBar, 'cancel');
  assert.match(counts(link).at(-1).txt, /Marco: schermo spento/, 'il telefono di Giulia lo sa');
  l2.L.vis = true; P2._changed(); advance(150);
  assert.equal(ui.split.cd.running, true); assert.equal(ui.split.cd.left, 3, 'di nuovo da capo');
  // sensori del P2: flusso fermo da poco (sotto la tolleranza della pausa in partita) → ancora pronto; oltre → problema
  const { SPLIT_STALL_MS } = await import('../src/natpf/natpf_split_ui.js');
  let age = 12; l2.stats = () => ({ rates: { fo: { ageMs: age } }, rtt: 8 });
  age = SPLIT_STALL_MS - 100; advance(100);
  assert.equal(ui.split.slot('p2').state, 'ready', 'un pacchetto in ritardo non annulla');
  age = SPLIT_STALL_MS + 100; advance(150);
  assert.deepEqual([ui.split.slot('p2').state, ui.split.slot('p2').detail], ['ko', 'Sensori fermi']);
  assert.equal(ui.split.cd.running, false); assert.equal(ui.split.cd.why, 'Conto annullato · Marco: sensori fermi');
  assert.ok(!E.natpfSplit?.active);
});

test('stesso schermo: bothReady come le schede — tutorial aperto o da vedere, webcam per due non in modalità per due', async () => {
  const { E, ui, lobby, P2, advance } = await splitLobby();
  // tutti e due calibrati, ma il P2 ha ancora il tutorial aperto
  for (const fn of E.natpfPhone.tutListeners) fn({ ok: true }); E.natpfPhone._onCal({ kind: 'review', pass: true });
  P2.link.ready = true; P2.link.L.phone = 'ready';
  assert.ok(ui.split.tutOpen.p2 && P2.ready);
  assert.equal(ui.split.slot('p2').state, 'prep'); assert.equal(ui.split.bothReady(), false, 'tutorial aperto: non si gioca');
  for (const fn of P2.tutListeners) fn({ ok: true }); ui.split.paint();
  assert.equal(ui.split.bothReady(), true);
  // chiosco: visitatore nuovo con il P2 rimasto collegato, pagina «Partita» aperta (la modale si apre solo in «Collega»)
  ui.split.holdCountdown(); lobby.next(); assert.equal(lobby.step, 'match');
  P2.forgetTutorial();
  assert.deepEqual([ui.split.slot('p2').state, ui.split.slot('p2').detail], ['prep', 'Tutorial da vedere']);
  assert.equal(ui.split.bothReady(), false);
  advance(400); assert.equal($('btn-start-match').disabled, true, '«Gioca» spento');
  // webcam per due: le mani viste valgono solo con la webcam in modalità per due (prima la scheda diceva «Pronto» e
  // bothReady no: il conto arrivava a zero e la partita non partiva)
  const mc = E.motionController;
  ui.split.input = 'webcam'; mc.webcamActive = true; mc._duo = { seen: () => true, split: () => .5 };
  mc.webcamDuo = true;
  assert.equal(ui.split.slot('p1').state, 'ready'); assert.equal(ui.split.bothReady(), true);
  mc.webcamDuo = false;
  assert.notEqual(ui.split.slot('p1').state, 'ready', 'scheda e bothReady insieme');
  assert.equal(ui.split.bothReady(), false, 'webcam non in modalità per due: non si gioca');
});
