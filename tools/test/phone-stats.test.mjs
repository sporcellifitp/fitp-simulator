// B66 · misure del telefono per il registro dello stand (site/js/tennis/phone-stats.js, racchetta.js, swing-message.js,
// swing-detect.js): campioni dei sensori (frequenza vera, buchi, saturazione, intervallo dichiarato), buco durante il
// gesto, margine sulla soglia, telefono bloccato, stato dall'app NATPF Racchetta. Solo misure: il riconoscimento dei
// gesti resta identico (i gesti veri del 28/10 danno gli stessi colpi, con in più il solo margine).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createSampleStats, createLockStats, appStatus, createAppReader, BUCO } from '../../site/js/tennis/phone-stats.js';
import { swingMessage, parseSwingMessage } from '../../site/js/tennis/swing-message.js';
import { createSwingDetector } from '../../site/js/tennis/swing-detect.js';
import { PROFILE_2810, WINDOWS_2810 } from './session-28-10.data.mjs';

test('B66: campioni a 60 Hz con due buchi: conti, buco più lungo, intervallo dichiarato e rapporto che riparte da capo', () => {
  const S = createSampleStats();
  let t = 1000;
  for (let i = 0; i < 120; i++){ S.feed(t, { rot: [10, 20, 30], accG: [0, 9.8, 0], interval: 16 }); t += 16.7; }
  t += 100; S.feed(t, {}); t += 16.7; S.feed(t, {});           // buco di ~117 ms
  t += 50; S.feed(t, {});                                       // buco di ~67 ms
  assert.ok(Math.abs(S.period - 16.7) < .5);
  const r = S.report();
  assert.equal(r[0], 123); assert.equal(r[2], 2); assert.equal(r[3], 117); assert.equal(r[4], 16);
  assert.ok(Math.abs(r[0]*1000/r[1] - 60) < 4, `frequenza vera ${r[0]*1000/r[1]}`);
  assert.equal(r[5], 0); assert.equal(r[6], 0);
  // da capo: niente campioni nuovi = niente rapporto pieno
  S.feed(t + 16.7, {});
  assert.deepEqual(S.report().slice(0, 4), [1, 17, 0, 0]);
  // Safari vecchio: l'intervallo in secondi
  const T = createSampleStats(); T.feed(1, { interval: .0166 }); assert.equal(T.report()[4], 16.6);
});

test('B66: buco durante il gesto solo se c’è (finestra dei campioni), saturazione con lo stesso valore grande ripetuto', () => {
  const S = createSampleStats();
  let t = 0;
  for (let i = 0; i < 40; i++){ S.feed(t, {}); t += 10; }
  assert.equal(S.gapIn(0, t), null, 'niente buchi');
  t += 60; S.feed(t, {});                                       // 70 ms dopo l'ultimo: buco
  for (let i = 0; i < 5; i++){ t += 10; S.feed(t, {}); }
  assert.equal(S.gapIn(t - 120, t), 70);
  assert.equal(S.gapIn(t - 30, t), null, 'il buco è prima della finestra');
  const Q = createSampleStats();
  Q.feed(0, { accG: [39.2, 1, 1], rot: [100, 0, 0] }); Q.feed(10, { accG: [39.2, 2, 1], rot: [2000, 0, 0] }); Q.feed(20, { accG: [12, 2, 1], rot: [-2000, 0, 0] }); Q.feed(30, { accG: [3, 2, 1], rot: [1500, 0, 0] });
  const r = Q.report(); assert.equal(r[5], 1, 'accelerazione: 39,2 due volte'); assert.equal(r[6], 1, 'rotazione: 2000 due volte');
  assert.equal(BUCO.volte, 2);
});

test('B66: telefono bloccato, conti del blocco', () => {
  const L = createLockStats();
  L.blocked(); L.blocked(); L.staff(); L.hidden(true); L.hidden(false);
  assert.deepEqual(L.counts, [2, 1, 1]);
});

