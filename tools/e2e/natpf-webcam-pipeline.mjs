// NATPF motore base: catena della webcam nel browser con il modello delle mani vero (pacchetto locale) sulla webcam finta
// del browser (richiesta del 23/10, docs/NATPF_DIAGNOSI_2026-10-23.md §5):
//   • camera chiesta e ottenuta nel registro; richiami dei fotogrammi attivi; video del modello nella pagina;
//   • inferenza guidata dai fotogrammi della camera: misure al secondo (camera, inferenze, thread occupato);
//   • modello che si alleggerisce quando l'inferenza è lenta (qui la grafica è software: lo è), con il modello leggero
//     caricato dal pacchetto locale e l'inferenza che continua dopo il cambio;
//   • livello imposto (?webcamLivello=leggera): nessun cambio, per confrontare i livelli sullo stesso computer;
//   • nella webcam finta non c'è una mano: stato «persa», nessun colpo, partita in pausa con le istruzioni.
// I tempi qui (grafica software, nessuna GPU) non dicono nulla del portatile della prova: lì li misura il registro.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-webcam-pipeline.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { check, summary } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3171);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const B = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
async function open(query = ''){
  const ctx = await B.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage(), errs = [], models = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  p.on('request', q => { const u = q.url(); if (/mediapipe\/hands\/.*(tflite|\.data|wasm)/.test(u)) models.push({ file: u.split('/').pop(), local: u.startsWith(`http://127.0.0.1:${GAME_PORT}/`) }); });
  await p.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__natpfTennis?.motionController && window.__natpfTennis.natpfUi, null, { timeout: 120000 });
  await p.evaluate(() => {
    const E = __natpfTennis, mc = E.motionController; E.render = () => {};
    window.__wc = []; const prev = mc.onTrack; mc.onTrack = d => { prev?.(d); if (d.kind !== 'frame') __wc.push({ ...d, at: performance.now() }); };
    E.natpfUi.selectController('webcam', { open: false });
    return mc.enableWebcam();
  });
  await p.waitForFunction(() => __natpfTennis.motionController.mpHands, null, { timeout: 60000 });
  return { p, errs, models, ctx };
}
const events = (p, kind) => p.evaluate(k => __wc.filter(d => d.kind === k), kind);

try {
  // A. livello di partenza, cambi decisi dalla misura
  const A = await open();
  const cam = (await events(A.p, 'camera'))[0];
  const attached = await A.p.evaluate(() => __natpfTennis.motionController.videoElem.isConnected);
  check('camera chiesta e ottenuta nel registro, richiami dei fotogrammi, video del modello nella pagina', !!cam && cam.chiesto.fps === 30 && cam.ottenuto.w > 0 && cam.richiamiFotogrammi === true && attached, JSON.stringify({ cam, attached }));
  await A.p.waitForTimeout(13000);
  const rit = await events(A.p, 'ritmo'), car = await events(A.p, 'carico');
  const live = rit.filter(r => r.inferenze > 0);
  // durante il caricamento di un modello nuovo il thread è fermo: quel tratto può non avere fotogrammi
  check('misure al secondo: camera, inferenze, tempo dell\'inferenza, thread occupato', rit.length >= 7 && live.length >= 5 && live.filter(r => r.fps > 0).length >= .8*live.length && live.every(r => Number.isFinite(r.inferenzaP50) && Number.isFinite(r.caricoPercento)),
    JSON.stringify(rit.slice(-3).map(r => ({ fps: r.fps, inf: r.inferenze, p50: r.inferenzaP50, carico: r.caricoPercento, liv: r.livello }))));
  // fotogrammi della camera (presentati) e inferenze: mai più inferenze dei fotogrammi (solo l'ultimo, uno alla volta)
  check('inferenza guidata dai fotogrammi: al più una per fotogramma della camera', live.every(r => r.inferenzeAlSecondo <= r.fps + 1), JSON.stringify(live.map(r => [r.fps, r.inferenzeAlSecondo, r.persiDalBrowser])));
  const slow = live.slice(0, 3).some(r => r.inferenzaP50 > 16);
  const after = car.length ? rit.filter(r => r.at > car[0].at + 1500 && r.inferenze > 0) : [];
  check('inferenza lenta: il modello si alleggerisce (dal pacchetto locale) e l\'inferenza continua dopo il cambio',
    !slow || (car.length >= 2 && car[0].from === 'piena' && car[0].to === 'leggera' && car.some(c => c.applied && c.to === 'leggera') && after.length >= 1 && A.models.some(m => /lite/.test(m.file) && m.local)),
    JSON.stringify({ lenta: slow, cambi: car.map(c => `${c.from}→${c.to} ${c.applied ? 'caricato' : `deciso a ${c.p50} ms`}`), dopo: after.length, modelli: A.models.map(m => m.file) }));
  // B. nella webcam finta non c'è una mano: stato persa, nessun colpo; in partita la pausa con le istruzioni
  const st = await events(A.p, 'stato'), swings = await A.p.evaluate(() => __wc.filter(d => d.kind === 'event').length);
  check('nessuna mano nella webcam finta: stato «persa», nessun colpo', st.at(-1)?.to === 'persa' && swings === 0, JSON.stringify({ stati: st.map(s => s.to), colpi: swings }));
  await A.p.evaluate(() => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    E.startNewMatch?.({ showStartBanner: false }); E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false;
  });
  const paused = await A.p.waitForFunction(() => __natpfTennis.natpfUi.webcamHold?.why === 'mano persa' && __natpfTennis.natpfPaused, null, { timeout: 4000 }).then(() => true, () => false);
  const hold = await A.p.evaluate(() => document.getElementById('natpf-phone-hold')?.textContent || '');
  check('in partita senza mano: pausa con le istruzioni', paused && /Non vedo la mano/.test(hold), hold);
  check('nessun errore JavaScript (livello deciso dalla misura)', !A.errs.length, A.errs.join(' | ').slice(0, 400));
  await A.ctx.close();

  // C. livello imposto: nessun cambio, il modello leggero dall'inizio
  const C = await open('&webcamLivello=leggera');
  await C.p.waitForTimeout(6000);
  const camC = (await events(C.p, 'camera'))[0], carC = await events(C.p, 'carico'), ritC = (await events(C.p, 'ritmo')).filter(r => r.inferenze > 0);
  check('livello imposto (?webcamLivello=leggera): nessun cambio, misure con il livello', camC?.livello === 'leggera' && camC.fisso === true && carC.length === 0 && ritC.length >= 3 && ritC.every(r => r.livello === 'leggera'),
    JSON.stringify({ camC, cambi: carC.length, ritmi: ritC.length }));
  check('nessun errore JavaScript (livello imposto)', !C.errs.length, C.errs.join(' | ').slice(0, 400));
} finally {
  await B.close();
}
summary();
setTimeout(() => process.exit(), 300);
