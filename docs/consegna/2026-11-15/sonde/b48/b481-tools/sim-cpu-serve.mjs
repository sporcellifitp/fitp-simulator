// Revisione B48: partite simulate con la battuta alternata, controllo indipendente del servizio della CPU.
// ROOT=<natpf-tennis> node --import $ROOT/test/register.mjs sim-cpu-serve.mjs [--levels=..] [--models=profilo,insegnato,...] [--seeds=..] [--points=..]
const ROOT = process.env.ROOT;
const { simulate } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
const { phoneServeOf } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const levels = (arg('levels') || 'bambini,casual,evento,pro,leggenda').split(',');
const models = (arg('models') || 'profilo,insegnato,tardi,piano,forte').split(',');
const seeds = (arg('seeds') || '101,202,303').split(',').map(Number), points = +(arg('points') || 240), profile = arg('profile') || 'medio';
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p*(s.length - 1)))].toFixed(2) : null; };
const maxRun = list => { let best = 0, run = 0, prev; for (const k of list){ run = k === prev ? run + 1 : 1; prev = k; best = Math.max(best, run); } return best; };
const third = x => { const a = Math.abs(x); return a < 4.115/3 ? 'T' : a < 2*4.115/3 ? 'corpo' : 'largo'; };
for (const difficulty of levels) for (const model of models){
  const R = { difficulty, model, cpu: 0, viol: 0, violMax: 0, firstMax: 0, firstN: 0, trauma: 0, shownBad: 0, outBox: 0, wrongBox: 0, depth: [], kmh: [], mine: [], dirRuns: 0, kindRuns: 0, bounceRuns: 0, won: 0, dirs: {}, kinds: {}, bounceDirs: {}, matches: 0, noPlan: 0 };
  for (const [si, seed] of seeds.entries()){
    let pend = null, seq = -1, myServes = [], planDirs = [], planKinds = [], bounceDirs = [];
    const flush = () => { R.dirRuns = Math.max(R.dirRuns, maxRun(planDirs)); R.kindRuns = Math.max(R.kindRuns, maxRun(planKinds)); R.bounceRuns = Math.max(R.bounceRuns, maxRun(bounceDirs)); planDirs = []; planKinds = []; bounceDirs = []; };
    const setup = e => {
      if (si % 2 === 0){ e.natpfFair = false; e.natpfServeFirst = 'opponent'; }
      const shown = []; const arena = e.natpfArena;
      e.natpfArena = new Proxy(arena || {}, { get: (t, k) => k === 'setSpeed' ? v => { shown.push(v); return t.setSpeed?.(v); } : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
      const hit = e._executeServeHit.bind(e);
      e._executeServeHit = (actor, evt) => {
        if (e.natpfMatchSeq !== seq){ seq = e.natpfMatchSeq; myServes = []; R.matches++; }
        const was = e.ball.inPlay, trauma0 = e.cameraTrauma, n0 = shown.length;
        hit(actor, evt);
        if (was || !e.ball.inPlay) return;
        const raw = e.ball.vel.length()*3.6;
        if (actor === e.player){ myServes.push(Math.round(raw)); R.mine.push(Math.round(raw)); return; }
        if (actor !== e.opponent) return;
        R.cpu++;
        const plan = e.natpfLastCpuServe; if (!plan || !evt.natpfCpuServe) R.noPlan++;
        const mean = myServes.length ? myServes.reduce((a, v) => a + v, 0)/myServes.length : null;
        if (['casual', 'bambini'].includes(difficulty)){
          if (mean == null){ R.firstN++; R.firstMax = Math.max(R.firstMax, raw); }
          else if (raw > mean + 1e-9){ R.viol++; R.violMax = Math.max(R.violMax, raw - mean); }
        }
        if (e.cameraTrauma - trauma0 > 0) R.trauma++;
        const s = shown.slice(n0); if (s.length !== 1 || s[0] !== Math.round(raw)) R.shownBad++;
        R.kmh.push(raw);
        if (plan){ planDirs.push(plan.dir); planKinds.push(plan.kind); R.dirs[plan.dir] = (R.dirs[plan.dir] || 0) + 1; R.kinds[plan.kind] = (R.kinds[plan.kind] || 0) + 1; }
        pend = { box: (e.score.deuceSide ? -1 : 1) * Math.sign(-e.opponent.sideSign || 1), won: null, bounce: null, seq };
      };
      const award = e._awardPoint.bind(e);
      e._awardPoint = (who, why) => { if (pend && pend.won == null) { pend.won = who === 'player'; if (pend.won) R.won++; } pend = null; return award(who, why); };
    };
    const onStep = e => {
      if (pend && !pend.bounce && e.ball.lastHitter === 'opponent' && e.ball.bounceCountOnCurrentSide >= 1){
        const x = e.ball.pos.x, z = e.ball.pos.z; pend.bounce = { x, z };
        R.depth.push(Math.abs(z));
        if (Math.abs(x) > 4.115 + .03 || Math.abs(z) > 6.4 + .03 || z < 0) R.outBox++;
        const b = third(x); bounceDirs.push(b); R.bounceDirs[b] = (R.bounceDirs[b] || 0) + 1;
      }
    };
    simulate({ profile, difficulty, points, seed, setup, onStep, ...(model !== 'profilo' ? { serve: (e, rng) => phoneServeOf(model, e, rng) } : {}) });
    flush();
  }
  const pc = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(100*v/Math.max(1, R.cpu)).toFixed(1)]));
  console.log(JSON.stringify({ difficulty, model, partite: R.matches, servCPU: R.cpu, senzaPiano: R.noPlan, piuVeloceDellaMediaPartita: R.viol, scartoMax: +R.violMax.toFixed(2), primiServizi: R.firstN, primoMaxKmh: +R.firstMax.toFixed(1),
    tremolio: R.trauma, tabelloneSbagliato: R.shownBad, fuoriQuadrato: R.outBox, kmhCPU: { p10: q(R.kmh, .1), p50: q(R.kmh, .5), p90: q(R.kmh, .9) }, kmhGiocatore: { p10: q(R.mine, .1), p50: q(R.mine, .5), p90: q(R.mine, .9) },
    profondita: { p10: q(R.depth, .1), p50: q(R.depth, .5), p90: q(R.depth, .9) }, pianoDir: pc(R.dirs), pianoEffetto: pc(R.kinds), rimbalzoDir: pc(R.bounceDirs),
    maxDiFilaPianoDir: R.dirRuns, maxDiFilaEffetto: R.kindRuns, maxDiFilaRimbalzo: R.bounceRuns, puntiGiocatoreSulServizioCPU: +(100*R.won/Math.max(1, R.cpu)).toFixed(1) }));
}
