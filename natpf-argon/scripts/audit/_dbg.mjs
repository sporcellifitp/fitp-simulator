import { createHeadlessEngine } from './headless-engine.mjs';
for (const [pz, by, rs] of [[11.4,1.0,0],[12.8,.8,0],[10,1.5,0],[11.4,.8,8],[13.3,.9,8]]){
const e = createHeadlessEngine({ difficulty: 'pro' });
e.startNewMatch({ showStartBanner: false });
e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.rallyStrokeCount = rs;
e.player.pos.set(1, 0, pz); e.ball.pos.set(1.3, by, pz-0.5); e.ball.vel.set(0, -1, 20);
let res='';
e._awardPoint = (w, why) => { res = `${w} ${why}`; e.phase='X'; };
e._attemptPlayerRallyStrike({ shotType: 'slice', natpfDrop: true, speed: .85, dirX: .3 });
const v = e.ball.vel.clone();
let prev = e.ball.pos.z, ny=null;
for (let i = 0; i < 300 && e.phase === 'RALLY'; i++){ e.step(1/120); if (prev > 0 && e.ball.pos.z <= 0) ny=e.ball.pos.y.toFixed(2); prev = e.ball.pos.z; if (e.ball.bounceCountOnCurrentSide===1 && !e._b){ e._b=1; ny += ' land z ' + e.ball.pos.z.toFixed(2) + ' tgt ' + e.ball.targetLanding.z.toFixed(2); } if (e.ball.lastHitter==='opponent') break; }
console.log(pz, by, rs, 'net y', ny, res, v.toArray().map(x=>x.toFixed(1)).join(','));
}
