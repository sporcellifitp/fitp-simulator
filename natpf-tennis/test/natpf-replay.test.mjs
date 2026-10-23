// Moviola (segnalazione del 23/10, sera): «Rivedi il punto» metteva in scena sempre lo stesso scambio a rete del modello
// di partenza, non il punto giocato. Ora rimette in scena l'ultimo punto finito (natpf_replay.js): palla e giocatori
// dove erano, i colpi negli stessi istanti, al rallentatore; poi si torna al servizio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleAt, REPLAY } from '../src/natpf/natpf_replay.js';

async function pointPlayed(){
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(3);
  const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
  e.autoPlayMode = false; e.userHasInteracted = true;
  e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
  // il giocatore lascia passare la palla: il punto finisce da solo (servizio della CPU, palla non presa o fuori)
  const seen = [];
  let t = 0;
  for (; t < 12 && !(e.natpfReplay.available); t += 1/120){
    e.step(1/120);
    if (e.phase === 'RALLY' && e.ball.inPlay) seen.push({ t: e.natpfReplay.cur?.t, b: e.ball.pos.clone(), p: e.player.pos.clone() });
  }
  Math.random = real;
  return { e, seen };
}

test('moviola: si registra il punto giocato, palla e giocatori, fino a poco dopo la fine', async () => {
  const { e, seen } = await pointPlayed();
  assert.ok(e.natpfReplay.available, 'punto registrato');
  const L = e.natpfReplay.last;
  assert.ok(L.frames.length > 20 && L.end - L.start > 1, `${L.frames.length} fotogrammi, ${(L.end - L.start).toFixed(2)} s`);
  // la registrazione passa per dove era davvero la palla
  for (const s of seen.filter((_, i) => i % 40 === 0)){
    const f = sampleAt(L.frames, s.t);
    assert.ok(Math.hypot(f.b[0] - s.b.x, f.b[1] - s.b.y, f.b[2] - s.b.z) < .5, `palla a ${s.t.toFixed(2)} s: registrata ${f.b.map(v => v.toFixed(2))}, vera ${s.b.toArray().map(v => v.toFixed(2))}`);
  }
});

test('moviola: rimette in scena l’ultimo punto al rallentatore (non la scena fissa a rete), poi torna al servizio', async () => {
  const { e, seen } = await pointPlayed();
  e._enterInstantReplayState({ persistent: false });
  assert.equal(e.phase, 'REPLAY'); assert.ok(e.natpfReplay.playing);
  // non la posa fissa di prima (giocatore a 0,95 m dalla rete)
  assert.ok(Math.abs(e.player.pos.z - .95) > 1, `giocatore a ${e.player.pos.z.toFixed(2)} m dalla rete`);
  const L = e.natpfReplay.last, dur = L.end - L.start;
  // a metà del punto (tempo del punto), palla dove era
  const mid = seen[Math.floor(seen.length/2)];
  let replayT = L.start, steps = 0;
  while (replayT < mid.t && steps < 10000){ e.step(1/120*REPLAY.speed); replayT += 1/120*REPLAY.speed; steps++; }
  assert.ok(e.ball.pos.distanceTo(mid.b) < .6 && Math.abs(e.player.pos.z - mid.p.z) < .6, `a ${mid.t.toFixed(2)} s: palla ${e.ball.pos.toArray().map(v => v.toFixed(2))} (vera ${mid.b.toArray().map(v => v.toFixed(2))})`);
  // fino in fondo e poi al servizio
  for (let k = 0; k < (dur + REPLAY.hold + 1)*120 && e.phase === 'REPLAY'; k++) e.step(1/120*REPLAY.speed);
  assert.equal(e.phase, 'SERVE_STANCE'); assert.ok(!e.natpfReplay.playing);
});

test('moviola: senza un punto finito non c’è (la dimostrazione del menu tiene la sua scena)', async () => {
  const { createHeadlessEngine } = await import('../scripts/audit/headless-engine.mjs');
  const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
  assert.ok(!e.natpfReplay.available);
  e._enterInstantReplayState({ persistent: true });
  assert.ok(!e.natpfReplay.playing && e.phase === 'REPLAY');
});
