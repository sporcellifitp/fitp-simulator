// Dove punta il piatto della racchetta, sul telefono, senza DOM (testabile con Node). Vale per entrambe le prese: il
// piatto è la normale al dorso del telefono (−z). Presa verticale (manico, l'unica in gioco): il dorso guarda dove va
// la palla al momento dell'impatto. Presa orizzontale (non più offerta): il dorso guarda la rete come le corde.
//
// Riferimento: la posa di riposo della calibrazione («pronto, piatto verso la rete»). La gravità di quel momento dà
// l'alto; la normale del dorso (−z del telefono) proiettata in orizzontale dà l'avanti, verso la rete; destra = avanti × alto.
// Ogni campione del giroscopio ruota il quaternione telefono → riferimento; la gravità misurata, quando il telefono non
// accelera, corregge l'inclinazione (filtro complementare alla Mahony). L'imbardata non ha un riferimento assoluto: deriva
// piano e, quando il telefono è fermo, la posa «pronto» la segue lentamente.
//   yaw   > 0: piatto girato verso destra  (palla a destra)      < 0: verso sinistra
//   pitch > 0: piatto aperto verso l'alto (lob, palla corta)    < 0: chiuso (colpo coperto)
//   roll:      rotazione del telefono attorno alla normale del piatto (solo presentazione)
// Gli eventi devicemotion sono nel riferimento del dispositivo, qualunque sia l'orientamento dello schermo.
const D = Math.PI/180;
const len = v => Math.hypot(v[0], v[1], v[2]);
const unit = v => { const l = len(v); return l > 1e-9 ? v.map(x => x/l) : [0, 0, 0]; };
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0], a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
const qnorm = q => { const l = Math.hypot(...q) || 1; return q.map(v => v/l); };
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
// angolo (rad) della componente di rotazione di q attorno all'asse unitario a (scomposizione swing-twist)
export const twistAbout = (q, a) => { const p = dot([q[0], q[1], q[2]], a); return wrapRad(2*Math.atan2(p, q[3])); };
const wrapRad = a => { while (a > Math.PI) a -= 2*Math.PI; while (a < -Math.PI) a += 2*Math.PI; return a; };
export const rotate = (q, v) => qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)).slice(0, 3);
const wrap = a => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const FACE = Object.freeze({
  kp: 2.2,            // guadagno della correzione con la gravità (1/s)
  quietRate: 25,      // °/s: sotto, il telefono è «fermo» e l'imbardata «pronto» lo segue
  relax: .9,          // s: costante di tempo con cui la posa «pronto» segue il telefono fermo
  quietHold: 150,     // ms fermo prima che la posa «pronto» inizi a seguire (presa verticale: più lungo, vedi racchetta.js)
  history: 1500,      // ms di storia: piatto all'istante del picco e posa ferma prima del colpo
  aimYaw: 40,         // °: imbardata del piatto oltre il proprio colpo abituale che vale circa 3/4 della mira (curva morbida)
  maxAimYaw: 80,      // °: oltre, la misura non è credibile (gesto molto ampio, piatto quasi orizzontale): mira dal tempo
  baseFrom: 900, baseTo: 60,  // ms prima dell'inizio del colpo in cui cercare l'istante più fermo (la posa di partenza)
});

// gesti di calibrazione: il piatto «tipico» all'impatto per ogni verso del gesto (+1 / −1), da togliere in partita
export function faceReference(samples){
  const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m])/2) : 0; };
  const out = {};
  for (const dir of [1, -1]){
    const xs = samples.filter(s => s && s.dir === dir && Number.isFinite(s.yaw));
    if (xs.length) out[dir] = { yaw: +med(xs.map(s => s.yaw)).toFixed(1), pitch: +med(xs.map(s => s.pitch)).toFixed(1), angle: med(xs.map(s => s.angle || 0)) };
  }
  return out;
}
// Angolo del piatto voluto: quello all'impatto meno quello abituale del proprio gesto dritto (dalla calibrazione),
// scalato con l'ampiezza del gesto. Restituisce gradi e la mira −1…+1.
export function aimFromFace(face, ref, { dir = 0, angle = 0 } = {}){
  if (!face || !Number.isFinite(face.yaw)) return null;
  const r = ref?.[dir] || null, scale = r && r.angle > 0 && angle > 0 ? clamp(angle/r.angle, .5, 1.8) : 1;
  const yaw = wrap(face.yaw - (r ? r.yaw*scale : 0)), pitch = face.pitch - (r ? r.pitch : 0);
  // curva morbida: solo un piatto girato con decisione arriva in fondo (con i gesti veri la mira lineare era quasi
  // sempre ±1); oltre maxAimYaw la misura non vale e la mira la decide il tempo del colpo (aim null)
  const aim = Math.abs(yaw) > FACE.maxAimYaw ? null : +Math.tanh(yaw/FACE.aimYaw).toFixed(3);
  return { yaw: +yaw.toFixed(1), pitch: +pitch.toFixed(1), roll: +(face.roll || 0).toFixed(1), aim };
}

