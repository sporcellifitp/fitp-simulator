// Audit B19 (stesso schermo): secondo banco dei due umani, quello del verificatore dello «stesso schermo». Motore vero
// senza grafica, sessione split, profili di ../rally-balance.mjs. Diverso da due-umani.mjs in una cosa che conta: qui il
// robot fa il gesto quando la palla è a una distanza fissa dal personaggio (come rally-balance), là attorno al momento
// che il motore considera giusto. Dove i due banchi non concordano il rapporto lo scrive («incerto»).
// Non si lancia da solo: lo usa partite-distanza.mjs.
const { createHeadlessEngine, mulberry32, gauss } = await import('../headless-engine.mjs');
const { PROFILES } = await import('../rally-balance.mjs');
const { skillLevel } = await import('../../../src/natpf/natpf_skill.js');
const { strokePower } = await import('../../../src/natpf/natpf_stroke_intent.js');
const NO = await import('../../../src/natpf/natpf_stroke_outcome.js');
const NI = await import('../../../src/natpf/natpf_impact.js');
// B36.0: scarto della cima e mira piena dagli stessi sorteggi; colpi con la regola nuova della direzione (../b36/simulati.mjs)
const { cimaSimulata, contaColpo } = await import('../b36/simulati.mjs');
export { PROFILES, createHeadlessEngine, mulberry32, gauss, NO, NI };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const IDEAL_R = -.45, DT = 1/120;

// lato di chi colpisce: s = +1 per il P1 (z positivo), -1 per il P2; tutto specchiato
const side = (e, who) => { const s = who === 'p1' ? 1 : -1, me = who === 'p1' ? e.player : e.opponent, ot = who === 'p1' ? e.opponent : e.player;
  return { s, me, ot, oppX: s*ot.pos.x, oppZ: s*ot.pos.z, landX: s*e.ball.targetLanding.x, meX: s*me.pos.x, vz: s*e.ball.vel.z, r: s*(e.ball.pos.z - me.pos.z), closing: s*(e.ball.vel.z - me.vel.z), bz: s*e.ball.pos.z }; };

