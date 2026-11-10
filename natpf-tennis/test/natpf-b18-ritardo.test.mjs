// B18 · tappa 1 del rapporto B16 (docs/b16/rapporto-gameplay.md, difetto 16 / D16): il ritardo della connessione si
// toglie quando si giudica «palla passata». Il limite si calcola dove era la palla al momento del gesto (b.pos − b.vel·lat),
// non dove è all'arrivo del messaggio. Prima, con 130 ms (connessione lenta o ritardo dello schermo impostato dallo staff),
// un colpo appena in ritardo su una palla veloce era «Troppo tardi» a tutti i livelli.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';

const DT = 1/240;
// palla della CPU (volo 0,6 s: veloce; 0,85 s: normale) e un dritto del telefono con tempo «lead» (s dal punto d'impatto,
// negativo = dopo) che arriva al computer «lat» secondi dopo il picco
function attempt(difficulty, lead, lat, flight){
  const real = Math.random; Math.random = mulberry32(17);
  try {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
    e.player.pos.set(1.2, 0, 11.6); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
    e.ball.pos.set(-1, 1.3, -11.5);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(1.9, 0, 8.8), flight, { topspin: 14 });
    e._natpfPlanPlayer();
    const sw = { source: 'natpf-phone', side: 'forehand', shotType: ENGINE_SHOT.topspin, speed: 1.3, dirX: 0,
      natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', conf: .7, power: .6, depth: .6, rise: .3, face: 0 }, power: .6, peak: 1100, typical: 1100, angle: 90, latency: lat, hand: 'right' } };
    let sent = false, at = null;
    for (let t = 0; t < 4; t += DT){
      const ttc = NI.timeToContact(e, e.player);
      if (!sent && ttc != null && ttc <= lead - lat){ sent = true; e._handleUserSwingInput(sw); }
      e.step(DT);
      if (e.ball.lastHitter === 'player' && at == null) at = e.ball.pos.clone();
      if (e.phase !== 'RALLY' || e.ball.lastHitter === 'player') break;
    }
    return { hit: e.ball.lastHitter === 'player', tau: e.natpfLastRacket?.timing ?? null };
  } finally { Math.random = real; }
}

test('D16: lead −0,02 con 130 ms di ritardo colpisce a tutti i livelli (palla veloce e normale)', () => {
  for (const difficulty of ['casual', 'pro', 'leggenda', '1v1']) for (const flight of [.6, .85]){
    const r = attempt(difficulty, -.02, .13, flight);
    assert.ok(r.hit, `${difficulty}, volo ${flight}: mancata`);
    // il tempo del colpo resta quello vero del gesto (lead), non quello dell'arrivo del messaggio
    assert.ok(Math.abs(r.tau + .02) < .01, `${difficulty}: tempo ${r.tau}`);
  }
});

test('D16: con la latenza il limite «palla passata» resta quello senza latenza (non si allarga oltre)', () => {
  for (const difficulty of ['casual', 'pro', 'leggenda']){
    // primo ritardo colpito con 0 e con 35 ms: lo stesso, entro 1 cm di palla (5 ms)
    const first = lat => { let last = null; for (let lead = 0; lead >= -.3; lead -= .005){ if (attempt(difficulty, +lead.toFixed(3), lat, .6).hit) last = +lead.toFixed(3); else break; } return last; };
    const f0 = first(0), f35 = first(.035);
    assert.ok(f0 != null && Math.abs(f0 - f35) <= .0051, `${difficulty}: 0 ms ${f0}, 35 ms ${f35}`);
    // molto in ritardo resta a vuoto anche con la latenza
    assert.equal(attempt(difficulty, f0 - .1, .13, .6).hit, false, `${difficulty}: ${f0 - .1} con 130 ms`);
  }
});

test('D16 (revisione): una latenza negativa (scarto tra gli orologi) non porta la palla in avanti nel giudizio «palla passata»', () => {
  const b = { pos: { x: 1, y: 1, z: 10 }, vel: { x: 2, y: 0, z: 20 } };
  assert.deepEqual(NI.ballAtGesture(b, .1), { x: .8, z: 8 });              // ritardo vero: la palla era 2 m più indietro
  assert.deepEqual(NI.ballAtGesture(b, -.15), { x: 1, z: 10 });             // prima: 3 m più avanti, «palla passata» più severo
  assert.deepEqual(NI.ballAtGesture(b, NaN), { x: 1, z: 10 });
  // nel motore, con −100 ms, lo stesso ultimo colpo in ritardo che senza latenza
  const first = (difficulty, lat) => { let last = null; for (let lead = 0; lead >= -.3; lead -= .005){ if (attempt(difficulty, +lead.toFixed(3), lat, .6).hit) last = +lead.toFixed(3); else break; } return last; };
  for (const difficulty of ['casual', 'pro']){
    const f0 = first(difficulty, 0), fneg = first(difficulty, -.1);
    assert.ok(f0 != null && fneg != null && fneg <= f0 + .0051, `${difficulty}: 0 ms ${f0}, −100 ms ${fneg}`);
  }
});
