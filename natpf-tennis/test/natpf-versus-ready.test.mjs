// Sfida un amico (due computer): stato «pronto» dei due giocatori (B9, punto 4 della richiesta del 05/11; analisi in
// docs/b9/analisi-pronto-1v1.md §4.2). Prima «Sono pronto ✓» e «Pronto ✓» erano lo stesso pulsante giallo (la classe
// «selected» non aveva stile), un secondo clic toglieva il pronto senza dirlo, il P2 non sapeva se l'host l'aveva
// ricevuto e sull'host «Gioca» era giallo anche spento. Ora: schede per giocatore, pulsante verde pieno con «Annulla» a
// parte, conferma del relay, «Gioca» grigio finché non si può.
// node --import ./test/register.mjs --test test/natpf-versus-ready.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, visible } from './ui-world.mjs';
import { hostInfo, readyEcho, guestBoard, hostBoard, READY_ECHO_MS, guestLine } from '../src/natpf/natpf_versus.js';

const pick = views => views.map(v => `${v.name}${v.you ? '(tu)' : ''}:${v.state}:${v.badge}:${v.detail}`);

test('racchetta dell’host e conferma del «pronto» (funzioni pure)', () => {
  assert.deepEqual(hostInfo({ controller: 'mouse' }), { ready: true, detail: 'racchetta pronta' });
  assert.deepEqual(hostInfo({ controller: 'phone' }), { ready: false, detail: 'collega il telefono' });
  assert.equal(hostInfo({ controller: 'phone', phoneReady: true }).ready, true);
  assert.deepEqual(hostInfo({ controller: 'webcam' }), { ready: false, detail: 'prepara la webcam' });
  assert.equal(hostInfo({ controller: 'webcam', webcamActive: true }).ready, true);
  assert.equal(readyEcho({}), 'none');
  assert.equal(readyEcho({ ready: true, sinceMs: 100 }), 'sending');
  assert.equal(readyEcho({ ready: true, echoed: true, sinceMs: 9000 }), 'ok');
  assert.equal(readyEcho({ ready: true, sinceMs: READY_ECHO_MS }), 'late');
  assert.equal(readyEcho({ ready: false, echoed: true }), 'none', 'non pronto: la conferma vecchia non conta');
});

test('schede del Player 2: Player 1 dallo stato della sfida e dalla sua racchetta, «tu» con la conferma', () => {
  // prima di collegarsi
  assert.deepEqual(pick(guestBoard({})), ['Player 1:off:In attesa:mi collego…', 'Player 2(tu):prep:Si prepara:premi «Sono pronto»']);
  // in lobby: host senza informazioni (versione di prima) e con la racchetta pronta o no
  assert.equal(guestBoard({ guest: 'lobby' })[0].detail, 'prepara la partita');
  assert.deepEqual(pick(guestBoard({ guest: 'lobby', host: { ready: true, detail: 'racchetta pronta' }, hostName: 'Ada', guestName: 'Bea' })).slice(0, 1), ['Ada:ready:Pronto:racchetta pronta']);
  assert.equal(guestBoard({ guest: 'lobby', host: { ready: false, detail: 'collega il telefono' } })[0].state, 'prep');
  // «tu»: da preparare, pronto in invio, visto dall'host, non arriva
  assert.equal(guestBoard({ guest: 'lobby', phone: true })[1].detail, 'collega il telefono');
  assert.equal(guestBoard({ guest: 'lobby', webcam: true })[1].detail, 'accendi la webcam');
  assert.deepEqual(pick(guestBoard({ guest: 'lobby', ready: true, echo: 'sending', hostName: 'Ada' })).slice(1), ['Player 2(tu):ready:Pronto:invio a Ada…']);
  assert.deepEqual(pick(guestBoard({ guest: 'lobby', ready: true, echo: 'ok', hostName: 'Ada' })).slice(1), ['Player 2(tu):ready:Pronto:Ada lo vede ✓']);
  const late = guestBoard({ guest: 'lobby', ready: true, echo: 'late', hostName: 'Ada' })[1];
  assert.equal(late.state, 'prep'); assert.equal(late.badge, 'Non arriva'); assert.match(late.detail, /Ada non lo vede: controlla il collegamento/);
  // host perso, stanza chiusa o inesistente: la scheda del Player 1 è un problema, con la parola giusta
  assert.deepEqual(['lost', 'closed', 'invalid'].map(g => { const v = guestBoard({ guest: g })[0]; return `${v.state}:${v.badge}`; }), ['ko:Scollegato', 'ko:Uscito', 'ko:Non trovato']);
  // mai solo il colore: ogni scheda ha la parola e il nome nel testo per chi non vede (title/aria)
  for (const v of guestBoard({ guest: 'lobby', ready: true, echo: 'ok' })) assert.match(v.aria, new RegExp(`${v.name}.*${v.badge}`));
});

