// B18 (tappa 1 punto 12 dell'audit B16): due misure dalla diagnostica, da raccogliere con persone vere. Variazione del
// gesto (salita della testa rispetto alla propria abituale, piano, forza; colpi normali vicini alla soglia del tagliato o
// sotto quella della schiacciata) e tempo dal rimbalzo al gesto (e dal gesto all'impatto previsto). Stesso calcolo nel
// pannello, nel rapporto (diag_metrics) e nello script scripts/audit/gesto-rimbalzo.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gestureSpread, bounceToGesture, gestureMeasures, gestureMeasureLines, SPREAD } from '../src/natpf/diag/diag_gesture.js';
import { computeMetrics, summaryLines } from '../src/natpf/diag/diag_metrics.js';
import { zipBlob } from '../src/natpf/diag/diag_zip.js';
import { INTENT } from '../src/natpf/natpf_stroke_intent.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// colpo del telefono come lo registra diag_recorder._phoneSwing (solo i campi che servono)
const swing = (t, { salita = .3, piano = .8, forza = .5, abituale = .3, tipo = 'topspin', lato = 'forehand', picco = t - 60, scartato = null } = {}) =>
  ({ t, k: 'tel.colpo', lato, tipo, scartato, picco, forma: { piano, salita }, intenzione: { tipo, forza, abituale } });
// serie di colpi con la salita attorno all'abituale (scarto sd, deterministico)
const series = (t0, n, sd, o = {}) => Array.from({ length: n }, (_, i) => swing(t0 + i*2500, { salita: (o.abituale ?? .3) + sd*Math.sin(i*1.7)*1.4, ...o }));

test('variazione del gesto: stabile o da soglia relativa; colpi vicini alla soglia del tagliato', () => {
  const stable = gestureSpread(series(0, 20, .05));
  assert.equal(stable.dritto.n, 20); assert.ok(stable.dritto.salitaScarto < .1, JSON.stringify(stable)); assert.equal(stable.dritto.verdetto, 'stabile');
  assert.equal(stable.dritto.vicinoTagliatoPercento, 0);
  const wobbly = gestureSpread(series(0, 20, .3, { abituale: 0 }));
  assert.ok(wobbly.dritto.salitaScarto > SPREAD.relative, JSON.stringify(wobbly)); assert.match(wobbly.dritto.verdetto, /soglia relativa/);
  assert.ok(wobbly.dritto.vicinoTagliatoPercento > 0 && wobbly.dritto.sottoSchiacciataPercento > 0);
  // la soglia del tagliato è quella del riconoscimento (sliceRise + min(0, abituale)): un colpo a 0,05 sopra è «vicino»
  const near = gestureSpread([swing(0, { salita: INTENT.sliceRise + .05, abituale: 0, lato: 'backhand' })]);
  assert.equal(near.rovescio.vicinoTagliatoPercento, 100); assert.equal(near.rovescio.verdetto, 'pochi colpi');
  // contano solo i colpi normali non scartati, divisi per lato
  const mix = gestureSpread([...series(0, 12, .05), swing(1, { tipo: 'slice', salita: -.5 }), swing(2, { scartato: 'debole' }), ...series(100, 11, .05, { lato: 'backhand' })]);
  assert.deepEqual([mix.dritto.n, mix.rovescio.n], [12, 11]);
});

test('dal rimbalzo al gesto e dal gesto all\'impatto previsto; solo palle dell\'avversario rimbalzate nella propria metà', () => {
  const ev = [
    { t: 900, k: 'piano', chi: 'giocatore', tipo: 'ground', tc: .55 },          // impatto previsto a 1450 ms
    { t: 1000, k: 'rimbalzo', da: 'opponent', n: 1, x: 1, z: 8 },
    swing(1400, { picco: 1300 }),                                                // 300 ms dopo il rimbalzo, 150 ms prima dell'impatto
    { t: 2000, k: 'rimbalzo', da: 'player', n: 1 },                              // palla di chi gioca: non conta
    swing(2300),
    { t: 4000, k: 'piano', chi: 'giocatore', tipo: 'volley', tc: .4 },
    { t: 4100, k: 'rimbalzo', da: 'opponent', n: 1 }, { t: 4500, k: 'punto', vince: 'opponent' },
    swing(4700),                                                                 // dopo il punto: non conta
    { t: 6000, k: 'rimbalzo', da: 'opponent', n: 1 }, swing(9000),               // oltre 1,5 s: non conta
  ];
  assert.deepEqual(bounceToGesture(ev), [{ dalRimbalzoMs: 300, primaDellImpattoMs: 150, lato: 'dritto' }]);
  const m = gestureMeasures(ev);
  assert.equal(m.rimbalzo.colpi, 1); assert.equal(m.rimbalzo.dalRimbalzoMs.p50, 300); assert.equal(m.rimbalzo.primaDellImpattoMs.p50, 150);
  assert.equal(gestureMeasures([]), null);
});

