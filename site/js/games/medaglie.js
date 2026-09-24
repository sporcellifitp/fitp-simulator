// Caccia alle medaglie: sei medaglie vicino alle statue dello Stadio dei Marmi. Missione data da Anna, salvata nei progressi.
import * as THREE from 'three';
import { hud } from '../ui/hud.js';

export function createMedals(W){
  const P = W.world.P, scene = W.engine.scene, PR = W.progress;
  const spots = [];
  if (P.marmi){
    const m = P.marmi;
    for (let i = 0; i < 6; i++){
      const t = (i + .5)/6*Math.PI*2 + .2;
      // un po' dentro l'anello, davanti alle statue
      const [x, z] = m.f.w(Math.cos(t)*(m.a - m.step*1.6), Math.sin(t)*(m.b - m.step*1.6));
      spots.push({ x, z });
    }
  }
  const geo = new THREE.CylinderGeometry(.42, .42, .08, 24), mat = new THREE.MeshLambertMaterial({ color: 0xf3c623, emissive: 0x5a4400 });
  const ribbon = new THREE.MeshLambertMaterial({ color: 0x1f4fa3 });
  const meshes = [];
  const data = () => PR.questData('medaglie');
  const found = () => data().found || [];
  function show(){
    for (const m of meshes) scene.remove(m); meshes.length = 0;
    if (PR.quest('medaglie') !== 'active') return;
    spots.forEach((s, i) => {
      if (found().includes(i)) return;
      const g = new THREE.Group(); g.userData.dynamic = true;
      const d = new THREE.Mesh(geo, mat); d.rotation.x = Math.PI/2; g.add(d);
      const r = new THREE.Mesh(new THREE.BoxGeometry(.18, .6, .04), ribbon); r.position.y = .45; g.add(r);
      g.position.set(s.x, W.world.groundH(s.x, s.z) + 1.3, s.z); g.userData.i = i; scene.add(g); meshes.push(g);
    });
  }
  const api = {
    count: () => found().length,
    start(){ if (PR.quest('medaglie') === 'none'){ PR.setQuest('medaglie', 'active', { found: [] }); hud.toast('Trova le sei medaglie tra le statue dei Marmi'); } show(); },
    finish(){ show(); },
    update(dt){
      if (!meshes.length) return;
      const p = W.player.pos, t = W.engine.time;
      for (const g of meshes){
        g.rotation.y = t*2 + g.userData.i; g.position.y += Math.sin(t*3 + g.userData.i)*.003;
        if (Math.hypot(p.x - g.position.x, p.z - g.position.z) < 1.8 && Math.abs(p.y + 1.3 - g.position.y) < 2.5){
          const f = found().concat([g.userData.i]);
          PR.setQuest('medaglie', 'active', { found: f });
          hud.flash('Medaglia!', `${f.length} di 6`); W.bus.emit('sfx', 'coin');
          if (f.length >= 6) hud.toast('Tutte trovate! Torna da Anna');
          show(); break;
        }
      }
    },
  };
  show();
  return api;
}
