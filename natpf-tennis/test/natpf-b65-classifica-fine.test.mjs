// B65 · classifica di oggi a fine partita (natpf_classifica_fine.js; richiesta dell'utente del 17/11/2026: top 5 di oggi
// con il punteggio, poi sotto chi ha giocato con la sua posizione «tipo 200», e poi scompare). Decisioni dell'utente: nello
// stesso schermo in classifica solo chi vince (punteggio × 1,4, livello Evento); compare dopo la card per 8 s.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { addMatch, matchList, boardCsv, MATCH_KEEP, MATCH_MODE } from '../src/natpf/natpf_events.js';
import { CLASSIFICA_FINE, dayBoardOn, dayBoardView, dayBoardHtml, boardRow, NatpfFineClassifica } from '../src/natpf/natpf_classifica_fine.js';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const DAY = '2026-11-17';
// giornata con n partite vinte (punteggi decrescenti) e una partita di chi gioca con un punteggio dato
function day(n, mine = null){
  let b = null;
  for (let i = 0; i < n; i++) b = addMatch(b, { nick: `G${i}`, level: 'evento', won: 20 - (i % 15), lost: 5 + (i % 15), games: [1, 0], win: true }, { day: DAY, at: 1000 + i }).board;
  if (!mine) return { board: b };
  const r = addMatch(b, mine, { day: DAY, at: 99999 });
  return { board: r.board, r };
}

test('B65: tutte le partite del giorno restano (fino a 3000), così si può dire «200°»', () => {
  assert.equal(MATCH_KEEP, 3000);
  const { board, r } = day(240, { nick: 'Ada', level: 'bambini', won: 6, lost: 14, games: [0, 1], win: false });
  assert.equal(matchList(board, DAY).length, 241);
  assert.equal(r.rank, 241, 'ultima (persa, sotto tutte le vinte)'); assert.equal(r.total, 241);
});

test('B65: la vista: prime 5, chi ha giocato evidenziato; oltre il 5° «⋯» e la sua riga con la posizione; senza nome fuori classifica', () => {
  const { board, r } = day(220, { nick: 'Ada', level: 'evento', won: 10, lost: 10, games: [1, 0], win: true });
  const list = matchList(board, DAY), v = dayBoardView({ list, rank: r.rank });
  assert.equal(v.top.length, 5); assert.deepEqual(v.top.map(x => x.pos), [1, 2, 3, 4, 5]);
  assert.ok(r.rank > 5 && v.me && v.me.pos === r.rank && v.me.nick === 'Ada' && v.me.me && v.gap);
  assert.equal(v.total, 221); assert.equal(v.out, null);
  const html = dayBoardHtml(v);
  assert.match(html, /Classifica di oggi/); assert.match(html, /class="db-gap"/);
  assert.match(html, new RegExp(`<li class="db-row me" data-pos="${r.rank}"><b class="db-pos">${r.rank}°</b><span class="db-name">Ada<small>Evento · vinta 1-0</small></span><em class="db-score">${v.me.score}</em></li>`));
  assert.match(html, /221 partite oggi · tocca per chiudere/);
  // nei primi 5: evidenziata nella lista, niente riga sotto
  const top = day(3, { nick: 'Bea', level: 'leggenda', won: 18, lost: 2, games: [1, 0], win: true });
  const v2 = dayBoardView({ list: matchList(top.board, DAY), rank: top.r.rank });
  assert.equal(top.r.rank, 1); assert.ok(v2.top[0].me && v2.top[0].nick === 'Bea' && !v2.me && !v2.gap);
  // 6°: subito sotto la quinta, senza «⋯»
  const six = dayBoardView({ list: matchList(day(6).board, DAY), rank: 6 }); assert.ok(six.me && !six.gap);
  // senza nome: fuori classifica (contro la CPU «Ospite», nello stesso schermo chi ha vinto)
  assert.equal(dayBoardView({ list, rank: 0, guest: true }).out, 'senza nome, fuori classifica');
  assert.equal(dayBoardView({ list, rank: 0, guest: true, who: 'Player 1' }).out, 'Player 1: senza nome, fuori classifica');
  assert.match(dayBoardHtml(dayBoardView({ list: [], rank: 0 })), /Ancora nessuna partita oggi/);
  assert.match(dayBoardHtml(dayBoardView({ list: [{ nick: '<b>x', score: 1 }], rank: 1 })), /&lt;b&gt;x/, 'nomi sicuri');
});

