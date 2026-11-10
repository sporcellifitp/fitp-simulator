// B18 · tappa 1 del rapporto B16 (docs/b16/rapporto-gameplay.md, difetto 6 / D6): la barra «Stanco!» si ricarica tra
// un punto e l'altro e riparte da zero a ogni partita nuova. Decisione dell'utente del 29/10: «si stanchi, ma non
// troppo». Prima fatigueStep girava solo con la palla in gioco e il recupero tra i punti (FATIGUE.pointRecover) non
// scattava mai: a Pro la barra restava su «Stanco!» per il 90–95% del tempo, e il visitatore dopo partiva stanco.
// Prove sul motore vero (partite simulate, scripts/audit/rally-balance.mjs), non chiamando fatigueStep a mano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { fatigueLevel, FATIGUE } from '../src/natpf/natpf_skill.js';
import { ENERGY } from '../src/natpf/natpf_power_hud.js';

const DT = 1/120;
const TIRED = 1 - ENERGY.low;   // energia ≤ 0,25: «Stanco!»

test('stanchezza nel motore: a Pro si ricarica tra i punti (quasi mai «Stanco!»), ma lo scambio stanca ancora', () => {
  let steps = 0, tired = 0, maxF = 0, eng = null;
  // passi tra i punti: la stanchezza non sale mai, e dopo la pausa è scesa
  let drops = 0, rises = 0, prev = null;
  simulate({ profile: 'amatore', difficulty: 'pro', points: 40, seed: 7, onStep: e => {
    eng = e; steps++;
    const f = fatigueLevel(e, e.player); maxF = Math.max(maxF, f); if (f >= TIRED) tired++;
    const out = !(e.phase === 'RALLY' && e.ball.inPlay);
    if (out && prev != null){ if (f < prev - 1e-9) drops++; if (f > prev + 1e-9) rises++; }
    prev = f;
  } });
  assert.ok(maxF > .2, `lo scambio stanca ancora: massimo ${maxF.toFixed(2)}`);
  assert.ok(tired/steps < .1, `tempo su «Stanco!» ${(100*tired/steps).toFixed(1)}% (prima 93–96%)`);
  assert.ok(drops > 100, `recupero tra i punti: ${drops} passi in discesa`);
  assert.equal(rises, 0, 'fuori dallo scambio la stanchezza non sale');
  // partita nuova: energia piena
  assert.ok(eng);
  eng.natpfFatigue.set(eng.player, { level: .9, dir: 1 });
  eng.startNewMatch({ showStartBanner: false });
  assert.equal(fatigueLevel(eng, eng.player), 0, 'partita nuova: si riparte da zero');
});

test('stanchezza: pausa tra i punti nel motore (POINT_OVER) al ritmo FATIGUE.pointRecover, e la sessione nello stesso schermo parte da zero', () => {
  const real = Math.random; Math.random = mulberry32(3);
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' });
    e.startNewMatch({ showStartBanner: false });
    // chi gioca corre da una riga all'altra nello scambio (passi del motore, non fatigueStep a mano)
    e.phase = 'RALLY'; e.ball.inPlay = true;
    for (let i = 0; i < 12; i++){ e.player.targetPos.set(i % 2 ? -3 : 3, 0, 11.5); for (let t = 0; t < .7; t += DT) e._stepActorFootwork(e.player, DT); }
    const tiredLevel = fatigueLevel(e, e.player);
    assert.ok(tiredLevel > .5, `stanco dopo lo scambio: ${tiredLevel.toFixed(2)}`);
    // fine del punto: un secondo di pausa del motore
    e._awardPoint('player', 'prova');
    for (let t = 0; t < 1; t += DT) e.step(DT);
    const after = fatigueLevel(e, e.player);
    assert.ok(Math.abs((tiredLevel - after) - FATIGUE.pointRecover) < .02, `un secondo di pausa: ${tiredLevel.toFixed(3)} → ${after.toFixed(3)}`);
    // la CPU non si stanca neanche così
    assert.equal(fatigueLevel(e, e.opponent), 0);
    // stesso schermo: la sessione nuova parte con l'energia piena per tutti e due
    e.natpfFatigue.set(e.opponent, { level: .8, dir: 0 });
    e.startSplit();
    assert.equal(fatigueLevel(e, e.player), 0);
    assert.equal(fatigueLevel(e, e.opponent), 0);
  } finally { Math.random = real; }
});
