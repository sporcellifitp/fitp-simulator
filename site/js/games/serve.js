// Sfida al servizio sul Campo Centrale: dieci battute, due tocchi (direzione e profondità). Coordinate locali del Centrale.
import * as THREE from 'three';
import { makeAvatar, placeOn, pose } from '../entities/avatar.js';
import { flat } from '../world/geom.js';
import { hud } from '../ui/hud.js';

export function registerServe(W){
  let CF = W.world.CF;
  const courtG = new THREE.Group(); W.engine.scene.add(courtG);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10), new THREE.MeshLambertMaterial({ color: 0xd9f24a, emissive: 0x39400e }));
  ball.castShadow = true; ball.visible = false; courtG.add(ball);
  // mirino: anello a terra più un'asta, così si vede anche a 25 metri
  const marker = new THREE.Group();
  {
    const yel = new THREE.MeshBasicMaterial({ color: 0xf3c623, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(.4, .62, 32), yel); ring.rotation.x = -Math.PI/2; marker.add(ring);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.6, 8), yel); pole.position.y = .8; marker.add(pole);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.28, .45, 12), yel); tip.position.y = 1.75; tip.rotation.x = Math.PI; marker.add(tip);
  }
  marker.visible = false; courtG.add(marker);
  const aceMat = new THREE.MeshBasicMaterial({ color: 0xf3c623, transparent: true, opacity: .62, depthWrite: false });
  const boxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16, depthWrite: false });
  const zones = [flat(4.115, 6.4, -4.115/2, .07, -3.2, boxMat, 0, courtG), flat(.7, 1.5, -.35, .08, -5.65, aceMat, 0, courtG), flat(.7, 1.5, -4.115 + .35, .08, -5.65, aceMat, 0, courtG)];
  for (const z of zones) z.visible = false;
  let rival = null;
  const hero = W.hero;

  W.games.register({
    id: 'serve', title: 'Sfida al servizio', place: 'Campo Centrale', kind: 'minigame', venue: 'centrale', unit: 'Servizio',
    bestKey: 'fiw.ace.best', goLabel: 'Al servizio', seedable: true,
    intro: "Dieci battute dal lato destro, in diagonale nel quadrato dell'avversario. Il primo tocco fissa la direzione, il secondo la profondità.",
    rules: [
      "<b>Ace, 3 punti.</b> La palla deve cadere in una zona gialla, sulla T o all'esterno, vicino alla linea del servizio.",
      "<b>Servizio dentro, 1 punto.</b> Più ace di fila valgono un bonus crescente.",
      "Ogni battuta il mirino corre un po' più veloce.",
    ],
    start(G){
      const V = W.venues[G.venue] || W.venues.centrale; CF = V.F; G.V = V;
      courtG.position.set(CF.x, 0, CF.z); courtG.rotation.y = CF.rot;
      G.rivalX = -2.2;
      if (!rival){ rival = makeAvatar({ shirt: 0xffffff, shorts: 0x2a2f3a, cap: 0xd8342c }); W.engine.scene.add(rival.g); }
      placeOn(hero, CF, .8, 12.1, Math.PI); placeOn(rival, CF, -2.2, -12.6, 0);
      pose(hero, { state: 'idle' }); pose(rival, { state: 'idle' });
      const [px, pz] = CF.w(1.8, 19.5), [lx, lz] = CF.w(-1.4, -3.5);
      W.engine.camera.position.set(px, 6.2, pz); W.engine.camera.lookAt(lx, 0, lz); W.engine.setFocus(CF.x, CF.z);
      for (const z of zones) z.visible = true;
      this.next(G);
    },
    next(G){
      if (G.n >= 10) return W.games.end();
      G.n++; G.phase = 'aim'; G.t = 0; G.speed = 2.2 + G.n*.3; G.flight = null; G.t0 = G.rng()*Math.PI*2;
      ball.visible = false; marker.visible = true; hero.armR.rotation.x = 0;
      G.rivalX = -2.2; placeOn(rival, CF, G.rivalX, -12.6, 0);
      document.querySelector('#gServe').textContent = G.n + '/10'; document.querySelector('#gScore').textContent = G.score;
      hud.instr('Tocca per fissare la direzione', 'Clic o Spazio per fissare la direzione');
    },
    tap(G){
      if (G.phase === 'aim'){ G.aimX = marker.position.x; G.phase = 'power'; G.t = 0; hud.instr('Tocca per fissare la profondità', 'Clic o Spazio per fissare la profondità'); }
      else if (G.phase === 'power'){ G.depthZ = marker.position.z; this.launch(G); }
    },
    launch(G){
      const S0 = new THREE.Vector3(.8, 2.9, 11.9), L = new THREE.Vector3(G.aimX, .13, G.depthZ);
      const uNet = S0.z/(S0.z - L.z), yAt = u => S0.y + (L.y - S0.y)*u + .35*Math.sin(Math.PI*Math.min(u, 1));
      let res;
      if (L.z >= -.05 || yAt(uNet) < .98) res = 'net';
      else if (L.x < -4.115 || L.x > 0) res = 'out';
      else if (L.z < -6.4) res = 'long';
      else if ((L.x > -.7 || L.x < -3.415) && L.z < -4.9) res = 'ace';
      else res = 'in';
      let E = L.clone();
      if (res === 'net'){ const u = Math.min(uNet, 1); E = new THREE.Vector3(S0.x + (L.x - S0.x)*u, .55, .1); }
      G.res = res; G.phase = 'flight'; G.t = 0; marker.visible = false;
      G.flight = { S: S0, E, dur: res === 'net' ? .42 : .5, stage: 1 };
      ball.visible = true; ball.position.copy(S0); hud.hideInstr();
      W.bus.emit('sfx', 'hit');
    },
    score(G){
      const r = G.res;
      if (r === 'ace'){ G.streak++; G.stat2++; const pts = 3 + (G.streak - 1); G.score += pts; hud.flash('ACE!', G.streak > 1 ? `${G.streak} di fila · +${pts}` : '+3'); W.bus.emit('crowd', 'cheer'); }
      else if (r === 'in'){ G.streak = 0; G.score += 1; hud.flash('Dentro', '+1'); }
      else { G.streak = 0; hud.flash(r === 'net' ? 'Rete' : r === 'long' ? 'Lungo' : 'Fuori'); }
      document.querySelector('#gScore').textContent = G.score;
    },
    update(G, dt){
      G.t += dt;
      if (G.phase === 'aim') marker.position.set(-2.2 + 3.1*Math.sin(G.t0 + G.t*G.speed), .1, -5.3);
      else if (G.phase === 'power') marker.position.set(G.aimX, .1, -3.95 + 4.35*Math.sin(G.t*G.speed*1.1 + Math.PI/2));
      else if (G.phase === 'flight'){
        const f = G.flight, u = Math.min(1, G.t/f.dur);
        hero.armR.rotation.x = G.t < .12 ? -2.9 : Math.max(-2.9, -2.9 + (G.t - .12)*9);
        if (f.stage === 1){
          ball.position.lerpVectors(f.S, f.E, u);
          ball.position.y = f.S.y + (f.E.y - f.S.y)*u + (G.res === 'net' ? .2 : .35)*Math.sin(Math.PI*u);
          if (u >= 1){
            this.score(G);
            const dir = new THREE.Vector3(f.E.x - f.S.x, 0, f.E.z - f.S.z).normalize();
            f.S2 = f.E.clone();
            f.E2 = G.res === 'net' ? new THREE.Vector3(f.E.x, .13, f.E.z + .6) : f.E.clone().addScaledVector(dir, 6.5).setY(.9);
            f.stage = 2; G.t = 0; f.dur = G.res === 'net' ? .35 : .45;
          }
        } else if (f.stage === 2){
          ball.position.lerpVectors(f.S2, f.E2, u); ball.position.y += (G.res === 'net' ? .2 : 1.1)*Math.sin(Math.PI*u);
          if (u >= 1){
            if (G.res === 'in'){ f.S3 = f.E2.clone(); f.E3 = new THREE.Vector3(-3 + G.rng()*6, .13, 13); f.stage = 3; G.t = 0; f.dur = .75; }
            else { f.stage = 4; G.t = 0; }
          }
        } else if (f.stage === 3){
          ball.position.lerpVectors(f.S3, f.E3, u); ball.position.y += 1.6*Math.sin(Math.PI*u);
          if (u >= 1){ f.stage = 4; G.t = 0; }
        } else if (f.stage === 4 && G.t > .55) this.next(G);
        const tx = G.res === 'in' ? f.E.x : G.res === 'ace' ? -2.2 + (f.E.x + 2.2)*.35 : -2.2;
        G.rivalX += (tx - G.rivalX)*Math.min(1, dt*(G.res === 'in' ? 6 : 3));
        placeOn(rival, CF, G.rivalX, -12.6, 0);
        pose(rival, { state: Math.abs(tx - G.rivalX) > .1 ? 'run' : 'idle', phase: W.engine.time*14, t: W.engine.time });
      }
    },
    end(G, best){
      return { title: G.score >= best && G.score > 0 ? 'Nuovo record' : G.stat2 >= 5 ? 'Servizio da Centrale' : G.stat2 >= 2 ? 'Bella serie' : 'Si può fare di meglio',
        stats: [{ v: G.score, label: 'Punti' }, { v: G.stat2, label: 'Ace' }, { v: best, label: 'Record' }], won: G.score > 0 };
    },
    cleanup(G){
      marker.visible = ball.visible = false; for (const z of zones) z.visible = false;
      if (rival){ W.engine.scene.remove(rival.g); rival = null; }
      hero.armR.rotation.x = 0;
      const [x, z] = (G.V || W.venues.centrale).exit();
      W.player.place(x, z, CF.x, CF.z);
    },
    exitPos(){ return CF.w(0, 16.5); },
  });
}
