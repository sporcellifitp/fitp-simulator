// NATPF motore base: collegamento telefono↔computer che cade e torna (audit del 20/10). Il canale WebRTC resta aperto ma
// i messaggi non passano (si bloccano gli invii nella pagina, come una rete che si ferma senza chiudere il canale):
//   A. solo computer → telefono: il telefono deve accorgersene da solo e ricollegarsi (prima restava «collegato» per
//      sempre: il computer riceveva ancora i suoi ping e nessuno chiudeva);
//   B. tutte e due le direzioni mentre chi gioca finisce i gesti della calibrazione sul telefono: alla ripresa il
//      computer torna allo stesso passo del telefono e passa agli esercizi (prima restava al gesto di prima);
//   C. durante gli esercizi: pausa con il pannello del telefono, poi si riprende da solo quando il telefono torna.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-phone-blackout.mjs
// Eventi devicemotion sintetici e rete simulata nelle pagine: non sostituiscono la prova con un telefono e un Wi-Fi veri.
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, finishLesson } from './th.mjs';
import { GESTI, phoneReadyNoGestures } from './prova.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9117), GAME_PORT = +(process.env.GAME_PORT || 3117);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} peerServer.close(); });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono in verticale (come natpf-training-flow.mjs) e rete che si può fermare: window.__drop blocca ogni invio sui canali
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
};
const DROP = () => { const send = RTCDataChannel.prototype.send; window.__drop = false; RTCDataChannel.prototype.send = function(d){ if (window.__drop) return; return send.call(this, d); }; };
const setDrop = (pages, on) => Promise.all(pages.map(p => p.evaluate(v => { window.__drop = v; }, on)));

