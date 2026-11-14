// Calibrazione giocando (B28, 12/11/2026): gli scambi di prova insegnano al gioco quanto i due gesti a vuoto di prima?
// Banco sulle regole vere (telefono simulato con il braccio, test/phone-sim.mjs e test/arm-sim.mjs, presa della foto; non
// è una misura di persone). Tre percorsi prima dei colpi della partita, per la stessa persona e gli stessi colpi:
//   G  2 gesti (prima del B28): calibrazione rapida, un dritto e un rovescio a vuoto a forza calK del proprio colpo
//      (calK < 1: il gesto a vuoto è spesso un colpetto), con il piatto girato a caso come nei colpi veri (nessuno mira un
//      gesto a vuoto); G0: lo stesso colpetto con il piatto dritto; G1: gesti «da manuale», forti come il proprio colpo e
//      con il piatto dritto (il caso migliore possibile per i gesti);
//   S  «Salta» (prima del B28) e «Nessuna» (B28): profilo semplice, il gioco impara dai colpi della partita;
//   P  scambi di prova (B28): profilo semplice da capo, palle dal lato noto (dritto, rovescio, dritto, rovescio, poi dal
//      lato che manca, fino a 6), apprendimento (natpf_trial_learn.js), profilo imparato. Varianti: chi colpisce tutte le
//      palle (2+2), una per lato (1+1), solo dal dritto, mai; e il telefono che dà l'accelerazione con il segno opposto
//      (verso della gravità invertito: per S e P).
// Poi i primi N colpi della partita (60 % dritti, forza e piatto della persona). Riferimento: lo stesso gesto letto da un
// telefono «assestato» della stessa persona (gesti della calibrazione uguali al proprio colpo e 24 colpi giocati, senza
// imparare dal gesto letto). Per colpo: lato letto diverso da quello vero del gesto, tipo diverso dal riferimento,
// |forza − forza di riferimento| (tutti e primi 3), |mira − mira di riferimento| in gradi (e colpi senza mira: il centro
// non c'è ancora), colpi persi (il telefono non manda il colpo). In più l'errore del seme del centro della mira (gradi)
// subito dopo la calibrazione o gli scambi di prova, che è l'ingresso di «lato delle palle» (colpi.mjs --mode=lato).
// Persone: adulto, adulto forte, bambino debole, gesto impreciso (forza e piatto più variabili); destro e mancino.
// «Telefono che passa di mano» (difetto 5 dell'audit B16): adulto forte e poi bambino debole sullo stesso telefono (e
// viceversa), senza «Nuovo giocatore»: forza letta nei primi 3 colpi del secondo, contro la sua forza assestata.
//   node --import ./test/register.mjs scripts/audit/scambi-di-prova.mjs [--seeds=12] [--n=10] [--hand=right|left|both] [--json=file] [--quick]
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { simPhone, rng } from '../../test/phone-sim.mjs';
import { armSwing, photoGrip, STROKES } from '../../test/arm-sim.mjs';
import { gesture, mirrorStroke, lato, LATO } from './colpi.mjs';
import { gauss } from './headless-engine.mjs';
import { trialSide, trialDone, wantOfSide, TRIAL } from '../../src/natpf/natpf_trial_learn.js';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const QUICK = process.argv.includes('--quick');
export const PEOPLE = Object.freeze({
  adulto: { label: 'adulto', k: 1, kSd: .2, yawSd: 10, calK: .6 },
  forte: { label: 'adulto forte', k: 1.45, kSd: .2, yawSd: 10, calK: .6 },
  bambino: { label: 'bambino debole', k: .5, kSd: .2, yawSd: 12, calK: .7 },
  impreciso: { label: 'gesto impreciso', k: 1, kSd: .4, yawSd: 20, calK: .4 },
});
const strokesOf = hand => (hand === 'left' ? { forehand: mirrorStroke(STROKES.dritto), backhand: mirrorStroke(STROKES.rovescio) } : { forehand: STROKES.dritto, backhand: STROKES.rovescio });
const clip = (v, a, b) => Math.max(a, Math.min(b, v));
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0)/a.length : NaN);
const f = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
// un colpo della persona: forza attorno alla sua (k ± kSd), piatto girato ± yawSd
const draw = (person, R) => ({ k: clip(person.k*(1 + gauss(R)*person.kSd), .25, 2.2), yaw: clip(gauss(R)*person.yawSd, -30, 30) });
const base = ({ seed, hand, ios = false }) => { const p = simPhone({ seed, shape: true, hand, ios, fix: false }); p.hand = hand; photoGrip(p, { hand }); return p; };
const play = (p, g, R, opts = {}) => { const m = gesture(p, { ...g, R }); return m.length === 1 ? p.game(m[0], opts) : null; };
// G: i due gesti a vuoto a forza kc del colpo del braccio
// yawSd: piatto girato a caso anche nei gesti a vuoto (gradi), come nei colpi veri; 0 = gesti «da manuale»
export function gesturePhone({ seed, hand, kc, yawSd = 0 }){
  const p = base({ seed, hand }), R = rng(seed*31 + 5), S = strokesOf(hand);
  p.calibrate({ armGesture: w => {
    const s = (w === 'L') === (hand !== 'left') ? S.forehand : S.backhand, yaw = yawSd ? clip(gauss(R)*yawSd, -30, 30) : 0;
    if (yaw){ p.pose([0, 1, 0], -yaw, 18); p.rest(700, 2); }       // piano, sotto la soglia dei gesti della calibrazione
    armSwing(p, { ...s, peak: s.peak*kc, wrist: s.wrist*kc, tremor: 4, R });
    if (yaw){ p.rest(500, 2); p.pose([0, 1, 0], yaw, 18); }
  } });
  return p;
}
// S: «Salta» / «Nessuna»
export function simplePhone({ seed, hand, ios = false }){ const p = base({ seed, hand, ios }); p.skip(); return p; }
// P: scambi di prova. hits(i, side): la persona colpisce la palla i (da 0) dal lato side? (true: con il gesto di quel
// lato; 'forehand' | 'backhand': con quel gesto, da qualunque lato arrivi la palla). Restituisce il telefono e l'esito
export function trialPhone({ seed, hand, person, ios = false, hits = () => true }){
  const p = base({ seed, hand, ios }); p.skip();
  const out = runTrial(p, { seed, person, hits });
  return Object.assign(p, { trialResult: out });
}
export function runTrial(p, { seed = 1, person, hits = () => true } = {}){
  const R = rng(seed*13 + 7), hand = p.hand || 'right';
  p.beginTrial();
  let balls = 0;
  while (!trialDone({ balls, counts: p.learner.counts(hand), t: 0 })){
    const side = trialSide(balls, p.learner.counts(hand));
    p.trialBall(wantOfSide(side, hand));
    const h = hits(balls, side);
    if (h) play(p, { side: typeof h === 'string' ? h : side, ballSide: side, ...draw(person, R) }, R); else p.rest(900, 4);
    balls++;
  }
  return { ...p.endTrial(), balls };
}
// i colpi della partita di una persona (gli stessi per tutti i percorsi)
function shots(seed, person, n){
  const R = rng(seed*7 + 1), out = [];
  for (let i = 0; i < n; i++) out.push({ side: R() < .6 ? 'forehand' : 'backhand', ...draw(person, R), seed: seed*100 + i });
  return out;
}
// telefono assestato della persona: gesti della calibrazione uguali al suo colpo e 24 colpi giocati (B36.0: anche per
// direzione-telefono.mjs --b36, errore del seme degli scambi di prova)
export function settled({ seed, hand, person }){
  const C = gesturePhone({ seed, hand, kc: person.k }), R = rng(900 + seed);
  for (let i = 0; i < 24; i++) play(C, { side: i % 2 ? 'backhand' : 'forehand', ...draw(person, R) }, R);
  return C;
}
const read = r => (r ? { shot: r.ev.natpf.shot, side: r.ev.side, power: r.ev.natpf.intent?.power ?? r.ev.natpf.power, aim: r.ev.natpf.aimDev } : null);
const wrap = a => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };

