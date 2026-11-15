// B48.1 (revisione del B48): il criterio di non regressione di Pro (contro il profilo «medio» chi gioca vince il 70–85% dei
// game) era solo in audit:legend, che non fa parte di npm test. Qui lo stesso conto, con gli stessi 8 semi × 300 punti
// (scripts/audit/legend.mjs: run, metrics). Il servizio della CPU di Pro lo tocca da vicino: con gli effetti del servizio di
// chi gioca (14 / 24 / 9) Pro contro «medio» scendeva al 69,9% (B48), con i 18 / 26 / 14 di natpf_skill.SERVE_SPIN torna
// nella fascia. In un file a parte: legend.mjs registra i colpi agganciandosi al motore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { run, metrics, SEEDS, regressionChecks } from '../scripts/audit/legend.mjs';

test('B48.1: Pro contro «medio», chi gioca vince il 70–85% dei game (criterio di audit:legend, 8 semi × 300 punti)', () => {
  assert.equal(SEEDS.length, 8);
  const m = metrics(run({ profile: 'medio', difficulty: 'pro', points: 300, seeds: SEEDS }));
  assert.ok(m.game > 300, `game ${m.game}`);
  for (const [name, ok, val] of regressionChecks('pro', m)) assert.ok(ok, `${name}: ${val}`);
  assert.ok(m.gameG >= 70 && m.gameG <= 85, `${m.gameG}%`);
});