test('B66: stato dall’app solo a numeri, mai nome della rete, indirizzi o identificativi; lettura al più ogni 5 s', () => {
  assert.deepEqual(appStatus(JSON.stringify({ rssi: -58, ghz: 5, mbps: 433, batt: 76, carica: 1, temp: 312, fissa: 1, spenti: 2 })), [-58, 5, 433, 76, 1, 312, 1, 2]);
  // campi in più (anche se l'app li mandasse) e valori fuori misura: via
  const x = appStatus(JSON.stringify({ rssi: 20, ghz: 3, ssid: 'Fiera-WiFi', bssid: '00:11:22:33:44:55', ip: '192.168.1.5', batt: 140, carica: 'sì', temp: 290 }));
  assert.deepEqual(x, [null, null, null, null, null, 290, null, null]);
  assert.ok(!JSON.stringify(x).includes('Fiera'));
  for (const bad of [null, '', 'x', '[1,2]', '{"rssi":"forte"}', 'a'.repeat(500)]) assert.equal(appStatus(bad), null, String(bad).slice(0, 20));
  let chiamate = 0;
  const R = createAppReader({ stato(){ chiamate++; return '{"rssi":-60,"ghz":2.4}'; } });
  assert.deepEqual(R.read(0), [-60, 2.4, null, null, null, null, null, null]);
  R.read(1000); R.read(4999); assert.equal(chiamate, 1);
  R.read(5000); assert.equal(chiamate, 2);
  assert.equal(createAppReader(undefined).read(0), null, 'senza app (browser): niente');
  assert.equal(createAppReader({ stato(){ throw new Error('x'); } }).read(0), null);
});

test('B66: il colpo porta margine e buco nel gesto, il computer li legge; senza, tutto come prima', () => {
  const s = { power: .6, lift: .1, dur: 120, dir: 1, aim: 0, confidence: .8, peakT: 500, peak: 900, detectMs: 12, holdMs: 0, t: 520, margin: 1.37 };
  const m = swingMessage(s, { now: 530, gapMs: 64.4 });
  assert.equal(m.mg, 1.37); assert.equal(m.gw, 64);
  const p = parseSwingMessage(m, { at: .5, now: 540 });
  assert.equal(p.margin, 1.37); assert.equal(p.gapMs, 64);
  const { margin, ...vecchio } = s, m0 = swingMessage(vecchio, { now: 530 });
  assert.equal(m0.mg, undefined); assert.equal(m0.gw, undefined);
  const p0 = parseSwingMessage(m0, { at: .5, now: 540 });
  assert.equal(p0.margin, undefined); assert.equal(p0.gapMs, undefined);
  // tutto il resto uguale con e senza i campi nuovi
  const { mg, gw, ...resto } = m; assert.deepEqual(resto, m0);
});

// Impronta dei gesti veri del 28/10 (6 prove per finestra: verso atteso −1, 0, +1, con e senza preparazione) fatta con il
// rilevatore di prima del B66 (2026-11-17.4): stessi colpi, scarti e preparazioni, nello stesso ordine
const IMPRONTA = { swing: 35, altri: 9, firma: '933e330650269e1e' };
test('B66: il riconoscimento dei gesti non cambia (gesti veri del 28/10); il margine c’è in ogni colpo', () => {
  let swing = 0, altri = 0, firma = '';
  for (const [name, rows] of Object.entries(WINDOWS_2810)) for (const expect of [-1, 0, 1]) for (const prep of [false, true]){
    const det = createSwingDetector();
    det.setProfile(PROFILE_2810); det.run(); det.setContext('play'); det.setPrepMode(prep); det.setExpect(expect);
    for (const k of ['swing', 'discard', 'prep']) det.on(k, v => {
      if (k === 'swing'){ swing++; assert.ok(Number.isFinite(v.margin) && v.margin > 0, `${name}: margine ${v.margin}`); if (v.dir && !v.vert) assert.ok(v.margin >= 1, `${name}: un colpo passato ha il picco sopra la soglia (${v.margin})`); }
      else altri++;
      firma += `${name}|${expect}|${prep}|${k}|${v.dir}|${v.peak}|${v.shot || ''}|${v.why || ''}|${v.power ?? ''}|${v.peakT ?? ''};`;
    });
    for (const r of rows) det.feed({ t: 1000 + r[0], rot: r.slice(1, 4), acc: r.slice(4, 7), accG: r.slice(7, 10) });
  }
  assert.deepEqual({ swing, altri, firma: createHash('sha256').update(firma).digest('hex').slice(0, 16) }, IMPRONTA);
});

test('B66: racchetta.js manda le misure con lo stato e il buco con il colpo; il blocco conta tocchi, staff e uscite', () => {
  const js = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
  assert.match(js, /sampleStats\.feed\(raw\.t, \{ rot: raw\.rot, accG: raw\.accG, interval: e\.interval \}\)/);
  assert.match(js, /\.\.\.b66State\(\) \}\);/);
  assert.match(js, /gapMs = sampleStats\.gapIn\(/);
  assert.match(js, /if \(type === 'pointerdown'\) lockStats\.blocked\(\);/);
  assert.match(js, /if \(touchLocked\) lockStats\.staff\(\); unlockTouch\(\);/);
  assert.match(js, /if \(document\.hidden\) lockStats\.hidden\(touchLocked\);/);
  assert.match(js, /createAppReader\(window\.NATPFApp\)/);
});
