// NATPF motore base: sfida tra due computer sul sito statico, Player 2 con la WEBCAM (segnalazione del 30/10: «a chi
// riceve l'invito non funziona il settaggio della webcam»). Due sessioni del browser vere, webcam finta di Chromium
// (--use-fake-device-for-media-stream, permesso dato da --use-fake-ui-for-media-stream), collegamento WebRTC con un
// server di segnalazione locale come natpf-1v1-p2p.mjs:
//   1. P1 «Sfida un amico» con mouse e tastiera; il P2 apre il link d'invito;
//   2. P2 sceglie «Webcam» nel suo pannello: il pulsante dice «Accendi la webcam ›»; premuto, si apre il pannello della
//      webcam (non coperto dal pannello del P2), la camera si accende e l'anteprima mostra il video, «Cerco la mano…»;
//      l'host vede il P2 entrato, non pronto;
//   3. mano vista (SIMULATA: nella webcam finta non c'è una mano, si scrive latestHandSeenAt come fa il modello) →
//      in campo da soli: riscaldamento con il lanciapalle in locale (ruolo del P1, nessun colpo all'host);
//   4. «Salta» → il P2 è pronto da solo, l'host lo vede pronto; «Gioca»;
//   5. in partita il P2 spegne la webcam: l'host si ferma con «La webcam di … è spenta», il P2 vede «La tua webcam è in
//      pausa» con «Accendi la webcam»; premuto, la partita riprende con il conto alla rovescia;
//   6. webcam negata dal browser (getUserMedia rifiutato): il pannello del P2 dice «Webcam negata» e come rimediare.
//   cd natpf-tennis && node node_modules/vite/bin/vite.js build
//   cd tools/e2e && npm ci && CHROMIUM_PATH=/percorso/chrome node natpf-1v1-webcam-p2.mjs
// NOSHOT=1 salta le schermate (OUT=cartella per dove salvarle): accendere il disegno con WebGL software per gli scatti
// rallenta tanto la pagina che il collegamento diretto può cadere per qualche secondo («collegamento perso») e l'host
// può vedere il P2 fuori linea (niente letture per più di 4 s): prima di «Gioca» la prova aspetta che torni pronto.
// Non sostituisce una webcam vera con una persona davanti: il riconoscimento della mano qui non si prova.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { chromium } from 'playwright-core';
import { page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), DIST = path.resolve(process.env.DIST || path.resolve(here, '../../natpf-tennis/dist'));
if (!fs.existsSync(path.join(DIST, 'index.html'))){ console.log('Manca natpf-tennis/dist: eseguire prima la build'); process.exit(1); }
const PEER_PORT = +(process.env.PEER_PORT || 9127), GAME_PORT = +(process.env.GAME_PORT || 3127);
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(0).padStart(3)} s] ${m}`);

const peerApp = express(), peerServer = http.createServer(peerApp);
peerApp.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const site = express();
site.use('/api', (req, res) => res.status(404).send('sito statico'));
site.use(express.static(DIST));
const gameServer = await new Promise(r => { const s = site.listen(GAME_PORT, '127.0.0.1', () => r(s)); });
const GAME = `http://127.0.0.1:${GAME_PORT}`;

