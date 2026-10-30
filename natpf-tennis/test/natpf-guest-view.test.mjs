// Palla e giocatori sul computer del Player 2 (sfida tra due computer): blocco della previsione locale dopo un colpo
// del P2, correzione morbida solo visiva, misure per la diagnostica (src/natpf/natpf_guest_view.js).
// Il test del ritorno indietro fallisce con il codice di prima (lo snapshot vecchio riportava la palla oltre la racchetta).
import test from 'node:test';
import assert from 'node:assert/strict';
import { GUEST_VIEW, createGuestView, markLocalHit, confirmsHit, holdBall, ballCorrection, applyBall, decayOffset, blendFactor, actorFix, actorStep, newStats, noteAge, noteBall, takeReport } from '../src/natpf/natpf_guest_view.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { createMatchRelay } from '../scripts/match-relay.mjs';
import { createLocalRelay, compactMatchState } from '../src/natpf/natpf_p2p.js';

/* ---------- funzioni pure ---------- */
test('blocco della previsione: solo snapshot senza il colpo locale, solo per holdMs, solo a scambio in corso', () => {
  const hit = { count: 3, at: 1000 };
  assert.equal(holdBall(null, { rallyStrokeCount: 2 }, { now: 1010 }), false, 'senza colpo locale si applica tutto');
  assert.equal(holdBall(hit, { rallyStrokeCount: 2, lastHitter: 'player' }, { now: 1100, phase: 'RALLY' }), true, 'conteggio più basso');
  assert.equal(holdBall(hit, { rallyStrokeCount: 3, lastHitter: 'player' }, { now: 1100, phase: 'RALLY' }), true, 'stesso conteggio ma colpo dell’host');
  assert.equal(holdBall(hit, { rallyStrokeCount: 3, lastHitter: 'opponent' }, { now: 1100, phase: 'RALLY' }), false, 'snapshot con il colpo');
  assert.equal(holdBall(hit, { rallyStrokeCount: 4, lastHitter: 'player' }, { now: 1100, phase: 'RALLY' }), false, 'l’host ha già risposto');
  assert.equal(holdBall(hit, { rallyStrokeCount: 2 }, { now: 1000 + GUEST_VIEW.holdMs }), true);
  assert.equal(holdBall(hit, { rallyStrokeCount: 2 }, { now: 1001 + GUEST_VIEW.holdMs }), false, 'dopo il limite vince l’host');
  assert.equal(holdBall(hit, { rallyStrokeCount: 2 }, { now: 1100, phase: 'POINT_OVER' }), false, 'punto chiuso dall’host');
  assert.deepEqual(markLocalHit(createGuestView(), { count: 5, now: 7 }), { count: 5, at: 7 });
  // colpo locale: lo scarto di prima non resta sulla palla appena colpita
  const v = createGuestView(); v.off.z = 1.2; v.own = 3;
  markLocalHit(v, { count: 4, now: 0 });
  assert.deepEqual(v.off, { x: 0, y: 0, z: 0 }); assert.equal(v.own, null);
  // conferma del colpo locale: stesso conteggio e battitore il P2, anche dopo holdMs
  assert.equal(confirmsHit(hit, { rallyStrokeCount: 3, lastHitter: 'opponent' }), true);
  assert.equal(confirmsHit(hit, { rallyStrokeCount: 3, lastHitter: 'player' }), false);
  assert.equal(confirmsHit(hit, { rallyStrokeCount: 4, lastHitter: 'opponent' }), false);
  assert.equal(confirmsHit(null, { rallyStrokeCount: 3, lastHitter: 'opponent' }), false);
});

