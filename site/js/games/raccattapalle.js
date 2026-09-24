// Raccattapalle: su un campo esterno, raccogli tutte le palline prima che riprenda il gioco.
// Si usa lo stesso giocatore dell'esplorazione (frecce, corsa, salto), limitato al campo e ai suoi dintorni.
import * as THREE from 'three';
import { $, frame, clamp } from '../core/util.js';
import { pose } from '../entities/avatar.js';
import { hud } from '../ui/hud.js';

const N = 14, TIME = 40;

export function registerRaccattapalle(W){
  const L = W.layout, S = L.sites, hub = S.pietrangeli || S.centrale;
  const c = (L.courts || []).filter(k => Math.hypot(k.x - hub.x, k.z - hub.z) < 300).sort((a, b) => Math.hypot(a.x - hub.x, a.z - hub.z) - Math.hypot(b.x - hub.x, b.z - hub.z))[3]
    || (L.courts || [])[0];
  let F = c ? frame(c) : W.world.CF;
  W.venues.outer = { F, sport: 'tennis', y0: 0, exit: () => F.w(0, 21), label: 'Campi esterni' };
  const scene = W.engine.scene, group = new THREE.Group(); scene.add(group);
  const ballGeo = new THREE.SphereGeometry(.16, 12, 8), ballMat = new THREE.MeshLambertMaterial({ color: 0xd9f24a, emissive: 0x3a400e });
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(.45, .35, .7, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0x1f4fa3, side: THREE.DoubleSide }));
  basket.position.set(6, .35, 17); group.add(basket);
  let balls = [];
  const local = () => F.l(W.player.pos.x, W.player.pos.z);

  W.games.register({
    id: 'raccattapalle', title: 'Raccattapalle', place: 'Campi esterni', kind: 'activity', venue: 'outer', unit: 'Palline',
    bestKey: 'fiw.raccatta.best', goLabel: 'Via!', seedable: true,
    intro: `Sul campo sono rimaste ${N} palline e tra ${TIME} secondi riprende il gioco. Corri, raccoglile tutte e riportale nel cesto vicino alla rete.`,
    rules: [
      '<b>Muoviti</b> con le frecce o il joystick, <b>Shift</b> per correre, <b>Spazio</b> per saltare le palline alte.',
      'Passa sopra una pallina per raccoglierla: 10 punti. Ne porti al massimo 5 alla volta.',
      'Passa vicino al <b>cesto blu</b> per svuotare le mani: 5 punti in più per ogni pallina consegnata.',
      'Se finisci prima del tempo, ogni secondo rimasto vale 3 punti.',
    ],
    start(G){
      const V = W.venues[G.venue] || W.venues.outer; F = V.F; G.V = V;
      group.position.set(F.x, 0, F.z); group.rotation.y = F.rot;
      balls.forEach(b => group.remove(b.m)); balls = [];
      for (let i = 0; i < N; i++){
        const x = (G.rng()*2 - 1)*7, z = (G.rng()*2 - 1)*16, high = G.rng() < .25;
        const m = new THREE.Mesh(ballGeo, ballMat); m.castShadow = true; m.position.set(x, high ? 1.6 : .16, z); group.add(m);
        balls.push({ m, x, z, y: m.position.y, got: false });
      }
      G.left = TIME; G.hand = 0; G.picked = 0; G.delivered = 0;
      const [x, z] = F.w(0, 18.5); W.player.place(x, z, F.x, F.z);
      W.engine.setFocus(F.x, F.z);
      this.hudUpdate(G);
      hud.instr('Raccogli le palline e portale nel cesto', 'Frecce per correre, Spazio per saltare: raccogli e porta al cesto');
    },
    hudUpdate(G){ $('#gServe').textContent = `${G.picked}/${N}`; $('#gScore').textContent = G.score; },
    update(G, dt){
      W.player.update(dt);
      // resta nel campo e nei suoi dintorni
      const [lx, lz] = local(), cx = clamp(lx, -9.5, 9.5), cz = clamp(lz, -20, 20);
      if (cx !== lx || cz !== lz){ const [x, z] = F.w(cx, cz); W.player.pos.x = x; W.player.pos.z = z; }
      G.left -= dt;
      const py = W.player.pos.y;
      for (const b of balls){
        if (b.got) continue;
        b.m.rotation.y += dt*2;
        if (Math.hypot(b.x - cx, b.z - cz) < 1.1 && Math.abs(b.y - (py + .6)) < 1.1 && G.hand < 5){
          b.got = true; group.remove(b.m); G.hand++; G.picked++; G.score += 10; W.bus.emit('sfx', 'coin');
          this.hudUpdate(G); hud.flash('+10', G.hand >= 5 ? 'mani piene: vai al cesto' : `${G.picked} di ${N}`);
        }
      }
      if (G.hand > 0 && Math.hypot(cx - 6, cz - 17) < 1.8){
        G.score += G.hand*5; G.delivered += G.hand; hud.flash('Consegnate!', `+${G.hand*5}`); G.hand = 0; this.hudUpdate(G);
      }
      hud.instr(`Tempo: ${Math.max(0, Math.ceil(G.left))} s · in mano ${G.hand}/5`, `Tempo: ${Math.max(0, Math.ceil(G.left))} s · in mano ${G.hand}/5 · cesto blu vicino alla rete`);
      const done = G.delivered >= N;
      if (done || G.left <= 0){
        if (done){ G.score += Math.ceil(G.left)*3; W.progress.badge('raccattapalle'); }
        G.stat2 = G.delivered; this.hudUpdate(G); W.games.end();
      }
    },
    end(G, best){
      return { title: G.delivered >= N ? 'Campo pulito!' : G.delivered >= 9 ? 'Quasi tutte' : 'Il gioco è ripreso',
        stats: [{ v: G.score, label: 'Punti' }, { v: `${G.delivered}/${N}`, label: 'Consegnate' }, { v: best, label: 'Record' }], won: G.delivered >= N };
    },
    cleanup(G){ balls.forEach(b => group.remove(b.m)); balls = []; const [x, z] = G.V.exit(); W.player.place(x, z, F.x, F.z); },
  });
}
