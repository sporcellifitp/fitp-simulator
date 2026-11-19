// Strumenti del registro dello stand (scripts/registro): registri finti (finto.mjs), riassunto (riassunto.mjs) e
// scarico dal Worker (scarica.mjs, con il Worker servito in locale e lo spazio R2 finto: niente Cloudflare, nessuna
// chiave vera). Il riassunto deve dare gli stessi numeri qualunque sia la forma del registro, reggere migliaia di
// partite e i file tronchi, contare una volta sola i blocchi doppi e lasciare fuori le righe con campi vietati.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { giornoFinto, scriviFinto, inBlocchi, bloccoSalvato } from '../scripts/registro/finto.mjs';
import { riassumi, Misura, Riassunto, rapporto, kmhVeri, kmhVecchi, KMH_VECCHI_FINO_A, spearman, retta, precisionRiga, DIR_MIN, B66_LIMITE } from '../scripts/registro/riassunto.mjs';
import { PRECISION_ZONES } from '../src/natpf/natpf_arcade.js';
import { main as scarica } from '../scripts/registro/scarica.mjs';
import { workerLocale } from '../scripts/registro/worker-locale.mjs';
import { controllaRiga, TIPI } from '../src/natpf/registro/registro_formato.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-registro-'));
const somma = (list, k) => list.reduce((a, v) => a + v[k], 0);
const sezione = (r, titolo) => r.sezioni.find(s => s.titolo.startsWith(titolo));

test('registri finti: righe valide per il gioco, ripetibili, con tutti i tipi di riga che servono al riassunto', () => {
  const a = giornoFinto({ partite: 150, seme: 3 }), b = giornoFinto({ partite: 150, seme: 3 }), c = giornoFinto({ partite: 150, seme: 4 });
  assert.deepEqual(a.righe, b.righe); assert.notDeepEqual(a.righe, c.righe);
  const tipi = new Set();
  for (const l of a.righe){ const row = JSON.parse(l); tipi.add(row.k); assert.deepEqual(controllaRiga(row), [], l); }
  for (const k of ['avvio', 'partita', 'partita.fine', 'punto', 'colpo', 'servizio', 'vuoto', 'tutorial', 'calibrazione', 'visita', 'tel', 'chiusura']) assert.ok(tipi.has(k), k);
  for (const k of tipi) assert.ok(TIPI.includes(k), k);
  assert.equal(a.verita.partite, 150); assert.equal(a.verita.finite + a.verita.abbandonate, 150);
});