test('correzione della palla: fusione per gli scarti piccoli, salto netto con un colpo nuovo o uno scarto grande', () => {
  const at = (x, y, z, count = 2, hitter = 'player') => ({ pos: { x, y, z }, count, hitter });
  const zero = { x: 0, y: 0, z: 0 };
  let c = ballCorrection(at(0, 1, -5), at(0, 1, -5.3), zero);
  assert.equal(c.kind, 'fuso'); assert.ok(Math.abs(c.off.z - 0.3) < 1e-9, 'la palla disegnata resta dov’era'); assert.ok(Math.abs(c.size - 0.3) < 1e-9);
  // l'offset si somma a quello che resta (la palla disegnata non scatta neanche con due snapshot vicini)
  c = ballCorrection(at(0, 1, -5), at(0, 1, -5.2), { x: 0, y: 0, z: 0.3 });
  assert.ok(Math.abs(c.off.z - 0.5) < 1e-9);
  assert.equal(ballCorrection(at(0, 1, -5), at(0, 1, -7), zero).kind, 'salto', 'oltre 1,5 m');
  assert.deepEqual(ballCorrection(at(0, 1, -5), at(0, 1, -5.1), { x: 0, y: 0, z: 1.45 }).off, zero, 'offset accumulato oltre 1,5 m');
  for (const next of [at(0, 1, -5.1, 3), at(0, 1, -5.1, 2, 'opponent')]){
    const k = ballCorrection(at(0, 1, -5), next, { x: 0.4, y: 0, z: 0 });
    assert.equal(k.kind, 'colpo'); assert.deepEqual(k.off, zero, 'colpo nuovo: niente fusione');
  }
  // colpo del P2 confermato: limite di salto ownSnapM
  assert.equal(ballCorrection(at(0, 1, -5), at(0, 1, -7), zero, { own: true }).kind, 'fuso');
  assert.equal(ballCorrection(at(0, 1, -5), at(0, 1, -5 - GUEST_VIEW.ownSnapM - 0.1), zero, { own: true }).kind, 'salto');
});

test('valori non finiti: l’offset torna a zero invece di restare NaN per sempre', () => {
  const at = (x, y, z) => ({ pos: { x, y, z }, count: 2, hitter: 'player' });
  const zero = { x: 0, y: 0, z: 0 };
  let c = ballCorrection(at(0, 1, -5), at(0, NaN, -5.2), zero);
  assert.equal(c.kind, 'salto'); assert.deepEqual(c.off, zero); assert.equal(c.size, 0, 'statistiche non avvelenate');
  c = ballCorrection(at(0, 1, -5), at(0, 1, -5.2), { x: NaN, y: 0, z: 0 });
  assert.equal(c.kind, 'salto'); assert.deepEqual(c.off, zero, 'un offset già NaN si azzera alla correzione dopo');
  assert.deepEqual(decayOffset({ x: NaN, y: 0, z: 0.5 }, 16), zero, 'e anche al fotogramma');
  const s = noteBall(newStats(), c);
  assert.ok(Number.isFinite(s.corrSum));
});

test('conferma del colpo del P2: offset grande fuso per tutto il colpo; recupero senza tornare indietro', () => {
  const at = (z, count = 2, hitter = 'opponent') => ({ pos: { x: 0, y: 1, z }, count, hitter });
  const v = createGuestView();
  let c = applyBall(v, at(-7), at(-9.1), { confirm: true });
  assert.equal(c.kind, 'conferma'); assert.ok(Math.abs(v.off.z - 2.1) < 1e-9, 'la palla disegnata resta dov’era'); assert.equal(v.own, 2);
  // snapshot dopo, stesso colpo: ancora limite largo (offset rimasto + scarto piccolo oltre 1,5 m)
  c = applyBall(v, at(-6), at(-6.05));
  assert.equal(c.kind, 'fuso'); assert.ok(v.off.z > GUEST_VIEW.snapM);
  // l'host risponde: colpo nuovo, si torna al limite normale
  c = applyBall(v, at(-6), at(10, 3, 'player'));
  assert.equal(c.kind, 'colpo'); assert.equal(v.own, null); assert.deepEqual(v.off, { x: 0, y: 0, z: 0 });
  assert.equal(applyBall(v, at(10, 3, 'player'), at(8, 3, 'player')).kind, 'salto');
  // recupero: palla a 30 m/s verso +z, offset in avanti di 2 m: per fotogramma la palla disegnata avanza almeno minSpeed
  const vel = { x: 0, y: 0, z: 30 }, off = { x: 0, y: 0, z: 2 };
  let t = 0;
  while (off.z > 0.02 && t < 1000){
    const before = off.z;
    decayOffset(off, 1000/60, { vel });
    assert.ok(30 / 60 - (before - off.z) >= GUEST_VIEW.minSpeed * 30 / 60 - 1e-9, 'avanza almeno al 30%');
    t += 1000/60;
  }
  assert.ok(t > 60 && t < 250, `sotto 2 cm in un tempo ragionevole: ${t} ms`);
  // fermo del colpo (fisica ferma): lo scarto in avanti aspetta; all'indietro e palla ferma decade come prima
  assert.equal(decayOffset({ x: 0, y: 0, z: 1 }, 16, { vel, physMs: 0 }).z, 1);
  assert.ok(decayOffset({ x: 0, y: 0, z: -1 }, 16, { vel }).z > -0.7);
  assert.ok(decayOffset({ x: 0, y: 0, z: 1 }, 16, { vel: { x: 0, y: 0, z: 0 } }).z < 0.7);
});

