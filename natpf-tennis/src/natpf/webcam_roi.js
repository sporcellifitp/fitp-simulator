// Webcam da 1 a 4 metri (richiesta dell'utente del 30/10, webcam del portatile o separata), per la webcam per uno
// «argon» (motion_controls._argonFrame). Che cosa limitava la distanza:
//  - il modello delle mani di MediaPipe cerca il palmo nell'immagine intera ridotta a 192×192: conta quanto è grande
//    la mano rispetto all'immagine, non i pixel della camera. Con una webcam da portatile (campo 70–80°) la mano
//    (polso → nocca del medio, ~9,5 cm) è ~0,07 della larghezza a 1 m, ~0,035 a 2 m e ~0,015–0,02 a 4 m: lì il palmo
//    nell'immagine del modello è di 3–4 pixel e non si trova più;
//  - a 640×480 una mano a 4 m è di ~10 pixel: anche quando c'è, i punti tremano e il modello la perde;
//  - le soglie dello zip si applicavano al movimento ingrandito in proporzione alla mano solo fino a ×2,5 (~2,5 m);
//  - a 1 m, con il formato 4:3 (spesso un ritaglio dei lati del sensore 16:9), il colpo largo esce dall'immagine.
// Qui:
//  - camera a 1280×720 (o il formato della camera dentro 1280×720) con almeno 24 fotogrammi al secondo, altrimenti
//    640×480 come prima: più campo visivo a 1 m e più pixel sulla mano a 4 m;
//  - al modello va il video intero come prima (nessuna copia: la ricerca del palmo lo riduce comunque a 192×192, la
//    mano seguita ha più pixel veri); con una mano piccola gli va invece un ritaglio attorno alla mano (ROI,
//    ingrandimento fino a ×2,9) ai pixel veri della camera, copiato in un canvas di al massimo 640 pixel di larghezza,
//    e i punti tornano nelle coordinate dell'immagine intera (roiToFull): per il resto del riconoscimento non cambia
//    niente;
//  - senza mano da un po': un fotogramma all'immagine intera e uno a un ritaglio di ricerca (dove era la mano, o il
//    centro), così una persona a 3–4 m si aggancia anche quando nell'immagine intera il palmo è troppo piccolo.
// Funzioni pure (niente DOM): le prove le usano senza browser.
export const ROI = Object.freeze({
  smallHand: .032,   // mano più piccola di così (oltre ~2,5 m con la webcam di un portatile): ritaglio attorno alla mano
  target: .036,      // grandezza della mano nell'immagine data al modello col ritaglio (come a circa 2 m)
  minFrac: .35,      // ritaglio più piccolo (lato rispetto all'immagine intera): ingrandimento al massimo ×2,9
  fullFrac: .85,     // ritaglio più grande di così: immagine intera
  keep: .28,         // la mano entro questa distanza dal centro del ritaglio (in lati del ritaglio): il ritaglio resta
  resize: .2,        // il ritaglio cambia grandezza solo se quella giusta differisce di più del 20%
  widen: 1.7,        // mano appena persa: un fotogramma su due un ritaglio più largo di tanto (o l'immagine intera)
  lostMs: 700,       // mano non vista da così: ricerca (immagine intera e ritaglio, un fotogramma ciascuno)
  searchFrac: .6,    // ritaglio di ricerca senza una mano piccola recente
  searchMemMs: 6000, // dove cercare: l'ultima mano vista entro così, altrimenti il centro
  maxModelW: 640     // larghezza massima del ritaglio dato al modello (pixel)
});
export const ROI_FULL = Object.freeze({ x: 0, y: 0, w: 1, h: 1, full: true });

const finite = Number.isFinite;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// lato del ritaglio per una mano di grandezza size (larghezze dell'immagine intera): 1 = immagine intera
export function roiFrac(size){
  if (!finite(size) || size <= 0 || size >= ROI.smallHand) return 1;
  const f = clamp(size/ROI.target, ROI.minFrac, 1);
  return f >= ROI.fullFrac ? 1 : f;
}

// ritaglio di lato f (stesse proporzioni dell'immagine) centrato in (cx, cy) dell'immagine NON specchiata, dentro
// l'immagine
export function roiAt(cx, cy, f){
  if (!(f < 1)) return ROI_FULL;
  return { x: clamp(cx - f/2, 0, 1 - f), y: clamp(cy - f/2, 0, 1 - f), w: f, h: f, full: false };
}

// punti del modello sul ritaglio → punti nell'immagine intera (z nella scala di x, come li dà MediaPipe)
export function roiToFull(lm, roi){
  if (!Array.isArray(lm) || !roi || roi.full) return lm;
  return lm.map(p => (p ? { ...p, x: roi.x + p.x*roi.w, y: roi.y + p.y*roi.h, ...(finite(p.z) ? { z: p.z*roi.w } : {}) } : p));
}

