// NATPF motore base (natpf-tennis/): telefono simulato in landscape con la presa orizzontale «il telefono è il piatto».
// Avvia da solo il server PeerJS locale e il gioco (vite) su porte di prova, collega il telefono con il QR,
// fa la calibrazione breve (2 s fermi + 4 gesti) e verifica che il piatto girato a destra/sinistra mandi la palla
// a destra/sinistra, che il telefono funzioni in landscape e che la racchetta in gioco segua il piatto.
//   cd tools/e2e && CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" node natpf-flat-grip.mjs
// Eventi devicemotion sintetici: non sostituiscono la prova con un telefono vero.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9107), GAME_PORT = +(process.env.GAME_PORT || 3107);
if (!process.env.CHROMIUM_PATH && process.platform === 'win32') process.env.CHROMIUM_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ try { const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; } catch {} await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono: eventi devicemotion sintetici con la gravità lungo il lato corto (orizzontale, display verso di sé)
const PHONE_INIT = () => {
  const G = 9.81;
  window.__flat = {
    emit(rot){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: 0, y: 0, z: 0 }, accelerationIncludingGravity: { x: G, y: 0, z: 0 }, interval: 10 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; this.emit(fn(Math.min(1, u))); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    // rotazione lenta attorno alla verticale (beta): gira il piatto senza fare un colpo
    turn(rate, ms){ return this.run(() => [0, rate, 0], ms); },
    // gesto a campana attorno alla verticale: sign +1 / −1 = da una parte o dall'altra
    swing(sign, peak = 700, dur = 220){ return this.run(u => [0, sign*peak*Math.sin(Math.PI*u)**2, 0], dur); },
    // ritorno lento in posizione «pronto» dopo il gesto (sotto la soglia di un colpo): il gesto ruota di peak·dur/2
    back(sign, peak = 700, dur = 220){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, -sign*rate, 0], deg/rate*1000); },
  };
};

