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
// hand: impugnatura · shaft: direzione del manico · face: normale del piatto corde · twist: rotazione delle spalle
// (positiva = spalla destra indietro) · crouch: abbassamento del bacino · lean: busto in avanti · reach: busto
// inclinato di lato verso la palla · left: cosa fa la mano sinistra.
function n(x, y, z) { return V(x, y, z).normalize(); }
const READY = { hand: V(0.24, 1.0, 0.38), shaft: n(-0.25, 0.55, 0.8), face: n(1, 0, 0), twist: 0, crouch: 0.1, lean: 0.14, reach: 0, left: 'throat' };

// Appoggi dei piedi (x, z nel sistema del giocatore).
const STANCE = {
  ready: { L: V(-0.27, 0, 0.04), R: V(0.27, 0, 0.04) },
  walk: { L: V(-0.16, 0, 0.0), R: V(0.16, 0, 0.0) },
  forehand: { L: V(-0.3, 0, 0.32), R: V(0.3, 0, -0.18) }, // piede sinistro avanti verso la palla
  backhand: { L: V(-0.3, 0, -0.18), R: V(0.22, 0, 0.36) }, // piede destro avanti
  serve: { L: V(-0.05, 0, 0.26), R: V(0.32, 0, -0.16) },
  volleyF: { L: V(-0.2, 0, 0.38), R: V(0.3, 0, -0.02) },
  volleyB: { L: V(-0.3, 0, -0.02), R: V(0.16, 0, 0.4) },
};

