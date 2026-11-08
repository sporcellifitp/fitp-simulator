// B15 (08/11/2026): sensibilità e precisione dei colpi rispetto ai gesti (richiesta: «i colpi non sono ancora da campo
// aperto, tutti gli scambi vanno quasi sempre nella stessa direzione con stessa velocità e angolazione»). Catena vera:
// telefono simulato mosso dal braccio (test/arm-sim.mjs) → messaggio → natpfSwingToEngine → motore headless
// (scripts/audit/colpi.mjs). Ogni prova qui falliva con i valori di prima (docs/b15/audit-colpi.md):
//   • forza: tetto del volo base 1,2 e altezza sulla rete lineare → 0,6×…1,6× del proprio colpo valeva ×1,5 in velocità;
//   • colpo tipico: mediana degli ultimi 9 colpi → dieci colpi forti di fila tornavano a forza 0,65 dal sesto;
//   • mira del piatto: piena a 23° (INTENT.faceSpan 20) → il piatto girato di 15° spostava la palla di 1,7–2,2 m.
// Il centro della mira (createAimModel) resta quello di prima (terzo giro B15): le prove per partita qui sotto, con il
// rumore di chi gioca, fallivano con l'isteresi e la seconda verifica del seme del secondo giro (HEAD 409c112).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makePhone, warmPhone, gesture, variant, strike, reale, mirrorCheck, partite } from '../scripts/audit/colpi.mjs';
import { rng } from './phone-sim.mjs';
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

// secondo giro B15: INTENT.faceSpan 14 (era 20, mira piena a 23°). Con 20 il piatto girato di 15° spostava la palla di
// 1,7–2,2 m per verso (da −15° a +15° 3,9–4,2 m) e la persona vera (piatto ±12°) mandava il 30% delle palle oltre 2,5 m
// dal centro, x p90−p10 6,17 m. Ora da −15° a +15° 5,6–6,0 m; per verso 2,4–3,2 m (la soglia di 2,4 m del secondo giro
// passava di poco: 2,36–2,46 secondo il centro della mira dopo il riscaldamento, che cambia di un grado tra i modelli;
// qui la prova vale sull'intervallo, che non dipende dal centro, e per verso con margine)
const handPhones = {};
const handShot = (hand, g) => { const p = (handPhones[hand] ||= warmPhone(makePhone({ hand }))), r = variant(p, { ...base, ...g }); assert.ok(r, `${hand} ${JSON.stringify(g)}`); const o = strike(r.ev, base); assert.ok(o); return o; };
test('piatto più sensibile: da −15° a +15° almeno 5 m, e almeno 2 m per verso dal colpo dritto, dritto e rovescio, destro e mancino', () => {
  for (const hand of ['right', 'left']) for (const side of ['forehand', 'backhand']){
    const x = Object.fromEntries([-15, 0, 15].map(yaw => [yaw, handShot(hand, { side, yaw }).x]));
    assert.ok(x[15] - x[-15] >= 5, `${hand} ${side}: ${JSON.stringify(x)}`);
    assert.ok(x[15] - x[0] >= 2 && x[0] - x[-15] >= 2, `${hand} ${side}: ${JSON.stringify(x)}`);
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

// terzo giro B15 (verifica indipendente del secondo giro): il centro della mira si giudica partita per partita, con il
// rumore di chi gioca (persona vera di reale(): piatto ±12°, 60% dritti; 24 partite da 80 colpi, banco colpi.mjs
// --mode=partite). Il secondo giro (isteresi a due velocità, seconda verifica del seme, soglie 25°) teneva la mira piena
// tenuta senza rumore ma qui lasciava più palle da una parte: le soglie sotto cadono tra il modello di adesso (quello di
// prima del B15) e il secondo giro, numeri nei messaggi e in docs/b15/audit-colpi.md
const med3 = r => r.blocks.reduce((a, b) => a + b.mabs, 0)/r.blocks.length;
test('per partita, con il rumore: seme della calibrazione giusto o sbagliato di ±15°, le palle di ogni partita non stanno da una parte', () => {
  for (const seedErr of [-15, 15]){
    // adesso −15°: |mediana x| 0,81/0,73/0,65 m (colpi 21–40/41–60/61–80), oltre 1 m 8/8/7 partite; +15°: 0,87/0,82/0,64, 10/10/5.
    // Secondo giro: 0,98/0,98/0,91 (11/12/8) e 1,21/0,91/1,01 (14/10/8)
    const r = partite({ seedErr }), over = r.blocks.reduce((a, b) => a + b.over1, 0);
    assert.ok(med3(r) <= .82 && r.blocks[2].mabs <= .7 && over <= 27, `seme ${seedErr}: ${JSON.stringify(r.blocks)}`);
  }
  // seme giusto: 0,61/0,70/0,60 m, errore del centro massimo 4,4° (secondo giro 0,74/0,74/0,79 m, fino a 8,9°)
  const ok = partite({ seedErr: 0 });
  assert.ok(med3(ok) <= .68 && Math.max(...ok.blocks.map(b => b.cmax)) <= 5.5 && Math.max(...ok.blocks.map(b => b.cabs)) <= 1.9, JSON.stringify(ok.blocks));
});
test('per partita, con il rumore: un riferimento girato di 26–38° (corpo, giroscopio) si corregge entro 60 colpi', () => {
  for (const turn of [26, 32, 38]){
    // adesso: errore del centro 8,2–9,1° 30 colpi dopo il giro, 4,0–4,3° 60 colpi dopo; |mediana x| dei colpi 61–80 0,83–0,88 m.
    // Secondo giro: 17–18° e 8,7–11,9°, 1,56–2,03 m (la «fascia morta» 26–32°: il pull partiva solo oltre 25°)
    const r = partite({ turnAt: 20, turn, at: [50, 80] });
    assert.ok(r.at[0].cabs <= 10.5 && r.at[1].cabs <= 5.5 && r.blocks[2].mabs <= 1.05, `girato ${turn}°: ${JSON.stringify(r.at)} ${JSON.stringify(r.blocks)}`);
  }
});
test('per partita, con il rumore: dopo 16 colpi mirati di +18° con dritto e rovescio le palle tornano al centro; il mancino è lo specchio', () => {
  // adesso: mediana con il segno −1,54/−0,76/−0,50 m (colpi 21–40/41–60/61–80); secondo giro −2,38/−1,92/−1,68 (la
  // seconda verifica del seme prendeva la mira dei primi colpi per un seme sbagliato e la spingeva dall'altra parte)
  const r = partite({ aimN: 16, aimBias: 18 }), l = partite({ aimN: 16, aimBias: 18, hand: 'left' });
  assert.ok(r.blocks[0].signed >= -1.75 && r.blocks[1].signed >= -1 && r.blocks[2].signed >= -.7, JSON.stringify(r.blocks));
  r.blocks.forEach((b, j) => { assert.equal(l.blocks[j].mabs, b.mabs); assert.equal(l.blocks[j].signed, -b.signed); assert.equal(l.blocks[j].cabs, b.cabs); });
});
