// B10 (06/11 sera): tabellone della partita come in televisione (natpf_scoreboard.js). Segnalazione: «la UI sotto per
// il punteggio dice "game" o "game secco", non si capisce lo score». Una riga per giocatore o squadra con chi serve,
// nome, game e punti del game in corso; il formato in parole; parità e vantaggio come negli annunci dei punti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatText, gamePoints, rowNames, shortName, shortNames, scoreboardView, scoreboardHtml, scoreTag } from '../src/natpf/natpf_scoreboard.js';
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

// B17.3 (08/11, schermata di riferimento dell'utente): sigle maiuscole come in televisione («DRL», «2KG»)
test('sigle dei nomi: TU, CPU, P1/P2, prime 3 lettere del nome scelto, squadre con il «+»', () => {
  assert.equal(shortName('Tu'), 'TU');
  assert.equal(shortName('CPU'), 'CPU');
  assert.equal(shortName('Player 1'), 'P1');
  assert.equal(shortName('Player 2'), 'P2');
  assert.equal(shortName('Marco'), 'MAR');
  assert.equal(shortName('Giulia'), 'GIU');
  assert.equal(shortName('Anna'), 'ANN');                        // rifinitura del 08/11: anche i nomi corti a 3 lettere (prima «ANNA»)
  assert.equal(shortName('Al'), 'AL');
  assert.equal(shortName('Bartolomeo Massimiliano'), 'BAR');
  assert.equal(shortName('Tu + CPU'), 'TU+CPU');
  assert.equal(shortName('Marco + CPU'), 'MAR+CPU');
  assert.equal(shortName('2 CPU'), '2CPU');
  assert.equal(shortName('Marco', 4), 'MARC');
  assert.equal(shortName('Marco', 6), 'MARCO');
  assert.equal(shortName('Jean Paul', 6), 'JEAN');                // con più parole non oltre la prima
  assert.equal(shortName('Jean Paul', 3, true), 'JPA');           // iniziali: J + le lettere dell'ultima parola
  assert.equal(shortName('Marco Rossi', 4, true), 'MROS');
  assert.equal(shortName('Marco', 3, true), 'MAR');               // una parola sola: le iniziali non cambiano niente
  assert.equal(shortName('Francesco', 6, 'ending'), 'FRANCO');    // 5 lettere più l'ultima (revisione del 08/11)
  assert.equal(shortName('Simone', 6, 'ending'), 'SIMONE');       // non più lunga di 6: resta intera
  assert.equal(shortName('Francesco Rossi', 6, 'ending'), 'FRANCO'); // sulla prima parola
  assert.equal(shortName('Jean Paul', 6, 'ending'), 'JEAN');      // prima parola corta: come senza «ending»
  assert.equal(shortName('Anna Francesco', 6, 'initials-ending'), 'AFRANO');
  // code point, non unità UTF-16: le emoji non si spezzano (prima «🎾🎾» a 3 dava «🎾\ud83c», nel tabellone «🎾�»)
  assert.equal(shortName('🎾🎾'), '🎾🎾');
  assert.equal(shortName('Marco🎾', 6), 'MARCO🎾');
  assert.equal(shortName('🎾 Marco', 3, true), '🎾MA');
  for (const n of ['🎾🎾', 'Marco🎾', '🎾 Marco']) for (const k of [3, 4, 6]) for (const m of [false, true, 'ending', 'initials-ending']) assert.ok(shortName(n, k, m).isWellFormed(), `${n} ${k} ${m}`);
  const v = scoreboardView(sc(0, 0), { split: true, splitNames: { p1: 'Marco', p2: 'Giulia' } });
  assert.deepEqual(v.rows.map(r => [r.name, r.short]), [['Marco', 'MAR'], ['Giulia', 'GIU']]);
});