// Ogni colpo: apertura, abbassamento, impatto (calcolato sulla palla), chiusura. `side`: 1 dritto, -1 rovescio.
// spinKind: topspin · flat (piatto) · slice (tagliato) · drop (palla corta) · lob (pallonetto)
function strokeKeys(kind, side, contact, aim, spinKind) {
  const s = side;
  const ca = Math.cos(aim), sa = Math.sin(aim);
  const rotAim = (v) => V(v.x * ca + v.z * sa, v.y, -v.x * sa + v.z * ca);
  // quanto il busto deve piegarsi di lato per arrivare alla palla
  const reach = THREE.MathUtils.clamp((Math.abs(contact.x) - 0.85) * 0.7, 0, 0.35) * s;
  const lowBall = THREE.MathUtils.clamp((0.9 - contact.y) * 0.35, 0, 0.18);
  if (kind === 'serve' || kind === 'smash') {
    const shaftC = n(0.06, 0.97, 0.22);
    const keys = {
      back: { hand: V(0.45, 1.45, -0.35), shaft: n(0.1, 0.85, -0.5), face: n(1, 0, 0), twist: 1.1, crouch: 0.16, lean: -0.12, reach: -0.1, left: kind === 'serve' ? 'toss' : 'point' },
      drop: { hand: V(0.3, 1.55, -0.22), shaft: n(0.05, -0.85, -0.5), face: n(1, 0, 0), twist: 0.75, crouch: 0.2, lean: -0.18, reach: -0.12, left: 'tuck' },
      contact: { hand: contact.clone().addScaledVector(shaftC, -HEAD_DIST), shaft: shaftC, face: rotAim(n(0, 0.1, 1)), twist: -0.15, crouch: 0, lift: kind === 'serve' ? 0.14 : 0.2, lean: 0.05, reach: 0, left: 'tuck' },
      follow: { hand: rotAim(V(-0.3, 0.85, 0.35)), shaft: rotAim(n(-0.55, -0.6, 0.55)), face: n(0, -1, 0), twist: -0.75, crouch: 0.16, lean: 0.35, reach: 0, left: 'tuck' },
    };
    return { keys, swing: kind === 'serve' ? 0.26 : 0.22, stance: 'serve' };
  }
  if (kind === 'volley') {
    const shaftC = n(0.55 * s, 0.55, 0.62);
    const left = s > 0 ? 'balance' : 'throat';
    const drop = spinKind === 'drop';
    return {
      keys: {
        back: { hand: V(0.55 * s, contact.y + 0.15, 0.05), shaft: n(0.45 * s, 0.75, -0.2), face: n(0, 0, 1), twist: 0.45 * s, crouch: 0.14 + lowBall, lean: 0.18, reach, left },
        drop: { hand: V(0.55 * s, contact.y + 0.1, 0.15), shaft: n(0.5 * s, 0.7, 0.1), face: n(0, 0.2, 1), twist: 0.35 * s, crouch: 0.16 + lowBall, lean: 0.2, reach, left },
        contact: { hand: contact.clone().addScaledVector(shaftC, -HEAD_DIST), shaft: shaftC, face: rotAim(drop ? n(0, 0.8, 1) : n(0, 0.25, 1)), twist: 0.1 * s, crouch: 0.16 + lowBall, lean: 0.22, reach, left },
        follow: { hand: rotAim(V(0.35 * s, contact.y - (drop ? 0.0 : 0.08), drop ? 0.5 : 0.7)), shaft: rotAim(n(0.5 * s, 0.5, 0.7)), face: n(0, 0.4, 1), twist: 0, crouch: 0.12, lean: 0.2, reach: reach * 0.5, left },
      },
      swing: drop ? 0.16 : 0.12,
      stance: s > 0 ? 'volleyF' : 'volleyB',
    };
  }
  // colpi da fondo
  const stance = s > 0 ? 'forehand' : 'backhand';
  const crouch = 0.13 + lowBall;
  if (spinKind === 'slice' || spinKind === 'drop') {
    // tagliato: dall'alto verso il basso con il piatto aperto; il rovescio tagliato è a una mano
    const drop = spinKind === 'drop';
    const shaftC = n(0.9 * s, 0.3, 0.32);
    const left = s > 0 ? 'balance' : 'release';
    return {
      keys: {
        back: { hand: V(0.5 * s, contact.y + (drop ? 0.32 : 0.48), drop ? -0.18 : -0.36), shaft: n(0.32 * s, 0.78, -0.5), face: n(0, 0.3, -1), twist: (drop ? 0.65 : 0.95) * s, crouch, lean: 0.12, reach, left: s > 0 ? 'point' : 'throat' },
        drop: { hand: V(0.6 * s, contact.y + (drop ? 0.18 : 0.25), drop ? -0.02 : -0.1), shaft: n(0.6 * s, 0.6, -0.4), face: n(0, 0.5, 0.6), twist: 0.55 * s, crouch, lean: 0.16, reach, left: s > 0 ? 'balance' : 'throat' },
        contact: { hand: contact.clone().addScaledVector(shaftC, -HEAD_DIST), shaft: shaftC, face: rotAim(drop ? n(0, 0.85, 1) : n(0, 0.45, 1)), twist: 0.15 * s, crouch, lean: 0.22, reach, left },
        follow: drop
          ? { hand: rotAim(V(0.3 * s, contact.y + 0.02, 0.48)), shaft: rotAim(n(0.55 * s, 0.6, 0.6)), face: n(0, 1, 0.3), twist: 0.05 * s, crouch, lean: 0.2, reach: reach * 0.5, left }
          : { hand: rotAim(V(0.1 * s, contact.y - 0.22, 0.72)), shaft: rotAim(n(0.55 * s, 0.45, 0.7)), face: n(0, 1, 0.35), twist: -0.15 * s, crouch, lean: 0.24, reach: reach * 0.5, left },
      },
      swing: drop ? 0.22 : 0.18,
      stance,
    };
  }
  const two = s < 0 ? 'grip' : 'balance';
  const low = spinKind === 'lob' ? -0.4 : spinKind === 'flat' ? -0.08 : -0.32; // mano sotto la palla prima di colpire
  const shaftC = spinKind === 'flat' ? n(0.95 * s, 0.04, 0.3) : n(0.92 * s, 0.08, 0.38);
  const face = spinKind === 'lob' ? n(0, 0.6, 1) : spinKind === 'flat' ? n(0, 0, 1) : n(0, -0.14, 1);
  const follow = spinKind === 'lob'
    ? { hand: rotAim(V(-0.05 * s, 1.9, 0.35)), shaft: rotAim(n(-0.2 * s, 0.9, -0.2)), face: n(0, 0.4, 1), twist: -0.6 * s }
    : spinKind === 'flat'
      ? { hand: rotAim(V(-0.25 * s, 1.25, 0.5)), shaft: rotAim(n(-0.65 * s, 0.1, -0.7)), face: n(0, 0, -1), twist: -0.95 * s }
      : { hand: rotAim(V(-0.35 * s, 1.5, 0.15)), shaft: rotAim(n(-0.5 * s, 0.35, -0.8)), face: n(0, 0, -1), twist: -0.9 * s };
  return {
    keys: {
      back: { hand: V(0.58 * s, contact.y + (spinKind === 'flat' ? 0.25 : 0.15), -0.45), shaft: n(0.3 * s, 0.6, -0.75), face: n(0, 0, -1), twist: 1.05 * s, crouch, lean: 0.1, reach: reach * 0.5, left: s > 0 ? 'point' : 'grip' },
      drop: { hand: V(0.62 * s, contact.y + low, -0.22), shaft: n(0.55 * s, -0.35, -0.75), face: n(0, 0, -1), twist: 0.8 * s, crouch: crouch + 0.02, lean: 0.14, reach, left: two },
      contact: { hand: contact.clone().addScaledVector(shaftC, -HEAD_DIST), shaft: shaftC, face: rotAim(face), twist: 0.05 * s, crouch, lean: 0.2, reach, left: two },
      follow: { ...follow, crouch: crouch - 0.04, lean: 0.12, reach: 0, left: two },
    },
    swing: spinKind === 'lob' ? 0.2 : spinKind === 'flat' ? 0.15 : 0.17,
    stance,
  };
}

