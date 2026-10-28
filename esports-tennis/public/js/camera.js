// Telecamera da gioco mobile: alta dietro il proprio giocatore, inquadra tutto il campo in verticale,
// segue il giocatore di lato con un ritardo morbido e guarda un po' verso la palla.
import * as THREE from 'three';

export class GameCamera {
  constructor(camera) {
    this.cam = camera;
    this.side = 1;
    this.x = 0;
    this.look = new THREE.Vector3();
    this.shake = 0;
    this.mode = 'play'; // 'play' | 'intro' | 'celebrate'
    this.t = 0;
  }

  setSide(side) { this.side = side; this.x = 0; }

  // Inquadratura: alta dietro la linea di fondo; il campo visivo verticale si adatta perché in verticale
  // la larghezza del campo del singolare stia tutta nello schermo.
  frame(aspect) {
    const hfov = aspect < 0.75 ? 44 : 40;
    const vfov = THREE.MathUtils.clamp((2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov / 2)) / aspect) * 180) / Math.PI, 34, 78);
    if (aspect < 0.75) return { h: 8.4, back: 7.4, fov: vfov, lookZ: -4.5, lookY: 0 };
    if (aspect < 1.2) return { h: 7.6, back: 7.0, fov: vfov, lookZ: -5.5, lookY: 0 };
    return { h: 6.4, back: 6.6, fov: 42, lookZ: -6.5, lookY: 0.4 };
  }

  update(dt, me, ball) {
    const s = this.side;
    const f = this.frame(this.cam.aspect);
    this.t += dt;
    const wantX = THREE.MathUtils.clamp(me.pos.x * 0.6 + (ball ? ball.p[0] * 0.15 : 0), -3.2, 3.2);
    this.x += (wantX - this.x) * Math.min(1, dt * 3.2);
    const baseZ = s * (11.885 + f.back + Math.max(0, s * me.pos.z - 12.5) * 0.4);
    let px = this.x, py = f.h, pz = baseZ;
    let lx = this.x * 0.45, ly = f.lookY, lz = -s * Math.abs(f.lookZ);
    if (this.mode === 'intro') {
      // giro iniziale attorno al campo
      const a = Math.min(1, this.t / 3.2);
      const e = 1 - Math.pow(1 - a, 3);
      const ang = (1 - e) * 1.4;
      px = Math.sin(ang) * (s * baseZ) * 1.15 + this.x * e;
      pz = Math.cos(ang) * baseZ * (1 + (1 - e) * 0.25);
      py = f.h + (1 - e) * 6;
      if (a >= 1) this.mode = 'play';
    } else if (this.mode === 'celebrate') {
      const a = Math.min(1, this.t / 1.5);
      px = me.pos.x + Math.sin(this.t * 0.4) * 3.5 * a + this.x * (1 - a);
      py = f.h - a * 4.2;
      pz = baseZ - s * a * 9;
      lx = me.pos.x; ly = 1.2 * a; lz = me.pos.z;
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      px += (Math.random() - 0.5) * this.shake * 0.25;
      py += (Math.random() - 0.5) * this.shake * 0.25;
    }
    this.cam.position.set(px, py, pz);
    this.look.set(lx, ly, lz);
    this.cam.lookAt(this.look);
    if (this.cam.fov !== f.fov) { this.cam.fov = f.fov; this.cam.updateProjectionMatrix(); }
  }

  startIntro() { this.mode = 'intro'; this.t = 0; }
  startCelebrate() { this.mode = 'celebrate'; this.t = 0; }
  play() { this.mode = 'play'; }
}
