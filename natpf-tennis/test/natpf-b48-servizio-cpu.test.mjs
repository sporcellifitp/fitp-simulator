// B48 · servizio della CPU vario (punto 17 e miglioramento 10 del rapporto B16, docs/b16/rapporto-gameplay.md) e
// Leggenda più da campione (miglioramento 8). Prima a Casual e Bambini la CPU serviva sempre al centro del quadrato con
// lo stesso effetto, e a Casual a 97–106 km/h, più forte di chi gioca (66–88 km/h); ora direzione («T», corpo, largo) ed
// effetto (piatto, kick, tagliato) cambiano a ogni livello, mai tre volte di fila uguali, e a Casual e Bambini la CPU non
// serve mai più forte della media dei servizi di chi gioca nella partita (prima del suo primo servizio mai più forte del
// servizio più lento possibile di chi gioca, B48.1). Niente tremolio della telecamera e km/h veri sul tabellone dell'arena,
// a ogni livello. Leggenda: al più una smorzata ogni 8 colpi della CPU (natpf_legend.dropAllowed).
// B48.1 (revisione del B48): la direzione è il terzo del quadrato dove la palla rimbalza davvero, a ogni livello (prima a
// Bambini il 68–72% dei rimbalzi veri cadeva al corpo, fino a 20 di fila, e a Pro ed Evento circa il 50%, fino a 10 di
// fila); a Pro, Evento e Leggenda una parte dei servizi è profonda, vicino alla riga del servizio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import * as NS from '../src/natpf/natpf_skill.js';
import { LEGEND, dropAllowed, legendServe } from '../src/natpf/natpf_legend.js';
import { serveThird } from '../src/natpf/natpf_stroke_outcome.js';
import { predictBall } from '../src/natpf/natpf_impact.js';

const DT = 1/120;
const LEVELS = ['bambini', 'casual', 'evento', 'pro', 'leggenda'];
const seeded = (seed, fn) => { const real = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };
const third = x => (Math.abs(x) < 1.37 ? 'T' : Math.abs(x) < 2.74 ? 'corpo' : 'largo');
const noTriple = list => list.every((k, i) => i < 2 || !(k === list[i - 1] && k === list[i - 2]));

// motore con la CPU che batte per prima; il tabellone dell'arena registra le velocità mostrate
function engine(difficulty, { first = 'opponent' } = {}){
  const e = createHeadlessEngine({ difficulty });
  e.shown = [];
  e.natpfArena = { setScore(){}, setSpeed: v => { if (v != null) e.shown.push({ shown: v, real: e.ball.vel.length()*3.6 }); }, update(){}, setPractice(){} };
  e.natpfFair = false; e.natpfServeFirst = first;
  e.startNewMatch({ showStartBanner: false });
  return e;
}
// un servizio della CPU: fino alla palla in gioco; restituisce velocità vera, tremolio aggiunto, effetto, bersaglio
function cpuServe(e){
  e.score.server = 'opponent'; e._setupPointServe({ showBanner: false });
  let trauma0 = e.cameraTrauma, out = null;
  for (let i = 0; i < 900 && !out; i++){
    const was = e.phase; trauma0 = e.cameraTrauma; e.step(DT);
    if (was === 'SERVE_TOSS' && e.phase === 'RALLY'){
      const B = predictBall(e.ball).find(p => p.bounces === 1);
      out = { kmh: e.ball.vel.length()*3.6, trauma: e.cameraTrauma - trauma0, top: e.ball.spin.x, side: e.ball.spin.y, x: e.ball.targetLanding.x, shown: e.shown.at(-1), plan: e.natpfLastCpuServe, bounce: B && { x: B.x, z: B.z } };
    }
  }
  assert.ok(out, 'la CPU ha servito');
  e._awardPoint('player', 'Out');
  return out;
}
// servizio di chi gioca dal telefono (servizio insegnato, forza power, a tempo)
function playerServe(e, power){
  e.score.server = 'player'; e._setupPointServe({ showBanner: false });
  e._handleUserTossInput({});
  for (let i = 0; i < 400 && e.phase === 'SERVE_TOSS' && e.ball.vel.y/9.15 > 0; i++) e.step(DT);
  e._handleUserSwingInput({ source: 'test', side: 'overhead', shotType: 'topspin', speed: .8 + power*.85, dirX: 0,
    natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power, depth: power, rise: -.08, plane: .5, face: 0 }, power, latency: 0, hand: 'right' } });
  assert.equal(e.phase, 'RALLY', 'il servizio di chi gioca è partito');
  const kmh = Math.round(e.ball.vel.length()*3.6);
  e._awardPoint('player', 'Out');
  return kmh;
}

