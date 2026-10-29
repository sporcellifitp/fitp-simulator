// Barra della potenza con il colpo super, palla super con l'alone ed energia di chi gioca (richiesta del 29/10 sera,
// partita 191023: il colpo super e la stanchezza non si vedevano). src/natpf/natpf_power_hud.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { powerView, energyView, NatpfPowerHud, ENERGY } from '../src/natpf/natpf_power_hud.js';
import { SUPER } from '../src/natpf/natpf_stroke_outcome.js';
import * as THREE from 'three';
import { NatpfShotFeedback } from '../src/natpf/natpf_shot_feedback.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';

test('potenza: forza del gesto, sopra la soglia «Fortissimo», il colpo super piena e «SUPER!»', () => {
  assert.deepEqual(powerView({ intent: { power: .5 } }), { fill: .5, super: false, label: 'Potenza' });
  assert.equal(powerView({ intent: { power: .7 } }).label, 'Forte');
  assert.equal(powerView({ intent: { power: SUPER.power } }).label, 'Fortissimo');
  assert.deepEqual(powerView({ intent: { power: .9 }, super: 'alta' }), { fill: 1, super: true, label: 'SUPER!' });
  assert.equal(powerView(null), null);
});

test('energia: piena senza stanchezza, «affaticato» oltre metà, «stanco» oltre tre quarti', () => {
  assert.deepEqual(energyView(0), { fill: 1, state: 'ok' });
  assert.equal(energyView(ENERGY.tired + .01).state, 'affaticato');
  assert.equal(energyView(ENERGY.low + .01).state, 'stanco');
  assert.equal(energyView(5).fill, 0);
});

test('nel motore: il colpo super accende la barra d\'oro di chi l\'ha fatto e l\'alone sulla palla in volo; la stanchezza si legge', () => {
  const real = Math.random; Math.random = mulberry32(9);
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
    e.autoPlayMode = false; e.phase = 'RALLY';
    e.scene ||= new THREE.Scene();
    const hud = new NatpfPowerHud(e);
    assert.ok(hud.glow, 'alone nella scena');
    e.ball.inPlay = true; e.ball.pos.set(1, 1.2, -4); e.ball.natpfSuper = 'alta';
    e.natpfLastRacket = { who: 'player', intent: { power: .93 }, super: 'alta' };
    hud.update(1/60, 10);
    assert.equal(hud.glow.visible, true); assert.ok(hud.glow.position.distanceTo(e.ball.pos) < 1e-9);
    assert.equal(hud.shown.player.super, true); assert.equal(hud.shown.player.label, 'SUPER!');
    // colpo normale del P2: la sua barra, non quella del P1
    e.natpfLastRacket = { who: 'p2', intent: { power: .6 }, super: null };
    e.ball.natpfSuper = null; hud.update(1/60, 11);
    assert.equal(hud.glow.visible, false);
    assert.equal(hud.shown.p2.super, false); assert.equal(hud.shown.player.super, true);
    // stanchezza del personaggio (natpf_skill.fatigueStep) → energia
    (e.natpfFatigue ||= new Map()).set(e.player, { level: .8 });
    assert.equal(energyView(.8).state, 'stanco');
    // fuori partita niente alone
    e.ball.natpfSuper = 'alta'; e.phase = 'TITLE'; hud.update(1/60, 12);
    assert.equal(hud.glow.visible, false);
  } finally { Math.random = real; }
});

test('esito del colpo: «SUPER SHOT» del motore diventa «Super!» in oro (prima lo copriva «Perfetto»)', () => {
  const shown = [], had = globalThis.document;
  globalThis.document = { getElementById: () => null };
  try {
    const engine = { scene: { add(){} }, ball: { targetLanding: { x: 0, z: -8 } }, playerRole: 'p1', elapsedTime: 0, hud: { showTimingPopup: o => shown.push(o) } };
    new NatpfShotFeedback(engine);
    engine.hud.showTimingPopup({ grade: 'PERFECT \u2022 SUPER SHOT!', detail: '150 KM/H' });
    engine.hud.showTimingPopup({ grade: 'PERFECT \u2022 FOREHAND TOPSPIN!', detail: '110 KM/H' });
    assert.equal(shown[0].grade, 'Super!'); assert.equal(shown[1].grade, 'Perfetto');
  } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});
