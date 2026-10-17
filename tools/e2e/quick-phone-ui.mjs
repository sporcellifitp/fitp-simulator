// Actual smartphone DOM and DeviceMotion; explicitly simulated link, NOT a LAN/RTC test.
import {readFileSync} from 'node:fs';
import {launch,page,check,summary} from './th.mjs';
const motion=readFileSync(new URL('./motion.js',import.meta.url),'utf8');
const link=`
window.__phonePackets=[];
class Events{constructor(){this.handlers={};}on(k,f){(this.handlers[k]||=[]).push(f);return this;}emit(k,e){for(const f of this.handlers[k]||[])f(e);}}
class SimulatedPhoneLink extends Events{constructor(){super();setTimeout(()=>this.emit('open'),0);}connect(){const c=new Events();c.open=true;c.send=m=>{window.__phonePackets.push(m);if(m.t==='hello')setTimeout(()=>c.emit('data',{t:'welcome',r:'simulated-ui-test'}),0);};c.close=()=>{};window.__phoneWire=c;setTimeout(()=>c.emit('open'),0);return c;}destroy(){this.destroyed=true;}}
window.Peer=SimulatedPhoneLink;DeviceMotionEvent.requestPermission=async()=> 'granted';`;
const B=await launch();try{
 const {p,errs}=await page(B,'http://127.0.0.1:8765/tennis/racchetta.html#s=racchetta-tel-abcdefghijkmnpqrstuvwxyz&k=abcdefghijkmnpqrstuvwxyz',{w:390,h:844,mobile:true,init:motion+link});
 await p.waitForFunction(()=>__racchetta.state.linkState==='on');await p.click('#enable');await p.evaluate(()=>__motion.still(900));await p.waitForFunction(()=>__racchetta.cal.state.step==='swings');
 check('comfortable grip goes directly from stillness to four simple gestures',await p.evaluate(()=>__racchetta.cal.state.options.quick&&document.querySelector('#sub').textContent.includes('di 4')));
 for(const dir of [1,-1,1,-1])await p.evaluate(async dir=>{await __motion.swing({axis:[0,dir,0],peak:120});await __motion.still(650);},dir);
 await p.waitForFunction(()=>__racchetta.cal.state.step==='review');
 check('default smartphone calibration ends after four gestures, no special-shot sequence',await p.evaluate(()=>__racchetta.cal.state.profile.version===4&&__racchetta.cal.state.attempts.length===4&&__racchetta.cal.state.profile.templates.length===4));
 await p.evaluate(()=>__phoneWire.emit('data',{t:'cmd',c:'free'}));await p.waitForFunction(()=>__racchetta.cal.state.step==='free'&&document.querySelector('#big').textContent==='Prova un colpetto');
 check('automatic motion mode hides shot selectors and gives a plain-language practice cue',!await p.locator('#shotChoices').isVisible()&&await p.locator('#big').textContent()==='Prova un colpetto');
 await p.evaluate(async()=>{await __motion.swing({axis:[0,1,0],peak:120,up:1,tilt:.25});await __motion.still(650);});
 check('upward gesture recognized in observed practice without selecting a tennis shot',await p.evaluate(()=>__phonePackets.some(m=>m.t==='cal'&&m.e.kind==='free'&&m.e.shot==='lob')));
 await p.evaluate(()=>{__phoneWire.emit('data',{t:'cmd',c:'confirm'});__phoneWire.emit('data',{t:'ph',ph:'serve'});});await p.waitForFunction(()=>__racchetta.state.sensor==='ready');
 await p.evaluate(async()=>{await __motion.swing({axis:[1,0,0],peak:120,up:1});await __motion.still(300);__phoneWire.emit('data',{t:'ph',ph:'toss'});await __motion.swing({axis:[1,0,0],peak:120,up:1});});
 check('two vertical service gestures transmitted after quick calibration',await p.evaluate(()=>__phonePackets.filter(m=>m.t==='sw').length===2));
 check('smartphone page has no JavaScript errors',!errs.length,errs.join(' | '));summary();
}finally{await B.close();}
