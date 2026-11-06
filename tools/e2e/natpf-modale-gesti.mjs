// NATPF motore base (natpf-tennis/): la modale del tutorial vera con l'animazione dei gesti nuova (B9 ramo C, nota
// docs/b9/animazione-c.md): schermate (gioco singolo 1280×720 e 1920×1080, stesso schermo 1280×720 con le due metà
// animate, pagina del telefono 390×844 non toccata) e fotogrammi al secondo dal vivo con la modale sopra il gioco.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-modale-gesti.mjs     (GAME_PORT; SHOTS=cartella delle schermate)
// Chromium con le opzioni predefinite: nel contenitore non c'è GPU, il Canvas 2D va su CPU (WebGL del gioco in software,
// se il browser lo concede). GL=swiftshader usa le opzioni delle altre prove (WebGL software anche per il canvas).
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3142);
const SHOTS = process.env.SHOTS || path.resolve(here, '../../docs/b9/img'); mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, i = '') => { results.push(ok); console.log((ok ? 'OK  ' : 'KO  ') + n + (i ? ' — ' + i : '')); };
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const args = process.env.GL === 'swiftshader' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [];
const B = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args });

async function game(w, h){
  const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible, null, { timeout: 120000 });
  await p.waitForTimeout(500);
  return { ctx, p, errs };
}
// fotogrammi al secondo dal vivo (requestAnimationFrame) e quante volte il gioco ridisegna l'arena nel frattempo
const fps = (p, ms = 4000) => p.evaluate(ms => new Promise(res => {
  const E = __natpfTennis, r = E.render.bind(E); let renders = 0; E.render = (...a) => { renders++; return r(...a); };
  const demos = [...document.querySelectorAll('.gesture-demo-canvas')].length;
  let n = 0, worst = 0, last = performance.now(); const t0 = last;
  const f = now => { n++; worst = Math.max(worst, now - last); last = now; if (now - t0 < ms) requestAnimationFrame(f); else { E.render = r; res({ fps: n/((now - t0)/1000), worst, renders, demos }); } };
  requestAnimationFrame(f);
}), ms);
// Allenamento con il mouse (l'arena gioca davvero dietro la modale) e la modale «Rivedi i gesti» sulla scheda del dritto
async function openModal(p, idx = 2, hand = 'right'){
  await p.evaluate(({ idx, hand }) => {
    const ui = __natpfTennis.natpfUi, T = ui.training;
    T.tutorial.openFor({ mode: 'review', hand }); T.tutorial.go(idx);
  }, { idx, hand });
  await p.waitForTimeout(400);
}
const info = p => p.evaluate(() => {
  const c = document.querySelector('#natpf-tutorial .gesture-demo-canvas'), cs = getComputedStyle(document.getElementById('natpf-tutorial'));
  return { canvas: !!c, w: c?.width, h: c?.height, css: c ? [c.clientWidth, c.clientHeight] : null, backdrop: cs.backdropFilter || cs.webkitBackdropFilter, bg: cs.backgroundColor, webgl: !!document.createElement('canvas').getContext('webgl2') };
});

