// Telefono come racchetta virtuale nel motore vero, senza grafica (docs/NATPF_RACCHETTA_VIRTUALE.md): esito senza caso,
// incrociato e lungolinea, volée e schiacciata al volo, palla corta e pallonetto ripetibili, finestra d'impatto,
// preparazione sostituita dal colpo, palle fuori lasciate andare, servizio dal gesto, scambi che finiscono, Player 2 del
// 1v1 specchiato, diagnostica (esito, piano, servizio e colpi a vuoto nel registro, metriche di ripetibilità).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { simulate, courtStats } from '../scripts/audit/rally-balance.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';
import { DiagRecorder } from '../src/natpf/diag/diag_recorder.js';
import { memoryStore } from '../src/natpf/diag/diag_store.js';
import { computeMetrics, serveWeight, summaryLines } from '../src/natpf/diag/diag_metrics.js';
import { viewerHtml } from '../src/natpf/diag/diag_viewer.js';

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

test('diagnostica: l\'esito del motore porta il numero del colpo del telefono, per legarlo al gesto registrato', () => {
  const sw = phoneSwing({ shot: 'topspin', power: .7 }); sw.natpf.seq = 41;
  const r = withEngine('pro', e => { cpuShot(e); return play(e, [{ lead: .05, swing: sw }]); });
  assert.ok(r.hit);
  assert.equal(r.racket.seq, 41); assert.ok(Number.isFinite(r.racket.at));
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

// Sessione del 28/10: a rete una palla che passa a 2,7 m (non un pallonetto) si giocava di volée a 1,67 m, sotto
// l'altezza della schiacciata: il gesto dall'alto non diventava mai una schiacciata
test('a rete, palla alta che non è un pallonetto: si prende in alto e con il gesto dall\'alto è una schiacciata', () => {
  withEngine('leggenda', e => {
    const plan = cpuShot(e, { player: [.2, 4.6], to: [1.2, 10.5], flight: 1.4, topspin: 8 });
    assert.equal(plan.kind, 'smash', JSON.stringify(plan));
    assert.ok(plan.contact.y >= NI.PLAN.netSmashY, JSON.stringify(plan.contact));
    const r = play(e, [{ lead: .02, swing: phoneSwing({ shot: 'smash', power: .85, rise: -.4 }, { side: 'overhead' }) }]);
    assert.ok(r.hit, r.phase);
    assert.equal(r.racket.out.shot, 'SMASH');
    assert.equal(r.racket.volley, true, 'colpita al volo');
  });
  // la stessa palla vista da fondo campo resta un colpo dopo il rimbalzo; una palla bassa a rete resta una volée
  withEngine('leggenda', e => assert.notEqual(cpuShot(e, { player: [.2, 11.7], to: [1.2, 10.5], flight: 1.4, topspin: 8 }).kind, 'smash'));
  withEngine('pro', e => assert.equal(cpuShot(e, { player: [.2, 4.6], to: [1.2, 9.5], flight: 1.1 }).kind, 'volley'));
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

test('piano vecchio: una palla rimessa in gioco senza piano non usa il tempo del piano di prima (né la palla fuori)', () => {
  const fresh = (planShot, check) => withEngine('pro', e => {
    cpuShot(e, planShot);
    for (let k = 0; k < 6; k++) e.step(DT);
    // palla nuova, buona, rimessa in gioco senza piano (lanciapalle, prova): 0,7 m prima del punto d'impatto a 14 m/s
    e.player.pos.set(.4, 0, 11.4); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
    Object.assign(e.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 1 });
    e.ball.pos.set(.9, 1, 11.05 - .7); e.ball.vel.set(0, 0, 14);
    check(e);
    e._handleUserSwingInput(phoneSwing({ shot: 'topspin', power: .6 }));
    for (let k = 0; k < 120 && e.ball.lastHitter !== 'player' && e.phase === 'RALLY'; k++) e.step(DT);
    return e.ball.lastHitter === 'player';
  });
  // piano di un pallonetto della CPU (contatto fra più di un secondo): prima il tempo veniva da lì, lo swing era
  // «troppo presto» e la palla nuova passava
  assert.ok(fresh({ player: [.3, 9.5], to: [.6, 7.2], flight: 2.0, topspin: 4 }, e => { assert.ok(e.natpfPlan.t > 1); assert.equal(NI.livePlan(e), null); assert.ok(NI.timeToContact(e, e.player) < .1); }));
  // piano «lascia andare» di una palla che andava fuori: la palla nuova si colpisce
  assert.ok(fresh({ player: [.4, 4.8], to: [5.2, 9], flight: 1 }, e => { assert.equal(e.natpfPlan.kind, 'letgo'); assert.equal(NI.livePlan(e), null); }));
});

// 1v1: palla di chi gioca qui verso il Player 2 (metà campo z negative), che si prepara con il suo piano d'intercetto
function p1Shot(e, { from, to, flight, topspin = 14, p2, rally = 3 }){
  e.isMultiplayer = true; e.versus = { active: true }; e.natpfP2Hand = 'right';
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
  e.opponent.pos.set(p2[0], 0, p2[1]); e.opponent.targetPos.copy(e.opponent.pos); e.opponent.vel.set(0, 0, 0);
  e.pendingP2Swing = null;
  e.ball.pos.set(...from);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0], 0, to[1]), flight, { topspin });
  e._natpfPlanOpponent(e.opponent);
  return NI.planOf(e, e.opponent);
}
// la stessa palla di cpuShot specchiata nella metà campo del Player 2 (x → −x, z → −z)
const mirrored = ({ player = [.4, 11.7], from = [-.5, 1, -11], to = [1.6, 8.5], flight = 1.05, topspin = 14 } = {}) =>
  ({ p2: [-player[0], -player[1]], from: [-from[0], from[1], -from[2]], to: [-to[0], -to[1]], flight, topspin });
