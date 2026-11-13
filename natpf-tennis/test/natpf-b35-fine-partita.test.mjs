// B35 · fine partita rifatta (collaudo dell'utente del 13/11, proposta grafica): al più tre riquadri con le cose migliori
// scelte da sole tra quelle positive e non nulle, mai numeri negativi, titolo «Vince …» / «Bella sfida, …», pillola dei
// game, pillola in basso (classifica o consiglio gentile sul livello), «Gioca ancora» / «Rivincita»; stesso schermo con
// due schede e lo scambio più lungo nella pillola; sfida tra due computer: ognuno i suoi numeri. I numeri sono quelli
// veri del motore (partita a sorteggi fissi).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import { eventoReset } from '../src/natpf/natpf_evento.js';
import { newMatch, addShot, addPoint, sideSummary, viewOf, statsHtml, endScreen, bestOf, cpuPill, BEST, BEST_ORDER, installMatchStats } from '../src/natpf/natpf_match_stats.js';
import { matchEndView } from '../src/natpf/natpf_point_call.js';

// riassunto finto di un giocatore (come sideSummary)
const sumOf = (o = {}) => ({ points: 0, lost: 0, pct: 0, aces: 0, winners: 0, errors: { net: 5, out: 7, whiff: 3 }, hits: 0, serves: 0, shots: 0, fastest: 0, supers: 0, superOk: 0,
  timing: { perfetto: 0, anticipo: 9, ritardo: 9, buono: 0 }, rated: 18, longest: 0, games: 0, won: false, ...o });
const NEG = /errori|errore|rete|fuori|anticipo|ritardo|vuoto|migliora|sbagli|-\d/i;

test('B35: cose migliori solo positive e non nulle, al più tre, nell\'ordine della proposta', () => {
  const s = sumOf({ points: 8, hits: 30, fastest: 118, longest: 24, winners: 3, timing: { perfetto: 12, anticipo: 6, ritardo: 4, buono: 2 } });
  const b = bestOf(s);
  assert.equal(b.length, 3);
  for (const t of b){ assert.ok(t.value > 0, t.id); assert.doesNotMatch(t.label, NEG, t.label); assert.ok(BEST_ORDER.includes(t.id)); }
  assert.deepEqual(b.map(t => t.id), ['perfetti', 'kmh', 'scambio'], 'come nella proposta: 12 Perfetti, 118 km/h, scambio di 24');
  assert.deepEqual(b.map(t => t.value), [12, 118, 24]);
  // ordine fisso (BEST_ORDER) anche quando la scelta cambia
  const b2 = bestOf(sumOf({ points: 14, winners: 3, timing: { perfetto: 8, anticipo: 0, ritardo: 0, buono: 0 }, longest: 2 }));
  assert.deepEqual(b2.map(t => t.id), ['vincenti', 'perfetti', 'punti']);
  assert.equal(b2.find(t => t.id === 'vincenti').label, 'vincenti');
  assert.equal(bestOf(sumOf({ winners: 3 }), { vsCpu: true })[0].label, 'vincenti che la CPU non ha preso');
  assert.equal(bestOf(sumOf({ winners: 1 }), { vsCpu: true })[0].label, 'vincente che la CPU non ha preso');
  // zero e valori strani non si mostrano mai; lo scambio più lungo solo da 3 colpi
  const z = bestOf(sumOf({ points: 2, longest: 2, fastest: NaN, aces: -1, superOk: undefined }));
  assert.deepEqual(z.map(t => [t.id, t.value]), [['punti', 2]]);
  assert.equal(bestOf(sumOf({ longest: 3 }))[0].id, 'scambio');
  // singolare e plurale
  assert.equal(bestOf(sumOf({ points: 1 }))[0].label, 'punto vinto');
  assert.equal(bestOf(sumOf({ superOk: 1 }))[0].label, 'colpo super riuscito');
  assert.equal(bestOf(sumOf({ timing: { perfetto: 1 } }))[0].label, 'colpo Perfetto');
  // niente da mostrare: mai un numero brutto
  assert.deepEqual(bestOf(sumOf({ hits: 4 })).map(t => [t.id, t.value, t.label]), [['colpi', 4, 'colpi giocati']]);
  assert.deepEqual(bestOf(sumOf()).map(t => [t.id, t.value, t.label]), [['partita', 1, 'partita giocata']]);
  // computer del Player 2: ace e vincenti non si sanno
  assert.ok(!bestOf(sumOf({ aces: 3, winners: 5, points: 2 }), { guest: true }).some(t => t.id === 'ace' || t.id === 'vincenti'));
  // limite e cose saltate
  assert.equal(bestOf(s, { limit: 2 }).length, 2);
  assert.ok(!bestOf(s, { skip: ['scambio'] }).some(t => t.id === 'scambio'));
  for (const id of BEST_ORDER) assert.ok(BEST[id].weight > 0 && BEST[id].min >= 1, id);
});

