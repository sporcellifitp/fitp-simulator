// B16 (08/11/2026) · decisione (d) dell'utente sulla mira più sensibile del B15 («ok ma come lo misuro?»): lato delle
// palle per partita nella diagnostica (diag_metrics.sideBalance): quota a sinistra · centro · destra nel riferimento di
// chi gioca, |mediana x| per blocchi di 20 colpi, verdetto con la soglia del 70 % su almeno 20 colpi; nel riassunto, nel
// rapporto, nel LEGGIMI e in scripts/audit/lato-palle.mjs. Il banco (scripts/audit/colpi.mjs --mode=lato) dice quante
// partite sbilanciate aspettarsi con le tre sensibilità (natpf-mira-sensibilita.test.mjs: l'opzione).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sideBalance, sideJudge, sideLines, computeMetrics, summaryLines, SIDE } from '../src/natpf/diag/diag_metrics.js';
import { viewerHtml, readmeText } from '../src/natpf/diag/diag_viewer.js';
import { zipBlob } from '../src/natpf/diag/diag_zip.js';
import { memoryStore } from '../src/natpf/diag/diag_store.js';
import { DiagRecorder } from '../src/natpf/diag/diag_recorder.js';
import { lato } from '../scripts/audit/colpi.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- lato delle palle per partita ----
const shot = (t, chi, x, extra = {}) => ({ t, k: 'racchetta', chi, x, z: chi === 'p2' ? 9 : -9, mano: 'right', fonte: 'natpf-phone', miraPiena: 17, ...extra });
const series = (t0, chi, xs, extra) => xs.map((x, i) => shot(t0 + i*1000, chi, x, extra));
const xsOf = (right, left, centre = 0) => [...Array(right).fill(2), ...Array(left).fill(-2), ...Array(centre).fill(.3)];

test('verdetto: almeno il 70 % in una metà del campo su almeno 20 colpi; centro entro 1 m; blocchi di 20 colpi', () => {
  assert.deepEqual({ ...SIDE }, { center: 1, share: .7, min: 20, block: 20, minBlock: 10, alert: .2 });
  const a = sideJudge(xsOf(14, 6), { hand: 'right' });
  assert.equal(a.verdetto, 'sbilanciata'); assert.equal(a.lato, 'destra'); assert.equal(a.latoColpo, 'dritto'); assert.equal(a.quotaPercento, 70);
  assert.equal(a.testo, 'sbilanciata a destra (dalla parte del dritto): 70 % dei colpi da quella parte');
  const b = sideJudge([...xsOf(13, 6), .4], { hand: 'right' });   // 14 su 20 a destra del centro, 13 oltre 1 m
  assert.equal(b.verdetto, 'sbilanciata'); assert.equal(b.destraPercento, 65); assert.equal(b.centroPercento, 5); assert.equal(b.metaDestraPercento, 70);
  const c = sideJudge(xsOf(13, 7), { hand: 'right' });
  assert.equal(c.verdetto, 'equilibrata'); assert.equal(c.testo, 'equilibrata: 35 % dei colpi a sinistra del centro, 65 % a destra');
  const d = sideJudge(xsOf(19, 0), { hand: 'right' });
  assert.equal(d.verdetto, 'pochi colpi'); assert.match(d.testo, /19, ne servono 20/);
  // mancino: la sua destra è la parte del rovescio; la sua sinistra quella del dritto
  assert.equal(sideJudge(xsOf(15, 5), { hand: 'left' }).latoColpo, 'rovescio');
  assert.equal(sideJudge(xsOf(5, 15), { hand: 'left' }).testo, 'sbilanciata a sinistra (dalla parte del dritto): 75 % dei colpi da quella parte');
  // blocchi: 1–20, 21–40, e l'ultimo solo se ha almeno 10 colpi
  const xs = [...Array(20).fill(2.5), ...Array(20).fill(-1.5), ...Array(12).fill(.5), ...Array(5).fill(3)];
  assert.deepEqual(sideJudge(xs).blocchi, [{ colpi: '1–20', mediana: 2.5 }, { colpi: '21–40', mediana: 1.5 }, { colpi: '41–57', mediana: .5 }]);
  assert.deepEqual(sideJudge([...Array(45).fill(1.2)]).blocchi.map(b => b.colpi), ['1–20', '21–40']);
  assert.deepEqual(sideJudge([...Array(12).fill(1.2)]).blocchi.map(b => b.colpi), ['1–12']);
});

