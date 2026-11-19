// B71 · registro e tempo dei colpi in fiera (registri veri della fiera del 18 e 19/11: 325 partite, 7.542 colpi, 1.502 colpi a
// vuoto; docs/b71/registro-tempo.md). Prodotto FIERA: fuori dalla modalità fiera niente cambia.
//   - «Perfetto» asimmetrico in fiera: in anticipo fino a 0,55 unità della finestra (in ritardo resta 0,35);
//   - la correzione dell'anticipo del B56 (0,1 s) non accorcia più la finestra in ritardo: il limite e la scadenza si
//     allargano di altrettanto (natpf.ant nell'evento del telefono);
//   - in fiera il ritardo dello schermo salvato non si somma alla correzione;
//   - i colpi a vuoto «tardi» portano l'errore di tempo e la forza (riga «vuoto» del registro).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { swingGrade, fairPerfect, FAIR_PERFECT, SWING_AIM, skillLevel, SKILL_LEVELS } from '../src/natpf/natpf_skill.js';
import { strokeOutcome, lateSpanOf, directionSpan, slowFactor } from '../src/natpf/natpf_stroke_outcome.js';
import { cueEdges } from '../src/natpf/natpf_timing_cue.js';
import { natpfSwingToEngine, ANTICIPATION_S } from '../src/natpf/natpf_phone_racket.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';

/* ---------- 5a · «Perfetto» asimmetrico, solo in fiera ---------- */
test('B71: in fiera «Perfetto» arriva fino a 0,55 unità in anticipo; in ritardo resta 0,35; fuori dalla fiera il livello è lo stesso oggetto', () => {
  const L = SKILL_LEVELS['1v1'], F = fairPerfect(L, true);
  assert.equal(FAIR_PERFECT.early, .55); assert.equal(SWING_AIM.centre, .35);
  assert.equal(fairPerfect(L, false), L, 'fuori dalla fiera: lo stesso livello, impronte identiche');
  assert.equal(fairPerfect(null, true), null);
  assert.equal(F.perfectEarly, .55); assert.equal(F.timingSpan, L.timingSpan);
  // swingGrade in unità della finestra (timingSpan 0,17 al livello 1v1)
  const u = x => x*L.timingSpan;
  for (const [t, prima, fiera] of [[.2, 'PERFECT', 'PERFECT'], [.4, 'EARLY', 'PERFECT'], [.55, 'EARLY', 'PERFECT'], [.56, 'EARLY', 'EARLY'], [1.3, 'VERY EARLY', 'VERY EARLY'],
    [-.3, 'PERFECT', 'PERFECT'], [-.36, 'LATE', 'LATE'], [-.5, 'LATE', 'LATE'], [-1.3, 'VERY LATE', 'VERY LATE']]){
    assert.equal(swingGrade(u(t), L).grade, prima, `fuori dalla fiera t=${t}`);
    assert.equal(swingGrade(u(t), F).grade, fiera, `in fiera t=${t}`);
  }
});

test('B71: esito del colpo — +90 ms con la finestra 0,17 in fiera è Perfetto, −40 ms con la finestra in ritardo 0,09 resta in ritardo; solo il voto cambia', () => {
  const L = SKILL_LEVELS['1v1'], F = fairPerfect(L, true), base = { intent: { shot: 'topspin', power: .6 }, ballVz: 20, contact: 1, hitX: .5, hitZ: 11.5, contactY: 1 };
  // +90 ms: t = 0,09/0,17 = 0,53 (palla a 20 m/s: niente allargamento delle palle lente)
  assert.equal(slowFactor(20), 1); assert.equal(directionSpan(L), .17);
  const a0 = strokeOutcome({ ...base, timing: .09, lateSpan: .09, level: L }), a1 = strokeOutcome({ ...base, timing: .09, lateSpan: .09, level: F });
  assert.equal(a0.grade, 'EARLY'); assert.equal(a1.grade, 'PERFECT');
  // direzione, profondità, qualità, effetto: uguali (la mira usa il tempo, non il voto)
  for (const k of ['x', 'depth', 'clear', 'topspin', 't', 'q', 'excess', 'failed', 'netFault', 'weak']) assert.deepEqual(a1[k], a0[k], k);
  // −40 ms con la finestra in ritardo 0,09: t = −0,44 → in ritardo come prima
  const b0 = strokeOutcome({ ...base, timing: -.04, lateSpan: .09, level: L }), b1 = strokeOutcome({ ...base, timing: -.04, lateSpan: .09, level: F });
  assert.equal(b0.grade, 'LATE'); assert.deepEqual(b1, b0, 'in ritardo tutto identico');
  // oltre la finestra nuova: anticipo come prima
  const c1 = strokeOutcome({ ...base, timing: .1, lateSpan: .09, level: F }); assert.equal(c1.grade, 'EARLY');
});

