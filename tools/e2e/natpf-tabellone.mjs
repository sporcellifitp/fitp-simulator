// NATPF: tabellone del punteggio in partita (B10, segnalazione del 06/11: «la UI sotto per il punteggio dice "game" o
// "game secco", non si capisce lo score»). Gioco vero con vite; la partita si avvia dal menu come chi gioca (contro la
// CPU) o con le sessioni del motore (stesso schermo, sfida un amico vista dall'host e dal Player 2), poi si scrivono
// punteggi tipici nel motore (30-15, parità, vantaggio, game) e si leggono le righe del tabellone: nome, game, punti, chi
// serve e il formato in parole. Schermate a 1280×720, 1920×1080 e nel riquadro del ledwall 720×720 (OUT=cartella).
// B17.3 (08/11): il tabellone sta nell'angolo in alto a sinistra (prima al centro), disegnato come la schermata di
// riferimento dell'utente (docs/b17/punteggio-riferimento.md): sigle maiuscole (TU, CPU, P2, MAR…; nome intero in
// data-sb-name e nel title), casella piena dei punti («AD» al vantaggio), sottotitolo con formato e «Parità»/«Vantaggio …»
// sotto il riquadro (≥ 12 px), --sb 3 cqh (17–40 px; rifinitura del 08/11: prima 2,6 cqh e 11 px, «possibilmente più
// grande e leggibile»), angolo a 2,3 cqw / 6 cqh, lontano dal pulsante di pausa in alto
// a destra; stesso schermo: una copia in alto a sinistra della metà del Player 2 (#natpf-scoreboard-p2), ognuna nella sua
// metà, e niente etichetta «Al servizio» (è di una sola vista). Misure in docs/b17/punteggio.md.
// B43 (richiesta dell'utente del 13/11: «troppi testi vicino allo scoreboard… al meglio di tre toglilo, magari metti
// etichetta sullo scoreboard»): niente sottotitolo sotto il riquadro; una sola etichetta tonda DENTRO il riquadro con il
// formato («1 GAME», «AL MEGLIO DI 3»), che al punto decisivo del formato in fiera dice «PUNTO DECISIVO». Formato intero e
// «Parità»/«Vantaggio …» restano nel testo per lo screen reader ([data-sb-format], [data-sb-label]), non si vedono.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome GAME_PORT=3851 node natpf-tabellone.mjs
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3161), ONLY_SHOTS = !!process.env.ONLY_SHOTS;
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// righe del tabellone come le legge chi guarda: nome, game, punti, servizio; più il formato e la casella del motore
const read = p => p.evaluate(() => {
  const sb = document.getElementById('natpf-scoreboard'), vis = el => !!el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden';
  // name: la sigla scritta; full: il nome intero (data-sb-name e title della riga)
  const rows = sb ? [...sb.querySelectorAll('[data-sb-row]')].map(r => ({ side: r.dataset.sbRow, name: r.querySelector('[data-sb-name]')?.textContent || '', full: r.querySelector('[data-sb-name]')?.dataset.sbName || '', title: r.title, games: r.querySelector('[data-sb-games]')?.textContent || '', points: r.querySelector('[data-sb-points]')?.textContent || '', serve: r.classList.contains('serving') })) : [];
  const b = sb?.getBoundingClientRect();
  // estensione reale delle due scritte del piede (Range sul testo: il riquadro della cella può essere più stretto del
  // testo che ne esce); la scritta del momento può essere vuota (niente parità né vantaggio)
  // (la scritta del momento si misura dal suo riquadro: se si accorcia con i puntini il testo nascosto non conta)
  const ink = (el, box = false) => { if (!el || !el.textContent) return null; const r = document.createRange(); r.selectNodeContents(el); const q = box ? el.getBoundingClientRect() : r.getBoundingClientRect(); return { l: Math.round(q.left * 10) / 10, r: Math.round(q.right * 10) / 10, t: Math.round(q.top), b: Math.round(q.bottom), fs: parseFloat(getComputedStyle(el).fontSize) }; };
  const fmtEl = sb?.querySelector('[data-sb-format]'), labEl = sb?.querySelector('[data-sb-label]');
  // riquadro di un elemento in vista (null se nascosto o vuoto): copia del tabellone del P2 e pulsante di pausa
  const rc = el => { if (!el || getComputedStyle(el).display === 'none') return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; };
  const p2 = document.getElementById('natpf-scoreboard-p2');
  // riquadro scuro e casella dei punti di ogni riga (misure del disegno di riferimento); etichetta «Al servizio» in vista?
  const boxEl = sb?.querySelector('.sb-box'), cells = sb ? [...sb.querySelectorAll('[data-sb-points]')].map(rc) : [];
  const tag = document.getElementById('server-tag'), tagOn = !!tag && !tag.classList.contains('hidden') && getComputedStyle(tag).display !== 'none';
  // sigle accorciate con i puntini (il testo non sta nella cella): non deve succedere, nemmeno nella copia del P2 nel ledwall diviso
  const nameCut = [...document.querySelectorAll('.natpf-scoreboard [data-sb-name]')].some(el => el.scrollWidth > el.clientWidth + 1);
  // «game secco» non deve comparire in nessuna scritta visibile della pagina (innerText salta ciò che è nascosto)
  // B43: l'etichetta dentro il riquadro (testo, tipo, carattere, riquadro) e niente sottotitolo o riga «Formato veloce» in vista
  const tagEl = sb?.querySelector('.sb-tag'), sbTag = tagEl ? { text: tagEl.textContent, kind: tagEl.dataset.sbTag, fs: parseFloat(getComputedStyle(tagEl).fontSize), up: getComputedStyle(tagEl).textTransform === 'uppercase', r: rc(tagEl), cut: tagEl.scrollWidth > tagEl.clientWidth + 1 } : null;
  // (formato intero e scritta del momento dentro .sb-sr: 1 px ritagliato, solo per lo screen reader, non contano)
  const seen = el => vis(el) && !el.closest('.sb-sr') && el.getBoundingClientRect().width > 2;
  const extra = [...document.querySelectorAll('.natpf-scoreboard .sb-foot, .natpf-scoreboard .sb-rule')].filter(vis).length + (seen(fmtEl) ? 1 : 0) + (seen(labEl) ? 1 : 0)
    + (fmtEl && !fmtEl.closest('.sb-sr') ? 1 : 0) + (labEl && !labEl.closest('.sb-sr') ? 1 : 0);
  return { visible: vis(sb), rows, format: fmtEl?.textContent || '', label: labEl?.textContent || '', tag: sbTag, extra, secco: /secco/i.test(document.body.innerText), fmtInk: ink(fmtEl), labInk: ink(labEl, true), box: b ? { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } : null,
    fs: sb ? parseFloat(getComputedStyle(sb).fontSize) : 0, p2: rc(p2), same: !!p2 && p2.textContent === sb?.textContent, pause: rc(document.querySelector('.natpf-pause-btn')),
    sbBox: rc(boxEl), cells, cellFs: cells.length ? parseFloat(getComputedStyle(sb.querySelector('[data-sb-points]')).fontSize) : 0, head: !!sb?.querySelector('.sb-head'), tagOn, nameCut, split: document.body.classList.contains('natpf-split') };
});
// B43: l'etichetta sta tutta dentro il riquadro scuro (.sb-box), sotto le righe, intera (non accorciata), maiuscola, di almeno
// 12 px; nient'altro sotto il riquadro (né sottotitolo né riga «Formato veloce»: prima la revisione del 07/11 controllava
// qui che formato e «Vantaggio di …» del sottotitolo non si toccassero)
const tagIn = v => !!v.tag?.r && !!v.sbBox && v.tag.r.x >= v.sbBox.x && v.tag.r.x + v.tag.r.w <= v.sbBox.x + v.sbBox.w + 1 && v.tag.r.y >= v.sbBox.y && v.tag.r.y + v.tag.r.h <= v.sbBox.y + v.sbBox.h + 1
  && v.tag.fs >= 12 && v.tag.up && !v.tag.cut && v.extra === 0;
