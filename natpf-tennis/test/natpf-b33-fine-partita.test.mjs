// B33 · fine partita con dati veri (natpf_match_stats.js): conti di una partita registrata a sorteggi fissi sul motore
// vero (i numeri della schermata coincidono con quelli del motore e delle scritte dei colpi), gioco identico con e senza
// le statistiche, regole delle frasi, punteggio della classifica, computer del Player 2, classifica delle partite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import { eventoReset } from '../src/natpf/natpf_evento.js';
import { newMatch, addShot, addPoint, sideSummary, tipsOf, viewOf, statsHtml, matchScore, timingOf, LEVEL_WEIGHT, SCORE_RULE, MatchStats, installMatchStats } from '../src/natpf/natpf_match_stats.js';
import { addMatch, topMatches, boardCsv, freshBoard, MATCH_MODE } from '../src/natpf/natpf_events.js';
import { fingerprint } from '../scripts/audit/fine-partita.mjs';

// partita simulata con le statistiche accese e, accanto, quello che il motore fa davvero: punti (dal motore), scritte dei
// colpi (popup con voto e km/h, come le vede chi gioca)
function recorded({ profile = 'umano', difficulty = 'evento', points = 90, seed = 7 } = {}){
  eventoReset();
  let S = null; const truth = { won: 0, lost: 0, rallies: [], aces: 0, serves: 0, shots: 0, kmh: 0, timing: { perfetto: 0, anticipo: 0, ritardo: 0, buono: 0 }, games: 0 };
  const out = simulate({ profile, difficulty, points, seed, setup: e => {
    S = installMatchStats(e);
    const award = e._awardPoint.bind(e);
    e._awardPoint = (who, why = '') => {
      const n = e.ball.rallyStrokeCount, g0 = e.score.playerGames + e.score.opponentGames;
      who === 'player' ? truth.won++ : truth.lost++; truth.rallies.push(n);
      if (who === 'player' && n === 1 && (why === 'Nice Shot!' || why === 'Point')) truth.aces++;
      award(who, why);
      truth.games += e.score.playerGames + e.score.opponentGames - g0;
    };
    const hud = e.hud;
    e.hud = new Proxy({}, { get: (_, k) => k === 'showTimingPopup' ? (a = {}) => {
      const g = String(a.grade || ''), d = String(a.detail || ''), kmh = +(/(\d+) KM\/H/.exec(d)?.[1] || 0);
      if (!g.startsWith('P2') && /KM\/H/.test(d)){
        if (/•/.test(d)) truth.serves++; else { truth.shots++; const t = timingOf(g.split('•')[0]); if (t) truth.timing[t]++; }
        truth.kmh = Math.max(truth.kmh, kmh);
      }
      return hud.showTimingPopup(a);
    } : hud[k] });
  } });
  return { out, S, truth };
}

test('B33: partita registrata a sorteggi fissi, i numeri della schermata sono quelli del motore', () => {
  for (const cfg of [{ profile: 'umano', difficulty: 'evento', seed: 7 }, { profile: 'tennista', difficulty: 'leggenda', seed: 11 }, { profile: 'bambino', difficulty: 'bambini', seed: 23 }]){
    const { out, S, truth } = recorded(cfg), m = S.m, sum = sideSummary(m, 'player');
    const tag = JSON.stringify(cfg);
    assert.equal(sum.points, out.won, `punti vinti ${tag}`);
    assert.equal(sum.points + sum.lost, out.points, `punti giocati ${tag}`);
    assert.equal(sum.points, truth.won); assert.equal(sum.lost, truth.lost);
    assert.equal(sum.longest, Math.max(...truth.rallies), `scambio più lungo ${tag}`);
    assert.equal(sum.longest, out.maxHits);
    assert.equal(sum.aces, truth.aces, `ace ${tag}`);
    assert.equal(sum.serves, truth.serves, `servizi ${tag}`);
    assert.equal(sum.shots, truth.shots, `colpi nello scambio ${tag}`);
    assert.equal(sum.hits, truth.serves + truth.shots);
    assert.equal(sum.fastest, truth.kmh, `colpo più veloce ${tag}`);
    assert.deepEqual(sum.timing, truth.timing, `voto del tempo ${tag}`);
    // i game: uno per ogni game chiuso dal motore, i punti dei game più quelli del game in corso sono tutti i punti
    assert.equal(m.games.length, truth.games, `game ${tag}`);
    const inGames = m.games.reduce((a, g) => a + g.player + g.opponent, 0) + m.cur.player + m.cur.opponent;
    assert.equal(inGames, out.points);
    assert.ok(sum.hits > 20 && sum.rated > 10, `partita vera ${tag}: ${sum.hits} colpi`);
  }
});

