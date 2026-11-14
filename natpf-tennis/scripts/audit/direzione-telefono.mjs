// Direzione e precisione dei colpi dal telefono (B35a, collaudo dell'utente del 13/11/2026: «ho provato a fare un dritto
// che partiva da destra andando verso sinistra per incrociare e ho ottenuto un dritto lungolinea; lo stesso per i rovesci»
// e «molti dei colpi che facevo uscivano»). Banco deterministico sulle regole vere, non una misura di persone: telefono
// simulato con il braccio (test/phone-sim.mjs, test/arm-sim.mjs, presa della foto), messaggio «sw», natpfSwingToEngine con i
// riferimenti che imparano come in partita, motore headless con il ritmo di chi gioca, dove cade la palla.
//
// Cosa vuol dire «voluto»: per ogni colpo la persona vuole l'INCROCIATO, il CENTRO o il LUNGOLINEA. Per un destro il dritto
// incrociato va alla sua sinistra (guardando la rete), il lungolinea dritto davanti lungo la riga di destra; il rovescio
// incrociato va alla sua destra, il lungolinea lungo la riga di sinistra. Per un mancino tutto allo specchio. In ogni caso
// l'incrociato è «nel verso in cui va lo swing» (il dritto del destro gira da destra a sinistra: l'incrociato va a
// sinistra; il rovescio del destro gira da sinistra a destra: l'incrociato va a destra), il lungolinea è «contro».
// Come la persona lo chiede (modelli del gesto, tutti nel riferimento del campo):
//   piatto   la racchetta (il telefono) girata all'impatto verso dove vuole la palla, ±12° (come insegna il tutorial:
//            «cima verso il centro» per l'incrociato, «verso l'esterno» per il lungolinea), tempo solito;
//   polso    l'arco dello swing spostato in avanti nel verso del colpo (impatto più avanti, la racchetta «tira» verso
//            l'incrociato) o trattenuto (lungolinea), ±12°, senza girare il corpo prima;
//   tempo    solo il tempo: un attimo prima (incrociato) o dopo (lungolinea), ±0,4 della finestra;
//   naturale piatto ±10° e tempo ±0,25 insieme (come si fa nel tennis vero).
// Rumore di un gesto buono: piatto ±5°, tempo ±0,25 della finestra attorno al voluto (sempre dentro la finestra); la
// «persona vera» (diagnostiche, colpi.mjs REAL): piatto ±12°, tempo +0,35 ±0,45.
// Calibrazioni: rapida (due gesti a vuoto con il braccio), Salta, scambi di prova (B28), e il telefono che dà
// l'accelerazione con il segno opposto non corretto dal nome del browser (Salta e scambi di prova, il verso lo gira il gioco).
// Uscite: matrice voluto → ottenuto (incrociato / centro / lungolinea con la geometria dell'allenamento,
// natpf_training.trainingDirection; fuori e in rete a parte) e quota di colpi fuori o in rete con il gesto buono.
//   node --import ./test/register.mjs scripts/audit/direzione-telefono.mjs [--seeds=1,2] [--n=4] [--level=pro] [--quick] [--json=file] [--serie] [--fuori] [--ritardo]
// B36.0 «Misurare prima» (docs/b36/misure-b36-0.md), con --b36 (le uscite di sempre restano uguali):
//   - giudice 'rimbalzo': dove la palla rimbalza DAVVERO (fisica del motore fino al primo rimbalzo) e fuori con la regola
//     dell'arbitro del motore (+0,22 m di lato, +0,28 m in fondo, registro_registratore.LINEE); di base il banco resta
//     sul bersaglio del motore, come nel B35a;
//   - tre posizioni della palla (chi colpisce al centro e a 2,4 m dalle due parti: il punto neutro di oggi la segue);
//   - serie come quote su almeno 20 semi; partite con il rumore (colpi.mjs partite) sul rimbalzo vero, con semi sbagliati
//     di ±4°, ±8° e ±15°; errore del seme degli scambi di prova (telefono simulato, rumore di posa e di velocità); stessa
//     mira con un'attesa della posa «pronto» di 0, 0,5, 1 e 2 s; colpi con la regola nuova (oggi 0).
//   node --import ./test/register.mjs scripts/audit/direzione-telefono.mjs --b36 [--quick] [--json=file]
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { rng } from '../../test/phone-sim.mjs';
import { armSwing, returnTo } from '../../test/arm-sim.mjs';
import { makePhone, mirrorStroke } from './colpi.mjs';
import { simplePhone, trialPhone, PEOPLE } from './scambi-di-prova.mjs';
import { STROKES } from '../../test/arm-sim.mjs';
import { createHeadlessEngine, gauss } from './headless-engine.mjs';
import { skillLevel } from '../../src/natpf/natpf_skill.js';
import { lateSpanOf, directionSpan, slowFactor } from '../../src/natpf/natpf_stroke_outcome.js';
import { LINEE } from '../../src/natpf/registro/registro_registratore.js';
import { contaColpo, REGOLA } from './b36/simulati.mjs';
import { settled } from './scambi-di-prova.mjs';
import { partite } from './colpi.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const QUICK = process.argv.includes('--quick');
const DT = 1/120, SIDE_LINE = 4.115, BASE_LINE = 11.885;
const clip = (v, a, b) => Math.max(a, Math.min(b, v));
const strokesOf = hand => (hand === 'left' ? { forehand: mirrorStroke(STROKES.dritto), backhand: mirrorStroke(STROKES.rovescio) } : { forehand: STROKES.dritto, backhand: STROKES.rovescio });

