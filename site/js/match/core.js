// Una partita di tennis o padel: giocatori, servizio, scambi, punteggio. Senza Three.js: la grafica sta in view.js.
// Il giocatore umano (se c'è) passa i comandi a update() come { move:{x,y}, jump, hit, lob }. Con più giocatori veri
// (partite tra amici, match/online.js) si passa un oggetto { [id del giocatore]: comandi }.
// Il gioco «Tennis 1 contro 1» (js/tennis/) usa i comandi con lo swing: { move, swing:{ power, lift, lob, aim, delay, win },
// toss, auto } — il tempo del colpo è giudicato in match/racket.js; con auto il personaggio si muove da solo (telefono).
import { COURTS, newBall, stepBall, sideOf } from './physics.js';
import { Rally, newScore, awardPoint, serveFromRight, pointLabels } from './rules.js';
import { LEVELS, planIntercept, chooseShot, makeShot, shotTarget, gauss } from './ai.js';
import { judgeSwing, racketShot, axes, S0, timingLabel } from './racket.js';

const GRAV_PLAYER = 20, JUMP_V = 6.2;
// lancio di palla al servizio (comandi con lo swing): parte a 1,5 m, sale fino a 3 m, l'impatto ideale è a 2,75 m scendendo
const TOSS = { y0: 1.5, vy: 5.4, ideal: .77, lo: 2.05, hi: 3.3, catchY: 1.05 };
export const tossY = t => TOSS.y0 + TOSS.vy*t - 4.905*t*t;

export function mulberry32(seed){
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
}

export class MatchCore {
  // teams: [[{ name, human? }...], [...]]; level: facile | normale | esperto
  constructor({ sport = 'tennis', teams, level = 'normale', gamesToWin = 2, goldenPoint = false, rng = Math.random, firstServer = null, rallyOnly = false, set = false }){
    this.court = COURTS[sport]; this.sport = sport; this.rng = rng; this.level = LEVELS[level] || LEVELS.normale;
    this.rallyOnly = rallyOnly;                                   // partite di allenamento: niente punteggio
    this.score = newScore({ gamesToWin, goldenPoint, set, firstServer: firstServer ?? (rng() < .5 ? 0 : 1) });
    this.hist = [];                                               // ultimi campioni della palla, per giudicare gli swing
    this.players = [];
    teams.forEach((team, t) => team.forEach((p, i) => this.players.push(this.makePlayer(p, t, i, team.length))));
    this.ball = newBall(); this.ball.held = true;
    this.events = []; this.t = 0; this.sinceHit = 0; this.stats = { rallies: 0, longest: 0, winners: [0, 0] };
    this.setupPoint();
  }
  makePlayer(p, team, idx, n){
    const L = this.level, c = this.court, human = !!p.human;
    const homeX = n === 2 ? (idx === 0 ? 1 : -1)*c.halfW*.5*(team === 0 ? 1 : -1) : 0;
    const skill = human ? 1 : (p.skill ?? L.skill);
    return {
      id: p.id || `${team}-${idx}`, name: p.name || '', team, human, idx,
      x: homeX, z: 0, y: 0, vy: 0, homeX,
      speed: human ? 6.6 : (p.speed ?? L.speed), reach: human ? L.humanReach : 1.25, skill,
      reaction: human ? 0 : L.reaction, canJump: true,
      tx: homeX, tz: 0, swing: 0, swingBuffer: 0, react: 0, plan: null, planT: 0, moving: 0, facing: team === 0 ? -1 : 1,
    };
  }
  get server(){ return this.score.server; }
  teamPlayers(t){ return this.players.filter(p => p.team === t); }

