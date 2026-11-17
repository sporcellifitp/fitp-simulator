// NATPF B63 · anteprima delle mascotte 3D con le animazioni nuove (natpf_card_moves.js): nello stesso schermo con Lob & Drop,
// la card di chi vince e di chi perde fotografate con ognuno dei sei movimenti (tre giri: vittoria a/b/c, sconfitta a/b/c),
// fogli PNG e WebP animati nella cartella OUT. Non è una verifica: serve all'utente per decidere (anteprima prima di
// pubblicare). Interruttore ?mascotte3d=1.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-mascotte-3d-anteprima.mjs     (OUT=cartella)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PORT = +(process.env.GAME_PORT || 3195), OUT = process.env.OUT || path.join(SP, 'mascotte-3d'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(`http://127.0.0.1:${PORT}/`, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) break; await sleep(500); }
const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${PORT}/?intro=0&personaggi=lobdrop&mascotte3d=1`, { w: 1280, h: 720 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model && window.__natpfTennis.opponent?.model, null, { timeout: 180000 });
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await g.waitForFunction(() => __natpfTennis.player?.natpfMascot3dOn !== undefined, null, { timeout: 120000 }).catch(() => {});
  // partita dello stesso schermo finita (come natpf-fine-partita-ritratti, parte B): vince il Player 1 (Drop)
  await g.evaluate(() => {
    const E = __natpfTennis, ui = E.natpfUi;
    ui.onboarding?.close?.(); E.hud.hideTitleModal?.(); ui.lobby.visible = false; E.hud.hideVictoryModal();
    ui.testInput = true; ui.selectController('mouse', { open: false });
    E.autoPlayMode = false; E.userHasInteracted = true;
    E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; E.startSplit();
    E.natpfFair = false; E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 1;
    for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++){ E.ball.rallyStrokeCount = 9; E._awardPoint('player', 'Out'); }
  });
  const ready = () => g.waitForFunction(() => { const r = __natpfTennis.natpfUi.ritratti.info(); return r.ready || r.state === 'svg' ? r : null; }, null, { timeout: 300000, polling: 500 }).then(h => h.jsonValue(), () => null);
  const res = [];
  for (const k of [0, 1, 2]){
    // movimento k di ciascun esito: niente «ultimo» salvato, Math.random sull'indice voluto
    await g.evaluate(k => { localStorage.removeItem('natpf-tennis.mosse3d'); const r = Math.random; window.__rnd = r; Math.random = () => (k + .5)/3; const R = __natpfTennis.natpfUi.ritratti; R.last = null; R.job = null; R.state = 'idle'; }, k);
    const info = await ready();
    await g.evaluate(() => { Math.random = window.__rnd; });
    const sheets = await g.evaluate(() => { const R = __natpfTennis.natpfUi.ritratti, L = R.last; return L?.items.map(it => ({ side: it.side, move: it.move, png: it.sheet.toDataURL('image/png') })) || []; });
    for (const s of sheets){ writeFileSync(`${OUT}/foglio-${s.move}-${s.side}.png`, Buffer.from(s.png.split(',')[1], 'base64')); res.push(`${s.side}:${s.move}`); }
    check(`giro ${k + 1}: due fogli pronti (${info?.K} fotogrammi, ${info?.size})`, info?.ready && sheets.length === 2 && sheets.every(s => s.move), JSON.stringify({ info: { K: info?.K, size: info?.size, bytes: info?.sheetBytes, log: info?.log }, mosse: sheets.map(s => s.move) }));
  }
  check('sei movimenti diversi', new Set(res.map(r => r.split(':')[1])).size === 6, res.join(' '));
  await g.screenshot({ path: `${OUT}/card-1280x720.png` });
  check('nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));
} finally { await B.close(); vite.kill(); summary(); }
