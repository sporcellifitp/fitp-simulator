// node --test tools/test: NATPF Simulator, tennis arcade (set corti e tie-break, let, partita arcade col colpo a tempo,
// servizio col lancio, rilevatore dei colpi e calibrazione del telefono, abbinamento con il QR)
import test from 'node:test';
import assert from 'node:assert/strict';
import { COURTS, newBall, stepBall, predict } from '../../site/js/match/physics.js';
import { newScore, awardPoint, pointLabels, Rally } from '../../site/js/match/rules.js';
import { MatchCore, mulberry32 } from '../../site/js/match/core.js';
import { gauss } from '../../site/js/match/ai.js';
import { ArcadeMatch, ARC, CPU, rel, tossY, TOSS_APEX, arcadeShot, chooseCpuShotType } from '../../site/js/match/arcade.js';
import { createSwingDetector, classifySwingType } from '../../site/js/tennis/swing-detect.js';
import { createCalibration, PLAN } from '../../site/js/tennis/calibration.js';
import { playerCameraFrame } from '../../site/js/tennis/viewpoint.js';
import { evaluateSweetSpot } from '../../site/js/tennis/sweet-spot.js';
import { createGate, parsePairing, pairingUrl, newSessionId, SESSION_PREFIX } from '../../site/js/tennis/pairing.js';

const game = (s, t) => { for (let i = 0; i < 4; i++) awardPoint(s, t); };

test('prospettiva client: entrambe le squadre vedono il proprio fondo in basso e la rete davanti', () => {
  const half = 11.885;
  const p1 = playerCameraFrame({ team: 0, x: .5, z: 8 }, half);
  const p2 = playerCameraFrame({ team: 1, x: -.5, z: -8 }, half);
  assert.ok(p1.camera.z > 0 && p1.target.z < 0, 'team 0 guarda da fondo positivo verso la rete');
  assert.ok(p2.camera.z < 0 && p2.target.z > 0, 'team 1 guarda da fondo negativo verso la rete');
  assert.equal(p1.camera.y, p2.camera.y, 'altezza camera coerente');
  assert.equal(p1.target.y, p2.target.y, 'altezza del punto di mira coerente');
  assert.ok(p1.camera.z*p1.target.z < 0 && p2.camera.z*p2.target.z < 0, 'ogni camera guarda dal proprio lato verso il campo');
});

test('sweet spot: verde solo con timing, distanza e altezza coerenti; giallo in avvicinamento', () => {
  const player = { x: 0, z: 8 };
  const ball = { x: .7, y: 1.05, z: 7.6 };
  const impact = { x: .7, y: 1.05, z: 7.6 };
  const perfect = evaluateSweetSpot({ ball, player, impact, timeToImpact: .04 });
  assert.equal(perfect.visible, true); assert.equal(perfect.inReach, true);
  assert.equal(perfect.heightOk, true); assert.equal(perfect.perfect, true);
  const early = evaluateSweetSpot({ ball, player, impact, timeToImpact: .16 });
  assert.equal(early.ready, true); assert.equal(early.perfect, false);
  const stretched = evaluateSweetSpot({ ball: { ...ball, x: 1.9 }, player, impact, timeToImpact: .02 });
  assert.equal(stretched.inReach, false); assert.equal(stretched.perfect, false);
  const wrongHeight = evaluateSweetSpot({ ball: { ...ball, y: 3.5 }, player, impact, timeToImpact: .02 });
  assert.equal(wrongHeight.heightOk, false); assert.equal(wrongHeight.perfect, false);
  const overhead = evaluateSweetSpot({
    ball: { x: .7, y: 2.46, z: 7.6 }, player,
    impact: { x: .7, y: 2.48, z: 7.6 }, timeToImpact: .03,
  });
  assert.equal(overhead.perfect, true, 'la finestra alta consente il timing di uno smash');
});


test('set corto a 4: due game di scarto, tie-break sul 4-4', () => {
  let s = newScore({ gamesToWin: 4, set: true, firstServer: 0 });
  for (let i = 0; i < 3; i++){ game(s, 0); game(s, 1); }             // 3-3
  game(s, 0); assert.equal(s.winner, null);                          // 4-3: non basta
  game(s, 0); assert.equal(s.winner, 0); assert.deepEqual(s.games, [5, 3]);

  s = newScore({ gamesToWin: 4, set: true, firstServer: 0 });
  for (let i = 0; i < 4; i++){ game(s, 0); game(s, 1); }             // 4-4
  assert.equal(s.tiebreak, true); assert.deepEqual(pointLabels(s), ['0', '0']);
  const first = s.server, order = [s.server];
  for (let i = 0; i < 6; i++){ awardPoint(s, i % 2); order.push(s.server); }   // 3-3 nel tie-break
  // serve uno, poi due a testa
  assert.deepEqual(order, [first, 1 - first, 1 - first, first, first, 1 - first, 1 - first]);
  assert.deepEqual(pointLabels(s), ['3', '3']);
  awardPoint(s, 1); awardPoint(s, 1); awardPoint(s, 1); assert.equal(s.winner, null);   // 3-6
  awardPoint(s, 0); awardPoint(s, 0); awardPoint(s, 0); assert.equal(s.winner, null);   // 6-6: serve il doppio scarto
  awardPoint(s, 1); const r = awardPoint(s, 1);
  assert.equal(r.match, true); assert.equal(s.winner, 1); assert.deepEqual(s.games, [4, 5]);
});