export const PATHS = Object.freeze({
  G: { label: '2 gesti (colpetto)', make: (o, person) => gesturePhone({ ...o, kc: person.k*person.calK, yawSd: person.yawSd }) },
  G0: { label: '2 gesti (colpetto, piatto dritto)', make: (o, person) => gesturePhone({ ...o, kc: person.k*person.calK }) },
  G1: { label: '2 gesti (da manuale)', make: (o, person) => gesturePhone({ ...o, kc: person.k }) },
  S: { label: '«Salta» / Nessuna', make: o => simplePhone(o) },
  P: { label: 'scambi di prova 2+2', make: (o, person) => trialPhone({ ...o, person }) },
  P1: { label: 'scambi di prova 1+1', make: (o, person) => trialPhone({ ...o, person, hits: i => i < 2 }) },
  PD: { label: 'scambi, solo dal dritto', make: (o, person) => trialPhone({ ...o, person, hits: (i, side) => side === 'forehand' }) },
  P0: { label: 'scambi, mai un colpo', make: (o, person) => trialPhone({ ...o, person, hits: () => false }) },
  Si: { label: '«Salta», verso invertito', make: o => simplePhone({ ...o, ios: true }), ios: true },
  Pi: { label: 'scambi 2+2, verso invertito', make: (o, person) => trialPhone({ ...o, person, ios: true }), ios: true },
});
// Un percorso per una persona: i primi n colpi della partita su `seeds` telefoni
export function runPath(key, { person, hand = 'right', seeds = 12, n = 10 } = {}){
  const P = PATHS[key], acc = { n: 0, side: 0, type: 0, lost: 0, noAim: 0, dp: [], dp3: [], da: [], seed: [], level: {}, flips: 0 };
  for (let s = 1; s <= seeds; s++){
    const list = shots(s, person, n), C = settled({ seed: s, hand, person });
    const ref = list.map(g => read(play(C, g, rng(g.seed), { learn: false })));
    const p = P.make({ seed: s, hand }, person);
    if (p.trialResult){ acc.level[p.trialResult.level] = (acc.level[p.trialResult.level] || 0) + 1; if (p.trialResult.sign === -1) acc.flips++; }
    // errore del seme del centro della mira per verso, rispetto al centro del telefono assestato (dove c'è)
    for (const d of [1, -1]){ const c = p.models.aims.center(d), c0 = C.models.aims.center(d); if (c != null && c0 != null && !P.ios) acc.seed.push(Math.abs(wrap(c - c0))); }
    list.forEach((g, i) => {
      const r = read(play(p, g, rng(g.seed))), x = ref[i];
      acc.n++;
      if (!r){ acc.lost++; return; }
      if (r.side !== g.side) acc.side++;
      if (!x) return;
      if (r.shot !== x.shot) acc.type++;
      if (Number.isFinite(r.power) && Number.isFinite(x.power)){ const d = Math.abs(r.power - x.power); acc.dp.push(d); if (i < 3) acc.dp3.push(d); }
      if (Number.isFinite(r.aim) && Number.isFinite(x.aim)) acc.da.push(Math.abs(r.aim - x.aim)); else if (Number.isFinite(x.aim)) acc.noAim++;
    });
  }
  return { key, label: P.label, n: acc.n, side: acc.side, type: acc.type, lost: acc.lost, noAim: acc.noAim, dp: mean(acc.dp), dp3: mean(acc.dp3), da: mean(acc.da), seed: mean(acc.seed), level: acc.level, flips: acc.flips };
}
// Telefono che passa di mano: first gioca (calibrazione o scambi di prova, poi 12 colpi), poi second sullo stesso telefono
// senza «Nuovo giocatore». how: 'G' gesti del primo e basta (prima del B28) · 'S' «Salta» · 'P' scambi di prova a ogni
// partita (B28). Forza letta nei primi 3 colpi del secondo e la sua forza assestata (stessi gesti)
export function passHand(how, { first, second, hand = 'right', seeds = 12 } = {}){
  const got = [], want = [], lost = [];
  for (let s = 1; s <= seeds; s++){
    const o = { seed: s, hand };
    const p = how === 'G' ? gesturePhone({ ...o, kc: first.k*first.calK }) : how === 'S' ? simplePhone(o) : trialPhone({ ...o, person: first });
    const R = rng(300 + s); for (let i = 0; i < 12; i++) play(p, { side: i % 2 ? 'backhand' : 'forehand', ...draw(first, R) }, R);
    if (how === 'P') runTrial(p, { seed: s + 50, person: second });
    const C = settled({ seed: s, hand, person: second }), list = shots(s + 200, second, 3);
    for (const g of list){
      const x = read(play(C, g, rng(g.seed), { learn: false })), r = read(play(p, g, rng(g.seed)));
      if (!r){ lost.push(1); continue; }
      lost.push(0);
      if (x && Number.isFinite(r.power) && Number.isFinite(x.power)){ got.push(r.power); want.push(x.power); }
    }
  }
  return { how, letta: mean(got), assestata: mean(want), errore: mean(got.map((v, i) => Math.abs(v - want[i]))), persi: lost.reduce((a, b) => a + b, 0), colpi: lost.length };
}

