import { createHeadlessEngine } from './headless-engine.mjs';
const proto = Object.getPrototypeOf(createHeadlessEngine());
const oa = proto._awardPoint; let n = 0; const xs = [];
proto._awardPoint = function(w, why){ if (why === 'Out' && w === 'opponent' && this.ball.lastHitter === 'player') xs.push([+this.ball.pos.x.toFixed(2), +this.ball.pos.z.toFixed(2), +this.ball.targetLanding.x.toFixed(2), +this.ball.targetLanding.z.toFixed(2), this.ball.bounceCountOnCurrentSide]); return oa.call(this, w, why); };
const { simulate } = await import('./rally-balance.mjs');
simulate({ profile: 'preciso', difficulty: 'casual', points: 150 });
console.log(xs.slice(0, 25).map(x => x.join(' ')).join('\n'));