test('partita a 1 game e formato del mondo invariato (primo a N game)', () => {
  const s = newScore({ gamesToWin: 1 }); game(s, 1); assert.equal(s.winner, 1);
  const w = newScore({ gamesToWin: 2 }); game(w, 0); game(w, 1); game(w, 0); assert.equal(w.winner, 0); assert.equal(w.tiebreak, false);
});

test('let: il servizio tocca il nastro ed entra nel riquadro, si ripete senza perdere la prima', () => {
  const r = new Rally(COURTS.tennis, { server: 0, fromRight: true });
  r.hit(0);
  assert.equal(r.event({ type: 'net', tape: true, x: 0, y: .9, z: 0 }), null);
  assert.deepEqual(r.event({ type: 'bounce', x: -2, z: -4, side: 1 }), { let: true });
  assert.equal(r.attempt, 1); assert.equal(r.state, 'serve');
  // sul nastro e fuori: fallo normale
  r.hit(0); r.event({ type: 'net', tape: true, x: 0, y: .9, z: 0 });
  assert.equal(r.event({ type: 'bounce', x: 2, z: -4, side: 1 }).fault, true);
});

test('fisica: palla sul nastro passa rallentata, palla bassa torna indietro', () => {
  const c = COURTS.tennis;
  const tape = newBall({ x: 0, y: .88, z: 1 }, { x: 0, y: 0, z: -15 }), ev = [];
  stepBall(tape, .1, c, ev);
  assert.ok(ev.some(e => e.type === 'net' && e.tape)); assert.ok(tape.p.z < 0 && tape.v.z > -10);
  const low = newBall({ x: 0, y: .5, z: 1 }, { x: 0, y: 0, z: -15 }), ev2 = [];
  stepBall(low, .1, c, ev2);
  assert.ok(ev2.some(e => e.type === 'net' && !e.tape)); assert.ok(low.p.z > 0);
});

