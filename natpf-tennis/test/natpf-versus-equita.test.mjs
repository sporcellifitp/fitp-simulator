// Equità del Player 2 nel 1v1 (diagnostiche 20261030-142317 e -142438, build .17, host con il telefono Android):
//   • C2: lo swing del P2 nello scambio passava dal percorso vecchio (attesa 0,22 s contro 0,45 s del P1, nessuna finestra
//     in ritardo legata alla palla): ora la finestra d'impatto di natpf_impact è per attore, con il piano del P2;
//   • C3: il servizio del P2 non veniva dal gesto (sempre «POWER», lato a caso): ora come il P1, specchiato;
//   • C18: la palla passata dietro il P2 era fissa a 15,6 m, per il P1 segue la sua posizione;
//   • C11: diagnostica del 1v1 (chi p2, esito del colpo ricevuto, popup, 1v1 nel punto, sezione P2 nelle metriche).
// Stesse scene per il P1 e per il P2, specchiate (x → −x, z → −z): devono dare lo stesso risultato.
// node --import ./test/register.mjs --test test/natpf-versus-equita.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { lateSpanOf } from '../src/natpf/natpf_stroke_outcome.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';
import { DiagRecorder } from '../src/natpf/diag/diag_recorder.js';
import { memoryStore } from '../src/natpf/diag/diag_store.js';
import { computeMetrics, summaryLines } from '../src/natpf/diag/diag_metrics.js';
import { NatpfVersusUi } from '../src/natpf/natpf_versus_ui.js';

const DT = 1/120;
// 1v1 dell'host (tra due computer: isMultiplayer) con il caso fisso
function withVersus(fn, { split = false } = {}){
  const real = Math.random; Math.random = mulberry32(17);
  try {
    const e = createHeadlessEngine({ difficulty: '1v1' });
    if (split) e.startSplit(); else { e.versus = { active: true }; e.roomId = 'AT-AB12'; }
    e.startNewMatch({ showStartBanner: false });
    e.isMultiplayer = true; e.autoPlayMode = false; e.natpfP2Hand = 'right';
    return fn(e);
  } finally { Math.random = real; }
}
const actorOf = (e, who) => (who === 'p2' ? e.opponent : e.player);
// palla dell'avversario verso chi riceve (who), che si prepara con il suo piano d'intercetto. Le coordinate sono quelle
// del P1 (metà campo z positive) e per il P2 si specchiano
function shotTo(e, who, { from = [-.5, 1, -11], to = [1.6, 8.5], flight = 1.05, topspin = 14, at = [.4, 11.7], rally = 3 } = {}){
  const m = who === 'p2' ? -1 : 1, A = actorOf(e, who);
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = who === 'p2' ? 'player' : 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = rally;
  A.pos.set(m*at[0], 0, m*at[1]); A.targetPos.copy(A.pos); A.vel.set(0, 0, 0);
  e.pendingUserSwing = null; e.pendingP2Swing = null;
  e.ball.pos.set(m*from[0], from[1], m*from[2]); e.ball.spin.set(0, 0, 0);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(m*to[0], 0, m*to[1]), flight, { topspin });
  who === 'p2' ? e._natpfPlanOpponent(e.opponent) : e._natpfPlanPlayer();
  return NI.planOf(e, A);
}
// colpo del telefono con la sua intenzione (come natpfSwingToEngine); seq per riconoscerlo
const phoneSwing = (intent, { side = 'forehand', peak = 900, typical = null, angle = 60, seq = null, latency = 0 } = {}) => ({ source: 'natpf-phone', side, hand: 'right', shotType: ENGINE_SHOT[intent.shot], speed: .8 + intent.power*.85, dirX: 0,
  natpf: { aim: 'swing', shot: intent.shot, intent: { depth: intent.power, rise: 0, face: 0, ...intent }, power: intent.power, peak, typical, angle, seq, latency, hand: 'right' } });
