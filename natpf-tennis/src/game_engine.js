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
  thirdPersonFrame,
  frameMatchCamera,
  isMatchCamera,
  renderPixelRatio,
  watchPixelRatio,
} from "./natpf/natpf_camera.js";
import { resolveMatchFormat, firstServer, serveChoice } from "./natpf/match_format.js";
// NATPF B18: formato in fiera (punto decisivo e servizio come nel tie-break), opzione dello staff spenta di base
import * as NF from "./natpf/natpf_fair_format.js";
import * as NH from "./natpf/natpf_hot_rally.js";
import { NatpfBallGlow } from "./natpf/natpf_ball_glow.js";
import { NatpfUi } from "./natpf/natpf_ui.js";
// NATPF: personaggio, racchetta e pallina procedurali (niente GLB esterni)
import { createNatpfCast, finishNatpfActor, updateNatpfCharacters } from "./natpf/natpf_character.js";
// NATPF skill gap: assistenza del tempo graduata, mira e rischio del giocatore, limiti ed errori della CPU
import * as NS from "./natpf/natpf_skill.js";
import * as NL from "./natpf/natpf_legend.js";
import * as NO from "./natpf/natpf_stroke_outcome.js";
import * as NI from "./natpf/natpf_impact.js";
import * as NPC from "./natpf/natpf_point_call.js";
import { NatpfReplay } from "./natpf/natpf_replay.js";
const NR = { c: null }; // NATPF moviola: posa della telecamera
import { NatpfBodyFollow } from "./natpf/webcam_body_follow.js";
// NATPF: sfida tra due computer anche senza server (sito statico): relay nel browser dell'host e WebRTC
import { installNatpfP2p } from "./natpf/natpf_p2p.js";
import { VERSUS, MATCH_PHASES, seqGate } from "./natpf/natpf_versus.js";
import * as GV from "./natpf/natpf_guest_view.js";
import { NatpfSplit } from "./natpf/natpf_split.js";
import { relayPhoneFeedback } from "./natpf/natpf_shot_feedback.js";
import { viewport } from "./natpf/natpf_screen.js";
import { deepCamShift, actorDepth } from "./natpf/natpf_camera_depth.js";
// NATPF B15 (mancini): lato di un colpo senza «side» nell'evento, preso dal verso del gesto (dirX) o dalla palla con la
// regola del destro: per il mancino si scambia (il suo dritto è a sinistra). Con il lato nell'evento (telefono, webcam
// e mouse del P1 passati da NatpfHand.leftySide, P2 della webcam per due) non cambia niente, né per il destro
const natpfHandedSide = (side, e, hand) => (hand === "left" && e.side !== "forehand" && e.side !== "backhand" && (side === "forehand" || side === "backhand") ? (side === "forehand" ? "backhand" : "forehand") : side);
const VERSUS_ROOM_KEY = "natpf.versus.room";
// NATPF (31/10): partita in pausa (guida, pausa, telefono o webcam da ricollegare, attesa del 1v1). La scena è ferma
// (update non gira) sotto i fogli con il blur a tutto schermo, ma prima si ridisegnava a ogni fotogramma, come lo sfondo
// del menu prima della sua correzione: GPU occupata per niente, sulle grafiche integrate proprio mentre gira il blur.
// Ora si disegna a ogni fotogramma solo nei primi settleMs (le camere che si stanno ancora assestando), poi una volta
// ogni everyMs e subito dopo un ridimensionamento; uscendo dalla pausa si torna al disegno di ogni fotogramma
export const PAUSE_DRAW = Object.freeze({ settleMs: 400, everyMs: 500 });
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
      (this.baseWidth = 0.28),
      (this.glow = null); // NATPF B22: scia luminosa (natpf_ball_glow.js), riceve gli stessi punti; null = come prima
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
    this.power = !!(t || i === "SMASH" || i === "POWER"); // NATPF B22: per la scia luminosa (sotto quella del colpo potente)
    t || i === "SMASH" || i === "POWER"
      ? (this.color.setHex(16777215), this.accentColor.setHex(5432831), (this.baseWidth = 0.3))
      : i === "SLICE"
        ? (this.color.setHex(16777215), this.accentColor.setHex(8974591), (this.baseWidth = 0.28))
        : i === "LOB"
          ? (this.color.setHex(16777215), this.accentColor.setHex(15661311), (this.baseWidth = 0.25))
          : (this.color.setHex(16777215), this.accentColor.setHex(16771925), (this.baseWidth = 0.28));
  }
  clear() {
    (this.points.length = 0), (this.mesh.visible = !1), this.glow && this.glow.clear();
  }
  pushPoint(e) {
    this.points.unshift(e.clone()), this.points.length > this.maxPoints && this.points.pop(), this.glow && this.glow.sample(e);
  }
  seedArc(e, t, i = 0.85) {
    this.glow && this.glow.clear();
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
      this.renderer.setPixelRatio(renderPixelRatio(window.devicePixelRatio)),
      this.renderer.setSize(viewport().w, viewport().h), // NATPF: finestra intera o area del ledwall (natpf_screen.js)
      (this.renderer.shadowMap.enabled = !0),
      (this.renderer.shadowMap.type = o.PCFSoftShadowMap),
      (this.renderer.outputColorSpace = o.SRGBColorSpace),
      (this.renderer.toneMapping = o.ACESFilmicToneMapping),
      (this.renderer.toneMappingExposure = 1.12),
      (this.scene = new o.Scene()),
      (this.scene.background = new o.Color(7914239)),
      (this.scene.fog = new o.FogExp2(12313855, 0.0038)),
      (this.camera = new o.PerspectiveCamera(45, viewport().w / viewport().h, 0.1, 260)),
      (this.cameraMode = "RALLY_CAM"),
      (this.manualCameraOverride = null),
      (this.cameraPosSmooth = new o.Vector3(0, 7.8, 22.8)),
      (this.cameraLookSmooth = new o.Vector3(0, 0.35, 1.8)),
      (this.cameraTrauma = 0);
    const e = this.isMultiplayer
      ? "1v1"
      : ["casual", "pro", "leggenda", "1v1"].includes(this.urlMode)
        ? this.urlMode
        : "casual";
    (this.matchConfig = { gamesToWin: e === "1v1" ? 1 : 2, inputMode: "mouse", difficulty: e }),
      // NATPF B18 (revisione del ramo R4): matchConfig.gamesToWinChosen è la scelta del menu (la scrivono il menu, i
      // minigiochi e lo snapshot dell'host scrivendo gamesToWin); gamesToWin è il valore che vale in partita, calcolato a
      // ogni lettura con il formato in fiera della partita (score.fair: «Al meglio di 5» → al meglio di 3)
      NF.installGamesToWin(this.matchConfig, () => this.score?.fair),
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
      // NATPF B22: scia luminosa della palla (Opzioni → «Scia della palla»; spenta il disegno è quello di prima)
      (this.natpfBallGlow = this.ballTrail.glow = new NatpfBallGlow(this.scene)),
      (this.bounceRings = []),
      (this.starParticles = []),
      (this.racketKinematics = new Z()),
      (this.bodyAnimator = new Q()),
      (this.facialFX = new J(this.scene)),
      (this.swingVfx = new ee(this.scene)),
      this._setupLightingAndSky(),
      this._setupEffectsPools(),
      this._natpfWatchTextures(),
      (this.natpfArena = installNatpfArena(this)),
      this._initHudAndControllers(),
      (this.clock = new o.Clock()),
      (this.physicsAccumulator = 0),
      (this.elapsedTime = 0),
      window.addEventListener("resize", () => this._onResize()),
      watchPixelRatio(() => this._onResize()); // NATPF (B8): monitor con un'altra scala anche senza «resize»
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
    // NATPF split screen: con la sessione sullo stesso schermo l'avversario è sempre il Player 2 (1v1), qualunque sia la
    // tessera rimasta selezionata nell'HUD
    const t = this.natpfSplit?.active ? "1v1" : String(e || "casual").toLowerCase();
    (this.matchConfig.difficulty = t),
      t === "1v1"
        ? ((this.isMultiplayer = !0),
          // NATPF 1v1: la durata scelta nel menu vale anche tra due computer (prima sempre un game: il P2 non serviva mai)
          // NATPF (B18, difetto 4 del B16): i due giocatori corrono uguale (prima il Player 2 a 9,6 m/s, il 2% più piano)
          (this.player.maxSpeed = 9.8),
          (this.playerPartner.maxSpeed = 8.4),
          (this.opponent.maxSpeed = 9.8),
          (this.opponentPartner.maxSpeed = 8.4))
        : t === "pro" || t === "leggenda" // NATPF: Leggenda come Esperto (la velocità della CPU viene da natpf_skill)
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
      onSelectDifficulty: (i) => this._onSelectDifficulty(i),
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
        // NATPF: niente moviola nel riscaldamento e nelle sfide (dopo il replay il lanciapalle non ripartiva e la sfida
        // restava ferma al servizio)
        if (this.natpfUi?.training?.active || this.natpfUi?.events?.active) return;
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
              : // NATPF 1v1: tasto del colpo del P2 solo sul computer del P2 e mandato all'host come ogni suo colpo
                // (prima sull'host faceva giocare al P1 i colpi del P2, e sul P2 restava locale)
                this.playerRole === "p2" &&
                this.isMultiplayer &&
                (i.code === "ShiftRight" || i.code === "KeyK" || i.code === "Numpad0") &&
                this.motionController?.triggerSyntheticSwing?.({ source: "keyboard", shotType: (this.p2SelectedShotType || "topspin").toLowerCase(), speed: 1.18 }));
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
    // NATPF moviola: registra ogni punto e rimette in scena l'ultimo (natpf_replay.js)
    this.natpfReplay = new NatpfReplay(this);
    // NATPF split screen: 1v1 sullo stesso schermo con due telefoni, due viste (natpf_split.js)
    this.natpfSplit = new NatpfSplit(this);
    // NATPF: webcam → «Movimento: segui il corpo» (MediaPipe Pose), isolato dal movimento automatico del motore base
    this.natpfBody = new NatpfBodyFollow(this);
    const mc = this.motionController;
    if (mc && mc.triggerHapticFeedback) {
      const haptic = mc.triggerHapticFeedback.bind(mc);
      // NATPF: l'esito del colpo (anello colorato, allenamento) decide anche la vibrazione del telefono
      mc.triggerHapticFeedback = (e = {}) => {
        haptic(e);
        // NATPF split screen: il secondo telefono (Player 2 locale) riceve i suoi esiti (role «p2»). Revisione B18: con
        // il suo esito calcolato come la sua metà dello schermo (prima null: il telefono non diceva «Fuori» né «In rete»)
        relayPhoneFeedback(this, e);
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
      !this.natpfSplit?.active && // NATPF split screen: due viste in terza persona
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
  _onSelectDifficulty(i) {
    this._applyDifficultyTuning(i),
      // NATPF split screen: con «Stesso schermo» il 1v1 è su questo computer, nessuna stanza in rete
      i === "1v1" && (!this.roomId || this.roomId === "default") && this.natpfUi?.lobby?.mode !== "split" && this.createMultiplayerRoom();
  }
  async createMultiplayerRoom({ p1Name: e = "Player 1", p2Name: t = "Player 2" } = {}) {
    try {
      // NATPF 1v1: dopo un ricaricamento della pagina si chiede di nuovo la stessa stanza: il P2 si ricollega da solo
      let natpfRoom = "";
      try { natpfRoom = sessionStorage.getItem(VERSUS_ROOM_KEY) || ""; } catch {}
      const i = await fetch("/api/match/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p1Name: e, p2Name: t, roomId: natpfRoom || void 0, gamesToWin: this.matchConfig.gamesToWin }),
      });
      if (i.ok) {
        const a = await i.json();
        if (a.roomId)
          return (
            (this.roomId = a.roomId),
            (this.isMultiplayer = !0),
            (this.versus = { active: !0, closing: !1 }), // NATPF 1v1: la sessione nasce con la stanza
            (() => { try { sessionStorage.setItem(VERSUS_ROOM_KEY, a.roomId); } catch {} })(),
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
  // NATPF 1v1: partita tra due computer in corso (non lobby, non dimostrazione, non riscaldamento o sfide in campo:
  // prima il riscaldamento dell'host contava come partita, compariva «Il Player 2 si è scollegato» e la calibrazione
  // restava ferma)
  _versusInMatch() {
    return !!this.versus?.active && !this.autoPlayMode && MATCH_PHASES.includes(this.phase) && !this.natpfUi?.training?.active && !this.natpfUi?.events?.active;
  }
  // NATPF 1v1: l'host lascia la sfida (sceglie un'altra modalità): il P2 riceve «stanza chiusa», la stanza smette di
  // comandare il motore (prima un colpo del P2 trasformava una partita contro la CPU in un 1v1 senza avversario)
  endVersus() {
    if (!this.versus?.active || this.playerRole === "p2" || this.versus.local) return; // la sessione locale la chiude endSplit
    this.versus = { active: !1, closing: !1 };
    try { sessionStorage.removeItem(VERSUS_ROOM_KEY); sessionStorage.removeItem("natpf.versus.checkpoint"); } catch {} // NATPF: anche il punteggio salvato (natpf_versus.CHECKPOINT_KEY)
    const room = this.roomId;
    room && room !== "default" &&
      fetch("/api/match/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room, snapshot: { closed: !0 } }) }).catch(() => {});
    (this.roomId = "default"), (this.isMultiplayer = !1), (this.pendingP2Swing = null);
    this.motionController?.setRoomConfig?.({ roomId: "default", role: "p1" });
    this.roomStatus = { ...this.roomStatus, roomId: "default", p2Online: !1, p2Ready: !1, isMultiplayer: !1 };
    this.hud?.updateMultiplayerRoomInfo?.(this.roomStatus);
    this._natpfClearP2Hand();
  }
  // NATPF split screen: sessione 1v1 locale (nessuna stanza, nessuna rete). Il P2 gioca con il secondo telefono
  // (natpfPhone2, role 'p2'), le regole sono quelle del 1v1 dell'host; singolare, due viste in terza persona.
  startSplit() {
    if (this.playerRole === "p2") return !1;
    this.versus?.active && !this.versus.local && this.endVersus();
    (this.versus = { active: !0, closing: !1, local: !0 }), (this.roomId = "default"), (this.pendingP2Swing = null);
    this._applyDifficultyTuning("1v1");
    this.setMatchFormat("singles");
    this.natpfSplit.active = !0;
    NS.resetFatigue(this); // NATPF B18 (D6): i due giocatori dello stesso schermo partono con l'energia piena
    typeof document < "u" && document.body.classList.add("natpf-split");
    // B17.3 (revisione): l'etichetta «Al servizio» è di una sola vista (una proiezione, uno schermo intero): nello stesso
    // schermo si nasconde subito, non al prossimo update (fermo in pausa o nelle prove restava dov'era, a cavallo della metà
    // del P2 o tagliata al bordo del ledwall); da qui in poi _updateProjectedHUD la tiene nascosta
    this.hud?.updateServerTag?.(null, !1);
    // B17.3: la copia del tabellone nella metà del P2 si riempie subito (setMatchFormat sopra la sincronizza prima di active)
    this.natpfUi?.onScore?.(this.score, this.matchConfig?.gamesToWin);
    return !0;
  }
  endSplit() {
    if (!this.natpfSplit?.active) return;
    this.natpfSplit.active = !1;
    this.natpfHot = !1; // B20 (revisione): lo «scambio che si scalda» vale solo nello stesso schermo
    (this.versus = { active: !1, closing: !1 }), (this.isMultiplayer = !1), (this.pendingP2Swing = null);
    this._natpfClearP2Hand();
    typeof document < "u" && document.body.classList.remove("natpf-split");
    this.natpfUi?.onScore?.(this.score, this.matchConfig?.gamesToWin); // B17.3: svuota la copia del tabellone del P2
    // la camera del motore torna a schermo intero al primo fotogramma non diviso (NatpfSplit.render)
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
    // NATPF: tempo del fotogramma dall'orario del rAF (allineato al refresh dello schermo) invece che da quando gira il
    // codice, che oscilla di qualche ms e faceva avanzare la palla in modo irregolare anche a fotogrammi regolari
    let last = null;
    const c = (ts) => {
      requestAnimationFrame(c);
      const y = Math.min(last != null && ts >= last ? (ts - last) / 1e3 : this.clock.getDelta(), 0.08);
      last = Number.isFinite(ts) ? ts : null;
      this._natpfFrame(y);
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
    NL.resetLegend(this); // NATPF Leggenda: il modello dell'avversario riparte da zero a ogni partita
    this.natpfArena.setSpeed(null); // NATPF: velocità «---» fino al primo servizio (C21: restava quella della partita prima)
    this.natpfRhythm = null; // NATPF: il ritmo di chi gioca (direzione) si reimpara a ogni partita
    NS.resetFatigue(this); // NATPF B18 (D6): energia piena a ogni partita nuova (prima restava quella della partita prima)
    this.natpfServeRef = null; // NATPF B18 (D12): il servizio abituale si reimpara a ogni partita (NO.serveRefOf)
    this.natpfMatchSeq = (this.natpfMatchSeq || 0) + 1; // NATPF B18: partita nuova per le istruzioni del servizio (natpf_serve_coach)
    (this.score.playerPoints = 0),
      (this.score.opponentPoints = 0),
      (this.score.playerGames = 0),
      (this.score.opponentGames = 0),
      // NATPF: chi batte per primo dalla scelta del menu (match_format.firstServer; prima sempre chi gioca qui)
      // B20: sorteggio riproducibile (natpfRng a mano nei test; altrimenti Math.random come prima)
      (this.score.server = firstServer(this.natpfServeFirst, this.natpfRng || Math.random)),
      // NATPF B18: formato in fiera (natpf_fair_format.js), deciso a inizio partita dal pannello dello stand o
      // dall'indirizzo (natpfFair a mano per i test e le simulazioni); il primo game lo inizia chi batte per primo
      // (sul computer del P2 della sfida tra due computer decide l'host: score.fair e gamesToWin arrivano con lo snapshot)
      // B20: di base vale solo nello stesso schermo (tre valori: No · Solo stesso schermo · Sì); contro la CPU e nella
      // sfida tra due computer resta il formato classico finché lo staff non sceglie «Sì»
      (this.score.fair = this.playerRole === "p2" && this.isMultiplayer ? !1 : typeof this.natpfFair == "boolean" ? this.natpfFair : NF.readFairFormat({ split: !!this.natpfSplit?.active })),
      (this.score.gameServer = this.score.server),
      // B20: «scambio che si scalda» (natpf_hot_rally.js), opzione dello staff spenta di base, decisa a inizio partita:
      // solo tra due persone nello stesso schermo con i due telefoni (natpfHotRally a mano per i test e le simulazioni)
      (this.natpfHot = NH.hotRallyFor({ split: !!this.natpfSplit?.active, webcam: !!this.natpfUi?.split?.webcam, forced: this.natpfHotRally })),
      // … e con l'opzione accesa «Al meglio di 5» vale «Al meglio di 3» (matchConfig.gamesToWin lo calcola da score.fair
      // senza toccare la scelta del menu, matchConfig.gamesToWinChosen; installGamesToWin è idempotente)
      NF.installGamesToWin(this.matchConfig, () => this.score?.fair),
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
        // B20: nello stesso schermo chi batte per primo si vede («Sorteggio: batte Giulia»)
        bannerSub: this.natpfSplit?.active
          ? NPC.firstServeText({ ...NPC.callContext(this), server: this.score.server, drawn: serveChoice(this.natpfServeFirst) === "random" })
          : "",
      });
  }
  _setupPointServe({
    showBanner: e = !0,
    bannerText: t = null,
    bannerStyle: i = "style-gold",
    persistentBanner: a = !1,
    bannerSub: bs = "",
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
      this._natpfStandStill(!0), // NATPF B18.2 (D11): i quattro personaggi partono fermi a ogni servizio
      this.ball.vel.set(0, 0, 0),
      this.ball.spin.set(0, 0, 0),
      (this.ball.inPlay = !1),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount = 0),
      (this.ball.natpfFeed = !1),
      (this.natpfLastWhiff = null), // B20 (revisione): il colpo a vuoto vale solo per il suo punto
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
      l = i,
      vc = null;
    if (!r && e) {
      const p = this._getHighStakesPointLabel(),
        // NATPF B18: per il punto decisivo non c'è una clip: si dice «Match point» se il game chiude la partita,
        // altrimenti «Game point» (clip esistenti, natpf_fair_format.decidingVoice). Il P2 della sfida tra due computer
        // dice la stessa frase (call.voice; natpf_point_call.callFromBroadcast lascia il testo dell'host)
        pv = p === "Deciding Point" ? NF.decidingVoice(this.score, this.matchConfig.gamesToWin) : p;
      p &&
        // B20: nello stesso schermo «Palla match Giulia» (natpf_point_call.stakesText); la voce resta quella di prima
        ((r = NPC.stakesText(p, { ...NPC.callContext(this), points: [this.score.playerPoints, this.score.opponentPoints] })),
        (l = "style-gold"),
        pv !== p && (vc = { voice: pv }),
        this.audioEngine && this.audioEngine.announceScore(pv, { delayMs: 180 }));
    }
    r && e
      ? (this._recordBannerBroadcast(r, l, bs, vc),
        this.hud.showCenterBanner(r, { style: l, durationMs: bs ? 2600 : 1800, persistent: a, ...(bs ? { subText: bs } : {}) }))
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
    // NATPF moviola: l'ultimo punto giocato (natpf_replay.js); prima sempre lo stesso scambio a rete messo in scena
    if (!e && this.natpfReplay && this.natpfReplay.start()) {
      this.audioEngine && this.audioEngine.playVoiceCallout("replay");
      return;
    }
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
    // NATPF: webcam di argon-tennis (zip consegnato dall'utente il 29/10): servizio e scambio come nel motore dello zip,
    // con il colpo assistito (lo swing aspetta il punto giusto fino a 0,48 s), senza la finestra d'impatto del telefono
    if (e.source === "webcam" && !e.natpf && this.motionController?.webcamMode === "argon") return void this._argonWebcamSwing(e);
    if (this.phase === "SERVE_STANCE" && this.score.server === "player") {
      (this.persistentStateLock = !1), this.hud.hideCenterBanner(), this._startServeToss(this.player);
      return;
    }
    if (this.phase === "SERVE_TOSS" && this.score.server === "player") {
      if (this.phaseTimer < 0.16) return;
      // NATPF racchetta virtuale: servizio dal gesto, colpito quando arriva. Il tempo rispetto al punto più alto del
      // lancio (all'istante del gesto) ne decide la qualità; un gesto nella prima parte della salita fa ancora parte
      // del lancio. Prima lo swing aspettava il punto più alto: sempre «POWER SERVE»
      if (!this.autoPlayMode) {
        const tau = this.ball.vel.y / L.GRAVITY + NS.eventLatency(e);
        if (tau > NO.SERVE.ignoreBefore) return;
        // NATPF: gesto debole (assestamento dopo il lancio, preparazione) prima di serveWait dopo il colmo: si aspetta la
        // battuta vera; se non arriva vale questo (natpf_impact.WEAK). Il 23/10 tre servizi su 13 erano battuti da gesti di
        // 122–175 °/s e la battuta vera, 0,4 s dopo, era scartata
        // Anche un gesto intermedio prima del colmo (NI.SERVE_MID, diagnostica 20261030-142438 n. 101/102); quello più
        // forte prende il posto di quello in attesa, un gesto pieno batte subito
        const natpfWeak = NI.weakSwing(e) && tau > -NI.WEAK.serveWait, natpfMid = !natpfWeak && NI.serveMidSwing(e, tau);
        if (natpfWeak || natpfMid) {
          const w = this.natpfWeakServe, strength = NI.swingStrength(e);
          if (!w || (natpfMid && strength > w.strength)) this.natpfWeakServe = { evt: e, tau, strength };
          return;
        }
        this.natpfWeakServe = null;
        this._executeServeHit(this.player, { ...e, natpfServeTau: tau });
        return;
      }
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
      const t = natpfHandedSide(
          e.side === "backhand" || (Number(e.dirX || 0) > 0.12 && e.side !== "forehand")
            ? "backhand"
            : e.side === "forehand" || Number(e.dirX || 0) < -0.12
              ? "forehand"
              : this.ball.pos.x < this.player.pos.x - 0.05 || this.ball.targetLanding.x < -0.15
                ? "backhand"
                : "forehand",
          e, e.hand || this.natpfUi?.hand?.hand),
        i = String(e.shotType || this.selectedShotType || "topspin").toLowerCase();
      // NATPF racchetta virtuale: finestra d'impatto (natpf_impact.js). Lo swing resta in attesa fino all'arrivo della
      // palla al punto d'impatto, con il suo tempo vero; uno più forte lo sostituisce; mai un impatto con la palla lontana
      if (!this.isDoubles && this.ball.lastHitter === "opponent") {
        const q = NI.queueUserSwing(this, { ...e, side: t }, this.player);
        if (q === "held" || q === "late" || q === "ignored") return;
        if (q === "whiff") {
          this.audioEngine && this.audioEngine.playSwingWhoosh(Number(e.speed || 1.15));
          this._natpfEarlyWhiff({ actor: this.player, evt: { ...e, side: t }, prep: !0, natpfWhy: "tardi" });
          return;
        }
      }
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
          const l = h ? this.playerPartner : this.player, lead = NS.leadToSweetSpot(r, this.ball.vel.z);
          // NATPF: un gesto, un solo swing (NS.SWING_VISUAL): la racchetta si carica subito dal lato del colpo, lo swing
          // parte quando arriva la palla (prima partiva subito e ripartiva da capo al colpo)
          NS.holdSwingPrep(l, t, lead),
            this.audioEngine && this.audioEngine.playSwingWhoosh(Number(e.speed || 1.15)),
            (this.pendingUserSwing = {
              // NATPF skill gap: attesa dello sweet spot breve e graduata per difficoltà (prima +0,48 s)
              evt: { ...e, side: t, sweetSpotAssisted: !0, natpfLead: lead },
              expiresAt: NS.assistExpiry(this.elapsedTime, NS.skillLevel(this.matchConfig.difficulty)),
              waitForSweetSpot: !0,
              actor: l,
              prep: !0,
            });
          return;
        }
      }
      if (!this._attemptPlayerRallyStrike({ ...e, side: t }, !1)) {
        const s = this.ball.pos.z - this.player.pos.z,
          n = this.ball.pos.z - this.playerPartner.pos.z,
          wait = this.ball.lastHitter === "opponent" && ((s >= -8 && s <= 0.9) || (this.isDoubles && n >= -5.5 && n <= 0.9));
        this.audioEngine && this.audioEngine.playSwingWhoosh(Number(e.speed || 1.15));
        // NATPF: palla in arrivo ma non ancora a portata → racchetta carica e swing al colpo (un solo swing); nessuna
        // palla da prendere → lo swing a vuoto si vede subito
        wait
          ? (NS.holdSwingPrep(this.player, t, NS.leadToSweetSpot(s, this.ball.vel.z)),
            (this.pendingUserSwing = {
              // NATPF skill gap: come sopra
              evt: { ...e, side: t, sweetSpotAssisted: !0, natpfLead: NS.leadToSweetSpot(s, this.ball.vel.z) },
              expiresAt: NS.assistExpiry(this.elapsedTime, NS.skillLevel(this.matchConfig.difficulty)),
              waitForSweetSpot: !0,
              actor: this.player,
              prep: !0,
            }))
          : this.racketKinematics &&
            this.racketKinematics.triggerSwing(this.player, {
              shotType: i,
              side: t,
              speed: Number(e.speed || 1.2),
              timing: "sweet",
              dirX: Number(e.dirX || 0),
            });
      }
    }
  }
  // NATPF: colpo della webcam come in _handleUserSwingInput dello zip argon-tennis (dopo il titolo e la scelta del colpo)
  _argonWebcamSwing(e = {}) {
    if (this.phase === "SERVE_STANCE" && this.score.server === "player") {
      (this.persistentStateLock = !1), this.hud.hideCenterBanner(), this._startServeToss(this.player);
      return;
    }
    if (this.phase === "SERVE_TOSS" && this.score.server === "player") {
      if (this.phaseTimer < 0.16) return;
      if (this.ball.pos.y >= 1.45 && this.ball.pos.y < 2.25 && this.ball.vel.y > 0.5) {
        this.pendingServeSwing = { actor: this.player, evt: { ...e, speed: Math.max(1.22, Number(e.speed || 1.22)) } };
        return;
      }
      this._executeServeHit(this.player, e);
      return;
    }
    if (this.phase === "RALLY") {
      this.autoPlayMode = !1;
      const t = natpfHandedSide(
          e.side === "backhand" || (Number(e.dirX || 0) > 0.12 && e.side !== "forehand")
            ? "backhand"
            : e.side === "forehand" || Number(e.dirX || 0) < -0.12
              ? "forehand"
              : this.ball.pos.x < this.player.pos.x - 0.05 || this.ball.targetLanding.x < -0.15
                ? "backhand"
                : "forehand",
          e, e.hand || this.natpfUi?.hand?.hand),
        i = String(e.shotType || this.selectedShotType || "topspin").toLowerCase();
      if (this.ball.lastHitter === "opponent") {
        const s = this.ball.pos.z - this.player.pos.z,
          n = this.ball.pos.z - this.playerPartner.pos.z,
          // il compagno solo nel doppio (nello zip anche nel singolo, dove è nascosto: lo swing partiva subito)
          h = this.isDoubles && this.ball.pos.z > 0.3 && this.ball.pos.z <= 7.5 && Math.abs(this.ball.pos.x - this.playerPartner.pos.x) < 3.4,
          r = h ? n : s;
        if (r < -0.95 && r >= -7.8) {
          const l = h ? this.playerPartner : this.player;
          this.racketKinematics && this.racketKinematics.triggerSwing(l, { shotType: i, side: t, speed: Number(e.speed || 1.2), timing: "early", dirX: Number(e.dirX || 0) }),
            this.audioEngine && this.audioEngine.playSwingWhoosh(Number(e.speed || 1.15)),
            (this.pendingUserSwing = { evt: { ...e, side: t, sweetSpotAssisted: !0 }, expiresAt: this.elapsedTime + 0.48, waitForSweetSpot: !0 });
          return;
        }
      }
      if (
        !this._attemptPlayerRallyStrike({ ...e, side: t }, !1) &&
        (this.racketKinematics && this.racketKinematics.triggerSwing(this.player, { shotType: i, side: t, speed: Number(e.speed || 1.2), timing: "sweet", dirX: Number(e.dirX || 0) }),
        this.audioEngine && this.audioEngine.playSwingWhoosh(Number(e.speed || 1.15)),
        this.ball.lastHitter === "opponent")
      ) {
        const s = this.ball.pos.z - this.player.pos.z,
          n = this.ball.pos.z - this.playerPartner.pos.z;
        ((s >= -8 && s <= 0.9) || (this.isDoubles && n >= -5.5 && n <= 0.9)) &&
          (this.pendingUserSwing = { evt: { ...e, side: t, sweetSpotAssisted: !0 }, expiresAt: this.elapsedTime + 0.48, waitForSweetSpot: !0 });
      }
    }
  }
  _handleP2TossInput(e = {}) {
    // NATPF 1v1: sull'host il lancio del P2 vale solo a partita 1v1 in corso (non nel menu, non contro la CPU)
    if (this.playerRole !== "p2" && !this._versusInMatch()) return !1;
    return (
      (this.userHasInteracted = !0),
      (this.isMultiplayer = !0),
      this.phase === "TITLE" && this.playerRole === "p2"
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
  // NATPF 1v1: esito di ogni colpo del Player 2 arrivato al motore (natpfP2Input), per la diagnostica dell'host
  // (sfida.colpo, campo esito). Diagnostica 142438 (C11): il registro diceva «giocato» per ogni colpo ricevuto, ma solo 33
  // su 84 erano diventati un colpo
  _handleP2SwingInput(e = {}) {
    const b = this.ball, before = { phase: this.phase, hitter: b?.lastHitter, pend: this.pendingP2Swing, racket: this.natpfLastRacket, weak: this.natpfWeakServeP2 };
    const out = this._p2SwingInput(e);
    this.natpfP2Input = { n: e.natpf?.seq ?? null, at: this.elapsedTime, esito: this._natpfP2Outcome(before) };
    return out;
  }
  _natpfP2Outcome(B) {
    const L = this.natpfLastRacket, P = this.pendingP2Swing;
    if (B.phase === "SERVE_STANCE" && this.phase === "SERVE_TOSS") return "lancio";
    if (B.phase === "SERVE_TOSS") return this.phase === "RALLY" && this.ball.lastHitter === "opponent" ? "servizio" : this.natpfWeakServeP2 && this.natpfWeakServeP2 !== B.weak ? "servizio in attesa" : "servizio ignorato";
    if (this.phase !== "RALLY") return "fase";
    if ((L !== B.racket && L?.who === "p2") || (B.hitter === "player" && this.ball.lastHitter === "opponent")) return "colpito";
    if (P && P !== B.pend) return "in attesa";
    if (P && P === B.pend) return "non sostituisce";
    if (B.hitter === "opponent") return "palla via";
    return "vuoto";
  }
  _p2SwingInput(e = {}) {
    // NATPF: Player 2 mancino → il suo personaggio è specchiato anche sul computer dell'host
    const natpfHand = e.hand || (e.natpf && e.natpf.hand);
    // NATPF 1v1: sull'host il colpo del P2 vale solo a partita 1v1 in corso. Prima ogni colpo del P2 (anche con
    // l'host nel menu o contro la CPU) accendeva il 1v1 e ripristinava la durata a un game
    if (this.playerRole !== "p2" && !this._versusInMatch()) return;
    natpfHand && this.playerRole !== "p2" && this.natpfUi && this.natpfUi.hand && this.natpfUi.hand.mirrorRemote && this.natpfUi.hand.mirrorRemote(this.opponent, natpfHand);
    natpfHand && (this.natpfP2Hand = natpfHand === "left" ? "left" : "right"); // NATPF racchetta virtuale: piano d'intercetto del P2 (natpf_impact.js)
    if (
      ((this.userHasInteracted = !0),
      (this.isMultiplayer = !0),
      this.phase === "TITLE" && this.playerRole === "p2")
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
      // NATPF: servizio del Player 2 dal gesto, con le regole del P1 (tempo rispetto al punto più alto, gesto nella salita
      // ignorato, gesto debole in attesa della battuta vera, natpfWeakServeP2). Diagnostica 142438 (C3): prima il P2
      // batteva sempre «POWER» con la palla in un punto a caso del quadrato. Senza il campo natpf (webcam, tastiera) come prima
      if (e.natpf && e.natpf.aim === "swing" && !e.timing) {
        const tau = this.ball.vel.y / L.GRAVITY + NS.eventLatency(e);
        if (tau > NO.SERVE.ignoreBefore) return;
        if (NI.weakSwing(e) && tau > -NI.WEAK.serveWait) { this.natpfWeakServeP2 ||= { evt: e, tau }; return; }
        this.natpfWeakServeP2 = null;
        this._executeServeHit(this.opponent, { ...e, natpfServeTau: tau });
        return;
      }
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
      const t = natpfHandedSide(
          e.side === "backhand" || (Number(e.dirX || 0) > 0.12 && e.side !== "forehand")
            ? "backhand"
            : e.side === "forehand" || Number(e.dirX || 0) < -0.12
              ? "forehand"
              : this.ball.pos.x > this.opponent.pos.x + 0.05 || this.ball.targetLanding.x > 0.15
                ? "backhand"
                : "forehand",
          e, e.hand || this.natpfP2Hand),
        i = String(e.shotType || this.p2SelectedShotType || "topspin").toLowerCase();
      // NATPF racchetta virtuale: lo swing del P2 con il telefono passa dalla finestra d'impatto come quello del P1
      // (natpf_impact.queueUserSwing, attesa in pendingP2Swing). Diagnostica 142438 (C2): prima aspettava solo 0,22 s
      // (il P1 fino all'arrivo della palla) e scadeva prima del rimbalzo. Webcam e tastiera (senza natpf) come prima
      if (!this.isDoubles && this.ball.lastHitter === "player" && e.natpf && e.natpf.aim === "swing" && !e.timing) {
        const q = NI.queueUserSwing(this, { ...e, side: t }, this.opponent);
        if (q === "held" || q === "late" || q === "ignored") return;
        if (q === "whiff") {
          this.audioEngine && this.audioEngine.playSwingWhoosh(Number(e.speed || 1.15));
          this._natpfEarlyWhiff({ actor: this.opponent, evt: { ...e, side: t }, prep: !0, natpfWhy: "tardi" });
          return;
        }
      }
      if (this.ball.lastHitter === "player") {
        const s = this.opponent.pos.z - this.ball.pos.z;
        if (s < -0.95 && s >= -7.8) {
          // NATPF: un gesto, un solo swing anche per il Player 2 (come per il P1, NS.SWING_VISUAL)
          NS.holdSwingPrep(this.opponent, t, NS.leadToSweetSpot(s, this.ball.vel.z)),
            (this.pendingP2Swing = {
              // NATPF skill gap: attesa dello sweet spot breve anche per il Player 2
              evt: { ...e, side: t, sweetSpotAssisted: !0, natpfLead: NS.leadToSweetSpot(s, this.ball.vel.z) },
              expiresAt: NS.assistExpiry(this.elapsedTime, NS.skillLevel("1v1")),
              waitForSweetSpot: !0,
              actor: this.opponent,
              prep: !0,
            });
          return;
        }
      }
      if (!this._attemptP2RallyStrike({ ...e, side: t })) {
        const wait = this.ball.lastHitter === "player";
        wait
          ? (NS.holdSwingPrep(this.opponent, t, NS.leadToSweetSpot(this.opponent.pos.z - this.ball.pos.z, this.ball.vel.z)),
            (this.pendingP2Swing = {
              // NATPF skill gap: come sopra
              evt: { ...e, side: t, sweetSpotAssisted: !0, natpfLead: NS.leadToSweetSpot(this.opponent.pos.z - this.ball.pos.z, this.ball.vel.z) },
              expiresAt: NS.assistExpiry(this.elapsedTime, NS.skillLevel("1v1")),
              waitForSweetSpot: !0,
              actor: this.opponent,
              prep: !0,
            }))
          : this.racketKinematics &&
            this.racketKinematics.triggerSwing(this.opponent, {
              shotType: i,
              side: t,
              speed: Number(e.speed || 1.2),
              timing: "sweet",
              dirX: Number(e.dirX || 0),
            });
      }
    }
  }
  // NATPF B18.2 (difetto 11 / D11 del rapporto B16): i quattro personaggi fermi. Il motore muove i personaggi solo con la
  // palla in gioco: a fine punto la velocità restava quella dell'ultimo passo e nessuno la azzerava. Al servizio dopo la CPU
  // (che ha inerzia: natpf_skill.cpuStep, natpf_legend.legendStep) ripartiva con quella velocità, spesso nel verso
  // sbagliato (4–5 m/s di lato: gli unici ace del gioco nascevano da lì, 0 su migliaia di servizi con la CPU ferma), e
  // per tutta la pausa le gambe correvano sul posto (player_body_animation: passo di corsa sopra 0,25 m/s).
  // Si chiama a fine punto (le gambe si fermano subito) e a ogni servizio (rig: anche lo stato della corsa
  // dell'animazione, così il personaggio spostato sulla riga del servizio non «frena»)
  _natpfStandStill(rig = !1) {
    for (const a of [this.player, this.playerPartner, this.opponent, this.opponentPartner]) {
      if (!a || !a.vel) continue;
      a.vel.set(0, 0, 0);
      rig && a.rig && ((a.rig.prevLocalVelX = 0), (a.rig.prevLocalVelZ = 0), (a.rig.wasMoving = !1));
    }
    this.natpfLegend && (this.natpfLegend.lunging = !1);
  }
  _startServeToss(e) {
    (this.phase = "SERVE_TOSS"), (this.phaseTimer = 0), (this.pendingServeSwing = null), (this.natpfWeakServe = null), (this.natpfWeakServeP2 = null);
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
    // NATPF racchetta virtuale: servizio dal gesto (natpf_stroke_outcome.serveOutcome), senza caso
    // … nel riferimento di chi batte: il Player 2 guarda verso +z (la sua destra è −x), quadrato, angolo ed effetto
    // laterale si specchiano come nei colpi dello scambio (_natpfRacketShot)
    // B18 (D12): tipo e «Gran servizio» rispetto al servizio abituale di chi batte (NO.serveRefOf), che impara dai servizi
    const natpfMir = e === this.opponent ? -1 : 1,
      natpfRef = Number.isFinite(t.natpfServeTau) ? NO.serveRefOf(this, e) : null,
      natpfIntent = natpfRef ? NO.eventIntent(t) : null,
      natpfServe0 = natpfRef
        ? NO.serveOutcome({ intent: natpfIntent, tau: t.natpfServeTau, boxSign: natpfMir * e.sideSign * (this.score.deuceSide ? -1 : 1), ref: natpfRef.value })
        : null,
      natpfServe = natpfServe0 && natpfMir < 0 ? { ...natpfServe0, x: -natpfServe0.x, sidespin: -natpfServe0.sidespin } : natpfServe0;
    natpfServe0 && natpfRef.learn(natpfIntent, natpfServe0);
    const a = o.MathUtils.clamp(Number(t.speed || 1.18), 0.78, 1.68),
      s = natpfServe ? natpfServe.grade === "POWER SERVE!" : i >= 2.05 && i <= 3.55,
      n = natpfServe ? natpfServe.grade === "EARLY SERVE" : i < 1.72;
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
      c = e.role === "opponent" && !this.isMultiplayer ? NS.cpuServeFlight(this) : 1; // NATPF: servizio della CPU per livello (natpf_skill.js)
    let y = -e.sideSign * (4.4 + Math.random() * 1.35),
      f = s ? Math.max(0.58, 0.66 / Math.min(1.18, a * 0.92)) * c : n ? 0.94 * c : 0.8 * c,
      m = s ? 22 : n ? 8 : 15,
      d = Number(t.dirX || 0) * -8;
    natpfServe && ((y = -e.sideSign * natpfServe.depth), (f = natpfServe.flight), (m = natpfServe.topspin), (d = natpfServe.sidespin));
    const b = !1,
      u = this.ball.pos.clone();
    this._launchBallToTarget(this.ball.pos, new o.Vector3(natpfServe ? natpfServe.x : p, 0, y), f, {
      topspin: m,
      sidespin: d,
      allowNetFault: b,
    });
    // NATPF (diagnostiche del 30/10, C4): il servizio dal gesto cade alla profondità voluta, con l'aria come gli altri
    // colpi (prima 0,9–1,4 m più corto), e passa sopra la rete anche con l'aria
    natpfServe && NS.fixAirServe(this.ball, { from: u, to: { x: natpfServe.x, z: y }, topspin: m, sidespin: d, gravity: L.GRAVITY, drag: L.AIR_DRAG, netY: S.NET_HEIGHT_CENTER });
    // NATPF B18: servizio della CPU (con il formato in fiera la CPU batte anche a 1 game): velocità vera della palla come
    // per il servizio dal gesto, non più 194 km/h fissi (audit B16, punto 17)
    const cpuServe = e.role === "opponent" && !this.isMultiplayer;
    const w = natpfServe || cpuServe
      ? Math.round(this.ball.vel.length() * 6.8) // NATPF: dalla velocità vera della palla, con la scala dei colpi dello scambio
      : Math.round(
          s
            ? 188 + Math.min(22, (a - 1) * 32)
            : n
              ? 128 + Math.random() * 14
              : 158 + Math.min(22, (a - 0.9) * 28),
        );
    natpfServe && (this.natpfLastServe = { ...natpfServe, kmh: w, tau: +t.natpfServeTau.toFixed(3) });
    this.natpfArena.setSpeed(w); // NATPF: velocità del servizio sui segnapunti dell'arena
    if (
      ((this.ball.inPlay = !0),
      (this.ball.lastHitter = e.role === "player" ? "player" : "opponent"),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount = 1),
      (this.ball.natpfFeed = !1), // NATPF B18 (D7, revisione): palla di una partita, non del lanciapalle
      // NATPF B18 (D12): «Gran servizio» (s) è sulla forza di servizio di chi batte; la palla potente per la CPU resta con la
      // regola di prima (natpfServe.strong), così la risposta della CPU non cambia
      (this.ball.isPowerShot = natpfServe ? natpfServe.strong : s),
      (this.ball.shotType = (natpfServe ? natpfServe.strong : s) ? "POWER" : "TOPSPIN"),
      this.ballTrail.clear(),
      // NATPF B18 (revisione R4): la scia del servizio della CPU è quella normale, non quella del colpo potente
      this.ballTrail.setStyle(cpuServe ? "TOPSPIN" : this.ball.shotType, s && !cpuServe),
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
      // NATPF B18: niente tremolio della telecamera né stelline sul servizio della CPU (era l'effetto del colpo eccezionale a
      // ogni servizio: la CPU serve sempre «potente»). isPowerShot resta com'era: lo usa la risposta (_executeOpponentReturn)
      s && (cpuServe || ((this.cameraTrauma = 0.34), this._spawnStarBurst(this.ball.pos, 14))),
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
        T = natpfServe ? natpfServe.grade : s ? "POWER SERVE!" : n ? "EARLY SERVE" : "GOOD SERVE",
        M = `${w} KM/H \u2022 ${s ? "SWEET SPOT APEX" : n ? "LOW CONTACT" : "SERVICE BOX"}`,
        R = this._projectToScreen(e.pos.clone().add(new o.Vector3(0, 2.35, 0)));
      // NATPF B10: servizio del Player 2 con «P2» come i colpi dello scambio (lato della scritta, «avversario», dentro/fuori)
      this.hud.showTimingPopup({ grade: (e === this.opponent ? "P2 " : "") + T, detail: M, screenPos: R }),
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
            shotType: s ? "POWER" : "TOPSPIN", // NATPF: servizio potente, non «Smash!» sul telefono
            speedKmh: w,
            intensity: s ? 1.5 : n ? 0.75 : 1.05,
          });
    }
    const x = e.role === "player" ? this.opponent : this.player;
    x === this.player ? this._natpfPlanPlayer() : this._natpfPlanOpponent(x);
    // NATPF B18.2 (D11): il servizio di chi gioca contro la CPU ha un peso suo (natpf_skill.registerServe): la risposta
    // dipende da velocità, strettezza e tempo del servizio, e quello forte e angolato la CPU lo legge in ritardo. Solo contro
    // la CPU: nello stesso schermo e nella sfida tra due computer risponde una persona, e il servizio della CPU non cambia.
    // Senza il servizio dal gesto (webcam «argon»): tempo del colpo dal voto del motore base
    e === this.player && !this.isMultiplayer && !this.autoPlayMode
      ? NS.registerServe(this, {
          speed: this.ball.vel.length(),
          q: natpfServe ? natpfServe.q : s ? 1 : n ? 0.6 : 0.85,
          x: natpfServe ? natpfServe.x : p,
          box: e.sideSign * (this.score.deuceSide ? -1 : 1),
        })
      : (NS.skillState(this).serve = null);
    // NATPF: la CPU che ha servito torna al centro dietro la riga di fondo durante il volo del servizio, come chi serve
    // davvero (prima restava dove aveva servito, fuori centro: con la risposta presa da fondo campo il campo aperto
    // regalava vincenti in risposta)
    // (Leggenda ha il suo modello di posizione, natpf_legend.js)
    e === this.opponent && !this.isMultiplayer && !this.isDoubles && !NL.isLegend(this) && e.targetPos.set(0, 0, -S.BASELINE_Z - 0.3);
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
            : // NATPF B15: senza lato nell'evento, dal gesto o dalla palla nel riferimento della mano di chi gioca (il
              // mancino ha il dritto a sinistra); il compagno CPU del doppio è destro
              (Number(e.dirX || 0) > 0.14
                ? !0
                : Number(e.dirX || 0) < -0.14
                  ? !1
                  : this.ball.pos.x < p.pos.x - 0.04 || this.ball.targetLanding.x < -0.12) !==
              (p === this.player && (e.hand || this.natpfUi?.hand?.hand) === "left"),
      d = !t && Number.isFinite(e.natpfTau)
        ? NO.smashAt(e, this.ball.pos.y, { serveReturn: Number(this.ball.rallyStrokeCount || 0) <= 1 }) // NATPF racchetta virtuale: schiacciata dal gesto e dall'altezza della palla (in risposta al servizio solo dal gesto)
        : e.side === "overhead" ||
          ((this.selectedShotType === "FLAT" || e.shotType === "smash") && this.ball.pos.y > 1.5) ||
          this.ball.pos.y > 1.78,
      // NATPF: schiacciata chiamata per nome (scritta e voce «Smash») solo se voluta: gesto della schiacciata E palla alta
      // (natpf_stroke_outcome.smashCalled). Prima la voce la diceva per ogni palla giocata da sopra la testa: dritti sopra
      // 2,3 m, nel doppio volée sopra 1,78 m e colpi forti sopra 1,5 m (segnalazione del 06/11)
      dn = NO.smashCalled(e, { smash: d });
    if (
      ((p.swingType = d ? "smash" : m ? "backhand" : "forehand"),
      (p.swingDuration = 0.36),
      (p.swingTimer = 0.36),
      (p.arcVisibleTimer = this.autoPlayMode ? 0.85 : 0.36),
      p.swingArcMesh && (p.swingArcMesh.visible = !1),
      this.racketKinematics)
    ) {
      const A = String(e.shotType || this.selectedShotType || "topspin").toLowerCase(),
        G = d || A === "power" ? "smash" : A,
        st = this.racketKinematics.triggerSwing(p, {
          shotType: G,
          side: d ? "overhead" : m ? "backhand" : "forehand",
          speed: f,
          timing: "sweet",
          dirX: Number(e.dirX || 0),
        });
      // NATPF: colpo di chi gioca → l'animazione parte da poco prima dell'impatto (NS.SWING_VISUAL), la racchetta
      // tocca la palla nell'istante del colpo; la carica del gesto anticipato finisce qui
      t || (NS.swingFromContact(st), p.userData && (p.userData.natpfPrep = null));
    }
    if ((this.audioEngine && this.audioEngine.playSwingWhoosh(f), y > (l ? 4.05 : 4.85) && !t)) {
      if (g > 1.45) {
        p.swingCooldown = 0.16;
        this.natpfLastWhiff = { side: "player", stroke: this.ball.rallyStrokeCount }; // B20: banner «Colpo a vuoto di …» nello stesso schermo
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
                  ["pro", "leggenda"].includes(this.matchConfig.difficulty) &&
                  ((u = g < 0 ? "EARLY" : "LATE"), (w = g < 0 ? 0.3 : 0.7));
    // NATPF: telefono in verticale → il voto viene dal tempo vero del colpo (istante del picco sul telefono)
    const natpfSwing = !t && e.natpf && e.natpf.aim === "swing" && !e.timing,
      natpfTau = natpfSwing ? (e.sweetSpotAssisted ? Number(e.natpfLead || 0) + NS.eventLatency(e) : NS.swingTiming(g, this.ball.vel.z)) : 0;
    natpfSwing && ({ grade: u, cursor: w } = NS.swingGrade(natpfTau, NS.skillLevel(this.matchConfig.difficulty)));
    // NATPF racchetta virtuale: esito deterministico del colpo (intenzione dal gesto, tempo vero, esecuzione), niente caso
    const racketShot = !t && Number.isFinite(e.natpfTau) ? this._natpfRacketShot(e, p, { lateral: c, smash: d, called: dn, running: p.vel.length() / Math.max(1, p.maxSpeed) }) : null;
    racketShot && ((u = racketShot.u), (w = racketShot.w));
    const _ = racketShot ? racketShot.defensive : u === "VERY EARLY" || u === "VERY LATE",
      T = racketShot ? racketShot.T : this.selectedShotType || "TOPSPIN",
      M = racketShot ? racketShot.M : !_ && (u === "PERFECT" || T === "FLAT" || d) && f >= 0.98,
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
      natpfDrop = racketShot ? racketShot.drop : !!(e.natpfDrop || (e.natpf && e.natpf.shot === "drop"));
    let E = racketShot
      ? racketShot.E
      : t
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
    _ && !t && !racketShot && (E *= 0.75);
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
    racketShot && ({ N, I, C, V, O } = racketShot);
    const K = Math.max(0.84, 1 - Math.min(8, this.ball.rallyStrokeCount) * 0.015);
    racketShot || natpfDrop || T === "LOB" || (I *= K); // NATPF skill gap: palla corta e pallonetto non accelerano con lo scambio
    // NATPF skill gap: profondità con rischio di palla lunga, velocità che cresce con i colpi perfetti consecutivi
    if (!t && !racketShot) {
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
    (B.y = Math.max(0.78, Math.min(racketShot && racketShot.T === "FLAT" && d ? 3.1 : 1.92, B.y))), // NATPF: la schiacciata parte da dove si colpisce
      this.ball.pos.copy(B),
      this._launchBallToTarget(B, new o.Vector3(E, 0, N), I, { topspin: C, sidespin: V, allowNetFault: O, ...(racketShot?.out?.shot === "SMASH" ? { minFlight: NO.OUTCOME.smashFlight / (racketShot.super ? NO.SUPER.smashUp : 1) } : {}), ...(racketShot?.netClear != null ? { netClear: racketShot.netClear } : {}) }),
      (this.ball.natpfSuper = racketShot?.super || null),
      // NATPF varietà: il lancio non considera l'aria e ogni colpo cadeva circa 2 m prima del bersaglio (palle «in fondo»
      // a metà campo, errori «lunghi» che restavano dentro): la velocità si corregge perché la palla cada alla profondità voluta
      O || NS.fixAir(this.ball, { from: B, to: { x: E, z: N }, topspin: C, sidespin: V, gravity: L.GRAVITY, drag: L.AIR_DRAG }),
      (this.ball.inPlay = !0),
      (this.ball.lastHitter = "player"),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount += 1),
      (this.ball.shotType = T),
      (this.ball.isPowerShot = M),
      this.ballTrail.setStyle(T, M || NH.hotSteps(this.ball.rallyStrokeCount, this.natpfHot) > 0), // B20: scambio caldo → scia del colpo potente
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
      M && ((this.cameraTrauma = racketShot?.super ? 0.55 : d ? 0.42 : 0.26), this._spawnStarBurst(B, racketShot?.super ? 26 : d ? 18 : 11)), // NATPF: la schiacciata e il colpo super si sentono di più
      this.audioEngine &&
        (this.audioEngine.playRacketHit(
          T === "FLAT" || d || racketShot?.super ? "smash" : T.toLowerCase(),
          u === "PERFECT" || racketShot?.super ? "perfect" : "good",
        ),
        // NATPF: colpo super potente: sforzo e il pubblico che trattiene il fiato
        racketShot?.super && !this.autoPlayMode && (this.audioEngine.playerVoice?.("effort"), this.audioEngine.playCrowdReaction?.("ooh")));
    const F = Math.round(this.ball.vel.length() * 6.8),
      H = dn ? "SMASH" : m ? "BACKHAND" : "FOREHAND",
      // NATPF: i colpi speciali si vedono sempre per nome (prima «anticipo/ritardo» copriva pallonetto e palla corta)
      natpfSpecial = dn ? "SMASH" : natpfDrop ? "DROP SHOT" : T === "LOB" ? "LOB" : T === "SLICE" ? "SLICE" : null,
      // NATPF: con la racchetta virtuale incrociato e lungolinea dalla caduta vera (la direzione segue il ritmo di chi
      // gioca, non solo il voto del tempo)
      natpfDir = racketShot && racketShot.out ? Math.sign(racketShot.contact || 1) * racketShot.out.x : null,
      X = racketShot?.super
        ? (dn ? "SUPER SHOT SMASH" : "SUPER SHOT")
        : l
        ? "NET VOLLEY"
        : _
          ? "DEFENSIVE"
          : natpfSpecial && !t
            ? (dn ? "SMASH" : `${H} ${natpfSpecial}`)
          : natpfDir != null
            ? (natpfDir <= -1 ? `${H} CROSS` : natpfDir >= 1 ? `${H} LINE` : `${H} ${T}`)
          : u === "EARLY"
            ? `${H} CROSS`
            : u === "LATE"
              ? `${H} LINE`
              : `${H} ${T}`;
    if (!this.autoPlayMode) {
      const A = this._projectToScreen(p.pos.clone().add(new o.Vector3(0, 2.35, 0)));
      // NATPF: «Smash» detto solo quando la scritta del colpo lo dice (prima: da swingType, anche sotto «Volée» o «Super!»)
      /\bSMASH\b/.test(X) && this.audioEngine && this.audioEngine.playVoiceCallout("smash");
      this.hud.showTimingPopup({ grade: `${u} \u2022 ${X}!`, detail: `${F} KM/H`, screenPos: A, partner: p === this.playerPartner }), // NATPF B10: colpo del compagno (il tuo gesto)
        this.motionController &&
          this.motionController.triggerHapticFeedback &&
          this.motionController.triggerHapticFeedback({
            role: "p1",
            // NATPF B18 (difetto 10): il colpo difensivo è un colpo come gli altri (la palla resta in gioco). Prima
            // «fault» faceva scrivere al telefono «Punto avversario» per più di un secondo con lo scambio ancora aperto;
            // «fault» resta solo in _awardPoint, a punto finito
            kind: "hit",
            defensive: !!_,
            grade: `${u} \u2022 ${X}`,
            // NATPF: al telefono «Smash!» solo se la scritta e la voce lo dicono (non sotto «Volée» del compagno)
            shotType: /\bSMASH\b/.test(X) ? "SMASH" : T,
            speedKmh: F,
            intensity: M ? 1.45 : _ ? 0.75 : 1.1,
          });
    }
    return (
      this.hud.updateTimingGauge({ cursorNormalized: w, modeTitle: `${u} (${X})`, speedText: `${F} KM/H` }),
      // NATPF racchetta virtuale: dopo il colpo verso il fondo, quanto il tempo lo permette (natpf_impact.js)
      racketShot && !l && !this.isDoubles
        ? NI.recoverAfterShot(this, this.player, { landingX: E, flight: I, contactZ: p.pos.z })
        : this.player.targetPos.set(o.MathUtils.clamp(-E * 0.22, -1.6, 1.6), 0, S.BASELINE_Z - 0.15),
      this.playerPartner.targetPos.set(
        o.MathUtils.clamp(E * 0.35 + (this.score.deuceSide ? -1.4 : 1.4), -2.8, 2.8),
        0,
        5.1,
      ),
      this._natpfPlanOpponent(this.opponent),
      this.isMultiplayer || t || NS.planCpuRun(this), // NATPF skill gap: reazione e lettura della CPU
      !0
    );
  }
  // NATPF racchetta virtuale: esito deterministico del colpo di chi gioca (natpf_stroke_outcome.js). lateral: distanza
  // laterale della palla; smash: colpo da sopra la testa; running: corsa al momento del colpo (0…1)
  // called: schiacciata chiamata per nome (NO.smashCalled: gesto della schiacciata), per chi legge l'esito (allenamento)
  _natpfRacketShot(e, p, { lateral = 0, smash = !1, called = smash, running = 0 } = {}) {
    const lv = NS.skillLevel(this.matchConfig.difficulty), b = this.ball;
    // chi colpisce verso −z (P1) o verso +z (P2 nel 1v1): l'esito è nel suo riferimento (x a destra), poi si specchia
    const toward = p === this.opponent ? 1 : -1, mirror = toward === 1 ? -1 : 1;
    const intent = NO.eventIntent(e), shot = smash ? "smash" : intent.shot === "smash" ? "flat" : intent.shot;
    // lato del colpo: dal gesto (dritto o rovescio letto dal telefono o dalla webcam), così la direzione voluta con il
    // tempo non dipende da dove il movimento automatico ha messo il corpo (prima: dalla palla rispetto al corpo); senza
    // lato, dalla palla. hitX: dove è la palla all'impatto (riferimento di chi colpisce): il punto neutro la segue
    const dx = (b.pos.x - p.pos.x) * mirror, hand = (e.natpf && e.natpf.hand) || e.hand || "right", fh = hand === "left" ? -1 : 1,
      contact = e.side === "forehand" ? fh : e.side === "backhand" ? -fh : Math.abs(dx) >= 0.2 ? Math.sign(dx) : fh,
      hitX = b.pos.x * mirror;
    // allungo, corsa e preparazione; arrivare al limite su un angolo dell'avversario toglie qualità (natpf_impact.js)
    // … e una palla molto veloce (da 24 m/s, fino a −25% a 36 m/s), profonda (colpita oltre 30 cm dietro la riga, fino a
    // −15%) o con il rimbalzo alto sopra la spalla (fino a −12%, non la schiacciata) si controlla peggio
    const cl = (v) => Math.max(0, Math.min(1, v)),
      pace = (1 - 0.25 * cl((b.vel.length() - 24) / 12)) * (1 - 0.15 * cl((Math.abs(p.pos.z) - 12.2) / 1.2)) * (smash ? 1 : 1 - 0.12 * cl((b.pos.y - 1.5) / 0.6)),
      // situazione di chi colpisce (corsa e palla lontana, preparazione, allungo, palla veloce) e, a parte, pressione degli
      // scambi lunghi: a rete con il tempo perfetto la situazione non manda la palla in rete (natpf_stroke_outcome.js)
      Q = { reach: NS.reachQuality(lateral, running), prep: NS.prepQuality(e.natpf), stretch: !this.isDoubles && (p === this.player || p === this.opponent) ? NI.stretchQuality(this, p) : 1, pace },
      quality = Q.reach * Q.prep * Q.stretch * Q.pace,
      pressure = NO.rallyPressure(b.rallyStrokeCount, NO.assistOf(lv).pressureFrom),
      volley = b.bounceCountOnCurrentSide === 0 && Math.abs(p.pos.z) < 9;
    const shortBall = b.bounceCountOnCurrentSide > 0 && b.rallyStrokeCount > 1 && Math.abs(b.targetLanding.z) <= 6.4 && Math.abs(b.pos.z) <= 7;
    // ritmo di chi colpisce (natpf_stroke_outcome.createRhythm): la direzione si misura attorno al suo tempo abituale
    const rhythms = (this.natpfRhythm ||= { player: NO.createRhythm(), p2: NO.createRhythm() }), rhythm = rhythms[toward === 1 ? "p2" : "player"];
    let out = NO.strokeOutcome({ intent: { ...intent, shot }, timing: e.natpfTau, lateSpan: e.natpfLateSpan, ballVz: b.vel.z, contact, hitX, hitZ: Math.abs(b.pos.z), quality, pressure, rhythm: rhythm.value, contactY: b.pos.y, volley, net: Math.abs(p.pos.z) < 5, shortBall, level: lv });
    rhythm.add(out.t);
    // NATPF: colpo super potente (natpf_stroke_outcome.superShot): gesto fortissimo, naturale, a tempo, su una palla alta,
    // lenta o corta → in fondo, più piatto e molto più veloce; l'avversario lo legge in ritardo (ball.natpfSuper)
    const sup = NO.superShot({ intent, out, contact, ballSide: dx, contactY: b.pos.y, ballVz: b.vel.z, shortBall });
    if (sup.on) out = { ...out, depth: Math.max(out.depth, NO.SUPER.minDepth), clear: S.NET_HEIGHT_CENTER + NO.SUPER.netGap, topspin: out.shot === "SMASH" ? out.topspin : NO.SUPER.topspin };
    // B20: «scambio che si scalda» (opzione dello staff, natpf_hot_rally.js): dal 10° colpo i colpi normali passano via via
    // più bassi e più carichi, cioè più veloci, uguale per il P1 e per il P2. Spenta: lo stesso oggetto di prima
    else out = NH.hotOutcome(out, b.rallyStrokeCount + 1, this.natpfHot, S.NET_HEIGHT_CENTER);
    // colpo fallito o debole: la causa che pesa di più, per il messaggio del colpo e la diagnostica
    const cause = out.failed ? (out.pressured ? "scambio lungo" : [["reach", running > 0.5 ? "in corsa" : "palla lontana"], ["prep", "senza preparazione"], ["stretch", "in allungo"], ["pace", "palla veloce"]].reduce((a, k) => (Q[k[0]] < Q[a[0]] ? k : a))[1]) : null;
    const R = p.pos.x >= 0 ? 1 : -1, N = toward * out.depth, X = out.x * mirror, engineShot = out.shot === "DROP" ? "SLICE" : out.shot === "SMASH" ? "FLAT" : out.shot;
    const st = NS.registerPlayerShot(this, { grade: out.grade, quality: out.q, power: intent.power, landingX: X, landingZ: N, shot: out.shot, cpuZ: this.opponent.pos.z, who: toward === 1 ? "p2" : "player" });
    const fromY = Math.max(0.78, Math.min(out.shot === "SMASH" ? 3.1 : 1.92, b.pos.y));
    let I;
    // pallonetto e chiusura sopra la rete (natpf_stroke_outcome: volo che passa basso sul nastro): il volo dell'esito
    if (out.shot === "LOB" || (out.attack && out.shot !== "SMASH")) I = out.flight;
    // NATPF: schiacciata a velocità piena (OUTCOME.smashSpeed): dal punto d'impatto al punto di caduta, più lenta se fallita
    else if (out.shot === "SMASH") I = Math.max(NO.OUTCOME.smashFlight / (sup.on ? NO.SUPER.smashUp : 1), (Math.abs(b.pos.z) + out.depth) / (NO.OUTCOME.smashSpeed * (sup.on ? NO.SUPER.smashUp : 1))) * (out.failed || out.weak ? 1.5 : 1);
    else if (out.shot === "DROP") I = Math.max(1.32, (Math.abs(b.pos.z) + out.depth) / 10);
    else {
      // forza → tempo di volo base (come prima), più veloce con lo scambio e con i perfetti consecutivi; poi abbastanza
      // lungo da passare la rete all'altezza voluta (galleggia di più se il colpo è sporco)
      // il ritmo cresce un poco con lo scambio, come prima (fino a −16% del tempo di volo all'ottavo colpo)
      // B15 (08/11): il tetto della velocità del motore base era 1,2 (forza da 0,56 in su: stesso volo base 0,70 s, la
      // palla più forte solo per l'altezza minore sulla rete; banco colpi.mjs: gesto 0,6× → 1,4× del proprio colpo
      // 82 → 119 km/h, ×1,45). Ora 1,5: a forza piena 0,58 s (il minimo di sempre), a 0,74 0,63 s (era 0,70)
      // B20: con lo «scambio che si scalda» acceso, dal 10° colpo il volo si accorcia ancora a ogni colpo, uguale per il
      // P1 e per il P2 (NH.hotFlight; spento il fattore è 1 esatto)
      const K = Math.max(0.84, 1 - Math.min(8, b.rallyStrokeCount) * 0.015) * NH.hotFlight(b.rallyStrokeCount + 1, this.natpfHot),
        base = out.shot === "SMASH" ? out.flight : Math.max(0.58, 0.84 / Math.min(1.5, (0.8 + intent.power * 0.85) * 0.94)) * K;
      I = NO.outcomeFlight({ ...out, flight: null }, { fromY, fromZ: b.pos.z, toZ: N, flight: NS.mistimeFlight(NS.streakFlight(base, toward === 1 ? st.p2Streak : st.streak, lv), out.q) / (sup.on ? NO.SUPER.speedUp : 1) });
    }
    // seq: numero del colpo del telefono (diagnostica); at: istante del motore, per riconoscere un esito nuovo
    // hand, source, aimFull (B16, diagnostica: lato delle palle per partita): mano di chi colpisce, da dove arriva il colpo
    // (telefono o webcam) e gradi della mira piena con cui il telefono ha letto il piatto (sensibilità della mira)
    this.natpfLastRacket = { who: toward === 1 ? "p2" : "player", intent, out, timing: e.natpfTau, contact, hitX: +hitX.toFixed(3), quality: +(quality * pressure).toFixed(3), pressure: +pressure.toFixed(3), cause, volley, flight: +I.toFixed(3), seq: (e.natpf && e.natpf.seq) ?? null, at: this.elapsedTime, super: sup.on ? sup.ball : null, superWhy: sup.why, smashCalled: !!called,
      hand, source: (e.natpf && e.natpf.source) || e.source || null, aimFull: e.natpf && Number.isFinite(e.natpf.aimFull) ? e.natpf.aimFull : null };
    // altezza minima sopra il nastro per il lancio: più bassa per il colpo super, la chiusura sopra la rete e la schiacciata
    const netClear = sup.on ? NO.SUPER.netGap : out.attack || out.hot ? Math.max(0.05, out.clear - S.NET_HEIGHT_CENTER) : null; // (B20: anche lo scambio caldo passa basso)
    return {
      // B20 (revisione): l'effetto laterale del tagliato e della palla corta è una spinta lungo x del campo (la fisica non
      // guarda il verso della palla) e R è già il lato del campo di chi colpisce: verso il centro per tutti e due. Prima
      // per il P2 era moltiplicato per «mirror» e curvava verso l'esterno (soli tagliati: il P1 vinceva il 51,5–52,1% dei punti)
      netClear, E: X, N, I, C: out.topspin, V: out.shot === "SLICE" || out.shot === "DROP" ? -R * 9 : 0, O: out.netFault, T: engineShot,
      drop: out.shot === "DROP", u: out.grade, w: out.cursor, q: out.q, power: intent.power, out, contact,
      // colpo potente (stelle, scossa della camera): anche ogni schiacciata riuscita e ogni colpo super potente. La forza
      // sulla scala di prima (NO.superStrength: typePower dal telefono, B15), così scatta dallo stesso gesto di prima (da 1,25 volte
      // il colpo tipico di 780 °/s; con la forza dell'esito, più sensibile, da 1,2)
      M: sup.on || (out.shot === "SMASH" && !out.failed && !out.weak) || (out.shot !== "DROP" && out.shot !== "LOB" && out.q >= 0.9 && NO.superStrength(intent) >= 0.7 && Math.abs(out.t) <= 0.35),
      // per chi riceve: legge la palla in ritardo (CPU) e corre più piano verso di lei (chi gioca con il telefono)
      super: sup.on ? { ball: sup.ball, react: NO.SUPER.react, misread: NO.SUPER.misread, legendQ: NO.SUPER.legendQ, reach: NO.SUPER.reach } : null,
      defensive: out.excess > 0.6,
    };
  }
  _attemptP2RallyStrike(e = {}) {
    if (this.ball.lastHitter === "opponent") return !1;
    // NATPF racchetta virtuale: palla che rimbalzerebbe fuori, il P2 la lascia andare (piano fresco, natpf_impact.js)
    const natpfLet = NI.livePlan(this, this.opponent);
    if (!this.isDoubles && natpfLet && natpfLet.kind === "letgo") return !1;
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
            : // NATPF B15: come per il P1, nel riferimento della mano del P2 (natpfP2Hand)
              (Number(e.dirX || 0) > 0.14
                ? !0
                : Number(e.dirX || 0) < -0.14
                  ? !1
                  : this.ball.pos.x > l.pos.x + 0.04 || this.ball.targetLanding.x > 0.12) !==
              (l === this.opponent && (e.hand || this.natpfP2Hand) === "left"),
      m = this.p2SelectedShotType || "TOPSPIN",
      // NATPF: il P2 con il telefono in verticale schiaccia con la regola del P1 (gesto e altezza della palla). Prima ogni
      // palla sopra 1,78 m era una schiacciata: diagnostica del 29/10 (stesso schermo), risposte al servizio a fondo campo
      // con il gesto del pallonetto giocate come schiacciate
      d = e.natpf && e.natpf.aim === "swing" && !e.timing
        ? NO.smashAt(e, this.ball.pos.y, { serveReturn: Number(this.ball.rallyStrokeCount || 0) <= 1 }) // B20 (audit B19, punto 1): in risposta al servizio solo dal gesto, come il P1 (decisione del 31/10; la tappa 1 l'aveva dato solo al P1)
        : e.side === "overhead" ||
          ((m === "FLAT" || e.shotType === "smash") && this.ball.pos.y > 1.5) ||
          this.ball.pos.y > 1.78,
      dn = NO.smashCalled(e, { smash: d }); // NATPF: come per il P1, «SMASH» scritto solo per la schiacciata voluta
    if (
      ((l.swingType = d ? "smash" : f ? "backhand" : "forehand"),
      (l.swingDuration = 0.36),
      (l.swingTimer = 0.36),
      (l.arcVisibleTimer = 0.36),
      l.swingArcMesh && (l.swingArcMesh.visible = !1),
      this.racketKinematics)
    ) {
      const C = String(e.shotType || m || "topspin").toLowerCase(),
        V = d || C === "power" ? "smash" : C,
        st = this.racketKinematics.triggerSwing(l, {
          shotType: V,
          side: d ? "overhead" : f ? "backhand" : "forehand",
          speed: y,
          timing: "sweet",
          dirX: Number(e.dirX || 0),
        });
      // NATPF: come per il P1, racchetta sulla palla nell'istante del colpo
      NS.swingFromContact(st), l.userData && (l.userData.natpfPrep = null);
    }
    if ((this.audioEngine && this.audioEngine.playSwingWhoosh(y), c > (r ? 4.05 : 4.85)))
      return (
        p > 1.45 &&
          ((l.swingCooldown = 0.16),
          (this.natpfLastWhiff = { side: "opponent", stroke: this.ball.rallyStrokeCount }), // B20: come per il P1
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
      : p < -2.65 // NATPF 1v1: anche il P2 può colpire molto in anticipo o molto in ritardo, come il P1
        ? (u = "VERY EARLY")
        : p < -1.45 // NATPF skill gap: il voto dipende dal tempo, non dalla mira
          ? (u = "EARLY")
          : p > 1.35
            ? (u = "VERY LATE")
            : p > 0.68 && (u = "LATE");
    // NATPF: il P2 con il telefono in verticale gioca come il P1: voto dal tempo vero del colpo, direzione da tempo e
    // polso, mano mancina, palla corta e pallonetto veri. Senza il campo natpf (webcam, tastiera, server vecchio) come prima.
    const natpfSwing = !!(e.natpf && e.natpf.aim === "swing" && !e.timing),
      natpfLv = NS.skillLevel("1v1"),
      // tempo dalla finestra d'impatto (natpf_impact.queueUserSwing: quanto prima dell'arrivo della palla, con la palla
      // rimbalzata) come per il P1; altrimenti come prima
      natpfTau = natpfSwing ? (Number.isFinite(e.natpfTau) ? e.natpfTau : e.sweetSpotAssisted ? Number(e.natpfLead || 0) + NS.eventLatency(e) : NS.swingTiming(p, this.ball.vel.z)) : 0,
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
    // NATPF racchetta virtuale: il colpo del P2 senza caso, con lo stesso esito del P1 specchiato (_natpfRacketShot)
    const p2Racket = natpfSwing ? this._natpfRacketShot({ ...e, natpfTau }, l, { lateral: g, smash: d, called: dn, running: l.vel.length() / Math.max(1, l.maxSpeed) }) : null;
    p2Racket && (u = p2Racket.u);
    T = p2Racket
      ? p2Racket.E
      : natpfSwing
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
    natpfVery && !p2Racket && (T *= 0.75);
    let M = 8 + Math.random() * 2.6,
      R = w ? 0.72 : 0.86,
      v = w ? 20 : 15,
      E = 0,
      natpfP2Net = !1;
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
    natpfSwing && !p2Racket && !natpfVery && !r && !natpfDrop && m !== "LOB" && m !== "SLICE" && (M = -NS.swingDepthZ(NS.powerNorm(y)));
    p2Racket && ((M = p2Racket.N), (R = p2Racket.I), (v = p2Racket.C), (E = p2Racket.V), (natpfP2Net = p2Racket.O));
    if (!p2Racket) {
      const natpfS = NS.registerPlayerShot(this, { grade: u, quality: natpfP2Q, power: NS.powerNorm(y), landingX: T, shot: d ? "SMASH" : natpfDrop ? "DROP" : m, who: "p2" });
      (M = -NS.playerDepthZ(-M, { quality: natpfP2Q, power: NS.powerNorm(y), level: NS.skillLevel("1v1") }));
      // NATPF 1v1: rischio d'errore come il P1 (lungo con la potenza, largo vicino alle righe, in rete fuori tempo).
      // Prima il P2 non sbagliava mai: tutti i suoi colpi restavano dentro
      const natpfP2Err = natpfDrop || r ? { kind: "ok" } : NS.playerErrorPlan({ quality: natpfP2Q, power: NS.powerNorm(y), aimX: T, level: NS.skillLevel("1v1") });
      natpfP2Err.kind === "long" ? (M = -natpfP2Err.z) : natpfP2Err.kind === "wide" ? (T = natpfP2Err.x) : natpfP2Err.kind === "net" && (natpfP2Net = !0);
      (natpfDrop || natpfLob) || (R = NS.mistimeFlight(R, natpfP2Q)),
        // NATPF: palla corta e pallonetto non accelerano con la serie di perfetti; il colpo del telefono passa la rete
        natpfDrop || natpfLob || (R = NS.streakFlight(R, natpfS.p2Streak, NS.skillLevel("1v1"))),
        natpfSwing && !natpfDrop && (R = NS.minClearFlight({ fromY: Math.max(0.78, Math.min(1.92, this.ball.pos.y)), fromZ: this.ball.pos.z, toZ: M, flight: R, topspin: v }));
      // NATPF varietà: come il P1, angolo stretto corto e altezza sulla rete dal colpo e dalla forza (anche senza telefono)
      if (!r && !natpfDrop && !natpfVery && m !== "LOB" && !natpfP2Net) {
        natpfP2Err.kind === "ok" && (M = NS.angleDepth(T, M));
        const A = NS.shotArc({ shot: w && m !== "SLICE" ? "FLAT" : m, power: NS.powerNorm(y), quality: natpfP2Q, fromY: Math.max(0.78, Math.min(1.92, this.ball.pos.y)), fromZ: this.ball.pos.z, toZ: M, flight: R });
        (R = A.flight), (v = A.topspin);
      }
    }
    const k = this.ball.pos.clone();
    (k.y = Math.max(0.78, Math.min(p2Racket && p2Racket.T === "FLAT" && d ? 3.1 : 1.92, k.y))), // B20: la schiacciata del P2 parte da dove si colpisce, come quella del P1 (prima al massimo da 1,92 m: sui pallonetti finiva in rete)
      this.ball.pos.copy(k),
      this._launchBallToTarget(k, new o.Vector3(T, 0, M), R, { topspin: v, sidespin: E, allowNetFault: natpfP2Net, ...(p2Racket?.out?.shot === "SMASH" ? { minFlight: NO.OUTCOME.smashFlight / (p2Racket.super ? NO.SUPER.smashUp : 1) } : {}), ...(p2Racket?.netClear != null ? { netClear: p2Racket.netClear } : {}) }),
      (this.ball.natpfSuper = p2Racket?.super || null),
      natpfP2Net || NS.fixAir(this.ball, { from: k, to: { x: T, z: M }, topspin: v, sidespin: E, gravity: L.GRAVITY, drag: L.AIR_DRAG }), // NATPF varietà: la palla cade alla profondità voluta, come per il P1
      // NATPF: palla corta e pallonetto veri del P2, compensati per l'attrito dell'aria come quelli del P1
      (this.ball.inPlay = !0),
      (this.ball.lastHitter = "opponent"),
      (this.ball.bounceCountOnCurrentSide = 0),
      (this.ball.rallyStrokeCount += 1),
      // NATPF 1v1: sul computer del P2 il colpo è una previsione locale; gli snapshot dell'host fatti prima di riceverlo
      // non devono riportare indietro la palla (natpf_guest_view.holdBall)
      this.playerRole === "p2" && this.isMultiplayer && GV.markLocalHit((this.natpfGuestView ||= GV.createGuestView()), { count: this.ball.rallyStrokeCount, now: performance.now() }),
      (this.ball.shotType = m),
      (this.ball.isPowerShot = w),
      this.ballTrail.setStyle(m, w || NH.hotSteps(this.ball.rallyStrokeCount, this.natpfHot) > 0), // B20: come per il P1
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
      (w || p2Racket?.super) && ((this.cameraTrauma = p2Racket?.super ? 0.5 : 0.24), this._spawnStarBurst(k, p2Racket?.super ? 24 : 10)),
      p2Racket?.super && this.audioEngine && (this.audioEngine.playerVoice?.("effort"), this.audioEngine.playCrowdReaction?.("ooh")),
      this.audioEngine &&
        this.audioEngine.playRacketHit(
          m === "FLAT" || d ? "smash" : m.toLowerCase(),
          u === "PERFECT" ? "perfect" : "good",
        );
    const O = Math.round(this.ball.vel.length() * 6.8),
      // NATPF: i colpi speciali del P2 si vedono per nome, come quelli del P1
      natpfP2Special = natpfSwing || natpfDrop ? (dn ? "SMASH" : natpfDrop ? "DROP SHOT" : m === "LOB" ? "LOB" : m === "SLICE" ? "SLICE" : null) : null,
      N = p2Racket?.super
        ? (dn ? "SUPER SHOT SMASH" : "SUPER SHOT") // NATPF: come per il P1
        : r
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
      this.hud.showTimingPopup({ grade: `P2 ${u} \u2022 ${N}!`, detail: `${O} KM/H`, screenPos: I, partner: l === this.opponentPartner }),
      this.motionController &&
        this.motionController.triggerHapticFeedback &&
        this.motionController.triggerHapticFeedback({
          role: "p2",
          kind: "hit",
          grade: `${u} \u2022 ${N}`,
          shotType: /\bSMASH\b/.test(N) ? "SMASH" : m, // NATPF: come la scritta del P2
          speedKmh: O,
          intensity: w ? 1.45 : 1.1,
        }),
      // NATPF racchetta virtuale: come chi gioca qui, dopo il colpo verso il fondo quanto il tempo lo permette
      p2Racket && !r && !this.isDoubles
        ? NI.recoverAfterShot(this, this.opponent, { landingX: T, flight: R, contactZ: l.pos.z })
        : this.opponent.targetPos.set(o.MathUtils.clamp(-T * 0.22, -1.6, 1.6), 0, -S.BASELINE_Z + 0.25),
      this.opponentPartner.targetPos.set(
        o.MathUtils.clamp(T * 0.35 + (this.score.deuceSide ? 1.4 : -1.4), -2.8, 2.8),
        0,
        -5.1,
      ),
      this._natpfPlanPlayer(),
      !0
    );
  }
  _executeOpponentReturn(e = this.opponent) {
    const t = e === this.opponentPartner,
      i = !["pro", "leggenda"].includes(this.matchConfig.difficulty),
      a = Math.abs(this.ball.pos.x - e.pos.x),
      s = !!this.ball.isPowerShot,
      h = NS.cpuDefensive(this.matchConfig.difficulty, a, s), // NATPF B18 (D9): soglie per livello (natpf_skill.CPU_DEFENSE)
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
      // NATPF B18.2 passo 2: la palla esce dal lato da cui la CPU la colpisce (prima un lato a caso: attraversando il campo
      // l'aria la frenava e metà di queste palle «larghe» cadeva dentro, cioè l'errore non c'era), un poco più larga
      (g = (Math.abs(this.ball.pos.x) > 0.4 ? Math.sign(this.ball.pos.x) : Math.random() < 0.5 ? 1 : -1) * (S.SINGLES_X + 0.6 + Math.random() * 0.7)),
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
      this.natpfCpuDefense = { at: this.elapsedTime, stretch: +a.toFixed(3) }; // NATPF B18 (D9): ultima risposta difensiva (prove)
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
    // NATPF Leggenda: colpo scelto per utilità ed eseguito con le regole del giocatore, mira corretta per l'aria
    // (natpf_legend.js). Solo per la CPU principale: il compagno a rete del doppio gioca come prima
    const natpfLeg = e === this.opponent && NL.isLegend(this) && !(this.autoPlayMode && !this.userHasInteracted) ? NL.legendReturn(this, e) : null;
    natpfLeg && ((g = natpfLeg.x), (c = natpfLeg.z), (y = natpfLeg.shot), (f = natpfLeg.flight), (natpfArc = natpfLeg.arc), (m = natpfLeg.net));
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
        this.racketKinematics.triggerImpactRecoil(e, 0.95),
        natpfLeg && NL.legendSwingAtContact(this, e)), // NATPF Leggenda: con la palla lontana la racchetta allungata la tocca nell'istante del colpo
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
      natpfLeg && NL.legendRecover(this, e, g, c), // NATPF Leggenda: recupero sulla bisettrice degli angoli possibili
      this._natpfPlanPlayer();
  }
  // NATPF racchetta virtuale: chi gioca va dove prendere la palla, anche al volo (natpf_impact.js); nel doppio come prima
  _natpfPlanPlayer(opts) {
    this.isDoubles ? this._predictBallIntercept(this.player) : NI.planPlayerIntercept(this, this.player, opts);
  }
  // … e il Player 2 del 1v1 allo stesso modo nella sua metà campo; la CPU e il doppio come prima
  _natpfPlanOpponent(e = this.opponent, opts) {
    this.isMultiplayer && !this.isDoubles && e === this.opponent ? NI.planPlayerIntercept(this, e, opts) : this._predictBallIntercept(e);
  }
  // NATPF (diagnostiche del 30/10, C7): schiacciata o volée prevista e non colpita, finestra in ritardo passata: il piano
  // si rifà con i soli punti dopo il rimbalzo (natpf_impact.missedPlan), al massimo una volta per colpo. Prima chi gioca
  // restava fermo sotto il punto della schiacciata e la palla rimbalzava alle sue spalle. Lo decide l'host
  _natpfReplanMissed() {
    if (this.isDoubles || (this.playerRole === "p2" && this.isMultiplayer)) return;
    NI.missedPlan(this, this.player) && this._natpfPlanPlayer({ groundOnly: !0 });
    this.isMultiplayer && NI.missedPlan(this, this.opponent) && this._natpfPlanOpponent(this.opponent, { groundOnly: !0 });
  }
  // NATPF: minFlight, volo minimo (0,45 s come nel motore base; la schiacciata scende sotto, OUTCOME.smashFlight)
  // netClear: altezza minima sopra il nastro al centro (m); più bassa solo per il colpo super potente (NO.SUPER.netGap)
  _launchBallToTarget(e, t, i, { topspin: a = 14, sidespin: s = 0, allowNetFault: n = !1, minFlight: mf = 0.45, netClear: nc = 0.34 } = {}) {
    this.ball.natpfSuper = null; // NATPF: colpo super potente, lo rimette chi lancia (dopo il lancio)
    const h = Math.max(mf, i),
      r = t.x - e.x,
      l = t.z - e.z,
      p = 0.08 - e.y,
      g = L.GRAVITY + a * 0.14,
      c = r / h - 0.5 * (s * 0.12) * h,
      y = l / h,
      f = (p + 0.5 * g * h * h) / h;
    this.ball.vel.set(c, f, y), this.ball.spin.set(a, s, 0), this.ball.targetLanding.copy(t);
    // NATPF: palla mandata in rete (il bersaglio resta in campo): il messaggio del colpo dice «In rete», non «Perfetto»
    this.ball.natpfNetFault = !!n;
    const m = Math.abs(e.z) / Math.max(1, Math.abs(y));
    if (m > 0 && m < h) {
      const d = e.y + f * m - 0.5 * g * m * m;
      if (n) {
        const u = (S.NET_HEIGHT_CENTER - 0.12 - d) / m;
        this.ball.vel.y += u;
      } else {
        const b = S.NET_HEIGHT_CENTER + nc;
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
      // NATPF: rallentatore del riscaldamento (natpf_training.js) e della moviola (natpf_replay.js)
      rp = this.natpfReplay?.playing,
      i = this.phase === "REPLAY" ? (rp ? this.natpfReplay.speed : 0.38) : this.natpfTimeScale ?? 1,
      ea = rp ? e * this.natpfReplay.speed : e; // NATPF moviola: corpi e racchette rallentano come la palla
    // NATPF: tutto il tempo del fotogramma in passi uguali ≤ FIXED_DT (natpf_skill.physicsSteps), niente resto accumulato
    for (let k = 0, s = NS.physicsSteps(t * i, L.FIXED_DT); k < s.n; k++) this._stepPhysics(s.h);
    this.natpfReplay && this.natpfReplay.record(t * i); // NATPF moviola: il punto in corso
    this._natpfGuestFrame(e, t * i); // NATPF 1v1: sul P2 palla disegnata e attori recuperano lo scarto dall'host
    if (
      // NATPF 1v1: a partita in corso lo snapshot; con l'host in lobby solo lo stato della lobby (prima andavano al P2
      // anche la dimostrazione del menu e il riscaldamento)
      (this.versus?.active &&
        this.roomId &&
        this.roomId !== "default" &&
        this.playerRole === "p1" &&
        this.elapsedTime - this.lastSyncSentAt >= (this._versusInMatch() ? VERSUS.matchEvery : VERSUS.lobbyEvery) &&
        ((this.lastSyncSentAt = this.elapsedTime), this._broadcastMultiplayerSnapshot()),
      this._updatePlayerAnimation(this.player, ea),
      this.isDoubles && this._updatePlayerAnimation(this.playerPartner, ea),
      this._updatePlayerAnimation(this.opponent, ea),
      this.isDoubles && this._updatePlayerAnimation(this.opponentPartner, ea),
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
    // NATPF B18 (D6): fuori dallo scambio (pausa tra i punti, servizio, moviola) chi gioca recupera la stanchezza
    (this.phase === "RALLY" && this.ball.inPlay) || NS.fatigueRest(this, e);
    if (this.natpfReplay && this.natpfReplay.step(e)) return (this.phaseTimer += e), void 0; // NATPF moviola dell'ultimo punto
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
      // NATPF: gesto debole in attesa della battuta vera, che non è arrivata entro serveWait dopo il colmo: vale lui
      if (this.natpfWeakServe && this.ball.vel.y / L.GRAVITY < -NI.WEAK.serveWait) {
        const w = this.natpfWeakServe;
        (this.natpfWeakServe = null), this._executeServeHit(this.player, { ...w.evt, natpfServeTau: w.tau });
        return;
      }
      // … e quello del Player 2 al suo servizio
      if (this.natpfWeakServeP2 && this.ball.vel.y / L.GRAVITY < -NI.WEAK.serveWait) {
        const w = this.natpfWeakServeP2;
        (this.natpfWeakServeP2 = null), this._executeServeHit(this.opponent, { ...w.evt, natpfServeTau: w.tau });
        return;
      }
      if (
        ((this.score.server === "opponent" && !this.isMultiplayer) || this.autoPlayMode) &&
        this.ball.vel.y <= 0.25 &&
        this.ball.pos.y >= 2.75
      ) {
        const i = this.score.server === "player" ? this.player : this.opponent;
        // NATPF: servizio vario della CPU (Leggenda: natpf_legend.js; Pro: natpf_skill.cpuServeEvent)
        this._executeServeHit(i, i === this.opponent && NL.isLegend(this) ? NL.legendServe(this) : i === this.opponent && !this.autoPlayMode ? NS.cpuServeEvent(this) : { timing: "PERFECT" });
        return;
      }
      // lancio senza battuta: la palla ricade e si torna al servizio. NATPF B18: la palla torna nella mano di chi serve
      // (prima restava ferma a mezz'aria, 0,95 m, dove era scesa); il messaggio lo danno il grande schermo e il telefono
      // (natpf_serve_coach.js), poi si rilancia
      if (this.ball.pos.y <= 0.95 && this.ball.vel.y < 0) {
        const sv = this.score.server === "player" ? this.player : this.opponent;
        (this.phase = "SERVE_STANCE"),
          (this.phaseTimer = 0),
          this.ball.vel.set(0, 0, 0),
          this.ball.pos.set(sv.pos.x + (sv.sideSign > 0 ? -0.28 : 0.28), 1.12, sv.pos.z - sv.sideSign * 0.27),
          (this.pendingServeSwing = null),
          (this.natpfWeakServe = null),
          (this.natpfWeakServeP2 = null),
          // segnale esplicito per natpf_serve_coach (revisione B18: prima ogni SERVE_TOSS → SERVE_STANCE, anche una
          // partita ricominciata con la palla in aria, era un «lancio a vuoto»)
          (this.natpfTossMisses = (this.natpfTossMisses || 0) + 1);
      }
      return;
    }
    if (this.phase === "POINT_OVER") {
      // NATPF B18.2 (D11): sul computer del P2 il punto lo chiude l'host (snapshot, senza _awardPoint): anche lì nessuno
      // corre sul posto nella pausa
      this.playerRole === "p2" && this.isMultiplayer && this._natpfStandStill();
      // NATPF 1v1: il punto successivo lo prepara l'host (snapshot), non il computer del P2
      this.phaseTimer > 2.15 && !(this.playerRole === "p2" && this.isMultiplayer) && this._setupPointServe({ showBanner: !0 });
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
        this.ballTrail.pushPoint(this._natpfBallDrawPos()), // NATPF 1v1: la scia segue la palla disegnata (sul P2 con lo scarto)
        // NATPF B18 (revisione R4): niente scintille in volo dietro al servizio della CPU (il sorteggio resta, così la
        // sequenza casuale non cambia)
        this.ball.isPowerShot && Math.random() < 0.45 && !this._natpfQuietCpuServe() && this._spawnStarBurst(this.ball.pos, 1),
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
        this._natpfReplanMissed(), // NATPF: schiacciata o volée mancata, piano dopo il rimbalzo (C7)
        this._stepActorFootwork(this.player, e),
        this._stepActorFootwork(this.playerPartner, e),
        this._stepActorFootwork(this.opponent, e),
        this._stepActorFootwork(this.opponentPartner, e),
        this.ball.lastHitter === "player" && this.ball.pos.z < -2)
      )
        if (this.isMultiplayer) {
          const s = Math.hypot(this.ball.pos.x - this.opponent.pos.x, this.opponent.pos.z - this.ball.pos.z), // NATPF: prima z − z della palla (sempre 0)
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
          // NATPF racchetta virtuale: lo swing del P2 in attesa si gioca quando la palla arriva al suo punto d'impatto (C2)
          if (this.pendingP2Swing && this.pendingP2Swing.natpfWindow) {
            if (NI.resolvePending(this, this.opponent)) return;
          } else if (this.pendingP2Swing)
            if (this.elapsedTime > this.pendingP2Swing.expiresAt) {
              // NATPF: gesto del P2 troppo in anticipo: swing a vuoto visibile, messaggio e diagnostica come per il P1
              const ps = this.pendingP2Swing;
              (this.pendingP2Swing = null), ps.prep && this._natpfEarlyWhiff(ps);
            }
            else {
              const p = h === this.opponentPartner ? 3.95 : 4.65;
              if (r >= -0.85 && r <= 0.65 && Math.hypot(l, r) <= p && this.ball.pos.y < 3.4) { // NATPF: palle alte anche per il P2, come per il P1 (prima 2,35 m)
                const c = this.pendingP2Swing.evt;
                (this.pendingP2Swing = null), this._attemptP2RallyStrike(c);
                return;
              }
            }
          // NATPF: palla passata oltre la finestra in ritardo dietro il P2, come per il P1 (C18: prima fissa a 15,6 m)
          if (this.ball.pos.z < -Math.max(15.6, -this.opponent.pos.z + 2.8)) {
            this._awardPoint("player", "Nice Shot!");
            return;
          }
        } else {
          const s = !["pro", "leggenda"].includes(this.matchConfig.difficulty),
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
            if (l <= h) NL.legendLetGo(this) || this._executeOpponentReturn(this.opponent); // NATPF Leggenda: le palle che vede fuori le lascia passare
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
        // NATPF racchetta virtuale: lo swing in attesa si gioca quando la palla arriva al punto d'impatto
        if (this.pendingUserSwing && this.pendingUserSwing.natpfWindow) {
          if (NI.resolvePending(this, h)) return;
        } else if (this.pendingUserSwing)
          if (this.elapsedTime > this.pendingUserSwing.expiresAt) {
            // NATPF: gesto troppo in anticipo, la palla non è arrivata in tempo: lo swing a vuoto si vede e si sente
            // (prima il gesto spariva senza nessun segno, dopo una racchetta che si caricava e basta)
            const ps = this.pendingUserSwing;
            (this.pendingUserSwing = null), ps.prep && this._natpfEarlyWhiff(ps);
          } else {
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
        // NATPF: palla passata solo oltre la finestra d'impatto in ritardo dietro chi gioca (fino a 2,8 m dietro il punto
        // d'impatto): dal 23/10 si arretra fino a 14,6 m per colpire vicino al colmo, e il limite fisso di 15,6 m tagliava
        // i colpi appena in ritardo (punti persi senza colpire)
        else if (this.ball.pos.z > Math.max(15.6, this.player.pos.z + 2.8)) {
          this._awardPoint("opponent", this.isMultiplayer ? "Nice Shot!" : "Point");
          return;
        }
      }
    }
  }
  // NATPF: swing a vuoto di un gesto troppo in anticipo (lo swing in attesa è scaduto prima che arrivasse la palla)
  _natpfEarlyWhiff(ps) {
    const a = ps.actor || this.player, ev = ps.evt || {}, p2 = a === this.opponent || a === this.opponentPartner; // NATPF: anche il Player 2 (C2)
    a.userData && (a.userData.natpfPrep = null);
    // B20 (audit B19, punto 18): chi ha fatto il gesto ed è andato a vuoto su questa palla, per il banner del punto.
    // Non per la palla fuori portata (revisione): lì è un vincente dell'altro, il gesto non poteva prenderla
    ps.natpfWhy !== "portata" && (this.natpfLastWhiff = { side: p2 ? "opponent" : "player", stroke: this.ball.rallyStrokeCount });
    this.racketKinematics &&
      this.racketKinematics.triggerSwing(a, { shotType: String(ev.shotType || "topspin").toLowerCase(), side: ev.side, speed: Number(ev.speed || 1.15), timing: "early", dirX: Number(ev.dirX || 0) });
    // NATPF racchetta virtuale: perché è a vuoto (troppo presto, troppo tardi, palla fuori portata)
    const why = ps.natpfWhy, grade = (p2 ? "P2 " : "") + (why === "tardi" ? "TOO LATE! \u2022 WHIFF" : why === "portata" ? "OUT OF REACH \u2022 WHIFF" : "VERY EARLY \u2022 WHIFF"),
      G = this._projectToScreen(a.pos.clone().add(new o.Vector3(0, 2.35, 0)));
    this.hud.showTimingPopup({ grade, detail: why === "tardi" ? "TOO LATE" : why === "portata" ? "BALL TOO FAR" : "TOO EARLY", screenPos: G, durationMs: 750 }),
      this.motionController &&
        this.motionController.triggerHapticFeedback &&
        this.motionController.triggerHapticFeedback({ role: p2 ? "p2" : "p1", kind: "whiff", grade, shotType: (p2 ? this.p2SelectedShotType : this.selectedShotType) || "TOPSPIN", speedKmh: 0, intensity: 0.65 });
  }
  // NATPF: gesto debole in anticipo che non ha colpito (il colpo vero non è arrivato): niente swing a schermo. Solo la
  // diagnostica lo vede (evento «vuoto» con il motivo «debole»)
  _natpfWeakDropped(ps) {
    const a = ps?.actor || this.player;
    a?.userData && (a.userData.natpfPrep = null);
  }
  _stepActorFootwork(e, t) {
    if (NL.legendStep(this, e, t)) return; // NATPF Leggenda: la CPU accelera e frena, niente velocità istantanea
    if (NS.cpuStep(this, e, t)) return; // NATPF: anche a Casual e Pro (natpf_skill.js), più lenta che a Leggenda
    const i = e.targetPos.x - e.pos.x,
      a = e.targetPos.z - e.pos.z,
      s = Math.hypot(i, a);
    // NATPF: stanchezza di chi gioca dopo tanta corsa laterale (solo in partita) e palla super potente in arrivo
    // (natpf_skill.moveFactor, fatigueStep)
    const natpfHuman = e === this.player || (e === this.opponent && (this.isMultiplayer || !!this.versus?.active)),
      natpfMatch = natpfHuman && !this.autoPlayMode && !this.natpfUi?.training?.active && !this.natpfUi?.events?.active;
    natpfMatch && NS.fatigueStep(this, e, { vx: e.vel.x, speed: e.vel.length(), dt: t, inPoint: this.phase === "RALLY" || this.phase === "SERVE_TOSS" });
    if (s > 0.08) {
      const n = Math.min(s, e.maxSpeed * (natpfHuman ? NS.moveFactor(this, e) : 1) * t),
        h = (i / s) * (n / t),
        r = (a / s) * (n / t);
      e.vel.set(h, 0, r), (e.pos.x += (i / s) * n), (e.pos.z += (a / s) * n), (e.stridePhase += n * 4.4);
    } else e.vel.set(0, 0, 0);
  }
  _awardPoint(e, t = "") {
    // NATPF 1v1: sul computer del P2 punti, game e fine partita li decide solo l'host (arrivano con gli snapshot).
    // Prima il P2 simulava per conto suo e poteva dare punti diversi o chiudere la partita da solo
    if (this.playerRole === "p2" && this.isMultiplayer) {
      (this.ball.inPlay = !1), (this.pendingP2Swing = null), (this.pendingServeSwing = null);
      return;
    }
    const wf = this.natpfLastWhiff; // B20: colpo a vuoto di questo punto (vale solo per questo punto)
    this.natpfLastWhiff = null;
    NL.legendPointEnd(this, e); // NATPF Leggenda: il modello dell'avversario impara da come finisce il punto
    (this.phase = "POINT_OVER"),
      (this.phaseTimer = 0),
      (this.ball.inPlay = !1),
      this._natpfStandStill(), // NATPF B18.2 (D11): a fine punto nessuno corre più sul posto
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
      s = this.score.opponentPoints,
      // NATPF B18: chi vince il game (classico: 2 punti di scarto; formato in fiera: punto decisivo sul 40-40) e chi batte
      // il punto dopo (classico: cambia solo a fine game, come prima; fiera: A, B B, A A… come nel tie-break)
      fair = !!this.score.fair,
      gw = NF.gameWinner(a, s, { fair }),
      sv = NF.nextServe({ server: this.score.server, gameServer: this.score.gameServer ?? this.score.server, played: a + s, gameOver: !!gw, fair });
    (this.score.server = sv.server), (this.score.gameServer = sv.gameServer);
    if (gw) {
      if (
        (gw === "player" ? (this.score.playerGames += 1) : (this.score.opponentGames += 1),
        (this.score.playerPoints = 0),
        (this.score.opponentPoints = 0),
        (this.score.deuceSide = !0),
        this._syncScoreboardHUD(),
        this.score.playerGames >= this.matchConfig.gamesToWin ||
          this.score.opponentGames >= this.matchConfig.gamesToWin)
      ) {
        const p = this.score.playerGames > this.score.opponentGames;
        this.phase = "MATCH_OVER";
        // NATPF: chi ha vinto la partita, dal lato di chi guarda (natpf_point_call.js; prima «Game!» se vinceva la CPU)
        const gc = NPC.gameCall({ winner: p ? "player" : "opponent", ...NPC.callContext(this), games: { player: this.score.playerGames, opponent: this.score.opponentGames }, match: !0 });
        // voce di fine partita per chiunque vinca (B18: prima «Game, set and match» solo se vinceva il Player 1, altrimenti
        // «Game»; anche per il Player 2 della sfida tra due computer, che la riceve con il messaggio)
        this._recordBannerBroadcast(gc.text, gc.style, gc.subText, { kind: "match", winner: p ? "player" : "opponent", games: { player: this.score.playerGames, opponent: this.score.opponentGames }, voice: NPC.MATCH_VOICE }),
          this.hud.showCenterBanner(gc.text, { style: gc.style, subText: gc.subText, durationMs: 2600 }),
          this.audioEngine &&
            (this.audioEngine.playMusicForState("victory"),
            this.audioEngine.announceScore(NPC.MATCH_VOICE)),
          setTimeout(() => {
            // NATPF: solo se la partita è ancora finita lì (prima, tornando al menu entro 1,8 s, la schermata finale
            // compariva sopra il menu)
            this.phase === "MATCH_OVER" &&
              !this.autoPlayMode &&
              this.hud.showVictoryModal({
                playerWon: this.playerRole === "p2" ? !p : p,
                playerGames: this.score.playerGames,
                opponentGames: this.score.opponentGames,
                view: this._natpfMatchEndView(p ? "player" : "opponent"),
              });
          }, 1800);
        return;
      }
      // NATPF: di chi è il game, dal lato di chi guarda (natpf_point_call.js)
      const gg = { player: this.score.playerGames, opponent: this.score.opponentGames },
        gl = NPC.gameCall({ winner: gw, ...NPC.callContext(this), games: gg });
      this._recordBannerBroadcast(gl.text, gl.style, gl.subText, { kind: "game", winner: gw, games: gg, voice: "Game" }),
        this.hud.showCenterBanner(gl.text, { style: gl.style, subText: gl.subText, durationMs: 1800 }),
        this.audioEngine && this.audioEngine.announceScore("Game");
      return;
    }
    this._syncScoreboardHUD();
    // NATPF: servizio vincente non toccato dall'avversario = ace (banner e voce)
    t === "Nice Shot!" && this.ball.rallyStrokeCount === 1 && (t = "Ace!");
    // NATPF: in grande chi vince il punto, sotto chi ha sbagliato (o perché) e il punteggio dal proprio lato
    // (natpf_point_call.js). Prima il punteggio con «Fuori» sotto: non si capiva chi avesse sbagliato
    const { bannerScoreText: n, playerScoreText: ps, opponentScoreText: os, deciding: dp } = this._formatCurrentScore(),
      sc = dp ? { player: ps, opponent: os, deciding: !0 } : { player: ps, opponent: os }, // NATPF B18: «Punto decisivo»
      // B20: nello stesso schermo «Colpo a vuoto di Marco» se chi ha perso il punto ha fatto il gesto su questa palla
      // (prima «Vincente di Giulia» anche così); la voce e il motivo del motore restano quelli di prima
      pc = NPC.pointCall({ winner: e, why: t, ...NPC.callContext(this), score: sc, whiff: !!wf && wf.side !== e && wf.stroke === this.ball.rallyStrokeCount });
    this._recordBannerBroadcast(pc.text, pc.style, pc.subText, { kind: "point", winner: e, why: t, score: sc, voice: n }),
      this.hud.showCenterBanner(pc.text, { style: pc.style, subText: pc.subText, durationMs: 1800 }),
      this.audioEngine &&
        (t === "Out" || t === "Net" || t === "Nice Shot!" || t === "Ace!"
          ? (this.audioEngine.playVoiceCallout(t, { clearQueue: !0 }),
            this.audioEngine.announceScore(n, { delayMs: 680 }))
          : this.audioEngine.announceScore(n));
  }
  // NATPF: schermata finale dal lato di chi guarda, con i nomi (natpf_point_call.matchEndView, B18)
  _natpfMatchEndView(winner, score = this.score) {
    return NPC.matchEndView({
      winner,
      games: { player: score.playerGames, opponent: score.opponentGames },
      ...NPC.callContext(this),
      nickname: this.natpfUi?.events?.nickname || "",
      multiplayer: !!this.isMultiplayer && !this.natpfSplit?.active,
      doubles: !!this.isDoubles,
    });
  }
  _recordBannerBroadcast(e, t = "style-score", i = "", call = null) {
    (this.bannerSeq += 1),
      (this.lastBannerBroadcast = { seq: this.bannerSeq, text: e, style: t, subText: i, ...(call ? { call } : {}) });
  }
  _broadcastMultiplayerSnapshot() {
    if (!this._versusInMatch()) {
      // NATPF 1v1 (B9): con la racchetta dell'host (pronta o no), per la scheda del Player 1 sul computer del P2
      // NATPF B15: e la mano dell'host (p1Hand), perché il P2 lo veda mancino già dalla lobby (un P2 di prima la ignora)
      fetch("/api/match/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room: this.roomId, snapshot: { lobby: !0, fmt: this.matchFormat.id, gamesToWin: this.matchConfig.gamesToWin, host: this.natpfUi?.versus?.hostInfo?.() || null, p1Hand: this._natpfHostHand() } }) }).catch(() => {});
      return;
    }
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
        gamesToWin: this.matchConfig.gamesToWin,
        spin: [Number(this.ball.spin.x.toFixed(2)), Number(this.ball.spin.y.toFixed(2))],
        bounces: this.ball.bounceCountOnCurrentSide,
        p1Hand: this._natpfHostHand(), // NATPF B15: mano dell'host, per il suo personaggio sul computer del P2
      };
    fetch("/api/match/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: this.roomId, snapshot: t }),
    }).catch(() => {});
  }
  // NATPF B15 (mancini): mano dell'host (una sola per tutto il gioco, natpf_hand.js)
  _natpfHostHand() {
    return this.natpfUi?.hand?.hand === "left" ? "left" : "right";
  }
  // NATPF B15: mano del Player 2 sull'host (piano d'intercetto, natpf_impact.handOf; personaggio specchiato e palla del
  // servizio nella mano libera, natpf_hand.js). Dal relay appena il P2 è collegato (p2Hand) e da ogni suo colpo
  _natpfSetP2Hand(h) {
    const hand = h === "left" ? "left" : "right";
    this.natpfP2Hand = hand;
    this.natpfUi?.hand?.mirrorRemote?.(this.opponent, hand);
  }
  // NATPF B15: fine della sessione con un altro giocatore (stesso schermo, sfida in rete): la sua mano non vale più.
  // Prima restava: il P2 del 1v1 seguente aveva il piano da mancino fino al primo colpo, la CPU restava specchiata
  _natpfClearP2Hand() {
    this.natpfP2Hand = null;
    this.natpfUi?.hand?.mirrorRemote?.(this.opponent, "right");
  }
  _handleRoomStateUpdate(e = {}) {
    if (!e) return;
    // NATPF B15: host in una sfida 1v1 in rete: la mano del P2 dal relay, prima del suo primo colpo (relay di prima: nessuna)
    this.playerRole !== "p2" && (e.p2Hand === "left" || e.p2Hand === "right") && this.versus?.active && !this.versus.local && this._natpfSetP2Hand(e.p2Hand);
    // NATPF 1v1: stato del Player 2 (stanza inesistente, chiusa, lobby dell'host, snapshot)
    const G = this.playerRole === "p2" ? (this.versusGuest ||= { invalidSince: 0, closed: !1, lobby: !0, lastSnapshotAt: 0, everLinked: !1, gate: null }) : null;
    if (G && e.invalidRoom) {
      G.invalidSince ||= performance.now();
      return;
    }
    G && (G.invalidSince = 0);
    const t = !!(this.roomStatus.p2Online || this.roomStatus.p2Phone),
      i = !!(this.roomStatus.p1Online || this.roomStatus.p1Phone),
      a = !!(e.p2Online || e.p2?.connected),
      s = !!(e.p1Online || e.p1?.connected);
    if (
      (a && !t
        ? // NATPF 1v1: il P2 che si collega non cambia più il livello della partita dell'host (lo fa la stanza, una volta)
          (this.versus?.active &&
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
        p2Ready: !!e.p2Ready,
        p2Hold: e.p2Hold || null, // NATPF 1v1: perché il P2 non può giocare (natpf_versus.p2HoldWhy)
        p1Phone: !!e.p1?.connected,
        p2Phone: !!e.p2?.connected,
        isMultiplayer: !!(this.isMultiplayer || (this.roomId && this.roomId !== "default")),
        inRally: this.phase === "RALLY",
        tunnelUrl: e.tunnelUrl || this.roomStatus.tunnelUrl || "",
        urls: e.urls || this.roomStatus.urls || null,
      }),
      this.hud && this.hud.updateMultiplayerRoomInfo && this.hud.updateMultiplayerRoomInfo(this.roomStatus),
      G &&
        e.snapshot &&
        // NATPF 1v1: contatore con l'epoca del relay (se il relay riparte non si scartano più tutti gli snapshot)
        seqGate((G.gate ||= { epoch: null, last: this.lastAppliedSnapshotSeq || 0 }), { epoch: e.epoch ?? null, seq: e.snapshotSeq }).ok)
    ) {
      this.lastAppliedSnapshotSeq = e.snapshotSeq;
      const n = e.snapshot;
      G.everLinked = !0;
      n.fmt && n.fmt !== this.matchFormat.id && this.setMatchFormat(n.fmt);
      n.gamesToWin && (this.matchConfig.gamesToWin = n.gamesToWin);
      // l'host ha chiuso la stanza o è in lobby: niente partita da mostrare
      // (B15: anche la mano dell'host non vale più: il suo personaggio torna destro)
      if (n.closed) { G.closed = !0; G.lobby = !0; this.natpfUi?.hand?.mirrorRemote?.(this.player, "right"); return; }
      G.closed = !1;
      // NATPF B15: mano dell'host (lobby e partita): il suo personaggio specchiato se è mancino (host di prima: nessuna)
      (n.p1Hand === "left" || n.p1Hand === "right") && this.natpfUi?.hand?.mirrorRemote?.(this.player, n.p1Hand);
      G.lastSnapshotAt = performance.now();
      if (n.lobby) {
        G.lobby = !0;
        G.host = n.host || null; // NATPF 1v1 (B9): racchetta dell'host (natpf_versus.hostInfo); null con un host di prima
        return;
      }
      // host in pausa (o in attesa del P2): la partita resta com'è, il collegamento è vivo; hold: perché è ferma
      // (natpf_versus.pauseNotice), il P2 lo vede sopra il campo
      if (n.paused) {
        G.lobby = !1;
        G.hold = n.hold || {};
        n.score && ((this.score = { ...this.score, ...n.score }), this._syncScoreboardHUD());
        return;
      }
      const wasOver = this.phase === "MATCH_OVER";
      (G.lobby = !1), (G.hold = null);
      n.phase &&
        n.phase !== "TITLE" &&
        (this.phase === "TITLE" && this.hud.hideTitleModal(),
        (this.phase = n.phase),
        // NATPF 1v1: anche il tempo della fase (prima il P2 teneva il suo e preparava il servizio per conto suo)
        typeof n.phaseTimer == "number" && (this.phaseTimer = n.phaseTimer),
        (this.cameraMode = n.cameraMode || this.cameraMode)),
        // NATPF 1v1: fine partita decisa dall'host → schermata finale anche sul P2 (prima solo il banner)
        n.phase === "MATCH_OVER" &&
          !wasOver &&
          n.score &&
          setTimeout(() => this.phase === "MATCH_OVER" && this.hud.showVictoryModal({ playerWon: n.score.opponentGames > n.score.playerGames, playerGames: n.score.playerGames, opponentGames: n.score.opponentGames, view: this._natpfMatchEndView(n.score.playerGames > n.score.opponentGames ? "player" : "opponent", n.score) }), 1800),
        n.score && ((this.score = { ...this.score, ...n.score }), this._syncScoreboardHUD());
      // NATPF 1v1: palla dell'host. Prima sovrascriveva sempre la palla del P2: dopo un suo colpo locale gli snapshot
      // fatti dall'host prima di riceverlo la riportavano indietro oltre la racchetta. Ora quella palla si ignora (per al
      // massimo GV.GUEST_VIEW.holdMs); applicata, la fisica è dell'host e la palla disegnata recupera lo scarto
      // (natpf_guest_view.js). Fase, punteggio, banner e attori si applicano sempre
      const V = (this.natpfGuestView ||= GV.createGuestView()), now = performance.now();
      GV.noteAge(V.stats, e.snapshotAgeMs);
      const held = !!n.ball && GV.holdBall(V.hit, n.ball, { now, phase: n.phase });
      // snapshot che conferma il colpo locale: va riconosciuto prima di azzerare il blocco (la palla dell'host è indietro
      // del ritardo del colpo: la palla disegnata rallenta invece di tornare verso la racchetta, GV.applyBall)
      const confirm = !held && GV.confirmsHit(V.hit, n.ball);
      n.ball && !held && (V.hit = null);
      if (held) GV.noteBall(V.stats, { held: !0 });
      else if (n.ball) {
        const prev = { pos: this.ball.pos.clone(), count: this.ball.rallyStrokeCount, hitter: this.ball.lastHitter };
        this.ball.pos.set(n.ball.px, n.ball.py, n.ball.pz),
          this.ball.vel.set(n.ball.vx, n.ball.vy, n.ball.vz),
          (this.ball.inPlay = !!n.ball.inPlay),
          (this.ball.lastHitter = n.ball.lastHitter || this.ball.lastHitter),
          (this.ball.shotType = n.ball.shotType || "TOPSPIN"),
          (this.ball.isPowerShot = !!n.ball.isPowerShot),
          (this.ball.rallyStrokeCount = Number(n.ball.rallyStrokeCount || 0)),
          Array.isArray(n.spin) && this.ball.spin.set(Number(n.spin[0]) || 0, Number(n.spin[1]) || 0, 0),
          typeof n.bounces == "number" && (this.ball.bounceCountOnCurrentSide = n.bounces),
          this.ballTrail.setStyle(this.ball.shotType, this.ball.isPowerShot);
        GV.noteBall(V.stats, GV.applyBall(V, prev, { pos: this.ball.pos, count: this.ball.rallyStrokeCount, hitter: this.ball.lastHitter }, { confirm }));
      }
      const report = GV.takeReport(V, now);
      report && this.natpfGuestReport && this.natpfGuestReport(report);
      const h = (r, l) => {
        if (!l) return;
        // NATPF 1v1: prima l'attore saltava al 65% verso la posizione dell'host a ogni snapshot (uno scatto ogni 50 ms);
        // ora lo scarto si recupera un po' a ogni fotogramma (_natpfGuestFrame), salto netto solo se è lontano
        const fx = GV.actorFix(r.pos, l);
        fx.snap ? ((r.pos.x = l.px), (r.pos.z = l.pz), (r.natpfNetFix = null)) : (r.natpfNetFix = fx.fix);
        l &&
          (r.targetPos.set(l.tx, 0, l.tz),
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
          // NATPF: messaggio ricomposto dal lato del Player 2 (chi vince il punto e perché, natpf_point_call.js)
          (n.natpfCall = NPC.callFromBroadcast(this, n.banner)),
          this.hud.showCenterBanner(n.natpfCall.text, {
            style: n.natpfCall.style || "style-score",
            subText: n.natpfCall.subText || "",
            durationMs: 1700,
          }),
          this.audioEngine))
      ) {
        // NATPF: voce dal motivo e dal punteggio dell'host (il testo del messaggio ora è «Punto tuo»…)
        const r = n.banner.call?.why || n.banner.subText || "", vt = n.banner.call?.voice || n.banner.text;
        r === "Out" || r === "Net" || r === "Nice Shot!" || r === "Ace!" // NATPF: anche l'ace
          ? (this.audioEngine.playVoiceCallout(r, { clearQueue: !0 }),
            this.audioEngine.announceScore(vt, { delayMs: 680 }))
          : this.audioEngine.announceScore(vt);
      }
    }
  }
  _formatCurrentScore() {
    const e = this.score.playerPoints,
      t = this.score.opponentPoints;
    // NATPF B18: formato in fiera, 40-40 = punto decisivo: niente «Parità» sui tabelloni (restano 40-40); la voce dice
    // «Deuce» come l'arbitro nel tennis con il punto decisivo, il banner del punto scrive «Punto decisivo»
    if (NF.isDecidingPoint(e, t, { fair: this.score.fair }))
      return { playerScoreText: "40", opponentScoreText: "40", deuceLabel: null, bannerScoreText: "Deuce", deciding: !0 };
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
    // NATPF B18: formato in fiera. Sul 40-40 «Deciding Point» (HUD: «Punto decisivo»); niente «Break Point», perché il
    // servizio passa ogni due punti e il game non è di chi batte
    const fair = !!this.score.fair;
    if (NF.isDecidingPoint(this.score.playerPoints, this.score.opponentPoints, { fair })) return "Deciding Point";
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
          : this.score.server === "player" && !fair
            ? "Break Point"
            : "Game Point"
        : null;
  }
  _syncScoreboardHUD() {
    const e = this._formatCurrentScore();
    this.natpfUi && this.natpfUi.onScore && this.natpfUi.onScore(this.score, this.matchConfig.gamesToWin);
    // NATPF: punteggio del game anche sui segnapunti arancioni dell'arena, prima quello di chi serve come nel tennis
    // (diagnostica del 30/10, C21: era sempre prima quello dell'host, «15-0» nel game servito dal P2 sotto 0-15)
    this.natpfArena.setScore(
      e.deuceLabel ||
        (this.score.server === "opponent"
          ? `${e.opponentScoreText}-${e.playerScoreText}`
          : `${e.playerScoreText}-${e.opponentScoreText}`),
    );
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
        server: this.score.server, // NATPF: chi batte (posa del lancio del servizio, racket_kinematics; prima mai passato)
        ball: this.ball,
        elapsedTime: this.elapsedTime,
        liveInput: i,
      });
    }
    NL.legendReachPose(this, e, t); // NATPF Leggenda: racchetta, braccio e corpo verso la palla lontana (prima del corpo, che fa seguire la mano)
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
    this.natpfArena.update(this.elapsedTime, this.cheerEnergy), this.natpfPhone && this.natpfPhone.update(), this.natpfPhone2 && this.natpfPhone2.update();
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
  // NATPF B18 (revisione R4): la palla in volo è il servizio della CPU (primo colpo, battuto dall'avversario, non nella
  // sfida tra due persone): niente effetti da colpo eccezionale
  _natpfQuietCpuServe() {
    return this.ball.rallyStrokeCount === 1 && this.ball.lastHitter === "opponent" && !this.isMultiplayer;
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
  // NATPF 1v1: dove si disegna la palla. Sul P2 la fisica dell'host più lo scarto che decade (natpf_guest_view.js);
  // sull'host e nello stesso schermo la palla stessa
  _natpfBallDrawPos() {
    const off = this.natpfGuestView?.off;
    if (this.playerRole !== "p2" || !off || (!off.x && !off.y && !off.z)) return this.ball.pos;
    return (this._natpfDrawTmp ||= new o.Vector3()).set(this.ball.pos.x + off.x, this.ball.pos.y + off.y, this.ball.pos.z + off.z);
  }
  // NATPF 1v1: un fotogramma sul P2 (dt in secondi): decade lo scarto della palla disegnata, gli attori fanno un passo
  // verso la posizione dell'host. Sull'host e nello stesso schermo niente. physDt: tempo della fisica nel fotogramma
  // (fermo del colpo, rallentatore): lo scarto in avanti si recupera al più al ritmo della palla, che così non torna
  // mai indietro (natpf_guest_view.decayOffset)
  _natpfGuestFrame(dt, physDt = dt) {
    const V = this.natpfGuestView;
    if (this.playerRole !== "p2" || !V) return;
    const ms = dt * 1000;
    GV.decayOffset(V.off, ms, { vel: this.ball.vel, physMs: physDt * 1000 });
    for (const a of [this.player, this.playerPartner, this.opponent, this.opponentPartner]) {
      if (!a || !a.natpfNetFix) continue;
      const s = GV.actorStep(a.natpfNetFix, ms);
      (a.pos.x += s.step.x), (a.pos.z += s.step.z), (a.natpfNetFix = s.fix);
    }
  }
  _updateEffects(e) {
    // NATPF 1v1: palla e ombra dove si disegna la palla (sul P2 la fisica dell'host più lo scarto che decade)
    const bp = this._natpfBallDrawPos();
    // NATPF B22: scia luminosa dietro la palla in gioco (solo disegno; nella moviola la palla non ha velocità: null)
    if (this.natpfBallGlow) {
      const rp = !!this.natpfReplay?.playing;
      this.natpfBallGlow.frame(bp, rp ? null : this.ball.vel.length(), e, rp || (this.phase === "RALLY" && this.ball.inPlay), !!this.ballTrail.power);
    }
    if ((this.ball.mesh && this.ball.mesh.position.copy(bp), this.ballShadowBlob)) {
      (this.ballShadowBlob.position.x = bp.x), (this.ballShadowBlob.position.z = bp.z);
      const t = o.MathUtils.clamp(1.15 - bp.y * 0.16, 0.45, 1.15);
      this.ballShadowBlob.scale.setScalar(t),
        (this.ballShadowBlob.material.opacity = o.MathUtils.clamp(0.88 - bp.y * 0.14, 0.28, 0.88));
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
    else if (e === "REPLAY_CAM")
      this.natpfReplay?.playing
        ? ((NR.c = this.natpfReplay.camera()), t.set(...NR.c.pos), i.set(...NR.c.look)) // NATPF moviola: di lato, segue la palla
        : (t.set(2.35, 1.48, 4.15), i.set(-1.45, 0.95, -1.35));
    else {
      // camera di gioco dietro chi gioca qui (P2: dall'altra metà). NATPF (diagnostica del 30/10, C16): chi gioca oltre
      // ~12,5 m dalla rete, la camera arretra un poco e lo sguardo scende verso di lui, in modo morbido (natpf_camera_depth.js)
      const p2 = this.playerRole === "p2",
        a = p2 ? this.opponent : this.player,
        side = p2 ? -1 : 1,
        d = deepCamShift(actorDepth(a, side));
      t.set(a.pos.x * 0.16, 7.8, side * (22.8 + d.back)), i.set(this.ball.pos.x * 0.12, 0.35, side * (1.8 + d.look));
    }
    return { targetPos: t, targetLook: i };
  }
  _snapCameraImmediate() {
    const { targetPos: e, targetLook: t } = this._computeTargetCameraPose();
    this._updateCameraFov(), this._frameThirdPerson(e, t);
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
      this._frameThirdPerson(t, i),
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
  // NATPF: campo visivo più ampio in prima persona (come viewpoint.js di NATPF); in terza i 45° del motore base dal 16:9
  // in su, più ampi sugli schermi più stretti (B8, natpf_camera.js thirdPersonFrame). Con lo split screen ogni metà ha
  // la sua camera (natpf_split.js, che riscrive campo visivo e forma a ogni disegno): qui non si tocca
  _updateCameraFov() {
    if (this.natpfSplit?.shown) return;
    const e = this._isFirstPersonActive() ? firstPersonFov(this.camera.aspect) : this._thirdPersonFrame().fov;
    Math.abs(this.camera.fov - e) > 0.01 && ((this.camera.fov = e), this.camera.updateProjectionMatrix());
  }
  // NATPF (B8): inquadratura della terza persona per la forma dell'area di gioco (viewport(), non camera.aspect che lo
  // split screen cambia per ogni metà)
  _thirdPersonFrame() {
    const vp = viewport();
    return thirdPersonFrame(vp.w / vp.h);
  }
  // NATPF (B8): sugli schermi più stretti del 4:3 la camera della partita (servizio e scambio) si allontana, restando
  // davanti al maxischermo del proprio fondo (natpf_camera.js frameMatchCamera). Si sposta la posa obiettivo, prima
  // dell'inseguimento morbido, così i cambi di camera restano morbidi. deep: lo spostamento C16 che
  // _computeTargetCameraPose ha messo nella posa dello scambio (al servizio nessuno)
  _frameThirdPerson(pos, look) {
    const mode = this.manualCameraOverride || this.cameraMode;
    if (this._isFirstPersonActive() || !isMatchCamera(mode)) return;
    const vp = viewport(),
      p2 = this.playerRole === "p2",
      side = p2 ? -1 : 1,
      deep = mode === "SERVE_CAM" ? null : deepCamShift(actorDepth(p2 ? this.opponent : this.player, side));
    frameMatchCamera(pos, look, { aspect: vp.w / vp.h, side, deep });
  }
  _projectToScreen(e) {
    const t = e.clone().project(this.camera),
      i = t.z >= -1 && t.z <= 1,
      a = (t.x * 0.5 + 0.5) * viewport().w,
      s = (-t.y * 0.5 + 0.5) * viewport().h;
    return { x: a, y: s, visible: i };
  }
  _updateProjectedHUD() {
    const t = this.score.server === "player" ? this.player : this.opponent;
    if (
      (this.phase === "SERVE_STANCE" || this.phase === "SERVE_TOSS") &&
      this.cameraMode !== "REPLAY_CAM" &&
      !this.natpfSplit?.active && // NATPF split screen: chi serve lo dice il tabellone (l'etichetta è di una sola vista)
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
    // NATPF: finestra intera o area del ledwall (natpf_screen.js)
    const vp = viewport();
    if (!this.camera || !this.renderer) return;
    // NATPF (B8): densità dei pixel del monitor in uso (spostando la finestra su un monitor con un'altra scala)
    const pr = renderPixelRatio(window.devicePixelRatio);
    this.renderer.getPixelRatio() !== pr && this.renderer.setPixelRatio(pr);
    (this.camera.aspect = vp.w / vp.h),
      this._updateCameraFov(),
      this.camera.updateProjectionMatrix(),
      this.renderer.setSize(vp.w, vp.h),
      (this.natpfBackdropDirty = !0);
    // NATPF (B8): con il menu (inquadratura ferma) o la partita in pausa la camera non si muove da sola: campo visivo e
    // arretramento per la forma nuova subito, non alla ripresa
    (this.natpfBackdrop || this.natpfPaused) && this.player && this.ball && this._snapCameraImmediate();
  }
  // NATPF: sfondo del menu. Prima dietro il menu girava una partita dimostrativa (camera che segue la palla, scie,
  // stelline, pubblico in movimento) disegnata a ogni fotogramma e sfocata con un backdrop-filter sull'intera pagina:
  // sfarfallio e fotogrammi persi nella home. Ora con il menu aperto l'arena è un'inquadratura ferma, ridisegnata solo
  // quando serve (all'ingresso, a ogni ridimensionamento, quando arriva una texture caricata dopo); il gioco non avanza,
  // ma il telefono, l'interfaccia e la lobby della sfida 1v1 continuano a funzionare.
  _natpfBackdropFrame(dt, now = performance.now()) {
    const want = !!this.natpfUi?.menuBackdrop?.();
    if (want !== !!this.natpfBackdrop) {
      this.natpfBackdrop = want;
      want && (this._natpfBackdropPose(), (this.natpfBackdropDirty = !0), (this.natpfBackdropSince = now), (this.natpfBackdropTick = 0));
    }
    if (!want) return !1;
    this.elapsedTime += dt;
    // 1v1: la lobby dell'host continua a mandare il suo stato al Player 2 (prima lo faceva update())
    this.versus?.active &&
      this.roomId &&
      this.roomId !== "default" &&
      this.playerRole === "p1" &&
      this.elapsedTime - this.lastSyncSentAt >= VERSUS.lobbyEvery &&
      ((this.lastSyncSentAt = this.elapsedTime), this._broadcastMultiplayerSnapshot());
    this.natpfPhone && this.natpfPhone.update(), this.natpfPhone2 && this.natpfPhone2.update(), this.natpfUi && this.natpfUi.tick && this.natpfUi.tick(dt);
    // si ridisegna solo quando serve: all'ingresso, a ogni ridimensionamento e quando è arrivata una texture dopo
    // l'ultimo disegno (grafiche dell'arena, _natpfWatchTextures), al più una volta al secondo; poi l'immagine resta
    // quella. Prima si ridisegnava una volta al secondo per 8 s a ogni ingresso nel menu anche con tutte le texture già
    // arrivate (al primo avvio lo sono prima del primo disegno): senza GPU (WebGL in software) ogni disegno costa ~1 s
    // e fermava per 1 s l'interfaccia e le animazioni dei gesti nella lobby dello stesso schermo (44 fps invece di 60).
    // Tempo vero, non quello del gioco (che a fotogrammi lenti avanza meno)
    const tick = Math.floor((now - (this.natpfBackdropSince || 0)) / 1000),
      late = this.natpfTextureArrived && tick !== this.natpfBackdropTick;
    (this.natpfBackdropDirty || late) &&
      ((this.natpfBackdropDirty = this.natpfTextureArrived = !1), (this.natpfBackdropTick = tick), this.render());
    return !0;
  }
  // NATPF: le texture caricate da file (grafiche dell'arena di site/js/tennis/arena.js e del motore: TextureLoader con il
  // gestore predefinito di three) chiedono un ridisegno dello sfondo fermo quando arrivano. Il gestore chiama onProgress
  // dopo che il TextureLoader ha messo l'immagine nella texture (anche dopo un errore); si conserva un onProgress già messo
  _natpfWatchTextures(manager = o.DefaultLoadingManager) {
    if (!manager) return;
    const prev = manager.onProgress;
    manager.onProgress = (...a) => {
      this.natpfTextureArrived = !0;
      typeof prev == "function" && prev.apply(manager, a);
    };
  }
  // NATPF: un fotogramma del ciclo di requestAnimationFrame (dt in s): 'backdrop' | 'paused' | 'play'
  _natpfFrame(dt, now = performance.now()) {
    // con il menu aperto lo sfondo è un'inquadratura ferma dell'arena (_natpfBackdropTick), non più la partita
    // dimostrativa disegnata a ogni fotogramma sotto un blur
    if (this._natpfBackdropFrame(dt, now)) return "backdrop";
    // partita ferma mentre si leggono le istruzioni o si collega il telefono: niente update e disegno solo quando serve
    if (this.natpfPaused) return this._natpfPauseFrame(now), "paused";
    (this.natpfPauseSince = this.natpfPauseDrawnAt = null), this.update(dt), this.render();
    return "play";
  }
  // NATPF: un fotogramma con la partita in pausa (PAUSE_DRAW): true se ha disegnato
  _natpfPauseFrame(now = performance.now()) {
    this.natpfPauseSince == null && (this.natpfPauseSince = now);
    const due =
      this.natpfPauseDrawnAt == null ||
      this.natpfBackdropDirty ||
      now - this.natpfPauseSince < PAUSE_DRAW.settleMs ||
      now - this.natpfPauseDrawnAt >= PAUSE_DRAW.everyMs;
    if (!due) return !1;
    (this.natpfBackdropDirty = !1), (this.natpfPauseDrawnAt = now), this.render();
    return !0;
  }
  // inquadratura del menu: i due giocatori fermi sulle righe di fondo, palla nascosta, camera di gioco dietro il P1
  _natpfBackdropPose() {
    const B = S.BASELINE_Z, still = (a, x, z) => a && (a.pos.set(x, 0, z), a.targetPos.copy(a.pos), a.vel && a.vel.set(0, 0, 0), (a.swingTimer = 0));
    still(this.player, 0.9, B - 0.2), still(this.opponent, -0.9, -B + 0.2);
    this.isDoubles && (still(this.playerPartner, -2.1, 5.4), still(this.opponentPartner, 2.1, -5.4));
    (this.ball.inPlay = !1), this.ball.pos.set(0, -5, 0), this.ball.vel.set(0, 0, 0);
    this.ballTrail && this.ballTrail.clear && this.ballTrail.clear(), this.swingVfx && this.swingVfx.clearAllTrails && this.swingVfx.clearAllTrails();
    (this.pendingUserSwing = null), (this.pendingP2Swing = null), (this.pendingServeSwing = null);
    (this.phase = "POINT_OVER"), (this.phaseTimer = 0), (this.cameraMode = "RALLY_CAM"), (this.cameraTrauma = 0);
    // qualche passo di animazione e di camera senza fisica: pose ferme e inquadratura assestata
    for (let i = 0; i < 24; i++)
      this._updatePlayerAnimation(this.player, 1 / 30),
        this._updatePlayerAnimation(this.opponent, 1 / 30),
        this.isDoubles && (this._updatePlayerAnimation(this.playerPartner, 1 / 30), this._updatePlayerAnimation(this.opponentPartner, 1 / 30)),
        this._updateCameraRig(1 / 30);
    this._updateEffects(0);
  }
  render() {
    // NATPF: varianti di colore e arti dei personaggi, dopo tutte le animazioni del fotogramma
    updateNatpfCharacters(this);
    // NATPF split screen: a partita in corso due viste, P1 a sinistra e P2 a destra (natpf_split.js)
    if (this.natpfSplit && this.natpfSplit.render()) return;
    this.renderer.render(this.scene, this.camera);
  }
}
window.addEventListener("DOMContentLoaded", () => {
  // NATPF: prima del motore, che interroga subito il relay della partita
  const p2p = installNatpfP2p();
  const P = new NatpfTennisEngine();
  (P.natpfP2p = p2p), (P.natpfUi = new NatpfUi(P)), (window.__natpfTennis = P), P.loadAssetsAndStart();
  // NATPF 1v1 senza server: colpo o lancio del P2 arrivato all'host → lettura dello stato subito (C10)
  p2p.onP2Input?.(() => P.motionController?.pollNow?.());
});
