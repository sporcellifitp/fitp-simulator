// Audit della sensibilità e della precisione dei colpi (B15, 08/11/2026): gesti che una persona varia apposta, mandati
// nella catena vera (telefono simulato con il braccio → swingMessage → parseSwingMessage → natpfSwingToEngine →
// strokeOutcome → motore headless), e dove cade la palla. Ingressi: velocità del gesto rispetto al proprio colpo tipico
// (k, 0,6…1,6×), piatto girato all'impatto (yaw, gradi, + a destra), tempo d'impatto (u, finestre: + anticipo),
// dritto/rovescio, altezza della palla, livello, mano (destro o mancino: lo stesso gesto allo specchio). Uscite: caduta
// laterale (x) e profondità, velocità (km/h), altezza sulla rete, tipo di colpo, forza e mira lette. In più le sequenze
// (stesso gesto mirato ripetuto) che mostrano quanto i riferimenti che «seguono» i colpi (colpo tipico, centro della
// mira, ritmo) spengono la varietà, e la «persona vera» (secondo giro B15): la distribuzione dei gesti di chi gioca davvero,
// presa dalle diagnostiche, colpo per colpo nelle funzioni vere del computer e nel motore.
// È un banco deterministico sulle regole vere, non una misura di persone.
//   node --import ./test/register.mjs scripts/audit/colpi.mjs [--mode=tutto|banco|reale] [--hand=right|left|both] [--json=file] [--quick]
//   banco: gesti variati e sequenze nel telefono simulato · reale: persona vera · tutto (predefinito): i due
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { simPhone, rng } from '../../test/phone-sim.mjs';
import { armSwing, photoGrip, STROKES } from '../../test/arm-sim.mjs';
import { createHeadlessEngine, gauss } from './headless-engine.mjs';
import { skillLevel } from '../../src/natpf/natpf_skill.js';
import { lateSpanOf, directionSpan, SUPER } from '../../src/natpf/natpf_stroke_outcome.js';
import { strokeIntent, INTENT } from '../../src/natpf/natpf_stroke_intent.js';
import { createAimModel } from '../../src/natpf/natpf_gestures.js';

const QUICK = process.argv.includes('--quick');
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const DT = 1/120;

// mancino: lo stesso gesto allo specchio del piano x = 0 (punti (−x, y, z), assi di rotazione (x, −y, −z), polso invertito)
export const mirrorStroke = S => ({ ...S, axis: [S.axis[0], -S.axis[1], -S.axis[2]], rc: [-S.rc[0], S.rc[1], S.rc[2]], wrist: -(S.wrist || 0) });
const strokesOf = hand => (hand === 'left' ? { forehand: mirrorStroke(STROKES.dritto), backhand: mirrorStroke(STROKES.rovescio) } : { forehand: STROKES.dritto, backhand: STROKES.rovescio });

