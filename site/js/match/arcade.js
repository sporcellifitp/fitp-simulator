// Motore arcade di NATPF Simulator: regole e fisica condivise con core.js, input di gioco solo dal telefono.
//  - il personaggio si muove da solo verso la palla: il giocatore controlla gesto, timing e scelta del colpo;
//  - la direzione calibrata dello swing sceglie sinistra/centro/destra; il timing influisce su precisione, ritmo e rischio;
//  - tra gli swing vicini (apertura, impatto, ritorno del braccio) vale quello più vicino al momento d'impatto;
//  - quando il colpo manca, il gioco spiega se è arrivato presto, tardi, debole o fuori portata;
//  - il ritardo del telefono/rete è compensato dalla cronologia della palla e dalla finestra di attesa del colpo.
// Senza Three.js: testabile con node --test.
import { CONTACT, contactAxes, relativeContact, contactLabel, evaluateContact, crossingTime, isSmashContact } from './contact.js';
import { MatchCore } from './core.js';
import { stepBall, predict, sideOf } from './physics.js';
import { makeShot, shotTarget, gauss } from './ai.js';
import { gestureAim, executionQuality } from './shot-quality.js';

export const ARC = {
  S0: CONTACT.forward,                // punto d'impatto: zona della racchetta davanti al corpo
  SIDE: CONTACT.side,              // la palla passa a 70 cm dal corpo, sul lato del dritto o del rovescio
  REACH: CONTACT.reach,            // portata laterale con l'allungo
  EARLY: CONTACT.early, LATE: CONTACT.late, // finestra del colpo attorno all'istante giusto (secondi)
  PERFECT: CONTACT.perfect, GOOD: CONTACT.good,
  REWIND: .8,           // quanto la palla può tornare indietro al momento dell'impatto
  SPEED: 6.0,            // corsa automatica (m/s), dopo un attimo di reazione (REACT)
  REACT: .18,
  TOSS: { y0: 1.45, vy: 5.1 },
  HIST: .9,
};
// err: errori gratuiti per colpo; attack: probabilità di attaccare quando la palla gli arriva debole o fuori tempo
export const CPU = {
  facile:  { label: 'Facile',  err: .085, spread: .22, pace: [.66, .78], attack: 0, attackPace: [.66, .78], speed: 6.2, reaction: .3, pressure: .05, lobRate: 0, dropRate: 0, sliceRate: 0, angle: .16 },
  normale: { label: 'Normale', err: .045, spread: .26, pace: [.8, .95],  attack: .35, attackPace: [1.05, 1.2], speed: 6.8, reaction: .22, pressure: .04, lobRate: .2,  dropRate: .1,  sliceRate: .13, angle: .7 },
  esperto: { label: 'Esperto', err: .035, spread: .2,  pace: [.88, 1.02], attack: .43, attackPace: [1.12, 1.3], speed: 7.3, reaction: .16, pressure: .065, lobRate: .28, dropRate: .15, sliceRate: .18, angle: 1 },
};

export function chooseCpuShotType(nearNet, level, rng){
  if (level === CPU.facile) return 'drive';
  // Variety stays purposeful: punish a player at net with a lob, a deep defender with a drop,
  // and mix in slices. A weak incoming ball can still override this with an attacking drive.
  if (nearNet && rng() < level.lobRate) return 'lob';
  if (!nearNet && rng() < level.dropRate) return 'drop';
  if (rng() < level.sliceRate) return 'slice';
  return 'drive';
}
export const LOCOMOTION = Object.freeze({
  lunge: { duration: .22, recovery: .36, speed: 1.4 },
  dive: { duration: .34, recovery: .7, speed: 1.65 },
});
const readyMotion = () => ({ state: 'ready', dirX: 0, dirZ: 0, progress: 0 });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const axes = contactAxes;
export const rel = relativeContact;
export const tossY = t => ARC.TOSS.y0 + ARC.TOSS.vy*t - 4.905*t*t;
export const TOSS_APEX = ARC.TOSS.vy/9.81;
export const timingLabel = contactLabel;
export { isSmashContact } from './contact.js';