// rifinitura del 08/11: «Marco»/«Marcello» e «Jean Paul»/«Jean Pierre» cadevano su P1/P2 (i nomi scelti sparivano),
// «Anna»/«Annalisa» uscivano ANNA/ANN, «José»/«Josè» si distinguevano solo dall'accento
// revisione del 08/11: le coppie italiane più comuni (Francesco/Francesca, Antonio/Antonia…) differiscono dalla 7ª lettera
// in poi e con il tetto a 6 cadevano ancora su P1/P2: ora 5 lettere più l'ultima prima delle iniziali e di P1/P2
test('sigle uguali: 3 lettere, poi fino a 6, poi 5 più l\'ultima, poi le iniziali delle parole, solo alla fine P1/P2; confronto senza accenti', () => {
  assert.deepEqual(shortNames('Marco', 'Giulia'), { me: 'MAR', them: 'GIU' });
  assert.deepEqual(shortNames('Marco', 'Maria'), { me: 'MARC', them: 'MARI' });      // uguali a 3 lettere: 4
  assert.deepEqual(shortNames('Marco', 'Marcello'), { me: 'MARCO', them: 'MARCE' }); // uguali a 4: 5
  assert.deepEqual(shortNames('Anna', 'Annalisa'), { me: 'ANNA', them: 'ANNAL' });   // non più ANNA/ANN
  assert.deepEqual(shortNames('Annalisa', 'Anna'), { me: 'ANNAL', them: 'ANNA' });
  assert.deepEqual(shortNames('Jean Paul', 'Jean Pierre'), { me: 'JPA', them: 'JPI' });   // iniziali delle parole
  assert.deepEqual(shortNames('Jean Paul', 'Jean Paolo'), { me: 'JPAU', them: 'JPAO' }); // iniziali allungate
  assert.deepEqual(shortNames('Marco', 'Marco Rossi'), { me: 'MAR', them: 'MRO' });
  assert.deepEqual(shortNames('Francesco', 'Francesca'), { me: 'FRANCO', them: 'FRANCA' }); // uguali fino a 8: 5 + l'ultima
  assert.deepEqual(shortNames('Antonio', 'Antonia'), { me: 'ANTONO', them: 'ANTONA' });
  assert.deepEqual(shortNames('Alessandra', 'Alessandro'), { me: 'ALESSA', them: 'ALESSO' });
  assert.deepEqual(shortNames('Simone', 'Simona'), { me: 'SIMONE', them: 'SIMONA' });       // 6 lettere bastano
  assert.deepEqual(shortNames('Francesco Rossi', 'Francesca Rossi'), { me: 'FRANCO', them: 'FRANCA' });
  assert.deepEqual(shortNames('Anna Francesco', 'Anna Francesca'), { me: 'AFRANO', them: 'AFRANA' }); // iniziali più l'ultima
  assert.deepEqual(shortNames('Francesco', 'Francesco'), { me: 'P1', them: 'P2' });
  assert.deepEqual(shortNames('🎾🎾', 'Marco🎾'), { me: '🎾🎾', them: 'MAR' });
  assert.deepEqual(shortNames('Marco', 'Marco'), { me: 'P1', them: 'P2' });          // uguali davvero: P1 e P2
  assert.deepEqual(shortNames('José', 'Josè'), { me: 'P1', them: 'P2' });            // solo l'accento non basta
  assert.deepEqual(shortNames('josé', 'JOSÉ'), { me: 'P1', them: 'P2' });
  assert.deepEqual(shortNames('Marco + CPU', 'Marcello + CPU'), { me: 'MARCO+CPU', them: 'MARCE+CPU' });
  assert.deepEqual(shortNames('Tu + CPU', '2 CPU'), { me: 'TU+CPU', them: '2CPU' });
});

