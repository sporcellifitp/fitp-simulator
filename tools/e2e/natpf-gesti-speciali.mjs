// NATPF motore base: pallonetto e palla corta con il telefono, nel gioco vero (segnalazione del 23/10, sera: «quasi
// tutte le volte il colpo non riesce, non rileva quando sollevo il telefono o faccio un movimento dall'alto verso il
// basso»). Pagina vera del telefono, collegamento e motore veri; il telefono simulato è mosso da un braccio fisico (come
// natpf-tennis/test/arm-sim.mjs): orientamento, gravità e accelerazione della mano coerenti, presa di taglio con il
// telefono dritto nel pugno e gesti di polso, il caso più difficile.
//   A. calibrazione con dritto e rovescio del braccio;
//   B. esercizi «Pallonetto» e «Palla corta» del lanciapalle: il telefono manda i gesti, il gioco impara il proprio
//      gesto e lo riconosce (prima: con questi telefoni non imparava niente e diceva «Ho imparato il tuo gesto»);
//   C. in partita (Pro): pallonetti, palle corte e dritti dal gesto, letti giusti; pallonetto e palla corta in campo.
// Porte 3184 (gioco) e 9184 (PeerJS). Eventi devicemotion sintetici: non sostituiscono la prova con un telefono vero.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-gesti-speciali.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9184), GAME_PORT = +(process.env.GAME_PORT || 3184);
const TILT = +(process.env.TILT ?? 0);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// braccio fisico nella pagina del telefono (stesse formule di arm-sim.mjs e phone-sim.mjs): a 60 Hz un campione dalla coda
// dei gesti, altrimenti la mano ferma con il suo tremolio
const PHONE_INIT = () => {
  const G = 9.81, D = Math.PI/180, DT = 1000/60;
  const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0], a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
  const qconj = q => [-q[0], -q[1], -q[2], q[3]];
  const rotate = (q, v) => qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)).slice(0, 3);
  const qaxis = (axis, deg) => { const h = deg*Math.PI/360, l = Math.hypot(...axis) || 1; return [axis[0]/l*Math.sin(h), axis[1]/l*Math.sin(h), axis[2]/l*Math.sin(h), Math.cos(h)]; };
  const len = v => Math.hypot(...v), unit = v => { const l = len(v) || 1; return v.map(x => x/l); };
  const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const rot = (v, a, ang) => { const c = Math.cos(ang), s = Math.sin(ang), k = cross(a, v), d = dot(a, v); return v.map((x, j) => x*c + k[j]*s + a[j]*d*(1 - c)); };
  let q = [0, 0, 0, 1];
  const step = (q0, w) => { const wr = w.map(v => v*D), th = len(wr)*DT/1000; return th > 1e-9 ? qmul(qaxis(wr, th/D), q0) : q0; };
  const emit = (w, acc = [0, 0, 0]) => {
    const wd = rotate(qconj(q), w.map(v => v*D)); q = step(q, w);
    const g = rotate(qconj(q), [0, G, 0]), a = rotate(qconj(q), acc);
    window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: wd[2]/D, beta: wd[0]/D, gamma: wd[1]/D }, acceleration: { x: a[0], y: a[1], z: a[2] }, accelerationIncludingGravity: { x: g[0] + a[0], y: g[1] + a[1], z: g[2] + a[2] }, interval: DT }));
  };
  const queue = [];
  // tremolio a media nulla (con una componente fissa il telefono girava piano da solo: 18° al minuto)
  setInterval(() => { const s = queue.shift(); if (s) emit(s.w, s.a); else if (window.__moved){ const t = performance.now(); emit([.3*Math.sin(t/97), .3*Math.sin(t/131), .25*Math.sin(t/71)]); } }, DT);
  window.addEventListener('devicemotion', () => { window.__moved = true; }, { once: true });
  // rotazione lenta attorno a un asse del campo (la posa della mano), campioni da accodare
  const poseSamples = (axis, deg, rate = 60) => { const n = Math.max(1, Math.round(Math.abs(deg)/rate*1000/DT)), l = len(axis), w = Math.sign(deg)*rate; return Array.from({ length: n }, () => ({ w: axis.map(a => a/l*w), a: [0, 0, 0] })); };
  // gesto del braccio (arm-sim.armSwing): apertura lenta, swing con l'accelerazione vera della mano, ritorno all'orientamento di prima
  const armSamples = ({ axis, peak, ms, rc, wrist = 0, wristAxis = [0, 0, -1] }) => {
    const A = unit(axis), n = Math.round(ms/DT), total = peak*ms/1000*.5, out = [...poseSamples(A, -total/2, 90)];
    const phi = u => (peak*ms/1000*(u/2 - Math.sin(2*Math.PI*u)/(4*Math.PI)) - total/2)*D;
    const peakAt = out.length + Math.round(n/2);
    for (let i = 0; i <= n; i++){
      const u = i/n, w = peak*Math.sin(Math.PI*u)**2, al = peak*Math.PI*Math.sin(2*Math.PI*u)/(ms/1000);
      const r = rot(rc, A, phi(u)), wr = w*D, ar = al*D;
      const acc = cross(A, r).map((x, j) => x*ar + cross(A, cross(A, r))[j]*wr*wr);
      const v = u*1.4 - .2, pw = v > 0 && v < 1 ? wrist*Math.sin(Math.PI*v)**2 : 0, WA = unit(rot(wristAxis, A, phi(u)));
      out.push({ w: A.map((x, j) => x*w + WA[j]*pw), a: acc });
    }
    // ritorno: dall'orientamento finale a quello di partenza a 90 °/s (come returnTo)
    let qe = q; for (const s of queue) qe = step(qe, s.w); const q0 = qe; for (const s of out) qe = step(qe, s.w);
    const d = qmul(q0, qconj(qe)), c = Math.max(-1, Math.min(1, d[3]*(d[3] < 0 ? -1 : 1))), ang = 2*Math.acos(c)/D;
    if (ang > .05) out.push(...poseSamples(d[3] < 0 ? [-d[0], -d[1], -d[2]] : [d[0], d[1], d[2]], ang, 90));
    return { out, peakAt };
  };
  window.__arm = {
    grip(tilt, side = 1){ queue.push(...poseSamples([0, 1, 0], 90*side), ...poseSamples([1, 0, 0], -tilt)); },
    // gesto con il picco tra msToPeak ms (subito se non c'è il tempo per l'apertura); restituisce i ms al picco
    swing(spec, msToPeak = 0){ const { out, peakAt } = armSamples(spec), wait = Math.max(0, msToPeak - peakAt*DT); setTimeout(() => queue.push(...out), wait); return wait + peakAt*DT; },
    get busy(){ return queue.length > 0; },
  };
};
// gesti: calibrazione e colpi normali dal braccio; pallonetto e palla corta di polso (il caso più difficile)
const STROKES = {
  dritto:   { axis: [-.18, 1, .08], peak: 650, ms: 260, rc: [.45, -.5, -.25], wrist: 350, wristAxis: [0, 0, -1] },
  rovescio: { axis: [.18, -1, .08], peak: 600, ms: 260, rc: [-.45, -.5, -.25], wrist: -300, wristAxis: [0, 0, -1] },
  lob:      { axis: [1, .25, 0], peak: 480, ms: 260, rc: [.04, -.06, -.04] },
  drop:     { axis: [-1, .35, 0], peak: 300, ms: 240, rc: [.04, -.04, -.06] },
};