test('B33: il gioco è identico con e senza le statistiche (impronte a sorteggi fissi)', () => {
  for (const [profile, difficulty, seed] of [['umano', 'evento', 7], ['medio', 'pro', 31], ['amatore', 'casual', 37]]){
    eventoReset(); const a = simulate({ profile, difficulty, points: 80, seed });
    eventoReset(); const b = simulate({ profile, difficulty, points: 80, seed, setup: e => installMatchStats(e) });
    assert.equal(fingerprint(b), fingerprint(a), `${profile} ${difficulty} ${seed}`);
  }
});

test('B33: fine partita, game per game e vincitore', () => {
  const m = newMatch({ mode: 'cpu', level: 'evento', gamesToWin: 2 });
  const play = (w, why, n, gw = null) => addPoint(m, { winner: w, why, strokes: n, gameWinner: gw });
  play('player', 'Nice Shot!', 1); play('player', 'Out', 5); play('opponent', 'Net', 3); play('player', 'Nice Shot!', 7); play('player', 'Out', 2, 'player');
  assert.deepEqual(m.games, [{ winner: 'player', player: 4, opponent: 1 }]);
  for (let i = 0; i < 4; i++) play('opponent', 'Point', 4, i === 3 ? 'opponent' : null);
  assert.equal(m.over, false);
  for (let i = 0; i < 4; i++) play('player', 'Net', 9, i === 3 ? 'player' : null);
  assert.equal(m.over, true); assert.equal(m.winner, 'player');
  play('opponent', 'Out', 3);                                        // dopo la fine non conta più
  const s = sideSummary(m, 'player'), o = sideSummary(m, 'opponent');
  assert.equal(s.points, 8); assert.equal(o.points, 5); assert.equal(s.aces, 1); assert.equal(s.winners, 1); assert.equal(s.longest, 9);
  assert.equal(o.winners, 4, '«Point»: la palla passata è un vincente della CPU');
  assert.equal(s.errors.net, 1); assert.equal(o.errors.net, 4); assert.equal(o.errors.out, 2);
  assert.equal(s.games, 2); assert.equal(s.won, true); assert.equal(s.pct, 62);
  const v = viewOf(m);
  assert.deepEqual(v.games.map(g => `${g.mine}-${g.theirs}`), ['4-1', '0-4', '4-0']);
  assert.equal(v.cols.length, 1);
});

