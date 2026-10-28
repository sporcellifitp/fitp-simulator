// Flussi del gioco (audit del 20/10): percorsi che lasciavano il gioco fermo, in uno stato sbagliato o su una schermata
// senza uscita, e scritture inutili dell'interfaccia. Interfaccia vera sul motore senza disegno (test/ui-world.mjs).
// Ogni test fallisce con il codice di prima.
// node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, fetches, visible } from './ui-world.mjs';
import { QUICK_PLAN } from '@natpf/tennis/calibration.js';

// calibrazione del telefono: i gesti del percorso rapido e verifica superata (eventi come quelli del telefono vero)
const calibrate = w => {
  w.cal({ kind: 'step', step: 'still' });
  QUICK_PLAN.forEach((want, idx) => { w.cal({ kind: idx ? 'next' : 'step', step: 'swings', want, idx, total: QUICK_PLAN.length }); w.cal({ kind: 'ready', want }); w.cal({ kind: 'attempt', ok: true, idx, want }); w.advance(700); });
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
  w.cal({ kind: 'step', step: 'still' }); w.cal({ kind: 'step', step: 'swings', want: 'L', idx: 0, total: QUICK_PLAN.length });
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
  lobby.menu('challenges'); ui.events.nickname = 'Mario'; lobby.pickChallenge('rush'); lobby.go('connect'); lobby.next();
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
  lobby.menu('training'); lobby.go('connect'); lobby.next(); w.ui.training.lessonAction('skip');   // lezione iniziale (28/10)
  w.cal({ kind: 'step', step: 'still' }); w.advance(500);
  w.key('Escape', 'Escape'); assert.ok(E.natpfPaused);
  w.advance(61000, { dt: 1/30 });                                       // nessuno per due volte il limite
  assert.ok(lobby.visible && lobby.step === 'menu' && !ui.pause.isOpen && !ui.training.active);
  assert.equal(!!E.natpfPaused, false);
  // visitatore successivo: allenamento, gesto riconosciuto → la palla parte (prima il gioco restava fermo)
  link.connected = true; link.L = { state: 'connected', phone: 'cal' };
  lobby.menu('training'); lobby.go('connect'); lobby.next(); w.ui.training.lessonAction('skip');   // lezione iniziale (28/10)
  w.cal({ kind: 'step', step: 'still' }); w.cal({ kind: 'step', step: 'swings', want: 'L', idx: 0, total: QUICK_PLAN.length }); w.cal({ kind: 'ready', want: 'L' });
  const z0 = E.ball.pos.z, s0 = w.stats.update;
  w.cal({ kind: 'attempt', ok: true, idx: 0, want: 'L' }); w.advance(2000);
  assert.ok(w.stats.update - s0 > 100 && E.ball.pos.z < z0 - 5, `fotogrammi ${w.stats.update - s0}, palla ${z0.toFixed(2)} → ${E.ball.pos.z.toFixed(2)}`);
});

