// B36.0 «Misurare prima» (docs/b36/misure-b36-0.md): il gioco non cambia, si aggiungono solo misure.
//   - registro dello stand sul motore vero (senza grafica): la riga «colpo» porta il primo rimbalzo vero della palla (rx,
//     rz) e «fuori» (fu) esattamente come lo chiama il motore;
//   - modello della direzione (natpf_direction.js): oggi solo «classica», nessun colpo con la regola nuova.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { RegistroStand } from '../src/natpf/registro/registro_registratore.js';
import { codaMemoria } from '../src/natpf/registro/registro_coda.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';
import { directionSpan, lateSpanOf, slowFactor } from '../src/natpf/natpf_stroke_outcome.js';
import { dirModelOf, usedNewRule, DIR_MODELS, DIR_DEFAULT } from '../src/natpf/natpf_direction.js';

const storageFinto = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
// colpo del telefono con la forma: piatto face (−1…+1), scarto della cima dev (gradi)
const colpoTel = (face, dev) => ({ source: 'natpf-phone', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: 0, timing: null,
  natpf: { aim: 'swing', shot: 'topspin', power: .5, latency: 0, hand: 'right', aimDev: dev, peak: 800, typical: 780, aimFull: 17,
    intent: { shot: 'topspin', power: .5, typePower: .5, depth: .5, rise: .3, face, conf: 1 } } });

test('B36.0: modello della direzione — oggi solo «classica», nessun colpo con la regola nuova', () => {
  assert.deepEqual([...DIR_MODELS], ['classica', 'nuova']); assert.equal(DIR_DEFAULT, 'classica');
  assert.equal(dirModelOf(null), 'classica'); assert.equal(dirModelOf({}), 'classica'); assert.equal(dirModelOf({ natpfDirModel: 'boh' }), 'classica');
  assert.equal(dirModelOf({ natpfDirModel: 'nuova' }), 'nuova');
  assert.equal(usedNewRule(null), false); assert.equal(usedNewRule({ x: 1 }), false); assert.equal(usedNewRule({ rule: 'nuova' }), true);
  const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
  assert.equal(dirModelOf(e), 'classica', 'il motore di oggi non sceglie un modello: classica');
});

test('B36.0: sul motore vero il registro scrive il primo rimbalzo vero e «fuori» come l’arbitro del motore', async () => {
  const real = Math.random; Math.random = () => .5;
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' }), coda = codaMemoria();
    // rimbalzi e punti come li vede il motore (prima del registro: il registro li avvolge da fuori)
    const visti = [], punti = [], ring = e._spawnBounceRing, award = e._awardPoint.bind(e);
    e._spawnBounceRing = (x, z) => { visti.push({ x, z, chi: e.ball.lastHitter, n: e.ball.bounceCountOnCurrentSide }); return ring(x, z); };
    e._awardPoint = (who, why = '') => { punti.push({ who, why, rimbalzi: visti.length }); return award(who, why); };
    const R = new RegistroStand({ engine: e, ui: {}, coda, storage: storageFinto(), now: () => e.elapsedTime*1000, wallNow: () => Date.UTC(2026, 10, 14, 10), win: null, raf: () => {}, timers: false });
    e.startNewMatch({ showStartBanner: false });
    const lv = skillLevel('pro'), vz = 18, span = directionSpan(lv)*slowFactor(vz), late = lateSpanOf(vz, lv);
    const casi = [[0, 0], [.6, .3], [-.6, -.3], [1, 1.1], [-1, -1.2], [1, -1.6], [.3, 1.5], [-.2, 0]];
    const attesi = [];
    for (const [face, u] of casi){
      e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = 3; e.pendingUserSwing = null;
      e.player.pos.set(0, 0, 11.4); e.player.vel.set(0, 0, 0); e.player.targetPos.copy(e.player.pos); e.player.swingCooldown = 0;
      e.ball.pos.set(.6, 1, 10.9); e.ball.vel.set(0, 0, vz); e.ball.targetLanding.set(.6, 0, 9);
      const tau = u >= 0 ? u*span : u*late, primaV = visti.length, primaP = punti.length;
      const ok = e._attemptPlayerRallyStrike({ ...colpoTel(face, 3 + 14*face), natpfTau: tau, natpfLateSpan: late }, false);
      assert.ok(ok, `colpo ${face}/${u}`);
      for (let i = 0; i < 900 && punti.length === primaP && !(visti.length > primaV && e.ball.bounceCountOnCurrentSide >= 1 && e.ball.pos.y > .5); i++) e.step(1/120);
      const primo = visti.slice(primaV).find(b => b.chi === 'player' && b.n === 0) || null;
      const fuori = !!primo && punti.slice(primaP).some(p => p.why === 'Out' && p.rimbalzi === visti.indexOf(primo) + 1);
      attesi.push({ face, u, rx: primo ? +primo.x.toFixed(2) : undefined, rz: primo ? +primo.z.toFixed(2) : undefined, fu: fuori ? 1 : undefined });
      // il punto si chiude (la palla dentro va avanti fino alla CPU o al secondo rimbalzo: qui basta il primo)
      if (e.ball.inPlay) e._awardPoint('player', 'Nice Shot!');
    }
    await R.blocco();
    const rows = []; for (const b of await coda.elenco()) for (const l of (await coda.leggi(b.id)).trim().split('\n')) rows.push(JSON.parse(l));
    const colpi = rows.filter(r => r.k === 'colpo');
    assert.equal(colpi.length, casi.length);
    assert.deepEqual(colpi.map(c => ({ rx: c.rx, rz: c.rz, fu: c.fu })), attesi.map(a => ({ rx: a.rx, rz: a.rz, fu: a.fu })));
    assert.ok(attesi.some(a => a.fu) && attesi.some(a => a.rx != null && !a.fu), `dentro e fuori tra i casi: ${JSON.stringify(attesi)}`);
    // piatto e scarto della cima del gesto, tempo in finestre dell'esito; il modello «classica» nella partita
    assert.deepEqual(colpi.map(c => c.pf), casi.map(([f]) => f));
    assert.deepEqual(colpi.map(c => c.dv), casi.map(([f]) => +(3 + 14*f).toFixed(1)));
    for (const [i, c] of colpi.entries()) assert.ok(Math.abs(c.tu - casi[i][1]) < .02, `tempo ${c.tu} contro ${casi[i][1]}`);
    assert.equal(rows.find(r => r.k === 'partita').dir, 'classica');
    assert.ok(colpi.every(c => c.nr === undefined), 'nessun colpo con la regola nuova');
  } finally { Math.random = real; }
});