test('B71: il segnale del momento giusto diventa verde quando il voto diventa Perfetto (anche in fiera)', () => {
  const L = skillLevel('evento'), span = directionSpan(L)*slowFactor(18);
  const fuori = cueEdges({ level: L, vz: 18 }), dentro = cueEdges({ level: fairPerfect(L, true), vz: 18 });
  assert.ok(Math.abs(fuori.early - SWING_AIM.centre*span) < 1e-12);
  assert.ok(Math.abs(dentro.early - FAIR_PERFECT.early*span) < 1e-12, 'in fiera il verde comincia prima, come il voto');
  assert.equal(dentro.late, fuori.late, 'in ritardo uguale');
});

/* ---------- 5b e 5c · correzione dell'anticipo nell'evento, ritardo dello schermo ---------- */
const swing = { at: 10, dir: 1, peak: 900, power: .6 };
test('B71: l\'evento del telefono porta la correzione (natpf.ant) solo in fiera; in fiera il ritardo dello schermo non si somma', () => {
  const fuori = natpfSwingToEngine(swing, { now: 10.03 }), fiera = natpfSwingToEngine(swing, { now: 10.03, anticipation: ANTICIPATION_S });
  assert.equal(fuori.natpf.ant, undefined, 'fuori dalla fiera l\'evento è quello di prima');
  assert.equal(fiera.natpf.ant, .1);
  assert.equal(NI.eventAnticipation(fiera), .1); assert.equal(NI.eventAnticipation(fuori), 0); assert.equal(NI.eventAnticipation({}), 0); assert.equal(NI.eventAnticipation(null), 0);
  // ritardo dello schermo salvato (prova del B50): in fiera la latenza è la stessa che con lo schermo a 0
  for (const lag of [0, .03, .08, .2]){
    const e = natpfSwingToEngine(swing, { now: 10.03, anticipation: ANTICIPATION_S, displayLag: lag });
    assert.ok(Math.abs(e.natpf.latency - (-.07)) < 1e-9, `fiera, schermo ${lag}: ${e.natpf.latency}`);
  }
  // fuori dalla fiera si somma come prima
  assert.ok(Math.abs(natpfSwingToEngine(swing, { now: 10.03, displayLag: .08 }).natpf.latency - .11) < 1e-9);
  assert.ok(Math.abs(natpfSwingToEngine(swing, { now: 10.03, displayLag: 0 }).natpf.latency - .03) < 1e-9);
});

