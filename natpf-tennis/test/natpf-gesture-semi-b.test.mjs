// B17.1 passo B3 (correzioni dalla revisione): fedeltà della presa a racchetta sui semi del rumore 21–40 (vedi test/gesture-semi.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSeeds, DECLARED_EXPECT } from './gesture-semi.mjs';

test('fedeltà sui semi 21–40: ogni scheda e la mira, destro e mancino, due calibrazioni, 0,8×/1×/1,25× (limiti dichiarati: conto esatto delle letture giuste e di che cosa viene letto)', () => {
  checkSeeds(assert, 'b', DECLARED_EXPECT.b);
});
