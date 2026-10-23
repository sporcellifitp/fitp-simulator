// NATPF motore base: i difetti segnalati la sera del 23/10, provati nel gioco vero (pagina del telefono, collegamento e
// motore veri, telefono simulato che fa i gesti):
//   A. dopo il servizio della CPU chi risponde non corre verso la rete: prende la palla da fondo campo (prima correva a
//      5–6 m dalla rete a ogni servizio); la CPU che ha servito torna al centro (Casual e Pro).
// Porte 3183 (gioco) e 9183 (PeerJS).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-gameplay-23-10.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9183), GAME_PORT = +(process.env.GAME_PORT || 3183), DIFF = process.env.DIFF || 'pro';
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono simulato con i sensori continui, come in natpf-rally.mjs
const PHONE_INIT = () => {
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: acc[1] + 9.81, z: acc[2] }, interval: 16 })); },
    run(fn, ms){ window.__busy = (window.__busy || 0) + 1; return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); window.__busy--; r(); } }, 16); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy && window.__moved) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  window.addEventListener('devicemotion', () => { window.__moved = true; }, { once: true });
};
const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });   // grafica software lenta
  await game.evaluate(() => { __natpfTennis.natpfUi.selectController('phone', { open: false }); return __natpfTennis.natpfPhone.start(); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.step === 'still', null, { timeout: 5000 });
  await phone.evaluate(() => __up.still(1200));
  await phone.waitForFunction(() => __racchetta.state.step === 'swings', null, { timeout: 5000 });
  for (let i = 0; i < QUICK_PLAN.length; i++){ const s = i % 2 ? -1 : 1; await phone.evaluate(s => __up.still(500).then(() => __up.swing(s)).then(() => __up.back(s)).then(() => __up.still(700)), s); }
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
  await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
  check('telefono calibrato', await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false));

  // partita vera contro la CPU, livello DIFF
  await game.evaluate(diff => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    E._applyDifficultyTuning(diff); E.matchConfig.difficulty = diff; E.startNewMatch({ showStartBanner: false });
    E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
    window.__strikes = 0;
    const strike = E._attemptPlayerRallyStrike.bind(E);
    E._attemptPlayerRallyStrike = (e, t) => { const r = strike(e, t); if (r && !t) window.__strikes++; return r; };
  }, DIFF);
  // il robot: gesto circa 0,12 s prima del punto d'impatto del piano, dal lato del piano
  let lastPlan = null;
  const robot = async () => {
    const s = await game.evaluate(() => { const E = __natpfTennis, P = E.natpfPlan; return { phase: E.phase, last: E.ball.lastHitter, left: P ? P.at + P.t - E.elapsedTime : null, at: P ? P.at : null, side: P ? P.side : 1 }; });
    if (s.phase === 'RALLY' && s.last === 'opponent' && s.left != null && s.at !== lastPlan && s.left < .16){ lastPlan = s.at; await phone.evaluate(sign => { __up.swing(sign).then(() => __up.still(300)); }, s.side >= 0 ? 1 : -1); }
    return s;
  };

  /* A. servizio della CPU: chi risponde resta in fondo */
  const serves = [];
  for (let k = 0; k < 4; k++){
    await game.evaluate(() => { const E = __natpfTennis; E.score.server = 'opponent'; E.natpfPaused = false; E._setupPointServe({ showBanner: false }); window.__srv = { z0: E.player.pos.z, minZ: E.player.pos.z, cpuX0: E.opponent.pos.x, cpuX: null, contactZ: null, served: false, n: window.__strikes }; });
    const t0 = Date.now();
    while (Date.now() - t0 < 15000){
      await robot();
      const done = await game.evaluate(() => {
        const E = __natpfTennis, S = window.__srv;
        if (E.phase === 'RALLY' && E.ball.lastHitter === 'opponent' && E.ball.rallyStrokeCount === 1){ S.served = true; S.minZ = Math.min(S.minZ, E.player.pos.z); S.cpuX = E.opponent.targetPos.x; }
        if (S.served && window.__strikes > S.n && S.contactZ == null) S.contactZ = E.player.pos.z;
        return S.served && (S.contactZ != null || E.phase !== 'RALLY');
      });
      if (done) break;
      await game.waitForTimeout(10);
    }
    serves.push(await game.evaluate(() => window.__srv));
  }
  const fmt = v => (v == null ? '–' : (+v).toFixed(1));
  check(`A. servizio della CPU (${DIFF}): chi risponde non corre verso la rete, colpisce da fondo campo`, serves.length === 4 && serves.every(s => s.served && s.z0 - s.minZ < 1.5) && serves.filter(s => s.contactZ != null).length >= 3 && serves.every(s => s.contactZ == null || s.contactZ > 9.5),
    serves.map(s => `da ${fmt(s.z0)} al più a ${fmt(s.minZ)}, colpo a ${fmt(s.contactZ)}`).join(' · '));
  // (a Leggenda la posizione della CPU la decide il suo modello, natpf_legend.js)
  if (DIFF !== 'leggenda') check('   la CPU che ha servito torna al centro', serves.every(s => s.cpuX != null && Math.abs(s.cpuX) < .05), serves.map(s => `${fmt(s.cpuX0)} → ${fmt(s.cpuX)}`).join(' · '));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
