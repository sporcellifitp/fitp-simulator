// Telefono simulato per i test del riconoscimento dei colpi: sensori a 60 Hz con orientamento fisicamente coerente (la
// gravità e l'accelerazione della mano ruotano con il telefono), stessa catena della pagina del telefono
// (site/js/tennis/racchetta.js: rilevatore, filtro d'orientamento, strokeFace e headAt prima del messaggio), calibrazione
// rapida vera, poi la mappatura del gioco con i riferimenti che si adattano ai colpi come in partita (natpf_phone_racket).
// I gesti si descrivono nel riferimento del campo, come si vedono da fuori: x a destra, y in alto, −z verso la rete.
// Serve a riprodurre le prese e i movimenti veri (video del 19/10: telefono in verticale nel pugno, inclinato in avanti,
// schermo girato di lato, pronazione del polso di 60–90° a fine dritto), non solo i gesti «da manuale».
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { createFaceTracker } from '@natpf/tennis/face-tracker.js';
import { createCalibration, QUICK_PLAN } from '@natpf/tennis/calibration.js';
import { swingMessage, parseSwingMessage } from '@natpf/tennis/swing-message.js';
import { strokeShape } from '@natpf/tennis/stroke-shape.js';
import { normalizeSample } from '@natpf/tennis/motion-sign.js';
import { natpfSwingToEngine, NORMAL_SHOTS, habitualRise, createRiseModel, createTypicalModel, powerRefs } from '../src/natpf/natpf_phone_racket.js';
import { createLiftModel, createFaceModel, createAimModel, liftBaselineFromProfile, headBaselineFromProfile } from '../src/natpf/natpf_gestures.js';

export const G = 9.81, DT = 1000/60;
const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0], a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
const rotate = (q, v) => qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)).slice(0, 3);
const qaxis = (axis, deg) => { const h = deg*Math.PI/360, l = Math.hypot(...axis) || 1; return [axis[0]/l*Math.sin(h), axis[1]/l*Math.sin(h), axis[2]/l*Math.sin(h), Math.cos(h)]; };
// generatore deterministico (rumore della mano)
export function rng(seed = 1){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; }; }

