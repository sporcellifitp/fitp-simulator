// Moviola: il punto appena giocato, al rallentatore (segnalazione del 23/10, sera: la moviola non mostrava l'ultimo
// punto). Prima «Rivedi il punto» metteva in scena sempre lo stesso scambio a rete del modello di partenza
// (_resetReplayNetExchangePose), non il punto giocato.
// Durante il punto (dal lancio del servizio a poco dopo la fine) si registrano palla, giocatori (posizione, direzione,
// velocità) e l'inizio di ogni colpo, a REPLAY.hz. La moviola rimette in scena l'ultimo punto finito: posizioni
// interpolate, colpi fatti ripartire nello stesso istante, palla con la sua scia, telecamera di lato che segue la palla;
// palla, corpi e racchette rallentano tutti dello stesso fattore (speed). Finita, si torna al servizio.
// Funzioni pure (frame, interpolazione, telecamera) e la classe che il motore chiama (game_engine.js, «NATPF moviola»).
export const REPLAY = Object.freeze({
  hz: 30,          // fotogrammi registrati al secondo
  tail: .9,        // s registrati dopo la fine del punto (la palla che rimbalza fuori, la reazione)
  maxSec: 45,      // punto più lungo registrato (si tengono gli ultimi maxSec secondi)
  speed: .55,      // rallentatore
  hold: .8,        // s fermi sull'ultimo fotogramma prima di tornare al servizio
});

const ACTORS = ['player', 'opponent', 'playerPartner', 'opponentPartner'];
const r3 = v => Math.round(v*1000)/1000;

// fotogramma: palla [x, y, z, in gioco], per ogni giocatore [x, z, direzione, vx, vz, colpo]; colpo: il racchetta in
// corso { n (numero del colpo dell'attore), shot, side, serve, speed } o null
export function frameOf(engine, t, count = {}){
  const b = engine.ball, f = { t: r3(t), b: [r3(b.pos.x), r3(b.pos.y), r3(b.pos.z), b.inPlay ? 1 : 0], a: {} };
  for (const k of ACTORS){
    const a = engine[k]; if (!a?.pos || (k.endsWith('Partner') && !engine.isDoubles)) continue;
    const rk = a.racketKinematics;
    // nuovo colpo: la racchetta riparte (swingElapsed torna indietro) o si accende
    const st = count[k] || (count[k] = { n: 0, last: 0, on: false });
    if (rk?.swingActive && (!st.on || rk.swingElapsed < st.last)) st.n++;
    st.on = !!rk?.swingActive; st.last = rk?.swingElapsed || 0;
    f.a[k] = [r3(a.pos.x), r3(a.pos.z), r3(a.root?.rotation?.y || 0), r3(a.vel?.x || 0), r3(a.vel?.z || 0),
      rk?.swingActive ? { n: st.n, shot: rk.swingShotType, side: rk.swingSide, serve: !!rk.isServe, speed: r3(rk.swingSpeedMult || 1.15) } : null];
  }
  return f;
}

// stato al tempo t (interpolato tra due fotogrammi); null fuori dalla registrazione
export function sampleAt(frames, t){
  if (!frames?.length) return null;
  if (t <= frames[0].t) return { ...frames[0], i: 0, u: 0 };
  let i = 0; while (i < frames.length - 1 && frames[i + 1].t <= t) i++;
  const A = frames[i], B = frames[Math.min(frames.length - 1, i + 1)], u = B.t > A.t ? Math.min(1, (t - A.t)/(B.t - A.t)) : 0;
  const L = (x, y) => x + (y - x)*u;
  const out = { t, i, u, b: [L(A.b[0], B.b[0]), L(A.b[1], B.b[1]), L(A.b[2], B.b[2]), A.b[3]], a: {} };
  for (const k of Object.keys(A.a)){
    const p = A.a[k], q = B.a[k] || p;
    // direzione: interpolata sul percorso più corto
    let d = q[2] - p[2]; d = Math.atan2(Math.sin(d), Math.cos(d));
    out.a[k] = [L(p[0], q[0]), L(p[1], q[1]), p[2] + d*u, L(p[3], q[3]), L(p[4], q[4]), p[5]];
  }
  return out;
}

// telecamera della moviola: di lato al campo, alta, segue la palla (prima una posa fissa vicino alla rete)
export function replayCamera(ball){
  const z = Math.max(-13, Math.min(13, ball.z));
  return { pos: [14.5, 6.2, z*.45], look: [ball.x*.35, .9, z*.85] };
}

