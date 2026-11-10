// Audit B19 (sfida tra due computer, DU-1): il gesto perfetto del Player 2 arriva all'host con un ritardo (rete e vista
// in ritardo). Motore vero senza grafica; per ogni ritardo N palle con dritto e rovescio, voli da 0,65 a 1,45 s.
// Uso, da natpf-tennis: node --import ./test/register.mjs scripts/audit/b19/ritardo-p2.mjs [--n=300] [--base=5000]
//   [--d=0,20,30,40,50,60,80,100,150,200,irr] [--local=1 (stesso schermo: senza il margine dei 30 ms)]
import * as THREE from 'three';
const { createHeadlessEngine, mulberry32 } = await import('../headless-engine.mjs');
const NI = await import('../../../src/natpf/natpf_impact.js');
const { ENGINE_SHOT } = await import('../../../src/natpf/natpf_gestures.js');
const { landsIn, landingOf } = await import('../../../src/natpf/natpf_shot_feedback.js');
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const N = +(arg('n') || 300), BASE = +(arg('base') || 5000), LOCAL = arg('local') === '1', DT = 1/240;
const DIFF = arg('diff') || '1v1';
function trial({ who, seed, delayS, lat = 0 }){
  const rng = mulberry32(seed); const real = Math.random; Math.random = mulberry32(seed*17 + 3);
  try {
    const e = createHeadlessEngine({ difficulty: DIFF });
    e.startNewMatch({ showStartBanner: false });
    e.isMultiplayer = true; e.versus = { active: true, closing: false, ...(LOCAL ? { local: true } : {}) }; e.playerRole = 'p1'; e.roomId = 'at-vrf';
    let grade = null, whiff = false;
    const hud0 = e.hud;
    e.hud = new Proxy(hud0, { get: (t, k) => k === 'showTimingPopup' ? (o => { const g = String(o?.grade || ''); const p2 = /^P2\b/.test(g); if ((who === 'p2') === p2 && grade == null) grade = g; }) : t[k] });
    e.motionController = { triggerHapticFeedback: ev => { if ((ev.role || 'p1') === who && ev.kind === 'whiff') whiff = true; } };
    const me = who === 'p2' ? e.opponent : e.player, other = who === 'p2' ? e.player : e.opponent, s = who === 'p2' ? -1 : 1;
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = who === 'p2' ? 'player' : 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 4;
    const mx = (rng()*2 - 1)*2.5;
    me.pos.set(mx, 0, s*(11.2 + rng())); me.targetPos.copy(me.pos); me.vel.set(0, 0, 0);
    other.pos.set(0, 0, -s*11.5); other.targetPos.copy(other.pos);
    e.ball.pos.set(rng()*4 - 2, .9 + rng()*.4, -s*(9 + rng()*2.5));
    const flight = .65 + rng()*.8;           // 0,65–1,45 s
    const tx = mx + (rng()*2 - 1)*1.6;       // palla a destra o a sinistra di chi colpisce: dritto e rovescio
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(Math.max(-3.6, Math.min(3.6, tx)), 0, s*(6 + rng()*4.5)), flight, { topspin: 10 + rng()*8 });
    who === 'p2' ? e._natpfPlanOpponent() : e._natpfPlanPlayer();
    const side = (tx - mx)*s >= 0 ? 'forehand' : 'backhand';
    const power = .45 + rng()*.5, face = (rng()*2 - 1)*.6, peak = 600 + power*600;
    const ev = { source: 'natpf-phone', side, shotType: ENGINE_SHOT.topspin, speed: .8 + power*.85, dirX: 0,
      natpf: { aim: 'swing', shot: 'topspin', intent: { depth: power, rise: .2, face, power, shot: 'topspin' }, power, peak, typical: 800, latency: lat, hand: 'right', prepCapable: true, prep: { lead: .3, amount: .8 } } };
    let sendAt = null, sent = false, res = null, vz = null;
    const hitter = who === 'p2' ? 'opponent' : 'player';
    for (let t = 0; t < 6 && e.phase === 'RALLY'; t += DT){
      const ttc = NI.timeToContact(e, me);
      if (sendAt == null && ttc != null && ttc <= 0){ sendAt = e.elapsedTime + delayS; vz = Math.abs(e.ball.vel.z); }
      if (!sent && sendAt != null && e.elapsedTime >= sendAt - 1e-9){ sent = true; who === 'p2' ? e._handleP2SwingInput({ ...ev, role: 'p2' }) : e._handleUserSwingInput(ev); }
      e.step(DT);
      if (e.ball.lastHitter === hitter && e.ball.inPlay){ const L = landingOf(e.ball); res = { hit: true, x: L?.x, in: landsIn(L, { towardNegativeZ: who !== 'p2' }) && !e.ball.natpfNetFault }; break; }
    }
    return { grade, whiff, sent, vz, ...(res || { hit: false }) };
  } finally { Math.random = real; }
}
const cls = r => !r.hit ? 'a vuoto' : /VERY LATE/i.test(r.grade) ? 'molto in ritardo' : /LATE/i.test(r.grade) ? 'in ritardo' : /EARLY/i.test(r.grade) ? 'in anticipo' : /PERFECT|POWER|SUPER/i.test(r.grade) ? 'perfetto' : 'altro:' + r.grade;
const Ds = (arg('d') || '0,20,30,40,50,60,80,100,150,200,irr').split(',');
console.log(`n=${N} base=${BASE} local=${LOCAL} diff=${DIFF}`);
for (const who of ['p1', 'p2']) for (const D of (who === 'p1' ? ['0'] : Ds)){
  const jr = mulberry32(4242), tally = {}; let inC = 0, dx = [], nosend = 0;
  for (let i = 0; i < N; i++){
    const d = D === 'irr' ? (20 + jr()*240)/1000 : +D/1000;
    const r = trial({ who, seed: BASE + i, delayS: d });
    if (!r.sent) { nosend++; continue; }
    const c = cls(r); tally[c] = (tally[c] || 0) + 1; if (r.hit && r.in) inC++;
    if (r.hit && +D !== 0){ const b = trial({ who, seed: BASE + i, delayS: 0 }); if (b.hit && b.x != null && r.x != null) dx.push(Math.abs(r.x - b.x)); }
  }
  const tot = N - nosend, pc = k => (100*(tally[k] || 0)/tot).toFixed(1) + '%';
  dx.sort((a, b) => a - b);
  console.log(`${who} D=${String(D).padEnd(4)} validi ${tot} · perfetto ${pc('perfetto')} · in ritardo ${pc('in ritardo')} · molto in ritardo ${pc('molto in ritardo')} · a vuoto ${pc('a vuoto')} · in campo ${(100*inC/tot).toFixed(1)}% · spost. lato mediano ${dx.length ? dx[dx.length >> 1].toFixed(2) : '-'} m`, JSON.stringify(tally));
}