// shape: anche la forma del colpo (stroke-shape.js), come la pagina del telefono di oggi; il computer legge allora
// l'intenzione dalla forma (natpf_stroke_intent.js). Senza: il telefono di prima, letto con la tabella dei segnali.
// habitual: false per leggere la forma senza la salita abituale della calibrazione (solo per i confronti)
// ios: accelerazione con il segno di Safari su iPhone (opposto ad Android, motion-sign.js); fix: la pagina del telefono
// la riporta al segno di Android (normalizeSample), come racchetta.js
export function simPhone({ hand = 'right', seed = 7, shape = false, habitual = true, calibrationHeading = true, ios = false, fix = false } = {}){
  const det = createSwingDetector(), face = createFaceTracker({ quietHold: 400, relax: 2.5 });
  const cal = createCalibration(det), R = rng(seed);
  det.on('status', s => { if (s.s === 'still-ok') face.setRest(s.gravity, det.profile.bias); });
  // come racchetta.js: piatto e verso del piatto all'impatto prima del messaggio
  det.on('swing', s => { if (face.ready){ s.face = face.strokeFace(s.peakT, s.t - s.dur); s.head = face.headAt(s.peakT, s.axis); if (shape) s.shape = strokeShape(face.history(), face.up, { peakT: s.peakT }); } });
  const msgs = [];
  let t = 0, seq = 0, ready = false, q = [0, 0, 0, 1];
  det.on('swing', s => { if (ready) msgs.push(JSON.parse(JSON.stringify(swingMessage(s, { grip: 'upright', faceRef: det.profile.faceRef, rtt: 20, now: s.t + 5, seq: ++seq })))); });
  // un campione: velocità di rotazione nel riferimento del campo (°/s) e accelerazione della mano (m/s², campo)
  const sampleWorld = (wWorld, acc = [0, 0, 0]) => {
    const wr = wWorld.map(v => v*Math.PI/180), th = Math.hypot(...wr)*DT/1000;
    // rotazione nel riferimento del telefono (quella che misura il giroscopio)
    const wd = rotate(qconj(q), wr);
    if (th > 1e-9) q = qmul(qaxis(wr, th*180/Math.PI), q);
    const g = rotate(qconj(q), [0, G, 0]), a = rotate(qconj(q), acc);
    const rot = [wd[2], wd[0], wd[1]].map(v => v*180/Math.PI);          // ordine del browser: α(z), β(x), γ(y)
    let k = { t, rot, acc: a, accG: [g[0] + a[0], g[1] + a[1], g[2] + a[2]] };
    if (ios) k = { ...k, acc: k.acc.map(v => -v), accG: k.accG.map(v => -v) };
    if (fix) k = normalizeSample(k, ios ? -1 : 1);
    if (face.ready) face.feed(k);
    det.feed(k); if (cal.state.step !== 'done' && cal.state.step !== 'idle') cal.tick(t, k);
    t += DT;
  };
  const jitter = amp => [0, 1, 2].map(() => (R() - .5)*2*amp);
  // fermo, con il tremolio della mano vera (°/s)
  const rest = (ms, tremor = 0) => { for (const end = t + ms; t < end;) sampleWorld(jitter(tremor)); };
  // porta il telefono in una posa (gradi attorno a un asse del campo) lentamente, sotto la soglia dei colpi
  const pose = (axis, deg, rate = 60) => { const n = Math.max(1, Math.round(Math.abs(deg)/rate*1000/DT)), w = Math.sign(deg)*rate; const l = Math.hypot(...axis); for (let i = 0; i < n; i++) sampleWorld(axis.map(a => a/l*w)); };
  // colpo: rotazione a campana attorno a «axis» (campo) con picco «peak» °/s in «ms», più una rotazione del polso
  // (pronazione) attorno a «wristAxis» che cresce nella seconda metà, più l'accelerazione della mano (campo): spinta nel
  // verso del colpo (push, avanti) e verso l'alto/basso (vy) nella prima metà, frenata nella seconda. back: apertura
  // lenta prima e rientro dopo, come una mano vera.
  // torna lentamente (90 °/s) a un orientamento: la mano che rientra nella sua posa «pronto»
  const returnTo = (target, rate = 90) => {
    const d = qmul(target, qconj(q)), w = Math.max(-1, Math.min(1, d[3]*(d[3] < 0 ? -1 : 1))), ang = 2*Math.acos(w)*180/Math.PI;
    if (ang < .05) return;
    const ax = d[3] < 0 ? [-d[0], -d[1], -d[2]] : [d[0], d[1], d[2]];
    pose(ax, ang, rate);
  };
  const swing = ({ axis = [0, 1, 0], peak = 700, ms = 260, wrist = 0, wristAxis = [0, 0, -1], vy = 0, push = 4, tremor = 0, back = true } = {}) => {
    const n = Math.round(ms/DT), travel = peak*ms/1000*.5, l = Math.hypot(...axis), wl = Math.hypot(...wristAxis);
    const start = q.slice();
    if (back) pose(axis, -travel/2, 90);
    for (let i = 0; i <= n; i++){
      const u = i/n, w = peak*Math.sin(Math.PI*u)**2, pr = wrist*Math.sin(Math.PI*Math.min(1, u*1.4 - .2 > 0 ? u*1.4 - .2 : 0))**2;
      const ww = axis.map(a => a/l*w).map((v, j) => v + wristAxis[j]/wl*pr + jitter(tremor)[j]);
      sampleWorld(ww, [0, vy*Math.sin(2*Math.PI*u), -push*Math.sin(Math.PI*u)]);
    }
    // rientro: la mano torna al centro e il polso torna nella posa di prima (la pronazione non si accumula)
    if (back){ rest(120, tremor); returnTo(start); }
  };
  // calibrazione rapida vera: i gesti alternati del percorso rapido (QUICK_PLAN); opzioni del gesto (peak, ms, wrist,
  // tremor…) come in swing.
  // soft: restituisce l'esito invece di fermarsi (per le prove con prese e gesti diversi)
  // armGesture(w): il gesto della calibrazione fatto da fuori (braccio simulato, test/arm-sim.mjs), w = 'L' o 'R'
  const calibrate = ({ soft = false, rest: pause = 500, tremor = 0, armGesture = null, ...gesture } = {}) => {
    const events = []; const off = cal.on(e => events.push(e));
    cal.start({ quick: true, hand }); rest(800, tremor);
    for (const w of QUICK_PLAN){ if (armGesture) armGesture(w); else swing({ axis: [0, w === 'L' ? 1 : -1, 0], tremor, ...gesture }); rest(pause, tremor); }
    const ok = cal.state.step === 'review' && !!cal.state.result?.pass;
    if (!ok && !soft) throw new Error('calibrazione non riuscita: ' + JSON.stringify(cal.state.result));
    if (ok){ cal.confirm(); ready = true; rest(600, tremor); }
    void off;
    return { ok, step: cal.state.step, result: cal.state.result, attempts: events.filter(e => e.kind === 'attempt').map(e => ({ want: e.want, dir: e.dir, ok: e.ok, why: e.why, peak: Math.round(e.peak) })) };
  };
  // «Salta» durante la calibrazione: profilo semplice (niente colpo tipico né salita abituale), si gioca subito
  const skip = ({ tremor = 0 } = {}) => { cal.start({ quick: true, hand }); rest(800, tremor); const p = cal.skip(); ready = true; rest(600, tremor); return p; };
  // sul computer: come NatpfPhoneRacket._onSwing, con i riferimenti che si adattano ai colpi della partita
  const prof = () => det.profile;
  const lifts = { model: null }, heads = { model: null }, faces = createFaceModel(), aims = createAimModel(), rises = createRiseModel(), typical = createTypicalModel();
  cal.on(e => {
    if (e.kind !== 'done') return;
    aims.reset();
    // false riproduce i telefoni precedenti, il cui profilo non contiene l'heading assoluto.
    if (calibrationHeading && !e.profile?.simple) for (const dir of [1, -1]) aims.seed(dir, e.profile?.faceRef?.[dir]?.heading);
  });
  // rally: colpo nello scambio (impara il colpo tipico, riferimento della forza dal terzo colpo come nel gioco)
  // own: prototipi dei propri gesti (pallonetto e palla corta degli esercizi, natpf_phone_racket.ownShapes)
  // expect: gesto speciale chiesto da un esercizio («lob», «drop»): come nel gioco, non insegna il colpo normale
  const game = (d, { ballHigh = false, rally = true, own = null, expect = null } = {}) => {
    lifts.model ||= createLiftModel(liftBaselineFromProfile(prof()) ?? 0);
    heads.model ||= createLiftModel(headBaselineFromProfile(prof(), hand) ?? 0);
    const s = parseSwingMessage(d, { at: 10, now: 10020 });
    const p = prof(), { ref, rawRef } = powerRefs(p, typical.value);
    const ev = natpfSwingToEngine(s, { hand, now: 10.02, ballHigh, liftBaseline: lifts.model.value, headBaseline: heads.model.value, faceCenter: faces.center(s.dir), aimModel: aims, ref, rawRef, riseRef: habitual ? habitualRise(p, s.dir, rises) : null, own: typeof own === 'function' ? own(s, habitual ? habitualRise(p, s.dir, rises) : null) : own });
    if (!expect && NORMAL_SHOTS.has(ev.natpf.shot)){ lifts.model.add(s.dir, s.lift); heads.model.add(s.dir, ev.natpf.head); }
    if (!expect){ faces.add(s.dir, s.face); aims.add(s.dir, s.heading); }
    if (!expect && ev.natpf.intent) rises.add(s.dir, s.shape?.rise, ev.natpf.intent.shot);
    if (rally && !expect) typical.add(s.peak);
    return { s, ev };
  };
  return { det, face, cal, msgs, rest, pose, swing, calibrate, skip, game, sampleWorld, get t(){ return t; }, get q(){ return q; } };
}