const setScore = (p, s, gamesToWin = 2) => p.evaluate(({ s, gamesToWin }) => { const E = __natpfTennis; E.matchConfig.gamesToWin = gamesToWin; Object.assign(E.score, s); E._syncScoreboardHUD(); try { E.__render?.(); } catch {} }, { s, gamesToWin });
// prima della schermata anche l'etichetta «Al servizio» si aggiorna (update() è fermo: _updateProjectedHUD la posiziona o
// la nasconde come in partita; prima restava dov'era, e nelle schermate dello stesso schermo compariva a cavallo della metà
// del P2 o tagliata al bordo del ledwall)
const shot = async (p, name) => { await p.evaluate(() => { try { __natpfTennis._updateProjectedHUD?.(); __natpfTennis.__render?.(); } catch {} }); await p.screenshot({ path: `${SP}/tabellone-${name}.png` }); };
const row = (v, side) => v.rows.find(r => r.side === side) || {};
// B17.3: riquadro nell'angolo in alto a sinistra come nella schermata di riferimento (left 2,3 cqw tra 12 e 44 px, top 6 cqh
// tra 12 e 64 px), con il sottotitolo non oltre il 23% dello schermo (21,5–21,8% con il carattere a 3 cqh; con 2,6 cqh era
// il 19,4–19,8% e il limite il 20%), carattere 3 cqh tra 17 e 40 px, a destra del
// tabellone almeno 40 px liberi prima del pulsante di pausa, che in partita DEVE esserci (se non si vede, la prova è rossa:
// prima «!v.pause ||» lasciava passare senza misurare). Disegno: niente intestazione «Game/Punti», riquadro largo al più
// 13 em (sigle, non nomi interi), due caselle dei punti larghe uguali (1,6 em) e alte 1,5 em con la cifra a 1,08 em
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fsAt = h => clamp(h*.03, 17, 40);
const corner = (v, w, h, fs = fsAt(h)) => !!v.box && Math.abs(v.box.x - clamp(w*.023, 12, 44)) <= 1 && Math.abs(v.box.y - clamp(h*.06, 12, 64)) <= 1 && v.box.y + v.box.h <= h*.23
  && Math.abs(v.fs - fs) < 1 && !!v.pause && v.box.x + v.box.w + 40 <= v.pause.x && drawn(v);
