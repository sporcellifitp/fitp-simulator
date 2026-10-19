// NATPF motore base (natpf-tennis/): sfida tra due computer sul sito statico, con due sessioni del browser vere.
// Serve la build (natpf-tennis/dist) come farebbe Cloudflare Pages, senza /api/match: l'host tiene il relay in memoria
// e il Player 2 si collega con WebRTC (PeerJS) attraverso un server di segnalazione locale (?peer=…).
// Il percorso è quello di chi gioca, con i comandi veri dell'interfaccia:
//   1. P1: «Sfida un amico» → la stanza nasce, la pagina «Partita» mostra codice, link e stato «in attesa»;
//   2. il link porta stanza, ruolo, rete p2p e server di segnalazione;
//   3. P2 apre il link: l'host lo vede entrato, «Gioca» resta bloccato;
//   4. P2 «Sono pronto»: l'host lo vede pronto, «Gioca» si sblocca;
//   5. «Gioca»: si gioca al meglio di 3, servono tutti e due, punteggio uguale sulle due sessioni;
//   6. P2 chiude la pagina: l'host si ferma con la spiegazione; P2 rientra con lo stesso link: si riprende;
//   7. P1 sceglie «Contro la CPU»: il P2 vede «stanza chiusa»; un link a una stanza che non esiste lo dice.
//   cd natpf-tennis && node node_modules/vite/bin/vite.js build
//   cd tools/e2e && npm ci && CHROMIUM_PATH=/percorso/chrome node natpf-1v1-p2p.mjs
// Giocatori automatici con gli eventi del mouse: non sostituiscono due persone su due computer e una rete vera.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), DIST = path.resolve(process.env.DIST || path.resolve(here, '../../natpf-tennis/dist'));   // DIST=cartella: per provare lo zip estratto
if (!fs.existsSync(path.join(DIST, 'index.html'))){ console.log('Manca natpf-tennis/dist: eseguire prima la build'); process.exit(1); }
const PEER_PORT = +(process.env.PEER_PORT || 9117), GAME_PORT = +(process.env.GAME_PORT || 3117);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(0).padStart(3)} s] ${m}`);

const peerApp = express(), peerServer = http.createServer(peerApp);
peerApp.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const site = express();
site.use('/api', (req, res) => res.status(404).send('sito statico'));   // come Cloudflare Pages: nessun relay sul server
site.use(express.static(DIST));
const gameServer = await new Promise(r => { const s = site.listen(GAME_PORT, '127.0.0.1', () => r(s)); });
const stop = () => { peerServer.close(); gameServer.close(); };
const GAME = `http://127.0.0.1:${GAME_PORT}`;

// giocatore automatico (gli stessi eventi del mouse): lancio e colpo al servizio, swing quando la palla arriva vicino
const BOT = () => {
  let last = 0;
  window.__served = { player: 0, opponent: 0 }; window.__maxRally = 0;
  clearInterval(window.__bot);
  window.__bot = setInterval(() => {
    const e = window.__natpfTennis, mc = e.motionController, me = e.playerRole === 'p2' ? 'opponent' : 'player', a = e[me], b = e.ball, now = performance.now();
    window.__maxRally = Math.max(window.__maxRally || 0, b.rallyStrokeCount || 0);
    if (now - last < 380) return;
    if (e.phase === 'SERVE_STANCE' && e.score.server === me){ last = now + 400; mc.triggerSyntheticSwing({ type: 'toss' }); }
    else if (e.phase === 'SERVE_TOSS' && e.score.server === me && b.vel.y < 0){ last = now; window.__served[me]++; mc.triggerSyntheticSwing({}); }
    else if (e.phase === 'RALLY' && b.inPlay && (a.pos.z - b.pos.z)*b.vel.z > 0 && Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 1.7){ last = now; mc.triggerSyntheticSwing({}); }
  }, 8);
};
// il disegno con WebGL software rallenta i fotogrammi a 1–2 s: si toglie solo il render, la partita resta
const NO_RENDER = () => { const e = window.__natpfTennis; e.render = () => {}; };
const ready = p => p.waitForFunction(() => window.__natpfTennis?.player?.model && window.__natpfTennis.racketKinematics && window.__natpfTennis.natpfUi?.versus, null, { timeout: 120000 });
const lines = p => p.evaluate(() => [...document.querySelectorAll('[data-versus-lines] li')].map(l => l.className).join(','));
const guestStatus = p => p.evaluate(() => document.querySelector('[data-versus-guest]')?.dataset.state || '');
const state = p => p.evaluate(() => { const e = __natpfTennis; return { score: ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => e.score[k]), server: e.score.server, phase: e.phase, rally: window.__maxRally, served: window.__served, gamesToWin: e.matchConfig.gamesToWin }; });
const until = async (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);