test('B48: scelta pesata senza tre uguali di fila (pickVaried)', () => {
  const rng = mulberry32(3), hist = [], W = { T: .3, corpo: .4, largo: .3 };
  for (let i = 0; i < 3000; i++) hist.push(NS.pickVaried(W, hist, rng));
  assert.ok(noTriple(hist), 'mai tre volte di fila la stessa');
  const share = k => hist.filter(x => x === k).length/hist.length;
  for (const k of ['T', 'corpo', 'largo']) assert.ok(share(k) > .2 && share(k) < .45, `${k}: ${share(k)}`);
  // una sola scelta possibile: sempre quella (niente ciclo infinito né null)
  assert.equal(NS.pickVaried({ corpo: 1 }, ['corpo', 'corpo'], rng), 'corpo');
});

// a Casual e Bambini (servizio lento, con il limite) niente kick: così lento rimbalzerebbe oltre la testa di chi risponde
const KINDS = difficulty => (['casual', 'bambini'].includes(difficulty) ? ['flat', 'slice'] : ['flat', 'kick', 'slice']);

test('B48: piano del servizio della CPU a ogni livello: «T», corpo e largo, piatto, kick (non a Casual e Bambini) e tagliato, mai tre uguali di fila, sempre nel quadrato', () => {
  for (const difficulty of LEVELS) seeded(11, () => {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    const plans = Array.from({ length: 300 }, () => (difficulty === 'leggenda' ? legendServe(e, Math.random) : NS.cpuServeEvent(e, Math.random)).natpfCpuServe);
    const dirs = plans.map(p => p.dir), kinds = plans.map(p => p.kind);
    for (const k of ['T', 'corpo', 'largo']) assert.ok(dirs.includes(k), `${difficulty}: manca ${k}`);
    for (const k of KINDS(difficulty)) assert.ok(kinds.includes(k), `${difficulty}: manca ${k}`);
    assert.ok(kinds.every(k => KINDS(difficulty).includes(k)), `${difficulty}: effetti ${[...new Set(kinds)]}`);
    assert.ok(noTriple(dirs) && noTriple(kinds), `${difficulty}: tre uguali di fila`);
    for (const p of plans){
      assert.ok(p.x >= NS.CPU_SERVE.box.min && p.x <= NS.CPU_SERVE.box.max, `${difficulty}: x ${p.x}`);
      // B48.1: il punto del piano è nel terzo della sua direzione (prima a Bambini «T» e «largo» erano a cavallo dei terzi)
      assert.equal(serveThird(p.x), p.dir, `${difficulty}: ${p.dir} a ${p.x} m`);
      assert.equal(p.top, (NS.skillLevel(difficulty).cpuServe.spin || NS.CPU_SERVE.spin)[p.kind].top);
      // il tagliato gira verso la sinistra di chi batte (la CPU guarda verso +z: +x)
      assert.equal(p.side, p.kind === 'slice' ? 6 : 0);
    }
    // limite di velocità solo dove la CPU deve restare sotto chi gioca (Evento: alla partenza k = 0,8, limite molto alto)
    const cap = plans[0].maxKmh, longs = plans.filter(p => p.long).length/plans.length;
    if (['casual', 'bambini'].includes(difficulty)){
      assert.ok(cap > 0 && cap <= NS.CPU_SERVE.firstKmh, `${difficulty}: ${cap}`);
      // con il limite il rimbalzo voluto è nella metà di fondo del quadrato
      assert.ok(plans.every(p => p.depth >= NS.CPU_SERVE.depth[0] && p.depth <= NS.CPU_SERVE.depth[1] && !p.long), difficulty);
    } else {
      if (difficulty === 'evento') assert.ok(cap == null || cap > 150, `${difficulty}: ${cap}`);
      else assert.ok(cap == null, `${difficulty}: ${cap}`);
      // B48.1: una parte dei servizi profondi, vicino alla riga del servizio (Evento: la media tra Casual, 0, e Pro)
      assert.ok(longs > .06 && longs < .3, `${difficulty}: profondi ${longs}`);
      assert.ok(plans.every(p => (p.long ? p.depth >= NS.CPU_SERVE.depth[0] && p.depth <= NS.CPU_SERVE.depth[1] : p.depth == null || cap != null)), difficulty);
    }
  });
});

