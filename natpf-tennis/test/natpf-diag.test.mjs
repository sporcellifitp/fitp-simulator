// Modalità diagnostica: metriche (riferimento solo dalla prova guidata), zip del pacchetto, magazzino in memoria e
// registratore con un motore finto (eventi, campioni del telefono, scrittura a pezzi, coda piena, arresto, parti
// nuove nelle registrazioni lunghe, spazio su disco), analisi del registro a righe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMetrics, compareMetrics, compareNote, missingInSequence, clockFit, shotDirection, dist } from '../src/natpf/diag/diag_metrics.js';
import { zipBlob, readZip } from '../src/natpf/diag/diag_zip.js';
import { crc32 } from '../src/natpf/diag/diag_crc.js';
import { memoryStore } from '../src/natpf/diag/diag_store.js';
import { DiagRecorder, newSessionId, FREE_VIDEO, FREE_RAW, FREE_STOP } from '../src/natpf/diag/diag_recorder.js';
import { viewerHtml, viewerEvents } from '../src/natpf/diag/diag_viewer.js';
import { createAnalysis, lineSplitter } from '../src/natpf/diag/diag_analysis.js';
import { summaryLines } from '../src/natpf/natpf_diag.js';
import { natpfSwingToEngine } from '../src/natpf/natpf_phone_racket.js';

test('CRC-32 come lo zip, anche a pezzi', () => {
  const b = new TextEncoder().encode('123456789');
  assert.equal(crc32(b), 0xcbf43926);
  assert.equal(crc32(b.subarray(4), crc32(b.subarray(0, 4))), 0xcbf43926);
});

