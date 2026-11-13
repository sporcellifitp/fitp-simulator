// Varietà di traiettorie e angoli (punto 3 del 19/10): altezza sulla rete dal colpo e dalla forza, angoli stretti che
// cadono corti, rimbalzo con l'effetto, schemi della CPU scelti per peso; per giocatore, Player 2 e CPU.
// node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as NS from '../src/natpf/natpf_skill.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

const fixed = v => () => v;

test('traiettoria: il top spin lento passa alto e carico, il piatto rasoterra, il tagliato basso e con effetto all’indietro', () => {
  const at = { fromY: 1, fromZ: 11.5, toZ: -9.5, flight: .6, rng: fixed(.5) };
  const soft = NS.shotArc({ ...at, shot: 'TOPSPIN', power: .1 }), hard = NS.shotArc({ ...at, shot: 'TOPSPIN', power: .95 });
  const flat = NS.shotArc({ ...at, shot: 'FLAT', power: .9 }), slice = NS.shotArc({ ...at, shot: 'SLICE', power: .5 });
  const moon = NS.shotArc({ ...at, shot: 'MOON', power: .3 });
  assert.ok(soft.clear > hard.clear + .5, `top spin lento ${soft.clear.toFixed(2)} m, forte ${hard.clear.toFixed(2)} m`);
  assert.ok(soft.topspin > hard.topspin && soft.flight > hard.flight);
  assert.ok(flat.clear < 1.5 && flat.clear >= NS.ARC.netY);
  assert.ok(slice.topspin < 0 && slice.clear < soft.clear);
  assert.ok(moon.clear > 2.4 && moon.flight > soft.flight);
  // il tempo di volo trovato porta davvero la palla a quell'altezza sopra la rete
  for (const a of [soft, hard, flat, slice]){
    const y = NS.netCrossY({ fromY: 1, fromZ: 11.5, toZ: -9.5, flight: a.flight, topspin: a.topspin });
    assert.ok(y >= a.clear - .02, `rete a ${y.toFixed(2)} m, voluta ${a.clear.toFixed(2)} m`);
  }
  // mai più veloce di quanto proposto dal motore, e un colpo sporco esce più alto
  assert.ok(NS.shotArc({ ...at, flight: 1.4, power: .9 }).flight >= 1.4);
  assert.ok(NS.shotArc({ ...at, power: .6, quality: .4 }).clear > NS.shotArc({ ...at, power: .6, quality: 1 }).clear);
});

test('traiettoria nel motore: con la correzione per l’aria la palla cade dove era diretta, anche la parabola alta', () => {
  for (const [shot, power] of [['TOPSPIN', .1], ['TOPSPIN', .9], ['MOON', .3], ['SLICE', .5]]){
    const e = createHeadlessEngine({ difficulty: 'casual' });
    const from = e.ball.pos.clone().set(.5, 1, 11.3), to = from.clone().set(-2, 0, -9.5);
    const A = NS.shotArc({ shot, power, fromY: 1, fromZ: 11.3, toZ: -9.5, flight: .7, rng: fixed(.5) });
    e._launchBallToTarget(from.clone(), to, A.flight, { topspin: A.topspin });
    NS.fixAir(e.ball, { from, to, topspin: A.topspin });
    e.ball.pos.copy(from);
    let crossed = null;
    for (let i = 0; i < 600 && e.ball.pos.y > .08; i++){
      const z0 = e.ball.pos.z, d = Math.max(0, 1 - .012*e.ball.vel.length()/120);
      e.ball.vel.multiplyScalar(d); e.ball.vel.y -= (9.15 + A.topspin*.14)/120; e.ball.pos.addScaledVector(e.ball.vel, 1/120);
      if (z0 > 0 && e.ball.pos.z <= 0) crossed = e.ball.pos.y;
    }
    assert.ok(crossed > .914 + .1, `${shot}: sopra la rete (${crossed?.toFixed(2)} m)`);
    assert.ok(Math.abs(e.ball.pos.z - to.z) < .9, `${shot} ${power}: cade a ${e.ball.pos.z.toFixed(2)} invece di ${to.z}`);
  }
});

