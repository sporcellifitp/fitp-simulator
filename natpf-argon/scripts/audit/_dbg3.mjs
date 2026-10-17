import { createHeadlessEngine } from './headless-engine.mjs';
const proto = Object.getPrototypeOf(createHeadlessEngine());
const o2 = proto._attemptPlayerRallyStrike, oa = proto._awardPoint;
let last = null, n = 0;
proto._attemptPlayerRallyStrike = function(e, t){ const pre = { b: this.ball.pos.toArray().map(v=>+v.toFixed(2)), p: this.player.pos.toArray().map(v=>+v.toFixed(2)) }; const r = o2.call(this, e, t); if (r && e.natpfDrop) last = { ...pre, v: this.ball.vel.toArray().map(v=>+v.toFixed(2)), tgt: this.ball.targetLanding.toArray().map(v=>+v.toFixed(2)), spin: this.ball.spin.x }; else last = null; return r; };
proto._awardPoint = function(w, why){ if (why === 'Net' && w === 'opponent' && last && n++ < 6) console.log(JSON.stringify(last), 'net at', this.ball.pos.toArray().map(v=>+v.toFixed(2))); return oa.call(this, w, why); };
const { simulate } = await import('./rally-balance.mjs');
simulate({ profile: 'preciso', difficulty: 'pro', points: 150 });