// L'intenzione arriva dal gesto; tempo ed equilibrio determinano quanto bene la si esegue.
export function arcadeShot(court, p, ball, sw, e){
  const q = Math.abs(e), r = rel(p, ball.p), fore = r.l >= 0;
  const power = clamp(Number.isFinite(sw.power) ? sw.power : .6, .2, 1), lift = clamp(sw.lift ?? 0, -1, 1);
  let type = 'drive';
  if (isSmashContact(ball.p)) type = 'smash';
  else if (sw.drop) type = 'drop';
  else if (sw.lob || lift >= .7) type = 'lob';
  else if (sw.slice || lift <= -.65) type = 'slice';
  const execution = executionQuality(p, ball, e), { quality, balance } = execution;
  const intendedAim = gestureAim(sw);
  // La precisione apre gli angoli. Il gesto impreciso conserva il lato intenzionale,
  // ma restituisce una palla più centrale e attaccabile.
  const aimX = intendedAim*(.45 + .55*quality);
  const over = Math.max(0, q - ARC.GOOD);
  const depth = type === 'drop' ? .08 : type === 'lob' ? .8 + .18*quality : type === 'slice' ? .48 + .28*quality : .32 + .52*power + .13*quality + over*2.5;
  const target = shotTarget(court, p.team, aimX, depth, type);
  // Una smorzata in allungo/fuori tempo galleggia più lunga: non basta indebolire un gesto.
  if (type === 'drop') target.z *= 1 + (1 - quality)*1.4;
  const risk = Math.abs(intendedAim)*(1 - quality)*.15 + Math.max(0, power - .9)*(1 - quality);
  const error = .055 + (1 - quality)*.36 + (1 - balance)*.12 + risk + over*2;
  const pace = type === 'lob' ? .86 + .12*quality : type === 'drop' ? .84 + .13*quality : type === 'slice' ? .76 + .12*power + .12*quality : .64 + .43*power + .26*quality;
  const clearance = type === 'lob' ? 1.4 : type === 'smash' ? .2 : type === 'drop' ? .28 + (1 - quality)*.24 : type === 'slice' ? .22 : .4 + .22*Math.max(0, lift) + (1 - balance)*.12 - over*2.5;
  return { type, target, error, clearance, pace, label: timingLabel(e), power, fore,
    intendedAim, executedAim: aimX, ...execution };
}

export class ArcadeMatch extends MatchCore {
  // teams come in MatchCore; per i giocatori veri: { human: true, id, name, grace } (grace: attesa del colpo, secondi)
  constructor(o){
    super({ ...o, sport: 'tennis', level: 'facile' });
    this.cpu = CPU[o.cpu] || CPU.facile;
    for (const p of this.players){
      if (p.human){ Object.assign(p, { speed: ARC.SPEED, reach: ARC.REACH, grace: o.teams[p.team][p.idx].grace ?? .1, auto: true }); }
      else Object.assign(p, { speed: this.cpu.speed, reaction: this.cpu.reaction, skill: .6 });
      Object.assign(p, { swings: [], anim: null, inc: null, pend: null, crossedAt: null, done: false, locomotion: readyMotion(), motionUntil: 0, recoverUntil: 0 });
    }
    this.hist = []; this.shadow = null; this.deferred = null; this.toss = null; this.lastQuality = null;
  }
  humans(){ return this.players.filter(p => p.human); }
  setupPoint(){
    super.setupPoint();
    this.hist = []; this.toss = null; this.shadow = null; this.deferred = null;
    for (const p of this.players || []) Object.assign(p, { swings: [], inc: null, pend: null, crossedAt: null, done: false, locomotion: readyMotion(), motionUntil: 0, recoverUntil: 0 });
  }

