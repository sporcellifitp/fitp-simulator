// Audit del livello «Leggenda» (src/natpf/natpf_legend.js) e non regressione di casual e pro: torneo senza grafica
// sulle regole vere del motore (simulate di rally-balance.mjs) con i profili di giocatore simulati, poi verifica dei
// criteri del livello. Esce con codice 1 se un criterio non è rispettato. È un banco di prova deterministico (semi
// fissi), non una misura di persone reali: i profili non puniscono la prevedibilità della CPU.
// Uso (comando «audit:legend» del progetto, dalla cartella natpf-tennis):
//   audit:legend                                       criteri: Leggenda contro 6 profili, casual e pro contro «medio»
//   audit:legend -- --points=150 --profiles=medio,tennista --seeds=3   (default: 300 punti, 8 semi)
//   audit:legend -- --table                            tabella casual / pro / leggenda per tutti i profili (senza criteri)
//   audit:legend -- --ablation                         da dove viene la forza (senza «lascia passare», scelta a caso, …)
//   audit:legend -- --json
import { pathToFileURL } from 'node:url';
import { simulate } from './rally-balance.mjs';
import { legendTuning } from '../../src/natpf/natpf_legend.js';
import { skillLevel } from '../../src/natpf/natpf_skill.js';
const { NatpfTennisEngine: E } = await import('../../src/game_engine.js');

/* ---------- misura: ogni colpo della CPU e del giocatore, come finisce il punto ---------- */
const P = E.prototype, LOG = { cpu: [], player: [], points: [] };
let cur = null, curPlayer = null, lastShot = null, lastEngine = null;
const exec = P._executeOpponentReturn;
P._executeOpponentReturn = function(actor = this.opponent){
  const b = this.ball, o = actor, pl = this.player;
  const rec = { t: this.elapsedTime, rally: b.rallyStrokeCount, bx: b.pos.x, bz: b.pos.z, gap: Math.abs(b.pos.x - o.pos.x), px: pl.pos.x,
    kind: null, err: null, shot: null, kmh: 0, landX: null, landZ: null, net: null, outcome: null, returned: false };
  exec.call(this, actor);
  const lp = this.natpfLegend?.lastPick;
  Object.assign(rec, { kind: lp ? lp.kind : null, err: lp ? lp.err : null, shot: b.shotType, kmh: b.vel.length()*3.6 });
  if (this.natpfLegend) this.natpfLegend.lastPick = null;
  LOG.cpu.push(rec); cur = rec; lastShot = rec; curPlayer = null;
};
const strike = P._attemptPlayerRallyStrike;
P._attemptPlayerRallyStrike = function(evt, auto){
  const before = this.ball.lastHitter, ok = strike.call(this, evt, auto);
  if (ok && before !== 'player' && this.ball.lastHitter === 'player'){
    if (cur) cur.returned = true;
    // reazione: da quando la CPU accelera davvero verso il punto d'incontro (la velocità in quella direzione cresce di
    // 0,3 m/s rispetto all'istante del colpo). Se stava ancora correndo dal recupero conta il cambio, non il movimento
    const o = this.opponent, tr = this.natpfSkill?.cpuPlan?.truth || o.targetPos, dx = tr.x - o.pos.x, dz = tr.z - o.pos.z, n = Math.hypot(dx, dz) || 1;
    curPlayer = { t: this.elapsedTime, ox: o.pos.x, oz: o.pos.z, ux: dx/n, uz: dz/n, v0: null, vmax: 0, react: null, outcome: null };
    LOG.player.push(curPlayer); lastShot = curPlayer; cur = null;
  }
  return ok;
};
const serve = P._executeServeHit;
P._executeServeHit = function(actor, evt){ serve.call(this, actor, evt); cur = null; curPlayer = null; lastShot = null; };
const step = P._stepPhysics;
P._stepPhysics = function(dt){
  lastEngine = this;
  const b = this.ball, z0 = b.pos.z, vy0 = b.vel.y, live = b.inPlay && this.phase === 'RALLY';
  const o = this.opponent, ox = o.pos.x, oz = o.pos.z;
  step.call(this, dt);
  if (!live) return;
  if (cur && b.lastHitter === 'opponent'){
    if (cur.net == null && z0 < 0 && b.pos.z >= 0) cur.net = b.pos.y;
    if (cur.landX == null && vy0 < 0 && b.vel.y > 0 && b.pos.y < .2){ cur.landX = b.pos.x; cur.landZ = b.pos.z; }
  }
  if (curPlayer && b.lastHitter === 'player'){
    const vx = (o.pos.x - ox)/dt, vz = (o.pos.z - oz)/dt, along = vx*curPlayer.ux + vz*curPlayer.uz;
    curPlayer.vmax = Math.max(curPlayer.vmax, Math.hypot(vx, vz));
    if (curPlayer.v0 == null) curPlayer.v0 = along;
    if (curPlayer.react == null && along - curPlayer.v0 > .3) curPlayer.react = this.elapsedTime - curPlayer.t;
  }
};
const award = P._awardPoint;
P._awardPoint = function(who, why = ''){
  if (this.phase !== 'POINT_OVER' && lastShot && !lastShot.outcome) lastShot.outcome = `${who}:${why}`;
  LOG.points.push({ who, why });
  cur = null; curPlayer = null; lastShot = null;
  return award.call(this, who, why);
};

