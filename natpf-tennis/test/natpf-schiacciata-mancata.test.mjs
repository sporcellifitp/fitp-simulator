// Diagnostica del 30/10 (20261030-142438, C7): piano «smash» su un pallonetto profondo, gesto in ritardo (colpo a vuoto),
// la palla rimbalza a 11 m alle spalle di chi gioca e il punto è perso: il piano si faceva solo al colpo dell'avversario e
// nessuno lo rifaceva. Ora, passata la finestra in ritardo senza colpo, il piano si rifà sui punti dopo il rimbalzo (una
// volta sola) e chi gioca arretra. Come test/natpf-corsa-a-rete.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';

const DT = 1/120;
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(30);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
// pallonetto dell'avversario (dall'altra metà) verso il fondo di chi gioca, che è a metà campo
function lob(e, actor, { fromZ, toZ, toX = .4, flight = 1.9, topspin = 18 }){
  const s = Math.sign(actor.pos.z);
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = actor === e.opponent ? 'player' : 'opponent';
  e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 5;
  e.ball.pos.set(-.6, 1, -s*fromZ); e.ball.vel.set(0, 0, 0);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(toX, 0, s*toZ), flight, { topspin });
  e.ball.spin.set(topspin, 0, 0);
}
// passo del gioco senza nessun colpo di chi gioca: piani visti, posizione di chi gioca al rimbalzo e alla fine
function run(e, actor, key, steps = 400){
  const plans = [], seen = new Set(); let bounce = null;
  for (let i = 0; i < steps && e.phase === 'RALLY'; i++){
    e.step(DT);
    const P = e[key]; if (P && !seen.has(P)){ seen.add(P); plans.push(P); }
    if (!bounce && e.ball.bounceCountOnCurrentSide === 1 && Math.sign(e.ball.pos.z) === Math.sign(actor.pos.z)) bounce = { z: e.ball.pos.z, actorZ: actor.pos.z, t: e.elapsedTime };
  }
  return { plans, bounce };
}

test('C7: schiacciata prevista e non colpita: passata la finestra in ritardo il piano si rifà dopo il rimbalzo e chi gioca arretra', () => {
  withEngine('pro', e => {
    e.player.pos.set(.4, 0, 6.8); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
    lob(e, e.player, { fromZ: 10.5, toZ: 10.9 });
    const P = NI.planPlayerIntercept(e, e.player);
    assert.equal(P?.kind, 'smash', JSON.stringify(P && { kind: P.kind, contact: P.contact }));
    const smashZ = P.contact.z;
    const { plans, bounce } = run(e, e.player, 'natpfPlan');
    const re = plans.filter(p => p.replan);
    assert.equal(re.length, 1, `piani rifatti: ${re.length} (${plans.map(p => p.kind).join(', ')})`);
    assert.ok(['ground', 'stretch'].includes(re[0].kind), re[0].kind);
    assert.ok(re[0].at >= P.at + P.t, `rifatto solo dopo il punto d'impatto della schiacciata (${re[0].at} < ${P.at + P.t})`);
    assert.ok(re[0].contact.z > smashZ + 1, `nuovo contatto dopo il rimbalzo: ${re[0].contact.z} (schiacciata a ${smashZ})`);
    assert.ok(bounce, 'la palla rimbalza nella metà di chi gioca');
    assert.ok(e.player.pos.z > smashZ + .5, `chi gioca arretra: da ${smashZ.toFixed(2)} a ${e.player.pos.z.toFixed(2)}`);
  });
});

test('C7: rifatto al massimo una volta per colpo, mai prima della finestra in ritardo e mai se la palla è stata colpita', () => {
  withEngine('pro', e => {
    e.player.pos.set(.4, 0, 6.8); e.player.targetPos.copy(e.player.pos);
    lob(e, e.player, { fromZ: 10.5, toZ: 10.9 });
    const P = NI.planPlayerIntercept(e, e.player);
    assert.equal(P.kind, 'smash');
    // subito dopo il punto d'impatto, dentro la finestra in ritardo: ancora no
    e.elapsedTime = P.at + P.t + .01;
    assert.equal(NI.missedPlan(e, e.player), false);
    // palla già colpita da chi gioca: no
    e.elapsedTime = P.at; e.ball.lastHitter = 'player';
    e.elapsedTime = P.at + P.t + .5;
    assert.equal(NI.missedPlan(e, e.player), false);
    // un piano già rifatto non si rifà
    e.ball.lastHitter = 'opponent';
    e.natpfPlan = { ...P, replan: true };
    assert.equal(NI.missedPlan(e, e.player), false);
    // un piano dopo il rimbalzo («ground») non si rifà
    e.natpfPlan = { ...P, kind: 'ground' };
    assert.equal(NI.missedPlan(e, e.player), false);
  });
});

test('C7: lo stesso per il Player 2 del 1v1 (piano natpfPlanP2)', () => {
  withEngine('1v1', e => {
    e.isMultiplayer = true;
    e.opponent.pos.set(-.4, 0, -6.8); e.opponent.targetPos.copy(e.opponent.pos); e.opponent.vel.set(0, 0, 0);
    lob(e, e.opponent, { fromZ: 10.5, toZ: 10.9 });
    const P = NI.planPlayerIntercept(e, e.opponent);
    assert.equal(P?.kind, 'smash', JSON.stringify(P && { kind: P.kind, contact: P.contact }));
    // il P2 non ha swing in attesa: i suoi colpi arrivano dal telefono (qui nessuno)
    const { plans } = run(e, e.opponent, 'natpfPlanP2');
    const re = plans.filter(p => p.replan);
    assert.equal(re.length, 1, plans.map(p => p.kind).join(', '));
    assert.ok(re[0].contact.z < P.contact.z - 1, `dopo il rimbalzo: ${re[0].contact.z} (schiacciata a ${P.contact.z})`);
    assert.ok(e.opponent.pos.z < P.contact.z - .5, `il P2 arretra: ${e.opponent.pos.z.toFixed(2)}`);
  });
});

test('C7: la schiacciata colpita in tempo non cambia (nessun piano rifatto)', () => {
  withEngine('pro', e => {
    e.player.pos.set(.4, 0, 6.8); e.player.targetPos.copy(e.player.pos);
    lob(e, e.player, { fromZ: 10.5, toZ: 10.9 });
    const P = NI.planPlayerIntercept(e, e.player);
    const plans = [];
    let hit = false;
    for (let i = 0; i < 400 && e.phase === 'RALLY'; i++){
      if (!hit && e.elapsedTime >= P.at + P.t - .05){ hit = true; e._handleUserSwingInput({ source: 'audit', side: 'overhead', shotType: 'smash', speed: 1.5, dirX: 0 }); }
      e.step(DT);
      if (e.natpfPlan && !plans.includes(e.natpfPlan)) plans.push(e.natpfPlan);
      if (e.ball.lastHitter === 'player') break;
    }
    assert.equal(e.ball.lastHitter, 'player', 'schiacciata colpita');
    assert.equal(plans.filter(p => p.replan).length, 0);
  });
});
