// Webcam del motore base → posa continua della mano sulla racchetta e sul braccio del personaggio.
// motore base usa la webcam (MediaPipe Hands, optical flow di riserva) per far partire i colpi dalla traccia della mano;
// qui la stessa traccia diventa anche un ingresso continuo, come l'inclinazione del telefono (liveInput di
// racket_kinematics.js): dove sta la mano (spostamento laterale e in altezza) e come è girata (rotazione nel piano
// dell'immagine, inclinazione verso la camera). La logica di gioco non cambia: colpi, mira e timing restano del motore base.
//
// Coordinate dei landmark MediaPipe: x, y in [0, 1] sull'immagine della camera (y verso il basso), z profondità
// relativa al polso (negativa verso la camera). Come nel motore base l'immagine è specchiata (vista a specchio): x → 1 - x,
// quindi destra sullo schermo = destra del giocatore.
//   0 polso · 5 nocca dell'indice · 9 nocca del medio · 17 nocca del mignolo
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = v => typeof v === 'number' && Number.isFinite(v);

// Limiti dell'effetto sulla racchetta (radianti e metri nel riferimento del giocatore)
export const HAND_POSE_LIMITS = { tilt: .9, offsetX: .26, offsetY: .24 };

export function handPoseFromLandmarks(lm){
  if (!Array.isArray(lm) || lm.length < 18) return null;
  const w = lm[0], i = lm[5], m = lm[9], p = lm[17];
  if (![w, i, m, p].every(q => q && finite(q.x) && finite(q.y))) return null;
  // stesso centro della mano usato dal motore base per la traccia dei colpi
  const x = 1 - (w.x*.45 + m.x*.55), y = w.y*.45 + m.y*.55;
  const ax = -(m.x - w.x), ay = m.y - w.y;                 // asse della mano polso → medio, specchiato
  const len = Math.hypot(ax, ay);
  if (len < 1e-4) return null;
  // rotazione nel piano dell'immagine: 0 con le dita in alto, + quando le dita piegano verso destra del giocatore
  const roll = Math.atan2(ax, -ay);
  // inclinazione verso la camera: dita più vicine del polso → mano che si apre in avanti
  const dz = finite(m.z) && finite(w.z) ? m.z - w.z : 0;
  const pitch = Math.atan2(-dz, len);
  // larghezza delle nocche rispetto alla lunghezza: palmo di fronte (≈1) o di taglio (≈0); il verso dice quale lato
  const kx = -(p.x - i.x), ky = p.y - i.y;
  const facing = clamp(Math.hypot(kx, ky)/len, 0, 1.5) * Math.sign(kx*(-ay) - ky*ax || 1);
  return { x, y, roll, pitch, facing, size: len, source: 'mediapipe', confidence: 1 };
}

// Optical flow: solo la posizione del movimento, con meno fiducia.
export function handPoseFromFlow(centroid){
  if (!centroid || !finite(centroid.x) || !finite(centroid.y)) return null;
  return { x: centroid.x, y: centroid.y, roll: 0, pitch: 0, facing: 0, size: 0, source: 'flow', confidence: .55 };
}

// Filtro della posa nel tempo: media esponenziale sui campioni nuovi, posizione neutra che si adatta lentamente
// (dove il giocatore tiene la mano a riposo) e dissolvenza verso la posa di riposo quando la mano non si vede.
export class WebcamHandTracker {
  constructor({ smoothing = .45, neutralTauMs = 5000, holdMs = 240, fadeMs = 350 } = {}){
    Object.assign(this, { smoothing, neutralTauMs, holdMs, fadeMs });
    this.reset();
  }
  reset(){ this.pose = null; this.neutral = null; this.lastAt = -Infinity; this.source = null; this.samples = 0; }
  push(pose, now = performance.now()){
    if (!pose) return;
    const k = this.pose && this.source === pose.source ? this.smoothing : 1;
    const prev = this.pose || pose, mix = key => prev[key] + (pose[key] - prev[key])*k;
    this.pose = { x: mix('x'), y: mix('y'), roll: mix('roll'), pitch: mix('pitch'), facing: mix('facing'), confidence: pose.confidence };
    if (!this.neutral) this.neutral = { x: pose.x, y: pose.y, roll: pose.roll, pitch: pose.pitch };
    else {
      const a = 1 - Math.exp(-Math.max(0, now - this.lastAt)/this.neutralTauMs);
      for (const key of ['x', 'y', 'roll', 'pitch']) this.neutral[key] += (this.pose[key] - this.neutral[key])*(finite(a) ? a : 0);
    }
    this.source = pose.source; this.lastAt = now; this.samples++;
  }
  // Ingresso per racket_kinematics (liveInput): inclinazioni in radianti, spostamenti della mano in metri.
  sample(now = performance.now()){
    if (!this.pose || !this.neutral) return null;
    const age = now - this.lastAt;
    const fade = age <= this.holdMs ? 1 : clamp(1 - (age - this.holdMs)/this.fadeMs, 0, 1);
    const c = fade*this.pose.confidence;
    if (c <= 0) return null;
    const L = HAND_POSE_LIMITS, d = key => this.pose[key] - this.neutral[key];
    return {
      // dita che piegano a destra → piatto che ruota nel proprio piano (come il rollio del telefono)
      tiltRoll: clamp(d('roll')*.85, -L.tilt, L.tilt)*c,
      // mano in alto/avanti → testa della racchetta che si alza
      tiltPitch: clamp((-d('y')*2.2 + d('pitch')*.6), -L.tilt, L.tilt)*c,
      // mano verso destra/sinistra → piatto che si apre verso quel lato
      tiltYaw: clamp(d('x')*1.6, -L.tilt, L.tilt)*c,
      handOffsetX: clamp(d('x')*.9, -L.offsetX, L.offsetX)*c,
      handOffsetY: clamp(-d('y')*.8, -L.offsetY, L.offsetY)*c,
      confidence: c,
      source: this.source,
    };
  }
}
