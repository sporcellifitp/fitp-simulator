// Cartelli di direzione: pali con frecce verso le mete principali e la distanza in metri.
import * as THREE from 'three';
import { frame } from '../core/util.js';
import { isFree, addRect, colliders } from './collision.js';
import { canvasPlane } from './canvas.js';
import { segRot, box } from './geom.js';

const COLORS = { village: '#c8643b', museo: '#0b2a5b', uscita: '#5b6678' };
function arrowBoard(text, dist, color, right){
  // freccia a destra (lato che punta verso la meta) oppure a sinistra, per il retro del cartello
  return canvasPlane(640, 110, 2.9, .5, (x, w, h) => {
    x.fillStyle = color; x.beginPath();
    if (right){ x.moveTo(0, 0); x.lineTo(w - 70, 0); x.lineTo(w, h/2); x.lineTo(w - 70, h); x.lineTo(0, h); }
    else { x.moveTo(w, 0); x.lineTo(70, 0); x.lineTo(0, h/2); x.lineTo(70, h); x.lineTo(w, h); }
    x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 50px "Barlow Condensed", Arial Narrow, sans-serif'; x.textBaseline = 'middle';
    let label = text; while (x.measureText(label + '  ' + dist).width > w - 110 && label.length > 6) label = label.slice(0, -2) + '…';
    x.textAlign = right ? 'left' : 'right'; x.fillText(label, right ? 22 : w - 22, h/2 + 3);
    x.font = '38px Barlow, Arial, sans-serif'; x.textAlign = right ? 'right' : 'left'; x.fillText(dist, right ? w - 80 : 80, h/2 + 3);
  });
}

export function buildSigns(W, dests, posts){
  const scene = W.engine.scene, built = [];
  for (const post of posts){
    let [x, z] = post.at;
    if (!isFree(x, z, .8)) [x, z] = W.pois.safeSpot(x, z, null);
    const list = dests.filter(d => d.id !== post.id && Math.hypot(d.x - x, d.z - z) > 45)
      .sort((a, b) => (a.prio - b.prio) || (Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))).slice(0, 4);
    if (!list.length) continue;
    const pole = new THREE.Mesh(new THREE.BoxGeometry(.16, 3.6, .16), new THREE.MeshLambertMaterial({ color: 0x2a2f3a }));
    pole.position.set(x, 1.8, z); pole.castShadow = true; scene.add(pole);
    addRect(colliders, x, z, .2, .2);
    list.forEach((d, i) => {
      const rot = segRot(x, z, d.x, d.z), dist = Math.max(10, Math.round(Math.hypot(d.x - x, d.z - z)/10)*10) + ' m';
      const color = COLORS[d.kind] || '#1f4fa3', y = 3.3 - i*.62, F = frame({ x, z, rot });
      const [px, pz] = F.w(1.5, 0);
      const a = arrowBoard(d.name, dist, color, true); a.position.set(px, y, pz); a.rotation.y = rot; scene.add(a);
      const b = arrowBoard(d.name, dist, color, false); b.position.set(px, y, pz); b.rotation.y = rot + Math.PI; scene.add(b);
    });
    built.push({ x, z, list });
  }
  return built;
}
