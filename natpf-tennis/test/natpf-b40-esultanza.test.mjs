// B40.5 · esultanza e applauso in loop a fine partita (player_body_animation.js): chi vince «cheer» (salta con la racchetta
// alzata senza calare, periodo 0,683 s, posa a t e t + P uguale: loop chiuso), chi perde «loss» per un secondo e poi «clap»
// (la mano libera batte sulle corde della racchetta tenuta davanti al petto, due volte per periodo). Classici e Lob & Drop
// 3D, destri e mancini; piedi mai sotto il campo; nei punti normali niente cambia. Attori montati come nel motore
// (test/mascotte-campo.mjs), racchetta guidata da racket_kinematics come in partita.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CHEER_W, CHEER_PERIOD, CLAP_AFTER, CLAP_STRINGS_Y, triggerPointReaction } from '../src/player_body_animation.js';
import { RACKET_POINTS } from '../src/natpf/natpf_character.js';
import { mascotRigProbe } from '../src/natpf/natpf_mascot_rig.js';
import { resetMascotModels, setMascotMode } from '../src/natpf/natpf_mascot_models.js';
import { resetCast } from '../src/natpf/natpf_personaggi.js';
import { engineOf, useModels, world } from './mascotte-campo.mjs';

test.after(() => { resetMascotModels(); setMascotMode(null); resetCast(); });
// (come il motore: niente lastPointWinner, le reazioni le fa partire _awardPoint)
const OVER = { phase: 'MATCH_OVER', score: { server: 'player' }, ball: null };
const DT = CHEER_PERIOD/40;
const strings = a => a.racketMesh.localToWorld(new THREE.Vector3(0, CLAP_STRINGS_Y, 0));
const tip = a => a.racketMesh.localToWorld(new THREE.Vector3(0, RACKET_POINTS.tip, 0));
// pose: punti che si vedono nel ritratto (testa, mani, punta della racchetta, radice)
const pose = a => [world(a.parts.head), world(a.parts.handL), world(a.parts.handR), tip(a), a.root.position.clone()];
const run = (E, seconds, dt = DT, each = null) => { const n = Math.round(seconds/dt); for (let i = 0; i < n; i++){ E.step(dt, OVER); each?.(i*dt + dt); } };

test('B40.5: costanti (periodo 2π/9,2, centro delle corde come il modello della racchetta)', () => {
  assert.ok(Math.abs(CHEER_PERIOD - 0.683) < 0.001);
  assert.equal(CHEER_W, 9.2);
  assert.equal(CLAP_STRINGS_Y, RACKET_POINTS.center);
  assert.equal(CLAP_AFTER, 1);
});