test('angolo stretto: la palla molto angolata cade corta, quella centrale non cambia', () => {
  const r = fixed(.5);
  assert.equal(NS.angleDepth(1.5, -10, { rng: r }), -10);
  assert.ok(NS.angleDepth(4, -10.5, { rng: r }) > -7, 'angolo stretto verso la linea del servizio');
  assert.ok(NS.angleDepth(3.4, -10.5, { rng: r }) > -10.5 && NS.angleDepth(3.4, -10.5, { rng: r }) < NS.angleDepth(4, -10.5, { rng: r }));
  assert.ok(NS.angleDepth(-4, 10.5, { rng: r }) < 7 && NS.angleDepth(-4, 10.5, { rng: r }) > 0, 'vale anche nella metà del P1 (z positiva)');
  assert.equal(NS.angleDepth(4, -5, { rng: r }), -5, 'una palla già corta resta dov’è');
});

test('rimbalzo: il top spin salta più alto e scorre, il tagliato resta basso', () => {
  const top = NS.bounceSpin(23), slice = NS.bounceSpin(-6), base = NS.bounceSpin(14);
  assert.ok(top.up > base.up && base.up > slice.up && top.along > slice.along);
  // B31: il tagliato forte (effetto −6 o meno) rimbalza più basso (fino a 0,8); il tagliato morbido e la palla corta come prima
  assert.ok(top.up <= 1.12 && slice.up >= NS.SLICE_BOUNCE.up && slice.up < .88);
  assert.equal(NS.bounceSpin(-5).up, .88); assert.equal(NS.bounceSpin(-3).up, .88);
});

test('CPU: sceglie tra più schemi (non un ciclo fisso), tutti dentro il campo; in Esperto più angoli e palle profonde', () => {
  const count = (difficulty, extra = {}) => {
    const rng = mulberry32(5), c = {};
    for (let i = 0; i < 3000; i++){
      const s = NS.cpuShotChoice({ difficulty, playerX: 1, playerZ: 11.5, rally: 4, rng, ...extra });
      assert.ok(Math.abs(s.x) < NS.COURT.SINGLES_X && s.z > 5 && s.z < NS.COURT.BASELINE_Z, `${s.kind} fuori: ${s.x}, ${s.z}`);
      c[s.kind] = (c[s.kind] || 0) + 1;
    }
    return c;
  };
  const cas = count('casual'), pro = count('pro');
  assert.ok(Object.keys(cas).length >= 7, JSON.stringify(cas));
  assert.ok(pro.angle > cas.angle*1.5 && pro.deep > cas.deep, `pro ${JSON.stringify(pro)} casual ${JSON.stringify(cas)}`);
  // giocatore a rete: pallonetti, niente parabole alte da fondo
  const net = count('casual', { playerZ: 5 });
  assert.ok(net.lob > 300 && !net.moon);
  // risposta al servizio: pochi angoli e contropiedi
  assert.ok(count('pro', { rally: 1 }).angle < pro.angle/2);
  // stesso punto dello scambio, colpi diversi (prima il colpo dipendeva solo dal numero di colpi)
  const rng = mulberry32(9), shots = new Set();
  for (let i = 0; i < 40; i++) shots.add(NS.cpuShotChoice({ rally: 4, rng }).shot);
  assert.ok(shots.size >= 3);
  // il campo libero è dalla parte opposta al giocatore
  const open = NS.cpuShotChoice({ playerX: 2, rally: 4, rng: (() => { let k = 0; const v = [.45, .5, .5]; return () => v[k++ % 3]; })() });
  assert.equal(open.kind, 'open'); assert.ok(open.x < 0);
});

