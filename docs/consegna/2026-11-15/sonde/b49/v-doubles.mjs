// S3: doppio contro singolo, stesso gesto sulla stessa palla, semi del caso diversi. Scritto da zero.
import * as THREE from 'three';
const WT = '/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/wt/natpf-tennis';
const { createHeadlessEngine, mulberry32 } = await import(WT + '/scripts/audit/headless-engine.mjs');
const { swingEvt } = await import('./v-late.mjs');
const { landsIn } = await import(WT + '/src/natpf/natpf_shot_feedback.js');
const DT = 1/240;
function one(level, { doubles, seed, lead, power = .6, ball = {} }){
  const real = Math.random; Math.random = mulberry32(seed);
  try {
    const e = createHeadlessEngine({ difficulty: level }); e.startNewMatch({ showStartBanner: false });
    e.isDoubles = doubles;
    const B = { from: [.6, 1.1, -11.2], to: [1.6, 9.2], flight: 1.0, topspin: 16, ...ball };
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 2;
    e.player.pos.set(1.0, 0, 11.6); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
    e.playerPartner.pos.set(-2.6, 0, 5.4); e.playerPartner.targetPos.copy(e.playerPartner.pos);
    e.ball.pos.set(...B.from);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(B.to[0], 0, B.to[1]), B.flight, { topspin: B.topspin });
    e._natpfPlanPlayer();
    // istante in cui la palla arriva al punto d'impatto del giocatore: dalla traiettoria vera (passo a passo, copia)
    const probe = createHeadlessEngine({ difficulty: level });
    let tC = null; { const p = e.ball.pos.clone(), v = e.ball.vel.clone(); const P = e.natpfPlan; tC = P ? P.at + P.t : null; void p; void v; }
    // senza piano (il doppio non usa planPlayerIntercept): tempo all'impatto dalla posizione vera del giocatore
    let sent = false, strike = null, whiff = null, rack0 = e.natpfLastRacket;
    const S = e._attemptPlayerRallyStrike.bind(e);
    e._attemptPlayerRallyStrike = (ev, a) => { const pre = e.ball.lastHitter; const r = S(ev, a); if (r && pre !== 'player' && !strike) strike = { at: e.elapsedTime }; return r; };
    const W = e._natpfEarlyWhiff.bind(e); e._natpfEarlyWhiff = ps => { if (!whiff) whiff = { why: ps?.natpfWhy || 'presto' }; return W(ps); };
    for (let k = 0; k < 4/DT; k++){
      const vz = e.ball.vel.z, gap = (e.player.pos.z - .35) - e.ball.pos.z, ttc = tC != null && !doubles ? tC - e.elapsedTime : (vz > .5 && e.ball.bounceCountOnCurrentSide >= 1 ? gap/vz : 9);
      if (!sent && ttc <= lead - .035){ sent = true; e._handleUserSwingInput(swingEvt({ lat: .035, power })); }
      e.step(DT);
      if (strike || e.phase !== 'RALLY' || (sent && whiff) || e.elapsedTime > 3.5) break;
    }
    const L = e.ball.targetLanding;
    return { hit: !!strike, why: strike ? null : whiff?.why || (e.ball.lastHitter === 'player' ? 'altro' : 'nulla'), racket: e.natpfLastRacket !== rack0, x: strike ? +L.x.toFixed(2) : null, z: strike ? +L.z.toFixed(2) : null,
      in: strike ? landsIn(L, { towardNegativeZ: true }) && !e.ball.natpfNetFault : null, pend: !!e.pendingUserSwing };
  } finally { Math.random = real; }
}
for (const level of ['casual', 'pro']) for (const lead of [0, .05, .15, .25, .35]){
  for (const doubles of [false, true]){
    const R = []; for (let s = 1; s <= 30; s++) R.push(one(level, { doubles, seed: s, lead }));
    const hits = R.filter(r => r.hit), zs = hits.map(r => r.z), xs = hits.map(r => r.x);
    const why = {}; R.filter(r => !r.hit).forEach(r => why[r.why] = (why[r.why] || 0) + 1);
    const rng = a => a.length ? `${Math.min(...a).toFixed(2)}…${Math.max(...a).toFixed(2)}` : '-';
    console.log(`${level} lead ${lead} ${doubles ? 'DOPPIO ' : 'singolo'}: colpite ${hits.length}/30 · racchetta virtuale ${hits.filter(r => r.racket).length} · fuori/rete ${hits.filter(r => !r.in).length} · x ${rng(xs)} · z ${rng(zs)} · a vuoto ${JSON.stringify(why)}`);
  }
}
