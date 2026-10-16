import test from 'node:test';
import assert from 'node:assert/strict';
import { COURTS, newBall, stepBall } from '../../site/js/match/physics.js';
import { Rally, pointLabels } from '../../site/js/match/rules.js';
import { MatchCore, mulberry32 } from '../../site/js/match/core.js';
import { ArcadeMatch } from '../../site/js/match/arcade.js';
import { encodeEvents, encodeSnap, createMirror } from '../../site/js/tennis/net.js';

function liveRally(hitter, court = COURTS.tennis){
  const rally = new Rally(court, { server: 0, fromRight: true });
  rally.hit(0);
  assert.equal(rally.event({ type: 'bounce', x: -2, z: -4, side: 1 }), null);
  rally.hit(1);
  if (hitter === 0) rally.hit(0);
  return rally;
}
const bounce = (side, x = 0, depth = 4) => ({ type: 'bounce', x, y: 0, z: side === 0 ? depth : -depth, side });

test('regole: lob lungo o nel proprio campo perde il punto, per entrambe le squadre', () => {
  for (const hitter of [0, 1]){
    const other = 1 - hitter;
    for (const event of [bounce(other, 0, COURTS.tennis.halfL + .1), bounce(other, COURTS.tennis.halfW + .1), bounce(hitter)]){
      assert.equal(liveRally(hitter).event(event).team, other);
    }
  }
});

test('regole: dopo un primo rimbalzo valido, secondo rimbalzo e uscita premiano chi ha tirato anche se la palla torna oltre rete', () => {
  for (const court of [COURTS.tennis, COURTS.padel]) for (const hitter of [0, 1]) for (const side of [0, 1]){
    for (const type of ['bounce', 'exit', 'stop']){
      const rally = liveRally(hitter, court);
      assert.equal(rally.event(bounce(1 - hitter)), null);
      const result = rally.event({ ...bounce(side), type });
      assert.equal(result.team, hitter, `${court.sport}: ultimo colpitore ${hitter}, ${type} sul lato ${side}`);
    }
  }
});

test('regole: il limite di simulazione distingue una palla fuori al volo da un vincente già rimbalzato', () => {
  for (const hitter of [0, 1]){
    assert.equal(liveRally(hitter).lost().team, 1 - hitter, 'fuori senza rimbalzo');
    const rally = liveRally(hitter);
    rally.event(bounce(1 - hitter));
    assert.equal(rally.lost().team, hitter, 'dentro e poi fuori portata');
  }
});

test('regole: un servizio valido che esce dalla simulazione è un ace, senza seconda palla o doppio fallo', () => {
  for (const server of [0, 1]){
    const rally = new Rally(COURTS.tennis, { server, fromRight: true });
    rally.hit(server);
    const box = rally.serveBox();
    assert.equal(rally.event({ type: 'bounce', x: (box.x0 + box.x1)/2, z: (box.z0 + box.z1)/2, side: 1 - server }), null);
    const result = rally.lost();
    assert.deepEqual(result, { team: server, reason: 'ace' });
  }
});

test('regole: il rimbalzo valido del colpo precedente non rende valida una risposta al volo fuori campo', () => {
  for (const hitter of [0, 1]){
    const rally = liveRally(hitter), receiver = 1 - hitter;
    rally.event(bounce(receiver));
    assert.equal(rally.hit(receiver), null);
    assert.equal(rally.lost().team, hitter, 'la risposta sbagliata perde anche se il colpo precedente era dentro');
    const serve = new Rally(COURTS.tennis, { server: hitter, fromRight: true });
    serve.hit(hitter);
    assert.equal(serve.lost().fault, true);
    assert.equal(serve.attempt, 2);
    serve.hit(hitter);
    assert.deepEqual(serve.lost(), { team: receiver, reason: 'doppio fallo' });
  }
});

test('fisica + regole: palla che rimbalza dentro e torna oltre rete resta vincente al secondo rimbalzo', () => {
  for (const hitter of [0, 1]){
    const targetSide = 1 - hitter, sign = targetSide === 0 ? 1 : -1;
    const rally = liveRally(hitter), ball = newBall({ x: 0, y: .01, z: sign*.5 }, { x: 0, y: -8, z: -sign*2 });
    let result = null;
    const bounces = [];
    for (let i = 0; i < 600 && !result; i++) for (const event of stepBall(ball, 1/240, COURTS.tennis)){
      if (event.type === 'bounce') bounces.push(event.side);
      result = rally.event(event);
      if (result) break;
    }
    assert.deepEqual(bounces, [targetSide, hitter], 'primo rimbalzo valido, poi ritorno oltre rete senza risposta');
    assert.equal(result.team, hitter);
  }
});

function matchAtReply(Core, hitter){
  const core = new Core({ teams: [[{ id: 'h', human: true }], [{ id: 'g', human: true }]], firstServer: 0, rng: mulberry32(17) });
  core.phase = 'live'; core.rally = liveRally(hitter); core.sinceHit = .5;
  for (const p of core.players) Object.assign(p, { x: -5, tx: -5, auto: false, done: true });
  core.ball.held = false;
  return core;
}

test('partita/online: dopo lob e risposta valida, l’uscita dal campo aggiorna una sola volta il punteggio della squadra corretta', () => {
  for (const Core of [MatchCore, ArcadeMatch]) for (const hitter of [0, 1]){
    // Il contatto del lob e della risposta sono già avvenuti. La risposta ha
    // rimbalzato dentro e supera il limite del mondo prima del secondo rimbalzo.
    const core = matchAtReply(Core, hitter), other = 1 - hitter;
    core.players[other].lastShot = 'lob'; core.players[hitter].lastShot = 'smash';
    core.rally.event(bounce(other));
    core.ball.p = { x: 0, y: 3, z: (other === 0 ? 1 : -1)*(COURTS.tennis.halfL + 14.1) };
    core.ball.v = { x: 0, y: 2, z: other === 0 ? 20 : -20 };
    const events = core.update(1/240), point = events.filter(e => e.type === 'point');
    assert.equal(point.length, 1);
    assert.equal(point[0].team, hitter, `${Core.name}, risposta della squadra ${hitter}`);
    assert.equal(core.score.points[hitter], 1);
    assert.equal(core.score.points[other], 0);
    assert.equal(core.update(1/240).filter(e => e.type === 'point').length, 0, 'il punto viene assegnato una volta');
    const mirror = createMirror({ players: core.players.map(({ id, team }) => ({ id, team })) });
    mirror.push(JSON.parse(JSON.stringify(encodeSnap(core, 1000))));
    mirror.pushEvents(encodeEvents(core, events));
    assert.deepEqual(mirror.score().points, core.score.points, 'host e ospite hanno lo stesso punteggio');
    assert.deepEqual(mirror.score().labels, pointLabels(core.score));
    assert.equal(mirror.takeEvents(core.t).find(e => e.type === 'point').team, hitter, 'nessuna inversione del vincitore nel trasporto online');
  }
});
