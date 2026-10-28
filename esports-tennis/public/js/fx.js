// Effetti visivi di gioco: palla ben visibile (ingrandita con la distanza, contorno, alone, scia a nastro)
// e indicatori a terra (dove rimbalza la palla in arrivo, dove andrà il mio colpo, mira con traiettoria).
import * as THREE from 'three';

function ringTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const C = 128;
  x.clearRect(0, 0, 256, 256);
  if (kind === 'target') {
    // bersaglio: alone, anello bianco spesso, anello interno, punto centrale
    const g = x.createRadialGradient(C, C, 60, C, C, 126);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.lineWidth = 16; x.strokeStyle = 'rgba(255,255,255,1)';
    x.beginPath(); x.arc(C, C, 98, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 7; x.strokeStyle = 'rgba(255,255,255,0.85)';
    x.beginPath(); x.arc(C, C, 56, 0, Math.PI * 2); x.stroke();
    x.fillStyle = 'rgba(255,255,255,1)';
    x.beginPath(); x.arc(C, C, 18, 0, Math.PI * 2); x.fill();
  } else if (kind === 'ring') {
    x.lineWidth = 12; x.strokeStyle = 'rgba(255,255,255,1)';
    x.beginPath(); x.arc(C, C, 112, 0, Math.PI * 2); x.stroke();
  } else if (kind === 'cross') {
    // mirino per la mira
    x.lineWidth = 12; x.strokeStyle = 'rgba(255,255,255,1)';
    x.beginPath(); x.arc(C, C, 92, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 10;
    for (const [a, b, c2, d] of [[C, 6, C, 70], [C, 186, C, 250], [6, C, 70, C], [186, C, 250, C]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,1)';
    x.beginPath(); x.arc(C, C, 14, 0, Math.PI * 2); x.fill();
  } else if (kind === 'glow') {
    const g = x.createRadialGradient(C, C, 0, C, C, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function flat(tex, color, size, order = 5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = order;
  m.visible = false;
  return m;
}

// ── palla ─────────────────────────────────────────────────────────────────────
export class BallFx {
  constructor(scene, camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.core = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: '#e2f532', emissive: '#4a5600', roughness: 0.75 }));
    // contorno scuro (faccia interna di una sfera un po' più grande): stacca la palla dal campo azzurro
    this.outline = new THREE.Mesh(new THREE.SphereGeometry(1.12, 16, 12), new THREE.MeshBasicMaterial({ color: '#1d2200', side: THREE.BackSide, toneMapped: false }));
    // riga bianca della pallina
    const seam = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 6, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
    seam.rotation.x = 0.6;
    this.seam = seam;
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture('glow'), color: '#f2ff70', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.22 }));
    this.glow.scale.setScalar(2.6);
    this.group.add(this.glow, this.outline, this.core, seam);
    this.group.renderOrder = 6;
    // ombra a terra
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: '#0a0830', transparent: true, opacity: 0.5, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 4;
    // scia a nastro, rivolta verso la telecamera, che sfuma
    this.N = 18;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.N * 2 * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.N * 2 * 4), 4));
    const idx = [];
    for (let i = 0; i < this.N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.trail = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending }));
    this.trail.frustumCulled = false;
    this.trail.renderOrder = 5;
    this.pts = [];
    this.spinA = 0;
    scene.add(this.group, this.shadow, this.trail);
  }

  dispose(scene) { scene.remove(this.group, this.shadow, this.trail); }

  push(p) {
    this.pts.push(p.slice());
    if (this.pts.length > this.N) this.pts.shift();
  }
  clearTrail() { this.pts.length = 0; }

  update(ball, dt, showTrail) {
    const [x, y, z] = ball.p;
    const vis = y > -0.5;
    this.group.visible = this.shadow.visible = vis;
    if (!vis) { this.trail.visible = false; return; }
    // raggio visibile: poco più grande del vero da vicino, ingrandito con moderazione da lontano (~3 px di raggio)
    const d = this.camera.position.distanceTo(new THREE.Vector3(x, y, z));
    const r = Math.max(0.048, 0.0042 * d);
    this.group.position.set(x, Math.max(y, r * 0.9), z);
    this.group.scale.setScalar(r);
    this.spinA += dt * (8 + Math.hypot(...ball.v) * 0.6);
    this.seam.rotation.y = this.spinA;
    this.shadow.position.set(x, 0.012, z);
    const h = Math.max(0, y);
    this.shadow.scale.setScalar(r * (1.1 + h * 0.18));
    this.shadow.material.opacity = Math.max(0.18, 0.55 - h * 0.09);
    // scia
    const pts = showTrail ? this.pts : [];
    const pos = this.trail.geometry.attributes.position.array;
    const col = this.trail.geometry.attributes.color.array;
    const cam = this.camera.position;
    const n = pts.length;
    this.trail.visible = n > 2;
    for (let i = 0; i < this.N; i++) {
      const p = pts[Math.max(0, n - this.N + i)] || ball.p;
      const q = pts[Math.max(0, n - this.N + i - 1)] || p;
      const k = n ? i / (this.N - 1) : 0; // 0 = coda, 1 = palla
      const dir = new THREE.Vector3(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      const view = new THREE.Vector3(cam.x - p[0], cam.y - p[1], cam.z - p[2]);
      const side = dir.cross(view).normalize().multiplyScalar(r * 0.6 * k);
      for (const [j, sgn] of [[0, 1], [1, -1]]) {
        pos[(i * 2 + j) * 3] = p[0] + side.x * sgn;
        pos[(i * 2 + j) * 3 + 1] = p[1] + side.y * sgn;
        pos[(i * 2 + j) * 3 + 2] = p[2] + side.z * sgn;
        col[(i * 2 + j) * 4] = 1; col[(i * 2 + j) * 4 + 1] = 1; col[(i * 2 + j) * 4 + 2] = 0.55;
        col[(i * 2 + j) * 4 + 3] = k * k * 0.4;
      }
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.geometry.attributes.color.needsUpdate = true;
  }
}

// ── indicatori a terra ────────────────────────────────────────────────────────
export class Markers {
  constructor(scene) {
    this.scene = scene;
    const target = ringTexture('target'), ring = ringTexture('ring'), cross = ringTexture('cross');
    this.landing = flat(target, '#d8f23a', 1.0, 5);   // dove rimbalza la palla che arriva
    this.closing = flat(ring, '#ffffff', 1.0, 5);     // anello che si chiude fino al rimbalzo
    this.outgoing = flat(target, '#38e1ff', 0.8, 5);  // dove rimbalzerà il mio colpo
    this.aim = flat(cross, '#d8f23a', 1.1, 7);        // mira durante il gesto
    this.timing = flat(ring, '#ffffff', 1.0, 6);      // tempismo attorno al mio giocatore
    this.bounce = flat(ring, '#ffffff', 0.35, 5);     // segno del rimbalzo appena avvenuto
    this.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false }), 26);
    this.dots.renderOrder = 7;
    this.dots.visible = false;
    this.dots.frustumCulled = false;
    this.all = [this.landing, this.closing, this.outgoing, this.aim, this.timing, this.bounce, this.dots];
    scene.add(...this.all);
    this.t = 0;
  }

  dispose() { this.scene.remove(...this.all); }
  hideAll() { for (const m of this.all) m.visible = false; this.landingInfo = null; this.outInfo = null; this.timingInfo = null; }

  // Palla in arrivo verso di me: bersaglio sul punto di rimbalzo e anello che si chiude.
  showLanding(x, z, tBounce, now) {
    this.landing.position.set(x, 0.016, z);
    this.closing.position.set(x, 0.017, z);
    this.landingInfo = { t0: now, t1: tBounce };
    this.landing.visible = this.closing.visible = true;
  }
  hideLanding(fade = true) { if (this.landingInfo) this.landingInfo.fade = fade ? this.t : -1; else this.landing.visible = this.closing.visible = false; }

  showOutgoing(x, z, inside) {
    this.outgoing.position.set(x, 0.015, z);
    this.outgoing.material.color.set(inside ? '#38e1ff' : '#ff4f6a');
    this.outgoing.visible = true;
    this.outInfo = { t0: this.t };
  }
  hideOutgoing() { this.outgoing.visible = false; this.outInfo = null; }

  markBounce(x, z, inside) {
    this.bounce.position.set(x, 0.018, z);
    this.bounce.material.color.set(inside ? '#ffffff' : '#ff4f6a');
    this.bounce.visible = true;
    this.bounceT = this.t;
  }

  // Mira durante il gesto: mirino colorato per tipo di colpo e traiettoria a puntini.
  showAim(x, z, color, inside, path) {
    this.aim.position.set(x, 0.02, z);
    this.aim.material.color.set(inside ? color : '#ff4f6a');
    this.aim.visible = true;
    if (path && path.length) {
      const m = new THREE.Matrix4();
      const n = Math.min(26, path.length);
      for (let i = 0; i < 26; i++) {
        const p = path[Math.min(path.length - 1, Math.floor((i / 25) * (path.length - 1)))];
        m.makeTranslation(p[0], p[1], p[2]);
        this.dots.setMatrixAt(i, m);
      }
      this.dots.count = 26;
      this.dots.instanceMatrix.needsUpdate = true;
      this.dots.material.color.set(inside ? color : '#ff4f6a');
      this.dots.visible = n > 1;
    } else this.dots.visible = false;
  }
  hideAim() { this.aim.visible = false; this.dots.visible = false; }

  // Anello del tempismo attorno ai piedi: si stringe fino alla finestra "perfetto", poi diventa verde.
  showTiming(player, tContact) { this.timingInfo = { player, tContact }; }
  hideTiming() { this.timingInfo = null; this.timing.visible = false; }

  update(dt, now) {
    this.t += dt;
    const L = this.landingInfo;
    if (L) {
      const u = Math.min(1, Math.max(0, (now - L.t0) / Math.max(0.05, L.t1 - L.t0)));
      const pulse = 1 + Math.sin(this.t * 10) * 0.05;
      this.landing.scale.setScalar(0.85 * pulse);
      this.closing.scale.setScalar(0.85 + (1 - u) * 1.8);
      this.closing.material.opacity = 0.35 + u * 0.6;
      let a = 1;
      if (L.fade !== undefined) {
        a = L.fade < 0 ? 0 : Math.max(0, 1 - (this.t - L.fade) / 0.35);
        if (a <= 0) { this.landing.visible = this.closing.visible = false; this.landingInfo = null; }
      }
      this.landing.material.opacity = 0.95 * a;
      this.closing.material.opacity *= a;
    }
    if (this.outInfo) this.outgoing.material.opacity = 0.35 + 0.25 * Math.sin((this.t - this.outInfo.t0) * 8);
    if (this.bounce.visible) {
      const k = (this.t - this.bounceT) / 0.9;
      if (k >= 1) this.bounce.visible = false;
      else { this.bounce.scale.setScalar(1 + k * 1.6); this.bounce.material.opacity = 0.9 * (1 - k); }
    }
    const T = this.timingInfo;
    if (T) {
      const left = T.tContact - now; // secondi all'impatto
      const p = T.player.pos;
      this.timing.position.set(p.x, 0.02, p.z);
      this.timing.visible = left > -0.05 && left < 1.6;
      if (left > 0.55) {
        this.timing.scale.setScalar(1.2 + (left - 0.55) * 1.6);
        this.timing.material.color.set('#ffffff');
        this.timing.material.opacity = 0.75;
      } else if (left > 0.04) {
        this.timing.scale.setScalar(1.15 + Math.sin(this.t * 16) * 0.05);
        this.timing.material.color.set('#7dff6a');
        this.timing.material.opacity = 1;
      } else {
        this.timing.material.color.set('#ff9a2e');
      }
    }
  }
}