// telefono con la presa insegnata (foto del 04/11), calibrazione rapida con il braccio (dritto e rovescio veri).
// 'L' = rotazione antioraria vista dall'alto: dritto del destro, rovescio del mancino
export function makePhone({ seed = 7, hand = 'right' } = {}){
  const p = simPhone({ seed, shape: true, hand });
  p.hand = hand;
  photoGrip(p, { hand });
  const R = rng(seed*31 + 5), S = strokesOf(hand);
  p.calibrate({ armGesture: w => armSwing(p, { ...((w === 'L') === (hand !== 'left') ? S.forehand : S.backhand), tremor: 4, R }) });
  return p;
}
// un gesto variato: k = velocità rispetto al colpo del braccio (STROKES), yaw = piatto girato a destra (gradi, prima del
// colpo, poi si torna), side = dritto o rovescio. Restituisce i messaggi «sw» mandati (di norma uno)
export function gesture(p, { side = 'forehand', k = 1, yaw = 0, R = Math.random } = {}){
  const hand = p.hand || 'right', S = strokesOf(hand)[side === 'forehand' ? 'forehand' : 'backhand'], fh = hand === 'left' ? -1 : 1;
  // come in partita: il telefono sa da che parte arriva la palla (verso atteso) e la modalità preparazione è attiva
  p.det.setPrepMode(true); p.det.setExpect(side === 'forehand' ? fh : -fh);
  p.rest(450, 4);
  if (yaw) p.pose([0, 1, 0], -yaw, 80);          // pose(+) = antiorario visto dall'alto = piatto a sinistra
  p.rest(250, 4);
  const before = p.msgs.length;
  armSwing(p, { ...S, peak: S.peak*k, wrist: S.wrist*k, tremor: 4, R });
  p.rest(250, 4);
  if (yaw) p.pose([0, 1, 0], yaw, 80);
  p.rest(350, 4);
  return p.msgs.slice(before);
}
// il colpo nel motore vero: palla al punto d'impatto, tempo u in unità della finestra della direzione (+ anticipo),
// Math.random fisso. Il mancino (ev.natpf.hand) ha la palla dall'altra parte (specchio). Restituisce l'esito del motore e
// dove cade davvero la palla (fisica fino al rimbalzo)
export function strike(ev, { difficulty = 'casual', u = 0, ballY = 1, engine = null, rally = 3 } = {}){
  const real = Math.random; Math.random = () => .5;
  try {
    const e = engine || createHeadlessEngine({ difficulty });
    if (!engine) e.startNewMatch({ showStartBanner: false });
    const mx = (ev.natpf?.hand || ev.hand) === 'left' ? -1 : 1;
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = rally;
    e.ball.natpfSuper = null; e.pendingUserSwing = null;
    e.player.pos.set(0, 0, 11.4); e.player.vel.set(0, 0, 0); e.player.targetPos.copy(e.player.pos); e.player.swingCooldown = 0;
    e.ball.pos.set(.6*mx, ballY, 10.9); e.ball.vel.set(0, 0, 18); e.ball.targetLanding.set(.6*mx, 0, 9);
    const lv = skillLevel(difficulty), span = directionSpan(lv), late = lateSpanOf(18, lv), tau = u >= 0 ? u*span : u*late;
    const ok = e._attemptPlayerRallyStrike({ ...ev, natpf: { ...ev.natpf, latency: 0 }, natpfTau: tau, natpfLateSpan: late }, false);
    if (!ok || e.ball.lastHitter !== 'player') return null;
    const R = e.natpfLastRacket, out = R.out, kmh = e.ball.vel.length()*3.6;
    let net = null, z0 = e.ball.pos.z, apex = 0, bx = null, bz = null;
    for (let i = 0; i < 700 && e.ball.inPlay; i++){
      e.step(DT); apex = Math.max(apex, e.ball.pos.y);
      if (net == null && Math.sign(z0) !== Math.sign(e.ball.pos.z)) net = e.ball.pos.y;
      z0 = e.ball.pos.z;
      if (e.ball.bounceCountOnCurrentSide){ bx = e.ball.pos.x; bz = e.ball.pos.z; break; }
      if (e.phase !== 'RALLY') break;
    }
    return { x: out.x, depth: out.depth, clear: out.clear, kmh: +kmh.toFixed(1), bx: bx == null ? null : +bx.toFixed(2), bz: bz == null ? null : +(-bz).toFixed(2), net: net == null ? null : +net.toFixed(2),
      apex: +apex.toFixed(2), shot: out.shot, t: out.t, aim: out.aim, q: out.q, grade: out.grade, failed: !!out.failed, netFault: !!out.netFault, super: R.super, assist: out.assist,
      power: +R.intent.power.toFixed(3), face: +(R.intent.face ?? 0).toFixed(3), wantDepth: +(R.intent.depth ?? 0).toFixed(3) };
  } finally { Math.random = real; }
}
// lettura del telefono e dell'intenzione (per vedere dove si perde la varietà, prima del motore)
const readOf = ({ s, ev }, p = null) => ({ peak: s.peak, rawPeak: s.rawPeak, angle: s.angle, heading: s.heading, aimDev: ev.natpf.aimDev, shot: ev.natpf.shot, power: ev.natpf.intent?.power, depth: ev.natpf.intent?.depth, face: ev.natpf.intent?.face, rise: ev.natpf.intent?.rise, typical: p?.models.typical.value ?? null, side: ev.side, hand: ev.natpf.hand });

const q = (a, f) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(f*s.length))].toFixed(2) : null; };
const mean = a => a.reduce((x, y) => x + y, 0)/Math.max(1, a.length);
const sd = a => Math.sqrt(mean(a.map(v => (v - mean(a))**2)));
const dist = a => { const f = a.filter(Number.isFinite); return { p10: q(f, .1), p50: q(f, .5), p90: q(f, .9), sd: +sd(f).toFixed(2), span: +((q(f, .9) ?? 0) - (q(f, .1) ?? 0)).toFixed(2) }; };
const fmt = v => (v == null ? '–' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v));
const row = (cells, w = 8) => cells.map((c, i) => fmt(c).padStart(i ? w : 14)).join('');
const count = (a, f) => a.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});