test('B33: voto del tempo come la scritta del colpo, colpi super, km/h', () => {
  assert.equal(timingOf('PERFECT'), 'perfetto'); assert.equal(timingOf('POWER SERVE!'), 'perfetto');
  assert.equal(timingOf('VERY EARLY'), 'anticipo'); assert.equal(timingOf('LATE'), 'ritardo'); assert.equal(timingOf('GOOD'), 'buono');
  assert.equal(timingOf('TOO LATE! • WHIFF'), null);
  const m = newMatch();
  addShot(m, { side: 'player', grade: 'PERFECT', kmh: 120, superShot: true });
  addShot(m, { side: 'player', grade: 'EARLY', kmh: 99, superShot: true, failed: true });
  addShot(m, { side: 'player', grade: 'GOOD SERVE', kmh: 150, serve: true });
  addShot(m, { side: 'opponent', grade: 'LATE', kmh: 300 });
  const s = sideSummary(m, 'player');
  assert.deepEqual(s.timing, { perfetto: 1, anticipo: 1, ritardo: 0, buono: 0 }, 'il servizio non entra nel voto del tempo');
  assert.equal(s.hits, 3); assert.equal(s.fastest, 150); assert.equal(s.supers, 2); assert.equal(s.superOk, 1);
  assert.equal(sideSummary(m, 'opponent').fastest, 300);
});

test('B33: frasi semplici dai numeri veri', () => {
  const base = { points: 10, lost: 10, pct: 50, aces: 0, winners: 0, errors: { net: 0, out: 0, whiff: 0 }, hits: 30, serves: 5, shots: 25, fastest: 100, supers: 0, superOk: 0,
    timing: { perfetto: 2, anticipo: 3, ritardo: 9, buono: 6 }, rated: 20, longest: 5, games: 1, won: false };
  assert.match(tipsOf({ ...base, aces: 3 }).good, /3 ace/);
  assert.match(tipsOf({ ...base, aces: 3 }, { guest: true }).good, /combattuta/, 'sul computer del Player 2 niente ace');
  assert.match(tipsOf(base).fix, /prima: tanti colpi in ritardo/);
  assert.match(tipsOf({ ...base, timing: { perfetto: 2, anticipo: 9, ritardo: 3, buono: 6 } }).fix, /Aspetta/);
  assert.match(tipsOf({ ...base, timing: { perfetto: 12, anticipo: 2, ritardo: 2, buono: 4 } }).good, /12 colpi perfetti su 20/);
  assert.match(tipsOf({ ...base, timing: { perfetto: 12, anticipo: 2, ritardo: 2, buono: 4 }, errors: { net: 4, out: 1, whiff: 0 } }).fix, /in rete \(4\)/);
  assert.match(tipsOf({ ...base, errors: { net: 0, out: 0, whiff: 3 } }).fix, /a vuoto/);
  assert.match(tipsOf({ ...base, timing: { perfetto: 12, anticipo: 2, ritardo: 2, buono: 4 }, won: true }, { mode: 'cpu', level: 'evento' }).fix, /livello Esperta/);
  assert.match(tipsOf({ ...base, timing: { perfetto: 12, anticipo: 2, ritardo: 2, buono: 4 }, won: true }, { mode: 'cpu', level: 'leggenda' }).fix, /verde/);
  const t = tipsOf({ ...base, hits: 0, rated: 0, pct: 0, points: 0, timing: { perfetto: 0, anticipo: 0, ritardo: 0, buono: 0 }, longest: 0 });
  assert.ok(t.good && t.fix);
});

test('B33: punteggio della classifica equo tra livelli (valori dalle misure)', () => {
  assert.deepEqual(Object.keys(LEVEL_WEIGHT), ['bambini', 'casual', 'evento', 'pro', 'leggenda']);
  assert.equal(matchScore({ level: 'evento', won: 13, lost: 7 }), Math.round(65*1.4));
  assert.equal(matchScore({ level: 'leggenda', won: 0, lost: 10 }), 0);
  assert.equal(matchScore({ level: '1v1', won: 5, lost: 0 }), 0);
  assert.equal(matchScore({ level: 'pro', won: 0, lost: 0 }), 0);
  // misure del banco (scripts/audit/fine-partita.mjs --livelli, profilo «umano»): lo stesso giocatore prende circa lo
  // stesso punteggio a ogni livello (entro il 25%), e un giocatore più bravo guadagna a scegliere un livello difficile
  const umano = { bambini: 88, casual: 86, evento: 67.5, pro: 62.8, leggenda: 21.9 }, sc = Object.fromEntries(Object.entries(umano).map(([l, p]) => [l, matchScore({ level: l, won: p, lost: 100 - p })]));
  const vals = Object.values(sc); assert.ok(Math.max(...vals)/Math.min(...vals) <= 1.25, JSON.stringify(sc));
  assert.ok(matchScore({ level: 'leggenda', won: 35.7, lost: 64.3 }) > matchScore({ level: 'evento', won: 95.9, lost: 4.1 }));
  assert.match(SCORE_RULE, /Bambini ×1 · Facile ×1,1 · Evento ×1,4 · Esperta ×1,6 · Leggenda ×5/);
});

