// Webcam: il colpo dal movimento nell'immagine (rifacimento del 28–29/10, docs/PROJECT_MEMORY.md «Webcam»). Senza DOM.
//
// Prima il colpo si riconosceva dalla posizione della mano (modello delle mani, MediaPipe): con 15–30 fotogrammi al
// secondo e la luce di casa la mano nello swing è mossa e il modello la perde proprio nel colpo (diagnostica
// 20261028-214227-grj6: nessuna fonte nel 59% dei fotogrammi, 4 colpi in 38 s), e ogni inferenza ferma il disegno del
// gioco per 15–40 ms. Qui conta solo quanto si muove l'immagine: la camera ridotta a 96 × 72 in grigio e la differenza con
// il fotogramma prima (energia del movimento). Costo: meno di un millisecondo a fotogramma, nessun modello.
//
// Quando: lo swing è il movimento che sale oltre metà del proprio colpo tipico. Sul video della diagnostica
// 20261028-213510-ukua (giocata con il telefono, webcam a 15 fotogrammi al secondo) quell'istante viene 94 ms prima del
// picco del telefono (mediana, scarto mediano ±25 ms, 9 colpi su 14 entro ±80 ms); il picco del movimento invece arriva
// 95 ms dopo, con uno scarto doppio, e la sua fine troppo tardi per la palla. Il colpo parte quindi appena il movimento
// attraversa la soglia, con l'istante del colpo stimato (lead).
// Cosa no: il verso del movimento (dritto o rovescio) è a caso (22 colpi su 36 dal baricentro): il lato viene dalla palla,
// come la schiacciata (palle alte) e la direzione (dal tempo, natpf_stroke_outcome.js). Pallonetto e palla corta dalla
// webcam non si riconoscono. Il movimento conta solo quando può essere un colpo (palla in arrivo, proprio servizio):
// lo decide il gioco (natpf_impact.webcamGate).
export const MOTION = Object.freeze({
  w: 96, h: 72,          // immagine ridotta
  pix: 18,               // differenza di grigio minima perché un pixel conti come movimento (rumore della camera sotto)
  baseFrames: 60,        // fotogrammi per il movimento di fondo (mediana, 2–4 s)
  onBase: 3,             // lo swing parte oltre questo multiplo del fondo…
  minOn: .012,           // … mai sotto questa energia (stanza ferma: il rumore della camera) …
  ofTypical: .5,         // … e, imparati i propri colpi, a metà del colpo tipico
  typicalKeep: 8, typicalMin: 3,
  lead: 94,              // ms dall'attraversamento della soglia al colpo vero (diagnostica 213510)
  off: .45,              // lo swing finisce sotto questa frazione del suo picco…
  maxMs: 700,            // … o dopo così tanto (ci si sposta, si sistema la camera)
  refractory: 250,       // ms dopo la fine in cui non ne parte un altro (il braccio che torna)
});

// RGBA (ImageData) → grigio, nello stesso buffer di uscita
export function grayFromRGBA(data, n, out = new Uint8Array(n)){
  for (let i = 0, j = 0; i < n; i++, j += 4) out[i] = (data[j]*77 + data[j + 1]*150 + data[j + 2]*29) >> 8;
  return out;
}

// Movimento tra due fotogrammi: energia (frazione dell'immagine pesata per la differenza, 0…1) e baricentro della parte che
// si muove (0…1, per la diagnostica)
export function frameMotion(prev, cur, w, h, pix = MOTION.pix){
  let e = 0, sx = 0, sy = 0;
  for (let y = 1; y < h - 1; y++){
    for (let x = 1; x < w - 1; x++){
      const k = y*w + x, it = cur[k] - prev[k];
      if (it > -pix && it < pix) continue;
      const a = it < 0 ? -it : it;
      e += a; sx += a*x; sy += a*y;
    }
  }
  return { energy: e/(255*(w - 2)*(h - 2)), cx: e ? sx/e/w : null, cy: e ? sy/e/h : null };
}

// fotogramma identico al precedente (la camera ne dà meno di quelli richiesti e il video li ripete): non è un fotogramma
// nuovo. Il rumore del sensore rende diversi due fotogrammi veri
export function sameFrame(a, b){ for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m])/2) : 0; };

// Swing dal movimento. push({ t, gray, w, h }) per ogni fotogramma (t: istante di cattura, ms) →
//   { frame, start, end }: frame { t, energy, thr } (t: metà tra i due fotogrammi confrontati, null per il primo o un
//   doppione); start (lo swing parte: { t attraversamento della soglia, swingT istante stimato del colpo, energy, thr,
//   rel energia sulla soglia }); end (lo swing finisce: { peak, peakT, ms }).
export function createMotionStrokes({ M = MOTION } = {}){
  let prev = null, prevT = null, last = null, cur = null, lastEnd = -1e9;
  const base = [], typical = [];
  const S = { swings: 0 };
  const threshold = () => {
    const bl = median(base), typ = typical.length >= M.typicalMin ? median(typical) : 0;
    return Math.max(M.minOn, bl*M.onBase, typ*M.ofTypical);
  };
  return {
    get state(){ return S; },
    get baseline(){ return median(base); },
    get typical(){ return typical.length >= M.typicalMin ? median(typical) : null; },
    get threshold(){ return threshold(); },
    get active(){ return !!cur; },
    reset(){ prev = null; prevT = null; last = null; cur = null; lastEnd = -1e9; base.length = 0; },
    push({ t, gray, w = M.w, h = M.h }){
      const out = { frame: null, start: null, end: null };
      if (!gray) return out;
      if (!prev || prev.length !== gray.length){ prev = Uint8Array.from(gray); prevT = t; last = null; return out; }
      if (sameFrame(prev, gray)) return out;
      const m = frameMotion(prev, gray, w, h, M.pix), mid = (prevT + t)/2, thr = threshold();
      prev.set(gray); prevT = t;
      const f = out.frame = { t: mid, energy: m.energy, cx: m.cx, cy: m.cy, thr };
      if (cur){
        if (f.energy > cur.peak){ cur.peak = f.energy; cur.peakT = f.t; }
        if (f.energy < cur.peak*M.off || f.t - cur.t >= M.maxMs){
          out.end = { peak: cur.peak, peakT: cur.peakT, ms: Math.round(f.t - cur.t) };
          typical.push(cur.peak); if (typical.length > M.typicalKeep) typical.shift();
          lastEnd = f.t; cur = null;
        }
      } else if (f.energy >= thr && f.t - lastEnd >= M.refractory){
        // istante in cui il movimento attraversa la soglia, tra il fotogramma prima e questo
        const a = last, x = a && a.energy < thr && f.t > a.t ? a.t + (thr - a.energy)/(f.energy - a.energy)*(f.t - a.t) : f.t;
        cur = { t: x, peak: f.energy, peakT: f.t };
        S.swings++;
        out.start = { t: +x.toFixed(1), swingT: +(x + M.lead).toFixed(1), energy: f.energy, thr, rel: f.energy/thr };
      } else {
        base.push(f.energy); if (base.length > M.baseFrames) base.shift();
      }
      last = f;
      return out;
    },
  };
}

// Forza dello swing dalla salita del movimento (energia del fotogramma che attraversa la soglia, sulla soglia): un colpo
// deciso supera la soglia di molto già al primo fotogramma. Velocità del gesto per il gioco (0,5…2, come il telefono):
// 1,15 appena sopra la soglia, fino a 1,6
export const swingSpeed = rel => +Math.max(1.15, Math.min(1.6, 1.15 + .3*(Number(rel) - 1))).toFixed(3);
