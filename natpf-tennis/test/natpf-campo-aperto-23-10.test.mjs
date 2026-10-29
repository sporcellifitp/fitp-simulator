// Campo aperto (richiesta del 23/10, docs/NATPF_DIAGNOSI_2026-10-23.md C3): con il solo tempo dentro la finestra si va da
// una riga all'altra, da tutte e due le parti (lungolinea pieno in ritardo, incrociato pieno in anticipo), il centro si
// sceglie con il tempo giusto, e il livello non cambia dove si può mandare la palla (cambia la precisione richiesta).
// Prima: il lungolinea pieno chiedeva anche il piatto (in ritardo al bordo della finestra il 57% della mira, a Leggenda il
// 43%): il 23/10 i dritti non sono mai andati oltre 1,7 m dal centro dalla parte del lungolinea.
import test from 'node:test';
import assert from 'node:assert/strict';
import { strokeOutcome, directionSpan } from '../src/natpf/natpf_stroke_outcome.js';
import { skillLevel } from '../src/natpf/natpf_skill.js';

const LEVELS = ['casual', 'pro', 'leggenda', '1v1'];
const shot = (lv, o = {}) => strokeOutcome({ contact: 1, hitX: 0, quality: 1, contactY: 1, level: lv, ...o, intent: { shot: 'topspin', power: .6, depth: .6, rise: .25, face: 0, ...(o.intent || {}) } });
const SIDE = 4.115;   // riga laterale del singolare

test('lungolinea e incrociato pieni con il solo tempo, da tutte e due le parti e da ogni posizione, a tutti i livelli', () => {
  for (const name of LEVELS){
    const lv = skillLevel(name), span = directionSpan(lv);
    for (const contact of [1, -1]) for (const hitX of [-2.5, 0, 2.5]){
      // in ritardo al bordo della finestra: lungolinea, dalla parte del lato del colpo
      const line = shot(lv, { contact, hitX, timing: -span, lateSpan: span }).x*contact;
      // in anticipo al bordo: incrociato, dalla parte opposta
      const cross = -shot(lv, { contact, hitX, timing: span, lateSpan: span }).x*contact;
      assert.ok(line > 3.2, `${name} lato ${contact} da ${hitX}: lungolinea a ${line.toFixed(2)} m dal centro`);
      assert.ok(cross > 3.2, `${name} lato ${contact} da ${hitX}: incrociato a ${cross.toFixed(2)} m dal centro`);
      assert.ok(line < 4.05 && cross < 4.05, `${name}: dentro le righe con il tempo giusto (${line}, ${cross})`);
    }
  }
});

test('stessa ampiezza del campo a tutti i livelli: il livello cambia la precisione, non dove va la palla', () => {
  const range = name => { const lv = skillLevel(name), span = directionSpan(lv); return [shot(lv, { timing: -span, lateSpan: span }).x, shot(lv, { timing: span, lateSpan: span }).x]; };
  const [l0, c0] = range('casual');
  for (const name of LEVELS){ const [l, c] = range(name); assert.ok(Math.abs(l - l0) < .05 && Math.abs(c - c0) < .05, `${name}: ${l}/${c} contro ${l0}/${c0}`); }
});

test('centro voluto: con il tempo giusto la palla va al centro; il colpo neutro va un poco incrociato (il più sicuro)', () => {
  for (const name of LEVELS){
    const lv = skillLevel(name), span = directionSpan(lv);
    for (const contact of [1, -1]){
      const xs = Array.from({ length: 81 }, (_, i) => -span + 2*span*i/80).map(timing => shot(lv, { contact, timing, lateSpan: span }).x);
      assert.ok(xs.some(x => Math.abs(x) < .2), `${name} ${contact}: nessun tempo dà il centro (${Math.min(...xs.map(Math.abs)).toFixed(2)})`);
      const neutral = shot(lv, { contact, timing: 0, lateSpan: span }).x*contact;
      assert.ok(neutral < 0 && neutral > -1, `${name} ${contact}: colpo neutro a ${neutral.toFixed(2)} (un poco incrociato)`);
    }
  }
});