  /* ---------- comandi ---------- */
  // Il motore accetta solo gesto e lancio. Anche gli input remoti non possono spostare il personaggio.
  update(dt, input = null){
    this.events = []; this.t += dt; this.timer += dt;
    const hs = this.humans();
    const inputs = input && (input.move || input.swings || input.toss) ? (hs[0] ? { [hs[0].id]: input } : {}) : (input || {});
    for (const h of hs){
      const inp = inputs[h.id]; if (!inp) continue;
      h.auto = true;
      if (inp.toss) this.startToss(h, inp.toss.delay || 0);
      for (const s of inp.swings || []) this.addSwing(h, s);
    }

    if (this.phase === 'serve'){
      const s = this.serverP;
      if (s.human){
        if (this.toss) this.updateToss();
        else if (this.timer > .05 && !this.serveAnnounced){ this.serveAnnounced = true; this.emit({ type: 'serveReady', human: true, player: s.id, second: this.rally.attempt === 2 }); }
      } else if (this.timer > 1.2) this.cpuServe();
      if (this.phase === 'serve'){ this.movePlayers(dt, true); if (!this.toss) this.holdBall(); }
    } else if (this.phase === 'live'){
      this.serveAnnounced = false; this.sinceHit += dt;
      for (const e of stepBall(this.ball, dt, this.court)){
        this.emit(e);
        const res = (this.shadow || this.rally).event(e);
        if (res) this.outcome(res);
        if (this.phase !== 'live') break;
      }
      if (this.phase === 'live'){
        const b = this.ball.p, c = this.court;
        if (Math.abs(b.z) > c.halfL + 14 || Math.abs(b.x) > c.halfW + 12 || this.sinceHit > 7){ const res = (this.shadow || this.rally).lost(); if (res) this.outcome(res); }
      }
      if (this.phase === 'live'){
        this.thinkAI(dt);
        this.movePlayers(dt, false);
        this.record();
        for (const h of hs) this.contact(h, dt);
        this.cpuStrike();
      }
    } else if (this.phase === 'point'){
      this.stepBallLoose(dt); this.movePlayers(dt, false);
      if (this.timer > 1.6) this.nextPoint();
    } else if (this.phase === 'fault'){
      this.stepBallLoose(dt);
      if (this.timer > 1.0){ this.placeForServe(); this.phase = 'serve'; this.timer = 0; this.toss = null; }
    } else if (this.phase === 'over'){ this.stepBallLoose(dt); this.movePlayers(dt, false); }
    for (const p of this.players){ p.swing = Math.max(0, p.swing - dt); p.react -= dt; }
    return this.events;
  }
  // esito di un evento della palla: se un giocatore vero sta ancora per colpire, il punto aspetta
  outcome(res){
    if (this.shadow){ if (!this.deferred) this.deferred = res; return; }
    if (res.fault) this.onFault(res.reason);
    else if (res.let){ this.phase = 'fault'; this.timer = 0; this.emit({ type: 'let' }); }
    else this.endPoint(res);
  }
  addSwing(h, s){
    if (!s || (s.delay != null && !Number.isFinite(s.delay)) || (s.delay || 0) > .04 || (s.delay || 0) < -ARC.REWIND) return;
    const sw = { power: .6, lift: 0, lob: false, aim: null, dir: null, ...s, at: this.t + (s.delay || 0) };
    delete sw.delay;
    if (this.phase === 'serve' && this.serverP === h){
      if (!this.toss){ this.startToss(h, s.delay || 0); return; }       // il primo movimento lancia la palla
      if (sw.at - this.toss.t0 < .25) return;                             // fa ancora parte del lancio
    }
    h.swings.push(sw);
    while (h.swings.length && h.swings[0].at < this.t - 1.2) h.swings.shift();
    // l'animazione passa dal punto d'impatto nell'istante dello swing (o subito, se lo swing è già passato)
    const side = h.inc ? h.inc.side : 'fh';
    h.anim = { kind: this.phase === 'serve' ? 'serve' : this.ball.p.y > 2.1 && h.inc ? 'smash' : 'swing', side, at: Math.max(sw.at, this.t - .05), dir: sw.dir };
    this.emit({ type: 'swing', player: h.id, power: sw.power });
  }