  /* ---------- preparazione del punto ---------- */
  setupPoint(){
    const c = this.court, sc = this.score, fromRight = serveFromRight(sc);
    this.rally = new Rally(c, { server: sc.server, fromRight });
    this.placeForServe();
    this.phase = 'serve'; this.timer = 0; this.sinceHit = 0;
  }
  placeForServe(){
    const c = this.court, r = this.rally, sx = r.serveX(), padel = c.sport === 'padel';
    const back = padel ? c.serviceZ + 1.6 : c.halfL + .5;
    const zOf = (team, d) => (team === 0 ? 1 : -1)*d;
    // il battitore: nel doppio chi sta dalla parte giusta del campo
    const srvTeam = this.teamPlayers(r.server), rcvTeam = this.teamPlayers(1 - r.server);
    const pick = (list, x) => list.length === 1 ? list[0] : list.slice().sort((a, b) => Math.abs(a.homeX - x) - Math.abs(b.homeX - x))[0];
    this.serverP = pick(srvTeam, sx*c.halfW*.5);
    this.receiverP = pick(rcvTeam, -sx*c.halfW*.5);
    for (const p of this.players){ p.y = 0; p.vy = 0; p.swing = 0; p.swingBuffer = 0; p.plan = null; p.sw = null; p.swingAt = null; }
    this.toss = null; this.hist = [];
    Object.assign(this.serverP, { x: sx*(padel ? 2.3 : 1.2), z: zOf(r.server, back) });
    Object.assign(this.receiverP, { x: -sx*(padel ? 2.6 : 2.2), z: zOf(1 - r.server, padel ? c.halfL - 1.2 : c.halfL + .3) });
    for (const p of srvTeam) if (p !== this.serverP) Object.assign(p, { x: -sx*2.4, z: zOf(r.server, padel ? 3 : 4) });
    for (const p of rcvTeam) if (p !== this.receiverP) Object.assign(p, { x: sx*2.4, z: zOf(1 - r.server, padel ? c.halfL - 1.4 : 8) });
    for (const p of this.players){ p.tx = p.x; p.tz = p.z; }
    this.holdBall();
  }
  holdBall(){
    const s = this.serverP, b = this.ball;
    b.p = { x: s.x + .35*(s.team === 0 ? -1 : 1), y: 1, z: s.z }; b.v = { x: 0, y: 0, z: 0 };
    b.held = true; b.stopped = false; b.rolling = false; b.out = false;
  }

  /* ---------- servizio ---------- */
  // opts (servizio con lo swing): { power, u } potenza e tempo dell'impatto rispetto all'ideale
  serve(aimX = null, opts = null){
    if (this.phase !== 'serve') return;
    const c = this.court, r = this.rally, s = this.serverP, padel = c.sport === 'padel', second = r.attempt === 2;
    const box = r.serveBox();
    // mira: dentro il riquadro, verso l'esterno o verso la T; la seconda palla è più prudente
    const ax = aimX == null ? (this.rng()*2 - 1)*.8 : aimX;
    const xMid = (box.x0 + box.x1)/2, xHalf = (box.x1 - box.x0)/2 - (second ? .7 : .35);
    const tx = xMid + (s.team === 0 ? 1 : -1)*ax*xHalf;
    const tz = Math.sign(box.z0 + box.z1)*(c.serviceZ - (second ? 1.3 : .7));
    let err = s.human ? this.level.humanError*(second ? .5 : .75) : (1 - s.skill)*(second ? .35 : .7), pace = 1;
    if (opts){ err = this.level.humanError*.45 + 1.1*opts.u*opts.u + Math.max(0, opts.power - .8)*2.2; pace = .78 + .45*opts.power; }
    const from = padel ? { x: s.x, y: .85, z: s.z } : { x: s.x, y: opts ? Math.max(2.1, this.ball.p.y) : 2.75, z: s.z };
    const shot = makeShot(c, from, { x: tx, z: tz }, padel ? 'drive' : 'serve', err, this.rng, null, pace);
    if (padel){ shot.v.x *= .78; shot.v.z *= .78; shot.v.y = (-from.y + .5*9.81*((tz - from.z)/shot.v.z)**2)/((tz - from.z)/shot.v.z); }
    const b = this.ball; b.held = false; b.p = { ...from }; b.v = { x: shot.v.x, y: shot.v.y, z: shot.v.z };
    r.hit(s.team);
    if (!opts) s.swing = .35;
    this.phase = 'live'; this.sinceHit = 0; this.lastHitter = s; this.toss = null; this.hist = [];
    for (const p of this.players) p.sw = null;
    this.emit({ type: 'hit', team: s.team, player: s.id, shot: 'serve', human: s.human });
  }

