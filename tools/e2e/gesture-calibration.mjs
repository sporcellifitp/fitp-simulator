// Physical sensor traces are synthetic. Exercise the actual phone page and UI,
// then verify calibration preview, intentional shots, touch fallback and grip IK.
import { readFileSync } from 'node:fs';
import { launch, page, check, summary, SP } from './th.mjs';
const B=await launch(), motion=readFileSync(new URL('./motion.js',import.meta.url),'utf8');
const opened=[];
try {
 const desktop=await page(B,'http://127.0.0.1:8765/tennis/?q=low&peer=127.0.0.1:9000',{w:960,h:720});opened.push(desktop);const d=desktop.p;
 await d.waitForFunction(()=>window.__racchetta);await d.click('#btnCpu');await d.waitForFunction(()=>document.querySelector('#qr').dataset.url);
 const P=await page(B,await d.evaluate(()=>document.querySelector('#qr').dataset.url),{w:390,h:844,mobile:true,init:motion});opened.push(P);const p=P.p;
 await p.waitForFunction(()=>window.__racchetta?.state.linkState==='on');
 await p.selectOption('#motionRange','compact');await p.selectOption('#hand','left');await p.click('#enable');
 await p.evaluate(()=>__motion.still(1600));await p.waitForFunction(()=>__racchetta.cal.state.step==='swings');
 for(const dir of [1,1,1,-1,-1,-1]){
  await p.evaluate(async dir=>{await __motion.swing({axis:[0,-dir,0],peak:42,dur:260});await __motion.swing({axis:[0,dir,0],peak:dir===1?120:150,dur:220});await __motion.still(650);},dir);
 }
 await p.waitForFunction(()=>__racchetta.cal.state.step==='free');
 check('compact gestures pass personalized calibration for either hand',await p.evaluate(()=>__racchetta.cal.state.profile.hand==='left'&&__racchetta.cal.state.profile.ref<180&&__racchetta.cal.state.result.pass));
 check('practice simulation visible; confirmation awaits an observed gesture',await d.evaluate(()=>!document.querySelector('#calPractice').classList.contains('hidden')&&!!document.querySelector('#calCanvas canvas')&&document.querySelector('#rvConfirm').disabled));
 await p.click('#shotChoices [data-shot="drop"]');await p.evaluate(async()=>{await __motion.swing({axis:[0,1,0],peak:130});await __motion.still(500);});
 await d.waitForFunction(()=>!document.querySelector('#rvConfirm').disabled);
 check('observed drop-shot gesture and trajectory shown in calibration',await d.evaluate(()=>/Il tuo gesto.*Palla corta/.test(document.querySelector('#calCaption').textContent)));
 await d.screenshot({path:SP+'/calibration-v2.png'});
 await d.click('#rvConfirm');await p.waitForFunction(()=>__racchetta.state.sensor==='ready');await d.click('#pairGo');
 await p.waitForFunction(()=>['play','serve'].includes(__racchetta.state.phase));
 await d.evaluate(()=>{window.__gestures=[];__racchetta.link.on('swing',e=>__gestures.push(e));});
 await p.evaluate(async()=>{await __motion.swing({axis:[0,-1,0],peak:42,dur:260});await __motion.swing({axis:[0,1,0],peak:130});await __motion.swing({axis:[0,-1,0],peak:130,dur:180});await __motion.still(500);});
 await d.waitForFunction(()=>__gestures.length>0);
 check('one intended shot; opening and return suppressed; explicit type preserved',await d.evaluate(()=>__gestures.length===1&&__gestures[0].drop&&__gestures[0].dir===1));
 await p.click('#recal');await d.waitForFunction(()=>__racchetta.state==='pair');
 check('recalibration from phone pauses the match',await d.evaluate(()=>__racchetta.A.core&&__racchetta.state==='pair'));
 await p.click('#enableTouch');await p.waitForFunction(()=>__racchetta.cal.state.step==='free');
 await p.click('#shotChoices [data-shot="slice"]');await p.selectOption('#aimDir','-1');await p.locator('#power').evaluate(el=>{el.value='55';el.dispatchEvent(new Event('input',{bubbles:true}));});await p.click('#touchHit');
 await d.waitForFunction(()=>!document.querySelector('#rvConfirm').disabled);await d.click('#rvConfirm');await d.click('#pairGo');
 await p.waitForFunction(()=>['play','serve'].includes(__racchetta.state.phase));
 await d.evaluate(()=>{__gestures.length=0;});await p.click('#touchHit');await d.waitForFunction(()=>__gestures.length>0);
 check('touch fallback carries direction, intensity and shot without a motion sensor',await d.evaluate(()=>__gestures.length===1&&__gestures[0].slice&&__gestures[0].dir===-1&&Math.abs(__gestures[0].power-.55)<.01));
 await p.setViewportSize({width:844,height:390});await p.waitForFunction(()=>!document.querySelector('#rotate').classList.contains('hidden'));
 check('landscape interface requests portrait',await p.locator('#rotate').isVisible());
 await p.setViewportSize({width:320,height:568});await p.waitForFunction(()=>document.querySelector('#rotate').classList.contains('hidden'));
 check('small portrait keeps controls reachable by scrolling',await p.evaluate(()=>getComputedStyle(document.body).overflowY!=='hidden'&&!!document.querySelector('#touchHit')));
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
