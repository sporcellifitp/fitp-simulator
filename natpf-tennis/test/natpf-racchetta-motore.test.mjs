// Telefono come racchetta virtuale nel motore vero, senza grafica (docs/NATPF_RACCHETTA_VIRTUALE.md): esito senza caso,
// incrociato e lungolinea, volée e schiacciata al volo, palla corta e pallonetto ripetibili, finestra d'impatto,
// preparazione sostituita dal colpo, palle fuori lasciate andare, servizio dal gesto, scambi che finiscono.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';

const DT = 1/120;
// motore con il generatore casuale fisso (la CPU e il resto del gioco restano vari, ma ripetibili)
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(17);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
// palla della CPU verso chi gioca, che si prepara con il piano d'intercetto
function cpuShot(e, { from = [-.5, 1, -11], to = [1.6, 8.5], flight = 1.05, topspin = 14, player = [.4, 11.7], rally = 3 } = {}){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
  e.player.pos.set(player[0], 0, player[1]); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  e.pendingUserSwing = null;
  e.ball.pos.set(...from);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0], 0, to[1]), flight, { topspin });
  e._natpfPlanPlayer();
  return e.natpfPlan;
}
// colpo del telefono con la sua intenzione (come natpfSwingToEngine con la forma del colpo)
const phoneSwing = (intent, { side = 'forehand', peak = 900 } = {}) => ({ source: 'natpf-phone', side, shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, ...intent }, power: intent.power, peak, latency: 0, hand: 'right' } });
// manda gli swing quando mancano «lead» secondi al punto d'impatto, poi gioca fino al colpo (o alla fine del punto)
function play(e, swings, maxT = 4){
  const queue = [...swings].sort((a, b) => b.lead - a.lead);
  let apex = 0, strike = null;
  const strikeFn = e._attemptPlayerRallyStrike.bind(e);
  e._attemptPlayerRallyStrike = (ev, auto) => { const pz = e.player.pos.z, r = strikeFn(ev, auto); if (r && !strike) strike = { bounces: e.natpfLastRacket?.volley ? 0 : 1, ballZ: null, playerZ: pz }; return r; };
  for (let t = 0; t < maxT; t += DT){
    const ttc = NI.timeToContact(e, e.player);
    while (queue.length && ttc != null && ttc <= queue[0].lead) e._handleUserSwingInput(queue.shift().swing);
    const before = e.ball.lastHitter, zBefore = e.ball.pos.z;
    e.step(DT);
    if (before !== 'player' && e.ball.lastHitter === 'player'){ strike.ballZ = zBefore; strike.at = e.elapsedTime; }
    if (e.ball.lastHitter === 'player') apex = Math.max(apex, e.ball.pos.y);
    if (e.phase !== 'RALLY') break;
    if (strike && e.ball.lastHitter === 'player' && e.ball.pos.z < -1) break;
  }
  return { hit: e.ball.lastHitter === 'player', landing: e.ball.targetLanding.clone(), racket: e.natpfLastRacket, apex, strike, phase: e.phase };
}

test('stessi gesti sulla stessa palla, stesso esito: nessuna componente casuale nel colpo di chi gioca', () => {
  const run = () => withEngine('pro', e => { cpuShot(e); return play(e, [{ lead: .06, swing: phoneSwing({ shot: 'topspin', power: .7, face: .3 }) }]); });
  const a = run(), b = run();
  assert.ok(a.hit && b.hit);
  assert.equal(a.landing.x, b.landing.x); assert.equal(a.landing.z, b.landing.z);
  assert.equal(a.racket.out.x, b.racket.out.x); assert.equal(a.racket.out.depth, b.racket.out.depth);
});

