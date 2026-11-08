// NATPF B9 (richiesta del 05/11): modale del tutorial compatta con le frecce e pagina del telefono con una schermata alla
// volta. Telefono simulato (390×844) dal QR a «Pronto» nell'Allenamento (tutte le 11 schede), poi stesso schermo con due
// telefoni (tutorial corto, 5 schede: B16, decisione dell'utente dell'08/11 sera):
//   - «Tutto chiaro, ho capito» spento (e inerte) finché il computer non ha mostrato tutte le schede, poi acceso;
//   - mai «Tutto chiaro» insieme a «Pronto» o a Ricalibra/Ricollega/Scollega (controllo ogni 30 ms per tutta la prova);
//   - tornare indietro dopo aver visto tutto, ricollegamento automatico e pagina ricaricata a tutorial aperto (si riprende
//     dalla scheda raggiunta), Ricalibra, Ricollega e pagina ricaricata da «Pronto» (il tutorial non torna);
//   - schermo del telefono spento: pausa con da quanto, velo «Tocca lo schermo per riprendere» se il blocco vuole un tocco;
//   - stesso schermo: due tutorial indipendenti, ciascuno sfogliato dal proprio telefono;
//   - schermate della modale a 1280×720, 1920×1080, stesso schermo e ledwall (?area=0,0,720,720) e del telefono a ogni stato.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-tutorial-phone.mjs   (schermate in $OUT, di base /tmp/tennis-e2e)
//   HAND=left: lo stesso percorso per un mancino (B15): mano scelta nel gioco (P1, anche nello stesso schermo), schede e
//   calibrazione con il piano della mano (prima il dritto →).
// Eventi devicemotion, visibilità e blocco dello schermo sintetici: non sostituiscono la prova con un telefono vero.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, seeAllCards, quickCalibrate } from './th.mjs';
import { calibrationPlan } from '../../site/js/tennis/calibration.js';

// mano di chi gioca (HAND=left per il mancino): il piano della calibrazione chiede prima il dritto a tutti e due
const HAND = process.env.HAND === 'left' ? 'left' : 'right';
const QUICK_PLAN = calibrationPlan({ quick: true, hand: HAND });

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9171), GAME_PORT = +(process.env.GAME_PORT || 3171);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const GAME_URL = (q = '') => `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}${q}`;

// telefono in verticale con sensori continui (window.__mute li ferma, come a pagina nascosta), visibilità simulata
// (window.__setHidden) e blocco dello schermo finto: con __wl.needTap la richiesta riesce solo subito dopo un tocco (iPhone,
// WebKit bug 255363; qui «dentro un tocco» = meno di 1 s da un pointerdown)
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ if (window.__mute) return; window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  let hidden = false;
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
  window.__setHidden = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
  const wl = window.__wl = { needTap: false, n: 0, tapAt: -1e9 };
  document.addEventListener('pointerdown', () => { wl.tapAt = performance.now(); }, true);
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { async request(){
    wl.n++;
    if (hidden || (wl.needTap && performance.now() - wl.tapAt > 1000)) throw new DOMException('Wake lock denied', 'NotAllowedError');
    const ls = [], l = { type: 'screen', released: false, addEventListener: (e, f) => { if (e === 'release') ls.push(f); }, async release(){ if (l.released) return; l.released = true; ls.forEach(f => f(new Event('release'))); } };
    if (!wl.hideHook){ wl.hideHook = true; document.addEventListener('visibilitychange', () => { if (hidden) for (const x of wl.all) x.release(); }); }
    (wl.all = wl.all || []).push(l); return l;
  } } });
  // mai «Tutto chiaro» insieme a «Pronto» o agli strumenti di «Pronto»: controllo continuo, le violazioni restano qui
  window.__overlap = [];
  const vis = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden') && !el.hidden && el.offsetParent !== null; };
  setInterval(() => {
    if (!document.getElementById('tutOk')) return;
    const tut = vis('tutOk'), tools = vis('tools'), ring = document.getElementById('ring')?.classList.contains('ready'), big = document.getElementById('big')?.textContent || '';
    if (tut && (tools || ring || /^(Pronto|Al servizio)$/.test(big))) window.__overlap.push({ t: Math.round(performance.now()), tools, ring, big });
  }, 30);
};

