// Episodi della partita del 23/10 ricostruiti nel motore vero, senza grafica (docs/NATPF_DIAGNOSI_2026-10-23.md, T2):
// un gesto debole in anticipo (la preparazione) e il colpo vero che arriva dopo il punto d'impatto. Prima la palla la
// colpiva il gesto debole (palle corte, fuori, schiacciate non volute) e il colpo vero era scartato («palla che si
// allontana»); ora si gioca il colpo vero. Valori dal registro: velocità al picco (°/s) e tempo rispetto all'impatto.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NI from '../src/natpf/natpf_impact.js';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';
import { classifyStroke, faceAimFromDev } from '../src/natpf/natpf_stroke_intent.js';

const DT = 1/120;
function withEngine(difficulty, fn){
  const real = Math.random; Math.random = mulberry32(23);
  try { const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false }); return fn(e); }
  finally { Math.random = real; }
}
function cpuShot(e, { from = [-1.7, 1, -7.75], to = [2.07, 10.4], flight = 1.0, topspin = 14, player = [.8, 11.7] } = {}){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 0; e.ball.rallyStrokeCount = 3;
  e.player.pos.set(player[0], 0, player[1]); e.player.targetPos.copy(e.player.pos); e.player.vel.set(0, 0, 0);
  e.pendingUserSwing = null;
  e.ball.pos.set(...from);
  e._launchBallToTarget(e.ball.pos, new THREE.Vector3(to[0], 0, to[1]), flight, { topspin });
  e._natpfPlanPlayer();
}
// gesto del telefono come arriva dal collegamento: velocità al picco, colpo tipico di chi gioca, numero del colpo
const swing = ({ peak, typical = 1105, seq, shot = 'topspin', power = null, side = 'forehand', angle }) => {
  const p = power ?? Math.min(1, Math.max(.05, (peak - 250)/1100));
  return { source: 'natpf-phone', side, shotType: ENGINE_SHOT[shot], speed: .8 + p*.85, dirX: 0,
    natpf: { aim: 'swing', shot, intent: { shot, power: p, depth: p, rise: 0, face: 0 }, power: p, peak, typical, seq, latency: 0, hand: 'right', ...(angle != null ? { angle } : {}) } };
};
// manda ogni gesto quando mancano «lead» secondi all'impatto (negativo: dopo), poi gioca fino al colpo o alla fine
function play(e, list, maxT = 3.5){
  const queue = [...list].sort((a, b) => b.lead - a.lead), whiffs = [], weak = [];
  const W = e._natpfEarlyWhiff.bind(e), D = e._natpfWeakDropped?.bind(e) || (() => {});
  e._natpfEarlyWhiff = ps => { whiffs.push(ps); return W(ps); };
  e._natpfWeakDropped = ps => { weak.push(ps); return D(ps); };
  for (let t = 0; t < maxT; t += DT){
    const ttc = NI.timeToContact(e, e.player);
    while (queue.length && ttc != null && ttc <= queue[0].lead) e._handleUserSwingInput(queue.shift().swing);
    e.step(DT);
    if (e.phase !== 'RALLY' || (e.ball.lastHitter === 'player' && e.ball.pos.z < 0)) break;
  }
  return { hit: e.ball.lastHitter === 'player', seq: e.natpfLastRacket?.seq ?? null, racket: e.natpfLastRacket, whiffs, weak, phase: e.phase };
}

test('episodio A (66,0 s): gesto da 71 °/s 0,33 s prima, colpo vero da 1246 °/s 0,07 s dopo → si gioca il colpo vero', () => {
  const r = withEngine('leggenda', e => { cpuShot(e); return play(e, [{ lead: .33, swing: swing({ peak: 71, seq: 54, shot: 'drop' }) }, { lead: -.07, swing: swing({ peak: 1246, seq: 55 }) }]); });
  assert.equal(r.hit, true); assert.equal(r.seq, 55, 'il colpo è quello vero');
  assert.notEqual(r.racket.out.shot, 'DROP');
  assert.equal(r.whiffs.length, 0);
});

test('episodio B (129,2 s): gesto da 172 °/s 0,24 s prima, colpo vero da 1176 °/s 0,04 s dopo → si gioca il colpo vero', () => {
  const r = withEngine('leggenda', e => { cpuShot(e, { from: [1.33, .85, -9.38], to: [-.1, 10.1], flight: .9 }); return play(e, [{ lead: .24, swing: swing({ peak: 172, seq: 93, shot: 'drop' }) }, { lead: -.04, swing: swing({ peak: 1176, seq: 94 }) }]); });
  assert.equal(r.hit, true); assert.equal(r.seq, 94);
});

test('n. 75/76 (98,4 s): preparazione da 286 °/s e 52° 0,14 s prima, colpo vero da 889 °/s 0,06 s dopo → il colpo vero', () => {
  const r = withEngine('leggenda', e => { cpuShot(e); return play(e, [{ lead: .14, swing: swing({ peak: 286, angle: 52, seq: 75, shot: 'drop' }) }, { lead: -.06, swing: swing({ peak: 889, angle: 77, seq: 76 }) }]); });
  assert.equal(r.hit, true); assert.equal(r.seq, 76);
});

test('n. 77 (101,3 s): gesto ampio ma debole al giroscopio (267 °/s, 34°: braccio con il polso fermo), senza altro colpo → si gioca lo stesso', () => {
  const r = withEngine('leggenda', e => { cpuShot(e); return play(e, [{ lead: .15, swing: swing({ peak: 267, angle: 34, seq: 77 }) }]); });
  assert.equal(r.hit, true); assert.equal(r.seq, 77); assert.equal(r.whiffs.length, 0);
});

