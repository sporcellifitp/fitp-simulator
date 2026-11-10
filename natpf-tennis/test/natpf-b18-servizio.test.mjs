// B18 · tappa 1 del rapporto B16 (docs/b16/rapporto-gameplay.md, difetto 12 / D12): il servizio insegnato dava sempre
// un tagliato, e più forte diventava più lento (presa nel palmo a 1,2×: kick con volo 0,93 s invece di 0,78). Ora:
//   • il tipo si giudica rispetto al servizio abituale di chi gioca (SERVE.habit, poi imparato dai propri servizi);
//   • un gesto più forte non dà mai una palla più lenta (il volo dipende solo dal ritmo, non dal tipo);
//   • «Gran servizio» si misura sulla propria forza di servizio.
// Prove con il telefono simulato completo (servizio del tutorial, prese palmo e martello) e nel motore vero.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as NO from '../src/natpf/natpf_stroke_outcome.js';
import * as GP from '../src/natpf/natpf_gesture_pose.js';
import { calibratedPhone, playPose } from './pose-sensors.mjs';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

const DT = 1/120;
const { serveOutcome, createServeRef, SERVE } = NO;
// servizio insegnato nel tutorial (presa nel palmo, 1×, telefono simulato): salita −0,08, |piano| 0,50, forza 0,5
const taught = { rise: -.08, plane: .5, power: .5, face: 0 };

test('D12: il servizio insegnato è un servizio piatto (prima tagliato); kick e tagliato solo se il gesto si stacca dal proprio servizio', () => {
  assert.equal(serveOutcome({ intent: taught }).kind, 'flat');
  assert.equal(serveOutcome({ intent: { ...taught, plane: .6 } }).kind, 'flat', 'prima: tagliato da |piano| 0,4');
  assert.equal(serveOutcome({ intent: { ...taught, rise: .15 } }).kind, 'flat', 'prima: kick da salita 0,12');
  assert.equal(serveOutcome({ intent: { ...taught, rise: .25 } }).kind, 'kick');
  assert.equal(serveOutcome({ intent: { ...taught, plane: -.85 } }).kind, 'slice');
  // chi serve abitualmente con la testa che scende (presa a martello: salita −0,38): il kick arriva prima
  const hammer = { rise: -.38, plane: .5, power: .5 };
  assert.equal(serveOutcome({ intent: { ...taught, rise: -.05 }, ref: hammer }).kind, 'kick');
  assert.equal(serveOutcome({ intent: { ...taught, rise: -.38 }, ref: hammer }).kind, 'flat');
});

test('D12: un gesto più forte non dà mai una palla più lenta, qualunque sia il tipo', () => {
  for (const rise of [-.4, -.08, .1, .3, .6]) for (const plane of [0, .5, .9]){
    let prev = null;
    for (let power = 0; power <= 1.0001; power += .05){
      const o = serveOutcome({ intent: { rise, plane, power } });
      if (prev) assert.ok(o.flight <= prev.flight + 1e-9 && o.depth >= prev.depth - 1e-9, `salita ${rise} piano ${plane} forza ${power.toFixed(2)}: volo ${prev.flight} → ${o.flight}`);
      prev = o;
    }
  }
  // tipi diversi alla stessa forza: stesso volo (prima il kick volava fino al 30% in più del piatto)
  const at = k => serveOutcome({ intent: { ...taught, power: .7, ...k } }).flight;
  assert.equal(at({ rise: .4 }), at({}));
  assert.equal(at({ plane: .9 }), at({}));
});

test('D12: «Gran servizio» sulla propria forza di servizio; il riferimento impara solo dai propri servizi piatti', () => {
  const great = (power, ref) => serveOutcome({ intent: { ...taught, power }, ref }).grade === 'POWER SERVE!';
  assert.equal(great(.5, null), false, 'il servizio insegnato a 1× è «Buono»');
  assert.equal(great(.62, null), true);
  // chi serve piano (forza abituale 0,3): un servizio un po' più forte del suo è un gran servizio (prima serviva 0,62)
  assert.equal(great(.42, { ...SERVE.habit, power: .3 }), true);
  // chi serve forte (0,75): il suo servizio di sempre no
  assert.equal(great(.78, { ...SERVE.habit, power: .75 }), false);
  assert.equal(great(.86, { ...SERVE.habit, power: .75 }), true);
  // fuori tempo mai
  assert.equal(serveOutcome({ intent: { ...taught, power: 1 }, tau: .5 }).grade === 'POWER SERVE!', false);
  // la palla «potente» per la CPU (ball.isPowerShot) resta con la regola di prima: a tempo e ritmo ≥ 0,62
  assert.equal(serveOutcome({ intent: { ...taught, power: .42 }, ref: { ...SERVE.habit, power: .3 } }).strong, false);
  assert.equal(serveOutcome({ intent: { ...taught, power: .7 } }).strong, true);
  assert.equal(serveOutcome({ intent: { ...taught, power: .6 } }).strong, false, 'ritmo 0,6 sotto 0,62');
  assert.equal(serveOutcome({ intent: { ...taught, power: .6 } }).grade, 'POWER SERVE!', '«Gran servizio» sì: 0,1 sopra il servizio insegnato');
  // servizi senza la forma del telefono (webcam, mouse): il volo per tipo di prima (il kick resta più lento)
  const d = serveOutcome({ intent: { shot: 'topspin', rise: .3, power: .5, derived: true } });
  assert.equal(d.kind, 'kick');
  assert.equal(d.flight, +(SERVE.legacyFlight.kick[0] + (SERVE.legacyFlight.kick[1] - SERVE.legacyFlight.kick[0])*.5).toFixed(3));
  const r = createServeRef();
  for (let i = 0; i < 8; i++) r.learn({ rise: -.38, plane: .55, power: .3 }, { kind: 'flat' });
  assert.ok(Math.abs(r.value.rise + .38) < .03 && Math.abs(r.value.power - .3) < .02, JSON.stringify(r.value));
  const before = r.value;
  r.learn({ rise: .5, plane: .55, power: .9 }, { kind: 'kick' });       // un kick voluto non sposta il proprio servizio
  r.learn({ shot: 'topspin', rise: .3, power: .9, derived: true });      // né un servizio dalla webcam o dal mouse
  assert.deepEqual(r.value, before);
  r.reset(); assert.deepEqual(r.value, { ...SERVE.habit, n: 0 });
});

