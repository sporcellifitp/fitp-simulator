// Sfida tra due computer (1v1): sessione, lobby, relay e regole host/Player 2 (punto 4 del 19/10).
// Ogni test riproduce un difetto trovato nella revisione del 1v1 (fallisce con il codice di prima).
import test from 'node:test';
import assert from 'node:assert/strict';
import { lobbyState, canStart, hostLobbyLines, startLabel, guestState, guestText, seqGate, newSwings, VERSUS } from '../src/natpf/natpf_versus.js';
import { createMatchRelay, ROOM_RE, newRoomId } from '../scripts/match-relay.mjs';
import { createLocalRelay } from '../src/natpf/natpf_p2p.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';

test('lobby dell’host: in attesa → P2 entrato → P2 pronto; «Gioca» solo con il P2 pronto', () => {
  assert.equal(lobbyState({}), 'waiting');
  assert.equal(lobbyState({ p2Online: true }), 'joined');
  assert.equal(lobbyState({ p2Online: true, p2Ready: true }), 'ready');
  assert.equal(lobbyState({ p2Online: false, p2Ready: true }), 'waiting', 'pronto ma uscito non conta');
  assert.ok(!canStart('waiting') && !canStart('joined') && canStart('ready'));
  const lines = hostLobbyLines('waiting', { roomId: 'AT-AB12', p2Name: 'Player 2' });
  assert.deepEqual(lines.map(l => l.state), ['ok', 'on', '']);
  assert.match(lines[0].text, /AT-AB12/); assert.match(lines[1].text, /link/);
  assert.deepEqual(hostLobbyLines('ready', { roomId: 'AT-AB12' }).map(l => l.state), ['ok', 'ok', 'ok']);
  assert.match(startLabel('waiting'), /attesa/); assert.equal(startLabel('ready'), 'Gioca ›');
  // niente più «Challenger»: ogni testo dice cosa fare
  for (const st of ['waiting', 'joined', 'ready']) for (const l of hostLobbyLines(st, { roomId: 'AT-AB12' })) assert.doesNotMatch(l.text, /challenger/i);
});

test('Player 2: stato chiaro in ogni fase (collegamento, lobby, partita, perso, chiusa, inesistente)', () => {
  assert.equal(guestState({}), 'connecting');
  assert.equal(guestState({ linked: true, hostLobby: true }), 'lobby');
  assert.equal(guestState({ linked: true, hostLobby: false, lastSnapshotAgeMs: 100 }), 'playing');
  assert.equal(guestState({ linked: true, hostLobby: false, lastSnapshotAgeMs: VERSUS.lostMs + 1 }), 'lost');
  assert.equal(guestState({ linked: false, everLinked: true }), 'lost');
  assert.equal(guestState({ linked: true, closed: true }), 'closed');
  assert.equal(guestState({ invalid: true }), 'invalid');
  assert.match(guestText('lobby'), /Sono pronto/); assert.match(guestText('lobby', { ready: true }), /avvia/);
  assert.match(guestText('lobby', { phone: true }), /Collega il telefono.*in campo/);
  assert.match(guestText('invalid'), /link nuovo/); assert.match(guestText('closed'), /nuovo link/);
});

test('contatori del relay: epoca nuova = si riparte (prima il P2 scartava gli snapshot dopo il riavvio)', () => {
  let g = seqGate(null, { epoch: 'a', seq: 50 }); assert.ok(g.ok);
  assert.ok(!seqGate(g.state, { epoch: 'a', seq: 3 }).ok);
  assert.ok(seqGate(g.state, { epoch: 'b', seq: 3 }).ok, 'relay ripartito');
  const sw = newSwings([{ seq: 5 }, { seq: 3 }, { seq: 4 }, { seq: 2 }], 2);
  assert.deepEqual(sw.map(s => s.seq), [3, 4, 5], 'tutti i colpi nuovi, in ordine (prima solo l’ultimo)');
  assert.deepEqual(newSwings([], 1, { seq: 2 }).map(s => s.seq), [2]);
});