// Chi colpisce da un lato solo (revisione del B28, difetto 1): scambi di prova con lo stesso gesto su ogni palla (miss:
// palle non colpite), poi in partita n dritti e n rovesci fatti bene. Conta i segni girati (dal gioco o dal telefono) e i
// colpi della partita letti dal lato sbagliato. ios: verso della gravità invertito; only: 'forehand' | 'backhand' | null (i due gesti)
export function oneSided({ hand = 'right', seeds = 12, n = 4, person = PEOPLE.adulto, only = 'forehand', miss = [], ios = false } = {}){
  let girati = 0, sbagliati = 0, letti = 0;
  for (let seed = 1; seed <= seeds; seed++){
    const p = trialPhone({ seed, hand, person, ios, hits: i => (miss.includes(i) ? null : only || true) }), R = rng(seed*17 + 3);
    for (let i = 0; i < 2*n; i++){
      const side = i % 2 ? 'backhand' : 'forehand', r = play(p, { side, ...draw(person, R) }, R);
      if (r){ letti++; if (r.ev.side !== side) sbagliati++; }
    }
    if (p.trialResult.sign*p.det.absSign === -1) girati++;
  }
  return { telefoni: seeds, girati, sbagliati, letti };
}
function main(){
  const seeds = +(arg('seeds') || (QUICK ? 4 : 12)), n = +(arg('n') || 10), hands = arg('hand') === 'both' || !arg('hand') ? ['right', 'left'] : [arg('hand')];
  const out = { seeds, n, hands, persone: {}, mano: {}, lato: {} };
  for (const hand of hands){
    console.log(`\n######## mano ${hand === 'left' ? 'sinistra (mancino)' : 'destra'} · ${seeds} telefoni × ${n} colpi per percorso`);
    for (const [pk, person] of Object.entries(PEOPLE)){
      console.log(`\n== ${person.label} (forza ${person.k} ± ${Math.round(person.kSd*100)} %, piatto ± ${person.yawSd}°, gesto a vuoto ${person.calK}×)`);
      console.log('percorso                           lato≠  tipo≠  persi  |Δforza| (primi 3)  |Δmira|°  senza mira  seme°   livelli');
      for (const key of Object.keys(PATHS)){
        const r = runPath(key, { person, hand, seeds, n });
        (out.persone[`${hand}/${pk}`] ||= {})[key] = r;
        console.log(`${r.label.padEnd(33)} ${String(r.side).padStart(5)} ${String(r.type).padStart(6)} ${String(r.lost).padStart(6)}   ${f(r.dp)} (${f(r.dp3)})      ${f(r.da, 1).padStart(6)} ${String(r.noAim).padStart(9)}   ${f(r.seed, 1).padStart(5)}   ${Object.entries(r.level).map(([k, v]) => `${k} ${v}`).join(', ')}${r.flips ? ` · verso girato ${r.flips}` : ''}`);
      }
    }
    console.log('\n== telefono che passa di mano (forza letta nei primi 3 colpi del secondo · la sua forza assestata · errore medio · persi)');
    for (const [a, b] of [['forte', 'bambino'], ['bambino', 'forte']]) for (const how of ['G', 'S', 'P']){
      const r = passHand(how, { first: PEOPLE[a], second: PEOPLE[b], hand, seeds });
      (out.mano[`${hand}/${a}→${b}`] ||= {})[how] = r;
      console.log(`${PEOPLE[a].label} → ${PEOPLE[b].label} · ${{ G: 'gesti del primo (prima)', S: '«Salta» (prima)', P: 'scambi di prova a ogni partita' }[how].padEnd(32)} letta ${f(r.letta)} · assestata ${f(r.assestata)} · errore ${f(r.errore)} · persi ${r.persi}/${r.colpi}`);
    }
  }
  console.log('\n== chi colpisce da un lato solo negli scambi di prova (poi in partita 4 dritti e 4 rovesci fatti bene) · segni girati · colpi della partita letti dal lato sbagliato');
  out.unLato = {};
  for (const hand of hands) for (const [label, o] of [['solo dritti, nessuna persa', { only: 'forehand' }], ['solo dritti, la prima persa', { only: 'forehand', miss: [0] }], ['solo dritti, due perse', { only: 'forehand', miss: [0, 2] }],
    ['solo rovesci', { only: 'backhand' }], ['verso invertito, i due gesti', { only: null, ios: true }], ['verso invertito, solo dritti (limite)', { only: 'forehand', ios: true }]]){
    const r = oneSided({ hand, seeds, ...o });
    out.unLato[`${hand}/${label}`] = r;
    console.log(`${(hand === 'left' ? 'mancino · ' : 'destro · ').padEnd(10)}${label.padEnd(40)} girati ${String(r.girati).padStart(2)}/${r.telefoni} · lato sbagliato ${String(r.sbagliati).padStart(3)}/${r.letti}`);
  }
  // lato delle palle (colpi.mjs --mode=lato, persona vera): partite sbilanciate con l'errore del seme misurato qui sopra
  const seedsOf = key => mean(Object.values(out.persone).map(v => v[key]?.seed).filter(Number.isFinite));
  console.log('\n== lato delle palle per partita con l’errore del seme di ogni percorso (mira alta 17°, 24 partite da 40 colpi per segno)');
  for (const key of ['G', 'G0', 'G1', 'P', 'P1']){
    const e = +seedsOf(key).toFixed(1), L = lato({ aimFull: 17, hand: 'right', cases: { c: [{ seedErr: e }, { seedErr: -e }] } }).c;
    out.lato[key] = { seme: e, ...L };
    console.log(`${PATHS[key].label.padEnd(33)} seme ±${f(e, 1)}° · sbilanciate ${L.sbilanciate}/${L.partite} (${L.percento} %) · |mediana x| ${L.mabs} m · riferimento storto ${L.storti} · palle angolate ${L.angolate} %`);
  }
  { const L = lato({ aimFull: 17, hand: 'right', cases: { c: LATO.cases['seme giusto'] } }).c; out.lato.giusto = L; console.log(`${'(seme giusto, riferimento)'.padEnd(33)} seme ±0° · sbilanciate ${L.sbilanciate}/${L.partite} (${L.percento} %) · |mediana x| ${L.mabs} m · riferimento storto ${L.storti} · palle angolate ${L.angolate} %`); }
  console.log(`\n(scambi di prova: ${TRIAL.perSide} colpi per lato, ${TRIAL.balls}–${TRIAL.maxBalls} palle, tetto ${TRIAL.maxS} s)`);
  if (arg('json')) writeFileSync(arg('json'), JSON.stringify(out, null, 1));
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
