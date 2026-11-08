// B15 (08/11/2026): sensibilità e precisione dei colpi rispetto ai gesti (richiesta: «i colpi non sono ancora da campo
// aperto, tutti gli scambi vanno quasi sempre nella stessa direzione con stessa velocità e angolazione»). Catena vera:
// telefono simulato mosso dal braccio (test/arm-sim.mjs) → messaggio → natpfSwingToEngine → motore headless
// (scripts/audit/colpi.mjs). Ogni prova qui falliva con i valori di prima (docs/b15/audit-colpi.md):
//   • forza: tetto del volo base 1,2 e altezza sulla rete lineare → 0,6×…1,6× del proprio colpo valeva ×1,5 in velocità;
//   • colpo tipico: mediana degli ultimi 9 colpi → dieci colpi forti di fila tornavano a forza 0,65 dal sesto;
//   • centro della mira: biasPull/commonPull da 12°/8° e drift 0,03 → dieci dritti girati di 20° cadevano da 2,9 a 1,1 m.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makePhone, warmPhone, gesture, variant, strike, sequence as seq, reale, mirrorCheck, seme } from '../scripts/audit/colpi.mjs';
import { rng } from './phone-sim.mjs';
import { createAimModel } from '../src/natpf/natpf_gestures.js';
import { strokeIntent, strokePower, classifyStroke } from '../src/natpf/natpf_stroke_intent.js';
import { superShot, SUPER } from '../src/natpf/natpf_stroke_outcome.js';
import { powerView } from '../src/natpf/natpf_power_hud.js';

const base = { side: 'forehand', k: 1, yaw: 0, u: 0, ballY: 1, difficulty: 'casual' };
let phone = null;
const warm = () => (phone ||= warmPhone(makePhone()));
const shot = (g, s = {}) => { const r = variant(warm(), { ...base, ...g }); assert.ok(r, `gesto non mandato: ${JSON.stringify(g)}`); const o = strike(r.ev, { ...base, ...s }); assert.ok(o, `colpo non giocato: ${JSON.stringify(g)}`); return o; };

test('più forte → più veloce e più in fondo: da 0,6× a 1,6× del proprio colpo almeno ×1,6 in velocità e 2,5 m in più, in ordine, dritto e rovescio', () => {
  for (const side of ['forehand', 'backhand']){
    const rows = [.6, .8, 1, 1.2, 1.4, 1.6].map(k => ({ k, ...shot({ side, k }) }));
    for (let i = 1; i < rows.length; i++){
      assert.ok(rows[i].kmh > rows[i - 1].kmh, `${side}: velocità in ordine ${rows.map(r => r.kmh)}`);
      assert.ok(rows[i].depth > rows[i - 1].depth, `${side}: profondità in ordine ${rows.map(r => r.depth)}`);
    }
    const soft = rows[0], strong = rows.at(-1);
    assert.ok(strong.kmh/soft.kmh >= 1.6, `${side}: ${soft.kmh} → ${strong.kmh} km/h (×${(strong.kmh/soft.kmh).toFixed(2)})`);
    assert.ok(strong.depth - soft.depth >= 2.5, `${side}: profondità ${soft.depth} → ${strong.depth}`);
    // il colpo tipico resta dove era (circa 9,2 m, 90–95 km/h): cambia la risposta ai gesti, non il gioco normale
    assert.ok(Math.abs(rows[2].depth - 9.2) < .4 && rows[2].kmh > 88 && rows[2].kmh < 97, `${side} tipico: ${rows[2].depth} m, ${rows[2].kmh} km/h`);
    for (const r of rows) assert.ok(!r.failed && !r.netFault && r.net > 1, `${side} k ${r.k}: ${JSON.stringify(r)}`);
  }
});

