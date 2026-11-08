// Physical sensor traces are synthetic. Exercise the actual phone page and UI,
// then verify automatic shot intent, two-motion serve, touch fallback and grip IK.
import { readFileSync } from 'node:fs';
import { launch, page, check, summary, SP } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';
const B=await launch(), motion=readFileSync(new URL('./motion.js',import.meta.url),'utf8')+';DeviceMotionEvent.requestPermission = async () => "denied";';
const opened=[];
// CPU_THROTTLE=4 (facoltativo): computer e telefono frenati via CDP dal servizio in poi, come un runner lento della CI
// (così si è riprodotto l'errore intermittente del servizio, docs/b13/gesture-calibration-ci.md)
const SLOW=Number(process.env.CPU_THROTTLE)||0, slow=async x=>{if(SLOW>1)await(await x.ctx.newCDPSession(x.p)).send('Emulation.setCPUThrottlingRate',{rate:SLOW});};
try {
 const desktop=await page(B,'http://127.0.0.1:8765/tennis/?q=low&peer=127.0.0.1:9000',{w:960,h:720});opened.push(desktop);const d=desktop.p;
 await d.waitForFunction(()=>window.__racchetta);await d.click('#btnCpu');await d.waitForFunction(()=>document.querySelector('#qr').dataset.url);
 const P=await page(B,await d.evaluate(()=>document.querySelector('#qr').dataset.url),{w:390,h:844,mobile:true,init:motion});opened.push(P);const p=P.p;
 await p.waitForFunction(()=>window.__racchetta?.state.linkState==='on');
 // (B15) movimento in «Opzioni», chiuse; la mano con i pulsanti Destra/Sinistra sopra «Attiva i sensori»
 await p.click('#moreOpts summary');await p.selectOption('#motionRange','compact');await p.click('#profileOptions [data-hand="left"]');
 check('mano scelta con il pulsante «Sinistra»',await p.evaluate(()=>document.querySelector('#hand').value==='left'&&document.querySelector('#profileOptions [data-hand="left"]').classList.contains('on')));
 await p.click('#enable');
 await p.waitForFunction(()=>__racchetta.state.sensor==='denied');
 check('denied sensor permission leaves the touch alternative available',await p.locator('#enableTouch').isVisible());
 await p.evaluate(()=>{DeviceMotionEvent.requestPermission=async()=> 'granted';});await p.click('#enable');
 // telefono fermo finché la calibrazione non chiede i gesti (dal 29/10: 1,5 s di preparazione, poi il fermo)
 await p.evaluate(async()=>{const t0=performance.now();while(__racchetta.cal.state.step!=='swings'&&performance.now()-t0<12000)await __motion.still(100);});
 try { await p.waitForFunction(()=>__racchetta.cal.state.step==='swings'); }
 catch(e){console.log('Sensor calibration diagnostic',await p.evaluate(()=>({state:__racchetta.state,profile:__racchetta.det.profile,mode:__racchetta.det.mode,last:__racchetta.det.last,cal:__racchetta.cal.state})));throw e;}
 // i gesti nell'ordine che chiede il telefono (B15: il mancino fa prima il suo dritto, «R»; prima la prova usava sempre
 // l'ordine del destro e con la mano sinistra il primo gesto era nel verso sbagliato)
 const askPlan=await p.evaluate(()=>__racchetta.cal.state.plan||null);
 check('il telefono del mancino chiede prima il dritto (→)',Array.isArray(askPlan)&&askPlan[0]==='R'&&askPlan.length===QUICK_PLAN.length,JSON.stringify(askPlan));
 for(const dir of (askPlan||QUICK_PLAN).map(w=>w==='L'?1:-1)){
  await p.evaluate(async dir=>{const t0=performance.now();while(!__racchetta.cal.state.ready&&performance.now()-t0<12000)await __motion.still(100);await __motion.swing({axis:[0,-dir,0],peak:42,dur:260});await __motion.swing({axis:[0,dir,0],peak:dir===1?120:150,dur:220});await __motion.still(650);},dir);
 }
 check(`${QUICK_PLAN.length} comfortable gestures finish setup without special-shot training`,await p.evaluate(()=>__racchetta.cal.state.profile.version===4&&__racchetta.cal.state.profile.automaticGesture&&__racchetta.cal.state.step!=='shots'));
 const learned=[
  {shot:'slice',axis:[0,1,0],peak:120,up:-1,tilt:-.35}, {shot:'slice',axis:[0,-1,0],peak:150,up:-1,tilt:-.35},
  {shot:'lob',axis:[0,1,0],peak:120,up:1,tilt:.25}, {shot:'lob',axis:[0,-1,0],peak:150,up:1,tilt:.25},
  {shot:'drop',axis:[0,1,0],peak:65,dur:160,tilt:.65}, {shot:'drop',axis:[0,-1,0],peak:65,dur:160,tilt:.65},
  {shot:'serve',axis:[1,0,0],peak:120,up:1}, {shot:'serve',axis:[1,0,0],peak:120,up:1},
 ];
 try {await p.waitForFunction(()=>__racchetta.cal.state.step==='free');}
 catch(e){console.log('Guided shot diagnostic',await p.evaluate(()=>({state:__racchetta.cal.state,profile:__racchetta.det.profile})));throw e;}
 check('short calibration learns personal strength and direction for either hand',await p.evaluate(n=>__racchetta.cal.state.profile.hand==='left'&&__racchetta.cal.state.profile.ref<180&&__racchetta.cal.state.result.pass&&__racchetta.cal.state.profile.templates.length===n,QUICK_PLAN.length));
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
 await slow(desktop);await slow(P);
 // A deterministic point selects the human server. Inputs still come exclusively
 // from devicemotion on the real phone page and travel through the real link.
 // Fermo immagine all'apice del lancio: da quel fotogramma il motore avanza con dt = 0, la tela continua a mostrare la
 // palla in cima e il ciclo del computer continua a registrarlo come fotogramma presentato (input-time.js). Prima la
 // prova fermava tutto con A.netPause: in pausa main.js non registra i fotogrammi presentati e sui runner lenti (CI) il
 // secondo gesto arrivava più di INPUT_TIME.maxAge (0,8 s) dopo l'ultimo registrato; presented.seenAt lo scartava, alla
 // ripresa la palla ricadeva (tossCaught) e il contatto non arrivava mai. Nel gioco vero ogni ripresa dalla pausa passa
 // da resetInputTimeline e scarta i colpi fatti in pausa: il fermo immagine è solo della prova, la catena del colpo
 // (telefono, collegamento, controlli, fotogramma visto, motore) resta quella vera. docs/b13/gesture-calibration-ci.md
 await d.evaluate(async()=>{
  const {TOSS_APEX}=await import('/js/match/arcade.js');const c=__racchetta.core;
  __racchetta.A.netPause=true;c.score.server=0;c.setupPoint();
  window.__gestures=[];window.__contacts=[];window.__serveFrame=null;window.__hold=false;window.__serveLog=[];
  __racchetta.link.on('swing',e=>__gestures.push(e));
  const update=c.update.bind(c);c.update=(dt,input)=>{
   const events=update(__hold?0:dt,input);__contacts.push(...events.filter(e=>e.type==='contact'));
   for(const e of events)if(__serveLog.length<40&&['toss','tossCaught','swing','contact'].includes(e.type))__serveLog.push({type:e.type,t:c.t,wall:performance.now()/1000});
   return events;
  };
  const render=__racchetta.S.render;
  __racchetta.S.render=()=>{
   // durante il fermo la tela mostra ancora il fotogramma con la palla in cima: niente lavoro per la GPU software, così
   // il computer gira a pieno ritmo e registra il fotogramma presentato ogni pochi millisecondi (con la GPU software un
   // fotogramma disegnato costa anche mezzo secondo e un gesto poteva cadere oltre gli 0,8 s dall'ultimo registrato)
   if(__hold)return;
   render();const age=c.toss?c.t-c.toss.t0:-1;
   if(!__serveFrame&&age>=TOSS_APEX-.04&&age<TOSS_APEX+.2){
    // questo fotogramma è già stato calcolato e viene registrato come presentato: dal prossimo la palla resta in cima
    __serveFrame={age,apex:TOSS_APEX,y:c.ball.p.y,vy:c.ball.v.y,wall:performance.now()/1000};__hold=true;
   }
  };
  __racchetta.link.send({t:'ph',ph:'serve'});__racchetta.A.netPause=false;
 });
 await p.waitForFunction(()=>__racchetta.state.phase==='serve');
 await p.evaluate(async()=>{await __motion.still(300);await __motion.swing({axis:[1,0,0],peak:120,up:1});});
 await d.waitForFunction(()=>!!__racchetta.core.toss||!!__serveFrame);
 check('first vertical phone motion launches the serve without tapping',await d.evaluate(()=>__gestures.length>=1&&(__racchetta.core.toss||__serveFrame)));
 await d.waitForFunction(()=>__serveFrame&&__hold);
 await p.waitForFunction(()=>__racchetta.state.phase==='toss');
 await p.evaluate(async()=>{await __motion.swing({axis:[1,0,0],peak:120,up:1});});
 // il secondo gesto colpisce mentre si vede ancora la palla in cima: nessuna scadenza dipende dalla velocità del runner
 try {await d.waitForFunction(()=>__gestures.length>=2&&__contacts.some(e=>e.serve),null,{timeout:30000});}
 catch(e){console.log('Motion serve diagnostic',await d.evaluate(()=>({frame:__serveFrame,hold:__hold,log:__serveLog,gestures:__gestures.map(g=>({seq:g.seq,at:g.at,receivedAt:g.receivedAt,sentLat:g.sentLat,peak:g.peak,vert:g.vert,dir:g.dir,path:g.path})),contacts:__contacts,phase:__racchetta.core.phase,toss:__racchetta.core.toss,time:__racchetta.core.t,now:performance.now()/1000})));throw e;}
 await d.evaluate(()=>{__hold=false;});
 await p.waitForFunction(()=>__racchetta.state.phase==='play');
 const serve=await d.evaluate(()=>{const e=__contacts.find(e=>e.serve),g=__gestures[1];return {age:+__serveFrame.age.toFixed(3),apex:+__serveFrame.apex.toFixed(3),timing:+e.timing.toFixed(3),afterApex:+(g.at-__serveFrame.wall).toFixed(3)};});
 check('second phone motion contacts the visible toss apex and restores rally input',Math.abs(serve.age-serve.apex)<.12&&Math.abs(serve.timing)<.15,JSON.stringify(serve));
 // Hold the rally fixture while inspecting the input stream; this isolates
 // opening/return suppression from CPU point duration on a slow software GPU.
 await d.evaluate(()=>{__racchetta.A.netPause=true;__gestures.length=0;});
 await p.evaluate(async()=>{await __motion.still(500);await __motion.swing({axis:[0,-1,0],peak:42,dur:260});await __motion.swing({axis:[0,1,0],peak:130});await __motion.swing({axis:[0,-1,0],peak:130,dur:180});await __motion.still(500);});
 await d.waitForFunction(()=>__gestures.length>0);
 check('one motion drive; opening and return suppressed; continuous aim transmitted',await d.evaluate(()=>__gestures.length===1&&!__gestures[0].drop&&!__gestures[0].slice&&!__gestures[0].lob&&__gestures[0].dir===1&&Number.isFinite(__gestures[0].aim)&&Math.abs(__gestures[0].aim)>.1&&Math.abs(__gestures[0].aim)<.99),JSON.stringify(await d.evaluate(()=>__gestures.map(g=>({dir:g.dir,aim:g.aim,drop:g.drop,slice:g.slice,lob:g.lob,peak:g.peak})))));
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
 check('landscape: the page says it turned, without blocking the controls',await p.locator('#rotate').isVisible()&&await p.evaluate(()=>getComputedStyle(document.querySelector('#rotate')).position==='fixed'&&document.querySelector('#rotate').getBoundingClientRect().height<innerHeight*.6));
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