test('zip «stored»: file in memoria e Blob con CRC dato, nomi UTF-8, rilettura con verifica', async () => {
  const video = new Uint8Array(5000).map((_, i) => i*7 & 255);
  const blob = zipBlob([{ name: 'LEGGIMI.txt', data: 'perché sì' }, { name: 'video-webcam.webm', data: new Blob([video]), crc: crc32(video), size: video.length }]);
  const files = readZip(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(new TextDecoder().decode(files.get('LEGGIMI.txt')), 'perché sì');
  assert.deepEqual([...files.get('video-webcam.webm')], [...video]);
  assert.throws(() => zipBlob([{ name: 'x', data: new Blob([video]) }]), /CRC mancante/);
});

test('numeri dei colpi: mancanti in mezzo, pagina ricaricata (si riparte da 1) e doppioni non contano', () => {
  assert.equal(missingInSequence([1, 2, 3, 5, 6, 9]), 3);
  assert.equal(missingInSequence([1, 2, 3, 1, 2, 4]), 1);
  assert.equal(missingInSequence([4, 4, 5]), 0);
});

test('orologio: deriva del telefono stimata dai viaggi più brevi', () => {
  const s = [];
  for (let i = 0; i < 120; i++){ const d = i*1000, rtt = 4 + (i % 5)*6, r = d + rtt; s.push({ d, r, p: 5000 + (d + r)/2*(1 + 50e-6) + (i % 5)*2 }); }
  const f = clockFit(s);
  assert.equal(f.campioni, 120);
  assert.ok(Math.abs(f.derivaPpm - 50) < 3, `deriva ${f.derivaPpm}`);
  assert.equal(f.rtt.p50, 16);
});

test('direzione del colpo dal rimbalzo e dal lato del contatto', () => {
  assert.equal(shotDirection(-2.4, 1), 'incrociato');
  assert.equal(shotDirection(2.4, 1), 'lungolinea');
  assert.equal(shotDirection(0.4, -1), 'centro');
  assert.equal(shotDirection(2, null), null);
});

function sampleEvents(){
  const ev = [{ t: 0, k: 'sessione' }];
  for (let i = 0; i < 20; i++){
    const n = i < 10 ? i + 1 : i + 2;                                                        // un colpo perso (n = 11)
    ev.push({ t: 1000 + i*900, k: 'tel.colpo', n, via: i % 3 ? 'fast' : 'reliable', lato: i % 2 ? 'backhand' : 'forehand', tipo: i === 4 ? 'lob' : 'topspin', rilevamento: 24, attesa: 0, consegna: 2 + (i === 7 ? 80 : 0), totale: 26 });
  }
  ev.push({ t: 2000, k: 'tel.colpo', n: null, scartato: 'palla che si allontana' });
  ev.push({ t: 500, k: 'tel.stato', collegamento: 'connected' }, { t: 9000, k: 'tel.stato', collegamento: 'lost' }, { t: 11000, k: 'tel.stato', collegamento: 'connected' }, { t: 12000, k: 'tel.stato', collegamento: 'connected', visibile: false, schermo: 'non garantito' });
  for (let s = 1; s <= 20; s++) ev.push({ t: s*1000, k: 'prestazioni', fps: s === 5 ? 30 : 60, p50: 16.7, p95: 18, max: s === 5 ? 80 : 20, lunghi: s === 5 ? 2 : 0, upd95: 1.2, ren95: 6 });
  ev.push({ t: 3000, k: 'webcam.evento', tipo: 'lost' }, { t: 4500, k: 'webcam.evento', tipo: 'found' });
  for (let i = 0; i < 60; i++) ev.push({ t: i*33, k: 'webcam.frame', source: i < 50 ? 'hands' : 'flow', hands: i % 10 ? 1 : 2, inferMs: 20 });
  return ev.sort((a, b) => a.t - b.t);
}
test('metriche: colpi persi, scartati, consegna, cadute, pagina nascosta, prestazioni, webcam', () => {
  const raw = []; for (let i = 0; i < 600; i++) if (i !== 300) raw.push({ t: i*16.7, k: i*16.7 + (i > 300 ? 100 : 0), q: i });
  const m = computeMetrics(sampleEvents(), { raw, meta: { controller: 'phone', transport: 'lan-webrtc' } });
  assert.equal(m.telefono.colpi.ricevuti, 21);
  assert.equal(m.telefono.colpi.usati, 20);
  assert.deepEqual(m.telefono.colpi.scartati, { 'palla che si allontana': 1 });
  assert.equal(m.telefono.colpi.mancantiNellaNumerazione, 1);
  assert.equal(m.telefono.tempiMs.consegna.p50, 2);
  assert.equal(m.telefono.tempiMs.consegna.max, 82);
  assert.equal(m.telefono.sensori.persiInRete, 1);
  assert.equal(m.telefono.sensori.buchiOltre50ms, 1);
  assert.equal(m.telefono.collegamento.cadute, 1);
  assert.equal(m.telefono.collegamento.fuoriLineaS, 2);
  assert.equal(m.telefono.collegamento.paginaNascosta, 1);
  assert.equal(m.gioco.fotogrammiLunghi, 2);
  assert.equal(m.gioco.fps.p50, 60);
  assert.equal(m.webcam.perdite, 1); assert.equal(m.webcam.perditeS, 1.5);
  assert.equal(m.webcam.fonte.flow, 10);
  assert.equal(m.riferimento, undefined, 'senza prova guidata nessuna percentuale di colpi giusti');
  assert.ok(summaryLines(m).some(l => /persi in rete 1/.test(l)));
});

test('metriche: precisione solo rispetto al colpo richiesto (prova guidata)', () => {
  const ev = [
    { t: 0, k: 'atteso', lato: 'forehand', colpo: 'topspin' },
    { t: 500, k: 'tel.colpo', lato: 'forehand', tipo: 'topspin' },
    { t: 1500, k: 'tel.colpo', lato: 'forehand', tipo: 'lob' },
    { t: 3000, k: 'atteso', lato: 'backhand', colpo: 'topspin', direzione: 'incrociato' },
    { t: 3500, k: 'tel.colpo', lato: 'forehand', tipo: 'topspin' },
    { t: 3600, k: 'colpo.gioco', chi: 'giocatore', esito: 'hit', direzione: 'centro' },
    { t: 20000, k: 'tel.colpo', lato: 'backhand', tipo: 'topspin' },                             // fuori finestra: niente riferimento
  ];
  const r = computeMetrics(ev).riferimento;
  assert.equal(r.gestiConRiferimento, 3);
  assert.equal(r.latoGiustoPercento, 66.7);
  assert.equal(r.tipoGiustoPercento, 66.7);
  assert.equal(r.direzioneGiustaPercento, 0);
  assert.deepEqual(r.matriceTipo, { 'topspin→topspin': 2, 'topspin→lob': 1 });
});

test('confronto tra sessioni: meglio, peggio, uguale entro il rumore', () => {
  const a = { telefono: { tempiMs: { consegna: { p50: 2, p99: 150, jitter: 30 } }, colpi: { mancantiNellaNumerazione: 2 } }, gioco: { fps: { p5: 55 } } };
  const b = { telefono: { tempiMs: { consegna: { p50: 3, p99: 20, jitter: 4 } }, colpi: { mancantiNellaNumerazione: 0 } }, gioco: { fps: { p5: 50 } } };
  const c = Object.fromEntries(compareMetrics(a, b).map(r => [r.path, r.esito]));
  assert.equal(c['telefono.tempiMs.consegna.p50'], 'uguale');
  assert.equal(c['telefono.tempiMs.consegna.p99'], 'meglio');
  assert.equal(c['telefono.colpi.mancantiNellaNumerazione'], 'meglio');
  assert.equal(c['gioco.fps.p5'], 'peggio');
  assert.equal(c['webcam.perdite'], 'n.d.');
  assert.deepEqual(dist([]), { n: 0 });
});

test('magazzino in memoria: scrittura a pezzi, CRC, metriche, limite', async () => {
  const st = memoryStore();
  await st.open('s1', { startedAt: 1 });
  const enc = new TextEncoder();
  await st.append('s1', 'eventi.jsonl', enc.encode('{"t":0,"k":"sessione"}\n').buffer);
  await st.append('s1', 'eventi.jsonl', enc.encode('{"t":5,"k":"tel.colpo","n":1,"rilevamento":20,"consegna":2}\n{"t":6,"k":"rott').buffer);
  const meta = await st.close('s1', { durationS: 1 });
  assert.equal(meta.ended, true);
  const text = await (await st.file('s1', 'eventi.jsonl')).text();
  assert.equal(meta.files['eventi.jsonl'].crc, crc32(enc.encode(text)));
  const m = await st.metrics('s1');
  assert.equal(m.telefono.colpi.ricevuti, 1, 'la riga troncata alla fine si salta');
  await st.remove('s1'); assert.deepEqual(await st.list(), []);
});

// motore finto con le parti che il registratore aggancia
function fakeWorld(){
  const swing = new Set(), raw = new Set(), cal = new Set(), change = new Set(), mcl = { swing: [], toss: [] };
  const engine = {
    phase: 'SERVE_STANCE', ball: { pos: { x: 0, y: 1, z: 5 }, vel: { x: 0, y: 0, z: -20 }, inPlay: false, lastHitter: null, bounceCountOnCurrentSide: 0 },
    player: { pos: { x: 0, y: 0, z: 11 } }, score: { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0 }, matchConfig: { difficulty: 'pro' },
    updates: 0, update(){ this.updates++; }, render(){}, _spawnBounceRing(){}, _awardPoint(w){ this.score[w === 'player' ? 'playerPoints' : 'opponentPoints']++; }, _attemptPlayerRallyStrike(){ return true; },
    natpfSkill: { lastShot: { landingX: -2.6, landingZ: -9 } },
    motionController: { on(k, f){ mcl[k].push(f); }, emit(k, v){ for (const f of mcl[k]) f(v); } },
    natpfPhone: { grip: 'upright', connected: true, diagStream: false, sent: [],
      link: { transport: 'lan-webrtc', L: { state: 'connected', phone: 'ready', rtt: 3, hz: 60 }, on(){ return this; }, send(m){ engine.natpfPhone.sent.push(m); }, stats(){ return { swings: { fast: 1, reliable: 0, dup: 2 }, rates: { fo: { hz: 60 } }, rtt: 3 }; } },
      onSwing(f){ swing.add(f); }, onRaw(f){ raw.add(f); }, onCal(f){ cal.add(f); }, onChange(f){ change.add(f); } },
  };
  return { engine, emitSwing: (ev, s) => { for (const f of swing) f(ev, s); }, emitRaw: k => { for (const f of raw) f(k); } };
}
const flushTimers = () => new Promise(r => setTimeout(r, 0));
test('registratore: eventi del motore e del telefono, campioni a parte, scrittura a pezzi e arresto', async t => {
  globalThis.requestAnimationFrame ??= cb => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame ??= id => clearTimeout(id);
  let now = 1000;
  const { engine, emitSwing, emitRaw } = fakeWorld(), store = memoryStore();
  const ui = { controller: 'phone', hand: { hand: 'right' }, training: { active: false } };
  const R = new DiagRecorder({ engine, ui, store, now: () => now, wallNow: () => Date.UTC(2026, 9, 21, 10, 0, 0) });
  const id = await R.start({ webcamVideo: false, gameVideo: false });
  t.after(() => { if (R.active) R.stop(); });
  assert.match(id, /^20261021-\d{6}-[a-z0-9]{4}$/);
  assert.equal(engine.natpfPhone.diagStream, true);
  assert.deepEqual(engine.natpfPhone.sent.at(-1), { t: 'cfg', prep: 1, mo: 1, diag: 1 });
  now += 100; engine.phase = 'RALLY'; engine.ball.inPlay = true; engine.update(1/60);
  engine.ball.lastHitter = 'opponent'; now += 16; engine.update(1/60);
  engine._spawnBounceRing(1.2, 6.5);
  engine.motionController.emit('swing', { source: 'phone', side: 'forehand', shotType: 'topspin', speed: 1.2 });
  emitSwing({ side: 'forehand', natpf: { shot: 'topspin', wrist: .1, why: ['colpo normale'], intent: { shot: 'topspin', power: .71234, depth: .6, reach: .9, face: .1, conf: .5 } } },
    { seq: 7, path: 'fast', at: (now - 30)/1000, receivedAt: now/1000, detectMs: 24, holdMs: 0, sampleHz: 60, angle: 84.26, shape: { plane: .912, rise: .3333, roll: 0, tilt: .1, head: 14.2, hand: 3.1 } });
  R.onFeedback({ kind: 'hit', grade: 'PERFECT • TOPSPIN' }, { label: 'Ottimo' });
  engine._awardPoint('player', 'Out');
  for (let i = 0; i < 5; i++) emitRaw({ t: 5000 + i*16, q: i, rot: [1, 2, 3], acc: [0, 0, 0], accG: [0, 9.8, 0], path: 'fast' });
  await R.flush();
  const ev = (await (await store.file(id, 'eventi.jsonl')).text()).trim().split('\n').map(l => JSON.parse(l));
  const kinds = ev.map(e => e.k);
  for (const k of ['sessione', 'tel.stato', 'fase', 'palla', 'colpo.gioco', 'rimbalzo', 'input', 'tel.colpo', 'punto']) assert.ok(kinds.includes(k), k);
  const sw = ev.find(e => e.k === 'tel.colpo');
  assert.equal(sw.n, 7); assert.equal(sw.via, 'fast'); assert.equal(sw.picco, 86); assert.equal(sw.consegna, 6);
  // racchetta virtuale: forma del colpo dal telefono e intenzione ricavata dal computer
  assert.deepEqual(sw.forma, { piano: .912, salita: .333, polso: 0, manico: .1, testa: 14.2, mano: 3.1 }); assert.equal(sw.ampiezza, 84.3);
  assert.deepEqual(sw.intenzione, { tipo: 'topspin', conf: .5, forza: .712, portata: .9, profondita: .6, piatto: .1, abituale: null });
  const fb = ev.find(e => e.k === 'colpo.gioco' && e.chi === 'giocatore');
  assert.equal(fb.direzione, 'incrociato'); assert.equal(fb.lato, 'forehand');
  assert.ok(ev.find(e => e.k === 'colpo.gioco' && e.chi === 'cpu'));
  const raw = (await (await store.file(id, 'telefono-sensori.jsonl')).text()).trim().split('\n');
  assert.equal(raw.length, 5);
  // coda piena: i campioni del telefono di questo giro si saltano e lo si annota
  Object.defineProperty(store, 'backlog', { get: () => 64*1024*1024, configurable: true });
  emitRaw({ t: 9000, q: 99 }); await R.flush();
  assert.equal(R.counts.persi, 1);
  Object.defineProperty(store, 'backlog', { get: () => 0, configurable: true });
  now += 5000;
  const res = await R.stop();
  assert.equal(res.meta.ended, true);
  assert.equal(engine.natpfPhone.diagStream, false);
  assert.deepEqual(engine.natpfPhone.sent.at(-1), { t: 'cfg', prep: 1, mo: 1, diag: 0 });
  const last = (await (await store.file(id, 'eventi.jsonl')).text()).trim().split('\n').map(l => JSON.parse(l));
  assert.ok(last.some(e => e.k === 'avviso' && e.codice === 'coda'));
  assert.equal(last.at(-1).k, 'sessione.fine');
  // agganci spenti fuori dalla registrazione: niente eventi
  const before = R.counts.eventi; engine.update(1/60); engine._awardPoint('player', 'Net'); assert.equal(R.counts.eventi, before);
  await flushTimers();
});

test('registratore (racchetta virtuale): forma e intenzione del gesto, esito deterministico legato al colpo del telefono', async t => {
  globalThis.requestAnimationFrame ??= cb => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame ??= id => clearTimeout(id);
  let now = 1000;
  const { engine, emitSwing } = fakeWorld(), store = memoryStore();
  engine._natpfRacketShot = () => ({ E: 1.2, N: -10.4 });   // colpo della racchetta nel motore (esito: natpfLastRacket)
  const ui = { controller: 'phone', hand: { hand: 'right' }, training: { active: false } };
  const R = new DiagRecorder({ engine, ui, store, now: () => now, wallNow: () => Date.UTC(2026, 9, 22, 10, 0, 0) });
  const id = await R.start({ webcamVideo: false, gameVideo: false });
  t.after(() => { if (R.active) R.stop(); });
  const intent = { shot: 'lob', conf: .4, power: .55, reach: .9, depth: .6, face: .2, rise: .72, plane: .31, riseRef: -.18, why: ['la testa sale decisa (0.72, abituale -0.18)'] };
  emitSwing({ side: 'forehand', natpf: { shot: 'lob', intent, seq: 12 } }, { seq: 12, at: (now - 30)/1000, receivedAt: now/1000, peak: 980, angle: 110, shape: { plane: .31, rise: .72, roll: -.1, tilt: .5, head: 9.3, hand: 2.1, from: 210 } });
  engine.natpfLastRacket = { who: 'player', at: 3.5, seq: 12, timing: .08, intent, contact: 1, quality: .93, volley: false, out: { t: .42, excess: 0, q: .9, assisted: true, failed: false, netFault: false, shot: 'LOB', x: -1.2, depth: 10.4, grade: 'PERFECT' } };
  engine._natpfRacketShot();
  R.onFeedback({ kind: 'hit', grade: 'PERFECT • LOB' }, { label: 'Ottimo' });
  R.onFeedback({ kind: 'whiff', grade: 'WHIFF' }, null);
  // un telefono di prima: niente forma né intenzione
  emitSwing({ side: 'backhand', natpf: { shot: 'topspin' } }, { seq: 13, at: (now - 20)/1000, receivedAt: now/1000 });
  await R.flush();
  const ev = (await (await store.file(id, 'eventi.jsonl')).text()).trim().split('\n').map(l => JSON.parse(l));
  const [sw, old] = ev.filter(e => e.k === 'tel.colpo');
  assert.equal(sw.pk, 980); assert.equal(sw.ampiezza, 110);
  assert.deepEqual(sw.forma, { piano: .31, salita: .72, polso: -.1, manico: .5, testa: 9.3, mano: 2.1 });
  assert.deepEqual(sw.intenzione, { tipo: 'lob', conf: .4, forza: .55, portata: .9, profondita: .6, piatto: .2, abituale: -.18 });
  assert.equal(old.forma, null); assert.equal(old.intenzione, null);
  // un solo esito della racchetta: l'evento «racchetta» dal motore, legato al gesto con il numero del colpo; colpo.gioco
  // dice solo il risultato a schermo (prima vi si ripeteva l'esito)
  const rk = ev.filter(e => e.k === 'racchetta');
  assert.equal(rk.length, 1);
  assert.equal(rk[0].n, 12); assert.equal(rk[0].tempo, .42); assert.equal(rk[0].oltre, 0); assert.equal(rk[0].voluto, 'lob'); assert.equal(rk[0].colpo, 'LOB');
  assert.equal(rk[0].x, 1.2); assert.equal(rk[0].z, -10.4); assert.equal(rk[0].assistito, true);
  for (const c of ev.filter(e => e.k === 'colpo.gioco' && e.chi === 'giocatore')) assert.equal(c.racchetta, undefined);
  await R.stop(); await flushTimers();
});

test('metriche (racchetta virtuale): esito nella finestra, direzione voluta con il tempo, ripetibilità per colpo richiesto', () => {
  const ev = [{ t: 0, k: 'atteso', prova: 'diag-fh-cross', lato: 'forehand', colpo: 'normale', direzione: 'incrociato', finestraMs: 4000 }];
  // quattro dritti incrociati richiesti: tre in anticipo (incrociati con il tempo), uno in ritardo; gesti simili
  const T = [.4, .35, .5, -.3], X = [-2.1, -2.0, -2.4, 1.6];
  T.forEach((tempo, i) => {
    ev.push({ t: 100 + i*900, k: 'tel.colpo', n: i + 1, lato: 'forehand', tipo: 'topspin', forma: { salita: .3 + i*.02, piano: .95 }, intenzione: { tipo: 'topspin', forza: .6 + i*.01 } });
    ev.push({ t: 300 + i*900, k: 'racchetta', chi: 'player', n: i + 1, voluto: 'topspin', colpo: 'TOPSPIN', tempo, oltre: 0, qualita: .9, x: X[i], z: -(10 + i*.1), assistito: true, volee: false });
    ev.push({ t: 400 + i*900, k: 'colpo.gioco', chi: 'giocatore', esito: 'hit', direzione: X[i] < -1 ? 'incrociato' : 'lungolinea' });
  });
  // fuori dalla prova: un colpo oltre la finestra, fallito
  ev.push({ t: 9000, k: 'racchetta', chi: 'player', n: 9, voluto: 'topspin', colpo: 'TOPSPIN', tempo: 1.3, oltre: .3, qualita: .4, fallito: true, rete: false, x: 3, z: -12.8 });
  const m = computeMetrics(ev);
  assert.equal(m.racchetta.colpi, 5); assert.equal(m.racchetta.oltreLaFinestraPercento, 20); assert.deepEqual(m.racchetta.falliti, { lungo: 1 });
  assert.equal(m.racchetta.assistiti, 4); assert.equal(m.colpi.racchetta, undefined);
  assert.equal(m.riferimento.direzioneGiustaPercento, 75); assert.equal(m.riferimento.direzioneDalTempoPercento, 75);
  assert.equal(m.telefono.forma.colpi, 4); assert.deepEqual(m.telefono.intenzione, { topspin: 4 });
  assert.deepEqual(m.ripetibilita.gruppi['diag-fh-cross'], { colpi: 4, conEsito: 4, tipo: 'topspin', tipoUgualePercento: 100, salita: .06, forza: .03, tempo: .8, x: 4, profondita: .3 });
  const lines = summaryLines(m).join('\n');
  assert.match(lines, /Esiti della racchetta: 5 colpi .* tempo nella finestra mediana \+40% \(\+ anticipo\) · oltre la finestra 20%/);
  assert.match(lines, /voluta con il tempo 75%/); assert.match(lines, /Ripetibilità diag-fh-cross: 4 colpi, tipo «topspin» nel 100%/);
  // senza prova guidata i gruppi sono lato e tipo letti; senza forma né intenzione (telefono di prima) i gruppi partono
  // dagli esiti della racchetta: niente variazione del gesto, la stessa variazione dell'esito
  assert.ok(computeMetrics(ev.filter(e => e.k !== 'atteso')).ripetibilita.gruppi['forehand/topspin']);
  assert.deepEqual(computeMetrics(ev.map(e => ({ ...e, forma: undefined, intenzione: undefined }))).ripetibilita.gruppi['diag-fh-cross'],
    { colpi: 4, conEsito: 4, tipo: 'topspin', tipoUgualePercento: 100, salita: null, forza: null, tempo: .8, x: 4, profondita: .3 });
  // senza gesti né esiti della racchetta, niente ripetibilità
  assert.equal(computeMetrics(ev.filter(e => e.k !== 'tel.colpo' && e.k !== 'racchetta')).ripetibilita, undefined);
});

test('rapporto: dati nella pagina senza chiudere lo script, palla diradata', () => {
  const events = [{ t: 0, k: 'sessione' }, { t: 1, k: 'avviso', testo: '</script><b>' }];
  for (let i = 0; i < 40; i++) events.push({ t: 2 + i, k: 'palla', p: [0, 1, i] });
  const html = viewerHtml({ meta: { id: 'x' }, metrics: {}, events, videos: [{ file: 'video-webcam.webm' }] });
  assert.ok(!html.includes('</script><b>'));
  const data = JSON.parse(html.split('<script type="application/json" id="dati">')[1].split('</script>')[0]);
  assert.equal(data.events.filter(e => e.k === 'palla').length, 10);
  assert.equal(newSessionId(new Date(Date.UTC(2026, 0, 2, 3, 4, 5))).slice(0, 15), '20260102-030405');
});

test('ritardo dello schermo: si somma alla latenza del colpo del telefono (0 = come prima), con i limiti', () => {
  const s = { at: 10, power: .7, lift: 0, dir: 1, aim: 0, confidence: .8 };
  assert.equal(natpfSwingToEngine(s, { now: 10.05 }).natpf.latency, .05);
  assert.ok(Math.abs(natpfSwingToEngine(s, { now: 10.05, displayLag: .08 }).natpf.latency - .13) < 1e-9);
  assert.equal(natpfSwingToEngine(s, { now: 10.2, displayLag: .5 }).natpf.latency, .3);
  const m = { colpi: { tempoTelefonoMs: { n: 30, p50: -85 } } };
  assert.ok(summaryLines(m).some(l => /85 ms in ritardo/.test(l)));
});

test('analisi a righe (worker): stesse metriche del registro letto tutto insieme, eventi del rapporto già pronti', () => {
  const events = sampleEvents();
  for (let i = 0; i < 400; i++) events.push({ t: 20000 + i*16, k: 'palla', p: [0, 1, i/10], v: [0, 0, -20] }, { t: 20000 + i*16 + 1, k: 'video.frame', file: 'webcam', mt: i/30 });
  events.push({ t: 27000, k: 'atteso', lato: 'forehand', colpo: 'normale', finestraMs: 4000 }, { t: 27400, k: 'tel.colpo', n: 30, lato: 'forehand', tipo: 'topspin', rilevamento: 24, consegna: 3, totale: 27 });
  const raw = []; for (let i = 0; i < 500; i++) if (i !== 200) raw.push({ t: i*16.7, k: i*16.7, q: i, r: [1, 2, 3], a: [0, 0, 0], g: [0, 9.8, 0], via: 'fast' });
  const meta = { controller: 'phone', transport: 'lan-webrtc' };
  const whole = computeMetrics(events, { raw, meta });
  // il testo arriva a pezzi di lunghezza qualsiasi, l'ultima riga troncata (chiusura improvvisa)
  const a = createAnalysis({ viewer: true });
  const feed = (rows, fn, cut) => { const text = rows.map(o => JSON.stringify(o)).join('\n') + '\n{"t":99999,"k":"tron', sp = lineSplitter(fn); for (let i = 0; i < text.length; i += cut) sp.push(text.slice(i, i + cut)); sp.end(); };
  feed(events, e => a.event(e), 37); feed(raw, k => a.raw(k), 101);
  const { metrics, eventsJson } = a.result(meta);
  assert.deepEqual(metrics, whole);
  assert.equal(eventsJson, JSON.stringify(viewerEvents(events)));
  assert.equal(metrics.registrazione.eventi, events.length);
});

test('registratore: registrazione lunga in parti collegate, stesso orologio, nessun evento o campione perso al cambio', async t => {
  globalThis.requestAnimationFrame ??= cb => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame ??= id => clearTimeout(id);
  let now = 1000;
  const { engine, emitRaw } = fakeWorld(), store = memoryStore();
  const R = new DiagRecorder({ engine, ui: { controller: 'phone', training: { active: false } }, store, now: () => now, wallNow: () => Date.UTC(2026, 9, 21, 10, 0, 0) + now });
  R.rotateMs = 1000;
  const first = await R.start({ webcamVideo: false, gameVideo: false });
  t.after(() => { if (R.active) R.stop(); });
  let q = 0;
  const step = () => { now += 100; emitRaw({ t: now, q: q++, rot: [1, 2, 3] }); engine._awardPoint('player', 'Out'); };
  for (let i = 0; i < 5; i++) step();
  await R.flush();
  for (let i = 0; i < 6; i++) step();
  R._second();                                         // oltre 1 s: parte nuova
  const rotation = R._rotation;
  assert.ok(rotation, 'parte nuova avviata');
  step();                                              // durante il cambio: finisce in una delle due parti, una volta
  await rotation;
  for (let i = 0; i < 4; i++) step();
  const res = await R.stop();
  assert.equal(res.parts, 2); assert.equal(res.gruppo, first);
  const list = await store.list(), p1 = list.find(s => s.id === first), p2 = list.find(s => s.id === res.id);
  assert.ok(p1.ended && p2.ended);
  assert.equal(p1.prossima, p2.id); assert.equal(p2.precedente, p1.id); assert.equal(p2.parte, 2); assert.equal(p2.gruppo, first);
  const lines = async (id, f) => (await (await store.file(id, f)).text()).trim().split('\n').map(l => JSON.parse(l));
  const e1 = await lines(first, 'eventi.jsonl'), e2 = await lines(res.id, 'eventi.jsonl');
  assert.equal(e1.at(-1).k, 'sessione.fine'); assert.equal(e1.at(-1).prossima, res.id);
  assert.equal(e2[0].k, 'sessione'); assert.equal(e2[0].parte, 2);
  assert.ok(e2[0].t >= e1.at(-1).t, 'stesso orologio, la seconda parte continua da dove finisce la prima');
  for (const e of [e1, e2]) assert.ok(e.every((x, i) => !i || x.t >= e[i - 1].t), 'eventi in ordine');
  // ogni punto registrato una volta sola, nell'una o nell'altra parte
  assert.equal(e1.filter(e => e.k === 'punto').length + e2.filter(e => e.k === 'punto').length, 16);
  assert.equal(e1.length + e2.length, R.counts.eventi);
  assert.equal(p1.counts.eventi, e1.length); assert.equal(p2.counts.eventi, e2.length);
  // campioni del telefono: numerazione continua tra le due parti
  const qs = [...await lines(first, 'telefono-sensori.jsonl'), ...await lines(res.id, 'telefono-sensori.jsonl')].map(k => k.q);
  assert.deepEqual(qs, [...Array(16).keys()]);
  await flushTimers();
});

test('registratore: spazio su disco quasi finito → video fermati, poi campioni, poi chiusura; niente si cancella', async t => {
  globalThis.requestAnimationFrame ??= cb => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame ??= id => clearTimeout(id);
  let free = 5000*1024*1024;
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { storage: { estimate: async () => ({ quota: 8e10, usage: 8e10 - free }) } }, configurable: true, writable: true });
  t.after(() => { if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete globalThis.navigator; });
  let now = 1000;
  const { engine } = fakeWorld(), store = memoryStore(); store.kind = 'disk';      // il controllo vale per il disco
  const R = new DiagRecorder({ engine, ui: { controller: 'phone', training: { active: false } }, store, now: () => now, wallNow: () => Date.UTC(2026, 9, 21, 10, 0, 0) });
  const notices = []; R.notify = n => notices.push(n);
  let autoStopped = false; R.autoStop = async () => { autoStopped = true; await R.stop(); };
  const id = await R.start({ webcamVideo: false, gameVideo: false });
  const video = { kind: 'webcam', info: { file: 'video-webcam.webm', byte: 0 }, stopped: false, stop(){ this.stopped = true; }, done: Promise.resolve() };
  R.videos.push(video);
  await R._checkSpace();
  assert.ok(!video.stopped && R.phoneSamples, 'spazio sufficiente: tutto continua');
  free = FREE_VIDEO - 1;
  await R._checkSpace();
  assert.ok(video.stopped); assert.equal(R.videoOff, 'spazio'); assert.ok(R.phoneSamples); assert.ok(R.active);
  free = FREE_RAW - 1;
  await R._checkSpace();
  assert.equal(R.phoneSamples, false); assert.equal(engine.natpfPhone.diagStream, false);
  assert.deepEqual(engine.natpfPhone.sent.at(-1), { t: 'cfg', prep: 1, mo: 1, diag: 0 });
  assert.equal(notices.length, 2);
  now += 2000; free = FREE_STOP - 1;
  await R._checkSpace();
  assert.ok(autoStopped); assert.equal(R.active, false);
  const ev = (await (await store.file(id, 'eventi.jsonl')).text()).trim().split('\n').map(l => JSON.parse(l));
  assert.deepEqual(ev.filter(e => e.k === 'avviso').map(e => e.codice), ['spazio-video', 'spazio-campioni', 'spazio']);
  assert.equal(ev.at(-1).k, 'sessione.fine');
  assert.equal((await store.list()).length, 1, 'nessuna sessione cancellata');
  await flushTimers();
});

