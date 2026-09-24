// Il vetro (padel): la palla rimbalza nel nostro campo, colpisce la parete di fondo e torna indietro;
// va colpita quando il cerchio si chiude, dopo il vetro e prima del secondo rimbalzo. Coordinate locali del campo da padel.
import * as THREE from 'three';
import { clamp } from '../core/util.js';
import { makeAvatar, placeOn, pose } from '../entities/avatar.js';
import { hud } from '../ui/hud.js';

export function registerVetro(W){
  const PF = W.world.PF; if (!PF) return;
  const scene = W.engine.scene, hero = W.hero;
  const padelG = new THREE.Group(); padelG.position.set(PF.x, 0, PF.z); padelG.rotation.y = PF.rot; scene.add(padelG);
  const pball = new THREE.Mesh(new THREE.SphereGeometry(.12, 14, 10), new THREE.MeshLambertMaterial({ color: 0xe6f550, emissive: 0x3a400e }));
  pball.castShadow = true; pball.visible = false; padelG.add(pball);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf3c623, transparent: true, opacity: .9, side: THREE.DoubleSide, depthTest: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), ringMat); ring.renderOrder = 5; ring.visible = false; ring.userData.dynamic = true; scene.add(ring);
  const splash = new THREE.Mesh(new THREE.RingGeometry(.1, .3, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  splash.visible = false; padelG.add(splash);
  const Wv = new THREE.Vector3();
  const arc = (a, b, h, u, out) => { out.lerpVectors(a, b, u); out.y += 4*h*u*(1 - u); return out; };
  const PERFECT = .075, GOOD = .17;
  let rival = null;
  const moveHero = (G, tx, tz, k, dt) => {
    const [lx, lz] = PF.l(hero.g.position.x, hero.g.position.z), nx = lx + (tx - lx)*Math.min(1, dt*k), nz = lz + (tz - lz)*Math.min(1, dt*k);
    const moving = Math.hypot(tx - lx, tz - lz) > .15;
    placeOn(hero, PF, nx, nz, Math.PI);
    pose(hero, { state: moving ? 'run' : 'idle', phase: W.engine.time*15, t: W.engine.time, swing: G.swing || 0 });
  };

  W.games.register({
    id: 'vetro', title: 'Il vetro', place: 'Campo da padel', kind: 'minigame', venue: 'padel', unit: 'Palla',
    bestKey: 'fiw.vetro.best', goLabel: 'In campo', seedable: true,
    intro: "Nel padel la palla può toccare la parete di fondo dopo il rimbalzo ed essere giocata al ritorno. Qui è l'unico modo per rispondere: lascia passare la palla, aspetta che torni dal vetro e colpisci quando il cerchio si chiude.",
    rules: [
      '<b>Perfetto, 3 punti.</b> Colpisci quando il cerchio giallo si stringe sulla palla. Più perfetti di fila valgono un bonus.',
      '<b>Buono, 1 punto.</b> Un attimo prima o un attimo dopo.',
      'Se colpisci prima che la palla tocchi il vetro, o troppo tardi, il punto è perso.',
      'Dieci palle, sempre più veloci.',
    ],
    start(G){
      if (!rival){ rival = makeAvatar({ shirt: 0xf3c623, shorts: 0x0b2a5b, cap: 0x0b2a5b }); scene.add(rival.g); }
      placeOn(rival, PF, 0, -7.5, 0); placeOn(hero, PF, 0, 8, Math.PI);
      const [px, pz] = PF.w(0, 15.2), [lx, lz] = PF.w(0, -2);
      W.engine.camera.position.set(px, 4.4, pz); W.engine.camera.lookAt(lx, .6, lz); W.engine.setFocus(PF.x, PF.z);
      this.next(G);
    },
    next(G){
      if (G.n >= 10) return W.games.end();
      G.n++; const k = (G.n - 1)/9, R = (a, b) => a + G.rng()*(b - a);
      const A = new THREE.Vector3(R(-2.5, 2.5), 1.1, -7.3);
      const B = new THREE.Vector3(R(-3, 3), .12, R(6.1, 7.3));
      const gx = clamp(B.x + (B.x - A.x)*(9.85 - B.z)/(B.z - A.z), -4.4, 4.4);
      const Gl = new THREE.Vector3(gx, R(1, 1.6), 9.85);
      const I = new THREE.Vector3(clamp(gx*.9, -4.2, 4.2), .95, R(7.5, 8.3));
      const F = new THREE.Vector3(I.x, .12, I.z - 1.3), Rr = new THREE.Vector3(I.x*.8, .12, I.z - 4.5);
      // tratti della traiettoria: [da, a, altezza dell'arco, durata]
      G.segs = [[A, B, 1.35, .95 - .28*k], [B, Gl, .45, .3 - .06*k], [Gl, I, .3, R(.52, .6) - .2*k], [I, F, .08, .2], [F, Rr, .25, .7]];
      G.seg = 0; G.t = 0; G.phase = 'ball'; G.hx = I.x; G.swing = 0;
      pball.visible = true; pball.position.copy(A); ring.visible = false;
      rival.armR.rotation.x = -2.2;
      document.querySelector('#gServe').textContent = G.n + '/10'; document.querySelector('#gScore').textContent = G.score;
      hud.instr('Aspetta il vetro, poi tocca quando il cerchio si chiude', 'Aspetta il vetro, poi Spazio o clic quando il cerchio si chiude');
    },
    // quanto manca (negativo) o quanto è passato (positivo) dal momento ideale
    delta(G){ const d = G.segs[2][3]; return G.seg === 2 ? G.t - d : G.seg > 2 ? G.segs.slice(3, G.seg).reduce((s, x) => s + x[3], 0) + G.t : -Infinity; },
    tap(G){
      if (G.phase !== 'ball') return;
      if (G.seg < 2){ this.miss(G, 'Presto', 'aspetta che torni dal vetro'); return; }
      const d = this.delta(G), a = Math.abs(d);
      if (a <= PERFECT) this.hit(G, 'perfect'); else if (a <= GOOD) this.hit(G, 'good'); else this.miss(G, d < 0 ? 'Presto' : 'Tardi');
    },
    hit(G, kind){
      G.phase = 'return'; G.t = 0; G.swing = 1; ring.visible = false;
      const from = pball.position.clone(), to = kind === 'perfect' ? new THREE.Vector3(G.rng() < .5 ? -3.9 : 3.9, .12, -8.6) : new THREE.Vector3(-2.2 + G.rng()*4.4, .12, -5.5);
      G.ret = [from, to, 1.7, .72];
      if (kind === 'perfect'){ G.streak++; G.stat2++; const pts = 3 + (G.streak - 1); G.score += pts; hud.flash('Perfetto!', G.streak > 1 ? `${G.streak} di fila · +${pts}` : '+3'); }
      else { G.streak = 0; G.score += 1; hud.flash('Buono', '+1'); }
      document.querySelector('#gScore').textContent = G.score; hud.hideInstr();
      W.bus.emit('sfx', 'hit');
    },
    miss(G, big, small){ G.phase = 'missed'; G.streak = 0; ring.visible = false; hud.flash(big, small); hud.hideInstr(); },
    update(G, dt){
      G.t += dt; G.swing = Math.max(0, (G.swing || 0) - dt*3);
      if (G.phase === 'ball' || G.phase === 'missed'){
        let s = G.segs[G.seg];
        while (s && G.t >= s[3]){
          G.t -= s[3]; G.seg++;
          if (G.seg === 2){ splash.position.set(G.segs[1][1].x, G.segs[1][1].y, 9.8); splash.visible = true; splash.material.opacity = .9; }
          s = G.segs[G.seg];
        }
        if (!s){ if (G.phase === 'ball') this.miss(G, 'Persa'); G.phase = 'pause'; G.t = 0; }
        else arc(s[0], s[1], s[2], G.t/s[3], pball.position);
        if (G.phase === 'ball' && G.seg >= 2){
          const d = this.delta(G), sc = clamp(.28 - d*2.6, .22, 2.2);
          pball.getWorldPosition(Wv); ring.position.copy(Wv); ring.quaternion.copy(W.engine.camera.quaternion); ring.scale.setScalar(sc);
          ringMat.color.set(Math.abs(d) <= PERFECT ? 0x39d353 : Math.abs(d) <= GOOD ? 0xf3c623 : 0xffffff);
          ring.visible = true;
        } else ring.visible = false;
        moveHero(G, G.hx - .5, G.segs[2][1].z + .35, 5, dt);
        rival.armR.rotation.x = Math.min(0, rival.armR.rotation.x + dt*6);
      } else if (G.phase === 'return'){
        const [a, b, h, d] = G.ret, u = Math.min(1, G.t/d);
        arc(a, b, h, u, pball.position);
        moveHero(G, G.hx - .5, G.segs[2][1].z + .35, 5, dt);
        const [rx] = PF.l(rival.g.position.x, rival.g.position.z);
        placeOn(rival, PF, rx + (b.x*.6 - rx)*Math.min(1, dt*3), -7.5, 0);
        if (u >= 1){ G.phase = 'pause'; G.t = 0; }
      } else if (G.phase === 'pause'){
        moveHero(G, G.hx - .5, G.segs[2][1].z + .35, 5, dt);
        if (G.t > .55){ pball.visible = false; this.next(G); }
      }
      if (splash.visible){ splash.material.opacity = Math.max(0, splash.material.opacity - dt*2.2); splash.scale.setScalar(1 + (1 - splash.material.opacity)*2); if (splash.material.opacity <= 0) splash.visible = false; }
    },
    end(G, best){
      return { title: G.score >= best && G.score > 0 ? 'Nuovo record' : G.stat2 >= 5 ? 'Mano da Major' : G.stat2 >= 2 ? 'Bel controllo' : 'Si può fare di meglio',
        stats: [{ v: G.score, label: 'Punti' }, { v: G.stat2, label: 'Perfetti' }, { v: best, label: 'Record' }], won: G.score > 0 };
    },
    cleanup(){
      pball.visible = ring.visible = splash.visible = false;
      if (rival){ scene.remove(rival.g); rival = null; }
      const [x, z] = PF.w(7, 0); W.player.place(x, z, PF.x, PF.z);
    },
  });
}
