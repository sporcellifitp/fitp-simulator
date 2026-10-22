// NATPF motore base: scambio vero contro la CPU con il telefono simulato (pagina del telefono, collegamento e motore
// veri). Il robot fa partire il gesto quando la palla sta per arrivare al punto d'impatto (dal piano d'intercetto),
// dritto o rovescio dal lato del piano. Prova insieme le parti del colpo (fase C e D del 22/10 notte):
//   • ogni gesto colpisce la palla, il lato del colpo è quello del gesto;
//   • dopo ogni colpo dal fondo si torna in fondo (niente corsa a rete), e dopo una palla corta si torna indietro;
//   • l'esito è nel campo aperto (cadute in punti diversi) e la diagnostica lo vede (mira, punto neutro).
// SHOTS=1 salva i fotogrammi all'impatto e 0,7 s dopo (recupero). Porte 3151 (gioco) e 9151 (PeerJS).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-rally.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9151), GAME_PORT = +(process.env.GAME_PORT || 3151), DIFF = process.env.DIFF || 'pro';
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
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 16); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
};
const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // si disegna solo per i fotogrammi: con la grafica software la partita andrebbe al rallentatore
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
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
  // scambio vero: una palla della CPU verso chi gioca, poi il motore va avanti da solo (CPU compresa)
  await game.evaluate(diff => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    if (E.matchConfig) E.matchConfig.difficulty = diff;
    window.__log = []; window.__contact = 0;
    const strike = E._attemptPlayerRallyStrike.bind(E);
    E._attemptPlayerRallyStrike = (e, t) => {
      const r = strike(e, t);
      if (r && !t){ window.__contact++; const L = E.natpfLastRacket; __log.push({ pz: +E.player.pos.z.toFixed(2), gesto: e.side, lato: L?.contact ?? null, mano: L?.intent ? 'ok' : null, x: L?.out?.x, depth: L?.out?.depth, mira: L?.out?.aim, neutro: L?.out?.x0, target: +E.player.targetPos.z.toFixed(2), volee: !!L?.volley }); }
      return r;
    };
    E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false; E.player.pos.set(0, 0, 11.4); E.player.targetPos.copy(E.player.pos);
    Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1 });
    E.ball.pos.set(-.5, 1, -11); E._launchBallToTarget(E.ball.pos, new E.ball.pos.constructor(1.4, 0, 8.6), 1.05, { topspin: 14 }); E._natpfPlanPlayer();
    E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
  }, DIFF);
  await phone.waitForFunction(() => __racchetta.state.phase === 'play', null, { timeout: 5000 }).catch(() => {});
  const t0 = Date.now(); let lastPlan = null, shots = 0, after = [], gestures = 0, phaseEnd = null;
  while (Date.now() - t0 < 40000){
    const s = await game.evaluate(() => { const E = __natpfTennis, P = E.natpfPlan; return { phase: E.phase, last: E.ball.lastHitter, left: P ? P.at + P.t - E.elapsedTime : null, at: P ? P.at : null, side: P ? P.side : 1, contact: window.__contact }; });
    if (s.phase !== 'RALLY'){ phaseEnd = s.phase; break; }
    // gesto circa 0,12 s prima del punto d'impatto (picco a metà dei 240 ms); il lato dal piano: + destra = dritto
    if (s.last === 'opponent' && s.left != null && s.at !== lastPlan && s.left < .16){ lastPlan = s.at; gestures++; await phone.evaluate(sign => { __up.swing(sign).then(() => __up.still(300)); }, s.side >= 0 ? 1 : -1); }
    if (s.contact > shots){ shots = s.contact; if (process.env.SHOTS === '1' && shots <= 4){ await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/rally-impatto-${shots}.png` }); after.push({ n: shots, at: Date.now() + 700 }); } }
    for (const a of after.filter(a => Date.now() >= a.at)){ await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/rally-recupero-${a.n}.png` }); after = after.filter(x => x !== a); }
    if (shots >= 10) break;
    await game.waitForTimeout(10);
  }
  const log = await game.evaluate(() => __log);
  if (process.env.DEBUG) console.log(JSON.stringify(log));
  check('scambio vero contro la CPU: almeno 6 colpi di fila del telefono', log.length >= 6, `${log.length} colpi su ${gestures} gesti${phaseEnd ? `, fine dello scambio: ${phaseEnd}` : ''}`);
  check('il lato del colpo è quello del gesto (dritto o rovescio), con l’intenzione dalla forma', log.every(l => l.gesto === (l.lato > 0 ? 'forehand' : 'backhand') && l.mano === 'ok'), JSON.stringify(log.map(l => [l.gesto, l.lato])));
  // a rete si resta solo se una palla corta ha portato vicino alla rete (colpo da meno di 6 m) e non c'è il tempo di tornare
  check('dopo ogni colpo si torna in fondo, anche dopo le palle prese dentro il campo (niente corsa a rete)', log.every(l => l.target > 11 || l.pz < 6) && log.filter(l => l.pz > 9).every(l => l.target > 11), JSON.stringify(log.map(l => [l.pz, l.target])));
  const xs = log.map(l => Math.round(l.x)), depths = log.map(l => l.depth);
  check('campo aperto: cadute in punti diversi, mira e punto neutro dal modello', new Set(xs).size >= 3 && log.every(l => Number.isFinite(l.mira) && Number.isFinite(l.neutro)) && Math.max(...depths) - Math.min(...depths) > .3, JSON.stringify(log.map(l => [l.x, l.depth])));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
