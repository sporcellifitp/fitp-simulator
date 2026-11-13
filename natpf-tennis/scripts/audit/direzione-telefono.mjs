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
//   node --import ./test/register.mjs scripts/audit/direzione-telefono.mjs [--seeds=1,2] [--n=4] [--level=pro] [--quick] [--json=file] [--serie]
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
  // chi cerca le righe: piatto girato quasi alla mira piena e tempo nello stesso verso (la precisione è un merito: qui un
  // colpo può uscire)
  riga: { face: 16, shift: 0, u: .4 },
});
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
export function stroke(p, { side = 'forehand', turn = 0, shift = 0, k = 1, R = Math.random } = {}){
  const hand = p.hand || 'right', S = strokesOf(hand)[side], fh = hand === 'left' ? -1 : 1;
  p.det.setPrepMode(true); p.det.setExpect((side === 'forehand' ? fh : -fh)*(p.learner?.sign ?? 1));
  p.rest(450, 4);
  if (turn) p.pose([0, 1, 0], -turn, 80);
  p.rest(250, 4);
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
export function strike(ev, { e, difficulty = 'pro', u = 0, rally = 3, lateral = .6, run = 0 } = {}){
  const real = Math.random; Math.random = () => .5;
  try {
    const mx = (ev.natpf?.hand || 'right') === 'left' ? -1 : 1, side = ev.side === 'backhand' ? -1 : 1, vz = 18, ballZ = 10.9;
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = rally;
    e.ball.natpfSuper = null; e.pendingUserSwing = null;
    e.player.pos.set(0, 0, ballZ + .5); e.player.vel.set(0, 0, -run*Math.max(1, e.player.maxSpeed || 9)); e.player.targetPos.copy(e.player.pos); e.player.swingCooldown = 0;
    // palla dal lato del colpo (il dritto del destro alla sua destra)
    const bx = lateral*mx*side;
    e.ball.pos.set(bx, 1, ballZ); e.ball.vel.set(0, 0, vz); e.ball.targetLanding.set(bx, 0, 9);
    const lv = skillLevel(difficulty), span = directionSpan(lv)*slowFactor(vz), late = lateSpanOf(vz, lv), tau = u >= 0 ? u*span : u*late;
    const ok = e._attemptPlayerRallyStrike({ ...ev, natpf: { ...ev.natpf, latency: 0 }, natpfTau: tau, natpfLateSpan: late }, false);
    if (!ok || e.ball.lastHitter !== 'player') return null;
    const L = e.natpfLastRacket, o = L.out;
    const fuori = !!o.netFault || !!o.failed || Math.abs(o.x) > SIDE_LINE || o.depth > BASE_LINE;
    return { x: o.x, depth: o.depth, hitX: L.hitX, contact: L.contact, t: o.t, aim: o.aim, q: o.q, face: L.intent.face ?? 0, netFault: !!o.netFault, failed: !!o.failed,
      side: !o.netFault && !o.failed && Math.abs(o.x) > SIDE_LINE, long: !o.netFault && o.depth > BASE_LINE, fuori, grade: o.grade };
  } finally { Math.random = real; }
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
export function match({ cal = 'prova', hand = 'right', seed = 1, n = 4, model = 'naturale', noise = 'buono', difficulty = 'pro', run = 0, lateral = .6, warm = 8 } = {}){
  const p = CALS[cal].make(seed, hand); p.hand = hand;
  const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
  const R = rng(seed*977 + 13), M = MODELS[model], N = NOISE[noise], rows = [];
  const one = (side, want, learnOnly = false) => {
    const c = contactOf(hand, side), w = want === 'cross' ? 1 : want === 'line' ? -1 : 0;
    // piatto girato verso l'incrociato: a sinistra (−) per il dritto del destro, cioè −c gradi; lo spostamento dell'arco
    // nel verso del colpo è già «verso l'incrociato»
    const turn = -c*w*M.face + gauss(R)*N.face, shift = w*M.shift, u = clip(N.uMed + w*M.u + gauss(R)*N.u, -.95, .95);
    const msgs = stroke(p, { side, turn, shift, k: clip(1 + gauss(R)*.15, .6, 1.5), R });
    if (msgs.length !== 1){ if (!learnOnly) rows.push({ side, want, got: 'perso', n: msgs.length }); return; }
    const r = p.game(msgs[0]), o = strike(r.ev, { e, difficulty, u, rally: 3 + rows.length, run, lateral });
    if (learnOnly) return;
    rows.push({ side, want, got: got(o), read: r.ev.side, x: o?.x ?? null, aim: o?.aim ?? null, face: o?.face ?? null, t: o?.t ?? null, u: +u.toFixed(2), turn: +turn.toFixed(1), q: o?.q ?? null, fuori: !!o?.fuori, long: !!o?.long, wide: !!o?.side, net: !!o?.netFault });
  };
  for (let i = 0; i < warm; i++) one(i % 2 ? 'backhand' : 'forehand', 'center', true);
  for (let i = 0; i < n; i++) for (const side of ['forehand', 'backhand']) for (const want of WANTS) one(side, want);
  return { cal, hand, seed, model, noise, sign: p.learner?.sign ?? 1, rows };
}
// Serie: lo stesso voluto ripetuto (chi prova l'incrociato dieci volte di fila): ottenuto per colpo
export function serie({ cal = 'prova', hand = 'right', seed = 1, n = 14, side = 'forehand', want = 'cross', model = 'naturale', noise = 'buono', difficulty = 'pro' } = {}){
  const p = CALS[cal].make(seed, hand); p.hand = hand;
  const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
  const R = rng(seed*131 + 3), M = MODELS[model], N = NOISE[noise], out = [];
  for (let i = 0; i < 8 + n; i++){
    const s = i < 8 ? (i % 2 ? 'backhand' : 'forehand') : side, w = i < 8 ? 0 : want === 'cross' ? 1 : want === 'line' ? -1 : 0, c = contactOf(hand, s);
    const turn = -c*w*M.face + gauss(R)*N.face, u = clip(N.uMed + w*M.u + gauss(R)*N.u, -.95, .95);
    const msgs = stroke(p, { side: s, turn, shift: w*M.shift, R });
    if (msgs.length !== 1){ if (i >= 8) out.push('perso'); continue; }
    const r = p.game(msgs[0]), o = strike(r.ev, { e, difficulty, u, rally: 3 + i });
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
export function audit({ seeds = [1, 2], n = 4, hands = ['right', 'left'], cals = Object.keys(CALS), models = Object.keys(MODELS), noise = 'buono', difficulty = 'pro', run = 0, lateral = .6 } = {}){
  const res = [];
  for (const hand of hands) for (const cal of cals) for (const model of models) for (const seed of seeds){
    const r = match({ cal, hand, seed, n, model, noise, difficulty, run, lateral });
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

if (import.meta.url === pathToFileURL(process.argv[1]).href){
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
  const file = arg('json'); if (file) writeFileSync(file, JSON.stringify(json));
}