test('partita per partita: P2 nel suo riferimento, mancino a specchio, fuori allenamento, minigiochi, webcam e servizi', () => {
  const ev = [
    // riscaldamento prima della partita: non conta
    ...series(0, 'player', Array(30).fill(3), { allenamento: true }),
    { t: 40000, k: 'partita', n: 1, modo: 'cpu', mano: 'right', miraPiena: 17 },
    ...series(41000, 'player', xsOf(14, 8, 2)),
    shot(70000, 'player', -3, { fonte: 'webcam' }), shot(70500, 'player', -3, { minigioco: true }), { t: 71000, k: 'servizio', chi: 'giocatore', x: -2 },
    { t: 100000, k: 'partita', n: 2, modo: 'split', mano: 'left', mano2: 'right', miraPiena: 20 },
    // P1 mancino, sempre alla sua sinistra; P2 destro: x del campo negativa = alla sua destra
    ...series(101000, 'player', Array(22).fill(-2), { mano: 'left', miraPiena: 20 }),
    ...series(101500, 'p2', [...Array(12).fill(-2), ...Array(10).fill(2)], { miraPiena: 20 }),
    // parte nuova di una registrazione lunga: la partita 2 continua, non è una partita nuova
    { t: 140000, k: 'partita', n: 2, modo: 'split', continua: true, miraPiena: 20 },
    ...series(141000, 'player', Array(3).fill(-2), { mano: 'left', miraPiena: 20 }),
  ].sort((a, b) => a.t - b.t);
  const lp = sideBalance(ev);
  assert.equal(lp.partite.length, 2);
  const [m1, m2] = lp.partite;
  assert.deepEqual(Object.keys(m1.giocatori), ['P1']);
  assert.equal(m1.giocatori.P1.colpi, 24, 'senza riscaldamento, webcam, minigiochi e servizi');
  assert.equal(m1.giocatori.P1.verdetto, 'equilibrata');      // 16 su 24 a destra del centro = 67 %
  assert.equal(m1.giocatori.P1.metaDestraPercento, 67); assert.equal(m1.giocatori.P1.mira, 'alta');
  assert.equal(m2.giocatori.P1.colpi, 25); assert.equal(m2.giocatori.P1.mano, 'left'); assert.equal(m2.giocatori.P1.miraPiena, 20); assert.equal(m2.giocatori.P1.mira, 'media');
  assert.equal(m2.giocatori.P1.testo, 'sbilanciata a sinistra (dalla parte del dritto): 100 % dei colpi da quella parte');
  assert.equal(m2.giocatori.P2.metaDestraPercento, 55, 'P2: x del campo cambiata di segno');
  assert.equal(m2.giocatori.P2.verdetto, 'equilibrata');
  assert.deepEqual(lp.riepilogo, { giudicate: 3, sbilanciate: 1, sbilanciatePercento: 33, perMiraPiena: { 17: { giudicate: 1, sbilanciate: 0 }, 20: { giudicate: 2, sbilanciate: 1 } } });
  // mancino a specchio del destro: gli stessi colpi allo specchio danno lo stesso verdetto, dalla parte del dritto
  const right = sideJudge(xsOf(16, 4), { hand: 'right' }), left = sideJudge(xsOf(4, 16), { hand: 'left' });
  assert.equal(right.quotaPercento, left.quotaPercento); assert.equal(right.latoColpo, left.latoColpo); assert.notEqual(right.lato, left.lato);
  // registrazione partita già iniziata (o pacchetto di prima del B16): colpi senza inizio della partita
  const old = sideBalance(series(0, 'player', xsOf(15, 5), { mano: undefined, miraPiena: undefined, fonte: undefined }), { meta: { gioco: { mano: 'right' } } });
  assert.equal(old.partite[0].senzaInizio, true); assert.equal(old.partite[0].giocatori.P1.mano, 'right'); assert.equal(old.partite[0].giocatori.P1.miraPiena, null);
  assert.deepEqual(old.riepilogo.perMiraPiena, { 'non registrata': { giudicate: 1, sbilanciate: 1 } });
});

