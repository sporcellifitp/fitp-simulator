// B74 · ordine degli assi del giroscopio (docs/b74/verifica-assi.md, docs/b74/assi-giroscopio.md) · pagina del telefono.
// Chrome su Android e l'app NATPF Racchetta mandano rotationRate con α = x, β = y, γ = z; il codice (face-tracker.js,
// swing-detect.js, gesture-intent.js) legge α = z, β = x, γ = y (W3C). Con l'interruttore dello staff «Assi del
// giroscopio: Corretti (prova)» un telefono Android riordina la rotazione all'ingresso (motion-sign.normalizeSample).
//   • i campioni veri del 28/10 (session-28-10.data.mjs): l'alto stimato dal filtro d'orientamento dopo il colpo sbaglia di
//     ~80° con l'ordine di oggi e di ~7° con quello giusto (verifica del B74: 31° → 2,6° di mediana su 7 registrazioni);
//   • interruttore spento: tutto come prima, byte per byte (impronta B66 dei gesti veri 933e330650269e1e);
//   • interruttore acceso: impronta nuova ddc7a2883204079e (valore atteso a parte, finché le soglie non si ritarano) e il
//     rovescio del match point con la palla sul rovescio esce senza verso (0), come ha detto la verifica;
//   • iPhone (Safari, ordine del W3C) e gli altri: niente riordino;
//   • racchetta.js: cfg ax dal gioco, «dev» ax al gioco, profilo salvato solo con lo stesso ordine, flusso rs grezzo con o.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { normalizeSample, rotOrderFor, isAndroid, codeRotation, rawRotation, ROT_ORDERS } from '../../site/js/tennis/motion-sign.js';
import { createFaceTracker, rotate } from '../../site/js/tennis/face-tracker.js';
import { createSwingDetector } from '../../site/js/tennis/swing-detect.js';
import { PROFILE_2810, WINDOWS_2810 } from './session-28-10.data.mjs';

const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36',
  app: 'Mozilla/5.0 (Linux; Android 17; SM-S931B Build/AP4A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/157.0.0.0 Mobile Safari/537.36 NATPFApp/1.0.5',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  desktop: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36',
};

/* ---------- motion-sign.js ---------- */
test('B74: riordino solo con l’interruttore acceso su Android (Chrome, app NATPF Racchetta, Samsung); iPhone, iPad e computer mai', () => {
  assert.deepEqual([...ROT_ORDERS], ['w3c', 'chrome']);
  for (const k of ['android', 'app', 'samsung']){ assert.equal(isAndroid({ ua: UA[k] }), true, k); assert.equal(rotOrderFor(true, { ua: UA[k] }), 'chrome', k); assert.equal(rotOrderFor(false, { ua: UA[k] }), 'w3c', `${k} spento`); }
  for (const k of ['iphone', 'ipad', 'desktop']){ assert.equal(isAndroid({ ua: UA[k] }), false, k); assert.equal(rotOrderFor(true, { ua: UA[k] }), 'w3c', k); }
  // Chrome con «Sito desktop»: il nome non dice Android, la piattaforma sì
  assert.equal(rotOrderFor(true, { ua: UA.desktop, platform: 'Android' }), 'chrome');
  assert.equal(rotOrderFor(true, {}), 'w3c'); assert.equal(rotOrderFor(true), 'w3c');
});

