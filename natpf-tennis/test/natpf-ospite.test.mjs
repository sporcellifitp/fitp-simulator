// B38 · «Gioca come Ospite» (decisione dell'utente del 14/11): nel foglio del nome («Come ti chiami?» e «Il tuo nickname»)
// un clic e si gioca senza nome come «Ospite», fuori classifica. Regola resa esplicita: senza nome = «Ospite» = fuori
// classifica (minigiochi e partite contro la CPU); record, medaglie ed esperienza restano nel contenitore «Ospite» di oggi.
// Interfaccia vera sul motore senza disegno (test/ui-world.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, visible } from './ui-world.mjs';
import { ranked, addMatch, freshBoard, topMatches, GUEST_KEY, validNickname } from '../src/natpf/natpf_events.js';
import { cpuPill } from '../src/natpf/natpf_match_stats.js';

test('regola: in classifica solo con un nome; la pillola finale dell\'ospite dice «fuori classifica»', () => {
  assert.equal(ranked(''), false); assert.equal(ranked('   '), false); assert.equal(ranked(null), false);
  assert.equal(ranked('Marco'), true);
  // «Ospite» non si sceglie come nome (in classifica non compare mai)
  for (const n of ['Ospite', ' ospite ', 'OSPITE']) assert.equal(validNickname(n).ok, false, n);
  assert.match(validNickname('Ospite').why, /senza nome/);
  assert.equal(validNickname('Ospite 2').ok, true, 'un nome che contiene la parola va bene');
  assert.equal(cpuPill({ won: true, rank: { guest: true, score: 312 } }), '312 punti · Ospite, fuori classifica');
  assert.equal(cpuPill({ won: true, rank: { guest: true, score: 0 } }), 'Ospite, fuori classifica');
  assert.equal(cpuPill({ won: true, rank: { rank: 2, total: 5, score: 300 } }), '2° posto nella classifica di oggi', 'con il nome come prima');
  // la classifica pura non cambia: chi la chiama con un nome entra
  const r = addMatch(freshBoard(null, '2026-11-14'), { nick: 'Bea', level: 'evento', won: 10, lost: 5, games: [1, 0], win: true }, { day: '2026-11-14', at: 1 });
  assert.equal(r.rank, 1); assert.equal(topMatches(r.board, 10, '2026-11-14')[0].nick, 'Bea');
});

test('minigioco: «Gioca come Ospite» con un clic, si gioca, fuori dalla classifica; il record personale resta', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby } = w;
  lobby.menu('challenges'); lobby.pickChallenge('rush');
  assert.ok(visible('natpf-nick'), 'foglio «Il tuo nickname»');
  assert.equal($('nick-title').textContent, 'Il tuo nickname');
  assert.ok(visible('nick-cancel'), 'nei minigiochi resta «Indietro»');
  $('nick-guest').click();
  assert.ok(!visible('natpf-nick'), 'un clic e il foglio si chiude');
  assert.equal(ui.events.guest, true); assert.equal(ui.events.nickname, '');
  assert.equal(sessionStorage.getItem(GUEST_KEY), '1', 'per la sessione della pagina, come il nickname');
  assert.equal(lobby.step, 'controller', 'si va avanti verso il minigioco');
  lobby.go('connect'); lobby.next(); w.advance(1000);
  assert.equal(ui.events.active?.id, 'rush');
  ui.events.active.score = 420; ui.events.finish();
  assert.equal(ui.events.top('rush').length, 0, 'fuori classifica');
  assert.equal(ui.events.record('rush').best, 420, 'record personale dell’ospite');
  assert.equal(lobby.lastResult.guest, true); assert.equal(lobby.lastResult.nick, 'Ospite');
  assert.equal($('result-rank').textContent, 'Fuori classifica: hai giocato come Ospite');
  assert.match($('lobby-t-result').textContent, /Ospite!/);
  // secondo minigioco: il nome non si chiede di nuovo
  lobby.go('menu'); lobby.menu('challenges'); lobby.pickChallenge('precision');
  assert.ok(!visible('natpf-nick')); assert.equal(lobby.step, 'controller');
  assert.equal($('challenge-nick-note').textContent, 'Giochi come Ospite: fuori classifica.');
});

test('con il nome si entra in classifica; il nome toglie «Ospite»; «Nuovo giocatore» e il chiosco lo azzerano', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui, lobby } = w;
  ui.events.playAsGuest(); assert.equal(ui.events.guest, true);
  ui.events.nickname = 'Bea'; assert.equal(ui.events.guest, false, 'un nome toglie «Ospite»');
  lobby.menu('challenges'); lobby.pickChallenge('rush'); lobby.go('connect'); lobby.next(); w.advance(1000);
  ui.events.active.score = 300; ui.events.finish();
  assert.deepEqual(ui.events.top('rush').map(e => e.nick), ['Bea']);
  assert.equal(lobby.lastResult.guest, false); assert.match($('result-rank').textContent, /1° posto su 1 di oggi/);
  // «Nuovo giocatore» dal risultato: passo del nome con «Gioca come Ospite» al posto di «Salta»
  ui.events.playAsGuest();
  lobby._resultAction('new');
  assert.equal(ui.events.guest, false, '«Nuovo giocatore»: chi arriva non ha ancora scelto');
  assert.ok(visible('natpf-nick')); assert.equal($('nick-title').textContent, 'Come ti chiami?');
  assert.ok(!visible('nick-cancel'), '«Salta» nascosto: c\'è «Gioca come Ospite»');
  $('nick-guest').click(); w.advance(500);
  assert.equal(ui.events.guest, true);
  ui.kiosk.reset(); assert.equal(ui.events.guest, false, 'stand libero: il prossimo non è ospite');
});

test('partita contro la CPU senza nome: niente riga in classifica, la schermata finale dice «Ospite, fuori classifica»', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { ui } = w;
  const r = ui.events.recordMatch({ level: 'evento', won: 12, lost: 6, games: [1, 0], win: true });
  assert.equal(r.guest, true); assert.equal(r.rank, 0); assert.ok(r.score > 0);
  assert.equal(ui.events.topMatches(10).length, 0);
  ui.events.nickname = 'Ada';
  const n = ui.events.recordMatch({ level: 'evento', won: 12, lost: 6, games: [1, 0], win: true });
  assert.equal(n.guest, undefined); assert.equal(n.rank, 1);
  assert.deepEqual(ui.events.topMatches(10).map(e => e.nick), ['Ada']);
  // _matchEnded passa «guest» alla pillola della schermata finale
  ui.events.nickname = ''; ui.events.playAsGuest();
  const m = { mode: 'cpu', doubles: false, guest: false, level: 'evento', s: { player: { points: 12 }, opponent: { points: 6 } }, games: [{ winner: 'player' }], winner: 'player' };
  ui._matchEnded(m);
  assert.equal(ui.stats.rank.guest, true);
  assert.match(cpuPill({ won: true, level: 'evento', rank: ui.stats.rank }), /Ospite, fuori classifica/);
  assert.equal(ui.events.topMatches(10).length, 1, 'solo Ada');
});