test('B33: il motore collegato conta solo le partite vere', () => {
  const E = { autoPlayMode: false, matchConfig: { difficulty: 'pro', gamesToWin: 1 }, score: { playerGames: 0, opponentGames: 0 }, playerRole: 'p1' };
  let counting = true, ended = null;
  const S = new MatchStats({ counts: () => counting, onEnd: m => { ended = m; } });
  S.start(E);
  assert.equal(S.m.mode, 'cpu'); assert.equal(S.m.level, 'pro');
  S.shot(E, { role: 'p1', grade: 'PERFECT', kmh: 110 });
  counting = false; S.shot(E, { role: 'p1', grade: 'LATE', kmh: 190 }); S.point(E, { winner: 'opponent', why: 'Out', strokes: 3 }); counting = true;
  E.autoPlayMode = true; S.point(E, { winner: 'opponent', why: 'Out', strokes: 3 }); E.autoPlayMode = false;
  for (let i = 0; i < 4; i++) S.point(E, { winner: 'player', why: 'Out', strokes: 2, gameWinner: i === 3 ? 'player' : null });
  assert.ok(ended && ended.over && ended.winner === 'player');
  const v = S.endView(E), s = v.cols[0].sum;
  assert.equal(s.points, 4); assert.equal(s.lost, 0); assert.equal(s.fastest, 110); assert.equal(s.hits, 1);
  // la partita dimostrativa dietro il menu non conta
  E.autoPlayMode = true; S.start(E);
  S.shot(E, { role: 'p1', grade: 'PERFECT', kmh: 90 }); S.point(E, { winner: 'player', why: 'Out', strokes: 3 });
  assert.equal(S.endView(E), null, 'niente numeri della dimostrazione');
  // una strada che spegne la dimostrazione dopo startNewMatch: la partita conta lo stesso
  E.autoPlayMode = false; S.point(E, { winner: 'player', why: 'Out', strokes: 3 });
  assert.equal(S.endView(E).cols[0].sum.points, 1);
});