test('piatto girato: 15° una direzione chiaramente diversa, 30° quasi la riga; dritto e rovescio equivalenti', () => {
  for (const side of ['forehand', 'backhand']){
    const x = Object.fromEntries([-30, -15, 0, 15, 30].map(yaw => [yaw, shot({ side, yaw }).x]));
    assert.ok(x[15] - x[0] >= 1.2 && x[0] - x[-15] >= 1.2, `${side} 15°: ${JSON.stringify(x)}`);
    assert.ok(x[30] >= 3.2 && x[-30] <= -3.2 && Math.abs(x[30]) < 4.115 && Math.abs(x[-30]) < 4.115, `${side} 30°: ${JSON.stringify(x)}`);
    assert.ok(Math.abs(x[0]) < 1, `${side} piatto dritto vicino al centro: ${x[0]}`);
  }
  // stesso angolo, stesso spostamento (a meno di 0,7 m) di dritto e di rovescio
  for (const yaw of [15, -15]) assert.ok(Math.abs((shot({ side: 'forehand', yaw }).x - shot({ side: 'forehand' }).x) - (shot({ side: 'backhand', yaw }).x - shot({ side: 'backhand' }).x)) < .7, `${yaw}°`);
});

test('tempo → direzione, uguale a ogni livello; stessi ingressi stesso esito', () => {
  for (const difficulty of ['casual', '1v1', 'pro']){
    const xs = [-1, -.5, 0, .5, 1].map(u => shot({ side: 'forehand' }, { u, difficulty }).x);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] < xs[i - 1] - .8, `${difficulty}: ${xs}`);
  }
  // stesso colpo letto dal telefono, stesso esito nel motore (il telefono simulato ha il suo tremolio: si confronta il messaggio)
  const r = variant(warm(), { ...base, side: 'backhand', k: 1.2, yaw: 10 });
  assert.deepEqual(strike(r.ev, { ...base, u: .3 }), strike(r.ev, { ...base, u: .3 }));
});

// dopo i colpi di qualche punto (12 normali), dieci colpi uguali di fila con i riferimenti che imparano
function sequence(g, n = 10){
  const p = warmPhone(makePhone({ seed: 11 })), out = [];
  for (let i = 0; i < n; i++){
    const gg = typeof g === 'function' ? g(i) : g, msgs = gesture(p, { ...gg, R: rng(300 + i) });
    assert.equal(msgs.length, 1);
    const r = p.game(msgs[0]), o = strike(r.ev, { ...base, side: gg.side });
    assert.ok(o); out.push({ ...o, aimDev: r.ev.natpf.aimDev });
  }
  return out;
}

test('il colpo tipico non insegue dieci colpi forti (o morbidi) di fila: la forza resta quella del gesto', () => {
  const strong = sequence({ side: 'forehand', k: 1.5, yaw: 0 });
  assert.ok(strong[0].power >= .75, `primo colpo forte: ${strong[0].power}`);
  assert.ok(Math.abs(strong.at(-1).power - strong[0].power) < .03, `forza ${strong.map(r => r.power)}`);
  assert.ok(Math.abs(strong.at(-1).kmh - strong[0].kmh) < 3, `km/h ${strong.map(r => r.kmh)}`);
  const soft = sequence({ side: 'forehand', k: .7, yaw: 0 });
  assert.ok(Math.abs(soft.at(-1).power - soft[0].power) < .03, `forza ${soft.map(r => r.power)}`);
});

test('la mira tenuta non viene assorbita: dieci dritti girati di 20°, e dritti e rovesci alternati girati di 20°', () => {
  const fh = sequence({ side: 'forehand', k: 1, yaw: 20 });
  assert.ok(fh[0].x > 2.4, `primo: ${fh[0].x}`);
  assert.ok(fh.at(-1).x >= .85*fh[0].x, `dritti: ${fh.map(r => r.x)}`);
  const alt = sequence(i => ({ side: i % 2 ? 'backhand' : 'forehand', k: 1, yaw: 20 }));
  assert.ok(alt[8].x >= .85*alt[0].x && alt[9].x >= .85*alt[1].x, `alternati: ${alt.map(r => r.x)}`);
});

// secondo giro: l'isteresi a due velocità (AIM.biasLow 20, poi biasSlow fino a biasEnd 10) recupera il riferimento girato
// in una trentina di colpi invece che in venti (primo giro: 32–34° recuperati in 20 colpi, ma la mira piena tenuta finiva
// al centro: prova qui sotto)
test('centro della mira: un riferimento girato di 35–40° si recupera del tutto in una trentina di colpi (isteresi), uno scarto tenuto sotto 25° resta', () => {
  for (const turn of [35, 38, 40]){
    const m = createAimModel(); m.seed(1, 0);
    for (let i = 0; i < 6; i++) m.add(1, 5 + (i % 2));         // colpi normali: il seme vale
    for (let i = 0; i < 30; i++) m.add(1, turn - 1 + (i % 3));
    assert.ok(Math.abs(m.aim(1, turn).aim) < .2, `riferimento girato di ${turn}° recuperato: centro ${m.center(1)}`);
  }
  const w = createAimModel(); w.seed(1, 0);
  for (let i = 0; i < 6; i++) w.add(1, 5 + (i % 2));
  for (let i = 0; i < 20; i++) w.add(1, 22 + (i % 3));
  assert.ok(w.aim(1, 23).aim > .6, `mira tenuta a 22° ancora piena: ${JSON.stringify(w.aim(1, 23))} centro ${w.center(1)}`);
});

