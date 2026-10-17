import test from 'node:test';
import assert from 'node:assert/strict';
import { COURTS, newBall, cloneBall, stepBall, predict, spinForShot } from '../../site/js/match/physics.js';
import { makeShot } from '../../site/js/match/ai.js';
import { MatchCore, mulberry32 } from '../../site/js/match/core.js';
import { encodeSnap, createMirror } from '../../site/js/tennis/net.js';
const court=COURTS.tennis, from={x:0,y:3,z:9}, target={x:0,z:-8};
const approx=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} ≈ ${b}`);

test('Magnus: a velocità uguale topspin scende e backspin galleggia, su entrambi i lati',()=>{
  for (const side of [1,-1]){
    const p={x:0,y:4,z:8*side},v={x:0,y:2,z:-12*side}, to={x:0,z:-8*side};
    const top=newBall(p,v,spinForShot('topspin',p,to)), back=newBall(p,v,spinForShot('slice',p,to)), flat=newBall(p,v);
    for(let i=0;i<30;i++)for(const b of [top,back,flat])stepBall(b,1/120,court);
    assert.ok(top.p.y<flat.p.y-.02); assert.ok(back.p.y>flat.p.y+.02);
  }
});

test('rimbalzo: topspin sale più dello slice, che scivola con angolo di uscita basso',()=>{
  for(const side of [1,-1]){
    const p={x:0,y:.001,z:7*side},v={x:0,y:-6,z:-14*side},to={x:0,z:-8*side};
    const top=newBall(p,v,spinForShot('topspin',p,to)), slice=newBall(p,v,spinForShot('slice',p,to));
    for(const b of [top,slice])assert.equal(stepBall(b,.001,court)[0].type,'bounce');
    assert.ok(top.v.y>slice.v.y+.5); assert.ok(slice.v.y/Math.abs(slice.v.z)<top.v.y/Math.abs(top.v.z)-.03);
    assert.ok(Math.abs(slice.spin.x)<160,'il campo scambia impulso con lo spin');
  }
});

test('impulso di rimbalzo non crea energia cinetica',()=>{
  const energy=b=>.5*(b.v.x**2+b.v.y**2+b.v.z**2)+.2*.0335**2*(b.spin.x**2+b.spin.y**2+b.spin.z**2);
  for(const type of ['drive','topspin','slice','drop']){
    const b=newBall({x:0,y:.001,z:7},{x:1,y:-6,z:-14},spinForShot(type,from,target)), before=energy(b);
    stepBall(b,.001,court);assert.ok(energy(b)<before,type);
  }
});

test('clone e previsione preservano lo spin senza mutare la palla reale',()=>{
  const b=newBall(from,{x:0,y:3,z:-14},spinForShot('slice',from,target)), original=structuredClone(b), cloned=cloneBall(b);
  cloned.spin.x=999;assert.notEqual(b.spin.x,999);
  const samples=predict(b,court,1.3,1/120), actual=cloneBall(b);
  for(let i=0;i<samples.length;i++)stepBall(actual,1/120,court);
  approx(samples.at(-1).y,actual.p.y);assert.deepEqual(b,original);
});

test('padel conserva forze e rimbalzo originali anche con spin ricevuto',()=>{
  const a=newBall({x:0,y:.01,z:4},{x:2,y:-5,z:-8}),b=cloneBall(a);b.spin={x:200,y:100,z:-50};
  stepBall(a,.1,COURTS.padel);stepBall(b,.1,COURTS.padel);assert.deepEqual(a.p,b.p);assert.deepEqual(a.v,b.v);
  assert.deepEqual(makeShot(COURTS.padel,from,target,'slice',0,mulberry32(1)).spin,{x:0,y:0,z:0});
});

test('snapshot ed extrapolazione usano lo stesso spin e rimbalzo dell’host',()=>{
  const core=new MatchCore({teams:[[{human:true}],[{}]],firstServer:0,rng:mulberry32(2)});
  core.ball=newBall({x:0,y:.1,z:8},{x:1,y:-4,z:10},spinForShot('slice',from,target));core.ball.held=false;core.t=3;
  const snap=encodeSnap(core,1000),mirror=createMirror({players:core.players});mirror.push(JSON.parse(JSON.stringify(snap)));
  const expected=newBall({x:snap.b[0],y:snap.b[1],z:snap.b[2]},{x:snap.b[3],y:snap.b[4],z:snap.b[5]},{x:snap.b[6],y:snap.b[7],z:snap.b[8]});
  stepBall(expected,3.1-snap.ct,court);const view=mirror.view(3.1);for(const key of ['x','y','z']){approx(view.ball.p[key],expected.p[key]);approx(view.ball.v[key],expected.v[key]);}
  approx(mirror.view(5).ball.p.y,mirror.view(3.15).ball.p.y,.001);
  const old={...snap,b:snap.b.slice(0,6)};mirror.push(old);assert.ok(Number.isFinite(mirror.view(3.1).ball.p.y));
});

test('core resetta lo spin quando tiene la palla e assegna quello del nuovo colpo',()=>{
  const core=new MatchCore({teams:[[{human:true}],[{}]],firstServer:0,rng:mulberry32(3)});
  core.ball.spin={x:100,y:100,z:100};core.holdBall();assert.deepEqual(core.ball.spin,{x:0,y:0,z:0});
  core.serve();assert.ok(Math.hypot(...Object.values(core.ball.spin))>50);
});
