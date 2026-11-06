// NATPF motore base (natpf-tennis/): «Stesso schermo» con due telefoni simulati, stato «pronto» di ciascun giocatore e
// conto alla rovescia (B9, punto 4; natpf_ready.js, natpf_split_ui.js). Percorso di chi gioca, con i comandi veri:
//   1. menu → Gioca → Stesso schermo, nomi «Giulia» e «Marco»: due schede «In attesa» con il QR;
//   2. i due telefoni si collegano e attivano i sensori: tutorial nelle due metà, schede «Si prepara · Tutorial»;
//   3. Giulia «ho capito» e calibra: la sua scheda diventa «Pronto» (verde su tutti i lati), Marco ancora nel tutorial;
//      la barra dice chi manca, nessun conto;
//   4. Marco «ho capito» e calibra: conto alla rovescia di 3 s grande sul computer e sui telefoni, poi si gioca senza
//      toccare il computer (niente salto a «Partita»);
//   5. di nuovo nella pagina dei telefoni (tutti e due pronti): il conto riparte; Esc lo ferma («Aspetta»), «Gioca»
//      nella barra fa partire;
//   6. di nuovo, e durante il conto il telefono di Marco si chiude: conto annullato con il motivo, scheda «Scollegato»,
//      nessuna partita; pagina «Partita»: schede dal vivo e «Gioca» grigio e spento.
// Schermate a 1280×720, 1920×1080 e in un'area di ledwall 720×720 (come ?area=0,0,720,720), e dei telefoni (390×844).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-split-ready.mjs     (OUT=cartella delle schermate)
// Eventi devicemotion sintetici e due pagine del telefono sulla stessa macchina: non sostituiscono due telefoni veri.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, seeAllCards } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9131), GAME_PORT = +(process.env.GAME_PORT || 3131);
const OUT = path.join(SP, 'split-ready'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(1).padStart(5)} s] ${m}`);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono in verticale (come natpf-training-flow.mjs): gamma = rotazione attorno alla verticale
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
};

// stato delle schede, della barra, del riquadro del conto e di «Gioca» come li vede chi guarda il computer
const view = g => g.evaluate(() => {
  const vis = el => !!el && !el.classList.contains('hidden') && el.offsetParent !== null && el.getBoundingClientRect().height > 0;
  const card = id => {
    const el = document.querySelector(`[data-split-player="${id}"]`); if (!el) return null;
    const cs = getComputedStyle(el), badge = el.querySelector('.ready-badge'), bs = badge && getComputedStyle(badge);
    return { ready: el.dataset.ready, name: el.querySelector('[data-ready-name]')?.textContent, word: el.querySelector('[data-ready-word]')?.textContent, status: el.querySelector('.split-status b')?.textContent,
      borders: [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor], badgeBg: bs?.backgroundColor, badgeColor: bs?.color };
  };
  const bar = document.getElementById('split-ready-bar'), ov = document.getElementById('split-countdown'), sb = document.getElementById('btn-start-match');
  const L = __natpfTennis.natpfUi.lobby, S = __natpfTennis.natpfUi.split;
  return { step: L.step, visible: L.visible, p1: card('p1'), p2: card('p2'),
    bar: bar && { mode: bar.dataset.readyBar, border: getComputedStyle(bar).borderTopColor, title: bar.querySelector('[data-ready-bar-title]')?.textContent, sub: bar.querySelector('[data-ready-bar-sub]')?.textContent, hold: vis(bar.querySelector('[data-split-hold]')), play: vis(bar.querySelector('[data-split-play]')), inView: (() => { const r = bar.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })() },
    overlay: vis(ov) ? { num: ov.querySelector('[data-split-count]')?.textContent, sub: ov.querySelector('[data-split-count-names]')?.textContent } : null,
    cd: { ...S.cd }, session: !!__natpfTennis.natpfSplit?.active, phase: __natpfTennis.phase,
    // cosa può fermare il conto: pannelli aperti, guida, calibrazione dello schermo
    blockers: [...document.querySelectorAll('.natpf-sheet-backdrop')].filter(m => !m.classList.contains('hidden')).map(m => m.id || m.className).concat(L.onboarding?.isOpen ? ['guida'] : [], __natpfTennis.natpfUi.calibra?.isOpen ? ['calibra'] : []),
    start: sb && { disabled: sb.disabled, cls: sb.className, bg: getComputedStyle(sb).backgroundColor } };
});
const phoneView = p => p.evaluate(() => ({ big: document.getElementById('big')?.textContent, arrow: document.getElementById('arrow')?.textContent, sub: document.getElementById('sub')?.textContent, ring: document.getElementById('ring')?.className }));
const GREEN = 'rgb(54, 224, 122)', RED = 'rgb(255, 79, 97)';
// Calibrazione rapida che ripete il gesto non riconosciuto: con la grafica software e tre pagine aperte (computer con il
// tutorial animato, due telefoni) un gesto sintetico può andare perso, e quickCalibrate passa oltre lasciando la
// calibrazione ferma all'ultimo gesto. Qui si guarda il gesto che il telefono aspetta e lo si rifà finché è pronto
const calibrate = async (ph, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms){
    const s = await ph.evaluate(() => { const R = window.__racchetta, st = R.state; return { sensor: st.sensor, step: st.step, ready: !!R.cal.state.ready, idx: R.cal.state.idx }; });
    if (s.sensor === 'ready') return true;
    if (s.step === 'swings' && s.ready){ const sign = QUICK_PLAN[s.idx] === 'R' ? -1 : 1; await ph.evaluate(sg => __up.swing(sg).then(() => __up.back(sg)).then(() => __up.still(700)), sign); }
    else await ph.evaluate(() => __up.still(150));
  }
  return false;
};
const until = async (p, fn, arg, ms = 20000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);

const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // il disegno con la grafica software rallenta i fotogrammi: si disegna solo per le schermate
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const shot = async (name, el = g) => { if (el === g) await g.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await el.screenshot({ path: `${OUT}/${name}.png` }); log('schermata ' + name); };
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.menu('play'));
  await sleep(300);
  await g.click('[data-mode="split"]');
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'connect', null, { timeout: 8000 });
  await g.fill('[data-split-name="p1"]', 'Giulia'); await g.fill('[data-split-name="p2"]', 'Marco');
  await g.waitForFunction(() => __natpfTennis.natpfPhone.pairingUrl && __natpfTennis.natpfPhone2?.pairingUrl, null, { timeout: 30000 });
  await sleep(800);
  let v = await view(g);
  check('1. due schede con il nome scritto, «In attesa», barra «si parte da soli»', v.p1.name === 'Giulia' && v.p2.name === 'Marco' && v.p1.word === 'In attesa' && v.p2.ready === 'off' && v.bar.mode === 'wait' && /Aspetto Giulia \(inquadra il QR\) e Marco/.test(v.bar.sub), JSON.stringify({ p1: v.p1.word, p2: v.p2.word, bar: v.bar.sub }));
  await shot('1-qr-1280');

  /* 2: telefoni collegati, sensori attivi, tutorial nelle due metà */
  const [u1, u2] = await g.evaluate(() => [__natpfTennis.natpfPhone.pairingUrl, __natpfTennis.natpfPhone2.pairingUrl]);
  const { p: ph1 } = await page(B, u1, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  const { ctx: c2, p: ph2 } = await page(B, u2, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  for (const ph of [ph1, ph2]) await ph.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  for (const ph of [ph1, ph2]){ await ph.waitForSelector('#enable:not(.hidden)', { timeout: 15000 }).catch(() => {}); await ph.click('#enable'); }
  const tutBoth = await until(g, () => { const S = __natpfTennis.natpfUi.split; return S.tutOpen.p1 && S.tutOpen.p2; });
  await sleep(600);
  v = await view(g);
  check('2. tutorial aperto nelle due metà: schede «Si prepara», stato «Guarda il tutorial» (prima «Attiva i sensori»)', tutBoth && v.p1.ready === 'prep' && v.p2.ready === 'prep' && /tutorial/i.test(v.p1.status) && /Giulia \(tutorial \d+\/\d+\) e Marco \(tutorial \d+\/\d+\)/.test(v.bar.sub), JSON.stringify({ p1: v.p1.status, bar: v.bar.sub }));
  await shot('2-tutorial-1280');

  /* 3: Giulia pronta, Marco ancora nel tutorial */
  await ph1.waitForSelector('#tutOk:not(.hidden)', { timeout: 15000 }); await seeAllCards(ph1); await ph1.click('#tutOk');
  check('   telefono di Giulia calibrato', await calibrate(ph1));
  const tCal1 = Date.now();
  const p1Ready = await until(g, () => document.querySelector('[data-split-player="p1"]')?.dataset.ready === 'ready');
  log(`P1 pronto sul computer ${Date.now() - tCal1} ms dopo la fine della calibrazione simulata`);
  await sleep(500);
  v = await view(g);
  check('3. Giulia «Pronto»: distintivo verde pieno con testo scuro, bordo verde su tutti i lati', p1Ready && v.p1.word === 'Pronto' && v.p1.badgeBg === GREEN && v.p1.borders.every(c => c === GREEN), JSON.stringify({ word: v.p1.word, bg: v.p1.badgeBg, borders: v.p1.borders }));
  check('   Marco ancora nel tutorial: nessun conto, la barra dice chi manca', v.p2.ready === 'prep' && !v.cd.running && !v.overlay && v.bar.mode === 'wait' && /^Aspetto Marco \(tutorial/.test(v.bar.sub), v.bar.sub);
  await shot('3-p1-pronto-1280');
  await shot('3-telefono-giulia-pronto', ph1);

  /* 4: Marco pronto → conto alla rovescia → si gioca senza toccare il computer. La calibrazione simulata finisce con
     qualche istante di telefono fermo: il conto può partire (e finire) prima che lo script torni, quindi si registra
     tutto nella pagina, ogni 20 ms (computer) e a ogni cambio (telefono) */
  await g.evaluate(() => {
    window.__cdLog = []; let last = '';
    window.__cdRec = setInterval(() => {
      const ov = document.getElementById('split-countdown'), L = __natpfTennis.natpfUi.lobby;
      const k = [__natpfTennis.natpfPhone2.ready ? 'p2' : '-', ov.classList.contains('hidden') ? '-' : ov.querySelector('[data-split-count]').textContent, L.visible ? L.step : 'campo', __natpfTennis.natpfSplit?.active ? 'split' : '-'].join(' ');
      if (k !== last){ last = k; window.__cdLog.push({ t: Math.round(performance.now()), k }); }
    }, 20);
  });
  const phoneRec = ph => ph.evaluate(() => { window.__phLog = []; let last = ''; setInterval(() => { const k = `${document.getElementById('big').textContent}|${document.getElementById('arrow').textContent}`; if (k !== last){ last = k; window.__phLog.push(k); } }, 20); });
  await phoneRec(ph1); await phoneRec(ph2);
  await ph2.waitForSelector('#tutOk:not(.hidden)', { timeout: 15000 }); await seeAllCards(ph2); await ph2.click('#tutOk');
  check('   telefono di Marco calibrato', await calibrate(ph2));
  const started = await until(g, () => !!__natpfTennis.natpfSplit?.active && !__natpfTennis.natpfUi.lobby.visible && ['SERVE_STANCE', 'SERVE_TOSS'].includes(__natpfTennis.phase), null, 15000);
  const cdLog = await g.evaluate(() => { clearInterval(window.__cdRec); return window.__cdLog; });
  log('conto: ' + cdLog.map(e => `${e.t}:${e.k}`).join(' · '));
  const at = re => cdLog.find(e => re.test(e.k))?.t;
  const tReady = at(/^p2 /), t3 = at(/^p2 3 /), t2 = at(/^p2 2 /), t1 = at(/^p2 1 /), tGo = at(/ split$/);
  check('4. Marco pronto: subito il conto grande 3, 2, 1 sul computer, restando nella pagina dei telefoni', tReady != null && t3 - tReady < 400 && t2 > t3 && t1 > t2 && !cdLog.some(e => / match /.test(e.k)), `pronto→3 ${t3 - tReady} ms, 3→2 ${t2 - t3} ms, 2→1 ${t1 - t2} ms`);
  check('   a zero si gioca da soli (sessione divisa, servizio), 3 s dopo il «3», senza toccare il computer', started && tGo - t3 > 2700 && tGo - t3 < 3600, `${tGo - t3} ms`);
  const phLog = await ph2.evaluate(() => window.__phLog), ph1Log = await ph1.evaluate(() => window.__phLog);
  log('telefono di Marco: ' + phLog.join(' · '));
  for (const [who, l] of [['Marco', phLog], ['Giulia', ph1Log]])
    check(`   telefono di ${who}: «Si gioca tra 3, 2, 1», poi «Si gioca!»`, ['Si gioca tra|3', 'Si gioca tra|2', 'Si gioca tra|1', 'Si gioca!|'].every(k => l.includes(k)), l.filter(k => /gioca/.test(k)).join(' · '));
  await sleep(400);
  await shot('4b-partita-1280');

  // di nuovo nella pagina dei telefoni, con tutti e due pronti (il tutorial non torna: già visto in questa sessione)
  const backToPhones = () => g.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.backToMenu(); ui.lobby.menu('play'); ui.lobby.setMode('split'); ui.lobby.go('connect'); });
  await backToPhones();
  const again = await until(g, () => !document.getElementById('split-countdown').classList.contains('hidden'), null, 8000);
  v = await view(g);
  check('5. di nuovo nella pagina dei telefoni, tutti e due pronti: il conto riparte', again && v.overlay && /Giulia e Marco, tenete il telefono/.test(v.overlay.sub) && v.bar.mode === 'count', JSON.stringify({ overlay: v.overlay, bar: v.bar.mode, blockers: v.blockers }));
  await g.screenshot({ path: `${OUT}/5-conto-1280.png` });
  const pv = await phoneView(ph2);
  await shot('5-telefono-marco-conto', ph2);
  check('   sul telefono: «Si gioca tra» con il numero, anello verde', pv.big === 'Si gioca tra' && /^[123]$/.test(pv.arrow) && /ready/.test(pv.ring), JSON.stringify(pv));
  /* 5: Esc ferma il conto; schermate a 1920×1080 e nell'area del ledwall */
  await g.keyboard.press('Escape');
  await sleep(300);
  v = await view(g);
  check('   Esc: conto fermato («Aspetta»), si resta nella pagina, «Gioca» nella barra', !v.overlay && v.step === 'connect' && v.cd.held && v.bar.mode === 'held' && v.bar.play && !v.bar.hold, JSON.stringify(v.bar));
  const phHeld = await phoneView(ph1);
  check('   i telefoni lo sanno («Aspetta»)', phHeld.big === 'Aspetta' && /fermata/.test(phHeld.sub), JSON.stringify(phHeld));
  await sleep(3500);
  check('   fermo: nessuna partita dopo 3,5 s', !(await view(g)).session);
  await shot('5-aspetta-1280');
  // conto congelato a 3 per le schermate (il vero dura 3 s e la grafica software è lenta)
  const freeze = on => g.evaluate(on => { const S = __natpfTennis.natpfUi.split; if (on){ S.__cd = S.countdown; S.countdown = { running: true, update: go => ({ left: 3, fire: false, running: !!go, cancelled: false }), reset(){} }; S.cd.held = false; } else { S.countdown = S.__cd; S.countdown.reset(); S.cd.held = true; } }, on);
  await freeze(true); await sleep(300);
  await g.setViewportSize({ width: 1920, height: 1080 }); await sleep(500);
  v = await view(g);
  check('   1920×1080: conto e barra in vista', !!v.overlay && v.bar.inView, JSON.stringify({ overlay: v.overlay, bar: v.bar.inView }));
  await shot('5b-conto-1920');
  await freeze(false); await sleep(300);
  await shot('5c-schede-1920');
  await g.setViewportSize({ width: 1280, height: 720 });
  await g.evaluate(() => __natpfTennis.natpfUi.screen.restore({ preset: 'full', area: { x: 0, y: 0, w: 720, h: 720 }, margins: {} }));
  await sleep(500);
  await freeze(true); await sleep(300);
  await shot('5d-conto-ledwall-720');
  await freeze(false); await sleep(300);
  await shot('5e-schede-ledwall-720');
  await g.evaluate(() => __natpfTennis.natpfUi.screen.restore({ preset: 'full', area: null, margins: {} }));
  await sleep(300);
  // «Gioca» nella barra: si parte
  await g.click('#split-ready-bar [data-split-play]');
  check('   «Gioca» nella barra: si gioca', await until(g, () => !!__natpfTennis.natpfSplit?.active, null, 8000));

  /* 6: telefono che cade durante il conto */
  await backToPhones();
  await until(g, () => !document.getElementById('split-countdown').classList.contains('hidden'), null, 8000);
  await ph2.close();
  const cancelled = await until(g, () => document.getElementById('split-ready-bar').dataset.readyBar === 'cancel', null, 12000);
  v = await view(g);
  check('6. il telefono di Marco si chiude durante il conto: conto annullato con il motivo, scheda «Scollegato»', cancelled && !v.overlay && /^Conto annullato · Marco: telefono scollegato/.test(v.bar.title) && v.p2.ready === 'ko' && v.p2.word === 'Scollegato', JSON.stringify({ bar: v.bar.title, p2: v.p2.word }));
  const ph1v = await phoneView(ph1);
  check('   il telefono di Giulia dice perché («Aspetta»)', ph1v.big === 'Aspetta' && /Marco/.test(ph1v.sub), JSON.stringify(ph1v));
  // prima il telefono (l'avviso dura 2,4 s), poi il computer a transizioni finite (bordi rossi, non a metà dal verde)
  await shot('6-telefono-giulia-annullato', ph1);
  await sleep(500);
  v = await view(g);
  check('   scheda di Marco e barra con il bordo rosso (problema)', v.p2.borders.every(c => c === RED) && v.bar.border === RED, JSON.stringify({ card: v.p2.borders, bar: v.bar.border }));
  await shot('6-annullato-1280');
  await sleep(4000);
  v = await view(g);
  check('   nessuna partita, si resta nella pagina dei telefoni', !v.session && v.step === 'connect' && v.visible);
  // pagina «Partita»: schede dal vivo, «Gioca» grigio e spento
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.go('match'));
  await sleep(600);
  const m = await g.evaluate(() => { const b = document.getElementById('split-ready-board'), sb = document.getElementById('btn-start-match'); return { slots: [...b.querySelectorAll('[data-ready-slot]')].map(s => `${s.querySelector('[data-ready-name]').textContent}:${s.dataset.ready}`), boardVisible: b.getBoundingClientRect().height > 0, disabled: sb.disabled, bg: getComputedStyle(sb).backgroundColor, note: document.getElementById('lobby-match-note').textContent }; });
  check('   pagina «Partita»: schede dal vivo (Giulia pronta, Marco scollegato), «Gioca» grigio e spento', m.boardVisible && m.slots.join() === 'Giulia:ready,Marco:ko' && m.disabled && m.bg !== 'rgb(227, 255, 54)', JSON.stringify(m));
  await shot('7-partita-gioca-spento-1280');
  check('nessun errore nella pagina del gioco', !errs.length, errs.slice(0, 3).join(' | '));
} catch (e){ check('prova completata senza eccezioni', false, e.stack || String(e)); }
finally {
  await B.close(); stop();
  summary();
  setTimeout(() => process.exit(), 300);
}