test('B33: stesso schermo con due colonne e i nomi; computer del Player 2 dal punteggio dell\'host', () => {
  const E = { autoPlayMode: false, matchConfig: { gamesToWin: 1 }, score: { playerGames: 0, opponentGames: 0 }, natpfSplit: { active: true }, natpfSplitNames: { p1: 'Giulia', p2: '<Marco>' } };
  const S = new MatchStats(); S.start(E);
  S.shot(E, { role: 'p2', grade: 'PERFECT', kmh: 88 });
  for (let i = 0; i < 4; i++) S.point(E, { winner: 'opponent', why: 'Nice Shot!', strokes: 3, gameWinner: i === 3 ? 'opponent' : null });
  const v = S.endView(E);
  assert.deepEqual(v.cols.map(c => c.name), ['Giulia', '<Marco>']);
  assert.equal(v.cols[1].sum.winners, 4); assert.equal(v.cols[1].sum.fastest, 88);
  const html = statsHtml(v);
  assert.match(html, /&lt;Marco&gt;/); assert.doesNotMatch(html, /<Marco>/);
  assert.match(html, /data-n="2"/);
  // Player 2 della sfida tra due computer: niente _awardPoint, punti dal punteggio dell'host
  const G = { autoPlayMode: false, playerRole: 'p2', isMultiplayer: true, matchConfig: { gamesToWin: 1 }, score: { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0 } };
  const P = new MatchStats();
  const snap = (pp, op, pg, og, rc, phase = 'RALLY') => { P.guest(G, { phase, score: { playerPoints: pp, opponentPoints: op, playerGames: pg, opponentGames: og }, ball: { rallyStrokeCount: rc } }); G.score = { playerPoints: pp, opponentPoints: op, playerGames: pg, opponentGames: og }; };
  snap(0, 0, 0, 0, 0); snap(0, 0, 0, 0, 3); snap(0, 1, 0, 0, 0); snap(0, 1, 0, 0, 6); snap(1, 1, 0, 0, 1);
  P.shot(G, { role: 'p2', grade: 'LATE', kmh: 70 });
  snap(1, 2, 0, 0, 2); snap(1, 3, 0, 0, 4); snap(0, 0, 0, 1, 5, 'MATCH_OVER');
  const g = P.endView(G);
  assert.equal(g.guest, true); assert.equal(g.cols[0].side, 'opponent');
  const s = g.cols[0].sum;
  assert.equal(s.points, 4); assert.equal(s.lost, 1); assert.equal(s.longest, 6); assert.equal(s.games, 1); assert.equal(s.won, true); assert.equal(s.fastest, 70);
  assert.equal(s.aces + s.winners, 0, 'ace e vincenti non si sanno sul computer del Player 2');
  assert.doesNotMatch(statsHtml(g), /vincent|ace/);
});

test('B33: classifica delle partite nel tabellone del giorno, nel CSV e azzerata con «Azzera oggi»', () => {
  let b = freshBoard(null, '2026-11-13');
  b = addMatch(b, { nick: 'Ada', level: 'evento', won: 13, lost: 7, games: [2, 1], win: true }, { day: '2026-11-13', at: 1 }).board;
  const r = addMatch(b, { nick: 'Bea', level: 'leggenda', won: 6, lost: 14, games: [0, 2], win: false }, { day: '2026-11-13', at: 2 });
  b = r.board;
  assert.equal(r.rank, 1, 'Leggenda al 30% (150) davanti a Evento al 65% (91)');
  const top = topMatches(b, 10, '2026-11-13');
  assert.deepEqual(top.map(e => [e.nick, e.score, e.level, e.win]), [['Bea', 150, 'leggenda', false], ['Ada', 91, 'evento', true]]);
  const csv = boardCsv(b);
  assert.match(csv, /"Partite contro la CPU";"1";"Bea";"150"/);
  assert.match(csv, /"Partite contro la CPU";"2";"Ada";"91"/);
  assert.ok(b.modes[MATCH_MODE]);
  assert.deepEqual(topMatches(freshBoard(null, '2026-11-13'), 10, '2026-11-13'), [], 'azzerata');
  // revisione finale: oltre le partite tenute (keep) posizione 0 e totale sulla lista tenuta, mai «57° su 57»
  let c = freshBoard(null, '2026-11-13');
  for (let i = 0; i < 4; i++) c = addMatch(c, { nick: `N${i}`, level: 'evento', won: 15, lost: 5, games: [1, 0], win: true }, { day: '2026-11-13', at: 10 + i, keep: 4 }).board;
  const low = addMatch(c, { nick: 'Ultimo', level: 'bambini', won: 1, lost: 9, games: [0, 1], win: false }, { day: '2026-11-13', at: 99, keep: 4 });
  assert.deepEqual([low.rank, low.total, low.keep], [0, 4, 4], 'fuori dalle prime 4');
  assert.ok(!low.board.modes[MATCH_MODE].some(e => e.nick === 'Ultimo'));
  const high = addMatch(c, { nick: 'Primo', level: 'leggenda', won: 9, lost: 1, games: [1, 0], win: true }, { day: '2026-11-13', at: 100, keep: 4 });
  assert.deepEqual([high.rank, high.total], [1, 4]);
});

