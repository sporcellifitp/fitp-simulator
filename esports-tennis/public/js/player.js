// Tennista: modello con scheletro, racchetta, corsa e colpi animati in modo procedurale.
// I colpi sono pose chiave del braccio (posizione della mano, direzione del manico, piatto corde) nel sistema
// del giocatore; una cinematica inversa a due ossa porta la mano sulla traiettoria, così al momento
// dell'impatto la testa della racchetta è davvero sulla palla e la chiusura segue la direzione del colpo.
import * as THREE from 'three';
import * as SkeletonUtils from '../vendor/addons/utils/SkeletonUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
export const HEAD_DIST = 0.5; // distanza tra impugnatura e centro del piatto corde

// ── racchetta ────────────────────────────────────────────────────────────────
export function makeRacket(color = '#19b5c9') {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2 });
  const grip = new THREE.MeshStandardMaterial({ color: '#1d1d26', roughness: 0.8 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.016, 0.2, 8), grip);
  handle.position.y = 0.02;
  g.add(handle);
  // cuore della racchetta: due aste a V
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.2, 6), frame);
    arm.position.set(s * 0.045, 0.21, 0);
    arm.rotation.z = -s * 0.42;
    g.add(arm);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 36), frame);
  ring.scale.set(0.125, 0.16, 1);
  ring.position.y = HEAD_DIST;
  g.add(ring);
  // corde: disco semitrasparente con trama
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.strokeStyle = 'rgba(255,255,255,0.9)';
  x.lineWidth = 1;
  for (let i = 0; i <= 64; i += 6) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  const strings = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  strings.scale.set(0.118, 0.152, 1);
  strings.position.y = HEAD_DIST;
  g.add(strings);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ── IK a due ossa ────────────────────────────────────────────────────────────
const _a = V(0, 0, 0), _b = V(0, 0, 0), _c = V(0, 0, 0), _t = V(0, 0, 0), _e = V(0, 0, 0), _n = V(0, 0, 0);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const _d1 = V(0, 0, 0), _d2 = V(0, 0, 0);

function rotateBoneTowards(bone, from, to) {
  // ruota l'osso (in coordinate del mondo) in modo che la direzione `from` diventi `to`
  _q.setFromUnitVectors(from, to);
  bone.getWorldQuaternion(_q2);
  _q2.premultiply(_q);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}