const ease = (t) => t * t * (3 - 2 * t);
const easeIn = (t) => t * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);

// Spline di Catmull-Rom: la mano passa per le pose chiave senza spigoli.
function catmull(p0, p1, p2, p3, t, out) {
  const t2 = t * t, t3 = t2 * t;
  for (const k of ['x', 'y', 'z']) {
    out[k] = 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
  }
  return out;
}

function lerpPose(a, b, t, out = {}, hand = null) {
  out.hand = (out.hand || V(0, 0, 0));
  if (hand) out.hand.copy(hand); else out.hand.lerpVectors(a.hand, b.hand, t);
  out.shaft = (out.shaft || V(0, 0, 0)).copy(slerpDir(a.shaft, b.shaft, t));
  out.face = (out.face || V(0, 0, 0)).copy(slerpDir(a.face, b.face, t));
  for (const k of ['twist', 'crouch', 'lean', 'reach', 'lift']) out[k] = (a[k] || 0) + ((b[k] || 0) - (a[k] || 0)) * t;
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
    this.accel = 20;
    this.yaw = side > 0 ? Math.PI : 0;
    this.bodyYaw = this.yaw;
    this.stroke = null;
    this.pose = lerpPose(READY, READY, 0);
    this.lookAt = null;
    this.tossBall = null; // posizione della palla lanciata al servizio (per la mano sinistra)
    this.celebrate = 0;
    this.running = false;
    this.runW = 0;
    this.hopT = -9;
    this.stance = 'ready';
    this._tmp = V(0, 0, 0);
    // orientamento dei piedi rispetto al corpo, preso dalla posa di riposo
    this.mixer.update(0);
    this.model.updateMatrixWorld(true);
    const rootInv = new THREE.Quaternion();
    this.model.getWorldQuaternion(rootInv).invert();
    this.footRest = {};
    for (const f of ['LeftFoot', 'RightFoot']) this.footRest[f] = bones[f].getWorldQuaternion(new THREE.Quaternion()).premultiply(rootInv);
    this.ankleH = bones.LeftFoot.getWorldPosition(V(0, 0, 0)).y - this.model.getWorldPosition(V(0, 0, 0)).y;
    this.feet = null; // creati al primo aggiornamento, quando la posizione è nota
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

  // Saltello di preparazione (split step) quando l'avversario colpisce.
  splitStep(now) { if (!this.stroke && !this.running) this.hopT = now; }

  // Prepara un colpo: contact = posizione mondo della palla all'impatto, tContact = istante dell'impatto (s).
  prepare(kind, contactWorld, tContact, now, { aim = 0, spinKind = 'topspin', side = null } = {}) {
    const local = this.toLocal(contactWorld, V(0, 0, 0));
    const s = side ?? (local.x >= -0.05 ? 1 : -1);
    const def = strokeKeys(kind, s, local, aim, spinKind);
    this.stroke = { kind, side: s, keys: def.keys, swing: def.swing, stance: def.stance, tContact, start: now, from: lerpPose(this.pose, this.pose, 0, {}), contactWorld: contactWorld.clone(), spinKind };
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

  // Posa del braccio al tempo `now`: la mano segue una spline che passa per le pose chiave.
  strokePose(now) {
    const st = this.stroke;
    if (!st) return READY;
    const k = st.keys, F = st.from;
    const tSwing = st.tContact - st.swing;
    const h = V(0, 0, 0);
    if (now < tSwing) {
      const u = ease(Math.min(1, (now - st.start) / Math.max(0.12, Math.min(0.45, tSwing - st.start))));
      catmull(F.hand, F.hand, k.back.hand, k.drop.hand, u, h);
      return lerpPose(F, k.back, u, this.pose, h);
    }
    if (now < st.tContact) {
      // accelerazione continua fino all'impatto: la racchetta è più veloce quando colpisce
      const u = easeIn((now - tSwing) / st.swing);
      if (u < 0.5) {
        catmull(F.hand, k.back.hand, k.drop.hand, k.contact.hand, u * 2, h);
        return lerpPose(k.back, k.drop, u * 2, this.pose, h);
      }
      catmull(k.back.hand, k.drop.hand, k.contact.hand, k.follow.hand, (u - 0.5) * 2, h);
      return lerpPose(k.drop, k.contact, (u - 0.5) * 2, this.pose, h);
    }
    const after = now - st.tContact;
    if (after < 0.34) {
      const u = easeOut(after / 0.34);
      catmull(k.drop.hand, k.contact.hand, k.follow.hand, READY.hand, u, h);
      return lerpPose(k.contact, k.follow, u, this.pose, h);
    }
    if (after < 0.85) {
      const u = ease((after - 0.34) / 0.51);
      catmull(k.contact.hand, k.follow.hand, READY.hand, READY.hand, u, h);
      return lerpPose(k.follow, READY, u, this.pose, h);
    }
    this.stroke = null;
    return READY;
  }

  update(dt, now) {
    // ── spostamento: accelerazione e frenata morbide ──
    const to = this._tmp.subVectors(this.target, this.pos);
    to.y = 0;
    const dist = to.length();
    const st = this.stroke;
    const busy = st && now > st.tContact - st.swing - 0.05 && now < st.tContact + 0.25;
    const want = busy ? 0 : Math.min(this.maxSpeed, Math.sqrt(2 * 9 * dist) * 0.9, dist * 6);
    const desired = dist > 1e-4 ? to.multiplyScalar(want / dist) : to.set(0, 0, 0);
    const dv = desired.sub(this.vel);
    const maxDv = (busy ? 14 : this.accel) * dt;
    if (dv.length() > maxDv) dv.setLength(maxDv);
    this.vel.add(dv);
    this.pos.addScaledVector(this.vel, dt);
    const speed = this.vel.length();
    this.yaw = this.side > 0 ? Math.PI : 0; // il sistema dei colpi resta allineato alla rete

    // ── corsa vera solo per gli spostamenti lunghi; altrimenti passi laterali verso la rete ──
    if (!this.running && speed > 4.3 && dist > 1.6 && !st) this.running = true;
    else if (this.running && (speed < 2.6 || (st && now > st.tContact - st.swing - 0.25))) this.running = false;
    this.runW += ((this.running ? 1 : 0) - this.runW) * Math.min(1, dt * 9);
    let goal = this.yaw;
    if (this.running) goal = Math.atan2(this.vel.x, this.vel.z);
    this.bodyYaw += wrap(goal - this.bodyYaw) * Math.min(1, dt * (this.running ? 9 : 12));

    this.runAction.setEffectiveWeight(this.runW);
    this.idleAction.setEffectiveWeight(1 - this.runW);
    this.runAction.timeScale = 0.75 + speed / 7;
    this.mixer.update(dt);

    const pose = this.celebrate > 0 ? this.celebratePose(now) : this.strokePose(now);
    // saltello di preparazione
    const hop = now - this.hopT;
    const lift = (pose.lift || 0) + (hop >= 0 && hop < 0.3 ? Math.sin((hop / 0.3) * Math.PI) * 0.07 : 0);
    this.root.position.copy(this.pos);
    this.root.position.y = lift;
    this.root.rotation.y = this.bodyYaw;
    this.root.updateMatrixWorld(true);
    // appoggi: per il colpo il piede davanti va verso la palla
    this.stance = st && now > st.start - 0.05 && now < st.tContact + 0.45 ? st.stance : speed > 0.6 ? 'walk' : 'ready';
    this.applyPose(pose, speed, dt, now, lift);
  }

  celebratePose(now) {
    return { hand: V(0.3, 2.05, 0.15), shaft: n(0.1, 1, 0.1), face: n(0, 0, 1), twist: Math.sin(now * 6) * 0.15, crouch: 0, lean: -0.05, reach: 0, left: 'fist' };
  }

  // Passi: ogni piede resta piantato a terra finché non è troppo lontano dal suo appoggio, poi fa un passo
  // (uno alla volta, con un piccolo arco). Così i piedi non scivolano e i passi laterali sono veri passi.
  stepFeet(dt, speed, lifted) {
    const stance = STANCE[this.stance] || STANCE.ready;
    const lead = this.vel.clone().multiplyScalar(0.16);
    // dopo uno spostamento istantaneo (inizio del punto) gli appoggi ripartono da sotto il corpo
    if (this.feet && this.feet.L.plant.distanceTo(this.pos) > 2) this.feet = null;
    if (!this.feet) {
      this.feet = {};
      for (const k of ['L', 'R']) {
        const p = this.toWorld(stance[k]);
        this.feet[k] = { plant: p.clone(), from: p.clone(), to: p.clone(), t: 1, pos: p.clone() };
      }
    }
    const wantOf = (k) => this.toWorld(stance[k]).add(lead).setY(0);
    const stepping = (k) => this.feet[k].t < 1;
    const thr = speed > 0.3 ? 0.16 : 0.07;
    // il piede più lontano dal suo appoggio parte per primo, se l'altro è a terra
    const order = ['L', 'R'].sort((a, b) => wantOf(b).distanceTo(this.feet[b].plant) - wantOf(a).distanceTo(this.feet[a].plant));
    for (const k of order) {
      const f = this.feet[k];
      const other = this.feet[k === 'L' ? 'R' : 'L'];
      if (!stepping(k) && other.t >= 0.55) {
        const want = wantOf(k);
        if (want.distanceTo(f.plant) > thr) {
          f.from.copy(f.plant);
          f.to.copy(want).addScaledVector(this.vel, 0.1);
          f.dur = THREE.MathUtils.clamp(0.26 - speed * 0.02, 0.13, 0.24);
          f.h = 0.05 + Math.min(0.08, speed * 0.015);
          f.t = 0;
        }
      }
      if (stepping(k)) {
        f.t = Math.min(1, f.t + dt / f.dur);
        const e = ease(f.t);
        f.pos.lerpVectors(f.from, f.to, e);
        f.pos.y = Math.sin(f.t * Math.PI) * f.h;
        if (f.t >= 1) f.plant.copy(f.to);
      } else {
        f.pos.copy(f.plant);
        f.pos.y = 0;
      }
    }
    // durante un salto i piedi seguono il corpo
    if (lifted > 0.01) for (const k of ['L', 'R']) this.feet[k].pos.y = Math.max(this.feet[k].pos.y, lifted);
    // oscillazione del bacino con i passi
    const swing = Math.max(stepping('L') ? Math.sin(this.feet.L.t * Math.PI) : 0, stepping('R') ? Math.sin(this.feet.R.t * Math.PI) : 0);
    return swing;
  }

  applyPose(pose, speed, dt, now, lifted) {
    const b = this.b;
    const legsIK = this.runW < 0.5;
    if (!legsIK) {
      // in corsa le gambe sono quelle della clip: aggiorno gli appoggi per riprendere senza scatti
      this.feet = null;
    }
    const bob = legsIK ? this.stepFeet(dt, speed, lifted) : 0;
    // bacino: più basso nella posizione di attesa e durante i colpi, leggero su e giù con i passi
    const crouch = legsIK ? pose.crouch + bob * 0.025 : pose.crouch * 0.3;
    if (crouch > 0.003) {
      b.Hips.position.y -= crouch / 0.01; // il bacino è in centimetri (armatura in scala 0.01)
    }
    // rotazione: parte dalle anche, il resto lungo la colonna
    const twist = pose.twist + wrap(this.yaw - this.bodyYaw) * (this.stroke ? 1 : 0.6);
    const rot = (bone, axis, angle) => {
      bone.getWorldQuaternion(_q2);
      _q.setFromAxisAngle(axis, angle);
      _q2.premultiply(_q);
      bone.parent.getWorldQuaternion(_pq);
      bone.quaternion.copy(_pq.invert().multiply(_q2));
      bone.updateMatrixWorld(true);
    };
    b.Hips.updateMatrixWorld(true);
    if (legsIK) rot(b.Hips, UP, -twist * 0.4);
    for (const [bone, w] of [[b.Spine02, 0.25], [b.Spine01, 0.2], [b.Spine, 0.15]]) rot(bone, UP, -twist * (legsIK ? w : w * 1.6));
    // busto in avanti e piegato di lato verso la palla
    const right = this.right, fwd = this.forward;
    const lean = (pose.lean || 0) * (legsIK ? 1 : 0.3);
    // (una rotazione positiva attorno alla destra piega all'indietro, attorno all'avanti piega verso destra)
    if (Math.abs(lean) > 1e-3) { rot(b.Spine02, right, -lean * 0.6); rot(b.Spine01, right, -lean * 0.4); }
    const reach = pose.reach || 0;
    if (Math.abs(reach) > 1e-3) { rot(b.Spine02, fwd, reach * 0.6); rot(b.Spine01, fwd, reach * 0.4); }
    // gambe sugli appoggi
    if (legsIK) {
      const yawQ = new THREE.Quaternion().setFromAxisAngle(UP, this.yaw);
      for (const [k, up, mid, end, out] of [['L', b.LeftUpLeg, b.LeftLeg, b.LeftFoot, -1], ['R', b.RightUpLeg, b.RightLeg, b.RightFoot, 1]]) {
        const foot = this.feet[k].pos.clone();
        foot.y += this.ankleH; // la caviglia sta sopra la suola
        const knee = foot.clone().addScaledVector(fwd, 1.2).addScaledVector(right, out * 0.25).setY(0.6);
        solveTwoBone(up, mid, end, foot, knee);
        // piede parallelo al terreno e orientato verso la rete
        const wq = yawQ.clone().multiply(this.footRest[end.name]);
        end.parent.getWorldQuaternion(_pq);
        end.quaternion.copy(_pq.invert().multiply(wq));
        end.updateMatrixWorld(true);
      }
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
    // braccio sinistro (in corsa resta quello della clip, che oscilla)
    let leftT = null;
    if (this.runW > 0.5 && !this.stroke) leftT = null;
    else if (pose.left === 'throat' || pose.left === 'grip') {
      leftT = grip.clone().addScaledVector(shaftW, pose.left === 'grip' ? 0.09 : 0.3);
    } else if (pose.left === 'toss') {
      leftT = this.tossBall ? this.tossBall.clone() : this.toWorld(V(0.05, 1.9, 0.45));
    } else if (pose.left === 'point') {
      leftT = this.toWorld(V(-0.25, 1.35, 0.55));
    } else if (pose.left === 'balance') {
      leftT = this.toWorld(V(-0.45, 1.15, 0.35));
    } else if (pose.left === 'release') {
      leftT = this.toWorld(V(0.3, 1.15, -0.4)); // rovescio a una mano: il braccio sinistro va indietro per equilibrio
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