export const WANTS = Object.freeze(['cross', 'center', 'line']);
export const MODELS = Object.freeze({
  piatto: { face: 12, shift: 0, u: 0 },
  polso: { face: 0, shift: 12, u: 0 },
  tempo: { face: 0, shift: 0, u: .4 },
  naturale: { face: 10, shift: 0, u: .25 },
  // un incrociato o un lungolinea «verso il centro»: piatto girato appena e tempo solito (non deve mai uscire)
  vicino: { face: 6, shift: 0, u: .1 },
  // chi cerca le righe: piatto girato quasi alla mira piena e tempo nello stesso verso (la precisione è un merito: qui un
  // colpo può uscire)
  riga: { face: 16, shift: 0, u: .4 },
});
// modelli del banco principale (vicino solo nel confronto dei fuori, --fuori)
export const MAIN_MODELS = Object.freeze(['piatto', 'polso', 'tempo', 'naturale', 'riga']);
export const NOISE = Object.freeze({ buono: { face: 5, u: .25, uMed: 0 }, vero: { face: 12, u: .45, uMed: .35 } });
export const CALS = Object.freeze({
  rapida: { label: 'calibrazione rapida (2 gesti)', make: (seed, hand) => makePhone({ seed, hand }) },
  salta: { label: '«Salta» / Nessuna', make: (seed, hand) => simplePhone({ seed, hand }) },
  prova: { label: 'scambi di prova (B28)', make: (seed, hand) => trialPhone({ seed, hand, person: PEOPLE.adulto }) },
  'salta-inv': { label: '«Salta», sensori al contrario', make: (seed, hand) => simplePhone({ seed, hand, ios: true }) },
  'prova-inv': { label: 'scambi di prova, sensori al contrario', make: (seed, hand) => trialPhone({ seed, hand, person: PEOPLE.adulto, ios: true }) },
});
// verso dell'incrociato per chi colpisce (x, + a destra): contrario al lato del contatto (+1 dritto del destro, rovescio
// del mancino)
const contactOf = (hand, side) => (side === 'forehand' ? 1 : -1)*(hand === 'left' ? -1 : 1);