test('B35: pillola in basso contro la CPU (classifica se vince, consiglio gentile se perde, mai «fuori»)', () => {
  assert.equal(cpuPill({ won: true, rank: { rank: 3, total: 9, score: 112 } }), '3° posto nella classifica di oggi');
  assert.equal(cpuPill({ won: true, rank: { rank: 0, total: 60, score: 41 } }), '41 punti nella partita di oggi');
  assert.equal(cpuPill({ won: true, rank: null }), '');
  assert.equal(cpuPill({ won: false, level: 'pro' }), 'Prossima volta prova il livello Evento');
  assert.equal(cpuPill({ won: false, level: 'leggenda' }), 'Prossima volta prova il livello Esperta');
  assert.equal(cpuPill({ won: false, level: 'bambini' }), 'Prossima volta andrà ancora meglio!');
  assert.equal(cpuPill({ won: false, level: null }), 'Prossima volta andrà ancora meglio!');
});

// partita finta: n colpi per lato, sequenza di punti (P/O), game a 4 punti con 2 di scarto
function fake({ mode = 'cpu', level = 'evento', seq = 'PPPPOPPPP', shots = 12, longest = 9 } = {}){
  const m = newMatch({ mode, level, gamesToWin: 2 });
  for (let i = 0; i < shots; i++){ addShot(m, { side: 'player', grade: i % 3 ? 'PERFECT' : 'LATE', kmh: 90 + i*2 }); addShot(m, { side: 'opponent', grade: 'GOOD', kmh: 80 + i }); }
  let g = { player: 0, opponent: 0 }, cur = { player: 0, opponent: 0 };
  for (const c of seq){
    const w = c === 'P' ? 'player' : 'opponent', o = w === 'player' ? 'opponent' : 'player'; cur[w]++;
    const gw = cur[w] >= 4 && cur[w] - cur[o] >= 2 ? w : null; if (gw){ g[gw]++; cur = { player: 0, opponent: 0 }; }
    addPoint(m, { winner: w, why: c === 'P' ? 'Nice Shot!' : 'Out', strokes: 4, gameWinner: gw, gamesAfter: { ...g } });
    if (m.over) break;
  }
  m.longest = longest;
  return { m, g };
}

test('B35: vittoria contro la CPU come nella proposta (titolo, game, riquadri, classifica, Gioca ancora)', () => {
  const { m, g } = fake();
  assert.ok(m.over); assert.equal(m.winner, 'player');
  const v = viewOf(m, { rank: { rank: 3, total: 9, score: 112 }, nick: 'Ada' });
  const S = endScreen(matchEndView({ winner: 'player', games: g, nickname: 'Ada' }), v);
  assert.equal(S.title, 'Vince Ada!'); assert.equal(S.kicker, 'Fine partita · livello Evento'); assert.equal(S.sub, '');
  assert.deepEqual(S.games, { mine: 2, theirs: 0 });
  assert.ok(S.tiles.length >= 1 && S.tiles.length <= 3);
  assert.equal(S.pill, '3° posto nella classifica di oggi'); assert.equal(S.again, 'Gioca ancora'); assert.equal(S.won, true);
  const html = statsHtml(v, matchEndView({ winner: 'player', games: g, nickname: 'Ada' }));
  assert.equal((html.match(/class="end-tile"/g) || []).length, S.tiles.length);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), NEG, 'niente numeri negativi');
  // senza nome: «Hai vinto!»
  assert.equal(endScreen(matchEndView({ winner: 'player', games: g }), viewOf(m)).title, 'Hai vinto!');
});

test('B35: sconfitta contro la CPU («Bella sfida, Luca!», riga sotto, consiglio sul livello, Rivincita)', () => {
  const { m, g } = fake({ level: 'pro', seq: 'OOOOPPPOOOPOOOO' });
  assert.equal(m.winner, 'opponent');
  const v = viewOf(m, { nick: 'Luca' }), base = matchEndView({ winner: 'opponent', games: g, nickname: 'Luca' });
  const S = endScreen(base, v);
  assert.equal(S.title, 'Bella sfida, Luca!'); assert.equal(S.won, false);
  assert.equal(S.sub, 'La CPU ha vinto questa volta. Ecco cosa ti è venuto meglio:');
  assert.equal(S.kicker, 'Fine partita · livello Esperta');
  assert.deepEqual(S.games, { mine: 0, theirs: 2 });
  assert.equal(S.pill, 'Prossima volta prova il livello Evento'); assert.equal(S.again, 'Rivincita');
  assert.equal(endScreen(base, viewOf(m)).title, 'Bella sfida!');
  for (const t of S.tiles) assert.ok(t.value > 0);
  // doppio contro le CPU: niente classifica (non si registra), frase al plurale
  const d = fake({ level: 'evento', seq: 'OOOOOOOO' }); d.m.doubles = true;
  const Sd = endScreen(matchEndView({ winner: 'opponent', games: d.g, doubles: true }), viewOf(d.m));
  assert.equal(Sd.sub, 'Hanno vinto le CPU questa volta. Ecco cosa ti è venuto meglio:');
  assert.equal(Sd.pill, 'Scambio più lungo della partita: 9 colpi');
});

