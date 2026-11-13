// Banco del movimento (B32, tappa 3 punto 2 del rapporto docs/b16/rapporto-gameplay.md: miglioramento 7, M7, MOV-5 e
// MOV-9; misure e scelte in docs/b32/movimento.md). Motore vero senza disegno (headless-engine.mjs), stesso ciclo di
// rally-balance.mjs: è una misura del gioco simulato con i profili di giocatore simulati, non di persone vere.
//   npm run audit:movimento                  (= node --import ./test/register.mjs scripts/audit/movimento.mjs)
//   npm run audit:movimento -- --difficulty=casual,pro --profiles=tennista,amatore --points=300 --nsemi=3 [--serie=2]
//        [--json] [--cols=puntiG,gameG,…]   solo queste colonne
//        [--prova='{"pro":{"accel":16}}']   valori di prova di playerRun (natpf_skill.js), solo in memoria
//        [--senza-b32]    regole del movimento spente (natpf_movement.movementRules.off): stessi numeri della base
// Profili in più rispetto a rally-balance: «piazza» (amatore che cerca sempre il lato libero) e «centro» (amatore che
// non mira mai: la palla va dove la manda il gesto naturale, verso il centro). Servono a «piazzare conviene?».
// Il banco non cambia nessuna regola: guarda i colpi (_natpfRacketShot), il piano d'intercetto (natpfPlan), la posizione
// di chi gioca a ogni passo e i punti (_awardPoint).
// Cosa misura, per livello × profilo:
//   • punti e game vinti da chi gioca (game: primo a 4 con 2 di scarto sulla sequenza dei punti), colpi e secondi per punto;
//   • metri corsi da chi gioca per punto (con la palla in gioco);
//   • palle non raggiunte: punti persi con l'ultima palla della CPU che passa (doppio rimbalzo o oltre chi gioca) senza
//     che chi gioca la tocchi e senza un colpo a vuoto fuori tempo (non c'è stato gesto a vuoto, o c'è stato per la
//     palla troppo lontana), su 100 palle della CPU e su 100 punti; «passate»: tutte le palle passate (anche con il
//     gesto fuori tempo) su 100 punti;
//   • piani «stretch» (palla che il piano non raggiunge) su 100 palle della CPU;
//   • colpi in allungo (piano con stretch ≥ 0,5) e in corsa (velocità ≥ metà della massima al contatto): quota sui colpi,
//     falliti, e punti vinti nel seguito;
//   • stanchezza: quota del tempo con la palla in gioco su «Affaticato» (≥ 0,5) e su «Stanco!» (≥ 0,75).
import { pathToFileURL } from 'node:url';
import { simulate, PROFILES } from './rally-balance.mjs';
import * as NS from '../../src/natpf/natpf_skill.js';
const NM = await import('../../src/natpf/natpf_movement.js').catch(() => null);   // assente sulla base (fa2482c)
const { NatpfTennisEngine: E } = await import('../../src/game_engine.js');

// stesse serie di semi e stesso conto dei game del banco della rete (scripts/audit/rete.mjs), copiati: importarlo
// aggiungerebbe i suoi strumenti al motore
export const SERIE = { 1: n => Array.from({ length: n }, (_, i) => 2001 + i*37), 2: n => Array.from({ length: n }, (_, i) => 5003 + i*41) };
export function gamesOf(points){
  let a = 0, b = 0, gw = 0, gl = 0;
  for (const p of points){ if (p.who === 'player') a++; else b++; if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2){ a > b ? gw++ : gl++; a = b = 0; } }
  return { gw, gl };
}
const pct = (a, n, d = 1) => +(100*a/Math.max(1, n)).toFixed(d);
const per = (a, n, d = 2) => +(a/Math.max(1, n)).toFixed(d);
export const PROFILI = {
  ...PROFILES,
  piazza: { ...PROFILES.amatore, intent: 1 },
  centro: { ...PROFILES.amatore, intent: 0 },
};