test('B33: sfida tra due computer sul motore vero: l\'host vede i suoi numeri, il Player 2 i suoi dagli snapshot', async () => {
  const { createHeadlessEngine } = await import('../scripts/audit/headless-engine.mjs');
  // host: i punti li decide lui; la schermata mostra solo la colonna di chi gioca qui
  const h = createHeadlessEngine({ difficulty: 'casual' });
  h.isMultiplayer = true; installMatchStats(h); h.startNewMatch({ showStartBanner: false }); h.matchConfig.gamesToWin = 1;
  assert.equal(h.natpfStats.m.mode, 'versus');
  for (const w of ['opponent', 'player', 'player', 'player', 'player']){ h.ball.rallyStrokeCount = 2; h._awardPoint(w, 'Out'); }
  assert.equal(h.phase, 'MATCH_OVER');
  const hv = h._natpfMatchEndView('player');
  assert.equal(hv.stats.cols.length, 1); assert.equal(hv.stats.cols[0].side, 'player');
  assert.equal(hv.stats.cols[0].sum.points, 4); assert.equal(hv.stats.cols[0].sum.lost, 1);
  // Player 2: niente _awardPoint, i numeri dal punteggio dell'host (gli snapshot che arrivano già oggi, niente di nuovo)
  const e = createHeadlessEngine({ difficulty: 'casual' });
  e.playerRole = 'p2'; e.urlRoom = 'AT-AB12'; e.roomId = 'AT-AB12'; e.isMultiplayer = true;
  installMatchStats(e); e.startNewMatch({ showStartBanner: false });
  let seq = 0, victory = null;
  const snap = snapshot => e._handleRoomStateUpdate({ p1Online: true, epoch: 'x', snapshotSeq: ++seq, snapshot });
  snap({ lobby: true, fmt: 'singles', gamesToWin: 1 });
  e.hud = new Proxy({}, { get: (t, k) => k === 'showVictoryModal' ? v => { victory = v; } : () => {} });
  const S = (pp, op, pg, og) => ({ playerPoints: pp, opponentPoints: op, playerGames: pg, opponentGames: og, server: 'player', deuceSide: true });
  const ball = n => ({ px: 0, py: 1, pz: 0, vx: 0, vy: 0, vz: 1, rallyStrokeCount: n });
  const realT = globalThis.setTimeout; globalThis.setTimeout = fn => { fn(); return 0; };
  try {
    snap({ phase: 'RALLY', phaseTimer: .1, score: S(0, 0, 0, 0), ball: ball(1) });
    snap({ phase: 'RALLY', phaseTimer: .1, score: S(0, 0, 0, 0), ball: ball(5) });
    snap({ phase: 'POINT_OVER', phaseTimer: 0, score: S(1, 0, 0, 0), ball: ball(5) });
    for (let i = 1; i <= 3; i++) snap({ phase: 'POINT_OVER', phaseTimer: 0, score: S(1, i, 0, 0), ball: ball(2) });
    snap({ phase: 'MATCH_OVER', phaseTimer: 0, score: S(0, 0, 0, 1), ball: ball(3) });
  } finally { globalThis.setTimeout = realT; }
  assert.ok(victory?.view?.stats, 'schermata finale del Player 2 con i numeri');
  const c = victory.view.stats.cols;
  assert.equal(c.length, 1); assert.equal(c[0].side, 'opponent');
  assert.equal(c[0].sum.points, 4); assert.equal(c[0].sum.lost, 1); assert.equal(c[0].sum.longest, 5); assert.equal(c[0].sum.won, true);
  assert.equal(victory.view.stats.guest, true);
  assert.deepEqual(victory.view.stats.games, [{ mine: 4, theirs: 1, win: true }], 'i game dal lato del Player 2');
});
