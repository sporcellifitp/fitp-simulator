// Webcam: misure al secondo e carico del modello delle mani (src/natpf/webcam_load.js). Tempi d'inferenza simulati:
// quanto costa davvero il modello sul portatile della prova lo dice solo il registro di una sessione su quel computer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadGovernor, createWebcamStats, WEBCAM_LEVELS, WEBCAM_LOAD, levelIndex } from '../src/natpf/webcam_load.js';

test('livelli: dal modello completo con 2 mani al leggero con 1 mano', () => {
  assert.deepEqual(WEBCAM_LEVELS.map(l => [l.id, l.modelComplexity, l.maxNumHands]), [['piena', 1, 2], ['leggera', 0, 2], ['minima', 0, 1]]);
  assert.equal(levelIndex('leggera'), 1); assert.equal(levelIndex('boh'), 0);
});

test('carico: inferenza veloce resta al livello pieno; lenta scende di un livello alla volta, dopo il riscaldamento', () => {
  const fast = createLoadGovernor();
  for (let i = 0; i < 300; i++) assert.equal(fast.push(9 + (i % 5)), null);
  assert.equal(fast.level.id, 'piena');
  const slow = createLoadGovernor(), changes = [];
  // le prime inferenze di un modello appena caricato sono lente: non contano
  for (let i = 0; i < WEBCAM_LOAD.warmup; i++) assert.equal(slow.push(400), null);
  for (let i = 0; i < 200; i++){ const c = slow.push(slow.level.id === 'piena' ? 28 : 21); if (c) changes.push({ ...c, i }); }
  assert.deepEqual(changes.map(c => [c.from.id, c.level.id]), [['piena', 'leggera'], ['leggera', 'minima']]);
  assert.equal(changes[0].i, WEBCAM_LOAD.window - 1, 'deciso con una finestra piena di misure');
  assert.ok(changes[1].i - changes[0].i >= WEBCAM_LOAD.warmup + WEBCAM_LOAD.window, 'dopo un cambio: di nuovo riscaldamento e finestra');
  assert.match(changes[0].why, /mediana 28 ms oltre 16 ms/);
  // all'ultimo livello non si scende più; non si risale
  for (let i = 0; i < 200; i++) assert.equal(slow.push(i % 2 ? 40 : 5), null);
  assert.equal(slow.level.id, 'minima');
});

test('carico: qualche inferenza lenta isolata non cambia livello (conta la mediana); livello imposto per il confronto', () => {
  const g = createLoadGovernor();
  for (let i = 0; i < 300; i++) assert.equal(g.push(i % 4 === 0 ? 60 : 10), null);
  assert.equal(g.level.id, 'piena');
  // molto oltre il budget (computer lento): si decide dopo 10 misure invece di una finestra intera
  const v = createLoadGovernor();
  let at = null;
  for (let i = 0; i < 60 && at == null; i++) if (v.push(i < WEBCAM_LOAD.warmup ? 900 : 240)) at = i;
  assert.equal(at, WEBCAM_LOAD.warmup + WEBCAM_LOAD.quick - 1);
  const f = createLoadGovernor({ start: 'leggera', fixed: true });
  for (let i = 0; i < 300; i++) assert.equal(f.push(50), null);
  assert.equal(f.level.id, 'leggera'); assert.equal(f.fixed, true);
});

test('misure al secondo: fotogrammi della camera da quelli presentati, buchi, richiami persi, inferenze, età del dato, carico', () => {
  const s = createWebcamStats();
  // camera a 30 Hz con un buco di 120 ms e due fotogrammi che la pagina non ha visto
  let mt = 0, pf = 0, now = 0;
  for (let i = 0; i < 30; i++){ mt += i === 10 ? .12 : 1/30; pf += i === 20 ? 3 : 1; now += 33; s.frame(now, { mediaTime: mt, presentedFrames: pf }); }
  for (let i = 0; i < 20; i++) s.infer(i < 10 ? 12 : 30);
  for (const a of [40, 50, 60, 200]) s.use(a);
  const o = s.flush(1000);
  // 30 richiami, ma 32 fotogrammi presentati: 2 la pagina non li ha visti (thread occupato)
  assert.equal(o.fps, 32); assert.equal(o.buco, 120); assert.ok(o.intervalloP95 >= 33 && o.intervalloP95 <= 120);
  assert.equal(o.persiDalBrowser, 2);
  assert.equal(o.inferenze, 20); assert.equal(o.senzaInferenza, 12);
  assert.equal(o.inferenzaP50, 30); assert.equal(o.inferenzaMax, 30);
  assert.equal(o.etaP50, 60); assert.equal(o.etaMax, 200);
  assert.equal(o.caricoPercento, 42, 'thread del gioco occupato dall\'inferenza: 420 ms in 1 s');
  // dopo flush si riparte da zero
  assert.equal(s.flush(1000).inferenze, 0);
});

