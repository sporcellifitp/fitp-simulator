// NATPF B47 «fiera subito» (richieste dell'utente del 14/11): gioco vero con vite, mouse e tastiera veri del browser.
//   • pannello dello stand: voce «Battuta» (di base «Sempre lo stesso»), in vista alle misure del ledwall;
//   • contro la CPU, fine partita: «Gioca ancora» apre la scelta del livello (Adulto già segnato), clic su «Bambino»,
//     frecce e Invio, Esc che torna alla schermata finale, «Gioca» che fa partire la partita con il livello scelto;
//   • stesso schermo: conto alla rovescia grande, uno solo al centro dello schermo intero, a 1920×1080 e 720×720, partita
//     ferma intanto e «Start» alla fine; a fine partita «Rivincita» → fasce dei due con i nomi, clic su una fascia, «Gioca»
//     → conto alla rovescia → partita con le fasce scelte; schermate della scelta a 1920×1080 e 720×720.
// Schermate in SP/b47 (OUT). Porta: GAME_PORT (di base 4270).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-b47-fiera.mjs
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 4270), OUT = path.join(SP, 'b47'); mkdirSync(OUT, { recursive: true });
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const until = async (p, fn, arg = null, ms = 15000) => { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 50 }); return true; } catch { return false; } };
const fmt = v => JSON.stringify(v);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rect = (p, sel) => p.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 0 ? { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) } : null; }, sel);
// partita finita subito (punti con la regola del motore) e schermata finale in vista
const finish = (p, who = 'player') => p.evaluate(who => { const E = __natpfTennis; E.matchConfig.gamesToWin = 1; for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++) E._awardPoint(who, 'Out'); }, who);

