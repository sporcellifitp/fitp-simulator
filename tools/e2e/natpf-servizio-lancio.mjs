// NATPF B18 (miglioramento 2 dell'audit B16): istruzioni del primo servizio sul grande schermo, con il telefono simulato
// (pagina del telefono, collegamento e motore veri). Prova:
//   • al servizio lo schermo dice «Alza il telefono: lanci la palla» (prima solo «Al servizio»);
//   • lancio dal telefono (tocco sullo schermo) senza battuta: vicino al punto più alto «Colpisci!», poi la palla ricade
//     nella mano di chi serve (prima restava a mezz'aria) e lo schermo dice «Colpisci quando la palla è in alto»; il
//     telefono «Lancio a vuoto»;
//   • si rilancia e si batte con il gesto quando lo schermo dice «Colpisci!»: il servizio parte, le istruzioni spariscono.
// Schermate (OUT, predefinito la cartella temporanea) a 1280×720 e in una striscia da ledwall 1920×540.
// Porte 3157 (gioco) e 9157 (PeerJS).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-servizio-lancio.mjs
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, quickCalibrate } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9157), GAME_PORT = +(process.env.GAME_PORT || 3157);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 16 })); },
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
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  await game.evaluate(() => { __natpfTennis.natpfUi.selectController('phone', { open: false }); return __natpfTennis.natpfPhone.start(); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.step === 'still', null, { timeout: 5000 });
  await phone.evaluate(() => __up.still(1200));
  await quickCalibrate(phone, QUICK_PLAN);
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
  await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
  check('telefono calibrato', await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false));
  // partita nuova contro la CPU, chi gioca al servizio (come dopo «Gioca» nel menu, senza il menu)
  await game.evaluate(() => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.natpfUi.lobby.el.classList.add('hidden');
    E.autoPlayMode = false; E.userHasInteracted = true; E.matchConfig.difficulty = 'casual'; E._applyDifficultyTuning?.('casual');
    E.startNewMatch({ showStartBanner: false }); E.score.server = 'player'; E._setupPointServe({ showBanner: false });
    // messaggi al telefono (per il resoconto se il telefono non mostra l'avviso)
    window.__sent = []; const L = E.natpfPhone.link, send = L.send.bind(L); L.send = m => { __sent.push(m); return send(m); };
    window.__coach = () => { const el = document.getElementById('natpf-serve-coach'); return { shown: !!el && !el.classList.contains('hidden'), state: el?.dataset.state, big: el?.querySelector('[data-c="big"]')?.textContent || '', sub: el?.querySelector('[data-c="sub"]')?.textContent || '' }; };
  });
  const coach = () => game.evaluate(() => __coach());
  await game.waitForTimeout(400);
  const c0 = await coach();
  check('al servizio: «Alza il telefono: lanci la palla» sul grande schermo', c0.shown && c0.big === 'Alza il telefono: lanci la palla', JSON.stringify(c0));
  await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/servizio-1-lancio.png` });
  // lancio dal telefono (tocco sullo schermo), senza battuta
  const tap = () => phone.evaluate(() => document.getElementById('stage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  // scritte grandi del telefono, in ordine (per vedere l'avviso anche se dura poco)
  await phone.evaluate(() => { window.__bigs = []; const b = document.getElementById('big'); new MutationObserver(() => __bigs.push(b.textContent)).observe(b, { childList: true, characterData: true, subtree: true }); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.lastPhase === 'serve', null, { timeout: 3000 }).catch(() => {});
  await tap();
  check('lancio dal telefono', await game.waitForFunction(() => __natpfTennis.phase === 'SERVE_TOSS', null, { timeout: 3000 }).then(() => true, () => false));
  const go = await game.waitForFunction(() => __coach().state === 'go', null, { timeout: 2000, polling: 16 }).then(() => game.evaluate(() => ({ ...__coach(), y: +__natpfTennis.ball.pos.y.toFixed(2), vy: +__natpfTennis.ball.vel.y.toFixed(2) })), () => null);
  check('vicino al punto più alto: «Colpisci!»', !!go && go.big === 'Colpisci!' && go.y > 2.3, JSON.stringify(go));
  if (go){ await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/servizio-2-colpisci.png` }); }
  const fell = await game.waitForFunction(() => __natpfTennis.phase === 'SERVE_STANCE', null, { timeout: 4000 }).then(() => true, () => false);
  const after = await game.evaluate(() => { const E = __natpfTennis; return { y: +E.ball.pos.y.toFixed(2), dx: +(E.ball.pos.x - E.player.pos.x).toFixed(2), v: E.ball.vel.length() }; });
  check('lancio a vuoto: la palla ricade nella mano di chi serve, ferma', fell && after.y === 1.12 && after.dx === -0.28 && after.v === 0, JSON.stringify(after));
  await game.waitForTimeout(150);
  const c1 = await coach();
  check('lancio a vuoto: «Colpisci quando la palla è in alto» sul grande schermo', c1.shown && c1.state === 'miss' && c1.big === 'Colpisci quando la palla è in alto', JSON.stringify(c1));
  await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/servizio-3-lancio-a-vuoto.png` });
  const ph = await phone.waitForFunction(() => __bigs.includes('Lancio a vuoto'), null, { timeout: 2000 }).then(() => true, () => false);
  check('lancio a vuoto: il telefono dice «Lancio a vuoto»', ph, JSON.stringify({ telefono: await phone.evaluate(() => __bigs.slice(-6)), mandati: ph ? undefined : await game.evaluate(() => (window.__sent || []).filter(m => m.t === 'ev')) }));
  await phone.screenshot({ path: `${SP}/servizio-telefono-lancio-a-vuoto.png` });
  // striscia da ledwall (molto larga e bassa): la scritta resta leggibile (misure in cqh)
  await game.setViewportSize({ width: 1920, height: 540 }); await game.waitForTimeout(300);
  const led = await game.evaluate(() => { const el = document.getElementById('natpf-serve-coach'), r = el.getBoundingClientRect(), b = el.querySelector('b'); return { top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), font: parseFloat(getComputedStyle(b).fontSize), inside: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  check('ledwall 1920×540: scritta dentro lo schermo e grande (≥ 24 px)', led.inside && led.font >= 24, JSON.stringify(led));
  await game.evaluate(() => { __natpfTennis._onResize?.(); __natpfTennis.__render(); }); await game.screenshot({ path: `${SP}/servizio-4-ledwall.png` });
  await game.setViewportSize({ width: 1280, height: 720 }); await game.waitForTimeout(200);
  // si rilancia e si batte quando lo schermo dice «Colpisci!»: il servizio parte
  await game.waitForTimeout(500);
  await tap();
  check('si rilancia', await game.waitForFunction(() => __natpfTennis.phase === 'SERVE_TOSS', null, { timeout: 3000 }).then(() => true, () => false));
  await game.waitForFunction(() => __coach().state === 'go', null, { timeout: 2000, polling: 16 }).catch(() => {});
  await phone.evaluate(() => __up.swing(1, { peak: 900 }));
  const served = await game.waitForFunction(() => __natpfTennis.phase === 'RALLY' || __natpfTennis.phase === 'POINT_OVER', null, { timeout: 3000 }).then(() => true, () => false);
  const c2 = await coach();
  check('battuta con il gesto: il servizio parte e le istruzioni spariscono', served && !c2.shown, JSON.stringify({ phase: await game.evaluate(() => __natpfTennis.phase), coach: c2 }));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
