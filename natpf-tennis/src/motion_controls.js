import { WorkerVision, workerVisionAvailable } from "./natpf/webcam_inference.js";
// NATPF: posa continua della mano dalla webcam (racchetta e braccio), vedi src/natpf/webcam_hand_pose.js
import { WebcamHandTracker, handPoseFromLandmarks, handPoseFromFlow } from "./natpf/webcam_hand_pose.js";
// NATPF: colpi dalla traccia della mano (un evento per colpo) e scelta della mano da seguire, vedi src/natpf/webcam_strokes.js
import { createStrokeTracker, pickHand, trackOthers, handPoint, handSize } from "./natpf/webcam_strokes.js";
import { relayedNatpf } from "./natpf/natpf_skill.js";
import { newSwings } from "./natpf/natpf_versus.js";
// NATPF: misure della webcam (camera, inferenza, età del dato) e carico del modello delle mani, vedi src/natpf/webcam_load.js
import { createLoadGovernor, createWebcamStats, WEBCAM_LEVELS } from "./natpf/webcam_load.js";
import { PoseStrokeSource, POSE_INPUT } from "./natpf/webcam_pose_strokes.js";
// NATPF: colpi della webcam dal movimento dell'immagine (rifacimento del 28–29/10), vedi src/natpf/webcam_motion.js
import { createMotionStrokes, grayFromRGBA, swingSpeed, MOTION } from "./natpf/webcam_motion.js";
// NATPF: MediaPipe Hands dal pacchetto offline (npm @mediapipe/hands, servito sotto /assets/); CDN fissato solo di riserva
export const MEDIAPIPE_LOCAL_BASE = "/assets/mediapipe/hands/";
export const MEDIAPIPE_CDN_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/";
// NATPF: mano persa da più di così (ms) con il modello delle mani attivo: niente colpi dal flusso ottico (stato «persa»)
export const HAND_FLOW_MAX_MS = 700;
// NATPF: da dove vengono i colpi della webcam: dal movimento (predefinito) o dalla mano (?webcamMano=1, il riconoscimento
// di prima, per confrontare sullo stesso computer)
export function webcamModeFrom(search = ""){
  try { return new URLSearchParams(search).get("webcamMano") === "1" ? "hands" : "motion"; } catch { return "motion"; }
}
export class MotionController {
  constructor(e = {}) {
    (this.onSwing = typeof e.onSwing == "function" ? e.onSwing : null),
      (this.onToss = typeof e.onToss == "function" ? e.onToss : null),
      (this.onP2Swing = typeof e.onP2Swing == "function" ? e.onP2Swing : null),
      (this.onP2Toss = typeof e.onP2Toss == "function" ? e.onP2Toss : null),
      (this.onRoomState = typeof e.onRoomState == "function" ? e.onRoomState : null),
      (this.onStatusChange = typeof e.onStatusChange == "function" ? e.onStatusChange : null),
      (this.onOrientation = typeof e.onOrientation == "function" ? e.onOrientation : null),
      (this.roomId = (e.roomId || "default").trim().toLowerCase() || "default"),
      (this.role = (e.role || "p1").toLowerCase() === "p2" ? "p2" : "p1"),
      (this.webcamCanvasId = e.webcamCanvasId || "webcam-canvas"),
      (this.webcamCanvas = e.webcamCanvas || null),
      (this.webcamCtx = null),
      (this.flowWidth = 64),
      (this.flowHeight = 48),
      (this.offscreenCanvas = document.createElement("canvas")),
      (this.offscreenCanvas.width = this.flowWidth),
      (this.offscreenCanvas.height = this.flowHeight),
      (this.offscreenCtx = this.offscreenCanvas.getContext("2d", { willReadFrequently: !0 })),
      (this.prevLuma = new Float32Array(this.flowWidth * this.flowHeight)),
      (this.motionEnergyMap = new Float32Array(this.flowWidth * this.flowHeight)),
      (this.hasPrevFrame = !1),
      (this.videoElem = null),
      (this.webcamStream = null),
      (this.webcamActive = !1),
      (this.smoothedCentroid = { x: 0.5, y: 0.5 }),
      (this.motionVector = { vx: 0, vy: 0, mag: 0 }),
      (this.lastWebcamTriggerMs = 0),
      (this.handTracker = new WebcamHandTracker()),
      // NATPF: riconoscimento dei colpi della webcam, mano seguita, mano che impugna (NatpfHand), lancio accettato dal
      // gioco (NatpfHand: solo al proprio servizio) e aggancio facoltativo della diagnostica (onTrack)
      (this._strokes = createStrokeTracker()),
      (this._handTrack = null),
      (this._handOthers = []),
      (this.handPreference = "right"),
      (this.canToss = null),
      (this.onTrack = typeof e.onTrack == "function" ? e.onTrack : null),
      // NATPF: colpi dal movimento (webcam_motion.js; ?webcamMano=1 per i colpi dalla mano di prima, per confronto),
      // finestra del colpo data dal gioco (webcamGate: natpf_impact.webcamGate) e partita in corso (webcamInPlay: il
      // modello delle mani non gira, il movimento basta), natpf_hand.js
      (this.webcamMode = webcamModeFrom(typeof location != "undefined" ? location.search : "")),
      (this._motion = createMotionStrokes()),
      (this.webcamGate = null),
      (this.webcamInPlay = null),
      (this.webcamMotionAt = null),
      (this.phonePollIntervalMs = e.phonePollIntervalMs || 50),
      (this.phonePollTimer = null),
      (this.phoneState = {
        connected: !1,
        p2Connected: !1,
        lastSeenMs: -1,
        orientation: { pitch: 0, roll: 0, yaw: 0, accelMag: 0, buttonB: !1 },
        lastSwing: null,
      }),
      (this.p2PhoneState = {
        connected: !1,
        lastSeenMs: -1,
        orientation: { pitch: 0, roll: 0, yaw: 0, accelMag: 0, buttonB: !1 },
        lastSwing: null,
      }),
      (this.lastProcessedPhoneSeq = 0),
      (this.phonePollInitialized = !1),
      (this.lastProcessedP2PhoneSeq = 0),
      (this.p2PhonePollInitialized = !1),
      (this.aimBiasX = 0),
      (this.selectedShotType = "topspin"),
      (this.keysDown = new Set()),
      (this.pointerDrag = null),
      (this.mouseTrail = []),
      (this.lastVisualSwing = {
        timestamp: 0,
        dirX: 0,
        dirY: -0.5,
        speed: 0,
        shotType: "topspin",
        source: "ready",
      }),
      (this._listeners = { swing: [], toss: [], status: [], orientation: [] }),
      (this._rafId = null),
      (this._disposed = !1),
      this._initDOMBindings(),
      this.startPhonePolling(),
      this._startHudRenderLoop();
  }
  setRoomConfig({ roomId: e, role: t } = {}) {
    e &&
      ((this.roomId = String(e).trim().toLowerCase() || "default"),
      (this.phonePollInitialized = !1),
      (this.p2PhonePollInitialized = !1),
      (this.lastProcessedPhoneSeq = 0),
      (this.lastProcessedP2PhoneSeq = 0)),
      t && (this.role = String(t).toLowerCase() === "p2" ? "p2" : "p1");
  }
  on(e, t) {
    return (
      this._listeners[e] && typeof t == "function" && this._listeners[e].push(t),
      () => {
        this._listeners[e] && (this._listeners[e] = this._listeners[e].filter((i) => i !== t));
      }
    );
  }
  setShotType(e) {
    ["topspin", "slice", "lob", "smash", "flat"].includes(e) &&
      ((this.selectedShotType = e), this._updateHudShotPills(e));
  }
  _resolveSwingSide(e, t = 0) {
    return e === "backhand" || e === "forehand" || e === "overhead"
      ? e
      : t > 0.12
        ? "backhand"
        : t < -0.12
          ? "forehand"
          : null;
  }
  _inferShotTypeFromKinematics({
    shotType: e,
    dirY: t = -0.4,
    pitch: i = 0,
    roll: a = 0,
    speed: n = 1.1,
  } = {}) {
    return e && ["topspin", "slice", "lob", "smash", "flat"].includes(e)
      ? e
      : (t > 0.35 && n > 1.22) || n >= 1.46 || (i < -18 && n >= 1.25)
        ? "smash"
        : t > 0.14 || (Math.abs(a) > 26 && t > -0.15)
          ? "slice"
          : t < -0.65 || i > 26
            ? "lob"
            : "topspin";
  }
  _emitSwing(e = {}) {
    const t = performance.now(),
      i = Math.max(0.5, Math.min(2, Number(e.speed ?? 1.1))),
      a = Math.max(-1, Math.min(1, Number(e.dirX ?? e.angleX ?? this.aimBiasX ?? 0))),
      n = Math.max(-1, Math.min(1, Number(e.dirY ?? -0.4))),
      h = Number(e.pitch ?? this.phoneState.orientation.pitch ?? 0),
      p = Number(e.roll ?? this.phoneState.orientation.roll ?? 0),
      f = this._resolveSwingSide(e.side, a),
      s = this._inferShotTypeFromKinematics({ shotType: e.shotType, dirY: n, pitch: h, roll: p, speed: i }),
      l = {
        type: "swing",
        // NATPF 1v1: calibrazione del Player 2 nel campo d'allenamento (localPractice, natpf_versus_ui.js): i colpi restano
        // su questo computer, con il ruolo del P1, e non vanno all'host
        role: e.role || (this.localPractice ? "p1" : this.role),
        source: e.source || "manual",
        side: f,
        shotType: s,
        speed: i,
        dirX: a,
        dirY: n,
        angleX: a,
        pitch: h,
        roll: p,
        timing: e.timing || null,
        natpf: e.natpf || null, // NATPF: mira dal piatto del telefono e palla corta (natpf_phone_racket.js)
        hand: e.hand || (e.natpf && e.natpf.hand) || null, // NATPF: mano di chi gioca (mancino), anche per l'host nel 1v1
        timestamp: e.timestamp || Date.now(),
      };
    if (
      ((this.lastVisualSwing = {
        timestamp: t,
        side: f,
        dirX: a,
        dirY: n,
        speed: i,
        shotType: s,
        source: l.source,
      }),
      this.role === "p2" && e.role !== "p1" && !this.localPractice)
    )
      return (
        l.source !== "phone" &&
          !e._fromPoll &&
          fetch(`/api/racket/swing?room=${encodeURIComponent(this.roomId)}&role=p2`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: this.roomId,
              role: "p2",
              type: "swing",
              side: f,
              shotType: s,
              speed: i,
              angleX: a,
              dirX: a,
              dirY: n,
              pitch: h,
              roll: p,
              source: l.source,
              // NATPF: colpo speciale, mira, latenza e mano del telefono del P2, per l'host come per il P1
              ...(l.natpf ? { natpf: l.natpf } : {}),
              ...(l.hand ? { hand: l.hand } : {}),
            }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((r) => {
              r &&
                r.swing &&
                typeof r.swing.seq == "number" &&
                ((this.p2PhonePollInitialized = !0),
                (this.lastProcessedP2PhoneSeq = Math.max(this.lastProcessedP2PhoneSeq, r.swing.seq)));
            })
            .catch(() => {}),
        this._emitP2Swing(l)
      );
    typeof this.onSwing == "function" && this.onSwing(l);
    for (const r of this._listeners.swing)
      try {
        r(l);
      } catch (o) {
        console.error(o);
      }
    return l;
  }
  _emitToss(e = {}) {
    const t = performance.now(),
      i = Number(e.dirX ?? e.angleX ?? 0),
      a = Number(e.dirY ?? -0.9),
      n = this._resolveSwingSide(e.side, i),
      h = e.shotType || "lob",
      p = Number(e.pitch ?? this.phoneState.orientation.pitch ?? 0),
      f = Number(e.roll ?? this.phoneState.orientation.roll ?? 0),
      s = {
        type: "toss",
        role: e.role || (this.localPractice ? "p1" : this.role),
        source: e.source || "manual",
        side: n,
        shotType: h,
        speed: Number(e.speed ?? 1),
        dirX: i,
        dirY: a,
        angleX: i,
        pitch: p,
        roll: f,
        timestamp: e.timestamp || Date.now(),
      };
    if (
      ((this.lastVisualSwing = {
        timestamp: t,
        side: n,
        dirX: i,
        dirY: -0.95,
        speed: 1.1,
        shotType: "toss",
        source: s.source,
      }),
      this.role === "p2" && e.role !== "p1" && !this.localPractice)
    )
      return (
        s.source !== "phone" &&
          !e._fromPoll &&
          fetch(`/api/racket/swing?room=${encodeURIComponent(this.roomId)}&role=p2`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: this.roomId,
              role: "p2",
              type: "toss",
              side: s.side,
              shotType: s.shotType,
              speed: s.speed,
              angleX: s.dirX,
              dirX: s.dirX,
              dirY: s.dirY,
              pitch: s.pitch,
              roll: s.roll,
              source: s.source,
            }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((r) => {
              r &&
                r.swing &&
                typeof r.swing.seq == "number" &&
                ((this.p2PhonePollInitialized = !0),
                (this.lastProcessedP2PhoneSeq = Math.max(this.lastProcessedP2PhoneSeq, r.swing.seq)));
            })
            .catch(() => {}),
        this._emitP2Toss(s)
      );
    let l = !1;
    typeof this.onToss == "function" && (l = this.onToss(s) !== !1);
    for (const r of this._listeners.toss)
      try {
        r(s) !== !1 && (l = !0);
      } catch (o) {
        console.error(o);
      }
    // NATPF: lancio rifiutato (fuori dal proprio servizio) → swing, passando da _emitSwing come gli altri colpi: così
    // anche qui il mancino ha il lato giusto (NatpfHand) e vale il blocco della pausa. Dalla webcam niente: nello
    // scambio la mano che sale segue le regole dei colpi (canToss), non diventa un pallonetto
    return !l && s.source !== "webcam" && this._emitSwing({ source: s.source, side: s.side, shotType: s.shotType, speed: s.speed, dirX: s.dirX, dirY: s.dirY, pitch: s.pitch, roll: s.roll }), s;
  }
  _emitP2Swing(e = {}) {
    const t = Math.max(0.5, Math.min(2, Number(e.speed ?? 1.15))),
      i = Math.max(-1, Math.min(1, Number(e.dirX ?? e.angleX ?? 0))),
      a = Math.max(-1, Math.min(1, Number(e.dirY ?? -0.45))),
      n = Number(e.pitch ?? 0),
      h = Number(e.roll ?? 0),
      p = this._resolveSwingSide(e.side, i),
      f = this._inferShotTypeFromKinematics({ shotType: e.shotType, dirY: a, pitch: n, roll: h, speed: t }),
      s = {
        type: "swing",
        role: "p2",
        source: e.source || "phone",
        side: p,
        shotType: f,
        speed: t,
        dirX: i,
        dirY: a,
        angleX: i,
        pitch: n,
        roll: h,
        timestamp: e.timestamp || Date.now(),
      };
    // NATPF: dati del telefono del P2 (tipo di colpo, mira, latenza, mano), solo se sono arrivati
    e.natpf && (s.natpf = e.natpf), e.hand && (s.hand = e.hand);
    return typeof this.onP2Swing == "function" && this.onP2Swing(s), s;
  }
  _emitP2Toss(e = {}) {
    const t = Number(e.dirX ?? e.angleX ?? 0),
      i = Number(e.dirY ?? -0.9),
      a = this._resolveSwingSide(e.side, t),
      n = {
        type: "toss",
        role: "p2",
        source: e.source || "phone",
        side: a,
        shotType: e.shotType || "lob",
        speed: Number(e.speed ?? 1.1),
        dirX: t,
        dirY: i,
        angleX: t,
        pitch: Number(e.pitch ?? 0),
        roll: Number(e.roll ?? 0),
        timestamp: e.timestamp || Date.now(),
      };
    let h = !1;
    return (
      typeof this.onP2Toss == "function" && (h = this.onP2Toss(n) !== !1),
      !h && typeof this.onP2Swing == "function" && this.onP2Swing(n),
      n
    );
  }
  triggerSyntheticSwing(e = {}) {
    return (e.type || "swing") === "toss"
      ? this._emitToss({
          source: e.source || "synthetic",
          side: e.side || null,
          shotType: e.shotType || "lob",
          speed: e.speed ?? 1.05,
          dirX: e.dirX ?? e.angleX ?? 0,
          dirY: e.dirY ?? -0.9,
        })
      : this._emitSwing({
          source: e.source || "synthetic",
          side: e.side || null,
          shotType: e.shotType,
          speed: e.speed ?? (e.shotType === "smash" ? 1.48 : 1.18),
          dirX: e.dirX ?? e.angleX ?? this.aimBiasX ?? 0,
          dirY: e.dirY ?? -0.45,
          pitch: e.pitch,
          roll: e.roll,
          timing: e.timing || null,
        });
  }
  async _ensureMediaPipeHands() {
    if (this.mpHands || this._mpLoading) return;
    const epoch = this._visionEpoch || 0;
    this._mpLoading = !0;
    const e = (t) =>
      new Promise((i, a) => {
        if (document.querySelector(`script[src="${t}"]`)) {
          i();
          return;
        }
        const n = document.createElement("script");
        (n.src = t),
          (n.crossOrigin = "anonymous"),
          (n.onload = () => i()),
          (n.onerror = (h) => a(h)),
          document.head.appendChild(n);
      });
    try {
      // NATPF: prima i file locali (LAN/offline), poi la stessa versione dal CDN; se mancano entrambi resta l'optical flow
      let base = this.mediapipeBase || MEDIAPIPE_LOCAL_BASE;
      // NATPF: nel worker solo a richiesta (webcam_inference.js); se lì non parte, il modello gira nella pagina (prima
      // restava il solo optical flow e la mano non si vedeva mai)
      if (workerVisionAvailable() && !this._mpWorkerFailed) {
        const model = new WorkerVision({ kind: 'Hands', base: new URL(base, location.href).href });
        this._handsLoadingModel = model;
        model.setOptions({ maxNumHands: this._wcLevel().maxNumHands, modelComplexity: this._wcLevel().modelComplexity, minDetectionConfidence: .4, minTrackingConfidence: .4 });
        model.onResults(r => { if (this.webcamActive && epoch === (this._visionEpoch || 0)) this._onHandResults(r); });
        let ok = !0;
        try { await model.initialize(); } catch (error) {
          model.close();
          // webcam spenta (o riaccesa) durante il caricamento: non è un errore del worker
          if (epoch !== (this._visionEpoch || 0)) throw error;
          ok = !1; this._mpWorkerFailed = !0; console.warn("[MotionController] MediaPipe Hands nel worker non disponibile, modello nella pagina:", error);
        }
        if (ok) {
          if (!this.webcamActive || epoch !== (this._visionEpoch || 0)){ model.close(); return; }
          this.mpHands = model;
          return;
        }
      }
      if (!window.Hands)
        try {
          await e(`${MEDIAPIPE_LOCAL_BASE}hands.js`), (base = MEDIAPIPE_LOCAL_BASE);
        } catch {
          await e(`${MEDIAPIPE_CDN_BASE}hands.js`), (base = MEDIAPIPE_CDN_BASE);
        }
      if (((this.mediapipeBase = base), window.Hands)) {
        const t = new window.Hands({
          locateFile: (i) => `${base}${i}`,
        });
        // NATPF: modello e numero di mani dal livello di carico (webcam_load.js: si alleggerisce se l'inferenza è lenta)
        t.setOptions({
          maxNumHands: this._wcLevel().maxNumHands,
          modelComplexity: this._wcLevel().modelComplexity,
          minDetectionConfidence: 0.4,
          minTrackingConfidence: 0.4,
        }),
          t.onResults((i) => { if (this.webcamActive && epoch === (this._visionEpoch || 0)) this._onHandResults(i); }),
          await t.initialize(),
          (this.mpHands = t);
        if (!this.webcamActive || epoch !== (this._visionEpoch || 0)){ await t.close?.(); this.mpHands = null; }
      }
    } catch (t) {
      if (epoch === (this._visionEpoch || 0)) console.warn("[MotionController] MediaPipe Hands non disponibile, ripiego optical flow:", t);
    } finally {
      this._handsLoadingModel = null; this._mpLoading = !1;
      if (this.webcamActive && epoch !== (this._visionEpoch || 0)) this._ensureMediaPipeHands();
    }
  }
  // NATPF: una sola apertura alla volta: una seconda richiesta (il menu che la accende da solo e il pulsante «Accendi la
  // webcam») aspetta la prima. Prima la seconda interrompeva il play() della prima («AbortError»: webcam non disponibile)
  enableWebcam() {
    if (this.webcamActive) return Promise.resolve(!0);
    return (this._webcamOpening ||= this._openWebcam().finally(() => { this._webcamOpening = null; }));
  }
  async _openWebcam() {
    if (this.webcamActive) return !0;
    // NATPF: motivo per cui la webcam non si apre (natpf_webcam_watch.webcamOpenError, pannello della racchetta)
    this.webcamError = null;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      return (
        (this.webcamError = { name: "insecure", message: "HTTPS required for browser camera access" }),
        this._notifyStatus({ webcam: !1, error: "HTTPS required for browser camera access" }),
        window.location.protocol === "http:" &&
          window.location.hostname !== "localhost" &&
          window.location.hostname !== "127.0.0.1" &&
          // NATPF: la stessa pagina in https (la webcam lo richiede), non l'indirizzo del motore base
          window.open(`https://${window.location.host}${window.location.pathname}?webcam=1`, "_blank"),
        !1
      );
    try {
      // NATPF: anche la frequenza (prima nessuna richiesta): quello che la camera dà davvero va nel registro (camera)
      const e = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 }, facingMode: "user" },
        audio: !1,
      });
      return (
        (this.webcamStream = e),
        this.videoElem ||
          ((this.videoElem = document.createElement("video")),
          (this.videoElem.playsInline = !0),
          (this.videoElem.muted = !0)),
        (this.videoElem.srcObject = e),
        await this.videoElem.play(),
        this._wcStart(e),
        (this.webcamActive = !0),
        (this.hasPrevFrame = !1),
        (this.latestHandLandmarks = null),
        (this._mpBusy = !1),
        this.handTracker.reset(),
        this._resetHandTracking(),
        this._watchFrames(),
        this._ensureMediaPipeHands(),
        this._notifyStatus({ webcam: !0, phone: this.phoneState.connected }),
        this._updateWebcamBadgeUI(!0),
        !0
      );
    } catch (e) {
      return (
        console.warn("[MotionController] Webcam access denied or unavailable:", e),
        (this.webcamError = { name: e?.name || "", message: e?.message || "" }),
        (this.webcamActive = !1),
        this._notifyStatus({ webcam: !1, error: e.message || "Camera permission denied" }),
        this._updateWebcamBadgeUI(!1),
        !1
      );
    }
  }
  disableWebcam() {
    this._visionEpoch = (this._visionEpoch || 0) + 1;
    this._handsLoadingModel?.close();
    if (this.mpHands) Promise.resolve(this.mpHands.close?.()).catch(() => {});
    this.mpHands = null; this._mpBusy = false; this._poseRequested = false; this._poseInferenceBusy = false;
    this.webcamStream && (this.webcamStream.getTracks().forEach((e) => e.stop()), (this.webcamStream = null)),
      this.videoElem && (this.videoElem.srcObject = null),
      (this.webcamActive = !1),
      (this.hasPrevFrame = !1),
      (this.latestHandLandmarks = null),
      this._resetHandTracking(),
      this._notifyStatus({ webcam: !1, phone: this.phoneState.connected }),
      this._updateWebcamBadgeUI(!1);
  }
  // NATPF: niente mano seguita e niente colpo a metà (webcam riaccesa, mano nuova)
  _resetHandTracking() {
    this.latestHandSeenAt = null; this._hasNewHandResult = false; this._nextHandFrameAt = -Infinity;
    (this._handTrack = null), (this._handOthers = []), (this._handLost = !1), (this._handPick = null), (this._handCapture = null), (this._handLastPos = null), (this._frameMeta = null), this._strokes && this._strokes.reset();
    this._poseCapture = null; this._poseSeenAt = null; this._poseUseUntil = 0; this._hasNewPoseResult = !1; this._poseHand = null; this._poseSource?.reset();
    this._motion && this._motion.reset(); this._motionWaiting = !1;
  }
  // NATPF: livello di carico del modello delle mani (webcam_load.js); prima dell'accensione quello di partenza
  _wcLevel() {
    return (this._wcGov && this._wcGov.level) || WEBCAM_LEVELS[1];
  }
  // NATPF: webcam accesa: video nella pagina (2 px, invisibile: un video fuori dal documento il browser può aggiornarlo
  // di rado), misure e livello di carico (?webcamLivello=piena|leggera|minima lo impone, per confrontare i livelli sullo
  // stesso computer), richiesta e risposta della camera per il registro
  _wcStart(stream) {
    const v = this.videoElem;
    if (v && !v.isConnected && typeof document != "undefined" && document.body) {
      v.style.cssText = "position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0;pointer-events:none";
      document.body.appendChild(v);
    }
    let forced = null;
    try {
      const q = new URLSearchParams(location.search).get("webcamLivello");
      forced = WEBCAM_LEVELS.some((l) => l.id === q) ? q : null;
    } catch {}
    this._wcGov ? this._wcGov.restart() : (this._wcGov = createLoadGovernor({ start: forced || "leggera", fixed: !!forced }));
    this._wcApplied || (this._wcApplied = this._wcLevel().id);
    this._wcStats = createWebcamStats();
    this._wcFlushAt = null;
    this._wcStartedAt = performance.now();
    (this._handState = null), (this._handStateAt = null);
    this._frameWaiting = !1;
    const tr = stream && stream.getVideoTracks && stream.getVideoTracks()[0],
      st = (tr && tr.getSettings && tr.getSettings()) || {};
    this.webcamInfo = {
      chiesto: { w: 640, h: 480, fps: 30 },
      ottenuto: { w: st.width ?? null, h: st.height ?? null, fps: Number.isFinite(st.frameRate) ? Math.round(st.frameRate * 10) / 10 : null },
      nome: (tr && tr.label) || null,
      livello: this._wcLevel().id,
      fisso: !!forced,
      richiamiFotogrammi: !!(v && typeof v.requestVideoFrameCallback == "function"),
    };
    this._diag({ kind: "camera", ...this.webcamInfo });
  }
  // NATPF: inferenza sull'ultimo fotogramma, in un compito a sé subito dopo il fotogramma del gioco (prima partiva dentro
  // il ciclo di disegno e ne allungava il fotogramma). Un fotogramma arrivato durante un'inferenza si elabora appena
  // quella finisce; quelli superati dal successivo si saltano (solo l'ultimo conta)
  _kickInference() {
    if (this._kickQueued) return;
    this._kickQueued = !0;
    if (!this._kickCh) {
      this._kickCh = new MessageChannel();
      this._kickCh.port1.onmessage = () => {
        this._kickQueued = !1;
        // NATPF: prima il movimento (meno di un millisecondo, è il colpo), poi l'eventuale inferenza
        this._motionWaiting && ((this._motionWaiting = !1), this._motionStep(performance.now()));
        this._frameWaiting && this._sendFrame(performance.now()) && (this._frameWaiting = !1);
      };
      // in Node (prove) il canale non deve tenere vivo il processo
      this._kickCh.port1.unref && this._kickCh.port1.unref();
    }
    this._kickCh.port2.postMessage(0);
  }
  _sendFrame(e) {
    if (!this.mpHands || this._mpBusy || !this.webcamActive || !this.videoElem || this.videoElem.readyState < 2) return !1;
    if (e < (this._nextHandFrameAt ?? -Infinity)) return !1;
    // NATPF: colpi dal movimento e partita in corso: il modello delle mani non serve (ogni inferenza ferma il gioco per
    // 15–40 ms: era il ritardo del browser con la webcam). Gira nel menu e tra una partita e l'altra (mano vista, posa)
    if (this.webcamMode === "motion" && typeof this.webcamInPlay == "function" && this.webcamInPlay()) return !1;
    // Un solo lavoro WASM alla volta. A distanza Pose legge il polso; Hands verifica periodicamente le dita.
    if (this._poseRequested || this._poseLoading || this._poseInferenceBusy || (e < (this._poseUseUntil || 0) && e - (this._mpSentAt ?? -Infinity) < POSE_INPUT.handProbeMs)) return !1;
    // livello di carico cambiato: le opzioni nuove fuori dal richiamo dei risultati, prima dell'invio, e non con un punto
    // in gioco (il modello nuovo si carica: il gioco si ferma per un attimo; canReload lo dà il gioco, natpf_hand.js)
    this._wcPending &&
      (typeof this.canReload != "function" || this.canReload()) &&
      (this.mpHands.setOptions({ maxNumHands: this._wcPending.maxNumHands, modelComplexity: this._wcPending.modelComplexity }), this._diag({ kind: "carico", from: this._wcApplied || null, to: this._wcPending.id, applied: !0 }), (this._wcApplied = this._wcPending.id), (this._wcPending = null));
    const model = this.mpHands, epoch = this._visionEpoch || 0;
    (this._mpBusy = !0),
      (this._nextHandFrameAt = e + 33),
      (this._mpSentAt = e),
      (this._mpSentCapT = this._frameCaptureT(e)),
      model.send({ image: this.videoElem }).catch(() => {
        if (epoch !== (this._visionEpoch || 0) || this.mpHands !== model) return;
        this._mpBusy = !1;
        // NATPF: modello del worker chiuso (un fotogramma oltre il tempo limite): si ricarica nella pagina, invece di
        // restare senza modello con la webcam accesa
        if (this.mpHands?.closed) { this.mpHands = null; this._mpWorkerFailed = !0; this._ensureMediaPipeHands(); }
      });
    return !0;
  }
  // NATPF: istante di cattura dei fotogrammi della camera (requestVideoFrameCallback), per le velocità della mano
  // senza il ritardo variabile dell'inferenza; senza il supporto vale l'istante dell'invio al modello
  _watchFrames() {
    const v = this.videoElem,
      gen = (this._frameGen = (this._frameGen || 0) + 1);
    if (!v || typeof v.requestVideoFrameCallback != "function") return;
    // una sola catena di richiami: quella di una webcam spenta e riaccesa si ferma
    const cb = (now, md) => {
      if (this._frameGen !== gen) return;
      this._frameMeta = { capture: md && Number.isFinite(md.captureTime) ? md.captureTime : now, at: now };
      // NATPF: fotogramma nuovo della camera: misura e inferenza (fuori dal ciclo di disegno)
      this._wcStats && this._wcStats.frame(now, md || {});
      (this._frameWaiting = !0), (this._motionWaiting = this.webcamMode === "motion");
      (this.mpHands || this._motionWaiting) && this._kickInference();
      this.webcamActive && this.videoElem === v && v.requestVideoFrameCallback(cb);
    };
    v.requestVideoFrameCallback(cb);
  }
  _frameCaptureT(e) {
    const m = this._frameMeta;
    return m && e >= m.capture && e - m.capture < 250 ? m.capture : e;
  }
  // NATPF: movimento del fotogramma della camera appena arrivato (webcam_motion.js): immagine ridotta in grigio, poi lo
  // swing che parte. Al gioco solo dentro la finestra che il gioco stesso dà (webcamGate: palla in arrivo, proprio
  // servizio): fuori il movimento è chi si sposta, si sistema, torna in posizione
  _motionStep(e) {
    const v = this.videoElem;
    if (!this.webcamActive || !v || v.readyState < 2) return;
    const W = MOTION.w, H = MOTION.h;
    if (!this._motionCtx) {
      const c = document.createElement("canvas");
      (c.width = W), (c.height = H), (this._motionCtx = c.getContext("2d", { willReadFrequently: !0 })), (this._motionGray = new Uint8Array(W * H));
    }
    const ctx = this._motionCtx;
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, W, H);
    const cap = this._frameCaptureT(e),
      o = this._motion.push({ t: cap, gray: grayFromRGBA(ctx.getImageData(0, 0, W, H).data, W * H, this._motionGray), w: W, h: H });
    if (!o.frame) return;
    this.onTrack && this._diag({ kind: "frame", t: e, captureT: o.frame.t, source: "motion", energy: o.frame.energy, thr: o.frame.thr, x: o.frame.cx, y: o.frame.cy, phase: this._motion.active ? "swing" : "idle" });
    o.start && this._motionSwing(o.start, e);
  }
  // NATPF: swing dal movimento → colpo o lancio, con l'istante stimato del colpo (latenza: anche negativa, il colpo vero
  // è poco dopo l'evento; natpf_skill.eventLatency) e il lato dalla palla (webcamGate). Senza piatto: la direzione viene
  // dal tempo
  _motionSwing(st, e) {
    this.webcamMotionAt = e;
    const g = typeof this.webcamGate == "function" ? this.webcamGate() : null,
      speed = swingSpeed(st.rel),
      latency = +((e - st.swingT) / 1000).toFixed(3),
      type = !g ? null : g.kind === "toss" ? "toss" : "swing";
    this.onTrack && this._diag({ kind: "event", t: e, captureT: st.t, source: "motion", type: type || "nessuno", side: g?.side || null, speed, reason: `movimento ${st.rel.toFixed(1)}× la soglia${g ? `, ${g.kind}${Number.isFinite(g.ttc) ? ` a ${Math.round(g.ttc * 1000)} ms dalla palla` : ""}` : ", fuori dalla finestra del colpo"}` });
    if (!g) return;
    this.lastWebcamTriggerMs = e;
    if (type === "toss") return void this._emitToss({ source: "webcam", shotType: "lob", speed, dirX: 0, dirY: -0.9 });
    this._emitSwing({
      source: "webcam", side: g.side || null, handedSide: !!g.side, shotType: g.kind === "serve" ? "flat" : "topspin", speed, dirX: 0, dirY: -0.4,
      natpf: { aim: "swing", latency, wrist: 0, source: "webcam", hand: this.handPreference || "right" },
    });
  }
  _videoAspect() {
    const v = this.videoElem;
    return v && v.videoWidth > 0 && v.videoHeight > 0 ? v.videoHeight / v.videoWidth : 0.75;
  }
  _diag(o) {
    if (typeof this.onTrack == "function")
      try {
        this.onTrack(o);
      } catch (e) {
        console.error(e);
      }
  }
  // NATPF: diagnostica di un fotogramma elaborato (s: campione della mano o del flusso; senza, source null)
  _diagFrame(e, s) {
    const h = this._handPick;
    this._diag({ kind: "frame", t: e, captureT: s ? s.t : this._frameCaptureT(e), source: s ? s.src : null, hands: h ? h.hands : null, chosen: h ? h.chosen : null, reason: h ? h.reason : null, x: s ? s.x : null, y: s ? s.y : null, inferMs: s?.src === "pose" ? this._poseInferMs ?? null : this.lastInferMs ?? null, phase: this._strokes.state.phase });
  }
  // NATPF: risultato del modello delle mani: la mano da seguire tra quelle trovate (continuità, lateralità, taglia),
  // non la prima della lista (una mano che entra, di un passante o la mano libera, la prendeva e la teneva). Un solo
  // soggetto: le altre mani viste (un'altra persona, la mano libera) si ricordano e non prendono il posto di quella di
  // chi gioca quando si perde (trackOthers)
  _onHandResults(i) {
    this._mpBusy = !1;
    // NATPF: un fotogramma arrivato durante l'inferenza: subito il prossimo
    this._frameWaiting && this._kickCh && this._kickInference();
    const now = performance.now(),
      lms = (i && i.multiHandLandmarks) || [],
      hd = (i && i.multiHandedness) || [],
      aspect = this._videoAspect(),
      T = this._handTrack,
      hands = lms.map((lm, k) => ({ lm, label: hd[k] && hd[k].label, score: hd[k] && hd[k].score }));
    this.lastInferMs = this.mpHands?.inWorker ? this.mpHands.lastInferMs : Number.isFinite(this._mpSentAt) ? now - this._mpSentAt : null;
    // NATPF: misura dell'inferenza e livello di carico (il cambio si applica al prossimo invio)
    if (this._wcStats) {
      this._wcStats.infer(this.lastInferMs);
      const ch = this._wcGov && this._wcGov.push(this.lastInferMs);
      ch && ((this._wcPending = ch.level), this.webcamInfo && (this.webcamInfo.livello = ch.level.id), this._diag({ kind: "carico", from: ch.from.id, to: ch.level.id, p50: ch.p50, reason: ch.why }));
    }
    const pick = pickHand(hands, { track: T, others: this._handOthers || [], t: now, prefer: this.handPreference, aspect });
    this._handOthers = trackOthers(this._handOthers || [], hands, { chosen: pick.index, track: T, t: now, aspect });
    this._handPick = { hands: lms.length, chosen: pick.index, reason: pick.reason };
    if (pick.index < 0) {
      (this.latestHandLandmarks = null), T && !this._handLost && ((this._handLost = !0), this._diag({ kind: "lost", t: now, hands: lms.length, reason: pick.reason }));
      return;
    }
    const lm = lms[pick.index],
      p = handPoint(lm),
      u = -p.y * aspect,
      size = handSize(lm, aspect),
      fresh = !T || now - T.t > 500,
      dt = T ? Math.max(0.016, (now - T.t) / 1000) : 0;
    (this._handTrack = {
      x: p.x,
      u,
      vx: fresh ? 0 : (p.x - T.x) / dt,
      vu: fresh ? 0 : (u - T.u) / dt,
      t: now,
      size: size > 1e-4 ? size : T ? T.size : 0,
      k: this._strokes.state.k,
      label: (hd[pick.index] && hd[pick.index].label) || null,
    }),
      // NATPF: mano ritrovata dopo un po': i colpi contano da quando sta ferma (una mano che entra in movimento no)
      fresh && this._strokes.reset(),
      (fresh || this._handLost) && this._diag({ kind: "found", t: now, hands: lms.length, reason: pick.reason }),
      (this._handLost = !1),
      (this._poseUseUntil = 0),
      (this.latestHandLandmarks = lm),
      (this.latestHandSeenAt = now),
      (this._handCapture = { lm, t: Number.isFinite(this._mpSentCapT) ? this._mpSentCapT : now }),
      (this._hasNewHandResult = !0);
  }
  _onPoseResults(results, captureT, now = performance.now()) {
    if (!this.webcamActive || captureT < (this._wcStartedAt ?? -Infinity)) return;
    this._poseSource ||= new PoseStrokeSource();
    if (this._poseHand && this._poseHand !== this.handPreference){
      this._poseCapture = null; this._poseSeenAt = null; this._hasNewPoseResult = !1; this._poseUseUntil = 0;
      if (this._lastWebcamSource === "pose"){ this._strokes.reset(); this.handTracker.reset(); }
    }
    this._poseHand = this.handPreference;
    const anchor = this._handTrack ? { ...this._handTrack, y: -this._handTrack.u/this._videoAspect() } : null;
    const sample = this._poseSource.push(results?.poseLandmarks, { now, captureT, hand: this.handPreference, aspect: this._videoAspect(), anchor });
    if (!sample) return;
    this._poseCapture = sample; this._hasNewPoseResult = !0; this._poseSeenAt = now;
    if (!this.latestHandLandmarks || now - (this.latestHandSeenAt || 0) >= 240) this._poseUseUntil = now + POSE_INPUT.freshMs;
  }
  // NATPF: un campione della mano (o del flusso ottico) al riconoscimento dei colpi, poi gli eventi decisi
  _strokeSample(s, e) {
    const evs = this._strokes.push({ ...s, aspect: this._videoAspect(), canToss: typeof this.canToss == "function" ? !!this.canToss() : null }),
      o = this._strokes.motion();
    o && ((this.motionVector.vx = o.vx), (this.motionVector.vy = o.vy), (this.motionVector.mag = o.mag));
    this.onTrack && this._diagFrame(e, s);
    for (const v of evs) {
      // NATPF: conferma di un colpo anticipato (arriva dopo l'impatto): solo diagnostica, al gioco niente
      if (v.type === "confirm") {
        const p = v.early || {};
        this.onTrack && this._diag({ kind: "confirm", t: e, captureT: s.t, source: s.src, side: v.side, shotType: v.shotType, reason: `${v.agree ? "come il colpo anticipato" : `diverso dal colpo anticipato (${p.side || "-"} ${p.shotType || "-"})`}: ${v.why}` });
        continue;
      }
      this.lastWebcamTriggerMs = e;
      this.onTrack && this._diag({ kind: "event", t: e, captureT: s.t, source: s.src, type: v.type, side: v.side, shotType: v.shotType, speed: v.speed, dirX: v.dirX, dirY: v.dirY, reason: v.why });
      v.type === "toss"
        ? this._emitToss({ source: "webcam", side: v.side, shotType: "lob", speed: v.speed, dirX: v.dirX, dirY: -0.9 })
        : this._emitSwing({ source: "webcam", side: v.side, shotType: v.shotType, speed: v.speed, dirX: v.dirX, dirY: v.dirY });
    }
  }
  // NATPF: stato della mano, nel registro a ogni cambio con la durata dello stato finito: valida (vista ora), degradata
  // (persa da 0,25 s: il flusso ottico può finire un colpo), persa (oltre HAND_FLOW_MAX_MS o mai vista: nessun colpo),
  // ripresa (ritrovata dopo una perdita: per 0,6 s; i colpi contano da quando sta ferma, webcam_strokes.js), movimento
  // (modello delle mani non disponibile: solo flusso ottico)
  _handStateTick(e) {
    const seen = this._webcamSeenAt(),
      age = seen == null || (this._wcStartedAt != null && seen < this._wcStartedAt) ? Infinity : e - seen,
      prev = this._handState;
    const st = this.webcamMode === "motion" || (!this.mpHands && !this._poseModelReady)
      ? "movimento"
      : age > HAND_FLOW_MAX_MS
        ? "persa"
        : age > 250
          ? prev === "persa" ? "persa" : "degradata"
          : prev === "persa" || (prev === "ripresa" && e - this._handStateAt < 600) ? "ripresa" : "valida";
    if (st === prev) return;
    this._diag({ kind: "stato", t: e, from: prev || null, to: st, ms: this._handStateAt != null ? Math.round(e - this._handStateAt) : null });
    (this._handState = st), (this._handStateAt = e);
  }
  // NATPF: salute della webcam per la pausa della partita (natpf_webcam_watch.js): accesa, modello delle mani, da quanto
  // non si vede la mano (dall'accensione se mai vista), da quanto non arriva un fotogramma della camera
  webcamHealth(now = performance.now()) {
    const seen = this._webcamSeenAt(),
      from = this._wcStartedAt ?? now;
    return {
      active: !!this.webcamActive,
      // NATPF: con i colpi dal movimento la mano non si giudica (il modello non gira in partita): pausa solo per la camera
      model: this.webcamMode !== "motion" && (!!this.mpHands || !!this._poseModelReady),
      handAgeMs: seen == null || seen < from ? now - from : now - seen,
      frameAgeMs: this._frameMeta && Number.isFinite(this._frameMeta.at) ? now - this._frameMeta.at : null,
      state: this._handState || null,
    };
  }
  _webcamSeenAt() {
    const seen = Math.max(this._handSeenForFlow ?? -Infinity, this._poseSeenAt ?? -Infinity);
    return Number.isFinite(seen) ? seen : null;
  }
  // NATPF: posa della mano per la racchetta (liveInput), null se la webcam è spenta o la mano non si vede
  webcamLiveInput(e = performance.now()) {
    return this.webcamActive ? this.handTracker.sample(e) : null;
  }
  async toggleWebcam() {
    return this.webcamActive ? (this.disableWebcam(), !1) : this.enableWebcam();
  }
  _processWebcamFrame() {
    if (!this.webcamActive || !this.videoElem || this.videoElem.readyState < 2) return;
    const e = performance.now(),
      t = this.videoElem.currentTime !== this._lastVideoTime;
    // NATPF: misure della webcam, una volta al secondo nel registro
    if (this._wcStats) {
      this._wcFlushAt == null && (this._wcFlushAt = e);
      e - this._wcFlushAt >= 1000 && (this._diag({ kind: "ritmo", ...this._wcStats.flush(e - this._wcFlushAt), worker: !!this.mpHands?.inWorker, livello: this._wcLevel().id }), (this._wcFlushAt = e));
    }
    this._wcStats && this._handStateTick(e);
    // NATPF: l'inferenza la fanno partire i richiami dei fotogrammi (_watchFrames); qui solo se non arrivano (browser
    // senza il supporto, richiami fermi da 150 ms: thread molto occupato). Con i richiami visti almeno una volta anche
    // da qui in un compito a sé dopo il fotogramma; senza (browser che non li ha), subito come prima
    t &&
      ((this._lastVideoTime = this.videoElem.currentTime),
      (!this._frameMeta || e - this._frameMeta.at > 150) && (this._frameMeta && this.mpHands ? ((this._frameWaiting = !0), this._kickInference()) : this._sendFrame(e)),
      // NATPF: movimento da qui solo senza i richiami dei fotogrammi (o fermi): con i richiami lo misura _watchFrames
      this.webcamMode === "motion" && (!this._frameMeta || e - this._frameMeta.at > 150) && this._motionStep(e));
    // NATPF: colpi dal movimento (_motionStep): la mano e il corpo, quando i modelli girano, danno solo la posa della
    // racchetta; niente colpi dalla mano né dal flusso ottico
    const motion = this.webcamMode === "motion";
    if (this.latestHandLandmarks && e - (this.latestHandSeenAt || 0) < 240) {
      if (!this._hasNewHandResult) return;
      this._hasNewHandResult = !1;
      // NATPF: la mano scelta (_onHandResults), con l'istante di cattura del suo fotogramma quando c'è
      const c = this.latestHandLandmarks,
        p = handPoint(c),
        cap = this._handCapture && this._handCapture.lm === c ? this._handCapture.t : e;
      (this.smoothedCentroid.x = p.x),
        (this.smoothedCentroid.y = p.y),
        (this._lastWebcamSource = "hands"),
        (this._handSeenForFlow = e),
        (this._handLastPos = { x: p.x, y: p.y }),
        this.handTracker.push(handPoseFromLandmarks(c), e),
        this._wcStats && this._wcStats.use(e - cap),
        motion || this._strokeSample({ t: cap, x: p.x, y: p.y, src: "hands", scale: handSize(c, this._videoAspect()) }, e);
      return;
    }
    const pose = this._poseCapture;
    if (pose && e - (this._poseSeenAt ?? -Infinity) < POSE_INPUT.freshMs) {
      if (!this._hasNewPoseResult) return;
      this._hasNewPoseResult = !1;
      this.smoothedCentroid.x = pose.x; this.smoothedCentroid.y = pose.y;
      this._lastWebcamSource = "pose"; this._handLastPos = { x: pose.x, y: pose.y };
      this.handTracker.push(pose.pose, e);
      this._wcStats && this._wcStats.use(e - pose.t);
      motion || this._strokeSample(pose, e);
      return;
    }
    if (!t || motion) return;
    // NATPF: mano persa da poco (il mosso nella parte veloce dello swing): si aspetta che torni, il colpo continua sulla
    // traccia della mano invece di ripartire sul flusso ottico
    if (e - (this._handSeenForFlow ?? -1e9) < 220) {
      this.onTrack && this._diagFrame(e, null);
      return;
    }
    // NATPF: mano persa da oltre HAND_FLOW_MAX_MS (o mai vista) con il modello delle mani attivo: niente colpi dal flusso
    // ottico, che sarebbero inventati (il corpo, l'altra mano, chi passa), e niente lettura dei pixel. Il flusso resta
    // per finire un colpo appena perso per il mosso e come unico ingresso quando il modello non c'è
    if ((this.mpHands || this._poseModelReady) && e - (this._webcamSeenAt() ?? -1e9) > HAND_FLOW_MAX_MS) {
      this.onTrack && this._diagFrame(e, null);
      return;
    }
    // NATPF: il fotogramma di confronto è vecchio (la mano si vedeva, il flusso era fermo): si riparte da questo
    const stale = !this.hasPrevFrame || e - (this._flowAt ?? -1e9) > 250;
    this._flowAt = e;
    const a = this.flowWidth,
      n = this.flowHeight,
      h = this.offscreenCtx;
    h.save(), h.scale(-1, 1), h.drawImage(this.videoElem, -a, 0, a, n), h.restore();
    const p = h.getImageData(0, 0, a, n).data;
    let f = 0;
    const s = 8,
      l = 6,
      r = a / s,
      o = n / l,
      y = new Float32Array(s * l),
      P = new Float32Array(s * l),
      d = new Float32Array(s * l);
    for (let c = 0; c < n; c++) {
      const b = Math.min(l - 1, Math.floor(c / o));
      for (let w = 0; w < a; w++) {
        const S = c * a + w,
          _ = S * 4,
          C = (p[_] * 0.299 + p[_ + 1] * 0.587 + p[_ + 2] * 0.114) / 255;
        if (!stale) {
          const X = Math.abs(C - this.prevLuma[S]),
            M = X > 0.11 ? X : 0;
          if (((this.motionEnergyMap[S] = this.motionEnergyMap[S] * 0.45 + M * 0.55), M > 0.13)) {
            const v = M;
            f += v;
            const I = Math.min(s - 1, Math.floor(w / r)),
              k = b * s + I;
            (y[k] += v), (P[k] += (w / a) * v), (d[k] += (c / n) * v);
          }
        }
        this.prevLuma[S] = C;
      }
    }
    if (stale) {
      (this.hasPrevFrame = !0), this.onTrack && this._diagFrame(e, null);
      return;
    }
    // NATPF: flusso ottico di riserva solo vicino all'ultima posizione della mano (vista da meno di 1,5 s) o, senza,
    // nella zona centrale: un passante ai lati o sullo sfondo non diventa un colpo
    const near = e - (this._handSeenForFlow ?? -1e9) < 1500 && this._handLastPos,
      rx = near ? this._handLastPos.x : 0.5,
      ry = near ? this._handLastPos.y : 0.5,
      rw = near ? 0.28 : 0.32,
      rh = near ? 0.36 : 0.6;
    let m = 0,
      g = 0,
      T = 0;
    for (let c = 0; c < l; c++)
      for (let b = 0; b < s; b++) {
        if (Math.abs((b + 0.5) / s - rx) > rw || Math.abs((c + 0.5) / l - ry) > rh) continue;
        let w = 0,
          S = 0,
          _ = 0;
        for (let C = -1; C <= 1; C++) {
          const X = c + C;
          if (!(X < 0 || X >= l))
            for (let M = -1; M <= 1; M++) {
              const v = b + M;
              if (v < 0 || v >= s || Math.abs((v + 0.5) / s - rx) > rw || Math.abs((X + 0.5) / l - ry) > rh) continue;
              const I = X * s + v;
              (w += y[I]), (S += P[I]), (_ += d[I]);
            }
        }
        w > m && ((m = w), (g = S), (T = _));
      }
    const u = f > 0.001 ? m / f : 0;
    if (m > 3.2 && u >= 0.45) {
      // NATPF: dopo una pausa del flusso (o dopo la mano) il centro riparte da qui, senza la media con quello vecchio
      const c = g / m,
        b = T / m,
        k = e - (this._flowSampleAt ?? -1e9) < 200 ? 0.35 : 0;
      (this._flowSampleAt = e),
        (this.smoothedCentroid.x = this.smoothedCentroid.x * k + c * (1 - k)),
        (this.smoothedCentroid.y = this.smoothedCentroid.y * k + b * (1 - k)),
        (this._lastWebcamSource = "flow"),
        this.handTracker.push(handPoseFromFlow(this.smoothedCentroid), e),
        this._strokeSample({ t: this._frameCaptureT(e), x: this.smoothedCentroid.x, y: this.smoothedCentroid.y, src: "flow", scale: null }, e);
    } else
      (this.motionVector.vx *= 0.72),
        (this.motionVector.vy *= 0.72),
        (this.motionVector.mag *= 0.72),
        // NATPF: il moto si è fermato: per un po' la mano resta all'ultimo centro, così il movimento finisce e uno swing
        // secco rimasto in attesa si decide anche con il solo flusso ottico
        e - (this._flowSampleAt ?? -1e9) < 400
          ? this._strokeSample({ t: this._frameCaptureT(e), x: this.smoothedCentroid.x, y: this.smoothedCentroid.y, src: "flow", scale: null }, e)
          : this.onTrack && this._diagFrame(e, null);
  }
  startPhonePolling() {
    if (this.phonePollTimer) return;
    const e = async () => {
      if (!this._disposed)
        try {
          // NATPF 1v1: touch con il proprio ruolo (prima «touch=1», che il relay ignorava: l'host non vedeva mai il P2
          // online) e, dal P2, se è pronto in lobby
          const t = `?room=${encodeURIComponent(this.roomId || "default")}&role=${encodeURIComponent(this.role || "p1")}&touch=${this.role === "p2" ? "p2" : "p1"}${this.role === "p2" && this.versusReady != null ? `&ready=${this.versusReady ? 1 : 0}` : ""}`,
            i = await fetch(`/api/match/state${t}`, { cache: "no-store" });
          // NATPF 1v1: stanza che non esiste (link vecchio o sbagliato)
          if (i.status === 404 && this.role === "p2") { typeof this.onRoomState == "function" && this.onRoomState({ invalidRoom: !0 }); return; }
          if (i.ok) {
            const a = await i.json();
            // NATPF 1v1: relay ripartito (epoca nuova): i contatori dei colpi ricominciano da capo
            a.epoch && a.epoch !== this.relayEpoch && (this.relayEpoch != null && ((this.lastProcessedPhoneSeq = 0), (this.lastProcessedP2PhoneSeq = 0)), (this.relayEpoch = a.epoch));
            typeof this.onRoomState == "function" && this.onRoomState(a);
            const n = a.p1 || a,
              h = a.p2 || null,
              p = this.phoneState.connected,
              f = this.p2PhoneState.connected;
            // NATPF: con il telefono NATPF collegato (externalRacket) stato e orientamento arrivano dal suo
            // collegamento WebRTC, non dal relay
            const ext = !!this.externalRacket;
            ext ||
              ((this.phoneState.connected = !!n.connected),
              (this.phoneState.lastSeenMs = Number(n.lastSeenMs ?? -1))),
              h &&
                ((this.p2PhoneState.connected = !!h.connected),
                (this.p2PhoneState.lastSeenMs = Number(h.lastSeenMs ?? -1)));
            const s = this.role === "p2" && h ? h : n;
            s &&
              s.orientation &&
              !ext &&
              ((this.phoneState.orientation = {
                pitch: Number(s.orientation.pitch || 0),
                roll: Number(s.orientation.roll || 0),
                yaw: Number(s.orientation.yaw || 0),
                accelMag: Number(s.orientation.accelMag || 0),
                buttonB: !!s.orientation.buttonB,
              }),
              typeof this.onOrientation == "function" && this.onOrientation(this.phoneState.orientation));
            const l = this.phoneState.connected || this.p2PhoneState.connected;
            if (
              ((p !== this.phoneState.connected || f !== this.p2PhoneState.connected) &&
                (this._notifyStatus({
                  webcam: this.webcamActive,
                  phone: l,
                  p1Phone: this.phoneState.connected,
                  p2Phone: this.p2PhoneState.connected,
                }),
                this._updatePhoneBadgeUI(l)),
              n && n.lastSwing && typeof n.lastSwing.seq == "number")
            ) {
              const r = n.lastSwing.seq;
              if (!this.phonePollInitialized) {
                this.phonePollInitialized = !0;
                const o = Date.now() - Number(n.lastSwing.serverTimeMs || 0);
                this.lastProcessedPhoneSeq = o < 1200 ? r - 1 : r;
              }
              if (r > this.lastProcessedPhoneSeq) {
                (this.lastProcessedPhoneSeq = r), (this.phoneState.lastSwing = n.lastSwing);
                const o = n.lastSwing;
                o.type === "toss"
                  ? this._emitToss({
                      source: "phone",
                      role: "p1",
                      side: o.side,
                      shotType: o.shotType || "lob",
                      speed: o.speed || 1.1,
                      dirX: o.angleX ?? o.dirX ?? 0,
                      dirY: o.dirY ?? -0.9,
                      pitch: o.pitch,
                      roll: o.roll,
                    })
                  : this._emitSwing({
                      source: "phone",
                      role: "p1",
                      side: o.side,
                      shotType: o.shotType,
                      speed: o.speed || 1.15,
                      dirX: o.angleX ?? o.dirX ?? 0,
                      dirY: o.dirY ?? -0.45,
                      pitch: o.pitch,
                      roll: o.roll,
                    });
              }
            } else
              this.phonePollInitialized ||
                ((this.phonePollInitialized = !0), (this.lastProcessedPhoneSeq = 0));
            if (h && h.lastSwing && typeof h.lastSwing.seq == "number") {
              const r = h.lastSwing.seq;
              if (!this.p2PhonePollInitialized) {
                this.p2PhonePollInitialized = !0;
                const o = Date.now() - Number(h.lastSwing.serverTimeMs || 0);
                this.lastProcessedP2PhoneSeq = o < 1200 ? r - 1 : r;
              }
              // NATPF 1v1: tutti i colpi arrivati dall'ultima lettura, in ordine (prima solo l'ultimo: un lancio e il
              // colpo del servizio nella stessa lettura perdevano il lancio)
              for (const o of newSwings(h.swingHistory, this.lastProcessedP2PhoneSeq, h.lastSwing)) {
                (this.lastProcessedP2PhoneSeq = o.seq), (this.p2PhoneState.lastSwing = o);
                o.type === "toss"
                  ? this._emitP2Toss({
                      source: "phone",
                      role: "p2",
                      side: o.side,
                      shotType: o.shotType || "lob",
                      speed: o.speed || 1.1,
                      dirX: o.angleX ?? o.dirX ?? 0,
                      dirY: o.dirY ?? -0.9,
                      pitch: o.pitch,
                      roll: o.roll,
                    })
                  : this._emitP2Swing({
                      source: "phone",
                      role: "p2",
                      side: o.side,
                      shotType: o.shotType,
                      speed: o.speed || 1.15,
                      dirX: o.angleX ?? o.dirX ?? 0,
                      dirY: o.dirY ?? -0.45,
                      pitch: o.pitch,
                      roll: o.roll,
                      // NATPF: con il tempo passato nel relay prima di questa lettura
                      natpf: relayedNatpf(o),
                      hand: o.hand,
                    });
              }
            } else
              this.p2PhonePollInitialized ||
                ((this.p2PhonePollInitialized = !0), (this.lastProcessedP2PhoneSeq = 0));
          }
        } catch {}
    };
    e(), (this.phonePollTimer = setInterval(e, this.phonePollIntervalMs));
  }
  stopPhonePolling() {
    this.phonePollTimer && (clearInterval(this.phonePollTimer), (this.phonePollTimer = null));
  }
  triggerHapticFeedback({
    kind: e = "hit",
    grade: t = "PERFECT",
    shotType: i = "TOPSPIN",
    speedKmh: a = 165,
    intensity: n = 1,
    role: h = null,
  } = {}) {
    const p = h || this.role || "p1";
    if (typeof navigator < "u" && navigator.vibrate)
      try {
        e === "whiff" || e === "fault"
          ? navigator.vibrate([18, 35, 18])
          : n >= 1.25 || /PERFECT|POWER|SMASH/i.test(t)
            ? navigator.vibrate([45, 28, 65])
            : navigator.vibrate([32]);
      } catch {}
    fetch("/api/racket/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: this.roomId || "default",
        role: p,
        kind: e,
        grade: t,
        shotType: i,
        speedKmh: Math.round(Number(a || 150)),
        intensity: Number(n || 1),
      }),
    }).catch(() => {});
  }
  _initDOMBindings() {
    (this._onKeyDown = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      const t = e.code;
      this.keysDown.add(t),
        t === "KeyQ" || t === "ArrowLeft" || t === "KeyA"
          ? (this.aimBiasX = Math.max(-1, this.aimBiasX - 0.55))
          : t === "KeyE" || t === "ArrowRight" || t === "KeyD"
            ? (this.aimBiasX = Math.min(1, this.aimBiasX + 0.55))
            : t === "Digit1"
              ? (this.setShotType("topspin"),
                this._emitSwing({
                  source: "keyboard",
                  shotType: "topspin",
                  speed: 1.18,
                  dirX: this.aimBiasX,
                  dirY: -0.45,
                }))
              : t === "Digit2"
                ? (this.setShotType("slice"),
                  this._emitSwing({
                    source: "keyboard",
                    shotType: "slice",
                    speed: 1.05,
                    dirX: this.aimBiasX,
                    dirY: 0.45,
                  }))
                : t === "Digit3"
                  ? (this.setShotType("lob"),
                    this._emitSwing({
                      source: "keyboard",
                      shotType: "lob",
                      speed: 1.08,
                      dirX: this.aimBiasX,
                      dirY: -0.85,
                    }))
                  : t === "Digit4"
                    ? (this.setShotType("smash"),
                      this._emitSwing({
                        source: "keyboard",
                        shotType: "smash",
                        speed: 1.48,
                        dirX: this.aimBiasX,
                        dirY: 0.65,
                      }))
                    : t === "KeyT" || t === "ArrowUp" || t === "KeyW"
                      ? this._emitToss({
                          source: "keyboard",
                          shotType: "lob",
                          speed: 1.1,
                          dirX: this.aimBiasX,
                          dirY: -0.9,
                        })
                      : (t === "Space" || t === "Enter") &&
                        (e.preventDefault(),
                        this._emitSwing({
                          source: "keyboard",
                          speed: 1.2,
                          dirX: this.aimBiasX,
                          dirY: -0.45,
                        }));
    }),
      (this._onKeyUp = (e) => {
        const t = e.code;
        this.keysDown.delete(t),
          !this.keysDown.has("KeyQ") &&
            !this.keysDown.has("ArrowLeft") &&
            !this.keysDown.has("KeyA") &&
            !this.keysDown.has("KeyE") &&
            !this.keysDown.has("ArrowRight") &&
            !this.keysDown.has("KeyD") &&
            (this.aimBiasX = 0);
      }),
      (this._onPointerDown = (e) => {
        (e.target && e.target.closest("button, a, input, select, .hud-interactive, .control-btn")) ||
          ((this.pointerDrag = {
            startX: e.clientX,
            startY: e.clientY,
            startTime: performance.now(),
            lastX: e.clientX,
            lastY: e.clientY,
          }),
          (this.mouseTrail = [{ x: e.clientX, y: e.clientY, t: performance.now() }]));
      }),
      (this._onPointerMove = (e) => {
        this.pointerDrag &&
          ((this.pointerDrag.lastX = e.clientX),
          (this.pointerDrag.lastY = e.clientY),
          this.mouseTrail.push({ x: e.clientX, y: e.clientY, t: performance.now() }),
          this.mouseTrail.length > 20 && this.mouseTrail.shift());
      }),
      (this._onPointerUp = (e) => {
        if (!this.pointerDrag) return;
        const t = this.pointerDrag;
        this.pointerDrag = null;
        const i = (e.clientX ?? t.lastX) - t.startX,
          a = (e.clientY ?? t.lastY) - t.startY,
          n = Math.max(16, performance.now() - t.startTime),
          h = Math.hypot(i, a);
        if (h < 18) return;
        const p = h / n,
          f = Math.min(1.65, Math.max(0.82, 0.78 + p * 0.42));
        let s = null;
        i > 14 ? (s = "backhand") : i < -14 && (s = "forehand");
        const l = Math.max(-1, Math.min(1, i / 180)),
          r = s === "backhand" ? Math.max(0.22, l) : s === "forehand" ? Math.min(-0.22, l) : l,
          o = Math.max(-1, Math.min(1, a / 150));
        if (a < -55 && Math.abs(a) > Math.abs(i) * 1.3)
          this._emitToss({ source: "mouse", side: s, shotType: "lob", speed: f, dirX: r, dirY: -0.9 });
        else {
          let y = "topspin";
          (a > 38 && f > 1.22) || f > 1.46
            ? (y = "smash")
            : a > 14
              ? (y = "slice")
              : a < -32
                ? (y = "lob")
                : (y = "topspin"),
            this._emitSwing({ source: "mouse", side: s, shotType: y, speed: f, dirX: r, dirY: o });
        }
      }),
      window.addEventListener("keydown", this._onKeyDown),
      window.addEventListener("keyup", this._onKeyUp),
      window.addEventListener("pointerdown", this._onPointerDown),
      window.addEventListener("pointermove", this._onPointerMove),
      window.addEventListener("pointerup", this._onPointerUp);
  }
  _startHudRenderLoop() {
    const e = () => {
      this._disposed ||
        (this.webcamActive && this._processWebcamFrame(),
        this.webcamCanvas ||
          ((this.webcamCanvas = document.getElementById(this.webcamCanvasId)),
          this.webcamCanvas && (this.webcamCtx = this.webcamCanvas.getContext("2d"))),
        this.webcamCanvas &&
          this.webcamCtx &&
          this._drawHudCanvas(this.webcamCtx, this.webcamCanvas.width, this.webcamCanvas.height),
        (this._rafId = requestAnimationFrame(e)));
    };
    this._rafId = requestAnimationFrame(e);
  }
  _drawHudCanvas(e, t, i) {
    if ((e.clearRect(0, 0, t, i), this.webcamActive && this.videoElem && this.videoElem.readyState >= 2)) {
      e.save(), e.scale(-1, 1), e.drawImage(this.videoElem, -t, 0, t, i), e.restore();
      const d = performance.now();
      if (this.latestHandLandmarks && d - (this.latestHandSeenAt || 0) < 240) {
        const g = this.latestHandLandmarks,
          T = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [0, 5],
            [5, 6],
            [6, 7],
            [7, 8],
            [0, 9],
            [9, 10],
            [10, 11],
            [11, 12],
            [0, 13],
            [13, 14],
            [14, 15],
            [15, 16],
            [0, 17],
            [17, 18],
            [18, 19],
            [19, 20],
            [5, 9],
            [9, 13],
            [13, 17],
          ];
        (e.strokeStyle = "#00e436"), (e.lineWidth = 2);
        for (const [u, c] of T) {
          const b = g[u],
            w = g[c];
          e.beginPath(), e.moveTo((1 - b.x) * t, b.y * i), e.lineTo((1 - w.x) * t, w.y * i), e.stroke();
        }
        for (let u = 0; u < g.length; u++) {
          const c = g[u];
          (e.fillStyle = u === 0 || u === 8 || u === 9 ? "#dfff00" : "#ffffff"),
            e.beginPath(),
            e.arc((1 - c.x) * t, c.y * i, u === 0 || u === 9 ? 3.5 : 2, 0, Math.PI * 2),
            e.fill();
        }
      } else {
        const g = t / this.flowWidth,
          T = i / this.flowHeight;
        e.fillStyle = "rgba(223, 255, 0, 0.35)";
        for (let u = 0; u < this.flowHeight; u += 2)
          for (let c = 0; c < this.flowWidth; c += 2)
            this.motionEnergyMap[u * this.flowWidth + c] > 0.14 && e.fillRect(c * g, u * T, g * 1.8, T * 1.8);
      }
    } else {
      const d = e.createRadialGradient(t * 0.5, i * 0.5, 6, t * 0.5, i * 0.5, t * 0.65);
      d.addColorStop(0, "rgba(24, 68, 42, 0.92)"),
        d.addColorStop(1, "rgba(10, 24, 36, 0.96)"),
        (e.fillStyle = d),
        e.fillRect(0, 0, t, i),
        (e.strokeStyle = "rgba(255, 255, 255, 0.14)"),
        (e.lineWidth = 1),
        e.beginPath(),
        e.moveTo(0, i * 0.5),
        e.lineTo(t, i * 0.5),
        e.moveTo(t * 0.5, 0),
        e.lineTo(t * 0.5, i),
        e.arc(t * 0.5, i * 0.5, Math.min(t, i) * 0.32, 0, Math.PI * 2),
        e.stroke();
    }
    const n = performance.now() - this.lastVisualSwing.timestamp,
      h = n < 550,
      p = this.webcamActive ? this.smoothedCentroid.x * t : t * 0.5,
      f = this.webcamActive ? this.smoothedCentroid.y * i : i * 0.52;
    e.save();
    const s = ((this.phoneState.orientation.roll || this.aimBiasX * 28) * Math.PI) / 180;
    e.translate(p, f),
      e.rotate(s),
      (e.strokeStyle = h ? "#dfff00" : "#00c8ff"),
      (e.lineWidth = 2.2),
      e.beginPath(),
      e.ellipse(0, 0, 14, 18, 0, 0, Math.PI * 2),
      e.stroke(),
      e.beginPath(),
      e.moveTo(0, 18),
      e.lineTo(0, 28),
      e.stroke(),
      e.restore();
    let l = this.webcamActive ? this.motionVector.vx * 26 : 0,
      r = this.webcamActive ? this.motionVector.vy * 26 : 0;
    if (h) {
      const d = 1 - n / 550;
      (l = this.lastVisualSwing.dirX * 36 * d), (r = this.lastVisualSwing.dirY * 32 * d);
    }
    if (Math.hypot(l, r) > 3) {
      const d = p + l,
        m = f + r,
        g = Math.atan2(r, l);
      e.save(),
        (e.strokeStyle = "#dfff00"),
        (e.fillStyle = "#dfff00"),
        (e.lineWidth = 2.5),
        e.beginPath(),
        e.moveTo(p, f),
        e.lineTo(d, m),
        e.stroke(),
        e.beginPath(),
        e.moveTo(d, m),
        e.lineTo(d - 7 * Math.cos(g - 0.5), m - 7 * Math.sin(g - 0.5)),
        e.lineTo(d - 7 * Math.cos(g + 0.5), m - 7 * Math.sin(g + 0.5)),
        e.closePath(),
        e.fill(),
        e.restore();
    }
    const o = h
        ? Math.min(1, (this.lastVisualSwing.speed / 1.6) * (1 - n / 650))
        : Math.min(1, this.motionVector.mag / 1.4),
      y = 5;
    (e.fillStyle = "rgba(0, 0, 0, 0.55)"),
      e.fillRect(6, i - y - 5, t - 12, y),
      (e.fillStyle = o > 0.75 ? "#dfff00" : "#00d2ff"),
      e.fillRect(6, i - y - 5, (t - 12) * o, y),
      (e.fillStyle = h ? "#dfff00" : "rgba(255, 255, 255, 0.9)"),
      (e.font = "bold 9px sans-serif");
    let P = this.webcamActive
      ? "CAM OPTICAL FLOW"
      : this.phoneState.connected
        ? "POCKET RACKET LIVE"
        : "MOTION RADAR";
    if (h) {
      const d =
          this.lastVisualSwing.side === "backhand"
            ? "BH"
            : this.lastVisualSwing.side === "forehand"
              ? "FH"
              : "",
        m = (this.lastVisualSwing.shotType || "topspin").toUpperCase();
      P = d ? `${d} \u2022 ${m}` : m;
    }
    e.fillText(P, 6, 12);
  }
  _updateWebcamBadgeUI(e) {
    const t = document.getElementById("webcam-status-badge") || document.getElementById("btn-webcam");
    t && t.classList.toggle("active", e);
  }
  _updatePhoneBadgeUI(e) {
    const t = document.getElementById("phone-status-badge") || document.getElementById("phone-racket-status");
    t &&
      (t.classList.toggle("connected", e),
      (t.textContent = e ? "Pocket Racket: Connected" : "Pocket Racket: Ready"));
  }
  _updateHudShotPills(e) {
    if (typeof document > "u") return;
    const t = document.querySelectorAll("[data-shot-type]");
    !t ||
      t.length === 0 ||
      t.forEach((i) => {
        i.classList.toggle("active", i.dataset.shotType === e);
      });
  }
  _notifyStatus(e) {
    typeof this.onStatusChange == "function" && this.onStatusChange(e);
    for (const t of this._listeners.status)
      try {
        t(e);
      } catch (i) {
        console.error(i);
      }
  }
  dispose() {
    (this._disposed = !0),
      this.disableWebcam(),
      this.stopPhonePolling(),
      this._rafId && cancelAnimationFrame(this._rafId),
      window.removeEventListener("keydown", this._onKeyDown),
      window.removeEventListener("keyup", this._onKeyUp),
      window.removeEventListener("pointerdown", this._onPointerDown),
      window.removeEventListener("pointermove", this._onPointerMove),
      window.removeEventListener("pointerup", this._onPointerUp);
  }
}
export default MotionController;
