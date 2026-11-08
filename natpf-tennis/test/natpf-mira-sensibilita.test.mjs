// B16 (08/11/2026) · decisione (d) dell'utente sulla mira più sensibile del B15 («ok ma come lo misuro?»): sensibilità
// della mira scelta dallo staff (Opzioni → Mira del telefono): alta 17° (la base del B15), media 20°, bassa 23° (quella di
// prima del B15). Arriva a strokeIntent senza cambiare niente con il valore di base: le prove di fedeltà (natpf-gesture-pose,
// natpf-racchetta, natpf-gesture-speeds, natpf-colpi-b15) restano quelle; qui i tre valori, fino al motore.
// La misura del lato delle palle per partita è in natpf-mira-lato.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { INTENT, AIM_FULL, AIM_LEVELS, AIM_DEFAULT, faceAimFromDev, strokeIntent, aimFullOf, aimLevelOf, aimLevelFromFull } from '../src/natpf/natpf_stroke_intent.js';
import { natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';
import { readAimLevel, writeAimLevel, aimFullNow, aimLevelLabel, AIM_LEVEL_KEY } from '../src/natpf/natpf_aim_level.js';
import { makePhone, warmPhone, gesture, strike } from '../scripts/audit/colpi.mjs';
import { rng } from './phone-sim.mjs';

test('sensibilità della mira: alta 17° è la base del B15; 15° di piatto valgono 0,86 (alta), 0,71 (media), 0,6 (bassa)', () => {
  assert.deepEqual(AIM_LEVELS, ['alta', 'media', 'bassa']);
  assert.equal(AIM_DEFAULT, 'alta');
  assert.deepEqual({ ...AIM_FULL }, { alta: 17, media: 20, bassa: 23 });
  assert.equal(AIM_FULL.alta, INTENT.faceDead + INTENT.faceSpan, 'la mira alta è quella di base (INTENT)');
  // 15° di piatto girato: (15 − 3)/14, (15 − 3)/17, (15 − 3)/20
  assert.equal(faceAimFromDev(15), .857);
  assert.equal(faceAimFromDev(15, 17), .857);
  assert.equal(faceAimFromDev(15, 20), .706);
  assert.equal(faceAimFromDev(15, 23), .6);
  for (const full of [17, 20, 23]){
    assert.equal(faceAimFromDev(-15, full), -faceAimFromDev(15, full), 'mancino e piatto girato dall\'altra parte: a specchio');
    assert.equal(faceAimFromDev(full, full), 1, `mira piena a ${full}°`);
    assert.equal(faceAimFromDev(3, full), 0, 'zona morta uguale');
    assert.equal(faceAimFromDev(60, full), 0, 'scarto non credibile: non conta, uguale');
  }
  assert.equal(faceAimFromDev(52, 17), faceAimFromDev(52, 23), 'oltre 45° vale la fiducia, non la sensibilità');
  assert.equal(faceAimFromDev(17, 20), .824); assert.equal(faceAimFromDev(17, 23), .7);
  // valori non validi: la base
  assert.equal(faceAimFromDev(15, null), .857); assert.equal(faceAimFromDev(15, 2), .857);
  assert.equal(aimLevelOf('media'), 'media'); assert.equal(aimLevelOf('boh'), 'alta'); assert.equal(aimLevelOf(null), 'alta');
  assert.equal(aimFullOf('bassa'), 23); assert.equal(aimFullOf(undefined), 17);
  assert.equal(aimLevelFromFull(20), 'media'); assert.equal(aimLevelFromFull(18), null);
});

test('opzione salvata: alta di base, media e bassa restano dopo la scelta (localStorage), valori sconosciuti tornano alta', () => {
  const mem = new Map(), prev = globalThis.localStorage;
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  try {
    assert.equal(writeAimLevel('media'), 'media');
    assert.equal(mem.get(AIM_LEVEL_KEY), 'media');
    assert.equal(readAimLevel(), 'media'); assert.equal(aimFullNow(), 20); assert.equal(aimLevelLabel(), 'media (20°)');
    assert.equal(writeAimLevel('bassa'), 'bassa'); assert.equal(aimFullNow(), 23);
    assert.equal(writeAimLevel('altissima'), 'alta'); assert.equal(mem.get(AIM_LEVEL_KEY), 'alta'); assert.equal(aimFullNow(), 17);
  } finally { writeAimLevel('alta'); globalThis.localStorage = prev; }
});

test('strokeIntent: di base identico alla mira alta; con media e bassa cambia solo la mira del piatto, e meno', () => {
  const s = k => ({ peak: k*780, angle: 90, shape: { rise: .1, plane: .85, tilt: 0 } });
  for (const k of [.7, 1, 1.4]) for (const dev of [-30, -15, -8, 0, 5, 12, 15, 25, 50]){
    const o = { ref: 780, headingDev: dev, riseRef: .1 }, base = strokeIntent(s(k), o);
    assert.deepEqual(strokeIntent(s(k), { ...o, aimFull: 17 }), base, `k ${k}, ${dev}°`);
    const { face: f17, ...rest } = base;
    let prev = Math.abs(f17);
    for (const full of [20, 23]){
      const { face, ...r } = strokeIntent(s(k), { ...o, aimFull: full });
      assert.deepEqual(r, rest, `k ${k}, ${dev}°, ${full}°: tipo, forza e profondità uguali`);
      assert.ok(Math.abs(face) <= prev && Math.sign(face || f17) === Math.sign(f17 || face), `k ${k}, ${dev}°: mira ${f17} → ${face} con ${full}°`);
      prev = Math.abs(face);
    }
  }
});

test('natpfSwingToEngine: la sensibilità arriva all\'intenzione e torna in natpf.aimFull (17° di base)', () => {
  const aimModel = { aim: () => ({ aim: .5, dev: 15 }) };
  const s = { dir: 1, power: .7, peak: 900, rawPeak: 950, angle: 90, heading: 40, at: 1, shape: { rise: .1, plane: .85, tilt: 0, roll: 0 } };
  const at = full => natpfSwingToEngine(s, { now: 1.03, aimModel, ref: 780, riseRef: .1, ...(full ? { aimFull: full } : {}) }).natpf;
  assert.equal(at().intent.face, .857); assert.equal(at().aimFull, 17);
  assert.deepEqual(at(17), at(), 'di base è la mira alta');
  assert.equal(at(20).intent.face, .706); assert.equal(at(20).aimFull, 20);
  assert.equal(at(23).intent.face, .6); assert.equal(at(23).aimFull, 23);
  // senza forma del colpo (telefoni di prima, gioco con i tocchi): niente intenzione, niente aimFull
  assert.equal(natpfSwingToEngine({ dir: 1, power: .6, at: 1 }, { now: 1.03, aimFull: 20 }).natpf.aimFull, undefined);
});

// catena vera del telefono simulato (braccio → messaggio → natpfSwingToEngine → motore headless): lo stesso gesto letto con
// le tre sensibilità. Di base è la mira alta (prove di fedeltà invariate); con media e bassa il piatto girato sposta meno
test('catena del telefono simulato, destro e mancino, dritto e rovescio: piatto girato di 15° meno di lato con media e bassa', () => {
  const base = { k: 1, u: 0, ballY: 1, difficulty: 'casual' };
  for (const hand of ['right', 'left']){
    const p = warmPhone(makePhone({ hand }));
    for (const side of ['forehand', 'backhand']) for (const yaw of [-15, 15]){
      const read = y => { const msgs = gesture(p, { side, k: 1, yaw: y, R: rng(500 + y + (side === 'backhand' ? 3 : 0)) }); assert.equal(msgs.length, 1, `${hand} ${side} ${y}°`); return msgs[0]; };
      const m0 = read(0), m = read(yaw);
      const x0 = strike(p.game(m0, { learn: false }).ev, { ...base, side }).x;
      const ev = full => p.game(m, { learn: false, aimFull: full }).ev;
      assert.deepEqual(ev(null), ev(17), `${hand} ${side} ${yaw}°: di base è la mira alta`);
      const f = Object.fromEntries([17, 20, 23].map(a => [a, ev(a).natpf.intent.face]));
      const dev = Math.abs(ev(17).natpf.aimDev);
      assert.ok(dev > 8 && dev < 17, `${hand} ${side} ${yaw}°: scarto letto ${dev}°`);
      assert.ok(Math.abs(f[20]/f[17] - 14/17) < .01 && Math.abs(f[23]/f[17] - 14/20) < .01, `${hand} ${side} ${yaw}°: mira ${JSON.stringify(f)}`);
      const shift = Object.fromEntries([17, 20, 23].map(a => [a, Math.abs(strike(ev(a), { ...base, side }).x - x0)]));
      assert.ok(shift[17] > shift[20] && shift[20] > shift[23], `${hand} ${side} ${yaw}°: spostamento ${JSON.stringify(shift)} m`);
      assert.ok(shift[20]/shift[17] > .7 && shift[20]/shift[17] < .95 && shift[23]/shift[17] > .5 && shift[23]/shift[17] < .85, `${hand} ${side} ${yaw}°: ${JSON.stringify(shift)}`);
    }
  }
});
