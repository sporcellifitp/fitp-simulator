// Audit B19 (1v1 tra utenti): il banco dei due umani. Motore vero senza grafica, due persone simulate che mandano al
// motore gli stessi ingressi del telefono, nello stesso schermo (mode 'split') o come host della sfida (mode 'versus').
// È il banco del verificatore dell'angolazione «equilibrio» (docs/b19/audit-1v1-utenti.md, appendice). Il robot fa il gesto
// attorno al momento che il motore considera giusto (natpf_impact.timeToContact) più un errore; il profilo «umano» lo fa
// 0,25 s dopo il rimbalzo. Non si lancia da solo: lo usano misure.mjs e agitare.mjs
// (da natpf-tennis: node --import ./test/register.mjs scripts/audit/b19/misure.mjs <gruppo>).
const H = await import("../headless-engine.mjs");
export const NI = await import("../../../src/natpf/natpf_impact.js");
export const NO = await import("../../../src/natpf/natpf_stroke_outcome.js");
export const NS = await import("../../../src/natpf/natpf_skill.js");
export const SI = await import("../../../src/natpf/natpf_stroke_intent.js");
const { strokePower, INTENT } = SI;
// B36.0: scarto della cima e mira piena dagli stessi sorteggi; colpi con la regola nuova della direzione (../b36/simulati.mjs)
const { cimaSimulata, contaColpo } = await import("../b36/simulati.mjs");
export const mulberry32 = H.mulberry32, gauss = H.gauss;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const DT = 1/120;
export const PROF = {
  tennista:  { prep: .9,  intent: .9,  tSd: .035, wSd: .12, peak: 1150, pSd: 150, spec: .1 },
  preciso:   { prep: .9,  intent: .85, tSd: .045, wSd: .12, peak: 1090, pSd: 80,  spec: .12 },
  medio:     { prep: .55, intent: .55, tSd: .09,  wSd: .3,  peak: 790,  pSd: 155, spec: .06 },
  amatore:   { prep: .55, intent: .5,  tSd: .075, wSd: .3,  peak: 700,  pSd: 160, spec: .04 },
  umano:     { prep: .55, intent: .5,  tSd: .075, wSd: .3,  peak: 700,  pSd: 160, spec: .04, after: .25, afterSd: .05 },
  impreciso: { prep: .2,  intent: .1,  tSd: .16,  wSd: .55, peak: 535,  pSd: 200, spec: 0 },
  bambino:   { prep: .1,  intent: 0,   tSd: .14,  wSd: .45, peak: 380,  pSd: 90,  spec: 0 },
  // B36.0 (docs/b36/misure-b36-0.md): «gira tanto», quando mira gira la cima di giro ± giroSd gradi (oltre la mira piena)
  giraTanto:   { prep: .55, intent: .8, tSd: .075, wSd: .3, peak: 700, pSd: 160, spec: .04, giro: 30, giroSd: 12 },
  giraTanto40: { prep: .55, intent: .8, tSd: .075, wSd: .3, peak: 700, pSd: 160, spec: .04, giro: 40, giroSd: 12 },
};
const P_ = p => (typeof p === 'string' ? { name: p, ...PROF[p] } : { name: p.name || (p.base || 'x') + (p.tac ? '+' + p.tac : ''), ...(p.base ? PROF[p.base] : {}), ...p });