// secondo giro B15: con l'isteresi del primo giro (dopo il «pull», fino a 10°) quattordici dritti con il piatto girato di
// 30° (mira piena) finivano a 0,63 m dal centro; prima del B15 a 1,20 m. Anche il mancino, allo specchio
test('mira piena tenuta: quattordici dritti con il piatto girato di 30° restano lontani dal centro, destro e mancino', () => {
  for (const hand of ['right', 'left']){
    const rows = seq({ side: 'forehand', k: 1, yaw: 30 }, { n: 14, hand });
    const sx = hand === 'left' ? -1 : 1, x = rows.map(r => sx*r.x);
    assert.ok(x[0] > 3, `${hand}: primo ${x[0]}`);
    assert.ok(x.at(-1) >= 1.5, `${hand}: mira tenuta ${x.map(v => v.toFixed(2))}`);
  }
});

// secondo giro B15: INTENT.faceSpan 14 (era 20, mira piena a 23°). Con 20 il piatto girato di 15° spostava la palla di
// 1,9–2,3 m e la persona vera (piatto ±12°) mandava il 30% delle palle oltre 2,5 m dal centro, x p90−p10 6,17 m
const handPhones = {};
const handShot = (hand, g) => { const p = (handPhones[hand] ||= warmPhone(makePhone({ hand }))), r = variant(p, { ...base, ...g }); assert.ok(r, `${hand} ${JSON.stringify(g)}`); const o = strike(r.ev, base); assert.ok(o); return o; };
test('piatto più sensibile: girato di 15° almeno 2,4 m dal colpo dritto, nei due versi, dritto e rovescio, destro e mancino', () => {
  for (const hand of ['right', 'left']) for (const side of ['forehand', 'backhand']){
    const x = Object.fromEntries([-15, 0, 15].map(yaw => [yaw, handShot(hand, { side, yaw }).x]));
    assert.ok(x[15] - x[0] >= 2.4 && x[0] - x[-15] >= 2.4, `${hand} ${side}: ${JSON.stringify(x)}`);
  }
});
test('persona vera (banco colpi.mjs): palle più aperte, e il mancino è lo specchio esatto del destro', () => {
  const right = reale({ hand: 'right' }), left = reale({ hand: 'left' });
  assert.ok(right.x.span >= 6.6, `x p90−p10 ${right.x.span}`);
  assert.ok(right.xWide >= 34, `palle oltre 2,5 m dal centro: ${right.xWide}%`);
  assert.equal(right.failed, 0);
  const m = mirrorCheck(right, left);
  assert.ok(m.n === right.N && m.dx < 1e-9 && m.depth < 1e-9 && m.types === 0 && m.kmh < 1e-9 && m.cutKmh < 1.5, JSON.stringify(m));
});

