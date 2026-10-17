import test from 'node:test';
import assert from 'node:assert/strict';
import { playerCameraFrame, cameraFieldOfView, normalizeCameraMode } from '../../site/js/tennis/viewpoint.js';

const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;
const sub = (a,b) => ({ x:a.x-b.x, y:a.y-b.y, z:a.z-b.z });
const cross = (a,b) => ({ x:a.y*b.z-a.z*b.y, y:a.z*b.x-a.x*b.z, z:a.x*b.y-a.y*b.x });
const unit = v => { const d=Math.hypot(v.x,v.y,v.z); return { x:v.x/d,y:v.y/d,z:v.z/d }; };
// Independent lookAt projection: same perspective convention as Three.js, with
// no renderer dependency so CI's unit job can verify framing before GPU tests.
function project(frame,p,aspect){
  const forward=unit(sub(frame.target,frame.camera));
  const right=unit(cross(forward,{ x:0,y:1,z:0 })), up=cross(right,forward);
  const q=sub(p,frame.camera), depth=dot(q,forward), tan=Math.tan(frame.fov*Math.PI/360);
  return { x:dot(q,right)/(depth*tan*aspect), y:dot(q,up)/(depth*tan), depth };
}

test('POV: campo, margini di recupero e colpi alti nel frustum su monitor differenti', () => {
  for (const aspect of [21/9,16/9,16/10,4/3,1,.75]) for (const team of [0,1]) for (const x of [-7,0,7]){
    const f=playerCameraFrame({ team,x,z:team ? -11.885 : 11.885 },11.885,aspect);
    for (const px of [-6.3,6.3]) for (const pz of [-14.485,14.485]) for (const y of [0,3.4]){
      const p=project(f,{ x:px,y,z:pz },aspect);
      assert.ok(p.depth>.2 && Math.abs(p.x)<=.880001 && Math.abs(p.y)<=.860001,JSON.stringify({aspect,team,x,p}));
    }
    for (const px of [-5,0,5]) for (const z of [-6,0,6]){
      const p=project(f,{ x:px,y:9,z },aspect);
      assert.ok(Math.abs(p.x)<=.88 && Math.abs(p.y)<=.860001,'apice del lob visibile');
    }
  }
});

test('POV: profondità leggibile, fondo locale in basso e prospettive specchiate', () => {
  const aspect=16/9, p1=playerCameraFrame({team:0,x:2,z:11.885},11.885,aspect), p2=playerCameraFrame({team:1,x:-2,z:-11.885},11.885,aspect);
  assert.equal(p1.camera.y,p2.camera.y); assert.equal(p1.camera.z,-p2.camera.z); assert.equal(p1.camera.x,-p2.camera.x);
  const pitch=Math.atan2(p1.camera.y-p1.target.y,Math.hypot(p1.camera.x-p1.target.x,p1.camera.z-p1.target.z))*180/Math.PI;
  assert.ok(pitch>16 && pitch<19,`pitch ${pitch}: vista terza persona abbassata`);
  for (const [team,f] of [[0,p1],[1,p2]]){
    const side=team ? -1:1;
    const near=project(f,{x:0,y:0,z:side*11.885},aspect), net=project(f,{x:0,y:0,z:0},aspect), far=project(f,{x:0,y:0,z:-side*11.885},aspect);
    assert.ok(near.y<net.y && net.y<far.y && far.y-near.y>.4,'le due metà del campo occupano una profondità visibile');
    const right=project(f,{x:side,y:0,z:0},aspect); const left=project(f,{x:-side,y:0,z:0},aspect);
    assert.ok(right.x>left.x,'la destra locale resta a destra in entrambi i team');
  }
});

test('POV: avanzamento a rete non causa zoom e input invalidi non corrompono la camera', () => {
  const baseline=playerCameraFrame({team:0,x:2,z:11.885});
  for (const z of [0,4,8,15]) assert.deepEqual(playerCameraFrame({team:0,x:2,z}),baseline);
  const safe=playerCameraFrame(null,NaN,NaN);
  assert.equal(safe.fov,52); assert.ok(Object.values(safe.camera).every(Number.isFinite));
  assert.equal(cameraFieldOfView(0),52); assert.ok(cameraFieldOfView(.75)<60);
});

test('prima persona: occhi del giocatore locale e rete davanti per entrambi i team',()=>{
  for(const team of [0,1]) for(const z of [2,8,13]){
    const side=team? -1:1, p={team,x:2,z:side*z,y:.1};
    const f=playerCameraFrame(p,11.885,16/9,'first');
    assert.equal(f.mode,'first');assert.equal(f.camera.x,p.x);assert.equal(f.camera.y,1.78);
    assert.ok(Math.abs(f.camera.z-p.z)<.2,'camera nella testa, non dietro al campo');
    const opponent=project(f,{x:2,y:1,z:-side*11.885},16/9);
    assert.ok(opponent.depth>0 && Math.abs(opponent.y)<1,'avversario visibile');
    const right=project(f,{x:p.x+side,y:1,z:0},16/9),left=project(f,{x:p.x-side,y:1,z:0},16/9);
    assert.ok(right.x>left.x);assert.equal(f.fov,78);
  }
  assert.equal(normalizeCameraMode('invalid'),'third');
  const safe=playerCameraFrame(null,NaN,NaN,'first');assert.ok(Object.values(safe.camera).every(Number.isFinite));
});
