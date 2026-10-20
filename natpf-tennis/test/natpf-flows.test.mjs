// Flussi del gioco (audit del 20/10): percorsi che lasciavano il gioco fermo, in uno stato sbagliato o su una schermata
// senza uscita, e scritture inutili dell'interfaccia. Interfaccia vera sul motore senza disegno (test/ui-world.mjs).
// Ogni test fallisce con il codice di prima.
// node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, fetches, visible } from './ui-world.mjs';

// calibrazione del telefono: quattro gesti e verifica superata (eventi come quelli del telefono vero)
const calibrate = w => {
  w.cal({ kind: 'step', step: 'still' });
  ['L', 'R', 'L', 'R'].forEach((want, idx) => { w.cal({ kind: idx ? 'next' : 'step', step: 'swings', want, idx, total: 4 }); w.cal({ kind: 'ready', want }); w.cal({ kind: 'attempt', ok: true, idx, want }); w.advance(700); });
  w.cal({ kind: 'review', pass: true });
};
// partita contro la CPU con mouse e tastiera (riscaldamento saltato)
async function cpuMatch(){
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { lobby, ui } = w;
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next(); ui.training.skip();
  w.pressStart(); w.advance(300);
  return w;
}

test('Sfida un amico: il riscaldamento non è una partita 1v1 (niente «Player 2 scollegato», calibrazione che va avanti)', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, ui, lobby, hud } = w;
  lobby.menu('play');
  hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('controller'); w.advance(500); lobby.go('connect'); w.advance(1500); lobby.next();
  assert.ok(ui.training.active && E.versus?.active);
  assert.equal(E._versusInMatch(), false);
  const before = fetches.length; w.advance(1500);
  const snaps = fetches.slice(before).filter(f => String(f.url).includes('/api/match/sync')).map(f => JSON.parse(f.body).snapshot);
  // al Player 2 va lo stato della lobby, non la partita; nessuna attesa e nessuna pausa sull'host
  assert.ok(snaps.length > 0 && snaps.every(s => s.lobby), JSON.stringify(snaps.map(s => Object.keys(s))));
  assert.ok(!ui.versus.waiting && !E.natpfPaused && !visible('natpf-versus-wait'));
  // il gesto riconosciuto colpisce la palla della calibrazione
  w.cal({ kind: 'step', step: 'still' }); w.cal({ kind: 'step', step: 'swings', want: 'L', idx: 0, total: 4 });
  const z0 = E.ball.pos.z; w.cal({ kind: 'ready', want: 'L' }); w.cal({ kind: 'attempt', ok: true, idx: 0, want: 'L' }); w.advance(1000);
  assert.ok(E.ball.pos.z < z0 - 5, `palla da ${z0.toFixed(2)} a ${E.ball.pos.z.toFixed(2)}`);
});

test('1v1: «Player 2 di nuovo collegato» solo quando torna davvero, non uscendo dall’attesa', async () => {
  const w = await makeWorld({ controller: 'mouse' });
  const toasts = []; const orig = w.ui.toast.bind(w.ui); w.ui.toast = s => { toasts.push(s); orig(s); };
  w.ui.versus._setWaiting(true); w.ui.versus._setWaiting(false);
  assert.deepEqual(toasts, []);
  w.ui.versus._setWaiting(true); w.ui.versus._setWaiting(false, true);
  assert.deepEqual(toasts, ['Player 2 di nuovo collegato: si riprende']);
});

test('«Torna al menu» durante la calibrazione prima di una sfida: si torna al menu e la sfida non parte', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, ui, lobby } = w;
  lobby.menu('challenges'); ui.events.nickname = 'Mario'; lobby.pickChallenge('targets'); lobby.go('connect'); lobby.next();
  assert.ok(ui.training.active && ui.training.calOnly);
  w.advance(500); w.key('Escape', 'Escape'); assert.ok(ui.pause.isOpen && E.natpfPaused);
  ui.pause.run('menu'); w.advance(3000);
  assert.ok(lobby.visible && lobby.step === 'menu', `${lobby.visible} ${lobby.step}`);
  assert.ok(!ui.events.active && !ui.training.active && E.autoPlayMode && !E.natpfPaused);
  assert.ok(!visible('natpf-challenge-hud'));
});