test('l’offset visivo decade in ~100 ms, gli attori recuperano a ogni fotogramma', () => {
  const off = { x: 0, y: 0.2, z: 1 };
  for (let t = 0; t < GUEST_VIEW.blendMs; t += 1000/60) decayOffset(off, 1000/60);
  assert.ok(Math.hypot(off.x, off.y, off.z) < 0.06, `dopo ~100 ms resta poco: ${off.z}`);
  for (let i = 0; i < 30; i++) decayOffset(off, 1000/60);
  assert.deepEqual(off, { x: 0, y: 0, z: 0 }, 'sotto il millimetro è zero');
  assert.equal(blendFactor(0, 60), 0); assert.equal(blendFactor(10, 0), 1);
  assert.deepEqual(actorFix({ x: 0, z: 0 }, { px: 4, pz: 0 }), { snap: true, fix: null });
  let { fix } = actorFix({ x: 0, z: 0 }, { px: 0.6, pz: -0.3 });
  assert.deepEqual(fix, { x: 0.6, z: -0.3 });
  let moved = 0;
  for (let i = 0; i < 3 && fix; i++){ const s = actorStep(fix, 1000/60); moved += s.step.x; fix = s.fix; }
  assert.ok(moved > 0.6 * 0.4 && moved < 0.6 * 0.75, `in 50 ms una parte, non tutto in un colpo: ${moved}`);
});

test('diagnostica: età degli snapshot, correzioni, blocchi, ogni 5 s', () => {
  const v = createGuestView();
  assert.equal(takeReport(v, 1000), null, 'il primo giro fissa l’inizio');
  noteAge(v.stats, 40); noteAge(v.stats, 80); noteAge(v.stats, undefined);
  noteBall(v.stats, { kind: 'fuso', size: 0.1 }); noteBall(v.stats, { kind: 'salto', size: 2 });
  noteBall(v.stats, { kind: 'colpo', size: 9 }); noteBall(v.stats, { held: true }); noteBall(v.stats, { kind: 'conferma', size: 2.1 });
  assert.equal(takeReport(v, 3000), null);
  assert.deepEqual(takeReport(v, 6000), { snapshot: 3, etaMediaMs: 60, etaMaxMs: 80, correzioneMediaCm: 105, correzioneMaxCm: 200, salti: 1, colpiNuovi: 1, blocchi: 1, conferme: 1, confermaMaxCm: 210 });
  assert.deepEqual(v.stats, newStats(), 'si riparte da zero');
  assert.equal(takeReport(v, 12000), null, 'niente snapshot, niente evento');
});

test('relay: età dello snapshot alla lettura, conservata nella risposta compatta del collegamento diretto', async () => {
  const { handle } = createLocalRelay({ relay: createMatchRelay({ publicUrl: '' }) });
  const json = r => JSON.parse(r.text);
  const c = json(await handle({ method: 'POST', url: '/api/match/create', body: {} }));
  assert.equal(json(await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2` })).snapshotAgeMs, null, 'ancora nessuno snapshot');
  await handle({ method: 'POST', url: '/api/match/sync', body: { room: c.roomId, snapshot: { phase: 'RALLY' } } });
  const real = Date.now; Date.now = () => real() + 120;
  let st;
  try { st = await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2` }); } finally { Date.now = real; }
  const age = json(st).snapshotAgeMs;
  assert.ok(age >= 120 && age < 1000, `età ${age}`);
  assert.equal(JSON.parse(compactMatchState(st.text)).snapshotAgeMs, age);
});