test('riassunto, rapporto e LEGGIMI: il lato delle palle per partita con il verdetto e il totale per sensibilità', () => {
  const ev = [{ t: 0, k: 'partita', n: 1, modo: 'cpu', mano: 'right', miraPiena: 17 }, ...series(1000, 'player', xsOf(18, 6, 6))];
  for (let i = 0; i < 4; i++) ev.push({ t: 100000 + i*60000, k: 'partita', n: i + 2, mano: 'right', miraPiena: 17 }, ...series(101000 + i*60000, 'player', xsOf(10, 10, 4)));
  const m = computeMetrics(ev, { meta: { gioco: { mira: 'alta', miraPiena: 17 } } });
  assert.equal(m.latoPalle.partite.length, 5);
  const lines = summaryLines(m).filter(l => l.startsWith('Lato delle palle'));
  assert.equal(lines.length, 6);
  assert.equal(lines[0], 'Lato delle palle · partita 1 · P1 (destro, mira alta 17°): 30 colpi · sinistra 20 % · centro 20 % · destra 60 % · |mediana x| per 20 colpi 2,00 / 0,30 m → sbilanciata a destra (dalla parte del dritto): 80 % dei colpi da quella parte');
  assert.match(lines.at(-1), /^Lato delle palle, in tutto: 1 partite sbilanciate su 5 giudicate \(per giocatore\) · mira alta \(17°\): 1 su 5$/);
  // sei sbilanciate su dieci: il riassunto suggerisce la mira media
  const many = []; for (let i = 0; i < 10; i++) many.push({ t: i*60000, k: 'partita', n: i + 1, miraPiena: 17 }, ...series(i*60000 + 1000, 'player', i < 6 ? xsOf(16, 4) : xsOf(10, 10)));
  assert.match(sideLines(sideBalance(many)).at(-1), /più di una su cinque: prova la mira «media»/);
  const html = viewerHtml({ meta: { id: 'x', inizio: '2026-11-08' }, metrics: m, events: ev });
  assert.match(html, /Lato delle palle per partita \(mira del telefono\)/);
  assert.match(html, /sbilanciata a destra \(dalla parte del dritto\): 80 % dei colpi da quella parte/);
  assert.match(html, /class="warn">sbilanciata/); assert.match(html, /class="okc">equilibrata/);
  assert.match(html, /1 partite sbilanciate su 5 giudicate/);
  assert.doesNotMatch(viewerHtml({ meta: {}, metrics: {}, events: [] }), /Lato delle palle per partita/);
  const readme = readmeText({ id: 'x', inizio: '2026-11-08', gioco: { mira: 'alta', miraPiena: 17 } }, m);
  assert.match(readme, /sensibilità della mira alta \(17°\)/);
  assert.match(readme, /- Lato delle palle · partita 1 · P1/);
  assert.match(readme, /scripts\/audit\/lato-palle\.mjs/);
});