export class NatpfReplay {
  constructor(engine){
    this.e = engine; this.cur = null; this.last = null; this.play = null; this.acc = 0;
  }
  get playing(){ return !!this.play; }
  get speed(){ return REPLAY.speed; }
  get available(){ return !!this.last?.frames?.length; }
  // ogni fotogramma del gioco, dopo la fisica: registra il punto in corso (solo partite vere: niente dimostrazione,
  // riscaldamento o sfide)
  record(dt){
    const E = this.e; if (this.play) return;
    const ph = E.phase, ui = E.natpfUi;
    const live = (ph === 'SERVE_TOSS' || ph === 'RALLY') && !E.autoPlayMode && !ui?.training?.active && !ui?.events?.active && !E.natpfPaused;
    if (live && !this.cur) this.cur = { frames: [], t: 0, ended: null, count: {} };
    if (!this.cur) return;
    if (E.natpfPaused) return;
    this.cur.t += dt;
    if (ph === 'POINT_OVER' || ph === 'MATCH_OVER'){
      if (this.cur.ended == null) this.cur.ended = this.cur.t;
      if (this.cur.t - this.cur.ended > REPLAY.tail){ this._finish(); return; }
    } else if (!live){ this.cur = null; return; }      // punto interrotto (menu, moviola, nuovo servizio): niente
    this.acc += dt; if (this.acc < 1/REPLAY.hz && this.cur.frames.length) return; this.acc = 0;
    this.cur.frames.push(frameOf(E, this.cur.t, this.cur.count));
    while (this.cur.frames.length && this.cur.t - this.cur.frames[0].t > REPLAY.maxSec) this.cur.frames.shift();
  }
  _finish(){
    const c = this.cur; this.cur = null;
    if (c?.ended != null && c.frames.length > 3) this.last = { frames: c.frames, start: c.frames[0].t, end: c.frames[c.frames.length - 1].t };
  }
  // parte la moviola dell'ultimo punto finito; false se non c'è
  start(){
    const E = this.e; if (!this.available) return false;
    this.cur = null;
    this.play = { t: this.last.start, done: null, seen: {} };
    E.phase = 'REPLAY'; E.phaseTimer = 0; E.cameraMode = 'REPLAY_CAM';
    E.ball.inPlay = false; E.ballTrail?.clear?.();
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    E.hud?.hideCenterBanner?.(); E.hud?.setReplayMode?.(true);
    this._apply(sampleAt(this.last.frames, this.play.t));
    return true;
  }
  stop(){ if (this.play){ this.play = null; this.e.hud?.setReplayMode?.(false); } }
  // passo della fisica durante la moviola (dt già rallentato): true se la moviola gira
  step(dt){
    const E = this.e, P = this.play; if (!P) return false;
    if (E.phase !== 'REPLAY'){ this.stop(); return false; }
    P.t += dt;
    const s = sampleAt(this.last.frames, Math.min(P.t, this.last.end));
    this._apply(s);
    if (P.t >= this.last.end){
      P.done ??= P.t;
      if (P.t - P.done >= REPLAY.hold*REPLAY.speed){ this.stop(); E._setupPointServe?.({ showBanner: false }); }
    }
    return true;
  }
  _apply(s){
    const E = this.e; if (!s) return;
    E.ball.pos.set(s.b[0], s.b[1], s.b[2]); E.ball.vel?.set?.(0, 0, 0);
    if (s.b[3]) E.ballTrail?.pushPoint?.(E.ball.pos);
    for (const [k, v] of Object.entries(s.a)){
      const a = E[k]; if (!a?.pos) continue;
      a.pos.x = v[0]; a.pos.z = v[1]; a.targetPos?.copy?.(a.pos);
      if (a.root?.rotation) a.root.rotation.y = v[2];
      a.vel?.set?.(v[3], 0, v[4]);
      a.stridePhase = (a.stridePhase || 0) + Math.hypot(v[3], v[4])*(1/60)*4.4*REPLAY.speed;
      // colpo: si fa ripartire nello stesso istante della registrazione, una volta per colpo
      const sw = v[5];
      if (sw && this.play.seen[k] !== sw.n){
        this.play.seen[k] = sw.n;
        E.racketKinematics?.triggerSwing?.(a, { shotType: sw.shot, side: sw.side, speed: sw.speed, timing: 'sweet', isServe: sw.serve });
        a.swingType = sw.serve ? 'serve' : sw.side === 'overhead' ? 'smash' : sw.side === 'backhand' ? 'backhand' : 'forehand';
        a.swingTimer = a.swingDuration = .36;
      }
    }
  }
  camera(){ return replayCamera(this.e.ball.pos); }
}
