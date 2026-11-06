// NATPF motore base (natpf-tennis/): la modale del tutorial vera con l'animazione dei gesti nuova (B9 ramo C, nota
// docs/b9/animazione-c.md): schermate (gioco singolo 1280×720 e 1920×1080, stesso schermo 1280×720 con le due metà
// animate, pagina del telefono 390×844 non toccata) e fotogrammi al secondo dal vivo con la modale sopra il gioco.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-modale-gesti.mjs     (GAME_PORT; SHOTS=cartella delle schermate,
//   predefinita nella cartella temporanea: quelle di docs/b9/img/C-modale-*.webp sono queste in WebP)
// Chromium con le opzioni predefinite: nel contenitore non c'è GPU, il Canvas 2D va su CPU (WebGL del gioco in software,
// se il browser lo concede). GL=swiftshader usa le opzioni delle altre prove (WebGL software anche per il canvas).
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3142);
const SHOTS = process.env.SHOTS || path.join(tmpdir(), 'natpf-modale-gesti'); mkdirSync(SHOTS, { recursive: true });
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
  // la cartella delle dipendenze ottimizzate di vite (node_modules/.vite) può essere rifatta da un altro server sulla stessa
  // macchina («504 Outdated Optimize Dep»): si ricarica la pagina, fino a 4 volte
  for (let k = 0; ; k++){
    await p.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0`, { waitUntil: 'domcontentloaded' });
    const ok = await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible, null, { timeout: 45000 }).then(() => true, () => false);
    if (ok) break;
    if (k >= 3) throw new Error('gioco non avviato');
    errs.length = 0;
  }
  await p.waitForTimeout(500);
  return { ctx, p, errs };
}
// fotogrammi al secondo dal vivo (requestAnimationFrame) e quante volte il gioco ridisegna l'arena nel frattempo
const fps = (p, ms = 4000) => p.evaluate(ms => new Promise(res => {
  const E = __natpfTennis, r = E.render.bind(E); let renders = 0; E.render = (...a) => { renders++; return r(...a); };
  const demos = [...document.querySelectorAll('.gesture-demo-canvas')].length, D = __natpfTennis.natpfUi.training?.tutorial?.demo?.();
  let n = 0, worst = 0, last = performance.now(); const t0 = last;
  const f = now => { n++; worst = Math.max(worst, now - last); last = now; if (now - t0 < ms) requestAnimationFrame(f); else { E.render = r; res({ fps: n/((now - t0)/1000), worst, renders, demos, drawMs: D?.running ? +D.drawMs.toFixed(2) : null }); } };
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
  // 1) costo dell'animazione nella pagina del gioco: modale sopra il menu (arena ferma dietro, come nello stesso schermo
  //    e nel collegamento del telefono). Qui conta solo l'animazione: ≥ 55 fps
  await p.waitForTimeout(2500);                     // il gioco appena aperto prepara ancora l'arena (un fotogramma da 1 s)
  await openModal(p, 2);
  await p.waitForTimeout(1500);
  const i = await info(p);
  check(`${w}×${h}: modale aperta con l'animazione (canvas ${i.css?.join('×')} CSS, ${i.w}×${i.h} px), velo senza backdrop-filter`, i.canvas && (!i.backdrop || i.backdrop === 'none'), JSON.stringify(i));
  const still = await fps(p);
  out[`${w}x${h}-menu`] = still;
  check(`${w}×${h}: modale sopra l'arena ferma ≥ 55 fps`, still.fps >= 55, `${still.fps.toFixed(1)} fps, fotogramma peggiore ${still.worst.toFixed(0)} ms, disegno ${still.drawMs} ms`);
  await p.evaluate(() => __natpfTennis.natpfUi.training.tutorial.close('review'));
  // 2) l'arena che gioca davvero dietro: l'Allenamento con il mouse (modalità prova: lanciapalle e giocatore in campo), poi
  //    la modale «Rivedi i gesti» sopra (non mette in pausa il campo: il caso più pesante). Senza GPU il campo 3D da solo
  //    va a pochi fotogrammi al secondo (WebGL in software): si verifica che l'animazione non tolga più del 15%
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; if (!ui.testInput) ui.toggleTestInput(); ui.lobby.setMode('training'); ui.selectController('mouse', { open: false }); ui.lobby.startWarmup(); });
  await p.waitForFunction(() => __natpfTennis.natpfUi.training.active && !__natpfTennis.natpfUi.lobby.visible, null, { timeout: 15000 });
  await p.waitForTimeout(1500);
  const base = await fps(p);
  await openModal(p, 2);
  await p.waitForTimeout(1000);
  const f = await fps(p);
  out[`${w}x${h}-campo`] = { base, modal: f, webgl: i.webgl };
  check(`${w}×${h}: modale sopra il campo che gioca: ≥ 55 fps o ≥ 85% del campo da solo`, f.fps >= 55 || f.fps >= .85*base.fps,
    `${f.fps.toFixed(1)} fps con la modale, ${base.fps.toFixed(1)} fps il campo da solo (ridisegni dell'arena ${f.renders}/${base.renders}), WebGL ${i.webgl}`);
  // schermate: dritto all'impatto e servizio al braccio in alto, sopra il campo
  await p.evaluate(() => { const T = __natpfTennis.natpfUi.training.tutorial, D = T.demo(); D.stop(); D.show(D.hitTime(), { rate: 1 }); });
  await p.screenshot({ path: path.join(SHOTS, `C-modale-${w}x${h}.png`) });
  await p.evaluate(() => { const T = __natpfTennis.natpfUi.training.tutorial; T.go(4); const D = T.demo(); D.stop(); D.show(D.hitTime(), { rate: 1 }); });
  await p.screenshot({ path: path.join(SHOTS, `C-modale-${w}x${h}-servizio.png`) });
  // a modale chiusa l'animazione non disegna più
  await p.evaluate(() => { const T = __natpfTennis.natpfUi.training.tutorial, D = T.demo(); D.start(); T.close('review'); window.__fr0 = D.frames; });
  await p.waitForTimeout(800);
  const stop = await p.evaluate(() => { const D = __natpfTennis.natpfUi.training.tutorial.demo(); return { running: D.running, frames: D.frames - __fr0 }; });
  check(`${w}×${h}: modale chiusa: animazione ferma`, !stop.running && stop.frames === 0, JSON.stringify(stop));
  check(`${w}×${h}: nessun errore`, !errs.length, errs.join(' | ').slice(0, 300));
  await ctx.close();
}

// stesso schermo 1280×720: le due metà con la modale e la propria animazione (P2 mancino)
{
  const { ctx, p, errs } = await game(1280, 720);
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.lobby.menu('play'); ui.lobby.setMode('split'); ui.lobby.go('connect');
    ui.split.tut.p1.openFor({ mode: 'phone', player: 'Giulia', hand: 'right' }); ui.split.tut.p1.go(2);
    ui.split.tut.p2.openFor({ mode: 'phone', player: 'Marco', hand: 'left' }); ui.split.tut.p2.go(4); });
  await p.waitForTimeout(2000);
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