test('B48: nel motore, a ogni livello, il servizio della CPU cambia direzione ed effetto, km/h veri sul tabellone dell\'arena, niente tremolio', () => {
  for (const difficulty of LEVELS) seeded(5, () => {
    const e = engine(difficulty), S = Array.from({ length: 24 }, () => cpuServe(e));
    for (const s of S){
      assert.equal(s.trauma, 0, `${difficulty}: tremolio della telecamera sul servizio della CPU`);
      assert.ok(s.shown && s.shown.shown === Math.round(s.shown.real) && Math.abs(s.shown.real - s.kmh) < 1e-9, `${difficulty}: tabellone ${JSON.stringify(s.shown)} / ${s.kmh}`);
    }
    // (effetti per tipo del piano; a Evento il top spin di ogni tipo segue k, la media tra Casual e Pro)
    assert.ok(new Set(S.map(s => s.plan.kind)).size === KINDS(difficulty).length, `${difficulty}: effetti ${[...new Set(S.map(s => s.plan.kind))]}`);
    for (const s of S) assert.ok(Math.abs(s.top - s.plan.top) < 1e-9, `${difficulty}: top spin ${s.top} / piano ${s.plan.top}`);
    // direzione del piano (a Bambini «T» e largo restano vicini al centro: per terzi del quadrato sarebbero quasi tutti al corpo)
    assert.ok(new Set(S.map(s => s.plan.dir)).size === 3, `${difficulty}: direzioni ${S.map(s => s.plan.dir)}`);
    for (const s of S) assert.ok(Math.abs(Math.abs(s.x) - s.plan.x) < 1e-6 && Math.round(s.kmh) === s.plan.kmh, `${difficulty}: bersaglio ${s.x} / piano ${JSON.stringify(s.plan)}`);
    // B48.1: la palla rimbalza davvero nel punto del piano (di lato) e quindi nel terzo della sua direzione, a ogni livello;
    // il servizio profondo vicino alla riga del servizio, gli altri di Pro, Evento e Leggenda dove rimbalzavano prima
    for (const s of S){
      assert.ok(Math.abs(Math.abs(s.bounce.x) - s.plan.x) < .08 && serveThird(s.bounce.x) === s.plan.dir, `${difficulty}: rimbalzo ${s.bounce.x.toFixed(2)} / piano ${s.plan.dir} ${s.plan.x}`);
      const z = Math.abs(s.bounce.z);
      if (s.plan.depth != null && (s.plan.long || s.plan.deep)) assert.ok(Math.abs(z - s.plan.depth) < .25, `${difficulty}: profondità ${z.toFixed(2)} / ${s.plan.depth}`);
      else assert.ok(z > 3.5 && z < 5.3, `${difficulty}: rimbalzo a ${z.toFixed(2)} m dalla rete`);
    }
    // a Casual, Pro e Leggenda anche il rimbalzo voluto copre i tre terzi del quadrato
    if (['casual', 'pro', 'leggenda'].includes(difficulty)) assert.ok(new Set(S.map(s => third(s.x))).size === 3, `${difficulty}: terzi ${S.map(s => third(s.x))}`);
    assert.ok(new Set(S.map(s => Math.round(s.kmh))).size > 3 && !S.every(s => Math.round(s.kmh) === 194), `${difficulty}: velocità ${S.map(s => Math.round(s.kmh))}`);
  });
});

