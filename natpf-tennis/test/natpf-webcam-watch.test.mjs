// Webcam in partita (richiesta del 23/10): stati della mano nel controller (valida, degradata, persa, ripresa), salute
// per la pausa (natpf_webcam_watch.js) e, nel gioco con il motore e l'interfaccia veri (orologio virtuale), pausa dopo
// 1,5 s senza mano con le istruzioni, ripresa con la mano di nuovo vista e il conto alla rovescia, punto rigiocato.
// La mano è simulata: quanto spesso il modello la perde con la webcam vera e la luce della stanza lo dice il registro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcamHealth, createWebcamWatch, webcamHoldText, webcamOpenError, WEBCAM_WATCH } from '../src/natpf/natpf_webcam_watch.js';

test('salute della webcam: accesa, fotogrammi che arrivano, mano vista; in pausa la mano deve vedersi adesso', () => {
  const ok = { active: true, model: true, handAgeMs: 40, frameAgeMs: 30 };
  assert.deepEqual(webcamHealth(ok), { ok: true, why: null });
  assert.equal(webcamHealth({ ...ok, active: false }).why, 'webcam spenta');
  assert.equal(webcamHealth({ ...ok, frameAgeMs: 1500 }).why, 'webcam ferma');
  assert.equal(webcamHealth({ ...ok, handAgeMs: WEBCAM_WATCH.lostMs + 10 }).why, 'mano persa');
  assert.equal(webcamHealth({ ...ok, handAgeMs: 1000 }).ok, true, 'fuori dallo scambio: tolleranza fino a lostMs');
  assert.equal(webcamHealth({ ...ok, handAgeMs: 1000 }, { rally: true }).why, 'mano persa', 'nello scambio: prima che il punto sia perso');
  assert.equal(webcamHealth({ ...ok, handAgeMs: 700 }, { rally: true }).ok, true, 'il mosso di uno swing non ferma la partita');
  assert.equal(webcamHealth({ ...ok, handAgeMs: 800 }, { paused: true }).why, 'mano persa', 'per riprendere: vista adesso');
  // senza modello delle mani (solo movimento) la mano non si giudica; senza richiami dei fotogrammi la camera nemmeno
  assert.equal(webcamHealth({ ...ok, model: false, handAgeMs: 1e6 }).ok, true);
  assert.equal(webcamHealth({ ...ok, frameAgeMs: null }).ok, true);
  for (const w of ['mano persa', 'webcam ferma', 'webcam spenta']) assert.ok(webcamHoldText(w).length > 30);
  assert.ok(createWebcamWatch().update);
});

test('stati della mano nel controller: valida, degradata, persa (anche mai vista), ripresa, e il registro con le durate', async () => {
  const { MotionController: MC, HAND_FLOW_MAX_MS } = await import('../src/motion_controls.js');
  const realNow = performance.now;
  try {
    let NOW = 1000; performance.now = () => NOW;
    const mc = Object.create(MC.prototype), logs = [];
    Object.assign(mc, { webcamActive: true, onTrack: d => d.kind === 'stato' && logs.push(d), videoElem: { readyState: 4 } });
    mc.mpHands = { send: () => Promise.resolve(), setOptions(){} };
    mc._wcStart(null);
    const tick = ms => { NOW += ms; mc._handStateTick(NOW); };
    tick(100);
    assert.equal(mc._handState, 'persa', 'mai vista dall\'accensione');
    assert.equal(mc.webcamHealth(NOW).handAgeMs, 100);
    mc._handSeenForFlow = NOW; tick(16);
    assert.equal(mc._handState, 'ripresa');
    for (let i = 0; i < 40; i++){ mc._handSeenForFlow = NOW; tick(16); }
    assert.equal(mc._handState, 'valida', 'dopo 0,6 s di nuovo valida');
    tick(300); assert.equal(mc._handState, 'degradata');
    tick(HAND_FLOW_MAX_MS); assert.equal(mc._handState, 'persa');
    mc._handSeenForFlow = NOW; tick(16); assert.equal(mc._handState, 'ripresa');
    assert.deepEqual(logs.map(l => l.to), ['persa', 'ripresa', 'valida', 'degradata', 'persa', 'ripresa']);
    assert.ok(logs.slice(1).every(l => Number.isFinite(l.ms)), 'ogni cambio porta la durata dello stato finito');
    // senza il modello delle mani: solo movimento
    mc.mpHands = null; tick(16); assert.equal(mc._handState, 'movimento');
  } finally { performance.now = realNow; }
});

