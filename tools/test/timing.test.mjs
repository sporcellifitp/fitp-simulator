import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeMatch } from '../../site/js/match/arcade.js';
import { CONTACT, crossingTime, evaluateContact } from '../../site/js/match/contact.js';
import { createControls } from '../../site/js/tennis/controls.js';
import { createPresentationTimeline, readGuestInput, matchInputTime, phoneInputTime } from '../../site/js/tennis/input-time.js';
import { encodeSnap, createMirror } from '../../site/js/tennis/net.js';
import { mulberry32 } from '../../site/js/match/core.js';

function incoming(team = 0, auto = false){
  const teams = [[{ id: 'a', human: team === 0, grace: .45 }], [{ id: 'b', human: team === 1, grace: .45 }]];
  const c = new ArcadeMatch({ teams, firstServer: 1-team, rng: mulberry32(12) });
  const h = c.players[team], sign = team === 0 ? 1 : -1;
  c.phase = 'live'; c.rally.hit(1-team); c.rally.event({ type: 'bounce', x: sign*.7, z: sign*4, side: team }); c.rally.hit(team); c.rally.hit(1-team);
  c.sinceHit = .5; c.ball.held = false;
  Object.assign(h, { x: 0, z: sign*8, tx: 0, tz: sign*8, auto });
  c.ball.p = { x: sign*.7, y: 1.3, z: sign*5.8 }; c.ball.v = { x: 0, y: 1.5, z: sign*8 };
  return { c, h };
}

test('timestamps: host validates match seconds without a browser millisecond clock', () => {
  const d = readGuestInput({ sw: [{ at: 12.15, power: .7, dir: -1 }], ts: [{ at: 12.12 }], mv: { x: 1, y: 1 }, auto: false }, 12.3);
  assert.equal(d.sw[0].at, 12.15); assert.equal(d.ts[0].at, 12.12);
  assert.deepEqual(d.mv, { x: 0, y: 0 }); assert.equal(d.auto, true);
  assert.equal(readGuestInput({ sw: [{ at: 60000 }] }, 12.3).sw.length, 0);
  for (const bad of [NaN, Infinity, -Infinity, '12.2', null]) assert.equal(matchInputTime(bad, 12.3), null);
  assert.equal(matchInputTime(11, 12.3), null);
  assert.equal(matchInputTime(12.25, 12.3, 12.28), null);
  assert.equal(matchInputTime(12.32, 12.3), 12.3);
});

test('presentation: gesture is attributed to the displayed frame, including stalls and resets', () => {
  const t = createPresentationTimeline(); t.reset(60, 12);
  t.record(60.033, 12.033); t.record(60.066, 12.066);
  assert.equal(t.seenAt(60.048), 12.033);
  assert.equal(t.seenAt(60.2), 12.066, 'a stalled display does not advance the ball');
  t.reset(90, 12.066);
  assert.equal(t.seenAt(60.048), null, 'pause clears old gestures');
  assert.equal(t.seenAt(90.01), 12.066);
  t.reset(100, 0); assert.equal(t.seenAt(90.01), null, 'new match clears old frames');
});

test('plane crossing includes historic movement of the player for both teams', () => {
  for (const team of [0, 1]){
    const sign = team === 0 ? 1 : -1;
    const a = { t: 1, p: { x: .7, y: 1, z: 6.8*sign }, players: { p: { x: 0, z: 8*sign, team } } };
    const b = { t: 1.02, p: { x: .7, y: 1, z: 7*sign }, players: { p: { x: 0, z: 7.8*sign, team } } };
    assert.ok(Math.abs(crossingTime(a, b, 'p') - 1.01) < 1e-10);
  }
});

