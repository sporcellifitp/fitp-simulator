// Il giocatore nel mondo: movimento relativo alla telecamera, corsa, salto con gravità, collisioni, telecamera in terza persona.
import { clamp, angleTo } from '../core/util.js';
import { collide, isFree } from '../world/collision.js';
import { pose } from './avatar.js';

const WALK = 12, RUN = 28, JUMP_V = 7.5, GRAV = 22;   // il Foro reale è largo quasi 2 km: si va svelti

export function createPlayer(W, av){
  const { camera } = W.engine, input = W.input, groundH = W.world.groundH;
  const p = av.g.position;
  const cam = { yaw: 0, pitch: .38, dist: 10 };
  const st = { vy: 0, onGround: true, walkPh: 0, amt: 0, state: 'idle', emote: 0, swing: 0 };
  const player = {
    av, cam, st, active: false,
    get pos(){ return p; },
    update(dt){
      if (!this.active) return;
      const L = input.look();
      cam.yaw -= L.dx*.006; cam.pitch = clamp(cam.pitch + L.dy*.004, .12, 1.1); cam.dist = clamp(cam.dist + L.zoom, 5, 24);
      const mv = input.move(), run = input.running(), amt = Math.min(1, Math.hypot(mv.x, mv.y));
      const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw), speed = run ? RUN : WALK;
      const vx = (mv.x*cy - mv.y*sy)*speed, vz = (-mv.x*sy - mv.y*cy)*speed;
      if (amt > .05){
        const steps = Math.max(1, Math.ceil(Math.hypot(vx, vz)*dt/.5));
        for (let k = 0; k < steps; k++){ p.x += vx*dt/steps; p.z += vz*dt/steps; collide(p); }
        av.g.rotation.y += angleTo(av.g.rotation.y, Math.atan2(vx, vz))*Math.min(1, dt*12);
        st.walkPh += dt*(run ? 17 : 11);
        st.emote = 0;
      }
      // salto e gravità
      const gy = groundH(p.x, p.z);
      if (input.pressed('jump') && st.onGround){ st.vy = JUMP_V; st.onGround = false; W.bus.emit('player:jump'); }
      if (!st.onGround){
        st.vy -= GRAV*dt; p.y += st.vy*dt;
        if (p.y <= gy){ p.y = gy; st.vy = 0; st.onGround = true; W.bus.emit('player:land'); }
      } else p.y += (gy - p.y)*Math.min(1, dt*14);
      if (input.pressed('emote')) st.emote = 2.5;
      st.emote = Math.max(0, st.emote - dt);
      st.amt += (amt - st.amt)*Math.min(1, dt*10);
      st.state = !st.onGround ? 'jump' : amt > .05 ? (run ? 'run' : 'walk') : st.emote > 0 ? 'cheer' : 'idle';
      pose(av, { state: st.state, phase: st.walkPh, amt: st.amt, t: W.engine.time });
      this.follow(dt);
      W.engine.setFocus(p.x, p.z);
    },
    follow(dt, snap = false){
      const d = cam.dist, h = Math.sin(cam.pitch)*d, back = Math.cos(cam.pitch)*d;
      const tx = p.x + Math.sin(cam.yaw)*back, ty = p.y + 1.6 + h, tz = p.z + Math.cos(cam.yaw)*back;
      if (snap) camera.position.set(tx, ty, tz);
      else { const k = Math.min(1, dt*8); camera.position.x += (tx - camera.position.x)*k; camera.position.y += (ty - camera.position.y)*k; camera.position.z += (tz - camera.position.z)*k; }
      camera.lookAt(p.x, p.y + 1.7, p.z);
    },
    // sposta il giocatore (teletrasporto, uscita da un gioco) guardando verso un punto
    place(x, z, lookX = null, lookZ = null){
      p.set(x, groundH(x, z), z); st.vy = 0; st.onGround = true;
      if (lookX != null) av.g.rotation.y = Math.atan2(lookX - x, lookZ - z);
      cam.yaw = av.g.rotation.y + Math.PI;
      pose(av, { state: 'idle', t: 0 });
      this.follow(0, true);
      W.engine.setFocus(x, z);
    },
    isFreeAt: (x, z) => isFree(x, z, .7),
  };
  return player;
}