const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 760 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi, null, { timeout: 120000 });
  // il campo non serve a questa prova: senza il disegno (WebGL software) i timer del telefono simulato restano regolari
  await game.evaluate(() => { __natpfTennis.render = () => {}; });
  check('presa predefinita nel gioco: orizzontale · piatto', await game.evaluate(() => __natpfTennis.natpfPhone.grip === 'flat'));
  await game.evaluate(() => { __natpfTennis.natpfUi.selectController('phone', { open: false }); return __natpfTennis.natpfPhone.start(); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const lobbyGrip = await game.evaluate(() => [...document.querySelectorAll('#lobby-grip-choice [data-natpf-grip]')].map(b => `${b.dataset.natpfGrip}:${b.classList.contains('selected')}`).join(','));
  check('lobby, passo Racchetta: scelta della presa accanto alla tessera Smartphone', lobbyGrip === 'flat:true,upright:false', lobbyGrip);
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);

  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 844, h: 390, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.waitForFunction(() => __racchetta.state.grip === 'flat', null, { timeout: 5000 });
  check('il telefono riceve la presa dal gioco', true);
  const land = await phone.evaluate(() => ({ landscape: matchMedia('(orientation: landscape)').matches, rotateHidden: document.querySelector('#rotate').classList.contains('hidden'), cls: document.body.className }));
  check('in landscape con la presa orizzontale la pagina non si blocca', land.landscape && land.rotateHidden && /flat/.test(land.cls) && /land/.test(land.cls), JSON.stringify(land));

  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.sensor === 'cal' && __racchetta.state.step === 'still', null, { timeout: 5000 });
  await phone.evaluate(() => __flat.still(1500));
  check('calibrazione: dopo 1,5 s si è ancora nella posa «pronto»', await phone.evaluate(() => __racchetta.state.step === 'still'));
  await phone.evaluate(() => __flat.still(800));
  check('calibrazione: 2 s fermi bastano', await phone.evaluate(() => __racchetta.state.step === 'swings'));
  await phone.screenshot({ path: path.join(SP, 'natpf-flat-cal.png') });
  for (const sign of [1, -1, 1, -1]) await phone.evaluate(s => __flat.swing(s).then(() => __flat.back(s)).then(() => __flat.still(600)), sign);
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
  const review = await game.evaluate(() => __natpfTennis.natpfPhone.cal.review);
  check('calibrazione con quattro gesti superata', !!review?.pass, JSON.stringify(review));
  await phone.waitForFunction(() => __racchetta.state.step === 'free', null, { timeout: 5000 });
  await phone.evaluate(() => __flat.swing(1).then(() => __flat.back(1)).then(() => __flat.still(1200)));
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.freeOk, null, { timeout: 5000 });
  await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
  await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 });
  const profile = await phone.evaluate(() => __racchetta.det.profile);
  check('profilo con presa orizzontale e piatto abituale per i due versi', profile.grip === 'flat' && !!profile.faceRef?.[1] && !!profile.faceRef?.[-1], JSON.stringify(profile.faceRef));

  // partita ferma in uno scambio: ogni colpo del telefono colpisce una palla appena davanti al giocatore
  await game.evaluate(() => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.natpfPaused = true; E.autoPlayMode = false; E.userHasInteracted = true; E.phase = 'RALLY';
    E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
    window.__shots = [];
    const orig = E._handleUserSwingInput.bind(E);
    E._handleUserSwingInput = ev => {
      E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; E.player.swingCooldown = 0;
      E.player.pos.set(0, 0, 11.4); E.ball.pos.set(.3, 1, 11.1); E.ball.vel.set(0, 0, 14);
      orig(ev);
      __shots.push({ dirX: +ev.dirX.toFixed(2), aim: ev.natpf?.aim, yaw: ev.natpf?.face?.yaw, shot: ev.shotType, landX: +E.ball.targetLanding.x.toFixed(2), hit: E.ball.lastHitter === 'player' });
    };
  });
  await phone.waitForFunction(() => __racchetta.state.phase === 'play', null, { timeout: 5000 });
  await phone.evaluate(() => { window.__sw = []; __racchetta.det.on('swing', s => __sw.push({ dir: s.dir, peak: s.peak, angle: s.angle, t: Math.round(s.peakT) })); __racchetta.det.on('phase', p => __sw.push({ phase: p, t: Math.round(performance.now()) })); });
  const shoot = async (turn, sign) => {
    const before = await game.evaluate(() => __shots.length);
    await phone.evaluate(([r, s]) => __flat.turn(r, 300).then(() => __flat.swing(s)).then(() => __flat.back(s)).then(() => __flat.turn(-r, 300)).then(() => __flat.still(1200)), [turn, sign]);
    await game.waitForFunction(n => __shots.length > n, before, { timeout: 5000 }).catch(() => {});
    const shot = await game.evaluate(n => __shots[n] || null, before);
    if (!shot && process.env.DEBUG) console.log('telefono:', JSON.stringify(await phone.evaluate(() => __sw.splice(0))));
    return shot;
  };
  // beta < 0 gira il piatto verso destra, beta > 0 verso sinistra (vedi face-tracker.js)
  const right1 = await shoot(-60, 1), left1 = await shoot(60, 1), right2 = await shoot(-60, -1), left2 = await shoot(60, -1);
  for (const [name, s, sign] of [['destra, gesto da un lato', right1, 1], ['sinistra, gesto da un lato', left1, -1], ['destra, gesto dall’altro lato', right2, 1], ['sinistra, gesto dall’altro lato', left2, -1]])
    check(`piatto girato a ${name} → palla a ${sign > 0 ? 'destra' : 'sinistra'}`, !!s && s.hit && s.aim === 'face' && s.dirX*sign > .35 && s.landX*sign > 1, JSON.stringify(s));

  // la racchetta in gioco segue il piatto del telefono
  await phone.evaluate(() => __flat.turn(-60, 400).then(() => __flat.run(() => [0, -26, 0], 150)));
  const follow = await game.evaluate(() => { const E = __natpfTennis, f = E.natpfPhone.link.face(); E.natpfPhone._syncPhoneState(); return { face: f, racket: E.motionController.phoneState.orientation }; });
  check('la racchetta in gioco segue l’orientamento del piatto', !!follow.face && follow.face.yaw > 10 && follow.racket.yaw > 10, JSON.stringify(follow));
  const dial = await phone.evaluate(() => ({ visible: !document.querySelector('#faceDial').classList.contains('hidden'), arrow: document.querySelector('#faceArrow').getAttribute('transform'), txt: document.querySelector('#faceTxt').textContent }));
  check('sul telefono l’indicatore mostra dove punta il piatto', dial.visible && /rotate\(\d/.test(dial.arrow) && /destra/.test(dial.txt), JSON.stringify(dial));
  await phone.screenshot({ path: path.join(SP, 'natpf-flat-play.png') });
  await phone.evaluate(() => __flat.turn(60, 400).then(() => __flat.still(300)));

  // presa verticale scelta dal pannello del telefono: torna il comportamento di NATPF Simulator (landscape bloccato)
  await game.evaluate(() => { __natpfTennis.natpfUi.openPhone(); document.querySelector('#natpf-phone-modal [data-natpf-grip="upright"]').click(); });
  await phone.waitForFunction(() => __racchetta.state.grip === 'upright', null, { timeout: 5000 });
  const upright = await phone.evaluate(() => ({ rotate: !document.querySelector('#rotate').classList.contains('hidden'), sensor: __racchetta.state.sensor }));
  check('presa verticale dal pannello: il telefono chiede il portrait e ricalibra', upright.rotate && upright.sensor === 'cal', JSON.stringify(upright));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
  console.log('schermate:', SP);
} finally {
  await B.close(); stop();
}
summary();
process.exit(process.exitCode || 0);