test('B74: normalizeSample con l’ordine di Chrome dà [γ, α, β] (z, x, y del sensore = α, β, γ del codice); spento lo stesso campione di prima', () => {
  const raw = { t: 5, rot: [10, -20, 30], acc: [.1, -.2, .3], accG: [.5, 9.7, .4] }, copia = JSON.parse(JSON.stringify(raw));
  // spento (o 'w3c'): lo stesso oggetto, come prima del B74
  assert.equal(normalizeSample(raw, 1), raw); assert.equal(normalizeSample(raw, 1, 'w3c'), raw);
  // acceso su Android: nuovo campione, rotazione riordinata, il resto uguale, l'ingresso non toccato
  const k = normalizeSample(raw, 1, 'chrome');
  assert.notEqual(k, raw); assert.deepEqual(k, { t: 5, rot: [30, 10, -20], acc: [.1, -.2, .3], accG: [.5, 9.7, .4] });
  assert.deepEqual(raw, copia, 'il campione grezzo resta com’è (misure, prova app/browser, flusso rs)');
  // con il segno di iPhone: tutte e due le cose (non succede con rotOrderFor, ma la funzione è una sola)
  assert.deepEqual(normalizeSample(raw, -1, 'chrome'), { t: 5, rot: [30, 10, -20], acc: [-.1, .2, -.3], accG: [-.5, -9.7, -.4] });
  assert.deepEqual(normalizeSample(raw, -1), { t: 5, rot: [10, -20, 30], acc: [-.1, .2, -.3], accG: [-.5, -9.7, -.4] }, 'iPhone come prima');
  assert.deepEqual(normalizeSample({ t: 1, rot: null, acc: [1, 2, 3], accG: null }, 1, 'chrome'), { t: 1, rot: null, acc: [1, 2, 3], accG: null });
  assert.equal(normalizeSample(null, 1, 'chrome'), null);
  // la rotazione del sensore si ritrova sempre (registri e rigiocate)
  assert.deepEqual(rawRotation(codeRotation([1, 2, 3], 'chrome'), 'chrome'), [1, 2, 3]);
  assert.deepEqual(codeRotation([1, 2, 3], 'w3c'), [1, 2, 3]); assert.deepEqual(rawRotation([1, 2, 3]), [1, 2, 3]);
});

/* ---------- campioni veri del 28/10 ---------- */
const D = Math.PI/180, len = v => Math.hypot(v[0], v[1], v[2]), dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)/len(a)/len(b))))/D;
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const samples = (rows, order) => rows.map(r => normalizeSample({ t: 1000 + r[0], rot: r.slice(1, 4), acc: r.slice(4, 7), accG: r.slice(7, 10) }, 1, order));
// Errore dell'alto del filtro d'orientamento della pagina del telefono (face-tracker.js, come racchetta.js) dopo il colpo:
// posa di riposo all'inizio della finestra, poi i campioni; dopo il picco, a ogni campione quasi fermo (accelerazione della
// mano sotto 2,5 m/s², gravità 9,81 ± 1), l'angolo tra l'alto stimato nel riferimento del telefono e la gravità misurata
function alto(on){
  const order = rotOrderFor(on, { ua: UA.android }), out = {};
  for (const [name, rows] of Object.entries(WINDOWS_2810)){
    const ks = samples(rows, order), peak = ks.reduce((b, k, i) => (len(k.rot) > len(ks[b].rot) ? i : b), 0);
    const f = createFaceTracker({ quietHold: 400, relax: 2.5 }); f.setRest(ks[0].accG, [0, 0, 0]);
    out[name] = [];
    ks.forEach((k, i) => { f.feed(k); if (i > peak && len(k.acc) < 2.5 && Math.abs(len(k.accG) - 9.81) < 1) out[name].push(angle(rotate(qconj(f.quaternion), f.up), k.accG)); });
  }
  return out;
}
test('B74, campioni veri del 28/10: con l’interruttore acceso l’alto del filtro dopo il colpo sbaglia di pochi gradi; spento come oggi (~80°)', () => {
  const off = alto(false), on = alto(true), all = o => Object.values(o).flat();
  assert.equal(all(off).length, 18, 'gli stessi istanti quasi fermi dopo il colpo'); assert.equal(all(on).length, 18);
  // (20/11: spento mediana 81,9°, peggiore 108,6°; acceso 7,5° e 19,8°. Verifica del B74, 7 registrazioni: 31,1° → 2,6°)
  assert.ok(med(all(on)) <= 10, `acceso: mediana ${med(all(on)).toFixed(1)}°`);
  assert.ok(Math.max(...all(on)) <= 25, `acceso: peggiore ${Math.max(...all(on)).toFixed(1)}°`);
  assert.ok(med(all(off)) >= 60, `spento (come oggi): mediana ${med(all(off)).toFixed(1)}°`);
  for (const [name, e] of Object.entries(off)) if (e.length) assert.ok(med(on[name]) < med(e)/3, `${name}: acceso ${med(on[name]).toFixed(1)}° contro ${med(e).toFixed(1)}°`);
  // spento = il percorso di oggi, campione per campione (normalizeSample non tocca niente)
  const oggi = {};
  for (const [name, rows] of Object.entries(WINDOWS_2810)){
    const ks = rows.map(r => ({ t: 1000 + r[0], rot: r.slice(1, 4), acc: r.slice(4, 7), accG: r.slice(7, 10) })), peak = ks.reduce((b, k, i) => (len(k.rot) > len(ks[b].rot) ? i : b), 0);
    const f = createFaceTracker({ quietHold: 400, relax: 2.5 }); f.setRest(ks[0].accG, [0, 0, 0]); oggi[name] = [];
    ks.forEach((k, i) => { f.feed(k); if (i > peak && len(k.acc) < 2.5 && Math.abs(len(k.accG) - 9.81) < 1) oggi[name].push(angle(rotate(qconj(f.quaternion), f.up), k.accG)); });
  }
  assert.deepEqual(off, oggi);
});

