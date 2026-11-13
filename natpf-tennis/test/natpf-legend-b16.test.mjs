// B16 (08/11, l'utente: «Leggenda più dura»): la CPU Leggenda torna a battere i giocatori simulati forti. Prima del B16
// contro «tennista» vinceva il 67,3 % dei game (criterio ≥ 85) e contro «preciso» il 25,9 % (criterio ≥ 60).
// Cambiato in natpf_legend.js (LEGEND): primo passo più esplosivo, pressione degli scambi lunghi dal 20° colpo, chiusura
// misurata, controllo dei colpi forti con la scelta che gioca con margine, preferenza per l'incrociato stretto.
// Qui: le singole regole e un torneo ridotto sui due profili forti (deterministico, ~10 s). Il torneo completo con tutti
// i criteri è il comando audit:legend (scripts/audit/legend.mjs, ~70 s), che gira anche su GitHub (natpf-tennis.yml).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as NS from '../src/natpf/natpf_skill.js';
import * as NL from '../src/natpf/natpf_legend.js';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { run, metrics, SEEDS } from '../scripts/audit/legend.mjs';

function engine(seed = 3){
  const real = Math.random; Math.random = mulberry32(seed);
  try {
    const e = createHeadlessEngine({ difficulty: 'leggenda' });
    e.startNewMatch({ showStartBanner: false });
    e.natpfLegendRng = mulberry32(seed*31 + 7);
    return e;
  } finally { Math.random = real; }
}
function rallyBall(e, { bx = 2.6, px = -1, vz = -16, strokes = 4 } = {}){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.bounceCountOnCurrentSide = 1; e.ball.rallyStrokeCount = strokes;
  e.ball.pos.set(bx, 1.0, -11.2); e.ball.vel.set(0, -.5, vz); e.ball.spin.set(14, 0, 0);
  e.opponent.pos.set(bx - .4, 0, -11.6); e.opponent.vel.set(0, 0, 0);
  e.player.pos.set(px, 0, 11.6); e.player.vel.set(0, 0, 0);
}
const tuned = (t, fn) => {
  for (const k of Object.keys(NL.legendTuning)) delete NL.legendTuning[k];
  Object.assign(NL.legendTuning, t);
  try { return fn(); } finally { for (const k of Object.keys(NL.legendTuning)) delete NL.legendTuning[k]; }
};

test('B16: la Leggenda controlla meglio i colpi forti, ma sceglie con il rischio di Esperto (margine)', () => {
  assert.ok(NL.LEGEND.powerErr > 0 && NL.LEGEND.powerErr < 1, `powerErr ${NL.LEGEND.powerErr}`);
  // stessa situazione, stesso generatore: errori d'esecuzione (rete, lungo, largo) con e senza il controllo
  const errors = powerErr => tuned({ powerErr, forceKind: 'corpo' }, () => {
    const e = engine(), rng = mulberry32(21); let n = 0;
    for (let i = 0; i < 800; i++){ rallyBall(e, { bx: i % 2 ? 2.4 : -2.4 }); if (NL.legendReturn(e, e.opponent, rng).err !== 'ok') n++; }
    return n;
  });
  const legend = errors(NL.LEGEND.powerErr), expert = errors(1);
  assert.ok(legend < expert*.85, `errori d'esecuzione: Leggenda ${legend}, regole di Esperto ${expert}`);
  // la scelta stima il rischio con le regole di Esperto: identica qualunque sia il controllo
  const risks = powerErr => tuned({ powerErr }, () => { const e = engine(); rallyBall(e); return NL.legendDecide(e, e.opponent, mulberry32(4)).cands.map(c => +c.pErr.toFixed(6)); });
  assert.deepEqual(risks(NL.LEGEND.powerErr), risks(1));
  // le regole di chi gioca non cambiano
  assert.deepEqual(NS.skillLevel('leggenda').playerErr, NS.skillLevel('pro').playerErr);
});

