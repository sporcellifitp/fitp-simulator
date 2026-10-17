import test from 'node:test';
import assert from 'node:assert/strict';
import { COURTS, newBall, stepBall, shotTime, netHeightAt } from '../../site/js/match/physics.js';
import { arcadeShot, ArcadeMatch } from '../../site/js/match/arcade.js';
import { makeShot, chooseShot } from '../../site/js/match/ai.js';
import { mulberry32 } from '../../site/js/match/core.js';
import { executionQuality } from '../../site/js/match/shot-quality.js';
const court = COURTS.tennis;
const player = { team: 0, x: 0, z: 12, speed: 6, vx: 0, vz: 0 };
const ball = { p: { x: .7, y: 1.2, z: 11 } };
function flight(from, target, type, dt, clearance = .3, pace = 1){
  const shot = makeShot(court, from, target, type, 0, () => { throw Error('un tiro senza dispersione non usa casualità'); }, clearance, pace);
  const b = newBall(from, shot.v, shot.spin); let bounce = null, net = false, apex = from.y, netY = null;
  for (let t = 0; t < 6 && !bounce; t += dt){
    const old = { ...b.p }, events = stepBall(b, dt, court);
    apex = Math.max(apex, b.p.y);
    if (old.z*b.p.z <= 0){ const u = old.z/(old.z - b.p.z); netY = old.y + (b.p.y - old.y)*u; }
    for (const e of events){ if (e.type === 'bounce' && !bounce) bounce = e; if (e.type === 'net') net = true; }
  }
  assert.ok(bounce, `${type} raggiunge terra`);
  return { bounce, net, apex, netY, shot };
}

test('mira continua:41 angoli ordinati, specchio P2 e nessun vincolo del busto', () => {
  let previous = -Infinity;
  for (let i = -20; i <= 20; i++){
    const sw = { aim: i/20, power: .8 }, a = arcadeShot(court, player, ball, sw, 0);
    const mirrored = arcadeShot(court, { ...player, team: 1, x: -player.x, z: -player.z }, { p: { ...ball.p, x: -ball.p.x, z: -ball.p.z } }, sw, 0);
    assert.ok(a.target.x > previous); previous = a.target.x;
    assert.equal(a.target.x, -mirrored.target.x); assert.equal(a.target.z, -mirrored.target.z);
    assert.deepEqual(a, arcadeShot(court, { ...player, facing: 99 }, ball, sw, 0));
  }
  assert.equal(arcadeShot(court, player, ball, { dir: 1 }, 0).intendedAim, -.72);
});

test('timing e allungo premiano angolo, profondità utile e ritmo senza cambiare il lato scelto', () => {
  const sw = { aim: .95, power: .85 }, perfect = arcadeShot(court, player, ball, sw, 0);
  const poor = arcadeShot(court, player, ball, sw, .2);
  const stretched = arcadeShot(court, { ...player, x: -1.2, vx: -6 }, ball, sw, 0);
  assert.ok(perfect.quality > stretched.quality && stretched.quality > poor.quality);
  for (const weaker of [poor, stretched]){
    assert.ok(perfect.target.x > weaker.target.x && weaker.target.x > 0);
    assert.ok(perfect.pace > weaker.pace); assert.ok(perfect.error < weaker.error);
  }
  assert.ok(executionQuality(player, ball, 0).balance > .99);
  const late = arcadeShot(court, player, ball, { ...sw, power: 1 }, .26);
  assert.ok(Math.abs(late.target.z) > court.halfL, 'forzare fuori tempo può produrre lunghezza fuori campo');
});

test('solutore tennis:6 tipi,2 lati,3 frame rate atterrano entro5cm senza rete imprevista', () => {
  for (const team of [0, 1]) for (const dt of [1/30, 1/60, 1/120]) for (const type of ['drive', 'slice', 'lob', 'drop', 'smash', 'serve']){
    const sign = team === 0 ? 1 : -1;
    const from = { x: .7*sign, y: ['smash', 'serve'].includes(type) ? 2.7 : 1.2, z: 11*sign };
    const target = { x: -3*sign, z: (type === 'drop' ? -2.1 : type === 'serve' ? -5.5 : -10)*sign };
    const clearance = type === 'lob' ? 1.4 : type === 'smash' ? .2 : .3;
    const result = flight(from, target, type, dt, clearance);
    assert.ok(Math.hypot(result.bounce.x - target.x, result.bounce.z - target.z) < .05, `${team}/${dt}/${type}`);
    assert.equal(result.net, false, `${type} evita rete`);
    const netX = from.x + (target.x - from.x)*(-from.z/(target.z - from.z));
    assert.ok(result.netY > netHeightAt(court, netX) + clearance - .015);
  }
});

test('lob, slice, smorzata e drive creano traiettorie e tempi distinti con la fisica reale', () => {
  const results = {};
  for (const [type, flags] of Object.entries({ drive: {}, lob: { lob: true }, slice: { slice: true }, drop: { drop: true } })){
    const shot = arcadeShot(court, player, ball, { aim: .6, power: .8, ...flags }, 0);
    results[type] = flight(ball.p, shot.target, type, 1/120, shot.clearance, shot.pace);
  }
  assert.ok(results.lob.apex > results.drive.apex + .8, 'lob supera la traiettoria del drive');
  assert.ok(Math.abs(results.drop.bounce.z) < 2.2, 'smorzata precisa cade vicino alla rete');
  assert.ok(Math.abs(results.slice.bounce.z) < Math.abs(results.drive.bounce.z));
  assert.ok(results.drive.shot.v.T < results.slice.shot.v.T, 'drive penetra più rapidamente dello slice');
});

test('IA: a identico stato fisico la durata del rally non inventa errori o attacchi', () => {
  const make = hits => {
    const core = new ArcadeMatch({ teams: [[{ id: 'human', human: true }], [{ id: 'cpu' }]], rng: mulberry32(72) });
    core.ball = newBall({ x: .7, y: 1.2, z: -10 }, { x: 2, y: 0, z: -18 });
    core.rally.hits = hits; core.lastQuality = { quality: .9, label: 'perfetto', power: .8 };
    core.rng = mulberry32(912); return core.cpuShot(core.players[1]);
  };
  assert.deepEqual(make(1), make(1000));
  const me = { team: 0, skill: .7 }, opponents = [{ x: 2, z: -10 }];
  assert.deepEqual(chooseShot(court, me, newBall(ball.p), opponents, mulberry32(3), 1), chooseShot(court, me, newBall(ball.p), opponents, mulberry32(3), 1000));
});
