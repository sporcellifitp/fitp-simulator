import test from 'node:test';
import assert from 'node:assert/strict';
import { createImpactEffects, smashOpportunity, SHOT_COLORS } from '../../site/js/tennis/impact-effects.js';
const point={x:1,y:1.2,z:10};
test('camera: only a confirmed local hit zooms; impact widens smoothly after the strike',()=>{
  const fx=createImpactEffects();
  assert.equal(fx.hit({type:'swing',shot:'drive'},point,true),false);
  assert.equal(fx.tick(1/60).zoom,0);
  fx.hit({type:'hit',shot:'slice'},point,false);
  assert.equal(fx.tick(1/60).zoom,0,'opponent hit keeps a stable receiving view');
  fx.hit({type:'hit',shot:'drive'},point,true);
  const attack=[fx.tick(1/60),fx.tick(1/60),fx.tick(1/60)];
  assert.ok(attack[2].zoom>4.5 && attack[2].zoom<5.5,'rapid bounded attack');
  let previous=attack[2].zoom;
  for(let i=0;i<30;i++){const f=fx.tick(1/60);assert.ok(f.zoom<=previous);previous=f.zoom;}
  assert.ok(previous<.01,'full-court field of view restored during flight');
});
test('camera: smash is stronger, shake is small and finite, reset clears a paused impact',()=>{
  const fx=createImpactEffects(); fx.hit({type:'hit',shot:'smash'},point,true);
  let max=0;
  for(let i=0;i<6;i++){const f=fx.tick(1/60);max=Math.max(max,f.zoom);assert.ok(Math.abs(f.shake)<=.033);}
  assert.ok(max>8 && max<=10);
  let f;for(let i=0;i<20;i++)f=fx.tick(1/60);
  assert.equal(f.shake,0);
  const paused=fx.tick(0,false);assert.equal(paused.zoom,0);assert.equal(paused.point,null);
  fx.reset();assert.equal(fx.tick(1/60).color,SHOT_COLORS.drive);
});
test('smash marker uses legal predicted high contact and never authorizes a stroke',()=>{
  const p={contactEligible:true,inc:{x:2,z:3,y:2.5,Tc:2}};
  assert.equal(smashOpportunity(p,1).ready,false);
  assert.equal(smashOpportunity(p,1.8).ready,true);
  assert.equal(smashOpportunity({...p,contactEligible:false},1),null);
  assert.equal(smashOpportunity(p,1,'serve'),null);
  assert.equal(smashOpportunity({...p,inc:{...p.inc,y:1.2}},1),null);
  assert.equal(smashOpportunity(p,2.2),null);
  assert.equal(smashOpportunity({...p,inc:{...p.inc,x:NaN}},1),null);
});
test('trail palettes distinguish shot type without mutating physics',()=>{
  const fx=createImpactEffects();
  for(const shot of ['drive','slice','lob','drop','smash','serve']){
    fx.hit({type:'hit',shot},point,false);const f=fx.tick(1/60);
    assert.equal(f.color,SHOT_COLORS[shot]); assert.equal(f.zoom,0);
  }
  assert.notEqual(SHOT_COLORS.drive,SHOT_COLORS.slice);
  assert.notEqual(SHOT_COLORS.slice,SHOT_COLORS.smash);
  assert.deepEqual(point,{x:1,y:1.2,z:10});
});

test('a slower rendered frame still shows the confirmed impact',()=>{
  const fx=createImpactEffects();fx.hit({type:'hit',shot:'drive'},point,true);
  assert.ok(fx.tick(.1).zoom>4);assert.equal(fx.tick(0,false).zoom,0);
});