test('B65: nello stesso schermo solo chi vince, con il punteggio del livello Evento e «stesso schermo»', () => {
  const b = addMatch(null, { nick: 'Marco', level: 'evento', won: 12, lost: 8, games: [1, 0], win: true, split: true }, { day: DAY, at: 1 });
  const e = matchList(b.board, DAY)[0];
  assert.ok(e.split && e.win && e.score === Math.round(100*12/20*1.4));
  assert.equal(boardRow(e, 1).detail, 'stesso schermo · vinta 1-0');
  assert.match(boardCsv(b.board), /"Marco";"84";"[^"]*";"Stesso schermo";"vinta 1-0"/);
  // natpf_events.recordSplitWin: niente riga per i nomi di base
  const src = fs.readFileSync(new URL('../src/natpf/natpf_events.js', import.meta.url), 'utf8');
  assert.match(src, /recordSplitWin\(\{ nick, won, lost, games \}\)/); assert.match(src, /\/\^Player \[12\]\$\/i\.test\(n\)/);
  const ui = fs.readFileSync(new URL('../src/natpf/natpf_ui.js', import.meta.url), 'utf8');
  assert.match(ui, /if \(m\.mode === 'split' && !m\.doubles\)\{/); assert.match(ui, /this\.events\.recordSplitWin\(/);
});

test('B65: dove si vede: programma Windows e sviluppo, spegnibile; mai nel doppio, nella sfida tra due computer e in allenamento', () => {
  assert.equal(dayBoardOn({ desktop: {}, dev: false, storage: memory() }), true);
  assert.equal(dayBoardOn({ desktop: undefined, dev: true, storage: memory() }), true);
  assert.equal(dayBoardOn({ desktop: undefined, dev: false, storage: memory() }), false, 'gioco dal browser');
  assert.equal(dayBoardOn({ desktop: {}, dev: false, storage: memory({ [CLASSIFICA_FINE.key]: '0' }) }), false);
  assert.deepEqual([CLASSIFICA_FINE.delayMs, CLASSIFICA_FINE.showMs, CLASSIFICA_FINE.top], [5000, 8000, 5]);
});

test('B65: dopo la card (5 s), per 8 s; si chiude da sola, se la schermata finale si chiude, o con un tocco', () => {
  globalThis.natpfDesktop = {};
  try {
    let t = 0; const modal = { classList: { contains: () => false } }, now = () => t;
    const prevDoc = globalThis.document;
    const els = {}; globalThis.document = { getElementById: id => (id === 'victory-modal' ? modal : els[id] || null), createElement: () => { const c = new Set(['hidden']); return { id: '', className: '', innerHTML: '', setAttribute(){}, classList: { add: k => c.add(k), remove: k => c.delete(k), contains: k => c.has(k) }, querySelector: () => ({ innerHTML: '' }), _c: c }; }, body: { appendChild: el => { els[el.id] = el; } } };
    const m = { over: true, mode: 'cpu', doubles: false };
    const E = { phase: 'MATCH_OVER', playerRole: 'p1', natpfStats: { m, rank: { rank: 3, total: 9 } } };
    const ui = { stats: E.natpfStats, events: { board: day(9).board }, lobby: { mode: 'cpu' }, diag: null };
    const B = new NatpfFineClassifica(E, ui, { now });
    try { globalThis.localStorage?.removeItem?.(CLASSIFICA_FINE.key); } catch {}
    assert.equal(B.arm(), true); assert.equal(B.arm(), false, 'una volta per partita');
    t = 4900; B.tick(); assert.equal(B.state, 'armed');
    t = 5000; B.tick(); assert.equal(B.state, 'on'); assert.ok(!els['natpf-day-board']._c.has('hidden'));
    t = 12900; B.tick(); assert.equal(B.state, 'on');
    t = 13000; B.tick(); assert.equal(B.state, 'off'); assert.ok(els['natpf-day-board']._c.has('hidden'), 'dopo 8 s sparisce');
    // schermata finale chiusa (Rivincita, Prossimo giocatore) prima: niente classifica
    const m2 = { over: true, mode: 'split', doubles: false }; E.natpfStats.m = m2; t = 20000; assert.equal(B.arm(), true);
    E.phase = 'SERVE_STANCE'; t = 26000; B.tick(); assert.equal(B.state, 'off');
    // doppio, sfida tra due computer: mai
    E.phase = 'MATCH_OVER'; E.natpfStats.m = { over: true, mode: 'cpu', doubles: true }; assert.equal(B.arm(), false);
    E.natpfStats.m = { over: true, mode: 'cpu', doubles: false }; ui.lobby.mode = 'friend'; assert.equal(B.arm(), false);
    globalThis.document = prevDoc;
  } finally { delete globalThis.natpfDesktop; }
  const css = fs.readFileSync(new URL('../natpf-ui.css', import.meta.url), 'utf8'), part = css.slice(css.indexOf('B65 · classifica di oggi'));
  assert.match(part, /\.natpf-dayboard \{[^}]*position: fixed/); assert.doesNotMatch(part, /\b\d+(\.\d+)?v[wh]\b|@media/);
});
