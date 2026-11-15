// servizio più lento possibile di chi gioca contro la CPU (km/h veri), per percorso d'ingresso
const ROOT = process.env.ROOT;
const { createHeadlessEngine, mulberry32 } = await import(`${ROOT}/scripts/audit/headless-engine.mjs`);
const DT = 1/120, G = 9.15;
function serve(difficulty, evt, { seed = 5, tau = 0, deuce = true, webcam = false, y = null } = {}){
  const real = Math.random; Math.random = mulberry32(seed);
  try {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    if (webcam) e.motionController = { webcamMode: 'argon' };
    e.score.server = 'player'; e.score.deuceSide = deuce; e._setupPointServe({ showBanner: false }); e._handleUserTossInput({});
    if (y == null) for (let i = 0; i < 600 && e.phase === 'SERVE_TOSS' && e.ball.vel.y/G > tau; i++) e.step(DT);
    else { let up = true; for (let i = 0; i < 600 && e.phase === 'SERVE_TOSS'; i++){ e.step(DT); if (e.ball.vel.y < 0) up = false; if ((y > 0 ? up : !up) && Math.abs(e.ball.pos.y - Math.abs(y)) < .05) break; } }
    if (e.phase !== 'SERVE_TOSS') return null;
    e._handleUserSwingInput(evt);
    for (let i = 0; i < 160 && e.phase === 'SERVE_TOSS'; i++) e.step(DT);
    return e.phase === 'RALLY' ? e.ball.vel.length()*3.6 : null;
  } finally { Math.random = real; }
}
const phone = (p, { shot = 'topspin', rise = -.08, plane = .5, hand = 'right' } = {}) => ({ source: 'natpf-phone', side: 'overhead', shotType: shot, speed: .8 + p*.85, dirX: 0, natpf: { aim: 'swing', shot, intent: { shot, power: p, depth: p, rise, plane, face: 0 }, power: p, latency: 0, hand } });
const R = {};
let CTX = ""; const note = (k, v) => { if (v == null) return; const r = R[k] || (R[k] = { min: Infinity, max: -Infinity, n: 0 }); if (v < r.min) r.arg = CTX; r.min = Math.min(r.min, v); r.max = Math.max(r.max, v); r.n++; };
const taus = [.4, .3, .2, .1, 0, -.1, -.2, -.3, -.5, -.8];
for (const d of ['casual', 'bambini']) for (const deuce of [true, false]) for (const seed of [1, 2, 3, 4, 5]){
  for (const tau of taus){
    for (const [rise, plane] of [[-.08, .5], [.5, .5], [-.08, 1], [-.5, 0], [.3, -1]]) for (const hand of ['right', 'left']) (CTX = JSON.stringify({ rise, plane, hand, tau, deuce, seed }), note(`${d} telefono forza 0`, serve(d, phone(0, { rise, plane, hand }), { seed, tau, deuce })));
    for (const src of ['keyboard', 'mouse']) for (const shot of ['topspin', 'slice', 'flat', 'lob']) for (const dirX of [-1, 0, 1]) for (const speed of [.5, .8])
      CTX = JSON.stringify({ src, shot, dirX, speed, tau, deuce, seed }), note(`${d} ${src}`, serve(d, { source: src, side: 'overhead', shotType: shot, speed, dirX }, { seed, tau, deuce }));
  }
  for (const y of [1.3, 1.5, 1.7, 1.9, 2.1, 2.5, 3, -3, -2.5, -2, -1.6, -1.3]) for (const speed of [.5, 1, 1.5]) for (const shot of ['topspin', 'slice', 'flat'])
    note(`${d} webcam argon`, serve(d, { source: 'webcam', side: 'overhead', shotType: shot, speed, dirX: 0 }, { seed, deuce, webcam: true, y }));
}
for (const [k, r] of Object.entries(R)) console.log(k.padEnd(28), 'min', r.min.toFixed(2), 'max', r.max.toFixed(2), 'n', r.n, r.arg);
