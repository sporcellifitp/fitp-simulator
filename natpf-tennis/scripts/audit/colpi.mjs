// Audit della sensibilità e della precisione dei colpi (B15, 08/11/2026): gesti che una persona varia apposta, mandati
// nella catena vera (telefono simulato con il braccio → swingMessage → parseSwingMessage → natpfSwingToEngine →
// strokeOutcome → motore headless), e dove cade la palla. Ingressi: velocità del gesto rispetto al proprio colpo tipico
// (k, 0,6…1,6×), piatto girato all'impatto (yaw, gradi, + a destra), tempo d'impatto (u, finestre: + anticipo),
// dritto/rovescio, altezza della palla, livello. Uscite: caduta laterale (x) e profondità, velocità (km/h), altezza
// sulla rete, tipo di colpo, forza e mira lette. In più le sequenze (stesso gesto mirato ripetuto) che mostrano quanto i
// riferimenti che «seguono» i colpi (colpo tipico, centro della mira, ritmo) spengono la varietà.
// È un banco deterministico sulle regole vere, non una misura di persone.
//   node --import ./test/register.mjs scripts/audit/colpi.mjs [--json=file] [--quick]
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { simPhone, rng } from '../../test/phone-sim.mjs';
import { armSwing, photoGrip, STROKES } from '../../test/arm-sim.mjs';
import { createHeadlessEngine, gauss } from './headless-engine.mjs';
import { skillLevel } from '../../src/natpf/natpf_skill.js';
import { lateSpanOf, directionSpan } from '../../src/natpf/natpf_stroke_outcome.js';

const QUICK = process.argv.includes('--quick');
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const DT = 1/120;

// telefono con la presa insegnata (foto del 04/11), calibrazione rapida con il braccio (dritto e rovescio veri)
export function makePhone({ seed = 7 } = {}){
  const p = simPhone({ seed, shape: true });
  photoGrip(p, { hand: 'right' });
  const R = rng(seed*31 + 5);
  p.calibrate({ armGesture: w => armSwing(p, { ...(w === 'L' ? STROKES.dritto : STROKES.rovescio), tremor: 4, R }) });
  return p;
}
// un gesto variato: k = velocità rispetto al colpo del braccio (STROKES), yaw = piatto girato a destra (gradi, prima del
// colpo, poi si torna), side = dritto o rovescio. Restituisce i messaggi «sw» mandati (di norma uno)
export function gesture(p, { side = 'forehand', k = 1, yaw = 0, R = Math.random } = {}){
  const S = side === 'forehand' ? STROKES.dritto : STROKES.rovescio;
  // come in partita: il telefono sa da che parte arriva la palla (verso atteso) e la modalità preparazione è attiva
  p.det.setPrepMode(true); p.det.setExpect(side === 'forehand' ? 1 : -1);
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
// Math.random fisso. Restituisce l'esito del motore e dove cade davvero la palla (fisica fino al rimbalzo)
export function strike(ev, { difficulty = 'casual', u = 0, ballY = 1, engine = null, rally = 3 } = {}){
  const real = Math.random; Math.random = () => .5;
  try {
    const e = engine || createHeadlessEngine({ difficulty });
    if (!engine) e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = rally;
    e.ball.natpfSuper = null; e.pendingUserSwing = null;
    e.player.pos.set(0, 0, 11.4); e.player.vel.set(0, 0, 0); e.player.targetPos.copy(e.player.pos); e.player.swingCooldown = 0;
    e.ball.pos.set(.6, ballY, 10.9); e.ball.vel.set(0, 0, 18); e.ball.targetLanding.set(.6, 0, 9);
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
const readOf = ({ s, ev }, p = null) => ({ peak: s.peak, rawPeak: s.rawPeak, angle: s.angle, heading: s.heading, aimDev: ev.natpf.aimDev, shot: ev.natpf.shot, power: ev.natpf.intent?.power, depth: ev.natpf.intent?.depth, face: ev.natpf.intent?.face, rise: ev.natpf.intent?.rise, typical: p?.models.typical.value ?? null, side: ev.side });

const q = (a, f) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(f*s.length))].toFixed(2) : null; };
const mean = a => a.reduce((x, y) => x + y, 0)/Math.max(1, a.length);
const sd = a => Math.sqrt(mean(a.map(v => (v - mean(a))**2)));
const dist = a => ({ p10: q(a, .1), p50: q(a, .5), p90: q(a, .9), sd: +sd(a.filter(Number.isFinite)).toFixed(2) });
const fmt = v => (v == null ? '–' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v));
const row = (cells, w = 8) => cells.map((c, i) => fmt(c).padStart(i ? w : 14)).join('');

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