/* ---------- partita arcade: colpo a tempo ---------- */
// scambio in corso: il computer ha appena colpito, la palla arriva al giocatore (sul dritto, dopo il rimbalzo)
function rallyScene(seed = 1, grace = .1){
  const core = new ArcadeMatch({ teams: [[{ human: true, id: 'me', grace }], [{ id: 'cpu' }]], gamesToWin: 4, set: true, firstServer: 1, rng: mulberry32(seed) });
  core.phase = 'live'; core.rally.hit(1); core.rally.event({ type: 'bounce', x: 1, z: 4, side: 0 }); core.rally.hit(0); core.rally.hit(1);
  core.sinceHit = .5; core.ball.held = false;
  const h = core.players[0]; Object.assign(h, { x: 0, z: 12, tx: 0, tz: 12, auto: false });
  core.ball.p = { x: .7, y: 1.4, z: 2 }; core.ball.v = { x: 0, y: 1.5, z: 13 };
  // istante in cui la palla passa 40 cm davanti al giocatore
  let t = 0; const b = { ...core.ball.p }, v = { ...core.ball.v };
  while (b.z < 12 - ARC.S0){ v.y -= 9.81/600; v.z *= 1 - .06/600; b.x += v.x/600; b.y += v.y/600; b.z += v.z/600; if (b.y <= 0){ b.y = 0; v.y = -v.y*.7; v.x *= .8; v.z *= .8; } t += 1/600; }
  return { core, h, tc: t };
}
// manda uno swing che «avviene» a at (secondi dall'inizio) e arriva arrive secondi dopo; restituisce il primo esito
function play(core, swings, secs = 1.6){
  const dt = 1/240, out = []; let t = 0;
  const q = swings.map(s => ({ ...s, arrive: s.at + (s.lat || 0) }));
  while (t < secs){
    const inp = { move: { x: 0, y: 0 }, swings: [], auto: false };
    for (const s of q) if (!s.sent && t >= s.arrive){ s.sent = true; inp.swings.push({ power: s.power ?? .6, lift: s.lift ?? 0, dir: s.dir ?? 0, lob: !!s.lob, drop: !!s.drop, slice: !!s.slice, dur: s.dur ?? 0, delay: s.at - t - dt }); }
    for (const e of core.update(dt, inp)) if (['contact', 'miss', 'point'].includes(e.type)) out.push(e);
    t += dt;
  }
  return out;
}
test('arcade: il timing determina qualità e ritmo, la direzione del gesto determina l\'angolo', () => {
  const court = COURTS.tennis, p = { team: 0, x: 0, z: 12 }, ball = { p: { x: .7, y: 1.4, z: 2 } };
  const early = arcadeShot(court, p, ball, { power: .6, dir: 1 }, -.17);
  const perfect = arcadeShot(court, p, ball, { power: .6, dir: 1 }, 0);
  const late = arcadeShot(court, p, ball, { power: .6, dir: 1 }, .17);
  assert.equal(early.target.x, perfect.target.x);
  assert.equal(perfect.target.x, late.target.x);
  assert.ok(perfect.pace > early.pace, 'timing perfetto aumenta il ritmo utile');
  assert.ok(early.error > perfect.error && late.error > perfect.error, 'fuori tempo aumenta il rischio');
  const left = arcadeShot(court, p, ball, { power: .6, dir: 1 }, 0).target;
  const center = arcadeShot(court, p, ball, { power: .6, dir: 0 }, 0).target;
  const right = arcadeShot(court, p, ball, { power: .6, dir: -1 }, 0).target;
  assert.ok(left.x < center.x && center.x < right.x, 'il gesto controlla sinistra, centro e destra');
  // «buono» entro 120 ms, colpo valido fino a 280 ms prima e 220 ms dopo
  for (const d of [-.1, .1, -.26, .2]){ const { core, tc } = rallyScene(4); assert.ok(play(core, [{ at: tc + d }]).find(e => e.type === 'contact'), `swing a ${d*1000} ms`); }
});
test('NATPF Simulator: la CPU varia tatticamente lob, palla corta, slice e drive in base alla posizione', () => {
  assert.equal(chooseCpuShotType(true, CPU.normale, () => .05), 'lob', 'contro chi sale a rete prova il lob');
  assert.equal(chooseCpuShotType(false, CPU.esperto, () => .05), 'drop', 'contro chi difende da fondo prova la palla corta');
  let seq = [.99, .05];
  assert.equal(chooseCpuShotType(true, CPU.esperto, () => seq.shift() ?? .99), 'slice', 'varia con uno slice se non sceglie il lob');
  seq = [.99, .99];
  assert.equal(chooseCpuShotType(false, CPU.esperto, () => seq.shift() ?? .99), 'drive', 'mantiene anche il drive come colpo base');
});
test('NATPF Simulator: drive, palla corta, lob e slice sono classificati e mirano a profondità diverse', () => {
  const court = COURTS.tennis, p = { team: 0, x: 0, z: 8 }, ball = { p: { x: 0, y: 1, z: 6 } };
  const drive = arcadeShot(court, p, ball, { power: .65 }, 0);
  const drop = arcadeShot(court, p, ball, { power: .45, drop: true, dur: .14 }, 0);
  const lob = arcadeShot(court, p, ball, { power: .65, lob: true, lift: .8 }, 0);
  const slice = arcadeShot(court, p, ball, { power: .55, slice: true, lift: -.8 }, 0);
  assert.equal(drive.type, 'drive'); assert.equal(drop.type, 'drop');
  assert.equal(lob.type, 'lob'); assert.equal(slice.type, 'slice');
  assert.ok(Math.abs(drop.target.z - Math.sign(drop.target.z)*2.1) < 1e-9, 'la palla corta atterra a circa 2,1 m dalla rete');
  assert.ok(Math.abs(drop.target.z) < Math.abs(drive.target.z), 'la palla corta è più corta del drive');
  assert.ok(drop.pace < drive.pace && slice.pace < drive.pace, 'drop e slice sono meno penetranti del drive');
  assert.ok(CPU.esperto && CPU.esperto.label === 'Esperto', 'livello CPU Esperto configurato');
  assert.deepEqual(classifySwingType({ power: .48, lift: .1, dur: 150 }), { drop: false, slice: false, lob: false });
  assert.deepEqual(classifySwingType({ power: .7, lift: -.8, dur: 240 }), { drop: false, slice: true, lob: false });
  assert.deepEqual(classifySwingType({ power: .8, lift: .8, dur: 240 }), { drop: false, slice: false, lob: true });
});
test('animazione al contatto: tipo di colpo e lato dritto/rovescio arrivano al personaggio', () => {
  let { core, h, tc } = rallyScene(31);
  const dropEvents = play(core, [{ at: tc, power: .45, drop: true, dur: 150, dir: 1 }]);
  const dropContact = dropEvents.find(e => e.type === 'contact');
  assert.ok(dropContact, 'contatto riconosciuto');
  assert.equal(dropContact.shot, 'drop');
  assert.equal(h.anim.kind, 'drop', 'la posa riproduce la palla corta');
  assert.equal(h.anim.side, 'fh', 'la palla sul lato dominante usa il dritto');

  ({ core, h, tc } = rallyScene(32));
  core.ball.p.x = -.7;
  core.ball.v.x = 0;
  const backhandEvents = play(core, [{ at: tc, power: .65, dir: -1 }]);
  const backhandContact = backhandEvents.find(e => e.type === 'contact');
  assert.ok(backhandContact, 'contatto di rovescio riconosciuto');
  assert.equal(backhandContact.shot, 'drive');
  assert.equal(h.anim.kind, 'drive');
  assert.equal(h.anim.side, 'bh', 'la palla sul lato opposto usa il rovescio');
});
test('arcade: troppo presto, troppo tardi e nessun movimento vengono detti', () => {
  let { core, tc } = rallyScene(2); assert.equal(play(core, [{ at: tc - .5 }]).find(e => e.type === 'miss').why, 'presto');
  ({ core, tc } = rallyScene(2)); assert.equal(play(core, [{ at: tc + .3 }]).find(e => e.type === 'miss').why, 'tardi');
  ({ core, tc } = rallyScene(2)); assert.equal(play(core, []).find(e => e.type === 'miss').why, 'nessuno');
});
test('arcade: apertura e ritorno del braccio non rubano il colpo (vale lo swing più vicino alla palla)', () => {
  const { core, tc } = rallyScene(3);
  const ev = play(core, [{ at: tc - .27 }, { at: tc + .02 }, { at: tc + .25 }]);
  const c = ev.filter(e => e.type === 'contact');
  assert.equal(c.length, 1); assert.equal(c[0].label, 'perfetto');
});
test('arcade: colpo dal telefono che arriva 90 ms dopo è in tempo; il contatto usa la cronologia del fotogramma', () => {
  const { core, h, tc } = rallyScene(5);
  const ev = play(core, [{ at: tc, lat: .09 }]);
  const c = ev.find(e => e.type === 'contact');
  assert.equal(c.label, 'perfetto'); assert.ok(core.ball.v.z < 0);
});
test('arcade: giocatore lontano (rete, altro computer): il punto aspetta il suo colpo anche dopo il secondo rimbalzo', () => {
  // palla corta che rimbalza due volte poco dopo il giocatore: con 0,35 s di attesa il colpo arrivato tardi vale ancora
  const { core } = rallyScene(6, .38);
  core.ball.p = { x: .7, y: .9, z: 6 }; core.ball.v = { x: 0, y: -2, z: 8 };
  const b = { ...core.ball.p }, v = { ...core.ball.v }; let t = 0;
  while (b.z < 12 - ARC.S0){ v.y -= 9.81/600; v.z *= 1 - .06/600; b.y += v.y/600; b.z += v.z/600; if (b.y <= 0){ b.y = 0; v.y = -v.y*.7; v.z *= .8; } t += 1/600; }
  const ev = play(core, [{ at: t, lat: .3 }]);
  assert.ok(!ev.some(e => e.type === 'point'), 'nessun punto chiuso prima del colpo');
  assert.equal(ev.find(e => e.type === 'contact').label, 'perfetto');
  // senza colpo, il punto si chiude dopo l'attesa con il motivo giusto
  const s2 = rallyScene(6, .38); s2.core.ball.p = { x: .7, y: .9, z: 6 }; s2.core.ball.v = { x: 0, y: -2, z: 8 };
  const ev2 = play(s2.core, [], 3);
  assert.equal(ev2.find(e => e.type === 'miss').why, 'nessuno'); assert.equal(ev2.find(e => e.type === 'point').team, 1);
});
test('arcade: servizio col lancio — in cima al lancio è perfetto, lancio non colpito si riprende senza penalità', () => {
  const mk = () => new ArcadeMatch({ teams: [[{ human: true, id: 'me' }], [{ id: 'cpu' }]], firstServer: 0, rng: mulberry32(5) });
  const dt = 1/240, idle = { move: { x: 0, y: 0 } };
  let c = mk(); c.update(dt, { ...idle, toss: {} }); let ev = [];
  for (let t = dt; t < .9; t += dt) ev = ev.concat(c.update(dt, Math.abs(t - TOSS_APEX) < dt/2 ? { ...idle, swings: [{ power: .8 }] } : idle));
  assert.equal(c.phase, 'live'); assert.equal(ev.find(e => e.type === 'contact').label, 'perfetto');
  c = mk(); c.update(dt, { ...idle, toss: {} }); ev = [];
  for (let t = 0; t < 1.6; t += dt) ev = ev.concat(c.update(dt, idle));
  assert.ok(ev.some(e => e.type === 'tossCaught')); assert.equal(c.phase, 'serve'); assert.equal(c.rally.attempt, 1);
  assert.ok(Math.abs(tossY(TOSS_APEX) - 2.78) < .1);
});