/* ---------- motore del Player 2 ---------- */
function guest(){
  const e = createHeadlessEngine({ difficulty: 'casual' });
  e.playerRole = 'p2'; e.urlRoom = 'AT-AB12'; e.roomId = 'AT-AB12'; e.isMultiplayer = true;
  e.startNewMatch({ showStartBanner: false });
  return e;
}
const score = { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true };
// scambio in corso: l'host ha colpito (1 colpo), la palla arriva al P2; il P2 colpisce in locale
function rallyAtP2(){
  const e = guest();
  let seq = 0;
  const snap = (ball, extra = {}) => e._handleRoomStateUpdate({ p1Online: true, epoch: 'x', snapshotSeq: ++seq, snapshotAgeMs: 30, snapshot: { phase: 'RALLY', phaseTimer: 1, score, ball, ...extra } });
  const old = { px: -0.5, py: 1, pz: -10.6, vx: 0, vy: 0, vz: -18, inPlay: true, lastHitter: 'player', shotType: 'TOPSPIN', rallyStrokeCount: 1 };
  snap(old);
  e.opponent.pos.set(-1, 0, -11.4); e.opponent.vel.set(0, 0, 0);
  const real = Math.random; Math.random = mulberry32(7);
  let ok;
  try { ok = e._attemptP2RallyStrike({ source: 'mouse', side: 'forehand', shotType: 'topspin', speed: 1.3, dirX: 0 }); } finally { Math.random = real; }
  assert.ok(ok !== false, 'il P2 colpisce in locale');
  assert.equal(e.ball.lastHitter, 'opponent'); assert.equal(e.ball.rallyStrokeCount, 2);
  return { e, snap, old };
}

test('P2: dopo il suo colpo uno snapshot vecchio non riporta indietro la palla (prima tornava oltre la racchetta)', () => {
  const { e, snap, old } = rallyAtP2();
  const vz = e.ball.vel.z, z0 = e.ball.pos.z;
  assert.ok(vz > 0, 'la palla va verso l’host');
  // snapshot fatto dall'host prima di ricevere il colpo: palla ancora in arrivo verso il P2, un po' più avanti
  snap({ ...old, pz: -11.2 }, { actors: { player: { px: 1, pz: 11.8, tx: 1, tz: 11.8, sw: 0 } } });
  assert.equal(e.ball.vel.z, vz, 'la palla non torna indietro');
  assert.equal(e.ball.pos.z, z0);
  assert.equal(e.ball.lastHitter, 'opponent'); assert.equal(e.ball.rallyStrokeCount, 2);
  assert.equal(e.phase, 'RALLY'); assert.equal(e.player.targetPos.z, 11.8, 'fase e attori si applicano sempre');
  assert.equal(e.natpfGuestView.stats.holds, 1, 'contato per la diagnostica');
  // stesso conteggio ma ancora il colpo dell'host: anche questo è vecchio
  snap({ ...old, pz: -11.3, rallyStrokeCount: 2 });
  assert.equal(e.ball.vel.z, vz);
});

