// Intent is learned from personal examples, in the phone's own grip frame.
// A soft drive remains a drive: a drop needs a distinct face/cut gesture too.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const vector=f=>[finite(f.lift),finite(f.tilt),finite(f.twist),finite(f.speed,1),finite(f.duration,180)/220,finite(f.travel,1)];
export function canonicalTwist(axis,baseAxis=[0,1,0],gravity=[0,1,0],dir=0){
 const g=[gravity[2],gravity[0],gravity[1]],a=baseAxis||[0,1,0];
 const cross=[a[1]*g[2]-a[2]*g[1],a[2]*g[0]-a[0]*g[2],a[0]*g[1]-a[1]*g[0]],n=Math.hypot(...cross)||1;
 return axis.reduce((s,v,i)=>s+v*cross[i]/n,0)*(dir||1);
}
export function gestureDistance(a,b){
 const x=vector(a),y=vector(b),weights=[2.5,2.7,1.5,.55,.35,.25];
 return Math.sqrt(x.reduce((sum,v,i)=>sum+weights[i]*(v-y[i])**2,0)/weights.reduce((a,b)=>a+b,0));
}
export function classifyGesture(features,profile={},dir=0,context='play'){
 const templates=(profile.templates||[]).filter(t=>t.features && (context==='serve'||context==='toss'?t.shot==='serve':(context==='practice'||t.shot!=='serve')&&(t.dir===dir||t.dir===0)));
 const drive=templates.filter(t=>t.shot==='drive');
 const scores=new Map();
 for(const t of templates){
  if(['drop','slice','lob'].includes(t.shot)){
   const geometry=drive.length?Math.min(...drive.map(d=>Math.hypot((t.features.tilt||0)-(d.features.tilt||0),(t.features.lift||0)-(d.features.lift||0),(t.features.twist||0)-(d.features.twist||0)))):Math.hypot(t.features.tilt||0,t.features.lift||0,t.features.twist||0);
   if(geometry<.18)continue;
  }
  const d=gestureDistance(features,t.features);if(!scores.has(t.shot)||d<scores.get(t.shot))scores.set(t.shot,d);
 }
 // Quick setup learns only ordinary swings. Special gestures are measured
 // relative to that personal grip/direction, never from force alone.
 let intuitive=null,aimTwist=finite(features.twist),aimTravel=finite(features.travel,1);
 if(profile.automaticGesture && context!=='serve' && context!=='toss' && drive.length){
  const average=key=>drive.reduce((sum,t)=>sum+finite(t.features[key]),0)/drive.length;
  const lift=finite(features.lift)-average('lift'),tilt=finite(features.tilt)-average('tilt'),twist=finite(features.twist)-average('twist');
  const speed=finite(features.speed,1)/Math.max(.2,average('speed')),travel=finite(features.travel,1)/Math.max(.2,average('travel'));
  aimTwist=twist;aimTravel=travel;
  if(lift>.58)intuitive='lob';
  else if(lift<-.58 || (tilt<-.22 && Math.abs(twist)>.45))intuitive='slice';
  else if(tilt>.32 && speed<.72 && travel<.82)intuitive='drop';
 }
 const ranked=[...scores].sort((a,b)=>a[1]-b[1]), best=ranked[0], margin=ranked.length>1?ranked[1][1]-(best?.[1]||0):.4;
 let shot='drive',confidence=.45;
 if(context==='serve'||context==='toss'){shot='serve';confidence=best?clamp(1-best[1],.3,1):.55;}
 else if(best&&best[1]<.55&&(best[0]==='drive'||margin>.065)){shot=best[0];confidence=clamp(.6+margin-best[1]*.5,.3,1);}
 else if(!templates.length){
  if(features.lift>.6)shot='lob';
  else if(features.lift<-.5)shot='slice';
  else if(features.tilt>.35&&features.speed<.75&&features.travel<.85)shot='drop';
 }
 if(intuitive){shot=intuitive;confidence=.8;}
 // Across-body motion gives a natural default; wrist angle can steer through
 // centre to either sideline with the same forehand/backhand gesture.
 const aim=clamp(-dir*(.4+.15*(aimTravel-1))+aimTwist*1.6,-1,1);
 return {shot,confidence:+confidence.toFixed(3),aim:+aim.toFixed(3),lob:shot==='lob',slice:shot==='slice',drop:shot==='drop'};
}
// Personalized acceptance floor. Slice/lob/soft drop can be slower than a drive.
export function gestureFloor(profile,dir,features,context='play'){
 const result=classifyGesture(features,profile,dir,context);
 const examples=(profile.templates||[]).filter(t=>t.shot===result.shot&&(t.dir===dir||t.dir===0||result.shot==='serve'));
 const ref=examples.length?Math.min(...examples.map(t=>t.peak)):profile.refs?.[dir]||profile.ref||600;
 const noise=Math.max(1,profile.noise||3);
 if(context==='serve'||context==='toss')return {floor:Math.max(noise*5,ref*.28),...result};
 if(profile.automaticGesture&&result.shot!=='drive'&&result.confidence>=.5)return {floor:Math.max(noise*5,ref*.28),...result};
 if(examples.length&&result.shot!=='drive'&&result.confidence>=.5)return {floor:Math.max(noise*5,ref*.4),...result};
 return {floor:Math.max((profile.preparation?.[dir]||0)*1.2,ref*.5),...result};
}
