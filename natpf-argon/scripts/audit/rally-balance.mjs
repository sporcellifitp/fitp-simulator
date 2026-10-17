// Audit degli scambi di NATPF Argon (come tools/audit/rally-balance.mjs di NATPF Simulator): simula molti punti
// contro la CPU con profili di giocatore diversi e riporta colpi per punto, punti vinti e come finiscono i punti.
// È un banco di prova deterministico sulle regole vere del motore, non una misura di persone reali.
//   npm run audit:rally                       tutte le difficoltà e tutti i profili
//   npm run audit:rally -- --json             risultato in JSON
//   npm run audit:rally -- --points=300 --difficulty=pro
import { pathToFileURL } from 'node:url';
import { createHeadlessEngine, mulberry32, gauss } from './headless-engine.mjs';

// Profili: errore di tempo (s, deviazione standard), mira (quanto cerca il campo aperto e con che dispersione),
// forza del gesto (velocità di Argon 0,8…1,65) e uso dei colpi speciali.
export const PROFILES = {
  preciso:   { timingSd: .045, aimOpen: .85, aimSd: .12, speed: 1.45, speedSd: .06, specials: .12 },
  medio:     { timingSd: .09,  aimOpen: .55, aimSd: .3,  speed: 1.22, speedSd: .12, specials: .06 },
  impreciso: { timingSd: .16,  aimOpen: .1,  aimSd: .55, speed: 1.02, speedSd: .16, specials: 0 },
};
const RALLY_CAP = 60;           // oltre questi colpi lo scambio si considera «infinito» e si chiude d'ufficio
const DT = 1/120;

export function simulate({ profile = 'medio', difficulty = 'casual', points = 200, seed = 7, maxSeconds = 4000 } = {}){
  const P = typeof profile === 'string' ? PROFILES[profile] : profile;
  const rng = mulberry32(seed), engineRng = mulberry32(seed*7919 + 13);
  const realRandom = Math.random; Math.random = engineRng;
  const out = { profile: typeof profile === 'string' ? profile : 'custom', difficulty, points: 0, won: 0, rallies: [], reasons: {}, capped: 0, whiffs: 0, grades: {} };
  try {
    const e = createHeadlessEngine({ difficulty });
    const award = e._awardPoint.bind(e);
    e._awardPoint = (who, why = '') => {
      const hits = e.ball.rallyStrokeCount;
      out.points++; if (who === 'player') out.won++;
      out.rallies.push(hits);
      const key = `${who === 'player' ? 'vinto' : 'perso'}: ${why || 'punto'}`;
      out.reasons[key] = (out.reasons[key] || 0) + 1;
      award(who, why);
    };
    const popup = e.hud.showTimingPopup;
    e.hud = new Proxy({}, { get: (t, k) => k === 'showTimingPopup' ? ({ grade = '' } = {}) => { const g = String(grade).split(' ')[0]; out.grades[g] = (out.grades[g] || 0) + 1; if (/WHIFF/.test(grade)) out.whiffs++; } : () => {} });
    void popup;
    e.startNewMatch({ showStartBanner: false });
    let intent = null, serveAt = null;
    for (let t = 0; t < maxSeconds && out.points < points; t += DT){
      if (e.phase === 'SERVE_STANCE'){ intent = null; if (e.score.server === 'player' && e.phaseTimer > .6){ e._handleUserTossInput({}); serveAt = e.elapsedTime + .55 + gauss(rng)*P.timingSd*.6; } }
      if (e.phase === 'SERVE_TOSS' && e.score.server === 'player' && serveAt != null && e.elapsedTime >= serveAt){
        serveAt = null; e._handleUserSwingInput({ source: 'audit', speed: P.speed + gauss(rng)*P.speedSd, dirX: gauss(rng)*.3 });
      }
      if (e.phase === 'RALLY' && e.ball.inPlay){
        if (e.ball.lastHitter === 'player') intent = null;
        else if (e.ball.vel.z > .5 && e.ball.pos.z > -6){
          if (!intent) intent = { error: gauss(rng)*P.timingSd, sent: false };
          const r = e.ball.pos.z - e.player.pos.z, tti = (-.1 - r)/e.ball.vel.z;   // tempo all'impatto ideale
          if (!intent.sent && tti <= -intent.error){
            intent.sent = true;
            const openSide = e.opponent.pos.x >= 0 ? -1 : 1;
            const aim = Math.max(-1, Math.min(1, (rng() < P.aimOpen ? openSide*.85 : (rng() - .5)*1.2) + gauss(rng)*P.aimSd));
            const special = rng() < P.specials;
            const shotType = special ? (e.opponent.pos.z > -9 ? 'lob' : 'drop') : 'topspin';
            e._handleUserSwingInput({ source: 'audit', shotType: shotType === 'drop' ? 'slice' : shotType, natpfDrop: shotType === 'drop', speed: shotType === 'drop' ? .85 : P.speed + gauss(rng)*P.speedSd, dirX: aim });
          }
        }
        if (e.ball.rallyStrokeCount >= RALLY_CAP){ out.capped++; e._awardPoint('opponent', 'scambio infinito'); }
      }
      e.step(DT);
    }
  } finally { Math.random = realRandom; }
  const n = out.rallies.length || 1, sorted = [...out.rallies].sort((a, b) => a - b);
  out.avgHits = +(out.rallies.reduce((s, v) => s + v, 0)/n).toFixed(2);
  out.medianHits = sorted[Math.floor(sorted.length/2)] ?? 0;
  out.maxHits = sorted.at(-1) ?? 0;
  out.winPct = +(100*out.won/Math.max(1, out.points)).toFixed(1);
  return out;
}

export function auditAll({ points = 200, seeds = [7, 11, 23], difficulties = ['casual', 'pro'], profiles = Object.keys(PROFILES) } = {}){
  const rows = [];
  for (const difficulty of difficulties) for (const profile of profiles){
    const runs = seeds.map(seed => simulate({ profile, difficulty, points, seed }));
    const all = runs.flatMap(r => r.rallies), won = runs.reduce((s, r) => s + r.won, 0), pts = runs.reduce((s, r) => s + r.points, 0);
    const reasons = {}; for (const r of runs) for (const [k, v] of Object.entries(r.reasons)) reasons[k] = (reasons[k] || 0) + v;
    const sorted = [...all].sort((a, b) => a - b);
    rows.push({ difficulty, profile, points: pts, avgHits: +(all.reduce((s, v) => s + v, 0)/Math.max(1, all.length)).toFixed(2), medianHits: sorted[Math.floor(sorted.length/2)] ?? 0,
      maxHits: sorted.at(-1) ?? 0, capped: runs.reduce((s, r) => s + r.capped, 0), winPct: +(100*won/Math.max(1, pts)).toFixed(1), reasons });
  }
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  const rows = auditAll({ points: +(arg('points') || 200), difficulties: arg('difficulty') ? [arg('difficulty')] : undefined });
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 2));
  else {
    console.log('difficoltà  profilo     punti  colpi/punto  mediana  max  infiniti  punti vinti');
    for (const r of rows) console.log(`${r.difficulty.padEnd(11)} ${r.profile.padEnd(10)} ${String(r.points).padStart(6)} ${String(r.avgHits).padStart(12)} ${String(r.medianHits).padStart(8)} ${String(r.maxHits).padStart(4)} ${String(r.capped).padStart(9)} ${String(r.winPct).padStart(11)}%`);
    for (const r of rows) console.log(`\n${r.difficulty}/${r.profile}: ` + Object.entries(r.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
  }
}
