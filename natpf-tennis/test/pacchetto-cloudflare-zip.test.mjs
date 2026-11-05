// B8 (04/11): zip deterministico del pacchetto Cloudflare e limite dei 25 MB («la versione cloudflare deve sempre
// pesare leggermente meno di 25 MB»). Lo zip si rilegge qui con un lettore indipendente da quello che lo scrive.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash, randomBytes } from 'node:crypto';
import { writeZip, zipFileList, tableCrc32, crc32, DOS_DATE, DOS_TIME, FLAG_UTF8 } from '../scripts/zip-deterministico.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeZip, makePackage, parseArgs, main, ZIP_LIMIT, ZIP_WARN } from '../scripts/pacchetto-cloudflare.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/pacchetto-cloudflare.mjs', import.meta.url));

// lettore minimo: fine della directory centrale, voci centrali, intestazioni locali, dati
function readZip(buf){
  const end = buf.length - 22;
  assert.equal(buf.readUInt32LE(end), 0x06054b50, 'fine della directory centrale in coda (niente commento)');
  const count = buf.readUInt16LE(end + 10), cdSize = buf.readUInt32LE(end + 12), cdStart = buf.readUInt32LE(end + 16);
  assert.equal(buf.readUInt16LE(end + 8), count);
  assert.equal(cdStart + cdSize, end, 'directory centrale subito prima della fine');
  const out = [];
  let p = cdStart;
  for (let i = 0; i < count; i++){
    assert.equal(buf.readUInt32LE(p), 0x02014b50);
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10), time = buf.readUInt16LE(p + 12), date = buf.readUInt16LE(p + 14);
    const crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), size = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const attr = buf.readUInt32LE(p + 38), at = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8');
    p += 46 + nlen + xlen + clen;
    // intestazione locale uguale a quella centrale
    assert.equal(buf.readUInt32LE(at), 0x04034b50, name);
    assert.equal(buf.readUInt16LE(at + 6), flags); assert.equal(buf.readUInt16LE(at + 8), method);
    assert.equal(buf.readUInt16LE(at + 10), time); assert.equal(buf.readUInt16LE(at + 12), date);
    assert.equal(buf.readUInt32LE(at + 14), crc); assert.equal(buf.readUInt32LE(at + 18), csize); assert.equal(buf.readUInt32LE(at + 22), size);
    const lnlen = buf.readUInt16LE(at + 26), lxlen = buf.readUInt16LE(at + 28);
    assert.equal(buf.subarray(at + 30, at + 30 + lnlen).toString('utf8'), name);
    const raw = buf.subarray(at + 30 + lnlen + lxlen, at + 30 + lnlen + lxlen + csize);
    const data = method === 8 ? zlib.inflateRawSync(raw) : method === 0 ? Buffer.from(raw) : assert.fail(`metodo ${method}`);
    assert.equal(data.length, size, name);
    out.push({ name, flags, method, time, date, crc, csize, size, attr, xlen, lxlen, data });
  }
  return out;
}

function sample(root){
  const put = (rel, body) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };
  put('index.html', '<!doctype html><title>gioco</title>\n'.repeat(200));          // si comprime: deflate
  put('assets/mediapipe/hands/modello.tflite', randomBytes(40000));              // casuale: deflate non riduce, store
  put('assets/vuoto.data', '');                                                  // vuoto: store da 0 byte
  put('natpf/città/è-ok.txt', 'nome in UTF-8\n');
  put('B.txt', 'maiuscola prima\n'); put('a.txt', 'minuscola dopo\n');
  fs.mkdirSync(path.join(root, 'cartella-vuota'));                               // nessuna voce per le cartelle
}

