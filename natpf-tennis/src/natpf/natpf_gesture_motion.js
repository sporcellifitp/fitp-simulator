// Moti dei gesti del tutorial: UNA sola definizione per l'animazione 3D (natpf_gesture_demo.js) e per la verifica con
// il rilevatore vero del telefono (test/natpf-gesture-demo.test.mjs fa eseguire questi stessi moti al braccio simulato
// di test/arm-sim.mjs e controlla che il gioco riconosca il colpo mostrato). Senza DOM e senza three.js.
//
// Formato del colpo (lo stesso di arm-sim.armSwing): il telefono nel pugno gira con il braccio attorno a un perno
// (la spalla) di un angolo φ attorno all'asse `axis` (campo: x a destra, y in alto, −z verso lo schermo, giocatore
// destro); `rc` è il vettore spalla → mano all'impatto (m); il picco di velocità è `peak` °/s, la parte veloce dura `ms`.
// Prima la preparazione lenta (−metà dell'angolo a 90 °/s), poi il colpo, poi il ritorno lento. `wrist`: rotazione del
// polso (°/s di picco) attorno a `wristAxis` nella seconda metà del colpo. `preYaw`: gradi di rotazione del piatto
// attorno alla verticale prima del colpo (mira: positivo = piatto girato a sinistra).
// Presa: telefono in piedi nel pugno, display di lato (a destra per il destro), cima inclinata in avanti di ~30°.

export const GRIP_TILT = 30;     // gradi: cima del telefono in avanti (figura della presa, grip-art.js)
const D = Math.PI/180;

// colpi tipici del destro, gli stessi verificati nei test dei gesti (arm-sim.STROKES) o varianti verificate qui
const S = Object.freeze({
  forehand: { axis: [-.18, 1, .08], peak: 650, ms: 260, rc: [.45, -.5, -.25], wrist: 350, wristAxis: [0, 0, -1] },
  backhand: { axis: [.18, -1, .08], peak: 600, ms: 260, rc: [-.45, -.5, -.25], wrist: -300, wristAxis: [0, 0, -1] },
  flat:     { axis: [0, 1, 0], peak: 1000, ms: 220, rc: [.45, -.5, -.25], wrist: 0, wristAxis: [0, 0, -1] },
  volley:   { axis: [-.18, 1, .08], peak: 480, ms: 200, rc: [.45, -.42, -.42], wrist: 150, wristAxis: [0, 0, -1] },
  lob:      { axis: [1, .35, 0], peak: 520, ms: 300, rc: [.3, -.55, -.3] },
  drop:     { axis: [-1, .45, 0], peak: 330, ms: 240, rc: [.3, -.35, -.45], wrist: -250, wristAxis: [0, 0, -1] },
  slice:    { axis: [-.6, 1, 0], peak: 600, ms: 260, rc: [.45, -.4, -.3] },
  smash:    { axis: [-1, 0, 0], peak: 700, ms: 240, rc: [.15, .5, -.3] },
  toss:     { axis: [1, 0, 0], peak: 300, ms: 420, rc: [.25, -.35, -.4] },
});