// gesto del telefono (stesso modello di rally-balance.phoneIntent, scritto sulla vista specchiata); opts.shot forza il tipo
export function mkIntent(e, who, P, rng, opts = {}){
  const V = side(e, who), lv = skillLevel(e.matchConfig.difficulty), span = NO.directionSpan(lv), xMax = NO.assistOf(lv).xMax;
  const open = V.oppX >= 0 ? -1 : 1, contact = V.landX >= V.meX ? 1 : -1;
  let tau = 0, face = 0, aimed = false;
  if (rng() < P.intent){
    aimed = true;
    const aim = NO.aimForLanding(open*(.7 + rng()*.3)*xMax, NO.neutralX(V.landX, xMax), xMax);
    const u = clamp(-aim*.85/(contact*NO.OUTCOME.timingAim), -1, 1);
    tau = u*(u >= 0 ? span : NO.lateSpanOf(V.vz, lv))*.9;
    face = clamp((aim + contact*.9*u*NO.OUTCOME.timingAim + contact*NO.OUTCOME.natural*(1 - Math.abs(.9*u)))/NO.OUTCOME.faceAim, -1, 1);
  }
  const peak = Math.max(150, P.peak + gauss(rng)*P.peakSd), power = strokePower(peak);
  const special = rng() < (P.specials || 0);
  const shot = opts.shot || (special ? (V.oppZ > -9 ? 'lob' : 'slice') : 'topspin');
  const rise = opts.rise ?? (shot === 'lob' ? .8 : shot === 'slice' ? -.4 : shot === 'flat' ? 0 : .3);
  // B36.0: piatto letto (lo stesso sorteggio di sempre) e, dagli stessi numeri, scarto della cima e mira piena
  const cima = cimaSimulata(P, face, aimed, gauss(rng));
  const intent = { shot, power: +power.toFixed(3), depth: +(power*.91).toFixed(3), rise, face: cima.face };
  if (opts.riseRef != null) intent.riseRef = opts.riseRef;
  return { error: -tau + gauss(rng)*P.timingSd + (-.1 - IDEAL_R)/18, sent: false, after: P.afterBounce ? P.afterBounce - tau + gauss(rng)*(P.afterBounceSd || 0) : null,
    swing: { source: 'natpf-phone', side: contact > 0 ? 'forehand' : 'backhand', shotType: shot, speed: .8 + power*.85, dirX: 0,
      natpf: { aim: 'swing', shot, intent, power, peak: Math.round(peak), latency: 0, hand: 'right', aimDev: cima.aimDev, aimFull: cima.aimFull, prepCapable: true, prep: rng() < (P.prep || 0) ? { lead: .35, amount: .8 } : null } } };
}
function serveEvt(P, rng){
  const peak = Math.max(250, P.peak + gauss(rng)*P.peakSd), power = strokePower(peak);
  return { source: 'natpf-phone', side: 'forehand', shotType: 'flat', speed: .8 + power*.85, dirX: 0,
    natpf: { aim: 'swing', shot: 'flat', intent: { shot: 'flat', power: +power.toFixed(3), depth: power, rise: -.08, plane: .55 + gauss(rng)*.1, face: gauss(rng)*P.wristSd }, power, peak: Math.round(peak), latency: 0, hand: 'right' } };
}
// una partita. Ritorna punti (con colpi, perché, chi ha colpito a vuoto e perché, distanza minima palla-giocatore), tempi, colpi.
export function match({ p1 = 'amatore', p2 = 'amatore', fair = false, games = 1, seed = 1, serveDelay = 1.5, first = 'player', speed = null, cap = 80, returnShot = null, returnEvt = null, allEvt = null, serveEvtOf = null, tune = null, idle = null, cpu = null }){
  const P = { p1: typeof p1 === 'string' ? PROFILES[p1] : p1, p2: typeof p2 === 'string' ? PROFILES[p2] : p2 };
  const rng = mulberry32(seed*2654435761 % 4294967296), erng = mulberry32(seed*40503 + 977), real = Math.random; Math.random = erng;
  const out = { points: [], strokes: [], seconds: 0, pauses: [], capped: 0, speedEnd: null, direzione: { colpi: 0, nuova: 0 } };
  try {
    const e = createHeadlessEngine({ difficulty: cpu || 'casual' });
    if (!cpu) e.startSplit();
    e.matchConfig.gamesToWin = games; e.natpfFair = fair; e.natpfServeFirst = first;
    let lastPopup = { p1: null, p2: null }, minD = { p1: 99, p2: 99 }, pStart = 0, pEnd = null, curStroke = null;
    e.hud = new Proxy({}, { get: (t, k) => k === 'showTimingPopup' ? (o = {}) => { const g = String(o.grade || ''), who = /^P2\b/.test(g) ? 'p2' : 'p1'; lastPopup[who] = { g: g.replace(/^P2\s*/, ''), t: e.elapsedTime }; } : () => {} });
    const award = e._awardPoint.bind(e);
    e._awardPoint = (who, why = '') => {
      const loser = who === 'player' ? 'p2' : 'p1', lp = lastPopup[loser];
      const pt = { server: e.score.server, winner: who, why, hits: e.ball.rallyStrokeCount, dur: e.elapsedTime - pStart, last: e.ball.lastHitter,
        loserPopup: lp && e.elapsedTime - lp.t < 2.5 ? lp.g : null, minD: +minD[loser].toFixed(2), before: [e.score.playerPoints, e.score.opponentPoints], t: e.elapsedTime };
      out.points.push(pt); if (curStroke && curStroke.res == null) curStroke.res = (e.ball.lastHitter === (curStroke.who === 'p1' ? 'player' : 'opponent') ? (who === (curStroke.who === 'p1' ? 'player' : 'opponent') ? 'vince:' : 'perde:') : 'altro:') + why;
      pEnd = e.elapsedTime; award(who, why);
    };
    e.startNewMatch({ showStartBanner: false });
    if (speed){ e.player.maxSpeed = speed; e.opponent.maxSpeed = speed; }
    if (tune) tune(e);
    const st = { p1: {}, p2: {} };
    let lastRacket = null, lastPhase = e.phase, lastHitter = null;
    for (let t = 0; t < 4000 && e.phase !== 'MATCH_OVER'; t += DT){
      if (e.phase !== lastPhase){
        if (e.phase === 'SERVE_STANCE' && pEnd != null){ out.pauses.push(e.elapsedTime - pEnd); pEnd = null; }
        if (e.phase === 'SERVE_TOSS' && lastPhase === 'SERVE_STANCE') pStart = e.elapsedTime;
        lastPhase = e.phase;
      }
      for (const who of cpu ? ['p1'] : ['p1', 'p2']){
        const S = st[who], Pf = P[who], mine = who === 'p1' ? 'player' : 'opponent';
        if (e.phase === 'SERVE_STANCE'){
          S.intent = null; S.bounceAt = null;
          if (e.score.server === mine && idle !== who){
            if (S.tossAt == null) S.tossAt = e.elapsedTime + Math.max(.6, serveDelay + gauss(rng)*.3);
            if (e.elapsedTime >= S.tossAt && e.phaseTimer > .6){ S.tossAt = null; who === 'p1' ? e._handleUserTossInput({}) : e._handleP2TossInput({}); S.serveAt = e.elapsedTime + .62 + gauss(rng)*Pf.timingSd*1.5; }
          }
        }
        if (e.phase === 'SERVE_TOSS' && e.score.server === mine && S.serveAt != null && e.elapsedTime >= S.serveAt){
          S.serveAt = null; const ev = serveEvtOf ? serveEvtOf(e, who, serveEvt(Pf, rng)) : serveEvt(Pf, rng); who === 'p1' ? e._handleUserSwingInput(ev) : e._handleP2SwingInput({ ...ev, role: 'p2' });
        }
        if (e.phase === 'RALLY' && e.ball.inPlay && idle !== who){
          if (e.ball.lastHitter === mine){ S.intent = null; S.bounceAt = null; }
          else {
            const V = side(e, who);
            minD[who] = Math.min(minD[who], Math.hypot(e.ball.pos.x - V.me.pos.x, e.ball.pos.z - V.me.pos.z));
            if (V.vz > .5 && V.bz > -6){
              if (!S.intent) S.intent = mkIntent(e, who, Pf, rng, returnShot && e.ball.rallyStrokeCount <= 1 ? returnShot : {});
              const tti = (IDEAL_R - V.r)/Math.max(.5, V.closing);
              if (S.intent.after != null && S.bounceAt == null && e.ball.bounceCountOnCurrentSide === 1 && V.bz > 0) S.bounceAt = e.elapsedTime;
              const plan = NI.planOf(e, V.me), human = S.intent.after != null && plan?.kind === 'ground';
              if (!S.intent.sent && (human ? S.bounceAt != null && e.elapsedTime >= S.bounceAt + S.intent.after : tti <= -S.intent.error)){
                S.intent.sent = true; if (allEvt){ const ev = allEvt(e, who, S.intent.swing); if (ev) S.intent.swing = ev; } if (returnEvt && e.ball.rallyStrokeCount <= 1){ const ev = returnEvt(e, who, S.intent.swing); if (ev) S.intent.swing = ev; }
                who === 'p1' ? e._handleUserSwingInput(S.intent.swing) : e._handleP2SwingInput({ ...S.intent.swing, role: 'p2' });
              }
            }
          }
        }
      }
      if (e.ball.lastHitter !== lastHitter){ lastHitter = e.ball.lastHitter; minD = { p1: 99, p2: 99 }; }
      if (e.phase === 'RALLY' && e.ball.rallyStrokeCount >= cap){ out.capped++; e._awardPoint(rng() < .5 ? 'opponent' : 'player', 'scambio infinito'); }
      e.step(DT);
      const lr = e.natpfLastRacket;
      if (lr && lr !== lastRacket){ lastRacket = lr; contaColpo(lr.out, out.direzione); const w = lr.who === 'p2' ? 'p2' : 'p1', a = w === 'p2' ? e.opponent : e.player;
        curStroke = { who: w, n: e.ball.rallyStrokeCount, shot: lr.out?.shot, gesture: lr.intent?.shot, by: +e.ball.pos.y.toFixed(2), hz: +Math.abs(a.pos.z).toFixed(1), q: lr.quality, kmh: lr.out?.kmh ?? null, failed: !!lr.out?.failed, weak: !!lr.out?.weak, volley: !!lr.volley, landX: +e.ball.targetLanding.x.toFixed(2), landZ: +e.ball.targetLanding.z.toFixed(2), res: null };
        out.strokes.push(curStroke); }
    }
    out.seconds = e.elapsedTime; out.over = e.phase === 'MATCH_OVER';
    out.winner = e.score.playerGames > e.score.opponentGames ? 'p1' : 'p2'; out.games = [e.score.playerGames, e.score.opponentGames];
    out.speedEnd = [e.player.maxSpeed, e.opponent.maxSpeed]; out.fairOn = !!e.score.fair;
  } finally { Math.random = real; }
  return out;
}
export const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f*s.length))] : null; };
export const pct = (a, n) => +(100*a/Math.max(1, n)).toFixed(1);