const send = (e, who, swing) => (who === 'p2' ? e._handleP2SwingInput(swing) : e._handleUserSwingInput(swing));
// manda gli swing quando mancano «lead» secondi al punto d'impatto di chi riceve, poi gioca fino al suo colpo (o alla
// fine del punto)
function play(e, who, swings, maxT = 3){
  const A = actorOf(e, who), mine = who === 'p2' ? 'opponent' : 'player', queue = [...swings].sort((a, b) => b.lead - a.lead);
  const seen = { late: [], whiff: [], weak: [] };
  const rs = e._natpfRacketShot.bind(e), ew = e._natpfEarlyWhiff.bind(e), wd = e._natpfWeakDropped.bind(e);
  e._natpfRacketShot = (ev, ...a) => { seen.late.push(ev.natpfLateSpan); return rs(ev, ...a); };
  e._natpfEarlyWhiff = ps => { seen.whiff.push(ps); return ew(ps); };
  e._natpfWeakDropped = ps => { seen.weak.push(ps); return wd(ps); };
  for (let t = 0; t < maxT; t += DT){
    const ttc = NI.timeToContact(e, A);
    while (queue.length && ttc != null && ttc <= queue[0].lead) send(e, who, queue.shift().swing);
    e.step(DT);
    if (e.ball.lastHitter === mine || e.phase !== 'RALLY') break;
  }
  return { hit: e.ball.lastHitter === mine, racket: e.natpfLastRacket, phase: e.phase, seen, sent: swings.length - queue.length };
}

test('C2: swing 0,35 s prima del punto d’impatto: colpiscono tutti e due, con lo stesso tempo (prima il P2 scadeva a 0,22 s)', () => {
  const out = {};
  for (const who of ['p1', 'p2']) out[who] = withVersus(e => { shotTo(e, who); return play(e, who, [{ lead: .35, swing: phoneSwing({ shot: 'topspin', power: .7 }, { seq: 5 }) }]); });
  for (const who of ['p1', 'p2']){
    assert.equal(out[who].sent, 1, `${who}: gesto mandato`);
    assert.ok(out[who].hit, `${who}: colpita (${out[who].phase}, vuoti ${out[who].seen.whiff.length})`);
    assert.equal(out[who].racket.who, who === 'p2' ? 'p2' : 'player');
    assert.equal(out[who].racket.seq, 5);
  }
  assert.ok(Math.abs(out.p1.racket.timing - out.p2.racket.timing) < .02, `tempo P1 ${out.p1.racket.timing}, P2 ${out.p2.racket.timing}`);
  assert.ok(out.p2.racket.timing > .25, `il P2 colpisce con il suo anticipo vero (${out.p2.racket.timing})`);
});

test('C2: la preparazione seguita dal colpo vero: per il P2 come per il P1 gioca il colpo vero (finestra per attore)', () => {
  for (const who of ['p1', 'p2']){
    const r = withVersus(e => { shotTo(e, who); return play(e, who, [
      { lead: .4, swing: phoneSwing({ shot: 'topspin', power: .3 }, { peak: 200, typical: 900, seq: 1 }) },     // preparazione (debole)
      { lead: .08, swing: phoneSwing({ shot: 'flat', power: .8 }, { peak: 1100, typical: 900, seq: 2 }) },       // colpo vero
    ]); });
    assert.ok(r.hit, `${who}: colpita`); assert.equal(r.racket.seq, 2, `${who}: ha giocato il colpo vero`);
  }
  // il P2 ha la sua attesa: uno swing del P1 in attesa non tocca quello del P2 e viceversa
  withVersus(e => {
    shotTo(e, 'p2');
    e.pendingUserSwing = { natpfWindow: true, lead: .3, strength: 2000, evt: {}, actor: e.player, at: 0, expiresAt: 99 };
    e._handleP2SwingInput(phoneSwing({ shot: 'topspin', power: .6 }, { seq: 3 }));
    assert.equal(e.pendingP2Swing?.natpfWindow, true, 'attesa del P2');
    assert.equal(e.pendingP2Swing.evt.natpf.seq, 3);
    assert.equal(e.pendingUserSwing.strength, 2000, 'quella del P1 resta com’era');
  });
});

test('C2: gesto debole da solo (micro-movimento): nessun colpo né swing a vuoto a schermo, «vuoto» debole del P2', () => {
  for (const who of ['p1', 'p2']){
    const r = withVersus(e => { shotTo(e, who); return play(e, who, [{ lead: .35, swing: phoneSwing({ shot: 'topspin', power: .2 }, { peak: 150, typical: 900, angle: 10, seq: 4 }) }]); });
    assert.equal(r.hit, false, `${who}: il micro-movimento non colpisce`);
    assert.equal(r.seen.weak.length, 1, `${who}: lasciato andare come debole`);
    assert.equal(r.seen.weak[0].actor.role, who === 'p2' ? 'opponent' : 'player', `${who}: attore`);
  }
});