  /* ---------- servizio ---------- */
  startToss(h, delay = 0){
    if (this.phase !== 'serve' || this.serverP !== h || this.toss) return;
    this.toss = { t0: this.t + clamp(delay, -.2, 0) };
    h.anim = { kind: 'toss', at: this.toss.t0 };
    this.emit({ type: 'toss', player: h.id });
  }
  updateToss(){
    const s = this.serverP, T = this.toss, tt = this.t - T.t0, b = this.ball, { fz, rx } = axes(s);
    b.p = { x: s.x + rx*.3, y: tossY(tt), z: s.z + fz*.25 }; b.v = { x: 0, y: ARC.TOSS.vy - 9.81*tt, z: 0 }; b.held = false;
    const Tc = T.t0 + TOSS_APEX;                                          // si colpisce in cima al lancio
    const cand = s.swings.filter(w => w.at >= Tc - .45 && w.at <= Tc + .35);
    const best = cand.reduce((a, w) => !a || Math.abs(w.at - Tc) < Math.abs(a.at - Tc) ? w : a, null);
    if (best && (best.at >= Tc - .1 || this.t >= Tc + s.grace + .03)){
      const e = best.at - Tc; s.swings = [];
      b.p.y = tossY(clamp(best.at - T.t0, .25, 1.1));
      this.serveShot(s, { power: best.power, e, aim: best.aim, dir:best.dir });
      return;
    }
    if (tt > .6 && b.p.y < 1.0){
      // lancio non colpito: nessuna penalità, si rilancia (come in Switch Sports)
      const early = s.swings.some(w => w.at < Tc - .45), late = s.swings.some(w => w.at > Tc + .35);
      this.toss = null; s.swings = []; this.holdBall(); s.anim = null;
      this.emit({ type: 'tossCaught', player: s.id, why: early ? 'presto' : late ? 'tardi' : 'nessuno' });
    }
  }
  // servizio con potenza e tempo: in tempo è sempre buono e più veloce, molto fuori tempo può finire in rete o lungo
  serveShot(s, { power = .6, e = 0, aim = null, dir = null }){
    const c = this.court, r = this.rally, box = r.serveBox(), second = r.attempt === 2, q = Math.abs(e), u = clamp(e/.2, -1.5, 1.5);
    const xMid = (box.x0 + box.x1)/2, xHalf = (box.x1 - box.x0)/2 - .4, side = s.team === 0 ? 1 : -1;
    const ax = Number.isFinite(aim) ? clamp(aim,-1,1) : aim && Number.isFinite(aim.x) ? clamp((aim.x - xMid)/xHalf*side,-1,1) : dir != null ? gestureAim({dir}) : clamp(u*.7 + (this.rng() - .5)*.4,-1,1);
    let tx = xMid + side*ax*xHalf, tz = Math.sign(box.z0 + box.z1)*(c.serviceZ - (second ? 1.2 : .8));
    let error = .12 + (q > ARC.GOOD ? (q - ARC.GOOD)*1.5 : 0);
    if (q > .2 && this.rng() < .5){ if (this.rng() < .5) tz = Math.sign(tz)*(c.serviceZ + 1.2); else error += .6; }   // servizio sbagliato
    const pace = .7 + .5*Math.min(power, second ? .65 : 1) + (q <= ARC.PERFECT ? .12 : 0);
    const from = { x: this.ball.p.x, y: Math.max(2.1, this.ball.p.y), z: this.ball.p.z };
    const shot = makeShot(c, from, { x: tx, z: tz }, 'serve', error, this.rng, q > .2 ? .05 : .35, pace);
    this.launchServe(s, from, shot.v);
    if (s.human) this.emit({ type: 'contact', player: s.id, timing: e, label: timingLabel(e), power, serve: true, shot: 'serve' });
  }
  launchServe(s, from, v){
    const b = this.ball; b.held = false; b.p = { ...from }; b.v = { ...v }; b.rolling = false; b.stopped = false;
    this.rally.hit(s.team); this.toss = null;
    this.phase = 'live'; this.sinceHit = 0; this.lastHitter = s; this.hist = [];
    const speed=Math.hypot(v.x,v.y,v.z)||1;
    s.anim={kind:'serve',side:'fh',at:this.t,hit:true,point:{...from},out:{x:v.x/speed,y:v.y/speed,z:v.z/speed}};
    for (const p of this.players) Object.assign(p, { swings: p === s ? [] : p.swings, inc: null, pend: null, crossedAt: null, done: false });
    if (!s.human) s.swing = .35;
    this.emit({ type: 'hit', team: s.team, player: s.id, shot: 'serve', human: s.human });
  }
  cpuServe(){
    const s = this.serverP, { fz, rx } = axes(s);
    this.ball.p = { x: s.x + rx*.3, y: 2.6, z: s.z + fz*.25 };
    s.anim = { kind: 'serve', at: this.t };
    this.serveShot(s, { power: this.cpu === CPU.facile ? .25 : .45, e: gauss(this.rng)*.05 });
  }