test('B48: a Casual e Bambini il servizio della CPU non è mai più veloce dei servizi di chi gioca nella partita; al primo servizio firstKmh al più', () => {
  for (const difficulty of ['casual', 'bambini']) seeded(7, () => {
    const e = engine(difficulty);
    // la CPU batte per prima: chi gioca non ha ancora servito
    assert.equal(e.natpfServeKmh, null);
    const first = cpuServe(e);
    assert.ok(first.kmh <= NS.CPU_SERVE.firstKmh + 1e-9, `${difficulty}: primo servizio ${first.kmh} km/h`);
    // chi gioca serve piano (forza 0,15), poi la CPU serve più volte: mai sopra la media dei suoi servizi
    const mine = [playerServe(e, .15), playerServe(e, .2), playerServe(e, .15)];
    const mean = mine.reduce((a, v) => a + v, 0)/mine.length;
    assert.ok(Math.abs(e.natpfServeKmh.sum/e.natpfServeKmh.n - mean) < 1e-9 && e.natpfServeKmh.n === 3);
    for (let i = 0; i < 12; i++){ const s = cpuServe(e); assert.ok(s.kmh <= mean + 1e-6, `${difficulty}: ${s.kmh.toFixed(1)} km/h contro la media ${mean.toFixed(1)} di chi gioca (${mine})`); }
    // chi gioca serve forte: la CPU può andare più forte di prima, ma resta sotto la media nuova
    const fast = [playerServe(e, .95), playerServe(e, 1), playerServe(e, .95)];
    const mean2 = [...mine, ...fast].reduce((a, v) => a + v, 0)/6;
    const s2 = Array.from({ length: 8 }, () => cpuServe(e));
    assert.ok(s2.every(s => s.kmh <= mean2 + 1e-6) && Math.max(...s2.map(s => s.kmh)) > mean, `${difficulty}: ${s2.map(s => s.kmh.toFixed(1))} contro ${mean2.toFixed(1)}`);
    // partita nuova: si riparte (chi gioca può essere un altro)
    e.startNewMatch({ showStartBanner: false });
    assert.equal(e.natpfServeKmh, null);
    assert.ok(cpuServe(e).kmh <= NS.CPU_SERVE.firstKmh + 1e-9);
  });
});

test('B48: a Pro e Leggenda il servizio della CPU non ha il limite (resta l\'arma della CPU)', () => {
  for (const difficulty of ['pro', 'leggenda']) seeded(9, () => {
    const e = engine(difficulty), mine = [playerServe(e, .15), playerServe(e, .15)];
    const S = Array.from({ length: 6 }, () => cpuServe(e));
    assert.ok(S.every(s => s.kmh > Math.max(...mine)), `${difficulty}: ${S.map(s => s.kmh.toFixed(0))} contro ${mine}`);
  });
});

test('B48: Leggenda, al più una smorzata ogni 8 colpi della CPU (dropAllowed e partite simulate)', () => {
  assert.equal(LEGEND.dropEvery, 8);
  const m = k => ({ last: k.map(kind => ({ kind })) });
  assert.equal(dropAllowed(m([])), true);
  assert.equal(dropAllowed(m(['smorzata', 'corpo', 'corpo', 'corpo', 'corpo', 'corpo', 'corpo'])), false, 'smorzata 7 colpi fa');
  assert.equal(dropAllowed(m(['smorzata', 'corpo', 'corpo', 'corpo', 'corpo', 'corpo', 'corpo', 'corpo'])), true, 'smorzata 8 colpi fa');
  assert.equal(dropAllowed(m(['corpo', 'smorzata']), { dropEvery: 0 }), true, 'senza limite come prima');
  // partita simulata contro «umano» (il profilo contro cui la Leggenda ne giocava di più: una ogni 5,9 colpi)
  const kinds = [];
  simulate({ profile: 'umano', difficulty: 'leggenda', points: 150, seed: 31, setup: e => {
    const f = e._executeOpponentReturn.bind(e);
    e._executeOpponentReturn = a => { if (e.natpfLegend) e.natpfLegend.lastPick = null; f(a); const k = e.natpfLegend?.lastPick?.kind; if (k) kinds.push(k); };
  } });
  assert.ok(kinds.length > 500, `colpi della CPU ${kinds.length}`);
  const drops = kinds.map((k, i) => (k === 'smorzata' ? i : -1)).filter(i => i >= 0);
  assert.ok(drops.length > 0, 'la smorzata resta un colpo della Leggenda');
  for (let j = 1; j < drops.length; j++) assert.ok(drops[j] - drops[j - 1] >= 8, `due smorzate a ${drops[j] - drops[j - 1]} colpi`);
  assert.ok(drops.length/kinds.length <= 1/8, `quota ${drops.length}/${kinds.length}`);
});