for (const lefty of [false, true]){
  test(`B40.5: fine partita, chi vince esulta in loop e chi perde applaude (Classici, ${lefty ? 'mancini' : 'destri'})`, () => {
    resetMascotModels(); setMascotMode(null); resetCast();
    const E = engineOf();
    if (lefty) for (const a of [E.player, E.opponent]) a.root.scale.x = -1;
    // il punto che chiude la partita: il motore fa partire le reazioni dei punti, poi la fase è MATCH_OVER
    triggerPointReaction(E.player, 'win'); triggerPointReaction(E.opponent, 'loss');
    run(E, 0.5);
    assert.equal(E.player.rig.reaction.type, 'cheer');
    assert.equal(E.opponent.rig.reaction.type, 'loss', 'prima un secondo a testa bassa');
    run(E, 1.5);
    assert.equal(E.opponent.rig.reaction.type, 'clap');
    // esultanza: salto alto a ogni ciclo tra 3 e 6 s (prima scendeva al 53 %), racchetta alzata sopra la testa
    run(E, 1);
    let low = Infinity, minFoot = Infinity, minTipOverHead = Infinity;
    for (let c = 0; c < 4; c++){
      let top = 0;
      run(E, CHEER_PERIOD, DT, () => {
        top = Math.max(top, E.player.rig.verticalHopOffset);
        for (const a of [E.player, E.opponent]) for (const f of [a.parts.footL, a.parts.footR]) minFoot = Math.min(minFoot, world(f).y);
        minTipOverHead = Math.min(minTipOverHead, tip(E.player).y - world(E.player.parts.head).y);
      });
      low = Math.min(low, top);
    }
    assert.ok(low >= 0.12, `salto di ogni ciclo ≥ 12 cm: ${low.toFixed(3)}`);
    assert.ok(minTipOverHead > 0, `racchetta alzata: punta sopra la testa (${minTipOverHead.toFixed(3)} m)`);
    assert.ok(minFoot > -0.02, `piedi mai sotto il campo: ${minFoot.toFixed(3)}`);
    // loop chiuso: la posa dopo un periodo è la stessa (entro 1 mm)
    for (const who of ['player', 'opponent']){
      const a = pose(E[who]); run(E, CHEER_PERIOD); const b = pose(E[who]);
      const worst = Math.max(...a.map((p, i) => p.distanceTo(b[i])));
      assert.ok(worst < 0.001, `${who}: posa dopo un periodo uguale entro 1 mm (${(worst*1000).toFixed(2)} mm)`);
    }
    // applauso: la mano libera tocca le corde (< 8 cm) e si allontana (> 18 cm) a ogni mezzo periodo; ≥ 4 battute in 1,5 s
    let claps = 0, near = false, minD = Infinity, maxD = 0;
    const half = Math.round(CHEER_PERIOD/2/DT); let i = 0, hMin = Infinity, hMax = 0, cycles = [];
    run(E, 1.5, DT, () => {
      const d = world(E.opponent.parts.handL).distanceTo(strings(E.opponent));
      minD = Math.min(minD, d); maxD = Math.max(maxD, d); hMin = Math.min(hMin, d); hMax = Math.max(hMax, d);
      if (d < 0.08 && !near){ claps++; near = true; } else if (d > 0.18) near = false;
      if (++i % half === 0){ cycles.push([hMin, hMax]); hMin = Infinity; hMax = 0; }
    });
    assert.ok(claps >= 4, `battute in 1,5 s: ${claps} (vicino ${minD.toFixed(3)}, lontano ${maxD.toFixed(3)})`);
    for (const [a, b] of cycles) assert.ok(a < 0.08 && b > 0.18, `ogni mezzo periodo: ${a.toFixed(3)} → ${b.toFixed(3)}`);
  });
}

test('B40.5: Lob & Drop 3D, la mano libera della mascotte batte sulle corde con lo stesso ritmo; chi vince salta', () => {
  useModels();
  const E = engineOf();
  triggerPointReaction(E.player, 'win'); triggerPointReaction(E.opponent, 'loss');
  run(E, 3);
  assert.equal(E.player.rig.reaction.type, 'cheer'); assert.equal(E.opponent.rig.reaction.type, 'clap');
  const probe = {};
  let claps = 0, near = false, minD = Infinity, maxD = 0, top = 0;
  run(E, 1.5, DT, () => {
    mascotRigProbe(E.opponent.natpfMascot3d, E.opponent, probe);
    const d = probe.palmB.distanceTo(strings(E.opponent));
    minD = Math.min(minD, d); maxD = Math.max(maxD, d);
    if (d < 0.1 && !near){ claps++; near = true; } else if (d > 0.15) near = false;
    top = Math.max(top, E.player.rig.verticalHopOffset);
  });
  assert.ok(claps >= 4, `battute della mascotte in 1,5 s: ${claps} (vicino ${minD.toFixed(3)}, lontano ${maxD.toFixed(3)})`);
  assert.ok(top >= 0.12, `Drop salta: ${top.toFixed(3)}`);
});

test('B40.5: nei punti normali niente cambia (reazione «win» che cala e si spegne al servizio)', () => {
  resetMascotModels(); setMascotMode(null); resetCast();
  const E = engineOf();
  triggerPointReaction(E.player, 'win');
  const ctx = { phase: 'POINT_OVER', lastPointWinner: 'player', score: { server: 'player' }, ball: null };
  let early = 0, late = 0;
  for (let i = 0; i < 150; i++){ E.step(1/60, ctx); const h = E.player.rig.verticalHopOffset; if (i < 30) early = Math.max(early, h); if (i > 110) late = Math.max(late, h); }
  assert.equal(E.player.rig.reaction.type, 'win');
  assert.ok(late < early*0.75, `l'esultanza del punto cala: ${early.toFixed(3)} → ${late.toFixed(3)}`);
  E.step(1/60, { ...ctx, phase: 'SERVE_STANCE' });
  assert.equal(E.player.rig.reaction.active, false);
});
