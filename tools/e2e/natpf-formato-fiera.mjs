// NATPF B18, ramo R4: formato in fiera (audit B16 miglioramento 1; decisione dell'utente del 10/11: opzione SPENTA di base,
// «dimmi come attivarlo»). Gioco vero con vite. Percorso dello staff con i tasti veri: Ctrl+Maiusc+K, «Formato in fiera»
// → «Sì · punto decisivo» (salvato in natpf-tennis.formatoFiera), «Al meglio di 5» sparisce dalla pagina «Partita»; poi:
//   • singolo contro la CPU (avviato da «Gioca» come chi gioca): il servizio passa come nel tie-break (A, B B, A A…), la
//     CPU serve davvero nei suoi punti (con la sua velocità vera sul tabellone, in km/h veri dal B34, non 194 km/h fissi), sul 40-40 il
//     tabellone scrive «Punto decisivo» e il punto decisivo chiude la partita a 1 game;
//   • stesso schermo: il Player 2 batte nei suoi punti (lancio e colpo dagli ingressi del secondo telefono,
//     _handleP2TossInput/_handleP2SwingInput, la stessa strada di natpf_phone_racket), la pallina del servizio passa
//     sulla sua riga e anche la copia del tabellone nella sua metà dice «Punto decisivo»;
//   • ?formato=classico spegne l'opzione per quella pagina anche se salvata accesa; con l'opzione spenta tutto come prima.
// I punti si assegnano con la regola del motore (_awardPoint), non giocando gli scambi: la prova guarda il formato, non
// il gioco. Schermate in OUT (o nella cartella temporanea).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-formato-fiera.mjs
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3187);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const until = async (p, fn, arg = null, ms = 15000) => { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 50 }); return true; } catch { return false; } };
// tabellone come lo legge chi guarda: righe (sigla, punti, pallina del servizio), sottotitolo; copia del P2
const board = p => p.evaluate(() => {
  const rd = el => (el ? { rows: [...el.querySelectorAll('[data-sb-row]')].map(r => ({ side: r.dataset.sbRow, name: r.querySelector('[data-sb-name]')?.textContent, points: r.querySelector('[data-sb-points]')?.textContent, games: r.querySelector('[data-sb-games]')?.textContent, serve: r.classList.contains('serving') })), format: el.querySelector('[data-sb-format]')?.textContent || '', label: el.querySelector('[data-sb-label]')?.textContent || '' } : null);
  const E = __natpfTennis;
  // B35: riga «Formato veloce: il servizio cambia ogni 2 punti» sotto il tabellone (solo quando passa ogni due punti)
  const rule = el => { const r = el?.querySelector('[data-sb-rule]'); return r && r.offsetParent ? r.textContent.trim() : ''; };
  return { main: rd(document.getElementById('natpf-scoreboard')), p2: rd(document.getElementById('natpf-scoreboard-p2')), rule: rule(document.getElementById('natpf-scoreboard')), rule2: rule(document.getElementById('natpf-scoreboard-p2')),
    sub: E.lastBannerBroadcast?.subText || '', score: { ...E.score }, phase: E.phase, gamesToWin: E.matchConfig.gamesToWin };
});
const server = b => (b.main?.rows.find(r => r.serve)?.side === 'me' ? 'A' : b.main?.rows.find(r => r.serve)?.side === 'them' ? 'B' : '?');
const award = (p, who) => p.evaluate(w => { const E = __natpfTennis; E._awardPoint(w, 'Out'); }, who);
// Il motore nel Chromium senza GPU delle prove avanza di circa 0,08 s di gioco per secondo vero (pochi fotogrammi, passo
// limitato): per arrivare al servizio dopo si fanno girare a mano i passi della fisica (_stepPhysics a 1/120 s, come
// l'update del gioco senza disegno) finché la condizione è vera, al più `sec` secondi di gioco
const run = (p, cond, sec = 8) => p.evaluate(({ cond, sec }) => { const E = __natpfTennis, f = new Function('E', `return (${cond})`); for (let i = 0; i < sec*120; i++){ if (f(E)) return true; E._stepPhysics(1/120); } return f(E); }, { cond, sec });
// dal punto finito al servizio dopo (POINT_OVER → SERVE_STANCE)
const nextServe = p => run(p, "E.phase === 'SERVE_STANCE'");
const fmt = v => JSON.stringify(v);

