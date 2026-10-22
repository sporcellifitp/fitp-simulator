// NATPF motore base (natpf-tennis/): telefono simulato con la presa vera del gioco (verticale, «manico»), dal QR alla
// partita. Avvia da solo il server PeerJS locale e il gioco (vite) su porte di prova, apre la pagina del telefono dal
// link del QR, fa la calibrazione rapida e poi gioca dei colpi:
//   • dritti normali, arrotati e con il polso che ruota sul manico → colpi normali, mai pallonetti né tagliati;
//   • uno swing verticale dal basso verso l'alto → pallonetto;
//   • il colpo girato a destra o a sinistra (piatto all'impatto) → palla più a destra o più a sinistra del dritto neutro.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-phone-upright.mjs
// I gesti vengono dalla racchetta simulata delle prove in Node (natpf-tennis/test/racket-gestures.mjs: braccio che
// ruota attorno alla spalla con il telefono in mano come manico). Prima erano rotazioni del telefono attorno al proprio
// lato lungo tenuto in verticale, senza il percorso della testa della racchetta che il modello del colpo misura.
// Prende il posto di natpf-flat-grip.mjs, che prova la presa orizzontale non più offerta dal gioco.
// Eventi devicemotion sintetici: non sostituiscono la prova con un telefono vero.
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GESTURES = JSON.parse(execFileSync(process.execPath, ['--import', './test/register.mjs', 'test/racket-gestures.mjs', 'destro'], { cwd: GAME, maxBuffer: 64*1024*1024 }).toString());
const PEER_PORT = +(process.env.PEER_PORT || 9108), GAME_PORT = +(process.env.GAME_PORT || 3108);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// campioni [ms dal precedente, alpha, beta, gamma, ax, ay, az, gx, gy, gz] (racket-gestures.mjs), rigiocati con i
// loro tempi; window.__G arriva dopo il caricamento della pagina. still: posa «pronto» ferma (con un filo di rumore)
const PHONE_INIT = () => {
  window.__up = {
    emit(k){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: k[1], beta: k[2], gamma: k[3] }, acceleration: { x: k[4], y: k[5], z: k[6] }, accelerationIncludingGravity: { x: k[7], y: k[8], z: k[9] }, interval: 16.7 })); },
    run(samples){ return new Promise(r => { const t0 = performance.now(); let i = 0, at = 0; const tick = () => { const now = performance.now() - t0; while (i < samples.length && at + samples[i][0] <= now + 1){ at += samples[i][0]; this.emit(samples[i++]); } if (i >= samples.length) r(); else setTimeout(tick, 4); }; tick(); }); },
    play(name){ return this.run(window.__G[name]); },
    still(ms){ const k = window.__G.still[0], n = Math.max(1, Math.round(ms/16.7)), j = () => (Math.random() - .5)*.6; return this.run(Array.from({ length: n }, () => [16.7, j(), j(), j(), 0, 0, 0, k[7], k[8], k[9]])); },
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
  await phone.evaluate(G => { window.__G = G; }, GESTURES);
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  check('il telefono si collega dal link del QR', true);
  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.sensor === 'cal' && __racchetta.state.step === 'still', null, { timeout: 5000 });
  await phone.evaluate(() => __up.still(2400));
  await phone.waitForFunction(() => __racchetta.state.step === 'swings', null, { timeout: 5000 });
  // quattro gesti nel verso che la calibrazione chiede (prima fermi: la calibrazione vuole la mano ferma prima di ogni
  // gesto): verso sinistra il dritto del destro, verso destra il rovescio
  // (il verso chiesto: piano della calibrazione rapida al passo in corso; fino a 8 gesti, se uno non viene preso)
  for (let i = 0; i < 8; i++){
    const want = await phone.evaluate(() => { const S = __racchetta.cal.state; return S.step === 'swings' ? ['L', 'R', 'L', 'R'][S.idx] ?? null : null; });
    if (!want) break;
    await phone.evaluate(g => __up.still(500).then(() => __up.play(g)).then(() => __up.still(500)), want === 'R' ? 'backhand' : 'forehand');
  }
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
  const review = await game.evaluate(() => __natpfTennis.natpfPhone.cal.review);
  check('calibrazione rapida con la presa verticale superata', !!review?.pass, JSON.stringify(review)?.slice(0, 300));
  await phone.waitForFunction(() => __racchetta.state.step === 'free', null, { timeout: 5000 }).catch(() => {});
  await phone.evaluate(() => __up.still(400).then(() => __up.play('forehand')).then(() => __up.still(1000)));
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
      __shots.push({ shot: ev.natpf?.shot, side: ev.side, wrist: ev.natpf?.wrist, why: ev.natpf?.why, peak: ev.natpf?.peak ?? null, landX: +E.ball.targetLanding.x.toFixed(2), hit: E.ball.lastHitter === 'player' });
    };
  });
  await phone.waitForFunction(() => __racchetta.state.phase === 'play', null, { timeout: 5000 }).catch(() => {});
  // il colpo di un gesto: il telefono manda anche l'apertura (debole); in partita la finestra d'impatto la sostituisce
  // con il colpo più forte (natpf_impact.js), qui la palla è già al punto d'impatto e ogni evento colpisce: vale il più
  // forte del gesto
  const play = async (fn, arg) => {
    const before = await game.evaluate(() => __shots.length);
    await phone.evaluate(fn, arg);
    await game.waitForFunction(n => __shots.length > n, before, { timeout: 5000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 300));
    return game.evaluate(n => { const g = __shots.slice(n); return g.length ? { ...g.reduce((a, b) => ((b.peak ?? 0) > (a.peak ?? 0) ? b : a)), eventi: g.length } : null; }, before);
  };
  if (process.env.DEBUG){
    await phone.evaluate(() => { window.__sw = []; __racchetta.det.on('swing', s => __sw.push({ dir: s.dir, peak: s.peak })); });
    await game.evaluate(() => { window.__evs = []; __natpfTennis.natpfPhone.swingListeners.add((ev, s) => __evs.push({ ignored: ev.ignored, shot: ev.natpf?.shot })); });
    await phone.evaluate(() => __up.still(500).then(() => __up.play('forehand')).then(() => __up.still(900)));
    console.log('telefono', JSON.stringify(await phone.evaluate(() => __sw)), 'gioco', JSON.stringify(await game.evaluate(() => ({ evs: __evs, shots: __shots, menu: __natpfTennis.natpfUi.menuOpen, ready: __natpfTennis.natpfPhone.ready }))), 'fase tel', await phone.evaluate(() => __racchetta.state.phase + ' ' + __racchetta.state.step + ' ' + __racchetta.state.sensor));
  }
  const shots = [];
  for (const g of ['forehand', 'topspin', 'wristOpen', 'wristClose', 'forehand', 'topspin']) shots.push(await play(g => __up.still(500).then(() => __up.play(g)).then(() => __up.still(600)), g));
  check('dritti normali, arrotati e con il polso che ruota: colpi normali, mai pallonetti né tagliati', shots.every(s => s && s.hit && s.shot !== 'lob' && s.shot !== 'slice' && s.shot !== 'drop'), JSON.stringify(shots.map(s => s && `${s.shot} ${s.peak} °/s ${s.why?.join(', ')} (${s.eventi} eventi)`)));
  const lob = await play(() => __up.still(500).then(() => __up.play('lob')).then(() => __up.still(900)));
  check('swing verticale dal basso verso l’alto: pallonetto', lob?.shot === 'lob', JSON.stringify(lob));
  // mira: il piatto all'impatto girato di 25° rispetto ai dritti di prima (il computer ha imparato il dritto abituale)
  const neutral = await play(() => __up.still(400).then(() => __up.play('forehand')).then(() => __up.still(600)));
  const right = await play(() => __up.still(400).then(() => __up.play('aimRight')).then(() => __up.still(600)));
  const left = await play(() => __up.still(400).then(() => __up.play('aimLeft')).then(() => __up.still(600)));
  check('colpo girato a destra o a sinistra: palla più a destra o più a sinistra del dritto neutro', !!neutral && !!right && !!left && right.landX > neutral.landX + .4 && left.landX < neutral.landX - .4, JSON.stringify({ neutral, right, left }));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