const drawn = v => !v.head && !!v.sbBox && v.sbBox.w <= 13 * v.fs && v.cells.length === 2 && Math.abs(v.cells[0].w - v.cells[1].w) <= 1
  && Math.abs(v.cells[0].w - 1.6 * v.fs) <= 2 && Math.abs(v.cells[0].h - 1.5 * v.fs) <= 2 && Math.abs(v.cellFs - 1.08 * v.fs) <= 1;
// stesso schermo: la copia del P2 finisce almeno 40 px prima del pulsante di pausa (revisione del 08/11: a 844×390 con i
// nomi lunghi finiva sotto la pausa, 812 > 774; a 1024×600 restavano 17 px)
const p2Clear = v => !!v.p2 && !!v.pause && v.p2.x + v.p2.w + 40 <= v.pause.x;
const splitFs = (w, h) => fsAt(h);        // stesso carattere anche nello stesso schermo (il riquadro con le sigle è stretto)
const fmt = v => JSON.stringify(v);

const B = await launch();
try {
  const { p, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w: 1280, h: 720 });
  await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await p.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  // partita contro la CPU dal menu (mouse, come natpf-schermo), poi il motore fermo: si disegna solo per le schermate
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; if (!ui.testInput) ui.toggleTestInput(); ui.selectController('mouse', { open: false }); ui.lobby.setMode('cpu'); ui.lobby.setFormat('singles'); ui.lobby.go('match'); });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('btn-start-match').click());
  await p.waitForFunction(() => !__natpfTennis.autoPlayMode, null, { timeout: 20000 });
  await p.waitForTimeout(600);
  await p.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; E.__update = E.update; E.update = () => {}; E.hud.hideCenterBanner(); });

  // 1v1 contro la CPU, al meglio di 3: 30-15, 1-0 nei game, serve chi gioca
  await setScore(p, { playerPoints: 2, opponentPoints: 1, playerGames: 1, opponentGames: 0, server: 'player' }, 2);
  let v = await read(p);
  if (!ONLY_SHOTS){
    check('1v1 CPU: tabellone visibile con due righe, sigle «TU» e «CPU» (nome intero in data-sb-name e nel title)', v.visible && v.rows.length === 2 && row(v, 'me').name === 'TU' && row(v, 'them').name === 'CPU' && row(v, 'me').full === 'Tu' && row(v, 'me').title === 'Tu', fmt(v));
    check('1v1 CPU: game 1 e 0, punti 30 e 15, serve chi gioca', row(v, 'me').games === '1' && row(v, 'them').games === '0' && row(v, 'me').points === '30' && row(v, 'them').points === '15' && row(v, 'me').serve && !row(v, 'them').serve, fmt(v));
    check('1v1 CPU: formato in una piccola etichetta dentro il riquadro («AL MEGLIO DI 3»; per lo screen reader «Al meglio di 3 game»), niente «game secco»', v.tag?.text === 'Al meglio di 3' && v.tag.kind === 'format' && v.format === 'Al meglio di 3 game' && !v.secco, fmt(v));
    check('1280×720: tabellone nell\'angolo in alto a sinistra (29, 43), carattere 21,6 px, etichetta ≥ 12 px dentro il riquadro e niente sotto, lontano dalla pausa, niente copia del P2', corner(v, 1280, 720) && tagIn(v) && !v.p2, fmt(v));
    check('1280×720: etichetta «Al servizio» in vista sopra chi serve (schermo intero)', v.tagOn, fmt({ tagOn: v.tagOn }));
  }
  await shot(p, '1280-1v1-cpu-30-15');
  await setScore(p, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'opponent' }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('partita a 1 game: etichetta «1 GAME», punti 0-0, serve la CPU', v.tag?.text === '1 game' && v.format === 'Partita a 1 game' && tagIn(v) && row(v, 'me').points === '0' && row(v, 'them').points === '0' && row(v, 'them').serve && !row(v, 'me').serve, fmt(v));
  await shot(p, '1280-1v1-cpu-0-0-1game');
  await setScore(p, { playerPoints: 3, opponentPoints: 3, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('parità: 40 e 40; «Parità» solo per lo screen reader, l\'etichetta resta «1 GAME»', row(v, 'me').points === '40' && row(v, 'them').points === '40' && v.label === 'Parità' && v.tag?.text === '1 game' && tagIn(v), fmt(v));
  await shot(p, '1280-1v1-cpu-parita');
  await setScore(p, { playerPoints: 4, opponentPoints: 3, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('vantaggio di chi gioca: «AD» nella sua casella, 40 alla CPU, «Vantaggio tuo» solo per lo screen reader, caselle larghe uguali', row(v, 'me').points === 'AD' && row(v, 'them').points === '40' && v.label === 'Vantaggio tuo' && drawn(v) && tagIn(v), fmt(v));
  await shot(p, '1280-1v1-cpu-vantaggio');
  await setScore(p, { playerPoints: 3, opponentPoints: 5, playerGames: 0, opponentGames: 0, server: 'player' }, 3);
  v = await read(p);
  if (!ONLY_SHOTS) check('vantaggio della CPU al meglio di 5: «AD» nella casella della CPU, etichetta «AL MEGLIO DI 5» dentro il riquadro', row(v, 'them').points === 'AD' && row(v, 'me').points === '40' && v.label === 'Vantaggio della CPU' && v.tag?.text === 'Al meglio di 5' && tagIn(v), fmt(v));
  // B43: formato in fiera, 40-40 (punto decisivo): l'etichetta diventa rosa, «PUNTO DECISIVO»; finito il 40-40 torna il formato
  await setScore(p, { playerPoints: 3, opponentPoints: 3, playerGames: 0, opponentGames: 0, server: 'player', fair: true }, 1);
  v = await read(p);
  const pink = await p.evaluate(() => getComputedStyle(document.querySelector('#natpf-scoreboard .sb-tag')).backgroundColor);
  if (!ONLY_SHOTS) check('formato in fiera, 40-40: etichetta rosa «PUNTO DECISIVO» dentro il riquadro (al posto del formato)', v.tag?.text === 'Punto decisivo' && v.tag.kind === 'decisive' && pink === 'rgb(255, 77, 148)' && tagIn(v), fmt({ tag: v.tag, pink, extra: v.extra }));
  await shot(p, '1280-1v1-cpu-punto-decisivo');
  await setScore(p, { playerPoints: 0, opponentPoints: 0, playerGames: 1, opponentGames: 0, server: 'player', fair: true }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('formato in fiera, punto dopo: di nuovo «1 GAME»', v.tag?.text === '1 game' && v.tag.kind === 'format', fmt(v.tag));
  await setScore(p, { fair: false }, 1);

  // 1920×1080: stesso tabellone, in proporzione
  await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(250);
  await setScore(p, { playerPoints: 1, opponentPoints: 3, playerGames: 1, opponentGames: 1, server: 'opponent' }, 2);
  v = await read(p);
  if (!ONLY_SHOTS) check('1920×1080: 15-40, game 1-1, tabellone in alto a sinistra (44, 65; carattere 32,4 px) e non più alto del 23% dello schermo', row(v, 'me').points === '15' && row(v, 'them').points === '40' && corner(v, 1920, 1080), fmt(v));
  await shot(p, '1920-1v1-cpu-15-40');
  // 1024×600 (schermo piccolo): stesso angolo, carattere 18 px, sottotitolo di 12 px
  await p.setViewportSize({ width: 1024, height: 600 }); await p.waitForTimeout(250);
  await setScore(p, { playerPoints: 3, opponentPoints: 2, playerGames: 0, opponentGames: 1, server: 'player' }, 2);
  v = await read(p);
  if (!ONLY_SHOTS) check('1024×600: 40-30, tabellone in alto a sinistra (24, 36; carattere 18 px), etichetta ≥ 12 px dentro il riquadro', row(v, 'me').points === '40' && row(v, 'them').points === '30' && corner(v, 1024, 600) && tagIn(v), fmt(v));
  await shot(p, '1024-1v1-cpu-40-30');

  // 2v2 contro la CPU: squadre
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(250);
  await p.evaluate(() => { __natpfTennis.setMatchFormat('doubles'); });
  await setScore(p, { playerPoints: 2, opponentPoints: 2, playerGames: 0, opponentGames: 1, server: 'player' }, 2);
  v = await read(p);
  if (!ONLY_SHOTS) check('2v2 CPU: sigle «TU+CPU» e «2CPU» (nomi interi «Tu + CPU» e «2 CPU»), 30-30, game 0-1', row(v, 'me').name === 'TU+CPU' && row(v, 'them').name === '2CPU' && row(v, 'me').full === 'Tu + CPU' && row(v, 'them').full === '2 CPU' && row(v, 'me').points === '30' && row(v, 'them').points === '30' && row(v, 'them').games === '1' && drawn(v), fmt(v));
  await shot(p, '1280-2v2-cpu-30-30');
  await p.evaluate(() => { __natpfTennis.setMatchFormat('singles'); });

  // stesso schermo: i nomi scritti nella pagina «Collega»
  await p.evaluate(() => { const E = __natpfTennis; E.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' }; E.startSplit(); });
  v = await read(p);
  // revisione del 08/11: la copia del P2 è piena subito dopo startSplit (prima restava vuota fino al primo punteggio)
  if (!ONLY_SHOTS) check('stesso schermo: subito dopo l\'avvio la copia del P2 è già piena e uguale al tabellone, e l\'etichetta «Al servizio» è sparita subito', !!v.p2 && v.same && row(v, 'me').name === 'MAR' && !v.tagOn, fmt({ p2: v.p2, same: v.same, rows: v.rows, tagOn: v.tagOn }));
  await setScore(p, { playerPoints: 1, opponentPoints: 0, playerGames: 1, opponentGames: 2, server: 'opponent' }, 3);
  v = await read(p);
  if (!ONLY_SHOTS) check('stesso schermo: righe con le sigle dei nomi (MAR, GIU; interi Marco e Giulia), 15-0, serve Giulia, etichetta «AL MEGLIO DI 5»', row(v, 'me').name === 'MAR' && row(v, 'them').name === 'GIU' && row(v, 'me').full === 'Marco' && row(v, 'them').full === 'Giulia' && row(v, 'me').points === '15' && row(v, 'them').points === '0' && row(v, 'them').serve && v.format === 'Al meglio di 5 game' && v.tag?.text === 'Al meglio di 5' && tagIn(v), fmt(v));
  // B17.3: un tabellone in alto a sinistra di ogni metà, lo stesso testo, ognuno dentro la sua metà (la linea scura sta a 637–643)
  if (!ONLY_SHOTS) check('stesso schermo 1280×720: tabellone del P1 nella metà sinistra e copia uguale in alto a sinistra della metà del P2', corner(v, 1280, 720, splitFs(1280, 720)) && v.box.x + v.box.w <= 637 && !!v.p2 && v.same && Math.abs(v.p2.x - (643 + v.box.x)) <= 1 && Math.abs(v.p2.y - v.box.y) <= 1 && v.p2.x + v.p2.w <= 1280 && p2Clear(v), fmt({ box: v.box, p2: v.p2, same: v.same, pause: v.pause }));
  await shot(p, '1280-stesso-schermo');
  // revisione del 08/11: «Francesco»/«Francesca» (e le altre coppie italiane che differiscono dalla 7ª lettera) cadevano su
  // P1/P2 anche con le sigle allungate fino a 6: ora 5 lettere più l'ultima, FRANCO/FRANCA, intere nella cella
  await p.evaluate(() => { const E = __natpfTennis; E.natpfSplitNames = { p1: 'Francesco', p2: 'Francesca' }; E._syncScoreboardHUD(); });
  v = await read(p);
  if (!ONLY_SHOTS) check('stesso schermo 1280×720, Francesco/Francesca: sigle «FRANCO» e «FRANCA» (non P1/P2), nomi interi in data-sb-name, sigle non accorciate, copia del P2 uguale e lontana dalla pausa', row(v, 'me').name === 'FRANCO' && row(v, 'them').name === 'FRANCA' && row(v, 'me').full === 'Francesco' && row(v, 'them').full === 'Francesca' && !v.nameCut && v.same && corner(v, 1280, 720, splitFs(1280, 720)) && p2Clear(v), fmt(v));
  await shot(p, '1280-stesso-schermo-francesco');
  await p.evaluate(() => { __natpfTennis.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' }; __natpfTennis._syncScoreboardHUD(); });
  await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(250);
  await shot(p, '1920-stesso-schermo');
  await setScore(p, { playerPoints: 5, opponentPoints: 4, playerGames: 1, opponentGames: 2, server: 'opponent' }, 3);
  v = await read(p);
  if (!ONLY_SHOTS) check('stesso schermo, vantaggio: «AD» a Marco («Vantaggio Marco» per lo screen reader), etichetta dentro il riquadro', row(v, 'me').points === 'AD' && v.label === 'Vantaggio Marco' && tagIn(v), fmt(v));
  // revisione del 08/11 (difetto preesistente): nello stesso schermo niente etichetta «Al servizio», anche dopo un nuovo
  // punteggio con un altro battitore e un disegno (_updateProjectedHUD come in partita)
  await p.evaluate(() => { try { __natpfTennis._updateProjectedHUD?.(); __natpfTennis.__render?.(); } catch {} });
  v = await read(p);
  if (!ONLY_SHOTS) check('stesso schermo: l\'etichetta «Al servizio» resta nascosta anche dopo un disegno con il battitore cambiato', v.split && !v.tagOn, fmt({ split: v.split, tagOn: v.tagOn }));
  // nomi lunghi (24 caratteri, il massimo della pagina «Collega») al vantaggio: tutto dentro il riquadro, scritte separate;
  // la copia del P2 dentro la sua metà e almeno 40 px prima della pausa anche a 1024×600 e 844×390 (revisione del 08/11)
  await p.evaluate(() => { __natpfTennis.natpfSplitNames = { p1: 'Bartolomeo Massimiliano', p2: 'Maria Francesca Giovanna' }; });
  for (const [w, h] of [[1920, 1080], [1024, 600], [844, 390]]){
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
    await setScore(p, { playerPoints: 4, opponentPoints: 5, playerGames: 2, opponentGames: 2, server: 'player' }, 3);
    v = await read(p);
    if (!ONLY_SHOTS) check(`stesso schermo ${w}×${h}, nomi di 24 caratteri al vantaggio: sigle «BAR» e «MAR», etichetta dentro il riquadro, tabellone nella sua metà`, row(v, 'me').name === 'BAR' && row(v, 'them').name === 'MAR' && v.label === 'Vantaggio Maria Francesca Giovanna' && tagIn(v) && v.box.x >= 0 && v.box.x + v.box.w <= w / 2, fmt(v));
    if (!ONLY_SHOTS) check(`stesso schermo ${w}×${h}, nomi lunghi: copia del P2 nella sua metà e almeno 40 px prima del pulsante di pausa`, !!v.p2 && v.same && v.p2.x >= w / 2 && p2Clear(v), fmt({ box: v.box, p2: v.p2, pause: v.pause }));
    await shot(p, `${w}-stesso-schermo-nomi-lunghi`);
  }
  await p.evaluate(() => { __natpfTennis.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' }; });
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(250);
  await p.evaluate(() => __natpfTennis.endSplit());

  // sfida un amico, vista dall'host e dal Player 2 (il proprio nome sopra, come negli annunci)
  await p.evaluate(() => { const E = __natpfTennis; E.isMultiplayer = true; });
  await setScore(p, { playerPoints: 2, opponentPoints: 3, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('sfida un amico (host): sigle «TU» e «P2» (nome intero «Player 2»), 30-40', row(v, 'me').name === 'TU' && row(v, 'them').name === 'P2' && row(v, 'them').full === 'Player 2' && row(v, 'me').points === '30' && row(v, 'them').points === '40' && row(v, 'me').serve, fmt(v));
  if (!ONLY_SHOTS) check('finito lo stesso schermo: la copia del P2 sparisce', !v.p2, fmt({ p2: v.p2 }));
  // l'avviso «In attesa di Player 2» sotto il tabellone, allineato a sinistra, senza toccarlo; senza il bordo sinistro di
  // 4 px (rifinitura del 08/11: con gli angoli a pillola si vedeva come un arco giallo «(»)
  const pres = await p.evaluate(() => { const el = document.getElementById('opponent-presence-pill'); el.classList.remove('hidden'); const r = el.getBoundingClientRect(), b = document.getElementById('natpf-scoreboard').getBoundingClientRect(), cs = getComputedStyle(el); el.classList.add('hidden'); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), sbL: Math.round(b.left), sbB: Math.round(b.bottom), borderL: parseFloat(cs.borderLeftWidth), radius: parseFloat(cs.borderTopLeftRadius) }; });
  if (!ONLY_SHOTS) check('sfida un amico: «In attesa di Player 2» sotto il tabellone (4–24 px più in basso), allineato al suo bordo sinistro', pres.y >= pres.sbB + 4 && pres.y <= pres.sbB + 24 && Math.abs(pres.x - pres.sbL) <= 2, JSON.stringify(pres));
  if (!ONLY_SHOTS) check('sfida un amico: la pillola «In attesa» non ha il bordo sinistro (niente arco giallo sugli angoli tondi)', pres.borderL === 0 && pres.radius > 0, JSON.stringify(pres));
  await p.evaluate(() => { document.getElementById('opponent-presence-pill').classList.remove('hidden'); try { __natpfTennis.__render?.(); } catch {} });
  await p.screenshot({ path: `${SP}/tabellone-1280-amico-host-attesa.png` });
  await p.evaluate(() => document.getElementById('opponent-presence-pill').classList.add('hidden'));
  await shot(p, '1280-amico-host');
  // vantaggio dell'amico, al meglio di 5: le scritte lunghe del piede non si toccano (1280, 1920, 844×390)
  for (const [w, h] of [[1280, 720], [1920, 1080], [844, 390]]){
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
    await setScore(p, { playerPoints: 3, opponentPoints: 4, playerGames: 1, opponentGames: 2, server: 'player' }, 3);
    v = await read(p);
    if (!ONLY_SHOTS) check(`sfida un amico (host) ${w}×${h}, vantaggio: etichetta «AL MEGLIO DI 5» dentro il riquadro (≥ 12 px), «Vantaggio di Player 2» per lo screen reader`, v.format === 'Al meglio di 5 game' && v.label === 'Vantaggio di Player 2' && v.tag?.text === 'Al meglio di 5' && tagIn(v), fmt(v));
    await shot(p, `${w}-amico-host-vantaggio`);
  }
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(250);
  await setScore(p, { playerPoints: 2, opponentPoints: 3, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  await p.evaluate(() => { const E = __natpfTennis; E.__role = E.playerRole; E.playerRole = 'p2'; E._syncScoreboardHUD(); });
  v = await read(p);
  if (!ONLY_SHOTS) check('sfida un amico (Player 2): la sua riga sopra («TU» 40) e «P1» sotto (30), serve Player 1', row(v, 'me').name === 'TU' && row(v, 'them').name === 'P1' && row(v, 'them').full === 'Player 1' && row(v, 'me').points === '40' && row(v, 'them').points === '30' && row(v, 'them').serve && !row(v, 'me').serve, fmt(v));
  await shot(p, '1280-amico-p2');
  await setScore(p, { playerPoints: 5, opponentPoints: 4, playerGames: 2, opponentGames: 1, server: 'opponent' }, 3);
  v = await read(p);
  if (!ONLY_SHOTS) check('sfida un amico (Player 2), vantaggio dell\'host: «Vantaggio di Player 1» per lo screen reader, etichetta dentro il riquadro', v.label === 'Vantaggio di Player 1' && tagIn(v), fmt(v));
  await shot(p, '1280-amico-p2-vantaggio');
  await p.evaluate(() => { const E = __natpfTennis; E.playerRole = E.__role; E.isMultiplayer = false; E._syncScoreboardHUD(); });

  // ledwall: riquadro 720×720 dentro una finestra 1920×1080
  await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(250);
  await p.evaluate(() => __natpfTennis.natpfUi.screen.restore({ preset: 'full', area: { x: 0, y: 0, w: 720, h: 720 }, margins: {} }));
  await p.waitForTimeout(400);
  await setScore(p, { playerPoints: 3, opponentPoints: 1, playerGames: 1, opponentGames: 0, server: 'player' }, 2);
  v = await read(p);
  if (!ONLY_SHOTS) check('ledwall 720×720: tabellone in alto a sinistra del riquadro (17, 43; carattere 21,6 px), righe leggibili (40-15)', corner(v, 720, 720) && v.box.x + v.box.w <= 720 && row(v, 'me').points === '40' && row(v, 'them').points === '15', fmt(v));
  await p.screenshot({ path: `${SP}/tabellone-ledwall-720.png`, clip: { x: 0, y: 0, width: 720, height: 720 } });
  // stesso schermo nel ledwall 720×720: due metà di 358 px, un tabellone per metà senza uscire dal riquadro
  await p.evaluate(() => { const E = __natpfTennis; E.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' }; E.startSplit(); });
  await setScore(p, { playerPoints: 2, opponentPoints: 3, playerGames: 1, opponentGames: 1, server: 'opponent' }, 2);
  v = await read(p);
  if (!ONLY_SHOTS) check('ledwall 720×720, stesso schermo: tabellone del P1 nella metà sinistra e copia nella metà del P2 (carattere 21,6 px), dentro il riquadro e lontana dalla pausa, niente «Al servizio»', corner(v, 720, 720, splitFs(720, 720)) && v.box.x + v.box.w <= 358 && !!v.p2 && v.same && v.p2.x >= 362 && v.p2.x + v.p2.w <= 720 && p2Clear(v) && tagIn(v) && !v.tagOn, fmt({ box: v.box, p2: v.p2, pause: v.pause, fs: v.fs, tag: v.tag, tagOn: v.tagOn }));
  await p.screenshot({ path: `${SP}/tabellone-ledwall-720-stesso-schermo.png`, clip: { x: 0, y: 0, width: 720, height: 720 } });
  // sigle di 6 lettere nel ledwall diviso (il caso più largo: la copia del P2 arriva proprio al limite dei 40 px prima della
  // pausa, 610; la larghezza massima della metà è 49,8 cqw − --sb-left − 110 px = 232 px): sigle intere, non accorciate
  await p.evaluate(() => { const E = __natpfTennis; E.natpfSplitNames = { p1: 'Francesco', p2: 'Francesca' }; E._syncScoreboardHUD(); });
  await setScore(p, { playerPoints: 4, opponentPoints: 3, playerGames: 1, opponentGames: 1, server: 'opponent' }, 2);
  v = await read(p);
  if (!ONLY_SHOTS) check('ledwall 720×720, stesso schermo, Francesco/Francesca al vantaggio: sigle «FRANCO»/«FRANCA» intere (non accorciate), riquadro ≤ 13 em, copia del P2 almeno 40 px prima della pausa', row(v, 'me').name === 'FRANCO' && row(v, 'them').name === 'FRANCA' && !v.nameCut && drawn(v) && v.box.x + v.box.w <= 358 && !!v.p2 && v.same && p2Clear(v) && v.label === 'Vantaggio Francesco', fmt({ box: v.box, sbBox: v.sbBox, p2: v.p2, pause: v.pause, rows: v.rows, nameCut: v.nameCut, label: v.label }));
  await p.screenshot({ path: `${SP}/tabellone-ledwall-720-stesso-schermo-francesco.png`, clip: { x: 0, y: 0, width: 720, height: 720 } });
  await p.evaluate(() => { __natpfTennis.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' }; __natpfTennis._syncScoreboardHUD(); });
  await p.evaluate(() => __natpfTennis.endSplit());
  await p.evaluate(() => __natpfTennis.natpfUi.screen.restore({ preset: 'full', area: null, margins: {} }));

  // allenamento: niente tabellone della partita
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(250);
  await p.evaluate(() => document.body.classList.add('natpf-training'));
  const hid = await p.evaluate(() => { const el = document.getElementById('natpf-scoreboard'); return !el || getComputedStyle(el).opacity === '0' || getComputedStyle(el).visibility === 'hidden' || el.getBoundingClientRect().height === 0; });
  if (!ONLY_SHOTS) check('allenamento: tabellone della partita nascosto', hid);
  await p.evaluate(() => document.body.classList.remove('natpf-training'));
  check('nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));
} finally {
  await B.close(); stop();
}
summary();
process.exit(process.exitCode || 0);
