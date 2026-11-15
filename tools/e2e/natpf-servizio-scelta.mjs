// NATPF B48 (miglioramento 10 del rapporto B16): un servizio con delle scelte, con il telefono simulato (pagina del
// telefono, collegamento PeerJS e motore veri, avviati come in natpf-servizio-lancio). Prova:
//   • lancio con un gesto del telefono e battuta con il gesto PRIMA del punto più alto: la palla va verso il centro (alla «T»);
//     DOPO il punto più alto: verso l'esterno (larga); nei due quadrati (parità e vantaggio). Il tempo del gesto lo misura
//     il gioco (natpfLastServe.tau, con il ritardo del collegamento tolto); il controllo è sulla regola: prima ≥ 0,1 s →
//     «T», dopo ≤ −0,1 s → largo (con il computer carico i gesti arrivano dove capita: si riprova fino a tre volte);
//   • ai primi servizi, sul grande schermo sotto «Colpisci!» la riga della regola (B48), e la stessa riga nella scheda
//     «Servizio» del tutorial, nella guida «Come si gioca» (scheda «Il servizio») e nel riquadro «Guarda e ripeti»
//     dell'esercizio «Servizio» dell'allenamento;
//   • schermate della scheda del servizio (tutorial) e di «Colpisci!» con la regola a 1920×1080, 1280×720 e 720×720.
// Porte GAME_PORT (di base 3197) e PEER_PORT (di base 9197). Schermate in OUT (di base la cartella temporanea).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-servizio-scelta.mjs
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, quickCalibrate } from './th.mjs';
import { GESTI, defaultPrep } from './prova.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9197), GAME_PORT = +(process.env.GAME_PORT || 3197);
const RULE = 'Prima del punto più alto: palla al centro · dopo: larga';
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
  if (GESTI){
    await phone.waitForFunction(() => __racchetta.state.step === 'still', null, { timeout: 5000 });
    await phone.evaluate(() => __up.still(1200));
    await quickCalibrate(phone, QUICK_PLAN);
    await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
    await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
    check('telefono calibrato', await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false));
  } else {
    const d = await defaultPrep(game, phone);
    check('telefono pronto senza gesti e scambi di prova giocati (calibrazione di base)', d.ready && d.trial.ended && ['full', 'ok'].includes(d.level), JSON.stringify(d));
  }
  // partita nuova contro la CPU, chi gioca al servizio (come dopo «Gioca» nel menu, senza il menu); giocatore nuovo: le
  // istruzioni dei primi servizi ci sono
  await game.evaluate(() => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.natpfUi.lobby.el.classList.add('hidden');
    E.autoPlayMode = false; E.userHasInteracted = true; E.matchConfig.difficulty = 'casual'; E._applyDifficultyTuning?.('casual');
    E.natpfUi.serveCoach?.newPlayer?.();
    E.startNewMatch({ showStartBanner: false }); E.score.server = 'player'; E._setupPointServe({ showBanner: false });
    window.__coach = () => { const el = document.getElementById('natpf-serve-coach'); return { shown: !!el && !el.classList.contains('hidden'), state: el?.dataset.state, big: el?.querySelector('[data-c="big"]')?.textContent || '', sub: el?.querySelector('[data-c="sub"]')?.textContent || '' }; };
  });
  const launchBall = () => phone.evaluate(() => __up.swing(1, { peak: 900, dur: 160 }));
  // un servizio: lancio, gesto quando la palla è a «at» secondi dal punto più alto (+ prima), poi il punto finisce
  // subito (si prova solo il servizio). Restituisce l'esito misurato dal gioco
  async function serve({ deuce, at, shots = false }){
    await game.evaluate(d => { const E = __natpfTennis; if (E.phase !== 'SERVE_STANCE'){ E.score.server = 'player'; } E.score.deuceSide = d; E.score.server = 'player'; E._setupPointServe({ showBanner: false }); }, deuce);
    await phone.waitForFunction(() => __racchetta.state.phase === 'serve', null, { timeout: 5000 });
    await launchBall();
    const tossed = await game.waitForFunction(() => __natpfTennis.phase === 'SERVE_TOSS', null, { timeout: 3000 }).then(() => true, () => false);
    if (!tossed) return { err: 'lancio non partito' };
    let coach = null;
    if (shots){
      coach = await game.waitForFunction(() => __coach().state === 'go', null, { timeout: 2000, polling: 16 }).then(() => game.evaluate(() => __coach()), () => null);
      // fermo il gioco su «Colpisci!» per le schermate alle tre misure, poi riparte dallo stesso istante
      if (coach){
        await game.evaluate(() => { const E = __natpfTennis; E.__upd = E.update; E.update = () => {}; });
        for (const [w, h] of [[1920, 1080], [1280, 720], [720, 720]]){
          await game.setViewportSize({ width: w, height: h }); await game.waitForTimeout(300);
          await game.evaluate(() => { __natpfTennis._onResize?.(); __natpfTennis.__render(); });
          const box = await game.evaluate(() => { const el = document.getElementById('natpf-serve-coach'), r = el.getBoundingClientRect(), s = el.querySelector('[data-c="sub"]').getBoundingClientRect(); return { inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, w: Math.round(r.width), h: Math.round(r.height), subH: Math.round(s.height), subFont: parseFloat(getComputedStyle(el.querySelector('[data-c="sub"]')).fontSize) }; });
          check(`${w}×${h}: «Colpisci!» con la regola sotto, dentro lo schermo, riga leggibile (≥ 12 px)`, box.inside && box.subFont >= 12, JSON.stringify(box));
          await game.screenshot({ path: `${SP}/servizio-scelta-colpisci-${w}x${h}.png` });
        }
        await game.setViewportSize({ width: 1280, height: 720 }); await game.waitForTimeout(300);
        await game.evaluate(() => { const E = __natpfTennis; E._onResize?.(); E.update = E.__upd; });
      }
    }
    await game.waitForFunction(at => __natpfTennis.ball.vel.y/9.15 <= at, at, { timeout: 3000, polling: 8 }).catch(() => {});
    await phone.evaluate(() => __up.swing(1, { peak: 900 }));
    const served = await game.waitForFunction(() => __natpfTennis.phase === 'RALLY' || __natpfTennis.phase === 'POINT_OVER', null, { timeout: 3000 }).then(() => true, () => false);
    const r = await game.evaluate(() => { const E = __natpfTennis, s = E.natpfLastServe; return { phase: E.phase, tau: s?.tau, aim: s?.aim, dir: s?.dir, x: s?.x, box: E.score.deuceSide ? -1 : 1 }; });
    // il punto finisce qui (la prova è solo sul servizio)
    await game.evaluate(() => { const E = __natpfTennis; if (E.phase === 'RALLY') E._awardPoint('player', 'Out'); });
    await game.waitForFunction(() => __natpfTennis.phase !== 'RALLY', null, { timeout: 2000 }).catch(() => {});
    return { ...r, served, coach };
  }
  // prima del punto più alto (gesto che parte 0,32 s prima: il picco del gesto arriva circa 0,12 s dopo, più il
  // collegamento) e dopo (gesto che parte 0,02 s dopo il punto più alto)
  const want = { prima: { at: .32, ok: r => r.tau >= .1 && r.dir === 'T', valid: r => r.tau >= .1 }, dopo: { at: -.03, ok: r => r.tau <= -.1 && r.dir === 'largo', valid: r => r.tau <= -.1 } };
  let first = true;
  for (const deuce of [true, false]) for (const [name, W] of Object.entries(want)){
    let got = null; const tries = [];
    for (let k = 0; k < 3 && !got; k++){
      const r = await serve({ deuce, at: W.at, shots: first });
      if (first && r.coach) check('ai primi servizi, sotto «Colpisci!», la riga della regola (telefono)', r.coach.big === 'Colpisci!' && r.coach.sub === RULE, JSON.stringify(r.coach));
      first = false;
      tries.push({ tau: r.tau, dir: r.dir, x: r.x, served: r.served });
      if (r.served && W.valid(r)) got = r;
    }
    const tag = `${deuce ? 'parità' : 'vantaggio'}, gesto ${name} del punto più alto`;
    check(`${tag}: ${name === 'prima' ? 'palla verso il centro («T»)' : 'palla larga'} nel quadrato giusto`, !!got && W.ok(got) && Math.sign(got.x) === got.box, JSON.stringify(tries));
  }
  // la stessa riga nella scheda «Servizio» del tutorial (Rivedi i gesti) e nella guida «Come si gioca»
  await game.evaluate(() => { const T = __natpfTennis.natpfUi.training.tutorial; T.openFor({ mode: 'review' }); T.go(4); });
  await game.waitForTimeout(400);
  for (const [w, h] of [[1920, 1080], [1280, 720], [720, 720]]){
    await game.setViewportSize({ width: w, height: h }); await game.waitForTimeout(450);
    const card = await game.evaluate(() => { const root = document.getElementById('natpf-tutorial'), cues = [...root.querySelectorAll('.tut-cues li')], last = cues.at(-1)?.getBoundingClientRect(), c = root.querySelector('.tut-card').getBoundingClientRect(); return { name: root.querySelector('.tut-name')?.textContent, cues: cues.map(li => li.textContent.trim()), lastInside: !!last && last.bottom <= c.bottom + 1 && last.right <= c.right + 1 && last.bottom <= innerHeight, lastH: last ? Math.round(last.height) : 0 }; });
    check(`${w}×${h}: scheda «Servizio» del tutorial con la riga della regola, dentro la scheda`, card.name === 'Servizio' && card.cues.includes(RULE) && card.lastInside, JSON.stringify(card));
    await game.screenshot({ path: `${SP}/servizio-scelta-tutorial-${w}x${h}.png` });
  }
  await game.setViewportSize({ width: 1280, height: 720 }); await game.waitForTimeout(300);
  await game.evaluate(() => __natpfTennis.natpfUi.training.tutorial.close('review'));
  const guide = await game.evaluate(() => { const O = __natpfTennis.natpfUi.onboarding; O.open(); O.setController?.('phone'); O.go(4); const el = document.getElementById('natpf-onboarding'); return el.textContent.replace(/\s+/g, ' '); });
  check('guida «Come si gioca», scheda «Il servizio»: prima del punto più alto al centro, dopo larga', /prima del punto più alto la palla va al centro, dopo va larga/i.test(guide), guide.slice(0, 300));
  await game.screenshot({ path: `${SP}/servizio-scelta-guida-1280x720.png` });
  // la stessa riga nel riquadro «Guarda e ripeti» dell'esercizio «Servizio» dell'allenamento (telefono collegato)
  await game.evaluate(() => { const U = __natpfTennis.natpfUi; U.onboarding?.close?.(); U.training.start({ guest: true, drills: [{ id: 'serve', label: 'Servizio', need: 1, demo: 'serve', hint: { phone: 'Alza il telefono per lanciare la palla, poi colpisci dall’alto quando è in cima' } }] }); });
  const cardShown = await game.waitForFunction(() => { const c = document.getElementById('coach-demo'); return c && !c.classList.contains('hidden') && document.querySelectorAll('#coach-demo-cues li').length >= 4; }, null, { timeout: 8000 }).then(() => true, () => false);
  for (const [w, h] of [[1920, 1080], [1280, 720], [720, 720]]){
    await game.setViewportSize({ width: w, height: h }); await game.waitForTimeout(450);
    const card = await game.evaluate(() => { const c = document.getElementById('coach-demo'), r = c?.getBoundingClientRect(), cues = [...document.querySelectorAll('#coach-demo-cues li')], last = cues.at(-1)?.getBoundingClientRect(); return { cues: cues.map(li => li.textContent.trim()), inside: !!r && !!last && last.bottom <= r.bottom + 1 && last.right <= r.right + 1 && r.bottom <= innerHeight && r.right <= innerWidth && r.left >= 0, lastH: last ? Math.round(last.height) : 0, card: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null }; });
    // (a 720×720 il riquadro piccolo mostra solo l'animazione, senza le righe, come per tutti i colpi: la regola c'è nella
    // lista ma non si vede; si vede nella scheda del tutorial, controllata sopra)
    const small = w <= 720;
    check(`${w}×${h}: esercizio «Servizio» dell'allenamento, ${small ? 'riquadro piccolo senza righe (come per gli altri colpi)' : 'la regola nel riquadro «Guarda e ripeti», dentro lo schermo'}`,
      cardShown && card.cues.includes(RULE) && card.inside && (small ? card.lastH === 0 : card.lastH > 0), JSON.stringify(card));
    await game.evaluate(() => __natpfTennis.__render());
    await game.screenshot({ path: `${SP}/servizio-scelta-allenamento-${w}x${h}.png` });
  }
  await game.setViewportSize({ width: 1280, height: 720 });
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