test('Calibrazione in campo: gesto accettato e subito il gesto dopo o la verifica (come il telefono vero) → la palla del gesto viene colpita subito, con il colpo del gesto', async () => {
  // il telefono manda «attempt» e subito «next» (o la verifica, dopo l'ultimo): la palla della calibrazione è appena
  // oltre il punto d'impatto, il colpo parte nello stesso istante. Con la palla 10 cm prima partiva al fotogramma dopo:
  // la palla del gesto dopo cancellava lo swing in attesa, e dopo l'ultimo gesto la verifica arrivava prima del colpo
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, ui, lobby } = w;
  lobby.menu('training'); lobby.go('connect'); lobby.next(); w.ui.training.lessonAction('skip');   // lezione iniziale (28/10)
  w.cal({ kind: 'step', step: 'still' }); w.cal({ kind: 'step', step: 'swings', want: 'L', idx: 0, total: 4 }); w.cal({ kind: 'ready', want: 'L' });
  w.advance(200);
  const hits = [];
  for (const [i, want] of [[0, 'L'], [1, 'R'], [2, 'L'], [3, 'R']]){
    w.advance(100);
    const struck = () => E.ball.lastHitter === 'player';
    w.cal({ kind: 'attempt', ok: true, idx: i, want });
    const hit = struck(), swing = E.player.swingType;
    if (i < 3) w.cal({ kind: 'next', idx: i + 1, want: want === 'L' ? 'R' : 'L' });
    hits.push({ want, hit, swing });
    w.advance(1200);
    if (i < 3) w.cal({ kind: 'ready', want: want === 'L' ? 'R' : 'L' });
    w.advance(300);
  }
  assert.deepEqual(hits.map(h => h.hit), [true, true, true, true], JSON.stringify(hits));
  assert.deepEqual(hits.map(h => h.swing), ['forehand', 'backhand', 'forehand', 'backhand'], JSON.stringify(hits));
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
  lobby.menu('training'); lobby.go('connect'); lobby.next(); w.ui.training.lessonAction('skip');   // lezione iniziale (28/10)
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

test('Sfide: il «Campione» resta contro la CPU esperta anche con Leggenda scelta, e dopo torna Leggenda', async () => {
  const w = await makeWorld({ controller: 'mouse', difficulty: 'leggenda' }); w.advance(300);
  const { E, ui, lobby } = w;
  assert.equal(E.matchConfig.difficulty, 'leggenda');
  lobby.menu('challenges'); ui.events.nickname = 'Eva'; lobby.pickChallenge('champion'); lobby.go('connect'); lobby.next(); w.advance(2000);
  assert.equal(ui.events.active?.id, 'champion');
  assert.equal(E.matchConfig.difficulty, 'pro');
  w.key('Escape', 'Escape'); ui.pause.run('menu');
  assert.equal(E.matchConfig.difficulty, 'leggenda');
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
  lobby.menu('challenges'); ui.events.nickname = 'Ana'; lobby.pickChallenge('rush'); lobby.go('connect'); lobby.next(); w.advance(500);
  let writes = 0, html = ''; Object.defineProperty(ui.events.hud, 'innerHTML', { get: () => html, set: v => { writes++; html = v; }, configurable: true });
  w.advance(2000);
  assert.ok(writes <= 4, `${writes} scritture in 2 s`);
});

test('1v1: la lobby dell’host riscrive la riga di stato solo quando cambia (il pallino in attesa non riparte ogni 250 ms)', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, lobby, hud } = w;
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('match'); w.advance(300);
  const line = $('natpf-invite').querySelector('[data-versus-state]');
  assert.match(line.textContent, /In attesa di Player 2.*link/);
  let writes = 0, text = line.textContent; Object.defineProperty(line, 'textContent', { get: () => text, set: v => { writes++; text = v; }, configurable: true });
  w.advance(2000);
  assert.ok(writes <= 1, `${writes} scritture in 2 s`);
  // il Player 2 entra e poi è pronto: la riga lo dice, «Gioca» si accende solo con il P2 pronto
  E.roomStatus = { ...E.roomStatus, p2Online: true }; w.advance(400);
  assert.match(text, /è entrato/); assert.ok($('btn-start-match').disabled);
  E.roomStatus = { ...E.roomStatus, p2Online: true, p2Ready: true }; w.advance(400);
  assert.match(text, /è pronto/); assert.ok(!$('btn-start-match').disabled);
});

