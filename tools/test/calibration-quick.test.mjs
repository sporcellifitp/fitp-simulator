import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwingDetector,unit} from '../../site/js/tennis/swing-detect.js';
import {createCalibration,QUICK_PLAN} from '../../site/js/tennis/calibration.js';
import {classifyGesture} from '../../site/js/tennis/gesture-intent.js';
const mul=(a,n)=>a.map(v=>v*n);
function quiet(det,cal,t,ms=650,tilt=0){for(const end=t+ms;t<=end;t+=10){const k={t,rot:[0,0,0],acc:[0,0,0],accG:[0,9.81*Math.sqrt(1-tilt*tilt),9.81*tilt]};det.feed(k);cal?.tick(t,k);}return t;}
function stroke(det,cal,t,{axis=[0,1,0],peak=120,dur=220,up=0,tilt=0}={}){for(let i=0;i<=dur;i+=10){const u=i/dur,m=peak*Math.sin(Math.PI*u)**2,a=[8*Math.sin(Math.PI*u),up*6*Math.sin(Math.PI*u),0],k={t:t+i,rot:mul(axis,m),acc:a,accG:[a[0],a[1]+9.81*Math.sqrt(1-tilt*tilt),9.81*tilt]};det.feed(k);cal?.tick(k.t,k);}return t+dur+10;}
function learn({axis=[0,1,0],peak=120,tilt=0}={}){const det=createSwingDetector(),cal=createCalibration(det);cal.start({quick:true,gestural:true});let t=quiet(det,cal,0,800,tilt);assert.equal(cal.state.step,'swings','no compulsory vertical grip');for(const d of QUICK_PLAN){t=stroke(det,cal,t,{axis:mul(axis,d==='L'?1:-1),peak,tilt});t=quiet(det,cal,t,650,tilt);}assert.equal(cal.state.step,'review');assert.equal(cal.state.result.pass,true);cal.confirm();return {det,cal,t};}
test('quick calibration needs exactly four alternating comfortable gestures and accepts a non-upright grip',()=>{
 const {cal}=learn({axis:unit([.6,.8,0]),peak:65,tilt:.8});
 assert.equal(cal.state.profile.version,4);assert.equal(cal.state.profile.automaticGesture,true);assert.equal(cal.state.profile.templates.length,4);assert.deepEqual(cal.state.result.attempts.map(x=>x.want),['L','R','L','R']);assert.equal(cal.state.profile.intentGate,false);assert.ok(cal.state.profile.ref<90);
});
test('four examples recognize ordinary, upward, downward and intentional short gestures on both sides',()=>{
 const {det,t}=learn(),events=[];det.on('swing',e=>events.push(e));let at=t;
 for(const dir of [1,-1])for(const shot of ['drive','lob','slice','drop']){at=stroke(det,null,at,{axis:[0,dir,0],up:shot==='lob'?1:shot==='slice'?-1:0,tilt:shot==='drop'?.65:shot==='slice'?-.35:shot==='lob'?.25:0,...(shot==='drop'?{peak:65,dur:160}:{})});at=quiet(det,null,at);assert.equal(events.at(-1)?.shot,shot,JSON.stringify(events.at(-1)));assert.equal(events.at(-1).dir,dir);}assert.equal(events.length,8);
});
test('quick setup filters weak opening and immediate return while allowing an untrained vertical serve',()=>{
 const {det,t}=learn(),events=[];det.on('swing',e=>events.push(e));let at=stroke(det,null,t,{axis:[0,-1,0],peak:42,dur:260});at=stroke(det,null,at,{peak:125});at=stroke(det,null,at,{axis:[0,-1,0],peak:125,dur:180});at=quiet(det,null,at);assert.deepEqual(events.map(e=>e.dir),[1]);det.setContext('serve');at=stroke(det,null,at,{axis:[1,0,0],up:1});det.setContext('toss');stroke(det,null,at+40,{axis:[-1,0,0],up:1});assert.deepEqual(events.slice(1).map(e=>e.shot),['serve','serve']);assert.ok(events.every(e=>e.t-e.peakT<65));
});
test('slow ordinary movement never becomes a special shot and personal grip is the neutral reference',()=>{
 const base={lift:.2,tilt:.45,twist:.3,speed:1,travel:1,duration:180},profile={automaticGesture:true,templates:[{shot:'drive',dir:1,peak:100,features:base}]};
 assert.equal(classifyGesture(base,profile,1).aim,-.4);assert.equal(classifyGesture({...base,speed:.4,travel:.4},profile,1).shot,'drive');assert.equal(classifyGesture({...base,lift:.5},profile,1).shot,'drive');assert.equal(classifyGesture({...base,lift:.95},profile,1).shot,'lob');assert.equal(classifyGesture({...base,tilt:.9,speed:.5,travel:.5},profile,1).shot,'drop');
});
