// NATPF motore base (natpf-tennis/): sfida tra due computer sul sito statico, con due sessioni del browser vere.
// Serve la build (natpf-tennis/dist) come farebbe Cloudflare Pages, senza /api/match: l'host tiene il relay in memoria
// e il Player 2 si collega con WebRTC (PeerJS) attraverso un server di segnalazione locale (?peer=…).
// Verifica: link d'invito p2p, ingresso del P2, colpi del P2 fino all'host, scambio, punteggio sincronizzato,
// servizio di tutti e due i giocatori, P2 che chiude la pagina e torna con lo stesso link.
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

const here = path.dirname(fileURLToPath(import.meta.url)), DIST = path.resolve(here, '../../natpf-tennis/dist');
if (!fs.existsSync(path.join(DIST, 'index.html'))){ console.log('Manca natpf-tennis/dist: eseguire prima la build'); process.exit(1); }
const PEER_PORT = +(process.env.PEER_PORT || 9117), GAME_PORT = +(process.env.GAME_PORT || 3117);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const peerApp = express(), peerServer = http.createServer(peerApp);
peerApp.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const site = express();
site.use('/api', (req, res) => res.status(404).send('sito statico'));   // come Cloudflare Pages: nessun relay sul server
site.use(express.static(DIST));
const gameServer = await new Promise(r => { const s = site.listen(GAME_PORT, '127.0.0.1', () => r(s)); });
const stop = () => { peerServer.close(); gameServer.close(); };

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
const ready = p => p.waitForFunction(() => window.__natpfTennis?.player?.model && window.__natpfTennis.racketKinematics, null, { timeout: 120000 });
const state = p => p.evaluate(() => { const e = __natpfTennis; return { score: ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => e.score[k]), server: e.score.server, phase: e.phase, rally: window.__maxRally, p2swings: window.__p2swings, served: window.__served, p2p: e.natpfP2p?.status }; });

