// B49 · sonda nel browser: il pannello dello stand con una sedicesima voce («Doppio: compagno») ci sta? Gioco di oggi
// (worktree pulita), voce aggiunta nella pagina con un clone di «Stesso schermo: campo aperto». Per ogni misura: foglio
// che scorre (px), «Chiudi» dentro il foglio e lo schermo, file della griglia; con 15 voci (oggi), con 16, con 16 e le
// opzioni con le scritte lunghe accese (formato in fiera «Sì · punto decisivo», campo aperto «Sì», lancio automatico «Sì»,
// chiosco «Sì», calibrazione «Con i gesti»), e a 720 × 720 con quattro colonne (proposta del piano). Schermate in OUT.
// Uso: node pannello-16.mjs   (porta 4370; vite della worktree pulita; Chromium di /opt/pw-browsers)
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdirSync } from 'node:fs';
const { chromium } = await import('/home/user/foro-italico-world/tools/e2e/node_modules/playwright-core/index.mjs');
const GAME = '/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/wt-base/natpf-tennis';
const OUT = '/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/misure/pannello';
mkdirSync(OUT, { recursive: true });
const PORT = 4370;
const vite = spawn(process.execPath, [GAME + '/node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 160; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
if (!await up(`http://127.0.0.1:${PORT}/`)) { console.log('vite non partito'); process.exit(1); }
const B = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const LONG = { 'natpf-tennis.formatoFiera': 'si', 'natpf-tennis.campoAperto': '1', 'natpf-tennis.lancioAuto': '1', 'natpf-tennis.calibrazione': 'gesti' };
const MEASURE = () => {
  const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), c = s.querySelector('[data-staff="close"]').getBoundingClientRect();
  const btns = [...s.querySelectorAll('.pause-grid > button')], tops = [...new Set(btns.map(b => Math.round(b.getBoundingClientRect().top)))];
  const nb = s.querySelector('[data-staff="partner"]'), nr = nb?.getBoundingClientRect();
  return { n: btns.length, rows: tops.length, cols: getComputedStyle(s.querySelector('.pause-grid')).gridTemplateColumns.split(' ').length, scroll: s.scrollHeight - s.clientHeight,
    sheet: [Math.round(r.top), Math.round(r.bottom)], close: [Math.round(c.top), Math.round(c.bottom)], inner: innerHeight, closeIn: c.top >= r.top && c.bottom <= Math.min(r.bottom, innerHeight),
    spare: Math.round(Math.min(r.bottom, innerHeight) - c.bottom), newIn: nr ? nr.height > 0 && nr.bottom <= Math.min(r.bottom, innerHeight) : null, btnH: Math.round(btns[0].getBoundingClientRect().height),
    texts: btns.map(b => b.querySelector('b')?.textContent).slice(-4) };
};
const ADD = () => {
  const src = document.querySelector('#natpf-staff [data-staff="open"]'), b = src.cloneNode(true);
  b.dataset.staff = 'partner'; b.removeAttribute('title'); b.querySelector('span').textContent = 'Doppio: compagno'; b.querySelector('b').textContent = 'Con il tuo gesto';
  src.after(b);
};
const FOUR = () => { const st = document.createElement('style'); st.textContent = '@container natpf (min-width: 701px) and (max-width: 820px) and (max-height: 760px) { .natpf-sheet.staff-sheet .pause-grid { grid-template-columns: repeat(4, 1fr); } .natpf-sheet.staff-sheet .pause-grid button span { font-size: 11px; } .natpf-sheet.staff-sheet .pause-grid button b { font-size: clamp(13px, 2.1cqh, 16px); } }'; document.head.appendChild(st); };
for (const [w, h] of [[720, 720], [1024, 600], [1366, 657], [1280, 720], [1920, 540]]){
  for (const long of [false, true]){
    const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(L => { try { localStorage.setItem('natpf-tennis.calibrazione', 'play'); if (L) for (const [k, v] of Object.entries(L)) localStorage.setItem(k, v); if (L) localStorage.setItem('natpf-tennis.chiosco', JSON.stringify({ enabled: true, limit: 45 })); } catch {} }, long ? LONG : null);
    await p.goto(`http://127.0.0.1:${PORT}/?intro=0`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible, null, { timeout: 180000 });
    await p.waitForTimeout(600);
    await p.keyboard.press('Control+Shift+KeyK');
    await p.waitForSelector('#natpf-staff:not(.hidden) [data-staff="close"]', { state: 'visible', timeout: 10000 });
    await p.waitForTimeout(400);
    const tag = `${w}x${h}${long ? ' scritte lunghe' : ''}`;
    const m15 = await p.evaluate(MEASURE);
    await p.evaluate(ADD); await p.waitForTimeout(200);
    const m16 = await p.evaluate(MEASURE);
    await p.screenshot({ path: `${OUT}/stand16-${w}x${h}${long ? '-lunghe' : ''}.png` });
    let m4 = null;
    if (w === 720){ await p.evaluate(FOUR); await p.waitForTimeout(200); m4 = await p.evaluate(MEASURE); await p.screenshot({ path: `${OUT}/stand16-4col-${w}x${h}${long ? '-lunghe' : ''}.png` }); }
    console.log(`${tag}\n  15 voci: ${JSON.stringify(m15)}\n  16 voci: ${JSON.stringify(m16)}${m4 ? `\n  16 voci, 4 colonne: ${JSON.stringify(m4)}` : ''}${errs.length ? `\n  errori: ${errs.join(' | ').slice(0, 200)}` : ''}`);
    await ctx.close();
  }
}
await B.close(); stop();
