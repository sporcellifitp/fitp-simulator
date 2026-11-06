// Sfida un amico: Player 2 con la webcam (segnalazione del 30/10: «a chi riceve l'invito non funziona il settaggio della
// webcam»). Prima, scelta la webcam nel pannello del P2, «Sono pronto» lo dava subito: la camera non si apriva, nessun
// pannello con permesso, anteprima e mano vista, nessuna prova in campo, e in partita l'host non sapeva se la webcam del
// P2 era spenta. Ora il P2 segue il flusso del Player 1: pannello della webcam → prova in campo con il lanciapalle (in
// locale) → pronto da solo; in partita dice all'host quando la webcam non può giocare.
// node --import ./test/register.mjs --test test/natpf-versus-webcam.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, fetches, visible } from './ui-world.mjs';
import { createHoldReporter, hostHoldText, guestHoldNotice, guestText, p2HoldWhy, opponentHealth } from '../src/natpf/natpf_versus.js';
import { webcamHealth } from '../src/natpf/natpf_webcam_watch.js';

const camOpen = () => visible('natpf-guest-cam');
// la webcam vede la mano adesso (come motion_controls: latestHandSeenAt)
const handSeen = w => { w.mc.latestHandSeenAt = performance.now(); };

test('Player 2 con la webcam: pannello della webcam (non coperto dal pannello del P2) → mano vista → prova in campo → pronto da solo', async () => {
  const w = await makeWorld({ controller: 'webcam', role: 'p2' }); w.advance(300);
  const { E, ui, mc } = w;
  assert.equal(ui.controller, 'webcam');
  assert.ok(visible('natpf-guest-modal'));
  assert.equal($('natpf-guest-go').textContent, 'Accendi la webcam ›', 'prima diceva «Sono pronto ✓» e basta');
  // il pulsante apre il pannello della webcam e la accende (il browser chiede il permesso)
  $('natpf-guest-go').click(); await w.flush();
  assert.ok(mc.webcamActive, 'webcam accesa');
  assert.ok(camOpen() && !visible('natpf-guest-modal'));
  assert.ok(!ui.versus.ready, 'non pronto solo per aver aperto la webcam');
  w.advance(1500);
  assert.ok(camOpen() && !visible('natpf-guest-modal'), 'il pannello del P2 non torna sopra quello della webcam');
  assert.equal($('guest-cam-badge').textContent, 'Cerco la mano…');
  assert.ok(!$('guest-cam-field').disabled, '«In campo» con la webcam accesa');
  assert.ok(!ui.training.active, 'senza mano non si entra da soli');
  // la mano si vede: «Mano vista», poi in campo da soli come il Player 1 nella pagina «Collega»
  handSeen(w); w.advance(250);
  assert.match($('guest-cam-text').textContent, /Mano vista ✓/);
  assert.equal($('guest-cam-dot').className, 'setup-dot ok');
  w.advance(800);
  assert.ok(!camOpen() && !visible('natpf-guest-modal'), 'niente pannelli sopra il campo');
  assert.ok(ui.training.active && !ui.training.cal, 'riscaldamento in campo (la webcam non ha una calibrazione)');
  assert.deepEqual(ui.training.drills.map(d => d.id), ['forehand', 'backhand', 'serve'], 'lo stesso riscaldamento del Player 1');
  assert.ok(E.playerRole === 'p1' && E.isMultiplayer === false && mc.localPractice === true, 'motore in locale: colpi che non vanno all’host');
  assert.ok(!ui.versus.ready && !mc.versusReady, 'non pronto durante la prova: l’host non può far partire la partita');
  w.advance(2000);
  assert.ok(!visible('natpf-guest-modal') && !camOpen());
  // riscaldamento finito: di nuovo Player 2 nella stanza, pronto senza altri pulsanti
  ui.training.stop({ completed: true }); w.advance(300);
  assert.ok(!ui.training.active);
  assert.ok(E.playerRole === 'p2' && E.isMultiplayer === true && !mc.localPractice, 'motore di nuovo del Player 2');
  assert.ok(ui.versus.ready && mc.versusReady, 'pronto da solo: l’host lo vede nella lobby');
  assert.ok(visible('natpf-guest-modal') && $('natpf-guest-go').textContent === 'Pronto ✓');
  assert.ok(mc.webcamActive, 'la webcam resta accesa per la partita');
  // «Pronto ✓» di nuovo: resta pronto (B9: prima un secondo clic lo toglieva senza dirlo); «Annulla» lo toglie, poi
  // «Sono pronto» senza rifare la prova (webcam accesa e già provata)
  $('natpf-guest-go').click(); w.advance(300);
  assert.ok(ui.versus.ready, 'il pulsante non è un interruttore');
  $('natpf-guest-modal').querySelector('[data-versus-unready]').click(); w.advance(300);
  assert.ok(!ui.versus.ready); assert.equal($('natpf-guest-go').textContent, 'Sono pronto');
  $('natpf-guest-go').click(); w.advance(300);
  assert.ok(ui.versus.ready && !camOpen() && !ui.training.active);
});

