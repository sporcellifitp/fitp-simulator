// NATPF motore base: i difetti segnalati la sera del 23/10, provati nel gioco vero (pagina del telefono, collegamento e
// motore veri, telefono simulato che fa i gesti):
//   A. dopo il servizio della CPU chi risponde non corre verso la rete: prende la palla da fondo campo (prima correva a
//      5–6 m dalla rete a ogni servizio); la CPU che ha servito torna al centro (Casual e Pro).
//   B. a fine punto il messaggio dice chi vince il punto (verde il proprio, rosa della CPU) e chi ha sbagliato, con il
//      punteggio dal proprio lato (prima: il punteggio con «Fuori» sotto, senza dire di chi).
//   C. la moviola (pausa → «Rivedi il punto») rimette in scena l'ultimo punto giocato: palla e giocatori dove erano,
//      al rallentatore, poi di nuovo al servizio (prima sempre la stessa scena a rete).
//   D. a Leggenda, palla corta della CPU ripresa a rete con il tempo perfetto: la palla passa la rete (prima, in corsa,
//      finiva in rete con il messaggio «Perfetto»); se è debole il messaggio dice perché.
//   E. a Leggenda, scambio lunghissimo: se la palla va in rete il messaggio dice «In rete», non «Perfetto».
// Porte 3183 (gioco) e 9183 (PeerJS).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-gameplay-23-10.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, quickCalibrate } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';
import { sampleAt } from '../../natpf-tennis/src/natpf/natpf_replay.js';

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
  await quickCalibrate(phone, QUICK_PLAN);   // aspetta da sé la fine del «fermo» e il «pronto» di ogni gesto
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
  await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
  check('telefono calibrato', await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false));

  // partita vera contro la CPU, livello DIFF
  await game.evaluate(diff => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    E._applyDifficultyTuning(diff); E.matchConfig.difficulty = diff; E.matchConfig.gamesToWin = 4; E.startNewMatch({ showStartBanner: false });
    E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
    window.__strikes = 0; window.__calls = [];
    // fine del punto: chi vince e perché (motore) e il messaggio a schermo, dal DOM
    const award = E._awardPoint.bind(E);
    E._awardPoint = (who, why) => { const r = award(who, why); const T = document.getElementById('center-banner-text'), S = document.getElementById('center-banner-sub');
      __calls.push({ who, why, text: T?.textContent, sub: S?.classList.contains('hidden') ? '' : S?.textContent, cls: T?.className, score: [E.score.playerPoints, E.score.opponentPoints, E.score.playerGames, E.score.opponentGames] }); return r; };
    const strike = E._attemptPlayerRallyStrike.bind(E);
    E._attemptPlayerRallyStrike = (e, t) => { const r = strike(e, t); if (r && !t) window.__strikes++; return r; };
  }, DIFF);
  // il robot: gesto circa 0,12 s prima del punto d'impatto del piano, dal lato del piano
  let lastPlan = null, idle = false;
  const robot = async () => {
    const s = await game.evaluate(() => { const E = __natpfTennis, P = E.natpfPlan; return { phase: E.phase, last: E.ball.lastHitter, left: P ? P.at + P.t - E.elapsedTime : null, at: P ? P.at : null, side: P ? P.side : 1 }; });
    if (!idle && s.phase === 'RALLY' && s.last === 'opponent' && s.left != null && s.at !== lastPlan && s.left < .16){ lastPlan = s.at; await phone.evaluate(sign => { __up.swing(sign).then(() => __up.still(300)); }, s.side >= 0 ? 1 : -1); }
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
  /* B. messaggio di fine punto: qualche punto in più, poi il confronto con chi ha vinto davvero */
  for (let k = 0; k < 10; k++){
    idle = k >= 8;   // gli ultimi due punti il robot non colpisce: punto della CPU
    await game.evaluate(k => { const E = __natpfTennis; E.score.server = k % 2 ? 'player' : 'opponent'; E.natpfPaused = false; E._setupPointServe({ showBanner: false }); window.__pt = __calls.length; }, k);
    const t0 = Date.now();
    while (Date.now() - t0 < 25000){
      const s = await robot();
      // al servizio di chi gioca: lancio e colpo dal motore (come il banco), qui conta la fine del punto
      await game.evaluate(() => { const E = __natpfTennis; if (E.score.server !== 'player') return;
        if (E.phase === 'SERVE_STANCE' && E.phaseTimer > .6) E._handleUserTossInput({});
        else if (E.phase === 'SERVE_TOSS' && E.ball.vel.y < 0 && E.ball.pos.y < 2.6) E._handleUserSwingInput({ source: 'test', speed: 1.2, dirX: 0 }); });
      if (await game.evaluate(() => __calls.length > __pt)) break;
      await game.waitForTimeout(10);
    }
    if (k === 0){ await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/fine-punto.png` }).catch(() => {}); }
  }
  const calls = await game.evaluate(() => __calls);
  const okCall = c => (c.who === 'player' ? c.text === 'Punto tuo' && /style-won/.test(c.cls) : c.text === 'Punto della CPU' && /style-lost/.test(c.cls))
    && (!/^(Out|Net)$/.test(c.why) || (c.who === 'player' ? /^Errore della CPU/.test(c.sub) : /^Errore tuo/.test(c.sub)));
  const points = calls.filter(c => c.text && !/^Game|^Partita/.test(c.text));
  check('B. fine del punto: in grande chi vince (verde il proprio, rosa della CPU), sotto chi ha sbagliato e il punteggio', points.length >= 4 && points.every(okCall) && points.some(c => c.who === 'player') && points.some(c => c.who === 'opponent'),
    `${points.length} punti: ` + calls.map(c => `${c.who}/${c.why} → «${c.text}» «${c.sub}»${okCall(c) || /^Game|^Partita/.test(c.text) ? '' : ' ✗'}`).join(' · ').slice(0, 1400));
  /* C. moviola dell'ultimo punto, dal menu della pausa */
  await game.waitForFunction(() => __natpfTennis.natpfReplay.available, null, { timeout: 5000 }).catch(() => {});
  const rec = await game.evaluate(() => { const L = __natpfTennis.natpfReplay.last; return L ? { n: L.frames.length, dur: L.end - L.start, frames: L.frames } : null; });
  await game.evaluate(() => { const U = __natpfTennis.natpfUi; U.pause.open(); });
  const shown = await game.evaluate(() => { const b = document.querySelector('[data-pause="replay"]'); return !!b && !b.classList.contains('hidden'); });
  await game.evaluate(() => document.querySelector('[data-pause="replay"]').click());
  const playing = await game.waitForFunction(() => __natpfTennis.phase === 'REPLAY' && __natpfTennis.natpfReplay.playing, null, { timeout: 3000 }).then(() => true, () => false);
  // durante la moviola: palla e giocatore sulla traiettoria registrata (al tempo della moviola)
  const samples = []; const tShot = Date.now();
  while (Date.now() - tShot < 60000){
    const s = await game.evaluate(() => { const E = __natpfTennis, R = E.natpfReplay; return R.playing ? { t: R.play.t, b: E.ball.pos.toArray(), p: [E.player.pos.x, E.player.pos.z], cam: E.cameraMode } : { done: true, phase: E.phase }; });
    if (s.done){ samples.push(s); break; }
    samples.push(s);
    if (samples.length === 6){ await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/moviola.png` }).catch(() => {}); }
    await game.waitForTimeout(120);
  }
  // stato registrato allo stesso istante del punto (interpolato), contro quello a schermo durante la moviola
  const near = s => { const f = sampleAt(rec.frames, s.t); return Math.hypot(f.b[0] - s.b[0], f.b[2] - s.b[2]) < .5 && Math.abs(f.a.player[1] - s.p[1]) < .5; };
  const during = samples.filter(s => !s.done), end = samples.at(-1);
  check('C. moviola: c\'è dopo un punto e rimette in scena l\'ultimo punto (palla e giocatore dove erano)', !!rec && shown && playing && during.length >= 5 && during.filter(near).length >= .8*during.length && during.every(s => s.cam === 'REPLAY_CAM'),
    JSON.stringify({ registrati: rec?.n, durata: rec && +rec.dur.toFixed(1), voce: shown, parte: playing, campioni: during.length, vicini: during.filter(near).length }));
  check('   al rallentatore, poi di nuovo al servizio', !!end?.done && end.phase === 'SERVE_STANCE' && during.length*.12 > (rec?.dur || 0)*.9, JSON.stringify({ fine: end, secondi: +(during.length*.12).toFixed(1) }));
  /* D–E. Leggenda: palle messe in gioco dalla CPU, il telefono simulato colpisce come il robot */
  await game.evaluate(() => { const E = __natpfTennis; E.natpfReplay.stop(); E._applyDifficultyTuning('leggenda'); E.matchConfig.difficulty = 'leggenda'; window.__shots = [];
    // esito di ogni colpo di chi gioca e messaggio a schermo, subito dopo il colpo
    const strike = E._attemptPlayerRallyStrike.bind(E);
    E._attemptPlayerRallyStrike = (e, t) => { const r = strike(e, t), L = E.natpfLastRacket;
      if (r && !t && L?.who === 'player') __shots.push({ grade: L.out.grade, weak: L.out.weak, failed: L.out.failed, pressured: L.out.pressured, net: L.out.netFault, cause: L.cause, z: +Math.abs(E.player.pos.z).toFixed(2),
        pop: document.getElementById('timing-popup-grade')?.textContent, detail: document.getElementById('timing-popup-detail')?.textContent, netFlag: !!E.ball.natpfNetFault, crossed: false, end: null });
      return r; }; });
  // palla della CPU da (−0,5, 1, −9) verso (x, z) con il volo dato; chi gioca parte da fondo campo; rally: colpi già giocati
  const stage = (o) => game.evaluate(({ x, z, flight, spin, rally, pz }) => { const E = __natpfTennis;
    E.natpfPaused = false; E.phase = 'RALLY'; E.phaseTimer = 0; E.hud.hideCenterBanner?.();
    E.player.pos.set(0, 0, pz); E.player.targetPos.set(0, 0, pz); E.player.vel?.set?.(0, 0, 0);
    Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: rally });
    E.ball.pos.set(-.5, 1, -9); E._launchBallToTarget(E.ball.pos.clone(), E.ball.pos.clone().set(x, 0, z), flight, { topspin: spin }); E._natpfPlanPlayer();
    window.__st = { n: __shots.length, calls: __calls.length }; }, o);
  // fino a quando la palla di chi gioca passa la rete o il punto finisce
  const follow = async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 9000){
      await robot();
      const done = await game.evaluate(() => { const E = __natpfTennis, S = __shots[__st.n];
        if (S && E.ball.lastHitter === 'player' && E.ball.pos.z < -.3) S.crossed = true;
        if (S && __calls.length > __st.calls) S.end = __calls[__st.calls];
        return !!S && (S.crossed || !!S.end) || (!S && E.phase !== 'RALLY'); });
      if (done) break;
      await game.waitForTimeout(10);
    }
    return game.evaluate(() => __shots[__st.n] || null);
  };
  idle = false;
  const drops = [];
  for (const [x, z] of [[0, 2.6], [-1.5, 3.2], [1.5, 3.2], [-2.6, 3.8], [2.6, 3.8], [0, 4.4], [-1, 2.4], [1, 4]]){ await stage({ x, z, flight: 1.3, spin: -3, rally: 5, pz: 11 }); drops.push(await follow()); }
  const perf = drops.filter(d => d?.grade === 'PERFECT' && d.z < 5);
  check('D. Leggenda, palla corta ripresa a rete con il tempo perfetto: passa la rete, mai «In rete»', perf.length >= 3 && perf.every(d => d.crossed && !d.net && !d.netFlag && d.pop === 'Perfetto' && !/Net/.test(d.end?.why || '')),
    drops.map(d => (d ? `${d.grade} a ${d.z} m: ${d.crossed ? 'passa' : 'non passa'}${d.weak ? ', debole' : ''} «${d.pop}» «${d.detail}»` : 'non presa')).join(' · '));
  check('   colpo debole: il messaggio dice perché', perf.filter(d => d.weak).every(d => /palla debole: /.test(d.detail)), perf.filter(d => d.weak).map(d => d.detail).join(' · ') || 'nessun colpo debole');
  // E. scambio al 40° colpo (pressione piena): palla bassa della CPU
  const tired = [];
  for (const [x, z] of [[.5, 7.5], [-.5, 7], [1, 8]]){ await stage({ x, z, flight: .95, spin: 12, rally: 40, pz: 11.5 }); tired.push(await follow()); }
  const failed = tired.filter(d => d?.failed);
  check('E. Leggenda, scambio lunghissimo: un colpo che va in rete dice «In rete» (e la palla lunga «Fuori»), non «Perfetto»', failed.length >= 1 && failed.every(d => (d.netFlag ? d.pop === 'In rete' : d.pop === 'Fuori') && d.pressured),
    tired.map(d => (d ? `${d.grade}${d.failed ? ' fallito' : ''}${d.pressured ? ' (pressione)' : ''}${d.netFlag ? ' in rete' : ''}: «${d.pop}» «${d.detail}» → ${d.end ? `${d.end.who}/${d.end.why} «${d.end.sub}»` : d.crossed ? 'passa' : '?'}` : 'non presa')).join(' · '));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
