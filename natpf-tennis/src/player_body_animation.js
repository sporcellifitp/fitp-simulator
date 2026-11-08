import * as i from "three";
export const MII_RIG_PIVOTS = Object.freeze({
  HIP: new i.Vector3(0, 0.56, 0),
  NECK_WORLD: new i.Vector3(0, 1.18, 0),
  NECK_RELATIVE_TO_HIP: new i.Vector3(0, 1.18 - 0.56, 0),
  FOOT_L: new i.Vector3(-0.105, 0.08, 0.01),
  FOOT_R: new i.Vector3(0.105, 0.08, 0.01),
  HAND_L: new i.Vector3(-0.33, 0.8, 0.1),
  HAND_R: new i.Vector3(0.33, 0.82, 0.14),
});
const O = Object.freeze({
    TORSO_STIFFNESS: 140,
    TORSO_DAMPING: 11,
    SPINE_TWIST_STIFFNESS: 165,
    SPINE_TWIST_DAMPING: 11.8,
    HEAD_BOUNCE_STIFFNESS: 245,
    HEAD_BOUNCE_DAMPING: 9.2,
    SQUASH_STIFFNESS: 210,
    SQUASH_DAMPING: 13.5,
    MAX_SUBSTEP_DT: 1 / 120,
  }),
  C = new i.Vector3(),
  pe = new i.Vector3(),
  me = new i.Vector3(),
  se = new i.Quaternion(),
  ae = new i.Euler();
