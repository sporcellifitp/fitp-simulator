// NATPF B62 · salvaschermo con la partita dimostrativa (richiesta dell'utente del 17/11/2026; docs/b62/salvaschermo.md).
// Gioco vero con vite, a 1280×720 e 1920×540 (ledwall). Per non aspettare un minuto il tempo è portato a 3 s dalla prova
// (ui.screensaver.secs), il conto dell'inattività è quello vero del chiosco.
//   1. al menu, dopo il tempo senza nessuno: menu nascosto, partita dimostrativa che gira (fasi e palla che cambiano), fascia
//      «Gioca a tennis con il telefono» in basso, dentro lo schermo;
//   2. mouse mosso: si chiude, si torna al menu com'era;
//   3. clic sopra un pulsante del menu: si chiude e il pulsante NON scatta (si resta nel menu);
//   4. Invio: si chiude e il menu non va avanti;
//   5. un telefono (attività del telefono, come nel chiosco): si chiude;
//   6. dalla pagina «Collega»: si torna a «Collega»;
//   7. con il pannello dello stand aperto non parte; «Salvaschermo» nel pannello: Dopo 1 min → 2 → 5 → No (spento: non parte);
//   8. il gioco entra in campo durante il salvaschermo (per esempio «Sono pronto»): si chiude da solo;
//   9. nessun errore JavaScript.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-salvaschermo.mjs     (OUT=cartella delle schermate)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PORT = +(process.env.GAME_PORT || 3193), OUT = path.join(SP, 'salvaschermo'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(`http://127.0.0.1:${PORT}/`, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) break; await sleep(500); }
const fmt = o => JSON.stringify(o);
const until = (g, fn, arg, ms = 20000) => g.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);

