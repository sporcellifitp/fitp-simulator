// Partite dal vivo tra NPC sugli altri campi, con arbitro e raccattapalle: il Foro non è mai fermo.
// Si aggiornano solo quelle vicine al giocatore; quando il giocatore usa un campo, la partita lì si ferma.
import { frame } from '../core/util.js';
import { MatchCore } from './core.js';
import { pointLabels } from './rules.js';
import { MatchRenderer } from './view.js';
import { makeAvatar, pose } from '../entities/avatar.js';

const NAMES = ['A. Ferri', 'L. Conti', 'M. Serra', 'G. Villa', 'S. Neri', 'E. Galli', 'R. Fontana', 'N. Marino', 'C. Rizzo', 'F. Bruno', 'D. Greco', 'P. Leone'];
const SHIRTS = [0xffffff, 0x1f4fa3, 0xd8342c, 0xf3c623, 0x2f8f57, 0x0b2a5b, 0xf08a3c, 0x7a3fa0];

export function createExhibitions(W){
  const { layout, world } = W, S = layout.sites, { P, CF, PF, groundH } = world;
  const venues = [];
  const addVenue = (id, sport, F, y0, rallyOnly = false) => venues.push({ id, sport, F, y0, rallyOnly, m: null, view: null, wait: Math.random()*3, kids: [] });
  addVenue('centrale', 'tennis', CF, 0);
  if (P.pietr) addVenue('pietr', 'tennis', P.pietr.f, -P.pietr.D);
  if (S.supertennis) addVenue('st', 'tennis', frame(S.supertennis), 0);
  if (S.arena) addVenue('arena', 'tennis', frame(S.arena), groundH(S.arena.x, S.arena.z));
  const hub = S.pietrangeli || S.centrale;
  (layout.courts || []).filter(c => Math.hypot(c.x - hub.x, c.z - hub.z) < 300)
    .sort((a, b) => Math.hypot(a.x - hub.x, a.z - hub.z) - Math.hypot(b.x - hub.x, b.z - hub.z))
    .slice(0, 3).forEach((c, i) => addVenue('allenamento' + i, 'tennis', frame(c), 0, true));
  if (PF) (layout.padel || []).filter(c => Math.hypot(c.x - PF.x, c.z - PF.z) < 600).slice(0, 2).forEach((c, i) => addVenue('padel' + i, 'padel', frame(c), 0));

  let seed = 1;
  function startMatch(v){
    const names = NAMES.slice().sort(() => Math.random() - .5);
    const per = v.sport === 'padel' ? 2 : 1, teams = [[], []];
    for (let t = 0; t < 2; t++) for (let i = 0; i < per; i++) teams[t].push({ name: names[t*per + i], skill: .62 + Math.random()*.25 });
    v.m = new MatchCore({ sport: v.sport, teams, level: 'normale', gamesToWin: v.rallyOnly ? 99 : 3, rallyOnly: v.rallyOnly, rng: Math.random });
    const looks = v.m.players.map(() => ({ shirt: SHIRTS[(seed++)%SHIRTS.length], shorts: Math.random() < .5 ? 0xffffff : 0x1d2430, cap: SHIRTS[(seed*3)%SHIRTS.length], hasCap: Math.random() < .7, hair: [0x1d1d1f, 0x3a2a1c, 0x6b3b1c, 0xc9a45c][seed%4] }));
    v.view = new MatchRenderer(W, v.m, v.F, { y0: v.y0, looks });
    if (!v.rallyOnly) publish(v);
    if (!v.kids.length && v.sport === 'tennis'){
      for (const sx of [-1, 1]){
        const k = makeAvatar({ shirt: 0x5b2a86, shorts: 0x1d2430, cap: 0x5b2a86, hasRacket: false }, .72);
        k.home = { x: sx*(v.m.court.halfW + 1.2), z: 0 }; k.g.position.set(k.home.x, 0, 0); k.g.rotation.y = sx > 0 ? -Math.PI/2 : Math.PI/2;
        v.view.group.add(k.g); v.kids.push(k); k.task = null;
      }
    } else for (const k of v.kids) v.view.group.add(k.g);
  }
  function stopMatch(v){ if (v.view){ for (const k of v.kids) v.view.group.remove(k.g); v.view.dispose(); } v.view = null; v.m = null; }
  function publish(v){
    const sc = v.m.score, names = [0, 1].map(t => v.m.teamPlayers(t).map(p => p.name).join(' / '));
    W.bus.emit('live:score', { venue: v.id, sport: v.sport, names, games: [...sc.games], points: pointLabels(sc), server: sc.server, over: v.m.phase === 'over' });
  }
  function kids(v, dt, ev){
    for (const e of ev) if (e.type === 'point' && v.kids.length){
      const b = v.m.ball.p, k = v.kids.slice().sort((a, c) => Math.abs(a.home.x - b.x) - Math.abs(c.home.x - b.x))[0];
      k.task = { x: Math.max(-v.m.court.halfW - 2, Math.min(v.m.court.halfW + 2, b.x)), z: Math.max(-v.m.court.halfL - 3, Math.min(v.m.court.halfL + 3, b.z)), back: false };
    }
    for (const k of v.kids){
      const t = k.task, p = k.g.position;
      if (!t){ pose(k, { state: 'idle', t: W.engine.time }); continue; }
      const tx = t.back ? k.home.x : t.x, tz = t.back ? k.home.z : t.z, d = Math.hypot(tx - p.x, tz - p.z);
      if (d < .3){ if (t.back) k.task = null; else t.back = true; continue; }
      const s = Math.min(d, 6*dt); p.x += (tx - p.x)/d*s; p.z += (tz - p.z)/d*s; k.g.rotation.y = Math.atan2(tx - p.x, tz - p.z);
      pose(k, { state: 'run', phase: W.engine.time*16, t: W.engine.time });
    }
  }

  return {
    venues,
    busy(id){ const g = W.games; return g.G.active && g.G.venue === id; },
    update(dt){
      const p = W.player.pos;
      for (const v of venues){
        const near = Math.hypot(p.x - v.F.x, p.z - v.F.z) < 260;
        if (this.busy(v.id)){ if (v.m) stopMatch(v); v.wait = 2; continue; }
        if (!near){ continue; }
        if (!v.m){ v.wait -= dt; if (v.wait <= 0) startMatch(v); continue; }
        const steps = Math.max(1, Math.ceil(dt/(1/45))), all = [];
        for (let i = 0; i < steps; i++) all.push(...v.m.update(dt/steps));
        v.view.sync(dt);
        kids(v, dt, all);
        if (all.some(e => e.type === 'point' || e.type === 'game') && !v.rallyOnly) publish(v);
        if (all.some(e => e.type === 'point')) W.bus.emit('crowd:point', { venue: v.id });
        if (v.m.phase === 'over'){ v.over = (v.over || 0) + dt; if (v.over > 6){ v.over = 0; stopMatch(v); v.wait = 1; } }
      }
    },
  };
}
