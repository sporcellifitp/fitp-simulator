// Partita arcade di «Racchetta»: stesse regole, punteggio e fisica della palla della partita base (core.js), ma il colpo
// funziona come nei giochi di tennis con il controller di movimento (Wii Sports, Nintendo Switch Sports):
//  - il personaggio si muove da solo verso la palla; chi gioca pensa solo a quando colpire;
//  - conta il tempo dello swing rispetto all'istante in cui la palla passa davanti al giocatore, con una finestra larga;
//    in anticipo la palla va incrociata, in ritardo lungolinea, come in Switch Sports (dritto: anticipo → sinistra);
//  - si giudica la palla, non lo swing: tra più movimenti vicini (apertura, colpo, ritorno del braccio) vale quello più
//    vicino all'istante giusto; gli altri si ignorano. Se non arriva nessun colpo buono si dice perché (presto, tardi, niente);
//  - ritardo del telefono e della rete: si aspetta il colpo fino a «grace» secondi dopo il passaggio della palla, e la palla
//    riparte dal punto in cui era al momento dello swing (al massimo 0,16 s indietro). Intanto il punto non si chiude.
// Senza Three.js: testabile con node --test.
import { MatchCore } from './core.js';
import { stepBall, predict, sideOf } from './physics.js';
import { makeShot, shotTarget, gauss } from './ai.js';