// gesto dello scambio per chi deve colpire. sgn: +1 P1 (z>0), −1 P2 (specchio in x)
function makeSwing(e, me, other, sgn, P, rng){
  const lv = NS.skillLevel(e.matchConfig.difficulty), xMax = NO.assistOf(lv).xMax;
  const side = (e.ball.targetLanding.x - me.pos.x)*sgn >= 0 ? 1 : -1;        // +1 dritto (destro)
  let tau = 0, face = 0;
  const tac = P.tac || '';
  const aims = tac === 'centro' ? false : tac === 'mira' ? true : rng() < P.intent;
  if (aims){
    const open = other.pos.x*sgn >= 0 ? -1 : 1;
    // P.aimLo, P.aimHi (B25): quanto vicino alla riga mira (frazione della mira piena); di base da 0,7 a 1, come sempre
    const aim = NO.aimForLanding(open*(P.aimLo == null ? .7 + rng()*.3 : P.aimLo + rng()*(P.aimHi - P.aimLo))*xMax, NO.neutralX(e.ball.targetLanding.x*sgn, xMax), xMax);
    if (P.aimBy === 'polso'){ face = cl(aim/NO.OUTCOME.faceAim, -1, 1); }
    else {
      const u = cl(-aim*.85/(side*NO.OUTCOME.timingAim), -1, 1);
      tau = u*(u >= 0 ? NO.directionSpan(lv) : NO.lateSpanOf(e.ball.vel.z, lv))*.9;
      face = cl((aim + side*.9*u*NO.OUTCOME.timingAim + side*NO.OUTCOME.natural*(1 - Math.abs(.9*u)))/NO.OUTCOME.faceAim, -1, 1);
    }
  }
  // P.liveTyp (B25): il colpo abituale si impara giocando, come sul telefono (natpf_phone_racket.createTypicalModel:
  // mediana degli ultimi 24 colpi normali, da 3 in su); senza, resta fisso (P.typical o P.peak), come sempre
  const live = P.liveTyp ? (P._h || (P._h = [])) : null, med = live && live.length >= 3 ? [...live].sort((x, y) => x - y)[live.length >> 1] : null;
  const typ = med ?? (P.typical === undefined ? P.peak : P.typical);
  let peak = Math.max(150, P.peak + gauss(rng)*P.pSd), shot = 'topspin', rise = .3, angle = 70;
  if (tac === 'forte'){ peak = Math.max(peak, P.peak*1.45 + gauss(rng)*P.pSd*.5); shot = 'flat'; rise = 0; }
  // P.strongP (B25): ogni tanto un colpo fortissimo cercato (probabilità a colpo), come chi vuole il colpo super
  else if (P.strongP && rng() < P.strongP){ peak = Math.max(peak, P.peak*1.45 + gauss(rng)*P.pSd*.5); shot = 'flat'; rise = 0; }
  else if (tac === 'corte'){ shot = 'drop'; rise = -.3; angle = 40; peak = Math.min(peak, (typ || P.peak)*.45); }
  else if (tac === 'pallonetti'){ shot = 'lob'; rise = .8; }
  else if (tac === 'tagli'){ shot = 'slice'; rise = -.4; }
  else if (tac !== 'solotop' && rng() < (P.spec || 0)){ shot = Math.abs(other.pos.z) < 9 ? 'lob' : 'slice'; rise = shot === 'lob' ? .8 : -.4; }
  if (live && shot !== 'lob' && peak >= 200){ live.push(peak); if (live.length > 24) live.shift(); }
  const power = strokePower(peak, typ), typePower = strokePower(peak, typ, INTENT.classGain);
  // B36.0: piatto letto (lo stesso sorteggio di sempre) e, dagli stessi numeri, scarto della cima e mira piena
  const cima = cimaSimulata(P, face, aims, gauss(rng), { sd: P.wSd });
  const intent = { shot, power: +power.toFixed(3), typePower: +typePower.toFixed(3), depth: +(power*.91).toFixed(3), rise, conf: 1, face: cima.face };
  return { lead: tau + gauss(rng)*P.tSd + (P.bias || 0) + (P.netLag || 0), after: P.after ? P.after - tau + gauss(rng)*(P.afterSd || 0) : null, sent: false,
    ev: { source: 'natpf-phone', side: side > 0 ? 'forehand' : 'backhand', hand: 'right', shotType: shot === 'drop' ? 'slice' : shot, speed: .8 + power*.85, dirX: 0,
      natpf: { aim: 'swing', shot, intent, power, peak: Math.round(peak), typical: typ || undefined, angle, latency: 0, hand: 'right', aimDev: cima.aimDev, aimFull: cima.aimFull, prepCapable: true, prep: rng() < (P.prep || 0) ? { lead: .35, amount: .8 } : null } } };
}
function makeServe(P, rng){
  let peak = Math.max(150, P.peak + gauss(rng)*P.pSd);
  if (P.tac === 'forte' || P.tac === 'servizio-forte') peak = P.peak*1.5;
  const typ = P.typical === undefined ? P.peak : P.typical, power = strokePower(peak, typ);
  const s = rng() < P.intent ? (rng() < .5 ? 1 : -1) : 1;
  return { source: 'natpf-phone', side: 'forehand', hand: 'right', shotType: 'flat', speed: 1.4, dirX: 0,
    natpf: { aim: 'swing', shot: 'flat', intent: { shot: 'flat', power: +power.toFixed(3), plane: s*.55 + gauss(rng)*.15, rise: -.08, face: cl(gauss(rng)*P.wSd, -1, 1), depth: power }, power, peak: Math.round(peak), typical: typ || undefined, latency: 0, hand: 'right' } };
}

