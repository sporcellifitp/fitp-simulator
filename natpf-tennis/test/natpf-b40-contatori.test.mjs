// B40.1 · contatori nuovi della partita per i trofei della card (natpf_match_stats.js): serie di punti, game a zero,
// rimonta in punti e in game, palle match annullate (formato classico, veloce, al meglio di 3), colpi a vuoto, servizi
// non rimandati, muro, computer del Player 2; il gioco resta identico con le statistiche (impronte).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import { eventoReset } from '../src/natpf/natpf_evento.js';
import { newMatch, addShot, addPoint, sideSummary, loveGames, gameComeback, installMatchStats, MatchStats } from '../src/natpf/natpf_match_stats.js';
import { gameWinner } from '../src/natpf/natpf_fair_format.js';
import { fingerprint } from '../scripts/audit/fine-partita.mjs';

// gioca una sequenza di punti ('p' chi gioca, 'o' l'avversario) con le regole del game (classico o veloce)
function play(seq, { gamesToWin = 1, fair = false, why = 'Point', strokes = 5, m = newMatch({ gamesToWin, fair }) } = {}){
  for (const c of seq.replace(/[^po]/g, '')){
    const winner = c === 'p' ? 'player' : 'opponent';
    const p = m.cur.player + (winner === 'player' ? 1 : 0), o = m.cur.opponent + (winner === 'opponent' ? 1 : 0);
    addPoint(m, { winner, why, strokes, gameWinner: gameWinner(p, o, { fair }) });
  }
  return m;
}

test('B40.1: serie di punti vinti di fila per lato', () => {
  const m = play('ppoppp', { gamesToWin: 3 });
  assert.equal(m.s.player.streak, 3, 'la serie più lunga di chi gioca');
  const s = sideSummary(m, 'player'), o = sideSummary(m, 'opponent');
  assert.equal(s.streak, 3); assert.equal(o.streak, 1);
  assert.equal(sideSummary(play('opppp'), 'player').streak, 4);
});

test('B40.1: game vinti a zero dai game contati', () => {
  assert.equal(loveGames(play('pppp'), 'player'), 1);
  assert.equal(loveGames(play('ppopp'), 'player'), 0);
  // al meglio di 3: 4-0, 2-4, 4-0
  const m = play('pppp' + 'ppoooo' + 'pppp', { gamesToWin: 2 });
  assert.equal(m.over, true); assert.equal(m.winner, 'player');
  assert.equal(loveGames(m, 'player'), 2);
  assert.equal(loveGames(m, 'opponent'), 0, '4-2 non è a zero');
  assert.equal(sideSummary(m, 'player').love, 2);
  assert.equal(sideSummary(m, 'player').gamesPlayed, 3);
});

test('B40.1: rimonta in punti, palle match annullate', () => {
  // da 0-30 in una partita di un game: 0-30 non è palla match
  let m = play('oopppp');
  let s = sideSummary(m, 'player');
  assert.equal(s.comeback, 2); assert.equal(s.mpSaved, 0); assert.equal(s.won, true);
  // da 0-40: tre palle match annullate, cinque punti di fila
  m = play('ooopppp' + 'p');
  s = sideSummary(m, 'player');
  assert.equal(s.comeback, 3); assert.equal(s.mpSaved, 3); assert.equal(s.streak, 5);
  // ai vantaggi: 40-40, vantaggio CPU (palla match), parità, vantaggio, game
  m = play('pppooo' + 'o' + 'p' + 'pp');
  s = sideSummary(m, 'player');
  assert.equal(s.mpSaved, 1, 'una palla match ai vantaggi');
  assert.equal(m.winner, 'player');
  // chi perde la partita non annulla niente che conti: la palla match della CPU si conta solo se il punto va a chi gioca
  m = play('ppppp'.slice(0, 0) + 'oooo');
  assert.equal(sideSummary(m, 'player').mpSaved, 0);
});