test('incrociato e lungolinea: in anticipo la palla va incrociata, in ritardo lungolinea; il piatto sposta la direzione', () => {
  // dritto del destro con la palla alla sua destra: incrociato = verso sinistra (x negativa)
  const shot = lead => withEngine('casual', e => { cpuShot(e, { to: [1.8, 8.4] }); return play(e, [{ lead, swing: phoneSwing({ shot: 'topspin', power: .7 }) }]); });
  const early = shot(.16), mid = shot(0), late = shot(-.04);
  for (const r of [early, mid, late]) assert.ok(r.hit);
  assert.ok(early.racket.contact > 0, 'palla alla destra di chi colpisce');
  assert.ok(early.landing.x < -1.5, `anticipo ${early.landing.x}`);
  assert.ok(late.landing.x > early.landing.x + 2, `ritardo ${late.landing.x} anticipo ${early.landing.x}`);
  assert.ok(mid.landing.x > early.landing.x && mid.landing.x < late.landing.x);
  const face = f => withEngine('casual', e => { cpuShot(e, { to: [1.8, 8.4] }); return play(e, [{ lead: 0, swing: phoneSwing({ shot: 'topspin', power: .7, face: f }) }]); });
  const right = face(1), left = face(-1);
  assert.ok(right.landing.x - left.landing.x > 2, `${left.landing.x} → ${right.landing.x}`);
});

test('volée: chi è a rete prende la palla prima del rimbalzo', () => {
  withEngine('pro', e => {
    const plan = cpuShot(e, { player: [.2, 4.6], to: [1.2, 9.5], flight: 1.1 });
    assert.equal(plan.kind, 'volley');
    const r = play(e, [{ lead: .03, swing: phoneSwing({ shot: 'flat', power: .6 }) }]);
    assert.ok(r.hit, r.phase);
    assert.equal(r.racket.volley, true);
    assert.ok(r.strike.ballZ < 6.5, `volée a z ${r.strike.ballZ}`);
  });
});

test('schiacciata prima del rimbalzo: palla alta raggiungibile, gesto dall\'alto', () => {
  withEngine('pro', e => {
    // pallonetto corto della CPU (sale oltre 4 m e scende a metà campo)
    const plan = cpuShot(e, { player: [.3, 9.5], to: [.6, 7.2], flight: 2.0, topspin: 4 });
    assert.equal(plan.kind, 'smash', JSON.stringify(plan));
    const r = play(e, [{ lead: .02, swing: phoneSwing({ shot: 'smash', power: .85, rise: -.4 }, { side: 'overhead' }) }]);
    assert.ok(r.hit, r.phase);
    assert.equal(r.racket.out.shot, 'SMASH');
    assert.equal(r.racket.volley, true, 'colpita al volo');
  });
});

test('palla corta e pallonetto ripetibili: stessa intenzione, stesso punto; corta davvero corta, pallonetto alto e profondo', () => {
  const run = intent => withEngine('casual', e => { cpuShot(e, { to: [1.2, 8.6] }); return play(e, [{ lead: .02, swing: phoneSwing(intent) }]); });
  const d1 = run({ shot: 'drop', power: .2, rise: -.4 }), d2 = run({ shot: 'drop', power: .2, rise: -.4 });
  assert.ok(d1.hit && d2.hit);
  assert.deepEqual([d1.landing.x, d1.landing.z], [d2.landing.x, d2.landing.z]);
  assert.ok(Math.abs(d1.landing.z) <= 4.6, `palla corta a ${d1.landing.z}`);
  const l1 = run({ shot: 'lob', power: .5, rise: .8 }), l2 = run({ shot: 'lob', power: .5, rise: .8 });
  assert.deepEqual([l1.landing.x, l1.landing.z], [l2.landing.x, l2.landing.z]);
  assert.ok(Math.abs(l1.landing.z) >= 9, `pallonetto a ${l1.landing.z}`);
  assert.ok(l1.apex >= 4, `pallonetto alto ${l1.apex.toFixed(2)} m`);
});

