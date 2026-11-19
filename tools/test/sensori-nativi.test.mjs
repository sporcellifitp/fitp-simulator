// B71 · sensori presi dall'app NATPF Racchetta 1.0.5 (site/js/tennis/sensori-nativi.js, natpf-android CampioniNativi.java,
// docs/b71/sensori.md): testo dei lotti, orologio, prova all'avvio con il browser (segno, assi, unità), ritorno al browser,
// lotti in ritardo con l'istante giusto e i gesti veri del 28/10 passati dal percorso dell'app con la stessa impronta del
// browser (phone-stats.test.mjs). Un ponte finto al posto dell'app: niente di questo sostituisce il telefono vero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NATIVI, nativeBridge, parseBatch, createClock, createCrossCheck, createNativeMotion } from '../../site/js/tennis/sensori-nativi.js';
import { createSwingDetector } from '../../site/js/tennis/swing-detect.js';
import { PROFILE_2810, WINDOWS_2810 } from './session-28-10.data.mjs';

const r1 = v => Math.round(v*10)/10;
const tenth = v => Math.round(v*10);          // come CampioniNativi.decimi (i valori di prova non cadono a metà)
const APP_OFF = 123456789.25;                 // orologio dell'app = orologio della pagina + APP_OFF

// lotto come CampioniNativi.svuota: «persi;t µs,ax,ay,az,lx,ly,lz,ra,rb,rg;…»
function encode(samples, persi = 0){
  return [String(persi), ...samples.map(k => [Math.round((k.t + APP_OFF)*1000), ...k.accG.map(tenth), ...(k.acc ? k.acc.map(tenth) : ['', '', '']), ...k.rot.map(tenth)].join(','))].join(';');
}

// movimento vero del telefono: fermo (gravità sull'asse y, poco rumore) e poi colpi attorno all'asse gamma (e un po' alpha)
function motion(t, { swingFrom = 1200 } = {}){
  const s = t >= swingFrom ? Math.sin((t - swingFrom)/1000*2*Math.PI*1.6) : 0;
  const rot = [0.4*Math.sin(t/37) + 60*s, -0.4, 0.3 + 420*s*Math.abs(s)];
  const acc = [-3*s, 0.4*s, 0.2];
  return { rot, acc, accG: [0.3 + acc[0], 9.4 + acc[1], 1.4 + acc[2]] };
}
const round = m => ({ rot: m.rot.map(r1), acc: m.acc.map(r1), accG: m.accG.map(r1) });

// mondo finto: orologio della pagina, app con il suo buffer, poll a mano (every/stopEvery finti)
function world({ change = k => k, swingFrom = 1200, avvia = true } = {}){
  const W = { T: 0, queue: [], polls: null, calls: { avvia: 0, ferma: 0 }, persi: 0, fail: false };
  W.bridge = {
    sensoriVersione: () => 1,
    sensoriAvvia: () => { W.calls.avvia++; return avvia; },
    sensoriFerma: () => { W.calls.ferma++; },
    orologio: () => W.T + APP_OFF,
    campioni: () => { if (W.fail) throw new Error('ponte'); const due = W.queue.filter(k => k.t <= W.T); W.queue = W.queue.filter(k => k.t > W.T); const s = encode(due, W.persi); W.persi = 0; return s; },
    infoSensori: () => JSON.stringify({ p: 1, us: 16667, acc: [78.5, 0.0024, 2404, 0], gir: [2000, 0.061, 2404, 300], lin: [78.5, 0.0024, 2404, 0] }),
  };
  W.fed = []; W.states = [];
  W.nm = createNativeMotion({ bridge: W.bridge, now: () => W.T, every: f => { W.polls = f; return 1; }, stopEvery: () => { W.polls = null; }, onSample: k => W.fed.push(k), onState: (s, w) => W.states.push([s, w]) });
  // un passo di 1/60 s: il sensore dell'app (istante vero, 8 ms prima), l'evento del browser (istante dell'evento), il poll
  W.step = ({ native = true, browser = true, poll = true } = {}) => {
    W.T += 1000/60;
    if (native){ const tn = W.T - 8; W.queue.push(change({ t: tn, ...round(motion(tn, { swingFrom })) })); }
    if (browser) W.nm.browser({ t: W.T, ...round(motion(W.T - 8, { swingFrom })) });
    if (poll && W.polls) W.polls();
  };
  W.run = (ms, o) => { const end = W.T + ms; while (W.T < end) W.step(o); };
  return W;
}