test('inferenza dai fotogrammi della camera: fuori dal richiamo, una alla volta, solo l\'ultimo fotogramma; misure e livello nel registro', async () => {
  const { MotionController: MC } = await import('../src/motion_controls.js');
  // Attendere il MessageChannel, non 15 ms di orologio: sotto carico il callback può arrivare dopo.
  const wait = async () => {
    const deadline = Date.now() + 1000;
    while (mc._kickQueued && Date.now() < deadline) await new Promise(r => setTimeout(r, 1));
    assert.equal(mc._kickQueued, false, 'il compito di inferenza viene eseguito');
  };
  const mc = Object.create(MC.prototype), sends = [], logs = [], opts = [];
  let cb = null;
  Object.assign(mc, { webcamActive: true, _mpBusy: false, _handOthers: [], handPreference: 'right', onTrack: d => logs.push(d),
    videoElem: { readyState: 4, currentTime: 0, videoWidth: 640, videoHeight: 480, requestVideoFrameCallback: f => { cb = f; } } });
  mc.mpHands = { send: ({ image }) => { sends.push(image.currentTime); return Promise.resolve(); }, setOptions: o => opts.push(o) };
  mc._wcGov = createLoadGovernor({ start: 'piena' });
  mc._wcStart(null);
  assert.equal(logs[0].kind, 'camera'); assert.equal(logs[0].livello, 'piena'); assert.equal(logs[0].richiamiFotogrammi, true);
  mc._watchFrames();
  const frame = (k, now) => { mc.videoElem.currentTime = k; cb(now, { captureTime: now - 10, mediaTime: k/30, presentedFrames: k }); };
  frame(1, 1000);
  assert.equal(sends.length, 0, 'non dentro il richiamo del fotogramma (che è nel ciclo di disegno)');
  await wait();
  assert.deepEqual(sends, [1]);
  // inferenza in corso: arrivano i fotogrammi 2 e 3; un solo invio in volo
  frame(2, 1033); await wait(); frame(3, 1066); await wait();
  assert.deepEqual(sends, [1]);
  await new Promise(r => setTimeout(r, 70));
  // risultato: subito l'ultimo fotogramma (3); il 2 è superato e non si elabora
  mc._onHandResults({ multiHandLandmarks: [], multiHandedness: [] });
  await wait();
  assert.deepEqual(sends, [1, 3]);
  mc._onHandResults({ multiHandLandmarks: [], multiHandedness: [] });
  await wait();
  assert.deepEqual(sends, [1, 3], 'nessun fotogramma nuovo: nessun invio');
  // inferenze lente: dopo il riscaldamento e una finestra il modello si alleggerisce al prossimo invio, e il registro lo dice
  const realNow = performance.now;
  try {
    let NOW = 2000; performance.now = () => NOW;
    for (let i = 0; i < 60 && !opts.length; i++){
      frame(4 + i, NOW); await wait();
      NOW += 30; mc._onHandResults({ multiHandLandmarks: [], multiHandedness: [] }); NOW += 50; await wait();
    }
  } finally { performance.now = realNow; }
  const change = logs.find(l => l.kind === 'carico');
  assert.ok(change && change.from === 'piena' && change.to === 'leggera', JSON.stringify(change));
  assert.deepEqual(opts[0], { maxNumHands: 2, modelComplexity: 0 });
});

test('richiami dei fotogrammi fermi o assenti: l\'inferenza la fa partire il ciclo di disegno, come prima', async () => {
  const { MotionController: MC } = await import('../src/motion_controls.js');
  const realNow = performance.now;
  try {
    let NOW = 5000; performance.now = () => NOW;
    const mc = Object.create(MC.prototype), sends = [];
    Object.assign(mc, { webcamActive: true, _mpBusy: false, latestHandLandmarks: null, videoElem: { readyState: 4, currentTime: 1 }, _frameMeta: { capture: 4790, at: 4800 } });
    mc.mpHands = { send: ({ image }) => { sends.push(image.currentTime); return Promise.resolve(); } };
    mc._handSeenForFlow = NOW;                       // niente flusso ottico in questa prova
    mc._processWebcamFrame();
    assert.deepEqual(sends, [], 'richiami fermi da 200 ms: parte dal ciclo di disegno, in un compito a sé');
    await new Promise(r => setTimeout(r, 15));
    assert.deepEqual(sends, [1]);
    mc._mpBusy = false; mc.videoElem.currentTime = 2; mc._frameMeta = { capture: NOW - 20, at: NOW - 10 };
    mc._processWebcamFrame();
    assert.deepEqual(sends, [1], 'richiami vivi: il ciclo di disegno non invia');
    NOW += 70; mc._frameMeta = null; mc.videoElem.currentTime = 3;
    mc._processWebcamFrame();
    assert.deepEqual(sends, [1, 3], 'browser senza richiami dei fotogrammi: come prima');
  } finally { performance.now = realNow; }
});

