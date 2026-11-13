// B43 · tabellone pulito, pannello dello staff che ferma la partita, scritta del punto mezzo secondo dopo
// (docs/coda/B43-tabellone-e-pannello.md, docs/b43/tabellone-e-pannello.md). Ogni test fallisce con il codice di prima.
import test from 'node:test';
import assert from 'node:assert/strict';
import { POINT_BANNER_DELAY, isPointBanner, MATCH_VOICE } from '../src/natpf/natpf_point_call.js';

const DT = 1/120;
const headless = async (opts = {}) => (await import('../scripts/audit/headless-engine.mjs')).createHeadlessEngine({ difficulty: 'casual', ...opts });
// HUD finto che annota le scritte grandi con il tempo del gioco
const watchHud = e => { const log = []; e.hud = new Proxy({}, { get: (t, k) => k === 'showCenterBanner' ? (text, o = {}) => log.push({ text, sub: o.subText || '', t: e.elapsedTime, phaseTimer: e.phaseTimer }) : k === 'showVictoryModal' ? v => log.push({ victory: v, t: e.elapsedTime }) : () => {} }); return log; };
const run = (e, s) => { for (let t = 0; t < s - 1e-9; t += DT) e.step(DT); };

/* ---------- 3 · la scritta grande del punto mezzo secondo dopo ---------- */
test('punto 3 · regola: 0,5 s di gioco; sono scritte del punto solo punto, game e partita', () => {
  assert.equal(POINT_BANNER_DELAY, 0.5);
  for (const kind of ['point', 'game', 'match']) assert.equal(isPointBanner({ call: { kind } }), true, kind);
  assert.equal(isPointBanner({ text: 'Start' }), false, 'inizio partita: subito');
  assert.equal(isPointBanner({ text: 'Match Point', call: { voice: 'Match Point' } }), false, '«Palla match» al servizio: subito');
  assert.equal(isPointBanner(null), false);
});

test('punto 3 · motore: punto, game e partita scritti 0,5 s dopo l\'atterraggio; messaggio, punteggio e voce subito', async () => {
  const e = await headless(), log = watchHud(e), said = [];
  e.audioEngine = new Proxy({}, { get: (t, k) => (k === 'announceScore' || k === 'playVoiceCallout' ? v => said.push(v) : () => {}) });
  e.startNewMatch({ showStartBanner: false }); e.matchConfig.gamesToWin = 2; said.length = 0;
  // punto: «Punto tuo» non subito, a 0,5 s
  e.phase = 'RALLY'; e.ball.lastHitter = 'opponent'; e.ball.rallyStrokeCount = 3;
  const t0 = e.elapsedTime;
  e._awardPoint('player', 'Out');
  assert.equal(e.score.playerPoints, 1, 'punteggio all\'atterraggio');
  assert.equal(e.lastBannerBroadcast.text, 'Punto tuo', 'messaggio per il Player 2 all\'atterraggio');
  assert.deepEqual(said.slice(0, 1), ['Out'], 'voce all\'atterraggio');
  assert.equal(log.length, 0, 'nessuna scritta grande all\'atterraggio');
  run(e, .49); assert.equal(log.length, 0, 'a 0,49 s ancora niente');
  run(e, .02); assert.equal(log.length, 1); assert.equal(log[0].text, 'Punto tuo');
  assert.ok(Math.abs(log[0].t - t0 - .5) <= DT + 1e-6, `a 0,5 s: ${(log[0].t - t0).toFixed(3)}`);
  // la pausa tra i punti non si accorcia: il servizio dopo arriva come prima, 2,15 s dopo l'atterraggio
  let served = null; for (let t = 0; t < 3 && served == null; t += DT){ e.step(DT); if (e.phase === 'SERVE_STANCE') served = e.elapsedTime - t0; }
  assert.ok(served != null && served > 2.15 && served < 2.15 + 2*DT, `servizio dopo ${served?.toFixed(3)} s`);
  // game: 40-0 → «Game tuo» a 0,5 s
  Object.assign(e.score, { playerPoints: 3, opponentPoints: 0 }); e.phase = 'RALLY';
  const t1 = e.elapsedTime; e._awardPoint('player', 'Nice Shot!');
  assert.equal(e.score.playerGames, 1); assert.equal(log.length, 1);
  run(e, .52); assert.equal(log.at(-1).text, 'Game tuo'); assert.ok(Math.abs(log.at(-1).t - t1 - .5) <= DT + 1e-6);
  // partita: 1 game a 0, 40-0 → la scritta a 0,5 s, la fine partita (schermata) solo dopo la scritta
  run(e, 2); Object.assign(e.score, { playerPoints: 3, opponentPoints: 0 }); e.phase = 'RALLY';
  const t2 = e.elapsedTime; e._awardPoint('player', 'Nice Shot!');
  assert.equal(e.phase, 'MATCH_OVER'); assert.equal(said.at(-1), MATCH_VOICE, 'voce di fine partita all\'atterraggio');
  assert.ok(!log.some(l => l.t >= t2), 'la scritta della partita non subito');
  const realT = globalThis.setTimeout, timers = []; globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return 0; };
  try {
    run(e, .4); assert.equal(timers.length, 0, 'niente schermata finale programmata prima della scritta');
    run(e, .12);
  } finally { globalThis.setTimeout = realT; }
  const mb = log.filter(l => l.t >= t2);
  assert.equal(mb.length, 1); assert.equal(mb[0].text, 'Partita tua!'); assert.ok(Math.abs(mb[0].t - t2 - .5) <= DT + 1e-6);
  assert.deepEqual(timers.map(x => x.ms), [1800], 'schermata finale 1,8 s dopo la scritta');
  timers[0].fn(); assert.ok(log.at(-1).victory, 'poi la schermata finale');
});