test('B71: testo dei lotti dell’app (lo stesso di CampioniNativiTest): unità, assi, accelerazione lineare che manca, testo rotto', () => {
  const b = parseBatch('0;5000000,0,98,-3,0,0,1,573,-1146,286;5016667,1,97,-2,,,,0,0,-5');
  assert.equal(b.persi, 0);
  assert.deepEqual(b.campioni[0], { t: 5000, accG: [0, 9.8, -0.3], acc: [0, 0, 0.1], rot: [57.3, -114.6, 28.6] });
  assert.deepEqual(b.campioni[1], { t: 5016.667, accG: [0.1, 9.7, -0.2], acc: null, rot: [0, 0, -0.5] });
  assert.equal(parseBatch('25').persi, 25);
  assert.deepEqual(parseBatch('').campioni, []);
  assert.deepEqual(parseBatch(null).campioni, []);
  assert.deepEqual(parseBatch('0;1,2,3;x,1,2,3,4,5,6,7,8,9').campioni, [], 'campioni rotti: via');
});

test('B71: il ponte vale solo se è della versione giusta (Chrome e app 1.0.4: niente, il browser come sempre)', () => {
  assert.equal(nativeBridge({}), null);
  assert.equal(nativeBridge(undefined), null);
  assert.equal(nativeBridge({ NATPFApp: { lock(){}, version: () => '1.0.4', stato: () => '{}' } }), null, 'app 1.0.4');
  const app = { sensoriVersione: () => 0, sensoriAvvia(){}, sensoriFerma(){}, campioni(){}, orologio(){} };
  assert.equal(nativeBridge({ NATPFApp: app }), null, 'app senza un sensore');
  assert.equal(nativeBridge({ NATPFApp: { ...app, sensoriVersione: () => 2 } }), null, 'protocollo di domani');
  const ok = { ...app, sensoriVersione: () => 1 };
  assert.equal(nativeBridge({ NATPFApp: ok }), ok);
  assert.equal(nativeBridge({ NATPFApp: { ...app, sensoriVersione(){ throw new Error('x'); } } }), null);
});

test('B71: orologio dell’app allineato a quello della pagina (lettura con l’andata e ritorno più breve)', () => {
  let T = 1000, i = 0;
  const lat = [3, 0.2, 5, 0.4, 2];
  const C = createClock({ orologio(){ T += lat[i % lat.length]; i++; return T + APP_OFF; } }, () => T);
  C.sync(5);
  // scarto vero −APP_OFF; con la lettura migliore l'errore è al più metà dell'andata e ritorno più breve
  assert.ok(Math.abs(C.offset + APP_OFF) <= .1 + 1e-6, `scarto ${C.offset + APP_OFF}`);
  assert.ok(Math.abs(C.toPage(APP_OFF + 5000) - 5000) <= .1 + 1e-6);
  assert.equal(createClock({ orologio: () => NaN }, () => 0).toPage(1), null);
});

test('B71: prova all’avvio, stessi sensori → si passa all’app; gravità o rotazione diverse → resta il browser', () => {
  // stessi valori (l'app ha l'istante vero, 8 ms prima): fermo → gravità giusta; colpi → rotazione giusta
  const A = world();
  A.nm.start();
  assert.equal(A.nm.state, 'prova');
  A.run(1100);
  assert.equal(A.nm.state, 'prova', 'telefono fermo: la rotazione non si giudica, si aspetta');
  A.run(2500);
  assert.equal(A.nm.state, 'nativi', JSON.stringify(A.states));
  assert.equal(A.nm.source, 'n');
  // segno della gravità opposto (un browser che desse l'accelerazione al contrario): resta il browser
  const G = world({ change: k => ({ ...k, accG: k.accG.map(v => -v) }) });
  G.nm.start(); G.run(3000);
  assert.deepEqual([G.nm.state, G.nm.why], ['browser', 'g']);
  assert.equal(G.calls.ferma, 1, 'sensori dell’app spenti');
  // gravità in g invece che in m/s²
  const U = world({ change: k => ({ ...k, accG: k.accG.map(v => v/9.81) }) });
  U.nm.start(); U.run(3000);
  assert.deepEqual([U.nm.state, U.nm.why], ['browser', 'g']);
  // assi della rotazione nell'ordine della specifica (alpha = z…) invece di quello di Chrome: rotazione sbagliata
  const R = world({ change: k => ({ ...k, rot: [k.rot[2], k.rot[0], k.rot[1]] }) });
  R.nm.start(); R.run(5000);
  assert.deepEqual([R.nm.state, R.nm.why], ['browser', 'r']);
  // rotazione in rad/s invece che in °/s
  const D = world({ change: k => ({ ...k, rot: k.rot.map(v => v*Math.PI/180) }) });
  D.nm.start(); D.run(5000);
  assert.deepEqual([D.nm.state, D.nm.why], ['browser', 'r']);
  // segno della rotazione opposto
  const S = world({ change: k => ({ ...k, rot: k.rot.map(v => -v) }) });
  S.nm.start(); S.run(5000);
  assert.deepEqual([S.nm.state, S.nm.why], ['browser', 'r']);
  // telefono sempre fermo: si resta in prova (i colpi li guida il browser, come prima)
  const F = world({ swingFrom: Infinity });
  F.nm.start(); F.run(8000);
  assert.equal(F.nm.state, 'prova');
  assert.equal(F.fed.length, 0, 'in prova nessun campione dell’app va al rilevatore');
});