/* ---------- statistiche ---------- */
const q = (a, p) => { a = a.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p*(a.length - 1)))] : NaN; };
const f = (v, d = 1) => (Number.isFinite(v) ? +v.toFixed(d) : null);
const zoneX = x => (Math.abs(x) < 1.37 ? 'C' : x > 0 ? 'R' : 'L'), zoneZ = z => { z = Math.abs(z); return z < 6.4 ? 'S' : z < 9.4 ? 'M' : 'D'; };
export function entropy(keys){ const c = {}; for (const k of keys) c[k] = (c[k] || 0) + 1; let h = 0; for (const v of Object.values(c)){ const p = v/keys.length; h -= p*Math.log2(p); } return h; }
// game dalla sequenza dei punti (primo a 4 con 2 di scarto), dal punto di vista del giocatore
export function games(points){
  let a = 0, b = 0, gw = 0, gl = 0;
  for (const p of points){ if (p.who === 'player') a++; else b++; if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2){ a > b ? gw++ : gl++; a = b = 0; } }
  return { gw, gl };
}
export const SEEDS = [7, 11, 23, 31, 47, 59, 71, 83];
export function run({ profile = 'medio', difficulty = 'leggenda', points = 300, seeds = SEEDS } = {}){
  const sims = [], cpu = [], player = [], pts = [];
  let g = { gw: 0, gl: 0 }, letGo = 0, lunges = 0; const learned = [];
  for (const seed of seeds){
    const s = { cpu: LOG.cpu.length, player: LOG.player.length, points: LOG.points.length };
    lastEngine = null;
    sims.push(simulate({ profile, difficulty, points, seed }));
    const p = LOG.points.slice(s.points), gg = games(p);
    g = { gw: g.gw + gg.gw, gl: g.gl + gg.gl };
    cpu.push(...LOG.cpu.slice(s.cpu)); player.push(...LOG.player.slice(s.player)); pts.push(...p);
    const lm = lastEngine?.natpfLegend; if (lm){ letGo += lm.stats.letGo; lunges += lm.stats.lunges; learned.push((lm.err + 2)/(lm.exp + 2)); }
  }
  LOG.cpu.length = LOG.player.length = LOG.points.length = 0;
  return { profile, difficulty, sims, cpu, player, points: pts, games: g, letGo, lunges, learned };
}
export function metrics(r){
  const { sims, cpu, player } = r, nPts = sims.reduce((s, x) => s + x.points, 0), won = sims.reduce((s, x) => s + x.won, 0);
  const capped = sims.reduce((s, x) => s + x.capped, 0), rallies = sims.flatMap(s => s.rallies);
  const cpuErr = cpu.filter(c => c.outcome === 'player:Net' || c.outcome === 'player:Out').length;
  const cpuWin = cpu.filter(c => c.outcome && c.outcome.startsWith('opponent:') && !c.returned).length;
  const good = cpu.filter(c => Number.isFinite(c.landX) && Math.abs(c.landX) <= 4.335 && Math.abs(c.landZ) <= 12.17 && c.outcome !== 'player:Net');
  const side = good.filter(c => Math.abs(c.bx) >= 1.2); let cross = 0, line = 0;
  for (const c of side) if (Math.abs(c.landX) >= 1.37){ if (Math.sign(c.landX) !== Math.sign(c.bx)) cross++; else line++; }
  const zones = good.map(c => zoneX(c.landX) + zoneZ(c.landZ));
  let rep = 0, pairs = 0; for (let i = 1; i < good.length; i++) if (good[i].t - good[i - 1].t < 6 && good[i].t > good[i - 1].t){ pairs++; if (zones[i] === zones[i - 1]) rep++; }
  const kinds = {}; for (const c of cpu) if (c.kind) kinds[c.kind] = (kinds[c.kind] || 0) + 1;
  const nk = Object.values(kinds).reduce((s, v) => s + v, 0);
  const share = Object.fromEntries(Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, f(100*v/nk)]));
  const reacts = player.map(x => x.react).filter(Number.isFinite), ends = {};
  for (const p of r.points){ const k = `${p.who === 'player' ? 'G' : 'CPU'}:${p.why}`; ends[k] = (ends[k] || 0) + 1; }
  return {
    puntiG: f(100*won/nPts), gameCPU: f(100*r.games.gl/Math.max(1, r.games.gw + r.games.gl)), gameG: f(100*r.games.gw/Math.max(1, r.games.gw + r.games.gl)), game: r.games.gw + r.games.gl,
    colpiPerPunto: f(rallies.reduce((s, v) => s + v, 0)/rallies.length, 2), rallyP90: q(rallies, .9), infiniti: capped, infinitiPct: f(100*capped/nPts, 2),
    colpiCPU: cpu.length, erroriCPU: f(100*cpuErr/cpu.length), vincentiCPU: f(100*cpuWin/cpu.length), vincentiSuErrori: f(cpuWin/Math.max(1, cpuErr), 2),
    incrociato: f(100*cross/Math.max(1, side.length)), lungolinea: f(100*line/Math.max(1, side.length)),
    entropia9: f(entropy(zones), 2), ripetizioni: f(100*rep/Math.max(1, pairs)),
    schemi: nk ? share : null, schemiSopra3: nk ? Object.values(share).filter(v => v > 3).length : null, schemaMax: nk ? Math.max(...Object.values(share)) : null,
    reazioneP10: f(q(reacts, .1), 3), reazioneP50: f(q(reacts, .5), 3), vmaxCPU: f(q(player.map(x => x.vmax), .995), 2),
    distanzaImpatto: [q(cpu.map(c => c.gap), .5), q(cpu.map(c => c.gap), .95), Math.max(...cpu.map(c => c.gap))].map(v => f(v, 2)),
    impattiOltre15: f(100*cpu.filter(c => c.gap > 1.5).length/Math.max(1, cpu.length)),
    lasciatePassare: r.letGo, affondi: r.lunges,
    // errori dell'avversario osservati / attesi a fine partita (modello imparato da Leggenda)
    avversarioOsservatoSuAtteso: r.learned?.length ? f(r.learned.reduce((a, v) => a + v, 0)/r.learned.length, 2) : null,
    fine: Object.fromEntries(Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, f(100*v/r.points.length)])),
  };
}

