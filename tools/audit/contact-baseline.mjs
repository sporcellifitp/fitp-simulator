import { ArcadeMatch, ARC } from '../../site/js/match/arcade.js';
import { mulberry32 } from '../../site/js/match/core.js';
import { evaluateSweetSpot } from '../../site/js/tennis/sweet-spot.js';
// Baseline diagnostics, not acceptance tests. Synthetic motion and fixed 60 ms delivery.
const mode = process.argv[2] || 'green';
const results=[];
for(const fps of [30,60,120]) for(const x of [.7,2,3.5]) for(const z of [4,7,10]) for(const speed of [7,13,20]){
 const core=new ArcadeMatch({teams:[[{human:true,id:'me',grace:.16}],[{id:'cpu'}]],rng:mulberry32(4)});
 core.phase='live'; core.rally.hit(1); core.rally.event({type:'bounce',x,z:4,side:0});core.rally.hit(0);core.rally.hit(1); core.sinceHit=.5; core.ball.held=false;
 const h=core.players[0];Object.assign(h,{x:0,z:12,tx:0,tz:12,auto:true});core.ball.p={x,y:1.4,z};core.ball.v={x:0,y:1.5,z:speed};
 let sent=null,result=null,cue=null;
 for(let frame=0;frame<fps*3&&!result;frame++){
 const n=Math.ceil(120/fps),dt=1/fps/n;
 for(let i=0;i<n;i++){
 const swings=sent&&!sent.delivered&&core.t>=sent.at+.06?(sent.delivered=true,[{delay:sent.at-core.t-dt,power:.6,dir:1}]):[];
 const ev=core.update(dt,{swings,auto:true});
 const contact=ev.find(e=>e.type==='contact'&&e.player==='me');if(contact){result=contact;break;}
 }
 if(core.phase!=='live') break;
 if(!sent&&h.inc){const s=evaluateSweetSpot({ball:core.ball.p,player:h,impact:h.inc,timeToImpact:h.inc.Tc-core.t});if(mode === 'reach' ? s.inReach && s.heightOk : s.perfect){sent={at:core.t};cue={at:core.t,Tc:h.inc.Tc,distance:s.distance};}}
 }
 if(sent)results.push({fps,x,z,speed,cue,label:result?.label||'no-contact',timing:result?.timing});
}
console.log(JSON.stringify({mode, triggeredCases:results.length,labels:results.reduce((o,r)=>(o[r.label]=(o[r.label]||0)+1,o),{}),examples:results.filter(r=>r.label!=='perfetto').slice(0,4)},null,2));
