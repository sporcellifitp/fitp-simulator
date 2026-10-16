import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeMatch, ARC, CPU, LOCOMOTION, chooseCpuShotType, isSmashContact } from '../../site/js/match/arcade.js';
import { COURTS, newBall, predict } from '../../site/js/match/physics.js';
import { makeShot, planIntercept } from '../../site/js/match/ai.js';
import { mulberry32 } from '../../site/js/match/core.js';
const court = COURTS.tennis;
function incoming({ team = 0, cpu = 'normale' } = {}){
  const sign = team === 0 ? 1 : -1;
  const c = new ArcadeMatch({ teams: [[{ id:'a', human:team===0 }],[{ id:'b',human:team===1 }]], firstServer:1-team,cpu,rng:mulberry32(28) });
  c.phase='live';c.rally.hit(1-team);c.rally.event({type:'bounce',x:0,z:sign*4,side:team});c.rally.hit(team);c.rally.hit(1-team);
  c.sinceHit=.5;c.ball=newBall({x:2*sign,y:1.4,z:3*sign},{x:.5*sign,y:1,z:10*sign});
  Object.assign(c.players[team],{x:0,z:10*sign,tx:0,tz:10*sign});
  return {c,p:c.players[team]};
}
test('arcade ignores forged keyboard/joystick movement and auto:false, for either team',()=>{
  for(const team of [0,1]){
    const {c:a,p:pa}=incoming({team}),{c:b,p:pb}=incoming({team});
    for(let i=0;i<100;i++){
      a.update(1/120,{[pa.id]:{move:{x:1e6,y:-1e6},auto:false,jump:true}});
      b.update(1/120);
      assert.equal(pa.x,pb.x);assert.equal(pa.z,pb.z);assert.equal(pa.y,0);assert.equal(pa.auto,true);
    }
    assert.ok(Math.abs(pa.x)>.3,'the player ran toward the predicted ball without controls');
  }
});
test('both players use the same integrated contact forecast, and serve returns wait for a bounce',()=>{
  for(const team of [0,1]){
    const {c,p}=incoming({team}),forecast=c.predictContact(p);
    assert.ok(forecast);assert.ok(forecast.Tc>c.t);
    const sample=predict(c.ball,c.court,3,1/60).find(k=>Math.abs(k.t-(forecast.Tc-c.t))<1e-8);
    assert.ok(sample);assert.equal(sample.x,forecast.x);assert.equal(sample.z,forecast.z);
    c.thinkAI(1/120);
    assert.ok(c.players.every(q=>q.human||q.plan||c.rally.lastHitter===q.team));
    c.rally.isServe=true;c.rally.bouncesSinceHit=0;
    const serve=c.predictContact(p);assert.ok(serve);
    const servereturn=predict(c.ball,c.court,3,1/60).find(k=>Math.abs(k.t-serve.t)<1e-8);
    assert.equal(servereturn.bounces,1);
  }
});
test('an already bounced ball is never planned after its second bounce',()=>{
  const {c,p}=incoming();c.rally.bouncesSinceHit=1;
  const forecast=c.predictContact(p);
  if(forecast){const k=predict(c.ball,c.court,3,1/60).find(k=>Math.abs(k.t-forecast.t)<1e-8);assert.equal(k.bounces,0);}
  const shared=planIntercept(p,c.ball,c.court,c.rally);
  if(shared)assert.equal(shared.bounces,0);
});
test('desperate reaches have finite speed, a recovery state and no repeated burst during recovery',()=>{
  const {c,p}=incoming();
  Object.assign(p,{x:0,z:8,tx:4.8,tz:8,inc:{Tc:.3},react:0});
  const dt=.01,states=new Set();let recoverStart=null;
  for(let i=0;i<130;i++){
    c.t+=dt;p.inc.Tc=c.t+.3;
    const old={x:p.x,z:p.z};c.movePlayers(dt,false);states.add(p.locomotion.state);
    assert.ok(Math.hypot(p.x-old.x,p.z-old.z)<=ARC.SPEED*LOCOMOTION.dive.speed*dt+1e-10);
    assert.ok(p.locomotion.progress>=0&&p.locomotion.progress<=1);
    if(p.locomotion.state==='recover'&&recoverStart==null)recoverStart=c.t;
    if(recoverStart!=null&&c.t<recoverStart+LOCOMOTION.dive.recovery-.02)assert.equal(p.locomotion.state,'recover');
  }
  assert.ok(states.has('dive'));assert.ok(states.has('recover'));assert.ok(states.has('ready'));
  assert.ok(p.x<=court.runoff.x-.3);
});
test('a short urgent ball uses a lunge and still cannot be reached by teleporting',()=>{
  const {c,p}=incoming();Object.assign(p,{x:0,z:8,tx:1,tz:8,inc:{Tc:.12},react:0});
  c.t=.01;c.movePlayers(.01,false);
  assert.equal(p.locomotion.state,'lunge');assert.ok(p.x<.1);
});
test('a ball outside physical running reach wins the point without an automatic return',()=>{
  const {c,p}=incoming();Object.assign(p,{x:-3,z:12,tx:-3,tz:12});
  const from={x:2,y:1.2,z:-3},target={x:4,z:2.1};
  c.ball=newBall(from,makeShot(c.court,from,target,'drop',0,()=>.5,.32,1).v);
  const out=[];
  for(let i=0;i<600&&!out.some(e=>e.type==='point');i++)out.push(...c.update(1/120));
  assert.equal(out.find(e=>e.type==='point')?.team,1);
  assert.equal(out.some(e=>e.type==='hit'&&e.player===p.id),false);
});
test('easy CPU plays central slow drives; advanced CPU opens angles and varies pace and shot type',()=>{
  const samples={};
  for(const level of ['facile','normale','esperto']){
    const {c}=incoming({cpu:level}),p=c.players[1];
    c.ball=newBall({x:0,y:1.2,z:-9},{x:0,y:0,z:-12});
    c.rng=mulberry32(809);samples[level]=[];
    for(let i=0;i<300;i++)samples[level].push(c.cpuShot(p));
  }
  assert.ok(samples.facile.every(s=>s.type==='drive'));
  // Deliberate out errors remain distinct from the planned normal landing area.
  const inCourt=s=>Math.abs(s.target.x)<=court.halfW&&Math.abs(s.target.z)>1&&Math.abs(s.target.z)<=court.halfL;
  assert.ok(samples.facile.filter(inCourt).every(s=>Math.abs(s.target.x)<=CPU.facile.angle*(court.halfW-.75)+1e-8));
  assert.ok(samples.facile.every(s=>s.pace<=.78));
  const types=new Set(samples.esperto.map(s=>s.type));assert.ok(types.has('drive')&&types.has('slice')&&types.has('drop'));
  assert.equal(chooseCpuShotType(true,CPU.esperto,()=>.01),'lob');
  const angle=arr=>arr.filter(inCourt).reduce((n,s)=>n+Math.abs(s.target.x),0)/arr.filter(inCourt).length;
  assert.ok(angle(samples.esperto)>angle(samples.normale));
  assert.ok(angle(samples.normale)>angle(samples.facile)*2);
  assert.ok(Math.max(...samples.esperto.map(s=>s.pace))>1.1);
});
test('reachable descending lobs produce the same overhead band used by the smash marker',()=>{
  const {c,p}=incoming();Object.assign(p,{x:0,z:8,tx:0,tz:8});
  c.ball=newBall({x:.7,y:4.2,z:5},{x:0,y:0,z:3});
  const forecast=c.predictContact(p);assert.ok(forecast);assert.equal(isSmashContact(forecast),true);
  const k=predict(c.ball,c.court,3,1/60).find(k=>Math.abs(k.t-forecast.t)<1e-8);
  assert.equal(k.bounces,0);assert.ok(k.vy<0);
  assert.equal(isSmashContact({y:1.7}),false);assert.equal(isSmashContact({y:3.5}),false);
});