  /* ---------- colpi durante lo scambio ---------- */
  canReach(p){
    const b = this.ball.p, dx = b.x - p.x, dz = b.z - p.z;
    const top = p.y > .25 ? 3.2 : 2.35;
    return Math.hypot(dx, dz) <= p.reach && b.y >= .1 && b.y <= top + p.y*.5;
  }
  strike(p, { type, target, error, clearance = null, pace = 1 }, anim = true){
    const c = this.court, b = this.ball;
    const from = { x: b.p.x, y: Math.max(.35, b.p.y), z: b.p.z };
    const shot = makeShot(c, from, target, type, error, this.rng, clearance, pace);
    const res = this.rally.hit(p.team);
    if (res){ this.endPoint(res); return; }
    b.v = { x: shot.v.x, y: shot.v.y, z: shot.v.z }; b.p = from; b.rolling = false; b.stopped = false;
    if (anim) p.swing = .35;
    p.lastShot = type; this.sinceHit = 0; this.lastHitter = p; this.hist = [];
    for (const q of this.players) if (q.team !== p.team){ q.react = q.reaction; q.planT = 0; }
    this.emit({ type: 'hit', team: p.team, player: p.id, shot: type, human: p.human });
  }
  humanStrike(p, input){
    const c = this.court, b = this.ball.p;
    let type = p.lobBuffer || input.lob ? 'lob' : 'drive';
    if (b.y > 2.05 && Math.abs(b.z) < c.halfL*.75) type = 'smash';
    if ((p.lobBuffer || input.lob) && b.y > 2.4) type = 'lob';
    const aimX = Math.max(-1, Math.min(1, input.move.x*1.1));
    const depth = input.move.y < -.4 ? .35 : .82;                     // freccia indietro: palla corta
    const contact = Math.abs(b.y - 1.05)*.25 + Math.hypot(b.x - p.x, b.z - p.z)/p.reach*.25;
    const error = this.level.humanError*(.6 + contact) + (type === 'smash' ? .15 : 0);
    this.strike(p, { type, target: shotTarget(c, p.team, aimX, depth, type), error });
  }