// Un colpo con il braccio. turn: corpo e polso girati attorno alla verticale prima del colpo (gradi, + a destra, come
// colpi.gesture); shift: arco dello swing spostato nel verso del colpo (gradi, + = impatto più avanti nel verso dello swing).
// Il telefono sa da che parte arriva la palla (verso atteso) come in partita.
// attesa (B36.0): ms fermi con la cima già girata prima del colpo (posa «pronto» che segue il telefono fermo); 0 come sempre
export function stroke(p, { side = 'forehand', turn = 0, shift = 0, k = 1, R = Math.random, attesa = 0 } = {}){
  const hand = p.hand || 'right', S = strokesOf(hand)[side], fh = hand === 'left' ? -1 : 1;
  p.det.setPrepMode(true); p.det.setExpect((side === 'forehand' ? fh : -fh)*(p.learner?.sign ?? 1));
  p.rest(450, 4);
  if (turn) p.pose([0, 1, 0], -turn, 80);
  p.rest(250 + attesa, 4);
  const before = p.msgs.length, start = p.q.slice(), total = S.peak*k*S.ms/1000*.5;
  const A = S.axis, l = Math.hypot(...A);
  // apertura (come armSwing con back), con l'arco spostato di shift gradi nel verso del colpo
  p.pose(A.map(a => a/l), -total/2 + shift, 90);
  armSwing(p, { ...S, peak: S.peak*k, wrist: S.wrist*k, tremor: 4, R, back: false });
  p.rest(120, 4); returnTo(p, start);
  p.rest(250, 4);
  if (turn) p.pose([0, 1, 0], turn, 80);
  p.rest(350, 4);
  return p.msgs.slice(before);
}
// il colpo nel motore (come colpi.strike, con il motore della partita che tiene il ritmo): tempo u in unità della finestra
// della direzione (+ anticipo); run/lateral: corsa e palla lontana (qualità)
// B36.0: posizione (m): x di chi colpisce (la palla gli arriva dal lato del colpo); giudice: 'bersaglio' (di base, come nel
// B35a: dove il motore manda la palla) o 'rimbalzo' (dove rimbalza davvero, fuori con la regola dell'arbitro del motore)
export function strike(ev, { e, difficulty = 'pro', u = 0, rally = 3, lateral = .6, run = 0, posizione = 0, giudice = 'bersaglio' } = {}){
  const real = Math.random; Math.random = () => .5;
  try {
    const mx = (ev.natpf?.hand || 'right') === 'left' ? -1 : 1, side = ev.side === 'backhand' ? -1 : 1, vz = 18, ballZ = 10.9;
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = rally;
    e.ball.natpfSuper = null; e.pendingUserSwing = null;
    e.player.pos.set(posizione, 0, ballZ + .5); e.player.vel.set(0, 0, -run*Math.max(1, e.player.maxSpeed || 9)); e.player.targetPos.copy(e.player.pos); e.player.swingCooldown = 0;
    // palla dal lato del colpo (il dritto del destro alla sua destra)
    const bx = posizione + lateral*mx*side;
    e.ball.pos.set(bx, 1, ballZ); e.ball.vel.set(0, 0, vz); e.ball.targetLanding.set(bx, 0, 9);
    const lv = skillLevel(difficulty), span = directionSpan(lv)*slowFactor(vz), late = lateSpanOf(vz, lv), tau = u >= 0 ? u*span : u*late;
    const ok = e._attemptPlayerRallyStrike({ ...ev, natpf: { ...ev.natpf, latency: 0 }, natpfTau: tau, natpfLateSpan: late }, false);
    if (!ok || e.ball.lastHitter !== 'player') return null;
    const L = e.natpfLastRacket, o = L.out;
    contaColpo(o);
    const base = { depth: o.depth, hitX: L.hitX, contact: L.contact, t: o.t, aim: o.aim, q: o.q, face: L.intent.face ?? 0, failed: !!o.failed, grade: o.grade, xBersaglio: o.x };
    if (giudice === 'rimbalzo'){
      const v = volo(e), net = !!o.netFault || v.rete, fuori = net || v.fuori;
      return { ...base, x: v.bx ?? o.x, bx: v.bx, bz: v.bz, netFault: net, fuori, side: !net && v.bx != null && Math.abs(v.bx) > LINEE.x, long: !net && v.bz != null && Math.abs(v.bz) > LINEE.z, senzaRimbalzo: v.bx == null && !net };
    }
    const fuori = !!o.netFault || !!o.failed || Math.abs(o.x) > SIDE_LINE || o.depth > BASE_LINE;
    return { ...base, x: o.x, netFault: !!o.netFault, side: !o.netFault && !o.failed && Math.abs(o.x) > SIDE_LINE, long: !o.netFault && o.depth > BASE_LINE, fuori };
  } finally { Math.random = real; }
}
// B36.0: la palla appena colpita da chi gioca (verso −z) fino al primo rimbalzo o alla rete, con la fisica del motore: dove
// rimbalza (bx, bz), se è fuori per l'arbitro del motore (oltre le righe con la tolleranza, o nella propria metà) e se è
// finita in rete. Gli agganci del motore si tolgono alla fine
export function volo(e){
  const own = k => Object.prototype.hasOwnProperty.call(e, k), ring = e._spawnBounceRing, ringOwn = own('_spawnBounceRing'), award = e._awardPoint, awardOwn = own('_awardPoint');
  let primo = null, rete = false;
  e._spawnBounceRing = function(x, z){ if (!primo && this.ball.lastHitter === 'player' && !(this.ball.bounceCountOnCurrentSide > 0)) primo = { x, z }; return ring.call(this, x, z); };
  e._awardPoint = function(who, why = ''){ if (!primo && why === 'Net') rete = true; return award.call(this, who, why); };
  try { for (let i = 0; i < 600 && !primo && !rete && e.ball.inPlay && e.phase === 'RALLY'; i++) e.step(DT); }
  finally { if (ringOwn) e._spawnBounceRing = ring; else delete e._spawnBounceRing; if (awardOwn) e._awardPoint = award; else delete e._awardPoint; }
  const fuori = !!primo && (primo.z > 0 || Math.abs(primo.x) > LINEE.x || Math.abs(primo.z) > LINEE.z);
  return { bx: primo ? +primo.x.toFixed(3) : null, bz: primo ? +primo.z.toFixed(3) : null, fuori, rete };
}
// direzione ottenuta dal lato del contatto: lungolinea oltre LINE m dal centro dalla parte del colpo, incrociato oltre LINE
// dall'altra parte, centro in mezzo (come la soglia di natpf_training.trainingDirection, senza il suo limite di 2,6 m dal
// punto d'impatto, che conta come «centro» un lungolinea largo)
export const LINE = 1.25;
export const got = r => (!r ? 'perso' : r.netFault ? 'rete' : r.fuori ? 'fuori' : r.contact*r.x >= LINE ? 'line' : r.contact*r.x <= -LINE ? 'cross' : 'center');