test('contact cue uses current racket zone, not an unrelated movement forecast', () => {
  const player = { x: 0, z: 8, team: 0, vz: 0 }, ball = { x: .7, y: 1.1, z: 7 };
  const args = { ball, player, velocity: { z: 8 }, timeToImpact: .4 };
  assert.equal(evaluateContact(args).perfect, true, 'actual contact overrides stale forecast');
  assert.equal(evaluateContact({ ...args, eligible: false }).perfect, false, 'no volley return on serve');
  assert.equal(evaluateContact({ ...args, velocity: { z: -8 } }).perfect, false, 'outgoing ball is not a cue');
  assert.equal(evaluateContact({ ...args, ball: { ...ball, x: 3 } }).perfect, false);
  assert.equal(evaluateContact({ ...args, ball: { ...ball, y: 3.5 } }).perfect, false);
});

test('green frame -> phone controls -> host input -> perfect contact, both sides, 30/60/120 FPS and delays', () => {
  for (const team of [0, 1]) for (const auto of [false, true]) for (const fps of [30, 60, 120]) for (const latency of [0, .06, .18, .32]){
    const { c, h } = incoming(team, auto), ctrl = createControls(); ctrl.enabled = true;
    const timeline = createPresentationTimeline(); timeline.reset(100, c.t);
    let scheduled = null, contact = null;
    for (let frame = 0; frame < fps*2 && !contact; frame++){
      const n = Math.ceil(120/fps), dt = 1/fps/n;
      for (let sub = 0; sub < n && !contact; sub++){
        let sw = [];
        if (scheduled && !scheduled.sent && c.t >= scheduled.arrive){
          scheduled.sent = true;
          ctrl.phoneSwing({ at: scheduled.wall, power: .6, dir: 1 });
          const command = ctrl.read().swings.map(s => ({ ...s, at: timeline.seenAt(s.at) }));
          const packet = readGuestInput({ sw: command }, c.t);
          sw = packet.sw.map(s => ({ ...s, delay: s.at - c.t - dt }));
        }
        const events = c.update(dt, { [h.id]: { swings: sw, auto } });
        contact = events.find(e => e.type === 'contact' && e.player === h.id);
      }
      timeline.record(100 + c.t, c.t);
      const cue = evaluateContact({ ball: c.ball.p, velocity: c.ball.v, player: h, eligible: c.legalFor(h) });
      if (!scheduled && cue.perfect) scheduled = { wall: 100 + c.t, arrive: c.t + latency, at: c.t };
    }
    const msg = JSON.stringify({ team, auto, fps, latency, scheduled, contact });
    assert.ok(scheduled, 'no green frame: '+msg);
    assert.equal(contact?.label, 'perfetto', msg);
    assert.ok(Math.abs(contact.at - scheduled.at) <= CONTACT.perfect + .01, msg);
    assert.ok(c.t - h.anim.at < .17, 'delayed contact must still have a visible follow-through: '+msg);
  }
});

test('history records ball and player together; reading beyond newest sample never extrapolates', () => {
  const { c, h } = incoming(); c.update(.01, { auto: false }); const oldX = h.x;
  h.x = h.tx = 1; c.update(.01, { auto: false });
  const k = c.histAt(.015); assert.ok(Math.abs(k.players[h.id].x - (oldX+1)/2) < 1e-12);
  assert.equal(c.histAt(100).t, .02);
  assert.equal(c.histAt(-1), null);
});

test('snapshots carry contact velocity/eligibility and cap time when extrapolation freezes', () => {
  const { c } = incoming(); c.update(.01, { auto: false });
  const M = createMirror({ players: c.players.map(p => ({ id: p.id, team: p.team })) });
  const s = encodeSnap(c, 60000); M.push(s);
  const v = M.view(s.ct); assert.equal(v.ball.v.z, s.b[5]); assert.equal(v.players[0].contactEligible, true);
  assert.equal(M.view(100).t, s.ct + .15);
  const old = structuredClone(s); old.p = old.p.map(p => p.slice(0,5));
  const legacy = createMirror({ players: c.players }); legacy.push(old);
  assert.ok(Number.isFinite(legacy.view(old.ct).players[0].vz));
});

test('stale/future input cannot create swing animations or poison the match', () => {
  const { c, h } = incoming();
  for (const delay of [NaN, Infinity, -Infinity, 59000, -10]) c.addSwing(h, { delay });
  assert.equal(h.swings.length, 0); assert.equal(h.anim, null);
  assert.ok(Number.isFinite(c.ball.p.x));
});

