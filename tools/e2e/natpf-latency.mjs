// NATPF motore base: tempi dal gesto del telefono alla risposta del giocatore, misurati nel browser con il telefono
// simulato (stessa pagina del telefono, stesso collegamento WebRTC del gioco, stesso motore). Per ogni gesto:
//   rilevamento   picco del gesto sul telefono → decisione del rilevatore
//   consegna      invio dal telefono → arrivo sul computer (orologio comune: le due pagine sono nello stesso browser)
//   motore        arrivo → swing nel motore (animazione della racchetta avviata)
//   attesa palla  swing → colpo vero (la palla arriva allo sweet spot: dipende da quando si è colpito)
// e quante animazioni dello swing partono per un gesto solo (deve essere una: prima un gesto in anticipo ne faceva due).
// Non misura il disegno (grafica software, fotogrammi lenti) né lo schermo: si aggiungono 1–2 fotogrammi (16–33 ms).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-latency.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9110), GAME_PORT = +(process.env.GAME_PORT || 3110);
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
  // istante (orologio comune) di invio di ogni colpo dal telefono
  window.__sent = [];
};
const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const shot = async name => { if (process.env.SHOTS !== '1') return; await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/latency-${name}.png` }); };
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
  // istanti con l'orologio comune: performance.timeOrigin + performance.now() in tutte e due le pagine
  await phone.evaluate(() => { __racchetta.det.on('swing', s => { const abs = performance.timeOrigin; window.__sent.push({ peak: abs + s.peakT, fire: abs + s.t, sent: abs + performance.now() }); }); });
  await game.evaluate(() => {
    const E = __natpfTennis, abs = () => performance.timeOrigin + performance.now();
    E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    window.__got = []; window.__anim = []; window.__strikes = []; window.__prep = []; window.__chip = [];
    // etichetta del gesto: ogni cambio di stato (letto → in attesa → esito)
    const chip = document.getElementById('natpf-gesture');
    new MutationObserver(() => { if (!chip.classList.contains('hidden')) __chip.push({ at: abs(), state: chip.dataset.state, text: chip.textContent }); }).observe(chip, { attributes: true, subtree: true, childList: true, characterData: true });
    // racchetta che si carica (gesto in anticipo): è la risposta immediata a schermo
    const ud = E.player.userData || (E.player.userData = {}); let np = ud.natpfPrep || null;
    Object.defineProperty(ud, 'natpfPrep', { configurable: true, get: () => np, set: v => { if (v && !np) __prep.push({ at: abs(), side: v.side }); np = v; } });
    E.natpfPhone.onSwing((ev, s) => __got.push({ at: abs(), ignored: ev.ignored || null, side: ev.side }));
    const rk = E.racketKinematics, trig = rk.triggerSwing.bind(rk);
    rk.triggerSwing = (a, o = {}) => { if (a === E.player) __anim.push({ at: abs(), timing: o.timing || null, side: o.side || null, practice: !!o.isPracticeSwing, phase: E.phase, why: (new Error().stack || '').split('\n').slice(2, 4).map(x => x.trim().replace(/https?:[^ )]*\//g, '')).join(' < ') }); return trig(a, o); };
    const strike = E._attemptPlayerRallyStrike.bind(E);
    E._attemptPlayerRallyStrike = (e, t) => { const at = abs(), r = strike(e, t); if (!t) __strikes.push({ at, ok: r, ms: +(abs() - at).toFixed(1) }); return r; };
    // palla in arrivo verso il dritto del giocatore, da una distanza scelta (s prima dello sweet spot)
    window.__serveBall = lead => { E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false; E.player.pos.set(0, 0, 11.4); E.player.targetPos.copy(E.player.pos); E.player.swingCooldown = 0; E.pendingUserSwing = null;
      const v = 16; Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 1, rallyStrokeCount: 2 }); E.ball.pos.set(.9, 1, 11.4 - .1 - v*lead); E.ball.vel.set(0, 0, v); E.ball.targetLanding.set(.9, 0, 11.4);
      // palla messa a mano, senza lancio: il piano d'intercetto della risposta della CPU ancora in volo non vale (prima una
      // palla sì e una no misurava il tempo su quella risposta e lo swing finiva a vuoto)
      E.natpfPlan = null; };
    E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
  });
  await phone.waitForFunction(() => __racchetta.state.phase === 'play', null, { timeout: 5000 }).catch(() => {});
  // gesti: la palla parte in modo che il picco del gesto cada «lead» secondi prima dello sweet spot (0 = in tempo)
  const rows = [];
  for (const lead of [0, .05, .15, .25, 0, .1]){
    const n0 = await phone.evaluate(() => __sent.length);
    // il gesto dura 240 ms con il picco a metà: la palla si lancia in modo da trovarsi a lead + 120 ms dallo sweet spot
    await game.evaluate(l => { __anim.length = 0; __strikes.length = 0; __got.length = 0; __prep.length = 0; __chip.length = 0; __serveBall(l + .12); }, lead);
    if (lead === .15 && process.env.SHOTS === '1'){ await phone.evaluate(() => __up.swing(1)); await game.waitForTimeout(150); await shot('esito'); await phone.evaluate(() => __up.still(900)); }
    else await phone.evaluate(() => { return __up.swing(1).then(() => __up.still(900)); });
    await game.waitForTimeout(300);
    const sent = await phone.evaluate(n => __sent[n] || null, n0), g = await game.evaluate(() => ({ got: __got[0] || null, anim: [...__anim], strikes: [...__strikes], prep: [...__prep], chip: [...new Set(__chip.map(c => c.state))] }));
    if (process.env.DEBUG) console.log(JSON.stringify({ lead, sent, g }));
    if (!sent || !g.got){ rows.push({ lead, lost: true }); continue; }
    const firstAnim = g.anim[0]?.at, strike = g.strikes.find(s => s.ok)?.at, response = Math.min(firstAnim ?? Infinity, g.prep[0]?.at ?? Infinity);
    rows.push({ lead, detect: +(sent.fire - sent.peak).toFixed(1), deliver: +(g.got.at - sent.sent).toFixed(1), engine: Number.isFinite(response) ? +(response - g.got.at).toFixed(1) : null,
      ballWait: strike && Number.isFinite(response) ? +(strike - response).toFixed(1) : null, total: Number.isFinite(response) ? +(response - sent.peak).toFixed(1) : null, swings: g.anim.length, prep: g.prep.length, hit: !!strike,
      swingAtStrike: strike && firstAnim ? +(firstAnim - strike).toFixed(1) : null, chip: g.chip, chipAt: (() => { const c = (g.chip.length ? g.chip : null); return c; })() });
  }
  console.log('anticipo (s) · rilevamento · consegna · motore · picco→risposta a schermo · attesa della palla (ms) · risposta · swing · colpo');
  for (const r of rows) console.log(r.lost ? `${r.lead} perso` : `${r.lead} · ${r.detect} · ${r.deliver} · ${r.engine} · ${r.total} · ${r.ballWait} · ${r.prep ? 'racchetta carica' : 'swing'} · ${r.swings} · ${r.hit ? 'sì' : 'no'}`);
  const ok = rows.filter(r => !r.lost);
  check('ogni gesto arriva e colpisce la palla', ok.length === rows.length && ok.every(r => r.hit), JSON.stringify(rows));
  check('un gesto, una sola animazione dello swing (niente secondo swing quando arriva la palla)', ok.every(r => r.swings === 1), JSON.stringify(ok.map(r => r.swings)));
  check('dal picco del gesto alla risposta a schermo (racchetta carica o swing): meno di 100 ms (senza il disegno)', ok.every(r => r.total != null && r.total < 100), JSON.stringify(ok.map(r => r.total)));
  check('lo swing parte nell’istante del colpo (entro 20 ms)', ok.every(r => r.swingAtStrike != null && Math.abs(r.swingAtStrike) < 20), JSON.stringify(ok.map(r => r.swingAtStrike)));
  // etichetta del gesto: compare (gesto letto), in anticipo dice «aspetta la palla», poi l'esito del colpo
  check('etichetta del gesto: letto, in attesa se in anticipo, poi l’esito', ok.every(r => r.chip.length && /ok|mid|bad/.test(r.chip.at(-1)) && (!r.prep || r.chip.includes('wait'))), JSON.stringify(ok.map(r => r.chip)));
  // gesto con la palla che si allontana: ignorato, e l'etichetta lo dice
  await game.evaluate(() => { const E = __natpfTennis; __chip.length = 0; E.ball.lastHitter = 'player'; E.ball.pos.set(0, 1, 5); E.ball.vel.set(0, 0, -16); E.phase = 'RALLY'; E.ball.inPlay = true; });
  await phone.evaluate(() => __up.swing(1).then(() => __up.still(600)));
  const ign = await game.evaluate(() => __chip.at(-1) || null);
  check('gesto con la palla già colpita: etichetta «Gesto ignorato» e il motivo', ign?.state === 'ignored' && /ignorato/i.test(ign.text), JSON.stringify(ign));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