// una serie di partite. Ritorna i punti (con la classificazione MIA), i game, le partite, i colpi.
export function play({ a = 'medio', b = 'medio', mode = 'split', fair = false, gamesToWin = 1, matches = 100, seed = 1, first = 'alt', cap = 150, tweak = null, hook = null, maxPts = Infinity } = {}){
  const A = P_(a), B = P_(b), rng = mulberry32(seed), eng = mulberry32((seed*104729 + 17) >>> 0), R0 = Math.random;
  Math.random = eng;
  const out = { a: A.name, b: B.name, pts: [], games: [], matches: [], shots: [], serves: [], direzione: { colpi: 0, nuova: 0 } };
  try {
    const e = H.createHeadlessEngine({ difficulty: '1v1' });
    if (mode === 'split') e.startSplit(); else { e.versus = { active: true }; e.roomId = 'AT-ZZ99'; }
    e.matchConfig.gamesToWin = gamesToWin; e.natpfFair = fair; e.natpfP2Hand = 'right';
    tweak?.(e);
    const S = [{ k: 'p1', P: A, me: e.player, other: e.opponent, role: 'player', sgn: 1, sw: null }, { k: 'p2', P: B, me: e.opponent, other: e.player, role: 'opponent', sgn: -1, sw: null }];
    const byActor = act => (act === e.opponent ? S[1] : S[0]);
    let ptN = 0, lastShotOf = { p1: null, p2: null }, whiff = { p1: null, p2: null }, tServeHit = null, tPt = 0, mStart = 0, mPts = 0, gFrom = 0;
    const rs = e._natpfRacketShot.bind(e);
    e._natpfRacketShot = (ev, p, o) => { const y0 = e.ball.pos.y, z0 = e.ball.pos.z, n0 = e.ball.rallyStrokeCount, r = rs(ev, p, o), L = e.natpfLastRacket; if (L){ const s = byActor(p);
      const rec = { k: s.k, pt: ptN, n: n0 + 1, shot: L.out.shot, grade: L.out.grade, q: L.out.q, t: L.out.t, excess: L.out.excess, failed: !!L.out.failed, weak: !!L.out.weak, pressured: !!L.out.pressured, sup: !!L.super, supWhy: L.superWhy?.[0] || null, y: +y0.toFixed(2), z: +Math.abs(z0).toFixed(2), x: L.out.x, depth: L.out.depth, power: L.intent?.power, tp: L.intent?.typePower, plan: NI.planOf(e, p)?.kind || null, cause: L.cause, flight: L.flight, iShot: ev.natpf?.intent?.shot };
      lastShotOf[s.k] = rec; out.shots.push(rec); contaColpo(L.out, out.direzione); hook?.(e, s, rec, L); } return r; };
    const ew = e._natpfEarlyWhiff.bind(e); e._natpfEarlyWhiff = ps => { const s = byActor(ps?.actor || e.player); whiff[s.k] = { pt: ptN, why: ps?.natpfWhy || 'presto' }; return ew(ps); };
    const wd = e._natpfWeakDropped.bind(e); e._natpfWeakDropped = ps => { const s = byActor(ps?.actor || e.player); whiff[s.k] = { pt: ptN, why: 'debole' }; return wd(ps); };
    const aw = e._awardPoint.bind(e);
    e._awardPoint = (who, why = '') => {
      const n = e.ball.rallyStrokeCount, hitter = e.ball.lastHitter === 'opponent' ? 'p2' : 'p1', recv = hitter === 'p1' ? 'p2' : 'p1', srv = e.score.server, g0 = e.score.playerGames + e.score.opponentGames;
      const L = lastShotOf[hitter]?.pt === ptN ? lastShotOf[hitter] : null, W = whiff[recv]?.pt === ptN ? whiff[recv] : null, rs_ = S[recv === 'p1' ? 0 : 1];
      let kind;
      if (why === 'Cap') kind = 'interrotto';
      else if (why === 'Net' || why === 'Out'){
        if (!L) kind = n <= 1 ? 'servizio sbagliato' : 'errore senza esito';
        else if (L.failed) kind = 'fallito per regola';
        else if (L.excess > 0) kind = 'errore di tempo (' + (why === 'Net' ? 'rete' : 'fuori') + ')';
        else kind = 'errore di mira/forza';
      } else {
        const plan = NI.planOf(e, rs_.me)?.kind;
        if (W?.why === 'portata' || plan === 'stretch') kind = 'vincente vero';
        else if (W) kind = 'a vuoto: ' + (W.why === 'tardi' ? 'tardi' : W.why === 'debole' ? 'debole' : 'presto');
        else if (!rs_.sw?.sent) kind = 'a vuoto: nessun gesto';
        else kind = 'a vuoto: non giocato';
      }
      const sc = [e.score.playerPoints, e.score.opponentPoints];
      aw(who, why);
      out.pts.push({ srv: srv === 'player' ? 'p1' : 'p2', win: who === 'player' ? 'p1' : 'p2', why, kind, n, hitter, dur: tServeHit != null ? e.elapsedTime - tServeHit : 0, lastShot: L?.shot || null, sup: !!L?.sup, sc });
      ptN++; mPts++; tServeHit = null;
      if (e.score.playerGames + e.score.opponentGames > g0 || e.phase === 'MATCH_OVER'){
        const G = out.pts.slice(gFrom), w = who === 'player' ? 'p1' : 'p2';
        out.games.push({ srv: G[0].srv, win: w, n: G.length, love: G.every(p => p.win === w), deuce: G.filter(p => p.win !== w).length >= 3 });
        gFrom = out.pts.length;
      }
    };
    const fs = k => (first === 'alt' ? (k % 2 ? 'opponent' : 'player') : first);
    e.natpfServeFirst = fs(0); e.startNewMatch({ showStartBanner: false }); mStart = e.elapsedTime;
    for (let guard = 0; guard < 6e8 && out.matches.length < matches && out.pts.length < maxPts; guard++){
      if (e.phase === 'MATCH_OVER'){
        out.matches.push({ win: e.score.playerGames > e.score.opponentGames ? 'p1' : 'p2', sec: e.elapsedTime - mStart, pts: mPts, first: e.natpfServeFirst === 'player' ? 'p1' : 'p2', g: [e.score.playerGames, e.score.opponentGames] });
        e.natpfServeFirst = fs(out.matches.length); e.startNewMatch({ showStartBanner: false }); mStart = e.elapsedTime; mPts = 0; gFrom = out.pts.length; S[0].sw = S[1].sw = null; continue;
      }
      for (const s of S){
        const twd = Math.sign(s.me.pos.z) || 1;
        if (e.phase === 'SERVE_STANCE'){ s.sw = null; s.bAt = null;
          if (e.score.server === s.role && e.phaseTimer > .6){ s.k === 'p2' ? e._handleP2TossInput({}) : e._handleUserTossInput({}); s.sTau = cl(.05 + gauss(rng)*s.P.tSd*1.2, -.5, .4); s.served = false; } }
        else if (e.phase === 'SERVE_TOSS' && e.score.server === s.role && !s.served && e.phaseTimer > .17){
          if (e.ball.vel.y/9.15 <= s.sTau){ s.served = true; const sv = makeServe(s.P, rng); s.k === 'p2' ? e._handleP2SwingInput(sv) : e._handleUserSwingInput(sv);
            if (e.phase === 'RALLY'){ tServeHit = e.elapsedTime; out.serves.push({ k: s.k, ...(e.natpfLastServe || {}) }); } else s.served = false; } }
        else if (e.phase === 'RALLY' && e.ball.inPlay){
          if (s.P.driver){ s.sw = { sent: true }; s.P.driver(e, s, DT); }
          else if (s.P.spam){   // agita il telefono senza guardare la palla: un gesto ogni spam secondi (±20%)
            if (s.nextSpam == null || e.elapsedTime >= s.nextSpam){ s.nextSpam = e.elapsedTime + s.P.spam*(.8 + .4*rng()); const w = makeSwing(e, s.me, s.other, s.sgn, s.P, rng); s.sw = { sent: true }; s.k === 'p2' ? e._handleP2SwingInput(w.ev) : e._handleUserSwingInput(w.ev); }
          }
          else if (e.ball.lastHitter === s.role){ s.sw = null; s.bAt = null; }
          else if (e.ball.vel.z*twd > .5){
            if (!s.sw) s.sw = makeSwing(e, s.me, s.other, s.sgn, s.P, rng);
            if (!s.sw.sent){
              const ttc = NI.timeToContact(e, s.me);
              if (s.sw.after != null && s.bAt == null && e.ball.bounceCountOnCurrentSide === 1 && e.ball.pos.z*twd > 0) s.bAt = e.elapsedTime;
              const hum = s.sw.after != null && NI.planOf(e, s.me)?.kind === 'ground';
              const go = hum ? (s.bAt != null && e.elapsedTime >= s.bAt + s.sw.after) || (ttc != null && ttc <= -.12) : ttc != null && ttc <= s.sw.lead;
              if (go){ s.sw.sent = true; s.k === 'p2' ? e._handleP2SwingInput(s.sw.ev) : e._handleUserSwingInput(s.sw.ev); }
            }
          }
        }
      }
      if (e.phase === 'RALLY' && e.ball.inPlay && e.ball.rallyStrokeCount >= cap) e._awardPoint(e.ball.lastHitter === 'player' ? 'opponent' : 'player', 'Cap');
      e.step(DT);
    }
  } finally { Math.random = R0; }
  return out;
}
export const pc = (a, n) => (n ? +(100*a/n).toFixed(1) : null);
export const qt = (arr, f) => { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f*s.length))] : null; };
export function many(opts, seeds){ const R = seeds.map(seed => play({ ...opts, seed })); return { pts: R.flatMap(r => r.pts), games: R.flatMap(r => r.games), matches: R.flatMap(r => r.matches), shots: R.flatMap(r => r.shots), serves: R.flatMap(r => r.serves),
  direzione: { colpi: R.reduce((a, r) => a + r.direzione.colpi, 0), nuova: R.reduce((a, r) => a + r.direzione.nuova, 0) } }; }