const B = await launch();
try {
  const { ctx, p, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w: 1280, h: 720 });
  await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await p.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await p.evaluate(() => { try { localStorage.removeItem('natpf-tennis.formatoFiera'); } catch {} __natpfTennis.natpfUi.lobby.go('menu'); });
  await p.waitForTimeout(400);
  // revisione R4: lo staff aveva scelto «Al meglio di 5» prima di accendere l'opzione (si controlla che torni allo spegnerla)
  await p.evaluate(() => { document.querySelector('#match-length-group [data-games="5"]').click(); });
  await p.waitForTimeout(400);

  // B20: di base l'opzione vale «Solo stesso schermo»: contro la CPU la pagina «Partita» resta quella classica
  const base = await p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.setMode('cpu'); L.setFormat('singles'); L.go('match'); L.paint();
    const out = { sum: document.getElementById('match-more-sum')?.textContent, five: getComputedStyle(document.querySelector('#match-length-group [data-games="5"]')).display, sel: document.querySelector('#match-length-group .selected')?.dataset.games };
    L.go('menu'); return out; });
  check('di base («Solo stesso schermo») contro la CPU niente formato in fiera: «Al meglio di 5» c\'è, il riassunto non lo nomina', !/formato fiera/.test(base.sum) && base.five !== 'none' && base.sel === '5', fmt(base));
  await p.waitForTimeout(300);
  // 1. pannello dello stand: di base «Solo stesso schermo» (B20: tre valori), un clic lo porta a «Sì», resta salvato
  await p.keyboard.press('Control+Shift+KeyK');
  await p.waitForSelector('#natpf-staff:not(.hidden) [data-staff="fair"]', { state: 'visible', timeout: 10000 });
  const off = await p.evaluate(() => document.querySelector('[data-staff="fair"] b').textContent);
  check('pannello dello stand: «Formato in fiera» di base «Solo stesso schermo» (B20; prima «No»)', off === 'Solo stesso schermo', off);
  await p.click('#natpf-staff [data-staff="fair"]');
  await p.waitForTimeout(250);
  const on = await p.evaluate(() => ({ b: document.querySelector('[data-staff="fair"] b').textContent, cls: document.querySelector('[data-staff="fair"]').classList.contains('on'), saved: localStorage.getItem('natpf-tennis.formatoFiera'), toast: document.body.innerText.match(/Formato in fiera acceso[^\n]*/)?.[0] || '' }));
  check('un clic lo accende: «Sì · punto decisivo», salvato in natpf-tennis.formatoFiera, avviso con la regola', on.b === 'Sì · punto decisivo' && on.cls && on.saved === '1' && /punto decisivo sul 40-40/.test(on.toast), fmt(on));
  const sheet = await p.evaluate(() => { const s = document.querySelector('#natpf-staff .natpf-sheet'), c = s.querySelector('[data-staff="close"]').getBoundingClientRect(), r = s.getBoundingClientRect(); return { scroll: s.scrollHeight - s.clientHeight, close: c.bottom <= Math.min(r.bottom, innerHeight) }; });
  check('pannello dello stand a 1280×720 con la riga nuova: niente scorrimento, «Chiudi» in vista', sheet.scroll <= 0 && sheet.close, fmt(sheet));
  await p.screenshot({ path: `${SP}/formato-fiera-pannello.png` });
  await p.click('#natpf-staff [data-staff="close"]');

  // 2. pagina «Partita»: «Al meglio di 5» sparisce, il riassunto dice «formato fiera»
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; if (!ui.testInput) ui.toggleTestInput(); ui.selectController('mouse', { open: false }); ui.lobby.setMode('cpu'); ui.lobby.setFormat('singles'); ui.lobby.go('match'); ui.lobby.matchMore = true; });
  await p.waitForTimeout(700);
  const page2 = await p.evaluate(() => ({ five: getComputedStyle(document.querySelector('#match-length-group [data-games="5"]')).display, sum: document.getElementById('match-more-sum')?.textContent }));
  check('pagina «Partita»: «Al meglio di 5» nascosto, riassunto «… · formato fiera · …»', page2.five === 'none' && /formato fiera/.test(page2.sum), fmt(page2));
  await p.screenshot({ path: `${SP}/formato-fiera-partita.png` });
  // revisione R4: il 5 scelto prima è diventato 3 (al meglio di 3 sul motore); spenta l'opzione il 5 torna selezionato
  const sel = () => p.evaluate(() => ({ sel: document.querySelector('#match-length-group .selected')?.dataset.games, games: __natpfTennis.matchConfig.gamesToWin, five: getComputedStyle(document.querySelector('#match-length-group [data-games="5"]')).display }));
  const asThree = await sel();
  await p.evaluate(() => localStorage.setItem('natpf-tennis.formatoFiera', 'no'));   // «No» (B20: prima '0')
  const back = await until(p, () => document.querySelector('#match-length-group .selected')?.dataset.games === '5', null, 3000);
  const asFive = await sel();
  check('pagina «Partita»: il «Al meglio di 5» scelto prima diventa 3 con l\'opzione accesa e torna 5 quando si spegne', asThree.sel === '3' && asThree.games === 2 && back && asFive.sel === '5' && asFive.games === 3 && asFive.five !== 'none', fmt({ asThree, asFive }));
  await p.evaluate(() => localStorage.setItem('natpf-tennis.formatoFiera', '1'));
  await until(p, () => document.querySelector('#match-length-group .selected')?.dataset.games === '3', null, 3000);
  await p.evaluate(() => { __natpfTennis.natpfUi.lobby.matchMore = false; document.querySelector('#match-length-group [data-games="1"]').click(); });

  // 3. singolo contro la CPU, partita a 1 game, avviata da «Gioca»
  await p.evaluate(() => document.getElementById('btn-start-match').click());
  await p.waitForFunction(() => !__natpfTennis.autoPlayMode && __natpfTennis.phase === 'SERVE_STANCE', null, { timeout: 20000 });
  let b = await board(p);
  check('singolo: partita con il formato in fiera (score.fair), il primo game lo inizia chi gioca', b.score.fair === true && b.score.gameServer === 'player' && b.score.server === 'player' && server(b) === 'A', fmt(b));
  check('B35 singolo con «Sì»: riga «Formato veloce: il servizio cambia ogni 2 punti» sotto il tabellone e nel banner d\'inizio', b.rule === 'Formato veloce: il servizio cambia ogni 2 punti' && /Formato veloce: il servizio cambia ogni 2 punti/.test(b.sub), fmt({ rule: b.rule, sub: b.sub }));
  await p.evaluate(() => { try { __natpfTennis.render(); } catch {} }); await p.screenshot({ path: `${SP}/b35-formato-veloce-cpu.png` });
  const seq = [server(b)];
  const speeds = [];
  // punti: P (chi gioca), O (CPU), alternati fino al 40-40; nei punti della CPU si lascia servire la CPU (motore vero)
  for (const w of ['player', 'opponent', 'player', 'opponent', 'player', 'opponent']){
    if ((await p.evaluate(() => __natpfTennis.score.server)) === 'opponent'){
      const served = await run(p, "E.phase === 'RALLY' && E.ball.lastHitter === 'opponent'");
      const sp = await p.evaluate(() => __natpfTennis.natpfArena.lastSpeed);
      speeds.push({ served, kmh: sp });
    }
    await award(p, w);
    await nextServe(p);
    b = await board(p); seq.push(server(b));
  }
  check('singolo: battitore A B B A A B B (la pallina del tabellone segue chi serve)', seq.join('') === 'ABBAABB', seq.join(''));
  // (B34: km/h veri della palla, m/s × 3,6; prima la scala × 6,8 dava 150–260)
  check('singolo: la CPU serve davvero nei suoi punti, con la velocità vera (tra 79 e 138 km/h veri, non sempre la stessa)', speeds.length === 3 && speeds.every(s => s.served && s.kmh >= 79 && s.kmh <= 138) && !speeds.every(s => s.kmh === speeds[0].kmh), fmt(speeds));
  check('singolo, 40-40: tabellone «40» e «40» con «Punto decisivo» (niente «Parità»)', b.main.rows.every(r => r.points === '40') && b.main.label === 'Punto decisivo', fmt(b.main));
  const banner = await p.evaluate(() => __natpfTennis.lastBannerBroadcast);
  check('singolo, 40-40: al servizio il banner «Deciding Point» (HUD: «Punto decisivo») e la voce «Match Point» (clip esistente)', banner.text === 'Deciding Point' && banner.call?.voice === 'Match Point', fmt(banner));
  const shown = await p.evaluate(() => __natpfTennis.hud.elBannerText?.textContent || '');
  await p.screenshot({ path: `${SP}/formato-fiera-singolo-40-40.png` });
  if (shown) check('singolo, 40-40: la scritta in grande è in italiano', /Punto decisivo/i.test(shown), shown);
  // il punto decisivo lo batte la CPU (7° punto): lo vince chi gioca e la partita a 1 game finisce
  await run(p, "E.phase === 'RALLY'");
  await award(p, 'player');
  b = await board(p);
  check('singolo: il punto decisivo chiude la partita a 1 game (1-0, fine partita)', b.phase === 'MATCH_OVER' && b.score.playerGames === 1 && b.score.opponentGames === 0, fmt({ phase: b.phase, score: b.score }));
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${SP}/formato-fiera-singolo-fine.png` });

  // 4. stesso schermo: P2 al servizio nei suoi punti, con gli ingressi del secondo telefono
  await p.evaluate(() => { const E = __natpfTennis; E.hud.hideVictoryModal?.(); E.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' }; E.startSplit(); E.matchConfig.gamesToWin = 1; E.autoPlayMode = false; E.userHasInteracted = true; E.natpfServeFirst = 'player'; E.startNewMatch({ showStartBanner: false }); });
  await run(p, "E.phase === 'SERVE_STANCE'");
  const phaseOf = () => p.evaluate(async () => { const m = await import('/src/natpf/natpf_phone_racket.js'); const E = __natpfTennis; return `${m.phoneGamePhase(E, 'p1')}/${m.phoneGamePhase(E, 'p2')}`; });
  const phones = [], p2serves = [];
  for (const w of ['player', 'opponent', 'player', 'opponent', 'player', 'opponent']){
    phones.push(await phaseOf());
    if ((await p.evaluate(() => __natpfTennis.score.server)) === 'opponent'){
      // il P2 lancia e colpisce come con il suo telefono (lancio, poi il colpo vicino al punto più alto)
      await p.evaluate(() => __natpfTennis._handleP2TossInput({ source: 'prova' }));
      const tossed = await run(p, "E.phase === 'SERVE_TOSS' && E.ball.vel.y < 1.2", 3);
      await p.evaluate(() => __natpfTennis._handleP2SwingInput({ source: 'prova', speed: 1.3 }));
      const hit = await run(p, "E.phase === 'RALLY' && E.ball.lastHitter === 'opponent'", 2);
      p2serves.push(tossed && hit);
    }
    await award(p, w);
    await nextServe(p);
  }
  phones.push(await phaseOf());
  b = await board(p);
  check('stesso schermo: il telefono al servizio passa A B B A A B B (P1 «serve», poi P2 due volte…)', phones.join(' ') === 'serve/play play/serve play/serve serve/play serve/play play/serve play/serve', phones.join(' '));
  check('stesso schermo: il P2 lancia e colpisce il servizio nei suoi punti (3 su 3)', p2serves.length === 3 && p2serves.every(Boolean), fmt(p2serves));
  check('stesso schermo, 40-40: «Punto decisivo» nel tabellone del P1 e nella copia del P2, pallina sulla riga di Giulia', b.main.label === 'Punto decisivo' && b.p2?.label === 'Punto decisivo' && b.main.rows.find(r => r.serve)?.name === 'GIU', fmt(b));
  check('B35 stesso schermo: la riga «Formato veloce» in tutte e due le metà', b.rule === 'Formato veloce: il servizio cambia ogni 2 punti' && b.rule2 === b.rule, fmt({ rule: b.rule, rule2: b.rule2 }));
  await p.evaluate(() => { try { __natpfTennis.render(); } catch {} });
  await p.screenshot({ path: `${SP}/formato-fiera-stesso-schermo-40-40.png` });
  await award(p, 'opponent');
  const banner2 = await p.evaluate(() => ({ phase: __natpfTennis.phase, g: [__natpfTennis.score.playerGames, __natpfTennis.score.opponentGames] }));
  check('stesso schermo: il punto decisivo vinto dal P2 chiude la partita a 1 game (0-1)', banner2.phase === 'MATCH_OVER' && banner2.g.join('-') === '0-1', fmt(banner2));
  await p.evaluate(() => { __natpfTennis.hud.hideVictoryModal?.(); __natpfTennis.endSplit(); });
  check('nessun errore nella pagina (formato acceso)', !errs.length, errs.slice(0, 3).join(' | '));

  // 5. ?formato=classico: spenta per quella pagina anche se salvata accesa; tutto come prima
  const c = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&formato=classico`, { context: ctx });   // stesso browser: stessa scelta salvata
  await c.p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await c.p.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  const saved = await c.p.evaluate(() => localStorage.getItem('natpf-tennis.formatoFiera'));
  await c.p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.lobby.go('menu'); });
  await c.p.keyboard.press('Control+Shift+KeyK');
  await c.p.waitForSelector('#natpf-staff:not(.hidden) [data-staff="fair"]', { state: 'visible', timeout: 10000 });
  const forced = await c.p.evaluate(() => document.querySelector('[data-staff="fair"] b').textContent);
  check('?formato=classico: salvata accesa, ma il pannello dice «No (indirizzo)»', saved === '1' && forced === 'No (indirizzo)', fmt({ saved, forced }));
  await c.p.click('#natpf-staff [data-staff="close"]');
  await c.p.evaluate(() => { const ui = __natpfTennis.natpfUi; if (!ui.testInput) ui.toggleTestInput(); ui.selectController('mouse', { open: false }); ui.lobby.setMode('cpu'); ui.lobby.setFormat('singles'); ui.lobby.go('match'); });
  await c.p.waitForTimeout(500);
  const five = await c.p.evaluate(() => getComputedStyle(document.querySelector('#match-length-group [data-games="5"]')).display);
  await c.p.evaluate(() => document.getElementById('btn-start-match').click());
  await c.p.waitForFunction(() => !__natpfTennis.autoPlayMode && __natpfTennis.phase === 'SERVE_STANCE', null, { timeout: 20000 });
  const cseq = [];
  for (const w of ['player', 'opponent', 'player', 'opponent', 'player', 'opponent']){ cseq.push(server(await board(c.p))); await award(c.p, w); await nextServe(c.p); }
  const cb = await board(c.p);
  check('spenta: «Al meglio di 5» c\'è, batte sempre chi gioca nel game (AAAAAA), sul 40-40 «Parità»', five !== 'none' && cseq.join('') === 'AAAAAA' && cb.main.label === 'Parità' && cb.score.fair === false, fmt({ five, seq: cseq.join(''), label: cb.main.label }));
  check('B35 spenta: niente riga «Formato veloce» (né sul tabellone né nel banner d\'inizio)', cb.rule === '' && !/Formato veloce/.test(cb.sub), fmt({ rule: cb.rule, sub: cb.sub }));
  check('nessun errore nella pagina (formato spento)', !c.errs.length, c.errs.slice(0, 3).join(' | '));

} finally {
  await B.close(); stop();
}
summary();
process.exit(process.exitCode || 0);
