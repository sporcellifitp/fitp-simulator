// Actual Three.js projection/render checks, isolated from signaling and physics.
import { launch, page, BASE, SP, check, summary } from './th.mjs';
const browser=await launch();
try {
  const {p,errs}=await page(browser,BASE+'/tennis/?q=low');
  await p.route('**/__arcade_visual_fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><script type="importmap">{"imports":{"three":"/js/vendor/three.module.js"}}</script></head><body style="margin:0"><main style="width:100vw;height:100vh" id="court"></main></body></html>'}));
  await p.goto(BASE+'/__arcade_visual_fixture');
  const result=await p.evaluate(async()=>{
    const THREE=await import('three'), {createScene}=await import('/js/tennis/scene.js');
    const S=createScene(document.querySelector('#court'),{quality:0}); S.setQuality(0);
    const players=[{id:'me',team:0,x:0,z:11.885,y:0,human:true,contactEligible:true,inc:{x:.7,y:2.5,z:10.885,Tc:1.4}}, {id:'cpu',team:1,x:0,z:-11.885,y:0}];
    const chars=S.setPlayers(players,['blu','rosso']);
    const view={t:.6,phase:'live',ball:{p:{x:.7,y:5,z:6},v:{x:0,y:-3,z:12}},players};
    S.sync(view,1/60,{id:'me',assist:true});S.follow(players[0],1/60,true);S.render();
    const wide=S.camera.fov, project=pos=>new THREE.Vector3(pos.x,pos.y,pos.z).project(S.camera).toArray();
    const corners=[[-6.3,0,-14.485],[6.3,0,14.485]].map(([x,y,z])=>project({x,y,z}));
    const marker={visible:S.smashTarget.visible,x:S.smashTarget.position.x,z:S.smashTarget.position.z};
    players[0].anim={kind:'smash',at:.6,hit:true,point:{x:.7,y:2.5,z:10.885},out:{x:.2,y:-.2,z:-1}};
    view.ball.p={...players[0].anim.point};
    S.impact({type:'hit',player:'me',shot:'smash'},view);
    for(let n=0;n<4;n++){view.t+=1/60;S.sync(view,1/60,{id:'me',assist:true});S.follow(players[0],1/60);}
    S.render();
    const smashFov=S.camera.fov, impactProjection=project(players[0].anim.point);
    window.__visuals={S,view,players};
    // Articulation does not move the engine's transform; grip stays attached.
    const roots=[];
    S.setRacketMotion({rotation:[.24,0,0,.97],confidence:1,stale:false});
    for(const state of ['ready','run','lunge','dive','recover']){
      chars[0].pose({t:1,dt:1/60,moving:1,locomotion:{state,dirX:1,dirZ:0,progress:.5}});chars[0].g.updateMatrixWorld(true);
      roots.push({state,x:chars[0].g.position.x,z:chars[0].g.position.z,gap:chars[0].grip.getWorldPosition(new THREE.Vector3()).distanceTo(chars[0].hand.getWorldPosition(new THREE.Vector3()))});
    }
    players[0].anim=null;players[0].inc=null;view.ball.p={x:0,y:5,z:0};
    for(let n=0;n<20;n++){S.sync(view,1/60,{id:'me',assist:true});}
    const wrist=chars[0].grip.quaternion.toArray();
    S.setRacketMotion({rotation:[.24,0,0,.97],confidence:0,stale:true});
    for(let n=0;n<40;n++){S.sync(view,1/60,{id:'me',assist:true});}
    const wristRest=chars[0].grip.quaternion.toArray();
    return {wide,smashFov,impactProjection,corners,marker,roots,wrist,wristRest};
  });
  check('campo completo nel frustum ricezione reale Three.js',result.corners.every(p=>Math.abs(p[0])<=.89 && Math.abs(p[1])<=.87));
  check('smash: zoom rapido, punto di contatto visibile',result.smashFov<result.wide-7 && result.impactProjection.slice(0,2).every(v=>Math.abs(v)<1),JSON.stringify({wide:result.wide,smash:result.smashFov,point:result.impactProjection}));
  check('bersaglio rosa coincide con previsione contatto',result.marker.visible && Math.abs(result.marker.x-.7)<.001 && Math.abs(result.marker.z-10.885)<.001);
  check('cinque pose preservano coordinate e presa',result.roots.every(r=>r.x===0 && r.z===11.885 && r.gap<.001));
  check('orientamento sensore muove il polso; dati scaduti tornano alla posa pronta',result.wrist.every(Number.isFinite) && result.wristRest.every(Number.isFinite) && result.wrist.some((v,i)=>Math.abs(v-result.wristRest[i])>.02));
  await p.screenshot({path:SP+'/arcade-smash-camera.png'});
  const recovered=await p.evaluate(()=>{
    const{S,view,players}=window.__visuals;players[0].anim=null;
    for(let n=0;n<40;n++){view.t+=1/60;view.ball.p.z-=.15;S.sync(view,1/60,{id:'me',assist:true});S.follow(players[0],1/60);}
    const fov=S.camera.fov;
    players[0].team=1;players[0].z=-11.885;S.follow(players[0],1/60,true);S.render();
    return{fov,teamTwoZ:S.camera.position.z};
  });
  check('volo ripristina wide; POV del secondo giocatore specchiato',Math.abs(recovered.fov-result.wide)<.02 && recovered.teamTwoZ<0);
  check('rendering senza errori JavaScript',errs.length===0,errs.join('; '));
} finally {await browser.close();}
summary();
