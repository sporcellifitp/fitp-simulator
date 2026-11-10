// Fine partita (B18, difetto 4 e punto 18 del B16). Prima: nello stesso schermo, se vinceva il Player 2 compariva
// «Riprova!» con il nome «Tu», la voce diceva solo «Game», il banner dei punti scriveva «00» e a 40-40 non diceva «Parità»,
// il Player 2 correva il 2% più piano; a fine partita un rating finto (1145 se vinci, 1020 se perdi, grafico fisso).
// Ogni test fallisce con il codice di prima.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld, $ } from './ui-world.mjs';
import { pointCall, gameCall, matchEndView, rivalOf, callFromBroadcast, MATCH_VOICE } from '../src/natpf/natpf_point_call.js';
import { t as tr, scoreText } from '../src/natpf/natpf_i18n.js';

const NAMES = { player: 'Marco', opponent: 'Luca' };

test('stesso schermo, banner del punto: «0» e non «00», «Parità» a 40-40, vantaggio con il nome', () => {
  assert.equal(pointCall({ winner: 'player', why: 'Out', score: { player: '15', opponent: '00' }, sharedNames: NAMES }).subText, 'Errore di Luca: palla fuori · Marco 15 · Luca 0');
  assert.equal(pointCall({ winner: 'opponent', why: 'Net', score: { player: '00', opponent: '15' }, sharedNames: NAMES }).subText, 'Errore di Marco: palla in rete · Marco 0 · Luca 15');
  assert.equal(pointCall({ winner: 'player', why: 'Nice Shot!', score: { player: '40', opponent: '40' }, sharedNames: NAMES }).subText, 'Vincente di Marco · Parità');
  assert.equal(pointCall({ winner: 'opponent', why: 'Point', score: { player: '40', opponent: 'Ad' }, sharedNames: NAMES }).subText, 'Marco non ci arriva · Vantaggio Luca');
});

test('stesso schermo, game e partita: con il nome di chi vince («Vince Luca!»)', () => {
  assert.equal(gameCall({ winner: 'opponent', games: { player: 0, opponent: 1 }, sharedNames: NAMES }).text, 'Game Luca');
  const m = gameCall({ winner: 'opponent', games: { player: 0, opponent: 1 }, match: true, sharedNames: NAMES });
  assert.deepEqual([m.text, m.subText], ['Vince Luca!', 'Marco 0 · Luca 1']);
  // i testi passano intatti dalla traduzione dell'HUD
  for (const s of [m.text, 'Vince la CPU', 'Hai vinto!', 'Vince Marco!']) assert.equal(tr(scoreText(s)), s);
});

test('schermata finale: chi vince con il nome, i game dei due, la voce di fine partita per chiunque vinca', () => {
  // stesso schermo, vince il Player 2: il suo nome, titolo da festa (c'è qualcuno che ha vinto davanti allo schermo)
  const s = matchEndView({ winner: 'opponent', games: { player: 0, opponent: 1 }, sharedNames: NAMES });
  assert.equal(s.title, 'Vince Luca!'); assert.equal(s.won, true); assert.equal(s.voice, MATCH_VOICE);
  assert.deepEqual(s.rows, [{ name: 'Marco', games: 0, win: false }, { name: 'Luca', games: 1, win: true }]);
  assert.equal(s.score, '0-1');
  // contro la CPU: con il nome scelto, senza, e quando vince la CPU (non più «Riprova!»)
  assert.equal(matchEndView({ winner: 'player', games: { player: 1, opponent: 0 }, nickname: 'Ada' }).title, 'Vince Ada!');
  assert.equal(matchEndView({ winner: 'player', games: { player: 1, opponent: 0 } }).title, 'Hai vinto!');
  const lost = matchEndView({ winner: 'opponent', games: { player: 0, opponent: 1 }, nickname: 'Ada' });
  assert.deepEqual([lost.title, lost.won, lost.rows.map(r => r.name).join('/'), lost.score, lost.voice], ['Vince la CPU', false, 'Ada/CPU', '0-1', MATCH_VOICE]);
  // sfida tra due computer, sul computer del Player 2: la sua riga prima, il punteggio dal suo lato
  const g = matchEndView({ winner: 'opponent', games: { player: 1, opponent: 2 }, viewer: 'opponent', rival: rivalOf({ multiplayer: true, viewer: 'opponent' }), multiplayer: true });
  assert.deepEqual([g.title, g.won, g.score, g.rows[0].name, g.rows[1].name], ['Hai vinto!', true, '2-1', 'Tu', 'Player 1']);
  assert.equal(matchEndView({ winner: 'player', games: { player: 1, opponent: 0 }, viewer: 'opponent', rival: rivalOf({ multiplayer: true, viewer: 'opponent' }), multiplayer: true }).title, 'Vince Player 1!');
  // doppio contro le CPU
  assert.equal(matchEndView({ winner: 'opponent', doubles: true }).title, 'Vincono le CPU');
  assert.deepEqual(matchEndView({ winner: 'opponent', doubles: true, nickname: 'Ada' }).rows.map(r => r.name), ['Ada + CPU', '2 CPU']);
  // doppio in rete (revisione B18): ciascuno con la sua CPU, come la pagina «Partita»
  const d = matchEndView({ winner: 'player', games: { player: 1, opponent: 0 }, rival: rivalOf({ multiplayer: true, viewer: 'player' }), multiplayer: true, doubles: true });
  assert.deepEqual(d.rows.map(r => r.name), ['Tu + CPU', 'Player 2 + CPU']);
});