test('P2: lo snapshot con il colpo arrivato all’host si applica (fuso se vicino), e il blocco finisce', () => {
  const { e, snap } = rallyAtP2();
  const p = e.ball.pos.clone(), v = e.ball.vel.clone();
  snap({ px: p.x + 0.2, py: p.y, pz: p.z + 0.1, vx: v.x, vy: v.y, vz: v.z, inPlay: true, lastHitter: 'opponent', shotType: 'TOPSPIN', rallyStrokeCount: 2 });
  assert.ok(Math.abs(e.ball.pos.x - (p.x + 0.2)) < 1e-6, 'la fisica è quella dell’host');
  assert.equal(e.natpfGuestView.hit, null, 'il blocco è finito');
  assert.equal(e.natpfGuestView.stats.confN, 1, 'riconosciuto come conferma del colpo locale');
  const off = e.natpfGuestView.off;
  assert.ok(Math.abs(off.x + 0.2) < 1e-6 && Math.abs(off.z + 0.1) < 1e-6, 'la palla disegnata resta dov’era');
  const d = e._natpfBallDrawPos();
  assert.ok(d.distanceTo(p) < 1e-6, 'disegnata = fisica + offset');
  // l'offset decade con i fotogrammi
  for (let i = 0; i < 7; i++) e._natpfGuestFrame(1/60);
  assert.ok(Math.hypot(off.x, off.y, off.z) < 0.02, `dopo ~115 ms quasi zero: ${off.x}`);
});

test('P2: dopo holdMs anche uno snapshot vecchio si applica; un colpo nuovo dell’host azzera l’offset', () => {
  const { e, snap, old } = rallyAtP2();
  e.natpfGuestView.hit.at -= GUEST_VIEW.holdMs + 1;
  snap({ ...old, pz: -11.2 });
  assert.equal(e.ball.lastHitter, 'player'); assert.equal(e.ball.pos.z, -11.2); assert.equal(e.ball.vel.z, -18);
  // scarto piccolo nello stesso colpo: fusione; poi colpo nuovo dell'host: salto netto, offset a zero
  snap({ ...old, pz: -11.3 });
  assert.ok(Math.abs(e.natpfGuestView.off.z - 0.1) < 1e-6);
  snap({ ...old, pz: 8, vz: 18, rallyStrokeCount: 3 });
  assert.deepEqual({ ...e.natpfGuestView.off }, { x: 0, y: 0, z: 0 });
  assert.equal(e._natpfBallDrawPos().z, 8);
});

test('P2: attori verso l’host a ogni fotogramma, non al 65% in un colpo', () => {
  const { e, snap, old } = rallyAtP2();
  e.player.pos.set(1, 0, 11.8);
  snap({ ...old, rallyStrokeCount: 2, lastHitter: 'opponent' }, { actors: { player: { px: 1.6, pz: 11.8, tx: 1.6, tz: 11.8, sw: 0 } } });
  assert.equal(e.player.pos.x, 1, 'lo snapshot non sposta l’attore di colpo');
  e._natpfGuestFrame(1/60);
  assert.ok(e.player.pos.x > 1 && e.player.pos.x < 1.3, `un passo: ${e.player.pos.x}`);
  for (let i = 0; i < 30; i++) e._natpfGuestFrame(1/60);
  assert.ok(Math.abs(e.player.pos.x - 1.6) < 0.01, 'arriva alla posizione dell’host');
  // lontano (cambio di campo): salto netto
  snap({ ...old, rallyStrokeCount: 2, lastHitter: 'opponent' }, { actors: { player: { px: -3, pz: 8, tx: -3, tz: 8, sw: 0 } } });
  assert.equal(e.player.pos.x, -3);
});

test('P2: un riassunto «sfida.vista» ogni 5 s al callback della diagnostica', () => {
  const { e, snap, old } = rallyAtP2();
  const got = [];
  e.natpfGuestReport = r => got.push(r);
  e.natpfGuestView.reportAt = performance.now() - GUEST_VIEW.reportMs - 1;
  snap({ ...old });
  assert.equal(got.length, 1);
  assert.equal(got[0].blocchi, 1); assert.equal(got[0].etaMediaMs, 30); assert.ok(got[0].snapshot >= 2);
});

