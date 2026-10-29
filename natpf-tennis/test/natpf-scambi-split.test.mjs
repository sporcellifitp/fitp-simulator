// Scambi della diagnostica del 29/10, 10:47 (stesso schermo, due telefoni):
//   • il Player 2 schiacciava le risposte al servizio da fondo campo con il gesto del pallonetto: per il P2 valeva ancora
//     la regola di prima (ogni palla sopra 1,78 m è una schiacciata), per il P1 quella del gesto (smashAt);
//   • sulle palle forti e profonde del P2 (10,5–11,6 m dalla rete) il piano di chi gioca era sul rimbalzo, con la palla a
//     7 cm da terra: una è finita in rete.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';

const DT = 1/120;
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(17);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
const phoneSwing = (intent, { side = 'forehand' } = {}) => ({ source: 'natpf-phone', side, hand: 'right', shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, ...intent }, power: intent.power, peak: 900, latency: 0, hand: 'right' } });

// palla rimbalzata nella metà del P2, già all'altezza y, a un passo da lui: il gesto arriva e il colpo parte subito
function p2HighBall(e, y){
  e.isMultiplayer = true; e.versus = { active: true }; e.natpfP2Hand = 'right';
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 1;
  e.opponent.pos.set(1, 0, -11.5); e.opponent.targetPos.copy(e.opponent.pos); e.opponent.vel.set(0, 0, 0);
  e.ball.pos.set(.3, y, -10.4); e.ball.vel.set(0, .3, -7); e.ball.spin.set(0, 0, 0); e.natpfPlanP2 = null;
}
function p2Hit(e, swing){
  e._handleP2SwingInput(swing);
  for (let t = 0; t < 1; t += DT){ const b = e.ball.lastHitter, y = e.ball.pos.y; e.step(DT); if (b === 'player' && e.ball.lastHitter === 'opponent') return { y, shot: e.natpfLastRacket?.out?.shot, swing: e.opponent.swingType }; }
  return null;
}

test('Player 2 con il telefono: sulla palla a 1,95 m il pallonetto resta pallonetto e il dritto resta dritto; sopra 2,3 m è schiacciata (come il P1)', () => {
  for (const [shot, y, want] of [['lob', 1.95, 'LOB'], ['topspin', 1.95, 'TOPSPIN'], ['lob', 2.6, 'SMASH']]){
    const r = withEngine('1v1', e => { p2HighBall(e, y); return p2Hit(e, phoneSwing({ shot, power: .5 })); });
    assert.ok(r, `${shot} a ${y} m: colpita`);
    assert.equal(r.shot, want, `${shot} a ${y} m: ${JSON.stringify(r)}`);
    assert.equal(r.swing === 'smash', want === 'SMASH');
  }
  // il gesto dall'alto (schiacciata) a 1,95 m resta una schiacciata
  const s = withEngine('1v1', e => { p2HighBall(e, 1.95); return p2Hit(e, phoneSwing({ shot: 'smash', power: .8, rise: -.3 })); });
  assert.equal(s?.shot, 'SMASH', JSON.stringify(s));
});

test('palla forte e profonda (rimbalzo a 11,6 m, 26 m/s): il piano non è sul rimbalzo ma più indietro, con la palla sopra mezzo metro', () => {
  withEngine('1v1', e => {
    // registro, t 30812: colpo del P2 da 15,3 m, p [-1.03, 1.06, -15.32], v [-2.5, 4.5, 36]; con questo effetto rimbalza
    // a 11,6 m come nella partita
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 4;
    e.ball.pos.set(-1.03, 1.06, -15.32); e.ball.vel.set(-2.5, 4.5, 36); e.ball.spin.set(22, 0, 0);
    e.player.pos.set(-2.4, 0, 11.7); e.player.targetPos.copy(e.player.pos);
    const bounce = NI.predictBall(e.ball).find(p => p.bounces === 1);
    assert.ok(bounce && bounce.z > 11 && bounce.z < 11.9, `rimbalzo a ${bounce?.z}`);
    const plan = NI.planPlayerIntercept(e, e.player);
    assert.equal(plan.kind, 'ground');
    assert.ok(plan.contact.y >= .45, `palla all'impatto a ${plan.contact.y} m (prima 0,075: sul rimbalzo)`);
    assert.ok(plan.contact.z > 12.5 && plan.contact.z <= NI.PLAN.deepBack + .01, `impatto a z ${plan.contact.z}`);
    assert.ok(e.player.targetPos.z > plan.contact.z, 'chi gioca sta dietro il punto d\'impatto');
  });
  // una palla profonda normale (lenta, alta) resta presa all'altezza comoda entro maxBack, come prima
  withEngine('1v1', e => {
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 4;
    e.ball.pos.set(-.5, 1, -11); e.player.pos.set(.4, 0, 11.7); e.player.targetPos.copy(e.player.pos);
    e._launchBallToTarget(e.ball.pos, new THREE.Vector3(1.6, 0, 10.6), 1.2, { topspin: 14 });
    const plan = NI.planPlayerIntercept(e, e.player);
    assert.ok(plan.contact.y >= NI.PLAN.comfort[0] && Math.abs(plan.contact.z) <= NI.PLAN.apexBack + .01, JSON.stringify(plan.contact));
  });
});
