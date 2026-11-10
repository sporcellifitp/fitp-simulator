// B18 · tappa 1 del rapporto B16 (docs/b16/rapporto-gameplay.md, difetto 9 parte piccola / D9): a Pro la risposta
// difensiva della CPU in allungo (tagliato o pallonetto corto e lento, da attaccare) non scattava mai: la soglia (1,55 m)
// era oltre la portata della CPU (cpuReach 1,5 m). Ora è sotto la portata. La velocità della CPU non cambia (tappa 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { cpuDefensive, CPU_DEFENSE, skillLevel } from '../src/natpf/natpf_skill.js';

test('D9: soglie della risposta difensiva sotto la portata della CPU a Casual e Pro; Casual e Leggenda come prima', () => {
  for (const lv of ['casual', 'pro']){
    const reach = skillLevel(lv).cpuReach;
    assert.ok(CPU_DEFENSE[lv].wide < reach && CPU_DEFENSE[lv].power < CPU_DEFENSE[lv].wide, `${lv}: ${JSON.stringify(CPU_DEFENSE[lv])}, portata ${reach}`);
  }
  assert.deepEqual({ ...CPU_DEFENSE.casual }, { wide: 1.08, power: .75 });
  assert.deepEqual({ ...CPU_DEFENSE.leggenda }, { wide: 1.55, power: 1.25 });
  assert.equal(cpuDefensive('pro', 1.3), true, 'prima no (1,55 m)');
  assert.equal(cpuDefensive('pro', 1.1), false);
  assert.equal(cpuDefensive('pro', 1.0, true), true, 'colpo potente: prima no (1,25 m)');
  assert.equal(cpuDefensive('casual', 1.1), true);
  assert.equal(cpuDefensive('leggenda', 1.5), false);
  assert.equal(cpuDefensive('sconosciuto', 1.1), true, 'livello sconosciuto: come Casual (come prima)');
  // la velocità della CPU a Pro resta quella di prima (tappa 2)
  assert.equal(skillLevel('pro').cpuSpeed, 5.3);
});

test('D9: nel motore a Pro la CPU in allungo (palla a 1,3 m) risponde con un colpo difensivo corto', () => {
  const real = Math.random; Math.random = () => .99;   // nessun errore, nessun attacco: la risposta normale
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.rallyStrokeCount = 4; e.ball.isPowerShot = false;
    e.opponent.pos.set(0, 0, -11.5);
    e.ball.pos.set(1.3, 1, -11.2); e.ball.vel.set(0, -1, -20);
    e._executeOpponentReturn(e.opponent);
    assert.ok(e.natpfCpuDefense && Math.abs(e.natpfCpuDefense.stretch - 1.3) < 1e-6, JSON.stringify(e.natpfCpuDefense));
    assert.equal(e.ball.shotType, 'SLICE');
    assert.ok(e.ball.targetLanding.z <= 7.9, `cade a ${e.ball.targetLanding.z.toFixed(2)} m dalla rete`);
    // palla vicina (0,8 m): risposta normale
    const f = createHeadlessEngine({ difficulty: 'pro' }); f.startNewMatch({ showStartBanner: false });
    f.phase = 'RALLY'; f.ball.inPlay = true; f.ball.lastHitter = 'player'; f.ball.rallyStrokeCount = 4;
    f.opponent.pos.set(0, 0, -11.5); f.ball.pos.set(.8, 1, -11.2); f.ball.vel.set(0, -1, -20);
    f._executeOpponentReturn(f.opponent);
    assert.equal(f.natpfCpuDefense, undefined);
  } finally { Math.random = real; }
});