/* ---------- strumenti sul motore (solo misura) ---------- */
const P = E.prototype, LOG = { shots: [], points: [] };
let cur = null, lastP = null;
const newPoint = () => ({ cpuBalls: 0, meters: 0, sec: 0, stretchPlans: 0, whiff: null });
// colpo a vuoto di chi gioca su questa palla, con il motivo (natpf_impact: «presto», «tardi», «portata» = palla troppo lontana)
const whiff = P._natpfEarlyWhiff;
P._natpfEarlyWhiff = function(ps){
  if ((ps?.actor || this.player) === this.player){ if (!cur) cur = newPoint(); cur.whiff = ps?.natpfWhy || 'presto'; }
  return whiff.call(this, ps);
};
const racket = P._natpfRacketShot;
P._natpfRacketShot = function(e, p, opts = {}){
  const plan = this.natpfPlan, r = racket.call(this, e, p, opts);
  if (p === this.player && r?.out){
    const o = r.out;
    lastP = { running: +(opts.running || 0), stretch: +(plan?.stretch || 0), plan: plan?.kind || null, failed: !!o.failed, weak: !!o.weak, res: null };
    LOG.shots.push(lastP);
  }
  return r;
};
const award = P._awardPoint;
P._awardPoint = function(who, why = ''){
  if (this.phase !== 'POINT_OVER'){
    if (lastP && !lastP.res) lastP.res = who;
    const c = cur || newPoint();
    // palla della CPU che passa senza che chi gioca la tocchi: doppio rimbalzo («Nice Shot!») o oltre chi gioca («Point»)
    // (non raggiunta: senza colpo a vuoto o con il colpo a vuoto per la palla troppo lontana; mancata: gesto fuori tempo)
    const passed = who === 'opponent' && this.ball.lastHitter === 'opponent' && /Nice Shot|Point/.test(why) && finite(this.ball.rallyStrokeCount) >= 1;
    LOG.points.push({ who, why, rally: this.ball.rallyStrokeCount, passed, far: passed && (!c.whiff || c.whiff === 'portata'), ...c });
  }
  lastP = null; cur = null;
  return award.call(this, who, why);
};
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/* ---------- una casella: livello × profilo ---------- */
export function cell({ difficulty, profile, points = 300, seeds = SERIE[1](3) }){
  const sims = []; LOG.shots.length = LOG.points.length = 0;
  const T = { tired: 0, stanco: 0, inPlay: 0 };
  for (const seed of seeds){
    lastP = cur = null;
    let px = null, pz = null, lastPlan = null, lastCpuHit = null;
    const onStep = e => {
      const live = e.phase === 'RALLY' && e.ball.inPlay;
      if (live){
        if (!cur) cur = newPoint();
        if (px != null) cur.meters += Math.hypot(e.player.pos.x - px, e.player.pos.z - pz);
        cur.sec += 1/120;
        const f = NS.fatigueLevel(e, e.player); T.inPlay++; if (f >= .5) T.tired++; if (f >= .75) T.stanco++;
        // una palla della CPU nuova (colpo della CPU nello scambio)
        if (e.ball.lastHitter === 'opponent' && lastCpuHit !== e.ball.rallyStrokeCount){ lastCpuHit = e.ball.rallyStrokeCount; cur.cpuBalls++; cur.whiff = null; }
        const pl = e.natpfPlan; if (pl && pl !== lastPlan){ lastPlan = pl; if (pl.kind === 'stretch') cur.stretchPlans++; }
      } else lastCpuHit = null;
      px = e.player.pos.x; pz = e.player.pos.z;
    };
    const sim = simulate({ profile: PROFILI[profile] || profile, difficulty, points, seed, onStep, setup: e => { if (difficulty === 'evento') NS.eventoRestart(e); } });
    sims.push(sim);
  }
  const pts = LOG.points.slice(), S = LOG.shots.slice(), n = sims.reduce((s, x) => s + x.points, 0), won = sims.reduce((s, x) => s + x.won, 0);
  const g = gamesOf(pts), games = Math.max(1, g.gw + g.gl), rallies = sims.flatMap(s => s.rallies);
  const cpuBalls = pts.reduce((s, p) => s + p.cpuBalls, 0), passed = pts.filter(p => p.passed).length, far = pts.filter(p => p.far).length;
  const st = S.filter(s => s.stretch >= .5), run = S.filter(s => s.running >= .5), calm = S.filter(s => s.stretch < .5 && s.running < .5);
  const fail = a => pct(a.filter(s => s.failed).length, a.length), win = a => pct(a.filter(s => s.res === 'player').length, a.length);
  const secs = pts.map(p => p.sec).sort((a, b) => a - b);
  return { difficulty, profile, punti: n, puntiG: pct(won, n), gameG: pct(g.gw, games), game: games,
    colpiPerPunto: +(rallies.reduce((s, v) => s + v, 0)/Math.max(1, rallies.length)).toFixed(2),
    secPerPunto: per(secs.reduce((s, v) => s + v, 0), secs.length), sec90: +(secs[Math.floor(.9*secs.length)] || 0).toFixed(1),
    metriPerPunto: per(pts.reduce((s, p) => s + p.meters, 0), pts.length, 1),
    nonPrese: pct(far, cpuBalls), nonPresePunti: pct(far, n), passate: pct(passed, n), stretchPiani: pct(pts.reduce((s, p) => s + p.stretchPlans, 0), cpuBalls),
    allungo: pct(st.length, S.length), allungoFalliti: fail(st), allungoVinti: win(st),
    corsa: pct(run.length, S.length), corsaFalliti: fail(run), corsaVinti: win(run),
    fermiFalliti: fail(calm), fermiVinti: win(calm),
    affaticato: pct(T.tired, T.inPlay), stanco: pct(T.stanco, T.inPlay) };
}

