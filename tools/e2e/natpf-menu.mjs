// NATPF motore base: menu principale al centro, sfondo fermo. Verifica a quattro risoluzioni (1366 × 657 di un portatile
// con la barra del browser, 1024 × 600, 1280 × 720 e, dal B27, il ledwall quadrato 1024 × 1024 dello stand; dal B28 il
// pannello dello stand anche a 720 × 720):
//   • tutte le voci visibili senza scorrere (anche le pagine «Modalità», «Racchetta», «Partita», «Opzioni», «Sfide»);
//   • frecce come con un joypad: giù/su tra le voci, destra/sinistra nella fila delle due voci di servizio;
//   • descrizione della voce scelta sotto il pannello;
//   • pannello dello stand (Ctrl+Maiusc+K) in una schermata, «Chiudi» in vista senza scorrere (B16: una nota di tre righe
//     sotto i pulsanti lo portava fuori vista a 1024 × 600 e a metà a 1366 × 657), con «Telecomando dello staff» (B27) nella
//     riga in basso e «Schermo del gioco» nascosto nel browser;
//   • con il menu aperto il gioco non avanza (niente partita dimostrativa) e l'arena non si ridisegna a ogni
//     fotogramma: era la causa dello sfarfallio della home, insieme al campo animato dell'intro.
//   • B36.1: nel pannello dello stand la voce «Direzione dei colpi» (Classica · Nuova · in lavorazione) in vista; con il clic
//     del mouse passa a «Nuova · in lavorazione» e torna «Classica», salvata, e il foglio continua a non scorrere con
//     «Chiudi» in vista (la scritta più lunga può andare su due righe).
//   • B74: la voce «Assi del giroscopio» (Come oggi · Corretti · prova) in vista; con il clic del mouse passa a «Corretti ·
//     prova» e torna «Come oggi», salvata; il foglio (21 voci) continua a non scorrere con «Chiudi» in vista.
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
    // B28 insieme al B27: anche «Calibrazione» (opzione dello stand) è nel foglio, tutta in vista
    const calBtn = await p.evaluate(() => { const s = document.querySelector('#natpf-staff .natpf-sheet').getBoundingClientRect(), b = document.querySelector('#natpf-staff [data-staff="cal"]'), r = b?.getBoundingClientRect(); return b ? { text: b.textContent.replace(/\s+/g, ' ').trim(), inside: r.top >= s.top && r.bottom <= Math.min(s.bottom, innerHeight) && r.height > 0, n: document.querySelectorAll('#natpf-staff [data-staff]').length } : null; });
    check(`${tag}: «Calibrazione» nel pannello dello stand, in vista`, !!calBtn && calBtn.inside && /Calibrazione/.test(calBtn.text), JSON.stringify(calBtn));
    // B36.1: «Direzione dei colpi» in vista, si cambia con il clic e il foglio resta com'è (con «Nuova» la scritta è più lunga)
    const dirBox = () => p.evaluate(() => { const S = document.querySelector('#natpf-staff .natpf-sheet'), s = S.getBoundingClientRect(), b = document.querySelector('#natpf-staff [data-staff="dir"]'), r = b?.getBoundingClientRect(), c = S.querySelector('[data-staff="close"]').getBoundingClientRect();
      return b ? { text: `${b.querySelector('span').textContent} · ${b.querySelector('b').textContent}`, inside: r.height > 0 && r.top >= s.top && r.bottom <= Math.min(s.bottom, innerHeight) && r.left >= s.left && r.right <= s.right, on: b.classList.contains('on'), scroll: S.scrollHeight - S.clientHeight, closeIn: c.top >= s.top && c.bottom <= Math.min(s.bottom, innerHeight), saved: localStorage.getItem('natpf-tennis.direzione') } : null; });
    const dir0 = await dirBox();
    check(`${tag}: «Direzione dei colpi: Classica» nel pannello dello stand, in vista`, !!dir0 && dir0.inside && dir0.text === 'Direzione dei colpi · Classica' && !dir0.on && dir0.saved == null, JSON.stringify(dir0));
    await p.click('#natpf-staff [data-staff="dir"]'); await p.waitForTimeout(300);
    const dir1 = await dirBox();
    check(`${tag}: un clic → «Nuova · in lavorazione», salvata; il foglio non scorre e «Chiudi» resta in vista`, !!dir1 && dir1.inside && dir1.text === 'Direzione dei colpi · Nuova · in lavorazione' && dir1.on && dir1.saved === 'nuova' && dir1.scroll <= 0 && dir1.closeIn, JSON.stringify(dir1));
    if (w === 1024) await p.screenshot({ path: `${SP}/stand-direzione-nuova-${w}x${h}.png` });
    await p.click('#natpf-staff [data-staff="dir"]'); await p.waitForTimeout(300);
    const dir2 = await dirBox();
    check(`${tag}: un altro clic → di nuovo «Classica»`, !!dir2 && dir2.text === 'Direzione dei colpi · Classica' && !dir2.on && dir2.saved === 'classica' && dir2.scroll <= 0 && dir2.closeIn, JSON.stringify(dir2));
    // B74: «Assi del giroscopio» in vista (di base «Come oggi»), un clic con il mouse → «Corretti · prova», salvata, un altro
    // → «Come oggi»; il foglio non scorre e «Chiudi» resta in vista
    const axBox = () => p.evaluate(() => { const S = document.querySelector('#natpf-staff .natpf-sheet'), s = S.getBoundingClientRect(), b = document.querySelector('#natpf-staff [data-staff="axes"]'), r = b?.getBoundingClientRect(), c = S.querySelector('[data-staff="close"]').getBoundingClientRect();
      return b ? { text: `${b.querySelector('span').textContent} · ${b.querySelector('b').textContent}`, inside: r.height > 0 && r.top >= s.top && r.bottom <= Math.min(s.bottom, innerHeight) && r.left >= s.left && r.right <= s.right, on: b.classList.contains('on'), scroll: S.scrollHeight - S.clientHeight, closeIn: c.top >= s.top && c.bottom <= Math.min(s.bottom, innerHeight), saved: localStorage.getItem('natpf-tennis.assiGiroscopio') } : null; });
    const ax0 = await axBox();
    check(`${tag}: «Assi del giroscopio: Come oggi» nel pannello dello stand, in vista`, !!ax0 && ax0.inside && ax0.text === 'Assi del giroscopio · Come oggi' && !ax0.on && ax0.saved == null && ax0.scroll <= 0 && ax0.closeIn, JSON.stringify(ax0));
    await p.click('#natpf-staff [data-staff="axes"]'); await p.waitForTimeout(300);
    const ax1 = await axBox();
    check(`${tag}: un clic → «Corretti · prova», salvata; il foglio non scorre e «Chiudi» resta in vista`, !!ax1 && ax1.inside && ax1.text === 'Assi del giroscopio · Corretti · prova' && ax1.on && ax1.saved === 'corretti' && ax1.scroll <= 0 && ax1.closeIn, JSON.stringify(ax1));
    if (w === 1024) await p.screenshot({ path: `${SP}/stand-assi-corretti-${w}x${h}.png` });
    await p.click('#natpf-staff [data-staff="axes"]'); await p.waitForTimeout(300);
    const ax2 = await axBox();
    check(`${tag}: un altro clic → di nuovo «Come oggi»`, !!ax2 && ax2.text === 'Assi del giroscopio · Come oggi' && !ax2.on && ax2.saved === 'oggi' && ax2.scroll <= 0 && ax2.closeIn, JSON.stringify(ax2));
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
  // B28 insieme al B27: il pannello dello stand (voci del B27 più «Calibrazione») anche in un'area quadrata piccola,
  // 720 × 720: non scorre e «Chiudi» resta in vista (le altre verifiche del menu a questa misura non si fanno qui)
  {
    const ctx = await B.newContext({ viewport: { width: 720, height: 720 } }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible, null, { timeout: 120000 });
    await p.waitForTimeout(600);
    await p.keyboard.press('Control+Shift+KeyK');
    await p.waitForSelector('#natpf-staff:not(.hidden) [data-staff="close"]', { state: 'visible', timeout: 10000 });
    await p.waitForTimeout(400);
    const staff = await p.evaluate(() => { const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), box = e => { const q = e.getBoundingClientRect(); return [Math.round(q.top), Math.round(q.bottom)]; };
      const inside = e => { const q = e.getBoundingClientRect(); return q.height > 0 && q.top >= r.top && q.bottom <= Math.min(r.bottom, innerHeight) && q.left >= r.left && q.right <= Math.min(r.right, innerWidth); };
      return { scroll: s.scrollHeight - s.clientHeight, wide: s.scrollWidth - s.clientWidth, sheet: box(s), close: box(s.querySelector('[data-staff="close"]')), inner: innerHeight,
        closeIn: inside(s.querySelector('[data-staff="close"]')), remote: inside(s.querySelector('[data-staff="remote"]')), cal: inside(s.querySelector('[data-staff="cal"]')), n: s.querySelectorAll('[data-staff]').length }; });
    check('720 × 720: pannello dello stand senza scorrere, «Chiudi», «Telecomando dello staff» e «Calibrazione» in vista', staff.scroll <= 0 && staff.wide <= 0 && staff.closeIn && staff.remote && staff.cal, JSON.stringify(staff));
    await p.screenshot({ path: `${SP}/stand-720x720.png` });
    await p.click('#natpf-staff [data-staff="cal"]'); await p.waitForTimeout(300);
    const after = await p.evaluate(() => { const s = document.querySelector('#natpf-staff .natpf-sheet'); return { scroll: s.scrollHeight - s.clientHeight, text: s.querySelector('[data-staff="cal"]').textContent.replace(/\s+/g, ' ').trim(), saved: localStorage.getItem('natpf-tennis.calibrazione') }; });
    check('720 × 720: «Calibrazione» gira (Giocando → Con i gesti) e il foglio continua a non scorrere', after.scroll <= 0 && /Con i gesti/.test(after.text) && after.saved === 'gesti', JSON.stringify(after));
    // B36.1: «Direzione dei colpi» anche qui in vista; con «Nuova» (scritta più lunga) il foglio continua a non scorrere
    await p.click('#natpf-staff [data-staff="dir"]'); await p.waitForTimeout(300);
    const dirQ = await p.evaluate(() => { const S = document.querySelector('#natpf-staff .natpf-sheet'), s = S.getBoundingClientRect(), b = S.querySelector('[data-staff="dir"]'), r = b.getBoundingClientRect(), c = S.querySelector('[data-staff="close"]').getBoundingClientRect();
      return { text: `${b.querySelector('span').textContent} · ${b.querySelector('b').textContent}`, inside: r.height > 0 && r.top >= s.top && r.bottom <= Math.min(s.bottom, innerHeight), scroll: S.scrollHeight - S.clientHeight, closeIn: c.top >= s.top && c.bottom <= Math.min(s.bottom, innerHeight), saved: localStorage.getItem('natpf-tennis.direzione') }; });
    check('720 × 720: «Direzione dei colpi» in vista, un clic → «Nuova · in lavorazione»; il foglio non scorre e «Chiudi» resta in vista', dirQ.inside && /Nuova · in lavorazione/.test(dirQ.text) && dirQ.saved === 'nuova' && dirQ.scroll <= 0 && dirQ.closeIn, JSON.stringify(dirQ));
    await p.screenshot({ path: `${SP}/stand-direzione-720x720.png` });
    // B74: «Assi del giroscopio» anche qui in vista; con «Corretti · prova» il foglio continua a non scorrere
    await p.click('#natpf-staff [data-staff="axes"]'); await p.waitForTimeout(300);
    const axQ = await p.evaluate(() => { const S = document.querySelector('#natpf-staff .natpf-sheet'), s = S.getBoundingClientRect(), b = S.querySelector('[data-staff="axes"]'), r = b.getBoundingClientRect(), c = S.querySelector('[data-staff="close"]').getBoundingClientRect();
      return { text: `${b.querySelector('span').textContent} · ${b.querySelector('b').textContent}`, inside: r.height > 0 && r.top >= s.top && r.bottom <= Math.min(s.bottom, innerHeight), scroll: S.scrollHeight - S.clientHeight, closeIn: c.top >= s.top && c.bottom <= Math.min(s.bottom, innerHeight), saved: localStorage.getItem('natpf-tennis.assiGiroscopio') }; });
    check('720 × 720: «Assi del giroscopio» in vista, un clic → «Corretti · prova»; il foglio non scorre e «Chiudi» resta in vista', axQ.inside && /Corretti · prova/.test(axQ.text) && axQ.saved === 'corretti' && axQ.scroll <= 0 && axQ.closeIn, JSON.stringify(axQ));
    await p.screenshot({ path: `${SP}/stand-assi-720x720.png` });
    check('720 × 720: nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }
} finally {
  await B.close();
}
summary();
setTimeout(() => process.exit(), 300);
