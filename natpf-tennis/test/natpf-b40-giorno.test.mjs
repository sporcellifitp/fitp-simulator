// B40.3 · prima partita di chi gioca e record di oggi delle partite di questo computer (natpf_events.js, natpf_ui.js):
// «Prima volta» alla prima partita, non alla seconda, di nuovo dopo «Nuovo giocatore», «Prossimo giocatore», il chiosco e
// un nome diverso; con lo stesso nome già in classifica oggi no; stesso schermo per giocatore. Record di oggi: primo
// valore, pareggio, più basso (resta quello di prima), giorno nuovo e «Azzera oggi» da capo, CSV uguale, niente nomi.
// Interfaccia vera sul motore senza disegno (test/ui-world.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './ui-world.mjs';
import { resetFairVisitor } from '../src/natpf/natpf_new_player.js';
import { noteBest, bestOfDay, freshBoard, addMatch, boardCsv, playedToday, VISITOR_MATCHES_KEY } from '../src/natpf/natpf_events.js';

const DAY = '2026-11-15';

test('B40.3: record di oggi (funzione pura): primo valore, pari, più basso, giorno nuovo', () => {
  let b = freshBoard(null, DAY);
  let r = noteBest(b, { kmh: 118, scambio: 12 }, { day: DAY, at: 1 }); b = r.board;
  assert.deepEqual(r.kmh, { value: 118, mine: true, tie: false, prev: 0 });
  assert.deepEqual(r.scambio, { value: 12, mine: true, tie: false, prev: 0 });
  r = noteBest(b, { kmh: 118, scambio: 9 }, { day: DAY, at: 2 }); b = r.board;
  assert.deepEqual(r.kmh, { value: 118, mine: true, tie: true, prev: 118 }, 'pari: è record anche questo');
  assert.deepEqual(r.scambio, { value: 12, mine: false, tie: false, prev: 12 }, 'più basso: resta quello di prima, da battere');
  r = noteBest(b, { kmh: 131, scambio: 0 }, { day: DAY, at: 3 }); b = r.board;
  assert.equal(r.kmh.value, 131); assert.equal(r.kmh.prev, 118); assert.equal(r.scambio.mine, false, 'zero non è un record');
  assert.deepEqual(bestOfDay(b, DAY), { kmh: 131, scambio: 12 });
  assert.deepEqual(bestOfDay(b, '2026-11-16'), { kmh: 0, scambio: 0 }, 'il giorno dopo si riparte');
  r = noteBest(b, { kmh: 50, scambio: 3 }, { day: '2026-11-16', at: 4 });
  assert.equal(r.kmh.mine, true); assert.equal(r.kmh.prev, 0);
  // il CSV non cambia con i record (niente righe nuove, niente nomi)
  const m = addMatch(freshBoard(null, DAY), { nick: 'Bea', level: 'evento', won: 4, lost: 1, games: [1, 0], win: true }, { day: DAY, at: 9 }).board;
  assert.equal(boardCsv(noteBest(m, { kmh: 140, scambio: 30 }, { day: DAY, at: 10 }).board), boardCsv(m));
  assert.ok(!JSON.stringify(noteBest(m, { kmh: 140 }, { day: DAY }).board.best).includes('Bea'), 'nel record solo il valore');
  assert.equal(playedToday(m, 'bea', DAY), true); assert.equal(playedToday(m, 'Ada', DAY), false); assert.equal(playedToday(m, '', DAY), false);
});

// una partita di un game contro la CPU (o nello stesso schermo) finita con i punti del motore
function playMatch(w, { winner = 'player', kmh = 0, strokes = 6 } = {}){
  const { E } = w;
  E.autoPlayMode = false; E.userHasInteracted = true;
  E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 1;
  if (kmh) E.natpfStats.shot(E, { role: 'p1', grade: 'PERFECT', kmh });
  for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++){ E.ball.rallyStrokeCount = strokes; E._awardPoint(winner, 'Out'); }
  assert.equal(E.phase, 'MATCH_OVER');
  return E.natpfStats.endView(E);
}

