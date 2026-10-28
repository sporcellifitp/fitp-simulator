// Partita: servizio, scambi, regole del punto, CPU e sincronizzazione online.
// Posti: 0 = metà vicina (z > 0), 1 = metà lontana (z < 0). Ogni telefono guarda dal lato del proprio giocatore.
import * as THREE from 'three';
import * as P from './physics.js';
import * as R from './rules.js';
import { Player } from './player.js';
import { swipeToShot } from './input.js';
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
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(P.BALL_R * 1.25, 14, 10), new THREE.MeshStandardMaterial({ color: '#e4ff3a', emissive: '#6a7a00', roughness: 0.6 }));
    this.ballMesh.castShadow = true;
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 14), 3));
    this.trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: '#f6ffb0', transparent: true, opacity: 0.55 }));
    this.trail.frustumCulled = false;
    this.trailPts = [];
    this.marker = this.makeRing('#ffffff', 0.32);
    this.aimMarker = this.makeRing('#ffd23a', 0.42);
    this.bounceMark = this.makeRing('#ffffff', 0.12, true);
    this.scene.add(this.ballMesh, this.shadow, this.trail);

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

  makeRing(color, r, filled = false) {
    const g = filled ? new THREE.CircleGeometry(r, 24) : new THREE.RingGeometry(r * 0.78, r, 32);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.012;
    m.visible = false;
    this.scene.add(m);
    return m;
  }

  dispose() {
    this.disposed = true;
    for (const p of this.players) this.scene.remove(p.root, p.racket);
    this.scene.remove(this.ballMesh, this.shadow, this.trail, this.marker, this.aimMarker, this.bounceMark);
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
  setupPoint() {
    const server = R.currentServer(this.score);
    const box = R.serviceBox(this.score);
    const receiver = other(server);
    this.serveInfo = { server, receiver, box };
    const sp = this.players[server], rp = this.players[receiver];
    const sSide = SIDE[server], rSide = SIDE[receiver];
    // chi serve: dietro la linea di fondo, a destra del centro a punti pari (deuce)
    const sRight = sp.right.x;
    sp.pos.set(sRight * (box === 'deuce' ? 0.7 : -0.7), 0, sSide * (BASE_Z + 0.35));
    sp.vel.set(0, 0, 0);
    sp.target.copy(sp.pos);
    const rRight = rp.right.x;
    rp.pos.set(rRight * (box === 'deuce' ? 2.3 : -2.3), 0, rSide * (BASE_Z + 0.6));
    rp.vel.set(0, 0, 0);
    rp.target.copy(rp.pos);
    for (const p of this.players) { p.cancelStroke(); p.celebrate = 0; p.tossBall = null; }
    this.rally = null;
    this.plan = null;
    this.pendingSwipe = null;
    this.marker.visible = this.aimMarker.visible = false;
    this.trailPts = [];
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
  executeHit(seat, shot, quality = 'good') {
    const pl = this.players[seat];
    const s = SIDE[seat];
    const p0 = this.ball.p.slice();
    let tx, tz, speed, spin, minClear = 0.3;
    const isServe = shot.kind === 'serve';
    if (isServe) {
      [tx, tz] = this.serveTarget(shot, seat);
      const second = this.faults > 0;
      speed = second ? 29 + shot.power * 6 : 36 + shot.power * 15;
      spin = second ? 1.4 : 0.25;
      minClear = second ? 0.35 : 0.05;
    } else {
      const rightX = pl.right.x;
      tx = rightX * shot.lateral * 3.55;
      tz = -s * shot.depth;
      if (shot.spinKind === 'lob') { speed = 12 + shot.power * 2; spin = 0.4; minClear = 2.6; }
      else if (shot.spinKind === 'slice') { speed = shot.depth < 4.5 ? 10.5 : 17 + shot.power * 4; spin = -1.1; minClear = shot.depth < 4.5 ? 0.25 : 0.35; }
      else if (shot.kind === 'smash') { speed = 30 + shot.power * 8; spin = 0.2; minClear = 0.1; }
      else if (shot.kind === 'volley') { speed = 15 + shot.power * 8; spin = 0.3; minClear = 0.15; }
      else { speed = 19 + shot.power * 13; spin = 0.9 + shot.power * 0.5; }
    }
    // precisione: tempismo, potenza, corsa
    let sigma = shot.sigma ?? (quality === 'perfect' ? 0.16 : quality === 'good' ? 0.34 : quality === 'early' ? 0.7 : 0.95);
    sigma += shot.power * 0.22 + Math.min(1, pl.vel.length() / 5) * 0.25;
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
    if (quality === 'perfect' && seat === this.me) this.ui.popup('PERFETTO!', 'gold');
    else if (quality === 'early' && seat === this.me) this.ui.popup('IN ANTICIPO', 'bad');
    else if (quality === 'late' && seat === this.me) this.ui.popup('IN RITARDO', 'bad');
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
    if (pred.firstBounce) { this.marker.position.set(pred.firstBounce.x, 0.012, pred.firstBounce.z); this.marker.visible = seat === this.me; }
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
    if (this.ctrl[seat] === 'human') this.ui.hint(this.rally.serve ? 'Scorri per rispondere' : null, 'hit');
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
  onSwipeMove(g) {
    if (!g) { this.aimMarker.visible = false; return; }
    const me = this.players[this.me];
    if (this.state === 'serve-wait' && this.serveInfo?.server === this.me) {
      const shot = swipeToShot(g, { serve: true });
      const [x, z] = this.serveTarget(shot, this.me);
      this.aimMarker.position.set(x, 0.013, z);
      this.aimMarker.visible = g.up;
      return;
    }
    if (this.state === 'rally' && this.plan?.seat === this.me && !this.plan.swipe) {
      const shot = swipeToShot(g);
      this.aimMarker.position.set(me.right.x * shot.lateral * 3.55, 0.013, -SIDE[this.me] * shot.depth);
      this.aimMarker.visible = true;
    }
  }

  onSwipe(g) {
    this.aimMarker.visible = false;
    if (this.state === 'serve-wait' && this.serveInfo?.server === this.me) {
      if (!g.up) return;
      this.beginServe(swipeToShot(g, { serve: true }));
      return;
    }
    const plan = this.plan;
    if (this.state !== 'rally' || !plan || plan.seat !== this.me || plan.swipe || plan.done) return;
    const shot = swipeToShot(g);
    if (plan.kind === 'volley' && shot.spinKind === 'topspin') shot.kind = 'volley';
    if (plan.kind === 'smash') { shot.kind = 'smash'; shot.spinKind = 'flat'; }
    const early = plan.t - this.now;
    plan.swipe = { shot, at: this.now, early };
    const me = this.players[this.me];
    const aim = shot.lateral * 0.35;
    me.prepare(shot.kind === 'smash' ? 'smash' : shot.kind === 'volley' ? 'volley' : 'drive', plan.contact, plan.t, this.now, { aim, spinKind: shot.spinKind, side: plan.side });
    plan.prepared = true;
    this.ui.hint(null);
  }

  // ── ciclo principale ─────────────────────────────────────────────────────
  update(dt) {
    dt = Math.min(dt, 1 / 20);
    this.now += dt;
    this.stateT += dt;
    const st = this.state;

    if (st === 'intro') {
      if (this.stateT > 3.0) { this.ui.hideVersus(); this.setupPoint(); }
    } else if (st === 'serve-wait') {
      const { server } = this.serveInfo;
      const sp = this.players[server];
      // palla in mano (palleggio)
      const bounceY = 0.25 + Math.abs(Math.sin(this.now * 3.2)) * 0.8;
      const hold = sp.toWorld(new THREE.Vector3(-0.15, bounceY, 0.45));
      this.ball.p = [hold.x, hold.y, hold.z];
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
    this.renderBall();
    this.cam.update(dt, this.players[this.me], this.state === 'rally' ? this.ball : null);
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
    this.trailPts.push(this.ball.p.slice());
    if (this.trailPts.length > 14) this.trailPts.shift();
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
    this.bounceMark.position.set(ev.x, 0.012, ev.z);
    this.bounceMark.visible = true;
    this.bounceMarkT = this.now;
    const r = this.rally;
    const defender = other(r.hitter);
    r.bounces++;
    if (r.bounces === 1) {
      const ok = r.serve ? P.inServiceBox(ev.x, ev.z, SIDE[defender], this.serveInfo.box) : P.inCourt(ev.x, ev.z, SIDE[defender]);
      if (!ok) this.decide(defender, r.serve ? 'fault' : 'out');
      else this.marker.visible = false;
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
    this.marker.visible = false;
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
  renderBall() {
    const [x, y, z] = this.ball.p;
    this.ballMesh.position.set(x, y, z);
    this.ballMesh.visible = y > -1;
    this.shadow.position.set(x, 0.011, z);
    this.shadow.visible = this.ballMesh.visible;
    const sc = Math.max(0.4, 1.4 - y * 0.25);
    this.shadow.scale.setScalar(sc);
    this.shadow.material.opacity = Math.max(0.12, 0.42 - y * 0.08);
    const arr = this.trail.geometry.attributes.position.array;
    const pts = this.state === 'rally' ? this.trailPts : [];
    for (let i = 0; i < 14; i++) {
      const p = pts[Math.max(0, pts.length - 14 + i)] || this.ball.p;
      arr[i * 3] = p[0]; arr[i * 3 + 1] = p[1]; arr[i * 3 + 2] = p[2];
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    if (this.bounceMark.visible && this.now - this.bounceMarkT > 0.8) this.bounceMark.visible = false;
    if (this.bounceMark.visible) this.bounceMark.material.opacity = 0.8 * (1 - (this.now - this.bounceMarkT) / 0.8);
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