  /* ---------- colpi del giocatore vero ---------- */
  movePlayers(dt, serving){
    const R = this.court.runoff;
    for (const p of this.players){
      const dx = p.tx - p.x, dz = p.tz - p.z, distance = Math.hypot(dx, dz);
      const motion = p.locomotion || (p.locomotion = readyMotion());
      const target = p.inc || p.plan, eta = target ? (target.Tc ?? this.t + target.t) - this.t : Infinity;
      const incoming = !serving && this.phase === 'live' && this.rally.lastHitter !== p.team && !p.done;
      const urgent = incoming && eta > 0 && eta < .7 && distance > .65 && distance/Math.max(.01,p.speed) > eta - .08;
      if ((motion.state === 'dive' || motion.state === 'lunge') && this.t >= p.motionUntil){
        p.recoverUntil = this.t + LOCOMOTION[motion.state].recovery;
        Object.assign(motion, { state: 'recover', progress: 0 });
        p.motionStart = this.t;
      } else if (motion.state === 'recover' && this.t >= p.recoverUntil){
        Object.assign(motion, readyMotion());
      }
      if (motion.state !== 'recover' && motion.state !== 'dive' && motion.state !== 'lunge'){
        if (urgent){
          const state = distance > 2.2 && distance/Math.max(.01,p.speed) > eta ? 'dive' : 'lunge';
          p.motionStart = this.t; p.motionUntil = this.t + LOCOMOTION[state].duration;
          Object.assign(motion, { state, progress: 0 });
        } else Object.assign(motion, { state: distance > .08 ? 'run' : 'ready', progress: 0 });
      }
      if (motion.state === 'dive' || motion.state === 'lunge') motion.progress = clamp((this.t - p.motionStart)/LOCOMOTION[motion.state].duration,0,1);
      if (motion.state === 'recover') motion.progress = clamp((this.t - p.motionStart)/Math.max(.01,p.recoverUntil - p.motionStart),0,1);
      const multiplier = LOCOMOTION[motion.state]?.speed ?? (motion.state === 'recover' ? .4 : 1);
      const step = Math.max(0,p.speed)*multiplier*Math.max(0,dt);
      const beforeX = p.x, beforeZ = p.z;
      if (distance > .02){ const k = Math.min(1,step/distance); p.x += dx*k; p.z += dz*k; }
      p.x = clamp(p.x, -R.x + .3, R.x - .3);
      const sign = p.team === 0 ? 1 : -1;
      p.z = clamp(p.z*sign,1.1,R.z-.3)*sign;
      p.vx = dt > 0 ? (p.x-beforeX)/dt : 0; p.vz = dt > 0 ? (p.z-beforeZ)/dt : 0;
      const actual = Math.hypot(p.vx,p.vz);
      p.moving = clamp(actual/Math.max(.01,p.speed),0,1);
      if (actual > .01 && motion.state !== 'recover') { motion.dirX = p.vx/actual; motion.dirZ = p.vz/actual; }
      if (motion.state === 'ready') { motion.dirX = 0; motion.dirZ = 0; }
    }
  }
  record(){
    const b = this.ball;
    const players = Object.fromEntries(this.players.map(p => [p.id, { x: p.x, z: p.z, team: p.team, vx: p.vx || 0, vz: p.vz || 0, eligible: this.legalFor(p) }]));
    if (this.hist.at(-1)?.t === this.t) this.hist.pop();
    this.hist.push({ t: this.t, p: { ...b.p }, v: { ...b.v }, players });
    while (this.hist.length && this.hist[0].t < this.t - ARC.HIST) this.hist.shift();
  }
  histAt(t){
    const H = this.hist; if (!H.length || t < H[0].t - .01) return null;
    if (t <= H[0].t) return H[0];
    if (t >= H.at(-1).t) return H.at(-1);
    for (let i = H.length - 1; i > 0; i--) if (H[i - 1].t <= t){
      const a = H[i - 1], b = H[i], k = (t - a.t)/Math.max(1e-6, b.t - a.t), L = (x, y) => x + (y - x)*k;
      const players = Object.fromEntries(Object.entries(a.players).map(([id, p]) => {
        const q = b.players[id]; return [id, { ...p, x: L(p.x, q.x), z: L(p.z, q.z), vx: L(p.vx, q.vx), vz: L(p.vz, q.vz) }];
      }));
      return { t, players, p: { x: L(a.p.x, b.p.x), y: L(a.p.y, b.p.y), z: L(a.p.z, b.p.z) }, v: { x: L(a.v.x, b.v.x), y: L(a.v.y, b.v.y), z: L(a.v.z, b.v.z) } };
    }
    return null;
  }
  swingContact(h, at){
    const k = this.histAt(at), p = k?.players[h.id];
    return p ? evaluateContact({ ball: k.p, velocity: k.v, player: p, eligible: p.eligible }) : null;
  }
  legalFor(h){ const r = this.shadow || this.rally; return !h.done && r.state === 'live' && r.lastHitter !== h.team && !(r.isServe && r.bouncesSinceHit === 0) && this.sinceHit > .2; }
  contact(h, dt){
    if (this.phase !== 'live') return;
    const r = this.rally, incoming = r.lastHitter !== h.team && r.state === 'live';
    if (!incoming){ h.inc = null; return; }
    // La previsione è già aggiornata in thinkAI(), prima del movimento.
    // la palla passa davanti al giocatore: inizia l'attesa del colpo
    if (!h.pend && !h.done && this.legalFor(h) && sideOf(this.ball.p.z) === h.team){
      const H = this.hist, k = H[H.length - 1], k0 = H[H.length - 2];
      const rr = rel(h, k.p);
      if (rr.s <= ARC.S0 && rr.s > -1.2){
        const Tc = crossingTime(k0, k, h.id);
        if (h.crossedAt == null) h.crossedAt = Tc;
        if (Math.abs(rr.l) <= ARC.REACH && k.p.y >= .1 && k.p.y <= 3.1){
          h.pend = { Tc: h.crossedAt, side: rr.l >= 0 ? 'fh' : 'bh' };
          if (!this.shadow){ this.shadow = Object.assign(Object.create(Object.getPrototypeOf(r)), r); this.deferred = null; }
        } else if (Math.abs(rr.l) > ARC.REACH || rr.s < -.2) { h.done = true; this.emit({ type: 'miss', player: h.id, why: 'portata', human: true }); }
      }
    }
    if (h.pend){
      // A runner can stay alongside the ball after its first plane crossing.
      // Keep the delivery grace open from the last genuinely playable frame,
      // never from a second bounce or another already-invalid rally state.
      const cue = evaluateContact({ ball: this.ball.p, velocity: this.ball.v, player: h, eligible: this.legalFor(h) });
      if (cue.ready) h.pend.lastReadyAt = this.t;
      this.resolve(h);
    }
  }
  resolve(h){
    const P = h.pend, now = this.t;
    const cand = h.swings.filter(w => w.at <= now && now - w.at <= ARC.REWIND && (w.at >= P.Tc - ARC.EARLY && w.at <= P.Tc + ARC.LATE || this.swingContact(h, w.at)?.perfect));
    const best = cand.reduce((a, w) => !a || Math.abs(w.at - P.Tc) < Math.abs(a.at - P.Tc) ? w : a, null);
    if (best && (best.at >= P.Tc - .1 || now >= P.Tc + h.grace + .03)){
      const sample = this.swingContact(h, best.at);
      // A green frame is judged by exactly the same historic geometry. Buffered
      // early/late swings keep the crossing-based grading outside the sweet spot.
      const e = sample?.perfect ? sample.error : best.at - P.Tc;
      const tc = Math.max(now - ARC.REWIND, sample?.perfect ? best.at : clamp(best.at, P.Tc - ARC.PERFECT, Math.min(now, P.Tc + ARC.PERFECT)));
      const k = this.histAt(tc) || { p: { ...this.ball.p }, v: { ...this.ball.v } };
      this.ball.p = { ...k.p }; this.ball.v = { ...k.v };
      h.swings = h.swings.filter(w => w.at > best.at + .05);
      h.pend = null; h.done = true; h.inc = null;
      const shot = arcadeShot(this.court, { ...h, ...k.players?.[h.id] }, this.ball, best, e);
      this.shadow = null; this.deferred = null;
      // Judge the historic contact, but show its feedback now. A delayed packet
      // must not put the entire follow-through in the past before it is drawn.
      h.anim = { kind: shot.type, side: shot.fore ? 'fh' : 'bh', at: now, hit: true };
      this.lastQuality = { label: shot.label, power: shot.power, quality: shot.quality, balance: shot.balance };
      this.strike(h, shot, false);
      this.emit({ type: 'contact', player: h.id, timing: e, at: tc, label: shot.label, power: shot.power, shot: shot.type, side: shot.fore ? 'fh' : 'bh' });
      return;
    }
    if (now >= Math.max(P.Tc + ARC.LATE, P.lastReadyAt || P.Tc) + h.grace){
      const early = h.swings.some(w => w.at < P.Tc - ARC.EARLY && w.at > P.Tc - 1), late = h.swings.some(w => w.at > P.Tc + ARC.LATE);
      h.pend = null; h.done = true; h.inc = null;
      this.emit({ type: 'miss', player: h.id, why: early ? 'presto' : late ? 'tardi' : 'nessuno', human: true });
      // nessun colpo: il punto riprende da dove era rimasto
      const sh = this.shadow, d = this.deferred; this.shadow = null; this.deferred = null;
      if (sh) this.rally = sh;
      if (d) this.outcome(d);
    }
  }
  // dove e quando colpire: dopo il rimbalzo a un'altezza comoda se si fa in tempo, altrimenti il primo punto raggiungibile
  predictContact(h){
    const r = this.shadow || this.rally, { fz, rx } = axes(h), samples = predict(this.ball, this.court, 3, 1/60);
    let best = null, fallback = null, leastEffort = null;
    for (const k of samples){
      const bounces = r.bouncesSinceHit + k.bounces;
      if (bounces >= 2) break;
      if (sideOf(k.z) !== h.team || k.y < .3 || k.y > 2.8 || r.isServe && bounces === 0) continue;
      const side = h.autoSide || ((k.x-h.x)*rx >= -.3 ? 1 : -1);
      const sx = k.x-rx*side*ARC.SIDE, sz = k.z-fz*ARC.S0;
      const distance = Math.hypot(sx-h.x,sz-h.z);
      const wait = Math.max(0,(h.reactT||0)-this.t,h.react||0);
      const reachable = distance <= Math.max(0,k.t-wait)*Math.max(0,h.speed) + .3;
      const c = { Tc: this.t+k.t, t:k.t, x:k.x,y:k.y,z:k.z,sx,sz,side:side>0?'fh':'bh',reachable };
      const effort = distance-Math.max(0,k.t-wait)*Math.max(0,h.speed);
      if (!leastEffort || effort < leastEffort.effort) leastEffort = { c, effort };
      if (reachable && bounces === 0 && isSmashContact(k) && k.vy < -.5){ best=c;break; }
      if (reachable && bounces === 1 && k.y <= 1.55 && k.vy < .5){ best=c;break; }
      if (reachable && !fallback) fallback=c;
    }
    const c = best || fallback || leastEffort?.c || null;
    if (c && h.autoSide == null) h.autoSide=c.side==='fh'?1:-1;
    return c;
  }
  // Stessa previsione fisica per entrambe le squadre; nessun input manuale cambia il bersaglio.
  thinkAI(dt){
    for (const p of this.players){
      if (p.human) p.auto=true;
      const incoming = this.rally.state==='live' && this.rally.lastHitter!==p.team;
      if (incoming && !p.done && !p.pend){
        p.planT=(p.planT||0)-dt;
        if (p.planT<=0 || !p.inc){ p.inc=this.predictContact(p);p.planT=.06; }
        p.plan=p.inc;
        if (this.t >= (p.reactT||0) && p.react<=0 && p.inc){p.tx=p.inc.sx;p.tz=p.inc.sz;}
      } else if (!incoming){this.goHome(p,1);p.inc=null;p.plan=null;p.autoSide=null;}
    }
  }
  strike(p, shot, anim = true){
    super.strike(p, shot, anim);
    if (p.anim){ const speed = Math.hypot(this.ball.v.x,this.ball.v.y,this.ball.v.z)||1; Object.assign(p.anim,{ hit:true, point:{...this.ball.p}, out:Object.fromEntries(Object.entries(this.ball.v).map(([key,v])=>[key,v/speed])) }); }
    this.hist = [];
    for (const q of this.players) if (q.team !== p.team) Object.assign(q, { inc: null, pend: null, crossedAt: null, done: false, autoSide: null, reactT: this.t + ARC.REACT });
  }