test('C2: al P2 la finestra in ritardo della palla (natpfLateSpan) con 30 ms in più; colpo in ritardo dopo il punto d’impatto', () => {
  assert.equal(NI.P2_LATE_MARGIN, .03);
  const out = {};
  for (const who of ['p1', 'p2']) out[who] = withVersus(e => {
    shotTo(e, who);
    const A = actorOf(e, who);
    for (let t = 0; t < 3 && (NI.timeToContact(e, A) ?? 1) > -.03; t += DT) e.step(DT);
    send(e, who, phoneSwing({ shot: 'topspin', power: .7 }, { seq: 9 }));
    return { racket: e.natpfLastRacket, hit: e.ball.lastHitter === (who === 'p2' ? 'opponent' : 'player') };
  });
  for (const who of ['p1', 'p2']) assert.ok(out[who].hit, `${who}: colpita in ritardo`);
  assert.ok(out.p1.racket.timing < 0 && out.p2.racket.timing < 0, 'in ritardo');
  // natpfLateSpan passato all'esito: lateSpanOf della palla, +30 ms per il P2
  const spans = {};
  for (const who of ['p1', 'p2']) spans[who] = withVersus(e => { shotTo(e, who); return play(e, who, [{ lead: .1, swing: phoneSwing({ shot: 'topspin', power: .7 }) }]); }).seen.late[0];
  assert.ok(Number.isFinite(spans.p1) && Number.isFinite(spans.p2), JSON.stringify(spans));
  assert.ok(Math.abs(spans.p2 - spans.p1 - .03) < .005, `P1 ${spans.p1}, P2 ${spans.p2}`);
  assert.ok(spans.p1 <= lateSpanOf(20, skillLevel('1v1')) + .2);
  // sullo stesso schermo il telefono del P2 è collegato a questo computer: nessun margine
  const local = withVersus(e => { shotTo(e, 'p2'); return play(e, 'p2', [{ lead: .1, swing: phoneSwing({ shot: 'topspin', power: .7 }) }]); }, { split: true }).seen.late[0];
  assert.ok(Math.abs(local - spans.p1) < .005, `stesso schermo: P2 ${local}, P1 ${spans.p1}`);
});

test('C2: swing del P2 troppo presto (oltre la finestra): a vuoto con il messaggio e l’aptica del P2', () => {
  const pops = [], haptic = [];
  const r = withVersus(e => {
    e.hud = new Proxy({}, { get: (t, k) => (k === 'showTimingPopup' ? o => pops.push(o) : () => {}) });
    e.motionController = { triggerHapticFeedback: f => haptic.push(f) };
    shotTo(e, 'p2');
    return play(e, 'p2', [{ lead: .9, swing: phoneSwing({ shot: 'topspin', power: .7 }) }]);
  });
  assert.equal(r.hit, false);
  assert.equal(r.seen.whiff.length, 1); assert.equal(r.seen.whiff[0].actor.role, 'opponent');
  assert.ok(pops.some(p => /^P2 VERY EARLY/.test(p.grade)), JSON.stringify(pops.map(p => p.grade)));
  assert.ok(haptic.some(h => h.role === 'p2' && h.kind === 'whiff'), 'l’aptica va al telefono del P2');
});

test('C2: senza natpf (webcam, tastiera) il P2 resta sul percorso di prima', () => {
  withVersus(e => {
    shotTo(e, 'p2');
    for (let t = 0; t < 3 && (NI.timeToContact(e, e.opponent) ?? 0) > .2; t += DT) e.step(DT);
    e._handleP2SwingInput({ source: 'webcam', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: 0 });
    assert.ok(e.pendingP2Swing, 'in attesa');
    assert.equal(e.pendingP2Swing.natpfWindow, undefined, 'percorso vecchio (attesa dell’assistenza)');
  });
});

test('C2 sullo stesso schermo: il P2 locale ha la stessa finestra del P1', () => {
  const r = withVersus(e => { assert.ok(e.natpfSplit.active); shotTo(e, 'p2'); return play(e, 'p2', [{ lead: .35, swing: phoneSwing({ shot: 'topspin', power: .7 }, { seq: 6 }) }]); }, { split: true });
  assert.ok(r.hit, r.phase); assert.equal(r.racket.who, 'p2'); assert.ok(r.racket.timing > .25);
});

