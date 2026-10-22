// NATPF motore base (natpf-tennis/): telefono simulato con la presa vera del gioco (verticale, «manico»), dal QR alla
// partita. Avvia da solo il server PeerJS locale e il gioco (vite) su porte di prova, apre la pagina del telefono dal
// link del QR, fa la calibrazione rapida e poi gioca dei colpi:
//   • dritti con il polso che prona durante il gesto (video del 19/10) → colpi normali, non pallonetti;
//   • un gesto dal basso verso l'alto con la mano che sale → pallonetto;
//   • il piatto girato a destra o a sinistra prima del colpo → palla a destra o a sinistra.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-phone-upright.mjs
// Prende il posto di natpf-flat-grip.mjs, che prova la presa orizzontale non più offerta dal gioco.
// Eventi devicemotion sintetici: non sostituiscono la prova con un telefono vero.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9108), GAME_PORT = +(process.env.GAME_PORT || 3108);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono in verticale, schermo verso di sé: la gravità lungo y. Rotazioni nel riferimento del telefono:
// gamma (y) = attorno al lato lungo, cioè alla verticale (dritto e rovescio); beta (x) = attorno al lato corto
// (dal basso verso l'alto); alpha (z) = attorno alla normale dello schermo (polso che prona).
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    turn(rate, ms){ return this.run(() => [0, 0, rate], ms); },
    // dritto/rovescio attorno alla verticale; wrist: rotazione del polso (alpha) nella seconda metà; push in avanti
    swing(sign, { peak = 750, dur = 240, wrist = 0 } = {}){ return this.run(u => ({ rot: [wrist*Math.sin(Math.PI*Math.max(0, u*1.4 - .2))**2, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
    // dal basso verso l'alto: rotazione attorno al lato corto e mano che sale
    lob(){ return this.run(u => ({ rot: [0, -650*Math.sin(Math.PI*u)**2, 150*Math.sin(Math.PI*u)**2], acc: [0, 9*Math.sin(2*Math.PI*u), -2*Math.sin(Math.PI*u)] }), 240); },
  };
};

const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 760 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi, null, { timeout: 120000 });
  await game.evaluate(() => { __natpfTennis.render = () => {}; });
  check('presa del gioco: verticale', await game.evaluate(() => __natpfTennis.natpfPhone.grip === 'upright'));
  await game.evaluate(() => { __natpfTennis.natpfUi.selectController('phone', { open: false }); return __natpfTennis.natpfPhone.start(); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  check('QR: link monouso per la pagina del telefono', /racchetta\.html/.test(url), url);

  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  check('il telefono si collega dal link del QR', true);
  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.sensor === 'cal' && __racchetta.state.step === 'still', null, { timeout: 5000 });
  await phone.evaluate(() => __up.still(2400));
  await phone.waitForFunction(() => __racchetta.state.step === 'swings', null, { timeout: 5000 });
  // i gesti nel verso che la calibrazione chiede (prima fermi: la calibrazione vuole la mano ferma prima di ogni gesto)
  for (let i = 0; i < QUICK_PLAN.length; i++){
    const want = await phone.evaluate(() => __racchetta.state.want ?? __racchetta.cal?.state?.want ?? null);
    const sign = want === 'R' || want === 'right' || want === -1 ? -1 : 1;
    await phone.evaluate(s => __up.still(500).then(() => __up.swing(s, { wrist: 0 })).then(() => __up.back(s)).then(() => __up.still(700)), i % 2 ? -sign : sign);
  }
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
  const review = await game.evaluate(() => __natpfTennis.natpfPhone.cal.review);
  check('calibrazione rapida con la presa verticale superata', !!review?.pass, JSON.stringify(review)?.slice(0, 300));
  await phone.waitForFunction(() => __racchetta.state.step === 'free', null, { timeout: 5000 }).catch(() => {});
  await phone.evaluate(() => __up.still(400).then(() => __up.swing(1)).then(() => __up.back(1)).then(() => __up.still(1200)));
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.freeOk, null, { timeout: 5000 }).catch(() => {});
  await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
  const ready = await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false);
  check('telefono pronto per giocare', ready);

  // partita ferma in uno scambio: ogni colpo del telefono colpisce una palla appena davanti al giocatore. Il motore non
  // avanza (update vuoto) ma il gioco non è in pausa: con la pausa i colpi ora vengono scartati, come per chi gioca
  await game.evaluate(() => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.update = () => {}; E.natpfPaused = false; E.autoPlayMode = false; E.userHasInteracted = true; E.phase = 'RALLY';
    // a partita ferma la palla resta in arrivo verso il giocatore (altrimenti il colpo è «palla che si allontana»)
    setInterval(() => { E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; E.ball.pos.set(.3, 1, 9); E.ball.vel.set(0, 0, 14); }, 30);
    E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
    window.__shots = [];
    const orig = E._handleUserSwingInput.bind(E);
    E._handleUserSwingInput = ev => {
      E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; E.player.swingCooldown = 0;
      E.player.pos.set(0, 0, 11.4); E.ball.pos.set(.3, 1, 11.1); E.ball.vel.set(0, 0, 14);
      orig(ev);
      __shots.push({ shot: ev.natpf?.shot, side: ev.side, wrist: ev.natpf?.wrist, why: ev.natpf?.why, landX: +E.ball.targetLanding.x.toFixed(2), hit: E.ball.lastHitter === 'player' });
    };
  });
  await phone.waitForFunction(() => __racchetta.state.phase === 'play', null, { timeout: 5000 }).catch(() => {});
  const play = async (fn, arg) => {
    const before = await game.evaluate(() => __shots.length);
    await phone.evaluate(fn, arg);
    await game.waitForFunction(n => __shots.length > n, before, { timeout: 5000 }).catch(() => {});
    return game.evaluate(n => __shots[n] || null, before);
  };
  if (process.env.DEBUG){
    await phone.evaluate(() => { window.__sw = []; __racchetta.det.on('swing', s => __sw.push({ dir: s.dir, peak: s.peak })); });
    await game.evaluate(() => { window.__evs = []; __natpfTennis.natpfPhone.swingListeners.add((ev, s) => __evs.push({ ignored: ev.ignored, shot: ev.natpf?.shot })); });
    await phone.evaluate(() => __up.still(500).then(() => __up.swing(1)).then(() => __up.back(1)).then(() => __up.still(900)));
    console.log('telefono', JSON.stringify(await phone.evaluate(() => __sw)), 'gioco', JSON.stringify(await game.evaluate(() => ({ evs: __evs, shots: __shots, menu: __natpfTennis.natpfUi.menuOpen, ready: __natpfTennis.natpfPhone.ready }))), 'fase tel', await phone.evaluate(() => __racchetta.state.phase + ' ' + __racchetta.state.step + ' ' + __racchetta.state.sensor));
  }
  const shots = [];
  for (const wrist of [0, 500, -500, 700, 0, 500]) shots.push(await play(w => __up.still(500).then(() => __up.swing(1, { wrist: w })).then(() => __up.back(1)).then(() => __up.still(900)), wrist));
  check('dritti con il polso che ruota: un colpo per gesto, mai pallonetto', shots.every(s => s && s.hit && s.shot !== 'lob' && s.shot !== 'slice'), JSON.stringify(shots.map(s => s && `${s.shot} ${s.why?.join(', ')}`)));
  const lob = await play(() => __up.still(500).then(() => __up.lob()).then(() => __up.still(1200)));
  check('dal basso verso l’alto con la mano che sale: pallonetto', lob?.shot === 'lob', JSON.stringify(lob));
  const aim = async deg => play(d => __up.still(300).then(() => __up.turn(d > 0 ? -60 : 60, Math.abs(d)/60*1000)).then(() => __up.still(250)).then(() => __up.swing(1)).then(() => __up.back(1)).then(() => __up.turn(d > 0 ? 60 : -60, Math.abs(d)/60*1000)).then(() => __up.still(900)), deg);
  const right = await aim(25), left = await aim(-25);
  check('piatto girato a destra o a sinistra prima del colpo: palla da quella parte', !!right && !!left && right.landX - left.landX > 1.5, JSON.stringify({ right, left }));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
