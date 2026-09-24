// Navigatore: freccia sopra il giocatore (o la golf car) e indicazione in alto con la distanza, fino all'arrivo.
import * as THREE from 'three';
import { $, show, esc } from '../core/util.js';
import { hud } from '../ui/hud.js';

export function createNav(W){
  const scene = W.engine.scene;
  const arrow = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xf3c623, depthTest: false, transparent: true, opacity: .95 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.45, 1, 16), m); cone.rotation.x = Math.PI/2; cone.position.z = .6; arrow.add(cone);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(.24, .24, 1), m); shaft.position.z = -.3; arrow.add(shaft);
  arrow.renderOrder = 10; arrow.traverse(o => { o.renderOrder = 10; }); arrow.visible = false; arrow.userData.dynamic = true; scene.add(arrow);
  let target = null, lastHtml = '';
  const v = new THREE.Vector3();
  const api = {
    get target(){ return target; },
    set(t){ target = t; show('#nav', true); if (!t.route) hud.toast(`Navigatore: ${t.name}`); },
    clear(){ target = null; arrow.visible = false; show('#nav', false); },
    update(){
      if (!target || !(W.mode === 'explore' || W.mode === 'drive')){ arrow.visible = false; return; }
      const p = W.player.pos, dx = target.x - p.x, dz = target.z - p.z, d = Math.hypot(dx, dz);
      if (!target.keep && d < (W.mode === 'drive' ? 16 : 10)){ hud.toast(`Sei arrivato: ${target.name}`); api.clear(); return; }
      arrow.visible = !target.route;          // nel Percorso del Foro basta la traccia a terra arrow.position.set(p.x, p.y + (W.mode === 'drive' ? 3.4 : 3.1), p.z); arrow.rotation.y = Math.atan2(dx, dz);
      // freccia sullo schermo: 0 = avanti, positivo = a destra
      const cam = W.engine.camera; cam.updateMatrixWorld(); v.set(target.x, p.y, target.z).applyMatrix4(cam.matrixWorldInverse);
      const ang = Math.atan2(v.x, -v.z);
      $('#nav i').style.transform = `rotate(${ang}rad)`;
      const html = `<em>${esc(target.name)}</em><b>${Math.round(d/5)*5} m</b>`;   // il nome si accorcia, la distanza resta visibile
      if (html !== lastHtml){ lastHtml = html; $('#nav span').innerHTML = html; }
    },
  };
  $('#nav button').addEventListener('click', () => api.clear());
  return api;
}