// battuta del servizio del tutorial (secondo gesto) letta dal computer con il telefono simulato
const src = grip => ({ pose: (id, t, hand) => GP.gesturePose(id, t, { hand, grip }), plan: id => GP.gesturePlan(id, { grip }) });
function serveEvent(S, p, rate){
  const P = S.plan('serve'); let sw = false, n = 0;
  p.det.on('swing', () => { n++; if (n === 1) sw = true; });
  p.det.setContext('serve');
  const b = p.msgs.length;
  playPose(p, t => S.pose('serve', t, 'right'), { t1: P.total, rate, after: () => { if (sw){ sw = false; p.det.setContext('toss'); } } });
  p.rest(600, 3);
  const m = p.msgs.slice(b);
  return m.length < 2 ? null : p.game(m[1], { ballHigh: false, rally: false, learn: false }).ev;
}
function engineServe(e, ev){
  e.score.server = 'player'; e.phase = 'SERVE_STANCE';
  e._startServeToss(e.player);
  for (let i = 0; i < 400 && e.ball.vel.y > 0; i++) e.step(DT);
  e._executeServeHit(e.player, { ...ev, natpfServeTau: 0 });
  return e.natpfLastServe;
}

test('D12: servizio del tutorial dal telefono simulato, da 0,7× a 1,5×: mai un tagliato a 1×, più forte sempre più veloce (km/h nel motore)', () => {
  for (const grip of ['palmo', 'martello']){
    const S = src(grip), p = calibratedPhone(S, { hand: 'right', cal: 'pose', seed: 7 });
    const own = [0, 1, 2].map(() => serveEvent(S, p, 1));
    const seq = [];
    for (const rate of [.7, .9, 1, 1.1, 1.2, 1.3, 1.5]){
      const ev = serveEvent(S, p, rate); assert.ok(ev, `${grip} ${rate}×: servizio non letto`);
      const real = Math.random; Math.random = mulberry32(31);
      try {
        const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
        for (const o of own) engineServe(e, o);
        seq.push({ rate, ...engineServe(e, ev) });
      } finally { Math.random = real; }
    }
    const one = seq.find(s => s.rate === 1);
    assert.equal(one.kind, 'flat', `${grip} 1×: ${one.kind}`);
    assert.equal(one.grade, 'GOOD SERVE');
    for (let i = 1; i < seq.length; i++){
      const a = seq[i - 1], b = seq[i];
      assert.ok(b.flight <= a.flight + 1e-9, `${grip} ${a.rate}× → ${b.rate}×: volo ${a.flight} → ${b.flight} (${a.kind} → ${b.kind})`);
      assert.ok(b.kmh >= a.kmh - 2, `${grip} ${a.rate}× → ${b.rate}×: ${a.kmh} → ${b.kmh} km/h (${a.kind} → ${b.kind})`);
    }
    assert.equal(seq.at(-1).grade, 'POWER SERVE!');
  }
});

test('D12: nel motore il servizio abituale si impara dai servizi e si azzera a ogni partita nuova', () => {
  const real = Math.random; Math.random = mulberry32(5);
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
    const ev = intent => ({ source: 'natpf-phone', side: 'overhead', speed: 1.2, natpf: { aim: 'swing', shot: 'topspin', intent } });
    for (let i = 0; i < 6; i++) engineServe(e, ev({ rise: -.38, plane: .5, power: .3, face: 0 }));
    const ref = NO.serveRefOf(e, e.player).value;
    assert.ok(ref.n === 6 && ref.rise < -.3 && ref.power < .35, JSON.stringify(ref));
    // per chi serve così, un servizio con la testa che sale di 0,35 è un kick (per il riferimento insegnato no)
    assert.equal(engineServe(e, ev({ rise: -.03, plane: .5, power: .35, face: 0 })).kind, 'kick');
    assert.equal(engineServe(e, ev({ rise: -.38, plane: .5, power: .45, face: 0 })).grade, 'POWER SERVE!');
    e.startNewMatch({ showStartBanner: false });
    assert.equal(NO.serveRefOf(e, e.player).value.n, 0);
    assert.equal(engineServe(e, ev({ rise: -.03, plane: .5, power: .35, face: 0 })).kind, 'flat');
  } finally { Math.random = real; }
});