// 29/10 pomeriggio: il piatto (che cambia con il movimento) da solo arriva vicino alle righe, e tempo e piatto si
// sommano (prima il piatto valeva il 60% e ai bordi della finestra il tempo vinceva sempre: con il tempo che a chi gioca
// resta quasi uguale, le palle cadevano tutte al centro)
test('il piatto da solo porta la palla vicino alle righe a tempo neutro; tempo e piatto si sommano', () => {
  const lv = skillLevel('pro'), span = directionSpan(lv);
  const base = shot(lv, { timing: 0, lateSpan: span }).x, right = shot(lv, { timing: 0, lateSpan: span, intent: { face: 1 } }).x, left = shot(lv, { timing: 0, lateSpan: span, intent: { face: -1 } }).x;
  assert.ok(right > 3.2 && left < -3.2 && right < SIDE && left > -SIDE, `${left} ${base} ${right}`);
  // un piatto girato a metà porta la palla a metà strada (continuo, in ordine)
  const half = shot(lv, { timing: 0, lateSpan: span, intent: { face: .5 } }).x;
  assert.ok(half - base > .4*(right - base) && half < right, `${base} ${half} ${right}`);
  // incrociato pieno dal tempo e piatto tutto verso il lungolinea: si annullano (verso il centro); nello stesso verso
  // la palla va sulla riga e resta dentro
  for (const contact of [1, -1]){
    const mixed = shot(lv, { contact, timing: span, lateSpan: span, intent: { face: contact } }).x;
    assert.ok(Math.abs(mixed) < 1.5, `${contact}: ${mixed}`);
    const same = shot(lv, { contact, timing: span, lateSpan: span, intent: { face: -contact } }).x*contact;
    assert.ok(same < -3.5 && same > -SIDE, `${contact}: ${same}`);
  }
});

test('profondità dall\'intensità rispetto al proprio colpo tipico imparato giocando (C4): più forte del solito va più in fondo, più morbido più corto', async () => {
  const { simPhone } = await import('./phone-sim.mjs');
  const { powerRefs } = await import('../src/natpf/natpf_phone_racket.js');
  assert.deepEqual(powerRefs({ ref: 150, rawRef: 180 }, null), { ref: 150, rawRef: 180 });
  assert.deepEqual(powerRefs({ ref: 150, rawRef: 180 }, 700), { ref: 700, rawRef: null });
  assert.deepEqual(powerRefs({ simple: true, ref: 150 }, null), { ref: null, rawRef: null });
  // calibrazione con colpetti piccoli (come il 23/10), poi lo scambio con il proprio colpo a ~700 °/s
  const p = simPhone({ hand: 'right', seed: 21, shape: true });
  p.rest(500, 3); p.calibrate({ tremor: 3, peak: 260 });
  const hit = peak => { const n0 = p.msgs.length; p.swing({ tremor: 4, axis: [0, 1, 0], peak }); p.rest(700, 4); return p.msgs.slice(n0).map(d => p.game(d).ev).at(-1).natpf.intent; };
  const first = [hit(700), hit(950), hit(450)];                 // prima del colpo tipico: riferimento della calibrazione
  for (let i = 0; i < 4; i++) hit(700);
  const typ = hit(700), strong = hit(950), soft = hit(450);
  assert.ok(strong.depth - typ.depth > .1 && typ.depth - soft.depth > .1, `con il colpo tipico: morbido ${soft.depth}, solito ${typ.depth}, forte ${strong.depth}`);
  // con il riferimento dei colpetti la parte relativa della forza era piena: le differenze erano metà
  assert.ok((strong.depth - soft.depth) > 1.3*(first[1].depth - first[2].depth), `prima ${first[2].depth}…${first[1].depth}, ora ${soft.depth}…${strong.depth}`);
  assert.ok(typ.depth > .4 && typ.depth < .6, `il proprio colpo solito cade a metà campo-fondo: ${typ.depth}`);
});

// --- ritmo (C1–C2): contatto al colmo dopo il rimbalzo quando è raggiungibile ---
async function rhythmEngine(difficulty, ritmo = null){
  const THREE = await import('three');
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(5);
  try {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    if (ritmo) e.params = new URLSearchParams(`ritmo=${ritmo}`);
    // palla della CPU profonda (rimbalzo oltre la riga del servizio, con l'aria a circa 8 m), il cui colmo dopo il
    // rimbalzo è a circa 12 m: raggiungibile
    e.phase = 'RALLY'; Object.assign(e.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 3 });
    e.player.pos.set(.5, 0, 11.7); e.player.targetPos.copy(e.player.pos);
    e.ball.pos.set(-.6, 1, -10.5); e._launchBallToTarget(e.ball.pos, new THREE.Vector3(.9, 0, 9.5), 1.2, { topspin: 14 });
    e._natpfPlanPlayer();
    return e.natpfPlan;
  } finally { Math.random = real; }
}
test('ritmo: palla della CPU con il colmo raggiungibile → a Casual e Pro si colpisce al colmo (più tempo, più alta); a Leggenda come prima, se non si chiede', async () => {
  const NI = await import('../src/natpf/natpf_impact.js');
  const casual = await rhythmEngine('casual'), pro = await rhythmEngine('pro'), legend = await rhythmEngine('leggenda');
  // a Leggenda il primo punto comodo (come prima del 23/10)
  assert.equal(legend.kind, 'ground');
  for (const [name, p] of [['casual', casual], ['pro', pro]]){
    assert.equal(p.kind, 'ground', name);
    assert.ok(p.t > legend.t + .12 && p.contact.y > legend.contact.y + .2, `${name}: impatto a ${p.t} s e ${p.contact.y} m (Leggenda ${legend.t} s, ${legend.contact.y} m)`);
    assert.ok(Math.abs(p.contact.z) <= NI.PLAN.apexBack + .01, `${name}: entro la posizione più arretrata (${p.contact.z})`);
  }
  // per confrontare sullo stesso computer: ?ritmo=colmo lo accende anche a Leggenda, ?ritmo=prima lo spegne
  const legendOn = await rhythmEngine('leggenda', 'colmo'), casualOff = await rhythmEngine('casual', 'prima');
  assert.ok(Math.abs(legendOn.t - casual.t) < .05, `Leggenda con ?ritmo=colmo: ${legendOn.t} (Casual ${casual.t})`);
  assert.ok(Math.abs(casualOff.t - legend.t) < .05, `Casual con ?ritmo=prima: ${casualOff.t} (Leggenda ${legend.t})`);
});

