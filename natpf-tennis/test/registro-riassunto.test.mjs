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
import { riassumi, Misura } from '../scripts/registro/riassunto.mjs';
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
    for (const t of ['In breve', 'Partite per giorno e per ora', 'Abbandoni', 'Per «Chi gioca»', 'Colpi di chi gioca', 'Colpo super', 'Servizio', 'Tutorial e calibrazione', 'Stesso schermo', 'Livello Evento', 'Collegamento', 'Prestazioni', 'Errori']) assert.ok(sezione(ris.scarico, t), t);
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
