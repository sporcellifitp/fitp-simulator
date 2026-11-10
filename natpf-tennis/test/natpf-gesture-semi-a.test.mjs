// B17.1 passo B3: fedeltà della presa a racchetta sui semi del rumore [1, 2, 3, 4, 5, 6, 7, 8] (vedi test/gesture-semi.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readSeeds, DECLARED } from './gesture-semi.mjs';

test('fedeltà sui semi [1, 2, 3, 4, 5, 6, 7, 8]: ogni scheda e la mira, destro e mancino, due calibrazioni, 0,8×/1×/1,25× (limiti dichiarati a parte)', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8], { n, bad, lim, ids } = readSeeds(seeds);
  const declared = Object.values(DECLARED).reduce((s, c) => s + c.length, 0);
  assert.equal(n + lim.n, seeds.length*ids.length*12);
  assert.equal(lim.n, seeds.length*declared*6);
  assert.deepEqual(bad, [], bad.join('\n'));
});