test('B40.1: palle match al meglio di 3 e nel formato veloce', () => {
  // game 1-1, nel decisivo 30-40 salvato
  let m = play('pppp' + 'oooo' + 'ppooo' + 'pp' + 'pp', { gamesToWin: 2 });
  assert.equal(m.winner, 'player');
  assert.equal(sideSummary(m, 'player').mpSaved, 1);
  // lo stesso 30-40 salvato nel primo game non è palla match (alla CPU mancava ancora un game)
  m = play('ppooo' + 'pp' + 'pp' + 'pppp', { gamesToWin: 2 });
  assert.equal(m.winner, 'player');
  assert.equal(sideSummary(m, 'player').mpSaved, 0);
  // formato veloce: 3-3 punto decisivo nell'ultimo game, vinto → una palla match annullata (anche l'altro ne aveva una)
  m = play('pppooo' + 'p', { fair: true });
  assert.equal(m.winner, 'player');
  assert.equal(sideSummary(m, 'player').mpSaved, 1);
  // formato veloce, 30-40 e poi 40-40: annullata la palla match del 30-40 e vinto il punto decisivo
  m = play('ppooo' + 'p' + 'p', { fair: true });
  assert.equal(sideSummary(m, 'player').mpSaved, 2);
});

test('B40.1: rimonta in game (partita vinta da sotto)', () => {
  const m = play('oooo' + 'pppp' + 'pppp', { gamesToWin: 2 });
  assert.equal(gameComeback(m, 'player'), 1);
  assert.equal(gameComeback(m, 'opponent'), 0, 'solo chi vince la partita');
  assert.equal(sideSummary(m, 'player').gameComeback, 1);
  assert.equal(gameComeback(play('pppp' + 'oooo' + 'pppp', { gamesToWin: 2 }), 'player'), 0);
});

test('B40.1: colpi a vuoto (gesti senza palla) senza toccare il voto del tempo', () => {
  const m = newMatch();
  addShot(m, { side: 'player', grade: 'PERFECT', kmh: 90 });
  addShot(m, { side: 'player', grade: 'WHIFF' });
  addShot(m, { side: 'player', grade: 'TOO LATE' });
  addShot(m, { side: 'player', grade: '' });
  const s = sideSummary(m, 'player');
  assert.equal(s.missed, 2);
  assert.equal(s.rated, 1);
  assert.equal(s.shots, 4);
});

test('B40.1: servizi non rimandati in campo (ace e risposta sbagliata), solo di chi ha battuto', () => {
  const m = newMatch({ gamesToWin: 5 });
  // ace
  addShot(m, { side: 'player', grade: 'GOOD SERVE', kmh: 120, serve: true });
  addPoint(m, { winner: 'player', why: 'Nice Shot!', strokes: 1 });
  // risposta in rete
  addShot(m, { side: 'player', grade: 'GOOD SERVE', kmh: 120, serve: true });
  addPoint(m, { winner: 'player', why: 'Net', strokes: 2 });
  // risposta a vuoto
  addShot(m, { side: 'player', grade: 'GOOD SERVE', kmh: 120, serve: true });
  addPoint(m, { winner: 'player', why: 'Point', strokes: 1, whiff: true });
  // scambio vero: non conta
  addShot(m, { side: 'player', grade: 'GOOD SERVE', kmh: 120, serve: true });
  addShot(m, { side: 'player', grade: 'PERFECT', kmh: 100 });
  addPoint(m, { winner: 'player', why: 'Nice Shot!', strokes: 3 });
  // servizio della CPU (non arriva qui) e risposta vincente di chi gioca: non è un suo servizio
  addPoint(m, { winner: 'player', why: 'Nice Shot!', strokes: 2 });
  // doppio fallo di chi gioca
  addShot(m, { side: 'player', grade: 'GOOD SERVE', kmh: 120, serve: true });
  addPoint(m, { winner: 'opponent', why: 'Out', strokes: 1 });
  const s = sideSummary(m, 'player');
  assert.equal(s.unreturned, 3);
  assert.equal(s.aces, 1);
  // computer del Player 2: il motivo non arriva, niente servizi non rimandati
  const g = newMatch({ guest: true });
  addShot(g, { side: 'opponent', grade: 'GOOD SERVE', kmh: 120, serve: true });
  addPoint(g, { winner: 'opponent', why: null, strokes: 1 });
  assert.equal(sideSummary(g, 'opponent').unreturned, 0);
});

