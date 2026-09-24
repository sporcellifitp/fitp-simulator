// Anteprima 3D del personaggio accanto alle scelte (registrazione, guardaroba, negozio): si aggiorna in tempo reale,
// gira piano su se stesso e si può girare col dito o col mouse. Un solo renderer, spostato dove serve.
import * as THREE from 'three';
import { makeAvatar, pose } from '../entities/avatar.js';

let R = null;
function init(){
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a95a8, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 3); scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(.9, 40), new THREE.MeshBasicMaterial({ color: 0xc4623a, transparent: true, opacity: .9 }));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  const line = new THREE.Mesh(new THREE.RingGeometry(.84, .9, 40), new THREE.MeshBasicMaterial({ color: 0xffffff })); line.rotation.x = -Math.PI/2; line.position.y = .003; scene.add(line);
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 50);
  R = { renderer, scene, cam, av: null, host: null, yaw: -.9, drag: null, raf: 0, t: 0, last: 0, spin: true };
  const el = renderer.domElement; el.style.touchAction = 'none'; el.style.display = 'block'; el.style.cursor = 'grab';
  el.addEventListener('pointerdown', e => { R.drag = e.clientX; R.spin = false; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (R.drag == null) return; R.yaw += (e.clientX - R.drag)*.012; R.drag = e.clientX; });
  const up = () => { R.drag = null; setTimeout(() => { if (R.drag == null) R.spin = true; }, 2500); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
function loop(now){
  if (!R.host) return;
  const dt = Math.min(.05, (now - (R.last || now))/1000); R.last = now; R.t += dt;
  if (R.spin) R.yaw += dt*.55;
  R.av.g.rotation.y = R.yaw;
  pose(R.av, { state: 'idle', t: R.t });
  const w = R.host.clientWidth, h = R.host.clientHeight;
  if (w && h){
    const c = R.renderer.domElement;
    if (c.width !== Math.round(w*R.renderer.getPixelRatio()) || c.height !== Math.round(h*R.renderer.getPixelRatio())){ R.renderer.setSize(w, h, false); c.style.width = w + 'px'; c.style.height = h + 'px'; R.cam.aspect = w/h; R.cam.updateProjectionMatrix(); }
    // tutta la figura in quadro, un po' di lato e dall'alto
    const dist = Math.max(6.4, .95/(Math.tan(R.cam.fov*Math.PI/360)*R.cam.aspect));   // entra tutta in altezza e in larghezza
    R.cam.position.set(0, 1.55, dist); R.cam.lookAt(0, 1.15, 0);
    R.renderer.render(R.scene, R.cam);
  }
  R.raf = requestAnimationFrame(loop);
}

// monta l'anteprima in un elemento e restituisce i comandi
export function mountPreview(host, look){
  if (!R) init();
  if (R.host && R.host !== host) cancelAnimationFrame(R.raf);
  if (R.av){ R.scene.remove(R.av.g); }
  R.av = makeAvatar(look); R.scene.add(R.av.g);
  R.host = host; host.appendChild(R.renderer.domElement); R.last = 0; R.spin = true;
  cancelAnimationFrame(R.raf); R.raf = requestAnimationFrame(loop);
  return {
    setLook(l){ if (R.av) R.av.setLook({ ...l }); },
    unmount(){ if (R.host === host){ cancelAnimationFrame(R.raf); R.host = null; if (R.renderer.domElement.parentNode === host) host.removeChild(R.renderer.domElement); } },
  };
}
