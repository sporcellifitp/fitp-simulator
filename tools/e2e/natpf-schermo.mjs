// NATPF motore base, B8: schermo intero senza cornici e calibrazione dello schermo, nel browser.
//   • a 1280 × 720 e 1920 × 1080 Opzioni → Schermo: il comando «Schermo intero» e «Calibra lo schermo…» si vedono senza
//     scorrere, con il testo giusto; il pulsante in alto accanto a «Come si gioca» pure;
//   • ?fs=1 (con navigator.webdriver il gioco non apre lo schermo intero da solo senza ?fs=1) e intro vera: il primo tasto
//     sul titolo apre lo schermo intero (document.fullscreenElement, se il Chromium headless lo dà; altrimenti la chiamata
//     a requestFullscreen) e dopo Esc nel menu torna ancora indietro di una pagina; F lo chiude e lo riapre;
//   • calibrazione: bordo sinistro e bordo sotto del 5%, Invio, ricarica: l'area resta (--area-* e viewport()); Esc
//     annulla e rimette l'area salvata; il formato 1:1 dà un'area quadrata;
//   • schermate del riquadro di calibrazione a 1920 × 1080 e 1200 × 1200 in $OUT (da guardare);
//   • browser in F11 (display-mode: fullscreen finto, come Edge con --start-fullscreen nella LAN): «Premi F11 per uscire»
//     si vede davvero in campo (F), dalla voce della pausa e nella calibrazione (toast figlio del body, sopra a tutto).
//   cd tools/e2e && GAME_PORT=3201 CHROMIUM_PATH=/percorso/chrome node natpf-schermo.mjs
// Non prova: Edge su Windows, il programma Windows (Electron), un monitor o un ledwall veri, Esc tenuto premuto nel
// browser vero (Keyboard Lock) e lo stiramento di un processore LED.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3185), URL0 = `http://127.0.0.1:${GAME_PORT}/`;
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(URL0));

const ready = p => p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby?.visible && !__natpfTennis.natpfUi.intro?.active, null, { timeout: 120000 });
const step = p => p.evaluate(() => __natpfTennis.natpfUi.lobby.step);
// l'elemento si vede tutto, dentro la finestra e dentro la colonna del menu (senza scorrere)
const inView = (p, sel) => p.evaluate(sel => {
  const e = document.querySelector(sel); if (!e) return { ok: false, why: 'manca' };
  const r = e.getBoundingClientRect(), st = document.querySelector('#title-modal .lobby-stage').getBoundingClientRect();
  const lbl = (e.querySelector('.fs-label') || e).textContent.trim();
  return { ok: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && (e.closest('.lobby-stage') ? r.bottom <= st.bottom && r.top >= st.top : true), label: lbl, top: Math.round(r.top), bottom: Math.round(r.bottom) };
}, sel);
const areaVars = p => p.evaluate(() => {
  const s = getComputedStyle(document.documentElement), b = document.body.getBoundingClientRect(), a = __natpfTennis.natpfUi.screen.info().area;
  return { vars: ['x', 'y', 'w', 'h'].map(k => s.getPropertyValue(`--area-${k}`).trim()).join(' '), body: [b.left, b.top, b.width, b.height].map(Math.round).join(' '), vp: [a.x, a.y, a.w, a.h].join(' '), cls: document.documentElement.classList.contains('natpf-area') };
});