test('HTML del tabellone: riquadro con linguetta, pallina, sigla (nome intero in data-sb-name e title), game, casella dei punti; niente intestazioni; etichetta del formato dentro il riquadro (B43)', () => {
  const html = scoreboardHtml(scoreboardView(sc(2, 0, 0, 0, 'opponent'), { split: true, splitNames: { p1: '<b>x</b>', p2: 'Giulia' } }));
  assert.doesNotMatch(html, /sb-head|<span>Game<\/span>|<span>Punti<\/span>/);
  assert.match(html, /<div class="sb-box"><div class="sb-row sb-me" data-sb-row="me" title="&lt;b&gt;x&lt;\/b&gt;"><i class="sb-tab"[^>]*><\/i><i class="sb-serve"[^>]*><\/i><b class="sb-name" data-sb-name="&lt;b&gt;x&lt;\/b&gt;"[^>]*>&lt;B&gt;<\/b>/);
  assert.match(html, /class="sb-row sb-them serving" data-sb-row="them" title="Giulia"/);
  assert.match(html, /data-sb-name="Giulia"[^>]*>GIU<\/b><span class="sb-sr">Giulia \(al servizio\)<\/span>/);
  assert.match(html, /data-sb-games>0<\/span><strong class="sb-points" data-sb-points>0<\/strong>/);
  // B43: una sola etichetta, DENTRO il riquadro (dopo le righe), con il formato corto; niente sottotitolo sotto il riquadro;
  // formato intero e scritta del momento solo per lo screen reader
  assert.match(html, /<\/div><span class="sb-tag" data-sb-tag="format" aria-hidden="true">1 game<\/span><\/div><span class="sb-sr"><span data-sb-format>Partita a 1 game<\/span> <span data-sb-label><\/span><\/span>$/);
  assert.doesNotMatch(html, /sb-foot|sb-rule|secco/);
  // al vantaggio la casella dice «AD» (larghezza fissa); «Vantaggio tuo» solo per lo screen reader (lo dicono la casella e
  // la scritta grande del punto), l'etichetta resta il formato
  const adv = scoreboardHtml(scoreboardView(sc(4, 3), { gamesToWin: 2 }));
  assert.match(adv, /data-sb-row="me"[^>]*>.*data-sb-points>AD<\/strong>/);
  assert.match(adv, /data-sb-row="them"[^>]*>.*data-sb-points>40<\/strong>/);
  assert.match(adv, /data-sb-tag="format"[^>]*>Al meglio di 3<\/span>/);
  assert.match(adv, /<span class="sb-sr">.*data-sb-label>Vantaggio tuo</);
  assert.doesNotMatch(adv, /Vant\./);
});

test('B43 · etichetta del tabellone: il formato corto («1 game», «Al meglio di 3/5»); al punto decisivo del formato in fiera «Punto decisivo»; parità e vantaggio non la cambiano', () => {
  assert.deepEqual(scoreTag(1), { text: '1 game', kind: 'format' });
  assert.deepEqual(scoreTag(2), { text: 'Al meglio di 3', kind: 'format' });
  assert.deepEqual(scoreTag(3), { text: 'Al meglio di 5', kind: 'format' });
  assert.deepEqual(scoreTag(undefined), { text: '1 game', kind: 'format' });
  assert.deepEqual(scoreTag(2, { decisive: true }), { text: 'Punto decisivo', kind: 'decisive' });
  const fair = (p, o, extra = {}) => ({ ...sc(p, o), fair: true, ...extra });
  assert.deepEqual(scoreboardView(fair(3, 3)).tag, { text: 'Punto decisivo', kind: 'decisive' }, 'formato in fiera, 40-40');
  assert.deepEqual(scoreboardView(fair(3, 2), { gamesToWin: 2 }).tag, { text: 'Al meglio di 3', kind: 'format' }, 'formato in fiera, 40-30: il formato');
  assert.deepEqual(scoreboardView(sc(3, 3), { gamesToWin: 2 }).tag, { text: 'Al meglio di 3', kind: 'format' }, 'classico, parità: il formato (40 · 40 nelle caselle)');
  assert.deepEqual(scoreboardView(sc(5, 4)).tag, { text: '1 game', kind: 'format' }, 'classico, vantaggio: il formato (AD nella casella)');
  assert.match(scoreboardHtml(scoreboardView(fair(3, 3), { split: true, splitNames: { p1: 'Marco', p2: 'Giulia' } })), /<span class="sb-tag" data-sb-tag="decisive" aria-hidden="true">Punto decisivo<\/span><\/div>/);
  // la riga «Formato veloce» del B35 non c'è più sul tabellone, nemmeno con il servizio che passa ogni due punti
  for (const opt of [{}, { split: true }, { altServe: true }]) assert.doesNotMatch(scoreboardHtml(scoreboardView(fair(1, 0), opt)), /Formato veloce|sb-rule|sb-foot/);
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
  assert.match(block, /--sb: clamp\(17px, 3cqh, 40px\)/);   // rifinitura del 08/11: 3 cqh (prima 2,6)
  assert.doesNotMatch(block, /\d(vw|vh)\b|@media/);
  // B17.3, disegno di riferimento: angolo a 2,3 cqw / 6 cqh, riga di 1,75 em, linguette gialla e rosa, casella dei punti
  // piena gialla larga 1,6 em (fissa: «AD» e «40» uguali) con la cifra scura, sottotitolo di almeno 12 px
  assert.match(block, /--sb-left: clamp\(\d+px, 2\.3cqw/);
  assert.match(block, /--sb-top: clamp\(\d+px, 6cqh/);
  const rule = sel => [...block.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|\n)([^{}]*?)\{([^}]*)\}/g)].filter(m => m[1].split(',').some(s => s.trim() === sel)).map(m => m[2]).join(';');
  assert.match(rule('.natpf-scoreboard .sb-box'), /grid-template-columns: 0\.42em 0\.85em minmax\(2\.2em, max-content\) 1\.5em 1\.6em/);
  assert.match(rule('.natpf-scoreboard .sb-row'), /height: 1\.75em/);
  assert.match(rule('.natpf-scoreboard .sb-tab'), /background: var\(--lb-ball\)/);
  assert.match(rule('.natpf-scoreboard .sb-them .sb-tab'), /background: var\(--lb-pink\)/);
  assert.match(rule('.natpf-scoreboard .sb-points'), /background: var\(--lb-ball\)[\s\S]*color: #0a1330[\s\S]*font-size: 1\.08em/);
  assert.match(rule('.natpf-scoreboard .sb-name'), /text-transform: uppercase/);
  assert.doesNotMatch(block, /sb-head/);
});

