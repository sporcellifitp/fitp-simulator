export const LAG_TEST = Object.freeze({ cycles: 18, warm: 3, tMin: .8, tMax: 1.4, early: -.25, late: .45, minHits: 8, maxSpread: .07 });

export function lagPlan(seed){
  let state = seed >>> 0;
  const rand = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const catches = new Set([3, 8, 13].map(first => first + Math.floor(rand() * 4)));
  const lengths = Array.from({ length: LAG_TEST.cycles }, () => .8 + rand() * .6);
  const total = lengths.reduce((sum, value) => sum + value, 0);
  const cap = total < 18 ? 1.4 : .8;
  const scale = total < 18 ? (18 - total) / (1.4 * lengths.length - total)
    : total > 22.5 ? (total - 22.5) / (total - .8 * lengths.length) : 0;
  let touch = 0;
  const cycles = lengths.map((length, i) => {
    const T = length + (cap - length) * scale;
    touch += T;
    return { i, T, touch, kind: i < LAG_TEST.warm ? 'warm' : catches.has(i) ? 'catch' : 'hit' };
  });
  return { seed, cycles, end: touch + LAG_TEST.late };
}

export function ballY(plan, t){
  if (t < 0) return null;
  const cycle = plan.cycles.find(c => t <= c.touch);
  if (!cycle) return null;
  const age = Math.max(0, t - (cycle.touch - cycle.T));
  if (cycle.i > 0 && plan.cycles[cycle.i - 1].kind === 'catch' && age < .15) return null;
  if (cycle.kind === 'catch' && age >= cycle.T / 2) return null;
  return 2.4 * age * (cycle.T - age) / (LAG_TEST.tMax ** 2);
}

const median = numbers => {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const mad = (numbers, center) => 1.4826 * median(numbers.map(n => Math.abs(n - center)));

export function estimateLag(plan, peaks){
  const samples = peaks.filter(Number.isFinite).sort((a, b) => a - b);
  function match(center){
    const used = new Set(), errors = [];
    let catchSwings = 0;
    for (const c of plan.cycles){
      let closest = -1, gap = Infinity;
      for (let k = 0; k < samples.length; k++){
        const delta = samples[k] - c.touch;
        const distance = Math.abs(delta - center);
        if (used.has(k) || delta < LAG_TEST.early || delta > LAG_TEST.late || distance >= gap) continue;
        closest = k; gap = distance;
      }
      if (closest < 0) continue;
      used.add(closest);
      if (c.kind === 'hit') errors.push(samples[closest] - c.touch);
      if (c.kind === 'catch') catchSwings++;
    }
    return { errors, catchSwings, stray: samples.length - used.size };
  }
  const first = match(.1);
  const { errors, catchSwings, stray } = match(median(first.errors));
  const middle = median(errors), limit = Math.max(.04, 3 * mad(errors, middle));
  const kept = errors.filter(n => Math.abs(n - middle) <= limit);
  const value = median(kept), spread = mad(kept, value);
  const why = catchSwings > 1 ? 'ritmo' : kept.length < LAG_TEST.minHits ? 'pochi' : spread > LAG_TEST.maxSpread ? 'irregolari' : null;
  return { ok: !why, why, lagMs: Math.round(value * 1000), spreadMs: Math.round(spread * 1000), hits: kept.length, measured: 12, dropped: errors.length - kept.length, catchSwings, stray };
}

export function proposeLag({ lagMs, refMs = 0, recent = [] }){
  const estimated = median([...recent.filter(Number.isFinite).slice(-2), lagMs]);
  return Math.max(0, Math.min(200, Math.round((estimated - refMs) / 5) * 5));
}