// Impronta dei gesti veri del 28/10 (phone-stats.test.mjs): 6 prove per finestra. Con l'interruttore acceso il profilo è
// quello di una calibrazione fatta con l'interruttore acceso: asse e deriva nell'ordine del codice (codeRotation)
function impronta(on){
  const order = rotOrderFor(on, { ua: UA.android }), prof = { ...PROFILE_2810, axis: codeRotation(PROFILE_2810.axis, order), bias: codeRotation(PROFILE_2810.bias, order) };
  let swing = 0, altri = 0, firma = ''; const mp = [];
  for (const [name, rows] of Object.entries(WINDOWS_2810)) for (const expect of [-1, 0, 1]) for (const prep of [false, true]){
    const det = createSwingDetector();
    det.setProfile(prof); det.run(); det.setContext('play'); det.setPrepMode(prep); det.setExpect(expect);
    for (const k of ['swing', 'discard', 'prep']) det.on(k, v => {
      if (k === 'swing'){ swing++; if (name === 'rovescioMatchPoint' && v.peak > 900) mp.push({ expect, prep, dir: v.dir, shot: v.shot }); } else altri++;
      firma += `${name}|${expect}|${prep}|${k}|${v.dir}|${v.peak}|${v.shot || ''}|${v.why || ''}|${v.power ?? ''}|${v.peakT ?? ''};`;
    });
    for (const k of samples(rows, order)) det.feed(k);
  }
  return { swing, altri, firma: createHash('sha256').update(firma).digest('hex').slice(0, 16), mp };
}
test('B74, gesti veri del 28/10: interruttore spento → impronta B66 di sempre; acceso → impronta nuova (attesa a parte, fino alla nuova taratura)', () => {
  const off = impronta(false), on = impronta(true);
  assert.deepEqual({ swing: off.swing, altri: off.altri, firma: off.firma }, { swing: 35, altri: 9, firma: '933e330650269e1e' });
  assert.deepEqual({ swing: on.swing, altri: on.altri, firma: on.firma }, { swing: 35, altri: 9, firma: 'ddc7a2883204079e' });
  // il rovescio del match point (991 °/s): con la palla sul rovescio e la preparazione oggi è un rovescio (−1); con gli assi
  // giusti esce senza verso (0, «drive»): lo dice la verifica del B74 §4.2, le soglie del verso sono tarate sull'ordine di
  // oggi. Senza verso atteso resta un rovescio
  assert.deepEqual(off.mp.find(m => m.expect === -1 && m.prep), { expect: -1, prep: true, dir: -1, shot: 'slice' });
  assert.deepEqual(on.mp.find(m => m.expect === -1 && m.prep), { expect: -1, prep: true, dir: 0, shot: 'drive' });
  assert.deepEqual(on.mp.filter(m => m.expect === 0).map(m => m.dir), [-1, -1]);
});

