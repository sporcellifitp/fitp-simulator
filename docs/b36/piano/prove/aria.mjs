// B36 piano unico (sola lettura): quanto dello spostamento laterale voluto arriva al rimbalzo vero, con la fisica del
// motore (replica di _launchBallToTarget + fixAir + flyAir, game_engine.js:2825-2851, natpf_skill.js:867-900).
// Si lancia da natpf-tennis della worktree di riferimento: node <questo file> <percorso di natpf-tennis>
const root = process.argv[2];
const NS = await import(`${root}/src/natpf/natpf_skill.js`);
const G = 9.15, DRAG = .012, NETY = .914;
function launch(from, to, flight, topspin, netClear = .34){
  const h = Math.max(.45, flight), r = to.x - from.x, l = to.z - from.z, p = .08 - from.y, g = G + topspin*.14;
  const vel = { x: r/h, y: (p + .5*g*h*h)/h, z: l/h };
  const m = Math.abs(from.z)/Math.max(1, Math.abs(vel.z));
  if (m > 0 && m < h){ const d = from.y + vel.y*m - .5*g*m*m, b = NETY + netClear; if (d < b) vel.y += (b - d)/m; }
  return vel;
}
const rows = [];
for (const hitX of [.72, 3.5, -2.8]) for (const x of [-3.8, -2.5, 0, 2.5, 3.8]) for (const [flight, spin] of [[.95, 18], [.8, 22], [.7, 12]]){
  const from = { x: hitX, y: 1, z: 11.4 }, to = { x, z: -9.5 };
  const vel = launch(from, to, flight, spin);
  const ball = { vel: { ...vel } };
  NS.fixAir(ball, { from, to, topspin: spin, sidespin: 0, gravity: G, drag: DRAG });
  const f = NS.flyAir({ from, vel: ball.vel, topspin: spin, sidespin: 0, gravity: G, drag: DRAG });
  const k = Math.abs(x - hitX) > .5 ? (f.landX - hitX)/(x - hitX) : null;
  rows.push({ hitX, x, flight, spin, landX: +f.landX.toFixed(2), landZ: +f.landZ.toFixed(2), k: k == null ? null : +k.toFixed(3) });
}
const ks = rows.map(r => r.k).filter(v => v != null).sort((a, b) => a - b);
console.log('rimbalzo vero / voluto (di lato), min p50 max:', ks[0], ks[ks.length >> 1], ks[ks.length - 1]);
for (const r of rows.filter(r => r.flight === .95)) console.log(JSON.stringify(r));
