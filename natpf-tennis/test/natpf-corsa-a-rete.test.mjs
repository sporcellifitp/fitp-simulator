// Diagnostica del 29/10 (1v1 sullo stesso schermo): tra un colpo e l'altro il personaggio di chi gioca correva a rete a
// vuoto e perdeva il punto («Nice Shot!», due volte). Il Player 2 colpiva in ritardo da dietro la sua riga di fondo
// (15,4 m e 14,7 m dalla rete): la traiettoria prevista finiva al primo passo (oltre 14,5 m), il piano diventava «stretch»
// verso la palla nell'altra metà e la posizione veniva portata a 1,2 m dalla rete. Il piano è lo stesso per chi gioca
// contro la CPU, nel 1v1, sullo stesso schermo e nell'allenamento, e per il Player 2 (natpf_impact.planPlayerIntercept).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';

function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(29);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
// palla colpita dall'altra metà: posizione, velocità ed effetto come nel registro
function ballFrom(e, { pos, vel, spin = 14, lastHitter = 'opponent' }){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = lastHitter; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 6;
  e.ball.pos.set(...pos); e.ball.vel.set(...vel); e.ball.spin.set(spin, 0, 0);
}

test('29/10: palla del Player 2 colpita da 15,4 m (dietro la sua riga di fondo): chi gioca la aspetta a fondo campo, non corre a rete', () => {
  withEngine('1v1', e => {
    e.player.pos.set(-1.6, 0, 9.2); e.player.targetPos.copy(e.player.pos);
    // registro, t 41981: p [-2.38, 0.98, -15.4], v [-0.1, 5.9, 25.3] (topspin del P2 in ritardo)
    ballFrom(e, { pos: [-2.38, .98, -15.4], vel: [-.1, 5.9, 25.3] });
    const plan = NI.planPlayerIntercept(e, e.player);
    assert.ok(plan && plan.kind !== 'stretch', JSON.stringify(plan && { kind: plan.kind, contact: plan.contact }));
    assert.ok(plan.contact.z > 6, `impatto nella propria metà, dietro il rimbalzo: ${plan.contact.z}`);
    assert.ok(e.player.targetPos.z > 8, `posizione a fondo campo, non a rete: ${e.player.targetPos.z}`);
    // prima: traiettoria di un solo punto e posizione a 1,2 m dalla rete
    assert.ok(NI.predictBall(e.ball).length > 20);
  });
  // la seconda volta del registro (t 60721: 14,7 m)
  withEngine('1v1', e => {
    e.player.pos.set(.5, 0, 11.5); e.player.targetPos.copy(e.player.pos);
    ballFrom(e, { pos: [-3.08, 1.46, -14.67], vel: [1.2, 4.8, 24] });
    const plan = NI.planPlayerIntercept(e, e.player);
    assert.ok(plan && plan.kind !== 'stretch' && e.player.targetPos.z > 8, JSON.stringify(plan && { kind: plan.kind, contact: plan.contact, target: e.player.targetPos }));
  });
});

test('lo stesso per il Player 2 (1v1 e stesso schermo): la palla di chi gioca colpita da dietro la propria riga non lo porta a rete', () => {
  withEngine('1v1', e => {
    e.isMultiplayer = true;
    e.opponent.pos.set(1.6, 0, -9.2); e.opponent.targetPos.copy(e.opponent.pos);
    ballFrom(e, { pos: [2.38, .98, 15.4], vel: [.1, 5.9, -25.3], lastHitter: 'player' });
    const plan = NI.planPlayerIntercept(e, e.opponent);
    assert.ok(plan && plan.kind !== 'stretch' && plan.contact.z < -6, JSON.stringify(plan && { kind: plan.kind, contact: plan.contact }));
    assert.ok(e.opponent.targetPos.z < -8, `a fondo campo nella sua metà: ${e.opponent.targetPos.z}`);
  });
});

test('nessuna modalità: da fondo campo, contro una palla profonda (da qualunque punto dell\'altra metà, anche da 17 m), mai la corsa verso la rete', () => {
  const rng = mulberry32(7);
  let n = 0, deep = 0;
  for (const difficulty of ['casual', 'pro', 'leggenda', '1v1']) withEngine(difficulty, e => {
    for (let i = 0; i < 60; i++){
      const fromZ = -(10.5 + rng()*6.5), fromX = (rng() - .5)*8, to = new THREE.Vector3((rng() - .5)*7, 0, 8.6 + rng()*3.2);
      e.player.pos.set((rng() - .5)*3, 0, 11.4 + rng()*1.4); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
      ballFrom(e, { pos: [fromX, .6 + rng()*1.2, fromZ], vel: [0, 0, 0] });
      e._launchBallToTarget(e.ball.pos, to, .8 + rng()*.7, { topspin: 6 + rng()*14 });
      const plan = NI.planPlayerIntercept(e, e.player); n++;
      assert.ok(plan, `${difficulty} #${i}: nessun piano`);
      assert.ok(plan.kind !== 'stretch' || plan.contact.z > 0, `${difficulty} #${i}: corsa verso l'altra metà ${JSON.stringify(plan.contact)}`);
      // al volo o di schiacciata si avanza per scelta, e sulla palla corta (rimbalzo prima della riga del servizio, con
      // l'attrito dell'aria anche se il bersaglio era più in fondo) si va incontro; dopo il rimbalzo di una palla profonda no
      const bounce = NI.predictBall(e.ball).find(p => p.bounces === 1);
      if (bounce && bounce.z >= 7 && (plan.kind === 'ground' || plan.kind === 'stretch')){
        deep++;
        assert.ok(e.player.targetPos.z > 6.5, `${difficulty} #${i}: da ${fromZ.toFixed(1)} m, rimbalzo a ${bounce.z.toFixed(1)} m, posizione a ${e.player.targetPos.z.toFixed(2)} m dalla rete (${plan.kind})`);
      }
    }
  });
  assert.equal(n, 240); assert.ok(deep >= 60, `palle profonde provate: ${deep}`);
});

test('palla che non arriva nella propria metà: chi gioca non si sposta (prima andava a rete)', () => {
  withEngine('casual', e => {
    e.player.pos.set(1, 0, 11.6); e.player.targetPos.set(1, 0, 11.6);
    // palla che va verso l'altra metà
    ballFrom(e, { pos: [0, 1, -6], vel: [0, 4, -20] });
    const plan = NI.planPlayerIntercept(e, e.player);
    assert.equal(plan, null);
    assert.deepEqual([e.player.targetPos.x, e.player.targetPos.z], [1, 11.6]);
    assert.equal(e.natpfPlan, null);
  });
});