function re(t) {
  return !t || !t.model
    ? {}
    : ((t.parts = t.parts || {}),
      t.model.traverse((o) => {
        if (o === t.model) return;
        const s = (o.name || "").trim();
        !s ||
          /^PlayerRig_/i.test(s) ||
          (o.userData.basePos || (o.userData.basePos = o.position.clone()),
          o.userData.baseRot || (o.userData.baseRot = o.rotation.clone()),
          /^head(\.?0*\d+)?$/i.test(s) && (!t.parts.head || !o.isMesh)
            ? (t.parts.head = o)
            : /^torso(\.?0*\d+)?$/i.test(s) && (!t.parts.torso || !o.isMesh)
              ? (t.parts.torso = o)
              : /^hand_l(\.?0*\d+)?$/i.test(s) && (!t.parts.handL || !o.isMesh)
                ? (t.parts.handL = o)
                : /^hand_r(\.?0*\d+)?$/i.test(s) && (!t.parts.handR || !o.isMesh)
                  ? (t.parts.handR = o)
                  : /^foot_l(\.?0*\d+)?$/i.test(s) && (!t.parts.footL || !o.isMesh)
                    ? (t.parts.footL = o)
                    : /^foot_r(\.?0*\d+)?$/i.test(s) && (!t.parts.footR || !o.isMesh) && (t.parts.footR = o));
      }),
      t.parts);
}
export function setupArticulatedPlayerRig(t) {
  if (!t || !t.model) return null;
  if (t.rig && t.rig.initialized && t.rig.modelRef === t.model) return t.rig;
  const o = re(t),
    { torso: s, head: e, footL: n, footR: M, handL: w, handR: S } = o;
  let d = t.model.getObjectByName("PlayerRig_HipPivot"),
    h = t.model.getObjectByName("PlayerRig_NeckPivot"),
    l = t.model.getObjectByName("PlayerRig_HeadBounce"),
    P = t.model.getObjectByName("PlayerRig_FootLPivot"),
    u = t.model.getObjectByName("PlayerRig_FootRPivot"),
    m = t.model.getObjectByName("PlayerRig_HandLPivot"),
    r = t.model.getObjectByName("PlayerRig_HandRPivot");
  d ||
    ((d = new i.Group()), (d.name = "PlayerRig_HipPivot"), d.position.copy(MII_RIG_PIVOTS.HIP), t.model.add(d)),
    h
      ? h.parent !== d && (d.add(h), h.position.copy(MII_RIG_PIVOTS.NECK_RELATIVE_TO_HIP))
      : ((h = new i.Group()),
        (h.name = "PlayerRig_NeckPivot"),
        h.position.copy(MII_RIG_PIVOTS.NECK_RELATIVE_TO_HIP),
        d.add(h)),
    l
      ? l.parent !== h && (h.add(l), l.position.set(0, 0, 0))
      : ((l = new i.Group()), (l.name = "PlayerRig_HeadBounce"), l.position.set(0, 0, 0), h.add(l)),
    P ||
      ((P = new i.Group()),
      (P.name = "PlayerRig_FootLPivot"),
      P.position.copy(MII_RIG_PIVOTS.FOOT_L),
      t.model.add(P)),
    u ||
      ((u = new i.Group()),
      (u.name = "PlayerRig_FootRPivot"),
      u.position.copy(MII_RIG_PIVOTS.FOOT_R),
      t.model.add(u)),
    m ||
      ((m = new i.Group()),
      (m.name = "PlayerRig_HandLPivot"),
      m.position.copy(MII_RIG_PIVOTS.HAND_L),
      t.model.add(m)),
    r ||
      ((r = new i.Group()),
      (r.name = "PlayerRig_HandRPivot"),
      r.position.copy(MII_RIG_PIVOTS.HAND_R),
      t.model.add(r));
  const R = (y, E, W) => {
      if (!y) return new i.Vector3();
      const Y = y.userData.basePos ? y.userData.basePos.clone() : new i.Vector3(0, 0, 0),
        T = y.userData.baseRot ? y.userData.baseRot.clone() : new i.Euler(0, 0, 0),
        D = new i.Vector3(Y.x - W.x, Y.y - W.y, Y.z - W.z);
      return (
        y.parent !== E && E.add(y),
        y.position.copy(D),
        y.rotation.copy(T),
        y.scale.set(1, 1, 1),
        (y.userData.rigLocalOffset = D.clone()),
        D
      );
    },
    g = R(s, d, MII_RIG_PIVOTS.HIP),
    _ = R(e, l, MII_RIG_PIVOTS.NECK_WORLD),
    V = R(n, P, MII_RIG_PIVOTS.FOOT_L),
    U = R(M, u, MII_RIG_PIVOTS.FOOT_R),
    c = R(w, m, MII_RIG_PIVOTS.HAND_L),
    A = R(S, r, MII_RIG_PIVOTS.HAND_R);
  m.position.set(0.28, 0.8, 0.14), r.position.set(-0.31, 0.82, 0.14);
  const p = t.model.scale.clone();
  p.lengthSq() < 1e-4 && p.setScalar(1.16);
  const I =
    String(t.role || "player")
      .split("")
      .reduce((y, E) => y + E.charCodeAt(0), 0) * 0.37;
  return (
    (t.rig = {
      initialized: !0,
      modelRef: t.model,
      baseModelScale: p,
      phaseSeed: I,
      elapsedTime: 0,
      hipPivot: d,
      neckPivot: h,
      headBounceGroup: l,
      footLPivot: P,
      footRPivot: u,
      handLPivot: m,
      handRPivot: r,
      basePivots: {
        hip: MII_RIG_PIVOTS.HIP.clone(),
        neck: MII_RIG_PIVOTS.NECK_RELATIVE_TO_HIP.clone(),
        footL: MII_RIG_PIVOTS.FOOT_L.clone(),
        footR: MII_RIG_PIVOTS.FOOT_R.clone(),
        handL: MII_RIG_PIVOTS.HAND_L.clone(),
        handR: MII_RIG_PIVOTS.HAND_R.clone(),
      },
      partOffsets: { torso: g, head: _, footL: V, footR: U, handL: c, handR: A },
      hopPhase: (t.stridePhase || 0) + (I % Math.PI),
      prevHopSin: 0,
      prevHopDerivative: 0,
      verticalHopOffset: 0,
      squashY: 1,
      squashYVel: 0,
      prevLocalVelX: 0,
      prevLocalVelZ: 0,
      wasMoving: !1,
      leanPitch: 0,
      leanRoll: 0,
      leanPitchVel: 0,
      leanRollVel: 0,
      spineTwistY: 0,
      spineTwistVel: 0,
      headBouncePitch: 0,
      headBouncePitchVel: 0,
      headBounceRoll: 0,
      headBounceRollVel: 0,
      headScaleBounce: 0,
      headScaleBounceVel: 0,
      headLookYaw: 0,
      headLookPitch: 0,
      wasSwinging: !1,
      lastSwingType: "forehand",
      anticipationCharge: 0,
      coiledSide: "forehand",
      reaction: { active: !1, type: null, timer: 0, duration: 1.65 },
    }),
    (t.joints = {
      hipPivot: d,
      neckPivot: h,
      headBounceGroup: l,
      footLPivot: P,
      footRPivot: u,
      handLPivot: m,
      handRPivot: r,
    }),
    t.rig
  );
}
export function triggerPointReaction(t, o = "win", s = {}) {
  if (!t) return;
  const e = t.rig || setupArticulatedPlayerRig(t);
  if (!e) return;
  const n = o === !0 ? "win" : o === !1 ? "loss" : String(o || "win").toLowerCase(),
    M = n === "win" || n === "won" || n === "victory" || n === "cheer" || n === "nice";
  (e.reaction.active = !0),
    (e.reaction.type = M ? "win" : "loss"),
    (e.reaction.timer = 0),
    (e.reaction.duration = Number(s.duration) || (M ? 1.72 : 1.68)),
    M
      ? ((e.squashYVel += 2.2),
        (e.leanPitchVel -= 2.4),
        (e.headBouncePitchVel -= 4.8),
        (e.headScaleBounceVel += 1.6))
      : ((e.squashYVel -= 1.5),
        (e.leanPitchVel += 2.8),
        (e.headBouncePitchVel += 4.2),
        (e.headBounceRollVel += (t.sideSign || 1) * 2.5));
}
function fe(t, o) {
  const { torso: s, head: e, footL: n, footR: M, handL: w, handR: S } = t.parts || {};
  s && (s.position.copy(o.partOffsets.torso), s.userData.baseRot && s.rotation.copy(s.userData.baseRot)),
    e && (e.position.copy(o.partOffsets.head), e.userData.baseRot && e.rotation.copy(e.userData.baseRot)),
    n && (n.position.copy(o.partOffsets.footL), n.userData.baseRot && n.rotation.copy(n.userData.baseRot)),
    M && (M.position.copy(o.partOffsets.footR), M.userData.baseRot && M.rotation.copy(M.userData.baseRot)),
    w && (w.position.copy(o.partOffsets.handL), w.userData.baseRot && w.rotation.copy(w.userData.baseRot)),
    S && (S.position.copy(o.partOffsets.handR), S.userData.baseRot && S.rotation.copy(S.userData.baseRot));
}
function de(t, o, s) {
  const e = t.racketKinematics;
  if (e && typeof e.anticipationCharge == "number" && e.anticipationCharge > 0.01) {
    const V =
        e.anticipationSide ||
        e.prepSide ||
        e.activeStanceSide ||
        e.swingSide ||
        e.swingType ||
        t.swingType ||
        "forehand",
      U = V === "overhead" ? "smash" : V;
    return (o.coiledSide = U), { charge: i.MathUtils.clamp(e.anticipationCharge, 0, 1), side: U };
  }
  if (typeof t.anticipationCharge == "number" && t.anticipationCharge > 0.01)
    return { charge: i.MathUtils.clamp(t.anticipationCharge, 0, 1), side: t.swingType || "forehand" };
  const n = s?.ball || t.ball,
    M = s?.phase || "RALLY";
  if (!n || !n.inPlay || M !== "RALLY") return { charge: 0, side: o.coiledSide || "forehand" };
  const w = t.sideSign || 1;
  if (!(w > 0 ? n.vel.z > 0.5 : n.vel.z < -0.5)) return { charge: 0, side: o.coiledSide || "forehand" };
  const d = Math.abs(t.pos.z - n.pos.z),
    h = Math.abs(t.pos.x - n.pos.x);
  if (d > 9.5 || h > 4.6) return { charge: 0, side: o.coiledSide || "forehand" };
  // NATPF B15: lato dalla palla nel riferimento di chi colpisce, con la sua mano (natpf_hand.js): per il mancino la palla
  // alla sua sinistra è il dritto (prima la regola del destro: caricava dal lato sbagliato finché la racchetta animata,
  // che ha già la mano, non cominciava a caricare)
  const hw = w * (t.natpfHand === "left" ? -1 : 1),
    l = n.pos.x * hw,
    P = n.targetLanding && typeof n.targetLanding.x == "number" ? n.targetLanding.x * hw : l,
    u = (n.pos.x - t.pos.x) * hw,
    m = n.pos.y > 1.72 && d < 4.5,
    r = P < -0.22 || l < -0.22 || (Math.abs(l) <= 0.22 && u < -0.08),
    R = m ? "smash" : r ? "backhand" : "forehand";
  o.coiledSide = R;
  const g = i.MathUtils.clamp(1 - (d - 1.1) / 7.2, 0, 1),
    _ = h < 2.8 ? 1 : i.MathUtils.clamp(1 - (h - 2.8) / 1.8, 0.25, 1);
  return { charge: g * _, side: R };
}
export function updatePlayerBodyAnimation(t, o, s = {}) {
  if (!t || !t.model) return;
  s && s.ball && typeof s.phase == "string" && (t._engineRef = s);
  const e = t.rig && t.rig.initialized ? t.rig : setupArticulatedPlayerRig(t);
  if (!e) return;
  const n = Number.isFinite(o) && o > 0 ? Math.min(o, 0.08) : 1 / 60;
  e.elapsedTime += n;
  const M = Number.isFinite(s?.elapsedTime) ? s.elapsedTime : e.elapsedTime;
  fe(t, e);
  const w = t.sideSign || 1,
    // NATPF B15: personaggio specchiato (mancino, natpf_hand.js: root.scale.x < 0): le rotazioni attorno alla verticale e
    // in avanti calcolate da direzioni del campo (inclinazione nella corsa laterale, testa verso la palla) si vedono
    // rovesciate dallo specchio; con wm il mancino si inclina e guarda dalla parte giusta (il destro non cambia)
    wm = w * (t.root && t.root.scale && t.root.scale.x < 0 ? -1 : 1),
    S = s?.phase || t.phase || "RALLY",
    d = s?.score || t.score || null,
    h = s?.ball || t.ball || null,
    l = !!(d && d.server === t.role),
    P = e.prevPhase || S;
  if (((e.prevPhase = S), (S === "POINT_OVER" || S === "MATCH_OVER") && s?.lastPointWinner)) {
    const a = String(t.role || "").startsWith("opponent") ? "opponent" : "player";
    e.reaction.active || triggerPointReaction(t, s.lastPointWinner === a ? "win" : "loss");
  } else
    e.reaction.active &&
      P === "POINT_OVER" &&
      S === "SERVE_STANCE" &&
      e.reaction.timer > 0.25 &&
      (e.reaction.active = !1);
  const u = t.vel ? t.vel.x : 0,
    m = t.vel ? t.vel.z : 0,
    r = Math.hypot(u, m),
    R = r > 0.25,
    g = u * -wm,
    _ = m * -w,
    V = (g - e.prevLocalVelX) / Math.max(0.004, n),
    U = (_ - e.prevLocalVelZ) / Math.max(0.004, n),
    c = Math.hypot(e.prevLocalVelX, e.prevLocalVelZ);
  if (c > 1.8 && r < c * 0.55) {
    const a = i.MathUtils.clamp(e.prevLocalVelX * 0.42, -3.2, 3.2),
      f = i.MathUtils.clamp(e.prevLocalVelZ * 0.42, -3.2, 3.2);
    (e.leanRollVel += -a),
      (e.leanPitchVel += f),
      (e.headBouncePitchVel += f * 1.35),
      (e.headBounceRollVel += -a * 1.35),
      (e.squashYVel -= 1.15);
  }
  (e.prevLocalVelX = g), (e.prevLocalVelZ = _), (e.wasMoving = R);
  let A = 0,
    p = 1,
    I = 0,
    y = 0,
    E = 0;
  if (
    (e.footLPivot.position.copy(e.basePivots.footL),
    e.footRPivot.position.copy(e.basePivots.footR),
    e.footLPivot.rotation.set(0, 0, 0),
    e.footRPivot.rotation.set(0, 0, 0),
    R)
  ) {
    const a = i.MathUtils.clamp(14.2 + r * 0.42, 14, 18.2);
    (e.hopPhase += n * a), (t.stridePhase = e.hopPhase);
    const f = Math.sin(e.hopPhase),
      v = Math.cos(e.hopPhase),
      B = Math.abs(f),
      G = f * v;
    if (e.prevHopDerivative < 0 && G >= 0 && B < 0.35) {
      const L = i.MathUtils.clamp(r / 8.5, 0.35, 1.15);
      (e.squashYVel -= 1.65 * L),
        (e.headBouncePitchVel += 2.6 * L),
        (e.headBounceRollVel += (f >= 0 ? 1 : -1) * 1.45 * L),
        (e.headScaleBounceVel -= 1.2 * L);
    }
    (e.prevHopSin = B), (e.prevHopDerivative = G);
    const b = i.MathUtils.clamp(r / (t.maxSpeed || 9), 0.25, 1.15);
    if (
      ((A = Math.pow(B, 0.78) * (0.068 + 0.036 * b)),
      B < 0.28 ? (p = 0.945) : B > 0.76 ? (p = 1.032) : (p = 1),
      Math.abs(g) > Math.abs(_) * 1.05)
    ) {
      const L = Math.sign(g) || 1,
        H = f,
        q = Math.max(0, f),
        Z = Math.max(0, -f);
      (e.footLPivot.position.x = e.basePivots.footL.x + (H * 0.065 - 0.018 * L) * b),
        (e.footRPivot.position.x = e.basePivots.footR.x + (-H * 0.065 + 0.018 * L) * b),
        (e.footLPivot.position.y = e.basePivots.footL.y + q * 0.078 * b),
        (e.footRPivot.position.y = e.basePivots.footR.y + Z * 0.078 * b),
        (e.footLPivot.position.z = e.basePivots.footL.z + v * 0.045 * b),
        (e.footRPivot.position.z = e.basePivots.footR.z - v * 0.045 * b),
        (e.footLPivot.rotation.z = (-L * 0.22 - H * 0.18) * b),
        (e.footRPivot.rotation.z = (-L * 0.22 + H * 0.18) * b),
        (e.footLPivot.rotation.x = (q * 0.36 - 0.08) * b),
        (e.footRPivot.rotation.x = (Z * 0.36 - 0.08) * b),
        (I = L * 0.025 * b + H * 0.018),
        (y = -0.022 * b);
    } else {
      const L = f,
        H = Math.sign(_) || 1,
        q = Math.max(0, L),
        Z = Math.max(0, -L);
      (e.footLPivot.position.z = e.basePivots.footL.z + L * 0.165 * b * H),
        (e.footRPivot.position.z = e.basePivots.footR.z - L * 0.165 * b * H),
        (e.footLPivot.position.y = e.basePivots.footL.y + q * 0.092 * b),
        (e.footRPivot.position.y = e.basePivots.footR.y + Z * 0.092 * b),
        (e.footLPivot.rotation.x = (-L * 0.68 * H + q * 0.24) * b),
        (e.footRPivot.rotation.x = (L * 0.68 * H + Z * 0.24) * b),
        (e.footLPivot.rotation.z = L * 0.08 * b),
        (e.footRPivot.rotation.z = L * 0.08 * b),
        (E = 0.02 * H * b);
    }
  } else {
    const a = Math.sin(M * 5.2 + e.phaseSeed),
      f = Math.sin(M * 2.6 + e.phaseSeed * 0.7),
      v = Math.abs(a);
    (A = v * 0.026),
      (p = 1 - (1 - v) * 0.022),
      (I = f * 0.026),
      (y = -0.018 * (1 - v)),
      (e.footLPivot.position.x = e.basePivots.footL.x - 0.012),
      (e.footRPivot.position.x = e.basePivots.footR.x + 0.012),
      (e.footLPivot.position.y = e.basePivots.footL.y + Math.max(0, f) * 0.014),
      (e.footRPivot.position.y = e.basePivots.footR.y + Math.max(0, -f) * 0.014),
      (e.footLPivot.rotation.z = -f * 0.08),
      (e.footRPivot.rotation.z = -f * 0.08),
      (e.footLPivot.rotation.x = (1 - v) * 0.07),
      (e.footRPivot.rotation.x = (1 - v) * 0.07);
  }
  const { charge: W, side: Y } = de(t, e, s);
  e.anticipationCharge = i.MathUtils.lerp(e.anticipationCharge, W, Math.min(1, n * 12));
  const T = t.racketKinematics,
    D = !!(t.swingTimer > 0 || (T && (T.swingActive || T.isSwinging))),
    ne = (T && (T.swingSide === "backhand" ? "backhand" : T.swingType)) || t.swingType || Y || "forehand",
    x = String(ne).toLowerCase();
  let X = 0;
  if (T && typeof T.swingProgress == "number" && (T.swingActive || T.isSwinging))
    X = i.MathUtils.clamp(T.swingProgress, 0, 1);
  else if (t.swingTimer > 0) {
    const a = Math.max(0.18, t.swingDuration || 0.36);
    X = i.MathUtils.clamp(1 - t.swingTimer / a, 0, 1);
  }
  D &&
    (!e.wasSwinging || e.lastSwingType !== x) &&
    ((e.lastSwingType = x),
    x === "backhand"
      ? ((e.spineTwistVel -= 6.8), (e.leanPitchVel += 1.4), (e.headBounceRollVel -= 2.8))
      : x === "serve" || x === "smash"
        ? ((e.spineTwistVel += 5.8),
          (e.leanPitchVel += 3.6),
          (e.headBouncePitchVel += 4.2),
          (e.squashYVel += 1.4))
        : ((e.spineTwistVel += 6.8), (e.leanPitchVel += 1.6), (e.headBounceRollVel += 2.8))),
    (e.wasSwinging = D);
  let N = i.MathUtils.clamp(_ * 0.034 + U * 0.0045, -0.28, 0.32),
    z = i.MathUtils.clamp(-g * 0.038 - V * 0.005, -0.3, 0.3),
    F = T && typeof T.stanceSideBlend == "number" ? i.MathUtils.lerp(-0.08, 0.12, T.stanceSideBlend) : -0.06;
  if (S === "SERVE_TOSS" && l && !D) {
    const a = h ? i.MathUtils.clamp((h.pos.y - 1.1) / 2.1, 0, 1) : 0.65;
    (F = -0.38 * a), (N -= 0.18 * a), (z -= 0.08 * a), (y += 0.025 * a);
  } else if (D) {
    const a = i.MathUtils.smoothstep(X, 0, 0.65),
      f = Math.sin(X * Math.PI);
    x === "backhand"
      ? ((F = i.MathUtils.lerp(0.46, -0.52, a)),
        (N += 0.14 * f),
        (z += -0.12 * f),
        (I += -0.035 * f),
        (E += 0.048 * f))
      : x === "serve" || x === "smash"
        ? ((F = i.MathUtils.lerp(-0.38, 0.44, a)),
          (N += i.MathUtils.lerp(-0.14, 0.28, a)),
          (z += 0.12 * f),
          (A += 0.11 * f),
          (E += 0.06 * f))
        : ((F = i.MathUtils.lerp(-0.44, 0.54, a)),
          (N += 0.16 * f),
          (z += 0.12 * f),
          (I += 0.035 * f),
          (E += 0.048 * f));
  } else if (e.anticipationCharge > 0.02) {
    const a = e.anticipationCharge;
    Y === "backhand"
      ? ((F = 0.46 * a), (z -= 0.08 * a), (I += 0.028 * a))
      : Y === "smash"
        ? ((F = -0.38 * a), (N -= 0.14 * a))
        : ((F = -0.44 * a), (z += 0.08 * a), (I -= 0.028 * a)),
      (N -= 0.075 * a),
      (y -= 0.036 * a),
      (E -= 0.028 * a);
  }
  let $ = 0;
  if (e.reaction.active) {
    e.reaction.timer += n;
    const a = e.reaction.timer,
      f = i.MathUtils.clamp(a / e.reaction.duration, 0, 1);
    if (e.reaction.type === "win") {
      const v = Math.abs(Math.sin(a * 9.2)),
        B = Math.pow(1 - f * 0.55, 0.8);
      (A = v * 0.16 * B),
        (p = v > 0.35 ? 1.04 : 0.94),
        ($ = Math.sin(a * 9.2) * 0.16 * B),
        (N = -0.14 * B),
        (z = Math.sin(a * 9.2) * 0.12 * B),
        (F = Math.sin(a * 9.2) * 0.22 * B),
        (e.footLPivot.rotation.x = v * 0.48),
        (e.footRPivot.rotation.x = -v * 0.32),
        t.racketPivot &&
          (t.racketPivot.position.set(-0.36, 1.12 + v * 0.14, 0.18),
          t.racketPivot.rotation.set(-0.42 + v * 0.22, -0.22, 0.18));
    } else {
      if (a < 0.24) {
        const v = Math.sin((a / 0.24) * Math.PI);
        (A = v * 0.11), (N = -0.12 * v);
      } else {
        const v = i.MathUtils.smoothstep(a, 0.24, 0.65);
        (A = 0),
          (p = 1 - 0.045 * v),
          (y -= 0.065 * v),
          (N = 0.34 * v),
          (z = Math.sin(a * 4.5) * 0.08 * v),
          (F = Math.sin(a * 5.5) * 0.12 * v);
      }
      t.racketPivot &&
        (t.racketPivot.position.set(-0.32, 0.68, 0.12), t.racketPivot.rotation.set(0.85, -0.12, 0.55));
    }
    a >= e.reaction.duration && S !== "POINT_OVER" && S !== "MATCH_OVER" && (e.reaction.active = !1);
  }
  const J = Math.max(1, Math.ceil(n / O.MAX_SUBSTEP_DT)),
    k = n / J;
  for (let a = 0; a < J; a++) {
    const f = (N - e.leanPitch) * O.TORSO_STIFFNESS - e.leanPitchVel * O.TORSO_DAMPING;
    (e.leanPitchVel += f * k), (e.leanPitch += e.leanPitchVel * k);
    const v = (z - e.leanRoll) * O.TORSO_STIFFNESS - e.leanRollVel * O.TORSO_DAMPING;
    (e.leanRollVel += v * k), (e.leanRoll += e.leanRollVel * k);
    const B = (F - e.spineTwistY) * O.SPINE_TWIST_STIFFNESS - e.spineTwistVel * O.SPINE_TWIST_DAMPING;
    (e.spineTwistVel += B * k), (e.spineTwistY += e.spineTwistVel * k);
    const G = -e.headBouncePitch * O.HEAD_BOUNCE_STIFFNESS - e.headBouncePitchVel * O.HEAD_BOUNCE_DAMPING;
    (e.headBouncePitchVel += G * k), (e.headBouncePitch += e.headBouncePitchVel * k);
    const b = -e.headBounceRoll * O.HEAD_BOUNCE_STIFFNESS - e.headBounceRollVel * O.HEAD_BOUNCE_DAMPING;
    (e.headBounceRollVel += b * k), (e.headBounceRoll += e.headBounceRollVel * k);
    const Q = -e.headScaleBounce * O.HEAD_BOUNCE_STIFFNESS - e.headScaleBounceVel * O.HEAD_BOUNCE_DAMPING;
    (e.headScaleBounceVel += Q * k), (e.headScaleBounce += e.headScaleBounceVel * k);
    const L = (p - e.squashY) * O.SQUASH_STIFFNESS - e.squashYVel * O.SQUASH_DAMPING;
    (e.squashYVel += L * k), (e.squashY += e.squashYVel * k);
  }
  (e.leanPitch = i.MathUtils.clamp(e.leanPitch, -0.52, 0.55)),
    (e.leanRoll = i.MathUtils.clamp(e.leanRoll, -0.48, 0.48)),
    (e.spineTwistY = i.MathUtils.clamp(e.spineTwistY, -0.78, 0.78)),
    (e.headBouncePitch = i.MathUtils.clamp(e.headBouncePitch, -0.35, 0.35)),
    (e.headBounceRoll = i.MathUtils.clamp(e.headBounceRoll, -0.35, 0.35)),
    (e.squashY = i.MathUtils.clamp(e.squashY, 0.88, 1.12)),
    (e.verticalHopOffset = A),
    t.root.position.set(t.pos.x, t.pos.y + e.verticalHopOffset, t.pos.z);
  const ee = e.squashY,
    te = 1 + (1 - ee) * 0.6;
  if (
    (t.model.scale.set(e.baseModelScale.x * te, e.baseModelScale.y * ee, e.baseModelScale.z * te),
    (t.model.rotation.y = $),
    t.shadowBlob)
  ) {
    (t.shadowBlob.position.x = t.pos.x), (t.shadowBlob.position.z = t.pos.z);
    const a = i.MathUtils.clamp(1 - e.verticalHopOffset * 0.85, 0.72, 1.06);
    t.shadowBlob.scale.setScalar(a);
  }
  e.hipPivot.position.set(e.basePivots.hip.x + I, e.basePivots.hip.y + y, e.basePivots.hip.z + E),
    e.hipPivot.rotation.set(e.leanPitch, e.spineTwistY, e.leanRoll);
  let j = 0,
    K = 0;
  if (e.reaction.active)
    e.reaction.type === "win"
      ? ((K = -0.32), (j = Math.sin(e.reaction.timer * 8) * 0.18))
      : ((K = 0.42), (j = Math.sin(e.reaction.timer * 7.5) * 0.22));
  else if (h && h.pos) {
    const a = t.pos.y + 1.48,
      f = h.pos.x - t.pos.x,
      v = h.pos.y - a,
      B = h.pos.z - t.pos.z,
      G = f * -wm,
      b = Math.max(0.35, B * -w),
      Q = Math.hypot(G, b);
    (j = i.MathUtils.clamp(Math.atan2(G, b) * 0.78, -0.62, 0.62)),
      (K = i.MathUtils.clamp(-Math.atan2(v, Q) * 0.72, -0.48, 0.36));
  }
  (e.headLookYaw = i.MathUtils.lerp(e.headLookYaw, j, Math.min(1, n * 14))),
    (e.headLookPitch = i.MathUtils.lerp(e.headLookPitch, K, Math.min(1, n * 14)));
  const le = i.MathUtils.clamp(e.headLookYaw - e.spineTwistY * 0.68, -0.75, 0.75),
    he = i.MathUtils.clamp(e.headLookPitch - e.leanPitch * 0.52, -0.52, 0.48),
    ce = i.MathUtils.clamp(-e.leanRoll * 0.45 + e.headLookYaw * 0.12, -0.32, 0.32);
  e.neckPivot.position.copy(e.basePivots.neck),
    e.neckPivot.rotation.set(he, le, ce),
    e.headBounceGroup.rotation.set(e.headBouncePitch, e.headBounceRoll * 0.35, e.headBounceRoll);
  const ie = i.MathUtils.clamp(1 + e.headScaleBounce * 0.08, 0.93, 1.08),
    oe = 1 - (ie - 1) * 0.45;
  e.headBounceGroup.scale.set(oe, ie, oe),
    !(t.racketKinematics || (t.userData && t.userData.externalRacketKinematics)) &&
      t.racketPivot &&
      Pe(t, e, n, M, { isSwinging: D, swingType: x, swingProgress: X, phase: S, isServer: l }),
    Me(t, e, { isSwinging: D, swingType: x, swingProgress: X, phase: S, isServer: l }),
    ue(t, e, M, {
      isSwinging: D,
      swingType: x,
      swingProgress: X,
      prepSide: Y,
      phase: S,
      isServer: l,
      ball: h,
      isMoving: R,
    });
}
function Pe(t, o, s, e, { isSwinging: n, swingType: M, swingProgress: w, phase: S, isServer: d }) {
  if (
    (t.racketMesh && t.racketMesh.rotation && t.racketMesh.rotation.set(0, 0, 0),
    t.swingTimer > 0 && (t.swingTimer = Math.max(0, t.swingTimer - s)),
    t.arcVisibleTimer > 0 &&
      t.swingArcMesh &&
      ((t.arcVisibleTimer = Math.max(0, t.arcVisibleTimer - s)),
      (t.swingArcMesh.visible = !0),
      t.swingArcMesh.material &&
        (t.swingArcMesh.material.opacity = Math.min(0.88, (t.arcVisibleTimer / 0.3) * 0.85))),
    o.reaction.active)
  ) {
    if (o.reaction.type === "win") {
      const l = Math.abs(Math.sin(o.reaction.timer * 9.2));
      t.racketPivot.position.set(-0.38, 1.24 + l * 0.18, 0.18),
        t.racketPivot.rotation.set(-0.45 + l * 0.25, -0.22, 0.18);
    } else t.racketPivot.position.set(-0.32, 0.68, 0.12), t.racketPivot.rotation.set(0.85, -0.12, 0.55);
    return;
  }
  if (n) {
    const l = w,
      P = Math.sin(l * Math.PI),
      u = i.MathUtils.smoothstep(l, 0.35, 1);
    if (M === "serve" || M === "smash")
      t.racketPivot.position.set(-0.34 + u * 0.52, 1.14 + P * 0.28 - u * 0.22, 0.14 + P * 0.22),
        t.racketPivot.rotation.set(-0.85 + l * 1.65, -0.18 + u * 0.65, 0.28 - u * 0.85);
    else if (M === "backhand") {
      const m = i.MathUtils.lerp(0.46, -0.44, i.MathUtils.smoothstep(l, 0, 0.78));
      t.racketPivot.position.set(m, 0.88 + P * 0.1, 0.16 + P * 0.18),
        t.racketPivot.rotation.set(0.28 + P * 0.24, 0.55 - l * 1.45, -0.88 + l * 2.05);
    } else {
      const m = i.MathUtils.lerp(-0.46, 0.38, i.MathUtils.smoothstep(l, 0, 0.78));
      t.racketPivot.position.set(m, 0.9 + P * 0.12 + u * 0.06, 0.14 + P * 0.18),
        t.racketPivot.rotation.set(0.3 + P * 0.22, -0.55 + l * 1.45, 0.88 - l * 2.05);
    }
    return;
  }
  if (S === "SERVE_TOSS" && d) {
    t.racketPivot.position.set(-0.36, 1.18, 0.04), t.racketPivot.rotation.set(-0.72, -0.28, 0.42);
    return;
  }
  if (o.anticipationCharge > 0.03) {
    const l = o.anticipationCharge;
    o.coiledSide === "backhand"
      ? (t.racketPivot.position.set(i.MathUtils.lerp(-0.36, 0.44, l), 0.88, i.MathUtils.lerp(0.14, 0.06, l)),
        t.racketPivot.rotation.set(0.32, i.MathUtils.lerp(-0.18, 0.78, l), i.MathUtils.lerp(0.42, -0.86, l)))
      : (t.racketPivot.position.set(
          i.MathUtils.lerp(-0.36, -0.45, l),
          0.92 + 0.04 * l,
          i.MathUtils.lerp(0.14, 0.04, l),
        ),
        t.racketPivot.rotation.set(0.32, i.MathUtils.lerp(-0.18, -0.78, l), i.MathUtils.lerp(0.42, 0.86, l)));
    return;
  }
  const h = Math.sin(e * 3.6 + (t.sideSign || 1)) * 0.04;
  t.racketPivot.position.set(-0.36, 0.9 + h * 0.3, 0.16), t.racketPivot.rotation.set(0.36 + h, -0.22, 0.48);
}
function Me(t, o, { isSwinging: s, swingType: e, swingProgress: n, phase: M, isServer: w }) {
  const S = o.basePivots.handR;
  if (!t.racketPivot) {
    o.handRPivot.position.copy(S), o.handRPivot.rotation.set(0, 0, 0);
    return;
  }
  const d = t.racketPivot.rotation;
  let h = 0;
  if (s) {
    const P = Math.sin(n * Math.PI);
    e === "serve" || e === "smash" ? (h = -0.022 * P) : e === "slice" ? (h = 0.024 * P) : (h = 0.015 * P);
  } else M === "SERVE_TOSS" && w && (h = -0.018);
  if (t.root && t.racketMesh && t.model)
    t.root.updateMatrixWorld(!0),
      C.set(0, 0.08 + h, 0),
      t.racketMesh.localToWorld(C),
      t.model.worldToLocal(C),
      o.handRPivot.position.copy(C);
  else {
    const P = t.racketPivot.position;
    ae.set(d.x, d.y, d.z, d.order || "XYZ"), se.setFromEuler(ae), C.set(0, 0.085 + h, 0).applyQuaternion(se);
    const u = Math.max(0.5, t.model?.scale?.x || o.baseModelScale.x || 1.16),
      m = Math.max(0.5, t.model?.scale?.y || o.baseModelScale.y || 1.16),
      r = Math.max(0.5, t.model?.scale?.z || o.baseModelScale.z || 1.16);
    o.handRPivot.position.set((P.x + C.x) / u, (P.y + C.y) / m, (P.z + C.z) / r);
  }
  const l = s ? Math.sin(n * Math.PI * 2) * 0.28 : 0;
  o.handRPivot.rotation.set(
    i.MathUtils.clamp((d.x - 0.36) * 0.65 + l, -0.95, 0.95),
    i.MathUtils.clamp(d.y * 0.65, -0.95, 0.95),
    i.MathUtils.clamp(d.z * 0.65, -0.95, 0.95),
  );
}
function ue(
  t,
  o,
  s,
  { isSwinging: e, swingType: n, swingProgress: M, prepSide: w, phase: S, isServer: d, ball: h, isMoving: l },
) {
  const u = o.basePivots.handL.y,
    m = o.basePivots.handL.z;
  let r = 0.29,
    R = u,
    g = m,
    _ = 0,
    V = 0,
    U = 0;
  if (o.reaction.active)
    if (o.reaction.type === "win") {
      const c = Math.abs(Math.sin(o.reaction.timer * 9.2 + 0.5));
      (r = 0.28), (R = 1.26 + c * 0.18), (g = 0.2), (_ = -0.75), (U = -0.25);
    } else (r = 0.28), (R = 0.64), (g = 0.18), (_ = 0.55), (U = 0.18);
  else if (S === "SERVE_TOSS" && d) {
    const c = h ? i.MathUtils.clamp((h.pos.y - 1.12) / 1.95, 0, 1) : 0.75,
      p = h && h.vel && h.vel.y < -0.15 ? i.MathUtils.lerp(1, 0.58, 1 - c) : c;
    (r = i.MathUtils.lerp(0.24, 0.26, p)),
      (R = i.MathUtils.lerp(u, 1.48, p)),
      (g = i.MathUtils.lerp(m, 0.28, p)),
      (_ = -0.82 * p),
      (V = -0.18 * p),
      (U = 0.15 * p);
  } else if (S === "SERVE_STANCE" && d) {
    const c = Math.sin(s * 4.2 + o.phaseSeed) * 0.025;
    (r = 0.2), (R = 0.86 + c), (g = 0.26), (_ = -0.28), (V = -0.35);
  } else if (e) {
    const c = M,
      A = Math.sin(c * Math.PI);
    if (n === "backhand")
      if (c < 0.42) {
        const p = 1 - c / 0.42;
        (r = i.MathUtils.lerp(0.32, o.handRPivot.position.x + 0.04, p)),
          (R = i.MathUtils.lerp(0.92, o.handRPivot.position.y + 0.04, p)),
          (g = i.MathUtils.lerp(0.1, o.handRPivot.position.z + 0.02, p)),
          (V = -0.45 * p),
          (U = 0.25 * p);
      } else {
        const p = i.MathUtils.smoothstep(c, 0.42, 0.92);
        (r = i.MathUtils.lerp(0.32, 0.44, p)),
          (R = i.MathUtils.lerp(0.9, 0.96, p)),
          (g = i.MathUtils.lerp(0.1, -0.24, p)),
          (_ = 0.28 * p),
          (V = 0.52 * p),
          (U = -0.46 * p);
      }
    else if (n === "serve" || n === "smash")
      (r = i.MathUtils.lerp(0.22, 0.32, c)),
        (R = i.MathUtils.lerp(1.36, 0.82, i.MathUtils.smoothstep(c, 0.1, 0.85))),
        (g = i.MathUtils.lerp(0.24, 0.08, c)),
        (_ = i.MathUtils.lerp(-0.65, 0.25, c));
    else {
      const p = i.MathUtils.smoothstep(c, 0.35, 0.95);
      (r = i.MathUtils.lerp(0.16, 0.3, p)),
        (R = 0.92 + A * 0.06),
        (g = i.MathUtils.lerp(0.32, 0.18, p)),
        (_ = -0.35 + p * 0.22),
        (V = i.MathUtils.lerp(-0.28, 0.48, p)),
        (U = 0.28 * p);
    }
  } else if (o.anticipationCharge > 0.03) {
    const c = o.anticipationCharge;
    w === "backhand"
      ? ((r = i.MathUtils.lerp(0.29, o.handRPivot.position.x + 0.04, c)),
        (R = i.MathUtils.lerp(u, o.handRPivot.position.y + 0.04, c)),
        (g = i.MathUtils.lerp(m, o.handRPivot.position.z + 0.02, c)),
        (V = -0.48 * c),
        (U = 0.28 * c))
      : w === "smash"
        ? ((r = i.MathUtils.lerp(0.29, 0.22, c)),
          (R = i.MathUtils.lerp(u, 1.32, c)),
          (g = i.MathUtils.lerp(m, 0.24, c)),
          (_ = -0.62 * c))
        : ((r = i.MathUtils.lerp(0.29, 0.14, c)),
          (R = i.MathUtils.lerp(u, 0.95, c)),
          (g = i.MathUtils.lerp(m, 0.3, c)),
          (_ = -0.32 * c),
          (V = -0.34 * c));
  } else if (l) {
    const c = Math.sin(o.hopPhase);
    (r = 0.29 - Math.cos(o.hopPhase) * 0.025),
      (R = u + Math.abs(c) * 0.065),
      (g = m - c * 0.12),
      (_ = c * 0.42),
      (U = -0.12);
  } else {
    const c = Math.sin(s * 5.2 + o.phaseSeed);
    (r = 0.29 - 0.01), (R = u + Math.abs(c) * 0.025), (g = m + 0.04), (_ = -0.14), (V = -0.16);
  }
  o.handLPivot.position.lerp(pe.set(r, R, g), 0.42), o.handLPivot.rotation.set(_, V, U);
}
export class PlayerBodyAnimator {
  constructor(o = {}) {
    (this.options = { ...o }), (this.actors = new Set());
  }
  setupArticulatedPlayerRig(o) {
    return o ? (this.actors.add(o), setupArticulatedPlayerRig(o)) : null;
  }
  setupRig(o) {
    return this.setupArticulatedPlayerRig(o);
  }
  updatePlayerBodyAnimation(o, s, e = {}) {
    o && (this.actors.add(o), updatePlayerBodyAnimation(o, s, e));
  }
  update(o, s, e = {}) {
    this.updatePlayerBodyAnimation(o, s, e);
  }
  updateAll(o, s, e = {}) {
    const n = Array.isArray(o) ? o : Array.from(this.actors);
    for (const M of n) M && updatePlayerBodyAnimation(M, s, e);
  }
  triggerPointReaction(o, s = "win", e = {}) {
    triggerPointReaction(o, s, e);
  }
}
export default PlayerBodyAnimator;
