// B42 · Scambi lunghi che si chiudono (docs/b42/scambi-lunghi.md): lo «scambio che si scalda» (natpf_hot_rally.js) è
// acceso di base in tutti i modi e dal 20° colpo rende via via più forti i colpi di tutti e due, più facile il colpo super
// di chi gioca, più frequenti gli attacchi e gli errori sotto pressione della CPU. Prima del 20° colpo e con l'opzione
// spenta niente cambia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import { many } from '../scripts/audit/b19/due-umani.mjs';
import * as NH from '../src/natpf/natpf_hot_rally.js';
import * as NO from '../src/natpf/natpf_stroke_outcome.js';
import * as NL from '../src/natpf/natpf_legend.js';
import * as NS from '../src/natpf/natpf_skill.js';

const { HOT_RALLY, hotHeat, hotSuper, hotRatio, hotCpu, hotPressure, hotLegend } = NH;

test('B42: il calore parte dal 20° colpo (0,2), è pieno al 28° e raddoppia al 38°; spento sempre 0', () => {
  assert.equal(HOT_RALLY.from, 20);
  for (let n = 0; n < 20; n++) assert.equal(hotHeat(n, true), 0);
  assert.ok(Math.abs(hotHeat(20, true) - .2) < 1e-9);
  assert.equal(hotHeat(28, true), 1); assert.equal(hotHeat(38, true), 2); assert.equal(hotHeat(90, true), 2);
  for (let n = 0; n < 120; n++) assert.equal(hotHeat(n, false), 0);
});

test('B42: colpo super più facile, via via: soglia della forza, tempo, qualità senza la pressione, poi ogni palla', () => {
  for (const n of [1, 10, 19]) assert.equal(hotSuper(n, true), null, `colpo ${n}: nessun aiuto`);
  assert.equal(hotSuper(30, false), null, 'spento: nessun aiuto');
  const e20 = hotSuper(20, true), e24 = hotSuper(24, true), e28 = hotSuper(28, true), e40 = hotSuper(40, true, .6);
  assert.ok(e20.power > 0 && e24.power > e20.power && e28.power > e24.power, 'la soglia scende colpo dopo colpo');
  assert.ok(Math.abs(e28.power - HOT_RALLY.superPower) < 1e-12 && e40.power === e28.power, 'al massimo dal 28° colpo');
  assert.equal(e20.anyBall, false); assert.equal(hotSuper(22, true).anyBall, false); assert.equal(hotSuper(23, true).anyBall, true, 'ogni palla da metà calore (23° colpo)');
  assert.equal(e40.pressure, .6);
  // stesso gesto e stessa palla: senza scambio caldo no, con lo scambio caldo pieno sì
  const base = { intent: { power: .78, conf: .9 }, out: { shot: 'TOPSPIN', q: .9, t: .2, excess: 0 }, contact: 1, ballSide: .3, contactY: 1.4, ballVz: 16 };
  assert.deepEqual(NO.superShot(base).why, ['gesto non abbastanza forte']);
  assert.equal(NO.superShot({ ...base, ease: e28 }).on, true, 'gesto da 0,78: basta con lo scambio caldo');
  assert.equal(NO.superShot({ ...base, intent: { power: .7, conf: .9 }, ease: e28 }).on, false, 'ma non un gesto qualsiasi');
  // tempo meno preciso
  const late = { ...base, intent: { power: .9, conf: .9 }, out: { ...base.out, t: -.8 } };
  assert.deepEqual(NO.superShot(late).why, ['fuori tempo']);
  assert.equal(NO.superShot({ ...late, ease: e28 }).on, true);
  // qualità: la pressione degli scambi lunghi non toglie il super (0,72 con pressione 0,8 = 0,9 senza)
  const press = { ...base, intent: { power: .9, conf: .9 }, out: { ...base.out, q: .72 } };
  assert.deepEqual(NO.superShot(press).why, ['in corsa o in allungo']);
  assert.equal(NO.superShot({ ...press, ease: { ...hotSuper(28, true, .8) } }).on, true);
  assert.equal(NO.superShot({ ...press, ease: { ...hotSuper(28, true, 1) } }).on, true, 'anche senza pressione: soglia 0,7 a calore pieno');
  assert.equal(NO.superShot({ ...press, out: { ...press.out, q: .6 }, ease: hotSuper(28, true, 1) }).on, false, 'in corsa davvero: no');
  // palla veloce e bassa: prima mai, a metà calore sì («palla calda»)
  const fast = { ...base, intent: { power: .9, conf: .9 }, contactY: 1, ballVz: 22, shortBall: false };
  assert.deepEqual(NO.superShot(fast).why, ['palla né alta, né lenta, né corta']);
  assert.deepEqual(NO.superShot({ ...fast, ease: hotSuper(22, true) }).why, ['palla né alta, né lenta, né corta']);
  const hot = NO.superShot({ ...fast, ease: hotSuper(24, true) });
  assert.equal(hot.on, true); assert.equal(hot.ball, 'calda'); assert.deepEqual(hot.why, ['gesto fortissimo', 'palla calda']);
  // senza aiuto (ease null) superShot è quello di sempre, per ogni combinazione
  for (const power of [.5, .8, .86, .95]) for (const t of [-.9, -.5, 0, .5]) for (const q of [.6, .79, .8, 1]) for (const contactY of [1, 1.3]) for (const ballVz of [10, 20]){
    const a = { intent: { power, conf: .9 }, out: { shot: 'FLAT', q, t, excess: 0 }, contact: 1, ballSide: 0, contactY, ballVz };
    assert.deepEqual(NO.superShot({ ...a, ease: null }), NO.superShot(a));
  }
});

