// NATPF B18, ramo R4 (revisione): formato in fiera nella sfida tra due computer. Due sessioni del browser vere sul sito
// statico (natpf-tennis/dist, come Cloudflare Pages), Player 2 collegato con WebRTC (PeerJS) a un server di segnalazione
// locale, come natpf-1v1-p2p.mjs. L'host apre il gioco con ?formato=fiera; il Player 2 apre il link d'invito senza
// nessuna scelta sua (contesto del browser nuovo: niente natpf-tennis.formatoFiera salvato). Si controlla sul computer
// del P2 quello che arriva con gli snapshot dell'host, applicato dal motore del P2:
//   • score.fair vero e partita a 1 game;
//   • la pallina del servizio sul tabellone del P2 passa H G G H H G G (H = host, G = P2) come nel tie-break;
//   • sul 40-40 il tabellone del P2 dice «Punto decisivo» (40 e 40, niente «Parità») e la voce del P2 dice
//     «Match Point» (clip esistente, call.voice del messaggio dell'host);
//   • il punto decisivo chiude la partita a 1 game anche sul P2; punteggio uguale sui due computer a ogni punto.
// I punti si assegnano sull'host con la regola del motore (_awardPoint): la prova guarda il formato, non il gioco.
//   cd natpf-tennis && node node_modules/vite/bin/vite.js build
//   cd tools/e2e && npm ci && CHROMIUM_PATH=/percorso/chrome node natpf-formato-fiera-p2p.mjs
// Non sostituisce due persone su due computer e una rete vera.
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), DIST = path.resolve(process.env.DIST || path.resolve(here, '../../natpf-tennis/dist'));
if (!fs.existsSync(path.join(DIST, 'index.html'))){ console.log('Manca natpf-tennis/dist: eseguire prima la build'); process.exit(1); }
const PEER_PORT = +(process.env.PEER_PORT || 9127), GAME_PORT = +(process.env.GAME_PORT || 3127);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(0).padStart(3)} s] ${m}`);
const fmt = v => JSON.stringify(v);

const peerApp = express(), peerServer = http.createServer(peerApp);
peerApp.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const site = express();
site.use('/api', (req, res) => res.status(404).send('sito statico'));
site.use(express.static(DIST));
const gameServer = await new Promise(r => { const s = site.listen(GAME_PORT, '127.0.0.1', () => r(s)); });
const stop = () => { peerServer.close(); gameServer.close(); };
const GAME = `http://127.0.0.1:${GAME_PORT}`;

