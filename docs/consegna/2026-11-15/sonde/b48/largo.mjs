// B48: servizio forte ed esterno, regola di prima (piano e piatto, a tempo) contro la regola nuova (dopo il punto più alto)
const ROOT = process.env.ROOT || process.cwd();
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const NO = await import(`${ROOT}/src/natpf/natpf_stroke_outcome.js`);
const DT = 1/120;
function one({ tau, wide, off, deuce = true, seed = 3 }){
  const real = Math.random; Math.random = mulberry32(seed);
  try {
    const e = createHeadlessEngine({ difficulty: 'casual' }); e.startNewMatch({ showStartBanner: false });
    for (let i = 0; i < 400 && !(e.phase === 'SERVE_STANCE' && e.phaseTimer > .3); i++) e.step(DT);
    e.score.server = 'player'; e.score.deuceSide = deuce; e._setupPointServe({ showBanner: false });
    const box = deuce ? -1 : 1, power = .9;
    const intent = { shot: 'topspin', power, depth: power, rise: -.08, plane: wide ? -box*.55 : .5, face: wide ? box : 0 };
    if (NO.serveChoiceRules) NO.serveChoiceRules.off = !!off;
    e._handleUserTossInput({});
    for (let i = 0; i < 400 && e.phase === 'SERVE_TOSS' && e.ball.vel.y/9.15 > tau; i++) e.step(DT);
    const c0 = e.ball.pos.clone();
    e._handleUserSwingInput({ source: 'prova', side: 'overhead', shotType: 'topspin', speed: .8 + power*.85, dirX: 0, natpf: { aim: 'swing', shot: 'topspin', intent, power, latency: 0, hand: 'right' } });
    const s = e.natpfLastServe, sv = e.natpfSkill.serve, v = e.ball.vel.clone();
    let bounce = null, atCpu = null;
    for (let i = 0; i < 400 && e.phase === 'RALLY'; i++){ const b0 = e.ball.bounceCountOnCurrentSide; e.step(DT); if (!bounce && b0 === 0 && e.ball.bounceCountOnCurrentSide === 1) bounce = { x: +e.ball.pos.x.toFixed(2), z: +e.ball.pos.z.toFixed(2), t: +e.elapsedTime.toFixed(2) }; if (bounce && !atCpu && e.ball.pos.z < e.opponent.pos.z + .1) atCpu = { y: +e.ball.pos.y.toFixed(2), x: +e.ball.pos.x.toFixed(2) }; }
    return { tau, contactY: +c0.y.toFixed(2), kmh: Math.round(v.length()*3.6), vy: +v.y.toFixed(2), x: s?.x, depth: s?.depth, flight: s?.flight, q: s?.q, threat: sv?.threat, sharp: sv?.sharp, late: sv?.late, bounce, atCpu, touched: e.ball.rallyStrokeCount > 1, why: e.lastBannerBroadcast?.call?.why };
  } finally { Math.random = real; if (NO.serveChoiceRules) NO.serveChoiceRules.off = false; }
}
console.log('prima (piano e piatto, a tempo)', JSON.stringify(one({ tau: 0, wide: true, off: true })));
console.log('nuova (dopo il colmo, -0,165)', JSON.stringify(one({ tau: -.165, wide: false })));
console.log('regola di prima ma a -0,165', JSON.stringify(one({ tau: -.165, wide: true, off: true })));