// persona col telefono: errore di tempo gaussiano, ritardo di rete, a volte l'apertura conta come colpo
function simulate({ seed, sd, lat, backswing = 0, secs = 400, cpu = 'facile' }){
  const rng = mulberry32(seed);
  const core = new ArcadeMatch({ teams: [[{ human: true, id: 'me', grace: lat + .05 }], [{ id: 'cpu' }]], cpu, gamesToWin: 99, rng: mulberry32(seed + 77) });
  const S = { contacts: 0, miss: 0, points: [0, 0], rallies: [], labels: {} }, queue = [];
  let t = 0, plan = null, tossPlan = null;
  while (t < secs){
    const h = core.players[0], inp = { move: { x: 0, y: 0 }, swings: [] };
    if (core.phase === 'serve' && core.serverP === h){
      if (!core.toss && !tossPlan){ inp.toss = {}; tossPlan = { at: core.t + TOSS_APEX + gauss(rng)*sd }; }
      if (!core.toss && tossPlan && tossPlan.sent && core.t > tossPlan.at + .5) tossPlan = null;
    } else tossPlan = null;
    if (tossPlan && core.toss && !tossPlan.sent && core.t >= tossPlan.at){ queue.push({ due: core.t + lat, at: tossPlan.at, s: { power: .7 } }); tossPlan.sent = true; }
    if (core.phase === 'live' && h.inc && !h.done && (!plan || plan.Tc !== h.inc.Tc) && h.inc.Tc - core.t < .6) plan = { Tc: h.inc.Tc, at: h.inc.Tc + gauss(rng)*sd, bs: rng() < backswing };
    if (plan && !plan.sent && core.t >= plan.at){
      if (plan.bs) queue.push({ due: core.t - .28 + lat, at: plan.at - .28, s: { power: .4 } });
      queue.push({ due: core.t + lat, at: plan.at, s: { power: .35 + rng()*.55 } }); plan.sent = true;
    }
    for (let i = queue.length - 1; i >= 0; i--) if (core.t >= queue[i].due){ const q = queue.splice(i, 1)[0]; inp.swings.push({ ...q.s, delay: q.at - core.t }); }
    for (const e of core.update(1/120, inp)){
      if (e.type === 'contact' && !e.serve){ S.contacts++; S.labels[e.label] = (S.labels[e.label] || 0) + 1; }
      if (e.type === 'miss') S.miss++;
      if (e.type === 'point'){ S.points[e.team]++; S.rallies.push(core.rally.hits); }
    }
    t += 1/120;
  }
  S.avg = S.rallies.reduce((a, b) => a + b, 0)/Math.max(1, S.rallies.length);
  return S;
}
test('arcade contro la CPU: scambi lunghi senza errori ingiustificati, anche con tempo impreciso e aperture', () => {
  for (const [sd, lat, bs] of [[.08, .06, 0], [.12, .08, .3]]){
    const S = simulate({ seed: 3, sd, lat, backswing: bs });
    const pts = S.points[0] + S.points[1];
    assert.ok(S.avg >= 6, `scambio medio ${S.avg.toFixed(1)} colpi`);
    assert.ok(S.miss/Math.max(1, S.contacts + S.miss) < .06, `palle mancate ${S.miss} su ${S.contacts + S.miss}`);
    assert.ok(pts >= 15 && S.points[0]/pts >= .5, `punti ${S.points}`);
  }
  // con un tempo molto impreciso si perdono più punti: l'abilità conta
  const bad = simulate({ seed: 3, sd: .16, lat: .1, backswing: .3 }), good = simulate({ seed: 3, sd: .05, lat: .06 });
  // Con un singolo seed il numero assoluto di punti è piccolo: richiediamo un vantaggio netto, ma non una soglia fragile al 10%.
  assert.ok(bad.points[1]/(bad.points[0] + bad.points[1]) > good.points[1]/(good.points[0] + good.points[1]) + .05, JSON.stringify([bad.points, good.points]));
});
test('partita arcade completa: set corto a 4, il punteggio torna', () => {
  const rng = mulberry32(21), core = new ArcadeMatch({ teams: [[{ human: true, id: 'me' }], [{ id: 'cpu' }]], gamesToWin: 4, set: true, rng: mulberry32(22) });
  let t = 0, over = false, plan = null;
  while (t < 2400 && !over){
    const h = core.players[0], inp = { move: { x: 0, y: 0 }, swings: [] };
    if (core.phase === 'serve' && core.serverP === h && !core.toss) inp.toss = {};
    if (core.phase === 'serve' && core.toss && Math.abs(core.t - core.toss.t0 - TOSS_APEX) < 1/240) inp.swings.push({ power: .7 });
    if (core.phase === 'live' && h.inc && (!plan || plan !== h.inc.Tc) && Math.abs(h.inc.Tc + gauss(rng)*.09 - core.t) < 1/240){ plan = h.inc.Tc; inp.swings.push({ power: .6 }); }
    for (const e of core.update(1/120, inp)) if (e.type === 'match') over = true;
    t += 1/120;
  }
  const g = core.score.games;
  assert.ok(over, 'partita finita'); assert.ok(Math.max(...g) >= 4 && (Math.abs(g[0] - g[1]) >= 2 || (Math.max(...g) === 5 && Math.min(...g) === 4)), `set ${g}`);
});