test('Player 2 con la webcam: «Salta» nella prova in campo → pronto, motore di nuovo del Player 2', async () => {
  const w = await makeWorld({ controller: 'webcam', role: 'p2' }); w.advance(300);
  const { E, ui, mc } = w;
  $('natpf-guest-go').click(); await w.flush(); w.advance(300);
  // «In campo ›» senza aspettare la mano
  $('guest-cam-field').click(); w.advance(300);
  assert.ok(ui.training.active && E.playerRole === 'p1' && mc.localPractice);
  ui.training.skip(); w.advance(300);
  assert.ok(!ui.training.active && E.playerRole === 'p2' && E.isMultiplayer && !mc.localPractice);
  assert.ok(ui.versus.ready && mc.versusReady);
  assert.ok(visible('natpf-guest-modal') && !camOpen());
});

test('Player 2 con la webcam: la webcam che non si apre dice perché (negata, occupata, assente); «Indietro» torna al pannello', async () => {
  const w = await makeWorld({ controller: 'webcam', role: 'p2' }); w.advance(300);
  const { ui, mc } = w;
  let err = { name: 'NotAllowedError', message: 'Permission denied' };
  mc.enableWebcam = async () => { if (err){ mc.webcamError = err; return false; } mc.webcamError = null; mc.webcamActive = true; return true; };
  $('natpf-guest-go').click(); await w.flush(); w.advance(300);
  assert.ok(camOpen() && !mc.webcamActive);
  assert.equal($('guest-cam-badge').textContent, 'Webcam negata');
  assert.match($('guest-cam-text').textContent, /negato.*fotocamera/);
  assert.equal($('guest-cam-dot').className, 'setup-dot ko');
  assert.ok(visible('guest-cam-go'), '«Accendi la webcam» per riprovare');
  assert.ok($('guest-cam-field').disabled, 'in campo solo con la webcam accesa');
  $('guest-cam-field').click(); w.advance(300);
  assert.ok(!ui.training.active);
  err = { name: 'NotReadableError', message: 'Device in use' };
  $('guest-cam-go').click(); await w.flush(); w.advance(300);
  assert.equal($('guest-cam-badge').textContent, 'Webcam occupata'); assert.match($('guest-cam-text').textContent, /OBS/);
  err = { name: 'NotFoundError', message: '' };
  $('guest-cam-go').click(); await w.flush(); w.advance(300);
  assert.equal($('guest-cam-badge').textContent, 'Nessuna webcam');
  // chiuso l'altro programma: «Accendi la webcam» la accende
  err = null;
  $('guest-cam-go').click(); await w.flush(); w.advance(300);
  assert.ok(mc.webcamActive && !visible('guest-cam-go') && !$('guest-cam-field').disabled);
  // «Indietro»: di nuovo il pannello del P2, non pronto
  $('guest-cam-back').click(); w.advance(300);
  assert.ok(!camOpen() && visible('natpf-guest-modal') && !ui.versus.ready);
  assert.equal($('natpf-guest-go').textContent, 'Accendi la webcam ›', 'la prova in campo non è ancora fatta');
});

