// B10 (06/11 sera): tabellone della partita come in televisione (natpf_scoreboard.js). Segnalazione: «la UI sotto per
// il punteggio dice "game" o "game secco", non si capisce lo score». Una riga per giocatore o squadra con chi serve,
// nome, game e punti del game in corso; il formato in parole; parità e vantaggio come negli annunci dei punti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatText, gamePoints, rowNames, scoreboardView, scoreboardHtml } from '../src/natpf/natpf_scoreboard.js';
import { pointCall } from '../src/natpf/natpf_point_call.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';

const sc = (pp, op, pg = 0, og = 0, server = 'player') => ({ playerPoints: pp, opponentPoints: op, playerGames: pg, opponentGames: og, server });
const cells = v => v.rows.map(r => `${r.serving ? '•' : ' '}${r.name} ${r.games} ${r.points}`);

test('formato della partita in parole, niente «game secco»', () => {
  assert.equal(formatText(1), 'Partita a 1 game');
  assert.equal(formatText(2), 'Al meglio di 3 game');
  assert.equal(formatText(3), 'Al meglio di 5 game');
  assert.equal(formatText(undefined), 'Partita a 1 game');
  for (const n of [1, 2, 3]) assert.doesNotMatch(formatText(n), /secco/);
});

test('punti del game: 0, 15, 30, 40, parità e vantaggio (l\'altro resta a 40)', () => {
  assert.deepEqual(gamePoints(0, 0), { player: '0', opponent: '0' });
  assert.deepEqual(gamePoints(1, 2), { player: '15', opponent: '30' });
  assert.deepEqual(gamePoints(3, 0), { player: '40', opponent: '0' });
  assert.deepEqual(gamePoints(3, 3), { player: '40', opponent: '40', deuce: true });
  assert.deepEqual(gamePoints(6, 6), { player: '40', opponent: '40', deuce: true });
  assert.deepEqual(gamePoints(4, 3), { player: 'Vant.', opponent: '40', adv: 'player' });
  assert.deepEqual(gamePoints(7, 8), { player: '40', opponent: 'Vant.', adv: 'opponent' });
});

test('nomi delle righe in tutte le modalità', () => {
  assert.deepEqual(rowNames(), { me: 'Tu', them: 'CPU' });
  assert.deepEqual(rowNames({ doubles: true }), { me: 'Tu + CPU', them: '2 CPU' });
  assert.deepEqual(rowNames({ multiplayer: true }), { me: 'Tu', them: 'Player 2' });
  assert.deepEqual(rowNames({ multiplayer: true, viewer: 'opponent' }), { me: 'Tu', them: 'Player 1' });
  assert.deepEqual(rowNames({ multiplayer: true, guestName: 'Giulia' }), { me: 'Tu', them: 'Giulia' });
  assert.deepEqual(rowNames({ multiplayer: true, doubles: true, viewer: 'opponent', hostName: 'Marco' }), { me: 'Tu + CPU', them: 'Marco + CPU' });
  assert.deepEqual(rowNames({ split: true }), { me: 'Player 1', them: 'Player 2' });
  assert.deepEqual(rowNames({ split: true, multiplayer: true, splitNames: { p1: 'Marco', p2: 'Giulia' } }), { me: 'Marco', them: 'Giulia' });
});

test('contro la CPU: la propria riga sopra, game e punti giusti, chi serve', () => {
  const v = scoreboardView(sc(2, 1, 1, 0, 'player'), { gamesToWin: 2 });
  assert.deepEqual(cells(v), ['•Tu 1 30', ' CPU 0 15']);
  assert.equal(v.format, 'Al meglio di 3 game');
  assert.equal(v.label, '');
  const w = scoreboardView(sc(0, 3, 0, 1, 'opponent'), { gamesToWin: 1 });
  assert.deepEqual(cells(w), [' Tu 0 0', '•CPU 1 40']);
  assert.equal(w.format, 'Partita a 1 game');
});

test('parità e vantaggio: stessa scritta degli annunci dei punti', () => {
  assert.equal(scoreboardView(sc(3, 3)).label, 'Parità');
  assert.equal(scoreboardView(sc(5, 4)).label, 'Vantaggio tuo');
  assert.equal(scoreboardView(sc(4, 5)).label, 'Vantaggio della CPU');
  // l'annuncio del punto dice lo stesso (natpf_point_call.viewScore)
  assert.match(pointCall({ winner: 'player', why: 'Point', score: { player: 'Ad', opponent: '40' } }).subText, /Vantaggio tuo$/);
  assert.match(pointCall({ winner: 'opponent', why: 'Out', score: { player: '40', opponent: 'Ad' } }).subText, /Vantaggio della CPU$/);
  // 1v1 con un amico, dal lato del Player 2: il vantaggio dell'host è «di Player 1»
  assert.equal(scoreboardView(sc(4, 3), { multiplayer: true, viewer: 'opponent' }).label, 'Vantaggio di Player 1');
  assert.equal(scoreboardView(sc(3, 4), { multiplayer: true, viewer: 'opponent' }).label, 'Vantaggio tuo');
  // stesso schermo: con i nomi
  assert.equal(scoreboardView(sc(3, 4), { split: true, splitNames: { p1: 'Marco', p2: 'Giulia' } }).label, 'Vantaggio Giulia');
});