test('finestra d\'impatto: nessun impatto con la palla lontana; lo swing più forte sostituisce la preparazione', () => {
  withEngine('leggenda', e => {
    cpuShot(e, { to: [1.4, 8.8] });
    const r = play(e, [
      { lead: .38, swing: phoneSwing({ shot: 'slice', power: .1, rise: -.3 }, { side: 'backhand', peak: 250 }) },   // preparazione lenta, verso opposto
      { lead: .05, swing: phoneSwing({ shot: 'topspin', power: .8 }, { peak: 1100 }) },
    ]);
    assert.ok(r.hit);
    assert.equal(r.racket.intent.shot, 'topspin');                       // giocato il colpo, non la preparazione
    assert.ok(Math.abs(r.racket.intent.power - .8) < 1e-9);
    // colpita al punto d'impatto (0,35 m davanti a chi colpisce), non quando era lontana
    assert.ok(Math.abs(r.strike.ballZ - (r.strike.playerZ - .35)) < .5, `palla a ${r.strike.ballZ}, chi colpisce a ${r.strike.playerZ}`);
  });
  // troppo presto (oltre la finestra del livello): a vuoto, la palla passa
  withEngine('leggenda', e => {
    cpuShot(e, { to: [1.4, 8.8] });
    const r = play(e, [{ lead: .7, swing: phoneSwing({ shot: 'topspin', power: .8 }) }]);
    assert.equal(r.hit, false);
  });
});

test('palla che va fuori: chi gioca la lascia andare e il punto è suo', () => {
  withEngine('pro', e => {
    const won = [];
    const award = e._awardPoint.bind(e); e._awardPoint = (who, why) => { won.push(`${who}:${why}`); return award(who, why); };
    const plan = cpuShot(e, { player: [.4, 4.8], to: [5.2, 9], flight: 1 });
    assert.equal(plan.kind, 'letgo');
    const r = play(e, [{ lead: 0, swing: phoneSwing({ shot: 'flat', power: .7 }) }]);
    assert.equal(r.hit, false);
    assert.equal(won[0], 'player:Out');
  });
});

test('servizio dal gesto: stesso gesto stesso servizio; forza, verso e momento del lancio contano; il gesto del lancio non serve', () => {
  const serve = (intent, wait = .62) => withEngine('casual', e => {
    e.phase = 'SERVE_STANCE'; e.score.server = 'player'; e.phaseTimer = 1;
    e._handleUserSwingInput(phoneSwing({ shot: 'topspin', power: .5 }));                 // primo gesto: lancio
    assert.equal(e.phase, 'SERVE_TOSS');
    for (let t = 0; t < wait; t += DT){ e.step(DT); }
    e._handleUserSwingInput(phoneSwing(intent, { side: 'overhead' }));
    return { phase: e.phase, landing: e.ball.targetLanding.clone(), serve: e.natpfLastServe, vel: e.ball.vel.length() };
  });
  const flat = { shot: 'flat', power: .9, rise: -.2, plane: 0 };
  const a = serve(flat), b = serve(flat);
  assert.equal(a.phase, 'RALLY');
  assert.deepEqual([a.landing.x, a.landing.z], [b.landing.x, b.landing.z]);
  assert.ok(a.serve.q > .95 && a.serve.grade === 'POWER SERVE!', JSON.stringify(a.serve));
  const soft = serve({ ...flat, power: .25 });
  assert.ok(soft.vel < a.vel*.8, `${soft.vel} ${a.vel}`);
  const left = serve({ ...flat, plane: .7 }), right = serve({ ...flat, plane: -.7 });
  assert.ok(right.landing.x - left.landing.x > 1, `${left.landing.x} → ${right.landing.x}`);
  assert.equal(left.serve.kind, 'slice');
  assert.equal(serve({ ...flat, rise: .4 }).serve.kind, 'kick');
  const early = serve(flat, .3);
  assert.ok(early.serve.q < a.serve.q, `presto q ${early.serve.q}`);
  // un gesto subito dopo il lancio fa parte del lancio: non serve
  const tooSoon = serve(flat, .2);
  assert.equal(tooSoon.phase, 'SERVE_TOSS');
});

test('scambi che finiscono: nessuno scambio infinito con il giocatore più regolare, a ogni livello', () => {
  for (const difficulty of ['casual', 'pro', 'leggenda']){
    const r = simulate({ profile: 'tennista', difficulty, points: 30, seed: 4 });
    assert.equal(r.capped, 0, `${difficulty}: ${r.maxHits} colpi`);
    assert.ok(r.maxHits < 60, `${difficulty}: ${r.maxHits}`);
  }
});