test('ritmo: con chi gioca arretrato la palla è «passata» solo oltre la finestra d\'impatto in ritardo (prima: a 15,6 m fissi)', async () => {
  const THREE = await import('three');
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(9);
  try {
    const e = createHeadlessEngine({ difficulty: 'pro' }); e.startNewMatch({ showStartBanner: false });
    let awarded = null; const award = e._awardPoint.bind(e); e._awardPoint = (who, why) => { awarded = { who, why, z: +e.ball.pos.z.toFixed(2) }; return award(who, why); };
    e.phase = 'RALLY'; Object.assign(e.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 1, rallyStrokeCount: 3 });
    e.player.pos.set(0, 0, 13.7); e.player.targetPos.copy(e.player.pos);
    e.ball.pos.set(.4, .9, 14.6); e.ball.vel.set(0, -.5, 9); e.ball.spin.set(0, 0, 0);
    for (let i = 0; i < 400 && !awarded && e.ball.pos.z < 16.1; i++) e.step(1/120);
    assert.equal(awarded, null, `oltre 15,6 m ma a meno di 2,8 m dietro chi gioca la finestra in ritardo è ancora aperta (palla a ${e.ball.pos.z.toFixed(2)} m)`);
    for (let i = 0; i < 120 && !awarded; i++) e.step(1/120);
    assert.ok(awarded && awarded.who === 'opponent' && awarded.z > 13.7 + 2.8 - .1, JSON.stringify(awarded));
  } finally { Math.random = real; }
});

// Corsa in avanti dopo il servizio (richiesta del 23/10, sera): il servizio rimbalza sempre nel quadrato, e con la regola
// della palla corta chi rispondeva correva in avanti fino a metà campo a ogni servizio, a tutti i livelli (banco: dalla
// riga di fondo a 5,5–6,5 m dalla rete nel 100% delle risposte). Ora si prende dove arriva comodo, da fondo campo; e la
// CPU che ha servito torna al centro (tranne Leggenda, che ha il suo modello).
async function serveReturn(difficulty){
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(9);
  try {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
    const z0 = e.player.pos.z, cpuX0 = e.opponent.pos.x;
    // la CPU lancia e serve da sola; si segue la palla fino al colpo di chi risponde (o al rimbalzo fuori portata)
    let minZ = z0, served = null;
    for (let t = 0; t < 6 && !(e.ball.lastHitter === 'opponent' && e.ball.pos.z > e.player.pos.z); t += 1/120){
      e.step(1/120);
      if (e.phase === 'RALLY' && e.ball.lastHitter === 'opponent' && !served) served = { plan: e.natpfPlan, cpuTarget: e.opponent.targetPos.clone() };
      if (served) minZ = Math.min(minZ, e.player.targetPos.z);
      if (served && e.ball.bounceCountOnCurrentSide >= 1 && e.ball.pos.z > 10) break;
    }
    return { z0, minZ, plan: served?.plan, cpuX0, cpuTarget: served?.cpuTarget };
  } finally { Math.random = real; }
}
test('risposta al servizio: niente corsa verso la rete, si prende la palla da fondo campo; la CPU che ha servito torna al centro', async () => {
  for (const lv of ['casual', 'pro', 'leggenda']){
    const r = await serveReturn(lv);
    assert.ok(r.plan && r.plan.kind === 'ground', `${lv}: risposta dopo il rimbalzo (${r.plan?.kind})`);
    assert.ok(r.z0 - r.minZ < 1.5, `${lv}: chi risponde avanza al più di poco (da ${r.z0.toFixed(1)} a ${r.minZ.toFixed(1)} m dalla rete)`);
    assert.ok(Math.abs(r.plan.contact.z) > 9, `${lv}: impatto oltre 9 m dalla rete (${r.plan.contact.z})`);
    if (lv !== 'leggenda') assert.ok(Math.abs(r.cpuTarget.x) < .05 && Math.abs(r.cpuX0) > .3, `${lv}: la CPU torna al centro (da x ${r.cpuX0.toFixed(2)} verso ${r.cpuTarget.x.toFixed(2)})`);
  }
});