const B = await launch();
try {
  const { p: p1, errs: e1 } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1100, h: 680 });
  await ready(p1);
  await p1.evaluate(() => __natpfTennis.hud.callbacks.onSelectDifficulty('1v1'));
  await p1.waitForFunction(() => document.querySelector('#natpf-invite a')?.href, null, { timeout: 30000 });
  const invite = await p1.evaluate(() => document.querySelector('#natpf-invite a').href), u = new URL(invite);
  check('link del Player 2: stanza, role=p2, net=p2p e server di segnalazione', u.searchParams.get('role') === 'p2' && u.searchParams.get('net') === 'p2p' && /^AT-/.test(u.searchParams.get('room') || '') && u.searchParams.get('peer') === `127.0.0.1:${PEER_PORT}`, invite);
  await p1.waitForFunction(() => __natpfTennis.natpfP2p?.mode === 'host' && __natpfTennis.natpfP2p.status === 'waiting', null, { timeout: 30000 });
  check('host in attesa del Player 2 senza server di partita', true);

  const { ctx: c2, p: p2, errs: e2 } = await page(B, invite, { w: 1100, h: 680 });
  await ready(p2);
  await p2.evaluate(() => document.querySelector('#natpf-guest-go')?.click());
  await p2.waitForFunction(() => __natpfTennis.natpfP2p?.status === 'connected', null, { timeout: 30000 });
  check('P2 collegato all’host con WebRTC', await p2.evaluate(() => __natpfTennis.playerRole === 'p2' && __natpfTennis.isMultiplayer && __natpfTennis.natpfP2p.mode === 'guest'));
  await p1.waitForFunction(() => __natpfTennis.natpfP2p?.status === 'connected', null, { timeout: 30000 });
  check('l’host vede il Player 2 collegato', true);
  // il disegno con WebGL software rallenta i fotogrammi: la partita resta, si toglie solo il render
  for (const p of [p1, p2]) await p.evaluate(() => { __natpfTennis.render = () => {}; });

  await p1.evaluate(() => {
    const e = __natpfTennis, mc = e.motionController, f = mc.onP2Swing;
    window.__p2swings = 0; mc.onP2Swing = s => { window.__p2swings++; return f(s); };
    e.hud.callbacks.onStartMatch({ gamesToWin: 2, inputMode: 'mouse' }); e.hud.hideTitleModal();
  });
  await p1.evaluate(BOT); await p2.evaluate(BOT);
  await p1.waitForFunction(() => ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase), null, { timeout: 30000 });
  // si gioca finché anche il P2 ha servito (cambio del servizio dopo un game) o al massimo 150 s
  const t0 = Date.now(); let s1 = null, s2 = null;
  while (Date.now() - t0 < 150000){
    await sleep(2000);
    [s1, s2] = await Promise.all([state(p1), state(p2)]);
    if (s1.p2swings >= 4 && s1.rally >= 3 && s2.served?.opponent >= 1 && s1.score.some(Boolean)) break;
  }
  await sleep(1500);
  [s1, s2] = await Promise.all([state(p1), state(p2)]);
  console.log('P1', JSON.stringify(s1)); console.log('P2', JSON.stringify(s2));
  check('i colpi del P2 arrivano all’host attraverso WebRTC', s1.p2swings >= 2, `colpi ricevuti: ${s1.p2swings}`);
  check('scambio tra le due sessioni', s1.rally >= 2, `scambio più lungo: ${s1.rally} colpi`);
  check('servono tutti e due i giocatori (cambio del servizio)', s1.served.player >= 1 && s2.served.opponent >= 1, `P1 ${s1.served.player}, P2 ${s2.served.opponent}`);
  check('punteggio e servizio uguali sulle due sessioni', JSON.stringify(s1.score) === JSON.stringify(s2.score) && s1.server === s2.server, `P1 ${s1.score} ${s1.server} · P2 ${s2.score} ${s2.server}`);
  await p2.screenshot({ path: SP + '/natpf-1v1-p2p-p2.png' }).catch(() => {});

  // il P2 chiude la pagina: l'host lo vede scollegato, poi il P2 torna con lo stesso link
  await c2.close();
  await p1.waitForFunction(() => ['lost', 'waiting'].includes(__natpfTennis.natpfP2p?.status), null, { timeout: 30000 }).catch(() => {});
  const lost = await p1.evaluate(() => __natpfTennis.natpfP2p?.status);
  check('l’host si accorge che il P2 è uscito', lost === 'lost' || lost === 'waiting', lost);
  const { p: p2b, errs: e3 } = await page(B, invite, { w: 1100, h: 680 });
  await ready(p2b);
  await p2b.evaluate(() => document.querySelector('#natpf-guest-go')?.click());
  const back = await p2b.waitForFunction(() => __natpfTennis.natpfP2p?.status === 'connected', null, { timeout: 30000 }).then(() => true, () => false);
  await p1.waitForFunction(() => __natpfTennis.natpfP2p?.status === 'connected', null, { timeout: 30000 }).catch(() => {});
  check('il P2 rientra con lo stesso link e l’host lo vede di nuovo', back && await p1.evaluate(() => __natpfTennis.natpfP2p?.status === 'connected'));
  await sleep(4000);
  const [r1, r2] = await Promise.all([state(p1), p2b.evaluate(() => { const e = __natpfTennis; return { score: ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => e.score[k]) }; })]);
  check('dopo il rientro il P2 riceve il punteggio dell’host', JSON.stringify(r1.score) === JSON.stringify(r2.score), `P1 ${r1.score} · P2 ${r2.score}`);

  const errs = [...e1, ...e2, ...e3].filter(m => !/WebGL|GPU|swiftshader/i.test(m));
  check('nessun errore nelle pagine', !errs.length, errs.slice(0, 4).join(' | '));
} catch (err){
  check('prova 1v1 p2p', false, String(err?.stack || err).split('\n').slice(0, 3).join(' '));
} finally {
  await B.close(); stop(); summary();
}