// stato visibile della pagina del telefono
const snap = phone => phone.evaluate(() => {
  const vis = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden') && !el.hidden && el.offsetParent !== null; };
  const b = document.getElementById('tutOk'), R = __racchetta.state;
  return { screen: R.screen, sensor: R.sensor, gate: R.gate, wake: R.wake, veil: R.veil, tutOk: vis('tutOk'), tutOn: vis('tutOk') && !b.disabled, tools: vis('tools'), tutBox: vis('tutBox'), nav: vis('tutNav'),
    big: document.getElementById('big').textContent, sub: document.getElementById('sub').textContent, where: document.getElementById('tutWhere').textContent, alert: vis('alert') ? document.getElementById('alertTitle').textContent : null, overlap: window.__overlap.length };
});
const pshot = async (phone, name) => { await phone.waitForTimeout(200); await phone.screenshot({ path: `${SP}/tutphone-${name}.png` }); };
const tap = (phone, id) => phone.evaluate(id => { const b = document.getElementById(id); if (b && !b.disabled) b.click(); return !!b && !b.disabled; }, id);
// una scheda avanti dal telefono e almeno 1,1 s a schermo (conta come vista)
const nextCard = async phone => { await tap(phone, 'tutNext'); await phone.waitForTimeout(1250); };

