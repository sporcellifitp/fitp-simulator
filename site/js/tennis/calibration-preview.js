// Same character and shot integrator as the match, with a light practice scene.
import * as THREE from 'three';
import { makeCharacter, LOOKS } from './character.js';
import { makeShot, shotTarget } from '../match/ai.js';
import { COURTS, newBall, stepBall } from '../match/physics.js';
export const SHOTS = Object.freeze({ drive: 'Drive / piatto', slice: 'Slice', lob: 'Lob', drop: 'Palla corta', smash: 'Smash', serve: 'Servizio' });
export function createCalibrationPreview(container){
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(1); renderer.setSize(600, 260, false); container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Simulazione del gesto e della traiettoria riconosciuta');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xeef4fb);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7c8da3, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(2, 7, 5); scene.add(light);
  const camera = new THREE.PerspectiveCamera(43, 600/260, .1, 100); camera.position.set(3.5, 3, 11); camera.lookAt(0, 1, 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 30), new THREE.MeshStandardMaterial({ color: 0x2d78b7, roughness: 1 })); floor.rotation.x = -Math.PI/2; floor.position.z = -9; scene.add(floor);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(8.2,.95),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.25,side:THREE.DoubleSide})); net.position.y=.475;scene.add(net);
  const lines=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4,.015,-11),new THREE.Vector3(-4,.015,6),new THREE.Vector3(4,.015,-11),new THREE.Vector3(4,.015,6),new THREE.Vector3(-4,.015,-6.4),new THREE.Vector3(4,.015,-6.4),new THREE.Vector3(-4,.015,6),new THREE.Vector3(4,.015,6)]);scene.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:0xffffff})));
  const c = makeCharacter(LOOKS.blu); scene.add(c.g); c.g.rotation.y = Math.PI; c.g.position.z = 4;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(.105, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe8f520 })); scene.add(mesh);
  const marker = new THREE.Mesh(new THREE.RingGeometry(.25, .29, 24), new THREE.MeshBasicMaterial({ color: 0x169953, side: THREE.DoubleSide })); marker.rotation.x = -Math.PI/2; marker.position.y = .012; scene.add(marker);
  const ball = newBall(), court = COURTS.tennis;
  let event = null, mode = 'demo', shot = 'drive', phase = 'ready', label = '', last = null, at = 0;
  const contact = () => ({ x: (event?.dir || 1)*.7, y: shot === 'smash' || shot === 'serve' ? 2.35 : 1.15, z: 3 });
  function launch(){
    const p = contact(), type = shot === 'serve' ? 'serve' : shot;
    ball.p = { ...p }; ball.v = makeShot(court, p, shotTarget(court, 0, event?.aim ?? -(event?.dir ?? 1)*.72, shot === 'drop' ? .1 : .85, type), type, 0, () => .5, shot === 'lob' ? 1.4 : .5, .8 + .4*(event?.power || .6)).v;
    ball.held = false; ball.rolling = false; ball.stopped = false;
  }
  let launched = false;
  return {
    renderer,
    get visible(){ return !container.classList.contains('hidden'); },
    get label(){ return label; },
    get phase(){ return phase; },
    example(type = shot, dir = 1){ shot = SHOTS[type] ? type : 'drive'; event = { dir, power: .6 }; mode = 'demo'; at = performance.now()/1000; launched = false; last = null; },
    gesture(e){ if (SHOTS[e.shot]) shot = e.shot; event = { dir: e.dirValue ?? (e.dir === 'R' ? -1 : 1), aim: Number.isFinite(e.aim)?e.aim:null, power: Math.max(.3, Math.min(1, e.power || e.strength*.75 || .6)) }; mode = 'observed'; at = performance.now()/1000; launched = false; last = null; },
    tick(nowMs){
      const now = nowMs/1000; if (!at) at = now;
      let t = now-at; if (mode === 'demo' && t > 3.2){ at = now; t = 0; launched = false; }
      const impactAt = mode === 'demo' ? 1 : .16, swing = (t-impactAt)/.55 + .43;
      phase = t < impactAt-.15 ? 'preparation' : t < impactAt+.08 ? 'contact' : t < impactAt+.7 ? 'follow' : 'ready';
      const names = { preparation: 'Apri il braccio', contact: 'Colpisci', follow: 'Accompagna', ready: 'Torna pronto' };
      label = `${mode === 'demo' ? 'Esempio' : 'Il tuo gesto'} · ${SHOTS[shot]} · ${names[phase]}`;
      const side = (event?.dir || 1) > 0 ? 'fh' : 'bh', point = contact();
      c.pose({ t: now, dt: last == null ? 0 : Math.min(.05,now-last), moving: 0, prep: t < impactAt ? Math.min(1,t/impactAt) : 0, side, kind: shot, swing: swing >= 0 && swing <= 1.2 ? Math.min(1,swing) : null });
      if (t < impactAt+.4) c.aimRacket?.(point, { x: -(event?.dir ?? 1)*.5, y: .2, z: -1 }, 1);
      if (t < impactAt){ mesh.position.set(point.x, shot === 'serve' ? .9+(point.y-.9)*Math.sin(t/impactAt*Math.PI/2) : point.y, shot === 'serve' ? point.z : point.z - 5*(1-t/impactAt)); }
      else {
        if (!launched){ launch(); launched = true; }
        const dt = last == null ? 0 : Math.min(.06,now-last), steps = Math.max(1,Math.ceil(dt*120));
        for (let i=0;i<steps;i++) stepBall(ball,dt/steps,court);
        mesh.position.set(ball.p.x,ball.p.y,ball.p.z);
      }
      marker.position.set(point.x,.012,point.z); last = now; renderer.render(scene,camera);
    },
  };
}
