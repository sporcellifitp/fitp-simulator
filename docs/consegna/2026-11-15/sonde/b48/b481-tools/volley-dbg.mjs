// casi di servizio della CPU colpito al volo: piano, posizione di chi risponde, stato della palla al servizio
const ROOT = process.env.ROOT;
const { simulate } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
const seed = +(process.argv[2] || 101), difficulty = process.argv[3] || 'bambini', profile = process.argv[4] || 'medio', points = +(process.argv[5] || 300);
let pend = null, out = [];
const setup = e => {
  e.natpfFair = false; e.natpfServeFirst = 'opponent';
  const hit = e._executeServeHit.bind(e);
  e._executeServeHit = (a, evt) => { const was = e.ball.inPlay; hit(a, evt); if (was || !e.ball.inPlay || a !== e.opponent) return;
    pend = { done: false, ball: { pos: e.ball.pos.toArray(), vel: e.ball.vel.toArray(), spin: [e.ball.spin.x, e.ball.spin.y, e.ball.spin.z] }, player: e.player.pos.toArray(), plan: e.natpfPlan && { kind: e.natpfPlan.kind, contact: e.natpfPlan.contact }, score: { ...e.score }, plans: [] }; };
};
const onStep = e => {
  if (!pend || pend.done) return;
  const k = e.natpfPlan?.kind; if (k && pend.plans.at(-1) !== k) pend.plans.push(k);
  if (e.ball.bounceCountOnCurrentSide >= 1 && e.ball.lastHitter === 'opponent'){ pend.done = true; return; }
  if (e.ball.lastHitter === 'player'){ pend.done = true; out.push({ ...pend, hitAt: e.ball.pos.toArray().map(v => +v.toFixed(2)), playerAt: e.player.pos.toArray().map(v => +v.toFixed(2)) }); }
  if (!e.ball.inPlay) pend.done = true;
};
simulate({ profile, difficulty, points, seed, setup, onStep });
for (const o of out) console.log(JSON.stringify(o));
console.log('casi', out.length);