test('Player 2 con la webcam: collegamento con l’host perso per un attimo → pannello del P2 con il motivo, poi di nuovo il pannello della webcam', async () => {
  const w = await makeWorld({ controller: 'webcam', role: 'p2' }); w.advance(300);
  const { E, ui } = w;
  E.roomStatus = { ...E.roomStatus, p1Online: true }; w.advance(300);
  $('natpf-guest-go').click(); await w.flush(); w.advance(300);
  assert.ok(camOpen());
  // l'host non si sente più (prima il pannello della webcam si chiudeva e si ripartiva dal pannello del P2)
  E.roomStatus = { ...E.roomStatus, p1Online: false }; E.versusGuest = { ...(E.versusGuest || {}), everLinked: true }; w.advance(300);
  assert.equal(ui.versus.guest, 'lost');
  assert.ok(!camOpen() && visible('natpf-guest-modal'), 'il pannello del P2 dice che il collegamento è perso');
  E.roomStatus = { ...E.roomStatus, p1Online: true }; w.advance(300);
  assert.equal(ui.versus.guest, 'lobby');
  assert.ok(camOpen() && !visible('natpf-guest-modal'), 'collegamento tornato: di nuovo il pannello della webcam');
  // con la mano vista si va in campo come prima
  handSeen(w); w.advance(1000);
  assert.ok(ui.training.active && !camOpen());
});

test('Player 2: cambiare racchetta da pronto con una che va preparata toglie «pronto»; mouse e tastiera restano immediati', async () => {
  const w = await makeWorld({ controller: 'mouse', role: 'p2' }); w.advance(300);
  const { E, ui } = w;
  E.roomStatus = { ...E.roomStatus, p1Online: true }; w.advance(300);
  assert.equal($('natpf-guest-go').textContent, 'Sono pronto');
  $('natpf-guest-go').click(); w.advance(300);
  assert.ok(ui.versus.ready, 'mouse e tastiera (modalità prova): pronto subito, come prima');
  ui.selectController('webcam', { open: false }); w.advance(300);
  assert.ok(!ui.versus.ready, 'con la webcam ancora spenta non si è pronti');
  assert.equal($('natpf-guest-go').textContent, 'Accendi la webcam ›');
  ui.selectController('mouse', { open: false }); w.advance(300);
  assert.equal($('natpf-guest-go').textContent, 'Sono pronto');
});

test('P2 e host: motivi della webcam detti subito (la soglia comprende già la tolleranza), testi per host e P2', () => {
  for (const why of ['webcam spenta', 'webcam ferma', 'mano persa']){
    assert.equal(createHoldReporter().update(why, 0), why, why);
    const t = hostHoldText(why, { p2Name: 'Bea' });
    assert.match(t.title, /webcam di Bea/); assert.match(t.text, /ferma per tutti e due/);
    const n = guestHoldNotice({ who: 'p2', why }, { webcamText: 'testo' });
    assert.ok(n.webcam && !n.phone && n.text === 'testo' && /webcam/.test(n.title), why);
  }
  assert.equal(opponentHealth({ hold: 'mano persa' }).why, 'mano persa');
  assert.equal(p2HoldWhy({ playing: true, health: webcamHealth({ active: false }) }), 'webcam spenta');
  assert.equal(p2HoldWhy({ playing: true, health: webcamHealth({ active: true, model: true, handAgeMs: 900 }, { rally: true }) }), 'mano persa');
  assert.equal(p2HoldWhy({ playing: true, health: webcamHealth({ active: true, model: true, handAgeMs: 900 }) }), null, 'fuori dallo scambio si aspetta di più');
  assert.match(guestText('lobby', { webcam: true }), /Accendi la webcam/);
});

// P2 in partita con la webcam (collegato, partita in corso nello snapshot dell'host)
async function guestWebcamMatch(){
  const w = await makeWorld({ controller: 'webcam', role: 'p2' }); w.advance(300);
  const { E, ui, mc } = w;
  $('natpf-guest-go').click(); await w.flush(); w.advance(300);
  $('guest-cam-field').click(); w.advance(300); ui.training.skip(); w.advance(300);
  assert.ok(ui.versus.ready);
  let health = { active: true, model: true, handAgeMs: 0, frameAgeMs: 30 };
  mc.webcamHealth = () => ({ ...health, active: mc.webcamActive });
  const play = () => { E.roomStatus = { ...E.roomStatus, p1Online: true }; E.versusGuest = { ...(E.versusGuest || {}), lobby: false, closed: false, invalidSince: 0, everLinked: true, lastSnapshotAt: performance.now() }; };
  play(); w.advance(300);
  assert.equal(ui.versus.guest, 'playing');
  return { ...w, play, setHealth: h => { health = { ...health, ...h }; } };
}