export function sum(r){
  const P = r.pts, G = r.games, M = r.matches, kinds = {};
  for (const p of P) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  const st = P.map(p => p.n), sec = M.map(m => m.sec);
  return { pts: P.length, games: G.length, matches: M.length, p1Pts: pc(P.filter(p => p.win === 'p1').length, P.length), p1Games: pc(G.filter(g => g.win === 'p1').length, G.length), p1Match: pc(M.filter(m => m.win === 'p1').length, M.length),
    srvPt: pc(P.filter(p => p.srv === p.win).length, P.length), srvGame: pc(G.filter(g => g.srv === g.win).length, G.length), firstWins: pc(M.filter(m => m.first === m.win).length, M.length),
    ptsPerGame: +(P.length/Math.max(1, G.length)).toFixed(2), deuce: pc(G.filter(g => g.deuce).length, G.length), love: pc(G.filter(g => g.love).length, G.length),
    colpi: { media: +(st.reduce((x, y) => x + y, 0)/Math.max(1, st.length)).toFixed(1), p50: qt(st, .5), p90: qt(st, .9), max: Math.max(0, ...st), le2: pc(st.filter(x => x <= 2).length, st.length) },
    sec: { p50: Math.round(qt(sec, .5) || 0), p90: Math.round(qt(sec, .9) || 0), max: Math.round(Math.max(0, ...sec)) },
    kinds: Object.fromEntries(Object.entries(kinds).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, pc(v, P.length)])) };
}