// Revisione B18: sul computer del Player 2 della sfida tra due computer le palle dell'avversario hanno lastHitter
// 'player' e il piano è quello del P2: prima la misura contava le palle sbagliate (le sue)
test('revisione B18: computer del Player 2 (ruolo dall’evento «partita»): palle del P1 e piano del P2', () => {
  const ev = [
    { t: 0, k: 'partita', n: 1, ruolo: 'p2' },
    { t: 900, k: 'piano', chi: 'p2', tipo: 'ground', tc: .55 },
    { t: 1000, k: 'rimbalzo', da: 'player', n: 1 },                              // palla del P1 nella metà del P2: conta
    swing(1400, { picco: 1300 }),
    { t: 2000, k: 'rimbalzo', da: 'opponent', n: 1 },                            // la sua palla: non conta
    swing(2300),
    { t: 3000, k: 'rimbalzo', da: 'player', n: 1 }, { t: 3100, k: 'colpo.gioco', chi: 'giocatore', esito: 'hit' }, swing(3200, { picco: 3150 }),
  ];
  assert.deepEqual(bounceToGesture(ev).map(x => x.dalRimbalzoMs), [300, 150]);
  assert.equal(bounceToGesture(ev)[0].primaDellImpattoMs, 150);
  // stessa registrazione senza ruolo (o ruolo p1): computer del P1, come prima
  assert.deepEqual(bounceToGesture(ev.slice(1)).map(x => x.dalRimbalzoMs), [240], 'computer del P1: conta la palla «opponent»');
  assert.deepEqual(bounceToGesture([{ t: 0, k: 'partita', ruolo: 'p1' }, ...ev.slice(1)]).map(x => x.dalRimbalzoMs), [240]);
});

test('rapporto: le misure stanno nelle metriche e nel riassunto in parole', () => {
  const ev = [...series(0, 12, .05), { t: 50000, k: 'piano', chi: 'giocatore', tipo: 'ground', tc: .6 }, { t: 50100, k: 'rimbalzo', da: 'opponent', n: 1 }, swing(50500, { picco: 50420 })];
  const m = computeMetrics(ev);
  assert.ok(m.misurePersone?.variazione?.dritto); assert.equal(m.misurePersone.rimbalzo.colpi, 1);
  const L = summaryLines(m).join('\n');
  assert.match(L, /Variazione del gesto \(dritto, 13 colpi normali\): salita ±0[,.]\d+ attorno all'abituale/);
  assert.match(L, /Dal rimbalzo al gesto \(1 palle\): mediana 320 ms/);
  assert.deepEqual(gestureMeasureLines(null), []);
});

test('scripts/audit/gesto-rimbalzo.mjs: legge zip e cartelle, tiene insieme le parti, stampa per registrazione e il totale', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gesto-rimbalzo-'));
  try {
    const jsonl = ev => ev.map(e => JSON.stringify(e)).join('\n') + '\n';
    const pack = async (name, meta, ev) => { const b = zipBlob([{ name: 'sessione.json', data: JSON.stringify(meta) }, { name: 'eventi.jsonl', data: jsonl(ev) }]); fs.writeFileSync(path.join(dir, name), new Uint8Array(await b.arrayBuffer())); };
    const bounce = t => [{ t, k: 'piano', chi: 'giocatore', tipo: 'ground', tc: .5 }, { t: t + 100, k: 'rimbalzo', da: 'opponent', n: 1 }, swing(t + 450, { picco: t + 380 })];
    await pack('a1.zip', { id: 'A', gruppo: 'A', parte: 1, inizio: '2026-11-12T10:00:00Z', build: '2026-11-12.1' }, [...series(0, 6, .3, { abituale: 0 }), ...bounce(30000)]);
    await pack('a2.zip', { id: 'A2', gruppo: 'A', parte: 2 }, [...series(60000, 6, .3, { abituale: 0 }), ...bounce(90000)]);
    const sub = path.join(dir, 'estratto'); fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, 'sessione.json'), JSON.stringify({ id: 'B', gruppo: 'B' }));
    fs.writeFileSync(path.join(sub, 'eventi.jsonl'), jsonl(series(0, 15, .04)));
    const out = path.join(dir, 'out.json');
    const txt = execFileSync(process.execPath, [path.join(ROOT, 'scripts/audit/gesto-rimbalzo.mjs'), path.join(dir, 'a2.zip'), path.join(dir, 'a1.zip'), sub, `--json=${out}`], { encoding: 'utf8', cwd: ROOT });
    assert.match(txt, /== A · 2026-11-12T10:00:00Z · versione 2026-11-12\.1 · parti 1, 2/);
    assert.match(txt, /Variazione del gesto \(dritto, 14 colpi normali\): .* varia molto: soglia relativa da considerare/);
    assert.match(txt, /Dal rimbalzo al gesto \(2 palle\): mediana 280 ms/);
    assert.match(txt, /Variazione del gesto \(dritto, 15 colpi normali\): .* stabile/);
    assert.match(txt, /== In tutto \(2 registrazioni\): variazione della salita mediana ±0[.,]\d+ su 2 lati con almeno 10 colpi normali · oltre 0.15: 1/);
    const js = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(js.registrazioni.length, 2); assert.equal(js.totale.palle, 2); assert.equal(js.totale.dalRimbalzoMsMediana, 280);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