// registratore con un motore finto: esito della racchetta con mano, fonte e sensibilità; inizio della partita
function fakeEngine(){
  const engine = {
    phase: 'TITLE', ball: { pos: { x: 0, y: 1, z: 5 }, vel: { x: 0, y: 0, z: -20 }, inPlay: false, lastHitter: null, bounceCountOnCurrentSide: 0 },
    player: { pos: { x: 0, y: 0, z: 11 } }, score: { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0 }, matchConfig: { difficulty: 'pro' }, matchFormat: { id: 'singles' },
    update(){}, render(){}, _spawnBounceRing(){}, _awardPoint(){}, _attemptPlayerRallyStrike(){ return true; }, _natpfPlanPlayer(){},
    startNewMatch(){ this.phase = 'SERVE_STANCE'; }, _natpfRacketShot(){ return { E: -1.4, N: -10 }; },
    natpfPhone: { grip: 'upright', hand: 'left', connected: true, link: { transport: 'lan-webrtc', L: { state: 'connected' }, on(){ return this; }, send(){}, stats(){ return { rates: {} }; } }, onSwing(){}, onRaw(){}, onCal(){}, onChange(){}, onDiag(){} },
  };
  return engine;
}
test('registratore: «partita» a ogni inizio (modo, mani, sensibilità), «racchetta» con mano, fonte e miraPiena, allenamento segnato', async t => {
  globalThis.requestAnimationFrame ??= cb => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame ??= id => clearTimeout(id);
  let now = 1000;
  const engine = fakeEngine(), store = memoryStore();
  const ui = { controller: 'phone', hand: { hand: 'left' }, training: { active: false }, events: { active: false }, lobby: { mode: 'cpu' } };
  const R = new DiagRecorder({ engine, ui, store, now: () => now, wallNow: () => Date.UTC(2026, 10, 8, 18, 0, 0) });
  const id = await R.start({ webcamVideo: false, gameVideo: false });
  t.after(() => { if (R.active) R.stop(); });
  const out = (extra = {}) => ({ t: .2, excess: 0, q: .9, assisted: false, assist: 0, aim: -.3, x0: 0, clear: 1.2, topspin: 20, failed: false, netFault: false, shot: 'TOPSPIN', grade: 'PERFECT', ...extra });
  const intent = { shot: 'topspin', power: .6, depth: .7, face: -.5 };
  // riscaldamento: colpo segnato come allenamento
  ui.training.active = true; now += 100;
  engine.natpfLastRacket = { who: 'player', at: 1, seq: 1, timing: 0, intent, out: out(), contact: -1, hitX: 0, flight: 1, quality: .9, hand: 'left', source: 'natpf-phone', aimFull: 17 };
  engine._natpfRacketShot();
  ui.training.active = false; now += 100;
  engine.startNewMatch();
  now += 100;
  engine.natpfLastRacket = { ...engine.natpfLastRacket, seq: 2 };
  engine._natpfRacketShot();
  // webcam: niente sensibilità della mira
  engine.natpfLastRacket = { ...engine.natpfLastRacket, seq: null, source: 'webcam', aimFull: null };
  engine._natpfRacketShot();
  now += 100; engine.startNewMatch();
  await R.flush();
  const ev = (await (await store.file(id, 'eventi.jsonl')).text()).trim().split('\n').map(l => JSON.parse(l));
  const ses = ev.find(e => e.k === 'sessione');
  assert.equal(ses.gioco.mira, 'alta'); assert.equal(ses.gioco.miraPiena, 17);
  const [w, a, cam] = ev.filter(e => e.k === 'racchetta');
  assert.equal(w.allenamento, true); assert.equal(a.allenamento, undefined); assert.equal(a.minigioco, undefined);
  assert.equal(a.mano, 'left'); assert.equal(a.fonte, 'natpf-phone'); assert.equal(a.miraPiena, 17); assert.equal(a.x, -1.4);
  assert.equal(cam.fonte, 'webcam'); assert.equal('miraPiena' in cam, false);
  const ps = ev.filter(e => e.k === 'partita');
  assert.deepEqual(ps.map(p => p.n), [1, 2]);
  assert.equal(ps[0].modo, 'cpu'); assert.equal(ps[0].mano, 'left'); assert.equal(ps[0].mira, 'alta'); assert.equal(ps[0].miraPiena, 17); assert.equal(ps[0].formato, 'singles');
  await R.stop();
  const meta = (await store.list()).find(s => s.id === id);
  assert.equal(meta.gioco.miraPiena, 17);
});

