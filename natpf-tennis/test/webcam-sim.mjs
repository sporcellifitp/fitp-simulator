// Banco di prova sintetico della webcam: traiettorie della mano (swing secchi in 2D e colpi completi in 3D con
// preparazione, caduta della mano, colpo, finale, tenuta e ritorno), proiezione sulla camera specchiata, landmark con
// la taglia vera della mano e la lateralità come le dà il modello, inferenza con latenza e un solo fotogramma in volo
// come nel gioco. Gli eventi escono dal vero motion_controls.js (_processWebcamFrame, _onHandResults): lo stesso
// banco gira anche su una copia del codice di prima (scripts/audit/webcam-sweep.mjs --prima) per il confronto.
// Usato da test/natpf-webcam-classifier.test.mjs (sottoinsieme veloce) e da scripts/audit/webcam-sweep.mjs (completo).
export function mulberry32(a){ return function(){ a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0)/4294967296; }; }
export function gauss(rng){ let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }

// Keyframe per un DESTRO, coordinate fisiche (m): X destra del giocatore, Y altezza, Z verso la webcam.
// Fasi: pronto(0) → fine preparazione(0,45) → caduta/anello(0,62) → impatto(0,82) → accompagnamento(0,95) →
// finale(1,12) → tenuta(1,50) → ritorno(2,20) → fermo(2,70)
const R = (x, y, z) => [x, y, z];
export const STROKES = {
  FH_TOP:   { side: 'forehand', type: 'topspin', keys: [R(.18,1.05,.30), R(.60,1.35,-.30), R(.62,.88,-.25), R(.40,.98,.45), R(.00,1.25,.55), R(-.38,1.58,.10), R(-.40,1.60,.05)] },
  FH_FLAT:  { side: 'forehand', type: 'flat',    keys: [R(.18,1.05,.30), R(.60,1.25,-.30), R(.60,1.00,-.25), R(.40,1.00,.45), R(.00,1.10,.55), R(-.38,1.30,.15), R(-.40,1.32,.10)] },
  FH_SLICE: { side: 'forehand', type: 'slice',   keys: [R(.18,1.05,.30), R(.55,1.50,-.25), R(.55,1.30,-.10), R(.38,.98,.45), R(.10,.90,.65), R(-.20,.98,.45), R(-.22,1.00,.42)] },
  BH_TOP:   { side: 'backhand', type: 'topspin', keys: [R(.12,1.05,.30), R(-.50,1.25,-.25), R(-.50,.88,-.20), R(-.30,.98,.45), R(.05,1.25,.55), R(.42,1.62,.10), R(.44,1.64,.05)] },
  BH_FLAT:  { side: 'backhand', type: 'flat',    keys: [R(.12,1.05,.30), R(-.50,1.20,-.25), R(-.50,1.00,-.20), R(-.30,1.00,.45), R(.05,1.10,.55), R(.42,1.30,.15), R(.44,1.32,.10)] },
  BH_SLICE: { side: 'backhand', type: 'slice',   keys: [R(.12,1.05,.30), R(-.48,1.48,-.20), R(-.48,1.30,-.05), R(-.30,.98,.45), R(-.02,.90,.62), R(.28,.98,.45), R(.30,1.00,.42)] },
  FH_LOB:   { side: 'forehand', type: 'lob',     keys: [R(.18,1.05,.30), R(.55,1.15,-.25), R(.55,.80,-.15), R(.38,.92,.40), R(.25,1.40,.45), R(.05,1.85,.20), R(.03,1.87,.15)] },
  SMASH:    { side: 'overhead', type: 'smash',   keys: [R(.18,1.05,.30), R(.35,1.85,-.25), R(.30,1.75,-.30), R(.28,2.05,.35), R(.05,1.45,.45), R(-.25,.95,.25), R(-.27,.93,.22)] },
};
// Catmull-Rom non uniforme (Barry-Goldman) sui tempi dei keyframe
function catmull(ts, ps, t){
  let i = 0; while (i < ts.length - 2 && t > ts[i + 1]) i++;
  const i0 = Math.max(0, i - 1), i1 = i, i2 = i + 1, i3 = Math.min(ts.length - 1, i + 2);
  const t0 = i0 === i1 ? ts[i1] - (ts[i2] - ts[i1]) : ts[i0], t1 = ts[i1], t2 = ts[i2], t3 = i3 === i2 ? ts[i2] + (ts[i2] - ts[i1]) : ts[i3];
  const P0 = i0 === i1 ? ps[i1].map((v, k) => 2*v - ps[i2][k]) : ps[i0], P1 = ps[i1], P2 = ps[i2], P3 = i3 === i2 ? ps[i2].map((v, k) => 2*v - ps[i1][k]) : ps[i3];
  const tt = Math.max(t1, Math.min(t2, t));
  const L = (A, B, ta, tb) => A.map((v, k) => ((tb - tt)*v + (tt - ta)*B[k])/(tb - ta));
  const A1 = L(P0, P1, t0, t1), A2 = L(P1, P2, t1, t2), A3 = L(P2, P3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}
// traiettoria completa (con ritorno alla posizione di attesa). dropK: quanto scende la mano dopo la preparazione,
// prepK: durata della preparazione, tempo: scala di tutto il colpo
export function strokePath(stroke, { hand = 'right', amp = 1, tempo = 1, x0 = 0, hScale = 1, dropK = 1, prepK = 1 } = {}){
  const k0 = STROKES[stroke].keys.map(p => [...p]);
  k0[2][1] = k0[1][1] + (k0[2][1] - k0[1][1])*dropK;
  const keys = [...k0, k0[0], k0[0]];
  const d = [0, .45*prepK, .17, .20, .13, .17, .38, .70, .50].map(v => v*tempo);
  const ts = d.map((_, i) => d.slice(0, i + 1).reduce((a, b) => a + b, 0));
  const mir = hand === 'left' ? -1 : 1;
  const ps = keys.map(([x, y, z]) => [x0 + mir*x*amp, (1.15 + (y - 1.15)*amp)*hScale, z*amp]);
  return { at: t => catmull(ts, ps, Math.max(0, Math.min(ts[ts.length - 1], t))), tEnd: ts[ts.length - 1], tFwd: ts[2], tContact: ts[3], tFinish: ts[5] };
}
// webcam a distanza D (m) dal piano del giocatore, altezza Hc, inclinazione tiltDeg (verso il basso), FOV orizzontale
// e aspetto; immagine SPECCHIATA come nel gioco (S = 1 - x): destra del giocatore = destra dell'immagine
export function makeCamera({ D = 2, Hc = 1.1, tiltDeg = 0, hfovDeg = 62, aspect = 4/3 } = {}){
  const th = tiltDeg*Math.PI/180, tanH = Math.tan(hfovDeg*Math.PI/360), tanV = tanH/aspect;
  return ([X, Y, Z]) => {
    const ry = Y - Hc, rz = Z - D, depth = -ry*Math.sin(th) - rz*Math.cos(th), yc = ry*Math.cos(th) - rz*Math.sin(th);
    return { S: .5 + X/(2*depth*tanH), y: .5 - yc/(2*depth*tanV), depth };
  };
}
// 21 landmark come li dà il modello (x non specchiata, y verso il basso) per una mano con il punto seguito in (S, y),
// lunghezza polso–nocca del medio «size» (larghezze dell'immagine) e asse inclinato di «angle» (0 = dita in alto)
export function handLandmarks({ S, y, size = .0395, aspect = .75, angle = 0 }){
  // asse u (polso → nocca) e perpendicolare v in unità uguali sui due assi; x del modello non specchiata, y in altezze
  const ux = Math.sin(angle), uy = -Math.cos(angle), vx = Math.cos(angle), vy = Math.sin(angle);
  const cx = 1 - S, P = (a, b) => ({ x: cx - (ux*a + vx*b)*size, y: y + (uy*a + vy*b)*size/aspect, z: 0 });
  const lm = Array.from({ length: 21 }, (_, i) => P(.45 + .25*(i % 4), -.35 + .1*Math.floor(i/4)));
  lm[0] = P(-.55, 0); lm[9] = P(.45, 0); lm[5] = P(.42, .3); lm[17] = P(.36, -.32); lm[13] = P(.43, -.12);
  return lm;
}
const LABEL = { right: 'Left', left: 'Right' };          // il modello vede l'immagine non specchiata

// controller finto sul prototipo vero: solo i campi che usa la webcam
export function makeFake(MC, { aspect = .75, canToss = () => false, hand = 'right', tracker = null } = {}){
  const f = Object.create(MC.prototype);
  const staticCtx = { save(){}, scale(){}, drawImage(){}, restore(){}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w*h*4).fill(128) }) };
  Object.assign(f, {
    webcamActive: true, videoElem: { readyState: 4, currentTime: 0, videoWidth: 640, videoHeight: Math.round(640*aspect) }, _lastVideoTime: undefined,
    latestHandLandmarks: null, latestHandSeenAt: -1e9, _hasNewHandResult: false, _mpBusy: false,
    smoothedCentroid: { x: .5, y: .5 }, motionVector: { vx: 0, vy: 0, mag: 0 }, lastWebcamTriggerMs: -1e9,
    handTracker: { push(){}, reset(){} }, _webcamTrail: null, _lastWebcamSource: null,
    flowWidth: 64, flowHeight: 48, hasPrevFrame: false, prevLuma: new Float32Array(64*48), motionEnergyMap: new Float32Array(64*48),
    offscreenCtx: staticCtx, phoneState: { orientation: { pitch: 0, roll: 0 } }, role: 'p1', _listeners: { swing: [], toss: [], status: [], orientation: [] },
    _strokes: tracker, _handTrack: null, handPreference: hand, canToss, onTrack: null,
  });
  f.events = [];
  f._emitSwing = e => { f.events.push({ kind: 'swing', t: performance.now(), side: e.side ?? null, shotType: e.shotType, speed: e.speed, dirX: e.dirX, dirY: e.dirY, src: f._lastWebcamSource }); };
  f._emitToss = e => { f.events.push({ kind: 'toss', t: performance.now(), side: e.side ?? null, shotType: 'lob', speed: e.speed, dirX: e.dirX, dirY: e.dirY, src: f._lastWebcamSource }); };
  return f;
}
// risultato del modello: con il codice nuovo passa da _onHandResults (scelta della mano), con quello di prima la
// prima mano della lista va diretta nei campi che leggeva _processWebcamFrame
function deliver(f, hands, now){
  if (typeof f._onHandResults === 'function') return f._onHandResults({ multiHandLandmarks: hands.map(h => h.lm), multiHandedness: hands.map(h => ({ label: h.label, score: h.score ?? .92 })) });
  f._mpBusy = false;
  if (hands.length){ f.latestHandLandmarks = hands[0].lm; f.latestHandSeenAt = now; f._hasNewHandResult = true; } else f.latestHandLandmarks = null;
}
// ciclo del gioco a 60 Hz: fotogrammi della camera a fps, inferenza con latenza lat (ms) e un solo invio in volo.
// model false: il modello delle mani non c'è (non caricato): resta solo il flusso ottico
function runLoop(f, { total, fps, lat, rng, handsAt, model = true }){
  const realNow = performance.now; let NOW = 0; performance.now = () => NOW;
  try {
    let inflight = null, frameT = 0;
    f.mpHands = model ? { send: () => { inflight = { capT: frameT, doneT: NOW + lat*(.85 + .3*rng()) }; return Promise.resolve(); } } : null;
    for (let T = 0; T <= total; T += 1/60){
      NOW = T*1000;
      const k = Math.floor((T - .008)*fps); frameT = Math.max(0, k/fps); f.videoElem.currentTime = frameT;
      if (inflight && inflight.doneT <= NOW){ const c = inflight.capT; inflight = null; f._mpBusy = false; deliver(f, handsAt(c), NOW); }
      f._processWebcamFrame();
    }
  } finally { performance.now = realNow; }
  return f.events;
}
const asp = cam => 1/(cam.aspect ?? 4/3);