test('B43 · etichetta dentro il riquadro: pillola tonda sotto le sigle, almeno 12 px, azzurra (formato) o rosa (punto decisivo); niente piede né riga «Formato veloce»', () => {
  // prima (B17.3, revisione del 07/11) il sottotitolo stava sotto il riquadro, in fila (flex) con la scritta del momento,
  // e il B35 aggiungeva la riga «Formato veloce: il servizio cambia ogni 2 punti»; dal B43 una sola etichetta piccola
  const css = readFileSync(new URL('../natpf-round.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = sel => [...css.matchAll(/(?:^|\n)([^{}]*?)\{([^}]*)\}/g)].filter(m => m[1].split(',').some(s => s.trim() === sel)).map(m => m[2]).join(';');
  const tag = rule('.natpf-scoreboard .sb-tag');
  assert.match(tag, /grid-column:\s*3 \/ -1/, 'nella griglia del riquadro, allineata alle sigle');
  assert.match(tag, /border-radius:\s*999px/, 'pillola tonda');
  assert.match(tag, /font-size:\s*max\(12px,\s*0?\.5\d*em\)/, 'almeno 12 px');
  assert.match(tag, /color:\s*#4dd7ff/i, 'azzurro del gioco');
  assert.match(tag, /text-transform:\s*uppercase/);
  assert.doesNotMatch(tag, /\d(vw|vh)\b/);
  assert.match(rule('.natpf-scoreboard .sb-tag[data-sb-tag="decisive"]'), /background:\s*#ff4d94/i, 'punto decisivo: rosa del gioco');
  for (const gone of ['.natpf-scoreboard .sb-foot', '.natpf-scoreboard .sb-rule', '.natpf-scoreboard .sb-label']) assert.equal(rule(gone), '', `${gone}: niente più`);
  // la scritta del segnale del momento giusto (B37) nelle aree strette sta sotto il tabellone (prima ne copriva il bordo
  // destro: 13 px a 720 × 720)
  const hud = readFileSync(new URL('../natpf-hud.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(hud, /@container natpf \(max-width: 800px\) \{\s*\.natpf-cue-hint \{\s*top: calc\(clamp\(12px, 6cqh, 64px\) \+ 5\.4 \* clamp\(17px, 3cqh, 40px\)\);/);
  // le righe restano nella sottogriglia; il tabellone resta una colonna (riquadro e testo per lo screen reader)
  assert.match(rule('.natpf-scoreboard .sb-row'), /grid-template-columns:\s*subgrid/);
  assert.match(rule('.natpf-scoreboard'), /flex-direction:\s*column/);
  assert.match(rule('.natpf-scoreboard .sb-box'), /display:\s*grid/);
});