/* ---------- servizio del P2 dal gesto (C3) ---------- */
// lancio di chi batte, poi il gesto quando mancano «toApex» secondi al punto più alto (negativo: dopo)
function serveFrom(e, who, swing, toApex = 0){
  const A = actorOf(e, who);
  e.score.server = who === 'p2' ? 'opponent' : 'player';
  e._startServeToss(A);
  e.phaseTimer = .2;
  const apexT = 6.32/9.15;
  for (let t = 0; t < 2 && e.ball.vel.y/9.15 > toApex; t += DT) e.step(DT);
  send(e, who, swing);
  for (let i = 0; i < 120 && e.phase === 'SERVE_TOSS'; i++) e.step(DT);
  return { phase: e.phase, hitter: e.ball.lastHitter, serve: e.natpfLastServe, target: e.ball.targetLanding.clone(), shotType: e.ball.shotType, apexT };
}
const serveSwing = (power = .7, plane = 0, opts = {}) => ({ source: 'natpf-phone', side: 'forehand', hand: 'right', shotType: 'flat', speed: 1.4, dirX: 0,
  natpf: { aim: 'swing', shot: 'flat', intent: { power, plane, rise: 0, face: 0, depth: power }, power, peak: 900, latency: 0, hand: 'right', ...opts } });

test('C3: servizio del P2 dal gesto come il P1, specchiato (stesso quadrato in diagonale, stessa profondità e qualità)', () => {
  for (const deuce of [true, false]) for (const plane of [0, .6]){
    const out = {};
    for (const who of ['p1', 'p2']) out[who] = withVersus(e => { e.score.deuceSide = deuce; return serveFrom(e, who, serveSwing(.7, plane), 0); });
    for (const who of ['p1', 'p2']){
      assert.equal(out[who].phase, 'RALLY', `${who}: ha servito`);
      assert.equal(out[who].hitter, who === 'p2' ? 'opponent' : 'player');
      assert.ok(out[who].serve && Number.isFinite(out[who].serve.tau), `${who}: servizio dal gesto`);
    }
    const a = out.p1.serve, b = out.p2.serve;
    assert.equal(a.kind, b.kind); assert.equal(a.q, b.q); assert.equal(a.depth, b.depth); assert.equal(a.grade, b.grade);
    assert.ok(Math.abs(a.x + b.x) < 1e-9, `x specchiata: P1 ${a.x}, P2 ${b.x} (parità ${deuce}, verso ${plane})`);
    assert.ok(Math.abs(out.p1.target.z + out.p2.target.z) < 1e-9, 'profondità specchiata');
    // dentro il quadrato giusto: dall'altra parte della rete rispetto a chi batte, nella diagonale
    assert.ok(out.p2.target.z > 0 && out.p2.target.z < 6.4, `P2 nel campo del P1 (${out.p2.target.z})`);
    const box = e => Math.sign(e.target.x);
    assert.equal(box(out.p2), -box(out.p1), 'quadrato specchiato');
    if (plane) assert.equal(Math.sign(b.sidespin), -Math.sign(a.sidespin), 'effetto laterale specchiato');
  }
});

