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

  // focus: { incoming: palla in arrivo verso di me, ballX: dove arriva } — durante lo scambio la telecamera si
  // avvicina dietro al mio giocatore e ruota verso il lato da cui arriva la palla, poi torna larga.
  update(dt, me, ball, focus = null) {
    const s = this.side;
    const f = this.frame(this.cam.aspect);
    this.t += dt;
    const wantX = THREE.MathUtils.clamp(me.pos.x * 0.6 + (ball ? ball.p[0] * 0.15 : 0), -3.2, 3.2);
    this.x += (wantX - this.x) * Math.min(1, dt * 3.2);
    // la telecamera segue anche la profondità del giocatore (quando arretra non esce dallo schermo)
    const depth = THREE.MathUtils.clamp(s * me.pos.z - 12.2, -4, 5);
    this.depth = (this.depth ?? depth) + (depth - (this.depth ?? depth)) * Math.min(1, dt * 2.5);
    const baseZ = s * (11.885 + f.back + this.depth * (this.depth > 0 ? 0.9 : 0.55));
    let px = this.x, py = f.h, pz = baseZ;
    let lx = this.x * 0.45, ly = f.lookY, lz = -s * Math.abs(f.lookZ);
    // ── avvicinamento durante lo scambio ──
    const wantK = this.mode === 'play' && focus?.incoming ? 1 : 0;
    this.k = (this.k ?? 0) + (wantK - (this.k ?? 0)) * Math.min(1, dt * (wantK ? 1.6 : 1.1));
    const wantYaw = focus?.incoming ? THREE.MathUtils.clamp((focus.ballX - me.pos.x) * s * -0.07, -0.42, 0.42) : 0;
    this.yaw = (this.yaw ?? 0) + (wantYaw - (this.yaw ?? 0)) * Math.min(1, dt * 1.8);
    if (this.k > 0.001) {
      const k = this.k * this.k * (3 - 2 * this.k);
      const back = new THREE.Vector3(Math.sin(this.yaw) * s, 0, Math.cos(this.yaw) * s); // dietro al giocatore, ruotato
      let cx = me.pos.x + back.x * 5.6, cz = me.pos.z + back.z * 5.6, cy = f.h * 0.62;
      // mai oltre il muro di fondo: se il giocatore è molto arretrato la telecamera si alza invece di uscire
      const over = s * cz - 18.0;
      if (over > 0) { cz -= s * over; cy += over * 0.9; }
      const fl = new THREE.Vector3(-back.x, 0, -back.z);
      const tx = me.pos.x + fl.x * 9 + (focus.ballX - me.pos.x) * 0.25, tz = me.pos.z + fl.z * 9;
      px += (cx - px) * k; py += (cy - py) * k; pz += (cz - pz) * k;
      lx += (tx - lx) * k; ly += (0.2 - ly) * k; lz += (tz - lz) * k;
    }
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
