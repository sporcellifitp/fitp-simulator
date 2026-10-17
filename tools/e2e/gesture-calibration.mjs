// Physical sensor traces are synthetic. Exercise the actual phone page and UI,
// then verify automatic shot intent, two-motion serve, touch fallback and grip IK.
import { readFileSync } from 'node:fs';
import { launch, page, check, summary, SP } from './th.mjs';
const B=await launch(), motion=readFileSync(new URL('./motion.js',import.meta.url),'utf8')+';DeviceMotionEvent.requestPermission = async () => "denied";';
const opened=[];
try {
 const desktop=await page(B,'http://127.0.0.1:8765/tennis/?q=low&peer=127.0.0.1:9000',{w:960,h:720});opened.push(desktop);const d=desktop.p;
 await d.waitForFunction(()=>window.__racchetta);await d.click('#btnCpu');await d.waitForFunction(()=>document.querySelector('#qr').dataset.url);
 const P=await page(B,await d.evaluate(()=>document.querySelector('#qr').dataset.url),{w:390,h:844,mobile:true,init:motion});opened.push(P);const p=P.p;
 await p.waitForFunction(()=>window.__racchetta?.state.linkState==='on');
 await p.selectOption('#motionRange','compact');await p.selectOption('#hand','left');await p.click('#enable');
 await p.waitForFunction(()=>__racchetta.state.sensor==='denied');
 check('denied sensor permission leaves the touch alternative available',await p.locator('#enableTouch').isVisible());
 await p.evaluate(()=>{DeviceMotionEvent.requestPermission=async()=> 'granted';});await p.click('#enable');
 await p.evaluate(()=>__motion.still(1600));
 try { await p.waitForFunction(()=>__racchetta.cal.state.step==='swings'); }
 catch(e){console.log('Sensor calibration diagnostic',await p.evaluate(()=>({state:__racchetta.state,profile:__racchetta.det.profile,mode:__racchetta.det.mode,last:__racchetta.det.last,cal:__racchetta.cal.state})));throw e;}
 for(const dir of [1,-1,1,-1]){
  await p.evaluate(async dir=>{await __motion.swing({axis:[0,-dir,0],peak:42,dur:260});await __motion.swing({axis:[0,dir,0],peak:dir===1?120:150,dur:220});await __motion.still(650);},dir);
 }
 check('four comfortable gestures finish setup without special-shot training',await p.evaluate(()=>__racchetta.cal.state.profile.version===4&&__racchetta.cal.state.profile.automaticGesture&&__racchetta.cal.state.step!=='shots'));
 const learned=[
  {shot:'slice',axis:[0,1,0],peak:120,up:-1,tilt:-.35}, {shot:'slice',axis:[0,-1,0],peak:150,up:-1,tilt:-.35},
  {shot:'lob',axis:[0,1,0],peak:120,up:1,tilt:.25}, {shot:'lob',axis:[0,-1,0],peak:150,up:1,tilt:.25},
  {shot:'drop',axis:[0,1,0],peak:65,dur:160,tilt:.65}, {shot:'drop',axis:[0,-1,0],peak:65,dur:160,tilt:.65},
  {shot:'serve',axis:[1,0,0],peak:120,up:1}, {shot:'serve',axis:[1,0,0],peak:120,up:1},
 ];
 try {await p.waitForFunction(()=>__racchetta.cal.state.step==='free');}
 catch(e){console.log('Guided shot diagnostic',await p.evaluate(()=>({state:__racchetta.cal.state,profile:__racchetta.det.profile})));throw e;}
 check('short calibration learns personal strength and direction for either hand',await p.evaluate(()=>__racchetta.cal.state.profile.hand==='left'&&__racchetta.cal.state.profile.ref<180&&__racchetta.cal.state.result.pass&&__racchetta.cal.state.profile.templates.length===4));
 check('practice simulation visible; confirmation awaits an observed gesture',await d.evaluate(()=>!document.querySelector('#calPractice').classList.contains('hidden')&&!!document.querySelector('#calCanvas canvas')&&document.querySelector('#rvConfirm').disabled));
 check('motion control has no shot menu to select during play',!(await p.locator('#shotChoices').isVisible()));
 const labels={slice:'Taglio verso il basso',lob:'Palla alta',drop:'Tocco corto'};
 for(const shot of ['slice','lob','drop']){
  await p.evaluate(async trace=>{await __motion.swing(trace);await __motion.still(500);},learned.find(t=>t.shot===shot));
  await d.waitForFunction(label=>document.querySelector('#calCaption').textContent.includes(label),labels[shot]);
  check(`free practice recognizes ${shot} directly from the gesture`,await d.evaluate(label=>!document.querySelector('#rvConfirm').disabled&&document.querySelector('#calCaption').textContent.includes(label),labels[shot]));
 }
 await d.screenshot({path:SP+'/calibration-quick.png'});
 await d.click('#rvConfirm');await p.waitForFunction(()=>__racchetta.state.sensor==='ready');await d.click('#pairGo');
 await d.waitForFunction(()=>__racchetta.state==='play');
 // A deterministic point selects the human server. Inputs still come exclusively
 // from devicemotion on the real phone page and travel through the real link.
 await d.evaluate(async()=>{
  const {TOSS_APEX}=await import('/js/match/arcade.js');const c=__racchetta.core;
  __racchetta.A.netPause=true;c.score.server=0;c.setupPoint();
  window.__gestures=[];window.__contacts=[];window.__serveFrame=null;
  __racchetta.link.on('swing',e=>__gestures.push(e));
  const update=c.update.bind(c);c.update=(dt,input)=>{const events=update(dt,input);__contacts.push(...events.filter(e=>e.type==='contact'));return events;};
  const render=__racchetta.S.render;
  __racchetta.S.render=()=>{
   render();const age=c.toss?c.t-c.toss.t0:-1;
   if(!__serveFrame&&age>=TOSS_APEX-.04&&age<TOSS_APEX+.2){
    __serveFrame={age,apex:TOSS_APEX,y:c.ball.p.y,vy:c.ball.v.y};
    // Complete this presentation timestamp before freezing its visible apex.
    setTimeout(()=>{__racchetta.A.netPause=true;},0);
   }
  };
  __racchetta.link.send({t:'ph',ph:'serve'});__racchetta.A.netPause=false;
 });
 await p.waitForFunction(()=>__racchetta.state.phase==='serve');
 await p.evaluate(async()=>{await __motion.still(300);await __motion.swing({axis:[1,0,0],peak:120,up:1});});
 await d.waitForFunction(()=>!!__racchetta.core.toss||!!__serveFrame);
 check('first vertical phone motion launches the serve without tapping',await d.evaluate(()=>__gestures.length>=1&&(__racchetta.core.toss||__serveFrame)));
 await d.waitForFunction(()=>__serveFrame&&__racchetta.A.netPause);
 await p.waitForFunction(()=>__racchetta.state.phase==='toss');
 await p.evaluate(async()=>{await __motion.swing({axis:[1,0,0],peak:120,up:1});});
 await d.waitForFunction(()=>__gestures.length>=2);
 await d.evaluate(()=>{__racchetta.A.netPause=false;});
 try {await d.waitForFunction(()=>__contacts.some(e=>e.serve),null,{timeout:15000});}
 catch(e){console.log('Motion serve diagnostic',await d.evaluate(()=>({frame:__serveFrame,gestures:__gestures,contacts:__contacts,phase:__racchetta.core.phase,toss:__racchetta.core.toss,time:__racchetta.core.t})));throw e;}
 await p.waitForFunction(()=>__racchetta.state.phase==='play');
 check('second phone motion contacts the visible toss apex and restores rally input',await d.evaluate(()=>{const e=__contacts.find(e=>e.serve);return Math.abs(__serveFrame.age-__serveFrame.apex)<.12&&Math.abs(e.timing)<.15;}));
 // Hold the rally fixture while inspecting the input stream; this isolates
 // opening/return suppression from CPU point duration on a slow software GPU.
 await d.evaluate(()=>{__racchetta.A.netPause=true;__gestures.length=0;});
 await p.evaluate(async()=>{await __motion.still(500);await __motion.swing({axis:[0,-1,0],peak:42,dur:260});await __motion.swing({axis:[0,1,0],peak:130});await __motion.swing({axis:[0,-1,0],peak:130,dur:180});await __motion.still(500);});
 await d.waitForFunction(()=>__gestures.length>0);
 check('one motion drive; opening and return suppressed; continuous aim transmitted',await d.evaluate(()=>__gestures.length===1&&!__gestures[0].drop&&!__gestures[0].slice&&!__gestures[0].lob&&__gestures[0].dir===1&&Number.isFinite(__gestures[0].aim)&&Math.abs(__gestures[0].aim)>.1&&Math.abs(__gestures[0].aim)<.99));
 await d.evaluate(()=>{__racchetta.A.netPause=false;});
 await p.click('#recal');await d.waitForFunction(()=>__racchetta.state==='pair');
 check('recalibration from phone pauses the match',await d.evaluate(()=>__racchetta.A.core&&__racchetta.state==='pair'));
 await p.click('#enableTouch');await p.waitForFunction(()=>__racchetta.cal.state.step==='free');
 await p.click('#shotChoices [data-shot="slice"]');await p.selectOption('#aimDir','-1');await p.locator('#power').evaluate(el=>{el.value='55';el.dispatchEvent(new Event('input',{bubbles:true}));});await p.click('#touchHit');
 await d.waitForFunction(()=>!document.querySelector('#rvConfirm').disabled);await d.click('#rvConfirm');await d.click('#pairGo');
 await p.waitForFunction(()=>['play','serve'].includes(__racchetta.state.phase));
 await d.evaluate(()=>{__gestures.length=0;});await p.click('#touchHit');await d.waitForFunction(()=>__gestures.length>0);
 check('touch fallback carries direction, intensity and shot without a motion sensor',await d.evaluate(()=>__gestures.length===1&&__gestures[0].slice&&__gestures[0].dir===-1&&Math.abs(__gestures[0].power-.55)<.01));
 await p.click('#recal');await d.waitForFunction(()=>__racchetta.state==='pair');await p.waitForFunction(()=>__racchetta.cal.state.step==='free');
 await p.selectOption('#aimDir','0');await p.click('#touchHit');await d.waitForFunction(()=>!document.querySelector('#rvConfirm').disabled);
 check('touch recalibration pauses play and confirms a central shot without gyro inversion',await d.evaluate(()=>/centrale/.test(document.querySelector('#frTxt').textContent)&&document.querySelector('#calInvert').classList.contains('hidden')));
 await p.setViewportSize({width:844,height:390});await p.waitForFunction(()=>!document.querySelector('#rotate').classList.contains('hidden'));
 check('landscape interface requests portrait',await p.locator('#rotate').isVisible());
 await p.setViewportSize({width:320,height:568});await p.waitForFunction(()=>document.querySelector('#rotate').classList.contains('hidden'));
 check('small portrait keeps controls reachable by scrolling',await p.evaluate(()=>getComputedStyle(document.body).overflowY!=='hidden'&&document.querySelector('#stage').getBoundingClientRect().bottom<=document.querySelector('#phaseFeedback').getBoundingClientRect().top+1&&document.documentElement.scrollWidth<=innerWidth));
 const rig=await d.evaluate(async()=>{
  const THREE=await import('three'),{makeCharacter}=await import('/js/tennis/character.js');let error=0,gap=0;
  for(const team of [0,1])for(const side of ['fh','bh'])for(const kind of ['drive','drop','slice','lob','smash','serve']){
   const c=makeCharacter();c.g.rotation.y=team===0?Math.PI:0;c.g.position.z=team===0?8:-8;
   const fz=team===0?-1:1,rx=team===0?1:-1,target={x:rx*(side==='fh'?.7:-.7),y:['smash','serve'].includes(kind)?2.35:1.15,z:c.g.position.z+fz};
   c.pose({t:0,dt:0,side,kind,swing:.43});c.aimRacket(target,{x:.3,y:.1,z:fz});
   error=Math.max(error,c.racketHead.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(target.x,target.y,target.z)));
   gap=Math.max(gap,c.hand.getWorldPosition(new THREE.Vector3()).distanceTo(c.grip.getWorldPosition(new THREE.Vector3())));
   c.g.traverse(o=>{o.geometry?.dispose();if(o.material?.dispose)o.material.dispose();});
  }return {error,gap};
 });
 check('string bed reaches contact for all six shot types, both sides and teams; hand fixed to grip',rig.error<.015&&rig.gap<.001,JSON.stringify(rig));
 check('no browser errors',opened.every(x=>!x.errs.length),opened.flatMap(x=>x.errs).join(' | ').slice(0,500));summary();
} finally {await B.close();}
