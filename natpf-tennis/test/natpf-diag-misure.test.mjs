// Diagnostiche del 30/10 (20261030-142317 e -142438, C8): la diagnostica misurava male tre cose.
//  1. tempo dei colpi del telefono da tentativo.tauMs (tempo al primo tentativo, non quello del colpo: 43,8 contro 233 ms);
//  2. contatori del collegamento cumulativi per tutta la vita del collegamento, e il primo riassunto con un buco nato prima
//     della registrazione (2941 ms);
//  3. istante d'inizio dei video registrato in onstart, dopo il primo fotogramma (gioco 176 ms, webcam 388 ms dopo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMetrics, sessionCounters } from '../src/natpf/diag/diag_metrics.js';
import { videoStart, viewerHtml } from '../src/natpf/diag/diag_viewer.js';
import { DiagRecorder } from '../src/natpf/diag/diag_recorder.js';

test('C8: tempo dei colpi del telefono dal tempo del colpo vero (racchetta.tempoMs di chi gioca qui), non dal tentativo', () => {
  const events = [
    { t: 100, k: 'tentativo', tauMs: 43.8, colpito: true }, { t: 101, k: 'racchetta', chi: 'player', tempoMs: 233 },
    { t: 200, k: 'tentativo', tauMs: 140, colpito: true }, { t: 201, k: 'racchetta', chi: 'player', tempoMs: 118 },
    { t: 300, k: 'tentativo', tauMs: 60, colpito: true }, { t: 301, k: 'racchetta', chi: 'player', tempoMs: 91 },
    { t: 400, k: 'racchetta', chi: 'p2', tempoMs: -300 },     // colpi del P2: non sono di chi gioca qui
    { t: 500, k: 'punto', vince: 'player' },
  ];
  const m = computeMetrics(events);
  assert.equal(m.colpi.tempoTelefonoMs.n, 3);
  assert.equal(m.colpi.tempoTelefonoMs.p50, 118);
  assert.equal(m.colpi.tempoTelefonoFonte, 'racchetta');
  // registrazioni vecchie senza «racchetta»: come prima, con la fonte dichiarata
  const old = computeMetrics(events.filter(e => e.k !== 'racchetta'));
  assert.equal(old.colpi.tempoTelefonoMs.p50, 60);
  assert.equal(old.colpi.tempoTelefonoFonte, 'tentativo');
});

test('C8: contatori del collegamento contati nella sola sessione, anche quando il collegamento riparte', () => {
  assert.deepEqual(sessionCounters([{ fast: 58, reliable: 41, dup: 297 }, { fast: 60, reliable: 41, dup: 300 }, { fast: 65, reliable: 43, dup: 310 }]), { fast: 7, reliable: 2, dup: 13 });
  // collegamento nuovo a metà (i contatori ripartono da zero): vale il valore intero
  assert.deepEqual(sessionCounters([{ fast: 58, reliable: 41, dup: 297 }, { fast: 61, reliable: 41, dup: 297 }, { fast: 2, reliable: 1, dup: 0 }, { fast: 4, reliable: 1, dup: 1 }]), { fast: 7, reliable: 1, dup: 1 });
  assert.equal(sessionCounters([]), null);
  const links = [
    { t: 1029.3, k: 'tel.link', copie: { fast: 58, reliable: 41, dup: 297 }, hz: { rs: 6 }, gap: { rs: 2941 } },
    { t: 2029, k: 'tel.link', copie: { fast: 60, reliable: 41, dup: 299 }, hz: { rs: 60 }, gap: { rs: 40 } },
    { t: 3029, k: 'tel.link', copie: { fast: 64, reliable: 42, dup: 305 }, hz: { rs: 60 }, gap: { rs: 120 } },
  ];
  const raw = [0, 16, 33, 50, 260, 276, 292].map((t, i) => ({ t: 1100 + t, k: 5000 + i*16, q: i }));
  const T = computeMetrics(links, { raw }).telefono;
  assert.deepEqual(T.colpi.primoPercorso, { fast: 6, reliable: 1, dup: 8 }, 'prima: l\'ultimo valore cumulativo {64, 42, 305}');
  // il buco del primo riassunto è nato prima della registrazione: non conta
  assert.equal(T.collegamento.sensoriBuco.max, 120);
  assert.equal(T.collegamento.secondiConBuchiOltre100ms, 1);
  // buchi negli arrivi dei campioni sul computer, nella sola sessione
  assert.deepEqual(T.collegamento.sensoriArrivi, { maxMs: 210, oltre100ms: 1, p99Ms: 210 });
});

test('C8: inizio dei video dalla fine e dalla durata vera del file, poi dall\'istante prima dell\'avvio', () => {
  const ev = [
    { t: 233.4, k: 'video', file: 'video-gioco.webm', stato: 'inizio', richiesto: 52.1 },
    { t: 1171.4, k: 'video', file: 'video-webcam.webm', stato: 'inizio' },
    { t: 114115.8, k: 'video', file: 'video-gioco.webm', stato: 'fine', durataS: 113.9 },
    { t: 56817.7, k: 'video', file: 'video-webcam.webm', stato: 'fine', durataS: 55.6 },
  ];
  // sessione 142438: gioco fine 114115,8 − 114,059 s ≈ 57 ms; webcam 56817,7 − 56,034 s ≈ 784 ms (primo fotogramma a 796)
  assert.ok(Math.abs(videoStart(ev, 'video-gioco.webm', 114.059) - 56.8) < .1);
  assert.ok(Math.abs(videoStart(ev, 'video-webcam.webm', 56.034) - 783.7) < .1);
  // durata non nota: l'istante prima di rec.start(); registrazioni vecchie: «inizio» come prima
  assert.equal(videoStart(ev, 'video-gioco.webm'), 52.1);
  assert.equal(videoStart(ev, 'video-webcam.webm', NaN), 1171.4);
  assert.equal(videoStart(ev, 'altro.webm'), 0);
  // la pagina del rapporto usa la stessa funzione
  const html = viewerHtml({ events: ev, videos: [{ file: 'video-gioco.webm' }] });
  assert.match(html, /const videoStart = function videoStart\(/);
  assert.match(html, /durationchange/);
});

test('C8: il registratore annota l\'istante subito prima di avviare il video («richiesto»), prima di onstart', async () => {
  const realMR = globalThis.MediaRecorder;
  let rec = null;
  globalThis.MediaRecorder = class { static isTypeSupported(){ return true; } constructor(){ rec = this; this.state = 'inactive'; } start(){ this.state = 'recording'; this.started = clock; } stop(){} };
  let clock = 1000;
  const logs = [];
  const self = Object.create(DiagRecorder.prototype);
  Object.assign(self, { now: () => clock, t0: 900, id: 's', videos: [], store: { append: async () => {} }, active: true, log: (k, d) => logs.push({ t: self.t, k, ...d }), warn(){} });
  try {
    self._record('gioco', { getVideoTracks: () => [{ getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }) }], getTracks: () => [] }, 2e6);
    assert.equal(rec.started, 1000);
    clock = 1176;                                    // onstart arriva dopo il primo fotogramma registrato
    rec.onstart();
    const v = logs.find(l => l.k === 'video' && l.stato === 'inizio');
    assert.equal(v.t, 276);
    assert.equal(v.richiesto, 100, 'istante prima di rec.start(), sullo stesso orologio del registro');
  } finally { globalThis.MediaRecorder = realMR; }
});