// Una partita di prova: telefono calibrato, 8 colpi normali, poi per ogni lato e voluto n colpi (alternati come in uno
// scambio: incrociato, centro, lungolinea, …) che imparano come in partita. noise: rumore della persona
// warm: colpi normali prima delle prove (con «Salta» e i sensori al contrario il verso si gira dopo 4–5 colpi e il centro
// della mira riparte: servono altri 3 colpi per verso)
// late: tempo spostato di tanto (unità della finestra, − ritardo; senza il limite ±0,95), come uno schermo in ritardo non
// misurato; aimFull: gradi della mira piena (opzione «Mira» dello stand: alta 17, media 20, bassa 23)
export function match({ cal = 'prova', hand = 'right', seed = 1, n = 4, model = 'naturale', noise = 'buono', difficulty = 'pro', run = 0, lateral = .6, warm = 8, late = 0, aimFull = null, posizione = 0, giudice = 'bersaglio' } = {}){
  const p = CALS[cal].make(seed, hand); p.hand = hand;
  const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
  const R = rng(seed*977 + 13), M = MODELS[model], N = NOISE[noise], rows = [];
  const one = (side, want, learnOnly = false) => {
    const c = contactOf(hand, side), w = want === 'cross' ? 1 : want === 'line' ? -1 : 0;
    // piatto girato verso l'incrociato: a sinistra (−) per il dritto del destro, cioè −c gradi; lo spostamento dell'arco
    // nel verso del colpo è già «verso l'incrociato»
    const turn = -c*w*M.face + gauss(R)*N.face, shift = w*M.shift, u = clip(N.uMed + w*M.u + gauss(R)*N.u, -.95, .95) + late;
    const msgs = stroke(p, { side, turn, shift, k: clip(1 + gauss(R)*.15, .6, 1.5), R });
    if (msgs.length !== 1){ if (!learnOnly) rows.push({ side, want, got: 'perso', n: msgs.length }); return; }
    const r = p.game(msgs[0], { aimFull }), o = strike(r.ev, { e, difficulty, u, rally: 3 + rows.length, run, lateral, posizione, giudice });
    if (learnOnly) return;
    rows.push({ side, want, got: got(o), read: r.ev.side, x: o?.x ?? null, aim: o?.aim ?? null, face: o?.face ?? null, t: o?.t ?? null, u: +u.toFixed(2), turn: +turn.toFixed(1), q: o?.q ?? null, fuori: !!o?.fuori, long: !!o?.long, wide: !!o?.side, net: !!o?.netFault,
      ...(giudice === 'rimbalzo' ? { dev: r.ev.natpf.aimDev ?? null, xBersaglio: o?.xBersaglio ?? null, bz: o?.bz ?? null } : {}) });
  };
  for (let i = 0; i < warm; i++) one(i % 2 ? 'backhand' : 'forehand', 'center', true);
  for (let i = 0; i < n; i++) for (const side of ['forehand', 'backhand']) for (const want of WANTS) one(side, want);
  return { cal, hand, seed, model, noise, sign: p.learner?.sign ?? 1, rows };
}
// Serie: lo stesso voluto ripetuto (chi prova l'incrociato dieci volte di fila): ottenuto per colpo
export function serie({ cal = 'prova', hand = 'right', seed = 1, n = 14, side = 'forehand', want = 'cross', model = 'naturale', noise = 'buono', difficulty = 'pro', posizione = 0, giudice = 'bersaglio' } = {}){
  const p = CALS[cal].make(seed, hand); p.hand = hand;
  const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
  const R = rng(seed*131 + 3), M = MODELS[model], N = NOISE[noise], out = [];
  for (let i = 0; i < 8 + n; i++){
    const s = i < 8 ? (i % 2 ? 'backhand' : 'forehand') : side, w = i < 8 ? 0 : want === 'cross' ? 1 : want === 'line' ? -1 : 0, c = contactOf(hand, s);
    const turn = -c*w*M.face + gauss(R)*N.face, u = clip(N.uMed + w*M.u + gauss(R)*N.u, -.95, .95);
    const msgs = stroke(p, { side: s, turn, shift: w*M.shift, R });
    if (msgs.length !== 1){ if (i >= 8) out.push('perso'); continue; }
    const r = p.game(msgs[0]), o = strike(r.ev, { e, difficulty, u, rally: 3 + i, posizione, giudice });
    if (i >= 8) out.push(got(o));
  }
  return out;
}
const pct = (a, b) => (b ? Math.round(100*a/b) : 0);
export function matrix(rows){
  const m = {};
  for (const w of WANTS){
    const rs = rows.filter(r => r.want === w), n = rs.length, c = k => rs.filter(r => r.got === k).length;
    m[w] = { n, cross: pct(c('cross'), n), center: pct(c('center'), n), line: pct(c('line'), n), fuori: pct(c('fuori'), n), rete: pct(c('rete'), n), perso: pct(c('perso'), n) };
  }
  const all = rows.length, hit = rows.filter(r => r.want === r.got).length;
  return { m, ok: pct(hit, all), fuori: pct(rows.filter(r => r.got === 'fuori' || r.got === 'rete').length, all), crossFuori: pct(rows.filter(r => r.want !== 'line' && (r.got === 'fuori' || r.got === 'rete')).length, rows.filter(r => r.want !== 'line').length) };
}
export function audit({ seeds = [1, 2], n = 4, hands = ['right', 'left'], cals = Object.keys(CALS), models = MAIN_MODELS, noise = 'buono', difficulty = 'pro', run = 0, lateral = .6, late = 0, aimFull = null, posizione = 0, giudice = 'bersaglio' } = {}){
  const res = [];
  for (const hand of hands) for (const cal of cals) for (const model of models) for (const seed of seeds){
    const r = match({ cal, hand, seed, n, model, noise, difficulty, run, lateral, late, aimFull, posizione, giudice });
    for (const row of r.rows) res.push({ hand, cal, model, seed, sign: r.sign, ...row });
  }
  return res;
}
const line = (label, M) => `${label.padEnd(34)}${WANTS.map(w => `${String(M.m[w].cross).padStart(4)}${String(M.m[w].center).padStart(4)}${String(M.m[w].line).padStart(4)}${String(M.m[w].fuori + M.m[w].rete).padStart(4)} |`).join('')} giusti ${String(M.ok).padStart(3)}%  fuori ${String(M.fuori).padStart(3)}%`;
export function report(rows, title){
  const out = [title, `${''.padEnd(34)}${WANTS.map(w => `voluto ${w.padEnd(9)}|`).join('')}`, `${''.padEnd(34)}${WANTS.map(() => '  in  ce  lu  fu |').join('')}`];
  const by = (f, keys, lab) => { for (const k of keys){ const rs = rows.filter(r => f(r) === k); if (rs.length) out.push(line(lab(k), matrix(rs))); } };
  out.push(line('tutto', matrix(rows)));
  by(r => `${r.hand} ${r.side}`, ['right forehand', 'right backhand', 'left forehand', 'left backhand'], k => k.replace('right', 'destro').replace('left', 'mancino').replace('forehand', 'dritto').replace('backhand', 'rovescio'));
  by(r => r.cal, Object.keys(CALS), k => CALS[k].label);
  by(r => r.model, Object.keys(MODELS), k => `gesto «${k}»`);
  return out.join('\n');
}