// richiesta del 23/10: lobby 1v1 online «più semplice e immediata». Prima codice e link comparivano solo nella pagina
// «Partita», dopo racchetta, telefono e riscaldamento: l'amico non poteva entrare mentre l'host si preparava
test('Sfida un amico: l’invito (codice, link, stato del Player 2) è in vista subito, dalla racchetta alla partita', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, ui, lobby } = w;
  const box = $('natpf-invite');
  lobby.menu('play');
  assert.ok(box.classList.contains('hidden'), 'nel menu e nella scelta della modalità no');
  lobby.setMode('friend'); lobby.go('controller');
  // la stanza si crea scegliendo la modalità (click sulla tessera 1v1 dell'HUD → createMultiplayerRoom)
  if (!E.versus?.active) await E.createMultiplayerRoom();
  await w.flush(); w.advance(400);
  assert.ok(!box.classList.contains('hidden'), 'già nella pagina della racchetta');
  assert.match(box.innerHTML, /data-room-code>AT-AB12</); assert.match(box.innerHTML, /Copia link/);
  assert.match(ui.inviteUrl, /room=AT-AB12&role=p2/);
  for (const step of ['connect', 'match']){ lobby.go(step); w.advance(350); assert.ok(!box.classList.contains('hidden'), step); }
  // un'altra modalità chiude la stanza: niente invito
  lobby.go('menu'); w.advance(350); assert.ok(box.classList.contains('hidden'));
  lobby.setMode('cpu'); w.advance(350);
  assert.equal(ui.inviteUrl, null); assert.equal(box.innerHTML, '');
});

test('Sfida un amico: finché la stanza non c’è «Creo la stanza…», dopo 20 s l’errore con «Riprova»', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, lobby } = w;
  E.createMultiplayerRoom = async () => null;              // server o rete che non rispondono
  const box = $('natpf-invite');
  lobby.menu('play'); lobby.setMode('friend'); lobby.go('controller'); w.advance(400);
  assert.ok(!box.classList.contains('hidden')); assert.match(box.innerHTML, /Creo la stanza/);
  w.advance(15000); assert.match(box.innerHTML, /Creo la stanza/, 'dopo un ricaricamento la stanza può impiegare ~13 s');
  w.advance(5500);
  assert.match(box.innerHTML, /non è stata creata/); assert.match(box.innerHTML, /data-room-retry/);
  assert.equal(box.dataset.pending, 'failed');
});

test('Ti hanno invitato: il codice scritto a mano porta alla pagina del Player 2; un codice sbagliato lo dice', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { lobby } = w;
  lobby.menu('play');
  assert.equal(await lobby.joinWithCode('ciao'), null);
  assert.ok(visible('join-warn')); assert.match($('join-warn').textContent, /AT-K3ZQ/);
  // sito senza server (/api/match/state non dà JSON): collegamento diretto con l'host
  const url = await lobby.joinWithCode(' at k3zq ');
  assert.equal(url, '/?room=AT-K3ZQ&role=p2&net=p2p');
  assert.equal(location.href, url); assert.ok(!visible('join-warn'));
});

// HUD del Player 2: il telefono-racchetta NATPF si collega al suo computer, non al relay; prima il P2 leggeva sempre
// «Player 1 pronto • inquadra il QR per usare il telefono», anche con il telefono collegato e calibrato
test('Player 2: l’HUD non chiede più di inquadrare il QR del vecchio telefono', async () => {
  await makeWorld({ controller: 'mouse', role: 'p2' });
  const { HudUI } = await import('../src/hud_ui.js');
  const pill = $('opponent-presence-pill'), text = $('opponent-presence-text');
  const hud = { selectedDifficulty: '1v1', currentRoomId: 'AT-AB12', playerRole: 'p2', elOpponentPresencePill: pill, elOpponentPresenceText: text, _lastOtherReady: false };
  HudUI.prototype.updateOpponentPresence.call(hud, { isMultiplayer: true, p1Online: true, hostName: 'Ada' });
  assert.equal(text.textContent, 'Ada in campo • pronti al servizio!');
  HudUI.prototype.updateOpponentPresence.call(hud, { isMultiplayer: true, p1Online: false, hostName: 'Ada' });
  assert.equal(text.textContent, 'In attesa di Ada…');
  // host: sotto l'avatar «pronto» solo con il Player 2 pronto (prima bastava che fosse entrato)
  const host = { ...hud, playerRole: 'p1' }, label = $('setup-opponent-label');
  HudUI.prototype.updateOpponentPresence.call(host, { isMultiplayer: true, p2Online: true, guestName: 'Bea' });
  assert.equal(label.textContent, 'Bea entrato');
  HudUI.prototype.updateOpponentPresence.call(host, { isMultiplayer: true, p2Online: true, p2Ready: true, guestName: 'Bea' });
  assert.equal(label.textContent, '🟢 Bea pronto');
});