// secondo giro B15: pendenza della forza relativa al proprio colpo tipico .6 → .9 (INTENT.relGain) per l'esito. Con .6 la
// persona vera andava da 79 a 118 km/h (p90−p10 39,3) e da 7,6 a 10,5 m (2,90)
test('forza più ampia: la persona vera varia di più velocità e profondità, il colpo tipico resta a 0,5', () => {
  const r = reale({ hand: 'right' });
  assert.ok(r.kmh.span >= 42, `km/h p90−p10 ${r.kmh.span}`);
  assert.ok(r.depth.span >= 3.2, `profondità p90−p10 ${r.depth.span}`);
  assert.ok(Math.abs(r.power.p50 - .53) < .03, `forza mediana ${r.power.p50}`);
  assert.equal(r.failed, 0);
  const ref = 780, s = k => ({ peak: k*ref, angle: 90, shape: { rise: .1, plane: .85, tilt: 0 } });
  const typical = strokeIntent(s(1), { ref, riseRef: .1 });
  assert.equal(typical.power, typical.typePower, 'il colpo tipico ha la stessa forza di prima');
  for (const k of [.7, 1.3]){
    const it = strokeIntent(s(k), { ref, riseRef: .1 });
    assert.ok(Math.abs(it.power - .54) > Math.abs(it.typePower - .54) + .04, `${k}×: forza ${it.power}, per il tipo ${it.typePower}`);
  }
});
test('la pendenza nuova non cambia i tipi di colpo né il colpo super: si leggono con la forza di prima (classGain)', () => {
  const ref = 780;
  for (const k of [.3, .5, .7, .9, 1.1, 1.3, 1.5, 1.8]) for (const rise of [-.5, -.3, -.1, 0, .1, .3, .7]) for (const plane of [.3, .6, .9]){
    const s = { peak: k*ref, angle: 70, shape: { rise, plane, tilt: .5 } };
    const it = strokeIntent(s, { ref, riseRef: .1, ballHigh: rise < 0 }), before = strokePower(k*ref, ref, .6);
    assert.equal(it.typePower, +before.toFixed(3));
    assert.equal(it.shot, classifyStroke(s.shape, { power: before, angle: s.angle, ballHigh: rise < 0, riseRef: .1 }).shot, `${k}× salita ${rise} piano ${plane}`);
  }
  const out = { shot: 'FLAT', q: 1, t: 0, excess: 0 };
  assert.equal(superShot({ intent: { power: .9, typePower: .8, conf: .8 }, out, contactY: 1.4 }).on, false, 'forza dell\'esito alta, gesto non da super');
  assert.equal(superShot({ intent: { power: .9, typePower: SUPER.power, conf: .8 }, out, contactY: 1.4 }).on, true);
  assert.equal(superShot({ intent: { power: .9, conf: .8 }, out, contactY: 1.4 }).on, true, 'senza typePower (webcam, CPU) vale power');
  assert.equal(powerView({ intent: { power: .95, typePower: .7 } }).label, 'Forte');
});

// secondo giro B15: seme della calibrazione sbagliato di 10–20° (sotto AIM.verifyDev): la mira andava tutta da una parte
// per decine di colpi (persona vera, seme −15°: centro ancora sbagliato di 8,8° al 20° colpo e di 7,5° al 40°)
test('seme della calibrazione sbagliato di 15°: entro una ventina di colpi il centro della mira torna giusto (seconda verifica)', () => {
  for (const seedErr of [-15, 15]){
    const r = seme({ seedErr }), at = k => r.blocks.find(b => b.shots === k);
    assert.ok(Math.abs(at('11-20').cerr) <= 3.5 && Math.abs(at('21-40').cerr) <= 2.5 && at('21-40').cabs <= 5.5, `seme ${seedErr}: ${JSON.stringify(r.blocks)}`);
  }
  // e con il seme giusto non si guasta (con 4 colpi la mediana sbagliava fino a 18°)
  const ok = seme({ seedErr: 0 });
  for (const b of ok.blocks) assert.ok(Math.abs(b.cerr) <= 1.5 && b.cabs <= 2.6 && b.cmax <= 11, `seme giusto: ${JSON.stringify(ok.blocks)}`);
});
test('seconda verifica: i primi colpi dalla stessa parte spostano i centri, una mira in versi opposti (tutto incrociato) resta', () => {
  const m = createAimModel(); m.seed(1, 0); m.seed(-1, 0);
  const fh = [12, 20, 8, 17, 23, 13], bh = [16, 9, 22, 14, 11, 19];
  for (let i = 0; i < 6; i++){ m.add(1, fh[i]); m.add(-1, bh[i]); }
  assert.ok(m.center(1) > 12 && m.center(-1) > 12, `centri ${m.center(1)} ${m.center(-1)}`);
  const x = createAimModel(); x.seed(1, 0); x.seed(-1, 0);
  for (let i = 0; i < 6; i++){ x.add(1, -fh[i]); x.add(-1, bh[i]); }
  assert.ok(Math.abs(x.center(1)) < 5 && Math.abs(x.center(-1)) < 5, `centri ${x.center(1)} ${x.center(-1)}`);
});
