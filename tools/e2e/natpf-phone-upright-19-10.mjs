// NATPF motore base (natpf-tennis/): la presa del video del 19/10 (telefono in verticale nel pugno, polso che prona di
// 60–90° nel dritto), dal QR alla partita. Avvia da solo il server PeerJS locale e il gioco (vite) su porte di prova, apre
// la pagina del telefono dal link del QR, fa la calibrazione rapida con lo stesso gesto della partita e poi gioca:
//   • dritti con il polso che prona durante il gesto → colpi normali, non pallonetti né tagliati. Il tipo di colpo si
//     legge dalla forma rispetto alla salita abituale dei propri gesti della calibrazione (natpf_stroke_intent.js);
//   • un pallonetto: telefono inclinato in avanti e portato giù per metà corsa, poi il braccio che sale fa ruotare la
//     cima all'indietro con la mano che sale → pallonetto;
//   • il piatto girato a destra o a sinistra prima del colpo → palla a destra o a sinistra.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-phone-upright-19-10.mjs
// Sono i gesti di natpf-phone-upright.mjs com'era a 84ca878 (il telefono che gira su se stesso, con la rotazione del
// polso attorno alla normale dello schermo), resi fisicamente coerenti: la gravità ruota con il telefono e
// l'accelerazione della mano si dà nel riferimento del campo. Con la gravità sempre lungo il lato lungo il filtro
// d'orientamento vedeva un telefono dritto anche quando era inclinato. natpf-phone-upright.mjs usa invece i gesti
// della racchetta simulata (braccio che ruota attorno alla spalla): servono tutte e due.
// Eventi devicemotion sintetici: non sostituiscono la prova con un telefono vero.
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9119), GAME_PORT = +(process.env.GAME_PORT || 3119);
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
// L'orientamento del telefono finto segue le rotazioni (integrate con il tempo vero tra un campione e l'altro) e la
// gravità ruota con lui, come nei sensori veri: prima restava sempre lungo il lato lungo, e un telefono inclinato
// sembrava dritto al filtro d'orientamento (la forma del colpo si misura rispetto alla gravità).
const PHONE_INIT = () => {
  const G = 9.81, D = Math.PI/180;
  const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0], a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
  const qconj = q => [-q[0], -q[1], -q[2], q[3]];
  const rotate = (q, v) => qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)).slice(0, 3);
  window.__up = {
    q: [0, 0, 0, 1], last: null,
    // acc: accelerazione della mano nel riferimento del telefono; accW: nel riferimento del campo (x a destra, y in
    // alto, −z verso la rete), girata nel riferimento del telefono come la gravità
    emit(rot, acc = [0, 0, 0], accW = null){
      const now = performance.now(), dt = this.last == null ? 0 : Math.min(.05, (now - this.last)/1000); this.last = now;
      const w = [rot[1], rot[2], rot[0]].map(v => v*D), m = Math.hypot(...w);      // x = beta, y = gamma, z = alpha
      if (m*dt > 1e-9){ const k = Math.sin(m*dt/2)/m; this.q = qmul(this.q, [w[0]*k, w[1]*k, w[2]*k, Math.cos(m*dt/2)]); }
      if (accW) acc = rotate(qconj(this.q), accW);
      const g = rotate(qconj(this.q), [0, G, 0]);
      window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: g[0] + acc[0], y: g[1] + acc[1], z: g[2] + acc[2] }, interval: 10 }));
    },
    run(fn, ms){ window.__busy = (window.__busy || 0) + 1; return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc, v.accW); if (u >= 1){ clearInterval(id); window.__busy--; r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    turn(rate, ms){ return this.run(() => [0, 0, rate], ms); },
    // torna lentamente (rate °/s) a un orientamento, ruotando attorno a un asse fisso: la mano che rientra nella posa
    // «pronto» (anche il polso: la pronazione non si accumula da un colpo all'altro)
    returnTo(q0, rate = 20){
      const r = qmul(qconj(this.q), q0), s = r[3] < 0 ? -1 : 1, ang = 2*Math.acos(Math.min(1, r[3]*s)), l = Math.hypot(r[0], r[1], r[2]);
      if (ang < 1e-4 || l < 1e-9) return Promise.resolve();
      const ax = [r[0], r[1], r[2]].map(v => v*s/l), deg = ang/D;
      return this.run(() => [ax[2]*rate, ax[0]*rate, ax[1]*rate], deg/rate*1000);
    },
    // dritto/rovescio attorno alla verticale; wrist: rotazione del polso (alpha) nella seconda metà; push in avanti
    swing(sign, { peak = 750, dur = 240, wrist = 0 } = {}){ this.start = this.q.slice(); return this.run(u => ({ rot: [wrist*Math.sin(Math.PI*Math.max(0, u*1.4 - .2))**2, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(){ return this.returnTo(this.start || this.q); },
    // pallonetto: il telefono inclinato in avanti (presa del 19/10, 35°) e portato giù per metà corsa (lentamente), poi
    // il braccio che sale fa ruotare la cima all'indietro attorno al lato corto con la mano che sale: all'impatto, a
    // metà corsa, la testa è ancora davanti e sale (come in test/phone-sim.mjs); poi si torna dritti
    lob(){ const q0 = this.q.slice(), tilt = 35 + 650*.24/4, rate = 60; return this.run(() => [0, -rate, 0], tilt/rate*1000).then(() => this.still(300))
      .then(() => this.run(u => ({ rot: [0, 650*Math.sin(Math.PI*u)**2, 150*Math.sin(Math.PI*u)**2], accW: [0, 9*Math.sin(2*Math.PI*u), -2*Math.sin(Math.PI*u)] }), 240))
      .then(() => this.returnTo(q0, rate)); },
  };
  // come un telefono vero: i sensori arrivano di continuo (fermo tra un gesto e l'altro, un filo di rumore a media
  // nulla: la posa non deriva), dal primo campione in poi. Senza, il computer vedrebbe «sensori fermi» e metterebbe in
  // pausa (natpf_phone_watch.js)
  window.__hold = setInterval(() => { if (window.__busy || !window.__moved) return; const t = performance.now(); window.__up.emit([.3*Math.sin(t/37), .3*Math.sin(t/53), .3*Math.sin(t/71)]); }, 16);
  window.addEventListener('devicemotion', () => { window.__moved = true; }, { once: true });
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
  // i gesti nel verso che la calibrazione chiede (prima fermi: la calibrazione vuole la mano ferma prima di ogni gesto),
  // con la pronazione abituale di chi gioca (la stessa dei colpi in partita)
  for (let i = 0; i < QUICK_PLAN.length; i++){
    const want = await phone.evaluate(() => __racchetta.state.want ?? __racchetta.cal?.state?.want ?? null);
    const sign = want === 'R' || want === 'right' || want === -1 ? -1 : 1;
    await phone.evaluate(s => __up.still(500).then(() => __up.swing(s, { wrist: 500 })).then(() => __up.back(s)).then(() => __up.still(700)), i % 2 ? -sign : sign);
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