test('schede dell’host: «tu» con la racchetta, Player 2 in attesa · si prepara · pronto', () => {
  assert.deepEqual(pick(hostBoard('waiting', { host: { ready: true, detail: 'racchetta pronta' } })), ['Player 1(tu):ready:Pronto:racchetta pronta', 'Player 2:off:In attesa:mandagli il link']);
  assert.deepEqual(pick(hostBoard('joined', { p2Name: 'Bea' })).slice(1), ['Bea:prep:Si prepara:prepara la racchetta']);
  assert.deepEqual(pick(hostBoard('ready', { p2Name: 'Bea' })).slice(1), ['Bea:ready:Pronto:premi «Gioca»']);
  assert.equal(hostBoard('ready', { host: { ready: false, detail: 'collega il telefono' } })[0].state, 'prep');
  assert.equal(guestLine('lobby', { ready: true }).state, 'ready');
});

test('Player 2: «Sono pronto» → verde pieno «Pronto ✓», un secondo clic non lo toglie, «Annulla» sì; scheda con la conferma dell’host', async () => {
  const w = await makeWorld({ controller: 'mouse', role: 'p2' }); w.advance(300);
  const { E, ui, mc } = w;
  E.roomStatus = { ...E.roomStatus, p1Online: true, hostName: 'Ada' }; w.advance(300);
  const go = $('natpf-guest-go'), modal = $('natpf-guest-modal'), cancel = modal.querySelector('[data-versus-unready]');
  const slot = id => modal.querySelector('[data-versus-board]').querySelector(`[data-ready-slot="${id}"]`);
  const detail = id => slot(id).querySelector('[data-ready-detail]').textContent;
  assert.equal(go.textContent, 'Sono pronto', 'senza ✓: è un’azione da fare');
  assert.ok(!go.classList.contains('is-ready') && visible('natpf-guest-modal'));
  assert.ok(cancel.classList.contains('hidden'), '«Annulla» solo da pronti');
  assert.equal(slot('p2').dataset.ready, 'prep'); assert.equal(detail('p2'), 'premi «Sono pronto»');
  assert.equal(slot('p1').dataset.ready, 'prep', 'host di prima, senza la racchetta nello snapshot: si prepara');
  // clic: verde pieno subito, «Annulla» accanto, l'host lo riceve con la prossima lettura dello stato
  go.click(); w.advance(100);
  assert.ok(ui.versus.ready && mc.versusReady);
  assert.equal(go.textContent, 'Pronto ✓'); assert.ok(go.classList.contains('is-ready'));
  assert.ok(!go.classList.contains('selected'), 'non più la classe senza stile');
  assert.ok(!cancel.classList.contains('hidden'));
  assert.equal(slot('p2').dataset.ready, 'ready'); assert.equal(detail('p2'), 'invio a Ada…');
  // il relay rimanda p2Ready: «Ada lo vede ✓»
  E.roomStatus = { ...E.roomStatus, p2Ready: true }; w.advance(300);
  assert.equal(detail('p2'), 'Ada lo vede ✓');
  // un secondo clic sul pulsante verde: resta pronto (prima lo toglieva senza avviso)
  go.click(); w.advance(300);
  assert.ok(ui.versus.ready && mc.versusReady && go.classList.contains('is-ready'));
  // «Annulla»: non pronto, detto; il pulsante torna giallo «Sono pronto»
  cancel.click(); w.advance(300);
  assert.ok(!ui.versus.ready && !mc.versusReady);
  assert.equal(go.textContent, 'Sono pronto'); assert.ok(!go.classList.contains('is-ready'));
  assert.ok(cancel.classList.contains('hidden'));
  assert.match($('natpf-toast').textContent, /Non sei più pronto/);
  E.roomStatus = { ...E.roomStatus, p2Ready: false };
  // di nuovo pronto, ma la conferma non torna (collegamento che non porta): dopo 3 s la scheda lo dice
  go.click(); w.advance(READY_ECHO_MS - 500);
  assert.equal(slot('p2').dataset.ready, 'ready');
  w.advance(800);
  assert.equal(slot('p2').dataset.ready, 'prep'); assert.equal(slot('p2').querySelector('[data-ready-word]').textContent, 'Non arriva');
  E.roomStatus = { ...E.roomStatus, p2Ready: true }; w.advance(300);
  assert.equal(slot('p2').dataset.ready, 'ready'); assert.equal(detail('p2'), 'Ada lo vede ✓');
  // la riga di stato del P2 pronto è «ready» (fondo verde), non più uguale a «collegato»
  assert.equal(guestLine(ui.versus.guest, { ready: ui.versus.ready }).state, 'ready');
  // collegamento con l'host perso: l'ultimo p2Ready ricevuto resta vero, ma «lo vede» non vale più (prova nel browser)
  E.roomStatus = { ...E.roomStatus, p1Online: false }; E.versusGuest = { ...(E.versusGuest || {}), everLinked: true }; w.advance(300);
  assert.equal(ui.versus.guest, 'lost');
  assert.equal(slot('p1').dataset.ready, 'ko');
  assert.equal(detail('p2'), 'Ada non lo vede: controlla il collegamento', 'non più «Ada lo vede ✓»');
});