test('niente rating finto: la schermata finale non ha più numero, grafico e nome fisso «Tu»', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'), hud = readFileSync(new URL('../src/hud_ui.js', import.meta.url), 'utf8');
  const modal = html.slice(html.indexOf('<div id="victory-modal"'), html.indexOf('<!-- NATPF: smartphone come racchetta'));
  assert.ok(modal.length > 100);
  assert.doesNotMatch(modal, /skill-rating-value|skill-graph-canvas|Rating NATPF|1120/);
  assert.match(modal, /id="btn-new-player"/);
  assert.doesNotMatch(hud, /_drawSkillGraph|skill-rating-value|\? 1145 : 1020/);
});

// mondo di prova con l'audio che registra le voci
async function audioWorld(opts){
  const w = await makeWorld(opts); w.advance(300);
  const voices = [];
  w.E.audioEngine = new Proxy({ announceScore: v => voices.push(v) }, { get: (t, k) => (k in t ? t[k] : () => {}) });
  const shown = []; w.E.hud.showVictoryModal = a => { shown.push(a); $('victory-modal').classList.remove('hidden'); };
  return { ...w, voices, shown };
}

test('stesso schermo, vince il Player 2: banner, voce e schermata finale con il suo nome', async () => {
  const w = await audioWorld({ controller: 'mouse' }), { E } = w;
  E.natpfSplitNames = { p1: 'Marco', p2: 'Luca' };
  assert.equal(E.startSplit(), true);
  E.matchConfig.gamesToWin = 1; E.autoPlayMode = false; E.startNewMatch({ showStartBanner: false });
  for (let i = 0; i < 4; i++) E._awardPoint('opponent', 'Out');
  assert.equal(E.phase, 'MATCH_OVER');
  assert.equal(E.lastBannerBroadcast.text, 'Vince Luca!');
  assert.equal(w.voices.at(-1), 'Game Set and Match', 'prima diceva solo «Game» quando vinceva il Player 2');
  w.advance(2000);
  assert.equal(w.shown.length, 1);
  assert.equal(w.shown[0].view.title, 'Vince Luca!');
  assert.deepEqual(w.shown[0].view.rows.map(r => `${r.name} ${r.games}`), ['Marco 0', 'Luca 1']);
});

test('contro la CPU, vince la CPU: «Vince la CPU», con il nome di chi gioca nella sua riga, e la stessa voce di fine partita', async () => {
  const w = await audioWorld({ controller: 'mouse' }), { E, ui } = w;
  ui.events.nickname = 'Ada';
  w.pressStart(); E.matchConfig.gamesToWin = 1;
  for (let i = 0; i < 4; i++) E._awardPoint('opponent', 'Out');
  assert.equal(w.voices.at(-1), 'Game Set and Match');
  w.advance(2000);
  assert.equal(w.shown[0].view.title, 'Vince la CPU');
  assert.equal(w.shown[0].view.rows[0].name, 'Ada');
  assert.equal(w.shown[0].view.won, false);
});

test('sfida tra due computer: il Player 2 riceve la voce di fine partita e la sua schermata dal suo lato', async () => {
  const { E } = await makeWorld({ controller: 'mouse', role: 'p2' });
  const b = { kind: 'match', winner: 'opponent', games: { player: 0, opponent: 1 }, voice: MATCH_VOICE };
  assert.equal(callFromBroadcast(E, { call: b }).text, 'Partita tua!');
  assert.equal(E._natpfMatchEndView('opponent', { playerGames: 0, opponentGames: 1 }).title, 'Hai vinto!');
  assert.equal(E._natpfMatchEndView('player', { playerGames: 1, opponentGames: 0 }).title, 'Vince Player 1!');
});

test('1v1 (stesso schermo e due computer): i due giocatori corrono alla stessa velocità', async () => {
  const { E } = await makeWorld({ controller: 'mouse' });
  E._applyDifficultyTuning('1v1');
  assert.equal(E.opponent.maxSpeed, E.player.maxSpeed);
  assert.equal(E.opponentPartner.maxSpeed, E.playerPartner.maxSpeed);
  // contro la CPU restano le velocità del livello (la CPU di Leggenda più lenta di chi gioca)
  E._applyDifficultyTuning('leggenda');
  assert.ok(E.opponent.maxSpeed < E.player.maxSpeed);
});