test('B40.1: muro, colpi di gioco rimandati in campo di fila', () => {
  const m = newMatch({ gamesToWin: 9 });
  // servizio (non conta) e tre colpi di gioco, poi la CPU sbaglia: 3 di fila
  addShot(m, { side: 'player', grade: 'GOOD SERVE', serve: true });
  for (let i = 0; i < 3; i++) addShot(m, { side: 'player', grade: 'PERFECT', kmh: 80 });
  addPoint(m, { winner: 'player', why: 'Out', strokes: 7 });
  assert.equal(sideSummary(m, 'player').wall, 3);
  // altri due colpi buoni, poi il terzo in rete: la serie (3 + 2 = 5) si ferma e riparte da zero
  for (let i = 0; i < 3; i++) addShot(m, { side: 'player', grade: 'PERFECT', kmh: 80 });
  addPoint(m, { winner: 'opponent', why: 'Net', strokes: 6 });
  assert.equal(sideSummary(m, 'player').wall, 5);
  assert.equal(m.s.player.wall.run, 0);
  // vincente: l'ultimo colpo conta
  addShot(m, { side: 'player', grade: 'PERFECT', kmh: 80 });
  addPoint(m, { winner: 'player', why: 'Nice Shot!', strokes: 4 });
  assert.equal(m.s.player.wall.run, 1);
  // doppio fallo: serie azzerata
  addShot(m, { side: 'player', grade: 'GOOD SERVE', serve: true });
  addPoint(m, { winner: 'opponent', why: 'Out', strokes: 1 });
  assert.equal(m.s.player.wall.run, 0);
  // il punto perso perché la CPU fa un vincente non ferma la serie di chi gioca
  addShot(m, { side: 'player', grade: 'PERFECT', kmh: 80 });
  addShot(m, { side: 'player', grade: 'PERFECT', kmh: 80 });
  addPoint(m, { winner: 'opponent', why: 'Nice Shot!', strokes: 5 });
  assert.equal(m.s.player.wall.run, 2);
  assert.equal(sideSummary(m, 'player').wall, 5, 'il massimo resta');
  // computer del Player 2: non si conta (il motivo del punto non arriva)
  const g = newMatch({ guest: true });
  addShot(g, { side: 'opponent', grade: 'PERFECT' }); addShot(g, { side: 'opponent', grade: 'PERFECT' });
  addPoint(g, { winner: 'opponent', why: null, strokes: 4 });
  assert.equal(sideSummary(g, 'opponent').wall, 0);
  assert.equal(g.s.opponent.wall.pend, false);
});

test('B40.1: colpo del compagno del doppio (partner) fuori dai conti; formato della partita dal motore', () => {
  const E = { score: { fair: true }, matchConfig: { gamesToWin: 1, difficulty: 'evento' }, isDoubles: true };
  const S = new MatchStats();
  S.start(E);
  assert.equal(S.m.fair, true);
  S.shot(E, { role: 'p1', grade: 'PERFECT', kmh: 90, partner: true });
  assert.equal(S.m.s.player.shots, 0);
  S.shot(E, { role: 'p1', grade: 'PERFECT', kmh: 90 });
  assert.equal(S.m.s.player.shots, 1);
  assert.equal(S.first, null); assert.equal(S.record, null);
});

test('B40.1: con i contatori nuovi il gioco resta identico (impronte) e i contatori sono coerenti con il motore', () => {
  for (const [profile, difficulty, seed] of [['umano', 'evento', 7], ['bambino', 'bambini', 23], ['tennista', 'pro', 31]]){
    eventoReset();
    const a = simulate({ profile, difficulty, points: 50, seed });
    eventoReset();
    let S = null;
    const b = simulate({ profile, difficulty, points: 50, seed, setup: e => { S = installMatchStats(e); } });
    assert.equal(fingerprint(b), fingerprint(a), `${profile} ${difficulty} ${seed}`);
    const s = sideSummary(S.m, 'player'), o = sideSummary(S.m, 'opponent');
    assert.ok(s.streak >= 1 && s.streak <= s.points, `serie ${s.streak} su ${s.points}`);
    assert.ok(s.unreturned >= s.aces, 'gli ace sono servizi non rimandati');
    assert.ok(s.wall >= 1 && s.wall <= s.shots, `muro ${s.wall} su ${s.shots} colpi`);
    assert.ok(s.love <= s.games && o.love <= o.games);
    if (!S.m.over) assert.equal(s.gameComeback, 0, 'partita non finita');
  }
});