const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await game.evaluate(() => { const E = __natpfTennis; E.render = () => {}; });   // grafica software lenta: niente disegno
  await game.evaluate(DROP);
  await game.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  await game.click('[data-menu="training"]');
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'controller', null, { timeout: 5000 });
  await game.click('[data-page="controller"] [data-natpf-controller="phone"]');
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.evaluate(DROP);
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  await game.waitForFunction(() => __natpfTennis.natpfUi.training.active, null, { timeout: 8000 });
  await finishLesson(game, 8, phone);   // prima la modale del tutorial: «Tutto chiaro, ho capito» sul telefono
  if (GESTI){
    await phone.waitForFunction(() => __racchetta.state.step === 'swings', null, { timeout: 8000 });
    // gesto quando il computer dice «Ora» (o, a rete ferma, quando il telefono è pronto), poi il rientro lento della mano
    const gesture = async (sign, fromPhone = false) => {
      if (fromPhone) await phone.waitForFunction(() => __racchetta.cal.state.ready, null, { timeout: 10000, polling: 50 });
      else await game.waitForFunction(() => document.getElementById('coach-main').dataset.state === 'go', null, { timeout: 12000, polling: 50 });
      await phone.evaluate(s => { window.__busy = true; return __up.swing(s).then(() => __up.back(s)).then(() => { window.__busy = false; }); }, sign);
      await phone.waitForTimeout(600);
    };
    await gesture(1);
    check('primo gesto della calibrazione letto dal computer', await game.evaluate(() => __natpfTennis.natpfUi.training.view.idx === 1));

    // A. rete ferma solo dal computer al telefono (il computer riceve ancora i ping del telefono)
    await setDrop([game], true);
    const tA = Date.now();
    const lostAt = await phone.waitForFunction(() => __racchetta.state.linkState === 'lost', null, { timeout: 15000, polling: 100 }).then(() => Date.now() - tA, () => null);
    await setDrop([game], false);
    const backAt = await phone.waitForFunction(() => __racchetta.state.linkState === 'on', null, { timeout: 30000, polling: 100 }).then(() => Date.now() - tA, () => null);
    check('A · il computer non arriva più al telefono: il telefono se ne accorge da solo e si ricollega', lostAt != null && lostAt <= 8000 && backAt != null, `perso dopo ${lostAt} ms, di nuovo collegato dopo ${backAt} ms`);

    // B. rete ferma nei due sensi mentre chi gioca finisce i gesti sul telefono
    await phone.waitForFunction(() => __racchetta.cal.state.step === 'swings' && __racchetta.cal.state.idx === 1, null, { timeout: 10000 });
    await setDrop([game, phone], true);
    for (const w of QUICK_PLAN.slice(1)) await gesture(w === 'L' ? 1 : -1, true);
    const phoneStep = await phone.evaluate(() => __racchetta.cal.state.step);
    const pcBefore = await game.evaluate(() => ({ stage: __natpfTennis.natpfUi.training.view.stage, idx: __natpfTennis.natpfUi.training.view.idx }));
    await setDrop([game, phone], false);
    const drills = await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal && __natpfTennis.natpfPhone.ready ? T.drill?.id : null; }, null, { timeout: 40000, polling: 100 }).then(h => h.jsonValue(), () => null);
    check('B · gesti finiti sul telefono a rete ferma: alla ripresa il computer si riallinea e passa agli esercizi', /review|free/.test(phoneStep) && drills === 'forehand', `telefono ${phoneStep}, computer prima della ripresa ${JSON.stringify(pcBefore)}, poi ${drills}`);
  } else {
    // B28, calibrazione di base («Giocando»): dopo il tutorial niente gesti di calibrazione, il telefono è pronto da solo e
    // si va agli esercizi (dritto e rovescio insegnano il colpo). La parte B (gesti della calibrazione finiti a rete
    // ferma) riguarda solo la calibrazione con i gesti: qui non c'è niente da riallineare
    check('(calibrazione di base) dopo il tutorial il telefono è pronto senza gesti e partono gli esercizi', await phoneReadyNoGestures(game) && await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal && !T.tutorialOpen && T.drill?.id === 'forehand'; }, null, { timeout: 15000, polling: 100 }).then(() => true, () => false),
      JSON.stringify(await game.evaluate(() => { const T = __natpfTennis.natpfUi.training; return { cal: !!T.cal, drill: T.drill?.id, learn: !!T.learn, ready: __natpfTennis.natpfPhone.ready }; })));
    // A. rete ferma solo dal computer al telefono, durante gli esercizi
    await setDrop([game], true);
    const tA = Date.now();
    const lostAt = await phone.waitForFunction(() => __racchetta.state.linkState === 'lost', null, { timeout: 15000, polling: 100 }).then(() => Date.now() - tA, () => null);
    await setDrop([game], false);
    const backAt = await phone.waitForFunction(() => __racchetta.state.linkState === 'on', null, { timeout: 30000, polling: 100 }).then(() => Date.now() - tA, () => null);
    check('A · il computer non arriva più al telefono: il telefono se ne accorge da solo e si ricollega', lostAt != null && lostAt <= 8000 && backAt != null, `perso dopo ${lostAt} ms, di nuovo collegato dopo ${backAt} ms`);
    const again = await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal && __natpfTennis.natpfPhone.ready && !__natpfTennis.natpfPaused; }, null, { timeout: 40000, polling: 100 }).then(() => true, () => false);
    check('A · (calibrazione di base) dopo il ricollegamento il telefono è di nuovo pronto senza gesti e gli esercizi continuano', again, JSON.stringify(await game.evaluate(() => ({ ready: __natpfTennis.natpfPhone.ready, phone: __natpfTennis.natpfPhone.state.phone, paused: !!__natpfTennis.natpfPaused, cal: !!__natpfTennis.natpfUi.training.cal }))));
    console.log('     B · non si applica alla calibrazione di base (riguarda i gesti della calibrazione finiti a rete ferma)');
  }

  // C. rete ferma durante gli esercizi
  await setDrop([game, phone], true);
  const paused = await game.waitForFunction(() => !document.getElementById('natpf-phone-modal').classList.contains('hidden') && __natpfTennis.natpfPaused, null, { timeout: 15000, polling: 100 }).then(() => true, () => false);
  await setDrop([game, phone], false);
  const resumed = await game.waitForFunction(() => document.getElementById('natpf-phone-modal').classList.contains('hidden') && !__natpfTennis.natpfPaused && __natpfTennis.natpfPhone.ready, null, { timeout: 40000, polling: 100 }).then(() => true, () => false);
  check('C · telefono perso durante gli esercizi: pausa con il pannello del telefono, poi si riprende da solo', paused && resumed, JSON.stringify({ paused, resumed }));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 400));
} finally {
  await B.close();
}
summary();
setTimeout(() => process.exit(), 300);
