// Partita: servizio, scambi, regole del punto, CPU e sincronizzazione online.
// Posti: 0 = metà vicina (z > 0), 1 = metà lontana (z < 0). Ogni telefono guarda dal lato del proprio giocatore.
import * as THREE from 'three';
import * as P from './physics.js';
import * as R from './rules.js';
import { Player } from './player.js';
import { swipeToShot, SHOT_NAMES, SHOT_COLORS } from './input.js';
import { BallFx, Markers } from './fx.js';
import { LEVELS, cpuShot } from './ai.js';

const SIDE = [1, -1];
const other = (s) => (s === 0 ? 1 : 0);
const BASE_Z = 11.885;

function gauss(rng) {
  const u = Math.max(1e-6, rng()), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class Match {
  constructor(o) {
    Object.assign(this, {
      scene: o.scene, arena: o.arena, ui: o.ui, audio: o.audio, cam: o.camera, swipe: o.swipe,
      mode: o.mode, me: o.mySeat ?? 0, net: o.net || null, level: o.difficulty || 'normale',
    });
    this.names = o.names || ['Tu', 'CPU'];
    this.rng = P.makeRng(o.seed || (Date.now() & 0xffffffff));
    this.score = R.newScore(o.format || 'breve', o.firstServer ?? 0);
    const colors = ['#19b5c9', '#e8333a'];
    this.players = [0, 1].map((seat) => {
      const gl = seat === this.me ? o.assets.hero : o.assets.rival;
      const clip = seat === this.me ? o.assets.clips.hero[0] : o.assets.clips.rival[0];
      const p = new Player(gl, clip, { color: seat === this.me ? colors[0] : colors[1], side: SIDE[seat] });
      this.scene.add(p.root, p.racket);
      return p;
    });
    this.ctrl = [0, 1].map((seat) => (seat === this.me ? 'human' : this.mode === 'cpu' ? 'cpu' : 'remote'));
    this.players[other(this.me)].maxSpeed = this.mode === 'cpu' ? LEVELS[this.level].speed : 6.0;
    this.cam.setSide(SIDE[this.me]);

    // pallina, ombra, scia e indicatori
    this.ball = { p: [0, -5, 0], v: [0, 0, 0], spin: 0 };
    this.fx = new BallFx(this.scene, this.cam.cam);
    this.marks = new Markers(this.scene);

    this.now = 0;
    this.state = 'intro';
    this.stateT = 0;
    this.rally = null;
    this.plan = null;
    this.serveInfo = null;
    this.faults = 0;
    this.pendingSwipe = null;
    this.events = [];
    this.lastShotSeq = 0;
    this.pointSeq = 0;
    this.latency = 0.06;

    this.swipe.onMove = (g) => this.onSwipeMove(g);
    this.swipe.onRelease = (g) => this.onSwipe(g);
  }

  dispose() {
    this.disposed = true;
    for (const p of this.players) this.scene.remove(p.root, p.racket);
    this.fx.dispose(this.scene);
    this.marks.dispose();
    this.swipe.onMove = this.swipe.onRelease = null;
  }

  // ── avvio ────────────────────────────────────────────────────────────────
  start() {
    this.cam.startIntro();
    this.ui.showVersus(this.names[this.me], this.names[other(this.me)]);
    this.setState('intro');
    this.audio.crowd(true);
    this.updateHud();
  }

  setState(s) { this.state = s; this.stateT = 0; }

  // ── preparazione del punto ───────────────────────────────────────────────
  setupPoint(walk = true) {
    const server = R.currentServer(this.score);
    const box = R.serviceBox(this.score);
    const receiver = other(server);
    this.serveInfo = { server, receiver, box };
    const sp = this.players[server], rp = this.players[receiver];
    const sSide = SIDE[server], rSide = SIDE[receiver];
    // chi serve: dietro la linea di fondo, a destra del centro a punti pari (deuce)
    // posizioni: chi serve dietro la linea di fondo, chi risponde dalla parte del riquadro
    this.spots = [null, null];
    this.spots[server] = new THREE.Vector3(sp.right.x * (box === 'deuce' ? 0.7 : -0.7), 0, sSide * (BASE_Z + 0.35));
    this.spots[receiver] = new THREE.Vector3(rp.right.x * (box === 'deuce' ? 2.3 : -2.3), 0, rSide * (BASE_Z + 0.6));
    for (const p of this.players) { p.cancelStroke(); p.celebrate = 0; p.tossBall = null; }
    this.rally = null;
    this.plan = null;
    this.pendingSwipe = null;
    this.marks.hideAll();
    this.fx.clearTrail();
    this.ui.hint(null);
    const far = this.players.some((p, i) => p.pos.distanceTo(this.spots[i]) > 0.3);
    if (walk && far) {
      // i giocatori tornano camminando al loro posto
      this.players.forEach((p, i) => { p.moveTo(this.spots[i].x, this.spots[i].z); p.walkSpeed = 3.0; });
      this.setState('positioning');
      this.updateHud();
      return;
    }
    this.readyToServe();
  }

  readyToServe() {
    const { server } = this.serveInfo;
    this.players.forEach((p, i) => { p.pos.copy(this.spots[i]); p.vel.set(0, 0, 0); p.target.copy(p.pos); p.walkSpeed = 0; });
    this.setState('serve-wait');
    this.serveWaitUntil = this.now + (this.ctrl[server] === 'cpu' ? 1.1 + this.rng() * 0.6 : 0);
    if (this.ctrl[server] === 'human') this.ui.hint(this.faults ? 'Seconda di servizio: scorri verso l\'alto' : 'Scorri verso l\'alto per servire', 'serve');
    else if (this.ctrl[server] === 'remote') this.ui.hint('Serve l\'avversario…', null);
    else this.ui.hint(null);
    this.updateHud();
  }

  // ── servizio ─────────────────────────────────────────────────────────────
  beginServe(shot) {
    const { server } = this.serveInfo;
    const sp = this.players[server];
    const contact = sp.toWorld(new THREE.Vector3(0.2, 2.42, 0.35));
    const t = this.now + 0.78;
    sp.prepare('serve', contact, t, this.now, { aim: 0 });
    this.serveToss = { from: sp.toWorld(new THREE.Vector3(-0.05, 1.15, 0.4)), contact, t0: this.now, t1: t, shot };
    this.setState('serving');
    this.ui.hint(null);
    this.audio.play('swing', 0.3);
  }

  serveTarget(shot, server) {
    const { receiver, box } = this.serveInfo;
    const rp = this.players[receiver], sp = this.players[server];
    // riquadro: metà destra del ricevente per il "deuce"
    const boxSign = rp.right.x * (box === 'deuce' ? 1 : -1);
    const lat = shot.lateral * Math.sign(sp.right.x) * boxSign; // +1 verso l'esterno del riquadro
    const x = boxSign * (2.0 + THREE.MathUtils.clamp(lat, -1, 1) * 1.65);
    const z = SIDE[receiver] * shot.depth;
    return [x, z];
  }

  // ── colpo: calcola la velocità della palla e la lancia ────────────────────
  // shot: {kind, spinKind, lateral, depth, power, sigma?}, quality: 'perfect'|'good'|'early'|'late'
  // Bersaglio, velocità ed effetto di un colpo (senza l'errore di esecuzione).
  shotParams(seat, shot) {
    const pl = this.players[seat];
    const s = SIDE[seat];
    let tx, tz, speed, spin, minClear = 0.3, risk = 0;
    if (shot.kind === 'serve') {
      [tx, tz] = this.serveTarget(shot, seat);
      const second = this.faults > 0;
      speed = second ? 29 + shot.power * 6 : 36 + shot.power * 15;
      spin = second ? 1.4 : 0.25;
      minClear = second ? 0.35 : 0.05;
      return { tx, tz, speed, spin, minClear, risk };
    }
    tx = pl.right.x * shot.lateral * 3.55;
    tz = -s * shot.depth;
    const k = shot.spinKind;
    if (shot.kind === 'smash') { speed = 30 + shot.power * 8; spin = 0.2; minClear = 0.1; }
    else if (k === 'lob') { speed = 12 + shot.power * 2; spin = 0.4; minClear = 2.6; }
    else if (k === 'drop') { speed = shot.kind === 'volley' ? 7 : Math.abs(this.ball.p[2]) > 8 ? 11 : 8.5; spin = -1.7; minClear = 0.18; tz = -s * Math.min(shot.depth, 3.4); risk = 0.1; }
    else if (k === 'slice') { speed = 16 + shot.power * 5; spin = -1.0; minClear = 0.22; }
    else if (shot.kind === 'volley') { speed = 15 + shot.power * 8; spin = 0.3; minClear = 0.15; }
    else if (k === 'flat') { speed = 26 + shot.power * 12; spin = 0.15; minClear = 0.12; risk = 0.18; }
    else { speed = 19 + shot.power * 13; spin = 0.9 + shot.power * 0.5; }
    return { tx, tz, speed, spin, minClear, risk };
  }

  executeHit(seat, shot, quality = 'good') {
    const pl = this.players[seat];
    const s = SIDE[seat];
    const p0 = this.ball.p.slice();
    const isServe = shot.kind === 'serve';
    let { tx, tz, speed, spin, minClear, risk } = this.shotParams(seat, shot);
    // precisione: tempismo, potenza, corsa, colpo rischioso
    let sigma = shot.sigma ?? (quality === 'perfect' ? 0.16 : quality === 'good' ? 0.34 : quality === 'early' ? 0.7 : 0.95);
    sigma += shot.power * 0.22 + Math.min(1, pl.vel.length() / 5) * 0.25 + risk;
    if (isServe) sigma = shot.sigma ?? (this.faults > 0 ? 0.18 : 0.22 + shot.power * 0.38);
    if (quality === 'perfect') speed *= 1.08;
    if (quality === 'late') tx += pl.right.x * -1.2; // in ritardo la palla scappa verso il lato del colpitore
    tx += gauss(this.rng) * sigma;
    tz += gauss(this.rng) * sigma * 1.25 * -s * (isServe ? 0.5 : 1);
    const sol = P.solveShot(p0, tx, tz, speed, spin, minClear) || P.solveShot(p0, tx * 0.5, -s * 8, 14, 0.2, 1.2);
    this.launch(seat, p0, sol.v, sol.spin, shot, quality);
    return sol;
  }

  launch(seat, p0, v, spin, shot, quality, remote = false) {
    this.ball.p = p0.slice();
    this.ball.v = v.slice();
    this.ball.spin = spin;
    const serve = shot.kind === 'serve';
    this.rally = { hitter: seat, bounces: 0, serve, hits: (this.rally?.hits || 0) + 1, landed: null, decided: false, hitAt: this.now };
    this.setState('rally');
    const kmh = Math.round(Math.hypot(v[0], v[1], v[2]) * 3.6);
    this.lastSpeed = kmh;
    this.arena.setBoards?.(kmh, this.scoreBoardText());
    this.ui.speed(kmh, seat === this.me);
    this.audio.hit(Math.min(1, kmh / 160));
    const name = SHOT_NAMES[shot.kind === 'drive' ? shot.spinKind : shot.kind === 'volley' && shot.spinKind === 'drop' ? 'drop' : shot.kind];
    this.marks.flash(p0, quality === 'perfect' || kmh > 140);
    if (seat === this.me && !serve) {
      if (quality === 'perfect') {
        const crit = (shot.power || 0) >= 0.6 || shot.spinKind === 'flat' || shot.kind === 'smash';
        const sp = this.screenOf(new THREE.Vector3(this.players[seat].pos.x, 1.2, this.players[seat].pos.z));
        if (sp) this.ui.floatText(crit ? 'CRITICO!' : '+PRECISIONE', crit ? 'crit' : '', sp.x, sp.y);
        this.marks.ripple(this.players[seat].pos.x, this.players[seat].pos.z);
      } else if (quality !== 'good') this.ui.popup(quality === 'early' ? 'IN ANTICIPO' : 'IN RITARDO', 'bad');
      void name;
    } else if (seat !== this.me && !serve && (shot.spinKind === 'drop' || shot.spinKind === 'lob' || shot.kind === 'smash')) {
      this.ui.popup(name, 'bad'); // avviso dei colpi che costringono a correre
    }
    this.players[other(seat)].splitStep(this.now);
    this.fx.clearTrail();
    this.marks.hideTiming();
    if (seat === this.me) {
      const pr = P.predict(this.ball, 4, 2);
      if (pr.firstBounce && !pr.net) {
        const inside = serve ? P.inServiceBox(pr.firstBounce.x, pr.firstBounce.z, SIDE[other(seat)], this.serveInfo.box) : P.inCourt(pr.firstBounce.x, pr.firstBounce.z, SIDE[other(seat)]);
        this.marks.showOutgoing(pr.firstBounce.x, pr.firstBounce.z, inside);
      }
    }
    if (kmh > 150 && !serve) this.cam.shake = 0.6;
    // online: comunico il colpo
    if (this.mode === 'online' && seat === this.me && !remote) {
      this.net.action({ type: 'shot', p: p0.map((x) => +x.toFixed(4)), v: v.map((x) => +x.toFixed(4)), spin: +spin.toFixed(4), kind: shot.kind, spinKind: shot.spinKind || 'flat', side: this.players[seat].stroke?.side || 1 });
    }
    this.planDefense();
  }

  // ── difesa: dove e quando colpire la palla in arrivo ──────────────────────
  planDefense() {
    const seat = other(this.rally.hitter);
    const pl = this.players[seat];
    const s = SIDE[seat];
    const pred = P.predict(this.ball, 5, 1);
    this.pred = pred;
    if (seat === this.me) {
      this.marks.hideOutgoing();
      if (pred.firstBounce && !pred.net) this.marks.showLanding(pred.firstBounce.x, pred.firstBounce.z, this.now + pred.firstBounce.t, this.now);
    }
    const nearNet = s * pl.pos.z < 7.5;
    const cands = [];
    for (const pt of pred.pts) {
      const [x, y, z] = pt.p;
      if (s * z < 0.8) continue;
      if (pt.bounces === 0) {
        if (this.rally.serve) continue; // il servizio si risponde dopo il rimbalzo
        if (y > 2.15 && s * z > 2.5 && s * z < 11.5) cands.push({ pt, kind: 'smash' });
        else if (nearNet && y > 0.45 && y < 1.75) cands.push({ pt, kind: 'volley' });
      } else if (pt.bounces === 1) {
        if (y > 0.35 && y < 1.55 && (pt.v[1] < 0.5 || y > 1.0)) cands.push({ pt, kind: 'drive' });
      }
    }
    const t0 = this.now;
    let chosen = null;
    for (const c of cands) {
      const stand = this.standFor(pl, c.pt.p, c.kind);
      const need = stand.distanceTo(pl.pos) / pl.maxSpeed + 0.12;
      if (need <= c.pt.t - 0.05) { chosen = { ...c, stand }; break; }
    }
    let reachable = true;
    if (!chosen && cands.length) {
      // non ci arriva: tenta comunque il punto più vicino
      let best = null, bestGap = Infinity;
      for (const c of cands) {
        const stand = this.standFor(pl, c.pt.p, c.kind);
        const gap = stand.distanceTo(pl.pos) / pl.maxSpeed - c.pt.t;
        if (gap < bestGap) { bestGap = gap; best = { ...c, stand }; }
      }
      chosen = best;
      reachable = bestGap < 0.25;
    }
    if (!chosen) { this.plan = { seat, none: true }; pl.moveTo(pl.pos.x, pl.pos.z); return; }
    const contact = new THREE.Vector3(...chosen.pt.p);
    this.plan = { seat, t: t0 + chosen.pt.t, contact, kind: chosen.kind, side: chosen.stand.side, reachable, swipe: null, prepared: false, done: false };
    pl.moveTo(chosen.stand.x, chosen.stand.z);
    // chi ha colpito torna verso il centro
    const hitter = this.players[this.rally.hitter];
    const hs = SIDE[this.rally.hitter];
    const atNet = hs * hitter.pos.z < 7.5;
    hitter.moveTo(THREE.MathUtils.clamp(-contact.x * 0.25, -1.5, 1.5) * 0.6, hs * (atNet ? Math.max(2.5, hs * hitter.pos.z) : BASE_Z + 0.9));
    if (this.ctrl[seat] === 'cpu') this.cpuDecide();
    if (this.ctrl[seat] === 'human') {
      this.ui.hint(this.rally.serve ? 'Scorri per rispondere' : null, 'hit');
      this.marks.showTiming(pl, this.plan.t);
    }
  }

  // Dove mettersi per colpire la palla nel punto `p`: di fianco (dritto o rovescio) e un passo dietro.
  standFor(pl, p, kind) {
    const right = pl.right, fwd = pl.forward;
    const rel = new THREE.Vector3(p[0] - pl.pos.x, 0, p[2] - pl.pos.z);
    let side = rel.dot(right) >= -0.25 ? 1 : -1;
    if (kind === 'smash') side = 1;
    const lat = kind === 'smash' ? 0.2 : kind === 'volley' ? 0.62 : 0.74;
    const back = kind === 'volley' ? 0.4 : kind === 'smash' ? 0.35 : 0.45;
    const st = new THREE.Vector3(p[0], 0, p[2]).addScaledVector(right, -lat * side).addScaledVector(fwd, -back);
    st.side = side;
    // non oltre la rete
    const s = pl.side;
    if (s * st.z < 0.6) st.z = s * 0.6;
    return st;
  }

  cpuDecide() {
    const plan = this.plan;
    const L = LEVELS[this.level];
    const seat = plan.seat, opp = this.players[other(seat)], pl = this.players[seat];
    const oppLateral = opp.pos.x * pl.right.x / 4;
    const shot = cpuShot(this.level, this.rng, { oppLateral, oppDepth: Math.abs(opp.pos.z), contactHeight: plan.contact.y, isVolley: plan.kind === 'volley', isSmash: plan.kind === 'smash' });
    plan.cpuShot = shot;
    plan.cpuMiss = !plan.reachable || this.rng() < L.miss * (1 + Math.max(0, (this.lastSpeed || 80) - 110) / 40);
    plan.cpuReactAt = plan.t - Math.max(0.35, (plan.t - this.now) * (1 - L.react));
  }

  // ── gesto del giocatore ──────────────────────────────────────────────────
  // Il colpo che il gesto produrrebbe adesso (per la mira), adattato a volée e smash.
  shotFromGesture(g) {
    const shot = swipeToShot(g);
    const plan = this.plan;
    if (plan?.kind === 'volley') shot.kind = 'volley';
    if (plan?.kind === 'smash') { shot.kind = 'smash'; shot.spinKind = 'flat'; }
    return shot;
  }

  onSwipeMove(g) {
    if (!g) { this.marks.hideAim(); this.ui.shotType(null); return; }
    let shot = null, from = null;
    if (this.state === 'serve-wait' && this.serveInfo?.server === this.me) {
      if (!g.up) { this.marks.hideAim(); this.ui.shotType(null); return; }
      shot = swipeToShot(g, { serve: true });
      from = this.players[this.me].toWorld(new THREE.Vector3(0.2, 2.42, 0.35));
    } else if (this.state === 'rally' && this.plan?.seat === this.me && !this.plan.swipe && !this.plan.none) {
      shot = this.shotFromGesture(g);
      from = this.plan.contact;
    }
    if (!shot) return;
    const key = shot.kind === 'drive' ? shot.spinKind : shot.kind === 'volley' && shot.spinKind === 'drop' ? 'drop' : shot.kind;
    const color = SHOT_COLORS[key] || '#d8f23a';
    this.ui.shotType(SHOT_NAMES[key], color);
    // traiettoria prevista (al massimo ~16 volte al secondo)
    if (this.now - (this.aimT || 0) < 0.06 && this.aimLast) {
      const a = this.aimLast;
      this.marks.showAim(a.x, a.z, color, a.inside, a.path);
      return;
    }
    this.aimT = this.now;
    const pr = this.shotParams(this.me, shot);
    const p0 = [from.x, from.y, from.z];
    const sol = P.solveShot(p0, pr.tx, pr.tz, pr.speed, pr.spin, pr.minClear);
    let path = null, x = pr.tx, z = pr.tz;
    if (sol) {
      const tr = P.predict({ p: p0, v: sol.v, spin: sol.spin }, 3, 3);
      path = [];
      for (const pt of tr.pts) { path.push(pt.p); if (pt.bounces > 0) break; }
      if (tr.firstBounce) { x = tr.firstBounce.x; z = tr.firstBounce.z; }
    }
    const opp = SIDE[other(this.me)];
    const inside = shot.kind === 'serve' ? P.inServiceBox(x, z, opp, this.serveInfo.box) : P.inCourt(x, z, opp);
    this.aimLast = { x, z, inside, path };
    this.marks.showAim(x, z, color, inside, path);
  }

  onSwipe(g) {
    this.marks.hideAim();
    this.ui.shotType(null);
    this.aimLast = null;
    if (this.state === 'serve-wait' && this.serveInfo?.server === this.me) {
      if (!g.up) return;
      this.beginServe(swipeToShot(g, { serve: true }));
      return;
    }
    const plan = this.plan;
    if (this.state !== 'rally' || !plan || plan.seat !== this.me || plan.swipe || plan.done) return;
    const shot = this.shotFromGesture(g);
    const early = plan.t - this.now;
    plan.swipe = { shot, at: this.now, early };
    const me = this.players[this.me];
    const aim = shot.lateral * 0.35;
    me.prepare(shot.kind === 'smash' ? 'smash' : shot.kind === 'volley' ? 'volley' : 'drive', plan.contact, plan.t, this.now, { aim, spinKind: shot.spinKind, side: plan.side });
    plan.prepared = true;
    this.ui.hint(null);
    this.marks.hideTiming();
  }

  // ── ciclo principale ─────────────────────────────────────────────────────
  update(dt) {
    dt = Math.min(dt, 1 / 20);
    this.now += dt;
    this.stateT += dt;
    const st = this.state;

    if (st === 'intro') {
      if (this.stateT > 3.0) { this.ui.hideVersus(); this.setupPoint(false); }
    } else if (st === 'positioning') {
      const done = this.players.every((p, i) => p.pos.distanceTo(this.spots[i]) < 0.25);
      if (done || this.stateT > 2.6) this.readyToServe();
    } else if (st === 'serve-wait') {
      const { server } = this.serveInfo;
      const sp = this.players[server];
      // palla in mano (palleggio)
      const bounceY = 0.25 + Math.abs(Math.sin(this.now * 3.2)) * 0.8;
      const hold = sp.toWorld(new THREE.Vector3(-0.15, bounceY, 0.45));
      this.ball.p = [hold.x, hold.y, hold.z];
      if (this.ctrl[server] === 'human' && window.__autoplay && this.stateT > 0.6) this.beginServe({ kind: 'serve', spinKind: 'flat', lateral: this.rng() - 0.5, depth: 5.6, power: this.rng() });
      if (this.ctrl[server] === 'cpu' && this.now > this.serveWaitUntil) {
        const shot = cpuShot(this.level, this.rng, { serve: true, second: this.faults > 0 });
        this.beginServe(shot);
      }
    } else if (st === 'serving') {
      const tt = this.serveToss;
      const u = (this.now - tt.t0) / (tt.t1 - tt.t0);
      if (u < 1) {
        // lancio di palla: parabola dalla mano al punto d'impatto, un po' più in alto
        const p = new THREE.Vector3().lerpVectors(tt.from, tt.contact, u);
        p.y += Math.sin(u * Math.PI) * 0.45;
        this.ball.p = [p.x, p.y, p.z];
        this.players[this.serveInfo.server].tossBall = u < 0.4 ? p : null;
      } else {
        this.ball.p = [tt.contact.x, tt.contact.y, tt.contact.z];
        if (this.ctrl[this.serveInfo.server] !== 'remote') this.executeHit(this.serveInfo.server, tt.shot, 'good');
        else this.setState('wait-remote');
      }
    } else if (st === 'rally') {
      this.stepRally(dt);
    } else if (st === 'point-over' || st === 'fault' || st === 'over') {
      this.freeBall(dt);
      if (st === 'point-over' && this.stateT > 2.2) this.afterPoint();
    }

    // giocatori
    const ballV = new THREE.Vector3(...this.ball.p);
    for (const [i, p] of this.players.entries()) {
      p.lookAt = st === 'rally' || st === 'serving' ? ballV : null;
      if (this.ctrl[i] === 'remote' && this.remotePos) {
        p.target.set(this.remotePos.x, 0, this.remotePos.z);
      }
      p.update(dt, this.now);
    }
    this.fx.update(this.ball, dt, this.state === 'rally');
    this.marks.update(dt, this.now);
    const plan = this.plan;
    const incoming = this.state === 'rally' && plan && !plan.none && plan.seat === this.me && !plan.done;
    this.cam.update(dt, this.players[this.me], this.state === 'rally' ? this.ball : null, { incoming, ballX: incoming ? plan.contact.x : 0 });
    this.updateEnergy(dt);
    this.updateLabels();
    if (this.mode === 'online') this.net.tick(dt, this.players[this.me]);
  }

  stepRally(dt) {
    const plan = this.plan;
    // la CPU o il giocatore preparano il colpo quando la palla si avvicina
    if (plan && !plan.none && !plan.done) {
      const pl = this.players[plan.seat];
      if (this.ctrl[plan.seat] === 'cpu' && !plan.prepared && this.now >= plan.cpuReactAt) {
        const sh = plan.cpuShot;
        pl.prepare(plan.kind === 'drive' ? 'drive' : plan.kind, plan.contact, plan.t, this.now, { aim: sh.lateral * 0.35, spinKind: sh.spinKind, side: plan.side });
        plan.prepared = true;
      }
      if (this.ctrl[plan.seat] === 'human' && !plan.swipe && window.__autoplay && plan.t - this.now < 0.35) {
        // prove automatiche: colpo casuale al momento giusto
        const r = this.rng(), kind = this.rng(), dx = (r - 0.5) * 0.4;
        const g = kind < 0.45 ? { dy: -0.3, speed: 2 } : kind < 0.6 ? { dy: -0.38, speed: 4 } : kind < 0.75 ? { dy: 0.3, speed: 2 } : kind < 0.9 ? { dy: 0.1, speed: 1.5 } : { dy: -0.25, speed: 0.7 };
        this.onSwipe({ dx, dy: g.dy, len: Math.hypot(dx, g.dy), dur: 0.15, speed: g.speed, up: g.dy < 0 });
      }
      if (this.ctrl[plan.seat] === 'human' && !plan.prepared && plan.t - this.now < 0.55) {
        // preparazione automatica (apertura); il gesto decide il colpo
        pl.prepare(plan.kind === 'drive' ? 'drive' : plan.kind, plan.contact, plan.t, this.now, { side: plan.side });
        plan.prepared = true;
        if (!plan.swipe) this.ui.hint('Scorri adesso!', 'hit');
      }
    }
    // integrazione a passo fisso fino all'istante corrente; l'impatto avviene esattamente a plan.t
    let t = this.now - dt;
    while (t < this.now - 1e-9) {
      const step = Math.min(P.DT, this.now - t);
      if (plan && !plan.none && !plan.done && t + step >= plan.t) {
        const pre = plan.t - t;
        if (pre > 0) this.physStep(pre);
        if (this.tryHit()) return;
        const rest = step - Math.max(0, pre);
        if (rest > 0) this.physStep(rest);
      } else {
        this.physStep(step);
      }
      if (this.state !== 'rally') return;
      t += step;
    }
  }

  // Palla libera dopo la fine del punto: continua a rimbalzare senza regole.
  freeBall(dt) {
    if (this.ball.p[1] < -0.5) return;
    let t = dt;
    while (t > 1e-6) {
      const h = Math.min(P.DT, t);
      const ev = P.stepBall(this.ball, h);
      if (ev && ev.type === 'bounce' && ev.vin > 1) this.audio.bounce(0.4);
      t -= h;
    }
    if (Math.abs(this.ball.p[2]) > 18.3 || Math.abs(this.ball.p[0]) > 10.2) this.ball.v = [0, 0, 0];
  }

  physStep(h) {
    const ev = P.stepBall(this.ball, h);
    this.fx.push(this.ball.p);
    if (!ev) {
      // palla uscita dall'arena dopo un rimbalzo valido
      if (this.rally.bounces >= 1 && (Math.abs(this.ball.p[2]) > 18 || Math.abs(this.ball.p[0]) > 10)) this.decide(this.rally.hitter, 'winner');
      return;
    }
    if (ev.type === 'net') {
      this.audio.play('net', 0.5);
      this.decide(other(this.rally.hitter), this.rally.serve ? 'fault-net' : 'net');
      return;
    }
    // rimbalzo
    this.audio.bounce();
    const r = this.rally;
    const defender = other(r.hitter);
    r.bounces++;
    if (r.bounces === 1) {
      const ok = r.serve ? P.inServiceBox(ev.x, ev.z, SIDE[defender], this.serveInfo.box) : P.inCourt(ev.x, ev.z, SIDE[defender]);
      this.marks.markBounce(ev.x, ev.z, ok);
      this.marks.hideLanding();
      this.marks.hideOutgoing();
      if (!ok) this.decide(defender, r.serve ? 'fault' : 'out');
    } else if (r.bounces === 2) {
      this.decide(r.hitter, r.serve ? 'ace' : 'winner');
    }
  }

  // All'istante dell'impatto previsto: colpisce chi difende (se ha fatto il gesto in tempo).
  tryHit() {
    const plan = this.plan;
    plan.done = true;
    const seat = plan.seat;
    const pl = this.players[seat];
    const c = this.ctrl[seat];
    if (c === 'remote') return false; // decide il telefono dell'avversario
    // il giocatore deve essere arrivato abbastanza vicino
    const stand = this.standFor(pl, [plan.contact.x, plan.contact.y, plan.contact.z], plan.kind);
    const off = stand.distanceTo(pl.pos);
    if (off > 1.1) { this.missed(seat, 'late-run'); return false; }
    if (c === 'cpu') {
      if (plan.cpuMiss || !plan.prepared) { this.missed(seat, 'miss'); return false; }
      this.executeHit(seat, plan.cpuShot, 'good');
      return true;
    }
    if (!plan.swipe) { this.missed(seat, 'noswipe'); return false; }
    const e = plan.swipe.early;
    const quality = e < 0.04 ? 'late' : e <= 0.55 ? 'perfect' : e <= 1.0 ? 'good' : 'early';
    this.executeHit(seat, plan.swipe.shot, quality);
    return true;
  }

  missed(seat, why) {
    if (seat === this.me) this.ui.popup(why === 'noswipe' ? 'SCORRI PER COLPIRE!' : why === 'late-run' ? 'NON CI ARRIVI' : 'MANCATA', 'bad');
    this.audio.play('swing', 0.35);
  }

  // Esito del punto. In locale decide subito; online decide solo il telefono di chi difende.
  decide(winner, reason) {
    const r = this.rally;
    if (!r || r.decided) return;
    const defender = other(r.hitter);
    if (this.mode === 'online') {
      if (defender !== this.me) return; // aspetto il verdetto dell'altro telefono
      r.decided = true;
      if (reason === 'fault' || reason === 'fault-net') this.net.action({ type: 'fault', reason });
      else this.net.action({ type: 'point', winner, reason });
      return;
    }
    r.decided = true;
    if (reason === 'fault' || reason === 'fault-net') this.onFault(reason);
    else this.onPoint(winner, reason);
  }

  onFault(reason) {
    this.faults++;
    this.audio.play('fault', 0.6);
    if (this.faults >= 2) {
      this.faults = 0;
      this.onPoint(this.serveInfo.receiver, 'double');
      return;
    }
    this.ui.banner(reason === 'fault-net' ? 'RETE' : 'FALLO', 'bad', 1.1);
    this.setState('fault');
    setTimeoutGame(this, 1.4, () => this.setupPoint());
  }

  onPoint(winner, reason, newScore = null) {
    this.faults = 0;
    const prev = this.score;
    this.score = newScore || R.pointWon(this.score, winner);
    this.pointWinner = winner;
    this.marks.hideLanding();
    this.marks.hideTiming();
    this.marks.hideOutgoing();
    const mine = winner === this.me;
    const txt = {
      ace: 'ACE!', winner: mine ? 'VINCENTE!' : 'PUNTO AVVERSARIO', out: 'FUORI', net: 'RETE', double: 'DOPPIO FALLO',
    }[reason] || (mine ? 'PUNTO!' : 'PUNTO AVVERSARIO');
    this.ui.banner(txt, mine ? 'good' : 'bad', 1.6);
    this.audio.point(mine);
    this.players[winner].celebrate = 1;
    const ev = this.score.lastEvents || [];
    if (ev.includes('match')) {
      setTimeoutGame(this, 1.2, () => this.ui.banner(this.score.winner === this.me ? 'PARTITA!' : 'PARTITA PERSA', this.score.winner === this.me ? 'gold' : 'bad', 2));
    } else if (ev.includes('game') || ev.includes('tiebreak')) {
      setTimeoutGame(this, 1.0, () => this.ui.banner(winner === this.me ? 'GAME VINTO!' : 'GAME AVVERSARIO', winner === this.me ? 'gold' : 'bad', 1.4));
    } else {
      const call = R.callout(this.score);
      if (call === 'parita') setTimeoutGame(this, 1.0, () => this.ui.banner('PARITÀ', 'gold', 1.0));
      else if (call === 'vantaggio') setTimeoutGame(this, 1.0, () => this.ui.banner(this.score.points[this.me] > this.score.points[other(this.me)] ? 'VANTAGGIO TUO' : 'VANTAGGIO AVVERSARIO', 'gold', 1.0));
      else if (call === 'killer') setTimeoutGame(this, 1.0, () => this.ui.banner('KILLER POINT', 'gold', 1.0));
    }
    if (ev.includes('tiebreak-start')) setTimeoutGame(this, 1.6, () => this.ui.banner('TIE-BREAK', 'gold', 1.2));
    void prev;
    this.updateHud();
    this.arena.setBoards?.(this.lastSpeed, this.scoreBoardText());
    this.setState('point-over');
    if (this.score.over) {
      this.cam.startCelebrate();
      setTimeoutGame(this, 2.6, () => this.endMatch());
    }
  }

  afterPoint() {
    if (this.score.over) return;
    for (const p of this.players) p.celebrate = 0;
    this.setupPoint();
  }

  endMatch() {
    this.setState('over');
    this.ui.hint(null);
    this.ui.endScreen({ win: this.score.winner === this.me, score: this.score, me: this.me, names: this.names });
  }

  // ── online: messaggi dal server ──────────────────────────────────────────
  onServerState(view) {
    if (!view) return;
    if (view.score) {
      if (view.pointSeq > this.pointSeq) {
        this.pointSeq = view.pointSeq;
        const lp = view.lastPoint;
        if (lp.reason === 'fault' || lp.reason === 'fault-net') {
          this.faults = view.faults;
          if (this.rally) this.rally.decided = true;
          this.ui.banner(lp.reason === 'fault-net' ? 'RETE' : 'FALLO', 'bad', 1.1);
          this.setState('fault');
          setTimeoutGame(this, 1.4, () => this.setupPoint());
        } else {
          if (this.rally) this.rally.decided = true;
          this.onPoint(lp.winner, lp.reason, view.score);
        }
      } else if (this.state === 'intro' || this.pointSeq === 0) {
        this.score = view.score;
        this.faults = view.faults || 0;
      }
    }
    const sh = view.shot;
    if (sh && sh.seq > this.lastShotSeq) {
      this.lastShotSeq = sh.seq;
      if (sh.by !== this.me) this.onRemoteShot(sh);
    }
  }

  onRemoteShot(sh) {
    const seat = sh.by;
    const pl = this.players[seat];
    // animazione dell'avversario: il colpo è già avvenuto, mostro la chiusura
    const contact = new THREE.Vector3(...sh.p);
    pl.prepare(sh.kind === 'serve' ? 'serve' : sh.kind === 'smash' ? 'smash' : sh.kind === 'volley' ? 'volley' : 'drive', contact, this.now - this.latency, this.now - 0.4, { spinKind: sh.spinKind, side: sh.side });
    if (this.state === 'serve-wait' || this.state === 'serving' || this.state === 'wait-remote') this.ui.hint(null);
    this.launch(seat, sh.p, sh.v, sh.spin, { kind: sh.kind, spinKind: sh.spinKind }, 'good', true);
    // recupero la latenza facendo avanzare la palla
    let lag = Math.min(0.25, this.latency);
    while (lag > 1e-6) { const h = Math.min(P.DT, lag); P.stepBall(this.ball, h); lag -= h; }
    this.planDefense();
  }

  onRemotePos(m) { this.remotePos = m; }

  // ── disegno ──────────────────────────────────────────────────────────────
  // Energia: cala negli scatti, torna camminando e tra i punti; con poca energia si corre più piano.
  updateEnergy(dt) {
    if (!this.energy) { this.energy = [1, 1]; this.baseSpeed = this.players.map((p) => p.maxSpeed); this.enT = 0; }
    const rest = this.state === 'point-over' || this.state === 'positioning' || this.state === 'serve-wait' || this.state === 'fault';
    this.players.forEach((p, i) => {
      const v = p.vel.length();
      let e = this.energy[i];
      if (v > 3.4) e -= dt * 0.05 * (v - 3.4);
      else e += dt * (rest ? 0.1 : 0.035);
      e = Math.min(1, Math.max(0, e));
      this.energy[i] = e;
      p.maxSpeed = p.walkSpeed ? p.walkSpeed : this.baseSpeed[i] * (0.72 + 0.28 * e);
    });
    this.enT += dt;
    if (this.enT > 0.12) { this.enT = 0; this.ui.energy(this.energy[this.me], this.energy[other(this.me)]); }
  }

  // Posizione sullo schermo (pixel CSS) di un punto della scena, o null se dietro la telecamera.
  screenOf(v) {
    const p = v.clone().project(this.cam.cam);
    if (p.z > 1) return null;
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight };
  }

  // Nome del colpo sopra il giocatore mentre lo prepara (e "Servizio" sopra chi deve servire).
  updateLabels() {
    [this.me, other(this.me)].forEach((seat, i) => {
      const p = this.players[seat];
      let text = null;
      const st = p.stroke;
      if (st && this.now < st.tContact + 0.45) text = strokeLabel(st);
      else if ((this.state === 'serve-wait' || this.state === 'serving') && this.serveInfo?.server === seat) text = 'Servizio';
      const sp = text ? this.screenOf(new THREE.Vector3(p.pos.x, 2.25, p.pos.z)) : null;
      this.ui.worldLabel(i, sp ? text : null, sp?.x, sp?.y);
    });
  }

  scoreBoardText() {
    const g = this.score.games;
    return `${g[0]}-${g[1]}`;
  }

  updateHud() {
    const s = this.score;
    const me = this.me, op = other(me);
    const pts = R.pointsText(s, me);
    this.ui.score({
      names: [this.names[me], this.names[op]],
      games: [s.games[me], s.games[op]],
      points: pts,
      serving: this.serveInfo ? (R.currentServer(s) === me ? 0 : 1) : (s.server === me ? 0 : 1),
      tiebreak: s.tiebreak,
    });
  }
}

function strokeLabel(st) {
  if (st.kind === 'serve') return 'Servizio';
  if (st.kind === 'smash') return 'Smash';
  if (st.spinKind === 'drop') return 'Palla corta';
  if (st.spinKind === 'lob') return 'Pallonetto';
  const base = st.kind === 'volley' ? (st.side > 0 ? 'Volée di dritto' : 'Volée di rovescio') : st.side > 0 ? 'Dritto' : 'Rovescio';
  if (st.spinKind === 'slice') return `${base} tagliato`;
  if (st.spinKind === 'flat' && st.kind !== 'volley') return `${base} piatto`;
  return base;
}

// Timer legati al tempo di gioco (si fermano con la pausa).
function setTimeoutGame(match, sec, fn) {
  const due = match.now + sec;
  const tick = () => {
    if (match.disposed) return;
    if (match.now >= due) fn();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
