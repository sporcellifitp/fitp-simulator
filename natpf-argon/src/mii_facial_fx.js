import * as o from "three";
export const FACIAL_STATES = Object.freeze({
  NEUTRAL: "neutral",
  BLINK: "blink",
  FOCUSED_SQUINT: "focused_squint",
  EFFORT_SHOUT: "effort_shout",
  WIDE_EYED_PANIC: "wide_eyed_panic",
  HAPPY_GRIN: "happy_grin",
  SHOCKED_LOSS: "shocked_loss",
});
const Se = new Set(Object.values(FACIAL_STATES));
function ne(d) {
  return (
    d &&
    ("colorSpace" in d && o.SRGBColorSpace
      ? (d.colorSpace = o.SRGBColorSpace)
      : "encoding" in d && o.sRGBEncoding && (d.encoding = o.sRGBEncoding),
    d)
  );
}
function ve() {
  const d = new o.Group(),
    t = new o.Color(5429503),
    r = new o.MeshStandardMaterial({
      color: t,
      emissive: new o.Color(1878248),
      emissiveIntensity: 0.42,
      roughness: 0.16,
      metalness: 0.05,
      transparent: !0,
      opacity: 0.96,
      depthWrite: !1,
    }),
    s = new o.SphereGeometry(0.036, 12, 10),
    e = new o.Mesh(s, r);
  e.position.set(0, -0.014, 0);
  const n = new o.ConeGeometry(0.035, 0.068, 12),
    p = new o.Mesh(n, r);
  p.position.set(0, 0.022, 0);
  const i = new o.MeshBasicMaterial({ color: 16777215, transparent: !0, opacity: 0.95, depthWrite: !1 }),
    l = new o.SphereGeometry(0.011, 8, 6),
    a = new o.Mesh(l, i);
  return (
    a.position.set(-0.012, -0.006, 0.028),
    d.add(e, p, a),
    (d.renderOrder = 9),
    { group: d, dropMat: r, specMat: i }
  );
}
function Ee() {
  const d = new o.Group(),
    t = new o.MeshBasicMaterial({ color: 16768811, transparent: !0, opacity: 1, depthWrite: !1 }),
    r = new o.MeshBasicMaterial({ color: 16775352, transparent: !0, opacity: 1, depthWrite: !1 }),
    s = new o.OctahedronGeometry(0.078, 0),
    e = new o.Mesh(s, t);
  e.scale.set(1.15, 1.15, 0.45);
  const n = new o.Mesh(s, t);
  n.scale.set(1.15, 1.15, 0.45), (n.rotation.z = Math.PI / 4);
  const p = new o.SphereGeometry(0.042, 8, 8),
    i = new o.Mesh(p, r);
  return d.add(e, n, i), (d.renderOrder = 10), { mesh: d, materials: [t, r] };
}
function Ge() {
  const d = new o.Group(),
    t = new o.MeshBasicMaterial({ color: 4780287, transparent: !0, opacity: 1, depthWrite: !1 }),
    r = new o.SphereGeometry(0.036, 10, 8),
    s = new o.Mesh(r, t);
  s.scale.set(1.25, 0.9, 0.6), s.position.set(-0.018, -0.035, 0), (s.rotation.z = 0.32);
  const e = new o.BoxGeometry(0.014, 0.095, 0.014),
    n = new o.Mesh(e, t);
  n.position.set(0.012, 0.012, 0);
  const p = new o.BoxGeometry(0.042, 0.018, 0.014),
    i = new o.Mesh(p, t);
  return (
    i.position.set(0.03, 0.048, 0),
    (i.rotation.z = -0.35),
    d.add(s, n, i),
    (d.renderOrder = 10),
    { mesh: d, materials: [t] }
  );
}
function Te() {
  const d = new o.Group(),
    t = new o.MeshBasicMaterial({ color: 16726824, transparent: !0, opacity: 1, depthWrite: !1 }),
    r = new o.MeshBasicMaterial({ color: 16773970, transparent: !0, opacity: 0.95, depthWrite: !1 });
  for (const s of [-0.028, 0.028]) {
    const e = new o.ConeGeometry(0.02, 0.095, 8),
      n = new o.Mesh(e, t);
    (n.rotation.z = Math.PI), n.position.set(s, 0.026, 0);
    const p = new o.ConeGeometry(0.026, 0.105, 8),
      i = new o.Mesh(p, r);
    (i.rotation.z = Math.PI), i.position.set(s, 0.026, -0.005);
    const l = new o.SphereGeometry(0.017, 8, 8),
      a = new o.Mesh(l, t);
    a.position.set(s, -0.045, 0), d.add(n, i, a);
  }
  return (d.renderOrder = 10), { mesh: d, materials: [t, r] };
}
function xe() {
  if (typeof document > "u" || !document.createElement) {
    const s = new Uint8Array(16384),
      e = new o.DataTexture(s, 64, 64, o.RGBAFormat);
    return ne(e), (e.needsUpdate = !0), { canvas: null, ctx: null, texture: e };
  }
  const d = document.createElement("canvas");
  (d.width = 512), (d.height = 512);
  const t = d.getContext("2d"),
    r = new o.CanvasTexture(d);
  return (
    ne(r), (r.minFilter = o.LinearFilter), (r.magFilter = o.LinearFilter), { canvas: d, ctx: t, texture: r }
  );
}
function _e(d, t, r, s = "#3b2314") {
  if (!d || !d.ctx) return;
  const { ctx: e, canvas: n, texture: p } = d,
    i = n.width,
    l = n.height;
  e.clearRect(0, 0, i, l);
  const a = r && t === FACIAL_STATES.NEUTRAL ? FACIAL_STATES.BLINK : t,
    h =
      a === FACIAL_STATES.HAPPY_GRIN
        ? 0.58
        : a === FACIAL_STATES.EFFORT_SHOUT
          ? 0.42
          : a === FACIAL_STATES.NEUTRAL || a === FACIAL_STATES.BLINK
            ? 0.25
            : 0.14;
  for (const m of [126, 386]) {
    const y = e.createRadialGradient(m, 304, 4, m, 304, 46);
    y.addColorStop(0, `rgba(255, 105, 120, ${h})`),
      y.addColorStop(0.65, `rgba(255, 120, 130, ${h * 0.45})`),
      y.addColorStop(1, "rgba(255, 120, 130, 0.0)"),
      (e.fillStyle = y),
      e.beginPath(),
      e.ellipse(m, 304, 46, 28, 0, 0, Math.PI * 2),
      e.fill();
  }
  if (((e.lineCap = "round"), (e.lineJoin = "round"), a === FACIAL_STATES.WIDE_EYED_PANIC)) {
    const m = e.createLinearGradient(0, 70, 0, 185);
    m.addColorStop(0, "rgba(55, 135, 235, 0.34)"),
      m.addColorStop(1, "rgba(55, 135, 235, 0.0)"),
      (e.fillStyle = m),
      e.fillRect(90, 70, 332, 115);
  } else
    a === FACIAL_STATES.FOCUSED_SQUINT &&
      ((e.strokeStyle = s),
      (e.lineWidth = 8),
      e.beginPath(),
      e.moveTo(232, 168),
      e.lineTo(244, 192),
      e.moveTo(280, 168),
      e.lineTo(268, 192),
      e.stroke());
  p.needsUpdate = !0;
}
export class MiiFacialFXController {
  constructor(t = null) {
    t && t.isObject3D
      ? ((this.scene = t), (this.options = {}))
      : t && typeof t == "object"
        ? ((this.scene = t.scene || null), (this.options = t))
        : ((this.scene = null), (this.options = {})),
      (this.actors = new Set()),
      (this.sweatDrops = []),
      (this.emoteParticles = []),
      (this.elapsedTime = 0),
      (this._lastPhase = null),
      this.scene && this._ensureParticlePools(this.scene);
  }
  _ensureParticlePools(t) {
    if (!(!t || this._poolsInitialized)) {
      (this.scene = t), (this._poolsInitialized = !0);
      for (let r = 0; r < 28; r++) {
        const { group: s, dropMat: e, specMat: n } = ve();
        (s.visible = !1),
          t.add(s),
          this.sweatDrops.push({
            mesh: s,
            dropMat: e,
            specMat: n,
            vel: new o.Vector3(),
            age: 0,
            maxAge: 0.62,
            active: !1,
          });
      }
      for (let r = 0; r < 18; r++) {
        const s = r < 8 ? "star" : r < 12 ? "note" : "exclamation",
          e = s === "star" ? Ee() : s === "note" ? Ge() : Te();
        (e.mesh.visible = !1),
          t.add(e.mesh),
          this.emoteParticles.push({
            kind: s,
            mesh: e.mesh,
            materials: e.materials,
            vel: new o.Vector3(),
            anchorActor: null,
            localOffset: new o.Vector3(),
            age: 0,
            maxAge: 0.95,
            spinSpeed: 0,
            active: !1,
          });
      }
    }
  }
  attachFacialRig(t, r = {}) {
    if (!t) return null;
    if (t.facialRig && t.facialRig.faceGroup) return this.actors.add(t), t.facialRig;
    const s = t.model || t.root;
    if (!s) return null;
    if (!this.scene) {
      let c = t.root || s;
      for (; c && c.parent; ) c = c.parent;
      c && c !== t.root && this._ensureParticlePools(c);
    }
    t.parts || (t.parts = {});
    let e = t.parts.head || null;
    s.traverse((c) => {
      const u = (c.name || "").trim();
      (/^head(\.?0*\d+)?$/i.test(u) && !c.isMesh) || (/^head(\.?0*\d+)?$/i.test(u) && !e)
        ? ((e = c), (t.parts.head = c))
        : /^torso(\.?0*\d+)?$/i.test(u) && !t.parts.torso
          ? (t.parts.torso = c)
          : /^hand_l(\.?0*\d+)?$/i.test(u) && !t.parts.handL
            ? (t.parts.handL = c)
            : /^hand_r(\.?0*\d+)?$/i.test(u) && !t.parts.handR
              ? (t.parts.handR = c)
              : /^foot_l(\.?0*\d+)?$/i.test(u) && !t.parts.footL
                ? (t.parts.footL = c)
                : /^foot_r(\.?0*\d+)?$/i.test(u) && !t.parts.footR && (t.parts.footR = c);
    }),
      e || ((e = new o.Group()), (e.name = "Head"), e.position.set(0, 1.22, 0), s.add(e), (t.parts.head = e));
    let n = e.position && Math.abs(e.position.y - 1.22) < 0.35 ? 0.18 : 1.4 - (e.position ? e.position.y : 0),
      p = t.sideSign < 0 || /opponent/i.test(t.role || "") ? 15579281 : 16238240,
      i = t.sideSign < 0 || /opponent/i.test(t.role || "") ? 1841175 : 5845274;
    e.traverse((c) => {
      if (!c.isMesh) return;
      const u = Array.isArray(c.material) ? c.material[0] : c.material,
        b = (u && u.name) || "",
        S = c.name || "";
      if (/Skin/i.test(b) && c.geometry) {
        c.geometry.computeBoundingBox();
        const w = c.geometry.boundingBox;
        w && (n = (w.min.y + w.max.y) * 0.5), u && u.color && (p = u.color.getHex());
      } else (/EyeDark|Mouth|Tongue/i.test(b) || /EyePupil|Smile|Mouth|Tongue/i.test(S)) && (c.visible = !1);
    }),
      e.traverse((c) => {
        if (!c.isMesh) return;
        const u = Array.isArray(c.material) ? c.material[0] : c.material,
          b = (u && u.name) || "";
        if (/Hair/i.test(b)) {
          if ((u && u.color && (i = u.color.getHex()), c.geometry && !c.userData.staticBrowsTucked)) {
            const S = c.geometry.clone(),
              w = S.attributes.position;
            if (w) {
              for (let g = 0; g < w.count; g++) {
                const _ = w.getX(g),
                  G = w.getY(g),
                  U = w.getZ(g);
                Math.abs(_) > 0.024 &&
                  Math.abs(_) < 0.156 &&
                  G > n + 0.018 &&
                  G < n + 0.092 &&
                  U > 0.172 &&
                  w.setXYZ(g, 0, n, 0);
              }
              w.needsUpdate = !0;
            }
            (c.geometry = S), (c.userData.staticBrowsTucked = !0);
          }
        } else if (/White/i.test(b) && c.geometry && !c.userData.staticEyesTucked) {
          const S = c.geometry.clone(),
            w = S.attributes.position;
          if (w) {
            for (let g = 0; g < w.count; g++) {
              const _ = w.getX(g),
                G = w.getY(g);
              w.getZ(g) > 0.195 && G < n + 0.066 && Math.abs(_) < 0.145 && w.setXYZ(g, 0, n, 0);
            }
            w.needsUpdate = !0;
          }
          (c.geometry = S), (c.userData.staticEyesTucked = !0);
        }
      });
    const l = new o.Group();
    (l.name = "MiiDynamicFaceGroup"), l.position.set(0, n, 0), e.add(l);
    const a = new o.MeshBasicMaterial({ color: 16777215 }),
      h = new o.MeshBasicMaterial({ color: 1184536 }),
      m = new o.MeshBasicMaterial({ color: 16777215 }),
      M = new o.MeshStandardMaterial({ color: i, roughness: 0.45, metalness: 0.05 }),
      y = new o.MeshStandardMaterial({ color: p, roughness: 0.48, metalness: 0 }),
      f = new o.MeshBasicMaterial({ color: 5378584 }),
      v = new o.MeshBasicMaterial({ color: 16739962 }),
      T = new o.MeshBasicMaterial({ color: 16739195, transparent: !0, opacity: 0.28, depthWrite: !1 }),
      x = (c) => {
        const u = new o.Group();
        (u.name = c < 0 ? "LeftEyeGroup" : "RightEyeGroup"), u.position.set(c * 0.08, 0.032, 0.218);
        const b = new o.Group(),
          S = new o.SphereGeometry(0.038, 18, 14),
          w = new o.Mesh(S, a);
        w.scale.set(1.06, 1.18, 0.42), b.add(w);
        const g = new o.Group();
        g.position.set(-c * 0.003, 0, 0.011);
        const _ = new o.SphereGeometry(0.026, 16, 12),
          G = new o.Mesh(_, h);
        G.scale.set(0.96, 1.12, 0.38), g.add(G);
        const U = new o.SphereGeometry(0.0095, 10, 8),
          q = new o.Mesh(U, m);
        q.position.set(-0.008, 0.011, 0.01), g.add(q);
        const Me = new o.SphereGeometry(0.005, 8, 6),
          J = new o.Mesh(Me, m);
        J.position.set(0.007, -0.009, 0.01), g.add(J), b.add(g);
        const ye = new o.SphereGeometry(0.04, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
          F = new o.Mesh(ye, y);
        F.scale.set(1.08, 1.18, 0.46), (F.visible = !1), b.add(F), u.add(b);
        const ge = new o.BoxGeometry(0.072, 0.012, 0.016),
          H = new o.Mesh(ge, h);
        H.position.set(0, 0, 0.012), (H.visible = !1), u.add(H);
        const C = new o.Group();
        C.position.set(0, -0.004, 0.014);
        const be = new o.TorusGeometry(0.03, 0.0075, 8, 18, Math.PI * 0.85),
          ee = new o.Mesh(be, h);
        (ee.rotation.z = Math.PI * 0.075), C.add(ee), (C.visible = !1), u.add(C);
        const N = new o.Group();
        N.position.set(0, 0.002, 0.014);
        const te = new o.BoxGeometry(0.068, 0.013, 0.014),
          se = new o.Mesh(te, h);
        se.rotation.z = 0.68;
        const oe = new o.Mesh(te, h);
        return (
          (oe.rotation.z = -0.68),
          N.add(se, oe),
          (N.visible = !1),
          u.add(N),
          l.add(u),
          {
            root: u,
            openEyeNode: b,
            scleraMesh: w,
            pupilGroup: g,
            pupilMesh: G,
            lidMesh: F,
            blinkBarMesh: H,
            happyArcGroup: C,
            shockXGroup: N,
          }
        );
      },
      P = x(-1),
      D = x(1),
      A = (c) => {
        const u = new o.Group();
        (u.name = c < 0 ? "LeftBrowPivot" : "RightBrowPivot"), u.position.set(c * 0.082, 0.092, 0.219);
        const b = new o.BoxGeometry(0.076, 0.018, 0.022),
          S = new o.Mesh(b, M);
        return u.add(S), l.add(u), u;
      },
      ie = A(-1),
      ae = A(1),
      E = new o.Group();
    (E.name = "MouthGroup"), E.position.set(0, -0.078, 0.233), l.add(E);
    const z = new o.Group(),
      re = new o.Mesh(new o.BoxGeometry(0.086, 0.024, 0.016), f),
      K = new o.Mesh(new o.BoxGeometry(0.074, 0.011, 0.018), a);
    K.position.set(0, 0.005, 0.002), z.add(re, K), E.add(z);
    const R = new o.Group(),
      le = new o.Mesh(new o.BoxGeometry(0.082, 0.02, 0.016), h),
      ce = new o.Mesh(new o.BoxGeometry(0.072, 0.012, 0.018), a);
    R.add(le, ce), (R.visible = !1), E.add(R);
    const B = new o.Group(),
      pe = new o.SphereGeometry(0.036, 16, 12),
      X = new o.Mesh(pe, f);
    X.scale.set(1.05, 1.18, 0.38);
    const he = new o.SphereGeometry(0.022, 12, 8),
      Y = new o.Mesh(he, v);
    Y.position.set(0, -0.012, 0.005), Y.scale.set(1.1, 0.65, 0.35), B.add(X, Y), (B.visible = !1), E.add(B);
    const O = new o.Group(),
      fe = new o.SphereGeometry(0.046, 20, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
      W = new o.Mesh(fe, f);
    W.position.set(0, 0.006, 0.002), W.scale.set(1.12, 0.88, 0.34);
    const j = new o.Mesh(new o.BoxGeometry(0.084, 0.012, 0.014), a);
    j.position.set(0, -0.002, 0.006);
    const V = new o.Mesh(new o.SphereGeometry(0.024, 12, 8), v);
    V.position.set(0, -0.022, 0.007),
      V.scale.set(1.25, 0.58, 0.32),
      O.add(W, j, V),
      (O.visible = !1),
      E.add(O);
    const I = new o.Group();
    for (let c = -1; c <= 1; c++) {
      const u = new o.Mesh(new o.BoxGeometry(0.034, 0.012, 0.02), h);
      u.position.set(c * 0.026, c === 0 ? 0.005 : -0.005, 0.002),
        (u.rotation.z = c === -1 ? 0.32 : c === 1 ? -0.32 : 0),
        I.add(u);
    }
    (I.visible = !1), E.add(I);
    const $ = (c) => {
        const u = new o.SphereGeometry(0.028, 12, 10),
          b = new o.Mesh(u, T);
        return (
          b.position.set(c * 0.128, -0.024, 0.196),
          b.scale.set(1.22, 0.78, 0.32),
          (b.renderOrder = 4),
          l.add(b),
          b
        );
      },
      ue = $(-1),
      de = $(1),
      Q = xe(),
      Z = new o.SphereGeometry(0.238, 24, 18, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.3, Math.PI * 0.42);
    Z.rotateY(-Math.PI * 0.5);
    const me = new o.MeshBasicMaterial({
        map: Q.texture,
        transparent: !0,
        alphaTest: 0.04,
        depthWrite: !1,
        polygonOffset: !0,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
      k = new o.Mesh(Z, me);
    k.scale.set(0.98, 1.04, 0.975), (k.renderOrder = 5), l.add(k);
    const we = "#" + new o.Color(i).getHexString(),
      L = {
        actor: t,
        headNode: e,
        faceGroup: l,
        skullY: n,
        browCssHex: we,
        leftEye: P,
        rightEye: D,
        leftBrow: ie,
        rightBrow: ae,
        mouthGroup: E,
        neutralMouth: z,
        squintMouth: R,
        openOMouth: B,
        grinMouth: O,
        wavyMouth: I,
        leftCheek: ue,
        rightCheek: de,
        cheekMat: T,
        conformalPatchMesh: k,
        faceCanvasObj: Q,
        state: FACIAL_STATES.NEUTRAL,
        stateTimer: 0,
        stateDuration: 0,
        blinkTimer: 2.6 + Math.random() * 1.6,
        blinkActiveTimer: 0,
        sweatCooldown: 0,
        panicEmoteCooldown: 0,
        lastSwingTimer: 0,
        gazeOffset: new o.Vector2(0, 0),
      };
    return (
      (t.facialRig = L),
      t.userData && (t.userData.facialRig = L),
      this.actors.add(t),
      this._applyStateVisuals(L),
      L
    );
  }
  attachToAllActors(t) {
    if (!t) return;
    const r = Array.isArray(t) ? t : Object.values(t);
    for (const s of r) s && this.attachFacialRig(s);
  }
  _resolveActor(t) {
    if (!t) return null;
    if (typeof t == "object") return !t.facialRig && (t.root || t.model) && this.attachFacialRig(t), t;
    const r = String(t).toLowerCase();
    for (const s of this.actors) if (String(s.role || "").toLowerCase() === r) return s;
    return null;
  }
  setExpression(t, r = FACIAL_STATES.NEUTRAL, s = 0.65) {
    const e = this._resolveActor(t);
    if (!e || !e.facialRig) return null;
    const n = e.facialRig,
      p = String(r || FACIAL_STATES.NEUTRAL)
        .toLowerCase()
        .trim(),
      i = Se.has(p) ? p : FACIAL_STATES.NEUTRAL,
      l = n.state;
    if (((n.state = i), i === FACIAL_STATES.NEUTRAL)) (n.stateTimer = 0), (n.stateDuration = 0);
    else if (i === FACIAL_STATES.BLINK)
      (n.blinkActiveTimer = typeof s == "number" && s > 0 ? s : 0.11), (n.state = FACIAL_STATES.NEUTRAL);
    else {
      const a =
          i === FACIAL_STATES.EFFORT_SHOUT
            ? 0.35
            : i === FACIAL_STATES.HAPPY_GRIN || i === FACIAL_STATES.SHOCKED_LOSS
              ? 1.65
              : 0.55,
        h = typeof s == "number" ? s : a;
      (n.stateDuration = h), (n.stateTimer = h);
    }
    return (
      i === FACIAL_STATES.WIDE_EYED_PANIC &&
        l !== FACIAL_STATES.WIDE_EYED_PANIC &&
        n.sweatCooldown <= 0 &&
        (this.spawnSweatDrops(e, 4), (n.sweatCooldown = 0.28)),
      this._applyStateVisuals(n),
      n.state
    );
  }
  getExpression(t) {
    return this._resolveActor(t)?.facialRig?.state || FACIAL_STATES.NEUTRAL;
  }
  _applyStateVisuals(t) {
    if (!t) return;
    const r = t.state,
      s = t.blinkActiveTimer > 0 && r === FACIAL_STATES.NEUTRAL,
      {
        leftEye: e,
        rightEye: n,
        leftBrow: p,
        rightBrow: i,
        neutralMouth: l,
        squintMouth: a,
        openOMouth: h,
        grinMouth: m,
        wavyMouth: M,
        cheekMat: y,
      } = t;
    for (const f of [e, n])
      (f.openEyeNode.visible = !1),
        (f.blinkBarMesh.visible = !1),
        (f.happyArcGroup.visible = !1),
        (f.shockXGroup.visible = !1),
        (f.lidMesh.visible = !1),
        f.openEyeNode.scale.set(1, 1, 1),
        f.pupilGroup.scale.set(1, 1, 1);
    if (
      ((l.visible = !1),
      (a.visible = !1),
      (h.visible = !1),
      (m.visible = !1),
      (M.visible = !1),
      r === FACIAL_STATES.FOCUSED_SQUINT)
    ) {
      p.position.set(-0.08, 0.082, 0.222),
        i.position.set(0.08, 0.082, 0.222),
        p.rotation.set(0, 0.12, -0.32),
        i.rotation.set(0, -0.12, 0.32);
      for (const f of [e, n])
        (f.openEyeNode.visible = !0), f.openEyeNode.scale.set(1.04, 0.52, 1), (f.lidMesh.visible = !0);
      (a.visible = !0), (y.opacity = 0.22);
    } else if (r === FACIAL_STATES.EFFORT_SHOUT) {
      p.position.set(-0.08, 0.088, 0.224),
        i.position.set(0.08, 0.088, 0.224),
        p.rotation.set(0, 0.14, -0.36),
        i.rotation.set(0, -0.14, 0.36);
      for (const f of [e, n])
        (f.openEyeNode.visible = !0),
          f.openEyeNode.scale.set(1.14, 1.18, 1.05),
          f.pupilGroup.scale.set(0.92, 0.92, 1);
      (h.visible = !0), h.scale.set(1.18, 1.25, 1), (y.opacity = 0.44);
    } else if (r === FACIAL_STATES.WIDE_EYED_PANIC) {
      p.position.set(-0.084, 0.108, 0.222),
        i.position.set(0.084, 0.108, 0.222),
        p.rotation.set(0, 0.1, 0.35),
        i.rotation.set(0, -0.1, -0.35);
      for (const f of [e, n])
        (f.openEyeNode.visible = !0),
          f.openEyeNode.scale.set(1.32, 1.38, 1.08),
          f.pupilGroup.scale.set(0.46, 0.46, 1);
      (h.visible = !0), h.scale.set(0.95, 1.32, 1), (y.opacity = 0.12);
    } else if (r === FACIAL_STATES.HAPPY_GRIN) {
      p.position.set(-0.084, 0.106, 0.22),
        i.position.set(0.084, 0.106, 0.22),
        p.rotation.set(0, 0.12, 0.18),
        i.rotation.set(0, -0.12, -0.18);
      for (const f of [e, n]) f.happyArcGroup.visible = !0;
      (m.visible = !0), (y.opacity = 0.62);
    } else if (r === FACIAL_STATES.SHOCKED_LOSS) {
      p.position.set(-0.084, 0.088, 0.22),
        i.position.set(0.084, 0.088, 0.22),
        p.rotation.set(0, 0.1, 0.38),
        i.rotation.set(0, -0.1, -0.38);
      for (const f of [e, n]) f.shockXGroup.visible = !0;
      (M.visible = !0), (y.opacity = 0.1);
    } else {
      p.position.set(-0.082, 0.094, 0.219),
        i.position.set(0.082, 0.094, 0.219),
        p.rotation.set(0, 0.12, 0.04),
        i.rotation.set(0, -0.12, -0.04);
      for (const f of [e, n])
        s
          ? (f.blinkBarMesh.visible = !0)
          : ((f.openEyeNode.visible = !0), f.openEyeNode.scale.set(1, 1, 1), f.pupilGroup.scale.set(1, 1, 1));
      (l.visible = !0), (y.opacity = 0.28);
    }
    _e(t.faceCanvasObj, r, s, t.browCssHex);
  }
  spawnSweatDrops(t, r = 4) {
    const s = this._resolveActor(t);
    if (!s) return 0;
    if (!this._poolsInitialized) {
      let a = s.root || s.model;
      for (; a && a.parent; ) a = a.parent;
      a && this._ensureParticlePools(a);
    }
    if (!this.sweatDrops.length) return 0;
    const e = s.root ? s.root.position : s.pos || new o.Vector3(),
      n = s.root ? s.root.rotation.y : 0,
      p = Math.cos(n),
      i = Math.sin(n);
    let l = 0;
    for (let a = 0; a < this.sweatDrops.length && l < r; a++) {
      const h = this.sweatDrops[a];
      if (h.active) continue;
      const m = l % 2 === 0 ? -1 : 1,
        M = m * (0.27 + Math.random() * 0.04),
        y = 1.5 + Math.random() * 0.08,
        f = 0.04 + (Math.random() - 0.5) * 0.08,
        v = e.x + M * p + f * i,
        T = e.y + y,
        x = e.z - M * i + f * p;
      (h.active = !0), (h.age = 0), (h.maxAge = 0.48 + Math.random() * 0.22), h.mesh.position.set(v, T, x);
      const P = 1.45 + Math.random() * 0.95,
        D = m * P,
        A = (Math.random() - 0.35) * 0.9;
      h.vel.set(D * p + A * i, 1.65 + Math.random() * 1.15, -D * i + A * p),
        h.mesh.scale.setScalar(0.95 + Math.random() * 0.35),
        (h.dropMat.opacity = 0.96),
        (h.specMat.opacity = 0.95),
        (h.mesh.visible = !0),
        l++;
    }
    return l;
  }
  triggerEmoteBurst(t, r = "win") {
    const s = this._resolveActor(t);
    if (!s) return 0;
    if (!this._poolsInitialized) {
      let i = s.root || s.model;
      for (; i && i.parent; ) i = i.parent;
      i && this._ensureParticlePools(i);
    }
    if (!this.emoteParticles.length) return 0;
    const e = String(r || "win")
        .toLowerCase()
        .trim(),
      n = /win|happy|point_won|nice|game|victory/.test(e),
      p = /panic|close_call|sweat|lob|shock|loss|fault|out/.test(e);
    if (n) {
      this.setExpression(s, FACIAL_STATES.HAPPY_GRIN, 1.75);
      let i = 0;
      const l = 5;
      for (const a of this.emoteParticles) {
        if (i >= l) break;
        if (a.active || (a.kind !== "star" && a.kind !== "note")) continue;
        const h = (i / l) * Math.PI * 2,
          m = 0.32;
        (a.active = !0),
          (a.age = 0),
          (a.maxAge = 1.05),
          (a.anchorActor = s),
          a.localOffset.set(Math.cos(h) * m, 1.96 + (i % 2) * 0.08, Math.sin(h) * m),
          a.vel.set(Math.cos(h) * 0.25, 0.55 + Math.random() * 0.25, Math.sin(h) * 0.25),
          (a.spinSpeed = (i % 2 === 0 ? 1 : -1) * 4.2);
        const M = s.root ? s.root.position : s.pos;
        a.mesh.position.copy(M).add(a.localOffset), a.mesh.scale.setScalar(0.01);
        for (const y of a.materials) y.opacity = 1;
        (a.mesh.visible = !0), i++;
      }
      return i;
    }
    if (p) {
      /loss|fault|out/.test(e)
        ? this.setExpression(s, FACIAL_STATES.SHOCKED_LOSS, 1.55)
        : this.setExpression(s, FACIAL_STATES.WIDE_EYED_PANIC, 0.75),
        this.spawnSweatDrops(s, 5);
      let i = 0;
      for (const l of this.emoteParticles) {
        if (i >= 2) break;
        if (l.active || l.kind !== "exclamation") continue;
        const a = i === 0 ? -1 : 1;
        (l.active = !0),
          (l.age = 0),
          (l.maxAge = 0.68),
          (l.anchorActor = s),
          l.localOffset.set(a * 0.34, 1.78, 0.08),
          l.vel.set(a * 0.35, 0.45, 0),
          (l.spinSpeed = 0);
        const h = s.root ? s.root.position : s.pos;
        l.mesh.position.copy(h).add(l.localOffset),
          l.mesh.rotation.set(0, 0, -a * 0.32),
          l.mesh.scale.setScalar(1.1);
        for (const m of l.materials) m.opacity = 1;
        (l.mesh.visible = !0), i++;
      }
      return i;
    }
    return 0;
  }
  update(t, r = {}, s = {}) {
    if (t && typeof t == "object") {
      const l = t,
        a = Number(r),
        h = Number.isFinite(a) ? Math.min(Math.max(a, 0), 0.1) : 0.016,
        m = s || {},
        M = m.phase || null;
      M &&
        M !== this._lastPhase &&
        (this._handlePhaseTransition(this._lastPhase, M, m), (this._lastPhase = M)),
        this.updateActor(l, h, m),
        (!l.role || l.role === "player") && ((this.elapsedTime += h), this._updateParticles(h));
      return;
    }
    const e = Number(t),
      n = Number.isFinite(e) ? Math.min(Math.max(e, 0), 0.1) : 0.016,
      p = r || {};
    this.elapsedTime += n;
    const i = p.phase || null;
    i && i !== this._lastPhase && (this._handlePhaseTransition(this._lastPhase, i, p), (this._lastPhase = i));
    for (const l of this.actors) this.updateActor(l, n, p);
    this._updateParticles(n);
  }
  updateParticles(t) {
    const r = Number(t),
      s = Number.isFinite(r) ? Math.min(Math.max(r, 0), 0.1) : 0.016;
    (this.elapsedTime += s), this._updateParticles(s);
  }
  _handlePhaseTransition(t, r, s) {
    if (r === "POINT_OVER" || r === "MATCH_OVER") {
      const e = s.ball?.lastHitter || "player",
        n = String(s.bannerText || s.lastBannerBroadcast?.subText || ""),
        i = /Out|Net|Fault/i.test(n) ? (e === "player" ? "opponent" : "player") : e;
      for (const l of this.actors) {
        const a = l.sideSign > 0 || /^player/i.test(l.role || "");
        (i === "player" && a) || (i === "opponent" && !a)
          ? (this.setExpression(l, FACIAL_STATES.HAPPY_GRIN, 1.85),
            (l.role === "player" || l.role === "opponent") && this.triggerEmoteBurst(l, "win"))
          : this.setExpression(l, FACIAL_STATES.SHOCKED_LOSS, 1.85);
      }
    } else if (r === "SERVE_STANCE")
      for (const e of this.actors) this.setExpression(e, FACIAL_STATES.NEUTRAL);
  }
  updateActor(t, r, s = {}) {
    if (!t) return;
    const e = t.facialRig || this.attachFacialRig(t);
    if (!e) return;
    (e.sweatCooldown = Math.max(0, e.sweatCooldown - r)),
      (e.panicEmoteCooldown = Math.max(0, e.panicEmoteCooldown - r));
    const n = s.ball || null,
      p = s.phase || "RALLY",
      i = s.server || s.score?.server || "player",
      l = Number(n?.rallyStrokeCount || s.rallyCount || 0),
      a = t.vel ? t.vel.length() : 0,
      h = t.swingTimer > 0 && (e.lastSwingTimer <= 0.01 || t.swingTimer > e.lastSwingTimer + 0.05);
    if (
      ((e.lastSwingTimer = t.swingTimer || 0),
      h || (t.swingTimer > 0.14 && e.state !== FACIAL_STATES.EFFORT_SHOUT))
    )
      this.setExpression(t, FACIAL_STATES.EFFORT_SHOUT, 0.35);
    else if (p === "SERVE_TOSS" && t.role === i && t.swingTimer <= 0)
      this.setExpression(t, FACIAL_STATES.FOCUSED_SQUINT, 0.25);
    else if (p === "RALLY" && n && n.inPlay && t.swingTimer <= 0) {
      const m = t.sideSign > 0,
        M = (m && n.vel && n.vel.z > 0.5) || (!m && n.vel && n.vel.z < -0.5),
        y = n.pos ? n.pos.x - t.pos.x : 0,
        f = n.pos ? n.pos.z - t.pos.z : 0,
        v = Math.hypot(y, f),
        T =
          M &&
          n.pos &&
          n.pos.y > 2.05 &&
          Math.abs(f) < 4.8 &&
          (String(n.shotType || "").toUpperCase() === "LOB" || n.pos.y > 2.35),
        x = a > 5.2 || (M && Math.abs(f) < 6.8 && v > 2.2),
        P = M && Math.abs(f) < 3.4 && v <= 2.2;
      T || x
        ? (e.state !== FACIAL_STATES.EFFORT_SHOUT &&
            e.state !== FACIAL_STATES.HAPPY_GRIN &&
            e.state !== FACIAL_STATES.SHOCKED_LOSS &&
            this.setExpression(t, FACIAL_STATES.WIDE_EYED_PANIC, 0.32),
          T &&
            e.panicEmoteCooldown <= 0 &&
            (this.triggerEmoteBurst(t, "close_call"), (e.panicEmoteCooldown = 1.6)))
        : P &&
          (e.state === FACIAL_STATES.NEUTRAL || e.state === FACIAL_STATES.FOCUSED_SQUINT) &&
          this.setExpression(t, FACIAL_STATES.FOCUSED_SQUINT, 0.22),
        (e.state === FACIAL_STATES.WIDE_EYED_PANIC || a > 5.2 || (l >= 4 && a > 1.8)) &&
          e.sweatCooldown <= 0 &&
          (this.spawnSweatDrops(t, a > 5.2 ? 3 : 2), (e.sweatCooldown = a > 5.2 ? 0.26 : 0.42));
    }
    if (
      (e.state !== FACIAL_STATES.NEUTRAL &&
        e.stateDuration > 0 &&
        ((e.stateTimer -= r),
        e.stateTimer <= 0 &&
          ((e.state = FACIAL_STATES.NEUTRAL),
          (e.stateTimer = 0),
          (e.stateDuration = 0),
          this._applyStateVisuals(e))),
      e.state === FACIAL_STATES.NEUTRAL &&
        (e.blinkActiveTimer > 0
          ? ((e.blinkActiveTimer -= r),
            e.blinkActiveTimer <= 0 &&
              ((e.blinkActiveTimer = 0),
              (e.blinkTimer = 2.6 + Math.random() * 1.6),
              this._applyStateVisuals(e)))
          : ((e.blinkTimer -= r),
            e.blinkTimer <= 0 && ((e.blinkActiveTimer = 0.11), this._applyStateVisuals(e)))),
      n && n.pos && t.pos)
    ) {
      const m = n.pos.x - t.pos.x,
        M = n.pos.y - (t.pos.y + 1.45),
        y = t.sideSign > 0 ? -m : m,
        f = o.MathUtils.clamp(y * 0.0018, -0.007, 0.007),
        v = o.MathUtils.clamp(M * 0.0022, -0.006, 0.006);
      (e.leftEye.pupilGroup.position.x = 0.003 + f),
        (e.leftEye.pupilGroup.position.y = v),
        (e.rightEye.pupilGroup.position.x = -0.003 + f),
        (e.rightEye.pupilGroup.position.y = v);
    }
  }
  _updateParticles(t) {
    for (const s of this.sweatDrops) {
      if (!s.active) continue;
      s.age += t;
      const e = s.age / s.maxAge;
      if (e >= 1) {
        (s.active = !1), (s.mesh.visible = !1);
        continue;
      }
      (s.vel.y -= 8.6 * t),
        s.mesh.position.addScaledVector(s.vel, t),
        (s.mesh.rotation.z = Math.atan2(-s.vel.x, Math.max(0.2, Math.abs(s.vel.y))) * 0.65);
      const n = e < 0.2 ? 0.5 + (e / 0.2) * 0.65 : 1.15 * (1 - (e - 0.2) * 0.55);
      s.mesh.scale.setScalar(Math.max(0.1, n));
      const p = e < 0.65 ? 0.96 : (1 - (e - 0.65) / 0.35) * 0.96;
      (s.dropMat.opacity = Math.max(0, p)), (s.specMat.opacity = Math.max(0, p));
    }
    for (const s of this.emoteParticles) {
      if (!s.active) continue;
      s.age += t;
      const e = s.age / s.maxAge;
      if (e >= 1) {
        (s.active = !1), (s.mesh.visible = !1);
        continue;
      }
      if (s.anchorActor) {
        const i = s.anchorActor.root ? s.anchorActor.root.position : s.anchorActor.pos;
        if (s.kind === "star" || s.kind === "note") {
          const l = Math.atan2(s.localOffset.z, s.localOffset.x) + t * 2.8,
            a = Math.hypot(s.localOffset.x, s.localOffset.z) * (1 + t * 0.25);
          (s.localOffset.x = Math.cos(l) * a),
            (s.localOffset.z = Math.sin(l) * a),
            (s.localOffset.y += s.vel.y * t),
            s.mesh.position.copy(i).add(s.localOffset),
            (s.mesh.rotation.y += s.spinSpeed * t);
        } else s.localOffset.addScaledVector(s.vel, t * 0.35), s.mesh.position.copy(i).add(s.localOffset);
      } else s.mesh.position.addScaledVector(s.vel, t);
      const n =
        e < 0.18
          ? (e / 0.18) * 1.25
          : e < 0.35
            ? 1.25 - ((e - 0.18) / 0.17) * 0.22
            : 1.03 * (1 - (e - 0.35) * 0.45);
      s.mesh.scale.setScalar(Math.max(0.05, n));
      const p = e < 0.7 ? 1 : 1 - (e - 0.7) / 0.3;
      for (const i of s.materials) i.opacity = Math.max(0, p);
    }
  }
}
export default MiiFacialFXController;