test('C3: il P2 nella salita del lancio è ignorato; gesto debole in attesa della battuta vera; in ritardo è sporco', () => {
  // gesto nella prima parte della salita (oltre NO.SERVE.ignoreBefore prima del colmo): fa parte del lancio
  withVersus(e => {
    e.score.server = 'opponent'; e._startServeToss(e.opponent);
    for (let i = 0; i < 24; i++) e.step(DT);       // 0,2 s: palla ancora in salita veloce
    e._handleP2SwingInput(serveSwing());
    assert.equal(e.phase, 'SERVE_TOSS', 'ignorato'); assert.equal(e.natpfP2Input.esito, 'servizio ignorato');
  });
  // debole prima del colmo, poi la battuta vera: vale la battuta vera; il debole da solo vale dopo serveWait
  const both = withVersus(e => {
    e.score.server = 'opponent'; e._startServeToss(e.opponent); e.phaseTimer = .2;
    for (let t = 0; t < 2 && e.ball.vel.y/9.15 > .15; t += DT) e.step(DT);
    e._handleP2SwingInput(serveSwing(.3, 0, { peak: 150, typical: 900 }));
    assert.equal(e.phase, 'SERVE_TOSS'); assert.ok(e.natpfWeakServeP2, 'debole in attesa');
    assert.equal(e.natpfP2Input.esito, 'servizio in attesa');
    for (let t = 0; t < 2 && e.ball.vel.y/9.15 > 0; t += DT) e.step(DT);
    e._handleP2SwingInput(serveSwing(.9, 0, { peak: 1200, typical: 900 }));
    return { phase: e.phase, serve: e.natpfLastServe, esito: e.natpfP2Input.esito };
  });
  assert.equal(both.phase, 'RALLY'); assert.equal(both.esito, 'servizio');
  assert.ok(Math.abs(both.serve.tau) < .03, `battuta vera al colmo (${both.serve.tau})`);
  const alone = withVersus(e => {
    e.score.server = 'opponent'; e._startServeToss(e.opponent); e.phaseTimer = .2;
    for (let t = 0; t < 2 && e.ball.vel.y/9.15 > .15; t += DT) e.step(DT);
    e._handleP2SwingInput(serveSwing(.3, 0, { peak: 150, typical: 900 }));
    for (let i = 0; i < 240 && e.phase === 'SERVE_TOSS'; i++) e.step(DT);
    return { phase: e.phase, hitter: e.ball.lastHitter, serve: e.natpfLastServe };
  });
  assert.equal(alone.phase, 'RALLY'); assert.equal(alone.hitter, 'opponent');
  assert.ok(alone.serve.tau > .1, 'vale il gesto debole, con il suo tempo');
  // molto dopo il colmo: servizio sporco, non più sempre «POWER»
  const late = withVersus(e => serveFrom(e, 'p2', serveSwing(.9), -.45));
  assert.equal(late.serve.grade, 'LATE SERVE');
});

test('C3: servizio del P2 senza natpf (webcam, tastiera) come prima; sullo stesso schermo dal gesto', () => {
  const old = withVersus(e => serveFrom(e, 'p2', { source: 'webcam', side: 'forehand', shotType: 'topspin', speed: 1.3 }, 0));
  assert.equal(old.phase, 'RALLY'); assert.equal(old.serve, undefined, 'nessun servizio dal gesto');
  const split = withVersus(e => serveFrom(e, 'p2', serveSwing(.7), 0), { split: true });
  assert.equal(split.phase, 'RALLY'); assert.ok(split.serve && Number.isFinite(split.serve.tau));
});

/* ---------- palla passata dietro il P2 (C18) ---------- */
test('C18: la palla passata dietro il P2 segue la sua posizione come per il P1 (prima fissa a 15,6 m)', () => {
  for (const who of ['p1', 'p2']){
    const r = withVersus(e => {
      const m = who === 'p2' ? -1 : 1, A = actorOf(e, who);
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = who === 'p2' ? 'player' : 'opponent'; e.ball.bounceCountOnCurrentSide = 1;
      A.pos.set(0, 0, m*14.4); A.targetPos.copy(A.pos);
      e.ball.pos.set(.5, .6, m*15.7); e.ball.vel.set(0, 0, m*2);
      e.step(DT);
      const still = e.phase;
      for (let i = 0; i < 240 && e.phase === 'RALLY'; i++) e.step(DT);
      return { still, end: e.phase, z: e.ball.pos.z };
    });
    assert.equal(r.still, 'RALLY', `${who}: a 15,7 m, 1,3 m dietro chi è a 14,4 m, il punto non è ancora finito`);
    assert.notEqual(r.end, 'RALLY', `${who}: poi il punto finisce (${r.z})`);
  }
});