test('«Torna al menu» dal riscaldamento prima della partita: al menu principale, non alla pagina Partita', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby } = w;
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next(); w.advance(500);
  assert.ok(ui.training.active);
  w.key('Escape', 'Escape'); ui.pause.run('menu');
  assert.equal(lobby.step, 'menu');
});

test('Chiosco: dopo il reset il gioco non resta in pausa per il visitatore successivo', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const { E, ui, lobby, link } = w;
  ui.kiosk.enabled = true; ui.kiosk.limit = 30; w.advance(300);
  lobby.menu('training'); lobby.go('connect'); lobby.next();
  w.cal({ kind: 'step', step: 'still' }); w.advance(500);
  w.key('Escape', 'Escape'); assert.ok(E.natpfPaused);
  w.advance(61000, { dt: 1/30 });                                       // nessuno per due volte il limite
  assert.ok(lobby.visible && lobby.step === 'menu' && !ui.pause.isOpen && !ui.training.active);
  assert.equal(!!E.natpfPaused, false);
  // visitatore successivo: allenamento, gesto riconosciuto → la palla parte (prima il gioco restava fermo)
  link.connected = true; link.L = { state: 'connected', phone: 'cal' };
  lobby.menu('training'); lobby.go('connect'); lobby.next();
  w.cal({ kind: 'step', step: 'still' }); w.cal({ kind: 'step', step: 'swings', want: 'L', idx: 0, total: 4 }); w.cal({ kind: 'ready', want: 'L' });
  const z0 = E.ball.pos.z, s0 = w.stats.update;
  w.cal({ kind: 'attempt', ok: true, idx: 0, want: 'L' }); w.advance(2000);
  assert.ok(w.stats.update - s0 > 100 && E.ball.pos.z < z0 - 5, `fotogrammi ${w.stats.update - s0}, palla ${z0.toFixed(2)} → ${E.ball.pos.z.toFixed(2)}`);
});

test('Fine partita e ritorno al menu entro 1,8 s: la schermata finale non compare sopra il menu', async () => {
  const w = await cpuMatch();
  const { E, ui, lobby } = w;
  for (let i = 0; i < 4; i++) E._awardPoint('player', 'Nice Shot!');
  assert.equal(E.phase, 'MATCH_OVER');
  w.advance(600); w.key('Escape', 'Escape'); ui.pause.run('menu'); w.advance(2000);
  assert.ok(lobby.visible && !visible('victory-modal'));
});

test('Ricalibra durante gli esercizi con il pannello del telefono chiuso: il campo guida la calibrazione, la conferma e si riprende', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, ui, lobby, link } = w;
  lobby.menu('training'); lobby.go('connect'); lobby.next();
  calibrate(w); w.cal({ kind: 'done', profile: { hand: 'right' } }); w.advance(2500);
  assert.ok(!ui.training.cal && E.natpfPhone.ready && ui.training.drill?.id === 'forehand');
  w.key('Escape', 'Escape'); ui.pause.run('phone');
  $('natpf-phone-recal').click(); link.cmds.length = 0; $('natpf-phone-close').click();
  assert.ok(!E.natpfPhone.ready && !E.natpfPaused);
  w.advance(100);
  assert.ok(ui.training.cal, 'si torna alla calibrazione in campo');
  calibrate(w); w.advance(200);
  assert.ok(link.cmds.includes('confirm'), 'verifica confermata dal gioco');
  w.cal({ kind: 'done', profile: { hand: 'right' } }); w.advance(2000);
  assert.ok(E.natpfPhone.ready && !ui.training.cal && ui.training.drill?.id === 'forehand');
});

test('Partita: telefono che ricalibra con il pannello chiuso → si riapre il pannello del telefono (passi e conferma)', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, ui, lobby, link } = w;
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next();
  calibrate(w); w.cal({ kind: 'done', profile: { hand: 'right' } }); ui.training.skip(); w.pressStart(); w.advance(500);
  assert.ok(!E.autoPlayMode && !visible('natpf-phone-modal'));
  link.ready = false; link.L.phone = 'cal';                              // pagina del telefono ricaricata: ricalibra
  w.cal({ kind: 'step', step: 'still' });
  assert.ok(visible('natpf-phone-modal') && E.natpfPaused);
});