  /* ---------- comandi con lo swing (Tennis 1 contro 1) ---------- */
  takeSwing(h, inp){
    const sw = { power: .6, lift: 0, lob: false, aim: null, ...inp.swing };
    sw.at = this.t + (sw.delay ?? .09); sw.win = sw.win ?? .085;
    h.swingAt = sw.at - .17;                                  // l'animazione passa dal punto d'impatto all'istante giusto
    if (this.phase === 'serve'){
      if (this.serverP !== h) return;
      if (this.court.sport === 'padel'){ this.serve(this.serveAim(h, sw, 0), { power: sw.power, u: 0 }); return; }
      if (!this.toss){ this.startToss(h); h.swingAt = null; return; }   // il primo movimento lancia la palla
      if (sw.at - this.toss.t0 < .3){ h.swingAt = null; return; }       // un clic rapido è solo il lancio
      h.sw = sw; return;
    }
    if (this.phase === 'live') h.sw = sw;
  }
  startToss(h, delay = 0){
    if (this.toss || this.phase !== 'serve') return;
    this.toss = { t0: this.t + Math.max(-.2, Math.min(0, delay)) };
    this.emit({ type: 'toss', player: h.id });
  }
  // mira del servizio: col mouse il punto scelto nel riquadro, col telefono il tempo (in anticipo verso l'esterno)
  serveAim(h, sw, u){
    if (sw.aim){
      const box = this.rally.serveBox(), xMid = (box.x0 + box.x1)/2, xHalf = (box.x1 - box.x0)/2 - .35;
      return Math.max(-1.4, Math.min(1.4, (sw.aim.x - xMid)/xHalf*(h.team === 0 ? 1 : -1)));
    }
    return Math.max(-1, Math.min(1, -u*.8 + (this.rng() - .5)*.5));
  }
  updateToss(){
    const s = this.serverP, tt = this.t - this.toss.t0, b = this.ball, { fz, rx } = axes(s);
    b.p = { x: s.x + rx*.25, y: tossY(tt), z: s.z + fz*.3 }; b.v = { x: 0, y: TOSS.vy - 9.81*tt, z: 0 };
    const sw = s.sw;
    if (sw && this.t >= sw.at){
      s.sw = null;
      const at = Math.max(0, sw.at - this.toss.t0), y = tossY(at);
      const u = (at - TOSS.ideal)/.22;
      if (y < TOSS.lo || y > TOSS.hi || Math.abs(u) > 2.2){
        // racchetta a vuoto sul lancio: è fallo, come nel tennis vero
        this.emit({ type: 'whiff', player: s.id, human: true, serve: true });
        this.phase = 'live'; this.rally.hit(s.team); this.toss = null;
        const res = this.rally.fault('mancata'); if (res && res.fault) this.onFault('mancata'); else if (res) this.endPoint(res);
        return;
      }
      b.p.y = y;
      this.serve(this.serveAim(s, sw, u), { power: sw.power, u });
      this.emit({ type: 'contact', player: s.id, timing: u, label: timingLabel(u, false), power: sw.power, serve: true });
      return;
    }
    if (tt > .5 && b.p.y < TOSS.catchY){ this.toss = null; this.holdBall(); this.emit({ type: 'tossCaught', player: s.id }); }
  }
  judgeHumans(){
    for (const p of this.players){
      if (!p.sw || this.phase !== 'live') continue;
      const res = judgeSwing(p, p.sw, this.hist, this.t);
      if (!res) continue;
      const sw = p.sw; p.sw = null;
      if (res.miss){ if (this.rally.lastHitter !== p.team) this.emit({ type: 'whiff', player: p.id, human: true }); continue; }
      const k = res.k;                                    // la palla torna al punto d'impatto (compensa il ritardo del telefono)
      this.ball.p = { x: k.x, y: k.y, z: k.z }; this.ball.v = { x: k.vx, y: k.vy, z: k.vz };
      const shot = racketShot(this.court, p, this.ball, sw, res.e, this.level);
      this.strike(p, shot, false);
      this.emit({ type: 'contact', player: p.id, timing: shot.timing, label: shot.label, power: shot.power, shot: shot.type });
    }
  }
  record(){
    const b = this.ball, r = this.rally;
    this.hist.push({ t: this.t, x: b.p.x, y: b.p.y, z: b.p.z, vx: b.v.x, vy: b.v.y, vz: b.v.z, lh: r.lastHitter, srv: r.isServe && r.bouncesSinceHit === 0, sh: this.sinceHit });
    while (this.hist.length && this.hist[0].t < this.t - .45) this.hist.shift();
  }
  // posizione automatica (telefono): la palla deve arrivare 45 cm davanti, di lato sul dritto o sul rovescio
  autoSpot(h, plan){
    const { fz, rx } = axes(h);
    if (h.autoSide == null) h.autoSide = (plan.x - h.x)*rx < -1.2 ? -1 : 1;
    return { x: plan.x - rx*h.autoSide*.62, z: plan.z - fz*S0 };
  }