test('sfida un amico, Player 2: la sua riga sopra con i suoi punti e i suoi game', () => {
  const v = scoreboardView(sc(1, 3, 2, 0, 'player'), { gamesToWin: 3, multiplayer: true, viewer: 'opponent', hostName: 'Marco' });
  assert.deepEqual(cells(v), [' Tu 0 40', '•Marco 2 15']);
  assert.equal(v.rows[0].side, 'me');
});

test('stesso schermo: P1 sopra e P2 sotto, anche se il punteggio è del motore', () => {
  const v = scoreboardView(sc(0, 2, 1, 1, 'opponent'), { split: true, multiplayer: true, splitNames: { p1: 'Anna', p2: 'Luca' }, gamesToWin: 2 });
  assert.deepEqual(cells(v), [' Anna 1 0', '•Luca 1 30']);
});

test('HTML del tabellone: righe con data-sb-*, intestazioni Game e Punti, nomi senza markup', () => {
  const html = scoreboardHtml(scoreboardView(sc(2, 0, 0, 0, 'opponent'), { split: true, splitNames: { p1: '<b>x</b>', p2: 'Giulia' } }));
  assert.match(html, /<span>Game<\/span><span>Punti<\/span>/);
  assert.match(html, /data-sb-row="me"[^>]*>.*data-sb-name>&lt;b&gt;x&lt;\/b&gt;</);
  assert.match(html, /class="sb-row sb-them serving" data-sb-row="them"/);
  assert.match(html, /data-sb-format>Partita a 1 game</);
  assert.doesNotMatch(html, /secco/);
});

test('motore: _syncScoreboardHUD passa punteggio e formato al tabellone (natpf_ui.onScore)', () => {
  const e = createHeadlessEngine({ difficulty: 'pro' });
  const seen = [];
  e.natpfArena = { setScore(){}, setSpeed(){}, update(){}, setPractice(){} };
  e.natpfUi = { onScore: (s, g) => seen.push(scoreboardView(s, { gamesToWin: g })) };
  e.matchConfig.gamesToWin = 2;
  Object.assign(e.score, sc(3, 2, 1, 0, 'opponent'));
  e._syncScoreboardHUD();
  assert.deepEqual(cells(seen.at(-1)), [' Tu 1 40', '•CPU 0 30']);
  assert.equal(seen.at(-1).format, 'Al meglio di 3 game');
});

test('pagina e stili: tabellone nuovo al posto della riga «Game … game secco», misure legate allo schermo', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="natpf-scoreboard"/);
  assert.doesNotMatch(html, /natpf-games-line/);
  const ui = readFileSync(new URL('../src/natpf/natpf_ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /'game secco'|al meglio di \$\{/);
  const css = readFileSync(new URL('../natpf-round.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf('#hud-root {\n  --sb:'), css.indexOf('.natpf-training .natpf-scoreboard'));
  assert.match(block, /--sb: clamp\([^)]*cqh/);
  assert.doesNotMatch(block, /\d(vw|vh)\b|@media/);
});

test('piede del tabellone fuori dalla sottogriglia: il formato e «Vantaggio di …» non si sovrappongono, testo leggibile', () => {
  // revisione del 07/11: con il piede nella sottogriglia «Vantaggio di Player 2» stava nelle colonne di game e punti
  // (2em + 3.4em) e usciva a sinistra sul formato («Al meglio di 5 game»): «gameVANTAGGIO». Ora in fila (flex) con
  // uno spazio, e la larghezza del piede conta in quella del tabellone
  const css = readFileSync(new URL('../natpf-round.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = sel => [...css.matchAll(/(?:^|\n)([^{}]*?)\{([^}]*)\}/g)].filter(m => m[1].split(',').some(s => s.trim() === sel)).map(m => m[2]).join(';');
  const foot = rule('.natpf-scoreboard .sb-foot');
  assert.match(foot, /display:\s*flex/);
  assert.doesNotMatch(foot, /subgrid/);
  assert.match(foot, /gap:\s*0?\.\d+em/);
  // la sottogriglia resta per intestazioni e righe, non per il piede
  assert.match(rule('.natpf-scoreboard .sb-row'), /grid-template-columns:\s*subgrid/);
  // niente colonne fisse per le due scritte del piede
  assert.doesNotMatch(rule('.natpf-scoreboard .sb-foot [data-sb-format]') + rule('.natpf-scoreboard .sb-label'), /grid-column/);
  // almeno 10 px (prima 0.56em: 7,3 px a 844×390 e 9,3 px nel ledwall 720×720)
  assert.match(foot, /font-size:\s*max\(10px,\s*0?\.6\d*em\)/);
  // la scritta del momento, se proprio non ci sta, si accorcia invece di uscire
  assert.match(rule('.natpf-scoreboard .sb-label'), /text-overflow:\s*ellipsis/);
});