// Gesti del tutorial. expect: cosa deve riconoscere il gioco (verificato nei test). cues: le tre cose da guardare.
// ball: come arriva la palla nell'animazione ('ground' dopo il rimbalzo, 'volley' al volo, 'high' alta, 'toss' lancio)
export const GESTURES = Object.freeze({
  ready: { id: 'ready', label: 'Posizione di partenza', still: true,
    cues: ['Telefono in piedi nel pugno', 'Display di lato, cima un poco in avanti', 'Braccio rilassato, di fronte allo schermo'] },
  grip: { id: 'grip', label: 'Impugnatura', still: true, turntable: true,
    cues: ['Come il manico di una racchetta', 'Dita attorno ai lati lunghi', 'Dal computer si vede solo il bordo'] },
  forehand: { id: 'forehand', label: 'Dritto', stroke: S.forehand, ball: 'ground', expect: { shot: ['topspin'], side: 'forehand' },
    cues: ['Rotazione attorno a te, in orizzontale', 'Dall’esterno verso il corpo', 'Un poco dal basso verso l’alto'] },
  backhand: { id: 'backhand', label: 'Rovescio', stroke: S.backhand, ball: 'ground', expect: { shot: ['topspin'], side: 'backhand' },
    cues: ['Rotazione orizzontale, verso opposto', 'Parti da davanti al corpo', 'Chiudi verso l’esterno'] },
  flat: { id: 'flat', label: 'Colpo piatto', stroke: S.flat, ball: 'ground', expect: { shot: ['flat'], side: 'forehand' },
    cues: ['Come il dritto, ma più veloce', 'Traiettoria orizzontale', 'Senza alzare la mano'] },
  volley: { id: 'volley', label: 'Volée', stroke: S.volley, ball: 'volley', expect: { shot: ['topspin'], side: 'forehand' }, short: true,
    cues: ['A rete, palla al volo', 'Gesto corto, quasi senza preparazione', 'Il telefono resta davanti a te'] },
  lob: { id: 'lob', label: 'Pallonetto', stroke: S.lob, ball: 'ground', expect: { shot: ['lob'] },
    cues: ['Gesto in verticale', 'Dal basso verso l’alto', 'La mano sale davvero'] },
  drop: { id: 'drop', label: 'Palla corta', stroke: S.drop, ball: 'ground', expect: { shot: ['drop'] }, soft: true,
    cues: ['Dall’alto verso il basso', 'Lento e morbido', 'Gesto corto, come una carezza'] },
  slice: { id: 'slice', label: 'Tagliato', stroke: S.slice, ball: 'ground', expect: { shot: ['slice'] },
    cues: ['Dall’alto verso il basso', 'Deciso, non lento', 'Più ampio della palla corta'] },
  smash: { id: 'smash', label: 'Schiacciata', stroke: S.smash, ball: 'high', ballHigh: true, expect: { shot: ['smash'] },
    cues: ['Palla alta sopra la testa', 'Braccio in alto, poi giù deciso', 'Colpisci prima del rimbalzo'] },
  serve: { id: 'serve', label: 'Servizio', toss: S.toss, stroke: S.smash, ball: 'toss', ballHigh: true, expect: { messages: 2 },
    cues: ['1 · Alza il telefono: lanci la palla', '2 · Aspetta che arrivi in alto', '3 · Colpisci dall’alto, deciso'] },
  cross: { id: 'cross', label: 'Incrociato', stroke: S.forehand, preYaw: 22, ball: 'ground', aim: -1, expect: { shot: ['topspin'], side: 'forehand', aim: -1 },
    cues: ['Display girato verso il centro', 'Colpisci un attimo prima', 'La palla va nell’altra metà del campo'] },
  line: { id: 'line', label: 'Lungolinea', stroke: S.forehand, preYaw: -22, ball: 'ground', aim: 1, expect: { shot: ['topspin'], side: 'forehand', aim: 1 },
    cues: ['Display girato verso l’esterno', 'Colpisci un attimo dopo', 'La palla corre lungo il tuo lato'] },
});
export const gestureById = id => GESTURES[id] || null;

/* ---------- vettori ---------- */
const len = v => Math.hypot(v[0], v[1], v[2]);
const unit = v => { const l = len(v) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };
const cross3 = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const dot3 = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
export const rotate = (v, a, ang) => { const c = Math.cos(ang), s = Math.sin(ang), k = cross3(a, v), d = dot3(a, v); return v.map((x, j) => x*c + k[j]*s + a[j]*d*(1 - c)); };
// Specchio per il mancino (x → −x): un vettore cambia x, un asse di rotazione (pseudovettore) cambia y e z
export const mirrorVec = v => [-v[0], v[1], v[2]];
export const mirrorAxis = a => [a[0], -a[1], -a[2]];
export function mirrorStroke(s){
  if (!s) return s;
  return { ...s, axis: mirrorAxis(s.axis), rc: mirrorVec(s.rc), ...(s.wristAxis ? { wristAxis: mirrorAxis(s.wristAxis) } : {}) };
}
// colpo per la mano: il destro è quello scritto, il mancino lo specchio
export const strokeFor = (s, hand = 'right') => (hand === 'left' ? mirrorStroke(s) : s);

