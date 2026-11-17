// NATPF B65 · classifica di oggi a fine partita (docs/b65/classifica-fine.md). Gioco vero con vite; partite chiuse con i
// punti del motore (come natpf-fine-partita-ritratti). Classifica del giorno riempita con 220 partite.
//   1. contro la CPU, Ada perde: la schermata finale, dopo 5 s la classifica sopra la card: prime 5 con il punteggio, «⋯»
//      e sotto la riga di Ada evidenziata con la sua posizione (oltre il 200°), quante partite oggi; dentro lo schermo a
//      1280×720 e 1920×540; dopo 8 s sparisce e resta la schermata finale;
//   2. un tocco la chiude prima (e non preme niente sotto);
//   3. stesso schermo, vince Marco: in classifica solo Marco («stesso schermo»), la sua riga; Giulia no;
//   4. nessun errore JavaScript.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-classifica-fine.mjs     (OUT=cartella delle schermate)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PORT = +(process.env.GAME_PORT || 3197), OUT = path.join(SP, 'classifica-fine'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(`http://127.0.0.1:${PORT}/`, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) break; await sleep(500); }
const fmt = o => JSON.stringify(o);
const until = (g, fn, arg, ms = 30000) => g.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);

const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${PORT}/?intro=0`, { w: 1280, h: 720, init: () => { try { localStorage.setItem('natpf-tennis.classificaFine', '1'); localStorage.setItem('natpf-tennis.mascotteGif', '0'); } catch {} } });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.dayBoard && window.__natpfTennis.player?.model && window.__natpfTennis.opponent?.model, null, { timeout: 180000 });
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  // classifica di oggi con 220 partite vinte (punteggi da 40 a 130)
  await g.evaluate(async () => {
    const ev = __natpfTennis.natpfUi.events, M = await import('/src/natpf/natpf_events.js');
    let b = M.freshBoard(null);
    for (let i = 0; i < 220; i++) b = M.addMatch(b, { nick: `Visitatore ${i + 1}`, level: 'evento', won: 18 - (i % 12), lost: 4 + (i % 12), games: [1, 0], win: true }, { at: Date.now() - 100000 + i }).board;
    ev.board = b; ev._write?.();
  });
  const play = ({ split = false, win = true } = {}) => g.evaluate(({ split, win }) => {
    const E = __natpfTennis, ui = E.natpfUi;
    ui.onboarding?.close?.(); E.hud.hideTitleModal?.(); ui.lobby.visible = false; E.hud.hideVictoryModal(); ui.dayBoard.hide();
    ui.testInput = true; ui.selectController('mouse', { open: false });
    E.autoPlayMode = false; E.userHasInteracted = true;
    if (split){ ui.lobby.mode = 'split'; E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; E.startSplit(); }
    else { ui.lobby.mode = 'cpu'; ui.events.nickname = 'Ada'; E.isMultiplayer = false; E._applyDifficultyTuning('evento'); E.matchConfig.difficulty = 'evento'; }
    E.natpfFair = false; E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 1;
    const w = win ? 'player' : 'opponent';
    for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++){ E.ball.rallyStrokeCount = 9; E._awardPoint(w, 'Out'); }
    return E.phase;
  }, { split, win });
  const board = () => g.evaluate(() => { const el = document.getElementById('natpf-day-board'), on = !!el && !el.classList.contains('hidden'), c = el?.querySelector('.db-card')?.getBoundingClientRect();
    return { on, rows: on ? [...el.querySelectorAll('.db-row')].map(r => `${r.dataset.pos}:${r.querySelector('.db-name').firstChild.textContent}${r.classList.contains('me') ? '*' : ''}`) : [], gap: !!el?.querySelector('.db-gap'),
      foot: el?.querySelector('.db-foot')?.textContent || '', detail: [...(el?.querySelectorAll('.db-row.me small') || [])].map(s => s.textContent), state: __natpfTennis.natpfUi.dayBoard.state,
      card: c ? { t: Math.round(c.top), b: Math.round(c.bottom), l: Math.round(c.left), r: Math.round(c.right) } : null, size: [innerWidth, innerHeight], victory: !document.getElementById('victory-modal').classList.contains('hidden') }; });

  /* 1 */
  check('1. contro la CPU, Ada perde: partita finita', await play({ win: false }) === 'MATCH_OVER' && await until(g, () => !document.getElementById('victory-modal').classList.contains('hidden')));
  const t0 = Date.now(); await sleep(3500);
  let v = await board();
  check('   prima dei 5 s la classifica non c\'è (si vede la card)', !v.on && v.victory, fmt(v));
  await until(g, () => __natpfTennis.natpfUi.dayBoard.state === 'on', null, 8000); const dt = Date.now() - t0;
  v = await board();
  check('   dopo la card: prime 5 con il punteggio, «⋯», sotto la riga di Ada evidenziata con la posizione (oltre il 200°)',
    v.on && v.rows.length === 6 && v.rows.slice(0, 5).map(r => r.split(':')[0]).join() === '1,2,3,4,5' && v.gap && /^2\d\d:Ada\*$/.test(v.rows[5]) && /persa 0-1/.test(v.detail[0] || '') && /221 partite oggi/.test(v.foot) && dt >= 4500,
    fmt({ ...v, dopoMs: dt }));
  check('   dentro lo schermo a 1280×720', v.card && v.card.t >= 0 && v.card.b <= v.size[1] && v.card.l >= 0 && v.card.r <= v.size[0], fmt(v.card));
  await sleep(700);   // (la classifica entra con una breve animazione)
  await g.screenshot({ path: `${OUT}/1-classifica-cpu-1280.png` });
  await sleep(8500);
  v = await board();
  check('   dopo 8 s sparisce e resta la schermata finale', !v.on && v.victory && v.state === 'off', fmt(v));

  /* 2 */
  await g.setViewportSize({ width: 1920, height: 540 }); await sleep(300);
  const ph2 = await play({ win: true });
  // (qui il disegno è senza GPU: a 1920×540 la schermata finale arriva dopo qualche secondo, poi la classifica dopo 5 s)
  check('2. altra partita (1920×540)', ph2 === 'MATCH_OVER' && await until(g, () => __natpfTennis.natpfUi.dayBoard.state === 'on', null, 45000), ph2);
  v = await board();
  check('   dentro lo schermo a 1920×540', v.on && v.card && v.card.t >= 0 && v.card.b <= 540 && v.card.r <= 1920, fmt(v));
  await sleep(700);   // (la classifica entra con una breve animazione)
  await g.screenshot({ path: `${OUT}/2-classifica-1920x540.png` });
  const btn = await g.evaluate(() => { const b = document.getElementById('btn-play-again').getBoundingClientRect(); return { x: b.left + b.width/2, y: b.top + b.height/2 }; });
  await g.mouse.click(btn.x, btn.y); await sleep(500);
  v = await board();
  const rem = await g.evaluate(() => !!__natpfTennis.natpfUi.rematch?.isOpen);
  check('   un tocco la chiude prima e non preme il pulsante sotto («Gioca ancora» non parte)', !v.on && v.victory && !rem, fmt({ ...v, rivincita: rem }));

  /* 3 */
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(300);
  check('3. stesso schermo: vince Marco (Player 2)', await play({ split: true, win: false }) === 'MATCH_OVER' && await until(g, () => __natpfTennis.natpfUi.dayBoard.state === 'on', null, 45000));
  v = await board();
  const names = await g.evaluate(async () => { const M = await import('/src/natpf/natpf_events.js'); return M.matchList(__natpfTennis.natpfUi.events.board).filter(e => ['Giulia', 'Marco'].includes(e.nick)).map(e => `${e.nick}:${e.split ? 'split' : ''}:${e.win}`); });
  check('   in classifica solo Marco, «stesso schermo», la sua riga evidenziata', names.join() === 'Marco:split:true' && v.rows.some(r => /:Marco\*$/.test(r)) && /stesso schermo · vinta 1-0/.test(v.detail[0] || ''), fmt({ names, v }));
  await sleep(700);   // (la classifica entra con una breve animazione)
  await g.screenshot({ path: `${OUT}/3-classifica-stesso-schermo.png` });
  check('4. nessun errore JavaScript', !errs.length, errs.slice(0, 3).join(' | '));
} finally { await B.close(); vite.kill(); summary(); }