const NO_RENDER = () => { window.__natpfTennis.render = () => {}; };
const ready = p => p.waitForFunction(() => window.__natpfTennis?.player?.model && window.__natpfTennis.natpfUi?.versus, null, { timeout: 120000 });
const until = async (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);
const line = p => p.evaluate(() => { const el = document.querySelector('#natpf-invite [data-versus-state]'); return el ? `${el.dataset.state}: ${el.textContent}` : ''; });
const shown = (p, id) => p.evaluate(i => { const el = document.getElementById(i); return !!el && !el.classList.contains('hidden') && el.getBoundingClientRect().height > 0; }, id);
// schermata con il disegno acceso solo per lo scatto (il disegno con WebGL software rallenta tutto il resto)
const shot = async (p, name) => { if (process.env.NOSHOT) return; await p.evaluate(() => { delete __natpfTennis.render; }); await p.waitForTimeout(1200); await shotRaw(p, name); await p.evaluate(NO_RENDER); };
// stato dei due computer quando qualcosa non va: collegamento diretto, stato della stanza, ritardo del ciclo degli eventi
const diag = async (p1, p2) => {
  const one = p => p.evaluate(async () => { const E = __natpfTennis, t = performance.now(); await new Promise(r => setTimeout(r, 0)); return { lag: Math.round(performance.now() - t), phase: E.phase, p2p: E.natpfP2p?.status, err: E.natpfP2p?.error || null, room: E.roomStatus ? { p1: E.roomStatus.p1Online, p2: E.roomStatus.p2Online, ready: E.roomStatus.p2Ready } : null, guest: E.natpfUi.versus.p2 ? E.natpfUi.versus.guest : undefined, cam: E.motionController.webcamActive }; }).catch(e => ({ err: e.message }));
  return { p1: await one(p1), p2: await one(p2) };
};
const shotRaw = (p, name) => p.screenshot({ path: path.join(SP, `webcam-p2-${name}.png`), timeout: 120000 }).then(() => log(`schermata ${SP}/webcam-p2-${name}.png`), e => log('schermata non riuscita: ' + e.message));