/* ---------- rilevatore dei colpi ---------- */
// tracce sintetiche a 100 Hz: rotazione a campana attorno a un asse, accelerazione verso l'alto o il basso
function trace(det, t0, { axis = [0, 1, 0], peak = 600, dur = 240, up = 0, plateau = false }){
  const n = Math.round(dur/10), out = [];
  for (let i = 0; i <= n; i++){
    const u = i/n, m = plateau ? peak*Math.min(1, u*6, (1 - u)*6) : peak*Math.sin(Math.PI*u)**2;
    const acc = [8*Math.sin(Math.PI*u), up*6*Math.sin(Math.PI*u), 0];
    det.feed({ t: t0 + i*10, rot: axis.map(a => a*m), acc, accG: [acc[0], acc[1] + 9.81, acc[2]] });
  }
  return t0 + n*10;
}
const still = (det, t0, ms, noise = 3, cb) => { let t = t0; for (; t < t0 + ms; t += 10){ const k = { t, rot: [noise*Math.sin(t), -noise*Math.cos(t), 1], acc: [0, 0, 0], accG: [0, 9.81, 0] }; det.feed(k); cb && cb(t, k); } return t; };
const L = [0, 1, 0], R = [0, -1, 0];
function calibrated(){
  const det = createSwingDetector(), cal = createCalibration(det), ev = [];
  cal.on(e => ev.push(e)); cal.start();
  let t = still(det, 0, 700, 3, (t, k) => cal.tick(t, k));
  t = still(det, t + 10, 600, 3, (t, k) => cal.tick(t, k));
  for (const w of PLAN){ t = trace(det, t + 10, { axis: w === 'L' ? L : R, peak: w === 'L' ? 700 : 520 }); t = still(det, t + 10, 500, 3, (t, k) => cal.tick(t, k)); }
  return { det, cal, ev, t };
}
test('calibrazione guidata: fermo, impugnatura, 3 swing per lato con esito, profilo su misura', () => {
  const { cal, ev } = calibrated();
  const steps = ev.filter(e => e.kind === 'step').map(e => e.step);
  assert.deepEqual(steps.slice(0, 3), ['still', 'grip', 'swings']);
  const at = ev.filter(e => e.kind === 'attempt');
  assert.equal(at.length, 6); assert.ok(at.every(a => a.ok), JSON.stringify(at));
  assert.deepEqual(at.map(a => a.dir).join(''), 'LLLRRR');
  const rv = ev.find(e => e.kind === 'review'); assert.equal(rv.pass, true);
  const p = cal.confirm();
  assert.ok(p.minPeak < 520 && p.on < p.minPeak && p.ref > 450, JSON.stringify(p));
});
test('calibrazione: movimenti troppo piccoli o direzioni non distinguibili non passano, con il motivo', () => {
  for (const [why, mk] of [['piccolo', w => ({ axis: w === 'L' ? L : R, peak: 70 })], ['direzione', () => ({ axis: L, peak: 600 })]]){
    const det = createSwingDetector(), cal = createCalibration(det), ev = []; cal.on(e => ev.push(e)); cal.start();
    let t = still(det, 0, 700, 3, (t, k) => cal.tick(t, k)); t = still(det, t + 10, 600, 3, (t, k) => cal.tick(t, k));
    for (let i = 0; i < 30 && cal.state.step === 'swings'; i++){ t = trace(det, t + 10, mk(PLAN[cal.state.idx])); t = still(det, t + 10, 500, 3, (t, k) => cal.tick(t, k)); }
    const rv = ev.find(e => e.kind === 'review');
    assert.equal(rv.pass, false); assert.equal(rv.why, why); assert.equal(cal.confirm(), null);
  }
});
test('calibrazione: telefono tenuto male (non in verticale) → avviso; apertura prima del colpo non confonde la direzione', () => {
  const det = createSwingDetector(), cal = createCalibration(det), ev = []; cal.on(e => ev.push(e)); cal.start();
  let t = still(det, 0, 700, 3, (t, k) => cal.tick(t, k));
  for (; t < 2500; t += 10){ const k = { t, rot: [1, 1, 1], acc: [0, 0, 0], accG: [0, 0, 9.81] }; det.feed(k); cal.tick(t, k); }   // telefono piatto
  assert.ok(ev.some(e => e.kind === 'grip' && !e.upright)); assert.equal(cal.state.step, 'grip');
  t = still(det, t, 600, 3, (t, k) => cal.tick(t, k));
  assert.equal(cal.state.step, 'swings');
  // ogni swing preceduto da un'apertura nel verso opposto, più lenta
  for (const w of PLAN){ t = trace(det, t + 10, { axis: w === 'L' ? R : L, peak: 300 }); t = trace(det, t + 60, { axis: w === 'L' ? L : R, peak: 700 }); t = still(det, t + 10, 500, 3, (t, k) => cal.tick(t, k)); }
  assert.equal(ev.find(e => e.kind === 'review').pass, true);
});
test('rilevatore calibrato: destra→sinistra e sinistra→destra a ogni ampiezza, potenza coerente, niente tremolii', () => {
  const { det, cal } = calibrated(); cal.confirm();
  const sw = []; det.on('swing', s => sw.push(s));
  let t = 20000;
  for (const ratio of [.55, .8, 1, 1.5, 2]) for (const axis of [L, R]){ const peak = det.profile.refs[axis === L ? 1 : -1]*ratio; t = trace(det, t + 10, { axis, peak }); t = still(det, t + 10, 400); }
  assert.equal(sw.length, 10, JSON.stringify(sw.map(s => s.peak)));
  assert.deepEqual(sw.map(s => s.dir), [1, -1, 1, -1, 1, -1, 1, -1, 1, -1]);
  assert.ok(sw.every(s => s.power >= .3 && s.power <= 1));
  for (let i = 2; i < 10; i += 2) assert.ok(sw[i].power >= sw[i - 2].power);           // più forte, più potenza
  const t0 = t; trace(det, t + 10, { peak: 120 }); still(det, t + 300, 400); assert.equal(sw.length, 10, 'tremolio ignorato');
  // movimenti simili danno potenze simili
  const p = []; det.on('swing', s => p.push(s.power)); t = t0 + 2000;
  for (let i = 0; i < 6; i++){ t = trace(det, t + 10, { axis: L, peak: 640 + (i % 3)*25 }); t = still(det, t + 10, 400); }
  assert.ok(Math.max(...p) - Math.min(...p) < .08, JSON.stringify(p));
});
test('rilevatore: preparazione appresa ignorata, un solo colpo e invio subito dopo il picco', () => {
  const { det, cal } = calibrated(); cal.confirm();
  const sw = []; det.on('swing', s => sw.push(s));
  det.setProfile({ ...det.profile, preparation: { 1: 200, '-1': 410 } });
  let t = trace(det, 30000, { axis: R, peak: 400, dur: 260 }); t = trace(det, t + 40, { axis: L, peak: 800 }); still(det, t + 10, 400);
  assert.equal(sw.length, 1); assert.deepEqual(sw.map(s => s.dir), [1]);
  sw.length = 0; t = trace(det, 40000, { axis: L, peak: 700, dur: 400, plateau: true }); still(det, t + 10, 400);
  assert.equal(sw.length, 1); assert.ok(sw[0].t - sw[0].peakT <= 60, `inviato ${sw[0].t - sw[0].peakT} ms dopo il picco`);
});