export const ARC = {
  S0: .4,                // punto d'impatto: 40 cm davanti al corpo
  SIDE: .7,              // la palla passa a 70 cm dal corpo, sul lato del dritto o del rovescio
  REACH: 2.0,            // portata laterale con l'allungo
  EARLY: .28, LATE: .22, // finestra del colpo attorno all'istante giusto (secondi)
  PERFECT: .06, GOOD: .12,
  REWIND: .16,           // quanto la palla può tornare indietro al momento dell'impatto
  SPEED: 6.0,            // corsa automatica (m/s), dopo un attimo di reazione (REACT)
  REACT: .18,
  TOSS: { y0: 1.45, vy: 5.1 },
  HIST: .9,
};
// err: errori gratuiti per colpo; attack: probabilità di attaccare quando la palla gli arriva debole o fuori tempo
export const CPU = {
  facile:  { label: 'Facile',  err: .055, spread: .3,  pace: [.72, .84], attack: .25, attackPace: [1, 1.12], speed: 6.2, reaction: .3,  pressure: .05 },
  normale: { label: 'Normale', err: .045, spread: .26, pace: [.8, .95],  attack: .35, attackPace: [1.05, 1.2], speed: 6.8, reaction: .22, pressure: .04 },
  esperto: { label: 'Esperto', err: .035, spread: .2,  pace: [.88, 1.02], attack: .43, attackPace: [1.12, 1.3], speed: 7.3, reaction: .16, pressure: .065 },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const axes = p => ({ fz: p.team === 0 ? -1 : 1, rx: p.team === 0 ? 1 : -1 });
// la palla vista dal giocatore: s avanti (verso la rete), l a destra (lato del dritto), h altezza
export const rel = (p, b) => { const { fz, rx } = axes(p); return { s: (b.z - p.z)*fz, l: (b.x - p.x)*rx, h: b.y }; };
export const tossY = t => ARC.TOSS.y0 + ARC.TOSS.vy*t - 4.905*t*t;
export const TOSS_APEX = ARC.TOSS.vy/9.81;
export function timingLabel(e){ const q = Math.abs(e); return q <= ARC.PERFECT ? 'perfetto' : q <= ARC.GOOD ? 'buono' : e < 0 ? 'anticipo' : 'ritardo'; }

// Il colpo: la direzione del gesto calibrato controlla l'angolo; il timing controlla qualità e ritmo.
// dir=+1 (swing destra→sinistra) mira a sinistra dell'avversario; dir=-1 mira a destra; dir=0 mira al centro.
export function arcadeShot(court, p, ball, sw, e){
  const q = Math.abs(e), r = rel(p, ball.p), fore = r.l >= 0;
  const power = clamp(sw.power ?? .6, .2, 1), lift = clamp(sw.lift ?? 0, -1, 1);
  let type = 'drive';
  if (ball.p.y > 2.1 && Math.abs(ball.p.z) < court.halfL*.8) type = 'smash';
  else if (sw.drop) type = 'drop';
  else if (sw.lob || lift >= .7) type = 'lob';
  else if (sw.slice || lift <= -.65) type = 'slice';
  const over = Math.max(0, q - ARC.GOOD);                // molto fuori tempo: più errore, palla più bassa sulla rete e più lunga
  const gestureDir = clamp(sw.dir ?? 0, -1, 1);
  const aimX = -gestureDir*.72;
  const angleRisk = Math.abs(aimX)*.08;
  const depth = type === 'drop' ? .08 : type === 'lob' ? .9 : type === 'slice' ? .62 : .5 + .45*power + over*2;
  const target = shotTarget(court, p.team, aimX, depth, type);
  const error = (q <= ARC.PERFECT ? .1 : q <= ARC.GOOD ? .2 : .3 + over*6) + angleRisk + (power > .92 ? .25 : 0) + (type === 'drop' ? .18 : type === 'slice' ? .08 : 0);
  const pace = type === 'lob' ? .9 : type === 'drop' ? .62 : type === 'slice' ? .78 : .76 + .44*power + (q <= ARC.PERFECT ? .1 : 0);
  const clearance = type === 'lob' ? 1.4 : type === 'smash' ? .25 : type === 'drop' ? .32 : type === 'slice' ? .22 : .55 + .3*Math.max(0, lift) - over*3.5;
  return { type, target, error, clearance, pace, label: timingLabel(e), power, fore };
}

export class ArcadeMatch extends MatchCore {
  // teams come in MatchCore; per i giocatori veri: { human: true, id, name, grace } (grace: attesa del colpo, secondi)
  constructor(o){
    super({ ...o, sport: 'tennis', level: 'facile' });
    this.cpu = CPU[o.cpu] || CPU.facile;
    for (const p of this.players){
      if (p.human){ Object.assign(p, { speed: ARC.SPEED, reach: ARC.REACH, grace: o.teams[p.team][p.idx].grace ?? .1, auto: true }); }
      else Object.assign(p, { speed: this.cpu.speed, reaction: this.cpu.reaction, skill: .6 });
      Object.assign(p, { swings: [], anim: null, inc: null, pend: null, done: false, manualT: 0 });
    }
    this.hist = []; this.shadow = null; this.deferred = null; this.toss = null; this.lastQuality = null;
  }
  humans(){ return this.players.filter(p => p.human); }
  setupPoint(){
    super.setupPoint();
    this.hist = []; this.toss = null; this.shadow = null; this.deferred = null;
    for (const p of this.players || []) Object.assign(p, { swings: [], inc: null, pend: null, done: false });
  }

  /* ---------- comandi ---------- */
  // input: { move, swings:[{ delay, power, lift, lob, aim, dir }], toss:{ delay }, auto } oppure { [id]: … }
  update(dt, input = null){
    this.events = []; this.t += dt; this.timer += dt;
    const hs = this.humans();
    const inputs = input && (input.move || input.swings || input.toss) ? (hs[0] ? { [hs[0].id]: input } : {}) : (input || {});
    for (const h of hs){
      const inp = inputs[h.id]; if (!inp) continue;
      if (inp.auto != null) h.auto = !!inp.auto;
      const mv = inp.move || { x: 0, y: 0 };
      if (Math.abs(mv.x) > .05 || Math.abs(mv.y) > .05){
        const d = h.team === 0 ? 1 : -1; h.tx = h.x + mv.x*d*h.speed*dt*4; h.tz = h.z - mv.y*d*h.speed*dt*4; h.manualT = .35;
      }
      if (inp.toss) this.startToss(h, inp.toss.delay || 0);
      for (const s of inp.swings || []) this.addSwing(h, s);
    }
    for (const h of hs) h.manualT = Math.max(0, h.manualT - dt);

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
        this.record();
        this.thinkAI(dt);
        this.autoMove(dt);
        this.movePlayers(dt, false);
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
      this.serveShot(s, { power: best.power, e, aim: best.aim });
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
  serveShot(s, { power = .6, e = 0, aim = null }){
    const c = this.court, r = this.rally, box = r.serveBox(), second = r.attempt === 2, q = Math.abs(e), u = clamp(e/.2, -1.5, 1.5);
    const xMid = (box.x0 + box.x1)/2, xHalf = (box.x1 - box.x0)/2 - .4, side = s.team === 0 ? 1 : -1;
    let ax = aim ? clamp((aim.x - xMid)/xHalf*side, -1, 1) : clamp(u*.7 + (this.rng() - .5)*.4, -1, 1);
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
    for (const p of this.players) Object.assign(p, { swings: p === s ? [] : p.swings, inc: null, pend: null, done: false });
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
  record(){
    const b = this.ball;
    this.hist.push({ t: this.t, p: { ...b.p }, v: { ...b.v } });
    while (this.hist.length && this.hist[0].t < this.t - ARC.HIST) this.hist.shift();
  }
  histAt(t){
    const H = this.hist; if (!H.length) return null;
    if (t <= H[0].t) return H[0];
    for (let i = H.length - 1; i > 0; i--) if (H[i - 1].t <= t){
      const a = H[i - 1], b = H[i], k = (t - a.t)/Math.max(1e-6, b.t - a.t), L = (x, y) => x + (y - x)*k;
      return { t, p: { x: L(a.p.x, b.p.x), y: L(a.p.y, b.p.y), z: L(a.p.z, b.p.z) }, v: { x: L(a.v.x, b.v.x), y: L(a.v.y, b.v.y), z: L(a.v.z, b.v.z) } };
    }
    return H[H.length - 1];
  }
  legalFor(h){ const r = this.rally; return r.state === 'live' && r.lastHitter !== h.team && !(r.isServe && r.bouncesSinceHit === 0) && this.sinceHit > .2; }
  contact(h, dt){
    if (this.phase !== 'live') return;
    const r = this.rally, incoming = r.lastHitter !== h.team && r.state === 'live';
    if (!incoming){ h.inc = null; return; }
    // previsione dell'impatto: serve al movimento automatico e all'aiuto visivo sul tempo
    if (!h.pend && !h.done){ h.planT = (h.planT || 0) - dt; if (h.planT <= 0 || !h.inc){ h.inc = this.predictContact(h); h.planT = .06; } }
    // la palla passa davanti al giocatore: inizia l'attesa del colpo
    if (!h.pend && !h.done && this.legalFor(h) && sideOf(this.ball.p.z) === h.team){
      const H = this.hist, k = H[H.length - 1], k0 = H[H.length - 2];
      const rr = rel(h, k.p), r0 = k0 ? rel(h, k0.p) : null;
      if (rr.s <= ARC.S0 && rr.s > -1.2){
        const Tc = r0 && r0.s > ARC.S0 ? k0.t + (r0.s - ARC.S0)/Math.max(1e-6, r0.s - rr.s)*(k.t - k0.t) : this.t;
        if (Math.abs(rr.l) <= ARC.REACH && k.p.y >= .1 && k.p.y <= 3.1){
          h.pend = { Tc, side: rr.l >= 0 ? 'fh' : 'bh' };
          if (!this.shadow){ this.shadow = Object.assign(Object.create(Object.getPrototypeOf(r)), r); this.deferred = null; }
        } else { h.done = true; this.emit({ type: 'miss', player: h.id, why: 'portata', human: true }); }
      }
    }
    if (h.pend) this.resolve(h);
  }
  resolve(h){
    const P = h.pend, now = this.t;
    const cand = h.swings.filter(w => w.at >= P.Tc - ARC.EARLY && w.at <= P.Tc + ARC.LATE);
    const best = cand.reduce((a, w) => !a || Math.abs(w.at - P.Tc) < Math.abs(a.at - P.Tc) ? w : a, null);
    if (best && (best.at >= P.Tc - .1 || now >= P.Tc + h.grace + .03)){
      const e = best.at - P.Tc;
      const tc = Math.max(now - ARC.REWIND, clamp(best.at, P.Tc - .04, now));
      const k = this.histAt(tc) || { p: { ...this.ball.p }, v: { ...this.ball.v } };
      this.ball.p = { ...k.p }; this.ball.v = { ...k.v };
      h.swings = h.swings.filter(w => w.at > best.at + .05);
      h.pend = null; h.done = true; h.inc = null;
      const shot = arcadeShot(this.court, h, this.ball, best, e);
      this.shadow = null; this.deferred = null;
      h.anim = { kind: shot.type === 'smash' ? 'smash' : 'swing', side: shot.fore ? 'fh' : 'bh', at: Math.min(now, best.at), hit: true };
      this.lastQuality = { label: shot.label, power: shot.power };
      this.strike(h, shot, false);
      this.emit({ type: 'contact', player: h.id, timing: e, label: shot.label, power: shot.power, shot: shot.type, side: shot.fore ? 'fh' : 'bh' });
      return;
    }
    if (now >= P.Tc + ARC.LATE + h.grace){
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
    const r = this.rally, { fz, rx } = axes(h), samples = predict(this.ball, this.court, 3, 1/60);
    let best = null, fallback = null, bounced = r.bouncesSinceHit;
    for (const k of samples){
      const b = bounced + k.bounces;
      if (b >= 2) break;
      if (sideOf(k.z) !== h.team || k.y < .3 || k.y > 2.8) continue;
      if (r.isServe && b === 0) continue;                                 // il servizio va lasciato rimbalzare
      const side = h.autoSide || ((k.x - h.x)*rx >= -.3 ? 1 : -1);
      const sx = k.x - rx*side*ARC.SIDE, sz = k.z - fz*ARC.S0;
      const reach = Math.max(0, Math.hypot(sx - h.x, sz - h.z) - .3)/h.speed <= k.t;
      const comfy = b === 1 && k.y <= 1.55 && k.vy < .5;
      const c = { Tc: this.t + k.t, x: k.x, y: k.y, z: k.z, sx, sz, side: side > 0 ? 'fh' : 'bh' };
      if (reach && comfy){ best = c; break; }
      if (reach && !fallback) fallback = c;
      if (!reach && !fallback && k === samples[samples.length - 1]) fallback = c;
    }
    const c = best || fallback;
    if (c && h.autoSide == null) h.autoSide = c.side === 'fh' ? 1 : -1;
    return c;
  }
  autoMove(){
    for (const h of this.humans()){
      if (!h.auto || h.manualT > 0 || this.t < (h.reactT || 0)) continue;
      if (h.pend || h.done){ if (h.done && this.rally.lastHitter === h.team) this.goHome(h, 1); continue; }
      if (h.inc){ h.tx = h.inc.sx; h.tz = h.inc.sz; }
      else if (this.rally.lastHitter === h.team){ this.goHome(h, 1); h.autoSide = null; }
    }
    for (const h of this.humans()) if (this.rally.lastHitter === h.team) h.autoSide = null;
  }
  strike(p, shot, anim = true){
    super.strike(p, shot, anim);
    this.hist = [];
    for (const q of this.players) if (q.team !== p.team) Object.assign(q, { inc: null, pend: null, done: false, autoSide: null, reactT: this.t + ARC.REACT });
  }

  /* ---------- computer ---------- */
  cpuStrike(){
    for (const p of this.players){
      if (p.human || this.phase !== 'live' || !this.rally.canHit(p.team) || this.sinceHit < .22) continue;
      if (p.react > 0 || !this.canReach(p) || this.ball.p.y > 2.9 || !this.aiWants(p)) continue;
      p.anim = { kind: this.ball.p.y > 2.1 ? 'smash' : 'swing', side: rel(p, this.ball.p).l >= 0 ? 'fh' : 'bh', at: this.t, hit: true };
      this.strike(p, this.cpuShot(p));
    }
  }
  // il computer tiene lo scambio: mira dentro il campo con margine, ritmo moderato; sbaglia ogni tanto, di più sotto pressione
  cpuShot(p){
    const L = this.cpu, rng = this.rng, c = this.court, opp = this.players.filter(q => q.team !== p.team);
    const ox = opp.reduce((s, o) => s + o.x, 0)/Math.max(1, opp.length), side = p.team === 0 ? 1 : -1;
    let aimX = -Math.sign(ox*side || (rng() - .5))*(.35 + rng()*.55);
    if (rng() < .25) aimX = (rng()*2 - 1)*.5;
    let pace = L.pace[0] + rng()*(L.pace[1] - L.pace[0]), depth = .55 + rng()*.33;
    const lq = this.lastQuality, strong = lq && lq.label === 'perfetto' && lq.power > .7, weak = !lq || lq.label === 'anticipo' || lq.label === 'ritardo' || lq.power < .45;
    // pressione: colpo perfetto e forte del giocatore, palla veloce, scambio lungo (niente scambi infiniti)
    const pressure = (strong ? L.pressure : 0) + Math.min(.05, Math.hypot(this.ball.v.x, this.ball.v.z)/500) + Math.min(.06, this.rally.hits*.003);
    // palla debole: attacco verso il campo libero, più veloce e angolato
    if (rng() < (weak ? L.attack : L.attack*.4)){ aimX = -Math.sign(ox*side || (rng() - .5))*(.9 + rng()*.3); pace = L.attackPace[0] + rng()*(L.attackPace[1] - L.attackPace[0]); depth = .7 + rng()*.25; }
    const target = shotTarget(c, p.team, aimX, depth, 'drive');
    this.lastQuality = null;
    if (rng() < L.err + pressure){
      const t = rng() < .5 ? { x: target.x, z: Math.sign(target.z)*.3 } : rng() < .5 ? { x: target.x, z: Math.sign(target.z)*(c.halfL + 1.2) } : { x: Math.sign(target.x || 1)*(c.halfW + 1), z: target.z };
      return { type: 'drive', target: t, error: .2, clearance: t.z === Math.sign(target.z)*.3 ? -.3 : .4, pace };
    }
    return { type: 'drive', target, error: L.spread, clearance: .55, pace };
  }
}