test('host e stesso schermo: nessuna vista del P2, palla disegnata = fisica', () => {
  const e = createHeadlessEngine({ difficulty: 'casual' });
  e.startNewMatch({ showStartBanner: false });
  e._handleRoomStateUpdate({ p2Online: true, snapshotSeq: 1, snapshot: { phase: 'RALLY', ball: { px: 0, py: 1, pz: 0 } } });
  assert.equal(e.natpfGuestView, undefined);
  assert.equal(e._natpfBallDrawPos(), e.ball.pos);
  e.opponent.pos.set(0, 0, -11);
  e._natpfGuestFrame(1/60);
  assert.equal(e.opponent.pos.x, 0);
  // il colpo del P2 sull'host non arma il blocco
  e.isMultiplayer = true; e.versus = { active: true }; e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player';
  e.opponent.pos.set(-1, 0, -11.4); e.ball.pos.set(-.5, 1.0, -10.6); e.ball.vel.set(0, 0, -18);
  const real = Math.random; Math.random = mulberry32(7);
  let ok;
  try { ok = e._attemptP2RallyStrike({ source: 'mouse', side: 'forehand', shotType: 'topspin', speed: 1.3, dirX: 0 }); } finally { Math.random = real; }
  assert.ok(ok !== false, 'il colpo sull’host va a segno (altrimenti il controllo sotto passerebbe per il motivo sbagliato)');
  assert.equal(e.ball.lastHitter, 'opponent'); assert.equal(e.ball.rallyStrokeCount, 1);
  assert.equal(e.natpfGuestView, undefined);
});

// Scenario della revisione: il P2 colpisce, la sua previsione vola 120 ms; poi arriva lo snapshot che CONFERMA il colpo
// (stesso conteggio, battitore il P2) con la palla dell'host 70 ms indietro (l'host ha ricevuto il colpo in ritardo).
// Prima: fuso oltre 1,5 m → salto netto, la palla disegnata tornava di ~2 m verso la racchetta del P2 e ripartiva.
test('P2: lo snapshot che conferma il colpo locale non riporta la palla verso la racchetta, la palla rallenta e converge', () => {
  const { e, snap } = rallyAtP2();
  const frame = () => { e.step(1/120); e.step(1/120); e._natpfGuestFrame(1/60, 1/60); };
  let host = null;
  for (let t = 1; t <= 12; t++){   // 120 ms di volo della previsione locale
    e.step(1/100);
    if (t === 5) host = { p: e.ball.pos.clone(), v: e.ball.vel.clone(), s: e.ball.spin.clone() };   // 50 ms dopo il colpo
  }
  const drawn0 = e._natpfBallDrawPos().z;
  assert.ok(drawn0 - host.p.z > 1.5, `scarto oltre il vecchio limite di salto: ${drawn0 - host.p.z}`);
  snap({ px: host.p.x, py: host.p.y, pz: host.p.z, vx: host.v.x, vy: host.v.y, vz: host.v.z, inPlay: true, lastHitter: 'opponent', shotType: 'TOPSPIN', rallyStrokeCount: 2 },
    { spin: [host.s.x, host.s.y] });
  assert.ok(Math.abs(e.ball.pos.z - host.p.z) < 1e-9, 'la fisica è quella dell’host');
  assert.ok(Math.abs(e._natpfBallDrawPos().z - drawn0) < 1e-9, `nessun salto all’arrivo dello snapshot: ${e._natpfBallDrawPos().z} contro ${drawn0}`);
  assert.equal(e.natpfGuestView.stats.jumps, 0);
  let z = e._natpfBallDrawPos().z;
  const speed = Math.hypot(e.ball.vel.x, e.ball.vel.z);
  for (let i = 0; i < 24; i++){   // 400 ms
    frame();
    const nz = e._natpfBallDrawPos().z;
    assert.ok(nz - z >= 0.25 * speed / 60, `fotogramma ${i}: la palla disegnata va sempre verso l’host (rallenta, non torna indietro): ${z} → ${nz}`);
    z = nz;
  }
  const off = e.natpfGuestView.off;
  assert.ok(Math.hypot(off.x, off.y, off.z) < 0.02, `converge alla palla dell’host: ${off.z}`);
  // gli snapshot successivi dello stesso colpo (ancora indietro di 70 ms) non fanno salti
  snap({ px: e.ball.pos.x, py: e.ball.pos.y, pz: e.ball.pos.z - 0.05, vx: e.ball.vel.x, vy: e.ball.vel.y, vz: e.ball.vel.z, inPlay: true, lastHitter: 'opponent', shotType: 'TOPSPIN', rallyStrokeCount: 2 });
  assert.equal(e.natpfGuestView.stats.jumps, 0);
});
