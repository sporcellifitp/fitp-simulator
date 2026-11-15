import assert from 'node:assert/strict';
import test from 'node:test';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { exchangeStrokes, nextPartnerMode, partnerAuto, partnerHome, partnerShot, readPartnerMode, writePartnerMode } from '../src/natpf/natpf_doubles.js';
import { partnerRingState } from '../src/natpf/natpf_partner_ring.js';

test('B49: il compagno gioca da solo di base e la scelta persistente può essere forzata dall’indirizzo', () => {
  let saved;
  const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  assert.equal(readPartnerMode({ storage }), 'solo');
  writePartnerMode(nextPartnerMode('solo'), storage);
  assert.equal(readPartnerMode({ storage }), 'gesto');
  assert.equal(readPartnerMode({ search: '?compagno=da-solo', storage }), 'solo');
});

test('B49: pressione e indicatore del compagno rispettano la modalità di gioco', () => {
  const engine = { isDoubles: true, natpfPartner: 'solo', phase: 'RALLY', score: { server: 'player', deuceSide: true }, natpfOwnStrokes: 5,
    ball: { lastHitter: 'opponent', rallyStrokeCount: 30 }, natpfPartnerBall: { stroke: 30, at: 2 }, elapsedTime: 2,
    playerPartner: { pos: { x: -1.4, z: 5.1 } } };
  assert.equal(exchangeStrokes(engine), 12);
  assert.deepEqual(partnerHome(engine), { x: -1.4, z: 5.1 });
  assert.equal(partnerAuto(engine), true);
  assert.equal(partnerRingState(engine).visible, true);
  engine.isMultiplayer = true;
  assert.equal(partnerAuto(engine), false);
  assert.equal(exchangeStrokes(engine), 30);
  assert.equal(partnerRingState(engine).visible, false);
});

test('B49: il compagno autonomo restituisce la palla senza aggiungere un colpo del giocatore', () => {
  const engine = createHeadlessEngine({ difficulty: 'casual' });
  engine.setMatchFormat('doubles'); engine.startNewMatch({ showStartBanner: false });
  engine.playerPartner.pos.set(1.4, 0, 5.1);
  engine.ball.pos.set(1.5, 1.1, 5.1);
  engine.ball.vel.set(0, 0, 18);
  engine.ball.rallyStrokeCount = 3;
  engine._executePartnerReturn();
  assert.equal(engine.natpfTeamHit, 'partner');
  assert.equal(engine.natpfOwnStrokes, 0);
  assert.equal(engine.ball.lastHitter, 'player');
  assert.ok(engine.ball.targetLanding.z < 0);
  const shot = partnerShot({ oppX: 2, rng: () => .7 });
  assert.ok(shot.x < 0 && shot.z < -5.8 && shot.z > -8.4);
});
