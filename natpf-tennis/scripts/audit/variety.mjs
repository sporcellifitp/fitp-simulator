// Audit della varietà dei colpi: simula punti contro la CPU (come rally-balance.mjs) e riporta, per giocatore e CPU,
// punto di rimbalzo (laterale e profondità), altezza sopra la rete, apice, tempo di volo, velocità, tipi di colpo,
// zone del campo e scarto tra rimbalzo vero e bersaglio. È un banco di prova deterministico, non una misura di persone.
//   npm run audit:variety                       profilo «medio», livello casual
//   npm run audit:variety -- tennista pro
import { simulate } from './rally-balance.mjs';
const { NatpfTennisEngine: E } = await import('../../src/game_engine.js');
const P = E.prototype, log = []; let who = null, open = null;
for (const [m, w] of [['_attemptPlayerRallyStrike', 'giocatore'], ['_executeOpponentReturn', 'CPU']]){
  const f = P[m]; P[m] = function(...a){ const o = who; who = w; try { return f.apply(this, a); } finally { who = o; } };
}
const launch = P._launchBallToTarget;
P._launchBallToTarget = function(from, to, flight, opt = {}){
  launch.call(this, from, to, flight, opt);
  const v = this.ball.vel, g = 9.15 + (opt.topspin ?? 14)*.14, tn = Math.abs(from.z/v.z);
  open = { who, x: Math.abs(to.x), z: Math.abs(to.z), flight, net: from.y + v.y*tn - .5*g*tn*tn, apex: from.y + Math.max(0, v.y)**2/(2*g), kmh: 0, miss: null };
  log.push(open);
};
const step = P._stepPhysics;
P._stepPhysics = function(dt){
  const vy = this.ball.vel.y; step.call(this, dt);
  if (open && open.kmh === 0) open.kmh = this.ball.vel.length()*3.6;
  if (open && vy < 0 && this.ball.vel.y > 0 && this.ball.pos.y < .2){ open.miss = Math.abs(this.ball.pos.z) - open.z; open = null; }
};
const [profile = 'medio', difficulty = 'casual'] = process.argv.slice(2);
simulate({ profile, difficulty, points: 150, seed: 7 });
const stat = a => { a = a.filter(Number.isFinite).sort((x, y) => x - y); const q = p => a[Math.floor(p*(a.length - 1))].toFixed(2); return `p10 ${q(.1)}  p50 ${q(.5)}  p90 ${q(.9)}`; };
console.log(`profilo ${profile}, livello ${difficulty}`);
for (const w of ['giocatore', 'CPU']){
  const r = log.filter(l => l.who === w), zones = {};
  for (const l of r){ const k = `${l.z < 6.4 ? 'corta' : l.z < 9.5 ? 'media' : 'fondo'}/${l.x < 1.4 ? 'centro' : l.x < 3 ? 'mezzo' : 'riga'}`; zones[k] = (zones[k] || 0) + 1; }
  console.log(`\n${w} (${r.length} colpi)`);
  for (const [k, t] of [['x', 'laterale (m)'], ['z', 'profondità (m)'], ['net', 'sopra la rete (m)'], ['apex', 'apice (m)'], ['flight', 'volo (s)'], ['kmh', 'velocità (km/h)'], ['miss', 'rimbalzo − bersaglio (m)']])
    console.log(t.padEnd(26), stat(r.map(l => l[k])));
  console.log('zone'.padEnd(26), Object.entries(zones).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
}
