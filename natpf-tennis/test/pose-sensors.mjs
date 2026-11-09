// Adattatore «posa animata → sensori» (docs/b9/specifica-gesti.md §6 e Appendice B): campiona a 60 Hz la posa del
// telefono come la DISEGNA un'animazione (posizione e orientamento nel campo) e la fa leggere al telefono simulato
// completo (test/phone-sim.mjs: giroscopio e accelerometro coerenti, rilevatore vero site/js/tennis/swing-detect.js,
// filtro d'orientamento, forma del colpo, calibrazione rapida vera) e poi alla mappatura del gioco
// (natpf_phone_racket → natpf_stroke_intent / natpf_gestures). Così si verifica che ciò che si VEDE sia ciò che il gioco
// riconosce, non un modello separato.
//
// Una «sorgente» di pose è { pose(id, t, hand) → { pos, q }, plan(id) → { total, contact, tossPeak?, kind, ballHigh,
// expect, aim } }: quella nuova (natpf_gesture_pose.js) e quella dell'animazione di prima (legacyPoseSource, la stessa
// composizione di natpf_gesture_demo.pose()), che serve a dimostrare che la verifica trova i difetti della specifica §5.
// Campo: x a destra, y in alto, −z verso lo schermo; telefono y cima, +z schermo; quaternioni [x, y, z, w] telefono → campo.
import { simPhone } from './phone-sim.mjs';
import { armSwing, STROKES, returnTo } from './arm-sim.mjs';
import { GESTURES, GRIP_POSE, GRIP_STYLE, strokePose, strokeTimeline, serveTimeline, mirrorStroke } from '../src/natpf/natpf_gesture_motion.js';

export const DT = 1000/60;
const D = Math.PI/180;
const qmul = (a, b) => [a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1], a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
  a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3], a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]];
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
const qaxis = (ax, ang) => { const l = Math.hypot(...ax) || 1, s = Math.sin(ang/2)/l; return [ax[0]*s, ax[1]*s, ax[2]*s, Math.cos(ang/2)]; };
// velocità angolare nel campo (°/s) che porta qa in qb in dt secondi
export function omega(qa, qb, dt){
  let d = qmul(qb, qconj(qa)); if (d[3] < 0) d = d.map(v => -v);
  const s = Math.hypot(d[0], d[1], d[2]); if (s < 1e-12) return [0, 0, 0];
  const ang = 2*Math.atan2(s, d[3]);
  return [d[0]/s*ang/dt/D, d[1]/s*ang/dt/D, d[2]/s*ang/dt/D];
}
export const mirrorPose = p => ({ ...p, pos: [-p.pos[0], p.pos[1], p.pos[2]], q: [p.q[0], -p.q[1], -p.q[2], p.q[3]] });

// Fa eseguire al telefono simulato la posa animata poseAt(t) da t0 a t1 (tempo del gesto, s). rate: velocità di chi
// imita (1 = tempo reale, 1,25 = più veloce). Prima il telefono si porta lentamente nella posa iniziale e resta fermo
// 0,4 s. after(k): dopo ogni campione (per cambiare il contesto del rilevatore fuori dagli ascoltatori). Restituisce
// l'istante (ms del telefono) che corrisponde a t = 0 del gesto.
// Il campione k (istante p.t del telefono) porta la rotazione dell'intervallo [k, k+1] della posa (differenza in avanti:
// così l'orientamento integrato da sampleWorld coincide con quello disegnato); il suo istante nel gesto è quindi il
// centro dell'intervallo, (k + ½)·passo: la corrispondenza tiene conto di questo mezzo campione (senza, ogni picco
// letto risulterebbe 8,3 ms prima del contatto disegnato).
export function playPose(p, poseAt, { t0 = 0, t1, rate = 1, after = null } = {}){
  returnTo(p, poseAt(t0).q, 60); p.rest(400, 2);
  const dt = DT/1000, dtg = dt*rate, N = Math.round((t1 - t0)/dtg), at = k => poseAt(t0 + k*dtg);
  const start = p.t - t0/rate*1000 - DT/2;
  let prev = at(-1), cur = at(0);
  for (let k = 0; k < N; k++){
    const next = at(k + 1);
    p.sampleWorld(omega(cur.q, next.q, dt), [0, 1, 2].map(j => (next.pos[j] - 2*cur.pos[j] + prev.pos[j])/(dt*dt)));
    after?.(k); prev = cur; cur = next;
  }
  return start;
}

