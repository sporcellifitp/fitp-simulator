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

// Ottimizzazione del 31/10: update gira a ogni fotogramma; prima querySelector e textContent riscritti sempre (un
// ricalcolo dello stile per fotogramma). Ora si scrive solo quando un valore cambia
test('barre in partita: niente scritture nel DOM se energia e potenza non cambiano', () => {
  const writes = [];
  const node = name => { let text = '', w = ''; return { name, classList: { toggle(){} }, dataset: {}, style: { get width(){ return w; }, set width(v){ writes.push(`${name}.width`); w = v; } }, get textContent(){ return text; }, set textContent(v){ writes.push(`${name}.text`); text = v; } }; };
  const bar = id => { const b = node(id), q = { i: node(`${id}.bar`), '.meter-label': node(`${id}.label`) }; b.q = q; b.querySelector = s => q[s]; return b; };
  const group = id => { const g = node(id), eb = bar(`${id}.energy`), pb = bar(`${id}.power`); g.dataset = { meter: id }; g.eb = eb; g.querySelector = s => (s === '[data-energy]' ? eb : s === '[data-power]' ? pb : null); return g; };
  const meters = [group('p1'), group('p2')];
  const e = { phase: 'RALLY', autoPlayMode: false, player: {}, opponent: {}, playerRole: 'p1', natpfFatigue: new Map(), elapsedTime: 0 };
  const hud = Object.create(NatpfPowerHud.prototype);
  Object.assign(hud, { engine: e, lastShot: null, shown: { player: null, p2: null }, glow: null, root: { classList: { toggle(){} }, querySelectorAll: () => meters } });
  hud.update(1/60, 1);
  const first = writes.length;
  assert.ok(first >= 2, `prima volta scritte larghezza e scritta dell'energia (${first})`);
  for (let i = 0; i < 60; i++) hud.update(1/60, 1 + i/60);
  assert.equal(writes.length, first, 'fotogrammi uguali: nessuna scrittura');
  // la stanchezza cambia: si riscrive solo l'energia
  e.natpfFatigue.set(e.player, { level: .8 });
  hud.update(1/60, 3);
  assert.deepEqual(writes.slice(first).sort(), ['p1.energy.bar.width', 'p1.energy.label.text']);
  assert.equal(meters[0].eb.q['.meter-label'].textContent, 'Stanco!');
  // colpo: la barra della potenza una volta
  e.natpfLastRacket = { who: 'player', intent: { power: .7 }, super: null };
  const before = writes.length;
  hud.update(1/60, 3.1); hud.update(1/60, 3.2);
  assert.deepEqual(writes.slice(before).sort(), ['p1.power.bar.width', 'p1.power.label.text']);
});
