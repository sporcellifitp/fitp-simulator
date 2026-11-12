// NATPF motore base (natpf-tennis/): «Allenamento» dal menu con il telefono simulato, dal QR alla fine della
// calibrazione in campo. Registra, ogni 100 ms, che cosa mostrano il computer (pannello, gesto, giocatore, palla) e
// il telefono (scritta grande, freccia), per verificare che i due schermi chiedano la stessa cosa nello stesso momento
// e che il giocatore non si muova da solo mentre si aspetta il gesto.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-training-flow.mjs
//   HAND=left: lo stesso percorso per un mancino (B15): mano scelta nel gioco, il telefono la riceve, il computer gli chiede
//   prima il dritto (→) e poi il rovescio (←), la palla del gesto sta dal suo lato, l'esercizio «Dritto» ha la freccia →.
// Eventi devicemotion sintetici: non sostituiscono la prova con un telefono vero.
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';
import { calibrationPlan } from '../../site/js/tennis/calibration.js';
import { calSide } from '../../natpf-tennis/src/natpf/natpf_cal_view.js';

// mano di chi gioca (HAND=left per il mancino): il percorso della calibrazione chiede prima il dritto a tutti e due
const HAND = process.env.HAND === 'left' ? 'left' : 'right', FH = HAND === 'left' ? -1 : 1;
const QUICK_PLAN = calibrationPlan({ quick: true, hand: HAND }), ARROW = { L: '←', R: '→' };
const WANT_FH = QUICK_PLAN[0];   // il gesto del dritto (L per il destro, R per il mancino)

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9109), GAME_PORT = +(process.env.GAME_PORT || 3109);
const SHOTS = process.env.SHOTS === '1';            // schermate del computer a ogni passo (lente con la grafica software)
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono in verticale (come natpf-phone-upright.mjs): gamma = rotazione attorno alla verticale (dritto/rovescio)
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  // la mano ferma tra un gesto e l'altro: il telefono vero manda campioni di continuo
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
};