test('guest interpolated green frames retain their timing through snapshot and input latency', () => {
  for (const team of [0, 1]) for (const auto of [false, true]) for (const fps of [30, 60, 120]){
    const { c, h } = incoming(team, auto), M = createMirror({ players: c.players });
    const snaps = [], timeline = createPresentationTimeline();
    let scheduled = null, contact = null;
    for (let tick = 1; tick <= 480 && !contact; tick++){
      const dt = 1/240;
      let input = [];
      if (scheduled && !scheduled.sent && c.t >= scheduled.arrive){
        scheduled.sent = true;
        input = readGuestInput({ sw: [{ at: timeline.seenAt(scheduled.wall), power: .6 }] }, c.t).sw
          .map(s => ({ ...s, delay: s.at - c.t - dt }));
      }
      contact = c.update(dt, { [h.id]: { auto, swings: input } }).find(e => e.type === 'contact' && e.player === h.id);
      if (tick % 8 === 0) snaps.push({ arrival: c.t + .04, snap: encodeSnap(c, 100000 + c.t*1000) });
      while (snaps.length && snaps[0].arrival <= c.t) M.push(snaps.shift().snap);
      if (tick % (240/fps) === 0 && M.last){
        const v = M.view(c.t - .14), p = v.players.find(p => p.id === h.id);
        timeline.record(100 + c.t, v.t);
        const cue = evaluateContact({ ball: v.ball.p, velocity: v.ball.v, player: p, eligible: p.contactEligible });
        if (!scheduled && cue.perfect) scheduled = { wall: 100 + c.t, at: v.t, arrive: c.t + .12 };
      }
    }
    const msg = JSON.stringify({ team, auto, fps, scheduled, contact });
    assert.ok(scheduled, msg); assert.equal(contact?.label, 'perfetto', msg);
    assert.ok(Math.abs(contact.at - scheduled.at) <= .01, msg);
  }
});

test('mirror waits for a fresh snapshot after pause, without counting paused wall time', () => {
  const { c } = incoming(), M = createMirror({ players: c.players });
  c.t = 12; M.push(encodeSnap(c, 60000));
  M.resetClock();
  assert.equal(M.view(12.1), null);
  assert.equal(M.coreNow(90000, { toRemote: t => t }), 12);
  c.t = 12.02; M.push(encodeSnap(c, 90000));
  assert.equal(M.rate, 1); assert.equal(M.view(12.02).t, 12.02);
});

test('a deferred second bounce never advertises a new legal green contact', () => {
  const { c, h } = incoming();
  c.shadow = Object.assign(Object.create(Object.getPrototypeOf(c.rally)), c.rally);
  c.shadow.end(1-h.team, 'vincente');
  assert.equal(c.legalFor(h), false);
  assert.equal(evaluateContact({ ball: { x: .7, y: 1, z: 7 }, velocity: { z: 8 }, player: h, eligible: c.legalFor(h) }).perfect, false);
});


test('phone link preserves delayed peaks instead of shifting them to a later displayed frame', () => {
  const clock = { ok: true, toLocal: t => t - 5000 };
  assert.equal(phoneInputTime({ peakMs: 64400, nowMs: 60000, clock }), 59.4);
  assert.equal(phoneInputTime({ peakMs: 63000, nowMs: 60000, clock }), 58, 'wall-clock stalls preserve the original frame');
  assert.equal(readGuestInput({ sw: [{ at: 10 }] }, 10.9).sw.length, 0, 'match-time age remains bounded independently');
  assert.equal(phoneInputTime({ peakMs: 65020, nowMs: 60000, clock }), 60);
  assert.equal(phoneInputTime({ peakMs: 65080, nowMs: 60000, clock }), null);
  assert.equal(phoneInputTime({ peakMs: 61000, nowMs: 60000, clock }), null);
  assert.equal(phoneInputTime({ peakMs: NaN, nowMs: 60000, clock }), null);
  assert.equal(phoneInputTime({ nowMs: 60000, clock: { ok: false }, latencyMs: 80 }), 59.92);
});
