import test from 'node:test';
import assert from 'node:assert/strict';
import { runBalanceAudit } from '../audit/rally-balance.mjs';

// Guardrails chosen for the requested experience, not a human usability claim:
// accurate visible swings should work >=90%; ordinary rallies should finish
// in <30 hits on average; tactics should shorten them without a hit-count cap.
const measured = runBalanceAudit();

test('arcade spatial audit: accurate swings remain reliable across four seeds and 60 ms latency', () => {
  for (const name of ['precise','tactical','expert']){
    const r = measured[name];
    assert.ok(r.completed >= 20, `${name}: sufficient completed points (${r.completed})`);
    assert.ok(r.missRate < .1, `${name}: missed ${(r.missRate*100).toFixed(1)}%, ${JSON.stringify(r.misses)}`);
    assert.ok(r.meanHits >= 2 && r.meanHits < 30, `${name}: mean ${r.meanHits.toFixed(2)} hits`);
  }
});

test('arcade spatial audit: timing skill improves results; open-court tactics close points sooner', () => {
  assert.ok(measured.precise.winRate > measured.novice.winRate+.2, `timing comparison: ${measured.precise.winRate} vs ${measured.novice.winRate}`);
  assert.ok(measured.precise.missRate < measured.instinctive.missRate && measured.instinctive.missRate < measured.novice.missRate, 'less timing error produces progressively fewer misses');
  assert.equal(measured.instinctive.misses.nessuno || 0, 0, 'a submitted early swing must not be described as no movement');
  assert.ok(measured.tactical.meanHits < measured.precise.meanHits*.8, `tactical ${measured.tactical.meanHits} vs central ${measured.precise.meanHits}`);
  assert.ok(measured.tactical.meanSeconds < measured.precise.meanSeconds*.8, 'faster points also measured in actual simulation seconds');
  assert.ok(measured.tactical.reasons.vincente > 0, 'tactics generate natural unreturned shots');
});

test('arcade spatial audit: auto-run stays finite and central rallies are not forcibly capped', () => {
  for (const r of Object.values(measured)) assert.ok(r.maxPlayerStep <= 6*1.65/120+1e-8, `live movement ${r.maxPlayerStep} m/frame`);
  assert.ok(measured.precise.rallies.some(h=>h>20), 'central play can naturally sustain a long rally');
  assert.ok(measured.tactical.longRallies/measured.tactical.completed < .1, 'tactical play rarely becomes a long central exchange');
  assert.ok(measured.expert.hitTypes.slice > 0 && measured.expert.hitTypes.drop > 0, 'advanced CPU adds physical shot variety');
});