// colpo completo in 3D. Eventi con ts = tempo dall'inizio del colpo (s)
export function runTrial(MC, { stroke, hand = 'right', amp = 1, tempo = 1, D = 2, cam = {}, fps = 30, lat = 30, noise = .003, seed = 1, dropK = 1, prepK = 1, canToss = () => false, tracker = null }){
  const rng = mulberry32(seed), aspect = asp(cam);
  const path = strokePath(stroke, { hand, amp, tempo, x0: (rng() - .5)*.5, hScale: .88 + rng()*.17, dropK, prepK });
  const proj = makeCamera({ D, ...cam }), f = makeFake(MC, { aspect, canToss, hand, tracker });
  const lead = .6, tanH = Math.tan((cam.hfovDeg ?? 62)*Math.PI/360), mir = hand === 'left' ? -1 : 1;
  const handsAt = c => {
    const p = proj(path.at(c - lead)), size = .095/(2*p.depth*tanH);
    return [{ lm: handLandmarks({ S: p.S + gauss(rng)*noise, y: p.y + gauss(rng)*noise, size: size*(.92 + .08*rng()), aspect, angle: .3*mir }), label: LABEL[hand] }];
  };
  // conferme dei colpi anticipati (solo diagnostica, al gioco non arrivano)
  const confirms = [];
  f.onTrack = d => { if (d.kind === 'confirm') confirms.push({ ts: performance.now()/1000 - lead, side: d.side, shotType: d.shotType }); };
  const ev = runLoop(f, { total: lead + path.tEnd + .3, fps, lat, rng, handsAt });
  return { events: ev.map(e => ({ ...e, ts: e.t/1000 - lead })), confirms, path };
}
// swing secco in 2D da fermo (profilo minimum-jerk): dir ±1 (verso nell'immagine specchiata), dS ampiezza
// (larghezze), ratio salita/spostamento fisici, T durata, curve 2 = la salita (o la discesa) si concentra in un tratto
const mj = t => (t <= 0 ? 0 : t >= 1 ? 1 : 10*t**3 - 15*t**4 + 6*t**5);
export function sweep({ dir, dS, ratio, aspect, T, curve, yMid = .5 }){
  const dy = ratio*dS*(1/aspect), S0 = .5 - dir*dS/2, y0 = yMid + dy/2;
  const g = s => (curve === 1 ? s : ratio >= 0 ? s*s : 1 - (1 - s)**2);
  return t => { const s = mj(t/T); return { S: S0 + dir*dS*s, y: y0 - dy*g(s) }; };
}
export function runSweep(MC, { pathFn, T, aspect = .75, fps = 30, lat = 22, noise = .003, seed = 1, hand = 'right', canToss = () => false, tracker = null }){
  const rng = mulberry32(seed), f = makeFake(MC, { aspect, canToss, hand, tracker }), lead = .5;
  const handsAt = c => { const p = pathFn(Math.max(0, c - lead)); return [{ lm: handLandmarks({ S: p.S + gauss(rng)*noise, y: p.y + gauss(rng)*noise, aspect }), label: LABEL[hand] }]; };
  const ev = runLoop(f, { total: lead + T + .9, fps, lat, rng, handsAt });
  return ev.map(e => ({ ...e, ts: e.t/1000 - lead }));
}
// fotogrammi sintetici 64×48 per il flusso ottico (già specchiati, come dopo drawImage): sfondo con tessitura, la mano
// (macchia chiara) e, se c'è, un passante (sagoma scura alta). scene(t) → [{ S, y, rx, ry, c }] al tempo del video
export function flowCtx(f, scene, seed = 99){
  const W = 64, H = 48, rnd = mulberry32(seed), bg = Float32Array.from({ length: W*H }, () => .35 + .2*rnd());
  return { save(){}, scale(){}, drawImage(){}, restore(){}, getImageData(){
    const sc = scene(f.videoElem.currentTime), data = new Uint8ClampedArray(W*H*4);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++){
      let L = bg[j*W + i];
      for (const b of sc){ const dx = (i + .5)/W - b.S, dy = ((j + .5)/H - b.y)*H/W; if ((dx/b.rx)**2 + (dy/b.ry)**2 <= 1) L = b.c; }
      const v = Math.max(0, Math.min(255, (L + gauss(rnd)*.01)*255)), k = (j*W + i)*4;
      data[k] = data[k + 1] = data[k + 2] = v; data[k + 3] = 255;
    }
    return { data };
  } };
}
// swing 2D con la mano persa dal modello per il mosso (probabilità che cresce con lo spostamento durante l'esposizione,
// da blurLo a blurHi pixel su 640×480) e il flusso ottico di riserva sui fotogrammi sintetici; passante(t) facoltativo
export function runDropout(MC, { pathFn, T, fps = 30, lat = 22, noise = .003, seed = 1, hand = 'right', exposure = 1/60, blurLo = 8, blurHi = 20, passante = null, tracker = null, model = true }){
  const rng = mulberry32(seed), aspect = .75, f = makeFake(MC, { aspect, hand, tracker }), lead = .5;
  const at = c => pathFn(Math.max(0, c - lead));
  f.offscreenCtx = flowCtx(f, c => { const p = at(c), s = [{ S: p.S, y: p.y, rx: .045, ry: .05, c: .9 }]; if (passante){ const b = passante(c); s.push({ S: b.S, y: b.y, rx: .05, ry: .2, c: .08 }); } return s; }, seed + 7);
  let lost = 0, seen = 0;
  const handsAt = c => {
    const a = at(c), b = at(c + exposure), blur = Math.hypot((b.S - a.S)*640, (b.y - a.y)*480);
    if (rng() < Math.max(0, Math.min(1, (blur - blurLo)/(blurHi - blurLo)))){ lost++; return []; }
    seen++; return [{ lm: handLandmarks({ S: a.S + gauss(rng)*noise, y: a.y + gauss(rng)*noise, aspect }), label: LABEL[hand] }];
  };
  const ev = runLoop(f, { total: lead + T + .9, fps, lat, rng, handsAt, model });
  return { events: ev.map(e => ({ ...e, ts: e.t/1000 - lead })), lost, seen };
}
// folla: una seconda mano (passante o mano libera) visibile da on[0] a on[1] s, che il modello mette in testa alla
// lista; il giocatore fa due rovesci a 1,6 e 3,2 s
export function runCrowd(MC, { seed = 1, on = [1, 2.6], label = 'Left', size = .036, at = { S: .22, y: .4 }, fps = 30, lat = 22, tracker = null }){
  const rng = mulberry32(seed), aspect = .75, f = makeFake(MC, { aspect, tracker });
  const bh = sweep({ dir: 1, dS: .4, ratio: .2, aspect, T: .25, curve: 1, yMid: .55 }), swings = [1.6, 3.2];
  const player = t => {
    for (const t0 of swings){
      const u = t - t0, A = bh(0), B = bh(.25);
      if (u >= 0 && u <= .25){ const p = bh(u); return { S: p.S + .12, y: p.y }; }
      if (u > .25 && u <= .45) return { S: B.S + .12, y: B.y };
      if (u > .45 && u <= 1.45){ const k = mj((u - .45)/1); return { S: B.S + .12 + (A.S - B.S)*k, y: B.y + (A.y - B.y)*k }; }
    }
    const A = bh(0); return { S: A.S + .12 + .004*Math.sin(5*t), y: A.y };
  };
  const handsAt = c => {
    const p = player(c), me = { lm: handLandmarks({ S: p.S + gauss(rng)*.003, y: p.y + gauss(rng)*.003, aspect }), label: 'Left' };
    const by = c >= on[0] && c < on[1] ? [{ lm: handLandmarks({ S: at.S + .01*Math.sin(3*c), y: at.y, size, aspect }), label }] : [];
    return [...by, me];
  };
  const ev = runLoop(f, { total: 4.2, fps, lat, rng, handsAt });
  return ev.map(e => ({ ...e, ts: e.t/1000 }));
}
// scena libera: handsAt(c, rng) → mani viste nel fotogramma catturato a c secondi (più persone, mano persa, tremolio);
// flow(c) facoltativo: le sagome per il flusso ottico di riserva (flowCtx). Eventi con ts in secondi
export function runScene(MC, { total, handsAt, flow = null, fps = 30, lat = 22, seed = 1, hand = 'right', aspect = .75, tracker = null }){
  const rng = mulberry32(seed), f = makeFake(MC, { aspect, hand, tracker });
  if (flow) f.offscreenCtx = flowCtx(f, flow, seed + 7);
  const ev = runLoop(f, { total, fps, lat, rng, handsAt: c => handsAt(c, rng) });
  return ev.map(e => ({ ...e, ts: e.t/1000 }));
}
export { LABEL as MODEL_LABEL, mj as minJerk };
// Un solo soggetto: chi gioca (destro, mano a riposo in rest) fa i colpi di strokes ([istante s, verso nell'immagine:
// −1 dritto, +1 rovescio]: swing di dS larghezze in 0,25 s, tenuta 0,2 s, ritorno in 1 s); un'altra persona (other:
// posizione, taglia e lateralità della sua mano; dietro = più piccola, accanto alla stessa distanza = stessa taglia)
// resta nell'inquadratura tutto il tempo e a otherSwing s fa un gesto ampio nella sua zona (otherAmp larghezze di
// lato, andata in 0,3 s e ritorno in 1 s). lose: [da, a] s in cui il modello non trova la mano di chi gioca (mosso,
// fuori dall'inquadratura); jitter: rumore dei punti della mano (tremolio); other null: chi gioca da solo. Eventi con
// ts in s; picks: mano persa e ritrovata (onTrack), con il motivo.
export function runTwoPeople(MC, { seed = 1, rest = { S: .62, y: .55 }, dS = .3, strokes = [[2.8, -1], [4.6, 1]], other = { S: .3, y: .42, size: .028 }, label = 'Left', otherSwing = 3.4, otherAmp = .15, lose = null, jitter = .003, total = 6.2, fps = 30, lat = 22, tracker = null } = {}){
  const rng = mulberry32(seed), aspect = .75, f = makeFake(MC, { aspect, tracker });
  const picks = [];
  f.onTrack = d => { if (d.kind === 'lost' || d.kind === 'found') picks.push({ t: performance.now()/1000, kind: d.kind, reason: d.reason }); };
  const player = t => {
    for (const [t0, dir] of strokes){
      const u = t - t0, end = rest.S + dir*dS;
      if (u >= 0 && u <= .25) return { S: rest.S + (end - rest.S)*mj(u/.25), y: rest.y - .03*Math.sin(Math.PI*u/.25) };
      if (u > .25 && u <= .45) return { S: end, y: rest.y };
      if (u > .45 && u <= 1.45) return { S: end + (rest.S - end)*mj(u - .45), y: rest.y };
    }
    return { S: rest.S + .004*Math.sin(5*t), y: rest.y };
  };
  const by = t => {
    const u = t - otherSwing;
    if (u >= 0 && u <= .3) return { S: other.S + otherAmp*mj(u/.3), y: other.y - .04*Math.sin(Math.PI*u/.3) };
    if (u > .3 && u <= 1.3) return { S: other.S + otherAmp*(1 - mj(u - .3)), y: other.y };
    return { S: other.S + .005*Math.sin(3*t), y: other.y };
  };
  const handsAt = c => {
    const b = other && by(c), out = other ? [{ lm: handLandmarks({ S: b.S + gauss(rng)*jitter, y: b.y + gauss(rng)*jitter, size: other.size, aspect }), label }] : [];
    if (!(lose && c >= lose[0] && c < lose[1])){ const p = player(c); out.push({ lm: handLandmarks({ S: p.S + gauss(rng)*jitter, y: p.y + gauss(rng)*jitter, aspect }), label: 'Left' }); }
    return out;
  };
  const ev = runLoop(f, { total, fps, lat, rng, handsAt });
  return { events: ev.map(e => ({ ...e, ts: e.t/1000 })), picks };
}
// Nel motore vero (senza disegno): la CPU manda la palla, il gesto ha l'impatto quando la palla è allo sweet spot
// (0,1 m davanti al giocatore) e il colpo della webcam arriva dt secondi dopo (dt dal riconoscimento: negativo = prima).
// Per ogni colpo: tenuto fino allo sweet spot o no, e il voto del motore (PERFECT, EARLY, LATE, VERY LATE, WHIFF, niente).
export async function engineSwings(swings, { difficulty = 'casual', seed = 7, maxSeconds = 900 } = {}){
  const { createHeadlessEngine, mulberry32: rand } = await import('../scripts/audit/headless-engine.mjs');
  const realRandom = Math.random; Math.random = rand(seed);
  const out = [];
  try {
    const e = createHeadlessEngine({ difficulty }), grades = [], DT = 1/120;
    e.hud = new Proxy({}, { get: (t, k) => (k === 'showTimingPopup' ? ({ grade = '' } = {}) => grades.push(String(grade)) : () => {}) });
    e.startNewMatch({ showStartBanner: false });
    let i = 0, plan = null, serveAt = null;
    for (let t = 0; t < maxSeconds && i < swings.length; t += DT){
      if (e.phase === 'SERVE_STANCE' && e.score.server === 'player' && e.phaseTimer > .6){ e._handleUserTossInput({}); serveAt = e.elapsedTime + .55; }
      if (e.phase === 'SERVE_TOSS' && e.score.server === 'player' && serveAt != null && e.elapsedTime >= serveAt){ serveAt = null; e._handleUserSwingInput({ source: 'audit', speed: 1.2 }); }
      if (e.phase === 'RALLY' && e.ball.inPlay && e.ball.lastHitter === 'opponent' && e.ball.vel.z > .5 && e.ball.pos.z > -6){
        if (!plan) plan = { ...swings[i], sent: false, from: 0 };
        const r = e.ball.pos.z - e.player.pos.z, tti = (-.1 - r)/Math.max(.5, e.ball.vel.z - e.player.vel.z);
        if (!plan.sent && tti <= -plan.dt){
          plan.sent = true; plan.from = grades.length; plan.ballSpeed = e.ball.vel.z;
          e._handleUserSwingInput({ source: 'webcam', side: plan.side, shotType: plan.shotType, speed: plan.speed, dirX: plan.dirX, dirY: plan.dirY });
          plan.held = !!e.pendingUserSwing?.waitForSweetSpot;
          // racchetta virtuale: palla che va fuori, chi gioca la lascia andare (lo swing non la tocca)
        }
      }
      e.step(DT);
      // fine del colpo: la palla l'ha colpita il giocatore, oppure il punto è finito
      if (plan?.sent && (e.ball.lastHitter === 'player' || e.phase !== 'RALLY')){
        const g = grades.slice(plan.from).find(s => !/^P2 /.test(s)) || (e.natpfPlan?.kind === 'letgo' ? 'lasciata' : 'niente');
        out.push({ dt: plan.dt, held: plan.held, ballSpeed: plan.ballSpeed, grade: /WHIFF/.test(g) ? 'WHIFF' : g.split(' • ')[0] || 'niente' });
        plan = null; i++;
      }
    }
  } finally { Math.random = realRandom; }
  return out;
}
// colpo come lo vede il motore: il mancino ha dritto e rovescio scambiati da NatpfHand (solo sugli swing); un lancio
// rifiutato nello scambio diventava un pallonetto (codice di prima)
const swap = s => (s === 'forehand' ? 'backhand' : s === 'backhand' ? 'forehand' : s);
export function engineView(ev, hand){
  if (!ev) return { side: null, shot: null, label: 'niente' };
  const side = hand === 'left' && ev.kind === 'swing' ? swap(ev.side) : ev.side;
  const shot = ev.kind === 'toss' ? 'lob(lancio)' : ev.shotType;
  return { side, shot, label: `${side === 'forehand' ? 'FH' : side === 'backhand' ? 'BH' : '?'}·${shot}` };
}

