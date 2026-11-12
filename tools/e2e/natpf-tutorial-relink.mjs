// NATPF motore base (natpf-tennis/): tutorial aperto e telefono che cade, con le pagine vere del telefono (revisione B9 del
// 06/11, ramo A). Prima, nello stesso schermo, un telefono che cadeva e si ricollegava a tutorial aperto lo perdeva:
// la metà lo segnava come visto senza «Tutto chiaro, ho capito» e il telefono calibrava da solo (natpf_split_ui._drive
// chiamava waitTutorial(false) alla caduta). Nell'Allenamento la calibrazione compariva ~0,76 s tra «Attiva i sensori» e
// il tutorial. Percorsi:
//   A. Allenamento: «Attiva i sensori» → direttamente la schermata del tutorial (nessuna calibrazione in mezzo);
//   B1. stesso schermo, P2 alla scheda 4/5 (tutorial corto prima della partita, B16): «Ricollega» (relink) → resta nel tutorial alla scheda 4, «Tutto chiaro» spento;
//   B2. stesso schermo, P2 alla scheda 4/5: collegamento perso davvero (RTCPeerConnection chiuse sul telefono, ripresa
//       con la chiave) → la metà riprende dalla scheda 4, non vista, nessuna calibrazione;
//   T. Allenamento, stessa caduta: stessa scheda (controllo).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-tutorial-relink.mjs     (OUT=cartella delle schermate)
// Eventi devicemotion sintetici e pagine del telefono sulla stessa macchina: non sostituiscono telefoni veri.
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9141), GAME_PORT = +(process.env.GAME_PORT || 3141);
const OUT = path.join(SP, 'tutorial-relink'); mkdirSync(OUT, { recursive: true });
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const GAME_URL = `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`;

// telefono simulato (come natpf-tutorial-phone.mjs) con la cronologia delle schermate (__tl) e le RTCPeerConnection
// raccolte (__pcs) per far cadere davvero il collegamento
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
  };
  window.__hold = setInterval(() => window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]), 16);
  window.__tl = [];
  setInterval(() => {
    if (!window.__racchetta) return;
    const sc = __racchetta.state.screen, big = document.getElementById('big')?.textContent || '', k = `${sc}|${big}`;
    if (window.__tl.at(-1)?.k !== k) window.__tl.push({ k, t: Math.round(performance.now()) });
  }, 20);
  const O = window.RTCPeerConnection; window.__pcs = [];
  window.RTCPeerConnection = function(...a){ const pc = new O(...a); window.__pcs.push(pc); return pc; };
  window.RTCPeerConnection.prototype = O.prototype;
};
const snap = phone => phone.evaluate(() => {
  const b = document.getElementById('tutOk'), R = __racchetta.state;
  return { screen: R.screen, sensor: R.sensor, gate: R.gate, tutOn: !!b && !b.disabled && !b.classList.contains('hidden') };
});
const next = async (phone, k) => { for (let i = 0; i < k; i++){ await phone.evaluate(() => document.getElementById('tutNext').click()); await phone.waitForTimeout(1300); } };
const calSeen = tl => tl.some(x => /^(cal|ready)\|/.test(x.k));
const keys = tl => tl.map(x => x.k.split('|')[0]).join('>');
const openGame = async B => {
  const { p, errs } = await page(B, GAME_URL, { w: 1280, h: 720 });
  await p.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // il disegno con la grafica software rallenta i fotogrammi: si disegna solo per le schermate
  await p.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; E.natpfUi.intro?.skip?.(); });
  await p.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  return { p, errs };
};
const shot = async (p, name) => { await p.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await p.screenshot({ path: `${OUT}/${name}.png` }); };
// Allenamento dal menu con il telefono: QR → pagina del telefono collegata
const trainingPhone = async (B, game) => {
  await game.click('[data-menu="training"]');
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'controller', null, { timeout: 5000 });
  await game.click('[data-page="controller"] [data-natpf-controller="phone"]');
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  return phone;
};

