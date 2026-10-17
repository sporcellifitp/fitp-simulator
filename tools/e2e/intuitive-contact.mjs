// Render/input-loop regression. Normalized controller commands are injected;
// the separate gesture-calibration and LAN suites cover the real phone channel.
import {launch,page,BASE,check,summary} from './th.mjs';
const B=await launch();
try{
  const{p,errs}=await page(B,BASE+'/tennis/?q=low&peer=127.0.0.1:9000');
  await p.waitForFunction(()=>window.__racchetta);
  await p.selectOption('#cameraMenu','first');
  check('scelta camera applicata e sincronizzata nella pausa',await p.evaluate(()=>__racchetta.S.cameraMode==='first' && document.querySelector('#cameraPause').value==='first'));
  await p.reload();await p.waitForFunction(()=>window.__racchetta);
  check('scelta camera conservata al riavvio',await p.evaluate(()=>__racchetta.S.cameraMode==='first'));
  await p.click('#btnCpu');await p.evaluate(()=>document.querySelector('#pairGo').click());
  await p.waitForFunction(()=>__racchetta.state==='play' && __racchetta.core);
  await p.evaluate(async()=>{
    const{evaluateContact}=await import('/js/match/contact.js');
    const S=__racchetta.S,sync=S.sync,render=S.render,c=__racchetta.core,update=c.update.bind(c);
    window.__intuition={events:[],view:null,sent:null,armed:false};
    c.update=(...args)=>{const es=update(...args);__intuition.events.push(...es.filter(e=>e.type==='contact'));return es;};
    S.sync=(v,...args)=>{__intuition.view=v;return sync(v,...args);};
    S.render=()=>{
      render();const T=__intuition,v=T.view,h=v?.players.find(p=>p.id===__racchetta.A.myId);
      if(!T.armed||!h)return;
      const cue=evaluateContact({ball:v.ball.p,velocity:v.ball.v,player:h,eligible:h.contactEligible});
      if(cue.accepted&&!cue.perfect){
        T.armed=false;T.sent={at:v.t,forward:cue.forward,perfect:cue.perfect};
        queueMicrotask(()=>__racchetta.controls.phoneSwing({at:performance.now()/1000,power:.65,aim:.4}));
      }
    };
  });
  for(const mode of ['third','first']){
    await p.evaluate(mode=>{
      const c=__racchetta.core,h=c.players[0];__racchetta.A.netPause=true;__racchetta.S.setCameraMode(mode);
      c.score.server=1;c.setupPoint();c.phase='live';c.rally.hit(1);c.rally.event({type:'bounce',x:0,z:4,side:0});c.rally.hit(0);c.rally.hit(1);c.sinceHit=.6;c.ball.held=false;
      Object.assign(h,{x:0,z:8,tx:0,tz:8,speed:0});h.inc={Tc:c.t+.2,x:.7,y:1.2,z:7,side:'fh',sx:0,sz:8};h.planT=2;
      c.ball.p={x:.7,y:1.2,z:5.4};c.ball.v={x:0,y:1,z:6};c.ball.spin={x:0,y:0,z:0};c.record();
      Object.assign(__intuition,{events:[],sent:null,armed:true});__racchetta.A.netPause=false;
    },mode);
    await p.waitForFunction(()=>__intuition.events.length,{timeout:20000});
    const r=await p.evaluate(()=>({sent:__intuition.sent,event:__intuition.events[0]}));
    check(`${mode}: colpo sul frame vicino alla racchetta accettato senza aspettare il cerchio`,r.sent&&!r.sent.perfect&&r.sent.forward>1.3&&Math.abs(r.event.at-r.sent.at)<.03,JSON.stringify(r));
  }
  check('nessun errore JavaScript',errs.length===0,errs.join(';'));
}finally{await B.close();}
summary();