const B = await launch();
try {
  /* ================= 1. Allenamento con un telefono ================= */
  const { p: game, errs: gameErrs } = await page(B, GAME_URL(), { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // il disegno con la grafica software rallenta i fotogrammi: si disegna solo per le schermate
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const gshot = async (name, pg = game) => { await pg.evaluate(() => __natpfTennis.__render?.()); await pg.waitForTimeout(400); await pg.screenshot({ path: `${SP}/tutpc-${name}.png` }); };
  await game.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  await game.evaluate(h => __natpfTennis.natpfUi.hand.set(h), HAND);
  check(`mano «${HAND}» scelta nel gioco`, await game.evaluate(h => __natpfTennis.natpfUi.hand.hand === h, HAND));
  await game.click('[data-menu="training"]');
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'controller', null, { timeout: 5000 });
  await game.click('[data-page="controller"] [data-natpf-controller="phone"]');
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  let s = await snap(phone);
  await pshot(phone, '01-collegato');
  check('telefono collegato: «Attiva i sensori», niente «Tutto chiaro» né strumenti', s.screen === 'enable' && !s.tutOk && !s.tools, JSON.stringify(s));

  await phone.click('#enable');
  await game.waitForFunction(() => __natpfTennis.natpfUi.training.tutorialOpen, null, { timeout: 10000 });
  await phone.waitForFunction(() => __racchetta.state.screen === 'tutorial' && __racchetta.state.gate?.n > 0, null, { timeout: 8000 });
  s = await snap(phone);
  await pshot(phone, '02-tutorial-spento');
  await gshot('1280x720-scheda-1');
  check('tutorial: sul telefono «Tutto chiaro» spento, scheda 1 di 11, frecce, niente strumenti', s.screen === 'tutorial' && s.tutOk && !s.tutOn && s.nav && !s.tools && /Scheda 1 di 11/.test(s.where), JSON.stringify(s));
  // la modale sul computer: al centro, entro ~70% × ~78% dell'area, frecce in basso agli angoli
  const geo = () => game.evaluate(() => {
    const r = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const root = document.getElementById('natpf-tutorial'), card = root.querySelector('.tut-card'), area = document.getElementById('natpf-root') || document.body;
    return { area: r(area), card: r(card), prev: r(root.querySelector('.tut-prev')), next: r(root.querySelector('.tut-next')), stage: r(root.querySelector('.tut-stage')), win: [innerWidth, innerHeight] };
  });
  const centered = (g, W, H, x0 = 0) => Math.abs(g.card.x + g.card.w/2 - (x0 + W/2)) <= 3 && Math.abs(g.card.y + g.card.h/2 - H/2) <= 3 && g.card.w <= W*.705 && g.card.h <= H*.785
    && g.prev.y > g.card.y + g.card.h*.7 && g.next.y > g.card.y + g.card.h*.7 && g.prev.x < g.card.x + g.card.w*.2 && g.next.x > g.card.x + g.card.w*.75;
  let g = await geo();
  check('modale 1280×720: al centro, al massimo 70% × 78%, frecce in basso a sinistra e a destra, animazione 16:10', centered(g, 1280, 720) && Math.abs(g.stage.w/g.stage.h - 1.6) < .03, JSON.stringify(g));
  check('«Tutto chiaro» spento: toccarlo non chiude la modale', !(await tap(phone, 'tutOk')) && await game.evaluate(() => __natpfTennis.natpfUi.training.tutorialOpen));

  // avanti dal telefono fino alla scheda 5 (una alla volta, ognuna vista)
  for (let k = 0; k < 4; k++) await nextCard(phone);
  s = await snap(phone);
  const pc5 = await game.evaluate(() => { const st = __natpfTennis.natpfUi.training.tutorial.state; return { idx: st.idx, seen: st.visited.size }; });
  await pshot(phone, '03-tutorial-scheda-5');
  await gshot('1280x720-scheda-5');
  check('frecce del telefono: computer alla scheda 5, sul telefono «Scheda 5 di 11», ancora spento', pc5.idx === 4 && s.gate.i === 4 && /Scheda 5 di 11/.test(s.where) && !s.tutOn, JSON.stringify({ pc5, s }));
  // modale anche a 1920×1080 (stessa pagina, finestra più grande)
  await game.setViewportSize({ width: 1920, height: 1080 }); await game.waitForTimeout(600);
  g = await geo();
  await gshot('1920x1080-scheda-5');
  check('modale 1920×1080: al centro, proporzionata (al massimo 1280 px di larghezza), animazione 16:10', centered(g, 1920, 1080) && g.card.w <= 1280 && Math.abs(g.stage.w/g.stage.h - 1.6) < .03, JSON.stringify(g));
  await game.setViewportSize({ width: 1280, height: 720 }); await game.waitForTimeout(400);

  // ricollegamento automatico a tutorial aperto (come dopo lo schermo spento): stesso abbinamento, si riprende da lì
  const pairs0 = await game.evaluate(() => __natpfTennis.natpfPhone.state.pairs);
  const joins0 = await game.evaluate(() => __natpfTennis.natpfPhone.state.joins);
  await game.evaluate(() => __natpfTennis.natpfPhone.relink());
  await game.waitForFunction(j => __natpfTennis.natpfPhone.state.joins > j && __natpfTennis.natpfPhone.connected, joins0, { timeout: 20000 });
  await phone.waitForFunction(() => __racchetta.state.linkState === 'on' && __racchetta.state.screen === 'tutorial', null, { timeout: 8000 });
  await phone.waitForTimeout(600);
  s = await snap(phone);
  const afterRelink = await game.evaluate(() => { const T = __natpfTennis.natpfUi.training; return { open: T.tutorialOpen, idx: T.tutorial.state.idx, seen: T.tutorial.state.visited.size, pairs: __natpfTennis.natpfPhone.state.pairs }; });
  check('ricollegamento a tutorial aperto: stessa scheda sul computer e sul telefono, non è un abbinamento nuovo', afterRelink.open && afterRelink.idx === 4 && afterRelink.seen >= 4 && afterRelink.pairs === pairs0 && s.gate.i === 4 && !s.tutOn && !s.tools, JSON.stringify({ afterRelink, s }));

  // pagina del telefono ricaricata a tutorial aperto: si riattivano i sensori (serve un tocco) e si torna alla scheda 5
  await phone.reload({ waitUntil: 'domcontentloaded' });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  s = await snap(phone);
  await pshot(phone, '04-ricaricata-attiva');
  check('pagina ricaricata: prima «Attiva i sensori» (niente «Pronto», niente «Tutto chiaro»)', s.screen === 'enable' && !s.tutOk && !s.tools, JSON.stringify(s));
  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.screen === 'tutorial' && __racchetta.state.gate?.n > 0, null, { timeout: 8000 });
  s = await snap(phone);
  const afterReload = await game.evaluate(() => { const T = __natpfTennis.natpfUi.training; return { open: T.tutorialOpen, idx: T.tutorial.state.idx }; });
  check('pagina ricaricata: tutorial dalla scheda raggiunta, pulsante ancora spento', afterReload.open && afterReload.idx === 4 && s.gate.i === 4 && !s.tutOn, JSON.stringify({ afterReload, s }));

  // tutte le schede: il pulsante si accende
  check('schede sfogliate fino all’ultima: «Tutto chiaro» si accende', await seeAllCards(phone));
  s = await snap(phone);
  await pshot(phone, '05-tutorial-acceso');
  await gshot('1280x720-tutte-viste');
  check('telefono: «Hai visto tutto», pulsante acceso, ancora niente strumenti', s.tutOn && s.big === 'Hai visto tutto' && !s.tools, JSON.stringify(s));
  // indietro di due schede dopo aver visto tutto: resta acceso
  await tap(phone, 'tutPrev'); await phone.waitForTimeout(350); await tap(phone, 'tutPrev'); await phone.waitForTimeout(500);
  s = await snap(phone);
  const back = await game.evaluate(() => __natpfTennis.natpfUi.training.tutorial.state.idx);
  await pshot(phone, '06-indietro-acceso');
  check('indietro dopo aver visto tutto: il computer torna indietro, «Tutto chiaro» resta acceso', back === 8 && s.gate.i === 8 && s.tutOn, JSON.stringify({ back, s }));

  // «Tutto chiaro» → calibrazione (strumenti ancora nascosti) → «Pronto» con Ricalibra/Ricollega/Scollega
  await phone.click('#tutOk');
  await game.waitForFunction(() => !__natpfTennis.natpfUi.training.tutorialOpen, null, { timeout: 5000 });
  await phone.waitForFunction(() => __racchetta.state.screen === 'cal', null, { timeout: 5000 });
  await phone.waitForTimeout(500);
  s = await snap(phone);
  await pshot(phone, '07-calibrazione');
  check('dopo «Tutto chiaro»: calibrazione, senza «Tutto chiaro» né Ricalibra/Ricollega/Scollega', s.screen === 'cal' && !s.tutOk && !s.tools && !s.tutBox, JSON.stringify(s));
  await quickCalibrate(phone, QUICK_PLAN);
  const ready = await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 15000 }).then(() => true, () => false);
  await phone.waitForFunction(() => __racchetta.state.screen === 'ready', null, { timeout: 8000 }).catch(() => {});
  await phone.waitForTimeout(400);
  s = await snap(phone);
  await pshot(phone, '08-pronto');
  check('«Pronto» con Ricalibra, Ricollega, Scollega sotto; niente «Tutto chiaro»', ready && s.screen === 'ready' && s.tools && !s.tutOk && !s.tutBox, JSON.stringify(s));

  // Ricollega da «Pronto»: il tutorial non torna, mai «Tutto chiaro» nel frattempo
  const j1 = await game.evaluate(() => __natpfTennis.natpfPhone.state.joins);
  await phone.click('#relink');
  await game.waitForFunction(j => __natpfTennis.natpfPhone.state.joins > j && __natpfTennis.natpfPhone.connected, j1, { timeout: 20000 });
  await phone.waitForFunction(() => __racchetta.state.linkState === 'on' && __racchetta.state.screen === 'ready', null, { timeout: 8000 }).catch(() => {});
  await phone.waitForTimeout(1500);
  s = await snap(phone);
  check('«Ricollega» da «Pronto»: di nuovo «Pronto», nessun tutorial sul computer', s.screen === 'ready' && !s.tutOk && !(await game.evaluate(() => __natpfTennis.natpfUi.training.tutorialOpen)), JSON.stringify(s));

  // Ricalibra: calibrazione e di nuovo «Pronto», il tutorial non torna
  await phone.click('#recal');
  await phone.waitForFunction(() => __racchetta.state.screen === 'cal', null, { timeout: 5000 });
  s = await snap(phone);
  check('«Ricalibra»: calibrazione, senza tutorial né strumenti', s.screen === 'cal' && !s.tutOk && !s.tools && !(await game.evaluate(() => __natpfTennis.natpfUi.training.tutorialOpen)), JSON.stringify(s));
  await quickCalibrate(phone, QUICK_PLAN);
  const ready2 = await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 15000 }).then(() => true, () => false);
  await phone.waitForFunction(() => __racchetta.state.screen === 'ready', null, { timeout: 8000 }).catch(() => {});
  check('dopo la nuova calibrazione di nuovo «Pronto», nessun tutorial', ready2 && (await snap(phone)).screen === 'ready' && !(await game.evaluate(() => __natpfTennis.natpfUi.training.tutorialOpen)));

  // pagina ricaricata da «Pronto»: «Attiva i sensori», poi subito «Pronto» (profilo salvato), niente tutorial
  await phone.reload({ waitUntil: 'domcontentloaded' });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.screen === 'ready', null, { timeout: 8000 }).catch(() => {});
  await phone.waitForTimeout(800);
  s = await snap(phone);
  await pshot(phone, '09-ricaricata-pronto');
  check('pagina ricaricata da «Pronto»: di nuovo «Pronto» senza tutorial né calibrazione', s.screen === 'ready' && !s.tutOk && !(await game.evaluate(() => __natpfTennis.natpfUi.training.tutorialOpen)), JSON.stringify(s));

  // schermo spento in campo: pausa subito con da quanto; alla riaccensione il blocco vuole un tocco (iPhone) → velo
  await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal && __natpfTennis.natpfUi.phoneWatch.state === 'ok'; }, null, { timeout: 15000 }).catch(() => {});
  await phone.evaluate(() => { window.__mute = true; window.__setHidden(true); });
  const paused = await game.waitForFunction(() => __natpfTennis.natpfUi.phoneWatch.state === 'paused', null, { timeout: 3000, polling: 50 }).then(() => true, () => false);
  await game.waitForTimeout(2600);
  const holdTxt = await game.evaluate(() => document.getElementById('natpf-phone-hold')?.textContent || '');
  await gshot('pausa-schermo-spento');
  check('schermo spento: computer in pausa con da quanto e cosa fare', paused && /Schermo del telefono spento[^:]* da [23] s: riaccendi/.test(holdTxt), holdTxt);
  await phone.evaluate(() => { window.__wl.needTap = true; window.__mute = false; window.__setHidden(false); });
  const veil = await phone.waitForFunction(() => __racchetta.state.veil, null, { timeout: 4000, polling: 100 }).then(() => true, () => false);
  s = await snap(phone);
  await pshot(phone, '10-velo-tocca');
  check('riacceso senza blocco dello schermo (serve un tocco): velo «Tocca lo schermo per riprendere»', veil && s.wake === 0, JSON.stringify(s));
  // telefono calibrato: il velo dice che collegamento e calibrazione sono rimasti (phone-screen.veilText)
  const veilTxt = await phone.evaluate(() => document.getElementById('wakeVeilText').textContent);
  check('   velo di un telefono calibrato: «Il collegamento e la calibrazione sono rimasti.»', /Il collegamento e la calibrazione sono rimasti\.$/.test(veilTxt), veilTxt);
  const resumed = await game.waitForFunction(() => __natpfTennis.natpfUi.phoneWatch.state === 'ok', null, { timeout: 8000, polling: 100 }).then(() => true, () => false);
  check('il computer riprende da solo (sensori di nuovo attivi), senza tutorial né QR', resumed && !(await game.evaluate(() => __natpfTennis.natpfUi.training.tutorialOpen || !__natpfTennis.natpfUi.modal?.classList.contains('hidden'))));
  await phone.click('#wakeVeil');
  await phone.waitForTimeout(400);
  s = await snap(phone);
  await pshot(phone, '11-ripreso');
  check('un tocco sul velo: schermo tenuto acceso, velo chiuso, «Pronto»', !s.veil && s.wake === 1 && s.screen === 'ready', JSON.stringify(s));
  check('Allenamento: mai «Tutto chiaro» insieme a «Pronto» o agli strumenti', s.overlap === 0, JSON.stringify(await phone.evaluate(() => window.__overlap.slice(0, 5))));
  check('Allenamento: nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].slice(0, 4).join(' | '));
  await phone.context().close(); await game.context().close();

  /* ================= 2. Ledwall: area di 720×720 nell'angolo della finestra ================= */
  {
    const { p: wall, errs: wallErrs } = await page(B, GAME_URL('&area=0,0,720,720'), { w: 1280, h: 720 });
    await wall.waitForFunction(() => window.__natpfTennis?.natpfUi?.training?.tutorial && window.__natpfTennis.player?.model, null, { timeout: 120000 });
    await wall.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; E.natpfUi.intro?.skip?.(); });
    await wall.evaluate(() => { const T = __natpfTennis.natpfUi.training.tutorial; T.openFor({ mode: 'phone', after: 'cal' }); T.go(2); });
    await wall.waitForTimeout(800);
    const gw = await wall.evaluate(() => { const r = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }; const root = document.getElementById('natpf-tutorial'); return { card: r(root.querySelector('.tut-card')), prev: r(root.querySelector('.tut-prev')), next: r(root.querySelector('.tut-next')), stage: r(root.querySelector('.tut-stage')) }; });
    await gshot('ledwall-720x720-dritto', wall);
    const inside = gw.card.x >= 0 && gw.card.y >= 0 && gw.card.x + gw.card.w <= 720 && gw.card.y + gw.card.h <= 720;
    check('ledwall 720×720: modale dentro l’area, centrata, frecce in basso, animazione 16:10', inside && Math.abs(gw.card.x + gw.card.w/2 - 360) <= 3 && Math.abs(gw.card.y + gw.card.h/2 - 360) <= 3 && gw.prev.y > gw.card.y + gw.card.h*.7 && Math.abs(gw.stage.w/gw.stage.h - 1.6) < .03, JSON.stringify(gw));
    check('ledwall: nessun errore JavaScript', !wallErrs.length, wallErrs.slice(0, 3).join(' | '));
    await wall.context().close();
  }

  /* ================= 3. Stesso schermo: due telefoni, due tutorial indipendenti ================= */
  {
    const { p: pc, errs: pcErrs } = await page(B, GAME_URL(), { w: 1280, h: 720 });
    await pc.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
    await pc.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; E.natpfUi.intro?.skip?.(); });
    await pc.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
    await pc.evaluate(h => __natpfTennis.natpfUi.hand.set(h), HAND);
    await pc.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.setMode('split'); L.go('connect'); });
    await pc.waitForFunction(() => __natpfTennis.natpfPhone.pairingUrl && __natpfTennis.natpfPhone2?.pairingUrl && __natpfTennis.natpfPhone2.state.state === 'waiting', null, { timeout: 30000 });
    const [u1, u2] = await pc.evaluate(() => [__natpfTennis.natpfPhone.pairingUrl, __natpfTennis.natpfPhone2.pairingUrl]);
    const { p: ph1, errs: e1 } = await page(B, u1, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
    const { p: ph2, errs: e2 } = await page(B, u2, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
    for (const ph of [ph1, ph2]) await ph.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
    await ph1.click('#enable'); await ph2.click('#enable');
    for (const ph of [ph1, ph2]) await ph.waitForFunction(() => __racchetta.state.screen === 'tutorial' && __racchetta.state.gate?.n > 0, null, { timeout: 10000 });
    const halves = () => pc.evaluate(() => { const S = __natpfTennis.natpfUi.split; return { open: { ...S.tutOpen }, idx: { p1: S.tut.p1.state?.idx, p2: S.tut.p2.state?.idx }, all: { p1: !!S.tut.p1.state?.all, p2: !!S.tut.p2.state?.all } }; });
    // P1 avanti di due, P2 resta alla prima: le due metà sono indipendenti
    await nextCard(ph1); await nextCard(ph1);
    let h = await halves();
    const s1 = await snap(ph1), s2 = await snap(ph2);
    const sg = await pc.evaluate(() => { const r = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }; return ['p1', 'p2'].map(id => r(document.querySelector(`#split-tut-${id} .tut-card`))); });
    await gshot('stesso-schermo-1280x720', pc);
    await pshot(ph1, '12-stesso-schermo-p1');
    // B16 (decisione dell'utente dell'08/11 sera): prima della partita il tutorial corto, 5 schede per ciascun telefono
    // (presa, posizione, dritto, rovescio, servizio); nell'Allenamento (sopra) restano tutte le 11
    const cards = await pc.evaluate(() => ['p1', 'p2'].map(id => ({ n: __natpfTennis.natpfUi.split.tut[id].state?.cards, ids: __natpfTennis.natpfUi.split.tut[id].cards.map(c => c.id).join(','), dots: document.querySelectorAll(`#split-tut-${id} .tut-dot`).length })));
    check('stesso schermo: tutorial corto, 5 schede per telefono (sul telefono «Scheda 3 di 5»)', cards.every(c => c.n === 5 && c.dots === 5 && c.ids === 'grip,ready,forehand,backhand,serve') && s1.gate.n === 5 && s2.gate.n === 5 && /Scheda 3 di 5/.test(s1.where), JSON.stringify({ cards, w1: s1.where, w2: s2.where }));
    check('stesso schermo: due modali, ciascuna al centro della sua metà (non a tutta metà), frecce del P1 muovono solo la sua', h.open.p1 && h.open.p2 && h.idx.p1 === 2 && h.idx.p2 === 0 && s1.gate.i === 2 && s2.gate.i === 0
      && Math.abs(sg[0].x + sg[0].w/2 - 320) <= 4 && Math.abs(sg[1].x + sg[1].w/2 - 960) <= 4 && sg[0].w <= 640*.8 && sg[0].h <= 720*.8, JSON.stringify({ h, sg }));
    await pc.setViewportSize({ width: 1920, height: 1080 }); await pc.waitForTimeout(600);
    await gshot('stesso-schermo-1920x1080', pc);
    await pc.setViewportSize({ width: 1280, height: 720 }); await pc.waitForTimeout(400);
    // P1 vede tutto e conferma: calibra e diventa pronto; il P2 resta nel suo tutorial con il pulsante spento
    check('stesso schermo: P1 vede tutte le schede, il suo pulsante si accende', await seeAllCards(ph1));
    check('stesso schermo: il pulsante del P2 resta spento', !(await snap(ph2)).tutOn);
    await ph1.click('#tutOk');
    await quickCalibrate(ph1, QUICK_PLAN);
    const p1ready = await pc.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 15000 }).then(() => true, () => false);
    await ph1.waitForFunction(() => __racchetta.state.screen === 'ready', null, { timeout: 8000 }).catch(() => {});
    h = await halves();
    const p1 = await snap(ph1), p2 = await snap(ph2);
    await gshot('stesso-schermo-p1-pronto-p2-tutorial', pc);
    await pshot(ph1, '13-stesso-schermo-p1-pronto'); await pshot(ph2, '14-stesso-schermo-p2-tutorial');
    check('stesso schermo: P1 «Pronto» con gli strumenti, la sua metà chiusa; P2 ancora nel tutorial', p1ready && p1.screen === 'ready' && p1.tools && !p1.tutOk && !h.open.p1 && h.open.p2 && p2.screen === 'tutorial' && !p2.tools, JSON.stringify({ h, p1, p2 }));
    // P1 ricollega (come dopo lo schermo spento): la sua metà non riapre il tutorial
    const j = await pc.evaluate(() => __natpfTennis.natpfPhone.state.joins);
    await ph1.click('#relink');
    await pc.waitForFunction(j => __natpfTennis.natpfPhone.state.joins > j && __natpfTennis.natpfPhone.connected, j, { timeout: 20000 });
    await pc.waitForTimeout(1500);
    h = await halves();
    check('stesso schermo: P1 ricollegato, il tutorial della sua metà non torna', !h.open.p1 && (await snap(ph1)).screen === 'ready', JSON.stringify(h));
    // P2: dal telefono fino in fondo, poi «Tutto chiaro»
    check('stesso schermo: P2 sfoglia le sue schede e il suo pulsante si accende', await seeAllCards(ph2));
    await ph2.click('#tutOk');
    await ph2.waitForFunction(() => __racchetta.state.screen === 'cal', null, { timeout: 5000 }).catch(() => {});
    h = await halves();
    check('stesso schermo: «Tutto chiaro» del P2 chiude solo la sua metà e avvia la sua calibrazione', !h.open.p2 && (await snap(ph2)).screen === 'cal', JSON.stringify(h));
    const ov = (await snap(ph1)).overlap + (await snap(ph2)).overlap;
    check('stesso schermo: mai «Tutto chiaro» insieme a «Pronto» o agli strumenti', ov === 0);
    check('stesso schermo: nessun errore JavaScript', ![...pcErrs, ...e1, ...e2].length, [...pcErrs, ...e1, ...e2].slice(0, 4).join(' | '));
  }
} catch (e){ console.error(e); check('prova completata senza eccezioni', false, e.message); }
finally { await B.close(); stop(); }
summary();
setTimeout(() => process.exit(), 300);