test('nel gioco: mano persa in partita → pausa dopo 1,5 s con le istruzioni; mano di nuovo vista → ripresa dopo il conto alla rovescia, punto rigiocato, nessun punto assegnato', async () => {
  const { makeWorld } = await import('./ui-world.mjs');
  const w = await makeWorld({ controller: 'webcam' }), { E, ui, lobby } = w;
  w.advance(300);
  const mc = E.motionController;
  mc.webcamActive = true;
  let seenAt = performance.now();
  mc.webcamHealth = now => ({ active: true, model: true, handAgeMs: now - seenAt, frameAgeMs: 30 });
  const see = ms => { const end = performance.now() + ms; while (performance.now() < end){ seenAt = performance.now(); w.advance(50); } };
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next(); ui.training.skip();
  w.pressStart();
  see(600);
  assert.equal(ui.controller, 'webcam');
  assert.ok(!E.natpfPaused && !E.autoPlayMode, `fase ${E.phase}`);
  // scambio in corso: palla della CPU in arrivo
  Object.assign(E, { phase: 'RALLY', phaseTimer: 0 });
  Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0 });
  const score = () => JSON.stringify(E.score);
  const s0 = score();
  w.advance(WEBCAM_WATCH.lostRallyMs - 200);
  assert.ok(!E.natpfPaused, 'non prima di 0,8 s senza mano nello scambio');
  w.advance(300);
  assert.equal(E.phase, 'RALLY', 'la pausa arriva con il punto ancora in gioco');
  assert.ok(E.natpfPaused && ui.webcamHold?.why === 'mano persa', JSON.stringify(ui.webcamHold));
  const hold = document.getElementById('natpf-phone-hold'), text = hold.querySelector('p').textContent;
  assert.ok(!hold.classList.contains('hidden') && hold.querySelector('b').textContent === 'Webcam in pausa' && /Non vedo la mano/.test(text), text);
  // la mano torna: un tratto con la mano vista, poi il conto alla rovescia
  see(500);
  assert.ok(E.natpfPaused, 'non si riparte appena torna');
  see(3200);
  assert.ok(!E.natpfPaused && !ui.webcamHold, `ancora in pausa: ${JSON.stringify(ui.webcamHold)}`);
  assert.ok(['SERVE_STANCE', 'SERVE_TOSS'].includes(E.phase), `punto rigiocato: fase ${E.phase}`);
  assert.equal(score(), s0, 'nessun punto assegnato per la pausa');
});

test('nel gioco: fuori dallo scambio (attesa del servizio) la mano persa ferma la partita solo dopo 1,5 s; la webcam ferma la ferma comunque', async () => {
  const { makeWorld } = await import('./ui-world.mjs');
  const w = await makeWorld({ controller: 'webcam' }), { E, ui, lobby } = w;
  w.advance(300);
  const mc = E.motionController;
  mc.webcamActive = true;
  let seenAt = performance.now(), frameAt = performance.now();
  mc.webcamHealth = now => ({ active: true, model: true, handAgeMs: now - seenAt, frameAgeMs: now - frameAt });
  const live = ms => { const end = performance.now() + ms; while (performance.now() < end){ seenAt = frameAt = performance.now(); w.advance(50); } };
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next(); ui.training.skip();
  w.pressStart(); live(600);
  Object.assign(E, { phase: 'SERVE_STANCE', phaseTimer: 0 }); E.score.server = 'player';
  const tick = ms => { const end = performance.now() + ms; while (performance.now() < end){ frameAt = performance.now(); E.phase = 'SERVE_STANCE'; w.advance(50); } };
  tick(1200);
  assert.ok(!E.natpfPaused, 'all\'attesa del servizio 1,2 s senza mano non fermano');
  tick(500);
  assert.ok(E.natpfPaused && ui.webcamHold?.why === 'mano persa');
  live(3500);
  assert.ok(!E.natpfPaused && !ui.webcamHold);
  // camera che non manda più fotogrammi: pausa, e il motivo è la webcam, non la mano
  const end = performance.now() + 1300; while (performance.now() < end){ seenAt = performance.now(); w.advance(50); }
  assert.ok(E.natpfPaused && ui.webcamHold?.why === 'webcam ferma', JSON.stringify(ui.webcamHold));
});