// riscaldamento: dodici colpi normali alternati, come i primi punti di una partita (il colpo tipico, il centro della mira e
// la salita abituale si assestano)
export function warmPhone(p, { shots = 12 } = {}){
  const R = rng(99);
  for (let i = 0; i < shots; i++) for (const d of gesture(p, { side: i % 2 ? 'backhand' : 'forehand', R })) p.game(d);
  return p;
}
// variante letta senza insegnare niente ai riferimenti
export function variant(p, g){
  const R = rng(1000 + Math.round(g.k*100) + Math.round(g.yaw || 0)*7 + (g.side === 'backhand' ? 3 : 0));
  const msgs = gesture(p, { ...g, R });
  if (msgs.length !== 1) return null;
  return p.game(msgs[0], { learn: false, ballHigh: !!g.ballHigh });
}
// sequenza dopo i colpi di qualche punto (12 normali): lo stesso gesto ripetuto con i riferimenti che imparano (stesso
// telefono, stesso motore). g: gesto o funzione del numero del colpo. Il mancino fa la sequenza allo specchio (piatto
// girato dall'altra parte): la sua x deve essere quella del destro cambiata di segno
export function sequence(g, { n = 10, hand = 'right', difficulty = 'casual', u = 0 } = {}){
  const pp = warmPhone(makePhone({ seed: 11, hand })), e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
  const rows = [];
  for (let i = 0; i < n; i++){
    const g0 = typeof g === 'function' ? g(i) : g, gg = hand === 'left' ? { ...g0, yaw: -(g0.yaw || 0) } : g0, RR = rng(300 + i);
    const msgs = gesture(pp, { ...gg, R: RR }); if (msgs.length !== 1){ rows.push(null); continue; }
    const r = pp.game(msgs[0]), o = strike(r.ev, { difficulty, u, engine: e, rally: 3 + i });
    rows.push({ i, side: gg.side, k: gg.k, yaw: gg.yaw, heading: r.s.heading, aimDev: r.ev.natpf.aimDev, typical: pp.models.typical.value, peak: r.s.peak, center: pp.models.aims.center(r.s.dir), power: o?.power, face: o?.face, x: o?.x, depth: o?.depth, kmh: o?.kmh, t: o?.t, rhythm: e.natpfRhythm?.player?.value });
  }
  return rows;
}
export const SEQUENCES = {
  'piatto +20° dritto ×10': [{ side: 'forehand', k: 1, yaw: 20 }, { n: 10 }],
  'piatto +20° dritto e rovescio alternati ×10': [i => ({ side: i % 2 ? 'backhand' : 'forehand', k: 1, yaw: 20 }), { n: 10 }],
  'piatto +30° (mira piena) dritto ×14': [{ side: 'forehand', k: 1, yaw: 30 }, { n: 14 }],
  'piatto +30° dritto e rovescio alternati ×14': [i => ({ side: i % 2 ? 'backhand' : 'forehand', k: 1, yaw: 30 }), { n: 14 }],
  'gesto 1,5× dritto ×10': [{ side: 'forehand', k: 1.5, yaw: 0 }, { n: 10 }],
  'gesto 1,5× dritto ×26 (finestra del colpo tipico 24)': [{ side: 'forehand', k: 1.5, yaw: 0 }, { n: 26 }],
  'gesto 0,7× dritto ×10': [{ side: 'forehand', k: .7, yaw: 0 }, { n: 10 }],
  'anticipo +0,6 finestre dritto ×10': [{ side: 'forehand', k: 1, yaw: 0 }, { n: 10, u: .6 }],
};

