// B17.1 passo B3: fedeltà della presa a racchetta sui semi del rumore [17, 18, 19, 20, 21, 22, 23] (vedi test/gesture-semi.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readSeeds, DECLARED } from './gesture-semi.mjs';

test('fedeltà sui semi [17, 18, 19, 20, 21, 22, 23]: ogni scheda e la mira, destro e mancino, due calibrazioni, 0,8×/1×/1,25× (limiti dichiarati a parte)', () => {
  const seeds = [17, 18, 19, 20, 21, 22, 23], { n, bad, lim, ids } = readSeeds(seeds);
  const declared = Object.values(DECLARED).reduce((s, c) => s + c.length, 0);
  assert.equal(n + lim.n, seeds.length*ids.length*12);
  assert.equal(lim.n, seeds.length*declared*6);
  assert.deepEqual(bad, [], bad.join('\n'));
});