test('Player 2: la scheda del Player 1 dice la racchetta dell’host (snapshot della lobby) e il collegamento perso', async () => {
  const w = await makeWorld({ controller: 'mouse', role: 'p2' }); w.advance(300);
  const { E } = w;
  const slot = id => $('natpf-guest-modal').querySelector('[data-versus-board]').querySelector(`[data-ready-slot="${id}"]`);
  let seq = 0;
  const snap = snapshot => E._handleRoomStateUpdate({ p1Online: true, hostName: 'Ada', epoch: 'x', snapshotSeq: ++seq, snapshot });
  snap({ lobby: true, host: { ready: false, detail: 'collega il telefono' } }); w.advance(300);
  assert.equal(slot('p1').dataset.ready, 'prep'); assert.equal(slot('p1').querySelector('[data-ready-detail]').textContent, 'collega il telefono');
  assert.equal(slot('p1').querySelector('[data-ready-name]').textContent, 'Ada');
  snap({ lobby: true, host: { ready: true, detail: 'racchetta pronta' } }); w.advance(300);
  assert.equal(slot('p1').dataset.ready, 'ready');
  // host che non si sente più
  E._handleRoomStateUpdate({ p1Online: false, epoch: 'x', snapshotSeq: seq }); w.advance(300);
  assert.equal(slot('p1').dataset.ready, 'ko'); assert.equal(slot('p1').querySelector('[data-ready-word]').textContent, 'Scollegato');
});

test('host: schede nella barra dell’invito, «Gioca» grigio finché il Player 2 non è pronto; la racchetta va nello snapshot della lobby', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, lobby, hud, ui } = w;
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('match'); w.advance(300);
  const btn = $('btn-start-match'), board = $('natpf-invite').querySelector('[data-versus-board]');
  const slot = id => board.querySelector(`[data-ready-slot="${id}"]`);
  assert.ok(btn.disabled && btn.classList.contains('is-wait'), 'grigio neutro, non giallo spento');
  assert.ok(!btn.classList.contains('waiting'));
  assert.equal(slot('p1').dataset.ready, 'ready', 'mouse e tastiera: racchetta pronta');
  assert.equal(slot('p2').dataset.ready, 'off');
  E.roomStatus = { ...E.roomStatus, p2Online: true, guestName: 'Bea' }; w.advance(400);
  assert.equal(slot('p2').dataset.ready, 'prep'); assert.equal(slot('p2').querySelector('[data-ready-name]').textContent, 'Bea');
  assert.ok(btn.disabled && btn.classList.contains('is-wait'));
  E.roomStatus = { ...E.roomStatus, p2Ready: true }; w.advance(400);
  assert.equal(slot('p2').dataset.ready, 'ready');
  assert.ok(!btn.disabled && !btn.classList.contains('is-wait'), '«Gioca» cambia aspetto quando si può avviare');
  // il P2 annulla: «Gioca» di nuovo grigio
  E.roomStatus = { ...E.roomStatus, p2Ready: false }; w.advance(400);
  assert.ok(btn.disabled && btn.classList.contains('is-wait'));
  // snapshot della lobby per il P2: con la racchetta dell'host
  const real = globalThis.fetch, sent = [];
  globalThis.fetch = async (u, init) => { sent.push(JSON.parse(init.body)); return { ok: true, json: async () => ({}) }; };
  try { E._broadcastMultiplayerSnapshot(); } finally { globalThis.fetch = real; }
  assert.deepEqual(sent[0].snapshot.host, ui.versus.hostInfo());
  assert.deepEqual(sent[0].snapshot.host, { ready: true, detail: 'racchetta pronta' });
});
