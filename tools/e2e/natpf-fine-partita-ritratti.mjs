// NATPF B40.6 · ritratti della card della partita dai modelli 3D e arena ferma sotto la card (docs/b40/fine-partita-v2.md).
// Gioco vero nel browser (WebGL in software qui: SwiftShader, il caso peggiore), partite chiuse con i punti del motore:
//   A. contro la CPU (Classici): cattura pronta (K = 12, 256×320, foglio ≤ 8 MB), nessun programma shader nuovo, fotogrammi
//      diversi tra loro e non vuoti, card con il canvas al posto del ritratto SVG e i fotogrammi che cambiano; con la card
//      aperta 0 disegni dell'arena in 3 s (fotogrammi al secondo misurati), ridisegno al ridimensionamento; «Rivincita» →
//      l'arena torna a ogni fotogramma, «‹ Indietro» → card di nuovo, ferma, ritratto che si muove; «Menu» → arena di
//      nuovo; riga della diagnostica con i ms della cattura;
//   B. stesso schermo con «Lob & Drop»: due card, Drop a sinistra e Lob a destra, due fogli dai modelli 3D;
//   C. ?ritratti=svg: niente cattura, ritratto SVG; contesto WebGL perso prima della cattura: ritratto SVG senza errori.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-fine-partita-ritratti.mjs      (GAME_PORT, OUT; ONLY=AC per
//   fare solo alcune parti)
// Non sostituisce una scheda grafica vera: i ms qui sono quelli di SwiftShader (da misurare sul PC dello stand).
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3174);
const OUT = path.join(SP, 'fine-partita-ritratti'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// gioco pronto, con il contatore dei disegni dell'arena e dei fotogrammi
async function open(B, query, size = { w: 1280, h: 720 }){
  const r = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0${query}`, size);
  await r.p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model && window.__natpfTennis.opponent?.model, null, { timeout: 180000 });
  await r.p.evaluate(() => {
    const E = __natpfTennis; E.natpfUi.intro?.skip?.();
    const render = E.render.bind(E); window.__draws = 0; E.render = () => { window.__draws++; return render(); };
    window.__raf = 0; const tick = () => { window.__raf++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  });
  return r;
}
// una partita di un game finita con i punti del motore (contro la CPU o nello stesso schermo)
const play = (g, { split = false, win = true } = {}) => g.evaluate(({ split, win }) => {
  const E = __natpfTennis, ui = E.natpfUi;
  ui.onboarding?.close?.(); E.hud.hideTitleModal?.(); ui.lobby.visible = false; E.hud.hideVictoryModal();
  ui.testInput = true; ui.selectController('mouse', { open: false });
  E.autoPlayMode = false; E.userHasInteracted = true;
  if (split){ E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; E.startSplit(); }
  else { ui.events.nickname = 'Ada'; E.isMultiplayer = false; E._applyDifficultyTuning('evento'); E.matchConfig.difficulty = 'evento'; }
  E.natpfFair = false; E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 1;
  E.natpfStats.shot(E, { role: 'p1', grade: 'PERFECT', kmh: 118 });
  const w = win ? 'player' : 'opponent';
  for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++){ E.ball.rallyStrokeCount = 9; E._awardPoint(w, 'Out'); }
  return E.phase;
}, { split, win });
const shown = g => g.waitForFunction(() => !document.getElementById('victory-modal').classList.contains('hidden'), null, { timeout: 120000 }).then(() => true, () => false);
const ready = g => g.waitForFunction(() => { const r = __natpfTennis.natpfUi.ritratti.info(); return r.ready || r.state === 'svg' ? r : null; }, null, { timeout: 300000, polling: 500 }).then(h => h.jsonValue(), () => null);
// fotogrammi del foglio: diversi tra loro (salto o applauso) e non vuoti (pixel diversi dallo sfondo)
const sheetCheck = (g, side) => g.evaluate(side => {
  const R = __natpfTennis.natpfUi.ritratti, L = R.last, s = R.sheets[side]; if (!s || !L) return null;
  const c = s.getContext('2d'), w = L.w, h = L.h, frame = k => c.getImageData(k*w, 0, w, h).data;
  const f0 = frame(0), f3 = frame(Math.floor(L.K/4)), bg = [f0[0], f0[1], f0[2]];
  let diff = 0, fill = 0;
  for (let i = 0; i < f0.length; i += 4){
    if (Math.abs(f0[i] - f3[i]) + Math.abs(f0[i + 1] - f3[i + 1]) + Math.abs(f0[i + 2] - f3[i + 2]) > 30) diff++;
    if (Math.abs(f0[i] - bg[0]) + Math.abs(f0[i + 1] - bg[1]) + Math.abs(f0[i + 2] - bg[2]) > 30) fill++;
  }
  return { diff: +(100*diff/(w*h)).toFixed(1), fill: +(100*fill/(w*h)).toFixed(1), png: s.toDataURL('image/png') };
}, side);
const counts = async (g, ms) => { const a = await g.evaluate(() => [__draws, __raf]); await sleep(ms); const b = await g.evaluate(() => [__draws, __raf]); return { draws: b[0] - a[0], fps: +((b[1] - a[1])/(ms/1000)).toFixed(1) }; };
const canvasState = g => g.evaluate(() => [...document.querySelectorAll('#victory-cards .card-art')].map(a => ({ side: a.dataset.portrait, canvas: !!a.querySelector('canvas.card-portrait:not(.hidden)'), svgHidden: !!a.querySelector('.card-svg.hidden'), k: a.querySelector('canvas.card-portrait')?.dataset.k ?? null })));

const ONLY = process.env.ONLY || 'ABC';
const B = await launch();
try {
  /* ---------- A. contro la CPU, Classici ---------- */
  if (ONLY.includes('A')) {
    const { p: g, errs } = await open(B, '&personaggi=sempre');
    const progs0 = await g.evaluate(() => __natpfTennis.renderer.info.programs?.length ?? null);
    check('A0. partita finita dal motore', await play(g) === 'MATCH_OVER');
    check('   schermata finale con la card', await shown(g) && await g.evaluate(() => document.getElementById('victory-modal').classList.contains('has-cards')));
    const t0 = Date.now(), info = await ready(g);
    console.log('   ritratti:', JSON.stringify(info), `pronti ${Date.now() - t0} ms dopo l'apertura della schermata`);
    check('A1. cattura pronta: 12 fotogrammi 256×320, foglio ≤ 8 MB', info?.ready && info.K === 12 && info.size?.[0] === 256 && info.size?.[1] === 320 && info.sheetBytes <= 8*1048576, JSON.stringify(info));
    check('A2. nessun programma shader nuovo durante la cattura (luci e nebbia dell\'arena)', info?.log?.programmi === 0, JSON.stringify(info?.log));
    check('   riga della diagnostica con i ms della cattura', info?.log?.esito === '3d' && info.log.ms > 0 && info.log.fotogrammi === 12 && info.log.px === '256x320', JSON.stringify(info?.log));
    const sc = await sheetCheck(g, 'player');
    if (sc?.png) writeFileSync(`${OUT}/foglio-cpu-player.png`, Buffer.from(sc.png.split(',')[1], 'base64'));
    check('A3. fotogrammi diversi tra loro (salto) e personaggio non vuoto (> 8 % della finestra)', sc && sc.diff > 1 && sc.fill > 8, JSON.stringify({ diff: sc?.diff, fill: sc?.fill }));
    await sleep(800);
    const cs1 = await canvasState(g); await sleep(400); const cs2 = await canvasState(g);
    check('A4. card con il canvas dei fotogrammi al posto del ritratto SVG, e i fotogrammi cambiano', cs1.length === 1 && cs1[0].canvas && cs1[0].svgHidden && cs1[0].k !== cs2[0].k, JSON.stringify([cs1, cs2]));
    const c1 = await counts(g, 3000);
    console.log('   card aperta:', JSON.stringify(c1), 'carico', (await import('node:os')).loadavg().map(x => x.toFixed(1)).join(' '));
    check('A5. card aperta: 0 disegni dell\'arena in 3 s', c1.draws === 0, JSON.stringify(c1));
    await g.screenshot({ path: `${OUT}/cpu-card-1280x720.png` });
    await g.setViewportSize({ width: 1024, height: 600 }); await sleep(1500);
    const c2 = await counts(g, 1500);
    const drawsAfterResize = await g.evaluate(() => __draws);
    check('A6. ridimensionamento: l\'arena si ridisegna una volta, poi di nuovo ferma', c2.draws === 0 && drawsAfterResize > 0, JSON.stringify({ c2 }));
    await g.screenshot({ path: `${OUT}/cpu-card-1024x600.png` });
    await g.setViewportSize({ width: 1280, height: 720 }); await sleep(800);
    // «Rivincita» (scelta del livello del B47): la schermata si chiude, l'arena torna a ogni fotogramma
    await g.click('#btn-play-again'); await sleep(600);
    const rem = await g.evaluate(() => ({ modal: document.getElementById('victory-modal').classList.contains('hidden'), rematch: !document.getElementById('natpf-rematch')?.classList.contains('hidden') }));
    const c3 = await counts(g, 2500);
    check('A7. «Rivincita»: schermata chiusa, l\'arena si disegna di nuovo', rem.modal && c3.draws > 0, JSON.stringify({ rem, c3 }));
    // «‹ Indietro»: la card torna (senza ripassare da showVictoryModal), ferma, con il ritratto che si muove
    await g.evaluate(() => __natpfTennis.natpfUi.rematch.cancel());
    await sleep(800);
    const back = await canvasState(g); await sleep(400); const back2 = await canvasState(g);
    const c4 = await counts(g, 2000);
    check('A8. «‹ Indietro»: card di nuovo, arena ferma, ritratto che si muove', !await g.evaluate(() => document.getElementById('victory-modal').classList.contains('hidden')) && c4.draws === 0 && back[0]?.canvas && back[0].k !== back2[0]?.k, JSON.stringify({ c4, back, back2 }));
    await g.click('#btn-return-title'); await sleep(600);
    const c5 = await counts(g, 2500);
    check('A9. «Menu»: l\'arena si disegna di nuovo (sfondo del menu fermo o partita)', await g.evaluate(() => document.getElementById('victory-modal').classList.contains('hidden')) && (c5.draws > 0 || await g.evaluate(() => !!__natpfTennis.natpfBackdrop)), JSON.stringify(c5));
    check('A10. nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));
    const progs1 = await g.evaluate(() => __natpfTennis.renderer.info.programs?.length ?? null);
    console.log('   programmi shader: prima', progs0, 'dopo', progs1);
    await g.context().close();
  }
  /* ---------- B. stesso schermo con Lob & Drop ---------- */
  if (ONLY.includes('B')) {
    const { p: g, errs } = await open(B, '&personaggi=lobdrop');
    await g.waitForFunction(() => __natpfTennis.player?.natpfMascot3dOn !== undefined, null, { timeout: 120000 }).catch(() => {});
    check('B0. stesso schermo, partita finita', await play(g, { split: true }) === 'MATCH_OVER' && await shown(g));
    const info = await ready(g);
    const looks = await g.evaluate(() => [...document.querySelectorAll('#victory-cards .end-card')].map(c => `${c.dataset.side}:${c.dataset.look}`));
    const mascots = await g.evaluate(() => [__natpfTennis.player.natpfMascot3dOn, __natpfTennis.opponent.natpfMascot3dOn]);
    check('B1. due card: Drop (Player 1) e Lob (Player 2), dai modelli 3D', looks.join(',') === 'player:drop,opponent:lob' && info?.ready && info.sheetBytes <= 8*1048576, JSON.stringify({ looks, info, mascots }));
    for (const side of ['player', 'opponent']){
      const sc = await sheetCheck(g, side);
      if (sc?.png) writeFileSync(`${OUT}/foglio-lobdrop-${side}.png`, Buffer.from(sc.png.split(',')[1], 'base64'));
      check(`B2. foglio di ${side === 'player' ? 'Drop' : 'Lob'}: fotogrammi diversi e non vuoti`, sc && sc.diff > 0.5 && sc.fill > 8, JSON.stringify({ diff: sc?.diff, fill: sc?.fill }));
    }
    await sleep(1000);
    await g.screenshot({ path: `${OUT}/split-lobdrop-1280x720.png` });
    const c = await counts(g, 3000);
    console.log('   stesso schermo, card aperte:', JSON.stringify(c));
    check('B3. card aperte: 0 disegni dell\'arena in 3 s', c.draws === 0, JSON.stringify(c));
    check('   nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));
    await g.context().close();
  }
  /* ---------- C. ripieghi: ?ritratti=svg, contesto WebGL perso ---------- */
  if (ONLY.includes('C')) {
    const { p: g, errs } = await open(B, '&ritratti=svg');
    check('C0. ?ritratti=svg: partita finita', await play(g) === 'MATCH_OVER' && await shown(g));
    await sleep(4000);
    const r = await g.evaluate(() => ({ info: __natpfTennis.natpfUi.ritratti.info(), svg: !!document.querySelector('#victory-cards .card-svg:not(.hidden) svg'), canvas: !!document.querySelector('#victory-cards canvas.card-portrait') }));
    check('C1. ?ritratti=svg: nessuna cattura, ritratto SVG nella card', r.info.mode === 'svg' && !r.info.ready && r.info.renders === 0 && r.svg && !r.canvas, JSON.stringify(r));
    check('   nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));
    await g.context().close();
  }
  if (ONLY.includes('C')) {
    // (contesto perso visto dai ritratti: isContextLost() vero. Una perdita vera del contesto fa scrivere a three.js un errore
    // di compilazione se il motore disegna prima dell'evento «webglcontextlost»: succede anche senza il B40)
    const { p: g, errs } = await open(B, '');
    await play(g);
    await g.evaluate(() => { const gl = __natpfTennis.renderer.getContext(); gl.isContextLost = () => true; });
    await shown(g); await sleep(5000);
    const r = await g.evaluate(() => ({ info: __natpfTennis.natpfUi.ritratti.info(), svg: !!document.querySelector('#victory-cards .card-svg:not(.hidden) svg') }));
    check('C2. contesto WebGL perso prima della cattura: ritratto SVG, nessun errore', !r.info.ready && r.info.log?.esito === 'svg' && r.svg && !errs.length, JSON.stringify({ r, errs: errs.slice(0, 3) }));
    await g.context().close();
  }
} finally {
  await B.close(); stop(); summary();
}