export function createFaceTracker(opts = {}){
  const C = { ...FACE, ...opts };
  let q = [0, 0, 0, 1], frame = null, bias = [0, 0, 0], lastT = null, readyYaw = 0, quietSince = null, current = null;
  const hist = [];
  function measure(){
    if (!frame) return null;
    const n = rotate(q, [0, 0, -1]), y = rotate(q, [0, 1, 0]);
    const yaw = Math.atan2(dot(n, frame.right), dot(n, frame.fwd))/D;
    const pitch = Math.asin(clamp(dot(n, frame.up), -1, 1))/D - frame.pitch0;
    const roll = Math.asin(clamp(dot(y, frame.up), -1, 1))/D - frame.roll0;
    return { yaw, pitch, roll };
  }
  // quaternione all'istante t (il campione più vicino: per la sola rotazione attorno alla verticale basta)
  const qAt = t => { let b = null; for (const h of hist) if (!b || Math.abs(h.t - t) < Math.abs(b.t - t)) b = h; return b?.q || null; };
  return {
    get ready(){ return !!frame; },
    get quaternion(){ return q.slice(); },
    // posa di riposo: gravità media (riferimento del telefono, verso l'alto) e deriva del giroscopio [α, β, γ] in °/s
    setRest(gravity, gyroBias = [0, 0, 0]){
      const up = unit(gravity || [0, 1, 0]);
      if (!len(up)) return false;
      let fwd = [0, 0, -1].map((v, i) => v - up[i]*dot([0, 0, -1], up));
      if (len(fwd) < .2) fwd = [0, 1, 0].map((v, i) => v - up[i]*up[1]);       // telefono quasi piatto: avanti = lato lungo
      fwd = unit(fwd);
      frame = { up, fwd, right: cross(fwd, up), pitch0: Math.asin(clamp(-up[2], -1, 1))/D, roll0: Math.asin(clamp(up[1], -1, 1))/D };
      bias = Array.isArray(gyroBias) && gyroBias.length === 3 ? gyroBias.slice() : [0, 0, 0];
      q = [0, 0, 0, 1]; readyYaw = 0; quietSince = null; hist.length = 0; lastT = null; current = { yaw: 0, pitch: 0, roll: 0 };
      return true;
    },
    reset(){ frame = null; q = [0, 0, 0, 1]; hist.length = 0; lastT = null; current = null; },
    // campione di sampleFromMotion: { t (ms), rot [α, β, γ] °/s, acc, accG }
    feed(k){
      if (!frame || !k || !Number.isFinite(k.t)) return null;
      if (lastT != null && k.t <= lastT) return current;
      const dt = lastT == null ? 0 : Math.min(.06, (k.t - lastT)/1000); lastT = k.t;
      // DeviceMotion: alpha attorno a z, beta attorno a x, gamma attorno a y
      const r = k.rot ? [k.rot[1] - bias[1], k.rot[2] - bias[2], k.rot[0] - bias[0]] : [0, 0, 0];
      const rate = len(r);
      let w = r.map(v => v*D);
      if (k.accG){
        const a = len(k.accG), lin = k.acc ? len(k.acc) : Math.abs(a - 9.81);
        if (Math.abs(a - 9.81) < 1.8 && lin < 1.5 && rate < 120){
          const est = rotate(qconj(q), frame.up), e = cross(unit(k.accG), est);
          w = w.map((v, i) => v + C.kp*e[i]);
        }
      }
      const th = len(w)*dt;
      if (th > 1e-9){ const s = Math.sin(th/2)/len(w); q = qnorm(qmul(q, [w[0]*s, w[1]*s, w[2]*s, Math.cos(th/2)])); }
      const m = measure();
      // fermo: la posa «pronto» segue piano l'imbardata (assorbe la deriva e il ritorno in posizione)
      if (rate < C.quietRate){ if (quietSince == null) quietSince = k.t; if (k.t - quietSince > C.quietHold) readyYaw += wrap(m.yaw - readyYaw)*Math.min(1, dt/C.relax); }
      else quietSince = null;
      current = { yaw: +wrap(m.yaw - readyYaw).toFixed(2), pitch: +m.pitch.toFixed(2), roll: +m.roll.toFixed(2) };
      hist.push({ t: k.t, ...current, rate, q: q.slice() }); while (hist.length && k.t - hist[0].t > C.history) hist.shift();
      return current;
    },
    get face(){ return current; },
    // Piatto all'impatto rispetto alla posa di partenza di questo colpo: l'imbardata «pronto» con la mano vera non sta
    // mai ferma (tremolio e piccoli spostamenti tra un colpo e l'altro), quindi il riferimento è l'istante più fermo
    // (velocità media su 5 campioni, a parità di ±2 °/s il più recente) tra baseFrom e baseTo ms prima dell'inizio del
    // colpo t0. Senza storia: faceAt.
    strokeFace(peakT, t0 = peakT){
      const f = this.faceAt(peakT); if (!f) return f;
      const win = hist.filter(h => h.t >= t0 - C.baseFrom && h.t <= t0 - C.baseTo);
      let best = null;
      for (let i = 0; i < win.length; i++){
        const a = win.slice(Math.max(0, i - 2), i + 3), r = a.reduce((s, h) => s + h.rate, 0)/a.length;
        if (!best || r <= best.r + 2) best = { r: Math.min(r, best ? best.r : r), yaw: win[i].yaw, q: win[i].q };   // a parità, il più vicino al colpo
      }
      if (!best) return f;
      // direzione: rotazione del telefono attorno alla verticale tra la posa di partenza e l'impatto (scomposizione
      // swing-twist). Vale con qualunque inclinazione del dorso; l'imbardata della normale del dorso invece perde
      // significato quando il dorso guarda in alto o in basso (nelle registrazioni succedeva in metà dei colpi).
      const qp = qAt(peakT), turn = qp && best.q ? -twistAbout(qmul(qp, qconj(best.q)), frame.up)/D : null;
      return { ...f, yaw: +wrap(turn != null ? turn : f.yaw - best.yaw).toFixed(2), base: +best.yaw.toFixed(1), baseRate: Math.round(best.r) };
    },
    // piatto all'istante t (es. il picco del gesto, che è l'impatto), interpolato tra i due campioni vicini: in un
    // colpo a 1000 °/s due campioni a 60 Hz distano 16°, il campione più vicino sbaglierebbe fino a 8°
    faceAt(t){
      if (!hist.length) return current;
      if (t <= hist[0].t) return { yaw: hist[0].yaw, pitch: hist[0].pitch, roll: hist[0].roll };
      for (let i = 1; i < hist.length; i++){
        const a = hist[i - 1], b = hist[i];
        if (t <= b.t){ const u = (t - a.t)/Math.max(1e-6, b.t - a.t); return { yaw: +(a.yaw + wrap(b.yaw - a.yaw)*u).toFixed(2), pitch: +(a.pitch + (b.pitch - a.pitch)*u).toFixed(2), roll: +(a.roll + (b.roll - a.roll)*u).toFixed(2) }; }
      }
      const z = hist[hist.length - 1];
      return { yaw: z.yaw, pitch: z.pitch, roll: z.roll };
    },
  };
}
// telefono in orizzontale con il display in verticale (presa «piatto»): la gravità sta lungo il lato corto (x)
export const flatGrip = g => !!g && Math.abs(g[0])/Math.max(1e-6, Math.hypot(g[0], g[1], g[2])) >= .6;
