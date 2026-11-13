// Banco della palla corta e dei colpi falliti di chi gioca (B18.2, tappa 2 passo 3; difetti 2 e 8 / D2 e D8 di
// docs/b16/rapporto-gameplay.md; misure e scelte in docs/b18/t2-3-leggenda-e-palla-corta.md).
// Motore vero senza disegno (headless-engine.mjs), stesso ciclo di rally-balance.mjs: è una misura del gioco simulato
// con i profili di giocatore simulati, non di persone vere.
//   npm run audit:drop                      (= node --import ./test/register.mjs scripts/audit/palla-corta.mjs)
//   npm run audit:drop -- --difficulty=casual,pro,leggenda --profiles=tennista,amatore,bambino --points=300 --nsemi=3
//        [--serie=2]        seconda serie di semi (1: 2001, 2038, …; 2: 5003, 5044, …; 3: 31, 37, 41 come il rapporto B16)
//        [--tattiche=normale,ogni,sole]   quali tattiche (vedi sotto)
//        [--obiettivi]      alla fine la tabella degli obiettivi del passo; esce con 1 se uno manca
//        [--json]
// TATTICHE (il gesto del profilo resta lo stesso: stesso errore di tempo, stessa mira; cambia solo il tipo di colpo):
//   • normale: il profilo com'è (non gioca palle corte);
//   • ogni:    palla corta «al momento giusto»: una volta su tre quando la CPU è in fondo (oltre 10 m dalla rete) e chi
//              gioca non è in corsa e colpisce entro 12,5 m dalla rete;
//   • sole:    ogni colpo dello scambio è una palla corta (la tattica del rapporto B16: «giocare solo palle corte»).
// Il gesto della palla corta simulata: morbido (forza 0,2 ± 0,05, tra 0,08 e 0,34), taglio che scende (salita −0,25),
// forma chiara (confidenza 0,7).
// Cosa misura, per livello × profilo × tattica:
//   • punti e game vinti da chi gioca (game: primo a 4 con 2 di scarto sulla sequenza dei punti), colpi per punto;
//   • palle corte: quante; RIUSCITA (passa la rete e cade in campo: non in rete, non fuori); RAGGIUNTA (la CPU la
//     colpisce); FA PUNTO (il punto finisce per chi gioca prima che tocchi di nuovo la palla: la CPU non ci arriva o
//     sbaglia); PERSA SUBITO (in rete o fuori, o la CPU risponde con un vincente); dove cade (m dalla rete, mediana);
//   • colpi falliti di chi gioca (tutti i tipi): punti chiusi da un colpo fallito, per causa mostrata.
import { pathToFileURL } from 'node:url';
import { simulate } from './rally-balance.mjs';
import { mulberry32, gauss } from './headless-engine.mjs';
const { NatpfTennisEngine: E } = await import('../../src/game_engine.js');

const pct = (a, n, d = 1) => +(100*a/Math.max(1, n)).toFixed(d);
const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? +s[s.length >> 1].toFixed(2) : null; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const SERIE = { 1: n => Array.from({ length: n }, (_, i) => 2001 + i*37), 2: n => Array.from({ length: n }, (_, i) => 5003 + i*41), 3: n => [31, 37, 41, 43, 53, 61, 67, 73].slice(0, n) };
export function gamesOf(points){
  let a = 0, b = 0, gw = 0, gl = 0;
  for (const p of points){ if (p.who === 'player') a++; else b++; if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2){ a > b ? gw++ : gl++; a = b = 0; } }
  return { gw, gl };
}

