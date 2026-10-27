// Direzione e punti di atterraggio dei colpi del telefono (punto 2 del 19/10, secondo giro): dal gesto simulato
// (test/phone-sim.mjs) al motore vero, per il Player 1 e per il Player 2. Prima la palla cadeva quasi sempre nella stessa
// zona: la mira era solo la rotazione durante il colpo rispetto alla mediana degli ultimi colpi (polso girato prima del
// colpo ignorato, mira annullata dopo due o tre colpi dalla stessa parte) e il tempo del colpo spostava di ±0,5 m.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simPhone } from './phone-sim.mjs';
import { createAimModel, AIM } from '../src/natpf/natpf_gestures.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { eventLatency } from '../src/natpf/natpf_skill.js';

// colpi del telefono con il piatto girato di «deg» gradi (+ = a sinistra, attorno alla verticale) e un gesto (opzioni di swing)
function strokes(plan, { swing = {} } = {}){
  // Compatibilità dei vecchi telefoni senza heading nel profilo: imparano il centro dai tre colpi iniziali.
  const p = simPhone({ seed: 21, calibrationHeading: false }); p.calibrate(); p.pose([1, 0, 0], -35); p.rest(400, 4);
  for (const deg of [0, 0, 0, ...plan]){
    if (deg) p.pose([0, 1, 0], deg, 80);
    p.rest(300, 4); p.swing({ axis: [0, 1, 0], peak: 750, wrist: 500, wristAxis: [0, 0, -1], tremor: 6, ...swing }); p.rest(200, 4);
    if (deg) p.pose([0, 1, 0], -deg, 80);
    p.rest(600, 6);
  }
  return p.msgs.map(d => p.game(d).ev).slice(3);          // i primi tre colpi fanno il centro della mira
}
// il colpo nel motore: palla in arrivo al punto d'impatto del giocatore (P1) o del P2, Math.random fisso. Il P1 passa
// dalla finestra d'impatto (natpfTau: il tempo vero del colpo, qui 30 ms in anticipo), come in partita
function land(ev, { p2 = false, seed = .5, tau = .03 } = {}){
  const real = Math.random; Math.random = () => seed;
  try {
    const e = createHeadlessEngine({ difficulty: 'casual' });
    e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true;
    let net = null, apex = 0;
    if (p2){
      e.isMultiplayer = true; e.versus = { active: true }; e.autoPlayMode = false; e.ball.lastHitter = 'player';
      // specchio della situazione del P1: palla alla destra del P2 (che guarda verso +z: la sua destra è −x)
      e.opponent.pos.set(-1, 0, -11.4); e.opponent.vel.set(0, 0, 0); e.ball.pos.set(-1.6, 1, -10.9); e.ball.vel.set(0, 0, -18);
      e._attemptP2RallyStrike({ ...ev, sweetSpotAssisted: true, natpfLead: tau - eventLatency(ev) });
    } else {
      e.ball.lastHitter = 'opponent'; e.player.pos.set(0, 0, 11.4); e.player.vel.set(0, 0, 0); e.ball.pos.set(.6, 1, 10.9); e.ball.vel.set(0, 0, 18);
      e._attemptPlayerRallyStrike({ ...ev, natpfTau: tau }, false);
    }
    const t = e.ball.targetLanding.clone();
    let z0 = e.ball.pos.z;
    for (let i = 0; i < 600 && e.ball.inPlay; i++){ e.step(1/120); apex = Math.max(apex, e.ball.pos.y); if (Math.sign(z0) !== Math.sign(e.ball.pos.z) && net == null) net = e.ball.pos.y; z0 = e.ball.pos.z; if (e.ball.bounceCountOnCurrentSide) break; }
    return { x: t.x, z: t.z, net, apex };
  } finally { Math.random = real; }
}
const mean = a => a.reduce((s, v) => s + v, 0)/a.length;
const sd = a => Math.sqrt(mean(a.map(v => (v - mean(a))**2)));

test('telefono attuale: sinistra, centro e destra dal primo colpo, senza tre colpi preliminari', () => {
  for (const hand of ['right', 'left']){
    const landings = [20, 0, -20].map(deg => {
      const p = simPhone({ hand, seed: 21, shape: true });
      p.pose([1, 0, 0], -35); p.rest(400, 4);
      p.calibrate({ wrist: 500, wristAxis: [0, 0, -1] });
      if (deg) p.pose([0, 1, 0], deg, 80);
      p.rest(300, 4);
      p.swing({ axis: [0, hand === 'left' ? -1 : 1, 0], peak: 750, wrist: 500, wristAxis: [0, 0, -1], tremor: 6 });
      p.rest(200, 4);
      assert.equal(p.msgs.length, 1, 'un solo swing di gioco, senza riscaldamento nascosto');
      const ev = p.game(p.msgs[0]).ev;
      assert.ok(Number.isFinite(ev.natpf.aimDev));
      return { p1: land(ev, { tau: 0 }), p2: land({ ...ev, role: 'p2' }, { p2: true, tau: 0 }) };
    });
    const xs = landings.map(r => r.p1.x);
    assert.ok(xs[0] < xs[1] - .7 && xs[2] > xs[1] + .7, `${hand}: ${xs}`);
    const p2 = landings.map(r => r.p2.x);
    assert.ok(p2[0] > p2[1] + .7 && p2[2] < p2[1] - .7, `${hand} P2: ${p2}`);
  }
});