test('scripts/audit/lato-palle.mjs: legge zip e cartelle, tiene insieme le parti, stampa per partita e il totale per sensibilità', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lato-palle-'));
  try {
    const jsonl = ev => ev.map(e => JSON.stringify(e)).join('\n') + '\n';
    const pack = async (name, meta, ev) => { const b = zipBlob([{ name: 'sessione.json', data: JSON.stringify(meta) }, { name: 'eventi.jsonl', data: jsonl(ev) }]); fs.writeFileSync(path.join(dir, name), new Uint8Array(await b.arrayBuffer())); };
    // registrazione in due parti (stesso gruppo): la partita 1 continua nella seconda parte
    const g = { gruppo: 'G1', inizio: '2026-11-08T18:00:00Z', build: '2026-11-08.4', gioco: { mira: 'alta', miraPiena: 17 } };
    await pack('p1.zip', { ...g, id: 'G1', parte: 1 }, [{ t: 0, k: 'partita', n: 1, mano: 'right', miraPiena: 17 }, ...series(1000, 'player', xsOf(10, 2))]);
    await pack('p2.zip', { ...g, id: 'G1b', parte: 2 }, [{ t: 50000, k: 'partita', n: 1, continua: true, miraPiena: 17 }, ...series(51000, 'player', xsOf(8, 4))]);
    // un'altra registrazione, estratta in una cartella, con la mira media
    const sub = path.join(dir, 'estratto'); fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, 'sessione.json'), JSON.stringify({ id: 'H1', gruppo: 'H1', gioco: { mira: 'media', miraPiena: 20 } }));
    fs.writeFileSync(path.join(sub, 'eventi.jsonl'), jsonl([{ t: 0, k: 'partita', n: 1, mano: 'left', miraPiena: 20 }, ...series(1000, 'player', xsOf(11, 11), { mano: 'left', miraPiena: 20 })]));
    const run = (...a) => execFileSync(process.execPath, [path.join(ROOT, 'scripts/audit/lato-palle.mjs'), ...a], { encoding: 'utf8', cwd: ROOT });
    const txt = run(path.join(dir, 'p2.zip'), path.join(dir, 'p1.zip'), sub, `--json=${path.join(dir, 'out.json')}`);
    assert.match(txt, /== G1 · 2026-11-08T18:00:00Z · versione 2026-11-08\.4 · parti 1, 2 · sensibilità della mira all'inizio alta \(17°\)/);
    assert.match(txt, /partita 1 · P1 \(destro, mira alta 17°\): 24 colpi · .* → sbilanciata a destra \(dalla parte del dritto\): 75 % dei colpi da quella parte/);
    assert.match(txt, /partita 1 · P1 \(mancino, mira media 20°\): 22 colpi · .* → equilibrata: 50 % dei colpi a sinistra del centro, 50 % a destra/);
    assert.match(txt, /== In tutto \(2 registrazioni, 3 pacchetti\): 1 partite sbilanciate su 2 giudicate/);
    assert.match(txt, /mira alta \(17°\): 1 su 1 = 100 % · poche partite: giocane almeno 5 prima di decidere/);
    assert.match(txt, /mira media \(20°\): 0 su 1 = 0 %/);
    const js = JSON.parse(fs.readFileSync(path.join(dir, 'out.json'), 'utf8'));
    assert.equal(js.registrazioni.length, 2); assert.deepEqual(js.totale.perMiraPiena, { 17: { giudicate: 1, sbilanciate: 1 }, 20: { giudicate: 1, sbilanciate: 0 } });
    // zip compresso di nuovo (non «stored»): spiega di estrarlo
    fs.writeFileSync(path.join(dir, 'rotto.zip'), 'non è uno zip');
    assert.throws(() => run(path.join(dir, 'rotto.zip')), e => /estrailo e passa la cartella/.test(String(e.stderr)));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// banco (persona vera di scripts/audit/colpi.mjs, partite da 40 colpi): con la calibrazione giusta nessuna partita
// sbilanciata con nessuna sensibilità; con il seme della calibrazione sbagliato di 15° la mira media e la bassa lasciano
// le palle meno da una parte (|mediana x| e quota media scendono, le partite sbilanciate non crescono)
test('banco: seme giusto nessuna partita sbilanciata (17°, 20°, 23°); seme sbagliato di ±15° meno da una parte con media e bassa', () => {
  const cases = { giusto: {}, sbagliato: [{ seedErr: 15 }, { seedErr: -15 }] };
  const r = Object.fromEntries([17, 20, 23].map(a => [a, lato({ aimFull: a, runs: 6, cases })]));
  for (const a of [17, 20, 23]) assert.equal(r[a].giusto.sbilanciate, 0, `${a}°: ${JSON.stringify(r[a].giusto)}`);
  assert.ok(r[17].sbagliato.mabs > r[20].sbagliato.mabs && r[20].sbagliato.mabs > r[23].sbagliato.mabs, JSON.stringify(r));
  assert.ok(r[17].sbagliato.quotaMedia > r[20].sbagliato.quotaMedia && r[20].sbagliato.quotaMedia > r[23].sbagliato.quotaMedia, JSON.stringify(r));
  assert.ok(r[20].sbagliato.sbilanciate <= r[17].sbagliato.sbilanciate && r[23].sbagliato.sbilanciate <= r[20].sbagliato.sbilanciate, JSON.stringify(r));
  assert.ok(r[17].sbagliato.sbilanciate > 0, 'il seme sbagliato si vede nel verdetto');
});
