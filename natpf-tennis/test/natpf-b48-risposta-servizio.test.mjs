// B48.1 (revisione del B48, difetto medio): la risposta al servizio si gioca dopo il rimbalzo, come nel tennis vero. Il
// servizio lento e profondo della CPU a Bambini (natpf_skill.cpuServePlan, limite di velocità) sale a circa 3,8 m, oltre
// natpf_impact.PLAN.lobApex: il piano di chi risponde sceglieva la «schiacciata prima del rimbalzo», il personaggio correva
// fino a 2,7–5,6 m dalla rete e colpiva al volo (1,1% dei servizi della CPU contro «medio», 1,5% contro «bambino», battuta
// alternata), e il punto continuava. Ora planPlayerIntercept, sulla risposta al servizio, non sceglie né la schiacciata né
// la volée. Le palle del lanciapalle e degli scambi di prova (natpfFeed, anche loro con rallyStrokeCount 1) restano come prima.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import * as NI from '../src/natpf/natpf_impact.js';

function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(30);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
// un servizio della CPU appena battuto (palla, velocità ed effetto di un caso vero delle partite simulate della revisione:
// Bambini, «medio», seme 101), con chi risponde dove lo mette il motore
// (LOW: il servizio piatto e tagliato di Casual, che non sale oltre lobApex)
const HIGH = { vel: [3.393, 4.062, 16.243], spin: [14, 0] }, LOW = { vel: [1.996, 2.137, 18.862], spin: [9, 6] };
function cpuServeBall(e, { feed = false, player = [2.35, 0, 11.54], ball = HIGH } = {}){
  e.phase = 'RALLY';
  Object.assign(e.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1, natpfFeed: feed, shotType: 'TOPSPIN', isPowerShot: false });
  e.ball.pos.set(-1.03, 3.385, -11.79); e.ball.vel.set(...ball.vel); e.ball.spin.set(...ball.spin, 0);
  e.player.pos.set(...player); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
}
const bounceOf = b => NI.predictBall(b).find(s => s.bounces === 1);

test('B48.1: il servizio lento e alto della CPU (apice oltre lobApex) si risponde dopo il rimbalzo, non con la schiacciata al volo', () => {
  withEngine('bambini', e => {
    cpuServeBall(e);
    const apex = Math.max(...NI.predictBall(e.ball).filter(s => s.bounces === 0).map(s => s.y));
    assert.ok(apex > NI.PLAN.lobApex, `il caso della revisione: apice ${apex.toFixed(2)} m oltre ${NI.PLAN.lobApex}`);
    const P = NI.planPlayerIntercept(e, e.player), B = bounceOf(e.ball);
    assert.ok(P && P.kind !== 'smash' && P.kind !== 'volley', `piano ${P?.kind} (prima: «smash» a ${P?.contact?.z} m dalla rete)`);
    assert.ok(['ground', 'stretch'].includes(P.kind), P.kind);
    // il punto d'impatto è dopo il rimbalzo, e chi risponde non va verso la rete
    assert.ok(P.t > B.t && P.contact.z > B.z, `contatto a ${P.contact.z} m (t ${P.t}) dopo il rimbalzo a ${B.z.toFixed(2)} m (t ${B.t.toFixed(2)})`);
    assert.ok(e.player.targetPos.z > B.z, `chi risponde si mette dietro il rimbalzo: ${e.player.targetPos.z.toFixed(2)} m`);
  });
});

test('B48.1: anche da vicino alla rete il servizio non si gioca di volée; il lanciapalle (natpfFeed) resta come prima', () => {
  withEngine('bambini', e => {
    // chi risponde vicino alla rete (posizione fuori dal normale): una volée o una schiacciata costerebbe meno strada
    // (prima: «smash» sul servizio alto, «volley» sul servizio piatto di Casual a 4,7 m dalla rete)
    for (const ball of [HIGH, LOW]){
      cpuServeBall(e, { player: [1.5, 0, 5], ball });
      const P = NI.planPlayerIntercept(e, e.player), B = bounceOf(e.ball);
      assert.ok(P && P.kind !== 'smash' && P.kind !== 'volley' && P.contact.z > B.z, `piano ${P?.kind} a ${P?.contact?.z} (rimbalzo a ${B.z.toFixed(2)})`);
    }
    // la stessa palla dal lanciapalle (allenamento, scambi di prova): la schiacciata al volo resta
    cpuServeBall(e, { feed: true });
    assert.equal(NI.planPlayerIntercept(e, e.player)?.kind, 'smash', 'palla del lanciapalle: schiacciata al volo come prima');
  });
  // nello scambio (non il servizio) la stessa palla si schiaccia al volo come prima
  withEngine('bambini', e => {
    cpuServeBall(e); e.ball.rallyStrokeCount = 4;
    assert.equal(NI.planPlayerIntercept(e, e.player)?.kind, 'smash');
  });
});

test('B48.1: partite simulate a Bambini con la CPU che batte: nessun servizio della CPU colpito prima del rimbalzo', () => {
  // seme e profilo della revisione: prima di B48.1 qui 2 servizi su circa 30 erano colpiti al volo (schiacciata a 2,6–2,8 m
  // dalla rete)
  for (const profile of ['medio', 'bambino']){
    let serves = 0, air = 0, pend = null;
    const setup = e => {
      e.natpfFair = false; e.natpfServeFirst = 'opponent';
      const hit = e._executeServeHit.bind(e);
      e._executeServeHit = (a, evt) => { const was = e.ball.inPlay; hit(a, evt); if (!was && e.ball.inPlay && a === e.opponent){ serves++; pend = true; } };
    };
    const onStep = e => {
      if (!pend) return;
      if (e.ball.lastHitter === 'opponent' && e.ball.bounceCountOnCurrentSide >= 1) pend = null;
      else if (e.ball.lastHitter === 'player'){ air++; pend = null; }
      else if (!e.ball.inPlay) pend = null;
    };
    simulate({ profile, difficulty: 'bambini', points: profile === 'medio' ? 80 : 300, seed: 101, setup, onStep });
    assert.ok(serves > 20, `${profile}: servizi della CPU ${serves}`);
    assert.equal(air, 0, `${profile}: ${air} servizi della CPU su ${serves} colpiti prima del rimbalzo`);
  }
});
