import { createHeadlessEngine } from './headless-engine.mjs';
import { simulate } from './rally-balance.mjs';
// monkeypatch: collect lastCpu after each opponent return
const proto = Object.getPrototypeOf(createHeadlessEngine());
const orig = proto._executeOpponentReturn;
const acc = [];
proto._executeOpponentReturn = function(a){ orig.call(this, a); if (this.natpfSkill?.lastCpu) acc.push(this.natpfSkill.lastCpu); };
for (const profile of ['preciso','medio','impreciso']){ acc.length = 0;
  const r = simulate({ profile, difficulty: process.argv[2] || 'casual', points: 150 });
  const avg = k => (acc.reduce((s,x)=>s+x[k],0)/acc.length).toFixed(2);
  console.log(profile, r.avgHits, r.winPct, 'chance', avg('chance'), 'angle', avg('angle'), 'speed', avg('speed'), 'press', avg('pressure'), 'stretch', avg('stretch'), 'q', avg('quality'));
}
const r = simulate({ profile: 'preciso', difficulty: 'casual', points: 100 });
console.log(r.grades, r.whiffs);
