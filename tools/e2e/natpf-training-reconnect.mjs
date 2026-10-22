// NATPF motore base: telefono che si scollega a metà calibrazione nel riscaldamento (pagina del telefono ricaricata,
// come quando il telefono si blocca o il browser la chiude). Il computer deve dirlo («Telefono scollegato», poi
// «tocca Attiva i sensori») invece di restare su «Ora», e appena il telefono torna la calibrazione riparte e arriva in
// fondo, con le palle dal lato giusto.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-training-reconnect.mjs
// Eventi devicemotion sintetici: non sostituiscono la prova con un telefono vero.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9111), GAME_PORT = +(process.env.GAME_PORT || 3111);
const SHOTS = process.env.SHOTS === '1';            // schermate del computer a ogni passo (lente con la grafica software)
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono in verticale (come natpf-phone-upright.mjs): gamma = rotazione attorno alla verticale (dritto/rovescio)
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  // la mano ferma tra un gesto e l'altro: il telefono vero manda campioni di continuo
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
};

const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await game.evaluate(() => { const E = __natpfTennis; E.render = () => {}; });
  await game.click('[data-menu="training"]');
  await game.click('[data-page="controller"] [data-natpf-controller="phone"]');
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { ctx, p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  await game.waitForFunction(() => __natpfTennis.natpfUi.training.active && __natpfTennis.natpfUi.training.cal, null, { timeout: 10000 });
  // primo gesto fatto, poi il telefono si scollega
  const coach = () => game.evaluate(() => ({ title: document.getElementById('coach-text').textContent, sub: document.getElementById('coach-sub').textContent, state: document.getElementById('coach-main').dataset.state, idx: __natpfTennis.natpfUi.training.view.idx }));
  await game.waitForFunction(() => document.getElementById('coach-main').dataset.state === 'go', null, { timeout: 10000 });
  await phone.evaluate(() => { window.__busy = true; return __up.swing(1).then(() => __up.back(1)).then(() => { window.__busy = false; }); });
  await game.waitForFunction(() => __natpfTennis.natpfUi.training.view.idx === 1, null, { timeout: 8000 });
  await phone.reload({ waitUntil: 'domcontentloaded' });
  const lost = await game.waitForFunction(() => /Telefono scollegato/.test(document.getElementById('coach-text').textContent) ? document.getElementById('coach-sub').textContent : null, null, { timeout: 15000, polling: 100 }).then(h => h.jsonValue(), () => null);
  check('telefono scollegato o senza sensori: il computer lo dice (non resta su «Ora»)', !!lost, JSON.stringify(await coach()));
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  const sensors = await game.waitForFunction(() => /Attiva i sensori/.test(document.getElementById('coach-sub').textContent), null, { timeout: 10000, polling: 100 }).then(() => true, () => false);
  check('telefono di nuovo collegato: il computer chiede di attivare i sensori', sensors, JSON.stringify(await coach()));
  await phone.click('#enable');
  // la calibrazione riparte dal primo gesto e arriva in fondo
  const asked = [];
  for (let i = 0; i < QUICK_PLAN.length; i++){
    const want = await game.waitForFunction(i => { const T = __natpfTennis.natpfUi.training; return T.cal && T.view.stage === 'gesture' && T.view.idx === i && document.getElementById('coach-main').dataset.state === 'go' ? T.view.want : null; }, i, { timeout: 15000, polling: 50 }).then(h => h.jsonValue(), () => null);
    if (!want) break;
    const ball = await game.evaluate(() => +__natpfTennis.ball.pos.x.toFixed(2));
    asked.push({ want, ball });
    const sign = want === 'R' ? -1 : 1;
    await phone.evaluate(s => { window.__busy = true; return __up.swing(s).then(() => __up.back(s)).then(() => { window.__busy = false; }); }, sign);
  }
  check('dopo il ritorno del telefono la calibrazione riparte e chiede tutti i gesti con la palla dal lato giusto', asked.length === QUICK_PLAN.length && asked.every(a => (a.want === 'L') === (a.ball > 0)), JSON.stringify(asked));
  const done = await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal; }, null, { timeout: 15000 }).then(() => true, () => false);
  check('calibrazione completata dopo la riconnessione', done);
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