  /* ---------- aggiornamento ---------- */
  update(dt, input = null){
    this.events = []; this.t += dt; this.timer += dt;
    const c = this.court, humans = this.players.filter(p => p.human), human = humans[0];
    // comandi: un solo giocatore (come prima) oppure uno per ogni giocatore vero
    const inputs = input && input.move ? (human ? { [human.id]: input } : {}) : (input || {});
    for (const h of humans){
      const inp = inputs[h.id]; if (!inp) continue;
      h.lastInput = inp;
      const dir = h.team === 0 ? 1 : -1;
      h.tx = h.x + inp.move.x*dir*h.speed*dt*3; h.tz = h.z - inp.move.y*dir*h.speed*dt*3;
      // livello Facile: senza frecce il personaggio va da solo incontro alla palla, a chi gioca resta il tempo del colpo
      const still = Math.abs(inp.move.x) < .05 && Math.abs(inp.move.y) < .05;
      if (still && (this.level.assist || inp.auto) && this.phase === 'live' && this.rally.lastHitter !== h.team){
        h.planT = (h.planT || 0) - dt;
        if (h.planT <= 0){ h.plan = planIntercept(h, this.ball, c, this.rally); h.planT = .12; }
        if (h.plan && inp.auto){ const a = this.autoSpot(h, h.plan); h.tx = a.x; h.tz = a.z; }
        else if (h.plan){ h.tx = h.plan.x + (h.team === 0 ? .35 : -.35); h.tz = h.plan.z + (h.team === 0 ? .3 : -.3); }
      } else if (still && inp.auto && this.phase === 'live'){ this.goHome(h, 1); h.autoSide = null; }
      if (inp.toss && this.phase === 'serve' && this.serverP === h) this.startToss(h, inp.toss.delay || 0);
      if (inp.swing) this.takeSwing(h, inp);
      if (inp.jump && h.y <= 0 && this.phase !== 'serve') h.vy = JUMP_V;
      if (inp.hit){ h.swingBuffer = inp.late ? .45 : .3; h.lobBuffer = !!inp.lob; }   // chi gioca da un altro dispositivo ha un attimo in più
    }
    if (this.phase === 'serve'){
      if (this.serverP.human){
        const s = this.serverP;
        if (this.toss) this.updateToss();
        else if (s.swingBuffer > 0){ s.swingBuffer = 0; this.serve(s.lastInput ? s.lastInput.move.x : 0); }
        else if (this.timer > .05 && !this.serveAnnounced){ this.serveAnnounced = true; this.emit({ type: 'serveReady', human: true, player: s.id, second: this.rally.attempt === 2 }); }
      } else if (this.timer > 1.1) this.serve();
      if (this.phase === 'serve'){ this.movePlayers(dt, true); if (!this.toss) this.holdBall(); }
    } else if (this.phase === 'live'){
      this.serveAnnounced = false;
      this.sinceHit += dt;
      const ev = stepBall(this.ball, dt, c);
      for (const e of ev){
        this.emit(e);
        const res = this.rally.event(e);
        if (res && res.fault){ this.onFault(res.reason); return this.events; }
        if (res && res.let){ this.phase = 'fault'; this.timer = 0; this.emit({ type: 'let' }); return this.events; }
        if (res){ this.endPoint(res); break; }
      }
      if (this.phase === 'live'){
        const b = this.ball.p;
        const gone = Math.abs(b.z) > c.halfL + 14 || Math.abs(b.x) > c.halfW + 12 || this.sinceHit > 7;
        if (gone){ const res = this.rally.lost(); if (res && res.fault) this.onFault(res.reason); else if (res) this.endPoint(res); }
      }
      if (this.phase === 'live'){
        this.record();
        this.thinkAI(dt);
        this.movePlayers(dt, false);
        this.judgeHumans();
        // colpi: prima l'umano (con un piccolo anticipo concesso), poi l'IA
        for (const p of this.players){
          // la palla appena colpita deve viaggiare un attimo: niente botta e risposta a rete tra due giocatori veri
          if (this.phase !== 'live' || !this.rally.canHit(p.team) || this.sinceHit < .22) continue;
          if (p.human){ if (p.swingBuffer > 0 && this.canReach(p)){ p.swingBuffer = 0; this.humanStrike(p, p.lastInput || { move: { x: 0, y: 0 } }); } }
          else if (p.react <= 0 && this.canReach(p) && this.ball.p.y < 2.9 && this.aiWants(p)){
            const opp = this.teamPlayers(1 - p.team);
            if (this.ball.p.y > 2.1 && p.y <= 0) p.vy = JUMP_V*.8;
            this.strike(p, chooseShot(c, p, this.ball, opp, this.rng, this.rally.hits));
          }
        }
      }
    } else if (this.phase === 'point'){
      this.stepBallLoose(dt);
      this.movePlayers(dt, false);
      if (this.timer > 1.5) this.nextPoint();
    } else if (this.phase === 'fault'){
      this.stepBallLoose(dt);
      if (this.timer > 1.0){ this.placeForServe(); this.phase = 'serve'; this.timer = 0; }
    } else if (this.phase === 'over'){
      this.stepBallLoose(dt);
      this.movePlayers(dt, false);
    }
    for (const p of this.players){
      if (p.swingAt != null && this.t >= p.swingAt){ p.swing = .35; p.swingAt = null; }
      p.swing = Math.max(0, p.swing - dt); p.swingBuffer = Math.max(0, p.swingBuffer - dt); p.react -= dt;
    }
    return this.events;
  }
  stepBallLoose(dt){ if (!this.ball.held) stepBall(this.ball, dt, this.court); }
  aiWants(p){ // nel doppio colpisce chi è più vicino alla palla
    const mates = this.teamPlayers(p.team).filter(q => q !== p);
    const b = this.ball.p, d = Math.hypot(b.x - p.x, b.z - p.z);
    return !mates.some(q => (q.human ? false : this.canReach(q)) && Math.hypot(b.x - q.x, b.z - q.z) < d - .01);
  }
  thinkAI(dt){
    const c = this.court, b = this.ball;
    for (const p of this.players){
      if (p.human) continue;
      // la palla viene verso di me: l'ha colpita l'altra squadra (anche il servizio, che va lasciato rimbalzare)
      const incoming = this.rally.state === 'live' && this.rally.lastHitter !== p.team && (sideOf(b.p.z) === p.team || Math.sign(b.v.z) === (p.team === 0 ? 1 : -1));
      if (incoming && p.react <= 0){
        p.planT -= dt;
        if (p.planT <= 0){ p.plan = planIntercept(p, b, c, this.rally); p.planT = .12; }
        // nel doppio va sulla palla solo chi ha il punto d'incontro nella sua metà (o il compagno umano è lontano)
        const mates = this.teamPlayers(p.team).filter(q => q !== p);
        let mine = true;
        if (p.plan && mates.length){
          const q = mates[0], dq = Math.hypot(p.plan.x - q.x, p.plan.z - q.z), dp = Math.hypot(p.plan.x - p.x, p.plan.z - p.z);
          mine = q.human ? Math.sign(p.plan.x) === Math.sign(p.homeX) || dq > 3.5 : dp <= dq;
        }
        if (p.plan && mine){ p.tx = p.plan.x - (p.team === 0 ? -1 : 1)*.15; p.tz = p.plan.z + (p.team === 0 ? .35 : -.35); }
        else this.goHome(p, .5);
      } else if (!incoming) this.goHome(p, 1);
    }
  }
  goHome(p, k){
    const c = this.court, dir = p.team === 0 ? 1 : -1, padel = c.sport === 'padel';
    const depth = padel ? (this.teamPlayers(p.team).length > 1 ? 7.2 : 8) : c.halfL + .6;
    const bx = this.ball.p.x;
    p.tx = p.homeX*.9 + bx*.25*k; p.tz = dir*depth;
  }
  movePlayers(dt, serving){
    const c = this.court, R = c.runoff;
    for (const p of this.players){
      if (serving && (p === this.serverP || p === this.receiverP) && !p.human) continue;
      const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz), step = p.speed*dt;
      if (d > .02){ const k = Math.min(1, step/d); p.x += dx*k; p.z += dz*k; p.moving = Math.min(1, d/.3); } else p.moving = 0;
      // restare nel proprio campo e dentro il recinto
      const dir = p.team === 0 ? 1 : -1;
      p.x = Math.max(-R.x + .3, Math.min(R.x - .3, p.x));
      const zAbs = Math.max(1.1, Math.min(R.z - .3, p.z*dir)); p.z = zAbs*dir;   // non si sta attaccati alla rete
      if (p.y > 0 || p.vy > 0){ p.vy -= GRAV_PLAYER*dt; p.y = Math.max(0, p.y + p.vy*dt); if (p.y === 0) p.vy = 0; }
    }
  }

  /* ---------- fine del punto ---------- */
  onFault(reason){
    this.phase = 'fault'; this.timer = 0;
    this.emit({ type: 'fault', reason, second: this.rally.state === 'serve' && this.rally.attempt === 2 });
    if (this.rally.state === 'over') this.endPoint(this.rally.result);
  }
  endPoint(res){
    if (this.phase === 'point' || this.phase === 'over') return;
    this.stats.rallies++; this.stats.longest = Math.max(this.stats.longest, this.rally.hits);
    if (/vincente|ace/.test(res.reason)) this.stats.winners[res.team]++;
    this.phase = 'point'; this.timer = 0;
    if (this.rallyOnly){ this.emit({ type: 'point', team: res.team, reason: res.reason }); return; }
    const r = awardPoint(this.score, res.team, res.reason);
    this.emit({ type: 'point', team: res.team, reason: res.reason, labels: pointLabels(this.score), games: [...this.score.games] });
    if (r.game) this.emit({ type: 'game', team: res.team, games: [...this.score.games], tiebreak: !!r.tiebreak });
    if (r.startTiebreak) this.emit({ type: 'tiebreak' });
    if (r.match){ this.phase = 'over'; this.emit({ type: 'match', winner: res.team, games: [...this.score.games] }); }
  }
  nextPoint(){ if (this.phase !== 'over') this.setupPoint(); }
  emit(e){ this.events.push(e); }
}
