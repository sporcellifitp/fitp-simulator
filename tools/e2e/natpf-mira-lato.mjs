// B16 · decisione (d) dell'utente sulla mira più sensibile («ok ma come lo misuro?»): il percorso della guida
// docs/GUIDA_MISURA_MIRA.md nel browser, con il telefono simulato (pagina del telefono, collegamento e motore veri).
//   1. Opzioni → «Mira del telefono»: si sceglie «Media · 20°», resta dopo aver ricaricato la pagina;
//   2. Maiusc+D: il pannello della diagnostica dice la mira in uso; «● Avvia registrazione»;
//   3. telefono collegato e calibrato, «Gioca» (pulsante vero della pagina «Partita»): partita 1 con la mira media, scambi
//      contro la CPU finché il telefono ha colpito almeno MIN colpi; poi menu → Opzioni → «Alta · 17°» → partita 2 corta;
//   4. «■ Ferma la registrazione»: il riassunto dice il lato delle palle per partita con il verdetto;
//   5. «⬇ Scarica il pacchetto»: lo zip ha la scheda nel rapporto, le righe nel LEGGIMI e latoPalle in metriche.json;
//   6. node scripts/audit/lato-palle.mjs sul pacchetto: le due partite con la loro sensibilità e il totale.
// Porte: GAME_PORT (3191) per il gioco, PEER_PORT (9191) per PeerJS. OUT: cartella del pacchetto e delle schermate.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-mira-lato.mjs
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, quickCalibrate } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';
import { readZip } from '../../natpf-tennis/src/natpf/diag/diag_zip.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9191), GAME_PORT = +(process.env.GAME_PORT || 3191), MIN = +(process.env.MIN || 22);
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
    run(fn, ms){ window.__busy = (window.__busy || 0) + 1; return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); window.__busy--; r(); } }, 16); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy && window.__moved) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  window.addEventListener('devicemotion', () => { window.__moved = true; }, { once: true });
};
const B = await launch();
try {
  const ctx = await B.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const gameUrl = `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`;
  let { p: game, errs: gameErrs } = await page(B, gameUrl, { context: ctx });
  const ready = () => game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await ready();
  // 1. Opzioni → Mira del telefono → Media · 20° (pulsanti veri della pagina)
  const openOptions = async () => {
    await game.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.onboarding?.isOpen && ui.onboarding.close(); if (!ui.lobby.visible) ui.backToMenu(); ui.lobby.go('menu'); });
    await game.click('[data-menu="options"]');
    await game.waitForSelector('[data-natpf-aim="media"]', { state: 'visible', timeout: 10000 });
  };
  await openOptions();
  const aimState = () => game.evaluate(() => ({ sel: [...document.querySelectorAll('[data-natpf-aim]')].filter(b => b.getAttribute('aria-checked') === 'true').map(b => b.dataset.natpfAim), note: document.getElementById('aim-note')?.textContent || '' }));
  check('Opzioni: di base la mira è «alta» (17°)', (await aimState()).sel.join() === 'alta', JSON.stringify(await aimState()));
  await game.click('[data-natpf-aim="media"]');
  const toast = await game.evaluate(() => document.getElementById('natpf-toast')?.textContent || '');
  check('Opzioni: «Media · 20°» scelta, con l’avviso', (await aimState()).sel.join() === 'media' && /media \(20°\)/.test(toast), toast);
  await game.waitForTimeout(600); await game.screenshot({ path: path.join(SP, 'mira-opzioni.png') });
  await game.reload({ waitUntil: 'domcontentloaded' }); await ready();
  await openOptions();
  check('Opzioni: la scelta resta dopo aver ricaricato la pagina', (await aimState()).sel.join() === 'media', JSON.stringify(await aimState()));
  // 2. Maiusc+D → pannello della diagnostica con la mira in uso → Avvia registrazione (senza video: la prova è sui dati)
  await game.evaluate(() => __natpfTennis.natpfUi.lobby.go('menu'));
  await game.keyboard.press('Shift+KeyD');
  await game.waitForSelector('.natpf-diag:not(.hidden) [data-diag="start"]', { timeout: 10000 });
  const panelAim = await game.textContent('.natpf-diag [data-aim-level]');
  check('diagnostica: il pannello dice la mira in uso', /Mira del telefono: media \(20°\)/.test(panelAim || ''), panelAim);
  for (const opt of ['webcamVideo', 'gameVideo']) if (await game.isChecked(`.natpf-diag [data-opt="${opt}"]`)) await game.click(`.natpf-diag [data-opt="${opt}"]`);
  await game.fill('.natpf-diag [data-label]', 'prova della mira (B16)');
  await game.click('.natpf-diag [data-diag="start"]');
  check('diagnostica: registrazione avviata', await game.waitForFunction(() => __natpfTennis.natpfUi.diag.recorder.active, null, { timeout: 15000 }).then(() => true, () => false));
  await game.evaluate(() => __natpfTennis.natpfUi.diag.close());
  // 3. telefono collegato e calibrato
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; E.natpfUi.selectController('phone', { open: false }); return E.natpfPhone.start(); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.step === 'still', null, { timeout: 5000 });
  await phone.evaluate(() => __up.still(1200));
  await quickCalibrate(phone, QUICK_PLAN);
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
  await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
  check('telefono calibrato', await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false));
  // «Gioca» dalla pagina «Partita» (pulsante vero: onStartMatch → startNewMatch, l'evento «partita» della diagnostica)
  const startMatch = async () => {
    await game.evaluate(() => { const ui = __natpfTennis.natpfUi; if (!ui.lobby.visible) ui.backToMenu(); ui.lobby.setMode('cpu'); ui.lobby.go('match'); });
    await game.waitForSelector('#btn-start-match', { state: 'visible', timeout: 10000 });
    await game.click('#btn-start-match');
    await game.waitForFunction(() => !__natpfTennis.natpfUi.lobby.visible && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase), null, { timeout: 15000 });
  };
  // scambi contro la CPU nella partita appena cominciata (come natpf-rally.mjs): una palla della CPU verso chi gioca, il
  // robot fa il gesto quando la palla arriva al punto d'impatto, dritto o rovescio dal lato del piano
  await game.evaluate(() => {
    const E = __natpfTennis; window.__contact = 0;
    const strike = E._attemptPlayerRallyStrike.bind(E);
    E._attemptPlayerRallyStrike = (e, t) => { const r = strike(e, t); if (r && !t) window.__contact++; return r; };
    window.__rally = () => {
      E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false; E.player.pos.set(0, 0, 11.4); E.player.targetPos.copy(E.player.pos);
      Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1 });
      E.ball.pos.set(-.5, 1, -11); E._launchBallToTarget(E.ball.pos, new E.ball.pos.constructor(Math.random()*3 - 1.5, 0, 8.6), 1.05, { topspin: 14 }); E._natpfPlanPlayer();
      E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
    };
  });
  const play = async (want, ms) => {
    await game.evaluate(() => { window.__contact = 0; __rally(); });
    const t0 = Date.now(); let lastPlan = null;
    while (Date.now() - t0 < ms){
      const s = await game.evaluate(() => { const E = __natpfTennis, P = E.natpfPlan; return { phase: E.phase, last: E.ball.lastHitter, left: P ? P.at + P.t - E.elapsedTime : null, at: P ? P.at : null, side: P ? P.side : 1, contact: window.__contact }; });
      if (s.contact >= want) break;
      if (s.phase !== 'RALLY'){ await game.waitForTimeout(500); await game.evaluate(() => __rally()); lastPlan = null; continue; }
      if (s.last === 'opponent' && s.left != null && s.at !== lastPlan && s.left < .16){ lastPlan = s.at; await phone.evaluate(sign => { __up.swing(sign).then(() => __up.still(300)); }, s.side >= 0 ? 1 : -1); }
      await game.waitForTimeout(10);
    }
    return game.evaluate(() => window.__contact);
  };
  await startMatch();
  const n1 = await play(MIN, 240000);
  check(`partita 1 (mira media): almeno ${MIN} colpi del telefono`, n1 >= MIN, `${n1} colpi`);
  // menu → Opzioni → Alta · 17° → partita 2, corta
  await game.evaluate(() => __natpfTennis.natpfUi.backToMenu());
  await openOptions();
  await game.click('[data-natpf-aim="alta"]');
  check('Opzioni: «Alta · 17°» scelta tra le due partite', (await aimState()).sel.join() === 'alta');
  await startMatch();
  const n2 = await play(4, 60000);
  check('partita 2 (mira alta): qualche colpo del telefono', n2 >= 3, `${n2} colpi`);
  // 4. Maiusc+D → Ferma la registrazione → riassunto in parole
  await game.evaluate(() => __natpfTennis.natpfUi.backToMenu());
  await game.keyboard.press('Shift+KeyD');
  await game.waitForSelector('.natpf-diag [data-diag="stop"]', { timeout: 10000 });
  await game.click('.natpf-diag [data-diag="stop"]');
  await game.waitForFunction(() => !__natpfTennis.natpfUi.diag.recorder.active && !__natpfTennis.natpfUi.diag.busy, null, { timeout: 60000 });
  await game.waitForSelector('.natpf-diag .diag-summary', { timeout: 10000 });
  const items = await game.$$eval('.natpf-diag .diag-summary li', l => l.map(x => x.textContent));
  const lato = items.filter(t => /^Lato delle palle/.test(t));
  console.log(lato.map(l => '   ' + l).join('\n'));
  check('riassunto: partita 1 del P1 con la mira media e il verdetto', lato.some(t => /^Lato delle palle · partita 1 · P1 \(destro, mira media 20°\): \d+ colpi · sinistra \d+ % · centro \d+ % · destra \d+ % · .*→ (equilibrata|sbilanciata a (destra|sinistra) \(dalla parte del (dritto|rovescio)\)): /.test(t)), lato[0] || '');
  check('riassunto: partita 2 con la mira alta (pochi colpi: non si giudica)', lato.some(t => /partita 2 · P1 \(destro, mira alta 17°\): \d+ colpi .*troppo pochi colpi per giudicare/.test(t)));
  check('riassunto: il totale per sensibilità', lato.some(t => /^Lato delle palle, in tutto: \d partite sbilanciate su 1 giudicate \(per giocatore\) · mira media \(20°\): \d su 1$/.test(t)), lato.at(-1) || '');
  await game.screenshot({ path: path.join(SP, 'mira-riassunto.png') });
  // 5. Scarica il pacchetto (pulsante vero)
  // il riassunto è lungo: il pannello scorre (come con la rotella), poi il clic vero sul pulsante
  const save = '.natpf-diag .diag-summary [data-diag="save"]';
  await game.$eval(save, b => b.scrollIntoView({ block: 'center' }));
  const hit = await game.$eval(save, b => { const r = b.getBoundingClientRect(), el = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight, sotto: el === b || b.contains(el) ? 'pulsante' : (el?.outerHTML || '').slice(0, 80) }; });
  await game.screenshot({ path: path.join(SP, 'mira-scarica.png') });
  check('pannello: dopo lo scorrimento «⬇ Scarica il pacchetto» è visibile e cliccabile', hit.sotto === 'pulsante' && hit.bottom <= hit.h, JSON.stringify(hit));
  const dl = game.waitForEvent('download', { timeout: 120000 });
  await game.click(save, { timeout: 10000 }).catch(async e => { console.log('clic non riuscito:', e.message.split('\n')[0]); await game.$eval(save, b => b.click()); });
  const d = await dl, file = path.join(SP, d.suggestedFilename()); await d.saveAs(file);
  const z = readZip(new Uint8Array(fs.readFileSync(file))), txt = n => new TextDecoder().decode(z.get(n) || new Uint8Array());
  const met = JSON.parse(txt('metriche.json') || '{}'), ses = JSON.parse(txt('sessione.json') || '{}');
  check('pacchetto: sensibilità della mira all’inizio nella sessione', ses.gioco?.mira === 'media' && ses.gioco?.miraPiena === 20, JSON.stringify(ses.gioco));
  check('pacchetto: metriche.json con il lato delle palle per partita', met.latoPalle?.partite?.length === 2 && met.latoPalle.partite[0].giocatori.P1.miraPiena === 20 && met.latoPalle.partite[1].giocatori.P1.miraPiena === 17, JSON.stringify(met.latoPalle?.riepilogo));
  check('pacchetto: rapporto.html con la scheda e LEGGIMI.txt con le righe', /Lato delle palle per partita \(mira del telefono\)/.test(txt('rapporto.html')) && /- Lato delle palle · partita 1 · P1/.test(txt('LEGGIMI.txt')));
  const ev = txt('eventi.jsonl').trim().split('\n').map(l => JSON.parse(l));
  const ps = ev.filter(e => e.k === 'partita'), rk = ev.filter(e => e.k === 'racchetta' && e.chi === 'player');
  check('eventi: due «partita» (media, poi alta) e colpi con mano, fonte e miraPiena', ps.length === 2 && ps[0].miraPiena === 20 && ps[1].miraPiena === 17 && rk.length >= n1 && rk.every(e => e.mano === 'right' && e.fonte === 'natpf-phone' && [17, 20].includes(e.miraPiena)), JSON.stringify(ps));
  // 6. il comando per lo staff sul pacchetto scaricato
  const out = execFileSync(process.execPath, [path.join(GAME, 'scripts/audit/lato-palle.mjs'), file], { encoding: 'utf8', cwd: GAME });
  console.log(out.split('\n').map(l => '   | ' + l).join('\n'));
  check('lato-palle.mjs: le due partite con la loro sensibilità e il totale', /partita 1 · P1 \(destro, mira media 20°\)/.test(out) && /partita 2 · P1 \(destro, mira alta 17°\)/.test(out) && /== In tutto \(1 registrazione, 1 pacchetto\): \d partite sbilanciate su 1 giudicate/.test(out) && /mira media \(20°\): \d su 1/.test(out), out.slice(-300));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
  // la mira torna quella di base per le prove dopo (stesso profilo del browser solo in questa prova, ma per ordine)
  await game.evaluate(() => __natpfTennis.natpfUi.diag.close());
  await openOptions(); await game.click('[data-natpf-aim="alta"]');
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