/* ---------- linea del tempo dell'animazione ---------- */
// Tappe (secondi, al tempo reale) di un colpo come in arm-sim.armSwing: attesa, preparazione a 90 °/s, colpo veloce,
// pausa di 0,12 s, ritorno a 90 °/s, attesa. short: volée, quasi senza preparazione.
const travel = s => s.peak*s.ms/1000*.5;                // gradi percorsi nella parte veloce
export function strokeTimeline(s, { short = false, hold = .55, rest = .12, pause = .7 } = {}){
  const half = travel(s)/2, prep = short ? .08 : half/90, ret = half/90;
  const t0 = hold, t1 = t0 + prep, t2 = t1 + s.ms/1000, t3 = t2 + rest, t4 = t3 + ret, t5 = t4 + pause;
  return { half, hold: t0, prep: t1, hit: t1 + s.ms/2000, swing: t2, rest: t3, back: t4, total: t5 };
}
// angolo del braccio φ (gradi) al tempo t della linea del tempo: 0 = posizione d'impatto. Nella parte veloce la
// velocità è peak·sin²(πu), come nel braccio simulato
const ease = x => x < 0 ? 0 : x > 1 ? 1 : x*x*(3 - 2*x);
export function strokeAngle(s, t, tl = strokeTimeline(s)){
  const H = tl.half, prepFrom = 0;
  if (t <= tl.hold) return prepFrom;
  if (t <= tl.prep) return -H*ease((t - tl.hold)/(tl.prep - tl.hold));
  if (t <= tl.swing){
    const u = (t - tl.prep)/(tl.swing - tl.prep), ms = s.ms/1000;
    return s.peak*ms*(u/2 - Math.sin(2*Math.PI*u)/(4*Math.PI)) - H;
  }
  if (t <= tl.rest) return H;
  if (t <= tl.back) return H*(1 - ease((t - tl.rest)/(tl.back - tl.rest)));
  return 0;
}
// velocità angolare del braccio (°/s) al tempo t (per la scia e l'indicatore di velocità)
export function strokeSpeed(s, t, tl = strokeTimeline(s)){
  if (t > tl.prep && t <= tl.swing){ const u = (t - tl.prep)/(tl.swing - tl.prep); return s.peak*Math.sin(Math.PI*u)**2; }
  if ((t > tl.hold && t <= tl.prep) || (t > tl.rest && t <= tl.back)) return 90;
  return 0;
}
// rotazione del polso (gradi) accumulata al tempo t: nella seconda metà del colpo, poi torna con il ritorno
export function wristAngle(s, t, tl = strokeTimeline(s)){
  if (!s.wrist) return 0;
  const ms = s.ms/1000, at = u => {
    // ∫ wrist·sin²(π·(1,4u − 0,2)) du su (0,2/1,4 … 1) come in armSwing
    const a = Math.max(0, Math.min(1, u*1.4 - .2)); return s.wrist*ms/1.4*(a/2 - Math.sin(2*Math.PI*a)/(4*Math.PI));
  };
  const full = at(1);
  if (t <= tl.prep) return 0;
  if (t <= tl.swing) return at((t - tl.prep)/(tl.swing - tl.prep));
  if (t <= tl.rest) return full;
  if (t <= tl.back) return full*(1 - ease((t - tl.rest)/(tl.back - tl.rest)));
  return 0;
}
// Posa al tempo t: posizione della mano rispetto alla spalla (m, campo) e rotazioni da applicare al telefono, nell'ordine:
// presa (GRIP_TILT, display di lato) → preYaw → braccio (axis, φ) → polso (asse del polso ruotato con il braccio, ψ).
export function strokePose(s, t, { hand = 'right', short = false, preYaw = 0 } = {}){
  const st = strokeFor(s, hand), tl = strokeTimeline(st, { short });
  const A = unit(st.axis), phi = strokeAngle(st, t, tl)*D;
  const handPos = rotate(st.rc, A, phi);
  const WA = st.wristAxis ? unit(rotate(unit(st.wristAxis), A, phi)) : null;
  return { hand: handPos, axis: A, phi, wristAxis: WA, psi: wristAngle(st, t, tl)*D, preYaw: (hand === 'left' ? -preYaw : preYaw)*D, speed: strokeSpeed(st, t, tl), tl };
}
// Servizio: lancio (gesto verso l'alto, lento) e battuta (dall'alto, deciso) nella stessa linea del tempo; la palla sale
// dopo il lancio e la battuta arriva quando è in cima. Restituisce le due fasi e l'altezza della palla.
export function serveTimeline(g = GESTURES.serve){
  const a = strokeTimeline(g.toss, { hold: .5, pause: 0, rest: .05 }), b = strokeTimeline(g.stroke, { hold: 0, pause: .9 });
  // la battuta parte quando il lancio ha finito la parte veloce; la palla è in cima a metà della battuta
  const hitStart = a.swing + .25;
  return { toss: a, stroke: b, hitStart, apex: hitStart + b.hit, total: hitStart + b.total };
}
// palla del lancio: sale dalla mano (all'uscita del lancio) e scende; altezza sopra la spalla (m) al tempo t
export function tossBall(t, st = serveTimeline()){
  const release = st.toss.hit, up = st.apex - release;
  if (t < release) return null;
  const k = (t - release)/up, h = 1.15*(1 - (1 - k)*(1 - k));      // parabola con il colmo all'impatto
  return k > 1.6 ? null : h;
}