// il gesto del Player 2 arriva quando la palla è a «gap» metri da lui; poi si gioca fino al suo colpo (o alla fine del punto)
function playP2(e, swing, { gap = 1.7, maxT = 4 } = {}){
  let sent = false, hitZ = null;
  for (let t = 0; t < maxT; t += DT){
    if (!sent && e.ball.lastHitter === 'player' && e.ball.pos.z - e.opponent.pos.z <= gap){ e._handleP2SwingInput(swing); sent = true; }
    const before = e.ball.lastHitter, z = e.ball.pos.z;
    e.step(DT);
    if (before === 'player' && e.ball.lastHitter === 'opponent'){ hitZ = z; break; }
    if (e.phase !== 'RALLY') break;
  }
  return { hit: e.ball.lastHitter === 'opponent', racket: e.natpfLastRacket, hitZ, phase: e.phase, target: e.opponent.targetPos.clone() };
}

test('1v1: il Player 2 si muove con lo stesso piano, specchiato nella sua metà campo (rimbalzo, volée, schiacciata al volo, palla fuori)', () => {
  const cases = [
    { kind: 'ground', shot: { to: [1.6, 8.5] } },
    { kind: 'volley', shot: { player: [.2, 4.6], to: [1.2, 9.5], flight: 1.1 } },
    { kind: 'smash', shot: { player: [.3, 9.5], to: [.6, 7.2], flight: 2.0, topspin: 4 } },
    { kind: 'letgo', shot: { player: [.4, 4.8], to: [5.2, 9], flight: 1 } },
  ];
  for (const c of cases){
    const p1 = withEngine('pro', e => ({ plan: cpuShot(e, c.shot), target: e.player.targetPos.clone() }));
    const p2 = withEngine('pro', e => ({ plan: p1Shot(e, mirrored(c.shot)), target: e.opponent.targetPos.clone() }));
    assert.equal(p1.plan.kind, c.kind);
    assert.equal(p2.plan.kind, c.kind, JSON.stringify(p2.plan));
    const near = (a, b) => Math.abs(a + b) < .02;   // specchiati
    assert.ok(near(p1.plan.contact.x, p2.plan.contact.x) && near(p1.plan.contact.z, p2.plan.contact.z), `${c.kind}: ${JSON.stringify(p1.plan.contact)} / ${JSON.stringify(p2.plan.contact)}`);
    assert.ok(near(p1.target.x, p2.target.x) && near(p1.target.z, p2.target.z), `${c.kind}: ${p1.target.toArray()} / ${p2.target.toArray()}`);
  }
  const p2Swing = (intent, side = 'forehand') => ({ ...phoneSwing(intent, { side }), hand: 'right' });
  // a rete il P2 prende la palla al volo; poi resta a rete
  withEngine('pro', e => {
    p1Shot(e, mirrored({ player: [.2, 4.6], to: [1.2, 9.5], flight: 1.1 }));
    const r = playP2(e, p2Swing({ shot: 'flat', power: .6 }));
    assert.ok(r.hit, r.phase);
    assert.equal(r.racket.who, 'p2'); assert.equal(r.racket.volley, true);
    assert.ok(r.hitZ > -6.5, `volée a z ${r.hitZ}`);
    assert.ok(Math.abs(r.target.z + NI.PLAN.netZ) < 1e-9, `dopo la volée verso ${r.target.z}`);
  });
  // pallonetto corto: schiacciata al volo
  withEngine('pro', e => {
    p1Shot(e, mirrored({ player: [.3, 9.5], to: [.6, 7.2], flight: 2.0, topspin: 4 }));
    const r = playP2(e, p2Swing({ shot: 'smash', power: .85, rise: -.4 }, 'overhead'), { gap: 2.2 });
    assert.ok(r.hit, r.phase);
    assert.equal(r.racket.out.shot, 'SMASH'); assert.equal(r.racket.volley, true);
  });
  // palla che va fuori: il P2 la lascia andare e il punto è suo
  withEngine('pro', e => {
    const won = [];
    const award = e._awardPoint.bind(e); e._awardPoint = (who, why) => { won.push(`${who}:${why}`); return award(who, why); };
    p1Shot(e, mirrored({ player: [.4, 4.8], to: [5.2, 9], flight: 1 }));
    const r = playP2(e, p2Swing({ shot: 'flat', power: .7 }));
    assert.equal(r.hit, false);
    assert.equal(won[0], 'opponent:Out');
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
  // B18 (D12): il tipo si giudica rispetto al servizio abituale (SERVE.habit, |piano| 0,55): tagliato da |piano| 0,8
  const left = serve({ ...flat, plane: .9 }), right = serve({ ...flat, plane: -.9 });
  assert.ok(right.landing.x - left.landing.x > 1, `${left.landing.x} → ${right.landing.x}`);
  assert.equal(left.serve.kind, 'slice');
  assert.equal(serve({ ...flat, rise: .4 }).serve.kind, 'kick');
  const early = serve(flat, .3);
  assert.ok(early.serve.q < a.serve.q, `presto q ${early.serve.q}`);
  // un gesto subito dopo il lancio fa parte del lancio: non serve
  const tooSoon = serve(flat, .2);
  assert.equal(tooSoon.phase, 'SERVE_TOSS');
});

test('scambi che finiscono e dinamici: nessuno scambio infinito; palle lasciate andare, tagliati, pallonetti; volée e schiacciate quando la palla le chiede, mai la corsa a rete senza motivo', () => {
  const all = { shots: {}, volleys: 0, plans: {} };
  for (const difficulty of ['casual', 'pro', 'leggenda']) for (const seed of [4, 7]){
    const r = simulate({ profile: 'tennista', difficulty, points: 30, seed });
    assert.equal(r.capped, 0, `${difficulty}: ${r.maxHits} colpi`);
    assert.ok(r.maxHits < 60, `${difficulty}: ${r.maxHits}`);
    // a ogni livello le palle che vanno fuori si lasciano andare
    assert.ok(r.racket.plans.letgo > 0, `${difficulty}: ${JSON.stringify(r.racket)}`);
    // movimento (campo aperto, fase C): dopo il colpo si torna verso il fondo; verso la rete solo quando una palla
    // corta ha portato lì e non c'è il tempo di tornare (prima 46–89% dei colpi, anche dal fondo). Il criterio è «mai dal
    // fondo» (toNetFromBackPct 0); il tetto sul totale è di sicurezza: B17.4 (revisione, bordo laterale del colpo controllato)
    // a Leggenda con il seme 7 i colpi controllati a rete restano in campo e lo scambio continua a rete (10,8% di mosse verso
    // la rete, tutte da palla corta; era 5,6%)
    const c = courtStats([r]);
    assert.ok(c.toNetPct < 15 && c.toNetFromBackPct === 0, `${difficulty}: ${JSON.stringify(c)}`);
    all.volleys += r.racket.volleys;
    for (const [k, v] of Object.entries(r.racket.shots)) all.shots[k] = (all.shots[k] || 0) + v;
    for (const [k, v] of Object.entries(r.racket.plans)) all.plans[k] = (all.plans[k] || 0) + v;
  }
  // volée e schiacciate restano, dove la palla le chiede (palle corte e pallonetti di Leggenda)
  assert.ok(all.volleys > 0 && all.shots.SMASH > 0 && all.plans.smash > 0, JSON.stringify(all));
  assert.ok(all.shots.SLICE > 0 && all.shots.LOB > 0, JSON.stringify(all));
});

test('swing corto e ampio nel motore: alla stessa forza il colpo corto rimbalza un poco più vicino alla rete', () => {
  // profondità voluta = forza × (0,8 + 0,2 × ampiezza): swing di 35° (ampiezza 0,07) e di 100° (1)
  const run = depth => withEngine('casual', e => { cpuShot(e, { to: [1.2, 8.6] }); return play(e, [{ lead: .02, swing: phoneSwing({ shot: 'topspin', power: .6, depth }) }]); });
  const short = run(.6*(.8 + .2*.07)), wide = run(.6);
  assert.ok(short.hit && wide.hit);
  assert.ok(Math.abs(short.landing.z) < Math.abs(wide.landing.z) - .2, `corto ${short.landing.z}, ampio ${wide.landing.z}`);
});

test('diagnostica: esito, piano, servizio e colpi a vuoto nel registro; ripetibilità nelle metriche; rapporto valido', async t => {
  globalThis.requestAnimationFrame ??= cb => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame ??= id => clearTimeout(id);
  const real = Math.random; Math.random = mulberry32(17);
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
    let now = 1000;
    const store = memoryStore();
    const R = new DiagRecorder({ engine: e, ui: { controller: 'phone', hand: { hand: 'right' }, training: { active: false } }, store, now: () => now, wallNow: () => Date.UTC(2026, 9, 22, 10, 0, 0) });
    const id = await R.start({ webcamVideo: false, gameVideo: false });
    t.after(() => { if (R.active) R.stop(); });
    // tre volte lo stesso gesto sulla stessa palla, poi uno swing troppo presto
    for (let i = 0; i < 3; i++){ now += 3000; cpuShot(e); play(e, [{ lead: .04, swing: phoneSwing({ shot: 'topspin', power: .7, face: .2 }) }]); }
    now += 3000; cpuShot(e, { to: [1.4, 8.8] }); play(e, [{ lead: .9, swing: phoneSwing({ shot: 'topspin', power: .8 }) }]);
    // servizio dal gesto
    now += 3000; e.phase = 'SERVE_STANCE'; e.score.server = 'player'; e.phaseTimer = 1; e.ball.inPlay = false;
    e._handleUserSwingInput(phoneSwing({ shot: 'topspin', power: .5 }));
    for (let k = 0; k < 75; k++) e.step(DT);
    e._handleUserSwingInput(phoneSwing({ shot: 'flat', power: .9, rise: -.2, plane: 0 }, { side: 'overhead' }));
    await R.flush();
    const ev = (await (await store.file(id, 'eventi.jsonl')).text()).trim().split('\n').map(l => JSON.parse(l));
    const of = k => ev.filter(x => x.k === k);
    const rk = of('racchetta');
    assert.equal(rk.length, 3);
    for (const x of rk){ assert.equal(x.chi, 'player'); assert.equal(x.voluto, 'topspin'); assert.equal(x.x, rk[0].x); assert.equal(x.z, rk[0].z); }
    assert.ok(of('piano').filter(p => p.chi === 'giocatore' && p.tipo === 'ground').length >= 4);
    assert.deepEqual(of('vuoto').map(v => v.perche), ['presto']);
    const sv = of('servizio');
    assert.equal(sv.length, 1); assert.equal(sv[0].chi, 'giocatore'); assert.ok(sv[0].qualita > .9, JSON.stringify(sv[0]));
    // B18.2 (D11): contro la CPU il registro porta anche il peso del servizio (minaccia, strettezza, lettura in ritardo)
    assert.ok(sv[0].minaccia >= 0 && sv[0].minaccia <= 1 && sv[0].stretto >= 0 && sv[0].ritardoCpuMs >= 0, JSON.stringify(sv[0]));
    const m = computeMetrics(ev).racchetta;
    assert.equal(m.colpi, 3); assert.deepEqual(m.voluti, { topspin: 3 });
    // stesso gesto, stesso esito: nessuna variazione del punto di caduta tra i tre colpi (senza gesti del telefono i
    // gruppi della ripetibilità sono i tipi voluti)
    assert.equal(computeMetrics(ev).ripetibilita.gruppi.topspin.x, 0); assert.equal(computeMetrics(ev).ripetibilita.gruppi.topspin.profondita, 0);
    assert.deepEqual(m.vuoti, { presto: 1 }); assert.equal(m.servizi.n, 1);
    // B18.2 (revisione): il peso del servizio entra nelle misure riassunte (quanti con minaccia, quanti letti in ritardo)
    assert.equal(m.servizi.conPeso, 1);
    assert.equal(m.servizi.conMinacciaPercento, sv[0].minaccia > 0 ? 100 : 0); assert.equal(m.servizi.conRitardoPercento, sv[0].ritardoCpuMs > 0 ? 100 : 0);
    assert.equal(m.servizi.minacciaMedia, sv[0].minaccia); assert.equal(m.servizi.kmh.p50, sv[0].kmh);
    assert.deepEqual(serveWeight([{ minaccia: 0, ritardoCpuMs: 0 }, { minaccia: .5, ritardoCpuMs: 0 }, { minaccia: 1, ritardoCpuMs: 120 }, { tipo: 'vecchio' }]),
      { conPeso: 3, conMinacciaPercento: 66.7, conRitardoPercento: 33.3, minacciaMedia: .5 });
    assert.deepEqual(serveWeight([{ tipo: 'vecchio' }]), { conPeso: 0 });
    assert.match(summaryLines(computeMetrics(ev)).join('\n'), /Servizi dal gesto: 1 .*contro la CPU 1: con minaccia/);
    // la pagina del rapporto: lo script si legge (nessun apice che chiude una stringa)
    const html = viewerHtml({ meta: { id }, metrics: computeMetrics(ev), events: ev });
    const code = html.split('<script>').pop().split('</script>')[0];
    assert.doesNotThrow(() => new Function(code));
    assert.ok(html.includes('racchetta'));
    await R.stop();
  } finally { Math.random = real; }
});

// Sessione del 28/10 sera (diagnostica 20261028-213510-ukua, video): a rete il pallonetto (braccio alzato sopra la
// testa: salita 0,71, forza 0,13, 356 °/s) restava un top spin ed era ignorato perché debole e 0,1 s dopo il punto
// d'impatto; la palla corta di rovescio (451 °/s) era sostituita 0,2 s dopo dal rientro del braccio (1292 °/s).
test('28/10 sera: il pallonetto morbido a rete è un pallonetto e non è ignorato in leggero ritardo', async () => {
  const { classifyStroke } = await import('../src/natpf/natpf_stroke_intent.js');
  assert.equal(classifyStroke({ rise: .711, plane: .889, tilt: .2 }, { power: .131, angle: 63, riseRef: .3 }).shot, 'lob');
  // un dritto forte che sale (n 167: salita 0,68, piano 0,47, forza 0,92) resta un top spin
  assert.equal(classifyStroke({ rise: .68, plane: .47, tilt: .3 }, { power: .92, angle: 106, riseRef: .3 }).shot, 'topspin');
  const lob = { natpf: { intent: { shot: 'lob', conf: .5 }, angle: 63, peak: 356, typical: 1250 } };
  assert.equal(NI.weakSwing(lob), false);
  assert.equal(NI.weakSwing({ natpf: { ...lob.natpf, intent: { shot: 'topspin', conf: .5 } } }), true);
  withEngine('leggenda', e => {
    cpuShot(e, { player: [.6, 11.6], to: [.15, 3.4], flight: 1.25, topspin: -6 });
    const sw = phoneSwing({ shot: 'lob', power: .13, rise: .71, conf: .5 }, { peak: 356 }); sw.natpf.angle = 63; sw.natpf.typical = 1250;
    const r = play(e, [{ lead: -.08, swing: sw }]);
    assert.ok(r.hit, r.phase);
    assert.equal(r.racket.out.shot, 'LOB');
  });
});

test('28/10 sera: la palla corta voluta in attesa non è sostituita dal braccio che torna dall\'altra parte', () => {
  const drop = () => { const s = phoneSwing({ shot: 'drop', power: .21, rise: -.8, conf: .76 }, { side: 'backhand', peak: 451 }); s.natpf.angle = 68; return s; };
  const back = phoneSwing({ shot: 'slice', power: .86, rise: -.45 }, { side: 'forehand', peak: 1292 });
  const run = first => withEngine('leggenda', e => { cpuShot(e, { to: [-1.6, 8.6] }); return play(e, [{ lead: .25, swing: first }, { lead: .05, swing: back }]); });
  const r = run(drop());
  assert.ok(r.hit, r.phase);
  assert.equal(r.racket.out.shot, 'DROP');
  // senza la forma della palla corta il primo gesto era la preparazione: il colpo vero lo sostituisce come prima
  const prep = phoneSwing({ shot: 'topspin', power: .2, rise: .1 }, { side: 'backhand', peak: 451 }); prep.natpf.angle = 68;
  assert.equal(run(prep).racket.intent.shot, 'slice');
});

// Diagnostica del 28/10 sera: tempo mediano +0,51 unità (anticipo), 9 incrociati, 3 al centro, 1 lungolinea su 13. La
// direzione si misura attorno al ritmo di chi gioca: con il tempo solito al centro, dopo il solito lungolinea.
test('ritmo di chi gioca: con il tempo solito la palla va al centro, dopo il solito lungolinea, prima incrociata', async () => {
  const NO = await import('../src/natpf/natpf_stroke_outcome.js');
  const r = NO.createRhythm();
  for (const t of [.5, .6, .4]) r.add(t);
  assert.equal(r.value, 0, 'servono almeno 4 colpi');
  r.add(.5); r.add(2.4);                                     // un colpo fuori dalla finestra non conta
  assert.equal(r.count, 4); assert.ok(Math.abs(r.value - .4) < 1e-9, `${r.value}`);
  for (let i = 0; i < 8; i++) r.add(1.2);
  assert.equal(r.value, NO.RHYTHM.max);
  // dritto del destro (contatto +1): incrociato = x negativa, lungolinea = x positiva
  const at = (t, rhythm) => NO.strokeOutcome({ intent: { shot: 'topspin', power: .6 }, timing: t*.15, contact: 1, rhythm, level: { timingSpan: .15 } }).x;
  assert.ok(at(.5, 0) < -1.5, `senza ritmo, in anticipo: incrociato ${at(.5, 0)}`);
  assert.ok(Math.abs(at(.5, .5)) < 1, `con il ritmo +0,5 lo stesso tempo va al centro: ${at(.5, .5)}`);
  assert.ok(at(0, .5) > 1, `«in tempo» per chi colpisce sempre in anticipo è dopo il solito: lungolinea ${at(0, .5)}`);
  assert.ok(at(1, .5) < at(.5, .5) - 1, 'prima del solito: incrociato');
});

test('ritmo nel motore: dopo colpi sempre in anticipo, lo stesso colpo in anticipo non va più incrociato', () => {
  const swing = () => phoneSwing({ shot: 'topspin', power: .7 });
  const fresh = withEngine('casual', e => { cpuShot(e, { to: [1.8, 8.4] }); return play(e, [{ lead: .16, swing: swing() }]); });
  const learned = withEngine('casual', e => {
    // cinque colpi dello scambio in anticipo come quelli della partita (+0,5–0,9 unità)
    for (const lead of [.1, .12, .14, .12, .16]){ cpuShot(e, { to: [1.8, 8.4] }); play(e, [{ lead, swing: swing() }]); }
    assert.ok(e.natpfRhythm.player.value > .3, `ritmo ${e.natpfRhythm.player.value}`);
    cpuShot(e, { to: [1.8, 8.4] });
    return play(e, [{ lead: .16, swing: swing() }]);
  });
  assert.ok(fresh.hit && learned.hit);
  assert.ok(fresh.landing.x < -1.5, `senza ritmo: incrociato ${fresh.landing.x}`);
  assert.ok(learned.landing.x > fresh.landing.x + 1, `con il ritmo imparato meno incrociato: ${learned.landing.x} contro ${fresh.landing.x}`);
  // a ogni partita il ritmo si reimpara
  withEngine('casual', e => { e.natpfRhythm = { player: { value: .5 } }; e.startNewMatch({ showStartBanner: false }); assert.equal(e.natpfRhythm, null); });
});

// Segnalazione del 29/10: «le schiacciate dovrebbero essere un colpo molto più forte». Prima andavano a 26–27 m/s di
// media (volo minimo 0,45 s del motore base), un piatto pieno a 23: ora la schiacciata parte a OUTCOME.smashSpeed
test('schiacciata molto più forte di un colpo piatto, con gli effetti del colpo potente', () => {
  // velocità media dal colpo al rimbalzo
  const speed = (cpu, swing, diff = 'pro') => withEngine(diff, e => {
    cpuShot(e, cpu);
    let sent = false, t0 = null, p0 = null;
    for (let i = 0; i < 900; i++){
      const ttc = NI.timeToContact(e, e.player);
      if (!sent && ttc != null && ttc <= .02){ e._handleUserSwingInput(swing); sent = true; }
      const before = e.ball.lastHitter; e.step(DT);
      if (before !== 'player' && e.ball.lastHitter === 'player'){ t0 = e.elapsedTime; p0 = e.ball.pos.clone(); }
      if (t0 != null && e.elapsedTime > t0 + .05 && e.ball.pos.y < .1) return { v: Math.hypot(e.ball.pos.x - p0.x, e.ball.pos.z - p0.z)/(e.elapsedTime - t0), shot: e.natpfLastRacket.out.shot, power: e.ball.isPowerShot };
    }
    return null;
  });
  const smash = speed({ player: [.3, 9.5], to: [.6, 7.2], flight: 2.0, topspin: 4 }, phoneSwing({ shot: 'smash', power: .85, rise: -.4 }, { side: 'overhead' }));
  const flat = speed({ to: [1.4, 8.6] }, phoneSwing({ shot: 'flat', power: .85 }));
  assert.equal(smash.shot, 'SMASH'); assert.equal(flat.shot, 'FLAT');
  assert.ok(smash.v >= 34, `schiacciata a ${smash.v.toFixed(1)} m/s`);
  assert.ok(smash.v >= 1.4*flat.v, `schiacciata ${smash.v.toFixed(1)} contro piatto ${flat.v.toFixed(1)} m/s`);
  assert.equal(smash.power, true, 'stelle e scossa del colpo potente');
});