test('relay: nomi del gioco, codice della stanza, stanza riusata, P2 online e pronto, stanza inesistente', async () => {
  const { handle } = createLocalRelay({ relay: createMatchRelay({ publicUrl: '' }) });
  const json = r => JSON.parse(r.text);
  const c = json(await handle({ method: 'POST', url: '/api/match/create', body: { p1Name: 'Player 1', p2Name: 'Player 2' } }));
  assert.match(c.roomId, ROOM_RE); assert.ok(c.epoch);
  let st = json(await handle({ url: `/api/match/state?room=${c.roomId}&role=p1&touch=p1` }));
  assert.equal(st.guestName, 'Player 2', 'prima «Challenger»'); assert.equal(st.hostName, 'Player 1');
  assert.equal(st.p2Online, false);
  // il P2 con touch=1 (come lo mandava il gioco) ora conta come online; ready=1 lo segna pronto
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=1&ready=1` });
  st = json(await handle({ url: `/api/match/state?room=${c.roomId}&role=p1&touch=p1` }));
  assert.equal(st.p2Online, true); assert.equal(st.p2Ready, true);
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2&ready=0` });
  assert.equal(json(await handle({ url: `/api/match/state?room=${c.roomId}&role=p1` })).p2Ready, false);
  // host che ricarica: chiede la stessa stanza e la ritrova
  const again = json(await handle({ method: 'POST', url: '/api/match/create', body: { roomId: c.roomId } }));
  assert.equal(again.roomId, c.roomId);
  // P2 con un codice che non esiste: 404 (prima la stanza nasceva vuota e il P2 aspettava per sempre)
  const bad = await handle({ url: '/api/match/state?room=AT-ZZZZ&role=p2&touch=p2' });
  assert.equal(bad.status, 404);
  for (let i = 0; i < 200; i++) assert.match(newRoomId(), ROOM_RE);
});

// host con una stanza attiva e un P2 finto: le regole della sessione
function host(difficulty = 'casual'){
  const e = createHeadlessEngine({ difficulty });
  e.startNewMatch({ showStartBanner: false });
  return e;
}
const p2swing = { source: 'phone', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: 0, role: 'p2' };

test('host: i colpi del P2 contano solo a partita 1v1 in corso (prima dirottavano la partita contro la CPU)', () => {
  const e = host('pro');
  e.phase = 'RALLY'; e.ball.inPlay = true;
  e._handleP2SwingInput(p2swing); e._handleP2TossInput({});
  assert.equal(e.isMultiplayer, false); assert.equal(e.matchConfig.difficulty, 'pro');
  // stanza aperta ma host nel menu (dimostrazione): ancora niente
  e.versus = { active: true }; e.autoPlayMode = true;
  e._handleP2SwingInput(p2swing);
  assert.equal(e.matchConfig.difficulty, 'pro');
  // lo stato della stanza con il P2 online non cambia il livello
  e._handleRoomStateUpdate({ p2Online: true, p1Online: true });
  assert.equal(e.matchConfig.difficulty, 'pro');
});

test('1v1: la durata scelta resta (prima sempre un game: il P2 non serviva mai) e il servizio passa al P2', () => {
  const e = host();
  e.matchConfig.gamesToWin = 2;
  e._applyDifficultyTuning('1v1');
  e.versus = { active: true }; e.autoPlayMode = false; e.roomId = 'AT-AB12';
  assert.equal(e.matchConfig.gamesToWin, 2);
  e.phase = 'RALLY'; e._handleP2SwingInput(p2swing);
  assert.equal(e.matchConfig.gamesToWin, 2, 'un colpo del P2 non riporta la durata a un game');
  for (let i = 0; i < 4; i++) e._awardPoint('player', 'Nice Shot!');
  assert.equal(e.score.playerGames, 1); assert.notEqual(e.phase, 'MATCH_OVER');
  assert.equal(e.score.server, 'opponent', 'secondo game: serve il Player 2');
  // e la CPU non serve al suo posto
  e.phase = 'SERVE_STANCE'; e.phaseTimer = 0;
  for (let i = 0; i < 400; i++) e.step(1/120);
  assert.equal(e.phase, 'SERVE_STANCE');
  e._handleP2TossInput({});
  assert.equal(e.phase, 'SERVE_TOSS');
});

test('host: lasciare la sfida chiude la stanza e libera il motore', () => {
  const e = host();
  e.versus = { active: true }; e.roomId = 'AT-AB12'; e.isMultiplayer = true;
  const real = globalThis.fetch, sent = [];
  globalThis.fetch = async (u, init) => { sent.push(JSON.parse(init.body)); return new Response('{}'); };
  try { e.endVersus(); } finally { globalThis.fetch = real; }
  assert.equal(e.versus.active, false); assert.equal(e.roomId, 'default'); assert.equal(e.isMultiplayer, false);
  assert.deepEqual(sent[0], { room: 'AT-AB12', snapshot: { closed: true } }, 'il P2 sa che la stanza è chiusa');
});