test('In pausa lanci e colpi non arrivano al motore', async () => {
  const w = await cpuMatch();
  const { E } = w;
  assert.equal(E.phase, 'SERVE_STANCE');
  w.key('Escape', 'Escape'); assert.ok(E.natpfPaused);
  E.motionController._emitToss({ source: 'keyboard' });
  assert.equal(E.phase, 'SERVE_STANCE');
  E.motionController._emitSwing({ source: 'keyboard', speed: 1.2 });
  assert.equal(E.pendingUserSwing, null);
});

test('Guida aperta sulla pagina «Collega»: il riscaldamento non parte sotto la guida, parte dopo averla chiusa', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const { E, ui, lobby, link } = w;
  link.connected = false; link.L = { state: 'waiting', phone: null }; w.advance(300);
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect');
  w.key('KeyH', 'h'); assert.ok(ui.onboarding.isOpen);
  link.connected = true; link.L = { state: 'connected', phone: 'cal' }; E.natpfPhone._changed();
  w.advance(1500);
  assert.ok(!ui.training.active && ui.onboarding.isOpen);
  ui.onboarding.close(); w.advance(1500);
  assert.ok(ui.training.active);
});

test('Sfide: «Torna al menu» da un «Campione» rimette la CPU scelta e la durata della partita', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, ui, lobby, hud } = w;
  hud.selectedGamesToWin = 2;
  lobby.menu('challenges'); ui.events.nickname = 'Ana'; lobby.pickChallenge('champion'); lobby.go('connect'); lobby.next(); w.advance(2000);
  assert.equal(ui.events.active?.id, 'champion');
  assert.equal(E.matchConfig.difficulty, 'pro');
  w.key('Escape', 'Escape'); ui.pause.run('menu');
  assert.equal(E.matchConfig.difficulty, 'casual');
  assert.equal(E.matchConfig.gamesToWin, 2);
});

test('Moviola: nascosta nel menu di pausa durante le sfide', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby } = w;
  lobby.menu('challenges'); ui.events.nickname = 'Luca'; lobby.pickChallenge('rally'); lobby.go('connect'); lobby.next(); w.advance(1500);
  w.key('Escape', 'Escape');
  assert.ok(ui.pause.el.querySelector('[data-pause="replay"]').classList.contains('hidden'));
});

test('Player 2: «Torna al menu» lascia la stanza (prima restava dentro e i suoi colpi passavano)', async () => {
  const w = await makeWorld({ controller: 'mouse', role: 'p2' }); w.advance(300);
  w.ui.backToMenu();
  assert.equal(location.href, '/', location.href);                       // stessa pagina senza room/role
});

test('Sfide: il riquadro del punteggio si riscrive solo quando cambia (prima a ogni fotogramma)', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby } = w;
  lobby.menu('challenges'); ui.events.nickname = 'Ana'; lobby.pickChallenge('targets'); lobby.go('connect'); lobby.next(); w.advance(500);
  let writes = 0, html = ''; Object.defineProperty(ui.events.hud, 'innerHTML', { get: () => html, set: v => { writes++; html = v; }, configurable: true });
  w.advance(2000);
  assert.ok(writes <= 4, `${writes} scritture in 2 s`);
});

test('1v1: la lobby dell’host riscrive le righe solo quando cambiano (il pallino in attesa non riparte ogni 250 ms)', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, lobby, hud } = w;
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('match'); w.advance(300);
  const list = $('natpf-invite').querySelector('[data-versus-lines]');
  let writes = 0, html = ''; Object.defineProperty(list, 'innerHTML', { get: () => html, set: v => { writes++; html = v; }, configurable: true });
  w.advance(2000);
  assert.ok(writes <= 1, `${writes} scritture in 2 s`);
});

test('Player 2: dopo «Sono pronto» con il telefono da collegare il pannello d’attesa non copre il QR', async () => {
  const w = await makeWorld({ controller: 'phone', role: 'p2' }); w.advance(300);
  assert.ok(visible('natpf-guest-modal'));
  $('natpf-guest-go').click();
  assert.ok(visible('natpf-phone-modal') && !visible('natpf-guest-modal'));
  w.advance(1500);
  assert.ok(visible('natpf-phone-modal') && !visible('natpf-guest-modal'));
});