const B = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const errors = [];
try {
  /* 1: host e link d'invito */
  const { p: p1, errs: e1 } = await page(B, `${GAME}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1100, h: 680 });
  errors.push(e1);
  await ready(p1); await p1.evaluate(NO_RENDER); log('P1 pronto');
  await p1.evaluate(() => {
    const ui = __natpfTennis.natpfUi;
    ui.testInput = true; ui.selectController('mouse', { open: false });
    ui.lobby.menu('play');
    document.querySelector('[data-mode="friend"]').click();
  });
  await until(p1, () => document.querySelector('#natpf-invite a')?.href && __natpfTennis.natpfP2p?.status === 'waiting');
  const invite = await p1.evaluate(() => document.querySelector('#natpf-invite a').href);
  await p1.evaluate(() => __natpfTennis.natpfUi.lobby.go('match'));
  log('invito ' + invite);
  const { p: p2, errs: e2 } = await page(B, invite, { w: 1100, h: 680 });
  errors.push(e2);
  await ready(p2); await p2.evaluate(NO_RENDER); log('P2 pronto');
  const linked = await until(p2, () => document.querySelector('[data-versus-guest]')?.dataset.state === 'lobby', null, 60000);
  check('1. P2 collegato all’host con il link d’invito', linked);

  /* 2: scelta «Webcam» e pannello della webcam */
  await p2.click('#natpf-guest-modal [data-natpf-controller="webcam"]');
  const label = await p2.evaluate(() => document.getElementById('natpf-guest-go').textContent);
  check('2. «Webcam» nel pannello del P2: il pulsante porta ad accenderla', label === 'Accendi la webcam ›', label);
  await shot(p2, '1-pannello');
  await p2.click('#natpf-guest-go');
  const camOn = await until(p2, () => __natpfTennis.motionController.webcamActive && !document.getElementById('natpf-guest-cam').classList.contains('hidden'), null, 30000);
  const video = await p2.evaluate(() => { const v = document.getElementById('guest-cam-video'); return { stream: !!v.srcObject, w: v.videoWidth, h: v.videoHeight }; });
  await p2.waitForTimeout(1500);
  const camState = await p2.evaluate(() => ({ badge: document.getElementById('guest-cam-badge').textContent, text: document.getElementById('guest-cam-text').textContent, guest: !document.getElementById('natpf-guest-modal').classList.contains('hidden'), field: !document.getElementById('guest-cam-field').disabled, ready: __natpfTennis.natpfUi.versus.ready }));
  const camShown = await shown(p2, 'natpf-guest-cam');
  check('   pannello della webcam: camera accesa, anteprima con il video, non coperto dal pannello del P2', camOn && video.stream && video.w > 0 && !camState.guest && camShown, JSON.stringify({ camOn, ...video, guest: camState.guest, shown: camShown }));
  check('   webcam finta senza mano: «Cerco la mano…», «In campo ›» attivo, non ancora pronto', camState.badge === 'Cerco la mano…' && camState.field && !camState.ready, JSON.stringify(camState));
  const joined = await until(p1, () => /è entrato/.test(document.querySelector('#natpf-invite [data-versus-state]')?.textContent || ''));
  check('   l’host vede il P2 entrato, «Gioca» bloccato', joined && await p1.evaluate(() => document.getElementById('btn-start-match').disabled), await line(p1));
  await shot(p2, '2-webcam');

  /* 3: mano vista (simulata) → in campo */
  await p2.evaluate(() => { window.__hand = setInterval(() => { __natpfTennis.motionController.latestHandSeenAt = performance.now(); }, 100); });
  const inField = await until(p2, () => __natpfTennis.natpfUi.training.active, null, 60000);
  await p2.evaluate(() => clearInterval(window.__hand));
  const field = await p2.evaluate(() => { const E = __natpfTennis, U = E.natpfUi; return { drills: (U.training.drills || []).map(d => d.id), role: E.playerRole, multi: E.isMultiplayer, local: E.motionController.localPractice, cam: !U.versus.camOpen, guest: document.getElementById('natpf-guest-modal').classList.contains('hidden'), ready: U.versus.ready }; });
  check('3. mano vista: in campo da soli, riscaldamento in locale (dritto, rovescio, servizio), pannelli chiusi, non pronto', inField && field.drills.join() === 'forehand,backhand,serve' && field.role === 'p1' && field.multi === false && field.local === true && field.cam && field.guest && !field.ready, JSON.stringify(field));
  await p2.waitForTimeout(2500);
  await shot(p2, '3-campo');
  check('   l’host intanto aspetta (P2 non pronto)', await p1.evaluate(() => document.getElementById('btn-start-match').disabled), await line(p1));

  /* 4: «Salta» → pronto da solo */
  await p2.evaluate(() => document.getElementById('coach-exit').click());
  const ready2 = await until(p1, () => document.querySelector('#natpf-invite [data-versus-state]')?.dataset.state === 'ok' && !document.getElementById('btn-start-match').disabled, null, 20000);
  const after = await p2.evaluate(() => { const E = __natpfTennis; return { role: E.playerRole, multi: E.isMultiplayer, local: E.motionController.localPractice, go: document.getElementById('natpf-guest-go').textContent, cam: E.motionController.webcamActive }; });
  check('4. «Salta»: il P2 è pronto da solo (l’host lo vede), motore di nuovo del Player 2, webcam accesa', ready2 && after.role === 'p2' && after.multi === true && !after.local && after.go === 'Pronto ✓' && after.cam, JSON.stringify(after));
  await shot(p2, '4-pronto');
  // la schermata (disegno con WebGL software, 7–11 s) ferma la pagina del P2 anche più di 3 s tra due letture: oltre i
  // 4 s il relay lo dà fuori linea (match-relay.mjs, p2Online) e l'host spegne «Gioca» finché non torna. È il gioco che
  // fa bene (88c607a: online = letto negli ultimi 4 s; «Gioca» solo con il P2 online e pronto): prima la prova premeva
  // subito un pulsante a volte spento, l'host restava al menu e il P2 nella lobby (8/12). Ora aspetta che l'host lo
  // veda di nuovo pronto e lo verifica
  const goAgain = await until(p1, () => !document.getElementById('btn-start-match').disabled && __natpfTennis.natpfUi.versus.canStart(), null, 20000);
  check('   dopo la schermata l’host vede ancora il P2 pronto, «Gioca» attivo', goAgain, await line(p1));
  await p1.evaluate(() => document.getElementById('btn-start-match').click());
  const started = await until(p2, () => ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(__natpfTennis.phase) && document.querySelector('[data-versus-guest]')?.dataset.state === 'playing', null, 30000);
  check('   «Gioca»: partita su tutti e due i computer', started && await p1.evaluate(() => __natpfTennis._versusInMatch()), started ? '' : JSON.stringify(await diag(p1, p2)));

  /* 5: webcam spenta in partita */
  await p2.waitForTimeout(1500);
  const okBefore = await p1.evaluate(() => !__natpfTennis.natpfVersusWait);
  await p2.evaluate(() => __natpfTennis.motionController.disableWebcam());
  const hostHeld = await until(p1, () => __natpfTennis.natpfUi.versus.holdWhy === 'webcam spenta' && __natpfTennis.natpfPaused, null, 15000);
  const hostTitle = await p1.evaluate(() => document.getElementById('natpf-versus-wait-title')?.textContent);
  check('5. webcam del P2 spenta in partita: l’host si ferma e dice perché', okBefore && hostHeld && /webcam di .* è spenta/.test(hostTitle || ''), hostTitle);
  const guestBox = await until(p2, () => { const el = document.getElementById('natpf-phone-hold'); return !!el && !el.classList.contains('hidden') && /webcam/.test(el.querySelector('b')?.textContent || ''); }, null, 15000);
  const box = await p2.evaluate(() => { const el = document.getElementById('natpf-phone-hold'); return { title: el?.querySelector('b')?.textContent, button: el?.querySelector('button')?.textContent }; });
  check('   il P2 vede «La tua webcam è in pausa» con «Accendi la webcam»', guestBox && box.title === 'La tua webcam è in pausa' && box.button === 'Accendi la webcam', JSON.stringify(box));
  await shot(p2, '5-pausa');
  await p2.click('#natpf-phone-hold button');
  const resumed = await until(p1, () => !__natpfTennis.natpfVersusWait && !__natpfTennis.natpfPaused, null, 20000);
  // se non riprende: perché è ferma per l'host e la salute della webcam del P2 (con il modello delle mani caricato, la
  // webcam finta senza mano dà «mano persa»; con la macchina carica i fotogrammi fermi danno «webcam ferma»)
  const notResumed = resumed ? '' : JSON.stringify({ host: await p1.evaluate(() => ({ why: __natpfTennis.natpfUi.versus.holdWhy, hold: __natpfTennis.roomStatus.p2Hold, online: __natpfTennis.roomStatus.p2Online })), p2: await p2.evaluate(() => { const mc = __natpfTennis.motionController; return { ...mc.webcamHealth(), hands: !!mc.mpHands, hold: mc.versusHold, opening: !!mc._webcamOpening, err: mc.webcamError?.name || null, box: document.getElementById("natpf-phone-hold")?.textContent?.slice(0, 80) }; }) });
  check('   «Accendi la webcam»: la webcam si riaccende e la partita riprende', resumed && await p2.evaluate(() => __natpfTennis.motionController.webcamActive), notResumed);

  /* 6: webcam negata */
  const DENY = () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')); };
  const { p: p3, errs: e3 } = await page(B, invite.replace(/room=[^&]+/, 'room=AT-ZZZZ'), { w: 1100, h: 680, init: DENY });
  errors.push(e3);
  await ready(p3); await p3.evaluate(NO_RENDER);
  await p3.click('#natpf-guest-modal [data-natpf-controller="webcam"]');
  await p3.click('#natpf-guest-go');
  const denied = await until(p3, () => document.getElementById('guest-cam-badge')?.textContent === 'Webcam negata', null, 15000);
  const why = await p3.evaluate(() => ({ text: document.getElementById('guest-cam-text').textContent, go: !document.getElementById('guest-cam-go').classList.contains('hidden'), field: document.getElementById('guest-cam-field').disabled }));
  check('6. webcam negata dal browser: il pannello del P2 dice perché e come rimediare, niente campo', denied && /negato/.test(why.text) && why.go && why.field, why.text);
  await shot(p3, '6-negata');

  const errs = errors.flat().filter(e => !/peer|PeerJS|WebSocket|ERR_CONNECTION|net::/i.test(e));
  check('nessun errore nelle pagine', errs.length === 0, errs.slice(0, 4).join(' | '));
} catch (e){
  console.error(e); check('prova completata', false, e.message);
} finally {
  await B.close(); peerServer.close(); gameServer.close();
  summary();
  // il server di segnalazione tiene aperte le connessioni: senza, il processo non finisce
  setTimeout(() => process.exit(process.exitCode || 0), 500);
}