test('Player 2: «Collega il telefono» apre il QR e il pannello d’attesa non lo copre', async () => {
  const w = await makeWorld({ controller: 'phone', role: 'p2' });
  Object.assign(w.link, { connected: false, L: { state: 'waiting', phone: null } }); w.advance(300);
  assert.ok(visible('natpf-guest-modal'));
  assert.match($('natpf-guest-go').textContent, /Collega il telefono/);
  $('natpf-guest-go').click();
  assert.ok(visible('natpf-phone-modal') && !visible('natpf-guest-modal'));
  w.advance(1500);
  assert.ok(visible('natpf-phone-modal') && !visible('natpf-guest-modal'));
});

// Player 2 con il telefono (richiesta del 23/10, sera): calibrava nel pannello del telefono, senza campo e senza palle;
// dopo i due gesti chiedeva un «colpetto libero» e due pulsanti, e chi non li trovava restava lì con l'host bloccato
const guestPhoneLinked = w => { Object.assign(w.link, { connected: true, L: { state: 'connected', phone: 'cal' } }); w.E.natpfPhone._changed(); };
test('Player 2: collegato il telefono si calibra nel campo d’allenamento come il Player 1, poi è pronto da solo', async () => {
  const w = await makeWorld({ controller: 'phone', role: 'p2' });
  Object.assign(w.link, { connected: false, L: { state: 'waiting', phone: null } }); w.advance(300);
  const { E, ui, mc, link } = w;
  // come il telefono vero: «pronto» arriva un attimo dopo la conferma (prima il P2 restava non pronto)
  const cmd = link.cmd.bind(link);
  link.cmd = c => { if (c !== 'confirm') return cmd(c); link.cmds.push(c); setTimeout(() => { link.ready = true; link.L.phone = 'ready'; E.natpfPhone._changed(); }, 400); };
  $('natpf-guest-go').click(); w.advance(500);
  guestPhoneLinked(w); w.advance(600);
  // in campo: pannelli chiusi, calibrazione del riscaldamento, motore in locale (ruolo del P1, colpi che restano qui)
  assert.ok(!visible('natpf-phone-modal') && !visible('natpf-guest-modal'), 'niente pannelli sopra il campo');
  assert.ok(ui.training.active && ui.training.cal, 'calibrazione in campo');
  assert.ok(E.playerRole === 'p1' && E.isMultiplayer === false && mc.localPractice === true);
  assert.ok(!ui.versus.ready && !mc.versusReady, 'non pronto finché calibra: l’host non può far partire la partita');
  w.advance(2000);
  assert.ok(!visible('natpf-guest-modal'), 'il pannello d’attesa non torna sopra il campo');
  // il primo gesto colpisce la palla che aspetta, come nel riscaldamento del Player 1
  w.cal({ kind: 'step', step: 'still' }); w.cal({ kind: 'step', step: 'swings', want: 'L', idx: 0, total: QUICK_PLAN.length });
  const z0 = E.ball.pos.z; w.cal({ kind: 'ready', want: 'L' }); w.cal({ kind: 'attempt', ok: true, idx: 0, want: 'L' }); w.advance(1000);
  assert.ok(E.ball.pos.z < z0 - 3, `palla colpita dal giocatore in campo (z da ${z0.toFixed(1)} a ${E.ball.pos.z.toFixed(1)})`);
  // calibrazione finita: di nuovo Player 2 nella stanza, pronto senza altri pulsanti
  calibrate(w); w.cal({ kind: 'done', profile: { hand: 'right' } }); w.advance(3000);
  assert.ok(!ui.training.active, 'calibrazione chiusa');
  assert.ok(E.playerRole === 'p2' && E.isMultiplayer === true && !mc.localPractice, 'motore di nuovo del Player 2');
  assert.ok(ui.versus.ready && mc.versusReady, 'pronto da solo: l’host lo vede nella lobby');
  assert.ok(visible('natpf-guest-modal') && $('natpf-guest-go').textContent === 'Pronto ✓');
  assert.ok(!E.autoPlayMode, 'niente dimostrazione sotto il pannello');
});

