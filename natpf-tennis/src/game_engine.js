import * as o from "three";
import { GLTFLoader as D } from "../assets/vendor/GLTFLoader.js";
import { HudUI as Y } from "./hud_ui.js";
import * as z from "./motion_controls.js";
import * as U from "./audio_engine.js";
import { RacketKinematicsController as Z } from "./racket_kinematics.js";
import {
  upgradePlayerCharacterMaterials as $,
  upgradeRacketMaterials as q,
  updateCharacterContactShadow as j,
} from "./player_materials.js";
import { PlayerBodyAnimator as Q } from "./player_body_animation.js";
import { PlayerFacialFXController as J } from "./player_facial_fx.js";
import { SwingVFXManager as ee } from "./swing_vfx.js";
// NATPF: arena delle Nitto ATP Finals, smartphone come racchetta, prima persona, formato 1v1
import { installNatpfArena } from "./natpf/natpf_arena.js";
import { NatpfPhoneRacket } from "./natpf/natpf_phone_racket.js";
import {
  VIEW_STORAGE_KEY,
  normalizeViewMode,
  firstPersonPose,
  firstPersonFov,
  setFirstPersonBody,
  FIRST_PERSON,
} from "./natpf/natpf_camera.js";
import { resolveMatchFormat } from "./natpf/match_format.js";
import { NatpfUi } from "./natpf/natpf_ui.js";
// NATPF: personaggio, racchetta e pallina procedurali (niente GLB esterni)
import { createNatpfCast, finishNatpfActor, updateNatpfCharacters } from "./natpf/natpf_character.js";
// NATPF skill gap: assistenza del tempo graduata, mira e rischio del giocatore, limiti ed errori della CPU
import * as NS from "./natpf/natpf_skill.js";
import { NatpfBodyFollow } from "./natpf/webcam_body_follow.js";
// NATPF: sfida tra due computer anche senza server (sito statico): relay nel browser dell'host e WebRTC
import { installNatpfP2p } from "./natpf/natpf_p2p.js";
const readStoredView = () => {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY);
  } catch {
    return null;
  }
};
const S = {
    BASELINE_Z: 11.89,
    SERVICE_LINE_Z: 6.4,
    SINGLES_X: 4.115,
    DOUBLES_X: 5.485,
    NET_HEIGHT_CENTER: 0.914,
    NET_HEIGHT_POST: 1.07,
    NET_POST_X: 6.4,
  },
  L = { FIXED_DT: 1 / 120, GRAVITY: 9.15, AIR_DRAG: 0.012, BOUNCE_RESTITUTION: 0.77, SURFACE_FRICTION: 0.86 },
  W = ["00", "15", "30", "40"];
