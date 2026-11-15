// Verifica S2/S4/S9/S10: finestra d'impatto nel motore vero con la latenza del telefono. Scritto da zero (non usa window.mjs).
// Il gesto avviene «lead» s prima che la palla arrivi al punto d'impatto (piano); il motore lo riceve lat s dopo, con
// natpf.latency = lat. Si misura: colpito / a vuoto (e perché), voto, ritardo gesto → colpo (o → scritta di errore),
// distanza della palla oltre il punto d'impatto al colpo.
import * as THREE from 'three';
const WT = '/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/wt/natpf-tennis';
const { createHeadlessEngine, mulberry32 } = await import(WT + '/scripts/audit/headless-engine.mjs');
const { ENGINE_SHOT } = await import(WT + '/src/natpf/natpf_gestures.js');
const DT = 1/240;
export function swingEvt({ shot = 'topspin', power = .6, lat = 0, peak = 900, conf = 1, angle = 60, side = 'forehand' } = {}){
  return { source: 'natpf-phone', side, shotType: ENGINE_SHOT[shot], speed: .8 + power*.85, dirX: 0,
    natpf: { aim: 'swing', shot, intent: { shot, power, depth: power, rise: shot === 'lob' ? .8 : shot === 'drop' ? -.4 : .2, face: 0, conf }, power, peak, typical: 900, angle, latency: lat, hand: 'right' } };
}
export function trial(level, { lead, lat, shot = 'topspin', ball = {}, seed = 5, doubles = false } = {}){
  const real = Math.random; Math.random = mulberry32(seed);
  try {
    const e = createHeadlessEngine({ difficulty: level }); e.startNewMatch({ showStartBanner: false });
    if (doubles) e.isDoubles = true;
    const B = { from: [.6, 1.1, -11.2], to: [-1.3, 8.8], flight: .9, topspin: 16, ...ball };
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 2;
    e.player.pos.set(-.2, 0, 11.6); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
    e.ball.pos.set(...B.from);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(B.to[0], 0, B.to[1]), B.flight, { topspin: B.topspin });
    e._natpfPlanPlayer();
    const P = e.natpfPlan; if (!P) return { lead, lat, err: 'no plan' };
    const tC = P.at + P.t, gestureAt = tC - lead;
    let sent = false, strike = null, whiff = null, vzC = null;
    const S = e._attemptPlayerRallyStrike.bind(e);
    e._attemptPlayerRallyStrike = (ev, a) => { const pre = e.ball.lastHitter, bz = e.ball.pos.z, pz = e.player.pos.z, vz = e.ball.vel.z; const r = S(ev, a); if (r && pre !== 'player' && !strike) strike = { at: e.elapsedTime, behind: +(bz - (pz - .35)).toFixed(2), vz: +vz.toFixed(1) }; return r; };
    const W = e._natpfEarlyWhiff.bind(e); e._natpfEarlyWhiff = ps => { if (!whiff) whiff = { at: e.elapsedTime, why: ps?.natpfWhy || 'presto' }; return W(ps); };
    for (let k = 0; k < 4/DT; k++){
      if (!sent && e.elapsedTime >= gestureAt + lat){ sent = true; e._handleUserSwingInput(swingEvt({ shot, lat })); }
      if (vzC == null && e.elapsedTime >= tC) vzC = +e.ball.vel.z.toFixed(1);
      e.step(DT);
      if (strike || (whiff && e.elapsedTime > whiff.at + .2) || e.phase !== 'RALLY') break;
    }
    const R = e.natpfLastRacket;
    return { lead, lat, hit: !!strike, why: strike ? null : whiff?.why || 'nulla', grade: strike ? R?.out?.grade : null,
      ms: Math.round(((strike || whiff)?.at - gestureAt)*1000), behind: strike?.behind ?? null, vzC, planKind: P.kind };
  } finally { Math.random = real; }
}
if (import.meta.url === `file://${process.argv[1]}`){
  const balls = { lenta: { flight: 1.1 }, veloce: { flight: .72, topspin: 20 } };
  for (const level of ['casual', 'pro', 'leggenda']) for (const [bk, ball] of Object.entries(balls)){
    const line = [];
    for (const lat of [0, .035, .08, .13]){
      let maxLate = null, row = '', vz = null;
      for (let L = -.24; L <= .1001; L += .01){
        const lead = +L.toFixed(2), r = trial(level, { lead, lat, ball }); vz = vz ?? r.vzC;
        row += r.hit ? (r.grade === 'PERFECT' ? 'P' : /VERY/.test(r.grade) ? 'v' : r.grade === 'LATE' ? 'l' : 'e') : r.why === 'tardi' ? 'T' : '.';
        if (r.hit && maxLate == null) maxLate = lead;
      }
      line.push(`lat ${lat.toFixed(3)} primo colpito ${maxLate}  ${row}`);
      if (lat === 0) console.log(`${level} ${bk} (vz al punto d'impatto ${vz} m/s) · lead −0,24 → +0,10 a passi di 0,01`);
    }
    console.log('  ' + line.join('\n  '));
  }
}