test('confronto con video diversi: avviso (il video del gioco pesa sulle prestazioni), nessuno con gli stessi video', () => {
  const m = files => ({ registrazione: { video: files.map(file => ({ file })) } });
  assert.equal(compareNote(m(['video-webcam.webm']), m(['video-webcam.mp4'])), null);
  assert.match(compareNote(m(['video-webcam.webm']), m(['video-webcam.webm', 'video-gioco.webm'])), /prima: webcam; dopo: gioco \+ webcam/);
  assert.match(compareNote(m([]), m(['video-gioco.webm'])), /prima: nessuno/);
});

test('webcam: colpo anticipato e conferma a fine gesto, quanto coincidono (coerenza, non precisione)', () => {
  const ev = [{ t: 0, k: 'sessione' }];
  const pair = (t, side, type, cside, ctype) => ev.push({ t, k: 'webcam.evento', tipo: 'event', side, shotType: type }, { t: t + 600, k: 'webcam.evento', tipo: 'confirm', side: cside, shotType: ctype });
  pair(1000, 'forehand', 'topspin', 'forehand', 'topspin');
  pair(3000, 'backhand', 'topspin', 'backhand', 'slice');
  pair(5000, 'forehand', 'topspin', 'backhand', 'lob');
  ev.push({ t: 7000, k: 'webcam.evento', tipo: 'event', side: 'forehand', shotType: 'topspin' }, { t: 9000, k: 'webcam.evento', tipo: 'confirm', side: 'forehand', shotType: 'topspin' });   // conferma troppo tarda: non conta
  const W = computeMetrics(ev).webcam;
  assert.deepEqual(W.conferme, { n: 3, latoUgualePercento: 66.7, tipoUgualePercento: 33.3 });
  assert.equal(W.eventi, 4);
  assert.ok(summaryLines({ webcam: W }).some(l => /coincide con la conferma/.test(l)));
});
