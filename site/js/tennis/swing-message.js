// Messaggio «sw» (colpo) tra telefono e computer, scritto e letto in un solo posto: lo usano racchetta.js e link.js
// in LAN e via internet allo stesso modo, e i test lo usano per provare tutta la catena con gli stessi gesti.
// Campi: p forza, l verso verticale, dur, dir, a mira del gesto, c fiducia, pk istante del picco (ms sul telefono),
// lat ritardo stimato, v velocità al picco (°/s), tw rotazione del polso, g/fy/fp/fr/fa piatto all'impatto,
// fu piatto non credibile, sp velocità rispetto al proprio colpo tipico, he verso verticale del colpo (piatto che sale o
// scende mentre ruota, face-tracker.headAt), fh direzione assoluta del piatto all'impatto (gradi), sd ms dal picco al riconoscimento, hd ms di attesa della preparazione, hz Hz dei sensori, n numero, vt gesto verticale,
// an ampiezza dello swing (gradi), sh forma del colpo [piano, salita, rotazione sul manico, inclinazione del manico,
// velocità della testa m/s, velocità della mano m/s] (stroke-shape.js).
import { aimFromFace } from './face-tracker.js';

export function swingMessage(s, { flags = {}, grip = 'upright', faceRef = null, rtt = 80, now = s.t, sampleHz = 60, seq = 0 } = {}){
  // Angolo del piatto all'impatto rispetto al proprio colpo abituale (calibrazione). Presa verticale: senza scalare con
  // l'ampiezza del gesto, che il rilevatore misura con soglie diverse in calibrazione e in partita (lo stesso gesto
  // sembrerebbe mirato di lato); il riferimento è già la posa ferma prima del colpo.
  const fa = s.face ? aimFromFace(s.face, faceRef, { dir: s.dir, angle: grip === 'flat' ? s.angle : 0 }) : null;
  // l: verso verticale intero (−1…+1). Prima si tagliava a ±0,6 mentre il riferimento della calibrazione no: il
  // confronto era falsato e molti colpi normali sembravano tagliati.
  return { t: 'sw', p: s.power, l: Math.max(-1, Math.min(1, s.lift)), ...flags, dur: s.dur, dir: s.dir, a: s.aim, c: s.confidence, pk: s.peakT, lat: rtt/2 + (now - s.peakT),
    v: s.peak, ...(Number.isFinite(s.rawPeak) ? { vr: s.rawPeak } : {}), tw: Number.isFinite(s.features?.twist) ? +s.features.twist.toFixed(3) : undefined,
    ...(fa ? { g: grip, fy: fa.yaw, fp: fa.pitch, fr: fa.roll, ...(fa.aim != null ? { fa: fa.aim } : { fu: 1 }) } : {}),
    ...(Number.isFinite(s.features?.speed) ? { sp: +s.features.speed.toFixed(3) } : {}),
    ...(Number.isFinite(s.head) ? { he: s.head } : {}),
    ...(Number.isFinite(s.face?.abs) && grip !== 'flat' ? { fh: +s.face.abs.toFixed(1) } : {}),
    ...(Number.isFinite(s.angle) ? { an: Math.round(s.angle) } : {}),
    ...(s.shape ? { sh: [s.shape.plane, s.shape.rise, s.shape.roll, s.shape.tilt, s.shape.head, s.shape.hand] } : {}),
    sd: s.detectMs, hd: s.holdMs, hz: Math.round(sampleHz), n: seq, ...(s.vert ? { vt: s.vert } : {}) };
}

// Lettura sul computer. at: istante del picco sull'orologio del computer (s); now: adesso (ms, performance.now)
export function parseSwingMessage(d, { at, now }){
  const n = (v, a, b, def) => typeof v === 'number' && isFinite(v) ? Math.max(a, Math.min(b, v)) : def;
  // fu: piatto misurato ma non credibile (mira null: la decide il tempo del colpo)
  const face = typeof d.fy === 'number' && isFinite(d.fy) ? { yaw: n(d.fy, -180, 180, 0), pitch: n(d.fp, -90, 90, 0), roll: n(d.fr, -180, 180, 0), aim: d.fu ? null : n(d.fa, -1, 1, 0) } : null;
  return { power: n(d.p, 0, 1, .6), lift: n(d.l, -1, 1, 0), lob: !!d.lob, drop: d.drop === true, slice: d.slice === true, dur: n(d.dur, 0, 700, 0), dir: d.dir === 1 ? 1 : d.dir === -1 ? -1 : 0,
    aim: n(d.a, -1, 1, null), confidence: n(d.c, 0, 1, .7), at,
    ...(face ? { grip: d.g === 'flat' ? 'flat' : 'upright', face } : {}),
    ...(typeof d.v === 'number' && isFinite(d.v) ? { peak: n(d.v, 0, 4000, 0) } : {}), ...(typeof d.vr === 'number' && isFinite(d.vr) ? { rawPeak: n(d.vr, 0, 4000, 0) } : {}), ...(typeof d.tw === 'number' && isFinite(d.tw) ? { twist: n(d.tw, -2, 2, 0) } : {}),
    ...(typeof d.sp === 'number' && isFinite(d.sp) ? { speed: n(d.sp, 0, 5, 1) } : {}),
    ...(typeof d.he === 'number' && isFinite(d.he) ? { head: n(d.he, -1, 1, 0) } : {}),
    ...(typeof d.fh === 'number' && isFinite(d.fh) ? { heading: n(d.fh, -180, 180, 0) } : {}),
    ...(typeof d.sd === 'number' ? { detectMs: n(d.sd, 0, 1000, 0) } : {}), ...(typeof d.hd === 'number' ? { holdMs: n(d.hd, 0, 2000, 0) } : {}),
    ...(typeof d.hz === 'number' ? { sampleHz: n(d.hz, 0, 1000, 0) } : {}), ...(Number.isInteger(d.n) ? { seq: d.n } : {}), ...(d.vt === 'up' || d.vt === 'down' || d.vt === 'v' ? { vert: d.vt } : {}),
    ...(typeof d.an === 'number' && isFinite(d.an) ? { angle: n(d.an, 0, 720, 0) } : {}),
    // forma del colpo (telefoni aggiornati): senza, il computer usa i segnali di prima
    ...(Array.isArray(d.sh) && d.sh.length >= 6 && d.sh.slice(0, 6).every(x => typeof x === 'number' && isFinite(x))
      ? { shape: { plane: n(d.sh[0], -1, 1, 0), rise: n(d.sh[1], -1, 1, 0), roll: n(d.sh[2], -1, 1, 0), tilt: n(d.sh[3], -1, 1, 0), head: n(d.sh[4], 0, 60, 0), hand: n(d.sh[5], 0, 30, 0) } } : {}),
    receivedAt: now/1000, sentLat: n(d.lat, 0, 5000, null) };
}
