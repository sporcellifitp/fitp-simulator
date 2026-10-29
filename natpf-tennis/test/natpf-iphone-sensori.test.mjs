// iPhone: accelerazione dei sensori con il segno opposto ad Android (site/js/tennis/motion-sign.js). Diagnostica
// 20261029-191023 (stesso schermo, Android P1 e iPhone P2): con l'iPhone dritto e rovescio invertiti (gesto concorde con
// il lato della palla 1 volta su 12; i P2 Android delle sessioni prima 7 su 8 e 14 su 16). Simulazione con la presa a
// martello: con il segno dell'iPhone la calibrazione legge il primo dritto come rovescio e non passa, e con «Salta»
// ogni colpo esce dal lato opposto; con la correzione della pagina del telefono come Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import { platformAccSign, createAccSign, normalizeSample, SIGN } from '@natpf/tennis/motion-sign.js';
import { simPhone } from './phone-sim.mjs';
import { armSwing, STROKES } from './arm-sim.mjs';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';

test('segno dei sensori: iPhone e iPad −1, Android e Mac senza tocco 1; campione riportato al segno di Android (giroscopio uguale)', () => {
  assert.equal(platformAccSign(IPHONE), -1);
  assert.equal(platformAccSign(IPAD_DESKTOP, 5), -1);
  assert.equal(platformAccSign(IPAD_DESKTOP, 0), 1);
  assert.equal(platformAccSign(ANDROID, 5), 1);
  const k = { t: 1, rot: [10, -20, 30], acc: [.1, -.2, .3], accG: [.5, -9.7, .4] };
  assert.deepEqual(normalizeSample(k, -1), { t: 1, rot: [10, -20, 30], acc: [-.1, .2, -.3], accG: [-.5, 9.7, -.4] });
  assert.equal(normalizeSample(k, 1), k);
  assert.deepEqual(normalizeSample({ t: 2, rot: [1, 2, 3], acc: null, accG: null }, -1), { t: 2, rot: [1, 2, 3], acc: null, accG: null });
});

test('segno dei sensori: i tocchi con il telefono in verticale lo confermano o lo correggono; telefono steso o in movimento non votano', () => {
  const s = createAccSign({ prior: -1 });
  // iPhone vero (y negativo in verticale): conferma, nessun cambio
  for (let i = 0; i < 6; i++) assert.equal(s.vote([.3, -9.6, 1.2]), false);
  assert.equal(s.sign, -1);
  // un browser che desse il segno di Android pur essendo un iPhone: dopo SIGN.votes tocchi concordi si corregge
  const t = createAccSign({ prior: -1 });
  const flips = [];
  for (let i = 0; i < SIGN.votes; i++) flips.push(t.vote([.3, 9.6, 1.2]));
  assert.deepEqual(flips, [false, false, false, true]); assert.equal(t.sign, 1);
  // non votano: telefono steso (y piccolo), in movimento (modulo lontano da g), dati mancanti
  const u = createAccSign({ prior: 1 });
  assert.equal(u.vote([0, 1, 9.8]), false); assert.equal(u.vote([0, -20, 3]), false); assert.equal(u.vote(null), false);
  assert.deepEqual(u.votes, { up: 0, down: 0 });
  // tocchi discordi: niente cambio sotto l'80%
  const v = createAccSign({ prior: 1 });
  for (const y of [9, -9, 9, -9, -9]) v.vote([0, y, 3]);
  assert.equal(v.sign, 1);
});

// presa a martello (cima in avanti, display di lato), calibrazione rapida con il braccio o «Salta», poi dritti e rovesci
function play({ ios = false, fix = false, skip = false, seed = 3 } = {}){
  const p = simPhone({ seed, shape: true, ios, fix });
  p.pose([0, 1, 0], 90); p.pose([1, 0, 0], -80); p.rest(500, 4);
  const cal = skip ? (p.skip(), null) : p.calibrate({ soft: true, armGesture: w => armSwing(p, w === 'L' ? STROKES.dritto : STROKES.rovescio) });
  const sides = [];
  for (const [name, want] of [['dritto', 'forehand'], ['rovescio', 'backhand'], ['dritto', 'forehand'], ['rovescio', 'backhand']]){
    const n = p.msgs.length; armSwing(p, STROKES[name]); p.rest(700, 3);
    const m = p.msgs.slice(n);
    sides.push(m.length ? p.game(m[0]).ev.side === want : null);
  }
  return { cal, sides };
}

test('iPhone: senza correzione calibrazione che non passa e colpi invertiti con «Salta» (il difetto della 191023)', () => {
  const c = play({ ios: true });
  assert.equal(c.cal.ok, false);
  assert.equal(c.cal.attempts[0].dir, 'R', 'il primo dritto letto come rovescio');
  assert.deepEqual(play({ ios: true, skip: true }).sides, [false, false, false, false]);
});

test('iPhone con la correzione della pagina del telefono: calibrazione e lati come su Android, anche con «Salta»', () => {
  for (const seed of [3, 11, 29]){
    const a = play({ seed }), i = play({ ios: true, fix: true, seed });
    assert.equal(i.cal.ok, true, `seme ${seed}`); assert.deepEqual(i.sides, a.sides, `seme ${seed}`);
    assert.deepEqual(i.sides, [true, true, true, true], `seme ${seed}`);
    assert.deepEqual(play({ ios: true, fix: true, skip: true, seed }).sides, [true, true, true, true], `seme ${seed}, «Salta»`);
  }
});
