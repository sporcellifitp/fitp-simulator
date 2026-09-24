// Renderer, scena, luci e ciclo principale. I sistemi si registrano con add() e ricevono update(dt) in ordine.
import * as THREE from 'three';
import { isTouch } from './util.js';

export function createEngine(container){
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa8d0ec);
  scene.fog = new THREE.Fog(0xc6dceb, 130, 470);
  const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, .3, 1000);

  scene.add(new THREE.HemisphereLight(0xe4f1ff, 0x6f7d4c, 1.05));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 5, far: 320 });
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);

  // sui telefoni in verticale serve un campo visivo più largo
  const fit = () => { camera.aspect = innerWidth/innerHeight; camera.fov = camera.aspect < .8 ? 72 : 55; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); };
  fit(); addEventListener('resize', fit);

  const systems = [], clock = new THREE.Clock(), focus = new THREE.Vector3();
  const engine = {
    THREE, renderer, scene, camera, sun, time: 0,
    add(sys, order = 50){ systems.push({ sys, order }); systems.sort((a, b) => a.order - b.order); return sys; },
    setFocus(x, z){ focus.set(x, 0, z); },
    start(){
      const loop = () => {
        const dt = Math.min(.1, clock.getDelta());
        engine.time += dt;
        for (const { sys } of systems) if (sys.update && sys.active !== false) sys.update(dt);
        sun.position.set(focus.x + 60, 120, focus.z + 40); sun.target.position.copy(focus);
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
  };
  return engine;
}