test('mira dal piatto: girato a sinistra, al centro, a destra → tre zone distinte e ripetibili, anche cinque volte di fila', () => {
  const evs = strokes([20, 20, 20, 20, 20, 0, 0, 0, 0, -20, -20, -20, -20, -20]);
  const L = evs.slice(0, 5).map(e => land(e)), C = evs.slice(5, 9).map(e => land(e)), R = evs.slice(9).map(e => land(e));
  const xs = g => g.map(r => r.x);
  // racchetta virtuale: un dritto neutro va un poco incrociato (a sinistra per il destro); il piatto sposta da lì
  assert.ok(mean(xs(L)) < mean(xs(C)) - 1.2, `sinistra ${xs(L).map(v => v.toFixed(2))} centro ${xs(C).map(v => v.toFixed(2))}`);
  assert.ok(mean(xs(R)) > mean(xs(C)) + 1.2, `destra ${xs(R).map(v => v.toFixed(2))} centro ${xs(C).map(v => v.toFixed(2))}`);
  assert.ok(Math.abs(mean(xs(C))) < 1.5, `centro ${xs(C).map(v => v.toFixed(2))}`);
  // gesti simili, risultati vicini (senza caso: la differenza viene solo dal gesto)
  for (const g of [L, C, R]) assert.ok(sd(xs(g)) < .5, `dispersione ${sd(xs(g)).toFixed(2)}`);
  // dentro il campo e sopra la rete
  for (const r of [...L, ...C, ...R]){ assert.ok(Math.abs(r.x) < 4.3 && r.z < -5 && r.z > -12.1, JSON.stringify(r)); assert.ok(r.net > .95, `rete ${r.net}`); }
});

test('mira continua: piccole rotazioni spostano poco, grandi spostano molto, senza salti', () => {
  const plan = [5, 10, 15, 20, 25, 30];
  const xs = strokes(plan).map(e => land(e).x);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] <= xs[i - 1] + .15, `monotona: ${xs.map(v => v.toFixed(2))}`);
  for (let i = 1; i < xs.length; i++) assert.ok(Math.abs(xs[i] - xs[i - 1]) < 1.2, `senza salti: ${xs.map(v => v.toFixed(2))}`);
  assert.ok(xs[0] - xs.at(-1) > 1.2, `ampiezza ${xs.map(v => v.toFixed(2))}`);
});

test('Player 2: stessa logica dal suo lato del campo (piatto a sinistra = palla alla sua sinistra, cioè x > 0)', () => {
  const evs = strokes([20, 20, 0, -20, -20]);
  const L = evs.slice(0, 2).map(e => land({ ...e, role: 'p2' }, { p2: true }).x), R = evs.slice(3).map(e => land({ ...e, role: 'p2' }, { p2: true }).x);
  assert.ok(mean(L) > mean(R) + 2, `P2 sinistra ${L}, destra ${R}`);
  // stesso colpo, situazioni speculari: il P2 manda la palla dove la manderebbe il P1, specchiata
  const P1 = evs.slice(0, 2).map(e => land(e).x);
  for (let i = 0; i < 2; i++) assert.ok(Math.abs(L[i] + P1[i]) < .35, `P2 ${L[i]} P1 ${P1[i]}`);
  const z = land({ ...evs[2], role: 'p2' }, { p2: true }).z;
  assert.ok(z > 5 && z < 12.1, `P2 nella metà del P1: ${z}`);
});

test('tempo del colpo: in anticipo incrociato, in ritardo lungolinea, in modo continuo', () => {
  const base = strokes([0])[0];
  // tempo vero del colpo dalla finestra d'impatto (natpfTau: s di anticipo)
  const at = lead => land({ ...base, natpf: { ...base.natpf, latency: 0 } }, { tau: lead }).x;
  const xs = [0, .05, .1, .15].map(at);
  // dritto del destro: incrociato = verso la sua sinistra (x < 0)
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] < xs[i - 1] + .1, `anticipo → incrociato: ${xs.map(v => v.toFixed(2))}`);
  assert.ok(xs[0] - xs.at(-1) > .8, `ampiezza ${xs.map(v => v.toFixed(2))}`);
});

test('pallonetto e palla corta: traiettorie diverse dal dritto, sempre oltre la rete', () => {
  const drive = land(strokes([0])[0]);
  const lob = land(strokes([0], { swing: { axis: [1, .35, 0], peak: 650, vy: 9, push: 2, wrist: 0 } })[0]);
  const drop = land(strokes([0], { swing: { axis: [.6, 1, 0], peak: 430, vy: -8, push: 2, wrist: 0 } })[0]);
  assert.ok(lob.apex > drive.apex + 2 && lob.z < -8.5, `pallonetto ${JSON.stringify(lob)} · dritto ${JSON.stringify(drive)}`);
  assert.ok(drop.z > -5 && drop.net > .95, `palla corta ${JSON.stringify(drop)}`);
});

test('centro della mira: segue i colpi normali e la deriva lenta, non i colpi mirati', () => {
  const m = createAimModel();
  for (const h of [2, -1, 1]) m.add(1, h);
  assert.ok(Math.abs(m.center(1)) < 1.5);
  for (let i = 0; i < 6; i++) m.add(1, -25);                 // sei colpi mirati a sinistra
  assert.ok(m.aim(1, -25).aim < -.6, `ancora mirato: ${JSON.stringify(m.aim(1, -25))}`);
  for (let i = 0; i < 40; i++) m.add(1, 30 + (i % 3));      // deriva lunga: il centro la raggiunge
  assert.ok(Math.abs(m.aim(1, 31).aim) < .5, `deriva recuperata: ${m.center(1)}`);
  assert.equal(m.aim(1, 31 + AIM.maxDev + 20).aim, null, 'scarto non credibile');
});