export function audit({ quick = QUICK, hand = 'right' } = {}){
  const out = { hand, base: null, speed: [], yaw: [], timing: [], side: [], ball: [], level: [], human: null, sequences: {} };
  const p = warmPhone(makePhone({ hand }));
  const base = { side: 'forehand', k: 1, yaw: 0, u: 0, ballY: 1, difficulty: 'casual' };
  const one = (g, s) => { const r = variant(p, g); if (!r) return { read: null, out: null, lost: true }; return { read: readOf(r, p), out: strike(r.ev, s) }; };
  out.base = one(base, base);
  const KS = quick ? [.6, 1, 1.6] : [.4, .5, .6, .8, 1, 1.2, 1.4, 1.6];
  const YAWS = quick ? [-30, 0, 30] : [-30, -20, -15, -10, -5, 0, 5, 10, 15, 20, 30];
  const US = quick ? [-1, 0, 1] : [-1, -.75, -.5, -.25, 0, .25, .5, .75, 1];
  for (const side of ['forehand', 'backhand']){
    for (const k of KS) out.speed.push({ side, k, ...one({ ...base, side, k }, base) });
    for (const yaw of YAWS) out.yaw.push({ side, yaw, ...one({ ...base, side, yaw }, base) });
    const r = variant(p, { ...base, side });
    for (const u of US) out.timing.push({ side, u, read: readOf(r, p), out: strike(r.ev, { ...base, u }) });
    for (const ballY of [.7, 1, 1.4, 1.8]){ const v = variant(p, { ...base, side, ballHigh: ballY >= 1.5 }); out.ball.push({ side, ballY, read: readOf(v, p), out: strike(v.ev, { ...base, ballY }) }); }
    for (const difficulty of ['casual', '1v1', 'pro']) for (const u of [-1, 0, 1]) out.level.push({ side, difficulty, u, out: strike(r.ev, { ...base, difficulty, u }) });
  }
  // persona «normale»: gesti con la variabilità di chi gioca (velocità ±20%, piatto ±10°, tempo ±0,4 finestre, palla
  // ±0,25 m), dritto e rovescio: distribuzione delle uscite e quanto ogni ingresso le spiega
  const R = rng(5), N = quick ? 60 : 240, H = [];
  for (let i = 0; i < N; i++){
    const g = { side: R() < .5 ? 'forehand' : 'backhand', k: Math.max(.5, Math.min(1.7, 1 + gauss(R)*.2)), yaw: Math.max(-35, Math.min(35, gauss(R)*10)) };
    const s = { difficulty: 'casual', u: Math.max(-1.2, Math.min(1.2, gauss(R)*.4)), ballY: Math.max(.6, Math.min(1.45, 1 + gauss(R)*.25)) };
    const r = variant(p, g); if (!r) continue;
    const o = strike(r.ev, s); if (!o) continue;
    H.push({ ...g, ...s, read: readOf(r, p), out: o });
  }
  const slope = (xs, ys) => { const mx = mean(xs), my = mean(ys); const sxx = mean(xs.map(x => (x - mx)**2)), sxy = mean(xs.map((x, i) => (x - mx)*(ys[i] - my))); return sxx > 0 ? sxy/sxx : 0; };
  const r2 = (xs, ys) => { const b = slope(xs, ys), mx = mean(xs), my = mean(ys); const res = ys.map((y, i) => y - my - b*(xs[i] - mx)); return 1 - mean(res.map(v => v*v))/Math.max(1e-9, mean(ys.map(y => (y - my)**2))); };
  const inputs = { k: h => h.k, yaw: h => h.yaw, u: h => h.u*(h.side === 'forehand' ? 1 : -1), ballY: h => h.ballY };
  const outputs = { x: h => h.out.x, depth: h => h.out.depth, kmh: h => h.out.kmh, net: h => h.out.net, power: h => h.out.power, face: h => h.out.face };
  out.human = { n: H.length, dist: Object.fromEntries(Object.entries(outputs).map(([k, f]) => [k, dist(H.map(f))])),
    shots: count(H, h => h.out.shot), failed: H.filter(h => h.out.failed || h.out.netFault).length,
    explain: Object.fromEntries(Object.entries(outputs).map(([o, fo]) => [o, Object.fromEntries(Object.entries(inputs).map(([i, fi]) => [i, { slope: +slope(H.map(fi), H.map(fo)).toFixed(3), r2: +r2(H.map(fi), H.map(fo)).toFixed(2) }]))])) };
  for (const [name, [g, o]] of Object.entries(SEQUENCES)) out.sequences[name] = sequence(g, { ...o, hand });
  return out;
}