test('metriche della webcam: camera ottenuta, ritmo, carico del thread, età del dato e confronto per livello del modello', async () => {
  const { computeMetrics, summaryLines } = await import('../src/natpf/diag/diag_metrics.js');
  const ev = [{ k: 'sessione', t: 0 }, { k: 'webcam.camera', t: 10, chiesto: { w: 640, h: 480, fps: 30 }, ottenuto: { w: 640, h: 480, fps: 30 }, nome: 'camera di prova', livello: 'piena', richiamiFotogrammi: true }];
  // 5 s al livello pieno (inferenza 28 ms), poi il cambio e 10 s al leggero (12 ms)
  for (let i = 0; i < 15; i++){
    const full = i < 5;
    ev.push({ k: 'webcam.ritmo', t: 1000*(i + 1), fps: full ? 29 : 30, intervalloP95: 36, buco: i === 7 ? 140 : 40, persiDalBrowser: 0, inferenze: full ? 20 : 30, inferenzeAlSecondo: full ? 20 : 30,
      inferenzaP50: full ? 28 : 12, inferenzaP95: full ? 35 : 15, inferenzaMax: full ? 40 : 18, senzaInferenza: full ? 9 : 0, etaP50: full ? 70 : 45, etaMax: full ? 90 : 60, caricoPercento: full ? 56 : 36, livello: full ? 'piena' : 'leggera' });
    if (i === 4) ev.push({ k: 'webcam.carico', t: 5100, da: 'piena', a: 'leggera', p50: 28, perche: 'inferenza mediana 28 ms oltre 16 ms' }, { k: 'webcam.carico', t: 5400, da: 'piena', a: 'leggera', applicato: true });
  }
  const m = computeMetrics(ev, { spanMs: 16000 });
  const W = m.webcam;
  assert.deepEqual(W.camera.ottenuto, { w: 640, h: 480, fps: 30 });
  assert.equal(W.fpsCamera.p50, 30); assert.equal(W.bucoCameraMs, 140); assert.equal(W.fotogrammiSenzaInferenza, 45);
  assert.deepEqual([W.perLivello.piena.secondi, W.perLivello.piena.inferenzaMs.p50, W.perLivello.leggera.inferenzaMs.p50], [5, 28, 12]);
  assert.deepEqual([W.perLivello.piena.caricoPercento.p50, W.perLivello.leggera.caricoPercento.p50], [56, 36]);
  assert.deepEqual(W.livello, { iniziale: 'piena', finale: 'leggera', cambi: [{ t: 5100, da: 'piena', a: 'leggera', p50: 28, caricatoT: 5400 }] });
  const lines = summaryLines(m).join('\n');
  assert.match(lines, /camera 30 fotogrammi\/s/); assert.match(lines, /modello delle mani leggera \(da piena: piena→leggera con l'inferenza a 28 ms\)/);
});

test('cambio di modello deciso nello scambio: si carica solo al primo invio senza un punto in gioco', async () => {
  const { MotionController: MC } = await import('../src/motion_controls.js');
  const mc = Object.create(MC.prototype), opts = [], logs = [];
  let playing = true;
  Object.assign(mc, { webcamActive: true, _mpBusy: false, onTrack: d => d.kind === 'carico' && logs.push(d), canReload: () => !playing, videoElem: { readyState: 4, currentTime: 0 } });
  mc.mpHands = { send: () => Promise.resolve(), setOptions: o => opts.push(o) };
  mc._wcGov = createLoadGovernor({ start: 'piena' });
  mc._wcStart(null);
  mc._wcPending = { id: 'leggera', maxNumHands: 2, modelComplexity: 0 };
  for (let i = 0; i < 5; i++){ mc._mpBusy = false; assert.equal(mc._sendFrame(1000 + i*70), true); }
  assert.equal(opts.length, 0, 'con il punto in gioco il modello non si ricarica (fermerebbe il gioco)');
  playing = false; mc._mpBusy = false; mc._sendFrame(2000);
  assert.deepEqual(opts, [{ maxNumHands: 2, modelComplexity: 0 }]);
  assert.deepEqual(logs.map(l => [l.from, l.to, !!l.applied]), [['piena', 'leggera', true]]);
});

test('rapporto: mappa dei rimbalzi e pause del telefono nelle metriche', async () => {
  const { viewerHtml } = await import('../src/natpf/diag/diag_viewer.js');
  const { computeMetrics, summaryLines } = await import('../src/natpf/diag/diag_metrics.js');
  const ev = [{ k: 'sessione', t: 0 }, { k: 'rimbalzo', t: 1000, x: 1.2, z: -9.1, da: 'player', n: 1 }, { k: 'rimbalzo', t: 2000, x: -4.5, z: 8.2, da: 'opponent', n: 1 },
    { k: 'tel.pausa', t: 3000, motivo: 'pagina nascosta' }, { k: 'tel.pausa', t: 9000, motivo: 'sensori fermi' }, { k: 'tel.pausa', t: 12000, motivo: 'pagina nascosta' }];
  const m = computeMetrics(ev, { spanMs: 15000 });
  assert.deepEqual(m.pauseTelefono, { 'pagina nascosta': 2, 'sensori fermi': 1 });
  assert.match(summaryLines(m).join('\n'), /Partita in pausa per il telefono: pagina nascosta 2, sensori fermi 1/);
  const html = viewerHtml({ meta: {}, metrics: m, events: ev });
  assert.match(html, /Mappa dei rimbalzi/); assert.match(html, /id="map"/);
  assert.match(html, /"k":"rimbalzo"/, 'i rimbalzi arrivano alla pagina');
});