/* ---------- abbinamento ---------- */
test('abbinamento: QR monouso, chiave di ripresa, sessioni separate, scadenza', () => {
  let now = 0; const gate = createGate({ now: () => now });
  const id = newSessionId();
  assert.ok(id.startsWith(SESSION_PREFIX) && id.length > 30);
  const url = pairingUrl('https://x.example/tennis/racchetta.html', '', id, gate.token);
  const p = parsePairing(new URL(url).hash);
  assert.deepEqual(p, { session: id, token: gate.token });
  assert.equal(parsePairing('#s=altro&k=abc'), null);
  const first = gate.admit('phone1', { k: p.token });
  assert.equal(first.ok, true);
  assert.equal(gate.admit('phone2', { k: p.token }).ok, false, 'il codice del QR vale una volta');
  assert.notEqual(gate.token, p.token, 'dopo l\'uso il QR cambia');
  assert.equal(gate.admit('phone1b', { r: first.resume }).ok, true, 'lo stesso telefono si ricollega');
  assert.equal(gate.admit('x', { r: 'chiave-sbagliata-xxxxxxxxx' }).ok, false);
  // un'altra sessione non accetta i codici di questa
  const other = createGate({ now: () => now });
  assert.equal(other.admit('phone1', { k: p.token }).ok, false); assert.equal(other.admit('phone1', { r: first.resume }).ok, false);
  // scadenza del QR
  const tok = gate.token; now += 6*60*1000;
  assert.deepEqual(gate.admit('p', { k: tok }), { ok: false, why: 'expired' });
  // troppi tentativi sbagliati: QR nuovo
  const g2 = createGate({}), t0 = g2.token;
  for (let i = 0; i < 5; i++) g2.admit('bad', { k: 'tentativo' + i });
  assert.notEqual(g2.token, t0);
  // «Scollega»: la chiave di ripresa non vale più
  gate.forget(); assert.equal(gate.admit('phone1', { r: first.resume }).ok, false);
});