test('Player 2 in partita: webcam spenta → lo dice all’host; il riquadro sul P2 la fa riaccendere', async () => {
  const w = await guestWebcamMatch();
  const { E, ui, mc, play } = w;
  assert.equal(mc.versusHold, '', 'tutto a posto');
  mc.disableWebcam(); play(); w.advance(300);
  assert.equal(mc.versusHold, 'webcam spenta', 'detto all’host con la lettura dello stato (hold)');
  // l'host ferma la partita e lo dice nello snapshot: il P2 vede perché e come rimediare
  E.versusGuest.hold = { who: 'p2', why: 'webcam spenta' }; play(); w.advance(300);
  assert.ok(visible('natpf-phone-hold'));
  const box = $('natpf-phone-hold');
  assert.equal(box.querySelector('b').textContent, 'La tua webcam è in pausa');
  assert.match(box.querySelector('p').textContent, /Accendi la webcam/);
  assert.equal(box.querySelector('button').textContent, 'Accendi la webcam');
  box.querySelector('button').click(); await w.flush(); play(); w.advance(300);
  assert.ok(mc.webcamActive);
  assert.equal(mc.versusHold, '', 'webcam di nuovo accesa: l’host riprende con il conto alla rovescia');
  E.versusGuest.hold = null; play(); w.advance(300);
  assert.ok(!visible('natpf-phone-hold'));
  void ui;
});

test('Player 2 in partita: mano persa a lungo nello scambio → detto all’host; torna solo con la mano vista adesso', async () => {
  const w = await guestWebcamMatch();
  const { E, mc, play, setHealth } = w;
  E.phase = 'RALLY';
  setHealth({ handAgeMs: 500 }); play(); w.advance(300);
  assert.equal(mc.versusHold, '', 'sotto la soglia del Player 1 (0,8 s nello scambio) si continua');
  setHealth({ handAgeMs: 900 }); play(); w.advance(300);
  assert.equal(mc.versusHold, 'mano persa');
  E.versusGuest.hold = { who: 'p2', why: 'mano persa' };
  setHealth({ handAgeMs: 500 }); play(); w.advance(300);
  assert.equal(mc.versusHold, 'mano persa', 'già in pausa: la mano deve vedersi adesso');
  setHealth({ handAgeMs: 50 }); play(); w.advance(300);
  assert.equal(mc.versusHold, '');
  assert.equal($('natpf-phone-hold').querySelector('b').textContent, 'La tua webcam è in pausa');
  // webcam ferma (nessun fotogramma da più di un secondo)
  E.versusGuest.hold = null; setHealth({ frameAgeMs: 1500 }); play(); w.advance(300);
  assert.equal(mc.versusHold, 'webcam ferma');
  void fetches;
});

test('host: il motivo della webcam del P2 ferma la partita per tutti e due con il testo della webcam', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, lobby, hud, ui } = w;
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('match'); w.advance(300);
  E.roomStatus = { ...E.roomStatus, p2Online: true, p2Ready: true }; w.advance(400);
  w.pressStart(); w.advance(300); if (ui.training?.active) ui.training.skip(); w.advance(300);
  E.phase = 'RALLY'; E.ball.inPlay = true;
  E.roomStatus = { ...E.roomStatus, p2Online: true, p2Hold: 'mano persa' }; w.advance(300);
  assert.ok(ui.versus.waiting && E.natpfPaused && visible('natpf-versus-wait'));
  assert.match($('natpf-versus-wait').querySelector('#natpf-versus-wait-title').textContent, /webcam di Player 2 non vede la mano/);
  E.roomStatus = { ...E.roomStatus, p2Hold: null }; w.advance(4000);
  assert.ok(!ui.versus.waiting && !E.natpfPaused);
});