test('riassunto: stessi numeri dallo scarico del Worker, dall’albero dello spazio, dallo zip della coda e dai file in chiaro', async () => {
  const dir = tmp(), ris = {};
  try {
    let verita = null;
    for (const forma of ['scarico', 'spazio', 'coda', 'righe']){
      const f = await scriviFinto({ out: path.join(dir, forma), giorni: 2, partite: 120, seme: 5, forma }); verita = f.verita;
      ris[forma] = await riassumi(path.join(dir, forma), { out: path.join(dir, `out-${forma}`), quando: 'prova' });
    }
    const V = { partite: somma(verita, 'partite'), finite: somma(verita, 'finite'), abbandonate: somma(verita, 'abbandonate'), punti: somma(verita, 'punti'), colpi: somma(verita, 'colpi') };
    for (const [forma, r] of Object.entries(ris)){
      const { R, L } = r;
      assert.equal(R.partite.n, V.partite, forma); assert.equal(R.partite.finite, V.finite, forma); assert.equal(R.partite.abbandonate, V.abbandonate, forma); assert.equal(R.partite.senzaFine, 0, forma);
      assert.equal(R.servizio.punti, V.punti, forma); assert.equal(Object.values(R.gesti).reduce((a, g) => a + g.n, 0), V.colpi, forma);
      assert.equal(L.nonValide, 0, forma); assert.equal(L.illeggibili, 0, forma); assert.equal(L.doppioni, 0, forma);
      assert.deepEqual(Object.keys(R.giorni).sort(), ['2026-11-14', '2026-11-15'], forma);
      // aiuto al più giovane: le partite e le vittorie sono quelle del generatore
      assert.equal(R.split.aiuto.partite, somma(verita.map(v => v.aiuto), 'partite'), forma); assert.equal(R.split.aiuto.vinte, somma(verita.map(v => v.aiuto), 'vinteDalGiovane'), forma);
      assert.equal(R.sup.riusciti, somma(verita, 'superRiusciti'), forma); assert.equal(R.tutorial.n, somma(verita, 'tutorial'), forma); assert.equal(R.cal.n, somma(verita, 'calibrazioni'), forma);
      assert.equal(R.tel.stati.caduto || 0, somma(verita, 'cadute'), forma);
      assert.equal(r.md, ris.scarico.md.replace(/Registro letto: .*\n/, m => r.md.match(/Registro letto: .*\n/)[0]), `${forma}: stesso rapporto`);
      // i due file: Markdown e pagina HTML che sta in piedi da sola
      assert.ok(fs.readFileSync(r.file.md, 'utf8').startsWith('# Registro dello stand'));
      const html = fs.readFileSync(r.file.html, 'utf8');
      assert.match(html, /^<!doctype html>/); assert.ok(!/<script|src=|href=/.test(html), 'niente da scaricare da fuori');
    }
    // le sezioni che servono a tarare il gioco ci sono tutte
    for (const t of ['In breve', 'Partite per giorno e per ora', 'Abbandoni', 'Per «Chi gioca»', 'Colpi di chi gioca', 'Colpo super', 'Direzione', 'Servizio', 'Tutorial e calibrazione', 'Stesso schermo', 'Livello Evento', 'Collegamento', 'Prestazioni', 'Errori']) assert.ok(sezione(ris.scarico, t), t);
    // B36.0: i registri finti hanno i campi della direzione e qualche Precision
    const D = ris.scarico.R.dir; assert.equal(D.partite.conCampi, V.partite); assert.equal(D.partite.senzaCampi, 0); assert.equal(D.precision.length, somma(verita, 'precision'));
    assert.match(sezione(ris.scarico, 'Stesso schermo').testo.join(' '), /38–42%/);
    const chi = sezione(ris.scarico, 'Per «Chi gioca»').tabelle[0].righe.map(r => r[0]);
    assert.deepEqual(chi, ['adulto · evento', 'bambino · bambini', 'ragazzo · casual', 'stesso schermo']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('riassunto: file tronchi (ultima riga a metà, gzip interrotto) e partite senza la riga di fine', async () => {
  const dir = tmp();
  try {
    const { righe, verita } = giornoFinto({ partite: 60, seme: 9 }), testo = righe.join('\n') + '\n';
    // in chiaro, tagliato a metà di una riga, a metà di una partita
    const taglio = testo.indexOf('"k":"punto"', Math.floor(testo.length*.6)) + 25;
    fs.writeFileSync(path.join(dir, 'registro-2026-11-14.jsonl'), testo.slice(0, taglio));
    let r = await riassumi(dir);
    assert.equal(r.L.illeggibili, 1); assert.ok(r.R.partite.n > 20 && r.R.partite.n < verita.partite); assert.equal(r.R.partite.senzaFine, 1);
    assert.equal(r.R.partite.finite + r.R.partite.abbandonate + r.R.partite.senzaFine, r.R.partite.n);
    assert.match(r.md, /senza la riga di fine 1/); assert.match(r.md, /Righe non leggibili \(a metà\): 1/);
    // gzip interrotto: si legge quello che c'è
    fs.rmSync(path.join(dir, 'registro-2026-11-14.jsonl'));
    const gz = zlib.gzipSync(testo); fs.writeFileSync(path.join(dir, 'registro-2026-11-14.jsonl.gz'), gz.subarray(0, Math.floor(gz.length*.7)));
    r = await riassumi(dir);
    assert.ok(r.R.partite.n > 10 && r.R.partite.n < verita.partite, `partite lette ${r.R.partite.n}`); assert.ok(r.L.tronchi >= 1 || r.L.illeggibili >= 1);
    // file vuoto e cartella vuota: nessun errore, rapporto con zero partite
    fs.rmSync(path.join(dir, 'registro-2026-11-14.jsonl.gz')); fs.writeFileSync(path.join(dir, 'vuoto.jsonl'), '');
    r = await riassumi(dir); assert.equal(r.R.partite.n, 0); assert.match(r.md, /Partite: 0/);
    await assert.rejects(riassumi(path.join(dir, 'non-esiste')), /non trovo/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('riassunto: una riga gigante (30 MB, una parola sola) si salta e si conta senza fermare lo strumento', async () => {
  const dir = tmp();
  try {
    const { righe, verita } = giornoFinto({ partite: 20, seme: 4 });
    const gigante = JSON.stringify({ k: 'errore', t: 1, msg: 'x'.repeat(30*1024*1024) });
    fs.writeFileSync(path.join(dir, 'registro-2026-11-14.jsonl'), righe.slice(0, 10).join('\n') + '\n' + gigante + '\n' + righe.slice(10).join('\n') + '\n');
    const t0 = Date.now(), r = await riassumi(dir);
    assert.ok(Date.now() - t0 < 15000, `${Date.now() - t0} ms`);
    assert.equal(r.R.partite.n, verita.partite); assert.equal(r.L.illeggibili, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('riassunto: lo stesso blocco due volte si conta una volta; righe con nomi o campi vietati restano fuori e si dicono', async () => {
  const dir = tmp();
  try {
    const { righe, verita } = giornoFinto({ partite: 40, seme: 2 }), blocchi = inBlocchi('2026-11-14', verita.postazione, righe);
    // scaricato due volte (due file con gli stessi blocchi) e in più l'albero dello spazio con gli stessi blocchi
    const scarico = Buffer.concat(blocchi.map(bloccoSalvato));
    fs.writeFileSync(path.join(dir, 'registro-2026-11-14.jsonl.gz'), scarico); fs.writeFileSync(path.join(dir, 'registro-2026-11-14 (1).jsonl.gz'), scarico);
    for (const b of blocchi.slice(0, 5)){ const f = path.join(dir, 'registro', '2026-11-14', b.postazione, `${b.parte}.jsonl.gz`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, bloccoSalvato(b)); }
    let r = await riassumi(dir);
    assert.equal(r.R.partite.n, verita.partite); assert.equal(r.L.blocchi, blocchi.length); assert.equal(r.L.doppioni, blocchi.length + 5);
    // un file con righe sporche (non dovrebbero esistere: il gioco e il Worker le puliscono): fuori dai conti, dichiarate
    fs.writeFileSync(path.join(dir, 'sporco.jsonl'), [JSON.stringify({ k: 'partita', t: 1, n: 999, nome: 'Mario Rossi', modo: 'cpu' }), JSON.stringify({ k: 'colpo', t: 2, gesto: 'dritto', ip: '192.168.1.7' }), JSON.stringify({ k: 'errore', t: 3, msg: 'visto su https://esempio.example/x' })].join('\n') + '\n');
    r = await riassumi(dir);
    assert.equal(r.R.partite.n, verita.partite); assert.equal(r.L.nonValide, 3);
    assert.match(r.md, /ATTENZIONE: 3 righe con campi non previsti o vietati/); assert.ok(!r.md.includes('Mario')); assert.ok(!r.html.includes('192.168.1.7'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('riassunto: regge migliaia di partite in pochi secondi e con poca memoria', async () => {
  const dir = tmp();
  try {
    const f = await scriviFinto({ out: dir, giorni: 3, partite: 1200, seme: 11, forma: 'scarico' });
    const t0 = Date.now(), r = await riassumi(dir), ms = Date.now() - t0;
    assert.equal(r.R.partite.n, 3600); assert.equal(r.R.partite.finite, somma(f.verita, 'finite'));
    assert.ok(ms < 30000, `riassunto di 3600 partite in ${ms} ms`);
    // di ogni misura resta un campione limitato, non tutti i valori
    assert.ok(Object.values(r.R.gesti).every(g => g.ms.campione.length <= 4096)); assert.ok(r.R.durata.finite.campione.length <= 4096);
    const m = new Misura(); for (let i = 1; i <= 100000; i++) m.metti(i);
    assert.equal(m.n, 100000); assert.equal(m.media, 50000.5); assert.equal(m.campione.length, 4096); assert.ok(Math.abs(m.p(.5) - 50000) < 5000, `mediana stimata ${m.p(.5)}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('scarico dal Worker (in locale, spazio finto) e riassunto: i blocchi mandati dal gioco tornano tutti, una volta sola', async () => {
  const dir = tmp(), CHIAVE = 'chiave-di-prova-123', ORIGINE = 'https://gioco.example.workers.dev';
  const ora = Date.parse('2026-11-15T20:00:00Z'), w = await workerLocale({ env: { ALLOWED_ORIGINS: ORIGINE, CHIAVE_LETTURA: CHIAVE }, now: () => ora });
  try {
    let partite = 0;
    for (const [i, giorno] of ['2026-11-14', '2026-11-15'].entries()){
      const { righe, verita } = giornoFinto({ giorno, partite: 80, seme: 20 + i }); partite += verita.partite;
      for (const b of inBlocchi(giorno, verita.postazione, righe, { perBlocco: 25 })){
        // come il gioco: compresso, senza chiave, con la sua origine
        const res = await fetch(`${w.url}?giorno=${b.giorno}&postazione=${b.postazione}&parte=${b.parte}`, { method: 'POST', headers: { Origin: ORIGINE, 'Content-Type': 'text/plain;charset=UTF-8', 'CF-Connecting-IP': `198.51.100.${i}` }, body: zlib.gzipSync(b.testo) });
        if (res.status === 429){ const { dimentica } = await import('../cloudflare/registro-worker.js'); dimentica(); continue; }
        assert.equal(res.status, 200);
      }
    }
    const righe = [], log = t => righe.push(t);
    // senza chiave, e con la chiave come argomento: rifiutato
    assert.equal(await scarica([`--url=${w.url}`, '--stato'], { env: {}, log, error: log }), 1); assert.match(righe.pop(), /manca la chiave/);
    assert.equal(await scarica([`--url=${w.url}`, `--chiave=${CHIAVE}`], { env: {}, log, error: log }), 1); assert.match(righe.pop(), /argomento non valido/);
    assert.equal(await scarica([`--url=${w.url}`, '--stato'], { env: { REGISTRO_CHIAVE: 'chiave-sbagliata-000' }, log, error: log }), 1); assert.match(righe.pop(), /chiave sbagliata/);
    // stato e scarico di tutti i giorni
    assert.equal(await scarica([`--url=${w.url}`, `--out=${path.join(dir, 'scarico')}`], { env: { REGISTRO_CHIAVE: CHIAVE }, log, error: log }), 0);
    assert.match(righe[0], /Spazio occupato dal registro: \d+ kB su 2\.00 GB; giorni: 2/); assert.ok(!righe.join('\n').includes(CHIAVE), 'la chiave non si stampa');
    assert.deepEqual(fs.readdirSync(path.join(dir, 'scarico')).sort(), ['registro-2026-11-14.jsonl.gz', 'registro-2026-11-15.jsonl.gz']);
    const r = await riassumi(path.join(dir, 'scarico'));
    assert.ok(r.R.partite.n >= partite - 40 && r.R.partite.n <= partite, `partite ${r.R.partite.n} su ${partite}`); assert.equal(r.L.doppioni, 0); assert.equal(r.L.nonValide, 0); assert.equal(r.L.incompleto, false);
    assert.equal(r.L.blocchi, [...w.bucket.oggetti.keys()].filter(k => k.endsWith('.jsonl.gz')).length);
    // cancellare un giorno dopo averlo scaricato
    assert.equal(await scarica([`--url=${w.url}`, '--cancella=2026-11-14'], { env: { REGISTRO_CHIAVE: CHIAVE }, log, error: log }), 0);
    assert.ok([...w.bucket.oggetti.keys()].every(k => !k.includes('/2026-11-14/')));
  } finally { await w.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('B34: km/h del servizio veri nel riassunto, anche dai registri delle versioni con la scala × 6,8', () => {
  assert.equal(KMH_VECCHI_FINO_A, '2026-11-13.5');
  assert.ok(kmhVecchi('2026-11-12.4') && kmhVecchi('2026-11-13.5') && kmhVecchi('2026-10-30.18'));
  assert.ok(!kmhVecchi('2026-11-13.6') && !kmhVecchi('2026-11-13.10') && !kmhVecchi('2026-11-14.1') && !kmhVecchi(undefined));
  assert.equal(kmhVeri(170, '2026-11-13.5'), 90);
  assert.equal(kmhVeri(90, '2026-11-13.6'), 90);
  const ctx = { giorno: '2026-11-13', postazione: 'abcd1234' };
  for (const [versione, kmh] of [['2026-11-13.5', 170], ['2026-11-14.1', 90]]){
    const R = new Riassunto();
    R.aggiungi({ k: 'partita', t: 0, n: 1, versione, modo: 'cpu' }, ctx);
    R.aggiungi({ k: 'servizio', t: 10, q: 1, ms: 0, kmh, voto: 'p' }, ctx);
    assert.equal(R.servizio.kmh.somma, 90, versione);
  }
});

test('B42: scambi lunghi nel riassunto (scambio caldo acceso in tutti i modi, punti oltre 20 e 30 colpi, super con la «palla calda»)', () => {
  const ctx = { giorno: '2026-11-13', postazione: 'abcd1234' }, R = new Riassunto(), L = { file: 1, blocchi: 1, righe: 1, byte: 1 };
  R.aggiungi({ k: 'partita', t: 0, n: 1, versione: '2026-11-14.1', modo: 'cpu', stand: { chiosco: true, caldo: true } }, ctx);
  for (const [p, colpi] of [[1, 5], [2, 25], [3, 34], [4, 12]]) R.aggiungi({ k: 'punto', t: p*10, n: 1, p, vince: 'g', fine: 'vincente', colpi }, ctx);
  R.aggiungi({ k: 'colpo', t: 50, n: 1, gesto: 'dritto', voto: 'p', f: .9, sup: 'calda' }, ctx);
  R.aggiungi({ k: 'partita.fine', t: 60, n: 1, vince: 'g' }, ctx);
  R.aggiungi({ k: 'partita', t: 100, n: 2, versione: '2026-11-14.1', modo: 'due-computer', stand: { chiosco: true, caldo: false } }, ctx);
  R.aggiungi({ k: 'punto', t: 110, n: 2, p: 1, vince: 'a', fine: 'rete', colpi: 40 }, ctx);
  assert.deepEqual(R.lunghi, { partite: 2, caldo: 1, c: { punti: 4, oltre20: 2, oltre30: 1 }, s: { punti: 1, oltre20: 1, oltre30: 1 }, superCaldi: 1 });
  const s = rapporto(R, L).find(x => x.titolo === 'Scambi lunghi'), testo = s?.testo.join('\n') || '';
  assert.ok(s, 'sezione «Scambi lunghi»');
  assert.match(testo, /acceso .*: 1 su 2\./);
  assert.match(testo, /acceso: 50% oltre 20 colpi, 25% oltre 30 \(4 punti\); con lo scambio caldo spento: 100% oltre 20 colpi, 100% oltre 30 \(1 punti\)/);
  assert.match(testo, /«palla calda».*: 1\./);
});

// B46 «dritto e rovescio al sicuro»: le righe «tel» con un motivo (mano, segno del verso) si contano a parte, non come
// stati del collegamento, e il rapporto dice da dove sono venute
test('B46: cambi di mano e del segno del verso del telefono nel riassunto', () => {
  const ctx = { giorno: '2026-11-14', postazione: 'abcd1234' }, R = new Riassunto(), L = { file: 1, blocchi: 1, righe: 1, byte: 1 };
  R.aggiungi({ k: 'tel', t: 5, chi: 'g', stato: 'collegato', strada: 'lan' }, ctx);
  R.aggiungi({ k: 'tel', t: 10, chi: 'g', motivo: 'mano', mano: 'left', causa: 'telefono', ruolo: 'p1' }, ctx);
  R.aggiungi({ k: 'tel', t: 20, chi: 'g', motivo: 'mano', mano: 'right', causa: 'chiosco', ruolo: 'p1' }, ctx);
  R.aggiungi({ k: 'tel', t: 21, chi: 'a', motivo: 'mano', mano: 'right', causa: 'chiosco', ruolo: 'p2' }, ctx);
  R.aggiungi({ k: 'tel', t: 30, n: 1, chi: 'g', motivo: 'segno', stato: -1, causa: 'tocchi', ruolo: 'p1', inPartita: true }, ctx);
  R.aggiungi({ k: 'tel', t: 31, chi: 'g', motivo: 'segno', stato: -1, causa: 'prova', ruolo: 'p1' }, ctx);
  assert.deepEqual(R.tel.stati, { collegato: 1 }, 'i cambi non sono stati del collegamento');
  assert.deepEqual(R.tel.mano, { 'sinistra · telefono': 1, 'destra · chiosco': 1, 'destra · chiosco (Player 2)': 1 });
  assert.deepEqual(R.tel.segno, { 'tocchi · −1': 1, 'prova · −1': 1 }); assert.equal(R.tel.segnoInPartita, 1); assert.equal(R.tel.manoInPartita, 0);
  const s = rapporto(R, L).find(x => x.titolo === 'Collegamento del telefono');
  const t = n => s.tabelle.find(x => x.titolo.startsWith(n));
  assert.ok(t('Mano cambiata')); assert.deepEqual(t('Mano cambiata').righe.map(r => r[0]).sort(), ['destra · chiosco', 'destra · chiosco (Player 2)', 'sinistra · telefono']);
  assert.match(t('Segno del verso').titolo, /in partita: 1/);
  // senza righe con un motivo (registri di prima): le due tabelle non ci sono
  const R0 = new Riassunto(); R0.aggiungi({ k: 'tel', t: 5, chi: 'g', stato: 'caduto' }, ctx);
  const s0 = rapporto(R0, L).find(x => x.titolo === 'Collegamento del telefono');
  assert.ok(!s0.tabelle.some(x => /Mano cambiata|Segno del verso/.test(x.titolo)));
});

/* ---------- B36.0: sezione «Direzione» (docs/b36/misure-b36-0.md) ---------- */
test('B36.0: correlazione di rango e retta dei minimi quadrati', () => {
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1); assert.equal(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  assert.equal(spearman([1, 2, 3, 4], [1, 4, 9, 16]), 1, 'di rango: conta l’ordine, non la retta');
  assert.ok(Math.abs(spearman([1, 2, 2, 3], [1, 2, 3, 4]) - .9487) < 1e-3, 'pari merito con il rango medio');
  assert.equal(spearman([1, 2], [1, 2]), null); assert.equal(spearman([1, 1, 1], [1, 2, 3]), null);
  const f = retta([0, 1, 2, 3], [1, 3, 5, 7]); assert.equal(f.pendenza, 2); assert.equal(f.dispersione, 0); assert.equal(f.r2, 1);
  const g = retta([-3, -2, 2, 3, 0, 0], [-30, -18, 22, 28, 4, -4]); assert.ok(g.pendenza > 9 && g.pendenza < 11 && g.dispersione > 2 && g.r2 > .9, JSON.stringify(g));
});

test('B36.0: riassunto «Direzione» — giro della cima, tempo, E1–E5, Precision, Worker non ricaricato', () => {
  const ctx = { giorno: '2026-11-14', postazione: 'abcd1234' }, R = new Riassunto(), L = { file: 1, blocchi: 1, righe: 1, byte: 1 };
  R.aggiungi({ k: 'avvio', t: 0, v: 2, ora: '2026-11-14T09:00:00.000Z', fuso: 60 }, ctx);
  // una partita con «classica» a Evento: 30 colpi; la palla va dove gira la cima (rx = 3·pf), un colpo su dieci fuori
  R.aggiungi({ k: 'partita', t: 10, n: 1, modo: 'cpu', chi: 'adulto', livello: 'evento', dir: 'classica' }, ctx);
  for (let i = 0; i < 30; i++){
    const pf = ((i % 7) - 3)/3, dv = 3 + 14*pf, tu = i % 3 ? .4 : -1.4, rx = 3*pf;
    R.aggiungi({ k: 'colpo', t: 100 + i, n: 1, gesto: 'topspin', ms: 20, voto: 'perfetto', d: pf - .4, x: rx/.86, z: -9, lato: 1, pf, dv, tu, rx, rz: -8.8, ...(i % 10 === 9 ? { fu: 1 } : {}) }, ctx);
  }
  R.aggiungi({ k: 'partita.fine', t: 500, n: 1, esito: 'finita', vince: 'g', durS: 140 }, ctx);
  // una partita di un gioco nuovo (formato 2) SENZA i campi: Worker non ricaricato
  R.aggiungi({ k: 'partita', t: 600, n: 2, modo: 'cpu', chi: 'adulto', livello: 'evento' }, ctx);
  R.aggiungi({ k: 'colpo', t: 610, n: 2, gesto: 'topspin', ms: 5, voto: 'perfetto' }, ctx);
  R.aggiungi({ k: 'partita.fine', t: 700, n: 2, esito: 'finita', vince: 'a', durS: 100 }, ctx);
  // Precision: 10 palle con la cima verso la zona (zp 0–9), poi la riga del minigioco
  for (const [zp, z] of PRECISION_ZONES.entries()) R.aggiungi({ k: 'colpo', t: 800 + zp, amb: 'minigioco', gesto: 'topspin', ms: 0, lato: zp % 2 ? 1 : -1, pf: z.x/3, dv: 4*z.x, tu: 0, rx: z.x, rz: z.z, zp }, ctx);
  R.aggiungi({ k: 'minigioco', t: 900, gioco: 'precision', finito: true, punti: 1000, durS: 60, dir: 'classica' }, ctx);
  R.fine();
  const D = R.dir, G = D.gruppi['classica · adulto · evento'];
  assert.deepEqual(D.partite, { conCampi: 1, vecchie: 0, senzaCampi: 1 });
  assert.equal(G.colpi, 31); assert.equal(G.conDv, 30); assert.equal(G.oltre45, 0);
  assert.equal(G.cima.rango, 1, 'E1: la palla segue sempre la cima');
  assert.equal(G.fuoriFinestra, 2); assert.equal(G.nellaFinestra, 20, 'E3: solo i colpi con il tempo nella finestra (|tu| ≤ 1)');
  assert.equal(G.primi, 10); assert.equal(G.primi05, 6, 'E4: |piatto| ≥ 0,5 nei primi 10 colpi');
  assert.equal(G.giudicate, 1); assert.equal(G.storte, 0, 'E5: 30 colpi sparsi nelle due metà');
  assert.equal(G.durata.n, 2); assert.equal(D.precision.length, 1);
  const P = precisionRiga(D.precision[0]); assert.equal(P.palle, 10); assert.equal(P.laterali, 7); assert.equal(P.cima, 1); assert.equal(P.distanza, 0); assert.equal(P.punti, 1000);
  const S = rapporto(R, L).find(x => x.titolo.startsWith('Direzione')), testo = S.testo.join('\n');
  assert.ok(S, 'sezione «Direzione»');
  assert.match(testo, /ATTENZIONE: 1 partite di un gioco con il formato delle righe 2 senza i campi della direzione: il Worker del registro non è stato ricaricato/);
  assert.match(testo, /Precision con «classica»: 10 palle in 1 partite\. Cima → zona: 4,0° per metro di zona, il giro voluto sparge ±0,0°/);
  const tab = t => S.tabelle.find(x => x.titolo.startsWith(t));
  assert.equal(tab('Obiettivi').righe[0][0], `classica · adulto · evento (pochi colpi: 31 < ${DIR_MIN})`);
  assert.deepEqual(tab('Precision: una riga').righe[0].slice(1, 5), ['classica', '10', '10', '100% di 7']);
  assert.equal(tab('Precision: zona chiesta').righe.length, 10);
});

// B60: km/h dei colpi nelle righe «colpo» (dalla 2026-11-17.1): velocità dei colpi e colpo più forte di ogni giocatore in
// ogni partita (colpi e servizi, come il trofeo Razzo); le partite senza km/h dei colpi non entrano nel massimo
test('B60: velocità dei colpi e colpo più forte per partita nel riassunto (trofeo Razzo)', () => {
  const ctx = { giorno: '2026-11-17', postazione: 'abcd1234' }, R = new Riassunto(), L = { file: 1, blocchi: 1, righe: 1, byte: 1 };
  // partita 1: chi gioca 90, 110 (colpi) e un servizio a 125; l'avversario umano 80
  R.aggiungi({ k: 'partita', t: 0, n: 1, versione: '2026-11-17.1', modo: 'stesso-schermo' }, ctx);
  R.aggiungi({ k: 'servizio', t: 5, q: 1, ms: 0, kmh: 125, voto: 'p' }, ctx);
  for (const [t, kmh, chi] of [[10, 90], [12, 80, 'a'], [14, 110]]) R.aggiungi({ k: 'colpo', t, n: 1, gesto: 'dritto', voto: 'p', f: .6, kmh, ...(chi ? { chi } : {}) }, ctx);
  R.aggiungi({ k: 'colpo', t: 15, n: 1, gesto: 'dritto', voto: 'p', f: .6, amb: 'prova', kmh: 150 }, ctx);   // (scambio di prova: fuori)
  R.aggiungi({ k: 'partita.fine', t: 20, n: 1, vince: 'g', esito: 'finita', durS: 60 }, ctx);
  // partita 2: registro vecchio, solo il servizio con i km/h: non entra nel massimo per partita
  R.aggiungi({ k: 'partita', t: 100, n: 2, versione: '2026-11-16.11', modo: 'cpu' }, ctx);
  R.aggiungi({ k: 'servizio', t: 105, q: 1, ms: 0, kmh: 130, voto: 'p' }, ctx);
  R.aggiungi({ k: 'colpo', t: 110, n: 2, gesto: 'dritto', voto: 'p', f: .6 }, ctx);
  R.aggiungi({ k: 'partita.fine', t: 120, n: 2, vince: 'a', esito: 'finita', durS: 50 }, ctx);
  assert.deepEqual([R.velocita.colpi.n, R.velocita.colpi.min, R.velocita.colpi.max], [3, 80, 110]);
  assert.equal(R.velocita.conColpi, 1);
  assert.deepEqual([...R.velocita.maxPartita.campione].sort((a, b) => a - b), [80, 125], 'chi gioca 125 (il servizio), l\'avversario 80');
  const s = rapporto(R, L).find(x => x.titolo.startsWith('Velocità dei colpi')), testo = s?.testo.join('\n') || '';
  assert.match(testo, /Colpi in partita con i km\/h: 3;/); assert.match(testo, /colpi e servizi; 1 partite\)/);
  // registro senza km/h dei colpi: la sezione lo dice
  const V = new Riassunto();
  V.aggiungi({ k: 'partita', t: 0, n: 1, versione: '2026-11-16.11', modo: 'cpu' }, ctx);
  V.aggiungi({ k: 'colpo', t: 1, n: 1, gesto: 'dritto', voto: 'p', f: .6 }, ctx);
  assert.match(rapporto(V, L).find(x => x.titolo.startsWith('Velocità dei colpi')).testo.join(' '), /prima della 2026-11-17\.1/);
});

// 17/11: dritto o rovescio dalla parte opposta alla palla (pl della riga «colpo» contro lato), per giocatore, e le partite
// con almeno 3 di fila dello stesso giocatore (verso del telefono girato)
test('17/11: riassunto dei colpi dalla parte opposta alla palla, con le serie di 3 di fila', () => {
  const ctx = { giorno: '2026-11-18', postazione: 'abcd1234' }, R = new Riassunto(), L = { file: 1, blocchi: 1, righe: 1, byte: 1 };
  R.aggiungi({ k: 'partita', t: 0, n: 1, versione: '2026-11-17.2', modo: 'stesso-schermo' }, ctx);
  // chi gioca: d'accordo, poi 3 di fila dalla parte opposta (serie); l'avversario: 1 opposto su 2; colpi senza pl o con pl 0 fuori
  const righe = [[1, 1], [-1, -1], [-1, 1], [1, -1], [-1, 1], [1, 1, 'a'], [1, -1, 'a'], [0, 1], [undefined, 1]];
  righe.forEach(([pl, lato, chi], i) => R.aggiungi({ k: 'colpo', t: i + 1, n: 1, gesto: 'dritto', voto: 'p', f: .6, lato, ...(pl !== undefined ? { pl } : {}), ...(chi ? { chi } : {}) }, ctx));
  R.aggiungi({ k: 'colpo', t: 20, n: 1, gesto: 'dritto', voto: 'p', f: .6, amb: 'prova', pl: -1, lato: 1 }, ctx);   // scambi di prova: fuori
  R.aggiungi({ k: 'partita.fine', t: 30, n: 1, vince: 'g', esito: 'finita', durS: 60 }, ctx);
  R.aggiungi({ k: 'partita', t: 100, n: 2, versione: '2026-11-17.2', modo: 'cpu' }, ctx);
  R.aggiungi({ k: 'colpo', t: 101, n: 2, gesto: 'dritto', voto: 'p', f: .6, pl: 1, lato: 1 }, ctx);
  R.aggiungi({ k: 'partita.fine', t: 110, n: 2, vince: 'g', esito: 'finita', durS: 40 }, ctx);
  assert.deepEqual(R.parte, { g: { n: 6, opposti: 3 }, a: { n: 2, opposti: 1 }, partite: 2, conSerie: 1 });
  const testo = rapporto(R, L).find(x => x.titolo.startsWith('Dritto e rovescio dalla parte della palla'))?.testo.join('\n') || '';
  assert.match(testo, /palla di lato \(oltre 0,3 m dal corpo\): 8; giocati dalla parte opposta[^:]*: 4 \(50/);
  assert.match(testo, /almeno 3 colpi di fila[^:]*: 1 su 2\./);
  const V = new Riassunto(); V.aggiungi({ k: 'partita', t: 0, n: 1, versione: '2026-11-17.1', modo: 'cpu' }, ctx);
  assert.match(rapporto(V, L).find(x => x.titolo.startsWith('Dritto e rovescio')).testo.join(' '), /prima della 2026-11-17\.2/);
});

/* ---------- B66: sensori, calibrazione, precisione, collegamento, rete e blocco (docs/b66/registro-sensori.md) ---------- */
const SEZIONI_B66 = ['Sensori del telefono', 'Calibrazione: stabilità', 'Precisione dei gesti', 'Collegamento: distribuzione', 'Rete del telefono (app)', 'Telefono bloccato'];
test('B66: le sei sezioni nuove del riassunto, dai registri finti (letti come dal Worker)', async () => {
  const dir = tmp();
  try {
    await scriviFinto({ out: dir, giorni: 1, partite: 120, seme: 7 });
    const r = await riassumi(dir, { quando: new Date(Date.UTC(2026, 10, 18, 12)) });
    const titoli = r.sezioni.map(x => x.titolo);
    for (const t of SEZIONI_B66) assert.ok(titoli.includes(t), t);
    assert.ok(titoli.indexOf('Collegamento del telefono') < titoli.indexOf('Sensori del telefono') && titoli.indexOf('Telefono bloccato') < titoli.indexOf('Prestazioni'), 'dopo il collegamento, prima delle prestazioni');
    const testo = t => sezione(r, t).testo.join('\n'), tab = (t, n) => sezione(r, t).tabelle.find(x => x.titolo.startsWith(n));
    assert.match(testo('Sensori del telefono'), /Frequenza vera dei sensori .*mediana di ogni partita \d/);
    assert.match(testo('Sensori del telefono'), /Colpi con un buco nei campioni durante il gesto: \d+ su \d+/);
    assert.ok(tab('Sensori del telefono', 'Per telefono e browser').righe.length > 3);
    assert.deepEqual(tab('Sensori del telefono', 'App NATPF').righe.map(x => x[0]).sort(), ['app 1.0.4', 'browser (senza app)']);
    assert.match(testo('Calibrazione: stabilità'), /Colpi prima che il colpo tipico sia quello imparato giocando/);
    assert.deepEqual(tab('Calibrazione: stabilità', 'Errore di tempo per numero').righe.map(x => x[0]), ['colpi 1–5', 'colpi 6–10', 'colpi 11–20', 'dal 21°']);
    const gesti = tab('Precisione dei gesti', 'Per tipo di colpo').righe; assert.ok(gesti.length >= 6);
    assert.ok(gesti.every(g => /%/.test(g[6])), 'colpi dalla parte opposta alla palla per tipo');
    assert.match(testo('Collegamento: distribuzione'), /metà · 9 su 10 · 99 su 100: \d+ · \d+ · \d+ ms/);
    assert.ok(tab('Collegamento: distribuzione', 'Per strada').righe.some(x => x[0] === 'lan'));
    assert.match(testo('Rete del telefono (app)'), /Segnale Wi-Fi, mediana di ogni partita -?\d+ dBm/);
    assert.match(testo('Rete del telefono (app)'), /mai il nome della rete/);
    assert.match(testo('Telefono bloccato'), /Telefoni bloccati in partita \(B51\): \d+/);
    // nel testo e nell'HTML
    for (const t of SEZIONI_B66){ assert.ok(r.md.includes(`## ${t}`), t); assert.ok(r.html.includes(t.replace('(', '').split(' ')[0]), t); }
    assert.equal(B66_LIMITE, 1.2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('B66: numeri esatti delle sezioni nuove; registri di prima e Worker non ricaricato lo dicono', () => {
  const ctx = { giorno: '2026-11-18', postazione: 'abcd1234' }, L = { file: 1, blocchi: 1, righe: 1, byte: 1 };
  const R = new Riassunto();
  R.aggiungi({ k: 'avvio', t: 0, v: 3, ora: '2026-11-18T09:00:00.000Z', fuso: 60 }, ctx);
  R.aggiungi({ k: 'partita', t: 10, n: 1, modo: 'cpu', chi: 'adulto', livello: 'evento', ctrl: 'telefono', tel: { strada: 'lan', so: 'Android 14', browser: 'Chrome 131', app: '1.0.4', pv: '2026-11-17.4' } }, ctx);
  const colpi = [[40, 50, 1.1, -20, 1, 1], [60, 70, 1.5, 10, 1, -1], [250, 260, 2, -60, -1, -1], [45, 52, 1.3, 0, 1, 1]];
  colpi.forEach(([a, ri, mg, ms, pl, lato], i) => R.aggiungi({ k: 'colpo', t: 20 + i, n: 1, gesto: 'dritto', ms, voto: 'buono', cf: i ? .8 : .1, mg, pl, lato, rit: [a, ri], ...(i === 2 ? { gb: 90, e: 'fuori' } : {}) }, ctx));
  R.aggiungi({ k: 'partita.fine', t: 100, n: 1, esito: 'finita', vince: 'g', durS: 3600,
    tq: { g: { hz: [59.5, 44], n: 200000, b: 4, bm: 180, bg: 1, iv: 16, sat: [0, 3] } }, lat: { g: { arr: [50, 240, 250], ris: [55, 255, 260], jit: 70, n: 5, persi: 1, ordine: 1, vie: [4, 1] } },
    wifi: { g: { rssi: [-72, -81], bd: 5, mbps: [300, 72], bt: [90, 80], ch: 0, tc: 41.2, fx: 1 } }, blocco: { g: { durS: 3500, tb: 6, ss: 1, sp: 1, sd: 2, us: 1, sc: 1 } },
    cal: { g: { tip: [500, 600], tipN: 3, cen: 4, dvi: [10, 2], seg: 1, ric: 1, ref: [600, 650], tipo: 'calibrato', soglia: [70, 120] } }, pause: { 'segnale debole': [2, 5], 'scollegato (2)': [1, 3] } }, ctx);
  // una partita di un gioco nuovo con il telefono, senza le misure: Worker non ricaricato
  R.aggiungi({ k: 'partita', t: 200, n: 2, modo: 'cpu', chi: 'adulto', livello: 'evento', ctrl: 'telefono', tel: { strada: 'lan' } }, ctx);
  R.aggiungi({ k: 'partita.fine', t: 300, n: 2, esito: 'finita', vince: 'a', durS: 100 }, ctx);
  R.fine();
  const B = R.b66;
  assert.deepEqual(B.partite, { n: 1, conMisure: 1, senzaMisure: 1 });
  assert.deepEqual(B.versioni, { pagina: { '2026-11-17.4 (diversa dal PC)': 1, 'come il PC': 1 }, app: { 'app 1.0.4': 1, 'browser (senza app)': 1 } });
  assert.equal(B.sensori.sotto50, 1); assert.equal(B.sensori.buchi, 4); assert.equal(B.sensori.satGiro, 3);
  assert.deepEqual([B.coll.persi, B.coll.ordine, B.coll.veloce, B.coll.affidabile], [1, 1, 4, 1]);
  assert.equal(B.gesti.dritto.cfBassa, 1); assert.equal(B.gesti.dritto.limite, 1); assert.equal(B.gesti.dritto.opposti, 1); assert.equal(B.gesti.dritto.conPl, 4);
  assert.deepEqual(B.ritardoTempo.map(f => f.n), [2, 1, 0, 1]);
  assert.equal(B.wifi.deboli, 1); assert.equal(B.wifi.calde, 1); assert.equal(Math.round(B.wifi.consumo.media), 10, '10 punti in un’ora');
  assert.deepEqual([B.blocco.ss, B.blocco.sp, B.blocco.sd, B.blocco.us, B.blocco.sc, B.blocco.tocchi], [1, 1, 2, 1, 1, 6]);
  assert.equal(B.cal.refCambiato, 1); assert.equal(Math.round(B.cal.deriva.media), 20); assert.equal(B.cal.dvi.media, 8);
  assert.deepEqual(B.pause, { 'segnale debole': [2, 5], 'scollegato (2)': [1, 3] });
  assert.equal(B.perSegnale['da −80 a −71 dBm'].pauseS, 5, 'solo le pause del Player 1 con il suo segnale');
  const S = rapporto(R, L), sz = t => S.find(x => x.titolo === t), txt = t => sz(t).testo.join('\n');
  assert.match(txt('Sensori del telefono'), /ATTENZIONE: 1 partite con il telefono di un gioco nuovo \(formato 3\) senza le misure del B66: il Worker del registro non è stato ricaricato/);
  assert.match(txt('Collegamento: distribuzione'), /: 60 · 250 · 250 ms\. Dal picco alla risposta del gioco/);
  assert.match(txt('Telefono bloccato'), /dallo staff sul telefono \(due dita 3 s\) 1, dal PC 1, finiti da soli \(fine del gioco, avviso o velo da toccare\) 2/);
  // registri di prima: le sezioni ci sono e dicono che le misure mancano
  const V = new Riassunto(); V.aggiungi({ k: 'avvio', t: 0, v: 2 }, ctx); V.aggiungi({ k: 'partita', t: 1, n: 1, modo: 'cpu', ctrl: 'telefono' }, ctx); V.aggiungi({ k: 'partita.fine', t: 2, n: 1, esito: 'finita', durS: 60 }, ctx); V.fine();
  const S0 = rapporto(V, L);
  for (const t of SEZIONI_B66) assert.match(S0.find(x => x.titolo === t).testo.join('\n'), /Nessuna partita con le misure del B66: il registro è di una versione prima della 2026-11-18\.1|Errore di tempo per numero/, t);
  assert.ok(!S0.find(x => x.titolo === 'Sensori del telefono').testo.join('\n').includes('ATTENZIONE'), 'formato 2: nessun avviso');
});

/* ---------- B71: riassunto corretto sui registri veri del 18 e 19/11 (docs/b71/registro-tempo.md) ---------- */
test('B71: voto «perfect» del registro vero, confidenza del gioco, «segnale non letto», batteria per telefono e per giorno', () => {
  const ctx = { giorno: '2026-11-18', postazione: 'abcd1234' }, L = { file: 1, blocchi: 1, righe: 1, byte: 1 };
  const R = new Riassunto();
  R.aggiungi({ k: 'avvio', t: 0, v: 3, ora: '2026-11-18T08:00:00.000Z', fuso: 60, g: 'abcd1234' }, ctx);
  // tre partite nello stesso schermo, a 09:00, 11:00 e 13:00 (ora locale; un minuto l'una), con l'app 1.0.4 senza il segnale
  // Wi-Fi (Android 10 e successivi) per il Player 1 e con il segnale per il Player 2
  const bt = { g: [[64, 64], [55, 55], [46, 45]], a: [[80, 79], [60, 60], [95, 95]] };
  for (let i = 0; i < 3; i++){
    const t0 = (1 + 2*i)*3600000, n = i + 1;
    R.aggiungi({ k: 'partita', t: t0, n, ora: new Date(Date.UTC(2026, 10, 18, 9 + 2*i)).toISOString(), g: 'abcd1234', modo: 'stesso-schermo', fiera: true, ctrl: 'telefono', displayLagMs: 0,
      tel: { strada: 'lan', so: 'Android 17', browser: 'Chrome 157', app: '1.0.4' }, tel2: { strada: 'lan', so: 'Android 17', browser: 'Chrome 157', app: '1.0.4' } }, ctx);
    // voti come li scrive il gioco (registro_registratore.voto: il voto del motore in minuscolo)
    for (const [j, [voto, ms, cf]] of [['perfect', 20, .5], ['early', 90, .1], ['perfect', -10, .62], ['very late', -150, .3]].entries())
      R.aggiungi({ k: 'colpo', t: t0 + 1000 + j, n, gesto: 'TOPSPIN', ms, voto, cf }, ctx);
    R.aggiungi({ k: 'partita.fine', t: t0 + 60000, n, esito: 'finita', vince: 'g', durS: 60, lat: { g: { n: 4, arr: [40, 60, 80] }, a: { n: 4, arr: [40, 60, 80] } },
      wifi: { g: { bt: bt.g[i], ch: 0, tc: 21, fx: 1 }, a: { rssi: [-65, -70], bd: 5, mbps: [300, 200], bt: bt.a[i], ch: 0, tc: 22, fx: 1 } } }, ctx);
  }
  // una partita con un telefono senza app (browser): «senza app»
  R.aggiungi({ k: 'partita', t: 20000000, n: 4, g: 'abcd1234', modo: 'cpu', ctrl: 'telefono', tel: { strada: 'lan', so: 'Android 14', browser: 'Chrome 131' } }, ctx);
  R.aggiungi({ k: 'partita.fine', t: 20060000, n: 4, esito: 'finita', vince: 'g', durS: 60, lat: { g: { n: 2, arr: [40, 60, 80] } } }, ctx);
  R.fine();
  const B = R.b66;
  // «Perfetti» per numero di colpo: 2 su 4 nei primi 5 colpi di ogni partita (prima 0 %: si cercava 'perfetto')
  assert.equal(B.perOrdine[0].n, 12); assert.equal(B.perOrdine[0].perfetti, 6);
  // confidenza del gioco: sotto 0,2 solo il colpo da 0,1
  assert.equal(B.gesti.TOPSPIN.cfBassa, 3); assert.equal(B.gesti.TOPSPIN.cf.n, 12);
  // segnale: app senza segnale ≠ senza app
  assert.deepEqual(Object.fromEntries(Object.entries(B.perSegnale).map(([k, v]) => [k, v.n])), { 'segnale non letto (app)': 3, 'da −70 a −61 dBm': 3, 'senza app': 1 });
  // batteria per telefono e per giorno (prima per partita: un minuto a passi dell'1 % dava quasi sempre 0)
  const tab = Object.fromEntries(B.wifi.batterie.map(b => [b.chi, b]));
  const P1 = tab['2026-11-18 · abcd1234 · Player 1'], P2 = tab['2026-11-18 · abcd1234 · Player 2'];
  assert.equal(P1.partite, 3); assert.equal(P1.da, 64); assert.equal(P1.a, 45); assert.equal(P1.ricariche, 0);
  assert.ok(Math.abs(P1.ore - (4 + 1/60)) < 1e-9, `${P1.ore}`); assert.ok(Math.abs(P1.consumo - 19/(4 + 1/60)) < 1e-9, `${P1.consumo}`);
  assert.equal(P2.ricariche, 1, 'la ricarica tra le 11 e le 13 non conta come consumo');
  assert.ok(Math.abs(P2.ore - (2 + 2/60)) < 1e-9, `${P2.ore}`); assert.ok(Math.abs(P2.consumo - 20/(2 + 2/60)) < 1e-9, `${P2.consumo}`);
  assert.equal(B.wifi.consumo.n, 2, 'un valore per telefono e per giorno');
  assert.deepEqual(B.schermo, { '0 ms · fiera (non sommato all’anticipo)': 3 });
  // nel rapporto
  const S = rapporto(R, L), sz = t => S.find(x => x.titolo === t);
  const perOrdine = sz('Calibrazione: stabilità').tabelle.find(t => t.titolo.startsWith('Errore di tempo per numero'));
  assert.deepEqual(perOrdine.righe[0].slice(0, 2), ['colpi 1–5', '12']); assert.equal(perOrdine.righe[0][4], '50,0%');
  const gesti = sz('Precisione dei gesti').tabelle.find(t => t.titolo === 'Per tipo di colpo');
  assert.equal(gesti.colonne[3], 'Confidenza sotto 0,2'); assert.equal(gesti.righe[0][3], '25,0%');
  const rete = sz('Rete del telefono (app)');
  assert.match(rete.testo.join('\n'), /Consumo della batteria per telefono e per giorno .*: 7,3 punti % all’ora/);
  assert.deepEqual(rete.tabelle.find(t => t.titolo.startsWith('Batteria per telefono')).righe.map(r => r.slice(0, 3)), [['2026-11-18 · abcd1234 · Player 1', '3', '64 → 45%'], ['2026-11-18 · abcd1234 · Player 2', '3', '80 → 95%']]);
  assert.ok(rete.tabelle.find(t => t.titolo === 'Segnale e collegamento').righe.some(r => r[0] === 'segnale non letto (app)'));
  assert.match(sz('Collegamento: distribuzione').testo.join('\n'), /Ritardo dello schermo salvato .*0 ms · fiera \(non sommato all’anticipo\) in 3 partite/);
});

test('B71: registri finti con i voti veri del registro: i «Perfetti» per numero di colpo non sono più 0 %', async () => {
  const { righe } = giornoFinto({ partite: 60, seme: 2 }), voti = new Set(), servizi = new Set();
  for (const l of righe){ const r = JSON.parse(l); if (r.k === 'colpo') voti.add(r.voto); if (r.k === 'servizio') servizi.add(r.voto); }
  assert.deepEqual([...voti].sort(), ['early', 'late', 'perfect', 'very early', 'very late']);
  for (const v of servizi) assert.match(v, /serve/);
  const dir = tmp();
  try {
    await scriviFinto({ out: dir, giorni: 1, partite: 120, seme: 7 });
    const r = await riassumi(dir, { quando: new Date(Date.UTC(2026, 10, 18, 12)) });
    const righeOrd = sezione(r, 'Calibrazione: stabilità').tabelle.find(t => t.titolo.startsWith('Errore di tempo per numero')).righe;
    for (const x of righeOrd) assert.notEqual(x[4], '0,0%', x[0]);
    assert.ok(r.R.b66.wifi.batterie.length >= 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
