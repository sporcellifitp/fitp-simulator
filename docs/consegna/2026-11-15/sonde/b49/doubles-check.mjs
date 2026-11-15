// Doppio contro singolare: distanza laterale e altezza della palla ai colpi riusciti di chi gioca (P1), punti persi
// senza toccare, passaggio dall'esito B15 (_natpfRacketShot). Sola lettura (patch a runtime solo per misurare).
import { simulate } from '/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/wt/natpf-tennis/scripts/audit/rally-balance.mjs';
import { NatpfTennisEngine } from '/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/wt/natpf-tennis/src/game_engine.js';
const P = NatpfTennisEngine.prototype, origA = P._attemptPlayerRallyStrike, origR = P._natpfRacketShot, origAw = P._awardPoint;
let S = null;
P._attemptPlayerRallyStrike = function(ev, t){
  const b = this.ball, pl = this.player, lh = b.lastHitter;
  const snap = { lat: Math.abs(b.pos.x - pl.pos.x), y: b.pos.y, bz: b.pos.z, pz: pl.pos.z, d2p: Math.hypot(b.pos.x - this.playerPartner.pos.x, b.pos.z - this.playerPartner.pos.z), d1: Math.hypot(b.pos.x - pl.pos.x, b.pos.z - pl.pos.z) };
  const before = S?.racket || 0;
  const ok = origA.call(this, ev, t);
  if (S && ok && lh !== 'player' && b.lastHitter === 'player'){
    const byPartner = this.isDoubles && snap.d2p < snap.d1;
    if (!byPartner) S.hits.push({ ...snap, racket: (S.racket || 0) > before });
  }
  return ok;
};
P._natpfRacketShot = function(...a){ if (S) S.racket = (S.racket || 0) + 1; return origR.apply(this, a); };
P._awardPoint = function(who, why){ if (S && this.phase === 'RALLY'){ S.pts++; if (who === 'opponent' && this.ball.lastHitter === 'opponent') S.noTouch++; } return origAw.call(this, who, why); };
const q = (a, f) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(f*s.length))].toFixed(2) : null; };
const pct = (a, n) => +(100*a/Math.max(1, n)).toFixed(1);
for (const difficulty of ['casual', 'pro']) for (const profile of ['amatore', 'medio']) for (const fmt of ['singles', 'doubles']){
  const H = []; let pts = 0, noTouch = 0, won = 0, racket = 0, n = 0;
  for (const seed of [3, 5, 7, 11, 13]){
    S = { hits: [], pts: 0, noTouch: 0, racket: 0 }; let first = true;
    const r = simulate({ profile, difficulty, points: 150, seed, onStep: e => { if (first && fmt === 'doubles'){ e.isDoubles = true; e.matchFormat = { id: 'doubles', teamSize: 2 }; } first = false; } });
    H.push(...S.hits); pts += S.pts; noTouch += S.noTouch; won += r.won; n += r.points; racket += S.hits.filter(h => h.racket).length;
  }
  console.log(`${difficulty.padEnd(7)} ${profile.padEnd(8)} ${fmt.padEnd(8)} vinti ${pct(won, n)}% · colpi P1 ${H.length} (con esito B15 ${pct(racket, H.length)}%) · laterale p50 ${q(H.map(h => h.lat), .5)} m, <0,45 m ${pct(H.filter(h => h.lat < .45).length, H.length)}% · altezza p50 ${q(H.map(h => h.y), .5)} m · persi senza toccare ${pct(noTouch, pts)}%`);
}