/* ---------- criteri ---------- */
const PROFILES6 = ['medio', 'amatore', 'tennista', 'preciso', 'bambino', 'impreciso'];
const WIN_CPU = { medio: 90, amatore: 90, tennista: 85, preciso: 60, bambino: 98, impreciso: 98 };
export function legendChecks(profile, m){
  const vPlayer = skillLevel('leggenda').playerSpeed;
  const c = [
    [`game vinti dalla CPU ≥ ${WIN_CPU[profile]}%`, m.gameCPU >= WIN_CPU[profile], `${m.gameCPU}%`],
    ['errori della CPU 2–6% per colpo', m.erroriCPU >= 2 && m.erroriCPU <= 6, `${m.erroriCPU}%`],
    ['incrociati 30–50%', m.incrociato >= 30 && m.incrociato <= 50, `${m.incrociato}%`],
    ['lungolinea ≥ 10%', m.lungolinea >= 10, `${m.lungolinea}%`],
    ['almeno 6 schemi sopra il 3%', m.schemiSopra3 >= 6, `${m.schemiSopra3}`],
    ['nessuno schema sopra il 35%', m.schemaMax <= 35, `${m.schemaMax}%`],
    ['entropia ≥ 2,3 bit', m.entropia9 >= 2.3, `${m.entropia9}`],
    ['ripetizioni ≤ 20%', m.ripetizioni <= 20, `${m.ripetizioni}%`],
    ['scambi chiusi a 60 colpi ≤ 1%', m.infinitiPct <= 1, `${m.infinitiPct}%`],
    [`velocità massima ≤ ${vPlayer} m/s (giocatore)`, m.vmaxCPU <= vPlayer, `${m.vmaxCPU}`],
    ['reazione p10 ≥ 0,12 s', m.reazioneP10 >= .12, `${m.reazioneP10}`],
  ];
  if (profile === 'medio') c.push(['vincenti ≥ errori', m.vincentiSuErrori >= 1, `${m.vincentiSuErrori}`]);
  return c;
}
export function regressionChecks(difficulty, m){
  if (difficulty === 'pro') return [['pro contro medio: il giocatore vince 70–85% dei game', m.gameG >= 70 && m.gameG <= 85, `${m.gameG}%`]];
  if (difficulty === 'casual') return [['casual contro medio: il giocatore vince ≥ 95% dei game', m.gameG >= 95, `${m.gameG}%`]];
  return [];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  const has = k => process.argv.includes(`--${k}`);
  const points = +(arg('points') || 300), profiles = arg('profiles') ? arg('profiles').split(',') : PROFILES6, json = has('json');
  const seeds = SEEDS.slice(0, Math.max(1, Math.min(SEEDS.length, +(arg('seeds') || SEEDS.length))));
  const out = [];
  if (has('ablation')){
    const cases = [
      ['Leggenda completa', {}],
      ['senza «lascia passare»', { noLetGo: true }],
      ['scelta a caso tra i candidati', { tau: 10 }],
      ['senza apprendimento', { learn: false }],
      ['mai incrociato (solo lungolinea)', { forceKind: 'lungolinea' }],
      ['corsa come pro (5 m/s, velocità istantanea)', { vmax: 5, legacyMove: true }],
      ['senza affondo', { lungeTime: 0 }],
      ['senza chiusura (scambi lunghi come gli altri)', { closeFrom: 999, closeHard: 0 }],
    ];
    for (const profile of (arg('profiles') ? profiles : ['medio', 'tennista', 'preciso'])) for (const [name, t] of cases){
      for (const k of Object.keys(legendTuning)) delete legendTuning[k];
      Object.assign(legendTuning, t);
      const m = metrics(run({ profile, difficulty: 'leggenda', points, seeds }));
      out.push({ profile, variante: name, ...m });
      if (!json) console.log(`${profile.padEnd(9)} ${name.padEnd(46)} game G ${String(m.gameG).padStart(5)}%  punti G ${String(m.puntiG).padStart(5)}%  errori CPU ${String(m.erroriCPU).padStart(4)}%  incrociati ${String(m.incrociato).padStart(4)}%  infiniti ${m.infinitiPct}%`);
    }
    for (const k of Object.keys(legendTuning)) delete legendTuning[k];
    if (json) console.log(JSON.stringify(out, null, 1));
  } else if (has('table')){
    for (const difficulty of (arg('difficulty') ? arg('difficulty').split(',') : ['casual', 'pro', 'leggenda'])) for (const profile of profiles){
      const m = metrics(run({ profile, difficulty, points, seeds }));
      out.push({ difficulty, profile, ...m });
      if (!json) console.log(`${difficulty}\t${profile}\t${JSON.stringify(m)}`);
    }
    if (json) console.log(JSON.stringify(out, null, 1));
  } else {
    let failed = 0;
    const report = (title, checks) => {
      if (!json) console.log(`\n${title}`);
      for (const [name, ok, val] of checks){ if (!ok) failed++; if (!json) console.log(`  ${ok ? 'OK' : 'KO'}  ${name.padEnd(48)} ${val}`); }
    };
    for (const profile of profiles){
      const m = metrics(run({ profile, difficulty: 'leggenda', points, seeds }));
      out.push({ difficulty: 'leggenda', profile, ...m, checks: legendChecks(profile, m) });
      report(`Leggenda contro «${profile}» (${m.game} game, ${m.colpiPerPunto} colpi per punto, schemi ${JSON.stringify(m.schemi)}, distanza all'impatto p50/p95/max ${m.distanzaImpatto.join('/')} m, affondi ${m.affondi}, palle lasciate passare ${m.lasciatePassare})`, legendChecks(profile, m));
    }
    if (!arg('profiles')) for (const difficulty of ['pro', 'casual']){
      const m = metrics(run({ profile: 'medio', difficulty, points, seeds }));
      out.push({ difficulty, profile: 'medio', ...m, checks: regressionChecks(difficulty, m) });
      report(`${difficulty} contro «medio» (non regressione)`, regressionChecks(difficulty, m));
    }
    if (json) console.log(JSON.stringify(out, null, 1));
    else console.log(failed ? `\n${failed} criteri non rispettati` : '\nTutti i criteri rispettati');
    if (failed) process.exitCode = 1;
  }
}