// Sessione del 28/10: OBS teneva la webcam («Device in use»): il pannello diceva solo di mostrare spalle e braccio
test('webcam che non si apre: il motivo (occupata, negata, assente, senza https) al posto delle istruzioni', () => {
  assert.equal(webcamOpenError(null), null);
  assert.equal(webcamOpenError({ name: 'NotReadableError', message: 'Device in use' }).badge, 'Webcam occupata');
  assert.match(webcamOpenError({ name: 'NotReadableError' }).text, /OBS/);
  assert.equal(webcamOpenError({ name: 'AbortError', message: 'Could not start video source: device already in use' }).badge, 'Webcam occupata');
  assert.equal(webcamOpenError({ name: 'NotAllowedError' }).badge, 'Webcam negata');
  assert.equal(webcamOpenError({ name: 'NotFoundError' }).badge, 'Nessuna webcam');
  assert.equal(webcamOpenError({ name: 'insecure', message: 'HTTPS required for browser camera access' }).badge, 'Serve https');
  assert.match(webcamOpenError({ name: 'Boh' }).text, /Boh/);
  assert.match(webcamHoldText('mano persa'), /mano, polso e avambraccio/);
});

test('controller: la webcam occupata da un altro programma lascia il motivo (NotReadableError)', async () => {
  const { MotionController: MC } = await import('../src/motion_controls.js');
  const had = Object.getOwnPropertyDescriptor(globalThis.navigator, 'mediaDevices');
  const busy = Object.assign(new Error('Device in use'), { name: 'NotReadableError' });
  try {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw busy; } } });
    const mc = Object.create(MC.prototype);
    Object.assign(mc, { webcamActive: false, phoneState: { connected: false }, _notifyStatus(){}, _updateWebcamBadgeUI(){} });
    const realWarn = console.warn; console.warn = () => {};
    try { assert.equal(await mc.enableWebcam(), false); } finally { console.warn = realWarn; }
    assert.deepEqual(mc.webcamError, { name: 'NotReadableError', message: 'Device in use' });
    assert.equal(webcamOpenError(mc.webcamError).badge, 'Webcam occupata');
  } finally {
    if (had) Object.defineProperty(globalThis.navigator, 'mediaDevices', had); else delete globalThis.navigator.mediaDevices;
  }
});

test('pannello della webcam: con la webcam occupata dice perché; accesa chiede la mano (le spalle solo con «Segui il corpo»)', async () => {
  const { makeWorld } = await import('./ui-world.mjs');
  const { E, ui } = await makeWorld({ controller: 'mouse' });
  const text = () => document.getElementById('setup-cam-text').textContent, badge = () => document.getElementById('setup-cam-badge').textContent;
  E.motionController.webcamError = { name: 'NotReadableError', message: 'Device in use' };
  ui.paintWebcamSetup();
  assert.match(text(), /già usata da un altro programma/); assert.equal(badge(), 'Webcam occupata');
  E.motionController.webcamError = null; E.motionController.webcamActive = true;
  ui.paintWebcamSetup();
  assert.match(text(), /mano che colpisce, con polso e avambraccio/); assert.equal(badge(), 'Cerco la mano…');
});
