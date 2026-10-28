// Split screen (28/10): 1v1 sullo stesso computer con due telefoni. Il secondo telefono è il Player 2 locale: i suoi
// colpi arrivano all'avversario come quelli del P2 in rete, vede la partita dal lato del P2 e riceve i suoi esiti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './ui-world.mjs';
import { NatpfPhoneRacket, phoneGamePhase, ballMovingAway, expectedStrokeDir } from '../src/natpf/natpf_phone_racket.js';

// telefono finto già pronto (sensori attivi e calibrazione fatta), come quello del mondo di prova
function fakeLink(){
  return { connected: true, ready: true, L: { state: 'connected', phone: 'ready' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){} };
}
async function splitWorld(){
  const w = await makeWorld({ controller: 'phone' });
  w.link.cmd('skip');
  const P2 = new NatpfPhoneRacket(w.E, { role: 'p2' });
  P2.link = fakeLink(); w.E.natpfPhone2 = P2;
  // sessione 1v1 locale come la apre lo split screen (natpf_split.js): nessuna stanza in rete
  w.E.versus = { active: true, closing: false, local: true }; w.E._applyDifficultyTuning('1v1');
  w.E.autoPlayMode = false; w.E.startNewMatch({ showStartBanner: false });
  return { ...w, P2 };
}

test('secondo telefono: è il Player 2 locale, con mano e gesti imparati salvati a parte', async () => {
  const { E, P2 } = await splitWorld();
  assert.equal(P2.role, 'p2'); assert.equal(P2.localP2, true); assert.equal(P2.actor, E.opponent);
  assert.equal(E.natpfPhone.role, 'p1'); assert.equal(E.natpfPhone.localP2, false);
  P2.setHand('left');
  assert.equal(localStorage.getItem('natpf-tennis.hand.p2'), 'left');
  assert.notEqual(localStorage.getItem('natpf-tennis.hand'), 'left', 'la mano del P1 non cambia');
  // il P2 locale non tocca lo stato del telefono del motore (inclina la racchetta del P1)
  const before = JSON.stringify(E.motionController.phoneState);
  P2._syncPhoneState(); assert.equal(JSON.stringify(E.motionController.phoneState), before);
});

test('secondo telefono: vede la partita dal lato del P2 (fase, palla che si allontana, verso atteso)', async () => {
  const { E, P2 } = await splitWorld();
  E.phase = 'SERVE_STANCE'; E.score.server = 'opponent';
  assert.equal(phoneGamePhase(E, 'p2'), 'serve'); assert.equal(phoneGamePhase(E), 'play', 'per il P1 non è il suo servizio');
  E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent';
  assert.equal(ballMovingAway(E, 'p2'), true); assert.equal(ballMovingAway(E), false);
  // palla del P1 verso il P2 (z negativa), a destra del P2 guardando la rete (x negativa sul campo)
  E.ball.lastHitter = 'player'; E.ball.vel.set(0, 0, -12); E.opponent.pos.set(0, 0, -11);
  E.ball.targetLanding = { x: -2.5, z: -10 };
  assert.equal(expectedStrokeDir(E, 'right', 'p2'), 1, 'dritto del P2 destro');
  P2.update();
  assert.ok(P2.link.sent.some(m => m.t === 'ph' && m.ph === 'play'));
});

test('secondo telefono: lancio e servizio del P2 arrivano all’avversario (non al P1)', async () => {
  const { E, P2 } = await splitWorld();
  E.phase = 'SERVE_STANCE'; E.score.server = 'opponent';
  P2._onToss();
  assert.equal(E.phase, 'SERVE_TOSS', 'il P2 lancia la palla');
  // colpo verso il punto più alto del lancio (il motore ignora un gesto nei primi 0,16 s): servizio del P2
  let t = 0; while (E.phaseTimer < 0.3 && t++ < 400) E.update(1/120);
  P2._onSwing({ dir: 1, power: .9, peak: 700, at: performance.now()/1000 - .03 });
  for (let i = 0; i < 60 && E.phase === 'SERVE_TOSS'; i++) E.update(1/60);
  assert.equal(E.phase, 'RALLY'); assert.equal(E.ball.lastHitter, 'opponent', 'ha servito il P2');
});

test('secondo telefono: riceve solo i propri esiti', async () => {
  const { E, P2 } = await splitWorld();
  const p1 = E.natpfPhone.link.sent.length;
  E.motionController.triggerHapticFeedback({ role: 'p2', kind: 'point_won', grade: 'POINT WON!' });
  assert.ok(P2.link.sent.some(m => m.t === 'ev' && m.k === 'point' && m.mine));
  assert.equal(E.natpfPhone.link.sent.filter(m => m.t === 'ev').length, E.natpfPhone.link.sent.slice(0, p1).filter(m => m.t === 'ev').length, 'il P1 non riceve l’esito del P2');
});