const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });   // grafica software lenta
  // colpi del telefono come li legge il gioco (anche quelli che non colpiscono) e gesti scartati dal telefono
  await game.evaluate(() => { const E = __natpfTennis; window.__sw = []; window.__drop = []; E.natpfPhone.onSwing?.(ev => __sw.push({ shot: ev.natpf?.shot, why: (ev.natpf?.why || []).join(', '), ignored: ev.ignored || null, t: E.elapsedTime })); E.natpfPhone.onDropped?.((why, d) => __drop.push({ why, t: E.elapsedTime })); });
  await game.evaluate(() => { __natpfTennis.natpfUi.selectController('phone', { open: false }); return __natpfTennis.natpfPhone.start(); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.evaluate(() => { window.__disc = []; window.__det = []; const d = window.__racchetta.det; d.on('discard', x => { __disc.push(x.why); __det.push({ k: 'scarto', ...x }); }); d.on('swing', x => __det.push({ k: 'colpo', peak: x.peak, angle: x.angle, dir: x.dir, vert: x.vert || null })); });
  await phone.click('#enable');
  await phone.evaluate(t => __arm.grip(t), TILT);
  await phone.waitForFunction(() => !__arm.busy, null, { timeout: 10000 });
  await phone.waitForFunction(() => __racchetta.state.step === 'still' || __racchetta.state.step === 'swings', null, { timeout: 8000 });
  await phone.waitForFunction(() => __racchetta.state.step === 'swings', null, { timeout: 8000 });
  /* A. calibrazione: dritto e rovescio del braccio */
  for (let i = 0; i < QUICK_PLAN.length; i++){
    await phone.waitForTimeout(500);
    await phone.evaluate(g => __arm.swing(g), QUICK_PLAN[i] === 'L' ? STROKES.dritto : STROKES.rovescio);
    await phone.waitForFunction(() => !__arm.busy, null, { timeout: 8000 }); await phone.waitForTimeout(700);
  }
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
  await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
  check(`A. calibrazione con il braccio (presa di taglio, telefono inclinato di ${TILT}°)`, await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false));
  if (process.env.DEBUG) console.log('DEBUG profilo', JSON.stringify(await phone.evaluate(() => { const p = __racchetta.det.profile; return { noise: p.noise, minPeak: p.minPeak, on: p.on, ref: p.ref, refs: p.refs, minAngles: p.minAngles }; })));

  // il robot: gesto con il picco sul punto d'impatto del piano (latenza del collegamento di prova ~30 ms)
  let lastPlan = null;
  const robot = async (spec, { only = null } = {}) => {
    const s = await game.evaluate(() => { const E = __natpfTennis, P = E.natpfPlan; return { phase: E.phase, last: E.ball.lastHitter, left: P ? P.at + P.t - E.elapsedTime : null, at: P ? P.at : null }; });
    if (s.phase === 'RALLY' && s.last === 'opponent' && s.left != null && s.at !== lastPlan && s.left < 1.2 && (!only || only())){
      lastPlan = s.at; const at = await phone.evaluate(([g, ms]) => __arm.swing(g, ms), [spec, Math.max(0, s.left*1000 - 30)]);
      if (process.env.DEBUG) await game.evaluate(([l, a]) => { (window.__robot ||= []).push({ left: +l.toFixed(3), peakIn: Math.round(a), t: +__natpfTennis.elapsedTime.toFixed(2) }); }, [s.left, at]);
      return true;
    }
    return false;
  };

  /* B. esercizi del lanciapalle: pallonetto e palla corta */
  await game.evaluate(() => {
    const E = __natpfTennis, U = E.natpfUi; U.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    E._applyDifficultyTuning('pro'); E.matchConfig.difficulty = 'pro';
    window.__drill = [];
    const T = U.training, onShot = T.onShot.bind(T);
    T.onShot = q => { const d = T.drill?.id; onShot(q); __drill.push({ drill: d, shot: T.lastShotSeen, msg: T.message, done: T.progress.done, tries: T.progress.tries, learn: T.lastLearn }); };
    const onPhone = T._onPhoneSwing.bind(T);
    T._onPhoneSwing = ev => { T.lastShotSeen = ev?.natpf?.shot; onPhone(ev); };
    T.start({ drills: [{ id: 'lob', label: 'Pallonetto', need: 2, shot: 'lob', phoneOnly: true, maxTries: 5, hint: { phone: 'Dal basso verso l’alto' } }, { id: 'drop', label: 'Palla corta', need: 2, shot: 'drop', phoneOnly: true, maxTries: 5, hint: { phone: 'Lento, dall’alto verso il basso' } }] });
    // telefono già calibrato: il riscaldamento parte dal servizio di chi gioca; qui si va subito alla prima palla, come
    // dopo la calibrazione in campo
    T._idle(); T.wait = .6;
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 90000){
    const st = await game.evaluate(() => { const T = __natpfTennis.natpfUi.training; return { active: T.active, drill: T.drill?.id || null }; });
    if (!st.active) break;
    await robot(st.drill === 'drop' ? STROKES.drop : STROKES.lob);
    await game.waitForTimeout(15);
  }
  const drills = await game.evaluate(() => __drill), byDrill = k => drills.filter(d => d.drill === k);
  if (process.env.DEBUG) console.log('DEBUG esercizi', JSON.stringify(await game.evaluate(() => { const T = __natpfTennis.natpfUi.training; return { active: T.active, idx: T.idx, drill: T.drill?.id, progress: T.progress, message: T.message, flash: T.flash?.text, sw: __sw, robot: window.__robot }; })), 'telefono', JSON.stringify(await phone.evaluate(() => ({ disc: window.__disc, step: __racchetta.state.step }))));
  const fmt = a => a.map(d => `${d.shot}${d.learn?.learned ? (d.learn.distinct ? ' (imparato)' : ' (simile al normale)') : ''} → «${d.msg}»`).join(' · ');
  check('B. esercizio «Pallonetto»: superato (due pallonetti riconosciuti)', byDrill('lob').filter(d => d.shot === 'lob').length >= 2, fmt(byDrill('lob')));
  check('   esercizio «Palla corta»: superato (due palle corte riconosciute)', byDrill('drop').filter(d => d.shot === 'drop').length >= 2, fmt(byDrill('drop')));
  check('   messaggi veri: «Ho imparato» solo quando il gioco ha imparato un gesto distinto', drills.every(d => !/imparato/i.test(d.msg) || (d.learn?.learned && d.learn?.distinct)), fmt(drills));
  const disc = await phone.evaluate(() => window.__disc || []);

  /* C. partita (Pro): pallonetti, palle corte e dritti dal gesto */
  await game.evaluate(() => {
    // finito il riscaldamento il gioco torna al menu (dimostrazione): si entra in partita come dal menu
    const E = __natpfTennis; E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    E._applyDifficultyTuning('pro'); E.matchConfig.difficulty = 'pro'; E.matchConfig.gamesToWin = 6; E.startNewMatch({ showStartBanner: false });
    E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
    window.__played = [];
    const strike = E._attemptPlayerRallyStrike.bind(E);
    E._attemptPlayerRallyStrike = (e, t) => { const r = strike(e, t), L = E.natpfLastRacket; if (r && !t && L?.who === 'player') __played.push({ shot: L.out.shot, want: window.__want, x: +E.ball.targetLanding.x.toFixed(2), z: +E.ball.targetLanding.z.toFixed(2), grade: L.out.grade }); return r; };
  });
  const plan = ['lob', 'drop', 'dritto', 'lob', 'drop', 'dritto', 'lob', 'drop'];
  for (const want of plan){
    // palla della CPU verso il dritto, chi gioca in fondo: il gesto voluto
    await game.evaluate(w => { const E = __natpfTennis; window.__want = w; E.natpfPaused = false; E.phase = 'RALLY'; E.phaseTimer = 0; E.player.pos.set(0, 0, 11.4); E.player.targetPos.set(0, 0, 11.4);
      Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 2 }); E.ball.pos.set(-.5, 1, -10); E._launchBallToTarget(E.ball.pos.clone(), E.ball.pos.clone().set(1.5, 0, 8.4), 1.1, { topspin: 12 }); E._natpfPlanPlayer(); window.__n = __played.length; }, want);
    const t1 = Date.now();
    while (Date.now() - t1 < 6000){
      await robot(STROKES[want]);
      if (await game.evaluate(() => __played.length > __n || __natpfTennis.phase !== 'RALLY')) break;
      await game.waitForTimeout(15);
    }
    await game.waitForTimeout(500);
  }
  const played = await game.evaluate(() => __played);
  const ENGINE = { lob: 'LOB', drop: 'DROP', dritto: ['TOPSPIN', 'FLAT'] };
  const right = played.filter(p => [].concat(ENGINE[p.want]).includes(p.shot));
  check('C. in partita il colpo è quello del gesto (pallonetto, palla corta, dritto)', played.length >= plan.length - 1 && right.length === played.length, played.map(p => `${p.want}→${p.shot} (${p.grade})`).join(' · '));
  const inCourt = p => Math.abs(p.x) <= 4.115 && p.z < 0 && p.z >= -11.885;
  check('   pallonetto profondo e palla corta corta, dentro il campo', played.filter(p => p.shot === 'LOB').every(p => inCourt(p) && p.z < -8) && played.filter(p => p.shot === 'DROP').every(p => inCourt(p) && p.z > -5.5),
    played.filter(p => p.shot === 'LOB' || p.shot === 'DROP').map(p => `${p.shot} (${p.x}, ${p.z})`).join(' · '));
  const sw = await game.evaluate(() => __sw);
  if (process.env.DEBUG) console.log('DEBUG telefono', JSON.stringify(await phone.evaluate(() => __det)), 'robot', JSON.stringify(await game.evaluate(() => window.__robot)), 'persi', JSON.stringify(await game.evaluate(() => ({ drop: __drop, ready: __natpfTennis.natpfPhone.ready, phase: __natpfTennis.phase, auto: __natpfTennis.autoPlayMode, sw: __sw.length }))));
  check('   nessun gesto del pallonetto o della palla corta scartato dal telefono durante esercizi e partita', !disc.some(w => w === 'verso' || w === 'debole'), `scartati: ${disc.join(', ') || 'nessuno'} · colpi letti: ${sw.length}`);
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
