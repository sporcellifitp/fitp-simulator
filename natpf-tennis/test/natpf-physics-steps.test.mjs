// Continuità del movimento: la fisica avanza di tutto il tempo del fotogramma (natpf_skill.physicsSteps), non a passi
// fissi interi con il resto accumulato. Con i passi fissi interi, a 60 Hz con il tempo dei fotogrammi che oscilla di
// qualche decimo di ms, alcuni fotogrammi ricevevano 1 o 3 passi invece di 2 (la palla scattava di metà o una volta e
// mezza il dovuto) e a 144 Hz alcuni fotogrammi non muovevano niente.
// node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as NS from '../src/natpf/natpf_skill.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

const FIXED = 1/120;

test('passi della fisica: tutto il tempo del fotogramma, passi mai più lunghi di 1/120 s', () => {
  for (const dt of [1/60, 1/144, 1/30, .08, .0169, .0164, 1/240]){
    const { n, h } = NS.physicsSteps(dt, FIXED);
    assert.ok(n >= 1 && h <= FIXED + 1e-12, `${dt}: ${n} passi da ${h}`);
    assert.ok(Math.abs(n*h - dt) < 1e-12);
  }
  assert.equal(NS.physicsSteps(1/60, FIXED).n, 2);                 // 60 Hz esatti: due passi come prima
  assert.deepEqual(NS.physicsSteps(0, FIXED), { n: 0, h: 0 });      // tempo fermo (riscaldamento, pausa): nessun passo
  assert.deepEqual(NS.physicsSteps(NaN, FIXED), { n: 0, h: 0 });
});

// palla in volo nel motore senza disegno; ogni fotogramma avanza come update() del gioco, con il metodo nuovo o con
// quello di prima. Restituisce lo scarto massimo tra lo spostamento in avanti della palla in un fotogramma e quello
// atteso dal tempo del fotogramma (in frazione), e quanti fotogrammi non l'hanno mossa.
function flight(frames, mode){
  const e = createHeadlessEngine();
  Object.assign(e, { phase: 'RALLY', phaseTimer: 0 });
  Object.assign(e.ball, { inPlay: true, lastHitter: 'player', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1 });
  e.ball.pos.set(0, 1.6, 9); e.ball.vel.set(0, 2.5, -24); e.ball.spin.set(0, 0, 0); e.ball.targetLanding.set(0, 0, -8);
  let acc = 0, worst = 0, still = 0;
  for (const dt of frames){
    const z0 = e.ball.pos.z, vz = e.ball.vel.z;
    if (mode === 'nuovo'){ const s = NS.physicsSteps(dt, FIXED); for (let k = 0; k < s.n; k++) e.step(s.h); }
    else { for (acc += dt; acc >= FIXED; acc -= FIXED) e.step(FIXED); }
    if (e.ball.pos.z < -.5) break;                                  // fino alla rete: niente rimbalzi né colpi
    const moved = z0 - e.ball.pos.z, want = -vz*dt;
    if (moved < 1e-9) still++;
    worst = Math.max(worst, Math.abs(moved - want)/want);
  }
  return { worst, still };
}

test('palla in volo a 60 Hz con il tempo dei fotogrammi che oscilla: spostamento uguale al tempo di ogni fotogramma', () => {
  const rng = mulberry32(5), frames = Array.from({ length: 40 }, () => 1/60 + (rng() - .5)*.0012);
  const now = flight(frames, 'nuovo'), before = flight(frames, 'prima');
  assert.ok(now.worst < .03 && now.still === 0, `nuovo: scarto massimo ${(now.worst*100).toFixed(1)}%`);
  // con il metodo di prima alcuni fotogrammi spostano la palla di metà o una volta e mezza il dovuto
  assert.ok(before.worst > .3, `prima: scarto massimo ${(before.worst*100).toFixed(1)}%`);
});

test('palla in volo a 144 Hz: si muove in ogni fotogramma (prima alcuni fotogrammi la lasciavano ferma)', () => {
  const frames = Array.from({ length: 60 }, () => 1/144);
  const now = flight(frames, 'nuovo'), before = flight(frames, 'prima');
  assert.ok(now.worst < .03 && now.still === 0, `nuovo: scarto ${(now.worst*100).toFixed(1)}%, fermi ${now.still}`);
  assert.ok(before.still > 0, `prima: ${before.still} fotogrammi con la palla ferma`);
});