// ---------- Webcam «argon» (predefinita, motion_controls._argonFrame) da 1 a 4 m ----------
// Camere: sensore 16:9 con il suo campo orizzontale; «prima» la webcam si apriva a 640×480 (4:3: di solito i lati del
// sensore tagliati, campo più stretto), «dopo» al formato dentro 1280×720 (webcam_roi.js). Integrate dei portatili
// (720p, 70–78°, all'altezza del portatile) ed esterne (1080p, 78–90°, sopra lo schermo e inclinate in giù).
export const ARGON_CAMS = {
  'portatile 720p 70°': { hfovDeg: 70, nativeW: 1280, nativeH: 720, Hc: 1.1, tiltDeg: 0 },
  'portatile 720p 78°': { hfovDeg: 78, nativeW: 1280, nativeH: 720, Hc: 1.1, tiltDeg: 0 },
  'esterna 1080p 78°': { hfovDeg: 78, nativeW: 1920, nativeH: 1080, Hc: 1.5, tiltDeg: 10 },
  'esterna 1080p 90°': { hfovDeg: 90, nativeW: 1920, nativeH: 1080, Hc: 1.5, tiltDeg: 10 },
};
// formato in cui si apre la camera: { w, h, hfovDeg } (campo orizzontale dell'immagine data)
export function argonCapture(cam, after){
  if (!after) return { w: 640, h: 480, hfovDeg: 2*Math.atan(Math.tan(cam.hfovDeg*Math.PI/360)*.75)*180/Math.PI };
  const k = Math.min(1, 1280/cam.nativeW, 720/cam.nativeH);
  return { w: Math.round(cam.nativeW*k), h: Math.round(cam.nativeH*k), hfovDeg: cam.hfovDeg };
}
// Modello delle mani IPOTIZZATO (non misurato oltre i 3 m; tarato perché a 2–3 m con 640×480 4:3 veda la mano quasi
// sempre, come l'81% dei fotogrammi del video dell'E14 con il mosso): il palmo si trova se la mano è almeno
// detMin–detFull della larghezza dell'immagine data al modello (ridotta a 192×192 per la ricerca del palmo); una mano già
// seguita resta se ha abbastanza pixel veri (trkPx); il mosso nell'esposizione oltre metà della mano la fa perdere.
// Rumore dei punti: noisePx pixel dell'immagine data al modello più noiseRel della mano.
export const ARGON_MODEL = { detMin: .014, detFull: .03, trkPxMin: 5, trkPxFull: 12, blurLo: .4, blurHi: 1.2, exposure: 1/60, noisePx: 1, noiseRel: .03, maxModelW: 640 };
const ramp = (v, a, b) => Math.max(0, Math.min(1, (v - a)/(b - a)));
const FULL_ROI = { x: 0, y: 0, w: 1, h: 1, full: true };
// controller per la webcam argon: come makeFake, con il modo «argon», la camera dell'esperimento e un canvas finto per
// il ritaglio (il codice di prima non lo usa)
export function makeArgonFake(MC, { cap, hand = 'right', canToss = () => false } = {}){
  const f = makeFake(MC, { aspect: cap.h/cap.w, hand, canToss });
  Object.assign(f, { webcamMode: 'argon', latestHandSeenAt: null, lastWebcamTriggerMs: 0 });
  f.videoElem.videoWidth = cap.w; f.videoElem.videoHeight = cap.h;
  f._roiCtx = { canvas: { width: 0, height: 0 }, drawImage(){} };
  return f;
}
// ciclo a 60 Hz con il modello ipotizzato: pathAt(c) → punto 3D della mano al tempo c (o null); il risultato arriva
// sul ritaglio dato al modello (f._mpRoi al momento dell'invio) con i punti nelle sue coordinate
function runArgonLoop(f, { total, fps, lat, rng, cap, proj, pathAt, flow = true, M = ARGON_MODEL }){
  const realNow = performance.now; let NOW = 0; performance.now = () => NOW;
  const tanH = Math.tan(cap.hfovDeg*Math.PI/360), aspect = cap.h/cap.w;
  const stats = { sent: 0, seen: 0, inImage: 0, crop: 0, inputPx: 0 };
  let tracked = false;
  const look = c => { const P = pathAt(c); if (!P) return null; const p = proj(P); return p.depth > .2 ? { ...p, size: .095/(2*p.depth*tanH) } : null; };
  if (flow) f.offscreenCtx = flowCtx(f, c => { const h = look(c); if (!h || h.S < 0 || h.S > 1 || h.y < 0 || h.y > 1) return []; const r = Math.max(.008, h.size*.8); return [{ S: h.S, y: h.y, rx: r, ry: r*1.1, c: .9 }]; }, 4242);
  try {
    let inflight = null, frameT = 0;
    f.mpHands = { send: () => { const roi = f._mpRoi && !f._mpRoi.full ? { ...f._mpRoi } : FULL_ROI; inflight = { capT: frameT, doneT: NOW + lat*(.85 + .3*rng()), roi }; return Promise.resolve(); } };
    for (let T = 0; T <= total; T += 1/60){
      NOW = T*1000;
      const k = Math.floor((T - .008)*fps); frameT = Math.max(0, k/fps); f.videoElem.currentTime = frameT;
      if (inflight && inflight.doneT <= NOW){
        const { capT, roi } = inflight; inflight = null; f._mpBusy = false;
        const h = look(capT), inputW = roi.full ? cap.w : Math.min(M.maxModelW, roi.w*cap.w);
        stats.sent++; stats.inputPx += inputW*inputW*aspect; if (!roi.full) stats.crop++;
        let lm = null;
        if (h && h.S >= 0 && h.S <= 1 && h.y >= 0 && h.y <= 1){
          stats.inImage++;
          const rx = 1 - h.S, inRoi = rx >= roi.x && rx <= roi.x + roi.w && h.y >= roi.y && h.y <= roi.y + roi.h;
          const hb = look(capT + M.exposure), blur = hb ? Math.hypot(hb.S - h.S, (hb.y - h.y)*aspect)/h.size : 0;
          const px = h.size*Math.min(cap.w, inputW/roi.w), det = ramp(h.size/roi.w, M.detMin, M.detFull), trk = ramp(px, M.trkPxMin, M.trkPxFull);
          const p = inRoi ? (tracked ? trk : Math.min(det, trk))*(1 - ramp(blur, M.blurLo, M.blurHi)) : 0;
          if (rng() < p){
            const sd = Math.hypot(M.noisePx*roi.w/inputW, M.noiseRel*h.size);
            const full = handLandmarks({ S: h.S + gauss(rng)*sd, y: h.y + gauss(rng)*sd, size: h.size, aspect, angle: .3 });
            lm = full.map(q => ({ x: (q.x - roi.x)/roi.w, y: (q.y - roi.y)/roi.h, z: 0 }));
          }
        }
        tracked = !!lm; if (lm) stats.seen++;
        f._onArgonHandResults({ multiHandLandmarks: lm ? [lm] : [] });
      }
      f._processWebcamFrame();
    }
  } finally { performance.now = realNow; }
  return stats;
}
// colpo completo in 3D (strokePath) a D metri dalla camera cam (after false: 640×480 come prima, true: formato nuovo)
export function runArgonTrial(MC, { stroke, hand = 'right', D = 2, cam, after = true, amp = 1, tempo = 1, fps = 30, lat = 30, seed = 1, M = ARGON_MODEL }){
  const rng = mulberry32(seed), cap = argonCapture(cam, after), f = makeArgonFake(MC, { cap, hand });
  const path = strokePath(stroke, { hand, amp, tempo, x0: (rng() - .5)*.5, hScale: .88 + rng()*.17 });
  const proj = makeCamera({ D, Hc: cam.Hc, tiltDeg: cam.tiltDeg, hfovDeg: cap.hfovDeg, aspect: cap.w/cap.h }), lead = 1.2;
  const stats = runArgonLoop(f, { total: lead + path.tEnd + .3, fps, lat, rng, cap, proj, pathAt: c => path.at(c - lead), M });
  return { events: f.events.map(e => ({ ...e, ts: e.t/1000 - lead })), path, stats };
}
// lo swing della guida della webcam («uno swing della mano verso sinistra o verso destra quando la palla arriva»): la
// mano attraversa davanti al corpo di width metri in T secondi (profilo minimum-jerk, un po' in avanti a metà e rise
// metri in su), resta ferma 0,4 s e torna in back×T secondi. dir: verso nel mondo (+1 = verso la destra di chi gioca:
// rovescio del destro, dritto del mancino). Eventi con ts dall'inizio dello swing (s)
export function runArgonSwing(MC, { dir = -1, width = .8, T = .25, rise = .1, back = 4, hand = 'right', D = 2, cam, after = true, fps = 30, lat = 30, seed = 1, M = ARGON_MODEL }){
  const rng = mulberry32(seed), cap = argonCapture(cam, after), f = makeArgonFake(MC, { cap, hand });
  const proj = makeCamera({ D, Hc: cam.Hc, tiltDeg: cam.tiltDeg, hfovDeg: cap.hfovDeg, aspect: cap.w/cap.h }), lead = 1.2;
  const x0 = (rng() - .5)*.4 + (hand === 'left' ? -1 : 1)*.1, A = x0 - dir*width/2, B = x0 + dir*width/2, y0 = 1.05 + (rng() - .5)*.15;
  const pathAt = c => {
    const t = c - lead;
    if (t < 0) return [A + .01*Math.sin(3*c), y0 + .01*Math.sin(2*c), .25];
    if (t <= T){ const s = mj(t/T); return [A + (B - A)*s, y0 + rise*s, .25 + .15*Math.sin(Math.PI*s)]; }
    if (t <= T + .4) return [B, y0 + rise, .25];
    const s = mj((t - T - .4)/(back*T)); return [B + (A - B)*s, y0 + rise*(1 - s), .25];
  };
  const stats = runArgonLoop(f, { total: lead + T + .4 + back*T + .4, fps, lat, rng, cap, proj, pathAt, M });
  // lo swing resta nell'inquadratura (inizio, metà e fine con la mano dentro): vicino alla camera uno swing largo esce
  const inFrame = [0, T/2, T].every(t => { const p = proj(pathAt(lead + t)); return p.S > .03 && p.S < .97 && p.y > .03 && p.y < .97; });
  return { events: f.events.map(e => ({ ...e, ts: e.t/1000 - lead })), stats, inFrame };
}
// chi gioca fermo in attesa (dondola, sposta la mano di qualche centimetro) per total secondi: colpi falsi
export function runArgonIdle(MC, { hand = 'right', D = 2, cam, after = true, total = 8, fps = 30, lat = 30, seed = 1, sway = .05, M = ARGON_MODEL }){
  const rng = mulberry32(seed), cap = argonCapture(cam, after), f = makeArgonFake(MC, { cap, hand });
  const proj = makeCamera({ D, Hc: cam.Hc, tiltDeg: cam.tiltDeg, hfovDeg: cap.hfovDeg, aspect: cap.w/cap.h });
  const ph = [rng()*6, rng()*6, rng()*6], x0 = (rng() - .5)*.4, mir = hand === 'left' ? -1 : 1;
  const pathAt = c => [x0 + mir*.18 + sway*Math.sin(1.3*c + ph[0]) + .5*sway*Math.sin(3.1*c + ph[1]), 1.05 + .6*sway*Math.sin(2.2*c + ph[2]), .3 + .4*sway*Math.sin(.9*c)];
  const stats = runArgonLoop(f, { total, fps, lat, rng, cap, proj, pathAt, M });
  return { events: f.events, stats };
}