// computer del Player 2: l'host è l'unico arbitro
function guest(){
  const e = createHeadlessEngine({ difficulty: 'casual' });
  e.playerRole = 'p2'; e.urlRoom = 'AT-AB12'; e.roomId = 'AT-AB12'; e.isMultiplayer = true;
  e.startNewMatch({ showStartBanner: false });
  return e;
}
test('Player 2: punti e fine partita solo dall’host; lobby, pausa e stanza chiusa dagli snapshot', async () => {
  const e = guest();
  const score = JSON.stringify(e.score);
  e.phase = 'RALLY'; e._awardPoint('player', 'Out');
  assert.equal(JSON.stringify(e.score), score, 'il P2 non dà punti per conto suo');
  e.phase = 'POINT_OVER'; e.phaseTimer = 3;
  e.step(1/120);
  assert.equal(e.phase, 'POINT_OVER', 'il punto successivo lo prepara l’host');
  // lobby dell'host
  let seq = 0;
  const snap = (snapshot, epoch = 'x') => e._handleRoomStateUpdate({ p1Online: true, epoch, snapshotSeq: ++seq, snapshot });
  snap({ lobby: true, fmt: 'singles', gamesToWin: 2 });
  assert.equal(e.versusGuest.lobby, true); assert.equal(e.matchConfig.gamesToWin, 2);
  // partita: fase, tempo della fase e fine partita con la schermata finale
  let victory = null;
  e.hud = new Proxy({}, { get: (t, k) => k === 'showVictoryModal' ? v => { victory = v; } : () => {} });
  const realT = globalThis.setTimeout; globalThis.setTimeout = fn => { fn(); return 0; };
  try {
    snap({ phase: 'RALLY', phaseTimer: .4, score: { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true }, ball: { px: 0, py: 1, pz: 0, vx: 0, vy: 0, vz: 1 } });
    assert.equal(e.phase, 'RALLY'); assert.equal(e.phaseTimer, .4); assert.equal(e.versusGuest.lobby, false);
    snap({ phase: 'MATCH_OVER', phaseTimer: 0, score: { playerPoints: 0, opponentPoints: 0, playerGames: 1, opponentGames: 2, server: 'player', deuceSide: true } });
  } finally { globalThis.setTimeout = realT; }
  assert.ok(victory && victory.playerWon === true, 'il P2 ha vinto e vede la schermata finale (prima solo il banner)');
  snap({ closed: true });
  assert.equal(e.versusGuest.closed, true);
  // relay ripartito: contatore da capo con un'epoca nuova
  seq = 0; snap({ lobby: true }, 'y');
  assert.equal(e.versusGuest.closed, false);
  e._handleRoomStateUpdate({ invalidRoom: true });
  assert.ok(e.versusGuest.invalidSince > 0);
});

test('Player 2: sbaglia come il P1 (prima tutti i suoi colpi restavano dentro) e prende le palle alte', () => {
  const realRandom = Math.random;
  let out = 0, net = 0;
  try {
    for (let seed = 1; seed <= 400; seed++){
      let a = seed*9301 % 233280; Math.random = () => (a = (a*9301 + 49297) % 233280)/233280;
      const e = host();
      e.isMultiplayer = true; e.versus = { active: true }; e.autoPlayMode = false; e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player';
      e.opponent.pos.set(-1, 0, -11.4); e.opponent.vel.set(0, 0, 0);
      e.ball.pos.set(-.5, 1.0, -10.6); e.ball.vel.set(0, 0, -18);
      e._attemptP2RallyStrike({ source: 'mouse', side: 'forehand', shotType: 'topspin', speed: 1.6, dirX: .9 });
      const t = e.ball.targetLanding;
      if (Math.abs(t.x) > 4.335 || Math.abs(t.z) > 12.17) out++;
      if (e.ball.vel.y < 0 || t.z < 1) net++;
    }
  } finally { Math.random = realRandom; }
  assert.ok(out + net > 4, `errori del P2 su 400 colpi forti e angolati: fuori ${out}, rete ${net}`);
  assert.ok(out + net < 200, 'ma il colpo forte resta conveniente');
});