export function audit({ quick = QUICK } = {}){
  const out = { base: null, speed: [], yaw: [], timing: [], side: [], ball: [], level: [], human: null, sequences: {} };
  const p = warmPhone(makePhone());
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
    shots: H.reduce((m, h) => (m[h.out.shot] = (m[h.out.shot] || 0) + 1, m), {}), failed: H.filter(h => h.out.failed || h.out.netFault).length,
    explain: Object.fromEntries(Object.entries(outputs).map(([o, fo]) => [o, Object.fromEntries(Object.entries(inputs).map(([i, fi]) => [i, { slope: +slope(H.map(fi), H.map(fo)).toFixed(3), r2: +r2(H.map(fi), H.map(fo)).toFixed(2) }]))])) };
  // sequenze con i riferimenti che imparano (stesso telefono, stesso motore): quanto l'esito dello stesso gesto cambia
  const seq = (name, g, s, n = 10) => {
    const pp = warmPhone(makePhone({ seed: 11 })), e = createHeadlessEngine({ difficulty: s.difficulty || 'casual' }); e.startNewMatch({ showStartBanner: false });
    const rows = [];
    for (let i = 0; i < n; i++){
      const gg = typeof g === 'function' ? g(i) : g, RR = rng(300 + i);
      const msgs = gesture(pp, { ...gg, R: RR }); if (msgs.length !== 1){ rows.push(null); continue; }
      const r = pp.game(msgs[0]), o = strike(r.ev, { ...s, engine: e, rally: 3 + i });
      rows.push({ i, side: gg.side, k: gg.k, yaw: gg.yaw, heading: r.s.heading, aimDev: r.ev.natpf.aimDev, typical: pp.models.typical.value, peak: r.s.peak, center: pp.models.aims.center(r.s.dir), power: o?.power, face: o?.face, x: o?.x, depth: o?.depth, kmh: o?.kmh, t: o?.t, rhythm: e.natpfRhythm?.player?.value });
    }
    out.sequences[name] = rows;
  };
  seq('piatto +20° dritto ×10', { side: 'forehand', k: 1, yaw: 20 }, { difficulty: 'casual', u: 0 });
  seq('piatto +20° dritto e rovescio alternati ×10', i => ({ side: i % 2 ? 'backhand' : 'forehand', k: 1, yaw: 20 }), { difficulty: 'casual', u: 0 });
  seq('gesto 1,5× dritto ×10', { side: 'forehand', k: 1.5, yaw: 0 }, { difficulty: 'casual', u: 0 });
  seq('gesto 0,7× dritto ×10', { side: 'forehand', k: .7, yaw: 0 }, { difficulty: 'casual', u: 0 });
  seq('anticipo +0,6 finestre dritto ×10', { side: 'forehand', k: 1, yaw: 0 }, { difficulty: 'casual', u: .6 });
  return out;
}

export function print(out){
  const P = (t, cells) => console.log(t.padEnd(32) + row(cells));
  const head = ['x m', 'bx m', 'prof m', 'bz m', 'km/h', 'rete m', 'colpo', 'forza', 'mira', 'tempo'];
  const line = (lab, r) => P(lab, r.out ? [r.out.x, r.out.bx, r.out.depth, r.out.bz, r.out.kmh, r.out.net, r.out.shot, r.out.power, r.out.face, r.out.t] : ['–']);
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
  console.log(`\n== Persona «normale» (${H.n} colpi: velocità ±20%, piatto ±10°, tempo ±0,4 finestre, palla ±0,25 m) ==`);
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

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const out = audit();
  print(out);
  const file = arg('json'); if (file){ writeFileSync(file, JSON.stringify(out, null, 1)); console.log(`\nscritto ${file}`); }
}