// Persona vera (secondo giro B15, dalla verifica indipendente sulle diagnostiche del 23/10, 28/10 e 29/10): tempo
// mediano +0,35 unità della finestra (±0,45), piatto ±12° attorno al proprio colpo abituale, forza mediana 0,54 (±0,2:
// gesto 1 ± 0,3 volte il proprio colpo tipico, 780 °/s), palla ±0,25 m, 60% dritti, salita ±0,12 attorno alla propria
// salita abituale (per definizione la mediana dei propri colpi normali), ampiezza 90 ± 20°. Ogni colpo passa dalle
// funzioni vere del computer: centro della mira (createAimModel, seminato dalla calibrazione con un errore seedErr, che
// impara dai colpi normali come in partita), intenzione (strokeIntent: forza dal colpo tipico, tipo di colpo dalla forma,
// mira del piatto), poi il motore con il ritmo di chi gioca che impara (strike). Mancino: le stesse estrazioni allo
// specchio (piatto, seme e palla dall'altra parte): l'esito deve essere lo specchio esatto.
export const REAL = Object.freeze({ N: 400, seed: 3, fh: .6, uMed: .35, uSd: .45, devSd: 12, kMed: 1, kSd: .3, ref: 780, ballSd: .25, riseRef: .1, relSd: .12, angle: 90, angleSd: 20, plane: .85, planeSd: .08 });
export function reale({ hand = 'right', N = REAL.N, seed = REAL.seed, uMed = REAL.uMed, uSd = REAL.uSd, devSd = REAL.devSd, devBias = 0, seedErr = 0, kMed = REAL.kMed, kSd = REAL.kSd, rhythm = true, difficulty = 'casual' } = {}){
  const clip = (v, a, b) => Math.max(a, Math.min(b, v)), R = rng(seed), mx = hand === 'left' ? -1 : 1;
  const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
  const aims = createAimModel(); aims.seed(1, mx*seedErr); aims.seed(-1, mx*seedErr);
  const shots = [];
  for (let i = 0; i < N; i++){
    const side = R() < REAL.fh ? 'forehand' : 'backhand', dir = (side === 'forehand' ? 1 : -1)*mx;
    const dev = clip(gauss(R)*devSd + devBias, -60, 60), k = clip(kMed + gauss(R)*kSd, .3, 2);
    const u = clip(uMed + gauss(R)*uSd, -1.5, 1.5), ballY = clip(1 + gauss(R)*REAL.ballSd, .6, 1.6);
    const rel = gauss(R)*REAL.relSd, angle = clip(REAL.angle + gauss(R)*REAL.angleSd, 40, 160), plane = clip(REAL.plane + gauss(R)*REAL.planeSd, .5, 1);
    const heading = mx*dev, a = aims.aim(dir, heading), peak = k*REAL.ref;
    const intent = strokeIntent({ peak, angle, shape: { rise: REAL.riseRef + rel, plane, tilt: 0 } }, { ref: REAL.ref, headingDev: a?.dev ?? null, riseRef: REAL.riseRef, ballHigh: ballY >= 1.5 });
    if (['topspin', 'flat'].includes(intent.shot)) aims.add(dir, heading);
    // errore che resta nel centro della mira (gradi, media dei due versi; il centro giusto è 0)
    const cerr = +(mx*((aims.center(1) ?? 0) + (aims.center(-1) ?? 0))/2).toFixed(2);
    const ev = { source: 'natpf-phone', side, shotType: intent.shot, speed: .8 + intent.power*.85, dirX: 0, timing: null,
      natpf: { aim: 'swing', shot: intent.shot, intent, power: intent.power, peak, typical: REAL.ref, latency: 0, hand, aimDev: a?.dev ?? null } };
    const o = strike(ev, { difficulty, u, ballY, engine: rhythm ? e : null, rally: 3 });
    shots.push(o ? { i, side, cerr, k: +k.toFixed(3), dev: +dev.toFixed(2), u: +u.toFixed(3), ballY: +ballY.toFixed(2), aimDev: a?.dev ?? null, shot: o.shot, intent: intent.shot, power: intent.power, face: intent.face,
      x: o.x, depth: o.depth, kmh: o.kmh, net: o.net, failed: o.failed || o.netFault, super: !!o.super?.on } : { i, side, cerr, lost: true });
  }
  const ok = shots.filter(s => !s.lost), X = ok.map(s => s.x), part = (a, b) => q(ok.slice(a, b).map(s => s.x), .5);
  return { hand, N, seedErr, devBias, rhythm, shots, rhythmEnd: rhythm ? +(e.natpfRhythm?.player?.value ?? 0).toFixed(2) : null,
    x: dist(X), depth: dist(ok.map(s => s.depth)), kmh: dist(ok.map(s => s.kmh)), net: dist(ok.map(s => s.net)), power: dist(ok.map(s => s.power)), face: dist(ok.map(s => s.face)),
    xInner: +(100*X.filter(x => Math.abs(x) < 1).length/X.length).toFixed(0), xWide: +(100*X.filter(x => Math.abs(x) > 2.5).length/X.length).toFixed(0),
    deep: +(100*ok.filter(s => s.depth > 10.5).length/ok.length).toFixed(0), short: +(100*ok.filter(s => s.depth < 8).length/ok.length).toFixed(0),
    flatPower: +(100*ok.filter(s => s.power >= INTENT.flatPower).length/ok.length).toFixed(0), superPower: +(100*ok.filter(s => s.power >= SUPER.power).length/ok.length).toFixed(0),
    types: count(ok, s => s.shot), supers: ok.filter(s => s.super).length, failed: ok.filter(s => s.failed).length, lost: shots.length - ok.length,
    xBlocks: { '1-10': part(0, 10), '11-20': part(10, 20), '21-40': part(20, 40), '41-': part(40) } };
}
export const REAL_CASES = {
  'persona vera': {},
  'persona vera, senza ritmo': { rhythm: false },
  'seme della calibrazione +15°': { seedErr: 15 },
  'seme della calibrazione −15°': { seedErr: -15 },
  'anticipa sempre (tempo +0,6 ±0,3)': { uMed: .6, uSd: .3 },
  'precisa (tempo 0 ±0,3, piatto ±8°, gesto ±0,18)': { uMed: 0, uSd: .3, devSd: 8, kSd: .18 },
};
export function realeAll({ hand = 'right', quick = QUICK } = {}){
  return Object.fromEntries(Object.entries(REAL_CASES).map(([name, o]) => [name, reale({ hand, ...(quick ? { N: 120 } : {}), ...o })]));
}
// Seme della calibrazione sbagliato (errore seedErr gradi nei due versi): la persona vera gioca `n` colpi in `runs`
// partite diverse; per blocchi di colpi, x p50 (le partite insieme) ed errore che resta nel centro della mira (gradi,
// media alla fine del blocco). Lo stesso errore visto dall'altra parte è una mira tenuta dal primo colpo (piatto sempre
// girato di −seedErr): per il centro della mira le due cose sono uguali
export const SEME = Object.freeze({ runs: 12, n: 40, blocks: Object.freeze([[0, 5], [5, 10], [10, 20], [20, 40]]) });
export function seme({ seedErr = 0, runs = SEME.runs, n = SEME.n, hand = 'right' } = {}){
  const xs = SEME.blocks.map(() => []), err = SEME.blocks.map(() => []);
  for (let r = 0; r < runs; r++){
    const res = reale({ hand, N: n, seed: 101 + r, seedErr });
    SEME.blocks.forEach(([a, b], j) => { for (const s of res.shots.slice(a, b)) if (!s.lost) xs[j].push(s.x); err[j].push(res.shots[Math.min(b, res.shots.length) - 1].cerr); });
  }
  return { seedErr, hand, blocks: SEME.blocks.map(([a, b], j) => ({ shots: `${a + 1}-${b}`, x: q(xs[j], .5), xMean: +mean(xs[j]).toFixed(2), cerr: +mean(err[j]).toFixed(1) })) };
}
// specchio: le stesse estrazioni del destro e del mancino danno la stessa palla dall'altra parte. Nei tagliati (e nelle
// palle corte) l'effetto laterale del motore va dalla parte del campo dove sta chi colpisce (x ≥ 0), non dipende dalla
// mano: al centro esatto (x = 0, il banco) i due vanno dalla stessa parte e la velocità cambia di qualche decimo (cutKmh)
export function mirrorCheck(right, left){
  let dx = 0, dd = 0, dk = 0, ck = 0, n = 0, types = 0;
  for (let i = 0; i < right.shots.length; i++){
    const a = right.shots[i], b = left.shots[i]; if (a.lost || b.lost){ if (a.lost !== b.lost) types++; continue; }
    dx = Math.max(dx, Math.abs(a.x + b.x)); dd = Math.max(dd, Math.abs(a.depth - b.depth)); if (a.shot !== b.shot) types++; n++;
    if (a.shot === 'SLICE' || a.shot === 'DROP') ck = Math.max(ck, Math.abs(a.kmh - b.kmh)); else dk = Math.max(dk, Math.abs(a.kmh - b.kmh));
  }
  return { n, dx: +dx.toFixed(3), depth: +dd.toFixed(3), kmh: +dk.toFixed(2), cutKmh: +ck.toFixed(2), types };
}