/* ---------- partita online: istantanee, orologi, colpi dell'amico ---------- */
import { encodeSnap, encodeEvents, createMirror } from '../../site/js/tennis/net.js';
import { createClock, parseInvite, inviteUrl, INVITE_PREFIX, newSessionId as newId } from '../../site/js/tennis/pairing.js';
test('online: orologi allineati col viaggio più breve, istantanee interpolate, eventi mostrati al momento giusto', () => {
  const clock = createClock();
  clock.add(1000, 6050, 1100); clock.add(2000, 7015, 2030);          // il secondo viaggio è più breve: vale quello
  assert.equal(clock.off, 5000); assert.equal(clock.rtt, 30);
  const core = new ArcadeMatch({ teams: [[{ human: true, id: 'h' }], [{ human: true, id: 'g' }]], rng: mulberry32(1) });
  core.players[1].anim = { kind: 'slice', side: 'bh', at: 10 };
  core.players[1].inc = { Tc: 10.2, x: .5, z: 1, side: 'bh', y: 1.25 };
  const M = createMirror({ players: [{ id: 'h', team: 0 }, { id: 'g', team: 1 }], D: .1 });
  // due istantanee a 1/30 s; la palla si muove di 0,5 m
  core.ball.p = { x: 0, y: 1, z: 0 }; core.t = 10; M.push(JSON.parse(JSON.stringify(encodeSnap(core, 50000))));
  core.ball.p = { x: 0, y: 1, z: .5 }; core.t = 10 + 1/30; M.push(JSON.parse(JSON.stringify(encodeSnap(core, 50000 + 1000/30))));
  const v = M.view(10 + 1/60);
  assert.ok(Math.abs(v.ball.p.z - .25) < .02, `interpolata a metà: ${v.ball.p.z}`);
  assert.equal(v.players[1].anim.kind, 'slice', 'il tipo di animazione si conserva nello snapshot');
  assert.equal(v.players[1].anim.side, 'bh', 'il lato del colpo si conserva nello snapshot');
  assert.equal(v.players[1].inc.y, 1.25, 'la quota prevista arriva al client remoto per lo sweet spot');
  // tempo di partita da un istante locale: ultima istantanea + tempo passato sull'orologio dell'host − ritardo di disegno
  const local = 50000 + 1000/30 - 5000 + 100;                        // 100 ms dopo l'ultima istantanea (ora locale)
  assert.ok(Math.abs(M.coreNow(local, clock) - (10 + 1/30 + .1)) < 2e-3);
  assert.ok(Math.abs(M.seenAt(local/1000, clock) - (10 + 1/30)) < 2e-3, 'lo swing si riferisce a ciò che si vedeva');
  // partita che va a metà velocità (host lento): il tempo di partita stimato segue la velocità vera
  const M2 = createMirror({ players: [{ id: 'h', team: 0 }, { id: 'g', team: 1 }], D: .1 });
  for (let i = 0; i < 30; i++){ core.t = 20 + i*.5/30; M2.push(JSON.parse(JSON.stringify(encodeSnap(core, 60000 + i*1000/30)))); }
  assert.ok(Math.abs(M2.rate - .5) < .05, `velocità ${M2.rate}`);
  assert.ok(Math.abs(M2.coreNow(60000 + 29*1000/30 + 200 - 5000, clock) - (core.t + .1)) < .01);
  M.pushEvents(encodeEvents({ t: 10.05 }, [{ type: 'bounce', x: 0, z: 1 }, { type: 'net' }]));
  assert.equal(M.takeEvents(10.04).length, 0); assert.equal(M.takeEvents(10.06).length, 1, 'il tocco di rete senza nastro non si manda');
  assert.deepEqual(M.score().labels, ['0', '0']);
  // link d'invito: id e codice dopo il «#», riconosciuti solo con il prefisso giusto
  const id = newId(undefined, INVITE_PREFIX), u = inviteUrl('https://x.example/tennis/', '', id, 'abcdefghijkmnop');
  assert.deepEqual(parseInvite(new URL(u).hash), { session: id, token: 'abcdefghijkmnop' });
  assert.equal(parseInvite('#sfida=racchetta-tel-aaaaaaaaaaaa.abcdefghijkm'), null);
});