// motore finto per queueUserSwing: chi gioca a z = 11,7 (punto d'impatto 11,35), palla verso di lui a vz m/s, che ha passato
// il punto d'impatto da «dopo» secondi; il gesto ha il picco «picco» secondi dopo il punto d'impatto ed è arrivato «rete» s dopo
function finto({ vz = 15, dopo = .08, livello = '1v1' } = {}){
  const colpi = [];
  const E = { matchConfig: { difficulty: livello }, elapsedTime: 10, isMultiplayer: false, versus: null,
    ball: { inPlay: true, pos: { x: .6, y: 1, z: 11.35 + vz*dopo }, vel: { x: 0, y: 0, z: vz } },
    player: { pos: { x: 0, y: 0, z: 11.7 }, userData: {} }, opponent: { pos: { x: 0, y: 0, z: -11.7 }, userData: {} },
    _attemptPlayerRallyStrike(evt){ colpi.push(evt); return true; } };
  return { E, colpi };
}
// gesto con il picco «picco» s dopo il punto d'impatto, arrivato al computer «rete» s dopo il picco
function gesto({ picco, rete = .03, fiera = true, vz = 15 }){
  const { E, colpi } = finto({ vz, dopo: picco + rete });
  const ev = natpfSwingToEngine({ ...swing, at: 10 }, { now: 10 + rete, anticipation: fiera ? ANTICIPATION_S : 0 });
  ev.natpf.peak = 900; ev.natpf.typical = 900; ev.side = 'forehand';
  return { q: NI.queueUserSwing(E, ev, E.player), colpi, E, ev };
}
test('B71: in fiera la correzione di 0,1 s non accorcia più la finestra in ritardo (palla a 15 e a 28 m/s); fuori dalla fiera come prima', () => {
  const late = vz => (lateSpanOf(vz, SKILL_LEVELS['1v1']))*1.8;
  assert.ok(Math.abs(late(15) - .168) < .001 && Math.abs(late(28) - .09) < 1e-9);
  // richiesta: palla a 15 m/s, picco 50 ms dopo il punto d'impatto, in fiera → colpito in ritardo, non a vuoto
  const a = gesto({ picco: .05 });
  assert.equal(a.q, 'late'); assert.equal(a.colpi.length, 1);
  assert.ok(Math.abs(a.colpi[0].natpfTau - (-.15)) < 1e-9, `il tempo del voto resta quello corretto (−50 − 100 ms): ${a.colpi[0].natpfTau}`);
  // 100 ms dopo: prima del B71 a vuoto (−0,2 < −0,168), ora in ritardo come fuori dalla fiera
  assert.equal(gesto({ picco: .1 }).q, 'late');
  assert.equal(gesto({ picco: .1, fiera: false }).q, 'late');
  // palla a 28 m/s, picco 30 ms dopo il punto d'impatto: prima a vuoto anche con il picco appena dopo (limite −10 ms)
  assert.equal(gesto({ picco: .03, vz: 28 }).q, 'late');
  assert.equal(gesto({ picco: .03, vz: 28, fiera: false }).q, 'late');
  // il limite vero è lo stesso dentro e fuori dalla fiera: 180 ms dopo con la palla a 15 m/s è a vuoto in tutti e due
  assert.equal(gesto({ picco: .18 }).q, 'whiff'); assert.equal(gesto({ picco: .18, fiera: false }).q, 'whiff');
  assert.equal(gesto({ picco: .16 }).q, 'late'); assert.equal(gesto({ picco: .16, fiera: false }).q, 'late');
});

test('B71: lo swing in attesa in fiera scade in tempo vero (finestra in ritardo + la correzione)', () => {
  const { E } = finto({ vz: 15, dopo: -.3 });                                   // palla ancora a 0,3 s dal punto d'impatto
  const ev = natpfSwingToEngine(swing, { now: 10.03, anticipation: ANTICIPATION_S }); ev.natpf.peak = 900; ev.natpf.typical = 900;
  assert.equal(NI.queueUserSwing(E, ev, E.player), 'held');
  const P = E.pendingUserSwing, lw = (lateSpanOf(15, SKILL_LEVELS['1v1']))*1.8;
  assert.ok(Math.abs(P.lateWin - (lw + .1)) < 1e-9, `${P.lateWin}`);
  const { E: E2 } = finto({ vz: 15, dopo: -.3 }), ev2 = natpfSwingToEngine(swing, { now: 10.03 }); ev2.natpf.peak = 900; ev2.natpf.typical = 900;
  NI.queueUserSwing(E2, ev2, E2.player); assert.ok(Math.abs(E2.pendingUserSwing.lateWin - lw) < 1e-9, 'fuori dalla fiera come prima');
});