export function solveTwoBone(upper, mid, end, target, pole) {
  upper.getWorldPosition(_a);
  mid.getWorldPosition(_b);
  end.getWorldPosition(_c);
  const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
  _t.copy(target);
  const d = Math.min(Math.max(_a.distanceTo(_t), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4);
  const dir = _d1.subVectors(_t, _a).normalize();
  _t.copy(_a).addScaledVector(dir, d);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  _n.subVectors(pole, _a);
  _n.addScaledVector(dir, -_n.dot(dir));
  if (_n.lengthSq() < 1e-8) _n.set(0, -1, 0);
  _n.normalize();
  _e.copy(_a).addScaledVector(dir, l1 * cosA).addScaledVector(_n, l1 * sinA);
  rotateBoneTowards(upper, _d2.subVectors(_b, _a).normalize(), V(0, 0, 0).subVectors(_e, _a).normalize());
  mid.getWorldPosition(_b);
  end.getWorldPosition(_c);
  rotateBoneTowards(mid, _d2.subVectors(_c, _b).normalize(), V(0, 0, 0).subVectors(_t, _b).normalize());
  return d;
}

// ── pose dei colpi (giocatore destro; x = destra, y = su, z = avanti verso la rete) ──
function n(x, y, z) { return V(x, y, z).normalize(); }
const READY = { hand: V(0.24, 0.98, 0.36), shaft: n(-0.25, 0.55, 0.8), face: n(1, 0, 0), twist: 0, crouch: 0.07, left: 'throat' };

// Ogni colpo: backswing, abbassamento, impatto (calcolato sulla palla), chiusura. `side`: 1 dritto, -1 rovescio.
function strokeKeys(kind, side, contact, aim, spinKind) {
  // aim: angolo (rad) della direzione del colpo; positivo verso la destra del giocatore
  const s = side;
  const ca = Math.cos(aim), sa = Math.sin(aim);
  const rotAim = (v) => V(v.x * ca + v.z * sa, v.y, -v.x * sa + v.z * ca);
  if (kind === 'serve' || kind === 'smash') {
    const shaftC = n(0.06, 0.97, 0.22);
    const keys = {
      back: { hand: V(0.45, 1.45, -0.35), shaft: n(0.1, 0.85, -0.5), face: n(1, 0, 0), twist: 1.05, crouch: 0.12, left: kind === 'serve' ? 'toss' : 'point' },
      drop: { hand: V(0.32, 1.55, -0.2), shaft: n(0.05, -0.85, -0.5), face: n(1, 0, 0), twist: 0.7, crouch: 0.18, left: 'tuck' },
      contact: { hand: contact.clone().addScaledVector(shaftC, -HEAD_DIST), shaft: shaftC, face: rotAim(n(0, 0.1, 1)), twist: -0.15, crouch: 0, lift: kind === 'serve' ? 0.14 : 0.2, left: 'tuck' },
      follow: { hand: rotAim(V(-0.3, 0.85, 0.35)), shaft: rotAim(n(-0.55, -0.6, 0.55)), face: n(0, -1, 0), twist: -0.75, crouch: 0.12, left: 'tuck' },
    };
    return { keys, swing: kind === 'serve' ? 0.26 : 0.22 };
  }
  if (kind === 'volley') {
    const shaftC = n(0.55 * s, 0.55, 0.62);
    return {
      keys: {
        back: { hand: V(0.55 * s, contact.y + 0.15, 0.05), shaft: n(0.45 * s, 0.75, -0.2), face: n(0, 0, 1), twist: 0.45 * s, crouch: 0.12, left: s > 0 ? 'balance' : 'throat' },
        drop: { hand: V(0.55 * s, contact.y + 0.1, 0.15), shaft: n(0.5 * s, 0.7, 0.1), face: n(0, 0, 1), twist: 0.35 * s, crouch: 0.14, left: s > 0 ? 'balance' : 'throat' },
        contact: { hand: contact.clone().addScaledVector(shaftC, -HEAD_DIST), shaft: shaftC, face: rotAim(n(0, 0.2, 1)), twist: 0.1 * s, crouch: 0.14, left: s > 0 ? 'balance' : 'throat' },
        follow: { hand: rotAim(V(0.35 * s, contact.y - 0.05, 0.7)), shaft: rotAim(n(0.5 * s, 0.5, 0.7)), face: n(0, 0.3, 1), twist: 0, crouch: 0.1, left: s > 0 ? 'balance' : 'throat' },
      },
      swing: 0.12,
    };
  }
  // colpi da fondo: dritto e rovescio bimane, con varianti topspin, slice e pallonetto
  const low = spinKind === 'slice' ? 0.35 : spinKind === 'lob' ? -0.35 : -0.3; // altezza della mano rispetto all'impatto prima di colpire
  const shaftC = n(0.92 * s, spinKind === 'slice' ? 0.25 : 0.08, 0.38);
  const face = spinKind === 'lob' ? n(0, 0.55, 1) : spinKind === 'slice' ? n(0, 0.35, 1) : n(0, -0.12, 1);
  const two = s < 0 ? 'grip' : 'balance';
  const follow = spinKind === 'slice'
    ? { hand: rotAim(V(-0.05 * s, contact.y - 0.15, 0.6)), shaft: rotAim(n(0.55 * s, 0.35, 0.75)), face: n(0, 1, 0.4), twist: -0.25 * s }
    : spinKind === 'lob'
      ? { hand: rotAim(V(-0.05 * s, 1.85, 0.35)), shaft: rotAim(n(-0.2 * s, 0.9, -0.2)), face: n(0, 0.4, 1), twist: -0.6 * s }
      : { hand: rotAim(V(-0.35 * s, 1.45, 0.18)), shaft: rotAim(n(-0.55 * s, 0.25, -0.8)), face: n(0, 0, -1), twist: -0.85 * s };
  return {
    keys: {
      back: { hand: V(0.58 * s, contact.y + (spinKind === 'slice' ? 0.45 : 0.15), -0.42), shaft: n(0.3 * s, 0.6, -0.75), face: n(0, 0, -1), twist: 1.0 * s, crouch: 0.12, left: s > 0 ? 'point' : 'grip' },
      drop: { hand: V(0.62 * s, contact.y + low, -0.22), shaft: n(0.55 * s, spinKind === 'slice' ? 0.6 : -0.35, -0.75), face: n(0, 0, -1), twist: 0.8 * s, crouch: 0.15, left: two },
      contact: { hand: contact.clone().addScaledVector(shaftC, -HEAD_DIST), shaft: shaftC, face: rotAim(face), twist: 0.05 * s, crouch: 0.13, left: two },
      follow: { ...follow, crouch: 0.08, left: two },
    },
    swing: spinKind === 'lob' ? 0.2 : 0.17,
  };
}

const ease = (t) => t * t * (3 - 2 * t);
const easeIn = (t) => t * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);