test('Player 2: «Salta» nella calibrazione in campo → pronto in modalità semplice, motore di nuovo del Player 2', async () => {
  const w = await makeWorld({ controller: 'phone', role: 'p2' }); w.advance(300);
  const { E, ui, mc } = w;
  $('natpf-guest-go').click(); w.advance(600);
  assert.ok(ui.training.active && E.playerRole === 'p1');
  ui.training.skip(); w.advance(300);
  assert.ok(!ui.training.active && E.playerRole === 'p2' && E.isMultiplayer && !mc.localPractice);
  assert.ok(ui.versus.ready && E.natpfPhone.ready && E.natpfPhone.simple);
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

test('Partita: telefono che cade → pausa con il pannello del telefono; quando torna pronto si riprende da solo, dopo il conto alla rovescia', async () => {
  const w = await phoneMatch(), { E } = w;
  assert.ok(E.natpfPhone.ready && !E.natpfPaused && !E.autoPlayMode);
  drop(w); w.advance(200);
  assert.ok(!visible('natpf-phone-modal') && !E.natpfPaused, 'non subito: un ricollegamento lampo dura meno');
  w.advance(300);
  assert.ok(visible('natpf-phone-modal') && E.natpfPaused);
  assert.ok(visible('natpf-phone-hold'), 'il riquadro della pausa dice perché');
  back(w); w.advance(300);
  assert.ok(E.natpfPaused, 'non si riparte appena torna: prima un tratto regolare e il conto alla rovescia');
  w.advance(3200);
  assert.ok(!visible('natpf-phone-modal') && !E.natpfPaused && !visible('natpf-phone-hold'));
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

test('Calibrazione in campo: il gesto riconosciuto colpisce la sua palla anche se il telefono passa subito al gesto dopo', async () => {
  // il telefono manda il tentativo riuscito e nello stesso istante il gesto successivo con «pronto» (la mano era già
  // ferma), o la verifica dopo l'ultimo. Dalla finestra d'impatto lo swing aspetta la palla al punto d'impatto, e la
  // palla veniva sostituita (o tolta) prima del colpo: nel riscaldamento il giocatore non colpiva più nessuna palla
  // (prova nel browser del 22/10)
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, lobby } = w;
  lobby.menu('training'); lobby.go('connect'); lobby.next(); w.ui.training.lessonAction('skip');   // lezione iniziale (28/10)
  w.cal({ kind: 'step', step: 'still' });
  const strokes = [];
  QUICK_PLAN.forEach((want, idx) => {
    if (!idx) w.cal({ kind: 'step', step: 'swings', want, idx, total: QUICK_PLAN.length });
    w.cal({ kind: 'ready', want }); w.advance(100);
    const ballX = E.ball.pos.x;
    w.cal({ kind: 'attempt', ok: true, idx, want });
    let hit = E.ball.lastHitter === 'player';
    if (idx + 1 < QUICK_PLAN.length){ w.cal({ kind: 'next', step: 'swings', idx: idx + 1, want: QUICK_PLAN[idx + 1], total: QUICK_PLAN.length }); w.cal({ kind: 'ready', want: QUICK_PLAN[idx + 1] }); }
    else w.cal({ kind: 'review', pass: true });
    // il colpo parte subito (palla della calibrazione appena oltre il punto d'impatto) o entro 0,3 s; dopo almeno
    // CAL_SPOT.seen di volo arriva già la palla del gesto dopo
    for (let ms = 0; ms < 300; ms += 20){ w.advance(20); hit ||= E.ball.lastHitter === 'player'; }
    strokes.push({ want, ballX: +ballX.toFixed(2), hitter: hit ? 'player' : E.ball.lastHitter, swing: E.player.swingType });
    w.advance(900);
  });
  for (const s of strokes){
    assert.equal(s.hitter, 'player', JSON.stringify(strokes));
    assert.equal(s.swing, s.want === 'L' ? 'forehand' : 'backhand', JSON.stringify(strokes));
    assert.ok(s.want === 'L' ? s.ballX > .5 : s.ballX < -.5, JSON.stringify(strokes));
  }
});

test('Calibrazione rifatta dopo una verifica non superata: ogni gesto del secondo giro colpisce la sua palla', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { E, lobby, link } = w;
  lobby.menu('training'); lobby.go('connect'); lobby.next(); w.ui.training.lessonAction('skip');   // lezione iniziale (28/10)
  w.cal({ kind: 'step', step: 'still' });
  const round = check => QUICK_PLAN.forEach((want, idx) => {
    w.cal({ kind: idx ? 'next' : 'step', step: 'swings', want, idx, total: QUICK_PLAN.length }); w.cal({ kind: 'ready', want }); w.advance(100);
    const z0 = E.ball.pos.z; w.cal({ kind: 'attempt', ok: true, idx, want }); w.advance(600);
    if (check) assert.ok(E.ball.pos.z < z0 - 2, `gesto ${idx + 1}: palla da ${z0.toFixed(2)} a ${E.ball.pos.z.toFixed(2)}`);
    w.advance(600);
  });
  round(false);
  w.cal({ kind: 'review', pass: false, why: 'direzione' }); w.advance(1700);
  assert.ok(link.cmds.includes('retry'));
  round(true);
});

test('Blocco dello schermo del telefono: avviso una volta per collegamento, mai con la pagina nascosta', async () => {
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { ui, link } = w, toast = () => (visible('natpf-toast') ? $('natpf-toast').textContent : '');
  const state = s => { $('natpf-toast').classList.add('hidden'); Object.assign(link.L, s); link.ready = true; link.L.phone = 'ready'; ui._watchPhoneDrop(); return toast(); };
  link.L.joins = 1;
  assert.equal(state({ vis: true, wake: 1 }), '', 'blocco attivo: niente avviso');
  // pagina nascosta (schermo spento, altra app): il telefono rilascia il blocco da solo, non è il caso da segnalare
  assert.equal(state({ vis: false, wake: 0 }), '');
  // di nuovo in primo piano senza blocco (negato o risparmio energetico): avviso, una volta sola
  assert.match(state({ vis: true, wake: 0 }), /potrebbe spegnersi/);
  assert.equal(state({ vis: true, wake: 0 }), '');
  // collegamento nuovo con un browser che non offre il blocco
  link.L.joins = 2;
  assert.match(state({ vis: true, wake: -1 }), /non tiene acceso lo schermo/);
  // telefono vecchio, che non manda questi campi: nessun avviso
  link.L.joins = 3; delete link.L.vis; delete link.L.wake;
  assert.equal(state({}), '');
});

// Richiesta del 28/10 sera: «Gioca ancora» deve far scegliere di nuovo le impostazioni della partita (prima ripartiva
// subito la stessa partita)
test('fine partita, «Gioca ancora»: si torna alla pagina «Partita» con le impostazioni, la partita non riparte da sola', async () => {
  const { E, lobby, pressStart } = await makeWorld({ controller: 'mouse' });
  pressStart();
  let restarted = 0; const real = E.startNewMatch.bind(E); E.startNewMatch = o => { restarted++; return real(o); };
  E.hud.showVictoryModal();
  document.getElementById('btn-play-again').click();
  assert.equal(restarted, 0);
  assert.ok(lobby.visible, 'menu aperto'); assert.equal(lobby.step, 'match');
  assert.ok(!visible('victory-modal'));
  assert.equal(E.autoPlayMode, true, 'la partita dietro al menu è quella dimostrativa');
});
