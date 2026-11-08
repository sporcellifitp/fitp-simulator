// B15 (08/11/2026): sensibilità e precisione dei colpi rispetto ai gesti (richiesta: «i colpi non sono ancora da campo
// aperto, tutti gli scambi vanno quasi sempre nella stessa direzione con stessa velocità e angolazione»). Catena vera:
// telefono simulato mosso dal braccio (test/arm-sim.mjs) → messaggio → natpfSwingToEngine → motore headless
// (scripts/audit/colpi.mjs). Ogni prova qui falliva con i valori di prima (docs/b15/audit-colpi.md):
//   • forza: tetto del volo base 1,2 e altezza sulla rete lineare → 0,6×…1,6× del proprio colpo valeva ×1,5 in velocità;
//   • colpo tipico: mediana degli ultimi 9 colpi → dieci colpi forti di fila tornavano a forza 0,65 dal sesto;
//   • centro della mira: biasPull/commonPull da 12°/8° e drift 0,03 → dieci dritti girati di 20° cadevano da 2,9 a 1,1 m.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makePhone, warmPhone, gesture, variant, strike } from '../scripts/audit/colpi.mjs';
import { rng } from './phone-sim.mjs';
import { createAimModel } from '../src/natpf/natpf_gestures.js';

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

test('centro della mira: un riferimento sbagliato oltre 25° si recupera del tutto (isteresi), uno scarto tenuto sotto 25° resta', () => {
  const m = createAimModel(); m.seed(1, 0);
  for (let i = 0; i < 6; i++) m.add(1, 5 + (i % 2));         // colpi normali: il seme vale
  for (let i = 0; i < 20; i++) m.add(1, 32 + (i % 3));
  assert.ok(Math.abs(m.aim(1, 33).aim) < .3, `riferimento girato recuperato: centro ${m.center(1)}`);
  const w = createAimModel(); w.seed(1, 0);
  for (let i = 0; i < 6; i++) w.add(1, 5 + (i % 2));
  for (let i = 0; i < 20; i++) w.add(1, 22 + (i % 3));
  assert.ok(w.aim(1, 23).aim > .6, `mira tenuta a 22° ancora piena: ${JSON.stringify(w.aim(1, 23))} centro ${w.center(1)}`);
});