test('B35: stesso schermo con due schede, due cose belle per giocatore, scambio più lungo nella pillola', () => {
  const { m, g } = fake({ mode: 'split', seq: 'PPOPPOOOOPOOOO' });
  const names = { player: 'Giulia', opponent: '<Marco>' };
  const v = viewOf(m, { names, nick: 'Ada' });
  assert.equal(v.nick, '', 'nello stesso schermo il nome del computer non conta');
  const base = matchEndView({ winner: m.winner, games: g, sharedNames: names }), S = endScreen(base, v);
  assert.equal(S.players.length, 2);
  assert.equal(S.kicker, `Fine partita · ${Math.max(g.player, g.opponent)} game a ${Math.min(g.player, g.opponent)}`);
  assert.equal(S.title, `Vince ${names[m.winner]}!`);
  assert.equal(S.pill, 'Scambio più lungo della partita: 9 colpi'); assert.equal(S.again, 'Rivincita');
  for (const p of S.players){
    assert.ok(p.tiles.length >= 1 && p.tiles.length <= 2, p.name);
    assert.ok(!p.tiles.some(t => t.id === 'scambio'), 'lo scambio è nella pillola');
    assert.equal(p.chip, p.won ? 'Vince' : 'Bella sfida');
  }
  assert.equal(S.players.filter(p => p.won).length, 1);
  const html = statsHtml(v, base);
  assert.match(html, /&lt;Marco&gt;/); assert.doesNotMatch(html, /<Marco>/);
  assert.equal((html.match(/<section class="end-player/g) || []).length, 2);
  assert.doesNotMatch(html, /end-ico/, 'riquadri piccoli senza icona, come nella proposta');
});

test('B35: sfida tra due computer, ognuno le sue cose (Player 2 senza ace né vincenti)', () => {
  const { m, g } = fake({ mode: 'versus', seq: 'OOOOOOOO' });
  m.s.player.aces = 2; m.s.player.winners = 4;
  const host = endScreen(matchEndView({ winner: 'opponent', games: g, multiplayer: true }), viewOf(m, { viewer: 'player', nick: 'Ada' }));
  assert.equal(host.title, 'Bella sfida, Ada!'); assert.match(host.sub, /^Ha vinto .+ questa volta/);
  assert.ok(host.tiles.some(t => t.id === 'ace' || t.id === 'vincenti'));
  assert.equal(host.again, 'Rivincita'); assert.equal(host.pill, 'Scambio più lungo della partita: 9 colpi');
  const gv = viewOf(m, { viewer: 'opponent', nick: 'Bea' }); gv.guest = true;
  const guest = endScreen(matchEndView({ winner: 'opponent', games: g, viewer: 'opponent', multiplayer: true, nickname: 'Bea' }), gv);
  assert.equal(guest.title, 'Vince Bea!'); assert.deepEqual(guest.games, { mine: 2, theirs: 0 });
  assert.ok(!guest.tiles.some(t => t.id === 'ace' || t.id === 'vincenti'));
  assert.notDeepEqual(guest.tiles, host.tiles);
});

test('B35: a sorteggi fissi i riquadri mostrano i numeri veri del motore', () => {
  for (const [profile, difficulty, seed] of [['umano', 'evento', 7], ['tennista', 'leggenda', 11], ['bambino', 'bambini', 23]]){
    eventoReset(); let S = null;
    simulate({ profile, difficulty, points: 90, seed, setup: e => { S = installMatchStats(e); } });
    const sum = sideSummary(S.m, 'player'), v = viewOf(S.m), E = endScreen({}, v);
    const truth = { vincenti: sum.winners, ace: sum.aces, super: sum.superOk, perfetti: sum.timing.perfetto, kmh: sum.fastest, scambio: sum.longest, punti: sum.points };
    assert.ok(E.tiles.length >= 1 && E.tiles.length <= 3, `${profile} ${seed}`);
    for (const t of E.tiles){ assert.equal(t.value, truth[t.id], `${profile} ${seed} ${t.id}`); assert.ok(t.value > 0); }
  }
});