const B = await launch();
try {
  /* 1–2: il P1 crea la stanza dal menu */
  const { p: p1, errs: e1 } = await page(B, `${GAME}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1100, h: 680 });
  await ready(p1); await p1.evaluate(NO_RENDER); log('P1 pronto');
  await p1.evaluate(() => {
    const ui = __natpfTennis.natpfUi;
    ui.testInput = true; ui.selectController('mouse', { open: false });       // racchetta di prova: mouse
    ui.lobby.setMode('friend'); ui.lobby.go('match');
    document.querySelector('#match-length-group [data-games="3"]')?.click(); // al meglio di 3: il servizio passa al P2
  });
  await until(p1, () => document.querySelector('#natpf-invite a')?.href && __natpfTennis.natpfP2p?.status === 'waiting');
  const invite = await p1.evaluate(() => document.querySelector('#natpf-invite a').href), u = new URL(invite);
  const code = await p1.evaluate(() => document.querySelector('[data-room-code]')?.textContent);
  log('invito ' + invite);
  check('1. stanza creata dal menu: codice in vista e link d’invito', /^AT-[A-Z0-9]{4}$/.test(code || '') && u.searchParams.get('room') === code, code);
  check('2. link: stanza, role=p2, net=p2p e server di segnalazione', u.searchParams.get('role') === 'p2' && u.searchParams.get('net') === 'p2p' && u.searchParams.get('peer') === `127.0.0.1:${PEER_PORT}`, invite);
  check('   lobby «in attesa» e «Gioca» bloccato', await lines(p1) === 'ok,on,' && await p1.evaluate(() => document.getElementById('btn-start-match').disabled), await lines(p1));

  /* 3–4: il P2 entra e si dichiara pronto */
  const { ctx: c2, p: p2, errs: e2 } = await page(B, invite, { w: 1100, h: 680 });
  await ready(p2); await p2.evaluate(NO_RENDER); log('P2 pronto');
  const p2linked = await until(p2, () => document.querySelector('[data-versus-guest]')?.dataset.state === 'lobby');
  check('3. P2 collegato all’host con WebRTC, pannello «Sono pronto»', p2linked && await p2.evaluate(() => __natpfTennis.playerRole === 'p2' && __natpfTennis.natpfP2p.status === 'connected'), await guestStatus(p2));
  const joined = await until(p1, () => [...document.querySelectorAll('[data-versus-lines] li')].map(l => l.className).join(',') === 'ok,ok,on');
  check('   l’host vede il P2 entrato, «Gioca» ancora bloccato', joined && await p1.evaluate(() => document.getElementById('btn-start-match').disabled), await lines(p1));
  await p2.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.testInput = true; ui.selectController('mouse', { open: false }); document.getElementById('natpf-guest-go').click(); });
  const ready2 = await until(p1, () => [...document.querySelectorAll('[data-versus-lines] li')].map(l => l.className).join(',') === 'ok,ok,ok' && !document.getElementById('btn-start-match').disabled);
  check('4. P2 «Sono pronto»: l’host lo vede pronto e «Gioca» si sblocca', ready2, await lines(p1));

  /* 5: partita */
  await p1.evaluate(() => document.getElementById('btn-start-match').click());
  const started = await until(p2, () => ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase) && document.getElementById('natpf-guest-modal').classList.contains('hidden'));
  check('5. «Gioca»: la partita parte su tutti e due i computer, il pannello del P2 si chiude', started && await p1.evaluate(() => __natpfTennis._versusInMatch()));
  await p1.evaluate(BOT); await p2.evaluate(BOT);
  let s1, s2;
  for (const t = Date.now(); Date.now() - t < 240000;){
    await sleep(3000);
    [s1, s2] = await Promise.all([state(p1), state(p2)]);
    if (s2.served?.opponent >= 1 && s1.rally >= 3) break;
  }
  await sleep(1500);
  [s1, s2] = await Promise.all([state(p1), state(p2)]);
  log('P1 ' + JSON.stringify(s1)); log('P2 ' + JSON.stringify(s2));
  check('   al meglio di 3 (prima sempre un game)', s1.gamesToWin === 2 && s2.gamesToWin === 2, `${s1.gamesToWin}/${s2.gamesToWin}`);
  check('   scambio tra le due sessioni', s1.rally >= 3, `scambio più lungo: ${s1.rally} colpi`);
  check('   servono tutti e due (cambio del servizio dopo il primo game)', s1.served.player >= 1 && s2.served.opponent >= 1, `P1 ${s1.served.player}, P2 ${s2.served.opponent}`);
  check('   punteggio e servizio uguali sulle due sessioni', JSON.stringify(s1.score) === JSON.stringify(s2.score) && s1.server === s2.server, `P1 ${s1.score} ${s1.server} · P2 ${s2.score} ${s2.server}`);

  /* 6: il P2 esce e rientra */
  await c2.close(); log('P2 ha chiuso la pagina');
  const waited = await until(p1, () => __natpfTennis.natpfVersusWait === true && !document.getElementById('natpf-versus-wait').classList.contains('hidden'), null, 30000);
  check('6. P2 uscito: l’host si ferma e spiega cosa succede', waited && await p1.evaluate(() => __natpfTennis.natpfPaused));
  const { ctx: c3, p: p2b, errs: e3 } = await page(B, invite, { w: 1100, h: 680 });
  await ready(p2b); await p2b.evaluate(NO_RENDER);
  const resumed = await until(p1, () => __natpfTennis.natpfVersusWait === false && !__natpfTennis.natpfPaused, null, 45000);
  check('   P2 rientra con lo stesso link: la partita riprende da sola', resumed);
  const synced = await until(p2b, s => JSON.stringify(['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => __natpfTennis.score[k])) === s, JSON.stringify(s1.score.length ? (await state(p1)).score : []), 15000);
  check('   dopo il rientro il P2 ha il punteggio dell’host', synced, JSON.stringify((await state(p2b)).score));

  /* 7: l'host chiude la stanza; link a una stanza che non esiste */
  await p1.evaluate(() => { __natpfTennis.natpfUi.backToMenu(); __natpfTennis.natpfUi.lobby.setMode('cpu'); });
  const closed = await until(p2b, () => document.querySelector('[data-versus-guest]')?.dataset.state === 'closed', null, 20000);
  check('7. l’host sceglie «Contro la CPU»: il P2 vede «stanza chiusa»', closed, await guestStatus(p2b));
  check('   l’host non è più in sfida', await p1.evaluate(() => !__natpfTennis.versus.active && !__natpfTennis.isMultiplayer && __natpfTennis.roomId === 'default'));
  const bad = new URL(invite); bad.searchParams.set('room', 'AT-ZZZZ');
  const { p: p2c, errs: e4 } = await page(B, bad.href, { w: 1100, h: 680 });
  await ready(p2c); await p2c.evaluate(NO_RENDER);
  const warned = await until(p2c, () => /chiuso la partita|nuovo link/.test(document.querySelector('[data-p2p-status]')?.textContent || ''), null, 40000);
  check('   link a una stanza inesistente: il P2 legge che deve chiedere un nuovo link', warned, await p2c.evaluate(() => document.querySelector('[data-p2p-status]')?.textContent));

  const errs = [...e1, ...e2, ...e3, ...e4].filter(m => !/WebGL|GPU|swiftshader|peer-unavailable|Could not connect to peer/i.test(m));
  check('nessun errore nelle pagine', !errs.length, errs.slice(0, 4).join(' | '));
  await p1.screenshot({ path: SP + '/natpf-1v1-p2p-host.png' }).catch(() => {});
  void c3;
} catch (err){
  check('prova 1v1 p2p', false, String(err?.stack || err).split('\n').slice(0, 3).join(' '));
} finally {
  await B.close(); stop(); summary();
}