const B = await launch();
const errsAll = [];
try {
  /* A. Allenamento: «Attiva i sensori» → tutorial, senza la calibrazione in mezzo */
  {
    const { p: game, errs } = await openGame(B); errsAll.push(errs);
    const phone = await trainingPhone(B, game);
    await phone.evaluate(() => { window.__tl = []; });
    await phone.click('#enable');
    await phone.waitForFunction(() => __racchetta.state.screen === 'tutorial' && __racchetta.state.gate?.n > 0, null, { timeout: 10000 });
    await phone.waitForTimeout(400);
    const tl = await phone.evaluate(() => window.__tl);
    check('A. Allenamento: dopo «Attiva i sensori» subito il tutorial, nessuna calibrazione in mezzo', !calSeen(tl), keys(tl));
    // T. stessa caduta del collegamento nell'Allenamento: stessa scheda
    await next(phone, 3);
    await phone.evaluate(() => { window.__tl = []; });
    const j0 = await game.evaluate(() => __natpfTennis.natpfPhone.state.joins);
    await phone.evaluate(() => { for (const x of window.__pcs) try { x.close(); } catch {} });
    await game.waitForFunction(j => __natpfTennis.natpfPhone.state.joins > j && __natpfTennis.natpfPhone.connected, j0, { timeout: 40000, polling: 100 }).catch(() => {});
    await game.waitForTimeout(2500);
    const tlT = await phone.evaluate(() => window.__tl), sT = await snap(phone);
    const hT = await game.evaluate(() => { const T = __natpfTennis.natpfUi.training; return { open: T.tutorialOpen, idx: T.tutorial.state?.idx, seen: __natpfTennis.natpfPhone.tutorialSeen }; });
    check('T. Allenamento, collegamento perso e ripreso a tutorial aperto: stessa scheda, nessuna calibrazione', hT.open && !hT.seen && hT.idx === 3 && sT.screen === 'tutorial' && !calSeen(tlT) && !sT.tutOn, JSON.stringify({ hT, screen: sT.screen, tl: keys(tlT) }));
    // T2 (verifica B15): pagina del telefono chiusa a tutorial aperto: il pannello del computer avvisa «Telefono
    // scollegato» anche sotto la modale (una regola CSS del B15 lo nascondeva insieme alla riga che ripeteva la modale)
    await phone.close();
    const warn = await game.waitForFunction(() => { const m = document.querySelector('#coach-main'); return !!m && m.dataset.state === 'retry' && getComputedStyle(m).visibility === 'visible' && /scollegato/i.test(m.textContent); }, null, { timeout: 25000, polling: 200 }).then(() => true).catch(() => false);
    const mT = await game.evaluate(() => { const m = document.querySelector('#coach-main'); return m ? { state: m.dataset.state, vis: getComputedStyle(m).visibility, text: m.textContent.trim().slice(0, 80) } : null; });
    check('T. pagina del telefono chiusa a tutorial aperto: il computer mostra «Telefono scollegato» anche sotto la modale', warn, JSON.stringify(mT));
    await phone.context().close(); await game.context().close();
  }

  /* B. Stesso schermo: telefono del P2 che cade e si ricollega a tutorial aperto */
  const { p: pc, errs } = await openGame(B); errsAll.push(errs);
  await pc.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.setMode('split'); L.go('connect'); });
  await pc.waitForFunction(() => __natpfTennis.natpfPhone.pairingUrl && __natpfTennis.natpfPhone2?.pairingUrl && __natpfTennis.natpfPhone2.state.state === 'waiting', null, { timeout: 30000 });
  const [u1, u2] = await pc.evaluate(() => [__natpfTennis.natpfPhone.pairingUrl, __natpfTennis.natpfPhone2.pairingUrl]);
  const { p: ph1 } = await page(B, u1, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  const { p: ph2 } = await page(B, u2, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  for (const ph of [ph1, ph2]) await ph.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await ph1.click('#enable'); await ph2.click('#enable');
  for (const ph of [ph1, ph2]) await ph.waitForFunction(() => __racchetta.state.screen === 'tutorial' && __racchetta.state.gate?.n > 0, null, { timeout: 10000 });
  await next(ph2, 3);
  const split = () => pc.evaluate(() => { const S = __natpfTennis.natpfUi.split, P = __natpfTennis.natpfPhone2; return { open: S.tutOpen.p2, idx: S.tut.p2.state?.idx, seen: P.tutorialSeen, wait: P.tutWait, joins: P.state.joins, pairs: P.state.pairs, resumed: P.state.resumed, relinked: P.state.relinked, cal: P.cal.step }; });
  // B1: «Ricollega» del P2 a tutorial aperto
  await ph2.evaluate(() => { window.__tl = []; });
  let j0 = await pc.evaluate(() => __natpfTennis.natpfPhone2.state.joins);
  const rl = await pc.evaluate(() => __natpfTennis.natpfPhone2.relink());
  await pc.waitForFunction(j => __natpfTennis.natpfPhone2.state.joins > j && __natpfTennis.natpfPhone2.connected, j0, { timeout: 20000 }).catch(() => {});
  await pc.waitForTimeout(2000);
  let tl = await ph2.evaluate(() => window.__tl), s2 = await snap(ph2), h = await split();
  check('B1. stesso schermo, «Ricollega» a tutorial aperto: resta nel tutorial alla scheda 4, «Tutto chiaro» spento, nessuna calibrazione', rl && h.open && !h.seen && h.idx === 3 && s2.screen === 'tutorial' && s2.gate?.i === 3 && !s2.tutOn && !calSeen(tl), JSON.stringify({ h, gate: s2.gate, tl: keys(tl) }));
  // B2: collegamento perso davvero (RTCPeerConnection chiuse sul telefono), ripreso con la chiave
  await ph2.evaluate(() => { window.__tl = []; });
  j0 = await pc.evaluate(() => __natpfTennis.natpfPhone2.state.joins);
  await ph2.evaluate(() => { for (const x of window.__pcs) try { x.close(); } catch {} });
  const lost = await pc.waitForFunction(() => !__natpfTennis.natpfPhone2.connected, null, { timeout: 30000, polling: 50 }).then(() => true, () => false);
  const hLost = await split();
  await pc.waitForFunction(j => __natpfTennis.natpfPhone2.state.joins > j && __natpfTennis.natpfPhone2.connected, j0, { timeout: 40000, polling: 100 }).catch(() => {});
  await pc.waitForTimeout(2500);
  tl = await ph2.evaluate(() => window.__tl); s2 = await snap(ph2); h = await split();
  await shot(pc, 'B2-stesso-schermo-dopo-caduta'); await ph2.screenshot({ path: `${OUT}/B2-telefono-p2-dopo-caduta.png` });
  check('B2. stesso schermo, P2 caduto davvero a tutorial aperto: il telefono aspetta ancora il tutorial mentre è perso', lost && hLost.wait && !hLost.open, JSON.stringify(hLost));
  check('B2. ripreso con la chiave: tutorial dalla scheda 4, non visto, «Tutto chiaro» spento, nessuna calibrazione', h.open && !h.seen && h.idx === 3 && h.resumed && s2.screen === 'tutorial' && s2.gate?.i === 3 && !s2.tutOn && !calSeen(tl), JSON.stringify({ h, gate: s2.gate, tl: keys(tl) }));
  // il P1 non è stato disturbato
  const s1 = await snap(ph1);
  check('B. il P1 è ancora nel suo tutorial', s1.screen === 'tutorial', JSON.stringify(s1));
  check('nessun errore nella pagina del gioco', !errsAll.flat().length, errsAll.flat().slice(0, 3).join(' | '));
} catch (e){ console.error(e); check('senza eccezioni', false, e.message); }
finally { await B.close(); stop(); }
summary();
setTimeout(() => process.exit(), 300);