const B = await launch();
try {
  const { p, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w: 1920, h: 1080 });
  await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await p.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await until(p, () => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, 20000);
  // il disegno con la grafica software rallenta tutto (un fotogramma a 1920×1080 può durare secondi e i clic del browser
  // aspettano): si disegna solo per le schermate, come natpf-stesso-schermo-b20
  await p.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const shot = async name => { await p.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await p.screenshot({ path: `${OUT}/${name}.png` }); };

  /* 1. pannello dello stand: «Battuta» */
  for (const [w, h] of [[1920, 1080], [720, 720]]){
    await p.setViewportSize({ width: w, height: h }); await sleep(300);
    await p.keyboard.press('Control+Shift+KeyK');
    await p.waitForSelector('#natpf-staff:not(.hidden) [data-staff="battuta"]', { state: 'visible', timeout: 10000 });
    const r = await rect(p, '#natpf-staff [data-staff="battuta"]'), v = await p.evaluate(() => document.querySelector('[data-staff="battuta"] b').textContent);
    const sheet = await p.evaluate(() => { const s = document.querySelector('#natpf-staff .natpf-sheet'); return { scroll: s.scrollHeight - s.clientHeight, bottom: Math.round(s.getBoundingClientRect().bottom), H: innerHeight }; });
    check(`1. ${w}×${h}: pannello dello stand con «Battuta: Sempre lo stesso», in vista, foglio senza scorrimento`, v === 'Sempre lo stesso' && !!r && r.t >= 0 && r.b <= h && sheet.scroll <= 0 && sheet.bottom <= sheet.H, fmt({ v, r, sheet }));
    await shot(`1-pannello-battuta-${w}x${h}`);
    await p.click('#natpf-staff [data-staff="close"]');
  }
  await p.setViewportSize({ width: 1920, height: 1080 }); await sleep(300);

  /* 2. contro la CPU (mouse e tastiera): fine partita → «Gioca ancora» → scelta del livello */
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; if (!ui.testInput) ui.toggleTestInput(); ui.selectController('mouse', { open: false }); ui.lobby.setMode('cpu'); ui.lobby.setFormat('singles'); ui.lobby.go('match'); });
  await sleep(400);
  await p.click('#btn-start-match');
  await until(p, () => !__natpfTennis.autoPlayMode && __natpfTennis.phase === 'SERVE_STANCE', null, 20000);
  const noCount = await p.evaluate(() => !__natpfTennis.natpfUi.prematch.active && !__natpfTennis.natpfPaused);
  check('2. mouse e tastiera: niente conto alla rovescia (solo con il telefono)', noCount);
  await finish(p, 'player');
  // (la schermata finale arriva 1,8 s dopo la scritta della partita, che aspetta 0,5 s di tempo del gioco: senza GPU il gioco va piano)
  const victory = await until(p, () => !document.getElementById('victory-modal').classList.contains('hidden'), null, 90000);
  const again = await p.evaluate(() => document.getElementById('btn-play-again').textContent);
  check('   fine partita: schermata finale con «Gioca ancora» (ha vinto chi gioca)', victory && again === 'Gioca ancora', again);
  await p.click('#btn-play-again');
  await until(p, () => __natpfTennis.natpfUi.rematch.isOpen, null, 5000);
  const pick = await p.evaluate(() => { const el = document.getElementById('natpf-rematch'); return { on: !el.classList.contains('hidden'), victory: !document.getElementById('victory-modal').classList.contains('hidden'), lobby: __natpfTennis.natpfUi.lobby.visible, title: el.querySelector('[data-rematch="title"]').textContent, tiles: [...el.querySelectorAll('.rematch-tile')].map(t => `${t.querySelector('b').textContent}${t.classList.contains('selected') ? '*' : ''}`), focus: document.activeElement?.dataset?.rematchAct || document.activeElement?.dataset?.rematchLevel || '' }; });
  check('   «Gioca ancora» → scelta del livello «Chi gioca?» al posto della schermata finale (niente menu), Adulto segnato, «Gioca» a fuoco', pick.on && !pick.victory && !pick.lobby && pick.title === 'Chi gioca?' && pick.tiles.join('|') === 'Bambino|Ragazzo|Adulto*' && pick.focus === 'play', fmt(pick));
  const tiles = await p.evaluate(() => [...document.querySelectorAll('#natpf-rematch .rematch-tile')].map(t => { const b = t.getBoundingClientRect(); return { h: Math.round(b.height), w: Math.round(b.width) }; }));
  const play = await rect(p, '#natpf-rematch [data-rematch-act="play"]');
  check('   1920×1080: tessere grandi per il mouse (alte almeno 200 px), «Gioca» grande e in vista', tiles.every(t => t.h >= 200 && t.w >= 300) && !!play && play.h >= 70 && play.b <= 1080, fmt({ tiles, play }));
  await sleep(400);
  await shot('2-scelta-livello-cpu-1920x1080');
  await p.click('#natpf-rematch [data-rematch-level="bambini"]');
  await sleep(200);
  const picked = await p.evaluate(() => ({ lvl: __natpfTennis.natpfUi.lobby.cpuLevel, hud: __natpfTennis.hud.selectedDifficulty, sel: [...document.querySelectorAll('#natpf-rematch .rematch-tile.selected')].map(t => t.dataset.rematchLevel), menu: document.querySelector('#difficulty-mode-group .selected')?.dataset.difficulty }));
  check('   clic su «Bambino»: segnato qui e nel menu (livello Bambini)', picked.lvl === 'bambini' && picked.hud === 'bambini' && picked.sel.join() === 'bambini' && picked.menu === 'bambini', fmt(picked));
  // tastiera: frecce tra i pulsanti, Esc torna alla schermata finale
  await p.focus('#natpf-rematch [data-rematch-level="bambini"]');
  await p.keyboard.press('ArrowRight'); await sleep(100);
  const f1 = await p.evaluate(() => document.activeElement?.dataset?.rematchLevel || document.activeElement?.dataset?.rematchAct || '');
  check('   tastiera: → sposta il fuoco sulla tessera vicina', f1 === 'casual', f1);
  await p.keyboard.press('Escape'); await sleep(200);
  const back = await p.evaluate(() => ({ open: __natpfTennis.natpfUi.rematch.isOpen, victory: !document.getElementById('victory-modal').classList.contains('hidden'), pause: __natpfTennis.natpfUi.pause.isOpen }));
  check('   Esc: di nuovo la schermata finale (non la pausa)', !back.open && back.victory && !back.pause, fmt(back));
  await p.click('#btn-play-again'); await until(p, () => __natpfTennis.natpfUi.rematch.isOpen, null, 5000);
  const seq0 = await p.evaluate(() => __natpfTennis.natpfMatchSeq);
  await p.click('#natpf-rematch [data-rematch-act="play"]');
  const started = await until(p, s => __natpfTennis.natpfMatchSeq === s + 1 && __natpfTennis.phase === 'SERVE_STANCE' && !__natpfTennis.autoPlayMode, seq0, 15000);
  const m = await p.evaluate(() => ({ diff: __natpfTennis.matchConfig.difficulty, open: __natpfTennis.natpfUi.rematch.isOpen, lobby: __natpfTennis.natpfUi.lobby.visible, server: __natpfTennis.score.server, fixed: __natpfTennis.score.fixed }));
  check('   «Gioca»: partita nuova con il livello Bambini, senza passare dal menu; batte chi gioca (battuta «Sempre lo stesso»)', started && m.diff === 'bambini' && !m.open && !m.lobby && m.server === 'player' && m.fixed === true, fmt(m));

  /* 3. stesso schermo: conto alla rovescia grande, uno solo al centro, a 1920×1080 e 720×720 */
  // (qui senza telefoni: si spengono la pausa per i telefoni scollegati e la verifica dei due telefoni pronti, che il gioco
  // vero fa sempre; il percorso con i due telefoni simulati, conto e rivincita compresi, è in natpf-stesso-schermo-b20)
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui._phoneWatchTick = () => {}; ui.split._watchP2 = () => {}; ui.split.bothReady = () => true; });
  for (const [w, h] of [[1920, 1080], [720, 720]]){
    await p.setViewportSize({ width: w, height: h }); await sleep(300);
    await p.evaluate(() => { const E = __natpfTennis, ui = E.natpfUi; ui.backToMenu(); ui.phoneHold = null; ui.split.hold = null; ui._paintHold?.(null, '', null); ui._paintHold?.(null, '', null, 'p2'); E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; E.natpfRng = () => .9; ui.lobby.setMode('split'); E.startSplit(); E.hud.hideTitleModal(); E.matchConfig.gamesToWin = 1; E.autoPlayMode = false; E.userHasInteracted = true; E.natpfServeFirst = 'random'; E.startNewMatch({ showStartBanner: true }); });
    await sleep(250);
    const c = await p.evaluate(() => { const el = document.getElementById('natpf-prematch'), box = el.querySelector('.prematch-box').getBoundingClientRect(), num = el.querySelector('[data-prematch="num"]').getBoundingClientRect(); return { on: __natpfTennis.natpfUi.prematch.active && !el.classList.contains('hidden'), n: document.querySelectorAll('#natpf-prematch').length, paused: __natpfTennis.natpfPaused, kicker: el.querySelector('[data-prematch="kicker"]').textContent, title: el.querySelector('[data-prematch="title"]').textContent, serve: el.querySelector('[data-prematch="serve"]').textContent, num: el.querySelector('[data-prematch="num"]').textContent, box: { l: Math.round(box.left), t: Math.round(box.top), r: Math.round(box.right), b: Math.round(box.bottom) }, numH: Math.round(num.height), W: innerWidth, H: innerHeight }; });
    const centered = Math.abs((c.box.l + c.box.r)/2 - c.W/2) <= 4 && Math.abs((c.box.t + c.box.b)/2 - c.H/2) <= c.H*0.08;
    check(`3. ${w}×${h}: conto alla rovescia grande, uno solo, al centro dello schermo intero, dentro lo schermo, numero alto almeno il 20% dello schermo; partita ferma`, c.on && c.n === 1 && c.paused && c.kicker === 'Preparati' && c.title === 'La partita sta per cominciare' && c.serve === 'Batte sempre Marco' && c.num === '3' && centered && c.box.l >= 0 && c.box.t >= 0 && c.box.r <= c.W && c.box.b <= c.H && c.numH >= c.H*0.2, fmt(c));
    // (la schermata con la grafica software dura più dei 3 s del conto: il conto si ferma solo per la schermata)
    await p.evaluate(() => { const pm = __natpfTennis.natpfUi.prematch; pm.__tick = pm.tick; pm.tick = () => {}; });
    await sleep(400);   // (il riquadro entra con una breve animazione)
    await shot(`3-conto-stesso-schermo-${w}x${h}`);
    await p.evaluate(() => { const pm = __natpfTennis.natpfUi.prematch; pm.tick = pm.__tick; pm._last = performance.now(); });
    const done = await until(p, () => !__natpfTennis.natpfUi.prematch.active, null, 15000);
    await sleep(200);
    const after = await p.evaluate(() => ({ done: !__natpfTennis.natpfUi.prematch.active, paused: __natpfTennis.natpfPaused, banner: __natpfTennis.lastBannerBroadcast?.text, sub: __natpfTennis.lastBannerBroadcast?.subText, overlay: !document.getElementById('natpf-prematch').classList.contains('hidden') }));
    check(`   ${w}×${h}: dopo 3 s si gioca, con la scritta «Start» e «Sorteggio: batte sempre Marco»`, done && !after.paused && !after.overlay && after.banner === 'Start' && after.sub === 'Sorteggio: batte sempre Marco', fmt(after));
  }

  /* 4. stesso schermo: «Rivincita» → fasce con i nomi → «Gioca» → conto → partita */
  for (const [w, h] of [[1920, 1080], [720, 720]]){
    await p.setViewportSize({ width: w, height: h }); await sleep(300);
    await finish(p, 'opponent');
    await until(p, () => !document.getElementById('victory-modal').classList.contains('hidden'), null, 90000);
    await p.click('#btn-play-again');
    await until(p, () => __natpfTennis.natpfUi.rematch.isOpen, null, 5000);
    const s = await p.evaluate(() => { const el = document.getElementById('natpf-rematch'), card = el.querySelector('.rematch-card').getBoundingClientRect(); return { title: el.querySelector('[data-rematch="title"]').textContent, names: [...el.querySelectorAll('.rematch-name')].map(n => n.textContent), sel: [...el.querySelectorAll('.rematch-band.selected')].map(b => b.dataset.rematchBand), card: { t: Math.round(card.top), b: Math.round(card.bottom), l: Math.round(card.left), r: Math.round(card.right) }, scroll: el.querySelector('.rematch-card').scrollHeight - el.querySelector('.rematch-card').clientHeight, W: innerWidth, H: innerHeight }; });
    check(`4. ${w}×${h}: «Rivincita» → «Stessi giocatori, stesse fasce» con le fasce di Giulia e Marco scritte (B64), tutto nello schermo senza scorrere`, s.title === 'Stessi giocatori, stesse fasce' && s.names.join('|') === 'Giulia|Marco' && s.sel.join('|') === (w === 1920 ? 'p1:adulto|p2:adulto' : 'p1:bambino|p2:adulto') && s.card.t >= 0 && s.card.b <= s.H && s.card.l >= 0 && s.card.r <= s.W && s.scroll <= 0, fmt(s));
    await sleep(400);
    await shot(`4-scelta-fasce-stesso-schermo-${w}x${h}`);
    // B64 (17/11): le fasce di prima scritte; «Cambia fascia» apre la scelta
    if (w === 1920){ await p.click('#natpf-rematch [data-rematch-act="bands"]'); await sleep(150); await p.click('#natpf-rematch [data-rematch-band="p1:bambino"]'); }
    await sleep(150);
    const bands = await p.evaluate(() => ({ ...__natpfTennis.natpfSplitBands }));
    const seq = await p.evaluate(() => __natpfTennis.natpfMatchSeq);
    await p.click('#natpf-rematch [data-rematch-act="play"]');
    const go = await until(p, s => __natpfTennis.natpfMatchSeq === s + 1, seq, 10000);
    const g = await p.evaluate(() => ({ count: __natpfTennis.natpfUi.prematch.active, help: !!__natpfTennis.natpfDuo?.help?.p1, split: !!__natpfTennis.natpfSplit?.active, open: __natpfTennis.natpfUi.rematch.isOpen }));
    check(`   ${w}×${h}: clic su «Bambino» per Giulia, «Gioca» → partita nuova nello stesso schermo con il conto grande e l'aiuto a Giulia`, go && bands.p1 === 'bambino' && g.count && g.help && g.split && !g.open, fmt({ bands, ...g }));
    await until(p, () => !__natpfTennis.natpfUi.prematch.active, null, 15000);
  }
  check('nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));
} finally {
  await B.close(); stop();
}
summary();
process.exit(process.exitCode || 0);