/* ---------- strumenti sul motore (solo misura e scelta del tipo di colpo: nessuna regola cambia) ---------- */
const P = E.prototype, LOG = { shots: [], points: [] };
let tactic = 'normale', trng = Math.random, last = null;
// gesto della palla corta al posto di quello del profilo (stesso tempo, stessa mira)
export function dropSwing(swing, rng){
  const power = +clamp(.2 + gauss(rng)*.05, .08, .34).toFixed(3), it = swing.natpf.intent;
  return { ...swing, shotType: 'drop', speed: .8 + power*.85,
    natpf: { ...swing.natpf, shot: 'drop', power, peak: 300, angle: 30, prep: null, intent: { ...it, shot: 'drop', power, depth: +(power*.91).toFixed(3), rise: -.25, conf: .7 } } };
}
const input = P._handleUserSwingInput;
P._handleUserSwingInput = function(evt){
  if (tactic !== 'normale' && this.phase === 'RALLY' && evt?.natpf?.intent && this.ball.lastHitter !== 'player'){
    const pl = this.player, running = pl.vel.length()/Math.max(1, pl.maxSpeed);
    const right = tactic === 'sole' || (this.opponent.pos.z < -10 && running < .5 && Math.abs(pl.pos.z) < 12.5 && trng() < 1/3);
    if (right) evt = dropSwing(evt, trng);
  }
  return input.call(this, evt);
};
const racket = P._natpfRacketShot;
P._natpfRacketShot = function(e, p, opts = {}){
  const r = racket.call(this, e, p, opts);
  if (p === this.player && r?.out){
    const o = r.out, L = this.natpfLastRacket || {};
    last = { shot: o.shot, failed: !!o.failed, weak: !!o.weak, net: !!o.netFault, pressured: !!o.pressured, cause: L.cause || null, why: o.why || o.dropWhy || null, grade: o.grade, q: o.q, t: o.t,
      depth: o.depth, clear: o.clear, rally: this.ball.rallyStrokeCount, z: Math.abs(p.pos.z), running: opts.running || 0, plan: this.natpfPlan?.kind || null,
      cpuZ: this.opponent.pos.z, reached: false, res: null };
    LOG.shots.push(last);
  }
  return r;
};
const exec = P._executeOpponentReturn;
P._executeOpponentReturn = function(actor = this.opponent){ if (last && !last.res) last.reached = true; return exec.call(this, actor); };
const award = P._awardPoint;
P._awardPoint = function(who, why = ''){
  if (this.phase !== 'POINT_OVER'){
    if (last && !last.res) last.res = `${who}:${why}`;
    LOG.points.push({ who, why, last: this.ball.lastHitter === 'player' ? last : null });
  }
  last = null;
  return award.call(this, who, why);
};

