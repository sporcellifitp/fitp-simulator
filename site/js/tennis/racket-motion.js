// Presentation only: never generates contacts or changes the sensor peak used for timing.
const identity = [0,0,0,1], norm = q => { const l=Math.hypot(...q)||1; return q.map(v=>v/l); };
const mul = (a,b) => [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const integrate = (q,w,ms) => { const speed=Math.hypot(...w)*Math.PI/180, half=speed*ms/2000; if(!speed)return q.slice(); const s=Math.sin(half)/(Math.hypot(...w)||1); return norm(mul(q,[w[0]*s,w[1]*s,w[2]*s,Math.cos(half)])); };
export function slerp(a,b,t){ let dot=a.reduce((n,v,i)=>n+v*b[i],0); if(dot<0){ b=b.map(v=>-v);dot=-dot; } if(dot>.9995)return norm(a.map((v,i)=>v+(b[i]-v)*t)); const theta=Math.acos(Math.max(-1,Math.min(1,dot))),s=Math.sin(theta);return a.map((v,i)=>(v*Math.sin((1-t)*theta)+b[i]*Math.sin(t*theta))/s); }
export function createRacketMotion(){
  let samples=[],lastSequence=null,lastRemote=null,received=0,lost=0,q=identity.slice(),bias=[0,0,0];
  return {
    push(sample,now){
      if(!sample||!Number.isFinite(now)||!Number.isFinite(sample.t)||!Number.isInteger(sample.sequence))return false;
      const delta=lastSequence==null?1:(sample.sequence-lastSequence)>>>0;
      if(delta===0||delta>0x7fffffff||lastRemote!=null&&sample.t<=lastRemote)return false;
      if(sample.rot&&!sample.rot.every(Number.isFinite))return false;
      if(lastSequence!=null)lost+=delta-1;
      let dt=lastRemote==null?0:Math.min(60,sample.t-lastRemote);
      if(lastRemote!=null&&sample.t-lastRemote>150){q=identity.slice();samples=[];dt=0;}
      // DeviceMotion names rotations alpha(Z), beta(X), gamma(Y); renderer quaternions use XYZ.
      const corrected=sample.rot ? sample.rot.map((v,i)=>v-bias[i]) : [0,0,0];
      const raw=[corrected[1],corrected[2],corrected[0]];
      const previous=samples.slice(-3), vectors=[...previous.map(s=>s.raw),raw];
      const angularVelocity=[0,1,2].map(i=>vectors.reduce((n,v)=>n+v[i],0)/vectors.length);
      q=integrate(q,angularVelocity,dt); samples.push({rotation:q.slice(),angularVelocity,raw,receivedAt:now});if(samples.length>4)samples.shift();
      lastSequence=sample.sequence;lastRemote=sample.t;received++;return true;
    },
    sample(now){
      const latest=samples.at(-1);if(!latest||!Number.isFinite(now))return null;
      const age=Math.max(0,now-latest.receivedAt), previous=samples.at(-2); let rotation=latest.rotation.slice();
      // One sensor interval of interpolation absorbs arrival jitter; predict at most 60 ms.
      if(previous&&age<25)rotation=slerp(previous.rotation,latest.rotation,age/25);
      else rotation=integrate(rotation,latest.angularVelocity,Math.min(60,Math.max(0,age-25)));
      return {rotation,angularVelocity:age>150?[0,0,0]:latest.angularVelocity.slice(),confidence:age>150?0:Math.max(0,1-age/180),age,stale:age>150,loss:received+lost?lost/(received+lost):0,received,lost};
    },
    setBias(value){if(!Array.isArray(value)||value.length!==3||!value.every(v=>Number.isFinite(v)&&Math.abs(v)<1000))return false;bias=value.slice();return true;},
    reset(){samples=[];lastSequence=null;lastRemote=null;received=lost=0;q=identity.slice();},
  };
}