test('zip deterministico: si rilegge, CRC e contenuti giusti, nomi UTF-8 in ordine, niente cartelle', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-zip-'));
  try {
    const dir = path.join(tmp, 'pacchetto'); sample(dir);
    const r = writeZip(path.join(tmp, 'a.zip'), dir);
    const buf = fs.readFileSync(path.join(tmp, 'a.zip'));
    assert.equal(r.bytes, buf.length);
    const entries = readZip(buf);
    const names = entries.map(e => e.name);
    assert.deepEqual(names, ['B.txt', 'a.txt', 'assets/mediapipe/hands/modello.tflite', 'assets/vuoto.data', 'index.html', 'natpf/città/è-ok.txt']);
    assert.deepEqual(names, zipFileList(dir));
    assert.ok(!names.some(n => n.endsWith('/') || n.includes('\\')), 'niente voci per le cartelle né «\\»');
    for (const e of entries){
      const disk = fs.readFileSync(path.join(dir, ...e.name.split('/')));
      assert.ok(e.data.equals(disk), `contenuto di ${e.name}`);
      assert.equal(e.crc, tableCrc32(disk), `CRC di ${e.name}`);
      assert.equal(e.crc, crc32(disk));
      assert.equal(e.flags, FLAG_UTF8); assert.equal(e.time, DOS_TIME); assert.equal(e.date, DOS_DATE);
      assert.equal(e.xlen, 0); assert.equal(e.lxlen, 0);
      assert.equal(e.attr >>> 16, 0o100644, 'file normale 0644');
    }
    const by = Object.fromEntries(entries.map(e => [e.name, e]));
    assert.equal(by['index.html'].method, 8); assert.ok(by['index.html'].csize < by['index.html'].size / 10);
    assert.equal(by['assets/mediapipe/hands/modello.tflite'].method, 0, 'store quando deflate non riduce');
    assert.equal(by['assets/vuoto.data'].method, 0); assert.equal(by['assets/vuoto.data'].size, 0);
    // il CRC della tabella è quello standard
    assert.equal(tableCrc32(Buffer.from('123456789')), 0xCBF43926);
    assert.deepEqual(r.entries.map(e => e.name), names);
    // lo stesso contenuto con date diverse sul disco: stessi byte
    const old = new Date('2001-02-03T04:05:06Z');
    for (const n of names) fs.utimesSync(path.join(dir, ...n.split('/')), old, old);
    writeZip(path.join(tmp, 'b.zip'), dir);
    const sha = f => createHash('sha256').update(fs.readFileSync(path.join(tmp, f))).digest('hex');
    assert.equal(sha('b.zip'), sha('a.zip'), 'due zip dello stesso contenuto: stesso sha256');
    // non sovrascrive
    assert.throws(() => writeZip(path.join(tmp, 'a.zip'), dir), /EEXIST/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('zip del pacchetto: sotto il limite si tiene, da ZIP_LIMIT in su si cancella e si elencano i file più pesanti', () => {
  assert.equal(ZIP_LIMIT, 25_000_000); assert.equal(ZIP_WARN, 24_000_000);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-zip-'));
  try {
    const dir = path.join(tmp, 'pacchetto'); sample(dir);
    for (let i = 0; i < 12; i++) fs.writeFileSync(path.join(dir, `peso-${String(i).padStart(2, '0')}.bin`), randomBytes(1000 + i * 100));
    const ok = makeZip({ dir, zip: path.join(tmp, 'out/ok.zip') });
    assert.equal(ok.bytes, fs.statSync(ok.file).size); assert.equal(ok.files, 18);
    assert.equal(ok.warn, false); assert.equal(ok.margin, ZIP_LIMIT - ok.bytes);
    assert.ok(!fs.existsSync(ok.file + '.part'));
    assert.equal(makeZip({ dir, zip: path.join(tmp, 'w.zip'), warnBytes: 100 }).warn, true, 'sopra la soglia di avviso');
    assert.throws(() => makeZip({ dir, zip: ok.file }), /esiste già/);
    assert.throws(() => makeZip({ dir, zip: path.join(dir, 'dentro.zip') }), /dentro la cartella/);
    // troppo pesante: errore, nessun file, i 10 più pesanti in ordine
    const big = path.join(tmp, 'grosso.zip');
    let err = null;
    try { makeZip({ dir, zip: big, maxBytes: 1000 }); } catch (e){ err = e; }
    assert.ok(err, 'deve fallire'); assert.equal(err.code, 'ZIP_TROPPO_GRANDE');
    assert.match(err.message, /deve stare sotto 1000 byte.*zip cancellato/);
    assert.ok(!fs.existsSync(big) && !fs.existsSync(big + '.part'), 'zip cancellato');
    assert.equal(err.largest.length, 10);
    assert.equal(err.largest[0].name, 'assets/mediapipe/hands/modello.tflite');
    for (let i = 1; i < 10; i++) assert.ok(err.largest[i - 1].compressed >= err.largest[i].compressed);
    // esattamente al limite: fuori («leggermente meno di 25 MB»)
    assert.throws(() => makeZip({ dir, zip: big, maxBytes: ok.bytes }), /deve stare sotto/);
    assert.ok(makeZip({ dir, zip: big, maxBytes: ok.bytes + 1 }).bytes === ok.bytes);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('pacchetto Cloudflare: una build vecchia con MediaPipe senza SIMD si ferma', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-pacchetto-'));
  try {
    const dist = path.join(tmp, 'dist'), headers = path.join(tmp, '_headers');
    fs.mkdirSync(path.join(dist, 'assets/mediapipe/hands'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html>');
    fs.writeFileSync(path.join(dist, 'assets/mediapipe/hands/hands_solution_simd_wasm_bin.wasm'), 'w');
    fs.writeFileSync(headers, '/*\n  X-Content-Type-Options: nosniff\n');
    assert.deepEqual(makePackage({ out: path.join(tmp, 'a'), dist, headers }).files, ['_headers', 'assets/mediapipe/hands/hands_solution_simd_wasm_bin.wasm', 'index.html']);
    for (const stale of ['hands_solution_wasm_bin.wasm', 'hands_solution_simd_wasm_bin.data']){
      fs.writeFileSync(path.join(dist, 'assets/mediapipe/hands', stale), '');
      assert.throws(() => makePackage({ out: path.join(tmp, `b-${stale}`), dist, headers }), new RegExp(`build vecchia.*${stale.replace(/\./g, '\\.')}.*npm run build`));
      fs.rmSync(path.join(dist, 'assets/mediapipe/hands', stale));
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('pacchetto Cloudflare: solo argomenti --nome=valore, «--zip file» o «--zip» da solo sono errori', () => {
  assert.deepEqual(parseArgs(['--out=a b', '--zip=c.zip', '--turn-url=https://x.workers.dev/']), { out: 'a b', zip: 'c.zip', 'turn-url': 'https://x.workers.dev/' });
  assert.deepEqual(parseArgs([]), {});
  for (const [argv, re] of [
    [['--out=a', '--zip', 'c.zip'], /argomento non valido: «--zip»/],
    [['--out=a', '--zip'], /argomento non valido: «--zip»/],
    [['--zip='], /--zip= senza valore/],
    [['--out=a', '--out=b'], /--out ripetuto/],
    [['--uot=a'], /argomento non valido: «--uot=a»/],
    [['--turn-url', 'https://x.workers.dev/'], /argomento non valido/],
    [['c.zip'], /argomento non valido: «c\.zip»/],
    [['-z=c.zip'], /argomento non valido/],
  ]) assert.throws(() => parseArgs(argv), re, argv.join(' '));
});

test('pacchetto Cloudflare: il comando fa lo zip, sotto il limite esce con 0, sopra con 1 senza lasciare lo zip', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-cli-'));
  try {
    const dist = path.join(tmp, 'dist'), headers = path.join(tmp, '_headers');
    sample(dist);
    for (let i = 0; i < 12; i++) fs.writeFileSync(path.join(dist, `peso-${String(i).padStart(2, '0')}.bin`), randomBytes(2000 + i * 100));
    fs.writeFileSync(headers, '/*\n  X-Content-Type-Options: nosniff\n');
    const run = (argv, opts = {}) => {
      const out = { log: [], warn: [], error: [] };
      const code = main(argv, { dist, headers, log: m => out.log.push(m), warn: m => out.warn.push(m), error: m => out.error.push(m), ...opts });
      return { code, ...out };
    };
    // valido, con cartella e zip
    const ok = run([`--out=${path.join(tmp, 'p1')}`, `--zip=${path.join(tmp, 'p1.zip')}`, '--turn-url=https://natpf-turn.example.workers.dev/']);
    assert.equal(ok.code, 0, ok.error.join('\n'));
    const size = fs.statSync(path.join(tmp, 'p1.zip')).size;
    assert.ok(ok.log.some(l => l.includes(`${size} byte`) && l.includes(`limite ${ZIP_LIMIT} byte`)), ok.log.join('\n'));
    assert.ok(ok.log.some(l => l.includes(`zlib ${process.versions.zlib}`)), 'versioni di Node e zlib accanto al peso');
    assert.ok(readZip(fs.readFileSync(path.join(tmp, 'p1.zip'))).some(e => e.name === 'natpf/turn.json'));
    assert.deepEqual(ok.warn, []);
    // solo --zip: cartella temporanea
    const only = run([`--zip=${path.join(tmp, 'p2.zip')}`]);
    assert.equal(only.code, 0, only.error.join('\n'));
    assert.ok(!readZip(fs.readFileSync(path.join(tmp, 'p2.zip'))).some(e => e.name === 'natpf/turn.json'), 'senza --turn-url niente turn.json');
    const tmpDir = /^Pacchetto in (.+): \d+ file\.$/.exec(only.log[0])?.[1];
    assert.ok(tmpDir && !fs.existsSync(tmpDir), 'cartella temporanea cancellata');
    // poco margine: avviso con i file più pesanti
    const near = run([`--zip=${path.join(tmp, 'p3.zip')}`], { warnBytes: 100 });
    assert.equal(near.code, 0); assert.match(near.warn.join('\n'), /Attenzione.*\n[\s\S]*modello\.tflite/);
    // troppo pesante: 1, niente zip, i 10 file più pesanti
    const big = run([`--out=${path.join(tmp, 'p4')}`, `--zip=${path.join(tmp, 'p4.zip')}`], { maxBytes: 1000 });
    assert.equal(big.code, 1);
    assert.ok(!fs.existsSync(path.join(tmp, 'p4.zip')) && !fs.existsSync(path.join(tmp, 'p4.zip.part')));
    assert.match(big.error.join('\n'), /deve stare sotto 1000 byte[\s\S]*I 10 file più pesanti[\s\S]*modello\.tflite/);
    // argomenti sbagliati: 1, niente pacchetto né zip (prima, «--zip file» saltava lo zip e usciva con 0)
    for (const argv of [[`--out=${path.join(tmp, 'p5')}`, '--zip', path.join(tmp, 'p5.zip')], [`--out=${path.join(tmp, 'p5')}`, '--zip'], []]){
      const r = run(argv);
      assert.equal(r.code, 1, argv.join(' ')); assert.match(r.error.join('\n'), /Errore: (argomento non valido|manca --out)/);
      assert.ok(!fs.existsSync(path.join(tmp, 'p5')) && !fs.existsSync(path.join(tmp, 'p5.zip')));
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('pacchetto Cloudflare: lo script avviato da riga di comando esce con errore su «--zip file»', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-cli-'));
  try {
    for (const argv of [[`--out=${path.join(tmp, 'p')}`, '--zip', path.join(tmp, 'p.zip')], [`--out=${path.join(tmp, 'p')}`, '--zip']]){
      const r = spawnSync(process.execPath, [SCRIPT, ...argv], { encoding: 'utf8', timeout: 30000 });
      assert.equal(r.status, 1, `${argv.join(' ')}\n${r.stdout}\n${r.stderr}`);
      assert.match(r.stderr, /Errore: argomento non valido: «--zip»/);
      assert.ok(!fs.existsSync(path.join(tmp, 'p')) && !fs.existsSync(path.join(tmp, 'p.zip')), 'niente pacchetto né zip');
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