// ---------- B48.1: correzioni della revisione del B48 ----------

test('B48.1: partite simulate con la CPU che batte: a ogni livello i rimbalzi veri del servizio della CPU non cadono più di metà delle volte nello stesso terzo, mai più di 3 di fila; a Pro, Evento e Leggenda una parte vicino alla riga del servizio', () => {
  for (const difficulty of LEVELS){
    const bounces = [];
    let pend = false;
    const setup = e => {
      e.natpfFair = false; e.natpfServeFirst = 'opponent';
      const hit = e._executeServeHit.bind(e);
      e._executeServeHit = (a, evt) => { const was = e.ball.inPlay; hit(a, evt); pend = !was && e.ball.inPlay && a === e.opponent; };
    };
    const onStep = e => { if (pend && e.ball.lastHitter === 'opponent' && e.ball.bounceCountOnCurrentSide >= 1){ pend = false; bounces.push({ t: serveThird(e.ball.pos.x), z: Math.abs(e.ball.pos.z) }); } };
    simulate({ profile: 'medio', difficulty, points: 160, seed: 101, setup, onStep });
    assert.ok(bounces.length > 50, `${difficulty}: servizi della CPU ${bounces.length}`);
    const share = k => bounces.filter(b => b.t === k).length/bounces.length;
    for (const k of ['T', 'corpo', 'largo']) assert.ok(share(k) > .15 && share(k) <= .5, `${difficulty}: ${k} ${(100*share(k)).toFixed(1)}%`);
    let run = 0, best = 0;
    bounces.forEach((b, i) => { run = i && b.t === bounces[i - 1].t ? run + 1 : 1; best = Math.max(best, run); });
    assert.ok(best <= 3, `${difficulty}: ${best} di fila nello stesso terzo`);
    // a Pro, Evento e Leggenda una parte dei servizi rimbalza vicino alla riga del servizio (prima: p50 4,3 m, mai oltre 5,3)
    const deep = bounces.filter(b => b.z > 5.4).length/bounces.length;
    if (['pro', 'evento', 'leggenda'].includes(difficulty)) assert.ok(deep > .05 && deep < .35, `${difficulty}: profondi ${(100*deep).toFixed(1)}%`);
  }
});

// Effetti per livello (cpuServe.spin): Pro 18 / 26 / 14 (con gli effetti del servizio di chi gioca, 14 / 24 / 9, Pro
// contro «medio» scendeva al 69,9% dei game a chi gioca, sotto il criterio 70–85% di audit:legend; prova in
// natpf-b48-pro-criterio.test.mjs), Leggenda 22 / 28 / 18 (il piatto come il servizio di prima: con 18 / 26 / 14 «preciso»
// vinceva il 35,0% dei punti contro 32,9 della base, 24 semi), Casual e Bambini 14 / 9 (niente kick; con 18 / 14 chi
// risponde avanzava verso la rete nel 37% delle mosse invece del 19%), Evento la media tra Casual e Pro con k
test('B48.1: effetto del servizio della CPU per livello, sulla palla vera del motore', () => {
  const want = { pro: { flat: 18, kick: 26, slice: 14 }, leggenda: { flat: 22, kick: 28, slice: 18 }, casual: { flat: 14, slice: 9 }, bambini: { flat: 14, slice: 9 } };
  for (const difficulty of LEVELS) seeded(13, () => {
    // (Evento: k si sposta a ogni punto; qui si riparte da k di base a ogni servizio, eventoRestart)
    const e = engine(difficulty), S = Array.from({ length: 30 }, () => (NS.eventoRestart(e), cpuServe(e))), seen = {};
    for (const s of S) (seen[s.plan.kind] ||= new Set()).add(+s.top.toFixed(3));
    const W = difficulty === 'evento' ? (() => { NS.eventoRestart(e); const k = NS.eventoK(), m = (a, b) => +(a + (b - a)*k).toFixed(3); return { flat: m(14, 18), kick: m(24, 26), slice: m(9, 14) }; })() : want[difficulty];
    for (const [kind, top] of Object.entries(seen)) assert.deepEqual([...top], [W[kind]], `${difficulty} ${kind}: top spin ${[...top]} (atteso ${W[kind]})`);
    assert.deepEqual(Object.keys(seen).sort(), Object.keys(W).sort(), `${difficulty}: effetti ${Object.keys(seen)}`);
    // il tagliato curva verso la sinistra di chi batte, gli altri no
    for (const s of S) assert.equal(s.side, s.plan.kind === 'slice' ? 6 : 0, difficulty);
  });
});

