import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwingDetector,unit} from '../../site/js/tennis/swing-detect.js';
import {createCalibration,PLAN,GESTURE_PLAN} from '../../site/js/tennis/calibration.js';
import {classifyGesture,gestureFloor} from '../../site/js/tennis/gesture-intent.js';
import {ArcadeMatch,TOSS_APEX} from '../../site/js/match/arcade.js';
import {COURTS,stepBall} from '../../site/js/match/physics.js';
import {createControls} from '../../site/js/tennis/controls.js';
import {readGuestInput} from '../../site/js/tennis/input-time.js';
const mul=(a,n)=>a.map(v=>v*n);
function quiet(det,t,cal,ms=650){for(const end=t+ms;t<=end;t+=10){const k={t,rot:[0,0,0],acc:[0,0,0],accG:[0,9.81,0]};det.feed(k);cal?.tick(t,k);}return t;}
function stroke(det,t,{axis=[0,1,0],peak=120,dur=220,up=0,tilt=0}={},cal){
 for(let i=0;i<=dur;i+=10){const u=i/dur,m=peak*Math.sin(Math.PI*u)**2,a=[8*Math.sin(Math.PI*u),up*6*Math.sin(Math.PI*u),0],k={t:t+i,rot:mul(axis,m),acc:a,accG:[a[0],a[1]+9.81*Math.sqrt(1-tilt**2),9.81*tilt]};det.feed(k);cal?.tick(k.t,k);}
 return t+dur+10;
}
function learn(axis=[0,1,0]){
 const det=createSwingDetector(),cal=createCalibration(det);cal.start({range:'compact',gestural:true});let t=quiet(det,0,cal,1400);
 for(const d of PLAN){t=stroke(det,t,{axis:mul(axis,d==='L'?1:-1)},cal);t=quiet(det,t,cal);}
 assert.equal(cal.state.step,'shots');
 for(const g of GESTURE_PLAN){const d=g.want==='R'?-1:1,trace={axis:g.shot==='serve'?[-axis[1],axis[0],0]:mul(axis,d),up:g.shot==='slice'?-1:g.shot==='lob'||g.shot==='serve'?1:0,tilt:g.shot==='slice'?-.35:g.shot==='lob'?.25:g.shot==='drop'?.65:0,...(g.shot==='drop'?{peak:90,dur:160}:{})};t=stroke(det,t,trace,cal);t=quiet(det,t,cal);}
 assert.equal(cal.state.result.pass,true);assert.deepEqual(cal.state.result.gestureWarnings,[]);cal.confirm();return {det,cal,t};
}
test('personal raw traces recognize four shots in both directions and oblique grips without selecting a type',()=>{
 for(const axis of [[0,1,0],unit([.6,.8,0])]){
  const r=learn(axis),events=[];r.det.on('swing',e=>events.push(e));let t=r.t;
  for(const dir of [1,-1])for(const shot of ['drive','slice','lob','drop']){
   const trace={axis:mul(axis,dir),up:shot==='slice'?-1:shot==='lob'?1:0,tilt:shot==='slice'?-.35:shot==='lob'?.25:shot==='drop'?.65:0,...(shot==='drop'?{peak:90,dur:160}:{})};
   t=stroke(r.det,t,trace);t=quiet(r.det,t);assert.equal(events.at(-1)?.shot,shot,JSON.stringify(events.at(-1)));assert.equal(events.at(-1).dir,dir);
  }assert.equal(events.length,8);
 }
});
test('weak gestures with drive geometry cannot masquerade as a special shot or bypass opening filtering',()=>{
 const f={lift:0,tilt:0,twist:0,speed:1,duration:180,travel:1};
 for(const shot of ['drop','slice','lob']){
  const weak={...f,speed:.3,duration:250,travel:.4},profile={ref:600,preparation:{1:200},templates:[{shot:'drive',dir:1,peak:600,features:f},{shot,dir:1,peak:180,features:weak}]};
  const result=gestureFloor(profile,1,weak);assert.equal(result.shot,'drive');assert.ok(result.floor>=240);
 }
});
test('one forehand can steer continuously through centre to either sideline; protocol preserves aim',()=>{
 const f={lift:0,tilt:0,speed:1,duration:180,travel:1};const values=[-.8,-.2,.25,.6,.9].map(twist=>classifyGesture({...f,twist},{},1).aim);
 assert.equal(values[0],-1);assert.equal(values[2],0);assert.equal(values.at(-1),1);
 for(let i=1;i<values.length;i++)assert.ok(values[i]>values[i-1]);
 const c=createControls();c.enabled=true;c.phoneSwing({at:3,power:.7,dir:1,aim:.375,confidence:.83});const input=readGuestInput({sw:c.read().swings},3.05).sw[0];assert.equal(input.aim,.375);assert.equal(input.confidence,.83);
});
test('vertical toss and service hit are accepted with no horizontal gate or quiet recovery gap',()=>{
 const {det,t}=learn();const events=[];det.on('swing',e=>events.push(e));det.setContext('serve');
 let at=stroke(det,t,{axis:[1,0,0],up:1});assert.equal(events.length,1);assert.equal(events[0].dir,0);assert.equal(events[0].shot,'serve');
 det.setContext('toss');at=stroke(det,at+40,{axis:[-1,0,0],up:1});assert.equal(events.length,2);assert.equal(events[1].shot,'serve');
 assert.ok(events[1].peakT-events[0].peakT<400);assert.ok(events.every(e=>e.t-e.peakT<65));
});
test('two motion events produce a directed legal serve for either team with a racket-contact animation',()=>{
 for(const team of [0,1])for(const aim of [-1,0,1]){
  const c=new ArcadeMatch({teams:[[{id:'a',human:team===0}],[{id:'b',human:team===1}]],firstServer:team,rng:()=>.5});const h=c.players[team],dt=1/240;
  c.update(dt,{[h.id]:{swings:[{power:.7,dir:0,aim}]}});assert.ok(c.toss);const target=c.toss.t0+TOSS_APEX;let events=[];
  while(c.t<target-dt/2)events.push(...c.update(dt));events.push(...c.update(dt,{[h.id]:{swings:[{power:.7,dir:0,aim,delay:target-(c.t+dt)}]}}));
  assert.ok(events.some(e=>e.type==='contact'&&e.serve));assert.equal(c.phase,'live');assert.equal(h.anim.kind,'serve');assert.equal(h.anim.hit,true);
  const box=c.rally.serveBox(),b=structuredClone(c.ball);let bounce;
  for(let i=0;i<2000&&!bounce;i++)bounce=stepBall(b,dt,COURTS.tennis).find(e=>e.type==='bounce');
  assert.ok(bounce&&bounce.x>=box.x0&&bounce.x<=box.x1&&bounce.z>=box.z0&&bounce.z<=box.z1,JSON.stringify({team,aim,bounce,box}));
 }
});
