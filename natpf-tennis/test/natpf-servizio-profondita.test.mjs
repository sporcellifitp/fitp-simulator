// Diagnostiche del 30/10 (20261030-142317 e -142438, C4): tutti i servizi dal gesto cadevano 0,9–1,4 m prima della
// profondità voluta (11 su 11): il lancio del servizio non correggeva l'attrito dell'aria come gli altri colpi (fixAir).
// Decisione dell'utente del 31/10: il servizio cade alla profondità vera. Qui: rimbalzo entro 0,3 m dalla profondità
// voluta per servizio piatto, tagliato e in kick, da tutte e due le metà del campo e con ogni forza, e palla sopra la rete.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import * as NO from '../src/natpf/natpf_stroke_outcome.js';

const DT = 1/120;
const INTENT = {
  flat: { rise: 0, plane: 0, face: 0 },
  slice: { rise: 0, plane: .6, face: 0 },
  kick: { rise: .3, plane: 0, face: 0 },
};

// un servizio del P1 dal gesto, al punto più alto del lancio: dove rimbalza e quanto passa sopra la rete
export function serveOnce({ kind, power, deuceSide, tau = 0, face = 0 }){
  const real = Math.random; Math.random = mulberry32(31);
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' });
    e.startNewMatch({ showStartBanner: false });
    e.score.server = 'player'; e.score.deuceSide = deuceSide;
    e.phase = 'SERVE_STANCE';
    e._startServeToss(e.player);
    for (let i = 0; i < 400 && e.ball.vel.y > 0; i++) e.step(DT);
    const intent = { ...INTENT[kind], face, power };
    e._executeServeHit(e.player, { natpf: { intent }, natpfServeTau: tau, speed: 1.2 });
    const want = e.natpfLastServe;
    assert.equal(want.kind, kind);
    let net = null, bounce = null, prev = e.ball.pos.clone();
    for (let i = 0; i < 600 && !bounce; i++){
      e.step(DT);
      if (net == null && prev.z > 0 && e.ball.pos.z <= 0) net = prev.y + (e.ball.pos.y - prev.y)*(prev.z/(prev.z - e.ball.pos.z));
      if (e.ball.vel.y > 0 && e.ball.pos.y <= .08) bounce = { x: e.ball.pos.x, z: e.ball.pos.z };
      if (!bounce && e.phase !== 'RALLY') break;
      prev = e.ball.pos.clone();
    }
    return { want, net, bounce, phase: e.phase };
  } finally { Math.random = real; }
}

test('C4: il servizio dal gesto rimbalza entro 0,3 m dalla profondità voluta (piatto, tagliato, kick)', () => {
  for (const kind of ['flat', 'slice', 'kick']) for (const power of [0, .5, 1]) for (const deuceSide of [true, false]) for (const face of [-1, 0, 1]){
    const r = serveOnce({ kind, power, deuceSide, face });
    const tag = `${kind} forza ${power} piatto ${face} ${deuceSide ? 'parità' : 'vantaggio'}`;
    assert.ok(r.bounce, `${tag}: nessun rimbalzo (fase ${r.phase}, rete ${r.net})`);
    const got = -r.bounce.z;
    assert.ok(Math.abs(got - r.want.depth) <= .3, `${tag}: voluta ${r.want.depth} m, rimbalzo a ${got.toFixed(2)} m`);
    // nel quadrato e vicino al punto voluto anche di lato
    assert.ok(Math.abs(r.bounce.x - r.want.x) <= .35, `${tag}: di lato voluto ${r.want.x}, rimbalzo a ${r.bounce.x.toFixed(2)}`);
    assert.ok(Math.sign(r.bounce.x) === Math.sign(r.want.x) && Math.abs(r.bounce.x) < 4.115, `${tag}: fuori dal quadrato di lato (${r.bounce.x.toFixed(2)})`);
    assert.ok(r.net >= .914 + .1, `${tag}: sopra la rete solo di ${(r.net - .914).toFixed(2)} m`);
  }
});

test('C4: anche il servizio sporco (in anticipo o in ritardo) cade dove dice il suo esito', () => {
  for (const tau of [.35, -.45]){
    const r = serveOnce({ kind: 'flat', power: .7, deuceSide: true, tau });
    assert.ok(r.bounce && Math.abs(-r.bounce.z - r.want.depth) <= .3, `tau ${tau}: voluta ${r.want.depth}, rimbalzo ${r.bounce && -r.bounce.z}`);
  }
});

test('C4: il servizio più profondo resta dentro il quadrato (riga del servizio a 6,4 m)', () => {
  assert.ok(NO.SERVE.depth[1] + .3 < 6.4);
  for (const kind of ['flat', 'slice', 'kick']){
    const r = serveOnce({ kind, power: 1, deuceSide: false });
    assert.ok(-r.bounce.z < 6.4, `${kind}: rimbalzo a ${(-r.bounce.z).toFixed(2)} m`);
  }
});

// Revisione del 31/10: nel 1v1 anche il servizio del P2 dal gesto deve cadere alla profondità vera (prima la correzione
// valeva solo per l'host e la sfida diventava asimmetrica)
test('C4: nel 1v1 il servizio del P2 dal gesto cade alla stessa profondità di quello del P1', () => {
  const real = Math.random; Math.random = mulberry32(31);
  try {
    for (const kind of ['flat', 'slice', 'kick']){
      const e = createHeadlessEngine({ difficulty: 'pro' });
      e.startNewMatch({ showStartBanner: false });
      e.isMultiplayer = true; e.versus = { active: true, closing: false, local: true };
      e.score.server = 'opponent'; e.score.deuceSide = true;
      e.phase = 'SERVE_STANCE';
      e._startServeToss(e.opponent);
      for (let i = 0; i < 400 && e.ball.vel.y > 0; i++) e.step(DT);
      e._executeServeHit(e.opponent, { natpf: { intent: { ...INTENT[kind], face: 0, power: .5 } }, natpfServeTau: 0, speed: 1.2 });
      const want = e.natpfLastServe;
      assert.equal(want.kind, kind);
      let bounce = null;
      for (let i = 0; i < 600 && !bounce; i++){ e.step(DT); if (e.ball.vel.y > 0 && e.ball.pos.y <= .08) bounce = { z: e.ball.pos.z }; }
      assert.ok(bounce, `${kind}: nessun rimbalzo`);
      assert.ok(Math.abs(bounce.z - want.depth) <= .3, `${kind}: voluta ${want.depth} m, rimbalzo a ${bounce.z.toFixed(2)} m dalla rete`);
      const p1 = serveOnce({ kind, power: .5, deuceSide: true });
      assert.ok(Math.abs(bounce.z - -p1.bounce.z) <= .3, `${kind}: P2 ${bounce.z.toFixed(2)} m, P1 ${(-p1.bounce.z).toFixed(2)} m`);
    }
  } finally { Math.random = real; }
});