test('B48.1: Evento, il limite cambia il servizio solo quando taglia davvero; a Casual e Bambini il servizio è sempre profondo', () => {
  // Evento (k alla partenza 0,8: limite media / 0,2): chi gioca serve piano, il limite (~330 km/h) non taglia mai; il servizio
  // non profondo resta quello di prima (rimbalzo a 3,8–5 m, 110–126 km/h). Senza il cancello (limite applicato sempre)
  // andava a 127 km/h e 5,9 m
  seeded(17, () => {
    const e = engine('evento'); playerServe(e, .15); playerServe(e, .2);
    const S = Array.from({ length: 30 }, () => (NS.eventoRestart(e), cpuServe(e))).filter(s => !s.plan.long);
    assert.ok(S.length > 12 && S.every(s => s.plan.maxKmh > s.kmh), `servizi non profondi ${S.length}`);
    for (const s of S) assert.ok(Math.abs(s.bounce.z) < 5.3 && s.kmh > 100, `Evento: ${s.kmh.toFixed(0)} km/h a ${Math.abs(s.bounce.z).toFixed(2)} m`);
  });
  // Casual e Bambini (cap 1): con chi serve forte il limite non taglia, ma il servizio resta quello lento e profondo del
  // livello (plan.deep), mai il servizio corto di prima
  for (const difficulty of ['casual', 'bambini']) seeded(19, () => {
    const e = engine(difficulty); for (let i = 0; i < 4; i++) playerServe(e, 1);
    const S = Array.from({ length: 12 }, () => cpuServe(e));
    for (const s of S) assert.ok(s.plan.deep && Math.abs(Math.abs(s.bounce.z) - s.plan.depth) < .25 && Math.abs(s.bounce.z) > 5.4, `${difficulty}: rimbalzo a ${Math.abs(s.bounce.z).toFixed(2)} m (${s.kmh.toFixed(0)} km/h)`);
  });
});

test('B48.1: il limite del servizio della CPU è arrotondato in giù (mai sopra la media di chi gioca, nemmeno di 0,04 km/h)', () => {
  // media 200/3 = 66,667 km/h; con il sorteggio più alto dello scarto il limite arrotondato al decimo più vicino era 66,7
  for (const difficulty of ['casual', 'bambini']){
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    for (const sum of [200, 199.85, 205.15, 211]){
      e.natpfServeKmh = { n: 3, sum };
      const p = NS.cpuServePlan(e, () => .9999999);
      assert.ok(p.maxKmh <= sum/3, `${difficulty}: limite ${p.maxKmh} sopra la media ${(sum/3).toFixed(4)}`);
      assert.ok(sum/3 - p.maxKmh < .1 + 1e-9, `${difficulty}: ${p.maxKmh} / ${(sum/3).toFixed(4)}`);
    }
  }
});