test('punto 3 · motore: se il punto finisce prima (servizio dopo, menu) la scritta non compare più', async () => {
  const e = await headless(), log = watchHud(e);
  e.startNewMatch({ showStartBanner: false });
  e.phase = 'RALLY'; e.ball.lastHitter = 'opponent'; e._awardPoint('player', 'Out');
  e._setupPointServe({ showBanner: false });
  run(e, .7); assert.equal(log.length, 0, 'servizio dopo: niente scritta del punto di prima');
  e.phase = 'RALLY'; e.ball.lastHitter = 'opponent'; e._awardPoint('player', 'Out');
  e._setupMidRallyShowcase({}); e.autoPlayMode = true;
  run(e, .7); assert.equal(log.length, 0, 'tornati al menu: niente scritta');
});

test('punto 3 · con la partita in pausa la scritta aspetta (tempo del gioco); poi arriva', async () => {
  const { makeWorld } = await import('./ui-world.mjs');
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, ui } = w, seen = [];
  const sc = E.hud.showCenterBanner.bind(E.hud); E.hud.showCenterBanner = (t, o) => { seen.push(t); return sc(t, o); };
  w.pressStart(); w.advance(300); seen.length = 0;
  E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; E._awardPoint('player', 'Out');
  w.advance(200); ui.pause.open(); assert.equal(E.natpfPaused, true);
  w.advance(2000); assert.deepEqual(seen, [], 'in pausa niente scritta');
  ui.pause.close(); w.advance(250); assert.deepEqual(seen, [], 'ripresa: mancano ancora 0,1 s di gioco');
  w.advance(150); assert.deepEqual(seen, ['Punto tuo']);
});

test('punto 3 · sfida tra due computer: sul Player 2 la scritta del punto aspetta come sull\'host; l\'inizio no; la schermata finale dopo la scritta', async () => {
  const e = await headless();
  e.playerRole = 'p2'; e.urlRoom = 'AT-AB12'; e.roomId = 'AT-AB12'; e.isMultiplayer = true;
  e.startNewMatch({ showStartBanner: false });
  let seq = 0;
  const snap = snapshot => e._handleRoomStateUpdate({ p1Online: true, epoch: 'x', snapshotSeq: ++seq, snapshot });
  snap({ lobby: true, fmt: 'singles', gamesToWin: 1 });
  const log = watchHud(e), settled = [];
  e.natpfUi = { shot: { settle: (w, why, o) => settled.push({ why, remote: !!o?.remote, t: e.elapsedTime }) } };
  const S = (pp, op, pg, og) => ({ playerPoints: pp, opponentPoints: op, playerGames: pg, opponentGames: og, server: 'player', deuceSide: true });
  // inizio partita (messaggio senza «kind»): subito
  snap({ phase: 'SERVE_STANCE', phaseTimer: 0, score: S(0, 0, 0, 0), banner: { seq: 1, text: 'Start', style: 'style-start', subText: '' } });
  assert.equal(log.length, 1, JSON.stringify(log)); assert.equal(log[0].text, 'Start');
  // punto dell'host: verdetto subito, scritta dopo 0,5 s di gioco
  snap({ phase: 'POINT_OVER', phaseTimer: 0, score: S(1, 0, 0, 0), banner: { seq: 2, text: 'Punto tuo', style: 'style-won', subText: '', call: { kind: 'point', winner: 'player', why: 'Out', score: { player: '15', opponent: '0' } } } });
  assert.equal(settled.filter(x => x.why === 'Out').length, 1, 'verdetto (B37) subito, con il messaggio');
  assert.equal(log.length, 1, 'sul P2 la scritta del punto non subito');
  run(e, .52);
  assert.equal(log.length, 2); assert.equal(log[1].text, 'Punto di Player 1', 'dal lato del Player 2');
  // fine partita: scritta a 0,5 s, schermata 1,8 s dopo la scritta
  const realT = globalThis.setTimeout, timers = []; globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return 0; };
  try {
    snap({ phase: 'MATCH_OVER', phaseTimer: 0, score: S(0, 0, 1, 0), banner: { seq: 3, text: 'Partita tua!', style: 'style-won', subText: 'Game 1-0', call: { kind: 'match', winner: 'player', games: { player: 1, opponent: 0 }, voice: MATCH_VOICE } } });
    assert.equal(timers.length, 0, 'niente schermata finale prima della scritta');
    run(e, .52);
  } finally { globalThis.setTimeout = realT; }
  assert.equal(log.at(-1).text, 'Partita di Player 1');
  assert.deepEqual(timers.map(x => x.ms), [1800]);
  timers[0].fn(); assert.equal(log.at(-1).victory?.playerWon, false, 'schermata finale del Player 2 (ha perso)');
});
