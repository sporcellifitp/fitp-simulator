const ROOT = process.env.ROOT;
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const DT = 1/120, G = 9.15;
function kmh(difficulty, evt, tau = 0){
  const real = Math.random; Math.random = mulberry32(5);
  try {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    e.score.server = 'player'; e._setupPointServe({ showBanner: false }); e._handleUserTossInput({});
    for (let i = 0; i < 600 && e.phase === 'SERVE_TOSS' && e.ball.vel.y/G > tau; i++) e.step(DT);
    e._handleUserSwingInput(evt);
    for (let i = 0; i < 120 && e.phase === 'SERVE_TOSS'; i++) e.step(DT);
    return e.phase === 'RALLY' ? Math.round(e.ball.vel.length()*3.6) : e.phase;
  } finally { Math.random = real; }
}
const phone = p => ({ source: 'natpf-phone', side: 'overhead', shotType: 'topspin', speed: .8 + p*.85, dirX: 0, natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power: p, depth: p, rise: -.08, plane: .5, face: 0 }, power: p, latency: 0, hand: 'right' } });
for (const d of ['bambini', 'casual']){
  console.log(d, 'telefono forza 0 / 0,1 / 0,2 / 0,3 / 0,5 (a tempo):', [0, .1, .2, .3, .5].map(p => kmh(d, phone(p))).join(' / '), '· forza 0,1 colpita 0,5 s dopo:', kmh(d, phone(.1), -.5));
  console.log(d, 'mouse (Spazio) a tempo / tardi:', kmh(d, { source: 'keyboard', side: 'overhead', shotType: 'topspin', speed: 1, dirX: 0 }), '/', kmh(d, { source: 'keyboard', side: 'overhead', shotType: 'topspin', speed: 1, dirX: 0 }, -.5));
}
