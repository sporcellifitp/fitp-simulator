// NATPF: tabellone del punteggio in partita (B10, segnalazione del 06/11: «la UI sotto per il punteggio dice "game" o
// "game secco", non si capisce lo score»). Gioco vero con vite; la partita si avvia dal menu come chi gioca (contro la
// CPU) o con le sessioni del motore (stesso schermo, sfida un amico vista dall'host e dal Player 2), poi si scrivono
// punteggi tipici nel motore (30-15, parità, vantaggio, game) e si leggono le righe del tabellone: nome, game, punti, chi
// serve e il formato in parole. Schermate a 1280×720, 1920×1080 e nel riquadro del ledwall 720×720 (OUT=cartella).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome GAME_PORT=3851 node natpf-tabellone.mjs
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
  const rows = sb ? [...sb.querySelectorAll('[data-sb-row]')].map(r => ({ side: r.dataset.sbRow, name: r.querySelector('[data-sb-name]')?.textContent || '', games: r.querySelector('[data-sb-games]')?.textContent || '', points: r.querySelector('[data-sb-points]')?.textContent || '', serve: r.classList.contains('serving') })) : [];
  const b = sb?.getBoundingClientRect();
  return { visible: vis(sb), rows, format: sb?.querySelector('[data-sb-format]')?.textContent || '', label: sb?.querySelector('[data-sb-label]')?.textContent || '', old: document.getElementById('natpf-games-line')?.textContent || '', box: b ? { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } : null };
});
const setScore = (p, s, gamesToWin = 2) => p.evaluate(({ s, gamesToWin }) => { const E = __natpfTennis; E.matchConfig.gamesToWin = gamesToWin; Object.assign(E.score, s); E._syncScoreboardHUD(); try { E.__render?.(); } catch {} }, { s, gamesToWin });
const shot = async (p, name) => { await p.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} }); await p.screenshot({ path: `${SP}/tabellone-${name}.png` }); };
const row = (v, side) => v.rows.find(r => r.side === side) || {};
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
    check('1v1 CPU: tabellone visibile con due righe (tu e la CPU)', v.visible && v.rows.length === 2 && row(v, 'me').name === 'Tu' && row(v, 'them').name === 'CPU', fmt(v));
    check('1v1 CPU: game 1 e 0, punti 30 e 15, serve chi gioca', row(v, 'me').games === '1' && row(v, 'them').games === '0' && row(v, 'me').points === '30' && row(v, 'them').points === '15' && row(v, 'me').serve && !row(v, 'them').serve, fmt(v));
    check('1v1 CPU: formato in parole («Al meglio di 3 game»), niente «game secco»', v.format === 'Al meglio di 3 game' && !/secco/i.test(v.format + v.old), fmt(v));
  }
  await shot(p, '1280-1v1-cpu-30-15');
  await setScore(p, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'opponent' }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('partita a 1 game: «Partita a 1 game», punti 0-0, serve la CPU', v.format === 'Partita a 1 game' && row(v, 'me').points === '0' && row(v, 'them').points === '0' && row(v, 'them').serve && !row(v, 'me').serve, fmt(v));
  await shot(p, '1280-1v1-cpu-0-0-1game');
  await setScore(p, { playerPoints: 3, opponentPoints: 3, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('parità: 40 e 40 con la scritta «Parità»', row(v, 'me').points === '40' && row(v, 'them').points === '40' && v.label === 'Parità', fmt(v));
  await shot(p, '1280-1v1-cpu-parita');
  await setScore(p, { playerPoints: 4, opponentPoints: 3, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('vantaggio di chi gioca: «Vant.» nella sua riga, 40 alla CPU, «Vantaggio tuo»', row(v, 'me').points === 'Vant.' && row(v, 'them').points === '40' && v.label === 'Vantaggio tuo', fmt(v));
  await shot(p, '1280-1v1-cpu-vantaggio');
  await setScore(p, { playerPoints: 3, opponentPoints: 5, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('vantaggio della CPU: «Vant.» nella riga della CPU, «Vantaggio della CPU»', row(v, 'them').points === 'Vant.' && row(v, 'me').points === '40' && v.label === 'Vantaggio della CPU', fmt(v));

  // 1920×1080: stesso tabellone, in proporzione
  await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(250);
  await setScore(p, { playerPoints: 1, opponentPoints: 3, playerGames: 1, opponentGames: 1, server: 'opponent' }, 2);
  v = await read(p);
  if (!ONLY_SHOTS) check('1920×1080: 15-40, game 1-1, tabellone in alto al centro e non più alto del 13% dello schermo', row(v, 'me').points === '15' && row(v, 'them').points === '40' && v.box && v.box.y < 80 && v.box.h < 1080*.13 && Math.abs(v.box.x + v.box.w/2 - 960) < 4, fmt(v));
  await shot(p, '1920-1v1-cpu-15-40');

  // 2v2 contro la CPU: squadre
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(250);
  await p.evaluate(() => { __natpfTennis.setMatchFormat('doubles'); });
  await setScore(p, { playerPoints: 2, opponentPoints: 2, playerGames: 0, opponentGames: 1, server: 'player' }, 2);
  v = await read(p);
  if (!ONLY_SHOTS) check('2v2 CPU: righe «Tu + CPU» e «2 CPU», 30-30, game 0-1', row(v, 'me').name === 'Tu + CPU' && row(v, 'them').name === '2 CPU' && row(v, 'me').points === '30' && row(v, 'them').points === '30' && row(v, 'them').games === '1', fmt(v));
  await shot(p, '1280-2v2-cpu-30-30');
  await p.evaluate(() => { __natpfTennis.setMatchFormat('singles'); });

  // stesso schermo: i nomi scritti nella pagina «Collega»
  await p.evaluate(() => { const E = __natpfTennis; E.natpfSplitNames = { p1: 'Marco', p2: 'Giulia' }; E.startSplit(); });
  await setScore(p, { playerPoints: 1, opponentPoints: 0, playerGames: 1, opponentGames: 2, server: 'opponent' }, 3);
  v = await read(p);
  if (!ONLY_SHOTS) check('stesso schermo: righe con i nomi (Marco, Giulia), 15-0, serve Giulia, «Al meglio di 5 game»', row(v, 'me').name === 'Marco' && row(v, 'them').name === 'Giulia' && row(v, 'me').points === '15' && row(v, 'them').points === '0' && row(v, 'them').serve && v.format === 'Al meglio di 5 game', fmt(v));
  await shot(p, '1280-stesso-schermo');
  await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(250);
  await shot(p, '1920-stesso-schermo');
  await setScore(p, { playerPoints: 5, opponentPoints: 4, playerGames: 1, opponentGames: 2, server: 'opponent' }, 3);
  v = await read(p);
  if (!ONLY_SHOTS) check('stesso schermo, vantaggio: «Vantaggio Marco»', row(v, 'me').points === 'Vant.' && v.label === 'Vantaggio Marco', fmt(v));
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(250);
  await p.evaluate(() => __natpfTennis.endSplit());

  // sfida un amico, vista dall'host e dal Player 2 (il proprio nome sopra, come negli annunci)
  await p.evaluate(() => { const E = __natpfTennis; E.isMultiplayer = true; });
  await setScore(p, { playerPoints: 2, opponentPoints: 3, playerGames: 0, opponentGames: 0, server: 'player' }, 1);
  v = await read(p);
  if (!ONLY_SHOTS) check('sfida un amico (host): righe «Tu» e «Player 2», 30-40', row(v, 'me').name === 'Tu' && row(v, 'them').name === 'Player 2' && row(v, 'me').points === '30' && row(v, 'them').points === '40' && row(v, 'me').serve, fmt(v));
  await shot(p, '1280-amico-host');
  await p.evaluate(() => { const E = __natpfTennis; E.__role = E.playerRole; E.playerRole = 'p2'; E._syncScoreboardHUD(); });
  v = await read(p);
  if (!ONLY_SHOTS) check('sfida un amico (Player 2): la sua riga sopra («Tu» 40) e «Player 1» sotto (30), serve Player 1', row(v, 'me').name === 'Tu' && row(v, 'them').name === 'Player 1' && row(v, 'me').points === '40' && row(v, 'them').points === '30' && row(v, 'them').serve && !row(v, 'me').serve, fmt(v));
  await shot(p, '1280-amico-p2');
  await p.evaluate(() => { const E = __natpfTennis; E.playerRole = E.__role; E.isMultiplayer = false; E._syncScoreboardHUD(); });

  // ledwall: riquadro 720×720 dentro una finestra 1920×1080
  await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(250);
  await p.evaluate(() => __natpfTennis.natpfUi.screen.restore({ preset: 'full', area: { x: 0, y: 0, w: 720, h: 720 }, margins: {} }));
  await p.waitForTimeout(400);
  await setScore(p, { playerPoints: 3, opponentPoints: 1, playerGames: 1, opponentGames: 0, server: 'player' }, 2);
  v = await read(p);
  if (!ONLY_SHOTS) check('ledwall 720×720: tabellone dentro il riquadro e al centro, righe leggibili (40-15)', v.box && v.box.x >= 0 && v.box.x + v.box.w <= 720 && Math.abs(v.box.x + v.box.w/2 - 360) < 4 && v.box.y + v.box.h <= 720 && row(v, 'me').points === '40' && row(v, 'them').points === '15', fmt(v));
  await p.screenshot({ path: `${SP}/tabellone-ledwall-720.png`, clip: { x: 0, y: 0, width: 720, height: 720 } });
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