test('B40.3: «Prima volta» contro la CPU: prima partita sì, seconda no, di nuovo con un visitatore nuovo', async () => {
  const w = await makeWorld({ controller: 'mouse', difficulty: 'evento' }); w.advance(300);
  const { ui, E } = w;
  E.matchConfig.difficulty = 'evento';
  ui.events.nickname = 'Ada';
  let v = playMatch(w, { kmh: 100 });
  assert.deepEqual(v.first, { player: true, opponent: false }, 'prima partita di Ada');
  assert.equal(v.record.kmh.value, 100); assert.equal(v.record.kmh.mine, true); assert.equal(v.record.kmh.side, 'player');
  assert.equal(v.record.scambio.value, 6);
  assert.equal(sessionStorage.getItem(VISITOR_MATCHES_KEY), '1');
  v = playMatch(w, { kmh: 90 });
  assert.equal(v.first.player, false, 'la seconda no');
  assert.equal(v.record.kmh.mine, false); assert.equal(v.record.kmh.value, 100, 'il record da battere'); assert.equal(v.record.kmh.side, null);
  // «Nuovo giocatore»: chi arriva gioca la sua prima partita
  ui.newPlayer();
  assert.equal(ui.events.visitorMatches, 0);
  ui.events.nickname = 'Bea';
  v = playMatch(w);
  assert.equal(v.first.player, true, 'Bea: prima partita');
  // un nome diverso (senza «Nuovo giocatore") è un visitatore nuovo; lo stesso nome già in classifica oggi no
  ui.events.nickname = 'Cia';
  assert.equal(playMatch(w).first.player, true, 'Cia');
  ui.events.nickname = 'Ada';
  assert.equal(playMatch(w).first.player, false, 'Ada ha già una partita di oggi in classifica');
  // ospite senza nome: la prima sì, la seconda no; il chiosco (forgetGuest) azzera
  ui.events.playAsGuest();
  assert.equal(playMatch(w).first.player, true);
  assert.equal(playMatch(w).first.player, false);
  ui.events.forgetGuest();
  assert.equal(playMatch(w).first.player, true, 'dopo il chiosco o «Nuovo giocatore»');
  // (chi ha giocato senza nome e poi lo scrive resta la stessa persona: niente «Prima volta» nuova)
  ui.events.nickname = 'Dario';
  assert.equal(playMatch(w).first.player, false);
  // «Prossimo giocatore» della modalità fiera
  resetFairVisitor(ui);
  ui.events.nickname = 'Visitatore 7';
  assert.equal(playMatch(w).first.player, true);
  assert.equal(playMatch(w).first.player, false);
  resetFairVisitor(ui);
  assert.equal(ui.events.visitorMatches, 0);
  ui.events.nickname = 'Visitatore 8';
  assert.equal(playMatch(w).first.player, true, 'il visitatore dopo');
  // «Azzera oggi»: i record di oggi da capo
  ui.events.resetBoard();
  assert.deepEqual(bestOfDay(ui.events.board), { kmh: 0, scambio: 0 });
});

test('B40.3: stesso schermo, «Prima volta» per ciascun giocatore e record di chi ha fatto il colpo più forte', async () => {
  const w = await makeWorld({ controller: 'mouse', difficulty: 'evento' }); w.advance(300);
  const { ui, E } = w;
  E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' };
  E.startSplit();
  E.autoPlayMode = false; E.userHasInteracted = true;
  E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 1;
  E.natpfStats.shot(E, { role: 'p1', grade: 'PERFECT', kmh: 96 }); E.natpfStats.shot(E, { role: 'p2', grade: 'PERFECT', kmh: 104 });
  for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++){ E.ball.rallyStrokeCount = 3; E._awardPoint('opponent', 'Out'); }
  let v = E.natpfStats.endView(E);
  assert.equal(v.mode, 'split');
  assert.deepEqual(v.first, { player: true, opponent: true });
  assert.equal(v.record.kmh.side, 'opponent', 'il colpo più forte è di Marco');
  // seconda partita degli stessi due: niente «Prima volta»; Marco cambia nome → nuovo giocatore
  assert.deepEqual(ui.split.notePlayed(), { player: false, opponent: false });
  E.natpfSplitNames = { p1: 'Giulia', p2: 'Luca' };
  assert.deepEqual(ui.split.notePlayed(), { player: false, opponent: true });
  ui.split.resetNames();
  assert.deepEqual(ui.split.notePlayed(), { player: true, opponent: true }, '«Nuovo giocatore» (nomi da capo)');
});