const B = await launch();
try {
  // 1. Opzioni → Schermo senza scorrere, a due risoluzioni
  for (const [w, h] of [[1280, 720], [1920, 1080]]){
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w, h });
    await ready(p); await p.waitForTimeout(400);
    const tag = `${w} × ${h}`;
    const top = await inView(p, '#lobby-fullscreen');
    check(`${tag}: pulsante «Schermo intero» in alto accanto a «Come si gioca»`, top.ok && top.label === 'Schermo intero', JSON.stringify(top));
    await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options')); await p.waitForTimeout(500);
    const fsb = await inView(p, '#natpf-fullscreen'), calb = await inView(p, '[data-option="calibra"]'), pref = await inView(p, '[data-natpf-fs="off"]');
    check(`${tag}: Opzioni → Schermo: «Schermo intero», «All’avvio» e «Calibra lo schermo…» visibili senza scorrere`, fsb.ok && fsb.label === 'Schermo intero' && calb.ok && /Calibra lo schermo/.test(calb.label) && pref.ok, JSON.stringify({ fsb, calb, pref }));
    const looks = await p.evaluate(() => { const s = getComputedStyle(document.getElementById('natpf-fullscreen')); return { bg: s.backgroundColor, radius: s.borderRadius, h: document.getElementById('natpf-fullscreen').getBoundingClientRect().height }; });
    check(`${tag}: il comando dello schermo intero è un pulsante vero (sfondo, bordo tondo), non testo`, looks.bg !== 'rgba(0, 0, 0, 0)' && parseFloat(looks.radius) > 10 && looks.h >= 30, JSON.stringify(looks));
    if (w === 1280) await p.screenshot({ path: `${SP}/schermo-opzioni-${w}x${h}.png` });
    check(`${tag}: nessun errore JavaScript`, !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }

  // 2. Schermo intero vero al primo tasto sul titolo (?fs=1, senza il finto requestFullscreen di th.mjs), Esc indietro, F
  {
    const ctx = await B.newContext({ viewport: { width: 1280, height: 720 } }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    await p.addInitScript(() => { const real = Element.prototype.requestFullscreen; window.__fs = 0; Element.prototype.requestFullscreen = function(...a){ window.__fs++; return real.apply(this, a); }; });
    await p.goto(`${URL0}?fs=1`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.intro?.active, null, { timeout: 120000 });
    check('?fs=1: apertura automatica pronta sulla schermata del titolo', await p.evaluate(() => __natpfTennis.natpfUi.screen.fullscreen.armed));
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    check('Esc sul titolo non chiede lo schermo intero (il browser lo rifiuterebbe)', await p.evaluate(() => window.__fs) === 0);
    await p.keyboard.press('Enter'); await p.waitForTimeout(600);
    const s1 = await p.evaluate(() => ({ calls: __fs, el: !!document.fullscreenElement, frameless: __natpfTennis.natpfUi.screen.fullscreen.frameless, armed: __natpfTennis.natpfUi.screen.fullscreen.armed }));
    check('primo tasto sul titolo: schermo intero chiesto una volta' + (s1.el ? ' e aperto (document.fullscreenElement)' : ' (headless senza schermo intero)'), s1.calls === 1 && !s1.armed && (s1.el ? s1.frameless : true), JSON.stringify(s1));
    if (await p.evaluate(() => __natpfTennis.natpfUi.intro.active)){ await p.keyboard.press('Enter'); }
    await ready(p); await p.waitForTimeout(400);
    const lbl = await p.evaluate(() => document.querySelector('#lobby-fullscreen .fs-label').textContent);
    check('il pulsante in alto dice lo stato', lbl === (s1.el ? 'Esci da schermo intero' : 'Schermo intero'), lbl);
    await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options')); await p.waitForTimeout(300);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    check('a schermo intero Esc nel menu torna ancora indietro (Opzioni → menu)', await step(p) === 'menu', JSON.stringify({ step: await step(p), el: await p.evaluate(() => !!document.fullscreenElement) }));
    if (s1.el){
      await p.keyboard.press('KeyF'); await p.waitForTimeout(500);
      const off = await p.evaluate(() => ({ el: !!document.fullscreenElement, lbl: document.querySelector('#lobby-fullscreen .fs-label').textContent }));
      await p.keyboard.press('KeyF'); await p.waitForTimeout(500);
      const on = await p.evaluate(() => ({ el: !!document.fullscreenElement, lbl: document.querySelector('#lobby-fullscreen .fs-label').textContent, calls: __fs }));
      check('F chiude e riapre lo schermo intero; il pulsante cambia testo', !off.el && off.lbl === 'Schermo intero' && on.el && on.lbl === 'Esci da schermo intero' && on.calls === 2, JSON.stringify({ off, on }));
    } else check('F (non provato: il Chromium headless non dà lo schermo intero)', true);
    check('schermo intero: nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }

  // 3. Calibrazione: bordi, Invio, ricarica, Esc, 1:1; schermate a 1920 × 1080 e 1200 × 1200
  {
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w: 1920, h: 1080 });
    await ready(p); await p.waitForTimeout(400);
    await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options')); await p.waitForTimeout(400);
    await p.click('[data-option="calibra"]'); await p.waitForTimeout(300);
    check('«Calibra lo schermo…» apre il riquadro', await p.evaluate(() => __natpfTennis.natpfUi.calibra.isOpen && !document.getElementById('natpf-calibra').classList.contains('hidden') && document.getElementById('natpf-calibra').parentElement === document.body));
    for (let i = 0; i < 4; i++) await p.keyboard.press('Tab');
    await p.keyboard.press('Shift+ArrowRight');                     // sinistra 5% verso il centro
    await p.keyboard.press('Shift+Tab');                            // sotto
    await p.keyboard.press('Shift+ArrowUp');                        // sotto 5% verso il centro
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${SP}/schermo-calibra-1920x1080.png` });
    const live = await areaVars(p);
    check('anteprima dal vivo: area 1824 × 1026 da 96, 0 (bordi sinistro e sotto del 5%)', live.vp === '96 0 1824 1026' && live.body === '96 0 1824 1026', JSON.stringify(live));
    // il riquadro segue l'area: le frecce degli angoli stanno agli angoli dell'area
    const corners = await p.evaluate(() => ['tl', 'br'].map(k => { const r = document.querySelector(`.cal-corner-${k}`).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); }));
    check('frecce degli angoli sui bordi dell’area', corners[0][0] === 96 && corners[0][1] === 0 && corners[1][2] === 1920 && corners[1][3] === 1026, JSON.stringify(corners));
    await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    const saved = await p.evaluate(() => ({ open: __natpfTennis.natpfUi.calibra.isOpen, cal: localStorage.getItem('natpf-tennis.screen.cal'), step: __natpfTennis.natpfUi.lobby.step, sum: document.getElementById('screen-cal-sum').textContent }));
    check('Invio salva (natpf-tennis.screen.cal) e resta nelle Opzioni con il riassunto', !saved.open && saved.step === 'options' && JSON.stringify(JSON.parse(saved.cal)) === '{"v":1,"preset":"full","margins":{"t":0,"r":0,"b":5,"l":5}}' && /↓ 5 · ← 5 %/.test(saved.sum), JSON.stringify(saved));
    await p.reload({ waitUntil: 'domcontentloaded' }); await ready(p); await p.waitForTimeout(500);
    const after = await areaVars(p);
    check('dopo la ricarica l’area resta (--area-*, body e viewport())', after.vars === '96px 0px 1824px 1026px' && after.body === '96 0 1824 1026' && after.vp === '96 0 1824 1026' && after.cls, JSON.stringify(after));
    const canvas = await p.evaluate(() => { const c = __natpfTennis.renderer?.domElement?.getBoundingClientRect?.(); return c ? [c.left, c.top, c.width, c.height].map(Math.round).join(' ') : null; });
    check('il campo 3D si disegna nell’area', canvas === null || canvas === '96 0 1824 1026', String(canvas));
    // Esc annulla: 1:1 in anteprima (area quadrata), poi com'era
    await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options')); await p.waitForTimeout(300);
    await p.click('[data-option="calibra"]'); await p.waitForTimeout(300);
    await p.keyboard.press('Digit6'); await p.waitForTimeout(200);
    const sq = await areaVars(p);
    const [, , sw, sh] = sq.vp.split(' ').map(Number);
    check('formato 1:1: area quadrata (dentro i bordi salvati)', sw === sh && sq.vp === '495 0 1026 1026' && sq.body === '495 0 1026 1026', JSON.stringify(sq));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const back = await areaVars(p);
    const st = await p.evaluate(() => ({ open: __natpfTennis.natpfUi.calibra.isOpen, step: __natpfTennis.natpfUi.lobby.step, cal: JSON.parse(localStorage.getItem('natpf-tennis.screen.cal')).preset }));
    check('Esc annulla: area salvata di nuovo, calibrazione chiusa, sempre nelle Opzioni', back.vp === '96 0 1824 1026' && !st.open && st.step === 'options' && st.cal === 'full', JSON.stringify({ back, st }));
    check('calibrazione: nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }
  {
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w: 1200, h: 1200 });
    await ready(p); await p.waitForTimeout(400);
    await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options')); await p.waitForTimeout(300);
    // con la tastiera, come con un joypad: Invio sul pulsante apre (e non salva subito)
    await p.focus('[data-option="calibra"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    check('Invio su «Calibra lo schermo…» apre il riquadro senza salvare', await p.evaluate(() => __natpfTennis.natpfUi.calibra.isOpen && localStorage.getItem('natpf-tennis.screen.cal') === null));
    await p.keyboard.press('Tab'); await p.keyboard.press('Shift+ArrowDown'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${SP}/schermo-calibra-1200x1200.png` });
    const fit = await p.evaluate(() => {
      const pn = document.querySelector('.cal-panel'), r = pn.getBoundingClientRect(), c = document.querySelector('.cal-circle').getBoundingClientRect();
      const out = [...document.querySelectorAll('#natpf-calibra .cal-panel *, #natpf-calibra .cal-mark')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.left < -1 || b.top < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1); }).length;
      return { scroll: pn.scrollHeight - pn.clientHeight, out, circle: [Math.round(c.width), Math.round(c.height)], panelInCircle: r.width < c.width && r.height < c.height };
    });
    check('1200 × 1200: pannello senza scorrere, niente fuori schermo, cerchio rotondo e visibile ai lati del pannello', fit.scroll <= 0 && fit.out === 0 && fit.circle[0] === fit.circle[1] && fit.panelInCircle, JSON.stringify(fit));
    check('1200 × 1200: nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }
  // 4. Browser in F11 (LAN in Edge con --start-fullscreen): display-mode: fullscreen finto. «Premi F11» si vede davvero
  //    (toast con una misura e sopra a tutto nel suo centro) in campo con F, dalla voce della pausa e nella calibrazione
  {
    const f11 = () => { const mm = window.matchMedia.bind(window); window.matchMedia = q => (/display-mode:\s*fullscreen/.test(q) ? { matches: true, media: q, addEventListener(){}, removeEventListener(){} } : mm(q)); };
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w: 1280, h: 720, init: f11 });
    await ready(p); await p.waitForTimeout(400);
    // il toast si misura nel momento in cui compare (il campo 3D in software rende lente le chiamate dalla prova: dopo
    // i suoi 2,6 s il toast si è già chiuso); per la schermata lo si rimette visibile a mano
    const arm = () => p.evaluate(() => {
      const t = document.getElementById('natpf-toast'); t.classList.add('hidden'); window.__toastSeen = null;
      const mo = new MutationObserver(() => {
        if (t.classList.contains('hidden') || window.__toastSeen) return;
        const r = t.getBoundingClientRect(), top = r.width ? document.elementFromPoint(r.left + r.width/2, r.top + r.height/2) : null;
        window.__toastSeen = { text: t.textContent, w: Math.round(r.width), h: Math.round(r.height), onTop: !!top && t.contains(top), parent: t.parentElement === document.body };
        mo.disconnect();
      });
      mo.observe(t, { attributes: true, attributeFilter: ['class'] });
    });
    const seen = async () => { await p.waitForFunction(() => window.__toastSeen, null, { timeout: 10000 }).catch(() => {}); return p.evaluate(() => window.__toastSeen || { text: '', w: 0, h: 0 }); };
    const shot = async name => { await p.evaluate(() => document.getElementById('natpf-toast').classList.remove('hidden')); await p.screenshot({ path: `${SP}/${name}` }); };
    const ok = s => s.text === 'Premi F11 per uscire dallo schermo intero' && s.w > 100 && s.h > 20 && s.onTop && s.parent;
    check('F11: il pulsante in alto dice «Esci da schermo intero»', await p.evaluate(() => document.querySelector('#lobby-fullscreen .fs-label').textContent) === 'Esci da schermo intero');
    await p.evaluate(() => { const ui = __natpfTennis.natpfUi; if (!ui.testInput) ui.toggleTestInput(); ui.selectController('mouse', { open: false }); ui.lobby.setMode('cpu'); ui.lobby.go('match'); });
    await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('btn-start-match').click());
    await p.waitForFunction(() => document.documentElement.classList.contains('autoplay-mode') && !__natpfTennis.autoPlayMode, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    await arm(); await p.keyboard.press('KeyF');
    const field = await seen();
    check('F11, in campo: F mostra «Premi F11 per uscire» (toast visibile sopra il campo)', ok(field), JSON.stringify(field));
    await shot('schermo-f11-campo.png');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await arm(); await p.click('[data-pause="fullscreen"]', { noWaitAfter: true });
    const pause = await seen();
    check('F11, pausa: «Schermo» mostra «Premi F11 per uscire» sopra il foglio della pausa', ok(pause) && await p.evaluate(() => __natpfTennis.natpfUi.pause.isOpen), JSON.stringify(pause));
    await shot('schermo-f11-pausa.png');
    await p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.pause.close(); ui.backToMenu(); });
    await p.waitForTimeout(600);
    await p.evaluate(() => { __natpfTennis.natpfUi.lobby.go('options'); __natpfTennis.natpfUi.lobby.option('calibra'); });
    await p.waitForTimeout(300);
    await arm(); await p.keyboard.press('KeyF');
    const cal = await seen();
    check('F11, calibrazione: F mostra «Premi F11 per uscire» sopra il riquadro', ok(cal) && await p.evaluate(() => __natpfTennis.natpfUi.calibra.isOpen), JSON.stringify(cal));
    await p.keyboard.press('Escape');
    check('F11: nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }
} finally {
  await B.close();
}
console.log(`schermate: ${SP}/schermo-calibra-1920x1080.png, ${SP}/schermo-calibra-1200x1200.png, ${SP}/schermo-opzioni-1280x720.png, ${SP}/schermo-f11-campo.png, ${SP}/schermo-f11-pausa.png`);
summary();
setTimeout(() => process.exit(), 300);
