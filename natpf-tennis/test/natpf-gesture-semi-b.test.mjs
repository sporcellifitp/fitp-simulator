// B17.1 passo B3: fedeltà della presa a racchetta sui semi del rumore [9, 10, 11, 12, 13, 14, 15, 16] (vedi test/gesture-semi.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readSeeds, DECLARED } from './gesture-semi.mjs';

const DECLARED_SEEN = {"flat": {"n": 48, "ok": 3, "read": {"topspin/forehand": 35, "lob/forehand": 13}}, "cross": {"n": 48, "ok": 0, "read": {"topspin/backhand + drop/forehand mira lungolinea": 16, "topspin/backhand mira lungolinea": 32}}, "line": {"n": 48, "ok": 0, "read": {"topspin/forehand + drop/forehand mira centro": 16, "topspin/forehand mira centro": 27, "topspin/backhand mira centro": 5}}};

test('fedeltà sui semi [9, 10, 11, 12, 13, 14, 15, 16]: ogni scheda e la mira, destro e mancino, due calibrazioni, 0,8×/1×/1,25× (limiti dichiarati a parte)', () => {
  const seeds = [9, 10, 11, 12, 13, 14, 15, 16], { n, bad, lim, ids } = readSeeds(seeds);
  const declared = Object.values(DECLARED).reduce((s, c) => s + c.length, 0);
  assert.equal(n + lim.n, seeds.length*ids.length*12);
  assert.equal(lim.n, seeds.length*declared*6);
  assert.deepEqual(bad, [], bad.join('\n'));
  // limiti dichiarati (calibrazione del braccio simulato: piatto, incrociato, lungolinea; ottimizzazione.md §9.4): letture
  // NON giuste, confrontate con il conto misurato il 10/11 (correzioni del passo B3) per scheda, con che cosa viene letto;
  // un cambiamento (peggioramento o miglioramento) fa fallire il test e va riscritto qui e nel documento
  assert.deepEqual(lim.byCard, DECLARED_SEEN, JSON.stringify(lim.byCard));
});