/* ---------- 3 · colpi a vuoto «tardi» con l'errore di tempo ---------- */
test('B71: misura del colpo a vuoto «tardi» (errore di tempo e forza)', () => {
  const { E } = finto({ vz: 15, dopo: .25 });
  const ev = natpfSwingToEngine(swing, { now: 10.03, anticipation: ANTICIPATION_S }); ev.natpf.peak = 1234;
  const m = NI.lateWhiffMeasure(E, ev, E.player);
  assert.ok(Math.abs(m.lead - (-.25 - .07)) < 1e-9, `${m.lead}`); assert.equal(m.strength, 1234);
  assert.equal(NI.lateWhiffMeasure({ ...E, ball: { ...E.ball, inPlay: false } }, ev, E.player).lead, null);
});

const DT = 1/120;
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(17);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
function cpuShot(e, { from = [-.5, 1, -11], to = [1.6, 8.5], flight = 1.05, topspin = 14, player = [.4, 11.7], rally = 3 } = {}){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
  e.player.pos.set(player[0], 0, player[1]); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  e.pendingUserSwing = null;
  e.ball.pos.set(...from);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0], 0, to[1]), flight, { topspin });
  e._natpfPlanPlayer();
}
const phoneSwing = (intent, { latency = 0, ant = 0 } = {}) => ({ source: 'natpf-phone', side: 'forehand', shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, ...intent }, power: intent.power, peak: 900, latency, hand: 'right', ...(ant ? { ant } : {}) } });
// manda lo swing quando mancano «lead» secondi al punto d'impatto (negativo: dopo), poi fa andare il motore
function play(e, lead, swing, maxT = 3){
  let sent = false;
  for (let t = 0; t < maxT; t += DT){
    const ttc = NI.timeToContact(e, e.player);
    if (!sent && ttc != null && ttc <= lead){ e._handleUserSwingInput(swing); sent = true; }
    e.step(DT);
    if (e.phase !== 'RALLY' || (sent && e.ball.lastHitter === 'player')) break;
  }
  return e.natpfLastRacket;
}

test('B71: motore vero — lo stesso colpo con t tra 0,35 e 0,55 è Perfetto in fiera e in anticipo fuori; il resto dell\'esito uguale', () => {
  const run = (fiera, lead) => withEngine('casual', e => { if (fiera) e.natpfUi = { fiera: { on: true } }; cpuShot(e); return play(e, lead, phoneSwing({ shot: 'topspin', power: .7 })); });
  // cerca un anticipo che cada tra 0,35 e 0,55 unità (la finestra dipende dalla palla all'impatto)
  let pick = null;
  for (let lead = .04; lead <= .2 && !pick; lead += .01){ const r = run(false, lead); if (r && r.out.t > .38 && r.out.t < .52) pick = { lead, r }; }
  assert.ok(pick, 'un anticipo tra 0,35 e 0,55 unità');
  const fuori = pick.r, dentro = run(true, pick.lead);
  assert.equal(fuori.out.grade, 'EARLY'); assert.equal(dentro.out.grade, 'PERFECT');
  assert.equal(dentro.out.t, fuori.out.t);
  for (const k of ['x', 'depth', 'clear', 'q']) assert.equal(dentro.out[k], fuori.out[k], k);
  // fuori dalla fiera (natpfUi senza fiera) nessuna differenza dal motore di prima
  const spenta = withEngine('casual', e => { e.natpfUi = { fiera: { on: false } }; cpuShot(e); return play(e, pick.lead, phoneSwing({ shot: 'topspin', power: .7 })); });
  assert.deepEqual(spenta.out, fuori.out);
});

test('B71: motore vero — il colpo a vuoto «tardi» porta l\'errore di tempo e la forza al registro', () => {
  const vuoti = withEngine('casual', e => {
    const got = []; const orig = e._natpfEarlyWhiff.bind(e); e._natpfEarlyWhiff = ps => { got.push(ps); return orig(ps); };
    cpuShot(e);
    play(e, -.25, phoneSwing({ shot: "topspin", power: .7 }));
    return got;
  });
  const t = vuoti.find(v => v.natpfWhy === 'tardi');
  assert.ok(t, 'colpo a vuoto «tardi»');
  assert.ok(Number.isFinite(t.lead) && t.lead < -.2, `errore di tempo ${t.lead}`); assert.equal(t.strength, 900);
});
