// NATPF motore base: menu principale al centro, sfondo fermo. Verifica a quattro risoluzioni (1366 × 657 di un portatile
// con la barra del browser, 1024 × 600, 1280 × 720 e, dal B27, il ledwall quadrato 1024 × 1024 dello stand):
//   • tutte le voci visibili senza scorrere (anche le pagine «Modalità», «Racchetta», «Partita», «Opzioni», «Sfide»);
//   • frecce come con un joypad: giù/su tra le voci, destra/sinistra nella fila delle due voci di servizio;
//   • descrizione della voce scelta sotto il pannello;
//   • pannello dello stand (Ctrl+Maiusc+K) in una schermata, «Chiudi» in vista senza scorrere (B16: una nota di tre righe
//     sotto i pulsanti lo portava fuori vista a 1024 × 600 e a metà a 1366 × 657), con «Telecomando dello staff» (B27) nella
//     riga in basso e «Schermo del gioco» nascosto nel browser;
//   • con il menu aperto il gioco non avanza (niente partita dimostrativa) e l'arena non si ridisegna a ogni
//     fotogramma: era la causa dello sfarfallio della home, insieme al campo animato dell'intro.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-menu.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3116);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const B = await launch();
try {
  for (const [w, h] of [[1366, 657], [1024, 600], [1280, 720], [1024, 1024]]){
    const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible, null, { timeout: 120000 });
    await p.waitForTimeout(600);
    const tag = `${w} × ${h}`;
    const fit = await p.evaluate(() => { const m = document.getElementById('title-modal'); const items = [...document.querySelectorAll('[data-page="menu"] .menu-item')].map(e => e.getBoundingClientRect()); return { scroll: m.scrollHeight - m.clientHeight, inView: items.length === 5 && items.every(r => r.top >= 0 && r.bottom <= innerHeight), focus: document.activeElement?.dataset?.menu, centre: (() => { const l = document.querySelector('[data-page="menu"] .menu-layout').getBoundingClientRect(); return Math.round(Math.abs((l.left + l.right)/2 - innerWidth/2)); })(), side: (() => { const h = document.querySelector('[data-page="menu"] .menu-hero').getBoundingClientRect(); return items.every(r => r.left >= h.right - 1); })(), below: (() => { const h = document.querySelector('[data-page="menu"] .menu-hero').getBoundingClientRect(); return items.every(r => r.top >= h.bottom - 1); })() }; });
    // menu a due colonne (dal 31/10): titolo e descrizione a sinistra, voci a destra; il blocco intero è al centro. Nelle
    // aree quadrate (ledwall 2×2, 1024 × 1024) in colonna: il marchio sopra, le voci sotto (natpf-ui.css, max-aspect-ratio 5/4)
    const square = w/h <= 1.25;
    check(`${tag}: le cinque voci del menu ${square ? 'sotto il marchio (area quadrata)' : 'a destra del titolo'}, blocco al centro, visibili senza scorrere, «Gioca» scelta`, fit.scroll <= 0 && fit.inView && fit.focus === 'play' && (square ? fit.below : fit.side) && fit.centre < 4, JSON.stringify(fit));
    if (w === 1280 || h === 1024) await p.screenshot({ path: `${SP}/menu-${w}x${h}.png` });
    const seq = [];
    for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowUp']){ await p.keyboard.press(k); seq.push(await p.evaluate(() => document.activeElement?.dataset?.menu)); }
    // (dal B15 la fila in basso ha due voci, Classifica e Opzioni: la guida è «Come si gioca» in alto)
    check(`${tag}: frecce come un joypad`, seq.join() === 'training,challenges,ranking,options,options,challenges', seq.join());
    const desc = await p.evaluate(() => document.getElementById('menu-desc').textContent);
    check(`${tag}: descrizione della voce scelta`, /bersagli/i.test(desc) && !/Radar|Survival|sopravvivenza/i.test(desc), desc);
    // sfondo fermo: lo stato del gioco non cambia e il canvas non si ridisegna dopo i primi secondi
    await p.waitForTimeout(9000);
    const s0 = await p.evaluate(() => { const E = __natpfTennis, r = E.render.bind(E); window.__r = 0; E.render = () => { __r++; r(); }; return { t: E.phaseTimer, x: E.player.pos.x, ball: E.ball.inPlay }; });
    await p.waitForTimeout(3000);
    const s1 = await p.evaluate(() => ({ t: __natpfTennis.phaseTimer, x: __natpfTennis.player.pos.x, ball: __natpfTennis.ball.inPlay, renders: __r }));
    check(`${tag}: con il menu aperto nessuna partita dimostrativa e nessun ridisegno continuo dell’arena`, s0.t === s1.t && s0.x === s1.x && !s1.ball && s1.renders === 0, JSON.stringify({ s0, s1 }));
    // le altre pagine del menu stanno anche loro in una schermata
    const pages = {};
    for (const step of ['mode', 'controller', 'match', 'options', 'challenges', 'ranking']){
      await p.evaluate(s => { const L = __natpfTennis.natpfUi.lobby; if (s === 'mode') L.setMode('cpu'); L.go(s); }, step);
      await p.waitForTimeout(300);
      pages[step] = await p.evaluate(() => { const m = document.getElementById('title-modal'); return m.scrollHeight - m.clientHeight; });
    }
    check(`${tag}: anche le altre pagine del menu senza scorrere`, Object.values(pages).every(v => v <= 0), JSON.stringify(pages));
    // pannello dello stand dal menu, con i tasti veri: il foglio non scorre e «Chiudi» si vede tutto (dentro il foglio e la
    // finestra). Si chiude con il suo pulsante
    await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('menu'));
    await p.keyboard.press('Control+Shift+KeyK');
    await p.waitForSelector('#natpf-staff:not(.hidden) [data-staff="close"]', { state: 'visible', timeout: 10000 });
    await p.waitForTimeout(400);                                            // animazione d'entrata del foglio (0,28 s)
    const staff = await p.evaluate(() => { const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), c = s.querySelector('[data-staff="close"]').getBoundingClientRect(), t = s.querySelector('[data-staff="remote"]'), tr = t.getBoundingClientRect(); return { scroll: s.scrollHeight - s.clientHeight, sheet: [Math.round(r.top), Math.round(r.bottom)], close: [Math.round(c.top), Math.round(c.bottom)], inner: innerHeight, remote: tr.height > 0 && tr.bottom <= Math.min(r.bottom, innerHeight), display: s.querySelector('[data-staff="display"]').classList.contains('hidden') }; });
    check(`${tag}: pannello dello stand senza scorrere, «Chiudi» e «Telecomando dello staff» in vista (nel browser niente «Schermo del gioco»)`, staff.scroll <= 0 && staff.close[0] >= staff.sheet[0] && staff.close[1] <= Math.min(staff.sheet[1], staff.inner) && staff.remote && staff.display, JSON.stringify(staff));
    if (w === 1024) await p.screenshot({ path: `${SP}/stand-${w}x${h}.png` });
    if (h === 1024){ await p.click('#natpf-staff [data-staff="remote"]'); await p.waitForTimeout(800); await p.screenshot({ path: `${SP}/telecomando-pannello-${w}x${h}.png` }); const rs = await p.evaluate(() => { const s = document.querySelector('#natpf-remote .natpf-sheet'); return s.scrollHeight - s.clientHeight; }); check(`${tag}: foglio «Telecomando dello staff» senza scorrere`, rs <= 0, String(rs)); await p.click('#natpf-remote [data-remote="close"]'); await p.waitForTimeout(300); }
    await p.click('#natpf-staff [data-staff="close"]');
    check(`${tag}: «Chiudi» chiude il pannello dello stand`, await p.evaluate(() => document.getElementById('natpf-staff').classList.contains('hidden')));
    // Invio su «Allenamento» porta alla scelta della racchetta
    await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('menu'));
    await p.waitForTimeout(300);
    await p.focus('[data-menu="training"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    check(`${tag}: Invio sulla voce la apre`, await p.evaluate(() => __natpfTennis.natpfUi.lobby.step) === 'controller');
    check(`${tag}: nessun errore JavaScript`, !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }
} finally {
  await B.close();
}
summary();
setTimeout(() => process.exit(), 300);