class te {
  constructor(e, t = 45) {
    (this.scene = e),
      (this.maxPoints = t),
      (this.points = []),
      (this.color = new o.Color(16777215)),
      (this.accentColor = new o.Color(16773494)),
      (this.baseWidth = 0.28);
    const i = t * 2;
    (this.positions = new Float32Array(i * 3)), (this.colors = new Float32Array(i * 4));
    const a = [];
    for (let s = 0; s < t - 1; s++) {
      const n = s * 2,
        h = n + 1,
        r = n + 2,
        l = n + 3;
      a.push(n, h, r, h, l, r);
    }
    (this.geometry = new o.BufferGeometry()),
      this.geometry.setAttribute("position", new o.BufferAttribute(this.positions, 3)),
      this.geometry.setAttribute("color", new o.BufferAttribute(this.colors, 4)),
      this.geometry.setIndex(a),
      (this.material = new o.MeshBasicMaterial({
        vertexColors: !0,
        transparent: !0,
        opacity: 0.95,
        side: o.DoubleSide,
        depthWrite: !1,
        blending: o.NormalBlending,
      })),
      (this.mesh = new o.Mesh(this.geometry, this.material)),
      (this.mesh.frustumCulled = !1),
      (this.mesh.renderOrder = 6),
      this.scene.add(this.mesh);
  }
  setStyle(e = "TOPSPIN", t = !1) {
    const i = String(e || "TOPSPIN").toUpperCase();
    t || i === "SMASH" || i === "POWER"
      ? (this.color.setHex(16777215), this.accentColor.setHex(5432831), (this.baseWidth = 0.3))
      : i === "SLICE"
        ? (this.color.setHex(16777215), this.accentColor.setHex(8974591), (this.baseWidth = 0.28))
        : i === "LOB"
          ? (this.color.setHex(16777215), this.accentColor.setHex(15661311), (this.baseWidth = 0.25))
          : (this.color.setHex(16777215), this.accentColor.setHex(16771925), (this.baseWidth = 0.28));
  }
  clear() {
    (this.points.length = 0), (this.mesh.visible = !1);
  }
  pushPoint(e) {
    this.points.unshift(e.clone()), this.points.length > this.maxPoints && this.points.pop();
  }
  seedArc(e, t, i = 0.85) {
    this.points.length = 0;
    for (let a = 0; a < this.maxPoints; a++) {
      const n = 1 - a / (this.maxPoints - 1),
        h = new o.Vector3().lerpVectors(e, t, n);
      (h.y += Math.sin(n * Math.PI) * i), this.points.push(h);
    }
    this.mesh.visible = !0;
  }
  updateGeometry(e) {
    const t = this.points.length;
    if (t < 2) {
      this.mesh.visible = !1;
      return;
    }
    this.mesh.visible = !0;
    const i = e.position,
      a = new o.Vector3(),
      s = new o.Vector3(),
      n = new o.Vector3(),
      h = new o.Color();
    for (let r = 0; r < this.maxPoints; r++) {
      const l = Math.min(r, t - 1),
        p = this.points[l],
        g = Math.min(l + 1, t - 1),
        c = Math.max(l - 1, 0);
      a.subVectors(this.points[c], this.points[g]),
        a.lengthSq() < 1e-6 ? a.set(0, 0, 1) : a.normalize(),
        s.subVectors(i, p).normalize(),
        n.crossVectors(a, s).normalize(),
        n.lengthSq() < 1e-4 && n.set(1, 0, 0);
      const y = 1 - l / Math.max(1, t - 1),
        f = this.baseWidth * (0.24 + 0.76 * Math.pow(y, 0.65)) * 0.5,
        m = Math.pow(y, 0.9) * 0.92;
      h.copy(this.color).lerp(this.accentColor, (1 - y) * 0.65);
      const d = r * 2,
        b = d + 1;
      (this.positions[d * 3 + 0] = p.x + n.x * f),
        (this.positions[d * 3 + 1] = p.y + n.y * f),
        (this.positions[d * 3 + 2] = p.z + n.z * f),
        (this.positions[b * 3 + 0] = p.x - n.x * f),
        (this.positions[b * 3 + 1] = p.y - n.y * f),
        (this.positions[b * 3 + 2] = p.z - n.z * f),
        (this.colors[d * 4 + 0] = h.r),
        (this.colors[d * 4 + 1] = h.g),
        (this.colors[d * 4 + 2] = h.b),
        (this.colors[d * 4 + 3] = m),
        (this.colors[b * 4 + 0] = h.r),
        (this.colors[b * 4 + 1] = h.g),
        (this.colors[b * 4 + 2] = h.b),
        (this.colors[b * 4 + 3] = m);
    }
    (this.geometry.attributes.position.needsUpdate = !0), (this.geometry.attributes.color.needsUpdate = !0);
  }
}
function se() {
  const P = new o.RingGeometry(0.22, 0.72, 28, 1, -Math.PI * 0.28, Math.PI * 0.56),
    e = P.attributes.position,
    t = new Float32Array(e.count * 4);
  for (let s = 0; s < e.count; s++) {
    const n = e.getX(s),
      h = e.getY(s),
      l = (Math.atan2(h, n) + Math.PI * 0.28) / (Math.PI * 0.56),
      g = (Math.hypot(n, h) - 0.22) / (0.72 - 0.22),
      c = Math.max(0, Math.min(1, l * (0.35 + 0.65 * g)));
    (t[s * 4 + 0] = 0.97), (t[s * 4 + 1] = 0.99), (t[s * 4 + 2] = 1), (t[s * 4 + 3] = c * 0.85);
  }
  P.setAttribute("color", new o.BufferAttribute(t, 4));
  const i = new o.MeshBasicMaterial({
      vertexColors: !0,
      transparent: !0,
      opacity: 0.88,
      side: o.DoubleSide,
      depthWrite: !1,
    }),
    a = new o.Mesh(P, i);
  return (a.visible = !1), (a.renderOrder = 7), a;
}
function ie() {
  const P = document.createElement("canvas");
  (P.width = 128), (P.height = 128);
  const e = P.getContext("2d"),
    t = e.createRadialGradient(64, 64, 6, 64, 64, 60);
  return (
    t.addColorStop(0, "rgba(10, 24, 8, 0.78)"),
    t.addColorStop(0.55, "rgba(10, 24, 8, 0.46)"),
    t.addColorStop(1, "rgba(10, 24, 8, 0.0)"),
    (e.fillStyle = t),
    e.fillRect(0, 0, 128, 128),
    new o.CanvasTexture(P)
  );
}
function ae() {
  const P = document.createElement("canvas");
  (P.width = 1024), (P.height = 512);
  const e = P.getContext("2d"),
    t = e.createLinearGradient(0, 0, 0, 320);
  t.addColorStop(0, "#2e86e6"),
    t.addColorStop(0.42, "#5cb2ff"),
    t.addColorStop(0.78, "#a6dcff"),
    t.addColorStop(1, "#def4ff"),
    (e.fillStyle = t),
    e.fillRect(0, 0, 1024, 512),
    [
      [120, 185, 95, 38],
      [180, 175, 110, 44],
      [250, 188, 85, 34],
      [460, 168, 120, 45],
      [535, 160, 130, 50],
      [610, 174, 95, 36],
      [820, 180, 115, 42],
      [895, 170, 125, 48],
      [960, 184, 90, 35],
    ].forEach(([s, n, h, r]) => {
      const l = e.createRadialGradient(s, n - r * 0.2, h * 0.1, s, n, h);
      l.addColorStop(0, "rgba(255, 255, 255, 0.92)"),
        l.addColorStop(0.6, "rgba(245, 252, 255, 0.55)"),
        l.addColorStop(1, "rgba(255, 255, 255, 0.0)"),
        (e.fillStyle = l),
        e.beginPath(),
        e.ellipse(s, n, h, r, 0, 0, Math.PI * 2),
        e.fill();
    });
  const a = new o.CanvasTexture(P);
  return (a.colorSpace = o.SRGBColorSpace), a;
}
export class NatpfTennisEngine {
  constructor() {
    (this.params = new URLSearchParams(window.location.search)),
      (this.urlState = (this.params.get("state") || "").toLowerCase()),
      (this.urlRoom = (this.params.get("room") || "").trim().toUpperCase()),
      (this.urlRole = (this.params.get("role") || "p1").trim().toLowerCase() === "p2" ? "p2" : "p1"),
      (this.urlMode = (this.params.get("mode") || this.params.get("difficulty") || "").toLowerCase()),
      (this.urlAutoPlay = this.params.has("play") || !!this.urlState),
      (this.roomId = this.urlRoom || "default"),
      (this.playerRole = this.urlRole),
      (this.isMultiplayer = !!(this.urlRoom && this.urlRoom !== "DEFAULT") || this.urlMode === "1v1"),
      // NATPF: solo singolare; il doppio del motore base resta nel motore dietro isDoubles (Opzione B, match_format.js)
      (this.matchFormat = resolveMatchFormat(this.params.get("format"))),
      (this.isDoubles = this.matchFormat.teamSize === 2),
      // NATPF: visuale in terza persona (quella del motore base) o in prima persona
      (this.viewMode = normalizeViewMode(this.params.get("view") || readStoredView())),
      (this.fpPose = { position: new o.Vector3(), target: new o.Vector3() }),
      (this.fpBodyActor = null),
      (this.roomStatus = {
        roomId: this.roomId,
        p1Online: !0,
        p2Online: !1,
        p1Phone: !1,
        p2Phone: !1,
        tunnelUrl: "",
        urls: null,
      }),
      (this.lastAppliedSnapshotSeq = 0),
      (this.lastSyncSentAt = 0),
      (this.bannerSeq = 0),
      (this.lastBannerBroadcast = null),
      (this.canvas = document.getElementById("game-canvas")),
      (this.renderer = new o.WebGLRenderer({
        canvas: this.canvas,
        antialias: !0,
        powerPreference: "high-performance",
      })),
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)),
      this.renderer.setSize(window.innerWidth, window.innerHeight),
      (this.renderer.shadowMap.enabled = !0),
      (this.renderer.shadowMap.type = o.PCFSoftShadowMap),
      (this.renderer.outputColorSpace = o.SRGBColorSpace),
      (this.renderer.toneMapping = o.ACESFilmicToneMapping),
      (this.renderer.toneMappingExposure = 1.12),
      (this.scene = new o.Scene()),
      (this.scene.background = new o.Color(7914239)),
      (this.scene.fog = new o.FogExp2(12313855, 0.0038)),
      (this.camera = new o.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 260)),
      (this.cameraMode = "RALLY_CAM"),
      (this.manualCameraOverride = null),
      (this.cameraPosSmooth = new o.Vector3(0, 7.8, 22.8)),
      (this.cameraLookSmooth = new o.Vector3(0, 0.35, 1.8)),
      (this.cameraTrauma = 0);
    const e = this.isMultiplayer
      ? "1v1"
      : ["casual", "pro", "1v1"].includes(this.urlMode)
        ? this.urlMode
        : "casual";
    (this.matchConfig = { gamesToWin: e === "1v1" ? 1 : 2, inputMode: "mouse", difficulty: e }),
      (this.score = {
        playerPoints: 0,
        opponentPoints: 0,
        playerGames: 0,
        opponentGames: 0,
        server: "player",
        deuceSide: !0,
      }),
      (this.phase = "TITLE"),
      (this.phaseTimer = 0),
      (this.selectedShotType = "TOPSPIN"),
      (this.p2SelectedShotType = "TOPSPIN"),
      (this.autoPlayMode = this.urlAutoPlay),
      (this.userHasInteracted = !1),
      (this.persistentStateLock = !1),
      (this.pendingUserSwing = null),
      (this.pendingP2Swing = null),
      (this.pendingServeSwing = null),
      (this.ball = {
        mesh: null,
        pos: new o.Vector3(0.85, 1.15, 11.6),
        vel: new o.Vector3(0, 0, 0),
        spin: new o.Vector3(0, 0, 0),
        inPlay: !1,
        lastHitter: "player",
        bounceCountOnCurrentSide: 0,
        shotType: "TOPSPIN",
        isPowerShot: !1,
        rallyStrokeCount: 0,
        targetLanding: new o.Vector3(0, 0, -8.5),
      }),
      (this.player = this._createActorState("player", 1, new o.Vector3(1.15, 0, S.BASELINE_Z))),
      (this.playerPartner = this._createActorState("player_partner", 1, new o.Vector3(-2.1, 0, 5.4))),
      (this.opponent = this._createActorState("opponent", -1, new o.Vector3(-1.35, 0, -S.BASELINE_Z))),
      (this.opponentPartner = this._createActorState("opponent_partner", -1, new o.Vector3(2.1, 0, -5.4))),
      this._applyDifficultyTuning(this.matchConfig.difficulty),
      (this.crowdScene = null),
      (this.cheerEnergy = 0.25),
      (this.ballTrail = new te(this.scene, 45)),
      (this.bounceRings = []),
      (this.starParticles = []),
      (this.racketKinematics = new Z()),
      (this.bodyAnimator = new Q()),
      (this.facialFX = new J(this.scene)),
      (this.swingVfx = new ee(this.scene)),
      this._setupLightingAndSky(),
      this._setupEffectsPools(),
      (this.natpfArena = installNatpfArena(this)),
      this._initHudAndControllers(),
      (this.clock = new o.Clock()),
      (this.physicsAccumulator = 0),
      (this.elapsedTime = 0),
      window.addEventListener("resize", () => this._onResize());
  }
  _createActorState(e, t, i) {
    const a = { player: 9.8, player_partner: 8.4, opponent: 5.85, opponent_partner: 5.2 };
    return {
      role: e,
      sideSign: t,
      root: new o.Group(),
      model: null,
      parts: {},
      racketPivot: new o.Group(),
      racketMesh: null,
      swingArcMesh: null,
      shadowBlob: null,
      pos: i.clone(),
      vel: new o.Vector3(),
      targetPos: i.clone(),
      maxSpeed: a[e] || 8.2,
      stridePhase: 0,
      swingTimer: 0,
      swingDuration: 0.34,
      swingCooldown: 0,
      swingType: "forehand",
      arcVisibleTimer: 0,
    };
  }
  _applyDifficultyTuning(e = "casual") {
    const t = String(e || "casual").toLowerCase();
    (this.matchConfig.difficulty = t),
      t === "1v1"
        ? ((this.isMultiplayer = !0),
          (this.matchConfig.gamesToWin = 1),
          (this.player.maxSpeed = 9.8),
          (this.playerPartner.maxSpeed = 8.4),
          (this.opponent.maxSpeed = 9.6),
          (this.opponentPartner.maxSpeed = 8.2))
        : t === "pro"
          ? ((this.isMultiplayer = !!(this.urlRoom && this.urlRoom !== "DEFAULT")),
            (this.player.maxSpeed = 9.8),
            (this.playerPartner.maxSpeed = 8.4),
            (this.opponent.maxSpeed = 7.65),
            (this.opponentPartner.maxSpeed = 6.6))
          : ((this.isMultiplayer = !!(this.urlRoom && this.urlRoom !== "DEFAULT")),
            (this.player.maxSpeed = 10.2),
            (this.playerPartner.maxSpeed = 8.6),
            (this.opponent.maxSpeed = 5.85),
            (this.opponentPartner.maxSpeed = 5.15));
    // NATPF skill gap: velocità della CPU per difficoltà (natpf_skill.js); nel 1v1 corre una persona
    t !== "1v1" && NS.skillLevel(t).cpuSpeed && (this.opponent.maxSpeed = NS.skillLevel(t).cpuSpeed);
    t !== "1v1" && NS.skillLevel(t).playerSpeed && (this.player.maxSpeed = NS.skillLevel(t).playerSpeed);
  }
  _setupLightingAndSky() {
    const e = new o.TextureLoader(),
      t = new o.SphereGeometry(185, 36, 20),
      i = new o.MeshBasicMaterial({ map: ae(), side: o.BackSide, depthWrite: !1, fog: !1 });
    (this.skyDome = new o.Mesh(t, i)),
      // NATPF: niente texture esterne per cielo, nuvole e orizzonte: l'arena NATPF è al chiuso e li toglie dalla scena
      this.scene.add(this.skyDome);
    const a = (c, y, f, m, d) => {
      const b = new o.CylinderGeometry(c, c, y, 48, 1, !0),
        u = new o.MeshBasicMaterial({
          transparent: !0,
          opacity: 0.92,
          side: o.BackSide,
          depthWrite: !1,
          fog: !1,
        }),
        w = new o.Mesh(b, u);
      return (
        (w.position.y = f),
        (w.renderOrder = d),
        (w.visible = !1),
        this.scene.add(w),
        m &&
          e.load(m, (x) => {
          (x.colorSpace = o.SRGBColorSpace),
            (x.wrapS = o.RepeatWrapping),
            (x.wrapT = o.ClampToEdgeWrapping),
            x.repeat.set(8, 1),
            (u.map = x),
            (u.needsUpdate = !0),
            (w.visible = !0);
        }),
        w
      );
    };
    (this.cloudRing2 = a(152, 54, 24, null, -2)), (this.cloudRing1 = a(138, 46, 19, null, -1));
    const s = new o.CylinderGeometry(96, 96, 15.5, 64, 1, !0),
      n = new o.MeshBasicMaterial({ transparent: !0, alphaTest: 0.15, side: o.BackSide, depthWrite: !1 });
    (this.horizonRing = new o.Mesh(s, n)),
      (this.horizonRing.position.y = 7.2),
      (this.horizonRing.visible = !1),
      this.scene.add(this.horizonRing);
    const h = new o.HemisphereLight(10935551, 5612068, 1.22);
    h.position.set(0, 40, 0),
      this.scene.add(h),
      (this.sunLight = new o.DirectionalLight(16775660, 2.55)),
      this.sunLight.position.set(14.5, 25, 15),
      (this.sunLight.castShadow = !0),
      (this.sunLight.shadow.mapSize.width = 2048),
      (this.sunLight.shadow.mapSize.height = 2048),
      (this.sunLight.shadow.camera.near = 2),
      (this.sunLight.shadow.camera.far = 75);
    const r = 22;
    (this.sunLight.shadow.camera.left = -r),
      (this.sunLight.shadow.camera.right = r),
      (this.sunLight.shadow.camera.top = r),
      (this.sunLight.shadow.camera.bottom = -r),
      (this.sunLight.shadow.bias = -4e-4),
      this.scene.add(this.sunLight);
    const l = new o.DirectionalLight(13362943, 0.72);
    l.position.set(-15, 16, -12), this.scene.add(l);
    const p = ie(),
      g = (c, y) => {
        const f = new o.PlaneGeometry(c * 2, c * 2);
        f.rotateX(-Math.PI / 2);
        const m = new o.MeshBasicMaterial({ map: p, transparent: !0, opacity: y, depthWrite: !1 }),
          d = new o.Mesh(f, m);
        return (d.position.y = 0.018), (d.renderOrder = 2), this.scene.add(d), d;
      };
    (this.player.shadowBlob = g(0.56, 0.82)),
      (this.playerPartner.shadowBlob = g(0.54, 0.78)),
      (this.opponent.shadowBlob = g(0.56, 0.82)),
      (this.opponentPartner.shadowBlob = g(0.54, 0.78)),
      (this.ballShadowBlob = g(0.34, 0.88));
  }
  _setupEffectsPools() {
    for (let t = 0; t < 6; t++) {
      const i = new o.RingGeometry(0.12, 0.24, 28);
      i.rotateX(-Math.PI / 2);
      const a = new o.MeshBasicMaterial({
          color: 16777215,
          transparent: !0,
          opacity: 0,
          side: o.DoubleSide,
          depthWrite: !1,
        }),
        s = new o.Mesh(i, a);
      (s.visible = !1),
        (s.position.y = 0.024),
        (s.renderOrder = 3),
        this.scene.add(s),
        this.bounceRings.push({ mesh: s, age: 0, active: !1 });
    }
    const e = new o.OctahedronGeometry(0.085, 0);
    for (let t = 0; t < 36; t++) {
      const i = new o.MeshBasicMaterial({
          color: t % 2 === 0 ? 16771624 : 4777471,
          transparent: !0,
          opacity: 0,
          depthWrite: !1,
        }),
        a = new o.Mesh(e, i);
      (a.visible = !1),
        (a.renderOrder = 8),
        this.scene.add(a),
        this.starParticles.push({ mesh: a, vel: new o.Vector3(), age: 0, maxAge: 0.42, active: !1 });
    }
  }
  _initHudAndControllers() {
    this.hud = new Y({
      onSelectMatchLength: (i) => {
        this.matchConfig.gamesToWin = i;
      },
      onSelectDifficulty: (i) => {
        this._applyDifficultyTuning(i),
          i === "1v1" && (!this.roomId || this.roomId === "default") && this.createMultiplayerRoom();
      },
      onCreateMultiplayerRoom: async (i = {}) => await this.createMultiplayerRoom(i),
      onSelectInputMode: (i) => {
        (this.matchConfig.inputMode = i),
          i === "webcam" && this.motionController && this.motionController.enableWebcam();
      },
      onStartMatch: ({ gamesToWin: i, inputMode: a, difficulty: s }) => {
        (this.matchConfig.gamesToWin = i),
          (this.matchConfig.inputMode = a),
          s && this._applyDifficultyTuning(s),
          (this.autoPlayMode = !1),
          (this.userHasInteracted = !0),
          (this.persistentStateLock = !1),
          a === "webcam" && this.motionController && this.motionController.enableWebcam(),
          this.startNewMatch({ showStartBanner: !0 });
      },
      onSelectShotType: (i) => {
        this.playerRole === "p2" ? (this.p2SelectedShotType = i) : (this.selectedShotType = i),
          this.motionController &&
            this.motionController.setShotType &&
            this.motionController.setShotType(i.toLowerCase());
      },
      onToggleAudio: () => {
        if (this.audioEngine) {
          const i = this.audioEngine.toggleMute(),
            a = this.audioEngine.getCurrentTrackInfo();
          this.hud.updateAudioStatus({ playing: !i, trackName: a.title });
        }
      },
      onCycleCamera: () => {
        const i = [null, "RALLY_CAM", "SERVE_CAM", "REPLAY_CAM", "INTRO_PAN"],
          a = i.indexOf(this.manualCameraOverride);
        this.manualCameraOverride = i[(a + 1) % i.length];
        const s = {
          null: "Auto",
          RALLY_CAM: "Rally",
          SERVE_CAM: "Serve",
          REPLAY_CAM: "Net Close",
          INTRO_PAN: "Aerial",
        };
        this.hud.updateCameraLabel(s[this.manualCameraOverride] || "Auto"),
          this.hud.setReplayMode(this.manualCameraOverride === "REPLAY_CAM");
      },
      onToggleReplay: () => {
        this.phase === "REPLAY"
          ? ((this.persistentStateLock = !1),
            this.hud.setReplayMode(!1),
            this._setupPointServe({ showBanner: !1 }))
          : this._enterInstantReplayState({ persistent: !1 });
      },
      onToggleWebcam: async () => {
        if (this.motionController)
          if (
            ((this.autoPlayMode = !1),
            (this.userHasInteracted = !0),
            (this.persistentStateLock = !1),
            this.motionController.webcamActive)
          )
            this.motionController.disableWebcam && this.motionController.disableWebcam(),
              this.hud.updateMotionStatus({
                webcamActive: !1,
                phoneConnected: this.motionController.phoneState?.connected,
              });
          else {
            const i = await this.motionController.enableWebcam();
            this.hud.updateMotionStatus({
              webcamActive: i,
              phoneConnected: this.motionController.phoneState?.connected,
            }),
              this.phase === "TITLE" &&
                (this.hud.hideTitleModal(), this.startNewMatch({ showStartBanner: !0 }));
          }
      },
      onOpenPhoneRacket: () => this.natpfUi && this.natpfUi.openPhone(),
      onPlayAgain: () => {
        (this.autoPlayMode = !1),
          (this.userHasInteracted = !0),
          (this.persistentStateLock = !1),
          this.startNewMatch({ showStartBanner: !0 });
      },
    });
    const e = U.AudioEngine || U.default;
    e &&
      (this.audioEngine = new e({
        onTrackChange: (i) => {
          this.hud.updateAudioStatus({
            playing: !i.muted,
            trackName: i.title,
          });
        },
      }));
    const t = z.MotionController || z.default;
    t &&
      (this.motionController = new t({
        webcamCanvasId: "webcam-canvas",
        roomId: this.roomId,
        role: this.playerRole,
        onSwing: (i) => this._handleUserSwingInput(i),
        onToss: (i) => this._handleUserTossInput(i),
        onP2Swing: (i) => this._handleP2SwingInput(i),
        onP2Toss: (i) => this._handleP2TossInput(i),
        onRoomState: (i) => this._handleRoomStateUpdate(i),
        onStatusChange: (i) => {
          this.hud.updateMotionStatus({
            webcamActive: !!i.webcam,
            phoneConnected: !!i.phone,
            p1Phone: !!i.p1Phone,
            p2Phone: !!i.p2Phone,
          });
        },
      })),
      this._initNatpfPhone(),
      window.addEventListener("keydown", (i) => {
        (i.target && (i.target.tagName === "INPUT" || i.target.tagName === "TEXTAREA")) ||
          (i.code === "KeyC"
            ? this.hud.callbacks.onCycleCamera()
            : i.code === "KeyV"
              ? this.setViewMode(this.viewMode === "first" ? "third" : "first")
            : i.code === "KeyR"
              ? this.hud.callbacks.onToggleReplay()
              : this.isMultiplayer &&
                (i.code === "ShiftRight" || i.code === "KeyK" || i.code === "Numpad0") &&
                this._handleP2SwingInput({
                  source: "keyboard_p2",
                  shotType: this.p2SelectedShotType,
                  speed: 1.18,
                }));
      });
  }
  // NATPF: smartphone come racchetta (controller di NATPF Simulator) accanto a mouse, tastiera e webcam
  _initNatpfPhone() {
    // prima persona: sudore ed emoticon del viso nascosto finirebbero davanti alla camera
    for (const e of ["spawnSweatDrops", "triggerEmoteBurst"]) {
      const t = this.facialFX && this.facialFX[e] && this.facialFX[e].bind(this.facialFX);
      t && (this.facialFX[e] = (i, ...a) => (i && i === this.fpBodyActor ? void 0 : t(i, ...a)));
    }
    this.natpfPhone = new NatpfPhoneRacket(this);
    // NATPF: webcam → «Movimento: segui il corpo» (MediaPipe Pose), isolato dal movimento automatico del motore base
    this.natpfBody = new NatpfBodyFollow(this);
    const mc = this.motionController;
    if (mc && mc.triggerHapticFeedback) {
      const haptic = mc.triggerHapticFeedback.bind(mc);
      // NATPF: l'esito del colpo (anello colorato, allenamento) decide anche la vibrazione del telefono
      mc.triggerHapticFeedback = (e = {}) => {
        haptic(e);
        const q = this.natpfUi && this.natpfUi.feedback ? this.natpfUi.feedback(e) : null;
        this.natpfPhone.feedback({ ...e, quality: q });
      };
    }
  }
  // NATPF: prima o terza persona, ricordata nel browser
  setViewMode(e) {
    this.viewMode = normalizeViewMode(e);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, this.viewMode);
    } catch {}
    this.manualCameraOverride = null;
    this.hud.updateCameraLabel && this.hud.updateCameraLabel("Auto");
    this.natpfUi && this.natpfUi.onViewChange && this.natpfUi.onViewChange(this.viewMode);
    return this.viewMode;
  }
  get localActor() {
    return this.playerRole === "p2" ? this.opponent : this.player;
  }
  // NATPF: la prima persona vale durante la partita, non nel menu, nei replay o con una camera scelta a mano
  _isFirstPersonActive() {
    return (
      this.viewMode === "first" &&
      !this.manualCameraOverride &&
      !this.autoPlayMode &&
      ["SERVE_STANCE", "SERVE_TOSS", "RALLY", "POINT_OVER"].includes(this.phase)
    );
  }
  // NATPF: 1v1 → i compagni di doppio non sono in campo
  // NATPF: formato scelto nel menu (1v1 o 2v2) prima di iniziare la partita
  setMatchFormat(id) {
    (this.matchFormat = resolveMatchFormat(id)), (this.isDoubles = this.matchFormat.teamSize === 2), this._applyMatchFormat();
    return this.matchFormat.id;
  }
  _applyMatchFormat() {
    for (const e of [this.playerPartner, this.opponentPartner])
      (e.root.visible = this.isDoubles), e.shadowBlob && (e.shadowBlob.visible = this.isDoubles);
    document.body.classList.toggle("format-singles", !this.isDoubles);
  }
  async createMultiplayerRoom({ p1Name: e = "Player 1", p2Name: t = "Player 2" } = {}) {
    try {
      const i = await fetch("/api/match/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p1Name: e, p2Name: t }),
      });
      if (i.ok) {
        const a = await i.json();
        if (a.roomId)
          return (
            (this.roomId = a.roomId),
            (this.isMultiplayer = !0),
            this._applyDifficultyTuning("1v1"),
            this.motionController &&
              this.motionController.setRoomConfig &&
              this.motionController.setRoomConfig({ roomId: this.roomId, role: this.playerRole }),
            (this.roomStatus = {
              ...this.roomStatus,
              roomId: a.roomId,
              tunnelUrl: a.tunnelUrl || "",
              urls: a.urls || null,
              gchatCard: a.gchatCard || null,
            }),
            this.hud &&
              this.hud.updateMultiplayerRoomInfo &&
              this.hud.updateMultiplayerRoomInfo(this.roomStatus),
            this.natpfUi && this.natpfUi.onRoomCreated && this.natpfUi.onRoomCreated(a),
            a
          );
      }
    } catch (i) {
      console.warn("[NATPF] Stanza 1v1 non creata:", i);
    }
    return null;
  }
  async loadAssetsAndStart() {
    const e = new D(),
      t = async (y, f = 4) => {
        const c =
          y.startsWith("http") || y.startsWith("./") || y.startsWith("/")
            ? y.replace(/^https?:\/\/[^/]+\/(?:[\w-]+\/)*?tennis\//, "./assets/") // NATPF: indirizzi assoluti → pacchetto locale
            : `./assets/models/${y}?v=natpf`;
        for (let m = 0; m <= f; m++)
          try {
            return await new Promise((b, u) => {
              e.load(
                c,
                (w) => b(w.scene),
                void 0,
                (w) => u(w),
              );
            });
          } catch (d) {
            if (m === f) return console.warn(`[NATPF] Modello non caricato ${c}:`, d), new o.Group();
            await new Promise((b) => setTimeout(b, 350));
          }
        return new o.Group();
      },
      [i, a, l] = await Promise.all([
        // NATPF: stadio, rete e pubblico vengono dall'arena NATPF; i vecchi modelli non si scaricano più
        Promise.resolve(new o.Group()),
        Promise.resolve(new o.Group()),
        Promise.resolve(new o.Group()),
      ]),
      // NATPF: giocatori (P1, CPU/P2 e compagni del doppio), racchetta e pallina creati nel codice
      { player: s, playerPartner: p, opponent: n, opponentPartner: g, racket: h, ball: r } = createNatpfCast();
    this._prepareStadiumAndNet(i, a),
      this._prepareCrowd(l),
      this.natpfArena.adoptLegacyStadium({ stadium: i, net: a, crowd: l }),
      this._preparePlayerActor(this.player, s, h),
      this._preparePlayerActor(this.playerPartner, p, h),
      this._preparePlayerActor(this.opponent, n, h),
      this._preparePlayerActor(this.opponentPartner, g, h),
      this._applyMatchFormat(),
      this._prepareTennisBall(r),
      this._bootInitialStateFromURL(),
      this.clock.start();
    const c = () => {
      requestAnimationFrame(c);
      const y = Math.min(this.clock.getDelta(), 0.08);
      // NATPF: partita ferma mentre si leggono le istruzioni o si collega il telefono
      this.natpfPaused || this.update(y), this.render();
    };
    requestAnimationFrame(c);
  }
  _prepareStadiumAndNet(e, t) {
    const i = this.renderer.capabilities.getMaxAnisotropy ? this.renderer.capabilities.getMaxAnisotropy() : 8,
      a = (s) => {
        if (!s) return;
        const n = s.name || "";
        s.map &&
          ((s.map.anisotropy = i),
          (s.map.wrapS = o.RepeatWrapping),
          (s.map.wrapT = o.RepeatWrapping),
          (s.map.needsUpdate = !0)),
          /TreeSprite/i.test(n)
            ? ((s.alphaTest = 0.35), (s.transparent = !0), (s.side = o.DoubleSide), (s.depthWrite = !0))
            : /Shadow|LogoBanner/i.test(n)
              ? ((s.transparent = !0),
                (s.depthWrite = !1),
                (s.polygonOffset = !0),
                (s.polygonOffsetFactor = -2),
                (s.polygonOffsetUnits = -2))
              : /NetMesh/i.test(n) &&
                ((s.transparent = !0), (s.alphaTest = 0.08), (s.side = o.DoubleSide), (s.depthWrite = !1)),
          (s.needsUpdate = !0);
      };
    e.traverse((s) => {
      if (s.isMesh) {
        const n = s.name || "";
        (Array.isArray(s.material) ? s.material : [s.material]).forEach(a),
          /Shadow/i.test(n)
            ? ((s.castShadow = !1), (s.receiveShadow = !1), (s.renderOrder = 1))
            : /Tree/i.test(n)
              ? ((s.castShadow = !0), (s.receiveShadow = !0))
              : ((s.receiveShadow = !0),
                /Wall|Bleacher|Canopy|Pillar|Umpire|Bench|Clubhouse|StadiumCourt/i.test(n) &&
                  (s.castShadow = !0));
      }
    }),
      this.scene.add(e),
      t.traverse((s) => {
        if (s.isMesh) {
          const n = s.name || "";
          (Array.isArray(s.material) ? s.material : [s.material]).forEach(a),
            /Shadow/i.test(n)
              ? ((s.castShadow = !1), (s.receiveShadow = !1), (s.renderOrder = 1))
              : /Mesh/i.test(n)
                ? ((s.castShadow = !0), (s.receiveShadow = !0), (s.renderOrder = 2))
                : ((s.castShadow = !0), (s.receiveShadow = !0));
        }
      }),
      this.scene.add(t);
  }
  _prepareCrowd(e) {
    e.position.set(0, 0, 0),
      e.traverse((t) => {
        t.isMesh && ((t.castShadow = !1), (t.receiveShadow = !0));
      }),
      (this.crowdScene = e),
      this.scene.add(e);
  }
  _preparePlayerActor(e, t, i) {
    (e.model = t),
      t.traverse((s) => {
        s.isMesh && ((s.castShadow = !0), (s.receiveShadow = !0)),
          (s.userData.basePos = s.position.clone()),
          (s.userData.baseRot = s.rotation.clone());
        const n = (s.name || "").trim();
        /^head(\.?0*\d+)?$/i.test(n) && (!e.parts.head || !s.isMesh)
          ? (e.parts.head = s)
          : /^torso(\.?0*\d+)?$/i.test(n) && (!e.parts.torso || !s.isMesh)
            ? (e.parts.torso = s)
            : /^hand_l(\.?0*\d+)?$/i.test(n) && (!e.parts.handL || !s.isMesh)
              ? (e.parts.handL = s)
              : /^hand_r(\.?0*\d+)?$/i.test(n) && (!e.parts.handR || !s.isMesh)
                ? (e.parts.handR = s)
                : /^foot_l(\.?0*\d+)?$/i.test(n) && (!e.parts.footL || !s.isMesh)
                  ? (e.parts.footL = s)
                  : /^foot_r(\.?0*\d+)?$/i.test(n) && (!e.parts.footR || !s.isMesh) && (e.parts.footR = s);
      }),
      t.scale.setScalar(1.16),
      e.root.add(t),
      $(e, e.sideSign > 0 ? "p1" : "p2"),
      this.facialFX && this.facialFX.attachFacialRig(e),
      this.bodyAnimator && this.bodyAnimator.setupArticulatedPlayerRig(e);
    const a = i.clone(!0);
    a.traverse((s) => {
      s.isMesh && ((s.castShadow = !0), (s.receiveShadow = !0));
    }),
      q(a),
      a.scale.setScalar(1.22),
      (e.racketMesh = a),
      e.racketPivot.position.set(-0.36, 0.9, 0.16),
      e.racketMesh.rotation.set(0, 0, 0),
      e.racketPivot.add(e.racketMesh),
      (e.swingArcMesh = se()),
      (e.swingArcMesh.visible = !1),
      e.root.add(e.swingArcMesh),
      e.root.add(e.racketPivot),
      (e.root.rotation.y = e.sideSign > 0 ? Math.PI : 0),
      e.root.position.copy(e.pos),
      this.scene.add(e.root),
      this.racketKinematics && this.racketKinematics.initActor(e),
      this.swingVfx && this.swingVfx.registerActor(e),
      // NATPF: braccia e gambe che seguono mani e piedi, viso adattato al personaggio
      finishNatpfActor(e);
  }
  _prepareTennisBall(e) {
    e.traverse((t) => {
      t.isMesh && ((t.castShadow = !0), (t.receiveShadow = !1));
    }),
      e.scale.setScalar(1.65),
      (this.ball.mesh = e),
      this.ball.mesh.position.copy(this.ball.pos),
      this.scene.add(this.ball.mesh);
  }
  _bootInitialStateFromURL() {
    if (this.urlRoom && this.urlRoom !== "DEFAULT" && !this.urlAutoPlay) {
      this.hud.hideTitleModal(),
        (this.autoPlayMode = !1),
        (this.userHasInteracted = !0),
        (this.persistentStateLock = !1),
        this.startNewMatch({ showStartBanner: !0 }),
        this._snapCameraImmediate();
      return;
    }
    if (!this.urlAutoPlay) {
      (this.score.playerPoints = 0),
        (this.score.opponentPoints = 0),
        this._syncScoreboardHUD(),
        this._setupMidRallyShowcase({ scorePlayer: 0, scoreOpponent: 0 }),
        (this.autoPlayMode = !0),
        this.audioEngine && this.audioEngine.playMusicForState("title");
      return;
    }
    if ((this.hud.hideTitleModal(), this.urlState === "gamepoint" || this.urlState === "serve")) {
      (this.score.playerPoints = 3),
        (this.score.opponentPoints = 0),
        (this.score.playerGames = 0),
        (this.score.opponentGames = 0),
        (this.score.server = "player"),
        (this.score.deuceSide = !1),
        this._syncScoreboardHUD(),
        (this.persistentStateLock = !0),
        this._setupPointServe({
          showBanner: !0,
          bannerText: "Game Point",
          bannerStyle: "style-gold",
          persistentBanner: !0,
        }),
        this._snapCameraImmediate(),
        this.audioEngine && this.audioEngine.playMusicForState("gamepoint");
      return;
    }
    if (this.urlState === "start") {
      (this.score.playerPoints = 0),
        (this.score.opponentPoints = 0),
        (this.score.server = "player"),
        (this.score.deuceSide = !0),
        this._syncScoreboardHUD(),
        (this.persistentStateLock = !0),
        this._setupPointServe({
          showBanner: !0,
          bannerText: "Start",
          bannerStyle: "style-start",
          persistentBanner: !0,
        }),
        this._snapCameraImmediate();
      return;
    }
    if (this.urlState === "replay") {
      (this.score.playerPoints = 3),
        (this.score.opponentPoints = 0),
        this._syncScoreboardHUD(),
        (this.persistentStateLock = !0),
        this._enterInstantReplayState({ persistent: !0 }),
        this._snapCameraImmediate(),
        this.audioEngine && this.audioEngine.playMusicForState("replay");
      return;
    }
    if (this.urlState && this.urlState.startsWith("showcase")) {
      (this.score.playerPoints = 2),
        (this.score.opponentPoints = 1),
        this._syncScoreboardHUD(),
        (this.persistentStateLock = !0),
        (this.autoPlayMode = !1),
        this._setupKineticShowcaseState(this.urlState),
        this._snapCameraImmediate();
      return;
    }
    (this.score.playerPoints = 1),
      (this.score.opponentPoints = 0),
      (this.score.playerGames = 0),
      (this.score.opponentGames = 0),
      this._syncScoreboardHUD(),
      this.hud.hideCenterBanner(),
      this.hud.setReplayMode(!1),
      (this.autoPlayMode = !0),
      (this.persistentStateLock = !1),
      this._setupMidRallyShowcase({ scorePlayer: 1, scoreOpponent: 0 }),
      this._snapCameraImmediate(),
      this.audioEngine && this.audioEngine.playMusicForState("rally");
  }
  _setupKineticShowcaseState(e = "showcase_topspin") {
    (this.phase = "SHOWCASE"),
      (this.showcaseModeName = e),
      (this.phaseTimer = 0),
      (this.cameraMode = "SHOWCASE_CAM"),
      this.hud.setReplayMode(!1),
      this.hud.hideCenterBanner(),
      this.player.pos.set(1.15, 0, 11.2),
      this.player.targetPos.copy(this.player.pos),
      (this.player.root.rotation.y = Math.PI + 0.18),
      this.opponent.pos.set(-1.25, 0, -10.2),
      this.opponent.targetPos.copy(this.opponent.pos),
      this.playerPartner.pos.set(-2.35, 0, 5.2),
      this.opponentPartner.pos.set(2.35, 0, -5.2),
      this._refreshShowcasePose();
  }
  _refreshShowcasePose() {
    const e = this.showcaseModeName || "showcase_topspin",
      t = (i) => {
        for (let a = 0; a < 10; a++)
          (this.player.racketKinematics.swingActive = !0),
            (this.player.racketKinematics.swingElapsed = i),
            this.racketKinematics.update(this.player, 0.016, { ball: this.ball, phase: this.phase }),
            (this.player.racketKinematics.swingActive = !0),
            (this.player.racketKinematics.swingElapsed = i),
            this.bodyAnimator.updatePlayerBodyAnimation(this.player, 0.016, this);
        this.player.root.updateMatrixWorld(!0);
      };
    if (e === "showcase_slice" || e === "showcase_backhand") {
      (this.player.swingType = "backhand"),
        (this.player.swingDuration = 0.36),
        (this.player.swingTimer = 0.26),
        this.racketKinematics.triggerSwing(this.player, {
          shotType: e === "showcase_backhand" ? "topspin" : "slice",
          side: "backhand",
          speed: 1.32,
          timing: "sweet",
        }),
        t(0.072),
        this.swingVfx.seedActorSwingArc(this.player, {
          shotType: "SLICE",
          isPower: !1,
          whipSpeed: 28,
          swingType: "backhand",
        }),
        this.facialFX.setExpression(this.player, "focused_squint", 10);
      const a = this.racketKinematics.getRacketRimWorldPoints(this.player).centerWorld.clone();
      this.ball.pos.copy(a).add(new o.Vector3(0.06, 0.03, -0.22)),
        this.ball.vel.set(1.4, 0.9, -15.2),
        this.ballTrail.setStyle("SLICE", !1),
        this.ballTrail.seedArc(a, this.ball.pos, 0.05),
        this.swingVfx.triggerBallDeformation(this.ball, "racket_hit", this.ball.vel, 26),
        this.swingVfx.spawnImpactBurst(a, { shotType: "SLICE", isPower: !1, count: 16 });
    } else if (e === "showcase_smash") {
      (this.player.swingType = "smash"),
        (this.player.swingDuration = 0.36),
        (this.player.swingTimer = 0.26),
        this.racketKinematics.triggerSwing(this.player, {
          shotType: "smash",
          side: "overhead",
          speed: 1.45,
          timing: "sweet",
        }),
        t(0.058),
        this.swingVfx.seedActorSwingArc(this.player, {
          shotType: "SMASH",
          isPower: !0,
          whipSpeed: 34,
          swingType: "smash",
        }),
        this.facialFX.setExpression(this.player, "effort_shout", 10);
      const a = this.racketKinematics.getRacketRimWorldPoints(this.player).centerWorld.clone();
      this.ball.pos.copy(a).add(new o.Vector3(-0.04, -0.04, -0.22)),
        this.ball.vel.set(-1.5, -2.8, -22),
        this.ballTrail.setStyle("SMASH", !0),
        this.ballTrail.seedArc(a, this.ball.pos, 0.05),
        this.swingVfx.triggerBallDeformation(this.ball, "racket_hit", this.ball.vel, 32),
        this.swingVfx.spawnImpactBurst(a, { shotType: "SMASH", isPower: !0, count: 22 });
    } else if (e === "showcase_panic")
      this.player.vel.set(-6.8, 0, 1.2),
        (this.player.stridePhase += 0.35),
        this.facialFX.setExpression(this.player, "wide_eyed_panic", 10),
        this.facialFX.spawnSweatDrops(this.player, 6),
        this.facialFX.triggerEmoteBurst(this.player, "panic"),
        this.ball.pos.set(0.78, 2.15, 9.85),
        this.ballTrail.setStyle("LOB", !1),
        this.ballTrail.seedArc(new o.Vector3(-0.8, 2.75, 5.2), this.ball.pos, 0.72);
    else if (e === "showcase_win")
      this.player.rig?.reaction?.type || this.bodyAnimator.triggerPointReaction(this.player, "win"),
        this.player.rig?.reaction && (this.player.rig.reaction.timer = 0.16),
        this.facialFX.setExpression(this.player, "happy_grin", 10),
        this.facialFX.triggerEmoteBurst(this.player, "win"),
        this.opponent.rig?.reaction?.type || this.bodyAnimator.triggerPointReaction(this.opponent, "loss"),
        this.facialFX.setExpression(this.opponent, "shocked_loss", 10),
        this.ball.pos.set(-2.5, 0.12, -11.5);
    else {
      (this.player.swingType = "forehand"),
        (this.player.swingDuration = 0.36),
        (this.player.swingTimer = 0.26),
        this.racketKinematics.triggerSwing(this.player, {
          shotType: "topspin",
          side: "forehand",
          speed: 1.35,
          timing: "sweet",
        }),
        t(0.068),
        this.swingVfx.seedActorSwingArc(this.player, {
          shotType: "TOPSPIN",
          isPower: !0,
          whipSpeed: 29,
          swingType: "forehand",
        }),
        this.facialFX.setExpression(this.player, "effort_shout", 10);
      const a = this.racketKinematics.getRacketRimWorldPoints(this.player).centerWorld.clone();
      this.ball.pos.copy(a).add(new o.Vector3(-0.06, 0.04, -0.22)),
        this.ball.vel.set(-1.8, 2.2, -18.5),
        this.ballTrail.setStyle("TOPSPIN", !0),
        this.ballTrail.seedArc(a, this.ball.pos, 0.05),
        this.swingVfx.triggerBallDeformation(this.ball, "racket_hit", this.ball.vel, 28),
        this.swingVfx.spawnImpactBurst(a, { shotType: "TOPSPIN", isPower: !0, count: 18 });
    }
  }
  startNewMatch({ showStartBanner: e = !0 } = {}) {
    (this.score.playerPoints = 0),
      (this.score.opponentPoints = 0),
      (this.score.playerGames = 0),
      (this.score.opponentGames = 0),
      (this.score.server = "player"),
      (this.score.deuceSide = !0),
      this._syncScoreboardHUD(),
      this.hud.setReplayMode(!1),
      this.audioEngine &&
        (this.audioEngine.playMusicForState("start"), this.audioEngine.announceScore("Start")),
      this._setupPointServe({
        showBanner: e,
        bannerText: "Start",
        bannerStyle: "style-start",
        persistentBanner: !1,
      });
  }
  _setupPointServe({
    showBanner: e = !0,
    bannerText: t = null,
    bannerStyle: i = "style-gold",
    persistentBanner: a = !1,
  } = {}) {
    (this.phase = "SERVE_STANCE"),
      (this.phaseTimer = 0),
      (this.cameraMode = "SERVE_CAM"),
      this.hud.setReplayMode(!1),
      this.ballTrail.clear(),
      this.swingVfx && this.swingVfx.clearAllTrails();
    // NATPF: dopo un replay torna la musica della partita
    this.audioEngine && !this.autoPlayMode && this.audioEngine.resumeMatchMusic && this.audioEngine.resumeMatchMusic();
    const s = this.score.deuceSide ? 1.35 : -0.55,
      n = this.score.deuceSide ? -2.35 : 2.15;
    this.score.server === "player"
      ? (this.player.pos.set(s, 0, S.BASELINE_Z + 0.12),
        this.player.targetPos.copy(this.player.pos),
        this.opponent.pos.set(n, 0, -S.BASELINE_Z + 0.35),
        this.opponent.targetPos.copy(this.opponent.pos),
        this.ball.pos.set(s - 0.28, 1.12, S.BASELINE_Z - 0.15))
      : (this.opponent.pos.set(-s, 0, -S.BASELINE_Z - 0.12),
        this.opponent.targetPos.copy(this.opponent.pos),
        this.player.pos.set(-n, 0, S.BASELINE_Z - 0.35),
        this.player.targetPos.copy(this.player.pos),
        this.ball.pos.set(-s + 0.28, 1.12, -S.BASELINE_Z + 0.15));
    const h = this.score.deuceSide ? -2.05 : 2.05;
    this.playerPartner.pos.set(h, 0, 5.2),
      this.playerPartner.targetPos.copy(this.playerPartner.pos),
      this.opponentPartner.pos.set(-h, 0, -5.2),
      this.opponentPartner.targetPos.copy(this.opponentPartner.pos),
      this._applyMatchFormat(),
      this.ball.vel.set(0, 0, 0),
      this.ball.spin.set(0, 0, 0),
      (this.ball.inPlay = !1),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount = 0),
      (this.pendingUserSwing = null),
      (this.pendingP2Swing = null),
      (this.pendingServeSwing = null),
      NS.resetRally(this), // NATPF skill gap: serie di perfetti e pressione ripartono a ogni punto
      (this.player.swingArcMesh.visible = !1),
      (this.opponent.swingArcMesh.visible = !1),
      this.playerPartner.swingArcMesh && (this.playerPartner.swingArcMesh.visible = !1),
      this.opponentPartner.swingArcMesh && (this.opponentPartner.swingArcMesh.visible = !1),
      (this.player.swingCooldown = 0),
      (this.playerPartner.swingCooldown = 0),
      (this.opponent.swingCooldown = 0),
      (this.opponentPartner.swingCooldown = 0),
      this.facialFX &&
        (this.facialFX.setExpression(this.player, "neutral", 2),
        this.facialFX.setExpression(this.opponent, "neutral", 2),
        this.facialFX.setExpression(this.playerPartner, "neutral", 2),
        this.facialFX.setExpression(this.opponentPartner, "neutral", 2));
    let r = t,
      l = i;
    if (!r && e) {
      const p = this._getHighStakesPointLabel();
      p &&
        ((r = p),
        (l = "style-gold"),
        this.audioEngine && this.audioEngine.announceScore(p, { delayMs: 180 }));
    }
    r && e
      ? (this._recordBannerBroadcast(r, l, ""),
        this.hud.showCenterBanner(r, { style: l, durationMs: 1800, persistent: a }))
      : a || this.hud.hideCenterBanner(),
      this.hud.updateTimingGauge({
        cursorNormalized: 0.5,
        modeTitle: "SERVE TOSS",
        speedText: "UPWARD FLICK / SPACE",
      });
  }
  _setupMidRallyShowcase({ scorePlayer: e = 1, scoreOpponent: t = 0 } = {}) {
    (this.phase = "RALLY"),
      (this.phaseTimer = 0),
      (this.cameraMode = "RALLY_CAM"),
      this.hud.setReplayMode(!1),
      this.hud.hideCenterBanner(),
      this.player.pos.set(1.35, 0, 11.4),
      this.player.targetPos.set(1.15, 0, 11.4),
      (this.player.swingType = "forehand"),
      (this.player.swingTimer = 0.25),
      (this.player.arcVisibleTimer = 1.2),
      (this.player.swingArcMesh.visible = !0),
      this.racketKinematics &&
        (this.racketKinematics.triggerSwing(this.player, {
          shotType: "topspin",
          side: "forehand",
          speed: 1.35,
          timing: "sweet",
        }),
        (this.player.racketKinematics.swingElapsed = 0.13)),
      this.swingVfx &&
        this.swingVfx.seedActorSwingArc(this.player, {
          shotType: "TOPSPIN",
          isPower: !0,
          whipSpeed: 28,
          swingType: "forehand",
        }),
      this.facialFX &&
        (this.facialFX.setExpression(this.player, "effort_shout", 1.2),
        this.facialFX.setExpression(this.opponent, "focused_squint", 1.2)),
      this.playerPartner.pos.set(-2.1, 0, 5.4),
      this.playerPartner.targetPos.copy(this.playerPartner.pos),
      this.opponentPartner.pos.set(2.1, 0, -5.4),
      this.opponentPartner.targetPos.copy(this.opponentPartner.pos),
      this._applyMatchFormat(),
      this.opponent.pos.set(-1.65, 0, -10.5),
      this.opponent.targetPos.set(-1.95, 0, -10.8);
    const i = new o.Vector3(1.42, 1.25, 10.85),
      a = new o.Vector3(-0.18, 1.88, 0.65);
    this.ball.pos.copy(a),
      this.ball.vel.set(-1.85, 2.15, -14.8),
      this.ball.spin.set(18, 0, 0),
      (this.ball.inPlay = !0),
      (this.ball.lastHitter = "player"),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount = 2),
      (this.ball.shotType = "TOPSPIN"),
      (this.ball.isPowerShot = !0),
      this.ballTrail.setStyle("TOPSPIN", !1),
      this.ballTrail.seedArc(i, a, 0.72),
      this.swingVfx && this.swingVfx.spawnImpactBurst(i, { shotType: "TOPSPIN", isPower: !0, count: 14 }),
      this._predictBallIntercept(this.opponent);
  }
  _enterInstantReplayState({ persistent: e = !1 } = {}) {
    (this.phase = "REPLAY"),
      (this.phaseTimer = 0),
      (this.cameraMode = "REPLAY_CAM"),
      (this.persistentStateLock = e),
      this.hud.hideCenterBanner(),
      this.hud.setReplayMode(!0),
      (this.cheerEnergy = 0.85),
      this.audioEngine && !e && this.audioEngine.playVoiceCallout("replay"),
      this._resetReplayNetExchangePose();
  }
  _resetReplayNetExchangePose() {
    this.player.pos.set(1.55, 0, 0.95),
      this.player.targetPos.copy(this.player.pos),
      (this.player.root.rotation.y = Math.PI + 0.22),
      (this.player.swingType = "forehand"),
      (this.player.swingTimer = 0.08),
      (this.player.arcVisibleTimer = 1.5),
      (this.player.swingArcMesh.visible = !0),
      this.opponent.pos.set(-1.25, 0, -1.35),
      this.opponent.targetPos.copy(this.opponent.pos),
      (this.opponent.root.rotation.y = -0.18),
      (this.opponent.swingType = "forehand"),
      (this.opponent.swingTimer = 0.12),
      (this.opponent.arcVisibleTimer = 1.5),
      (this.opponent.swingArcMesh.visible = !0),
      this.racketKinematics &&
        (this.racketKinematics.triggerSwing(this.player, {
          shotType: "topspin",
          side: "forehand",
          speed: 1.32,
          timing: "sweet",
        }),
        (this.player.racketKinematics.swingElapsed = 0.14),
        this.racketKinematics.triggerSwing(this.opponent, {
          shotType: "slice",
          side: "forehand",
          speed: 1.25,
          timing: "sweet",
        }),
        (this.opponent.racketKinematics.swingElapsed = 0.11)),
      this.swingVfx &&
        (this.swingVfx.seedActorSwingArc(this.player, {
          shotType: "TOPSPIN",
          isPower: !0,
          whipSpeed: 28,
          swingType: "forehand",
        }),
        this.swingVfx.seedActorSwingArc(this.opponent, {
          shotType: "SLICE",
          isPower: !1,
          whipSpeed: 25,
          swingType: "forehand",
        })),
      this.facialFX &&
        (this.facialFX.setExpression(this.player, "effort_shout", 2),
        this.facialFX.setExpression(this.opponent, "wide_eyed_panic", 2),
        this.facialFX.spawnSweatDrops(this.opponent, 5)),
      this.playerPartner.pos.set(-4.2, 0, 9.5),
      this.opponentPartner.pos.set(4.2, 0, -9.5);
    const e = new o.Vector3(-1.12, 1.22, -1.08),
      t = new o.Vector3(-0.08, 1.34, 0.05);
    this.ball.pos.copy(t),
      this.ball.vel.set(0.95, 0.85, 3.6),
      (this.ball.inPlay = !0),
      this.ballTrail.setStyle("SLICE", !0),
      this.ballTrail.seedArc(e, t, 0.24);
  }
  _handleUserTossInput(e = {}) {
    return (
      (this.userHasInteracted = !0),
      this.phase === "TITLE"
        ? (this.hud.hideTitleModal(),
          (this.autoPlayMode = !1),
          (this.persistentStateLock = !1),
          this.startNewMatch({ showStartBanner: !0 }),
          !0)
        : this.phase === "SERVE_STANCE" && this.score.server === "player"
          ? ((this.persistentStateLock = !1),
            this.hud.hideCenterBanner(),
            this._startServeToss(this.player),
            !0)
          : !1
    );
  }
  _handleUserSwingInput(e = {}) {
    if (((this.userHasInteracted = !0), this.phase === "TITLE")) {
      this.hud.hideTitleModal(),
        (this.autoPlayMode = !1),
        (this.persistentStateLock = !1),
        this.startNewMatch({ showStartBanner: !0 });
      return;
    }
    if (e.shotType && e.shotType !== "toss") {
      const t = String(e.shotType).toUpperCase();
      ["TOPSPIN", "SLICE", "LOB", "SMASH", "FLAT"].includes(t) &&
        (this.selectedShotType = t === "SMASH" ? "FLAT" : t);
    }
    if (this.phase === "SERVE_STANCE" && this.score.server === "player") {
      (this.persistentStateLock = !1), this.hud.hideCenterBanner(), this._startServeToss(this.player);
      return;
    }
    if (this.phase === "SERVE_TOSS" && this.score.server === "player") {
      if (this.phaseTimer < 0.16) return;
      if (this.ball.pos.y >= 1.45 && this.ball.pos.y < 2.25 && this.ball.vel.y > 0.5) {
        this.pendingServeSwing = {
          actor: this.player,
          evt: { ...e, speed: Math.max(1.22, Number(e.speed || 1.22)) },
        };
        return;
      }
      this._executeServeHit(this.player, e);
      return;
    }
    if (this.phase === "RALLY") {
      this.autoPlayMode = !1;
      const t =
          e.side === "backhand" || (Number(e.dirX || 0) > 0.12 && e.side !== "forehand")
            ? "backhand"
            : e.side === "forehand" || Number(e.dirX || 0) < -0.12
              ? "forehand"
              : this.ball.pos.x < this.player.pos.x - 0.05 || this.ball.targetLanding.x < -0.15
                ? "backhand"
                : "forehand",
        i = String(e.shotType || this.selectedShotType || "topspin").toLowerCase();
      if (this.ball.lastHitter === "opponent") {
        const s = this.ball.pos.z - this.player.pos.z,
          n = this.ball.pos.z - this.playerPartner.pos.z,
          h =
            this.isDoubles &&
            this.ball.pos.z > 0.3 &&
            this.ball.pos.z <= 7.5 &&
            Math.abs(this.ball.pos.x - this.playerPartner.pos.x) < 3.4,
          r = h ? n : s;
        if (r < -0.95 && r >= -7.8) {
          const l = h ? this.playerPartner : this.player;
          this.racketKinematics &&
            this.racketKinematics.triggerSwing(l, {
              shotType: i,
              side: t,
              speed: Number(e.speed || 1.2),
              timing: "early",
              dirX: Number(e.dirX || 0),
            }),
            this.audioEngine && this.audioEngine.playSwingWhoosh(Number(e.speed || 1.15)),
            (this.pendingUserSwing = {
              // NATPF skill gap: attesa dello sweet spot breve e graduata per difficoltà (prima +0,48 s)
              evt: { ...e, side: t, sweetSpotAssisted: !0, natpfLead: NS.leadToSweetSpot(r, this.ball.vel.z) },
              expiresAt: NS.assistExpiry(this.elapsedTime, NS.skillLevel(this.matchConfig.difficulty)),
              waitForSweetSpot: !0,
            });
          return;
        }
      }
      if (
        !this._attemptPlayerRallyStrike({ ...e, side: t }, !1) &&
        (this.racketKinematics &&
          this.racketKinematics.triggerSwing(this.player, {
            shotType: i,
            side: t,
            speed: Number(e.speed || 1.2),
            timing: "sweet",
            dirX: Number(e.dirX || 0),
          }),
        this.audioEngine && this.audioEngine.playSwingWhoosh(Number(e.speed || 1.15)),
        this.ball.lastHitter === "opponent")
      ) {
        const s = this.ball.pos.z - this.player.pos.z,
          n = this.ball.pos.z - this.playerPartner.pos.z;
        ((s >= -8 && s <= 0.9) || (this.isDoubles && n >= -5.5 && n <= 0.9)) &&
          (this.pendingUserSwing = {
            // NATPF skill gap: come sopra
            evt: { ...e, side: t, sweetSpotAssisted: !0, natpfLead: NS.leadToSweetSpot(s, this.ball.vel.z) },
            expiresAt: NS.assistExpiry(this.elapsedTime, NS.skillLevel(this.matchConfig.difficulty)),
            waitForSweetSpot: !0,
          });
      }
    }
  }
  _handleP2TossInput(e = {}) {
    return (
      (this.userHasInteracted = !0),
      (this.isMultiplayer = !0),
      this.phase === "TITLE"
        ? (this.hud.hideTitleModal(),
          (this.autoPlayMode = !1),
          (this.persistentStateLock = !1),
          this.startNewMatch({ showStartBanner: !0 }),
          !0)
        : this.phase === "SERVE_STANCE" && this.score.server === "opponent"
          ? ((this.persistentStateLock = !1),
            this.hud.hideCenterBanner(),
            this._startServeToss(this.opponent),
            !0)
          : !1
    );
  }
  _handleP2SwingInput(e = {}) {
    // NATPF: Player 2 mancino → il suo personaggio è specchiato anche sul computer dell'host
    const natpfHand = e.hand || (e.natpf && e.natpf.hand);
    natpfHand && this.playerRole !== "p2" && this.natpfUi && this.natpfUi.hand && this.natpfUi.hand.mirrorRemote && this.natpfUi.hand.mirrorRemote(this.opponent, natpfHand);
    if (
      ((this.userHasInteracted = !0),
      (this.isMultiplayer = !0),
      this._applyDifficultyTuning("1v1"),
      this.phase === "TITLE")
    ) {
      this.hud.hideTitleModal(),
        (this.autoPlayMode = !1),
        (this.persistentStateLock = !1),
        this.startNewMatch({ showStartBanner: !0 });
      return;
    }
    if (e.shotType && e.shotType !== "toss") {
      const t = String(e.shotType).toUpperCase();
      ["TOPSPIN", "SLICE", "LOB", "SMASH", "FLAT"].includes(t) &&
        (this.p2SelectedShotType = t === "SMASH" ? "FLAT" : t);
    }
    if (this.phase === "SERVE_STANCE" && this.score.server === "opponent") {
      (this.persistentStateLock = !1), this.hud.hideCenterBanner(), this._startServeToss(this.opponent);
      return;
    }
    if (this.phase === "SERVE_TOSS" && this.score.server === "opponent") {
      if (this.phaseTimer < 0.16) return;
      if (this.ball.pos.y >= 1.45 && this.ball.pos.y < 2.25 && this.ball.vel.y > 0.5) {
        this.pendingServeSwing = {
          actor: this.opponent,
          evt: { ...e, speed: Math.max(1.22, Number(e.speed || 1.22)) },
        };
        return;
      }
      this._executeServeHit(this.opponent, e);
      return;
    }
    if (this.phase === "RALLY") {
      this.autoPlayMode = !1;
      const t =
          e.side === "backhand" || (Number(e.dirX || 0) > 0.12 && e.side !== "forehand")
            ? "backhand"
            : e.side === "forehand" || Number(e.dirX || 0) < -0.12
              ? "forehand"
              : this.ball.pos.x > this.opponent.pos.x + 0.05 || this.ball.targetLanding.x > 0.15
                ? "backhand"
                : "forehand",
        i = String(e.shotType || this.p2SelectedShotType || "topspin").toLowerCase();
      if (this.ball.lastHitter === "player") {
        const s = this.opponent.pos.z - this.ball.pos.z;
        if (s < -0.95 && s >= -7.8) {
          this.racketKinematics &&
            this.racketKinematics.triggerSwing(this.opponent, {
              shotType: i,
              side: t,
              speed: Number(e.speed || 1.2),
              timing: "early",
              dirX: Number(e.dirX || 0),
            }),
            (this.pendingP2Swing = {
              // NATPF skill gap: attesa dello sweet spot breve anche per il Player 2
              evt: { ...e, side: t, sweetSpotAssisted: !0, natpfLead: NS.leadToSweetSpot(s, this.ball.vel.z) },
              expiresAt: NS.assistExpiry(this.elapsedTime, NS.skillLevel("1v1")),
              waitForSweetSpot: !0,
            });
          return;
        }
      }
      this._attemptP2RallyStrike({ ...e, side: t }) ||
        (this.racketKinematics &&
          this.racketKinematics.triggerSwing(this.opponent, {
            shotType: i,
            side: t,
            speed: Number(e.speed || 1.2),
            timing: "sweet",
            dirX: Number(e.dirX || 0),
          }),
        this.ball.lastHitter === "player" &&
          (this.pendingP2Swing = {
            // NATPF skill gap: come sopra
            evt: { ...e, side: t, sweetSpotAssisted: !0, natpfLead: NS.leadToSweetSpot(this.opponent.pos.z - this.ball.pos.z, this.ball.vel.z) },
            expiresAt: NS.assistExpiry(this.elapsedTime, NS.skillLevel("1v1")),
            waitForSweetSpot: !0,
          }));
    }
  }
  _startServeToss(e) {
    (this.phase = "SERVE_TOSS"), (this.phaseTimer = 0), (this.pendingServeSwing = null);
    const t = e.sideSign > 0 ? -0.32 : 0.32;
    this.ball.pos.set(e.pos.x + t, 1.18, e.pos.z - e.sideSign * 0.22),
      this.ball.vel.set(0, 6.32, 0),
      (this.ball.inPlay = !1),
      this.facialFX && this.facialFX.setExpression(e, "focused_squint", 1.4),
      this.audioEngine && this.audioEngine.playServeToss();
  }
  _executeServeHit(e, t = {}) {
    const i = this.ball.pos.y;
    if (i < 1.25) return;
    this.pendingServeSwing = null;
    const a = o.MathUtils.clamp(Number(t.speed || 1.18), 0.78, 1.68),
      s = i >= 2.05 && i <= 3.55,
      n = i < 1.72;
    (e.swingType = "serve"),
      (e.swingDuration = 0.38),
      (e.swingTimer = 0.38),
      (e.arcVisibleTimer = 0.36),
      (e.swingArcMesh.visible = !0),
      this.racketKinematics &&
        (this.racketKinematics.triggerSwing(e, {
          shotType: "serve",
          side: "overhead",
          speed: a,
          timing: s ? "sweet" : n ? "early" : "sweet",
          isServe: !0,
          dirX: Number(t.dirX || 0),
        }),
        this.racketKinematics.triggerImpactRecoil(e, s ? 1.45 : 0.95));
    const h = this.score.deuceSide ? -1 : 1,
      r = o.MathUtils.clamp(Number(t.dirX || 0), -1, 1) * 1.15,
      l = e.sideSign * h * (1.75 + Math.random() * 0.85),
      p = o.MathUtils.clamp(l + r, -S.SINGLES_X + 0.45, S.SINGLES_X - 0.45),
      c =
        e.role === "opponent" && !this.isMultiplayer ? (this.matchConfig.difficulty === "pro" ? 1 : 1.24) : 1;
    let y = -e.sideSign * (4.4 + Math.random() * 1.35),
      f = s ? Math.max(0.58, 0.66 / Math.min(1.18, a * 0.92)) * c : n ? 0.94 * c : 0.8 * c,
      m = s ? 22 : n ? 8 : 15,
      d = Number(t.dirX || 0) * -8;
    const b = !1,
      u = this.ball.pos.clone();
    this._launchBallToTarget(this.ball.pos, new o.Vector3(p, 0, y), f, {
      topspin: m,
      sidespin: d,
      allowNetFault: b,
    });
    const w = Math.round(
      s
        ? 188 + Math.min(22, (a - 1) * 32)
        : n
          ? 128 + Math.random() * 14
          : 158 + Math.min(22, (a - 0.9) * 28),
    );
    this.natpfArena.setSpeed(w); // NATPF: velocità del servizio sui segnapunti dell'arena
    if (
      ((this.ball.inPlay = !0),
      (this.ball.lastHitter = e.role === "player" ? "player" : "opponent"),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount = 1),
      (this.ball.isPowerShot = s),
      (this.ball.shotType = s ? "POWER" : "TOPSPIN"),
      this.ballTrail.clear(),
      this.ballTrail.setStyle(this.ball.shotType, s),
      this.ballTrail.pushPoint(this.ball.pos),
      (this.phase = "RALLY"),
      (this.cameraMode = "RALLY_CAM"),
      this.swingVfx &&
        this.swingVfx.onRacketContact({
          actor: e,
          ball: this.ball,
          contactPos: u,
          shotType: s ? "SMASH" : "SERVE",
          isPower: s,
          isServe: !0,
          timingQuality: s ? "PERFECT" : "GOOD",
          speed: this.ball.vel.length(),
        }),
      this.facialFX && this.facialFX.setExpression(e, "effort_shout", 0.55),
      s && ((this.cameraTrauma = 0.34), this._spawnStarBurst(this.ball.pos, 14)),
      this.audioEngine &&
        (this.audioEngine.playSwingWhoosh(s ? 1.5 : 1.1),
        this.audioEngine.playRacketHit(s ? "smash" : "topspin", s ? "perfect" : "good"),
        (e.role === "player" || this.isMultiplayer) &&
          s &&
          !this.autoPlayMode &&
          this.audioEngine.playVoiceCallout("power serve")),
      e.role === "player" || (e.role === "opponent" && this.isMultiplayer))
    ) {
      const _ = e.role === "player" ? "p1" : "p2",
        T = s ? "POWER SERVE!" : n ? "EARLY SERVE" : "GOOD SERVE",
        M = `${w} KM/H \u2022 ${s ? "SWEET SPOT APEX" : n ? "LOW CONTACT" : "SERVICE BOX"}`,
        R = this._projectToScreen(e.pos.clone().add(new o.Vector3(0, 2.35, 0)));
      this.hud.showTimingPopup({ grade: T, detail: M, screenPos: R }),
        this.hud.updateTimingGauge({
          cursorNormalized: s ? 0.5 : n ? 0.22 : 0.42,
          modeTitle: "SERVE IMPACT",
          speedText: `${w} KM/H`,
        }),
        this.motionController &&
          this.motionController.triggerHapticFeedback &&
          !this.autoPlayMode &&
          this.motionController.triggerHapticFeedback({
            role: _,
            kind: "hit",
            grade: T,
            shotType: s ? "SMASH" : "TOPSPIN",
            speedKmh: w,
            intensity: s ? 1.5 : n ? 0.75 : 1.05,
          });
    }
    const x = e.role === "player" ? this.opponent : this.player;
    this._predictBallIntercept(x);
  }
  _attemptPlayerRallyStrike(e = {}, t = !1) {
    if (this.ball.lastHitter === "player") return !1;
    const i = this.ball.pos.z - this.player.pos.z,
      a = Math.abs(this.ball.pos.x - this.player.pos.x),
      s = Math.hypot(a, i),
      n = this.ball.pos.z - this.playerPartner.pos.z,
      h = Math.abs(this.ball.pos.x - this.playerPartner.pos.x),
      r = Math.hypot(h, n),
      l = this.isDoubles && !t && this.ball.pos.z > 0.3 && this.ball.pos.z <= 7.6 && r <= 3.95 && r < s,
      p = l ? this.playerPartner : this.player,
      g = (l ? n : i) - NS.latencyShift(e, this.ball.vel.z), // NATPF: telefono in verticale, la palla quando il telefono ha colpito
      c = l ? h : a,
      y = l ? r : s;
    if (!t && p.swingCooldown > 0) return !1;
    const f = o.MathUtils.clamp(Number(e.speed || 1.18), 0.8, 1.68);
    if (e.shotType) {
      const A = String(e.shotType).toUpperCase();
      this.selectedShotType = A === "SMASH" || A === "POWER" ? "FLAT" : A;
    }
    const m =
        e.side === "backhand"
          ? !0
          : e.side === "forehand"
            ? !1
            : Number(e.dirX || 0) > 0.14
              ? !0
              : Number(e.dirX || 0) < -0.14
                ? !1
                : this.ball.pos.x < p.pos.x - 0.04 || this.ball.targetLanding.x < -0.12,
      d =
        e.side === "overhead" ||
        ((this.selectedShotType === "FLAT" || e.shotType === "smash") && this.ball.pos.y > 1.5) ||
        this.ball.pos.y > 1.78;
    if (
      ((p.swingType = d ? "smash" : m ? "backhand" : "forehand"),
      (p.swingDuration = 0.36),
      (p.swingTimer = 0.36),
      (p.arcVisibleTimer = this.autoPlayMode ? 0.85 : 0.36),
      p.swingArcMesh && (p.swingArcMesh.visible = !1),
      this.racketKinematics)
    ) {
      const A = String(e.shotType || this.selectedShotType || "topspin").toLowerCase(),
        G = d || A === "power" ? "smash" : A;
      this.racketKinematics.triggerSwing(p, {
        shotType: G,
        side: d ? "overhead" : m ? "backhand" : "forehand",
        speed: f,
        timing: "sweet",
        dirX: Number(e.dirX || 0),
      });
    }
    if ((this.audioEngine && this.audioEngine.playSwingWhoosh(f), y > (l ? 4.05 : 4.85) && !t)) {
      if (g > 1.45) {
        p.swingCooldown = 0.16;
        const A = "TOO LATE! \u2022 WHIFF",
          G = this._projectToScreen(p.pos.clone().add(new o.Vector3(0, 2.35, 0)));
        this.hud.showTimingPopup({ grade: A, detail: "BALL PASSED", screenPos: G, durationMs: 750 }),
          this.hud.updateTimingGauge({
            cursorNormalized: 0.92,
            modeTitle: "SWING WHIFF!",
            speedText: "LATE",
          }),
          this.motionController &&
            this.motionController.triggerHapticFeedback &&
            this.motionController.triggerHapticFeedback({
              role: "p1",
              kind: "whiff",
              grade: A,
              shotType: this.selectedShotType || "TOPSPIN",
              speedKmh: 0,
              intensity: 0.65,
            });
      }
      return !1;
    }
    let u = "PERFECT",
      w = 0.5;
    const x = c > 2.85;
    e.timing
      ? (u = String(e.timing).toUpperCase())
      : e.sweetSpotAssisted && g >= -1.85 && g <= 0.78
        ? ({ grade: u, cursor: w } = NS.assistGrade(e.natpfLead, NS.skillLevel(this.matchConfig.difficulty))) // NATPF skill gap

        : g < -2.65
          ? ((u = "VERY EARLY"), (w = 0.14))
          : g < -1.45 // NATPF skill gap: il voto dipende dal tempo, non dalla mira (prima: dirX < −0,52 = «in anticipo»)
            ? ((u = "EARLY"), (w = 0.28))
            : g > 1.35
              ? ((u = "VERY LATE"), (w = 0.88))
              : g > 0.68 // NATPF skill gap: come sopra (prima: dirX > 0,52 = «in ritardo»)
                ? ((u = "LATE"), (w = 0.72))
                : x &&
                  this.matchConfig.difficulty === "pro" &&
                  ((u = g < 0 ? "EARLY" : "LATE"), (w = g < 0 ? 0.3 : 0.7));
    // NATPF: telefono in verticale → il voto viene dal tempo vero del colpo (istante del picco sul telefono)
    const natpfSwing = !t && e.natpf && e.natpf.aim === "swing" && !e.timing,
      natpfTau = natpfSwing ? (e.sweetSpotAssisted ? Number(e.natpfLead || 0) + NS.eventLatency(e) : NS.swingTiming(g, this.ball.vel.z)) : 0;
    natpfSwing && ({ grade: u, cursor: w } = NS.swingGrade(natpfTau, NS.skillLevel(this.matchConfig.difficulty)));
    const _ = u === "VERY EARLY" || u === "VERY LATE",
      T = this.selectedShotType || "TOPSPIN",
      M = !_ && (u === "PERFECT" || T === "FLAT" || d) && f >= 0.98,
      R = p.pos.x >= 0 ? 1 : -1,
      v = o.MathUtils.clamp(Number(e.dirX || 0), -1, 1);
    // NATPF skill gap: la direzione segue la mira (e il piatto del telefono), la dispersione cresce con il tempo
    // sbagliato e con la potenza, e vicino alle righe si può uscire (natpf_skill.js). Prima: sempre dentro le righe.
    const natpfLv = NS.skillLevel(this.matchConfig.difficulty),
      natpfQ =
        (natpfSwing ? NS.swingQuality(natpfTau, NS.skillLevel(this.matchConfig.difficulty)) * NS.prepQuality(e.natpf) : e.sweetSpotAssisted && g >= -1.85 && g <= 0.78 && !e.timing
          ? NS.assistGrade(e.natpfLead, natpfLv).quality
          : NS.timingQuality(u, g)) *
        NS.reachQuality(c, p.vel.length() / Math.max(1, p.maxSpeed)),
      natpfDrop = !!(e.natpfDrop || (e.natpf && e.natpf.shot === "drop"));
    let E = t
      ? o.MathUtils.clamp(v * 2.6, -S.SINGLES_X + 0.6, S.SINGLES_X - 0.6)
      : natpfSwing
        ? NS.swingLandingX({
            timing: natpfTau,
            contact: (m ? -1 : 1) * (e.natpf.hand === "left" ? -1 : 1),
            wrist: e.natpf.wrist,
            aimSource: e.natpf.aimSource,
            quality: natpfQ,
            power: NS.powerNorm(f),
            level: natpfLv,
          })
      : NS.playerLandingX({
          grade: u,
          aim: v,
          aimMode: e.natpf && e.natpf.aim,
          side: R,
          openSide: this.opponent.pos.x >= 0 ? -1 : 1,
          quality: natpfQ,
          power: NS.powerNorm(f),
          level: natpfLv,
        });
    _ && !t && (E *= 0.75);
    let k = !1,
      O = !1;
    let N = -(8.2 + Math.random() * 2.6),
      I = 0.84,
      C = 16,
      V = 0;
    _ && !k && !O
      ? ((I = 1.04), (N = -(6.2 + Math.random() * 2.2)), (C = 6))
      : l
        ? ((I = M ? 0.56 : 0.68), (N = -(5.6 + Math.random() * 3.4)), (C = 12))
        : natpfDrop
          ? ((N = -(2.7 + Math.random() * 1.5)), (I = Math.max(1.32, (Math.abs(this.ball.pos.z) - N) / 10)), (C = -2), (V = 0)) // NATPF skill gap: palla corta vera
        : T === "LOB"
          ? ((I = NS.LOB_FLIGHT + Math.random() * 0.2), (N = -(9 + Math.random() * 2)), (C = 4)) // NATPF: pallonetto vero (prima 1,32 s: saliva a 2,5 m e cadeva a metà campo)
          : T === "SLICE"
            ? ((I = 0.98), (N = -(6.8 + Math.random() * 2.6)), (C = -6.5), (V = -R * 11))
            : T === "FLAT" || M
              ? ((I = Math.max(0.58, 0.72 / Math.min(1.2, f * 0.94))),
                (N = -(9 + Math.random() * 2.2)),
                (C = 21))
              : (I = Math.max(0.68, 0.84 / Math.min(1.16, f * 0.92)));
    const K = Math.max(0.84, 1 - Math.min(8, this.ball.rallyStrokeCount) * 0.015);
    natpfDrop || T === "LOB" || (I *= K); // NATPF skill gap: palla corta e pallonetto non accelerano con lo scambio
    // NATPF skill gap: profondità con rischio di palla lunga, velocità che cresce con i colpi perfetti consecutivi
    if (!t) {
      // NATPF: telefono in verticale → profondità dalla forza vera del gesto (lento = palla corta che la CPU attacca)
      natpfSwing && !_ && !l && !natpfDrop && T !== "LOB" && T !== "SLICE" && (N = NS.swingDepthZ(NS.powerNorm(f)));
      N = NS.playerDepthZ(N, { quality: natpfQ, power: NS.powerNorm(f), level: natpfLv });
      // rischio d'errore del giocatore: lungo con la potenza, largo vicino alle righe, in rete fuori tempo
      const natpfErr = natpfDrop ? { kind: "ok" } : NS.playerErrorPlan({ quality: natpfQ, power: NS.powerNorm(f), aimX: E, level: natpfLv });
      natpfErr.kind === "long" ? (N = natpfErr.z) : natpfErr.kind === "wide" ? (E = natpfErr.x) : natpfErr.kind === "net" && (O = !0);
      // NATPF varietà: l'angolo stretto cade corto (prima la palla molto angolata cadeva in fondo, cioè fuori)
      natpfErr.kind === "ok" && !_ && !l && !natpfDrop && T !== "LOB" && (N = NS.angleDepth(E, N));
      const natpfS = NS.registerPlayerShot(this, {
        grade: u, quality: natpfQ, power: NS.powerNorm(f), landingX: E, landingZ: N,
        shot: d ? "SMASH" : natpfDrop ? "DROP" : T, cpuZ: this.opponent.pos.z,
      });
      I = NS.mistimeFlight(natpfDrop || T === "LOB" ? I : NS.streakFlight(I, natpfS.streak, natpfLv), natpfQ);
      natpfDrop || (I = NS.minClearFlight({ fromY: Math.max(0.78, Math.min(1.92, this.ball.pos.y)), fromZ: this.ball.pos.z, toZ: N, flight: I, topspin: C }));
      // NATPF varietà: altezza sulla rete e top spin dal colpo e dalla forza (prima tutti i colpi passavano a filo)
      if (!natpfDrop && !O && !_ && !l && T !== "LOB") {
        const A = NS.shotArc({ shot: M && T !== "SLICE" ? "FLAT" : T, power: NS.powerNorm(f), quality: natpfQ, fromY: Math.max(0.78, Math.min(1.92, this.ball.pos.y)), fromZ: this.ball.pos.z, toZ: N, flight: I });
        (I = A.flight), (C = A.topspin);
      }
    }
    const B = this.ball.pos.clone();
    (B.y = Math.max(0.78, Math.min(1.92, B.y))),
      this.ball.pos.copy(B),
      this._launchBallToTarget(B, new o.Vector3(E, 0, N), I, { topspin: C, sidespin: V, allowNetFault: O }),
      // NATPF varietà: il lancio non considera l'aria e ogni colpo cadeva circa 2 m prima del bersaglio (palle «in fondo»
      // a metà campo, errori «lunghi» che restavano dentro): la velocità si corregge perché la palla cada alla profondità voluta
      O || NS.fixAir(this.ball, { from: B, to: { x: E, z: N }, topspin: C, sidespin: V, gravity: L.GRAVITY, drag: L.AIR_DRAG }),
      (this.ball.inPlay = !0),
      (this.ball.lastHitter = "player"),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount += 1),
      (this.ball.shotType = T),
      (this.ball.isPowerShot = M),
      this.ballTrail.setStyle(T, M),
      this.racketKinematics && this.racketKinematics.triggerImpactRecoil(p, M ? 1.4 : 1),
      this.swingVfx &&
        this.swingVfx.onRacketContact({
          actor: p,
          ball: this.ball,
          contactPos: B,
          shotType: d ? "SMASH" : T,
          isPower: M,
          isServe: !1,
          timingQuality: u,
          speed: this.ball.vel.length(),
        }),
      this.facialFX && this.facialFX.setExpression(p, M ? "effort_shout" : "focused_squint", 0.55),
      M && ((this.cameraTrauma = 0.26), this._spawnStarBurst(B, 11)),
      this.audioEngine &&
        (this.audioEngine.playRacketHit(
          T === "FLAT" || d ? "smash" : T.toLowerCase(),
          u === "PERFECT" ? "perfect" : "good",
        ),
        p.swingType === "smash" && !this.autoPlayMode && this.audioEngine.playVoiceCallout("smash"));
    const F = Math.round(this.ball.vel.length() * 6.8),
      H = d ? "SMASH" : m ? "BACKHAND" : "FOREHAND",
      // NATPF: i colpi speciali si vedono sempre per nome (prima «anticipo/ritardo» copriva pallonetto e palla corta)
      natpfSpecial = d ? "SMASH" : natpfDrop ? "DROP SHOT" : T === "LOB" ? "LOB" : T === "SLICE" ? "SLICE" : null,
      X = l
        ? "NET VOLLEY"
        : _
          ? "DEFENSIVE"
          : natpfSpecial && !t
            ? (d ? "SMASH" : `${H} ${natpfSpecial}`)
          : u === "EARLY"
            ? `${H} CROSS`
            : u === "LATE"
              ? `${H} LINE`
              : `${H} ${T}`;
    if (!this.autoPlayMode) {
      const A = this._projectToScreen(p.pos.clone().add(new o.Vector3(0, 2.35, 0)));
      this.hud.showTimingPopup({ grade: `${u} \u2022 ${X}!`, detail: `${F} KM/H`, screenPos: A }),
        this.motionController &&
          this.motionController.triggerHapticFeedback &&
          this.motionController.triggerHapticFeedback({
            role: "p1",
            kind: _ ? "fault" : "hit",
            grade: `${u} \u2022 ${X}`,
            shotType: d ? "SMASH" : T,
            speedKmh: F,
            intensity: M ? 1.45 : _ ? 0.75 : 1.1,
          });
    }
    return (
      this.hud.updateTimingGauge({ cursorNormalized: w, modeTitle: `${u} (${X})`, speedText: `${F} KM/H` }),
      this.player.targetPos.set(o.MathUtils.clamp(-E * 0.22, -1.6, 1.6), 0, S.BASELINE_Z - 0.15),
      this.playerPartner.targetPos.set(
        o.MathUtils.clamp(E * 0.35 + (this.score.deuceSide ? -1.4 : 1.4), -2.8, 2.8),
        0,
        5.1,
      ),
      this._predictBallIntercept(this.opponent),
      this.isMultiplayer || t || NS.planCpuRun(this), // NATPF skill gap: reazione e lettura della CPU
      !0
    );
  }
  _attemptP2RallyStrike(e = {}) {
    if (this.ball.lastHitter === "opponent") return !1;
    const t = this.opponent.pos.z - this.ball.pos.z,
      i = Math.abs(this.ball.pos.x - this.opponent.pos.x),
      a = Math.hypot(i, t),
      s = this.opponentPartner.pos.z - this.ball.pos.z,
      n = Math.abs(this.ball.pos.x - this.opponentPartner.pos.x),
      h = Math.hypot(n, s),
      r = this.isDoubles && this.ball.pos.z < -0.3 && this.ball.pos.z >= -7.6 && h <= 3.95 && h < a,
      l = r ? this.opponentPartner : this.opponent,
      p = (r ? s : t) - NS.latencyShift(e, this.ball.vel.z), // NATPF: telefono del P2 in verticale, la palla quando il telefono ha colpito (0 senza dati NATPF)
      g = r ? n : i,
      c = r ? h : a;
    if (l.swingCooldown > 0) return !1;
    const y = o.MathUtils.clamp(Number(e.speed || 1.18), 0.8, 1.68);
    if (e.shotType) {
      const C = String(e.shotType).toUpperCase();
      this.p2SelectedShotType = C === "SMASH" || C === "POWER" ? "FLAT" : C;
    }
    const f =
        e.side === "backhand"
          ? !0
          : e.side === "forehand"
            ? !1
            : Number(e.dirX || 0) > 0.14
              ? !0
              : Number(e.dirX || 0) < -0.14
                ? !1
                : this.ball.pos.x > l.pos.x + 0.04 || this.ball.targetLanding.x > 0.12,
      m = this.p2SelectedShotType || "TOPSPIN",
      d =
        e.side === "overhead" ||
        ((m === "FLAT" || e.shotType === "smash") && this.ball.pos.y > 1.5) ||
        this.ball.pos.y > 1.78;
    if (
      ((l.swingType = d ? "smash" : f ? "backhand" : "forehand"),
      (l.swingDuration = 0.36),
      (l.swingTimer = 0.36),
      (l.arcVisibleTimer = 0.36),
      l.swingArcMesh && (l.swingArcMesh.visible = !1),
      this.racketKinematics)
    ) {
      const C = String(e.shotType || m || "topspin").toLowerCase(),
        V = d || C === "power" ? "smash" : C;
      this.racketKinematics.triggerSwing(l, {
        shotType: V,
        side: d ? "overhead" : f ? "backhand" : "forehand",
        speed: y,
        timing: "sweet",
        dirX: Number(e.dirX || 0),
      });
    }
    if ((this.audioEngine && this.audioEngine.playSwingWhoosh(y), c > (r ? 4.05 : 4.85)))
      return (
        p > 1.45 &&
          ((l.swingCooldown = 0.16),
          this.motionController &&
            this.motionController.triggerHapticFeedback &&
            this.motionController.triggerHapticFeedback({
              role: "p2",
              kind: "whiff",
              grade: "TOO LATE! \u2022 WHIFF",
              shotType: m,
              speedKmh: 0,
              intensity: 0.65,
            })),
        !1
      );
    let u = "PERFECT";
    e.sweetSpotAssisted && p >= -1.85 && p <= 0.78
      ? (u = NS.assistGrade(e.natpfLead, NS.skillLevel("1v1")).grade) // NATPF skill gap
      : p < -1.45 // NATPF skill gap: il voto dipende dal tempo, non dalla mira
        ? (u = "EARLY")
        : p > 0.68 && (u = "LATE");
    // NATPF: il P2 con il telefono in verticale gioca come il P1: voto dal tempo vero del colpo, direzione da tempo e
    // polso, mano mancina, palla corta e pallonetto veri. Senza il campo natpf (webcam, tastiera, server vecchio) come prima.
    const natpfSwing = !!(e.natpf && e.natpf.aim === "swing" && !e.timing),
      natpfLv = NS.skillLevel("1v1"),
      natpfTau = natpfSwing ? (e.sweetSpotAssisted ? Number(e.natpfLead || 0) + NS.eventLatency(e) : NS.swingTiming(p, this.ball.vel.z)) : 0,
      natpfDrop = !!(e.natpfDrop || (e.natpf && e.natpf.shot === "drop")),
      natpfLob = !!e.natpf && m === "LOB";
    natpfSwing && (u = NS.swingGrade(natpfTau, natpfLv).grade);
    const w = (u === "PERFECT" || m === "FLAT" || d) && y >= 0.98,
      x = l.pos.x >= 0 ? 1 : -1,
      _ = o.MathUtils.clamp(Number(e.dirX || 0), -1, 1);
    let T = 0;
    if (u === "EARLY") T = -x * (2.25 + Math.random() * 1.1) - _ * 0.95;
    else if (u === "LATE") T = x * (2.25 + Math.random() * 1.05) - _ * 0.95;
    else {
      const C = this.player.pos.x >= 0 ? -1 : 1;
      T = Math.abs(_) > 0.22 ? -_ * (2.65 + Math.random() * 0.95) : C * (2.35 + Math.random() * 1.25);
    }
    // NATPF skill gap: anche il Player 2 rischia vicino alle righe con potenza e tempo sbagliato (prima: sempre dentro)
    const natpfP2Q = natpfSwing
      ? NS.swingQuality(natpfTau, natpfLv) * NS.prepQuality(e.natpf) * NS.reachQuality(g, l.vel.length() / Math.max(1, l.maxSpeed))
      : e.sweetSpotAssisted && p >= -1.85 && p <= 0.78 ? NS.assistGrade(e.natpfLead, NS.skillLevel("1v1")).quality : NS.timingQuality(u, p);
    T = natpfSwing
      ? // NATPF: come il P1 (swingLandingX), specchiato: il P2 guarda verso +z, la sua destra è −x
        -NS.swingLandingX({
          timing: natpfTau,
          contact: (f ? -1 : 1) * ((e.natpf.hand || e.hand) === "left" ? -1 : 1),
          wrist: e.natpf.wrist,
          aimSource: e.natpf.aimSource,
          quality: natpfP2Q,
          power: NS.powerNorm(y),
          level: natpfLv,
        })
      : NS.landingScatter(T, { quality: natpfP2Q, power: NS.powerNorm(y), level: NS.skillLevel("1v1") });
    const natpfVery = u === "VERY EARLY" || u === "VERY LATE";
    natpfVery && (T *= 0.75);
    let M = 8 + Math.random() * 2.6,
      R = w ? 0.72 : 0.86,
      v = w ? 20 : 15,
      E = 0;
    r
      ? ((R = w ? 0.58 : 0.7), (M = 5.6 + Math.random() * 3.2))
      : natpfDrop
        ? ((M = 2.7 + Math.random() * 1.5), (R = Math.max(1.32, (Math.abs(this.ball.pos.z) + M) / 10)), (v = -2), (E = 0)) // NATPF: palla corta vera anche per il P2
      : natpfLob
        ? ((R = NS.LOB_FLIGHT + Math.random() * 0.2), (M = 9 + Math.random() * 2), (v = 4)) // NATPF: pallonetto vero anche per il P2
      : m === "LOB"
        ? ((R = 1.3), (M = 9 + Math.random() * 2), (v = 4))
        : m === "SLICE" && ((R = 0.98), (M = 6.8 + Math.random() * 2.5), (v = -6), (E = x * 10));
    // NATPF: telefono in verticale → profondità dalla forza vera del gesto, come il P1 (z positiva: metà campo del P1)
    natpfSwing && !natpfVery && !r && !natpfDrop && m !== "LOB" && m !== "SLICE" && (M = -NS.swingDepthZ(NS.powerNorm(y)));
    {
      const natpfS = NS.registerPlayerShot(this, { grade: u, quality: natpfP2Q, power: NS.powerNorm(y), landingX: T, shot: d ? "SMASH" : natpfDrop ? "DROP" : m, who: "p2" });
      (M = -NS.playerDepthZ(-M, { quality: natpfP2Q, power: NS.powerNorm(y), level: NS.skillLevel("1v1") })),
        // NATPF: palla corta e pallonetto non accelerano con la serie di perfetti; il colpo del telefono passa la rete
        natpfDrop || natpfLob || (R = NS.streakFlight(R, natpfS.p2Streak, NS.skillLevel("1v1"))),
        natpfSwing && !natpfDrop && (R = NS.minClearFlight({ fromY: Math.max(0.78, Math.min(1.92, this.ball.pos.y)), fromZ: this.ball.pos.z, toZ: M, flight: R, topspin: v }));
      // NATPF varietà: come il P1, angolo stretto corto e altezza sulla rete dal colpo e dalla forza (anche senza telefono)
      if (!r && !natpfDrop && !natpfVery && m !== "LOB") {
        M = NS.angleDepth(T, M);
        const A = NS.shotArc({ shot: w && m !== "SLICE" ? "FLAT" : m, power: NS.powerNorm(y), quality: natpfP2Q, fromY: Math.max(0.78, Math.min(1.92, this.ball.pos.y)), fromZ: this.ball.pos.z, toZ: M, flight: R });
        (R = A.flight), (v = A.topspin);
      }
    }
    const k = this.ball.pos.clone();
    (k.y = Math.max(0.78, Math.min(1.92, k.y))),
      this.ball.pos.copy(k),
      this._launchBallToTarget(k, new o.Vector3(T, 0, M), R, { topspin: v, sidespin: E, allowNetFault: !1 }),
      NS.fixAir(this.ball, { from: k, to: { x: T, z: M }, topspin: v, sidespin: E, gravity: L.GRAVITY, drag: L.AIR_DRAG }), // NATPF varietà: la palla cade alla profondità voluta, come per il P1
      // NATPF: palla corta e pallonetto veri del P2, compensati per l'attrito dell'aria come quelli del P1
      (this.ball.inPlay = !0),
      (this.ball.lastHitter = "opponent"),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount += 1),
      (this.ball.shotType = m),
      (this.ball.isPowerShot = w),
      this.ballTrail.setStyle(m, w),
      this.racketKinematics && this.racketKinematics.triggerImpactRecoil(l, w ? 1.4 : 1),
      this.swingVfx &&
        this.swingVfx.onRacketContact({
          actor: l,
          ball: this.ball,
          contactPos: k,
          shotType: d ? "SMASH" : m,
          isPower: w,
          isServe: !1,
          timingQuality: u,
          speed: this.ball.vel.length(),
        }),
      this.facialFX && this.facialFX.setExpression(l, w ? "effort_shout" : "focused_squint", 0.55),
      w && ((this.cameraTrauma = 0.24), this._spawnStarBurst(k, 10)),
      this.audioEngine &&
        this.audioEngine.playRacketHit(
          m === "FLAT" || d ? "smash" : m.toLowerCase(),
          u === "PERFECT" ? "perfect" : "good",
        );
    const O = Math.round(this.ball.vel.length() * 6.8),
      // NATPF: i colpi speciali del P2 si vedono per nome, come quelli del P1
      natpfP2Special = natpfSwing || natpfDrop ? (d ? "SMASH" : natpfDrop ? "DROP SHOT" : m === "LOB" ? "LOB" : m === "SLICE" ? "SLICE" : null) : null,
      N = r
        ? "NET VOLLEY"
        : natpfP2Special
          ? natpfP2Special
        : u === "EARLY" || u === "VERY EARLY"
          ? "CROSS-COURT"
          : u === "LATE" || u === "VERY LATE"
            ? "DOWN THE LINE"
            : `SWEET SPOT ${m}`,
      I = this._projectToScreen(l.pos.clone().add(new o.Vector3(0, 2.35, 0)));
    return (
      this.hud.showTimingPopup({ grade: `P2 ${u} \u2022 ${N}!`, detail: `${O} KM/H`, screenPos: I }),
      this.motionController &&
        this.motionController.triggerHapticFeedback &&
        this.motionController.triggerHapticFeedback({
          role: "p2",
          kind: "hit",
          grade: `${u} \u2022 ${N}`,
          shotType: d ? "SMASH" : m,
          speedKmh: O,
          intensity: w ? 1.45 : 1.1,
        }),
      this.opponent.targetPos.set(o.MathUtils.clamp(-T * 0.22, -1.6, 1.6), 0, -S.BASELINE_Z + 0.25),
      this.opponentPartner.targetPos.set(
        o.MathUtils.clamp(T * 0.35 + (this.score.deuceSide ? 1.4 : -1.4), -2.8, 2.8),
        0,
        -5.1,
      ),
      this._predictBallIntercept(this.player),
      !0
    );
  }
  _executeOpponentReturn(e = this.opponent) {
    const t = e === this.opponentPartner,
      i = this.matchConfig.difficulty !== "pro",
      a = Math.abs(this.ball.pos.x - e.pos.x),
      s = !!this.ball.isPowerShot,
      h = a > (i ? 1.08 : 1.55) || (s && a > (i ? 0.75 : 1.25)),
      r = this.ball.pos.x > e.pos.x + 0.05;
    (e.swingType = r ? "backhand" : "forehand"),
      (e.swingDuration = 0.36),
      (e.swingTimer = 0.36),
      (e.arcVisibleTimer = this.autoPlayMode ? 0.85 : 0.36),
      e.swingArcMesh && (e.swingArcMesh.visible = !1);
    const l = this.player.pos.x >= 0 ? -1 : 1,
      p = i ? 0.85 + Math.random() * 1.15 : 1.25 + Math.random() * 1.75;
    let g = o.MathUtils.clamp(l * p, -S.SINGLES_X + 0.65, S.SINGLES_X - 0.65),
      c = i ? 6.4 + Math.random() * 2.4 : 7.4 + Math.random() * 3,
      y = "TOPSPIN",
      f = i ? 1.14 : 0.88,
      m = !1
    let natpfArc = null;
    // NATPF skill gap: errori della CPU che crescono con angolo, velocità, pressione e allungo; sotto pressione
    // la CPU rimanda palle corte e alte da smash (natpf_skill.js). Prima: errori solo in allungo e a caso.
    const natpfPlan = NS.cpuReturnPlan(this, e);
    if (this.autoPlayMode && !this.userHasInteracted) (y = "TOPSPIN"), (f = 0.84);
    else if (natpfPlan.kind === "net") (m = !0), (c = 3.2 + Math.random() * 2.4), (f = 0.78);
    else if (natpfPlan.kind === "wide")
      (g = (Math.random() < 0.5 ? 1 : -1) * (S.SINGLES_X + 0.45 + Math.random() * 0.7)),
        (c = 8.4 + Math.random() * 2.6),
        (f = 0.92);
    else if (natpfPlan.kind === "long") (c = S.BASELINE_Z + 0.55 + Math.random() * 1.1), (f = 1.02);
    else if (natpfPlan.kind === "attack")
      (g = o.MathUtils.clamp(l * (2.4 + Math.random() * 1.1), -S.SINGLES_X + 0.45, S.SINGLES_X - 0.45)),
        (c = 9.4 + Math.random() * 1.6),
        (f = natpfPlan.flight);
    else if (natpfPlan.kind === "weak")
      (y = "LOB"),
        (g = o.MathUtils.clamp((Math.random() - 0.5) * 2.6, -S.SINGLES_X + 1, S.SINGLES_X - 1)),
        (c = 4.4 + Math.random() * 2.4),
        (f = 1.5);
    else if (h && this.ball.rallyStrokeCount >= 2) {
      ((y = a > 1.35 || s ? "LOB" : "SLICE"),
          (g = o.MathUtils.clamp((Math.random() - 0.5) * 2.4, -S.SINGLES_X + 1.1, S.SINGLES_X - 1.1)),
          (c = 5.6 + Math.random() * 2.2),
          (f = y === "LOB" ? 1.36 : 1.18));
    } else if (t) (y = "SLICE"), (c = 5.8 + Math.random() * 2.6), (f = i ? 0.96 : 0.76);
    else {
      // NATPF varietà: schemi scelti per peso (centro, campo libero, contropiede, profondo, angolo stretto, tagliato,
      // parabola alta, pallonetto sul giocatore a rete). Prima: ciclo fisso top, top, tagliato, top, lob verso il campo libero.
      const natpfC = NS.cpuShotChoice({ difficulty: this.matchConfig.difficulty, playerX: this.player.pos.x, playerZ: this.player.pos.z, ballX: this.ball.pos.x, rally: this.ball.rallyStrokeCount });
      (g = natpfC.x), (c = natpfC.z), (natpfArc = natpfC);
      (y = natpfC.shot === "MOON" ? "TOPSPIN" : natpfC.shot),
        (f = y === "LOB" ? (i ? 1.36 : 1.24) : y === "SLICE" ? (i ? 1.18 : 0.96) : i ? 1.1 : 0.86);
    }
    natpfPlan.kind === "attack" && (natpfArc = { shot: "FLAT", power: 0.8 });
    const d = this.ball.pos.clone();
    (d.y = Math.max(0.82, Math.min(1.68, d.y))), this.ball.pos.copy(d);
    // NATPF varietà: altezza sulla rete e top spin dal tipo di colpo e dalla forza (prima: top spin fisso 13 per tutti)
    let natpfSpin = y === "SLICE" ? -5 : y === "LOB" ? 5 : 13;
    if (natpfArc && y !== "LOB") {
      const A = NS.shotArc({ shot: natpfArc.shot, power: natpfArc.power, fromY: d.y, fromZ: d.z, toZ: c, flight: f });
      (f = A.flight), (natpfSpin = A.topspin);
    }
    this._launchBallToTarget(d, new o.Vector3(g, 0, c), f, {
        topspin: natpfSpin,
        sidespin: 0,
        allowNetFault: m,
      }),
      m || NS.fixAir(this.ball, { from: d, to: { x: g, z: c }, topspin: natpfSpin, gravity: L.GRAVITY, drag: L.AIR_DRAG }), // NATPF varietà: la palla della CPU cade alla profondità voluta
      (this.ball.inPlay = !0),
      (this.ball.lastHitter = "opponent"),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount += 1),
      (this.ball.shotType = y),
      (this.ball.isPowerShot = !1),
      this.ballTrail.setStyle(y, !1),
      this.racketKinematics &&
        (this.racketKinematics.triggerSwing(e, {
          shotType: y.toLowerCase(),
          side: r ? "backhand" : "forehand",
          speed: 1.15,
          timing: "sweet",
        }),
        this.racketKinematics.triggerImpactRecoil(e, 0.95)),
      this.swingVfx &&
        this.swingVfx.onRacketContact({
          actor: e,
          ball: this.ball,
          contactPos: d,
          shotType: y,
          isPower: !1,
          isServe: !1,
          timingQuality: "GOOD",
          speed: this.ball.vel.length(),
        }),
      this.facialFX &&
        (this.facialFX.setExpression(e, h ? "wide_eyed_panic" : "effort_shout", 0.65),
        h && this.facialFX.spawnSweatDrops(e, 4)),
      this.audioEngine &&
        (this.audioEngine.playSwingWhoosh(1), this.audioEngine.playRacketHit(y.toLowerCase(), "good")),
      this.opponent.targetPos.set(o.MathUtils.clamp(-g * 0.25, -1.6, 1.6), 0, -S.BASELINE_Z + 0.35),
      this._predictBallIntercept(this.player);
  }
  _launchBallToTarget(e, t, i, { topspin: a = 14, sidespin: s = 0, allowNetFault: n = !1 } = {}) {
    const h = Math.max(0.45, i),
      r = t.x - e.x,
      l = t.z - e.z,
      p = 0.08 - e.y,
      g = L.GRAVITY + a * 0.14,
      c = r / h - 0.5 * (s * 0.12) * h,
      y = l / h,
      f = (p + 0.5 * g * h * h) / h;
    this.ball.vel.set(c, f, y), this.ball.spin.set(a, s, 0), this.ball.targetLanding.copy(t);
    const m = Math.abs(e.z) / Math.max(1, Math.abs(y));
    if (m > 0 && m < h) {
      const d = e.y + f * m - 0.5 * g * m * m;
      if (n) {
        const u = (S.NET_HEIGHT_CENTER - 0.12 - d) / m;
        this.ball.vel.y += u;
      } else {
        const b = S.NET_HEIGHT_CENTER + 0.34;
        if (d < b) {
          const u = (b - d) / m;
          this.ball.vel.y += u;
        }
      }
    }
  }
  _predictBallIntercept(e) {
    const t = this.ball.targetLanding,
      i = o.MathUtils.clamp(
        t.z + e.sideSign * 2.15,
        e.sideSign > 0 ? 3.2 : -13.6,
        e.sideSign > 0 ? 13.4 : -3.2,
      ),
      a = t.x < -0.12 ? 0.38 : -0.38,
      s = o.MathUtils.clamp(t.x + a, -S.DOUBLES_X + 0.4, S.DOUBLES_X - 0.4);
    e.targetPos.set(s, 0, i),
      e === this.player && this.playerPartner
        ? t.z > 0 && t.z < 6.6 && Math.abs(t.x - this.playerPartner.pos.x) < 2.9
          ? this.playerPartner.targetPos.set(
              o.MathUtils.clamp(t.x, -S.SINGLES_X + 0.4, S.SINGLES_X - 0.4),
              0,
              o.MathUtils.clamp(t.z + 0.85, 2.8, 6.2),
            )
          : this.playerPartner.targetPos.set(
              o.MathUtils.clamp(t.x * 0.42 + (this.score.deuceSide ? -1.35 : 1.35), -2.9, 2.9),
              0,
              5.1,
            )
        : e === this.opponent &&
          this.opponentPartner &&
          this.opponentPartner.targetPos.set(
            o.MathUtils.clamp(t.x * 0.45 + (this.score.deuceSide ? 1.35 : -1.35), -2.9, 2.9),
            0,
            -5.1,
          );
  }
  update(e) {
    (this.elapsedTime += e), (this.cameraTrauma = Math.max(0, this.cameraTrauma - e * 1.4));
    const t = this.swingVfx ? this.swingVfx.consumeHitStop(e) : e,
      i = this.phase === "REPLAY" ? 0.38 : this.natpfTimeScale ?? 1; // NATPF: rallentatore del riscaldamento (natpf_training.js)
    for (this.physicsAccumulator += t * i; this.physicsAccumulator >= L.FIXED_DT; )
      this._stepPhysics(L.FIXED_DT), (this.physicsAccumulator -= L.FIXED_DT);
    if (
      (this.isMultiplayer &&
        this.roomId &&
        this.roomId !== "default" &&
        this.playerRole === "p1" &&
        this.elapsedTime - this.lastSyncSentAt >= 0.045 &&
        ((this.lastSyncSentAt = this.elapsedTime), this._broadcastMultiplayerSnapshot()),
      this._updatePlayerAnimation(this.player, e),
      this.isDoubles && this._updatePlayerAnimation(this.playerPartner, e),
      this._updatePlayerAnimation(this.opponent, e),
      this.isDoubles && this._updatePlayerAnimation(this.opponentPartner, e),
      this._updateNatpf(e),
      this._updateCrowdAnimation(e),
      this.swingVfx)
    )
      if (
        (this.swingVfx.update(e, {
          actors: this.isDoubles
            ? [this.player, this.playerPartner, this.opponent, this.opponentPartner]
            : [this.player, this.opponent],
          ball: this.ball,
          camera: this.camera,
        }),
        this.phase === "SHOWCASE")
      ) {
        const a = this.showcaseModeName || "showcase_topspin";
        a === "showcase_slice" || a === "showcase_backhand"
          ? this.swingVfx.seedActorSwingArc(this.player, {
              shotType: "SLICE",
              isPower: !1,
              whipSpeed: 26,
              swingType: "backhand",
            })
          : a === "showcase_smash"
            ? this.swingVfx.seedActorSwingArc(this.player, {
                shotType: "SMASH",
                isPower: !0,
                whipSpeed: 34,
                swingType: "smash",
              })
            : a === "showcase_topspin" &&
              this.swingVfx.seedActorSwingArc(this.player, {
                shotType: "TOPSPIN",
                isPower: !0,
                whipSpeed: 29,
                swingType: "forehand",
              });
      } else
        this.phase === "REPLAY" && this.persistentStateLock && !this.userHasInteracted
          ? (this.swingVfx.seedActorSwingArc(this.player, {
              shotType: "TOPSPIN",
              isPower: !0,
              whipSpeed: 28,
              swingType: "forehand",
            }),
            this.swingVfx.seedActorSwingArc(this.opponent, {
              shotType: "SLICE",
              isPower: !1,
              whipSpeed: 25,
              swingType: "forehand",
            }))
          : this.phase === "RALLY" &&
            this.autoPlayMode &&
            !this.userHasInteracted &&
            this.swingVfx.seedActorSwingArc(this.player, {
              shotType: "TOPSPIN",
              isPower: !0,
              whipSpeed: 28,
              swingType: "forehand",
            });
    this._updateEffects(e), this._updateCameraRig(e), this._updateProjectedHUD();
  }
  _stepPhysics(e) {
    if (
      ((this.phaseTimer += e),
      this.player.swingCooldown > 0 &&
        (this.player.swingCooldown = Math.max(0, this.player.swingCooldown - e)),
      this.playerPartner.swingCooldown > 0 &&
        (this.playerPartner.swingCooldown = Math.max(0, this.playerPartner.swingCooldown - e)),
      this.opponent.swingCooldown > 0 &&
        (this.opponent.swingCooldown = Math.max(0, this.opponent.swingCooldown - e)),
      this.opponentPartner.swingCooldown > 0 &&
        (this.opponentPartner.swingCooldown = Math.max(0, this.opponentPartner.swingCooldown - e)),
      this.phase === "SHOWCASE")
    ) {
      if (this.phaseTimer >= 0.34) (this.phaseTimer = 0), this._refreshShowcasePose();
      else {
        const t = this.showcaseModeName || "showcase_topspin";
        (t === "showcase_slice" || t === "showcase_backhand") && this.player.racketKinematics
          ? ((this.player.racketKinematics.swingActive = !0),
            (this.player.racketKinematics.swingElapsed = 0.072),
            (this.player.swingTimer = 0.26))
          : t === "showcase_smash" && this.player.racketKinematics
            ? ((this.player.racketKinematics.swingActive = !0),
              (this.player.racketKinematics.swingElapsed = 0.058),
              (this.player.swingTimer = 0.26))
            : t === "showcase_topspin" && this.player.racketKinematics
              ? ((this.player.racketKinematics.swingActive = !0),
                (this.player.racketKinematics.swingElapsed = 0.068),
                (this.player.swingTimer = 0.26))
              : t === "showcase_panic"
                ? (this.player.vel.set(-6.8, 0, 1.2), (this.player.stridePhase += e * 15))
                : t === "showcase_win" &&
                  this.player.rig?.reaction &&
                  (this.player.rig.reaction.timer = 0.16);
      }
      return;
    }
    if (this.phase === "REPLAY") {
      if (this.persistentStateLock && !this.userHasInteracted) {
        const t = 0.5 + 0.5 * Math.sin(this.elapsedTime * 2.2),
          i = new o.Vector3(-1.12, 1.22, -1.08),
          a = new o.Vector3(-0.18 + t * 0.22, 1.32 + t * 0.08, -0.05 + t * 0.22);
        this.ball.pos.copy(a),
          this.ballTrail.seedArc(i, a, 0.24),
          (this.player.swingTimer = 0.22),
          (this.player.arcVisibleTimer = 0.9),
          (this.opponent.swingTimer = 0.2),
          (this.opponent.arcVisibleTimer = 0.9),
          this.player.racketKinematics &&
            ((this.player.racketKinematics.swingActive = !0),
            (this.player.racketKinematics.swingShotType = "topspin"),
            (this.player.racketKinematics.swingSide = "forehand"),
            (this.player.racketKinematics.swingElapsed = 0.13)),
          this.opponent.racketKinematics &&
            ((this.opponent.racketKinematics.swingActive = !0),
            (this.opponent.racketKinematics.swingShotType = "slice"),
            (this.opponent.racketKinematics.swingSide = "forehand"),
            (this.opponent.racketKinematics.swingElapsed = 0.11));
        return;
      }
      this.ball.pos.addScaledVector(this.ball.vel, e),
        (this.ball.vel.y -= L.GRAVITY * 0.65 * e),
        this.ballTrail.pushPoint(this.ball.pos),
        this.phaseTimer > 1.45 && (this.hud.setReplayMode(!1), this._setupPointServe({ showBanner: !0 }));
      return;
    }
    if (
      (this.phase === "SERVE_STANCE" &&
        !this.persistentStateLock &&
        (this.score.server === "opponent" && !this.isMultiplayer && this.phaseTimer > 1.25
          ? this._startServeToss(this.opponent)
          : this.autoPlayMode &&
            this.score.server === "player" &&
            this.phaseTimer > 1.4 &&
            this._startServeToss(this.player)),
      this.phase === "SERVE_TOSS")
    ) {
      this.ball.pos.addScaledVector(this.ball.vel, e), (this.ball.vel.y -= L.GRAVITY * e);
      const t = o.MathUtils.clamp((this.ball.pos.y - 1.15) / (3.35 - 1.15), 0, 1);
      if (
        (this.hud.updateTimingGauge({
          cursorNormalized: t * 0.52,
          modeTitle: "SERVE APEX TIMING",
          speedText: this.ball.pos.y >= 2.05 ? "SWEET SPOT! (198 KM/H)" : "RISING...",
        }),
        this.pendingServeSwing && (this.ball.pos.y >= 2.68 || this.ball.vel.y <= 0.35))
      ) {
        const { actor: i, evt: a } = this.pendingServeSwing;
        (this.pendingServeSwing = null), this._executeServeHit(i, a);
        return;
      }
      if (
        ((this.score.server === "opponent" && !this.isMultiplayer) || this.autoPlayMode) &&
        this.ball.vel.y <= 0.25 &&
        this.ball.pos.y >= 2.75
      ) {
        const i = this.score.server === "player" ? this.player : this.opponent;
        this._executeServeHit(i, { timing: "PERFECT" });
        return;
      }
      this.ball.pos.y <= 0.95 &&
        this.ball.vel.y < 0 &&
        ((this.phase = "SERVE_STANCE"),
        (this.phaseTimer = 0),
        this.ball.vel.set(0, 0, 0),
        (this.pendingServeSwing = null));
      return;
    }
    if (this.phase === "POINT_OVER") {
      this.phaseTimer > 2.15 && this._setupPointServe({ showBanner: !0 });
      return;
    }
    if (this.phase === "RALLY" && this.ball.inPlay) {
      if (this.autoPlayMode && !this.userHasInteracted) {
        const s = (this.elapsedTime * 0.85) % 1,
          n = 0.42 + 0.34 * Math.sin(s * Math.PI * 2),
          h = new o.Vector3(1.42, 1.24, 10.85),
          r = new o.Vector3(-1.35, 0.25, -8.5),
          l = new o.Vector3().lerpVectors(h, r, n);
        (l.y += Math.sin(n * Math.PI) * 1.45),
          this.ball.pos.copy(l),
          this.ball.mesh && (this.ball.mesh.rotation.x -= e * 16),
          this.ballTrail.setStyle("TOPSPIN", !1),
          this.ballTrail.seedArc(h, l, 0.78 * n),
          this.player.pos.set(1.35 + Math.sin(this.elapsedTime * 2.2) * 0.18, 0, 11.4),
          (this.player.stridePhase += e * 4.2),
          (this.player.swingType = "forehand"),
          (this.player.swingTimer = 0.24),
          (this.player.arcVisibleTimer = 0.85),
          this.player.racketKinematics &&
            ((this.player.racketKinematics.swingActive = !0),
            (this.player.racketKinematics.swingShotType = "topspin"),
            (this.player.racketKinematics.swingSide = "forehand"),
            (this.player.racketKinematics.swingElapsed = 0.12)),
          this.opponent.pos.set(-1.35 + Math.cos(this.elapsedTime * 2.2) * 0.35, 0, -10.5),
          (this.opponent.stridePhase += e * 4.2);
        return;
      }
      const t = this.ball.pos.z,
        i = this.ball.vel.length(),
        a = Math.max(0, 1 - L.AIR_DRAG * i * e);
      if (
        (this.ball.vel.multiplyScalar(a),
        (this.ball.vel.y -= (L.GRAVITY + this.ball.spin.x * 0.14) * e),
        (this.ball.vel.x += this.ball.spin.y * 0.12 * e),
        this.ball.pos.addScaledVector(this.ball.vel, e),
        this.ball.mesh &&
          ((this.ball.mesh.rotation.x += this.ball.vel.z * e * 1.8),
          (this.ball.mesh.rotation.z -= this.ball.vel.x * e * 1.8)),
        this.ballTrail.pushPoint(this.ball.pos),
        this.ball.isPowerShot && Math.random() < 0.45 && this._spawnStarBurst(this.ball.pos, 1),
        ((t > 0 && this.ball.pos.z <= 0) || (t < 0 && this.ball.pos.z >= 0)) &&
          this.ball.pos.y < S.NET_HEIGHT_CENTER + 0.04)
      ) {
        (this.ball.vel.z *= -0.25),
          (this.ball.vel.x *= 0.45),
          (this.ball.vel.y = 1.2),
          this.audioEngine && this.audioEngine.playNetCord(),
          this._awardPoint(this.ball.lastHitter === "player" ? "opponent" : "player", "Net");
        return;
      }
      if (this.ball.pos.y <= 0.075 && this.ball.vel.y < 0) {
        const s = Math.abs(this.ball.vel.y);
        (this.ball.pos.y = 0.075),
          (this.ball.vel.y = -this.ball.vel.y * L.BOUNCE_RESTITUTION * NS.bounceSpin(this.ball.spin.x).up), // NATPF varietà: il top spin salta, il tagliato resta basso
          (this.ball.vel.x *= L.SURFACE_FRICTION),
          (this.ball.vel.z *= L.SURFACE_FRICTION * NS.bounceSpin(this.ball.spin.x).along),
          this._spawnBounceRing(this.ball.pos.x, this.ball.pos.z),
          this.swingVfx && this.swingVfx.spawnTurfBounce(this.ball.pos.x, this.ball.pos.z, this.ball, s),
          this.audioEngine && this.audioEngine.playBallBounce(Math.min(1.2, s / 5));
        const n = this.ball.pos.z > 0,
          h = this.ball.lastHitter === "player";
        if ((h && n) || (!h && !n)) {
          this._awardPoint(h ? "opponent" : "player", "Out");
          return;
        }
        if (((this.ball.bounceCountOnCurrentSide += 1), this.ball.bounceCountOnCurrentSide === 1)) {
          const r = Math.abs(this.ball.pos.x) > S.SINGLES_X + 0.22,
            l = Math.abs(this.ball.pos.z) > S.BASELINE_Z + 0.28;
          if (r || l) {
            this._awardPoint(h ? "opponent" : "player", "Out");
            return;
          }
        }
        if (this.ball.bounceCountOnCurrentSide >= 2) {
          this._awardPoint(this.ball.lastHitter, "Nice Shot!");
          return;
        }
      }
      if (
        (this.isMultiplayer || NS.tickCpuRun(this), // NATPF skill gap: la CPU parte dopo il tempo di reazione
        this._stepActorFootwork(this.player, e),
        this._stepActorFootwork(this.playerPartner, e),
        this._stepActorFootwork(this.opponent, e),
        this._stepActorFootwork(this.opponentPartner, e),
        this.ball.lastHitter === "player" && this.ball.pos.z < -2)
      )
        if (this.isMultiplayer) {
          const s = Math.hypot(this.ball.pos.x - this.opponent.pos.x, this.ball.pos.z - this.ball.pos.z),
            n = Math.hypot(
              this.ball.pos.x - this.opponentPartner.pos.x,
              this.opponentPartner.pos.z - this.ball.pos.z,
            ),
            h = this.isDoubles && this.ball.pos.z >= -7.2 && n < s && n <= 3.9 ? this.opponentPartner : this.opponent,
            r = h.pos.z - this.ball.pos.z,
            l = Math.abs(this.ball.pos.x - h.pos.x);
          if (this.playerRole === "p2") {
            const p = o.MathUtils.clamp(0.5 + r * 0.16, 0.06, 0.94);
            this.hud.updateTimingGauge({
              cursorNormalized: p,
              modeTitle: h === this.opponentPartner ? "P2 NET TIMING" : "P2 SWING TIMING",
              speedText:
                r >= -1.45 && r <= 0.68 ? "SWEET SPOT!" : r < -1.45 ? "EARLY (CROSS)" : "LATE (LINE)",
            });
          }
          if (this.pendingP2Swing)
            if (this.elapsedTime > this.pendingP2Swing.expiresAt) this.pendingP2Swing = null;
            else {
              const p = h === this.opponentPartner ? 3.95 : 4.65;
              if (r >= -0.85 && r <= 0.65 && Math.hypot(l, r) <= p && this.ball.pos.y < 2.35) {
                const c = this.pendingP2Swing.evt;
                (this.pendingP2Swing = null), this._attemptP2RallyStrike(c);
                return;
              }
            }
          if (this.ball.pos.z < -15.6) {
            this._awardPoint("player", "Nice Shot!");
            return;
          }
        } else {
          const s = this.matchConfig.difficulty !== "pro",
            n = s ? 0.85 : 1.3,
            h = NS.cpuReach(this, s ? 1.8 : 2.34); // NATPF skill gap: portata reale della CPU
          if (
            this.isDoubles &&
            !this.ball.isPowerShot &&
            this.ball.shotType !== "LOB" &&
            this.ball.rallyStrokeCount > 2 &&
            Math.abs(this.ball.pos.z - this.opponentPartner.pos.z) < 0.88 &&
            Math.abs(this.ball.pos.x - this.opponentPartner.pos.x) < n &&
            this.ball.pos.y < 1.78 &&
            (!s || Math.random() < 0.55)
          ) {
            this._executeOpponentReturn(this.opponentPartner);
            return;
          }
          const r = Math.abs(this.ball.pos.z - this.opponent.pos.z),
            l = Math.abs(this.ball.pos.x - this.opponent.pos.x);
          if (r < 1.32 && this.ball.pos.y < (this.ball.shotType === "LOB" ? 3.1 : 2.05)) { // NATPF: la CPU risponde anche al pallonetto (sopra 2,05 m non colpiva mai)
            if (l <= h) this._executeOpponentReturn(this.opponent);
            else if (l <= 3.45 && this.opponent.swingTimer <= 0) {
              const p = this.ball.pos.x < this.opponent.pos.x ? "backhand" : "forehand";
              (this.opponent.swingType = p),
                (this.opponent.swingDuration = 0.36),
                (this.opponent.swingTimer = 0.36),
                (this.opponent.arcVisibleTimer = 0.32),
                this.racketKinematics &&
                  this.racketKinematics.triggerSwing(this.opponent, {
                    shotType: "slice",
                    side: p,
                    speed: 1.2,
                    timing: "late",
                  }),
                this.facialFX &&
                  (this.facialFX.setExpression(this.opponent, "wide_eyed_panic", 0.9),
                  this.facialFX.spawnSweatDrops(this.opponent, 5)),
                this.audioEngine && this.audioEngine.playSwingWhoosh(0.95);
            }
          } else if (this.ball.pos.z < -15.2) {
            this._awardPoint("player", "Nice Shot!");
            return;
          }
        }
      if (this.ball.lastHitter === "opponent" && this.ball.pos.z > 2) {
        const s = Math.hypot(this.ball.pos.x - this.player.pos.x, this.ball.pos.z - this.player.pos.z),
          n = Math.hypot(
            this.ball.pos.x - this.playerPartner.pos.x,
            this.ball.pos.z - this.playerPartner.pos.z,
          ),
          h = this.isDoubles && this.ball.pos.z <= 7.2 && n < s && n <= 3.8 ? this.playerPartner : this.player,
          r = this.ball.pos.z - h.pos.z,
          l = Math.abs(this.ball.pos.x - h.pos.x);
        if (this.playerRole !== "p2") {
          const p = o.MathUtils.clamp(0.5 + r * 0.16, 0.06, 0.94);
          this.hud.updateTimingGauge({
            cursorNormalized: p,
            modeTitle: h === this.playerPartner ? "NET VOLLEY TIMING" : "SWING TIMING",
            speedText:
              r >= -1.45 && r <= 0.68
                ? "SWEET SPOT!"
                : r < -2.65
                  ? "VERY EARLY"
                  : r < -1.45
                    ? "EARLY (CROSS)"
                    : r > 1.35
                      ? "TOO LATE!"
                      : "LATE (LINE)",
          });
        }
        if (this.pendingUserSwing)
          if (this.elapsedTime > this.pendingUserSwing.expiresAt) this.pendingUserSwing = null;
          else {
            const p = h === this.playerPartner ? 3.95 : 4.65;
            if (
              (!this.pendingUserSwing.waitForSweetSpot || (r >= -0.85 && r <= 0.65)) &&
              Math.hypot(l, r) <= p &&
              this.ball.pos.y < 3.4 // NATPF: anche le palle alte (prima 2,35 m: lo swing in attesa scadeva e non si colpiva; sopra 1,78 m è una schiacciata)
            ) {
              const c = this.pendingUserSwing.evt;
              (this.pendingUserSwing = null), this._attemptPlayerRallyStrike(c, !1);
              return;
            }
          }
        if (
          this.autoPlayMode &&
          !this.userHasInteracted &&
          Math.abs(r) < 0.55 &&
          l < 1.45 &&
          this.ball.pos.y < 1.75
        )
          this._attemptPlayerRallyStrike({ timing: "PERFECT" }, !0);
        else if (this.ball.pos.z > 15.6) {
          this._awardPoint("opponent", this.isMultiplayer ? "Nice Shot!" : "Point");
          return;
        }
      }
    }
  }
  _stepActorFootwork(e, t) {
    const i = e.targetPos.x - e.pos.x,
      a = e.targetPos.z - e.pos.z,
      s = Math.hypot(i, a);
    if (s > 0.08) {
      const n = Math.min(s, e.maxSpeed * t),
        h = (i / s) * (n / t),
        r = (a / s) * (n / t);
      e.vel.set(h, 0, r), (e.pos.x += (i / s) * n), (e.pos.z += (a / s) * n), (e.stridePhase += n * 4.4);
    } else e.vel.set(0, 0, 0);
  }
  _awardPoint(e, t = "") {
    (this.phase = "POINT_OVER"),
      (this.phaseTimer = 0),
      (this.ball.inPlay = !1),
      (this.cheerEnergy = 1),
      (this.pendingUserSwing = null),
      (this.pendingP2Swing = null),
      (this.pendingServeSwing = null);
    const i = e === "player";
    this.bodyAnimator &&
      (this.bodyAnimator.triggerPointReaction(this.player, i ? "win" : "loss"),
      this.bodyAnimator.triggerPointReaction(this.playerPartner, i ? "win" : "loss"),
      this.bodyAnimator.triggerPointReaction(this.opponent, i ? "loss" : "win"),
      this.bodyAnimator.triggerPointReaction(this.opponentPartner, i ? "loss" : "win")),
      this.facialFX &&
        (this.facialFX.setExpression(this.player, i ? "happy_grin" : "shocked_loss", 1.8),
        this.facialFX.setExpression(this.playerPartner, i ? "happy_grin" : "shocked_loss", 1.8),
        this.facialFX.setExpression(this.opponent, i ? "shocked_loss" : "happy_grin", 1.8),
        this.facialFX.setExpression(this.opponentPartner, i ? "shocked_loss" : "happy_grin", 1.8),
        this.facialFX.triggerEmoteBurst(i ? this.player : this.opponent, "win")),
      this.audioEngine && this.audioEngine.playCrowdReaction(e === "player" ? "cheer" : "ooh"),
      this.motionController &&
        this.motionController.triggerHapticFeedback &&
        !this.autoPlayMode &&
        (this.motionController.triggerHapticFeedback({
          role: "p1",
          kind: e === "player" ? "point_won" : "fault",
          grade: t || (e === "player" ? "POINT WON!" : "POINT LOST"),
          shotType: "TOPSPIN",
          speedKmh: 0,
          intensity: e === "player" ? 1.4 : 0.75,
        }),
        this.isMultiplayer &&
          this.motionController.triggerHapticFeedback({
            role: "p2",
            kind: e === "opponent" ? "point_won" : "fault",
            grade: t || (e === "opponent" ? "POINT WON!" : "POINT LOST"),
            shotType: "TOPSPIN",
            speedKmh: 0,
            intensity: e === "opponent" ? 1.4 : 0.75,
          })),
      e === "player" ? (this.score.playerPoints += 1) : (this.score.opponentPoints += 1),
      (this.score.deuceSide = !this.score.deuceSide);
    const a = this.score.playerPoints,
      s = this.score.opponentPoints;
    if ((a >= 4 || s >= 4) && Math.abs(a - s) >= 2) {
      if (
        (a > s ? (this.score.playerGames += 1) : (this.score.opponentGames += 1),
        (this.score.playerPoints = 0),
        (this.score.opponentPoints = 0),
        (this.score.deuceSide = !0),
        (this.score.server = this.score.server === "player" ? "opponent" : "player"),
        this._syncScoreboardHUD(),
        this.score.playerGames >= this.matchConfig.gamesToWin ||
          this.score.opponentGames >= this.matchConfig.gamesToWin)
      ) {
        const p = this.score.playerGames > this.score.opponentGames;
        this.phase = "MATCH_OVER";
        const g = this.isMultiplayer ? (p ? "P1 WINS!" : "P2 WINS!") : p ? "YOU WIN!" : "Game!",
          c = `Final Games: ${this.score.playerGames} - ${this.score.opponentGames}`;
        this._recordBannerBroadcast(g, "style-gold", c),
          this.hud.showCenterBanner(g, { style: "style-gold", subText: c, durationMs: 2600 }),
          this.audioEngine &&
            (this.audioEngine.playMusicForState("victory"),
            this.audioEngine.announceScore(p ? "Game Set and Match" : "Game")),
          setTimeout(() => {
            this.hud.showVictoryModal({
              playerWon: this.playerRole === "p2" ? !p : p,
              playerGames: this.score.playerGames,
              opponentGames: this.score.opponentGames,
            });
          }, 1800);
        return;
      }
      const l = `Games: ${this.score.playerGames} - ${this.score.opponentGames}`;
      this._recordBannerBroadcast("Game!", "style-gold", l),
        this.hud.showCenterBanner("Game!", { style: "style-gold", subText: l, durationMs: 1650 }),
        this.audioEngine && this.audioEngine.announceScore("Game");
      return;
    }
    this._syncScoreboardHUD();
    // NATPF: servizio vincente non toccato dall'avversario = ace (banner e voce)
    t === "Nice Shot!" && this.ball.rallyStrokeCount === 1 && (t = "Ace!");
    const { bannerScoreText: n } = this._formatCurrentScore(),
      h = t === "Out" || t === "Net" ? "style-fault" : "style-score";
    this._recordBannerBroadcast(n, h, t || ""),
      this.hud.showCenterBanner(n, { style: h, subText: t || "", durationMs: 1450 }),
      this.audioEngine &&
        (t === "Out" || t === "Net" || t === "Nice Shot!" || t === "Ace!"
          ? (this.audioEngine.playVoiceCallout(t, { clearQueue: !0 }),
            this.audioEngine.announceScore(n, { delayMs: 680 }))
          : this.audioEngine.announceScore(n));
  }
  _recordBannerBroadcast(e, t = "style-score", i = "") {
    (this.bannerSeq += 1),
      (this.lastBannerBroadcast = { seq: this.bannerSeq, text: e, style: t, subText: i });
  }
  _broadcastMultiplayerSnapshot() {
    const e = (i) => ({
        px: Number(i.pos.x.toFixed(3)),
        pz: Number(i.pos.z.toFixed(3)),
        tx: Number(i.targetPos.x.toFixed(3)),
        tz: Number(i.targetPos.z.toFixed(3)),
        st: i.swingType,
        sw: Number(i.swingTimer.toFixed(3)),
        av: Number(i.arcVisibleTimer.toFixed(3)),
      }),
      t = {
        phase: this.phase,
        phaseTimer: Number(this.phaseTimer.toFixed(3)),
        cameraMode: this.cameraMode,
        score: { ...this.score },
        ball: {
          px: Number(this.ball.pos.x.toFixed(3)),
          py: Number(this.ball.pos.y.toFixed(3)),
          pz: Number(this.ball.pos.z.toFixed(3)),
          vx: Number(this.ball.vel.x.toFixed(3)),
          vy: Number(this.ball.vel.y.toFixed(3)),
          vz: Number(this.ball.vel.z.toFixed(3)),
          inPlay: this.ball.inPlay,
          lastHitter: this.ball.lastHitter,
          shotType: this.ball.shotType,
          isPowerShot: this.ball.isPowerShot,
          rallyStrokeCount: this.ball.rallyStrokeCount,
        },
        actors: {
          player: e(this.player),
          playerPartner: e(this.playerPartner),
          opponent: e(this.opponent),
          opponentPartner: e(this.opponentPartner),
        },
        banner: this.lastBannerBroadcast,
        fmt: this.matchFormat.id, // NATPF: il P2 gioca nello stesso formato dell'host
      };
    fetch("/api/match/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: this.roomId, snapshot: t }),
    }).catch(() => {});
  }
  _handleRoomStateUpdate(e = {}) {
    if (!e) return;
    const t = !!(this.roomStatus.p2Online || this.roomStatus.p2Phone),
      i = !!(this.roomStatus.p1Online || this.roomStatus.p1Phone),
      a = !!(e.p2Online || e.p2?.connected),
      s = !!(e.p1Online || e.p1?.connected);
    if (
      (a && !t
        ? ((this.isMultiplayer = !0),
          this._applyDifficultyTuning("1v1"),
          this.playerRole !== "p2" &&
            this.audioEngine &&
            this.audioEngine.playServeToss &&
            this.audioEngine.playServeToss())
        : s &&
          !i &&
          this.playerRole === "p2" &&
          this.audioEngine &&
          this.audioEngine.playServeToss &&
          this.audioEngine.playServeToss(),
      (this.roomStatus = {
        roomId: e.roomId || this.roomId,
        hostName: e.hostName || this.roomStatus.hostName || "Player 1",
        guestName: e.guestName || this.roomStatus.guestName || "Player 2",
        p1Online: !!e.p1Online,
        p2Online: !!e.p2Online,
        p1Phone: !!e.p1?.connected,
        p2Phone: !!e.p2?.connected,
        isMultiplayer: !!(this.isMultiplayer || (this.roomId && this.roomId !== "default")),
        inRally: this.phase === "RALLY",
        tunnelUrl: e.tunnelUrl || this.roomStatus.tunnelUrl || "",
        urls: e.urls || this.roomStatus.urls || null,
      }),
      this.hud && this.hud.updateMultiplayerRoomInfo && this.hud.updateMultiplayerRoomInfo(this.roomStatus),
      this.playerRole === "p2" &&
        e.snapshot &&
        typeof e.snapshotSeq == "number" &&
        e.snapshotSeq > this.lastAppliedSnapshotSeq)
    ) {
      this.lastAppliedSnapshotSeq = e.snapshotSeq;
      const n = e.snapshot;
      n.fmt && n.fmt !== this.matchFormat.id && this.setMatchFormat(n.fmt);
      n.phase &&
        n.phase !== "TITLE" &&
        (this.phase === "TITLE" && this.hud.hideTitleModal(),
        (this.phase = n.phase),
        (this.cameraMode = n.cameraMode || this.cameraMode)),
        n.score && ((this.score = { ...this.score, ...n.score }), this._syncScoreboardHUD()),
        n.ball &&
          (this.ball.pos.set(n.ball.px, n.ball.py, n.ball.pz),
          this.ball.vel.set(n.ball.vx, n.ball.vy, n.ball.vz),
          (this.ball.inPlay = !!n.ball.inPlay),
          (this.ball.lastHitter = n.ball.lastHitter || this.ball.lastHitter),
          (this.ball.shotType = n.ball.shotType || "TOPSPIN"),
          (this.ball.isPowerShot = !!n.ball.isPowerShot),
          (this.ball.rallyStrokeCount = Number(n.ball.rallyStrokeCount || 0)),
          this.ballTrail.setStyle(this.ball.shotType, this.ball.isPowerShot));
      const h = (r, l) => {
        l &&
          ((r.pos.x = o.MathUtils.lerp(r.pos.x, l.px, 0.65)),
          (r.pos.z = o.MathUtils.lerp(r.pos.z, l.pz, 0.65)),
          r.targetPos.set(l.tx, 0, l.tz),
          l.sw > 0 &&
            r.swingTimer <= 0.05 &&
            ((r.swingType = l.st || "forehand"),
            (r.swingTimer = l.sw),
            (r.arcVisibleTimer = l.av || 0.32),
            this.racketKinematics &&
              this.racketKinematics.triggerSwing(r, {
                shotType: (n.ball?.shotType || "topspin").toLowerCase(),
                side: l.st === "backhand" ? "backhand" : l.st === "smash" ? "overhead" : "forehand",
                speed: 1.2,
                timing: "sweet",
              })));
      };
      if (
        (n.actors &&
          (h(this.player, n.actors.player),
          h(this.playerPartner, n.actors.playerPartner),
          h(this.opponent, n.actors.opponent),
          h(this.opponentPartner, n.actors.opponentPartner)),
        n.banner &&
          n.banner.seq &&
          n.banner.seq !== this.bannerSeq &&
          ((this.bannerSeq = n.banner.seq),
          this.hud.showCenterBanner(n.banner.text, {
            style: n.banner.style || "style-score",
            subText: n.banner.subText || "",
            durationMs: 1550,
          }),
          this.audioEngine))
      ) {
        const r = n.banner.subText || "";
        r === "Out" || r === "Net" || r === "Nice Shot!" || r === "Ace!" // NATPF: anche l'ace
          ? (this.audioEngine.playVoiceCallout(r, { clearQueue: !0 }),
            this.audioEngine.announceScore(n.banner.text, { delayMs: 680 }))
          : this.audioEngine.announceScore(n.banner.text);
      }
    }
  }
  _formatCurrentScore() {
    const e = this.score.playerPoints,
      t = this.score.opponentPoints;
    if (e >= 3 && t >= 3) {
      if (e === t)
        return {
          playerScoreText: "40",
          opponentScoreText: "40",
          deuceLabel: "Deuce",
          bannerScoreText: "Deuce",
        };
      const s = e > t,
        n = s ? "Ad In" : "Ad Out";
      return {
        playerScoreText: s ? "Ad" : "40",
        opponentScoreText: s ? "40" : "Ad",
        deuceLabel: n,
        bannerScoreText: n,
      };
    }
    const i = W[Math.min(3, e)],
      a = W[Math.min(3, t)];
    return { playerScoreText: i, opponentScoreText: a, deuceLabel: null, bannerScoreText: `${i} - ${a}` };
  }
  _getHighStakesPointLabel() {
    const e = this.score.playerPoints,
      t = this.score.opponentPoints,
      i = e >= 3 && e - t >= 1,
      a = t >= 3 && t - e >= 1;
    return i
      ? this.score.playerGames + 1 >= this.matchConfig.gamesToWin
        ? "Match Point"
        : "Game Point"
      : a
        ? this.score.opponentGames + 1 >= this.matchConfig.gamesToWin
          ? "Match Point"
          : this.score.server === "player"
            ? "Break Point"
            : "Game Point"
        : null;
  }
  _syncScoreboardHUD() {
    const e = this._formatCurrentScore();
    this.natpfUi && this.natpfUi.onScore && this.natpfUi.onScore(this.score, this.matchConfig.gamesToWin);
    // NATPF: punteggio del game anche sui segnapunti arancioni dell'arena
    this.natpfArena.setScore(e.deuceLabel || `${e.playerScoreText}-${e.opponentScoreText}`);
    this.hud.updateScoreboard({
      playerScoreText: e.playerScoreText,
      opponentScoreText: e.opponentScoreText,
      deuceLabel: e.deuceLabel,
      playerGames: this.score.playerGames,
      opponentGames: this.score.opponentGames,
      gamesToWin: this.matchConfig.gamesToWin,
    });
  }
  _updatePlayerAnimation(e, t) {
    if (!e.model) return;
    e.swingTimer > 0 && (e.swingTimer = Math.max(0, e.swingTimer - t)),
      e.arcVisibleTimer > 0 && (e.arcVisibleTimer = Math.max(0, e.arcVisibleTimer - t)),
      e.swingArcMesh && (e.swingArcMesh.visible = !1);
    let i = null;
    if (
      this.motionController &&
      this.motionController.phoneState?.connected &&
      ((this.playerRole !== "p2" && e === this.player) || (this.playerRole === "p2" && e === this.opponent))
    ) {
      const s = this.motionController.phoneState.orientation || {};
      i = {
        tiltPitch: ((Number(s.pitch) || 0) * Math.PI) / 180,
        tiltRoll: ((Number(s.roll) || 0) * Math.PI) / 180,
        tiltYaw: ((Number(s.yaw) || 0) * Math.PI) / 180,
        accelMag: Number(this.motionController.phoneState.accelMag) || 0,
      };
    }
    // NATPF: webcam → posa continua della mano sulla racchetta e sul braccio del giocatore locale (prima e terza
    // persona), come l'inclinazione del telefono; i colpi restano quelli del motore base (src/natpf/webcam_hand_pose.js)
    !i &&
      this.motionController?.webcamActive &&
      ((this.playerRole !== "p2" && e === this.player) || (this.playerRole === "p2" && e === this.opponent)) &&
      (i = this.motionController.webcamLiveInput());
    if (this.racketKinematics) {
      let a = t;
      if (this.phase === "SHOWCASE" && e === this.player && e.racketKinematics) {
        const s = this.showcaseModeName || "showcase_topspin";
        (a = 1e-4),
          s === "showcase_slice" || s === "showcase_backhand"
            ? ((e.racketKinematics.swingActive = !0), (e.racketKinematics.swingElapsed = 0.072))
            : s === "showcase_smash"
              ? ((e.racketKinematics.swingActive = !0), (e.racketKinematics.swingElapsed = 0.058))
              : s === "showcase_topspin" &&
                ((e.racketKinematics.swingActive = !0), (e.racketKinematics.swingElapsed = 0.068));
      }
      this.racketKinematics.update(e, a, {
        phase: this.phase,
        score: this.score,
        ball: this.ball,
        elapsedTime: this.elapsedTime,
        liveInput: i,
      });
    }
    this.bodyAnimator
      ? this.bodyAnimator.updatePlayerBodyAnimation(e, t, this)
      : e.root.position.set(e.pos.x, e.pos.y, e.pos.z),
      j(e, e.rig?.verticalHopOffset || 0),
      this.facialFX &&
        this.facialFX.update(e, t, {
          phase: this.phase,
          ball: this.ball,
          score: this.score,
          rallyCount: this.ball.rallyStrokeCount,
          camera: this.camera,
        });
  }
  // NATPF: arena (pubblico, LED), telefono e corpo nascosto in prima persona, a ogni fotogramma
  _updateNatpf(e) {
    this.natpfArena.update(this.elapsedTime, this.cheerEnergy), this.natpfPhone && this.natpfPhone.update();
    this.natpfUi && this.natpfUi.tick && this.natpfUi.tick(e);
    const t = this._isFirstPersonActive() ? this.localActor : null;
    t !== this.fpBodyActor &&
      (this.fpBodyActor && setFirstPersonBody(this.fpBodyActor, !1),
      t && setFirstPersonBody(t, !0),
      (this.fpBodyActor = t));
    // NATPF: mancino specchiato; in prima persona la mano libera solo al servizio
    this.natpfUi && this.natpfUi.hand && this.natpfUi.hand.update(this.fpBodyActor);
  }
  _updateCrowdAnimation(e) {
    if (((this.cheerEnergy = Math.max(0.22, this.cheerEnergy - e * 0.35)), this.crowdScene)) {
      const t = 5.5 + this.cheerEnergy * 4.5,
        i = 0.025 + this.cheerEnergy * 0.055;
      this.crowdScene.position.y = Math.abs(Math.sin(this.elapsedTime * t)) * i;
    }
  }
  _spawnBounceRing(e, t) {
    const i = this.bounceRings.find((a) => !a.active) || this.bounceRings[0];
    (i.active = !0),
      (i.age = 0),
      i.mesh.position.set(e, 0.024, t),
      i.mesh.scale.setScalar(0.6),
      (i.mesh.material.opacity = 0.9),
      (i.mesh.visible = !0);
  }
  _spawnStarBurst(e, t = 8) {
    let i = 0;
    for (let a = 0; a < this.starParticles.length && i < t; a++) {
      const s = this.starParticles[a];
      s.active ||
        ((s.active = !0),
        (s.age = 0),
        (s.maxAge = 0.32 + Math.random() * 0.22),
        s.mesh.position.copy(e),
        s.vel.set((Math.random() - 0.5) * 4.2, (Math.random() - 0.2) * 3.8, (Math.random() - 0.5) * 4.2),
        s.mesh.scale.setScalar(0.9 + Math.random() * 0.6),
        (s.mesh.material.opacity = 1),
        (s.mesh.visible = !0),
        i++);
    }
  }
  _updateEffects(e) {
    if ((this.ball.mesh && this.ball.mesh.position.copy(this.ball.pos), this.ballShadowBlob)) {
      (this.ballShadowBlob.position.x = this.ball.pos.x), (this.ballShadowBlob.position.z = this.ball.pos.z);
      const t = o.MathUtils.clamp(1.15 - this.ball.pos.y * 0.16, 0.45, 1.15);
      this.ballShadowBlob.scale.setScalar(t),
        (this.ballShadowBlob.material.opacity = o.MathUtils.clamp(0.88 - this.ball.pos.y * 0.14, 0.28, 0.88));
    }
    for (const t of this.bounceRings) {
      if (!t.active) continue;
      t.age += e;
      const i = t.age / 0.48;
      i >= 1
        ? ((t.active = !1), (t.mesh.visible = !1))
        : (t.mesh.scale.setScalar(0.6 + i * 2.4), (t.mesh.material.opacity = (1 - i) * 0.85));
    }
    for (const t of this.starParticles) {
      if (!t.active) continue;
      t.age += e;
      const i = t.age / t.maxAge;
      i >= 1
        ? ((t.active = !1), (t.mesh.visible = !1))
        : (t.mesh.position.addScaledVector(t.vel, e),
          (t.mesh.rotation.y += e * 9),
          (t.mesh.rotation.z += e * 7),
          t.mesh.scale.setScalar((1 - i * 0.65) * 1.15),
          (t.mesh.material.opacity = 1 - i));
    }
    this.cloudRing1 && (this.cloudRing1.rotation.y += e * 0.0065),
      this.cloudRing2 && (this.cloudRing2.rotation.y += e * 0.0035),
      this.ballTrail.updateGeometry(this.camera);
  }
  _computeTargetCameraPose() {
    const e = this.manualCameraOverride || this.cameraMode,
      t = new o.Vector3(),
      i = new o.Vector3();
    if (this._isFirstPersonActive()) {
      // NATPF: prima persona dal giocatore locale (P1 o P2), sguardo verso la metà campo avversaria
      const a = firstPersonPose(this.localActor, S.BASELINE_Z, this.fpPose);
      if ((t.copy(a.position), i.copy(a.target), this.phase === "SERVE_TOSS" && this.score.server === this.localActor.role)) {
        // al proprio servizio lo sguardo sale con la palla lanciata, poi torna sul campo
        const s = o.MathUtils.smoothstep(this.ball.pos.y, 1.3, 2.6);
        i.lerp(
          new o.Vector3(this.ball.pos.x, this.ball.pos.y, this.ball.pos.z - this.localActor.sideSign * 1.6),
          s * 0.85,
        );
      }
    } else if (e === "INTRO_PAN") {
      const a = this.elapsedTime * 0.42;
      t.set(Math.sin(a) * 9.5, 8.2, 16.5 + Math.cos(a) * 3.5), i.set(0, 0.8, -1.5);
    } else if (e === "SHOWCASE_CAM") t.set(1.15, 1.54, 7.55), i.set(1.15, 1.12, 11.2);
    else if (e === "SERVE_CAM")
      if (this.playerRole === "p2") {
        const a = this.opponent.pos.x;
        t.set(a * 0.16, 7.8, -22.8), i.set(a * 0.08, 0.35, -1.8);
      } else {
        const a = this.player.pos.x;
        t.set(a * 0.16, 7.8, 22.8), i.set(a * 0.08, 0.35, 1.8);
      }
    else
      e === "REPLAY_CAM"
        ? (t.set(2.35, 1.48, 4.15), i.set(-1.45, 0.95, -1.35))
        : this.playerRole === "p2"
          ? (t.set(this.opponent.pos.x * 0.16, 7.8, -22.8), i.set(this.ball.pos.x * 0.12, 0.35, -1.8))
          : (t.set(this.player.pos.x * 0.16, 7.8, 22.8), i.set(this.ball.pos.x * 0.12, 0.35, 1.8));
    return { targetPos: t, targetLook: i };
  }
  _snapCameraImmediate() {
    const { targetPos: e, targetLook: t } = this._computeTargetCameraPose();
    this._updateCameraFov();
    this.cameraPosSmooth.copy(e),
      this.cameraLookSmooth.copy(t),
      this.camera.position.copy(e),
      this.camera.lookAt(t),
      this.camera.updateMatrixWorld(),
      this.ballTrail.updateGeometry(this.camera),
      this._updateProjectedHUD();
  }
  _updateCameraRig(e) {
    const { targetPos: t, targetLook: i } = this._computeTargetCameraPose(),
      n = this._isFirstPersonActive(),
      a = 1 - Math.exp(-(n ? FIRST_PERSON.follow : 6.5) * e);
    if (
      (this._updateCameraFov(),
      this.cameraPosSmooth.lerp(t, a),
      this.cameraLookSmooth.lerp(i, a),
      this.camera.position.copy(this.cameraPosSmooth),
      this.cameraTrauma > 0.001)
    ) {
      const s = this.cameraTrauma * this.cameraTrauma * 0.26 * (n ? FIRST_PERSON.shake : 1);
      (this.camera.position.x += (Math.random() - 0.5) * s),
        (this.camera.position.y += (Math.random() - 0.5) * s);
    }
    this.camera.lookAt(this.cameraLookSmooth);
  }
  // NATPF: campo visivo più ampio in prima persona (come viewpoint.js di NATPF), 45° del motore base in terza
  _updateCameraFov() {
    const e = this._isFirstPersonActive() ? firstPersonFov(this.camera.aspect) : 45;
    Math.abs(this.camera.fov - e) > 0.01 && ((this.camera.fov = e), this.camera.updateProjectionMatrix());
  }
  _projectToScreen(e) {
    const t = e.clone().project(this.camera),
      i = t.z >= -1 && t.z <= 1,
      a = (t.x * 0.5 + 0.5) * window.innerWidth,
      s = (-t.y * 0.5 + 0.5) * window.innerHeight;
    return { x: a, y: s, visible: i };
  }
  _updateProjectedHUD() {
    const t = this.score.server === "player" ? this.player : this.opponent;
    if (
      (this.phase === "SERVE_STANCE" || this.phase === "SERVE_TOSS") &&
      this.cameraMode !== "REPLAY_CAM" &&
      !(this._isFirstPersonActive() && t === this.localActor) // NATPF: in prima persona niente etichetta sopra di sé
    ) {
      const i = t.pos
          .clone()
          .add(new o.Vector3(0, 2.25, 0)),
        a = this._projectToScreen(i);
      this.hud.updateServerTag(a, !0);
    } else this.hud.updateServerTag(null, !1);
  }
  _onResize() {
    (this.camera.aspect = window.innerWidth / window.innerHeight),
      this.camera.updateProjectionMatrix(),
      this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  render() {
    // NATPF: varianti di colore e arti dei personaggi, dopo tutte le animazioni del fotogramma
    updateNatpfCharacters(this);
    this.renderer.render(this.scene, this.camera);
  }
}
window.addEventListener("DOMContentLoaded", () => {
  // NATPF: prima del motore, che interroga subito il relay della partita
  const p2p = installNatpfP2p();
  const P = new NatpfTennisEngine();
  (P.natpfP2p = p2p), (P.natpfUi = new NatpfUi(P)), (window.__natpfTennis = P), P.loadAssetsAndStart();
});