  /* ---------- computer ---------- */
  cpuStrike(){
    for (const p of this.players){
      if (p.human || this.phase !== 'live' || !this.rally.canHit(p.team) || this.sinceHit < .22) continue;
      if (p.react > 0 || !this.canReach(p) || this.ball.p.y > 2.9 || !this.aiWants(p)) continue;
      const shot = this.cpuShot(p);
      if (isSmashContact(this.ball.p)){
        // Una palla alta è uno smash anche per la CPU: mantieni bersaglio, traiettoria e posa coerenti.
        const factor = p.team === 0 ? 1 : -1;
        const aimX = shot.target ? clamp(shot.target.x/(factor*(this.court.halfW - .75)), -1, 1) : 0;
        shot.type = 'smash';
        shot.target = shotTarget(this.court, p.team, aimX, .88, 'smash');
        shot.error = this.cpu.spread;
        shot.clearance = .25;
        shot.pace = Math.max(1.08, shot.pace);
      }
      p.anim = { kind: shot.type, side: rel(p, this.ball.p).l >= 0 ? 'fh' : 'bh', at: this.t, hit: true };
      this.strike(p, shot);
    }
  }
  // il computer tiene lo scambio: mira dentro il campo con margine, ritmo moderato; sbaglia ogni tanto, di più sotto pressione
  cpuShot(p){
    const L = this.cpu, rng = this.rng, c = this.court, opp = this.players.filter(q => q.team !== p.team);
    const ox = opp.reduce((s, o) => s + o.x, 0)/Math.max(1, opp.length), side = p.team === 0 ? 1 : -1;
    const beginner = L === CPU.facile;
    let aimX = beginner ? (rng()*2-1)*L.angle : -Math.sign(ox*side || (rng()-.5))*(.35+rng()*.55)*L.angle;
    if (!beginner && rng()<.25) aimX=(rng()*2-1)*.5*L.angle;
    let pace = L.pace[0] + rng()*(L.pace[1] - L.pace[0]), depth = .55 + rng()*.33, type = 'drive';
    const lq = this.lastQuality, strong = lq && (lq.quality ?? (lq.label === 'perfetto' ? 1 : .5)) > .8 && lq.power > .7, weak = lq && ((lq.quality ?? (lq.label === 'perfetto' ? 1 : .5)) < .55 || lq.power < .45);
    const nearNet = opp.some(o => Math.abs(o.z) < c.serviceZ*.72);
    // La CPU varia il colpo in base alla posizione avversaria: lob contro chi sale, smorzata contro chi resta lontano.
    // I livelli più alti usano più spesso la varietà, ma mantengono una quota di drive leggibili.
    type = chooseCpuShotType(nearNet, L, rng);
    // Pressione leggibile: colpo forte, palla veloce e impatto vicino al limite di portata.
    // La durata non altera errori o decisioni: pressione e campo libero creano il punto.
    const reachRatio = Math.hypot(this.ball.p.x - p.x, this.ball.p.z - p.z)/Math.max(.1, p.reach || 1.25);
    const executionStress = Math.max(0, reachRatio - .55);
    const executionError = Math.min(.15, executionStress*.24 + (p.moving > .65 ? .02 : 0));
    const pressure = (strong ? L.pressure : 0) + Math.min(.05, Math.hypot(this.ball.v.x, this.ball.v.z)/500) + executionError*.4;
    const openCourt = Math.abs(ox)/c.halfW;
    // Palla debole o avversario spostato: un attacco può chiudere per geometria e velocità.
    if (!beginner && rng() < Math.min(.85,(weak ? L.attack : L.attack*.4)+openCourt*.22)){
      type = 'drive'; aimX = -Math.sign(ox*side || (rng() - .5))*(.9 + rng()*.3);
      pace = L.attackPace[0] + rng()*(L.attackPace[1] - L.attackPace[0]); depth = .7 + rng()*.25;
    } else if (type === 'lob'){
      depth = .92; pace *= .9;
    } else if (type === 'drop'){
      depth = .08; pace *= .68;
    } else if (type === 'slice'){
      depth = .62; pace *= .8;
    }
    const target = shotTarget(c, p.team, aimX, depth, type);
    this.lastQuality = null;
    if (rng() < L.err + pressure){
      const t = rng() < .5 ? { x: target.x, z: Math.sign(target.z)*.3 } : rng() < .5 ? { x: target.x, z: Math.sign(target.z)*(c.halfL + 1.2) } : { x: Math.sign(target.x || 1)*(c.halfW + 1), z: target.z };
      return { type, target: t, error: .2 + executionError, clearance: t.z === Math.sign(target.z)*.3 ? -.3 : type === 'lob' ? .8 : .4, pace };
    }
    const clearance = type === 'lob' ? 1.35 : type === 'drop' ? .32 : type === 'slice' ? .22 : .55;
    return { type, target, error: L.spread + executionError + (type === 'drop' ? .14 : type === 'slice' ? .06 : 0), clearance, pace };
  }
}