// --- collegamento del telefono (audit del 20/10) ---
async function phoneMatch(){
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { ui, lobby } = w;
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next();
  calibrate(w); w.cal({ kind: 'done', profile: { hand: 'right' } }); ui.training.skip(); w.pressStart(); w.advance(500);
  return w;
}
const drop = w => { Object.assign(w.link, { connected: false, ready: false, L: { ...w.link.L, state: 'lost', phone: null } }); w.E.natpfPhone._changed(); };
const back = w => { Object.assign(w.link, { connected: true, ready: true, L: { ...w.link.L, state: 'connected', phone: 'ready' } }); w.E.natpfPhone._changed(); };

test('Partita: telefono che cade → pausa con il pannello del telefono; quando torna pronto si riprende da solo', async () => {
  const w = await phoneMatch(), { E } = w;
  assert.ok(E.natpfPhone.ready && !E.natpfPaused && !E.autoPlayMode);
  drop(w); w.advance(200);
  assert.ok(!visible('natpf-phone-modal'), 'non subito: un ricollegamento normale dura meno');
  w.advance(500);
  assert.ok(visible('natpf-phone-modal') && E.natpfPaused);
  back(w);
  assert.ok(!visible('natpf-phone-modal') && !E.natpfPaused);
});

test('Partita: ricollegamento rapido del telefono (meno di mezzo secondo) → nessuna pausa', async () => {
  const w = await phoneMatch(), { E } = w;
  drop(w); w.advance(150); back(w); w.advance(1000);
  assert.ok(!visible('natpf-phone-modal') && !E.natpfPaused);
});

test('Telefono ricollegato senza che il computer l’abbia visto cadere: fase e impostazioni rimandate', async () => {
  const w = await phoneMatch(), { E, link } = w, P = E.natpfPhone;
  const count = t => link.sent.filter(m => m.t === t).length;
  P.update(); const ph = count('ph'), grip = count('grip');
  P.update(); assert.equal(count('ph'), ph);                       // fase già mandata: non si ripete
  link.L.joins = (link.L.joins || 0) + 1; P._sendGrip();             // collegamento nuovo (evento «change» del collegamento)
  P.update();
  assert.equal(count('ph'), ph + 1); assert.equal(count('grip'), grip + 1);
});

test('Colpo del telefono arrivato in forte ritardo (rete che torna): ignorato, non giocato fuori tempo', async () => {
  const w = await phoneMatch(), P = w.E.natpfPhone, seen = [];
  P.onSwing(ev => seen.push(ev));
  P._onSwing({ dir: 1, power: .8, peak: 600, at: performance.now()/1000 - 1.2 });
  assert.equal(seen.at(-1)?.ignored, 'arrivato in ritardo dalla rete');
  P._onSwing({ dir: 1, power: .8, peak: 600, at: performance.now()/1000 - .05 });
  assert.notEqual(seen.at(-1)?.ignored, 'arrivato in ritardo dalla rete');
});

test('Calibrazione rifatta dopo una verifica non superata: ogni gesto del secondo giro colpisce la sua palla', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, lobby, link } = w;
  lobby.menu('training'); lobby.go('connect'); lobby.next();
  w.cal({ kind: 'step', step: 'still' });
  const round = check => ['L', 'R', 'L', 'R'].forEach((want, idx) => {
    w.cal({ kind: idx ? 'next' : 'step', step: 'swings', want, idx, total: 4 }); w.cal({ kind: 'ready', want }); w.advance(100);
    const z0 = E.ball.pos.z; w.cal({ kind: 'attempt', ok: true, idx, want }); w.advance(600);
    if (check) assert.ok(E.ball.pos.z < z0 - 2, `gesto ${idx + 1}: palla da ${z0.toFixed(2)} a ${E.ball.pos.z.toFixed(2)}`);
    w.advance(600);
  });
  round(false);
  w.cal({ kind: 'review', pass: false, why: 'direzione' }); w.advance(1700);
  assert.ok(link.cmds.includes('retry'));
  round(true);
});
