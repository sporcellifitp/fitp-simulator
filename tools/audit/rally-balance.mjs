// Deterministic benchmark, not a claim about real people or sensor usability.
// One timing intention per incoming shot; no re-roll when auto-run replans.
import { pathToFileURL } from 'node:url';
import { ArcadeMatch, TOSS_APEX } from '../../site/js/match/arcade.js';
import { mulberry32 } from '../../site/js/match/core.js';
import { gauss } from '../../site/js/match/ai.js';
import { evaluateContact } from '../../site/js/match/contact.js';

export function simulateRallies({ seed = 3, seconds = 180, sd = .05, bias = 0, latency = .06, cpu = 'facile', tactic = 'central', power = .7, backswing = 0, dt = 1/120 } = {}){
  const rng = mulberry32(seed), core = new ArcadeMatch({ teams: [[{ human: true, id: 'me', grace: latency + .05 }], [{ id: 'cpu' }]], cpu, firstServer: 1, gamesToWin: 999, rng: mulberry32(seed + 77) });
  const result = { seed, cpu, tactic, contacts: 0, attempts: 0, misses: {}, labels: {}, points: [0, 0], reasons: {}, rallies: [], rallySeconds: [], hitTypes: {}, maxPlayerStep: 0 };
  const queue = []; let intent = null, tossIntent = null, rallyStart = 0;
  for (let frame = 0; frame < seconds/dt; frame++){
    const h = core.players[0], input = { swings: [] }, old = { x: h.x, z: h.z }, previousPhase = core.phase;
    if (core.phase === 'serve' && core.serverP === h){
      if (!core.toss){ input.toss = {}; tossIntent = { at: core.t + TOSS_APEX + gauss(rng)*sd }; }
      if (core.toss && tossIntent && !tossIntent.sent && core.t >= tossIntent.at){
        queue.push({ at: core.t, due: core.t + latency, swing: { power, aim: 0 } }); tossIntent.sent = true;
      }
    } else tossIntent = null;
    if (core.phase === 'live' && core.rally.lastHitter !== h.team && !h.done){
      if (!intent) intent = { error: bias + gauss(rng)*sd, sent: false };
      // Observe the current ball relative to the moving racket, as a visual player
      // does. Do not schedule against inc.Tc (a mutable movement forecast).
      const cue = evaluateContact({ ball: core.ball.p, velocity: core.ball.v, player: h, eligible: core.legalFor(h) });
      if (!intent.sent && cue.visible && cue.distance < 4.5 && cue.timeToImpact <= -intent.error){
        const opp = core.players[1], aim = tactic === 'open-court' ? -Math.sign(opp.x || (rng()-.5))*.93 : 0;
        queue.push({ at: core.t, due: core.t + latency, swing: { power, aim } });
        if (rng() < backswing) queue.push({ at: core.t + .2, due: core.t + .2 + latency, swing: { power: .35, aim } });
        intent.sent = true; result.attempts++;
      }
    }
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i].due <= core.t){ const q = queue.splice(i, 1)[0]; input.swings.push({ ...q.swing, delay: q.at - core.t - dt }); }
    for (const e of core.update(dt, input)){
      if (e.type === 'hit'){
        result.hitTypes[e.shot] = (result.hitTypes[e.shot] || 0) + 1;
        if (e.team === 1) intent = null;
        if (e.shot === 'serve') rallyStart = core.t;
      }
      if (e.type === 'contact' && !e.serve){ result.contacts++; result.labels[e.label] = (result.labels[e.label] || 0) + 1; }
      if (e.type === 'miss') result.misses[e.why] = (result.misses[e.why] || 0) + 1;
      if (e.type === 'point'){
        result.points[e.team]++; result.rallies.push(core.rally.hits); result.rallySeconds.push(core.t-rallyStart);
        result.reasons[e.reason || 'unknown'] = (result.reasons[e.reason || 'unknown'] || 0) + 1;
        intent = null;
        // A physical return from a previous point must not launch a new serve.
        queue.length = 0;
      }
    }
    // Point resets intentionally place players for serve; only live play is a
    // finite-speed movement assertion.
    if (previousPhase === 'live' && core.phase === 'live') result.maxPlayerStep = Math.max(result.maxPlayerStep, Math.hypot(h.x-old.x,h.z-old.z));
  }
  return summarise(result);
}

function summarise(result){
  const n = result.rallies.length, misses = Object.values(result.misses).reduce((a,b)=>a+b,0);
  return { ...result, completed: n, winRate: result.points[0]/Math.max(1,n), missRate: misses/Math.max(1,result.contacts+misses), meanHits: result.rallies.reduce((a,b)=>a+b,0)/Math.max(1,n), meanSeconds: result.rallySeconds.reduce((a,b)=>a+b,0)/Math.max(1,n), longRallies: result.rallies.filter(h=>h>20).length };
}
export function aggregateRallies(results){
  const total = { contacts: 0, attempts: 0, points: [0,0], misses: {}, labels: {}, reasons: {}, hitTypes: {}, rallies: [], rallySeconds: [], maxPlayerStep: 0 };
  for (const r of results){
    total.contacts+=r.contacts; total.attempts+=r.attempts; total.points[0]+=r.points[0]; total.points[1]+=r.points[1]; total.rallies.push(...r.rallies); total.rallySeconds.push(...r.rallySeconds);
    total.maxPlayerStep=Math.max(total.maxPlayerStep,r.maxPlayerStep);
    for (const key of ['misses','labels','reasons','hitTypes']) for (const [name,n] of Object.entries(r[key])) total[key][name]=(total[key][name]||0)+n;
  }
  return summarise(total);
}
export const BALANCE_SCENARIOS = Object.freeze({
  // Instinctive is a modest early bias around visible approach, novice is a
  // deliberately noisy stress case. Neither distribution is fitted to people.
  instinctive: { sd:.08, bias:-.06 }, novice: { sd:.15, bias:-.09 }, precise: { sd:.035 }, tactical: { sd:.035, tactic:'open-court' }, expert: { sd:.035, tactic:'open-court', cpu:'esperto' },
});
export function runBalanceAudit({ seeds = [3,19,41,73], seconds = 180 } = {}){
  return Object.fromEntries(Object.entries(BALANCE_SCENARIOS).map(([name,opts])=>[name,aggregateRallies(seeds.map(seed=>simulateRallies({seed,seconds,...opts})))]));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href){
  const results = runBalanceAudit();
  console.log(JSON.stringify({ method: 'Synthetic spatial timing; 4 fixed seeds, 180 simulation seconds each scenario; 60 ms delivery latency; no rally-length error escalation or forced point', results },null,2));
}