/* ---------- B36.0 «Misurare prima» (docs/b36/misure-b36-0.md): solo misure, sulla regola di oggi ---------- */
// tre posizioni della palla: chi colpisce al centro e a 2,4 m dalle due parti (la palla gli arriva dal lato del colpo)
export const POSIZIONI = Object.freeze({ centro: 0, destra: 2.4, sinistra: -2.4 });
// calibrazioni con il segno giusto dei sensori (quelle con i sensori al contrario sono nel banco del B35a)
export const CALS_B36 = Object.freeze(['rapida', 'salta', 'prova']);
const fra = (rs, f) => rs.filter(f).length;
// sintesi di un gruppo di colpi: giusti, fuori o in rete, incrociato ↔ lungolinea scambiati
export function sintesi(rows){
  const n = rows.length, voluti = w => rows.filter(r => r.want === w);
  return { colpi: n, giusti: pct(fra(rows, r => r.want === r.got), n), fuori: pct(fra(rows, r => r.got === 'fuori' || r.got === 'rete'), n),
    incrLung: pct(fra(voluti('cross'), r => r.got === 'line'), voluti('cross').length), lungIncr: pct(fra(voluti('line'), r => r.got === 'cross'), voluti('line').length) };
}
// matrice della direzione con le tre posizioni della palla, sul rimbalzo vero (o sul bersaglio, per il confronto)
export function matriceB36({ seeds = [1, 2, 3, 4], n = 4, noise = 'buono', models = ['piatto', 'naturale', 'tempo', 'riga'], hands = ['right', 'left'], cals = CALS_B36, giudice = 'rimbalzo', posizioni = POSIZIONI } = {}){
  return Object.fromEntries(Object.entries(posizioni).map(([nome, posizione]) => [nome, audit({ seeds, n, hands, cals, models, noise, posizione, giudice })]));
}
// serie (lo stesso voluto 14 volte di fila) come quote su `semi` serie con semi diversi: giusti con l'errore standard
export function serieB36({ semi = 20, models = ['piatto', 'naturale'], wants = WANTS, noise = 'buono', giudice = 'rimbalzo' } = {}){
  const out = [];
  for (const model of models) for (const want of wants){
    const all = []; for (let k = 1; k <= semi; k++) all.push(...serie({ seed: 100 + k, want, model, noise, giudice }));
    const n = all.length, p = fra(all, g => g === want)/Math.max(1, n);
    out.push({ model, want, semi, colpi: n, giusti: Math.round(100*p), errore: Math.round(100*Math.sqrt(p*(1 - p)/Math.max(1, n))), fuori: pct(fra(all, g => g === 'fuori' || g === 'rete'), n) });
  }
  return out;
}
// partite con il rumore (persona vera di colpi.mjs, centro della mira seminato con un errore), giudicate sul rimbalzo vero
export function partiteB36({ errori = [0, 4, 8, 15], runs = 24, n = 80 } = {}){
  return errori.flatMap(err => (err ? [err, -err] : [0]).map(seedErr => partite({ seedErr, runs, n, su: 'rimbalzo' })));
}
// errore del seme degli scambi di prova: centro della mira subito dopo gli scambi contro quello del telefono «assestato»
// della stessa persona (scambi-di-prova.settled), per verso, in gradi. Le persone hanno il rumore di posa (piatto girato
// a caso, yawSd) e di velocità (kSd) in ogni colpo
const giro360 = a => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
export function semeB36({ semi = 20, persone = ['adulto', 'bambino', 'impreciso'], hand = 'right', percorsi = { 'scambi di prova 2+2': {}, 'scambi di prova 1+1': { hits: i => i < 2 } } } = {}){
  const out = [];
  for (const pk of persone) for (const [label, o] of Object.entries(percorsi)){
    const err = []; let senza = 0;
    for (let seed = 1; seed <= semi; seed++){
      const person = PEOPLE[pk], C = settled({ seed, hand, person }), p = trialPhone({ seed, hand, person, ...o });
      for (const d of [1, -1]){ const c = p.models.aims.center(d), c0 = C.models.aims.center(d); if (c == null || c0 == null){ senza++; continue; } err.push(Math.abs(giro360(c - c0))); }
    }
    const s = [...err].sort((a, b) => a - b), q = f => (s.length ? s[Math.min(s.length - 1, Math.floor(f*s.length))] : null);
    out.push({ persona: PEOPLE[pk].label, percorso: label, versi: err.length, senzaSeme: senza, medio: s.length ? s.reduce((a, b) => a + b, 0)/s.length : null, p50: q(.5), p90: q(.9), max: s.at(-1) ?? null, oltre8: pct(fra(s, v => v > 8), s.length) });
  }
  return out;
}
// stessa mira con l'attesa della posa «pronto»: la cima girata di `giro` gradi verso l'incrociato, poi ferma `attesa` ms
// prima del colpo; tempo a 0, senza rumore; dritti e rovesci. Scarto letto dal gioco e dove rimbalza la palla (verso
// l'incrociato), rispetto all'attesa 0
export function attesaB36({ semi = 8, attese = [0, 500, 1000, 2000], giro = 15, hand = 'right', cal = 'prova' } = {}){
  const rows = [];
  for (let seed = 1; seed <= semi; seed++){
    const p = CALS[cal].make(seed, hand); p.hand = hand;
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
    const R = rng(seed*977 + 13);
    for (let i = 0; i < 8; i++){ const m = stroke(p, { side: i % 2 ? 'backhand' : 'forehand', R }); if (m.length === 1) p.game(m[0]); }
    for (const attesa of attese) for (const side of ['forehand', 'backhand']){
      const c = contactOf(hand, side), m = stroke(p, { side, turn: -c*giro, attesa, R });
      if (m.length !== 1){ rows.push({ seed, attesa, side, perso: true }); continue; }
      const r = p.game(m[0], { learn: false }), o = strike(r.ev, { e, u: 0, rally: 3, giudice: 'rimbalzo' });
      rows.push({ seed, attesa, side, giro: Number.isFinite(r.ev.natpf.aimDev) ? -c*r.ev.natpf.aimDev : null, x: o && Number.isFinite(o.x) ? -c*o.x : null });
    }
  }
  const media = v => { const f = v.filter(Number.isFinite); return f.length ? f.reduce((a, b) => a + b, 0)/f.length : null; };
  const per = attese.map(attesa => { const rs = rows.filter(r => r.attesa === attesa && !r.perso); return { attesa, colpi: rs.length, giro: media(rs.map(r => r.giro)), x: media(rs.map(r => r.x)), persi: rows.filter(r => r.attesa === attesa && r.perso).length }; });
  return per.map(r => ({ ...r, giroPct: per[0].giro ? Math.round(100*r.giro/per[0].giro) : null, dx: r.x != null && per[0].x != null ? +(r.x - per[0].x).toFixed(2) : null }));
}
const f1 = v => (v == null || !Number.isFinite(v) ? '–' : v.toFixed(1).replace('.', ','));
const f2 = v => (v == null || !Number.isFinite(v) ? '–' : v.toFixed(2).replace('.', ','));
export function mainB36({ quick = QUICK } = {}){
  const json = {}, t0 = Date.now(), seeds = quick ? [1, 2] : [1, 2, 3, 4], models = quick ? ['piatto', 'naturale'] : ['piatto', 'naturale', 'tempo', 'riga'];
  console.log('== B36.0 · misure della direzione dei colpi. SIMULAZIONE: telefono simulato con il braccio, motore vero senza grafica, Esperta (pro); non sono persone ==');
  console.log(`
-- Matrice della direzione, tre posizioni della palla, sul RIMBALZO VERO (fuori con la regola dell'arbitro del motore); semi ${seeds.join(',')}, destri e mancini, calibrazioni ${CALS_B36.join(', ')}, 4 colpi per voluto e lato --`);
  console.log('gesto                     posizione  giusti  fuori/rete  incrociato→lungolinea  lungolinea→incrociato  colpi');
  for (const noise of ['buono', 'vero']){
    const M = matriceB36({ seeds, models, noise }); json[`matrice ${noise}`] = M;
    for (const model of models) for (const [pos, rows] of Object.entries(M)){
      const S = sintesi(rows.filter(r => r.model === model));
      console.log(`${(`${model} (${noise === 'buono' ? 'gesto buono' : 'persona vera'})`).padEnd(26)}${pos.padEnd(11)}${String(S.giusti).padStart(5)}%${String(S.fuori).padStart(10)}%${String(S.incrLung).padStart(20)}%${String(S.lungIncr).padStart(22)}%${String(S.colpi).padStart(8)}`);
    }
  }
  // il confronto con il bersaglio (come il B35a): stessa matrice al centro
  const B = matriceB36({ seeds, models: ['piatto'], noise: 'buono', giudice: 'bersaglio', posizioni: { centro: 0 } }).centro, Rb = json['matrice buono'].centro.filter(r => r.model === 'piatto');
  const Sb = sintesi(B), Sr = sintesi(Rb);
  console.log(`confronto, gesto «piatto» buono al centro: giusti ${Sb.giusti}% sul bersaglio del motore (come il B35a) e ${Sr.giusti}% sul rimbalzo vero; fuori ${Sb.fuori}% e ${Sr.fuori}%`);
  json.confronto = { bersaglio: Sb, rimbalzo: Sr };
  const semiSerie = quick ? 6 : 20;
  console.log(`
-- Serie: lo stesso voluto 14 volte di fila dopo 8 colpi normali, come quote su ${semiSerie} serie con semi diversi (dritto del destro, scambi di prova, gesto buono, rimbalzo vero) --`);
  const S = serieB36({ semi: semiSerie }); json.serie = S;
  for (const r of S) console.log(`${r.model.padEnd(9)} voluto ${({ cross: 'incrociato', center: 'centro', line: 'lungolinea' })[r.want].padEnd(11)} giusti ${String(r.giusti).padStart(3)}% ± ${r.errore}  fuori/rete ${String(r.fuori).padStart(3)}%  (${r.colpi} colpi)`);
  const runs = quick ? 8 : 24;
  console.log(`
-- Partite con il rumore (persona vera di colpi.mjs: piatto ±12°, tempo +0,35 ±0,45; ${runs} partite da 80 colpi, livello casual) sul rimbalzo vero, centro della mira seminato sbagliato --`);
  console.log('  per blocco di colpi: |mediana x| della partita (media, m) · partite oltre 1 m da una parte · errore del centro a fine blocco (°)');
  const P = partiteB36({ runs }); json.partite = P;
  for (const r of P) console.log(`  seme ${String(r.seedErr > 0 ? `+${r.seedErr}` : r.seedErr).padStart(4)}°  ` + r.blocks.map(b => `colpi ${b.shots}: ${f2(b.mabs)} m, oltre 1 m ${b.over1}/${r.runs}, centro ${f1(b.cabs)}°`).join(' · '));
  const semiSeme = quick ? 6 : 20;
  console.log(`
-- Errore del seme degli scambi di prova (telefono simulato con rumore di posa e di velocità, ${semiSeme} telefoni per riga, destri): centro della mira dopo gli scambi contro quello del telefono assestato --`);
  const E = semeB36({ semi: semiSeme }); json.seme = E;
  for (const r of E) console.log(`${r.persona.padEnd(16)} ${r.percorso.padEnd(20)} |errore| medio ${f1(r.medio)}°, metà sotto ${f1(r.p50)}°, 9 su 10 sotto ${f1(r.p90)}°, massimo ${f1(r.max)}°, oltre 8° ${r.oltre8}% (${r.versi} versi${r.senzaSeme ? `, senza seme ${r.senzaSeme}` : ''})`);
  const semiAtt = quick ? 4 : 8;
  console.log(`
-- Stessa mira con l'attesa della posa «pronto»: cima girata di 15° verso l'incrociato e tenuta ferma prima del colpo (tempo a 0, ${semiAtt} telefoni, dritti e rovesci, rimbalzo vero) --`);
  const A = attesaB36({ semi: semiAtt }); json.attesa = A;
  for (const r of A) console.log(`attesa ${f1(r.attesa/1000)} s: scarto letto ${f1(r.giro)}° (${r.giroPct}% di quello senza attesa), palla a ${f2(r.x)} m verso l'incrociato (${r.dx >= 0 ? '+' : ''}${f2(r.dx)} m)${r.persi ? `, colpi persi ${r.persi}` : ''}`);
  console.log(`
-- Colpi con la regola nuova della direzione: ${REGOLA.nuova} su ${REGOLA.colpi} (oggi c'è solo «Classica»: 0). Tempo del banco: ${Math.round((Date.now() - t0)/1000)} s --`);
  json.regolaNuova = { ...REGOLA };
  const file = arg('json'); if (file) writeFileSync(file, JSON.stringify(json));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes('--b36')) mainB36();