test('B42: tra due persone il «gesto fortissimo» rispetto al proprio colpo scende da 1,3 a 1,15 volte a calore pieno', () => {
  assert.equal(hotRatio(1.3, null), 1.3);
  assert.ok(Math.abs(hotRatio(1.3, hotSuper(28, true)) - 1.15) < 1e-12);
  assert.ok(hotRatio(1.3, hotSuper(20, true)) < 1.3 && hotRatio(1.3, hotSuper(20, true)) > 1.15);
});

test('B42: CPU, attacchi ed errori in più solo nello scambio caldo; pressione in più per chi gioca; Leggenda prima', () => {
  for (const n of [1, 19]){ assert.deepEqual(hotCpu(n, true), { attack: 0, err: 0 }); assert.equal(hotPressure(n, true), 1); }
  assert.deepEqual(hotCpu(30, false), { attack: 0, err: 0 }); assert.equal(hotPressure(30, false), 1);
  const c20 = hotCpu(20, true), c28 = hotCpu(28, true), c38 = hotCpu(38, true);
  assert.ok(c20.attack > 0 && c28.attack === HOT_RALLY.cpuAttack && c38.attack === HOT_RALLY.cpuAttack, 'attacco: pieno dal 28° colpo');
  assert.ok(c20.err > 0 && c38.err > c28.err && Math.abs(c38.err - 2*HOT_RALLY.cpuErr) < 1e-12, 'errori: crescono fino al doppio');
  assert.ok(hotPressure(20, true) < 1 && hotPressure(28, true) < hotPressure(20, true));
  assert.equal(hotPressure(80, true), HOT_RALLY.pressMin);
  const L = NL.LEGEND;
  assert.deepEqual(hotLegend(30, false, L), { pressureFrom: L.pressureFrom, closeFrom: L.closeFrom, closeHard: L.closeHard, q: 1 });
  const h = hotLegend(30, true, L);
  assert.equal(h.pressureFrom, HOT_RALLY.legendFrom); assert.equal(h.closeFrom, HOT_RALLY.legendFrom); assert.equal(h.closeHard, HOT_RALLY.legendHard);
  assert.ok(Math.abs(h.q - (1 - HOT_RALLY.legendQ*hotHeat(30, true))) < 1e-12);
  assert.equal(hotLegend(19, true, L).q, 1);
});

test('B42: la pressione dello scambio caldo toglie qualità ma non stringe la finestra del tempo di Leggenda', () => {
  const lv = NS.skillLevel('leggenda'), base = { intent: { shot: 'topspin', power: .6, depth: .6, rise: .3, face: 0 }, timing: .05, ballVz: 16, contact: 1, hitX: 0, hitZ: 11.5, quality: .95, pressure: .85, level: lv };
  const a = NO.strokeOutcome(base), b = NO.strokeOutcome({ ...base, hotPress: 1 }), c = NO.strokeOutcome({ ...base, hotPress: .6 }), d = NO.strokeOutcome({ ...base, pressure: .85*.6 });
  assert.deepEqual(b, a, 'hotPress 1: lo stesso esito');
  assert.ok(Math.abs(c.q - a.q*.6) < .002, `qualità ${a.q} → ${c.q}`);
  assert.equal(c.t, a.t, 'il tempo, in unità della finestra, non cambia');
  assert.ok(d.t > a.t, 'mentre la pressione degli scambi lunghi stringe la finestra di Leggenda');
});