test('B71: con l’app i campioni arrivano tutti, in ordine e con l’istante vero, anche in un lotto in ritardo', () => {
  const A = world();
  A.nm.start(); A.run(3600);
  assert.equal(A.nm.state, 'nativi');
  A.fed.length = 0;
  A.run(500);
  const n0 = A.fed.length;
  assert.ok(n0 >= 29 && n0 <= 31, `60 Hz: ${n0} in 0,5 s`);
  // la pagina si ferma 200 ms (un tocco sul blocco del B51): nessun poll, l'app tiene i campioni
  A.fed.length = 0;
  A.run(200, { poll: false });
  assert.equal(A.fed.length, 0);
  A.polls();
  assert.ok(A.fed.length >= 11 && A.fed.length <= 13, `lotto in ritardo: ${A.fed.length} campioni`);
  for (let i = 1; i < A.fed.length; i++){
    const dt = A.fed[i].t - A.fed[i - 1].t;
    assert.ok(Math.abs(dt - 1000/60) < .01, `istanti veri, uno ogni 16,7 ms (${dt})`);
  }
  // l'istante sulla pagina = quello vero del sensore (8 ms prima del passo), non l'arrivo
  const last = A.fed[A.fed.length - 1];
  assert.ok(Math.abs(A.T - 8 - last.t) < .5, `${A.T - 8} ≠ ${last.t}`);
  assert.deepEqual(last.accG, round(motion(last.t)).accG);
  assert.equal(A.nm.persi, 0);
  // campioni buttati dall'app (buffer pieno): contati
  A.persi = 4; A.step();
  assert.equal(A.nm.persi, 4);
  // il browser non guida più niente
  const before = A.fed.length; A.nm.browser({ t: A.T + 1, rot: [0, 0, 0], acc: [0, 0, 0], accG: [0, 9.8, 0] });
  assert.equal(A.fed.length, before);
  assert.deepEqual(A.nm.fullScale, [78.5, 2000]);
});

test('B71: ritorno al browser se l’app non manda più niente a pagina visibile; a pagina nascosta no (schermo spento)', () => {
  const A = world();
  A.nm.start(); A.run(3600);
  assert.equal(A.nm.state, 'nativi');
  // pagina nascosta 3 s: l'app ha spento i sensori, non è un guasto
  A.nm.hidden(); A.run(3000, { native: false, browser: false });
  assert.equal(A.nm.state, 'nativi');
  // di nuovo visibile: un po' di tempo per ripartire, poi i campioni tornano
  A.nm.visible(); A.run(1000, { native: false, browser: false }); A.run(500);
  assert.equal(A.nm.state, 'nativi');
  // a pagina visibile niente per più di 0,5 s: browser
  A.run(700, { native: false });
  assert.deepEqual([A.nm.state, A.nm.why], ['browser', 'f']);
  assert.deepEqual(A.states.at(-1), ['browser', 'f']);
  assert.equal(A.calls.ferma, 1);
  assert.equal(A.polls, null, 'niente più poll');
  // non si riparte da soli: resta il browser fino alla pagina nuova
  assert.equal(A.nm.start(), 'browser');
  // ponte che dà errore; app che non accende i sensori
  const P = world(); P.nm.start(); P.run(200); P.fail = true; P.step();
  assert.deepEqual([P.nm.state, P.nm.why], ['browser', 'p']);
  const Q = world({ avvia: false });
  assert.equal(Q.nm.start(), 'browser'); assert.equal(Q.nm.why, 'p');
  // senza ponte: sempre «off» (Chrome)
  const N = createNativeMotion({ bridge: null });
  assert.equal(N.start(), 'off'); assert.equal(N.source, 'b'); assert.equal(N.feeds, false); assert.equal(N.wantsBrowser, false);
  N.browser({ t: 1, rot: [0, 0, 0] }); N.stop(); assert.equal(N.state, 'off');
});

