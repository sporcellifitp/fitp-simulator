import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwingDetector,unit} from '../../site/js/tennis/swing-detect.js';
import {createCalibration,QUICK_PLAN} from '../../site/js/tennis/calibration.js';
import {classifyGesture} from '../../site/js/tennis/gesture-intent.js';
const mul=(a,n)=>a.map(v=>v*n);
function quiet(det,cal,t,ms=650,tilt=0){for(const end=t+ms;t<=end;t+=10){const k={t,rot:[0,0,0],acc:[0,0,0],accG:[0,9.81*Math.sqrt(1-tilt*tilt),9.81*tilt]};det.feed(k);cal?.tick(t,k);}return t;}
function stroke(det,cal,t,{axis=[0,1,0],peak=120,dur=220,up=0,tilt=0}={}){for(let i=0;i<=dur;i+=10){const u=i/dur,m=peak*Math.sin(Math.PI*u)**2,a=[8*Math.sin(Math.PI*u),up*6*Math.sin(Math.PI*u),0],k={t:t+i,rot:mul(axis,m),acc:a,accG:[a[0],a[1]+9.81*Math.sqrt(1-tilt*tilt),9.81*tilt]};det.feed(k);cal?.tick(k.t,k);}return t+dur+10;}
function learn({axis=[0,1,0],peak=120,tilt=0}={}){const det=createSwingDetector(),cal=createCalibration(det);cal.start({quick:true,gestural:true});let t=quiet(det,cal,0,800,tilt);assert.equal(cal.state.step,'swings','no compulsory vertical grip');for(const d of QUICK_PLAN){t=stroke(det,cal,t,{axis:mul(axis,d==='L'?1:-1),peak,tilt});t=quiet(det,cal,t,650,tilt);}assert.equal(cal.state.step,'review');assert.equal(cal.state.result.pass,true);cal.confirm();return {det,cal,t};}
// percorso rapido: due gesti comodi, un dritto e un rovescio (prima quattro: più di 8 s anche con gesti perfetti)
test('quick calibration needs exactly two comfortable gestures, one per side, and accepts a non-upright grip',()=>{
 const {cal}=learn({axis:unit([.6,.8,0]),peak:65,tilt:.8});
 assert.equal(cal.state.profile.version,4);assert.equal(cal.state.profile.automaticGesture,true);assert.equal(cal.state.profile.templates.length,2);assert.deepEqual(cal.state.result.attempts.map(x=>x.want),['L','R']);assert.equal(cal.state.profile.intentGate,false);assert.ok(cal.state.profile.ref<90);
 assert.equal(cal.state.result.need,1);assert.equal(cal.state.result.per,1);
});
test('two examples recognize ordinary, upward, downward and intentional short gestures on both sides',()=>{
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
// Calibrazione con la mano vera: tremolio da fermo, rientro al centro dopo ogni gesto (nel verso del gesto seguente),
// preparazione nel verso opposto prima del colpo. Ogni gesto va letto da solo, senza dipendere da quello prima.
function jitter(det,cal,t,ms,amp=45){for(const end=t+ms;t<=end;t+=10){const n=Math.sin(t*.37)*Math.sin(t*.011),k={t,rot:[amp*.3*Math.cos(t*.5),amp*n,amp*.2*Math.sin(t*.7)],acc:[0,0,0],accG:[0,9.81,0]};det.feed(k);cal?.tick(t,k);}return t;}
function handCalibration({pauseAfterReturn=true,returnPeak=.5,prepPeak=.45,peak=220}={}){
 const det=createSwingDetector(),cal=createCalibration(det),ev=[];cal.on(e=>ev.push(e));cal.start({quick:true});
 let t=quiet(det,cal,0,800);t=jitter(det,cal,t,700);
 QUICK_PLAN.forEach((d,i)=>{const s=d==='L'?1:-1;
  if(i>0){t=quiet(det,cal,t,120);t=stroke(det,cal,t,{axis:[0,s,0],peak:peak*returnPeak,dur:260});if(pauseAfterReturn)t=jitter(det,cal,t,350,30);}   // rientro al centro
  t=stroke(det,cal,t,{axis:[0,-s,0],peak:peak*prepPeak,dur:200});                                                   // preparazione
  t=stroke(det,cal,t,{axis:[0,s,0],peak});                                                                          // colpo
  t=quiet(det,cal,t,150);t=stroke(det,cal,t,{axis:[0,s,0],peak:peak*.3,dur:160});                                   // accompagnamento
  t=jitter(det,cal,t,250,35);                                                                                     // fine del gesto, poco ferma
 });
 t=quiet(det,cal,t,600);return {cal,ev};
}
test('calibration ignores tremor and the return to centre: every requested gesture is read on its own',()=>{
 for(const opts of [{},{pauseAfterReturn:false},{returnPeak:.7,prepPeak:.6}]){
  const {cal,ev}=handCalibration(opts),at=ev.filter(e=>e.kind==='attempt');
  assert.equal(cal.state.step,'review',JSON.stringify(opts));
  assert.deepEqual(at.map(a=>a.dir+(a.ok?'':'!')),QUICK_PLAN,JSON.stringify({opts,at:at.map(a=>[a.want,a.dir,a.peak,a.why])}));
  assert.equal(cal.state.result.pass,true);
 }
});
test('a hand held still with tremor never consumes calibration attempts',()=>{
 const det=createSwingDetector(),cal=createCalibration(det),ev=[];cal.on(e=>ev.push(e));cal.start({quick:true});
 let t=quiet(det,cal,0,800);t=jitter(det,cal,t,6000,60);
 assert.equal(cal.state.step,'swings');assert.equal(cal.state.idx,0);assert.equal(ev.filter(e=>e.kind==='attempt').length,0);
});
// Primo gesto nel verso sbagliato (telefono in verticale, gesto attorno alla verticale). Prima il primo gesto fissava il
// verso qualunque fosse: un primo gesto al contrario invertiva la calibrazione e il gesto «verso destra» dopo risultava
// «verso sinistra». Ora è un tentativo nel verso sbagliato; alla terza volta di fila si accetta (telefoni con il segno
// della rotazione opposto).
test('first calibration gesture in the wrong direction around the vertical is a wrong-direction attempt',()=>{
 const run=firsts=>{const det=createSwingDetector(),cal=createCalibration(det),ev=[];cal.on(e=>ev.push(e));cal.start({quick:true});
  let t=quiet(det,cal,0,800);
  const turn=(s,peak=220)=>{t=stroke(det,cal,t,{axis:[0,0,s],peak});t=quiet(det,cal,t,650);};   // γ: attorno al lato lungo, verticale
  for(const s of firsts)turn(s);
  for(const d of QUICK_PLAN.slice(1))turn(d==='L'?1:-1);
  return {cal,at:ev.filter(e=>e.kind==='attempt').map(a=>`${a.want}${a.dir}${a.ok?'':'!'}`)};};
 // un gesto sbagliato, poi quello giusto: la calibrazione riesce con il verso vero
 let r=run([-1,1]);
 assert.deepEqual(r.at,['LR!','LL','RR']);assert.equal(r.cal.state.result.pass,true);
 assert.ok(r.cal.state.profile.axis[2]>.9,'asse: da destra a sinistra = rotazione verso l’alto');
 // il verso giusto subito: come prima
 r=run([1]);assert.deepEqual(r.at,['LL','RR']);
 // tre volte lo stesso verso «sbagliato»: è il telefono, si accetta (e gli altri gesti si leggono di conseguenza)
 r=run([-1,-1,-1]);assert.deepEqual(r.at.slice(0,3),['LR!','LR!','LL']);
});

// Colpo completo durante la calibrazione: apertura lenta nel verso opposto (picco a metà, 0,7 s) e poi il colpo. I picchi
// distano circa mezzo secondo, oltre il gruppo di 380 ms: prima l'apertura veniva giudicata da sola («altro verso») e
// il colpo, arrivato prima che la mano si fermasse, non contava. Adesso la calibrazione aspetta il colpo.
test('calibration with full strokes: a slow backswing in the opposite direction is the preparation, the stroke counts',()=>{
 const det=createSwingDetector(),cal=createCalibration(det);cal.start({quick:true});
 let t=quiet(det,cal,0,800);
 for(const d of QUICK_PLAN){const s=d==='L'?1:-1;
  // γ: attorno al lato lungo, verticale (come sopra): apertura nel verso opposto, 80 ms, colpo
  t=stroke(det,cal,t,{axis:[0,0,-s],peak:220,dur:700});t=quiet(det,cal,t,80);t=stroke(det,cal,t,{axis:[0,0,s],peak:850,dur:260});t=quiet(det,cal,t,900);}
 assert.equal(cal.state.step,'review',JSON.stringify(cal.state.attempts.map(a=>[a.want,a.dir,a.peak])));
 assert.equal(cal.state.result.pass,true);
 assert.deepEqual(cal.state.result.attempts.map(a=>[a.want,a.dir,a.peak>800]),QUICK_PLAN.map(d=>[d,d,true]));
});