// pixel del ritaglio sul video (vw×vh) e grandezza dell'immagine data al modello (al massimo maxModelW di larghezza,
// mai ingrandita: i pixel veri della camera)
export function roiPixels(roi, vw, vh){
  const r = roi || ROI_FULL, sx = Math.round(r.x*vw), sy = Math.round(r.y*vh);
  const sw = Math.max(1, Math.min(vw - sx, Math.round(r.w*vw))), sh = Math.max(1, Math.min(vh - sy, Math.round(r.h*vh)));
  const cw = Math.max(1, Math.min(ROI.maxModelW, sw)), ch = Math.max(1, Math.round(cw*sh/sw));
  return { sx, sy, sw, sh, cw, ch };
}

// Scelta del ritaglio a ogni fotogramma dato al modello. hand: ultima mano seguita { x, y (immagine specchiata, come
// argonHandPoint), size, seenAt } o null; missing: l'ultimo risultato del modello non l'aveva (mano persa da poco).
//  - mano grande (vicina) o nessuna mano piccola recente: immagine intera, salvo la ricerca;
//  - mano piccola vista da poco: ritaglio attorno alla mano, fermo finché la mano resta nella sua parte centrale
//    (il modello segue meglio un'immagine che non si sposta) e della grandezza giusta;
//  - mano piccola appena persa: un fotogramma al ritaglio e uno a un ritaglio più largo (uscita dal ritaglio, mosso);
//  - mano non vista da lostMs: ricerca, un fotogramma all'immagine intera e uno al ritaglio di ricerca.
export class RoiPlanner {
  constructor(){ this.reset(); }
  reset(){ this.roi = ROI_FULL; this.n = 0; }
  next(now, hand = null, missing = false){
    this.n++;
    const known = hand && finite(hand.x) && finite(hand.y) && finite(hand.seenAt);
    const age = known ? now - hand.seenAt : Infinity, f = known ? roiFrac(hand.size) : 1;
    if (known && age <= ROI.lostMs && f < 1){
      const cx = 1 - hand.x, cy = hand.y, r = this.roi;
      const fits = !r.full && Math.abs(f - r.w)/r.w <= ROI.resize && Math.abs(cx - (r.x + r.w/2)) <= r.w*ROI.keep && Math.abs(cy - (r.y + r.h/2)) <= r.h*ROI.keep;
      if (!fits) this.roi = roiAt(cx, cy, f);
      // appena persa (uscita dal ritaglio nel colpo, mosso): un fotogramma su due un ritaglio più largo attorno
      if (!(missing && this.n % 2)) return this.roi;
      const w = Math.min(1, this.roi.w*ROI.widen);
      return w >= ROI.fullFrac ? ROI_FULL : roiAt(this.roi.x + this.roi.w/2, this.roi.y + this.roi.h/2, w);
    }
    if (known && age <= ROI.lostMs) { this.roi = ROI_FULL; return ROI_FULL; }
    // ricerca: dove era la mano (se piccola e vista da poco) o il centro
    if (this.n % 2) return ROI_FULL;
    const near = known && age <= ROI.searchMemMs;
    if (near && f >= 1) return ROI_FULL;   // l'ultima mano vista era grande: basta l'immagine intera
    this.roi = near ? roiAt(1 - hand.x, hand.y, f) : roiAt(.5, .5, ROI.searchFrac);
    return this.roi;
  }
}

// Camera della webcam per uno: il formato della camera dentro 1280×720 (16:9 → 1280×720, 4:3 → 960×720), almeno 24
// fotogrammi al secondo; se non lo dà, 640×480 come prima. caps: track.getCapabilities() (può mancare)
export const SINGLE_CAMERA = Object.freeze({ maxW: 1280, maxH: 720, minFps: 24, fallback: Object.freeze({ width: 640, height: 480 }) });
export function singleCameraAttempts(caps = null){
  const W = caps?.width?.max, H = caps?.height?.max, fb = { ...SINGLE_CAMERA.fallback, frameRate: { ideal: 30 } };
  let size = { width: SINGLE_CAMERA.maxW, height: SINGLE_CAMERA.maxH };
  if (finite(W) && finite(H) && W > 0 && H > 0){
    const k = Math.min(1, SINGLE_CAMERA.maxW/W, SINGLE_CAMERA.maxH/H);
    size = { width: Math.round(W*k), height: Math.round(H*k) };
    // la camera non va oltre 640×480: resta com'è
    if (size.width <= fb.width && size.height <= fb.height) return [fb];
  }
  return [{ ...size, frameRate: { min: SINGLE_CAMERA.minFps, ideal: 30 } }, fb];
}