test('B71: prova a blocchi: verdetto solo con la gravità a telefono fermo e la rotazione degli assi che si muovono', () => {
  const C = createCrossCheck();
  for (let t = 0; t <= 1000; t += 1000/60){ C.browser({ t, ...round(motion(t - 8, { swingFrom: Infinity })) }); C.native({ t: t - 8, ...round(motion(t - 8, { swingFrom: Infinity })) }); }
  assert.equal(C.tick(1000), null);
  assert.deepEqual(C.blocks, [{ g: true, r: null }]);
});

// Impronta dei gesti veri del 28/10 (phone-stats.test.mjs, 933e330650269e1e): gli stessi campioni passati dal percorso
// dell'app (testo dei lotti, orologio, consegna a lotti di 5 come dopo un thread fermo) danno gli stessi colpi, scarti e
// preparazioni, con gli stessi istanti
const IMPRONTA = { swing: 35, altri: 9, firma: '933e330650269e1e' };
test('B71: i gesti veri del 28/10 dal percorso dell’app danno la stessa impronta del browser', () => {
  let swing = 0, altri = 0, firma = '';
  for (const [name, rows] of Object.entries(WINDOWS_2810)) for (const expect of [-1, 0, 1]) for (const prep of [false, true]){
    const det = createSwingDetector();
    det.setProfile(PROFILE_2810); det.run(); det.setContext('play'); det.setPrepMode(prep); det.setExpect(expect);
    for (const k of ['swing', 'discard', 'prep']) det.on(k, v => {
      if (k === 'swing') swing++; else altri++;
      firma += `${name}|${expect}|${prep}|${k}|${v.dir}|${v.peak}|${v.shot || ''}|${v.why || ''}|${v.power ?? ''}|${v.peakT ?? ''};`;
    });
    // l'app passa la prova prima della finestra (tempi della pagina −6 s … −2 s), poi i campioni della finestra
    const A = world({ swingFrom: -6000 + 1200 });
    A.T = -6000; A.nm.start(); A.run(3600);
    assert.equal(A.nm.state, 'nativi', name);
    A.fed.length = 0;
    const out = [];
    const rowsK = rows.map(r => ({ t: 1000 + r[0], rot: r.slice(1, 4), acc: r.slice(4, 7), accG: r.slice(7, 10) }));
    for (let i = 0; i < rowsK.length; i += 5){
      A.queue.push(...rowsK.slice(i, i + 5));
      A.T = rowsK[Math.min(rowsK.length, i + 5) - 1].t + 3;
      A.polls();
      out.push(...A.fed.splice(0));
    }
    assert.equal(out.length, rowsK.length, `${name}: tutti i campioni`);
    for (const [i, k] of out.entries()){
      assert.equal(k.t, rowsK[i].t, `${name}: istante del campione ${i}`);
      assert.deepEqual([k.rot, k.acc, k.accG], [rowsK[i].rot, rowsK[i].acc, rowsK[i].accG]);
      det.feed(k);
    }
  }
  assert.deepEqual({ swing, altri, firma: createHash('sha256').update(firma).digest('hex').slice(0, 16) }, IMPRONTA);
});

test('B71: racchetta.js usa i sensori dell’app solo con il ponte giusto e per il resto tiene il percorso del browser', () => {
  const js = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
  assert.match(js, /createNativeMotion\(\{ bridge: nativeBridge\(window\), onSample: k => feedSample\(k, NATIVE_EV\)/);
  // devicemotion: il campione del browser va al confronto in prova e al rilevatore come sempre (stessa funzione per i due)
  assert.match(js, /if \(native\.state !== 'off'\)\{ if \(native\.feeds\) return; native\.browser\(raw\); \}\n  feedSample\(raw, e\);/);
  assert.match(js, /function feedSample\(raw, e\)\{\n  lastRawG = raw\.accG;\n  const k = normalizeSample\(raw, accSign\.sign\);/);
  // misure per il registro: sorgente, fondo scala, motivo del ritorno al browser, tocchi prima dei buchi
  assert.match(js, /sr: native\.source/);
  assert.match(js, /addEventListener\('pointerdown', e => sampleStats\.touch\(e\.timeStamp\), \{ capture: true, passive: true \}\);/);
  assert.match(js, /if \(document\.hidden\) native\.hidden\(\); else native\.visible\(\);/);
  assert.equal(NATIVI.intervallo, 16.7);
});