function lerpPose(a, b, t, out = {}) {
  out.hand = (out.hand || V(0, 0, 0)).lerpVectors(a.hand, b.hand, t);
  out.shaft = (out.shaft || V(0, 0, 0)).copy(slerpDir(a.shaft, b.shaft, t));
  out.face = (out.face || V(0, 0, 0)).copy(slerpDir(a.face, b.face, t));
  out.twist = a.twist + (b.twist - a.twist) * t;
  out.crouch = a.crouch + (b.crouch - a.crouch) * t;
  out.lift = (a.lift || 0) + ((b.lift || 0) - (a.lift || 0)) * t; // salto (servizio e smash)
  out.left = t < 0.5 ? a.left : b.left;
  return out;
}
function slerpDir(a, b, t) {
  const q = new THREE.Quaternion().setFromUnitVectors(a, b);
  return a.clone().applyQuaternion(new THREE.Quaternion().slerp(q, t)).normalize();
}

// ── giocatore ────────────────────────────────────────────────────────────────
export class Player {
  constructor(gltf, runClipJson, { color = '#19b5c9', side = 1 } = {}) {
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(gltf.scene);
    this.root.add(this.model);
    this.model.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
    });
    const bones = {};
    this.model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    this.b = bones;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.idleAction = this.mixer.clipAction(gltf.animations[0]);
    this.runAction = this.mixer.clipAction(THREE.AnimationClip.parse(runClipJson));
    this.idleAction.play();
    this.runAction.play();
    this.runAction.setEffectiveWeight(0);
    this.racket = makeRacket(color);
    this.side = side; // +1 metà vicina (z > 0), -1 metà lontana
    this.pos = V(0, 0, side * 12.6);
    this.vel = V(0, 0, 0);
    this.target = this.pos.clone();
    this.maxSpeed = 6.0;
    this.accel = 22;
    this.yaw = side > 0 ? Math.PI : 0;
    this.bodyYaw = this.yaw;
    this.stroke = null;
    this.pose = lerpPose(READY, READY, 0);
    this.lookAt = null;
    this.tossBall = null; // posizione della palla lanciata al servizio (per la mano sinistra)
    this.celebrate = 0;
    this._tmp = V(0, 0, 0);
  }

  get forward() { return V(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  get right() { const f = this.forward; return V(-f.z, 0, f.x); }

  toWorld(local, out = V(0, 0, 0)) {
    const f = this.forward, r = this.right;
    return out.copy(this.pos).addScaledVector(r, local.x).addScaledVector(UP, local.y).addScaledVector(f, local.z);
  }
  toLocal(world, out = V(0, 0, 0)) {
    const f = this.forward, r = this.right;
    const d = this._tmp.subVectors(world, this.pos);
    return out.set(d.dot(r), d.y, d.dot(f));
  }

  moveTo(x, z) { this.target.set(x, 0, z); }

  // Prepara un colpo: contact = posizione mondo della palla all'impatto, tContact = istante dell'impatto (s).
  prepare(kind, contactWorld, tContact, now, { aim = 0, spinKind = 'topspin', side = null } = {}) {
    const local = this.toLocal(contactWorld, V(0, 0, 0));
    const s = side ?? (local.x >= -0.05 ? 1 : -1);
    const def = strokeKeys(kind, s, local, aim, spinKind);
    this.stroke = { kind, side: s, keys: def.keys, swing: def.swing, tContact, start: now, from: lerpPose(this.pose, this.pose, 0, {}), contactWorld: contactWorld.clone(), spinKind };
    return s;
  }

  // Aggiorna l'impatto previsto (la palla arriva un po' prima o dopo, o in un altro punto).
  retarget(contactWorld, tContact) {
    if (!this.stroke) return;
    const local = this.toLocal(contactWorld, V(0, 0, 0));
    const k = this.stroke.keys.contact;
    k.hand.copy(local).addScaledVector(k.shaft, -HEAD_DIST);
    this.stroke.tContact = tContact;
    this.stroke.contactWorld.copy(contactWorld);
  }

  cancelStroke() { this.stroke = null; }

  // Posa del braccio al tempo `now`.
  strokePose(now) {
    const st = this.stroke;
    if (!st) return READY;
    const k = st.keys;
    const tSwing = st.tContact - st.swing;
    if (now < tSwing) {
      const u = Math.min(1, (now - st.start) / Math.max(0.12, Math.min(0.45, tSwing - st.start)));
      return lerpPose(st.from, k.back, ease(u), this.pose);
    }
    if (now < st.tContact) {
      const u = easeIn((now - tSwing) / st.swing);
      return u < 0.5 ? lerpPose(k.back, k.drop, u * 2, this.pose) : lerpPose(k.drop, k.contact, (u - 0.5) * 2, this.pose);
    }
    const after = now - st.tContact;
    if (after < 0.32) return lerpPose(k.contact, k.follow, easeOut(after / 0.32), this.pose);
    if (after < 0.8) return lerpPose(k.follow, READY, ease((after - 0.32) / 0.48), this.pose);
    this.stroke = null;
    return READY;
  }

  update(dt, now) {
    // ── spostamento ──
    const to = this._tmp.subVectors(this.target, this.pos);
    to.y = 0;
    const dist = to.length();
    const busy = this.stroke && now > this.stroke.tContact - this.stroke.swing - 0.05 && now < this.stroke.tContact + 0.25;
    const want = busy ? 0 : Math.min(this.maxSpeed, dist * 4.5);
    const desired = dist > 1e-4 ? to.multiplyScalar(want / dist) : to.set(0, 0, 0);
    const dv = desired.sub(this.vel);
    const maxDv = this.accel * dt;
    if (dv.length() > maxDv) dv.setLength(maxDv);
    this.vel.add(dv);
    this.pos.addScaledVector(this.vel, dt);
    const speed = this.vel.length();

    // ── orientamento: verso la rete; nelle corse lunghe si gira verso la direzione di corsa ──
    const facingNet = this.side > 0 ? Math.PI : 0;
    let goal = facingNet;
    if (speed > 3 && !this.stroke) {
      const runYaw = Math.atan2(this.vel.x, this.vel.z);
      const w = Math.min(1, (speed - 3) / 3) * 0.75;
      goal = facingNet + wrap(runYaw - facingNet) * w;
    }
    this.yaw = facingNet; // il sistema dei colpi resta allineato alla rete
    this.bodyYaw += wrap(goal - this.bodyYaw) * Math.min(1, dt * 10);

    // ── animazione di base (fermo / corsa) ──
    const runW = Math.min(1, speed / 2.5);
    this.runAction.setEffectiveWeight(runW);
    this.idleAction.setEffectiveWeight(1 - runW);
    this.runAction.timeScale = 0.6 + speed / 6;
    this.mixer.update(dt);

    const pose = this.celebrate > 0 ? this.celebratePose(now) : this.strokePose(now);
    this.root.position.copy(this.pos);
    this.root.position.y = pose.lift || 0;
    this.root.rotation.y = this.bodyYaw;
    this.root.updateMatrixWorld(true);
    this.applyPose(pose, speed);
  }

  celebratePose(now) {
    return { hand: V(0.3, 2.05, 0.15), shaft: n(0.1, 1, 0.1), face: n(0, 0, 1), twist: Math.sin(now * 6) * 0.15, crouch: 0, left: 'fist' };
  }

  applyPose(pose, speed) {
    const b = this.b;
    // accovacciata: abbasso il bacino e rimetto i piedi dov'erano con l'IK delle gambe
    const crouch = pose.crouch * (1 - Math.min(1, speed / 4) * 0.5);
    const footL = b.LeftFoot.getWorldPosition(V(0, 0, 0));
    const footR = b.RightFoot.getWorldPosition(V(0, 0, 0));
    if (crouch > 0.005) {
      b.Hips.position.y -= crouch / 0.01; // il bacino è in centimetri (armatura in scala 0.01)
      b.Hips.updateMatrixWorld(true);
      const kneeFwd = this.toWorld(V(0, 0.5, 1.2));
      solveTwoBone(b.LeftUpLeg, b.LeftLeg, b.LeftFoot, footL, kneeFwd.clone().add(this.right.multiplyScalar(-0.2)));
      solveTwoBone(b.RightUpLeg, b.RightLeg, b.RightFoot, footR, kneeFwd.clone().add(this.right.multiplyScalar(0.2)));
    }
    // rotazione del busto (spalle) attorno alla verticale, distribuita sulla colonna
    const twist = pose.twist + wrap(this.yaw - this.bodyYaw) * (this.stroke ? 1 : 0.6);
    const parts = [[b.Spine02, 0.34], [b.Spine01, 0.33], [b.Spine, 0.33]];
    for (const [bone, w] of parts) {
      bone.getWorldQuaternion(_q2);
      _q.setFromAxisAngle(UP, -twist * w);
      _q2.premultiply(_q);
      bone.parent.getWorldQuaternion(_pq);
      bone.quaternion.copy(_pq.invert().multiply(_q2));
      bone.updateMatrixWorld(true);
    }
    // braccio destro sulla traiettoria
    const handW = this.toWorld(pose.hand, V(0, 0, 0));
    const elbowPole = this.toWorld(V(pose.hand.x + 0.4, pose.hand.y - 0.6, pose.hand.z - 0.4));
    solveTwoBone(b.RightArm, b.RightForeArm, b.RightHand, handW, elbowPole);
    // la mano prosegue l'avambraccio
    b.RightForeArm.getWorldQuaternion(_q2);
    b.RightHand.parent.getWorldQuaternion(_pq);
    b.RightHand.quaternion.copy(_pq.invert().multiply(_q2));
    b.RightHand.updateMatrixWorld(true);
    const grip = b.RightHand.getWorldPosition(V(0, 0, 0));
    // racchetta: asse Y = manico, asse Z = piatto corde
    const shaftW = this.dirToWorld(pose.shaft);
    const faceW = this.dirToWorld(pose.face);
    faceW.addScaledVector(shaftW, -faceW.dot(shaftW));
    if (faceW.lengthSq() < 1e-6) faceW.copy(this.forward);
    faceW.normalize();
    const xAxis = V(0, 0, 0).crossVectors(shaftW, faceW).normalize();
    const m = new THREE.Matrix4().makeBasis(xAxis, shaftW, faceW);
    this.racket.quaternion.setFromRotationMatrix(m);
    this.racket.position.copy(grip).addScaledVector(shaftW, -0.04);
    // braccio sinistro
    let leftT = null;
    if (pose.left === 'throat' || pose.left === 'grip') {
      leftT = grip.clone().addScaledVector(shaftW, pose.left === 'grip' ? 0.09 : 0.3);
    } else if (pose.left === 'toss') {
      leftT = this.tossBall ? this.tossBall.clone() : this.toWorld(V(0.05, 1.9, 0.45));
    } else if (pose.left === 'point') {
      leftT = this.toWorld(V(-0.25, 1.35, 0.55));
    } else if (pose.left === 'balance') {
      leftT = this.toWorld(V(-0.45, 1.15, 0.35));
    } else if (pose.left === 'tuck') {
      leftT = this.toWorld(V(-0.15, 1.05, 0.15));
    } else if (pose.left === 'fist') {
      leftT = this.toWorld(V(-0.35, 1.2, 0.2));
    }
    if (leftT) solveTwoBone(b.LeftArm, b.LeftForeArm, b.LeftHand, leftT, this.toWorld(V(-0.7, 0.6, -0.3)));
    // testa verso la palla
    if (this.lookAt) {
      const head = b.Head;
      const hp = head.getWorldPosition(V(0, 0, 0));
      const want = V(0, 0, 0).subVectors(this.lookAt, hp).normalize();
      const cur = this.forward.clone();
      const qq = new THREE.Quaternion().setFromUnitVectors(cur, want);
      const lim = new THREE.Quaternion().slerp(qq, 0.55);
      head.getWorldQuaternion(_q2);
      _q2.premultiply(lim);
      head.parent.getWorldQuaternion(_pq);
      head.quaternion.copy(_pq.invert().multiply(_q2));
      head.updateMatrixWorld(true);
    }
  }

  dirToWorld(v) {
    const f = this.forward, r = this.right;
    return V(0, 0, 0).addScaledVector(r, v.x).addScaledVector(UP, v.y).addScaledVector(f, v.z).normalize();
  }

  // Centro del piatto corde in coordinate del mondo.
  racketHead(out = V(0, 0, 0)) {
    return out.set(0, HEAD_DIST, 0).applyQuaternion(this.racket.quaternion).add(this.racket.position);
  }

  setVisible(v) { this.root.visible = v; this.racket.visible = v; }
}

function wrap(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export async function loadPlayers(loader) {
  const [hero, rival, clips] = await Promise.all([
    loader.loadAsync('assets/models/hero.glb'),
    loader.loadAsync('assets/models/rival.glb'),
    fetch('assets/models/clips-run.json').then((r) => r.json()),
  ]);
  return { hero, rival, clips };
}