test('gesto debole da solo, in anticipo: nessun colpo e nessuno swing a vuoto a schermo (la palla passa)', () => {
  const r = withEngine('leggenda', e => { cpuShot(e); return play(e, [{ lead: .3, swing: swing({ peak: 120, seq: 1 }) }]); });
  assert.equal(r.hit, false); assert.equal(r.whiffs.length, 0); assert.equal(r.weak.length, 1);
});

test('gesto debole ma in tempo (un tocco morbido voluto): si gioca come prima', () => {
  const r = withEngine('leggenda', e => { cpuShot(e); return play(e, [{ lead: .03, swing: swing({ peak: 200, seq: 2, shot: 'drop', power: .1 }) }]); });
  assert.equal(r.hit, true); assert.equal(r.seq, 2);
});

test('chi gioca con colpetti piccoli (colpo tipico 120 °/s): un colpetto da 65 °/s in anticipo colpisce come prima', () => {
  const r = withEngine('leggenda', e => { cpuShot(e); return play(e, [{ lead: .2, swing: swing({ peak: 65, typical: 120, seq: 3, power: .4 }) }]); });
  assert.equal(r.hit, true); assert.equal(r.seq, 3);
});

test('senza colpo tipico (profilo semplice, webcam): nessun gesto è debole, come prima', () => {
  const r = withEngine('leggenda', e => { cpuShot(e); return play(e, [{ lead: .2, swing: swing({ peak: 70, typical: null, seq: 4, power: .3 }) }]); });
  assert.equal(r.hit, true); assert.equal(r.seq, 4);
});

test('il rientro debole dopo il punto d\'impatto non fa uno swing a vuoto a schermo', () => {
  const r = withEngine('leggenda', e => { cpuShot(e); return play(e, [{ lead: -.25, swing: swing({ peak: 150, seq: 5 }) }]); });
  assert.equal(r.hit, false); assert.equal(r.whiffs.length, 0);
});

// servizio: il lancio parte, un gesto debole prima del colmo, la battuta vera dopo il colmo (n 82 e 83 del registro)
function serve(e, gestures){
  e._setupPointServe?.({ showBanner: false });
  e.score.server = 'player'; e.phase = 'SERVE_STANCE'; e.autoPlayMode = false; e.userHasInteracted = true;
  e._startServeToss(e.player);
  const queue = [...gestures].sort((a, b) => b.tau - a.tau);
  for (let t = 0; t < 3 && e.phase === 'SERVE_TOSS'; t += DT){
    const tau = e.ball.vel.y/9.15;
    while (queue.length && e.phaseTimer > .2 && tau <= queue[0].tau) e._handleUserSwingInput(queue.shift().swing);
    e.step(DT);
  }
  return e.natpfLastServe;
}
test('servizio: un gesto debole prima del colmo e la battuta vera 0,4 s dopo → batte la battuta vera', () => {
  const s = withEngine('leggenda', e => serve(e, [{ tau: .22, swing: swing({ peak: 175, seq: 82 }) }, { tau: -.17, swing: swing({ peak: 898, seq: 83 }) }]));
  assert.ok(s, 'servizio battuto'); assert.ok(Math.abs(s.tau + .17) < .03, `tempo della battuta ${s.tau}`);
});
test('servizio: un gesto debole da solo vale lo stesso (non si resta senza servizio), con il suo tempo', () => {
  const s = withEngine('leggenda', e => serve(e, [{ tau: .22, swing: swing({ peak: 175, seq: 82 }) }]));
  assert.ok(s, 'servizio battuto'); assert.ok(Math.abs(s.tau - .22) < .03, `tempo della battuta ${s.tau}`);
});

// tipo di colpo dalla forma (natpf_stroke_intent.js), con i valori del registro
test('n. 64 (79,1 s): dritto da 1005 °/s in top spin (piano 0,65, salita 0,63) resta top spin, non pallonetto', () => {
  assert.equal(classifyStroke({ rise: .63, plane: .65, tilt: .2 }, { power: .8, angle: 107 }).shot, 'topspin');
  // il pallonetto resta: swing nettamente verticale con la testa che sale, o gesto morbido in salita
  assert.equal(classifyStroke({ rise: .75, plane: .3, tilt: .3 }, { power: .7, angle: 90 }).shot, 'lob');
  assert.equal(classifyStroke({ rise: .7, plane: .9, tilt: .3 }, { power: .25, angle: 60 }).shot, 'lob');
});
test('palla corta solo da un gesto vero: un micro-movimento che scende (13°) non è una palla corta', () => {
  assert.notEqual(classifyStroke({ rise: -.45, plane: .5 }, { power: .03, angle: 13 }).shot, 'drop');
  assert.equal(classifyStroke({ rise: -.45, plane: .5 }, { power: .2, angle: 40 }).shot, 'drop');
});

test('mira dal piatto: fino a 45° di scarto come prima, poi sempre meno credibile, da 60° non conta (il 23/10 scarti di 50–77°)', () => {
  assert.equal(faceAimFromDev(5), 0); assert.equal(faceAimFromDev(22), .5); assert.equal(faceAimFromDev(-36), -1);
  assert.ok(faceAimFromDev(52) > .4 && faceAimFromDev(52) < .6);
  assert.equal(faceAimFromDev(60), 0); assert.equal(Math.abs(faceAimFromDev(-73.4)), 0);
});