/* ---------- diagnostica del 1v1 (C11) ---------- */
test('C11: diagnostica del 1v1: colpo del P2 «p2», vuoto e servizio chi p2, esito del colpo ricevuto, popup, punto 1v1, sezione P2', async t => {
  globalThis.requestAnimationFrame ??= cb => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame ??= id => clearTimeout(id);
  const real = Math.random; Math.random = mulberry32(17);
  try {
    const e = createHeadlessEngine({ difficulty: '1v1' });
    e.versus = { active: true }; e.roomId = 'AT-AB12'; e.startNewMatch({ showStartBanner: false });
    e.isMultiplayer = true; e.natpfP2Hand = 'right'; e.autoPlayMode = false;
    // il registratore aggancia update (fase, palla, colpo.gioco) e i messaggi a schermo dell'HUD
    e.update = dt => e.step(dt); e.render = () => {};
    const pops = [], hud = { showTimingPopup: o => pops.push(o) };
    e.hud = new Proxy(hud, { get: (t, k) => (k in t ? t[k] : () => {}) });
    let now = 1000;
    const store = memoryStore();
    const R = new DiagRecorder({ engine: e, ui: { controller: 'phone', hand: { hand: 'right' }, training: { active: false } }, store, now: () => now, wallNow: () => Date.UTC(2026, 9, 31, 10, 0, 0) });
    const id = await R.start({ webcamVideo: false, gameVideo: false });
    t.after(() => { if (R.active) R.stop(); });
    // colpi del P2 ricevuti dall'host (natpf_versus_ui._p2Played con il controller finto)
    const mc = {}, v = Object.create(NatpfVersusUi.prototype); Object.assign(v, { engine: e, ui: { diag: { recorder: R } } });
    e.motionController = mc; v._hookTiming();
    // 1) messo in attesa del punto d'impatto, poi giocato
    now += 1000; shotTo(e, 'p2');
    for (let k = 0; k < 360 && (NI.timeToContact(e, e.opponent) ?? 1) > .3; k++) e.update(DT);
    e._handleP2SwingInput(phoneSwing({ shot: 'topspin', power: .7 }, { seq: 11 }));
    mc.onP2Played({ eta: 80, tipo: 'swing', n: 11 });
    for (let k = 0; k < 240 && e.ball.lastHitter !== 'opponent'; k++) e.update(DT);
    e.update(DT);
    assert.equal(e.ball.lastHitter, 'opponent', 'il P2 ha colpito');
    // 2) troppo presto: a vuoto
    now += 3000; shotTo(e, 'p2');
    e._handleP2SwingInput(phoneSwing({ shot: 'topspin', power: .7 }, { seq: 12 }));
    mc.onP2Played({ eta: 70, tipo: 'swing', n: 12 });
    for (let k = 0; k < 360 && e.phase === 'RALLY'; k++) e.update(DT);
    // 3) servizio del P2 dal gesto
    now += 3000; e.phase = 'SERVE_STANCE'; e.ball.inPlay = false;
    e.score.server = 'opponent'; e._startServeToss(e.opponent); e.phaseTimer = .2;
    for (let k = 0; k < 240 && e.ball.vel.y > 0; k++) e.update(DT);
    e._handleP2SwingInput(serveSwing(.7));
    mc.onP2Played({ eta: 60, tipo: 'swing', n: null });
    e.update(DT);
    await R.flush();
    const ev = (await (await store.file(id, 'eventi.jsonl')).text()).trim().split('\n').map(l => JSON.parse(l));
    const by = k => ev.filter(x => x.k === k);
    assert.deepEqual(by('sfida.colpo').map(x => x.esito), ['in attesa', 'in attesa', 'servizio']);
    assert.ok(by('colpo.gioco').some(x => x.chi === 'p2'), 'colpo del P2 come «p2»');
    assert.ok(!by('colpo.gioco').some(x => x.chi === 'cpu'), 'mai «cpu» nel 1v1');
    assert.ok(by('vuoto').some(x => x.chi === 'p2' && x.n === 12), JSON.stringify(by('vuoto')));
    assert.ok(by('servizio').some(x => x.chi === 'p2'), 'servizio del P2 dal gesto');
    assert.ok(by('popup').some(x => x.chi === 'p2' && /WHIFF/.test(x.testo)), JSON.stringify(by('popup')));
    assert.ok(by('punto').length >= 1 && by('punto').every(x => x['1v1'] === true), JSON.stringify(by('punto')));
    const m = computeMetrics(ev);
    assert.ok(m.p2 && m.p2.ricevuti === 3 && m.p2.colpi === 1 && m.p2.servizi?.n === 1 && m.p2.vuoti.presto === 1, JSON.stringify(m.p2));
    assert.equal(m.racchetta?.vuoti?.presto, undefined, 'i vuoti del P2 non sono tra quelli del P1');
    assert.ok(summaryLines(m).some(l => /^Player 2: 3 colpi ricevuti/.test(l)), summaryLines(m).join('\n'));
    await R.stop();
  } finally { Math.random = real; }
});