// colpo della CPU al colpo numero `rally` + 1 dello scambio, palla comoda, stessa estrazione
function cpuShot(rally, hot, difficulty = 'pro', seed = 5){
  const real = Math.random; Math.random = mulberry32(seed);
  try {
    const e = createHeadlessEngine({ difficulty }); e.natpfHotRally = hot; e.startNewMatch({ showStartBanner: false });
    e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'player'; e.ball.rallyStrokeCount = rally; e.ball.isPowerShot = false;
    e.opponent.pos.set(0, 0, -11.5); e.opponent.vel.set(0, 0, 0);
    e.ball.pos.set(.3, 1, -11.2); e.ball.vel.set(0, -1, -16);
    e._executeOpponentReturn(e.opponent);
    // (la Leggenda non passa da cpuReturnPlan: il suo esito è nell'ultima scelta, natpfLegend.lastPick)
    const lc = e.natpfSkill?.lastCpu, lp = e.natpfLegend?.lastPick;
    return { kind: lc?.kind ?? lp?.err ?? null, pick: lp?.kind ?? null, chance: lc?.chance ?? null, speed: e.ball.vel.length(), vy: e.ball.vel.y };
  } finally { Math.random = real; }
}

test('B42: la palla della CPU è più veloce nello scambio caldo; al 15° colpo identica', () => {
  assert.deepEqual(cpuShot(14, true), cpuShot(14, false), 'prima del 20° colpo niente cambia');
  for (const difficulty of ['casual', 'pro', 'leggenda']){
    const off = cpuShot(29, false, difficulty), on = cpuShot(29, true, difficulty);
    assert.equal(on.kind, off.kind, `${difficulty}: stessa risposta (${off.kind})`);
    assert.ok(on.speed > off.speed*1.08, `${difficulty}: ${(off.speed*3.6).toFixed(0)} → ${(on.speed*3.6).toFixed(0)} km/h`);
  }
});

// partite a sorteggi fissi con lo scambio caldo spento e acceso: elenco dei lanci della palla (colpo, bersaglio, volo,
// velocità) e dei punti; il primo lancio diverso è un colpo dal 20° in poi
function launches(run, hot){
  const L = [];
  run(e => {
    e.natpfHotRally = hot;
    const ln = e._launchBallToTarget.bind(e), aw = e._awardPoint.bind(e);
    e._launchBallToTarget = (f, t, fl, o) => { const r = ln(f, t, fl, o); L.push([e.ball.rallyStrokeCount + 1, +t.x.toFixed(4), +t.z.toFixed(4), +(+fl).toFixed(4), +e.ball.vel.length().toFixed(4)]); return r; };
    e._awardPoint = (w, why = '') => { L.push(['punto', w, why]); return aw(w, why); };
  });
  return L;
}
const firstDiff = (a, b) => { let i = 0; while (i < a.length && i < b.length && JSON.stringify(a[i]) === JSON.stringify(b[i])) i++; return i; };

test('B42: contro la CPU e nello stesso schermo le partite cambiano solo dal 20° colpo dello scambio', () => {
  const runs = {
    'Leggenda, tennista': setup => simulate({ profile: 'tennista', difficulty: 'leggenda', points: 12, seed: 7, setup }),
    'stesso schermo, amatori': setup => many({ a: 'amatore', b: 'amatore', fair: true, matches: 2, tweak: setup }, [7103]),
  };
  for (const [name, run] of Object.entries(runs)){
    const off = launches(run, false), on = launches(run, true), i = firstDiff(off, on);
    assert.ok(i < Math.min(off.length, on.length), `${name}: le partite cambiano`);
    assert.ok(Number(off[i][0]) >= 20, `${name}: il primo lancio diverso (n. ${i + 1}) è il colpo ${off[i][0]}`);
    assert.ok(off.slice(0, i).some(x => x[0] === 'punto'), `${name}: prima ci sono punti uguali`);
  }
});

test('B42: con lo scambio caldo gli scambi lunghi finiscono (Leggenda, profilo «tennista»)', () => {
  const lengths = hot => { const r = simulate({ profile: 'tennista', difficulty: 'leggenda', points: 40, seed: 11, cap: 150, setup: e => { e.natpfHotRally = hot; } }); return r.rallies; };
  const off = lengths(false), on = lengths(true), over = (a, k) => a.filter(n => n > k).length/a.length;
  assert.ok(over(on, 30) < over(off, 30)/3, `oltre 30 colpi: ${(100*over(off, 30)).toFixed(0)}% → ${(100*over(on, 30)).toFixed(0)}%`);
  assert.ok(Math.max(...on) <= 36, `il più lungo: ${Math.max(...off)} → ${Math.max(...on)} colpi`);
});
