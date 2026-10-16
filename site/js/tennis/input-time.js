// Browser timestamps at this boundary are seconds. Network timestamps are
// seconds of match time, never performance.now() milliseconds.
export const INPUT_TIME = Object.freeze({ maxAge: .8, futureTolerance: .04, maxQueue: 8 });
// Associate the sensor peak with the last frame actually displayed at that
// time. Never extrapolate from a newer snapshot or count paused wall time.
export function createPresentationTimeline(){
  const frames = [];
  return {
    reset(wallSeconds, matchSeconds){ frames.length = 0; if (Number.isFinite(wallSeconds) && Number.isFinite(matchSeconds)) this.record(wallSeconds, matchSeconds); },
    record(wallSeconds, matchSeconds){
      if (![wallSeconds, matchSeconds].every(Number.isFinite)) return;
      if (frames.length && wallSeconds < frames.at(-1).wall) return;
      frames.push({ wall: wallSeconds, match: matchSeconds });
      while (frames.length > 1 && frames[0].wall < wallSeconds - 1.2) frames.shift();
    },
    seenAt(wallSeconds){
      if (!Number.isFinite(wallSeconds) || !frames.length || wallSeconds > frames.at(-1).wall + INPUT_TIME.maxAge) return null;
      for (let i = frames.length - 1; i >= 0; i--) if (frames[i].wall <= wallSeconds) return frames[i].match;
      return null;
    },
  };
}
export function matchInputTime(at, now, since = 0){
  if (![at, now, since].every(Number.isFinite) || at < since || at < now - INPUT_TIME.maxAge || at > now + INPUT_TIME.futureTolerance) return null;
  return Math.min(at, now);
}
// Used by the actual host callback as well as its regression tests.
export function readGuestInput(data, now, since = 0){
  const bounded = (v, lo, hi, fallback) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
  const sw = [], ts = [];
  for (const s of Array.isArray(data?.sw) ? data.sw.slice(0, 4) : []){
    const at = matchInputTime(s?.at, now, since); if (at == null) continue;
    sw.push({ at, power: bounded(s.power, .2, 1, .6), lift: bounded(s.lift, -1, 1, 0),
      lob: s.lob === true, drop: s.drop === true, slice: s.slice === true,
      dur: bounded(s.dur, 0, 700, 0), dir: s.dir === 1 ? 1 : s.dir === -1 ? -1 : 0 });
  }
  const at = matchInputTime(data?.ts?.[0]?.at, now, since);
  if (at != null) ts.push({ at });
  return { sw, ts, mv: { x: 0, y: 0 }, auto: true };
}
