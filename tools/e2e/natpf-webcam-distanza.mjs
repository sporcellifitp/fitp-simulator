// Webcam da 1 a 4 m (30/10, natpf-tennis/src/natpf/webcam_roi.js) nel browser vero, con il modello delle mani vero
// (pacchetto locale) sulla webcam finta di Chromium:
//   • webcam per uno («argon»): camera portata a 1280×720 (primo registro «camera»); al modello il video
//     intero o un ritaglio copiato in un canvas fino a 640 di larghezza; senza mano la ricerca alterna l'immagine intera
//     e il ritaglio al centro; il modello risponde a tutte e due, senza errori;
//   • webcam per due: camera al campo più largo, al modello il video intero (nessun ritaglio), risposte senza errori.
// Nella webcam finta non c'è una mano: qui si prova la catena (camera, canvas, modello), non il riconoscimento.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-webcam-distanza.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { check, summary } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3172);
// La prova della webcam non dipende dalla disponibilità del server PeerJS pubblico.
const PEER_PORT = +(process.env.PEER_PORT || 9172);
const peerApp = express(), peerServer = http.createServer(peerApp);
peerApp.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
// DIST=cartella permette di provare anche il pacchetto Cloudflare estratto, senza Vite né sorgenti.
let vite = null, staticServer = null;
if (process.env.DIST){
  const site = express();
  site.use('/api', (req, res) => res.status(404).send('sito statico'));
  site.use(express.static(path.resolve(process.env.DIST)));
  staticServer = await new Promise(r => { const s = site.listen(GAME_PORT, '127.0.0.1', () => r(s)); });
} else {
  vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
}
process.on('exit', () => { try { vite?.kill(); staticServer?.close(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check(process.env.DIST ? 'pacchetto statico avviato' : 'gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const B = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream=fps=30', '--use-fake-ui-for-media-stream'] });
try {
  const ctx = await B.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__natpfTennis?.motionController && window.__natpfTennis.natpfUi, null, { timeout: 120000 });
  await p.evaluate(() => {
    const E = __natpfTennis, mc = E.motionController; E.render = () => {};
    window.__wc = []; const prev = mc.onTrack; mc.onTrack = d => { prev?.(d); if (d.kind !== 'frame') __wc.push({ ...d }); };
    E.natpfUi.selectController('webcam', { open: false });
    return mc.enableWebcam();
  });
  await p.waitForFunction(() => __natpfTennis.motionController.mpHands, null, { timeout: 90000 });
  // ogni immagine data al modello e ogni risposta
  await p.evaluate(() => {
    const mc = __natpfTennis.motionController, m = mc.mpHands, send = m.send.bind(m), onRes = mc._onArgonHandResults.bind(mc);
    window.__sent = []; window.__res = 0;
    m.send = a => { const im = a.image; __sent.push({ tag: im.tagName, w: im.width || im.videoWidth, h: im.height || im.videoHeight, roi: mc._mpRoi ? +mc._mpRoi.w.toFixed(2) : null }); return send(a); };
    mc._onArgonHandResults = r => { __res++; return onRes(r); };
  });
  await p.waitForTimeout(6000);
  const one = await p.evaluate(() => {
    const mc = __natpfTennis.motionController, v = mc.videoElem;
    return { cams: __wc.filter(d => d.kind === 'camera'), video: [v.videoWidth, v.videoHeight], sent: __sent, res: __res, mode: mc.webcamMode };
  });
  const cam = one.cams[0];
  check('webcam per uno: camera a 1280×720, chiesta e ottenuta nel primo registro «camera»', one.mode === 'argon' && !!cam && cam.chiesto.w === 1280 && cam.ottenuto.w === 1280 && cam.richiamiFotogrammi === true && one.video[0] === 1280, JSON.stringify({ cams: one.cams, video: one.video }));
  check('al modello il video intero o un ritaglio dal canvas fino a 640 di larghezza', one.sent.length > 10 && one.sent.every(s => (s.tag === 'VIDEO' && s.roi === 1) || (s.tag === 'CANVAS' && s.roi < 1 && s.w <= 640)), JSON.stringify(one.sent.slice(0, 4)));
  const crops = one.sent.filter(s => s.roi < 1), fulls = one.sent.filter(s => s.roi === 1);
  check('senza mano: ricerca con immagine intera e ritaglio al centro, alternati', crops.length >= .3*one.sent.length && fulls.length >= .3*one.sent.length, `ritagli ${crops.length}, intere ${fulls.length}`);
  check('il modello risponde alle immagini date (intere e ritagli)', one.res >= .8*one.sent.length, `${one.res} risposte, ${one.sent.length} invii`);

  // webcam per due: campo più largo, video intero al modello
  await p.evaluate(() => { __sent.length = 0; __natpfTennis.motionController.setWebcamDuo(true); });
  await p.waitForTimeout(5000);
  const duo = await p.evaluate(() => ({ sent: __sent.slice(), res: __res, cams: __wc.filter(d => d.kind === 'camera' && d.livello === 'per due') }));
  check('webcam per due: video intero al modello, nessun ritaglio (qui la grafica è software: poche inferenze a 1080p)', duo.sent.length >= 2 && duo.sent.every(s => s.tag === 'VIDEO' && s.roi === 1), JSON.stringify(duo.sent.slice(0, 3)));
  check('nessun errore in pagina', errs.length === 0, errs.slice(0, 5).join(' | '));
  await ctx.close();
} finally {
  await B.close();
  peerServer.close();
  vite?.kill();
  staticServer?.close();
}
summary();
setTimeout(() => process.exit(), 300);