else if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const seeds = (arg('seeds') || (QUICK ? '1' : '1,2')).split(',').map(Number), n = +(arg('n') || (QUICK ? 2 : 4)), difficulty = arg('level') || 'pro';
  const json = {};
  for (const noise of ['buono', 'vero']){
    const rows = audit({ seeds, n, noise, difficulty });
    json[noise] = rows;
    console.log(report(rows, `\n== ${difficulty}, gesto ${noise === 'buono' ? 'buono (piatto ±5°, tempo ±0,25)' : 'della persona vera (piatto ±12°, tempo +0,35 ±0,45)'}, semi ${seeds.join(',')}, ${n} colpi per voluto e lato ==`));
  }
  // in corsa (B32): qualità più bassa, gesto buono, solo calibrazioni con il segno giusto
  const run = audit({ seeds, n, noise: 'buono', difficulty, run: .7, lateral: 1.6, cals: ['rapida', 'salta', 'prova'] });
  json.corsa = run;
  console.log(report(run, `\n== ${difficulty}, gesto buono IN CORSA (corsa 0,7, palla a 1,6 m) ==`));
  if (process.argv.includes('--serie')){
    console.log('\n== serie: lo stesso voluto 14 volte di fila (dopo 8 colpi normali), dritto del destro, scambi di prova ==');
    for (const want of WANTS) for (const model of ['piatto', 'naturale']) console.log(`${want.padEnd(7)} ${model.padEnd(9)} ${serie({ want, model, seed: seeds[0] }).map(g => ({ cross: 'I', center: 'c', line: 'L', fuori: 'F', rete: 'R', perso: '-' })[g]).join(' ')}`);
  }
  if (process.argv.includes('--fuori')){
    // colpi fuori con il gesto buono: a Leggenda in corsa (la palla non è tenuta in campo) con la mira alta e bassa, e
    // con il tempo sempre in ritardo di 1,2 finestre (schermo in ritardo non misurato, Pro)
    const cals = ['rapida', 'salta', 'prova'], models = ['naturale', 'vicino', 'riga'];
    for (const [label, o] of [['Leggenda in corsa, mira alta 17°', { difficulty: 'leggenda', run: .7, lateral: 1.6 }], ['Leggenda in corsa, mira bassa 23°', { difficulty: 'leggenda', run: .7, lateral: 1.6, aimFull: 23 }],
      ['Pro da fermo, tempo in ritardo di 1,2 finestre', { difficulty: 'pro', late: -1.2 }]]){
      const rows = audit({ seeds, n, noise: 'buono', cals, models, ...o });
      json[label] = rows;
      console.log(report(rows, `\n== fuori: ${label} ==`).split('\n').filter(l => !/calibrazione|Salta|scambi|destro|mancino/.test(l)).join('\n'));
    }
  }
  if (process.argv.includes('--ritardo')){
    // B35a: schermo in ritardo non misurato. Tempo sempre spostato di 0,6 / 1,2 / 1,8 finestre in ritardo (a 18 m/s circa
    // 47 / 93 / 140 ms), Pro, gesto buono «naturale», tre calibrazioni, destri e mancini: incrociato voluto → incrociato e
    // lungolinea, giusti, fuori o in rete
    console.log(`\n== ritardo costante (Pro, gesto buono «naturale», semi ${seeds.join(',')}) ==\nritardo  | incrociato voluto: in / lu | centro voluto: ce | lungolinea voluto: lu / fuori | giusti | fuori`);
    for (const late of [0, -.6, -1.2, -1.8]){
      const rows = audit({ seeds, n, noise: 'buono', cals: ['rapida', 'salta', 'prova'], models: ['naturale'], late }), M = matrix(rows);
      json[`ritardo ${late}`] = rows;
      console.log(`${String(-late).padEnd(8)} | ${String(M.m.cross.cross).padStart(3)} / ${String(M.m.cross.line).padStart(3)}${' '.repeat(16)}| ${String(M.m.center.center).padStart(3)}${' '.repeat(14)}| ${String(M.m.line.line).padStart(3)} / ${String(M.m.line.fuori + M.m.line.rete).padStart(3)}${' '.repeat(17)}| ${String(M.ok).padStart(3)}%   | ${String(M.fuori).padStart(3)}%`);
    }
  }
  const file = arg('json'); if (file) writeFileSync(file, JSON.stringify(json));
}
