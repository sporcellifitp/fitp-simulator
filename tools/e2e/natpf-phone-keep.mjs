// NATPF motore base: telefono che smette di funzionare in partita senza che il collegamento cada (richiesta del 23/10,
// docs/NATPF_DIAGNOSI_2026-10-23.md §6). Pagina del telefono, collegamento e motore veri; sensori, visibilità della
// pagina e blocco dello schermo simulati nella pagina del telefono:
//   A. sensori che si fermano a pagina visibile: il telefono lo dice con «Riattiva i sensori», il computer va in pausa
//      («sensori fermi»); riattivati, il computer riprende dopo il conto alla rovescia e il punto si rigioca;
//   B. pagina nascosta (schermo spento, altra app): pausa subito; al ritorno ripresa con il conto alla rovescia;
//   C. blocco dello schermo rilasciato a pagina visibile: ripreso da solo; negato: l'avviso sul telefono con il pulsante,
//      e il pulsante lo riprende;
//   D. nessun punto assegnato per le pause, nessun errore JavaScript.
// Non sostituisce la prova con un telefono vero: quando Android sospende i sensori o nega il blocco lo dice solo lui.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-phone-keep.mjs
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, quickCalibrate } from './th.mjs';
import { GESTI, defaultPrep } from './prova.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9163), GAME_PORT = +(process.env.GAME_PORT || 3163);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} peerServer.close(); });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono simulato: sensori continui come un telefono vero (window.__mute li ferma), pagina nascosta su richiesta
// (window.__setHidden), blocco dello schermo finto (window.__wl: deny = richieste da negare, locks = blocchi dati)
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ if (window.__mute) return; window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 16 })); },
    run(fn, ms){ window.__busy = (window.__busy || 0) + 1; return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); window.__busy--; r(); } }, 16); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy && window.__moved) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  window.addEventListener('devicemotion', () => { window.__moved = true; }, { once: true });
  let hidden = false;
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
  window.__setHidden = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
  const wl = window.__wl = { deny: 0, n: 0, locks: [] };
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { async request(){
    wl.n++;
    if (hidden || wl.deny > 0){ if (!hidden) wl.deny--; throw new DOMException('Wake lock denied', 'NotAllowedError'); }
    const ls = [], l = { type: 'screen', released: false, addEventListener: (e, f) => { if (e === 'release') ls.push(f); }, async release(){ if (l.released) return; l.released = true; ls.forEach(f => f(new Event('release'))); } };
    wl.locks.push(l); return l;
  } } });
};
const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await game.evaluate(() => { const E = __natpfTennis; E.render = () => {}; });   // grafica software lenta: niente disegno
  await game.evaluate(() => { __natpfTennis.natpfUi.selectController('phone', { open: false }); return __natpfTennis.natpfPhone.start(); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  if (GESTI){
    await phone.waitForFunction(() => __racchetta.state.step === 'still', null, { timeout: 5000 });
    await phone.evaluate(() => __up.still(1200));
    await quickCalibrate(phone, QUICK_PLAN);   // aspetta da sé la fine del «fermo» e il «pronto» di ogni gesto
    await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
    await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
    check('telefono calibrato, blocco dello schermo preso all\'attivazione dei sensori', await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false)
      && await phone.evaluate(() => __racchetta.state.wake === 1 && __wl.n >= 1));
  } else {
    // B28, calibrazione di base («Giocando»): niente gesti, il telefono è pronto da solo; poi gli scambi di prova
    const d = await defaultPrep(game, phone);
    check('telefono pronto senza gesti e scambi di prova giocati (calibrazione di base)', d.ready && d.trial.ended && ['full', 'ok'].includes(d.level) && await phone.evaluate(() => __racchetta.state.wake === 1 && __wl.n >= 1), JSON.stringify(d));
  }

  // scambio in corso: una palla della CPU verso chi gioca, il motore va avanti da solo
  // flight: secondi di volo della palla fino al rimbalzo (palla tesa di base). Nel caso A la pausa arriva fino a 2,1 s dopo
  // lo stop dei sensori (conto più giù), che parte 0,2 s dopo il lancio: con la palla tesa (1,05 s) lo scambio a volte era
  // già finito prima della pausa (fase POINT_OVER, punto all'avversario: prova del B41 del 13/11, 1901 e 2033 ms), e la
  // verifica «nessun punto per la pausa» falliva per il momento del segnale, non per il gioco. Lì la palla vola 2,5 s
  // (rimbalzo dopo la pausa più tarda: 0,2 + 2,1 = 2,3 s), così la pausa trova sempre lo scambio in corso
  const rally = (flight = 1.05) => game.evaluate(flight => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false; E.player.pos.set(0, 0, 11.4); E.player.targetPos.copy(E.player.pos);
    Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1 });
    E.ball.pos.set(-.5, 1, -11); E._launchBallToTarget(E.ball.pos, new E.ball.pos.constructor(1.4, 0, 8.6), flight, { topspin: 14 }); E._natpfPlanPlayer();
    E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
  }, flight);
  const score = () => game.evaluate(() => { const s = __natpfTennis.score; return [s.playerPoints, s.opponentPoints, s.playerGames, s.opponentGames].join(' '); });
  const hold = () => game.evaluate(() => { const U = __natpfTennis.natpfUi; return { why: U.phoneHold?.why ?? null, paused: !!__natpfTennis.natpfPaused, phase: __natpfTennis.phase, text: document.getElementById('natpf-phone-hold')?.textContent || '' }; });
  const alertOf = () => phone.evaluate(() => ({ on: !document.getElementById('alert').classList.contains('hidden'), title: document.getElementById('alertTitle').textContent, btn: document.getElementById('alertBtn').classList.contains('hidden') ? null : document.getElementById('alertBtn').textContent }));
  await game.evaluate(() => { window.__resumes = []; const U = __natpfTennis.natpfUi, act = U._phoneHoldAction.bind(U); U._phoneHoldAction = a => { if (a.kind === 'countdown' || a.kind === 'resume') __resumes.push({ ...a, t: performance.now() }); return act(a); }; });

  // A. sensori fermi a pagina visibile (palla lunga: vedi rally)
  await rally(2.5);
  const s0 = await score();
  await game.waitForTimeout(200);
  await phone.evaluate(() => { window.__mute = true; });
  const tA = Date.now();
  const pausedA = await game.waitForFunction(() => __natpfTennis.natpfUi.phoneHold?.why === 'sensori fermi' && __natpfTennis.natpfPaused, null, { timeout: 4000, polling: 50 }).then(() => Date.now() - tA, () => null);
  const hA = await hold();
  // Tempo fino alla pausa (B28.1): il computer si ferma quando un segnale del telefono (uno al secondo, sul canale
  // affidabile) dice che l'ultimo campione dei sensori è più vecchio di 700 ms (WATCH.phoneSensorMs), e dopo 300 ms di
  // grazia (WATCH.graceMs). Secondo il momento in cui i sensori si fermano rispetto al segnale sono da 1008 a 1968 ms
  // (calcolato con le funzioni pure phoneHealth e createPhoneWatch su tutte le fasi del segnale); più il giro di
  // controllo ogni 100 ms fa 2100. La soglia di prima (1500) passava o no secondo la fase del segnale, non secondo il
  // gioco: 1392 ms con la calibrazione con i gesti, 1508–1663 ms con quella di base, stesso codice della guardia
  check('A · sensori fermi a collegamento vivo: il computer va in pausa (entro 2,1 s) e dice perché', pausedA != null && pausedA < 2100 && /Riattiva i sensori/.test(hA.text), `${pausedA} ms, ${JSON.stringify(hA)}`);
  const alertA = await phone.waitForFunction(() => !document.getElementById('alert').classList.contains('hidden'), null, { timeout: 4000, polling: 100 }).then(() => Date.now() - tA, () => null);
  const aA = await alertOf();
  check('A · il telefono dice «Sensori fermi» con il pulsante per riattivarli', alertA != null && aA.title === 'Sensori fermi' && aA.btn === 'Riattiva i sensori', `${alertA} ms, ${JSON.stringify(aA)}`);
  await phone.evaluate(() => { window.__mute = false; });
  await phone.click('#alertBtn');
  const back = Date.now();
  await game.evaluate(() => { __resumes.length = 0; });
  const resumedA = await game.waitForFunction(() => !__natpfTennis.natpfUi.phoneHold && !__natpfTennis.natpfPaused, null, { timeout: 8000, polling: 50 }).then(() => Date.now() - back, () => null);
  const rA = await game.evaluate(() => __resumes.map(a => a.kind + (a.left ?? '') + (a.replay ? ':rigioca' : '')));
  const aA2 = await alertOf();
  check('A · riattivati: l\'avviso sul telefono sparisce, il computer riprende dopo il conto alla rovescia e rigioca il punto', resumedA != null && resumedA >= 2800 && rA.join() === 'countdown3,countdown2,countdown1,resume:rigioca' && !aA2.on && await game.evaluate(() => __natpfTennis.phase === 'SERVE_STANCE' || __natpfTennis.phase === 'SERVE_TOSS'),
    `${resumedA} ms, ${rA.join()}, telefono ${JSON.stringify(aA2)}`);
  check('A · nessun punto assegnato per la pausa', await score() === s0, `${s0} → ${await score()}`);

  // B. pagina nascosta: pausa subito; al ritorno si riprende
  await rally();
  const s1 = await score();
  await phone.evaluate(() => __setHidden(true));
  const tB = Date.now();
  const pausedB = await game.waitForFunction(() => __natpfTennis.natpfUi.phoneHold?.why === 'pagina nascosta' && __natpfTennis.natpfPaused, null, { timeout: 3000, polling: 25 }).then(() => Date.now() - tB, () => null);
  check('B · pagina del telefono nascosta: pausa subito', pausedB != null && pausedB < 600, `${pausedB} ms, ${JSON.stringify(await hold())}`);
  const lockReleased = await phone.evaluate(() => { const l = __wl.locks.at(-1); l.release(); return __racchetta.state.wake; });
  await game.waitForTimeout(1500);
  const deniedWhileHidden = await phone.evaluate(() => __wl.n);
  await phone.evaluate(() => __setHidden(false));
  const tB2 = Date.now();
  const resumedB = await game.waitForFunction(() => !__natpfTennis.natpfUi.phoneHold && !__natpfTennis.natpfPaused, null, { timeout: 8000, polling: 50 }).then(() => Date.now() - tB2, () => null);
  const wakeB = await phone.evaluate(() => ({ wake: __racchetta.state.wake, n: __wl.n }));
  check('B · di nuovo in primo piano: blocco dello schermo ripreso, partita ripresa dopo il conto alla rovescia', lockReleased === 0 && resumedB != null && resumedB >= 2800 && wakeB.wake === 1, `blocco ${lockReleased} → ${JSON.stringify(wakeB)} (richieste a pagina nascosta fino a ${deniedWhileHidden}), ripresa dopo ${resumedB} ms`);
  check('B · nessun punto assegnato per la pausa', await score() === s1, `${s1} → ${await score()}`);

  // C. blocco dello schermo rilasciato a pagina visibile: ripreso da solo; negato: avviso e pulsante
  const n0 = await phone.evaluate(() => { __wl.locks.at(-1).release(); return __wl.n; });
  const retook = await phone.waitForFunction(() => __racchetta.state.wake === 1, null, { timeout: 3000, polling: 50 }).then(() => true, () => false);
  check('C · blocco rilasciato con la pagina visibile (risparmio energetico): ripreso da solo', retook && await phone.evaluate(n => __wl.n === n + 1, n0));
  await phone.evaluate(() => { __wl.deny = 99; __wl.locks.at(-1).release(); });
  const alertC = await phone.waitForFunction(() => !document.getElementById('alert').classList.contains('hidden'), null, { timeout: 4000, polling: 100 }).then(() => true, () => false);
  const aC = await alertOf();
  const pcWake = await game.waitForFunction(() => __natpfTennis.natpfPhone.state.wake === 0, null, { timeout: 3000 }).then(() => true, () => false);
  check('C · blocco negato: il telefono avvisa che lo schermo può spegnersi, con il pulsante; il computer lo sa', alertC && aC.title === 'Lo schermo può spegnersi' && aC.btn === 'Tieni acceso lo schermo' && pcWake, JSON.stringify({ aC, pcWake }));
  const tries = await phone.evaluate(() => __wl.n);
  await phone.waitForTimeout(3500);
  const later = await phone.evaluate(() => __wl.n);
  await phone.evaluate(() => { __wl.deny = 0; });
  await phone.click('#alertBtn');
  const fixed = await phone.waitForFunction(() => __racchetta.state.wake === 1 && document.getElementById('alert').classList.contains('hidden'), null, { timeout: 3000, polling: 50 }).then(() => true, () => false);
  check('C · negato: si riprova da solo con attese crescenti; il pulsante lo riprende e l\'avviso sparisce', later > tries && later - tries <= 3 && fixed, `richieste in 3,5 s: ${later - tries}, ripreso col pulsante: ${fixed}`);
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close();
}
summary();
setTimeout(() => process.exit(), 300);