const out = {};
for (const [w, h] of [[1280, 720], [1920, 1080]]){
  const { ctx, p, errs } = await game(w, h);
  // l'arena che si muove dietro: l'Allenamento con il mouse (lanciapalle e giocatore), poi la modale «Rivedi i gesti» sopra
  await p.click('[data-menu="training"]');
  await p.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'controller', null, { timeout: 5000 });
  await p.click('[data-page="controller"] [data-natpf-controller="mouse"]');
  await p.waitForFunction(() => !__natpfTennis.natpfUi.lobby.visible, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  await openModal(p, 2);
  const i = await info(p);
  check(`${w}×${h}: modale aperta con l'animazione (canvas ${i.css?.join('×')} CSS, ${i.w}×${i.h} px), velo senza backdrop-filter`, i.canvas && (!i.backdrop || i.backdrop === 'none'), JSON.stringify(i));
  // dritto vicino all'impatto: aspetta il ciclo a tempo reale e scatta al contatto
  await p.evaluate(() => { const d = document.querySelector('#natpf-tutorial .gesture-demo-canvas'); window.__demoCv = d; });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const T = __natpfTennis.natpfUi.training.tutorial, D = T.demo(); D.stop(); D.show(D.hitTime(), { rate: 1 }); });
  await p.screenshot({ path: path.join(SHOTS, `C-modale-${w}x${h}.png`) });
  await p.evaluate(() => __natpfTennis.natpfUi.training.tutorial.demo().start());
  const f = await fps(p);
  out[`${w}x${h}`] = { ...f, webgl: i.webgl };
  check(`${w}×${h}: con la modale sopra il gioco ≥ 55 fps`, f.fps >= 55, `${f.fps.toFixed(1)} fps, fotogramma peggiore ${f.worst.toFixed(0)} ms, ridisegni dell'arena ${f.renders}, WebGL ${i.webgl}`);
  // servizio (scheda 5) al braccio in alto
  await p.evaluate(() => { const T = __natpfTennis.natpfUi.training.tutorial; T.go(4); const D = T.demo(); D.stop(); D.show(2.08, { rate: 1 }); });
  await p.screenshot({ path: path.join(SHOTS, `C-modale-${w}x${h}-servizio.png`) });
  // a modale chiusa l'animazione non disegna più
  await p.evaluate(() => { const T = __natpfTennis.natpfUi.training.tutorial, D = T.demo(); D.start(); T.close('review'); window.__fr0 = D.frames; });
  await p.waitForTimeout(800);
  const still = await p.evaluate(() => { const D = __natpfTennis.natpfUi.training.tutorial.demo(); return { running: D.running, frames: D.frames - __fr0 }; });
  check(`${w}×${h}: modale chiusa: animazione ferma`, !still.running && still.frames === 0, JSON.stringify(still));
  check(`${w}×${h}: nessun errore`, !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close();
}

// stesso schermo 1280×720: le due metà con la modale e la propria animazione (P2 mancino)
{
  const { ctx, p, errs } = await game(1280, 720);
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.lobby.menu('play'); ui.lobby.setMode('split'); ui.lobby.go('connect');
    ui.split.tut.p1.openFor({ mode: 'phone', player: 'Giulia', hand: 'right' }); ui.split.tut.p1.go(2);
    ui.split.tut.p2.openFor({ mode: 'phone', player: 'Marco', hand: 'left' }); ui.split.tut.p2.go(4); });
  await p.waitForTimeout(500);
  const two = await p.evaluate(() => { const a = __natpfTennis.natpfUi.split.tut.p1.demo(), b = __natpfTennis.natpfUi.split.tut.p2.demo();
    return { distinct: a !== b, run: [a.running, b.running], ids: [a.id, b.id], hands: [a.hand, b.hand], css: [a.w, a.h, b.w, b.h] }; });
  check('stesso schermo: ogni metà ha la sua animazione che gira (dritto del P1, servizio mancino del P2)', two.distinct && two.run.every(Boolean) && two.ids.join() === 'forehand,serve' && two.hands.join() === 'right,left', JSON.stringify(two));
  const f = await fps(p);
  out.split = f;
  check('stesso schermo: due animazioni insieme ≥ 50 fps', f.fps >= 50, `${f.fps.toFixed(1)} fps, peggiore ${f.worst.toFixed(0)} ms, canvas ${f.demos}`);
  await p.evaluate(() => { const s = __natpfTennis.natpfUi.split; const a = s.tut.p1.demo(), b = s.tut.p2.demo(); a.stop(); b.stop(); a.show(a.hitTime(), { rate: 1 }); b.show(b.hitTime(), { rate: 1 }); });
  await p.screenshot({ path: path.join(SHOTS, 'C-modale-stesso-schermo-1280x720.png') });
  check('stesso schermo: nessun errore', !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close();
}

// pagina del telefono 390×844: non toccata dal ramo (stessa schermata «Pronto» di prima)
{
  const ctx = await B.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${GAME_PORT}/natpf/tennis/racchetta.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(SHOTS, 'C-modale-telefono-390x844.png') });
  check('pagina del telefono aperta (schermata salvata)', true);
  await ctx.close();
}
writeFileSync(path.join(process.env.OUT || SHOTS, 'C-modale-misure.json'), JSON.stringify(out, null, 1));
await B.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} verifiche superate`);
if (results.some(r => !r)) process.exitCode = 1;
process.exit();