const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${PORT}/?intro=0`, { w: 1280, h: 720 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.screensaver && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  const st = () => g.evaluate(() => { const E = __natpfTennis, U = E.natpfUi, S = U.screensaver, L = document.getElementById('natpf-salvaschermo'), band = L?.querySelector('.saver-band')?.getBoundingClientRect();
    return { on: S.on, secs: S.secs, cls: document.documentElement.classList.contains('natpf-salvaschermo'), layer: !!L && getComputedStyle(L).display !== 'none', step: U.lobby.step, lobby: U.lobby.visible,
      menuHidden: getComputedStyle(document.getElementById('title-modal')).visibility === 'hidden', backdrop: !!E.natpfBackdrop, auto: E.autoPlayMode, phase: E.phase, ball: [+E.ball.pos.x.toFixed(2), +E.ball.pos.z.toFixed(2)],
      text: L?.innerText.replace(/\s+/g, ' ').trim() || '', band: band ? { l: Math.round(band.left), r: Math.round(band.right), t: Math.round(band.top), b: Math.round(band.bottom) } : null, size: [innerWidth, innerHeight] }; });
  const startSaver = async () => { await g.evaluate(() => { const U = __natpfTennis.natpfUi; U.screensaver.secs = 3; U.kiosk.last = performance.now(); }); return until(g, () => __natpfTennis.natpfUi.screensaver.on, null, 30000); };
  check('0. di base spento nel server di sviluppo e nelle prove (th.mjs); qui lo accende la prova', (await st()).secs === 0, fmt(await st()));

  /* 1 */
  check('1. al menu, dopo il tempo senza nessuno, parte', await startSaver());
  await sleep(1500);
  let a = await st(); await sleep(4000); let b = await st();
  check('   menu nascosto (resta aperto sotto), sfondo fermo spento, partita dimostrativa che gira', a.on && a.cls && a.layer && a.menuHidden && a.lobby && a.step === 'menu' && !a.backdrop && a.auto && (a.phase !== b.phase || a.ball.join() !== b.ball.join()), fmt({ a, b }));
  check('   fascia «Dimostrazione · Gioca a tennis con il telefono · Chiedi allo staff» in basso, dentro lo schermo', /Dimostrazione/i.test(b.text) && /Gioca a tennis con il telefono/i.test(b.text) && /Chiedi allo staff/.test(b.text) && b.band && b.band.l >= 0 && b.band.r <= b.size[0] && b.band.b <= b.size[1], fmt(b));
  await g.screenshot({ path: `${OUT}/1-salvaschermo-1280.png` });

  /* 2: mouse */
  await g.mouse.move(400, 300); await g.mouse.move(460, 340, { steps: 4 }); await sleep(400);
  a = await st();
  check('2. mouse mosso: si chiude, menu di nuovo in vista, sfondo fermo', !a.on && !a.cls && !a.layer && !a.menuHidden && a.step === 'menu' && a.backdrop, fmt(a));

  /* 3: clic sopra «Gioca» */
  check('3. di nuovo acceso', await startSaver());
  const playAt = await g.evaluate(() => { const b = document.querySelector('[data-menu="play"], #title-modal [data-page="menu"] button'); const r = b.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2, what: b.textContent.trim().slice(0, 20) }; });
  await g.mouse.click(playAt.x, playAt.y); await sleep(600);
  a = await st();
  check(`   clic sopra «${playAt.what}»: si chiude e il pulsante non scatta (si resta nel menu)`, !a.on && !a.cls && a.step === 'menu', fmt(a));

  /* 4: Invio */
  check('4. di nuovo acceso', await startSaver());
  await g.keyboard.press('Enter'); await sleep(600);
  a = await st();
  check('   Invio: si chiude e il menu non va avanti', !a.on && a.step === 'menu', fmt(a));

  /* 5: telefono */
  check('5. di nuovo acceso', await startSaver());
  await g.evaluate(() => __natpfTennis.natpfUi.kiosk.poke()); await sleep(500);
  a = await st();
  check('   gesto o tocco su un telefono (attività del telefono): si chiude', !a.on && a.step === 'menu', fmt(a));

  /* 6: dalla pagina «Collega» */
  await g.evaluate(() => { const l = __natpfTennis.natpfUi.lobby; l.setMode('cpu'); l.go('connect'); });
  check('6. dalla pagina «Collega»: parte', await startSaver());
  await g.mouse.move(100, 100); await g.mouse.move(160, 150, { steps: 4 }); await sleep(400);
  a = await st();
  check('   e al risveglio si torna a «Collega»', !a.on && a.step === 'connect' && !a.menuHidden, fmt(a));
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.go('menu'));

  /* 7: pannello dello stand */
  await g.keyboard.press('Control+Shift+KeyK'); await sleep(500);
  await g.evaluate(() => { const U = __natpfTennis.natpfUi; U.screensaver.secs = 1; U.kiosk.last = performance.now() - 5000; }); await sleep(2500);
  a = await st();
  check('7. con il pannello dello stand aperto non parte', !a.on, fmt(a));
  await g.evaluate(() => { const U = __natpfTennis.natpfUi; U.screensaver.secs = 60; U.kiosk.paint(); });
  const labels = [];
  for (let i = 0; i < 4; i++){ labels.push(await g.evaluate(() => document.querySelector('[data-staff="saver"] b').textContent)); await g.click('[data-staff="saver"]'); await sleep(150); }
  const saved = await g.evaluate(() => localStorage.getItem('natpf-tennis.salvaschermo'));
  check('   «Salvaschermo» nel pannello: Dopo 1 min → Dopo 2 min → Dopo 5 min → No → Dopo 1 min, salvato', labels.join('|') === 'Dopo 1 min|Dopo 2 min|Dopo 5 min|No' && saved === '60', fmt({ labels, saved }));
  await g.click('[data-staff="saver"]'); await g.click('[data-staff="saver"]'); await g.click('[data-staff="saver"]');   // → No
  await g.keyboard.press('Escape'); await sleep(300);
  await g.evaluate(() => { __natpfTennis.natpfUi.kiosk.last = performance.now() - 400000; }); await sleep(1500);
  a = await st();
  check('   «No»: anche dopo minuti senza nessuno non parte', !a.on && a.secs === 0, fmt(a));
  await g.evaluate(() => { localStorage.setItem('natpf-tennis.salvaschermo', '60'); __natpfTennis.natpfUi.screensaver.secs = 60; });

  /* 8: il gioco esce dal menu da solo */
  check('8. di nuovo acceso', await startSaver());
  await g.evaluate(() => { __natpfTennis.natpfUi.lobby.el.classList.add('hidden'); }); await sleep(500);
  a = await st();
  check('   il gioco esce dal menu (per esempio «Sono pronto» sui telefoni): il salvaschermo si chiude', !a.on && !a.cls, fmt(a));

  /* ledwall 1920×540 */
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.el.classList.remove('hidden'));
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.go('menu'));
  await g.setViewportSize({ width: 1920, height: 540 }); await sleep(500);
  check('1920×540: parte', await startSaver());
  await sleep(1200); a = await st();
  check('   fascia dentro lo schermo', a.band && a.band.l >= 0 && a.band.r <= 1920 && a.band.b <= 540 && a.band.t >= 0, fmt(a));
  await g.screenshot({ path: `${OUT}/2-salvaschermo-1920x540.png` });
  check('9. nessun errore JavaScript', !errs.length, errs.join(' | '));
} finally { await B.close(); stop(); summary(); }