export function print(out){
  const P = (t, cells) => console.log(t.padEnd(32) + row(cells));
  const head = ['x m', 'bx m', 'prof m', 'bz m', 'km/h', 'rete m', 'colpo', 'forza', 'mira', 'tempo'];
  const line = (lab, r) => P(lab, r.out ? [r.out.x, r.out.bx, r.out.depth, r.out.bz, r.out.kmh, r.out.net, r.out.shot, r.out.power, r.out.face, r.out.t] : ['–']);
  console.log(`\n######## banco del telefono · mano ${out.hand === 'left' ? 'sinistra (mancino)' : 'destra'}`);
  console.log('\n== Velocità del gesto (k × colpo del braccio; dritto 650 °/s, rovescio 600) ==');
  P('', head);
  for (const r of out.speed) if (r.lost) P(`${r.side} k ${r.k}`, ['gesto non mandato dal telefono (sotto la soglia)']); else line(`${r.side} k ${r.k}  (picco ${r.read?.rawPeak ?? '–'}, tipico ${r.read?.typical ?? '–'})`, r);
  console.log('\n== Piatto girato (gradi, + a destra) ==');
  P('', head);
  for (const r of out.yaw) line(`${r.side} yaw ${r.yaw}  (fh ${fmt(r.read?.heading)}, dev ${fmt(r.read?.aimDev)})`, r);
  console.log('\n== Tempo d\'impatto (finestre della direzione, + anticipo) ==');
  P('', head);
  for (const r of out.timing) line(`${r.side} u ${r.u}`, r);
  console.log('\n== Altezza della palla all\'impatto ==');
  P('', head);
  for (const r of out.ball) line(`${r.side} palla ${r.ballY} m`, r);
  console.log('\n== Livelli (tempo −1 / 0 / +1) ==');
  P('', head);
  for (const r of out.level) line(`${r.side} ${r.difficulty} u ${r.u}`, r);
  const H = out.human;
  console.log(`\n== Persona «normale» del telefono simulato (${H.n} colpi: velocità ±20%, piatto ±10°, tempo ±0,4 finestre, palla ±0,25 m) ==`);
  for (const [k, d] of Object.entries(H.dist)) console.log(`  ${k.padEnd(8)} p10 ${fmt(d.p10)}  p50 ${fmt(d.p50)}  p90 ${fmt(d.p90)}  sd ${fmt(d.sd)}`);
  console.log(`  tipi: ${JSON.stringify(H.shots)} · falliti/in rete: ${H.failed}`);
  console.log('  quanto ogni ingresso spiega ogni uscita (pendenza per unità d\'ingresso, R²):');
  for (const [o, m] of Object.entries(H.explain)) console.log(`    ${o.padEnd(7)} ` + Object.entries(m).map(([i, v]) => `${i}: ${v.slope} (R² ${v.r2})`).join('   '));
  console.log('\n== Sequenze (riferimenti che imparano) ==');
  for (const [name, rows] of Object.entries(out.sequences)){
    console.log(`  ${name}`);
    console.log('    ' + ['n', 'lato', 'picco', 'tipico', 'forza', 'fh', 'centro', 'dev', 'mira', 'x m', 'prof m', 'km/h', 'tempo', 'ritmo'].map(s => s.padStart(8)).join(''));
    for (const r of rows) console.log('    ' + (r ? [r.i, r.side === 'forehand' ? 'D' : 'R', r.peak, r.typical, r.power, r.heading, r.center, r.aimDev, r.face, r.x, r.depth, r.kmh, r.t, r.rhythm] : ['perso']).map(v => fmt(v).padStart(8)).join(''));
  }
}
export function printReale(all, hand = 'right'){
  console.log(`\n######## persona vera · mano ${hand === 'left' ? 'sinistra (mancino)' : 'destra'} (${REAL.N} colpi; ${JSON.stringify(REAL)})`);
  const D = d => `p10 ${fmt(d.p10)}  p50 ${fmt(d.p50)}  p90 ${fmt(d.p90)}  sd ${fmt(d.sd)}  (p90−p10 ${fmt(d.span)})`;
  for (const [name, r] of Object.entries(all)){
    console.log(`-- ${name} (${r.shots.length - r.lost} colpi, ritmo ${r.rhythm ? `sì, finale ${r.rhythmEnd}` : 'no'})`);
    console.log(`   x      ${D(r.x)}   |x|<1 m: ${r.xInner}%  |x|>2,5 m: ${r.xWide}%   p50 dei colpi 1–10 ${fmt(r.xBlocks['1-10'])}, 11–20 ${fmt(r.xBlocks['11-20'])}, 21–40 ${fmt(r.xBlocks['21-40'])}, dal 41° ${fmt(r.xBlocks['41-'])}`);
    console.log(`   prof   ${D(r.depth)}   <8 m: ${r.short}%  >10,5 m: ${r.deep}%`);
    console.log(`   km/h   ${D(r.kmh)}`);
    console.log(`   rete   ${D(r.net)}`);
    console.log(`   forza  ${D(r.power)}   ≥${INTENT.flatPower} (piatto possibile): ${r.flatPower}%  ≥${SUPER.power} (super possibile): ${r.superPower}%`);
    console.log(`   mira   ${D(r.face)}`);
    console.log(`   tipi ${JSON.stringify(r.types)} · super ${r.supers} · falliti/in rete ${r.failed} · persi ${r.lost}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const mode = arg('mode') || 'tutto', handArg = arg('hand') || 'right', hands = handArg === 'both' ? ['right', 'left'] : [handArg];
  const res = {};
  for (const hand of hands){
    res[hand] = {};
    if (mode === 'tutto' || mode === 'reale'){
      res[hand].reale = realeAll({ hand }); printReale(res[hand].reale, hand);
      res[hand].seme = [-15, 0, 15].map(seedErr => seme({ seedErr, hand }));
      console.log(`\n== seme della calibrazione sbagliato (${SEME.runs} partite, primi ${SEME.n} colpi): x p50 (media) e errore del centro della mira alla fine del blocco`);
      for (const r of res[hand].seme) console.log(`  seme ${String(r.seedErr).padStart(3)}°  ` + r.blocks.map(b => `colpi ${b.shots}: x ${fmt(b.x)} (${fmt(b.xMean)}), centro ${fmt(b.cerr)}°`).join(' · '));
    }
    if (mode === 'tutto' || mode === 'banco'){ res[hand].banco = audit({ hand }); print(res[hand].banco); }
  }
  if (res.right?.reale && res.left?.reale){
    console.log('\n######## specchio destro ↔ mancino (persona vera: stesse estrazioni, |x_D + x_M|, |prof_D − prof_M|, |km/h_D − km/h_M| massimi)');
    for (const name of Object.keys(res.right.reale)) console.log(`  ${name.padEnd(70)} ${JSON.stringify(mirrorCheck(res.right.reale[name], res.left.reale[name]))}`);
  }
  if (res.right?.banco && res.left?.banco){
    console.log('\n######## specchio destro ↔ mancino (banco del telefono: piatto girato di +y° del destro contro −y° del mancino)');
    const R = res.right.banco, L = res.left.banco;
    for (const r of R.yaw){ const l = L.yaw.find(v => v.side === r.side && v.yaw === -r.yaw); if (r.out && l?.out) console.log(`  ${r.side} yaw ${String(r.yaw).padStart(4)}: x ${fmt(r.out.x)} / ${fmt(l.out.x)}  prof ${fmt(r.out.depth)} / ${fmt(l.out.depth)}  km/h ${fmt(r.out.kmh)} / ${fmt(l.out.kmh)}`); }
    for (const name of Object.keys(R.sequences)){ const a = R.sequences[name].map(r => r?.x), b = L.sequences[name].map(r => r?.x); console.log(`  ${name} (mancino allo specchio): x destro ${a.map(fmt).join(' ')} · −x mancino ${b.map(v => fmt(v == null ? v : -v)).join(' ')}`); }
  }
  const file = arg('json'); if (file){ writeFileSync(file, JSON.stringify(res, null, 1)); console.log(`\nscritto ${file}`); }
}
