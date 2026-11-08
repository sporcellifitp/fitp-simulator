import * as e from "three";
const U = new e.Vector3(-0.36, 0.9, 0.16),
  W = new e.Euler(0.36, -0.22, 0.48, "XYZ"),
  Z = new e.Vector3(0.33, 0.82, 0.14),
  ue = new e.Vector3(0.36, 0.89, 0.16),
  J = new e.Euler(0.36, 0.22, -0.48, "XYZ"),
  Ve = new e.Vector3(0.3, 0.93, 0.18),
  Ae = new e.Vector3(0, 0.345, 0),
  ke = new e.Vector3(0, 0.545, 0),
  He = new e.Vector3(0, 0.755, 0),
  me = new e.Vector3(0, 0, 1),
  Ce = new e.Vector3(0, 0.42, 0.08),
  We = new e.Vector3(0, 0.66, 0.12),
  Ee = new e.Vector3(0, 0.92, 0.16),
  Pe = new e.Vector3(),
  Oe = new e.Vector3(),
  Re = new e.Vector3(),
  De = new e.Vector3(),
  Le = new e.Vector3(),
  $ = new e.Matrix3();
function p(w, n, r) {
  return Math.max(n, Math.min(r, w));
}
function Y(w) {
  const n = p(w, 0, 1);
  return n * n * n * (n * (n * 6 - 15) + 10);
}
function se(w, n, r, o, t) {
  const s = p(t, 0, 1),
    c = 1 - s,
    d = c * c,
    S = 2 * c * s,
    a = s * s;
  return w.set(n.x * d + r.x * S + o.x * a, n.y * d + r.y * S + o.y * a, n.z * d + r.z * S + o.z * a), w;
}
function ze(w, n = !1) {
  if (n) return "serve";
  const r = String(w || "topspin")
    .trim()
    .toLowerCase();
  return r === "serve"
    ? "serve"
    : r === "slice" || r === "cut" || r === "backspin"
      ? "slice"
      : r === "lob" || r === "scoop"
        ? "lob"
        : r === "smash" || r === "power" || r === "overhead"
          ? "smash"
          : r === "flat" || r === "drive"
            ? "flat"
            : "topspin";
}
function _e(w, n = "topspin", r = !1) {
  if (r || n === "serve" || n === "smash") {
    const t = String(w || "")
      .trim()
      .toLowerCase();
    return t === "forehand" || t === "backhand" ? (n === "serve" ? "overhead" : t) : "overhead";
  }
  const o = String(w || "forehand")
    .trim()
    .toLowerCase();
  return o === "backhand" || o === "left" || o === "bh"
    ? "backhand"
    : o === "overhead" || o === "smash" || o === "serve"
      ? "overhead"
      : "forehand";
}
function Be(w) {
  const n = String(w || "sweet")
    .trim()
    .toLowerCase();
  return n.includes("early") ? "early" : n.includes("late") ? "late" : "sweet";
}
const ee = {
  topspin: {
    forehand: {
      baseDuration: 0.33,
      peakSpeedBase: 23.5,
      windupPos: new e.Vector3(-0.48, 0.66, -0.22),
      apexPos: new e.Vector3(-0.54, 0.84, 0.24),
      contactPos: new e.Vector3(-0.44, 0.98, 0.48),
      carryPos: new e.Vector3(-0.04, 1.22, 0.5),
      followPos: new e.Vector3(0.36, 1.32, 0.28),
      windupRot: new e.Vector3(-0.48, -0.68, 0.68),
      lagRot: new e.Vector3(-0.62, -0.82, 0.82),
      contactRot: new e.Vector3(0.42, 0.24, 0.68),
      followRot: new e.Vector3(0.86, 1.18, -0.82),
      offHandWindup: new e.Vector3(0.3, 0.96, 0.32),
      offHandContact: new e.Vector3(0.36, 1.02, 0.24),
      offHandFollow: new e.Vector3(0.34, 1.18, 0.2),
      arcRot: new e.Euler(-Math.PI * 0.32, -0.28, 0.22, "XYZ"),
    },
    backhand: {
      baseDuration: 0.33,
      peakSpeedBase: 23.2,
      windupPos: new e.Vector3(0.48, 0.68, -0.2),
      apexPos: new e.Vector3(0.54, 0.84, 0.24),
      contactPos: new e.Vector3(0.44, 0.98, 0.48),
      carryPos: new e.Vector3(0.04, 1.2, 0.5),
      followPos: new e.Vector3(-0.44, 1.28, 0.3),
      windupRot: new e.Vector3(-0.48, 0.68, -0.68),
      lagRot: new e.Vector3(-0.62, 0.82, -0.82),
      contactRot: new e.Vector3(0.42, -0.24, -0.68),
      followRot: new e.Vector3(0.86, -1.18, 0.82),
      offHandWindup: new e.Vector3(0.42, 0.72, -0.16),
      offHandContact: new e.Vector3(0.38, 0.98, 0.44),
      offHandFollow: new e.Vector3(0.44, 1.04, -0.18),
      arcRot: new e.Euler(-Math.PI * 0.32, 0.28, -0.22, "XYZ"),
    },
  },
  slice: {
    forehand: {
      baseDuration: 0.35,
      peakSpeedBase: 21.5,
      windupPos: new e.Vector3(-0.46, 1.28, -0.18),
      apexPos: new e.Vector3(-0.5, 1.08, 0.2),
      contactPos: new e.Vector3(-0.42, 0.9, 0.46),
      carryPos: new e.Vector3(-0.04, 0.78, 0.44),
      followPos: new e.Vector3(0.32, 0.72, 0.36),
      windupRot: new e.Vector3(-0.65, -0.56, 0.62),
      lagRot: new e.Vector3(-0.74, -0.68, 0.72),
      contactRot: new e.Vector3(-0.36, 0.22, 0.66),
      followRot: new e.Vector3(-0.18, 1.02, -0.72),
      offHandWindup: new e.Vector3(0.3, 1.06, 0.24),
      offHandContact: new e.Vector3(0.38, 0.92, 0.14),
      offHandFollow: new e.Vector3(0.42, 0.84, 0.04),
      arcRot: new e.Euler(-Math.PI * 0.44, -0.14, -0.24, "XYZ"),
    },
    backhand: {
      baseDuration: 0.35,
      peakSpeedBase: 21.5,
      windupPos: new e.Vector3(0.46, 1.28, -0.18),
      apexPos: new e.Vector3(0.5, 1.08, 0.2),
      contactPos: new e.Vector3(0.42, 0.9, 0.46),
      carryPos: new e.Vector3(0.04, 0.78, 0.44),
      followPos: new e.Vector3(-0.44, 0.72, 0.36),
      windupRot: new e.Vector3(-0.65, 0.56, -0.62),
      lagRot: new e.Vector3(-0.74, 0.68, -0.72),
      contactRot: new e.Vector3(-0.36, -0.22, -0.66),
      followRot: new e.Vector3(-0.18, -1.04, 0.72),
      offHandWindup: new e.Vector3(0.4, 1.22, -0.14),
      offHandContact: new e.Vector3(0.38, 0.96, 0.28),
      offHandFollow: new e.Vector3(0.46, 0.88, -0.22),
      arcRot: new e.Euler(-Math.PI * 0.44, 0.14, 0.24, "XYZ"),
    },
  },
  flat: {
    forehand: {
      baseDuration: 0.28,
      peakSpeedBase: 30.5,
      windupPos: new e.Vector3(-0.52, 0.96, -0.24),
      apexPos: new e.Vector3(-0.56, 0.98, 0.24),
      contactPos: new e.Vector3(-0.46, 1, 0.52),
      carryPos: new e.Vector3(-0.04, 1.04, 0.48),
      followPos: new e.Vector3(0.36, 1.06, 0.32),
      windupRot: new e.Vector3(-0.32, -0.76, 0.66),
      lagRot: new e.Vector3(-0.46, -0.94, 0.78),
      contactRot: new e.Vector3(0.48, 0.3, 0.7),
      followRot: new e.Vector3(0.82, 1.28, -0.78),
      offHandWindup: new e.Vector3(0.32, 1.02, 0.34),
      offHandContact: new e.Vector3(0.4, 0.98, 0.22),
      offHandFollow: new e.Vector3(0.36, 1.04, 0.2),
      arcRot: new e.Euler(-Math.PI * 0.46, -0.12, 0.12, "XYZ"),
    },
    backhand: {
      baseDuration: 0.28,
      peakSpeedBase: 30.2,
      windupPos: new e.Vector3(0.52, 0.96, -0.24),
      apexPos: new e.Vector3(0.56, 0.98, 0.24),
      contactPos: new e.Vector3(0.46, 1, 0.52),
      carryPos: new e.Vector3(0.04, 1.04, 0.48),
      followPos: new e.Vector3(-0.46, 1.06, 0.34),
      windupRot: new e.Vector3(-0.32, 0.76, -0.66),
      lagRot: new e.Vector3(-0.46, 0.94, -0.78),
      contactRot: new e.Vector3(0.48, -0.3, -0.7),
      followRot: new e.Vector3(0.82, -1.28, 0.78),
      offHandWindup: new e.Vector3(0.44, 0.94, -0.18),
      offHandContact: new e.Vector3(0.4, 0.98, 0.44),
      offHandFollow: new e.Vector3(0.46, 1.02, -0.18),
      arcRot: new e.Euler(-Math.PI * 0.46, 0.12, -0.12, "XYZ"),
    },
    overhead: {
      baseDuration: 0.28,
      peakSpeedBase: 32.5,
      windupPos: new e.Vector3(-0.28, 1.52, -0.18),
      apexPos: new e.Vector3(-0.32, 1.58, 0.18),
      contactPos: new e.Vector3(-0.3, 1.48, 0.42),
      carryPos: new e.Vector3(-0.06, 1.16, 0.44),
      followPos: new e.Vector3(0.26, 0.86, 0.32),
      windupRot: new e.Vector3(-0.88, -0.34, 0.42),
      lagRot: new e.Vector3(-1.05, -0.44, 0.52),
      contactRot: new e.Vector3(0.28, 0.16, 0.28),
      followRot: new e.Vector3(0.92, 0.68, -0.58),
      offHandWindup: new e.Vector3(0.22, 1.42, 0.34),
      offHandContact: new e.Vector3(0.34, 1.06, 0.24),
      offHandFollow: new e.Vector3(0.38, 0.82, 0.12),
      arcRot: new e.Euler(-Math.PI * 0.18, -0.32, 0.42, "XYZ"),
    },
  },
  smash: {
    overhead: {
      baseDuration: 0.28,
      peakSpeedBase: 33,
      windupPos: new e.Vector3(-0.28, 1.52, -0.18),
      apexPos: new e.Vector3(-0.32, 1.58, 0.18),
      contactPos: new e.Vector3(-0.3, 1.48, 0.42),
      carryPos: new e.Vector3(-0.06, 1.16, 0.44),
      followPos: new e.Vector3(0.26, 0.86, 0.32),
      windupRot: new e.Vector3(-0.88, -0.34, 0.42),
      lagRot: new e.Vector3(-1.05, -0.44, 0.52),
      contactRot: new e.Vector3(0.28, 0.16, 0.28),
      followRot: new e.Vector3(0.92, 0.68, -0.58),
      offHandWindup: new e.Vector3(0.22, 1.42, 0.34),
      offHandContact: new e.Vector3(0.34, 1.06, 0.24),
      offHandFollow: new e.Vector3(0.38, 0.82, 0.12),
      arcRot: new e.Euler(-Math.PI * 0.18, -0.32, 0.42, "XYZ"),
    },
    forehand: {
      baseDuration: 0.28,
      peakSpeedBase: 31.2,
      windupPos: new e.Vector3(-0.46, 1.36, -0.2),
      apexPos: new e.Vector3(-0.5, 1.28, 0.22),
      contactPos: new e.Vector3(-0.42, 1.16, 0.5),
      carryPos: new e.Vector3(-0.02, 0.88, 0.44),
      followPos: new e.Vector3(0.32, 0.66, 0.3),
      windupRot: new e.Vector3(-0.76, -0.58, 0.56),
      lagRot: new e.Vector3(-0.94, -0.72, 0.68),
      contactRot: new e.Vector3(0.54, 0.28, 0.58),
      followRot: new e.Vector3(1.18, 1.04, -0.72),
      offHandWindup: new e.Vector3(0.26, 1.32, 0.32),
      offHandContact: new e.Vector3(0.38, 0.98, 0.22),
      offHandFollow: new e.Vector3(0.4, 0.78, 0.12),
      arcRot: new e.Euler(-Math.PI * 0.24, -0.26, 0.34, "XYZ"),
    },
    backhand: {
      baseDuration: 0.28,
      peakSpeedBase: 30.8,
      windupPos: new e.Vector3(0.46, 1.36, -0.2),
      apexPos: new e.Vector3(0.5, 1.28, 0.22),
      contactPos: new e.Vector3(0.42, 1.16, 0.5),
      carryPos: new e.Vector3(0.02, 0.88, 0.44),
      followPos: new e.Vector3(-0.44, 0.66, 0.32),
      windupRot: new e.Vector3(-0.76, 0.58, -0.56),
      lagRot: new e.Vector3(-0.94, 0.72, -0.68),
      contactRot: new e.Vector3(0.54, -0.28, -0.58),
      followRot: new e.Vector3(1.18, -1.04, 0.72),
      offHandWindup: new e.Vector3(0.4, 1.28, -0.14),
      offHandContact: new e.Vector3(0.38, 1.1, 0.42),
      offHandFollow: new e.Vector3(0.44, 0.84, -0.18),
      arcRot: new e.Euler(-Math.PI * 0.24, 0.26, -0.34, "XYZ"),
    },
  },
  lob: {
    forehand: {
      baseDuration: 0.38,
      peakSpeedBase: 19.8,
      windupPos: new e.Vector3(-0.44, 0.52, -0.18),
      apexPos: new e.Vector3(-0.48, 0.68, 0.22),
      contactPos: new e.Vector3(-0.4, 0.88, 0.46),
      carryPos: new e.Vector3(-0.04, 1.26, 0.46),
      followPos: new e.Vector3(0.28, 1.48, 0.34),
      windupRot: new e.Vector3(-0.78, -0.46, 0.68),
      lagRot: new e.Vector3(-0.92, -0.58, 0.82),
      contactRot: new e.Vector3(-0.42, 0.18, 0.64),
      followRot: new e.Vector3(0.36, 0.84, -0.62),
      offHandWindup: new e.Vector3(0.32, 0.78, 0.26),
      offHandContact: new e.Vector3(0.38, 1.02, 0.28),
      offHandFollow: new e.Vector3(0.34, 1.32, 0.22),
      arcRot: new e.Euler(-Math.PI * 0.22, -0.36, 0.38, "XYZ"),
    },
    backhand: {
      baseDuration: 0.38,
      peakSpeedBase: 19.6,
      windupPos: new e.Vector3(0.44, 0.52, -0.18),
      apexPos: new e.Vector3(0.48, 0.68, 0.22),
      contactPos: new e.Vector3(0.4, 0.88, 0.46),
      carryPos: new e.Vector3(0.04, 1.26, 0.46),
      followPos: new e.Vector3(-0.38, 1.48, 0.34),
      windupRot: new e.Vector3(-0.78, 0.46, -0.68),
      lagRot: new e.Vector3(-0.92, 0.58, -0.82),
      contactRot: new e.Vector3(-0.42, -0.18, -0.64),
      followRot: new e.Vector3(0.36, -0.84, 0.62),
      offHandWindup: new e.Vector3(0.38, 0.56, -0.14),
      offHandContact: new e.Vector3(0.36, 0.88, 0.4),
      offHandFollow: new e.Vector3(0.42, 1.24, -0.16),
      arcRot: new e.Euler(-Math.PI * 0.22, 0.36, -0.38, "XYZ"),
    },
  },
  serve: {
    overhead: {
      baseDuration: 0.36,
      peakSpeedBase: 31.8,
      windupPos: new e.Vector3(-0.28, 1.46, -0.16),
      apexPos: new e.Vector3(-0.32, 1.54, 0.16),
      contactPos: new e.Vector3(-0.3, 1.52, 0.42),
      carryPos: new e.Vector3(-0.02, 1.02, 0.44),
      followPos: new e.Vector3(0.3, 0.64, 0.28),
      windupRot: new e.Vector3(-0.88, -0.35, 0.45),
      lagRot: new e.Vector3(-1.14, -0.46, 0.62),
      contactRot: new e.Vector3(0.48, 0.18, 0.26),
      followRot: new e.Vector3(1.32, 0.92, -0.68),
      offHandWindup: new e.Vector3(0.26, 1.46, 0.36),
      offHandContact: new e.Vector3(0.32, 1.06, 0.24),
      offHandFollow: new e.Vector3(0.38, 0.78, 0.14),
      arcRot: new e.Euler(-Math.PI * 0.16, -0.28, 0.44, "XYZ"),
    },
  },
};
function ae(w, n) {
  const r = ee[w] || ee.topspin;
  return r[n] || r.forehand || r.overhead || ee.topspin.forehand;
}
export function getRacketRimWorldPoints(w) {
  if (!w)
    return {
      tipWorld: new e.Vector3(0, 1.5, 0),
      throatWorld: new e.Vector3(0, 1.1, 0),
      centerWorld: new e.Vector3(0, 1.3, 0),
      normalWorld: new e.Vector3(0, 0, -1),
      whipSpeed: 0,
      shotType: "topspin",
    };
  w.root && typeof w.root.updateMatrixWorld == "function" && w.root.updateMatrixWorld(!0);
  const n = w.racketKinematics,
    r = n?.rimPoints?.tipWorld || new e.Vector3(),
    o = n?.rimPoints?.throatWorld || new e.Vector3(),
    t = n?.rimPoints?.centerWorld || new e.Vector3(),
    s = n?.rimPoints?.normalWorld || new e.Vector3(0, 0, 1);
  if (w.racketMesh && w.racketMesh.matrixWorld) {
    const a = w.racketMesh.matrixWorld;
    o.copy(Ae).applyMatrix4(a),
      t.copy(ke).applyMatrix4(a),
      r.copy(He).applyMatrix4(a),
      $.getNormalMatrix(a),
      s.copy(me).applyMatrix3($).normalize();
  } else if (w.racketPivot && w.racketPivot.matrixWorld) {
    const a = w.racketPivot.matrixWorld;
    o.copy(Ce).applyMatrix4(a),
      t.copy(We).applyMatrix4(a),
      r.copy(Ee).applyMatrix4(a),
      $.getNormalMatrix(a),
      s.copy(me).applyMatrix3($).normalize();
  } else {
    const a = w.pos || new e.Vector3();
    o.set(a.x + 0.36, a.y + 1.12, a.z),
      t.set(a.x + 0.36, a.y + 1.32, a.z),
      r.set(a.x + 0.36, a.y + 1.54, a.z),
      s.set(0, 0, w.sideSign > 0 ? -1 : 1);
  }
  const c = n ? n.currentWhipSpeed : 0,
    d = n ? n.swingShotType : w.swingType || "topspin",
    S = { tipWorld: r, throatWorld: o, centerWorld: t, normalWorld: s, whipSpeed: c, shotType: d };
  return n && (n.rimPoints = S), S;
}
// NATPF (diagnostica del 30/10, C9): lo swing del servizio parte quando la palla è colpita; nel lancio chi serve tiene già
// la posizione «trofeo» (windupPos del servizio), quindi lo swing salta la carica e parte da lì (startFrac della durata).
// Prima ripartiva dal fianco e la racchetta arrivava sopra la testa 100–170 ms dopo il colpo.
export const SERVE_SWING = Object.freeze({ startFrac: 0.18 });
export class RacketKinematicsController {
  constructor(n = {}) {
    (this.posSpringStiffness = n.posSpringStiffness ?? 195),
      (this.posSpringDamping = n.posSpringDamping ?? 21.5),
      (this.rotSpringStiffness = n.rotSpringStiffness ?? 240),
      (this.rotSpringDamping = n.rotSpringDamping ?? 22),
      (this.anticipationRangeMeters = n.anticipationRangeMeters ?? 8.5),
      (this.recoilFrequencyHz = n.recoilFrequencyHz ?? 45),
      (this.recoilDurationSec = n.recoilDurationSec ?? 0.11),
      (this._actorCounter = 0);
  }
  initActor(n) {
    if (!n) return null;
    if (n.racketKinematics) return n.racketKinematics;
    n.racketMesh && n.racketMesh.rotation && n.racketMesh.rotation.set(0, 0, 0);
    const r =
        n.role === "player"
          ? 0
          : n.role === "player_partner"
            ? 1.37
            : n.role === "opponent"
              ? 2.74
              : 4.11 + this._actorCounter++ * 0.91,
      o = {
        wristSpringPos: new e.Vector3(0, 0, 0),
        wristSpringVel: new e.Vector3(0, 0, 0),
        wristSpringEuler: new e.Vector3(0, 0, 0),
        wristSpringOmega: new e.Vector3(0, 0, 0),
        idleTwitchTimer: r * 0.5,
        idleTwitchPhase: r,
        idleSpinAngle: 0,
        idleSpinVel: 0,
        idleSpinCooldown: 0.85 + (r % 1.1),
        microWaggleAmp: 1,
        activeStanceSide: "forehand",
        stanceSideBlend: 0,
        rallyTurnOriginX: n.pos ? n.pos.x : 0,
        lastBallHitter: "",
        lastVisualSwingTimestamp: 0,
        anticipationCharge: 0,
        anticipationSide: "forehand",
        anticipationHeight: 1.05,
        prepCharge: 0,
        prepSide: "forehand",
        swingActive: !1,
        swingElapsed: 0,
        swingDuration: 0.33,
        swingProgress: 0,
        swingPhase: "idle",
        swingShotType: "topspin",
        swingSide: "forehand",
        swingSpeedMult: 1.15,
        timingQuality: "sweet",
        isServe: !1,
        aimDirX: 0,
        startChargeAtSwing: 0,
        whipSnapImpulseApplied: !1,
        recoilTimer: 0,
        recoilIntensity: 0,
        recoilPhase: 0,
        currentWhipSpeed: 1.8,
        peakWhipSpeed: 0,
        handGripTargetPos: U.clone(),
        handGripTargetRot: W.clone(),
        offHandTargetPos: Z.clone(),
        handGripOffset: new e.Vector3(0, 0, 0),
        offHandOffset: new e.Vector3(0, 0, 0),
        prevActorVel: new e.Vector3(0, 0, 0),
        prevTipWorld: new e.Vector3(0, 0, 0),
        hasPrevTipWorld: !1,
        lastSyncedSwingTimer: 0,
        rimPoints: {
          tipWorld: new e.Vector3(),
          throatWorld: new e.Vector3(),
          centerWorld: new e.Vector3(),
          normalWorld: new e.Vector3(0, 0, 1),
          whipSpeed: 0,
          shotType: "topspin",
        },
        getRacketRimWorldPoints: () => this.getRacketRimWorldPoints(n),
      };
    return (n.racketKinematics = o), o;
  }
  initAllActors(...n) {
    return n
      .flat()
      .filter(Boolean)
      .map((o) => this.initActor(o));
  }
  triggerSwing(n, r = {}) {
    if (!n) return null;
    const o = n.racketKinematics || this.initActor(n);
    n.racketMesh && n.racketMesh.rotation && n.racketMesh.rotation.set(0, 0, 0);
    const t = !!(r.isServe || String(r.shotType || "").toLowerCase() === "serve"),
      s = ze(r.shotType, t);
    let c =
      r.side && r.side !== "auto"
        ? r.side
        : t
          ? "overhead"
          : o.anticipationCharge > 0.12
            ? o.anticipationSide
            : n.swingType || o.activeStanceSide || "forehand";
    const d = n._engineRef || r.engine || null;
    if (
      !t &&
      s !== "smash" &&
      c !== "overhead" &&
      !r.isPracticeSwing &&
      d &&
      d.phase === "RALLY" &&
      !d.showcaseMode &&
      d.ball &&
      d.ball.inPlay
    ) {
      // NATPF B15: il lato dalla palla nel riferimento di chi colpisce, con la sua mano (actor.natpfHand, natpf_hand.js):
      // per il mancino la palla alla sua sinistra è il dritto. Prima la regola del destro sovrascriveva il lato dato dal
      // motore e il dritto del mancino diventava un rovescio (anche in actor.swingType, letto dall'allenamento)
      const m = ((n.sideSign || 1) >= 0 ? 1 : -1) * (n.natpfHand === "left" ? -1 : 1),
        R = d.ball.pos.x * m,
        x =
          d.ball.targetLanding && typeof d.ball.targetLanding.x == "number" ? d.ball.targetLanding.x * m : R,
        K = (typeof o.rallyTurnOriginX == "number" ? o.rallyTurnOriginX : 0) * m,
        _ = R - K,
        B = (d.ball.pos.x - (n.pos?.x || 0)) * m,
        D = Number(r.dirX ?? 0) * m;
      o.anticipationCharge > 0.15 && (o.anticipationSide === "forehand" || o.anticipationSide === "backhand")
        ? (c = o.anticipationSide)
        : R < -0.22 ||
            x < -0.25 ||
            _ < -0.28 ||
            (Math.abs(R) <= 0.25 && D < -0.15) ||
            (Math.abs(R) <= 0.25 && B < -0.04)
          ? (c = "backhand")
          : (R > 0.22 ||
              x > 0.25 ||
              _ > 0.28 ||
              (Math.abs(R) <= 0.25 && D > 0.15) ||
              (Math.abs(R) <= 0.25 && B >= -0.04)) &&
            (c = "forehand");
    }
    const S = _e(c, s, t),
      a = p(Number(r.speed ?? 1.15), 0.78, 1.85),
      u = Be(r.timing),
      v = ae(s, S),
      z = p(Math.pow(a / 1.15, 0.55), 0.8, 1.32),
      P = p(v.baseDuration / z, 0.22, 0.44);
    // NATPF: il servizio salta la carica (SERVE_SWING); startFrac esplicito per chi la vuole intera (0)
    const sf = p(Number(r.startFrac ?? (t ? SERVE_SWING.startFrac : 0)) || 0, 0, 0.3);
    (o.swingActive = !0),
      (o.swingElapsed = sf * P),
      (o.swingDuration = P),
      (o.swingProgress = 0),
      (o.swingPhase = "windup"),
      (o.swingShotType = s),
      (o.swingSide = S),
      (S === "forehand" || S === "backhand") &&
        ((o.activeStanceSide = S), (o.anticipationSide = S), (o.prepSide = S)),
      (o.swingSpeedMult = a),
      (o.timingQuality = u),
      (o.isServe = t),
      (o.aimDirX = p(Number(r.dirX ?? 0), -1, 1)),
      (o.startChargeAtSwing = o.anticipationCharge),
      (o.whipSnapImpulseApplied = !1),
      (o.peakWhipSpeed = 0);
    const b = S === "backhand" ? -1 : 1;
    return (
      o.wristSpringPos.multiplyScalar(0.2),
      o.wristSpringEuler.multiplyScalar(0.2),
      o.wristSpringVel.set(-0.35 * b * a, 0, -1.1 * a),
      o.wristSpringOmega.set(-5.2 * a, -5.8 * b * a, 4.5 * b * a),
      (n.swingType = t ? "serve" : s === "smash" || S === "overhead" ? "smash" : S),
      (n.swingDuration = P),
      (n.swingTimer = P - o.swingElapsed),
      (o.lastSyncedSwingTimer = n.swingTimer),
      (n.arcVisibleTimer = Math.max(n.arcVisibleTimer || 0, P + 0.06)),
      n.swingArcMesh && (n.swingArcMesh.visible = !0),
      o
    );
  }
  triggerImpactRecoil(n, r = 1) {
    if (!n) return null;
    const o = n.racketKinematics || this.initActor(n),
      t = p(Number(r ?? 1), 0.25, 2.25);
    (o.recoilTimer = this.recoilDurationSec), (o.recoilIntensity = t), (o.recoilPhase = 0);
    const s = o.swingSide === "backhand" ? -1 : 1;
    return (
      (o.wristSpringVel.z -= 1.45 * t),
      (o.wristSpringVel.y += 0.65 * t),
      (o.wristSpringOmega.x -= 9.5 * t),
      (o.wristSpringOmega.y -= 7.2 * s * t),
      (o.wristSpringOmega.z += 8.4 * s * t),
      o
    );
  }
  getRacketRimWorldPoints(n) {
    return getRacketRimWorldPoints(n);
  }
  _resolveLiveInput(n, r = {}) {
    const o = r.liveInput || {};
    let t = Number(o.tiltPitch ?? o.pitch ?? 0),
      s = Number(o.tiltRoll ?? o.roll ?? 0),
      c = Number(o.tiltYaw ?? o.yaw ?? 0),
      d = Number(o.mouseVelX ?? o.vx ?? 0),
      S = Number(o.mouseVelY ?? o.vy ?? 0),
      a = Number(o.accelMag ?? 0);
    const u = r.motionController,
      v =
        n.role === "player" ||
        n.role === "player_partner" ||
        (r.isMultiplayer && (n.role === "opponent" || n.role === "opponent_partner"));
    if (u && v) {
      const z = n.role === "opponent" || n.role === "opponent_partner",
        P = z ? u.p2PhoneState : u.phoneState;
      if (
        (P &&
          P.connected &&
          P.orientation &&
          (o.tiltPitch || (t = Number(P.orientation.pitch || 0) * 0.01745),
          o.tiltRoll || (s = Number(P.orientation.roll || 0) * 0.01745),
          o.tiltYaw || (c = Number(P.orientation.yaw || 0) * 0.01745),
          o.accelMag || (a = Number(P.orientation.accelMag || 0))),
        !z)
      ) {
        if (!o.mouseVelX && u.mouseTrail && u.mouseTrail.length >= 2) {
          const b = u.mouseTrail.length,
            m = u.mouseTrail[b - 1],
            R = u.mouseTrail[Math.max(0, b - 3)],
            x = Math.max(8, m.t - R.t);
          (d = ((m.x - R.x) / x) * 1.8), (S = ((m.y - R.y) / x) * 1.8);
        } else
          !o.mouseVelX &&
            u.webcamActive &&
            u.motionVector &&
            ((d = Number(u.motionVector.vx || 0) * 1.6),
            (S = Number(u.motionVector.vy || 0) * 1.6),
            (a = Math.max(a, Number(u.motionVector.mag || 0) * 1.5)));
        !o.tiltYaw && typeof u.aimBiasX == "number" && (c += u.aimBiasX * 0.35);
      }
    }
    return (
      Math.abs(t) > 3.2 && (t *= Math.PI / 180),
      Math.abs(s) > 3.2 && (s *= Math.PI / 180),
      Math.abs(c) > 3.2 && (c *= Math.PI / 180),
      {
        tiltPitch: p(t, -1.2, 1.2),
        tiltRoll: p(s, -1.2, 1.2),
        tiltYaw: p(c, -1.2, 1.2),
        mouseVelX: p(d, -6, 6),
        mouseVelY: p(S, -6, 6),
        accelMag: p(a, 0, 8),
        // NATPF: spostamento della mano vista dalla webcam (metri, riferimento del giocatore)
        handOffsetX: p(Number(o.handOffsetX ?? 0) || 0, -0.3, 0.3),
        handOffsetY: p(Number(o.handOffsetY ?? 0) || 0, -0.3, 0.3),
      }
    );
  }
  update(n, r, o = {}) {
    if (!n) return null;
    const t = n.racketKinematics || this.initActor(n),
      s = p(Number(r || 1 / 60), 5e-4, 0.05);
    n.racketMesh && n.racketMesh.rotation && n.racketMesh.rotation.set(0, 0, 0);
    const c = o.ball || null,
      d = o.phase || "RALLY",
      S = !!(o.isServer ?? (o.server && o.server === n.role)),
      a = this._resolveLiveInput(n, o);
    c && c.inPlay && c.lastHitter !== t.lastBallHitter
      ? ((t.lastBallHitter = c.lastHitter || ""), n.pos && (t.rallyTurnOriginX = n.pos.x))
      : (!c || !c.inPlay) && ((t.lastBallHitter = ""), n.pos && (t.rallyTurnOriginX = n.pos.x));
    const u = o.motionController;
    if (
      n.role === "player" &&
      u &&
      u.lastVisualSwing &&
      u.lastVisualSwing.timestamp > t.lastVisualSwingTimestamp &&
      ((t.lastVisualSwingTimestamp = u.lastVisualSwing.timestamp), !t.swingActive && d === "RALLY")
    ) {
      const l = u.lastVisualSwing,
        i = l.type === "backhand" ? "backhand" : l.type === "smash" ? "overhead" : "forehand";
      this.triggerSwing(n, {
        shotType: l.shotType || "topspin",
        side: i,
        speed: l.speed || 1.18,
        dirX: l.dirX || 0,
        isPracticeSwing: !0,
      });
    }
    if (
      !t.swingActive &&
      typeof n.swingTimer == "number" &&
      n.swingTimer > 0.24 &&
      n.swingTimer > t.lastSyncedSwingTimer + 0.04 &&
      d !== "REPLAY"
    ) {
      const l = n.swingType || "forehand",
        i = l === "serve" || d === "SERVE_TOSS",
        g = i
          ? "serve"
          : l === "smash"
            ? "smash"
            : c && c.shotType
              ? String(c.shotType).toLowerCase()
              : "topspin";
      this.triggerSwing(n, {
        shotType: g,
        side: l === "backhand" ? "backhand" : l === "smash" ? "overhead" : "forehand",
        speed: c?.isPowerShot ? 1.38 : 1.18,
        isServe: i,
      });
    }
    const v = n.vel || Pe.set(0, 0, 0),
      z = v.x - t.prevActorVel.x,
      P = v.z - t.prevActorVel.z;
    t.prevActorVel.copy(v);
    const b = n.sideSign > 0 ? -1 : 1,
      m = v.x * b,
      R = v.z * b,
      x = p((z * b) / s, -42, 42),
      K = p((P * b) / s, -42, 42);
    (t.wristSpringVel.x -= x * 0.0085 * s),
      (t.wristSpringVel.z -= K * 0.0085 * s),
      (t.wristSpringOmega.z += x * 0.068 * s),
      (t.wristSpringOmega.x -= K * 0.062 * s),
      (t.wristSpringOmega.y -= x * 0.045 * s);
    const _ = a.mouseVelX * b,
      B = Pe.set(
        p(-m * 0.012 + _ * 0.018 - a.tiltRoll * 0.055, -0.09, 0.09),
        p(Math.abs(m) * 0.008 - a.mouseVelY * 0.016 + a.tiltPitch * 0.05, -0.08, 0.08),
        p(-R * 0.012 + a.accelMag * 0.015, -0.08, 0.08),
      ),
      D = Oe.set(
        p(a.tiltPitch * 0.65 - a.mouseVelY * 0.14 - R * 0.032, -0.58, 0.58),
        p(a.tiltYaw * 0.55 + _ * 0.16 - m * 0.035, -0.65, 0.65),
        p(-a.tiltRoll * 0.72 - _ * 0.18 + m * 0.045, -0.68, 0.68),
      ),
      te = this.posSpringStiffness,
      ne = this.posSpringDamping;
    // NATPF: la mano reale (webcam) sposta polso e racchetta, oltre le piccole oscillazioni del motore base.
    // Nel riferimento del personaggio la destra del giocatore è -x (la racchetta a riposo sta a x = -0,36).
    (B.x -= a.handOffsetX), (B.y += a.handOffsetY);
    (t.wristSpringVel.x += ((B.x - t.wristSpringPos.x) * te - t.wristSpringVel.x * ne) * s),
      (t.wristSpringVel.y += ((B.y - t.wristSpringPos.y) * te - t.wristSpringVel.y * ne) * s),
      (t.wristSpringVel.z += ((B.z - t.wristSpringPos.z) * te - t.wristSpringVel.z * ne) * s),
      t.wristSpringPos.addScaledVector(t.wristSpringVel, s);
    const oe = this.rotSpringStiffness,
      ie = this.rotSpringDamping;
    (t.wristSpringOmega.x += ((D.x - t.wristSpringEuler.x) * oe - t.wristSpringOmega.x * ie) * s),
      (t.wristSpringOmega.y += ((D.y - t.wristSpringEuler.y) * oe - t.wristSpringOmega.y * ie) * s),
      (t.wristSpringOmega.z += ((D.z - t.wristSpringEuler.z) * oe - t.wristSpringOmega.z * ie) * s),
      t.wristSpringEuler.addScaledVector(t.wristSpringOmega, s);
    let G = 0;
    // NATPF B15: lato della preparazione e della posizione dalla palla nel riferimento di chi colpisce, con la sua mano
    // (il mancino prepara il dritto sulla palla alla sua sinistra)
    const L = ((n.sideSign || 1) >= 0 ? 1 : -1) * (n.natpfHand === "left" ? -1 : 1);
    if (c && c.inPlay && d === "RALLY" && !t.swingActive) {
      const l = n.sideSign > 0 && (c.vel.z > 0.4 || c.lastHitter === "opponent"),
        i = n.sideSign < 0 && (c.vel.z < -0.4 || c.lastHitter === "player");
      if (l || i) {
        const g = c.pos.x - n.pos.x,
          T = c.pos.z - n.pos.z,
          O = Math.hypot(g, T),
          C = c.pos.x * L,
          j = c.targetLanding && typeof c.targetLanding.x == "number" ? c.targetLanding.x * L : C,
          y = t.rallyTurnOriginX * L,
          h = C - y,
          k = g * L;
        c.pos.y > 1.85 && O < 5.5
          ? (t.anticipationSide = "overhead")
          : j < -0.22 || C < -0.22 || h < -0.28 || (Math.abs(C) <= 0.22 && k < -0.08)
            ? ((t.anticipationSide = "backhand"), (t.activeStanceSide = "backhand"))
            : (j > 0.22 || C > 0.22 || h > 0.28 || (Math.abs(C) <= 0.22 && k >= -0.08)) &&
              ((t.anticipationSide = "forehand"), (t.activeStanceSide = "forehand"));
        const H = n.sideSign > 0 ? T : -T;
        if (O <= this.anticipationRangeMeters && H <= 1.25) {
          t.anticipationHeight = e.MathUtils.lerp(
            t.anticipationHeight,
            p(c.pos.y, 0.55, 2.2),
            1 - Math.exp(-12 * s),
          );
          const N = 1 - (O - 1.45) / (this.anticipationRangeMeters - 1.45);
          G = Y(p(N, 0, 1));
        }
      }
    }
    // NATPF: preparazione vera dal telefono (racchetta portata indietro): carica e lato seguono chi gioca
    const natpfPrep = n.userData && n.userData.natpfPrep;
    natpfPrep && !t.swingActive && performance.now() < natpfPrep.until &&
      ((G = Math.max(G, natpfPrep.amount)), (t.anticipationSide = t.activeStanceSide = natpfPrep.side));
    !t.swingActive && G < 0.15 && d === "RALLY"
      ? m > 1.25 || a.mouseVelX * L < -1.8
        ? (t.activeStanceSide = "backhand")
        : (m < -1.25 || a.mouseVelX * L > 1.8) && (t.activeStanceSide = "forehand")
      : (d === "SERVE_STANCE" || d === "SERVE_TOSS") && (t.activeStanceSide = "forehand");
    const ye = t.activeStanceSide === "backhand" ? 1 : 0;
    t.stanceSideBlend = e.MathUtils.lerp(t.stanceSideBlend, ye, 1 - Math.exp(-14 * s));
    const Me = G > t.anticipationCharge ? 11.5 : 7.5;
    (t.anticipationCharge = e.MathUtils.lerp(t.anticipationCharge, G, 1 - Math.exp(-Me * s))),
      (t.prepCharge = t.anticipationCharge),
      (t.prepSide = t.anticipationSide);
    const ce = Re.lerpVectors(U, ue, t.stanceSideBlend),
      le = new e.Vector3().lerpVectors(Z, Ve, t.stanceSideBlend),
      pe = e.MathUtils.lerp(W.x, J.x, t.stanceSideBlend),
      we = e.MathUtils.lerp(W.y, J.y, t.stanceSideBlend),
      de = e.MathUtils.lerp(W.z, J.z, t.stanceSideBlend),
      Te = v.length(),
      be =
        (d === "RALLY" && c?.inPlay ? 1.22 : 1) +
        t.anticipationCharge * 0.38 +
        p(Te * 0.04, 0, 0.35) +
        p(a.accelMag * 0.12, 0, 0.35);
    (t.microWaggleAmp = e.MathUtils.lerp(t.microWaggleAmp, be, 1 - Math.exp(-10 * s))),
      (t.idleTwitchTimer += s * (1 + t.anticipationCharge * 0.28)),
      (t.idleSpinCooldown -= s),
      t.idleSpinCooldown <= 0 &&
        !t.swingActive &&
        ((t.idleSpinCooldown = 1.25 + ((t.idleTwitchPhase * 0.73) % 1.15)),
        (t.idleSpinVel = (Math.sin(t.idleTwitchTimer * 3.7) >= 0 ? 1 : -1) * 5.2)),
      (t.idleSpinVel += (-t.idleSpinAngle * 140 - t.idleSpinVel * 14) * s),
      (t.idleSpinAngle += t.idleSpinVel * s);
    const A = t.idleTwitchTimer,
      F = t.idleTwitchPhase,
      X = Math.sin(A * 9.5 + F) + 0.45 * Math.sin(A * 17.2 + F * 1.7),
      I = Math.cos(A * 4.75 + F * 0.85) + 0.38 * Math.sin(A * 13.4 + F * 2.1),
      Q = Math.sin(A * 11.8 + F * 1.3) * 0.65 + t.idleSpinAngle,
      V = new e.Vector3(),
      f = new e.Vector3(),
      M = new e.Vector3();
    let E = 0;
    if (t.swingActive) {
      t.swingElapsed += s;
      const l = p(t.swingElapsed / Math.max(0.001, t.swingDuration), 0, 1);
      (t.swingProgress = l),
        (n.swingTimer = Math.max(0, t.swingDuration - t.swingElapsed)),
        (t.lastSyncedSwingTimer = n.swingTimer);
      const i = ae(t.swingShotType, t.swingSide),
        g = t.swingSide === "backhand" ? -1 : 1,
        T = t.swingSide === "backhand" ? ue : U,
        O = t.swingSide === "backhand" ? J : W,
        C = t.swingSide === "backhand" ? Ve : Z,
        j = t.timingQuality === "early" ? 0.18 * g : t.timingQuality === "late" ? -0.18 * g : 0;
      if (l < 0.18) {
        t.swingPhase = "windup";
        const y = Y(l / 0.18),
          h = p(t.startChargeAtSwing * 0.75 + y * (1 - t.startChargeAtSwing * 0.75), 0, 1);
        V.lerpVectors(T, i.windupPos, h),
          (V.z -= Math.sin(y * Math.PI) * 0.05),
          (f.x = e.MathUtils.lerp(O.x, i.windupRot.x, h)),
          (f.y = e.MathUtils.lerp(O.y, i.windupRot.y, h)),
          (f.z = e.MathUtils.lerp(O.z, i.windupRot.z, h)),
          M.lerpVectors(C, i.offHandWindup, h),
          (E = (5.5 + 8.5 * y) * t.swingSpeedMult);
      } else if (l < 0.46) {
        t.swingPhase = "whip";
        const y = p((l - 0.18) / 0.28, 0, 1),
          h = p(Math.pow(y, 1.35) * (2.35 - 1.35 * y), 0, 1);
        if (
          (!t.whipSnapImpulseApplied &&
            l >= 0.3 &&
            ((t.whipSnapImpulseApplied = !0),
            (t.wristSpringOmega.x += 12.5 * t.swingSpeedMult),
            (t.wristSpringOmega.y += 14 * g * t.swingSpeedMult),
            (t.wristSpringOmega.z -= 14 * g * t.swingSpeedMult)),
          h < 0.58)
        ) {
          const H = h / 0.58;
          se(V, i.windupPos, i.apexPos, i.contactPos, H);
        } else {
          const H = (h - 0.58) / 0.42;
          se(V, i.contactPos, i.carryPos, i.followPos, H * 0.55);
        }
        if (y < 0.32) {
          const H = Y(y / 0.32);
          f.lerpVectors(i.windupRot, i.lagRot, H);
        } else {
          const H = p((y - 0.32) / 0.68, 0, 1),
            N = 1 - Math.pow(1 - H, 2.65);
          if ((f.lerpVectors(i.lagRot, i.contactRot, p(N * 1.25, 0, 1)), N > 0.72)) {
            const xe = (N - 0.72) / 0.28;
            f.lerp(i.followRot, xe * 0.45);
          }
        }
        (f.y += j + t.aimDirX * 0.16), M.lerpVectors(i.offHandWindup, i.offHandContact, h);
        const k = Math.exp(-Math.pow((l - 0.34) / 0.085, 2));
        E = (10.5 + (i.peakSpeedBase - 10.5) * k) * t.swingSpeedMult;
      } else {
        t.swingPhase = "follow_through";
        const y = p((l - 0.46) / 0.54, 0, 1);
        if (y < 0.48) {
          const h = Y(y / 0.48);
          se(V, i.contactPos, i.carryPos, i.followPos, 0.55 + 0.45 * h);
          const k = Math.sin(h * Math.PI) * 0.055 * t.swingSpeedMult;
          (V.x += g * k),
            (V.y += k * 0.65),
            f.lerpVectors(i.contactRot, i.followRot, h),
            (f.y += g * k * 2.2),
            (f.z -= g * k * 1.8),
            M.lerpVectors(i.offHandContact, i.offHandFollow, h),
            (E = e.MathUtils.lerp(i.peakSpeedBase * 0.62, 5.2, h) * t.swingSpeedMult);
        } else {
          const h = Y((y - 0.48) / 0.52);
          V.lerpVectors(i.followPos, ce, h),
            (f.x = e.MathUtils.lerp(i.followRot.x, pe, h)),
            (f.y = e.MathUtils.lerp(i.followRot.y, we, h)),
            (f.z = e.MathUtils.lerp(i.followRot.z, de, h)),
            M.lerpVectors(i.offHandFollow, le, h),
            (E = e.MathUtils.lerp(5.2, 2, h));
        }
      }
      n.swingArcMesh && i.arcRot && n.swingArcMesh.rotation.copy(i.arcRot),
        t.swingElapsed >= t.swingDuration &&
          ((t.swingActive = !1),
          (t.swingPhase = "idle"),
          (t.swingProgress = 0),
          (t.anticipationCharge = 0),
          (t.prepCharge = 0),
          (n.swingTimer = 0),
          (t.lastSyncedSwingTimer = 0));
    } else {
      t.swingPhase = "idle";
      const l = t.microWaggleAmp;
      if (
        (V.copy(ce),
        (V.x += I * 0.018 * l),
        (V.y += X * 0.024 * l + Math.sin(this.posSpringStiffness * 0.02 + A * 4.2) * 0.012),
        (V.z += I * 0.015 * l),
        f.set(pe + X * 0.085 * l, we + I * 0.095 * l, de + Q * 0.078 * l),
        M.copy(le),
        (M.y += X * 0.016 * l),
        (M.z += I * 0.014 * l),
        d === "SERVE_STANCE" && S)
      ) {
        const i = Math.sin(A * 7.8) + 0.35 * Math.sin(A * 15.6);
        V.set(-0.28, 0.94 + i * 0.032, 0.24),
          f.set(0.45 + i * 0.11, -0.32, 0.28 + Q * 0.08),
          M.set(0.2, 0.92 + Math.cos(A * 7.8) * 0.025, 0.26);
      } else if (d === "SERVE_TOSS" && S) {
        const i = ee.serve.overhead,
          g = c ? p((c.pos.y - 1.15) / 1.65, 0, 1) : 0.85,
          T = Y(g);
        V.lerpVectors(U, i.windupPos, T),
          (V.y += X * 0.015),
          f.set(
            e.MathUtils.lerp(W.x, i.windupRot.x, T) + X * 0.06,
            e.MathUtils.lerp(W.y, i.windupRot.y, T) + I * 0.05,
            e.MathUtils.lerp(W.z, i.windupRot.z, T) + Q * 0.05,
          ),
          M.lerpVectors(Z, i.offHandWindup, T);
      } else if (t.anticipationCharge > 0.01) {
        const i = ae("topspin", t.anticipationSide),
          g = t.anticipationCharge;
        V.lerp(i.windupPos, g * 0.88);
        const T = p((t.anticipationHeight - 1.05) * 0.22, -0.14, 0.24) * g;
        (V.y += T),
          (f.x = e.MathUtils.lerp(f.x, i.windupRot.x, g * 0.88) + X * 0.065 * g),
          (f.y = e.MathUtils.lerp(f.y, i.windupRot.y, g * 0.88) + I * 0.065 * g),
          (f.z = e.MathUtils.lerp(f.z, i.windupRot.z, g * 0.88) + Q * 0.055 * g),
          M.lerp(i.offHandWindup, g * 0.9);
      }
      E =
        1.65 * l +
        t.wristSpringVel.length() * 1.4 +
        t.wristSpringOmega.length() * 0.65 +
        t.anticipationCharge * 3.2;
    }
    let ge = 0,
      he = 0,
      fe = 0,
      Se = 0;
    if (t.recoilTimer > 0) {
      (t.recoilTimer = Math.max(0, t.recoilTimer - s)),
        (t.recoilPhase += s * this.recoilFrequencyHz * Math.PI * 2);
      const l = Math.pow(t.recoilTimer / this.recoilDurationSec, 1.35) * t.recoilIntensity,
        i = Math.sin(t.recoilPhase),
        g = Math.cos(t.recoilPhase * 1.15);
      (ge = -Math.abs(i) * 0.032 * l), (he = g * 0.018 * l), (fe = i * 0.16 * l), (Se = g * 0.14 * l);
    }
    if (
      (t.handGripTargetPos.set(
        V.x + t.wristSpringPos.x,
        V.y + t.wristSpringPos.y + he,
        V.z + t.wristSpringPos.z + ge,
      ),
      t.handGripTargetRot.set(
        f.x + t.wristSpringEuler.x + fe,
        f.y + t.wristSpringEuler.y,
        f.z + t.wristSpringEuler.z + Se,
        "XYZ",
      ),
      t.offHandTargetPos.set(
        M.x + t.wristSpringPos.x * 0.35,
        M.y + t.wristSpringPos.y * 0.35,
        M.z + t.wristSpringPos.z * 0.35,
      ),
      t.handGripOffset.subVectors(t.handGripTargetPos, U),
      t.offHandOffset.subVectors(t.offHandTargetPos, Z),
      (t.isSwinging = t.swingActive),
      (t.swingType =
        t.swingSide === "backhand"
          ? "backhand"
          : t.swingShotType === "smash" || t.isServe
            ? "smash"
            : "forehand"),
      o.applyToRig !== !1 &&
        (n.racketPivot &&
          (n.racketPivot.position.copy(t.handGripTargetPos),
          n.racketPivot.rotation.copy(t.handGripTargetRot)),
        !n.rig))
    ) {
      const l = n.parts?.handR;
      l && l.userData?.basePos && l.position.copy(l.userData.basePos).add(t.handGripOffset);
      const i = n.parts?.handL;
      i && i.userData?.basePos && i.position.copy(i.userData.basePos).add(t.offHandOffset);
    }
    const q = this.getRacketRimWorldPoints(n);
    let re = 0;
    if (t.hasPrevTipWorld && (!t.swingActive || t.swingElapsed > s * 1.4)) {
      const l = Re.subVectors(q.tipWorld, t.prevTipWorld).length();
      l < 1.8 && (re = l / s);
    }
    t.prevTipWorld.copy(q.tipWorld), (t.hasPrevTipWorld = !0);
    const ve = t.swingActive ? E * 0.72 + Math.min(re, 38) * 0.28 : p(re * 0.65 + E * 0.45, 1.2, 16);
    return (
      (t.currentWhipSpeed = e.MathUtils.lerp(t.currentWhipSpeed, ve, t.swingActive ? 0.75 : 0.38)),
      t.swingActive && t.currentWhipSpeed > t.peakWhipSpeed && (t.peakWhipSpeed = t.currentWhipSpeed),
      (q.whipSpeed = t.currentWhipSpeed),
      (q.shotType = t.swingShotType),
      t
    );
  }
  updateAll(n, r, o = {}) {
    if (!n) return;
    const t = Array.isArray(n) ? n : Object.values(n);
    for (const s of t) s && this.update(s, r, o);
  }
  static getRacketRimWorldPoints(n) {
    return getRacketRimWorldPoints(n);
  }
}
export default RacketKinematicsController;