// Telefono simulato con la forma del colpo, fermo nella posa di partenza della sorgente e calibrato con la calibrazione
// rapida vera: cal 'pose' = il dritto e il rovescio DELL'ANIMAZIONE (chi imita il tutorial anche in calibrazione: la scheda
// «Dritto» e la scheda «Rovescio» sono anche la calibrazione, specifica §1.5); 'arm' = quelli del braccio simulato.
export function calibratedPhone(src, { hand = 'right', cal = 'pose', seed = 7 } = {}){
  const p = simPhone({ seed, shape: true, hand });
  returnTo(p, src.pose('forehand', 0, hand).q, 60); p.rest(500, 4);
  const armCal = w => armSwing(p, hand === 'left' ? mirrorStroke(w === 'L' ? STROKES.rovescio : STROKES.dritto) : (w === 'L' ? STROKES.dritto : STROKES.rovescio));
  // «L» è il gesto da destra a sinistra: il dritto del destro, il rovescio del mancino
  const poseCal = w => { const id = (w === 'L') === (hand !== 'left') ? 'forehand' : 'backhand'; playPose(p, t => src.pose(id, t, hand), { t1: src.plan(id).total }); };
  p.calibrate({ armGesture: cal === 'pose' ? poseCal : armCal });
  return p;
}

// Legge una scheda con il telefono calibrato: un ciclo completo della posa (attesa, preparazione, colpo, fermo, ritorno),
// poi 0,9 s fermo. Restituisce i messaggi del telefono, il colpo letto dal gioco per ciascuno e lo scarto tra il picco
// letto e il contatto disegnato (ms). Servizio: contesto serve → toss dopo il primo gesto, come il gioco.
export function readCard(src, id, { hand = 'right', cal = 'pose', rate = 1, seed = 7, phone = null } = {}){
  const P = src.plan(id), p = phone || calibratedPhone(src, { hand, cal, seed }), poseAt = t => src.pose(id, t, hand);
  if (P.kind === 'serve'){
    const ev = []; let sw = false;
    p.det.on('swing', s => { ev.push(s); if (ev.length === 1) sw = true; });
    p.det.setContext('serve');
    const b = p.msgs.length;
    const start = playPose(p, poseAt, { t1: P.total, rate, after: () => { if (sw){ sw = false; p.det.setContext('toss'); } } });
    p.rest(600, 3);
    const msgs = p.msgs.slice(b);
    return { kind: 'serve', msgs, events: ev, gap: ev[1] ? (ev[1].peakT - ev[0].peakT)/1000 : null,
      dPeak: ev[1] ? ev[1].peakT - (start + P.contact/rate*1000) : null, dToss: ev[0] && P.tossPeak != null ? ev[0].peakT - (start + P.tossPeak/rate*1000) : null };
  }
  // mira (incrociato, lungolinea): prima tre colpi normali, come in partita (centro del piatto abituale)
  if (P.aim) for (let i = 0; i < 3; i++){ playPose(p, t => src.pose('forehand', t, hand), { t1: src.plan('forehand').total }); p.rest(600, 4); }
  const b = p.msgs.length;
  const start = playPose(p, poseAt, { t1: P.total, rate });
  p.rest(900, 4);
  const msgs = p.msgs.slice(b), read = msgs.map(d => p.game(d, { ballHigh: !!P.ballHigh }));
  return { kind: P.kind, msgs, read, dPeak: msgs[0] && P.contact != null ? msgs[0].pk - (start + P.contact/rate*1000) : null };
}

