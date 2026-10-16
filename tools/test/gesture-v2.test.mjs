import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwingDetector } from '../../site/js/tennis/swing-detect.js';
import { createCalibration, PLAN } from '../../site/js/tennis/calibration.js';
import { shotFlags } from '../../site/js/tennis/shot-options.js';
import { createControls } from '../../site/js/tennis/controls.js';
import { readGuestInput } from '../../site/js/tennis/input-time.js';
import { ArcadeMatch } from '../../site/js/match/arcade.js';
import { encodeSnap, createMirror } from '../../site/js/tennis/net.js';
const sample=(t,w)=>({t,rot:[0,w,0],acc:[0,0,0],accG:[0,9.81,0]});
function quiet(det,cal,t,ms=500){ for(let end=t+ms;t<=end;t+=10){const k=sample(t,2*Math.sin(t));det.feed(k);cal?.tick(t,k);} return t; }
function swing(det,cal,t,peak,sign=1,dur=220){ for(let i=0;i<=dur;i+=10){const k=sample(t+i,sign*peak*Math.sin(Math.PI*i/dur)**2);det.feed(k);cal?.tick(t+i,k);} return t+dur+10; }
function profile(range,peakL,peakR,opening=0){
 const det=createSwingDetector(),cal=createCalibration(det);cal.start({range});
 let t=quiet(det,cal,0,1400);
 for(const dir of PLAN){if(opening)t=swing(det,cal,t,opening,dir==='L'?-1:1,260);t=swing(det,cal,t+50,dir==='L'?peakL:peakR,dir==='L'?1:-1);t=quiet(det,cal,t);}
 assert.equal(cal.state.result.pass,true,JSON.stringify(cal.state.result));cal.confirm();return {det,cal,t};
}
test('compact and natural gestures calibrate to comparable personal power in both directions',()=>{
 for(const [range,l,r] of [['compact',90,110],['standard',700,540]]){
  const {det,t}=profile(range,l,r), events=[];det.on('swing',e=>events.push(e));
  let at=quiet(det,null,t+100,300);at=swing(det,null,at,l);at=quiet(det,null,at);swing(det,null,at,r,-1);
  assert.equal(events.length,2);assert.deepEqual(events.map(e=>e.dir),[1,-1]);assert.ok(Math.abs(events[0].power-events[1].power)<.04);
 }
});
test('learned opening and fast return do not consume a new stroke',()=>{
 const {det,t}=profile('standard',700,700,280),events=[];det.on('swing',s=>events.push(s));
 let at=quiet(det,null,t+100,300);at=swing(det,null,at,280,-1,260);at=swing(det,null,at+30,700);at=swing(det,null,at,650,-1,200);quiet(det,null,at);
 assert.deepEqual(events.map(s=>s.dir),[1]);assert.ok(events[0].t-events[0].peakT<65);
});
test('assisted intent accepts only an armed stroke, including short comfortable gestures',()=>{
 const det=createSwingDetector();det.setProfile({axis:[0,1,0],ref:100,on:25,minPeak:40,minAngle:2.5,intentGate:true});
 const events=[];det.on('swing',e=>events.push(e));let t=swing(det,null,0,120,-1);assert.equal(events.length,0);
 t=quiet(det,null,t);det.setArmed(true);swing(det,null,t,120);assert.equal(events.length,1);
});
test('a sensor gap discards the partial gesture instead of integrating stale motion',()=>{
 const det=createSwingDetector();det.setProfile({axis:[0,1,0],ref:600,on:90,minPeak:200,minAngle:12});const events=[];det.on('swing',s=>events.push(s));
 for(let t=0;t<60;t+=10)det.feed(sample(t,230));det.feed(sample(1000,0));quiet(det,null,1010,500);
 assert.equal(events.length,0);swing(det,null,1600,700);assert.equal(events.length,1);
});
test('selected shot is intentional and survives controls and guest validation',()=>{
 for(const shot of ['drive','drop','slice','lob']){
  const controls=createControls();controls.enabled=true;const flags=shotFlags(shot,{drop:true,lob:true,slice:true});
  controls.phoneSwing({at:10,power:.5,dir:1,...flags});
  const packet=readGuestInput({sw:controls.read().swings},10.05).sw[0];
  assert.deepEqual({drop:packet.drop,slice:packet.slice,lob:packet.lob},flags);
 }
 assert.equal(shotFlags('drive',{drop:true}).drop,false);
});
test('contact point and outgoing direction survive snapshots without requiring fields in old packets',()=>{
 const c=new ArcadeMatch({teams:[[{id:'a',human:true}],[{id:'b'}]],firstServer:0});
 c.players[0].anim={kind:'drive',side:'bh',at:0,hit:true,point:{x:.7,y:1.2,z:7},out:{x:0,y:.2,z:-.98}};
 const M=createMirror({players:c.players}),s=encodeSnap(c,1000);M.push(s);const anim=M.view(s.ct).players[0].anim;
 assert.deepEqual(anim.point,c.players[0].anim.point);assert.deepEqual(anim.out,c.players[0].anim.out);assert.equal(anim.hit,true);
 s.p[0][3]=s.p[0][3].slice(0,3);const old=createMirror({players:c.players});old.push(s);assert.equal(old.view(s.ct).players[0].anim.hit,false);
});