// colpo del giocatore con Math.random fisso: altezza sopra la rete e punto di rimbalzo
function playerStrike(evt, { seed = .5, ballX = .6, ballZ = 10.9 } = {}){
  const realRandom = Math.random; Math.random = () => seed;
  try {
    const e = createHeadlessEngine({ difficulty: 'casual' });
    e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent';
    e.player.pos.set(0, 0, 11.4); e.player.vel.set(0, 0, 0);
    e.ball.pos.set(ballX, 1.0, ballZ); e.ball.vel.set(0, 0, 18);
    const ok = e._attemptPlayerRallyStrike(evt);
    let net = null, z0 = e.ball.pos.z;
    for (let i = 0; i < 400 && net == null; i++){ e.step(1/120); if (z0 > 0 && e.ball.pos.z <= 0) net = e.ball.pos.y; z0 = e.ball.pos.z; }
    return { ok, net, x: e.ball.targetLanding.x, z: e.ball.targetLanding.z, spin: e.ball.spin.x };
  } finally { Math.random = realRandom; }
}
function p2Strike(evt, { seed = .5, ballZ = -10.8 } = {}){
  const realRandom = Math.random; Math.random = () => seed;
  try {
    const e = createHeadlessEngine({ difficulty: 'casual' });
    e.startNewMatch({ showStartBanner: false });
    e.isMultiplayer = true; e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player';
    e.opponent.pos.set(-1, 0, -11.4); e.opponent.vel.set(0, 0, 0);
    e.ball.pos.set(-.5, 1.0, ballZ); e.ball.vel.set(0, 0, -18);
    const ok = e._attemptP2RallyStrike(evt);
    let net = null, z0 = e.ball.pos.z;
    for (let i = 0; i < 400 && net == null; i++){ e.step(1/120); if (z0 < 0 && e.ball.pos.z >= 0) net = e.ball.pos.y; z0 = e.ball.pos.z; }
    return { ok, net, x: e.ball.targetLanding.x, z: e.ball.targetLanding.z, spin: e.ball.spin.x };
  } finally { Math.random = realRandom; }
}
const swing = (speed, extra = {}) => ({ source: 'phone', side: 'forehand', shotType: 'topspin', speed, dirX: 0,
  natpf: { aim: 'swing', shot: 'topspin', wrist: 0, aimSource: 'twist', power: .5, latency: 0, hand: 'right', ...extra } });

test('giocatore: il colpo lento passa più alto e più carico del colpo forte; l’angolo stretto cade corto', () => {
  const soft = playerStrike(swing(.85)), hard = playerStrike(swing(1.6));
  assert.ok(soft.ok && hard.ok);
  assert.ok(soft.net > hard.net + .25, `lento ${soft.net.toFixed(2)} m, forte ${hard.net.toFixed(2)} m sopra la rete`);
  assert.ok(soft.spin > hard.spin);
  // mancino, colpo in anticipo e polso tutto a destra: la palla va verso la riga e cade prima della riga di fondo
  const wide = playerStrike(swing(1.2, { wrist: 1, hand: 'left' }), { ballZ: 9.9 });
  assert.ok(Math.abs(wide.x) > 2.9 && wide.z > -9, `angolo a x ${wide.x.toFixed(2)}, z ${wide.z.toFixed(2)}`);
});

test('Player 2: stessa varietà del P1, con e senza i dati del telefono', () => {
  const soft = p2Strike(swing(.85)), hard = p2Strike(swing(1.6));
  assert.ok(soft.ok && hard.ok);
  assert.ok(soft.net > hard.net + .25, `P2 lento ${soft.net.toFixed(2)} m, forte ${hard.net.toFixed(2)} m`);
  const wide = p2Strike(swing(1.2, { wrist: 1, hand: 'left' }), { ballZ: -9.8 });
  assert.ok(Math.abs(wide.x) > 2.9 && wide.z < 9, `P2 angolo a x ${wide.x.toFixed(2)}, z ${wide.z.toFixed(2)}`);
  // senza il campo natpf (tastiera, webcam): anche qui l'altezza dipende dalla forza
  const plain = s => p2Strike({ source: 'mouse', side: 'forehand', shotType: 'topspin', speed: s, dirX: 0 });
  assert.ok(plain(.85).net > plain(1.6).net + .2);
});