/* ---------- racchetta.js e link.js ---------- */
test('B74 racchetta.js: cfg ax dal gioco → setAxes; riordino in feedSample con raw intatto; profilo salvato solo con lo stesso ordine; dev ax e rs grezzo con o', () => {
  const js = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
  assert.match(js, /let axesOn = ss\.get\('ax'\) === 1, rotOrder = rotOrderFor\(axesOn, AXES_DEVICE\);/);
  assert.match(js, /const AXES_DEVICE = \{ ua: navigator\.userAgent, platform: navigator\.userAgentData\?\.platform \|\| '' \};/);
  assert.match(js, /setAxes\(d\.ax === 1\);\n      sendState\(\); paint\(\); break;/, 'nel messaggio cfg');
  assert.match(js, /const k = normalizeSample\(raw, accSign\.sign, rotOrder\);/);
  assert.match(js, /sampleStats\.feed\(raw\.t, \{ rot: raw\.rot, accG: raw\.accG, interval: e\.interval \}\)/, 'misure del registro sui campioni grezzi');
  assert.match(js, /r: raw\.rot && raw\.rot\.map\(v => Math\.round\(v\*10\)\/10\)/, 'flusso diagnostico: rotazione com’è il sensore');
  assert.match(js, /\.\.\.\(rotOrder === 'chrome' \? \{ o: 'c' \} : \{\}\) \};/);
  assert.match(js, /\(saved\.accSign \?\? 1\) === accSign\.sign && \(saved\.ro \|\| 'w3c'\) === rotOrder\)/);
  assert.match(js, /ss\.set\('profile', \{ \.\.\.p, accSign: accSign\.sign, \.\.\.\(rotOrder !== 'w3c' \? \{ ro: rotOrder \} : \{\}\) \}\)/);
  assert.match(js, /\.\.\.\(axesOn \? \{ ax: rotOrder === 'chrome' \? 1 : 0 \} : \{\}\), \.\.\.appVersion\(\) \}\);/);
  // al cambio d'ordine: posa di riposo da capo e calibrazione rifatta, come al cambio del segno dei sensori
  const i = js.indexOf('function setAxes(on){'), block = js.slice(i, js.indexOf('\n}\n', i));
  assert.ok(i > 0);
  assert.match(block, /rotOrder = next; face\.reset\(\);\n  if \(inputMode === 'motion' && \(sensor === 'ready' \|\| sensor === 'cal'\)\)\{ ss\.del\('profile'\); needCal\(\); \}/);
  assert.match(block, /if \(told\)\{ axesOn = want; ss\.set\('ax', want \? 1 : 0\); \}/);
});

class Emitter { constructor(){ this.h = {}; } on(k, f){ (this.h[k] ||= []).push(f); return this; } emit(k, v){ for (const f of this.h[k] || []) f(v); } }
class FakeConn extends Emitter { constructor(peer, label){ super(); this.peer = peer; this.label = label; this.open = true; this.sent = []; } send(m){ this.sent.push(m); } close(){ this.open = false; this.emit('close'); } }
class FakePeer extends Emitter { constructor(){ super(); this.destroyed = false; FakePeer.last = this; setTimeout(() => this.emit('open'), 0); } destroy(){ this.destroyed = true; } }
test('B74 link.js (computer): «dev» ax → device.axes (1, 0; niente senza); rs con o «c» → raw.o', async () => {
  globalThis.window = { Peer: FakePeer };
  globalThis.location = { search: '', href: 'http://127.0.0.1/' };
  const { createPhoneLink } = await import('../../site/js/tennis/link.js');
  const link = createPhoneLink(), dev = [], raw = [];
  link.on('device', d => dev.push(d)).on('raw', k => raw.push(k));
  await link.start();
  const main = new FakeConn('phone-1');
  FakePeer.last.emit('connection', main);
  main.emit('data', { t: 'hello', v: 2, k: link.token });
  try {
    main.emit('data', { t: 'dev', ua: 'Telefono di prova', vr: '2026-11-20.1', as: 1 });
    main.emit('data', { t: 'dev', ua: 'Telefono di prova', vr: '2026-11-20.1', as: 1, ax: 1 });
    main.emit('data', { t: 'dev', ua: 'Telefono di prova', vr: '2026-11-20.1', as: 1, ax: 0 });
    main.emit('data', { t: 'dev', ua: 'Telefono di prova', vr: '2026-11-20.1', as: 1, ax: 'x' });
    assert.deepEqual(dev.map(d => d.axes), [undefined, 1, 0, undefined]);
    assert.ok(!('axes' in dev[0]), 'senza ax il «dev» è quello di prima');
    main.emit('data', { t: 'rs', q: 1, k: 10, r: [1, 2, 3], a: [0, 0, 0], g: [0, 9.8, 0] });
    main.emit('data', { t: 'rs', q: 2, k: 27, r: [1, 2, 3], a: [0, 0, 0], g: [0, 9.8, 0], o: 'c' });
    assert.equal(raw.length, 2); assert.ok(!('o' in raw[0])); assert.equal(raw[1].o, 'c'); assert.deepEqual(raw[1].rot, [1, 2, 3]);
  } finally { link.stop(); }
});