const B = await launch();
const log = [];
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // il disegno con la grafica software rallenta i fotogrammi: si disegna solo per le schermate
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const shot = async name => { if (!SHOTS) return; await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/training-${name}.png` }); };
  await game.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  // mano scelta nel gioco (una sola per tutto il gioco: va al telefono con la configurazione)
  await game.evaluate(h => __natpfTennis.natpfUi.hand.set(h), HAND);
  check(`mano «${HAND}» scelta nel gioco e salvata`, await game.evaluate(h => __natpfTennis.natpfUi.hand.hand === h && localStorage.getItem('natpf-tennis.hand') === h, HAND));
  await shot('0-menu');
  // menu → Allenamento → racchetta: smartphone → collega
  await game.click('[data-menu="training"]');
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'controller', null, { timeout: 5000 });
  await game.click('[data-page="controller"] [data-natpf-controller="phone"]');
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'connect', null, { timeout: 5000 });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  check('il telefono si collega dal QR del menu «Allenamento»', true);
  // la mano arriva al telefono (cfg) e il telefono la mostra: menu e figura della presa
  const phoneHand = await phone.waitForFunction(h => document.getElementById('hand')?.value === h ? { sel: document.getElementById('hand').value, art: document.getElementById('grip')?.dataset.hand || null } : null, HAND, { timeout: 8000 }).then(h => h.jsonValue(), () => null);
  check(`il telefono riceve la mano «${HAND}» dal gioco (menu e figura della presa)`, !!phoneHand && phoneHand.sel === HAND && (phoneHand.art == null || phoneHand.art === HAND), JSON.stringify(phoneHand));

  // registrazione dei due schermi ogni 100 ms (orologio del computer di prova, uguale per le due pagine)
  await game.evaluate(() => {
    window.__tl = [];
    const E = __natpfTennis, T = E.natpfUi.training, txt = id => document.getElementById(id)?.textContent || '';
    setInterval(() => __tl.push({ t: Date.now(), active: T.active, cal: !!T.cal, want: T.cal ? T.view.want : null, go: document.getElementById('coach-main')?.dataset.state === 'go', state: document.getElementById('coach-main')?.dataset.state || '', cue: document.getElementById('coach-cue')?.dataset.dir || '', coach: txt('coach-text'), sub: txt('coach-sub'), step: E.natpfPhone.cal.step, stage: T.cal ? T.view.stage : '', idx: T.cal ? T.view.idx : -1, phase: E.phase,
      px: +E.player.pos.x.toFixed(2), pz: +E.player.pos.z.toFixed(2), pv: +Math.hypot(E.player.vel.x, E.player.vel.z).toFixed(2), swing: E.player.swingType || '', swingT: +(E.player.swingTimer || 0).toFixed(2),
      bx: +E.ball.pos.x.toFixed(2), bz: +E.ball.pos.z.toFixed(2), live: !!E.ball.inPlay, ts: E.natpfTimeScale ?? 1, lobby: E.natpfUi.lobby.visible ? E.natpfUi.lobby.step : '' }), 100);
  });
  await phone.evaluate(() => {
    window.__tl = [];
    const txt = id => document.getElementById(id)?.textContent || '';
    setInterval(() => __tl.push({ t: Date.now(), big: txt('big'), sub: txt('sub'), arrow: txt('arrow'), step: __racchetta.state.step, sensor: __racchetta.state.sensor, ready: !!__racchetta.cal.state.ready, idx: __racchetta.cal.state.idx }), 100);
  });

  // colpi della calibrazione: per ogni gesto riconosciuto, che palla c'era e con che colpo l'ha presa il giocatore
  await game.evaluate(() => {
    const E = __natpfTennis, T = E.natpfUi.training; window.__hits = []; window.__cals = [];
    E.natpfPhone.onCal(e => __cals.push({ t: Date.now(), kind: e.kind, step: e.step, idx: e.idx, want: e.want, dir: e.dir, ok: e.ok, why: e.why }));
    // gesti scartati sul telefono e colpi arrivati al motore (diagnostica della prova)
    window.__diag = []; E.natpfPhone.onDiag((k, d) => __diag.push({ t: Date.now(), k, ...d })); E.natpfPhone.onSwing((ev, s) => __diag.push({ t: Date.now(), k: 'colpo', side: ev.side, shot: ev.natpf?.shot, dir: s?.dir, ignored: ev.ignored || null }));
    // … e che cosa arriva al motore (lato e mano all'impatto)
    const st = E._attemptPlayerRallyStrike.bind(E); E._attemptPlayerRallyStrike = (ev, auto) => { const r = st(ev, auto); __diag.push({ t: Date.now(), k: 'motore', src: ev.source, side: ev.side, hand: ev.hand || ev.natpf?.hand || null, dirX: ev.dirX, hit: r, swing: E.player.swingType }); return r; };
    const h = T._hitCal.bind(T);
    // il colpo si registra quando la palla è colpita davvero: dalla finestra d'impatto (22/10) lo swing aspetta che la
    // palla arrivi al punto d'impatto, e subito dopo il gesto la palla non è ancora partita (struck false, swing di prima)
    T._hitCal = (i, w) => {
      const ballX = +E.ball.pos.x.toFixed(2), rec = { idx: i, want: w, ballX, struck: false, swing: null, px: +E.player.pos.x.toFixed(2), at: performance.now() };
      h(i, w); __hits.push(rec);
      rec.trace = [];
      const poll = () => {
        if (rec.trace.length < 12) rec.trace.push([Math.round(performance.now() - rec.at), +E.ball.pos.z.toFixed(2), E.ball.lastHitter, E.pendingUserSwing ? +(E.pendingUserSwing.expiresAt - E.elapsedTime).toFixed(2) : null, E.phase, E.natpfTimeScale, E.natpfLastRacket?.whiff || E.lastWhiff || null]);
        if (E.ball.lastHitter === 'player'){ rec.struck = true; rec.swing = E.player.swingType; rec.ms = Math.round(performance.now() - rec.at); } else if (performance.now() - rec.at < 4000) requestAnimationFrame(poll);
      };
      poll();
    };
  });
  await phone.click('#enable');
  // sensori attivi: il telefono va subito al tutorial (aspettato già dalla pagina «Collega», revisione B9 del 06/11: prima
  // calibrava per ~0,76 s finché il tutorial non lo fermava)
  await phone.waitForFunction(() => __racchetta.state.sensor === 'idle' && __racchetta.state.screen === 'tutorial', null, { timeout: 8000 }).catch(async e => { console.log('telefono dopo «Attiva i sensori»:', JSON.stringify(await phone.evaluate(() => ({ state: __racchetta.state, cal: __racchetta.cal.state.step, big: document.getElementById('big')?.textContent, sub: document.getElementById('sub')?.textContent })))); throw e; });
  // si entra in campo da soli (telefono con i sensori attivi)
  const inField = await game.waitForFunction(() => __natpfTennis.natpfUi.training.active, null, { timeout: 8000 }).then(() => true, () => false);
  check('con i sensori attivi si entra nel campo d’allenamento', inField);
  // prima della calibrazione la modale del tutorial (04/11, compatta con le frecce dal 05/11): presa e gesti sul
  // computer, il telefono mostra «Tutto chiaro, ho capito»; toccato quello, parte la calibrazione (prima: lezione a passi
  // con «Avanti»). B28 (12/11): «Tutto chiaro» e la X sono accesi DA SUBITO, da qualunque scheda (prima spenti finché non
  // si erano viste tutte le schede, B9)
  const tut = await game.evaluate(() => ({ open: __natpfTennis.natpfUi.training.tutorialOpen, cards: document.querySelectorAll('#natpf-tutorial .tut-dot').length, arrows: document.querySelectorAll('#natpf-tutorial .tut-arrow').length, tabs: document.querySelectorAll('#natpf-tutorial .tut-tab').length, wait: document.querySelector('#natpf-tutorial .tut-wait')?.textContent || '', xOff: document.querySelector('#natpf-tutorial .tut-x')?.getAttribute('aria-disabled') === 'true', coachDemo: !document.getElementById('coach-demo')?.classList.contains('hidden') }));
  const phoneTut = await phone.waitForFunction(() => { const b = document.getElementById('tutOk'); return b && !b.classList.contains('hidden') ? { screen: __racchetta.state.screen, sensor: __racchetta.state.sensor, off: b.disabled, tools: !document.getElementById('tools').classList.contains('hidden'), big: document.getElementById('big').textContent } : null; }, null, { timeout: 8000 }).then(h => h.jsonValue(), () => null);
  await shot('0b-tutorial');
  check('modale del tutorial sul computer (11 schede, frecce ‹ ›, niente etichette, X in alto a destra accesa) e il telefono aspetta con «Tutto chiaro» acceso da subito', tut.open && tut.cards === 11 && tut.arrows === 2 && tut.tabs === 0 && !tut.xOff && /Tutto chiaro/.test(tut.wait) && !!phoneTut && phoneTut.screen === 'tutorial' && phoneTut.sensor === 'idle' && !phoneTut.off && !phoneTut.tools, JSON.stringify({ tut, phoneTut }));
  // le schede si sfogliano dal telefono («Avanti ›»): due schede, poi «Tutto chiaro» dalla terza, senza averle viste tutte
  for (let k = 0; k < 2; k++){ await phone.click('#tutNext'); await phone.waitForTimeout(350); }
  const lit = await game.evaluate(() => { const T = __natpfTennis.natpfUi.training.tutorial; return { idx: T.state.idx, all: T.state.all, seen: [...T.state.visited].sort((a, b) => a - b).join(','), timer: !!T.timer }; });
  check('schede sfogliate dal telefono (terza scheda, non tutte viste): «Tutto chiaro» e la X restano accesi', lit.idx === 2 && !lit.all && await phone.evaluate(() => !document.getElementById('tutOk').disabled), JSON.stringify(lit));
  check('   e la X in alto a destra è accesa', await game.evaluate(() => document.querySelector('#natpf-tutorial .tut-x')?.getAttribute('aria-disabled') === 'false'));
  await phone.click('#tutOk');
  const closed = await game.waitForFunction(() => !__natpfTennis.natpfUi.training.tutorialOpen && document.getElementById('natpf-tutorial').classList.contains('hidden'), null, { timeout: 5000 }).then(() => true, () => false);
  check('«Tutto chiaro, ho capito» sul telefono chiude la modale e avvia la calibrazione', closed && await phone.evaluate(() => __racchetta.state.sensor === 'cal' && document.getElementById('tutOk').classList.contains('hidden')));
  await shot('1-fermo');
  await phone.waitForFunction(() => __racchetta.state.step === 'swings', null, { timeout: 8000 });

  // chi gioca guarda il computer: fa il gesto quando il computer lo chiede (gesto grande al centro o pannello «Ora»)
  const gestures = [];
  for (let i = 0; i < QUICK_PLAN.length; i++){
    const t0 = Date.now();
    // il computer dice «Ora» con la freccia: è il momento del gesto (chi gioca guarda lo schermo, non il telefono)
    const asked = await game.waitForFunction(i => { const T = __natpfTennis.natpfUi.training; return T.cal && T.view.stage === 'gesture' && T.view.idx === i && document.getElementById('coach-main').dataset.state === 'go' ? T.view.want : null; }, i, { timeout: 12000, polling: 50 }).then(h => h.jsonValue(), () => null);
    // la palla aspetta dal lato del colpo chiesto (dritto del destro: a destra, x > 0) e il giocatore è al centro
    gestures.push({ i, asked, waitMs: Date.now() - t0, ball: await game.evaluate(() => { const E = __natpfTennis; return { bx: +E.ball.pos.x.toFixed(2), px: +E.player.pos.x.toFixed(2), live: E.ball.inPlay, frozen: E.natpfTimeScale === 0 }; }) });
    if (!asked) break;
    await shot(`2-gesto-${i + 1}`);
    const sign = asked === 'R' ? -1 : 1;
    // al primo gesto si sbaglia verso: il computer lo dice (stesso gesto da rifare) e la palla resta lì
    if (i === 0){
      await phone.evaluate(s => { window.__busy = true; return __up.swing(-s).then(() => { window.__busy = false; }); }, sign);
      const wrong = await game.waitForFunction(() => document.getElementById('coach-main').dataset.state === 'retry' ? { sub: document.getElementById('coach-sub').textContent, idx: __natpfTennis.natpfUi.training.view.idx, hits: __hits.length, bx: __natpfTennis.ball.pos.x, phone: null } : null, null, { timeout: 5000, polling: 20 }).then(h => h.jsonValue(), () => null);
      if (wrong) wrong.phone = await phone.evaluate(() => document.getElementById('big').textContent + ' ' + document.getElementById('arrow').textContent);
      check('gesto nel verso sbagliato: computer e telefono chiedono di rifarlo con la freccia giusta, nessun colpo', !!wrong && wrong.idx === 0 && wrong.hits === 0 && /altro verso/.test(wrong.sub) && wrong.bx*FH > .5 && new RegExp(`Altro verso ${ARROW[asked]}`).test(wrong.phone), JSON.stringify(wrong));
      await shot('2-gesto-sbagliato');
      await game.waitForFunction(() => document.getElementById('coach-main').dataset.state === 'go', null, { timeout: 8000, polling: 50 }).catch(() => {});
    }
    await phone.evaluate(s => { window.__busy = true; return __up.swing(s).then(() => __up.back(s)).then(() => { window.__busy = false; }); }, sign);
    // il colpo si vede sul computer
    const hit = await game.waitForFunction(n => __hits.length > n && (__hits[n].struck || performance.now() - __hits[n].at > 4000) ? __hits[n] : null, i, { timeout: 8000, polling: 50 }).then(h => h.jsonValue(), () => null);
    Object.assign(gestures[i], { hit: !!hit?.struck, swing: hit?.swing, hitBallX: hit?.ballX, ...(hit?.struck ? { ms: hit.ms } : { trace: hit?.trace }) });
    await phone.waitForTimeout(900);
  }
  const done = await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal; }, null, { timeout: 15000 }).then(() => true, () => false);
  await shot('3-pronto');
  // primo esercizio (Dritto, 2 colpi): palla vera dal lanciapalle, il computer dice «Ora» quando la palla è vicina
  const drill = [];
  if (process.env.DEBUG) await game.evaluate(() => { const E = __natpfTennis; window.__sw = []; const h = E._handleUserSwingInput.bind(E); E._handleUserSwingInput = ev => { const r = E.ball.pos.z - E.player.pos.z; __sw.push({ r: +r.toFixed(2), lead: +((-.1 - r)/Math.max(.5, E.ball.vel.z)).toFixed(3), y: +E.ball.pos.y.toFixed(2), vz: +E.ball.vel.z.toFixed(1), b: E.ball.bounceCountOnCurrentSide, px: +E.player.pos.x.toFixed(2), bx: +E.ball.pos.x.toFixed(2), lat: ev.natpf?.latency }); h(ev); __sw.at(-1).pending = !!E.pendingUserSwing; __sw.at(-1).exp = E.pendingUserSwing ? +(E.pendingUserSwing.expiresAt - E.elapsedTime).toFixed(3) : null; __sw.at(-1).diff = E.matchConfig.difficulty; }; const w = E._natpfEarlyWhiff.bind(E); E._natpfEarlyWhiff = ps => { __sw.push({ whiff: true, r: +(E.ball.pos.z - E.player.pos.z).toFixed(2), vz: +E.ball.vel.z.toFixed(1), y: +E.ball.pos.y.toFixed(2), dist: +Math.hypot(E.ball.pos.x - E.player.pos.x, E.ball.pos.z - E.player.pos.z).toFixed(2), phase: E.phase }); w(ps); }; });
  for (let k = 0; k < 4 && drill.filter(d => d.ok).length < 2; k++){
    const hot = await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal && T.drill?.id === 'forehand' && document.getElementById('coach-main').dataset.state === 'go' ? { cue: document.getElementById('coach-cue').dataset.dir, title: document.getElementById('coach-text').textContent } : null; }, null, { timeout: 15000, polling: 20 }).then(h => h.jsonValue(), () => null);
    if (!hot) break;
    if (k === 0){
      await shot('4-esercizio-dritto');
      // (verifica dell'integrazione B15) la scheda dell'esercizio sta dalla parte opposta al punto d'impatto: in basso a
      // sinistra per il destro, in basso a destra per il mancino (prima copriva racchetta e corpo del mancino a «Ora!»)
      const box = await game.evaluate(() => { const r = document.getElementById('coach-main').getBoundingClientRect(), d = document.getElementById('coach-demo')?.getBoundingClientRect(); return { cx: (r.left + r.right)/2, w: innerWidth, demo: d && d.width ? (d.left + d.right)/2 : null }; });
      check(`scheda dell'esercizio lontana dal punto d'impatto del ${HAND === 'left' ? 'mancino (a destra)' : 'destro (a sinistra)'}`, HAND === 'left' ? box.cx > box.w/2 && (box.demo == null || box.demo < box.w/2) : box.cx < box.w/2 && (box.demo == null || box.demo > box.w/2), JSON.stringify(box));
    }
    const before = await game.evaluate(() => __natpfTennis.natpfUi.training.progress.done);
    // tempo di reazione di una persona al segnale «Ora» (~0,25 s), poi il gesto (picco a metà, dopo 120 ms)
    await phone.evaluate(s => { window.__busy = true; return new Promise(r => setTimeout(r, 250)).then(() => __up.swing(s)).then(() => { window.__busy = false; }); }, FH);
    const res = await game.waitForFunction(b => { const T = __natpfTennis.natpfUi.training; return T.progress.done > b || T.drill?.id !== 'forehand' || T.progress.tries > 0 ? { done: T.progress.done, tries: T.progress.tries, drill: T.drill?.id, flash: T.flash?.text } : null; }, before, { timeout: 6000, polling: 50 }).then(h => h.jsonValue(), () => null);
    drill.push({ ...hot, ok: !!res && (res.done > before || res.drill !== 'forehand'), res });
    await game.waitForTimeout(400);
  }
  if (process.env.DEBUG) console.log(JSON.stringify(await game.evaluate(() => __sw)));
  // riquadro «Guarda e ripeti» degli esercizi: animazione compatta 200×200 che gira; sotto la modale «Rivedi i gesti» si
  // ferma (prima continuava a disegnare: due animazioni insieme), richiusa la modale riparte (revisione tecnica B9)
  const coach = await game.evaluate(async () => {
    const ui = __natpfTennis.natpfUi, T = ui.training, D = (await import('/src/natpf/natpf_gesture_demo.js')).getGestureDemo('coach');
    const wait = ms => new Promise(r => setTimeout(r, ms)), before = { run: D.running, id: D.id, compact: D.compact, w: D.w };
    T.tutorial.openFor({ mode: 'review' }); await wait(400);
    const f0 = D.frames; await wait(500); const under = { run: D.running, frames: D.frames - f0 };
    T.tutorial.close('review'); await wait(400);
    return { before, under, after: D.running };
  });
  check('esercizio: «Guarda e ripeti» compatta che gira, ferma sotto la modale «Rivedi i gesti», riparte dopo', coach.before.run && coach.before.compact && coach.before.w === 200 && !coach.under.run && coach.under.frames === 0 && coach.after, JSON.stringify(coach));
  check(`esercizio «Dritto»: freccia ${ARROW[WANT_FH]} sul computer, «Ora» quando la palla arriva, colpi contati`, drill.filter(d => d.ok).length >= 2 && drill.every(d => d.cue === WANT_FH && /Dritto/i.test(d.title)), JSON.stringify(drill) + ' · telefono: ' + JSON.stringify(await game.evaluate(() => __diag.slice(-8))));
  const tl = await game.evaluate(() => __tl), ptl = await phone.evaluate(() => __tl);
  const cals = await game.evaluate(() => __cals);
  writeFileSync(`${SP}/training-timeline.json`, JSON.stringify({ gestures, game: tl, phone: ptl, cals }, null, 0));
  check(`${QUICK_PLAN.length} gesti chiesti dal computer, nell’ordine dritto/rovescio, e riconosciuti`, gestures.length === QUICK_PLAN.length && gestures.every(g => g.asked && g.hit) && gestures.map(g => g.asked).join('') === QUICK_PLAN.join(''), JSON.stringify(gestures));
  // la palla di ogni gesto sta dal lato di quel colpo e il giocatore colpisce con quel colpo (prima: dritto su una palla
  // mandata al rovescio, quando il gesto arrivava prima della palla)
  // (dritto del destro: palla a destra, x > 0; del mancino: a sinistra)
  check('palla dal lato del colpo chiesto, ferma, giocatore al centro', gestures.every(g => g.ball && g.ball.frozen && g.ball.live && Math.abs(g.ball.px) < .05 && (calSide(g.asked, HAND) === 'forehand' ? g.ball.bx*FH > .5 : g.ball.bx*FH < -.5)), JSON.stringify(gestures.map(g => g.ball)));
  check(`il giocatore colpisce con il colpo del gesto (dritto ${ARROW[WANT_FH]}, rovescio ${ARROW[QUICK_PLAN[1]]})`, gestures.every(g => g.swing === calSide(g.asked, HAND)), JSON.stringify(gestures.map(g => g.swing)));
  check('calibrazione completata in campo, si passa alle palle vere', done);

  // mentre il computer chiede un gesto (palla ferma davanti alla racchetta) il giocatore è fermo
  const asking = tl.filter(s => s.cal && s.go);
  const moving = asking.filter(s => s.pv > .2);
  check('giocatore fermo mentre si aspetta il gesto', asking.length > 0 && moving.length === 0, `${moving.length}/${asking.length} campioni in movimento`);
  // durante tutta la calibrazione il giocatore non attraversa il campo da solo
  const calSamples = tl.filter(s => s.cal), xs = calSamples.map(s => s.px);
  const travel = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  check('durante la calibrazione il giocatore non corre da un lato all’altro', travel < .8, `escursione ${travel.toFixed(2)} m`);
  // stesso gesto chiesto dai due schermi: freccia del telefono uguale a quella del computer quando il computer chiede.
  // Il telefono cambia gesto appena lo riconosce, il computer quando arriva il messaggio: campioni presi ogni 100 ms
  // nelle due pagine, discorde solo se nessun campione del telefono entro 150 ms mostra la stessa freccia (prima: il
  // campione subito prima e quello subito dopo, che con la macchina carica cadevano nei 5–25 ms del messaggio)
  const differs = (p, s) => p && p.arrow && p.arrow !== (s.want === 'L' ? '←' : '→');
  const near = t => ptl.filter(p => Math.abs(p.t - t) <= 150 && p.arrow);
  const mismatch = asking.filter(s => s.want && near(s.t).length && near(s.t).every(p => differs(p, s)));
  // ritardo tra i due schermi a ogni cambio di gesto: primo campione del telefono con il gesto nuovo → primo campione
  // del computer con lo stesso gesto (risoluzione 100 ms)
  const lags = [];
  for (let i = 1; i < ptl.length; i++){
    const a = ptl[i - 1].idx, b = ptl[i].idx; if (!(b > a) || ptl[i].step !== 'swings') continue;
    const pc = tl.find(s => s.t >= ptl[i - 1].t && s.cal && s.idx === b); if (pc) lags.push(Math.max(0, pc.t - ptl[i].t));
  }
  check('telefono e computer chiedono lo stesso gesto nello stesso momento', asking.length > 0 && mismatch.length === 0, `${mismatch.length} campioni discordi · ritardo del computer sul telefono ai cambi di gesto: ${lags.map(x => x + ' ms').join(', ') || '—'}`);
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