/* ---------- una casella: livello × profilo × tattica ---------- */
export function cell({ difficulty, profile, tattica = 'normale', points = 300, seeds = SERIE[1](3) }){
  const sims = []; LOG.shots.length = LOG.points.length = 0;
  for (const seed of seeds){ tactic = tattica; trng = mulberry32(seed*31 + 5); last = null; try { sims.push(simulate({ profile, difficulty, points, seed })); } finally { tactic = 'normale'; } }
  const pts = LOG.points.slice(), shots = LOG.shots.slice(), n = sims.reduce((s, x) => s + x.points, 0), won = sims.reduce((s, x) => s + x.won, 0);
  const g = gamesOf(pts), rallies = sims.flatMap(s => s.rallies), drops = shots.filter(s => s.shot === 'DROP');
  // esito della palla corta: res è «chi:perché» del punto se è finito prima del colpo dopo di chi gioca
  const own = d => d.res && d.res.startsWith('opponent:') && !d.reached;         // in rete o fuori
  const good = drops.filter(d => !own(d)), reached = good.filter(d => d.reached);
  const point = drops.filter(d => d.res && d.res.startsWith('player:')), lost = drops.filter(d => d.res && d.res.startsWith('opponent:'));
  // colpi falliti: punti chiusi da un colpo di chi gioca segnato «fallito» (o in rete per il tempo), per causa
  const failEnd = pts.filter(p => p.who !== 'player' && p.last && (p.last.failed || p.last.net) && !p.last.reached), causes = {};
  for (const p of failEnd){ const k = p.last.shot === 'DROP' ? `palla corta: ${p.last.why || p.last.cause || 'tempo'}` : p.last.cause || 'tempo'; causes[k] = (causes[k] || 0) + 1; }
  const overhead = shots.filter(s => s.plan === 'smash' && ['PERFECT', 'GOOD'].includes(s.grade));
  return { difficulty, profile, tattica, punti: n, puntiG: pct(won, n), gameG: pct(g.gw, g.gw + g.gl), game: g.gw + g.gl,
    colpiPerPunto: +(rallies.reduce((s, v) => s + v, 0)/Math.max(1, rallies.length)).toFixed(2), rallyP90: [...rallies].sort((a, b) => a - b)[Math.floor(.9*(rallies.length - 1))] ?? 0,
    infiniti: pct(sims.reduce((s, x) => s + x.capped, 0), n, 2),
    corte: drops.length, cortePerPunto: +(drops.length/Math.max(1, n)).toFixed(2),
    riuscite: pct(good.length, drops.length), inRete: pct(drops.filter(d => own(d) && /Net/.test(d.res)).length, drops.length), fuori: pct(drops.filter(d => own(d) && !/Net/.test(d.res)).length, drops.length),
    raggiunte: pct(reached.length, good.length), punto: pct(point.length, drops.length), puntoDiretto: pct(point.filter(d => !d.reached).length, drops.length), erroreCPU: pct(point.filter(d => d.reached).length, drops.length),
    perseSubito: pct(lost.length, drops.length), cadeA: med(drops.map(d => d.depth)),
    falliti: pct(failEnd.length, pts.length), scambioLungo: pct(failEnd.filter(p => p.last.pressured).length, pts.length),
    cause: Object.fromEntries(Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, pct(v, pts.length)])),
    sopraLaTesta: overhead.length, sopraLaTestaFalliti: pct(overhead.filter(s => s.failed || s.net).length, overhead.length) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1], has = k => process.argv.includes(`--${k}`);
  const difficulties = (arg('difficulty') || 'casual,pro,leggenda').split(','), profiles = (arg('profiles') || 'tennista,amatore,bambino').split(',');
  const tattiche = (arg('tattiche') || 'normale,ogni,sole').split(','), points = +(arg('points') || 300), seeds = (SERIE[arg('serie') || 1] || SERIE[1])(+(arg('nsemi') || 3));
  const rows = [], json = has('json');
  if (!json) console.log(`semi ${seeds.join(', ')} · ${points} punti per seme\nlivello   profilo   tattica  punti G  game G  colpi/punto | corte  per punto  riuscite  in rete  fuori  raggiunte  fa punto (diretto + errore CPU)  perse subito  cade a | falliti  scambio lungo  sopra la testa falliti`);
  for (const difficulty of difficulties) for (const profile of profiles) for (const tattica of tattiche){
    const r = cell({ difficulty, profile, tattica, points, seeds }); rows.push(r);
    if (!json) console.log(`${difficulty.padEnd(9)} ${profile.padEnd(9)} ${tattica.padEnd(8)} ${String(r.puntiG).padStart(6)}% ${String(r.gameG).padStart(6)}% ${String(r.colpiPerPunto).padStart(8)}     | ${String(r.corte).padStart(5)} ${String(r.cortePerPunto).padStart(9)} ${String(r.riuscite).padStart(8)}% ${String(r.inRete).padStart(7)}% ${String(r.fuori).padStart(5)}% ${String(r.raggiunte).padStart(9)}% ${String(r.punto).padStart(8)}% (${r.puntoDiretto} + ${r.erroreCPU})`.padEnd(150) + ` ${String(r.perseSubito).padStart(8)}% ${String(r.cadeA ?? '–').padStart(6)} | ${String(r.falliti).padStart(6)}% ${String(r.scambioLungo).padStart(8)}%  ${r.sopraLaTestaFalliti}% di ${r.sopraLaTesta}  ${JSON.stringify(r.cause)}`);
  }
  if (json) console.log(JSON.stringify(rows, null, 1));
  if (has('obiettivi')){
    // obiettivi del rapporto (§4, tappa 2): sole palle corte al massimo +3 punti su 100 rispetto al colpo normale;
    // a Leggenda «in rete per scambio lungo» al massimo in 1 punto su 10
    let ko = 0; const get = (d, p, t) => rows.find(r => r.difficulty === d && r.profile === p && r.tattica === t);
    console.log('\nObiettivi');
    for (const d of difficulties) for (const p of profiles){
      const a = get(d, p, 'normale'), b = get(d, p, 'sole');
      if (a && b){ const ok = b.puntiG - a.puntiG <= 3; if (!ok) ko++; console.log(`  ${ok ? 'OK' : 'KO'}  ${d}/${p}: sole palle corte ${b.puntiG}% contro ${a.puntiG}% normale (${(b.puntiG - a.puntiG).toFixed(1)} punti, al massimo +3)`); }
      if (a && d === 'leggenda'){ const ok = a.scambioLungo <= 10; if (!ok) ko++; console.log(`  ${ok ? 'OK' : 'KO'}  ${d}/${p}: punti chiusi da un colpo fallito «scambio lungo» ${a.scambioLungo}% (al massimo 10)`); }
    }
    if (ko) process.exitCode = 1;
  }
}
