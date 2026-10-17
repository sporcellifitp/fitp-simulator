import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeMatch } from '../../site/js/match/arcade.js';
import { CONTACT, evaluateContact } from '../../site/js/match/contact.js';
import { mulberry32 } from '../../site/js/match/core.js';

function fixture(team, forward=1.8, height=1.2){
  const c=new ArcadeMatch({teams:[[{id:'a',human:team===0,grace:.4}],[{id:'b',human:team===1,grace:.4}]],firstServer:1-team,rng:mulberry32(43)});
  c.phase='live';c.rally.hit(1-team);c.rally.event({type:'bounce',x:0,z:team?-4:4,side:team});c.rally.hit(team);c.rally.hit(1-team);
  c.sinceHit=.6;c.ball.held=false;
  const sign=team?-1:1,h=c.players[team];Object.assign(h,{x:0,z:sign*8,tx:0,tz:sign*8,speed:0});
  c.ball.p={x:sign*.7,y:height,z:sign*(8-forward)};c.ball.v={x:0,y:1,z:sign*6};
  c.record();return{c,h};
}
test('visible racket volume accepts instinctive swing before ideal plane, both sides and frame rates',()=>{
  for(const team of[0,1])for(const fps of[30,60,120]){
    const{c,h}=fixture(team),at=c.t;
    const cue=evaluateContact({ball:c.ball.p,velocity:c.ball.v,player:h,eligible:c.legalFor(h)});
    assert.equal(cue.accepted,true);assert.equal(cue.perfect,false,'forgiveness does not erase skill');
    const ev=c.update(1/fps,{[h.id]:{swings:[{delay:at-1/fps,power:.65,aim:.4}]}});
    const contact=ev.find(e=>e.type==='contact');
    assert.ok(contact,JSON.stringify({team,fps,ev}));
    assert.equal(contact.at,at,'judge the frame seen instead of rewinding to a future plane');
    assert.equal(c.phase,'live');assert.equal(c.rally.lastHitter,team);
    assert.ok(c.t<.04,'do not wait for the small floor marker');
  }
});
test('same instinctive frame survives delayed phone delivery without becoming a remote contact',()=>{
  for(const team of[0,1])for(const delay of[.06,.18,.32]){
    const{c,h}=fixture(team);let contact=null;
    for(let i=0;i<Math.ceil(delay*120);i++)c.update(1/120);
    const ev=c.update(1/120,{[h.id]:{swings:[{delay:-c.t-1/120,power:.6}]}});
    contact=ev.find(e=>e.type==='contact');assert.ok(contact,JSON.stringify({team,delay,ev}));assert.equal(contact.at,0);
  }
});
test('forgiveness cannot hit beyond reach, across the net, before serve bounce or after second bounce',()=>{
  for(const forward of[3.5,7]){
    const{c,h}=fixture(0,forward);const ev=c.update(1/120,{[h.id]:{swings:[{delay:-1/120}]}});assert.ok(!ev.some(e=>e.type==='contact'));
  }
  const{c,h}=fixture(0);c.rally.isServe=true;c.rally.bouncesSinceHit=0;c.record();
  assert.equal(c.legalFor(h),false);assert.equal(evaluateContact({ball:c.ball.p,velocity:c.ball.v,player:h,eligible:c.legalFor(h)}).accepted,false);
  const{c:d,h:p}=fixture(0);d.rally.end(1,'vincente');d.record();assert.equal(d.legalFor(p),false);
});
test('perfect contact remains more precise and faster than accepted early contact',()=>{
  const{c:a,h:p}=fixture(0,1),{c:b,h:q}=fixture(0,1.8);
  a.update(.005,{[p.id]:{swings:[{delay:-.005,power:.7,aim:.85}]}});
  b.update(.005,{[q.id]:{swings:[{delay:-.005,power:.7,aim:.85}]}});
  assert.equal(a.lastQuality.label,'perfetto');assert.ok(a.lastQuality.quality>b.lastQuality.quality);
  assert.ok(Math.abs(a.ball.v.x)>Math.abs(b.ball.v.x));
  assert.ok(Math.hypot(a.ball.v.x,a.ball.v.z)>Math.hypot(b.ball.v.x,b.ball.v.z));
  assert.ok(CONTACT.buffer<=.12,'only a bounded local gesture buffer');
});