// Esito di una scheda rispetto a ciò che mostra: problemi trovati (vuoto = riconosciuta come mostrata).
// allow: colpi ammessi in più (imitazione più lenta o più veloce, dove la velocità è il discriminante).
export function judgeCard(src, id, r, { hand = 'right', allow = null, peakTol = DT + .5, rate = 1 } = {}){
  const P = src.plan(id), why = [], fmt = x => x.ev.natpf.shot + (x.ev.side ? '/' + x.ev.side : '');
  if (P.kind === 'still'){ if (r.msgs.length) why.push(`${r.msgs.length} messaggi (atteso nessuno)`); return why; }
  if (P.kind === 'serve'){
    if (r.events.length !== 2) why.push(`${r.events.length} gesti (attesi lancio e battuta)`);
    else {
      // intervallo lancio → battuta: quello del piano (servizio dai dati del video, P.tossGap) o 0,69 s (servizio di prima)
      const gap = (P.tossGap ?? .69)/rate;
      if (Math.abs(r.gap - gap) > .1) why.push(`battuta ${r.gap.toFixed(3)} s dopo il lancio (atteso ${gap.toFixed(2)} ± 0,10)`);
      if (Math.abs(r.dPeak) > peakTol) why.push(`picco della battuta a ${Math.round(r.dPeak)} ms dal contatto disegnato`);
      if (r.dToss != null && Math.abs(r.dToss) > peakTol) why.push(`picco del lancio a ${Math.round(r.dToss)} ms dal picco disegnato`);
    }
    return why;
  }
  if (r.read.length !== 1) why.push(`${r.read.length} colpi: ${r.read.map(fmt).join(' + ') || '—'}`);
  const x = r.read[0]?.ev;
  if (x){
    const shots = [...P.expect.shot, ...(allow || [])];
    if (!shots.includes(x.natpf.shot)) why.push(`riconosciuto «${x.natpf.shot}» (atteso ${shots.join('/')})`);
    if (P.expect.side && (x.side ?? x.natpf.side) !== P.expect.side) why.push(`lato ${x.side ?? x.natpf.side} (atteso ${P.expect.side})`);
    if (P.expect.aim){ const want = P.expect.aim*(hand === 'left' ? -1 : 1); if (!(x.natpf.wrist*want > .4)) why.push(`mira ${x.natpf.wrist} (attesa ${want > 0 ? '+' : '−'})`); }
    if (r.dPeak == null || Math.abs(r.dPeak) > peakTol) why.push(`picco letto a ${Math.round(r.dPeak)} ms dal contatto disegnato`);
  }
  return why;
}

/* ---------- animazione di prima (natpf_gesture_demo.pose(), senza three.js) ---------- */
// Stessa composizione del disegno di prima: presa q0 (GRIP_POSE[GRIP_STYLE]), preYaw, braccio, polso; mano = spalla +
// strokePose().hand; servizio con strokePose(toss) e strokePose(stroke, t − hitStart) sulla linea del tempo predefinita;
// presa «a giradischi» (la mano gira ±52°); mancino = mondo specchiato. È la posa che la specifica §5 ha fatto leggere al
// telefono simulato (scratchpad posa-sensori.mjs).
const qEuler = ([x, y, z]) => qmul(qmul(qaxis([1, 0, 0], x*D), qaxis([0, 1, 0], y*D)), qaxis([0, 0, 1], z*D));
export function legacyPoseSource(){
  // presa nel palmo: l'animazione di prima è stata giudicata con quella (B9/B13), non con la presa a racchetta del B17
  const SH = [.19, 1.42, 0], q0 = qEuler(GRIP_POSE.palmo.euler);
  const right = (id, t) => {
    const g = GESTURES[id];
    let hand3, q = q0;
    if (g.still){
      hand3 = [.16, -.42 + Math.sin(t*1.6)*.006, -.32];
      if (g.turntable) q = qmul(qaxis([0, 1, 0], Math.sin(t*.9)*.9), q0);
    } else if (g.toss){
      const st = serveTimeline(g), p = t < st.hitStart ? strokePose(g.toss, t, {}) : strokePose(g.stroke, t - st.hitStart, {});
      hand3 = p.hand; q = qmul(qaxis(p.axis, p.phi), q0);
    } else {
      const p = strokePose(g.stroke, t, { short: g.short, preYaw: g.preYaw || 0 });
      hand3 = p.hand; q = qmul(qaxis([0, 1, 0], p.preYaw), q0); q = qmul(qaxis(p.axis, p.phi), q);
      if (p.wristAxis) q = qmul(qaxis(p.wristAxis, p.psi), q);
    }
    return { pos: hand3.map((x, i) => x + SH[i]), q };
  };
  const plan = id => {
    const g = GESTURES[id];
    const kind = g.still ? 'still' : g.toss ? 'serve' : 'stroke';
    const total = g.still ? 6 : g.toss ? serveTimeline(g).total : strokeTimeline(g.stroke, { short: g.short }).total;
    const contact = g.still ? null : g.toss ? serveTimeline(g).apex : strokeTimeline(g.stroke, { short: g.short }).hit;
    return { id, kind, total, contact, ballHigh: !!g.ballHigh, expect: g.expect, aim: g.aim || 0 };
  };
  // la presa «a giradischi» non è periodica in 6 s: si campiona un solo ciclo, senza ripetizione
  return { name: 'animazione di prima', plan, pose: (id, t, hand = 'right') => { const p = right(id, t); return hand === 'left' ? mirrorPose(p) : p; } };
}