test('B16 e B18.2 passo 3: la pressione degli scambi lunghi arriva alla Leggenda dal 26° colpo (B42: dal 20° con lo scambio caldo)', () => {
  const q = (strokes, hot = false) => { const e = engine(); e.natpfHot = hot; rallyBall(e, { strokes }); return NL.legendDecide(e, e.opponent, mulberry32(9)).q; };
  // B16: dal 20° colpo (prima dal 10°); B18.2 passo 3, tolta la regola nascosta di chi gioca: dal 26° (scambio caldo spento)
  assert.equal(NL.LEGEND.pressureFrom, 26);
  assert.equal(q(24), q(4), 'nessuna pressione fino al 26° colpo');
  assert.ok(q(32) < q(4), `al 32° colpo la qualità scende (${q(32)} contro ${q(4)})`);
  // B42: con lo scambio caldo (acceso di base) la pressione parte dal 20° colpo, e la qualità cala anche di legendQ × calore;
  // prima del 20° colpo niente cambia
  assert.equal(q(18, true), q(18), 'scambio caldo, 19° colpo: come spento');
  assert.ok(q(24, true) < q(24) - .05, `scambio caldo, 25° colpo: ${q(24, true)} contro ${q(24)}`);
  assert.ok(q(32, true) < q(32), `scambio caldo, 33° colpo: ${q(32, true)} contro ${q(32)}`);
});

test('B16: primo passo più esplosivo, velocità massima invariata e sotto chi gioca', () => {
  const L = NL.LEGEND, lv = NS.skillLevel('leggenda');
  assert.ok(L.accel >= 18 && L.decel >= 26, `${L.accel}/${L.decel}`);
  assert.ok(lv.cpuSpeed < lv.playerSpeed && L.lungeSpeed < lv.playerSpeed);
  // da ferma a 3 m di lato: arriva prima che con l'accelerazione di prima, mai sopra la sua velocità massima
  const time = t => tuned(t, () => {
    const e = engine(), a = e.opponent, dt = 1/120; e.ball.inPlay = false;
    a.pos.set(0, 0, -11.35); a.vel.set(0, 0, 0); a.targetPos.set(3, 0, -11.35);
    for (let i = 1; i < 240; i++){ NL.legendStep(e, a, dt); assert.ok(a.vel.length() <= a.maxSpeed + 1e-9); if (a.pos.x > 2.9) return i*dt; }
    return Infinity;
  });
  const now = time({}), before = time({ accel: 14, decel: 22 });
  assert.ok(now < before - .05, `3 m in ${now.toFixed(2)} s (prima ${before.toFixed(2)} s)`);
});

test('B16: chiusura degli scambi lunghi misurata e incrociato stretto preferito a parità di utilità', () => {
  const L = NL.LEGEND;
  assert.ok(L.closeAggr <= .2 && L.closeWiden <= .3 && L.closePower[1] <= .85, JSON.stringify([L.closeAggr, L.closeWiden, L.closePower]));
  assert.ok(L.angle > 0 && L.angle <= .02);
  // stesso colpo, stessa situazione: la preferenza sposta l'utilità dell'incrociato stretto di angle, gli altri no
  const U = t => tuned(t, () => { const e = engine(); rallyBall(e); return Object.fromEntries(NL.legendDecide(e, e.opponent, mulberry32(6)).cands.map(c => [c.kind, c.U])); });
  const a = U({}), b = U({ angle: 0 });
  assert.ok(Math.abs(a.incrociatoStretto - b.incrociatoStretto - L.angle) < 1e-12);
  for (const k of Object.keys(a)) if (k !== 'incrociatoStretto') assert.ok(Math.abs(a[k] - b[k]) < 1e-12, k);
});

// Torneo ridotto (8 semi × 75 punti) contro i due profili forti. Soglie sui punti, meno rumorosi dei game: chi gioca
// che vince il 33,5 % dei punti vince circa il 15 % dei game (criterio di audit:legend contro «tennista»: CPU ≥ 85 %
// dei game), il 46 % dei punti circa il 40 % dei game (contro «preciso»: CPU ≥ 60 %). Con il B16 25,7 % e 42,8 %;
// prima del B16 (stessi semi, valori di prima con legendTuning) 43,0 % e 60,5 %.
test('B16: la Leggenda batte i profili forti (torneo ridotto, deterministico)', () => {
  const MAX = { tennista: 33.5, preciso: 46 };
  for (const profile of Object.keys(MAX)){
    const m = metrics(run({ profile, difficulty: 'leggenda', points: 75, seeds: SEEDS }));
    assert.ok(m.puntiG <= MAX[profile], `${profile}: chi gioca vince il ${m.puntiG}% dei punti (massimo ${MAX[profile]}%)`);
    assert.ok(m.erroriCPU >= 2 && m.erroriCPU <= 6, `${profile}: errori della CPU ${m.erroriCPU}% per colpo`);
    assert.ok(m.incrociato >= 30 && m.incrociato <= 50, `${profile}: incrociati ${m.incrociato}%`);
    assert.ok(m.infinitiPct <= 1, `${profile}: scambi chiusi a 60 colpi ${m.infinitiPct}%`);
  }
});