// servizio più lento possibile di chi gioca contro la CPU (km/h veri), con ogni modo di giocare: telefono a forza 0 (ogni
// momento, forma e mano), mouse e tastiera a forza 0 (ogni mira e colpo; la loro velocità minima è sotto quella che
// azzera la forza), webcam (servizio dal motore di argon, a ogni altezza del lancio)
function slowestPlayerServe(difficulty, { phoneOnly = false } = {}){
  const kmh = (evt, { tau = 0, deuce = true, webcam = false, y = null } = {}) => seeded(5, () => {
    const e = createHeadlessEngine({ difficulty }); e.startNewMatch({ showStartBanner: false });
    if (webcam) e.motionController = { webcamMode: 'argon' };
    e.score.server = 'player'; e.score.deuceSide = deuce; e._setupPointServe({ showBanner: false }); e._handleUserTossInput({});
    if (y == null) for (let i = 0; i < 600 && e.phase === 'SERVE_TOSS' && e.ball.vel.y/9.15 > tau; i++) e.step(DT);
    else { let up = true; for (let i = 0; i < 600 && e.phase === 'SERVE_TOSS'; i++){ e.step(DT); if (e.ball.vel.y < 0) up = false; if ((y > 0) === up && Math.abs(e.ball.pos.y - Math.abs(y)) < .05) break; } }
    e._handleUserSwingInput(evt);
    for (let i = 0; i < 160 && e.phase === 'SERVE_TOSS'; i++) e.step(DT);
    return e.phase === 'RALLY' ? e.ball.vel.length()*3.6 : Infinity;
  });
  const phone = (rise, plane, hand) => ({ source: 'natpf-phone', side: 'overhead', shotType: 'topspin', speed: .8, dirX: 0, natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power: 0, depth: 0, rise, plane, face: 0 }, power: 0, latency: 0, hand } });
  let min = Infinity;
  for (const deuce of [true, false]){
    for (const tau of [.4, .15, 0, -.15, -.5]){
      for (const [rise, plane] of [[-.08, .5], [.5, .5], [-.08, 1], [.3, -1]]) for (const hand of ['right', 'left']) min = Math.min(min, kmh(phone(rise, plane, hand), { tau, deuce }));
      if (phoneOnly) continue;
      for (const source of ['keyboard', 'mouse']) for (const shotType of ['topspin', 'slice', 'flat', 'lob']) for (const dirX of [-1, -.5, 0, .5, 1]) min = Math.min(min, kmh({ source, side: 'overhead', shotType, speed: .8, dirX }, { tau, deuce }));
    }
    if (!phoneOnly) for (const y of [1.3, 1.7, 2.1, 3, -2.5, -1.6]) for (const speed of [.5, 1.5]) min = Math.min(min, kmh({ source: 'webcam', side: 'overhead', shotType: 'topspin', speed, dirX: 0 }, { deuce, webcam: true, y }));
  }
  return min;
}

test('B48.1: prima di conoscere un servizio vero di chi gioca, a Casual e Bambini la CPU non serve mai più forte del servizio più lento possibile di chi gioca con la sua racchetta (battuta alternata, batte per prima la CPU)', () => {
  for (const difficulty of ['casual', 'bambini']){
    const slow = { any: slowestPlayerServe(difficulty), phone: slowestPlayerServe(difficulty, { phoneOnly: true }) };
    assert.ok(slow.any > 50 && slow.any <= slow.phone && slow.phone < 70, `${difficulty}: servizio più lento di chi gioca ${slow.any.toFixed(2)}, con il telefono ${slow.phone.toFixed(2)} km/h`);
    assert.ok(NS.CPU_SERVE.firstKmh <= slow.any && NS.CPU_SERVE.firstKmhPhone <= slow.phone, `${difficulty}: firstKmh ${NS.CPU_SERVE.firstKmh} / ${slow.any.toFixed(2)}, telefono ${NS.CPU_SERVE.firstKmhPhone} / ${slow.phone.toFixed(2)}`);
    // partite vere: «Battuta: Alternata» (la regola delle simulazioni), «Batte per primo: CPU»: il primo game lo batte la CPU.
    // Con il telefono (la racchetta dello stand), con mouse e tastiera, con il telefono e la modalità prova (mouse e tastiera
    // accesi accanto al telefono) e senza interfaccia
    let n = 0;
    for (const [ui, lim] of [[{ controller: 'phone' }, slow.phone], [{ controller: 'mouse', testInput: true }, slow.any], [{ controller: 'phone', testInput: true }, slow.any], [{ controller: 'webcam' }, slow.any], [null, slow.any]])
      for (const seed of [1, 2, 3, 4]) seeded(seed, () => {
        const e = engine(difficulty); e.natpfUi = ui;
        assert.ok(e.natpfServeRule === 'alternata' && e.score.server === 'opponent');
        for (let k = 0; k < 4; k++){
          const s = cpuServe(e); n++;
          assert.equal(e.natpfServeKmh, null, 'chi gioca non ha ancora servito');
          assert.ok(s.kmh <= lim, `${difficulty} ${JSON.stringify(ui)} seme ${seed}: la CPU serve a ${s.kmh.toFixed(2)} km/h, il servizio più lento di chi gioca è ${lim.toFixed(2)}`);
        }
      });
    assert.equal(n, 80);
  }
});