export const COLS = [
  ['puntiG', 'punti G%'], ['gameG', 'game G%'], ['colpiPerPunto', 'colpi/p'], ['secPerPunto', 's/p'], ['sec90', 's90'], ['metriPerPunto', 'm/p'],
  ['nonPrese', 'non prese%'], ['nonPresePunti', 'n.p./punti%'], ['passate', 'passate/punti%'], ['stretchPiani', 'stretch%'],
  ['allungo', 'allungo%'], ['allungoFalliti', 'fall.%'], ['allungoVinti', 'vinti%'], ['corsa', 'corsa%'], ['corsaFalliti', 'fall.%'], ['corsaVinti', 'vinti%'],
  ['fermiFalliti', 'fermi fall.%'], ['fermiVinti', 'vinti%'], ['affaticato', 'affat.%'], ['stanco', 'stanco%'],
];

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1], has = k => process.argv.includes(`--${k}`);
  const difficulties = (arg('difficulty') || 'bambini,casual,evento,pro,leggenda').split(','), profiles = (arg('profiles') || 'tennista,amatore,umano,bambino,piazza,centro').split(',');
  const points = +(arg('points') || 300), seeds = (SERIE[arg('serie') || 1] || SERIE[1])(+(arg('nsemi') || 3));
  // --prova='{"pro":{"accel":16},"casual":{…}}': valori di playerRun provati solo in memoria (natpf_skill.cpuTuning)
  if (arg('prova')) for (const [lv, v] of Object.entries(JSON.parse(arg('prova')))){ NS.cpuTuning[lv] = { playerRun: Object.freeze({ ...NS.skillLevel(lv).playerRun, ...v }) }; }
  if (has('senza-b32')){ if (!NM) throw new Error('natpf_movement.js assente: --senza-b32 non serve sulla base'); NM.movementRules.off = true; }
  const rows = [], json = has('json'), only = arg('cols')?.split(','), COLS2 = only ? COLS.filter(c => only.includes(c[0])) : COLS;
  if (!json) console.log(`semi ${seeds.join(', ')} · ${points} punti per seme${has('senza-b32') ? ' · regole B32 spente' : ''}\n${'livello/profilo'.padEnd(20)} ` + COLS2.map(c => c[1].padStart(Math.max(6, c[1].length))).join(' '));
  for (const difficulty of difficulties) for (const profile of profiles){
    const r = cell({ difficulty, profile, points, seeds }); rows.push(r);
    if (!json) console.log(`${`${difficulty}/${profile}`.padEnd(20)} ` + COLS2.map(c => String(r[c[0]]).padStart(Math.max(6, c[1].length))).join(' '));
  }
  if (json) console.log(JSON.stringify(rows, null, 1));
}