const NO_RENDER = () => { const e = window.__natpfTennis; e.render = () => {}; };
const ready = p => p.waitForFunction(() => window.__natpfTennis?.player?.model && window.__natpfTennis.racketKinematics && window.__natpfTennis.natpfUi?.versus, null, { timeout: 120000 });
const until = async (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
const KEYS = ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'];
// tabellone del P2: righe dal suo lato (me = P2, them = host), pallina del servizio, sottotitolo
const guestBoard = p => p.evaluate(keys => {
  const el = document.getElementById('natpf-scoreboard'), E = __natpfTennis;
  const rows = el ? [...el.querySelectorAll('[data-sb-row]')].map(r => ({ side: r.dataset.sbRow, points: r.querySelector('[data-sb-points]')?.textContent, serve: r.classList.contains('serving') })) : [];
  const sv = rows.find(r => r.serve)?.side;
  return { rows, label: el?.querySelector('[data-sb-label]')?.textContent || '', server: sv === 'me' ? 'G' : sv === 'them' ? 'H' : '?', score: keys.map(k => E.score[k]), fair: E.score.fair, gamesToWin: E.matchConfig.gamesToWin, phase: E.phase, voices: window.__voices || [], banner: E.hud.elBannerText?.textContent || '' };
}, KEYS);
const hostScore = p => p.evaluate(keys => keys.map(k => __natpfTennis.score[k]), KEYS);
// host: dal punto finito al servizio dopo, facendo girare a mano i passi della fisica (Chromium senza GPU è lento)
const hostNext = p => p.evaluate(() => { const E = __natpfTennis; for (let i = 0; i < 8*120 && E.phase !== 'SERVE_STANCE'; i++) E._stepPhysics(1/120); return E.phase; });
// il P2 aspetta lo snapshot con il punteggio dell'host e il tabellone ridisegnato
const guestSynced = (p2, score) => until(p2, ({ s, keys }) => { const E = __natpfTennis; return JSON.stringify(keys.map(k => E.score[k])) === s && E.phase === 'SERVE_STANCE' && !!document.querySelector('#natpf-scoreboard [data-sb-row].serving'); }, { s: JSON.stringify(score), keys: KEYS }, 20000);

const B = await launch();
try {
  /* host con ?formato=fiera: «Sfida un amico», 1 game */
  const { p: p1, errs: e1 } = await page(B, `${GAME}/?intro=0&formato=fiera&peer=127.0.0.1:${PEER_PORT}`, { w: 1100, h: 680 });
  await ready(p1); await p1.evaluate(NO_RENDER); log('host pronto');
  await p1.evaluate(() => {
    const ui = __natpfTennis.natpfUi;
    ui.testInput = true; ui.selectController('mouse', { open: false });
    ui.lobby.menu('play');
    document.querySelector('[data-mode="friend"]').click();
  });
  await until(p1, () => document.querySelector('#natpf-invite a')?.href && __natpfTennis.natpfP2p?.status === 'waiting');
  const invite = await p1.evaluate(() => document.querySelector('#natpf-invite a').href);
  log('invito ' + invite);
  check('host: il link d\'invito non porta il formato (decide l\'host con gli snapshot)', !new URL(invite).searchParams.has('formato'), invite);
  await p1.evaluate(() => { __natpfTennis.natpfUi.lobby.go('match'); document.querySelector('#match-length-group [data-games="1"]')?.click(); });

  /* P2: apre il link in un browser nuovo, sceglie la racchetta, «Sono pronto» */
  const { p: p2, errs: e2 } = await page(B, invite, { w: 1100, h: 680 });
  await ready(p2); await p2.evaluate(NO_RENDER); log('P2 pronto');
  const saved2 = await p2.evaluate(() => localStorage.getItem('natpf-tennis.formatoFiera'));
  await until(p2, () => document.querySelector('[data-versus-guest]')?.dataset.state === 'lobby');
  await p2.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.testInput = true; ui.selectController('mouse', { open: false }); });
  await sleep(400);
  await p2.evaluate(() => document.getElementById('natpf-guest-go').click());
  check('P2 collegato e pronto, senza nessuna scelta salvata del formato', await until(p1, () => !document.getElementById('btn-start-match').disabled) && saved2 === null, `salvato sul P2: ${saved2}`);
  // voce del P2: le frasi del punteggio che il suo motore dice (dal messaggio dell'host)
  await p2.evaluate(() => { window.__voices = []; const a = __natpfTennis.audioEngine; if (a?.announceScore){ const o = a.announceScore.bind(a); a.announceScore = (t, opt) => { window.__voices.push(t); return o(t, opt); }; } });

  /* partita */
  await p1.evaluate(() => document.getElementById('btn-start-match').click());
  const started = await until(p2, () => __natpfTennis.phase === 'SERVE_STANCE' && document.getElementById('natpf-guest-modal').classList.contains('hidden'));
  await until(p2, () => __natpfTennis.score.fair === true, null, 10000);
  let g = await guestBoard(p2);
  const hostFair = await p1.evaluate(() => ({ fair: __natpfTennis.score.fair, games: __natpfTennis.matchConfig.gamesToWin }));
  check('la partita parte; sul P2 arrivano formato in fiera e 1 game dall\'host', started && hostFair.fair === true && g.fair === true && g.gamesToWin === 1 && hostFair.games === 1, fmt({ hostFair, fair: g.fair, games: g.gamesToWin }));
  const seq = [g.server], hostSeq = [await p1.evaluate(() => (__natpfTennis.score.server === 'player' ? 'H' : 'G'))], same = [];
  for (const w of ['player', 'opponent', 'player', 'opponent', 'player', 'opponent']){
    await p1.evaluate(w => __natpfTennis._awardPoint(w, 'Out'), w);
    await hostNext(p1);
    const hs = await hostScore(p1);
    const ok = await guestSynced(p2, hs);
    g = await guestBoard(p2);
    same.push(ok && JSON.stringify(g.score) === JSON.stringify(hs));
    seq.push(g.server);
    hostSeq.push(await p1.evaluate(() => (__natpfTennis.score.server === 'player' ? 'H' : 'G')));
  }
  log('P2 ' + fmt({ seq: seq.join(''), host: hostSeq.join(''), label: g.label, voices: g.voices }));
  check('P2: la pallina del servizio sul suo tabellone passa H G G H H G G (come sull\'host)', seq.join('') === 'HGGHHGG' && hostSeq.join('') === 'HGGHHGG', `P2 ${seq.join('')} · host ${hostSeq.join('')}`);
  check('punteggio uguale sui due computer a ogni punto', same.every(Boolean), fmt(same));
  check('P2, 40-40: tabellone «40» e «40» con «Punto decisivo» (niente «Parità»)', g.rows.length === 2 && g.rows.every(r => r.points === '40') && g.label === 'Punto decisivo', fmt(g.rows) + ' ' + g.label);
  // «Match Point» due volte: sul 40-30 (palla match dell'host) e sul 40-40 (punto decisivo, natpf_fair_format.decidingVoice).
  // La voce del punto («40 - 30», «Deuce») qui non arriva: i passi della fisica fatti a mano mettono il messaggio del punto
  // e quello del servizio nello stesso snapshot e il P2 dice l'ultimo; giocando, tra i due passa più di un secondo
  const voiced = await until(p2, () => (window.__voices || []).filter(v => v === 'Match Point').length >= 2, null, 8000);
  check('P2, 40-40: la voce dice «Match Point» (clip esistente, dal messaggio dell\'host)', voiced, fmt(await p2.evaluate(() => window.__voices)));
  await p2.screenshot({ path: `${SP}/formato-fiera-p2p-p2-40-40.png` }).catch(() => {});
  // il punto decisivo lo vince il P2: fine partita 0-1 sull'host, 1-0 per lui sul suo tabellone
  await p1.evaluate(() => __natpfTennis._awardPoint('opponent', 'Out'));
  const hostOver = await p1.evaluate(() => ({ phase: __natpfTennis.phase, g: [__natpfTennis.score.playerGames, __natpfTennis.score.opponentGames] }));
  const guestOver = await until(p2, () => __natpfTennis.score.opponentGames === 1 && __natpfTennis.score.playerGames === 0, null, 15000);
  check('il punto decisivo chiude la partita a 1 game sui due computer', hostOver.phase === 'MATCH_OVER' && hostOver.g.join('-') === '0-1' && guestOver, fmt({ hostOver, guest: (await guestBoard(p2)).score }));

  const errs = [...e1, ...e2].filter(m => !/WebGL|GPU|swiftshader|peer-unavailable|Could not connect to peer|Negotiation of connection|negotiation-failed/i.test(m));
  check('nessun errore nelle pagine', !errs.length, errs.slice(0, 4).join(' | '));
} catch (err){
  check('prova formato in fiera p2p', false, String(err?.stack || err).split('\n').slice(0, 3).join(' '));
} finally {
  await B.close(); stop(); summary();
  setTimeout(() => process.exit(), 300);
}
